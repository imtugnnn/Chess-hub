import { useEffect, useId, useRef, useState } from "react";
import { normalizeTime, timeRangeMinutes } from "./timeRange";

export function TimeRangePicker({ startTime, endTime, onChange, onDone }) {
  const feedbackId = useId();
  const [active, setActive] = useState("startTime");
  const [draft, setDraft] = useState({ startTime, endTime });
  const start = normalizeTime(draft.startTime);
  const end = normalizeTime(draft.endTime);
  const current = normalizeTime(draft[active]) || "00:00";
  const [hour, minute] = current.split(":");
  const duration = timeRangeMinutes(start, end);
  const malformed = Object.values(draft).some((value) => value && !normalizeTime(value));
  const error = malformed ? "Nhập giờ từ 00:00 đến 23:59." : duration !== null && duration <= 0 ? "Giờ kết thúc phải sau giờ bắt đầu." : "";
  function update(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    onChange(key, normalizeTime(value));
  }
  function choose(part, value) { update(active, part === "hour" ? `${value}:${minute}` : `${hour}:${value}`); }
  return <div className="time-range-picker">
    <strong>Giờ học · 24h</strong>
    <div className="time-range-picker__fields">
      {[["startTime", "Bắt đầu"], ["endTime", "Kết thúc"]].map(([key, label]) => <label key={key} className={active === key ? "time-range-picker__field--active" : ""}><span>{label}</span><input type="text" inputMode="numeric" autoComplete="off" placeholder="HH:mm" maxLength={5} value={draft[key]} onFocus={() => setActive(key)} onChange={(event) => update(key, event.target.value)} onBlur={() => { const value = normalizeTime(draft[key]); if (value) update(key, value); }} aria-invalid={Boolean(draft[key] && !normalizeTime(draft[key]))} aria-describedby={feedbackId} /></label>)}
    </div>
    <div className="time-range-picker__columns">
      <TimeColumn label="Giờ" count={24} value={hour} onChoose={(value) => choose("hour", value)} />
      <TimeColumn label="Phút" count={60} value={minute} onChoose={(value) => choose("minute", value)} />
    </div>
    <div className="time-range-picker__quick" role="group" aria-label="Chọn phút nhanh">{["00", "15", "30", "45"].map((value) => <button type="button" key={value} aria-label={`Chọn phút ${value}`} aria-pressed={minute === value} onClick={() => choose("minute", value)}>{value}</button>)}</div>
    <p id={feedbackId} className={error ? "time-range-picker__error" : "time-range-picker__feedback"} aria-live="polite">{error || (duration > 0 ? `Thời lượng: ${Math.floor(duration / 60) ? `${Math.floor(duration / 60)} giờ ` : ""}${duration % 60 ? `${duration % 60} phút` : ""}` : "Chọn mốc bắt đầu hoặc kết thúc để chỉnh giờ.")}</p>
    {onDone && <button type="button" className="secondary-button time-range-picker__done" disabled={!start || !end || duration <= 0} onClick={onDone}>Xong</button>}
  </div>;
}

function TimeColumn({ label, count, value, onChoose }) {
  const list = useRef(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (list.current) list.current.scrollTop = Math.max(0, Number(value) * 32 - 64);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [value]);
  function navigate(event) {
    const index = Number(event.target.dataset.value);
    let next;
    if (event.key === "ArrowDown") next = Math.min(count - 1, index + 1);
    else if (event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;
    event.preventDefault();
    onChoose(String(next).padStart(2, "0"));
    list.current.children[next]?.focus({ preventScroll: true });
  }
  return <div className="time-range-picker__column"><span>{label}</span><div ref={list} className="time-range-picker__list" role="group" aria-label={label} onKeyDown={navigate}>{Array.from({ length: count }, (_, index) => { const item = String(index).padStart(2, "0"); return <button key={item} type="button" data-value={index} aria-pressed={item === value} tabIndex={item === value ? 0 : -1} onClick={() => onChoose(item)}>{item}</button>; })}</div></div>;
}

