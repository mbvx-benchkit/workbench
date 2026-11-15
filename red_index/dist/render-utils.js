/**
 * RED INDEX: form rendering helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Date
   ========================================================= */
export function formatCurrentDate() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() +
        1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return (`${year}.${month}.${day}`);
}
export function formatCurrentIsoDate() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() +
        1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return (`${year}-${month}-${day}`);
}
//# sourceMappingURL=render-utils.js.map