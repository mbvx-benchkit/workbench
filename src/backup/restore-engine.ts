import type { ImportedWorkbenchBackupSnapshot, WorkbenchBackupSnapshot } from "./backup-types.js";
import { createRestoredSnapshot } from "./restore-policy.js";
import { readWorkbenchSnapshot, replaceWorkbenchSnapshot } from "./backup-storage.js";
import { readPendingRecovery, savePendingRecovery, clearPendingRecovery } from "./restore-recovery.js";

/** 外部効果を注入できるようにして復元失敗・ロールバック失敗を自動テストする。 */
export type RestoreDependencies = {
    read: () => Promise<WorkbenchBackupSnapshot>;
    replace: (snapshot: WorkbenchBackupSnapshot) => Promise<void>;
    getRecovery: () => ReturnType<typeof readPendingRecovery>;
    saveRecovery: (snapshot: WorkbenchBackupSnapshot) => Promise<void>;
    clearRecovery: () => Promise<void>;
};

export const defaultRestoreDependencies: RestoreDependencies = {
    read: readWorkbenchSnapshot,
    replace: replaceWorkbenchSnapshot,
    getRecovery: readPendingRecovery,
    saveRecovery: savePendingRecovery,
    clearRecovery: clearPendingRecovery
};

/**
 * 復元前のスナップショットを永続化してから更新開始。
 * どの段階で失敗しても復旧データを残し、成功した場合だけ削除する。
 */
export async function restoreWithRecovery(
    imported: ImportedWorkbenchBackupSnapshot,
    deps: RestoreDependencies = defaultRestoreDependencies
): Promise<WorkbenchBackupSnapshot> {
    if (await deps.getRecovery()) {
        throw new Error("前回の復旧データが残っています。先に「元のデータを復旧」を実行してください。");
    }
    const original = await deps.read();
    const target = createRestoredSnapshot(imported, original);
    // ここでQuotaExceededErrorが発生したら、保存領域を一切書き換えない。
    await deps.saveRecovery(original);
    try {
        await deps.replace(target);
    } catch (restoreError) {
        try {
            await deps.replace(original);
            await deps.clearRecovery();
        } catch (rollbackError) {
            console.error("元データへの復旧に失敗しました。復旧コピーを保持しています。", rollbackError);
            throw new Error("復元と自動復旧の両方に失敗しました。復旧コピーは残っています。画面の「元のデータを復旧」ボタンから戻してください。");
        }
        throw restoreError;
    }
    try {
        await deps.clearRecovery();
    } catch {
        // 復元は完了済み。次回起動時に明示的な復旧判断を促す。
        throw new Error("復元は完了しましたが、復旧コピーを削除できませんでした。復旧操作で状態を確認してください。");
    }
    return target;
}

/** 中断・電源断・二重失敗後に、前回の状態へ戻す。 */
export async function recoverPreviousState(
    deps: RestoreDependencies = defaultRestoreDependencies
): Promise<boolean> {
    const record = await deps.getRecovery();
    if (!record) return false;
    await deps.replace(record.snapshot);
    await deps.clearRecovery();
    return true;
}
