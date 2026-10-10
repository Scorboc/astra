import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const base=process.env.ASTRA_URL||'http://127.0.0.1:5190/spatial/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
  for(const [name,width,height] of [['desktop',1440,900],['phone',375,812]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:name==='phone',hasTouch:name==='phone'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'#login',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.main-nav').isVisible(),false,'planet navigation stays hidden on login');
    await page.locator('#account-form [name=login]').fill('1');
    await page.locator('#account-form [name=password]').fill('1');
    await page.locator('#account-form [type=submit]').click();
    await page.waitForURL('**/#today');
    await page.waitForSelector('#panel-heading');
    await page.goto(base+'#galaxy',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.main-nav a').count(),6,'galaxy dock contains five planets and observatory');
    await page.locator('.main-nav a[href="#observatory"]').click();
    await page.waitForURL('**/#observatory');
    await page.waitForFunction(()=>document.querySelector('.main-nav a[href="#observatory"]')?.getAttribute('aria-current')==='page');
    assert.equal(await page.locator('.main-nav a[href="#observatory"]').getAttribute('aria-current'),'page','observatory is active in galaxy dock');
    assert.equal(await page.locator('.observatory-room .personal-atlas').count(),1,'observatory opens its atlas directly');
    assert.equal(await page.locator('#observatory-bar').count(),0,'no intermediate observatory actions remain');
    await page.waitForTimeout(1100);
    await page.screenshot({path:`artifacts/observatory-direct-${name}.png`});
    await page.locator('.observatory-room .atlas-editor summary').click();
    await page.locator('#research-atlas textarea[name="text"]').fill('Проверочная запись в обсерватории');
    await page.locator('#research-atlas [type="submit"]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.observatory-room .atlas-record')].some(el=>el.textContent?.includes('Проверочная запись в обсерватории')));
    assert.ok(page.url().endsWith('#observatory'),'saving a collection remains in the observatory');
    await page.goBack();
    await page.waitForURL('**/#galaxy');
    for(const route of ['today','astrology','results','profile','planet/origin','planet/aurora','planet/velir','planet/nereya','planet/solis','research']){
      await page.goto(base+'#'+route,{waitUntil:'networkidle'});
      await page.waitForSelector('#panel-heading');
      await page.waitForTimeout(route.startsWith('planet/')?1850:500);
      if(route.startsWith('planet/')){
        const world=route.slice(7);
        assert.match(await page.locator('#panel-heading').innerText(),new RegExp(({origin:'Исток',aurora:'Аврора',velir:'Велир',nereya:'Нерея',solis:'Солис'})[world]),'world has its own hall');
        assert.equal(await page.locator(`.main-nav a[data-world="${world}"]`).getAttribute('aria-current'),'page','current world is highlighted');
        assert.equal(await page.locator(`.planet-lobby[data-room="${world}"]`).count(),1,'world has a distinct interior');
        assert.equal(await page.locator('.cabinet-door').count(),3,'world has three functional doors');
        assert.match(await page.locator('.planet-example').textContent(),/Вымышленный пример/,'sample is distinguished from user data when opened');
        if(name==='phone')assert.ok(await page.locator('.cabinet-primary').evaluate(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight-66&&r.bottom>58}),'primary cabinet action is visible in mobile room');
      }
      if(route==='results'){
        assert.equal(await page.locator('.results-explorer').count(),1,'results use the record explorer');
        assert.equal(await page.locator('.results-filters button').count(),4,'actual record types can be filtered');
        await page.locator('[data-research="result-kind:game"]').click();
        assert.equal(await page.locator('[data-research="result-kind:game"]').getAttribute('aria-pressed'),'true','game filter is active');
        await page.locator('[data-research="result-kind:all"]').click();
        if(await page.locator('.result-row-select').count()>1){await page.locator('.result-row-select').nth(1).click();assert.equal(await page.locator('.result-row-select[aria-pressed="true"]').count(),1,'record detail follows selection');}
        await page.waitForTimeout(900);
      }
      if(route==='planet/origin'){
        assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('origin-arriving')),false,'origin arrival completes');
      }
      const state=await page.evaluate(()=>({hall:document.body.classList.contains('planetary-hall'),overflow:document.documentElement.scrollWidth>innerWidth,back:!!document.querySelector('#panel .panel-top button'),panel:(()=>{const r=document.querySelector('#panel').getBoundingClientRect();return {width:r.width,height:r.height,bottom:r.bottom};})(),nav:(()=>{const r=document.querySelector('.main-nav').getBoundingClientRect();return {top:r.top,bottom:r.bottom};})(),headerBottom:document.querySelector('.galaxy-header').getBoundingClientRect().bottom}));
      assert.ok(state.hall,route+' uses the hall');
      assert.equal(state.overflow,false,route+' has no horizontal overflow');
      assert.ok(state.back,route+' has a room exit');
      assert.ok(state.panel.width>=width*.65,route+' uses most of the viewport width');
      assert.ok(state.panel.bottom<=height+1,route+' hall fits the viewport');
      await page.screenshot({path:`artifacts/planetary-hall-${name}-${route}.png`});
      if(route.startsWith('planet/')){
        const destination=await page.locator('#panel .cabinet-primary').getAttribute('data-research');
        await page.locator('#panel .cabinet-primary').click();
        await page.waitForURL('**/#'+destination.slice(3));
        await page.waitForSelector('.panel-top [data-research="go:'+route+'"]');
        assert.equal(await page.locator('.panel-top [data-research="go:'+route+'"]').count(),1,route+' subroom links back to its planet');
        await page.goBack();
        await page.waitForURL('**/#'+route);
        await page.waitForSelector('.cabinet-door');
        const door=await page.locator('.cabinet-door').first().getAttribute('data-research');
        await page.locator('.cabinet-door').first().click();
        await page.waitForURL('**/#'+door.slice(3));
        await page.goBack();
        await page.waitForURL('**/#'+route);
      }
    }
    await page.locator('.section-nav a[href="#observatory"]').click();
    await page.waitForURL('**/#observatory');
    await page.waitForSelector('.observatory-room .personal-atlas');
    assert.equal(await page.locator('.observatory-room .personal-atlas').count(),1,'interior nav opens the observatory directly');
    await page.goBack();
    await page.waitForURL('**/#research');
    await page.locator('#panel .panel-top button').click();
    await page.waitForURL('**/#planet/aurora');
    await page.locator('#panel [data-action="close-panel"]').click();
    await page.waitForURL('**/#galaxy');
    await page.waitForFunction(()=>!document.body.classList.contains('planetary-hall'));
    await page.goBack();
    await page.waitForURL('**/#planet/aurora');
    await page.waitForFunction(()=>document.body.classList.contains('planetary-hall'));
    await page.goto(base+'#planet/solis',{waitUntil:'networkidle'});
    await page.waitForURL('**/#planet/solis');
    await page.waitForFunction(()=>document.querySelector('.main-nav a[href="#planet/solis"]')?.getAttribute('aria-current')==='page');
    assert.equal(await page.locator('.main-nav a[href="#planet/solis"]').getAttribute('aria-current'),'page');
    await page.goBack();
    await page.waitForURL('**/#planet/aurora');
    assert.deepEqual(errors,[],name+' page errors');
    console.log(name,'PASS');
    await context.close();
  }
}finally{await browser.close();}
