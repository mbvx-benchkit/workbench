export function requestBackupPasswordDialog(mode, controls, updatePasswordVisibility = () => { }) {
    const { passwordDialog, passwordForm, passwordInput, passwordConfirmInput, passwordConfirmRow, passwordError, passwordDescription, passwordSubmit, passwordCancel } = controls;
    return new Promise((resolve) => {
        passwordForm.reset();
        updatePasswordVisibility();
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
            updatePasswordVisibility();
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
//# sourceMappingURL=backup-password-dialog.js.map