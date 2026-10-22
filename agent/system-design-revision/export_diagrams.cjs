const {chromium}=require('C:/Users/Lamtu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:2});
 for(const slug of ['packages','classes','schedule-sequence','database']){
  await page.goto('file:///'+path.resolve('agent/design/'+slug+'.html').replaceAll('\\','/')+'?theme=light');
  await page.addStyleTag({content:'svg text { font-family:Calibri,sans-serif !important; } * { animation:none !important; }'});
  await page.waitForTimeout(150);
  const sizes=await page.locator('svg').evaluateAll(es=>es.map((e,i)=>({i,size:e.getBoundingClientRect().width*e.getBoundingClientRect().height})));sizes.sort((a,b)=>b.size-a.size);
  const svg=page.locator('svg').nth(sizes[0].i);
  await svg.screenshot({path:'docs/images/chesshub-'+slug+'.png'});
  const result=await svg.evaluate(el=>{
   const clone=el.cloneNode(true),src=[el,...el.querySelectorAll('*')],dst=[clone,...clone.querySelectorAll('*')];
   const props=['fill','fill-opacity','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight','font-style','text-anchor','dominant-baseline','paint-order','marker-end','marker-start'];
   src.forEach((e,i)=>{const cs=getComputedStyle(e);dst[i].setAttribute('style',props.map(p=>p+':'+cs.getPropertyValue(p).replace(/url\(["']?[^)"']*#([^\)"']+)["']?\)/g,'url(#$1)')).join(';'));});
   return clone.outerHTML;
  });
  fs.writeFileSync('docs/images/chesshub-'+slug+'.svg',result);
  console.log('Exported Calibri',slug);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
