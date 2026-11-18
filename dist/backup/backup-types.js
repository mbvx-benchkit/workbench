import { validateVaultConfig } from "../../shared/print-history-vault.js";
import { requireRecord, requireString, requireNonNegativeInteger, requireFiniteNumber, requireUniqueIds, requireSafeArchivePath } from "./archive-validation.js";
/* =========================================================
   Constants
   ========================================================= */
export const WORKBENCH_BACKUP_VERSION = 3;
export const DOCUMENT_TEMPLATES_VERSION = 1;
export const PRINT_HISTORY_ARCHIVE_VERSION = 1;
// 出力側と復元側で共通の履歴件数上限。上限超過のバックアップは生成しない。
export const MAX_PRINT_HISTORY_RECORDS = 5000;
export const PRESET_DOCUMENTS_VERSION = 1;
export const RED_INDEX_VERSION = 1;
export function parsePrintHistoryArchive(value) {
    const record = requireRecord(value, "document_builder/print-history/history.json");
    if (record.version !== PRINT_HISTORY_ARCHIVE_VERSION || !Array.isArray(record.documents)) {
        throw new Error("PDF出力履歴のバックアップ形式が不正です。");
    }
    if (record.documents.length > MAX_PRINT_HISTORY_RECORDS) {
        throw new Error("PDF出力履歴の件数が多すぎます。");
    }
    const documents = record.documents.map((value, index) => {
        const path = `printHistory.documents[${index}]`;
        const item = requireRecord(value, path);
        requireString(item.id, `${path}.id`, 256, true);
        requireString(item.recipientName, `${path}.recipientName`, 512);
        requireString(item.fileName, `${path}.fileName`, 1024, true);
        if (!item.fileName.toLowerCase().endsWith(".pdf")) {
            throw new Error(`${path}.fileName はPDFファイル名である必要があります。`);
        }
        requireNonNegativeInteger(item.createdAt, `${path}.createdAt`);
        if (item.pdfMimeType !== "application/pdf") {
            throw new Error(`${path}.pdfMimeType が不正です。`);
        }
        const pdfPath = requireString(item.pdfPath, `${path}.pdfPath`, 2048, true);
        requireSafeArchivePath(pdfPath, "document_builder/print-history/pdf/");
        return {
            id: item.id,
            recipientName: item.recipientName,
            fileName: item.fileName,
            createdAt: item.createdAt,
            pdfMimeType: "application/pdf",
            pdfPath
        };
    });
    requireUniqueIds(documents, "PDF出力履歴");
    if (new Set(documents.map(document => document.pdfPath)).size !== documents.length) {
        throw new Error("PDF出力履歴に重複したファイルパスがあります。");
    }
    return { version: PRINT_HISTORY_ARCHIVE_VERSION, documents };
}
/** Validate the sealed history manifest before trusting any file path. */
export function parseSealedHistoryArchive(value) {
    const record = requireRecord(value, "document_builder/print-history/history.json");
    if (record.version !== 2 || !Array.isArray(record.documents) || record.documents.length > MAX_PRINT_HISTORY_RECORDS) {
        throw new Error("暗号化PDF履歴のバックアップ形式が不正です。");
    }
    const config = record.config === null ? null : validateVaultConfig(record.config);
    if (record.documents.length && !config)
        throw new Error("PDF履歴の暗号化設定がありません。");
    const result = record.documents.map((value, index) => {
        const item = requireRecord(value, `sealedHistory.documents[${index}]`);
        const id = requireString(item.id, `sealedHistory.documents[${index}].id`, 256, true);
        const pdfPath = requireString(item.pdfPath, `sealedHistory.documents[${index}].pdfPath`, 2048, true);
        requireSafeArchivePath(pdfPath, "document_builder/print-history/encrypted/");
        requireNonNegativeInteger(item.createdAt, "createdAt");
        requireNonNegativeInteger(item.pdfBytes, "pdfBytes");
        if (item.pdfBytes > 64 * 1024 * 1024)
            throw new Error("暗号化PDF履歴のサイズが上限を超えています。");
        for (const [value, name, length] of [[item.pdfIv, "pdfIv", 12], [item.metaIv, "metaIv", 12]]) {
            if (!Array.isArray(value) || value.length !== length || value.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) {
                throw new Error(`暗号化PDF履歴の${name}が不正です。`);
            }
        }
        if (!Array.isArray(item.encryptedMeta) || item.encryptedMeta.length < 16 || item.encryptedMeta.length > 65536 ||
            item.encryptedMeta.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) {
            throw new Error("暗号化PDF履歴のメタデータが不正です。");
        }
        return { id, createdAt: item.createdAt, pdfBytes: item.pdfBytes, pdfPath,
            pdfIv: item.pdfIv, metaIv: item.metaIv, encryptedMeta: item.encryptedMeta };
    });
    requireUniqueIds(result, "暗号化PDF履歴");
    if (new Set(result.map(entry => entry.pdfPath)).size !== result.length)
        throw new Error("暗号化PDF履歴のパスが重複しています。");
    return { version: 2, config, documents: result };
}
/* =========================================================
   Manifest Parser
   ========================================================= */
