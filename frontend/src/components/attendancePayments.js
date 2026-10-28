export const PAYMENT_LABELS = { UNPAID: 'Chưa thu', PAID: 'Đã thu', REVIEW: 'Cần đối soát', NONE: 'Không phát sinh' };
export const foldName = value => (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase('vi-VN').trim().replace(/\s+/g, ' ');
export const paymentIdentity = student => student.identityId ?? student.studentId ?? student.membershipId;

export function paymentState(student) {
  const amount = Number(student.tuitionAmount ?? 0);
  return student.payment?.collected ? (Number(student.payment.amount) === amount ? 'PAID' : 'REVIEW') : amount > 0 ? 'UNPAID' : 'NONE';
}
export function groupPaymentStudents(students) {
  const groups = new Map();
  for (const student of students) {
    const id = paymentIdentity(student);
    if (!groups.has(id)) groups.set(id, { ...student, identityId: id, tuitionAmount: 0, attendedDays: 0, absentSessions: 0, leftClass: true });
    const row = groups.get(id);
    row.tuitionAmount += Number(student.tuitionAmount ?? 0); row.attendedDays += Number(student.attendedDays ?? 0);
    row.absentSessions = row.absentSessions == null || student.absentSessions == null ? null : row.absentSessions + Number(student.absentSessions);
    row.leftClass = row.leftClass && Boolean(student.leftClass);
  }
  return [...groups.values()];
}
export function paymentTotals(students) {
  return students.reduce((total, student) => {
    const amount = Number(student.tuitionAmount ?? 0);
    const paid = student.payment?.collected ? Number(student.payment.amount) : 0;
    total.amount += amount; total.collected += paid; total.remaining += Math.max(0, amount - paid);
    total.overpaid += Math.max(0, paid - amount); total.attended += Number(student.attendedDays ?? 0);
    total.dueCount += amount > 0 ? 1 : 0; total.paidCount += paymentState(student) === 'PAID' ? 1 : 0;
    total.review += paymentState(student) === 'REVIEW' ? 1 : 0; return total;
  }, { amount: 0, collected: 0, remaining: 0, overpaid: 0, attended: 0, dueCount: 0, paidCount: 0, review: 0 });
}
export function classMatchesState(totals, state) {
  if (state === 'UNPAID') return totals.remaining > 0;
  if (state === 'REVIEW') return totals.review > 0;
  if (state === 'PAID') return totals.dueCount > 0 && totals.paidCount === totals.dueCount && !totals.review;
  if (state === 'NONE') return !totals.dueCount && !totals.review;
  return true;
}
export function paymentClasses(classes, classId, query, state, sort) {
  const needle = foldName(query);
  return classes.map(c => {
    const students = groupPaymentStudents(c.students);
    return { ...c, students, totals: paymentTotals(students), matchCount: students.filter(s => foldName(s.studentName).includes(needle)).length };
  }).filter(c => (classId === 'all' || c.classId === classId) && (!needle || c.matchCount > 0) && classMatchesState(c.totals, state))
    .sort((a, b) => comparePaymentClasses(a, b, sort));
}

function sortSettings(sort) {
  const [key, direction] = sort.split(':');
  return [key, direction === 'asc' || (!direction && key === 'name') ? 1 : -1];
}
export function comparePaymentClasses(a, b, sort) {
  const [key, direction] = sortSettings(sort);
  const value = c => key === 'tuition' ? c.totals.amount : key === 'progress' ? (c.totals.dueCount ? c.totals.paidCount / c.totals.dueCount : 0) : c.totals[key];
  const difference = key === 'name' ? a.className.localeCompare(b.className, 'vi') : value(a) - value(b);
  return direction * difference || a.className.localeCompare(b.className, 'vi') || a.classId.localeCompare(b.classId);
}
export function comparePaymentStudents(a, b, sort) {
  const [key, direction] = sortSettings(sort);
  const value = s => key === 'tuition' ? Number(s.tuitionAmount) : key === 'attended' ? (s.absentSessions == null ? -1 : Number(s.attendedDays) + Number(s.absentSessions)) : key === 'status' ? PAYMENT_LABELS[paymentState(s)] : paymentTotals([s]).remaining;
  const difference = key === 'name' ? a.studentName.localeCompare(b.studentName, 'vi') : key === 'status' ? value(a).localeCompare(value(b), 'vi') : value(a) - value(b);
  return direction * difference || a.studentName.localeCompare(b.studentName, 'vi') || paymentIdentity(a).localeCompare(paymentIdentity(b));
}
