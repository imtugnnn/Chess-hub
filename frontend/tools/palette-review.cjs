// Visual review and landing captures with synthetic data; no backend writes.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.PALETTE_REVIEW_URL || 'http://localhost:5175';
const output = '../agent/.impeccable/review/soft-blue';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1265, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // These same product components power the walkthrough illustrations.
    for (const step of ['register', 'create', 'students', 'attendance', 'tuition', 'swiss']) {
      await page.goto(`${base}/landing-capture.html?step=${step}`);
      await page.locator(step === 'register' ? '.auth-form' : '.dashboard').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `public/images/landing/${step}.png` });
    }
    const teacher = { id: '11111111-1111-1111-1111-111111111111', fullName: 'Nguyễn Minh Anh' };
    const classes = ['Cờ vua căn bản A1', 'Cờ vua căn bản A2', 'Cờ vua nâng cao B1', 'Luyện thi đấu C1'].map((name, i) => ({ id: `class-${i}`, name, studentCount: 12 - i * 2 }));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    let signedIn = true;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!signedIn && path.endsWith('/auth/me')) return route.fulfill({ status: 401, json: {} });
      const json = path.endsWith('/auth/me') ? teacher : path.endsWith('/center') ? { incomingInvitations: [] } : path.endsWith('/classes') ? classes : path.endsWith('/sessions') ? classes.slice(0, 3).map((c, i) => ({ id: `s-${i}`, classId: c.id, className: c.name, date: today, startTime: ['08:00:00', '14:00:00', '16:00:00'][i], endTime: ['09:00:00', '15:00:00', '17:00:00'][i], studentCount: c.studentCount, attendanceCount: i === 0 ? 0 : c.studentCount })) : [];
      return route.fulfill({ json });
    });
    await page.setViewportSize({ width: 1265, height: 820 });
    await page.goto(`${base}/board-lab`);
    await page.locator('.be-board').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: 'public/images/landing/board.png' });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`${base}/homepage`);
    await page.getByRole('heading', { name: 'Chào Anh, hôm nay dạy lớp nào?', exact: true }).waitFor();
    await page.getByRole('button', { name: /Cờ vua căn bản A1/ }).last().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const color = (selector, property) => page.locator(selector).first().evaluate((el, prop) => getComputedStyle(el)[prop], property);
    assert.equal(await color('.sidebar', 'backgroundColor'), 'rgb(242, 246, 250)');
    assert.equal(await color('.app-shell', 'backgroundColor'), 'rgb(248, 250, 252)');
    assert.equal(await color('.nav-item--active', 'backgroundColor'), 'rgb(227, 236, 245)');
    assert.equal(await color('.primary-button', 'backgroundColor'), 'rgb(78, 112, 152)');
    await page.screenshot({ path: `${output}/dashboard-desktop.png`, fullPage: true });
    await page.getByRole('button', { name: 'Thu gọn thanh điều hướng', exact: true }).click();
    await page.waitForTimeout(320);
    await page.getByRole('button', { name: 'Lớp học', exact: true }).click();
    await page.locator('.sidebar-flyout').waitFor();
    assert.equal(await color('.sidebar-flyout', 'backgroundColor'), 'rgb(242, 246, 250)');
    await page.screenshot({ path: `${output}/sidebar-collapsed.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mở rộng thanh điều hướng', exact: true }).click();
    for (const width of [1024, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Dashboard overflow at ${width}`);
      if (width === 390) {
        await page.getByRole('button', { name: 'Mở điều hướng', exact: true }).click();
        await page.screenshot({ path: `${output}/dashboard-mobile-menu.png`, fullPage: true });
        await page.getByRole('button', { name: 'Đóng điều hướng', exact: true }).click();
        await page.screenshot({ path: `${output}/dashboard-mobile.png`, fullPage: true });
      }
    }
    signedIn = false;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
      await page.goto(base);
      await page.locator('.landing-hero img').waitFor();
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Landing overflow at ${width}`);
      await page.screenshot({ path: `${output}/landing-${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true });
      await page.locator('summary').filter({ hasText: 'ChessHub dành cho ai?' }).click();
      await page.getByText('ChessHub dành cho giáo viên và chủ trung tâm', { exact: false }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log('Palette, collapsed flyout, mobile menu, FAQ, responsive overflow and browser errors: passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
