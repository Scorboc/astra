import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir} from 'node:fs/promises';
const output='C:/Users/Admin/Documents/ChatGPT/Astra/artifacts/playcanvas-final-20261009';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
 await page.goto('http://127.0.0.1:5173/spatial/#galaxy');
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>document.querySelector('[data-scene-ready="true"]'),{timeout:60000});
 await page.screenshot({path:output+'/galaxy-after.png'});
 console.log('buttons',await page.getByRole('button').allTextContents());
 await page.goto('http://127.0.0.1:5173/spatial/#observatory');
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>document.querySelector('[data-observatory="ready"]'),{timeout:60000});
 await page.waitForTimeout(6000);
 await page.screenshot({path:output+'/observatory-after.png'});
 console.log('render-details',await page.evaluate(async()=>{const {pc}=await import('/src/galaxy/playcanvas-runtime.js'),app=pc.AppBase.getApplication();return {layers:app.scene.layers.layerList.map((l,i)=>({name:l.name,transparent:app.scene.layers.subLayerList[i]})),cameras:app.root.findComponents('camera').map(c=>({name:c.entity.name,layers:c.layers,enabled:c.entity.enabled,renderTarget:!!c.renderTarget})),reference:app.assets.find('architecture reference').resource.flipY};}));
 await page.evaluate(async()=>{const {pc}=await import('/src/galaxy/playcanvas-runtime.js');const app=pc.AppBase.getApplication();for(const e of app.root.findComponents('render'))if(/fog|mist|steam|nebula|serpent|flash/.test(e.entity.name))e.entity.enabled=false;});
 await page.waitForTimeout(400);await page.screenshot({path:output+'/materials-only.png'});
 console.log(JSON.stringify({errors,scene:await page.locator('[data-engine="playcanvas"]').evaluate(e=>({...e.dataset}))}));
}finally{await browser.close();}
