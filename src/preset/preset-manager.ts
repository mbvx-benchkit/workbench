/* WORKBENCH_STAGE5_PRESET */
import { resolvePresetManagerElements } from "./preset-manager-elements.js";
import { bindPresetManagerEvents } from "./preset-manager-events.js";
/* WORKBENCH_STAGE4_PRESET */
import { createPresetEditorSubmit } from "./preset-manager-submit.js";
/* WORKBENCH_STAGE3_PRESET_LIST */
import { createPresetManagerListView } from "./preset-manager-list-view.js";
/* WORKBENCH_EXTRACT_createActionButton */
import { createPresetActionButton } from "./preset-manager-list-view.js";
import type { PresetManagerOptions, PresetManagerController, EditorOrigin } from "./preset-manager-utils.js";
export type { PresetManagerOptions, PresetManagerController } from "./preset-manager-utils.js";
import { requireElement } from "./preset-manager-utils.js";
import { formatBytes } from "./preset-manager-utils.js";

/**
 * preset-manager.ts
 *
 * 定型印刷物の管理UIを担当する。
 *
 * - 管理モーダル
 * - 登録済み一覧
 * - 新規追加
 * - 編集
 * - プレビュー画像差し替え
 * - 削除
 *
 * Editorには2つの入口がある。
 *
 * direct:
 *   メイン画面最後尾の「新規追加」カード
 *
 * manager:
 *   管理一覧内の「新規追加」または「編集」
 */

import {
    createPresetDocumentId,
    getPresetOrientationLabel,
    isPdfFile,
    isPreviewImageFile,
    PresetDocument,
    PresetOrientation
} from "./preset.js";


import {
    deletePresetDocument,
    getNextPresetSortOrder,
    getPresetDocuments,
    putPresetDocument,
    requestPersistentStorage
} from "./preset-db.js";


/* =========================================================
   Setup
   ========================================================= */

