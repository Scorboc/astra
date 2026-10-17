import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(os.environ.get("ASTRA_CAPTURE_DIR", str(ROOT / "artifacts" / "planet-4k-check")))
OUTPUT.mkdir(parents=True, exist_ok=True)
WORLDS = ("aurora", "velir", "nereya", "solis")
APP_URL = os.environ.get("ASTRA_URL", "http://127.0.0.1:5190/spatial/")
SKIP_SPHERES = os.environ.get("ASTRA_SKIP_SPHERES") == "1"
ORIGIN = "{0.scheme}://{0.netloc}".format(urlsplit(APP_URL))

with sync_playwright() as playwright:
    chrome = Path(os.environ.get("ASTRA_CHROMIUM", "C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"))
    browser = playwright.chromium.launch(headless=True, **({"executable_path": str(chrome)} if chrome.exists() else {}))
    for device, width, height, mobile in (("desktop", 1280, 720, False), ("phone", 390, 844, True)):
        context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        page = context.new_page()
        errors = []
        console_errors = []
        failed_responses = []
        requests = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("response", lambda response: failed_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
        page.on("request", lambda request: requests.append(request.url) if "-detailed-v2-4096.webp" in request.url else None)
        page.goto(APP_URL + "?demo=1#galaxy", wait_until="networkidle")
        page.wait_for_function("document.querySelector('#cosmos')?.dataset.sceneReady === 'true'", timeout=90000)
        for world in WORLDS:
            page.evaluate("world => { location.hash = '#planet/' + world }", world)
            try:
                page.wait_for_function("world => document.querySelector('#cosmos')?.dataset[world + 'Texture'] === '4096x2048'", arg=world, timeout=60000)
            except Exception:
                print("DIAGNOSTIC", world, page.locator("#cosmos").evaluate("element => ({...element.dataset})"), requests, errors, console_errors)
                raise
            page.wait_for_timeout(2500)
            page.screenshot(path=str(OUTPUT / f"{device}-{world}.png"))
            print(f"{device} {world}: 4096x2048 loaded")
        if not SKIP_SPHERES:
            context.close()
            context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            page.on("response", lambda response: failed_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
            page.on("request", lambda request: requests.append(request.url) if "-detailed-v2-4096.webp" in request.url else None)
            page.goto(ORIGIN + "/scripts/fixtures/planet-material-review.html", wait_until="networkidle", timeout=90000)
            page.wait_for_function("document.body.dataset.ready === 'true'", timeout=90000)
            for world in WORLDS:
                page.evaluate("world => window.reviewScene.focus(world)", world)
                try:
                    page.wait_for_function("world => document.querySelector('#cosmos')?.dataset[world + 'Texture'] === '4096x2048'", arg=world, timeout=30000)
                except Exception:
                    print("SPHERE DIAGNOSTIC", world, page.locator("#cosmos").evaluate("element => ({...element.dataset})"), failed_responses, errors, console_errors)
                    raise
                page.wait_for_timeout(300)
                page.screenshot(path=str(OUTPUT / f"{device}-{world}-sphere.png"))
                print(f"{device} {world}: sphere rendered")
        assert not errors, errors
        assert not failed_responses, failed_responses
        assert not console_errors, console_errors
        assert all(any(f"/{world}-detailed-v2-4096.webp" in url for url in requests) for world in WORLDS), requests
        print(f"{device}: {len(requests)} detailed asset requests, {len(errors)} page errors")
        context.close()
    browser.close()
