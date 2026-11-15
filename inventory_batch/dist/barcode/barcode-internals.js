/**
 * INVENTORY BATCH: EAN-13 validation and model utilities.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/**
 * EAN-13のチェックディジットを計算する。
 *
 * 引数には12桁の数字文字列を指定する。
 */
export function calculateEan13CheckDigit(firstTwelveDigits) {
    if (!/^\d{12}$/.test(firstTwelveDigits)) {
        throw new TypeError("EAN-13チェックディジット計算には12桁の数字を指定してください。");
    }
    let sum = 0;
    for (let index = 0; index <
        firstTwelveDigits.length; index += 1) {
        const digit = Number(firstTwelveDigits[index]);
        /**
         * EAN-13では左から数えて、
         *
         * 奇数位置 × 1
         * 偶数位置 × 3
         *
         * で合計する。
         */
        const weight = index %
            2 ===
            0
            ? 1
            : 3;
        sum +=
            digit *
                weight;
    }
    return (10 -
        (sum %
            10)) %
        10;
}
/* =========================================================
   公開関数
   ========================================================= */
/**
 * PLUコードをEAN-13検証用に正規化する。
 *
 * 対応:
 *
 * - 前後空白削除
 * - 全角数字を半角数字へ変換
 *
 * 桁数補完やチェックディジット修正、
 * 指数表記からの復元は行わない。
 */
export function normalizeEan13(rawValue) {
    return rawValue
        .trim()
        .replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) -
        0xFEE0));
}
/* =========================================================
   指数表記判定
   ========================================================= */
/**
 * Excel等で生成される可能性がある
 * 指数表記かどうかを判定する。
 *
 * 例:
 *
 * 4.944E+12
 * 4.944e+12
 * 4944E9
 * 1E+12
 */
export function isScientificNotation(value) {
    return /^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(value);
}
//# sourceMappingURL=barcode-internals.js.map