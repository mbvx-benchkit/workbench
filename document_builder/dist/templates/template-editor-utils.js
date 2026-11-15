/**
 * DOCUMENT BUILDER: template editor helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Template ID
   ========================================================= */
export function createTemplateId() {
    const timestamp = Date.now()
        .toString(36);
    const random = Math.random()
        .toString(36)
        .slice(2, 8);
    return (`template-${timestamp}-${random}`);
}
/* =========================================================
   Focus
   ========================================================= */
export function focusLater(element) {
    window.setTimeout(() => {
        element.focus();
    }, 0);
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
//# sourceMappingURL=template-editor-utils.js.map