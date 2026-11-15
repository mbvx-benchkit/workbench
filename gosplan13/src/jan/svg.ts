/* WORKBENCH_ROLE_SPLIT_STAGE2: gosplan13/src/jan.ts -> svg.ts; declarations moved without behavioral changes */
import type { JanSuccessResult, JanEmptyResult, JanErrorResult, JanResult } from "./jan-internals.js";
import { removeAllWhitespace, convertFullWidthDigitsToHalfWidth, clearJanBarcode } from "./jan-internals.js";
import { isHalfWidthDigitsOnly, isGuardBarModule } from "./jan-internals.js";
import { encodeJan13 } from "./encoding.js";
import { formatJanForDisplay } from "./normalization.js";



/**
 * SVG要素を生成するときに使用する名前空間。
 */
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";



/**
 * バーコードSVG全体の横幅。
 */
export const SVG_WIDTH = 220;



/**
 * バーコードSVG全体の高さ。
 *
 * 数字をSVG内へ表示しないため、
 * バーだけが収まる高さにしている。
 */
export const SVG_HEIGHT = 64;



/**
 * バーコード左側の余白。
 */
export const BARCODE_START_X = 15;



/**
 * バーコード1モジュールあたりの横幅。
 *
 * JAN-13のバーコード部分は95モジュールで構成される。
 * 95 × 2 = 190となり、左右15ずつの余白を含めて220になる。
 */
export const MODULE_WIDTH = 2;



/**
 * バーの描画開始位置。
 */
export const BAR_START_Y = 3;



/**
 * 通常バーの高さ。
 */
export const NORMAL_BAR_HEIGHT = 52;



/**
 * ガードバーの高さ。
 *
 * 左端、中央、右端のガードバーのみ、
 * 通常バーより少し長く描画する。
 */
export const GUARD_BAR_HEIGHT = 58;



/**
 * JAN-13バーコードをSVGへ描画する。
 *
 * SVGにはバーのみを描画し、
 * JANコードの数字は表示しない。
 *
 * @param barcodeSvg 描画先のSVG要素
 * @param jan 空白なし13桁のJANコード
 */
export function drawJan13Barcode(
    barcodeSvg: SVGSVGElement,
    jan: string
): void {
    /*
     * 新しいバーコードを描画する前に、
     * 前回の描画内容をすべて削除する。
     */
    clearJanBarcode(barcodeSvg);

    const encoded = encodeJan13(jan);

    barcodeSvg.setAttribute(
        "viewBox",
        `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`
    );

    barcodeSvg.setAttribute(
        "preserveAspectRatio",
        "xMidYMid meet"
    );

    barcodeSvg.setAttribute(
        "shape-rendering",
        "crispEdges"
    );

    /*
     * 目には表示しないが、
     * スクリーンリーダー向けの説明には
     * JANコードを設定する。
     */
    barcodeSvg.setAttribute(
        "aria-label",
        `JANバーコード ${formatJanForDisplay(jan)}`
    );

    /*
     * バーコード背景を白くする。
     *
     * 印刷時や背景色が設定された場合でも、
     * バーコード部分を読み取りやすくする。
     */
    const background =
        document.createElementNS(
            SVG_NAMESPACE,
            "rect"
        );

    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute(
        "width",
        String(SVG_WIDTH)
    );
    background.setAttribute(
        "height",
        String(SVG_HEIGHT)
    );
    background.setAttribute("fill", "#ffffff");

    barcodeSvg.append(background);

    /*
     * ビット列の1となっている部分へ、
     * 黒い縦棒を描画する。
     */
    for (
        let moduleIndex = 0;
        moduleIndex < encoded.length;
        moduleIndex++
    ) {
        if (encoded[moduleIndex] !== "1") {
            continue;
        }

        const rect =
            document.createElementNS(
                SVG_NAMESPACE,
                "rect"
            );

        const x =
            BARCODE_START_X +
            moduleIndex * MODULE_WIDTH;

        const isGuardModule =
            isGuardBarModule(moduleIndex);

        const barHeight =
            isGuardModule
                ? GUARD_BAR_HEIGHT
                : NORMAL_BAR_HEIGHT;

        rect.setAttribute("x", String(x));
        rect.setAttribute("y", String(BAR_START_Y));
        rect.setAttribute(
            "width",
            String(MODULE_WIDTH)
        );
        rect.setAttribute(
            "height",
            String(barHeight)
        );
        rect.setAttribute("fill", "#000000");

        barcodeSvg.append(rect);
    }
}
