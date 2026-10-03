import test from "node:test";
import assert from "node:assert/strict";
import { formatSessionDuration, getAttendanceStatus, getCalendarHours, HOUR_HEIGHT, layoutDaySessions, MAX_CARD_HEIGHT } from "./calendarLayout.js";

const lesson = (id, startTime, endTime) => ({ id, startTime, endTime });
test("lessons use their start time and duration; input order is preserved", () => {
  const sessions = [lesson("evening", "17:00", "18:30"), lesson("morning", "09:00", "10:00")];
  const items = layoutDaySessions(sessions);
  assert.equal(items[0].start, 540);
  assert.equal(items[1].start - items[0].start, 8 * 60);
  assert.equal(items[1].height, HOUR_HEIGHT * 1.5);
  assert.equal(items[0].laneCount, 1);
  assert.equal(sessions[0].id, "evening");
});
test("overlapping lessons share lanes without covering one another", () => {
  const items = layoutDaySessions([lesson("a", "09:00", "11:00"), lesson("b", "09:30", "10:00"), lesson("c", "10:15", "10:45"), lesson("d", "12:00", "13:00")]);
  assert.deepEqual(items.map(({ lane, laneCount }) => [lane, laneCount]), [[0, 2], [1, 2], [1, 2], [0, 1]]);
});
test("capped long cards keep their real end time and reserve the lane for later overlaps", () => {
  const long = lesson("long", "12:24", "23:29");
  const items = layoutDaySessions([long, lesson("later", "17:00", "18:00"), lesson("after", "23:29", "23:59")]);
  assert.equal(items[0].cardHeight, MAX_CARD_HEIGHT);
  assert.equal(items[0].durationHeight, 665 * HOUR_HEIGHT / 60);
  assert.equal(items[0].displayEnd, 23 * 60 + 29);
  assert.notEqual(items[0].lane, items[1].lane);
  assert.equal(items[2].laneCount, 1);
  assert.equal(formatSessionDuration(long), "11g 05p");
});
test("adjacent short lessons retain distinct click targets", () => {
  const items = layoutDaySessions([lesson("a", "09:00", "09:10"), lesson("b", "09:10", "09:20"), lesson("c", "11:00", "11:30")]);
  assert.ok(items[0].height >= 44);
  assert.notEqual(items[0].lane, items[1].lane);
  assert.equal(items[2].laneCount, 1);
});
test("calendar expands for early and late lessons including seconds", () => {
  assert.deepEqual(getCalendarHours([]), { start: 8, end: 21 });
  assert.deepEqual(getCalendarHours([lesson("a", "06:45:00", "23:00:30")]), { start: 6, end: 24 });
  assert.deepEqual(layoutDaySessions([]), []);
});
test("attendance changes at the start time, and zero students is not complete", () => {
  const session = { date: "2026-10-04", startTime: "09:00", studentCount: 2, attendanceCount: 1 };
  assert.equal(getAttendanceStatus(session, new Date("2026-10-04T08:59:00")).type, "upcoming");
  assert.equal(getAttendanceStatus(session, new Date("2026-10-04T09:00:00")).type, "pending");
  assert.equal(getAttendanceStatus({ ...session, attendanceCount: 2 }, new Date("2026-10-04T09:00:00")).type, "complete");
  assert.equal(getAttendanceStatus({ ...session, studentCount: 0, attendanceCount: 0 }, new Date("2026-10-04T09:00:00")).type, "pending");
});
