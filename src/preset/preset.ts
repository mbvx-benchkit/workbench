import type { PresetOrientation } from "./preset-model-utils.js";
export type { PresetOrientation } from "./preset-model-utils.js";
import type { PresetDocument } from "./preset-model-utils.js";
export type { PresetDocument } from "./preset-model-utils.js";
import { createPresetDocumentId } from "./preset-model-utils.js";
export { createPresetDocumentId } from "./preset-model-utils.js";




/* =========================================================
   定数
   ========================================================= */

export const PRESET_PDF_MIME_TYPE =
    "application/pdf";


export const PRESET_PREVIEW_MIME_TYPES =
    [
        "image/png",
        "image/jpeg",
        "image/webp"
    ] as const;


/* =========================================================
   Orientation
   ========================================================= */

export function isPresetOrientation(
    value: string
): value is PresetOrientation {

    return (
        value === "portrait" ||
        value === "landscape"
    );
}


export function getPresetOrientationLabel(
    orientation: PresetOrientation
): string {

    switch (orientation) {

        case "portrait":
            return "A4縦";

        case "landscape":
            return "A4横";
    }
}


/* =========================================================
   Sort
   ========================================================= */

export function sortPresetDocuments(
    documents: readonly PresetDocument[]
): PresetDocument[] {

    return [
        ...documents
    ].sort(
        (
            first,
            second
        ) => {

            if (
                first.sortOrder !==
                second.sortOrder
            ) {

                return (
                    first.sortOrder -
                    second.sortOrder
                );
            }


            return (
                first.createdAt -
                second.createdAt
            );
        }
    );
}


/* =========================================================
   File validation
   ========================================================= */

export function isPdfFile(
    file: File
): boolean {

    if (
        file.type ===
        PRESET_PDF_MIME_TYPE
    ) {
        return true;
    }


    /**
     * OSやブラウザによって
     * File.typeが空になる場合があるため、
     * 拡張子も確認する。
     */
    return /\.pdf$/i.test(
        file.name
    );
}


export function isPreviewImageFile(
    file: File
): boolean {

    if (
        PRESET_PREVIEW_MIME_TYPES.includes(
            file.type as
            typeof PRESET_PREVIEW_MIME_TYPES[number]
        )
    ) {
        return true;
    }


    /**
     * MIME Typeが空の場合への保険。
     */
    return /\.(png|jpe?g|webp)$/i.test(
        file.name
    );
}