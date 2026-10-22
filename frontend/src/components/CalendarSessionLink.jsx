import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatSessionDuration, getAttendanceStatus } from "./calendarLayout";

const SessionPreviewContext = createContext(null);

export function CalendarSessionPreview({ children, now }) {
  const id = useId();
  const [active, setActive] = useState(null);
  const [position, setPosition] = useState(null);
  const popup = useRef(null);
  const state = useRef({ active: null, hovered: null, focused: null, popupHovered: false, pending: null, openTimer: null, closeTimer: null, dismissed: new Set() });

  function clearTimers() {
    clearTimeout(state.current.openTimer);
    clearTimeout(state.current.closeTimer);
    state.current.pending = null;
  }
  function hide() {
    clearTimers();
    state.current.active = null;
    state.current.popupHovered = false;
    setActive(null);
    setPosition(null);
  }
  function dismiss() {
    const current = state.current;
    // When the pointer has already left the trigger for the popup, there is
    // no trigger interaction left to suppress. A later keyboard focus is new.
    if (current.active && (current.hovered === current.active.anchor || current.focused === current.active.anchor)) current.dismissed.add(current.active.anchor);
    if (current.pending) current.dismissed.add(current.pending.anchor);
    hide();
  }
  function show(entry) {
    if (state.current.dismissed.has(entry.anchor) || !entry.anchor.isConnected) return;
    clearTimers();
    state.current.active = entry;
    state.current.popupHovered = false;
    setPosition(null);
    setActive(entry);
  }
  function enter(anchor, session, keyboard = false) {
    const current = state.current;
    if (keyboard) {
      if (current.focused !== anchor) current.dismissed.delete(anchor);
      current.focused = anchor;
    }
    else current.hovered = anchor;
    // Auto-scrolling the focused link under a stationary pointer also sends a
    // pointer-entry event. Keep the keyboard opening rather than replacing it.
    if (!keyboard && current.focused === anchor && (current.pending?.keyboard || current.active?.keyboard)) {
      clearTimeout(current.closeTimer);
      return;
    }
    clearTimers();
    if (current.dismissed.has(anchor)) return;
    if (current.active?.anchor === anchor) return;
    // Moving to a different lesson must never leave the previous preview attached.
    hide();
    const entry = { anchor, session, keyboard };
    if (keyboard) {
      // Focus can scroll a long day list. Open after that scroll is processed,
      // instead of opening and immediately dismissing the new description.
      current.pending = entry;
      current.openTimer = setTimeout(() => show(entry), 80);
    }
    else {
      current.pending = entry;
      current.openTimer = setTimeout(() => show(entry), 300);
    }
  }
  function queueClose() {
    clearTimeout(state.current.closeTimer);
    state.current.closeTimer = setTimeout(() => {
      const current = state.current;
      const anchor = current.active?.anchor;
      if (!current.popupHovered && current.hovered !== anchor && current.focused !== anchor) hide();
    }, 150);
  }
  function leave(anchor, keyboard = false) {
    const current = state.current;
    if (keyboard && current.focused === anchor) current.focused = null;
    if (!keyboard && current.hovered === anchor) current.hovered = null;
    if (current.focused !== anchor && current.hovered !== anchor) {
      current.dismissed.delete(anchor);
      if (current.pending?.anchor === anchor) {
        clearTimeout(current.openTimer);
        current.pending = null;
      }
    }
    queueClose();
  }

  useEffect(() => {
    function onKey(event) { if (event.key === "Escape") dismiss(); }
    function onScroll(event) {
      const pending = state.current.pending;
      if (pending?.keyboard && document.activeElement === pending.anchor) return;
      // Long previews may scroll internally without dismissing themselves.
      if (!popup.current?.contains(event.target)) dismiss();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", dismiss);
    return () => {
      clearTimers();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);

  useLayoutEffect(() => {
    if (!active || !popup.current) return;
    const anchor = active.anchor.getBoundingClientRect();
    const bounds = popup.current.getBoundingClientRect();
    const margin = 16;
    const gap = 10;
    let left = anchor.right + gap;
    let top = anchor.top;
    if (left + bounds.width > window.innerWidth - margin) {
      if (anchor.left - gap - bounds.width >= margin) left = anchor.left - gap - bounds.width;
      else {
        left = anchor.left;
        top = anchor.bottom + gap;
        if (top + bounds.height > window.innerHeight - margin) top = anchor.top - gap - bounds.height;
      }
    }
    setPosition({ left: Math.max(margin, Math.min(left, window.innerWidth - bounds.width - margin)), top: Math.max(margin, Math.min(top, window.innerHeight - bounds.height - margin)) });
  }, [active]);

  const status = active ? getAttendanceStatus(active.session, now) : null;
  return <SessionPreviewContext.Provider value={{ active, id, enter, leave, dismiss }}>
    {children}
    {active && createPortal(<div ref={popup} id={id} role="tooltip" className="schedule-session-preview" style={{ ...position, visibility: position ? "visible" : "hidden" }}
      onPointerEnter={() => { state.current.popupHovered = true; clearTimeout(state.current.closeTimer); }}
      onPointerLeave={() => { state.current.popupHovered = false; queueClose(); }}>
      <p className="schedule-session-preview__date">{new Date(`${active.session.date}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <h3>{active.session.className}</h3>
      <p className="schedule-session-preview__time">{active.session.startTime.slice(0, 5)} – {active.session.endTime.slice(0, 5)}<span>{formatSessionDuration(active.session)}</span></p>
      <dl>
        <div><dt>Sĩ số</dt><dd>{active.session.studentCount > 0 ? `${active.session.studentCount} học viên` : "Chưa có học viên"}</dd></div>
        <div><dt>Điểm danh</dt><dd>{active.session.attendanceCount}/{active.session.studentCount} đã ghi nhận</dd></div>
      </dl>
      <span className={`schedule-session-status schedule-session-status--${status.type}`}><i aria-hidden="true" />{status.label}</span>
      <p className="schedule-session-preview__hint">Nhấn buổi học để mở chi tiết lớp</p>
    </div>, document.body)}
  </SessionPreviewContext.Provider>;
}

export function CalendarSessionLink({ session, now, onNavigate, className }) {
  const preview = useContext(SessionPreviewContext);
  const anchor = useRef(null);
  const touch = useRef(false);
  const status = getAttendanceStatus(session, now);
  const time = `${session.startTime.slice(0, 5)} – ${session.endTime.slice(0, 5)}`;
  const date = new Date(`${session.date}T12:00:00`).toLocaleDateString("vi-VN");
  const href = `/classes/${session.classId}?tab=sessions&sessionId=${session.id}`;
  return <a ref={anchor} href={href} className={`${className} schedule-session--${status.type}`}
    aria-label={`Mở chi tiết lớp ${session.className}, ${date}, ${time}. ${status.label}`}
    aria-describedby={preview.active?.anchor === anchor.current ? preview.id : undefined}
    onPointerEnter={(event) => { if (event.pointerType !== "touch") preview.enter(event.currentTarget, session); }}
    onPointerLeave={(event) => { if (event.pointerType !== "touch") preview.leave(event.currentTarget); }}
    onPointerDown={(event) => { touch.current = event.pointerType === "touch"; }}
    onFocus={(event) => { if (!touch.current && event.currentTarget.matches(":focus-visible")) preview.enter(event.currentTarget, session, true); }}
    onBlur={(event) => { touch.current = false; preview.leave(event.currentTarget, true); }}
    onClick={(event) => {
      preview.dismiss();
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onNavigate(href);
    }}>
    <div className="schedule-session-timing"><time>{time}</time></div>
    <strong>{session.className}</strong>
    <span className={`schedule-session-status schedule-session-status--${status.type}`}><i aria-hidden="true" /><span>{status.label}</span></span>
  </a>;
}
