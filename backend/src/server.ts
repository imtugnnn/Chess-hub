import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import pg from "pg";
import { z, ZodError } from "zod";
import { evaluateCheckIn } from "./geofence.js";

type Role = "CENTER_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
type AuthUser = { sub: string; centerId: string; role: Role; fullName: string; email: string };

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

const env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:4173")
}).parse(process.env);

const db = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
const app = Fastify({ logger: true });

await app.register(cors, { origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) });
await app.register(jwt, { secret: env.JWT_SECRET });
await app.register(rateLimit, { global: false });

app.addHook("onRequest", async (request) => {
  if (request.url.startsWith("/api/v1/") && !request.url.startsWith("/api/v1/auth/")) {
    await request.jwtVerify();
  }
});

app.setErrorHandler((error, _request, reply) => {
  const httpError = error as { statusCode?: number; code?: string; message?: string };
  if (error instanceof ZodError) return reply.code(400).send({ code: "INVALID_INPUT", issues: error.issues });
  if (httpError.code === "23P01") return reply.code(409).send({ code: "TEACHER_SCHEDULE_CONFLICT" });
  if (httpError.code === "23514") return reply.code(400).send({ code: "BUSINESS_RULE_VIOLATION" });
  if (httpError.statusCode && httpError.statusCode < 500) return reply.code(httpError.statusCode).send({ code: httpError.code ?? "REQUEST_ERROR", message: httpError.message });
  app.log.error(error);
  return reply.code(500).send({ code: "INTERNAL_ERROR" });
});

function requireRole(request: FastifyRequest, reply: FastifyReply, roles: Role[]) {
  if (roles.includes(request.user.role)) return true;
  reply.code(403).send({ code: "FORBIDDEN" });
  return false;
}

const uuid = z.string().uuid();
const rangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date()
}).refine(({ from, to }) => to > from && to.getTime() - from.getTime() <= 62 * 86_400_000, {
  message: "Date range must be positive and no longer than 62 days"
});

async function canAccessStudent(user: AuthUser, studentId: string) {
  const { rowCount } = await db.query({
    text: `SELECT 1
      FROM students s
      WHERE s.id = $1 AND s.center_id = $2 AND (
        $3 = 'CENTER_ADMIN'
        OR ($3 = 'STUDENT' AND s.user_id = $4)
        OR ($3 = 'PARENT' AND EXISTS (
          SELECT 1 FROM guardian_students gs WHERE gs.student_id = s.id AND gs.guardian_user_id = $4
        ))
        OR ($3 = 'TEACHER' AND EXISTS (
          SELECT 1
          FROM enrollments e
          JOIN class_teachers ct ON ct.class_id = e.class_id
          JOIN teachers t ON t.id = ct.teacher_id
          WHERE e.student_id = s.id AND e.status = 'active' AND t.user_id = $4
        ))
      )`,
    values: [studentId, user.centerId, user.role, user.sub]
  });
  return rowCount === 1;
}

app.get("/health", async () => {
  await db.query("SELECT 1");
  return { status: "ok" };
});

app.post("/api/v1/auth/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
  const body = z.object({ email: z.email(), password: z.string().min(8).max(128) }).parse(request.body);
  const { rows } = await db.query<{
    id: string; center_id: string; email: string; full_name: string; role: Role;
  }>({
    text: `SELECT id, center_id, email, full_name, role
      FROM users
      WHERE lower(email) = lower($1)
        AND is_active = true
        AND password_hash = crypt($2, password_hash)`,
    values: [body.email, body.password]
  });
  const row = rows[0];
  if (!row) return reply.code(401).send({ code: "INVALID_CREDENTIALS" });

  const user: AuthUser = {
    sub: row.id,
    centerId: row.center_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role
  };
  return { access_token: app.jwt.sign(user, { expiresIn: "1h" }), user };
});

app.get("/api/v1/me", async (request) => ({ user: request.user }));

app.get("/api/v1/students/:studentId/schedule", async (request, reply) => {
  const { studentId } = z.object({ studentId: uuid }).parse(request.params);
  const range = rangeSchema.parse(request.query);
  if (!(await canAccessStudent(request.user, studentId))) return reply.code(403).send({ code: "FORBIDDEN" });

  const { rows } = await db.query({
    text: `SELECT s.id, s.starts_at, s.ends_at, s.status, s.topic, s.objectives, s.materials,
      c.id AS class_id, c.name AS class_name, l.name AS location_name, l.address,
      u.full_name AS teacher_name,
      a.status AS attendance_status
      FROM class_sessions s
      JOIN classes c ON c.id = s.class_id
      JOIN enrollments e ON e.class_id = c.id AND e.student_id = $1 AND e.status = 'active'
      JOIN locations l ON l.id = s.location_id
      JOIN teachers t ON t.id = s.teacher_id
      JOIN users u ON u.id = t.user_id
      LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
      WHERE s.starts_at >= $2 AND s.starts_at < $3
      ORDER BY s.starts_at`,
    values: [studentId, range.from.toISOString(), range.to.toISOString()]
  });
  return { view_range: range, sessions: rows };
});

