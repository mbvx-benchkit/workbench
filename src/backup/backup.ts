/* WORKBENCH_EXTRACT_requestBackupPassword */
import { requestBackupPasswordDialog } from "./backup-password-dialog.js";
import type { WorkbenchBackupOptions } from "./backup-ui-utils.js";
export type { WorkbenchBackupOptions } from "./backup-ui-utils.js";
import { downloadBlob } from "./backup-ui-utils.js";
import { createBackupFileName, formatErrorMessage } from "./backup-ui-utils.js";

/**
 * backup.ts
 *
 * WORKBENCH全体バックアップUIの
 * 制御を担当する。
 *
 * Export:
 *
 * Browser Storage
 *     ↓
 * Snapshot
 *     ↓
 * ZIP
 *     ↓
 * Download
 *
 *
 * Import:
 *
 * ZIP
 *     ↓
 * 全内容検証
 *     ↓
 * ユーザー確認
 *     ↓
 * 現在状態を別IndexedDBに永続退避
 *     ↓
 * 各ストレージで一括置換
 *     ↓
 * 失敗時は元データへrollback
 * 中断時は次回起動時に手動復旧
 */

import {
    createBackupArchive,
    readBackupArchive
} from "./backup-zip.js";


import {
    readWorkbenchSnapshot,
    estimateWorkbenchBackupFootprint
} from "./backup-storage.js";

import { restoreWithRecovery, recoverPreviousState } from "./restore-engine.js";
import { readPendingRecovery } from "./restore-recovery.js";
import { encryptBackupZip, decryptBackupFile, isEncryptedBackup } from "./encrypted-backup.js";


import type {
    WorkbenchBackupSnapshot,
    ImportedWorkbenchBackupSnapshot
} from "./backup-types.js";


/* =========================================================
   Constants
   ========================================================= */

/**
 * JSZipはブラウザメモリ上で処理するため、
 * 極端に大きな入力を避ける。
 *
 * 通常のWORKBENCHバックアップとしては
 * 十分大きな上限。
 */
// 暗号化コンテナのヘッダー40バイトと認証タグ16バイトを許容する。
const MAX_IMPORT_FILE_SIZE =
    512 *
    1024 *
    1024 + 56;


/* =========================================================
   Setup
   ========================================================= */

