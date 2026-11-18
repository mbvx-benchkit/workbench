/* WORKBENCH_STAGE5_DOCUMENT */
import { jsonImportInput, jsonImportButton, jsonExportButton, templateSelect, templateSettingsButton, printHistoryButton, printButton, documentFieldsEmpty, documentFieldsForm, documentFields, activeTemplateName, documentPage, documentPreviewEmpty, documentContent, documentRenderElements, printFlowDialog, printFlowCloseButton, printSavePdfButton, printFinalButton, printStepOne, printStepTwo, printStepOneStatus, printFileName, printHistoryDialog, printHistoryCloseButton, printHistoryList, printHistoryStats, printHistoryMoreButton, templateSettingsDialog, templateDialogCloseButton, templateDialogDoneButton, templateBuilderButton, templateAddInput, templateAddButton, templateListEmpty, templateList, templateCardTemplate, templateDeleteDialog, templateDeleteCancelButton, templateDeleteConfirmButton, documentToast } from "./dom/main-elements.js";
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
import { requireElement, requireChild } from "./dom/document-utils.js";

import {
    createInitialValues,
    DocumentTemplate,
    DocumentValues,
    getReferencedFields
} from "./template.js";


import {
    deleteTemplate,
    getTemplate,
    getTemplates,
    putTemplate,
    requestPersistentStorage
} from "./template-db.js";


import {
    downloadDocumentJson,
    downloadTemplateJson,
    readDocumentPackageFile
} from "./template-import.js";


import {
    renderDocumentFields
} from "./form-render.js";


import {
    clearBusinessDocument,
    DocumentRenderElements,
    renderBusinessDocument
} from "./document-render.js";


import {
    setupTemplateBuilder,
    TemplateBuilderMode
} from "./template-builder.js";


import {
    createDocumentPdfFileName,
    PdfSaveCancelledError,
    saveDocumentPdf
} from "./pdf.js";

import {
    addPrintHistory,
    getPrintHistory,
    getPrintHistoryPage,
    getPrintHistoryStats,
    deletePrintHistory,
    type PrintHistoryCursor
} from "./print-history-db.js";


/* =========================================================
   Constants
   ========================================================= */

const ACTIVE_TEMPLATE_STORAGE_KEY =
    "workbench-document-builder-active-template";


const TOAST_DURATION_MS =
    3200;


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

let templates:
    DocumentTemplate[] =
    [];


let activeTemplate:
    DocumentTemplate |
    null =
    null;


let activeValues:
    DocumentValues =
    {};


let pendingDeleteTemplateId:
    string |
    null =
    null;


let toastTimer:
    number |
    null =
    null;


/* =========================================================
   Template Builder
   ========================================================= */

