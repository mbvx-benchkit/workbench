/** DOCUMENT BUILDER event registration only. No local screen state. */
import { jsonImportInput, jsonImportButton, jsonExportButton, templateSelect, templateSettingsButton, printHistoryButton, printButton, printFlowDialog, printFlowCloseButton, printSavePdfButton, printFinalButton, printHistoryDialog, printHistoryCloseButton, printHistoryMoreButton, templateSettingsDialog, templateDialogCloseButton, templateDialogDoneButton, templateBuilderButton, templateAddInput, templateAddButton, templateDeleteDialog, templateDeleteCancelButton, templateDeleteConfirmButton } from "../dom/main-elements.js";
export function bindDocumentEvents(deps) {
    /* -----------------------------------------------------
       JSON import
       ----------------------------------------------------- */
    jsonImportButton.addEventListener("click", () => {
        jsonImportInput.value =
            "";
        jsonImportInput.click();
    });
    jsonImportInput.addEventListener("change", () => {
        void deps.handleDocumentImport();
    });
    /* -----------------------------------------------------
       JSON export
       ----------------------------------------------------- */
    jsonExportButton.addEventListener("click", () => {
        if (!deps.activeTemplate) {
            return;
        }
        deps.downloadDocumentJson(deps.activeTemplate, deps.activeValues);
        deps.showToast("現在の文書をJSON出力しました。");
    });
    /* -----------------------------------------------------
       Template
       ----------------------------------------------------- */
    templateSelect.addEventListener("change", () => {
        void deps.handleTemplateSelection();
    });
    templateSettingsButton.addEventListener("click", () => {
        deps.openTemplateSettings();
    });
    /* -----------------------------------------------------
       Print flow
       ----------------------------------------------------- */
    printButton.addEventListener("click", () => {
        deps.openPrintFlow();
    });
    printHistoryButton.addEventListener("click", () => {
        void deps.openPrintHistory();
    });
    const historyPasswordButton = document.getElementById('print-history-password-button');
    historyPasswordButton?.addEventListener('click', () => {
        if (historyPasswordButton.disabled)
            return;
        historyPasswordButton.disabled = true;
        void deps.changeHistoryPassword().finally(() => { historyPasswordButton.disabled = false; });
    });
    printHistoryCloseButton.addEventListener("click", () => {
        printHistoryDialog.close();
    });
    printHistoryDialog.addEventListener("close", () => {
        deps.invalidatePrintHistory();
    });
    printHistoryMoreButton.addEventListener("click", () => {
        void deps.loadMorePrintHistory();
    });
    printHistoryDialog.addEventListener("click", (event) => {
        if (event.target === printHistoryDialog) {
            printHistoryDialog.close();
        }
    });
    printFlowCloseButton.addEventListener("click", () => {
        printFlowDialog.close();
    });
    printFlowDialog.addEventListener("click", (event) => {
        if (event.target ===
            printFlowDialog) {
            printFlowDialog.close();
        }
    });
    /* -----------------------------------------------------
       PDF Save
       ----------------------------------------------------- */
    printSavePdfButton.addEventListener("click", () => {
        void deps.runPdfSaveStep();
    });
    /* -----------------------------------------------------
       Final print
       ----------------------------------------------------- */
    printFinalButton.addEventListener("click", () => {
        deps.runFinalPrint();
    });
    /* -----------------------------------------------------
       Template settings
       ----------------------------------------------------- */
    templateDialogCloseButton.addEventListener("click", () => {
        templateSettingsDialog.close();
    });
    templateDialogDoneButton.addEventListener("click", () => {
        templateSettingsDialog.close();
    });
    templateBuilderButton.addEventListener("click", () => {
        deps.templateBuilder.openCreate();
    });
    templateAddButton.addEventListener("click", () => {
        templateAddInput.value =
            "";
        templateAddInput.click();
    });
    templateAddInput.addEventListener("change", () => {
        void deps.handleTemplateAddImport();
    });
    templateSettingsDialog.addEventListener("click", (event) => {
        if (event.target ===
            templateSettingsDialog) {
            templateSettingsDialog.close();
        }
    });
    templateSettingsDialog.addEventListener("close", () => {
        deps.templateBuilder.reset();
    });
    /* -----------------------------------------------------
       Delete
       ----------------------------------------------------- */
    templateDeleteCancelButton.addEventListener("click", () => {
        deps.clearPendingDeleteTemplate();
        templateDeleteDialog.close();
    });
    templateDeleteConfirmButton.addEventListener("click", () => {
        void deps.confirmTemplateDelete();
    });
    templateDeleteDialog.addEventListener("click", (event) => {
        if (event.target ===
            templateDeleteDialog) {
            deps.clearPendingDeleteTemplate();
            templateDeleteDialog.close();
        }
    });
}
//# sourceMappingURL=document-events.js.map