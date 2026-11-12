import assert from 'node:assert/strict';
import { restoreWithRecovery, recoverPreviousState } from '../dist/backup/restore-engine.js';
import { createRestoredSnapshot } from '../dist/backup/restore-policy.js';
const previous = {documentTemplates: [], redIndex: null, presetDocuments: [], printHistory:[{id:'keep'}]};
const incoming = { ...previous, printHistory: [], sourceBackupVersion:2 };
function environment({failSave=false,failAt=0,failRollback=false,failClear=false}={}) {
  const events = [];
  let current = previous;
  let recovery = null;
  let replacements = 0;
  const deps = {
    read: async () => current,
    replace: async value => {
      replacements++;
      events.push('replace');
      if ((failAt && replacements === failAt) || (failRollback && replacements === 2)) throw Error('write failed');
      current = value;
    },
    getRecovery: async () => recovery && {snapshot:recovery,createdAt:0,id:'pending'},
    saveRecovery: async value => {events.push('journal');if(failSave)throw Error('quota'); recovery=value;},
    clearRecovery: async () => {events.push('clear');if(failClear)throw Error('clear failed'); recovery=null;}
  };
  return {events,deps,get:()=>({current,recovery,replacements})};
}
// Successful restore records recovery before mutating, and clears on success.
let e=environment();
await restoreWithRecovery(incoming,e.deps);
assert.deepEqual(e.events,['journal','replace','clear']);
assert.equal(e.get().recovery,null);
assert.equal(e.get().current.printHistory.length,0);
// Journal failure must prevent all writes.
e=environment({failSave:true});
await assert.rejects(restoreWithRecovery(incoming,e.deps),/quota/);
assert.equal(e.get().replacements,0);
// First write fails: original state is restored and journal removed.
e=environment({failAt:1});
await assert.rejects(restoreWithRecovery(incoming,e.deps),/write failed/);
assert.equal(e.get().recovery,null);
assert.equal(e.get().current.printHistory.length,1);
// Rollback failure retains recovery record and can be recovered after restart.
e=environment({failAt:1,failRollback:true});
const originalLog = console.error;
try {
  console.error = () => {}; // このケースでは復旧失敗ログが期待どおり出る。
  await assert.rejects(restoreWithRecovery(incoming,e.deps),/復旧コピー/);
} finally {
  console.error = originalLog;
}
assert.ok(e.get().recovery);
await assert.rejects(restoreWithRecovery(incoming,e.deps),/復旧データ/);
await recoverPreviousState(e.deps);
assert.equal(e.get().recovery,null);
// Old v1 backups retain existing history as specified.
assert.equal(createRestoredSnapshot({...incoming,sourceBackupVersion:1},previous).printHistory.length,1);
console.log('PASS: restore journal before writes; abort on quota; rollback; interrupted recovery; legacy history');
