/**
 * WORKBENCH: preset record types and ID creation.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/**
 * preset.ts
 *
 * 定型印刷物機能の
 * 型定義・定数・純粋関数を管理する。
 */


/* =========================================================
   用紙方向
   ========================================================= */

export type PresetOrientation =
    | "portrait"
    | "landscape";

/* =========================================================
   定型印刷物
   ========================================================= */

export type PresetDocument = {

    /**
     * レコード固有ID。
     *
     * タイトルやファイル名とは独立させる。
     */
    id: string;


    /**
     * カードに表示するタイトル。
     */
    title: string;


    /**
     * カードに表示する説明。
     */
    description: string;


    /**
     * A4縦 / A4横。
     */
    orientation: PresetOrientation;


    /**
     * PDFの元ファイル名。
     */
    pdfFileName: string;


    /**
     * PDF MIME Type。
     *
     * 基本的には application/pdf。
     */
    pdfMimeType: string;


    /**
     * PDF本体。
     *
     * Base64へ変換せず
     * BlobのままIndexedDBへ保存する。
     */
    pdfBlob: Blob;


    /**
     * プレビュー画像の元ファイル名。
     *
     * プレビュー未設定ならnull。
     */
    previewFileName: string | null;


    /**
     * プレビュー画像のMIME Type。
     */
    previewMimeType: string | null;


    /**
     * プレビュー画像本体。
     *
     * 未設定ならnull。
     */
    previewBlob: Blob | null;


    /**
     * カードの並び順。
     *
     * 現段階では追加順。
     */
    sortOrder: number;


    /**
     * 作成日時。
     *
     * Unix time milliseconds。
     */
    createdAt: number;


    /**
     * 最終更新日時。
     */
    updatedAt: number;
};

/* =========================================================
   ID
   ========================================================= */

export function createPresetDocumentId(): string {

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();
    }


    /**
     * randomUUID非対応環境用。
     *
     * 現行ブラウザでは基本的に
     * randomUUID側が使用される。
     */
    return [
        "preset",
        Date.now(),
        Math.random()
            .toString(16)
            .slice(2)
    ].join("-");
}
