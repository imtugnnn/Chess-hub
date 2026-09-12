import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCheckIn } from "./geofence.js";

const startsAt = new Date("2026-09-14T11:00:00.000Z");
const endsAt = new Date("2026-09-14T12:30:00.000Z");

test("accepts an accurate location inside 30m", () => {
  assert.deepEqual(evaluateCheckIn({
    now: startsAt,
    capturedAt: startsAt,
    startsAt,
    endsAt,
    distanceMeters: 29.9,
    accuracyMeters: 10
  }), { allowed: true, status: "present" });
});

test("rejects a location outside the geofence", () => {
  assert.deepEqual(evaluateCheckIn({
    now: startsAt,
    capturedAt: startsAt,
    startsAt,
    endsAt,
    distanceMeters: 30.1,
    accuracyMeters: 20
  }), { allowed: false, reason: "OUTSIDE_GEOFENCE" });
  assert.deepEqual(evaluateCheckIn({
    now: startsAt,
    capturedAt: startsAt,
    startsAt,
    endsAt,
    distanceMeters: 10,
    withinGeofence: false,
    accuracyMeters: 20
  }), { allowed: false, reason: "OUTSIDE_GEOFENCE" });
});

test("rejects inaccurate and stale device locations", () => {
  assert.equal(evaluateCheckIn({ now: startsAt, capturedAt: startsAt, startsAt, endsAt, distanceMeters: 10, accuracyMeters: 31 }).allowed, false);
  assert.equal(evaluateCheckIn({ now: startsAt, capturedAt: new Date(startsAt.getTime() - 121_000), startsAt, endsAt, distanceMeters: 10, accuracyMeters: 10 }).allowed, false);
});

test("marks arrival after 15 minutes as late", () => {
  const now = new Date(startsAt.getTime() + 16 * 60_000);
  assert.deepEqual(evaluateCheckIn({ now, capturedAt: now, startsAt, endsAt, distanceMeters: 10, accuracyMeters: 10 }), { allowed: true, status: "late" });
});
