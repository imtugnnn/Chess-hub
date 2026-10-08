import { useEffect, useState } from "react";
import { ScheduleDatePicker, formatScheduleDate } from "./ScheduleDatePicker";
import { TimeRangePicker } from "./TimeRangePicker";
import { applyClassSchedule, previewClassSchedule } from "../services/api";
import "./classSchedule.css";

export const vietnamToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
export const sessionEditable = (session, hasAttendance = session?.hasAttendance) => Boolean(session && !hasAttendance && new Date(`${session.date}T${session.startTime}+07:00`).getTime() > Date.now());
const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const formatSlot = (slot) => `${slot.date.split("-").reverse().join("/")} · ${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)}`;

function initialSchedule(sessions) {
  const future = [...sessions].sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).filter((session) => new Date(`${session.date}T${session.startTime}+07:00`).getTime() > Date.now());
  const fallbackEnd = new Date(`${vietnamToday()}T12:00:00Z`); fallbackEnd.setUTCDate(fallbackEnd.getUTCDate() + 90);
  const days = [...new Set(future.map((session) => new Date(`${session.date}T12:00:00Z`).getUTCDay() || 7))];
  return { mode: "RECURRING", startDate: future[0]?.date ?? vietnamToday(), endDate: future.at(-1)?.date ?? fallbackEnd.toISOString().slice(0, 10), weekdays: days.length ? days : [2, 4], startTime: future[0]?.startTime.slice(0, 5) ?? "17:30", endTime: future[0]?.endTime.slice(0, 5) ?? "19:00" };
}

