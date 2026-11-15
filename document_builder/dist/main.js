/* WORKBENCH_STAGE5_DOCUMENT */
import { jsonImportInput, jsonExportButton, templateSelect, printButton, documentFieldsEmpty, documentFieldsForm, documentFields, activeTemplateName, documentPage, documentPreviewEmpty, documentContent, documentRenderElements, printFlowDialog, printSavePdfButton, printFinalButton, printStepOne, printStepTwo, printStepOneStatus, printFileName, printHistoryDialog, printHistoryList, printHistoryStats, printHistoryMoreButton, templateSettingsDialog, templateAddInput, templateListEmpty, templateList, templateCardTemplate, templateDeleteDialog, documentToast } from "./dom/main-elements.js";
import { bindDocumentEvents } from "./events/document-events.js";
/* WORKBENCH_STAGE4_DOCUMENT */
import { validateDocumentRequiredFields, resolveDocumentRecipientName } from "./form/document-field-rules.js";
import { createTemplateWorkflow } from "./templates/template-workflow.js";
import { getSavedActiveTemplateId, saveActiveTemplateId } from "./templates/active-template-storage.js";
import { createDocumentPrintFlow } from "./print/print-flow-controller.js";
/* WORKBENCH_STAGE3_HISTORY */
import { createPrintHistoryController } from "./history/print-history-controller.js";
import { downloadStoredHistoryPdf } from "./history/print-history-download.js";
/* WORKBENCH_STAGE3_TEMPLATES */
import { renderTemplateSelectView } from "./templates/template-selector-view.js";
import { renderTemplateManagerListView } from "./templates/template-list-view.js";
import { createTemplateCardView } from "./templates/template-card-view.js";
/* WORKBENCH_EXTRACT_appendPrintHistoryEntries */
import { renderPrintHistoryEntries } from "./history/print-history-view.js";
import { formatPrintHistoryBytes, formatPrintHistoryDate } from "./dom/document-utils.js";
import { getErrorMessage } from "./dom/document-utils.js";
import { requireChild } from "./dom/document-utils.js";
import { createInitialValues } from "./template.js";
import { deleteTemplate, getTemplates, requestPersistentStorage } from "./template-db.js";
import { downloadDocumentJson } from "./template-import.js";
import { renderDocumentFields } from "./form-render.js";
import { clearBusinessDocument, renderBusinessDocument } from "./document-render.js";
import { setupTemplateBuilder } from "./template-builder.js";
import { deletePrintHistory } from "./print-history-db.js";
/* =========================================================
   Constants
   ========================================================= */
const ACTIVE_TEMPLATE_STORAGE_KEY = "workbench-document-builder-active-template";
const TOAST_DURATION_MS = 3200;
/* =========================================================
   Ribbon
   ========================================================= */
/* =========================================================
   Fields
   ========================================================= */
/* =========================================================
   Preview
   ========================================================= */
/* =========================================================
   Print Flow
   ========================================================= */
/* =========================================================
   Print History
   ========================================================= */
/* =========================================================
   Settings
   ========================================================= */
/* =========================================================
   Delete
   ========================================================= */
/* =========================================================
   Toast
   ========================================================= */
/* =========================================================
   State
   ========================================================= */
let templates = [];
let activeTemplate = null;
let activeValues = {};
let pendingDeleteTemplateId = null;
let toastTimer = null;
/* =========================================================
   Template Builder
   ========================================================= */
const templateBuilder = setupTemplateBuilder({
    onSave: saveTemplateFromBuilder,
    onReturnToList: () => {
        renderTemplateManagerList();
    }
});
/* =========================================================
   Initialize
   ========================================================= */
// Stage 3: history state stays inside its own controller.
const printHistoryController = createPrintHistoryController({
    printHistoryDialog, printHistoryList, printHistoryStats, printHistoryMoreButton,
    appendPrintHistoryEntries, formatPrintHistoryBytes, getErrorMessage, showToast
});
// Stage 4: state is owned here; workflow/printing logic lives in dedicated modules.
const templateWorkflow = createTemplateWorkflow({
    jsonImportInput, templateAddInput, templateSelect,
    get activeTemplate() { return activeTemplate; },
    get activeValues() { return activeValues; },
    refreshTemplateCollections, applyTemplate, clearActiveTemplate, showToast, getErrorMessage
});
const printFlow = createDocumentPrintFlow({
    get activeTemplate() { return activeTemplate; },
    printFileName, printFlowDialog, printSavePdfButton, printFinalButton,
    printStepOne, printStepTwo, printStepOneStatus, documentPage,
    validateRequiredFields, getRecipientName, showToast, getErrorMessage
});
void initialize();
async function initialize() {
    wireEvents();
    try {
        await requestPersistentStorage();
        await refreshTemplateCollections();
        restoreInitialTemplate();
    }
    catch (error) {
        console.error("DOCUMENT BUILDERの初期化に失敗しました。", error);
        showToast(getErrorMessage(error));
        clearActiveTemplate();
    }
}
/* =========================================================
   Events
   ========================================================= */
