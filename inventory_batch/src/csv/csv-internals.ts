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
export function getColumnValue(
    row: readonly string[],
    columnIndex: number
): string {

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
export function normalizeHeader(
    value: string
): string {

    return value
        .replace(
            /^\uFEFF/,
            ""
        )
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
export function parseQuantity(
    rawValue: string
): number {

    const normalized =
        rawValue
            .trim()
            .replace(
                /,/g,
                ""
            );

    if (normalized === "") {
        return Number.NaN;
    }

    const value =
        Number(normalized);

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
export function isEmptyRow(
    row: readonly string[]
): boolean {

    return row.every(
        (value) =>
            value.trim() === ""
    );
}

/* =========================================================
   型定義
   ========================================================= */

/**
 * 対応するCSV文字コード。
 */
export type CsvEncoding =
    | "utf-8"
    | "shift_jis";

/**
 * CSV上の1行に対する警告・エラー。
 *
 * 行自体を破棄するとは限らない。
 */
export type CsvRowError = {
    rowNumber: number;

    type:
    | "invalid-quantity";

    message: string;

    rawValue?: string;
};

/**
 * CSV読込そのものを継続できない場合のエラーコード。
 */
export type InventoryCsvErrorCode =
    | "EMPTY_FILE"
    | "UNSUPPORTED_ENCODING"
    | "INVALID_CSV"
    | "MISSING_HEADERS";

/**
 * デコード済みCSV候補。
 */
export type DecodedCsvCandidate = {
    encoding: CsvEncoding;
    rows: string[][];
    headerRowIndex: number;
    headers: string[];
};

/**
 * 必要列のインデックス。
 */
export type RequiredColumnIndexes = {
    pluCode: number;
    productName: number;
    quantity: number;
};
