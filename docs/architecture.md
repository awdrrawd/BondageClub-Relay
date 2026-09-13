# 架構

[首頁](../README.md) · [設定](setup.md)

```text
GitHub 固定 SHA → scripts/build.mjs → dist → Cloudflare Pages
瀏覽器 /game.html → 官方遊戲邏輯
  ├─ 程式、翻譯、CSV → Pages 靜態資源
  ├─ 圖片、音樂 → 瀏覽器 Service Worker → 支援 CORS 的素材站
  └─ Socket.IO → Pages _worker.js → 指定官方 TEST 或 PROD 伺服器
```

**瀏覽器 Service Worker 和 Cloudflare Worker 是不同的東西。** 前者在玩家裝置上處理素材網址，後者在 Cloudflare 轉接遊戲連線。媒體不經雲端 Worker，不新增雲端快取或儲存費用；圖片本身仍由外部提供者承擔流量。

原始碼由 Git 取得並驗證 SHA / 乾淨狀態，輸出時僅修改三個官方入口：ServerInit、CommonGetServer、GameStart。每個修改必須唯一匹配，避免上游變更後默默失效。原始來源不修改。

Service Worker 只攔截同站指定遊戲目錄的圖片/音樂 GET，保留查詢參數與音訊 Range。程式、CSV、外部自訂網址、data/blob 不改寫。不添加持久媒體快取；使用瀏覽器 HTTP 快取，避免無界磁碟占用。媒體請求使用 CORS 且不傳 Cookie，失敗時回 502，不退回可能污染畫布的 opaque 圖片。

入口頁先檢查素材、實際圖片解碼與 Canvas 讀取，然後註冊路由並啟動官方頁面。GameStart 另核對設定/路由版本，避免未受控制的直接入口在沒有素材路由時登入。

限制：需要 HTTPS/localhost 與 Service Worker；無法替素材來源補 CORS；不能修復官方伺服器故障；未驗證所有官方遊戲模組或第三方插件。已有頁面的程式與更新後的路由可能短暫跨版本，發佈後應關閉舊遊戲頁重新進入。取得可用 CDN 後才可進行完整瀏覽器驗收。

現有來源是 Beta 且沒有媒體。本輪無法證明完整角色繪製/音樂相容性，不能宣稱成品已保留所有功能。官方與素材更新需人工核對，暫不自動更新。
