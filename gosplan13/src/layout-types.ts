/**
 * GOSPLAN13: layout controller and element types.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/**
 * layout.tsの初期化時に必要な要素。
 */
export type LayoutElements = {
    /**
     * A4ラベルプレビュー。
     */
    preview: HTMLElement;

    /**
     * 画像あり／なしモードを切り替えるチェックボックス。
     */
    imageModeToggle: HTMLInputElement;

    /**
     * 通常表示から集中表示へ切り替えるボタン。
     *
     * リボン内に配置する想定。
     */
    previewFocusButton: HTMLButtonElement;

    /**
     * 集中表示から通常表示へ戻すボタン。
     *
     * body直下へ配置し、
     * 集中表示中だけCSSで表示する想定。
     */
    previewFocusExitButton: HTMLButtonElement;
};

/**
 * layout.tsから返す操作用オブジェクト。
 *
 * 現在状態の取得や、
 * 別機能から表示モードを変更したい場合に使用できる。
 */
export type LayoutController = {
    /**
     * 画像ありモードかどうかを返す。
     */
    isImageModeEnabled: () => boolean;

    /**
     * 画像ありモードを指定した状態へ変更する。
     */
    setImageMode: (enabled: boolean) => void;

    /**
     * プレビュー集中表示かどうかを返す。
     */
    isPreviewOnlyModeEnabled: () => boolean;

    /**
     * プレビュー集中表示を指定した状態へ変更する。
     */
    setPreviewOnlyMode: (enabled: boolean) => void;

    /**
     * プレビュー集中表示を現在と反対の状態へ切り替える。
     */
    togglePreviewOnlyMode: () => void;
};
