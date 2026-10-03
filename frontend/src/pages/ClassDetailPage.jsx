import { useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { ClassWorkspaceNav } from "../components/layout/ClassWorkspaceNav";
import { UiIcon } from "../components/UiIcon";
import { getSessionAttendance, getTeacherClassDetail, getTeacherTournaments, saveSessionAttendance } from "../services/api";
import "./classDetail.css";

const STATUS = {
  UNMARKED: { label: "Chưa điểm danh", tone: "neutral" },
  PRESENT: { label: "Có mặt", tone: "present" },
  ABSENT: { label: "Vắng", tone: "absent" },
  LATE: { label: "Muộn", tone: "late" },
};

export function ClassDetailPage({ classId, sessionId, teacherId, teacherName, onLogout, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [marked, setMarked] = useState({});
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState(readTab);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState("");
  const [tournamentRetry, setTournamentRetry] = useState(0);

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
    setMessage("");
    setMarked({});
    getSessionAttendance(teacherId, classId, selectedId).then((records) => {
      if (active) setMarked(Object.fromEntries(records.map((item) => [item.studentId, item.status])));
    }).catch((error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setAttendanceLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, selectedId, detail]);

  const selected = detail?.sessions.find((session) => session.id === selectedId);
  const counts = useMemo(() => Object.values(marked).reduce((result, status) => ({ ...result, [status]: (result[status] ?? 0) + 1 }), {}), [marked]);
  const unmarkedCount = Math.max(0, (detail?.students.length ?? 0) - Object.keys(marked).length);

  function chooseSession(sessionId) { setSelectedId(sessionId); }
  function updateStatus(studentId, status) { setMarked((current) => ({ ...current, [studentId]: status })); setMessage(""); }
  function markAllPresent() { setMarked(Object.fromEntries(detail.students.map((student) => [student.id, "PRESENT"]))); setMessage(""); }
  async function save() {
    const records = Object.entries(marked).map(([studentId, status]) => ({ studentId, status }));
    if (!records.length) { setMessage("Hãy chọn trạng thái cho ít nhất một học sinh."); return; }
    setSaving(true); setMessage("");
    try {
      await saveSessionAttendance(teacherId, classId, selectedId, records);
      setMessage("Đã lưu điểm danh cho buổi học này.");
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-detail-page"><p className="page-loading">Đang tải lớp học…</p></main></div>;
  if (!detail) return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-detail-page"><button className="text-button" onClick={() => onNavigate("/homepage")}>← Về màn hình chính</button><p className="page-error">{message || "Không tìm thấy lớp học."}</p></main></div>;

  return <div className="app-shell">
    <AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard class-detail-page">
      <AppPageHeader breadcrumb="Lớp học" title={detail.chessClass.name} description={`${detail.chessClass.schedule} · ${detail.students.length} học sinh`} actions={<button className="secondary-button" onClick={() => onNavigate("/homepage")}>← Tất cả lớp</button>} />
      <ClassWorkspaceNav classId={classId} active={tab} studentCount={detail.students.length} onNavigate={onNavigate} onSelect={selectTab} />
      {tab === "sessions" && <><div className="workspace-section-heading"><div><h2>Buổi học & điểm danh</h2><p>Chọn một buổi để điểm danh hoặc tổ chức giải đấu.</p></div><button className="secondary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=schedule`)}><UiIcon name="calendar" size={18} />Sửa lịch học</button></div>
      <section className="class-detail-layout">
        <aside className="session-panel" aria-label="Danh sách buổi học">
          <div className="session-panel__heading"><div><p className="eyebrow">Lộ trình lớp học</p><h2>Tất cả buổi học</h2></div><span>{detail.sessions.length} buổi</span></div>
          <div className="session-timeline">
            {detail.sessions.length ? detail.sessions.map((session, index) => <button type="button" key={session.id} aria-pressed={selectedId === session.id} className={`session-timeline__item ${selectedId === session.id ? "session-timeline__item--selected" : ""}`} onClick={() => chooseSession(session.id)}><span className="session-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{formatSessionDate(session.date)}</strong><small>{formatTime(session.startTime)} – {formatTime(session.endTime)}</small></span><i>→</i></button>) : <p className="empty-state">Chưa có buổi học nào.</p>}
          </div>
        </aside>
        <section className="attendance-panel" aria-live="polite">
          {selected ? <>
            <div className="attendance-panel__head"><div><p className="eyebrow">Điểm danh buổi {sessionNumber(detail.sessions, selected.id)}</p><h2>{formatSessionDate(selected.date)}</h2><p>{formatTime(selected.startTime)} – {formatTime(selected.endTime)} · Chọn trạng thái cho từng học sinh</p></div><div className="attendance-panel__actions"><button className="create-tournament-button" type="button" onClick={() => onNavigate(`/classes/${classId}/sessions/${selected.id}/tournaments/new`)}>♞ Tạo giải đấu</button><button className="mark-all-button" type="button" onClick={markAllPresent}>✓ Tất cả có mặt</button></div></div>
            <div className="attendance-summary"><Summary label="Có mặt" value={counts.PRESENT ?? 0} tone="present" /><Summary label="Vắng" value={counts.ABSENT ?? 0} tone="absent" /><Summary label="Muộn" value={counts.LATE ?? 0} tone="late" /><Summary label="Chưa chọn" value={unmarkedCount} tone="neutral" /></div>
            {message && <p className={`attendance-message ${message.startsWith("Đã") ? "attendance-message--success" : ""}`}>{message}</p>}
            <div className="attendance-list">
              <div className="attendance-list__header"><span>Học sinh</span><span>Trạng thái điểm danh</span></div>
              {attendanceLoading ? <p className="page-loading">Đang tải điểm danh…</p> : detail.students.map((student, index) => <article className="attendance-student" key={student.id}><span className="student-avatar">{initials(student.fullName)}</span><span className="student-info"><strong>{student.fullName}</strong><small>{student.parentPhoneNumber}</small></span><div className="status-control">{["PRESENT", "LATE", "ABSENT"].map((status) => <button type="button" key={status} className={`status-button status-button--${STATUS[status].tone} ${marked[student.id] === status ? "status-button--active" : ""}`} onClick={() => updateStatus(student.id, status)}>{STATUS[status].label}</button>)}</div><small className="student-order">{String(index + 1).padStart(2, "0")}</small></article>)}
            </div>
            <footer className="attendance-footer"><span>{Object.keys(marked).length}/{detail.students.length} học sinh đã được chọn</span><button className="primary-button" type="button" onClick={save} disabled={saving || attendanceLoading}>{saving ? "Đang lưu…" : "Lưu điểm danh"}</button></footer>
          </> : <div className="empty-attendance"><span>✓</span><h2>Chọn một buổi học</h2><p>Chọn buổi ở cột bên trái để bắt đầu điểm danh.</p></div>}
        </section>
      </section></>}
      {tab === "students" && <section className="workspace-card"><div className="workspace-section-heading"><div><h2>Danh sách học sinh</h2><p>{detail.students.length} học sinh · Thông tin liên hệ phụ huynh</p></div><button className="primary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=students`)}><UiIcon name="plus" size={18} />Thêm học sinh</button></div>
        {detail.students.length ? <div className="workspace-table-scroll"><table className="workspace-table"><thead><tr><th>Học sinh</th><th>Ngày sinh</th><th>Phụ huynh</th><th>Số điện thoại</th></tr></thead><tbody>{detail.students.map((student) => <tr key={student.id}><td><span className="workspace-person"><span className="student-avatar">{initials(student.fullName)}</span><strong>{student.fullName}</strong></span></td><td>{student.birthDate ? new Date(`${student.birthDate}T12:00:00`).toLocaleDateString("vi-VN") : "Chưa có"}</td><td>{student.parentName || "Chưa có"}</td><td>{student.parentPhoneNumber ? <a href={`tel:${student.parentPhoneNumber}`}>{student.parentPhoneNumber}</a> : "Chưa có"}</td></tr>)}</tbody></table></div> : <div className="workspace-empty"><UiIcon name="classes" size={32} /><h3>Lớp chưa có học sinh</h3><p>Thêm học sinh để bắt đầu điểm danh và tổ chức giải đấu.</p></div>}
      </section>}
      {tab === "tournaments" && <section className="workspace-card"><div className="workspace-section-heading"><div><h2>Giải đấu của lớp</h2><p>Giải Swiss, kết quả từng vòng và bảng xếp hạng.</p></div><button className="primary-button" type="button" onClick={() => onNavigate(`/classes/${classId}/tournaments/new`)}><UiIcon name="plus" size={18} />Tạo giải</button></div>
        {tournamentLoading ? <p className="ui-empty" role="status">Đang tải giải đấu…</p> : tournamentError ? <div className="ui-error" role="alert">{tournamentError}<button className="secondary-button" onClick={() => setTournamentRetry((value) => value + 1)}>Thử lại</button></div> : tournaments.length ? <div className="workspace-tournaments">{tournaments.map((item) => <a className="workspace-tournament" href={`/tournaments/${item.id}`} key={item.id} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(`/tournaments/${item.id}`); }}><span className="overview-class-icon"><UiIcon name="trophy" /></span><span><strong>{item.name ?? item.className}</strong><small>Giải Swiss · {item.roundCount} vòng</small></span><span className={`overview-status ${item.status === "COMPLETED" ? "overview-status--done" : ""}`}>{item.status === "COMPLETED" ? "Đã hoàn thành" : "Đang diễn ra"}</span><UiIcon name="chevron" size={18} /></a>)}</div> : <div className="workspace-empty"><UiIcon name="trophy" size={32} /><h3>Chưa có giải đấu</h3><p>Bấm “Tạo giải” để chọn học sinh của lớp và bắt đầu giải đấu.</p></div>}
      </section>}
    </main>
  </div>;
}

function readTab() { const tab = new URLSearchParams(window.location.search).get("tab"); return ["students", "tournaments"].includes(tab) ? tab : "sessions"; }

function Summary({ label, value, tone }) { return <div className={`attendance-summary__item attendance-summary__item--${tone}`}><strong>{value}</strong><span>{label}</span></div>; }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatTime(value) { return value.slice(0, 5); }
function formatSessionDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function sessionNumber(sessions, id) { return String(sessions.findIndex((session) => session.id === id) + 1).padStart(2, "0"); }
