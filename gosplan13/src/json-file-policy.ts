/** The same UTF-8 byte ceiling applies to JSON export and subsequent import. */
export const MAX_GOSPLAN13_JSON_BYTES = 64 * 1024 * 1024;
export const GOSPLAN13_JSON_LIMIT_LABEL = "64MiB";

/** Reject exports too large to be read back later. */
export function assertExportJsonFits(json: string): void {
    if (new Blob([json]).size > MAX_GOSPLAN13_JSON_BYTES) {
        throw new Error(`JSONの出力容量が${GOSPLAN13_JSON_LIMIT_LABEL}を超えています。画像を減らしてから出力してください。`);
    }
}
