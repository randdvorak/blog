import { execFileSync } from 'node:child_process';

function run(command, argumentsList, options = {}) {
  return execFileSync(command, argumentsList, { stdio: 'inherit', ...options });
}

function output(command, argumentsList) {
  return execFileSync(command, argumentsList, { encoding: 'utf8' }).trim();
}

try {
  output('git', ['rev-parse', '--is-inside-work-tree']);
} catch {
  console.error('This directory is not a Git repository. Run git init first.');
  process.exit(1);
}

run('npm', ['run', 'build']);

const trackedPaths = [
  '.github', '.gitignore', 'README.md', 'astro.config.mjs', 'editor',
  'package.json', 'package-lock.json', 'public', 'scripts', 'src', 'tsconfig.json'
];
run('git', ['add', '-A', '--', ...trackedPaths]);

const staged = output('git', ['diff', '--cached', '--name-only']);
if (staged) {
  const message = process.argv.slice(2).join(' ').trim() || `Publish blog ${new Date().toISOString().slice(0, 10)}`;
  run('git', ['commit', '-m', message]);
} else {
  console.log('There are no changes to commit.');
}

run('git', ['push', '-u', 'origin', 'main']);
