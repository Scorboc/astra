import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  for(const route of ['login','register']){
    await page.goto(`http://127.0.0.1:5190/spatial/#${route}`,{waitUntil:'networkidle'});
    await page.waitForTimeout(500);
    const data=await page.evaluate(()=>{
      const scroll=document.querySelector('.panel-scroll');
      const selectors=['.panel-top','#panel-heading','#account-form label','#account-form button','a[href="#register"]'];
      return {scrollTop:scroll?.scrollTop,clientHeight:scroll?.clientHeight,scrollHeight:scroll?.scrollHeight,items:selectors.map(selector=>{const element=document.querySelector(selector);const rect=element?.getBoundingClientRect();return {selector,text:element?.textContent?.trim().slice(0,45),top:rect?.top,bottom:rect?.bottom}})};
    });
    console.log(route,JSON.stringify(data));
    assert.ok(data.scrollHeight<=data.clientHeight+1,`${route}: form fits without initial scrolling`);
    assert.ok(data.items.find(item=>item.selector==='#account-form button')?.bottom<850,`${route}: submit is visible on desktop`);
    await page.screenshot({path:`artifacts/desktop-${route}-layout.png`});
  }
  await page.goto('http://127.0.0.1:5190/spatial/#login',{waitUntil:'networkidle'});
  await page.locator('#account-form [name=login]').fill('1');
  await page.locator('#account-form [name=password]').fill('1');
  await page.locator('#account-form [type=submit]').click();
  await page.waitForURL('**/#today');
  await page.waitForFunction(()=>!document.body.classList.contains('account-auth'));
  for(const route of ['today','astrology','results','profile','observatory','planet/origin']){
    await page.goto(`http://127.0.0.1:5190/spatial/#${route}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>!document.body.classList.contains('account-auth'));
    await page.waitForTimeout(route==='observatory'||route.startsWith('planet/')?2100:500);
    const data=await page.evaluate(()=>{
      const scroll=document.querySelector('.panel-scroll');
      return {scrollTop:scroll?.scrollTop,clientHeight:scroll?.clientHeight,scrollHeight:scroll?.scrollHeight,bodyClass:document.body.className,active:document.body.dataset.activeScreen,padding:scroll&&getComputedStyle(scroll).paddingLeft,children:[...scroll?.children||[]].slice(0,5).map(el=>({name:el.className||el.tagName,left:Math.round(el.getBoundingClientRect().left)}))};
    });
    console.log(route,JSON.stringify(data));
    await page.screenshot({path:`artifacts/desktop-${route.replace('/','-')}-layout.png`});
  }
  for(const [width,height] of [[714,614],[375,812]]){
    const compact=await browser.newPage({viewport:{width,height}});
    for(const route of ['login','register']){
      await compact.goto(`http://127.0.0.1:5190/spatial/#${route}`,{waitUntil:'networkidle'});
      await compact.locator('#boot').waitFor({state:'hidden',timeout:15000});
      await compact.waitForTimeout(500);
      const layout=await compact.evaluate(()=>{
        const label=document.querySelector('.panel-top .eyebrow')?.getBoundingClientRect();
        const back=document.querySelector('.panel-top button')?.getBoundingClientRect();
        const panel=document.querySelector('.panel-scroll')?.getBoundingClientRect();
        const heading=document.querySelector('#panel-heading')?.getBoundingClientRect();
        return {labelRight:label?.right,backLeft:back?.left,panelTop:panel?.top,panelBottom:panel?.bottom,headingTop:heading?.top};
      });
      assert.ok(layout.labelRight<=layout.backLeft+1,`${width}px ${route}: header labels do not overlap`);
      assert.ok(layout.headingTop>=layout.panelTop,`${width}px ${route}: heading starts inside the panel`);
      console.log(`${width}px ${route}`,JSON.stringify(layout));
      await compact.screenshot({path:`artifacts/${width}-${route}-layout.png`});
    }
    await compact.close();
  }
}finally{await browser.close()}
