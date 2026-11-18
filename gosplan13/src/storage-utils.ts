/**
 * GOSPLAN13: local storage validation and types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   型
   ========================================================= */

export type StorageElements = {
    preview: HTMLElement;
    imageModeToggle: HTMLInputElement;
};

export type StorageController = {
    /**
     * 現在の状態を即座に保存する。
     */
    saveNow: () => Promise<boolean>;

    /**
     * 自動保存データを削除する。
     *
     * 画面上の入力内容は変更しない。
     */
    clearStorage: () => Promise<void>;

    /**
     * 自動保存データが存在するか確認する。
     */
    hasStoredData: () => boolean;

    /**
     * イベント監視を解除する。
     */
    destroy: () => void;
};

/* =========================================================
   汎用型判定
   ========================================================= */

export function isObject(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object"
        && value !== null
        && !Array.isArray(value)
    );
}
