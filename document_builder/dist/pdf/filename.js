import { sanitizeFileNamePart } from "./pdf-internals.js";
/* =========================================================
   Constants
   ========================================================= */
export const DOCUMENT_PDF_FILE_NAME = "文書.pdf";
/* =========================================================
   File Name
   ========================================================= */
/**
 * PDF保存用のファイル名を生成する。
 *
 * 例:
 * 2026.09.13_山田太郎様.pdf
 */
export function createDocumentPdfFileName(recipientName, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const sanitizedName = sanitizeFileNamePart(recipientName.trim());
    if (!sanitizedName) {
        return `${year}.${month}.${day}_文書.pdf`;
    }
    const nameWithHonorific = sanitizedName.endsWith("様")
        ? sanitizedName
        : `${sanitizedName}様`;
    return `${year}.${month}.${day}_${nameWithHonorific}.pdf`;
}
//# sourceMappingURL=filename.js.map