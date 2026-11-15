/** PRESET MANAGER DOM lookup. Throws on missing required elements. */
export function resolvePresetManagerElements() {
const settingsButton =
        requireElement<HTMLButtonElement>(
            "#preset-settings-button"
        );

const dialog =
        requireElement<HTMLDialogElement>(
            "#preset-manager-dialog"
        );

const listView =
        requireElement<HTMLElement>(
            "#preset-manager-list-view"
        );

const addButton =
        requireElement<HTMLButtonElement>(
            "#preset-manager-add-button"
        );

const managerList =
        requireElement<HTMLElement>(
            "#preset-manager-list"
        );

const editorView =
        requireElement<HTMLElement>(
            "#preset-editor-view"
        );

const editorBackButton =
        requireElement<HTMLButtonElement>(
            "#preset-editor-back-button"
        );

const editorHeadingTitle =
        requireElement<HTMLElement>(
            "#preset-editor-title"
        );

const editorForm =
        requireElement<HTMLFormElement>(
            "#preset-editor-form"
        );

const editorIdInput =
        requireElement<HTMLInputElement>(
            "#preset-editor-id"
        );

const titleInput =
        requireElement<HTMLInputElement>(
            "#preset-title-input"
        );

const descriptionInput =
        requireElement<HTMLTextAreaElement>(
            "#preset-description-input"
        );

const portraitInput =
        requireElement<HTMLInputElement>(
            "#preset-orientation-portrait"
        );

const landscapeInput =
        requireElement<HTMLInputElement>(
            "#preset-orientation-landscape"
        );

const pdfInput =
        requireElement<HTMLInputElement>(
            "#preset-pdf-input"
        );

const currentPdf =
        requireElement<HTMLElement>(
            "#preset-current-pdf"
        );

const previewInput =
        requireElement<HTMLInputElement>(
            "#preset-preview-input"
        );

const currentPreview =
        requireElement<HTMLElement>(
            "#preset-current-preview"
        );

const editorError =
        requireElement<HTMLElement>(
            "#preset-editor-error"
        );

const cancelButton =
        requireElement<HTMLButtonElement>(
            "#preset-editor-cancel-button"
        );

const saveButton =
        requireElement<HTMLButtonElement>(
            "#preset-editor-save-button"
        );
return { settingsButton, dialog, listView, addButton, managerList, editorView, editorBackButton, editorHeadingTitle, editorForm, editorIdInput, titleInput, descriptionInput, portraitInput, landscapeInput, pdfInput, currentPdf, previewInput, currentPreview, editorError, cancelButton, saveButton };
}
import { requireElement } from "./preset-manager-utils.js";
