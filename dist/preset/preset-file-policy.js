/** Shared validation for preset registration and restorable backup archives. */
import { isPng, isJpeg, isWebp } from "../backup/archive-file-utils.js";
import { MAX_ARCHIVE_ENTRY_BYTES, MAX_ARCHIVE_IMAGE_BYTES } from "../backup/backup-limits.js";
/** Determine the real image format from its signature, not File.type. */
export async function detectPresetPreviewMimeType(blob) {
    if (blob.size === 0 || blob.size > MAX_ARCHIVE_IMAGE_BYTES) {
        throw new Error("プレビュー画像は32MiB以下のPNG、JPEG、WebPを指定してください。");
    }
    const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    if (isPng(bytes))
        return "image/png";
    if (isJpeg(bytes))
        return "image/jpeg";
    if (isWebp(bytes))
        return "image/webp";
    return null;
}
/** Match the basic PDF checks made by the archive restore path without loading the whole PDF. */
export async function assertRestorablePresetPdf(blob) {
    if (blob.size < 128 || blob.size > MAX_ARCHIVE_ENTRY_BYTES) {
        throw new Error("定型印刷物PDFは128バイト以上、64MiB以下のPDFを指定してください。");
    }
    const headerBytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const header = String.fromCharCode(...headerBytes);
    if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(header)) {
        throw new Error("PDFのファイル形式が不正です。");
    }
    const tail = new TextDecoder("latin1").decode(await blob.slice(Math.max(0, blob.size - 8192)).arrayBuffer());
    const matches = [...tail.matchAll(/startxref\s+(\d+)\s+%%EOF/g)];
    const last = matches[matches.length - 1];
    if (!last)
        throw new Error("PDFの終端が不正です。");
    const offset = Number(last[1]);
    if (!Number.isSafeInteger(offset) || offset <= 0 || offset >= blob.size) {
        throw new Error("PDFの参照位置が不正です。");
    }
}
/** Fail before ZIP creation when old records cannot be restored faithfully. */
export async function validateRestorablePresetFile(document) {
    try {
        await assertRestorablePresetPdf(document.pdfBlob);
        if (!document.previewBlob)
            return null;
        const format = await detectPresetPreviewMimeType(document.previewBlob);
        if (!format)
            throw new Error("プレビュー画像の内容がPNG、JPEG、WebPのいずれでもありません。");
        return format;
    }
    catch (error) {
        throw new Error(`定型印刷物「${document.title}」をバックアップできません: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=preset-file-policy.js.map