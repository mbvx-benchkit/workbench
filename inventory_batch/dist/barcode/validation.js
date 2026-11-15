import { normalizeEan13, isScientificNotation } from "./barcode-internals.js";
import { calculateEan13CheckDigit } from "./barcode-internals.js";
/**
 * PLUコードが正しいEAN-13か検証する。
 */
export function validateEan13(rawValue) {
    const value = normalizeEan13(rawValue);
    /* -----------------------------------------------------
       空文字
       ----------------------------------------------------- */
    if (value ===
        "") {
        return {
            valid: false,
            value,
            error: "EMPTY",
            message: "PLUコードが空です。"
        };
    }
    /* -----------------------------------------------------
       指数表記
       ----------------------------------------------------- */
    /**
     * Excel等でCSVを開いた際、
     *
     * 実際のJAN
     *
     * が
     *
     * 4.944E+12
     *
     * のような指数表記へ変換される場合がある。
     *
     * この時点で元の桁が丸められている可能性があり、
     * 正しいPLUコードを復元できる保証がない。
     *
     * そのため数値への変換・補正は行わず、
     * 明示的なエラーとする。
     */
    if (isScientificNotation(value)) {
        return {
            valid: false,
            value,
            error: "SCIENTIFIC_NOTATION",
            message: "PLUコードが指数表記になっています。Excel等で値が変換された可能性があります。元のCSVを使用してください。"
        };
    }
    /* -----------------------------------------------------
       数字以外
       ----------------------------------------------------- */
    if (!/^\d+$/.test(value)) {
        return {
            valid: false,
            value,
            error: "INVALID_CHARACTER",
            message: "PLUコードに数字以外の文字が含まれています。"
        };
    }
    /* -----------------------------------------------------
       桁数
       ----------------------------------------------------- */
    if (value.length !==
        13) {
        return {
            valid: false,
            value,
            error: "INVALID_LENGTH",
            message: `PLUコードは13桁である必要があります。現在は${value.length}桁です。`
        };
    }
    /* -----------------------------------------------------
       チェックディジット
       ----------------------------------------------------- */
    const expectedCheckDigit = calculateEan13CheckDigit(value.slice(0, 12));
    const actualCheckDigit = Number(value[12]);
    if (actualCheckDigit !==
        expectedCheckDigit) {
        return {
            valid: false,
            value,
            error: "INVALID_CHECK_DIGIT",
            message: `チェックディジットが不正です。期待値は${expectedCheckDigit}です。`
        };
    }
    return {
        valid: true,
        value
    };
}
/**
 * EAN-13として有効かだけを簡単に判定する。
 */
export function isValidEan13(rawValue) {
    return validateEan13(rawValue).valid;
}
//# sourceMappingURL=validation.js.map