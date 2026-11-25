// Copy only reviewed runtime assets after a successful build; no recursive source copy.
import { copyFileSync, lstatSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runtimePaths } from './audit-publication.mjs';

const root = realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim());
process.chdir(root);
const site = join(root, 'site');
const tracked = execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
if (tracked.some(p => p === 'site' || p.startsWith('site/'))) throw Error('site must not be tracked');
const paths = runtimePaths(tracked);
// Validate all inputs before replacing the previous disposable output.
for (const p of paths) {
  const source = join(root, p);
  if (!lstatSync(source).isFile() || realpathSync(source) !== source) throw Error('Runtime asset is not a regular file');
}
let previous;
try { previous = lstatSync(site); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (previous && (!previous.isDirectory() || previous.isSymbolicLink())) throw Error('site must be a normal directory');
rmSync(site, {recursive:true, force:true});
mkdirSync(site);
try {
  for (const p of paths) {
    const target = join(site, p);
    mkdirSync(dirname(target), {recursive:true});
    copyFileSync(join(root, p), target);
  }
} catch (e) {
  rmSync(site, {recursive:true, force:true});
  throw e;
}
console.log(`[WORKBENCH] Prepared ${paths.length} runtime files in site/`);
