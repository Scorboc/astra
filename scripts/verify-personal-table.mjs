import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',375,812]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:name==='phone',hasTouch:name==='phone'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5190/spatial/#login',{waitUntil:'networkidle'});
  await page.locator('#account-form [name=login]').fill('1');
  await page.locator('#account-form [name=password]').fill('1');
  await page.locator('#account-form [type=submit]').click();
  await page.waitForURL('**/#galaxy');
  await page.locator('.main-nav a[href="#observatory"]').click();
  await page.waitForURL('**/#observatory');
  await page.locator('.personal-table').waitFor();
  assert.equal(await page.locator('.personal-table h3').textContent(),'Твоя карта проб');
  await page.locator('.table-editor summary').click();
  await page.locator('#research-personal-table [name=title]').fill('Учиться играть на гармони');
  await page.locator('#research-personal-table [name=reason]').fill('Хочу попробовать для себя');
  await page.locator('#research-personal-table button[type=submit]').click();
  await page.locator('.personal-table th strong').getByText('Учиться играть на гармони').waitFor();
  await page.locator('.table-mark').first().click();
  await page.locator('#research-table-mark [value=partial]').check();
  await page.locator('#research-table-mark button[type=submit]').click();
  assert.match(await page.locator('.table-mark').first().textContent(),/Частично/);
  assert.deepEqual(errors,[]);
  await page.locator('#panel-scroll').evaluate(el=>el.scrollTop=0);
  await page.waitForTimeout(1300);
  await page.screenshot({path:`artifacts/personal-table-${name}.png`});
  console.log(`${name}: row, mark, no page errors; screenshot captured`);
  await context.close();
 }
}finally{await browser.close();}
