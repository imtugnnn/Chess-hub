import { useState } from "react";
import { MaterialDialog } from "./materials/MaterialDialog";
import { TimeRangePicker } from "./TimeRangePicker";
import { timeRangeMinutes } from "./timeRange";
import { rescheduleClassSession } from "../services/api";
import { vietnamToday, formatSlot } from "./ClassScheduleEditor";
import "./classSchedule.css";

export function SessionScheduleDialog({ teacherId, classId, session, onClose, onSaved }) {
  const [slot, setSlot] = useState({ date: session.date, startTime: session.startTime.slice(0, 5), endTime: session.endTime.slice(0, 5) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const validTime = (timeRangeMinutes(slot.startTime, slot.endTime) ?? 0) > 0;
  async function save(event) {
    event.preventDefault();
    if (!validTime) { setError("Nhập giờ hợp lệ từ 00:00 đến 23:59; giờ kết thúc phải sau giờ bắt đầu."); return; }
    setBusy(true); setError("");
    try { await rescheduleClassSession(teacherId, classId, session.id, slot); await onSaved(); window.dispatchEvent(new Event("classes-updated")); onClose(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <MaterialDialog title="Sửa lịch buổi học" className="class-workspace-dialog" onClose={onClose} busy={busy}>
    <p className="schedule-dialog-note">Lịch hiện tại: {formatSlot(session)}. Chỉ buổi này được thay đổi; bài giảng và giải đấu được giữ nguyên.</p>
    <form className="schedule-dialog-form" onSubmit={save}>
      <fieldset disabled={busy}><div className="schedule-fields">
        <label className="schedule-date">Ngày học<input type="date" min={vietnamToday()} required value={slot.date} onChange={(event) => setSlot((current) => ({ ...current, date: event.target.value }))} data-dialog-autofocus /></label>
        <div className="schedule-date"><TimeRangePicker startTime={slot.startTime} endTime={slot.endTime} onChange={(key, value) => { setSlot((current) => ({ ...current, [key]: value })); setError(""); }} /></div>
      </div></fieldset>
      {error && <p className="management-message" role="alert">{error}</p>}
      <div className="schedule-actions"><button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="primary-button" type="submit" disabled={busy || !validTime}>{busy ? "Đang lưu…" : "Lưu lịch"}</button></div>
    </form>
  </MaterialDialog>;
}
