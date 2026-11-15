/** Ensure a failed import reveals a pending recovery immediately, without page reload. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
// Node lacks FileReader; emulate the browser API JSZip uses to load a File.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(
      result => this.onload({ target: { result } }),
      error => this.onerror({ target: { error } })
    );
  }
};
const { createBackupArchive } = await import('../dist/backup/backup-zip.js');
const { savePendingRecovery, readPendingRecovery } = await import('../dist/backup/restore-recovery.js');
const { setupWorkbenchBackup } = await import('../dist/backup/backup.js');

class FakeElement {
  constructor() { this.listeners = new Map(); this.disabled = false; this.hidden = false; this.value = ''; this.textContent = ''; this.files = null; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  removeEventListener(name) { this.listeners.delete(name); }
  setAttribute() {}
  emit(name) { this.listeners.get(name)?.({ preventDefault() {} }); }
}
const keys = ['exportButton', 'importButton', 'importInput', 'status', 'recoveryButton',
  'passwordDialog', 'passwordForm', 'passwordInput', 'passwordConfirmInput',
  'passwordConfirmRow', 'passwordVisibilityToggle', 'passwordError', 'passwordDescription', 'passwordSubmit', 'passwordCancel'];
const ui = Object.fromEntries(keys.map(key => [key, new FakeElement()]));
globalThis.window = { confirm: () => true };
const waitFor = async condition => {
  for (let i = 0; i < 200; i++) {
    if (condition()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for UI state');
};
setupWorkbenchBackup(ui);
await waitFor(() => ui.importButton.disabled === false);
assert.equal(ui.recoveryButton.hidden, true);

// Emulate a recovery journal becoming pending after the page's initial check,
// e.g. due to another tab. The import must reject the outstanding journal and
// immediately refresh the recovery UI within this page.
const snapshot = { documentTemplates: [], redIndex: null, presetDocuments: [], printHistory: [] };
await savePendingRecovery(snapshot);
const archive = await createBackupArchive(snapshot);
ui.importInput.files = [new File([archive], 'backup.zip', { type: 'application/zip' })];
const capturedExpectedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => capturedExpectedErrors.push(args);
try {
  ui.importInput.emit('change');
  await waitFor(() => ui.recoveryButton.hidden === false && ui.recoveryButton.disabled === false);
} finally {
  console.error = originalConsoleError;
}
assert.ok(capturedExpectedErrors.some(parts => String(parts[1]).includes('復旧データ')), 'expected a restore refusal for a pending recovery');
assert.equal(ui.importButton.disabled, true, 'pending recovery must block a second restore');
assert.equal(ui.exportButton.disabled, false, 'export remains available');
assert.ok((await readPendingRecovery())?.snapshot, 'recovery journal must remain intact');
assert.match(ui.status.textContent, /復旧データ.*残っています|復旧データ.*残って/);

// A manually fired input change must also be rejected while recovery remains pending.
ui.importInput.files = [new File([archive], 'backup.zip', {type:'application/zip'})];
ui.importInput.emit('change');
assert.match(ui.status.textContent, /先に元のデータを復旧/);
assert.equal(ui.importButton.disabled, true);
// Simulate a page reload: the persisted recovery journal must still prevent imports.
const newUi = Object.fromEntries(keys.map(key => [key, new FakeElement()]));
setupWorkbenchBackup(newUi);
await waitFor(() => newUi.recoveryButton.hidden === false && newUi.recoveryButton.disabled === false);
assert.equal(newUi.importButton.disabled, true);
console.log('PASS: failed import reveals recovery button, blocks restores, and survives reload');