const checkInSchema = z.object({
  student_id: uuid.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_m: z.number().positive().max(5000),
  captured_at: z.coerce.date()
});

app.post("/api/v1/sessions/:sessionId/check-in", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!requireRole(request, reply, ["STUDENT", "PARENT"])) return;
  const { sessionId } = z.object({ sessionId: uuid }).parse(request.params);
  const body = checkInSchema.parse(request.body);

  let studentId = body.student_id;
  if (request.user.role === "STUDENT") {
    const { rows } = await db.query<{ id: string }>("SELECT id FROM students WHERE user_id = $1", [request.user.sub]);
    studentId = rows[0]?.id;
  }
  if (!studentId || !(await canAccessStudent(request.user, studentId))) {
    return reply.code(403).send({ code: "STUDENT_NOT_ACCESSIBLE" });
  }

  const { rows } = await db.query<{
    starts_at: Date;
    ends_at: Date;
    status: string;
    checkin_open_minutes: number;
    checkin_close_minutes: number;
    late_after_minutes: number;
    checkin_radius_m: number;
    max_accuracy_m: number;
    distance_meters: number;
    within_geofence: boolean;
  }>({
    text: `SELECT s.starts_at, s.ends_at, s.status, s.checkin_open_minutes, s.checkin_close_minutes,
      s.late_after_minutes, l.checkin_radius_m, l.max_accuracy_m,
      ST_Distance(l.position, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography)::double precision AS distance_meters,
      ST_DWithin(l.position, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, l.checkin_radius_m) AS within_geofence
      FROM class_sessions s
      JOIN locations l ON l.id = s.location_id
      JOIN enrollments e ON e.class_id = s.class_id AND e.student_id = $4 AND e.status = 'active'
      WHERE s.id = $1`,
    values: [sessionId, body.latitude, body.longitude, studentId]
  });
  const session = rows[0];
  if (!session) return reply.code(404).send({ code: "SESSION_NOT_FOUND" });
  if (session.status === "cancelled") return reply.code(422).send({ code: "SESSION_CANCELLED" });

  const decision = evaluateCheckIn({
    now: new Date(),
    capturedAt: body.captured_at,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    distanceMeters: session.distance_meters,
    withinGeofence: session.within_geofence,
    accuracyMeters: body.accuracy_m,
    radiusMeters: session.checkin_radius_m,
    maxAccuracyMeters: session.max_accuracy_m,
    openMinutes: session.checkin_open_minutes,
    closeMinutes: session.checkin_close_minutes,
    lateAfterMinutes: session.late_after_minutes
  });
  if (!decision.allowed) {
    return reply.code(422).send({
      code: decision.reason,
      distance_m: Math.round(session.distance_meters),
      allowed_radius_m: session.checkin_radius_m
    });
  }

  const inserted = await db.query({
    text: `INSERT INTO attendance (
      session_id, student_id, status, source, checked_in_at, captured_at,
      device_position, accuracy_m, distance_m, updated_by
    ) VALUES (
      $1, $2, $3, 'self_checkin', now(), $4,
      ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography, $7, $8, $9
    ) ON CONFLICT (session_id, student_id) DO NOTHING
    RETURNING status, checked_in_at`,
    values: [sessionId, studentId, decision.status, body.captured_at, body.latitude, body.longitude, body.accuracy_m, session.distance_meters, request.user.sub]
  });
  if (!inserted.rowCount) return reply.code(409).send({ code: "ALREADY_CHECKED_IN" });

  return reply.code(201).send({
    attendance: inserted.rows[0],
    distance_m: Math.round(session.distance_meters),
    allowed_radius_m: session.checkin_radius_m
  });
});

app.get("/api/v1/teacher/sessions", async (request, reply) => {
  if (!requireRole(request, reply, ["TEACHER"])) return;
  const range = rangeSchema.parse(request.query);
  const { rows } = await db.query({
    text: `SELECT s.id, s.starts_at, s.ends_at, s.status, s.topic, s.objectives, s.materials,
      c.id AS class_id, c.name AS class_name, l.name AS location_name,
      count(e.student_id)::integer AS student_count,
      count(a.student_id)::integer AS marked_count
      FROM teachers t
      JOIN class_sessions s ON s.teacher_id = t.id
      JOIN classes c ON c.id = s.class_id
      JOIN locations l ON l.id = s.location_id
      LEFT JOIN enrollments e ON e.class_id = c.id AND e.status = 'active'
      LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = e.student_id
      WHERE t.user_id = $1 AND s.starts_at >= $2 AND s.starts_at < $3
      GROUP BY s.id, c.id, l.id
      ORDER BY s.starts_at`,
    values: [request.user.sub, range.from.toISOString(), range.to.toISOString()]
  });
  return { sessions: rows };
});

