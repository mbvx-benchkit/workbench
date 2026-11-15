/* WORKBENCH_ROLE_SPLIT_STAGE2: inventory_batch/src/csv.ts -> headers.ts; declarations moved without behavioral changes */
import type { CsvEncoding, CsvRowError, InventoryCsvErrorCode, DecodedCsvCandidate, RequiredColumnIndexes } from "./csv-internals.js";
import { normalizeHeader, parseQuantity, isEmptyRow } from "./csv-internals.js";
import { getColumnValue } from "./csv-internals.js";
import type {
    InventoryItem
} from "../inventory.js";





/* =========================================================
   必須ヘッダー
   ========================================================= */

/**
 * INVENTORY BATCH が使用するCSV列。
 *
 * これ以外の列は読み込んでも使用しない。
 */
export const INVENTORY_CSV_HEADERS = {
    pluCode: "ＰＬＵコード",
    productName: "商品名称",
    quantity: "理論在庫数量"
} as const;




/* =========================================================
   ヘッダー
   ========================================================= */

/**
 * CSV内の最初の空でない行を
 * ヘッダー行として使用する。
 */
export function findHeaderRowIndex(
    rows: readonly string[][]
): number {

    return rows.findIndex(
        (row) => !isEmptyRow(row)
    );
}




/**
 * 必須ヘッダーがすべて存在するか判定する。
 */
export function hasRequiredHeaders(
    headers: readonly string[]
): boolean {

    return (
        headers.includes(
            INVENTORY_CSV_HEADERS.pluCode
        ) &&
        headers.includes(
            INVENTORY_CSV_HEADERS.productName
        ) &&
        headers.includes(
            INVENTORY_CSV_HEADERS.quantity
        )
    );
}




/**
 * 不足している必須ヘッダーを返す。
 */
export function getMissingRequiredHeaders(
    headers: readonly string[]
): string[] {

    const requiredHeaders = [
        INVENTORY_CSV_HEADERS.pluCode,
        INVENTORY_CSV_HEADERS.productName,
        INVENTORY_CSV_HEADERS.quantity
    ];

    return requiredHeaders.filter(
        (header) =>
            !headers.includes(header)
    );
}




/**
 * 必須列のCSV上の位置を取得する。
 *
 * この関数を呼ぶ時点では、
 * 必須ヘッダーが存在することを前提とする。
 */
export function getRequiredColumnIndexes(
    headers: readonly string[]
): RequiredColumnIndexes {

    return {
        pluCode:
            headers.indexOf(
                INVENTORY_CSV_HEADERS.pluCode
            ),

        productName:
            headers.indexOf(
                INVENTORY_CSV_HEADERS.productName
            ),

        quantity:
            headers.indexOf(
                INVENTORY_CSV_HEADERS.quantity
            )
    };
}
