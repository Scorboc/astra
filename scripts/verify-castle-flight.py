"""Historical prerender passage check. The live V8 integration uses verify-castle-live.py."""
import argparse
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:64995/astra/')
    parser.add_argument('--output', default='artifacts/castle-flight-check')
    parser.add_argument('--quick', action='store_true')
    parser.add_argument('--profile', choices=['desktop','phone','landscape'])
    parser.add_argument('--record-video', action='store_true')
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    base = args.base.rstrip('/') + '/'
    # Only numbers from the project's pure route module, not browser-injected controls.
    source = "import{flightAtNode}from'./src/galaxy/playcanvas-path.js';console.log(JSON.stringify([false,true].map(c=>[0,11.5,12,13,14,15,16,18].map(n=>({node:n,travel:flightAtNode(n,c)})))))"
    poses = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', source], text=True))
    report = []
    with sync_playwright() as p:
        chrome = Path('C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
        browser = p.chromium.launch(headless=True, **({'executable_path': str(chrome)} if chrome.exists() else {}))
        profiles = [('desktop', 1440, 900, False), ('phone', 390, 844, True), ('landscape', 844, 390, True)]
        if args.profile:
            profiles=[profile for profile in profiles if profile[0]==args.profile]
        for name, width, height, mobile in profiles[:1] if args.quick else profiles:
            video={'record_video_dir':str(output/'video'),'record_video_size':{'width':width,'height':height}} if args.record_video else {}
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1,**video)
            page = context.new_page()
            errors, http_errors, requests = [], [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('response', lambda r: http_errors.append(f'{r.status} {r.url}') if r.status >= 400 else None)
            page.on('request', lambda r: requests.append(r.url))
            page.goto(base + 'spatial/#galaxy', wait_until='networkidle')
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.sceneReady === 'true'", timeout=90000)
            page.wait_for_function("Number(document.querySelector('#cosmos').dataset.castleLoaded)>0", timeout=30000)
            metrics=page.evaluate('''()=>({width:innerWidth,height:innerHeight,
                visual:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale,
                    x:visualViewport.offsetLeft,y:visualViewport.offsetTop},
                canvas:document.querySelector('#cosmos canvas:not(.castle-flight)').getBoundingClientRect().toJSON()})''')
            print(name+': '+json.dumps(metrics),flush=True)
            assert page.locator('.castle-orbit').count() == 0
            assert page.locator('.castle-flight').evaluate("e=>getComputedStyle(e).pointerEvents==='none'")
            assert len([u for u in requests if '/castle-orbit/transparent/f' in u]) == 1
            page.screenshot(path=str(output / f'{name}-initial.png'))
            scene = page.locator('#cosmos')
            records = []

            def snapshot():
                return scene.evaluate('e=>({...e.dataset})')

            def focus_scene():
                scene.locator('canvas:not(.castle-flight)').focus()

            # Real keyboard input; reduced-motion lets test setup jump precisely,
            # without exposing a production setter or lengthy hidden animation.
            page.emulate_media(reduced_motion='reduce')
            focus_scene()
            for pose in poses[1 if mobile else 0][1:]:
                desired = pose['travel']
                current = float(snapshot()['flight'])
                count = round((desired - current) / .035)
                for _ in range(abs(count)):
                    page.keyboard.press('ArrowDown' if count > 0 else 'ArrowUp')
                page.wait_for_timeout(120)
                residual=desired-float(snapshot()['flight'])
                if abs(residual)>.000001:
                    point=scene.locator('canvas:not(.castle-flight)').evaluate('''canvas=>{
                        for(const fy of [.45,.6,.3])for(const fx of [.25,.45,.7,.85]){
                            const x=innerWidth*fx,y=innerHeight*fy;
                            if(document.elementFromPoint(x,y)===canvas)return {x,y};
                        }return null;
                    }''')
                    assert point
                    page.mouse.move(point['x'],point['y'])
                    page.mouse.wheel(0,residual/.00032)
                page.wait_for_timeout(600)
                state = snapshot()
                if 12 <= pose['node'] <= 15:
                    page.wait_for_function("document.querySelector('#cosmos').dataset.castleLoaded === '21'")
                    state = snapshot()
                assert state.get('castleOrbit') == 'continuous'
                assert state.get('castleProjection') == 'world-capture-plane'
                assert page.locator('.castle-orbit').count() == 0
                assert scene.evaluate('e=>!e.inert')
                assert page.locator('#intro').evaluate('e=>Number(getComputedStyle(e).opacity)<.05')
                records.append({'node': pose['node'], 'state': state})
                if pose['node'] in (12, 14, 16):
                    page.screenshot(path=str(output / f'{name}-node-{pose["node"]}.png'))
                if 12 <= pose['node'] <= 15:
                    assert state.get('castleSupported') == 'true', state
                    assert abs(float(state['castleElevation']) + 11.3864) < .2, state
                    comparison=scene.evaluate('''e=>({box:e.querySelector('.castle-flight').getBoundingClientRect().toJSON(),
                        declared:e.dataset.castleBounds.split(',').map(Number)})''')
                    actual_box,declared=comparison['box'],comparison['declared']
                    # Browser CSS matrices use compositor float precision;
                    # allow subpixel rounding, not a different projection.
                    assert all(abs(actual_box[k]-v)<.3 for k,v in zip(['x','y','width','height'],declared)),comparison
                if pose['node'] == 14:
                    x0,y0,w0,h0 = map(float,state['castleBounds'].split(','))
                    assert x0 >= -1 and x0+w0 <= width+1 and y0 >= -1 and y0+h0 <= height+1, state
                    if name=='phone':
                        # Let the existing exponential camera easing settle;
                        # compare physical poses, not incidental decimal rounding.
                        page.wait_for_timeout(1000)
                        before_rotation=list(map(float,snapshot()['cameraPosition'].split(',')))
                        page.set_viewport_size({'width':844,'height':390})
                        page.wait_for_timeout(500)
                        after_rotation=list(map(float,snapshot()['cameraPosition'].split(',')))
                        assert sum((a-b)**2 for a,b in zip(before_rotation,after_rotation))**.5<.03, {'before':before_rotation,'after':after_rotation}
                        assert snapshot()['castleVisible']=='true'
                        page.screenshot(path=str(output/'phone-rotated.png'))
                        page.set_viewport_size({'width':width,'height':height})
                        page.wait_for_timeout(300)
            centers=[]
            for record in records:
                if record['node'] in (13,14,15):
                    x0,_,w0,_=map(float,record['state']['castleBounds'].split(','))
                    centers.append(x0+w0/2)
            assert max(centers)-min(centers)>width*.06,centers
            # One more wheel/touch gesture must continue, not hit a castle hold.
            page.emulate_media(reduced_motion='no-preference')
            focus_scene()
            previous = float(snapshot()['flight'])
            page.keyboard.press('ArrowDown')
            page.wait_for_timeout(600)
            assert float(snapshot()['flight']) > previous
            # Reverse through the castle with actual wheel / touch events. The
            # visible representation must never capture or halt either input.
            point = scene.locator('canvas:not(.castle-flight)').evaluate('''canvas=>{
                for(const fy of [.55,.7,.8,.4])for(const fx of [.25,.45,.7,.85]){
                    const x=innerWidth*fx,y=innerHeight*fy;
                    if(document.elementFromPoint(x,y)===canvas)return {x,y};
                }return null;
            }''')
            assert point
            page.mouse.move(point['x'],point['y'])
            cdp = context.new_cdp_session(page) if mobile else None
            samples=[]
            for _ in range(35):
                # Labels move across the viewport during a pass. Each gesture
                # starts on actual open space, not on a now-overlapping button.
                point = scene.locator('canvas:not(.castle-flight)').evaluate('''canvas=>{
                    for(const fy of [.45,.55,.65,.3])for(const fx of [.25,.45,.7,.85]){
                        const x=innerWidth*fx,y=innerHeight*fy;
                        if(document.elementFromPoint(x,y)===canvas)return {x,y};
                    }return null;
                }''')
                assert point
                page.mouse.move(point['x'],point['y'])
                if mobile:
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':point['x'],'y':point['y'],'id':1}]})
                    page.wait_for_timeout(16)
                    for step in range(1,4):
                        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':point['x'],'y':point['y']+step*18,'id':1}]})
                        page.wait_for_timeout(16)
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                else:
                    page.mouse.wheel(0,-180)
                page.wait_for_timeout(90)
                state=snapshot();samples.append(float(state['flight']))
                assert page.locator('.castle-orbit').count()==0
                assert state['castleOrbit']=='continuous'
            page.wait_for_timeout(1600)
            assert float(snapshot()['flight'])<previous-.5, {'before':previous,'after':snapshot()}
            assert all(b<=a+.00001 for a,b in zip(samples,samples[1:])),samples
            # Stop by releasing input, then verify world animation is alive.
            stop=snapshot()
            page.wait_for_timeout(250)
            assert snapshot()['flight']==stop['flight']
            assert float(snapshot()['animationTime'])>float(stop['animationTime'])
            assert not errors, errors
            assert not http_errors, http_errors
            assert not [u for u in requests if '/observatory' in u and '.glb' in u], requests
            assert all('/astra/' in u for u in requests if '/castle-orbit/transparent/' in u)
            report.append({'viewport': name, 'records': records, 'dollyCenters':centers, 'reverseSamples':samples,
                           'video':str(page.video.path()) if args.record_video else None,'errors': errors, 'httpErrors': http_errors})
            print(name + ': continuous passage, screenshots, input: PASS', flush=True)
            context.close()
        # One temporary central-frame failure: bounded retry, no flight lock.
        context = browser.new_context(viewport={'width':1440,'height':900})
        page = context.new_page()
        attempts=[]
        def temporary_failure(route):
            attempts.append(route.request.url)
            if len(attempts)==1:
                route.fulfill(status=503,content_type='text/plain',body='Synthetic frame failure')
            else:
                route.continue_()
        page.route('**/castle-orbit/transparent/f10.webp',temporary_failure)
        page.goto(base+'spatial/#galaxy',wait_until='networkidle')
        page.wait_for_function("document.querySelector('#cosmos')?.dataset.castleLoaded === '1'",timeout=30000)
        assert len(attempts)==2,attempts
        assert page.locator('#cosmos').get_attribute('data-castle-failed')=='0'
        page.locator('#cosmos canvas:not(.castle-flight)').focus()
        page.keyboard.press('ArrowDown')
        page.wait_for_timeout(350)
        assert float(page.locator('#cosmos').get_attribute('data-flight'))>0
        assert page.locator('.castle-orbit').count()==0
        report.append({'temporaryFrameFailure':'PASS','centralAttempts':len(attempts)})
        context.close()
        browser.close()
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
