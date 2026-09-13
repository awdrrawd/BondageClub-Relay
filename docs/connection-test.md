# 官方頁面連線比較測試

本次測試不需要 R2、素材 CDN 或完整鏡像。官方頁面照常載入素材；只有 C 模式的遊戲 Socket 經過新 Relay 站。Lite 不變。

## 1. 提交與推送

GitHub Desktop 選 BondageClub-Relay，確認沒有 upstream/.cache/dist/dist-relay。填寫提交說明，Commit，再 Push origin。沒有代你推送。

## 2. 建立 Cloudflare Pages

Workers & Pages → 建立 Pages → 連接 GitHub → BondageClub-Relay。

| 設定 | 值 |
| --- | --- |
| Framework preset | None |
| Production branch | 你推送的分支 |
| Build command | `npm test && npm run build:relay` |
| Output directory | `dist-relay` |
| Root directory | 留空 |
| NODE_VERSION | 22 |

**這次不是舊文件的 npm run check / dist。** 本測試不使用 relay.config.json 的 TEST 設定，而是依官方頁面原本要連的伺服器，分流到固定的 prod/test 上游，不更改官方 GameVersion。

部署完成後打開配發的 pages.dev 網址。點「中繼設定狀態」應看到 bc-official-relay-test；這只證明 Worker 可執行，不代表上游 Socket 已驗證成功。

## 3. 安裝插件

1. 瀏覽器先安裝官方商店的 Tampermonkey，允許 userscript 執行。不同瀏覽器可能需要在擴充功能頁啟用「允許使用者指令碼」。
2. 在你自己的 Relay 首頁點「安裝 BC Relay Connection Test」，於 Tampermonkey 確認安裝。
3. 不要直接安裝倉庫的 client.user.js，它還沒有填入你的 Relay 網址。使用本站 `/install.user.js` 產生的版本。
4. 重開原本能使用的官方遊戲網址。四組域名及其子域名都包含在匹配範圍；不替你猜最新版本網址。
5. 右下角應看到 A/B/C 下拉選單及狀態。預設 A；若看不到，先檢查 Tampermonkey 是否允許本站、是否在頁面環境 document-start 執行。

插件 0.1.1 使用 @include 正規式（指定域名及可選 www，保留亞洲站 /club/），每 500ms 檢查 Player.MemberNumber，登入後隱藏面板，登出且會員編號清除後重新顯示。隱藏後連線與錯誤狀態仍在 Console 的 [BC Relay Test] 訊息中。頁面離開會清除輪詢，不使用 SDK。

## 4. 測試顺序

先停用其他會修改連線的插件，其他功能插件也建議暫停。每次只開一個遊戲頁，避免同帳號互踢。

| 模式 | 做什麼 | 用途 |
| --- | --- | --- |
| A 原版直連 | 保留原版 Socket.IO 選項 | 基準 |
| B WebSocket 直連 | 強制 WebSocket，仍直連 BC | 排除 polling/upgrade 因素 |
| C Cloudflare 中繼 | 強制 WebSocket，連自己的 Relay | 比較網路路徑 |

每組選好後按「套用並重載」，會詢問是否重新載入、斷開目前遊戲。然後自行登入，測試 5–10 分鐘：進房、聊天、BEEP、換房及一次短暫斷網恢復。最好相近時間依 A→B→C→A 比較，避免伺服器狀態變動造成誤判。

第一輪 VPN 關閉測試；若只有開 VPN 才能開啟官方頁面，可再做獨立一輪，記錄開啟/關閉的時間。插件不能讓原本打不開的官方 HTML 變得可達。

## 5. 檢查有沒有真的走中繼

F12 → Network → WS：

- A/B：連到原本 heroku 上游。
- C：連到你自己的 pages.dev，路徑 `/socket.io/prod/` 或 `/socket.io/test/`，應回應 101。
- 404：通常是部署的不是 dist-relay，或站址有誤。
- 403：官方 Origin 未被允許，或請求不是官方頁面發出。
- 426：不是 WebSocket 握手；請確認插件選項生效。
- 502：Cloudflare 未能建立上游握手。
- CSP connect-src 錯誤：官方頁面禁止連到新站，這條插件路徑需另評估，不能靠伺服器加 CORS 解決。
- 已登入但提示「尚未觀察到官方 io 呼叫」：注入太晚或不在 page/main world，不算有效中繼測試。

面板只記錄模式、連線及登入狀態，不記錄帳號、密碼、聊天內容。請勿分享完整 WS Frames 或 HAR，裡面可能有登入與聊天資料。

## 6. 回報格式

```text
瀏覽器／裝置：
官方網址：
VPN：關閉／開啟
A：登入耗時、是否斷線
B：登入耗時、是否斷線
C：登入耗時、是否斷線
C 的 WS 網址主機與 HTTP 狀態：
錯誤訊息（不含帳密與聊天）：
```

B/C 都改善：可能是 WebSocket-only 有幫助；只有 C 改善：較支持中繼路徑有幫助；三組都失敗：需分辨官方服務、頁面可達性及插件啟動問題。一次測試不能保證長期效果。

## 還原

停用或刪除 BC Relay Connection Test，再重新載入官方頁面，即恢復原版行為。插件不會改寫官方伺服器上的帳號設定。

Origin 限制不是對非瀏覽器程式的認證，任何公開中繼仍可能被濫用；僅供初期小規模測試。沒有自動回退直連，也不會暗中改用正式服。
