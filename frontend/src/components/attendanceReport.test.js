import test from "node:test";
import assert from "node:assert/strict";
import { filterAttendanceClasses, getAttendanceClassRows, getAttendanceStudentRows, getAttendanceStudentGroups, getScheduledAttendanceClasses, getAttendanceRatio, getAttendanceTotals, getReportMonth, shiftReportMonth } from "./attendanceReport.js";

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

test("class text search folds Vietnamese accents and combines with student and class ID filters", () => {
  const named = classes.map((classroom, index) => ({ ...classroom, className: ["Cờ căn bản A", "Cờ nâng cao B", "Lớp trống"][index] }));
  assert.deepEqual(filterAttendanceClasses(named, "all", "nguyen", "  NANG   cao ").map(c => c.classId), ["b"]);
  assert.equal(filterAttendanceClasses(named, "a", "", "nang cao").length, 0);
  assert.equal(filterAttendanceClasses(named, "all", "", "lop trong")[0].classId, "empty");
  assert.equal(filterAttendanceClasses(named, "all", "Gia Bảo", "nang cao").length, 0);
});

test("class reports default to highest tuition and sorting never mutates report data", () => {
  const named = [
    { classId: "low", className: "A", students: [{ studentId: "1", studentName: "An", attendedDays: 1, tuitionAmount: "90000" }] },
    { classId: "high", className: "B", students: [{ studentId: "2", studentName: "Bảo", attendedDays: 2, tuitionAmount: "100000" }] },
  ];
  assert.deepEqual(getAttendanceClassRows(named).map(c => c.classId), ["high", "low"]);
  assert.deepEqual(getAttendanceClassRows(named, false).map(c => c.classId), ["low", "high"]);
  assert.deepEqual(named.map(c => c.classId), ["low", "high"]);
});

test("student results retain separate class memberships and default to highest individual tuition", () => {
  const rows = getAttendanceStudentRows(filterAttendanceClasses(classes, "all", "nguyen"));
  assert.deepEqual(rows.map(s => [s.studentId, s.classId, s.tuitionAmount]), [["1", "a", "720000"], ["1", "b", 450000]]);
  assert.equal(classes[0].students[0].classId, undefined);
  assert.equal(getAttendanceTotals(filterAttendanceClasses(classes, "all", "nguyen")).tuitionAmount, 1170000);
});

test("student sorting supports numeric string amounts, zero tuition and deterministic ties", () => {
  const sample = [{ classId: "a", className: "A", students: [
    { studentId: "3", studentName: "Cường", tuitionAmount: "0" },
    { studentId: "2", studentName: "Bảo", tuitionAmount: "100000" },
    { studentId: "1", studentName: "An", tuitionAmount: 100000 },
  ] }];
  assert.deepEqual(getAttendanceStudentRows(sample).map(s => s.studentId), ["1", "2", "3"]);
  assert.deepEqual(getAttendanceStudentRows(sample, false).map(s => s.studentId), ["1", "2", "3"]);
  assert.deepEqual(getAttendanceStudentRows([]), []);
});

test("monthly eligibility excludes classes without sessions, including from class search", () => {
  const source = [
    { classId: "outside", className: "Cờ căn bản", sessionCount: 0, students: [] },
    { classId: "current", className: "Cờ nâng cao", sessionCount: "3", students: [] },
  ];
  assert.deepEqual(getScheduledAttendanceClasses(source).map(c => c.classId), ["current"]);
  assert.deepEqual(filterAttendanceClasses(getScheduledAttendanceClasses(source), "all", "", "can ban"), []);
  assert.equal(source.length, 2);
});

test("student groups show one identity with all eligible class amounts and prices", () => {
  const source = classes.map((c, i) => ({ ...c, sessionCount: 8, className: `Class ${i}`, feePerSession: i === 0 ? 120000 : 150000 }));
  const groups = getAttendanceStudentGroups(filterAttendanceClasses(source, "all", "nguyen"));
  assert.equal(groups.length, 1); assert.equal(groups[0].tuitionAmount, 1170000);
  assert.deepEqual(groups[0].classes.map(c => [c.classId, c.feePerSession]), [["a", 120000], ["b", 150000]]);
  const filtered = getAttendanceStudentGroups(filterAttendanceClasses(source, "b", "nguyen"));
  assert.equal(filtered[0].tuitionAmount, 450000); assert.equal(filtered[0].classes.length, 1);
  assert.equal(source[0].students[0].classId, undefined);
});

test("groups are keyed by ID rather than name and rank by total rather than largest class", () => {
  const source = [
    { classId: "a", className: "A", students: [ { studentId: "1", studentName: "An", tuitionAmount: 600000 }, { studentId: "2", studentName: "An", tuitionAmount: 900000 } ] },
    { classId: "b", className: "B", students: [ { studentId: "1", studentName: "An", tuitionAmount: "600000" } ] },
  ];
  const groups = getAttendanceStudentGroups(source);
  assert.deepEqual(groups.map(s => [s.studentId, s.tuitionAmount]), [["1", 1200000], ["2", 900000]]);
  assert.equal(groups[0].classes.length, 2); assert.equal(groups[1].classes.length, 1);
});

test("attendance denominator is attended plus actual absences, excluding unmarked scheduled sessions", () => {
  assert.equal(getAttendanceRatio({ attendedDays: 8, absentSessions: 0, sessionCount: 12 }), "8/8");
  assert.equal(getAttendanceRatio({ attendedDays: 2, absentSessions: 3 }), "2/5");
  assert.equal(getAttendanceRatio({ attendedDays: 0, absentSessions: 2 }), "0/2");
  assert.equal(getAttendanceRatio({ attendedDays: 0, absentSessions: 0 }), "0/0");
  assert.equal(getAttendanceRatio({ attendedDays: 3 }), "3/—");
});
