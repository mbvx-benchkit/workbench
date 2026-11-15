/** Document PDF save/print flow. Events and template state remain owned by main.ts. */
import { createDocumentPdfFileName, saveDocumentPdf, PdfSaveCancelledError } from "../pdf.js";
import { addPrintHistory } from "../print-history-db.js";
export function createDocumentPrintFlow(deps) {
    const { printFileName, printFlowDialog, printSavePdfButton, printFinalButton, printStepOne, printStepTwo, printStepOneStatus, documentPage, validateRequiredFields, getRecipientName, showToast, getErrorMessage } = deps;
    function openPrintFlow() {
        const activeTemplate = deps.activeTemplate;
        if (!activeTemplate) {
            return;
        }
        if (!validateRequiredFields()) {
            return;
        }
        resetPrintFlow();
        const recipientName = getRecipientName();
        printFileName.textContent =
            createDocumentPdfFileName(recipientName);
        if (!printFlowDialog.open) {
            printFlowDialog.showModal();
        }
    }
    function resetPrintFlow() {
        printSavePdfButton.disabled =
            false;
        printSavePdfButton.textContent =
            "PDFを保存";
        printFinalButton.disabled =
            true;
        printStepOne.classList.remove("print-flow-step--complete");
        printStepTwo.classList.add("print-flow-step--disabled");
        printStepOneStatus.textContent =
            "";
        printStepOneStatus.hidden =
            true;
    }
    async function runPdfSaveStep() {
        const activeTemplate = deps.activeTemplate;
        if (!activeTemplate) {
            return;
        }
        if (!validateRequiredFields()) {
            printFlowDialog.close();
            return;
        }
        printSavePdfButton.disabled =
            true;
        printSavePdfButton.textContent =
            "PDFを作成中...";
        try {
            const recipientName = getRecipientName();
            const result = await saveDocumentPdf(documentPage, recipientName);
            // ダウンロードしたものと同一のBlobをIndexedDBへ保存する。
            // ブラウザの容量不足などで保存できなくても、PDFの手動保存と
            // 印刷への移行自体は妨げず、利用者に失敗を知らせる。
            let historySaved = false;
            try {
                await addPrintHistory(recipientName, result.fileName, result.pdfBlob);
                historySaved = true;
            }
            catch (historyError) {
                console.error("PDFの履歴保存に失敗しました。", historyError);
            }
            printStepOne.classList.add("print-flow-step--complete");
            printStepTwo.classList.remove("print-flow-step--disabled");
            printFinalButton.disabled =
                false;
            printStepOneStatus.hidden =
                false;
            if (result.method ===
                "file-picker") {
                printStepOneStatus.textContent =
                    "PDFを保存しました。";
            }
            else {
                printStepOneStatus.textContent =
                    "PDFのダウンロードを開始しました。";
            }
            if (historySaved) {
                showToast(`${result.fileName} を作成し、履歴にも保存しました。`);
            }
            else {
                printStepOneStatus.textContent +=
                    " ブラウザ内の履歴保存には失敗しました。空き容量や保存設定をご確認ください。";
                showToast("PDFは保存されましたが、履歴の保存に失敗しました。");
            }
        }
        catch (error) {
            if (error instanceof
                PdfSaveCancelledError) {
                showToast("PDF保存をキャンセルしました。");
                return;
            }
            console.error("PDF保存に失敗しました。", error);
            showToast(`PDFを保存できませんでした。${getErrorMessage(error)}`);
        }
        finally {
            printSavePdfButton.disabled =
                false;
            printSavePdfButton.textContent =
                "PDFを保存";
        }
    }
    function runFinalPrint() {
        if (printFinalButton.disabled) {
            return;
        }
        if (!validateRequiredFields()) {
            printFlowDialog.close();
            return;
        }
        window.print();
    }
    return { openPrintFlow, resetPrintFlow, runPdfSaveStep, runFinalPrint };
}
//# sourceMappingURL=print-flow-controller.js.map