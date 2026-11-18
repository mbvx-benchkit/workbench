import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const recovery = await import('../dist/backup/restore-recovery.js');
const vault = await import('../shared/print-history-vault.js');
await vault.createHistoryVault('history test password long 2026!');
await vault.addSealedHistory('sample','sample.pdf',new Blob(['PDF']));
const snapshot = await vault.readOpaqueHistorySnapshot();
const data = {documentTemplates:[],redIndex:null,presetDocuments:[],
  printHistory:snapshot.entries, historyVaultConfig:snapshot.config};
assert.equal(await recovery.readPendingRecovery(),null);
await assert.rejects(recovery.savePendingRecovery({...data,printHistory:[{id:'bad',pdfBlob:new Blob(['PDF'])}]}),/暗号化/);
await recovery.savePendingRecovery(data);
assert.equal((await recovery.readPendingRecovery()).snapshot.printHistory[0].pdfBytes,3);
await assert.rejects(recovery.savePendingRecovery(data),/Constraint|中断|失敗/);
assert.ok(await recovery.readPendingRecovery(), 'duplicate must not overwrite recovery');
await recovery.clearPendingRecovery();
assert.equal(await recovery.readPendingRecovery(),null);
console.log('PASS: persistent recovery storage; duplicate protection; cleanup');
