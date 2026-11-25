import assert from 'node:assert/strict';
import { scanText } from './check-source-secrets.mjs';
import { scanCommitMetadata, scanPrivacy } from './audit-publication.mjs';
const githubToken = 'ghp_' + 'A'.repeat(36);
const awsAccessKey = 'AKIA' + 'A'.repeat(16);
const pem = '-----BEGIN ' + 'PRIVATE KEY-----';
assert.equal(scanText(`const token="${githubToken}"`).some(x=>x.rule==='GitHub token'),true);
assert.equal(scanText(`const key="${awsAccessKey}"`).some(x=>x.rule==='AWS access key ID'),true);
assert.equal(scanText(pem).some(x=>x.rule==='PEM private key'),true);
assert.equal(scanText('const normalPassword = passwordInput.value;').length,0);
assert.equal(scanText('const myApi = "https://example.test/api";').length,0);
assert.equal(scanText('const token = "example";').length,0);
console.log('PASS: source scanner catches known credentials without printing values');

// Privacy exceptions must not allow arbitrary metadata or source content.
const reviewed='88e5334133c26c39843211f5043edf8d94a1b195';
const other='a'.repeat(40);
const service='noreply'+'@'+'github.com';
const support='support'+'@'+'github.com';
const author='Synthetic <1+fixture@users.noreply.github.com>';
const system=`GitHub <${service}>`;
const trailer=`Signed-off-by: Synthetic Service <${support}>`;
const metadata=(a,c,m)=>[a,c,m].join('\n');
assert.deepEqual(scanCommitMetadata(reviewed,metadata(author,system,trailer)),[]);
assert.deepEqual(scanCommitMetadata(other,metadata(author,system,'merge fixture')),[]);
assert.ok(scanCommitMetadata(other,metadata(author,system,trailer)).includes('メールアドレス'));
assert.ok(scanCommitMetadata(reviewed,metadata(system,system,trailer)).includes('コミット作者/コミッターの公開用メール未設定'));
assert.ok(scanCommitMetadata(reviewed,metadata(author,`Synthetic <${service}>`,trailer)).includes('コミット作者/コミッターの公開用メール未設定'));
assert.ok(scanCommitMetadata(reviewed,metadata(author,system,`message ${support}`)).includes('メールアドレス'));
assert.ok(scanCommitMetadata(reviewed,metadata(author,system,`${trailer}\n${service}`)).includes('メールアドレス'));
assert.ok(scanCommitMetadata(reviewed,metadata(author,system,trailer),['synthetic service']).includes('非公開辞書'));
assert.ok(scanPrivacy(service,'sample.ts').includes('メールアドレス'));
assert.ok(scanPrivacy(support,'sample.ts').includes('メールアドレス'));
console.log('PASS: GitHub service identity, exact historical trailer, and unchanged privacy boundaries');


