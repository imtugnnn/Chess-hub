import { useEffect, useState } from "react";
import { addClassStudent, findStudentByPhone, getTeacherClassDetail, updateFutureClassSchedule, updateTeacherClass } from "../services/api";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import "./classManagement.css";

const emptyStudent = () => ({ fullName: "", phoneNumber: "", parentPhoneNumber: "", found: false });
const emptySession = () => ({ date: "", startTime: "", endTime: "" });

export function ClassManagementPage({ classId, teacherId, teacherName, onLogout, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [section, setSection] = useState(() => new URLSearchParams(window.location.search).get("section") ?? "general");
  const [name, setName] = useState("");
  const [student, setStudent] = useState(emptyStudent);
  const [sessions, setSessions] = useState([emptySession()]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getTeacherClassDetail(teacherId, classId).then((result) => {
      if (!active) return;
      setDetail(result); setName(result.chessClass.name);
      const today = todayIso();
      const future = result.sessions.filter((item) => item.date > today).map(({ date, startTime, endTime }) => ({ date, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) }));
      setSessions(future.length ? future : [emptySession()]);
    }).catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [teacherId, classId]);

  function changeSection(next) { setSection(next); setMessage(""); }
  function updateStudent(key) { return (event) => setStudent((current) => ({ ...current, [key]: event.target.value, ...(key === "phoneNumber" ? { found: false } : {}) })); }
  function updateSession(index, key) { return (event) => setSessions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item)); }

  async function searchStudent() {
    if (!student.phoneNumber.trim()) { setMessage("Nhập số điện thoại học sinh để tìm kiếm."); return; }
    setSaving(true); setMessage("");
    try {
      const found = await findStudentByPhone(student.phoneNumber);
      setStudent({ fullName: found.fullName, phoneNumber: found.phoneNumber, parentPhoneNumber: found.parentPhoneNumber, found: true });
    } catch (error) {
      if (error.message === "STUDENT_NOT_FOUND") setMessage("Chưa có học sinh này. Hãy điền đủ thông tin để thêm mới.");
      else setMessage(error.message);
    } finally { setSaving(false); }
  }

  async function saveGeneral(event) { event.preventDefault(); await save(() => updateTeacherClass(teacherId, classId, { name }), "Đã cập nhật thông tin lớp."); }
  async function saveStudent(event) { event.preventDefault(); await save(() => addClassStudent(teacherId, classId, { fullName: student.fullName, phoneNumber: student.phoneNumber, parentPhoneNumber: student.parentPhoneNumber }), "Đã thêm học sinh vào lớp.", () => { setStudent(emptyStudent()); refresh(); }); }
  async function saveSchedule(event) { event.preventDefault(); await save(() => updateFutureClassSchedule(teacherId, classId, { mode: "MANUAL", sessions }), "Đã thay lịch của các buổi trong tương lai.", refresh); }
  async function save(action, success, after) { setSaving(true); setMessage(""); try { await action(); setMessage(success); if (after) await after(); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  async function refresh() { const result = await getTeacherClassDetail(teacherId, classId); setDetail(result); }

  const shell = (content) => <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-management-page">{content}</main></div>;
  if (!detail) return shell(<p className={message ? "page-error" : "page-loading"}>{message || "Đang tải lớp học…"}</p>);
  return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-management-page">
    <AppPageHeader breadcrumb="Lớp học / Quản lý lớp" title={detail.chessClass.name} description="Cập nhật thông tin, lịch học và học sinh của lớp." actions={<button className="secondary-button" onClick={() => onNavigate(`/classes/${classId}`)}>← Quay lại lớp</button>} />
    <div className="management-tabs" role="tablist"><button className={section === "general" ? "management-tabs__active" : ""} onClick={() => changeSection("general")}>✎ Thông tin lớp</button><button className={section === "schedule" ? "management-tabs__active" : ""} onClick={() => changeSection("schedule")}>◷ Lịch học</button><button className={section === "students" ? "management-tabs__active" : ""} onClick={() => changeSection("students")}>＋ Thêm học sinh</button></div>
    {section === "general" && <form className="management-card" onSubmit={saveGeneral}><div><p className="eyebrow">Thông tin chung</p><h2>Chỉnh sửa lớp</h2><p>Đổi tên lớp mà không ảnh hưởng đến học sinh hay các buổi học.</p></div><label>Tên lớp<input value={name} onChange={(event) => setName(event.target.value)} required /></label><Actions saving={saving} label="Lưu thông tin lớp" message={message} /></form>}
    {section === "students" && <form className="management-card" onSubmit={saveStudent}><div><p className="eyebrow">Danh sách lớp</p><h2>Thêm học sinh</h2><p>Lớp hiện có {detail.students.length} học sinh. Học sinh đã tồn tại sẽ được nhận diện bằng số điện thoại.</p></div><label>Số điện thoại học sinh<span className="search-input"><input type="tel" value={student.phoneNumber} onChange={updateStudent("phoneNumber")} placeholder="0912 345 678" required /><button type="button" onClick={searchStudent} disabled={saving}>{saving ? "Đang tìm…" : "Tìm"}</button></span></label>{student.found && <p className="student-found">✓ Đã tìm thấy học sinh trong hệ thống.</p>}<div className="management-grid"><label>Họ và tên<input value={student.fullName} onChange={updateStudent("fullName")} readOnly={student.found} required /></label><label>Số điện thoại phụ huynh<input value={student.parentPhoneNumber} onChange={updateStudent("parentPhoneNumber")} readOnly={student.found} required /></label></div><Actions saving={saving} label="Thêm học sinh" message={message} /></form>}
    {section === "schedule" && <form className="management-card" onSubmit={saveSchedule}><div><p className="eyebrow">Lịch học</p><h2>Chỉnh sửa lịch trong tương lai</h2><p>Các buổi đã qua và hôm nay được giữ nguyên. Danh sách bên dưới sẽ thay thế toàn bộ buổi học từ ngày mai.</p></div><div className="manual-sessions">{sessions.map((session, index) => <div className="manual-session" key={index}><label>Ngày học<input type="date" min={tomorrowIso()} value={session.date} onChange={updateSession(index, "date")} required /></label><label>Bắt đầu<input type="time" value={session.startTime} onChange={updateSession(index, "startTime")} required /></label><label>Kết thúc<input type="time" value={session.endTime} onChange={updateSession(index, "endTime")} required /></label>{sessions.length > 1 && <button type="button" className="remove-session" onClick={() => setSessions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>}</div>)}</div><button type="button" className="add-session" onClick={() => setSessions((current) => [...current, emptySession()])}>＋ Thêm buổi trong tương lai</button><Actions saving={saving} label="Lưu lịch tương lai" message={message} /></form>}
  </main></div>;
}

function Actions({ saving, label, message }) { return <><>{message && <p className={message.startsWith("Đã") ? "management-message management-message--success" : "management-message"}>{message}</p>}</><div className="management-actions"><button className="primary-button" disabled={saving}>{saving ? "Đang lưu…" : label}</button></div></>; }
function todayIso() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); }
function tomorrowIso() { const tomorrow = new Date(`${todayIso()}T12:00:00`); tomorrow.setDate(tomorrow.getDate() + 1); return tomorrow.toISOString().slice(0, 10); }
