import {GAME_DIRECTORY, fallbackEntries, fallbackVersion, LAST_GOOD_MS, gameVersion, detectedVersion, resolveEntries, canProbe} from './game-config.js';
export {GAME_DIRECTORY} from './game-config.js';

// Read only a literal navigation assignment. Never execute upstream JavaScript.
export function navigationURL(href, onclick) {
  const value = href || /^\s*window\.location(?:\.href)?\s*=\s*(['"])([^'"\r\n]+)\1\s*;?\s*$/.exec(onclick || '')?.[2];
  if (!value) return null;
  try {
    const url = new URL(value, GAME_DIRECTORY);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

async function boundedText(response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 512 * 1024) throw new Error('Page too large');
      chunks.push(value);
    }
    return await new Blob(chunks).text();
  } finally { await reader.cancel().catch(() => {}); }
}

export async function parseGameLinks(response, Rewriter = globalThis.HTMLRewriter) {
  const links = [], active = [];
  // Match navigation semantics instead of the site's presentation/style string.
  const rewriter = new Rewriter().on('a[href], [onclick]', {
    element(element) {
      const item = {url: navigationURL(element.getAttribute('href'), element.getAttribute('onclick')), name: ''};
      if (['img', 'input', 'br', 'meta', 'link', 'hr'].includes(element.tagName)) return;
      active.push(item);
      element.onEndTag(() => {
        active.pop();
        item.name = item.name.replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, ' ')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
        if (gameVersion(item.url) && !links.some(link => link.url === item.url)) {
          links.push({...item, name: item.name || new URL(item.url).hostname});
        }
      });
    },
    text(chunk) { if (active.length) active.at(-1).name += chunk.text; },
  }).on('br', {element() { if (active.length) active.at(-1).name += ' '; }});
  await rewriter.transform(new Response(await boundedText(response))).arrayBuffer();
  if (!links.length) throw new Error('No game links found');
  return links;
}

async function cacheMatch(cache, key) {
  try { return await cache?.match(key); } catch { return null; }
}
async function cachePut(cache, key, response) {
  try { await cache?.put(key, response); } catch { /* Optional best-effort cache. */ }
}
function json(data, ttl = 0) {
  return Response.json(data, {headers: {'Cache-Control': ttl ? `public, max-age=${ttl}` : 'no-store'}});
}

export async function gameLinks(request, {fetcher = fetch, cache = globalThis.caches?.default, Rewriter = globalThis.HTMLRewriter} = {}) {
  if (request.method !== 'GET') return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET'}});
  const key = new Request(new URL('/api/game-links', request.url));
  const backupKey = new Request(new URL('/api/game-links/last-good', request.url));
  const cached = await cacheMatch(cache, key);
  if (cached) return cached;
  try {
    const upstream = await fetcher(GAME_DIRECTORY, {signal: AbortSignal.timeout(8000), redirect: 'manual', headers: {Accept: 'text/html'}});
    if (!upstream.ok || !upstream.headers.get('Content-Type')?.includes('text/html')) {
      await upstream.body?.cancel();
      throw new Error('Directory unavailable');
    }
    const links = await parseGameLinks(upstream, Rewriter);
    const data = {source: GAME_DIRECTORY, mode:'official', links, version:detectedVersion(links), updatedAt:new Date().toISOString()};
    await cachePut(cache, backupKey, json(data, LAST_GOOD_MS / 1000));
    const response = json(data, 300);
    await cachePut(cache, key, response.clone());
    return response;
  } catch {
    const backup = await cacheMatch(cache, backupKey);
    if (backup) {
      try {
        const data = await backup.json();
        if (Date.now() - Date.parse(data.updatedAt) < LAST_GOOD_MS) return json({...data, mode:'stale'});
      } catch { /* Invalid backup falls through to configuration. */ }
    }
    const links = resolveEntries(fallbackEntries, fallbackVersion).filter(link => link.url);
    return json({source:GAME_DIRECTORY, mode:links.length ? 'configured' : 'unavailable', links, version:detectedVersion(links), updatedAt:null});
  }
}

