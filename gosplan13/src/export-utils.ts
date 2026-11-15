/**
 * GOSPLAN13: export helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   JSONダウンロード
   ========================================================= */

export function downloadJson(
    json: string,
    fileName: string,
): void {
    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json;charset=utf-8",
            },
        );

    const objectUrl =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href =
        objectUrl;

    anchor.download =
        fileName;

    /*
     * Firefoxなどを含め、
     * DOMへ追加してからクリックする方が安定する。
     */
    document.body.append(anchor);

    anchor.click();

    anchor.remove();

    /*
     * click直後にrevokeすると、
     * ブラウザによってはダウンロード開始前に
     * URLが破棄される可能性があるため、
     * 次のタスクで解放する。
     */
    window.setTimeout(
        () => {
            URL.revokeObjectURL(
                objectUrl,
            );
        },
        0,
    );
}

/* =========================================================
   ラベルDOM取得
   ========================================================= */

/**
 * A4プレビュー内に存在する全ラベルを取得する。
 *
 * 画像ありモードで25〜48面が非表示になっていても、
 * DOM上には存在するため全件取得する。
 */
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
   JAN取得
   ========================================================= */

export function getLabelJan(
    label: HTMLElement,
): string {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__jan-input",
        );

    if (!input) {
        throw new Error(
            "JAN入力欄が見つかりません。",
        );
    }

    /*
     * 入力内容をそのまま保存する。
     *
     * Export時にはJANの再検証や正規化を行わない。
     * ユーザーが画面に入力している状態を
     * そのまま復元できることを優先する。
     */
    return input.value;
}

/* =========================================================
   商品画像取得
   ========================================================= */

/**
 * 画像プレビューへ設定されている
 * Base64 Data URLを取得する。
 *
 * 画像がない場合はnullを返す。
 */
export function getLabelImage(
    label: HTMLElement,
): string | null {
    const image =
        label.querySelector<HTMLImageElement>(
            ".product-label__image-preview",
        );

    if (!image) {
        throw new Error(
            "商品画像プレビューが見つかりません。",
        );
    }

    const source =
        image.getAttribute("src");

    if (
        !source
        || source.trim() === ""
    ) {
        return null;
    }

    /*
     * 現在のGOSPLAN13では画像処理後の画像を
     * Data URLとして保持する前提。
     *
     * ImportやlocalStorageでもそのまま
     * img.srcへ戻せる形式となる。
     */
    if (!source.startsWith("data:image/")) {
        console.warn(
            "Base64 Data URLではない画像が検出されました。",
            source,
        );
    }

    return source;
}

/* =========================================================
   商品名取得
   ========================================================= */

export function getLabelName(
    label: HTMLElement,
): string {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__name-input",
        );

    if (!input) {
        throw new Error(
            "商品名入力欄が見つかりません。",
        );
    }

    return input.value;
}

/* =========================================================
   型
   ========================================================= */

/**
 * 1面分の商品情報。
 *
 * 配列内の位置そのものがラベル位置を表すため、
 * indexは保存しない。
 */
export type ExportLabelData = {
    name: string;
    jan: string;
    image: string | null;
};

/**
 * 画面設定。
 */
export type ExportSettings = {
    imageMode: boolean;
};

/**
 * GOSPLAN13の保存データ全体。
 */
export type Gosplan13ExportData = {
    app: "GOSPLAN13";
    version: number;
    exportedAt: string;

    settings: ExportSettings;

    labels: ExportLabelData[];
};

/**
 * Export機能に必要なHTML要素。
 */
export type ExportElements = {
    preview: HTMLElement;
    imageModeToggle: HTMLInputElement;
    exportButton: HTMLButtonElement;
};
