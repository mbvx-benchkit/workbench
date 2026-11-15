/**
 * WORKBENCH: backup archive encoding, file checks and read limits.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Blob
   ========================================================= */
export function createBlob(bytes, mimeType) {
    /**
     * Uint8Arrayを新規ArrayBufferへコピーする。
     *
     * BlobPartの型互換性を
     * TypeScript環境差で壊さないため。
     */
    const copy = new Uint8Array(bytes);
    return new Blob([
        copy.buffer
    ], {
        type: mimeType
    });
}
/* =========================================================
   JSON
   ========================================================= */
export function stringifyJson(value) {
    return JSON.stringify(value, null, 2);
}
export function getImageExtension(mimeType) {
    switch (mimeType) {
        case "image/png":
            return "png";
        case "image/jpeg":
            return "jpg";
        case "image/webp":
            return "webp";
        default:
            throw new Error(`対応していないプレビュー画像形式です: ${mimeType}`);
    }
}
export function isPng(bytes) {
    const signature = [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a
    ];
    if (bytes.length <
        signature.length) {
        return false;
    }
    return signature.every((byte, index) => bytes[index] ===
        byte);
}
export function isJpeg(bytes) {
    return (bytes.length >=
        3 &&
        bytes[0] ===
            0xff &&
        bytes[1] ===
            0xd8 &&
        bytes[2] ===
            0xff);
}
export function isWebp(bytes) {
    if (bytes.length <
        12) {
        return false;
    }
    return (bytes[0] ===
        0x52 &&
        bytes[1] ===
            0x49 &&
        bytes[2] ===
            0x46 &&
        bytes[3] ===
            0x46 &&
        bytes[8] ===
            0x57 &&
        bytes[9] ===
            0x45 &&
        bytes[10] ===
            0x42 &&
        bytes[11] ===
            0x50);
}
/* =========================================================
   File Name
   ========================================================= */
export function sanitizeFileName(value) {
    const normalized = value
        .normalize("NFKC")
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\.+$/g, "");
    if (normalized.length ===
        0) {
        return "document";
    }
    return normalized.slice(0, 80);
}
//# sourceMappingURL=archive-file-utils.js.map