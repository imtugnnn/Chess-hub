import { useEffect, useRef, useState } from 'react';
import { addClassStudent, updateTeacherClass, supplementClassStudent, previewStudentImport } from '../services/api';
import { attendanceChanged } from './workspaceState';
import { ActionFeedback } from './ActionFeedback';
import { StudentEntryFields } from './StudentEntryFields';
import { emptyStudentValues, studentSuggestionValues } from './studentEntry';
import '../pages/classManagement.css';

export function ClassWorkspaceForm({ mode, teacherId, classId, classroom, onSaved, onClose, onDraftChange, member }) {
  const initial = mode === 'student' ? { ...emptyStudentValues(), ...(member ? { fullName: member.fullName } : {}) } : { name: classroom.name, feePerSession: String(classroom.feePerSession ?? 0) };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [resolution, setResolution] = useState(null);
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
    setValues(current => ({ ...(key === 'fullName' && (current.studentId || current.membershipId || current.confirmNew) ? emptyStudentValues() : current), [key]: value }));
    setMessage(''); setSuccess(false); setResolution(null);
  }
  async function save() {
    if (busy) return false;
    if (!form.current.reportValidity()) return false;
    setBusy(true); setMessage(''); setSuccess(false);
    try {
      if (mode === 'student') {
        const input = { ...values, birthDate: values.birthDate || null, membershipId: member?.membershipId ?? values.membershipId ?? null };
        if (!member) {
        const row = { rowNumber: 1, values: Object.fromEntries(['fullName','birthDate','parentName','parentPhoneNumber','phoneNumber','notes'].map(k => [k, values[k] || ''])), studentId: values.studentId, membershipId: input.membershipId, confirmNew: Boolean(values.confirmNew) };
        const [preview] = await previewStudentImport(teacherId, classId, { rows: [row] });
        if (preview.action === 'RESOLVE') { setResolution(preview); setMessage(preview.message); return false; }
        if (preview.action === 'ERROR') throw new Error(preview.message);
        }
        if (member) await supplementClassStudent(teacherId, classId, member.membershipId ?? member.id, input);
        else await addClassStudent(teacherId, classId, input);
      } else await updateTeacherClass(teacherId, classId, { name: values.name.trim(), feePerSession: Number(values.feePerSession) });
      const next = mode === 'student' ? { ...emptyStudentValues(), ...(member ? { fullName: member.fullName } : {}) } : values;
      setValues(next); setSaved(next); setSuccess(true);
      setMessage(mode === 'student' ? member ? 'Đã lưu thông tin học sinh; lịch sử trong lớp được giữ nguyên.' : 'Đã thêm học sinh vào lớp.' : 'Đã cập nhật thông tin lớp.');
      window.dispatchEvent(new Event('classes-updated'));
      try { await callbacks.current.onSaved(); }
      catch { setMessage('Đã lưu. Chưa tải lại được danh sách; hãy tải lại trang để cập nhật.'); }
      if (mode === 'student') requestAnimationFrame(() => form.current?.querySelector('input')?.focus());
      return true;
    } catch (error) { setMessage(error.message); return false; }
    finally { setBusy(false); }
  }
  return <form ref={form} className="management-card workspace-form" onSubmit={event => { event.preventDefault(); save(); }}>
    <div><h2>{mode === 'student' ? member ? 'Bổ sung thông tin học sinh' : 'Thêm học sinh' : 'Thiết lập lớp'}</h2><p>{mode === 'student' ? 'Chỉ tên học sinh là bắt buộc. Chỉ có tên thì lưu trong lớp; có thêm thông tin thì tạo hoặc dùng lại hồ sơ.' : 'Cập nhật tên lớp và học phí áp dụng cho mỗi buổi học.'}</p></div>
    <fieldset disabled={busy} className="workspace-form-fields">
      {mode === 'student' ? <StudentEntryFields values={values} teacherId={teacherId} scope={classroom.centerId || 'personal'} onChange={change} onSelect={student => { setValues(studentSuggestionValues(student)); setMessage(''); setSuccess(false); setResolution(null); }} onComplete={() => confirm.current?.focus()} /> : <>
        <label>Tên lớp<input value={values.name} onChange={event => change('name', event.target.value)} required /></label>
        <label>Học phí mỗi buổi (VNĐ)<input type="number" min="0" step="1000" value={values.feePerSession} onChange={event => change('feePerSession', event.target.value)} required /></label>
      </>}
    </fieldset>
    {resolution && <label>Xử lý trùng tên<select value="" onChange={e => {
      const [kind, id] = e.target.value.split(':');
      setValues(current => ({ ...current, studentId: kind === 'profile' ? id : null, membershipId: kind === 'member' ? id : null, confirmNew: false }));
      setResolution(null); setMessage('Đã chọn cách xử lý. Bấm xác nhận để lưu.');
    }}><option value="">Chọn cách xử lý</option>{resolution.candidates.map((c, i) => <option key={i} value={c.membershipId ? `member:${c.membershipId}` : `profile:${c.studentId}`}>Dùng lại {c.fullName} · {c.birthDate || 'chưa có ngày sinh'} · {c.parentPhoneNumber || 'chưa có SĐT'}</option>)}</select></label>}
    {message && <p className={`management-message ${success ? 'management-message--success' : ''}`} role={success ? 'status' : 'alert'}>{message}</p>}
    <div className="management-actions">{dirty && <span className="workspace-draft-label" role="status">Có thay đổi chưa lưu</span>}{onClose && <button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Đóng biểu mẫu</button>}<button ref={confirm} className="primary-button" aria-busy={busy} disabled={busy || (mode !== 'student' && !dirty)}><ActionFeedback busy={busy} success={success} successLabel={mode === 'student' ? 'Đã thêm học sinh' : 'Đã lưu'}>{mode === 'student' ? 'Thêm học sinh' : 'Lưu thông tin lớp'}</ActionFeedback></button></div>
  </form>;
}
