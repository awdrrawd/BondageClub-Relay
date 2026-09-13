import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mediaPath } from '../web/media-routing.js';
import { validateConfig, patchOnce } from '../scripts/common.mjs';

test('media routing preserves scripts, external URLs and user blobs', () => {
  const origin = 'https://relay.pages.dev';
  for (const value of ['/Assets/Female3DCG/Female3DCG.js', '/Screens/Online/ChatRoom/Text_ChatRoom.csv', 'https://other.example/Icons/Test.png', 'data:image/png;base64,abc', 'blob:https://relay.pages.dev/id', '/custom.png']) assert.equal(mediaPath(value, origin), null, value);
  assert.equal(mediaPath('/Assets/Female3DCG/Hat/帽子.png?v=2', origin), 'Assets/Female3DCG/Hat/%E5%B8%BD%E5%AD%90.png?v=2');
  assert.equal(mediaPath('/Screens/Room/Platform/Audio/Jump.mp3', origin), 'Screens/Room/Platform/Audio/Jump.mp3');
  assert.equal(mediaPath('/Fonts/Arial.woff2', origin), 'Fonts/Arial.woff2');
});
test('production cannot accidentally use the provided beta or mismatched assets', () => {
  const config = {environment:'TEST',expectedGameVersion:'R132Beta1',assetGameVersion:'R132Beta1',assetBase:'',bcOrigin:'https://example.com'};
  assert.doesNotThrow(() => validateConfig(config));
  assert.throws(() => validateConfig({...config,environment:'PROD'}), /beta/);
  assert.throws(() => validateConfig({...config,assetGameVersion:'R131'}), /match/);
  assert.throws(() => validateConfig({...config,assetBase:'http://example.com/'}), /HTTPS/);
});
test('upstream patches fail instead of silently corrupting changed source', () => {
  assert.equal(patchOnce('a b c','b','d','test'), 'a d c');
  assert.throws(() => patchOnce('b b','b','d','test'));
  assert.throws(() => patchOnce('a','b','d','test'));
});
test('relay refuses foreign origins and polling without contacting BC', async () => {
  const { default: worker } = await import('../templates/_worker.js');
  const env = { ASSETS: { fetch: () => new Response('static') } };
  let response = await worker.fetch(new Request('https://relay.pages.dev/socket.io/?EIO=4&transport=websocket', { headers: { Upgrade:'websocket',Origin:'https://foreign.example' } }), env);
  assert.equal(response.status,403);
  response = await worker.fetch(new Request('https://relay.pages.dev/socket.io/?transport=polling'), env);
  assert.equal(response.status,426);
  response = await worker.fetch(new Request('https://relay.pages.dev/'), env);
  assert.equal(await response.text(),'static');
  const routes = JSON.parse(await readFile(new URL('../templates/_routes.json',import.meta.url)));
  assert.deepEqual(routes.include,['/socket.io/*','/api/relay-status']);
});
