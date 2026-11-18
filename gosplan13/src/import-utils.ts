/**
 * GOSPLAN13: JSON import parsing, validation and related types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   入力イベント通知
   ========================================================= */

/**
 * JANをプログラムから変更した場合でも、
 * main.ts側の既存処理へ変更を通知する。
 *
 * 現在のGOSPLAN13では入力欄のchange / focusoutを
 * 利用してJAN描画などを行うため、
 * 両方を発火する。
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
   商品画像復元
   ========================================================= */

export function restoreLabelImage(
    label: HTMLElement,
    imageDataUrl: string | null,
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
     * File inputへプログラムからファイルを
     * セットすることはできないため、
     * Import時には選択状態をクリアする。
     */
    imageInput.value = "";

    if (
        imageDataUrl === null
        || imageDataUrl === ""
    ) {
        imagePreview.removeAttribute(
            "src",
        );

        imagePreview.hidden =
            true;

        imagePlaceholder.hidden =
            false;

        return;
    }

    /*
     * Export時に保存した加工済みBase64画像を
     * そのままプレビューへ復元する。
     */
    imagePreview.src =
        imageDataUrl;

    imagePreview.hidden =
        false;

    imagePlaceholder.hidden =
        true;
}

/* =========================================================
   ファイル選択input生成
   ========================================================= */

export function createFileInput():
    HTMLInputElement {
    const input =
        document.createElement(
            "input",
        );

    input.type =
        "file";

    input.accept =
        ".json,application/json";

    /*
     * UIとして表示する必要はない。
     * JSONインポートボタンからのみ使用する。
     */
    input.hidden =
        true;

    return input;
}

/* =========================================================
   JSONファイル読込
   ========================================================= */

export async function readJsonFile(
    file: File,
): Promise<unknown> {
    // Base64画像を含むJSONを想定した余裕のある上限。読込前に拒否する。
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
        throw new Error("JSONファイルは10MiB以下を選択してください。");
    }
    const text =
        await file.text();

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            "JSONファイルを読み取れませんでした。",
        );
    }
}

/* =========================================================
   ラベルDOM取得
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
   汎用型判定
   ========================================================= */

export function isObject(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object"
        && value !== null
        && !Array.isArray(value)
    );
}

/* =========================================================
   型
   ========================================================= */

export type ImportElements = {
    preview: HTMLElement;
    imageModeToggle: HTMLInputElement;
    importButton: HTMLButtonElement;
};
