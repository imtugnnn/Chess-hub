// Every API request is mocked. No real data is read or changed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.argv[2] || 'http://127.0.0.1:5179';
const output = '../agent/.impeccable/review/compact-calendar';
const name = 'Cờ vua nâng cao — Chiến thuật trung cuộc và tư duy tính toán K12';
const classId = day => `00000000-0000-4000-8000-00000000000${day}`;
let mode = 'normal', sessions = [], reads = 0;
const errors = [], writes = [];
function fixture(from) {
  return Array.from({ length: 7 }, (_, day) => Array.from({ length: mode === 'dense' && day === 0 ? 20 : 3 }, (_, i) => {
    const date = new Date(`${from}T12:00:00`); date.setDate(date.getDate() + day);
    return { id: `session-${day}-${i}`, classId: classId(day), className: day === 6 ? 'Lớpcờkhôngcókhoảngtrắng'.repeat(5) : name,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      startTime: `${String(8 + i % 12).padStart(2, '0')}:00:00`, endTime: `${String(9 + i % 12).padStart(2, '0')}:30:00`,
      studentCount: i === 2 ? 0 : 12, attendanceCount: i === 0 ? 8 : i === 1 ? 12 : 0 };
  })).flat();
}
async function mock(route) {
  const req = route.request(), url = new URL(req.url()), path = url.pathname;
  if (req.method() !== 'GET') writes.push(`${req.method()} ${path}`);
  let json = [];
  if (path.endsWith('/auth/me')) json = { id: 'calendar-review', fullName: 'Giáo viên kiểm thử' };
  else if (path.endsWith('/auth/csrf')) json = { headerName: 'X-CSRF-TOKEN', token: 'mock' };
  else if (path.endsWith('/center')) json = { incomingInvitations: [], outgoingInvitations: [], members: [] };
  else if (path.endsWith('/classes')) json = Array.from({ length: 7 }, (_, day) => ({ id: classId(day), name: `${name} ${day}` }));
  else if (/\/classes\/[0-9a-f-]{36}$/.test(path)) {
    const id = path.split('/').at(-1);
    json = { chessClass: { id, name, schedule: 'Lịch kiểm thử', feePerSession: 100000 }, students: [], sessions: sessions.filter(s => s.classId === id) };
  } else if (path.endsWith('/sessions')) {
    reads++; await new Promise(resolve => setTimeout(resolve, 100));
    if (mode === 'error') return route.fulfill({ status: 500, json: { message: 'Không thể tải lịch kiểm thử' } });
    json = sessions = mode === 'empty' ? [] : fixture(url.searchParams.get('from'));
  }
  await route.fulfill({ json });
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, timezoneId: 'Asia/Ho_Chi_Minh' });
    ctx.setDefaultTimeout(10000); await ctx.route('**/api/**', mock);
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-14T03:00:00Z'));
    const cards = () => page.locator('.schedule-week-session:visible');
    const tip = () => page.getByRole('tooltip');
    const load = async () => { await page.goto(`${base}/calendar`); await cards().first().waitFor(); await page.evaluate(() => document.fonts.ready); };
    const dismiss = async () => { await page.keyboard.press('Escape'); await tip().waitFor({ state: 'detached' }); await page.mouse.move(1, 1); };
    const bounds = async () => assert(await tip().evaluate(el => { const b = el.getBoundingClientRect(); return b.left >= 15 && b.right <= innerWidth - 15 && b.top >= 15 && b.bottom <= innerHeight - 15; }), 'Preview within viewport');
    const destination = async target => { await target.waitForURL(`**/classes/${classId(0)}?tab=sessions&sessionId=session-0-0`); await target.locator('.session-timeline__item[aria-pressed="true"]').waitFor(); assert((await target.locator('.session-timeline__item[aria-pressed="true"]').innerText()).includes('08:00')); };
    await load();
    assert.equal(await cards().count(), 21);
    assert.equal(await page.locator('.schedule-week__header > div').count(), 7);
    assert.equal(await page.locator('.schedule-session-open').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth), 'Three sessions/day fit one screen');
    assert(await cards().first().evaluate(el => el.getBoundingClientRect().height <= 110));
    if (!process.env.SKIP_DESKTOP_CAPTURES) await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
    const beforeHover = reads;
    await cards().first().hover(); await tip().waitFor(); await bounds();
    assert((await tip().innerText()).includes(name)); assert((await tip().innerText()).includes('8/12 đã ghi nhận')); assert((await tip().innerText()).includes('1g 30p'));
    await tip().hover(); await page.waitForTimeout(220); assert.equal(await tip().count(), 1);
    if (!process.env.SKIP_DESKTOP_CAPTURES) await page.screenshot({ path: `${output}/hover.png`, fullPage: true });
    await dismiss(); await page.waitForTimeout(350); assert.equal(await tip().count(), 0);
    console.log('Checking keyboard preview'); await page.keyboard.press('Tab'); await cards().first().focus(); await tip().waitFor();
    assert(await cards().first().getAttribute('aria-describedby'));
    await page.keyboard.press('Escape'); assert(await cards().first().evaluate(el => el === document.activeElement));
    await page.waitForTimeout(350); assert.equal(await tip().count(), 0);
    await page.keyboard.press('Tab'); await tip().waitFor(); assert((await tip().innerText()).includes('12/12 đã ghi nhận'));
    await dismiss(); await cards().nth(2).hover(); await tip().waitFor();
    assert((await tip().innerText()).includes('Chưa có học viên')); assert((await tip().innerText()).includes('Chưa điểm danh'));
    await dismiss(); await cards().last().hover(); await tip().waitFor(); await bounds(); await dismiss();
    assert.equal(reads, beforeHover, 'Hover does not fetch extra data');
    console.log('Checking navigation'); await cards().first().click(); await destination(page);
    await load(); await cards().first().focus(); await page.keyboard.press('Enter'); await destination(page);
    await load(); const newPage = ctx.waitForEvent('page'); await cards().first().click({ modifiers: ['Control'] });
    const opened = await newPage; await destination(opened); await opened.close();
    await page.mouse.move(1, 1); await cards().first().hover(); await tip().waitFor();
    await page.getByRole('button', { name: 'Tuần sau', exact: true }).click(); await tip().waitFor({ state: 'detached' }); await cards().first().waitFor();
    await page.getByRole('button', { name: 'Hôm nay', exact: true }).click(); await cards().first().waitFor();
    await page.getByRole('combobox', { name: /Điểm danh/ }).click(); await page.getByRole('option', { name: 'Chưa điểm danh', exact: true }).click();
    assert((await page.locator('.schedule-week-day__empty').first().innerText()).includes('phù hợp'));
    await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
    console.log('Checking dense day'); mode = 'dense'; await load(); const more = page.locator('.schedule-more'); assert.equal(await more.innerText(), '+17 buổi khác'); await more.click();
    assert.equal(await page.locator('.schedule-expanded-day .schedule-agenda-session').count(), 20);
    assert(await page.locator('#schedule-expanded-heading').evaluate(el => el === document.activeElement));
    const lastDaily = page.locator('.schedule-expanded-day .schedule-agenda-session').last();
    await lastDaily.scrollIntoViewIfNeeded(); await page.mouse.move(1, 1); await page.waitForTimeout(150);
    await lastDaily.hover(); await tip().waitFor(); await bounds();
    await page.locator('.schedule-expanded-day').evaluate(el => { el.scrollTop = 0; }); await tip().waitFor({ state: 'detached' });
    await page.keyboard.press('Tab'); await lastDaily.focus();
    await tip().waitFor(); await bounds();
    await dismiss();
    await page.getByRole('button', { name: 'Về lịch tuần' }).click(); assert(await more.evaluate(el => el === document.activeElement));
    await page.getByRole('button', { name: 'Danh sách', exact: true }).click(); assert.equal(await page.locator('.schedule-agenda-session:visible').count(), 38);
    await page.getByRole('button', { name: 'Tuần', exact: true }).click();
    mode = 'error'; await page.goto(`${base}/calendar`); await page.getByRole('alert').waitFor();
    mode = 'empty'; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.locator('.schedule-week-day__empty').first().waitFor(); assert.equal(await page.locator('.schedule-week-day__empty').count(), 7);
    mode = 'normal';
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Ho_Chi_Minh' }); await mobile.route('**/api/**', mock);
    const touch = await mobile.newPage(); touch.on('pageerror', e => errors.push(e.message)); await touch.clock.setFixedTime(new Date('2026-10-14T03:00:00Z'));
    await touch.goto(`${base}/calendar`); await touch.locator('.schedule-day-picker button').first().tap(); await touch.locator('.schedule-agenda-session:visible').first().waitFor();
    assert(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); assert.equal(await touch.locator('.schedule-agenda-session:visible').count(), 3);
    await touch.screenshot({ path: `${output}/mobile.png`, fullPage: true });
    for (const width of [1054, 768, 360]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/calendar`);
      await page.locator('.schedule-agenda-session:visible').first().waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}px`);
      await page.screenshot({ path: `${output}/responsive-${width}.png`, fullPage: true });
    }
    await touch.locator('.schedule-agenda-session:visible').first().tap(); await destination(touch); assert.equal(await touch.getByRole('tooltip').count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    console.log('PASS: 1366x768 compact week, long names, hover/transfer/edges/counts, keyboard/Escape, direct click/Enter/new tab/touch, week/filter reset, 20-session overflow/back focus, list, error/retry/empty, 390px mobile. API mocked, no writes/runtime errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
