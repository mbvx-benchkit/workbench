import { requestToPromise, waitForTransaction } from "./backup-storage-utils.js";

/**
 * backup-storage.ts
 *
 * WORKBENCH内の保存領域との読み書きを担当する。
 *
 * 対象:
 *
 * DOCUMENT BUILDER
 *   IndexedDB
 *
 * RED INDEX
 *   localStorage
 *
 * PRESET DOCUMENTS
 *   IndexedDB
 *
 * GOSPLAN13 / INVENTORY BATCHは
 * バックアップ対象外。
 */

import {
    getPresetDocuments,
    getPresetBackupFootprint,
    replaceAllPresetDocuments,
    requestPersistentStorage
} from "../preset/preset-db.js";


import {
    BackupSizeBudget, MAX_ARCHIVE_ENTRY_BYTES,
    MAX_ARCHIVE_ENTRIES, MAX_ARCHIVE_EXPANDED_BYTES
} from "./backup-limits.js";

import {
    parseDocumentTemplates,
    parseRedIndexData,
    type DocumentTemplate,
    type RedIndexData,
    MAX_PRINT_HISTORY_RECORDS,
    type PrintHistoryRecord,
    type WorkbenchBackupSnapshot
} from "./backup-types.js";


/* =========================================================
   DOCUMENT BUILDER Database
   ========================================================= */

const DOCUMENT_DATABASE_NAME =
    "workbench-document-builder";


const DOCUMENT_DATABASE_VERSION =
    1;


const DOCUMENT_STORE_NAME =
    "templates";


/* =========================================================
   PDF HISTORY Database (separate from the template database)
   ========================================================= */

const PRINT_HISTORY_DATABASE_NAME = "workbench-document-print-history";
const PRINT_HISTORY_DATABASE_VERSION = 3;
const PRINT_HISTORY_STATS_STORE_NAME = "history-stats";
const PRINT_HISTORY_STATS_KEY = "total";
const PRINT_HISTORY_METADATA_STORE_NAME = "history-meta";
const PRINT_HISTORY_METADATA_INDEX_NAME = "createdAtId";
const PRINT_HISTORY_STORE_NAME = "history";


/* =========================================================
   RED INDEX
   ========================================================= */

const RED_INDEX_STORAGE_KEY =
    "workbench.red-index.v1";


/* =========================================================
   Snapshot
   ========================================================= */

/**
 * 現在のWORKBENCH保存状態を取得する。
 */
export async function readWorkbenchSnapshot():
    Promise<WorkbenchBackupSnapshot> {

    const [
        documentTemplates,
        presetDocuments,
        printHistory
    ] =
        await Promise.all(
            [
                readDocumentTemplates(),
                getPresetDocuments(),
                readPrintHistory()
            ]
        );


    const redIndex =
        readRedIndexData();


    return {

        documentTemplates,

        redIndex,

        presetDocuments,

        printHistory
    };
}


/**
 * バックアップ用の全PDFを読み出す前に容量・件数の超過を検出する。
 * PDF履歴は軽量メタデータのみ、定型印刷物は1件ずつcursorで確認する。
 * JSONやファイル名の正確な容量はcreateBackupArchiveで最終検査する。
 */
export async function estimateWorkbenchBackupFootprint(): Promise<void> {
    const [presets, history] = await Promise.all([
        getPresetBackupFootprint(),
        readPrintHistoryFootprint()
    ]);
    if (history.count > MAX_PRINT_HISTORY_RECORDS) {
        throw new Error(`PDF出力履歴は最大${MAX_PRINT_HISTORY_RECORDS.toLocaleString("ja-JP")}件までバックアップできます。`);
    }
    const budget = new BackupSizeBudget();
    // 固定のJSONエントリー5件。正確なUTF-8サイズはZIP生成前に検査する。
    for (const name of ["manifest.json", "document_builder/templates.json",
        "red_index/data.json", "preset_documents/documents.json",
        "document_builder/print-history/history.json"]) {
        budget.add(name, 0);
    }
    // 合計容量・ファイル数の予備検査（個別容量はcursor上で検証済み）。
    const pdfCount = presets.count + history.count;
    const imageCount = presets.previewCount;
    if (pdfCount + imageCount > 0) {
        // 計算をまとめて行い、PDFの実体を全件ロードしない。
        const totalCount = budget.entries + pdfCount + imageCount;
        const totalBytes = presets.totalBytes + history.totalBytes;
        if (totalCount > MAX_ARCHIVE_ENTRIES) {
            throw new Error("バックアップのファイル件数が上限を超えています。");
        }
        if (totalBytes > MAX_ARCHIVE_EXPANDED_BYTES) {
            throw new Error("バックアップの合計容量が512MiBを超えています。");
        }
    }
}

