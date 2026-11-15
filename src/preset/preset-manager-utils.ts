/**
 * WORKBENCH: preset manager UI helpers and state types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   DOM Utility
   ========================================================= */

export function requireElement<T extends Element>(
    selector: string
): T {

    const element =
        document.querySelector<T>(
            selector
        );


    if (
        !element
    ) {

        throw new Error(
            `必要な要素が見つかりません: ${selector}`
        );
    }


    return element;
}

/* =========================================================
   Format
   ========================================================= */

export function formatBytes(
    bytes: number
): string {

    if (
        bytes <
        1024
    ) {

        return `${bytes} B`;
    }


    const kilobytes =
        bytes /
        1024;


    if (
        kilobytes <
        1024
    ) {

        return `${kilobytes.toFixed(1)} KB`;
    }


    const megabytes =
        kilobytes /
        1024;


    if (
        megabytes <
        1024
    ) {

        return `${megabytes.toFixed(1)} MB`;
    }


    const gigabytes =
        megabytes /
        1024;


    return `${gigabytes.toFixed(2)} GB`;
}

/* =========================================================
   Types
   ========================================================= */

export type PresetManagerOptions = {

    /**
     * 保存・削除後に
     * 親ページ側へ変更を通知する。
     */
    onChanged: () =>
        void |
        Promise<void>;
};

export type PresetManagerController = {

    /**
     * 管理一覧を開く。
     */
    openManager:
    () => Promise<void>;


    /**
     * メイン画面の
     * 「新規追加」カードから
     * Editorを直接開く。
     */
    openCreateEditor:
    () => void;
};

/**
 * Editorをどこから開いたか。
 *
 * direct:
 *   メイン画面の追加カード
 *
 * manager:
 *   管理一覧
 */
export type EditorOrigin =
    | "direct"
    | "manager";
