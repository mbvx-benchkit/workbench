export function renderPrintHistoryEntries(list, entries, deps) {
    const { downloadHistoryPdf, deletePrintHistory, showToast, printHistoryDialog, openPrintHistory, getErrorMessage, formatPrintHistoryBytes, formatPrintHistoryDate } = deps;
    for (const entry of entries) {
        const item = document.createElement("li");
        item.className = "print-history-dialog__item";
        const info = document.createElement("div");
        info.className = "print-history-dialog__item-info";
        const title = document.createElement("strong");
        title.className = "print-history-dialog__item-name";
        title.textContent = entry.fileName.replace(/\.pdf$/i, "");
        const date = document.createElement("small");
        date.className = "print-history-dialog__item-date";
        date.textContent = `保存日時: ${formatPrintHistoryDate(entry.createdAt)} / ${formatPrintHistoryBytes(entry.pdfBytes)}`;
        info.append(title, date);
        const actions = document.createElement("div");
        actions.className = "print-history-dialog__item-actions";
        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "print-history-dialog__download";
        downloadButton.title = `${entry.fileName} をダウンロード`;
        downloadButton.setAttribute("aria-label", downloadButton.title);
        downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4"/></svg>`;
        downloadButton.addEventListener("click", () => {
            void downloadHistoryPdf(entry.id, downloadButton);
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "print-history-dialog__delete";
        deleteButton.title = `${entry.fileName} を履歴から削除`;
        deleteButton.setAttribute("aria-label", deleteButton.title);
        deleteButton.textContent = "削除";
        deleteButton.addEventListener("click", () => {
            if (!window.confirm(`${entry.fileName} を履歴から削除しますか？\n保存済みPDFも削除され、元に戻せません。`))
                return;
            deleteButton.disabled = true;
            void (async () => {
                try {
                    await deletePrintHistory(entry.id);
                    showToast("履歴を削除しました。");
                    if (printHistoryDialog.open)
                        await openPrintHistory();
                }
                catch (error) {
                    showToast(`履歴を削除できませんでした。${getErrorMessage(error)}`);
                }
                finally {
                    deleteButton.disabled = false;
                }
            })();
        });
        actions.append(downloadButton, deleteButton);
        item.append(info, actions);
        list.appendChild(item);
    }
}
//# sourceMappingURL=print-history-view.js.map