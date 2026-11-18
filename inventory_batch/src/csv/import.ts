/* WORKBENCH_ROLE_SPLIT_STAGE2: inventory_batch/src/csv.ts -> import.ts; declarations moved without behavioral changes */
import type { CsvEncoding, CsvRowError, InventoryCsvErrorCode, DecodedCsvCandidate, RequiredColumnIndexes } from "./csv-internals.js";
import { normalizeHeader, parseQuantity, isEmptyRow } from "./csv-internals.js";
import { getColumnValue } from "./csv-internals.js";
import type {
    InventoryItem
} from "../inventory.js";
import { findHeaderRowIndex, getMissingRequiredHeaders, getRequiredColumnIndexes, hasRequiredHeaders } from "./headers.js";
import type { CsvImportResult } from "./models.js";




/**
 * CSV読込そのものを継続できない場合に使用するエラー。
 */
export class InventoryCsvError extends Error {

    readonly code: InventoryCsvErrorCode;

    readonly details?: readonly string[];

    constructor(
        code: InventoryCsvErrorCode,
        message: string,
        details?: readonly string[]
    ) {
        super(message);

        this.name = "InventoryCsvError";
        this.code = code;
        this.details = details;
    }
}




/* =========================================================
   公開関数
   ========================================================= */

/**
 * CSVファイルを読み込み、
 * INVENTORY BATCH用データへ変換する。
 *
 * UTF-8とShift_JISの両方を試し、
 * 必須ヘッダーを正常に取得できた方を採用する。
 */
export async function parseInventoryCsv(
    file: File
): Promise<CsvImportResult> {

    // 全量読込と2通りの文字コード解析に入る前に上限を判定する。
    if (file.size > 10 * 1024 * 1024) {
        throw new InventoryCsvError("FILE_TOO_LARGE", "CSVファイルは10MiB以下を選択してください。");
    }
    const buffer = await file.arrayBuffer();

    if (buffer.byteLength === 0) {
        throw new InventoryCsvError(
            "EMPTY_FILE",
            "CSVファイルが空です。"
        );
    }

    const bytes = new Uint8Array(buffer);

    /*
     * UTF-8 / Shift_JIS をそれぞれ試す。
     *
     * 単純な文字コード推測ではなく、
     * 「必須ヘッダーを正しく取得できるか」を
     * 判定材料として使用する。
     */
    const candidates = [
        createDecodedCandidate(
            bytes,
            "utf-8"
        ),
        createDecodedCandidate(
            bytes,
            "shift_jis"
        )
    ].filter(
        (
            candidate
        ): candidate is DecodedCsvCandidate =>
            candidate !== null
    );

    if (candidates.length === 0) {
        throw new InventoryCsvError(
            "UNSUPPORTED_ENCODING",
            "CSVファイルをUTF-8またはShift_JISとして読み込めませんでした。"
        );
    }

    /*
     * 必須ヘッダーがすべて揃っている候補を優先する。
     */
    const candidate =
        candidates.find((item) =>
            hasRequiredHeaders(item.headers)
        )
        ?? candidates[0];

    const missingHeaders =
        getMissingRequiredHeaders(
            candidate.headers
        );

    if (missingHeaders.length > 0) {
        throw new InventoryCsvError(
            "MISSING_HEADERS",
            `必要なCSV列が見つかりません: ${missingHeaders.join(", ")}`,
            missingHeaders
        );
    }

    const columnIndexes =
        getRequiredColumnIndexes(
            candidate.headers
        );

    return convertRowsToInventoryItems(
        candidate.rows,
        candidate.headerRowIndex,
        columnIndexes,
        candidate.encoding,
        candidate.headers
    );
}




/* =========================================================
   文字コード
   ========================================================= */

/**
 * 指定した文字コードでCSVをデコードし、
 * CSV候補を生成する。
 *
 * デコードまたはCSV解析に失敗した場合はnullを返す。
 */
export function createDecodedCandidate(
    bytes: Uint8Array,
    encoding: CsvEncoding
): DecodedCsvCandidate | null {

    try {

        const decoder = new TextDecoder(
            encoding,
            {
                fatal: true
            }
        );

        const text = decoder.decode(bytes);

        const rows = parseCsvText(text);

        const headerRowIndex =
            findHeaderRowIndex(rows);

        if (headerRowIndex === -1) {
            return null;
        }

        const headers =
            rows[headerRowIndex]
                .map(normalizeHeader);

        return {
            encoding,
            rows,
            headerRowIndex,
            headers
        };

    } catch {
        return null;
    }
}




/* =========================================================
   CSVパーサー
   ========================================================= */

