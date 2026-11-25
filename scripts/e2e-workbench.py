"""Headless browser smoke tests. Synthetic inputs only; no production site or profile."""
import argparse
import functools
import http.server
import pathlib
import subprocess
import threading
import time
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = None
PAGES = ('', 'gosplan13/', 'inventory_batch/', 'red_index/', 'document_builder/')


def serve(site=False):
    # Only tracked runtime assets, never a directory listing or local data.
    tracked = ([p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()]
               if site else subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0'))
    runtime_roots = ('css/', 'dist/', 'shared/') + tuple(t + d for t in PAGES[1:] for d in ('css/', 'dist/'))
    runtime_pages = {t + 'index.html' for t in PAGES} | {'favicon.ico'}
    allowed = {p for p in tracked if (p in runtime_pages or (p.startswith(runtime_roots) and pathlib.PurePosixPath(p).suffix in ('.css', '.js'))) and (ROOT / p).is_file() and (ROOT / p).resolve() == ROOT / p}

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            path = unquote(urlsplit(self.path).path).lstrip('/')
            if path in PAGES:
                path += 'index.html'
            if path not in allowed:
                self.send_error(404)
                return
            self.path = '/' + path
            super().do_GET()

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def wait_for_saved_product(context, base, timeout=10):
    # Playwright's storage snapshot reads storage without page-side string eval.
    # Poll in Python, keeping the real CSP and actual asynchronous write intact.
    origin = base.rstrip('/')
    deadline = time.monotonic() + timeout
    while True:
        for entry in context.storage_state().get('origins', []):
            if entry['origin'] != origin:
                continue
            for item in entry.get('localStorage', []):
                if item['name'] == 'workbench.red-index.v1' and 'Synthetic product' in item['value']:
                    return
        if time.monotonic() >= deadline:
            raise AssertionError('RED INDEX autosave did not persist the synthetic product')
        time.sleep(0.1)


def run(browser, base):
    errors = []
    def new_context(**kwargs):
        ctx = browser.new_context(**kwargs)
        def route_request(route):
            if route.request.url.startswith(base):
                route.continue_()
            else:
                errors.append('unexpected external request')
                route.abort()
        ctx.route('**/*', route_request)
        return ctx

    def new_page(ctx):
        page = ctx.new_page()
        page.on('pageerror', lambda _: errors.append('uncaught page error'))
        page.on('console', lambda msg: errors.append('browser console error') if msg.type == 'error' else None)
        page.on('requestfailed', lambda _: errors.append('resource request failed'))
        page.on('response', lambda res: errors.append('HTTP error') if res.status >= 400 else None)
        page.on('dialog', lambda d: (errors.append('unexpected dialog'), d.dismiss()))
        return page

    def ready(page):
        expect(page.locator('[data-workbench-build-info]')).to_contain_text('WORKBENCH v')

    ctx = new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    try:
        page = new_page(ctx)
        page.goto(base, wait_until='load'); ready(page)
        for path in PAGES[1:]:
            page.locator(f'a.tool-card[href="./{path}"]').click()
            expect(page).to_have_url(base + path)
            ready(page)
            page.goto(base, wait_until='load')
        print('PASS: five-page desktop navigation and startup', flush=True)

        page.goto(base + 'gosplan13/', wait_until='load')
        row = page.locator('#a4-preview .product-label').first
        row.locator('.product-label__name-input').fill('Synthetic item')
        jan_input = row.locator('.product-label__jan-input')
        jan_input.fill('490000000000')
        # GOSPLAN13 commits JAN values on focusout, not on input.
        jan_input.press('Tab')
        expect(jan_input).to_have_value('4900000 000009')
        expect(row).to_have_attribute('data-jan', '4900000000009')
        expect(row.locator('.product-label__barcode rect').nth(1)).to_be_attached()
        page.locator('#preview-focus-button').click()
        expect(page.locator('#preview-focus-exit-button')).to_be_visible()
        page.locator('#preview-focus-exit-button').click()
        expect(page.locator('#preview-focus-button')).to_be_visible()
        print('PASS: GOSPLAN13 barcode and preview controls', flush=True)

        page.goto(base + 'inventory_batch/', wait_until='load')
        csv = 'ＰＬＵコード,商品名称,理論在庫数量\n4900000000009,Synthetic inventory,2\n'.encode('utf-8-sig')
        page.locator('#csv-file-input').set_input_files({'name':'fixture.csv','mimeType':'text/csv','buffer':csv})
        expect(page.locator('#inventory-preview')).to_contain_text('Synthetic inventory')
        expect(page.locator('#inventory-preview .inventory-row__barcode rect').nth(1)).to_be_attached()
        print('PASS: INVENTORY BATCH CSV import and barcode output', flush=True)

        page.goto(base + 'red_index/', wait_until='load')
        page.locator('#category-add-button').click()
        category = page.locator('#category-list .category-editor').last
        category.locator('.category-editor__name-input').fill('Synthetic category')
        category.locator('.category-items__add-button').click()
        item = category.locator('.category-item input').last
        item.fill('Synthetic product')
        expect(page.locator('#red-index-content')).to_contain_text('Synthetic product')
        # Wait for the asynchronous localStorage write, then check the real UI after reload.
        wait_for_saved_product(ctx, base)
        page.reload(wait_until='load')
        expect(page.locator('#category-list .category-item input').last).to_have_value('Synthetic product')
        print('PASS: RED INDEX edit, preview and persisted reload', flush=True)

        page.goto(base + 'document_builder/', wait_until='load')
        page.locator('#template-settings-button').click()
        page.locator('#template-builder-button').click()
        page.locator('#template-builder-name').fill('Synthetic document')
        page.locator('.template-builder-field__label').first.fill('Synthetic field')
        page.locator('#template-builder-body').fill('Synthetic body')
        page.locator('#template-builder-save-button').click()
        expect(page.locator('#template-select option').filter(has_text='Synthetic document')).to_have_count(1)
        page.locator('#template-dialog-done-button').click()
        page.locator('#template-select').select_option(label='Synthetic document')
        expect(page.locator('#document-body')).to_contain_text('Synthetic body')
        page.locator('#print-button').click()
        expect(page.locator('#print-flow-dialog')).to_be_visible()
        page.locator('#print-flow-close-button').click()
        print('PASS: DOCUMENT BUILDER template, preview and print dialog', flush=True)
    finally:
        ctx.close()

    mobile = new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    try:
        page = new_page(mobile)
        mobile_failures = []
        for path in PAGES:
            try:
                page.goto(base + path, wait_until='load'); ready(page)
                # The page shell must fit; internal A4 previews remain scrollable.
                width = page.evaluate('() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth})')
                if width['scroll'] > width['client'] + 2:
                    raise AssertionError(f"document overflow: client={width['client']}, scroll={width['scroll']}")
                if path in ('red_index/', 'document_builder/'):
                    stage_selector, paper_selector = (
                        ('.red-index-preview__stage', '#red-index-page') if path == 'red_index/'
                        else ('.document-preview-stage', '#document-page')
                    )
                    # Preserve actual A4 geometry and ensure both edges are reachable.
                    geometry = page.evaluate('''([stageSelector, paperSelector]) => {
                        const stage = document.querySelector(stageSelector);
                        const paper = document.querySelector(paperSelector);
                        const box = stage.getBoundingClientRect();
                        stage.scrollLeft = 0;
                        const first = paper.getBoundingClientRect();
                        stage.scrollLeft = stage.scrollWidth;
                        const last = paper.getBoundingClientRect();
                        stage.scrollLeft = 0;
                        return {width: first.width, height: first.height,
                            left: first.left - box.left, right: box.right - last.right,
                            scroll: stage.scrollWidth, client: stage.clientWidth};
                    }''', [stage_selector, paper_selector])
                    if (abs(geometry['width'] - 210 * 96 / 25.4) > 2 or
                            geometry['height'] < 297 * 96 / 25.4 - 2):
                        raise AssertionError('A4 preview geometry changed')
                    if (geometry['scroll'] <= geometry['client'] or
                            geometry['left'] < -2 or geometry['right'] < -2):
                        raise AssertionError('A4 preview edges are not reachable')
                print('PASS: mobile ' + (path or 'home'), flush=True)
            except Exception as exc:
                mobile_failures.append((path or 'home') + ': ' + str(exc))
                print('FAIL: mobile ' + mobile_failures[-1], flush=True)
        if mobile_failures:
            errors.extend(mobile_failures)
        else:
            print('PASS: mobile five-page startup and viewport width', flush=True)
    finally:
        mobile.close()
    if errors:
        raise AssertionError('Browser failures: ' + ', '.join(errors))
    print('PASS: no browser errors or external requests', flush=True)


def main():
    global ROOT
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True, type=pathlib.Path)
    parser.add_argument('--site', action='store_true', help='Serve the audited deployment directory')
    parser.add_argument('--chromium-executable', help='Optional system Chromium for an isolated test environment')
    args = parser.parse_args()
    ROOT = args.project.resolve()
    server = serve(args.site)
    try:
        with sync_playwright() as p:
            options = {'executable_path': args.chromium_executable} if args.chromium_executable else {}
            browser = p.chromium.launch(headless=True, **options)
            try:
                run(browser, f'http://127.0.0.1:{server.server_port}/')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
