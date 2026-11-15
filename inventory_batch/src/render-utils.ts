/**
 * INVENTORY BATCH: preview rendering support.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/**
 * プレビューを空状態へ戻す。
 */
export function clearInventoryPreview(
    container: HTMLElement
): void {

    container.replaceChildren();


    const empty =
        document.createElement(
            "p"
        );


    empty.className =
        "inventory-preview__empty";


    empty.textContent =
        "CSVを読み込むと、ここに印刷プレビューが表示されます。";


    container.appendChild(
        empty
    );
}

/* =========================================================
   発行情報
   ========================================================= */

/**
 * 各A4ページ左上に配置する
 * 発行情報要素を生成する。
 *
 * 日時は印刷開始時にmain.tsが設定するため、
 * 初期状態では空文字。
 */
export function createIssuedLabel(
    pageNumber: number
): HTMLElement {

    const label =
        document.createElement(
            "p"
        );


    label.className =
        "inventory-page__issued";


    /**
     * 印刷時にmain.tsから
     * ページ番号を取得できるよう保持する。
     */
    label.dataset.pageNumber =
        String(
            pageNumber
        );


    /**
     * 印刷前は発行日時未確定。
     *
     * CSSの:emptyにより
     * 空の間は非表示となる。
     */
    label.textContent =
        "";


    return label;
}

/* =========================================================
   Row
   ========================================================= */

/**
 * templateから商品行を複製する。
 */
export function createInventoryRow(
    rowTemplate: HTMLTemplateElement
): HTMLElement {

    const firstElement =
        rowTemplate
            .content
            .firstElementChild;


    if (
        !(firstElement instanceof HTMLElement)
    ) {

        throw new Error(
            "棚卸JAN行テンプレートが正しくありません。"
        );
    }


    const row =
        firstElement.cloneNode(
            true
        );


    if (
        !(row instanceof HTMLElement)
    ) {

        throw new Error(
            "棚卸JAN行テンプレートを複製できませんでした。"
        );
    }


    return row;
}

/**
 * 1ページ内の行番号に応じて
 * odd / evenクラスを付与する。
 *
 * ページが変わるたびに
 * rowIndexは0から再開する。
 */
export function applyRowLayout(
    row: HTMLElement,
    rowIndex: number
): void {

    row.classList.remove(
        "inventory-row--odd",
        "inventory-row--even"
    );


    const isOddRow =
        rowIndex %
        2 ===
        0;


    row.classList.add(
        isOddRow
            ? "inventory-row--odd"
            : "inventory-row--even"
    );
}

/* =========================================================
   DOM Utility
   ========================================================= */

/**
 * 親要素内の必須DOMを取得する。
 */
export function requireChildElement<
    T extends Element
>(
    parent: ParentNode,
    selector: string
): T {

    const element =
        parent.querySelector<T>(
            selector
        );


    if (
        element ===
        null
    ) {

        throw new Error(
            `必要な要素が見つかりません: ${selector}`
        );
    }


    return element;
}

/* =========================================================
   Text
   ========================================================= */

/**
 * CSV内に改行や連続空白が含まれていても、
 * 表示用文字列として扱いやすい形へ整える。
 *
 * 商品名そのものの視覚的な2行折返しは
 * CSS側で行う。
 */
export function normalizeDisplayText(
    value: string
): string {

    return value
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

/* =========================================================
   型定義
   ========================================================= */

/**
 * バーコード描画時に発生したエラー。
 */
export type InventoryRenderError = {
    rowNumber: number;
    pluCode: string;
    message: string;
};

/**
 * プレビュー描画結果。
 */
export type InventoryRenderResult = {
    pageCount: number;
    errors: InventoryRenderError[];
};

/**
 * 1商品行内部のDOM要素。
 */
export type InventoryRowElements = {
    nameText: HTMLElement;
    quantityValue: HTMLElement;
    barcode: SVGSVGElement;
    pluText: HTMLElement;
    barcodeError: HTMLElement;
};
