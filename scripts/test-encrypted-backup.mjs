/** Tests the encrypted container and legacy ZIP compatibility. After `tsc -p tsconfig.json`. */
import assert from 'node:assert/strict';
import { encryptBackupZip, decryptBackupFile, isEncryptedBackup } from '../dist/backup/encrypted-backup.js';
import { createBackupArchive, readBackupArchive } from '../dist/backup/backup-zip.js';

const snapshot = { documentTemplates: [], redIndex: null, presetDocuments: [], printHistory: [] };
const legacyZip = await createBackupArchive(snapshot);
const oldArchive = await readBackupArchive(new Uint8Array(await legacyZip.arrayBuffer()));
assert.equal(oldArchive.sourceBackupVersion, 3);
const password = 'とても長いテストパスワード_2026!';
const encrypted = await encryptBackupZip(legacyZip, password);
assert.equal(await isEncryptedBackup(encrypted), true);
assert.equal(await isEncryptedBackup(legacyZip), false);
const bytes = await decryptBackupFile(encrypted, password);
assert.equal(bytes.byteLength, legacyZip.size);
const restored = await readBackupArchive(bytes);
assert.equal(restored.sourceBackupVersion, 3);
await assert.rejects(decryptBackupFile(encrypted, 'incorrect-password'), /パスワードが違う|破損/);
const tampered = new Uint8Array(await encrypted.arrayBuffer());
tampered[tampered.length - 1] ^= 1;
await assert.rejects(decryptBackupFile(new Blob([tampered]), password), /パスワードが違う|破損/);
const alteredHeader = new Uint8Array(await encrypted.arrayBuffer());
alteredHeader[20] ^= 1;
await assert.rejects(decryptBackupFile(new Blob([alteredHeader]), password), /パスワードが違う|破損/);
await assert.rejects(encryptBackupZip(legacyZip, 'short'), /12文字/);
assert.ok(!(await encrypted.text()).includes('manifest.json'));
console.log('PASS: AES-GCM encrypted ZIP roundtrip; legacy ZIP; password mismatch; header and payload tampering; length guard');
