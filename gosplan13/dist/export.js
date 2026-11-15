import { getProductLabels, getLabelJan, getLabelImage } from "./export-utils.js";
import { getLabelName } from "./export-utils.js";
import { downloadJson } from "./export-utils.js";
/**
 * export.ts
 *
 * GOSPLAN13の入力内容をJSONファイルとして出力する。
 *
 * 保存するもの:
 * - データ形式のバージョン
 * - 出力日時
 * - 画像あり / 画像なしモード
 * - 全ラベルの商品名
 * - 全ラベルのJANコード
 * - 全ラベルの商品画像（Base64 Data URL）
 *
 * 空欄のラベルも削除せず保存する。
 * labels配列の位置 = 画面上のラベル位置として扱う。
 *
 * 将来的には、このデータ構造をそのまま
 * ImportやlocalStorageでも利用する想定。
 */
/* =========================================================
   定数
   ========================================================= */
const EXPORT_VERSION = 1;
const EXPORT_FILE_PREFIX = "gosplan13";
/* =========================================================
   1面分のデータ生成
   ========================================================= */
function createLabelData(label) {
    return {
        name: getLabelName(label),
        jan: getLabelJan(label),
        image: getLabelImage(label),
    };
}
/* =========================================================
   現在状態を保存データへ変換
   ========================================================= */
/**
 * 現在のGOSPLAN13の状態を、
 * JSON化可能なオブジェクトへ変換する。
 *
 * この関数はファイル出力を行わない。
 *
 * 将来的にlocalStorageへ保存するときも
 * この関数をそのまま利用できる。
 */
export function createExportData(preview, imageModeToggle) {
    const labels = getProductLabels(preview);
    if (labels.length === 0) {
        throw new Error("保存対象のラベルが見つかりません。");
    }
    return {
        app: "GOSPLAN13",
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        settings: {
            imageMode: imageModeToggle.checked,
        },
        /*
         * 空欄を含めて全件保存する。
         *
         * filter()などで空欄を削除してはいけない。
         * 配列位置がそのままラベル位置になる。
         */
        labels: labels.map(createLabelData),
    };
}
/* =========================================================
   ファイル名生成
   ========================================================= */
/**
 * 例:
 * gosplan13_20260808_090501.json
 */
function createExportFileName(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return (`${EXPORT_FILE_PREFIX}_`
        + `${year}${month}${day}_`
        + `${hours}${minutes}${seconds}`
        + ".json");
}
/* =========================================================
   JSON生成
   ========================================================= */
/**
 * 保存データを読みやすいJSON文字列へ変換する。
 *
 * 2スペースインデントを使用する。
 */
export function stringifyExportData(data) {
    return JSON.stringify(data, null, 2);
}
/* =========================================================
   Export実行
   ========================================================= */
/**
 * 現在の入力状態を取得し、
 * JSONファイルとしてダウンロードする。
 */
export function exportToJson(preview, imageModeToggle) {
    const data = createExportData(preview, imageModeToggle);
    const json = stringifyExportData(data);
    const fileName = createExportFileName();
    downloadJson(json, fileName);
}
/* =========================================================
   初期化
   ========================================================= */
/**
 * JSON出力ボタンへExport処理を登録する。
 *
 * main.tsから1回だけ呼び出す。
 */
export function initializeExport(elements) {
    const { preview, imageModeToggle, exportButton, } = elements;
    exportButton.addEventListener("click", () => {
        try {
            exportToJson(preview, imageModeToggle);
        }
        catch (error) {
            console.error("JSONの出力に失敗しました。", error);
        }
    });
}
//# sourceMappingURL=export.js.map