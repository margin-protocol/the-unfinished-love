# 愛的未完成式｜THE UNFINISHED LOVE

> 離婚協議書已經放在桌上。
> 但還沒有人簽名。

《愛的未完成式》的官方介紹網站：一場關於婚姻、選擇與告別的互動敘事。
由 **MARGIN PROTOCOL｜頁邊協定** 製作。

這個 repo 只放八頁的介紹網站。設計討論在 [`margin-protocol/ai-collaboration`](https://github.com/margin-protocol/ai-collaboration)。

## 頁面

| # | 頁面 | 檔案 |
|---|---|---|
| 01 | 首頁 | `index.html` |
| 02 | 故事起點 | `story.html` |
| 03 | 婚姻檔案 | `archive.html` |
| 04 | 關係的可能 | `possibilities.html` |
| 05 | 使用指南 | `guide.html` |
| 06 | 人物登記 | `registration.html` |
| 07 | 試閱檔案 | `preview.html` |
| 08 | 開始故事 | `begin.html` |

## 在自己電腦上預覽

只需要 [Node.js](https://nodejs.org/) 18 以上，**不需要安裝任何套件**。

```bash
node scripts/build.mjs     # 建置到 dist/
node scripts/serve.mjs     # 打開 http://localhost:4173/the-unfinished-love/
```

預覽伺服器會模擬 GitHub Pages 的子路徑，所以在這裡正常，上線後就會正常。

## 要改內容時

| 想改的東西 | 位置 |
|---|---|
| 作品名稱、網址、ChelizAI 連結、官網連結 | `site.config.json` |
| 各頁文案 | `src/pages/*.html` |
| 導覽列、頁尾 | `src/partials/` |
| 顏色、字體、版面 | `src/assets/css/site.css`（最上方的色票變數） |
| 兩張椅子的插畫 | `src/assets/img/two-chairs.svg`（同名檔案直接替換） |
| 社群分享圖 | `src/assets/img/og-image.png`（1200×630） |
| 人物登記的輸出格式 | `src/assets/js/registration.js` 的 `FORMAT` |

尚未確定的網址在 `site.config.json` 留空字串即可，頁面會自動顯示「連結待設定」。

## 檢查與截圖

```bash
node scripts/check.mjs           # 8 種寬度的橫向溢出、JS 錯誤、壞連結、複製與表單功能
node scripts/check.mjs --shots   # 同上，並輸出截圖到 docs/screenshots/
```

需要 Playwright（只用於檢查，網站本身不依賴）。

## 部署

使用 GitHub Pages，網址預定為 `https://margin-protocol.github.io/the-unfinished-love/`。

部署流程**只能手動觸發**，避免未經確認就上線：

1. Settings → Pages → Source 選「GitHub Actions」（只需設定一次）
2. Actions → **Deploy to GitHub Pages** → Run workflow

## 公開 repo 注意事項

這是公開 repo。請不要放入 ChelizAI 的隱藏數值、內部提示詞、正則規則、未公開設定或任何個人資料。

---

© MARGIN PROTOCOL｜頁邊協定
