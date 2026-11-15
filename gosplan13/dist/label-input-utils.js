/**
 * GOSPLAN13: label input and duplication helpers.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   商品名処理
   ========================================================= */
/**
 * 商品名入力欄の値を処理する。
 *
 * 現在は先頭と末尾の空白を除去し、
 * 入力欄へ反映する。
 *
 * @param productLabel 処理対象の商品ラベル
 * @param nameInput 商品名入力欄
 */
export function handleNameFocusOut(productLabel, nameInput) {
    const name = nameInput.value.trim();
    nameInput.value =
        name;
}
/* =========================================================
   ラベル取得
   ========================================================= */
export function getProductLabels(preview) {
    return Array.from(preview.querySelectorAll(".product-label"));
}
export function getJanInput(label) {
    const input = label.querySelector(".product-label__jan-input");
    if (!input) {
        throw new Error("JAN入力欄が見つかりません。");
    }
    return input;
}
export function getImageInput(label) {
    const input = label.querySelector(".product-label__image-input");
    if (!input) {
        throw new Error("商品画像入力欄が見つかりません。");
    }
    return input;
}
export function getImagePreview(label) {
    const image = label.querySelector(".product-label__image-preview");
    if (!image) {
        throw new Error("商品画像プレビューが見つかりません。");
    }
    return image;
}
export function getImagePlaceholder(label) {
    const placeholder = label.querySelector(".product-label__image-placeholder");
    if (!placeholder) {
        throw new Error("商品画像プレースホルダーが見つかりません。");
    }
    return placeholder;
}
/* =========================================================
   DOM取得
   ========================================================= */
export function getNameInput(label) {
    const input = label.querySelector(".product-label__name-input");
    if (!input) {
        throw new Error("商品名入力欄が見つかりません。");
    }
    return input;
}
/* =========================================================
   入力変更通知
   ========================================================= */
/**
 * プログラムからvalueを書き換えても、
 * 通常のユーザー入力と同じように
 * JAN描画やstorage.tsへ変更を通知する。
 */
export function notifyInputChanged(input) {
    input.dispatchEvent(new Event("input", {
        bubbles: true,
    }));
    input.dispatchEvent(new Event("change", {
        bubbles: true,
    }));
    input.dispatchEvent(new FocusEvent("focusout", {
        bubbles: true,
    }));
}
//# sourceMappingURL=label-input-utils.js.map