function wireEvents() {
    bindDocumentEvents({
        get activeTemplate() { return activeTemplate; },
        get activeValues() { return activeValues; },
        templateBuilder, downloadDocumentJson, handleDocumentImport, handleTemplateSelection,
        openTemplateSettings, openPrintFlow, openPrintHistory, loadMorePrintHistory,
        runPdfSaveStep, runFinalPrint, handleTemplateAddImport, confirmTemplateDelete, showToast,
        invalidatePrintHistory: () => printHistoryController.invalidate(),
        clearPendingDeleteTemplate: () => { pendingDeleteTemplateId = null; }
    });
}
/* =========================================================
   Required Validation
   ========================================================= */
function validateRequiredFields() {
    return validateDocumentRequiredFields(activeTemplate, activeValues, showToast);
}
/* =========================================================
   Recipient Name
   ========================================================= */
function getRecipientName() {
    return resolveDocumentRecipientName(activeTemplate, activeValues);
}
/* =========================================================
   Open Print Flow
   ========================================================= */
function openPrintFlow() {
    return printFlow.openPrintFlow();
}
/* =========================================================
   Reset Print Flow
   ========================================================= */
function resetPrintFlow() {
    return printFlow.resetPrintFlow();
}
/* =========================================================
   STEP 1
   PDF Save
   ========================================================= */
async function runPdfSaveStep() {
    return printFlow.runPdfSaveStep();
}
/* =========================================================
   Print History Dialog
   ========================================================= */
/** 一覧にはメタデータのみを取得し、PDF本体の読み込みはダウンロード時だけ。 */
async function openPrintHistory() {
    return printHistoryController.openPrintHistory();
}
async function loadMorePrintHistory() {
    return printHistoryController.loadMorePrintHistory();
}
function appendPrintHistoryEntries(list, entries) {
    renderPrintHistoryEntries(list, entries, { downloadHistoryPdf, deletePrintHistory, showToast, printHistoryDialog, openPrintHistory, getErrorMessage, formatPrintHistoryBytes, formatPrintHistoryDate });
}
async function downloadHistoryPdf(id, button) {
    return downloadStoredHistoryPdf(id, button, { showToast, getErrorMessage });
}
/* =========================================================
   STEP 2
   Print
   ========================================================= */
function runFinalPrint() {
    return printFlow.runFinalPrint();
}
/* =========================================================
   Ribbon JSON Import
   ========================================================= */
async function handleDocumentImport() {
    return templateWorkflow.handleDocumentImport();
}
/* =========================================================
   Template Add JSON
   ========================================================= */
async function handleTemplateAddImport() {
    return templateWorkflow.handleTemplateAddImport();
}
/* =========================================================
   Template Builder Save
   ========================================================= */
async function saveTemplateFromBuilder(template, mode) {
    return templateWorkflow.saveTemplateFromBuilder(template, mode);
}
/* =========================================================
   Template Selection
   ========================================================= */
async function handleTemplateSelection() {
    return templateWorkflow.handleTemplateSelection();
}
/* =========================================================
   Settings
   ========================================================= */
function openTemplateSettings() {
    templateBuilder.showListView();
    renderTemplateManagerList();
    if (!templateSettingsDialog.open) {
        templateSettingsDialog.showModal();
    }
}
/* =========================================================
   Refresh
   ========================================================= */
async function refreshTemplateCollections() {
    templates =
        await getTemplates();
    renderTemplateSelect();
    renderTemplateManagerList();
}
/* =========================================================
   Template Select
   ========================================================= */
function renderTemplateSelect() {
    return renderTemplateSelectView(templates, activeTemplate, templateSelect);
}
/* =========================================================
   Manager List
   ========================================================= */
