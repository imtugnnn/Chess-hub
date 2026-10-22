// All API data is synthetic and intercepted. No backend reads/writes.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.REVIEW_BASE_URL || 'http://127.0.0.1:5182';
const output = '../agent/.impeccable/review/attendance-summary-controls';
const emptyPayment = () => ({ revision: 0, collected: false, amount: 0 });
const fixtures = () => Array.from({ length: 12 }, (_, i) => ({ classId: `class-${i}`, className: i === 0 ? 'Cờ căn bản A' : `Cờ nâng cao ${String(i).padStart(2, '0')}`, sessionCount: 8, feePerSession: 100000, students: Array.from({ length: i === 0 ? 15 : 2 }, (_, j) => ({ membershipId: `m-${i}-${j}`, studentId: `s-${j}`, identityId: `s-${j}`, studentName: j === 0 ? 'Nguyễn Minh An' : j === 1 ? 'Trần Gia Bảo' : `Học sinh ${String(j).padStart(2, '0')}`, birthDate: '2015-01-10', attendedDays: j === 3 ? 0 : 8, absentSessions: 2, tuitionAmount: j === 3 ? 0 : 800000, leftClass: j === 4, payment: j === 1 ? { revision: 1, collected: true, amount: 800000, updatedByName: 'Giáo viên mẫu', updatedAt: '2026-10-18T02:00:00Z' } : j === 2 ? { revision: 1, collected: true, amount: 600000, updatedByName: 'Giáo viên mẫu', updatedAt: '2026-10-18T02:00:00Z' } : emptyPayment() })) }));
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    let classes = fixtures(), failure = 0;
    const errors = [], calls = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'teacher', fullName: 'Giáo viên mẫu' } });
      if (path.endsWith('/auth/csrf')) return route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'synthetic' } });
      if (path.endsWith('/center')) return route.fulfill({ json: { center: null, incomingInvitations: [], outgoingInvitations: [], members: [] } });
      if (path.endsWith('/attendance-summary')) return route.fulfill({ json: url.searchParams.get('month') === '2000-01' ? [] : classes });
      if (path.includes('/tuition-payments/')) {
        const parts = path.split('/'), ci = parts.indexOf('classes'), classId = parts[ci + 1], id = parts[ci + 3];
        const key = `${classId}:${id}:${url.searchParams.get('month')}`;
        assert(!path.endsWith('/history'), 'history must never be requested');
        const cmd = route.request().postDataJSON(); calls.push({ key, ...cmd });
        if (failure) { const status = failure; failure = 0; return route.fulfill({ status, json: { message: status === 409 ? 'Khoản học phí đã thay đổi. Tải lại dữ liệu trước khi ghi nhận.' : 'Kết nối gián đoạn, chưa lưu được.' } }); }
        const student = classes.find(c => c.classId === classId).students.find(s => s.identityId === id);
        student.payment = { revision: student.payment.revision + 1, collected: cmd.collected, amount: cmd.collected ? student.tuitionAmount : 0, updatedByName: 'Giáo viên mẫu', updatedAt: new Date().toISOString() };
        await new Promise(resolve => setTimeout(resolve, 120));
        return route.fulfill({ json: student.payment });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(`${base}/attendance-summary`);
    await page.getByRole('heading', { name: 'Học phí theo lớp', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.attendance-class-table tbody tr').count(), 10);
    assert(await page.locator('.attendance-class-table tbody tr').first().evaluate(e => e.getBoundingClientRect().top < innerHeight));
    const headings = page.locator('.attendance-class-table thead th[aria-sort]');
    assert.equal(await headings.count(), 6);
    for (let i = 0; i < 6; i++) {
      await headings.nth(i).getByRole('button').click();
      const first = await headings.nth(i).getAttribute('aria-sort');
      await headings.nth(i).getByRole('button').click();
      assert.notEqual(await headings.nth(i).getAttribute('aria-sort'), first);
    }
    await page.getByLabel('Sắp xếp lớp').selectOption('tuition:desc');
    const align = await page.locator('.attendance-extra-filters [role="combobox"]').evaluate(e => getComputedStyle(e).justifyContent);
    assert.equal(align, 'space-between');
    const padding = await page.locator('.attendance-open').first().evaluate(e => [getComputedStyle(e).paddingLeft, getComputedStyle(e).paddingRight]);
    assert.deepEqual(padding, ['12px', '12px']);
    assert.equal(await page.locator('.attendance-class-table td[data-label="Tạm tính"] [data-tone="blue"]').count(), 10);
    await page.screenshot({ path: output + '/desktop.png', fullPage: true });
    await page.getByLabel('Tìm học sinh', { exact: true }).fill('nguyen minh an');
    assert.equal(await page.locator('.attendance-class-table tbody tr').count(), 10);
    assert((await page.locator('.attendance-class-table tbody tr').first().textContent()).includes('11.200.000'));
    await page.getByRole('button', { name: 'Mở báo cáo lớp Cờ căn bản A', exact: true }).click();
    await page.getByRole('heading', { name: 'Cờ căn bản A', exact: true }).waitFor();
    const an = () => page.locator('#attendance-payment-s-0');
    assert.equal(await page.getByLabel('Tìm học sinh trong lớp').inputValue(), 'nguyen minh an');
    failure = 503;
    await page.getByRole('button', { name: 'Đánh dấu đã thu Nguyễn Minh An', exact: true }).click();
    await an().getByRole('alert').waitFor();
    assert((await an().textContent()).includes('Chưa thu'));
    await an().getByRole('button', { name: 'Thử lại', exact: true }).click();
    await an().getByRole('button', { name: 'Bỏ đánh dấu đã thu Nguyễn Minh An', exact: true }).waitFor();
    assert.deepEqual(calls[0], calls[1]);
    assert.equal(classes[1].students[0].payment.collected, false);
    assert.equal(await page.getByRole('button', { name: 'Lịch sử thu', exact: true }).count(), 0);
    await an().getByRole('button', { name: 'Bỏ đánh dấu đã thu Nguyễn Minh An', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await an().getByRole('button', { name: 'Đánh dấu đã thu Nguyễn Minh An', exact: true }).waitFor();
    failure = 409;
    await an().getByRole('button', { name: 'Đánh dấu đã thu Nguyễn Minh An', exact: true }).click();
    await an().getByRole('button', { name: 'Tải lại khoản', exact: true }).click();
    await an().getByRole('button', { name: 'Đánh dấu đã thu Nguyễn Minh An', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xóa lọc học sinh', exact: true }).click();
    const detailHeadings = page.locator('.attendance-student-table thead th[aria-sort]');
    assert.equal(await detailHeadings.count(), 4);
    for (let i = 0; i < 4; i++) {
      await detailHeadings.nth(i).getByRole('button').click();
      const first = await detailHeadings.nth(i).getAttribute('aria-sort');
      await detailHeadings.nth(i).getByRole('button').click();
      assert.notEqual(await detailHeadings.nth(i).getAttribute('aria-sort'), first);
    }
    await page.getByLabel('Sắp xếp học sinh').selectOption('tuition:desc');
    await page.screenshot({ path: `${output}/detail-desktop.png`, fullPage: true });
    const review = page.locator('#attendance-payment-s-2');
    await review.getByRole('button', { name: 'Đối soát Học sinh 02', exact: true }).click();
    await review.getByText('Đã thu', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Trang học sinh sau', exact: true }).click();
    assert((await page.locator('.attendance-pagination').textContent()).includes('11–15'));
    await page.getByRole('button', { name: 'Quay lại tổng hợp', exact: true }).click();
    assert.equal(await page.getByLabel('Tìm học sinh', { exact: true }).inputValue(), 'nguyen minh an');
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).first().click();
    await page.getByLabel('Tình trạng lớp').selectOption('REVIEW');
    assert.equal(await page.locator('.attendance-class-table tbody tr').count(), 0); // the only review item has been reconciled
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    assert(await page.locator('.attendance-class-table tbody tr').first().evaluate(e => e.getBoundingClientRect().top < innerHeight));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
    await page.getByRole('button', { name: 'Mở báo cáo lớp Cờ căn bản A', exact: true }).click();
    // Mobile keeps all three amounts legible in stacked rows; the student list follows the filters.
    await page.locator('.attendance-student-table tbody tr').first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/detail-mobile.png`, fullPage: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.attendance-class-detail').evaluate(e => getComputedStyle(e).animationName), 'none');
    await page.getByLabel('Tìm học sinh trong lớp').fill('nguyen minh an');
    await page.getByLabel('Trạng thái khoản').selectOption('UNPAID');
    await an().getByRole('button', { name: 'Đánh dấu đã thu Nguyễn Minh An', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Khoản không còn khớp' }).waitFor();
    await page.getByRole('heading', { name: 'Không có học sinh phù hợp', exact: true }).waitFor();
    assert.equal(await page.locator('.attendance-class-detail h1').evaluate(e => e === document.activeElement), true);
    await page.getByRole('button', { name: 'Quay lại tổng hợp', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Mở báo cáo lớp Cờ căn bản A', exact: true }).click();
    await page.getByLabel('Tìm học sinh trong lớp').fill('nguyen minh an');
    await an().getByText('Đã thu', { exact: true }).waitFor();
    // Keyboard activates the same one-click revoke action.
    await an().getByRole('button', { name: 'Bỏ đánh dấu đã thu Nguyễn Minh An', exact: true }).focus();
    await page.keyboard.press('Enter');
    await an().getByRole('button', { name: 'Đánh dấu đã thu Nguyễn Minh An', exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Quay lại tổng hợp', exact: true }).click();
    await page.getByLabel('Tìm học sinh', { exact: true }).fill('khong tim thay');
    await page.getByRole('heading', { name: 'Không có lớp phù hợp', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).first().click();
    const parts = [{ membershipId: 'p1', attendedDays: 3, absentSessions: 1, leftClass: true }, { membershipId: 'p2', attendedDays: 5, absentSessions: 1, leftClass: false }];
    classes[0].students[0].attendanceParts = parts;
    await page.reload();
    await page.getByRole('button', { name: 'Mở báo cáo lớp Cờ căn bản A', exact: true }).click();
    await page.getByLabel('Tìm học sinh trong lớp').fill('nguyen minh an');
    await an().getByText('Chi tiết lượt học', { exact: true }).click();
    await an().getByText('Mục 1: 3 đi học / 4 đã điểm danh · Đã rời lớp', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, screenshots: output, paymentRequests: calls.length, assertions: 'class scope, full-class totals, sort headings, collect/retry/one-click revoke/no history/conflict, filter persistence, pagination, mobile overflow, overview first viewport, reduced motion, focus, reload' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
