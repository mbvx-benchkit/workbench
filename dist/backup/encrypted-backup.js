/**
 * WORKBENCHのバックアップZIP全体をAES-256-GCMで保護する外側コンテナ。
 * .wbencはZIP形式ではない。復号後は従来のZIP readerへ渡す。
 * 形式：magic(8) + PBKDF2 iterations(4,BE) + salt(16) + iv(12) + AES-GCM ciphertext/tag。
 * 先頭40バイトもAES-GCMのAADで認証する。鍵/パスワードは保存しない。
 */
const MAGIC = new TextEncoder().encode("WBENC001");
const HEADER_BYTES = 40;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PBKDF2_ITERATIONS = 600000;
const MAX_ITERATIONS = 1200000;
const MAX_ZIP_BYTES = 512 * 1024 * 1024;
const MAX_PASSWORD_LENGTH = 1024;
function cryptoProvider() {
    if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
        throw new Error("暗号化に対応した安全なブラウザ環境（HTTPS）が必要です。");
    }
    return globalThis.crypto.subtle;
}
function assertPassword(password, create) {
    if (!password || password.length > MAX_PASSWORD_LENGTH || (create && password.length < 12)) {
        throw new Error(create
            ? "パスワードは12文字以上、1024文字以内で入力してください。"
            : "バックアップのパスワードを入力してください。");
    }
}
async function deriveKey(password, salt, iterations, usage) {
    const subtle = cryptoProvider();
    const secret = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations, hash: "SHA-256" }, secret, { name: "AES-GCM", length: 256 }, false, [usage]);
}
function hasMagic(bytes) {
    return bytes.length >= MAGIC.length && MAGIC.every((value, index) => bytes[index] === value);
}
/** パスワードを問い合わせる前に判定できるよう、先頭8バイトだけ読む。 */
export async function isEncryptedBackup(file) {
    return hasMagic(new Uint8Array(await file.slice(0, MAGIC.length).arrayBuffer()));
}
export async function encryptBackupZip(zip, password) {
    assertPassword(password, true);
    const subtle = cryptoProvider();
    if (zip.size === 0 || zip.size > MAX_ZIP_BYTES) {
        throw new Error("バックアップのZIPが暗号化可能な容量を超えています。");
    }
    const header = new Uint8Array(HEADER_BYTES);
    header.set(MAGIC, 0);
    new DataView(header.buffer).setUint32(8, PBKDF2_ITERATIONS, false);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    header.set(salt, 12);
    header.set(iv, 28);
    const key = await deriveKey(password, salt, PBKDF2_ITERATIONS, "encrypt");
    const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv, additionalData: header, tagLength: 128 }, key, await zip.arrayBuffer());
    return new Blob([header, ciphertext], { type: "application/octet-stream" });
}
/** 鍵誤りと改ざんを同じエラーとして扱い、復元処理は一切開始しない。 */
export async function decryptBackupFile(file, password) {
    assertPassword(password, false);
    const subtle = cryptoProvider();
    if (file.size < HEADER_BYTES + TAG_BYTES || file.size > MAX_ZIP_BYTES + HEADER_BYTES + TAG_BYTES) {
        throw new Error("暗号化バックアップのサイズが不正です。");
    }
    const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
    if (!hasMagic(header))
        throw new Error("暗号化バックアップの形式が不正です。");
    const iterations = new DataView(header.buffer).getUint32(8, false);
    if (iterations < PBKDF2_ITERATIONS || iterations > MAX_ITERATIONS) {
        throw new Error("対応していない暗号化バックアップ形式です。");
    }
    const salt = header.slice(12, 12 + SALT_BYTES);
    const iv = header.slice(28, 28 + IV_BYTES);
    const key = await deriveKey(password, salt, iterations, "decrypt");
    try {
        const plaintext = await subtle.decrypt({ name: "AES-GCM", iv, additionalData: header, tagLength: 128 }, key, await file.slice(HEADER_BYTES).arrayBuffer());
        return new Uint8Array(plaintext);
    }
    catch {
        throw new Error("パスワードが違うか、暗号化バックアップが破損しています。");
    }
}
//# sourceMappingURL=encrypted-backup.js.map