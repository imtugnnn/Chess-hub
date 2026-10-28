import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentState, paymentTotals, paymentClasses, groupPaymentStudents, comparePaymentStudents } from './attendancePayments.js';

test('payment state preserves snapshots, zero dues, and revoked collections', () => {
  assert.equal(paymentState({ tuitionAmount: 0 }), 'NONE');
  assert.equal(paymentState({ tuitionAmount: 100 }), 'UNPAID');
  assert.equal(paymentState({ tuitionAmount: 100, payment: { collected: true, amount: 100 } }), 'PAID');
  assert.equal(paymentState({ tuitionAmount: 0, payment: { collected: true, amount: 100 } }), 'REVIEW');
  assert.equal(paymentState({ tuitionAmount: 100, payment: { collected: false, amount: 0 } }), 'UNPAID');
});
test('remaining dues never net one student overpayment against another', () => {
  const totals = paymentTotals([
    { tuitionAmount: 100, attendedDays: 1, payment: { collected: true, amount: 150 } },
    { tuitionAmount: 100, attendedDays: 1 }, { tuitionAmount: 0 },
  ]);
  assert.equal(totals.amount, 200); assert.equal(totals.collected, 150);
  assert.equal(totals.remaining, 100); assert.equal(totals.overpaid, 50);
  assert.equal(totals.review, 1); assert.equal(totals.dueCount, 2); assert.equal(totals.paidCount, 0);
});
test('search and status select whole classes without shrinking class totals', () => {
  const classes = [{ classId: 'a', className: 'A', students: [
    { studentId: '1', studentName: 'Nguyễn An', tuitionAmount: 100 },
    { studentId: '2', studentName: 'Bảo', tuitionAmount: 200, payment: { collected: true, amount: 200 } },
  ] }, { classId: 'b', className: 'B', students: [{ studentId: '3', studentName: 'An', tuitionAmount: 50, payment: { collected: true, amount: 50 } }] }];
  const result = paymentClasses(classes, 'all', 'nguyen', 'UNPAID', 'tuition');
  assert.equal(result.length, 1); assert.equal(result[0].students.length, 2);
  assert.equal(result[0].totals.amount, 300); assert.equal(result[0].matchCount, 1);
  assert.equal(paymentClasses(classes, 'all', '', 'PAID', 'name')[0].classId, 'b');
});
test('rejoined memberships aggregate by profile, class-only students use membership identity', () => {
  const rows = groupPaymentStudents([
    { membershipId: 'm1', studentId: 'p1', studentName: 'An', attendedDays: 2, absentSessions: 1, tuitionAmount: 200, leftClass: true },
    { membershipId: 'm2', studentId: 'p1', studentName: 'An', attendedDays: 1, absentSessions: 0, tuitionAmount: 100 },
    { membershipId: 'm3', studentName: 'An', attendedDays: 0, tuitionAmount: 0 },
  ]);
  assert.equal(rows.length, 2); assert.equal(rows[0].identityId, 'p1');
  assert.equal(rows[0].tuitionAmount, 300); assert.equal(rows[0].attendedDays, 3);
  assert.equal(rows[0].leftClass, false); assert.equal(rows[1].identityId, 'm3');
});


test('all class columns sort numerically in both directions with stable ties', () => {
  const classes = [
    { classId: 'b', className: 'Bảo', students: [{ studentId: 'b', studentName: 'Bảo', tuitionAmount: '100', attendedDays: 10, payment: { collected: true, amount: 100 } }] },
    { classId: 'a', className: 'An', students: [{ studentId: 'a', studentName: 'An', tuitionAmount: '20', attendedDays: 2 }] },
  ];
  for (const column of ['name', 'attended', 'tuition', 'collected', 'progress']) {
    assert.equal(paymentClasses(classes, 'all', '', 'all', column + ':asc')[0].classId, 'a', column);
    assert.equal(paymentClasses(classes, 'all', '', 'all', column + ':desc')[0].classId, 'b', column);
  }
  assert.equal(paymentClasses(classes, 'all', '', 'all', 'remaining:desc')[0].classId, 'a');
  assert.equal(paymentClasses(classes, 'all', '', 'all', 'remaining:asc')[0].classId, 'b');
  assert.equal(classes[0].classId, 'b');
});

test('student sort uses total marked sessions, money, Vietnamese names and state labels', () => {
  const a = { identityId: 'a', studentName: 'An', tuitionAmount: '20', attendedDays: 1, absentSessions: 1 };
  const b = { identityId: 'b', studentName: 'Bảo', tuitionAmount: '100', attendedDays: 1, absentSessions: 9, payment: { collected: true, amount: 100 } };
  for (const column of ['name', 'attended', 'tuition']) {
    assert(comparePaymentStudents(a, b, column + ':asc') < 0);
    assert(comparePaymentStudents(a, b, column + ':desc') > 0);
  }
  const stateOrder = 'Chưa thu'.localeCompare('Đã thu', 'vi');
  assert.equal(Math.sign(comparePaymentStudents(a, b, 'status:asc')), Math.sign(stateOrder));
  assert.equal(Math.sign(comparePaymentStudents(a, b, 'status:desc')), -Math.sign(stateOrder));
  const duplicate = { ...a, identityId: 'z' };
  assert(comparePaymentStudents(a, duplicate, 'tuition:asc') < 0);
});
