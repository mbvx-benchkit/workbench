import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const recovery = await import('../dist/backup/restore-recovery.js');
const data = {documentTemplates:[],redIndex:null,presetDocuments:[],printHistory:[
  {id:'file-1',recipientName:'sample',fileName:'sample.pdf',createdAt:10,pdfBlob:new Blob(['PDF'])}
]};
assert.equal(await recovery.readPendingRecovery(),null);
await recovery.savePendingRecovery(data);
assert.equal((await recovery.readPendingRecovery()).snapshot.printHistory[0].pdfBlob.size,3);
await assert.rejects(recovery.savePendingRecovery(data),/Constraint|中断|失敗/);
assert.ok(await recovery.readPendingRecovery(), 'duplicate must not overwrite recovery');
await recovery.clearPendingRecovery();
assert.equal(await recovery.readPendingRecovery(),null);
console.log('PASS: persistent recovery storage; duplicate protection; cleanup');
