import { useMemo, useRef, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { createTeacherClass, getStudentNameSuggestions } from "../services/api";

const emptyForm = {
  name: "", feePerSession: "", students: [emptyStudent()],
  scheduleMode: "MANUAL", manualSessions: [{ date: "", startTime: "", endTime: "" }],
  weekdays: [], startDate: "", endDate: "", startTime: "", endTime: "",
};

const weekdays = [
  { value: 1, label: "T2" }, { value: 2, label: "T3" }, { value: 3, label: "T4" }, { value: 4, label: "T5" },
  { value: 5, label: "T6" }, { value: 6, label: "T7" }, { value: 7, label: "CN" },
];

export function CreateClassPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [form, setForm] = useState(emptyForm);
  const [nameSuggestions, setNameSuggestions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const suggestionTimer = useRef(null);
  const suggestionRequest = useRef(0);
  const recurringSessionCount = useMemo(() => countRecurringSessions(form), [form]);

  function update(key) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };
  }

  function updateStudent(index, key) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, students: current.students.map((student, itemIndex) => itemIndex === index ? { ...student, [key]: value } : student) }));
      if (key === "fullName") scheduleNameSuggestions(index, value);
    };
  }

  function addStudent() { setForm((current) => ({ ...current, students: [...current.students, emptyStudent()] })); setNameSuggestions({}); }
  function removeStudent(index) { setForm((current) => ({ ...current, students: current.students.filter((_, itemIndex) => itemIndex !== index) })); setNameSuggestions({}); }

  function scheduleNameSuggestions(index, value) {
    window.clearTimeout(suggestionTimer.current);
    const query = value.trim();
    if (query.length < 2) { setNameSuggestions((current) => ({ ...current, [index]: [] })); return; }
    const request = ++suggestionRequest.current;
    suggestionTimer.current = window.setTimeout(async () => {
      try {
        const suggestions = await getStudentNameSuggestions(teacherId, query);
        if (request === suggestionRequest.current) setNameSuggestions((current) => ({ ...current, [index]: suggestions }));
      } catch {
        if (request === suggestionRequest.current) setNameSuggestions((current) => ({ ...current, [index]: [] }));
      }
    }, 220);
  }

  function selectNameSuggestion(index, suggestion) {
    setForm((current) => ({ ...current, students: current.students.map((student, itemIndex) => itemIndex === index ? {
      ...student,
      fullName: suggestion.fullName,
      birthDate: suggestion.birthDate ?? "",
      parentName: suggestion.parentName ?? "",
      parentPhoneNumber: suggestion.parentPhoneNumber ?? "",
    } : student) }));
    setNameSuggestions((current) => ({ ...current, [index]: [] }));
  }

  function updateManualSession(index, key) {
    return (event) => setForm((current) => ({ ...current, manualSessions: current.manualSessions.map((session, itemIndex) => itemIndex === index ? { ...session, [key]: event.target.value } : session) }));
  }

  function addManualSession() {
    setForm((current) => ({ ...current, manualSessions: [...current.manualSessions, { date: "", startTime: "", endTime: "" }] }));
  }

  function removeManualSession(index) {
    setForm((current) => ({ ...current, manualSessions: current.manualSessions.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function toggleWeekday(day) {
    setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day] }));
  }

  async function submit(event) {
    event.preventDefault();
    const students = form.students.filter(hasStudentDetails);
    if (hasDuplicateStudent(students)) { setMessage("Một học sinh được nhập nhiều lần. Hãy kiểm tra họ tên, ngày sinh và số điện thoại phụ huynh."); return; }
    setMessage("");
    setSubmitting(true);
    try {
      const schedule = form.scheduleMode === "MANUAL"
        ? { mode: "MANUAL", sessions: form.manualSessions }
        : { mode: "RECURRING", weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, startTime: form.startTime, endTime: form.endTime };
      await createTeacherClass(teacherId, { name: form.name, feePerSession: Number(form.feePerSession), students: students.map(({ fullName, birthDate, parentName, parentPhoneNumber }) => ({ fullName, birthDate, parentName, parentPhoneNumber })), schedule });
      onNavigate("/homepage");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
      <main className="dashboard create-class-dashboard">
      <AppPageHeader breadcrumb="Lớp học" title="Tạo lớp mới" description="Thiết lập lớp học và lịch dạy đầu tiên." actions={<button type="button" className="secondary-button" onClick={() => onNavigate("/homepage")}>← Quay lại</button>} />
      <section className="create-class-card" aria-labelledby="create-class-title">
        <p className="eyebrow">Thiết lập lớp học</p>
        <h2 id="create-class-title">Tạo lớp mới</h2>
        <p className="create-class-lede">Nhập thông tin lớp và lịch học. Bạn có thể thêm học sinh ngay hoặc bổ sung sau.</p>
        <form className="create-class-form" onSubmit={submit}>
          <section className="create-class-column" aria-labelledby="class-information-title">
          <div className="form-section-heading"><span aria-hidden="true">🏫</span><div><strong id="class-information-title">Thông tin lớp</strong><small>Thiết lập tên lớp, học phí và lịch học.</small></div></div>
          <label>Tên lớp
            <input value={form.name} onChange={update("name")} placeholder="Ví dụ: Lớp Căn bản A" required />
          </label>
          <label>Học phí mỗi buổi (VNĐ)
            <input type="number" min="0" step="1000" value={form.feePerSession} onChange={update("feePerSession")} placeholder="Ví dụ: 100000" required />
          </label>
          <fieldset className="schedule-section">
            <legend><span>◷</span> Lịch học</legend>
            <p>Chọn từng buổi hoặc để hệ thống tạo lịch định kỳ cho lớp.</p>
            <div className="schedule-mode-toggle" role="radiogroup" aria-label="Chế độ chọn lịch học">
              <button type="button" role="radio" aria-checked={form.scheduleMode === "MANUAL"} className={form.scheduleMode === "MANUAL" ? "schedule-mode-toggle__active" : ""} onClick={() => setForm((current) => ({ ...current, scheduleMode: "MANUAL" }))}>Từng ngày</button>
              <button type="button" role="radio" aria-checked={form.scheduleMode === "RECURRING"} className={form.scheduleMode === "RECURRING" ? "schedule-mode-toggle__active" : ""} onClick={() => setForm((current) => ({ ...current, scheduleMode: "RECURRING" }))}>Định kỳ hàng tuần</button>
            </div>
            {form.scheduleMode === "MANUAL" ? <div className="manual-sessions">
              {form.manualSessions.map((session, index) => <div className="manual-session" key={index}>
                <label>Ngày học<input type="date" value={session.date} onChange={updateManualSession(index, "date")} required /></label>
                <label>Bắt đầu<input type="time" value={session.startTime} onChange={updateManualSession(index, "startTime")} required /></label>
                <label>Kết thúc<input type="time" value={session.endTime} onChange={updateManualSession(index, "endTime")} required /></label>
                {form.manualSessions.length > 1 && <button type="button" className="remove-session" aria-label={`Xóa buổi học ${index + 1}`} onClick={() => removeManualSession(index)}>×</button>}
              </div>)}
              <button type="button" className="add-session" onClick={addManualSession}>＋ Thêm buổi học</button>
            </div> : <div className="recurring-schedule">
              <div><span className="schedule-label">Học vào thứ</span><div className="weekday-picker">{weekdays.map((day) => <button type="button" key={day.value} className={form.weekdays.includes(day.value) ? "weekday-picker__selected" : ""} onClick={() => toggleWeekday(day.value)} aria-pressed={form.weekdays.includes(day.value)}>{day.label}</button>)}</div></div>
              <div className="schedule-input-grid"><label>Ngày bắt đầu<input type="date" value={form.startDate} onChange={update("startDate")} required /></label><label>Ngày kết thúc<input type="date" value={form.endDate} onChange={update("endDate")} required /></label><label>Giờ bắt đầu<input type="time" value={form.startTime} onChange={update("startTime")} required /></label><label>Giờ kết thúc<input type="time" value={form.endTime} onChange={update("endTime")} required /></label></div>
              {!!recurringSessionCount && <p className="schedule-preview" role="status">✓ Sẽ tự tạo {recurringSessionCount} buổi học theo lịch này.</p>}
            </div>}
          </fieldset>
          </section>
          <section className="create-class-column" aria-labelledby="student-information-title">
          <div className="form-section-heading"><span aria-hidden="true">♙</span><div><strong id="student-information-title">Thông tin học sinh · Không bắt buộc</strong><small>Có thể để trống và thêm học sinh sau khi tạo lớp.</small></div></div>
          <div className="student-drafts">{form.students.map((student, index) => <fieldset className="student-draft" key={index}><legend>Học sinh {index + 1}</legend>
            <label className="student-draft__name">Họ và tên học sinh<span className="student-name-autocomplete"><input value={student.fullName} onChange={updateStudent(index, "fullName")} placeholder="Nguyễn Minh Khang" autoComplete="off" required={hasStudentDetails(student)} />{nameSuggestions[index]?.length > 0 && <span className="student-name-suggestions" role="listbox" aria-label="Gợi ý học sinh">{nameSuggestions[index].map((suggestion) => <button type="button" role="option" key={suggestion.id} onClick={() => selectNameSuggestion(index, suggestion)}><strong>{suggestion.fullName}</strong><small>{formatBirthDate(suggestion.birthDate)} · PH: {suggestion.parentName || "Chưa có tên"} · {suggestion.parentPhoneNumber || "Chưa có SĐT"}</small></button>)}</span>}</span></label>
            <div className="student-draft__fields"><label>Ngày sinh<input type="date" value={student.birthDate} onChange={updateStudent(index, "birthDate")} required={hasStudentDetails(student)} /></label><label>Họ và tên phụ huynh<input value={student.parentName} onChange={updateStudent(index, "parentName")} placeholder="Nguyễn Minh Anh" required={hasStudentDetails(student)} /></label><label>Số điện thoại phụ huynh<input type="tel" value={student.parentPhoneNumber} onChange={updateStudent(index, "parentPhoneNumber")} placeholder="0987 654 321" required={hasStudentDetails(student)} /></label></div>
            <button type="button" className="remove-student" onClick={() => removeStudent(index)}>Xóa học sinh</button>
          </fieldset>)}</div>
          <button type="button" className="add-session" onClick={addStudent}>＋ Thêm học sinh</button>
          </section>
          {message && <p className="form-error create-class-message" role="alert">{message}</p>}
          <div className="create-class-actions"><button type="button" className="cancel-button" onClick={() => onNavigate("/homepage")}>Hủy</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang tạo lớp…" : "Tạo lớp"}</button></div>
        </form>
      </section>
      </main>
    </div>
  );
}

function emptyStudent() { return { fullName: "", birthDate: "", parentName: "", parentPhoneNumber: "" }; }
function hasStudentDetails(student) { return Object.values(student).some((value) => value.trim() !== ""); }
function hasDuplicateStudent(students) {
  const seen = new Set();
  for (const student of students) {
    const identity = `${student.fullName.trim().toLocaleLowerCase("vi-VN")}|${student.birthDate}|${student.parentPhoneNumber.replaceAll(/[ .()-]/g, "")}`;
    if (seen.has(identity)) return true;
    seen.add(identity);
  }
  return false;
}

function formatBirthDate(value) {
  if (!value) return "Chưa có ngày sinh";
  return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN");
}

function countRecurringSessions({ weekdays: selectedDays, startDate, endDate }) {
  if (!selectedDays.length || !startDate || !endDate || startDate > endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let count = 0;
  for (const date = start; date <= end; date.setDate(date.getDate() + 1)) {
    const day = date.getDay() === 0 ? 7 : date.getDay();
    if (selectedDays.includes(day)) count += 1;
  }
  return count;
}
