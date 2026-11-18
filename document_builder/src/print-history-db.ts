import { withWorkbenchWriteLock } from "./workbench-data-lock.js";
import {
  ensureHistoryUnlocked, lockHistoryVault, HistoryVaultCancelledError,
  addSealedHistory, getSealedHistoryPage, getSealedHistoryStats,
  getSealedHistoryEntry, deleteSealedHistory, openHistoryPasswordSettings
} from "../../shared/print-history-vault.js";

/** PDF history only: encrypted at rest using the separate history password. */
export type PrintHistoryEntry = {
  id: string; recipientName: string; fileName: string; createdAt: number; pdfBlob: Blob;
};
export type PrintHistoryMetadata = Omit<PrintHistoryEntry, "pdfBlob"> & { pdfBytes: number };
export type PrintHistoryCursor = { createdAt: number; id: string };
export type PrintHistoryPage = { entries: PrintHistoryMetadata[]; nextCursor: PrintHistoryCursor | null };
export type PrintHistoryStats = { count: number; totalBytes: number };
export { ensureHistoryUnlocked, lockHistoryVault, HistoryVaultCancelledError, openHistoryPasswordSettings };

export async function addPrintHistory(recipientName: string, fileName: string, pdfBlob: Blob): Promise<void> {
  // Prompt before acquiring the cross-tab write lock, so a password dialog does
  // not block another tab's normal work or an urgent recovery operation.
  await ensureHistoryUnlocked();
  return withWorkbenchWriteLock(() => addSealedHistory(recipientName, fileName, pdfBlob));
}
export function getPrintHistoryPage(before: PrintHistoryCursor | null = null, pageSize=50): Promise<PrintHistoryPage> {
  return getSealedHistoryPage(before,pageSize);
}
export function getPrintHistoryStats(): Promise<PrintHistoryStats> { return getSealedHistoryStats(); }
export function getPrintHistory(id: string): Promise<PrintHistoryEntry | null> { return getSealedHistoryEntry(id); }
export async function deletePrintHistory(id: string): Promise<void> {
  await ensureHistoryUnlocked();
  return withWorkbenchWriteLock(() => deleteSealedHistory(id));
}
