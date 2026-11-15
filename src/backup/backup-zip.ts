import type { ArchiveReadBudget } from "./archive-file-utils.js";
import { isPng, isJpeg, isWebp, sanitizeFileName } from "./archive-file-utils.js";
import { createBlob, stringifyJson } from "./archive-file-utils.js";
import { getImageExtension } from "./archive-file-utils.js";

/**
 * backup-zip.ts
 *
 * WORKBENCHバックアップZIPの
 * 生成と読み込みを担当する。
 *
 * ZIP構造:
 *
 * manifest.json
 *
 * document_builder/
 *   templates.json
 *   print-history/history.json
 *   print-history/pdf/*.pdf
 *
 * red_index/
 *   data.json
 *
 * preset_documents/
 *   documents.json
 *   pdf/
 *     ...
 *   images/
 *     ...
 */

import JSZip from "jszip";
import {
    BackupSizeBudget, assertBackupEntrySize,
    MAX_JSON_TEXT_LENGTH, MIB, MAX_ARCHIVE_ENTRIES,
    MAX_ARCHIVE_EXPANDED_BYTES, MAX_ARCHIVE_ENTRY_BYTES,
    MAX_ARCHIVE_IMAGE_BYTES
} from "./backup-limits.js";


import type {
    PresetDocument
} from "../preset/preset.js";


import {
    DOCUMENT_TEMPLATES_VERSION,
    PRESET_DOCUMENTS_VERSION,
    PRINT_HISTORY_ARCHIVE_VERSION,
    MAX_PRINT_HISTORY_RECORDS,
    WORKBENCH_BACKUP_VERSION,
    parseDocumentTemplatesArchive,
    parsePresetDocumentsArchive,
    parsePrintHistoryArchive,
    parseRedIndexData,
    parseWorkbenchBackupManifest,
    type PresetDocumentArchiveMetadata,
    type PresetDocumentsArchive,
    type PrintHistoryArchive,
    type PrintHistoryArchiveMetadata,
    type PrintHistoryRecord,
    type ImportedWorkbenchBackupSnapshot,
    type WorkbenchBackupManifest,
    type WorkbenchBackupSnapshot
} from "./backup-types.js";


/* =========================================================
   Paths
   ========================================================= */

const MANIFEST_PATH =
    "manifest.json";


const DOCUMENT_TEMPLATES_PATH =
    "document_builder/templates.json";


const RED_INDEX_PATH =
    "red_index/data.json";


const PRESET_DOCUMENTS_PATH =
    "preset_documents/documents.json";

const PRINT_HISTORY_PATH =
    "document_builder/print-history/history.json";


/* =========================================================
   Limits
   ========================================================= */

/* =========================================================
   Export
   ========================================================= */