app.patch("/api/v1/teacher/sessions/:sessionId/content", async (request, reply) => {
  if (!requireRole(request, reply, ["TEACHER"])) return;
  const { sessionId } = z.object({ sessionId: uuid }).parse(request.params);
  const body = z.object({
    topic: z.string().trim().min(1).max(200),
    objectives: z.string().trim().max(2000).default(""),
    materials: z.array(z.string().trim().min(1).max(300)).max(20).default([])
  }).parse(request.body);
  const result = await db.query({
    text: `UPDATE class_sessions s
      SET topic = $2, objectives = $3, materials = $4::jsonb, updated_at = now()
      FROM teachers t
      WHERE s.id = $1 AND s.teacher_id = t.id AND t.user_id = $5
      RETURNING s.id, s.topic, s.objectives, s.materials, s.updated_at`,
    values: [sessionId, body.topic, body.objectives, JSON.stringify(body.materials), request.user.sub]
  });
  if (!result.rowCount) return reply.code(404).send({ code: "SESSION_NOT_FOUND" });
  return { session: result.rows[0] };
});

app.put("/api/v1/teacher/sessions/:sessionId/attendance", async (request, reply) => {
  if (!requireRole(request, reply, ["TEACHER"])) return;
  const { sessionId } = z.object({ sessionId: uuid }).parse(request.params);
  const body = z.object({ records: z.array(z.object({
    student_id: uuid,
    status: z.enum(["present", "late", "excused", "absent"]),
    note: z.string().trim().max(500).optional()
  })).min(1).max(80) }).parse(request.body);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const access = await client.query(`SELECT 1 FROM class_sessions s JOIN teachers t ON t.id = s.teacher_id WHERE s.id = $1 AND t.user_id = $2`, [sessionId, request.user.sub]);
    if (!access.rowCount) {
      await client.query("ROLLBACK");
      return reply.code(404).send({ code: "SESSION_NOT_FOUND" });
    }

    let updated = 0;
    for (const record of body.records) {
      const result = await client.query({
        text: `INSERT INTO attendance (session_id, student_id, status, source, note, updated_by)
          SELECT $1, $2, $3, 'teacher_manual', $4, $5
          FROM class_sessions s
          JOIN enrollments e ON e.class_id = s.class_id AND e.student_id = $2 AND e.status = 'active'
          WHERE s.id = $1
          ON CONFLICT (session_id, student_id) DO UPDATE SET
            status = EXCLUDED.status, source = 'teacher_manual', note = EXCLUDED.note,
            updated_by = EXCLUDED.updated_by, updated_at = now()
          RETURNING student_id`,
        values: [sessionId, record.student_id, record.status, record.note ?? null, request.user.sub]
      });
      updated += result.rowCount ?? 0;
    }
    if (updated !== body.records.length) {
      await client.query("ROLLBACK");
      return reply.code(400).send({ code: "STUDENT_NOT_ENROLLED" });
    }
    await client.query("COMMIT");
    return { updated };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const classSchema = z.object({
  name: z.string().trim().min(2).max(150),
  level: z.string().trim().max(80).optional(),
  tuition_per_session: z.number().int().min(0).max(10_000_000),
  teacher_ids: z.array(uuid).min(1).max(10),
  student_ids: z.array(uuid).max(100).default([])
});

app.post("/api/v1/center/classes", async (request, reply) => {
  if (!requireRole(request, reply, ["CENTER_ADMIN"])) return;
  const body = classSchema.parse(request.body);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const teachers = await client.query<{ id: string }>("SELECT id FROM teachers WHERE center_id = $1 AND id = ANY($2::uuid[])", [request.user.centerId, body.teacher_ids]);
    if (teachers.rowCount !== body.teacher_ids.length) {
      await client.query("ROLLBACK");
      return reply.code(400).send({ code: "INVALID_TEACHER" });
    }
    if (body.student_ids.length) {
      const students = await client.query("SELECT id FROM students WHERE center_id = $1 AND id = ANY($2::uuid[])", [request.user.centerId, body.student_ids]);
      if (students.rowCount !== body.student_ids.length) {
        await client.query("ROLLBACK");
        return reply.code(400).send({ code: "INVALID_STUDENT" });
      }
    }
    const created = await client.query<{ id: string }>({
      text: "INSERT INTO classes (center_id, name, level, tuition_per_session, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id",
      values: [request.user.centerId, body.name, body.level ?? null, body.tuition_per_session]
    });
    const classId = created.rows[0]!.id;
    await client.query("INSERT INTO class_teachers (class_id, teacher_id) SELECT $1, unnest($2::uuid[])", [classId, body.teacher_ids]);
    if (body.student_ids.length) await client.query("INSERT INTO enrollments (class_id, student_id) SELECT $1, unnest($2::uuid[])", [classId, body.student_ids]);
    await client.query("COMMIT");
    return reply.code(201).send({ id: classId });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const sessionWriteSchema = z.object({
  class_id: uuid.optional(),
  teacher_id: uuid,
  location_id: uuid,
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
  topic: z.string().trim().max(200).default(""),
  objectives: z.string().trim().max(2000).default(""),
  materials: z.array(z.string().trim().min(1).max(300)).max(20).default([])
}).refine(({ starts_at, ends_at }) => ends_at > starts_at, { message: "ends_at must be after starts_at" });

app.post("/api/v1/center/sessions", async (request, reply) => {
  if (!requireRole(request, reply, ["CENTER_ADMIN"])) return;
  const body = sessionWriteSchema.extend({ class_id: uuid }).parse(request.body);
  const result = await db.query({
    text: `INSERT INTO class_sessions (class_id, teacher_id, location_id, starts_at, ends_at, status, topic, objectives, materials)
      SELECT c.id, t.id, l.id, $5, $6, $7, $8, $9, $10::jsonb
      FROM classes c
      JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = $2
      JOIN teachers t ON t.id = ct.teacher_id AND t.center_id = c.center_id
      JOIN locations l ON l.id = $3 AND l.center_id = c.center_id
      WHERE c.id = $1 AND c.center_id = $4
      RETURNING id, starts_at, ends_at`,
    values: [body.class_id, body.teacher_id, body.location_id, request.user.centerId, body.starts_at.toISOString(), body.ends_at.toISOString(), body.status, body.topic, body.objectives, JSON.stringify(body.materials)]
  });
  if (!result.rowCount) return reply.code(400).send({ code: "INVALID_CLASS_TEACHER_OR_LOCATION" });
  return reply.code(201).send({ session: result.rows[0] });
});

app.put("/api/v1/center/sessions/:sessionId", async (request, reply) => {
  if (!requireRole(request, reply, ["CENTER_ADMIN"])) return;
  const { sessionId } = z.object({ sessionId: uuid }).parse(request.params);
  const body = sessionWriteSchema.omit({ class_id: true }).parse(request.body);
  const result = await db.query({
    text: `UPDATE class_sessions s SET
      teacher_id = $2, location_id = $3, starts_at = $4, ends_at = $5,
      status = $6, topic = $7, objectives = $8, materials = $9::jsonb, updated_at = now()
      FROM classes c
      WHERE s.id = $1 AND c.id = s.class_id AND c.center_id = $10
        AND EXISTS (SELECT 1 FROM class_teachers ct JOIN teachers t ON t.id = ct.teacher_id WHERE ct.class_id = c.id AND ct.teacher_id = $2 AND t.center_id = c.center_id)
        AND EXISTS (SELECT 1 FROM locations l WHERE l.id = $3 AND l.center_id = c.center_id)
      RETURNING s.id, s.starts_at, s.ends_at, s.status, s.topic`,
    values: [sessionId, body.teacher_id, body.location_id, body.starts_at.toISOString(), body.ends_at.toISOString(), body.status, body.topic, body.objectives, JSON.stringify(body.materials), request.user.centerId]
  });
  if (!result.rowCount) return reply.code(404).send({ code: "SESSION_NOT_FOUND_OR_INVALID_ASSIGNMENT" });
  return { session: result.rows[0] };
});

app.get("/api/v1/center/calendar", async (request, reply) => {
  if (!requireRole(request, reply, ["CENTER_ADMIN"])) return;
  const range = rangeSchema.parse(request.query);
  const { rows } = await db.query({
    text: `SELECT s.id, s.starts_at, s.ends_at, s.status, s.topic,
      c.id AS class_id, c.name AS class_name, u.full_name AS teacher_name,
      l.name AS location_name, count(e.student_id)::integer AS student_count
      FROM class_sessions s
      JOIN classes c ON c.id = s.class_id
      JOIN teachers t ON t.id = s.teacher_id
      JOIN users u ON u.id = t.user_id
      JOIN locations l ON l.id = s.location_id
      LEFT JOIN enrollments e ON e.class_id = c.id AND e.status = 'active'
      WHERE c.center_id = $1 AND s.starts_at >= $2 AND s.starts_at < $3
      GROUP BY s.id, c.id, u.id, l.id
      ORDER BY s.starts_at`,
    values: [request.user.centerId, range.from.toISOString(), range.to.toISOString()]
  });
  return { sessions: rows };
});

const address = await app.listen({ port: env.PORT, host: "0.0.0.0" });
app.log.info(`ChessHub API listening at ${address}`);

const shutdown = async () => {
  await app.close();
  await db.end();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
