// High-confidence local patterns retained for lightweight pre-commit checking.
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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

// Compatibility CLI: the publication audit now owns Git snapshot selection.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./audit-publication.mjs', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exitCode = result.status ?? 2;
}
