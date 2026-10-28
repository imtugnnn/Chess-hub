import { rememberCreatedClass } from "../components/useRowHighlight";
import { ActionFeedback } from "../components/ActionFeedback";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppChrome } from "../components/layout/AppChrome";
import { ScheduleDatePicker, localDateKey, formatScheduleDate } from "../components/ScheduleDatePicker";
import { generateRecurringSessions } from "../components/recurringSessions";
import { createTeacherClass, getStudentOptions } from "../services/api";
import { CreateClassRoster } from "../components/CreateClassRoster";
import { UiIcon } from "../components/UiIcon";
import "./createClass.css";

const emptyForm = {
  name: "", centerId: "", feePerSession: "", students: [],
  scheduleMode: "MANUAL", manualSessions: [],
  weekdays: [], startDate: "", endDate: "", weekdayTimes: {},
};

const weekdays = [
  { value: 1, label: "T2" }, { value: 2, label: "T3" }, { value: 3, label: "T4" }, { value: 4, label: "T5" },
  { value: 5, label: "T6" }, { value: 6, label: "T7" }, { value: 7, label: "CN" },
];
const PENDING_STUDENT_MESSAGE = 'Hãy thêm hoặc hủy nội dung học sinh đang nhập trước khi tạo lớp.';

export function CreateClassPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [form, setForm] = useState(() => {
    const date = new URLSearchParams(window.location.search).get("date");
    const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00`).getTime()) && localDateKey(new Date(`${date}T12:00:00`)) === date;
    return { ...emptyForm, students: [], manualSessions: validDate ? [{ date, startTime: "", endTime: "" }] : [] };
  });
  const [centers, setCenters] = useState([]);
  const [scopeError, setScopeError] = useState('');
  const [scopeLoaded, setScopeLoaded] = useState(false);
  const [scopeRetry, setScopeRetry] = useState(0);
  useEffect(() => {
    let live = true;
    getStudentOptions(teacherId).then(options => { if (live) { setCenters(options.centers); setScopeLoaded(true); setScopeError(''); } }).catch(e => { if (live) setScopeError(e.message); });
    return () => { live = false; };
  }, [teacherId, scopeRetry]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingStudent, setPendingStudent] = useState(false);
  useEffect(() => {
    if (!pendingStudent) setMessage(current => current === PENDING_STUDENT_MESSAGE ? '' : current);
  }, [pendingStudent]);
  const recurringSessions = useMemo(() => generateRecurringSessions(form), [form]);
  const recurringSessionCount = recurringSessions.length;

  function update(key) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };
  }

  function updateManualSession(index, key) {
    return (event) => setForm((current) => ({ ...current, manualSessions: current.manualSessions.map((session, itemIndex) => itemIndex === index ? { ...session, [key]: event.target.value } : session) }));
  }

  function toggleManualDate(date) {
    setForm((current) => ({ ...current, manualSessions: current.manualSessions.some((session) => session.date === date)
      ? current.manualSessions.filter((session) => session.date !== date)
      : [...current.manualSessions, { date, startTime: "", endTime: "" }].sort((a, b) => a.date.localeCompare(b.date)) }));
  }

  function toggleWeekday(day) {
    setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day] }));
  }

  function chooseRecurringDate(date) {
    setForm((current) => {
      if (!current.startDate || current.endDate) return { ...current, startDate: date, endDate: "" };
      return { ...current, startDate: date < current.startDate ? date : current.startDate, endDate: date < current.startDate ? current.startDate : date };
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (pendingStudent) { setMessage(PENDING_STUDENT_MESSAGE); document.querySelector(".roster-editor input, .roster-editor textarea")?.focus(); return; }
    if (!scopeLoaded) { setMessage('Chưa tải được phạm vi của lớp. Hãy thử lại.'); return; }
    if (form.scheduleMode === "MANUAL" && !form.manualSessions.length) { setMessage("Hãy chọn ít nhất một ngày học trên lịch."); return; }
    if (form.scheduleMode === "RECURRING" && (!form.startDate || !form.endDate || !form.weekdays.length || !recurringSessionCount)) { setMessage("Hãy chọn ngày đầu, ngày cuối và thứ học để có ít nhất một buổi học trong khoảng ngày này."); return; }
    if (form.scheduleMode === "RECURRING" && form.weekdays.some((day) => { const time = form.weekdayTimes[day]; return !time?.startTime || !time?.endTime || time.endTime <= time.startTime; })) { setMessage("Hãy nhập đủ giờ bắt đầu và kết thúc hợp lệ cho mỗi thứ đã chọn."); return; }
    if (form.scheduleMode === "RECURRING" && recurringSessionCount > 500) { setMessage("Khoảng ngày quá dài. Chỉ có thể tạo tối đa 500 buổi học."); return; }
    const invalidTime = form.scheduleMode === "MANUAL" && form.manualSessions.some((session) => session.endTime <= session.startTime);
    if (invalidTime) { setMessage("Giờ kết thúc phải sau giờ bắt đầu của mỗi buổi học."); return; }
    const students = form.students;
    if (hasDuplicateStudent(students)) { setMessage("Học sinh bị trùng trong danh sách lớp. Hãy kiểm tra lại họ tên."); return; }
    setMessage("");
    setSubmitting(true);
    try {
      const schedule = form.scheduleMode === "MANUAL"
        ? { mode: "MANUAL", sessions: form.manualSessions }
        : { mode: "RECURRING", weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, startTime: recurringSessions[0].startTime, endTime: recurringSessions[0].endTime, sessions: recurringSessions };
      const created = await createTeacherClass(teacherId, { name: form.name, centerId: form.centerId || null, feePerSession: Number(form.feePerSession), students: students.map(({ studentId, fullName, birthDate, parentName, parentPhoneNumber, phoneNumber, notes }) => ({ studentId, fullName, birthDate: birthDate || null, parentName, parentPhoneNumber, phoneNumber, notes })), schedule });
      rememberCreatedClass(teacherId, created.chessClass?.id ?? created.id);
      onNavigate("/homepage");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <AppChrome title="Tạo lớp mới" activeSection="classes" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
      <main className="dashboard create-class-dashboard">
      <AppPageHeader section="Lớp học" breadcrumbs={[{ label: "Lớp học", href: "/homepage" }]} onNavigate={onNavigate} title="Tạo lớp mới" icon={false} description="Thiết lập thông tin lớp, lịch học và danh sách học sinh." actions={<><button type="button" className="secondary-button" onClick={() => onNavigate("/homepage")} disabled={submitting}><UiIcon name="previousMove" size={18} />Quay lại</button><button className="primary-button create-class-submit" type="submit" form="create-class-form" disabled={submitting} aria-busy={submitting}><ActionFeedback busy={submitting} busyLabel="Đang tạo lớp…">Tạo lớp</ActionFeedback></button></>} />
      <div className="create-class-content">
        {message && <p className="form-error create-class-message" role="alert">{message}</p>}
        <form id="create-class-form" className="create-class-form" onSubmit={submit}>
          <fieldset className="create-class-form-body" disabled={submitting}>
          <section className="create-class-column create-class-details" aria-labelledby="class-information-title">
          <h2 id="class-information-title">Thông tin lớp</h2>
          <label>Lớp thuộc<select value={form.centerId} onChange={update('centerId')} disabled={!scopeLoaded || submitting || form.students.some(student => student.studentId) || pendingStudent}><option value="">Cá nhân</option>{centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {(pendingStudent || form.students.some(student => student.studentId)) && <p className="student-entry-help">Hoàn tất nội dung đang nhập và bỏ các hồ sơ có sẵn khỏi danh sách trước khi đổi phạm vi lớp.</p>}
          {scopeError && <p role="alert">{scopeError} <button type="button" className="secondary-button" onClick={() => setScopeRetry(r => r + 1)}>Thử lại</button></p>}
          <label>Tên lớp
            <input value={form.name} onChange={update("name")} required />
          </label>
          <label>Học phí mỗi buổi (VNĐ)
            <input type="number" min="0" step="1000" value={form.feePerSession} onChange={update("feePerSession")} required />
          </label>
          <fieldset className="schedule-section">
            <legend>Lịch học</legend>
            <p>Chọn từng ngày hoặc thiết lập lịch định kỳ.</p>
            <div className="schedule-mode-toggle" role="radiogroup" aria-label="Chế độ chọn lịch học">
              <button type="button" role="radio" aria-checked={form.scheduleMode === "MANUAL"} onClick={() => setForm((current) => ({ ...current, scheduleMode: "MANUAL" }))}>Từng ngày</button>
              <button type="button" role="radio" aria-checked={form.scheduleMode === "RECURRING"} onClick={() => setForm((current) => ({ ...current, scheduleMode: "RECURRING" }))}>Định kỳ hàng tuần</button>
            </div>
            {form.scheduleMode === "MANUAL" ? <div className="manual-sessions">
              <ScheduleDatePicker sessions={form.manualSessions} onToggle={toggleManualDate} />
              <p className="manual-date-summary" role="status">{form.manualSessions.length ? `Đã chọn ${form.manualSessions.length} ngày. Nhập giờ riêng cho từng buổi bên dưới.` : "Chọn các ngày học trên lịch, sau đó nhập giờ cho từng buổi."}</p>
              {form.manualSessions.map((session, index) => <div className="manual-session manual-session--selected" key={session.date}>
                <div className="manual-session-date"><strong>{new Date(`${session.date}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</strong><small>Buổi {index + 1}</small></div>
                <label>Bắt đầu<input type="time" value={session.startTime} onChange={updateManualSession(index, "startTime")} required /></label>
                <label>Kết thúc<input type="time" value={session.endTime} onChange={updateManualSession(index, "endTime")} required /></label>
              </div>)}
            </div> : <div className="recurring-schedule">
              <div><span className="schedule-label">Học vào thứ</span><div className="weekday-picker">{weekdays.map((day) => <button type="button" key={day.value} className={form.weekdays.includes(day.value) ? "weekday-picker__selected" : ""} onClick={() => toggleWeekday(day.value)} aria-pressed={form.weekdays.includes(day.value)}>{day.label}</button>)}</div></div>
              <RecurringDateField form={form} onDate={chooseRecurringDate} />
              {form.weekdays.length > 0 && <div className="create-weekly-times"><div className="create-weekly-times__head"><span>Thứ</span><span>Bắt đầu</span><span>Kết thúc</span></div>{[...form.weekdays].sort((a, b) => a - b).map(day => <div className="create-weekly-times__row" key={day}><strong>{day === 7 ? "Chủ Nhật" : `Thứ ${day + 1}`}</strong>{["startTime", "endTime"].map(key => <label key={key}><span className="create-time-label">{key === "startTime" ? "Bắt đầu" : "Kết thúc"} {day === 7 ? "Chủ Nhật" : `Thứ ${day + 1}`}</span><input type="time" required value={form.weekdayTimes[day]?.[key] || ""} onChange={event => { const value = event.target.value; setForm(current => ({ ...current, weekdayTimes: { ...current.weekdayTimes, [day]: { ...current.weekdayTimes[day], [key]: value } } })); }} /></label>)}</div>)}</div>}
              {!!recurringSessionCount && <p className={recurringSessionCount > 500 ? "form-error" : "schedule-preview"} role="status">{recurringSessionCount > 500 ? "Khoảng ngày quá dài. Chỉ có thể tạo tối đa 500 buổi học." : `Sẽ tạo ${recurringSessionCount} buổi học theo lịch này.`}</p>}
            </div>}
          </fieldset>
          </section>
          <CreateClassRoster students={form.students} onChange={students => setForm(current => ({ ...current, students }))} teacherId={teacherId} scope={form.centerId || 'personal'} scopeLabel={form.centerId ? centers.find(center => center.id === form.centerId)?.name : 'Cá nhân'} disabled={submitting || !scopeLoaded} onPendingChange={setPendingStudent} />
          </fieldset>
        </form>
      </div>
      </main>
    </div>
  );
}

