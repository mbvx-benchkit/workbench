/* WORKBENCH_ROLE_SPLIT_STAGE2: document_builder/src/pdf.ts -> save.ts; declarations moved without behavioral changes */
import type { WritableFileLike, FileHandleLike, SaveFilePickerType, SaveFilePickerOptions, ShowSaveFilePicker, WindowWithSaveFilePicker, PdfSaveMethod, PdfSaveResult } from "./pdf-internals.js";
import { sanitizeFileNamePart, isAbortError } from "./pdf-internals.js";
import { downloadPdfBlob, waitForNextFrame } from "./pdf-internals.js";
import html2canvas from "html2canvas";
import {
    jsPDF
} from "jspdf";
import { createDocumentPdfFileName } from "./filename.js";
import { createDocumentPdfBlob } from "./render.js";




/* =========================================================
   Cancel Error
   ========================================================= */

export class PdfSaveCancelledError
    extends Error {

    constructor() {

        super(
            "PDF保存がキャンセルされました。"
        );


        this.name =
            "PdfSaveCancelledError";
    }
}




/* =========================================================
   Public API
   ========================================================= */

/**
 * 現在のA4プレビューからPDFを生成し、
 * ユーザー端末へ保存する。
 */
export async function saveDocumentPdf(
    pageElement: HTMLElement,
    recipientName: string
): Promise<PdfSaveResult> {

    const pdfBlob =
        await createDocumentPdfBlob(
            pageElement
        );


    const fileName =
        createDocumentPdfFileName(
            recipientName
        );


    const result = await savePdfBlob(
        pdfBlob,
        fileName
    );

    return {
        ...result,
        pdfBlob
    };
}




/* =========================================================
   Save
   ========================================================= */

export async function savePdfBlob(
    blob: Blob,
    fileName: string
): Promise<Omit<PdfSaveResult, "pdfBlob">> {

    const browserWindow =
        window as
        WindowWithSaveFilePicker;


    /**
     * 対応ブラウザでは保存先をユーザーに選択してもらい、
     * close()完了まで待つ。
     */
    if (
        typeof browserWindow
            .showSaveFilePicker ===
        "function"
    ) {

        try {

            const handle =
                await browserWindow
                    .showSaveFilePicker({
                        suggestedName:
                            fileName,

                        types: [
                            {
                                description:
                                    "PDFファイル",

                                accept: {
                                    "application/pdf": [
                                        ".pdf"
                                    ]
                                }
                            }
                        ]
                    });


            const writable =
                await handle
                    .createWritable();


            await writable.write(
                blob
            );


            await writable.close();


            return {
                fileName,
                method:
                    "file-picker"
            };

        } catch (
        error
        ) {

            if (
                isAbortError(
                    error
                )
            ) {

                throw new PdfSaveCancelledError();
            }


            /**
             * File System Access APIが存在していても
             * 書き込み不可の場合は通常ダウンロードへ退避。
             */
            console.warn(
                "File System Access APIによるPDF保存に失敗したため、通常ダウンロードへ切り替えます。",
                error
            );
        }
    }


    downloadPdfBlob(
        blob,
        fileName
    );


    return {
        fileName,
        method:
            "download"
    };
}
