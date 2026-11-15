/**
 * WORKBENCH: preset database helpers.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/**
 * ブラウザに対し、
 * ストレージを可能なら永続化するよう要求する。
 *
 * falseでも保存機能そのものは使用できる。
 */
export async function requestPersistentStorage() {
    if (!navigator.storage ||
        typeof navigator.storage.persist !==
            "function") {
        return false;
    }
    try {
        return await navigator.storage.persist();
    }
    catch {
        return false;
    }
}
/* =========================================================
   IndexedDB Utility
   ========================================================= */
export function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess =
            () => {
                resolve(request.result);
            };
        request.onerror =
            () => {
                reject(request.error ??
                    new Error("IndexedDBの処理に失敗しました。"));
            };
    });
}
export function waitForTransaction(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete =
            () => {
                resolve();
            };
        transaction.onerror =
            () => {
                reject(transaction.error ??
                    new Error("IndexedDBトランザクションに失敗しました。"));
            };
        transaction.onabort =
            () => {
                reject(transaction.error ??
                    new Error("IndexedDBトランザクションが中断されました。"));
            };
    });
}
//# sourceMappingURL=preset-db-utils.js.map