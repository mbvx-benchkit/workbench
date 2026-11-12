import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const { getPresetDocuments, putPresetDocument, replaceAllPresetDocuments } = await import('../dist/preset/preset-db.js');
const doc = id => ({id,title:'Test',description:'',orientation:'portrait',pdfFileName:'test.pdf',
  pdfMimeType:'application/pdf',pdfBlob:new Blob(['%PDF']),previewFileName:null,previewMimeType:null,
  previewBlob:null,sortOrder:0,createdAt:1,updatedAt:1});
await putPresetDocument(doc('old'));
assert.equal((await getPresetDocuments())[0].id,'old');
// A synchronous DataError after clear() must abort the complete transaction.
await assert.rejects(replaceAllPresetDocuments([doc('new'),{...doc('broken'),id:undefined}]),/DataError/);
assert.equal((await getPresetDocuments())[0].id,'old','failed replacement must not clear originals');
await replaceAllPresetDocuments([doc('restored')]);
assert.equal((await getPresetDocuments())[0].id,'restored');
console.log('PASS: preset replacement aborts fully on synchronous invalid record');
