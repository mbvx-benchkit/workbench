/**
 * DOCUMENT BUILDER: DOM lookup, display formatting and error messages.
 * Consolidated from Stage-1 mechanical helper splits.
 */
export function formatPrintHistoryBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
export function formatPrintHistoryDate(timestamp) {
    const date = new Date(timestamp);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/* =========================================================
   DOM
   ========================================================= */
export function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`${selector} が見つかりません。`);
    }
    return element;
}
export function requireChild(parent, selector) {
    const element = parent.querySelector(selector);
    if (!element) {
        throw new Error(`${selector} が見つかりません。`);
    }
    return element;
}
/* =========================================================
   Error
   ========================================================= */
export function getErrorMessage(error) {
    if (error instanceof
        Error &&
        error.message) {
        return error.message;
    }
    return ("処理に失敗しました。");
}
/* =========================================================
   DOM
   ========================================================= */
export function requireTemplate(id) {
    const element = document.getElementById(id);
    if (!(element instanceof
        HTMLTemplateElement)) {
        throw new Error(`#${id} が見つかりません。`);
    }
    return element;
}
//# sourceMappingURL=document-utils.js.map