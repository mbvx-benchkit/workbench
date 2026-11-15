/* WORKBENCH_ROLE_SPLIT_STAGE2: public facade. Keep existing import paths stable. */

import type { CsvEncoding, CsvRowError, InventoryCsvErrorCode, DecodedCsvCandidate, RequiredColumnIndexes } from "./csv/csv-internals.js";
export type { CsvEncoding, CsvRowError, InventoryCsvErrorCode } from "./csv/csv-internals.js";
import { normalizeHeader, parseQuantity, isEmptyRow } from "./csv/csv-internals.js";
import { getColumnValue } from "./csv/csv-internals.js";

/**
 * csv.ts
 *
 * INVENTORY BATCH のCSV読込・解析を管理する。
 *
 * このファイルでは以下を担当する。
 *
 * - CSVファイルの読み込み
 * - UTF-8 / Shift_JIS の判定
 * - CSV構文の解析
 * - 必要ヘッダーの検証
 * - 必要な3列のみ抽出
 * - InventoryItem[] への変換
 * - CSV由来のエラー生成
 *
 * 数量によるフィルタリングや、
 * DOMへの描画は担当しない。
 */

import type {
    InventoryItem
} from "./inventory.js";

export { INVENTORY_CSV_HEADERS } from "./csv/headers.js";
export type { CsvImportResult } from "./csv/models.js";
export { InventoryCsvError } from "./csv/import.js";
export { parseInventoryCsv } from "./csv/import.js";
