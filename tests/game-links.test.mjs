import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {navigationURL, refreshTarget} from '../src/_game-links.js';
import {canProbe, gameVersion, detectedVersion, resolveEntries, LAST_GOOD_MS} from '../src/game-config.js';

const fixture = `<div style="padding:20px; display:flex;">
  <div class="container" onclick="window.location='https://www.bondageprojects.elementfx.com/R999/BondageClub/';">America<br/>Server</div>
  <div class="container" onclick="window.location='https://www.bondageeurope.com/R999/BondageClub/';">&nbsp;Europe<br/>&nbsp;A</div>
  <a class="new-style" href="https://new-channel.example/club/R999/">New channel</a>
  <div class="container" onclick="window.location='javascript:alert(1)';">Unsafe</div>
  <div class="container" onclick="window.location='https://www.bondageprojects.elementfx.com/R999/BondageClub/';">Duplicate</div>
  <a href="https://www.bondageprojects.com/college/">College</a>
</div><div><img onclick="window.location='images/photo.jpg';"></div>`;
const gameHTML = '<title>Bondage Club</title><script src="Scripts/Common.js"></script>';
const configSource = await readFile(new URL('../src/game-config.js', import.meta.url), 'utf8');
const backendSource = await readFile(new URL('../src/_game-links.js', import.meta.url), 'utf8');

test('navigation and version templates reject unsafe URLs and do not guess ambiguous versions', () => {
  assert.equal(navigationURL(null, ` window.location.href = "https://new.example/R200/"; `), 'https://new.example/R200/');
  assert.equal(navigationURL('/club/R200/', null), 'https://www.bondageprojects.com/club/R200/');
  for (const code of [`window.location='https://valid.example/';alert(1)`, `window.open('https://valid.example/')`, 'window.location=dynamicValue']) assert.equal(navigationURL(null, code), null);
  for (const url of ['javascript:alert(1)', 'http://example.com/', 'https://user:pass@example.com/']) assert.equal(navigationURL(url, null), null);
  for (const url of ['https://127.0.0.1/club/R132/', 'https://www.bondage-asia.com.evil.example/club/R132/', 'https://www.bondage-asia.com:444/club/R132/', 'https://www.bondage-asia.com/club/R132/?target=1', 'https://www.bondage-asia.com/', 'https://www.bondage-asia.com/R132/']) assert.equal(canProbe(url), false);
  assert.equal(canProbe('https://www.bondage-asia.com/club/R133Beta1/'), true);
  const templates = [{name:'Custom', url:'https://custom.example/club/{version}/'}];
  assert.equal(resolveEntries(templates, null)[0].url, null);
  assert.equal(resolveEntries(templates, 'R200')[0].url, 'https://custom.example/club/R200/');
  const seeds = resolveEntries([{name:'Asia', url:'https://www.bondage-asia.com/club/{version}/'}], null);
  assert.equal(seeds[0].url, 'https://www.bondage-asia.com/club/R131/');
  assert.equal(detectedVersion(seeds), null);
  assert.equal(detectedVersion([{url:'https://www.bondage-asia.com/club/R200/'},{url:'https://www.bondageeurope.com/R201/BondageClub/'}]), null);
  assert.equal(gameVersion('https://www.bondageeurope.com/R200/BondageClub/index.html'), 'R200');
});

test('meta refresh resolves relative destinations without executing page scripts', () => {
  const current = 'https://www.bondageeurope.com/R131/BondageClub/';
  for (const content of ['2; URL=../../R132/BondageClub/', ' 0.5 ; url = "../../R132/BondageClub/" ', "2; URL='../../R132/BondageClub/'"]) {
    assert.equal(refreshTarget(content, current), 'https://www.bondageeurope.com/R132/BondageClub/');
  }
  assert.equal(refreshTarget('2', current), null);
  assert.equal(refreshTarget('2; url=', current), null);
  assert.equal(refreshTarget('not a refresh', current), null);
});

