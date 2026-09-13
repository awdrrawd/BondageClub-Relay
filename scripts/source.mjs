import { mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settings } from './common.mjs';

function git(cwd, args) {
  const result = spawnSync('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/')}`, ...args], { cwd, encoding: 'utf8', timeout: 180000, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'git failed');
  return result.stdout.trim();
}
export async function fetchSource() {
  const setup = await settings();
  await mkdir(setup.source, { recursive: true });
  try { await access(path.join(setup.source, '.git')); }
  catch { git(setup.source, ['init']); }
  let head;
  try { head = git(setup.source, ['rev-parse', 'HEAD']); } catch {}
  if (head !== setup.commit) {
    git(setup.source, ['fetch', '--depth=1', setup.repository + '.git', setup.commit]);
    git(setup.source, ['checkout', '--detach', 'FETCH_HEAD']);
  }
  if (git(setup.source, ['rev-parse', 'HEAD']) !== setup.commit) throw new Error('Source SHA mismatch');
  if (git(setup.source, ['status', '--porcelain'])) throw new Error('Cached upstream has local edits. Preserve them elsewhere before rebuilding.');
  console.log(`Source verified: ${setup.commit}`);
  return setup;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await fetchSource();
