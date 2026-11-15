/* =========================================================
   CSVエラー絞り込み
   ========================================================= */
/**
 * 現在の出力対象になっている行だけ
 * CSVエラーを残す。
 */
export function filterCsvErrorsByOutputItems(errors, outputItems) {
    const outputRowNumbers = new Set(outputItems.map((item) => item.rowNumber));
    return errors.filter((error) => outputRowNumbers.has(error.rowNumber));
}
/* =========================================================
   エラー統合
   ========================================================= */
/**
 * CSV由来エラーとバーコード由来エラーを
 * 画面表示用形式へ統合する。
 */
export function createDisplayErrors(csvErrors, renderErrors) {
    const errors = [];
    for (const error of csvErrors) {
        errors.push({
            rowNumber: error.rowNumber,
            message: error.message
        });
    }
    for (const error of renderErrors) {
        errors.push({
            rowNumber: error.rowNumber,
            message: error.message
        });
    }
    /**
     * エラー一覧自体は
     * CSV元行番号順。
     */
    errors.sort((first, second) => (first.rowNumber ??
        0) -
        (second.rowNumber ??
            0));
    return errors;
}
//# sourceMappingURL=error-model.js.map