function RecurringDateField({ form, onDate }) {
  const [open, setOpen] = useState(null);
  const container = useRef(null);
  const dateTrigger = useRef(null);
  useEffect(() => {
    function dismiss(event) {
      if (event.type === "keydown") {
        if (event.key !== "Escape") return;
        if (open) dateTrigger.current?.focus();
        setOpen(null);
      } else if (!container.current?.contains(event.target)) setOpen(null);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, [open]);
  function chooseDate(date) {
    onDate(date);
  }
  return <div className="recurring-compact-fields recurring-compact-fields--date-only" ref={container}>
    <button ref={dateTrigger} type="button" className="recurring-range-trigger" aria-expanded={open === "date"} aria-controls="recurring-date-popover" onClick={() => setOpen(open === "date" ? null : "date")}><span>Khoảng ngày</span><strong>{form.startDate ? `${formatScheduleDate(form.startDate)} → ${form.endDate ? formatScheduleDate(form.endDate) : "…"}` : "Chọn ngày đầu → ngày cuối"}</strong></button>
    {open === "date" && <div id="recurring-date-popover" className="recurring-small-popover" role="group" aria-label="Chọn khoảng ngày học"><ScheduleDatePicker sessions={[]} onToggle={chooseDate} range={{ start: form.startDate, end: form.endDate }} /></div>}
  </div>;
}

function hasDuplicateStudent(students) {
  const seen = new Set();
  for (const student of students) {
    const identity = student.fullName.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
    if (seen.has(identity)) return true;
    seen.add(identity);
  }
  return false;
}
