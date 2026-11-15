import { waitForNextFrame } from "./pdf-internals.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PDF_CAPTURE_SCALE = 2;
/**
 * A4プレビューからPDF Blobを生成する。
 */
export async function createDocumentPdfBlob(pageElement) {
    /**
     * Webフォント等があれば、
     * 描画が完了してからキャプチャする。
     */
    if (document.fonts) {
        await document.fonts.ready;
    }
    pageElement.classList.add("document-page--pdf-capture");
    try {
        /**
         * class追加後のレイアウトを
         * ブラウザへ反映させる。
         */
        await waitForNextFrame();
        const canvas = await html2canvas(pageElement, {
            backgroundColor: "#ffffff",
            scale: PDF_CAPTURE_SCALE,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0
        });
        const imageData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });
        /**
         * A4全面へ現在のプレビューを配置。
         */
        pdf.addImage(imageData, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        return pdf.output("blob");
    }
    finally {
        pageElement.classList.remove("document-page--pdf-capture");
    }
}
//# sourceMappingURL=render.js.map