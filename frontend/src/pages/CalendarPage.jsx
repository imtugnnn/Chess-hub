import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { CalendarFilter } from "../components/CalendarFilter";
import { UiIcon } from "../components/UiIcon";
import { formatSessionDuration, getAttendanceStatus, getCalendarHours, HOUR_HEIGHT, layoutDaySessions } from "../components/calendarLayout";
import { getTeacherSessions } from "../services/api";
import "./calendar.css";

const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
const shortDayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const attendanceOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chưa điểm danh" },
  { value: "upcoming", label: "Chưa đến giờ" },
  { value: "complete", label: "Đã điểm danh" },
];

export function CalendarPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [view, setView] = useState("week");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const from = formatDate(days[0]);
  const to = formatDate(days[6]);
  const today = formatDate(now);
  const classOptions = useMemo(() => [
    { value: "all", label: "Tất cả lớp học" },
    ...[...new Map(sessions.map((session) => [session.classId, { value: session.classId, label: session.className }])).values()].sort((first, second) => first.label.localeCompare(second.label, "vi-VN")),
  ], [sessions]);
  // Keep the selected class available even when it has no lessons next week.
  const [selectedClass, setSelectedClass] = useState(null);
  const availableClasses = selectedClass && !classOptions.some((option) => option.value === selectedClass.value) ? [...classOptions, selectedClass] : classOptions;
  const filteredSessions = useMemo(() => sessions.filter((session) => (classFilter === "all" || session.classId === classFilter) && (statusFilter === "all" || getAttendanceStatus(session, now).type === statusFilter)), [sessions, classFilter, statusFilter, now]);
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    for (const session of [...filteredSessions].sort((first, second) => first.startTime.localeCompare(second.startTime))) {
      (grouped[session.date] ??= []).push(session);
    }
    return grouped;
  }, [filteredSessions]);
  const hours = useMemo(() => getCalendarHours(sessions), [sessions]);
  const hasFilters = classFilter !== "all" || statusFilter !== "all";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getTeacherSessions(teacherId, from, to).then((result) => {
      if (active) setSessions(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message || "Không thể tải lịch dạy.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [teacherId, from, to, retry]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function changeWeek(offset) {
    setWeekStart((current) => addDays(current, offset));
    setSelectedDate((current) => formatDate(addDays(new Date(`${current}T12:00:00`), offset)));
  }
  function goToday() {
    const current = new Date();
    setWeekStart(startOfWeek(current));
    setSelectedDate(formatDate(current));
    setNow(current);
  }
  function clearFilters() { setClassFilter("all"); setStatusFilter("all"); setSelectedClass(null); }

  return <div className="app-shell">
    <AppSidebar activeSection="calendar" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard calendar-page">
      <AppPageHeader breadcrumb="Lịch dạy" title="Lịch dạy" description="Theo dõi giờ học và điểm danh các buổi dạy của bạn." actions={<button className="secondary-button" onClick={() => onNavigate("/classes/new")}><UiIcon name="plus" size={18} />Tạo lớp mới</button>} />
      <section className={`calendar-panel schedule-panel schedule-panel--${view}`} aria-label="Lịch dạy">
        <div className="schedule-toolbar">
          <div className="schedule-toolbar__heading"><h2>{formatWeekRange(days[0], days[6])}</h2><p role="status" aria-live="polite">{loading ? "Đang tải lịch dạy…" : error ? "Lịch dạy chưa tải được" : hasFilters ? `${filteredSessions.length} / ${sessions.length} buổi học trong tuần` : `${sessions.length} buổi học trong tuần`}</p></div>
          <div className="schedule-toolbar__controls">
            <div className="schedule-navigation"><button type="button" onClick={() => changeWeek(-7)} aria-label="Tuần trước"><span className="schedule-previous"><UiIcon name="chevron" size={18} /></span></button><button type="button" onClick={goToday}>Hôm nay</button><button type="button" onClick={() => changeWeek(7)} aria-label="Tuần sau"><UiIcon name="chevron" size={18} /></button></div>
            <div className="schedule-view-switch" role="group" aria-label="Cách xem lịch"><button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Tuần</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>Danh sách</button></div>
          </div>
        </div>
        <div className="schedule-filters">
          <CalendarFilter label="Lớp học" value={classFilter} options={availableClasses} searchable={availableClasses.length > 8} disabled={loading || Boolean(error)} onChange={(value) => { setClassFilter(value); setSelectedClass(availableClasses.find((option) => option.value === value)); }} />
          <CalendarFilter label="Điểm danh" value={statusFilter} options={attendanceOptions} onChange={setStatusFilter} disabled={loading || Boolean(error)} />
          {hasFilters && <button className="schedule-clear" type="button" onClick={clearFilters}>Xóa bộ lọc</button>}
        </div>
        <div className="schedule-content" aria-busy={loading}>
          {error ? <div className="schedule-feedback ui-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>
            : loading ? <div className="schedule-feedback" role="status"><UiIcon name="calendar" size={28} /><p>Đang tải lịch dạy…</p></div>
              : <>
                <div className="schedule-day-picker" role="group" aria-label="Chọn ngày xem lịch">{days.map((date, index) => { const dateKey = formatDate(date); return <button type="button" key={dateKey} aria-pressed={dateKey === selectedDate} aria-current={dateKey === today ? "date" : undefined} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}, ${(sessionsByDate[dateKey] ?? []).length} buổi học`} onClick={() => setSelectedDate(dateKey)}><span>{shortDayNames[index]}</span><strong>{date.getDate()}</strong><i className={(sessionsByDate[dateKey] ?? []).length ? "schedule-day-picker__dot" : ""} aria-hidden="true" /></button>; })}</div>
                {view === "week" && filteredSessions.length > 0 && <WeekTimeGrid days={days} sessionsByDate={sessionsByDate} hours={hours} now={now} onNavigate={onNavigate} scrollKey={`${from}-${retry}`} />}
                {!filteredSessions.length && <div className="schedule-empty-week"><UiIcon name="calendar" size={24} /><div><strong>{hasFilters ? "Không có buổi học phù hợp" : "Tuần này chưa có buổi học"}</strong><p>{hasFilters ? "Thử chọn lớp học hoặc trạng thái khác." : "Tạo lớp học để bắt đầu sắp xếp lịch dạy."}</p></div>{hasFilters ? <button type="button" className="secondary-button" onClick={clearFilters}>Xóa bộ lọc</button> : <button type="button" className="secondary-button" onClick={() => onNavigate(`/classes/new?date=${selectedDate}`)}>Tạo lớp mới</button>}</div>}
                {filteredSessions.length > 0 && <div className="schedule-agenda" aria-label="Danh sách buổi học">{days.map((date, index) => {
                  const dateKey = formatDate(date);
                  const dailySessions = sessionsByDate[dateKey] ?? [];
                  return <section key={dateKey} className={`schedule-agenda-day ${dateKey === selectedDate ? "schedule-agenda-day--selected" : ""} ${!dailySessions.length ? "schedule-agenda-day--empty" : ""}`} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}`}>
                    <header><div><h3>{dayNames[index]}, {date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}{dateKey === today && <span>Hôm nay</span>}</h3><p>{dailySessions.length} buổi học</p></div><button type="button" className="schedule-add" aria-label={`Tạo lớp học ngày ${date.toLocaleDateString("vi-VN")}`} onClick={() => onNavigate(`/classes/new?date=${dateKey}`)}><UiIcon name="plus" size={18} /><span>Tạo lớp</span></button></header>
                    {dailySessions.length ? dailySessions.map((session) => <SessionLink key={session.id} session={session} now={now} onNavigate={onNavigate} className="schedule-agenda-session" />) : <p className="schedule-empty-day">{hasFilters ? "Không có buổi học phù hợp trong ngày này." : "Chưa có buổi học trong ngày này."}</p>}
                  </section>;
                })}</div>}
              </>}
        </div>
      </section>
    </main>
  </div>;
}

