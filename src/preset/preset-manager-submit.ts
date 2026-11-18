/** PRESET MANAGER editor validation and database save lifecycle. */
import { createPresetDocumentId, isPdfFile, isPreviewImageFile, type PresetDocument, type PresetOrientation } from "./preset.js";
import { getNextPresetSortOrder, putPresetDocument, requestPersistentStorage } from "./preset-db.js";
export interface PresetEditorSubmitDeps {
    readonly titleInput: HTMLInputElement;
    readonly descriptionInput: HTMLTextAreaElement;
    readonly pdfInput: HTMLInputElement;
    readonly previewInput: HTMLInputElement;
    readonly saveButton: HTMLButtonElement;
    readonly dialog: HTMLDialogElement;
    editingDocument: PresetDocument | null;
    readonly editorOrigin: "direct" | "manager";
    getSelectedOrientation: () => PresetOrientation;
    hideEditorError: () => void;
    showEditorError: (message: string) => void;
    notifyChanged: () => Promise<void>;
    refreshManagerList: () => Promise<void>;
    resetEditor: () => void;
    showListView: () => void;
}
export function createPresetEditorSubmit(deps: PresetEditorSubmitDeps) {
 const {titleInput,descriptionInput,pdfInput,previewInput,saveButton,dialog,
        getSelectedOrientation,hideEditorError,showEditorError,notifyChanged,
        refreshManagerList,resetEditor,showListView}=deps;
 async function handleSubmit(
        event: SubmitEvent
    ): Promise<void> {
        // The document being edited is captured at submit time.
        const editingDocument = deps.editingDocument;

        event.preventDefault();


        hideEditorError();


        const title =
            titleInput.value.trim();


        const description =
            descriptionInput
                .value
                .trim();


        const orientation =
            getSelectedOrientation();


        if (
            title.length === 0
        ) {

            showEditorError(
                "タイトルを入力してください。"
            );


            titleInput.focus();


            return;
        }


        const selectedPdf =
            pdfInput.files?.[0] ??
            null;


        const selectedPreview =
            previewInput.files?.[0] ??
            null;


        /* -------------------------------------------------
           PDF
           ------------------------------------------------- */

        if (
            !editingDocument &&
            !selectedPdf
        ) {

            showEditorError(
                "PDFを選択してください。"
            );


            pdfInput.focus();


            return;
        }


        if (
            selectedPdf &&
            !isPdfFile(
                selectedPdf
            )
        ) {

            showEditorError(
                "PDFファイルを選択してください。"
            );


            pdfInput.focus();


            return;
        }


        /* -------------------------------------------------
           Preview
           ------------------------------------------------- */

        if (
            selectedPreview &&
            !isPreviewImageFile(
                selectedPreview
            )
        ) {

            showEditorError(
                "プレビュー画像はPNG、JPEG、WebPのいずれかを選択してください。"
            );


            previewInput.focus();


            return;
        }


        /* -------------------------------------------------
           保存開始
           ------------------------------------------------- */

        saveButton.disabled =
            true;


        const originalButtonText =
            saveButton.textContent;


        saveButton.textContent =
            "保存中...";

        // DBのコミット以降は、画面更新の失敗を保存失敗として扱わない。
        let storageCommitted = false;

        try {

            const now =
                Date.now();


            let presetDocument:
                PresetDocument;


            /* -------------------------------------------------
               更新
               ------------------------------------------------- */

            if (
                editingDocument
            ) {

                presetDocument = {

                    ...editingDocument,

                    title,

                    description,

                    orientation,

                    pdfFileName:
                        selectedPdf
                            ? selectedPdf.name
                            : editingDocument.pdfFileName,

                    pdfMimeType:
                        selectedPdf
                            ? (
                                selectedPdf.type ||
                                "application/pdf"
                            )
                            : editingDocument.pdfMimeType,

                    pdfBlob:
                        selectedPdf ??
                        editingDocument.pdfBlob,

                    previewFileName:
                        selectedPreview
                            ? selectedPreview.name
                            : editingDocument.previewFileName,

                    previewMimeType:
                        selectedPreview
                            ? (
                                selectedPreview.type ||
                                null
                            )
                            : editingDocument.previewMimeType,

                    previewBlob:
                        selectedPreview ??
                        editingDocument.previewBlob,

                    updatedAt:
                        now
                };

            }

            /* -------------------------------------------------
               新規追加
               ------------------------------------------------- */

            else {

                if (
                    !selectedPdf
                ) {

                    throw new Error(
                        "PDFが選択されていません。"
                    );
                }


                const sortOrder =
                    await getNextPresetSortOrder();


                presetDocument = {

                    id:
                        createPresetDocumentId(),

                    title,

                    description,

                    orientation,

                    pdfFileName:
                        selectedPdf.name,

                    pdfMimeType:
                        selectedPdf.type ||
                        "application/pdf",

                    pdfBlob:
                        selectedPdf,

                    previewFileName:
                        selectedPreview
                            ? selectedPreview.name
                            : null,

                    previewMimeType:
                        selectedPreview
                            ? (
                                selectedPreview.type ||
                                null
                            )
                            : null,

                    previewBlob:
                        selectedPreview,

                    sortOrder,

                    createdAt:
                        now,

                    updatedAt:
                        now
                };
            }


            /* -------------------------------------------------
               IndexedDB
               ------------------------------------------------- */

            await putPresetDocument(
                presetDocument
            );
            storageCommitted = true;

            // UI更新に失敗しても、同じIDで再保存して重複作成を防ぐ。
            deps.editingDocument = presetDocument;

            /**
             * 保存後に永続ストレージを要求する。
             *
             * falseでも保存処理自体は成功。
             */
            void requestPersistentStorage();


            /**
             * メイン画面のカードを更新する。
             */
            await notifyChanged();


            /* -------------------------------------------------
               保存後の遷移
               ------------------------------------------------- */

            if (
                deps.editorOrigin ===
                "manager"
            ) {

                await refreshManagerList();


                resetEditor();


                showListView();

            } else {

                dialog.close();
            }

            deps.editingDocument = null;

        } catch (error) {
            const message = storageCommitted
                ? "保存は完了しましたが、画面の更新に失敗しました。ページを再読み込みしてください。再度保存する必要はありません。"
                : "定型印刷物を保存できませんでした。";
            console.error(message, error);
            showEditorError(message);

        } finally {

            saveButton.disabled =
                false;


            saveButton.textContent =
                originalButtonText;
        }
    }
 return {handleSubmit};
}
