/** Regression tests for WORKBENCH backup ZIP reader. Run after: npm run build */
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { readBackupArchive } from '../dist/backup/backup-zip.js';
import { createRestoredSnapshot } from '../dist/backup/restore-policy.js';

const pdf = new jsPDF();
pdf.text('TEST PDF', 10, 20);
const validPdf = new Uint8Array(pdf.output('arraybuffer'));

async function createArchive(version, content = validPdf, extra = null, options = {}) {
  const zip = new JSZip();
  zip.file('document_builder/templates.json', JSON.stringify({ version: 1, templates: [] }));
  zip.file('red_index/data.json', 'null');
  zip.file('preset_documents/documents.json', JSON.stringify({ version: 1, documents: [] }));
  if (version === 2) {
    zip.file('document_builder/print-history/history.json', JSON.stringify({
      version: 1,
      documents: [{ id: 'history-1', recipientName: 'Test', fileName: 'test.pdf', createdAt: 123,
        pdfMimeType: 'application/pdf', pdfPath: 'document_builder/print-history/pdf/00001.pdf' }]
    }));
    zip.file('document_builder/print-history/pdf/00001.pdf', content);
  }
  zip.file('manifest.json', JSON.stringify({ format: 'workbench-backup', version,
    createdAt: '2026-11-12T00:00:00.000Z', contents: {
      documentBuilder: { templateCount: 0 }, redIndex: { present: false },
      presetDocuments: { documentCount: 0, pdfCount: 0, previewImageCount: 0 },
      ...(version === 2 ? { printHistory: { documentCount: 1, pdfCount: 1 } } : {})
    }
  }));
  if (extra) zip.file(extra.name, extra.data);
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: options.compression ?? 'DEFLATE' }));
}

const v2 = await readBackupArchive(await createArchive(2));
assert.equal(v2.sourceBackupVersion, 2);
assert.equal(v2.printHistory.length, 1);
assert.equal(v2.printHistory[0].pdfBlob.size, validPdf.length);
// Preset documents (the older backup feature) must still restore correctly.
const withPreset = await JSZip.loadAsync(await createArchive(2));
withPreset.file('preset_documents/pdf/001_test.pdf', validPdf);
withPreset.file('preset_documents/documents.json', JSON.stringify({version: 1, documents: [{
  id: 'preset-1', title: 'Test', description: '', orientation: 'portrait',
  pdfFileName: 'test.pdf', pdfMimeType: 'application/pdf',
  pdfPath: 'preset_documents/pdf/001_test.pdf',
  previewFileName: null, previewMimeType: null, previewPath: null,
  sortOrder: 0, createdAt: 123, updatedAt: 123
}]}));
const withPresetManifest = JSON.parse(await withPreset.file('manifest.json').async('string'));
withPresetManifest.contents.presetDocuments.documentCount = 1;
withPresetManifest.contents.presetDocuments.pdfCount = 1;
withPreset.file('manifest.json', JSON.stringify(withPresetManifest));
const presetRestored = await readBackupArchive(new Uint8Array(await withPreset.generateAsync({type:'uint8array'})));
assert.equal(presetRestored.presetDocuments.length, 1);
assert.equal(presetRestored.presetDocuments[0].pdfBlob.size, validPdf.length);
const v1 = await readBackupArchive(await createArchive(1));
assert.equal(v1.sourceBackupVersion, 1);
assert.equal(v1.printHistory.length, 0);
const existing = { ...v2, printHistory: v2.printHistory };
assert.equal(createRestoredSnapshot(v1, existing).printHistory.length, 1,
  'a legacy v1 import must retain current browser PDF history');
assert.equal(createRestoredSnapshot(v2, existing).printHistory.length, 1,
  'a v2 import replaces PDF history with archived data');
await assert.rejects(readBackupArchive(await createArchive(2, new TextEncoder().encode('%PDF-???'))), /PDF/);
const truncated = validPdf.subarray(0, validPdf.length - 30);
await assert.rejects(readBackupArchive(await createArchive(2, truncated)), /PDF/);
// Repetitive input is very small on disk but enormous after decompression.
const bomb = new Uint8Array(65 * 1024 * 1024);
await assert.rejects(readBackupArchive(await createArchive(1, validPdf, {
  name: 'unexpected-big-payload.dat', data: bomb
})), /大きすぎ|上限/);
// Optional heavy test (~576 MiB of raw data); keep default checks light.
if (process.argv.includes('--stress')) {
  const totalZip = new JSZip();
  for (let i = 0; i < 9; i++) totalZip.file(`test${i}.dat`, new Uint8Array(64 * 1024 * 1024));
  await assert.rejects(readBackupArchive(new Uint8Array(await totalZip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))), /上限/);
}
console.log('PASS: v2/v1 restore and history retention, PDF integrity, compressed ZIP bomb guard');
