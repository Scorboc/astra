import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output='C:/Users/Admin/Documents/ChatGPT/Astra/artifacts/playcanvas-final-20261009';await mkdir(output,{recursive:true});
const base=process.env.ASTRA_TEST_URL??'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const report={errors:[],checks:[],viewports:[]};
async function appInfo(page){return page.evaluate(async()=>{const {pc}=await import('/src/galaxy/playcanvas-runtime.js'),app=pc.AppBase.getApplication();return {textures:['origin','aurora','velir','nereya','solis'].map(id=>{const texture=app.assets.find(id)?.resource;return {id,width:texture?.width,height:texture?.height};}),calls:app.stats.drawCalls.total,cameras:app.root.findComponents('camera').map(c=>({name:c.entity.name,target:!!c.renderTarget})),layers:app.scene.layers.layerList.map(l=>l.name)};});}
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();const prefix=viewport.width>700?'desktop':'mobile';
  page.on('pageerror',e=>report.errors.push(prefix+': '+e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(prefix+': '+m.text());});
  await page.goto(base+'/spatial/#galaxy');await page.waitForLoadState('networkidle');await page.waitForFunction(()=>document.querySelector('#cosmos')?.dataset.planetTextures==='ready',null,{timeout:60000});
  const info=process.env.ASTRA_TEST_URL?await page.locator('#cosmos').evaluate(e=>({...e.dataset})):await appInfo(page);if(info.textures)assert.ok(info.textures.every(t=>t.width>0));report.checks.push(prefix+': all five previews loaded');
  await page.screenshot({path:output+'/'+prefix+'-galaxy.png'});
  await page.locator('.main-nav a[href="#today"]').click();await page.locator('#panel-heading').waitFor();report.checks.push(prefix+': new-user entry opens '+(await page.locator('#panel-heading').textContent()));
  await page.evaluate(()=>location.hash='#login');await page.locator('#account-form input[name="login"]').fill('1');await page.locator('#account-form input[name="password"]').fill('1');await page.locator('#account-form button[type="submit"]').click();await page.waitForLoadState('networkidle');await page.waitForFunction(()=>document.querySelector('#cosmos')?.dataset.planetTextures==='ready'&&!document.querySelector('#account-form'),null,{timeout:60000});
  for(const route of ['today','astrology','results','profile']){
   await page.locator('.main-nav a[href="#'+route+'"]').click();await page.waitForFunction(route=>location.hash==='#'+route,route);assert.ok(await page.locator('#panel').isVisible());assert.ok((await page.locator('#panel-heading').textContent()).trim());report.checks.push(prefix+': '+route+' navigation');
  }
  await page.goBack();assert.ok(page.url().endsWith('#results'));await page.goForward();assert.ok(page.url().endsWith('#profile'));report.checks.push(prefix+': Back/Forward');
  await page.locator('.wordmark').click();await page.locator('.camera-tools').getByRole('button',{name:'Открыть обсерваторию',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#cosmos')?.dataset.observatory==='ready',null,{timeout:60000});await page.locator('.observatory-room .personal-atlas').waitFor({state:'visible'});assert.equal(await page.locator('#observatory-bar').count(),0);await page.screenshot({path:output+'/'+prefix+'-observatory.png'});
  await page.locator('.section-nav a[href="#results"]').click();await page.locator('#panel').waitFor({state:'visible'});assert.ok(page.url().endsWith('#results'));report.checks.push(prefix+': observatory to results');
  if(viewport.width>700){
   for(const id of ['origin','aurora','velir','nereya','solis']){await page.evaluate(id=>location.hash='#planet/'+id,id);await page.waitForFunction(()=>document.querySelector('#cosmos')?.dataset.cameraMode==='focus');await page.waitForTimeout(2500);assert.ok(await page.locator('#panel').isVisible());report.checks.push('desktop: world '+id);}
   await page.locator('.wordmark').click();await page.locator('.about-link').click();await page.waitForFunction(()=>document.querySelector('#galaxy-app')?.dataset.landed==='true',null,{timeout:30000});await page.screenshot({path:output+'/desktop-origin-landing.png'});await page.getByRole('button',{name:'Прочитать надпись ↗',exact:true}).click();assert.ok(await page.locator('#reader').isVisible());await page.getByRole('button',{name:'Закрыть описание',exact:true}).click();report.checks.push('desktop: landing and inscription reader');
  }
  await page.locator('.wordmark').click();const motion=page.locator('#motion');if(await motion.getAttribute('aria-pressed')==='false')await motion.click();assert.equal(await motion.getAttribute('aria-pressed'),'true');await page.waitForTimeout(150);const cameraA=await page.locator('#cosmos').getAttribute('data-camera-position');await page.waitForTimeout(500);const cameraB=await page.locator('#cosmos').getAttribute('data-camera-position');assert.equal(cameraA,cameraB);report.checks.push(prefix+': motion pause');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.equal(overflow,0);report.viewports.push({viewport,overflow,info});await context.close();console.log(prefix+' passed');
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));console.log(JSON.stringify(report,null,2));
}finally{await writeFile(output+'/browser-report.json',JSON.stringify(report,null,2));await browser.close();}
