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
import { createBackupArchive, readBackupArchive } from "./backup-zip.js";
import { readWorkbenchSnapshot, estimateWorkbenchBackupFootprint } from "./backup-storage.js";
import { restoreWithRecovery, recoverPreviousState } from "./restore-engine.js";
import { readPendingRecovery } from "./restore-recovery.js";
import { encryptBackupZip, decryptBackupFile, isEncryptedBackup } from "./encrypted-backup.js";
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
const MAX_IMPORT_FILE_SIZE = 512 *
    1024 *
    1024 + 56;
/* =========================================================
   Setup
   ========================================================= */
export function setupWorkbenchBackup(options) {
    const { exportButton, importButton, importInput, status, recoveryButton, passwordDialog, passwordForm, passwordInput, passwordConfirmInput, passwordConfirmRow, passwordError, passwordDescription, passwordSubmit, passwordCancel, onRestored } = options;
    // 復旧用データが残る間、次の復元を開始させない。
    // 読み取りに失敗した場合も、状態不明として復元操作を禁止する。
    let isBusy = true;
    let recoveryState = "checking";
    setBusy(true);
    recoveryButton.hidden = true;
    recoveryButton.addEventListener("click", () => { void attemptRecovery(); });
    void initializeRecoveryState();
    async function refreshRecoveryState(announcePending = false) {
        try {
            const pending = await readPendingRecovery();
            recoveryState = pending ? "pending" : "clear";
            recoveryButton.hidden = !pending;
            if (pending && announcePending) {
                showStatus("中断された復元の元データが残っています。復旧ボタンから元の状態へ戻してください。");
            }
        }
        catch (error) {
            recoveryState = "unknown";
            recoveryButton.hidden = true;
            showStatus("復旧データを確認できませんでした。再読み込みして確認してください。" + formatErrorMessage(error));
        }
        updateRecoveryControls();
    }
    async function initializeRecoveryState() {
        try {
            await refreshRecoveryState(true);
        }
        finally {
            setBusy(false);
        }
    }
    async function attemptRecovery() {
        if (isBusy || recoveryState !== "pending")
            return;
        if (!window.confirm("前回の復元前に保存したデータへ戻します。現在のデータは置き換わります。よろしいですか？"))
            return;
        setBusy(true);
        try {
            await recoverPreviousState();
            showStatus("中断した復元の前のデータへ戻しました。");
            if (onRestored)
                await onRestored();
        }
        catch (error) {
            showStatus("元のデータへの復旧に失敗しました。復旧コピーは保持しています。" + formatErrorMessage(error));
        }
        finally {
            // 成功・失敗ともDBの実際の状態を再確認する。
            await refreshRecoveryState();
            setBusy(false);
        }
    }
    /* =====================================================
       Export
       ===================================================== */
    exportButton.addEventListener("click", () => {
        void handleExport();
    });
    async function handleExport() {
        // 先にパスワードを受け取り、キャンセル時は何も生成しない。
        const password = await requestBackupPassword("export");
        if (password === null)
            return;
        setBusy(true);
        showStatus("バックアップを作成しています...");
        try {
            // 実体のPDFを全件取得する前に容量・件数を検査する。
            await estimateWorkbenchBackupFootprint();
            const snapshot = await readWorkbenchSnapshot();
            const archive = await createBackupArchive(snapshot);
            // ファイルヘッダー・ZIP管理情報も含む実サイズを最終確認する。
            if (archive.size > MAX_IMPORT_FILE_SIZE - 56) {
                throw new Error("作成されたバックアップが容量上限を超えています。");
            }
            const encrypted = await encryptBackupZip(archive, password);
            downloadBlob(encrypted, createBackupFileName());
            showStatus(createExportSuccessMessage(snapshot));
        }
        catch (error) {
            console.error("WORKBENCHバックアップを作成できませんでした。", error);
            showStatus([
                "バックアップを作成できませんでした。",
                formatErrorMessage(error)
            ].join(" "));
        }
        finally {
            setBusy(false);
        }
    }
    /* =====================================================
       Import Button
       ===================================================== */
    importButton.addEventListener("click", () => {
        /**
         * 同じZIPを連続で選択しても
         * changeが発火するように一度空にする。
         */
        importInput.value =
            "";
        importInput.click();
    });
    /* =====================================================
       Import File
       ===================================================== */
    importInput.addEventListener("change", () => {
        const file = importInput.files?.[0] ??
            null;
        if (!file) {
            return;
        }
        void handleImport(file);
    });
    async function handleImport(file) {
        if (isBusy || recoveryState !== "clear") {
            showStatus("復元前の状態を確認中、または復旧コピーが残っています。先に元のデータを復旧してください。");
            return;
        }
        if (file.size ===
            0) {
            showStatus("空のバックアップファイルは読み込めません。");
            return;
        }
        if (file.size >
            MAX_IMPORT_FILE_SIZE) {
            showStatus("バックアップファイルが大きすぎます。");
            return;
        }
        setBusy(true);
        showStatus("バックアップファイルを検証しています...");
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
            let archive = file;
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
            const confirmed = confirmRestore(importedSnapshot);
            if (!confirmed) {
                showStatus("バックアップの復元をキャンセルしました。");
                return;
            }
            showStatus("バックアップを復元しています...");
            const restoredSnapshot = await restoreWithRecovery(importedSnapshot);
            if (onRestored) {
                await onRestored();
            }
            showStatus(createImportSuccessMessage(restoredSnapshot));
        }
        catch (error) {
            console.error("WORKBENCHバックアップを復元できませんでした。", error);
            showStatus([
                "バックアップを復元できませんでした。",
                formatErrorMessage(error)
            ].join(" "));
        }
        finally {
            importInput.value =
                "";
            // 失敗時に復旧コピーが残ったら、その場で復旧ボタンを出し、
            // 次のインポートを禁止する。次回起動まで待つ必要はない。
            await refreshRecoveryState();
            setBusy(false);
        }
    }
    /* =====================================================
       Password dialog (never persisted or logged)
       ===================================================== */
    function requestBackupPassword(mode) {
        return new Promise((resolve) => {
            passwordForm.reset();
            passwordError.textContent = "";
            passwordConfirmRow.hidden = mode !== "export";
            passwordConfirmInput.required = mode === "export";
            passwordInput.minLength = mode === "export" ? 12 : 1;
            passwordDescription.textContent = mode === "export"
                ? "12文字以上のパスワードでバックアップ全体を暗号化します。忘れると復元できません。安全な場所で管理してください。"
                : "暗号化バックアップを復元するため、設定したパスワードを入力してください。";
            passwordSubmit.textContent = mode === "export" ? "暗号化して保存" : "復号して復元";
            let settled = false;
            const settle = (value) => {
                if (settled)
                    return;
                settled = true;
                passwordForm.removeEventListener("submit", submit);
                passwordCancel.removeEventListener("click", cancel);
                passwordDialog.removeEventListener("cancel", escape);
                passwordDialog.removeEventListener("close", closed);
                passwordForm.reset();
                if (passwordDialog.open)
                    passwordDialog.close();
                resolve(value);
            };
            const submit = (event) => {
                event.preventDefault();
                const password = passwordInput.value;
                if (mode === "export" && password !== passwordConfirmInput.value) {
                    passwordError.textContent = "確認用パスワードが一致しません。";
                    return;
                }
                if (!password || (mode === "export" && password.length < 12)) {
                    passwordError.textContent = "パスワードの長さを確認してください。";
                    return;
                }
                settle(password);
            };
            const cancel = () => settle(null);
            const escape = (event) => { event.preventDefault(); settle(null); };
            const closed = () => settle(null);
            passwordForm.addEventListener("submit", submit);
            passwordCancel.addEventListener("click", cancel);
            passwordDialog.addEventListener("cancel", escape);
            passwordDialog.addEventListener("close", closed);
            passwordDialog.showModal();
            passwordInput.focus();
        });
    }
    /* =====================================================
       Busy
       ===================================================== */
    function updateRecoveryControls() {
        importButton.disabled = isBusy || recoveryState !== "clear";
        recoveryButton.hidden = recoveryState !== "pending";
        recoveryButton.disabled = isBusy;
    }
    function setBusy(busy) {
        isBusy = busy;
        exportButton.disabled =
            busy;
        updateRecoveryControls();
        exportButton.setAttribute("aria-busy", String(busy));
        importButton.setAttribute("aria-busy", String(busy));
    }
    /* =====================================================
       Status
       ===================================================== */
    function showStatus(message) {
        status.textContent =
            message;
        status.hidden =
            false;
    }
}
/* =========================================================
   Confirm
   ========================================================= */
