/**
 * WORKBENCH: backup UI helpers and options.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Download
   ========================================================= */

export function downloadBlob(
    blob: Blob,
    fileName: string
): void {

    const objectUrl =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement(
            "a"
        );


    anchor.href =
        objectUrl;


    anchor.download =
        fileName;


    anchor.style.display =
        "none";


    document.body.appendChild(
        anchor
    );


    anchor.click();


    anchor.remove();


    window.setTimeout(
        () => {

            URL.revokeObjectURL(
                objectUrl
            );
        },
        1_000
    );
}

/* =========================================================
   File Name
   ========================================================= */

export function createBackupFileName():
    string {

    const now =
        new Date();


    const year =
        String(
            now.getFullYear()
        );


    const month =
        String(
            now.getMonth() +
            1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            now.getDate()
        )
            .padStart(
                2,
                "0"
            );


    const hours =
        String(
            now.getHours()
        )
            .padStart(
                2,
                "0"
            );


    const minutes =
        String(
            now.getMinutes()
        )
            .padStart(
                2,
                "0"
            );


    return [
        "WORKBENCH_backup_",
        year,
        month,
        day,
        "_",
        hours,
        minutes,
        ".wbenc"
    ].join("");
}

export function formatErrorMessage(
    error: unknown
): string {

    if (
        error instanceof
        Error
    ) {

        return error.message;
    }


    return "不明なエラーが発生しました。";
}

/* =========================================================
   Types
   ========================================================= */

export type WorkbenchBackupOptions = {

    exportButton:
        HTMLButtonElement;

    importButton:
        HTMLButtonElement;

    importInput:
        HTMLInputElement;

    status:
        HTMLElement;
    recoveryButton: HTMLButtonElement;

    passwordDialog: HTMLDialogElement;
    passwordForm: HTMLFormElement;
    passwordInput: HTMLInputElement;
    passwordConfirmInput: HTMLInputElement;
    passwordConfirmRow: HTMLElement;
    passwordVisibilityToggle: HTMLInputElement;
    passwordError: HTMLElement;
    passwordDescription: HTMLElement;
    passwordSubmit: HTMLButtonElement;
    passwordCancel: HTMLButtonElement;

    onRestored?:
        () =>
            void |
            Promise<void>;
};
