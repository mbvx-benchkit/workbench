// One publication policy for staged, working-tree and committed snapshots.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText } from './check-source-secrets.mjs';

const exact = new Set(['favicon.ico','.nojekyll','.gitignore','package.json','package-lock.json','README.md','COPYRIGHT.md','SECURITY_GUIDE.md','CSP_GUIDE.md','SECURITY_FIXES.md','document_builder/PRINT_HISTORY.md','.github/workflows/security.yml','.github/workflows/codeql.yml','.github/workflows/pages.yml','.github/dependabot.yml','scripts/e2e-workbench.py']);
const pages = new Set(['index.html','gosplan13/index.html','inventory_batch/index.html','red_index/index.html','document_builder/index.html']);
const csp = "default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; frame-src 'self' blob:; worker-src 'none'; form-action 'self'; base-uri 'none'; media-src 'none'; manifest-src 'self'";
// Exact public third-party license lines, only in the existing bundled jsPDF output.
// A dependency update that changes these notices must be reviewed, not broadly exempted.
const vendorLines = new Set([
'3ee1b615ef528dfd64afc97a6711065a92bb30d39575fa1571a4ff91687e74f6',
'792b3192af496e680d9034c01f2f566711ba7d4d8cf07f7144d2ecc3fe3c07ab',
'7ebe2d6bc83f35b1bf4677e86cf4530efc41d1dd8c1e59b257edf0c8c64391a9',
'7fbeeb34fc572407ff00d9648674b1add7f138d1fc77f6f1c3dfdc22b951d469',
'94e17c934cb906e76e3f30b078f6ca6189ef02921d97a4a381d8263fc111d167',
'a48535d931de47e3d3ebea953d1b4c30410a632a8507db32e388635fb4bd4962',
'b173252565b82d1edce019645ac0eda22ded22cd64bf1f56b6b6dff1fb321735',
'c0d11b8c9f4ef0f4b75312e15f43bce370891c0720577a8b09dfdcb6fca9f3d6']);
const digest = s => createHash('sha256').update(s).digest('hex');
const max = 32 * 1024 * 1024;
const sha = /^[a-f0-9]{40,64}$/;
const decoder = new TextDecoder('utf-8', { fatal: true });
function git(...args) { return execFileSync('git', args, { maxBuffer:max, stdio:['ignore','pipe','pipe'] }); }
function text(...args) { return git(...args).toString('utf8'); }
function split(s) { return s.split('\0').filter(Boolean); }
function emailAllowed(s) { return /@(?:users\.noreply\.github\.com|example\.(?:com|org|net|test)|example\.invalid)$/i.test(s); }
export function pathAllowed(p) {
  if (p.split('/').some(x=>!x || x==='.' || x==='..') || /[\x00-\x1f\x7f\\]/.test(p)) return false;
  if (/(?:^|\/)(?:source-pdf|backups|exports|output|downloads|private|secrets|local-data|temp|tmp)(?:\/|$)/i.test(p) || /^(?:backup|document_builder\/json)\//i.test(p)) return false;
  if (/(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|id_rsa[^/]*|id_ed25519[^/]*)$/i.test(p)) return false;
  if (exact.has(p) || /^(?:[^/]+\/)*tsconfig(?:\.[\w-]+)?\.json$/.test(p)) return true;
  if (p.startsWith('.github/')) return false;
  return /\.(?:ts|js|html|css|sh|mjs)$/.test(p);
}
function normal(s) { return s.normalize('NFKC').toLowerCase(); }
function terms(root) {
  const path = join(homedir(),'.config','workbench','private-terms.txt');
  let stat;
  try { stat = lstatSync(path); } catch(e) { if(e.code==='ENOENT') return []; throw e; }
  if(!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) || stat.size > 1024*1024) throw Error('非公開辞書は通常ファイル・権限600・1MiB以下にしてください。');
  const r = relative(root,realpathSync(path));
  if(r==='' || (!r.startsWith('..'+sep) && r!=='..')) throw Error('非公開辞書はリポジトリ外に置いてください。');
  return [...new Set(decoder.decode(readFileSync(path)).split(/\r?\n/).map(x=>normal(x.trim())).filter(x=>x && !x.startsWith('#')))];
}
export function scanPrivacy(s, p, dictionary=[], allowMetadataEmail=()=>false) {
  const rules = new Set();
  if(dictionary.length) { const n=normal(s); if(dictionary.some(t=>n.includes(t))) rules.add('非公開辞書'); }
  // Generic personal/business addresses; examples and GitHub noreply are public-safe.
  for(const [index,line] of s.split(/\r?\n/).entries()) {
    const matches=line.match(/[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
    if(matches.some(x=>!emailAllowed(x) && !allowMetadataEmail(x,line,index)) && !(p==='document_builder/dist/main.bundle.js' && vendorLines.has(digest(line.trim())))) rules.add('メールアドレス');
    if(/(?<!\d)0[789]0[-‐‑–ー ]\d{4}[-‐‑–ー ]\d{4}(?!\d)/.test(line)) rules.add('携帯電話番号');
  }
  return [...rules];
}
function cspOkay(s) {
  // Verify the real, leading head markup without deleting or joining input.
  // The five static pages use this simple HTML prologue; unfamiliar markup fails closed.
  const head=s.match(/^\uFEFF?[ \t\r\n\f]*<!doctype[ \t\r\n\f]+html[ \t\r\n\f]*>[ \t\r\n\f]*<html(?:[ \t\r\n\f]+lang[ \t\r\n\f]*=[ \t\r\n\f]*(?:"[a-z0-9-]+"|'[a-z0-9-]+'))?[ \t\r\n\f]*>[ \t\r\n\f]*<head[ \t\r\n\f]*>/i);
  if(!head) return false;
  const rest=s.slice(head[0].length);
  // Only whitespace, ordinary HTML comments and UTF-8 charset metadata may precede CSP.
  const policy=rest.match(/^(?:[ \t\r\n\f]|<!--(?!>|->)(?:[^-]|-(?!-))*-->|<meta[ \t\r\n\f]+charset[ \t\r\n\f]*=[ \t\r\n\f]*(?:"utf-8"|'utf-8')[ \t\r\n\f]*\/?>)*<meta[ \t\r\n\f]+http-equiv[ \t\r\n\f]*=[ \t\r\n\f]*(?:"content-security-policy"|'content-security-policy')[ \t\r\n\f]+content[ \t\r\n\f]*=[ \t\r\n\f]*(?:"([^"]*)"|'([^']*)')[ \t\r\n\f]*\/?>/i);
  if(!policy) return false;
  const value=policy[1]??policy[2];
  if(/[^\x20-\x7e\t\r\n\f]/.test(value)) return false;
  const norm=v=>v.split(';').map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean).sort().join(';');
  if(norm(value)!==norm(csp)) return false;
  // Preserve the single-policy check; skip comment tokens rather than modifying markup.
  for(const token of rest.slice(policy[0].length).matchAll(/<!--[\s\S]*?-->|<\/head\s*>|<meta\b[^>]*>/gi)) {
    if(/^<\/head/i.test(token[0])) break;
    if(/^<meta\b/i.test(token[0]) && /http-equiv\s*=\s*['"]Content-Security-Policy['"]/i.test(token[0])) return false;
  }
  return true;
}
function entries(ref) {
  const map=new Map();
  for(const row of split(text(...(ref==='index'?['ls-files','--stage','-z']:['ls-tree','-r','-z',ref])))) {
    const i=row.indexOf('\t'); const parts=row.slice(0,i).split(' '); const p=row.slice(i+1);
    if(ref==='index' && parts[2]!=='0') throw Error('未解決のマージ競合があります。');
    map.set(p,{mode:parts[0],oid:parts[ref==='index'?1:2]});
  } return map;
}
function changed(commit) {
  const parents=text('show','-s','--format=%P',commit).trim().split(' ').filter(Boolean);
  return split(text(...(parents.length?['diff','--name-only','--no-renames','-z','--diff-filter=ACMRT',parents[0],commit,'--']:['diff-tree','--root','--no-commit-id','-r','--name-only','--no-renames','-z','--diff-filter=ACMRT',commit])));
}
function currentPath(root,p) {
  const path=join(root,p); let stat;
  try {stat=lstatSync(path);} catch(e){if(e.code==='ENOENT') return null;throw e;}
  if(!stat.isFile() || stat.isSymbolicLink() || realpathSync(path)!==path || stat.size>max) return false;
  return readFileSync(path);
}
function identity(s) {
  const m=s.match(/<([^<>]+)>/); return !!m && /@users\.noreply\.github\.com$/i.test(m[1]);
}
// GitHub web-flow uses a public service mailbox for server-generated commits.
// This is a privacy exception, not proof of the signature or author identity.
const githubCommitterEmail='noreply'+'@'+'github.com';
const historicalSupportEmail='support'+'@'+'github.com';
// Reviewed through the GitHub API: valid GitHub signature, public service trailer.
// Scope this second exception to the exact immutable historical commit, never source files.
const reviewedSupportCommit='88e5334133c26c39843211f5043edf8d94a1b195';
export function scanCommitMetadata(commit, meta, dictionary=[]) {
  const lines=meta.split('\n');
  const githubCommitter=lines[1]===`GitHub <${githubCommitterEmail}>`;
  const findings=[];
  for(const [index,ident] of lines.slice(0,2).entries()) {
    if(!identity(ident) && !(index===1 && githubCommitter)) findings.push('コミット作者/コミッターの公開用メール未設定');
  }
  for(const rule of new Set(scanText(meta).map(x=>x.rule))) findings.push(rule);
  for(const rule of scanPrivacy(meta,'',dictionary,(email,line,index)=>
    (index===1 && githubCommitter && email===githubCommitterEmail) ||
    (commit===reviewedSupportCommit && index>=2 && /^Signed-off-by: [^<>]+ <[^<>]+>\s*$/.test(line) && email===historicalSupportEmail && line.endsWith(`<${historicalSupportEmail}>`))
  )) findings.push(rule);
  return findings;
}
export function main(args=[]) {
  try {
    const mode=args[0]??'--staged';
    if(!['--staged','--tracked','--head','--history','--push'].includes(mode)) throw Error('監査モードが不正です。');
    const root=realpathSync(text('rev-parse','--show-toplevel').trim()); process.chdir(root);
    const dict=terms(root); let count=0, failures=0; const seen=new Set();
    const fail=(rule,where='')=>{failures++; if(failures<=50) console.error(`[WORKBENCH] BLOCKED: ${rule}${where?' ['+where+']':''}`);};
    // Do not expose file names or matching values in logs. Path hash can be matched locally.
    const label=p=>digest(p).slice(0,12);
    const inspect=(p,e,ref,checkCsp)=>{
      count++; const loc=label(p);
      if(!pathAllowed(p)) {fail('未許可パス',loc);return;}
      if(scanPrivacy(p,'',dict).length) fail('パスの機密情報',loc);
      if(!['100644','100755'].includes(e.mode)) {fail('通常ファイル以外',loc);return;}
      const key=ref==='worktree'?null:`${p}:${e.oid}:${checkCsp}`;
      if(key && seen.has(key)) return; if(key) seen.add(key);
      const b=ref==='worktree'?currentPath(root,p):git('cat-file','blob',e.oid);
      if(b===null) return; if(b===false) {fail('作業ファイルの形式',loc);return;}
      if(p==='favicon.ico') {if(b.length<6 || b.readUInt16LE(0)!==0 || b.readUInt16LE(2)!==1 || b.readUInt16LE(4)<1) fail('ICO形式',loc);return;}
      let s; try {s=decoder.decode(b);}catch{fail('UTF-8以外のデータ',loc);return;}
      if(s.includes('\0')) {fail('バイナリデータ',loc);return;}
      for(const rule of new Set(scanText(s).map(x=>x.rule))) fail(rule,loc);
      for(const rule of scanPrivacy(s,p,dict)) fail(rule,loc);
      if(checkCsp && pages.has(p) && !cspOkay(s)) fail('CSPが承認済みポリシーと不一致',loc);
    };
    const tree=(ref,paths,checkCsp=true)=>{
      const m=entries(ref==='worktree'?'index':ref);
      if(checkCsp && paths===null) for(const p of pages) if(!m.has(p) || (ref==='worktree' && currentPath(root,p)===null)) fail('必須ページ欠落',label(p));
      for(const p of paths??m.keys()) if(m.has(p)) inspect(p,m.get(p),ref,checkCsp);
    };
    const commitAudit=c=>{
      const meta=text('show','-s','--format=%an <%ae>%n%cn <%ce>%n%B',c).split('\n');
      const tag=c.slice(0,12);
      for(const rule of scanCommitMetadata(c,meta.join('\n'),dict)) fail(rule,tag);
      tree(c,changed(c),false);
    };
    if(mode==='--staged') {
      const paths=split(text('diff','--cached','--name-only','--no-renames','-z','--diff-filter=ACMRT'));
      tree('index',paths);
      for(const v of ['GIT_AUTHOR_IDENT','GIT_COMMITTER_IDENT']) {const i=text('var',v);if(!identity(i)) fail('公開用Gitメール未設定');if(scanPrivacy(i,'',dict).length) fail('Git作者情報の機密情報');}
      // Check deletion of one of the required pages, even if it is not in ACMRT.
      const index=entries('index'); for(const p of pages) if(!index.has(p)) fail('必須ページ欠落',label(p));
    } else if(mode==='--tracked') tree('worktree',null);
    else if(mode==='--head') tree('HEAD',null);
    else if(mode==='--history') {
      for(const c of text('rev-list','--all').trim().split(/\s+/).filter(Boolean)) commitAudit(c);
    } else {
      const input=readFileSync(0,'utf8').trim().split(/\r?\n/).filter(Boolean);
      const tips=[];
      for(const line of input) {const parts=line.split(/\s+/);if(parts.length!==4 || !sha.test(parts[1])) throw Error('pre-push入力が不正です。');if(/^0+$/.test(parts[1])) continue; if(!parts[0].startsWith('refs/heads/') || !parts[2].startsWith('refs/heads/')) throw Error('ブランチ以外のPushは個別監査が必要です。');tips.push(parts[1]);}
      if(tips.length) {
        if(!dict.length) throw Error('Push前に非公開辞書を設定してください（SECURITY_GUIDE.md）。');
        if(!args[1]) throw Error('Push先が不明です。');
        // Query actual remote refs, not potentially stale remote-tracking refs.
        const remote=text('ls-remote','--refs','--',args[1]).trim().split(/\r?\n/).filter(Boolean).map(x=>x.split('\t')[0]);
        const exclusions=[];
        for(const oid of new Set(remote)) {if(!sha.test(oid)) throw Error('リモート参照が不正です。');const r=spawnSync('git',['rev-parse','--verify',oid+'^{commit}'],{encoding:'utf8'});if(r.status===0 && sha.test(r.stdout.trim())) exclusions.push(r.stdout.trim());}
        const range=[...new Set(tips),...(exclusions.length?['--not',...exclusions]:[])];
        for(const tip of new Set(tips)) tree(tip,null);
        for(const c of text('rev-list',...range).trim().split(/\s+/).filter(Boolean)) commitAudit(c);
        if(!failures) {
          const r=spawnSync('gitleaks',['git','--redact','--no-banner','--log-opts='+range.join(' '),'.'],{stdio:'inherit'});
          if(r.status!==0) fail('Gitleaks未実行または不合格');
        }
      }
    }
    if(!dict.length && mode!=='--push') console.log('[WORKBENCH] 非公開辞書なし：一般パターンのみ。');
    console.log(`[WORKBENCH] ${mode}: ${count} file checks; ${failures} findings.`);
    return failures?1:0;
  } catch(e) {console.error('[WORKBENCH] 監査を完了できませんでした。', e.message && !e.stderr && !e.path && !e.syscall ? e.message : 'Git・ファイル・外部コマンドを確認してください。');return 2;}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) process.exitCode=main(process.argv.slice(2));
