/**
 * GOSPLAN13: local storage validation and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   汎用型判定
   ========================================================= */
export function isObject(value) {
    return (typeof value === "object"
        && value !== null
        && !Array.isArray(value));
}
//# sourceMappingURL=storage-utils.js.map