function WeekTimeGrid({ days, sessionsByDate, hours, now, onNavigate, scrollKey }) {
  const scroll = useRef(null);
  const today = formatDate(now);
  const height = (hours.end - hours.start) * HOUR_HEIGHT;
  const ticks = Array.from({ length: hours.end - hours.start + 1 }, (_, index) => hours.start + index);
  const layouts = days.map((date) => layoutDaySessions(sessionsByDate[formatDate(date)] ?? []));
  const firstStart = Math.min(...layouts.flat().map((item) => item.start));
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = Number.isFinite(firstStart) ? Math.max(0, (firstStart / 60 - hours.start - 0.5) * HOUR_HEIGHT) : 0;
  }, [scrollKey]);
  return <div ref={scroll} className="schedule-week-scroll" tabIndex={0} role="region" aria-label="Lịch tuần theo giờ, có thể cuộn">
    <div className="schedule-week" style={{ "--schedule-hour-height": `${HOUR_HEIGHT}px` }}>
      <div className="schedule-week__header"><span className="schedule-time-heading">Giờ</span>{days.map((date, index) => <div key={formatDate(date)} className={formatDate(date) === today ? "schedule-week__day--today" : ""}><span>{dayNames[index]}</span><strong>{date.getDate()}</strong></div>)}</div>
      <div className="schedule-week__body" style={{ height: height + 44 }}>
        <div className="schedule-time-axis" aria-hidden="true">{ticks.map((hour) => <span key={hour} style={{ top: (hour - hours.start) * HOUR_HEIGHT }}>{String(hour).padStart(2, "0")}:00</span>)}</div>
        {days.map((date, index) => {
          const dateKey = formatDate(date);
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          return <div className={`schedule-time-day ${dateKey === today ? "schedule-time-day--today" : ""}`} key={dateKey} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}`}>
            {layouts[index].map((item) => {
              // Leave enough room below the card for the end-time marker.
              const hasRail = item.durationHeight - item.cardHeight >= 24;
              return <div key={item.session.id} className="schedule-time-event" style={{ top: (item.start - hours.start * 60) * HOUR_HEIGHT / 60, height: item.height, left: `calc(${item.lane / item.laneCount * 100}% + 3px)`, width: `calc(${100 / item.laneCount}% - 6px)` }}>
                <SessionLink session={item.session} now={now} onNavigate={onNavigate} className={`schedule-time-session ${item.cardHeight < 90 ? "schedule-time-session--compact" : ""} ${item.laneCount > 1 ? "schedule-time-session--shared" : ""} ${hasRail ? "schedule-time-session--extended" : ""}`} style={{ height: item.cardHeight - 4 }} compact={item.cardHeight < 90} duration={hasRail ? formatSessionDuration(item.session) : undefined} />
                {hasRail && <div className="schedule-duration-rail" aria-hidden="true" style={{ top: item.cardHeight - 2, height: item.durationHeight - item.cardHeight + 2 }}><span>{item.session.endTime.slice(0, 5)}</span></div>}
              </div>;
            })}
            {dateKey === today && currentMinutes >= hours.start * 60 && currentMinutes < hours.end * 60 && <div className="schedule-now" style={{ top: (currentMinutes - hours.start * 60) * HOUR_HEIGHT / 60 }} aria-label={`Giờ hiện tại ${now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}><i /></div>}
          </div>;
        })}
      </div>
      <div className="schedule-week__footer"><span />{days.map((date) => <button type="button" className="schedule-add" key={formatDate(date)} aria-label={`Tạo lớp học ngày ${date.toLocaleDateString("vi-VN")}`} onClick={() => onNavigate(`/classes/new?date=${formatDate(date)}`)}><UiIcon name="plus" size={16} /><span>Tạo lớp</span></button>)}</div>
    </div>
  </div>;
}

