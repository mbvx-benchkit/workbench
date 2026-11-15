/* WORKBENCH_ROLE_SPLIT_STAGE2: inventory_batch/src/csv.ts -> models.ts; declarations moved without behavioral changes */
import type { CsvEncoding, CsvRowError, InventoryCsvErrorCode, DecodedCsvCandidate, RequiredColumnIndexes } from "./csv-internals.js";
import { normalizeHeader, parseQuantity, isEmptyRow } from "./csv-internals.js";
import { getColumnValue } from "./csv-internals.js";
import type {
    InventoryItem
} from "../inventory.js";





/**
 * CSV読込結果。
 */
export type CsvImportResult = {
    /**
     * InventoryItemへ変換された商品一覧。
     */
    items: InventoryItem[];

    /**
     * CSV読込時に検出された行単位エラー。
     */
    errors: CsvRowError[];

    /**
     * 実際に採用した文字コード。
     */
    encoding: CsvEncoding;

    /**
     * CSVに存在したヘッダー一覧。
     */
    headers: string[];

    /**
     * ヘッダーより後に存在した、
     * 空行を除くデータ行数。
     */
    sourceRowCount: number;

    /**
     * 読み飛ばした空行数。
     */
    skippedEmptyRowCount: number;
};
