/**
 * DOCUMENT BUILDER: template editor helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Template ID
   ========================================================= */

export function createTemplateId():
    string {

    const timestamp =
        Date.now()
            .toString(
                36
            );


    const random =
        Math.random()
            .toString(
                36
            )
            .slice(
                2,
                8
            );


    return (
        `template-${timestamp}-${random}`
    );
}

/* =========================================================
   Focus
   ========================================================= */

export function focusLater(
    element: HTMLElement
): void {

    window.setTimeout(
        () => {

            element.focus();
        },
        0
    );
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
   Types
   ========================================================= */

export type TemplateBuilderMode =
    | "create"
    | "edit";
