import { settings } from './common.mjs';
const { config } = await settings();
if (!config.assetBase) {
  console.error('尚未設定素材 CDN。請閱讀 docs/setup.md；目前只能預覽入口，不能進入遊戲。');
  process.exit(1);
}
let failures = 0;
for (const file of ['Scripts/Game.js', ...config.assetProbes]) {
  try {
    const url = new URL(file, config.assetBase);
    const response = await fetch(url, { headers: { Origin: 'https://relay-probe.pages.dev' }, signal: AbortSignal.timeout(20000) });
    const cors = response.headers.get('access-control-allow-origin');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (cors !== '*') throw new Error(`CORS must allow the new site (probe expects *), received ${cors}`);
    if (file.endsWith('.js')) {
      const body = await response.text();
      if (!body.includes(`var GameVersion = "${config.expectedGameVersion}";`)) throw new Error('CDN version mismatch');
    } else {
      if (!/^(image|audio)\//.test(response.headers.get('content-type') || '')) throw new Error('Unexpected media MIME type');
      await response.body?.cancel();
    }
    console.log(`PASS ${file}`);
  } catch (error) { failures++; console.error(`FAIL ${file}: ${error.message}`); }
}
if (failures) process.exitCode = 1;
