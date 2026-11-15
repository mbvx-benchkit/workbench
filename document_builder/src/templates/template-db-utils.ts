/**
 * DOCUMENT BUILDER: template database helpers.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/**
 * ブラウザ側に対して、
 * 可能ならストレージの永続化を要求する。
 */
export async function requestPersistentStorage():
    Promise<boolean> {

    if (
        !navigator.storage ||

        typeof navigator
            .storage
            .persist !==
        "function"
    ) {

        return false;
    }


    try {

        return await navigator
            .storage
            .persist();

    } catch {

        return false;
    }
}

/* =========================================================
   IndexedDB utilities
   ========================================================= */

export function requestToPromise<T>(
    request: IDBRequest<T>
): Promise<T> {

    return new Promise<T>(
        (
            resolve,
            reject
        ) => {

            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );
                };


            request.onerror =
                () => {

                    reject(
                        request.error ??
                        new Error(
                            "IndexedDBの処理に失敗しました。"
                        )
                    );
                };
        }
    );
}

export function waitForTransaction(
    transaction: IDBTransaction
): Promise<void> {

    return new Promise<void>(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => {

                    resolve();
                };


            transaction.onerror =
                () => {

                    reject(
                        transaction.error ??
                        new Error(
                            "IndexedDBトランザクションに失敗しました。"
                        )
                    );
                };


            transaction.onabort =
                () => {

                    reject(
                        transaction.error ??
                        new Error(
                            "IndexedDBトランザクションが中断されました。"
                        )
                    );
                };
        }
    );
}
