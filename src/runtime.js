(() => {
  'use strict';
  const core = window.__BCRelayLoader;
  if (!core || core.version !== 1 || window.__BCRelayUIStarted) return;
  window.__BCRelayUIStarted = true;
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
    panel.setAttribute('aria-label', 'BC Relay 連線設定');
    const heading = document.createElement('strong'); heading.textContent = 'BC RELAY';
    const note = document.createElement('span'); note.className = 'note'; note.textContent = '登入後自動移除';
    const header = document.createElement('header'); header.append(heading, note);
    const row = document.createElement('div'); row.className = 'controls';
    const select = document.createElement('select'); select.setAttribute('aria-label', '連線模式');
    for (const [value, label] of [['native','A · 原版直連'],['websocket','B · WebSocket 直連'],['relay','C · Cloudflare 中繼']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; select.append(option);
    }
    select.value = core.mode;
    const apply = document.createElement('button'); apply.textContent = '套用'; apply.disabled = true;
    select.addEventListener('change', () => { apply.disabled = select.value === core.mode; });
    apply.addEventListener('click', () => {
      if (window.confirm('切換會重新載入並斷開目前遊戲，確定套用？')) core.applyMode(select.value);
    });
    const status = document.createElement('p'); status.setAttribute('role','status');
    const sync = () => {
      if (checkLogin()) return;
      const state = core.snapshot();
      status.textContent = !state.intercepted && window.ServerSocket
        ? '未攔截既有 Socket，請重新載入並檢查插件衝突。' : state.status;
    };
    row.append(select, apply); panel.append(header, row, status); shadow.append(css, panel); document.body.append(host);
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
