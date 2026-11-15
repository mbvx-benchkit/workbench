/* WORKBENCH_ROLE_SPLIT_STAGE2: inventory_batch/src/barcode.ts -> svg.ts; declarations moved without behavioral changes */
import type { Ean13ValidationError, Ean13ValidationResult, BarcodeRenderResult } from "./barcode-internals.js";
import { normalizeEan13, isScientificNotation } from "./barcode-internals.js";
import { calculateEan13CheckDigit } from "./barcode-internals.js";
import { END_GUARD_START_INDEX, LEFT_QUIET_ZONE_MODULES, MIDDLE_GUARD, MIDDLE_GUARD_START_INDEX, START_GUARD, TOTAL_MODULE_COUNT, createEan13Pattern } from "./encoding.js";
import { validateEan13 } from "./validation.js";



/**
 * barcode.ts
 *
 * INVENTORY BATCH のEAN-13バーコード処理を管理する。
 *
 * このファイルでは以下を担当する。
 *
 * - PLUコードの正規化
 * - EAN-13形式の検証
 * - Excel等による指数表記変換の検出
 * - チェックディジットの計算
 * - SVGバーコードの描画
 *
 * CSV解析や画面全体のDOM描画は担当しない。
 */


/* =========================================================
   定数
   ========================================================= */

/**
 * SVG名前空間。
 */
export const SVG_NAMESPACE =
    "http://www.w3.org/2000/svg";




/* =========================================================
   SVG高さ
   ========================================================= */

/**
 * SVG内部の最大高さ。
 *
 * ガードバーがこの高さまで伸びる。
 */
export const GUARD_BAR_HEIGHT =
    40;




/**
 * 通常のデータバー。
 *
 * ガードより少し短くし、
 * EAN-13らしい外観にする。
 */
export const DATA_BAR_HEIGHT =
    34;




/**
 * SVG viewBoxの高さ。
 */
export const VIEWBOX_HEIGHT =
    GUARD_BAR_HEIGHT;




/**
 * 指定SVGへEAN-13バーコードを描画する。
 *
 * 検証に失敗した場合はSVGを空にし、
 * エラー情報を返す。
 */
export function renderEan13Barcode(
    svg: SVGSVGElement,
    rawValue: string
): BarcodeRenderResult {

    const validation =
        validateEan13(
            rawValue
        );


    /**
     * 前回描画内容を必ず削除する。
     */
    svg.replaceChildren();


    if (
        !validation.valid
    ) {

        svg.removeAttribute(
            "viewBox"
        );


        svg.removeAttribute(
            "aria-label"
        );


        return {
            success: false,
            value:
                validation.value,
            error:
                validation.error,
            message:
                validation.message
        };
    }


    const value =
        validation.value;


    const pattern =
        createEan13Pattern(
            value
        );


    configureBarcodeSvg(
        svg,
        value
    );


    drawBarcodePattern(
        svg,
        pattern
    );


    return {
        success: true,
        value
    };
}




/* =========================================================
   SVG設定
   ========================================================= */

/**
 * バーコード描画用SVGを設定する。
 *
 * 横方向:
 *   113モジュールをCSS指定幅いっぱいに使う。
 *
 * 縦方向:
 *   CSS指定高さへ独立して合わせる。
 *
 * xMidYMid meet を使用すると
 * viewBox比率とCSS比率の差によって
 * 左右へ大量の未使用領域が発生するため、
 * preserveAspectRatio="none" とする。
 */
export function configureBarcodeSvg(
    svg: SVGSVGElement,
    value: string
): void {

    svg.setAttribute(
        "viewBox",
        `0 0 ${TOTAL_MODULE_COUNT} ${VIEWBOX_HEIGHT}`
    );


    svg.setAttribute(
        "preserveAspectRatio",
        "none"
    );


    svg.setAttribute(
        "shape-rendering",
        "crispEdges"
    );


    svg.setAttribute(
        "role",
        "img"
    );


    svg.setAttribute(
        "aria-label",
        `EAN-13バーコード ${value}`
    );
}




/* =========================================================
   ガード判定
   ========================================================= */

/**
 * 指定モジュールが
 *
 * - 開始ガード
 * - 中央ガード
 * - 終了ガード
 *
 * のいずれかに属するか判定する。
 */
export function isGuardModule(
    moduleIndex: number
): boolean {

    /* -----------------------------------------------------
       開始ガード
       0 ～ 2
       ----------------------------------------------------- */

    if (
        moduleIndex <
        START_GUARD.length
    ) {

        return true;
    }


    /* -----------------------------------------------------
       中央ガード
       45 ～ 49
       ----------------------------------------------------- */

    if (
        moduleIndex >=
        MIDDLE_GUARD_START_INDEX &&
        moduleIndex <
        MIDDLE_GUARD_START_INDEX +
        MIDDLE_GUARD.length
    ) {

        return true;
    }


    /* -----------------------------------------------------
       終了ガード
       92 ～ 94
       ----------------------------------------------------- */

    if (
        moduleIndex >=
        END_GUARD_START_INDEX
    ) {

        return true;
    }


    return false;
}




/* =========================================================
   SVG描画
   ========================================================= */

/**
 * 95モジュールのEAN-13パターンを
 * SVGのrect要素として描画する。
 *
 * ガードバーのみ通常バーより
 * 少し長く描画する。
 */
export function drawBarcodePattern(
    svg: SVGSVGElement,
    pattern: string
): void {

    const fragment =
        document.createDocumentFragment();


    let moduleIndex =
        0;


    while (
        moduleIndex <
        pattern.length
    ) {

        /* -------------------------------------------------
           白スペース
           ------------------------------------------------- */

        if (
            pattern[
            moduleIndex
            ] !==
            "1"
        ) {

            moduleIndex +=
                1;


            continue;
        }


        /* -------------------------------------------------
           黒バー開始位置
           ------------------------------------------------- */

        const startIndex =
            moduleIndex;


        /**
         * 連続した黒モジュールを
         * 1本のrectへまとめる。
         */
        while (
            moduleIndex <
            pattern.length &&
            pattern[
            moduleIndex
            ] ===
            "1"
        ) {

            moduleIndex +=
                1;
        }


        const width =
            moduleIndex -
            startIndex;


        /**
         * ガードバーだけ
         * 少し長くする。
         */
        const height =
            isGuardModule(
                startIndex
            )
                ? GUARD_BAR_HEIGHT
                : DATA_BAR_HEIGHT;


        const rect =
            document.createElementNS(
                SVG_NAMESPACE,
                "rect"
            );


        rect.setAttribute(
            "x",
            String(
                LEFT_QUIET_ZONE_MODULES +
                startIndex
            )
        );


        rect.setAttribute(
            "y",
            "0"
        );


        rect.setAttribute(
            "width",
            String(
                width
            )
        );


        rect.setAttribute(
            "height",
            String(
                height
            )
        );


        rect.setAttribute(
            "fill",
            "currentColor"
        );


        fragment.appendChild(
            rect
        );
    }


    svg.appendChild(
        fragment
    );
}
