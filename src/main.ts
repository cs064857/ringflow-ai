import { AudioEngine } from "./audio/engine";
import { WaveformViewer } from "./audio/waveform";
import { SongChorusAgent, type ChorusSegment } from "./agent/piAgent";

const audioEngine = new AudioEngine();
const agent = new SongChorusAgent();
let waveformViewer: WaveformViewer | null = null;
let currentSongTitle = "試聽錄音檔";
let currentAudioFormat = "MP3";
let currentFileSizeStr = "3.2 MB";
let selectedDownloadFormat = "m4a";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
}

function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <!-- 頂部頂級導航列 (極簡溫暖白底，移除多餘元素) -->
    <header class="w-full px-6 py-4 border-b border-[#ece5da] bg-white/90 backdrop-blur-xl sticky top-0 z-40">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <!-- Logo 與標題 (橘色音波 + RINGFLOW) -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 flex items-center justify-center shadow-md shadow-orange-500/20">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 10v4" />
              <path d="M6 6v12" />
              <path d="M10 3v18" />
              <path d="M14 8v8" />
              <path d="M18 5v14" />
              <path d="M22 10v4" />
            </svg>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-black text-xl tracking-wider text-slate-800">
              RINGFLOW
            </span>
          </div>
        </div>

        <!-- 鈴聲教學快速入口按鈕 -->
        <div class="flex items-center gap-2">
          <button id="btn-open-guide" class="rf-btn-secondary text-xs px-3.5 py-1.5 font-medium shadow-none hover:shadow-sm">
            <span>📘 鈴聲匯入教學</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 主工作區 (左側語音處理與波形 + 右側 AI Agent 對話助手) -->
    <main class="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- 左側/音訊處理核心區 (佔 7 欄) -->
      <section class="lg:col-span-7 flex flex-col gap-5">
        
        <!-- 1. 語音檔案處理卡片 -->
        <div class="rf-panel p-5 sm:p-6 bg-white">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-sm shadow-orange-400/30">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-800 leading-tight">語音檔案處理</h2>
                <p class="text-xs text-slate-400 mt-0.5">支援多種格式（MP3、WAV、M4A、FLAC、AAC）</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span id="badge-file-no" class="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono font-medium">
                No. 3
              </span>
              <span id="badge-file-status" class="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                等待處理
              </span>
            </div>
          </div>

          <!-- 拖曳或點選上傳本地檔案區域 -->
          <div
            id="drop-zone"
            class="border border-dashed border-[#e6ded3] hover:border-orange-400/80 rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all bg-[#faf8f5]/60 hover:bg-[#fffcf9] group flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <input id="input-file" type="file" accept="audio/*" class="hidden" />
            
            <div class="flex items-center gap-3 text-left">
              <div class="w-11 h-11 rounded-full bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                  點擊或拖曳音訊檔至此 <span class="text-xs text-slate-400 font-normal">（MP3, WAV, M4A, FLAC, AAC）</span>
                </p>
                <p class="text-xs text-slate-400 mt-0.5">支援檔案上傳 · Web Audio 錄製 · URL 連結匯入</p>
              </div>
            </div>

            <button type="button" class="rf-btn-secondary px-4 py-2 text-xs font-semibold whitespace-nowrap pointer-events-none">
              <span>📁 選擇檔案</span>
            </button>
          </div>

          <!-- YouTube 或網址快速解析列 (收合簡化) -->
          <div class="mt-3.5 flex gap-2">
            <input
              id="input-youtube"
              type="text"
              placeholder="貼上 YouTube 影片網址或音訊串流連結 (例如 https://youtu.be/...)"
              class="flex-1 bg-white border border-[#e8e2d8] rounded-xl px-3.5 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 font-mono transition-colors"
            />
            <button id="btn-load-youtube" class="rf-btn-secondary text-xs px-3.5 py-2 whitespace-nowrap font-medium">
              <span>解析載入</span>
            </button>
          </div>
        </div>

        <!-- 2. 試聽錄音檔與波形雕刻控制台 -->
        <div class="rf-panel p-5 sm:p-6 bg-white">
          
          <!-- 頂部資訊列：播放按鈕、標題、時間碼 -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <!-- 亮橘色圓形播放按鈕 -->
              <button 
                id="btn-play-pause" 
                class="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform"
                title="播放/暫停"
              >
                <span id="play-icon" class="text-lg ml-0.5">▶</span>
              </button>

              <div>
                <div class="flex items-center gap-2">
                  <h3 id="song-title-display" class="font-bold text-base text-slate-800 cursor-pointer hover:text-orange-600 transition-colors" title="點擊修改名稱">
                    試聽錄音檔
                  </h3>
                  <button id="btn-edit-title" class="text-xs text-slate-400 hover:text-orange-600" title="修改名稱">
                    ✏️
                  </button>
                </div>
                <p id="song-meta-display" class="text-xs text-slate-400 font-mono mt-0.5">
                  MP3 · 3.2 MB · 04:02.7
                </p>
              </div>
            </div>

            <!-- 時間碼顯示器 -->
            <div class="text-right">
              <div class="text-[10px] tracking-wider uppercase font-mono text-slate-400 font-semibold">PLAYHEAD TIMECODE</div>
              <div id="playback-time" class="font-mono text-base sm:text-lg font-black text-amber-600 tracking-tight">
                01:04.0 <span class="text-slate-400 font-normal text-sm">/ 04:02.7</span>
              </div>
            </div>
          </div>

          <!-- Canvas 專業高動態波形圖 -->
          <div class="relative w-full h-36 sm:h-40 bg-[#faf8f5] rounded-2xl border border-[#ede7df] overflow-hidden mb-5">
            <canvas id="waveform-canvas" class="w-full h-full cursor-crosshair touch-none"></canvas>
            <div id="loading-overlay" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center text-xs text-orange-600 font-medium hidden">
              <div class="flex items-center gap-2.5">
                <span class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                <span class="font-mono tracking-wide font-semibold">Web Audio 正在解碼波形...</span>
              </div>
            </div>
          </div>

          <!-- 3. 三欄式極簡時間戳控制台 (起點 🚩 / 終點 🏁 / 持續時間) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
            <!-- 起點控制 -->
            <div class="rf-card p-3.5 border-[#eee7de] bg-[#fdfcfb]">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-red-500 flex items-center gap-1.5">
                  ▶ START 起點
                </span>
                <button id="btn-set-start" class="text-[10px] bg-orange-100/80 text-orange-700 px-2 py-0.5 rounded font-mono font-medium hover:bg-orange-200/80 transition-colors">
                  設為目前
                </button>
              </div>
              <div id="text-start-time" class="font-mono text-lg font-black text-slate-800 mb-2">00:54.0</div>
              <div class="flex gap-1">
                <button class="rf-step-btn flex-1" data-action="start-dec-1">-1s</button>
                <button class="rf-step-btn flex-1" data-action="start-dec-01">-0.1s</button>
                <button class="rf-step-btn flex-1" data-action="start-inc-01">+0.1s</button>
                <button class="rf-step-btn flex-1" data-action="start-inc-1">+1s</button>
              </div>
            </div>

            <!-- 終點控制 -->
            <div class="rf-card p-3.5 border-[#eee7de] bg-[#fdfcfb]">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  ◆ END 終點
                </span>
                <button id="btn-set-end" class="text-[10px] bg-orange-100/80 text-orange-700 px-2 py-0.5 rounded font-mono font-medium hover:bg-orange-200/80 transition-colors">
                  設為目前
                </button>
              </div>
              <div id="text-end-time" class="font-mono text-lg font-black text-slate-800 mb-2">01:24.3</div>
              <div class="flex gap-1">
                <button class="rf-step-btn flex-1" data-action="end-dec-1">-1s</button>
                <button class="rf-step-btn flex-1" data-action="end-dec-01">-0.1s</button>
                <button class="rf-step-btn flex-1" data-action="end-inc-01">+0.1s</button>
                <button class="rf-step-btn flex-1" data-action="end-inc-1">+1s</button>
              </div>
            </div>

            <!-- 持續時間與合規狀態 -->
            <div class="rf-card p-3.5 border-[#eee7de] bg-[#fdfcfb] flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500">持續時間</span>
                <span id="badge-legal" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  ✓ 符合需求
                </span>
              </div>
              <div class="flex items-baseline justify-between mt-1">
                <div id="text-duration-len" class="font-mono text-2xl font-black text-orange-600">30.3 秒</div>
                <button id="btn-mark-important" class="text-[11px] text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full font-medium transition-colors">
                  + 標記重要點
                </button>
              </div>
              <div class="flex items-center justify-between pt-1.5 mt-1 border-t border-[#f2ede6] text-[11px] text-slate-500 font-mono">
                <span class="flex items-center gap-1 text-amber-600 font-medium">⚡ 標記進度</span>
                <button id="btn-lock-golden" class="text-slate-600 hover:text-orange-600 font-bold">29.5s</button>
              </div>
            </div>
          </div>

          <!-- 4. 操作與下載列 -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#f2ede6]">
            <!-- 分享到 iPhone 按鈕 -->
            <button id="btn-share-ios" class="rf-btn-orange flex-1 py-3 px-5 text-sm font-bold shadow-md shadow-orange-500/20">
              <span class="text-base">🎛️</span>
              <span>分享到 iPhone 轉錄（GarageBand 專用）</span>
            </button>

            <!-- 下載組合按鈕 -->
            <div class="flex items-center gap-1">
              <button id="btn-download-m4a" class="rf-btn-secondary py-3 px-4 text-xs font-bold rounded-r-none border-r-0">
                <span>📥 下載</span>
              </button>
              <div class="relative">
                <select id="select-download-format" class="rf-btn-secondary py-3 px-2 text-xs font-bold rounded-l-none appearance-none pr-6 cursor-pointer bg-white">
                  <option value="m4a" selected>.m4a</option>
                  <option value="m4r">.m4r</option>
                  <option value="wav">.wav</option>
                </select>
                <span class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      <!-- 右側：AI Agent 智能對話助手 (佔 5 欄) -->
      <section class="lg:col-span-5 flex flex-col gap-4">
        <div class="rf-panel p-5 sm:p-6 bg-white flex flex-col h-[640px]">
          
          <!-- Agent 頂部標題列 -->
          <div class="flex items-center justify-between pb-3.5 border-b border-[#f0eae1] mb-3">
            <div class="flex items-center gap-3">
              <!-- 黑色機器人圓形圖標 -->
              <div class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <line x1="8" y1="16" x2="8.01" y2="16" stroke-width="3" stroke-linecap="round" />
                  <line x1="16" y1="16" x2="16.01" y2="16" stroke-width="3" stroke-linecap="round" />
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-slate-800">AI Agent 智能對話助手</h3>
                  <span class="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    在線
                  </span>
                </div>
                <p class="text-[11px] text-slate-400">基於最新模型，提供專業的語音內容分析與處理建議</p>
              </div>
            </div>
            
            <button id="btn-quick-analyze" class="rf-btn-secondary text-[11px] px-3 py-1.5 font-medium shadow-none hover:shadow-sm">
              <span>⚙️ 一般分析預設</span>
            </button>
          </div>

          <!-- 對話與訊息滾動區 -->
          <div id="chat-container" class="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <!-- 訊息由 JS 動態生成 -->
          </div>

          <!-- 底部 AI 輸入列 -->
          <form id="chat-form" class="mt-3 pt-3 border-t border-[#f0eae1] flex items-center gap-2">
            <div class="relative flex-1 flex items-center">
              <span class="absolute left-3.5 text-amber-500 text-sm select-none">✨</span>
              <input
                id="chat-input"
                type="text"
                maxlength="2000"
                placeholder="輸入 AI 指令，例如：「幫我分析這段語音的重點」、「生成逐字稿」或「摘要內容」"
                class="w-full bg-[#faf8f5] border border-[#e8e2d8] rounded-full pl-9 pr-14 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 font-medium transition-colors"
              />
              <span id="char-counter" class="absolute right-3.5 text-[10px] text-slate-400 font-mono select-none">0/2000</span>
            </div>
            
            <button type="submit" class="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 active:scale-95 transition-transform" title="發送指令">
              <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </section>

    </main>

    <!-- iOS GarageBand 3 步免電腦指引 (Modal) -->
    <div id="modal-guide" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 hidden">
      <div class="bg-white max-w-md w-full p-6 rounded-2xl border border-[#ede7df] shadow-2xl">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#f2ede6]">
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>📲 iPhone 免電腦設定鈴聲教學</span>
          </h3>
          <button id="btn-close-guide" class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            ✕
          </button>
        </div>

        <div class="space-y-4 text-xs text-slate-600 leading-relaxed">
          <div class="flex gap-3.5 items-start">
            <span class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold font-mono flex items-center justify-center shrink-0">1</span>
            <p>點擊「<strong>分享到 iPhone 轉錄</strong>」，在 iOS 原生分享選單中點選「<strong>儲存到檔案</strong>」。</p>
          </div>

          <div class="flex gap-3.5 items-start">
            <span class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold font-mono flex items-center justify-center shrink-0">2</span>
            <div>
              <p>打開 iPhone 內建的 <strong>GarageBand（庫樂隊）</strong>：</p>
              <ul class="list-disc list-inside text-slate-500 mt-1.5 space-y-1 font-mono">
                <li>新建「錄音機」軌道，點左上角切換為<strong>多軌檢視</strong></li>
                <li>點右上角「+」將小節設為 30 秒（防止音訊被截斷）</li>
                <li>點右上角<strong>套索（Loops）</strong>>「檔案」> 拖曳音訊至音軌</li>
              </ul>
            </div>
          </div>

          <div class="flex gap-3.5 items-start">
            <span class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold font-mono flex items-center justify-center shrink-0">3</span>
            <p>點左上角「▼」返回「我的樂曲」，<strong>長按該專案</strong> > 點選「<strong>分享</strong>」> 選擇「<strong>鈴聲</strong>」輸出，即可一鍵套用為來電鈴聲！</p>
          </div>
        </div>

        <div class="mt-6 pt-3 border-t border-[#f2ede6] text-center">
          <button id="btn-guide-confirm" class="rf-btn-orange w-full py-2.5 text-xs font-bold">
            <span>我學會了，開始製作</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderChatMessages() {
  const container = document.getElementById("chat-container");
  if (!container) return;

  const messages = agent.getMessages();
  container.innerHTML = "";

  messages.forEach((msg) => {
    const isUser = msg.role === "user";
    const bubble = document.createElement("div");
    bubble.className = `flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} items-start`;

    //機器人頭像
    if (!isUser) {
      const avatar = document.createElement("div");
      avatar.className = "w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5";
      avatar.innerHTML = `
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
        </svg>
      `;
      bubble.appendChild(avatar);
    }

    const contentWrapper = document.createElement("div");
    contentWrapper.className = `flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[88%]`;

    //對話氣泡主體
    const textDiv = document.createElement("div");
    if (isUser) {
      textDiv.className = "bg-[#fef3c7] text-slate-800 p-3 rounded-2xl rounded-tr-none border border-amber-200/60 leading-relaxed shadow-xs";
    } else {
      textDiv.className = "bg-white text-slate-700 p-3.5 rounded-2xl rounded-tl-none border border-[#e8e2d8] leading-relaxed shadow-xs";
    }
    textDiv.style.whiteSpace = "pre-line";

    //若用戶訊息有複製/標記圖標
    if (isUser) {
      textDiv.innerHTML = `
        <div class="flex items-center gap-1.5">
          <span>${msg.content}</span>
          <span class="text-xs text-amber-700 cursor-pointer" title="複製內容">📋</span>
        </div>
      `;
    } else {
      textDiv.textContent = msg.content;
    }
    contentWrapper.appendChild(textDiv);

    //結構化卡片：重要語音片段統計
    if (msg.summaryCard) {
      const summaryBox = document.createElement("div");
      summaryBox.className = "w-full mt-2.5 bg-white border border-[#ece5da] rounded-xl p-3 shadow-xs";
      summaryBox.innerHTML = `
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-[#f2ede6]">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div>
              <h4 class="font-bold text-slate-800 text-xs">${msg.summaryCard.title}</h4>
              <p class="text-[11px] text-slate-400">${msg.summaryCard.description}</p>
            </div>
          </div>
          <button class="rf-btn-secondary text-[10px] px-2.5 py-0.5 font-medium btn-apply-chorus" data-start="84.3" data-end="113.8">
            ${msg.summaryCard.badge}
          </button>
        </div>
        <p class="text-[11px] text-slate-600 leading-relaxed">${msg.summaryCard.comment}</p>
      `;
      contentWrapper.appendChild(summaryBox);
    }

    //結構化卡片：片段列表 (如圖片中的黃底標記卡片)
    if (msg.choruses && msg.choruses.length > 0) {
      const chorusList = document.createElement("div");
      chorusList.className = "w-full mt-2.5 bg-[#fef9ee] border border-[#f5e6cf] rounded-xl p-3 shadow-xs space-y-2";
      
      const head = document.createElement("div");
      head.className = "flex items-center justify-between text-[11px] font-bold text-amber-800 pb-1.5 border-b border-amber-200/50";
      head.innerHTML = `
        <span>已為你標記 ${msg.choruses.length} 個片段：</span>
        <span class="text-xs text-amber-600 cursor-pointer hover:text-amber-800" title="複製清單">📋</span>
      `;
      chorusList.appendChild(head);

      msg.choruses.forEach((chorus: ChorusSegment) => {
        const item = document.createElement("div");
        item.className = "flex items-center justify-between p-2 rounded-lg bg-white/70 hover:bg-white border border-amber-100 hover:border-amber-300 transition-all cursor-pointer group";
        item.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="font-bold text-amber-900 font-mono text-[11px]">${chorus.name} :</span>
            <span class="font-mono text-slate-600 text-[11px]">${formatTime(chorus.startSec)} - ${formatTime(chorus.endSec)}</span>
            <span class="text-[10px] text-slate-400 font-mono">(${(chorus.endSec - chorus.startSec).toFixed(1)}s)</span>
            ${chorus.tag ? `<span class="text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded font-medium">【標籤 : ${chorus.tag}】</span>` : ""}
          </div>
          <button class="rf-btn-secondary text-[10px] px-2 py-0.5 font-bold group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:border-orange-200 btn-apply-chorus" data-start="${chorus.startSec}" data-end="${chorus.endSec}">
            套用
          </button>
        `;
        chorusList.appendChild(item);
      });

      contentWrapper.appendChild(chorusList);
    }

    //時間戳記 (例如 01:24)
    const timeSpan = document.createElement("span");
    timeSpan.className = "text-[10px] text-slate-400 mt-1 px-1 font-mono";
    timeSpan.textContent = msg.timeStr || "01:24";
    contentWrapper.appendChild(timeSpan);

    bubble.appendChild(contentWrapper);
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

function bindEvents() {
  const canvas = document.getElementById("waveform-canvas") as HTMLCanvasElement;
  waveformViewer = new WaveformViewer(canvas);

  const btnPlayPause = document.getElementById("btn-play-pause");
  const playIcon = document.getElementById("play-icon");
  const playbackTime = document.getElementById("playback-time");
  const textStartTime = document.getElementById("text-start-time");
  const textEndTime = document.getElementById("text-end-time");
  const textDurationLen = document.getElementById("text-duration-len");
  const badgeLegal = document.getElementById("badge-legal");
  const btnSetStart = document.getElementById("btn-set-start");
  const btnSetEnd = document.getElementById("btn-set-end");
  const btnLockGolden = document.getElementById("btn-lock-golden");
  const btnMarkImportant = document.getElementById("btn-mark-important");
  const btnShareIos = document.getElementById("btn-share-ios");
  const btnDownloadM4a = document.getElementById("btn-download-m4a");
  const selectDownloadFormat = document.getElementById("select-download-format") as HTMLSelectElement;
  const btnQuickAnalyze = document.getElementById("btn-quick-analyze");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  const charCounter = document.getElementById("char-counter");
  const loadingOverlay = document.getElementById("loading-overlay");
  const badgeFileStatus = document.getElementById("badge-file-status");
  const songTitleDisplay = document.getElementById("song-title-display");
  const btnEditTitle = document.getElementById("btn-edit-title");
  const songMetaDisplay = document.getElementById("song-meta-display");

  //更新選取範圍 UI
  const updateRangeUI = (start: number, end: number) => {
    if (!textStartTime || !textEndTime || !textDurationLen || !badgeLegal) return;
    textStartTime.textContent = formatTime(start);
    textEndTime.textContent = formatTime(end);
    const len = end - start;
    textDurationLen.textContent = `${len.toFixed(1)} 秒`;

    if (len <= 40) {
      textDurationLen.className = "font-mono text-2xl font-black text-orange-600";
      badgeLegal.textContent = "✓ 符合需求";
      badgeLegal.className = "text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold";
    } else {
      textDurationLen.className = "font-mono text-2xl font-black text-red-500";
      badgeLegal.textContent = "⚠ 超過 40 秒";
      badgeLegal.className = "text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold";
    }
  };

  waveformViewer.onRangeChange = (start, end) => {
    updateRangeUI(start, end);
  };

  waveformViewer.onSeek = (sec) => {
    audioEngine.seek(sec);
  };

  audioEngine.onProgress = (currentTime, _ratio) => {
    if (playbackTime) {
      const dur = audioEngine.getDuration() || 242.7;
      playbackTime.innerHTML = `${formatTime(currentTime)} <span class="text-slate-400 font-normal text-sm">/ ${formatTime(dur)}</span>`;
    }
    if (waveformViewer) {
      waveformViewer.setPlaybackPosition(currentTime);
    }
  };

  audioEngine.onStateChange = (isPlaying) => {
    if (playIcon) playIcon.textContent = isPlaying ? "⏸" : "▶";
  };

  btnPlayPause?.addEventListener("click", () => {
    if (audioEngine.getIsPlaying()) {
      audioEngine.pause();
    } else {
      if (waveformViewer) {
        audioEngine.play(waveformViewer.startSec, waveformViewer.endSec);
      } else {
        audioEngine.play();
      }
    }
  });

  btnSetStart?.addEventListener("click", () => {
    if (!waveformViewer) return;
    const current = audioEngine.getCurrentTime();
    waveformViewer.setRange(current, waveformViewer.endSec);
  });

  btnSetEnd?.addEventListener("click", () => {
    if (!waveformViewer) return;
    const current = audioEngine.getCurrentTime();
    waveformViewer.setRange(waveformViewer.startSec, current);
  });

  btnLockGolden?.addEventListener("click", () => {
    if (!waveformViewer) return;
    waveformViewer.setRange(waveformViewer.startSec, waveformViewer.startSec + 29.5);
  });

  btnMarkImportant?.addEventListener("click", () => {
    btnQuickAnalyze?.click();
  });

  //步進微調按鈕
  document.querySelectorAll(".rf-step-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (!waveformViewer) return;
      const action = (e.currentTarget as HTMLElement).dataset.action;
      if (action === "start-dec-1") waveformViewer.setRange(waveformViewer.startSec - 1, waveformViewer.endSec);
      if (action === "start-dec-01") waveformViewer.setRange(waveformViewer.startSec - 0.1, waveformViewer.endSec);
      if (action === "start-inc-01") waveformViewer.setRange(waveformViewer.startSec + 0.1, waveformViewer.endSec);
      if (action === "start-inc-1") waveformViewer.setRange(waveformViewer.startSec + 1, waveformViewer.endSec);

      if (action === "end-dec-1") waveformViewer.setRange(waveformViewer.startSec, waveformViewer.endSec - 1);
      if (action === "end-dec-01") waveformViewer.setRange(waveformViewer.startSec, waveformViewer.endSec - 0.1);
      if (action === "end-inc-01") waveformViewer.setRange(waveformViewer.startSec, waveformViewer.endSec + 0.1);
      if (action === "end-inc-1") waveformViewer.setRange(waveformViewer.startSec, waveformViewer.endSec + 1);
    });
  });

  //改名支援
  const editTitleHandler = () => {
    const newName = prompt("請輸入自訂錄音檔名稱：", currentSongTitle);
    if (newName && newName.trim()) {
      currentSongTitle = newName.trim();
      if (songTitleDisplay) songTitleDisplay.textContent = currentSongTitle;
    }
  };
  songTitleDisplay?.addEventListener("click", editTitleHandler);
  btnEditTitle?.addEventListener("click", editTitleHandler);

  //檔案上傳
  const inputFile = document.getElementById("input-file") as HTMLInputElement;
  const dropZone = document.getElementById("drop-zone");

  const loadFile = async (file: File) => {
    if (!file || !waveformViewer) return;
    currentSongTitle = file.name.replace(/\.[^/.]+$/, "");
    currentAudioFormat = file.name.split(".").pop()?.toUpperCase() || "MP3";
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    currentFileSizeStr = `${sizeMb} MB`;

    if (songTitleDisplay) songTitleDisplay.textContent = currentSongTitle;
    if (badgeFileStatus) {
      badgeFileStatus.textContent = "已載入";
      badgeFileStatus.className = "text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium";
    }

    if (loadingOverlay) loadingOverlay.classList.remove("hidden");
    try {
      const buffer = await file.arrayBuffer();
      const decoded = await audioEngine.loadAudioData(buffer);
      waveformViewer.setAudioBuffer(decoded);
      waveformViewer.setRange(54.0, Math.min(84.3, decoded.duration));
      updateRangeUI(54.0, Math.min(84.3, decoded.duration));

      if (songMetaDisplay) {
        songMetaDisplay.textContent = `${currentAudioFormat} · ${currentFileSizeStr} · ${formatTime(decoded.duration)}`;
      }

      agent.sendMessage(`已載入音訊檔案《${currentSongTitle}》，長度約 ${Math.floor(decoded.duration)} 秒。`, decoded.duration, currentSongTitle)
        .then(() => renderChatMessages());
    } catch {
      alert("音訊解碼失敗，請確認檔案格式是否支援！");
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  };

  dropZone?.addEventListener("click", () => inputFile?.click());
  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-orange-500", "bg-orange-50/50");
  });
  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-orange-500", "bg-orange-50/50");
  });
  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-orange-500", "bg-orange-50/50");
    if (e.dataTransfer && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
    }
  });

  inputFile?.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files[0]) loadFile(files[0]);
  });

  //YouTube 解析載入
  const inputYoutube = document.getElementById("input-youtube") as HTMLInputElement;
  const btnLoadYoutube = document.getElementById("btn-load-youtube");

  btnLoadYoutube?.addEventListener("click", async () => {
    const url = inputYoutube.value.trim();
    if (!url) {
      alert("請先輸入 YouTube 連結！");
      return;
    }
    if (!waveformViewer) return;

    if (loadingOverlay) {
      loadingOverlay.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
          <span class="font-mono tracking-wide font-semibold">1/2 正在探測音軌中...</span>
        </div>
      `;
      loadingOverlay.classList.remove("hidden");
    }

    try {
      const infoRes = await fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`);
      const infoData = await infoRes.json() as { success?: boolean; title?: string; duration?: number };
      if (infoData.title) {
        currentSongTitle = infoData.title;
        if (songTitleDisplay) songTitleDisplay.textContent = currentSongTitle;
      }

      if (loadingOverlay) {
        loadingOverlay.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
            <span class="font-mono tracking-wide font-semibold">2/2 正在串流下載並生成波形...</span>
          </div>
        `;
      }

      const audioRes = await fetch(`/api/youtube-audio?url=${encodeURIComponent(url)}`);
      if (!audioRes.ok) throw new Error("音訊下載串流回應異常");
      const arrayBuffer = await audioRes.arrayBuffer();

      const decoded = await audioEngine.loadAudioData(arrayBuffer);
      waveformViewer.setAudioBuffer(decoded);
      waveformViewer.setRange(54.0, Math.min(84.3, decoded.duration));
      updateRangeUI(54.0, Math.min(84.3, decoded.duration));

      if (badgeFileStatus) {
        badgeFileStatus.textContent = "已載入";
        badgeFileStatus.className = "text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium";
      }

      if (songMetaDisplay) {
        songMetaDisplay.textContent = `AAC · 網路串流 · ${formatTime(decoded.duration)}`;
      }

      await agent.analyzeChorus(currentSongTitle, decoded.duration);
      renderChatMessages();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      alert(`載入失敗: ${msg}，請確認連結正確或使用「本地檔案上傳」！`);
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  });

  //一鍵分析副歌按鈕 (⚙️ 一般分析預設)
  btnQuickAnalyze?.addEventListener("click", async () => {
    const dur = audioEngine.getDuration() || 242.7;
    const rawBuf = audioEngine.getRawArrayBuffer();
    let base64: string | undefined;

    if (rawBuf && rawBuf.byteLength < 6 * 1024 * 1024) {
      const bytes = new Uint8Array(rawBuf);
      let binary = "";
      const len = Math.min(bytes.byteLength, 3 * 1024 * 1024);
      for (let i = 0; i < len; i += 1024) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 1024, len)));
      }
      base64 = btoa(binary);
    }

    const originalText = btnQuickAnalyze.innerHTML;
    btnQuickAnalyze.setAttribute("disabled", "true");
    btnQuickAnalyze.classList.add("opacity-70", "cursor-not-allowed");
    btnQuickAnalyze.innerHTML = `
      <span class="inline-block w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
      <span>分析中...</span>
    `;

    agent.addThinkingMessage();
    renderChatMessages();

    try {
      await agent.analyzeChorus(currentSongTitle, dur, base64);
    } catch (err) {
      console.error("[RingFlow Client] 分析異常:", err);
    } finally {
      btnQuickAnalyze.removeAttribute("disabled");
      btnQuickAnalyze.classList.remove("opacity-70", "cursor-not-allowed");
      btnQuickAnalyze.innerHTML = originalText;
      renderChatMessages();
    }
  });

  //對話發送與字數計算
  chatInput?.addEventListener("input", () => {
    if (charCounter) {
      charCounter.textContent = `${chatInput.value.length}/2000`;
    }
  });

  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    if (charCounter) charCounter.textContent = "0/2000";
    await agent.sendMessage(text, audioEngine.getDuration() || 242.7, currentSongTitle);
    renderChatMessages();
  });

  //卡片套用點擊事件委託
  document.getElementById("chat-container")?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest(".btn-apply-chorus") as HTMLElement;
    if (!target || !waveformViewer) return;

    const start = parseFloat(target.dataset.start || "54.0");
    const end = parseFloat(target.dataset.end || "84.3");
    waveformViewer.setRange(start, end);
    audioEngine.seek(start);
    audioEngine.play(start, end);
    document.getElementById("waveform-canvas")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  //格式選擇
  selectDownloadFormat?.addEventListener("change", (e) => {
    selectedDownloadFormat = (e.target as HTMLSelectElement).value;
  });

  //分享至 iPhone 鈴聲 (GarageBand 專用)
  btnShareIos?.addEventListener("click", async () => {
    if (!waveformViewer) return;
    const len = waveformViewer.endSec - waveformViewer.startSec;
    if (len > 40) {
      alert("注意：iPhone 來電鈴聲上限為 40 秒，目前長度超出限制，請縮減！");
      return;
    }

    try {
      const ringtoneBlob = await audioEngine.renderRingtoneBuffer(
        waveformViewer.startSec,
        waveformViewer.endSec,
        1.0,
        2.0
      );

      const fileName = `${currentSongTitle.replace(/\s+/g, "_")}_Ringtone.m4a`;
      const file = new File([ringtoneBlob], fileName, { type: "audio/mp4" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "iPhone 鈴聲",
          text: `由 RingFlow 製作的《${currentSongTitle}》鈴聲，儲存至檔案後可在 GarageBand 輸出。`,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(ringtoneBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        document.getElementById("modal-guide")?.classList.remove("hidden");
      }
    } catch (err) {
      console.error(err);
      alert("處理失敗，請重試！");
    }
  });

  //直接下載按鈕
  btnDownloadM4a?.addEventListener("click", async () => {
    if (!waveformViewer) return;
    const ringtoneBlob = await audioEngine.renderRingtoneBuffer(
      waveformViewer.startSec,
      waveformViewer.endSec,
      1.0,
      2.0
    );
    const ext = selectedDownloadFormat;
    const fileName = `${currentSongTitle.replace(/\s+/g, "_")}_Ringtone.${ext}`;
    const url = URL.createObjectURL(ringtoneBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  });

  //教學彈窗
  const modalGuide = document.getElementById("modal-guide");
  document.getElementById("btn-open-guide")?.addEventListener("click", () => modalGuide?.classList.remove("hidden"));
  document.getElementById("btn-close-guide")?.addEventListener("click", () => modalGuide?.classList.add("hidden"));
  document.getElementById("btn-guide-confirm")?.addEventListener("click", () => modalGuide?.classList.add("hidden"));
}

function bootstrap() {
  renderApp();
  renderChatMessages();
  bindEvents();
}

window.addEventListener("DOMContentLoaded", bootstrap);
