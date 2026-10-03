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

export function filterAttendanceClasses(classes, classId, query) {
  const search = normalizeName(query);
  return classes.filter((classroom) => classId === "all" || classroom.classId === classId).map((classroom) => ({
    ...classroom,
    totalStudentCount: classroom.students.length,
    students: classroom.students.filter((student) => !search || normalizeName(student.studentName).includes(search)),
  })).filter((classroom) => !search || classroom.students.length > 0);
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
