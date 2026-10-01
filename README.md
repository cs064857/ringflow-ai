# RingFlow AI - iPhone 鈴聲極速製作工坊

> 專為 iPhone 打造的 AI 鈴聲製作器，100% 部署於 Cloudflare 全家桶（Pages + Workers），基於 PI Agent 多模態原生音訊分析與純瀏覽器 Web Audio API 邊緣運算。

---

## 🌟 核心特色

1. **環境變數驅動的原生多模態音訊分析（免 Whisper/ASR）**
   - 透過 `.env` 自由配置原生支援音訊的多模態 LLM（如 Google Gemini 2.0 Flash / 1.5 Flash、OpenAI 等）。
   - **AI 大模型直接「聽」真實音訊**，精準定位副歌爆發進入點、歌詞與節奏特徵，完全無需本機安裝或中轉 Whisper ASR。
2. **Cloudflare 全家桶 100% 邊緣託管**
   - 採用 **Cloudflare Pages** 靜態加速與 **Pages Functions (Workers)** API，零後端伺服器負載，完全覆蓋於 Cloudflare 免費額度。
3. **純瀏覽器端 Web Audio 引擎（秒級處理）**
   - 音訊解碼、波形繪製、裁切、淡入（1.0s）、淡出（2.0s）、音量峰值正規化全部在前端完成。
   - 0.1 秒內完成轉碼與導出，極致保護隱私與節省流量。
4. **PI Agent 智慧副歌顧問**
   - 內建 AI 對話視窗，一鍵分析歌曲結構。
   - 自動定位歌曲中所有副歌段落，生成結構化卡片，支援「🎧 試聽片段」與「🚩 一鍵設為鈴聲區間」。
5. **極簡時間戳選擇（直接點頭跟尾）**
   - 支援「🚩 設為目前起點」與「🏁 設為目前終點」，邊聽邊點。
   - 提供「⚡ 鎖定黃金 29.5 秒」功能，自動確保符合 iPhone < 40 秒之來電規範。
   - 支援 `[-1s]` `[-0.1s]` `[+0.1s]` `[+1s]` 精細步進微調。
6. **iOS 手機深度相容（Mobile-First）**
   - 適配 iPhone 動態島（Dynamic Island）、瀏海與底部 Home Bar（Safe Area Insets）。
   - 支援 iOS 原生 **Web Share API**，直接呼叫 iPhone 分享表單「儲存到檔案」直達 GarageBand。
   - 同時支援 iPad 平板與電腦端桌面雙欄排版。

---

## ⚙️ 環境變數配置 (.env)

專案根目錄已提供 `.env` 設定檔，支援任何具備**原生音訊理解能力（Native Audio Understanding）**的多模態模型：

```env
# 選擇提供商：google / openai / custom
PI_AGENT_PROVIDER=google

# 支援原生音訊分析的模型名稱 (免 Whisper ASR)
# 推薦：gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, gpt-4o-audio-preview
PI_AGENT_MODEL=gemini-2.0-flash

# API 金鑰
PI_AGENT_API_KEY=your_gemini_or_openai_api_key_here

# 自定義端點 (若使用中繼/代理或Cloudflare AI可修改，預設為官方端點)
PI_AGENT_BASE_URL=https://generativelanguage.googleapis.com

# 伺服器連接埠
PORT=3005
```

---

## 🚀 本地開發與 Cloudflare 部署

### 1. 本地啟動開發伺服器
```bash
npm run dev
```
瀏覽器開啟 `http://localhost:3005` 即可預覽。

### 2. 靜態編譯打包
```bash
npm run build
```

### 3. 一鍵部署至 Cloudflare Pages
```bash
npx wrangler pages deploy dist
```
*若在 Cloudflare Pages 上運行原生多模態模型，請至 Cloudflare Dashboard > Pages 專案 > Settings > Environment variables 中填入 `PI_AGENT_MODEL` 與 `PI_AGENT_API_KEY` 即可。*
