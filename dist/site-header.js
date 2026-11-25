const siteRootUrl = new URL("../", import.meta.url);
const barcodeUrl = new URL("gosplan13/", siteRootUrl).href;
const inventoryUrl = new URL("inventory_batch/", siteRootUrl).href;
const discountExclusionUrl = new URL("red_index/", siteRootUrl).href;
const documentBuilderUrl = new URL("document_builder/", siteRootUrl).href;
class SiteHeader extends HTMLElement {
    connectedCallback() {
        if (this.childElementCount > 0) {
            return;
        }
        this.innerHTML = `
            <header class="header">
                <div class="header__title-group">
                    <a
                        href="${siteRootUrl.href}"
                        class="header__title-group"
                        aria-label="WORKBENCH ホームへ戻る"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="header__logo"
                            height="24px"
                            width="24px"
                            viewBox="0 -960 960 960"
                            fill="#000"
                            aria-hidden="true"
                        >
                            <path
                                d="M280-280h160v-160H280v160Zm240 0h160v-160H520v160ZM280-520h160v-160H280v160Zm240 0h160v-160H520v160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"
                            />
                        </svg>
                        <div class="header__title-content">
                            <h1 class="header__title">
                                WORKBENCH
                            </h1>
                        </div>
                    </a>
                </div>
                <div class="header__far-item">
                    <nav class="header__nav" aria-label="ツール一覧">
                    <a
                        href="${barcodeUrl}"
                        class="header__nav-link"
                    >
                        バーコード生成
                    </a>
                    <a
                        href="${inventoryUrl}"
                        class="header__nav-link"
                    >
                        棚卸一括出力
                    </a>
                    <a
                        href="${discountExclusionUrl}"
                        class="header__nav-link"
                    >
                        割引不可商品リスト
                    </a>
                    <a
                        href="${documentBuilderUrl}"
                        class="header__nav-link"
                    >
                        ビジネス文書出力
                    </a>
                    </nav>
                </div>

            </header>
        `;
        this.markActiveNavigation();
    }
    /** 表示中のツールをナビゲーションで識別できるようにする。 */
    markActiveNavigation() {
        const currentPath = window.location.pathname.replace(/\/index\.html$/, "/");
        this.querySelectorAll(".header__nav-link").forEach((link) => {
            if (new URL(link.href).pathname === currentPath) {
                link.setAttribute("aria-current", "page");
            }
        });
    }
}
if (!customElements.get("site-header")) {
    customElements.define("site-header", SiteHeader);
}
export {};
//# sourceMappingURL=site-header.js.map