export function setupWorkbenchBackup(
    options: WorkbenchBackupOptions
): void {

    const {
        exportButton,
        importButton,
        importInput,
        status,
        recoveryButton,
        passwordDialog,
        passwordForm,
        passwordInput,
        passwordConfirmInput,
        passwordConfirmRow,
        passwordVisibilityToggle,
        passwordError,
        passwordDescription,
        passwordSubmit,
        passwordCancel,
        onRestored
    } =
        options;


    // 復旧用データが残る間、次の復元を開始させない。
    // 読み取りに失敗した場合も、状態不明として復元操作を禁止する。
    let isBusy = true;
    let recoveryState: "checking" | "clear" | "pending" | "unknown" = "checking";
    setBusy(true);
    recoveryButton.hidden = true;
    recoveryButton.addEventListener("click", () => { void attemptRecovery(); });
    void initializeRecoveryState();

    async function refreshRecoveryState(announcePending = false): Promise<void> {
        try {
            const pending = await readPendingRecovery();
            recoveryState = pending ? "pending" : "clear";
            recoveryButton.hidden = !pending;
            if (pending && announcePending) {
                showStatus("中断された復元の元データが残っています。復旧ボタンから元の状態へ戻してください。");
            }
        } catch (error) {
            recoveryState = "unknown";
            recoveryButton.hidden = true;
            showStatus("復旧データを確認できませんでした。再読み込みして確認してください。" + formatErrorMessage(error));
        }
        updateRecoveryControls();
    }

    async function initializeRecoveryState(): Promise<void> {
        try {
            await refreshRecoveryState(true);
        } finally {
            setBusy(false);
        }
    }

    async function attemptRecovery(): Promise<void> {
        if (isBusy || recoveryState !== "pending") return;
        if (!window.confirm("前回の復元前に保存したデータへ戻します。現在のデータは置き換わります。よろしいですか？")) return;
        setBusy(true);
        try {
            await recoverPreviousState();
            showStatus("中断した復元の前のデータへ戻しました。");
            if (onRestored) await onRestored();
        } catch (error) {
            showStatus("元のデータへの復旧に失敗しました。復旧コピーは保持しています。" + formatErrorMessage(error));
        } finally {
            // 成功・失敗ともDBの実際の状態を再確認する。
            await refreshRecoveryState();
            setBusy(false);
        }
    }

    /* =====================================================
       Export
       ===================================================== */

    exportButton.addEventListener(
        "click",
        () => {

            void handleExport();
        }
    );


    async function handleExport():
        Promise<void> {

        // 先にパスワードを受け取り、キャンセル時は何も生成しない。
        const password = await requestBackupPassword("export");
        if (password === null) return;

        setBusy(
            true
        );


        showStatus(
            "バックアップを作成しています..."
        );


        try {

            // 実体のPDFを全件取得する前に容量・件数を検査する。
            await estimateWorkbenchBackupFootprint();
            const snapshot = await readWorkbenchSnapshot();


            const archive =
                await createBackupArchive(
                    snapshot
                );


            // ファイルヘッダー・ZIP管理情報も含む実サイズを最終確認する。
            if (archive.size > MAX_IMPORT_FILE_SIZE - 56) {
                throw new Error("作成されたバックアップが容量上限を超えています。");
            }
            const encrypted = await encryptBackupZip(archive, password);
            downloadBlob(encrypted, createBackupFileName());


            showStatus(
                createExportSuccessMessage(
                    snapshot
                )
            );

        } catch (error) {

            console.error(
                "WORKBENCHバックアップを作成できませんでした。",
                error
            );


            showStatus(
                [
                    "バックアップを作成できませんでした。",
                    formatErrorMessage(
                        error
                    )
                ].join(" ")
            );

        } finally {

            setBusy(
                false
            );
        }
    }


    /* =====================================================
       Import Button
       ===================================================== */

    importButton.addEventListener(
        "click",
        () => {

            /**
             * 同じZIPを連続で選択しても
             * changeが発火するように一度空にする。
             */
            importInput.value =
                "";


            importInput.click();
        }
    );


    /* =====================================================
       Import File
       ===================================================== */

    importInput.addEventListener(
        "change",
        () => {

            const file =
                importInput.files?.[0] ??
                null;


            if (
                !file
            ) {

                return;
            }


            void handleImport(
                file
            );
        }
    );


    async function handleImport(
        file: File
    ): Promise<void> {

        if (isBusy || recoveryState !== "clear") {
            showStatus("復元前の状態を確認中、または復旧コピーが残っています。先に元のデータを復旧してください。");
            return;
        }

        if (
            file.size ===
            0
        ) {

            showStatus(
                "空のバックアップファイルは読み込めません。"
            );


            return;
        }


        if (
            file.size >
            MAX_IMPORT_FILE_SIZE
        ) {

            showStatus(
                "バックアップファイルが大きすぎます。"
            );


            return;
        }


        setBusy(
            true
        );


        showStatus(
            "バックアップファイルを検証しています..."
        );


        try {

            /**
             * ここではまだ現在データを変更しない。
             *
             * ZIP内JSON、PDF、プレビュー画像まで
             * すべて読み込み・検証する。
             */
            const encrypted = await isEncryptedBackup(file);
            if (!encrypted && file.name.toLowerCase().endsWith(".wbenc")) {
                throw new Error("暗号化バックアップのファイル形式が不正です。");
            }
            let archive: Blob | Uint8Array = file;
            if (encrypted) {
                const password = await requestBackupPassword("import");
                if (password === null) {
                    showStatus("バックアップの復元をキャンセルしました。");
                    return;
                }
                showStatus("バックアップを復号・検証しています...");
                archive = await decryptBackupFile(file, password);
            }
            const importedSnapshot = await readBackupArchive(archive);


            const confirmed =
                confirmRestore(
                    importedSnapshot
                );


            if (
                !confirmed
            ) {

                showStatus(
                    "バックアップの復元をキャンセルしました。"
                );


                return;
            }


            showStatus(
                "バックアップを復元しています..."
            );


            const restoredSnapshot = await restoreWithRecovery(importedSnapshot);


            if (
                onRestored
            ) {

                await onRestored();
            }


            showStatus(
                createImportSuccessMessage(
                    restoredSnapshot
                )
            );

        } catch (error) {

            console.error(
                "WORKBENCHバックアップを復元できませんでした。",
                error
            );


            showStatus(
                [
                    "バックアップを復元できませんでした。",
                    formatErrorMessage(
                        error
                    )
                ].join(" ")
            );

        } finally {

            importInput.value =
                "";

            // 失敗時に復旧コピーが残ったら、その場で復旧ボタンを出し、
            // 次のインポートを禁止する。次回起動まで待つ必要はない。
            await refreshRecoveryState();
            setBusy(false);
        }
    }


    /* パスワードの表示状態は画面内のみ。保存・記録しない。 */
    const updatePasswordVisibility = (): void => {
        const type = passwordVisibilityToggle.checked ? "text" : "password";
        passwordInput.type = type;
        passwordConfirmInput.type = type;
    };
    passwordVisibilityToggle.addEventListener("change", updatePasswordVisibility);

    /* =====================================================
       Password dialog (never persisted or logged)
       ===================================================== */
    function requestBackupPassword(mode: "export" | "import"): Promise<string | null> {
    return requestBackupPasswordDialog(mode, { passwordDialog, passwordForm, passwordInput, passwordConfirmInput, passwordConfirmRow, passwordError, passwordDescription, passwordSubmit, passwordCancel }, updatePasswordVisibility);
}

    /* =====================================================
       Busy
       ===================================================== */

    function updateRecoveryControls(): void {
        importButton.disabled = isBusy || recoveryState !== "clear";
        recoveryButton.hidden = recoveryState !== "pending";
        recoveryButton.disabled = isBusy;
    }

    function setBusy(
        busy: boolean
    ): void {
        isBusy = busy;

        exportButton.disabled =
            busy;

        updateRecoveryControls();

        exportButton.setAttribute(
            "aria-busy",
            String(
                busy
            )
        );


        importButton.setAttribute(
            "aria-busy",
            String(
                busy
            )
        );
    }


    /* =====================================================
       Status
       ===================================================== */

    function showStatus(
        message: string
    ): void {

        status.textContent =
            message;


        status.hidden =
            false;
    }
}


