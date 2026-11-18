import { withWorkbenchWriteLock } from "../workbench-data-lock.js";
import { requestToPromise, waitForTransaction } from "./preset-db-utils.js";
export { requestPersistentStorage } from "./preset-db-utils.js";
/**
 * preset-db.ts
 *
 * 定型印刷物のIndexedDBアクセスを管理する。
 *
 * PDF / プレビュー画像は
 * Base64化せずBlobのまま保存する。
 */
import { MAX_ARCHIVE_ENTRY_BYTES, MAX_ARCHIVE_IMAGE_BYTES } from "../backup/backup-limits.js";
import { sortPresetDocuments } from "./preset.js";
/* =========================================================
   Database
   ========================================================= */
const DATABASE_NAME = "workbench-preset-documents";
const DATABASE_VERSION = 1;
const STORE_NAME = "documents";
const SORT_ORDER_INDEX = "sortOrder";
let databasePromise = null;
/* =========================================================
   Public API
   ========================================================= */
/**
 * 登録済み定型印刷物を全件取得する。
 */
export async function getPresetDocuments() {
    const database = await openPresetDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    const documents = await requestToPromise(request);
    await waitForTransaction(transaction);
    return sortPresetDocuments(documents);
}
/**
 * ID指定で1件取得する。
 */
export async function getPresetDocument(id) {
    const database = await openPresetDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    const document = await requestToPromise(request);
    await waitForTransaction(transaction);
    return (document ??
        null);
}
/**
 * 新規追加 / 更新。
 *
 * idが同じ場合は洗い替える。
 */
export async function putPresetDocument(document) {
    return withWorkbenchWriteLock(async () => {
        const database = await openPresetDatabase();
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const completion = waitForTransaction(transaction);
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(document);
        await requestToPromise(request);
        await completion;
    });
}
/**
 * 定型印刷物を削除する。
 */
export async function deletePresetDocument(id) {
    return withWorkbenchWriteLock(async () => {
        const database = await openPresetDatabase();
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const completion = waitForTransaction(transaction);
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        await requestToPromise(request);
        await completion;
    });
}
/**
 * バックアップ復元用：全件置換を一つのIndexedDBトランザクションで行う。
 * 個別delete/putをawaitする方式では途中まで確定してしまうため、
 * clearとputを同一トランザクションへ登録する。
 */
export async function replaceAllPresetDocuments(documents) {
    const database = await openPresetDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const completion = waitForTransaction(transaction);
    const store = transaction.objectStore(STORE_NAME);
    try {
        store.clear();
        for (const document of documents) {
            store.put(document);
        }
    }
    catch (error) {
        // リクエスト登録中の同期エラーでもclearだけがcommitされないよう中断。
        transaction.abort();
        void completion.catch(() => { });
        throw error;
    }
    await completion;
}
/**
 * バックアップ作成前の容量見積もり。
 * カーソルで一件ずつBlob.sizeを調べ、getAllで全PDFをメモリへ載せない。
 */
export async function getPresetBackupFootprint() {
    const database = await openPresetDatabase();
    const tx = database.transaction(STORE_NAME, "readonly");
    const done = waitForTransaction(tx);
    const result = await new Promise((resolve, reject) => {
        let count = 0;
        let previewCount = 0;
        let totalBytes = 0;
        const request = tx.objectStore(STORE_NAME).openCursor();
        request.onerror = () => reject(request.error ?? new Error("印刷物の容量を確認できませんでした。"));
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) {
                resolve({ count, previewCount, totalBytes });
                return;
            }
            const doc = cursor.value;
            count++;
            if (doc.pdfBlob.size > MAX_ARCHIVE_ENTRY_BYTES) {
                reject(new Error("バックアップ対象の定型印刷物PDFが64MiBを超えています。"));
                return;
            }
            totalBytes += doc.pdfBlob.size;
            if (doc.previewBlob) {
                if (doc.previewBlob.size > MAX_ARCHIVE_IMAGE_BYTES) {
                    reject(new Error("バックアップ対象のプレビュー画像が32MiBを超えています。"));
                    return;
                }
                previewCount++;
                totalBytes += doc.previewBlob.size;
            }
            cursor.continue();
        };
    });
    await done;
    return result;
}
/**
 * 新規追加時のsortOrderを生成する。
 *
 * 現段階では追加された順番。
 */
export async function getNextPresetSortOrder() {
    const documents = await getPresetDocuments();
    if (documents.length === 0) {
        return 0;
    }
    const maximumSortOrder = documents.reduce((maximum, document) => {
        return Math.max(maximum, document.sortOrder);
    }, -1);
    return (maximumSortOrder +
        1);
}
/* =========================================================
   Open Database
   ========================================================= */
function openPresetDatabase() {
    if (databasePromise) {
        return databasePromise;
    }
    databasePromise =
        new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            request.onupgradeneeded =
                () => {
                    const database = request.result;
                    if (database
                        .objectStoreNames
                        .contains(STORE_NAME)) {
                        return;
                    }
                    const store = database
                        .createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                    store.createIndex(SORT_ORDER_INDEX, "sortOrder", {
                        unique: false
                    });
                };
            request.onsuccess =
                () => {
                    const database = request.result;
                    /**
                     * 別タブ等でDBバージョンが更新された場合は
                     * 古い接続を閉じる。
                     */
                    database.onversionchange =
                        () => {
                            database.close();
                            databasePromise =
                                null;
                        };
                    resolve(database);
                };
            request.onerror =
                () => {
                    databasePromise =
                        null;
                    reject(request.error ??
                        new Error("IndexedDBを開けませんでした。"));
                };
            request.onblocked =
                () => {
                    console.warn("定型印刷物データベースの更新がブロックされています。");
                };
        });
    return databasePromise;
}
//# sourceMappingURL=preset-db.js.map