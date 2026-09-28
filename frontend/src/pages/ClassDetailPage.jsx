import { useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { getSessionAttendance, getTeacherClassDetail, saveSessionAttendance } from "../services/api";
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTeacherClassDetail(teacherId, classId).then((result) => {
      if (!active) return;
      setDetail(result);
      setSelectedId(result.sessions.some((session) => session.id === sessionId) ? sessionId : (result.sessions.at(-1)?.id ?? null));
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
      <AppPageHeader breadcrumb="Lớp học / Chi tiết lớp" title={detail.chessClass.name} description={`${detail.chessClass.schedule} · ${detail.students.length} học sinh`} actions={<><button className="secondary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=general`)}>✎ Sửa lớp</button><button className="secondary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=schedule`)}>◷ Sửa lịch</button><button className="secondary-button" onClick={() => onNavigate(`/classes/${classId}/manage?section=students`)}>＋ Thêm học sinh</button><button className="secondary-button" onClick={() => onNavigate("/homepage")}>← Tất cả lớp</button></>} />
      <section className="class-detail-layout">
        <aside className="session-panel" aria-label="Danh sách buổi học">
          <div className="session-panel__heading"><div><p className="eyebrow">Lộ trình lớp học</p><h2>Tất cả buổi học</h2></div><span>{detail.sessions.length} buổi</span></div>
          <div className="session-timeline">
            {detail.sessions.length ? detail.sessions.map((session, index) => <button type="button" key={session.id} className={`session-timeline__item ${selectedId === session.id ? "session-timeline__item--selected" : ""}`} onClick={() => chooseSession(session.id)}><span className="session-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{formatSessionDate(session.date)}</strong><small>{formatTime(session.startTime)} – {formatTime(session.endTime)}</small></span><i>→</i></button>) : <p className="empty-state">Chưa có buổi học nào.</p>}
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
      </section>
    </main>
  </div>;
}

function Summary({ label, value, tone }) { return <div className={`attendance-summary__item attendance-summary__item--${tone}`}><strong>{value}</strong><span>{label}</span></div>; }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatTime(value) { return value.slice(0, 5); }
function formatSessionDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function sessionNumber(sessions, id) { return String(sessions.findIndex((session) => session.id === id) + 1).padStart(2, "0"); }