/* =========================================================
   Confirm
   ========================================================= */

function confirmRestore(
    snapshot: ImportedWorkbenchBackupSnapshot
): boolean {

    const previewCount =
        snapshot
            .presetDocuments
            .filter(
                (
                    document
                ) =>
                    document.previewBlob !==
                    null
            )
            .length;


    return window.confirm(
        [
            "WORKBENCHのバックアップを復元します。",
            "",
            "現在このブラウザに保存されている対象データは、バックアップ内容で完全に置き換えられます。",
            "",
            `文書テンプレート: ${snapshot.documentTemplates.length}件`,
            `RED INDEX: ${snapshot.redIndex ? "あり" : "なし"}`,
            `定型印刷物: ${snapshot.presetDocuments.length}件`,
            `プレビュー画像: ${previewCount}件`,
            snapshot.sourceBackupVersion === 1
                ? "ビジネス文書のPDF履歴: 旧形式に含まれないため、現在の履歴を保持します。"
                : `ビジネス文書のPDF履歴: ${snapshot.printHistory.length}件（置き換え）`,
            "",
            "この操作を実行しますか？"
        ].join(
            "\n"
        )
    );
}


/* =========================================================
   Messages
   ========================================================= */

function createExportSuccessMessage(
    snapshot: WorkbenchBackupSnapshot
): string {

    return [
        "暗号化バックアップを作成し、ダウンロードを開始しました。保存先にファイルがあることを確認してください。",
        `文書テンプレート ${snapshot.documentTemplates.length}件、`,
        `定型印刷物 ${snapshot.presetDocuments.length}件、`,
        `ビジネス文書PDF履歴 ${snapshot.printHistory.length}件を含みます。`
    ].join(" ");
}


function createImportSuccessMessage(
    snapshot: WorkbenchBackupSnapshot
): string {

    return [
        "バックアップを復元しました。",
        `文書テンプレート ${snapshot.documentTemplates.length}件、`,
        `定型印刷物 ${snapshot.presetDocuments.length}件、`,
        `ビジネス文書PDF履歴 ${snapshot.printHistory.length}件を復元しました。`
    ].join(" ");
}