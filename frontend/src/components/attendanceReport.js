export function getReportMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftReportMonth(month, offset) {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + number - 1 + offset;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String(index % 12 + 1).padStart(2, "0")}`;
}

function normalizeName(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLocaleLowerCase("vi-VN").trim().replace(/\s+/g, " ");
}

export function filterAttendanceClasses(classes, classId, query, classQuery = "") {
  const search = normalizeName(query);
  const classSearch = normalizeName(classQuery);
  return classes.filter((classroom) => (classId === "all" || classroom.classId === classId)
    && (!classSearch || normalizeName(classroom.className ?? "").includes(classSearch))).map((classroom) => ({
    ...classroom,
    totalStudentCount: classroom.students.length,
    students: classroom.students.filter((student) => !search || normalizeName(student.studentName).includes(search)),
  })).filter((classroom) => !search || classroom.students.length > 0);
}

export function getAttendanceClassRows(classes, sortByTuition = true) {
  return classes.map(classroom => ({ ...classroom, totals: getAttendanceTotals([classroom]) })).sort((a, b) =>
    (sortByTuition ? b.totals.tuitionAmount - a.totals.tuitionAmount : 0)
    || (a.className ?? "").localeCompare(b.className ?? "", "vi") || a.classId.localeCompare(b.classId));
}

export function getAttendanceStudentRows(classes, sortByTuition = true) {
  return classes.flatMap(classroom => classroom.students.map(student => ({ ...student, classId: classroom.classId, className: classroom.className, feePerSession: classroom.feePerSession, sessionCount: classroom.sessionCount }))).sort((a, b) =>
    (sortByTuition ? Number(b.tuitionAmount) - Number(a.tuitionAmount) : 0)
    || a.studentName.localeCompare(b.studentName, "vi") || (a.className ?? "").localeCompare(b.className ?? "", "vi")
    || a.classId.localeCompare(b.classId) || a.studentId.localeCompare(b.studentId));
}

export function getScheduledAttendanceClasses(classes) {
  return classes.filter(classroom => Number(classroom.sessionCount) > 0);
}

export function getAttendanceStudentGroups(classes, sortByTuition = true) {
  const groups = new Map();
  for (const row of getAttendanceStudentRows(classes, sortByTuition)) {
    if (!groups.has(row.studentId)) groups.set(row.studentId, { studentId: row.studentId, studentName: row.studentName, classes: [], tuitionAmount: 0 });
    const group = groups.get(row.studentId);
    group.classes.push(row);
    group.tuitionAmount += Number(row.tuitionAmount);
  }
  return [...groups.values()].sort((a, b) => (sortByTuition ? b.tuitionAmount - a.tuitionAmount : 0)
    || a.studentName.localeCompare(b.studentName, "vi") || a.studentId.localeCompare(b.studentId));
}

export function getAttendanceRatio(student) {
  const attended = Number(student.attendedDays);
  // Unknown absences on an older API must not be presented as zero absences.
  return student.absentSessions == null ? `${attended}/—` : `${attended}/${attended + Number(student.absentSessions)}`;
}

export function getAttendanceTotals(classes) {
  return classes.reduce((total, classroom) => {
    total.studentCount += classroom.students.length;
    for (const student of classroom.students) {
      total.attendedSessions += Number(student.attendedDays);
      total.tuitionAmount += Number(student.tuitionAmount);
    }
    return total;
  }, { studentCount: 0, attendedSessions: 0, tuitionAmount: 0 });
}
