/**
 * INVENTORY BATCH: CSV parsing utilities and data models.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   値変換
   ========================================================= */
/**
 * CSV行から指定列の値を取得する。
 *
 * 行の列数が不足している場合は
 * 空文字を返す。
 */
export function getColumnValue(row, columnIndex) {
    return row[columnIndex] ?? "";
}
/**
 * ヘッダー文字列を正規化する。
 *
 * - UTF-8 BOM削除
 * - 前後空白削除
 *
 * 列名そのものは勝手に変換しない。
 */
export function normalizeHeader(value) {
    return value
        .replace(/^\uFEFF/, "")
        .trim();
}
/**
 * 理論在庫数量をnumberへ変換する。
 *
 * 以下を許容する。
 *
 * 10
 * -1
 * 0
 * 12.5
 * "1,234"
 *
 * 空文字や数値として解釈できない値は
 * Number.NaN を返す。
 */
export function parseQuantity(rawValue) {
    const normalized = rawValue
        .trim()
        .replace(/,/g, "");
    if (normalized === "") {
        return Number.NaN;
    }
    const value = Number(normalized);
    if (!Number.isFinite(value)) {
        return Number.NaN;
    }
    return value;
}
/* =========================================================
   空行判定
   ========================================================= */
/**
 * CSV行に実質的な値が存在しないか判定する。
 */
export function isEmptyRow(row) {
    return row.every((value) => value.trim() === "");
}
//# sourceMappingURL=csv-internals.js.map