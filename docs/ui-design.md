# 入口頁設計

採用沉穩深色控制台：官方入口常駐、通道卡片為主、Relay 安裝在側欄。手機改為單欄；提供中英文切換並儲存語言偏好。自訂備援設定與完整說明可展開。

## 公開設計參考

- [shadcn/ui](https://github.com/shadcn-ui/ui)：元件層級、按鈕與表單的清楚分工。
- [Tremor](https://github.com/tremorlabs/tremor)：狀態摘要與儀表板資訊排列。
- [Tabler](https://github.com/tabler/tabler)：深色控制台、卡片與響應式版面。

參考視覺與資訊架構，以原生 HTML/CSS/JavaScript 自行實作，未引入上述框架或複製其元件程式碼。色彩、語言與互動分別位於 `src/site.css`、`src/site-i18n.js`、`src/game-links.js`。

## 狀態語意

入口總數與雙重檢查通過數分開顯示。遊戲頁為伺服器檢查，本機素材為瀏覽器實測；失敗或逾時只表示未確認，不推論登入一定失敗。檢查通過也不保證遊戲 Socket 可連線。清單版本來自清單本身，各卡片另外顯示官方導向後的版本。

## BC Lite

[BC Lite](https://bondageclub-lite.pages.dev/) 以獨立文字客戶端區塊提供，不計入官方遊戲通道、不套用官方遊戲頁檢查。說明依據 [Lite 倉庫](https://github.com/awdrrawd/BondageClub-Lite) README：房間、聊天、私訊與好友；無人物繪圖、衣櫃或完整插件功能。展開說明提供與 Relay 的差異，以及登入流量與本機紀錄的處理方式。
