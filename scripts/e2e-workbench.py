"""Headless browser smoke tests. Synthetic inputs only; no production site or profile."""
import argparse
import functools
import http.server
import pathlib
import threading
import time
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = None
PAGES = ('', 'gosplan13/', 'inventory_batch/', 'red_index/', 'document_builder/')
BASE_PATH = '/workbench/'


def serve(site=False):
    # The same audited output is used in CI and local smoke tests. Never serve a source tree.
    if not site:
        raise ValueError('Use npm run build:site and --project site --site')
    tracked = [p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()]
    runtime_roots = ('css/', 'dist/') + tuple(t + d for t in PAGES[1:] for d in ('css/', 'dist/'))
    runtime_pages = {t + 'index.html' for t in PAGES} | {'favicon.ico'}
    allowed = {p for p in tracked if (p in runtime_pages or (p.startswith(runtime_roots) and pathlib.PurePosixPath(p).suffix in ('.css', '.js'))) and (ROOT / p).is_file() and (ROOT / p).resolve() == ROOT / p}

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            url_path = unquote(urlsplit(self.path).path)
            if not url_path.startswith(BASE_PATH):
                self.send_error(404)
                return
            path = url_path[len(BASE_PATH):]
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
    parsed = urlsplit(base)
    origin = f'{parsed.scheme}://{parsed.netloc}'
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

    def modal_button_feedback(button, normal, hover):
        expect(button).to_be_enabled()
        expect(button).to_have_css('background-color', normal)
        expect(button).to_have_css('background-image', 'none')
        expect(button).to_have_css('box-shadow', 'none')
        expect(button).to_have_css('transform', 'none')
        assert button.evaluate("b => getComputedStyle(b, '::before').content") == 'none'
        button.hover()
        expect(button).to_have_css('background-color', hover)
        expect(button).to_have_css('transform', 'none')
        expect(button).to_have_css('box-shadow', 'none')

    def release_history(page, expected=None, mobile=False):
        trigger = page.locator('.footer__release-button')
        footer = page.locator('[data-workbench-build-info]')
        expect(footer).to_contain_text('build:')
        trigger.click()
        dialog = page.get_by_role('dialog', name='アップデート履歴')
        expect(dialog).to_be_visible()
        expect(page.locator('body > .release-history')).to_have_count(1)
        expect(dialog.locator('.release-history__badge')).to_have_count(1)
        versions = dialog.locator('.release-history__entry h3').all_text_contents()
        assert len(versions) >= 1 and versions[0].startswith(trigger.inner_text().replace('WORKBENCH ', ''))
        content = dialog.locator('.release-history__content').inner_text()
        if expected is not None:
            assert content == expected, 'release history differs between tools'
        close = dialog.get_by_role('button', name='閉じる')
        dialog.locator('.release-history__header h2').hover()
        expect(close.locator('svg')).to_have_count(1)
        expect(close).to_have_css('width', '32px')
        expect(close).to_have_css('height', '32px')
        expect(close).to_have_css('background-color', 'rgba(0, 0, 0, 0)')
        # Existing WORKBENCH dialogs are light even under OS dark mode.
        expect(dialog).to_have_css('background-color', 'rgb(255, 255, 255)')
        expect(dialog).to_have_css('color-scheme', 'light')
        expect(close).to_have_css('color', 'rgb(107, 114, 128)')
        if not mobile:
            modal_button_feedback(close, 'rgba(0, 0, 0, 0)', 'rgb(243, 244, 246)')
        if mobile:
            bounds = dialog.bounding_box()
            assert bounds and bounds['x'] >= -1 and bounds['x'] + bounds['width'] <= 391, 'release dialog overflows mobile viewport'
        page.emulate_media(media='print')
        expect(dialog).to_be_hidden()
        page.emulate_media(media='screen')
        expect(dialog).to_be_visible()
        if mobile:
            dialog.get_by_role('button', name='閉じる').click()
        else:
            page.keyboard.press('Escape')
        expect(page.locator('.release-history')).to_have_count(0)
        expect(trigger).to_be_focused()
        return content

    def desktop_editor_layout(page, path, viewport_width):
        selectors = (
            ('.red-index-main', '.red-index-editor', '.red-index-preview__stage', '#red-index-page')
            if path == 'red_index/' else
            ('.document-builder-main', '.document-fields-panel', '.document-preview-stage', '#document-page')
        )
        geometry = page.evaluate('''([mainSelector, editorSelector, stageSelector, paperSelector]) => {
            const main = document.querySelector(mainSelector);
            const editor = document.querySelector(editorSelector);
            const stage = document.querySelector(stageSelector);
            const paper = document.querySelector(paperSelector);
            const ribbon = document.querySelector('.workbench-ribbon');
            const groups = [...ribbon.querySelectorAll('.workbench-ribbon__group')];
            const left = editor.getBoundingClientRect();
            const right = stage.getBoundingClientRect();
            stage.scrollLeft = 0;
            const first = paper.getBoundingClientRect();
            stage.scrollLeft = stage.scrollWidth;
            const last = paper.getBoundingClientRect();
            stage.scrollLeft = 0;
            main.scrollLeft = main.scrollWidth;
            const reached = main.scrollLeft;
            const stageRightAtEnd = stage.getBoundingClientRect().right;
            main.scrollLeft = 0;
            ribbon.scrollLeft = ribbon.scrollWidth;
            const ribbonEnd = groups[groups.length - 1].getBoundingClientRect().right;
            ribbon.scrollLeft = 0;
            return {mainRight: main.getBoundingClientRect().right,
                bodyRight: document.body.getBoundingClientRect().right,
                stageRightAtEnd, ribbonEnd, ribbonRight: ribbon.getBoundingClientRect().right,
                rootWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
                editorRight: left.right, stageLeft: right.left, topDelta: Math.abs(left.top - right.top),
                ribbonWrap: getComputedStyle(ribbon).flexWrap,
                groupWrap: groups.map(g => getComputedStyle(g).flexWrap),
                paperWidth: first.width, paperHeight: first.height,
                paperLeft: first.left - right.left, paperRight: right.right - last.right,
                mainWidth: main.scrollWidth, mainClient: main.clientWidth, reached};
        }''', list(selectors))
        assert geometry['rootWidth'] <= geometry['clientWidth'] + 2, 'page shell overflows'
        assert geometry['mainRight'] <= geometry['bodyRight'] + 2, 'editor exceeds its workspace'
        assert geometry['editorRight'] <= geometry['stageLeft'] + 2 and geometry['topDelta'] <= 2, 'editor and preview must remain side by side'
        assert geometry['ribbonWrap'] == 'nowrap' and all(w == 'nowrap' for w in geometry['groupWrap']), 'PC ribbon wrapped'
        assert abs(geometry['paperWidth'] - 210 * 96 / 25.4) <= 2 and geometry['paperHeight'] >= 297 * 96 / 25.4 - 2, 'A4 preview geometry changed'
        assert geometry['paperLeft'] >= -2 and geometry['paperRight'] >= -2, 'A4 preview edges are not reachable'
        assert geometry['ribbonEnd'] <= geometry['ribbonRight'] + 2, 'last ribbon control is not reachable'
        assert geometry['stageRightAtEnd'] <= geometry['mainRight'] + 2, 'preview workspace right edge is not reachable'
        if viewport_width < 1152:
            assert geometry['mainWidth'] > geometry['mainClient'] and geometry['reached'] > 0, 'narrow PC workspace cannot scroll horizontally'

    ctx = new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True, color_scheme='light')
    try:
        page = new_page(ctx)
        page.goto(base, wait_until='load'); ready(page)
        history = release_history(page)
        for path in PAGES[1:]:
            page.locator(f'a.tool-card[href="./{path}"]').click()
            expect(page).to_have_url(base + path)
            ready(page)
            release_history(page, history)
            page.goto(base, wait_until='load')
        print('PASS: five-page desktop navigation, release history, close and print exclusion', flush=True)
        page.locator('#preset-settings-button').click()
        expect(page.locator('#preset-manager-dialog')).to_be_visible()
        modal_button_feedback(page.locator('#preset-manager-add-button'), 'rgb(248, 250, 252)', 'rgb(234, 240, 248)')
        page.locator('.preset-manager-dialog__close').click()
        expect(page.locator('#preset-manager-dialog')).to_be_hidden()

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
        modal_button_feedback(page.locator('#template-builder-button'), 'rgb(248, 250, 252)', 'rgb(234, 240, 248)')
        page.locator('#template-builder-button').click()
        page.locator('#template-builder-name').fill('Synthetic document')
        page.locator('.template-builder-field__label').first.fill('Synthetic field')
        page.locator('#template-builder-body').fill('Synthetic body')
        modal_button_feedback(page.locator('#template-builder-save-button'), 'rgb(53, 106, 165)', 'rgb(40, 90, 145)')
        page.locator('#template-builder-save-button').click()
        expect(page.locator('#template-select option').filter(has_text='Synthetic document')).to_have_count(1)
        page.locator('#template-dialog-done-button').click()
        page.locator('#template-select').select_option(label='Synthetic document')
        expect(page.locator('#document-body')).to_contain_text('Synthetic body')
        main_print = page.locator('#print-button')
        assert 'linear-gradient' in main_print.evaluate('b => getComputedStyle(b).backgroundImage')
        assert main_print.evaluate("b => getComputedStyle(b, '::before').content") != 'none'
        main_print.click()
        expect(page.locator('#print-flow-dialog')).to_be_visible()
        page.locator('#print-flow-close-button').click()
        print('PASS: DOCUMENT BUILDER template, preview and print dialog', flush=True)
        for width in (1280, 1024):
            page.set_viewport_size({'width': width, 'height': 900})
            for path in ('red_index/', 'document_builder/'):
                page.goto(base + path, wait_until='load'); ready(page)
                desktop_editor_layout(page, path, width)
        print('PASS: PC-first editors at 1280px and 1024px, ribbon and A4 preview', flush=True)
    finally:
        ctx.close()

    mobile = new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, device_scale_factor=2, color_scheme='dark')
    try:
        page = new_page(mobile)
        mobile_failures = []
        for path in PAGES:
            try:
                page.goto(base + path, wait_until='load'); ready(page)
                if path in ('red_index/', 'document_builder/'):
                    # These two editors are PC-first: deliberate horizontal scrolling,
                    # not a stacked layout, preserves the A4 workspace on narrow screens.
                    desktop_editor_layout(page, path, 390)
                else:
                    width = page.evaluate('() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth})')
                    if width['scroll'] > width['client'] + 2:
                        raise AssertionError(f"document overflow: client={width['client']}, scroll={width['scroll']}")
                release_history(page, history, mobile=True)
                print('PASS: mobile ' + (path or 'home'), flush=True)
            except Exception as exc:
                mobile_failures.append((path or 'home') + ': ' + str(exc))
                print('FAIL: mobile ' + mobile_failures[-1], flush=True)
        if mobile_failures:
            errors.extend(mobile_failures)
        else:
            print('PASS: mobile five-page startup, responsive pages and scrollable PC editors', flush=True)
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
                run(browser, f'http://127.0.0.1:{server.server_port}{BASE_PATH}')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
