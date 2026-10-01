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
    <div class="min-h-screen flex flex-col justify-between">
      <!-- 頂部頂級導航列 (白卡片設計 + 橘色音波 Logo) -->
      <div class="w-full max-w-[1400px] mx-auto pt-3 sm:pt-5 px-3 sm:px-6">
        <header class="bg-white border border-[#e8ded2] rounded-2xl px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-xs">
          <!-- Logo (橘色音波 + RINGFLOW) -->
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="flex items-center justify-center text-orange-500">
              <svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 10v4" />
                <path d="M6 5v14" />
                <path d="M10 2v20" />
                <path d="M14 7v10" />
                <path d="M18 4v16" />
                <path d="M22 10v4" />
              </svg>
            </div>
            <span class="font-black text-lg sm:text-xl tracking-wider text-slate-900 select-none">
              RINGFLOW
            </span>
          </div>

          <!-- 鈴聲教學快速入口按鈕 -->
          <button id="btn-open-guide" class="rf-btn-white-pill text-xs px-3 sm:px-3.5 py-1.5 font-medium shadow-none hover:shadow-xs">
            <span>📘 鈴聲匯入教學</span>
          </button>
        </header>
      </div>

      <!-- 主工作區 (左側 7 欄 + 右側 5 欄) -->
      <main class="flex-1 max-w-[1400px] mx-auto w-full p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        <!-- ==================== 左側：音訊處理工作區 (佔 7 欄) ==================== -->
        <section class="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
          
          <!-- 1. 語音檔案處理卡片 -->
          <div class="rf-panel-card p-4 sm:p-5 bg-white">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <!-- 橙黃色圓角圖標 -->
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-xs shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-sm sm:text-[15px] font-bold text-slate-800 leading-tight">語音檔案處理</h2>
                  <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">支援多種格式（MP3、WAV、M4A、FLAC、AAC）</p>
                </div>
              </div>

              <!-- 右側標籤 No. 3 與 等待處理 -->
              <div class="flex items-center gap-1.5 sm:gap-2">
                <span id="badge-file-no" class="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono font-medium border border-slate-200">
                  No. 3
                </span>
                <span id="badge-file-status" class="text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309] font-medium border border-[#fde68a]">
                  等待處理
                </span>
              </div>
            </div>

            <!-- 拖曳或點選上傳本地檔案區域 -->
            <div
              id="drop-zone"
              class="border border-dashed border-[#dfd5c7] hover:border-orange-400 rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all bg-[#faf7f2] hover:bg-[#fffcf9] flex flex-row items-center justify-between gap-3 group"
            >
              <input id="input-file" type="file" accept="audio/*" class="hidden" />
              
              <div class="flex items-center gap-3 text-left">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs sm:text-[13px] font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                    點擊或拖曳音訊檔至此 <span class="hidden sm:inline text-[11px] text-slate-400 font-normal">（MP3, WAV, M4A, FLAC, AAC）</span>
                  </p>
                  <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">支援檔案上傳 · Web Audio 錄製 · URL 連結匯入</p>
                </div>
              </div>

              <button type="button" class="rf-btn-white-pill px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap pointer-events-none shrink-0">
                <span>📁 選擇檔案</span>
              </button>
            </div>

            <!-- YouTube 或網址快速解析列 -->
            <div class="mt-2.5 flex gap-2">
              <input
                id="input-youtube"
                type="text"
                placeholder="貼上 YouTube 影片網址或音訊串流連結 (例如 https://youtu.be/...)"
                class="flex-1 bg-white border border-[#e2d8cd] rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 font-mono transition-colors"
              />
              <button id="btn-load-youtube" class="rf-btn-white-pill text-xs px-3 py-1.5 whitespace-nowrap font-medium">
                <span>解析載入</span>
              </button>
            </div>
          </div>

          <!-- 2. 試聽錄音檔與波形雕刻控制台 -->
          <div class="rf-panel-card p-4 sm:p-5 bg-white">
            
            <!-- 頂部資訊列：播放按鈕、標題、時間碼 -->
            <div class="flex items-center justify-between mb-3.5">
              <div class="flex items-center gap-3">
                <!-- 亮橘色圓形播放按鈕 -->
                <button 
                  id="btn-play-pause" 
                  class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform shrink-0"
                  title="播放/暫停"
                >
                  <span id="play-icon" class="text-base sm:text-lg ml-0.5">▶</span>
                </button>

                <div>
                  <div class="flex items-center gap-1.5">
                    <h3 id="song-title-display" class="font-bold text-sm sm:text-base text-slate-800 cursor-pointer hover:text-orange-600 transition-colors" title="點擊修改名稱">
                      試聽錄音檔
                    </h3>
                    <button id="btn-edit-title" class="text-xs text-slate-400 hover:text-orange-600" title="修改名稱">
                      ✏️
                    </button>
                  </div>
                  <p id="song-meta-display" class="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5">
                    MP3 · 3.2 MB · 04:02.7
                  </p>
                </div>
              </div>

              <!-- 時間碼顯示器 -->
              <div class="text-right">
                <div class="text-[9px] sm:text-[10px] tracking-wider uppercase font-mono text-slate-400 font-semibold">PLAYHEAD TIMECODE</div>
                <div id="playback-time" class="font-mono text-base sm:text-lg font-black text-amber-600 tracking-tight">
                  01:04.0 <span class="text-slate-400 font-normal text-xs sm:text-sm">/ 04:02.7</span>
                </div>
              </div>
            </div>

            <!-- Canvas 專業高動態波形圖 -->
            <div class="relative w-full h-32 sm:h-40 bg-[#fcfaf7] rounded-xl border border-[#ece4d8] overflow-hidden mb-4">
              <canvas id="waveform-canvas" class="w-full h-full cursor-crosshair touch-none"></canvas>
              <div id="loading-overlay" class="absolute inset-0 bg-white/85 backdrop-blur-xs flex items-center justify-center text-xs text-orange-600 font-medium hidden">
                <div class="flex items-center gap-2.5">
                  <span class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                  <span class="font-mono tracking-wide font-semibold">正在處理音訊波形...</span>
                </div>
              </div>
            </div>

            <!-- 3. 三欄式時間戳控制台 (START 起點 / END 終點 / 持續時間) -->
            <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              <!-- 起點控制 -->
              <div class="rf-inner-card p-2 sm:p-3 bg-[#ffffff]">
                <div class="flex items-center justify-between mb-0.5 sm:mb-1">
                  <span class="text-[11px] sm:text-xs font-bold text-red-500 flex items-center gap-1">
                    ▶ <span class="font-black">START</span> <span class="hidden sm:inline text-slate-400 font-normal text-[11px]">起點</span>
                  </span>
                </div>
                <div id="text-start-time" class="font-mono text-sm sm:text-lg font-black text-slate-900 mb-1.5 sm:mb-2">00:54.0</div>
                <div class="flex gap-0.5 sm:gap-1">
                  <button class="rf-step-chip flex-1" data-action="start-dec-1">-1s</button>
                  <button class="rf-step-chip flex-1" data-action="start-dec-01">-0.1s</button>
                  <button class="rf-step-chip flex-1" data-action="start-inc-01">+0.1s</button>
                  <button class="rf-step-chip flex-1" data-action="start-inc-1">+1s</button>
                </div>
              </div>

              <!-- 終點控制 -->
              <div class="rf-inner-card p-2 sm:p-3 bg-[#ffffff]">
                <div class="flex items-center justify-between mb-0.5 sm:mb-1">
                  <span class="text-[11px] sm:text-xs font-bold text-amber-500 flex items-center gap-1">
                    ◆ <span class="font-black">END</span> <span class="hidden sm:inline text-slate-400 font-normal text-[11px]">終點</span>
                  </span>
                </div>
                <div id="text-end-time" class="font-mono text-sm sm:text-lg font-black text-slate-900 mb-1.5 sm:mb-2">01:24.3</div>
                <div class="flex gap-0.5 sm:gap-1">
                  <button class="rf-step-chip flex-1" data-action="end-dec-1">-1s</button>
                  <button class="rf-step-chip flex-1" data-action="end-dec-01">-0.1s</button>
                  <button class="rf-step-chip flex-1" data-action="end-inc-01">+0.1s</button>
                  <button class="rf-step-chip flex-1" data-action="end-inc-1">+1s</button>
                </div>
              </div>

              <!-- 持續時間與合規狀態 -->
              <div class="rf-inner-card p-2 sm:p-3 bg-[#ffffff] flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] sm:text-xs font-bold text-slate-500">持續時間</span>
                  <span id="badge-legal" class="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    ✓ 符合需求
                  </span>
                </div>
                <div class="flex items-baseline justify-between my-0.5 sm:my-1">
                  <div id="text-duration-len" class="font-mono text-base sm:text-2xl font-black text-orange-600">30.3 秒</div>
                  <button id="btn-mark-important" class="text-[9px] sm:text-[10px] text-amber-800 bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fde68a] px-1.5 sm:px-2 py-0.5 rounded-full font-medium transition-colors">
                    + 標記重要點
                  </button>
                </div>
                <div class="flex items-center justify-between pt-0.5 sm:pt-1 border-t border-slate-100 text-[9px] sm:text-[11px] text-slate-500 font-mono">
                  <span class="flex items-center gap-0.5 text-amber-600 font-medium">⚡ 標記進度</span>
                  <button id="btn-lock-golden" class="text-slate-600 hover:text-orange-600 font-bold">29.5s</button>
                </div>
              </div>
            </div>

            <!-- 4. 操作與下載列 -->
            <div class="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-3 border-t border-[#f0e8dc] items-stretch sm:items-center">
              <!-- 分享到 iPhone 按鈕 -->
              <button id="btn-share-ios" class="rf-btn-orange-gradient flex-1 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20">
                <span class="text-base">🎛️</span>
                <span>分享到 iPhone 轉錄（GarageBand 專用）</span>
              </button>

              <!-- 下載組合按鈕 -->
              <div class="flex items-center justify-center gap-1 shrink-0">
                <button id="btn-download-m4a" class="rf-btn-white-pill py-2.5 px-3.5 text-xs font-bold">
                  <span>📥 下載</span>
                </button>
                <div class="relative inline-block">
                  <select id="select-download-format" class="rf-btn-white-pill py-2.5 pl-2.5 pr-6 text-xs font-bold appearance-none cursor-pointer bg-white min-w-[62px]">
                    <option value="m4a" selected>.m4a</option>
                    <option value="m4r">.m4r</option>
                    <option value="wav">.wav</option>
                  </select>
                  <span class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
                </div>
              </div>
            </div>
          </div>

        </section>

        <!-- ==================== 右側：AI Agent 智能對話助手 (佔 5 欄) ==================== -->
        <section class="lg:col-span-5 flex flex-col gap-4">
          <div class="rf-panel-card p-4 sm:p-5 bg-white flex flex-col h-[560px] lg:h-[625px]">
            
            <!-- Agent 頂部標題列 -->
            <div class="flex items-center justify-between pb-3 border-b border-[#eee5da] mb-3">
              <div class="flex items-center gap-2.5">
                <!-- 黑色圓形機器人圖標 -->
                <div class="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
                  <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                    <line x1="8" y1="16" x2="8.01" y2="16" stroke-width="2.5" stroke-linecap="round" />
                    <line x1="16" y1="16" x2="16.01" y2="16" stroke-width="2.5" stroke-linecap="round" />
                  </svg>
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <h3 class="text-xs sm:text-sm font-bold text-slate-900">AI Agent 智能對話助手</h3>
                    <span class="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-600 font-medium">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      在線
                    </span>
                  </div>
                  <p class="text-[10px] sm:text-[11px] text-slate-400">基於最新模型，提供專業的語音內容分析與處理建議</p>
                </div>
              </div>
              
              <button id="btn-quick-analyze" class="rf-btn-white-pill text-[10px] sm:text-[11px] px-2.5 py-1 font-medium shadow-none hover:shadow-xs shrink-0">
                <span>⚙️ 一般分析預設</span>
              </button>
            </div>

            <!-- 對話與訊息滾動區 -->
            <div id="chat-container" class="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <!-- 訊息由 JS 動態生成 -->
            </div>

            <!-- 底部 AI 輸入列 -->
            <form id="chat-form" class="mt-2.5 pt-2.5 border-t border-[#eee5da] flex items-center gap-2">
              <div class="relative flex-1 flex items-center">
                <span class="absolute left-3 text-amber-500 text-sm select-none">✨</span>
                <input
                  id="chat-input"
                  type="text"
                  maxlength="2000"
                  placeholder="輸入 AI 指令，例如：「幫我分析這段語音的重點」、「生成逐字稿」或「摘要內容」"
                  class="w-full bg-[#faf7f2] border border-[#dfd5c7] rounded-full pl-8.5 pr-14 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 font-medium transition-colors"
                />
                <span id="char-counter" class="absolute right-3 text-[10px] text-slate-400 font-mono select-none">0/2000</span>
              </div>
              
              <button type="submit" class="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20 transition-all" title="發送指令">
                <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>

    <!-- iOS GarageBand 3 步免電腦指引 (Modal) -->
    <div id="modal-guide" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 hidden">
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
          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold font-mono flex items-center justify-center shrink-0">1</span>
            <p>點擊「<strong>分享到 iPhone 轉錄</strong>」，在 iOS 原生分享選單中點選「<strong>儲存到檔案</strong>」。</p>
          </div>

          <div class="flex gap-3 items-start">
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

          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold font-mono flex items-center justify-center shrink-0">3</span>
            <p>點左上角「▼」返回「我的樂曲」，<strong>長按該專案</strong> > 點選「<strong>分享</strong>」> 選擇「<strong>鈴聲</strong>」輸出，即可一鍵套用為來電鈴聲！</p>
          </div>
        </div>

        <div class="mt-6 pt-3 border-t border-[#f2ede6] text-center">
          <button id="btn-guide-confirm" class="rf-btn-orange-gradient w-full py-2.5 text-xs font-bold">
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
    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.className = `flex gap-2.5 ${isUser ? "justify-end" : "justify-start"} items-start`;

    //機器人頭像 (僅助手訊息顯示)
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
      bubbleWrapper.appendChild(avatar);
    }

    const contentWrapper = document.createElement("div");
    contentWrapper.className = `flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[92%] sm:max-w-[85%]`;

    //對話氣泡主體
    const textDiv = document.createElement("div");
    if (isUser && msg.choruses && msg.choruses.length > 0) {
      //黃底片段列表卡片
      textDiv.className = "chat-bubble-segment p-3 sm:p-3.5 leading-relaxed text-slate-800 w-full";
      textDiv.innerHTML = `
        <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-300/60 text-xs font-bold text-amber-900">
          <span>${msg.content}</span>
          <span class="text-xs text-amber-700 cursor-pointer hover:text-amber-900" title="複製標記片段">📋</span>
        </div>
        <div class="space-y-1.5 font-mono text-[11px]">
          ${msg.choruses.map(ch => `
            <div class="flex items-center justify-between text-slate-800 hover:text-orange-700 cursor-pointer btn-apply-chorus" data-start="${ch.startSec}" data-end="${ch.endSec}">
              <span>${ch.name} : ${formatTime(ch.startSec)} - ${formatTime(ch.endSec)} <span class="text-slate-500">(${(ch.endSec - ch.startSec).toFixed(1)}s)</span></span>
              ${ch.tag ? `<span class="text-[10px] text-amber-800 font-bold ml-1">【標籤 : ${ch.tag}】</span>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="text-right text-[10px] text-amber-800/80 mt-1 font-mono">${msg.timeStr || "01:28"}</div>
      `;
    } else if (isUser) {
      textDiv.className = "chat-bubble-user px-3.5 py-2.5 text-slate-800 leading-relaxed";
      textDiv.innerHTML = `
        <div class="flex items-center gap-1.5">
          <span>${msg.content}</span>
          <span class="text-xs text-amber-700 cursor-pointer" title="複製內容">📋</span>
        </div>
        <div class="text-right text-[10px] text-amber-800/70 mt-1 font-mono">${msg.timeStr || "01:24"}</div>
      `;
    } else {
      textDiv.className = "chat-bubble-bot p-3 sm:p-3.5 leading-relaxed text-slate-700";
      textDiv.style.whiteSpace = "pre-line";
      textDiv.textContent = msg.content;

      //如果有統計卡片，內嵌在對話氣泡內
      if (msg.summaryCard) {
        const summaryCard = document.createElement("div");
        summaryCard.className = "mt-2 bg-[#ffffff] border border-[#e8ded2] rounded-xl p-2.5";
        summaryCard.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-[11px]">${msg.summaryCard.title}</h4>
                <p class="text-[10px] text-slate-400">${msg.summaryCard.description}</p>
              </div>
            </div>
            <button class="rf-btn-white-pill text-[10px] px-2 py-0.5 font-medium btn-apply-chorus shrink-0" data-start="84.3" data-end="117.5">
              ${msg.summaryCard.badge}
            </button>
          </div>
        `;
        textDiv.appendChild(summaryCard);
      }

      const timeDiv = document.createElement("div");
      timeDiv.className = "text-right text-[10px] text-slate-400 mt-1 font-mono";
      timeDiv.textContent = msg.timeStr || "01:24";
      textDiv.appendChild(timeDiv);
    }

    contentWrapper.appendChild(textDiv);
    bubbleWrapper.appendChild(contentWrapper);
    container.appendChild(bubbleWrapper);
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
      textDurationLen.className = "font-mono text-base sm:text-2xl font-black text-orange-600";
      badgeLegal.textContent = "✓ 符合需求";
      badgeLegal.className = "text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold";
    } else {
      textDurationLen.className = "font-mono text-base sm:text-2xl font-black text-red-500";
      badgeLegal.textContent = "⚠ 超過 40 秒";
      badgeLegal.className = "text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.2 rounded-full bg-red-100 text-red-600 font-bold";
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
      playbackTime.innerHTML = `${formatTime(currentTime)} <span class="text-slate-400 font-normal text-xs sm:text-sm">/ ${formatTime(dur)}</span>`;
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
  document.querySelectorAll(".rf-step-chip").forEach((btn) => {
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
      badgeFileStatus.className = "text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200";
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
      loadingOverlay.classList.remove("hidden");
    }

    try {
      const infoRes = await fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`);
      const infoData = await infoRes.json() as { success?: boolean; title?: string; duration?: number };
      if (infoData.title) {
        currentSongTitle = infoData.title;
        if (songTitleDisplay) songTitleDisplay.textContent = currentSongTitle;
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
        badgeFileStatus.className = "text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200";
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

  //字數計數器
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

  //點擊片段套用選取
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
