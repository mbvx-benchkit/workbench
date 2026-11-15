import { clearJanBarcode } from "./jan-internals.js";
import { normalizeJan } from "./normalization.js";
import { drawJan13Barcode } from "./svg.js";
/**
 * JANコード入力欄を正規化・検証し、
 * 正常であれば入力欄とバーコードSVGへ反映する。
 *
 * main.tsからは基本的にこの関数だけを呼び出す。
 *
 * 正常な場合:
 * - 入力欄を7桁区切りの表示へ変換する
 * - JAN-13バーコードをSVGへ描画する
 * - productLabel.dataset.janへ13桁JANを保存する
 *
 * 空欄の場合:
 * - バーコードを消去する
 * - dataset.janを削除する
 *
 * 入力エラーの場合:
 * - バーコードを消去する
 * - dataset.janを削除する
 * - ブラウザ標準の入力エラーを表示する
 *
 * @param productLabel 処理対象の商品ラベル
 * @param janInput 処理対象のJANコード入力欄
 * @returns JANコードの処理結果
 */
export function processJanInput(productLabel, janInput) {
    const barcodeSvg = productLabel.querySelector(".product-label__barcode");
    if (!barcodeSvg) {
        throw new Error("商品ラベル内にJANバーコード表示用SVGが見つかりません。");
    }
    const barcodePlaceholder = productLabel.querySelector(".product-label__barcode-placeholder");
    if (!barcodePlaceholder) {
        throw new Error("商品ラベル内にJANバーコード案内表示が見つかりません。");
    }
    /*
     * 前回の入力エラー状態を解除する。
     */
    janInput.setCustomValidity("");
    const result = normalizeJan(janInput.value);
    /*
     * 入力内容に問題がある場合は、
     * 前回描画したバーコードを消去する。
     */
    if (!result.success) {
        clearJanBarcode(barcodeSvg);
        barcodePlaceholder.hidden = false;
        /*
         * 不正なJANコードを内部値として残さない。
         */
        delete productLabel.dataset.jan;
        janInput.setCustomValidity(result.errorMessage);
        janInput.reportValidity();
        return result;
    }
    /*
     * 空欄の場合は、
     * JANコード未設定としてバーコードを消去する。
     */
    if (result.jan === "") {
        janInput.value = "";
        clearJanBarcode(barcodeSvg);
        barcodePlaceholder.hidden = false;
        delete productLabel.dataset.jan;
        return result;
    }
    /*
     * 入力欄へ、
     * 先頭7桁と残り6桁を空白で分けた値を反映する。
     */
    janInput.value = result.displayJan;
    /*
     * JSON保存や今後の処理で利用できるよう、
     * 空白なしの13桁JANコードを商品ラベルへ保存する。
     */
    productLabel.dataset.jan = result.jan;
    barcodePlaceholder.hidden = true;
    /*
     * 正常な13桁JANコードから
     * バーコードを生成してSVGへ描画する。
     */
    drawJan13Barcode(barcodeSvg, result.jan);
    return result;
}
//# sourceMappingURL=input.js.map