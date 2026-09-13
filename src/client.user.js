// ==UserScript==
// @name         BC Relay Connection Test
// @namespace    https://github.com/awdrrawd/BondageClub-Relay
// @version      0.2.1
// @updateURL    __INSTALL_URL__
// @downloadURL  __INSTALL_URL__
// @description  Compare native, direct WebSocket, and Cloudflare relay on official BC pages.
// @include      /^https:\/\/(www\.)?(bondage(projects(\.elementfx)?|-(europe|asia))\.com|bondageeurope\.com)\/(club\/)?R[^/]*\/.*$/
// @icon         https://raw.githubusercontent.com/awdrrawd/liko-Plugin-Repository/main/Images/PCM_ICON.png
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @noframes
// ==/UserScript==
(() => {
  'use strict';
  // Asia serves the game directly at /club/R131/, without /BondageClub/.
  const standardGame = /\/R[^/]*\/BondageClub\//i.test(location.pathname);
  const asiaGame = /^(www\.)?bondage-asia\.com$/i.test(location.hostname)
    && /^\/club\/R[^/]+\/(?:index\.html?)?$/i.test(location.pathname);
  if (!standardGame && !asiaGame) return;
  const relay = "__RELAY_ORIGIN__";
  // Repository copies are templates. Reject them before touching the game's io.
  if (!relay.startsWith('https://')) {
    const message = '[BC Relay Test] 此檔案是未設定 Relay 網址的模板，插件未啟用。請從你部署的 Relay 網站 /install.user.js 重新安裝，再重新整理遊戲。目前遊戲仍使用原版連線，不是 Cloudflare 中繼。';
    console.error(message);
    window.alert(message);
    return;
  }
  const key = 'bc-relay-test-mode-v1';
  let mode = 'native';
  try { mode = localStorage.getItem(key) || 'native'; } catch {}
  if (!['native','websocket','relay'].includes(mode)) mode = 'native';
  let status = '等待官方連線初始化', intercepted = false;
  if (window.__BCRelayLoader) return;
  let loggedIn = false;
  const subscribers = new Set();
  const notify = () => { for (const fn of subscribers) { try { fn(); } catch (error) { console.error('[BC Relay UI]', error); } } };
  const update = text => { status = text; notify(); console.info('[BC Relay Test]', new Date().toISOString(), text); };
  const finishLogin = () => { loggedIn = true; notify(); subscribers.clear(); };
  window.__BCRelayLoader = Object.freeze({
    version: 1, relay, mode,
    snapshot: () => ({status, intercepted, loggedIn}),
    subscribe: fn => { subscribers.add(fn); return () => subscribers.delete(fn); },
    finishLogin,
    applyMode: value => {
      if (!['native','websocket','relay'].includes(value)) return;
      try { localStorage.setItem(key, value); location.reload(); }
      catch { update('無法儲存模式，請檢查瀏覽器儲存權限'); }
    },
  });
  const wrapped = new WeakMap();
  function wrap(factory) {
    if (typeof factory !== 'function') return factory;
    if (wrapped.has(factory)) return wrapped.get(factory);
    const proxy = new Proxy(factory, {
      apply(target, that, args) {
        let server;
        try { server = new URL(args[0], location.href); } catch {}
        const env = server?.hostname === 'bondage-club-server.herokuapp.com' ? 'prod' : server?.hostname === 'bondage-club-server-test.herokuapp.com' ? 'test' : null;
        if (!env) return Reflect.apply(target, that, args);
        intercepted = true;
        let next = args;
        if (mode !== 'native') {
          const options = {...(args[1] || {}),transports:['websocket'],upgrade:false};
          if (mode === 'relay') {
            options.path = `/socket.io/${env}/`;
          }
          next = [mode === 'relay' ? relay : args[0], options];
        }
        update(`${mode} · ${env.toUpperCase()} · 連線中`);
        const socket = Reflect.apply(target, that, next);
        socket.on('connect', () => update(`${mode} · ${env.toUpperCase()} · Socket 已連線`));
        socket.on('connect_error', () => update(`${mode} · 連線失敗，請檢查 Network / Console`));
        socket.on('disconnect', () => update(`${mode} · 已斷線`));
        const onLogin = data => {
          if (data && typeof data === 'object' && Number.isFinite(data.MemberNumber)) {
            update(`${mode} · 登入成功`);
            finishLogin();
            socket.off?.('LoginResponse', onLogin);
          }
        };
        socket.on('LoginResponse', onLogin);
        return socket;
      },
    });
    wrapped.set(factory, proxy); wrapped.set(proxy, proxy); return proxy;
  }
  // socket.io's UMD bundle assigns window.io before GameStart calls ServerInit.
  // Install before the bundle rather than reconnecting an already authenticated socket.
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'io');
    if (descriptor && !descriptor.configurable) throw new Error('io cannot be intercepted');
    let factory = wrap(window.io);
    Object.defineProperty(window, 'io', {configurable:true,enumerable:true,get:()=>factory,set:value=>{factory=wrap(value);}});
  } catch { update('未能攔截 io；此輪不能視為中繼測試，請停用其他連線插件後重載。'); }
  // The synchronous socket hook above must not wait for a remote download.
  function loadUI() {
    if (loggedIn || window.Player?.MemberNumber != null) return;
    const script = document.createElement('script');
    script.src = `${relay}/runtime.js`;
    script.onerror = () => { console.error('[BC Relay Test] 面板載入失敗；連線核心仍使用已儲存模式：', mode); script.remove(); };
    script.onload = () => script.remove();
    (document.head || document.documentElement).append(script);
  }
  if (document.documentElement) loadUI();
  else document.addEventListener('DOMContentLoaded', loadUI, {once:true});
})();
