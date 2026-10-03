import { useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { createTournament, getTournamentCreation } from "../services/api";
import "./tournament.css";

const TIE_BREAK_LABELS = { WIN_COUNT: "Số trận thắng", WHITE_GAME_COUNT: "Số trận đi quân Trắng" };

export function CreateTournamentPage({ classId, sessionId, teacherId, teacherName, onLogout, onNavigate }) {
  const [data, setData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [name, setName] = useState("");
  const [namesText, setNamesText] = useState("");
  const [tieBreaks, setTieBreaks] = useState(["WIN_COUNT", "WHITE_GAME_COUNT"]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const fromClass = Boolean(classId);
  useEffect(() => {
    let active = true;
    setLoading(true); setMessage("");
    getTournamentCreation(teacherId, classId, sessionId).then((result) => {
      if (!active) return;
      setData(result);
      setName(result.chessClass?.name ?? result.session?.className ?? "");
      setSelectedIds(new Set(result.students.filter((student) => student.preselected).map((student) => student.id)));
    }).catch((error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, sessionId, retry]);

  const participantNames = useMemo(() => namesText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean), [namesText]);
  const playerCount = selectedIds.size + participantNames.length;
  const filteredStudents = useMemo(() => (data?.students ?? []).filter((student) => student.fullName.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN"))), [data, query]);
  const everyStudentSelected = data?.students.length > 0 && data.students.every((student) => selectedIds.has(student.id));
  function toggleStudent(id) { setSelectedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); setMessage(""); }
  function toggleAll() { setSelectedIds(everyStudentSelected ? new Set() : new Set(data.students.map((student) => student.id))); setMessage(""); }
  function toggleTieBreak(type) { setTieBreaks((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); setMessage(""); }
  function moveTieBreak(type, direction) { setTieBreaks((current) => { const index = current.indexOf(type); const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  async function submit(event) {
    event.preventDefault();
    if (playerCount < 2) { setMessage("Hãy thêm ít nhất 2 người chơi để tạo giải Swiss."); return; }
    if (participantNames.some((value) => value.length > 255)) { setMessage("Tên mỗi người chơi không được dài quá 255 ký tự."); return; }
    if (!tieBreaks.length) { setMessage("Hãy chọn ít nhất một tiêu chí phân hạng."); return; }
    setSaving(true); setMessage("");
    try { const created = await createTournament(teacherId, classId, sessionId, { name: name.trim(), participantIds: [...selectedIds], participantNames, tieBreaks }); onNavigate(`/tournaments/${created.id}`); }
    catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }
  const back = () => onNavigate(fromClass ? (sessionId ? `/classes/${classId}?sessionId=${sessionId}` : `/classes/${classId}?tab=tournaments`) : "/homepage");
  const shell = (content) => <div className="app-shell"><AppSidebar activeSection={fromClass ? "classes" : "tournaments"} teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard create-tournament-page">{content}</main></div>;
  if (loading) return shell(<p className="page-loading">Đang tải dữ liệu tạo giải…</p>);
  if (!data) return shell(<><p className="page-error" role="alert">{message || "Không thể tải dữ liệu tạo giải."}</p><button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></>);
  return shell(<>
    <AppPageHeader breadcrumb={fromClass ? `Lớp học / ${data.chessClass?.name ?? data.session?.className} / Giải đấu` : "Giải đấu / Tạo mới"} title="Tạo giải đấu Swiss" description={data.session ? `${formatDate(data.session.date)} · ${formatTime(data.session.startTime)} – ${formatTime(data.session.endTime)}` : fromClass ? "Chọn học sinh của lớp hoặc thêm người chơi bằng tên." : "Thêm người chơi bằng tên và bắt đầu vòng đầu tiên."} actions={<button className="secondary-button" type="button" onClick={back}>← {fromClass ? (sessionId ? "Quay lại buổi học" : "Quay lại lớp") : "Về tổng quan"}</button>} />
    <form className="tournament-form" onSubmit={submit}>
      <fieldset className="tournament-fields" disabled={saving}>
        <section className="tournament-card tournament-identity"><label className="tournament-field"><span>Tên giải đấu <b aria-hidden="true">*</b></span><input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Giải cờ cuối tuần" autoComplete="off" /></label></section>
        <div className="tournament-creation-layout"><div className="tournament-roster">
          {fromClass && <section className="tournament-card"><div className="tournament-card__heading"><div><p className="eyebrow">Học sinh trong lớp</p><h2>Chọn người tham gia</h2><p>{data.session ? "Học sinh có mặt hoặc đi muộn đã được chọn sẵn." : "Học sinh của lớp đã được chọn sẵn. Bạn có thể thay đổi danh sách."}</p></div><strong>{selectedIds.size}/{data.students.length}</strong></div>
            <div className="tournament-toolbar"><label><span>Tìm học sinh</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên học sinh" /></label><button className="secondary-button" type="button" onClick={toggleAll}>{everyStudentSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button></div>
            <div className="tournament-student-list">{filteredStudents.map((student) => <label className="tournament-student" key={student.id}><input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => toggleStudent(student.id)} /><span className="student-avatar">{initials(student.fullName)}</span><span><strong title={student.fullName}>{student.fullName}</strong><small>{student.parentPhoneNumber}</small></span>{data.session && <AttendanceBadge status={student.attendanceStatus} />}</label>)}{!filteredStudents.length && <p className="empty-state">Không tìm thấy học sinh phù hợp.</p>}</div>
          </section>}
          <section className="tournament-card"><div className="tournament-card__heading"><div><p className="eyebrow">{fromClass ? "Người chơi ngoài lớp" : "Người chơi"}</p><h2>{fromClass ? "Thêm người chơi bằng tên" : "Ai sẽ tham gia?"}</h2><p>Chỉ cần tên. Không cần tạo hồ sơ học sinh.</p></div><strong>{participantNames.length} người</strong></div><label className="tournament-field tournament-names"><span>{fromClass ? "Tên người chơi bổ sung" : "Danh sách người chơi"}</span><textarea rows={7} value={namesText} onChange={(event) => { setNamesText(event.target.value); setMessage(""); }} placeholder={"Nguyễn Minh Anh\nTrần Quốc Bảo\nLê Hoàng Nam"} aria-describedby="participant-names-help" /><small id="participant-names-help">Mỗi người một dòng. Giải cần ít nhất 2 người chơi.</small></label></section>
        </div><section className="tournament-card tournament-rules"><div className="tournament-card__heading"><div><p className="eyebrow">Cách tổ chức</p><h2>Thêm vòng theo nhu cầu</h2><p>Vòng 1 được tạo cùng giải. Sau khi chốt kết quả, bạn có thể tạo vòng mới hoặc kết thúc giải.</p></div></div><div className="tournament-round-note">Không cần ấn định số vòng. Chia cặp ưu tiên đối thủ chưa gặp và cân bằng màu quân; cho phép tái đấu khi cần.</div>
          <div className="tie-break-section"><div><span>Tiêu chí phân hạng khi bằng điểm</span><small>Tiêu chí ở trên được ưu tiên trước.</small></div><div className="tie-break-list">{[...tieBreaks, ...data.availableTieBreaks.filter((type) => !tieBreaks.includes(type))].map((type) => { const index = tieBreaks.indexOf(type); return <div className={`tie-break-item ${index >= 0 ? "tie-break-item--selected" : ""}`} key={type}><label><input type="checkbox" checked={index >= 0} onChange={() => toggleTieBreak(type)} /><span>{TIE_BREAK_LABELS[type] ?? type}</span></label>{index >= 0 && <span className="tie-break-order"><b>{index + 1}</b><button aria-label={`Ưu tiên ${TIE_BREAK_LABELS[type]}`} type="button" disabled={index === 0} onClick={() => moveTieBreak(type, -1)}>↑</button><button aria-label={`Hạ ưu tiên ${TIE_BREAK_LABELS[type]}`} type="button" disabled={index === tieBreaks.length - 1} onClick={() => moveTieBreak(type, 1)}>↓</button></span>}</div>; })}</div></div>
        </section></div>
      </fieldset>
      {message && <p className="tournament-message" role="alert">{message}</p>}
      <footer className="tournament-actions"><span><strong>{playerCount} người chơi</strong> · Bắt đầu với vòng 1</span><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang tạo…" : "Tạo giải & chia cặp vòng 1"}</button></footer>
    </form>
  </>);
}
function AttendanceBadge({ status }) { const labels = { PRESENT: "Có mặt", LATE: "Muộn", ABSENT: "Vắng" }; return <small className={`attendance-badge attendance-badge--${(status ?? "unmarked").toLowerCase()}`}>{labels[status] ?? "Chưa điểm danh"}</small>; }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatTime(value) { return value.slice(0, 5); }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }