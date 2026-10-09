import {chromium} from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5173/spatial/#observatory');await page.waitForLoadState('networkidle');await page.waitForTimeout(6500);
 const inspect=()=>page.evaluate(async()=>{const {pc}=await import('/src/galaxy/playcanvas-runtime.js');const app=pc.AppBase.getApplication(),station=app.root.findByName('ASTRA observatory'),surface=app.root.findByName('ASTRA rebuilt podium'),reflection=app.root.findByName('Observatory reflection camera'),main=app.root.findByName('ASTRA camera');const plane=surface.getWorldTransform().transformPoint(new pc.Vec3(0,.28,0)).y,oldFloors=station.findComponents('render').flatMap(r=>r.meshInstances).filter(m=>m.node.name==='Floor').length;return {plane,oldFloors,cameraPlane:(main.getPosition().y+reflection.getPosition().y)/2,visible:surface.enabled,position:[main.getPosition().x,main.getPosition().y,main.getPosition().z]};});
 for(let i=0;i<4;i++){
  const state=await inspect();assert.ok(state.visible);assert.equal(state.oldFloors,0);assert.ok(Math.abs(state.plane-state.cameraPlane)<1e-5);
  await page.screenshot({path:`artifacts/mirror-regression-${i}.png`});
  await page.mouse.move(750,400);await page.mouse.down();await page.mouse.move(750+(i%2===0?45:-45),410,{steps:18});await page.mouse.up();await page.waitForTimeout(500);
 }
 const motion=page.locator('#motion');if(await motion.getAttribute('aria-pressed')==='false')await motion.click();
 await page.waitForTimeout(5000);const a=await inspect(),first=await page.screenshot({clip:{x:470,y:835,width:180,height:50}});await page.waitForTimeout(800);const b=await inspect(),second=await page.screenshot({clip:{x:470,y:835,width:180,height:50}});await writeFile('artifacts/mirror-static-a.png',first);await writeFile('artifacts/mirror-static-b.png',second);const diff=await page.evaluate(async images=>{const pixels=[];for(const image of images){const bitmap=await createImageBitmap(await (await fetch('data:image/png;base64,'+image)).blob()),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);pixels.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);}let max=0,sum=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/pixels[0].length,motion:document.querySelector('#motion').getAttribute('aria-pressed')};},[first.toString('base64'),second.toString('base64')]);console.log({a,b,diff});assert.ok(a.position.every((v,i)=>Math.abs(v-b.position[i])<.001));assert.equal(diff.max,0,'Paused mirror pixels must not shimmer');
 assert.deepEqual(errors,[]);console.log('PASS: four camera poses, mirror above floor, reflected camera aligned to surface, identical paused mirror pixels, no browser errors');
}finally{await browser.close();}
