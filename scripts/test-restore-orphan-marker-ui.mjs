/** Journal-free restore marker must expose a recovery action, without replacing data. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const stored = new Map([['workbench:restore-in-progress:v1', 'interrupted-recovery']]);
const storage = {getItem:k=>stored.get(k)??null, setItem:(k,v)=>stored.set(k,String(v)), removeItem:k=>stored.delete(k)};
globalThis.window = {localStorage:storage, confirm:()=>true};
globalThis.localStorage = storage;
globalThis.document = {};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(name,opts,fn)=>fn()}}});
const { hasWorkbenchRestoreMarker, withWorkbenchWriteLock } = await import('../dist/workbench-data-lock.js');
const {readPendingRecovery} = await import('../dist/backup/restore-recovery.js');
const {setupWorkbenchBackup} = await import('../dist/backup/backup.js');
assert.equal(await readPendingRecovery(),null);
assert.equal(hasWorkbenchRestoreMarker(), true);
class FakeElement {
  constructor() {this.listeners=new Map();this.disabled=false;this.hidden=false;this.textContent='';this.value='';this.files=null;}
  addEventListener(name,fn) {this.listeners.set(name,fn);}
  setAttribute() {}
  emit(name) {this.listeners.get(name)?.({preventDefault(){}});}
}
const keys=['exportButton','importButton','importInput','status','recoveryButton','passwordDialog',
'passwordForm','passwordInput','passwordConfirmInput','passwordConfirmRow','passwordVisibilityToggle',
'passwordError','passwordDescription','passwordSubmit','passwordCancel'];
const ui=Object.fromEntries(keys.map(k=>[k,new FakeElement()]));
let refreshed=0;
setupWorkbenchBackup({...ui,onRestored:async()=>{refreshed++;}});
const waitFor=async(f)=>{for(let i=0;i<300;i++){if(f())return;await new Promise(r=>setTimeout(r,5));}throw Error('timeout');};
await waitFor(()=>ui.recoveryButton.hidden===false && ui.recoveryButton.disabled===false);
assert.equal(ui.importButton.disabled,true, 'new restore stays blocked until stale marker repaired');
assert.match(ui.status.textContent, /保存ロック/);
await assert.rejects(withWorkbenchWriteLock(()=>{}), /復元|別のタブ/);
ui.recoveryButton.emit('click');
await waitFor(()=>!hasWorkbenchRestoreMarker() && ui.importButton.disabled===false);
assert.equal(await readPendingRecovery(),null);
assert.equal(refreshed,1);
assert.match(ui.status.textContent, /保存ロックを解除/);
assert.equal(await withWorkbenchWriteLock(()=>42),42);
// A normal restore clears the marker *before* dropping the recovery journal.
const {restoreWithRecovery}=await import('../dist/backup/restore-engine.js');
const original={documentTemplates:[],presetDocuments:[],printHistory:[],redIndex:null};
let pending=null;
await restoreWithRecovery({...original,sourceBackupVersion:2},{
  read:async()=>original,
  replace:async()=>{},
  getRecovery:async()=>pending && {id:'pending',createdAt:0,snapshot:pending},
  saveRecovery:async snapshot=>{pending=snapshot;},
  clearRecovery:async()=>{
    assert.equal(hasWorkbenchRestoreMarker(),false, 'release marker before journal deletion');
    assert.ok(pending, 'journal remains durable until marker cleared');
    pending=null;
  }
});
assert.equal(pending,null);
console.log('PASS: marker-only recovery UI and crash-safe marker/journal cleanup order');
