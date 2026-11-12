import { createInitialValues, getReferencedFields } from "./template.js";
import { deleteTemplate, getTemplate, getTemplates, putTemplate, requestPersistentStorage } from "./template-db.js";
import { downloadDocumentJson, downloadTemplateJson, readDocumentPackageFile } from "./template-import.js";
import { renderDocumentFields } from "./form-render.js";
import { clearBusinessDocument, renderBusinessDocument } from "./document-render.js";
import { setupTemplateBuilder } from "./template-builder.js";
import { createDocumentPdfFileName, PdfSaveCancelledError, saveDocumentPdf } from "./pdf.js";
import { addPrintHistory, getPrintHistory, getPrintHistoryPage, getPrintHistoryStats, deletePrintHistory } from "./print-history-db.js";
/* =========================================================
   Constants
   ========================================================= */
const ACTIVE_TEMPLATE_STORAGE_KEY = "workbench-document-builder-active-template";
const TOAST_DURATION_MS = 3200;
/* =========================================================
   Ribbon
   ========================================================= */
const jsonImportInput = requireElement("#json-import-input");
const jsonImportButton = requireElement("#json-import-button");
const jsonExportButton = requireElement("#json-export-button");
const templateSelect = requireElement("#template-select");
const templateSettingsButton = requireElement("#template-settings-button");
const printHistoryButton = requireElement("#print-history-button");
const printButton = requireElement("#print-button");
/* =========================================================
   Fields
   ========================================================= */
const documentFieldsEmpty = requireElement("#document-fields-empty");
const documentFieldsForm = requireElement("#document-fields-form");
const documentFields = requireElement("#document-fields");
const activeTemplateName = requireElement("#active-template-name");
/* =========================================================
   Preview
   ========================================================= */
const documentPage = requireElement("#document-page");
const documentPreviewEmpty = requireElement("#document-preview-empty");
const documentContent = requireElement("#document-content");
const documentRenderElements = {
    topLeft: requireElement("#document-top-left"),
    topRight: requireElement("#document-top-right"),
    opening: requireElement("#document-opening"),
    body: requireElement("#document-body"),
    closing: requireElement("#document-closing"),
    end: requireElement("#document-end")
};
/* =========================================================
   Print Flow
   ========================================================= */
const printFlowDialog = requireElement("#print-flow-dialog");
const printFlowCloseButton = requireElement("#print-flow-close-button");
const printSavePdfButton = requireElement("#print-save-pdf-button");
const printFinalButton = requireElement("#print-final-button");
const printStepOne = requireElement("#print-step-one");
const printStepTwo = requireElement("#print-step-two");
const printStepOneStatus = requireElement("#print-step-one-status");
const printFileName = requireElement("#print-file-name");
/* =========================================================
   Print History
   ========================================================= */
const printHistoryDialog = requireElement("#print-history-dialog");
const printHistoryCloseButton = requireElement("#print-history-close-button");
const printHistoryList = requireElement("#print-history-list");
const printHistoryStats = requireElement("#print-history-stats");
const printHistoryMoreButton = requireElement("#print-history-more-button");
let printHistoryNextCursor = null;
let printHistoryGeneration = 0;
let printHistoryLoading = false;
/* =========================================================
   Settings
   ========================================================= */
const templateSettingsDialog = requireElement("#template-settings-dialog");
const templateDialogCloseButton = requireElement("#template-dialog-close-button");
const templateDialogDoneButton = requireElement("#template-dialog-done-button");
const templateBuilderButton = requireElement("#template-builder-button");
const templateAddInput = requireElement("#template-add-input");
const templateAddButton = requireElement("#template-add-button");
const templateListEmpty = requireElement("#template-list-empty");
const templateList = requireElement("#template-list");
const templateCardTemplate = requireElement("#template-card-template");
/* =========================================================
   Delete
   ========================================================= */
