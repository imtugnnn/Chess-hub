import test from "node:test";
import assert from "node:assert/strict";
import { attendanceChanged, canonicalClassUrl } from "./workspaceState.js";

test("attendance draft compares values independently of insertion order and clears when undone", () => {
  const saved = { a: "PRESENT", b: "LATE" };
  assert.equal(attendanceChanged({ b: "LATE", a: "PRESENT" }, saved), false);
  assert.equal(attendanceChanged({ ...saved, a: "ABSENT" }, saved), true);
  assert.equal(attendanceChanged({ a: "PRESENT" }, saved), true);
  assert.equal(attendanceChanged({ ...saved, c: "PRESENT" }, saved), true);
  assert.equal(attendanceChanged(saved, saved), false);
});

test("legacy class management links retain the task and selected session", () => {
  const path = "/classes/11111111-1111-1111-1111-111111111111";
  const origin = "https://chesshub.test";
  assert.equal(canonicalClassUrl(`${path}/manage?section=students`, origin), `${path}?tab=students&add=student`);
  assert.equal(canonicalClassUrl(`${path}/manage?section=schedule&sessionId=lesson#preview`, origin), `${path}?sessionId=lesson&tab=sessions&edit=schedule#preview`);
  assert.equal(canonicalClassUrl(`${path}/manage`, origin), `${path}?tab=general`);
  assert.equal(canonicalClassUrl(`${path}?tab=sessions&sessionId=lesson`, origin), `${path}?tab=sessions&sessionId=lesson`);
});
