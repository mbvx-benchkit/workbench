/**
 * ビジネス文書のPDF履歴。v2では一覧用の軽量メタデータを分離する。
 * 旧v1の履歴はIndexedDBのバージョン更新トランザクション内で移行する。
 */
export type PrintHistoryEntry = {
    id: string;
    recipientName: string;
    fileName: string;
    createdAt: number;
    pdfBlob: Blob;
};

export type PrintHistoryMetadata = Omit<PrintHistoryEntry, "pdfBlob"> & {
    pdfBytes: number;
};

export type PrintHistoryCursor = { createdAt: number; id: string };
export type PrintHistoryPage = {
    entries: PrintHistoryMetadata[];
    nextCursor: PrintHistoryCursor | null;
};
export type PrintHistoryStats = { count: number; totalBytes: number };

const DATABASE_NAME = "workbench-document-print-history";
const HISTORY_STORE = "history";
const METADATA_STORE = "history-meta";
const DATE_INDEX = "createdAtId";
const DATABASE_VERSION = 3;
const STATS_STORE = "history-stats";
const STATS_KEY = "total";
const MAX_PAGE_SIZE = 100;

function metadataOf(entry: PrintHistoryEntry): PrintHistoryMetadata {
    return {
        id: entry.id,
        recipientName: entry.recipientName,
        fileName: entry.fileName,
        createdAt: entry.createdAt,
        pdfBytes: entry.pdfBlob.size
    };
}

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            const tx = request.transaction;
            if (!tx) throw new Error("履歴DBの更新を開始できませんでした。");
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
            }
            const metaMissing = !db.objectStoreNames.contains(METADATA_STORE);
            let meta: IDBObjectStore;
            if (metaMissing) {
                meta = db.createObjectStore(METADATA_STORE, { keyPath: "id" });
                meta.createIndex(DATE_INDEX, ["createdAt", "id"], { unique: true });
            } else {
                meta = tx.objectStore(METADATA_STORE);
            }
            if (!db.objectStoreNames.contains(STATS_STORE)) {
                db.createObjectStore(STATS_STORE, { keyPath: "id" });
            }
            // v1 → v3: PDFを残したまま小さなメタ情報を作成。
            // v2 → v3: メタ情報だけから合計容量を計算。
            const stats = tx.objectStore(STATS_STORE);
            let count = 0;
            let totalBytes = 0;
            const cursor = metaMissing
                ? tx.objectStore(HISTORY_STORE).openCursor()
                : meta.openCursor();
            cursor.onsuccess = () => {
                const row = cursor.result;
                if (!row) {
                    stats.put({ id: STATS_KEY, count, totalBytes });
                    return;
                }
                const info = metaMissing ? metadataOf(row.value as PrintHistoryEntry)
                    : row.value as PrintHistoryMetadata;
                if (metaMissing) meta.put(info);
                count++;
                totalBytes += info.pdfBytes;
                row.continue();
            };
        };
        let blocked = false;
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            if (blocked) db.close();
            else resolve(db);
        };
        request.onerror = () => reject(request.error ?? new Error("履歴データベースを開けませんでした。"));
        request.onblocked = () => {
            blocked = true;
            reject(new Error("古いWORKBENCHが別タブで開いています。別タブを閉じて再読み込みしてください。"));
        };
    });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("履歴の読み書きに失敗しました。"));
        transaction.onabort = () => reject(transaction.error ?? new Error("履歴の保存が中断されました。"));
    });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("履歴の取得に失敗しました。"));
    });
}

/** 件数と合計容量を同じトランザクション内で更新。 */
function updateStats(store: IDBObjectStore, countDelta: number, bytesDelta: number): void {
    const request = store.get(STATS_KEY);
    request.onsuccess = () => {
        const old = request.result as (PrintHistoryStats & { id: string }) | undefined;
        if (!old) {
            // 集計が欠損している状態で不正な値を作らない。
            store.transaction.abort();
            return;
        }
        store.put({ id: STATS_KEY, count: old.count + countDelta,
            totalBytes: old.totalBytes + bytesDelta });
    };
}

