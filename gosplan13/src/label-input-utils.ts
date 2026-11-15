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
export function handleNameFocusOut(
    productLabel: HTMLElement,
    nameInput: HTMLInputElement
): void {
    const name =
        nameInput.value.trim();

    nameInput.value =
        name;
}

/* =========================================================
   ラベル取得
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

export function getJanInput(
    label: HTMLElement,
): HTMLInputElement {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__jan-input",
        );

    if (!input) {
        throw new Error(
            "JAN入力欄が見つかりません。",
        );
    }

    return input;
}

export function getImageInput(
    label: HTMLElement,
): HTMLInputElement {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__image-input",
        );

    if (!input) {
        throw new Error(
            "商品画像入力欄が見つかりません。",
        );
    }

    return input;
}

export function getImagePreview(
    label: HTMLElement,
): HTMLImageElement {
    const image =
        label.querySelector<HTMLImageElement>(
            ".product-label__image-preview",
        );

    if (!image) {
        throw new Error(
            "商品画像プレビューが見つかりません。",
        );
    }

    return image;
}

export function getImagePlaceholder(
    label: HTMLElement,
): HTMLElement {
    const placeholder =
        label.querySelector<HTMLElement>(
            ".product-label__image-placeholder",
        );

    if (!placeholder) {
        throw new Error(
            "商品画像プレースホルダーが見つかりません。",
        );
    }

    return placeholder;
}

/* =========================================================
   DOM取得
   ========================================================= */

export function getNameInput(
    label: HTMLElement,
): HTMLInputElement {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__name-input",
        );

    if (!input) {
        throw new Error(
            "商品名入力欄が見つかりません。",
        );
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
   型
   ========================================================= */

export type DuplicateElements = {
    preview: HTMLElement;

    imageModeToggle:
    HTMLInputElement;

    /**
     * 「左上を全体へ複製」
     */
    duplicateAllButton:
    HTMLButtonElement;

    /**
     * 「1行目を下へ複製」
     */
    duplicateRowButton:
    HTMLButtonElement;
};

export type LabelData = {
    name: string;
    jan: string;
    image: string | null;
};
