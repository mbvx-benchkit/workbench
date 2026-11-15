/** History pagination, generation safety and UI state. */
import { getPrintHistoryPage, getPrintHistoryStats } from "../print-history-db.js";
export function createPrintHistoryController(controls) {
    const { printHistoryDialog, printHistoryList, printHistoryStats, printHistoryMoreButton, appendPrintHistoryEntries, formatPrintHistoryBytes, getErrorMessage, showToast } = controls;
    let printHistoryGeneration = 0;
    let printHistoryNextCursor = null;
    let printHistoryLoading = false;
    async function openPrintHistory() {
        const generation = ++printHistoryGeneration;
        printHistoryNextCursor = null;
        printHistoryMoreButton.hidden = true;
        printHistoryList.replaceChildren();
        printHistoryStats.textContent = "履歴を集計しています...";
        const loading = document.createElement("p");
        loading.className = "print-history-dialog__empty";
        loading.textContent = "履歴を読み込んでいます...";
        printHistoryList.appendChild(loading);
        if (!printHistoryDialog.open)
            printHistoryDialog.showModal();
        try {
            const [stats, page] = await Promise.all([
                getPrintHistoryStats(), getPrintHistoryPage(null, 50)
            ]);
            if (generation !== printHistoryGeneration || !printHistoryDialog.open)
                return;
            printHistoryStats.textContent =
                `${stats.count.toLocaleString("ja-JP")}件 / PDF合計 ${formatPrintHistoryBytes(stats.totalBytes)}`;
            printHistoryList.replaceChildren();
            if (page.entries.length === 0) {
                const empty = document.createElement("p");
                empty.className = "print-history-dialog__empty";
                empty.textContent = "まだPDFの出力履歴がありません。";
                printHistoryList.appendChild(empty);
                return;
            }
            const list = document.createElement("ul");
            list.className = "print-history-dialog__items";
            list.id = "print-history-items";
            printHistoryList.appendChild(list);
            appendPrintHistoryEntries(list, page.entries);
            printHistoryNextCursor = page.nextCursor;
            printHistoryMoreButton.hidden = !page.nextCursor;
        }
        catch (error) {
            if (generation !== printHistoryGeneration || !printHistoryDialog.open)
                return;
            printHistoryStats.textContent = "";
            printHistoryList.textContent = `履歴を読み込めませんでした。${getErrorMessage(error)}`;
        }
    }
    async function loadMorePrintHistory() {
        if (printHistoryLoading || !printHistoryNextCursor || !printHistoryDialog.open)
            return;
        const generation = printHistoryGeneration;
        const cursor = printHistoryNextCursor;
        printHistoryLoading = true;
        printHistoryMoreButton.disabled = true;
        try {
            const page = await getPrintHistoryPage(cursor, 50);
            if (generation !== printHistoryGeneration || !printHistoryDialog.open)
                return;
            const list = printHistoryList.querySelector("#print-history-items");
            if (!list)
                return;
            appendPrintHistoryEntries(list, page.entries);
            printHistoryNextCursor = page.nextCursor;
            printHistoryMoreButton.hidden = !page.nextCursor;
        }
        catch (error) {
            if (generation === printHistoryGeneration) {
                showToast(`追加の履歴を取得できませんでした。${getErrorMessage(error)}`);
            }
        }
        finally {
            printHistoryLoading = false;
            printHistoryMoreButton.disabled = false;
        }
    }
    return {
        openPrintHistory, loadMorePrintHistory,
        invalidate: () => { printHistoryGeneration++; }
    };
}
//# sourceMappingURL=print-history-controller.js.map