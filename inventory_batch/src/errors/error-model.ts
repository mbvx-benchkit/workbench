/* CSV and barcode errors -> display model, independent from UI rendering. */
import type { DisplayError } from "../ui/inventory-ui-utils.js";
import { padTwoDigits, setCountValue, requireElement, requireElements } from "../ui/inventory-ui-utils.js";
import {
    InventoryCsvError,
    parseInventoryCsv
} from "../csv.js";
import type {
    CsvImportResult,
    CsvRowError
} from "../csv.js";
import {
    createInventoryOutput
} from "../inventory.js";
import type {
    InventoryItem,
    InventoryOutputOptions,
    InventorySortOrder
} from "../inventory.js";
import {
    clearInventoryPreview,
    renderInventoryPreview
} from "../render.js";
import type {
    InventoryRenderError
} from "../render.js";





/* =========================================================
   CSVエラー絞り込み
   ========================================================= */

/**
 * 現在の出力対象になっている行だけ
 * CSVエラーを残す。
 */
export function filterCsvErrorsByOutputItems(
    errors: readonly CsvRowError[],
    outputItems:
        readonly InventoryItem[]
): CsvRowError[] {

    const outputRowNumbers =
        new Set(
            outputItems.map(
                (item) =>
                    item.rowNumber
            )
        );


    return errors.filter(
        (error) =>
            outputRowNumbers.has(
                error.rowNumber
            )
    );
}




/* =========================================================
   エラー統合
   ========================================================= */

/**
 * CSV由来エラーとバーコード由来エラーを
 * 画面表示用形式へ統合する。
 */
export function createDisplayErrors(
    csvErrors:
        readonly CsvRowError[],
    renderErrors:
        readonly InventoryRenderError[]
): DisplayError[] {

    const errors:
        DisplayError[] =
        [];


    for (
        const error
        of csvErrors
    ) {

        errors.push({

            rowNumber:
                error.rowNumber,

            message:
                error.message
        });
    }


    for (
        const error
        of renderErrors
    ) {

        errors.push({

            rowNumber:
                error.rowNumber,

            message:
                error.message
        });
    }


    /**
     * エラー一覧自体は
     * CSV元行番号順。
     */
    errors.sort(
        (
            first,
            second
        ) =>
            (
                first.rowNumber ??
                0
            ) -
            (
                second.rowNumber ??
                0
            )
    );


    return errors;
}

export type { DisplayError as DisplayError } from "../ui/inventory-ui-utils.js";
