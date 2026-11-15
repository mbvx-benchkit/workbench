import { isEmptyRow } from "./csv-internals.js";
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
};
/* =========================================================
   ヘッダー
   ========================================================= */
/**
 * CSV内の最初の空でない行を
 * ヘッダー行として使用する。
 */
export function findHeaderRowIndex(rows) {
    return rows.findIndex((row) => !isEmptyRow(row));
}
/**
 * 必須ヘッダーがすべて存在するか判定する。
 */
export function hasRequiredHeaders(headers) {
    return (headers.includes(INVENTORY_CSV_HEADERS.pluCode) &&
        headers.includes(INVENTORY_CSV_HEADERS.productName) &&
        headers.includes(INVENTORY_CSV_HEADERS.quantity));
}
/**
 * 不足している必須ヘッダーを返す。
 */
export function getMissingRequiredHeaders(headers) {
    const requiredHeaders = [
        INVENTORY_CSV_HEADERS.pluCode,
        INVENTORY_CSV_HEADERS.productName,
        INVENTORY_CSV_HEADERS.quantity
    ];
    return requiredHeaders.filter((header) => !headers.includes(header));
}
/**
 * 必須列のCSV上の位置を取得する。
 *
 * この関数を呼ぶ時点では、
 * 必須ヘッダーが存在することを前提とする。
 */
export function getRequiredColumnIndexes(headers) {
    return {
        pluCode: headers.indexOf(INVENTORY_CSV_HEADERS.pluCode),
        productName: headers.indexOf(INVENTORY_CSV_HEADERS.productName),
        quantity: headers.indexOf(INVENTORY_CSV_HEADERS.quantity)
    };
}
//# sourceMappingURL=headers.js.map