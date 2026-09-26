const strings = {
  zh: {
    liteTitle:'只想輕量聊天？試試 BC Lite。', liteDescription:'非官方文字客戶端，可搜尋與加入房間、聊天、私訊及查看好友。不載入人物繪圖或完整遊戲引擎，也不提供衣櫃與完整插件功能。', liteDetails:'Lite 與 Relay 有什麼不同？', liteDifference:'Relay 在官方遊戲內調整連線路徑；Lite 是獨立的文字介面，不需要安裝 Relay Loader。登入與遊戲流量經過 Lite 部署站的中繼；聊天紀錄預設保存在本機，登出不會刪除已儲存的紀錄。', liteSource:'查看 Lite 原始碼與說明 ↗', liteOpen:'開啟 BC Lite',
    pageTitle:'BC Relay · 遊戲入口', skip:'跳到遊戲入口', navEntries:'遊戲入口', navSetup:'開始使用', navHelp:'使用說明', navMonitor:'負載監看',
    eyebrow:'BONDAGE CLUB / CONNECTION GATEWAY', heroTitle:'你的 BC 連線入口。', heroDescription:'先確認通道，再開始遊戲。官方入口、連線檢查與 Relay 設定，集中在這裡。',
    official:'開啟官方入口', channelCount:'已找到入口', readyCount:'雙重檢查通過', versionLabel:'清單版本', unknownVersion:'待確認',
    entriesTitle:'選擇遊戲入口', entriesDescription:'遊戲仍由官方提供，選擇一個通道進入。', reload:'更新清單', check:'重新檢查', checkingAction:'檢查中',
    loading:'正在讀取官方通道…', officialSource:'已同步官方清單', staleSource:'使用上次清單，可能非最新版', fallbackSource:'使用備援起點，請查看各入口檢查結果', manualSource:'自訂模板使用手動版本',
    sourceTime:'清單更新於 {time}', checkGuide:'如何判讀檢查結果？', checkExplanation:'「遊戲頁」由 Relay 站檢查；「本機素材」由你的瀏覽器載入小型遊戲圖示。兩者都通過，仍不代表登入或遊戲連線一定正常。', cacheExplanation:'清單最多快取 5 分鐘，站方檢查最多快取 60 秒；備援清單最多保留 7 天。更新清單不會略過快取。',
    noScript:'啟用 JavaScript 可顯示通道與檢查結果，也可直接開啟官方入口。',
    optional:'選用', setupTitle:'第一次使用 Relay？', setupDescription:'需要替代連線路徑時，再安裝 Loader。', step1Title:'安裝 Tampermonkey', step1Body:'準備使用者指令碼管理器。', step2Title:'安裝 Relay Loader', step2Body:'使用本站安裝連結，保留一份啟用的插件。', step3Title:'在遊戲內選擇模式', step3Body:'開啟右下角氣球，選擇模式並套用。', install:'安裝／更新 Loader', nativeHint:'使用原版直連可直接選擇遊戲入口。',
    modesTitle:'三種連線路徑', modeA:'原版直連', modeADesc:'預設，使用官方連線設定。', modeB:'WebSocket 直連', modeBDesc:'直接連到官方伺服器。', modeC:'Cloudflare 中繼', modeCDesc:'遊戲通訊經過 Relay 站。', modeNote:'切換模式會重新載入並中斷目前連線。',
    advancedTitle:'自訂與備援入口', advancedSummary:'儲存常用入口，或從舊版網址追蹤官方導向。', localOnly:'僅儲存於此瀏覽器', settingsExplanation:'每行填入「名稱 | HTTPS 網址」。使用 {version} 套用偵測版本，或填寫已知舊入口；確認官方導向後，直連會更新到目的地。', entryLabel:'入口網址', entryHint:'例如：Asia | https://www.bondage-asia.com/club/{version}/', versionInput:'備援版本', optionalField:'選填，無法確認官方版本時使用', save:'儲存並檢查', reset:'恢復站方預設',
    helpTitle:'需要更多協助？', helpDescription:'安裝步驟、更新方式與連線排錯。', fullGuide:'使用說明與服務限制', monitorLink:'查看 Relay 負載', sourceLink:'查看原始碼', footerNote:'非官方專案 · 學習與連線實驗', serviceInfo:'服務資訊',
    originOfficial:'官方入口', originFallback:'備援清單', originCustom:'自訂入口', originSeed:'備援起點', enter:'進入遊戲', needsVersion:'等待版本', configureVersion:'請設定備援版本',
    gamePage:'遊戲頁', localAsset:'本機素材', pending:'待檢查', checking:'檢查中', reachable:'可達', unconfirmed:'未確認', ready:'檢查通過', missing:'頁面不存在', checkDetails:'檢查細節',
    notGame:'未辨識為遊戲頁', timeout:'檢查逾時', redirectUnknown:'導向未確認', unsupported:'此網域未啟用檢查', network:'無法確認連線', assetUnknown:'可能是網路、阻擋或逾時。', redirected:'已追蹤官方導向', serverAt:'站方檢查', localAt:'本機檢查', originalURL:'檢查起點',
    tooMany:'最多可儲存 12 個自訂入口。', invalidURL:'請填 HTTPS 遊戲網址，例如 https://www.bondage-asia.com/club/{version}/。', invalidVersion:'版本格式例如 R132 或 R133Beta1。',
    saved:'已儲存於此瀏覽器。', saveFailed:'已套用，但瀏覽器無法儲存設定。', resetDone:'已恢復站方預設。', resetFailed:'已恢復預設，但無法儲存。'
  },
  en: {
    liteTitle:'Just here to chat? Try BC Lite.', liteDescription:'An unofficial text client for finding and joining rooms, chatting, whispers and friends. It does not load character rendering or the full game engine, and does not provide the wardrobe or full plugin support.', liteDetails:'How is Lite different from Relay?', liteDifference:'Relay changes the connection route inside the official game. Lite is a separate text interface and needs no Relay loader. Login and game traffic pass through the Lite deployment’s relay. Chat history is saved locally by default; logging out does not delete saved history.', liteSource:'Lite source and documentation ↗', liteOpen:'Open BC Lite',
    pageTitle:'BC Relay · Game gateway', skip:'Skip to game entries', navEntries:'Game entries', navSetup:'Get started', navHelp:'Guide', navMonitor:'Load monitor',
    eyebrow:'BONDAGE CLUB / CONNECTION GATEWAY', heroTitle:'Your way into BC.', heroDescription:'Check a channel before you play. Official entries, connection checks and Relay setup, all in one place.',
    official:'Official directory', channelCount:'Entries found', readyCount:'Both checks passed', versionLabel:'Directory version', unknownVersion:'Unconfirmed',
    entriesTitle:'Choose your entry', entriesDescription:'The game is hosted by the official providers. Pick a channel to begin.', reload:'Refresh list', check:'Run checks', checkingAction:'Checking',
    loading:'Loading official channels…', officialSource:'Official directory synced', staleSource:'Using a previous list; it may be outdated', fallbackSource:'Using fallback entries; see each check result', manualSource:'Custom templates use the manual version',
    sourceTime:'Directory updated {time}', checkGuide:'What do the checks mean?', checkExplanation:'Game page is checked by the Relay server. Local asset checks a small game icon from your browser. Passing both does not guarantee login or the game connection.', cacheExplanation:'Directory results are cached up to 5 minutes and server checks up to 60 seconds. Backup lists are retained for up to 7 days. Refreshing does not bypass the cache.',
    noScript:'Enable JavaScript to load entries and checks, or use the official directory.',
    optional:'OPTIONAL', setupTitle:'New to Relay?', setupDescription:'Install the loader when you need an alternative connection route.', step1Title:'Get Tampermonkey', step1Body:'Install the userscript manager.', step2Title:'Install the Relay loader', step2Body:'Use this site’s installer and keep one active copy.', step3Title:'Choose a mode in the game', step3Body:'Open the bottom-right bubble, select a mode and apply.', install:'Install / update loader', nativeHint:'For a native connection, go straight to a game entry.',
    modesTitle:'Three connection routes', modeA:'Native', modeADesc:'Default. Uses the official connection settings.', modeB:'Direct WebSocket', modeBDesc:'Connects to the official server directly.', modeC:'Cloudflare relay', modeCDesc:'Game traffic goes through the Relay site.', modeNote:'Switching modes reloads and disconnects the current session.',
    advancedTitle:'Custom & fallback entries', advancedSummary:'Save an entry or follow official redirects from an older URL.', localOnly:'Saved in this browser only', settingsExplanation:'Enter one name | HTTPS URL per line. Use {version} for the detected version, or enter a known older URL. Verified official redirects update the direct link.', entryLabel:'Entry URLs', entryHint:'Example: Asia | https://www.bondage-asia.com/club/{version}/', versionInput:'Fallback version', optionalField:'Optional, used when the official version is unconfirmed', save:'Save and check', reset:'Restore defaults',
    helpTitle:'Need a hand?', helpDescription:'Installation, updates and connection troubleshooting.', fullGuide:'User guide & service limitations', monitorLink:'View Relay load', sourceLink:'View source', footerNote:'Unofficial project · Learning & connection experiments', serviceInfo:'Service info',
    originOfficial:'Official entry', originFallback:'Backup list', originCustom:'Custom entry', originSeed:'Fallback starting point', enter:'Enter game', needsVersion:'Version needed', configureVersion:'Set a fallback version',
    gamePage:'Game page', localAsset:'Local asset', pending:'Not checked', checking:'Checking', reachable:'Reachable', unconfirmed:'Unconfirmed', ready:'Checks passed', missing:'Page missing', checkDetails:'Check details',
    notGame:'Game page not identified', timeout:'Timed out', redirectUnknown:'Redirect unconfirmed', unsupported:'Checks not enabled for this host', network:'Connection unconfirmed', assetUnknown:'Network, blocking or timeout may be responsible.', redirected:'Official redirect followed', serverAt:'Server check', localAt:'Local check', originalURL:'Starting URL',
    tooMany:'Save up to 12 custom entries.', invalidURL:'Enter an HTTPS game URL, e.g. https://www.bondage-asia.com/club/{version}/.', invalidVersion:'Use a version such as R132 or R133Beta1.',
    saved:'Saved in this browser.', saveFailed:'Applied, but browser storage is unavailable.', resetDone:'Site defaults restored.', resetFailed:'Defaults restored; storage unavailable.'
  }
};
let language = /^(zh|tw)/i.test(navigator.language) ? 'zh' : 'en';
try {
  const saved = localStorage.getItem('bc-relay-site-language');
  if (saved === 'zh' || saved === 'en') language = saved;
} catch { /* Browser language still works when storage is unavailable. */ }
if (location.hash === '#en' || location.hash === '#zh') language = location.hash.slice(1);
export const getLanguage = () => language;
export function t(key, values = {}) {
  return (strings[language][key] || key).replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}
function applyLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
  document.title = t('pageTitle');
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-language]')) node.hidden = node.dataset.language !== language;
  for (const node of document.querySelectorAll('[data-set-language]')) node.setAttribute('aria-pressed', String(node.dataset.setLanguage === language));
}
export function setLanguage(value) {
  if (!['zh','en'].includes(value)) return;
  language = value;
  try { localStorage.setItem('bc-relay-site-language', value); } catch { /* Switching still works without storage. */ }
  applyLanguage();
  document.dispatchEvent(new Event('site-language-change'));
}
export function initLanguage() {
  applyLanguage();
  for (const node of document.querySelectorAll('[data-set-language]')) node.addEventListener('click', () => setLanguage(node.dataset.setLanguage));
  window.addEventListener('hashchange', () => {
    if (location.hash === '#en' || location.hash === '#zh') setLanguage(location.hash.slice(1));
  });
}
