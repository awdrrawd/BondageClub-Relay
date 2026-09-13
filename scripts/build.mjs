import { readdir, readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fetchSource } from './source.mjs';
import { root, patchOnce } from './common.mjs';

const { source, config, commit, repository } = await fetchSource();
let gameRoot = source;
try { await readFile(path.join(gameRoot, 'Scripts/Game.js')); }
catch { gameRoot = path.join(source, 'BondageClub'); }
const gameScript = await readFile(path.join(gameRoot, 'Scripts/Game.js'), 'utf8');
const gameVersion = /var GameVersion = "([^"]+)";/.exec(gameScript)?.[1];
if (gameVersion !== config.expectedGameVersion) throw new Error(`Source is ${gameVersion}, config expects ${config.expectedGameVersion}`);
const output = path.resolve(root, 'dist');
// Only this generated directory may be replaced; upstream and user files are never deleted.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('Unsafe output path');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const extensions = new Set(['.js', '.css', '.csv', '.txt', '.html', '.json', '.xml', '.wasm', '.map']);
const directories = new Set(['Scripts', 'Screens', 'Assets', 'CSS', 'Fonts', 'Backgrounds', 'Audio', 'Icons', 'Images', 'Music']);
const rootFiles = new Set(['index.html', 'brawl.html', 'changelog.html', 'CHANGELOG.md']);
let files = 0, bytes = 0;
async function copyDirectory(relative = '') {
  for (const entry of await readdir(path.join(gameRoot, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Source symlinks are not supported');
    const rel = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || ['node_modules', 'Tests', 'Tools'].includes(entry.name)) continue;
      if (!relative && !directories.has(entry.name)) continue;
      await copyDirectory(rel);
    } else {
      const license = /license|licence|copyright/i.test(entry.name);
      if (!relative ? !rootFiles.has(entry.name) && !license : !extensions.has(path.extname(entry.name).toLowerCase()) && !license) continue;
      const data = await readFile(path.join(gameRoot, rel));
      if (data.length > 25 * 1024 * 1024) throw new Error(`Pages file limit exceeded: ${rel}`);
      await mkdir(path.dirname(path.join(output, rel)), { recursive: true });
      await writeFile(path.join(output, rel), data);
      files++; bytes += data.length;
    }
  }
}
await copyDirectory();
async function patch(file, transform) {
  const filePath = path.join(output, file);
  await writeFile(filePath, transform(await readFile(filePath, 'utf8')));
}
await patch('Scripts/Server.js', text => patchOnce(text, 'ServerSocket = io(ServerURL);', 'ServerSocket = io(location.origin, { path: "/socket.io/", transports: ["websocket"], upgrade: false });', 'ServerInit'));
await patch('Scripts/Common.js', text => {
  const before = /function CommonGetServer\(\) \{[\s\S]*?\n\}/.exec(text)?.[0];
  if (!before) throw new Error('CommonGetServer not found');
  return patchOnce(text, before, 'function CommonGetServer() { return location.origin; }', 'CommonGetServer');
});
await patch('Scripts/Game.js', text => patchOnce(text, 'async function GameStart(isNode=false) {', 'async function GameStart(isNode=false) {\n\tif (!isNode) await window.RelayReady();', 'GameStart'));
const index = await readFile(path.join(output, 'index.html'), 'utf8');
await writeFile(path.join(output, 'game.html'), patchOnce(index, '<head>', '<head>\n<script src="/relay-ready.js"></script>', 'index head'));
// Any additional standalone game page must install the same startup guard.
try { await patch('brawl.html', text => patchOnce(text, '<head>', '<head>\n<script src="/relay-ready.js"></script>', 'brawl head')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const file of await readdir(path.join(root, 'web'))) await copyFile(path.join(root, 'web', file), path.join(output, file));
let worker = await readFile(path.join(root, 'templates/_worker.js'), 'utf8');
const upstream = config.environment === 'PROD' ? 'https://bondage-club-server.herokuapp.com/socket.io/' : 'https://bondage-club-server-test.herokuapp.com/socket.io/';
worker = patchOnce(worker, 'const UPSTREAM = "https://bondage-club-server.herokuapp.com/socket.io/";', `const UPSTREAM = ${JSON.stringify(upstream)};`, 'Worker upstream');
worker = patchOnce(worker, 'const DEFAULT_BC_ORIGIN = "https://bondageprojects.elementfx.com";', `const DEFAULT_BC_ORIGIN = ${JSON.stringify(config.bcOrigin)};`, 'Worker origin');
await writeFile(path.join(output, '_worker.js'), worker.replaceAll('bc-lite-relay', 'bc-full-relay'));
await copyFile(path.join(root, 'templates/_routes.json'), path.join(output, '_routes.json'));
const revision = createHash('sha256').update(JSON.stringify({ config, commit })).update(await readFile(path.join(root, 'web/relay-sw.js'))).update(await readFile(path.join(root, 'web/media-routing.js'))).digest('hex').slice(0, 20);
await writeFile(path.join(output, 'relay-config.js'), `export const assetBase = ${JSON.stringify(config.assetBase)};\nexport const revision = ${JSON.stringify(revision)};\n`);
await writeFile(path.join(output, 'relay-build.json'), JSON.stringify({ ...config, repository, commit, gameVersion, revision, files, bytes }, null, 2));
await writeFile(path.join(output, '_headers'), '/*\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Cache-Control: no-cache\n');
// Do not copy Lite's CSP: the full client needs its own inline styles and media behavior.
if (files + 20 >= 20000) throw new Error('Pages free file count limit exceeded');
console.log(`Built ${gameVersion} (${config.environment}): ${files} source files, ${(bytes / 1048576).toFixed(1)} MiB; no image/audio payloads.`);
if (!config.assetBase) console.log('SETUP REQUIRED: assetBase is empty. Entry page will block game startup until CDN is configured.');
