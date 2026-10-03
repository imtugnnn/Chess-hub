import test from "node:test";
import assert from "node:assert/strict";
import { filterAttendanceClasses, getAttendanceTotals, getReportMonth, shiftReportMonth } from "./attendanceReport.js";

const classes = [
  { classId: "a", students: [{ studentId: "1", studentName: "Nguyễn Minh Anh", attendedDays: 6, tuitionAmount: "720000" }, { studentId: "2", studentName: "Đặng Gia Bảo", attendedDays: 4, tuitionAmount: 480000 }] },
  { classId: "b", students: [{ studentId: "1", studentName: "Nguyễn Minh Anh", attendedDays: 3, tuitionAmount: 450000 }] },
  { classId: "empty", students: [] },
];
test("class and Vietnamese name filters combine without changing the source report", () => {
  const results = filterAttendanceClasses(classes, "a", "  DANG   gia ");
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].students.map((student) => student.studentId), ["2"]);
  assert.equal(results[0].totalStudentCount, 2);
  assert.equal(classes[0].students.length, 2);
  assert.deepEqual(filterAttendanceClasses(classes, "b", "Gia Bảo"), []);
  assert.equal(filterAttendanceClasses(classes, "all", "").length, 3);
});
test("filtered totals include numeric tuition strings and each class membership", () => {
  assert.deepEqual(getAttendanceTotals(filterAttendanceClasses(classes, "all", "nguyen minh")), { studentCount: 2, attendedSessions: 9, tuitionAmount: 1170000 });
  assert.deepEqual(getAttendanceTotals(filterAttendanceClasses(classes, "a", "Gia Bảo")), { studentCount: 1, attendedSessions: 4, tuitionAmount: 480000 });
  assert.deepEqual(getAttendanceTotals([]), { studentCount: 0, attendedSessions: 0, tuitionAmount: 0 });
});
test("report months cross year boundaries and use the local calendar date", () => {
  assert.equal(shiftReportMonth("2026-12", 1), "2027-01");
  assert.equal(shiftReportMonth("2026-01", -1), "2025-12");
  assert.equal(getReportMonth(new Date(2026, 9, 1, 0, 5)), "2026-10");
});
