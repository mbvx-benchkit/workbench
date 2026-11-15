/**
 * INVENTORY BATCH: main-screen DOM and formatting utilities.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/**
 * 1桁の数字を
 * 2桁文字列へ変換する。
 */
export function padTwoDigits(value) {
    return String(value).padStart(2, "0");
}
/**
 * 件数表示を更新する。
 */
export function setCountValue(element, value) {
    const unit = element.querySelector(".inventory-summary__unit");
    if (unit ===
        null) {
        element.textContent =
            String(value);
        return;
    }
    element.textContent =
        String(value);
    element.appendChild(unit);
}
/* =========================================================
   DOMユーティリティ
   ========================================================= */
/**
 * 必須DOM要素を1件取得する。
 */
export function requireElement(selector) {
    const element = document.querySelector(selector);
    if (element ===
        null) {
        throw new Error(`必要な要素が見つかりません: ${selector}`);
    }
    return element;
}
/**
 * 必須DOM要素を複数取得する。
 */
export function requireElements(selector) {
    const elements = Array.from(document.querySelectorAll(selector));
    if (elements.length ===
        0) {
        throw new Error(`必要な要素が見つかりません: ${selector}`);
    }
    return elements;
}
//# sourceMappingURL=inventory-ui-utils.js.map