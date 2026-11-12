import type { WorkbenchBackupSnapshot } from "./backup-types.js";

/**
 * ブラウザ強制終了などに備える復元前の永続的な退避場所。
 * 異なるIndexedDB/LocalStorage間で原子的に書き換えることはできないため、
 * 書き込み開始前に元データのコピーを必ずコミットする。
 */
const DATABASE_NAME = "workbench-restore-recovery";
const STORE_NAME = "snapshots";
const KEY = "pending";

export type RecoveryRecord = {
    id: string;
    createdAt: number;
    snapshot: WorkbenchBackupSnapshot;
};

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onerror = () => reject(request.error ?? new Error("復旧データベースを開けません。"));
        request.onblocked = () => reject(new Error("別タブが復旧データベースを使用しています。"));
    });
}

function done(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("復旧データの保存に失敗しました。"));
        tx.onabort = () => reject(tx.error ?? new Error("復旧データの保存が中断されました。"));
    });
}

export async function readPendingRecovery(): Promise<RecoveryRecord | null> {
    const db = await openDatabase();
    try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const completion = done(tx);
        const request = tx.objectStore(STORE_NAME).get(KEY);
        const result = await new Promise<RecoveryRecord | undefined>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result as RecoveryRecord | undefined);
            request.onerror = () => reject(request.error ?? new Error("復旧データを読み取れません。"));
        });
        await completion;
        return result ?? null;
    } finally {
        db.close();
    }
}

export async function savePendingRecovery(snapshot: WorkbenchBackupSnapshot): Promise<void> {
    const db = await openDatabase();
    try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const completion = done(tx);
        // 既存の復旧データを上書きせず、必ずaddで衝突を検出する。
        tx.objectStore(STORE_NAME).add({ id: KEY, createdAt: Date.now(), snapshot });
        await completion;
    } finally {
        db.close();
    }
}

export async function clearPendingRecovery(): Promise<void> {
    const db = await openDatabase();
    try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const completion = done(tx);
        tx.objectStore(STORE_NAME).delete(KEY);
        await completion;
    } finally {
        db.close();
    }
}
