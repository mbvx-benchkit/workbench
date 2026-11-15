import { clearInventoryPreview, createIssuedLabel, createInventoryRow, applyRowLayout, requireChildElement } from "./render-utils.js";
export { clearInventoryPreview } from "./render-utils.js";
import { normalizeDisplayText } from "./render-utils.js";
import { renderEan13Barcode } from "./barcode.js";
/* =========================================================
   Public API
   ========================================================= */
/**
 * A4プレビューを描画する。
 *
 * pagesはinventory.ts側で
 * 56件ごとに分割済みであることを前提とする。
 */
export function renderInventoryPreview(pages, container, rowTemplate) {
    container.replaceChildren();
    if (pages.length ===
        0) {
        clearInventoryPreview(container);
        return {
            pageCount: 0,
            errors: []
        };
    }
    const fragment = document.createDocumentFragment();
    const errors = [];
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const page = createInventoryPage(pages[pageIndex], pageIndex, rowTemplate, errors);
        fragment.appendChild(page);
    }
    container.appendChild(fragment);
    return {
        pageCount: pages.length,
        errors
    };
}
/* =========================================================
   A4 Page
   ========================================================= */
/**
 * A4 1ページ分のDOMを生成する。
 */
function createInventoryPage(items, pageIndex, rowTemplate, errors) {
    const page = document.createElement("section");
    page.className =
        "inventory-page";
    page.setAttribute("aria-label", `棚卸JAN印刷プレビュー ${pageIndex + 1}枚目`);
    /* -----------------------------------------------------
       発行情報
       ----------------------------------------------------- */
    /**
     * 発行日時はここでは決定しない。
     *
     * main.ts側が印刷開始時に、
     *
     * 2026/08/11 18:13発行 1枚目
     *
     * の形式でtextContentを設定する。
     *
     * position:absoluteのため、
     * 56件グリッドには一切影響しない。
     */
    const issuedLabel = createIssuedLabel(pageIndex +
        1);
    page.appendChild(issuedLabel);
    /* -----------------------------------------------------
       商品行
       ----------------------------------------------------- */
    for (let rowIndex = 0; rowIndex < items.length; rowIndex += 1) {
        const row = createInventoryRow(rowTemplate);
        applyRowLayout(row, rowIndex);
        renderInventoryItem(row, items[rowIndex], errors);
        page.appendChild(row);
    }
    return page;
}
/* =========================================================
   商品描画
   ========================================================= */
/**
 * 1商品分を行へ描画する。
 */
function renderInventoryItem(row, item, errors) {
    const elements = getInventoryRowElements(row);
    /* -----------------------------------------------------
       商品名
       ----------------------------------------------------- */
    elements.nameText.textContent =
        normalizeDisplayText(item.productName);
    /* -----------------------------------------------------
       数量
       ----------------------------------------------------- */
    elements.quantityValue.textContent =
        Number.isFinite(item.quantity)
            ? String(item.quantity)
            : "—";
    /* -----------------------------------------------------
       PLU
       ----------------------------------------------------- */
    elements.pluText.textContent =
        normalizeDisplayText(item.pluCode);
    /* -----------------------------------------------------
       バーコード
       ----------------------------------------------------- */
    const barcodeResult = renderEan13Barcode(elements.barcode, item.pluCode);
    if (barcodeResult.success) {
        /**
         * SVGSVGElementでは
         * hidden属性ではなくdisplayを使用する。
         */
        elements.barcode.style.display =
            "";
        elements.barcodeError.hidden =
            true;
        elements.barcodeError.textContent =
            "";
        elements.barcode.removeAttribute("title");
        return;
    }
    /* -----------------------------------------------------
       バーコード生成失敗
       ----------------------------------------------------- */
    elements.barcode.style.display =
        "none";
    elements.barcodeError.hidden =
        false;
    elements.barcodeError.textContent =
        "バーコード生成不可";
    elements.barcodeError.title =
        barcodeResult.message;
    errors.push({
        rowNumber: item.rowNumber,
        pluCode: item.pluCode,
        message: `${item.rowNumber}行目: PLUコード「${item.pluCode}」 ${barcodeResult.message}`
    });
}
/* =========================================================
   Row DOM
   ========================================================= */
/**
 * 商品行内部の必須要素を取得する。
 */
function getInventoryRowElements(row) {
    return {
        nameText: requireChildElement(row, ".inventory-row__name-text"),
        quantityValue: requireChildElement(row, ".inventory-row__quantity-value"),
        barcode: requireChildElement(row, ".inventory-row__barcode"),
        pluText: requireChildElement(row, ".inventory-row__plu-text"),
        barcodeError: requireChildElement(row, ".inventory-row__barcode-error")
    };
}
//# sourceMappingURL=render.js.map