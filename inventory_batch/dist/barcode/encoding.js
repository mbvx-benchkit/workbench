/**
 * EAN-13の開始・中央・終了ガード。
 */
export const START_GUARD = "101";
export const MIDDLE_GUARD = "01010";
export const END_GUARD = "101";
/**
 * 左側6桁のLパターン。
 */
export const LEFT_ODD_PATTERNS = {
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
 * 左側6桁のGパターン。
 */
export const LEFT_EVEN_PATTERNS = {
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
 * 右側6桁のRパターン。
 */
export const RIGHT_PATTERNS = {
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
 * EAN-13先頭1桁によって決まる、
 * 左側6桁のL/Gパターン構成。
 */
export const LEFT_PARITY_PATTERNS = {
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
/* =========================================================
   EAN-13 モジュール
   ========================================================= */
/**
 * EAN-13本体は95モジュール。
 */
export const EAN13_MODULE_COUNT = 95;
/**
 * 左右Quiet Zone。
 *
 * EAN-13本体の外側へ配置する。
 */
export const LEFT_QUIET_ZONE_MODULES = 11;
export const RIGHT_QUIET_ZONE_MODULES = 7;
/**
 * Quiet Zone込みの総モジュール数。
 *
 * 11 + 95 + 7 = 113
 */
export const TOTAL_MODULE_COUNT = LEFT_QUIET_ZONE_MODULES +
    EAN13_MODULE_COUNT +
    RIGHT_QUIET_ZONE_MODULES;
/* =========================================================
   ガード位置
   ========================================================= */
/**
 * 左右それぞれの商品データは、
 *
 * 6桁 × 7モジュール
 *
 * で42モジュール。
 */
export const SIDE_DATA_MODULE_COUNT = 6 * 7;
/**
 * 中央ガード開始位置。
 *
 * START 3
 * +
 * 左側データ 42
 *
 * = 45
 */
export const MIDDLE_GUARD_START_INDEX = START_GUARD.length +
    SIDE_DATA_MODULE_COUNT;
/**
 * 終了ガード開始位置。
 *
 * 95 - 3 = 92
 */
export const END_GUARD_START_INDEX = EAN13_MODULE_COUNT -
    END_GUARD.length;
/* =========================================================
   EAN-13ビット列生成
   ========================================================= */
/**
 * 13桁EANから95モジュールの
 * バーコードパターンを生成する。
 *
 * 1:
 *   黒バー
 *
 * 0:
 *   白スペース
 */
export function createEan13Pattern(value) {
    const firstDigit = value[0];
    const leftDigits = value.slice(1, 7);
    const rightDigits = value.slice(7, 13);
    const parityPattern = LEFT_PARITY_PATTERNS[firstDigit];
    if (parityPattern ===
        undefined) {
        throw new Error("EAN-13左側パリティの生成に失敗しました。");
    }
    let pattern = START_GUARD;
    /* -----------------------------------------------------
       左側6桁
       ----------------------------------------------------- */
    for (let index = 0; index <
        leftDigits.length; index += 1) {
        const digit = leftDigits[index];
        const parity = parityPattern[index];
        const digitPattern = parity ===
            "L"
            ? LEFT_ODD_PATTERNS[digit]
            : LEFT_EVEN_PATTERNS[digit];
        if (digitPattern ===
            undefined) {
            throw new Error("EAN-13左側パターンの生成に失敗しました。");
        }
        pattern +=
            digitPattern;
    }
    /* -----------------------------------------------------
       中央ガード
       ----------------------------------------------------- */
    pattern +=
        MIDDLE_GUARD;
    /* -----------------------------------------------------
       右側6桁
       ----------------------------------------------------- */
    for (const digit of rightDigits) {
        const digitPattern = RIGHT_PATTERNS[digit];
        if (digitPattern ===
            undefined) {
            throw new Error("EAN-13右側パターンの生成に失敗しました。");
        }
        pattern +=
            digitPattern;
    }
    /* -----------------------------------------------------
       終了ガード
       ----------------------------------------------------- */
    pattern +=
        END_GUARD;
    /**
     * EAN-13標準の
     * 95モジュールを確認する。
     */
    if (pattern.length !==
        EAN13_MODULE_COUNT) {
        throw new Error(`EAN-13パターン長が不正です: ${pattern.length}`);
    }
    return pattern;
}
//# sourceMappingURL=encoding.js.map