import { useEffect, useRef, useState } from "react";
import { addClassStudent, addExistingClassStudent, getStudents, updateTeacherClass } from "../services/api";
import { attendanceChanged } from "./workspaceState";
import { StudentOptionalFields } from "./StudentOptionalFields";
import "../pages/classManagement.css";

export function ClassWorkspaceForm({ mode, teacherId, classId, classroom, onSaved, onClose, onDraftChange }) {
  const initial = mode === "student" ? { fullName: "", birthDate: "", parentName: "", parentPhoneNumber: "", phoneNumber: "", notes: "" }
    : { name: classroom.name, feePerSession: String(classroom.feePerSession ?? 0) };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [studentMode, setStudentMode] = useState("existing");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const form = useRef(null);
  const callbacks = useRef({ onSaved }); callbacks.current = { onSaved };
  const dirty = attendanceChanged(values, saved) || Boolean(selectedStudent);
  useEffect(() => {
    if (mode !== "student" || studentMode !== "existing") return;
    let active = true; setSearchError("");
    if (query.trim().length < 2) { setMatches([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => getStudents(teacherId, { query, scope: "all", enrollment: "all", page: 0, size: 25 }).then(result => { if (active) setMatches(result.items); }).catch(error => { if (active) setSearchError(error.message); }).finally(() => { if (active) setSearching(false); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [mode, studentMode, teacherId, query]);

  useEffect(() => {
    onDraftChange({ dirty, busy, label: mode === "student" ? "hồ sơ học sinh" : "thông tin lớp", save,
      discard: () => { setValues(saved); setSelectedStudent(null); setMessage(""); } });
    return () => onDraftChange(null);
  }, [values, saved, busy, mode, onDraftChange, selectedStudent, studentMode]);

  function change(key) { return (event) => { setValues((current) => ({ ...current, [key]: event.target.value })); setMessage(""); }; }
  async function save() {
    if (mode === "student" && studentMode === "existing" && !selectedStudent) { setMessage("Hãy tìm và chọn một hồ sơ học sinh."); return false; }
    if (!form.current.checkValidity()) { setSuccess(false); setMessage("Hãy điền đầy đủ các trường hợp lệ trước khi lưu."); return false; }
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      if (mode === "student") {
        if (studentMode === "existing") await addExistingClassStudent(teacherId, classId, selectedStudent.id);
        else await addClassStudent(teacherId, classId, values);
        setSelectedStudent(null); setQuery("");
      }
      else await updateTeacherClass(teacherId, classId, { name: values.name.trim(), feePerSession: Number(values.feePerSession) });
      const next = mode === "student" ? initial : values;
      setValues(next); setSaved(next); setSuccess(true);
      setMessage(mode === "student" ? "Đã thêm học sinh vào lớp." : "Đã cập nhật thông tin lớp.");
      window.dispatchEvent(new Event("classes-updated"));
      try { await callbacks.current.onSaved(); }
      catch { setMessage("Đã lưu. Chưa tải lại được danh sách; hãy tải lại trang để cập nhật."); }
      return true;
    } catch (error) { setMessage(error.message); return false; }
    finally { setBusy(false); }
  }

  return <form ref={form} className="management-card workspace-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
    <div><h2>{mode === "student" ? "Thêm học sinh" : "Thiết lập lớp"}</h2><p>{mode === "student" ? "Chọn hồ sơ đã có để giữ thông tin và lịch sử của học sinh." : "Cập nhật tên lớp và học phí áp dụng cho mỗi buổi học."}</p></div>
    {mode === "student" && <label>Cách thêm<select disabled={busy} value={studentMode} onChange={event => { setStudentMode(event.target.value); setSelectedStudent(null); setValues(initial); setMessage(""); }}><option value="existing">Chọn hồ sơ có sẵn</option><option value="new">Tạo nhanh hồ sơ mới</option></select></label>}
    <fieldset disabled={busy} className="workspace-form-fields">
      {mode === "student" && studentMode === "existing" ? <div className="class-student-picker"><label>Tìm hồ sơ học sinh<input type="search" value={query} maxLength={255} placeholder="Nhập ít nhất 2 ký tự tên hoặc số điện thoại" onChange={event => { setQuery(event.target.value); setSelectedStudent(null); }} /></label>{searching ? <p role="status">Đang tìm học sinh…</p> : searchError ? <p role="alert">{searchError}</p> : matches.length ? <div className="class-student-matches" role="group" aria-label="Hồ sơ tìm thấy">{matches.map(student => <button type="button" key={student.id} className="secondary-button" aria-pressed={selectedStudent?.id === student.id} onClick={() => setSelectedStudent(student)}><strong>{student.fullName}</strong><span>{student.parentName} · {student.parentPhoneNumber}</span><small>{student.centerName || "Cá nhân"}</small></button>)}</div> : query.trim().length >= 2 && <p>Không tìm thấy hồ sơ. Thử từ khóa khác hoặc chọn tạo nhanh hồ sơ mới.</p>}{selectedStudent && <p role="status">Đã chọn: {selectedStudent.fullName}. Thông tin chung được sửa tại màn quản lý học sinh.</p>}</div> : mode === "student" ? <div className="management-grid">
        <label>Họ và tên học sinh<input value={values.fullName} onChange={change("fullName")} required pattern=".*\S.*" autoFocus /></label>
        <label>Ngày sinh<input type="date" value={values.birthDate} onChange={change("birthDate")} required max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })} /></label>
        <label>Họ và tên phụ huynh<input value={values.parentName} onChange={change("parentName")} required pattern=".*\S.*" /></label>
        <label>Số điện thoại phụ huynh<input type="tel" value={values.parentPhoneNumber} onChange={change("parentPhoneNumber")} required pattern=".*\S.*" /></label>
        <StudentOptionalFields values={values} onChange={(key, value) => { setValues(current => ({ ...current, [key]: value })); setMessage(""); }} />
      </div> : <><label>Tên lớp<input value={values.name} onChange={change("name")} required pattern=".*\S.*" /></label><label>Học phí mỗi buổi (VNĐ)<input type="number" min="0" step="1000" value={values.feePerSession} onChange={change("feePerSession")} required /></label></>}
    </fieldset>
    {message && <p className={`management-message ${success ? "management-message--success" : ""}`} role={success ? "status" : "alert"}>{message}</p>}
    <div className="management-actions">{dirty && <span className="workspace-draft-label" role="status">Có thay đổi chưa lưu</span>}{onClose && <button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Đóng biểu mẫu</button>}<button className="primary-button" disabled={busy || (mode !== "student" && !dirty)}>{busy ? "Đang lưu…" : mode === "student" ? "Thêm học sinh" : "Lưu thông tin lớp"}</button></div>
  </form>;
}
