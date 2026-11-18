/** Verify a committed preset is never reported as a failed IndexedDB save. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();

const { getPresetDocuments } = await import('../dist/preset/preset-db.js');
const { createPresetEditorSubmit } = await import('../dist/preset/preset-manager-submit.js');

const pdf = new File(['%PDF-1.4\n', ' '.repeat(140), '\nstartxref\n9\n%%EOF\n'], 'sample.pdf', {type: 'application/octet-stream'});
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRf8AAAAASUVORK5CYII=', 'base64');
const preview = new File([pngBytes], 'preview.png', {type:'application/octet-stream'});
const errors = [];
const logs = [];
const originalConsoleError = console.error;
console.error = (...args) => logs.push(args);

const makeDeps = ({notify = async () => {}, refresh = async () => {}, previous = null, previewFile = null} = {}) => ({
  titleInput: {value: '定型印刷物A', focus() {}},
  descriptionInput: {value: 'テスト用'},
  pdfInput: {files: [pdf], focus() {}},
  previewInput: {files: previewFile ? [previewFile] : null, focus() {}},
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
  const deps = makeDeps({previewFile: preview, notify: async () => {throw new Error('Main UI is unavailable');}});
  await createPresetEditorSubmit(deps).handleSubmit({preventDefault() {}});
  const docs = await getPresetDocuments();
  assert.equal(docs.length, 1, 'exactly one preset should have been saved');
  assert.equal(docs[0].pdfBlob.type, 'application/pdf', 'Blob must use the normalized PDF MIME, not only metadata');
  assert.equal(docs[0].pdfMimeType, 'application/pdf');
  assert.equal(docs[0].previewBlob?.type, 'image/png');
  assert.equal(docs[0].previewMimeType, 'image/png');
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
  // Previously saved Blob metadata must also be repaired when re-editing without new file selection.
  const legacy = {...docs[0],pdfBlob:new Blob([docs[0].pdfBlob],{type:'application/octet-stream'}),
    pdfMimeType:'application/octet-stream',previewBlob:new Blob([pngBytes],{type:'application/octet-stream'}),previewMimeType:null};
  await createPresetEditorSubmit(makeDeps({previous:legacy})).handleSubmit({preventDefault(){}});
  const repaired = (await getPresetDocuments())[0];
  assert.equal(repaired.pdfBlob.type,'application/pdf');
  assert.equal(repaired.previewBlob.type,'image/png');
  assert.equal(repaired.previewMimeType,'image/png');
} finally {
  console.error = originalConsoleError;
}
console.log('PASS: committed preset is not mislabeled as failed; retries are idempotent');