const templateDeleteDialog = requireElement("#template-delete-dialog");
const templateDeleteCancelButton = requireElement("#template-delete-cancel-button");
const templateDeleteConfirmButton = requireElement("#template-delete-confirm-button");
/* =========================================================
   Toast
   ========================================================= */
const documentToast = requireElement("#document-toast");
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
    /* -----------------------------------------------------
       JSON import
       ----------------------------------------------------- */
    jsonImportButton.addEventListener("click", () => {
        jsonImportInput.value =
            "";
        jsonImportInput.click();
    });
    jsonImportInput.addEventListener("change", () => {
        void handleDocumentImport();
    });
    /* -----------------------------------------------------
       JSON export
       ----------------------------------------------------- */
    jsonExportButton.addEventListener("click", () => {
        if (!activeTemplate) {
            return;
        }
        downloadDocumentJson(activeTemplate, activeValues);
        showToast("現在の文書をJSON出力しました。");
    });
    /* -----------------------------------------------------
       Template
       ----------------------------------------------------- */
    templateSelect.addEventListener("change", () => {
        void handleTemplateSelection();
    });
    templateSettingsButton.addEventListener("click", () => {
        openTemplateSettings();
    });
    /* -----------------------------------------------------
       Print flow
       ----------------------------------------------------- */
    printButton.addEventListener("click", () => {
        openPrintFlow();
    });
    printHistoryButton.addEventListener("click", () => {
        void openPrintHistory();
    });
    printHistoryCloseButton.addEventListener("click", () => {
        printHistoryDialog.close();
    });
    printHistoryDialog.addEventListener("close", () => {
        printHistoryGeneration++;
    });
    printHistoryMoreButton.addEventListener("click", () => {
        void loadMorePrintHistory();
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
        void runPdfSaveStep();
    });
    /* -----------------------------------------------------
       Final print
       ----------------------------------------------------- */
    printFinalButton.addEventListener("click", () => {
        runFinalPrint();
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
        templateBuilder.openCreate();
    });
    templateAddButton.addEventListener("click", () => {
        templateAddInput.value =
            "";
        templateAddInput.click();
    });
    templateAddInput.addEventListener("change", () => {
        void handleTemplateAddImport();
    });
    templateSettingsDialog.addEventListener("click", (event) => {
        if (event.target ===
            templateSettingsDialog) {
            templateSettingsDialog.close();
        }
    });
    templateSettingsDialog.addEventListener("close", () => {
        templateBuilder.reset();
    });
    /* -----------------------------------------------------
       Delete
       ----------------------------------------------------- */
    templateDeleteCancelButton.addEventListener("click", () => {
        pendingDeleteTemplateId =
            null;
        templateDeleteDialog.close();
    });
    templateDeleteConfirmButton.addEventListener("click", () => {
        void confirmTemplateDelete();
    });
    templateDeleteDialog.addEventListener("click", (event) => {
        if (event.target ===
            templateDeleteDialog) {
            pendingDeleteTemplateId =
                null;
            templateDeleteDialog.close();
        }
    });
}
/* =========================================================
   Required Validation
   ========================================================= */
function validateRequiredFields() {
    if (!activeTemplate) {
        return false;
    }
    const missingField = getReferencedFields(activeTemplate).find((field) => {
        if (!field.required) {
            return false;
        }
        const value = activeValues[field.id] ??
            "";
        return (value.trim().length ===
            0);
    });
    if (!missingField) {
        return true;
    }
    showToast(`必須項目「${missingField.label}」を入力してください。`);
    const control = document.getElementById(`document-field-${missingField.id}`);
    if (control instanceof
        HTMLInputElement ||
        control instanceof
            HTMLTextAreaElement) {
        control.focus();
        control.reportValidity();
    }
    return false;
}
/* =========================================================
   Recipient Name
   ========================================================= */
