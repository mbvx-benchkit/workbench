/**
 * WORKBENCH: preset record types and ID creation.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   ID
   ========================================================= */
export function createPresetDocumentId() {
    if (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    /**
     * randomUUID非対応環境用。
     *
     * 現行ブラウザでは基本的に
     * randomUUID側が使用される。
     */
    return [
        "preset",
        Date.now(),
        Math.random()
            .toString(16)
            .slice(2)
    ].join("-");
}
//# sourceMappingURL=preset-model-utils.js.map