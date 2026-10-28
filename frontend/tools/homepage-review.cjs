// Local regression runner: mocks every API request; never writes backend data.
// Run from frontend: node tools/homepage-review.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../agent/.impeccable/review/homepage');
const teacher = { id: '11111111-1111-1111-1111-111111111111', fullName: 'Nguyễn Minh Anh' };
const classes = ['Cờ vua căn bản A1', 'Cờ vua nâng cao B1', 'Lớp luyện thi đấu'].map((name, i) => ({ id: `11111111-1111-1111-1111-11111111111${i + 2}`, name, studentCount: 12 }));
const sessions = [
  ['past', '08:00:00', '09:00:00', 12, 12],
  ['ongoing', '10:00:00', '11:00:00', 12, 8],
  ['future', '14:00:00', '15:00:00', 12, 0],
  ['zero', '16:00:00', '17:00:00', 0, 0],
].map(([id, startTime, endTime, studentCount, attendanceCount], i) => ({ id, classId: classes[i % 3].id, className: classes[i % 3].name, date: '2026-10-18', startTime, endTime, studentCount, attendanceCount }));

(async () => {
  const { createServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
  const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    fs.mkdirSync(output, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.clock.setFixedTime(new Date('2026-10-18T03:30:00Z'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let failClasses = false, failSessions = false, empty = false, long = false;
    let releaseSessions = null;
    const requests = { classes: 0, sessions: 0 };
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Review must never mutate backend');
      const pathname = new URL(route.request().url()).pathname;
      let json = [];
      let status = 200;
      if (pathname.endsWith('/auth/me')) json = teacher;
      else if (pathname.endsWith('/center')) json = { incomingInvitations: [] };
      else if (pathname.endsWith('/classes')) { requests.classes++; status = failClasses ? 500 : 200; json = empty ? [] : long ? classes.map(c => ({ ...c, name: c.name + ' — Lớp học chuyên sâu với tên dài để kiểm tra xuống dòng '.repeat(3) })) : classes; }
      else if (/\/classes\/[0-9a-f-]{36}$/.test(pathname)) {
        const classroom = classes.find(c => pathname.endsWith(c.id));
        json = { chessClass: { ...classroom, schedule: 'Chủ Nhật', scopeConfirmed: true }, students: [], sessions: sessions.filter(s => s.classId === classroom.id) };
      }
      else if (pathname.endsWith('/sessions')) {
        requests.sessions++;
        if (releaseSessions) await releaseSessions;
        status = failSessions ? 500 : 200; json = empty ? [] : long ? sessions.map(s => ({ ...s, className: s.className + ' chuyên sâu '.repeat(15) })) : sessions;
      }
      await route.fulfill({ status, json });
    });
    const schedule = page.locator('.overview-panel--schedule');
    const classPanel = page.locator('.overview-panel--classes');
    const rows = () => schedule.locator('.overview-row');
    async function ready() {
      await schedule.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('.overview-panel')].every(el => el.getAttribute('aria-busy') === 'false'));
      await page.evaluate(() => document.fonts.ready);
    }
    async function load() { await page.goto(`${base}/homepage`); await ready(); }
    await load();
    assert.equal(await rows().count(), 4);
    assert.equal(await page.locator('.overview-metric strong').nth(2).textContent(), '1', 'Future sessions must not inflate actionable pending count');
    assert.match(await rows().nth(0).textContent(), /Đã kết thúc.*Đã điểm danh/);
    assert.match(await rows().nth(1).textContent(), /Đang diễn ra.*8\/12.*Cần điểm danh/);
    assert.match(await rows().nth(2).textContent(), /Sắp diễn ra.*Chưa điểm danh/);
    assert.match(await rows().nth(3).textContent(), /Chưa có học sinh/);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    for (const width of [320, 390, 760, 1024, 1100, 1101, 1440, 1920]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        columns: getComputedStyle(document.querySelector('.overview-columns')).gridTemplateColumns.split(' ').length,
        scheduleY: document.querySelector('.overview-panel--schedule').getBoundingClientRect().top,
        weekHeight: document.querySelector('.overview-link').getBoundingClientRect().height,
        navFits: [...document.querySelectorAll('.sidebar-menu-row')].every(el => el.scrollWidth <= el.clientWidth),
        navLabelsFit: [...document.querySelectorAll('.sidebar-menu-row .sidebar-nav-label')].every(el => el.scrollWidth <= el.clientWidth),
        classLeft: document.querySelector('.overview-panel--classes').getBoundingClientRect().left,
        lastMetricLeft: document.querySelectorAll('.overview-metric')[2].getBoundingClientRect().left,
        panelGap: getComputedStyle(document.querySelector('.overview-columns')).columnGap,
        metricGap: getComputedStyle(document.querySelector('.overview-metrics')).columnGap,
      }));
      assert.equal(layout.overflow, false, `No horizontal overflow at ${width}`);
      assert.equal(layout.columns, width <= 1100 ? 1 : 3, `Column breakpoint ${width}`);
      if (width > 1100) {
        assert(Math.abs(layout.classLeft - layout.lastMetricLeft) < 1, `Cards align vertically at ${width}`);
        assert.equal(layout.panelGap, layout.metricGap, `Both rows share the same gap at ${width}`);
      }
      assert(layout.weekHeight >= 44, 'Week navigation target');
      if (width > 760) {
        assert(layout.navFits, `Sidebar controls fit ${width}`);
        assert(layout.navLabelsFit, `Sidebar labels fit ${width}`);
      }
      if (width === 390) {
        assert(layout.scheduleY < 500, `Mobile schedule should be near first screen: ${layout.scheduleY}`);
        await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
      }
      if (width === 1024) await page.screenshot({ path: path.join(output, 'tablet.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Tìm lớp học', { exact: true }).fill('không tồn tại');
    assert.equal(await classPanel.getByText('Không tìm thấy lớp phù hợp').count(), 1);
    const clear = page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).first();
    const clearBox = await clear.boundingBox();
    assert(clearBox.width >= 44 && clearBox.height >= 44);
    await clear.click();
    assert.equal(await page.getByLabel('Tìm lớp học', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Tìm lớp học', { exact: true }).evaluate(el => el === document.activeElement), true);
    await page.getByRole('button', { name: 'Mở buổi đang diễn ra', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.searchParams.get('sessionId') === 'ongoing');
    assert.equal(new URL(page.url()).pathname, `/classes/${sessions[1].classId}`);
    await page.getByRole('heading', { name: sessions[1].className, exact: true }).waitFor();
    await load();
    failSessions = true;
    await load();
    assert.equal(await classPanel.locator('.overview-row').count(), 3, 'Classes survive schedule failure');
    assert.match(await schedule.textContent(), /Không thể tải lịch/);
    await page.screenshot({ path: path.join(output, 'schedule-error.png'), fullPage: true });
    const beforeClass = requests.classes;
    failSessions = false;
    await schedule.getByRole('button', { name: 'Thử tải lại' }).click();
    await ready();
    assert.equal(await rows().count(), 4);
    assert.equal(requests.classes, beforeClass, 'Schedule retry must not reload classes');
    failClasses = true;
    await load();
    assert.equal(await rows().count(), 4, 'Schedule survives class failure');
    const beforeSessions = requests.sessions;
    failClasses = false;
    await classPanel.getByRole('button', { name: 'Thử tải lại' }).click();
    await ready();
    assert.equal(requests.sessions, beforeSessions, 'Class retry must not reload schedule');
    assert.equal(await classPanel.locator('.overview-row').count(), 3);
    // A slow request must not hold the independently successful panel hostage.
    let resolveSlow;
    releaseSessions = new Promise(resolve => { resolveSlow = resolve; });
    await page.goto(`${base}/homepage`);
    await classPanel.locator('.overview-row').first().waitFor();
    assert.equal(await schedule.getAttribute('aria-busy'), 'true');
    resolveSlow(); releaseSessions = null;
    await ready();
    // Verify zero-roster state after it has started, when the old bug appeared.
    await page.clock.setFixedTime(new Date('2026-10-18T09:30:00Z'));
    await load();
    assert.match(await rows().nth(3).textContent(), /Đang diễn ra.*Chưa có học sinh/);
    assert.equal(await page.locator('.overview-metric strong').nth(2).textContent(), '2');
    empty = true;
    await load();
    assert.equal(await schedule.getByText('Hôm nay chưa có lịch dạy').count(), 1);
    assert.equal(await classPanel.getByText('Chưa có lớp học', { exact: true }).count(), 1);
    await page.screenshot({ path: path.join(output, 'empty-mobile.png'), fullPage: true });
    empty = false; long = true;
    await load();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Long labels must wrap');
    await page.screenshot({ path: path.join(output, 'long-mobile.png'), fullPage: true });
    assert.deepEqual(errors, [], 'No browser JS errors');
    console.log('PASS: independent errors/retries/loading, attendance states/counts, lesson keyboard navigation, search/clear/focus, empty/long content, 8 responsive widths, aligned desktop cards and control sizes. Chromium Edge headless; mock APIs only.');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
