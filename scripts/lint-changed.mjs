import { execFileSync } from 'node:child_process';

const codeFilePattern = /\.(?:[cm]?[jt]sx?)$/;

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

function resolveBaseCommit() {
  const refs = ['origin/master', 'master'];

  for (const ref of refs) {
    try {
      return run('git', ['merge-base', ref, 'HEAD']);
    } catch {
      // Try the next fallback.
    }
  }

  return run('git', ['rev-parse', 'HEAD~1']);
}

const baseCommit = resolveBaseCommit();
const headCommit = run('git', ['rev-parse', 'HEAD']);
const effectiveBaseCommit = baseCommit === headCommit
  ? run('git', ['rev-parse', 'HEAD^1'])
  : baseCommit;
const committedFiles = run('git', [
  'diff',
  '--name-only',
  '--diff-filter=ACMR',
  `${effectiveBaseCommit}...HEAD`,
]).split('\n').filter(Boolean);

const workingTreeFiles = run('git', [
  'diff',
  '--name-only',
  '--diff-filter=ACMR',
  'HEAD',
]).split('\n').filter(Boolean);

const untrackedFiles = run('git', [
  'ls-files',
  '--others',
  '--exclude-standard',
]).split('\n').filter(Boolean);

const lintTargets = Array.from(new Set([
  ...committedFiles,
  ...workingTreeFiles,
  ...untrackedFiles,
].filter(file => codeFilePattern.test(file))));

if (lintTargets.length === 0) {
  console.log('No changed code files to lint.');
  process.exit(0);
}

const chunkSize = 500;

for (let index = 0; index < lintTargets.length; index += chunkSize) {
  const chunk = lintTargets.slice(index, index + chunkSize);
  execFileSync('npx', ['eslint', '--pass-on-no-patterns', ...chunk], { stdio: 'inherit' });
}
