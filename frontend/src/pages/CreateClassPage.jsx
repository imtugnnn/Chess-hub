import { useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { createTeacherClass, findStudentByPhone } from "../services/api";

const emptyForm = {
  name: "", students: [emptyStudent()],
  scheduleMode: "MANUAL", manualSessions: [{ date: "", startTime: "", endTime: "" }],
  weekdays: [], startDate: "", endDate: "", startTime: "", endTime: "",
};

const weekdays = [
  { value: 1, label: "T2" }, { value: 2, label: "T3" }, { value: 3, label: "T4" }, { value: 4, label: "T5" },
  { value: 5, label: "T6" }, { value: 6, label: "T7" }, { value: 7, label: "CN" },
];

export function CreateClassPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [form, setForm] = useState(emptyForm);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const recurringSessionCount = useMemo(() => countRecurringSessions(form), [form]);

  function update(key) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };
  }

  function updateStudent(index, key) {
    return (event) => setForm((current) => ({ ...current, students: current.students.map((student, itemIndex) => itemIndex === index ? { ...student, [key]: event.target.value, ...(key === "phoneNumber" ? { found: false } : {}) } : student) }));
  }

  function addStudent() { setForm((current) => ({ ...current, students: [...current.students, emptyStudent()] })); }
  function removeStudent(index) { setForm((current) => ({ ...current, students: current.students.filter((_, itemIndex) => itemIndex !== index) })); }

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

  async function searchStudent(index) {
    const draft = form.students[index];
    if (!draft.phoneNumber.trim()) {
      setMessage("Nhập số điện thoại học sinh để tìm kiếm.");
      return;
    }
    setSearching(true);
    setMessage("");
    try {
      const student = await findStudentByPhone(draft.phoneNumber);
      setForm((current) => ({
        ...current,
        students: current.students.map((item, itemIndex) => itemIndex === index ? { fullName: student.fullName, phoneNumber: student.phoneNumber, parentPhoneNumber: student.parentPhoneNumber, found: true } : item),
      }));
    } catch (error) {
      if (error.message === "STUDENT_NOT_FOUND") {
        setForm((current) => ({ ...current, students: current.students.map((item, itemIndex) => itemIndex === index ? { ...item, found: false } : item) }));
        setMessage("Chưa có học sinh này. Thông tin sẽ được tạo khi bạn tạo lớp.");
      } else {
        setMessage(error.message);
      }
    } finally {
      setSearching(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const duplicatePhone = findDuplicatePhone(form.students);
    if (duplicatePhone) { setMessage(`Số điện thoại ${duplicatePhone} được nhập cho nhiều học sinh. Mỗi học sinh chỉ được thêm một lần.`); return; }
    setMessage("");
    setSubmitting(true);
    try {
      const schedule = form.scheduleMode === "MANUAL"
        ? { mode: "MANUAL", sessions: form.manualSessions }
        : { mode: "RECURRING", weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, startTime: form.startTime, endTime: form.endTime };
      await createTeacherClass(teacherId, { name: form.name, students: form.students.map(({ fullName, phoneNumber, parentPhoneNumber }) => ({ fullName, phoneNumber, parentPhoneNumber })), schedule });
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
        <p className="create-class-lede">Thêm một hoặc nhiều học sinh. Hệ thống sẽ tự nhận diện học sinh đã có bằng số điện thoại.</p>
        <form className="create-class-form" onSubmit={submit}>
          <label>Tên lớp
            <input value={form.name} onChange={update("name")} placeholder="Ví dụ: Lớp Căn bản A" required />
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
          <div className="form-section-heading"><span>♙</span><div><strong>Học sinh trong lớp</strong><small>Tìm học sinh đã có hoặc nhập mới; bạn có thể thêm nhiều học sinh.</small></div></div>
          <div className="student-drafts">{form.students.map((student, index) => <fieldset className="student-draft" key={index}><legend>Học sinh {index + 1}</legend>
            <label>Số điện thoại học sinh<span className="search-input"><input type="tel" value={student.phoneNumber} onChange={updateStudent(index, "phoneNumber")} placeholder="Ví dụ: 0912 345 678" required /><button type="button" onClick={() => searchStudent(index)} disabled={searching}>{searching ? "Đang tìm…" : "Tìm"}</button></span></label>
            {student.found && <p className="student-found" role="status">✓ Đã tìm thấy học sinh trong hệ thống.</p>}
            <div className="student-draft__fields"><label>Họ và tên<input value={student.fullName} onChange={updateStudent(index, "fullName")} placeholder="Nguyễn Minh Khang" readOnly={student.found} required /></label><label>Số điện thoại phụ huynh<input type="tel" value={student.parentPhoneNumber} onChange={updateStudent(index, "parentPhoneNumber")} placeholder="0987 654 321" readOnly={student.found} required /></label></div>
            {form.students.length > 1 && <button type="button" className="remove-student" onClick={() => removeStudent(index)}>Xóa học sinh</button>}
          </fieldset>)}</div>
          <button type="button" className="add-session" onClick={addStudent}>＋ Thêm học sinh</button>
          {message && <p className="form-error create-class-message" role="alert">{message}</p>}
          <div className="create-class-actions"><button type="button" className="cancel-button" onClick={() => onNavigate("/homepage")}>Hủy</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang tạo lớp…" : "Tạo lớp"}</button></div>
        </form>
      </section>
      </main>
    </div>
  );
}

function emptyStudent() { return { fullName: "", phoneNumber: "", parentPhoneNumber: "", found: false }; }
function findDuplicatePhone(students) {
  const seen = new Set();
  for (const student of students) {
    const phone = student.phoneNumber.replaceAll(/[ .()-]/g, "");
    if (seen.has(phone)) return student.phoneNumber;
    seen.add(phone);
  }
  return null;
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
