"""Verify every merged hall action against the actual delivered artwork."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('ASTRA_URL','http://127.0.0.1:5201/astra/spatial/')
OUT=ROOT/'artifacts/cinematic-hotspots';OUT.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
    for name,width,height in [('desktop',1440,900),('phone',390,844)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=name=='phone',has_touch=name=='phone')
        page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 else None)
        page.goto(BASE+'#login',wait_until='networkidle')
        page.locator('#account-form [name=login]').fill('1');page.locator('#account-form [name=password]').fill('1')
        page.locator('#account-form [type=submit]').click();page.wait_for_url('**/#galaxy');page.wait_for_load_state('networkidle')
        for world in ['origin','aurora','velir','nereya','solis','observatory']:
            route='observatory' if world=='observatory' else 'planet/'+world
            page.locator(f'.main-nav a[href="#{route}"]').click()
            page.wait_for_url('**/#'+route)
            page.wait_for_selector(f'.council-room[data-room="{world}"] .hall-art')
            page.wait_for_function("document.querySelector('#cosmos').dataset.rendering==='suspended'",timeout=60000)
            page.locator('.hall-art').evaluate('(x)=>x.decode()')
            source=page.locator('.hall-art').evaluate('(x)=>x.currentSrc')
            assert f'{world}-hall-cinematic-v3' in source,source
            assert ('-compact.webp' in source)==(name=='phone'),source
            page.screenshot(path=str(OUT/f'{name}-{world}.png'))
            count=page.locator('.hall-spot').count()
            assert count==(4 if world=='observatory' else 3),(world,count)
            for index in range(count):
                selector=f'.hall-sheet [data-spot="{index}"]' if name=='phone' else f'.hall-spot[data-spot="{index}"]'
                page.locator(selector).click()
                if world=='observatory':
                    menu=page.locator(f'#room-menu-{index}')
                    assert menu.is_visible(),(name,world,index)
                    menu.locator('[data-research="room-close"]').click()
                else:
                    card=page.locator(f'#spot-card-{index}');card.wait_for(state='visible');page.wait_for_timeout(420)
                    bounds=card.bounding_box();assert bounds and bounds['x']>=-1 and bounds['x']+bounds['width']<=width+1 and bounds['y']>=-1 and bounds['y']+bounds['height']<=height+1,(name,world,index,bounds)
                    opened=card.locator('[data-research^="go:"]');destination=opened.get_attribute('data-research')[3:]
                    opened.click();page.wait_for_url('**/#'+destination)
                    page.go_back();page.wait_for_url('**/#'+route);page.wait_for_selector('.hall-spot')
            report.append({'view':name,'room':world,'source':source,'actions':count,'passed':True})
            print(json.dumps(report[-1]),flush=True)
        assert not errors,errors
        page.locator('[data-action="close-panel"]').click();page.wait_for_url('**/#galaxy')
        page.wait_for_function("document.querySelector('#cosmos').dataset.rendering==='active'",timeout=30000)
        context.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
