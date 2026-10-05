export function timeToMinutes(time) {
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return hours * 60 + minutes + seconds / 60;
}

export function formatSessionDuration(session) {
  const minutes = Math.ceil(timeToMinutes(session.endTime) - timeToMinutes(session.startTime));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}g${remainder ? ` ${String(remainder).padStart(2, "0")}p` : ""}` : `${remainder}p`;
}

// Short and overlapping lessons are regular cards ordered by their start time.
export function sortDaySessions(sessions) {
  return [...sessions].sort((first, second) => timeToMinutes(first.startTime) - timeToMinutes(second.startTime)
    || timeToMinutes(first.endTime) - timeToMinutes(second.endTime)
    || String(first.id).localeCompare(String(second.id)));
}

export function getAttendanceStatus(session, now) {
  if (session.studentCount > 0 && session.attendanceCount >= session.studentCount) return { type: "complete", label: "Đã điểm danh" };
  return now < new Date(`${session.date}T${session.startTime}`)
    ? { type: "upcoming", label: "Chưa đến giờ" }
    : { type: "pending", label: "Chưa điểm danh" };
}