test('Cloudflare parser, stale fallback, cache and status checks use actual Workers runtime', async t => {
  const script = configSource.replace(/^export /gm, '') + '\n' + backendSource
    .replace(/^import .*\n|^export \{.*\n/gm, '').replace(/^export /gm, '') + `
    export default { async fetch(request) {
      const incoming = new URL(request.url);
      if (incoming.pathname === '/parse') {
        try { return Response.json(await parseGameLinks(new Response(await request.text()))); }
        catch { return new Response('Parse failed', {status:502}); }
      }
      if (incoming.pathname === '/expire') {
        await caches.default.delete(new Request(new URL('/api/game-links', incoming)));
        return new Response('Expired');
      }
      const options = {fetcher: async (url, init) => {
        if (init.redirect !== 'manual') throw new Error('Workers only support manual or follow redirects');
        if (request.headers.has('x-fail')) throw new Error('Offline');
        if (incoming.pathname === '/api/game-link-status') {
          const mode = request.headers.get('x-mode');
          if (mode === '404') return new Response('Missing', {status:404});
          if (mode === '403') return new Response('Blocked', {status:403});
          if (mode === 'wrong') return new Response('<title>Welcome</title>', {headers:{'Content-Type':'text/html'}});
          const html = body => new Response(body, {headers:{'Content-Type':'text/html'}});
          const meta = target => html('<title>Bondage Club - Outdated Version</title><meta HTTP-EQUIV="Refresh" content="2; URL=' + target + '">');
          if (mode === 'meta' && url.includes('R999')) return meta(url.includes('/club/') ? '../R1000/' : '../../R1000/BondageClub/');
          if (mode === 'meta-loop') return meta(url);
          if (mode === 'meta-unsafe') return meta('https://127.0.0.1/club/R1000/');
          if (mode === 'meta-ambiguous') return html('<meta http-equiv="refresh" content="0;url=../R1000/"><meta http-equiv="refresh" content="0;url=../R1001/">');
          if (mode === 'meta-limit') return meta(url.replace(/R[0-9]+/, 'R' + (Number(/R([0-9]+)/.exec(url)[1]) + 1)));
          if (mode === 'mixed') {
            if (url.includes('R999')) return new Response(null, {status:302, headers:{Location:'../R1000/'}});
            if (url.includes('R1000')) return meta('../R1001/');
          }
          if (mode === 'meta-not-game') {
            if (url.includes('R999')) return meta('../R1000/');
            return html('<title>Welcome</title>');
          }
          if (mode === 'redirect') {
            if (url.includes('R999')) return new Response(null, {status:302, headers:{Location:'https://www.bondage-asia.com/club/R1000/'}});
          }
          if (mode === 'unsafe-redirect') {
            if (!url.includes('bondage-asia.com')) throw new Error('Must not follow unsafe redirect');
            return new Response(null, {status:302, headers:{Location:'http://127.0.0.1/secret'}});
          }
          return new Response(${JSON.stringify(gameHTML)}, {headers:{'Content-Type':'text/html'}});
        }
        if (url !== GAME_DIRECTORY) throw new Error('Unexpected source');
        return new Response(${JSON.stringify(fixture)}, {headers:{'Content-Type':'text/html'}});
      }};
      if (incoming.pathname === '/api/game-link-status') return gameLinkStatus(request, options);
      return gameLinks(request, options);
    }};`;
  const mf = new Miniflare(convertV4MiniflareOptions({modules:true, compatibilityDate:'2025-01-01', script}));
  t.after(() => mf.dispose());
  const parse = html => mf.dispatchFetch('https://relay.example/parse', {method:'POST', body:html});
  const links = await (await parse(fixture)).json();
  assert.deepEqual(links.map(link => link.name), ['America Server', 'Europe A', 'New channel']);
  assert.equal(links[2].url, 'https://new-channel.example/club/R999/');
  assert.deepEqual(await (await parse('<div><button onclick="window.location=\'https://only.example/club/R1000/\';">Only<br>Channel</button></div>')).json(), [{url:'https://only.example/club/R1000/',name:'Only Channel'}]);
  assert.equal((await parse('<html>No channels</html>')).status, 502);

  const unavailable = await mf.dispatchFetch('https://failure.example/api/game-links', {headers:{'x-fail':'1'}});
  const fallback = await unavailable.json();
  assert.equal(fallback.mode, 'configured');
  assert.equal(fallback.version, null);
  assert.equal(fallback.links.length, 4);
  assert.equal(fallback.links[0].seed, true);
  assert.equal(unavailable.headers.get('Cache-Control'), 'no-store');
  const first = await mf.dispatchFetch('https://relay.example/api/game-links');
  assert.equal(first.headers.get('Cache-Control'), 'public, max-age=300');
  const data = await first.json();
  assert.equal(data.version, 'R999');
  const cached = await mf.dispatchFetch('https://relay.example/api/game-links?ignored=1', {headers:{'x-fail':'1'}});
  assert.deepEqual(await cached.json(), data);
  await mf.dispatchFetch('https://relay.example/expire');
  const stale = await (await mf.dispatchFetch('https://relay.example/api/game-links', {headers:{'x-fail':'1'}})).json();
  assert.equal(stale.mode, 'stale');
  assert.equal(stale.updatedAt, data.updatedAt);
  assert.deepEqual(stale.links, data.links);
  assert.equal((await mf.dispatchFetch('https://relay.example/api/game-links', {method:'POST'})).status, 405);

  const target = 'https://www.bondage-asia.com/club/R999/';
  const probe = (host, headers = {}, url = target) => mf.dispatchFetch('https://' + host + '/api/game-link-status?url=' + encodeURIComponent(url), {headers});
  const ok = await probe('probe.example');
  const okData = await ok.json();
  assert.equal(okData.state, 'available');
  assert.equal(ok.headers.get('Cache-Control'), 'public, max-age=60');
  assert.deepEqual(await (await probe('probe.example', {'x-fail':'1'})).json(), okData);
  assert.equal((await (await probe('missing.example', {'x-mode':'404'})).json()).state, 'unavailable');
  assert.equal((await (await probe('blocked.example', {'x-mode':'403'})).json()).state, 'unknown');
  assert.equal((await (await probe('wrong.example', {'x-mode':'wrong'})).json()).reason, 'not-game');
  const redirected = await (await probe('redirect.example', {'x-mode':'redirect'})).json();
  assert.equal(redirected.state, 'available');
  assert.equal(redirected.finalUrl, 'https://www.bondage-asia.com/club/R1000/');
  assert.equal((await (await probe('unsafe.example', {'x-mode':'unsafe-redirect'})).json()).reason, 'redirect');
  assert.equal((await (await probe('offline.example', {'x-fail':'1'})).json()).reason, 'network');
  assert.equal((await probe('rejected.example', {}, 'https://127.0.0.1/club/R999/')).status, 400);
  const meta = await (await probe('meta.example', {'x-mode':'meta'}, 'https://www.bondageeurope.com/R999/BondageClub/')).json();
  assert.equal(meta.state, 'available');
  assert.equal(meta.finalUrl, 'https://www.bondageeurope.com/R1000/BondageClub/');
  assert.equal(meta.version, 'R1000');
  assert.equal(meta.redirects[0].type, 'meta-refresh');
  const mixed = await (await probe('mixed.example', {'x-mode':'mixed'})).json();
  assert.equal(mixed.finalUrl, 'https://www.bondage-asia.com/club/R1001/');
  assert.deepEqual(mixed.redirects.map(hop => hop.type), ['http','meta-refresh']);
  for (const mode of ['meta-loop','meta-unsafe','meta-ambiguous','meta-limit']) {
    const rejected = await (await probe(mode + '.example', {'x-mode':mode})).json();
    assert.equal(rejected.state, 'unknown');
    assert.equal(rejected.reason, 'redirect');
    assert.equal(rejected.finalUrl, undefined);
    if (mode === 'meta-limit') assert.equal(rejected.redirects.length, 5);
  }
  assert.equal((await (await probe('meta-wrong.example', {'x-mode':'meta-not-game'})).json()).reason, 'not-game');
});

const frontendSource = await readFile(new URL('../src/game-links.js', import.meta.url), 'utf8');
const i18nSource = await readFile(new URL('../src/site-i18n.js', import.meta.url), 'utf8');
function find(node, cls) { return (node.className || '').split(' ').includes(cls) ? node : node.children?.map(child => find(child, cls)).find(Boolean); }
async function pageHarness(initial, stored = {}, imageWorks = true, probeReply = null) {
  const nodes = new Map(), requests = [], images = [];
  function node() { return {dataset:{}, children:[], handlers:{}, setAttribute(name,value) { this[name] = value; }, append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; }, addEventListener(name, fn) { this.handlers[name] = fn; }}; }
  for (const id of ['game-links-status','game-links','game-links-retry','game-links-check','game-links-settings','game-links-input','game-version-input','game-settings-status','game-settings-reset','entry-count','ready-count','directory-version','check-action-label']) nodes.set(id, node());
  let directory = initial;
  const storage = new Map(Object.entries(stored));
  const doc = {...node(), documentElement:{}, querySelectorAll:()=>[], getElementById:id=>nodes.get(id),createElement:node,dispatchEvent(event) {this.handlers[event.type]?.(event);}};
  const context = vm.createContext({Event,navigator:{language:'en'},location:{hash:''},window:node(),URL, AbortSignal, AbortController, setTimeout, clearTimeout, localStorage:{getItem:key => storage.get(key),setItem:(key,value) => storage.set(key,value)},
    document:doc,
    Image:class { set src(value) { if (!value) return; images.push(value); queueMicrotask(() => imageWorks ? this.onload?.() : this.onerror?.()); } },
    fetch:async url => {
      requests.push(url);
      if (url.startsWith('/api/game-link-status')) return {ok:true,json:async () => probeReply || {state:'available',checkedAt:new Date().toISOString()}};
      if (directory instanceof Error) throw directory;
      return {ok:true,json:async () => directory};
    },
  });
  vm.runInContext(configSource.replace(/^export /gm, '') + '\n' + i18nSource.replace(/^export /gm, '') + '\n' + frontendSource.replace(/^import .*\n/gm, ''), context);
  await new Promise(resolve => setImmediate(resolve));
  return {nodes, requests, images, storage, doc, changeLanguage:value=>context.setLanguage(value), setDirectory:value => {directory = value;}, reload:async () => {await nodes.get('game-links-retry').handlers.click(); await new Promise(resolve => setImmediate(resolve));}};
}
const officialData = () => ({mode:'official',version:'R999',updatedAt:new Date().toISOString(),links:[{name:'<script>text only</script>',url:'https://www.bondage-asia.com/club/R999/'}]});
test('homepage probes real browser assets separately and preserves last successful data on failure', async () => {
  const h = await pageHarness(officialData());
  const card = h.nodes.get('game-links').children[0];
  assert.equal(find(card, 'entry-name').textContent, '<script>text only</script>');
  assert.equal(find(card, 'game-link').href, 'https://www.bondage-asia.com/club/R999/');
  assert.match(find(card, 'server-state').textContent, /Reachable/);
  assert.match(find(card, 'local-state').textContent, /Reachable/);
  assert.match(h.images[0], /\/club\/R999\/Icons\/Logo.png/);
  h.setDirectory(new Error('Offline'));
  await h.reload();
  assert.equal(h.nodes.get('game-links').children.length, 1);
  assert.match(h.nodes.get('game-links-status').textContent, /may be outdated/);
});
test('custom templates follow monthly updates; manual version cannot override live official version', async () => {
  const h = await pageHarness(officialData(), {}, false);
  h.nodes.get('game-links-input').value = 'Europe | https://www.bondageeurope.com/{version}/BondageClub/';
  h.nodes.get('game-version-input').value = 'R123';
  h.nodes.get('game-links-settings').handlers.submit({preventDefault(){}});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(find(h.nodes.get('game-links').children[1], 'game-link').href, 'https://www.bondageeurope.com/R999/BondageClub/');
  assert.match(find(h.nodes.get('game-links').children[0], 'local-state').textContent, /Unconfirmed/);
  const next = officialData(); next.links[0].url = 'https://www.bondage-asia.com/club/R1000/';
  h.setDirectory(next); await h.reload();
  assert.equal(find(h.nodes.get('game-links').children[1], 'game-link').href, 'https://www.bondageeurope.com/R1000/BondageClub/');
  assert.ok(h.storage.has('bc-relay-entry-settings-v1'));
});
test('cold start and expired backup use historical seeds without claiming a current version', async () => {
  const old = officialData(); old.updatedAt = new Date(Date.now() - LAST_GOOD_MS - 1000).toISOString();
  const h = await pageHarness(new Error('Offline'), {'bc-relay-entry-backup-v1':JSON.stringify(old)});
  assert.equal(h.images.length, 4);
  assert.equal(find(h.nodes.get('game-links').children[0], 'game-link').href, 'https://www.bondageprojects.elementfx.com/R131/BondageClub/');
  assert.match(h.nodes.get('directory-version').textContent, /Unconfirmed/);
  h.nodes.get('game-version-input').value = 'R1000';
  h.nodes.get('game-links-settings').handlers.submit({preventDefault(){}});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(find(h.nodes.get('game-links').children[0], 'game-link').href, 'https://www.bondageprojects.elementfx.com/R1000/BondageClub/');
  assert.equal(h.nodes.get('game-links').children.length, 4);
});

