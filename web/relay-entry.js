const button = document.querySelector('#start');
const status = document.querySelector('#status');
try {
  const config = await fetch('/relay-build.json', { cache: 'no-store' }).then(r => r.json());
  document.querySelector('#version').textContent = `${config.gameVersion} · ${config.environment === 'TEST' ? '測試伺服器（不是正式帳號環境）' : '正式伺服器'} · ${config.commit.slice(0, 12)}`;
  if (!config.assetBase) throw new Error('尚未設定素材站。請先完成 docs/setup.md 的素材設定；目前不會連線到遊戲。');
  if (!('serviceWorker' in navigator) || !isSecureContext) throw new Error('需要支援 Service Worker 的瀏覽器，並以 HTTPS 或 localhost 開啟。');
  status.textContent = '進入前會檢查版本、素材與跨來源繪圖。';
  button.disabled = false;
  button.onclick = async () => {
    button.disabled = true;
    try {
      status.textContent = '正在檢查素材站…';
      const sourceVersion = await fetch(new URL('Scripts/Game.js', config.assetBase), { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(15000) }).then(r => { if (!r.ok) throw new Error('無法讀取素材站版本'); return r.text(); });
      if (!sourceVersion.includes(`var GameVersion = "${config.gameVersion}";`)) throw new Error('素材站版本與程式不一致。');
      for (const file of config.assetProbes) {
        const response = await fetch(new URL(file, config.assetBase), { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(15000) });
        if (!response.ok || !/^(image|audio)\//.test(response.headers.get('content-type') || '')) throw new Error(`素材檢查失敗：${file}`);
        const blob = await response.blob();
        if (blob.type.startsWith('image/')) {
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0, 1, 1); context.getImageData(0, 0, 1, 1); bitmap.close();
        }
      }
      status.textContent = '正在啟用素材載入…';
      const registration = await navigator.serviceWorker.register('/relay-sw.js', { type: 'module', updateViaCache: 'none' });
      await registration.update();
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((resolve, reject) => {
        const done = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(); };
        const timer = setTimeout(() => { navigator.serviceWorker.removeEventListener('controllerchange', done); reject(new Error('素材載入服務逾時，請重新整理。')); }, 10000);
        navigator.serviceWorker.addEventListener('controllerchange', done);
      });
      location.assign('/game.html');
    } catch (error) { status.textContent = `未進入遊戲：${error.message}`; button.disabled = false; }
  };
} catch (error) { status.textContent = error.message; }
