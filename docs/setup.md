# 新手設定與部署

[首頁](../README.md) · [架構](architecture.md)

## 目前已完成

- `.gitignore`：忽略手動來源、下載快取、組建輸出及工具暫存。
- 固定 SHA 下載、核對來源、篩選部署檔案。
- 官方連線入口與陌生域名判定改為同站中繼，強制 WebSocket。
- 獨立 `_worker.js`、`_routes.json`；不借用 Lite 網站的中繼。
- 素材 Service Worker：攔截本機遊戲媒體路徑，瀏覽器直接請求外部素材站。
- 測試環境提示、CDN 檢查、版本檢查、缺少素材設定時阻止遊戲啟動。

## 仍未完成的外部條件

截至本次本機檢查：

1. 你指定的 SHA `4f8006001a0432e4ff7058d2b330084624a94217` 是 **R132Beta1**。若要登入正式服，需選定正式版提交；不能把版本字串改成 R131 冒充正式版。
2. Mirror 在這個 SHA 沒有圖片和音樂，所以 raw.githubusercontent.com / jsDelivr 指向這個倉庫的圖片會 404。
3. 已測試官方 elementfx / bondage-europe 的 R131 Logo：有圖片但沒有 `Access-Control-Allow-Origin`。R132 的 elementfx 素材路徑也未找到。這些測試不表示已全面確認所有官方來源。
4. 尚未取得可用、匹配版本且支援 CORS 的素材 CDN，沒有驗證完整遊戲登入或角色繪製。

**沒有素材站時可部署設定提示頁，但不能當作遊戲站。** 不會自動改用圖片代理，因為圖片代理會增加 Cloudflare Worker 請求，改變免費成本模型。

## 你現在要決定什麼

### A. 使用正式服還是測試服

- 想用原本正式帳號：已查到 Mirror 歷史提交 `93bef4ebc66ae7b8ef94ca10e8b158ac0d6b1b2a` 的 GameVersion 是 R131，與本次讀到的官方正式站版本字串一致。這是候選版本，尚未驗證整套正式服相容性。確認要試正式服時，將 upstream-version.txt 改為此 SHA、expectedGameVersion/assetGameVersion 改為 R131、environment 改為 PROD，並使用相符素材；不要只改 environment。
- 只測試 Beta：可保留現有 SHA 和 `TEST`，但仍需 R132Beta1 對應素材；這不是正式帳號環境。

Cloudflare 的 NODE_VERSION、bcOrigin 或把 GameVersion 改名都不能解決程式版本不符。

### B. 提供素材來源，或先停在工具準備完成

素材來源需包含完整目錄結構並允許跨來源讀取。若你有現成 CDN，提供它指向 `BondageClub/` 那一層的 HTTPS 網址，不需要密碼或 Token。

可詢問來源維護者是否有允許外部客戶端使用的素材端點；需要 `Access-Control-Allow-Origin: *`（不帶認證），且提供正確 MIME。若音訊支援 Range，應保留 206 / Content-Range 並提供必要 CORS 暴露標頭。

目前 `assetBase` 留空是刻意的，不是忘記填。不要填 GitHub 的 tree/blob 網頁，也不要使用不匹配的 R131 素材配 R132Beta1。

## 取得來源之後如何設定

開啟 `relay.config.json`：

| 欄位 | 說明 |
| --- | --- |
| environment | TEST 或 PROD；PROD 禁止 Beta/Alpha |
| expectedGameVersion | 固定 SHA 中 Scripts/Game.js 的真實版本 |
| assetGameVersion | 必須與 expectedGameVersion 相同 |
| assetBase | 素材根網址，以 https:// 開始、/ 結尾 |
| assetProbes | 真實存在的圖片與音訊路徑；目前為待核實的測試候選 |
| bcOrigin | 中繼向上游握手使用的 Origin；先保留預設 |

CDN 檢查也讀取 `Scripts/Game.js`，用來比對版本。若你的素材 CDN 不提供這個檔案，必須先調整版本驗證設計，不能直接跳過檢查。

新專案資料夾空白處右鍵 → 在終端機中開啟，執行：

```powershell
npm ci
npm test
npm run build
npm run check:assets
```

`npm ci` 安裝開發依賴；`build` 首次需要連網下載固定 SHA，之後核對快取。`check:assets` 在 CDN 空白、版本不符或 CORS 不符時失敗是預期行為。只有全部通過才進入遊戲部署驗收。

## 本機開啟（需要中繼時）

現在可以執行 `npm run preview:entry`，在瀏覽器開 `http://127.0.0.1:4175` 查看入口與缺少素材時的提示。這個命令不提供遊戲中繼，Ctrl+C 停止。

完整中繼預覽需要 Cloudflare Wrangler。可先使用 Cloudflare Pages 預覽部署；不要雙擊 game.html。若安裝 Wrangler，使用相容的固定版本，執行 `wrangler pages dev dist`，再開它輸出的 localhost 網址。

## 推送到 GitHub

1. GitHub Desktop 切到 **BondageClub-Relay**。
2. Changes 應是 scripts、web、templates、tests、docs、package 檔案與 SHA 記錄，不應有 upstream / .cache / dist。
3. Summary 填 `Prepare full client relay deployment`。
4. Commit，再 Push origin。這次代理程式沒有替你提交或推送。

## Cloudflare Pages 設定

1. Workers & Pages → 建立 Pages → 連接 GitHub。
2. 選擇 **BondageClub-Relay**。若找不到，到 GitHub 的 Cloudflare GitHub App 存取設定允許這個倉庫。
3. Project name 使用 `bondageclub-relay` 或其他未使用名稱。
4. Production branch 選你剛推送的分支；不是照抄 Lite 的分支名。
5. Framework preset：None。
6. Build command：`npm run check`。會測試、組建並驗證 CDN；CDN 未就緒時故意不部署遊戲。
7. Build output directory：`dist`。
8. Root directory：倉庫根目錄，留空。
9. 環境變數 `NODE_VERSION=22`。不需要帳號密碼、資料庫、API Token 或購買網域。
10. Save and Deploy，開啟配發的 pages.dev 網址。

若只想看目前的設定提示頁，可暫用 `npm run build`，但這不代表遊戲已可用。不要將 BUILD 成功當成 CDN/正式服驗收成功。

## 驗收

- 先不裝插件。入口顯示版本和 TEST/PROD。
- 點進入，素材與 Canvas 檢查通過後才註冊媒體 Service Worker、開 game.html。
- F12 → Network → WS：同站 socket.io 應為 101；測試登入後確認伺服器環境。
- 素材請求應由 Service Worker 處理，外部 fetch 前往 CDN，不進入 Cloudflare 的 socket 中繼。
- 驗證人物、衣櫃、姿勢、道具互動、音樂、聊天室、BEEP、房間管理與重連；插件需逐一檢查新網域相容性。
- 同一帳號不要同時在兩個客戶端登入，以免互踢被誤認為中繼問題。
- F12 → Application → Service Workers 可檢查/取消註冊本專案的媒體路由；更新後入口會更新路由版本。

## 更新上游

只修改明確核對過的 SHA 和版本設定，再執行 `npm run check`。腳本不會自動跟隨 master，也不會覆寫你手動保存的 upstream。若上游函式不再匹配，組建停止，需重新檢查修改位置。

平台文件：[Pages 進階模式](https://developers.cloudflare.com/pages/functions/advanced-mode/) · [免費限制](https://developers.cloudflare.com/pages/platform/limits/)。
