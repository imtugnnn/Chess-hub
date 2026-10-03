export const HOUR_HEIGHT = 72;
export const MIN_EVENT_HEIGHT = 48;
export const MAX_CARD_HEIGHT = 104;

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

export function getCalendarHours(sessions) {
  return {
    start: Math.min(8, ...sessions.map((session) => Math.floor(timeToMinutes(session.startTime) / 60))),
    end: Math.max(21, ...sessions.map((session) => Math.ceil(timeToMinutes(session.endTime) / 60))),
  };
}

// Allocate lanes per connected group. Include the minimum visible card height so
// short, consecutive lessons remain separate click targets on the time grid.
export function layoutDaySessions(sessions) {
  const sorted = sessions.map((session) => {
    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);
    const durationHeight = (end - start) * HOUR_HEIGHT / 60;
    const height = Math.max(MIN_EVENT_HEIGHT, durationHeight);
    const cardHeight = Math.min(MAX_CARD_HEIGHT, height);
    // Capping the information card must not free a lane before the lesson ends.
    return { session, start, end, height, durationHeight, cardHeight, displayEnd: start + height * 60 / HOUR_HEIGHT };
  }).sort((first, second) => first.start - second.start || second.end - first.end || String(first.session.id).localeCompare(String(second.session.id)));
  const result = [];
  let group = [];
  let laneEnds = [];
  let groupEnd = -Infinity;
  function flush() {
    result.push(...group.map((item) => ({ ...item, laneCount: laneEnds.length })));
    group = [];
    laneEnds = [];
  }
  for (const item of sorted) {
    if (item.start >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.displayEnd;
    group.push({ ...item, lane });
    groupEnd = Math.max(...laneEnds);
  }
  flush();
  return result;
}

export function getAttendanceStatus(session, now) {
  if (session.studentCount > 0 && session.attendanceCount >= session.studentCount) return { type: "complete", label: "Đã điểm danh" };
  return now < new Date(`${session.date}T${session.startTime}`)
    ? { type: "upcoming", label: "Chưa đến giờ" }
    : { type: "pending", label: "Chưa điểm danh" };
}
