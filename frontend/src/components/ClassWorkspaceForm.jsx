import { useEffect, useRef, useState } from "react";
import { addClassStudent, updateTeacherClass } from "../services/api";
import { attendanceChanged } from "./workspaceState";
import "../pages/classManagement.css";

export function ClassWorkspaceForm({ mode, teacherId, classId, classroom, onSaved, onClose, onDraftChange }) {
  const initial = mode === "student" ? { fullName: "", birthDate: "", parentName: "", parentPhoneNumber: "" }
    : { name: classroom.name, feePerSession: String(classroom.feePerSession ?? 0) };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const form = useRef(null);
  const callbacks = useRef({ onSaved }); callbacks.current = { onSaved };
  const dirty = attendanceChanged(values, saved);

  useEffect(() => {
    onDraftChange({ dirty, busy, label: mode === "student" ? "hồ sơ học sinh" : "thông tin lớp", save,
      discard: () => { setValues(saved); setMessage(""); } });
    return () => onDraftChange(null);
  }, [values, saved, busy, mode, onDraftChange]);

  function change(key) { return (event) => { setValues((current) => ({ ...current, [key]: event.target.value })); setMessage(""); }; }
  async function save() {
    if (!form.current.checkValidity()) { setSuccess(false); setMessage("Hãy điền đầy đủ các trường hợp lệ trước khi lưu."); return false; }
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      if (mode === "student") await addClassStudent(teacherId, classId, values);
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
    <div><h2>{mode === "student" ? "Thêm học sinh" : "Thiết lập lớp"}</h2><p>{mode === "student" ? "Nhập hồ sơ học sinh và thông tin liên hệ phụ huynh." : "Cập nhật tên lớp và học phí áp dụng cho mỗi buổi học."}</p></div>
    <fieldset disabled={busy} className="workspace-form-fields">
      {mode === "student" ? <div className="management-grid">
        <label>Họ và tên học sinh<input value={values.fullName} onChange={change("fullName")} required pattern=".*\S.*" autoFocus /></label>
        <label>Ngày sinh<input type="date" value={values.birthDate} onChange={change("birthDate")} required max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })} /></label>
        <label>Họ và tên phụ huynh<input value={values.parentName} onChange={change("parentName")} required pattern=".*\S.*" /></label>
        <label>Số điện thoại phụ huynh<input type="tel" value={values.parentPhoneNumber} onChange={change("parentPhoneNumber")} required pattern=".*\S.*" /></label>
      </div> : <><label>Tên lớp<input value={values.name} onChange={change("name")} required pattern=".*\S.*" /></label><label>Học phí mỗi buổi (VNĐ)<input type="number" min="0" step="1000" value={values.feePerSession} onChange={change("feePerSession")} required /></label></>}
    </fieldset>
    {message && <p className={`management-message ${success ? "management-message--success" : ""}`} role={success ? "status" : "alert"}>{message}</p>}
    <div className="management-actions">{dirty && <span className="workspace-draft-label" role="status">Có thay đổi chưa lưu</span>}{onClose && <button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Đóng biểu mẫu</button>}<button className="primary-button" disabled={busy || (mode !== "student" && !dirty)}>{busy ? "Đang lưu…" : mode === "student" ? "Thêm học sinh" : "Lưu thông tin lớp"}</button></div>
  </form>;
}
