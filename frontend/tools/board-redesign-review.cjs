// Isolated synthetic session; no backend writes.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const dir = '../agent/.impeccable/review/board-redesign';
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  const errors = [];
  for (const [name, width, height] of [['desktop', 1440, 900], ['laptop', 1366, 768], ['mobile', 390, 844], ['tablet', 760, 1024]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width <= 760, isMobile: width === 390 });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/auth/me') ? { id: '11111111-1111-1111-1111-111111111111', fullName: 'Giáo viên thử nghiệm' } : [] }));
    await page.goto(process.env.BOARD_REVIEW_URL || 'http://localhost:5175/board-lab');
    await page.getByRole('button', { name: 'Xác nhận thế cờ', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('[data-square]').count(), 64);
    for (const control of await page.locator('.be-spare > button').all()) {
      const bounds = await control.boundingBox();
      assert.ok(bounds.width >= 44 && bounds.height >= 44, 'Piece selection target at least 44×44');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const board = await page.locator('.be-board').boundingBox();
    const confirm = await page.locator('.be-confirm').boundingBox();
    assert.ok(Math.abs(board.width - board.height) < 2, 'Square board');
    if (width > 1000) {
      assert.ok(board.width >= 400, 'Readable desktop board');
      assert.ok(confirm.y + confirm.height <= height, 'Confirmation in first viewport');
    }
    const knight = page.getByRole('button', { name: 'Chọn mã trắng', exact: true });
    if (width <= 760) await knight.tap(); else await knight.click();
    await page.waitForFunction(() => document.querySelector('[data-spare="wN"] button').getAttribute('aria-pressed') === 'true');
    if (width <= 760) await page.locator('[data-square="c3"] .be-square').tap(); else await page.locator('[data-square="c3"] .be-square').click();
    await page.waitForFunction(() => document.querySelector('.be-board').dataset.fen.includes('2N5'));
    await page.getByRole('button', { name: 'Vị trí ban đầu', exact: true }).click();
    await page.waitForTimeout(280);
    const before = await page.locator('.be-board').getAttribute('data-fen');
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Xác nhận thế cờ', exact: true }).click();
    await page.getByRole('heading', { name: 'Nước đi', exact: true }).waitFor();
    const after = await page.locator('.be-board').boundingBox();
    assert.ok(Math.abs(board.width - after.width) < 2, 'Stable board size after confirmation');
    assert.equal(await page.locator('.be-board').getAttribute('data-fen'), before);
    await page.locator('[data-square="e2"] .be-square').click();
    await page.locator('[data-square="e4"] .be-square').click();
    await page.getByRole('button', { name: 'Xem nước 1, Trắng: e4', exact: true }).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/${name}-play.png`, fullPage: true });
    results.push({ name, board: Math.round(board.width), confirmBottom: Math.round(confirm.y + confirm.height), height });
    await page.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${dir}/geometry.json`, JSON.stringify(results, null, 2));
  console.log('PASS: four viewports, 64 squares, one h1, no overflow, laptop confirmation visible, stable board size, legal move.');
  console.log(JSON.stringify(results));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
