const hosts = ['bondageprojects.elementfx.com', 'bondage-europe.com', 'bondageprojects.com', 'bondage-asia.com', 'bondageeurope.com'];
export function officialOrigin(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.origin === value && hosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h)); } catch { return false; }
}
const servers = {
  '/socket.io/prod/': 'https://bondage-club-server.herokuapp.com/socket.io/',
  '/socket.io/test/': 'https://bondage-club-server-test.herokuapp.com/socket.io/',
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/install.user.js' && request.method === 'GET') {
      const source = await env.ASSETS.fetch(new Request(new URL('/client-template.txt', url)));
      if (!source.ok) return new Response('Installer missing', {status:503});
      return new Response((await source.text()).replace('"__RELAY_ORIGIN__"', JSON.stringify(url.origin)).replaceAll('__INSTALL_URL__', `${url.origin}/install.user.js`), {headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}});
    }
    if (url.pathname === '/api/relay-status') return Response.json({service:'bc-official-relay-test',version:1,paths:Object.keys(servers)},{headers:{'Cache-Control':'no-store'}});
    if (!url.pathname.startsWith('/socket.io/')) return env.ASSETS.fetch(request);
    const upstream = servers[url.pathname];
    if (!upstream) return new Response('Unknown environment', {status:404});
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', {status:426});
    const origin = request.headers.get('Origin');
    if (!officialOrigin(origin)) return new Response('Official game origin required', {status:403});
    if (url.searchParams.get('EIO') !== '4' || url.searchParams.get('transport') !== 'websocket' || [...url.searchParams.keys()].some(k => !['EIO','transport','t'].includes(k))) return new Response('Invalid handshake', {status:400});
    const target = new URL(upstream); target.search = '?EIO=4&transport=websocket';
    try {
      const response = await fetch(target, {headers:{Upgrade:'websocket',Origin:origin},redirect:'manual'});
      if (response.status === 101 && response.webSocket) return response;
      await response.body?.cancel(); return new Response('Upstream handshake failed', {status:502});
    } catch { return new Response('Upstream unreachable', {status:502}); }
  },
};
