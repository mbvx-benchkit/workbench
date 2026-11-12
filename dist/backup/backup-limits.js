/** バックアップ出力・復元で共有する上限。*/
export const MIB = 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 12000;
export const MAX_ARCHIVE_EXPANDED_BYTES = 512 * MIB;
export const MAX_ARCHIVE_ENTRY_BYTES = 64 * MIB;
export const MAX_ARCHIVE_IMAGE_BYTES = 32 * MIB;
export const MAX_JSON_TEXT_LENGTH = 20000000;
export function assertBackupEntrySize(path, size) {
    if (!Number.isSafeInteger(size) || size < 0) {
        throw new Error(`ファイル容量が不正です: ${path}`);
    }
    const max = path.endsWith(".json") ? MAX_JSON_TEXT_LENGTH
        : /\.(?:png|jpg|jpeg|webp)$/i.test(path) ? MAX_ARCHIVE_IMAGE_BYTES
            : MAX_ARCHIVE_ENTRY_BYTES;
    if (size > max) {
        throw new Error(`バックアップ内のファイルが大きすぎます: ${path}`);
    }
}
export class BackupSizeBudget {
    constructor() {
        this.entries = 0;
        this.bytes = 0;
    }
    add(path, bytes) {
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
//# sourceMappingURL=backup-limits.js.map