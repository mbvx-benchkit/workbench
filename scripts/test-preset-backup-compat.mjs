/** Legacy MIME metadata and image signatures must round-trip without missing previews. */
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
// Browser JSZip accepts Blob; Node.js JSZip needs a promise of Uint8Array.
const zipFile = JSZip.prototype.file;
JSZip.prototype.file = function(name, data, options) {
  if (arguments.length === 1) return zipFile.call(this, name);
  if (data instanceof Blob) data = data.arrayBuffer().then(buffer => new Uint8Array(buffer));
  return zipFile.call(this, name, data, options);
};
import { createBackupArchive, readBackupArchive } from '../dist/backup/backup-zip.js';
import { assertRestorablePresetPdf, detectPresetPreviewMimeType } from '../dist/preset/preset-file-policy.js';

const pdfWriter = new jsPDF();
pdfWriter.text('Archive compatibility', 15, 20);
const pdfBlob = new Blob([pdfWriter.output('arraybuffer')], { type: 'application/octet-stream' });
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRf8AAAAASUVORK5CYII=', 'base64');
const previewBlob = new Blob([pngBytes]);
const doc = {
    id: 'legacy-mime-1', title: 'Legacy image', description: '', orientation: 'portrait',
    pdfFileName: 'document.pdf', pdfMimeType: 'application/octet-stream', pdfBlob,
    previewFileName: 'preview.png', previewMimeType: null, previewBlob,
    sortOrder: 0, createdAt: 1, updatedAt: 1
};
const archive = await createBackupArchive({documentTemplates: [], redIndex: null, presetDocuments: [doc], printHistory: []});
const restored = await readBackupArchive(new Uint8Array(await archive.arrayBuffer()));
assert.equal(restored.presetDocuments.length, 1);
assert.equal(restored.presetDocuments[0].pdfMimeType, 'application/pdf');
assert.equal(restored.presetDocuments[0].previewMimeType, 'image/png');
assert.equal(restored.presetDocuments[0].previewFileName, 'preview.png');
assert.equal(restored.presetDocuments[0].previewBlob.size, previewBlob.size);
// Old incomplete metadata should be repaired from bytes and a fallback file name.
const old = {...doc, previewFileName: null};
const fixed = await readBackupArchive(new Uint8Array(await (await createBackupArchive({documentTemplates: [], redIndex: null, presetDocuments: [old], printHistory: []})).arrayBuffer()));
assert.match(fixed.presetDocuments[0].previewFileName, /^preview\./);
assert.equal(await detectPresetPreviewMimeType(previewBlob), 'image/png');
await assertRestorablePresetPdf(pdfBlob);
// Invalid existing PDFs must fail export, never create an unrecoverable backup.
await assert.rejects(createBackupArchive({documentTemplates: [], redIndex: null,
    presetDocuments: [{...doc, pdfBlob: new Blob(['%PDF-???'])}], printHistory: []}), /バックアップできません/);
// Original in-memory IndexedDB records are not modified by backup export.
assert.equal(doc.pdfMimeType, 'application/octet-stream');
assert.equal(doc.previewMimeType, null);
console.log('PASS: legacy preset MIME and preview metadata roundtrip; irrecoverable source blocked');
