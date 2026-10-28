// Local UI verification: synthetic responses, no email is sent.
const { chromium } = require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.resolve(__dirname, '../../agent/.impeccable/review/password-recovery');
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', error => errors.push(error.message));
    let resetPayload;
    await page.route('**/api/**', route => {
      const request = route.request(); const url = new URL(request.url());
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: 401, json: {} });
      if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ json: { google: false } });
      if (url.pathname.endsWith('/auth/csrf')) return route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'test' } });
      if (url.pathname.endsWith('/auth/forgot-password')) return route.fulfill({ json: { message: 'Nếu email này đã có tài khoản, bạn sẽ nhận được link đặt lại mật khẩu. Hãy kiểm tra cả thư mục spam.' } });
      if (url.pathname.endsWith('/auth/reset-password')) {
        resetPayload = request.postDataJSON();
        return route.fulfill({ json: { message: 'Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.' } });
      }
      return route.fulfill({ json: {} });
    });
    async function capture(route) {
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `${route}-${name}.png`), fullPage: true });
    }
    await page.goto('http://127.0.0.1:5176/login');
    await page.getByRole('heading', { name: 'Đăng nhập vào ChessHub' }).waitFor();
    await page.getByLabel('Mật khẩu', { exact: true }).fill('Password123');
    await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
    assert.equal(await page.getByLabel('Mật khẩu', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
    await capture('login');
    await page.getByRole('button', { name: 'Thay đổi mật khẩu', exact: true }).click();
    await page.getByRole('heading', { name: 'Thay đổi mật khẩu', exact: true }).waitFor();
    await page.goto('http://127.0.0.1:5176/login');
    await page.getByRole('button', { name: 'Quên mật khẩu?', exact: true }).click();
    await capture('forgot');
    await page.getByLabel('Email', { exact: true }).fill('teacher@example.com');
    await page.getByRole('button', { name: 'Gửi link đặt lại mật khẩu' }).click();
    await page.getByRole('status').waitFor();
    const token = 'a'.repeat(43);
    await page.goto('http://127.0.0.1:5176/reset-password#token=' + token);
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPassword123');
    await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill('DifferentPassword123');
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(new URL(page.url()).hash, '');
    await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill('NewPassword123');
    await capture('reset');
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await page.getByRole('status').waitFor();
    assert.deepEqual(resetPayload, { token, password: 'NewPassword123' });
    await page.goto('http://127.0.0.1:5176/reset-password');
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).count(), 0);
    await page.close();
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Desktop/mobile password recovery UI passed; six screenshots saved in ' + output);
})().catch(error => { console.error(error); process.exit(1); });


