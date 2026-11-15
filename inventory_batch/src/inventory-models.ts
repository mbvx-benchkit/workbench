/**
 * INVENTORY BATCH: inventory item and option types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Inventory Item
   ========================================================= */

/**
 * CSVから読み取った棚卸商品。
 *
 * PLUコードは先頭0を保持するため
 * numberではなくstringで管理する。
 */
export type InventoryItem = {
    rowNumber: number;
    pluCode: string;
    productName: string;
    quantity: number;
};

/* =========================================================
   Filter
   ========================================================= */

/**
 * 数量による出力フィルタ。
 */
export type InventoryFilterOptions = {
    skipNegativeQuantity: boolean;
    skipZeroQuantity: boolean;
};

/* =========================================================
   Sort
   ========================================================= */

/**
 * 出力時の並び順。
 *
 * csv:
 *   CSVの元順序を維持。
 *
 * quantity-asc:
 *   数量が少ない順。
 *
 * quantity-desc:
 *   数量が多い順。
 *
 * jan:
 *   PLU / JANコード順。
 *
 * product-name:
 *   日本語比較による商品名順。
 */
export type InventorySortOrder =
    | "csv"
    | "quantity-asc"
    | "quantity-desc"
    | "jan"
    | "product-name";

/* =========================================================
   Output Options
   ========================================================= */

/**
 * 最終出力を生成するための設定。
 */
export type InventoryOutputOptions =
    InventoryFilterOptions & {
        sortOrder: InventorySortOrder;
    };

/* =========================================================
   Output
   ========================================================= */

/**
 * 最終的な棚卸出力。
 */
export type InventoryOutput = {
    items: InventoryItem[];
    pages: InventoryItem[][];
};
