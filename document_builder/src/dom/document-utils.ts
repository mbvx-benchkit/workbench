/**
 * DOCUMENT BUILDER: DOM lookup, display formatting and error messages.
 * Consolidated from Stage-1 mechanical helper splits.
 */

export function formatPrintHistoryBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function formatPrintHistoryDate(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (number: number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* =========================================================
   DOM
   ========================================================= */

export function requireElement<
    T extends Element
>(
    selector: string
): T {

    const element =
        document.querySelector(
            selector
        );


    if (
        !element
    ) {

        throw new Error(
            `${selector} が見つかりません。`
        );
    }


    return (
        element as T
    );
}

export function requireChild<
    T extends Element
>(
    parent: Element,
    selector: string
): T {

    const element =
        parent.querySelector(
            selector
        );


    if (
        !element
    ) {

        throw new Error(
            `${selector} が見つかりません。`
        );
    }


    return (
        element as T
    );
}

/* =========================================================
   Error
   ========================================================= */

export function getErrorMessage(
    error: unknown
): string {

    if (
        error instanceof
        Error &&

        error.message
    ) {

        return error.message;
    }


    return (
        "処理に失敗しました。"
    );
}

/* =========================================================
   DOM
   ========================================================= */

export function requireTemplate(
    id: string
): HTMLTemplateElement {

    const element =
        document.getElementById(
            id
        );


    if (
        !(
            element instanceof
            HTMLTemplateElement
        )
    ) {

        throw new Error(
            `#${id} が見つかりません。`
        );
    }


    return element;
}
