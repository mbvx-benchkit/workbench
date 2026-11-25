/** Credential form hints and the shared transparent favicon remain wired across every page. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathAllowed} from './audit-publication.mjs';
const root = new URL('../', import.meta.url);
const ui = readFileSync(new URL('shared/history-vault-ui.js',root),'utf8');
const vault = readFileSync(new URL('shared/print-history-vault.js',root),'utf8');
assert.match(ui,/form\.id = `workbench-history-\$\{purpose\}-form`/);
assert.match(ui,/form\.name = `workbench-history-\$\{purpose\}-form`/);
assert.match(ui,/username\.value = 'workbench-pdf-history'/);
assert.match(ui,/input\.name = `workbench_history_\$\{identifier\.replace/);
assert.match(ui,/input\.autocomplete = `section-workbench-history \$\{autocomplete\}`/);
assert.match(ui,/current-password/);
assert.match(ui,/new-password/);
assert.match(ui,/confirm-password/);
assert.match(ui,/beginVaultMigration\(total\)/);
assert.match(vault,/const progress = beginVaultMigration\(legacyIds.length\)/);
assert.match(vault,/update\.objectStore\(HISTORY\)\.put\(sealed\);update\.objectStore\(META\)\.put\(metadataOf\(sealed\)\)/);
const icon = readFileSync(new URL('favicon.ico',root));
assert.deepEqual([...icon.subarray(0,4)],[0,0,1,0],'must be a genuine Windows ICO file');
const count=icon.readUInt16LE(4);
assert.ok(count>=4,'ICO must include several resolutions');
const dimensions=[];
for(let i=0;i<count;i++){
  const off=6+i*16;
  dimensions.push([icon[off]||256,icon[off+1]||256]);
  const size=icon.readUInt32LE(off+8),offset=icon.readUInt32LE(off+12);
  assert.ok(size>0 && offset+size<=icon.length,'ICO directory must be valid');
}
for(const size of [16,32,48,256]) assert.ok(dimensions.some(([w,h])=>w===size&&h===size),`missing ${size}px favicon`);
for(const page of ['index.html','gosplan13/index.html','inventory_batch/index.html','red_index/index.html','document_builder/index.html']) {
  const html=readFileSync(new URL(page,root),'utf8');
  const href=page==='index.html'?'./favicon.ico':'../favicon.ico';
  assert.ok(html.includes(`<link rel="icon" type="image/x-icon" href="${href}">`),`${page}: missing favicon reference`);
}
const ignored=readFileSync(new URL('.gitignore',root),'utf8');
assert.match(ignored,/^!\/favicon\.ico$/m,'only the root favicon must be exempted from the image ignore rule');
assert.equal(pathAllowed('favicon.ico'),true,'the shared public favicon may be staged');
for(const path of ['other.ico','gosplan13/favicon.ico','private/favicon.ico','favicon.ico.pdf']) {
  assert.equal(pathAllowed(path),false,'other icons and private files must remain blocked');
}
console.log('PASS: history password form identity, autofill hints, migration UI, favicon and 5-page references');