async function readPrintHistoryFootprint(): Promise<{count: number; totalBytes: number}> {
    const db = await openPrintHistoryDatabase();
    try {
        const tx = db.transaction(PRINT_HISTORY_METADATA_STORE_NAME, "readonly");
        const completion = waitForTransaction(tx);
        const result = await new Promise<{ count: number; totalBytes: number }>((resolve, reject) => {
            let count = 0;
            let totalBytes = 0;
            const req = tx.objectStore(PRINT_HISTORY_METADATA_STORE_NAME).openCursor();
            req.onerror = () => reject(req.error ?? new Error("履歴容量を読み取れません。"));
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor) { resolve({count, totalBytes}); return; }
                const record = cursor.value as { pdfBytes: number };
                if (record.pdfBytes > MAX_ARCHIVE_ENTRY_BYTES) {
                    reject(new Error("出力履歴のPDFが64MiBを超えています。"));
                    return;
                }
                count++;
                totalBytes += record.pdfBytes;
                cursor.continue();
            };
        });
        await completion;
        return result;
    } finally {
        db.close();
    }
}

/**
 * 現在の保存内容を
 * snapshotの内容へ完全置換する。
 *
 * この関数自身はrollbackを担当しない。
 * rollback制御はbackup.ts側で行う。
 */
export async function replaceWorkbenchSnapshot(
    snapshot: WorkbenchBackupSnapshot
): Promise<void> {

    await replaceDocumentTemplates(
        snapshot.documentTemplates
    );


    await replacePresetDocuments(
        snapshot.presetDocuments
    );

    await replacePrintHistory(
        snapshot.printHistory
    );

    replaceRedIndexData(
        snapshot.redIndex
    );


    /**
     * origin全体のストレージ永続化を
     * 可能なら要求する。
     *
     * falseでも復元自体は成功。
     */
    void requestPersistentStorage();
}


/* =========================================================
   DOCUMENT BUILDER
   ========================================================= */

async function readDocumentTemplates():
    Promise<DocumentTemplate[]> {

    const database =
        await openDocumentDatabase();


    try {

        const transaction =
            database.transaction(
                DOCUMENT_STORE_NAME,
                "readonly"
            );


        const completion =
            waitForTransaction(
                transaction
            );


        const store =
            transaction.objectStore(
                DOCUMENT_STORE_NAME
            );


        const request =
            store.getAll();


        const result =
            await requestToPromise<
                unknown[]
            >(
                request
            );


        await completion;


        return parseDocumentTemplates(
            result
        );

    } finally {

        database.close();
    }
}


async function replaceDocumentTemplates(
    templates: DocumentTemplate[]
): Promise<void> {

    /**
     * 念のため、
     * 書き込み前にもう一度構造検証する。
     */
    const validatedTemplates =
        parseDocumentTemplates(
            templates
        );


    const database =
        await openDocumentDatabase();


    try {

        const transaction =
            database.transaction(
                DOCUMENT_STORE_NAME,
                "readwrite"
            );


        const completion =
            waitForTransaction(
                transaction
            );


        const store =
            transaction.objectStore(
                DOCUMENT_STORE_NAME
            );


        /**
         * clearとputを同一transactionへ
         * まとめてキューする。
         *
         * 途中で失敗すれば、
         * IndexedDB transaction全体がabortされる。
         */
        try {
            store.clear();
            for (const template of validatedTemplates) {
                store.put(template);
            }
        } catch (error) {
            transaction.abort();
            void completion.catch(() => {});
            throw error;
        }
        await completion;

    } finally {

        database.close();
    }
}


/* =========================================================
   RED INDEX
   ========================================================= */

function readRedIndexData():
    RedIndexData |
    null {

    const raw =
        localStorage.getItem(
            RED_INDEX_STORAGE_KEY
        );


    if (
        raw ===
        null
    ) {

        return null;
    }


    let parsed:
        unknown;


    try {

        parsed =
            JSON.parse(
                raw
            );

    } catch {

        throw new Error(
            "保存されているRED INDEXデータがJSONとして不正です。"
        );
    }


    return parseRedIndexData(
        parsed
    );
}


function replaceRedIndexData(
    data:
        RedIndexData |
        null
): void {

    if (
        data ===
        null
    ) {

        localStorage.removeItem(
            RED_INDEX_STORAGE_KEY
        );


        return;
    }


    const validated =
        parseRedIndexData(
            data
        );


    localStorage.setItem(
        RED_INDEX_STORAGE_KEY,
        JSON.stringify(
            validated
        )
    );
}


/* =========================================================
   PRESET DOCUMENTS
   ========================================================= */

async function replacePresetDocuments(
    documents: WorkbenchBackupSnapshot["presetDocuments"]
): Promise<void> {
    await replaceAllPresetDocuments(documents);
}

/* =========================================================
   DOCUMENT BUILDER PDF History
   ========================================================= */

function openPrintHistoryDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(
            PRINT_HISTORY_DATABASE_NAME,
            PRINT_HISTORY_DATABASE_VERSION
        );
        request.onupgradeneeded = () => {
            const db = request.result;
            const upgrade = request.transaction;
            if (!upgrade) throw new Error("PDF履歴DBの更新を開始できませんでした。");
            if (!db.objectStoreNames.contains(PRINT_HISTORY_STORE_NAME)) {
                db.createObjectStore(PRINT_HISTORY_STORE_NAME, { keyPath: "id" });
            }
            const metaMissing = !db.objectStoreNames.contains(PRINT_HISTORY_METADATA_STORE_NAME);
            let meta: IDBObjectStore;
            if (metaMissing) {
                meta = db.createObjectStore(PRINT_HISTORY_METADATA_STORE_NAME, { keyPath: "id" });
                meta.createIndex(PRINT_HISTORY_METADATA_INDEX_NAME, ["createdAt", "id"], { unique: true });
            } else {
                meta = upgrade.objectStore(PRINT_HISTORY_METADATA_STORE_NAME);
            }
            if (!db.objectStoreNames.contains(PRINT_HISTORY_STATS_STORE_NAME)) {
                db.createObjectStore(PRINT_HISTORY_STATS_STORE_NAME, { keyPath: "id" });
            }
            const stats = upgrade.objectStore(PRINT_HISTORY_STATS_STORE_NAME);
            let count = 0;
            let totalBytes = 0;
            const cursor = metaMissing ? upgrade.objectStore(PRINT_HISTORY_STORE_NAME).openCursor()
                : meta.openCursor();
            cursor.onsuccess = () => {
                const row = cursor.result;
                if (!row) {
                    stats.put({ id: PRINT_HISTORY_STATS_KEY, count, totalBytes });
                    return;
                }
                const record = row.value as PrintHistoryRecord & { pdfBytes?: number };
                const info = metaMissing
                    ? { id: record.id, recipientName: record.recipientName, fileName: record.fileName,
                        createdAt: record.createdAt, pdfBytes: record.pdfBlob.size }
                    : row.value as { pdfBytes: number };
                if (metaMissing) meta.put(info);
                count++;
                totalBytes += info.pdfBytes;
                row.continue();
            };
        };
        let blocked = false;
        request.onsuccess = () => {
            request.result.onversionchange = () => request.result.close();
            if (blocked) request.result.close();
            else resolve(request.result);
        };
        request.onerror = () => reject(request.error ?? new Error("PDF履歴データベースを開けませんでした。"));
        request.onblocked = () => {
            blocked = true;
            reject(new Error("古いWORKBENCHが別タブで開いています。別タブを閉じて再読み込みしてください。"));
        };
    });
}

async function readPrintHistory(): Promise<PrintHistoryRecord[]> {
    const db = await openPrintHistoryDatabase();
    try {
        const transaction = db.transaction(PRINT_HISTORY_STORE_NAME, "readonly");
        const completion = waitForTransaction(transaction);
        const entries = await requestToPromise<PrintHistoryRecord[]>(
            transaction.objectStore(PRINT_HISTORY_STORE_NAME).getAll()
        );
        await completion;
        return entries;
    } finally {
        db.close();
    }
}

async function replacePrintHistory(entries: PrintHistoryRecord[]): Promise<void> {
    const db = await openPrintHistoryDatabase();
    try {
        // 履歴の全件置換は単一トランザクション。途中失敗時は自動abort。
        const transaction = db.transaction(
            [PRINT_HISTORY_STORE_NAME, PRINT_HISTORY_METADATA_STORE_NAME, PRINT_HISTORY_STATS_STORE_NAME], "readwrite"
        );
        const completion = waitForTransaction(transaction);
        const store = transaction.objectStore(PRINT_HISTORY_STORE_NAME);
        const metadataStore = transaction.objectStore(PRINT_HISTORY_METADATA_STORE_NAME);
        try {
            store.clear();
            metadataStore.clear();
            for (const entry of entries) {
                store.put(entry);
                metadataStore.put({ id: entry.id, recipientName: entry.recipientName,
                    fileName: entry.fileName, createdAt: entry.createdAt,
                    pdfBytes: entry.pdfBlob.size });
            }
            transaction.objectStore(PRINT_HISTORY_STATS_STORE_NAME).put({
                id: PRINT_HISTORY_STATS_KEY,
                count: entries.length,
                totalBytes: entries.reduce((sum, entry) => sum + entry.pdfBlob.size, 0)
            });
        } catch (error) {
            transaction.abort();
            void completion.catch(() => {});
            throw error;
        }
        await completion;
    } finally {
        db.close();
    }
}


/* =========================================================
   DOCUMENT BUILDER Database Open
   ========================================================= */

function openDocumentDatabase():
    Promise<IDBDatabase> {

    return new Promise<IDBDatabase>(
        (
            resolve,
            reject
        ) => {

            const request =
                indexedDB.open(
                    DOCUMENT_DATABASE_NAME,
                    DOCUMENT_DATABASE_VERSION
                );


            request.onupgradeneeded =
                () => {

                    const database =
                        request.result;


                    if (
                        database
                            .objectStoreNames
                            .contains(
                                DOCUMENT_STORE_NAME
                            )
                    ) {

                        return;
                    }


                    database
                        .createObjectStore(
                            DOCUMENT_STORE_NAME,
                            {
                                keyPath:
                                    "id"
                            }
                        );
                };


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
                            "DOCUMENT BUILDERのデータベースを開けませんでした。"
                        )
                    );
                };


            request.onblocked =
                () => {

                    console.warn(
                        "DOCUMENT BUILDERのデータベース処理がブロックされています。"
                    );
                };
        }
    );
}