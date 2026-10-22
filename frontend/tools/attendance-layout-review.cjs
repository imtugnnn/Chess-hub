// Synthetic API responses only; no backend writes.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = '../agent/.impeccable/review/attendance-summary-layout';
const base = process.env.REVIEW_BASE_URL || 'http://localhost:5188';
const classes = [{ classId: 'class-a', className: 'Cờ căn bản A', sessionCount: 9, feePerSession: 100000,
  students: [{ studentId: 'an', studentName: 'Nguyễn Minh An', attendedDays: 2, absentSessions: 1, tuitionAmount: 200000 },
    { studentId: 'bao', studentName: 'Trần Gia Bảo', attendedDays: 0, absentSessions: 0, tuitionAmount: 0 }] },
  { classId: 'class-b', className: 'Lớp tên dài để kiểm tra căn hàng', sessionCount: 8, feePerSession: 100000, students: [] }];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const json = path.endsWith('/auth/me') ? { id: 'teacher', fullName: 'Giáo viên mẫu' }
        : path.endsWith('/attendance-summary') ? classes
        : path.endsWith('/center') ? { center: null, incomingInvitations: [], outgoingInvitations: [], members: [] } : [];
      return route.fulfill({ json });
    });
    const overview = () => page.getByRole('heading', { name: 'Học phí theo lớp', exact: true });
    const detail = () => page.getByRole('heading', { name: 'Cờ căn bản A', exact: true });
    const open = () => page.getByRole('button', { name: 'Mở báo cáo lớp Cờ căn bản A', exact: true }).click();
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.goto(`${base}/attendance-summary?month=2026-10`);
    await overview().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert(await page.locator('.attendance-class-table tbody td').first().evaluate(e => getComputedStyle(e).verticalAlign === 'middle'));
    await noOverflow();
    await page.screenshot({ path: `${output}/desktop-overview.png`, fullPage: true });
    await page.getByLabel('Tìm học sinh', { exact: true }).fill('nguyen');
    await open(); await detail().waitFor();
    assert(new URL(page.url()).searchParams.get('classId') === 'class-a');
    assert.equal(await page.locator('#attendance-payment-an td').first().innerText(), '3/9');
    await page.goBack(); await overview().waitFor();
    assert.equal(await page.getByLabel('Tìm học sinh', { exact: true }).inputValue(), 'nguyen');
    await page.goForward(); await detail().waitFor();
    await page.getByRole('button', { name: 'Quay lại tổng hợp', exact: true }).click(); await overview().waitFor();
    await page.getByLabel('Tìm học sinh', { exact: true }).fill('');
    await open(); await detail().waitFor();
    await page.reload(); await detail().waitFor();
    assert.equal(await page.locator('#attendance-payment-bao td').first().innerText(), '0/9');
    await page.getByRole('columnheader', { name: 'Đã điểm danh / Số buổi học', exact: true }).waitFor();
    const alignment = await page.locator('.attendance-student-table tr').evaluateAll(rows => rows.map(row => [...row.children].map(e => getComputedStyle(e).textAlign)));
    for (const row of alignment) assert.deepEqual(row, ['left', 'left', 'left', 'left', 'left']);
    await noOverflow();
    await page.screenshot({ path: `${output}/desktop-detail.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    assert(await page.locator('#attendance-payment-an td').first().evaluate(e => e.getBoundingClientRect().width > 140 && getComputedStyle(e).textAlign === 'left'));
    await page.screenshot({ path: `${output}/mobile-detail.png`, fullPage: true });
    await page.getByRole('button', { name: 'Quay lại tổng hợp', exact: true }).click(); await overview().waitFor();
    await noOverflow();
    await page.screenshot({ path: `${output}/mobile-overview.png`, fullPage: true });
    await page.goto(`${base}/attendance-summary?month=2026-10&classId=missing`);
    await page.getByRole('heading', { name: 'Không tìm thấy lớp trong tháng này' }).waitFor();
    await page.getByRole('button', { name: 'Quay lại tổng hợp', exact: true }).click(); await overview().waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: URL, Back/Forward, filters, reload, direct/missing links, ratios, desktop alignment and desktop/mobile overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
