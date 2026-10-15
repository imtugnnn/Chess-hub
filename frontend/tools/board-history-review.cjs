// Test session and moves only. No backend records are changed.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { Chess } = require('chess.js');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('../.impeccable/review/board-history', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
  async function toggleAnalysis(label, method = 'click') {
    const control = page.getByRole('switch', { name: label, exact: true });
    if (!await control.isVisible()) await page.getByRole('button', { name: 'Cài đặt phân tích', exact: true })[method]();
    await control[method]();
    await page.getByRole('button', { name: 'Đóng cài đặt', exact: true })[method]();
  }
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/auth/me') ? { id: '11111111-1111-1111-1111-111111111111', fullName: 'Giáo viên thử nghiệm' } : [] }));
  await page.goto(process.env.BOARD_REVIEW_URL || 'http://localhost:5175/board-lab');
  await page.getByRole('button', { name: 'Xác nhận thế cờ' }).click();
  await page.getByRole('heading', { name: 'Đi quân & phân tích', exact: true }).waitFor();
  const square = id => page.locator(`[data-square="${id}"]`);
  const game = new Chess();
  async function move(san) {
    const played = game.move(san);
    await square(played.from).click(); await square(played.to).click();
    if (played.promotion) await page.getByRole('region', { name: 'Chọn quân phong cấp' }).getByRole('button', { name: { q: 'Hậu', r: 'Xe', b: 'Tượng', n: 'Mã' }[played.promotion], exact: true }).click();
    await page.waitForFunction(fen => document.querySelector('.be-board').dataset.fen === fen, game.fen());
    return played;
  }
  await move('e4');
  assert.equal(await page.locator('[data-square="e2"] .be-square--last-from').count(), 1);
  assert.equal(await page.locator('[data-square="e4"] .be-square--last-to').count(), 1);
  for (const id of ['e2', 'e4']) {
    const tile = await square(id).boundingBox(), highlight = await square(id).locator('.be-square').boundingBox();
    assert.ok(Math.abs(tile.height - highlight.height) < 1);
    assert.ok(Math.abs(tile.width - highlight.width) < 1);
  }
  const pieceMotion = await page.locator('.be-board [data-piece="wP"]').evaluateAll(pieces => pieces.some(piece => getComputedStyle(piece).transitionDuration === '0.24s'));
  assert.equal(pieceMotion, true);
  const arrival = await page.locator('.be-square-arrival').evaluate(node => getComputedStyle(node).animationName);
  assert.equal(arrival, 'be-piece-arrival');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('.be-board').dataset.reducedMotion === 'true');
  assert.equal(await page.locator('.be-square-arrival').evaluate(node => getComputedStyle(node).animationName), 'none');
  for (const san of ['e5', 'd4', 'exd4']) await move(san);
  const rows = page.locator('.be-move-table tbody tr');
  assert.deepEqual(await rows.nth(0).locator('th, td').allTextContents(), ['1.', 'e4', 'e5']);
  assert.deepEqual(await rows.nth(1).locator('th, td').allTextContents(), ['2.', 'd4', 'exd4']);
  let seed = 381;
  async function addMoves(count) {
    for (let i = 0; i < count && !game.isGameOver(); i++) {
      const choices = game.moves();
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      await move(choices[seed % choices.length]);
    }
  }
  await addMoves(36);
  assert.ok(await rows.count() >= 12);
  const pane = page.locator('.be-history-scroll');
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await addMoves(20);
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), documentHeight);
  if (!game.isGameOver()) {
    await toggleAnalysis('Mũi tên gợi ý', 'click');
    await toggleAnalysis('Đánh giá thế cờ', 'click');
    await page.waitForFunction(() => document.querySelector('.be-analysis-tools')?.dataset.status === 'done');
  }
  assert.ok(await pane.evaluate(node => node.scrollHeight > node.clientHeight));
  assert.ok(await pane.evaluate(node => node.scrollHeight - node.scrollTop - node.clientHeight < 3));
  const paneBounds = await pane.boundingBox();
  const documentY = await page.evaluate(() => scrollY);
  await page.mouse.move(paneBounds.x + paneBounds.width / 2, paneBounds.y + paneBounds.height / 2);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), documentY);
  await pane.evaluate(node => { node.scrollTop = 0; });
  await page.evaluate(() => window.scrollTo(0, 0));
  if (!process.argv.includes('--no-capture')) await page.screenshot({ path: '../.impeccable/review/board-history/desktop.png', fullPage: true });
  await addMoves(1);
  assert.equal(await pane.evaluate(node => node.scrollTop), 0); // Review older moves without a forced jump.
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await pane.scrollIntoViewIfNeeded();
  await pane.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const mobileBounds = await pane.boundingBox(), mobileY = await page.evaluate(() => scrollY);
  await page.mouse.move(mobileBounds.x + mobileBounds.width / 2, mobileBounds.y + mobileBounds.height / 2);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), mobileY);
  await pane.evaluate(node => { node.scrollTop = 0; });
  await page.evaluate(() => window.scrollTo(0, 0));
  if (!process.argv.includes('--no-capture')) await page.screenshot({ path: '../.impeccable/review/board-history/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: slide/arrival effects, reduced motion, paired rows, bounded history, inner-only wheel scrolling, automatic follow and preserved manual review, desktop/mobile.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

