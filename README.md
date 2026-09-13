# BondageClub Relay

非官方的學習與連線實驗專案：在官方 BC 頁面使用 Cloudflare Pages Worker 中繼 WebSocket。遊戲程式與素材仍由官方提供，不是完整鏡像。

- A：原版直連（預設）；B：WebSocket 直連；C：Cloudflare 中繼。
- C 的握手、登入及後續訊息都經中繼，不只登入階段。
- 面板標題顯示連線狀態；瀏覽器語言為 zh／tw 時使用中文，其餘英文。
- 登入後移除面板與輪詢；重新整理可再次設定。

[安裝與中英說明](https://bondageclub-relay.pages.dev/) · [English](README.en.md)

## 使用 Tampermonkey 安裝

1. 前往 [Tampermonkey 官方網站](https://www.tampermonkey.net/)，選擇自己的瀏覽器，從對應的官方擴充功能商店安裝。
2. 確認 Tampermonkey 已啟用，並允許它在官方 BC 遊戲網站執行。若管理器提示需要「允許使用者指令碼」等權限，依提示完成設定。
3. 開啟 [BC Relay 安裝頁](https://bondageclub-relay.pages.dev/)，按「安裝／更新 Loader」；也可直接開啟 [install.user.js](https://bondageclub-relay.pages.dev/install.user.js)。在 Tampermonkey 確認安裝。
4. 在 Tampermonkey 管理面板確認 **BC Relay Connection Test** 已啟用，且只保留一份。不要直接複製倉庫的 `src/client.user.js`，它是未填入中繼網址的模板。
5. 重新整理或重新開啟官方遊戲頁，點右下角氣球，選 **C · Cloudflare 中繼**，按「套用」並確認重新載入，再登入遊戲。預設 A 是原版直連。

登入後氣球與輪詢會移除，需要重新設定時重新整理頁面。若沒有氣球，先檢查插件是否啟用、網站權限與其他連線插件衝突。

**更新：**面板 JS／CSS 在重新開頁時載入；Loader 核心由 Tampermonkey 檢查更新，也可再次開啟上方安裝連結確認更新。自架者請使用自己的 Relay 站安裝連結。

**只支援 Tampermonkey 方式作為中繼安裝。** 書籤與控制台注入通常晚於官方 Socket 初始化，不能可靠接管連線，因此不提供這兩種載入方式。

## 安裝與開發

從部署站 `/install.user.js` 安裝或更新，不能直接安裝倉庫模板。遠端面板每次開頁載入最新版；早期連線核心由 Tampermonkey 更新檢查處理。

```sh
npm ci
npm run check
```

Cloudflare：組建 `npm test && npm run build:relay`，輸出 `dist-relay`，NODE_VERSION 為 22。`build` 與 `build:relay` 使用同一流程。

- [部署、安裝與排錯](docs/connection-test.md)
- [架構與遊戲更新維護](docs/architecture.md)

不需要官方來源 SHA、R2 或素材 CDN。GitHub CI 執行測試與組建，Dependabot 每月檢查 Actions，不自動合併。

## 使用聲明

僅供學習、研究及連線測試，不保證穩定性、可用性、速度或持續服務。免費額度用盡、平台限制、維護或上游故障可能導致限流、中斷或停止；維護者不承諾加購額度、恢復期限或補償，亦不對相關使用影響或損失負責。使用者自行評估風險，自架者自行管理額度與費用。

只使用自己部署或信任的中繼。程式不記錄登入與聊天內容，但 C 模式的資料會流經中繼。LICENSE 適用本倉庫自有程式，官方及第三方程式保留各自授權。

## 公開負載監看

本站 `/monitor/` 提供彙總用量，不探測遊戲連線。需在 Cloudflare 設定唯讀監看 Secret，[操作說明](docs/monitor.md)。
