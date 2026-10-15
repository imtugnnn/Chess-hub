const {chromium}=require('C:/Users/imtun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',r=>r.fulfill({json:r.request().url().endsWith('/auth/me')?{id:'11111111-1111-1111-1111-111111111111',fullName:'Giáo viên thử nghiệm'}:[]}));
await page.goto('http://localhost:5175/board-lab');await page.locator('.sidebar').waitFor();await page.evaluate(()=>document.fonts.ready);
const measure=()=>page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {rail:rect('.sidebar'),logo:rect('.sidebar .brand-mark'),toggle:rect('.sidebar-collapse-toggle'),profile:rect('.profile-card'),icons:[...document.querySelectorAll('.sidebar .nav-item > span:first-child')].map(e=>e.getBoundingClientRect().y),overflow:document.documentElement.scrollWidth>innerWidth}});
const expanded=await measure();await page.screenshot({path:'.impeccable/review/sidebar/expanded.png'});
await page.evaluate(()=>{window.samples=[];const until=performance.now()+400;function sample(){window.samples.push(document.querySelector('.sidebar').getBoundingClientRect().width);if(performance.now()<until)requestAnimationFrame(sample)}document.querySelector('.sidebar-collapse-toggle').click();requestAnimationFrame(sample)});
await page.waitForTimeout(450);const collapsed=await measure();const samples=await page.evaluate(()=>window.samples);await page.screenshot({path:'.impeccable/review/sidebar/collapsed.png'});
await page.getByRole('button',{name:'Lớp học',exact:true}).click();await page.locator('.sidebar-flyout').waitFor();await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Mở rộng thanh điều hướng'}).click();await page.waitForTimeout(350);const reopened=await measure();
await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.locator('.app-shell').evaluate(e=>getComputedStyle(e).transitionDuration);
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Mở điều hướng',exact:true}).click();await page.screenshot({path:'.impeccable/review/sidebar/mobile.png'});
const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,toggle:getComputedStyle(document.querySelector('.sidebar-collapse-toggle')).display}));
console.log(JSON.stringify({expanded,collapsed,reopened,samples,reduced,mobile,errors},null,2));await browser.close();
})();

