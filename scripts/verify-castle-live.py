"""Live GLB integration on the built /astra/ site, isolated synthetic contexts."""
import argparse,json,subprocess
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base',default='http://127.0.0.1:64995/astra/')
    p.add_argument('--output',default='artifacts/castle-live-integration')
    p.add_argument('--quick',action='store_true')
    p.add_argument('--record-video',action='store_true')
    p.add_argument('--failure-only',action='store_true')
    args=p.parse_args();base=args.base.rstrip('/')+'/';out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    allowed_hosts={'127.0.0.1','localhost',urlsplit(base).hostname}
    command="import{flightAtNode}from'./src/galaxy/playcanvas-path.js';console.log(JSON.stringify([false,true].map(c=>[12,13,14,15,16,18].map(node=>({node,travel:flightAtNode(node,c)})))))"
    poses=json.loads(subprocess.check_output(['node','--input-type=module','-e',command],text=True));report=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
        profiles=[('desktop',1440,900,False),('phone',390,844,True),('landscape',844,390,True)]
        for name,w,h,mobile in ([] if args.failure_only else profiles[:1] if args.quick else profiles):
            video={'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}} if args.record_video else {}
            ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile,device_scale_factor=2 if mobile else 1,**video)
            page=ctx.new_page();errors=[];http=[];requests=[];blocked=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('response',lambda r:http.append(f'{r.status} {r.url}') if r.status>=400 else None)
            page.on('request',lambda r:requests.append(r.url))
            page.route('**/castle-baked-draco.glb',lambda route:blocked.append(route))
            page.goto(base+'spatial/#galaxy',wait_until='domcontentloaded')
            scene=page.locator('#cosmos');canvas=scene.locator('canvas')
            def state():return scene.evaluate('e=>({...e.dataset})')
            def free_point():
                point=canvas.evaluate('''c=>{for(const fy of [.4,.6,.3,.7])for(const fx of [.2,.4,.6,.85]){const x=innerWidth*fx,y=innerHeight*fy;if(document.elementFromPoint(x,y)===c)return {x,y};}return null;}''')
                assert point;return point
            def move_to(travel):
                canvas.focus();now=float(state()['flight']);count=round((travel-now)/.035)
                for _ in range(abs(count)):page.keyboard.press('ArrowDown' if count>0 else 'ArrowUp')
                page.wait_for_timeout(120);remaining=travel-float(state()['flight'])
                if abs(remaining)>.000001:
                    pt=free_point();page.mouse.move(pt['x'],pt['y']);page.mouse.wheel(0,remaining/.0004)
                page.wait_for_timeout(700)
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.sceneReady==='true'",timeout=90000)
            assert state()['planetTextures']=='ready';assert state()['observatory']=='loading'
            t=float(state()['animationTime']);page.wait_for_timeout(250);assert float(state()['animationTime'])>t
            for route in blocked:route.continue_()
            page.unroute('**/castle-baked-draco.glb')
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.observatory==='ready'",timeout=90000)
            page.wait_for_load_state('networkidle');assert canvas.count()==1
            initial=state();assert initial['castleRender']=='live-3d-v8';assert initial['castleTriangles']=='601604';assert initial['castleBakedEncoding']=='sqrt-normalized'
            assert initial['castleWindowLights']=='5'
            assert not page.locator('.castle-flight,.castle-orbit').count();assert not scene.evaluate('e=>e.inert')
            if not mobile:assert initial['castleReflection']=='false';assert initial['castleWindowMist']=='false'
            page.screenshot(path=str(out/f'{name}-initial.png'));page.emulate_media(reduced_motion='reduce');records=[]
            for pose in poses[1 if mobile else 0]:
                move_to(pose['travel']);s=state();assert s['castleWorldMatrix']==initial['castleWorldMatrix'];assert s['cameraMode']=='flight'
                assert s['castleRender']=='live-3d-v8';records.append({'node':pose['node'],'state':s})
                if pose['node'] in (12,14,16):page.screenshot(path=str(out/f'{name}-node-{pose["node"]}.png'))
                if pose['node']==15:
                    assert s['castleReflection']=='true';assert float(s['cameraPosition'].split(',')[1])>-5.4
                    assert s['castleWindowMist']=='true'
                    frozen=float(s['castleAnimationTime']);page.wait_for_timeout(250);assert float(state()['castleAnimationTime'])==frozen
                    assert float(state()['castleWindowTime'])==frozen
                    if name=='phone':
                        page.wait_for_timeout(700);before=list(map(float,state()['cameraPosition'].split(',')))
                        page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(800)
                        after=list(map(float,state()['cameraPosition'].split(',')));assert sum((a-b)**2 for a,b in zip(before,after))**.5<.03
                        page.screenshot(path=str(out/'phone-rotated.png'));page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(500)
            page.emulate_media(reduced_motion='no-preference');canvas.focus();before=float(state()['flight']);page.keyboard.press('ArrowUp');page.wait_for_timeout(400);assert float(state()['flight'])<before
            pt=free_point();page.mouse.move(pt['x'],pt['y']);before=float(state()['flight']);page.mouse.wheel(0,-180);page.wait_for_timeout(400);assert float(state()['flight'])<before
            if mobile:
                pt=free_point();cdp=ctx.new_cdp_session(page);before=float(state()['flight'])
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':pt['x'],'y':pt['y']}]})
                for i in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':pt['x'],'y':pt['y']+i*8}]})
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(500);assert float(state()['flight'])<before
            t=float(state()['castleAnimationTime']);page.wait_for_timeout(300);assert float(state()['castleAnimationTime'])>t
            assert float(state()['castleWindowTime'])>t
            # Isolated built-in synthetic account: unauthenticated hall links correctly open registration.
            page.evaluate("location.hash='#login'")
            page.locator('input[name="login"]').fill('1');page.locator('input[name="password"]').fill('1')
            page.get_by_role('button',name='Войти',exact=True).click()
            page.wait_for_function("location.hash==='#galaxy'")
            page.locator('.main-nav [data-world="aurora"]').click()
            page.wait_for_function("document.body.classList.contains('world-interior')&&document.querySelector('#cosmos')?.dataset.rendering==='suspended'")
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.castleWindowMist==='false'")
            assert state()['rendering']=='suspended'
            page.go_back(wait_until='networkidle')
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.rendering==='active'")
            assert not any('/castle-orbit/transparent/' in u or '/castle-live/assets/' in u for u in requests)
            assert not any('/castle-live/universe/' in u and any(x in u for x in ['origin-moon','aurora-detailed','velir-detailed','sky-nebula']) for u in requests)
            assert not any(urlsplit(u).hostname not in allowed_hosts for u in requests if u.startswith('http'))
            assert not errors,errors;assert not http,http
            report.append({'profile':name,'size':[w,h],'initial':initial,'records':records,'errors':errors,'httpErrors':http,'resources':requests,'video':str(page.video.path()) if page.video else None})
            ctx.close();(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(name+': live GLB, delayed load, mirror, gestures, reduced motion: PASS',flush=True)
        ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();attempts=[]
        def retry(route):
            attempts.append(route.request.url)
            if len(attempts)==1:route.fulfill(status=503,content_type='text/plain',body='synthetic failure')
            else:route.continue_()
        page.route('**/castle-baked-draco.glb',retry);page.goto(base+'spatial/#galaxy',wait_until='domcontentloaded')
        page.wait_for_function("document.querySelector('#cosmos')?.dataset.observatory==='ready'",timeout=90000)
        assert len(attempts)==2;assert page.locator('#cosmos').get_attribute('data-scene-ready')=='true'
        report.append({'synthetic503Retry':'PASS','attempts':len(attempts)});ctx.close()
        ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();attempts=[]
        def permanent(route):
            attempts.append(route.request.url);route.fulfill(status=503,content_type='text/plain',body='synthetic permanent failure')
        page.route('**/castle-baked-draco.glb',permanent);page.goto(base+'spatial/#galaxy',wait_until='domcontentloaded')
        page.wait_for_function("document.querySelector('#cosmos')?.dataset.observatory==='failed'",timeout=90000)
        scene=page.locator('#cosmos');assert scene.get_attribute('data-scene-ready')=='true';assert len(attempts)==2,{'attempts':len(attempts),'state':scene.evaluate('e=>({...e.dataset})')}
        page.locator('#cosmos canvas').focus();before=float(scene.get_attribute('data-flight'));page.keyboard.press('ArrowDown');page.wait_for_timeout(600)
        assert float(scene.get_attribute('data-flight'))>before
        report.append({'permanentModelFailureKeepsGalaxy':'PASS','attempts':len(attempts)});ctx.close();browser.close()
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':main()