function SessionLink({ session, now, onNavigate, className, style, compact, duration }) {
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState(null);
  const isTimeGrid = className.includes("schedule-time-session");
  const status = getAttendanceStatus(session, now);
  const time = `${session.startTime.slice(0, 5)} – ${session.endTime.slice(0, 5)}`;
  const description = `${session.className}, ${time}.${duration ? ` Thời lượng ${duration}.` : ""} ${status.label}`;
  const href = `/classes/${session.classId}?sessionId=${session.id}`;
  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => setTooltip(null);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [Boolean(tooltip)]);
  function showDetails(event) {
    if (!isTimeGrid) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 32);
    const above = bounds.bottom + 140 > window.innerHeight;
    setTooltip({ width, left: Math.max(16, Math.min(bounds.left, window.innerWidth - width - 16)), top: above ? bounds.top - 8 : bounds.bottom + 8, ...(above ? { transform: "translateY(-100%)" } : {}) });
  }
  return <><a href={href} className={`${className} schedule-session--${status.type}`} style={style} aria-label={`Mở buổi học ${description}`} aria-describedby={tooltip ? tooltipId : undefined} title={isTimeGrid ? undefined : description} onMouseEnter={showDetails} onMouseLeave={() => setTooltip(null)} onFocus={showDetails} onBlur={() => setTooltip(null)} onKeyDown={(event) => { if (event.key === "Escape") setTooltip(null); }} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setTooltip(null); onNavigate(href); }}>
    <time>{duration ? <><span>{session.startTime.slice(0, 5)}</span><span className="schedule-session-end-time">{session.endTime.slice(0, 5)}</span></> : compact ? session.startTime.slice(0, 5) : time}</time>
    {duration && <span className="schedule-session-duration">{duration}</span>}
    <strong>{session.className}</strong>
    <span className={`schedule-session-status schedule-session-status--${status.type}`}><i aria-hidden="true" /><span>{status.label}</span></span>
    {className === "schedule-agenda-session" && <span className="schedule-session-open"><UiIcon name="chevron" size={18} /></span>}
  </a>{tooltip && createPortal(<div id={tooltipId} role="tooltip" className="schedule-session-tooltip" style={tooltip}><time>{time}</time>{duration && <span className="schedule-session-duration">Thời lượng {duration}</span>}<strong>{session.className}</strong><span className={`schedule-session-status schedule-session-status--${status.type}`}><i aria-hidden="true" />{status.label}</span></div>, document.body)}</>;
}

function startOfWeek(date) { const result = new Date(date); const day = result.getDay(); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day)); return result; }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function formatDate(date) { const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return offsetDate.toISOString().slice(0, 10); }
function formatWeekRange(start, end) { return `${start.toLocaleDateString("vi-VN", { day: "numeric", month: "long" })} – ${end.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}`; }