async function inspectGamePage(response, Rewriter) {
  let title = '', script = false;
  const refreshes = [];
  await new Rewriter().on('title', {text(chunk) { title += chunk.text; }})
    .on('meta[http-equiv]', {element(element) {
      if (element.getAttribute('http-equiv')?.trim().toLowerCase() === 'refresh') {
        refreshes.push(element.getAttribute('content') || '');
      }
    }})
    .on('script[src]', {element(element) {
      if (/^(?:\.\/)?Scripts\/Common\.js(?:\?.*)?$/i.test(element.getAttribute('src') || '')) script = true;
    }})
    .transform(new Response(await boundedText(response))).arrayBuffer();
  return {game:title.trim() === 'Bondage Club' && script, refreshes};
}

export function refreshTarget(content, currentURL) {
  const match = /^\s*\d+(?:\.\d+)?\s*;\s*url\s*=\s*(.*?)\s*$/i.exec(content);
  if (!match) return null;
  let value = match[1];
  if (/^(['"])(.*)\1$/.test(value)) value = value.slice(1, -1);
  if (!value) return null;
  try { return new URL(value, currentURL).href; } catch { return null; }
}

export async function gameLinkStatus(request, {fetcher = fetch, cache = globalThis.caches?.default, Rewriter = globalThis.HTMLRewriter} = {}) {
  if (request.method !== 'GET') return new Response('Method not allowed', {status:405, headers:{Allow:'GET'}});
  const target = new URL(request.url).searchParams.get('url');
  // No arbitrary proxy: HTTPS, approved public hosts, game paths, no query/credentials/ports.
  if (!canProbe(target)) return Response.json({state:'unknown', reason:'unsupported'}, {status:400, headers:{'Cache-Control':'no-store'}});
  const normalized = new URL(target); normalized.hash = '';
  const key = new URL('/api/game-link-status', request.url); key.searchParams.set('url', normalized.href);
  key.searchParams.set('schema', '2'); // Invalidate pre-meta-refresh results after deployment.
  const cached = await cacheMatch(cache, new Request(key));
  if (cached) return cached;
  const started = Date.now(), signal = AbortSignal.timeout(8000);
  let url = normalized.href, result;
  const visited = new Set([url]), redirects = [], maxRedirects = 5;
  function follow(next, type) {
    if (!next || !canProbe(next) || redirects.length >= maxRedirects) return false;
    const target = new URL(next); target.hash = '';
    if (visited.has(target.href)) return false;
    redirects.push({from:url, to:target.href, type});
    visited.add(target.href);
    url = target.href;
    return true;
  }
  try {
    while (true) {
      const response = await fetcher(url, {method:'GET', redirect:'manual', signal, headers:{Accept:'text/html'}});
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('Location');
        await response.body?.cancel();
        const next = location && new URL(location, url).href;
        if (!follow(next, 'http')) { result = {state:'unknown', reason:'redirect'}; break; }
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        result = {state:[404,410].includes(response.status) ? 'unavailable' : 'unknown', reason:'http', httpStatus:response.status};
      } else if (!response.headers.get('Content-Type')?.includes('text/html')) {
        await response.body?.cancel();
        result = {state:'unknown', reason:'not-game'};
      } else {
        const page = await inspectGamePage(response, Rewriter);
        // A refresh takes precedence over game markers; don't claim an intermediate page is final.
        if (page.refreshes.length) {
          const next = page.refreshes.length === 1 ? refreshTarget(page.refreshes[0], url) : null;
          if (!follow(next, 'meta-refresh')) { result = {state:'unknown', reason:'redirect'}; break; }
          continue;
        }
        result = page.game ? {state:'available', reason:'game-page', finalUrl:url, version:gameVersion(url)} : {state:'unknown', reason:'not-game'};
      }
      break;
    }
  } catch { result = {state:'unknown', reason:signal.aborted ? 'timeout' : 'network'}; }
  const response = json({...result, redirects, checkedAt:new Date().toISOString(), durationMs:Date.now() - started}, 60);
  await cachePut(cache, new Request(key), response.clone());
  return response;
}
