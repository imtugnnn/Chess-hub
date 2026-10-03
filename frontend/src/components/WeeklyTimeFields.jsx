import { useState } from "react";
import { TimeRangePicker } from "./TimeRangePicker";

export function WeeklyTimeFields({ weekdays, times, onChange }) {
  const [editing, setEditing] = useState(null);
  return <section className="recurring-session-times" aria-label="Giờ học theo thứ">
    <header><strong>Giờ học theo thứ</strong><p>Nhập giờ một lần cho mỗi thứ. Tất cả buổi học cùng thứ sẽ dùng khoảng giờ này.</p></header>
    <div>{[...weekdays].sort((a, b) => a - b).map((day) => {
      const time = times[day] || { startTime: "", endTime: "" };
      const label = day === 7 ? "Chủ Nhật" : `Thứ ${day + 1}`;
      return <div className="recurring-session-times__item" key={day}>
        <div className="recurring-session-times__row"><strong>{label}</strong><button type="button" className="secondary-button" aria-label={`Chọn giờ ${label}`} aria-expanded={editing === day} onClick={() => setEditing(editing === day ? null : day)}>{time.startTime || "--:--"} → {time.endTime || "--:--"}</button></div>
        {editing === day && <div className="recurring-session-times__editor"><TimeRangePicker startTime={time.startTime} endTime={time.endTime} onChange={(key, value) => onChange(day, { ...time, [key]: value })} onDone={() => setEditing(null)} /></div>}
      </div>;
    })}</div>
  </section>;
}
