/** Verify a committed preset is never reported as a failed IndexedDB save. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();

const { getPresetDocuments } = await import('../dist/preset/preset-db.js');
const { createPresetEditorSubmit } = await import('../dist/preset/preset-manager-submit.js');

const pdf = new File(['%PDF-1.4\n', ' '.repeat(140), '\nstartxref\n9\n%%EOF\n'], 'sample.pdf', {type: 'application/octet-stream'});
const errors = [];
const logs = [];
const originalConsoleError = console.error;
console.error = (...args) => logs.push(args);

const makeDeps = ({notify = async () => {}, refresh = async () => {}, previous = null} = {}) => ({
  titleInput: {value: '定型印刷物A', focus() {}},
  descriptionInput: {value: 'テスト用'},
  pdfInput: {files: [pdf], focus() {}},
  previewInput: {files: null, focus() {}},
  saveButton: {disabled: false, textContent: '保存'},
  dialog: {closed: false, close() {this.closed = true;}},
  editingDocument: previous,
  editorOrigin: 'manager',
  getSelectedOrientation: () => 'portrait',
  hideEditorError: () => {},
  showEditorError: message => errors.push(message),
  notifyChanged: notify,
  refreshManagerList: refresh,
  resetEditor: () => {},
  showListView: () => {}
});

try {
  // 1) DB commit succeeds but main page redraw fails.
  const deps = makeDeps({notify: async () => {throw new Error('Main UI is unavailable');}});
  await createPresetEditorSubmit(deps).handleSubmit({preventDefault() {}});
  const docs = await getPresetDocuments();
  assert.equal(docs.length, 1, 'exactly one preset should have been saved');
  assert.match(errors.at(-1), /保存は完了.*画面.*更新/);
  assert.equal(deps.editingDocument?.id, docs[0].id, 'retain committed ID to avoid duplicate on retry');
  assert.equal(deps.saveButton.disabled, false);
  assert.equal(deps.saveButton.textContent, '保存');

  // 2) User retries after a redraw failure. It must update, not insert.
  const retry = makeDeps({previous: deps.editingDocument});
  await createPresetEditorSubmit(retry).handleSubmit({preventDefault() {}});
  assert.equal((await getPresetDocuments()).length, 1, 'retry must not duplicate the preset');
  assert.equal(retry.editingDocument, null, 'successful save clears editor state');

  // 3) DB commit succeeds but manager list refresh fails.
  const manager = makeDeps({refresh: async () => {throw new Error('Manager refresh failed');}, previous: docs[0]});
  await createPresetEditorSubmit(manager).handleSubmit({preventDefault() {}});
  assert.match(errors.at(-1), /保存は完了.*画面.*更新/);
  assert.equal((await getPresetDocuments()).length, 1);
  assert.equal(manager.editingDocument?.id, docs[0].id);
  assert.ok(logs.some(args => String(args[0]).includes('画面の更新')));
} finally {
  console.error = originalConsoleError;
}
console.log('PASS: committed preset is not mislabeled as failed; retries are idempotent');
