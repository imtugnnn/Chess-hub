import { useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { createTournament, getTournamentCreation } from "../services/api";
import "./tournament.css";

const TIE_BREAK_LABELS = { WIN_COUNT: "Số trận thắng", WHITE_GAME_COUNT: "Số trận đi quân Trắng" };

export function CreateTournamentPage({ classId, sessionId, teacherId, teacherName, onLogout, onNavigate }) {
  const [data, setData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [roundCount, setRoundCount] = useState(1);
  const [tieBreaks, setTieBreaks] = useState(["WIN_COUNT", "WHITE_GAME_COUNT"]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getTournamentCreation(teacherId, classId, sessionId).then((result) => {
      if (!active) return;
      setData(result);
      const defaults = result.students.filter((student) => student.preselected).map((student) => student.id);
      setSelectedIds(new Set(defaults));
      setRoundCount(defaultRounds(defaults.length));
    }).catch((error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, sessionId]);

  const maxRounds = Math.min(9, Math.max(1, selectedIds.size - 1));
  const filteredStudents = useMemo(() => (data?.students ?? []).filter((student) => student.fullName.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN"))), [data, query]);
  const everyStudentSelected = data?.students.every((student) => selectedIds.has(student.id));

  function toggleStudent(id) { setSelectedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); setMessage(""); }
  function toggleAll() { setSelectedIds(everyStudentSelected ? new Set() : new Set(data.students.map((student) => student.id))); setMessage(""); }
  function toggleTieBreak(type) { setTieBreaks((current) => current.includes(type) ? current.filter((item) => item !== type) : current.length === 3 ? current : [...current, type]); setMessage(""); }
  function moveTieBreak(type, direction) { setTieBreaks((current) => { const index = current.indexOf(type); const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }

  async function submit(event) {
    event.preventDefault();
    if (selectedIds.size < 2) { setMessage("Hãy chọn ít nhất 2 học sinh để tạo giải Swiss."); return; }
    if (!tieBreaks.length) { setMessage("Hãy chọn ít nhất một tie-break."); return; }
    setSaving(true); setMessage("");
    try { const created = await createTournament(teacherId, classId, sessionId, { participantIds: [...selectedIds], roundCount: Math.min(roundCount, maxRounds), tieBreaks }); onNavigate(`/tournaments/${created.id}`); }
    catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  const shell = (content) => <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard create-tournament-page">{content}</main></div>;
  if (loading) return shell(<p className="page-loading">Đang tải dữ liệu tạo giải…</p>);
  if (!data) return shell(<><button className="text-button" onClick={() => onNavigate(`/classes/${classId}?sessionId=${sessionId}`)}>← Quay lại buổi học</button><p className="page-error">{message || "Không tìm thấy buổi học."}</p></>);

  return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard create-tournament-page">
    <AppPageHeader breadcrumb={`Lớp học / ${data.session.className} / Giải đấu`} title="Tạo giải đấu Swiss" description={`${formatDate(data.session.date)} · ${formatTime(data.session.startTime)} – ${formatTime(data.session.endTime)}`} actions={<button className="secondary-button" type="button" onClick={() => onNavigate(`/classes/${classId}?sessionId=${sessionId}`)}>← Quay lại buổi học</button>} />
    <form className="tournament-form" onSubmit={submit}>
      <section className="tournament-card"><div className="tournament-card__heading"><div><p className="eyebrow">Người chơi</p><h2>Chọn học sinh tham gia</h2><p>Học sinh có mặt hoặc đi muộn đã được chọn sẵn. Bạn có thể thay đổi danh sách này.</p></div><strong>{selectedIds.size}/{data.students.length}</strong></div>
        <div className="tournament-toolbar"><label><span>Tìm học sinh</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên học sinh" /></label><button className="secondary-button" type="button" onClick={toggleAll}>{everyStudentSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button></div>
        <div className="tournament-student-list">{filteredStudents.map((student) => <label className="tournament-student" key={student.id}><input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => toggleStudent(student.id)} /><span className="student-avatar">{initials(student.fullName)}</span><span><strong>{student.fullName}</strong><small>{student.phoneNumber}</small></span><AttendanceBadge status={student.attendanceStatus} /></label>)}{!filteredStudents.length && <p className="empty-state">Không tìm thấy học sinh phù hợp.</p>}</div>
      </section>
      <section className="tournament-card"><div className="tournament-card__heading"><div><p className="eyebrow">Cấu hình</p><h2>Luật giải đấu</h2></div></div>
        <label className="round-picker"><span>Số vòng đấu</span><select value={Math.min(roundCount, maxRounds)} onChange={(event) => setRoundCount(Number(event.target.value))}>{Array.from({ length: maxRounds }, (_, index) => index + 1).map((round) => <option key={round} value={round}>{round} vòng</option>)}</select><small>Tối đa {maxRounds} vòng với {selectedIds.size} học sinh đang chọn.</small></label>
        <div className="tie-break-section"><div><span>Thứ tự tie-break</span><small>Chọn tối đa 3 tiêu chí. Thứ tự từ trên xuống được ưu tiên trước.</small></div><div className="tie-break-list">{data.availableTieBreaks.map((type) => { const index = tieBreaks.indexOf(type); return <div className={`tie-break-item ${index >= 0 ? "tie-break-item--selected" : ""}`} key={type}><label><input type="checkbox" checked={index >= 0} onChange={() => toggleTieBreak(type)} /><span>{TIE_BREAK_LABELS[type] ?? type}</span></label>{index >= 0 && <span className="tie-break-order"><b>{index + 1}</b><button type="button" disabled={index === 0} onClick={() => moveTieBreak(type, -1)}>↑</button><button type="button" disabled={index === tieBreaks.length - 1} onClick={() => moveTieBreak(type, 1)}>↓</button></span>}</div>; })}</div></div>
      </section>
      {message && <p className="tournament-message">{message}</p>}
      <footer className="tournament-actions"><span>Giải sẽ lưu riêng danh sách học sinh đã chọn.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang tạo…" : "Tạo giải đấu"}</button></footer>
    </form>
  </main></div>;
}

function AttendanceBadge({ status }) { const labels = { PRESENT: "Có mặt", LATE: "Muộn", ABSENT: "Vắng" }; return <small className={`attendance-badge attendance-badge--${(status ?? "unmarked").toLowerCase()}`}>{labels[status] ?? "Chưa điểm danh"}</small>; }
function defaultRounds(count) { return Math.min(9, Math.max(1, Math.ceil(Math.log2(Math.max(2, count))))); }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatTime(value) { return value.slice(0, 5); }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
