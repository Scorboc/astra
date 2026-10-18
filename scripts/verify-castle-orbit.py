"""Production-base browser checks. Only isolated synthetic browser contexts are used."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:64995/astra/')
    parser.add_argument('--output', default='artifacts/castle-orbit-check')
    args = parser.parse_args()
    base = args.base.rstrip('/') + '/'
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    report = []

    def hover_scene(page):
        # Labels legitimately intercept the center of the canvas. Find a real unobstructed point.
        point = page.locator('#cosmos canvas:not(.castle-flight)').evaluate('''canvas => {
          for(const fy of [.35,.5,.65,.75])for(const fx of [.8,.65,.9,.5,.35]){
            const x=innerWidth*fx,y=innerHeight*fy;
            if(document.elementFromPoint(x,y)===canvas)return {x,y};
          }
          return null;
        }''')
        assert point, 'No unobstructed flight input area'
        page.mouse.move(point['x'], point['y'])
        return point

    with sync_playwright() as p:
        chrome = Path('C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
        browser = p.chromium.launch(headless=True, **({'executable_path': str(chrome)} if chrome.exists() else {}))
        for name, width, height, mobile in [('desktop', 1440, 900, False), ('phone', 390, 844, True), ('landscape', 844, 390, True)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
            page = context.new_page()
            errors, http_errors, warnings, requests = [], [], [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else warnings.append(m.text) if m.type == 'warning' else None)
            page.on('response', lambda r: http_errors.append(f'{r.status}: {r.url}') if r.status >= 400 else None)
            page.on('request', lambda r: requests.append(r.url))
            page.goto(base + 'castle-orbit/', wait_until='networkidle')
            orbit = page.locator('.castle-orbit')
            page.wait_for_function("document.querySelector('.castle-orbit')?.dataset.loaded === '21'")
            assert orbit.get_attribute('data-failed') == '0'
            frame_requests = [u for u in requests if '/castle-orbit/transparent/f' in u]
            assert len(frame_requests) == 21 and frame_requests[0].endswith('/f10.webp'), frame_requests
            assert all(urlsplit(u).path.startswith('/astra/') for u in frame_requests)
            stage, slider = orbit.locator('.castle-orbit__stage'), orbit.locator('input')
            for i in range(21):
                slider.fill(str(i))
                assert orbit.get_attribute('data-actual-frame') == str(i)
            orbit.get_by_role('button', name='Вернуть фронтальный вид').click()
            stage.focus()
            page.keyboard.press('ArrowRight')
            assert orbit.get_attribute('data-frame') == '11'
            page.keyboard.press('Home')
            assert orbit.get_attribute('data-frame') == '10'
            stage.hover()
            page.mouse.wheel(0, 80)
            page.wait_for_function("document.querySelector('.castle-orbit').dataset.frame === '11'")
            orbit.get_by_role('button', name='Вернуть фронтальный вид').click()
            box = stage.bounding_box()
            assert box and box['height'] > 0
            x, y = box['x'] + box['width'] * .65, box['y'] + box['height'] / 2
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(x - 100, y, steps=6)
            page.mouse.up()
            assert int(orbit.get_attribute('data-frame')) > 10
            page.wait_for_timeout(700)
            orbit.get_by_role('button', name='Вернуть фронтальный вид').click()
            if mobile:
                cdp = context.new_cdp_session(page)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]})
                for step in range(1, 7):
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x - step * 16, 'y': y, 'id': 1}]})
                    page.wait_for_timeout(16)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                assert int(orbit.get_attribute('data-frame')) > 10
                orbit.get_by_role('button', name='Вернуть фронтальный вид').click()
            geometry = orbit.evaluate('''root => {
              const b = root.querySelector('.castle-orbit__stage').getBoundingClientRect();
              return {stage: {x:b.x,y:b.y,width:b.width,height:b.height},
                buttons: [...root.querySelectorAll('button')].map(e => {const r=e.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,y:r.y}}),
                overflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth};
            }''')
            assert not geometry['overflow'], geometry
            assert all(b['w'] >= 44 and b['h'] >= 44 and b['y'] + b['h'] <= height + 1 for b in geometry['buttons']), geometry
            # Same-size canvas comparison: this detects postprocessing, cropping and color changes.
            pixels = page.evaluate('''async base => {
              const actual=document.querySelector('.castle-orbit canvas'), im=new Image();
              im.src=base+'castle-orbit/transparent/f10.webp'; await im.decode();
              const reference=document.createElement('canvas'); reference.width=actual.width;reference.height=actual.height;
              const ctx=reference.getContext('2d');
              const s=Math.min(reference.width/im.width,reference.height/im.height);
              ctx.drawImage(im,(reference.width-im.width*s)/2,(reference.height-im.height*s)/2,im.width*s,im.height*s);
              const a=actual.getContext('2d').getImageData(0,0,actual.width,actual.height).data;
              const b=ctx.getImageData(0,0,reference.width,reference.height).data;
              let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
              return {changed,total:a.length};
            }''', base)
            assert pixels['changed'] == 0, pixels
            page.screenshot(path=str(output / f'{name}-standalone.png'))
            page.emulate_media(reduced_motion='reduce')
            page.wait_for_function("document.querySelector('.castle-orbit').dataset.reducedMotion === 'true'")
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(x - 75, y, steps=5)
            page.mouse.up()
            reduced_frame = orbit.get_attribute('data-frame')
            page.wait_for_timeout(400)
            assert orbit.get_attribute('data-frame') == reduced_frame
            page.emulate_media(reduced_motion='no-preference')
            orbit.get_by_role('button', name='В галактику').click()
            page.wait_for_url(base + 'spatial/#galaxy')
            page.wait_for_function("document.querySelector('#cosmos')?.dataset.sceneReady === 'true'", timeout=90000)
            assert page.locator('.castle-orbit').count() == 0
            frame_start = len([u for u in requests if '/castle-orbit/transparent/f' in u])
            assert not any('observatory.glb' in u or 'architecture-reference-v2.webp' in u for u in requests)
            assert frame_start == 21, 'The galaxy must not request any prerendered frames'
            hover_scene(page)
            page.mouse.wheel(0, 180)
            page.wait_for_timeout(400)
            assert page.locator('.castle-orbit').count() == 0
            page.wait_for_function("document.querySelector('#cosmos').dataset.rendering === 'active'")
            page.wait_for_function("document.querySelector('#cosmos').dataset.castleRender === 'live-3d-v8'",timeout=90000)
            animation_before = float(page.locator('#cosmos').get_attribute('data-animation-time'))
            page.wait_for_timeout(250)
            assert float(page.locator('#cosmos').get_attribute('data-animation-time')) > animation_before
            # The live GLB passage itself is covered by verify-castle-live.py.
            assert page.locator('.main-nav a').count() == 6
            for a in page.locator('.main-nav a').all():
                r = a.bounding_box()
                assert r and r['y'] + r['height'] <= height + 1, r
                assert a.evaluate('e => {const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
            assert not errors, {'errors': errors, 'httpErrors': http_errors}
            assert not http_errors, http_errors
            assert not [u for u in requests if u.startswith('http') and urlsplit(u).hostname not in ('127.0.0.1', 'localhost')], requests
            report.append({'viewport': name, 'size': [width, height], 'frames': 21, 'pixels': pixels, 'geometry': geometry,
                           'continuousGalaxy': True, 'errors': errors, 'httpErrors': http_errors, 'warnings': warnings})
            print(f'{name}: standalone 21 frames, mouse/touch/keyboard, reduced motion, galaxy link: PASS', flush=True)
            context.close()

        # A failed frame stays an explicit load failure; retry must restore the real frame.
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()
        failed_once = False
        def fail_once(route):
            nonlocal failed_once
            if not failed_once:
                failed_once = True
                route.fulfill(status=503, content_type='text/plain', body='synthetic test failure')
            else:
                route.continue_()
        page.route('**/castle-orbit/transparent/f05.webp', fail_once)
        page.goto(base + 'castle-orbit/', wait_until='networkidle')
        page.wait_for_function("document.querySelector('.castle-orbit').dataset.failed === '1'")
        page.get_by_role('button', name='Повторить загрузку').click()
        page.wait_for_function("document.querySelector('.castle-orbit').dataset.loaded === '21'")
        assert page.locator('.castle-orbit').get_attribute('data-failed') == '0'
        report.append({'failureRetry': 'PASS'})
        context.close()

        # Built-in synthetic 1/1 account in a fresh context; never touches owner browser storage.
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        page = context.new_page()
        room_errors = []
        page.on('pageerror', lambda e: room_errors.append(str(e)))
        page.goto(base + 'spatial/#login', wait_until='networkidle')
        page.locator('input[name="login"]').fill('1')
        page.locator('input[name="password"]').fill('1')
        page.get_by_role('button', name='Войти', exact=True).click()
        page.wait_for_function("location.hash === '#galaxy'")
        page.wait_for_function("document.querySelector('#cosmos')?.dataset.sceneReady === 'true'", timeout=90000)
        for world in ['origin', 'aurora', 'velir', 'nereya', 'solis', 'observatory']:
            page.locator(f'.main-nav [data-world="{world}"]').click()
            expected = '#observatory' if world == 'observatory' else f'#planet/{world}'
            page.wait_for_function('expected => location.hash === expected', arg=expected)
            page.wait_for_function("document.body.classList.contains('world-interior')")
            assert page.locator('body').evaluate("e => e.classList.contains('world-interior')")
            assert page.locator('.castle-orbit').count() == 0
            page.go_back(wait_until='networkidle')
            page.wait_for_function("location.hash === '#galaxy'")
            page.go_forward(wait_until='networkidle')
            page.wait_for_function('expected => location.hash === expected', arg=expected)
            page.go_back(wait_until='networkidle')
            page.wait_for_function("location.hash === '#galaxy'")
        assert not room_errors, room_errors
        report.append({'roomRoutesAndHistory': 'PASS', 'rooms': 6, 'pageErrors': room_errors})
        context.close()
        browser.close()
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
