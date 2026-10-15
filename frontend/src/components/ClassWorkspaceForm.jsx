import { useEffect, useRef, useState } from 'react';
import { addClassStudent, addExistingClassStudent, updateTeacherClass } from '../services/api';
import { attendanceChanged } from './workspaceState';
import { StudentEntryFields } from './StudentEntryFields';
import { emptyStudentValues, studentSuggestionValues } from './studentEntry';
import '../pages/classManagement.css';

export function ClassWorkspaceForm({ mode, teacherId, classId, classroom, onSaved, onClose, onDraftChange }) {
  const initial = mode === 'student' ? emptyStudentValues() : { name: classroom.name, feePerSession: String(classroom.feePerSession ?? 0) };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const form = useRef(null);
  const confirm = useRef(null);
  const callbacks = useRef({ onSaved }); callbacks.current = { onSaved };
  const dirty = attendanceChanged(values, saved);
  useEffect(() => {
    onDraftChange({ dirty, busy, label: mode === 'student' ? 'hồ sơ học sinh' : 'thông tin lớp', save,
      discard: () => { setValues(saved); setMessage(''); } });
    return () => onDraftChange(null);
  }, [values, saved, busy, mode, onDraftChange]);
  function change(key, value) {
    setValues(current => ({ ...(key === 'fullName' && current.studentId ? emptyStudentValues() : current), [key]: value }));
    setMessage(''); setSuccess(false);
  }
  async function save() {
    if (busy) return false;
    if (!form.current.reportValidity()) return false;
    setBusy(true); setMessage(''); setSuccess(false);
    try {
      if (mode === 'student') {
        if (values.studentId) await addExistingClassStudent(teacherId, classId, values.studentId);
        else await addClassStudent(teacherId, classId, values);
      } else await updateTeacherClass(teacherId, classId, { name: values.name.trim(), feePerSession: Number(values.feePerSession) });
      const next = mode === 'student' ? emptyStudentValues() : values;
      setValues(next); setSaved(next); setSuccess(true);
      setMessage(mode === 'student' ? 'Đã thêm học sinh vào lớp.' : 'Đã cập nhật thông tin lớp.');
      window.dispatchEvent(new Event('classes-updated'));
      try { await callbacks.current.onSaved(); }
      catch { setMessage('Đã lưu. Chưa tải lại được danh sách; hãy tải lại trang để cập nhật.'); }
      if (mode === 'student') requestAnimationFrame(() => form.current?.querySelector('input')?.focus());
      return true;
    } catch (error) { setMessage(error.message); return false; }
    finally { setBusy(false); }
  }
  return <form ref={form} className="management-card workspace-form" onSubmit={event => { event.preventDefault(); save(); }}>
    <div><h2>{mode === 'student' ? 'Thêm học sinh' : 'Thiết lập lớp'}</h2><p>{mode === 'student' ? 'Nhập tên để chọn hồ sơ có sẵn hoặc tạo mới. Chỉ họ tên và ngày sinh là bắt buộc.' : 'Cập nhật tên lớp và học phí áp dụng cho mỗi buổi học.'}</p></div>
    <fieldset disabled={busy} className="workspace-form-fields">
      {mode === 'student' ? <StudentEntryFields values={values} teacherId={teacherId} onChange={change} onSelect={student => { setValues(studentSuggestionValues(student)); setMessage(''); }} onComplete={() => confirm.current?.focus()} /> : <>
        <label>Tên lớp<input value={values.name} onChange={event => change('name', event.target.value)} required /></label>
        <label>Học phí mỗi buổi (VNĐ)<input type="number" min="0" step="1000" value={values.feePerSession} onChange={event => change('feePerSession', event.target.value)} required /></label>
      </>}
    </fieldset>
    {message && <p className={`management-message ${success ? 'management-message--success' : ''}`} role={success ? 'status' : 'alert'}>{message}</p>}
    <div className="management-actions">{dirty && <span className="workspace-draft-label" role="status">Có thay đổi chưa lưu</span>}{onClose && <button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Đóng biểu mẫu</button>}<button ref={confirm} className="primary-button" disabled={busy || (mode !== 'student' && !dirty)}>{busy ? 'Đang lưu…' : mode === 'student' ? 'Thêm học sinh' : 'Lưu thông tin lớp'}</button></div>
  </form>;
}
