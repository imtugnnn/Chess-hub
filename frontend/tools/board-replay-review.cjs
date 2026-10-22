const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('../agent/.impeccable/review/board-replay', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  async function session(options) {
    const page = await browser.newPage(options);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/auth/me') ? { id: '11111111-1111-1111-1111-111111111111', fullName: 'Giáo viên thử nghiệm' } : [] }));
    await page.goto(process.env.BOARD_REVIEW_URL || 'http://localhost:5175/board-lab');
    await page.getByRole('button', { name: 'Xác nhận thế cờ', exact: true }).click();
    return page;
  }
  const page = await session({ viewport: { width: 1920, height: 1000 } });
  const rootFen = await page.locator('.be-board').getAttribute('data-fen');
  assert.equal(await page.getByRole('group', { name: 'Điều hướng nước đi', exact: true }).locator('button:disabled').count(), 4);
  async function move(from, to) {
    await page.locator(`[data-square="${from}"] .be-square`).click();
    await page.locator(`[data-square="${to}"] .be-square`).click();
    await page.waitForTimeout(280);
  }
  await move('e2', 'e4'); await move('e7', 'e5'); await move('d2', 'd4'); await move('e5', 'd4');
  const liveFen = await page.locator('.be-board').getAttribute('data-fen');
  await page.evaluate(() => {
    window.replayPositions = [];
    const until = performance.now() + 1000;
    function sample() {
      const piece = document.querySelector('[data-square="e2"] [data-piece="wP"]');
      const a = document.querySelector('[data-square="e2"]').getBoundingClientRect();
      const b = document.querySelector('[data-square="e4"]').getBoundingClientRect();
      if (piece) window.replayPositions.push({ y: piece.getBoundingClientRect().y, start: a.y, end: b.y });
      if (performance.now() < until) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.getByRole('button', { name: 'Xem nước 1, Trắng: e4', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện tại', exact: true }).waitFor();
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => window.replayPositions.some(p => p.y < p.start - 5 && p.y > p.end + 5)), 'History replay travels from actual starting square');
  assert.equal(await page.locator('.be-square--last-from').evaluate(e => e.closest('[data-square]').dataset.square), 'e2');
  assert.equal(await page.locator('.be-square--last-to').evaluate(e => e.closest('[data-square]').dataset.square), 'e4');
  assert.equal(await page.locator('.be-square--last-from').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(211, 191, 115)');
  assert.equal(await page.locator('.be-move-table tbody tr').count(), 2);
  const replayFen = await page.locator('.be-board').getAttribute('data-fen');
  await page.locator('[data-square="e7"] .be-square').click(); await page.locator('[data-square="e5"] .be-square').click();
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), replayFen, 'Review must preserve live game');
  async function navigate(label) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(280);
  }
  await navigate('Về thế cờ ban đầu');
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), rootFen);
  assert.equal(await page.locator('.be-square--last-from, .be-square--last-to').count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Lùi một bước', exact: true }).isDisabled());
  await navigate('Tiến một bước');
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), replayFen);
  await navigate('Tiến một bước');
  assert.equal(await page.locator('.be-square--last-to').evaluate(e => e.closest('[data-square]').dataset.square), 'e5');
  await navigate('Lùi một bước');
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), replayFen);
  await navigate('Đến nước cuối cùng');
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), liveFen);
  assert.ok(await page.getByRole('button', { name: 'Tiến một bước', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Xem nước 1, Trắng: e4', exact: true }).click();
  await page.waitForTimeout(400);
  async function centerCheck() {
    const geometry = await page.evaluate(() => {
      const main = document.querySelector('main.board-editor-page').getBoundingClientRect(), workspace = document.querySelector('.be-workspace').getBoundingClientRect();
      return { left: workspace.left - main.left, right: main.right - workspace.right, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(Math.abs(geometry.left - geometry.right) < 2, JSON.stringify(geometry));
    assert.equal(geometry.overflow, false);
  }
  await centerCheck();
  await page.screenshot({ path: '../agent/.impeccable/review/board-replay/wide.png', fullPage: true });
  await page.getByRole('button', { name: 'Xem nước 2, Đen: exd4', exact: true }).click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), liveFen);
  assert.equal(await page.locator('.be-square--last-to').evaluate(e => e.closest('[data-square]').dataset.square), 'd4');
  await page.getByRole('button', { name: 'Hiện tại', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện tại', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.be-board').getAttribute('data-fen'), liveFen);
  await move('g1', 'f3');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await centerCheck();
  await page.screenshot({ path: '../agent/.impeccable/review/board-replay/desktop.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Xem nước 1, Trắng: e4', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  assert.equal(await page.locator('.be-board').getAttribute('data-reduced-motion'), 'true');
  const phone = await session({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.locator('[data-square="e2"] .be-square').tap(); await phone.locator('[data-square="e4"] .be-square').tap(); await phone.waitForTimeout(300);
  await phone.getByRole('button', { name: 'Xem nước 1, Trắng: e4', exact: true }).tap(); await phone.waitForTimeout(400);
  await phone.getByRole('button', { name: 'Về thế cờ ban đầu', exact: true }).tap(); await phone.waitForTimeout(280);
  await phone.getByRole('button', { name: 'Tiến một bước', exact: true }).tap(); await phone.waitForTimeout(280);
  assert.equal(await phone.locator('.be-square--last-from').count(), 1);
  assert.equal(await phone.locator('.be-square--last-to').count(), 1);
  await phone.evaluate(() => window.scrollTo(0, 0));
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await phone.screenshot({ path: '../agent/.impeccable/review/board-replay/mobile.png', fullPage: false });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: history replay motion/capture, return to untouched live game, continue playing, highlights, centered desktop/wide layout, mobile, keyboard and reduced motion.');
})().catch(e => { console.error(e); process.exit(1); });
