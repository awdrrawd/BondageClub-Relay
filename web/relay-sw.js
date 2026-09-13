import { mediaPath } from './media-routing.js';
import { assetBase, revision } from './relay-config.js';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data === 'revision') event.ports[0]?.postMessage(revision);
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !assetBase) return;
  const media = mediaPath(event.request.url, self.location.origin);
  if (!media) return;
  event.respondWith((async () => {
    const headers = new Headers();
    const range = event.request.headers.get('range');
    if (range) headers.set('Range', range);
    // CORS is required: opaque images would taint the game's Canvas/WebGL.
    const response = await fetch(new URL(media, assetBase), {
      mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', headers,
    });
    if (!response.ok) return new Response('Asset source returned an error', { status: response.status });
    const output = new Headers();
    for (const name of ['content-type', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified']) {
      if (response.headers.has(name)) output.set(name, response.headers.get(name));
    }
    return new Response(response.body, { status: response.status, headers: output });
  })().catch(() => new Response('Asset unavailable: check CDN and CORS', { status: 502 })));
});