export async function createBackupArchive(
    snapshot: WorkbenchBackupSnapshot
): Promise<Blob> {

    // 復元側と同じ制限を、PDF本体をZIPへ詰め始める前に検査する。
    if (snapshot.printHistory.length > MAX_PRINT_HISTORY_RECORDS) {
        throw new Error(`PDF出力履歴は最大${MAX_PRINT_HISTORY_RECORDS.toLocaleString("ja-JP")}件までバックアップできます。`);
    }

    const zip = new JSZip();
    const budget = new BackupSizeBudget();
    const addJson = (path: string, content: unknown) => {
        const json = stringifyJson(content);
        budget.add(path, new TextEncoder().encode(json).byteLength);
        zip.file(path, json);
    };
    const addBinary = (path: string, blob: Blob) => {
        budget.add(path, blob.size);
        zip.file(path, blob);
    };


    /* -----------------------------------------------------
       DOCUMENT BUILDER
       ----------------------------------------------------- */

    addJson(
        DOCUMENT_TEMPLATES_PATH,
        (
            {
                version:
                    DOCUMENT_TEMPLATES_VERSION,

                templates:
                    snapshot.documentTemplates
            }
        )
    );


    /* -----------------------------------------------------
       RED INDEX
       ----------------------------------------------------- */

    addJson(RED_INDEX_PATH, snapshot.redIndex);


    /* -----------------------------------------------------
       PRESET DOCUMENTS
       ----------------------------------------------------- */

    const presetMetadata:
        PresetDocumentArchiveMetadata[] =
        [];


    let previewImageCount =
        0;


    for (
        let index = 0;
        index <
        snapshot.presetDocuments.length;
        index += 1
    ) {

        const document =
            snapshot.presetDocuments[
            index
            ];


        const sequence =
            String(
                index + 1
            )
                .padStart(
                    3,
                    "0"
                );


        const safeTitle =
            sanitizeFileName(
                document.title
            );


        /* -------------------------------------------------
           PDF
           ------------------------------------------------- */

        const pdfPath =
            [
                "preset_documents/pdf/",
                sequence,
                "_",
                safeTitle,
                ".pdf"
            ].join("");


        addBinary(pdfPath, document.pdfBlob);


        /* -------------------------------------------------
           Preview
           ------------------------------------------------- */

        let previewPath:
            string |
            null =
            null;


        if (
            document.previewBlob &&
            document.previewFileName &&
            document.previewMimeType
        ) {

            const extension =
                getImageExtension(
                    document.previewMimeType
                );


            previewPath =
                [
                    "preset_documents/images/",
                    sequence,
                    "_",
                    safeTitle,
                    ".",
                    extension
                ].join("");


            addBinary(previewPath, document.previewBlob);


            previewImageCount +=
                1;
        }


        presetMetadata.push(
            {
                id:
                    document.id,

                title:
                    document.title,

                description:
                    document.description,

                orientation:
                    document.orientation,

                pdfFileName:
                    document.pdfFileName,

                pdfMimeType:
                    document.pdfMimeType,

                pdfPath,

                previewFileName:
                    document.previewFileName,

                previewMimeType:
                    document.previewMimeType,

                previewPath,

                sortOrder:
                    document.sortOrder,

                createdAt:
                    document.createdAt,

                updatedAt:
                    document.updatedAt
            }
        );
    }


    const presetArchive:
        PresetDocumentsArchive =
    {

        version:
            PRESET_DOCUMENTS_VERSION,

        documents:
            presetMetadata
    };


    addJson(PRESET_DOCUMENTS_PATH, presetArchive);


    /* -----------------------------------------------------
       DOCUMENT BUILDER PDF HISTORY
       ----------------------------------------------------- */

    const historyMetadata: PrintHistoryArchiveMetadata[] = [];

    for (let index = 0; index < snapshot.printHistory.length; index += 1) {
        const entry = snapshot.printHistory[index];
        const pdfPath = `document_builder/print-history/pdf/${String(index + 1).padStart(5, "0")}.pdf`;
        addBinary(pdfPath, entry.pdfBlob);
        historyMetadata.push({
            id: entry.id,
            recipientName: entry.recipientName,
            fileName: entry.fileName,
            createdAt: entry.createdAt,
            pdfMimeType: "application/pdf",
            pdfPath
        });
    }

    const historyArchive: PrintHistoryArchive = {
        version: PRINT_HISTORY_ARCHIVE_VERSION,
        documents: historyMetadata
    };

    addJson(PRINT_HISTORY_PATH, historyArchive);


    /* -----------------------------------------------------
       Manifest
       ----------------------------------------------------- */

    const manifest:
        WorkbenchBackupManifest =
    {

        format:
            "workbench-backup",

        version:
            WORKBENCH_BACKUP_VERSION,

        createdAt:
            new Date()
                .toISOString(),

        contents: {

            documentBuilder: {

                templateCount:
                    snapshot
                        .documentTemplates
                        .length
            },

            redIndex: {

                present:
                    snapshot.redIndex !==
                    null
            },

            presetDocuments: {

                documentCount:
                    snapshot
                        .presetDocuments
                        .length,

                pdfCount:
                    snapshot
                        .presetDocuments
                        .length,

                previewImageCount
            },

            printHistory: {
                documentCount: snapshot.printHistory.length,
                pdfCount: snapshot.printHistory.length
            }
        }
    };


    addJson(MANIFEST_PATH, manifest);


    /**
     * PDF / PNG / JPEG / WebPは既に圧縮済みなので、
     * ZIP側では再圧縮せずSTOREする。
     *
     * CPU負荷と待ち時間を抑える。
     */
    return zip.generateAsync(
        {
            type:
                "blob",

            compression:
                "STORE",

            mimeType:
                "application/zip"
        }
    );
}


