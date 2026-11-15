/**
 * DOCUMENT BUILDER: PDF file and capture support.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Download fallback
   ========================================================= */

export function downloadPdfBlob(
    blob: Blob,
    fileName: string
): void {

    const url =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement(
            "a"
        );


    anchor.href =
        url;


    anchor.download =
        fileName;


    anchor.hidden =
        true;


    document.body.appendChild(
        anchor
    );


    try {

        anchor.click();

    } finally {

        anchor.remove();


        /**
         * click直後に破棄すると
         * 一部環境で読み込み前に消える可能性を避ける。
         */
        window.setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );
            },
            1000
        );
    }
}

/* =========================================================
   Frame
   ========================================================= */

export function waitForNextFrame():
    Promise<void> {

    return new Promise<void>(
        (
            resolve
        ) => {

            requestAnimationFrame(
                () => {

                    resolve();
                }
            );
        }
    );
}

/* =========================================================
   File System Access API local types
   ========================================================= */

export type WritableFileLike = {

    write:
    (
        data: Blob
    ) => Promise<void>;

    close:
    () => Promise<void>;
};

export type FileHandleLike = {

    createWritable:
    () => Promise<WritableFileLike>;
};

export type SaveFilePickerType = {

    description:
    string;

    accept:
    Record<string, string[]>;
};

export type SaveFilePickerOptions = {

    suggestedName?:
    string;

    types?:
    SaveFilePickerType[];
};

export type ShowSaveFilePicker = (
    options?: SaveFilePickerOptions
) => Promise<FileHandleLike>;

export type WindowWithSaveFilePicker =
    Window & {

        showSaveFilePicker?:
        ShowSaveFilePicker;
    };

/* =========================================================
   Result
   ========================================================= */

export type PdfSaveMethod =
    | "file-picker"
    | "download";

export type PdfSaveResult = {

    fileName:
    string;

    method:
    PdfSaveMethod;

    pdfBlob: Blob;
};

export function sanitizeFileNamePart(
    value: string
): string {

    return value
        .replace(
            /[\\/:*?"<>|]/g,
            "_"
        )
        .replace(
            /[. ]+$/g,
            ""
        );
}

/* =========================================================
   Abort
   ========================================================= */

export function isAbortError(
    error: unknown
): boolean {

    return (
        error instanceof
        DOMException &&
        error.name ===
        "AbortError"
    );
}
