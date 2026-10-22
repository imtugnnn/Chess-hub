// API traffic is fully intercepted. This review does not access real student data.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.STUDENT_IMPORT_REVIEW_URL || 'http://127.0.0.1:5183';
const classId = '33333333-3333-3333-3333-333333333333';
const teacher = { id: '11111111-1111-1111-1111-111111111111', fullName: 'Nguyễn Minh Anh' };
const fields = ['fullName', 'birthDate', 'parentName', 'parentPhoneNumber', 'phoneNumber', 'notes'].map((key, i) => ({ key, label: ['Họ tên học sinh', 'Ngày sinh', 'Tên phụ huynh', 'SĐT phụ huynh', 'SĐT học sinh', 'Ghi chú'][i], aliases: [['Tên bé'], [], [], [], [], []][i] }));
(async () => {
  fs.mkdirSync('../agent/.impeccable/review/student-import', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], commits = []; let confirmed = false, firstCommit = true;
    page.on('pageerror', e => errors.push(e.message));
    function preview(rows) {
      return rows.map(row => {
        const duplicate = row.rowNumber === 6 && row.values.fullName === 'An' || row.rowNumber === 1 && row.values.fullName === 'An';
        return { rowNumber: row.rowNumber, action: row.values.birthDate === 'sai' || duplicate ? 'ERROR' : row.values.birthDate ? 'CREATE_PROFILE' : 'CLASS_ONLY',
          message: duplicate ? row.rowNumber === 1 ? 'Học sinh đã có trong lớp.' : 'Học sinh bị trùng trong danh sách nhập. Hãy kiểm tra lại dòng này.' : row.values.birthDate === 'sai' ? 'Ngày sinh không hợp lệ.' : row.values.birthDate ? 'Tạo hồ sơ và thêm vào lớp' : 'Chỉ thêm vào lớp', candidates: [], success: false };
      });
    }
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const classroom = { id: classId, name: 'Lớp cờ căn bản', schedule: '', feePerSession: 100000, studentCount: 0, centerId: null, scopeConfirmed: confirmed };
      let json = [];
      if (path.endsWith('/auth/me')) json = teacher;
      else if (path.endsWith('/auth/csrf')) json = { headerName: 'X-CSRF-TOKEN', token: 'review' };
      else if (path.endsWith('/students/options')) json = { centers: [], classes: [classroom] };
      else if (path.endsWith('/scope')) { confirmed = true; json = { ...classroom, scopeConfirmed: true }; }
      else if (path.endsWith('/import/read')) json = { sheets: ['Danh sách', 'Khác'], sheetIndex: 0, fields, rows: [
        { rowNumber: 2, cells: ['Tên bé', 'Ngày sinh', 'SĐT phụ huynh'] },
        { rowNumber: 3, cells: ['An', '', ''] }, { rowNumber: 4, cells: ['Bình', '2016-02-03', '0901234567'] },
        { rowNumber: 5, cells: ['Chi', 'sai', ''] }, { rowNumber: 6, cells: ['An', '', ''] },
      ] };
      else if (path.endsWith('/import/preview')) json = preview(req.postDataJSON().rows);
      else if (path.endsWith('/import/commit')) {
        const batch = req.postDataJSON(); commits.push(batch);
        if (firstCommit) { firstCommit = false; return route.fulfill({ status: 503, json: { message: 'Mất kết nối. Hãy thử lại.' } }); }
        json = preview(batch.rows).map(r => ({ ...r, membershipId: r.rowNumber === 6 ? 'member-3' : `member-${r.rowNumber}`, studentId: r.action === 'CREATE_PROFILE' ? `profile-${r.rowNumber}` : null, profileCreated: r.action === 'CREATE_PROFILE', enrolled: r.rowNumber !== 6, success: !['ERROR', 'RESOLVE'].includes(r.action) }));
      } else if (path.endsWith('/students')) json = { items: [], total: 0, page: 0, size: 25 };
      else if (path.endsWith(`/classes/${classId}`)) json = { chessClass: classroom, students: [], sessions: [] };
      else if (path.endsWith('/classes')) json = [classroom];
      else if (path.endsWith('/center')) json = { incomingInvitations: [], outgoingInvitations: [], members: [] };
      return route.fulfill({ json });
    });
    await page.goto(`${base}/classes/${classId}?tab=students&add=excel`);
    await page.getByRole('heading', { name: 'Xác nhận phạm vi của lớp' }).waitFor();
    await page.getByLabel(/Lớp thuộc/).selectOption('personal');
    await page.getByRole('button', { name: 'Xác nhận phạm vi', exact: true }).click();
    await page.getByLabel(/File Excel/).setInputFiles({ name: 'students.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('mocked workbook') });
    await page.getByRole('button', { name: 'Kiểm tra và xem trước' }).click();
    await page.getByText('Học sinh bị trùng trong danh sách nhập.', { exact: false }).waitFor();
    assert.equal(await page.getByText('Xác nhận là học sinh khác', { exact: true }).count(), 0);
    await page.getByLabel('Họ tên học sinh, dòng 6', { exact: true }).fill('Dũng');
    await page.getByLabel('Ngày sinh, dòng 5', { exact: true }).fill('2017-05-06');
    assert(await page.getByRole('button', { name: /Nhập .*dòng hợp lệ/ }).isDisabled());
    await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).click();
    await page.getByRole('button', { name: 'Nhập 4 dòng hợp lệ', exact: true }).waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `horizontal overflow at ${width}`);
      await page.screenshot({ path: `../agent/.impeccable/review/student-import/preview-${width}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Nhập 4 dòng hợp lệ', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Mất kết nối' }).waitFor();
    await page.getByRole('button', { name: 'Nhập 4 dòng hợp lệ', exact: true }).click();
    await page.getByText('Đã xử lý danh sách.', { exact: false }).waitFor();
    assert.equal(commits.length, 2); assert.equal(commits[0].importId, commits[1].importId);
    assert.equal(commits[1].rows[1].values.parentPhoneNumber, '0901234567');
    assert.equal(commits[1].rows[3].values.fullName, 'Dũng');
    assert.deepEqual(errors, []);
    await page.goto(`${base}/classes/${classId}?tab=students&add=student`);
    await page.locator('.student-entry-fields input').first().fill('An');
    await page.getByRole('button', { name: 'Thêm học sinh', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Học sinh đã có trong lớp.' }).waitFor();
    assert.equal(await page.getByLabel('Xử lý trùng tên', { exact: false }).count(), 0);
    await page.goto(`${base}/classes/new?date=2026-10-17`);
    await page.getByLabel(/Lớp thuộc/).waitFor();
    await page.locator('.student-entry-fields input').first().fill('Chỉ có tên');
    await page.getByRole('button', { name: /Thêm học sinh mới: Chỉ có tên/ }).click();
    await page.getByRole('button', { name: 'Thêm vào danh sách', exact: true }).click();
    await page.getByRole('table', { name: 'Danh sách học sinh chờ tạo lớp' }).waitFor();
    console.log('PASS: scope confirmation, Excel mapping, correction, duplicate errors without confirmation, retry import ID, desktop/mobile overflow and name-only manual entry.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
