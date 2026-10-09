// Uses the bundled desktop Playwright runtime; override executable as needed.
import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
 for(const [name,width,height] of [['pc',1440,900],['phone',375,812],['landscape',812,375]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:name!=='pc',hasTouch:name!=='pc'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto((process.env.ASTRA_URL||'http://127.0.0.1:5174/spatial/')+'#galaxy',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#cosmos')?.dataset.sceneReady==='true');await page.waitForTimeout(2200);
  const hint=await page.locator('#space-hint').boundingBox();assert.ok(hint.x>=0&&hint.x+hint.width<=width,'hint fits');
  if(name!=='pc')assert.ok(!requests.some(url=>url.includes('8192.jpg')),'no mobile 8K request');
  await page.screenshot({path:`artifacts/fixed-${name}-galaxy.png`});
  let previousRoute;
  for(const route of ['login','register','today','astrology','results','profile','observatory']){
   if(route==='observatory')previousRoute=await page.evaluate(()=>location.hash);
   await page.evaluate(r=>location.hash=r,route);await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow');
   if(route==='login')await page.screenshot({path:`artifacts/fixed-${name}-login.png`});
  }
  await page.waitForTimeout(1500);
  await page.locator('[data-action="zoom-in"]').click();
  await page.evaluate(()=>{for(let i=0;i<50;i++)document.querySelector('[data-action="zoom-in"]').click()});await page.waitForTimeout(300);
  const first=await page.locator('#cosmos').getAttribute('data-camera-position');
  await page.evaluate(()=>{for(let i=0;i<20;i++)document.querySelector('[data-action="zoom-in"]').click()});await page.waitForTimeout(300);
  const second=await page.locator('#cosmos').getAttribute('data-camera-position');assert.equal(first,second,'zoom stops at minimum');
  await page.screenshot({path:`artifacts/fixed-${name}-observatory.png`});
  await page.goBack();assert.equal(await page.evaluate(()=>location.hash),previousRoute);
  assert.deepEqual(errors,[]);console.log(name,'PASS',first,await page.locator('#cosmos').getAttribute('data-origin-texture'));await page.close();
 }
}finally{await browser.close();}
