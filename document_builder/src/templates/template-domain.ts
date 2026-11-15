/**
 * DOCUMENT BUILDER: template types, validation and date formatting.
 * Consolidated from Stage-1 mechanical helper splits.
 */

export type TemplateFieldType =
    | "text"
    | "textarea"
    | "date";

export type TemplateField = {
    id: string;
    label: string;
    type: TemplateFieldType;
    required?: boolean;
    defaultValue?: string;
    placeholder?: string;
};

export type BusinessDocumentLayout = {
    topLeft: string;
    topRight: string;
    opening: string;
    body: string;
    closing: string;
    end: string;
};

export type DocumentValues =
    Record<string, string>;

export type DocumentTemplate = {
    id: string;
    name: string;
    fields: TemplateField[];
    document: BusinessDocumentLayout;
};

/* =========================================================
   Generic validation
   ========================================================= */

export function requireRecord(
    value: unknown,
    message: string
): Record<string, unknown> {

    if (
        typeof value !==
        "object" ||

        value ===
        null ||

        Array.isArray(
            value
        )
    ) {

        throw new Error(
            message
        );
    }


    return (
        value as
        Record<string, unknown>
    );
}

export function requireString(
    value: unknown,
    path: string
): string {

    if (
        typeof value !==
        "string"
    ) {

        throw new Error(
            `${path} は文字列である必要があります。`
        );
    }


    return value;
}

/* =========================================================
   Local date
   ========================================================= */

export function formatLocalDate(
    date: Date
): string {

    const year =
        String(
            date.getFullYear()
        );


    const month =
        String(
            date.getMonth() +
            1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );
}
