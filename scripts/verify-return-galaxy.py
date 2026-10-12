"""Check the visible hall exit on the published Astra site with a fresh test account."""

import os
from playwright.sync_api import sync_playwright


BASE = os.environ.get("ASTRA_URL", "https://scorboc.github.io/astra/spatial/")
CHROME = r"C:\Users\Admin\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe"
ROOMS = ["planet/origin", "planet/aurora", "planet/velir", "planet/nereya", "planet/solis", "observatory"]


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    try:
        sizes = [("desktop", 1440, 900), ("phone", 375, 812), ("landscape", 844, 390)]
        for name, width, height in sizes:
            if os.environ.get("ASTRA_VIEW") and os.environ["ASTRA_VIEW"] != name:
                continue
            context = browser.new_context(
                viewport={"width": width, "height": height},
                is_mobile=name != "desktop",
                has_touch=name != "desktop",
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(BASE + "#login", wait_until="networkidle")
            page.locator('#account-form [name="login"]').fill("1")
            page.locator('#account-form [name="password"]').fill("1")
            page.locator('#account-form [type="submit"]').click()
            page.wait_for_url("**/#galaxy")
            for room in ROOMS:
                page.locator(f'.main-nav a[href="#{room}"]').click()
                page.wait_for_url("**/#" + room)
                page.locator(".council-room").wait_for(state="visible")
                exit_button = page.get_by_role("button", name="Вернуться в галактику")
                assert exit_button.is_visible(), (name, room, "exit hidden")
                exit_button.click()
                page.wait_for_url("**/#galaxy")
                page.wait_for_function("document.body.dataset.activeScreen === 'galaxy'")
                assert page.locator(".journey-panel").is_hidden(), (name, room, "panel stays open")
                page.locator(f'.main-nav a[href="#{room}"]').click()
                page.wait_for_url("**/#" + room)
                page.locator(".council-room").wait_for(state="visible")
                open_menu = page.locator('.council-menu:visible')
                if open_menu.count():
                    open_menu.locator('[data-research="room-close"]').click()
                page.locator('[data-research="room-open:0"]').click()
                exit_button.click()
                page.wait_for_url("**/#galaxy")
                page.wait_for_function("document.body.dataset.activeScreen === 'galaxy'")
                assert page.locator(".journey-panel").is_hidden(), (name, room, "panel stays open after menu")
            assert not errors, (name, errors)
            print(name, "PASS", len(ROOMS) * 2, "returns")
            context.close()
    finally:
        browser.close()
