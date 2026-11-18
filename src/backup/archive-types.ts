/**
 * WORKBENCH: versioned archive metadata models.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Document Builder
   ========================================================= */

export type DocumentTemplateFieldType =
    | "text"
    | "textarea"
    | "date";

export type DocumentTemplateField = {

    id: string;

    label: string;

    type:
    DocumentTemplateFieldType;

    required?: boolean;

    defaultValue?: string;

    placeholder?: string;
};

export type DocumentTemplateLayout = {

    topLeft: string;

    topRight: string;

    opening: string;

    body: string;

    closing: string;

    end: string;
};

export type DocumentTemplate = {

    id: string;

    name: string;

    fields:
    DocumentTemplateField[];

    document:
    DocumentTemplateLayout;
};

/* =========================================================
   PRESET DOCUMENTS
   ========================================================= */

/**
 * Blob自体はZIP内の別ファイルとして保持する。
 *
 * documents.jsonには
 * IndexedDBレコードのメタ情報と、
 * ZIP内のBlobパスだけを保持する。
 */
export type PresetDocumentArchiveMetadata = {

    id: string;

    title: string;

    description: string;

    orientation:
    "portrait" |
    "landscape";

    pdfFileName: string;

    pdfMimeType: string;

    pdfPath: string;

    previewFileName:
    string |
    null;

    previewMimeType:
    string |
    null;

    previewPath:
    string |
    null;

    sortOrder: number;

    createdAt: number;

    updatedAt: number;
};

/* =========================================================
   DOCUMENT BUILDER PDF History
   ========================================================= */

export type PlainHistoryRecord = {
    id: string;
    recipientName: string;
    fileName: string;
    createdAt: number;
    pdfBlob: Blob;
};

export type SealedHistoryRecord = import("../../shared/print-history-vault.js").SealedHistory;
export type PrintHistoryRecord = PlainHistoryRecord | SealedHistoryRecord;
export type HistoryVaultConfig = import("../../shared/print-history-vault.js").VaultConfig;

export type PrintHistoryArchiveMetadata = {
    id: string;
    recipientName: string;
    fileName: string;
    createdAt: number;
    pdfMimeType: "application/pdf";
    pdfPath: string;
};

/* =========================================================
   RED INDEX
   ========================================================= */

export type RedIndexCategory = {

    category: string;

    items: string[];
};
