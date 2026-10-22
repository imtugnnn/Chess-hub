// Development-only review with synthetic data. All API requests are intercepted.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const user = { id: 'review-owner', fullName: 'Nguyễn Minh Anh', email: 'minhanh@example.com' };
const members = [
  { ...user, role: 'OWNER' },
  { id: 'teacher-2', fullName: 'Trần Hoàng Nam', email: 'hoangnam@example.com', role: 'TEACHER' },
  { id: 'teacher-3', fullName: 'Lê Thảo Linh', email: 'thaolinh@example.com', role: 'TEACHER' },
];
const initial = { center: { name: 'Trung tâm cờ vua ChessHub', ownerUserId: user.id, ownerName: user.fullName }, members, incomingInvitations: [], outgoingInvitations: [{ id: 'invite-1', personName: 'Phạm Gia Huy', personEmail: 'giahuy@example.com' }] };
(async () => {
  require('node:fs').mkdirSync('../agent/.impeccable/review/center', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let dashboard = structuredClone(initial);
  let failDashboard = false;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (failDashboard && path.endsWith('/center')) return route.fulfill({ status: 503, json: { message: 'Không thể tải trung tâm. Vui lòng thử lại.' } });
    let body = [];
    if (path.endsWith('/auth/me')) body = user;
    else if (path.endsWith('/auth/csrf')) body = { headerName: 'X-CSRF-TOKEN', token: 'review' };
    else if (path.endsWith('/members/teacher-2/classes')) body = [{ id: 'class-1', name: 'Cờ vua căn bản', schedule: 'Thứ Ba · 17:30 – 19:00', studentCount: 12 }];
    else if (request.method() === 'DELETE' && path.includes('/members/')) { dashboard.members = dashboard.members.filter(member => !path.endsWith('/' + member.id)); body = dashboard; }
    else if (path.endsWith('/invitations') && request.method() === 'POST') { dashboard.outgoingInvitations.push({ id: 'invite-2', personName: '', personEmail: request.postDataJSON().email }); body = { dashboard, delivery: 'APP' }; }
    else if (path.endsWith('/center')) body = dashboard;
    await route.fulfill({ json: body });
  });
  await page.goto('http://127.0.0.1:5174/center');
  await page.getByText(initial.center.name, { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const before = process.argv.includes('--before');
  const capture = !process.argv.includes('--no-capture');
  if (capture) await page.screenshot({ path: `../agent/.impeccable/review/center/center-${before ? 'before' : 'desktop'}.png`, fullPage: true });
  if (!before) {
    const avatarSize = await page.locator('.center-avatar').first().boundingBox();
    assert.equal(avatarSize.width, 36);
    assert.equal(avatarSize.height, 36);
    await page.getByLabel('Tìm thành viên').fill('không tồn tại');
    await page.getByRole('heading', { name: 'Không tìm thấy thành viên' }).waitFor();
    await page.getByLabel('Tìm thành viên').fill('');
    await page.getByLabel('Tìm thành viên').fill('hoangnam');
    assert.equal(await page.locator('.center-member-row').count(), 1);
    await page.getByRole('button', { name: 'Xóa tìm kiếm' }).click();
    await page.getByRole('button', { name: 'Xem lớp học' }).nth(1).click();
    await page.getByText('Cờ vua căn bản', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng lớp học' }).click();
    await page.getByLabel('Email giáo viên').fill('new@example.com');
    await page.getByRole('button', { name: 'Gửi lời mời' }).click();
    await page.getByRole('status').filter({ hasText: 'Đã gửi lời mời' }).waitFor();
    await page.getByRole('button', { name: 'Xóa khỏi trung tâm' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();
    assert.equal(await page.locator('.center-member-row').count(), 3);
    await page.getByRole('button', { name: 'Xóa khỏi trung tâm' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Xóa khỏi trung tâm' }).click();
    await page.getByRole('status').filter({ hasText: 'Đã xóa thành viên' }).waitFor();
    assert.equal(await page.locator('.center-member-row').count(), 2);
    dashboard = structuredClone(initial);
    await page.reload();
    await page.getByText(initial.center.name, { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    if (capture) await page.screenshot({ path: '../agent/.impeccable/review/center/center-mobile.png', fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
    dashboard = { ...structuredClone(initial), center: { ...initial.center, ownerUserId: 'someone-else' } };
    await page.reload();
    await page.getByText(initial.center.name, { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Email giáo viên').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Xóa khỏi trung tâm' }).count(), 0);
    dashboard = { center: null, members: [], outgoingInvitations: [], incomingInvitations: [{ id: 'incoming-1', centerName: 'Trung tâm mẫu', personName: 'Giáo viên mẫu', personEmail: 'demo@example.com' }] };
    await page.reload();
    await page.getByRole('heading', { name: 'Tạo trung tâm' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Chấp nhận' }).count(), 1);
    failDashboard = true;
    await page.reload();
    await page.getByRole('alert').waitFor();
    failDashboard = false;
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await page.getByRole('heading', { name: 'Tạo trung tâm' }).waitFor();
    dashboard = structuredClone(initial);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('http://127.0.0.1:5174/homepage');
    await page.getByRole('heading', { name: 'Chào Anh, hôm nay dạy lớp nào?', exact: true }).waitFor();
    if (capture) await page.screenshot({ path: '../agent/.impeccable/review/center/design-system-overview.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: search/empty results, avatars, class details, invitation, cancel/confirm removal, mobile overflow, teacher permissions, no-center invitation, error/retry, overview, browser errors');
  }
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
