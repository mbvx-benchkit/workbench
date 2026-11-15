import { removeAllWhitespace, convertFullWidthDigitsToHalfWidth } from "./jan-internals.js";
import { isHalfWidthDigitsOnly } from "./jan-internals.js";
/**
 * jan.ts
 *
 * JANコードの入力値を正規化・検証し、
 * JAN-13バーコードをSVGへ描画する処理をまとめたファイル。
 *
 * main.tsからは、基本的にprocessJanInput()だけを呼び出す。
 *
 * 対応する入力:
 * - チェックデジットなしの12桁
 * - チェックデジットありの13桁
 * - 半角数字
 * - 全角数字
 * - 半角空白
 * - 全角空白
 * - タブや改行などの空白文字
 *
 * 正常終了後:
 * - 内部値は空白なしの13桁へ統一する
 * - 入力欄は先頭7桁と残り6桁の間へ空白を入れる
 * - JAN-13バーコードをSVGへ描画する
 * - SVG内にはJANコードの数字を表示しない
 * - productLabel.dataset.janへ空白なし13桁を保存する
 *
 * 例:
 *
 * 入力:
 * ４９０１２３４　５６７８９
 *
 * 内部値:
 * 4901234567894
 *
 * 画面表示:
 * 4901234 567894
 */
/**
 * チェックデジットを含まないJANコードの桁数。
 */
export const JAN_BODY_LENGTH = 12;
/**
 * チェックデジットを含むJANコードの桁数。
 */
export const JAN_FULL_LENGTH = 13;
/**
 * 画面表示時に空白を挿入する位置。
 *
 * 先頭7桁と残り6桁へ分ける。
 */
export const JAN_DISPLAY_SEPARATOR_POSITION = 7;
/**
 * JANコード文字列を正規化・検証する。
 *
 * この関数はDOMを操作せず、
 * 渡された文字列から処理結果だけを返す。
 *
 * 処理順:
 * 1. すべての空白文字を除去する
 * 2. 空欄か確認する
 * 3. 全角数字を半角数字へ変換する
 * 4. 数字以外が含まれていないか確認する
 * 5. 12桁または13桁か確認する
 * 6. チェックデジットを追加または検証する
 * 7. 表示用の7桁区切り文字列を生成する
 *
 * @param input 入力されたJANコード
 * @returns JANコードの処理結果
 */
export function normalizeJan(input) {
    /*
     * 半角空白、全角空白、タブ、改行など、
     * JavaScriptが空白として扱う文字をすべて除去する。
     */
    const valueWithoutWhitespace = removeAllWhitespace(input);
    /*
     * 空白を取り除いた結果が空文字なら、
     * JANコード未設定として正常終了する。
     */
    if (valueWithoutWhitespace === "") {
        return {
            success: true,
            jan: "",
            displayJan: "",
            hadCheckDigit: false,
            checkDigit: null
        };
    }
    /*
     * 全角数字を半角数字へ変換する。
     */
    const normalizedValue = convertFullWidthDigitsToHalfWidth(valueWithoutWhitespace);
    /*
     * 半角数字以外が含まれている場合はエラーとする。
     *
     * ハイフンやアルファベットなどを
     * 勝手に削除して補正することはしない。
     */
    if (!isHalfWidthDigitsOnly(normalizedValue)) {
        return {
            success: false,
            errorMessage: "JANコードには数字だけを入力してください。"
        };
    }
    /*
     * JANコードは、
     * チェックデジットなしの12桁または
     * チェックデジットありの13桁だけを受け付ける。
     */
    if (normalizedValue.length !== JAN_BODY_LENGTH &&
        normalizedValue.length !== JAN_FULL_LENGTH) {
        return {
            success: false,
            errorMessage: "JANコードは12桁または13桁で入力してください。"
        };
    }
    /*
     * 12桁の場合は、
     * チェックデジットが省略されているものとして
     * 13桁目を自動計算して追加する。
     */
    if (normalizedValue.length === JAN_BODY_LENGTH) {
        const checkDigit = calculateJanCheckDigit(normalizedValue);
        const completedJan = normalizedValue + String(checkDigit);
        return {
            success: true,
            jan: completedJan,
            displayJan: formatJanForDisplay(completedJan),
            hadCheckDigit: false,
            checkDigit
        };
    }
    /*
     * 13桁の場合は、
     * 最後の1桁を入力されたチェックデジットとして扱う。
     */
    const janBody = normalizedValue.slice(0, JAN_BODY_LENGTH);
    const inputCheckDigit = Number(normalizedValue.slice(-1));
    const calculatedCheckDigit = calculateJanCheckDigit(janBody);
    /*
     * 入力されたチェックデジットと
     * 計算したチェックデジットが一致するか確認する。
     */
    if (inputCheckDigit !== calculatedCheckDigit) {
        return {
            success: false,
            errorMessage: "JANコードのチェックデジットが正しくありません。"
        };
    }
    return {
        success: true,
        jan: normalizedValue,
        displayJan: formatJanForDisplay(normalizedValue),
        hadCheckDigit: true,
        checkDigit: calculatedCheckDigit
    };
}
/**
 * JANコード12桁からチェックデジットを計算する。
 *
 * 計算方法:
 * - 左から奇数番目の数字をそのまま加算する
 * - 左から偶数番目の数字を3倍して加算する
 * - 合計を次の10の倍数にするために必要な値を求める
 *
 * @param janBody チェックデジットを除いた12桁
 * @returns 0から9までのチェックデジット
 */
export function calculateJanCheckDigit(janBody) {
    if (janBody.length !== JAN_BODY_LENGTH) {
        throw new Error("チェックデジットの計算には12桁の数字が必要です。");
    }
    if (!isHalfWidthDigitsOnly(janBody)) {
        throw new Error("チェックデジットの計算対象には半角数字だけを指定してください。");
    }
    let sum = 0;
    for (let index = 0; index < janBody.length; index++) {
        const digit = Number(janBody[index]);
        /*
         * 配列のindexは0から始まるため、
         * indexが偶数ならJAN上では左から奇数番目となる。
         */
        const isOddPosition = index % 2 === 0;
        if (isOddPosition) {
            sum += digit;
        }
        else {
            sum += digit * 3;
        }
    }
    /*
     * 合計がすでに10の倍数なら0となる。
     */
    return (10 - (sum % 10)) % 10;
}
/**
 * 13桁のJANコードを画面表示用に整形する。
 *
 * 先頭7桁と残り6桁の間へ半角空白を挿入する。
 *
 * 例:
 * 4901234567894
 * ↓
 * 4901234 567894
 *
 * @param jan 空白なしの13桁JANコード
 * @returns 7桁区切りの表示用JANコード
 */
export function formatJanForDisplay(jan) {
    if (jan === "") {
        return "";
    }
    if (jan.length !== JAN_FULL_LENGTH ||
        !isHalfWidthDigitsOnly(jan)) {
        throw new Error("画面表示用の整形には13桁のJANコードが必要です。");
    }
    return [
        jan.slice(0, JAN_DISPLAY_SEPARATOR_POSITION),
        jan.slice(JAN_DISPLAY_SEPARATOR_POSITION)
    ].join(" ");
}
//# sourceMappingURL=normalization.js.map