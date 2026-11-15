/* WORKBENCH_ROLE_SPLIT_STAGE2: gosplan13/src/jan.ts -> encoding.ts; declarations moved without behavioral changes */
import type { JanSuccessResult, JanEmptyResult, JanErrorResult, JanResult } from "./jan-internals.js";
import { removeAllWhitespace, convertFullWidthDigitsToHalfWidth, clearJanBarcode } from "./jan-internals.js";
import { isHalfWidthDigitsOnly, isGuardBarModule } from "./jan-internals.js";
import { JAN_FULL_LENGTH } from "./normalization.js";



/**
 * JAN-13の左側で使用するLコード。
 */
export const LEFT_ODD_PATTERNS: Readonly<Record<string, string>> = {
    "0": "0001101",
    "1": "0011001",
    "2": "0010011",
    "3": "0111101",
    "4": "0100011",
    "5": "0110001",
    "6": "0101111",
    "7": "0111011",
    "8": "0110111",
    "9": "0001011"
};



/**
 * JAN-13の左側で使用するGコード。
 */
export const LEFT_EVEN_PATTERNS: Readonly<Record<string, string>> = {
    "0": "0100111",
    "1": "0110011",
    "2": "0011011",
    "3": "0100001",
    "4": "0011101",
    "5": "0111001",
    "6": "0000101",
    "7": "0010001",
    "8": "0001001",
    "9": "0010111"
};



/**
 * JAN-13の右側で使用するRコード。
 */
export const RIGHT_PATTERNS: Readonly<Record<string, string>> = {
    "0": "1110010",
    "1": "1100110",
    "2": "1101100",
    "3": "1000010",
    "4": "1011100",
    "5": "1001110",
    "6": "1010000",
    "7": "1000100",
    "8": "1001000",
    "9": "1110100"
};



/**
 * JANコード先頭1桁に対応する、
 * 左側6桁のLコード・Gコードの組み合わせ。
 *
 * LはLEFT_ODD_PATTERNS、
 * GはLEFT_EVEN_PATTERNSを使用する。
 */
export const LEFT_PARITY_PATTERNS: Readonly<Record<string, string>> = {
    "0": "LLLLLL",
    "1": "LLGLGG",
    "2": "LLGGLG",
    "3": "LLGGGL",
    "4": "LGLLGG",
    "5": "LGGLLG",
    "6": "LGGGLL",
    "7": "LGLGLG",
    "8": "LGLGGL",
    "9": "LGGLGL"
};



/**
 * 13桁のJANコードから、
 * JAN-13バーコードの95モジュール分のビット列を生成する。
 *
 * 構造:
 * - 左ガード: 101
 * - 左側6桁: 各7モジュール
 * - 中央ガード: 01010
 * - 右側6桁: 各7モジュール
 * - 右ガード: 101
 *
 * 合計:
 * 3 + 42 + 5 + 42 + 3 = 95モジュール
 *
 * @param jan 13桁のJANコード
 * @returns 95文字の0と1で構成されたビット列
 */
export function encodeJan13(jan: string): string {
    if (
        jan.length !== JAN_FULL_LENGTH ||
        !isHalfWidthDigitsOnly(jan)
    ) {
        throw new Error(
            "バーコード生成には13桁のJANコードが必要です。"
        );
    }

    const firstDigit = jan[0];

    const parityPattern =
        LEFT_PARITY_PATTERNS[firstDigit];

    if (!parityPattern) {
        throw new Error(
            "JANコード先頭桁のパリティ情報が見つかりません。"
        );
    }

    /*
     * 左端のガードパターン。
     */
    let encoded = "101";

    /*
     * JANコードの2桁目から7桁目までを
     * LコードまたはGコードで符号化する。
     */
    for (let index = 0; index < 6; index++) {
        const digit = jan[index + 1];
        const parity = parityPattern[index];

        const pattern =
            parity === "L"
                ? LEFT_ODD_PATTERNS[digit]
                : LEFT_EVEN_PATTERNS[digit];

        if (!pattern) {
            throw new Error(
                "JANコード左側の符号化に失敗しました。"
            );
        }

        encoded += pattern;
    }

    /*
     * 中央のガードパターン。
     */
    encoded += "01010";

    /*
     * JANコードの8桁目から13桁目までを
     * Rコードで符号化する。
     */
    for (let index = 7; index < JAN_FULL_LENGTH; index++) {
        const digit = jan[index];
        const pattern = RIGHT_PATTERNS[digit];

        if (!pattern) {
            throw new Error(
                "JANコード右側の符号化に失敗しました。"
            );
        }

        encoded += pattern;
    }

    /*
     * 右端のガードパターン。
     */
    encoded += "101";

    if (encoded.length !== 95) {
        throw new Error(
            "JAN-13バーコードのビット数が正しくありません。"
        );
    }

    return encoded;
}
