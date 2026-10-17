import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("ASTRA_URL", "http://127.0.0.1:5190/spatial/")
CHROME = "C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    for name, width, height, mobile, expected in [
        ("desktop", 1280, 720, False, "4096x2048"),
        ("phone", 390, 844, True, "4096x2048"),
    ]:
        context = browser.new_context(viewport={"width": width, "height": height}, is_mobile=mobile, has_touch=mobile)
        page = context.new_page()
        errors, textures = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: textures.append(request.url) if "origin-moon-detailed-v2" in request.url else None)
        page.goto(URL + "#login", wait_until="networkidle")
        page.locator("#account-form [name=login]").fill("1")
        page.locator("#account-form [name=password]").fill("1")
        page.locator("#account-form [type=submit]").click()
        page.wait_for_url("**/#galaxy")
        page.wait_for_function("document.querySelector('#cosmos')?.dataset.originFullStatus?.startsWith('uploaded-')", timeout=90000)
        observed = page.locator("#cosmos").evaluate("element => ({status:element.dataset.originFullStatus, texture:element.dataset.originTexture, ready:element.dataset.sceneReady})")
        assert observed["texture"] == expected, observed
        assert any(f"origin-moon-detailed-v2-{expected.split('x')[0]}.webp" in url for url in textures), textures
        assert not errors, errors
        page.screenshot(path=str(ROOT / "artifacts" / f"origin-moon-v2-{name}-scene.png"))
        print(name, observed, "new asset requested", len(textures), "page errors", len(errors))
        context.close()
    browser.close()
