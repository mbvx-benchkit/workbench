/** Shared DOCUMENT BUILDER DOM references. One responsibility: required element acquisition. */
import type { DocumentRenderElements } from "../document-render.js";
export const jsonImportInput =
    requireElement<HTMLInputElement>(
        "#json-import-input"
    );

export const jsonImportButton =
    requireElement<HTMLButtonElement>(
        "#json-import-button"
    );

export const jsonExportButton =
    requireElement<HTMLButtonElement>(
        "#json-export-button"
    );

export const templateSelect =
    requireElement<HTMLSelectElement>(
        "#template-select"
    );

export const templateSettingsButton =
    requireElement<HTMLButtonElement>(
        "#template-settings-button"
    );

export const printHistoryButton =
    requireElement<HTMLButtonElement>(
        "#print-history-button"
    );

export const printButton =
    requireElement<HTMLButtonElement>(
        "#print-button"
    );

export const documentFieldsEmpty =
    requireElement<HTMLElement>(
        "#document-fields-empty"
    );

export const documentFieldsForm =
    requireElement<HTMLFormElement>(
        "#document-fields-form"
    );

export const documentFields =
    requireElement<HTMLElement>(
        "#document-fields"
    );

export const activeTemplateName =
    requireElement<HTMLElement>(
        "#active-template-name"
    );

export const documentPage =
    requireElement<HTMLElement>(
        "#document-page"
    );

export const documentPreviewEmpty =
    requireElement<HTMLElement>(
        "#document-preview-empty"
    );

export const documentContent =
    requireElement<HTMLElement>(
        "#document-content"
    );

export const documentRenderElements:
    DocumentRenderElements = {

    topLeft:
        requireElement<HTMLElement>(
            "#document-top-left"
        ),

    topRight:
        requireElement<HTMLElement>(
            "#document-top-right"
        ),

    opening:
        requireElement<HTMLElement>(
            "#document-opening"
        ),

    body:
        requireElement<HTMLElement>(
            "#document-body"
        ),

    closing:
        requireElement<HTMLElement>(
            "#document-closing"
        ),

    end:
        requireElement<HTMLElement>(
            "#document-end"
        )
};

export const printFlowDialog =
    requireElement<HTMLDialogElement>(
        "#print-flow-dialog"
    );

export const printFlowCloseButton =
    requireElement<HTMLButtonElement>(
        "#print-flow-close-button"
    );

export const printSavePdfButton =
    requireElement<HTMLButtonElement>(
        "#print-save-pdf-button"
    );

export const printFinalButton =
    requireElement<HTMLButtonElement>(
        "#print-final-button"
    );

export const printStepOne =
    requireElement<HTMLElement>(
        "#print-step-one"
    );

export const printStepTwo =
    requireElement<HTMLElement>(
        "#print-step-two"
    );

export const printStepOneStatus =
    requireElement<HTMLElement>(
        "#print-step-one-status"
    );

export const printFileName =
    requireElement<HTMLElement>(
        "#print-file-name"
    );

export const printHistoryDialog =
    requireElement<HTMLDialogElement>("#print-history-dialog");

export const printHistoryCloseButton =
    requireElement<HTMLButtonElement>("#print-history-close-button");

export const printHistoryList =
    requireElement<HTMLElement>("#print-history-list");

export const printHistoryStats =
    requireElement<HTMLElement>("#print-history-stats");

export const printHistoryMoreButton =
    requireElement<HTMLButtonElement>("#print-history-more-button");

export const templateSettingsDialog =
    requireElement<HTMLDialogElement>(
        "#template-settings-dialog"
    );

export const templateDialogCloseButton =
    requireElement<HTMLButtonElement>(
        "#template-dialog-close-button"
    );

export const templateDialogDoneButton =
    requireElement<HTMLButtonElement>(
        "#template-dialog-done-button"
    );

export const templateBuilderButton =
    requireElement<HTMLButtonElement>(
        "#template-builder-button"
    );

export const templateAddInput =
    requireElement<HTMLInputElement>(
        "#template-add-input"
    );

export const templateAddButton =
    requireElement<HTMLButtonElement>(
        "#template-add-button"
    );

export const templateListEmpty =
    requireElement<HTMLElement>(
        "#template-list-empty"
    );

export const templateList =
    requireElement<HTMLElement>(
        "#template-list"
    );

export const templateCardTemplate =
    requireElement<HTMLTemplateElement>(
        "#template-card-template"
    );

export const templateDeleteDialog =
    requireElement<HTMLDialogElement>(
        "#template-delete-dialog"
    );

export const templateDeleteCancelButton =
    requireElement<HTMLButtonElement>(
        "#template-delete-cancel-button"
    );

export const templateDeleteConfirmButton =
    requireElement<HTMLButtonElement>(
        "#template-delete-confirm-button"
    );

export const documentToast =
    requireElement<HTMLElement>(
        "#document-toast"
    );

import { requireElement } from "./document-utils.js";
