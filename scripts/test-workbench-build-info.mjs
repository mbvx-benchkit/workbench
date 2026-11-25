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

// Footer regression: no stale hard-coded version or copyright in the five pages.
for (const file of pages) {
 const html = fs.readFileSync(file, 'utf8');
 const footer = html.match(/<footer class="footer">[\s\S]*?<\/footer>/)?.[0];
 assert.ok(footer, file + ' has a shared footer');
 assert.doesNotMatch(footer, /footer__copyright|Copyright|WORKBENCH v\d/);
 assert.match(footer, /data-workbench-build-info>WORKBENCH<\/small>/);
}
const css = fs.readFileSync('css/footer.css', 'utf8');
assert.match(css, /justify-content:\s*center/);
assert.match(css, /text-align:\s*center/);
assert.doesNotMatch(css, /space-between|footer__copyright|min-height:\s*60px/);
const {runInNewContext} = await import('node:vm');
const slot = {textContent: ''};
runInNewContext(js, {document: {querySelectorAll(selector) {
 assert.equal(selector, '[data-workbench-build-info]');
 return [slot];
}}});
assert.ok(slot.textContent.startsWith('WORKBENCH v' + pkg.version + '  ·  build: '));
assert.ok(slot.textContent.endsWith(' JST'));
console.log('PASS: compact footer, fallback and generated metadata rendering');
