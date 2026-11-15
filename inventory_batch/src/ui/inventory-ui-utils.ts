/**
 * INVENTORY BATCH: main-screen DOM and formatting utilities.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/**
 * 1桁の数字を
 * 2桁文字列へ変換する。
 */
export function padTwoDigits(
    value: number
): string {

    return String(
        value
    ).padStart(
        2,
        "0"
    );
}

/**
 * 件数表示を更新する。
 */
export function setCountValue(
    element: HTMLElement,
    value: number
): void {

    const unit =
        element.querySelector<HTMLElement>(
            ".inventory-summary__unit"
        );


    if (
        unit ===
        null
    ) {

        element.textContent =
            String(
                value
            );


        return;
    }


    element.textContent =
        String(
            value
        );


    element.appendChild(
        unit
    );
}

/* =========================================================
   DOMユーティリティ
   ========================================================= */

/**
 * 必須DOM要素を1件取得する。
 */
export function requireElement<
    T extends Element
>(
    selector: string
): T {

    const element =
        document.querySelector<T>(
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

/**
 * 必須DOM要素を複数取得する。
 */
export function requireElements<
    T extends Element
>(
    selector: string
): T[] {

    const elements =
        Array.from(
            document.querySelectorAll<T>(
                selector
            )
        );


    if (
        elements.length ===
        0
    ) {

        throw new Error(
            `必要な要素が見つかりません: ${selector}`
        );
    }


    return elements;
}

/* =========================================================
   型定義
   ========================================================= */

/**
 * 画面に表示するエラー。
 *
 * CSV由来・バーコード由来・
 * CSV全体の読込失敗を同じ形式で扱う。
 */
export type DisplayError = {
    rowNumber?: number;
    message: string;
};
