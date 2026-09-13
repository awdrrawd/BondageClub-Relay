# 架構與遊戲更新維護

## 連線流程

```text
官方遊戲頁 → 官方程式、圖片、音樂
       └→ 插件攔截 window.io
            A → 官方原版 Socket.IO
            B → 官方 WebSocket
            C → 自己的 Pages Worker → 官方 WebSocket
```

C 模式不只握手：登入與後續遊戲通訊都經 Cloudflare，不會登入後切回直連。Worker 不解析或改寫聊天、角色、服裝等遊戲訊息；官方伺服器仍負責驗證、狀態與權限。

## 檔案分工

| 路徑 | 用途 |
| --- | --- |
| src/client.user.js | 攔截 io、A/B/C 模式、連線提示與登入輪詢 |
| src/worker.js | 產生安裝脚本、驗證握手、轉送固定正式／測試服 |
| scripts/build-relay.mjs | 產生首頁、路由、標頭與 dist-relay |
| tests/relay.test.mjs | 網址、安裝防護、路由與登入輪詢測試 |
| docs/connection-test.md | 部署設定、安裝與人工驗證 |

保留 build:relay 與 dist-relay 名稱，現有 Cloudflare 設定無須修改。build 是同一流程的別名。來源下載、固定 SHA、素材探測、鏡像入口及 Service Worker 已移除；舊方案仍可從 Git 歷史查閱。

## 遊戲更新是否要跟著改插件？

一般不需要每月跟著發布。官方頁面自行載入遊戲版本，插件不內建 GameVersion 或官方遊戲程式，中繼也不依服裝或動作資料解讀訊息。

| 官方改動 | 可能受影響的位置 |
| --- | --- |
| 服裝、動作、翻譯、一般介面 | 通常不需改動，仍建議登入及聊天驗證 |
| 官方網域或版本路徑格式 | client 的 include／路徑檢查、Worker Origin 白名單 |
| 正式／測試服位址 | client 環境辨識與 Worker 固定上游，兩邊同步 |
| 不再使用 window.io(...) 連線 | client 攔截位置 |
| Socket.IO／Engine.IO 協議 | Worker 目前限制 EIO=4、WebSocket 及允許的 query |
| Player.MemberNumber、LoginResponse 格式 | 登入後面板隱藏及提示 |
| CSP 或瀏覽器 userscript 執行限制 | 插件注入與 connect-src 是否允許 Relay |

目前版本路徑接受 R131、R132Beta1 等形式，不需因數字增加而改動。未知上游不會強行當作原有正式服中繼，驗證時需看 WS 實際目的地。

遊戲更新後確認：C 模式連自己的 pages.dev、握手 101、登入、聊天、換房，以及短暫斷網後重新連線。插件更新須从部署站 /install.user.js 安裝並重載；只更新 Worker 無須重裝插件，既有連線不保證立刻套用新部署。

## 限制

仍需能載入官方頁面及素材。中繼可能改善網路路徑，但不能修復官方伺服器故障；登入成功實測只代表當時環境。

Worker 限定官方 Origin 與固定上游，不記錄登入或聊天內容。Origin 檢查不是身分驗證，請使用自己部署或信任的中繼。本架構不需要素材儲存，用量仍受 Cloudflare 帳號方案限制。

## Loader 分層

src/client.user.js 是穩定的早期連線核心，暴露版本為 1 的 __BCRelayLoader 給遠端 UI 使用。src/runtime.js 管理面板與登入前輪詢；src/panel.css 使用 Shadow DOM 隔離樣式。src/index.html、src/site.css 是部署站安裝入口。

runtime 或樣式更新不需要重裝；核心改動提高 userscript 版本，由管理器檢查更新。登入後面板及輪詢完全移除，登出不重建。這取代前述舊版僅隱藏面板的行為。
