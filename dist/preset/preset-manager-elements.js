/** PRESET MANAGER DOM lookup. Throws on missing required elements. */
export function resolvePresetManagerElements() {
    const settingsButton = requireElement("#preset-settings-button");
    const dialog = requireElement("#preset-manager-dialog");
    const listView = requireElement("#preset-manager-list-view");
    const addButton = requireElement("#preset-manager-add-button");
    const managerList = requireElement("#preset-manager-list");
    const editorView = requireElement("#preset-editor-view");
    const editorBackButton = requireElement("#preset-editor-back-button");
    const editorHeadingTitle = requireElement("#preset-editor-title");
    const editorForm = requireElement("#preset-editor-form");
    const editorIdInput = requireElement("#preset-editor-id");
    const titleInput = requireElement("#preset-title-input");
    const descriptionInput = requireElement("#preset-description-input");
    const portraitInput = requireElement("#preset-orientation-portrait");
    const landscapeInput = requireElement("#preset-orientation-landscape");
    const pdfInput = requireElement("#preset-pdf-input");
    const currentPdf = requireElement("#preset-current-pdf");
    const previewInput = requireElement("#preset-preview-input");
    const currentPreview = requireElement("#preset-current-preview");
    const editorError = requireElement("#preset-editor-error");
    const cancelButton = requireElement("#preset-editor-cancel-button");
    const saveButton = requireElement("#preset-editor-save-button");
    return { settingsButton, dialog, listView, addButton, managerList, editorView, editorBackButton, editorHeadingTitle, editorForm, editorIdInput, titleInput, descriptionInput, portraitInput, landscapeInput, pdfInput, currentPdf, previewInput, currentPreview, editorError, cancelButton, saveButton };
}
import { requireElement } from "./preset-manager-utils.js";
//# sourceMappingURL=preset-manager-elements.js.map