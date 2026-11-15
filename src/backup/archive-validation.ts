/**
 * WORKBENCH: backup archive model validation.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Generic Validation
   ========================================================= */

export function requireRecord(
    value: unknown,
    path: string
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
            `${path} が不正です。`
        );
    }


    return value as
        Record<string, unknown>;
}

export function requireString(
    value: unknown,
    path: string,
    maxLength: number,
    required = false
): string {

    if (
        typeof value !==
        "string"
    ) {

        throw new Error(
            `${path} が文字列ではありません。`
        );
    }


    if (
        required &&

        value.length ===
        0
    ) {

        throw new Error(
            `${path} が空です。`
        );
    }


    if (
        value.length >
        maxLength
    ) {

        throw new Error(
            `${path} が長すぎます。`
        );
    }


    return value;
}

export function requireNonNegativeInteger(
    value: unknown,
    path: string
): number {

    if (
        typeof value !==
        "number" ||

        !Number.isSafeInteger(
            value
        ) ||

        value <
        0
    ) {

        throw new Error(
            `${path} が不正です。`
        );
    }


    return value;
}

export function requireFiniteNumber(
    value: unknown,
    path: string
): number {

    if (
        typeof value !==
        "number" ||

        !Number.isFinite(
            value
        )
    ) {

        throw new Error(
            `${path} が不正です。`
        );
    }


    return value;
}

export function requireUniqueIds(
    values:
        Array<{
            id: string;
        }>,
    label: string
): void {

    const ids =
        new Set<string>();


    for (
        const value
        of values
    ) {

        if (
            ids.has(
                value.id
            )
        ) {

            throw new Error(
                `${label}に重複したIDがあります: ${value.id}`
            );
        }


        ids.add(
            value.id
        );
    }
}

export function requireSafeArchivePath(
    path: string,
    requiredPrefix: string
): void {

    if (
        !path.startsWith(
            requiredPrefix
        ) ||

        path.includes(
            ".."
        ) ||

        path.includes(
            "\\"
        ) ||

        path.startsWith(
            "/"
        )
    ) {

        throw new Error(
            `ZIP内のファイルパスが不正です: ${path}`
        );
    }
}
