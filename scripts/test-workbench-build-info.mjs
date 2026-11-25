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
const footerRules=css.split('/* Shared release history:')[0];
assert.match(footerRules, /justify-content:\s*center/);
assert.match(footerRules, /text-align:\s*center/);
assert.doesNotMatch(footerRules, /space-between|footer__copyright|min-height:\s*60px/);
const {BUILD_INFO,RELEASES}=await import('../dist/workbench-build-info.js');
const records=JSON.parse(fs.readFileSync('release-notes.json','utf8'));
assert.equal(BUILD_INFO.version,pkg.version);
assert.equal(RELEASES[0].version,pkg.version);
assert.deepEqual(RELEASES.map(r=>r.version),records.map(r=>r.version));
assert.deepEqual(RELEASES.map(r=>r.date),records.map(r=>r.date),'release dates are independent of build time');
const changelog=fs.readFileSync('CHANGELOG.md','utf8');
for (const entry of RELEASES) {
 assert.ok(changelog.includes('## v'+entry.version));
 if (entry.date) assert.ok(changelog.includes(entry.date+' JST'));
 for (const link of entry.links) assert.ok(changelog.includes(link.href));
}
assert.match(css,/\.footer \.footer__release-button/);
assert.match(css,/\.release-history\s*\{[^}]*color-scheme:\s*light/);
assert.doesNotMatch(css,/prefers-color-scheme/);
assert.match(css,/@media print\s*\{\s*\.release-history, \.footer__release-button \{ display: none !important;/);
assert.ok(fs.existsSync('dist/release-history.js'));
// Preserve the plain-text version and build information even if a browser cannot open dialogs.
const slot={textContent:''};
try {
 globalThis.document={querySelectorAll(selector){assert.equal(selector,'[data-workbench-build-info]');return [slot];}};
 await import('../dist/workbench-build-info.js?footer-fallback');
 assert.ok(slot.textContent.startsWith('WORKBENCH v'+pkg.version+'  ·  build: '));
 assert.ok(slot.textContent.endsWith(' JST'));
} finally { delete globalThis.document; }
console.log('PASS: compact footer, release dates, generated metadata and shared changelog');
