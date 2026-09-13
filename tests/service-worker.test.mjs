import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { mediaPath } from '../web/media-routing.js';

const code = (await readFile(new URL('../web/relay-sw.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
function setup(fetcher, assetBase = 'https://cdn.example/R132Beta1/BondageClub/') {
  const handlers = new Map();
  vm.runInNewContext(code, { mediaPath, assetBase, revision: 'test', URL, Headers, Response, fetch: fetcher,
    self: { location: {origin:'https://relay.example'}, addEventListener:(type,callback)=>handlers.set(type,callback), skipWaiting:async()=>{}, clients:{claim:async()=>{}} },
  });
  return request => {
    let response;
    handlers.get('fetch')({request, respondWith:promise=>response=promise});
    return response;
  };
}
test('media routes directly to CDN, preserving Range but omitting cookies', async () => {
  const handle = setup(async (url, options) => {
    assert.equal(url.href, 'https://cdn.example/R132Beta1/BondageClub/Audio/Test.mp3?v=1');
    assert.equal(options.headers.get('range'),'bytes=0-3');
    assert.equal(options.headers.get('cookie'),null);
    assert.equal(options.mode,'cors'); assert.equal(options.credentials,'omit');
    return new Response('data',{status:206,headers:{'content-type':'audio/mpeg','content-range':'bytes 0-3/100','accept-ranges':'bytes'}});
  });
  const response = await handle(new Request('https://relay.example/Audio/Test.mp3?v=1',{headers:{Range:'bytes=0-3',Cookie:'private'}}));
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 0-3/100');assert.equal(await response.text(),'data');
});
test('media failures never fall back to opaque or the cloud relay', async () => {
  const handle=setup(async()=>{throw new TypeError('CORS failed')});
  assert.equal((await handle(new Request('https://relay.example/Icons/Logo.png'))).status,502);
  assert.equal(handle(new Request('https://relay.example/Scripts/Game.js')),undefined);
  assert.equal(handle(new Request('https://other.example/Icons/Logo.png')),undefined);
  assert.equal(handle(new Request('https://relay.example/socket.io/?transport=websocket')),undefined);
});
test('unconfigured entry cannot silently use an unverified CDN', () => {
  const handle=setup(()=>assert.fail('must not fetch'), '');
  assert.equal(handle(new Request('https://relay.example/Icons/Logo.png')),undefined);
});
