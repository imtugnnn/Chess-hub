export function normalizeTime(value) {
  const text = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(text) || /^(\d{2})(\d{2})$/.exec(text);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function timeRangeMinutes(start, end) {
  if (!normalizeTime(start) || !normalizeTime(end)) return null;
  const minutes = (value) => { const [hour, minute] = normalizeTime(value).split(":").map(Number); return hour * 60 + minute; };
  return minutes(end) - minutes(start);
}
