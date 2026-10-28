const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let json = [];
    if (path.endsWith('/auth/me')) json = { id: 'teacher-review', fullName: 'Giáo viên' };
    else if (path.endsWith('/auth/csrf')) json = { headerName: 'X-CSRF-TOKEN', token: 'review' };
    else if (path.endsWith('/center')) json = { members: [], incomingInvitations: [], outgoingInvitations: [] };
    if (req.method() === 'POST') { writes.push(req.postDataJSON()); json = { id: 'class-review' }; }
    return route.fulfill({ json });
  });
  fs.mkdirSync('../agent/.impeccable/review/calendar-create', { recursive: true });
  try {
    for (let i = 0; i < 7; i++) {
      await page.goto('http://127.0.0.1:5179/calendar');
      const button = page.locator('.schedule-week__header .schedule-create-class').nth(i);
      await button.waitFor();
      const label = await button.getAttribute('aria-label');
      await button.click();
      const date = new URL(page.url()).searchParams.get('date');
      assert(date);
      assert.equal(label, `Tạo lớp ngày ${new Date(date + 'T12:00:00').toLocaleDateString('vi-VN')}`);
      assert.equal(await page.locator('.manual-date-picker [aria-pressed=true]').count(), 1);
      assert((await page.locator('.manual-session-date').innerText()).includes(date.split('-').reverse().join('/')));
      if (i === 0) {
        await page.getByLabel('Tên lớp', { exact: true }).fill('Lớp từ lịch');
        await page.getByLabel('Học phí mỗi buổi (VNĐ)', { exact: true }).fill('100000');
        await page.getByLabel('Bắt đầu', { exact: true }).fill('17:00');
        await page.getByLabel('Kết thúc', { exact: true }).fill('18:00');
        await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
        await page.waitForURL('**/homepage');
        assert.deepEqual(writes.at(-1).schedule.sessions, [{ date, startTime: '17:00', endTime: '18:00' }]);
      }
    }
    await page.goto('http://127.0.0.1:5179/calendar');
    await page.locator('.schedule-create-class').first().waitFor();
    await page.screenshot({ path: '../agent/.impeccable/review/calendar-create/desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
    await page.locator('.schedule-week__header .schedule-create-class').last().click();
    assert.equal(await page.locator('.manual-date-picker [aria-pressed=true]').count(), 1);
    await page.goto('http://127.0.0.1:5179/calendar');
    await page.getByRole('button', { name: 'Danh sách', exact: true }).click();
    assert.equal(await page.locator('.schedule-agenda .schedule-create-class:visible').count(), 7);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.schedule-day-picker button').first().click();
    assert.equal(await page.locator('.schedule-create-class:visible').count(), 1);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '../agent/.impeccable/review/calendar-create/mobile.png', fullPage: true });
    await page.locator('.schedule-create-class:visible').click();
    assert.equal(await page.locator('.manual-date-picker [aria-pressed=true]').count(), 1);
    assert.deepEqual(errors, []);
    console.log('Passed: all 7 days prefilled, saved schedule date/time, next week, empty days in list, mobile creation and overflow, no runtime errors. All API calls mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

