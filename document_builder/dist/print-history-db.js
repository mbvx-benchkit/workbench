import { withWorkbenchWriteLock } from "./workbench-data-lock.js";
import { ensureHistoryUnlocked, lockHistoryVault, HistoryVaultCancelledError, addSealedHistory, getSealedHistoryPage, getSealedHistoryStats, getSealedHistoryEntry, deleteSealedHistory, openHistoryPasswordSettings } from "../../shared/print-history-vault.js";
export { ensureHistoryUnlocked, lockHistoryVault, HistoryVaultCancelledError, openHistoryPasswordSettings };
export async function addPrintHistory(recipientName, fileName, pdfBlob) {
    // Prompt before acquiring the cross-tab write lock, so a password dialog does
    // not block another tab's normal work or an urgent recovery operation.
    await ensureHistoryUnlocked();
    return withWorkbenchWriteLock(() => addSealedHistory(recipientName, fileName, pdfBlob));
}
export function getPrintHistoryPage(before = null, pageSize = 50) {
    return getSealedHistoryPage(before, pageSize);
}
export function getPrintHistoryStats() { return getSealedHistoryStats(); }
export function getPrintHistory(id) { return getSealedHistoryEntry(id); }
export async function deletePrintHistory(id) {
    await ensureHistoryUnlocked();
    return withWorkbenchWriteLock(() => deleteSealedHistory(id));
}
//# sourceMappingURL=print-history-db.js.map