export function parseWorkbenchBackupManifest(value) {
    const record = requireRecord(value, "manifest.json");
    if (record.format !==
        "workbench-backup") {
        throw new Error("WORKBENCHバックアップではありません。");
    }
    if (record.version !== 1 &&
        record.version !== 2 &&
        record.version !== WORKBENCH_BACKUP_VERSION) {
        throw new Error("対応していないバックアップバージョンです。");
    }
    requireString(record.createdAt, "manifest.createdAt", 128);
    const contents = requireRecord(record.contents, "manifest.contents");
    const documentBuilder = requireRecord(contents.documentBuilder, "manifest.contents.documentBuilder");
    const redIndex = requireRecord(contents.redIndex, "manifest.contents.redIndex");
    const presetDocuments = requireRecord(contents.presetDocuments, "manifest.contents.presetDocuments");
    requireNonNegativeInteger(documentBuilder.templateCount, "manifest.contents.documentBuilder.templateCount");
    if (typeof redIndex.present !==
        "boolean") {
        throw new Error("manifest.contents.redIndex.present が不正です。");
    }
    requireNonNegativeInteger(presetDocuments.documentCount, "manifest.contents.presetDocuments.documentCount");
    requireNonNegativeInteger(presetDocuments.pdfCount, "manifest.contents.presetDocuments.pdfCount");
    requireNonNegativeInteger(presetDocuments.previewImageCount, "manifest.contents.presetDocuments.previewImageCount");
    if (record.version >= 2) {
        const history = requireRecord(contents.printHistory, "manifest.contents.printHistory");
        requireNonNegativeInteger(history.documentCount, "manifest.contents.printHistory.documentCount");
        requireNonNegativeInteger(history.pdfCount, "manifest.contents.printHistory.pdfCount");
    }
    return value;
}
/* =========================================================
   Document Templates Parser
   ========================================================= */
export function parseDocumentTemplatesArchive(value) {
    const record = requireRecord(value, "document_builder/templates.json");
    if (record.version !==
        DOCUMENT_TEMPLATES_VERSION) {
        throw new Error("文書テンプレートのバックアップバージョンが不正です。");
    }
    const templates = parseDocumentTemplates(record.templates);
    return {
        version: DOCUMENT_TEMPLATES_VERSION,
        templates
    };
}
export function parseDocumentTemplates(value) {
    if (!Array.isArray(value)) {
        throw new Error("文書テンプレート一覧が不正です。");
    }
    if (value.length >
        10000) {
        throw new Error("文書テンプレート件数が多すぎます。");
    }
    const templates = value.map((template, index) => parseDocumentTemplate(template, index));
    requireUniqueIds(templates, "文書テンプレート");
    return templates;
}
function parseDocumentTemplate(value, index) {
    const record = requireRecord(value, `templates[${index}]`);
    requireString(record.id, `templates[${index}].id`, 256, true);
    requireString(record.name, `templates[${index}].name`, 512, true);
    if (!Array.isArray(record.fields)) {
        throw new Error(`templates[${index}].fields が不正です。`);
    }
    if (record.fields.length >
        1000) {
        throw new Error(`templates[${index}].fields の件数が多すぎます。`);
    }
    record.fields.forEach((field, fieldIndex) => {
        parseDocumentTemplateField(field, index, fieldIndex);
    });
    const document = requireRecord(record.document, `templates[${index}].document`);
    const documentKeys = [
        "topLeft",
        "topRight",
        "opening",
        "body",
        "closing",
        "end"
    ];
    for (const key of documentKeys) {
        requireString(document[key], `templates[${index}].document.${key}`, 1000000);
    }
    return value;
}
function parseDocumentTemplateField(value, templateIndex, fieldIndex) {
    const path = `templates[${templateIndex}].fields[${fieldIndex}]`;
    const record = requireRecord(value, path);
    const id = requireString(record.id, `${path}.id`, 64, true);
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/
        .test(id)) {
        throw new Error(`${path}.id が不正です。`);
    }
    requireString(record.label, `${path}.label`, 512, true);
    if (record.type !==
        "text" &&
        record.type !==
            "textarea" &&
        record.type !==
            "date") {
        throw new Error(`${path}.type が不正です。`);
    }
    if (record.required !==
        undefined &&
        typeof record.required !==
            "boolean") {
        throw new Error(`${path}.required が不正です。`);
    }
    if (record.defaultValue !==
        undefined) {
        requireString(record.defaultValue, `${path}.defaultValue`, 1000000);
    }
    if (record.placeholder !==
        undefined) {
        requireString(record.placeholder, `${path}.placeholder`, 10000);
    }
}
/* =========================================================
   RED INDEX Parser
   ========================================================= */
