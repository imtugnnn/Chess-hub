// Every API request is intercepted; this review never writes real student data.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.STUDENT_ENTRY_REVIEW_URL || 'http://127.0.0.1:5177';
const classId = '33333333-3333-3333-3333-333333333333';
const teacher = { id: '11111111-1111-1111-1111-111111111111', fullName: 'Nguyễn Minh Anh' };
const existing = { id: '44444444-4444-4444-4444-444444444444', fullName: 'Nguyễn Minh An', birthDate: '2015-01-02', parentName: '', parentPhoneNumber: '', phoneNumber: '', notes: '', classes: [], canEdit: true };
const classroom = { id: classId, name: 'Lớp cờ', feePerSession: 100000, studentCount: 0, schedule: '' };
(async () => {
  fs.mkdirSync('../.impeccable/review/student-entry', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/api/**', route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      let json = [];
      if (path.endsWith('/auth/me')) json = teacher;
      else if (path.endsWith('/auth/csrf')) json = { headerName: 'X-CSRF-TOKEN', token: 'review' };
      else if (path.endsWith('/center')) json = { incomingInvitations: [], outgoingInvitations: [], members: [] };
      else if (request.method() === 'POST') { writes.push({ path, body: request.postData() ? request.postDataJSON() : null }); json = { ...classroom, ...existing }; }
      else if (path.endsWith('/students/options')) json = { centers: [], classes: [classroom] };
      else if (path.endsWith('/students')) json = { items: (url.searchParams.get('query') || '').includes('Nguyễn') ? [existing] : [], total: 1, page: 0, size: 8 };
      else if (path.endsWith('/classes/' + classId)) json = { chessClass: classroom, students: [], sessions: [] };
      else if (path.endsWith('/classes')) json = [classroom];
      return route.fulfill({ json });
    });
    const fields = () => page.locator('.student-entry-fields');
    async function openCreate() {
      await page.goto(`${base}/classes/new?date=2026-10-15`);
      await page.getByLabel('Tên lớp', { exact: true }).fill('Lớp mới');
      await page.getByLabel('Học phí mỗi buổi (VNĐ)', { exact: true }).fill('100000');
      await page.getByLabel('Bắt đầu', { exact: true }).fill('17:00');
      await page.getByLabel('Kết thúc', { exact: true }).fill('18:00');
    }
    async function enterNew(name) {
      const inputs = fields().locator('input');
      await inputs.nth(0).fill(name); await inputs.nth(0).press('Enter');
      assert(await inputs.nth(1).evaluate(el => el === document.activeElement));
      await inputs.nth(1).fill('2016-02-03');
      for (let i = 1; i < 5; i++) { await inputs.nth(i).press('Enter'); }
      assert(await fields().locator('textarea').evaluate(el => el === document.activeElement));
      await fields().locator('textarea').fill('Ghi chú');
      await fields().locator('textarea').press('Shift+Enter');
      assert((await fields().locator('textarea').inputValue()).includes('\n'));
      await fields().locator('textarea').press('Enter');
      assert(await page.locator('button:focus').evaluate(el => /Xác nhận học sinh|Thêm học sinh|Tạo hồ sơ/.test(el.textContent)));
    }
    await openCreate();
    await enterNew('Học sinh mới');
    assert.equal(writes.length, 0);
    await page.locator('button:focus').press('Enter');
    await page.locator('.student-draft--confirmed').waitFor();
    await page.waitForTimeout(250);
    assert(await page.locator('.student-draft__panel').evaluate(el => el.getBoundingClientRect().height < 1));
    await page.screenshot({ path: '../.impeccable/review/student-entry/create-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.getByRole('heading', { name: /Chào Anh/ }).waitFor();
    const createWrite = writes.find(write => write.path.endsWith('/classes'));
    assert.equal(createWrite.body.students[0].fullName, 'Học sinh mới');
    assert.equal(createWrite.body.students[0].parentPhoneNumber, '');
    assert.equal(createWrite.body.students[0].parentName, '');
    await openCreate();
    await fields().getByRole('combobox').fill('Nguyễn');
    await fields().getByRole('option').waitFor();
    await fields().getByRole('combobox').press('ArrowDown');
    await fields().getByRole('combobox').press('Enter');
    assert.equal(await fields().locator('input[type=date]').inputValue(), existing.birthDate);
    await fields().getByRole('combobox').press('Enter');
    await page.locator('button:focus').press('Enter');
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.getByRole('heading', { name: /Chào Anh/ }).waitFor();
    assert.equal(writes.filter(write => write.path.endsWith('/classes')).at(-1).body.students[0].studentId, existing.id);
    await page.goto(`${base}/classes/${classId}?tab=students&add=student`);
    await fields().waitFor();
    assert.equal(await page.getByLabel('Cách thêm', { exact: true }).count(), 0);
    await enterNew('Học sinh trong lớp');
    await page.locator('button:focus').press('Enter');
    await page.getByText('Đã thêm học sinh vào lớp.', { exact: true }).waitFor();
    assert.equal(writes.at(-1).body.fullName, 'Học sinh trong lớp');
    await fields().getByRole('combobox').fill('Nguyễn');
    await fields().getByRole('option').waitFor();
    await fields().getByRole('option').click();
    await page.getByRole('button', { name: 'Thêm học sinh', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.student-entry-fields input').value === '');
    assert(writes.at(-1).path.endsWith('/students/' + existing.id));
    await fields().getByRole('combobox').fill('Nguyễn');
    await fields().getByRole('option').waitFor();
    await page.screenshot({ path: '../.impeccable/review/student-entry/class-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator('[placeholder]').count(), 0);
    await page.screenshot({ path: '../.impeccable/review/student-entry/class-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Passed: optional parents, Enter/Shift+Enter, confirmation focus, reuse by ID, class create/add, suggestions, no placeholders, mobile overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
