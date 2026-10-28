// Shared chrome regression: synthetic GET fixtures only, no backend writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict'); const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..'); const out = path.resolve(root, '../agent/.impeccable/review/app-chrome');
const teacher = { id: '11111111-1111-1111-1111-111111111111', fullName: 'Nguyễn Minh Anh', email: 'teacher@example.test', hasPassword: true };
const classId = '22222222-2222-2222-2222-222222222222', studentId = '33333333-3333-3333-3333-333333333333', tournamentId = '44444444-4444-4444-4444-444444444444';
const classroom = { id: classId, name: 'Cờ vua căn bản A1', studentCount: 2, scopeConfirmed: true, schedule: 'Thứ Hai · 14:00–15:00', tuitionPerSession: 150000 };
const classes = [classroom, { ...classroom, id: '55555555-5555-5555-5555-555555555555', name: 'Cờ vua nâng cao B1' }];
const student = { id: studentId, fullName: 'Lê Minh An', birthDate: '2016-05-20', canEdit: true, classes: [] };
const tournament = { id: tournamentId, name: 'Giải cờ tháng 10', status: 'COMPLETED', rounds: [], standings: [], participants: [], roundCount: 0, tieBreaks: [] };
const routes = [
  ['/homepage', 'Tổng quan', 'dashboard'], ['/calendar', 'Lịch dạy', 'calendar'], ['/students', 'Học sinh', 'students'],
  ['/students/new', 'Hồ sơ học sinh', 'student-new'], [`/students/${studentId}`, 'Hồ sơ học sinh', 'student-detail'],
  ['/classes/new', 'Tạo lớp mới', 'class-new'], [`/classes/${classId}`, 'Lớp học', 'class-detail'],
  ['/attendance-summary', 'Tổng hợp điểm danh', 'attendance'], ['/center', 'Quản lý trung tâm', 'center'],
  ['/materials', 'Quản lý bài giảng', 'materials'], ['/settings', 'Cài đặt tài khoản', 'settings'],
  ['/tournaments/new', 'Tạo giải đấu', 'tournament-new'], [`/tournaments/${tournamentId}`, 'Giải đấu', 'tournament'],
  ['/board-lab', 'Xếp thế cờ', 'board'],
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { createServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
  const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' }); await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-10-19T03:30:00Z'));
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
    let failDetail = false;
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET');
      const p = new URL(route.request().url()).pathname; let json = []; let status = 200;
      if (p.endsWith('/auth/me')) json = teacher;
      else if (p.endsWith('/center')) json = { center: null, members: [], outgoingInvitations: [], incomingInvitations: [] };
      else if (p.endsWith('/deletion-eligibility')) json = { eligible: false, reasons: ['Compte de démonstration'] };
      else if (p.endsWith('/students/options')) json = { centers: [], classes };
      else if (p.endsWith(`/students/${studentId}`)) json = { student, classes: [], history: [], historyTotal: 0 };
      else if (p.endsWith('/students')) json = { items: [student], total: 1, page: 0, size: 25 };
      else if (p.endsWith('/classes')) json = classes;
      else if (p.endsWith(`/classes/${classId}`)) { status = failDetail ? 500 : 200; json = failDetail ? { message: 'Không thể tải lớp học.' } : { chessClass: classroom, students: [], sessions: [] }; }
      else if (p.endsWith('/tournaments/creation')) json = { students: [], availableTieBreaks: [] };
      else if (p.endsWith(`/tournaments/${tournamentId}`)) json = tournament;
      else if (p.endsWith('/tournaments')) json = [tournament];
      await route.fulfill({ status, json });
    });
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    async function ready(url) {
      await page.goto(base + url); await page.locator('.app-headbar').waitFor();
      await page.waitForLoadState('networkidle'); assert.deepEqual(errors, [], 'Render errors at '+url); await page.evaluate(() => document.fonts.ready);
    }
    async function capture(name) { await page.evaluate(() => window.scrollTo(0,0)); await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); }
    if (process.env.CHROME_REVIEW_SCROLLBAR) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: 1366, height: 600 });
      await ready('/board-lab');
      await page.locator('.sidebar').getByRole('button', { name: 'Lớp học', exact: true }).click();
      await page.evaluate(() => document.activeElement.blur());
      const measure = () => page.locator('.sidebar nav').evaluate(nav => ({
        overflow: nav.scrollHeight > nav.clientHeight,
        width: nav.querySelector('[aria-label="Xếp thế cờ"]').getBoundingClientRect().width,
        color: getComputedStyle(nav).getPropertyValue('--sidebar-scroll-thumb').trim(),
        scrollbar: getComputedStyle(nav).scrollbarColor,
      }));
      await page.mouse.move(500, 100); await page.waitForTimeout(450);
      const outside = await measure(); assert(outside.overflow);
      await page.mouse.move(100, 200); await page.waitForTimeout(450);
      const inside = await measure();
      await page.locator('.sidebar').screenshot({ path: path.join(out, 'scrollbar-hover.png') });
      await page.mouse.move(500, 100); await page.waitForTimeout(150);
      const fading = await measure();
      await page.waitForTimeout(350); const hidden = await measure();
      assert.equal(outside.width, inside.width); assert.equal(inside.width, fading.width); assert.equal(fading.width, hidden.width);
      assert.notEqual(inside.color, fading.color); assert.notEqual(fading.color, hidden.color);
      assert.equal(outside.scrollbar, inside.scrollbar);
      await page.locator('.sidebar').screenshot({ path: path.join(out, 'scrollbar-hidden.png') });
      console.log('PASS: overflow menu width stable through hover, fade and hidden states', { outside, inside, fading, hidden });
      return;
    }
    for (const width of (process.env.CHROME_REVIEW_NAV_ONLY ? [] : [1366, 390])) {
      await page.setViewportSize({ width, height: width === 1366 ? 900 : 844 });
      for (const [url, title, name] of routes.filter(r => !process.env.CHROME_REVIEW_ONLY || r[0] === process.env.CHROME_REVIEW_ONLY)) {
        await ready(url);
        assert.equal(await page.locator('.app-headbar h1').textContent(), title, url);
        assert.equal(await page.locator('h1').count(), 1, 'One page heading: ' + url);
        assert.equal(await page.locator('.app-headbar input').count(), 0);
        assert.equal(await page.locator('.sidebar--reference').count(), 1);
        assert.equal(await page.locator('.sidebar .profile-card').count(), 0);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow: '+url+' at '+width);
        await capture(`${name}-${width}`);
      }
    }
    if (process.env.CHROME_REVIEW_ONLY) return;
    // Account keyboard recovery and cross-page persistent rail preference.
    await page.setViewportSize({ width: 1366, height: 900 }); await ready('/calendar');
    await page.getByRole('button', { name: `Tài khoản ${teacher.fullName}`, exact: true }).click();
    await page.keyboard.press('Tab'); assert.match(await page.locator(':focus').textContent(), /Cài đặt tài khoản/);
    await page.keyboard.press('Escape'); assert(await page.getByRole('button', { name: `Tài khoản ${teacher.fullName}`, exact: true }).evaluate(el => el === document.activeElement));
    await page.getByRole('button', { name: 'Thu gọn thanh điều hướng', exact: true }).click();
    await page.locator('.sidebar').getByRole('button', { name: 'Học sinh', exact: true }).click();
    await page.waitForURL('**/students'); await page.waitForLoadState('networkidle'); await page.locator('.students-table').waitFor(); assert.equal(await page.locator('.sidebar--collapsed').count(), 1);
    await capture('collapsed-students');
    await page.locator('.sidebar').getByRole('button', { name: 'Lớp học', exact: true }).click();
    await page.locator('.sidebar-flyout a').first().waitFor();
    await page.locator('.sidebar-flyout').screenshot({ path: path.join(out, 'collapsed-class-flyout.png') });
    await page.screenshot({ path: path.join(out, 'collapsed-class-menu.png'), fullPage: false });
    assert(await page.locator('.sidebar-flyout').isVisible(), 'Flyout survives viewport capture');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mở rộng thanh điều hướng', exact: true }).click();
    await page.locator('.sidebar').getByRole('button', { name: 'Lớp học', exact: true }).click();
    await page.locator('#teacher-classes a').first().waitFor();
    const navProof = await page.locator('#teacher-classes').evaluate(el => ({ height: el.clientHeight, parentHeight: el.parentElement.clientHeight, expanded: el.previousElementSibling.querySelector('button').getAttribute('aria-expanded') }));
    assert(navProof.height > 100 && navProof.parentHeight > navProof.height, JSON.stringify(navProof));
    await page.locator('#teacher-classes').screenshot({ path: path.join(out,'expanded-class-list.png') });
    await page.screenshot({ path: path.join(out,'expanded-class-menu.png') });
    assert.equal(await page.locator('.class-menu__trigger').first().getAttribute('aria-expanded'), 'true');
    await page.locator('#teacher-classes a').first().click(); await page.waitForURL(`**/classes/${classId}`);
    assert.equal(await page.locator('.app-headbar h1').textContent(), 'Lớp học');
    // Error path retains the same chrome and recovers without changing account/nav.
    failDetail = true; await ready(`/classes/${classId}`); await page.locator('.page-error').waitFor();
    assert.equal(await page.locator('.app-headbar').count(), 1); await capture('class-error');
    failDetail = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByRole('heading', { name: classroom.name, exact: true }).waitFor();
    assert.deepEqual(errors, [], 'No browser exceptions');
    console.log(process.env.CHROME_REVIEW_NAV_ONLY ? 'PASS: navigation-only recapture, account keyboard, persisted collapse, visible flyout/expanded links and class error/retry; mock GETs only.' : 'PASS: 14 routes × desktop/mobile, one shared title/sidebar/account, no headbar search, no page overflow, keyboard account, persisted collapse, flyout/expanded class navigation, class error/retry; mock GETs only.');
  } finally { if(browser) await browser.close(); await server.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
