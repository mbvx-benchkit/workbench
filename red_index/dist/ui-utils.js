/**
 * RED INDEX: main-screen helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Error
   ========================================================= */
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return ("処理中に不明なエラーが発生しました。");
}
//# sourceMappingURL=ui-utils.js.map