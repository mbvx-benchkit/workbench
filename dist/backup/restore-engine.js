import { withWorkbenchRestoreLock } from "../workbench-data-lock.js";
import { createRestoredSnapshot } from "./restore-policy.js";
import { readWorkbenchSnapshot, replaceWorkbenchSnapshot } from "./backup-storage.js";
import { readPendingRecovery, savePendingRecovery, clearPendingRecovery } from "./restore-recovery.js";
export const defaultRestoreDependencies = {
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
export async function restoreWithRecovery(imported, deps = defaultRestoreDependencies) {
    return withWorkbenchRestoreLock(async (session) => {
        if (await deps.getRecovery()) {
            throw new Error("前回の復旧データが残っています。先に「元のデータを復旧」を実行してください。");
        }
        const original = await deps.read();
        const target = createRestoredSnapshot(imported, original);
        // Never start replacing data until the recovery snapshot is durable.
        await deps.saveRecovery(original);
        try {
            session.beginReplacement();
        }
        catch (error) {
            // No user data was replaced yet. Clear the now-unneeded journal.
            await deps.clearRecovery();
            throw error;
        }
        try {
            await deps.replace(target);
        }
        catch (restoreError) {
            try {
                await deps.replace(original);
                // The marker is removed before the journal: on interruption,
                // the surviving journal can still offer a recovery action.
                session.finishReplacement();
                await deps.clearRecovery();
            }
            catch (rollbackError) {
                console.error("元データへの復旧に失敗しました。復旧コピーを保持しています。", rollbackError);
                throw new Error("復元と自動復旧の両方に失敗しました。復旧コピーは残っています。画面の「元のデータを復旧」ボタンから戻してください。");
            }
            throw restoreError;
        }
        // Keep the journal until after the marker is cleared. Both steps
        // occur under the exclusive lock, so ordinary writes cannot interleave.
        session.finishReplacement();
        try {
            await deps.clearRecovery();
        }
        catch {
            throw new Error("復元は完了しましたが、復旧コピーを削除できませんでした。復旧操作で状態を確認してください。");
        }
        return target;
    });
}
/** 中断・電源断・二重失敗後に、前回の状態へ戻す。 */
export async function recoverPreviousState(deps = defaultRestoreDependencies) {
    return withWorkbenchRestoreLock(async (session) => {
        const record = await deps.getRecovery();
        if (!record) {
            // A crash after journal cleanup may have left only the sync marker.
            session.finishReplacement();
            return false;
        }
        session.beginReplacement();
        await deps.replace(record.snapshot);
        session.finishReplacement();
        await deps.clearRecovery();
        return true;
    }, true);
}
//# sourceMappingURL=restore-engine.js.map