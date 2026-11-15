/**
 * GOSPLAN13: image processing and canvas helpers.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/**
 * File を HTMLImageElement として読み込むにゃ。
 * GIF の場合も、ここでは先頭フレームの画像として読み込まれるにゃ。
 *
 * @param file 読み込む画像ファイル
 * @returns 読み込み済みの HTMLImageElement
 */
export function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("画像ファイルの読み込みに失敗しました。"));
        };
        image.src = objectUrl;
    });
}
/**
 * 元画像の縦横比を維持しながら、
 * 指定された最大幅・最大高さの枠内へ収まる寸法を計算するにゃ。
 *
 * 例:
 * - 1600 × 900 → 800 × 450
 * - 900 × 1600 → 450 × 800
 * - 500 × 400 → 500 × 400
 *
 * @param originalWidth 元画像の幅
 * @param originalHeight 元画像の高さ
 * @param maxWidth 最大幅
 * @param maxHeight 最大高さ
 * @returns 縮小後の幅と高さ
 */
export function calculateContainSize(originalWidth, originalHeight, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);
    return {
        width: Math.max(1, Math.round(originalWidth * scale)),
        height: Math.max(1, Math.round(originalHeight * scale))
    };
}
/**
 * Canvas を JPEG へ変換するにゃ。
 *
 * @param canvas 対象 Canvas
 * @param quality JPEG 品質
 * @returns JPEG の Blob
 */
export function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Canvas の JPEG 変換に失敗しました。"));
                return;
            }
            resolve(blob);
        }, "image/jpeg", quality);
    });
}
/**
 * Blob を Base64 の Data URL 文字列へ変換するにゃ。
 * 返り値は "data:image/jpeg;base64,..." の形式やにゃ。
 *
 * @param blob 変換対象 Blob
 * @returns Base64 の Data URL
 */
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("Base64 文字列への変換に失敗しました。"));
                return;
            }
            resolve(reader.result);
        };
        reader.onerror = () => {
            reject(new Error("Blob の読み込みに失敗しました。"));
        };
        reader.readAsDataURL(blob);
    });
}
/**
 * 画像を指定サイズで Canvas へ描画するにゃ。
 * 透過画像に備えて、先に白背景を敷くにゃ。
 *
 * @param image 元画像
 * @param width 描画後の幅
 * @param height 描画後の高さ
 * @param backgroundColor 背景色
 * @returns 描画済み Canvas
 */
export function drawImageToCanvas(image, width, height, backgroundColor) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas の初期化に失敗しました。");
    }
    /*
     * JPEG は透過を持てないため、
     * 透過部分が黒くならないよう白背景を先に塗るにゃ。
     */
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas;
}
//# sourceMappingURL=image-utils.js.map