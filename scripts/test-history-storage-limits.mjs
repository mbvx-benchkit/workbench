/** PDF-history write guards must agree with the backup exporter. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const { addPrintHistory, getPrintHistoryStats } = await import('../document_builder/dist/print-history-db.js');
const blob = new Blob(['%PDF-demo']);
assert.deepEqual(await getPrintHistoryStats(), {count:0,totalBytes:0});
const open = indexedDB.open('workbench-document-print-history', 3);
const db = await new Promise((resolve,reject) => {open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
const tx = db.transaction('history-stats', 'readwrite');
const completed = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
tx.objectStore('history-stats').put({id:'total',count:5000,totalBytes:100});
await completed;
db.close();
await assert.rejects(addPrintHistory('test','test.pdf',blob), /5,000件/);
const oversized = new Blob(['%PDF']);
Object.defineProperty(oversized, 'size', {value: 64 * 1024 * 1024 + 1});
await assert.rejects(addPrintHistory('test','test.pdf',oversized), /64MiB/);
console.log('PASS: new PDF history writes reject the archive count and size limits');