const templateBuilder =
    setupTemplateBuilder({

        onSave:
            saveTemplateFromBuilder,

        onReturnToList:
            () => {

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
    printFileName,printFlowDialog,printSavePdfButton,printFinalButton,
    printStepOne,printStepTwo,printStepOneStatus,documentPage,
    validateRequiredFields,getRecipientName,showToast,getErrorMessage
});

void initialize();


async function initialize():
    Promise<void> {

    wireEvents();


    try {

        await requestPersistentStorage();


        await refreshTemplateCollections();


        restoreInitialTemplate();

    } catch (
    error
    ) {

        console.error(
            "DOCUMENT BUILDERの初期化に失敗しました。",
            error
        );


        showToast(
            getErrorMessage(
                error
            )
        );


        clearActiveTemplate();
    }
}


/* =========================================================
   Events
   ========================================================= */

function wireEvents():
    void {
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

function validateRequiredFields():
    boolean {
    return validateDocumentRequiredFields(activeTemplate, activeValues, showToast);
}


/* =========================================================
   Recipient Name
   ========================================================= */

function getRecipientName():
    string {
    return resolveDocumentRecipientName(activeTemplate, activeValues);
}


/* =========================================================
   Open Print Flow
   ========================================================= */

function openPrintFlow():
    void {
    return printFlow.openPrintFlow();
}


/* =========================================================
   Reset Print Flow
   ========================================================= */

function resetPrintFlow():
    void {
    return printFlow.resetPrintFlow();
}


/* =========================================================
   STEP 1
   PDF Save
   ========================================================= */

async function runPdfSaveStep():
    Promise<void> {
    return printFlow.runPdfSaveStep();
}


/* =========================================================
   Print History Dialog
   ========================================================= */

/** 一覧にはメタデータのみを取得し、PDF本体の読み込みはダウンロード時だけ。 */
async function openPrintHistory(): Promise<void> {
    return printHistoryController.openPrintHistory();
}

async function loadMorePrintHistory(): Promise<void> {
    return printHistoryController.loadMorePrintHistory();
}

function appendPrintHistoryEntries(
    list: HTMLUListElement,
    entries: { id: string; fileName: string; createdAt: number; pdfBytes: number }[]
): void {
    renderPrintHistoryEntries(list, entries, { downloadHistoryPdf, deletePrintHistory, showToast, printHistoryDialog, openPrintHistory, getErrorMessage, formatPrintHistoryBytes, formatPrintHistoryDate });
}

async function downloadHistoryPdf(id: string, button: HTMLButtonElement): Promise<void> {
    return downloadStoredHistoryPdf(id, button, { showToast, getErrorMessage });
}


/* =========================================================
   STEP 2
   Print
   ========================================================= */

function runFinalPrint():
    void {
    return printFlow.runFinalPrint();
}


/* =========================================================
   Ribbon JSON Import
   ========================================================= */

async function handleDocumentImport():
    Promise<void> {
    return templateWorkflow.handleDocumentImport();
}


/* =========================================================
   Template Add JSON
   ========================================================= */

async function handleTemplateAddImport():
    Promise<void> {
    return templateWorkflow.handleTemplateAddImport();
}


/* =========================================================
   Template Builder Save
   ========================================================= */

async function saveTemplateFromBuilder(
    template: DocumentTemplate,
    mode: TemplateBuilderMode
): Promise<void> {
    return templateWorkflow.saveTemplateFromBuilder(template, mode);
}


/* =========================================================
   Template Selection
   ========================================================= */

async function handleTemplateSelection():
    Promise<void> {
    return templateWorkflow.handleTemplateSelection();
}


/* =========================================================
   Settings
   ========================================================= */

function openTemplateSettings():
    void {

    templateBuilder.showListView();


    renderTemplateManagerList();


    if (
        !templateSettingsDialog.open
    ) {

        templateSettingsDialog.showModal();
    }
}


/* =========================================================
   Refresh
   ========================================================= */

async function refreshTemplateCollections():
    Promise<void> {

    templates =
        await getTemplates();


    renderTemplateSelect();


    renderTemplateManagerList();
}


/* =========================================================
   Template Select
   ========================================================= */

function renderTemplateSelect():
    void {
    return renderTemplateSelectView(templates, activeTemplate, templateSelect);
}


/* =========================================================
   Manager List
   ========================================================= */

function renderTemplateManagerList():
    void {
    return renderTemplateManagerListView(templates, templateList, templateListEmpty, createTemplateCard);
}


/* =========================================================
   Manager Card
   ========================================================= */

function createTemplateCard(
    template: DocumentTemplate
): HTMLElement {
    return createTemplateCardView(template, {
        templateCardTemplate, templateDeleteDialog, templateBuilder, showToast, requireChild,
        setPendingDeleteTemplateId: id => { pendingDeleteTemplateId = id; }
    });
}


/* =========================================================
   Delete
   ========================================================= */

async function confirmTemplateDelete():
    Promise<void> {

    const id =
        pendingDeleteTemplateId;


    if (
        !id
    ) {

        templateDeleteDialog.close();

        return;
    }


    const deletingActiveTemplate = activeTemplate?.id === id;
    try {
        await deleteTemplate(id);
    } catch (error) {
        console.error("テンプレート削除に失敗しました。", error);
        showToast(`テンプレートを削除できませんでした。${getErrorMessage(error)}`);
        return;
    }

    // DBの削除は確定済み。再取得の失敗を「削除失敗」と表示しない。
    try {
        pendingDeleteTemplateId = null;
        templateDeleteDialog.close();
        if (deletingActiveTemplate) {
            // 削除済みテンプレートを再描画する前に利用中状態を解除する。
            clearActiveTemplate();
        }
        await refreshTemplateCollections();
        if (deletingActiveTemplate) {
            const nextTemplate = templates[0] ?? null;
            if (nextTemplate) applyTemplate(nextTemplate);
        }
        showToast("テンプレートを削除しました。");
    } catch (error) {
        console.error("削除済みテンプレートの画面更新に失敗しました。", error);
        showToast("テンプレートは削除済みです。画面の更新に失敗したため、ページを再読み込みしてください。");
    }
}


/* =========================================================
   Restore
   ========================================================= */

function restoreInitialTemplate():
    void {

    if (
        templates.length ===
        0
    ) {

        clearActiveTemplate();

        return;
    }


    const savedTemplateId =
        getStoredActiveTemplateId();


    const restored =
        templates.find(
            (
                template
            ) =>
                template.id ===
                savedTemplateId
        ) ??
        templates[0];


    applyTemplate(
        restored
    );
}


/* =========================================================
   Apply
   ========================================================= */

function applyTemplate(
    template: DocumentTemplate,
    suppliedValues?: DocumentValues
): void {

    activeTemplate =
        template;


    activeValues =
        createInitialValues(
            template,
            suppliedValues
        );


    storeActiveTemplateId(
        template.id
    );


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

        container:
            documentFields,

        template,

        values:
            activeValues,

        onChange:
            handleFieldChange
    });


    renderBusinessDocument(
        documentRenderElements,
        template,
        activeValues
    );
}


/* =========================================================
   Clear
   ========================================================= */

function clearActiveTemplate():
    void {

    activeTemplate =
        null;


    activeValues =
        {};


    storeActiveTemplateId(
        null
    );


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


    clearBusinessDocument(
        documentRenderElements
    );


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

function handleFieldChange(
    fieldId: string,
    value: string
): void {

    if (
        !activeTemplate
    ) {

        return;
    }


    activeValues = {

        ...activeValues,

        [fieldId]:
            value
    };


    renderBusinessDocument(
        documentRenderElements,
        activeTemplate,
        activeValues
    );
}


/* =========================================================
   Local Storage
   ========================================================= */

function getStoredActiveTemplateId():
    string | null {
    return getSavedActiveTemplateId(ACTIVE_TEMPLATE_STORAGE_KEY);
}


function storeActiveTemplateId(
    id: string | null
): void {
    void saveActiveTemplateId(ACTIVE_TEMPLATE_STORAGE_KEY, id).catch(error => {
        console.warn("テンプレートの選択状態を保存できませんでした。", error);
        showToast("選択状態を保存できませんでした。別タブで復元した場合は再読み込みしてください。");
    });
}


/* =========================================================
   Toast
   ========================================================= */

function showToast(
    message: string
): void {

    if (
        toastTimer !==
        null
    ) {

        window.clearTimeout(
            toastTimer
        );
    }


    documentToast.textContent =
        message;


    documentToast.hidden =
        false;


    toastTimer =
        window.setTimeout(
            () => {

                documentToast.hidden =
                    true;


                toastTimer =
                    null;
            },
            TOAST_DURATION_MS
        );
}