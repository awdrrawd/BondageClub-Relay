(() => {
  'use strict';
  const core = window.__BCRelayLoader;
  if (!core || core.version !== 1 || window.__BCRelayUIStarted) return;
  window.__BCRelayUIStarted = true;
  const chinese = /^(zh|tw)(?:[-_]|$)/i.test(window.navigator?.language || 'en');
  const t = chinese ? {
    panel: 'BC Relay 連線設定', mode: '連線模式', apply: '套用', info: '使用說明（新分頁）',
    native: 'A · 原版直連', websocket: 'B · WebSocket 直連', relay: 'C · Cloudflare 中繼',
    connecting: '連線中', connected: '連線成功', failed: '連線失敗',
    noticeConnected: '連線成功，可正常登入遊戲',
    noticeConnecting: '連線中，請稍候…',
    noticeMissed: '未能攔截連線，請展開查看更新指引',
    noticeDisconnected: '連線中斷，請稍候或展開查看說明',
    noticeFailed: '連線失敗，請展開查看排錯說明',
    detailMissed: '未能攔截官方連線。請更新 Loader、重新載入，並檢查其他連線插件是否衝突。',
    detailDisconnected: 'Socket 已斷線，等待重新連線。若持續發生，請查看 Console／Network 或改用 A 比較。',
    detailFailed: '連線建立失敗；目前無法判定原因。請查看 Console／Network 的握手錯誤，或點 i 閱讀排錯說明。',
    update: '檢查／更新 Loader ↗',
    confirm: '切換會重新載入並斷開目前遊戲，確定套用？',
  } : {
    panel: 'BC Relay connection settings', mode: 'Connection mode', apply: 'Apply', info: 'Help (opens a new tab)',
    native: 'A · Native', websocket: 'B · Direct WebSocket', relay: 'C · Cloudflare relay',
    connecting: 'Connecting', connected: 'Connected', failed: 'Connection failed',
    noticeConnected: 'Connected. You can now log in to the game.',
    noticeConnecting: 'Connecting, please wait…',
    noticeMissed: 'Connection not intercepted. Open for update guidance.',
    noticeDisconnected: 'Disconnected. Please wait or open for help.',
    noticeFailed: 'Connection failed. Open for troubleshooting.',
    detailMissed: 'The official connection was not intercepted. Update the loader, reload, and check for conflicting mods.',
    detailDisconnected: 'Socket disconnected. Waiting for reconnection. Check Console / Network or compare mode A if it persists.',
    detailFailed: 'Connection failed; the cause is not available here. Check the handshake error in Console / Network, or open i for troubleshooting.',
    update: 'Check / update loader ↗',
    confirm: 'Switching will reload the page and disconnect the game. Apply?',
  };
  // Loader v1 exposes diagnostic text. Keep compatibility without reinstalling it.
  function connectionState(state) {
    if ((!state.intercepted && window.ServerSocket) || /未能攔截/.test(state.status)) return 'Missed';
    if (/已斷線/.test(state.status)) return 'Disconnected';
    if (/失敗/.test(state.status)) return 'Failed';
    return /已連線|登入成功/.test(state.status) ? 'Connected' : 'Connecting';
  }
  let host, timer, unsubscribe, toastTimer;
  let refresh = () => {};
  const cleanups = [];
  const listen = (target, event, fn, options) => {
    target.addEventListener(event, fn, options);
    cleanups.push(() => target.removeEventListener(event, fn, options));
  };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    pause();
    window.clearTimeout(toastTimer);
    unsubscribe?.();
    for (const cleanup of cleanups.splice(0)) cleanup();
    host?.remove();
    host = undefined;
  };
  const checkLogin = (state = core.snapshot()) => {
    if (disposed) return true;
    if (state.loggedIn || window.Player?.MemberNumber != null) {
      dispose();
      if (!state.loggedIn) core.finishLogin();
      return true;
    }
    return false;
  };
  function pause() { window.clearInterval(timer); timer = undefined; }
  function resume() {
    if (!disposed && !checkLogin() && timer === undefined) timer = window.setInterval(() => refresh(), 500);
  }
  function mount() {
    if (disposed || checkLogin()) return;
    host = document.createElement('div');
    host.id = 'bc-relay-panel';
    const shadow = host.attachShadow({mode:'open'});
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = `${core.relay}/panel.css`;
    const bubble = document.createElement('button'); bubble.className = 'bubble';
    const icon = document.createElement('span'); icon.className = `sprite ${core.mode}`;
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = '!'; badge.setAttribute('aria-hidden','true');
    bubble.append(icon, badge);
    const panel = document.createElement('section'); panel.className = 'panel';
    panel.setAttribute('aria-label', t.panel);
    panel.lang = chinese ? 'zh-Hant' : 'en';
    const heading = document.createElement('strong'); heading.setAttribute('role','status');
    const info = document.createElement('a'); info.className = 'info'; info.textContent = 'i';
    info.href = 'https://bondageclub-relay.pages.dev/'; info.target = '_blank'; info.rel = 'noopener noreferrer';
    info.title = t.info; info.setAttribute('aria-label', t.info);
    const header = document.createElement('header'); header.append(heading, info);
    const row = document.createElement('div'); row.className = 'controls';
    const select = document.createElement('select'); select.setAttribute('aria-label', t.mode);
    for (const [value, label] of [['native',t.native],['websocket',t.websocket],['relay',t.relay]]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; select.append(option);
    }
    select.value = core.mode;
    const apply = document.createElement('button'); apply.textContent = t.apply; apply.disabled = true;
    listen(select, 'change', () => { apply.disabled = select.value === core.mode; });
    listen(apply, 'click', () => {
      if (window.confirm(t.confirm)) core.applyMode(select.value);
    });
    const error = document.createElement('p'); error.className = 'error';
    const updateLink = document.createElement('a'); updateLink.className = 'update-link';
    updateLink.href = `${core.relay}/install.user.js`; updateLink.target = '_blank'; updateLink.rel = 'noopener noreferrer';
    updateLink.textContent = t.update;
    let expanded = false, drag = null, suppressClick = false;
    let right = 12, bottom = 12;
    const clamp = () => {
      const rect = host.getBoundingClientRect();
      right = Math.max(8, Math.min(right, Math.max(8, window.innerWidth - rect.width - 8)));
      bottom = Math.max(8, Math.min(bottom, Math.max(8, window.innerHeight - rect.height - 8)));
      host.style.right = `${right}px`; host.style.bottom = `${bottom}px`;
      positionToast();
    };
    const expand = value => {
      expanded = value; panel.hidden = !value; bubble.hidden = value;
      bubble.setAttribute('aria-expanded', String(value)); clamp();
    };
    listen(bubble, 'click', () => { if (!suppressClick) expand(true); suppressClick = false; });
    listen(document, 'pointerdown', event => {
      if (expanded && !event.composedPath().includes(host)) expand(false);
    }, true);
    listen(document, 'keydown', event => { if (event.key === 'Escape' && expanded) { expand(false); bubble.focus(); } });
    listen(window, 'resize', clamp);
    listen(shadow, 'pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      if (event.composedPath().some(node => ['SELECT','A'].includes(node.tagName) || (node.tagName === 'BUTTON' && node !== bubble))) return;
      suppressClick = false;
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, right, bottom, moved:false};
    });
    listen(window, 'pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx,dy) < 5) return;
      drag.moved = true; event.preventDefault();
      right = drag.right - dx; bottom = drag.bottom - dy; clamp();
    }, {passive:false});
    const endDrag = event => { if (drag && event.pointerId === drag.id) { suppressClick = drag.moved; drag = null; } };
    listen(window, 'pointerup', endDrag); listen(window, 'pointercancel', endDrag);
    const toast = document.createElement('div'); toast.className = 'toast'; toast.hidden = true;
    toast.lang = chinese ? 'zh-Hant' : 'en'; toast.setAttribute('role', 'status');
    const positionToast = () => {
      if (toast.hidden) return;
      // Prefer the bubble's left side; keep the notice visible near viewport edges.
      const rect = host.getBoundingClientRect();
      toast.style.maxWidth = `${Math.max(120, Math.min(280, window.innerWidth - 24))}px`;
      const leftFits = rect.left >= Math.min(292, window.innerWidth - 24);
      toast.className = leftFits ? 'toast' : 'toast above';
      toast.style.right = leftFits ? '' : `${Math.min(0, rect.right - Math.min(280, window.innerWidth - 24) - 12)}px`;
    };
    const showNotice = (key, message) => {
      window.clearTimeout(toastTimer);
      toast.textContent = message; toast.hidden = false;
      toast.setAttribute('data-state', key);
      positionToast();
      toastTimer = window.setTimeout(() => { toast.hidden = true; toastTimer = undefined; }, 3000);
    };
    let renderedKind;
    const sync = () => {
      const state = core.snapshot();
      if (checkLogin(state)) return;
      const kind = connectionState(state);
      if (renderedKind === kind) return;
      renderedKind = kind;
      const connection = kind === 'Connected' ? 'connected' : kind === 'Connecting' ? 'connecting' : 'failed';
      showNotice(connection, t[`notice${kind}`]);
      heading.textContent = `BC RELAY - ${t[connection]}`;
      bubble.setAttribute('aria-label', `${heading.textContent} · ${t.panel}`);
      bubble.title = heading.textContent; bubble.setAttribute('data-state', connection);
      badge.hidden = connection !== 'failed'; error.hidden = updateLink.hidden = connection !== 'failed';
      error.textContent = t[`detail${kind}`] || '';
    };
    row.append(select, apply); panel.append(header, row, error, updateLink); shadow.append(css, bubble, panel, toast); document.body.append(host);
    expand(false);
    refresh = sync;
    unsubscribe = core.subscribe(sync);
    sync();
    if (!disposed) {
      listen(window, 'pagehide', pause);
      listen(window, 'pageshow', resume);
      resume();
    }
  }
  if (document.readyState === 'loading') listen(document, 'DOMContentLoaded', mount, {once:true});
  else mount();
})();
