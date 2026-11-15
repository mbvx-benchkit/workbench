/** Check version metadata and footer wiring across every tool. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pages=['index.html','gosplan13/index.html','inventory_batch/index.html','red_index/index.html','document_builder/index.html'];
for(const file of pages){
 const html=fs.readFileSync(file,'utf8');
 assert.equal((html.match(/data-workbench-build-info/g)||[]).length,1,file+' has exactly one metadata slot');
 assert.equal((html.match(/workbench-build-info\.js/g)||[]).length,1,file+' loads build metadata once');
 assert.equal((html.match(/footer\.css/g)||[]).length,1,file+' loads shared footer CSS once');
 assert.equal((html.match(/class=\"footer__inner\"/g)||[]).length,1,file+' has one layout wrapper');
}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
assert.equal(lock.version,pkg.version);
assert.equal(lock.packages[''].version,pkg.version);
assert.match(pkg.scripts['prebuild:root'],/generate-build-info/);
const js=fs.readFileSync('dist/workbench-build-info.js','utf8');
assert.ok(js.includes(JSON.stringify(pkg.version)));
assert.match(js,/build:/,'footer shows compact build label');
const stamp=js.match(/"builtAt":"([^"]+)"/);
assert.ok(stamp&&!Number.isNaN(Date.parse(stamp[1])),'build timestamp must be ISO8601');
console.log('PASS: WORKBENCH footer version, build timestamp and five-page wiring');
