import { useEffect, useState } from "react";
import { addClassStudent, getTeacherClassDetail, updateFutureClassSchedule, updateTeacherClass } from "../services/api";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { ClassWorkspaceNav } from "../components/layout/ClassWorkspaceNav";
import "./classManagement.css";

const emptyStudent = () => ({ fullName: "", birthDate: "", parentName: "", parentPhoneNumber: "" });
const emptySession = () => ({ date: "", startTime: "", endTime: "" });

export function ClassManagementPage({ classId, teacherId, teacherName, onLogout, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [section, setSection] = useState(readSection);
  const [name, setName] = useState("");
  const [feePerSession, setFeePerSession] = useState("");
  const [student, setStudent] = useState(emptyStudent);
  const [sessions, setSessions] = useState([emptySession()]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const syncSection = () => { setSection(readSection()); setMessage(""); };
    syncSection();
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, [classId]);

  useEffect(() => {
    let active = true;
    getTeacherClassDetail(teacherId, classId).then((result) => {
      if (!active) return;
      setDetail(result); setName(result.chessClass.name); setFeePerSession(String(result.chessClass.feePerSession ?? 0));
      const today = todayIso();
      const future = result.sessions.filter((item) => item.date > today).map(({ date, startTime, endTime }) => ({ date, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) }));
      setSessions(future.length ? future : [emptySession()]);
    }).catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [teacherId, classId]);

  function changeSection(next) { setSection(next); setMessage(""); }
  function updateStudent(key) { return (event) => setStudent((current) => ({ ...current, [key]: event.target.value })); }
  function updateSession(index, key) { return (event) => setSessions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item)); }

  async function saveGeneral(event) { event.preventDefault(); await save(() => updateTeacherClass(teacherId, classId, { name, feePerSession: Number(feePerSession) }), "Đã cập nhật thông tin lớp."); }
  async function saveStudent(event) { event.preventDefault(); await save(() => addClassStudent(teacherId, classId, student), "Đã thêm học sinh vào lớp.", () => { setStudent(emptyStudent()); refresh(); }); }
  async function saveSchedule(event) { event.preventDefault(); await save(() => updateFutureClassSchedule(teacherId, classId, { mode: "MANUAL", sessions }), "Đã thay lịch của các buổi trong tương lai.", refresh); }
  async function save(action, success, after) { setSaving(true); setMessage(""); try { await action(); setMessage(success); if (after) await after(); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  async function refresh() { const result = await getTeacherClassDetail(teacherId, classId); setDetail(result); }

  const shell = (content) => <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-management-page">{content}</main></div>;
  if (!detail) return shell(<p className={message ? "page-error" : "page-loading"}>{message || "Đang tải lớp học…"}</p>);
  return <div className="app-shell"><AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard class-management-page">
    <AppPageHeader breadcrumb="Lớp học" title={detail.chessClass.name} description={`${detail.chessClass.schedule} · ${detail.students.length} học sinh`} actions={<button className="secondary-button" onClick={() => onNavigate("/homepage")}>← Tất cả lớp</button>} />
    <ClassWorkspaceNav classId={classId} active={section === "schedule" ? "sessions" : section} studentCount={detail.students.length} onNavigate={(href) => {
      if (href.endsWith("manage?section=general")) { changeSection("general"); if (window.location.search !== "?section=general") window.history.pushState({}, "", href); }
      else onNavigate(href);
    }} />
    {section !== "general" && <button className="overview-link workspace-back" onClick={() => onNavigate(`/classes/${classId}?tab=${section === "students" ? "students" : "sessions"}`)}>← {section === "students" ? "Danh sách học sinh" : "Buổi học & điểm danh"}</button>}
    {section === "general" && <form className="management-card" onSubmit={saveGeneral}><div><p className="eyebrow">Thông tin chung</p><h2>Chỉnh sửa lớp</h2><p>Cập nhật tên lớp và mức học phí áp dụng cho mỗi buổi học.</p></div><label>Tên lớp<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Học phí mỗi buổi (VNĐ)<input type="number" min="0" step="1000" value={feePerSession} onChange={(event) => setFeePerSession(event.target.value)} required /></label><Actions saving={saving} label="Lưu thông tin lớp" message={message} /></form>}
    {section === "students" && <form className="management-card" onSubmit={saveStudent}><div><p className="eyebrow">Danh sách lớp</p><h2>Thêm học sinh</h2><p>Lớp hiện có {detail.students.length} học sinh. Nhập hồ sơ và thông tin liên hệ của phụ huynh.</p></div><div className="management-grid"><label>Họ và tên học sinh<input value={student.fullName} onChange={updateStudent("fullName")} required /></label><label>Ngày sinh<input type="date" value={student.birthDate} onChange={updateStudent("birthDate")} required /></label><label>Họ và tên phụ huynh<input value={student.parentName} onChange={updateStudent("parentName")} required /></label><label>Số điện thoại phụ huynh<input type="tel" value={student.parentPhoneNumber} onChange={updateStudent("parentPhoneNumber")} required /></label></div><Actions saving={saving} label="Thêm học sinh" message={message} /></form>}
    {section === "schedule" && <form className="management-card" onSubmit={saveSchedule}><div><p className="eyebrow">Lịch học</p><h2>Chỉnh sửa lịch trong tương lai</h2><p>Các buổi đã qua và hôm nay được giữ nguyên. Danh sách bên dưới sẽ thay thế toàn bộ buổi học từ ngày mai.</p></div><div className="manual-sessions">{sessions.map((session, index) => <div className="manual-session" key={index}><label>Ngày học<input type="date" min={tomorrowIso()} value={session.date} onChange={updateSession(index, "date")} required /></label><label>Bắt đầu<input type="time" value={session.startTime} onChange={updateSession(index, "startTime")} required /></label><label>Kết thúc<input type="time" value={session.endTime} onChange={updateSession(index, "endTime")} required /></label>{sessions.length > 1 && <button type="button" className="remove-session" onClick={() => setSessions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>}</div>)}</div><button type="button" className="add-session" onClick={() => setSessions((current) => [...current, emptySession()])}>＋ Thêm buổi trong tương lai</button><Actions saving={saving} label="Lưu lịch tương lai" message={message} /></form>}
  </main></div>;
}

function Actions({ saving, label, message }) { return <><>{message && <p className={message.startsWith("Đã") ? "management-message management-message--success" : "management-message"}>{message}</p>}</><div className="management-actions"><button className="primary-button" disabled={saving}>{saving ? "Đang lưu…" : label}</button></div></>; }
function todayIso() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); }
function tomorrowIso() { const tomorrow = new Date(`${todayIso()}T12:00:00`); tomorrow.setDate(tomorrow.getDate() + 1); return tomorrow.toISOString().slice(0, 10); }
function readSection() { const section = new URLSearchParams(window.location.search).get("section"); return ["students", "schedule"].includes(section) ? section : "general"; }
