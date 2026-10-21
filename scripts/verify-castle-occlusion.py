"""Depth regression on the actual built galaxy; synthetic objects in isolated browsers only."""
import argparse,json,subprocess
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

def changed(a,b,box):
    aa=Image.open(a).convert('RGB').crop(box);bb=Image.open(b).convert('RGB').crop(box)
    delta=[max(abs(x-y) for x,y in zip(p,q)) for p,q in zip(aa.get_flattened_data(),bb.get_flattened_data())]
    return {'fractionAbove3':sum(d>3 for d in delta)/len(delta),'maximum':max(delta)}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base',default='http://127.0.0.1:64995/astra/')
    parser.add_argument('--output',default='artifacts/castle-occlusion');parser.add_argument('--baseline',action='store_true');parser.add_argument('--quick',action='store_true');args=parser.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True);report=[]
    poses=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{flightAtNode}from'./src/galaxy/playcanvas-path.js';console.log(JSON.stringify([false,true].map(c=>flightAtNode(15,c))))"],text=True))
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
        profiles=[('desktop',1440,900,False),('phone',390,844,True),('landscape',844,390,True)]
        for name,w,h,mobile in profiles[:1] if args.quick else profiles:
            ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,reduced_motion='reduce')
            page=ctx.new_page();errors=[];requests=[];http=[]
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('request',lambda r:requests.append(r.url));page.on('response',lambda r:http.append(f'{r.status}: {r.url}') if r.status>=400 else None)
            page.goto(args.base.rstrip('/')+'/spatial/#galaxy',wait_until='networkidle');scene=page.locator('#cosmos');canvas=scene.locator('canvas')
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.observatory==='ready'",timeout=90000)
            canvas.focus();steps=round(poses[1 if mobile else 0]/.035)
            for _ in range(steps):page.keyboard.press('ArrowDown')
            page.wait_for_timeout(1800)
            bundle=next(u for u in requests if '/assets/castle-live-model-' in u)
            meta=page.evaluate('''async url=>{
                const m=await import(url),pc=Object.values(m).find(x=>x&&typeof x==='object'&&x.AppBase);
                if(!pc)throw Error('Bundled PlayCanvas runtime not found');
                const app=pc.AppBase.getApplication(),castle=app.root.findByName('ASTRA live observatory V8'),camera=app.root.findByName('ASTRA camera');
                // Freeze simulation (including the camera easing) in THIS test
                // context only, so four screenshots use an identical GPU view.
                app.timeScale=0;
                const source=castle.getWorldTransform().transformPoint(new pc.Vec3(0,7,3.8));
                const eye=camera.getPosition().clone(),direction=source.clone().sub(eye).normalize();
                const depthLayer=app.scene.layers.getLayerByName('ASTRA castle world depth');
                const planetDepth=['Исток','Аврора','Велир','Нерея','Солис'].map(name=>{const mesh=app.defaultLayerWorld.meshInstances.find(m=>m.node.name===name);return {name,shared:!!mesh&&!!depthLayer?.meshInstances.some(copy=>copy.mesh===mesh.mesh&&copy.node===mesh.node)};});
                const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(.08,.22,.42);material.update();
                const globe=new pc.Entity('QA foreground planet');globe.addComponent('render',{meshInstances:[new pc.MeshInstance(pc.Mesh.fromGeometry(app.graphicsDevice,new pc.SphereGeometry({radius:1,latitudeBands:32,longitudeBands:48})),material)],layers:[app.defaultLayerWorld.id]});app.root.addChild(globe);
                const meshes=castle.findComponents('render').flatMap(r=>r.meshInstances);
                window.__depthQA={pc,app,camera,castle,globe,meshes,eye,direction};
                const p=camera.camera.worldToScreen(source);
                return {sample:[p.x,p.y],eye:[eye.x,eye.y,eye.z],planetDepth,layers:app.scene.layers.layerList.map((l,i)=>({name:l.name,transparent:app.scene.layers.subLayerList[i]})),windowMist:document.querySelector('#cosmos').dataset.castleWindowMist};
            }''',bundle)
            x,y=meta['sample'];r=20 if mobile else 34
            assert r<x<w-r and r<y<h-r,(name,meta)
            box=(round(x-r),round(y-r),round(x+r),round(y+r))
            images={}
            for depth,distance in [('front',12),('behind',120)]:
                for visible in [True,False]:
                    page.evaluate('''({distance,visible})=>{const q=window.__depthQA;q.globe.setPosition(q.eye.clone().add(q.direction.clone().mulScalar(distance)));q.globe.setLocalScale(distance/3,distance/3,distance/3);q.meshes.forEach(m=>m.visible=visible);}''',{'distance':distance,'visible':visible})
                    page.wait_for_timeout(400);key=f'{depth}-castle-{int(visible)}';images[key]=out/f'{name}-{key}.png';page.screenshot(path=str(images[key]),scale='css')
            front=changed(images['front-castle-1'],images['front-castle-0'],box)
            behind=changed(images['behind-castle-1'],images['behind-castle-0'],box)
            record={'profile':name,'sampleBox':box,'front':front,'behind':behind,'meta':meta,'errors':errors,'http':http};report.append(record)
            (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            assert not errors,errors;assert not http,http
            assert behind['fractionAbove3']>.10,record
            if args.baseline:assert front['fractionAbove3']>.10,record
            else:
                assert all(p['shared'] for p in meta['planetDepth']),record
                assert front['fractionAbove3']<.005,record
            print(name+': '+('existing foreground bug reproduced' if args.baseline else 'foreground hides castle; background does not')+': PASS',flush=True);ctx.close()
        browser.close()

if __name__=='__main__':main()