export function ClassScheduleEditor({ teacherId, classId, sessions, onSaved, onDraftChange }) {
  const [schedule, setSchedule] = useState(() => initialSchedule(sessions));
  const [savedSchedule, setSavedSchedule] = useState(schedule);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingTime, setEditingTime] = useState(false);
  useEffect(() => {
    const normalized = (value) => JSON.stringify({ ...value, weekdays: [...value.weekdays].sort() });
    onDraftChange?.({ dirty: normalized(schedule) !== normalized(savedSchedule), busy, label: "lịch học",
      discard: () => { setSchedule(savedSchedule); setPreview(null); setMessage(""); } });
    return () => onDraftChange?.(null);
  }, [schedule, savedSchedule, busy, onDraftChange]);
  function change(key, value) { setSchedule((current) => ({ ...current, [key]: value })); setPreview(null); setMessage(""); }
  async function showPreview(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setPreview(null);
    try { setPreview(await previewClassSchedule(teacherId, classId, schedule)); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function apply() {
    setBusy(true); setMessage("");
    try {
      await applyClassSchedule(teacherId, classId, { ...schedule, previewToken: preview.token });
      setSavedSchedule(schedule);
      setPreview(null); setMessage("Đã cập nhật lịch học.");
      window.dispatchEvent(new Event("classes-updated"));
      try { await onSaved(); } catch { setMessage("Đã lưu lịch học. Chưa tải lại được danh sách; hãy tải lại trang để cập nhật."); }
    } catch (error) { setMessage(error.message); if (error.status === 409) setPreview(null); }
    finally { setBusy(false); }
  }
  return <section className="management-card schedule-editor">
    <div><h2>Đổi lịch học hàng loạt</h2><p>Chọn lịch lặp trong khoảng áp dụng. Các buổi đã bắt đầu, có điểm danh, bài giảng, giải đấu hoặc đã sửa riêng được giữ nguyên.</p></div>
    <form onSubmit={showPreview}>
      <fieldset disabled={busy}>
        <div className="bulk-schedule-layout">
          <section className="bulk-schedule-calendar" aria-label="Khoảng ngày áp dụng">
            <h3>Khoảng ngày áp dụng</h3>
            <p>{schedule.startDate ? formatScheduleDate(schedule.startDate) : "Chọn ngày đầu"} → {schedule.endDate ? formatScheduleDate(schedule.endDate) : "Chọn ngày cuối"}</p>
            <ScheduleDatePicker range={{start:schedule.startDate,end:schedule.endDate}} minDate={vietnamToday()} onToggle={(date) => {
              setSchedule(current => !current.startDate || current.endDate ? {...current,startDate:date,endDate:""} : {...current,startDate:date < current.startDate ? date : current.startDate,endDate:date < current.startDate ? current.startDate : date});
              setPreview(null); setMessage("");
            }} />
          </section>
          <section className="bulk-schedule-options" aria-label="Lịch lặp hàng tuần">
            <fieldset className="schedule-weekdays"><legend>Học vào thứ</legend><div className="weekday-picker">{weekdays.map((label,index) => <button type="button" key={label} className={schedule.weekdays.includes(index+1) ? "weekday-picker__selected" : ""} aria-pressed={schedule.weekdays.includes(index+1)} onClick={() => change("weekdays", schedule.weekdays.includes(index+1) ? schedule.weekdays.filter(day => day !== index+1) : [...schedule.weekdays,index+1])}>{label}</button>)}</div></fieldset>
            <h3>Giờ học</h3><p>Áp dụng cùng khoảng giờ cho các thứ đã chọn.</p>
            <button type="button" className="secondary-button" aria-expanded={editingTime} aria-controls="bulk-schedule-time" onClick={() => setEditingTime(value => !value)}>{schedule.startTime || "--:--"} → {schedule.endTime || "--:--"}</button>
            {editingTime && <div id="bulk-schedule-time" className="bulk-schedule-time"><TimeRangePicker startTime={schedule.startTime} endTime={schedule.endTime} onChange={change} onDone={() => setEditingTime(false)} /></div>}
          </section>
        </div>
        <button type="submit" className="secondary-button" disabled={!schedule.weekdays.length || !schedule.startDate || !schedule.endDate || !schedule.startTime || !schedule.endTime || schedule.endTime <= schedule.startTime}>{busy ? "Đang xử lý…" : "Xem trước thay đổi"}</button>
      </fieldset>
    </form>
    {message && <p role={message.startsWith("Đã") ? "status" : "alert"} className={`management-message ${message.startsWith("Đã") ? "management-message--success" : ""}`}>{message}</p>}
    {preview && <div className="class-schedule-preview" aria-live="polite">
      <h3>Thay đổi trong khoảng áp dụng</h3>
      <p>Các buổi ngoài khoảng ngày đã chọn được giữ nguyên.</p>
      <div className="bulk-schedule-preview-counts">{[{title:"Giữ nguyên",rows:preview.kept},{title:"Bỏ khỏi lịch",rows:preview.removed},{title:"Thêm mới",rows:preview.added}].map(group => <span key={group.title}>{group.title} <strong>{group.rows.length} buổi</strong></span>)}</div>
      <div className="workspace-table-scroll"><table className="workspace-table bulk-schedule-table"><thead><tr><th>Ngày học</th><th>Giờ học</th><th>Thay đổi</th><th>Lý do</th></tr></thead><tbody>{[{title:"Giữ nguyên",tone:"kept",rows:preview.kept},{title:"Bỏ khỏi lịch",tone:"removed",rows:preview.removed},{title:"Thêm mới",tone:"added",rows:preview.added}].flatMap(group => group.rows.map(slot => ({...slot,change:group.title,tone:group.tone}))).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.change.localeCompare(b.change)).map(slot => <tr key={`${slot.tone}-${slot.id ?? slot.date+slot.startTime}`}><td data-label="Ngày học">{formatScheduleDate(slot.date)}</td><td data-label="Giờ học">{slot.startTime.slice(0,5)} – {slot.endTime.slice(0,5)}</td><td data-label="Thay đổi"><span className={`schedule-change schedule-change--${slot.tone}`}>{slot.change}</span></td><td data-label="Lý do">{slot.reason || "—"}</td></tr>)}</tbody></table></div>
      <div className="schedule-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => setPreview(null)}>Hủy</button><button className="primary-button" type="button" disabled={busy || !(preview.added.length || preview.removed.length)} onClick={apply}>{busy ? "Đang lưu…" : "Xác nhận đổi lịch"}</button></div>
    </div>}
  </section>;
}
