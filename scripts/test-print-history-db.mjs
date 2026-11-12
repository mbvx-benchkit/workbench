/** History migration, paginated read, add/delete, aggregate and backup replacement. */
import assert from 'node:assert/strict';
import { installFakeIndexedDB } from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const history = await import('../document_builder/dist/print-history-db.js');
const { replaceWorkbenchSnapshot, readWorkbenchSnapshot } = await import('../dist/backup/backup-storage.js');
const pdf = new Blob(['%PDF-1.7 demo'], {type:'application/pdf'});

function seed(version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('workbench-document-print-history', version);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore('history', { keyPath: 'id' });
      store.put({id:'old',recipientName:'旧データ',fileName:'old.pdf',createdAt:10,pdfBlob:pdf});
      if (version >= 2) {
        const meta = db.createObjectStore('history-meta', { keyPath:'id' });
        meta.createIndex('createdAtId', ['createdAt','id'], {unique:true});
        meta.put({id:'old',recipientName:'旧データ',fileName:'old.pdf',createdAt:10,pdfBytes:pdf.size});
      }
    };
    request.onsuccess = () => {request.result.close();resolve();};
    request.onerror = () => reject(request.error);
  });
}

for (const version of [1,2]) {
  indexedDB.reset();
  await seed(version);
  assert.deepEqual(await history.getPrintHistoryStats(), {count:1,totalBytes:pdf.size}, `v${version} migrated`);
  let page = await history.getPrintHistoryPage(null, 50);
  assert.equal(page.entries.length,1);
  assert.equal(page.entries[0].id,'old');
  assert.equal((await history.getPrintHistory('old'))?.pdfBlob.size,pdf.size);
  await history.addPrintHistory('新データ', 'new.pdf', pdf);
  assert.deepEqual(await history.getPrintHistoryStats(), {count:2,totalBytes:pdf.size*2});
  page = await history.getPrintHistoryPage(null, 1);
  assert.equal(page.entries.length, 1);
  assert.ok(page.nextCursor, 'next page cursor exists');
  const second = await history.getPrintHistoryPage(page.nextCursor, 1);
  assert.equal(second.entries.length,1);
  await history.deletePrintHistory('old');
  assert.deepEqual(await history.getPrintHistoryStats(), {count:1,totalBytes:pdf.size});
  assert.equal(await history.getPrintHistory('old'),null);
  // Full restore replaces both PDF and metadata/aggregates atomically.
  const snapshot = {documentTemplates:[],redIndex:null,presetDocuments:[],printHistory:[
    {id:'restored',recipientName:'復元',fileName:'restored.pdf',createdAt:200,pdfBlob:pdf}
  ]};
  await replaceWorkbenchSnapshot(snapshot);
  const restored = await readWorkbenchSnapshot();
  assert.equal(restored.printHistory.length,1);
  assert.equal(restored.printHistory[0].id,'restored');
  assert.deepEqual(await history.getPrintHistoryStats(), {count:1,totalBytes:pdf.size});
}
console.log('PASS: IndexedDB v1/v2 migration; add/delete; paged metadata; backup restore with aggregate');
