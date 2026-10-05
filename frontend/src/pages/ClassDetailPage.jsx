import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { ClassWorkspaceNav } from "../components/layout/ClassWorkspaceNav";
import { UiIcon } from "../components/UiIcon";
import { SessionMaterials } from "../components/materials/SessionMaterials";
import { getSessionAttendance, getTeacherClassDetail, getTeacherTournaments, saveSessionAttendance, removeClassStudent } from "../services/api";
import { SessionScheduleDialog } from "../components/SessionScheduleDialog";
import { MaterialDialog } from "../components/materials/MaterialDialog";
import { sessionEditable } from "../components/ClassScheduleEditor";
import "./classDetail.css";

const STATUS = {
  UNMARKED: { label: "Chưa điểm danh", tone: "neutral" },
  PRESENT: { label: "Có mặt", tone: "present" },
  ABSENT: { label: "Vắng", tone: "absent" },
  LATE: { label: "Muộn", tone: "late" },
};

export function ClassDetailPage({ classId, sessionId, googleMeetUrl, teacherId, teacherName, onLogout, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [marked, setMarked] = useState({});
  const [historicalStudents, setHistoricalStudents] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceRetry, setAttendanceRetry] = useState(0);
  const [editingSession, setEditingSession] = useState(null);
  const [removingStudent, setRemovingStudent] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState(readTab);
  const [sessionFilter, setSessionFilter] = useState("all");
  const sessionListRef = useRef(null);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState("");
  const [tournamentRetry, setTournamentRetry] = useState(0);

  useEffect(() => {
    const list = sessionListRef.current;
    const active = list?.querySelector('[aria-pressed="true"]');
    if (active) list.scrollTop += active.getBoundingClientRect().top - list.getBoundingClientRect().top - 8;
  }, [selectedId, loading, tab, sessionFilter]);

  useEffect(() => {
    const syncTab = () => setTab(readTab());
    window.addEventListener("popstate", syncTab);
    setTab(readTab());
    return () => window.removeEventListener("popstate", syncTab);
  }, [classId, sessionId]);

  useEffect(() => {
    if (tab !== "tournaments") return;
    let active = true;
    setTournamentLoading(true); setTournamentError("");
    getTeacherTournaments(teacherId).then((result) => {
      if (active) setTournaments(result.filter((item) => item.classId === classId));
    }).catch((error) => { if (active) setTournamentError(error.message); })
      .finally(() => { if (active) setTournamentLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, tab, tournamentRetry]);

  function selectTab(next) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTeacherClassDetail(teacherId, classId).then((result) => {
      if (!active) return;
      setDetail(result);
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      const nearestSession = [...result.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).find((session) => session.date >= today);
      setSelectedId(result.sessions.some((session) => session.id === sessionId) ? sessionId : (nearestSession?.id ?? result.sessions.at(-1)?.id ?? null));
    }).catch((error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, sessionId]);

  useEffect(() => {
    if (!selectedId || !detail) return;
    let active = true;
    setAttendanceLoading(true);
    setAttendanceError(""); setHistoricalStudents([]);
    setMessage("");
    setMarked({});
    getSessionAttendance(teacherId, classId, selectedId).then((records) => {
      if (active) { setMarked(Object.fromEntries(records.map((item) => [item.studentId, item.status]))); setHistoricalStudents(records.map((item) => ({ id: item.studentId, fullName: item.fullName, parentPhoneNumber: item.parentPhoneNumber, leftClass: item.leftClass }))); }
    }).catch((error) => { if (active) { setMessage(error.message); setAttendanceError(error.message); } }).finally(() => { if (active) setAttendanceLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, selectedId, detail, attendanceRetry]);

  const selected = detail?.sessions.find((session) => session.id === selectedId);
  const visibleSessions = (detail?.sessions ?? []).filter((session) => {
    if (sessionFilter === "all") return true;
    const upcoming = new Date(`${session.date}T${session.startTime}+07:00`).getTime() > Date.now();
    return sessionFilter === "upcoming" ? upcoming : !upcoming;
  });
  const attendanceStudents = useMemo(() => {
    const roster = new Map((detail?.students ?? []).map((student) => [student.id, student]));
    historicalStudents.forEach((student) => { if (!roster.has(student.id)) roster.set(student.id, student); });
    return [...roster.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
  }, [detail, historicalStudents]);
  const counts = useMemo(() => Object.values(marked).reduce((result, status) => ({ ...result, [status]: (result[status] ?? 0) + 1 }), {}), [marked]);
  const unmarkedCount = Math.max(0, attendanceStudents.length - Object.keys(marked).length);

  function chooseSession(sessionId) { setSelectedId(sessionId); }
  function updateStatus(studentId, status) { setMarked((current) => ({ ...current, [studentId]: status })); setMessage(""); }
  function markAllPresent() { setMarked(Object.fromEntries(attendanceStudents.map((student) => [student.id, "PRESENT"]))); setMessage(""); }
  async function refresh() { setDetail(await getTeacherClassDetail(teacherId, classId)); }
  async function removeStudent() {
    setRemoving(true); setRemoveError("");
    try { await removeClassStudent(teacherId, classId, removingStudent.id); await refresh(); setRemovingStudent(null); window.dispatchEvent(new Event("classes-updated")); }
    catch (error) { setRemoveError(error.message); }
    finally { setRemoving(false); }
  }
  async function save() {
    const records = Object.entries(marked).map(([studentId, status]) => ({ studentId, status }));
    if (!records.length) { setMessage("Hãy chọn trạng thái cho ít nhất một học sinh."); return; }
    setSaving(true); setMessage("");
    try {
      const saved = await saveSessionAttendance(teacherId, classId, selectedId, records);
      setHistoricalStudents(saved.map((item) => ({ id: item.studentId, fullName: item.fullName, parentPhoneNumber: item.parentPhoneNumber, leftClass: item.leftClass })));
      setMessage("Đã lưu điểm danh cho buổi học này.");
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-detail-page"><p className="page-loading">Đang tải lớp học…</p></main></div>;
  if (!detail) return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-detail-page"><button className="text-button" onClick={() => onNavigate("/homepage")}>← Về màn hình chính</button><p className="page-error">{message || "Không tìm thấy lớp học."}</p></main></div>;

  return <div className="app-shell">
    <AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard class-detail-page">
      <AppPageHeader section="Lớp học" breadcrumbs={[{ label: "Lớp học", href: "/homepage" }]} onNavigate={onNavigate} title={detail.chessClass.name} description={`${detail.chessClass.schedule} · ${detail.students.length} học sinh`} actions={<>{googleMeetUrl ? <a className="secondary-button class-meet-link" href={googleMeetUrl} target="_blank" rel="noopener noreferrer"><UiIcon name="video" size={18} />Vào Google Meet</a> : <button className="secondary-button" type="button" onClick={() => onNavigate("/settings#google-meet")}><UiIcon name="video" size={18} />Thiết lập Google Meet</button>}</>} />
      <ClassWorkspaceNav classId={classId} active={tab} studentCount={detail.students.length} onNavigate={onNavigate} onSelect={selectTab} />
      {tab === "sessions" && <><div className="class-session-toolbar"><button className="secondary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=schedule`)}><UiIcon name="calendar" size={18} />Đổi lịch hàng loạt</button></div>
      <section className="class-detail-layout">
        <aside className="session-panel" aria-label="Danh sách buổi học">
          <div className="session-panel__heading"><h2>Buổi học</h2><span>{detail.sessions.length} buổi</span></div>
          {detail.sessions.length > 24 && <div className="session-filters" aria-label="Lọc buổi học">{[["all", "Tất cả"], ["upcoming", "Sắp tới"], ["past", "Đã qua"]].map(([value, label]) => <button key={value} type="button" aria-pressed={sessionFilter === value} onClick={() => setSessionFilter(value)}>{label}</button>)}</div>}
          <div className="session-timeline" ref={sessionListRef}>
            {visibleSessions.length ? groupSessions(visibleSessions).map(([month, sessions]) => <section className="session-month" key={month} aria-label={formatMonth(month)}><h3>{formatMonth(month)}</h3>{sessions.map((session) => <button type="button" key={session.id} aria-pressed={selectedId === session.id} className={`session-timeline__item ${selectedId === session.id ? "session-timeline__item--selected" : ""}`} onClick={() => chooseSession(session.id)}><span><strong>{new Date(`${session.date}T12:00:00`).toLocaleDateString("vi-VN", {weekday:"short",day:"2-digit",month:"2-digit"})}</strong><small>{formatTime(session.startTime)} – {formatTime(session.endTime)}</small></span><span className={`session-attendance-label ${session.hasAttendance || (session.id === selectedId && historicalStudents.length > 0) ? "session-attendance-label--done" : ""}`}>{session.hasAttendance || (session.id === selectedId && historicalStudents.length > 0) ? "Đã điểm danh" : "Chưa điểm danh"}</span></button>)}</section>) : <p className="empty-state">{sessionFilter === "all" ? "Chưa có buổi học nào." : "Không có buổi học trong mục này."}</p>}
          </div>
        </aside>
        <section className="attendance-panel" aria-live="polite">
          {selected ? <>
            <div className="attendance-panel__head"><div><h2>{formatSessionDate(selected.date)}</h2><p>{formatTime(selected.startTime)} – {formatTime(selected.endTime)}</p></div><SessionActions key={selected.id} editable={!attendanceLoading && !attendanceError && sessionEditable(selected, selected.hasAttendance || historicalStudents.length > 0)} onEdit={() => setEditingSession(selected)} onCreateTournament={() => onNavigate(`/classes/${classId}/sessions/${selected.id}/tournaments/new`)} /></div>
            <SessionMaterials key={selected.id} teacherId={teacherId} classId={classId} sessionId={selected.id} />
            <div className="attendance-toolbar"><div className="attendance-summary"><Summary label="Có mặt" value={counts.PRESENT ?? 0} tone="present" /><Summary label="Vắng" value={counts.ABSENT ?? 0} tone="absent" /><Summary label="Muộn" value={counts.LATE ?? 0} tone="late" /><Summary label="Chưa chọn" value={unmarkedCount} tone="neutral" /></div><button className="secondary-button" type="button" onClick={markAllPresent} disabled={saving || attendanceLoading || Boolean(attendanceError)}><UiIcon name="check" size={16} />Tất cả có mặt</button></div>
            {message && <p className={`attendance-message ${message.startsWith("Đã") ? "attendance-message--success" : ""}`}>{message}</p>}
            <div className="attendance-list">
              <div className="attendance-list__header"><span>Học sinh</span><span>Trạng thái điểm danh</span></div>
              {attendanceLoading ? <p className="page-loading">Đang tải điểm danh…</p> : attendanceError ? <p className="page-error" role="alert">Không thể tải điểm danh. <button className="secondary-button" type="button" onClick={() => setAttendanceRetry((value) => value + 1)}>Thử lại</button></p> : attendanceStudents.map((student) => <article className="attendance-student" key={student.id}><span className="student-avatar">{initials(student.fullName)}</span><span className="student-info"><strong>{student.fullName}{student.leftClass && <span className="student-left-label">Đã rời lớp</span>}</strong></span><div className="status-control">{["PRESENT", "LATE", "ABSENT"].map((status) => <button type="button" key={status} className={`status-button status-button--${STATUS[status].tone} ${marked[student.id] === status ? "status-button--active" : ""}`} aria-pressed={marked[student.id] === status} disabled={saving || attendanceLoading || Boolean(attendanceError)} onClick={() => updateStatus(student.id, status)}>{STATUS[status].label}</button>)}</div></article>)}
            </div>
            <footer className="attendance-footer"><span>{Object.keys(marked).length}/{attendanceStudents.length} học sinh đã được chọn</span><button className="primary-button" type="button" onClick={save} disabled={saving || attendanceLoading || Boolean(attendanceError)}>{saving ? "Đang lưu…" : "Lưu điểm danh"}</button></footer>
          </> : <div className="empty-attendance"><span>✓</span><h2>Chọn một buổi học</h2><p>Chọn buổi ở cột bên trái để bắt đầu điểm danh.</p></div>}
        </section>
      </section></>}
      {tab === "students" && <section className="workspace-card"><div className="workspace-section-heading"><div><h2>Danh sách học sinh</h2><p>{detail.students.length} học sinh · Thông tin liên hệ phụ huynh</p></div><button className="primary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=students`)}><UiIcon name="plus" size={18} />Thêm học sinh</button></div>
        {detail.students.length ? <div className="workspace-table-scroll"><table className="workspace-table"><thead><tr><th>Học sinh</th><th>Ngày sinh</th><th>Phụ huynh</th><th>Số điện thoại</th><th>Thao tác</th></tr></thead><tbody>{detail.students.map((student) => <tr key={student.id}><td><span className="workspace-person"><span className="student-avatar">{initials(student.fullName)}</span><strong>{student.fullName}</strong></span></td><td>{student.birthDate ? new Date(`${student.birthDate}T12:00:00`).toLocaleDateString("vi-VN") : "Chưa có"}</td><td>{student.parentName || "Chưa có"}</td><td>{student.parentPhoneNumber ? <a href={`tel:${student.parentPhoneNumber}`}>{student.parentPhoneNumber}</a> : "Chưa có"}</td><td><button className="student-remove-button" type="button" onClick={() => { setRemoveError(""); setRemovingStudent(student); }}>Gỡ khỏi lớp</button></td></tr>)}</tbody></table></div> : <div className="workspace-empty"><UiIcon name="classes" size={32} /><h3>Lớp chưa có học sinh</h3><p>Thêm học sinh để bắt đầu điểm danh và tổ chức giải đấu.</p></div>}
      </section>}
      {tab === "tournaments" && <section className="workspace-card"><div className="workspace-section-heading"><div><h2>Giải đấu của lớp</h2><p>Giải Swiss, kết quả từng vòng và bảng xếp hạng.</p></div><button className="primary-button" type="button" onClick={() => onNavigate(`/classes/${classId}/tournaments/new`)}><UiIcon name="plus" size={18} />Tạo giải</button></div>
        {tournamentLoading ? <p className="ui-empty" role="status">Đang tải giải đấu…</p> : tournamentError ? <div className="ui-error" role="alert">{tournamentError}<button className="secondary-button" onClick={() => setTournamentRetry((value) => value + 1)}>Thử lại</button></div> : tournaments.length ? <div className="workspace-tournaments">{tournaments.map((item) => <a className="workspace-tournament" href={`/tournaments/${item.id}`} key={item.id} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(`/tournaments/${item.id}`); }}><span className="overview-class-icon"><UiIcon name="trophy" /></span><span><strong>{item.name ?? item.className}</strong><small>Giải Swiss · {item.roundCount} vòng</small></span><span className={`overview-status ${item.status === "COMPLETED" ? "overview-status--done" : ""}`}>{item.status === "COMPLETED" ? "Đã hoàn thành" : "Đang diễn ra"}</span><UiIcon name="chevron" size={18} /></a>)}</div> : <div className="workspace-empty"><UiIcon name="trophy" size={32} /><h3>Chưa có giải đấu</h3><p>Bấm “Tạo giải” để chọn học sinh của lớp và bắt đầu giải đấu.</p></div>}
      </section>}
    </main>
    {editingSession && <SessionScheduleDialog teacherId={teacherId} classId={classId} session={editingSession} onClose={() => setEditingSession(null)} onSaved={refresh} />}
    {removingStudent && <MaterialDialog title="Gỡ học sinh khỏi lớp" className="class-workspace-dialog" onClose={() => setRemovingStudent(null)} busy={removing}>
      <p className="schedule-dialog-note">Gỡ <strong>{removingStudent.fullName}</strong> khỏi lớp {detail.chessClass.name}? Hồ sơ, điểm danh cũ và kết quả giải đấu vẫn được giữ. Các lớp khác không bị ảnh hưởng.</p>
      {removeError && <p className="management-message" role="alert">{removeError}</p>}
      <div className="schedule-actions"><button className="secondary-button" type="button" disabled={removing} onClick={() => setRemovingStudent(null)} data-dialog-autofocus>Hủy</button><button className="student-remove-button" type="button" disabled={removing} onClick={removeStudent}>{removing ? "Đang gỡ…" : "Gỡ khỏi lớp"}</button></div>
    </MaterialDialog>}
  </div>;
}

function readTab() { const tab = new URLSearchParams(window.location.search).get("tab"); return ["students", "tournaments"].includes(tab) ? tab : "sessions"; }

function Summary({ label, value, tone }) { return <span className={`attendance-summary__item attendance-summary__item--${tone}`}><strong>{value}</strong><span>{label}</span></span>; }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatTime(value) { return value.slice(0, 5); }
function formatSessionDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

function SessionActions({ editable, onEdit, onCreateTournament }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (event.type === "keydown") {
        if (event.key !== "Escape") return;
        triggerRef.current?.focus();
      } else if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);
  return <div className="session-actions" ref={rootRef}>
    <button ref={triggerRef} className="secondary-button" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>Thao tác buổi học <UiIcon name="chevron" size={16} /></button>
    <div id={panelId} className={`session-actions__panel ${open ? "session-actions__panel--open" : ""}`} inert={!open}>
      <button type="button" disabled={!editable} title={editable ? undefined : "Chỉ sửa buổi chưa bắt đầu và chưa có điểm danh"} onClick={() => { setOpen(false); onEdit(); }}><UiIcon name="calendar" size={18} />Sửa lịch</button>
      <button type="button" onClick={() => { setOpen(false); onCreateTournament(); }}><UiIcon name="trophy" size={18} />Tạo giải đấu cho buổi này</button>
    </div>
  </div>;
}

function groupSessions(sessions) { const months = new Map(); [...sessions].sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).forEach(session => { const month = session.date.slice(0,7); if (!months.has(month)) months.set(month,[]); months.get(month).push(session); }); return [...months]; }
function formatMonth(month) { return new Date(`${month}-01T12:00:00`).toLocaleDateString("vi-VN", {month:"long",year:"numeric"}); }
