// Development-only review with synthetic data. All API requests are intercepted.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = '../agent/.impeccable/review/center';
const user = { id: 'review-owner', fullName: 'Nguyễn Minh Anh', email: 'minhanh@example.com' };
const members = [
  { ...user, role: 'OWNER' },
  { id: 'teacher-2', fullName: 'Trần Hoàng Nam', email: 'hoangnam@example.com', role: 'TEACHER' },
  { id: 'teacher-3', fullName: 'Lê Thảo Linh', email: 'thaolinh@example.com', role: 'TEACHER' },
];
const initial = { center: { name: 'Trung tâm cờ vua ChessHub', ownerUserId: user.id, ownerName: user.fullName }, members, incomingInvitations: [], outgoingInvitations: [{ id: 'invite-1', personName: 'Phạm Gia Huy', personEmail: 'giahuy@example.com' }] };
(async () => {
  fs.mkdirSync(output, { recursive: true });
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
  await page.goto(`${process.env.CENTER_REVIEW_URL || 'http://127.0.0.1:5174'}/center`);
  await page.getByText(initial.center.name, { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const before = process.argv.includes('--before');
  const capture = !process.argv.includes('--no-capture');
  if (capture) await page.screenshot({ path: `${output}/center-${before ? 'before' : 'desktop'}.png`, fullPage: true });
  if (!before) {
    assert.equal(await page.getByRole('heading', { name: 'Quản lý trung tâm', exact: true }).count(), 1);
    assert.equal(await page.locator('.center-summary').count(), 0);
    assert.equal(await page.locator('.center-identity').getByText(user.fullName).count(), 0);
    assert.equal(await page.locator('.center-count').count(), 2);
    const membersPanel = await page.locator('.center-members').boundingBox();
    const invitePanel = await page.locator('.center-invite').boundingBox();
    assert.equal(membersPanel.y, invitePanel.y, 'Member and invitation cards align on desktop');
    assert(invitePanel.x >= membersPanel.x + membersPanel.width, 'Invitation card is to the right of members');
    const memberTop = await page.locator('.center-member-row').first().boundingBox();
    assert(memberTop.y < 470, 'First member is visible near the top of the workspace');
    await page.getByText('Cách nhận lời mời', { exact: true }).click();
    await page.getByText(/Người đã có tài khoản nhận lời mời/).waitFor({ state: 'visible' });
    await page.getByText('Cách nhận lời mời', { exact: true }).click();
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
    const emailField = await page.getByLabel('Email giáo viên').boundingBox();
    assert(emailField.height <= 48, 'Mobile invitation input keeps its normal control height');
    if (capture) await page.screenshot({ path: `${output}/center-mobile.png`, fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
    dashboard.members[1].fullName = 'Giáo viên có tên rất dài cần xuống dòng để hiển thị đầy đủ';
    dashboard.members[1].email = `${'teacher'.repeat(10)}@example.com`;
    await page.reload();
    await page.getByText(dashboard.members[1].email, { exact: true }).waitFor();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Long content overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
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
    await page.goto(`${process.env.CENTER_REVIEW_URL || 'http://127.0.0.1:5174'}/homepage`);
    await page.getByRole('heading', { name: 'Chào Anh, hôm nay dạy lớp nào?', exact: true }).waitFor();
    if (capture) await page.screenshot({ path: `${output}/design-system-overview.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: single title and counts, compact member position, invitation help, search/empty results, avatars, class details, invitation, cancel/confirm removal, mobile overflow, teacher permissions, no-center invitation, error/retry, browser errors');
  }
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
