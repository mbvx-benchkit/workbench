#!/usr/bin/env node
/**
 * Git上のソースへ書き込まれた認証情報の典型パターンを検査する。
 * 誤検知を減らすため、高確度のトークン、秘密鍵、資格情報入りURL、
 * 長い文字列の資格情報への直代入に絞る。見つけた値そのものは表示しない。
 * 完全な個人情報検出器ではないので、人間のレビューも必要。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rules = [
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ['AWS access key ID', /(?:AKIA|ASIA)[A-Z0-9]{16}/g],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/g],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{18,}/g],
  ['PEM private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['Credentials in URL', /https?:\/\/[^\s'"@/]+:[^\s'"@/]+@/g],
  ['Hard-coded secret assignment', /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|secret[_-]?key|password|passwd)\b\s*[:=]\s*['"`]([A-Za-z0-9_+/=.-]{24,})['"`]/gi]
];

export function scanText(source) {
  const results = [];
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    for (const [name, pattern] of rules) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[index])) results.push({ line: index + 1, rule: name });
    }
  }
  return results;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function gitPaths(mode) {
  const args = mode === '--staged'
    ? ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']
    : mode === '--head'
      ? ['ls-tree', '-r', '--name-only', '-z', 'HEAD']
      : ['ls-files', '-z'];
  return git(...args).split('\0').filter(Boolean).filter(p => /\.(?:ts|tsx|js|mjs|html|css|json|sh)$/i.test(p));
}

function readSource(file, mode) {
  if (mode === '--tracked') return existsSync(file) ? readFileSync(file, 'utf8') : null;
  return git('show', (mode === '--head' ? 'HEAD:' : ':') + file);
}

export function run(mode = '--staged') {
  if (!['--staged', '--tracked', '--head'].includes(mode)) {
    process.stderr.write('Usage: node scripts/check-source-secrets.mjs [--staged|--tracked|--head]\n');
    return 2;
  }
  const matches = [];
  for (const file of gitPaths(mode)) {
    const content = readSource(file, mode);
    if (content === null) continue;
    for (const result of scanText(content)) matches.push({ file, ...result });
  }
  if (matches.length) {
    for (const { file, line, rule } of matches) {
      process.stderr.write(`  BLOCKED: ${file}:${line} (${rule})\n`);
    }
    process.stderr.write(`[WORKBENCH] ${matches.length} possible embedded secret(s). Commit/push blocked.\n`);
    return 1;
  }
  process.stdout.write(`[WORKBENCH] Source secret scan: OK (${mode}).\n`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = run(process.argv[2] ?? '--staged');
}
