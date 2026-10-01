import { AudioEngine } from "./audio/engine";
import { WaveformViewer } from "./audio/waveform";
import { SongChorusAgent, type ChorusSegment } from "./agent/piAgent";

const audioEngine = new AudioEngine();
const agent = new SongChorusAgent();
let waveformViewer: WaveformViewer | null = null;
let currentSongTitle = "未載入音訊";

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
    <!-- 頂部頂級導航列 (iOS 18 玻璃態 + Safe Area) -->
    <header class="w-full px-5 py-3.5 border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-40">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3.5">
          <div class="relative group">
            <img 
              src="/app_icon.png" 
              alt="RingFlow Icon" 
              class="w-10 h-10 rounded-2xl shadow-xl shadow-amber-500/20 object-cover border border-white/20 transition-transform duration-300 group-hover:scale-105" 
            />
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-950 rounded-full"></span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-base tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                RINGFLOW
              </span>
              <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-semibold tracking-wider">
                PRO STUDIO
              </span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium">iPhone 專業級鈴聲工坊 · PI Agent 驅動</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Cloudflare Edge</span>
          </div>
          <button id="btn-open-guide" class="btn-glass text-xs px-3.5 py-2">
            <span>📘 鈴聲匯入教學</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 主工作區 (響應式雙欄佈局) -->
    <main class="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- 左側/核心區：音訊導入、黑膠播放指示、波形時間軸與輸出 (佔 7 欄) -->
      <section class="lg:col-span-7 flex flex-col gap-5">
        
        <!-- 1. 音訊來源面板 (雙軌：YouTube 網址 + 拖曳本機音訊) -->
        <div class="obsidian-panel p-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
              <h2 class="text-sm font-bold tracking-wide uppercase text-slate-200">音訊輸入軌道</h2>
            </div>
            <span id="current-song-badge" class="text-xs px-3 py-1 rounded-full bg-white/[0.06] text-amber-200/90 border border-white/10 font-mono truncate max-w-[220px]">
              尚未載入音訊
            </span>
          </div>

          <!-- YouTube 解析列 -->
          <div class="flex gap-2.5 mb-3.5">
            <div class="relative flex-1">
              <input
                id="input-youtube"
                type="text"
                placeholder="貼上 YouTube 影片網址 (例如 https://youtu.be/...)"
                class="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 transition-all font-mono"
              />
            </div>
            <button id="btn-load-youtube" class="btn-gold text-xs px-4 py-2.5 whitespace-nowrap">
              <span>解析載入</span>
            </button>
          </div>

          <!-- 拖曳或點選上傳本地檔案 -->
          <div
            id="drop-zone"
            class="border border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] group"
          >
            <input id="input-file" type="file" accept="audio/*" class="hidden" />
            <div class="flex items-center justify-center gap-2.5 text-slate-300 group-hover:text-amber-300 transition-colors">
              <span class="text-lg">📁</span>
              <p class="text-xs sm:text-sm font-semibold">點擊或拖曳音訊檔至此 (MP3, WAV, M4A, FLAC, AAC)</p>
            </div>
            <p class="text-[11px] text-slate-400 mt-1 font-mono">瀏覽器 Web Audio 離線解碼 · 零頻寬消耗 · 極速安全</p>
          </div>
        </div>

        <!-- 2. 專業級音訊雕刻台 (Waveform Console) -->
        <div class="obsidian-panel p-5 sm:p-6">
          
          <!-- 控制列：播放、試聽選區、時間碼 -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <button 
                id="btn-play-pause" 
                class="btn-gold w-11 h-11 rounded-full !p-0 shadow-lg shadow-amber-500/30 flex items-center justify-center text-slate-950 font-bold"
                title="播放/暫停"
              >
                <span id="play-icon" class="text-base ml-0.5">▶</span>
              </button>

              <button id="btn-play-range" class="btn-glass text-xs px-3.5 py-2" title="只播放選取的鈴聲區間">
                <span>🔁 試聽鈴聲段</span>
              </button>
            </div>

            <!-- 時間顯示器 -->
            <div class="text-right">
              <div class="text-[10px] tracking-wider uppercase font-mono text-slate-400">PLAYHEAD TIMECODE</div>
              <div id="playback-time" class="font-mono text-sm sm:text-base font-bold text-amber-300 tracking-tight">
                00:00.0 <span class="text-slate-500">/ 00:00.0</span>
              </div>
            </div>
          </div>

          <!-- Canvas 專業高動態波形圖 -->
          <div class="relative w-full h-36 sm:h-40 bg-slate-950/80 rounded-xl border border-white/10 overflow-hidden mb-4 shadow-inner">
            <canvas id="waveform-canvas" class="w-full h-full cursor-crosshair touch-none"></canvas>
            <div id="loading-overlay" class="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center text-xs text-amber-300 font-medium hidden">
              <div class="flex items-center gap-2.5">
                <span class="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                <span class="font-mono tracking-wide">Web Audio 正在解碼波形...</span>
              </div>
            </div>
          </div>

          <!-- 3. 極簡時間戳控制台 (起點 🚩 / 終點 🏁 / 黃金 29.5s) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <!-- 起點控制 -->
            <div class="obsidian-card p-3.5 border-amber-500/20">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                  🚩 START 起點
                </span>
                <button id="btn-set-start" class="text-[10px] bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded font-mono hover:bg-amber-400/25 transition-colors">
                  設為目前
                </button>
              </div>
              <div id="text-start-time" class="font-mono text-base font-extrabold text-slate-100 mb-2">00:00.0</div>
              <div class="flex gap-1">
                <button class="step-chip flex-1" data-action="start-dec-1">-1s</button>
                <button class="step-chip flex-1" data-action="start-dec-01">-0.1s</button>
                <button class="step-chip flex-1" data-action="start-inc-01">+0.1s</button>
                <button class="step-chip flex-1" data-action="start-inc-1">+1s</button>
              </div>
            </div>

            <!-- 終點控制 -->
            <div class="obsidian-card p-3.5 border-amber-500/20">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                  🏁 END 終點
                </span>
                <button id="btn-set-end" class="text-[10px] bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded font-mono hover:bg-amber-400/25 transition-colors">
                  設為目前
                </button>
              </div>
              <div id="text-end-time" class="font-mono text-base font-extrabold text-slate-100 mb-2">00:29.5</div>
              <div class="flex gap-1">
                <button class="step-chip flex-1" data-action="end-dec-1">-1s</button>
                <button class="step-chip flex-1" data-action="end-dec-01">-0.1s</button>
                <button class="step-chip flex-1" data-action="end-inc-01">+0.1s</button>
                <button class="step-chip flex-1" data-action="end-inc-1">+1s</button>
              </div>
            </div>

            <!-- 鈴聲長度與合規狀態 -->
            <div class="obsidian-card p-3.5 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-slate-400 uppercase font-mono">時長統計</span>
                  <span id="badge-legal" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    ✓ 符合規範
                  </span>
                </div>
                <div id="text-duration-len" class="font-mono text-xl font-black text-amber-300 mt-1">29.5 秒</div>
              </div>
              <button id="btn-lock-golden" class="btn-glass text-[11px] py-1.5 w-full mt-2 font-mono font-bold hover:border-amber-400/40" title="將終點自動校準為起點 + 29.5 秒">
                <span>⚡ 鎖定黃金 29.5s</span>
              </button>
            </div>
          </div>

          <!-- 4. 輸出與 iPhone 原生分享按鈕 -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/[0.08]">
            <button id="btn-share-ios" class="btn-gold flex-1 py-3.5 text-xs sm:text-sm shadow-xl shadow-amber-500/20">
              <span>📲 分享到 iPhone 鈴聲 (GarageBand 專用)</span>
            </button>
            <button id="btn-download-m4r" class="btn-glass py-3.5 px-5 text-xs whitespace-nowrap font-mono">
              <span>💾 下載 .m4r</span>
            </button>
          </div>
        </div>

      </section>

      <!-- 右側：PI Agent 歌曲副歌智慧顧問 (佔 5 欄) -->
      <section class="lg:col-span-5 flex flex-col gap-4">
        <div class="obsidian-panel p-5 sm:p-6 flex flex-col h-[600px]">
          
          <!-- Agent 標題列 -->
          <div class="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/20">
                <div class="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-sm">
                  🎧
                </div>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-100">PI Agent 副歌顧問</h3>
                <p class="text-[10px] text-amber-300/80 font-mono flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> 結構感知引擎已就緒
                </p>
              </div>
            </div>
            
            <button id="btn-quick-analyze" class="btn-gold text-[11px] px-3.5 py-1.5 shadow-sm">
              <span>🎵 一鍵分析所有副歌</span>
            </button>
          </div>

          <!-- 對話與副歌卡片滾動區 -->
          <div id="chat-container" class="flex-1 overflow-y-auto space-y-3.5 pr-1.5 text-xs">
            <!-- 訊息由 JS 動態生成 -->
          </div>

          <!-- 對話輸入列 -->
          <form id="chat-form" class="mt-3 pt-3 border-t border-white/[0.08] flex gap-2">
            <input
              id="chat-input"
              type="text"
              placeholder="問問 AI：副歌在哪？這首歌最炸的是哪一段？"
              class="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 font-mono transition-colors"
            />
            <button type="submit" class="btn-gold px-4 py-2.5 text-xs font-bold">
              <span>發送</span>
            </button>
          </form>
        </div>
      </section>

    </main>

    <!-- iOS GarageBand 3 步免電腦指引 (Modal) -->
    <div id="modal-guide" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 hidden">
      <div class="obsidian-panel max-w-md w-full p-6 border border-white/20 shadow-2xl">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>📲 iPhone 免電腦設定鈴聲教學</span>
          </h3>
          <button id="btn-close-guide" class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div class="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div class="flex gap-3.5 items-start">
            <span class="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold font-mono flex items-center justify-center shrink-0">1</span>
            <p>點擊「<strong>分享到 iPhone 鈴聲</strong>」，在 iOS 原生分享選單中點選「<strong>儲存到檔案</strong>」。</p>
          </div>

          <div class="flex gap-3.5 items-start">
            <span class="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold font-mono flex items-center justify-center shrink-0">2</span>
            <div>
              <p>打開 iPhone 內建的 <strong>GarageBand（庫樂隊）</strong>：</p>
              <ul class="list-disc list-inside text-slate-400 mt-1.5 space-y-1 font-mono">
                <li>新建「錄音機」軌道，點左上角切換為<strong>多軌檢視</strong></li>
                <li>點右上角「+」將小節設為 30 秒（防止音訊被截斷）</li>
                <li>點右上角<strong>套索（Loops）</strong>>「檔案」> 拖曳音訊至音軌</li>
              </ul>
            </div>
          </div>

          <div class="flex gap-3.5 items-start">
            <span class="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold font-mono flex items-center justify-center shrink-0">3</span>
            <p>點左上角「▼」返回「我的樂曲」，<strong>長按該專案</strong> > 點選「<strong>分享</strong>」> 選擇「<strong>鈴聲</strong>」輸出，即可一鍵套用為來電鈴聲！</p>
          </div>
        </div>

        <div class="mt-6 pt-3 border-t border-white/10 text-center">
          <button id="btn-guide-confirm" class="btn-gold w-full py-2.5 text-xs font-bold">
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
    bubble.className = `flex flex-col ${isUser ? "items-end" : "items-start"}`;

    const textDiv = document.createElement("div");
    textDiv.className = `p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
      isUser
        ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-amber-500/20"
        : "obsidian-card text-slate-200 rounded-tl-none border border-white/10"
    }`;
    textDiv.style.whiteSpace = "pre-line";
    textDiv.textContent = msg.content;
    bubble.appendChild(textDiv);

    if (msg.choruses && msg.choruses.length > 0) {
      const chorusList = document.createElement("div");
      chorusList.className = "w-full mt-3 space-y-2.5";

      msg.choruses.forEach((chorus: ChorusSegment) => {
        const card = document.createElement("div");
        card.className = "obsidian-card p-3.5 border border-amber-500/20 hover:border-amber-400/50 transition-all rounded-xl";
        card.innerHTML = `
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-amber-200 flex items-center gap-1.5">
              ${chorus.name}
            </span>
            <span class="text-[11px] font-mono text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 font-bold">
              ${formatTime(chorus.startSec)} - ${formatTime(chorus.endSec)} (${(chorus.endSec - chorus.startSec).toFixed(1)}s)
            </span>
          </div>
          <p class="text-[11px] text-slate-400 italic mb-1.5 font-mono">"${chorus.lyricsHighlight}"</p>
          <p class="text-[11px] text-slate-300 mb-3">${chorus.description}</p>
          <div class="flex gap-2">
            <button class="btn-glass text-[11px] py-1.5 px-3 flex-1 btn-preview-chorus" data-start="${chorus.startSec}" data-end="${chorus.endSec}">
              <span>🎧 試聽片段</span>
            </button>
            <button class="btn-gold text-[11px] py-1.5 px-3 flex-1 btn-apply-chorus !text-slate-950 font-bold" data-start="${chorus.startSec}" data-end="${chorus.endSec}">
              <span>🚩 設為鈴聲區間</span>
            </button>
          </div>
        `;
        chorusList.appendChild(card);
      });

      bubble.appendChild(chorusList);
    }

    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

