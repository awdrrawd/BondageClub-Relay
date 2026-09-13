# BondageClub Relay

在官方 Bondage Club 頁面使用 Cloudflare Pages Worker 中繼遊戲連線。遊戲程式與素材仍由官方提供，本倉庫不是遊戲鏡像。

- A：原版直連；B：WebSocket 直連；C：Cloudflare WebSocket 中繼。
- C 模式的登入與後續遊戲訊息都經中繼，不只握手。
- 預設 A，切換會重新載入；登入後隱藏面板。
- 從部署站的 `/install.user.js` 安裝與更新，不能直接安裝倉庫模板。

## 部署

```sh
npm ci
npm run check
```

現有 Cloudflare 設定可沿用：組建 `npm test && npm run build:relay`、輸出 `dist-relay`、NODE_VERSION 為 22。`npm run build` 與 `build:relay` 使用同一流程。

- [部署、安裝與排錯](docs/connection-test.md)
- [架構與遊戲更新維護](docs/architecture.md)
- [English](README.en.md)

不需要官方來源 SHA、R2 或素材 CDN。舊鏡像建置流程已移除；本機殘留的 upstream、.cache、dist 不參與建置，也不應提交。

LICENSE 僅適用本倉庫自有程式，官方遊戲及第三方程式保留各自授權。

## Loader 與自動化

0.2.0 保留最早攔截 Socket 的 Loader，遠端 runtime.js 負責面板，每次開頁載入最新版。核心更新由 Tampermonkey 的自動更新機制處理，需要提高版本號。登入後移除 UI 及輪詢，詳見[更新與自動化操作](docs/connection-test.md#loader-更新與自動化)。
