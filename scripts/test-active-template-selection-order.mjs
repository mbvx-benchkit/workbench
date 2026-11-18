/** Persist the latest selected template, regardless of shared-lock completion order. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const data=new Map();
const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
globalThis.window={localStorage:storage};
globalThis.document={};
globalThis.localStorage=storage;
let releaseFirst;
const gate=new Promise(resolve=>{releaseFirst=resolve;});
let requests=0;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(name,opts,cb)=>{
  requests++;
  if(requests===1) await gate;
  return cb();
}}}});
const {saveActiveTemplateId}=await import('../document_builder/dist/templates/active-template-storage.js');
const first=saveActiveTemplateId('selected-template','A');
const second=saveActiveTemplateId('selected-template','B');
for(let i=0;i<20 && requests===0;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(requests,1,'the second write must not overtake the first lock request');
releaseFirst();
await Promise.all([first,second]);
assert.equal(storage.getItem('selected-template'),'B');
console.log('PASS: active template selection persists in invocation order');
