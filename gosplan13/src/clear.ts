import type { ClearElements } from "./clear-utils.js";
export type { ClearElements } from "./clear-utils.js";
import { notifyInputChanged, clearProductImage } from "./clear-utils.js";
import { getProductLabels } from "./clear-utils.js";

/**
 * clear.ts
 *
 * GOSPLAN13の入力内容をすべて初期化する。
 *
 * クリア対象:
 * - 全48面の商品名
 * - 全48面のJANコード
 * - 全48面の商品画像
 * - JANから生成されたバーコード表示
 * - localStorageの自動保存データ
 *
 * クリアしないもの:
 * - 画像あり / 画像なしモード
 *
 * 実行前に確認ダイアログを表示する。
 */


/* =========================================================
   定数
   ========================================================= */

const CLEAR_CONFIRM_MESSAGE =
    "入力内容をすべて削除します。\n"
    + "画像と自動保存された内容も削除されます。\n\n"
    + "よろしいですか？";


/* =========================================================
   商品名クリア
   ========================================================= */

function clearProductName(
    label: HTMLElement,
): void {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__name-input",
        );

    if (!input) {
        throw new Error(
            "商品名入力欄が見つかりません。",
        );
    }

    input.value = "";

    notifyInputChanged(input);
}


/* =========================================================
   JANクリア
   ========================================================= */

function clearJan(
    label: HTMLElement,
): void {
    const input =
        label.querySelector<HTMLInputElement>(
            ".product-label__jan-input",
        );

    if (!input) {
        throw new Error(
            "JAN入力欄が見つかりません。",
        );
    }

    input.value = "";

    /*
     * 既存のJAN処理へ空文字を通知することで、
     * バーコード表示やエラー表示も
     * 初期状態へ戻す。
     */
    notifyInputChanged(input);
}


/* =========================================================
   1面クリア
   ========================================================= */

function clearLabel(
    label: HTMLElement,
): void {
    clearProductName(label);

    clearJan(label);

    clearProductImage(label);
}


/* =========================================================
   全入力内容クリア
   ========================================================= */

/**
 * 画面上の全ラベルを初期状態へ戻す。
 *
 * 画像ありモードの場合でも、
 * CSSで非表示になっている25〜48面を含めて
 * DOM上の全ラベルをクリアする。
 */
export function clearAllLabels(
    preview: HTMLElement,
): void {
    const labels =
        getProductLabels(preview);

    if (labels.length === 0) {
        throw new Error(
            "クリア対象のラベルが見つかりません。",
        );
    }

    for (const label of labels) {
        clearLabel(label);
    }
}


/* =========================================================
   初期化
   ========================================================= */

/**
 * 「すべてクリア」ボタンへ処理を登録する。
 *
 * main.tsから1回だけ呼び出す。
 */
export function initializeClear(
    elements: ClearElements,
): void {
    const {
        preview,
        clearButton,
        clearStoredData,
    } = elements;

    clearButton.addEventListener(
        "click",
        async () => {
            const confirmed =
                window.confirm(
                    CLEAR_CONFIRM_MESSAGE,
                );

            if (!confirmed) {
                return;
            }

            let screenCleared = false;
            try {
                /*
                 * 先に画面を空にする。
                 *
                 * JANのイベントなどによって
                 * storage.ts側では一時的に
                 * 自動保存が予約される可能性がある。
                 */
                clearAllLabels(
                    preview,
                );
                screenCleared = true;

                /*
                 * 最後にstorage.tsへ保存削除を依頼する。
                 *
                 * storageController.clearStorage()は
                 * localStorageだけでなく
                 * 予約されている自動保存タイマーも
                 * cancelするため、
                 *
                 * 「消した800ms後に空データが
                 *  また自動保存される」
                 *
                 * という動作も防げる。
                 */
                await clearStoredData();
            } catch (error) {
                console.error(
                    "入力内容のクリアに失敗しました。",
                    error,
                );

                window.alert(screenCleared
                    ? "画面の入力はクリアしましたが、自動保存データを削除できませんでした。再読み込みすると以前の内容が戻る可能性があります。"
                    : "入力内容を削除できませんでした。");
            }
        },
    );
}