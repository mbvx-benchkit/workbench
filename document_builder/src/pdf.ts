/* WORKBENCH_ROLE_SPLIT_STAGE2: public facade. Keep existing import paths stable. */

import type { WritableFileLike, FileHandleLike, SaveFilePickerType, SaveFilePickerOptions, ShowSaveFilePicker, WindowWithSaveFilePicker, PdfSaveMethod, PdfSaveResult } from "./pdf/pdf-internals.js";
export type { PdfSaveMethod, PdfSaveResult } from "./pdf/pdf-internals.js";
import { sanitizeFileNamePart, isAbortError } from "./pdf/pdf-internals.js";
import { downloadPdfBlob, waitForNextFrame } from "./pdf/pdf-internals.js";

import html2canvas from "html2canvas";

import {
    jsPDF
} from "jspdf";

export { DOCUMENT_PDF_FILE_NAME } from "./pdf/filename.js";
export { createDocumentPdfFileName } from "./pdf/filename.js";
export { createDocumentPdfBlob } from "./pdf/render.js";
export { PdfSaveCancelledError } from "./pdf/save.js";
export { saveDocumentPdf } from "./pdf/save.js";
