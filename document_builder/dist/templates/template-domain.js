/**
 * DOCUMENT BUILDER: template types, validation and date formatting.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Generic validation
   ========================================================= */
export function requireRecord(value, message) {
    if (typeof value !==
        "object" ||
        value ===
            null ||
        Array.isArray(value)) {
        throw new Error(message);
    }
    return value;
}
export function requireString(value, path) {
    if (typeof value !==
        "string") {
        throw new Error(`${path} は文字列である必要があります。`);
    }
    return value;
}
/* =========================================================
   Local date
   ========================================================= */
export function formatLocalDate(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() +
        1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return (`${year}-${month}-${day}`);
}
//# sourceMappingURL=template-domain.js.map