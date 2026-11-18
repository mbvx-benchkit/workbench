/** バックアップ出力・復元で共有する上限。*/
export const MIB = 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 12_000;
export const MAX_ARCHIVE_EXPANDED_BYTES = 512 * MIB;
export const MAX_ARCHIVE_ENTRY_BYTES = 64 * MIB;
export const MAX_ARCHIVE_IMAGE_BYTES = 32 * MIB;
export const MAX_JSON_TEXT_LENGTH = 20_000_000;

export function assertBackupEntrySize(path: string, size: number): void {
    if (!Number.isSafeInteger(size) || size < 0) {
        throw new Error(`ファイル容量が不正です: ${path}`);
    }
    const max = path.startsWith("document_builder/print-history/encrypted/") && path.endsWith(".bin") ? MAX_ARCHIVE_ENTRY_BYTES + 16
        : path.endsWith(".json") ? MAX_JSON_TEXT_LENGTH
        : /\.(?:png|jpg|jpeg|webp)$/i.test(path) ? MAX_ARCHIVE_IMAGE_BYTES
        : MAX_ARCHIVE_ENTRY_BYTES;
    if (size > max) {
        throw new Error(`バックアップ内のファイルが大きすぎます: ${path}`);
    }
}

export class BackupSizeBudget {
    entries = 0;
    bytes = 0;
    add(path: string, bytes: number): void {
        assertBackupEntrySize(path, bytes);
        this.entries++;
        this.bytes += bytes;
        if (this.entries > MAX_ARCHIVE_ENTRIES) {
            throw new Error("バックアップのファイル件数が上限を超えています。");
        }
        if (this.bytes > MAX_ARCHIVE_EXPANDED_BYTES) {
            throw new Error("バックアップの合計容量が上限を超えています。");
        }
    }
}
