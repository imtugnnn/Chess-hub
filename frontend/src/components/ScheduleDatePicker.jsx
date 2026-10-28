import { useState } from "react";
const weekdays = [1,2,3,4,5,6,7].map(value => ({value,label:value === 7 ? "CN" : `T${value+1}`}));

export function ScheduleDatePicker({ sessions = [], onToggle, range, minDate }) {
  const [month, setMonth] = useState(() => { const date = (range?.start || sessions[0]?.date) ? new Date(`${range?.start || sessions[0].date}T12:00:00`) : new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const selected = new Set(sessions.map((session) => session.date));
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = localDateKey(new Date());
  return <div className="manual-date-picker">
    <div className="manual-date-picker__header"><button type="button" className="secondary-button" aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><strong aria-live="polite">{month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</strong><button type="button" className="secondary-button" aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div>
    <div className="manual-date-picker__grid" role="group" aria-label={range ? "Chọn ngày đầu và ngày cuối của lịch học" : "Chọn ngày học; bấm lại để bỏ chọn"}>
      {weekdays.map((day) => <span className="manual-date-picker__weekday" key={day.value}>{day.label}</span>)}
      {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`empty-${index}`} />)}
      {Array.from({ length: days }, (_, index) => { const date = localDateKey(new Date(month.getFullYear(), month.getMonth(), index + 1)); const inRange = range?.start && range?.end && date > range.start && date < range.end; const isSelected = range ? date === range.start || date === range.end : selected.has(date); return <button type="button" key={date} className={inRange ? "calendar-date--in-range" : undefined} aria-label={`${new Date(`${date}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${range && date === range.start ? ", ngày đầu" : ""}${range && date === range.end ? ", ngày cuối" : ""}`} disabled={Boolean(minDate && date < minDate)} aria-pressed={Boolean(isSelected || inRange)} aria-current={date === today ? "date" : undefined} onClick={() => onToggle(date)}>{index + 1}</button>; })}
    </div>
    <small className="manual-date-picker__hint">{range ? (!range.start || range.end ? "Chọn ngày đầu để bắt đầu một khoảng mới. Có thể chọn khoảng qua nhiều tháng." : "Chọn ngày cuối để hoàn tất khoảng ngày học.") : "Có thể chọn nhiều ngày ở các tháng khác nhau. Bấm lại ngày đã chọn để bỏ."}</small>
  </div>;
}

export function localDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function formatScheduleDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString("vi-VN"); }

