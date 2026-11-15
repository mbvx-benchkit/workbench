/**
 * RED INDEX: category model helpers and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Generic Validation
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


    return value as
        Record<string, unknown>;
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

export type RedIndexCategory = {
    category: string;
    items: string[];
};
