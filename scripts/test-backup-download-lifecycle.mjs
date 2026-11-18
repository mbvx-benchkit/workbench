/** A download trigger is not the same as a confirmed file save. */
import assert from 'node:assert/strict';
import { downloadBlob } from '../dist/backup/backup-ui-utils.js';

const saved = { URL: globalThis.URL, document: globalThis.document, window: globalThis.window };
const calls = {clicked: 0, removed: 0, revoked: [], scheduled: null};
try {
  globalThis.URL = {
    createObjectURL(blob) { assert.ok(blob instanceof Blob); return 'blob:workbench-test'; },
    revokeObjectURL(url) { calls.revoked.push(url); }
  };
  globalThis.document = {
    body: {appendChild(anchor) {assert.ok(anchor);}},
    createElement(name) {
      assert.equal(name, 'a');
      return {style: {}, download: '', href: '', click() {calls.clicked++;}, remove() {calls.removed++;}};
    }
  };
  globalThis.window = {setTimeout(fn, delay) {calls.scheduled = {fn, delay};}};
  downloadBlob(new Blob(['encrypted data']), 'WORKBENCH_backup_test.wbenc');
  assert.equal(calls.clicked, 1);
  assert.equal(calls.removed, 1);
  assert.equal(calls.revoked.length, 0, 'object URL must survive immediate anchor cleanup');
  assert.ok(calls.scheduled.delay >= 30_000, 'allow time for browser to initiate large downloads');
  calls.scheduled.fn();
  assert.deepEqual(calls.revoked, ['blob:workbench-test']);
} finally {
  globalThis.URL = saved.URL;
  globalThis.document = saved.document;
  globalThis.window = saved.window;
}
console.log('PASS: backup download URL survives initiation and is eventually revoked');
