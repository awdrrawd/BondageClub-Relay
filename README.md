# BondageClub Relay

非官方的學習與連線實驗專案：在官方 BC 頁面使用 Cloudflare Pages Worker 中繼 WebSocket。遊戲程式與素材仍由官方提供，不是完整鏡像。

- A：原版直連（預設）；B：WebSocket 直連；C：Cloudflare 中繼。
- C 的握手、登入及後續訊息都經中繼，不只登入階段。
- 面板標題顯示連線狀態；瀏覽器語言為 zh／tw 時使用中文，其餘英文。
- 登入後移除面板與輪詢；重新整理可再次設定。

[安裝與中英說明](https://bondageclub-relay.pages.dev/) · [English](README.en.md)

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
