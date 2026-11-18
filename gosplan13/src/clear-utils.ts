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
export function notifyInputChanged(
    input: HTMLInputElement,
): void {
    input.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true,
            },
        ),
    );

    input.dispatchEvent(
        new Event(
            "change",
            {
                bubbles: true,
            },
        ),
    );

    input.dispatchEvent(
        new FocusEvent(
            "focusout",
            {
                bubbles: true,
            },
        ),
    );
}

/* =========================================================
   商品画像クリア
   ========================================================= */

export function clearProductImage(
    label: HTMLElement,
): void {
    const imageInput =
        label.querySelector<HTMLInputElement>(
            ".product-label__image-input",
        );

    const imagePreview =
        label.querySelector<HTMLImageElement>(
            ".product-label__image-preview",
        );

    const imagePlaceholder =
        label.querySelector<HTMLElement>(
            ".product-label__image-placeholder",
        );

    if (!imageInput) {
        throw new Error(
            "商品画像入力欄が見つかりません。",
        );
    }

    if (!imagePreview) {
        throw new Error(
            "商品画像プレビューが見つかりません。",
        );
    }

    if (!imagePlaceholder) {
        throw new Error(
            "商品画像プレースホルダーが見つかりません。",
        );
    }

    /*
     * file inputの選択状態を解除。
     */
    imageInput.value = "";

    /*
     * Base64画像を削除。
     */
    imagePreview.removeAttribute(
        "src",
    );

    imagePreview.hidden = true;

    /*
     * 初期状態の画像選択UIを表示。
     */
    imagePlaceholder.hidden = false;
}

/* =========================================================
   全ラベル取得
   ========================================================= */

export function getProductLabels(
    preview: HTMLElement,
): HTMLElement[] {
    return Array.from(
        preview.querySelectorAll<HTMLElement>(
            ".product-label",
        ),
    );
}

/* =========================================================
   型
   ========================================================= */

export type ClearElements = {
    preview: HTMLElement;
    clearButton: HTMLButtonElement;

    /**
     * storage.tsの
     * storageController.clearStorage
     * を渡す。
     */
    clearStoredData: () => Promise<void>;
};
