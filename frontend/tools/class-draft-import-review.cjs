// No production data: all API reads/writes are intercepted.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.DRAFT_IMPORT_REVIEW_URL || 'http://127.0.0.1:5194';
const output = '../agent/.impeccable/review/class-draft-import';
const teacher = { id: '11111111-1111-1111-1111-111111111111', fullName: 'Giáo viên minh họa' };
const profileId = '22222222-2222-2222-2222-222222222222';
const fields = ['fullName', 'birthDate', 'parentName', 'parentPhoneNumber', 'phoneNumber', 'notes'].map((key, index) => ({ key, label: ['Họ tên học sinh', 'Ngày sinh', 'Tên phụ huynh', 'SĐT phụ huynh', 'SĐT học sinh', 'Ghi chú'][index], aliases: [] }));
const workbook = { sheets: ['Danh sách'], sheetIndex: 0, fields, rows: [
  { rowNumber: 1, cells: ['Họ tên học sinh', 'Ngày sinh', 'SĐT phụ huynh'] },
  { rowNumber: 2, cells: ['Trần Minh An', '12/03/2017', '0901234567'] },
  { rowNumber: 3, cells: ['Lê Gia Bình', 'sai', '0912345678'] },
  { rowNumber: 4, cells: ['Đã nhập tay', '', ''] },
  { rowNumber: 5, cells: ['Hồ sơ cũ', '', ''] },
] };
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
    const errors = [], creates = [], previews = [];
    let failPreview = true, failCreate = true, fileReads = 0, largeWorkbook = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      let json = [], status = 200;
      if (path.endsWith('/auth/me')) json = teacher;
      else if (path.endsWith('/auth/csrf')) json = { headerName: 'X-CSRF-TOKEN', token: 'review' };
      else if (path.endsWith('/students/options')) json = { centers: [], classes: [] };
      else if (path.endsWith('/classes/students/import/read')) { fileReads++; json = largeWorkbook ? { ...workbook, rows: [{ rowNumber: 1, cells: ['Danh sách lớp'] }, { ...workbook.rows[0], rowNumber: 2 }, ...Array.from({ length: 26 }, (_, index) => ({ rowNumber: index + 3, cells: [`Học sinh ${index + 1}`, '', ''] }))] } : workbook; }
      else if (path.endsWith('/classes/students/import/preview')) {
        const batch = request.postDataJSON(); previews.push(batch);
        if (failPreview) { failPreview = false; status = 503; json = { message: 'Mất kết nối kiểm tra. Hãy thử lại.' }; }
        else json = batch.rows.map(row => {
          const values = row.values, repeated = batch.rows.some(other => other.rowNumber < row.rowNumber && other.values.fullName.trim().toLowerCase() === values.fullName.trim().toLowerCase());
          if (repeated || values.birthDate === 'sai') return { rowNumber: row.rowNumber, action: 'ERROR', message: repeated ? 'Học sinh bị trùng trong danh sách nhập.' : 'Ngày sinh không hợp lệ.', candidates: [] };
          if (values.fullName === 'Hồ sơ cũ' && !row.studentId) return { rowNumber: row.rowNumber, action: 'RESOLVE', message: 'Có hồ sơ trùng tên. Hãy chọn hồ sơ có sẵn.', candidates: [{ studentId: profileId, fullName: 'Hồ sơ cũ', birthDate: '2016-04-05', parentPhoneNumber: '0987654321' }] };
          return { rowNumber: row.rowNumber, action: row.studentId ? 'REUSE' : values.birthDate ? 'CREATE_PROFILE' : 'CLASS_ONLY', message: row.studentId ? 'Dùng hồ sơ có sẵn' : 'Hợp lệ, chưa lưu', candidates: [], student: { ...values, birthDate: values.birthDate === '12/03/2017' ? '2017-03-12' : values.birthDate || null, studentId: row.studentId || null } };
        });
      }
      else if (path.endsWith('/students')) json = { items: [], total: 0, page: 0 };
      else if (path.endsWith('/classes') && request.method() === 'POST') {
        creates.push(request.postDataJSON());
        if (failCreate) { failCreate = false; status = 409; json = { message: 'Lịch bị trùng. Danh sách chưa được lưu.' }; }
        else json = { chessClass: { id: '33333333-3333-3333-3333-333333333333' } };
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    });
    await page.goto(`${base}/classes/new?date=2026-11-03`);
    await page.getByLabel('Tên lớp', { exact: true }).fill('Cờ vua căn bản');
    await page.getByLabel('Học phí mỗi buổi (VNĐ)', { exact: true }).fill('150000');
    await page.getByLabel('Bắt đầu', { exact: true }).fill('17:30');
    await page.getByLabel('Kết thúc', { exact: true }).fill('19:00');
    await page.getByRole('combobox', { name: 'Họ và tên học sinh', exact: true }).fill('Đã nhập tay');
    await page.getByRole('button', { name: /Thêm học sinh mới:/ }).click();
    await page.getByRole('button', { name: 'Thêm vào danh sách', exact: true }).click();
    await page.getByRole('button', { name: 'Nhập danh sách', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Nhập Excel sau khi tạo lớp', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Nhập từ Excel', exact: true }).click();
    const fileInput = page.getByLabel('File Excel (.xlsx, tối đa 5 MB)', { exact: true });
    await fileInput.setInputFiles({ name: 'wrong.csv', mimeType: 'text/csv', buffer: Buffer.from('name') });
    await page.getByRole('alert').filter({ hasText: 'Chọn file .xlsx' }).waitFor();
    assert.equal(fileReads, 0);
    await fileInput.setInputFiles({ name: 'students.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('mock workbook') });
    await page.getByRole('alert').filter({ hasText: 'Mất kết nối kiểm tra' }).waitFor();
    assert.equal(await page.getByLabel('Họ tên học sinh, dòng 2', { exact: true }).inputValue(), 'Trần Minh An');
    assert.equal(creates.length, 0);
    await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).click();
    await page.getByText('Ngày sinh không hợp lệ.', { exact: true }).waitFor();
    await page.getByText('Học sinh bị trùng trong danh sách nhập.', { exact: true }).waitFor();
    await page.getByText('Có hồ sơ trùng tên. Hãy chọn hồ sơ có sẵn.', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: 'Đưa 4 học sinh vào danh sách', exact: true }).isDisabled());
    await page.getByText('Sửa thông tin dòng 3', { exact: true }).click();
    await page.getByLabel('Ngày sinh, dòng 3', { exact: true }).press('Enter');
    assert.equal(await page.getByRole('alert').filter({ hasText: 'nội dung học sinh đang nhập' }).count(), 0);
    await page.getByText('Sửa thông tin dòng 3', { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'nội dung học sinh đang nhập' }).waitFor();
    assert.equal(creates.length, 0);
    for (const width of [1600, 1366, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1050 });
      await page.evaluate(() => document.fonts.ready);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow ${width}`);
      await page.screenshot({ path: `${output}/${width === 390 ? 'mobile' : width === 1600 ? 'desktop' : 'laptop'}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1600, height: 1050 });
    await page.getByText('Sửa thông tin dòng 3', { exact: true }).click();
    await page.getByLabel('Ngày sinh, dòng 3', { exact: true }).fill('2017-02-03');
    await page.getByRole('button', { name: 'Bỏ dòng 4', exact: true }).click();
    await page.getByText('Sửa thông tin dòng 5', { exact: true }).click();
    await page.getByLabel('Họ tên học sinh, dòng 5', { exact: true }).fill('Tên khác');
    assert.equal(await page.getByLabel('Hồ sơ phù hợp, dòng 5', { exact: true }).count(), 0);
    await page.getByLabel('Họ tên học sinh, dòng 5', { exact: true }).fill('Hồ sơ cũ');
    await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).click();
    await page.getByLabel('Hồ sơ phù hợp, dòng 5', { exact: true }).selectOption(profileId);
    assert(await page.getByRole('button', { name: 'Đưa 3 học sinh vào danh sách', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).click();
    const apply = page.getByRole('button', { name: 'Đưa 3 học sinh vào danh sách', exact: true });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('Đưa 3 học sinh') && !button.disabled));
    await apply.click();
    await page.getByRole('status').filter({ hasText: 'Đã đưa 3 học sinh từ Excel' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'nội dung học sinh đang nhập' }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('row').count(), 5);
    assert.equal(creates.length, 0);
    await page.screenshot({ path: `${output}/combined-roster.png`, fullPage: true });
    assert(previews.every(batch => batch.rows[0].values.fullName === 'Đã nhập tay'));
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Lịch bị trùng' }).waitFor();
    assert.equal(await page.getByRole('row').count(), 5);
    await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.waitForURL('**/homepage');
    const saved = creates.at(-1);
    assert.equal(saved.students.length, 4);
    assert.equal(saved.students[1].birthDate, '2017-03-12');
    assert.equal(saved.students[1].parentPhoneNumber, '0901234567');
    assert.equal(saved.students[3].studentId, profileId);
    largeWorkbook = true;
    await page.goto(`${base}/classes/new`);
    await page.getByRole('button', { name: 'Nhập danh sách', exact: true }).click();
    await page.getByRole('button', { name: 'Nhập từ Excel', exact: true }).click();
    await page.getByLabel('File Excel (.xlsx, tối đa 5 MB)', { exact: true }).setInputFiles({ name: 'metadata.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('mock workbook') });
    await page.getByRole('alert').filter({ hasText: 'Chưa nhận diện được cột họ tên' }).waitFor();
    await page.getByText('Điều chỉnh dòng tiêu đề và ghép cột', { exact: true }).click();
    await page.getByLabel('Dòng tiêu đề').selectOption('2');
    await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).click();
    await page.getByText('26 hợp lệ', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sau', exact: true }).click();
    await page.getByText('Học sinh 26', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Hủy nhập', exact: true }).click();
    assert.equal(await page.getByRole('table', { name: 'Danh sách học sinh chờ tạo lớp' }).count(), 0);
    assert.equal(creates.length, 2);
    assert.deepEqual(errors, []);
    console.log('PASS: pre-class file read and preview, retry retains rows, inline row errors, metadata/header remapping, 26-row pagination, Enter/stale-candidate guards, cancel, staged/file duplicates, existing profile choice, edit/remove/recheck, explicit apply, no early writes, combined create payload, failed create retention, no import redirect and responsive captures.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
