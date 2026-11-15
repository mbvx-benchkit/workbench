/**
 * RED INDEX: category model helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Generic Validation
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
//# sourceMappingURL=model-utils.js.map