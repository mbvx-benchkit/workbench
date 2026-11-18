/**
 * Cross-tab WORKBENCH data coordination.
 *
 * Shared: each ordinary persistent mutation (other mutations may run together).
 * Exclusive: backup snapshot reads, restore and recovery.
 *
 * All five entrypoints compile an identical copy. Web Locks are origin scoped;
 * do not change LOCK_NAME or the generation keys in any single application.
 */
const LOCK_NAME = "workbench:data-integrity:v1";
const GENERATION_KEY = "workbench:data-generation:v1";
const RESTORE_PENDING_KEY = "workbench:restore-in-progress:v1";
const RECOVERY_DATABASE = "workbench-restore-recovery";
const RECOVERY_STORE = "snapshots";

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

// Capture at module initialization, not on the first write: a previously
// opened tab must not overwrite data restored after its UI was initialized.
function localValue(key: string): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(key);
}
let openedGeneration: string | null = null;
let openedWithPendingRestore = false;
let initialStorageError: unknown = null;
try {
    openedGeneration = localValue(GENERATION_KEY);
    openedWithPendingRestore = Boolean(localValue(RESTORE_PENDING_KEY));
} catch (error) {
    // Avoid aborting the entire application during module import. Persistent
    // operations will fail closed with a useful error instead.
    initialStorageError = error;
}

function ensureCurrentGeneration(): void {
    if (initialStorageError) {
        throw new Error("ブラウザの保存領域を確認できないため、安全な保存や復元を開始できません。ブラウザの設定を確認してください。");
    }
    if (openedWithPendingRestore || localValue(GENERATION_KEY) !== openedGeneration) {
        throw new Error("別のタブでWORKBENCHの復元が行われました。古い画面からの上書きを防ぐため、ページを再読み込みしてください。");
    }
    if (localValue(RESTORE_PENDING_KEY)) {
        throw new Error("WORKBENCHの復元または復旧が完了していません。復旧操作を確認してください。");
    }
}

function webLocks(): LockManager | null {
    if (!isBrowser) return null; // Node test harness has no real browser tabs.
    const locks = navigator.locks;
    if (!locks || typeof locks.request !== "function") {
        throw new Error("このブラウザはタブ間のデータ保護（Web Locks）に対応していません。対応ブラウザで開いてください。");
    }
    return locks;
}

/** Read the actual persistent journal, including journals created by old builds. */
function hasRecoveryJournal(): Promise<boolean> {
    if (!isBrowser) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
        const open = indexedDB.open(RECOVERY_DATABASE, 1);
        open.onupgradeneeded = () => {
            if (!open.result.objectStoreNames.contains(RECOVERY_STORE)) {
                open.result.createObjectStore(RECOVERY_STORE, { keyPath: "id" });
            }
        };
        open.onerror = () => reject(open.error ?? new Error("復旧記録を確認できません。"));
        open.onblocked = () => reject(new Error("別タブが復旧記録を使用しています。"));
        open.onsuccess = () => {
            const db = open.result;
            db.onversionchange = () => db.close();
            let done = false;
            const finish = (result: boolean, error?: Error) => {
                if (done) return;
                done = true;
                db.close();
                if (error) reject(error);
                else resolve(result);
            };
            try {
                const tx = db.transaction(RECOVERY_STORE, "readonly");
                const request = tx.objectStore(RECOVERY_STORE).get("pending");
                request.onsuccess = () => finish(Boolean(request.result));
                request.onerror = () => finish(false, request.error ?? new Error("復旧記録を確認できません。"));
                tx.onabort = () => finish(false, tx.error ?? new Error("復旧記録の確認に失敗しました。"));
            } catch (error) {
                finish(false, error instanceof Error ? error : new Error(String(error)));
            }
        };
    });
}

async function ensureSafe(): Promise<void> {
    ensureCurrentGeneration();
    if (await hasRecoveryJournal()) {
        throw new Error("復旧待ちのデータがあります。先にWORKBENCHホーム画面から元のデータを復旧してください。");
    }
    ensureCurrentGeneration();
}

/** Guard every ordinary IndexedDB/localStorage write until its commit finishes. */
export async function withWorkbenchWriteLock<T>(operation: () => Promise<T> | T): Promise<T> {
    const locks = webLocks();
    if (!locks) return operation();
    // Capture the generation before joining the queue. A write queued just
    // before a restore must not become valid because this tab restored data.
    const requestedGeneration = localValue(GENERATION_KEY);
    const requestedDuringRestore = Boolean(localValue(RESTORE_PENDING_KEY));
    return locks.request(LOCK_NAME, { mode: "shared" }, async () => {
        if (requestedDuringRestore || requestedGeneration !== localValue(GENERATION_KEY)) {
            throw new Error("別のタブでWORKBENCHの復元が行われました。古い画面からの上書きを防ぐため、ページを再読み込みしてください。");
        }
        await ensureSafe();
        return operation();
    });
}

/** Take a consistent multi-store snapshot, disallowing writes while reading. */
export async function withWorkbenchSnapshotLock<T>(operation: () => Promise<T>): Promise<T> {
    const locks = webLocks();
    if (!locks) return operation();
    const requestedGeneration = localValue(GENERATION_KEY);
    return locks.request(LOCK_NAME, { mode: "exclusive" }, async () => {
        if (requestedGeneration !== localValue(GENERATION_KEY)) {
            throw new Error("別のタブで復元が行われました。再読み込みしてからバックアップしてください。");
        }
        await ensureSafe();
        return operation();
    });
}

export type RestoreLockSession = {
    beginReplacement: () => void;
    finishReplacement: () => void;
};

/**
 * A single exclusive lock spans snapshot, journal, writes, rollback and cleanup.
 * Do NOT acquire shared locks inside the operation: restoration uses unguarded
 * internal bulk replacement APIs to avoid self-deadlock.
 */
export async function withWorkbenchRestoreLock<T>(
    operation: (session: RestoreLockSession) => Promise<T>,
    recovery = false
): Promise<T> {
    const locks = webLocks();
    if (!locks) return operation({ beginReplacement: () => {}, finishReplacement: () => {} });
    const requestedGeneration = localValue(GENERATION_KEY);
    return locks.request(LOCK_NAME, { mode: "exclusive" }, async () => {
        if (!recovery && requestedGeneration !== localValue(GENERATION_KEY)) {
            throw new Error("他のタブで復元が行われました。再読み込みしてください。");
        }
        // Recovery must remain possible even in a newly opened tab while the
        // previous operation's journal/pending marker is still present.
        if (!recovery) ensureCurrentGeneration();
        const session: RestoreLockSession = {
            beginReplacement: () => {
                const next = crypto.randomUUID();
                localStorage.setItem(RESTORE_PENDING_KEY, next);
                try {
                    localStorage.setItem(GENERATION_KEY, next);
                } catch (error) {
                    localStorage.removeItem(RESTORE_PENDING_KEY);
                    throw error;
                }
                openedGeneration = next;
            },
            finishReplacement: () => {
                localStorage.removeItem(RESTORE_PENDING_KEY);
                openedWithPendingRestore = false;
            }
        };
        return operation(session);
    });
}