/* =========================================================
   Import
   ========================================================= */

export async function readBackupArchive(
    file:
        Blob |
        ArrayBuffer |
        Uint8Array
): Promise<ImportedWorkbenchBackupSnapshot> {

    let zip:
        JSZip;


    try {

        zip =
            await JSZip.loadAsync(
                file
            );

    } catch {

        throw new Error(
            "ZIPファイルを読み込めませんでした。"
        );
    }


    // Check central-directory sizes before inflating any ZIP member.
    assertArchiveLimits(zip);
    const readBudget = { used: 0 };

    /* -----------------------------------------------------
       Manifest
       ----------------------------------------------------- */

    const manifest =
        parseWorkbenchBackupManifest(
            await readJsonFile(zip, MANIFEST_PATH, readBudget)
        );


    /* -----------------------------------------------------
       DOCUMENT BUILDER
       ----------------------------------------------------- */

    const documentArchive =
        parseDocumentTemplatesArchive(
            await readJsonFile(zip, DOCUMENT_TEMPLATES_PATH, readBudget)
        );


    /* -----------------------------------------------------
       RED INDEX
       ----------------------------------------------------- */

    const redIndexRaw =
        await readJsonFile(zip, RED_INDEX_PATH, readBudget);


    const redIndex =
        redIndexRaw ===
            null
            ? null
            : parseRedIndexData(
                redIndexRaw
            );


    /* -----------------------------------------------------
       PRESET DOCUMENTS metadata
       ----------------------------------------------------- */

    const presetArchive =
        parsePresetDocumentsArchive(
            await readJsonFile(zip, PRESET_DOCUMENTS_PATH, readBudget)
        );


    /* -----------------------------------------------------
       DOCUMENT BUILDER PDF HISTORY metadata
       v1バックアップは履歴を持たない。
       ----------------------------------------------------- */

    const historyArchive = manifest.version === WORKBENCH_BACKUP_VERSION
        ? parsePrintHistoryArchive(await readJsonFile(zip, PRINT_HISTORY_PATH, readBudget))
        : null;

    if (historyArchive) {
        if (
            manifest.contents.printHistory?.documentCount !== historyArchive.documents.length ||
            manifest.contents.printHistory?.pdfCount !== historyArchive.documents.length
        ) {
            throw new Error("PDF出力履歴の件数がmanifestと一致しません。");
        }
    }


    /* -----------------------------------------------------
       Manifest整合性
       ----------------------------------------------------- */

    if (
        manifest
            .contents
            .documentBuilder
            .templateCount !==
        documentArchive
            .templates
            .length
    ) {

        throw new Error(
            "文書テンプレート件数がmanifestと一致しません。"
        );
    }


    if (
        manifest
            .contents
            .redIndex
            .present !==
        (
            redIndex !==
            null
        )
    ) {

        throw new Error(
            "RED INDEXのmanifest情報が一致しません。"
        );
    }


    if (
        manifest
            .contents
            .presetDocuments
            .documentCount !==
        presetArchive
            .documents
            .length
    ) {

        throw new Error(
            "定型印刷物件数がmanifestと一致しません。"
        );
    }


    if (
        manifest
            .contents
            .presetDocuments
            .pdfCount !==
        presetArchive
            .documents
            .length
    ) {

        throw new Error(
            "定型印刷物PDF件数がmanifestと一致しません。"
        );
    }


    const expectedPreviewCount =
        presetArchive
            .documents
            .filter(
                (
                    document
                ) =>
                    document.previewPath !==
                    null
            )
            .length;


    if (
        manifest
            .contents
            .presetDocuments
            .previewImageCount !==
        expectedPreviewCount
    ) {

        throw new Error(
            "プレビュー画像件数がmanifestと一致しません。"
        );
    }


    /* -----------------------------------------------------
       PDF / Preview
       ----------------------------------------------------- */

    const presetDocuments:
        PresetDocument[] =
        [];


    for (
        const metadata
        of presetArchive.documents
    ) {

        const pdfBytes =
            await readBinaryFile(zip, metadata.pdfPath, readBudget);


        validatePdfBytes(
            pdfBytes,
            metadata.pdfPath
        );


        const pdfBlob =
            createBlob(
                pdfBytes,
                "application/pdf"
            );


        let previewBlob:
            Blob |
            null =
            null;


        if (
            metadata.previewPath &&
            metadata.previewMimeType
        ) {

            const previewBytes =
                await readBinaryFile(zip, metadata.previewPath, readBudget);


            validatePreviewBytes(
                previewBytes,
                metadata.previewMimeType,
                metadata.previewPath
            );


            previewBlob =
                createBlob(
                    previewBytes,
                    metadata.previewMimeType
                );
        }


        presetDocuments.push(
            {
                id:
                    metadata.id,

                title:
                    metadata.title,

                description:
                    metadata.description,

                orientation:
                    metadata.orientation,

                pdfFileName:
                    metadata.pdfFileName,

                pdfMimeType:
                    metadata.pdfMimeType,

                pdfBlob,

                previewFileName:
                    metadata.previewFileName,

                previewMimeType:
                    metadata.previewMimeType,

                previewBlob,

                sortOrder:
                    metadata.sortOrder,

                createdAt:
                    metadata.createdAt,

                updatedAt:
                    metadata.updatedAt
            }
        );
    }


    const printHistory: PrintHistoryRecord[] = [];

    if (historyArchive) {
        for (const metadata of historyArchive.documents) {
            const pdfBytes = await readBinaryFile(zip, metadata.pdfPath, readBudget);
            validatePdfBytes(pdfBytes, metadata.pdfPath);
            printHistory.push({
                id: metadata.id,
                recipientName: metadata.recipientName,
                fileName: metadata.fileName,
                createdAt: metadata.createdAt,
                pdfBlob: createBlob(pdfBytes, "application/pdf")
            });
        }
    }

    return {

        documentTemplates:
            documentArchive.templates,

        redIndex,

        presetDocuments,

        printHistory,

        sourceBackupVersion: manifest.version
    };
}