function getRecipientName() {
    if (!activeTemplate) {
        return "";
    }
    const fields = getReferencedFields(activeTemplate);
    const exactLabelCandidates = [
        "相手の名前",
        "宛名",
        "宛先名",
        "相手名"
    ];
    const exactField = fields.find((field) => exactLabelCandidates.includes(field.label.trim()));
    if (exactField) {
        return (activeValues[exactField.id] ??
            "");
    }
    const semanticField = fields.find((field) => {
        const label = field.label.trim();
        return (label.includes("宛名") ||
            label.includes("宛先") ||
            (label.includes("相手") &&
                (label.includes("名前") ||
                    label.includes("氏名"))));
    });
    if (semanticField) {
        return (activeValues[semanticField.id] ??
            "");
    }
    const genericNameFields = fields.filter((field) => {
        const label = field.label.trim();
        return (label ===
            "名前" ||
            label ===
                "お名前" ||
            label ===
                "氏名");
    });
    if (genericNameFields.length ===
        1) {
        const field = genericNameFields[0];
        return (activeValues[field.id] ??
            "");
    }
    return "";
}
/* =========================================================
   Open Print Flow
   ========================================================= */
function openPrintFlow() {
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
/* =========================================================
   Reset Print Flow
   ========================================================= */
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
/* =========================================================
   STEP 1
   PDF Save
   ========================================================= */
async function runPdfSaveStep() {
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
/* =========================================================
   Print History Dialog
   ========================================================= */
/** 一覧にはメタデータのみを取得し、PDF本体の読み込みはダウンロード時だけ。 */
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
function appendPrintHistoryEntries(list, entries) {
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
function formatPrintHistoryBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
function formatPrintHistoryDate(timestamp) {
    const date = new Date(timestamp);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
async function downloadHistoryPdf(id, button) {
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
/* =========================================================
   STEP 2
   Print
   ========================================================= */
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
/* =========================================================
   Ribbon JSON Import
   ========================================================= */
async function handleDocumentImport() {
    const file = jsonImportInput.files?.[0];
    if (!file) {
        return;
    }
    try {
        const packageData = await readDocumentPackageFile(file);
        await putTemplate(packageData.template);
        await refreshTemplateCollections();
        applyTemplate(packageData.template, packageData.values);
        showToast(packageData.values
            ? "文書JSONを読み込みました。"
            : "テンプレートJSONを読み込みました。");
    }
    catch (error) {
        console.error("JSONインポートに失敗しました。", error);
        showToast(getErrorMessage(error));
    }
    finally {
        jsonImportInput.value =
            "";
    }
}
/* =========================================================
   Template Add JSON
   ========================================================= */
async function handleTemplateAddImport() {
    const file = templateAddInput.files?.[0];
    if (!file) {
        return;
    }
    try {
        const packageData = await readDocumentPackageFile(file);
        const existing = await getTemplate(packageData.template.id);
        if (existing) {
            throw new Error("同じIDのテンプレートがすでに登録されています。既存テンプレートは「編集」を使用してください。");
        }
        await putTemplate(packageData.template);
        await refreshTemplateCollections();
        applyTemplate(packageData.template);
        showToast("テンプレートを追加しました。");
    }
    catch (error) {
        console.error("テンプレート追加に失敗しました。", error);
        showToast(getErrorMessage(error));
    }
    finally {
        templateAddInput.value =
            "";
    }
}
/* =========================================================
   Template Builder Save
   ========================================================= */
async function saveTemplateFromBuilder(template, mode) {
    if (mode ===
        "create") {
        const existing = await getTemplate(template.id);
        if (existing) {
            throw new Error("同じIDのテンプレートがすでに存在します。");
        }
        await putTemplate(template);
        await refreshTemplateCollections();
        applyTemplate(template);
        showToast("テンプレートを登録しました。");
        return;
    }
    const existing = await getTemplate(template.id);
    if (!existing) {
        throw new Error("編集対象のテンプレートが見つかりません。");
    }
    const editingActiveTemplate = activeTemplate?.id ===
        template.id;
    const preservedValues = editingActiveTemplate
        ? activeValues
        : undefined;
    await putTemplate(template);
    await refreshTemplateCollections();
    if (editingActiveTemplate) {
        applyTemplate(template, preservedValues);
    }
    showToast("テンプレートを更新しました。");
}
/* =========================================================
   Template Selection
   ========================================================= */
async function handleTemplateSelection() {
    const id = templateSelect.value;
    if (!id) {
        clearActiveTemplate();
        return;
    }
    const template = await getTemplate(id);
    if (!template) {
        await refreshTemplateCollections();
        clearActiveTemplate();
        showToast("選択したテンプレートを読み込めませんでした。");
        return;
    }
    applyTemplate(template);
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
    const selectedId = activeTemplate?.id ??
        templateSelect.value;
    templateSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value =
        "";
    placeholder.textContent =
        templates.length ===
            0
            ? "テンプレートがありません"
            : "テンプレートを選択";
    templateSelect.appendChild(placeholder);
    for (const template of templates) {
        const option = document.createElement("option");
        option.value =
            template.id;
        option.textContent =
            template.name;
        templateSelect.appendChild(option);
    }
    templateSelect.disabled =
        templates.length ===
            0;
    if (selectedId &&
        templates.some((template) => template.id ===
            selectedId)) {
        templateSelect.value =
            selectedId;
    }
    else {
        templateSelect.value =
            "";
    }
}
/* =========================================================
   Manager List
   ========================================================= */
function renderTemplateManagerList() {
    templateList.replaceChildren();
    const isEmpty = templates.length ===
        0;
    templateListEmpty.hidden =
        !isEmpty;
    templateList.hidden =
        isEmpty;
    if (isEmpty) {
        return;
    }
    for (const template of templates) {
        templateList.appendChild(createTemplateCard(template));
    }
}
/* =========================================================
   Manager Card
   ========================================================= */
function createTemplateCard(template) {
    const fragment = templateCardTemplate
        .content
        .cloneNode(true);
    const card = fragment.firstElementChild;
    if (!(card instanceof
        HTMLElement)) {
        throw new Error("テンプレートカードを生成できませんでした。");
    }
    const name = requireChild(card, ".template-card__name");
    const meta = requireChild(card, ".template-card__meta");
    const exportButton = requireChild(card, ".template-card__export-button");
    const editButton = requireChild(card, ".template-card__edit-button");
    const deleteButton = requireChild(card, ".template-card__delete-button");
    name.textContent =
        template.name;
    meta.textContent =
        [
            `ID: ${template.id}`,
            `入力項目: ${getReferencedFields(template).length}件`
        ].join(" / ");
    exportButton.addEventListener("click", () => {
        downloadTemplateJson(template);
        showToast("テンプレートJSONを出力しました。");
    });
    editButton.addEventListener("click", () => {
        templateBuilder.openEdit(template);
    });
    deleteButton.addEventListener("click", () => {
        pendingDeleteTemplateId =
            template.id;
        if (!templateDeleteDialog.open) {
            templateDeleteDialog.showModal();
        }
    });
    return card;
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
    try {
        return localStorage.getItem(ACTIVE_TEMPLATE_STORAGE_KEY);
    }
    catch {
        return null;
    }
}
function storeActiveTemplateId(id) {
    try {
        if (id) {
            localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, id);
            return;
        }
        localStorage.removeItem(ACTIVE_TEMPLATE_STORAGE_KEY);
    }
    catch {
        /*
         * localStorage不可でも
         * 文書作成機能自体は継続する。
         */
    }
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
/* =========================================================
   Error
   ========================================================= */
function getErrorMessage(error) {
    if (error instanceof
        Error &&
        error.message) {
        return error.message;
    }
    return ("処理に失敗しました。");
}
/* =========================================================
   DOM
   ========================================================= */
function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`${selector} が見つかりません。`);
    }
    return element;
}
function requireChild(parent, selector) {
    const element = parent.querySelector(selector);
    if (!element) {
        throw new Error(`${selector} が見つかりません。`);
    }
    return element;
}
//# sourceMappingURL=main.js.map