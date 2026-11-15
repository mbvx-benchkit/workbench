/**
 * WORKBENCH: backup archive model validation.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   Generic Validation
   ========================================================= */
export function requireRecord(value, path) {
    if (typeof value !==
        "object" ||
        value ===
            null ||
        Array.isArray(value)) {
        throw new Error(`${path} が不正です。`);
    }
    return value;
}
export function requireString(value, path, maxLength, required = false) {
    if (typeof value !==
        "string") {
        throw new Error(`${path} が文字列ではありません。`);
    }
    if (required &&
        value.length ===
            0) {
        throw new Error(`${path} が空です。`);
    }
    if (value.length >
        maxLength) {
        throw new Error(`${path} が長すぎます。`);
    }
    return value;
}
export function requireNonNegativeInteger(value, path) {
    if (typeof value !==
        "number" ||
        !Number.isSafeInteger(value) ||
        value <
            0) {
        throw new Error(`${path} が不正です。`);
    }
    return value;
}
export function requireFiniteNumber(value, path) {
    if (typeof value !==
        "number" ||
        !Number.isFinite(value)) {
        throw new Error(`${path} が不正です。`);
    }
    return value;
}
export function requireUniqueIds(values, label) {
    const ids = new Set();
    for (const value of values) {
        if (ids.has(value.id)) {
            throw new Error(`${label}に重複したIDがあります: ${value.id}`);
        }
        ids.add(value.id);
    }
}
export function requireSafeArchivePath(path, requiredPrefix) {
    if (!path.startsWith(requiredPrefix) ||
        path.includes("..") ||
        path.includes("\\") ||
        path.startsWith("/")) {
        throw new Error(`ZIP内のファイルパスが不正です: ${path}`);
    }
}
//# sourceMappingURL=archive-validation.js.map