/* =========================================================
   ZIP safety: inspect JSZip's compressed entry metadata before inflation.
   JSZip 3.x exposes size values on the internal CompressedObject.
   If that metadata is missing, fail closed instead of unbounded inflate.
   ========================================================= */

function assertArchiveLimits(zip: JSZip): void {
    const entries = Object.values(zip.files);
    if (entries.length > MAX_ARCHIVE_ENTRIES) {
        throw new Error("バックアップ内のファイル数が多すぎます。");
    }

    let totalBytes = 0;
    for (const entry of entries) {
        if (entry.dir) continue;

        const compressedObject = (entry as unknown as {
            _data?: { uncompressedSize?: number; compressedSize?: number };
        })._data;
        const size = compressedObject?.uncompressedSize;
        const compressedSize = compressedObject?.compressedSize;
        if (
            typeof size !== "number" || !Number.isSafeInteger(size) || size < 0 ||
            typeof compressedSize !== "number" || !Number.isSafeInteger(compressedSize) || compressedSize < 0
        ) {
            throw new Error(`ZIP内のサイズ情報が不正です: ${entry.name}`);
        }

        assertBackupEntrySize(entry.name, size);
        totalBytes += size;
        if (totalBytes > MAX_ARCHIVE_EXPANDED_BYTES) {
            throw new Error("バックアップの展開後容量が上限を超えています。");
        }
    }
}

/**
 * Reads an entry in limited-size streaming chunks. The ZIP's declared
 * uncompressedSize is checked earlier, but a hostile ZIP could lie about
 * it. The stream counter also checks actual decompressed bytes.
 */