function confirmRestore(snapshot) {
    const previewCount = snapshot
        .presetDocuments
        .filter((document) => document.previewBlob !==
        null)
        .length;
    return window.confirm([
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
    ].join("\n"));
}
/* =========================================================
   Download
   ========================================================= */
function downloadBlob(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href =
        objectUrl;
    anchor.download =
        fileName;
    anchor.style.display =
        "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 1000);
}
/* =========================================================
   File Name
   ========================================================= */
function createBackupFileName() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() +
        1)
        .padStart(2, "0");
    const day = String(now.getDate())
        .padStart(2, "0");
    const hours = String(now.getHours())
        .padStart(2, "0");
    const minutes = String(now.getMinutes())
        .padStart(2, "0");
    return [
        "WORKBENCH_backup_",
        year,
        month,
        day,
        "_",
        hours,
        minutes,
        ".wbenc"
    ].join("");
}
/* =========================================================
   Messages
   ========================================================= */
function createExportSuccessMessage(snapshot) {
    return [
        "暗号化バックアップを出力しました。",
        `文書テンプレート ${snapshot.documentTemplates.length}件、`,
        `定型印刷物 ${snapshot.presetDocuments.length}件、`,
        `ビジネス文書PDF履歴 ${snapshot.printHistory.length}件を保存しました。`
    ].join(" ");
}
function createImportSuccessMessage(snapshot) {
    return [
        "バックアップを復元しました。",
        `文書テンプレート ${snapshot.documentTemplates.length}件、`,
        `定型印刷物 ${snapshot.presetDocuments.length}件、`,
        `ビジネス文書PDF履歴 ${snapshot.printHistory.length}件を復元しました。`
    ].join(" ");
}
function formatErrorMessage(error) {
    if (error instanceof
        Error) {
        return error.message;
    }
    return "不明なエラーが発生しました。";
}
//# sourceMappingURL=backup.js.map