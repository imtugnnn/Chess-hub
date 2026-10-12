import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { ClassWorkspaceNav } from "../components/layout/ClassWorkspaceNav";
import { UiIcon } from "../components/UiIcon";
import { SessionMaterials } from "../components/materials/SessionMaterials";
import { getSessionAttendance, getTeacherClassDetail, getTeacherTournaments, saveSessionAttendance, removeClassStudent } from "../services/api";
import { SessionScheduleDialog } from "../components/SessionScheduleDialog";
import { MaterialDialog } from "../components/materials/MaterialDialog";
import { ClassScheduleEditor, sessionEditable } from "../components/ClassScheduleEditor";
import { ClassWorkspaceForm } from "../components/ClassWorkspaceForm";
import { attendanceChanged } from "../components/workspaceState";
import "./classDetail.css";

const STATUS = {
  UNMARKED: { label: "Chưa điểm danh", tone: "neutral" },
  PRESENT: { label: "Có mặt", tone: "present" },
  ABSENT: { label: "Vắng", tone: "absent" },
  LATE: { label: "Muộn", tone: "late" },
};

export function ClassDetailPage({ classId, locationSearch, registerNavigationGuard, googleMeetUrl, teacherId, teacherName, onLogout, onNavigate }) {
  const params = new URLSearchParams(locationSearch);
  const sessionId = params.get("sessionId");
  const tab = readTab(locationSearch);
  const editingSchedule = tab === "sessions" && params.get("edit") === "schedule";
  const addingStudent = tab === "students" && params.get("add") === "student";
  const [detail, setDetail] = useState(null);
  const [detailRetry, setDetailRetry] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const initialSession = useRef(null);
  const [marked, setMarked] = useState({});
  const [savedMarked, setSavedMarked] = useState({});
  const [formDraft, setFormDraft] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [guardError, setGuardError] = useState("");
  const draft = useRef(null);
  const dirty = attendanceChanged(marked, savedMarked);
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
  const [sessionFilter, setSessionFilter] = useState("all");
  const sessionListRef = useRef(null);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState("");
  const [tournamentRetry, setTournamentRetry] = useState(0);
  draft.current = { dirty, saving: saving || removing, formDraft };

  useEffect(() => {
    const list = sessionListRef.current;
    const active = list?.querySelector('[aria-pressed="true"]');
    if (active) list.scrollTop += active.getBoundingClientRect().top - list.getBoundingClientRect().top - 8;
  }, [selectedId, loading, tab, sessionFilter]);

  useEffect(() => {
    registerNavigationGuard((action) => {
      const current = draft.current;
      if (current.saving || current.formDraft?.busy) return false;
      if (!current.dirty && !current.formDraft?.dirty) return true;
      setGuardError(""); setPendingAction(() => action); return false;
    });
    const beforeUnload = (event) => {
      if (draft.current.dirty || draft.current.saving || draft.current.formDraft?.dirty || draft.current.formDraft?.busy) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { registerNavigationGuard(null); window.removeEventListener("beforeunload", beforeUnload); };
  }, [registerNavigationGuard]);

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
    if (next === tab && !addingStudent && !editingSchedule) return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    url.searchParams.delete("add"); url.searchParams.delete("edit");
    onNavigate(`${url.pathname}${url.search}`);
  }
  function changePanel(key, value) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    onNavigate(`${url.pathname}${url.search}`);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTeacherClassDetail(teacherId, classId).then((result) => {
      if (!active) return;
      setDetail(result);
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      const nearestSession = [...result.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).find((session) => session.date >= today);
      const requested = new URLSearchParams(window.location.search).get("sessionId");
      initialSession.current = nearestSession?.id ?? result.sessions.at(-1)?.id ?? null;
      setSelectedId(result.sessions.some((session) => session.id === requested) ? requested : (nearestSession?.id ?? result.sessions.at(-1)?.id ?? null));
    }).catch((error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, detailRetry]);

  useEffect(() => {
    if (detail?.sessions.some((session) => session.id === sessionId)) setSelectedId(sessionId);
    else if (detail) setSelectedId(initialSession.current);
  }, [sessionId, loading]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setAttendanceLoading(true);
    setAttendanceError(""); setHistoricalStudents([]);
    setMessage("");
    setMarked({});
    setSavedMarked({});
    getSessionAttendance(teacherId, classId, selectedId).then((records) => {
      if (active) { const next = Object.fromEntries(records.map((item) => [item.studentId, item.status])); setMarked(next); setSavedMarked(next); setHistoricalStudents(records.map((item) => ({ id: item.studentId, fullName: item.fullName, parentPhoneNumber: item.parentPhoneNumber, leftClass: item.leftClass }))); }
    }).catch((error) => { if (active) setAttendanceError(error.message); }).finally(() => { if (active) setAttendanceLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, selectedId, attendanceRetry]);

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

  function chooseSession(nextId) { if (nextId !== selectedId) changePanel("sessionId", nextId); }
  function updateStatus(studentId, status) { setMarked((current) => ({ ...current, [studentId]: status })); setMessage(""); }
  function markAllPresent() { setMarked(Object.fromEntries(attendanceStudents.map((student) => [student.id, "PRESENT"]))); setMessage(""); }
  async function refresh() {
    const result = await getTeacherClassDetail(teacherId, classId);
    setDetail(result);
    if (!result.sessions.some((session) => session.id === selectedId)) { initialSession.current = result.sessions[0]?.id ?? null; setSelectedId(initialSession.current); }
  }
  async function removeStudent() {
    setRemoving(true); setRemoveError("");
    try { await removeClassStudent(teacherId, classId, removingStudent.id); await refresh(); setRemovingStudent(null); window.dispatchEvent(new Event("classes-updated")); }
    catch (error) { setRemoveError(error.message); }
    finally { setRemoving(false); }
  }
  async function save() {
    const records = Object.entries(marked).map(([studentId, status]) => ({ studentId, status }));
    if (!records.length) { setMessage("Hãy chọn trạng thái cho ít nhất một học sinh."); return false; }
    setSaving(true); setMessage("");
    try {
      const saved = await saveSessionAttendance(teacherId, classId, selectedId, records);
      setHistoricalStudents(saved.map((item) => ({ id: item.studentId, fullName: item.fullName, parentPhoneNumber: item.parentPhoneNumber, leftClass: item.leftClass })));
      setSavedMarked({ ...marked });
      setDetail((current) => ({ ...current, sessions: current.sessions.map((session) => session.id === selectedId ? { ...session, hasAttendance: true } : session) }));
      setMessage("Đã lưu điểm danh cho buổi học này.");
      return true;
    } catch (error) { setMessage(error.message); setGuardError(error.message); return false; }
    finally { setSaving(false); }
  }

  async function saveAndContinue() {
    setGuardError("");
    if (dirty && !(await save())) return;
    if (formDraft?.dirty && !(await formDraft.save())) { setGuardError("Chưa lưu được biểu mẫu. Hãy ở lại để kiểm tra thông tin và thử lại."); return; }
    const action = pendingAction; setPendingAction(null); action();
  }
  function discardAndContinue() {
    setMarked(savedMarked); formDraft?.discard();
    const action = pendingAction; setPendingAction(null); action();
  }

  if (loading) return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-detail-page"><p className="page-loading">Đang tải lớp học…</p></main></div>;
  if (!detail) return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-detail-page"><p className="page-error" role="alert">{message || "Không tìm thấy lớp học."}</p><div className="schedule-actions"><button className="secondary-button" type="button" onClick={() => onNavigate("/homepage")}>Về màn hình chính</button><button className="primary-button" type="button" onClick={() => setDetailRetry((value) => value + 1)}>Thử lại</button></div></main></div>;

  return <div className="app-shell">
    <AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard class-detail-page">
      <AppPageHeader section="Lớp học" breadcrumbs={[{ label: "Lớp học", href: "/homepage" }]} onNavigate={onNavigate} title={detail.chessClass.name} description={`${detail.chessClass.schedule} · ${detail.students.length} học sinh`} actions={<>{googleMeetUrl ? <a className="secondary-button class-meet-link" href={googleMeetUrl} target="_blank" rel="noopener noreferrer"><UiIcon name="video" size={18} />Vào Google Meet</a> : <button className="secondary-button" type="button" onClick={() => onNavigate("/settings#google-meet")}><UiIcon name="video" size={18} />Thiết lập Google Meet</button>}</>} />
      <ClassWorkspaceNav classId={classId} active={tab} studentCount={detail.students.length} onNavigate={onNavigate} onSelect={selectTab} />
      {tab === "sessions" && !editingSchedule && sessionId && !detail.sessions.some((session) => session.id === sessionId) && <p className="management-message" role="status">Buổi học trong liên kết không còn trong lịch lớp. Hãy chọn một buổi trong danh sách.</p>}
      {tab === "general" && <ClassWorkspaceForm mode="general" key="general" teacherId={teacherId} classId={classId} classroom={detail.chessClass} onSaved={refresh} onDraftChange={setFormDraft} />}
      {editingSchedule && <><div className="class-session-toolbar"><button className="secondary-button" type="button" onClick={() => changePanel("edit", null)}>Về buổi học</button></div><ClassScheduleEditor teacherId={teacherId} classId={classId} sessions={detail.sessions} onSaved={refresh} onDraftChange={setFormDraft} /></>}
      {tab === "sessions" && !editingSchedule && <><div className="class-session-toolbar"><button className="secondary-button" type="button" onClick={() => changePanel("edit", "schedule")}><UiIcon name="calendar" size={18} />{detail.sessions.length ? "Đổi lịch hàng loạt" : "Thiết lập lịch học"}</button></div>
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
            <div className="attendance-toolbar"><div className="attendance-summary"><Summary label="Có mặt" value={counts.PRESENT ?? 0} tone="present" /><Summary label="Vắng" value={counts.ABSENT ?? 0} tone="absent" /><Summary label="Muộn" value={counts.LATE ?? 0} tone="late" /><Summary label="Chưa chọn" value={unmarkedCount} tone="neutral" /></div><button className="secondary-button" type="button" onClick={markAllPresent} disabled={!attendanceStudents.length || saving || attendanceLoading || Boolean(attendanceError)}><UiIcon name="check" size={16} />Tất cả có mặt</button></div>
            {message && <p role={message.startsWith("Đã") ? "status" : "alert"} className={`attendance-message ${message.startsWith("Đã") ? "attendance-message--success" : ""}`}>{message}</p>}
            <div className="attendance-list">
              <div className="attendance-list__header"><span>Học sinh</span><span>Trạng thái điểm danh</span></div>
              {attendanceLoading ? <p className="page-loading">Đang tải điểm danh…</p> : attendanceError ? <p className="page-error" role="alert">Không thể tải điểm danh. <button className="secondary-button" type="button" onClick={() => setAttendanceRetry((value) => value + 1)}>Thử lại</button></p> : !attendanceStudents.length ? <div className="workspace-empty"><h3>Lớp chưa có học sinh</h3><p>Thêm học sinh để bắt đầu điểm danh.</p><button className="secondary-button" type="button" onClick={() => onNavigate(`/classes/${classId}?tab=students&add=student`)}>Thêm học sinh</button></div> : attendanceStudents.map((student) => <article className="attendance-student" key={student.id}><span className="student-avatar">{initials(student.fullName)}</span><span className="student-info"><strong>{student.fullName}{student.leftClass && <span className="student-left-label">Đã rời lớp</span>}</strong></span><div className="status-control">{["PRESENT", "LATE", "ABSENT"].map((status) => <button type="button" key={status} className={`status-button status-button--${STATUS[status].tone} ${marked[student.id] === status ? "status-button--active" : ""}`} aria-pressed={marked[student.id] === status} disabled={saving || attendanceLoading || Boolean(attendanceError)} onClick={() => updateStatus(student.id, status)}>{STATUS[status].label}</button>)}</div></article>)}
            </div>
            <footer className="attendance-footer"><div><span>{Object.keys(marked).length}/{attendanceStudents.length} học sinh đã được chọn</span>{dirty && <strong className="workspace-draft-label" role="status">Có thay đổi chưa lưu</strong>}</div><button className="primary-button" type="button" onClick={save} disabled={!dirty || saving || attendanceLoading || Boolean(attendanceError)}>{saving ? "Đang lưu…" : "Lưu điểm danh"}</button></footer>
          </> : <div className="empty-attendance"><span>✓</span><h2>{detail.sessions.length ? "Chọn một buổi học" : "Lớp chưa có buổi học"}</h2><p>{detail.sessions.length ? "Chọn buổi ở danh sách để bắt đầu điểm danh." : "Dùng nút Thiết lập lịch học để tạo các buổi học cho lớp."}</p></div>}
        </section>
      </section></>}
      {tab === "students" && <><section className="workspace-card"><div className="workspace-section-heading"><div><h2>Danh sách học sinh</h2><p>{detail.students.length} học sinh · Thông tin liên hệ phụ huynh</p></div>{!addingStudent && <button className="primary-button" type="button" onClick={() => changePanel("add", "student")}><UiIcon name="plus" size={18} />Thêm học sinh</button>}</div>
        {addingStudent && <ClassWorkspaceForm mode="student" key="student" teacherId={teacherId} classId={classId} classroom={detail.chessClass} onSaved={refresh} onClose={() => changePanel("add", null)} onDraftChange={setFormDraft} />}
        {detail.students.length ? <div className="workspace-table-scroll"><table className="workspace-table"><thead><tr><th>Học sinh</th><th>Ngày sinh</th><th>Phụ huynh</th><th>SĐT phụ huynh</th><th>SĐT học sinh</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>{detail.students.map((student) => <tr key={student.id}><td><span className="workspace-person"><span className="student-avatar">{initials(student.fullName)}</span><strong>{student.fullName}</strong></span></td><td>{student.birthDate ? new Date(`${student.birthDate}T12:00:00`).toLocaleDateString("vi-VN") : "Chưa có"}</td><td>{student.parentName || "Chưa có"}</td><td>{student.parentPhoneNumber ? <a className="secondary-button workspace-phone-button" href={`tel:${student.parentPhoneNumber}`} aria-label={`Gọi phụ huynh của ${student.fullName}: ${student.parentPhoneNumber}`}>{student.parentPhoneNumber}</a> : "Chưa có"}</td><td>{student.phoneNumber ? <a href={`tel:${student.phoneNumber}`}>{student.phoneNumber}</a> : "Chưa có"}</td><td><span className="students-note-preview" title={student.notes || undefined}>{student.notes || "—"}</span></td><td><div className="class-student-actions"><button className="secondary-button" type="button" onClick={() => onNavigate(`/students/${student.id}`)}>Xem hồ sơ</button><button className="student-remove-button" type="button" onClick={() => { setRemoveError(""); setRemovingStudent(student); }}>Gỡ khỏi lớp</button></div></td></tr>)}</tbody></table></div> : !addingStudent && <div className="workspace-empty"><UiIcon name="classes" size={32} /><h3>Lớp chưa có học sinh</h3><p>Thêm học sinh để bắt đầu điểm danh và tổ chức giải đấu.</p></div>}
      </section></>}
      {tab === "tournaments" && <section className="workspace-card"><div className="workspace-section-heading"><div><h2>Giải đấu của lớp</h2><p>Giải Swiss, kết quả từng vòng và bảng xếp hạng.</p></div><button className="primary-button" type="button" onClick={() => onNavigate(`/classes/${classId}/tournaments/new`)}><UiIcon name="plus" size={18} />Tạo giải</button></div>
        {tournamentLoading ? <p className="ui-empty" role="status">Đang tải giải đấu…</p> : tournamentError ? <div className="ui-error" role="alert">{tournamentError}<button className="secondary-button" onClick={() => setTournamentRetry((value) => value + 1)}>Thử lại</button></div> : tournaments.length ? <div className="workspace-tournaments">{tournaments.map((item) => <ClassTournamentRow item={item} key={item.id} onNavigate={onNavigate} />)}</div> : <div className="workspace-empty"><UiIcon name="trophy" size={32} /><h3>Chưa có giải đấu</h3><p>Bấm “Tạo giải” để chọn học sinh của lớp và bắt đầu giải đấu.</p></div>}
      </section>}
    </main>
    {pendingAction && <MaterialDialog title="Có thay đổi chưa lưu" className="class-workspace-dialog" busy={saving || Boolean(formDraft?.busy)} onClose={() => setPendingAction(null)}>
      <p className="schedule-dialog-note">{dirty ? "Điểm danh của buổi học này" : formDraft?.label === "lịch học" ? "Lịch học vừa chỉnh" : formDraft?.label === "hồ sơ học sinh" ? "Hồ sơ học sinh đang nhập" : "Thông tin lớp vừa chỉnh"} chưa được lưu. Bạn muốn xử lý thế nào trước khi chuyển?</p>
      {guardError && <p className="management-message" role="alert">{guardError}</p>}
      <div className="workspace-unsaved-actions"><button className="secondary-button" type="button" disabled={saving || formDraft?.busy} onClick={() => setPendingAction(null)} data-dialog-autofocus>Ở lại</button><button className="secondary-button" type="button" disabled={saving || formDraft?.busy} onClick={discardAndContinue}>Bỏ thay đổi</button>{formDraft?.label !== "lịch học" && <button className="primary-button" type="button" disabled={saving || formDraft?.busy} onClick={saveAndContinue}>{saving || formDraft?.busy ? "Đang lưu…" : "Lưu và chuyển"}</button>}</div>
    </MaterialDialog>}
    {editingSession && <SessionScheduleDialog teacherId={teacherId} classId={classId} session={editingSession} onClose={() => setEditingSession(null)} onSaved={refresh} />}
    {removingStudent && <MaterialDialog title="Gỡ học sinh khỏi lớp" className="class-workspace-dialog" onClose={() => setRemovingStudent(null)} busy={removing}>
      <p className="schedule-dialog-note">Gỡ <strong>{removingStudent.fullName}</strong> khỏi lớp {detail.chessClass.name}? Hồ sơ, điểm danh cũ và kết quả giải đấu vẫn được giữ. Các lớp khác không bị ảnh hưởng.</p>
      {removeError && <p className="management-message" role="alert">{removeError}</p>}
      <div className="schedule-actions"><button className="secondary-button" type="button" disabled={removing} onClick={() => setRemovingStudent(null)} data-dialog-autofocus>Hủy</button><button className="student-remove-button" type="button" disabled={removing} onClick={removeStudent}>{removing ? "Đang gỡ…" : "Gỡ khỏi lớp"}</button></div>
    </MaterialDialog>}
  </div>;
}

function readTab(search) { const tab = new URLSearchParams(search).get("tab"); return ["students", "tournaments", "general"].includes(tab) ? tab : "sessions"; }

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

function ClassTournamentRow({ item, onNavigate }) {
  const href = `/tournaments/${item.id}`;
  return <article className="workspace-tournament"><span className="overview-class-icon"><UiIcon name="trophy" /></span><span><strong>{item.name ?? item.className}</strong><small>Giải Swiss · {item.roundCount} vòng</small></span><span className={`overview-status ${item.status === "COMPLETED" ? "overview-status--done" : ""}`}>{item.status === "COMPLETED" ? "Đã hoàn thành" : "Đang diễn ra"}</span><a className="secondary-button" href={href} aria-label={`Mở giải ${item.name ?? item.className}`} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(href); }}>Mở giải</a></article>;
}
