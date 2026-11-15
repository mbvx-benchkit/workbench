/**
 * GOSPLAN13: clear workflow support.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   入力変更通知
   ========================================================= */
/**
 * プログラムからinput.valueを変更した場合でも、
 * JAN描画など既存のイベント処理へ変更を通知する。
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
/* =========================================================
   商品画像クリア
   ========================================================= */
export function clearProductImage(label) {
    const imageInput = label.querySelector(".product-label__image-input");
    const imagePreview = label.querySelector(".product-label__image-preview");
    const imagePlaceholder = label.querySelector(".product-label__image-placeholder");
    if (!imageInput) {
        throw new Error("商品画像入力欄が見つかりません。");
    }
    if (!imagePreview) {
        throw new Error("商品画像プレビューが見つかりません。");
    }
    if (!imagePlaceholder) {
        throw new Error("商品画像プレースホルダーが見つかりません。");
    }
    /*
     * file inputの選択状態を解除。
     */
    imageInput.value = "";
    /*
     * Base64画像を削除。
     */
    imagePreview.removeAttribute("src");
    imagePreview.hidden = true;
    /*
     * 初期状態の画像選択UIを表示。
     */
    imagePlaceholder.hidden = false;
}
/* =========================================================
   全ラベル取得
   ========================================================= */
export function getProductLabels(preview) {
    return Array.from(preview.querySelectorAll(".product-label"));
}
//# sourceMappingURL=clear-utils.js.map