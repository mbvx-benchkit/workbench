import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();

class FakeStorage {
    values = new Map();
    getItem(key) { return this.values.get(key) ?? null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
}
class FairLockManager {
    queue = [];
    exclusive = false;
    readers = 0;
    request(name, options, callback) {
        assert.equal(name, 'workbench:data-integrity:v1');
        return new Promise((resolve, reject) => {
            this.queue.push({mode: options.mode, callback, resolve, reject});
            this.dispatch();
        });
    }
    dispatch() {
        if (this.exclusive) return;
        while (this.queue.length) {
            const task = this.queue[0];
            if (task.mode === 'exclusive' && this.readers) return;
            this.queue.shift();
            if (task.mode === 'exclusive') this.exclusive = true;
            else this.readers++;
            Promise.resolve().then(task.callback).then(task.resolve, task.reject).finally(() => {
                if (task.mode === 'exclusive') this.exclusive = false;
                else this.readers--;
                this.dispatch();
            });
            if (task.mode === 'exclusive') return;
        }
    }
}
const storage = new FakeStorage();
const locks = new FairLockManager();
globalThis.window = {localStorage:storage};
globalThis.localStorage = storage;
globalThis.document = {};
Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{locks} });

const root = await import('../dist/workbench-data-lock.js');
const builder = await import('../document_builder/dist/workbench-data-lock.js');
const gos = await import('../gosplan13/dist/workbench-data-lock.js');
const red = await import('../red_index/dist/workbench-data-lock.js');
const wait = () => new Promise(resolve => setImmediate(resolve));
let releaseWriter, releaseRestore;
const events = [];
const writer = root.withWorkbenchWriteLock(async () => {
    events.push('write-start');
    await new Promise(resolve => {releaseWriter = resolve;});
    events.push('write-end');
});
while (!releaseWriter) await wait();
const restore = root.withWorkbenchRestoreLock(async session => {
    events.push('restore-start');
    session.beginReplacement();
    await new Promise(resolve => {releaseRestore = resolve;});
    session.finishReplacement();
    events.push('restore-end');
});
const stale = builder.withWorkbenchWriteLock(() => events.push('stale-write'));
const sameModuleQueuedWrite = root.withWorkbenchWriteLock(() => events.push('queued-in-root'));
await wait();
assert.deepEqual(events, ['write-start'], 'restore must wait for in-flight write');
releaseWriter();
await writer;
while (!releaseRestore) await wait();
assert.deepEqual(events, ['write-start','write-end','restore-start']);
releaseRestore();
await restore;
await assert.rejects(stale, /別のタブでWORKBENCHの復元/);
await assert.rejects(sameModuleQueuedWrite, /別のタブでWORKBENCHの復元/);
assert.ok(!events.includes('stale-write') && !events.includes('queued-in-root'), 'queued writes cannot override restored data');

// New browser tab opened after restoration is allowed; stale tabs stay blocked.
const fresh = await import('../dist/workbench-data-lock.js?freshTab');
assert.equal(await fresh.withWorkbenchWriteLock(() => 'new-ok'), 'new-ok');
await assert.rejects(gos.withWorkbenchWriteLock(() => 'old'), /別のタブ/);
await assert.rejects(red.withWorkbenchWriteLock(() => 'old'), /別のタブ/);
const redStorage = await import('../red_index/dist/storage.js');
await assert.rejects(redStorage.saveRedIndexData({categories:[]}), /別のタブ/);

// Failed replacement keeps a marker and blocks all normal persistence.
await assert.rejects(fresh.withWorkbenchRestoreLock(async session => {
    session.beginReplacement();
    throw Error('simulated power loss');
}), /simulated power loss/);
await assert.rejects(fresh.withWorkbenchWriteLock(() => 'unsafe'), /別のタブ|復元または復旧が完了していません/);
const recoveringTab = await import('../red_index/dist/workbench-data-lock.js?recoveryTab');
// Recovery is still possible in a tab opened *while* the marker exists.
assert.equal(await recoveringTab.withWorkbenchRestoreLock(async session => {
    session.beginReplacement();
    session.finishReplacement();
    return 'recovered';
}, true), 'recovered');
const postRecovery = await import('../dist/workbench-data-lock.js?afterRecovery');
assert.equal(await postRecovery.withWorkbenchWriteLock(() => 'safe'), 'safe');
assert.equal(await recoveringTab.withWorkbenchWriteLock(() => 'recovery-tab-ok'), 'recovery-tab-ok');
await assert.rejects(fresh.withWorkbenchWriteLock(() => 'old'), /別のタブ/);

// An old-build recovery journal (without a marker) must also block writes.
const {savePendingRecovery, clearPendingRecovery} = await import('../dist/backup/restore-recovery.js');
await savePendingRecovery({documentTemplates:[],presetDocuments:[],printHistory:[],redIndex:null});
await assert.rejects(postRecovery.withWorkbenchWriteLock(() => 'unsafe'), /復旧待ちのデータ/);
await clearPendingRecovery();
assert.equal(await postRecovery.withWorkbenchWriteLock(() => 'safe'), 'safe');

// Browser without Web Locks must fail closed rather than fake protection.
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
await assert.rejects(postRecovery.withWorkbenchWriteLock(() => 'unsafe'), /Web Locks/);
await assert.rejects(postRecovery.withWorkbenchRestoreLock(async()=>{}), /Web Locks/);
console.log('PASS: cross-tab shared/exclusive coordination, stale epoch, recovery, legacy journal and fail-closed support');
