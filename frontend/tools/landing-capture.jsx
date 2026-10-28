// Development-only screenshot entry. Reuses product pages with synthetic data;
// never authenticates or writes to a backend. Not included in the Vite build.
import React from "react";
import { createRoot } from "react-dom/client";
import { RegisterPage } from "../src/pages/RegisterPage";
import { CreateClassPage } from "../src/pages/CreateClassPage";
import { ClassDetailPage } from "../src/pages/ClassDetailPage";
import { AttendanceSummaryPage } from "../src/pages/AttendanceSummaryPage";
import { TournamentDetailPage } from "../src/pages/TournamentDetailPage";
import "../src/fonts.css";
import "../src/styles.css";
import "../src/ui-refresh.css";
import "../src/class-workspace.css";
import "../src/design-system.css";
import "../src/motion.css";
import "../src/pastel-theme.css";

const students = ["An Khang", "Mai Linh", "Gia Phúc", "Minh Anh"].map((fullName, index) => ({ id: `student-${index}`, fullName, birthDate: "2016-05-12", parentName: "Phụ huynh mẫu", parentPhoneNumber: "" }));
const classroom = { id: "demo-class", name: "Cờ vua căn bản", schedule: "Thứ Ba, Thứ Năm · 17:30 – 19:00", feePerSession: 100000, studentCount: 4 };
const sessions = [6, 8, 13, 15].map((day, index) => ({ id: `session-${index}`, date: `2026-10-${String(day).padStart(2, "0")}`, startTime: "17:30:00", endTime: "19:00:00", attendanceCount: index < 2 ? 4 : 0, studentCount: 4 }));
const standings = students.map((student, index) => ({ participantId: student.id, fullName: student.fullName, rank: index + 1, points: [1, .5, .5, 0][index] }));
const tournament = { id: "demo-tournament", name: "Giải cờ cuối tuần", classId: classroom.id, status: "IN_PROGRESS", rounds: [{ id: "round-1", number: 1, status: "COMPLETED", pairings: [{ id: "pair-1", boardNumber: 1, white: students[0], black: students[3], result: "WHITE_WIN" }, { id: "pair-2", boardNumber: 2, white: students[1], black: students[2], result: "DRAW" }] }], standings };
window.fetch = async (input, options = {}) => {
  if (options.method && options.method !== "GET") return new Response(JSON.stringify({ message: "Bản chụp chỉ hỗ trợ xem." }), { status: 405 });
  const path = new URL(input, location.origin).pathname;
  let data = [];
  if (path.endsWith("/classes")) data = [classroom];
  else if (path.endsWith("/classes/demo-class")) data = { chessClass: classroom, students, sessions };
  else if (path.endsWith("/attendance")) data = students.map((student, index) => ({ studentId: student.id, fullName: student.fullName, status: index === 3 ? "LATE" : "PRESENT" }));
  else if (path.endsWith("/attendance-summary")) data = [{ classId: classroom.id, className: classroom.name, feePerSession: 100000, sessionCount: 4, students: students.map((student, index) => ({ studentId: student.id, studentName: student.fullName, attendedDays: index === 3 ? 3 : 4, tuitionAmount: index === 3 ? 300000 : 400000 })) }];
  else if (path.endsWith("/tournaments/demo-tournament")) data = tournament;
  else if (path.endsWith("/tournaments")) data = [{ ...tournament, roundCount: 1 }];
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
};
const props = { teacherId: "demo-teacher", teacherName: "Giáo viên mẫu", onNavigate: () => {}, onLogout: () => {}, registerNavigationGuard: () => {} };
const step = new URLSearchParams(location.search).get("step");
const screens = {
  register: <RegisterPage onNavigate={() => {}} onRegistered={() => {}} />,
  create: <CreateClassPage {...props} />,
  students: <ClassDetailPage {...props} classId="demo-class" locationSearch="?tab=students&add=student" />,
  attendance: <ClassDetailPage {...props} classId="demo-class" locationSearch="?sessionId=session-0" />,
  tuition: <AttendanceSummaryPage {...props} />,
  swiss: <TournamentDetailPage {...props} tournamentId="demo-tournament" />,
};
createRoot(document.getElementById("root")).render(screens[step] ?? screens.attendance);
