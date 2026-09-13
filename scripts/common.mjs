import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function settings() {
  const version = await readFile(path.join(root, 'upstream-version.txt'), 'utf8');
  const repository = /^Repository:\s*(https:\/\/github\.com\/[\w.-]+\/[\w.-]+)\s*$/m.exec(version)?.[1];
  const commit = /^Commit:\s*([a-f0-9]{40})\s*$/m.exec(version)?.[1];
  if (!repository || !commit) throw new Error('upstream-version.txt must contain a GitHub Repository and full Commit SHA.');
  const config = JSON.parse(await readFile(path.join(root, 'relay.config.json'), 'utf8'));
  validateConfig(config);
  return { repository, commit, config, source: path.join(root, '.cache', commit) };
}
export function validateConfig(config) {
  if (!['PROD', 'TEST'].includes(config.environment)) throw new Error('environment must be PROD or TEST');
  if (!/^R\d+(?:(?:Alpha|Beta)\d*)?$/.test(config.expectedGameVersion)) throw new Error('Invalid expectedGameVersion');
  if (config.environment === 'PROD' && /Alpha|Beta/.test(config.expectedGameVersion)) throw new Error('Do not deploy a beta/alpha client to PROD. Select the matching stable commit first.');
  if (config.assetGameVersion !== config.expectedGameVersion) throw new Error('Asset and code versions must match.');
  if (config.assetBase) {
    const base = new URL(config.assetBase);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw new Error('assetBase must be an HTTPS directory URL ending in /');
  }
  const origin = new URL(config.bcOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== config.bcOrigin) throw new Error('bcOrigin must be an HTTPS origin without a trailing slash');
}
export function patchOnce(text, before, after, label) {
  if (text.split(before).length !== 2) throw new Error(`Upstream changed: ${label} must match exactly once. Review the patch before updating.`);
  return text.replace(before, after);
}
