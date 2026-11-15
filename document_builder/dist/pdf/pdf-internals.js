/**
 * DOCUMENT BUILDER: PDF file and capture support.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Download fallback
   ========================================================= */
export function downloadPdfBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href =
        url;
    anchor.download =
        fileName;
    anchor.hidden =
        true;
    document.body.appendChild(anchor);
    try {
        anchor.click();
    }
    finally {
        anchor.remove();
        /**
         * click直後に破棄すると
         * 一部環境で読み込み前に消える可能性を避ける。
         */
        window.setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }
}
/* =========================================================
   Frame
   ========================================================= */
export function waitForNextFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}
export function sanitizeFileNamePart(value) {
    return value
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/[. ]+$/g, "");
}
/* =========================================================
   Abort
   ========================================================= */
export function isAbortError(error) {
    return (error instanceof
        DOMException &&
        error.name ===
            "AbortError");
}
//# sourceMappingURL=pdf-internals.js.map