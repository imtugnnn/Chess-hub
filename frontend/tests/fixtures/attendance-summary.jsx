import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AttendanceSummaryPage } from "../../src/pages/AttendanceSummaryPage";
import "../../src/fonts.css";
import "../../src/styles.css";
import "../../src/ui-refresh.css";
import "../../src/class-workspace.css";

// Browser-only fixture: never imported by the application. Values are illustrative.
const options = new URLSearchParams(location.search);
const names = ["Nguyễn Minh Anh", "Đặng Gia Bảo", "Trần Khánh Linh", "Lê Đức Minh", "Phạm Hoàng Nam", "Võ Ngọc Hà", "Nguyễn Bảo An", "Trần Tuấn Kiệt", "Đỗ Phương Anh", "Lê Anh Quân", "Nguyễn Nhật Minh", "Phạm Minh Khang"];
const titles = ["Cờ vua cơ bản 01", "Cờ vua nâng cao 01", "Cờ vua cơ bản 02", "Cờ vua thiếu nhi 01", "Cờ vua nâng cao 02", "Cờ vua cuối tuần", "Cờ vua cơ bản 03", "Luyện thi đấu thiếu nhi", "Cờ vua cơ bản 04", "Cờ vua thiếu nhi 02", "Cờ vua nâng cao 03", "Luyện thi đấu nâng cao"];
const classes = titles.map((className, index) => ({
  classId: String(index), className, feePerSession: index % 3 === 1 ? 150000 : 120000, sessionCount: 8,
  students: names.slice(0, 12 - index % 5).map((studentName, number) => {
    const attendedDays = number === 0 ? 6 : number === 1 ? 4 : 3 + (index + number) % 6;
    return { studentId: String(number), studentName, attendedDays, tuitionAmount: attendedDays * (index % 3 === 1 ? 150000 : 120000), leftClass: number === 11 };
  }),
}));
classes.push({ classId: "12", className: "Lớp mới chưa có học sinh", feePerSession: 120000, sessionCount: 0, students: [] });
const fetchOriginal = window.fetch;
window.fetch = async (input, init) => {
  const path = new URL(typeof input === "string" ? input : input.url, location.origin).pathname;
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (path.endsWith("/attendance-summary")) {
    if (options.get("state") === "loading") await new Promise((resolve) => setTimeout(resolve, 60000));
    if (options.get("state") === "error") return reply({}, 500);
    return reply(options.get("state") === "empty" ? [] : classes);
  }
  if (path.endsWith("/center")) return reply({ incomingInvitations: [] });
  if (path.endsWith("/classes")) return reply(classes.map((classroom) => ({ id: classroom.classId, name: classroom.className, studentCount: classroom.students.length })));
  if (path.endsWith("/tournaments")) return reply([]);
  return fetchOriginal(input, init);
};
createRoot(document.getElementById("root")).render(<StrictMode><AttendanceSummaryPage teacherId="fixture-only" teacherName="Giáo viên mẫu" onLogout={() => {}} onNavigate={(path) => location.assign(path)} /></StrictMode>);
