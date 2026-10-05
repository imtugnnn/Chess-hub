import { useEffect, useMemo, useRef, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { ScheduleDatePicker, localDateKey, formatScheduleDate } from "../components/ScheduleDatePicker";
import { WeeklyTimeFields } from "../components/WeeklyTimeFields";
import { generateRecurringSessions } from "../components/recurringSessions";
import { createTeacherClass, getStudentNameSuggestions } from "../services/api";

const emptyForm = {
  name: "", feePerSession: "", students: [emptyStudent()],
  scheduleMode: "MANUAL", manualSessions: [],
  weekdays: [], startDate: "", endDate: "", weekdayTimes: {},
};

const weekdays = [
  { value: 1, label: "T2" }, { value: 2, label: "T3" }, { value: 3, label: "T4" }, { value: 4, label: "T5" },
  { value: 5, label: "T6" }, { value: 6, label: "T7" }, { value: 7, label: "CN" },
];

export function CreateClassPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [form, setForm] = useState(() => {
    const date = new URLSearchParams(window.location.search).get("date");
    const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00`).getTime()) && localDateKey(new Date(`${date}T12:00:00`)) === date;
    return { ...emptyForm, students: [emptyStudent()], manualSessions: validDate ? [{ date, startTime: "", endTime: "" }] : [] };
  });
  const [nameSuggestions, setNameSuggestions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const suggestionTimer = useRef(null);
  const suggestionRequest = useRef(0);
  const recurringSessions = useMemo(() => generateRecurringSessions(form), [form]);
  const recurringSessionCount = recurringSessions.length;
  useEffect(() => () => { window.clearTimeout(suggestionTimer.current); suggestionRequest.current++; }, []);

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

  function addStudent() {
    window.clearTimeout(suggestionTimer.current); suggestionRequest.current++;
    const student = emptyStudent();
    setForm((current) => ({ ...current, students: [student, ...current.students] }));
    setNameSuggestions({});
    window.requestAnimationFrame(() => document.getElementById(`student-fields-${student.draftId}`)?.querySelector("input")?.focus({ preventScroll: true }));
  }
  function removeStudent(index) { window.clearTimeout(suggestionTimer.current); suggestionRequest.current++; setForm((current) => ({ ...current, students: current.students.filter((_, itemIndex) => itemIndex !== index) })); setNameSuggestions({}); }

  function scheduleNameSuggestions(index, value) {
    window.clearTimeout(suggestionTimer.current);
    const request = ++suggestionRequest.current;
    const query = value.trim();
    if (query.length < 2) { setNameSuggestions((current) => ({ ...current, [index]: [] })); return; }
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
    window.clearTimeout(suggestionTimer.current); suggestionRequest.current++;
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
    if (form.scheduleMode === "MANUAL" && !form.manualSessions.length) { setMessage("Hãy chọn ít nhất một ngày học trên lịch."); return; }
    if (form.scheduleMode === "RECURRING" && (!form.startDate || !form.endDate || !form.weekdays.length || !recurringSessionCount)) { setMessage("Hãy chọn ngày đầu, ngày cuối và thứ học để có ít nhất một buổi học trong khoảng ngày này."); return; }
    if (form.scheduleMode === "RECURRING" && form.weekdays.some((day) => { const time = form.weekdayTimes[day]; return !time?.startTime || !time?.endTime || time.endTime <= time.startTime; })) { setMessage("Hãy nhập đủ giờ bắt đầu và kết thúc hợp lệ cho mỗi thứ đã chọn."); return; }
    if (form.scheduleMode === "RECURRING" && recurringSessionCount > 500) { setMessage("Khoảng ngày quá dài. Chỉ có thể tạo tối đa 500 buổi học."); return; }
    const invalidTime = form.scheduleMode === "MANUAL" && form.manualSessions.some((session) => session.endTime <= session.startTime);
    if (invalidTime) { setMessage("Giờ kết thúc phải sau giờ bắt đầu của mỗi buổi học."); return; }
    const students = form.students.filter(hasStudentDetails);
    if (hasDuplicateStudent(students)) { setMessage("Một học sinh được nhập nhiều lần. Hãy kiểm tra họ tên, ngày sinh và số điện thoại phụ huynh."); return; }
    setMessage("");
    setSubmitting(true);
    try {
      const schedule = form.scheduleMode === "MANUAL"
        ? { mode: "MANUAL", sessions: form.manualSessions }
        : { mode: "RECURRING", weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, startTime: recurringSessions[0].startTime, endTime: recurringSessions[0].endTime, sessions: recurringSessions };
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
      <AppPageHeader section="Lớp học" breadcrumbs={[{ label: "Lớp học", href: "/homepage" }]} onNavigate={onNavigate} title="Tạo lớp mới" description="Thiết lập lớp học và lịch dạy đầu tiên." actions={<><button type="button" className="secondary-button" onClick={() => onNavigate("/homepage")} disabled={submitting}>← Quay lại</button><button className="primary-button create-class-submit" type="submit" form="create-class-form" disabled={submitting} aria-busy={submitting}>{submitting ? "Đang tạo lớp…" : "Tạo lớp"}</button></>} />
      <section className="create-class-card" aria-labelledby="create-class-title">
        <p className="eyebrow">Thiết lập lớp học</p>
        <h2 id="create-class-title">Tạo lớp mới</h2>
        <p className="create-class-lede">Nhập thông tin lớp và lịch học. Bạn có thể thêm học sinh ngay hoặc bổ sung sau.</p>
        {message && <p className="form-error create-class-message" role="alert">{message}</p>}
        <form id="create-class-form" className="create-class-form" onSubmit={submit}>
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
              {form.weekdays.length > 0 && <WeeklyTimeFields weekdays={form.weekdays} times={form.weekdayTimes} onChange={(day, time) => setForm((current) => ({ ...current, weekdayTimes: { ...current.weekdayTimes, [day]: time } }))} />}
              {!!recurringSessionCount && <p className={recurringSessionCount > 500 ? "form-error" : "schedule-preview"} role="status">{recurringSessionCount > 500 ? "Khoảng ngày quá dài. Chỉ có thể tạo tối đa 500 buổi học." : `✓ Sẽ tự tạo ${recurringSessionCount} buổi học theo lịch này.`}</p>}
            </div>}
          </fieldset>
          </section>
          <section className="create-class-column" aria-labelledby="student-information-title">
          <div className="form-section-heading"><span aria-hidden="true">♙</span><div><strong id="student-information-title">Thông tin học sinh · Không bắt buộc</strong><small>Có thể để trống và thêm học sinh sau khi tạo lớp.</small></div></div>
          <button type="button" className="add-session" onClick={addStudent} disabled={submitting}>＋ Thêm học sinh</button>
          <div className="student-drafts">{form.students.map((student, index) => <StudentDraft key={student.draftId} student={student} index={index} suggestions={nameSuggestions[index] ?? []} onChange={updateStudent} onSelect={selectNameSuggestion} onRemove={removeStudent} disabled={submitting} />)}</div>
          </section>
        </form>
      </section>
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

function StudentDraft({ student, index, suggestions, onChange, onSelect, onRemove, disabled }) {
  const [collapsed, setCollapsed] = useState(false);
  const fieldsRef = useRef(null);
  const editRef = useRef(null);
  const panelId = `student-fields-${student.draftId}`;

  function confirm() {
    const inputs = [...fieldsRef.current.querySelectorAll("input")];
    const invalid = inputs.find((input) => !input.value.trim() || !input.checkValidity());
    if (invalid) {
      if (!invalid.value.trim()) invalid.setCustomValidity("Vui lòng nhập thông tin này trước khi xác nhận học sinh.");
      invalid.reportValidity();
      invalid.setCustomValidity("");
      return;
    }
    setCollapsed(true);
    window.requestAnimationFrame(() => editRef.current?.focus({ preventScroll: true }));
  }

  function edit() {
    setCollapsed(false);
    window.requestAnimationFrame(() => fieldsRef.current.querySelector("input")?.focus({ preventScroll: true }));
  }

  return <fieldset className={`student-draft ${collapsed ? "student-draft--confirmed" : ""}`} disabled={disabled}>
    <legend>Học sinh {index + 1}</legend>
    {collapsed && <div className="student-draft__summary"><div><strong>{student.fullName}</strong><small>{formatBirthDate(student.birthDate)} · PH: {student.parentName} · {student.parentPhoneNumber}</small></div><div className="student-draft__actions"><button ref={editRef} type="button" className="secondary-button" aria-expanded={!collapsed} aria-controls={panelId} aria-label={`Chỉnh sửa học sinh ${student.fullName}`} onClick={edit}>Chỉnh sửa</button><button type="button" className="remove-student" onClick={() => onRemove(index)} aria-label={`Xóa học sinh ${student.fullName}`}>Xóa</button></div></div>}
    <div className={`student-draft__panel ${collapsed ? "student-draft__panel--collapsed" : ""}`} id={panelId} inert={collapsed} aria-hidden={collapsed}>
      <div className="student-draft__panel-inner"><div className="student-draft__inputs" ref={fieldsRef}>
        <label className="student-draft__name">Họ và tên học sinh<span className="student-name-autocomplete"><input value={student.fullName} onChange={onChange(index, "fullName")} placeholder="Nguyễn Minh Khang" autoComplete="off" required={hasStudentDetails(student)} />{suggestions.length > 0 && <span className="student-name-suggestions" role="listbox" aria-label="Gợi ý học sinh">{suggestions.map((suggestion) => <button type="button" role="option" key={suggestion.id} onClick={() => onSelect(index, suggestion)}><strong>{suggestion.fullName}</strong><small>{formatBirthDate(suggestion.birthDate)} · PH: {suggestion.parentName || "Chưa có tên"} · {suggestion.parentPhoneNumber || "Chưa có SĐT"}</small></button>)}</span>}</span></label>
        <div className="student-draft__fields"><label>Ngày sinh<input type="date" value={student.birthDate} onChange={onChange(index, "birthDate")} required={hasStudentDetails(student)} /></label><label>Họ và tên phụ huynh<input value={student.parentName} onChange={onChange(index, "parentName")} placeholder="Nguyễn Minh Anh" required={hasStudentDetails(student)} /></label><label>Số điện thoại phụ huynh<input type="tel" value={student.parentPhoneNumber} onChange={onChange(index, "parentPhoneNumber")} placeholder="0987 654 321" required={hasStudentDetails(student)} /></label></div>
        <button type="button" className="secondary-button student-confirm" onClick={confirm} aria-controls={panelId}>Xác nhận học sinh</button>
      </div></div>
    </div>
    {!collapsed && <button type="button" className="remove-student" onClick={() => onRemove(index)} aria-label={`Xóa học sinh ${student.fullName || index + 1}`}>Xóa học sinh</button>}
  </fieldset>;
}

function emptyStudent() { return { draftId: crypto.randomUUID(), fullName: "", birthDate: "", parentName: "", parentPhoneNumber: "" }; }
function hasStudentDetails(student) { return [student.fullName, student.birthDate, student.parentName, student.parentPhoneNumber].some((value) => value.trim() !== ""); }
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

