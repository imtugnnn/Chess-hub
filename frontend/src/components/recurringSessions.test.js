import test from "node:test";
import assert from "node:assert/strict";
import { generateRecurringSessions } from "./recurringSessions.js";

const form = { weekdays: [3, 4], startDate: "2026-10-05", endDate: "2026-10-15", weekdayTimes: { 3: { startTime: "17:00", endTime: "18:30" }, 4: { startTime: "19:00", endTime: "20:00" } } };
test("each week's sessions use the time assigned to their weekday", () => {
  const sessions = generateRecurringSessions(form);
  assert.deepEqual(sessions.map((session) => session.date), ["2026-10-07", "2026-10-08", "2026-10-14", "2026-10-15"]);
  assert.equal(sessions[1].startTime, "19:00");
  assert.equal(sessions[2].startTime, "17:00");
  const changed = generateRecurringSessions({ ...form, weekdayTimes: { ...form.weekdayTimes, 3: { startTime: "16:00", endTime: "17:00" } } });
  assert.equal(changed[0].startTime, "16:00");
  assert.equal(changed[2].startTime, "16:00");
  assert.equal(changed[1].startTime, "19:00");
});
test("range and weekday changes regenerate sessions using the remaining weekday times", () => {
  const sessions = generateRecurringSessions({ ...form, startDate: "2026-10-12" });
  assert.equal(sessions.length, 2);
  assert.equal(generateRecurringSessions({ ...form, weekdays: [4] }).length, 2);
  assert.ok(generateRecurringSessions({ ...form, weekdays: [4] }).every((session) => session.startTime === "19:00"));
  assert.equal(generateRecurringSessions({ ...form, endDate: "2026-10-01" }).length, 0);
});
test("supports cross-month Sunday sessions and signals the 500-session limit", () => {
  assert.deepEqual(generateRecurringSessions({ ...form, weekdays: [7], startDate: "2026-10-30", endDate: "2026-11-08" }).map((session) => session.date), ["2026-11-01", "2026-11-08"]);
  assert.equal(generateRecurringSessions({ ...form, weekdays: [1, 2, 3, 4, 5, 6, 7], endDate: "2030-01-01" }).length, 501);
});
