import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const base=process.env.ASTRA_URL||'http://127.0.0.1:5190/spatial/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
  for(const [name,width,height] of [['desktop',1440,900],['phone',375,812],['small-phone',320,568]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:name!=='desktop',hasTouch:name!=='desktop'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'#login',{waitUntil:'networkidle'});
    await page.locator('#account-form [name=login]').fill('1');
    await page.locator('#account-form [name=password]').fill('1');
    await page.locator('#account-form [type=submit]').click();
    await page.waitForURL('**/#galaxy');
    await page.waitForSelector('.main-nav a');
    assert.equal(await page.locator('.main-nav a').count(),6,'five planets plus observatory in galaxy dock');

    await page.locator('.main-nav a[href="#observatory"]').click();
    await page.waitForURL('**/#observatory');
    await page.waitForSelector('.council-room[data-room="observatory"]');
    assert.equal(await page.locator('.council-room[data-room="observatory"]').count(),1,'observatory opens its illustrated hall');
    assert.match(await page.locator('.council-scene').evaluate(el=>getComputedStyle(el).backgroundImage),/observatory-hall-v1\.webp/);
    assert.equal(await page.locator('.council-station').count(),4,'four on-image observatory controls');
    assert.equal(await page.locator('.council-menu:visible').count(),0,'no menu before a choice');
    await page.waitForTimeout(1350);
    await page.screenshot({path:`artifacts/council-${name}-observatory-closed.png`});
    await page.locator('[data-research="room-open:1"]').click();
    assert.equal(await page.locator('#room-menu-1').isVisible(),true,'observations menu opens');
    assert.equal(await page.locator('.observatory-room .personal-atlas').count(),1,'existing atlas remains available');
    await page.screenshot({path:`artifacts/council-${name}-observatory-open.png`});
    await page.locator('[data-research="atlas-new"]').click();
    assert.equal(await page.locator('.observatory-room .atlas-editor').getAttribute('open'),'','add observation opens the editor');
    await page.locator('#research-atlas textarea[name="text"]').fill('Проверочная запись в обсерватории');
    await page.locator('#research-atlas textarea[name="text"]').press('Escape');
    assert.ok(page.url().endsWith('#observatory'),'Escape inside a draft does not leave the hall');
    await page.locator('#research-atlas [type="submit"]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.observatory-room .atlas-record')].some(el=>el.textContent?.includes('Проверочная запись в обсерватории')));
    assert.equal(await page.locator('#room-menu-1').isVisible(),true,'observations menu stays open after saving');
    await page.locator('#room-menu-1 [data-research="room-close"]').click();
    await page.locator('[data-research="room-open:2"]').click();
    assert.equal(await page.locator('#room-menu-2').isVisible(),true,'personal table menu opens');
    assert.equal(await page.locator('#room-menu-1').isVisible(),false,'previous menu stays closed');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.council-menu:visible').count(),0,'Escape closes only the menu');
    assert.ok(page.url().endsWith('#observatory'));
    await page.locator('[data-research="room-open:0"]').click();
    assert.equal(await page.locator('#room-menu-0 [data-research="go:astrology"]').count(),1,'astrology retains its own route');
    await page.locator('#room-menu-0 [data-research="room-close"]').click();
    await page.locator('[data-research="room-open:3"]').click();
    assert.equal(await page.locator('#room-menu-3').isVisible(),true,'source records are available');
    await page.locator('#room-menu-3 [data-research="room-close"]').click();
    await page.goBack();
    await page.waitForURL('**/#galaxy');

    for(const world of ['origin','aurora','velir','nereya','solis']){
      const route=`planet/${world}`;
      await page.goto(base+'#'+route,{waitUntil:'networkidle'});
      await page.waitForSelector(`.council-room[data-room="${world}"]`);
      assert.equal(await page.locator('.council-station:visible').count(),3,world+' has three on-image controls');
      assert.equal(await page.locator('.council-rail,.council-info').count(),0,world+' has no duplicate side controls');
      assert.equal(await page.locator('.council-heading h3').textContent(),({origin:'Исток',aurora:'Аврора',velir:'Велир',nereya:'Нерея',solis:'Солис'})[world]);
      assert.match(await page.locator('.council-heading h3').evaluate(el=>getComputedStyle(el).fontFamily),new RegExp(({origin:'Forum',aurora:'Cormorant Garamond',velir:'Exo 2',nereya:'Oranienbaum',solis:'Russo One'})[world]));
      assert.equal(await page.locator('.council-menu:visible').count(),0,'menus start closed');
      assert.equal(await page.locator('.main-nav').isVisible(),true,'planet dock remains available');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,world+' has no horizontal page overflow');
      await page.waitForTimeout(1350);
      await page.screenshot({path:`artifacts/council-${name}-${world}-closed.png`});
      await page.locator('[data-research="room-open:0"]').click();
      assert.equal(await page.locator('#room-menu-0').isVisible(),true,'selected point opens menu');
      assert.equal(await page.locator('[data-research="room-open:0"]').getAttribute('aria-expanded'),'true');
      const roomFit=await page.locator('#room-menu-0').evaluate(el=>{const r=el.getBoundingClientRect(),frame=el.closest('.council-room').getBoundingClientRect(),button=el.querySelector('.council-primary').getBoundingClientRect();return {menuInside:r.top>=frame.top-2&&r.bottom<=frame.bottom+2,buttonInside:button.top>=r.top&&button.bottom<=r.bottom+2};});
      assert.ok(roomFit.menuInside&&roomFit.buttonInside,world+' contextual menu fits '+JSON.stringify(roomFit));
      await page.screenshot({path:`artifacts/council-${name}-${world}-open.png`});
      const destination=(await page.locator('#room-menu-0 .council-primary').getAttribute('data-research')).slice(3);
      await page.locator('#room-menu-0 .council-primary').click();
      await page.waitForURL('**/#'+destination);
      await page.waitForFunction(expected=>document.body.dataset.activeScreen===expected,destination);
      await page.waitForSelector('.panel-top button');
      assert.equal(await page.locator('.panel-top button').count(),1,'subroom has a return control');
      await page.goBack();
      await page.waitForURL('**/#'+route);
      await page.waitForFunction(expected=>document.body.dataset.activeScreen===expected&&document.querySelectorAll('.council-menu:not([hidden])').length===0,route);
      assert.equal(await page.locator('.council-menu:visible').count(),0,'return starts with unobstructed image');
    }
    assert.deepEqual(errors,[],name+' page errors');
    console.log(name,'PASS');
    await context.close();
  }
}finally{await browser.close();}