export function setupPresetManager(
    options: PresetManagerOptions
): PresetManagerController {

    /* -----------------------------------------------------
       Dialog
       ----------------------------------------------------- */

    const presetElements = resolvePresetManagerElements();
const { settingsButton, dialog, listView, addButton, managerList, editorView, editorBackButton, editorHeadingTitle, editorForm, editorIdInput, titleInput, descriptionInput, portraitInput, landscapeInput, pdfInput, currentPdf, previewInput, currentPreview, editorError, cancelButton, saveButton } = presetElements;





    /* -----------------------------------------------------
       List View
       ----------------------------------------------------- */










    /* -----------------------------------------------------
       Editor View
       ----------------------------------------------------- */

















































    /* -----------------------------------------------------
       State
       ----------------------------------------------------- */

    let editingDocument:
        PresetDocument |
        null =
        null;


    let editorOrigin:
        EditorOrigin =
        "direct";


    let managerPreviewObjectUrls:
        string[] =
        [];


    /* =====================================================
       View
       ===================================================== */

    // Stage 3: list rendering is delegated; the controller owns the state.
    const presetListView = createPresetManagerListView({
        managerList,
        rememberPreviewUrl: url => { managerPreviewObjectUrls.push(url); },
        revokeManagerPreviewObjectUrls,
        openEditEditor,
        handleDelete,
        createActionButton,
        formatBytes
    });

    function showListView():
        void {

        listView.hidden =
            false;


        editorView.hidden =
            true;
    }


    function showEditorView():
        void {

        listView.hidden =
            true;


        editorView.hidden =
            false;
    }


    /* =====================================================
       Dialog
       ===================================================== */

    async function openManager():
        Promise<void> {

        showListView();


        if (
            !dialog.open
        ) {

            dialog.showModal();
        }


        try {

            await refreshManagerList();

        } catch (error) {

            console.error(
                "定型印刷物の管理一覧を読み込めませんでした。",
                error
            );


            renderManagerListError();
        }
    }


    /**
     * メイン画面最後尾の
     * 「新規追加」カードから開く。
     *
     * 管理一覧を経由していないため、
     * 戻るボタンは表示しない。
     */
    function openCreateEditor():
        void {

        editorOrigin =
            "direct";


        resetEditor();


        editorBackButton.hidden =
            true;


        editorHeadingTitle.textContent =
            "定型印刷物を追加";


        saveButton.textContent =
            "追加";


        showEditorView();


        if (
            !dialog.open
        ) {

            dialog.showModal();
        }


        focusLater(
            titleInput
        );
    }


    /**
     * 管理一覧内の
     * 「新規追加」から開く。
     *
     * 管理一覧へ戻れるようにする。
     */
    function openCreateEditorFromManager():
        void {

        editorOrigin =
            "manager";


        resetEditor();


        editorBackButton.hidden =
            false;


        editorHeadingTitle.textContent =
            "定型印刷物を追加";


        saveButton.textContent =
            "追加";


        showEditorView();


        focusLater(
            titleInput
        );
    }


    /* =====================================================
       Editor
       ===================================================== */

    function resetEditor():
        void {

        editingDocument =
            null;


        editorForm.reset();


        editorIdInput.value =
            "";


        portraitInput.checked =
            true;


        landscapeInput.checked =
            false;


        pdfInput.value =
            "";


        previewInput.value =
            "";


        currentPdf.textContent =
            "PDFが選択されていません。";


        currentPreview.textContent =
            "指定しない場合はPDFアイコンを表示します。";


        hideEditorError();
    }


    /**
     * 管理一覧から既存データを編集する。
     */
    function openEditEditor(
        presetDocument: PresetDocument
    ): void {

        editorOrigin =
            "manager";


        editingDocument =
            presetDocument;


        editorForm.reset();


        editorIdInput.value =
            presetDocument.id;


        titleInput.value =
            presetDocument.title;


        descriptionInput.value =
            presetDocument.description;


        portraitInput.checked =
            presetDocument.orientation ===
            "portrait";


        landscapeInput.checked =
            presetDocument.orientation ===
            "landscape";


        pdfInput.value =
            "";


        previewInput.value =
            "";


        currentPdf.textContent =
            [
                "現在:",
                presetDocument.pdfFileName,
                `(${formatBytes(
                    presetDocument.pdfBlob.size
                )})`
            ].join(" ");


        if (
            presetDocument.previewBlob &&
            presetDocument.previewFileName
        ) {

            currentPreview.textContent =
                [
                    "現在:",
                    presetDocument.previewFileName,
                    `(${formatBytes(
                        presetDocument.previewBlob.size
                    )})`
                ].join(" ");

        } else {

            currentPreview.textContent =
                "プレビュー画像は設定されていません。";
        }


        editorBackButton.hidden =
            false;


        editorHeadingTitle.textContent =
            "定型印刷物を編集";


        saveButton.textContent =
            "保存";


        hideEditorError();


        showEditorView();


        if (
            !dialog.open
        ) {

            dialog.showModal();
        }


        focusLater(
            titleInput
        );
    }


    /**
     * Editorを離れる。
     *
     * directならdialogを閉じる。
     * managerなら管理一覧へ戻る。
     */
    function leaveEditor():
        void {

        if (
            editorOrigin ===
            "manager"
        ) {

            resetEditor();


            showListView();


            return;
        }


        dialog.close();
    }


    /* =====================================================
       Orientation
       ===================================================== */

    function getSelectedOrientation():
        PresetOrientation {

        if (
            landscapeInput.checked
        ) {

            return "landscape";
        }


        return "portrait";
    }


    /* =====================================================
       Manager List
       ===================================================== */

    async function refreshManagerList():
        Promise<void> {

        revokeManagerPreviewObjectUrls();


        managerList.replaceChildren();


        const documents =
            await getPresetDocuments();


        if (
            documents.length === 0
        ) {

            renderManagerEmpty();


            return;
        }


        for (
            const presetDocument
            of documents
        ) {

            managerList.appendChild(
                createManagerItem(
                    presetDocument
                )
            );
        }
    }


    function renderManagerEmpty():
        void {
    return presetListView.renderManagerEmpty();
}


    function renderManagerListError():
        void {
    return presetListView.renderManagerListError();
}


    /* =====================================================
       Manager Item
       ===================================================== */

    function createManagerItem(
        presetDocument: PresetDocument
    ): HTMLElement {
    return presetListView.createManagerItem(presetDocument);
}


    function createManagerPreview(
        presetDocument: PresetDocument
    ): HTMLElement {
    return presetListView.createManagerPreview(presetDocument);
}


    function createManagerBody(
        presetDocument: PresetDocument
    ): HTMLElement {
    return presetListView.createManagerBody(presetDocument);
}


    function createManagerActions(
        presetDocument: PresetDocument
    ): HTMLElement {
    return presetListView.createManagerActions(presetDocument);
}


    function createActionButton(label: string): HTMLButtonElement {
    return createPresetActionButton(label);
}


    /* =====================================================
       Delete
       ===================================================== */

    async function handleDelete(
        presetDocument: PresetDocument
    ): Promise<void> {

        const confirmed =
            window.confirm(
                `「${presetDocument.title}」を削除しますか？\n\nこのPCに保存されているPDFも削除されます。`
            );


        if (
            !confirmed
        ) {

            return;
        }


        // IndexedDBの確定と、保存後の画面更新は独立した操作。
        try {
            await deletePresetDocument(presetDocument.id);
        } catch (error) {
            console.error("定型印刷物の削除に失敗しました。", error);
            window.alert("定型印刷物を削除できませんでした。データは変更されていません。");
            return;
        }

        // notifyChangedが失敗しても管理一覧の再読込を試みる。
        let viewFailed = false;
        try {
            await notifyChanged();
        } catch (error) {
            viewFailed = true;
            console.error("削除済みですがメイン画面の更新に失敗しました。", error);
        }
        try {
            await refreshManagerList();
        } catch (error) {
            viewFailed = true;
            console.error("削除済みですが管理一覧の更新に失敗しました。", error);
            renderManagerListError();
        }
        if (viewFailed) {
            window.alert("定型印刷物は削除済みです。画面の更新に失敗したため、ページを再読み込みしてください。");
        }
    }


    /* =====================================================
       Submit
       ===================================================== */

    async function handleSubmit(
        event: SubmitEvent
    ): Promise<void> {
    return presetEditorSubmit.handleSubmit(event);
}


    /* =====================================================
       Change Notification
       ===================================================== */

    async function notifyChanged():
        Promise<void> {

        await options.onChanged();
    }


    /* =====================================================
       Editor Error
       ===================================================== */

    function showEditorError(
        message: string
    ): void {

        editorError.textContent =
            message;


        editorError.hidden =
            false;
    }


    function hideEditorError():
        void {

        editorError.textContent =
            "";


        editorError.hidden =
            true;
    }


    /* =====================================================
       Focus
       ===================================================== */

    function focusLater(
        element: HTMLElement
    ): void {

        window.setTimeout(
            () => {

                element.focus();
            },
            0
        );
    }


    /* =====================================================
       Events
       ===================================================== */

    /**
     * ⚙
     *
     * 管理一覧を開く。
     */
    // Stage 4: the controller owns editable state, the submit module owns the save workflow.
    const presetEditorSubmit = createPresetEditorSubmit({
        titleInput,descriptionInput,pdfInput,previewInput,saveButton,dialog,
        get editingDocument() { return editingDocument; },
        set editingDocument(value) { editingDocument = value; },
        get editorOrigin() { return editorOrigin; },
        getSelectedOrientation,hideEditorError,showEditorError,notifyChanged,
        refreshManagerList,resetEditor,showListView
    });

    bindPresetManagerEvents(presetElements, {
    openManager, openCreateEditorFromManager, leaveEditor, handleSubmit,
    revokeManagerPreviewObjectUrls, resetEditor, showListView,
    resetEditorOrigin: () => { editorOrigin = "direct"; }
});


    /* =====================================================
       Controller
       ===================================================== */

    return {

        openManager,

        openCreateEditor
    };


    /* =====================================================
       Local helpers
       ===================================================== */

    function revokeManagerPreviewObjectUrls():
        void {

        for (
            const objectUrl
            of managerPreviewObjectUrls
        ) {

            URL.revokeObjectURL(
                objectUrl
            );
        }


        managerPreviewObjectUrls =
            [];
    }
}