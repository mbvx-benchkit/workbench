import { loadImageFile, calculateContainSize, canvasToJpegBlob, blobToBase64 } from "./image-utils.js";
import { drawImageToCanvas } from "./image-utils.js";
/**
 * image.ts
 *
 * 商品画像をブラウザ上で軽量化し、
 * 常に JPEG の Base64 へ変換して扱うためのユーティリティ群やにゃ。
 *
 * 方針:
 * - 入力は png / jpg / jpeg / webp / gif を受け付ける
 * - 出力は常に image/jpeg の Base64
 * - 長辺は 800px 以内へ縮小する
 * - 縦横比は維持する
 * - 透過部分は白背景へ合成する
 * - GIF は先頭フレームのみを画像として扱う
 * - できるだけ 600KB 以下へ圧縮する
 */
/**
 * 受け付ける画像の MIME タイプ一覧やにゃ。
 */
const SUPPORTED_IMAGE_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif"
];
/**
 * 画像圧縮の設定値やにゃ。
 * 必要になればここだけ触ればええように分離してあるにゃ。
 */
const DEFAULT_OPTIONS = {
    /**
     * 出力画像の最大幅やにゃ。
     */
    maxWidth: 800,
    /**
     * 出力画像の最大高さやにゃ。
     */
    maxHeight: 800,
    /**
     * JPEG 本体の目標最大サイズやにゃ。
     * 600KB 以下を狙うにゃ。
     */
    maxBytes: 600 * 1024,
    /**
     * 最初に試す JPEG 品質やにゃ。
     * 0〜1 の範囲で、1 に近いほど高品質やにゃ。
     */
    initialQuality: 0.8,
    /**
     * これ以上は画質を落とさない下限やにゃ。
     */
    minQuality: 0.4,
    /**
     * 容量が大きい場合に、何段階ずつ品質を下げるかやにゃ。
     */
    qualityStep: 0.1,
    /**
     * 品質だけではサイズが収まらない場合に、
     * 画像寸法をどれくらいずつ縮小するかやにゃ。
     */
    downscaleRatio: 0.85,
    /**
     * これ以上は画像寸法を小さくしない下限やにゃ。
     */
    minWidth: 100,
    /**
     * これ以上は画像寸法を小さくしない下限やにゃ。
     */
    minHeight: 100,
    /**
     * 透過画像を JPEG 化するときの背景色やにゃ。
     */
    backgroundColor: "#ffffff"
};
/**
 * 選択された画像ファイルを読み込み、
 * 長辺 800px 以内・JPEG・軽量化済みの Base64 へ変換するメイン関数やにゃ。
 *
 * @param file 元画像ファイル
 * @param customOptions 必要に応じて上書きする圧縮設定
 * @returns 圧縮済み画像情報
 */
export async function compressImageToJpeg(file, customOptions = {}) {
    const options = {
        ...DEFAULT_OPTIONS,
        ...customOptions
    };
    validateImageFile(file);
    const image = await loadImageFile(file);
    /*
     * 元画像の縦横比を保ったまま、
     * maxWidth × maxHeight の枠内へ収める寸法を計算するにゃ。
     */
    let { width, height } = calculateContainSize(image.naturalWidth, image.naturalHeight, options.maxWidth, options.maxHeight);
    /*
     * まずは現在の寸法で描画した Canvas を作るにゃ。
     */
    let canvas = drawImageToCanvas(image, width, height, options.backgroundColor);
    /*
     * まずは品質調整だけで目標サイズ以下になるか試すにゃ。
     */
    let blob = await compressCanvasByQuality(canvas, options);
    /*
     * 品質だけではサイズが収まらない場合は、
     * 画像寸法自体を段階的に縮小して再試行するにゃ。
     */
    while (blob.size > options.maxBytes &&
        (width > options.minWidth || height > options.minHeight)) {
        width = Math.max(options.minWidth, Math.round(width * options.downscaleRatio));
        height = Math.max(options.minHeight, Math.round(height * options.downscaleRatio));
        canvas = drawImageToCanvas(image, width, height, options.backgroundColor);
        blob = await compressCanvasByQuality(canvas, options);
        /*
         * 寸法がこれ以上縮められない場合はループを抜けるにゃ。
         */
        if (width <= options.minWidth &&
            height <= options.minHeight) {
            break;
        }
    }
    const base64 = await blobToBase64(blob);
    return {
        blob,
        base64,
        width,
        height,
        mimeType: "image/jpeg",
        originalFileName: file.name,
        originalFileType: file.type,
        originalBytes: file.size,
        compressedBytes: blob.size
    };
}
/**
 * 入力ファイルがサポート対象の画像かを検証するにゃ。
 *
 * @param file チェック対象ファイル
 */
function validateImageFile(file) {
    /*
     * ブラウザによっては type が空文字になるケースがあるにゃ。
     * その場合は拡張子でもざっくり許容するにゃ。
     */
    const lowerFileName = file.name.toLowerCase();
    const isSupportedByMimeType = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
    const isSupportedByExtension = lowerFileName.endsWith(".png") ||
        lowerFileName.endsWith(".jpg") ||
        lowerFileName.endsWith(".jpeg") ||
        lowerFileName.endsWith(".webp") ||
        lowerFileName.endsWith(".gif");
    if (!isSupportedByMimeType && !isSupportedByExtension) {
        throw new Error("対応していない画像形式です。png / jpg / jpeg / webp / gif を選択してください。");
    }
}
/**
 * Canvas を品質調整だけで maxBytes 以下へ収めようとするにゃ。
 * 品質を initialQuality から minQuality まで段階的に下げるにゃ。
 *
 * @param canvas 対象 Canvas
 * @param options 圧縮設定
 * @returns 圧縮後 Blob
 */
async function compressCanvasByQuality(canvas, options) {
    let quality = options.initialQuality;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > options.maxBytes &&
        quality - options.qualityStep >= options.minQuality) {
        quality = Math.max(options.minQuality, quality - options.qualityStep);
        blob = await canvasToJpegBlob(canvas, quality);
    }
    return blob;
}
//# sourceMappingURL=image.js.map