import assert from 'node:assert/strict';
import { BackupSizeBudget, MAX_ARCHIVE_ENTRY_BYTES, MAX_ARCHIVE_EXPANDED_BYTES } from '../dist/backup/backup-limits.js';
import { createBackupArchive, readBackupArchive } from '../dist/backup/backup-zip.js';
const size = new BackupSizeBudget();
size.add('a.pdf',MAX_ARCHIVE_ENTRY_BYTES);
assert.throws(()=>size.add('too-big.pdf',MAX_ARCHIVE_ENTRY_BYTES+1),/大きすぎ/);
assert.throws(()=>size.add('x.json',20_000_001),/大きすぎ/);
for (let i=0;i<7;i++) size.add(`${i}.pdf`,MAX_ARCHIVE_ENTRY_BYTES);
assert.equal(size.bytes,MAX_ARCHIVE_EXPANDED_BYTES);
assert.throws(()=>size.add('one-more.pdf',1),/上限/);
const empty = {documentTemplates:[],redIndex:null,presetDocuments:[],printHistory:[]};
const archive = await createBackupArchive(empty);
assert.equal((await readBackupArchive(new Uint8Array(await archive.arrayBuffer()))).sourceBackupVersion,3);
await assert.rejects(createBackupArchive({...empty,documentTemplates:[{payload:'x'.repeat(20_000_010)}]}),/大きすぎ/);
console.log('PASS: export size limits and archive import limits match');

// The export limit must match the import parser's 5,000-record limit.
const { MAX_PRINT_HISTORY_RECORDS, parsePrintHistoryArchive } = await import('../dist/backup/backup-types.js');
assert.equal(MAX_PRINT_HISTORY_RECORDS, 5_000);
const excessHistory = Array.from({length: MAX_PRINT_HISTORY_RECORDS + 1}, (_, index) => ({
  id: `h-${index}`, recipientName: 'test', fileName: `${index}.pdf`, createdAt: 0,
  pdfBlob: new Blob(['%PDF-test'])
}));
await assert.rejects(createBackupArchive({...empty, printHistory: excessHistory}), /最大5,000件/);
assert.throws(() => parsePrintHistoryArchive({version: 1, documents: excessHistory}), /件数が多すぎ/);
const allowedMetadata = excessHistory.slice(0, MAX_PRINT_HISTORY_RECORDS).map((entry, index) => ({
  id: entry.id, recipientName: entry.recipientName, fileName: entry.fileName,
  createdAt: entry.createdAt, pdfMimeType: 'application/pdf',
  pdfPath: `document_builder/print-history/pdf/${String(index + 1).padStart(5, '0')}.pdf`
}));
assert.equal(parsePrintHistoryArchive({version: 1, documents: allowedMetadata}).documents.length,
  MAX_PRINT_HISTORY_RECORDS, 'exactly 5,000 entries are allowed by the import parser');
console.log('PASS: PDF history 5,000-record export/import limit is consistent');