function bindEvents() {
  const canvas = document.getElementById("waveform-canvas") as HTMLCanvasElement;
  waveformViewer = new WaveformViewer(canvas);

  const btnPlayPause = document.getElementById("btn-play-pause");
  const playIcon = document.getElementById("play-icon");
  const btnPlayRange = document.getElementById("btn-play-range");
  const playbackTime = document.getElementById("playback-time");
  const textStartTime = document.getElementById("text-start-time");
  const textEndTime = document.getElementById("text-end-time");
  const textDurationLen = document.getElementById("text-duration-len");
  const badgeLegal = document.getElementById("badge-legal");
  const btnSetStart = document.getElementById("btn-set-start");
  const btnSetEnd = document.getElementById("btn-set-end");
  const btnLockGolden = document.getElementById("btn-lock-golden");
  const btnShareIos = document.getElementById("btn-share-ios");
  const btnDownloadM4r = document.getElementById("btn-download-m4r");
  const btnQuickAnalyze = document.getElementById("btn-quick-analyze");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  const loadingOverlay = document.getElementById("loading-overlay");
  const currentSongBadge = document.getElementById("current-song-badge");

  const updateRangeUI = (start: number, end: number) => {
    if (!textStartTime || !textEndTime || !textDurationLen || !badgeLegal) return;
    textStartTime.textContent = formatTime(start);
    textEndTime.textContent = formatTime(end);
    const len = end - start;
    textDurationLen.textContent = `${len.toFixed(1)} 秒`;

    if (len <= 40) {
      textDurationLen.className = "font-mono text-xl font-black text-amber-300 mt-1";
      badgeLegal.textContent = "✓ 符合規範";
      badgeLegal.className = "text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold";
    } else {
      textDurationLen.className = "font-mono text-xl font-black text-red-400 mt-1";
      badgeLegal.textContent = "⚠ 超過 40 秒限制";
      badgeLegal.className = "text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold";
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
      playbackTime.innerHTML = `${formatTime(currentTime)} <span class="text-slate-500">/ ${formatTime(audioEngine.getDuration())}</span>`;
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
      audioEngine.play();
    }
  });

  btnPlayRange?.addEventListener("click", () => {
    if (!waveformViewer) return;
    audioEngine.play(waveformViewer.startSec, waveformViewer.endSec);
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

  document.querySelectorAll(".step-chip").forEach((btn) => {
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

  const inputFile = document.getElementById("input-file") as HTMLInputElement;
  const dropZone = document.getElementById("drop-zone");

  const loadFile = async (file: File) => {
    if (!file || !waveformViewer) return;
    currentSongTitle = file.name.replace(/\.[^/.]+$/, "");
    if (currentSongBadge) currentSongBadge.textContent = currentSongTitle;

    if (loadingOverlay) loadingOverlay.classList.remove("hidden");
    try {
      const buffer = await file.arrayBuffer();
      const decoded = await audioEngine.loadAudioData(buffer);
      waveformViewer.setAudioBuffer(decoded);
      waveformViewer.setRange(0, Math.min(29.5, decoded.duration));
      updateRangeUI(0, Math.min(29.5, decoded.duration));
      agent.sendMessage(`已載入音訊檔案《${currentSongTitle}》，長度約 ${Math.floor(decoded.duration)} 秒。`, decoded.duration, currentSongTitle)
        .then(() => renderChatMessages());
    } catch {
      alert("音訊解碼失敗，請確認檔案格式是否支援！");
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  };

  dropZone?.addEventListener("click", () => inputFile?.click());
  inputFile?.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files[0]) loadFile(files[0]);
  });

  //YouTube 解析載入真實音訊並繪製波形
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
          <span class="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
          <span class="font-mono tracking-wide">1/2 正在透過 yt-dlp 探測音軌中...</span>
        </div>
      `;
      loadingOverlay.classList.remove("hidden");
    }

    try {
      // 1. 取得影片標題與基本元數據
      const infoRes = await fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`);
      const infoData = await infoRes.json() as { success?: boolean; title?: string; duration?: number };
      if (infoData.title) {
        currentSongTitle = infoData.title;
        if (currentSongBadge) currentSongBadge.textContent = currentSongTitle;
      }

      // 2. 獲取音訊串流並解碼至 Web Audio
      if (loadingOverlay) {
        loadingOverlay.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
            <span class="font-mono tracking-wide">2/2 正在串流下載並生成波形...</span>
          </div>
        `;
      }

      const audioRes = await fetch(`/api/youtube-audio?url=${encodeURIComponent(url)}`);
      if (!audioRes.ok) throw new Error("音訊下載串流回應異常");
      const arrayBuffer = await audioRes.arrayBuffer();

      const decoded = await audioEngine.loadAudioData(arrayBuffer);
      waveformViewer.setAudioBuffer(decoded);
      waveformViewer.setRange(0, Math.min(29.5, decoded.duration));
      updateRangeUI(0, Math.min(29.5, decoded.duration));

      // 3. 調用 PI Agent 自動辨識歌曲副歌結構
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

  //一鍵分析所有副歌 (加入前端即時載入反饋與CMD/控制台同步)
  btnQuickAnalyze?.addEventListener("click", async () => {
    const dur = audioEngine.getDuration() || 242;
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

    // 1. 更新按鈕狀態為分析中
    const originalText = btnQuickAnalyze.innerHTML;
    btnQuickAnalyze.setAttribute("disabled", "true");
    btnQuickAnalyze.classList.add("opacity-70", "cursor-not-allowed");
    btnQuickAnalyze.innerHTML = `
      <span class="inline-block w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
      <span>AI 正在聽音分析中...</span>
    `;

    // 2. 在對話視窗中加入即時思考狀態
    agent.addThinkingMessage();
    renderChatMessages();

    try {
      console.log(`[RingFlow Client] 發送分析請求: 《${currentSongTitle}》, 時長: ${dur}s, 音訊附帶: ${!!base64}`);
      await agent.analyzeChorus(currentSongTitle, dur, base64);
    } catch (err) {
      console.error("[RingFlow Client] 分析請求異常:", err);
    } finally {
      btnQuickAnalyze.removeAttribute("disabled");
      btnQuickAnalyze.classList.remove("opacity-70", "cursor-not-allowed");
      btnQuickAnalyze.innerHTML = originalText;
      renderChatMessages();
    }
  });

  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    await agent.sendMessage(text, audioEngine.getDuration(), currentSongTitle);
    renderChatMessages();
  });

  document.getElementById("chat-container")?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("button");
    if (!target || !waveformViewer) return;

    if (target.classList.contains("btn-preview-chorus")) {
      const start = parseFloat(target.dataset.start || "0");
      const end = parseFloat(target.dataset.end || "0");
      audioEngine.play(start, end);
    } else if (target.classList.contains("btn-apply-chorus")) {
      const start = parseFloat(target.dataset.start || "0");
      const end = parseFloat(target.dataset.end || "0");
      waveformViewer.setRange(start, end);
      audioEngine.seek(start);
      document.getElementById("waveform-canvas")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  btnShareIos?.addEventListener("click", async () => {
    if (!waveformViewer || !audioEngine.getBuffer()) {
      alert("請先載入音訊並選取鈴聲區間！");
      return;
    }
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
          text: `由 RingFlow AI 製作的《${currentSongTitle}》鈴聲，儲存至檔案後可在 GarageBand 輸出。`,
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

  btnDownloadM4r?.addEventListener("click", async () => {
    if (!waveformViewer || !audioEngine.getBuffer()) {
      alert("請先載入音訊！");
      return;
    }
    const ringtoneBlob = await audioEngine.renderRingtoneBuffer(
      waveformViewer.startSec,
      waveformViewer.endSec,
      1.0,
      2.0
    );
    const fileName = `${currentSongTitle.replace(/\s+/g, "_")}_Ringtone.m4r`;
    const url = URL.createObjectURL(ringtoneBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  });

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
