export type CheckInStatus = "present" | "late";

export type CheckInDecision =
  | { allowed: true; status: CheckInStatus }
  | { allowed: false; reason: "LOCATION_STALE" | "LOCATION_INACCURATE" | "OUTSIDE_GEOFENCE" | "TOO_EARLY" | "TOO_LATE" };

type CheckInInput = {
  now: Date;
  capturedAt: Date;
  startsAt: Date;
  endsAt: Date;
  distanceMeters: number;
  withinGeofence?: boolean;
  accuracyMeters: number;
  radiusMeters?: number;
  maxAccuracyMeters?: number;
  locationFreshnessSeconds?: number;
  openMinutes?: number;
  closeMinutes?: number;
  lateAfterMinutes?: number;
};

export function evaluateCheckIn({
  now,
  capturedAt,
  startsAt,
  endsAt,
  distanceMeters,
  withinGeofence,
  accuracyMeters,
  radiusMeters = 30,
  maxAccuracyMeters = 30,
  locationFreshnessSeconds = 120,
  openMinutes = 30,
  closeMinutes = 45,
  lateAfterMinutes = 15
}: CheckInInput): CheckInDecision {
  if (Math.abs(now.getTime() - capturedAt.getTime()) > locationFreshnessSeconds * 1000) {
    return { allowed: false, reason: "LOCATION_STALE" };
  }
  if (accuracyMeters > maxAccuracyMeters) return { allowed: false, reason: "LOCATION_INACCURATE" };
  if (withinGeofence === false || distanceMeters > radiusMeters) return { allowed: false, reason: "OUTSIDE_GEOFENCE" };
  if (now.getTime() < startsAt.getTime() - openMinutes * 60_000) return { allowed: false, reason: "TOO_EARLY" };
  if (now.getTime() > endsAt.getTime() + closeMinutes * 60_000) return { allowed: false, reason: "TOO_LATE" };

  return {
    allowed: true,
    status: now.getTime() > startsAt.getTime() + lateAfterMinutes * 60_000 ? "late" : "present"
  };
}