export async function addPrintHistory(recipientName: string, fileName: string, pdfBlob: Blob): Promise<void> {
    const entry: PrintHistoryEntry = {
        id: crypto.randomUUID(), recipientName, fileName, createdAt: Date.now(), pdfBlob
    };
    const db = await openDatabase();
    try {
        const tx = db.transaction([HISTORY_STORE, METADATA_STORE, STATS_STORE], "readwrite");
        const done = transactionDone(tx);
        tx.objectStore(HISTORY_STORE).add(entry);
        tx.objectStore(METADATA_STORE).add(metadataOf(entry));
        updateStats(tx.objectStore(STATS_STORE), 1, pdfBlob.size);
        await done;
    } finally {
        db.close();
    }
}

/** PDF本体を取得しない降順ページング。 */
export async function getPrintHistoryPage(
    before: PrintHistoryCursor | null = null,
    pageSize = 50
): Promise<PrintHistoryPage> {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
        throw new Error("履歴の表示件数が不正です。");
    }
    const db = await openDatabase();
    try {
        const tx = db.transaction(METADATA_STORE, "readonly");
        const done = transactionDone(tx);
        const index = tx.objectStore(METADATA_STORE).index(DATE_INDEX);
        const range = before ? IDBKeyRange.upperBound([before.createdAt, before.id], true) : null;
        const entries = await new Promise<PrintHistoryMetadata[]>((resolve, reject) => {
            const result: PrintHistoryMetadata[] = [];
            const request = index.openCursor(range, "prev");
            request.onerror = () => reject(request.error ?? new Error("履歴一覧を読み込めませんでした。"));
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor || result.length > pageSize) {
                    resolve(result);
                    return;
                }
                result.push(cursor.value as PrintHistoryMetadata);
                if (result.length > pageSize) {
                    resolve(result);
                } else {
                    cursor.continue();
                }
            };
        });
        await done;
        const hasMore = entries.length > pageSize;
        const pageEntries = entries.slice(0, pageSize);
        const last = pageEntries[pageEntries.length - 1];
        return {
            entries: pageEntries,
            nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null
        };
    } finally {
        db.close();
    }
}

/** 集計は小さなメタ情報だけを走査する。PDF本体は読み込まない。 */
/** O(1)の集計。旧データはDBアップグレード時に一度だけ集計する。 */
export async function getPrintHistoryStats(): Promise<PrintHistoryStats> {
    const db = await openDatabase();
    try {
        const tx = db.transaction(STATS_STORE, "readonly");
        const done = transactionDone(tx);
        const stored = await requestResult(
            tx.objectStore(STATS_STORE).get(STATS_KEY)
        ) as (PrintHistoryStats & { id: string }) | undefined;
        await done;
        if (!stored) throw new Error("履歴集計が見つかりません。データベースを確認してください。");
        return { count: stored.count, totalBytes: stored.totalBytes };
    } finally {
        db.close();
    }
}

export async function getPrintHistory(id: string): Promise<PrintHistoryEntry | null> {
    const db = await openDatabase();
    try {
        const tx = db.transaction(HISTORY_STORE, "readonly");
        const done = transactionDone(tx);
        const entry = await requestResult(
            tx.objectStore(HISTORY_STORE).get(id) as IDBRequest<PrintHistoryEntry | undefined>
        );
        await done;
        return entry ?? null;
    } finally {
        db.close();
    }
}

/** バックアップと食い違わないよう、PDFとメタデータを同時削除する。 */
export async function deletePrintHistory(id: string): Promise<void> {
    const db = await openDatabase();
    try {
        const tx = db.transaction([HISTORY_STORE, METADATA_STORE, STATS_STORE], "readwrite");
        const done = transactionDone(tx);
        const meta = tx.objectStore(METADATA_STORE);
        const request = meta.get(id);
        request.onsuccess = () => {
            const found = request.result as PrintHistoryMetadata | undefined;
            tx.objectStore(HISTORY_STORE).delete(id);
            meta.delete(id);
            if (found) updateStats(tx.objectStore(STATS_STORE), -1, -found.pdfBytes);
        };
        await done;
    } finally {
        db.close();
    }
}