function readEntryWithLimit(
    zip: JSZip,
    path: string,
    maxSize: number,
    budget: ArchiveReadBudget
): Promise<Uint8Array> {
    const entry = zip.file(path);
    if (!entry) {
        throw new Error(`バックアップ内に必要なファイルがありません: ${path}`);
    }
    return new Promise<Uint8Array>((resolve, reject) => {
        const buffers: Uint8Array[] = [];
        let size = 0;
        let settled = false;
        // JSZip 3.10.1 supports internalStream, though its public .d.ts
        // doesn't declare this method. Version is pinned in package.json.
        const source = entry as typeof entry & {
            internalStream(type: "uint8array"): JSZip.JSZipStreamHelper<Uint8Array>;
        };
        const stream = source.internalStream("uint8array");
        stream.on("data", chunk => {
            if (settled) return;
            size += chunk.byteLength;
            budget.used += chunk.byteLength;
            if (size > maxSize || budget.used > MAX_ARCHIVE_EXPANDED_BYTES) {
                settled = true;
                stream.pause();
                reject(new Error(`ZIPの展開後容量が上限を超えています: ${path}`));
                return;
            }
            buffers.push(chunk);
        });
        stream.on("error", error => {
            if (!settled) {
                settled = true;
                reject(error);
            }
        });
        stream.on("end", () => {
            if (settled) return;
            settled = true;
            const result = new Uint8Array(size);
            let offset = 0;
            for (const chunk of buffers) {
                result.set(chunk, offset);
                offset += chunk.byteLength;
            }
            resolve(result);
        });
        stream.resume();
    });
}

async function readJsonFile(
    zip: JSZip,
    path: string,
    budget: ArchiveReadBudget
): Promise<unknown> {
    const bytes = await readEntryWithLimit(zip, path, MAX_JSON_TEXT_LENGTH, budget);
    let text: string;
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return JSON.parse(text);
    } catch {
        throw new Error(`バックアップ内のJSONを解析できません: ${path}`);
    }
}

async function readBinaryFile(
    zip: JSZip,
    path: string,
    budget: ArchiveReadBudget
): Promise<Uint8Array> {
    const maxSize = /\.(png|jpg|jpeg|webp)$/i.test(path)
        ? MAX_ARCHIVE_IMAGE_BYTES
        : MAX_ARCHIVE_ENTRY_BYTES;
    return readEntryWithLimit(zip, path, maxSize, budget);
}


/* =========================================================
   PDF Validation
   ========================================================= */

function validatePdfBytes(
    bytes: Uint8Array,
    path: string
): void {
    // A header alone is insufficient: truncated data like "%PDF-???"
    // must not be restored as a valid document. This checks basic PDF
    // envelope structure, not every object or stream's integrity.
    if (bytes.length < 128 || bytes.length > MAX_ARCHIVE_ENTRY_BYTES) {
        throw new Error(`PDFファイルのサイズが不正です: ${path}`);
    }
    const header = String.fromCharCode(...bytes.subarray(0, 8));
    if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(header)) {
        throw new Error(`PDFファイルのヘッダーが不正です: ${path}`);
    }

    // The final incremental PDF revision must contain startxref + %%EOF.
    // Decode only a short tail, avoiding copying potentially large PDFs.
    const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.length - 8192)));
    const matches = [...tail.matchAll(/startxref\s+(\d+)\s+%%EOF/g)];
    const last = matches[matches.length - 1];
    if (!last) {
        throw new Error(`PDFファイルの終端が見つかりません: ${path}`);
    }
    const xrefOffset = Number(last[1]);
    if (!Number.isSafeInteger(xrefOffset) || xrefOffset <= 0 || xrefOffset >= bytes.length) {
        throw new Error(`PDFファイルの参照位置が不正です: ${path}`);
    }
}


/* =========================================================
   Preview Validation
   ========================================================= */

function validatePreviewBytes(
    bytes: Uint8Array,
    mimeType: string,
    path: string
): void {

    switch (
    mimeType
    ) {

        case "image/png":

            if (
                !isPng(
                    bytes
                )
            ) {

                throw new Error(
                    `PNG画像が不正です: ${path}`
                );
            }


            return;


        case "image/jpeg":

            if (
                !isJpeg(
                    bytes
                )
            ) {

                throw new Error(
                    `JPEG画像が不正です: ${path}`
                );
            }


            return;


        case "image/webp":

            if (
                !isWebp(
                    bytes
                )
            ) {

                throw new Error(
                    `WebP画像が不正です: ${path}`
                );
            }


            return;


        default:

            throw new Error(
                `対応していない画像形式です: ${mimeType}`
            );
    }
}