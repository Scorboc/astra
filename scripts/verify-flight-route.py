"""Camera choreography on the actual /astra/ build, using isolated synthetic contexts."""
import argparse,json,subprocess,math,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageOps,ImageDraw

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base',default='http://127.0.0.1:64995/astra/')
    parser.add_argument('--output',default='artifacts/flight-route')
    parser.add_argument('--quick',action='store_true')
    parser.add_argument('--motion',action='store_true')
    parser.add_argument('--nodes',type=int,nargs='+')
    args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{flightPose,flightAtNode,FLIGHT_PERIOD,flightSpeed}from'./src/galaxy/playcanvas-path.js';console.log(JSON.stringify({period:FLIGHT_PERIOD,profiles:[false,true].map(c=>({speed:flightSpeed(c),nodes:Array.from({length:21},(_,i)=>{let t=flightAtNode(i,c);return {node:i,travel:t,pose:flightPose(t,c)};})}))}))"],text=True))
    reports=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
        for name,w,h,mobile in ([('desktop',1440,900,False)] if args.quick else [('desktop',1440,900,False),('phone',390,844,True),('landscape',844,390,True)]):
            video={'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}} if args.motion else {}
            ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1,**video)
            page=ctx.new_page();errors=[];http=[];requests=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('response',lambda r:http.append(f'{r.status} {r.url}') if r.status>=400 else None)
            page.goto(args.base.rstrip('/')+'/spatial/#galaxy',wait_until='networkidle')
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.observatory==='ready'",timeout=90000)
            scene=page.locator('#cosmos');canvas=scene.locator('canvas');canvas.focus()
            bundle=next(u for u in requests if '/assets/castle-live-model-' in u)
            page.evaluate('''async url=>{const m=await import(url),pc=Object.values(m).find(x=>x&&typeof x==='object'&&x.AppBase);window.__routeCamera=pc.AppBase.getApplication().root.findByName('ASTRA camera');}''',bundle)
            state=lambda:scene.evaluate('e=>({...e.dataset,cameraFov:window.__routeCamera.camera.fov})')
            initial=state();page.screenshot(path=str(out/f'{name}-initial.png'))
            page.emulate_media(reduced_motion='reduce')
            requested=0
            def move_to(travel):
                nonlocal requested
                canvas.focus();count=round((travel-requested)/.035)
                for _ in range(abs(count)):page.keyboard.press('ArrowDown' if count>0 else 'ArrowUp')
                remaining=travel-(requested+count*.035);requested=travel
                canvas.dispatch_event('wheel',{'deltaY':remaining/.00032,'cancelable':True})
                page.wait_for_function('(t)=>Math.abs(Number(document.querySelector("#cosmos").dataset.flight)-t)<.00003',arg=travel,timeout=10000)
                page.wait_for_timeout(180)
            records=[]
            for node in data['profiles'][int(mobile)]['nodes']:
                if args.nodes and node['node'] not in args.nodes:continue
                move_to(node['travel']);s=state();expected=node['pose']['position'];actual=list(map(float,s['cameraPosition'].split(',')))
                assert math.dist(actual,[expected['x'],expected['y'],expected['z']])<.03,(name,node['node'],s)
                aim=node['pose']['target'];direction=[aim[k]-expected[k] for k in ['x','y','z']];length=math.sqrt(sum(v*v for v in direction))
                assert sum(a*b/length for a,b in zip(map(float,s['cameraForward'].split(',')),direction))>.99999
                assert abs(s['cameraFov']-node['pose']['fov'])<.01
                assert s['cameraMode']=='flight' and s['castleWorldMatrix']==initial['castleWorldMatrix']
                if node['node']==15:assert s['castleReflection']=='true' and s['castleWindowMist']=='true'
                image=out/f'{name}-{node["node"]:02}.png';page.screenshot(path=str(image))
                records.append({'node':node['node'],'state':s,'image':str(image)})
            # At rest the image stays still; the living universe resumes normally.
            move_to(data['profiles'][int(mobile)]['nodes'][15]['travel'])
            frozen=state()['castleAnimationTime'];page.wait_for_timeout(200);assert frozen==state()['castleAnimationTime']
            if mobile:
                before=state()['cameraPosition'];page.set_viewport_size({'width':h,'height':w});page.wait_for_timeout(300)
                assert state()['cameraPosition']==before;page.set_viewport_size({'width':w,'height':h})
            page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(200);assert frozen!=state()['castleAnimationTime']
            motion=[]
            if args.motion and not mobile:
                page.emulate_media(reduced_motion='reduce');move_to(0);page.emulate_media(reduced_motion='no-preference');canvas.focus()
                started=time.monotonic()
                while float(state()['flight'])<data['period']:
                    assert time.monotonic()-started<180,'normal motion failed to complete a loop'
                    canvas.dispatch_event('wheel',{'deltaY':130,'cancelable':True})
                    page.wait_for_timeout(250);motion.append(state())
                assert len({s['cameraPosition'] for s in motion})>25
                page.wait_for_timeout(1600);rest=state()['cameraPosition'];page.wait_for_timeout(300);assert state()['cameraPosition']==rest
            # Native wheel, keyboard, and CDP touch are exercised without reduced motion.
            start=float(state()['flight']);canvas.focus();page.keyboard.press('ArrowUp');page.wait_for_timeout(800)
            assert float(state()['flight'])<start
            start=float(state()['flight']);canvas.dispatch_event('wheel',{'deltaY':-80,'cancelable':True});page.wait_for_timeout(800)
            assert float(state()['flight'])<start
            if mobile:
                point=canvas.evaluate('''c=>{for(const fy of [.4,.6,.3])for(const fx of [.15,.4,.85]){let x=innerWidth*fx,y=innerHeight*fy;if(document.elementFromPoint(x,y)===c)return {x,y};}return null;}''')
                assert point;cdp=ctx.new_cdp_session(page);start=float(state()['flight'])
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
                for i in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':point['x'],'y':point['y']+i*8}]})
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(1000)
                assert float(state()['flight'])<start
            assert not errors,errors;assert not http,http
            sheet=Image.new('RGB',(4*360,math.ceil(len(records)/4)*245),'#080b10');draw=ImageDraw.Draw(sheet)
            for i,r in enumerate(records):
                im=Image.open(r['image']).convert('RGB');im.thumbnail((360,225));x=i%4*360;y=i//4*245
                sheet.paste(im,(x+(360-im.width)//2,y));draw.text((x+5,y+227),str(r['node']),fill='white')
            sheet.save(out/f'{name}-contact.jpg',quality=90)
            video_path=str(page.video.path()) if page.video else None
            reports.append({'profile':name,'initial':initial,'records':records,'motion':motion,'video':video_path,'errors':errors,'http':http})
            ctx.close();(out/'report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
            print(name+f': exact route, {len(records)} views, native input, mirror, orientation, reduced motion: PASS',flush=True)
        browser.close()
if __name__=='__main__':main()
