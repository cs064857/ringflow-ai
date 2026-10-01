# iPhone 鈴聲製作器 (RingFlow AI) - 專案實施計畫

## 一、專案目標與願景
打造一套 100% 部署於 Cloudflare 全家桶（Pages + Workers）的現代化 Web 應用。
具備 PI Agent 智慧副歌辨識、雙軌音訊輸入（YouTube / 本地上傳）、極簡時間點標定、純瀏覽器端毫秒級音訊處理與 iPhone 鈴聲一鍵分享/導出功能。
特別針對 **iOS 手機端（iPhone Safari）進行深度相容性與人體工學體驗優化**，同時完美適配 iPad 平板與桌面端。

---

## 二、多端響應式與 iOS 深度相容性規範 (Mobile-First / iOS Priority)

### 1. iOS Safari 特殊限制與解決方案
- **Web Audio API 自動播放限制**：
  - iOS Safari 嚴格要求 AudioContext 必須由「明確的使用者手勢（User Touch/Click）」解鎖。
  - 設計：任何點擊（播放、載入、上傳）自動呼叫 `audioCtx.resume()`，並設計全域解鎖感知機制，避免在 iOS 上無聲或解碼失敗。
- **視窗與高度適配 (Viewport & Safe Area)**：
  - 採用 `100dvh`（Dynamic Viewport Height）與 `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`。
  - 頂部避開動態島（Dynamic Island）與瀏海，底部避開 Home Bar 手勢指示線與 Safari 下方導航欄。
- **觸控人體工學 (Touch Targets)**：
  - 核心操作按鈕（播放、設為起點 🚩、設為終點 🏁、一鍵 29.5 秒、分享鈴聲）最小觸控區域不低於 48x48px，按鈕間距合理，防止誤觸。
  - 針對波形圖支援觸控拖曳滑動與點擊，加入 `touch-action: pan-y` 避免干擾頁面正常捲動。
- **iOS 檔案系統與分享整合 (Web Share API)**：
  - 利用 `navigator.share({ files: [ringtoneFile], title, text })` 原生叫起 iOS 分享表單。
  - 支援「儲存到檔案」直達 GarageBand 專案路徑，並提供互動式視覺步驟引導（GarageBand 3 步設為鈴聲教學）。
  - 對不支援 Web Share 的環境（如電腦端）無縫降級為直接下載 `.m4r` 檔案。

---

## 三、技術架構與 Cloudflare 全家桶選型

### 1. 架構拓撲
- **靜態託管與前端應用**：Cloudflare Pages（Vite + TypeScript + Tailwind CSS / Vanilla Reactivity）。
- **無伺服器後端 API**：Cloudflare Workers / Pages Functions (`/api/`)。
- **AI 驅動核心**：整合 PI Agent 庫 (`@oh-my-pi/pi-agent-core` 或輕量級 Agent Loop)。
- **音訊運算**：純前端 Web Audio API (AudioContext, OfflineAudioContext)，無須後端 ffmpeg 負載，零伺服器頻寬瓶頸。
- **美術資產**：已調用 `image-gen` 技能生成高質感 3D 擬物 Glassmorphism App Icon 與 Dark Luxury Hero 背景。

---

## 四、核心模組設計

### 模組 1：雙軌音訊輸入與波形解析
- **本地檔案上傳**：`<input type="file" accept="audio/*">`，支援 MP3、WAV、M4A、AAC、FLAC 等，前端 `FileReader.readAsArrayBuffer` 直接餵入 `AudioContext.decodeAudioData`，秒級渲染波形。
- **YouTube 網址解析**：前端輸入 YouTube 網址，呼叫 Worker `/api/resolve-youtube` 取得音訊串流或元數據，載入前端播放器。

### 模組 2：互動式波形時間軸與極簡選取
- Canvas 繪製動態波形圖與高亮播放進度。
- **極簡頭尾選取機制**：
  - 邊播放邊按「設為起點 🚩」與「設為終點 🏁」。
  - 「⚡ 鎖定黃金 29.5 秒」功能：點選起點後，自動鎖定合規的 29.5 秒長度。
  - 提供 `[-1s]` `[-0.1s]` `[+0.1s]` `[+1s]` 精確微調按鈕。
  - 即時合規檢測（綠燈：≤ 30s 合規；紅燈：> 30s 提醒）。

### 模組 3：PI Agent 智慧副歌辨識與導航
- 對話窗口介面：
  - 支援文字對話詢問「副歌在哪？」或點擊快捷按鈕「🎵 一鍵分析所有副歌」。
  - Agent 透過工具呼叫分析歌曲結構，回傳結構化的副歌片段資料：
    - 副歌名、起始秒數、結束秒數、歌詞/旋律特徵、推薦指數。
  - 前端將結果渲染為互動卡片：
    - 點選「試聽」：播放器立刻跳轉該段試聽。
    - 點選「套用為鈴聲」：時間軸起訖點立刻精準對齊該段副歌！

### 模組 4：純前端無損音訊處理與多格式輸出
- 點擊「製作鈴聲」後，透過 `OfflineAudioContext` 渲染音訊採樣：
  - 提取指定起止時間的 PCM 數據。
  - 套用淡入（預設 1.0 秒）與淡出（預設 2.0 秒）平滑增益曲線。
  - 執行峰值正規化（Peak Normalization），確保響度飽滿不破音。
  - 編碼轉碼並輸出：
    - `ringtone.m4r`（供電腦 iTunes/Finder 拖曳）。
    - `ringtone.m4a`（供 iPhone GarageBand 匯入使用）。
    - `ringtone.wav`（最高相容性無失真格式）。

### 模組 5：iOS 專屬分享與指引模態框
- 點擊「📲 分享到 iPhone 鈴聲」按鈕：
  - 調用 `navigator.share`，將產生的鈴聲檔案傳遞給 iOS 原生分享選單。
  - 彈出圖文步驟指南（GarageBand 3 步轉鈴聲說明），隨時可查閱。

---

## 五、實施路線圖 (Milestones)

- [x] **階段 0：視覺素材就緒**：利用 `image-gen` 產出 App Icon 與主題背景。
- [ ] **階段 1：建立專案基底與 Cloudflare 設定**：
  - 初始化 Vite 前端專案與 Wrangler 配置。
  - 建立 Apple 風格響應式 Layout（適配 iPhone/iPad/PC，Safe Area Insets）。
- [ ] **階段 2：前端音訊處理引擎實作**：
  - 實作 Web Audio API 播放器、視覺波形 Canvas、起點/終點快速標記、淡入淡出與 AAC/WAV 匯出。
- [ ] **階段 3：PI Agent 核心與 Cloudflare Worker 實作**：
  - 實作 Worker API，整合 PI Agent 歌曲結構/副歌分析工具。
  - 實作前端 AI 對話窗與「副歌卡片一鍵跳轉」聯動機制。
- [ ] **階段 4：iOS 專案適配與真機操作體驗驗證**：
  - 驗證 Web Share API、觸控互動、GarageBand 指引。
  - 本地建置預覽驗證與 Cloudflare 部署設定檢查。