// Exercise real Git snapshots and incoming ranges without touching the user's checkout.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const project=resolve('.');
const temp=mkdtempSync(join(tmpdir(),'wb-audit-'));
const repo=join(temp,'repo'), home=join(temp,'home'), remote=join(temp,'remote.git');
const env={...process.env,HOME:home,GIT_CONFIG_NOSYSTEM:'1'};
for(const key of Object.keys(env)) if(key.startsWith('GIT_') && key!=='GIT_CONFIG_NOSYSTEM') delete env[key];
mkdirSync(repo); mkdirSync(home);
const run=(cmd,args,opts={})=>spawnSync(cmd,args,{cwd:repo,env,encoding:'utf8',...opts});
const git=(...args)=>{const r=run('git',args);assert.equal(r.status,0,'fixture git operation');return r.stdout.trim();};
const audit=(mode,extra=[],input='')=>run(process.execPath,[join(project,'scripts/audit-publication.mjs'),mode,...extra],{input});
const put=(p,s)=>writeFileSync(join(repo,p),s);
try {
  git('init','-q','-b','main');git('config','user.name','Synthetic');git('config','user.email','1+fixture@users.noreply.github.com');
  for(const p of ['index.html','gosplan13/index.html','inventory_batch/index.html','red_index/index.html','document_builder/index.html']){
    mkdirSync(join(repo,p,'..'),{recursive:true});put(p,readFileSync(join(project,p)));
  }
  put('sample.ts','export const value = 1;\n');git('add','.');git('commit','-qm','fixture');
  assert.equal(audit('--head').status,0);
  // Verify the real Git-history path with a synthetic server-style committer.
  const serverCommit=run('git',['commit','--allow-empty','-qm','synthetic server merge'],{env:{...env,GIT_COMMITTER_NAME:'GitHub',GIT_COMMITTER_EMAIL:service}});
  assert.equal(serverCommit.status,0);
  assert.equal(audit('--history').status,0);
  git('commit','--allow-empty','-qm','synthetic trailer'+String.fromCharCode(10,10)+trailer);
  const invalidTrailer=audit('--history');assert.equal(invalidTrailer.status,1);assert.match(invalidTrailer.stderr,/メールアドレス/);assert.ok(!invalidTrailer.stderr.includes(support));
  git('reset','--hard','HEAD^');

  const email=['fixture','unapproved','invalid'].join('@').replace('@invalid','.invalid');
  put('sample.ts',`const contact = ${JSON.stringify(email)};\n`);git('add','sample.ts');put('sample.ts','export const value = 2;\n');
  const staged=audit('--staged');assert.equal(staged.status,1);assert.ok(!staged.stderr.includes(email));
  assert.equal(audit('--tracked').status,0);git('reset','-q','HEAD','sample.ts');
  put('sample.ts',Buffer.from([0,1,2]));git('add','sample.ts');assert.equal(audit('--staged').status,1);git('reset','-q','HEAD','sample.ts');put('sample.ts','export const value = 2;\n');
  put('sample.pdf','synthetic');git('add','sample.pdf');assert.equal(audit('--staged').status,1);git('reset','-q','HEAD','sample.pdf');rmSync(join(repo,'sample.pdf'));
  mkdirSync(join(repo,'.github/workflows'),{recursive:true});put('.github/workflows/security.yml','name: fixture\n');git('add','.github');assert.equal(audit('--staged').status,0);
  put('.github/workflows/other.yml','name: fixture\n');git('add','.github');assert.equal(audit('--staged').status,1);git('reset','-q','HEAD','--','.github');rmSync(join(repo,'.github'),{recursive:true});
  put('index.html',readFileSync(join(project,'index.html'),'utf8').replace("connect-src 'none'","connect-src *"));git('add','index.html');assert.equal(audit('--staged').status,1);git('restore','--staged','--worktree','index.html');
  // Inspect original markup: comments cannot synthesize tags or hide an early load.
  const html=readFileSync(join(project,'index.html'),'utf8');
  const policyTag=html.match(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/i)[0];
  const cspCase=(replacement, expected)=>{
    put('index.html',html.replace(policyTag,()=>replacement));git('add','index.html');
    assert.equal(audit('--staged').status,expected,'CSP original-markup fixture');
  };
  cspCase('<!-- ordinary comment -->\n'+policyTag,0);
  cspCase('<!-- '+policyTag+' -->\n'+policyTag,0);
  cspCase(policyTag+'\n<!-- '+policyTag+' -->',0);
  cspCase(policyTag.replace('<meta','<me<!-- join -->ta'),1);
  cspCase('<!-- '+policyTag+' -->',1);
  cspCase('<!--> <script src="early.js"></script> -->'+policyTag,1);
  cspCase('<title>'+policyTag+'</title>',1);
  cspCase('<template>'+policyTag+'</template>',1);
  cspCase('<script src="early.js"></script>'+policyTag,1);
  cspCase(policyTag+'\n'+policyTag,1);
  cspCase(policyTag.replace("script-src 'self'","script-src\u00a0'self'"),1);
  git('restore','--staged','--worktree','index.html');
  console.log('PASS: CSP checks original leading markup, rejects comment-joined tags and hidden or duplicate policies');
  git('rm','-q','-f','sample.ts');assert.equal(audit('--staged').status,0);git('restore','--staged','--worktree','sample.ts');
  git('init','--bare','-q',remote);git('push','-q',remote,'main');
  const before=git('rev-parse','HEAD');
  const phrase=['合成','監査対象','九七'].join('');mkdirSync(join(home,'.config/workbench'),{recursive:true});writeFileSync(join(home,'.config/workbench/private-terms.txt'),phrase+'\n',{mode:0o600});
  put('sample.ts',`const customer = ${JSON.stringify(phrase)};\n`);git('add','sample.ts');git('commit','-qm','synthetic intermediate');
  put('sample.ts','export const value = 3;\n');git('add','sample.ts');git('commit','-qm','synthetic cleanup');
  const after=git('rev-parse','HEAD');assert.equal(audit('--head').status,0);
  const incoming=audit('--push',[remote],`refs/heads/main ${after} refs/heads/main ${before}\n`);
  assert.equal(incoming.status,1);assert.match(incoming.stderr,/非公開辞書/);assert.ok(!incoming.stderr.includes(phrase));
  assert.equal(audit('--history').status,1);
  git('reset','--hard',before);
  put('sample.ts','export const value = 4;\n');git('add','sample.ts');git('commit','-qm','clean fixture');
  const clean=git('rev-parse','HEAD');
  // Stub only the external Gitleaks command. Actual Gitleaks must pass on the Mac.
  const bin=join(temp,'bin');mkdirSync(bin);writeFileSync(join(bin,'gitleaks'),'#!/bin/sh\nexit 0\n',{mode:0o755});env.PATH=bin+':'+env.PATH;
  assert.equal(audit('--push',[remote],`refs/heads/main ${clean} refs/heads/main ${before}\n`).status,0);
  writeFileSync(join(bin,'gitleaks'),'#!/bin/sh\nexit 1\n',{mode:0o755});assert.equal(audit('--push',[remote],`refs/heads/main ${clean} refs/heads/main ${before}\n`).status,1);
  console.log('PASS: staged vs working tree, file allowlist, CSP, deletions, private dictionary, intermediate commits and Gitleaks exit propagation');
} finally {rmSync(temp,{recursive:true,force:true});}
