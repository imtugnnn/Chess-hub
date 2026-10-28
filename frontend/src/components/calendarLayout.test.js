import test from "node:test";
import assert from "node:assert/strict";
import { formatSessionDuration, getAttendanceStatus, sortDaySessions } from "./calendarLayout.js";

const lesson = (id, startTime, endTime) => ({ id, startTime, endTime });
test("daily lessons sort by start time without changing the source array", () => {
  const sessions = [lesson("evening", "17:00", "18:30"), lesson("early", "01:04", "01:59"), lesson("morning", "09:00", "10:00")];
  assert.deepEqual(sortDaySessions(sessions).map(({ id }) => id), ["early", "morning", "evening"]);
  assert.equal(sessions[0].id, "evening");
  assert.deepEqual(sortDaySessions([]), []);
});
test("overlapping and short lessons retain chronological order with stable ties", () => {
  const sessions = [lesson("b", "09:00:30", "09:10"), lesson("c", "09:00", "11:00"), lesson("a", "09:00", "09:10"), lesson("d", "09:00", "09:10")];
  assert.deepEqual(sortDaySessions(sessions).map(({ id }) => id), ["a", "d", "c", "b"]);
});
test("duration is available for short, exact-hour, and long lessons", () => {
  assert.equal(formatSessionDuration(lesson("short", "01:04", "01:59")), "55p");
  assert.equal(formatSessionDuration(lesson("longer", "01:03", "03:02")), "1g 59p");
  assert.equal(formatSessionDuration(lesson("hour", "09:00", "10:00")), "1g");
  assert.equal(formatSessionDuration(lesson("seconds", "09:00:00", "09:00:30")), "1p");
  assert.equal(formatSessionDuration(lesson("long", "12:24", "23:29")), "11g 05p");
});
test("attendance changes at the start time, and zero students is not complete", () => {
  const session = { date: "2026-10-04", startTime: "09:00", studentCount: 2, attendanceCount: 1 };
  assert.equal(getAttendanceStatus(session, new Date("2026-10-04T08:59:00")).type, "upcoming");
  assert.equal(getAttendanceStatus(session, new Date("2026-10-04T09:00:00")).type, "pending");
  assert.equal(getAttendanceStatus({ ...session, attendanceCount: 2 }, new Date("2026-10-04T09:00:00")).type, "complete");
  assert.equal(getAttendanceStatus({ ...session, studentCount: 0, attendanceCount: 0 }, new Date("2026-10-04T09:00:00")).type, "pending");
});
