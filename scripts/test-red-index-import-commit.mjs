/** Failed imports leave the current in-memory model intact. */
import assert from 'node:assert/strict';
const persisted=new Map();
let fail=true;
globalThis.localStorage={setItem:(k,v)=>{if(fail)throw Error('Quota exceeded');persisted.set(k,v);},getItem:k=>persisted.get(k)??null};
const { commitImportedRedIndexData }=await import('../red_index/dist/storage.js');
let live={categories:[]};
const original=live;
const candidate={categories:[{id:'new',name:'test',items:[]}]};
await assert.rejects(commitImportedRedIndexData(candidate, data=>{live=data;}), /Quota exceeded/);
assert.equal(live,original);
assert.equal(persisted.size,0);
fail=false;
await commitImportedRedIndexData(candidate, data=>{live=data;});
assert.equal(live,candidate);
assert.ok(persisted.size>0);
console.log('PASS: failed RED INDEX JSON import does not alter the live state');
