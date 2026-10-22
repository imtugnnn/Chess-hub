// Synthetic API responses only. No production reads or writes.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.REVIEW_BASE_URL || 'http://127.0.0.1:5190';
const output = '../agent/.impeccable/review/alignment';
const teacher = { id: 'teacher', fullName: 'Giáo viên mẫu' };
const classroom = { id: '33333333-3333-3333-3333-333333333333', name: 'Cờ căn bản A', studentCount: 2, feePerSession: 100000, schedule: '' };
const students = ['Nguyễn Minh An', 'Trần Gia Bảo với tên dài để kiểm tra xuống dòng'].map((fullName, i) => ({ id: `s-${i}`, membershipId: `m-${i}`, fullName, birthDate: '2016-01-10', phoneNumber: '0901234567', parentName: 'Phụ huynh mẫu', parentPhoneNumber: '0912345678', notes: 'Luyện tập cuối tuần', classes: [classroom], canEdit: true }));
const sessions = [{ id: 'session-a', date: '2026-10-18', startTime: '09:00', endTime: '10:00', hasAttendance: false }];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      assert.equal(route.request().method(), 'GET', 'Review must not write data');
      const json = path.endsWith('/auth/me') ? teacher
        : path.endsWith('/center') ? { center: null, incomingInvitations: [], outgoingInvitations: [], members: [] }
        : path.endsWith('/classes/33333333-3333-3333-3333-333333333333') ? { chessClass: classroom, students, sessions }
        : path.endsWith('/classes') ? [classroom]
        : path.endsWith('/students/options') ? { centers: [], classes: [classroom] }
        : path.endsWith('/students') ? { items: students, total: 2, page: 0, size: 25 }
        : [];
      return route.fulfill({ json });
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const [name, path, ready] of [
        ['students', '/students', '.students-table tbody tr'],
        ['class-roster', '/classes/33333333-3333-3333-3333-333333333333?tab=students', '.workspace-table tbody tr'],
        ['class-attendance', '/classes/33333333-3333-3333-3333-333333333333', '.attendance-student'],
      ]) {
        await page.goto(base + path);
        await page.locator(ready).first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}/${width} overflow`);
        const alignments = await page.locator('main table :is(th,td)').evaluateAll(cells => cells.map(e => getComputedStyle(e).textAlign));
        assert(alignments.every(value => value === 'left'), `${name}/${width}: ${alignments}`);
        if (width === 1440) {
          const geometry = await page.locator('.sidebar .nav-item').evaluateAll(items => items.map(item => ({
            icon: item.firstElementChild.getBoundingClientRect().x,
            label: item.querySelector('.sidebar-nav-label').getBoundingClientRect().x,
          })));
          assert(geometry.every(g => Math.abs(g.icon - geometry[0].icon) < 1 && Math.abs(g.label - geometry[0].label) < 1), JSON.stringify(geometry));
          assert(await page.locator('.sidebar-nav-label').evaluateAll(labels => labels.every(e => e.scrollWidth <= e.clientWidth)), 'Navigation labels must not be clipped');
          const brand = await page.locator('.sidebar .brand > span:last-child').boundingBox();
          assert(Math.abs(brand.x - geometry[0].label) < 1, 'Brand and nav labels must share an axis');
          if (name === 'class-attendance') {
            const axes = await page.evaluate(() => {
              const headers = document.querySelector('.attendance-list__header').children;
              return [headers[0].getBoundingClientRect().x, document.querySelector('.student-info').getBoundingClientRect().x,
                headers[1].getBoundingClientRect().x, document.querySelector('.status-control').getBoundingClientRect().x];
            });
            assert(Math.abs(axes[0] - axes[1]) < 1 && Math.abs(axes[2] - axes[3]) < 1, JSON.stringify(axes));
          }
        }
        await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
      }
      if (width === 390) {
        await page.getByRole('button', { name: 'Mở điều hướng', exact: true }).click();
        await page.screenshot({ path: `${output}/sidebar-mobile.png`, fullPage: true });
      } else {
        await page.getByRole('button', { name: 'Thu gọn thanh điều hướng', exact: true }).click();
        await page.waitForTimeout(350);
        assert.equal(await page.locator('.sidebar').evaluate(e => Math.round(e.getBoundingClientRect().width)), 76);
        await page.screenshot({ path: `${output}/sidebar-collapsed.png`, fullPage: true });
        await page.getByRole('button', { name: 'Mở rộng thanh điều hướng', exact: true }).click();
        await page.waitForTimeout(350);
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Sidebar icon/label/brand axes, collapsed/mobile navigation, student/class tables, attendance header/control axes, desktop/mobile overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
