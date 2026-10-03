export function generateRecurringSessions({ weekdays, startDate, endDate, weekdayTimes = {} }) {
  if (!weekdays.length || !startDate || !endDate || startDate > endDate) return [];
  const result = [];
  const date = new Date(`${startDate}T12:00:00`);
  const last = new Date(`${endDate}T12:00:00`);
  for (; date <= last; date.setDate(date.getDate() + 1)) {
    if (!weekdays.includes(date.getDay() || 7)) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    result.push({ date: key, startTime: "", endTime: "", ...weekdayTimes[date.getDay() || 7] });
    if (result.length > 500) break;
  }
  return result;
}