test('configured seeds never override a recent browser backup, and newer stale data wins', async () => {
  const backup = officialData();
  backup.updatedAt = new Date(Date.now() - 60000).toISOString();
  const configured = {mode:'configured', updatedAt:null, links:resolveEntries([{name:'Asia', url:'https://www.bondage-asia.com/club/{version}/'}], null)};
  const h = await pageHarness(configured, {'bc-relay-entry-backup-v1':JSON.stringify(backup)});
  assert.equal(find(h.nodes.get('game-links').children[0], 'game-link').href, backup.links[0].url);
  assert.match(h.nodes.get('game-links-status').textContent, /may be outdated/);
  const newer = officialData();
  newer.mode = 'stale';
  newer.links[0].url = 'https://www.bondage-asia.com/club/R1000/';
  h.setDirectory(newer);
  await h.reload();
  assert.equal(find(h.nodes.get('game-links').children[0], 'game-link').href, newer.links[0].url);
  h.setDirectory(configured);
  await h.reload();
  assert.equal(find(h.nodes.get('game-links').children[0], 'game-link').href, newer.links[0].url);
});

test('verified redirects update the link and version label before probing destination assets', async () => {
  const data = officialData();
  data.links[0].url = 'https://www.bondage-asia.com/club/R131/';
  const h = await pageHarness(data, {}, true, {state:'available',finalUrl:'https://www.bondage-asia.com/club/R132/',redirects:[{type:'meta-refresh'}],checkedAt:new Date().toISOString()});
  const card = h.nodes.get('game-links').children[0];
  assert.equal(find(card, 'game-link').href, 'https://www.bondage-asia.com/club/R132/');
  assert.match(find(card, 'version-chip').textContent, /R131 → R132/);
  assert.match(find(card, 'redirect-note').textContent, /Official redirect followed/);
  assert.match(h.images[0], /\/club\/R132\/Icons\/Logo.png/);
  assert.equal(h.images.some(url => url.includes('/R131/')), false);
  const failed = await pageHarness(data, {}, true, {state:'unknown',reason:'redirect',finalUrl:'https://127.0.0.1/club/R132/'});
  assert.equal(find(failed.nodes.get('game-links').children[0], 'game-link').href, data.links[0].url);
});
test('language changes preserve check results and drafts without refetching', async () => {
 const h = await pageHarness(officialData());
 const card=h.nodes.get('game-links').children[0];
 find(card,'entry-details').open=true;
 h.nodes.get('game-links-input').value='draft';
 const calls=h.requests.length;
 assert.equal(h.nodes.get('ready-count').textContent,'1 / 1');
 h.changeLanguage('zh');
 assert.equal(h.doc.documentElement.lang,'zh-Hant');
 assert.equal(find(card,'game-link').textContent,'進入遊戲');
 assert.equal(find(card,'entry-details').open,true);
 assert.equal(h.nodes.get('game-links-input').value,'draft');
 assert.equal(h.requests.length,calls);
 const failed=await pageHarness(officialData(),{},false);
 assert.equal(failed.nodes.get('ready-count').textContent,'0 / 1');
});
