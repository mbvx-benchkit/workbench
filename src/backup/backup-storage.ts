import { readOpaqueHistorySnapshot, replaceOpaqueHistorySnapshot, sealLegacyHistorySnapshot, getSealedHistoryStats, isSealed } from "../../shared/print-history-vault.js";
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
        printHistorySnapshot
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

        printHistory: printHistorySnapshot.entries,
        historyVaultConfig: printHistorySnapshot.config
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

async function readPrintHistoryFootprint(): Promise<{count:number;totalBytes:number}> {
    return getSealedHistoryStats();
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
        snapshot.printHistory, snapshot.historyVaultConfig
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

async function readPrintHistory() {
    return readOpaqueHistorySnapshot();
}

async function replacePrintHistory(entries: WorkbenchBackupSnapshot["printHistory"], vaultConfig: WorkbenchBackupSnapshot["historyVaultConfig"]): Promise<void> {
    if (entries.every(entry => isSealed(entry))) {
        await replaceOpaqueHistorySnapshot({config: vaultConfig ?? null, entries: entries as import("../../shared/print-history-vault.js").SealedHistory[]});
        return;
    }
    if (entries.some(entry => isSealed(entry))) throw new Error("暗号化形式と旧形式のPDF履歴が混在しています。");
    const sealed = await sealLegacyHistorySnapshot(entries as import("../../shared/print-history-vault.js").PlainHistory[]);
    await replaceOpaqueHistorySnapshot(sealed);
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