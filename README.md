# BondageClub Relay

**目前優先測試：[官方頁面 A/B/C 連線比較](docs/connection-test.md)**。此模式用 `npm run build:relay`、輸出 `dist-relay`，不需要素材 CDN。下方完整鏡像模式仍保留，尚未就緒。

獨立的完整 BC 客戶端試驗站。沿用官方遊戲程式，透過 Cloudflare Pages Worker 中繼 Socket.IO；圖片、音樂由瀏覽器向外部素材站取得。不修改 BondageClub-Lite。

**目前：部署工具已建立，素材站尚未就緒，不能當作可登入遊戲站。** 指定來源是 `R132Beta1`，因此預設 TEST，不能直接切換成 PROD。

- [新手設定與 Cloudflare 部署](docs/setup.md)
- [架構與限制](docs/architecture.md)
- [English](README.en.md)

```sh
npm ci
npm test
npm run build
npm run check:assets
```

build 下載 `upstream-version.txt` 的固定提交到 `.cache`，產生 `dist`。不使用或修改手動放入 `upstream` 的檔案，不需要將幾萬張素材提交到倉庫。

本倉庫 LICENSE 僅適用自有部署程式；官方 BC 程式與各第三方檔案保留原作者的權利、授權和使用條件，並非因此改授權為 MIT。
