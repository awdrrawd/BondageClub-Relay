// ==UserScript==
// @name         BC Relay Connection Test
// @namespace    https://github.com/awdrrawd/BondageClub-Relay
// @version      0.1.0
// @description  Compare native, direct WebSocket, and Cloudflare relay on official BC pages.
// @match        https://bondageprojects.elementfx.com/*
// @match        https://*.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://*.bondage-europe.com/*
// @match        https://bondageprojects.com/*
// @match        https://*.bondageprojects.com/*
// @match        https://bondage-asia.com/*
// @match        https://*.bondage-asia.com/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @noframes
// ==/UserScript==
(() => {
  'use strict';
  if (!/\/R[^/]*\/BondageClub\//i.test(location.pathname)) return;
  const relay = "__RELAY_ORIGIN__";
  const key = 'bc-relay-test-mode-v1';
  let mode = 'native';
  try { mode = localStorage.getItem(key) || 'native'; } catch {}
  if (!['native','websocket','relay'].includes(mode)) mode = 'native';
  let status = '等待官方連線初始化', intercepted = false;
  let statusNode;
  const update = text => { status = text; if (statusNode) statusNode.textContent = text; console.info('[BC Relay Test]', new Date().toISOString(), text); };
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
            if (!relay.startsWith('https://')) throw new Error('Install this script from your Relay site /install.user.js');
            options.path = `/socket.io/${env}/`;
          }
          next = [mode === 'relay' ? relay : args[0], options];
        }
        update(`${mode} · ${env.toUpperCase()} · 連線中`);
        const socket = Reflect.apply(target, that, next);
        socket.on('connect', () => update(`${mode} · ${env.toUpperCase()} · Socket 已連線`));
        socket.on('connect_error', () => update(`${mode} · 連線失敗，請檢查 Network / Console`));
        socket.on('disconnect', () => update(`${mode} · 已斷線`));
        socket.on('LoginResponse', data => {
          if (data && typeof data === 'object' && Number.isFinite(data.MemberNumber)) update(`${mode} · 登入成功（${data.Environment === 'PROD' ? 'PROD' : data.Environment === 'TEST' ? 'TEST' : '環境未回報'}）`);
        });
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
  function panel() {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;right:8px;top:8px;z-index:2147483647;background:#211b2d;color:#eee;border:1px solid #b69ae3;padding:8px;border-radius:8px;font:12px system-ui;max-width:300px';
    const select = document.createElement('select'); select.title = '切換後重新載入頁面，會斷開目前遊戲';
    for (const [value,text] of [['native','A 原版直連'],['websocket','B WebSocket 直連'],['relay','C Cloudflare 中繼']]) { const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option); }
    select.value=mode;
    const apply=document.createElement('button');apply.textContent='套用並重載';
    apply.onclick=()=>{ if (confirm('切換會重新載入並斷開目前遊戲，確定套用？')) { try {localStorage.setItem(key,select.value);location.reload();} catch {update('無法儲存模式，請檢查瀏覽器儲存權限');} } };
    statusNode=document.createElement('div');statusNode.textContent=status;
    box.append(select,apply,statusNode);document.body.append(box);
    if (!intercepted) update('尚未觀察到官方 io 呼叫；若已登入，代表插件注入太晚，本輪無效。');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',panel,{once:true});else panel();
})();