function renderTemplateManagerList() {
    return renderTemplateManagerListView(templates, templateList, templateListEmpty, createTemplateCard);
}
/* =========================================================
   Manager Card
   ========================================================= */
function createTemplateCard(template) {
    return createTemplateCardView(template, {
        templateCardTemplate, templateDeleteDialog, templateBuilder, showToast, requireChild,
        setPendingDeleteTemplateId: id => { pendingDeleteTemplateId = id; }
    });
}
/* =========================================================
   Delete
   ========================================================= */
async function confirmTemplateDelete() {
    const id = pendingDeleteTemplateId;
    if (!id) {
        templateDeleteDialog.close();
        return;
    }
    try {
        const deletingActiveTemplate = activeTemplate?.id ===
            id;
        await deleteTemplate(id);
        pendingDeleteTemplateId =
            null;
        templateDeleteDialog.close();
        await refreshTemplateCollections();
        if (deletingActiveTemplate) {
            const nextTemplate = templates[0] ??
                null;
            if (nextTemplate) {
                applyTemplate(nextTemplate);
            }
            else {
                clearActiveTemplate();
            }
        }
        showToast("テンプレートを削除しました。");
    }
    catch (error) {
        console.error("テンプレート削除に失敗しました。", error);
        showToast(getErrorMessage(error));
    }
}
/* =========================================================
   Restore
   ========================================================= */
function restoreInitialTemplate() {
    if (templates.length ===
        0) {
        clearActiveTemplate();
        return;
    }
    const savedTemplateId = getStoredActiveTemplateId();
    const restored = templates.find((template) => template.id ===
        savedTemplateId) ??
        templates[0];
    applyTemplate(restored);
}
/* =========================================================
   Apply
   ========================================================= */
function applyTemplate(template, suppliedValues) {
    activeTemplate =
        template;
    activeValues =
        createInitialValues(template, suppliedValues);
    storeActiveTemplateId(template.id);
    templateSelect.value =
        template.id;
    activeTemplateName.textContent =
        template.name;
    activeTemplateName.hidden =
        false;
    documentFieldsEmpty.hidden =
        true;
    documentFieldsForm.hidden =
        false;
    documentPreviewEmpty.hidden =
        true;
    documentContent.hidden =
        false;
    jsonExportButton.disabled =
        false;
    printButton.disabled =
        false;
    renderDocumentFields({
        container: documentFields,
        template,
        values: activeValues,
        onChange: handleFieldChange
    });
    renderBusinessDocument(documentRenderElements, template, activeValues);
}
/* =========================================================
   Clear
   ========================================================= */
function clearActiveTemplate() {
    activeTemplate =
        null;
    activeValues =
        {};
    storeActiveTemplateId(null);
    templateSelect.value =
        "";
    activeTemplateName.textContent =
        "";
    activeTemplateName.hidden =
        true;
    documentFields.replaceChildren();
    documentFieldsForm.hidden =
        true;
    documentFieldsEmpty.hidden =
        false;
    clearBusinessDocument(documentRenderElements);
    documentContent.hidden =
        true;
    documentPreviewEmpty.hidden =
        false;
    jsonExportButton.disabled =
        true;
    printButton.disabled =
        true;
}
/* =========================================================
   Field Change
   ========================================================= */
function handleFieldChange(fieldId, value) {
    if (!activeTemplate) {
        return;
    }
    activeValues = {
        ...activeValues,
        [fieldId]: value
    };
    renderBusinessDocument(documentRenderElements, activeTemplate, activeValues);
}
/* =========================================================
   Local Storage
   ========================================================= */
function getStoredActiveTemplateId() {
    return getSavedActiveTemplateId(ACTIVE_TEMPLATE_STORAGE_KEY);
}
function storeActiveTemplateId(id) {
    return saveActiveTemplateId(ACTIVE_TEMPLATE_STORAGE_KEY, id);
}
/* =========================================================
   Toast
   ========================================================= */
function showToast(message) {
    if (toastTimer !==
        null) {
        window.clearTimeout(toastTimer);
    }
    documentToast.textContent =
        message;
    documentToast.hidden =
        false;
    toastTimer =
        window.setTimeout(() => {
            documentToast.hidden =
                true;
            toastTimer =
                null;
        }, TOAST_DURATION_MS);
}
//# sourceMappingURL=main.js.map