import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const base=process.env.ASTRA_URL||'http://127.0.0.1:5190/spatial/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
  for(const [name,width,height] of [['desktop',1440,900],['phone',375,812],['small-phone',320,568],['landscape-phone',844,390],['small-landscape',667,375]]){
    if(process.env.ASTRA_VIEW&&process.env.ASTRA_VIEW!==name)continue;
    const mobile=name!=='desktop';
    // Halls now open on their own art with points; no themed window opens by itself.
    const autoMenu=false;
    const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});
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
    await page.locator('.council-wordmark').evaluate(image=>image.decode());
    assert.ok(await page.locator('.council-wordmark').evaluate(image=>image.naturalWidth>0),'observatory wordmark loads');
    assert.equal(await page.locator('.main-nav').isVisible(),true,'planet dock remains visible in observatory');
    assert.equal(await page.locator('.section-nav').isVisible(),false,'section navigation does not replace planet dock');
    assert.equal(await page.locator('.main-nav a[href="#observatory"]').getAttribute('aria-current'),'page','observatory is selected in planet dock');
    assert.match(await page.locator('.hall-art').getAttribute('src'),/observatory-hall-cinematic-v3\.webp/);
    assert.equal(await page.locator('.hall-spot').count(),4,'four points on observatory objects');
    assert.equal(await page.locator('.council-menu:visible').count(),autoMenu?1:0,'narrow rooms show their themed window on entry');
    if(autoMenu)assert.equal(await page.locator('#room-menu-1').isVisible(),true,'narrow observatory opens observations');
    assert.equal(await page.locator('.galaxy-header>.wordmark').isVisible(),false,'galaxy logo does not take hall space');
    const shellFit=await page.evaluate(()=>{const hall=document.querySelector('.journey-panel').getBoundingClientRect(),dock=document.querySelector('.main-nav').getBoundingClientRect();return {hallTop:hall.top,hallBottom:hall.bottom,dockTop:dock.top,body:document.body.className,screen:document.body.dataset.activeScreen};});
    assert.ok(shellFit.hallTop<=10&&shellFit.hallBottom<=shellFit.dockTop+3,'hall uses top space without covering dock '+JSON.stringify(shellFit));
    await page.waitForTimeout(1350);
    await page.screenshot({path:`artifacts/council-${name}-observatory-closed.png`});
    if(autoMenu)await page.locator('#room-menu-1 [data-research="room-close"]').click();
    await page.locator('.hall-spot[data-research="room-open:1"]').click();
    assert.equal(await page.locator('#room-menu-1').isVisible(),true,'observations menu opens');
    assert.match(await page.locator('#room-menu-1').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),/observatory-hall-cinematic-v3(?:-mobile|-compact)?\.webp/,'observatory crystal window has its own hall detail');
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
    await page.locator('.hall-spot[data-research="room-open:2"]').click();
    assert.equal(await page.locator('#room-menu-2').isVisible(),true,'personal table menu opens');
    assert.equal(await page.locator('#room-menu-1').isVisible(),false,'previous menu stays closed');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.council-menu:visible').count(),0,'Escape closes only the menu');
    assert.ok(page.url().endsWith('#observatory'));
    await page.locator('.hall-spot[data-research="room-open:0"]').click();
    assert.equal(await page.locator('#room-menu-0 [data-research="go:astrology"]').count(),1,'astrology retains its own route');
    await page.locator('#room-menu-0 [data-research="room-close"]').click();
    await page.locator('.hall-spot[data-research="room-open:3"]').click();
    assert.equal(await page.locator('#room-menu-3').isVisible(),true,'source records are available');
    await page.locator('#room-menu-3 [data-research="room-close"]').click();
    await page.goBack();
    await page.waitForURL('**/#galaxy');

    for(const world of ['origin','aurora','velir','nereya','solis']){
      const route=`planet/${world}`;
      await page.goto(base+'#'+route,{waitUntil:'networkidle'});
      await page.waitForSelector(`.council-room[data-room="${world}"]`);
      assert.equal(await page.locator('.hall-spot').count(),3,world+' has three points on its objects');
      assert.equal(await page.locator('.council-rail,.council-info').count(),0,world+' has no duplicate side controls');
      assert.equal(await page.locator('.council-heading h3').textContent(),({origin:'Исток',aurora:'Аврора',velir:'Велир',nereya:'Нерея',solis:'Солис'})[world]);
      await page.locator('.council-wordmark').evaluate(image=>image.decode());
      assert.ok(await page.locator('.council-wordmark').evaluate(image=>image.naturalWidth>0),world+' approved wordmark loads');
      assert.match(await page.locator('.council-heading h3').evaluate(el=>getComputedStyle(el).fontFamily),new RegExp(({origin:'Forum',aurora:'Cormorant Garamond',velir:'Exo 2',nereya:'Oranienbaum',solis:'Russo One'})[world]));
      assert.equal(await page.locator('.council-menu').count(),0,'planet action has no duplicate intermediate menu');
      assert.equal(await page.locator('.main-nav').isVisible(),true,'planet dock remains available');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,world+' has no horizontal page overflow');
      await page.waitForTimeout(1350);
      await page.screenshot({path:`artifacts/council-${name}-${world}-closed.png`});
      await page.locator('.hall-spot[data-spot="0"]').click();
      const open=page.locator('#spot-card-0 [data-research^="go:"]');
      const destination=(await open.getAttribute('data-research')).slice(3);
      await open.click();
      await page.waitForURL('**/#'+destination);
      await page.waitForFunction(expected=>document.body.dataset.activeScreen===expected,destination);
      await page.waitForSelector('.panel-top button');
      assert.equal(await page.locator('.panel-top button').count(),1,'subroom has a return control');
      await page.goBack();
      await page.waitForURL('**/#'+route);
      await page.waitForFunction(route=>document.body.dataset.activeScreen===route,route);
      assert.equal(await page.locator('.council-menu').count(),0,'return restores the planet without a duplicate menu');
    }
    assert.deepEqual(errors,[],name+' page errors');
    console.log(name,'PASS');
    await context.close();
  }
}finally{await browser.close();}
