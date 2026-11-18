import { withWorkbenchWriteLock } from "./workbench-data-lock.js";
import { requestPersistentStorage, requestToPromise, waitForTransaction } from "./templates/template-db-utils.js";
export { requestPersistentStorage } from "./templates/template-db-utils.js";

import {
    DocumentTemplate
} from "./template.js";


/* =========================================================
   Database
   ========================================================= */

const DATABASE_NAME =
    "workbench-document-builder";


const DATABASE_VERSION =
    1;


const STORE_NAME =
    "templates";


let databasePromise:
    Promise<IDBDatabase> |
    null =
    null;


/* =========================================================
   Public API
   ========================================================= */

/**
 * 登録済みテンプレートを
 * 全件取得する。
 */
export async function getTemplates():
    Promise<DocumentTemplate[]> {

    const database =
        await openTemplateDatabase();


    const transaction =
        database.transaction(
            STORE_NAME,
            "readonly"
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    const request =
        store.getAll();


    const templates =
        await requestToPromise<
            DocumentTemplate[]
        >(
            request
        );


    await waitForTransaction(
        transaction
    );


    return sortTemplates(
        templates
    );
}


/**
 * ID指定で1件取得する。
 */
export async function getTemplate(
    id: string
): Promise<DocumentTemplate | null> {

    const database =
        await openTemplateDatabase();


    const transaction =
        database.transaction(
            STORE_NAME,
            "readonly"
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    const request =
        store.get(
            id
        );


    const template =
        await requestToPromise<
            DocumentTemplate |
            undefined
        >(
            request
        );


    await waitForTransaction(
        transaction
    );


    return (
        template ??
        null
    );
}


/** New templates must use add(), not read-then-put(), to prevent cross-tab overwrites. */
export async function addTemplate(template: DocumentTemplate): Promise<void> {
    return withWorkbenchWriteLock(async () => {
        const db = await openTemplateDatabase();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const completion = waitForTransaction(tx);
        try {
            await requestToPromise(tx.objectStore(STORE_NAME).add(template));
            await completion;
        } catch (error) {
            // A failed request aborts the transaction. Observe that rejection
            // before converting the error to avoid an unhandled promise.
            await completion.catch(() => {});
            if (error instanceof Error && (error.name === "ConstraintError" || error.message.includes("ConstraintError"))) {
                throw new Error("同じIDのテンプレートがすでに登録されています。既存の設定は上書きされません。");
            }
            throw error;
        }
    });
}

/**
 * テンプレートを追加 / 更新する。
 *
 * 同じidなら洗い替え。
 */
export async function putTemplate(
    template: DocumentTemplate
): Promise<void> {
    return withWorkbenchWriteLock(async () => {

    const database =
        await openTemplateDatabase();


    const transaction =
        database.transaction(
            STORE_NAME,
            "readwrite"
        );


    const completion =
        waitForTransaction(
            transaction
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    const request =
        store.put(
            template
        );


    await requestToPromise(
        request
    );


    await completion;

    });
}


/**
 * テンプレート削除。
 */
export async function deleteTemplate(
    id: string
): Promise<void> {
    return withWorkbenchWriteLock(async () => {

    const database =
        await openTemplateDatabase();


    const transaction =
        database.transaction(
            STORE_NAME,
            "readwrite"
        );


    const completion =
        waitForTransaction(
            transaction
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    const request =
        store.delete(
            id
        );


    await requestToPromise(
        request
    );


    await completion;

    });
}


/* =========================================================
   Sort
   ========================================================= */

function sortTemplates(
    templates: DocumentTemplate[]
): DocumentTemplate[] {

    const collator =
        new Intl.Collator(
            "ja",
            {
                usage: "sort",
                sensitivity: "base",
                numeric: true
            }
        );


    return [
        ...templates
    ].sort(
        (
            left,
            right
        ) => {

            const byName =
                collator.compare(
                    left.name,
                    right.name
                );


            if (
                byName !==
                0
            ) {

                return byName;
            }


            return collator.compare(
                left.id,
                right.id
            );
        }
    );
}


/* =========================================================
   Open database
   ========================================================= */

function openTemplateDatabase():
    Promise<IDBDatabase> {

    if (
        databasePromise
    ) {

        return databasePromise;
    }


    databasePromise =
        new Promise<IDBDatabase>(
            (
                resolve,
                reject
            ) => {

                const request =
                    indexedDB.open(
                        DATABASE_NAME,
                        DATABASE_VERSION
                    );


                request.onupgradeneeded =
                    () => {

                        const database =
                            request.result;


                        if (
                            database
                                .objectStoreNames
                                .contains(
                                    STORE_NAME
                                )
                        ) {

                            return;
                        }


                        database
                            .createObjectStore(
                                STORE_NAME,
                                {
                                    keyPath:
                                        "id"
                                }
                            );
                    };


                request.onsuccess =
                    () => {

                        const database =
                            request.result;


                        database.onversionchange =
                            () => {

                                database.close();

                                databasePromise =
                                    null;
                            };


                        resolve(
                            database
                        );
                    };


                request.onerror =
                    () => {

                        databasePromise =
                            null;


                        reject(
                            request.error ??
                            new Error(
                                "テンプレートデータベースを開けませんでした。"
                            )
                        );
                    };


                request.onblocked =
                    () => {

                        console.warn(
                            "テンプレートデータベースの更新がブロックされています。"
                        );
                    };
            }
        );


    return databasePromise;
}