// Explicit, isolated browser QA fixture. No API traffic leaves this page and
// this entry point is never imported by the production application.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../../src/App";
import "../../src/fonts.css";
import "../../src/styles.css";
import "../../src/ui-refresh.css";
import "../../src/class-workspace.css";

const id = "11111111-1111-1111-1111-111111111111";
const options = new URLSearchParams(location.search);
const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const later = new Date(`${date}T12:00:00Z`); later.setUTCDate(later.getUTCDate() + 2);
const classroom = { id, name: "Cờ vua căn bản", schedule: "Thứ Ba, Thứ Năm · 17:30 – 19:00", feePerSession: 150000, studentCount: 3 };
const students = ["Nguyễn Minh Anh", "Trần Gia Bảo", "Lê Hoàng Nam"].map((fullName, index) => ({ id: `student-${index}`, fullName, birthDate: "2016-05-10", parentName: "Phụ huynh mẫu", parentPhoneNumber: "0900000000" }));
const sessions = [date, later.toISOString().slice(0, 10)].map((value, index) => ({ id: `22222222-2222-2222-2222-22222222222${index}`, classId: id, className: classroom.name, date: value, startTime: "17:30:00", endTime: "19:00:00", studentCount: 3, hasAttendance: false }));
const attendance = {};
const tournaments = options.has("tournaments") ? [{ id: "33333333-3333-3333-3333-333333333333", classId: id, name: "Giải giao hữu của lớp", roundCount: 5, status: "IN_PROGRESS" }] : [];
if (options.get("empty") === "students") students.splice(0);
if (options.get("empty") === "sessions") sessions.splice(0);
if (options.has("long")) { classroom.name = "Lớp cờ vua nâng cao dành cho học sinh chuẩn bị thi đấu giải toàn quốc"; students[0].fullName = "Nguyễn Hoàng Minh Anh – học sinh đang học thử tại trung tâm"; }
sessions.forEach((session) => { session.className = classroom.name; session.studentCount = students.length; });
let detailFailures = 0;
let attendanceFailed = false;
const screen = options.get("screen");
history.replaceState({}, "", screen === "calendar" ? "/calendar" : `/classes/${id}${screen === "legacy" ? "/manage?section=students" : `?tab=${screen === "general" ? "general" : "sessions"}${sessions[0] ? `&sessionId=${sessions[0].id}` : ""}`}`);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.origin);
  const path = url.pathname;
  const method = init.method ?? "GET";
  const payload = init.body ? JSON.parse(init.body) : null;
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (path.endsWith("/auth/me")) return reply({ id: "teacher", fullName: "Giáo viên mẫu", googleMeetUrl: "https://meet.google.com/example" });
  if (path.endsWith("/auth/csrf")) return reply({ headerName: "X-CSRF-TOKEN", token: "fixture-only" });
  if (path.endsWith("/auth/logout")) return reply({});
  if (path.endsWith("/center")) return reply({ incomingInvitations: [] });
  if (path.endsWith("/tournaments")) return reply(tournaments);
  if (path.endsWith("/materials")) return reply([]);
  if (path.endsWith("/classes")) return reply([{ ...classroom, studentCount: students.length }]);
  if (path.endsWith("/sessions")) return reply(sessions);
  if (path.endsWith("/attendance")) {
    if (method === "GET" && options.get("error") === "attendance" && !attendanceFailed) { attendanceFailed = true; return reply({}, 500); }
    const sessionId = path.split("/").at(-2);
    if (method === "PUT") {
      if (document.getElementById("fail-save").checked) return reply({ message: "Lỗi lưu mô phỏng. Dữ liệu chưa được ghi." }, 500);
      attendance[sessionId] = payload.records.map((record) => ({ ...record, ...students.find((student) => student.id === record.studentId), studentId: record.studentId }));
      sessions.find((session) => session.id === sessionId).hasAttendance = true;
    }
    return reply(attendance[sessionId] ?? []);
  }
  if (path.endsWith("/schedule/preview")) return reply({ token: "fixture-preview", kept: sessions, removed: [], added: [{ date: payload.endDate, startTime: payload.startTime, endTime: payload.endTime }] });
  if (path.endsWith("/schedule")) return reply({});
  if (path.endsWith(`/classes/${id}/students`) && method === "POST") { students.push({ ...payload, id: `student-${students.length}` }); return reply(students.at(-1)); }
  if (/\/students\/student-\d+$/.test(path) && method === "DELETE") { students.splice(students.findIndex((student) => student.id === path.split("/").at(-1)), 1); return new Response(null, { status: 204 }); }
  if (path.endsWith(`/classes/${id}`)) {
    if (method === "GET" && options.get("error") === "detail" && detailFailures++ < 2) return reply({}, 500);
    if (method === "PUT") Object.assign(classroom, payload);
    return reply(method === "GET" ? { chessClass: classroom, students, sessions } : classroom);
  }
  throw new Error(`Fixture has no handler: ${method} ${path}`);
};
createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
