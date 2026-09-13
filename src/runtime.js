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
    confirm: '切換會重新載入並斷開目前遊戲，確定套用？',
  } : {
    panel: 'BC Relay connection settings', mode: 'Connection mode', apply: 'Apply', info: 'Help (opens a new tab)',
    native: 'A · Native', websocket: 'B · Direct WebSocket', relay: 'C · Cloudflare relay',
    connecting: 'Connecting', connected: 'Connected', failed: 'Connection failed',
    confirm: 'Switching will reload the page and disconnect the game. Apply?',
  };
  // Loader v1 exposes diagnostic text. Keep compatibility without reinstalling it.
  function connectionState(state) {
    if ((!state.intercepted && window.ServerSocket) || /失敗|已斷線|未能攔截/.test(state.status)) return 'failed';
    return /已連線|登入成功/.test(state.status) ? 'connected' : 'connecting';
  }
  let host, timer, unsubscribe;
  let disposed = false;
  const dispose = () => {
    disposed = true;
    window.clearInterval(timer);
    timer = undefined;
    unsubscribe?.();
    host?.remove();
    host = undefined;
    document.removeEventListener('DOMContentLoaded', mount);
    window.removeEventListener('pagehide', pause);
    window.removeEventListener('pageshow', resume);
  };
  const checkLogin = () => {
    if (core.snapshot().loggedIn || window.Player?.MemberNumber != null) {
      dispose();
      core.finishLogin();
      return true;
    }
    return false;
  };
  function pause() { window.clearInterval(timer); timer = undefined; }
  function resume() {
    if (!disposed && !checkLogin() && timer === undefined) timer = window.setInterval(checkLogin, 500);
  }
  function mount() {
    if (disposed || checkLogin()) return;
    host = document.createElement('div');
    host.id = 'bc-relay-panel';
    const shadow = host.attachShadow({mode:'open'});
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = `${core.relay}/panel.css`;
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
    select.addEventListener('change', () => { apply.disabled = select.value === core.mode; });
    apply.addEventListener('click', () => {
      if (window.confirm(t.confirm)) core.applyMode(select.value);
    });
    const sync = () => {
      if (checkLogin()) return;
      const state = core.snapshot();
      heading.textContent = `BC RELAY - ${t[connectionState(state)]}`;
    };
    row.append(select, apply); panel.append(header, row); shadow.append(css, panel); document.body.append(host);
    unsubscribe = core.subscribe(sync);
    sync();
    if (!disposed) {
      window.addEventListener('pagehide', pause);
      window.addEventListener('pageshow', resume);
      resume();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
