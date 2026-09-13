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

npm run build 與 npm run build:relay 都產生 dist-relay。插件依官方頁面原本要連的伺服器，分流到固定的 prod/test 上游，不更改官方 GameVersion。

部署完成後打開配發的 pages.dev 網址。點「中繼設定狀態」應看到 bc-official-relay-test；這只證明 Worker 可執行，不代表上游 Socket 已驗證成功。

## 3. 使用 Tampermonkey 安裝

1. 前往 [Tampermonkey 官方網站](https://www.tampermonkey.net/)，選擇自己的瀏覽器，從對應的官方擴充功能商店安裝。
2. 確認 Tampermonkey 已啟用，並允許它在官方 BC 遊戲網站執行。若管理器提示需要「允許使用者指令碼」等權限，依提示完成設定。
3. 開啟 [BC Relay 安裝頁](https://bondageclub-relay.pages.dev/)，按「安裝／更新 Loader」；也可直接開啟 [install.user.js](https://bondageclub-relay.pages.dev/install.user.js)。在 Tampermonkey 確認安裝。
4. 在 Tampermonkey 管理面板確認 **BC Relay Connection Test** 已啟用，且只保留一份。不要直接複製倉庫的 `src/client.user.js`，它是未填入中繼網址的模板。
5. 重新整理或重新開啟官方遊戲頁，點右下角氣球，選 **C · Cloudflare 中繼**，按「套用」並確認重新載入，再登入遊戲。預設 A 是原版直連。

登入後氣球與輪詢會移除，需要重新設定時重新整理頁面。若沒有氣球，先檢查插件是否啟用、網站權限與其他連線插件衝突。

**更新：**面板 JS／CSS 在重新開頁時載入；Loader 核心由 Tampermonkey 檢查更新，也可再次開啟上方安裝連結確認更新。自架者請使用自己的 Relay 站安裝連結。

**只支援 Tampermonkey 方式作為中繼安裝。** 書籤與控制台注入通常晚於官方 Socket 初始化，不能可靠接管連線，因此不提供這兩種載入方式。

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
- 「等待官方連線初始化」：尚未捕捉到官方連線，單憑這個提示不能判定中繼故障。
- 「官方 Socket 已建立，但本插件未攔截」：可能注入太晚、不在 page/main world 或其他插件改寫連線，不算有效中繼測試。
- `Failed to load "Character/Login" screen`：官方登入畫面初始化拋出錯誤，請展開 Console 同名錯誤查看原因與 stack；這個提示本身不是 WebSocket 握手失敗。

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

更新插件也必須從自己部署站的 `/install.user.js` 安裝。倉庫的 `src/client.user.js` 是模板，未包含 Relay 網址；直接複製它不會啟用中繼。0.1.1 在 C 模式會因此中斷遊戲初始化；0.1.2 會先明確提示並停用插件，保留原版連線，需正確重裝後才能測試 C。

停用或刪除 BC Relay Connection Test，再重新載入官方頁面，即恢復原版行為。插件不會改寫官方伺服器上的帳號設定。

Origin 限制不是對非瀏覽器程式的認證，任何公開中繼仍可能被濫用；僅供初期小規模測試。沒有自動回退直連，也不會暗中改用正式服。

## Loader 更新與自動化

首次從旧版切換到 0.2.0，請從部署站 `/install.user.js` 安裝一次。之後：

- `runtime.js`、面板 CSS：每次開頁從部署站載入，Cache-Control: no-store；重新整理才套用，不在遊戲中途熱更新。
- Loader 的早期 Socket 攔截核心：為避免遠端下載比官方連線慢，仍內建於安裝腳本。修改時需提高 `@version`，Tampermonkey 依自己的更新排程從本站 updateURL／downloadURL 更新；必要時按「檢查更新」，不需手動複製程式。
- Worker：隨 Cloudflare 部署更新，既有連線不保證立即切換版本。

遠端面板載入失敗時，Console 會提示；已儲存模式的連線核心不依賴面板下載。若官方 CSP 禁止載入本站 script／style，需另行確認相容性。

GitHub Actions 在 main 推送、PR 與手動觸發時執行測試和建置。Dependabot 每月檢查 GitHub Actions 並開 PR，不自動合併。本倉庫目前沒有 npm 第三方依賴，因此未增加空的 npm 更新排程。

推送後在 GitHub → Actions 確認 CI 成功；若要強制合併前通過測試，可在 Settings → Rules → Rulesets 為 main 加入必要狀態檢查 `verify`（需先有一次執行紀錄）。Cloudflare 維持原組建設定。

## 面板語言與標題

面板依瀏覽器 language 判斷，zh／tw（含 zh-TW、zh-CN 等）顯示中文，其餘英文。標題合併連線狀態，移除原本底部診斷文字；詳細診斷保留在 Console。連線成功只代表 Socket 連線，不代表登入完成。右上角 i 另開 https://bondageclub-relay.pages.dev/ 的中英說明。

本專案僅供學習與測試，不保證穩定連線或持續服務；免費額度用盡造成中斷時，維護者不承諾加購、補償或承擔相關損失。完整聲明見 README 及安裝首頁。

## 氣球面板

預設右下角氣球，點擊展開；點面板外任意位置或 Escape 收合。氣球與面板空白／標題區可用滑鼠或觸控拖曳，選單與按鈕維持原本操作。位置只在本次頁面有效，重新整理回右下角；視窗縮小會限制在可見範圍。

LCE 的 src/core/constants.js 將登入 STAGE 設為 100，Relay 使用 101。icon.webp 原圖為 300×100，從 x=0／100／200 的三格各取 100×100，分別代表 A／B／C，直接使用 WebP sprite，不需 Base64。

連線中顯示旋轉框，成功發光，失敗黃光與驚嘆號。展開顯示未攔截、斷線或連線失敗的引導；Loader 尚未提供握手細節時，不猜測根因，請依 Console／Network 判斷。登入後仍移除 UI、計時器及拖曳事件。
