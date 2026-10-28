import { useEffect, useRef, useState } from "react";
import { createStudent, updateStudent } from "../services/api";
import { StudentEntryFields } from "./StudentEntryFields";
import { emptyStudentValues, studentSuggestionValues } from "./studentEntry";

export function StudentForm({ student, centerId, options, teacherId, onSaved, onCancel, onDraftChange }) {
  const [form, setForm] = useState({ fullName: student?.fullName ?? "", birthDate: student?.birthDate ?? "", parentName: student?.parentName ?? "", parentPhoneNumber: student?.parentPhoneNumber ?? "", centerId: student?.centerId ?? centerId ?? "", phoneNumber: student?.phoneNumber ?? "", notes: student?.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const confirmRef = useRef(null);
  const dirty = useRef(false);
  useEffect(() => { formRef.current?.querySelector("input")?.focus(); }, []);
  useEffect(() => { onDraftChange({ dirty: dirty.current, busy }); }, [form, busy]);
  useEffect(() => { if (error) formRef.current?.querySelector('[role="alert"]')?.focus(); }, [error]);
  useEffect(() => {
    const beforeUnload = event => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  function change(key, value) { dirty.current = true; setForm(current => ({ ...(key === "fullName" && current.studentId ? { ...emptyStudentValues(), centerId: current.centerId } : current), [key]: value })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    if (!student && form.studentId) { dirty.current = false; onSaved({ id: form.studentId, reused: true }); setBusy(false); return; }
    try { const input = { ...form, centerId: form.centerId || null }; const result = student ? await updateStudent(teacherId, student.id, input) : await createStudent(teacherId, input); dirty.current = false; onSaved(result); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form ref={formRef} className="students-form" onSubmit={submit}>
    <p>{student ? "Thay đổi thông tin chung áp dụng cho mọi lớp đang sử dụng hồ sơ này." : "Tạo hồ sơ với tên và ít nhất một thông tin bổ sung. Nếu chỉ có tên, hãy thêm học sinh trực tiếp trong lớp."}</p>
    <fieldset className="students-form-fields" disabled={busy}>
    <StudentEntryFields values={form} teacherId={teacherId} scope={form.centerId || "personal"} suggestionsEnabled={!student} onChange={change} onSelect={selected => { dirty.current = true; setForm(current => ({ ...current, ...studentSuggestionValues(selected) })); }} onComplete={() => confirmRef.current?.focus()} />
    <label>Lưu vào<select disabled={Boolean(student)} value={form.centerId} onChange={e => change("centerId", e.target.value)}><option value="">Cá nhân</option>{options.centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    </fieldset>
    {form.centerId && !student && <p className="students-muted">Hồ sơ dùng chung trong trung tâm. Sau khi tạo, chỉ chủ trung tâm được sửa thông tin.</p>}
    {error && <p role="alert" tabIndex={-1} className="students-form-error">{error}</p>}
    <div className="students-form-actions"><button className="secondary-button" disabled={busy} type="button" onClick={onCancel}>Hủy</button><button ref={confirmRef} className="primary-button" disabled={busy}>{busy ? "Đang lưu…" : student ? "Lưu thay đổi" : form.studentId ? "Mở hồ sơ" : "Tạo hồ sơ"}</button></div>
  </form>;
}

