/**
 * WORKBENCH: backup storage helpers.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   IndexedDB Utilities
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
//# sourceMappingURL=backup-storage-utils.js.map