export function parseRedIndexData(value) {
    const record = requireRecord(value, "red_index/data.json");
    if (record.version !==
        RED_INDEX_VERSION) {
        throw new Error("RED INDEXのバックアップバージョンが不正です。");
    }
    if (!Array.isArray(record.categories)) {
        throw new Error("RED INDEXのcategoriesが不正です。");
    }
    if (record.categories.length >
        10000) {
        throw new Error("RED INDEXのカテゴリ件数が多すぎます。");
    }
    let itemCount = 0;
    record.categories.forEach((category, index) => {
        const categoryRecord = requireRecord(category, `categories[${index}]`);
        requireString(categoryRecord.category, `categories[${index}].category`, 10000);
        if (!Array.isArray(categoryRecord.items)) {
            throw new Error(`categories[${index}].items が不正です。`);
        }
        for (const item of categoryRecord.items) {
            requireString(item, `categories[${index}].items`, 10000);
            itemCount +=
                1;
            if (itemCount >
                100000) {
                throw new Error("RED INDEXの商品件数が多すぎます。");
            }
        }
    });
    return value;
}
/* =========================================================
   Preset Documents Parser
   ========================================================= */
export function parsePresetDocumentsArchive(value) {
    const record = requireRecord(value, "preset_documents/documents.json");
    if (record.version !==
        PRESET_DOCUMENTS_VERSION) {
        throw new Error("定型印刷物のバックアップバージョンが不正です。");
    }
    if (!Array.isArray(record.documents)) {
        throw new Error("定型印刷物一覧が不正です。");
    }
    if (record.documents.length >
        1000) {
        throw new Error("定型印刷物の件数が多すぎます。");
    }
    const documents = record.documents.map((document, index) => parsePresetDocumentMetadata(document, index));
    requireUniqueIds(documents, "定型印刷物");
    return {
        version: PRESET_DOCUMENTS_VERSION,
        documents
    };
}
function parsePresetDocumentMetadata(value, index) {
    const path = `documents[${index}]`;
    const record = requireRecord(value, path);
    requireString(record.id, `${path}.id`, 256, true);
    requireString(record.title, `${path}.title`, 512, true);
    requireString(record.description, `${path}.description`, 10000);
    if (record.orientation !==
        "portrait" &&
        record.orientation !==
            "landscape") {
        throw new Error(`${path}.orientation が不正です。`);
    }
    requireString(record.pdfFileName, `${path}.pdfFileName`, 1024, true);
    const pdfMimeType = requireString(record.pdfMimeType, `${path}.pdfMimeType`, 256, true);
    if (pdfMimeType !==
        "application/pdf") {
        throw new Error(`${path}.pdfMimeType が不正です。`);
    }
    const pdfPath = requireString(record.pdfPath, `${path}.pdfPath`, 2048, true);
    requireSafeArchivePath(pdfPath, "preset_documents/pdf/");
    const previewFileName = requireNullableString(record.previewFileName, `${path}.previewFileName`, 1024);
    const previewMimeType = requireNullableString(record.previewMimeType, `${path}.previewMimeType`, 256);
    const previewPath = requireNullableString(record.previewPath, `${path}.previewPath`, 2048);
    if (previewPath ===
        null) {
        if (previewFileName !==
            null ||
            previewMimeType !==
                null) {
            throw new Error(`${path} のプレビュー情報が不整合です。`);
        }
    }
    else {
        if (previewFileName ===
            null ||
            previewMimeType ===
                null) {
            throw new Error(`${path} のプレビュー情報が不整合です。`);
        }
        if (previewMimeType !==
            "image/png" &&
            previewMimeType !==
                "image/jpeg" &&
            previewMimeType !==
                "image/webp") {
            throw new Error(`${path}.previewMimeType が不正です。`);
        }
        requireSafeArchivePath(previewPath, "preset_documents/images/");
    }
    requireFiniteNumber(record.sortOrder, `${path}.sortOrder`);
    requireNonNegativeInteger(record.createdAt, `${path}.createdAt`);
    requireNonNegativeInteger(record.updatedAt, `${path}.updatedAt`);
    return value;
}
function requireNullableString(value, path, maxLength) {
    if (value ===
        null) {
        return null;
    }
    return requireString(value, path, maxLength, true);
}
//# sourceMappingURL=backup-types.js.map