/**
 * CSV文字列を二次元配列へ変換する。
 *
 * 対応:
 *
 * - カンマ区切り
 * - CRLF
 * - LF
 * - CR
 * - ダブルクォート囲み
 * - クォート内部のカンマ
 * - クォート内部の改行
 * - "" によるダブルクォートのエスケープ
 *
 * 単純な split(",") は使用しない。
 */
export function parseCsvText(
    text: string
): string[][] {

    const rows: string[][] = [];

    let row: string[] = [];
    let field = "";

    let inQuotes = false;

    for (
        let index = 0;
        index < text.length;
        index += 1
    ) {

        const char = text[index];

        /*
         * ダブルクォート。
         */
        if (char === "\"") {

            if (inQuotes) {

                /*
                 * "" はフィールド内の
                 * ダブルクォート1文字として扱う。
                 */
                if (text[index + 1] === "\"") {
                    field += "\"";
                    index += 1;

                    continue;
                }

                /*
                 * クォートフィールド終了。
                 */
                inQuotes = false;

                continue;
            }

            /*
             * フィールド先頭の " は
             * クォート開始として扱う。
             */
            if (field.length === 0) {
                inQuotes = true;

                continue;
            }

            /*
             * 非クォートフィールド途中に現れた "
             * は通常文字として保持する。
             */
            field += char;

            continue;
        }

        /*
         * クォート内では、
         * カンマ・改行も通常文字。
         */
        if (inQuotes) {

            /*
             * CRLFは内部的にLFへ統一する。
             */
            if (
                char === "\r" &&
                text[index + 1] === "\n"
            ) {
                field += "\n";
                index += 1;

                continue;
            }

            field += char;

            continue;
        }

        /*
         * フィールド区切り。
         */
        if (char === ",") {

            row.push(field);

            field = "";

            continue;
        }

        /*
         * CRLF / CR。
         */
        if (char === "\r") {

            row.push(field);
            rows.push(row);

            row = [];
            field = "";

            if (text[index + 1] === "\n") {
                index += 1;
            }

            continue;
        }

        /*
         * LF。
         */
        if (char === "\n") {

            row.push(field);
            rows.push(row);

            row = [];
            field = "";

            continue;
        }

        field += char;
    }

    /*
     * クォートが閉じられていないCSVは不正。
     */
    if (inQuotes) {
        throw new InventoryCsvError(
            "INVALID_CSV",
            "CSV内に閉じられていないダブルクォートがあります。"
        );
    }

    /*
     * 最終行を追加。
     *
     * ファイル末尾が改行の場合は
     * 空行が1つ生成されるが、
     * 後続処理で空行として除外する。
     */
    row.push(field);
    rows.push(row);

    return rows;
}




/* =========================================================
   InventoryItem変換
   ========================================================= */

/**
 * CSV行から必要3列のみを抜き出し、
 * InventoryItem[]へ変換する。
 */
export function convertRowsToInventoryItems(
    rows: readonly string[][],
    headerRowIndex: number,
    columnIndexes: RequiredColumnIndexes,
    encoding: CsvEncoding,
    headers: string[]
): CsvImportResult {

    const items: InventoryItem[] = [];
    const errors: CsvRowError[] = [];

    let sourceRowCount = 0;
    let skippedEmptyRowCount = 0;

    for (
        let rowIndex =
            headerRowIndex + 1;

        rowIndex < rows.length;

        rowIndex += 1
    ) {

        const row = rows[rowIndex];

        /*
         * CSV上の実際の行番号。
         *
         * 配列は0始まりなので +1。
         */
        const rowNumber =
            rowIndex + 1;

        /*
         * 完全な空行は使用しない。
         */
        if (isEmptyRow(row)) {
            skippedEmptyRowCount += 1;

            continue;
        }

        sourceRowCount += 1;

        /*
         * 必要な3列だけを取得する。
         *
         * その他のCSV列はここで完全に捨てる。
         */
        const pluCode =
            getColumnValue(
                row,
                columnIndexes.pluCode
            ).trim();

        const productName =
            getColumnValue(
                row,
                columnIndexes.productName
            ).trim();

        const rawQuantity =
            getColumnValue(
                row,
                columnIndexes.quantity
            ).trim();

        const quantity =
            parseQuantity(
                rawQuantity
            );

        /*
         * 数量が不正でも、
         * 商品行自体は出力候補として保持する。
         */
        if (Number.isNaN(quantity)) {

            errors.push({
                rowNumber,
                type:
                    "invalid-quantity",
                rawValue:
                    rawQuantity,
                message:
                    `CSV ${rowNumber}行目: 理論在庫数量「${rawQuantity}」を数値として読み取れません。`
            });
        }

        items.push({
            rowNumber,
            pluCode,
            productName,
            quantity
        });
    }

    return {
        items,
        errors,
        encoding,
        headers,
        sourceRowCount,
        skippedEmptyRowCount
    };
}
