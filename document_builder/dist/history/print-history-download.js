/** PDF history download. Blob is fetched only on demand, as before. */
import { getPrintHistory } from "../print-history-db.js";
export async function downloadStoredHistoryPdf(id, button, callbacks) {
    const { showToast, getErrorMessage } = callbacks;
    button.disabled = true;
    try {
        const entry = await getPrintHistory(id);
        if (!entry) {
            throw new Error("この履歴は見つかりませんでした。");
        }
        const url = URL.createObjectURL(entry.pdfBlob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = entry.fileName;
        anchor.hidden = true;
        document.body.appendChild(anchor);
        try {
            anchor.click();
        }
        finally {
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
        showToast(`${entry.fileName} のダウンロードを開始しました。`);
    }
    catch (error) {
        showToast(`PDFをダウンロードできませんでした。${getErrorMessage(error)}`);
    }
    finally {
        button.disabled = false;
    }
}
//# sourceMappingURL=print-history-download.js.map