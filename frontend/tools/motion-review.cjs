// All API traffic is intercepted. No real records are created or changed.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.argv[2] || process.env.MOTION_REVIEW_URL || 'http://127.0.0.1:5179';
const output = '../agent/.impeccable/review/motion';
const teacher = { id: 'motion-teacher', fullName: 'Nguyễn Minh Anh', email: 'owner@example.com' };
const classroom = { id: '33333333-3333-3333-3333-333333333333', name: 'Lớp cờ căn bản', schedule: 'Thứ Sáu', feePerSession: 100000, studentCount: 1 };
const student = { id: 'student-1', fullName: 'Nguyễn Minh An', birthDate: '2016-05-12', parentName: '', parentPhoneNumber: '', phoneNumber: '', notes: '' };
const session = { id: 'session-1', date: '2026-10-16', startTime: '17:00:00', endTime: '18:00:00', hasAttendance: false };

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let signedIn = false, failSave = false, students = [student], classes = [classroom];
      let attendance = [], invitations = [];
      const dashboard = () => ({ center: { name: 'Trung tâm cờ', ownerUserId: teacher.id, ownerName: teacher.fullName }, members: [{ ...teacher, role: 'OWNER' }], incomingInvitations: [], outgoingInvitations: invitations });
      await page.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
        let json = [];
        if (path.endsWith('/auth/me')) return route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? teacher : {} });
        if (path.endsWith('/auth/csrf')) json = { headerName: 'X-CSRF-TOKEN', token: 'review' };
        else if (path.endsWith('/center/invitations') && method === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 250));
          invitations = [...invitations, { id: 'invite-new', personEmail: request.postDataJSON().email }];
          json = { dashboard: dashboard(), delivery: 'APP' };
        } else if (path.endsWith('/center')) json = dashboard();
        else if (path.endsWith('/attendance') && method === 'PUT') {
          await new Promise(resolve => setTimeout(resolve, 300));
          if (failSave) return route.fulfill({ status: 500, json: { message: 'Lỗi lưu thử nghiệm' } });
          attendance = request.postDataJSON().records.map(item => ({ ...item, fullName: student.fullName })); json = attendance;
        } else if (path.endsWith('/attendance')) json = attendance;
        else if (path.endsWith('/students') && method === 'POST') {
          students = [...students, { ...student, ...request.postDataJSON(), id: 'student-new' }]; json = students.at(-1);
        } else if (path.endsWith('/students')) json = { items: [], total: 0, page: 0, size: 8 };
        else if (path.endsWith('/classes/33333333-3333-3333-3333-333333333333')) json = { chessClass: classroom, students, sessions: [session] };
        else if (path.endsWith('/classes') && method === 'POST') { const created = { ...classroom, id: 'class-new', name: request.postDataJSON().name }; classes.push(created); json = { chessClass: created }; }
        else if (path.endsWith('/classes')) json = classes;
        else if (path.endsWith('/sessions')) json = [{ ...session, date: url.searchParams.get('from') || session.date, classId: classroom.id, className: classroom.name, studentCount: 1, attendanceCount: 0 }];
        return route.fulfill({ json });
      });
      const screenshot = name => page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
      const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}: ${page.url()}`);
      await page.goto(base);
      const track = page.locator('.lp-carousel-track');
      await track.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
      const progress = () => track.evaluate(el => Number(el.style.getPropertyValue('--workflow-progress')));
      await page.waitForTimeout(400); const initialProgress = await progress();
      await page.waitForTimeout(300); assert(await progress() > initialProgress, 'Progress advances');
      await track.hover(); const paused = await progress(); await page.waitForTimeout(250);
      assert(Math.abs(await progress() - paused) < .01, 'Hover pauses progress');
      await page.mouse.move(0, 0); await page.waitForTimeout(250); assert(await progress() > paused, 'Progress resumes');
      await noOverflow(); await screenshot('walkthrough');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = await progress(); await page.waitForTimeout(250); assert(Math.abs(await progress() - reduced) < .01);
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      signedIn = true;
      await page.goto(`${base}/calendar`);
      await page.locator('.schedule-week-transition').waitFor();
      await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
      await page.locator('.schedule-week-transition--next').waitFor();
      assert.equal(await page.locator('.schedule-week-transition').evaluate(el => getComputedStyle(el).animationName), 'schedule-next');
      await page.getByRole('button', { name: 'Tuần trước', exact: true }).click();
      await page.locator('.schedule-week-transition--previous').waitFor();
      await noOverflow(); await screenshot('calendar');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.schedule-week-transition').evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await page.goto(`${base}/classes/33333333-3333-3333-3333-333333333333?sessionId=session-1`);
      await page.locator('.attendance-student').waitFor({ timeout: 5000 }).catch(async error => { console.log(await page.locator('body').innerText()); console.log(errors); throw error; });
      const present = page.getByRole('button', { name: 'Có mặt', exact: true });
      await present.click(); assert.equal(await present.getAttribute('aria-pressed'), 'true');
      assert.equal(await present.evaluate(el => getComputedStyle(el).transitionDuration), '0.18s, 0.18s, 0.18s');
      await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
      await page.getByRole('button', { name: 'Đang lưu…', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Đã lưu', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Vắng', exact: true }).click(); failSave = true;
      await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
      await page.getByText('Lỗi lưu thử nghiệm', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Đã lưu', exact: true }).count(), 0);
      failSave = false; await noOverflow(); await screenshot('attendance');

      await page.goto(`${base}/classes/33333333-3333-3333-3333-333333333333?tab=students&add=student`);
      await page.locator('.workspace-form').waitFor();
      assert.equal(await page.locator('.row-added').count(), 0, 'Initial rows are not highlighted');
      const inputs = page.locator('.student-entry-fields input');
      await inputs.nth(0).fill('Trần Minh Bình'); await inputs.nth(1).fill('2016-02-03');
      await page.locator('.workspace-form').getByRole('button', { name: 'Thêm học sinh', exact: true }).click();
      await page.locator('tr.row-added').waitFor();
      await noOverflow(); await screenshot('new-student');
      await page.waitForTimeout(1650); assert.equal(await page.locator('.row-added').count(), 0);

      await page.goto(`${base}/classes/new?date=2026-10-16`);
      await page.getByLabel('Tên lớp', { exact: true }).fill('Lớp cờ mới');
      await page.getByLabel('Học phí mỗi buổi (VNĐ)', { exact: true }).fill('100000');
      await page.getByLabel('Bắt đầu', { exact: true }).fill('17:00');
      await page.getByLabel('Kết thúc', { exact: true }).fill('18:00');
      await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
      await page.locator('.overview-row.row-added').waitFor();
      assert((await page.locator('.overview-row.row-added').innerText()).includes('Lớp cờ mới'));

      await page.goto(`${base}/center`);
      await page.getByLabel('Email giáo viên').fill('new@example.com');
      await page.getByRole('button', { name: 'Gửi lời mời', exact: true }).click();
      await page.getByRole('button', { name: 'Đang gửi…', exact: true }).waitFor();
      await page.locator('.center-row.row-added').waitFor();
      await page.getByRole('button', { name: 'Đã gửi lời mời', exact: true }).waitFor();
      await noOverflow(); await screenshot('invitation');
      assert.deepEqual(errors, []); await page.close();
    }
    console.log('Motion review passed: desktop/mobile, timed progress and pause/resume, directional weeks, reduced motion, attendance save success/failure, new student/class/invitation highlights, overflow and browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
