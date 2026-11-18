/** 48 image-bearing labels exported by GOSPLAN13 must remain importable. */
import assert from 'node:assert/strict';
import { stringifyExportData } from '../gosplan13/dist/export.js';
import { readJsonFile } from '../gosplan13/dist/import-utils.js';
import { MAX_GOSPLAN13_JSON_BYTES, assertExportJsonFits } from '../gosplan13/dist/json-file-policy.js';
const base64 = 'A'.repeat(600 * 1024 / 3 * 4); // 600KiB JPEG -> 800KiB Base64
const labels = Array.from({length:48}, (_, index) => ({
  name:`商品${index}`, jan:`000${index}`, image:`data:image/jpeg;base64,${base64}`
}));
const json = stringifyExportData({app:'GOSPLAN13',version:1,exportedAt:new Date().toISOString(),settings:{imageMode:true},labels});
const blob = new Blob([json], {type:'application/json'});
assert.ok(blob.size > 10 * 1024 * 1024, 'test must cover previously rejected size');
assert.ok(blob.size < MAX_GOSPLAN13_JSON_BYTES, 'realistic full sheet must fit');
assertExportJsonFits(json);
const restored = await readJsonFile(new File([blob], 'gosplan.json', {type:'application/json'}));
assert.equal(restored.labels.length, 48);
assert.equal(restored.labels[47].image, labels[47].image);
let reads = 0;
await assert.rejects(readJsonFile({size:MAX_GOSPLAN13_JSON_BYTES+1, text: async()=>{reads++;return '{}';}}), /64MiB/);
assert.equal(reads, 0);
console.log('PASS: 48 image-bearing labels export/import roundtrip and symmetric 64MiB limit');
