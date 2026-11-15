/**
 * GOSPLAN13: JAN low-level helpers, validation and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/**
 * 文字列中の空白文字をすべて除去する。
 *
 * 対象:
 * - 半角空白
 * - 全角空白
 * - タブ
 * - 改行
 * - その他JavaScriptが空白として認識する文字
 *
 * @param value 対象文字列
 * @returns 空白を除去した文字列
 */
export function removeAllWhitespace(value: string): string {
    return value.replace(/\s+/g, "");
}

/**
 * 全角数字を半角数字へ変換する。
 *
 * 対象:
 * ０１２３４５６７８９
 *
 * 数字以外の文字は変更しない。
 * 数字以外の検証は後続処理で行う。
 *
 * @param value 対象文字列
 * @returns 全角数字を半角化した文字列
 */
export function convertFullWidthDigitsToHalfWidth(
    value: string
): string {
    return value.replace(/[０-９]/g, (character) => {
        const digit =
            character.charCodeAt(0) -
            "０".charCodeAt(0);

        return String(digit);
    });
}

/**
 * バーコードSVG内の描画内容をすべて削除する。
 *
 * @param barcodeSvg 消去対象のSVG要素
 */
export function clearJanBarcode(
    barcodeSvg: SVGSVGElement
): void {
    barcodeSvg.replaceChildren();

    barcodeSvg.setAttribute(
        "aria-label",
        "JANバーコード未設定"
    );
}

/**
 * 文字列が半角数字だけで構成されているか判定する。
 *
 * @param value 対象文字列
 * @returns 半角数字だけならtrue
 */
export function isHalfWidthDigitsOnly(
    value: string
): boolean {
    return /^[0-9]+$/.test(value);
}

/**
 * 指定されたモジュール位置が、
 * JAN-13のガードバー部分か判定する。
 *
 * ガードバー:
 * - 左端: 0〜2
 * - 中央: 45〜49
 * - 右端: 92〜94
 *
 * @param moduleIndex 0から始まるモジュール位置
 * @returns ガードバー部分ならtrue
 */
export function isGuardBarModule(
    moduleIndex: number
): boolean {
    const isLeftGuard =
        moduleIndex >= 0 && moduleIndex <= 2;

    const isCenterGuard =
        moduleIndex >= 45 && moduleIndex <= 49;

    const isRightGuard =
        moduleIndex >= 92 && moduleIndex <= 94;

    return (
        isLeftGuard ||
        isCenterGuard ||
        isRightGuard
    );
}

/**
 * JANコード処理が成功した場合の結果。
 */
export type JanSuccessResult = {
    success: true;

    /**
     * 空白を含まない13桁のJANコード。
     *
     * JSON保存やバーコード生成ではこちらを使用する。
     */
    jan: string;

    /**
     * 先頭7桁と残り6桁の間へ空白を入れた表示用JANコード。
     */
    displayJan: string;

    /**
     * 入力時点でチェックデジットが付いていたかを示す。
     *
     * 12桁入力ならfalse、
     * 13桁入力ならtrueとなる。
     */
    hadCheckDigit: boolean;

    /**
     * 計算または検証されたチェックデジット。
     */
    checkDigit: number;
};

/**
 * JANコードが空欄だった場合の結果。
 *
 * 空欄は入力エラーとはせず、
 * JANコード未設定として正常に扱う。
 */
export type JanEmptyResult = {
    success: true;
    jan: "";
    displayJan: "";
    hadCheckDigit: false;
    checkDigit: null;
};

/**
 * JANコード処理が失敗した場合の結果。
 */
export type JanErrorResult = {
    success: false;

    /**
     * 利用者へ表示するエラーメッセージ。
     */
    errorMessage: string;
};

/**
 * JANコード処理全体の戻り値。
 */
export type JanResult =
    | JanSuccessResult
    | JanEmptyResult
    | JanErrorResult;
