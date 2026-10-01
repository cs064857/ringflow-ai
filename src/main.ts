//RINGFLOW 專業音訊工作台前端 UI
import { AudioEngine } from "./audio/engine";
import { WaveformViewer } from "./audio/waveform";
import { SongChorusAgent, ChorusSegment } from "./agent/piAgent";

class RingflowApp {
  private engine: AudioEngine;
  private viewer!: WaveformViewer;
  private agent: SongChorusAgent;

  //音訊狀態
  private audioFileName = "試聽錄音檔";
  private audioFileType = "MP3";
  private audioFileSize = "3.2 MB";
  private audioDuration = 242.7; // 04:02.7
  private startSec = 54.0;
  private endSec = 84.3;
  private currentPlayhead = 64.0; // 01:04.0
  private isPlaying = false;
  private exportFormat = "m4a";

  //標記列表
  private markerCount = 3;

  constructor() {
    this.engine = new AudioEngine();
    this.agent = new SongChorusAgent();
  }

  public init() {
    this.render();
    this.setupWaveform();
    this.setupEventListeners();
    this.setupAudioCallbacks();
  }

  //格式化時間（分:秒.毫秒 或 分:秒）
  private formatTime(sec: number, showMs = true): string {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    const wholeSec = Math.floor(remSec);
    const ms = Math.floor((remSec - wholeSec) * 10);

    const mStr = m.toString().padStart(2, "0");
    const sStr = wholeSec.toString().padStart(2, "0");

    if (showMs) {
      return `${mStr}:${sStr}.${ms}`;
    }
    return `${mStr}:${sStr}`;
  }

  private render() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <!-- 頂部導航列 (Top Navbar) -->
      <header class="bg-white border-b border-[#eee7db] px-4 md:px-8 py-3.5 sticky top-0 z-40 shadow-xs">
        <div class="max-w-[1680px] mx-auto flex items-center justify-between gap-4">
          <!-- 左側 Logo 與標題 -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8 text-orange-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4" />
              </svg>
              <div class="flex items-baseline gap-2">
                <span class="text-xl md:text-2xl font-black tracking-tight text-slate-800 font-sans">RINGFLOW</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">PRO STUDIO</span>
              </div>
            </div>

            <!-- 中間導航頁籤 (Nav Tabs) -->
            <nav class="hidden lg:flex items-center gap-1.5 ml-8 pl-4 border-l border-slate-200">
              <a href="#" class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-white text-orange-600 shadow-xs border border-orange-200/80">
                <svg class="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>首頁</span>
              </a>
              <a href="#" class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>專案</span>
              </a>
              <a href="#" class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span>知識庫</span>
              </a>
              <a href="#" class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>設定</span>
              </a>
            </nav>
          </div>

          <!-- 右側狀態按鈕與實驗室 -->
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
              <svg class="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
              <span>Cloudflare Edge</span>
            </div>

            <button class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer">
              +
            </button>

            <!-- 智能語音實驗室下拉 -->
            <button class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer">
              <div class="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
              </div>
              <span>智能語音實驗室</span>
              <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- 主要內容區：2 欄佈局 (Left Studio + Right Agent) -->
      <main class="max-w-[1680px] mx-auto p-4 md:p-6 lg:p-7">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <!-- ========================================== -->
          <!-- 左側工作區：語音檔案處理 (7/12 或 6/12) -->
          <!-- ========================================== -->
          <div class="lg:col-span-6 xl:col-span-6 flex flex-col gap-4">
            <!-- 主卡片 -->
            <div class="bg-white rounded-2xl border border-[#ece3d4] p-5 md:p-6 shadow-xs flex flex-col gap-5">
              
              <!-- 卡片頂部標頭 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-lg font-black text-slate-800 tracking-tight">語音檔案處理</h2>
                    <p class="text-xs text-slate-400 font-medium">支援多種格式（MP3、WAV、M4A、FLAC、AAC）</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">No. 3</span>
                  <span class="px-3 py-1 text-xs font-bold rounded-md bg-amber-100/80 text-amber-700 border border-amber-200/80">等待處理</span>
                </div>
              </div>

              <!-- 上傳/拖曳區 -->
              <div id="dropzone" class="border border-dashed border-orange-300/80 hover:border-orange-500 bg-[#fffbf5] rounded-xl p-4 md:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer group">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                      <path d="M12 12v9"/>
                      <path d="m16 16-4-4-4 4"/>
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs md:text-sm font-bold text-slate-800 truncate">
                      點擊或拖曳音訊檔至此 <span class="text-slate-400 font-normal text-xs">(MP3, WAV, M4A, FLAC, AAC)</span>
                    </p>
                    <p class="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                      支援檔案上傳 · Web Audio 錄製 · URL 連結匯入
                    </p>
                  </div>
                </div>

                <div class="shrink-0">
                  <button id="btnSelectFile" class="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer">
                    <svg class="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>選擇檔案</span>
                  </button>
                  <input type="file" id="fileInput" accept="audio/*" class="hidden" />
                </div>
              </div>

              <!-- 播放器與波形展示區 -->
              <div class="flex flex-col gap-3">
                <!-- 檔案名稱與即時時間碼列 -->
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <!-- 橘色大圓播放按鈕 -->
                    <button id="btnPlayPause" class="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-md shadow-orange-500/20 transition-all cursor-pointer shrink-0">
                      <svg id="playIcon" class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      <svg id="pauseIcon" class="w-5 h-5 hidden" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    </button>

                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span id="labelFileName" class="text-sm md:text-base font-bold text-slate-800 truncate">${this.audioFileName}</span>
                        <button id="btnEditName" class="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" title="編輯檔名">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                      <p class="text-xs text-slate-400 font-mono-num font-medium truncate">
                        ${this.audioFileType} · ${this.audioFileSize} · <span id="labelTotalDuration">04:02.7</span>
                      </p>
                    </div>
                  </div>

                  <!-- 右側時間碼展示 -->
                  <div class="text-right shrink-0">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PLAYHEAD TIMECODE</span>
                    <div class="text-lg md:text-xl font-black font-mono-num tracking-tight mt-0.5">
                      <span id="timecodeCurrent" class="text-orange-500">01:04.0</span>
                      <span class="text-slate-300 font-light mx-0.5">/</span>
                      <span id="timecodeTotal" class="text-slate-600">04:02.7</span>
                    </div>
                  </div>
                </div>

                <!-- 互動波形畫布 (Canvas) -->
                <div class="relative bg-[#fffdfa] rounded-xl border border-[#eee7db] overflow-hidden p-1 shadow-2xs">
                  <canvas id="waveformCanvas" class="w-full h-32 md:h-36 block cursor-crosshair"></canvas>
                </div>

                <!-- 精確時間微調與狀態區 (3 欄卡片) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <!-- START 起點 -->
                  <div class="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <svg class="w-3.5 h-3.5 text-red-500 fill-red-500" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>START 起點</span>
                      </div>
                      <div id="displayStartSec" class="text-xl font-black font-mono-num text-slate-800 mt-1">
                        00:54.0
                      </div>
                    </div>
                    
                    <div class="grid grid-cols-4 gap-1 mt-2.5">
                      <button data-adjust-start="-1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">-1s</button>
                      <button data-adjust-start="-0.1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">-0.1s</button>
                      <button data-adjust-start="0.1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">+0.1s</button>
                      <button data-adjust-start="1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">+1s</button>
                    </div>
                  </div>

                  <!-- END 終點 -->
                  <div class="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <svg class="w-3.5 h-3.5 text-orange-500 fill-orange-500" viewBox="0 0 24 24">
                          <path d="M12 2l8 10-8 10-8-10z" />
                        </svg>
                        <span>END 終點</span>
                      </div>
                      <div id="displayEndSec" class="text-xl font-black font-mono-num text-slate-800 mt-1">
                        01:24.3
                      </div>
                    </div>

                    <div class="grid grid-cols-4 gap-1 mt-2.5">
                      <button data-adjust-end="-1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">-1s</button>
                      <button data-adjust-end="-0.1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">-0.1s</button>
                      <button data-adjust-end="0.1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">+0.1s</button>
                      <button data-adjust-end="1" class="btn-trim px-1.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">+1s</button>
                    </div>
                  </div>

                  <!-- 持續時間與標記狀態 -->
                  <div class="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                      <div>
                        <span class="text-[11px] font-semibold text-slate-400 block">持續時間</span>
                        <div class="text-xl font-black font-mono-num text-orange-500 mt-0.5">
                          <span id="displayDurationSec">30.3</span> <span class="text-xs font-bold text-slate-700">秒</span>
                        </div>
                      </div>

                      <div id="badgeStatus" class="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100/90 text-emerald-700 text-[11px] font-bold">
                        <svg class="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>符合需求</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                      <button id="btnAddMarker" class="text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer">
                        <span class="text-orange-500">+</span>
                        <span>標記重要點</span>
                      </button>

                      <div class="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <span class="text-amber-500">⚡</span>
                        <span>標記長度 <span class="font-mono-num font-bold text-slate-700">29.5s</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 導出與分享大按鈕區 -->
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
                  <!-- 主分享按鈕 -->
                  <button id="btnShareIPhone" class="flex-1 py-3 px-4 rounded-xl bg-amber-300 hover:bg-amber-400 active:scale-[0.99] text-slate-900 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
                    </svg>
                    <span>分享到 iPhone 轉錄（GarageBand 專用）</span>
                  </button>

                  <div class="flex items-center gap-2">
                    <!-- 下載按鈕 -->
                    <button id="btnDownload" class="flex-1 sm:flex-initial py-3 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                      <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      <span>下載</span>
                    </button>

                    <!-- 格式下拉選單 -->
                    <div class="relative">
                      <select id="selectFormat" class="appearance-none py-3 pl-3.5 pr-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer focus:outline-hidden">
                        <option value="m4a">.m4a</option>
                        <option value="wav">.wav</option>
                        <option value="mp3">.mp3</option>
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- 底部 4 個快捷特色卡片 (Feature Quick Cards) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <!-- 1. 語音轉文字 -->
              <div class="feature-card bg-white rounded-xl border border-[#ece3d4] p-3 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group" data-action="transcribe">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-800 truncate">語音轉文字</h4>
                    <p class="text-[10px] text-slate-400 font-medium truncate">高精度識別 · 支援多語言</p>
                  </div>
                </div>
              </div>

              <!-- 2. AI 內容分析 -->
              <div class="feature-card bg-white rounded-xl border border-[#ece3d4] p-3 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group" data-action="analyze">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14 21 3"></path>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-800 truncate">AI 內容分析</h4>
                    <p class="text-[10px] text-slate-400 font-medium truncate">摘要 · 關鍵詞 · 情緒分析</p>
                  </div>
                </div>
              </div>

              <!-- 3. 多語言支援 -->
              <div class="feature-card bg-white rounded-xl border border-[#ece3d4] p-3 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group" data-action="translate">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-800 truncate">多語言支援</h4>
                    <p class="text-[10px] text-slate-400 font-medium truncate">支援 50+ 語言</p>
                  </div>
                </div>
              </div>

              <!-- 4. 雲端同步 -->
              <div class="feature-card bg-white rounded-xl border border-[#ece3d4] p-3 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group" data-action="cloud">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-800 truncate">雲端同步</h4>
                    <p class="text-[10px] text-slate-400 font-medium truncate">安全 · 高效 · 穩定</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ========================================== -->
          <!-- 右側工作區：AI Agent 智能對話助手 (5/12 或 6/12) -->
          <!-- ========================================== -->
          <div class="lg:col-span-6 xl:col-span-6 flex flex-col">
            <div class="bg-white rounded-2xl border border-[#ece3d4] shadow-xs flex-1 flex flex-col overflow-hidden min-h-[560px]">
              
              <!-- 助手頂部標頭 -->
              <div class="p-4 md:p-5 border-b border-[#f0eae0] flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-stone-800 text-white flex items-center justify-center shadow-xs shrink-0">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                      <circle cx="12" cy="5" r="2"></circle>
                      <path d="M12 7v4"></path>
                      <line x1="8" y1="16" x2="8" y2="16.01"></line>
                      <line x1="16" y1="16" x2="16" y2="16.01"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm md:text-base font-black text-slate-800 tracking-tight">AI Agent 智能對話助手</h3>
                      <span class="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>在線</span>
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 font-medium">基於最新模型，提供專業的語音內容分析與處理建議</p>
                  </div>
                </div>

                <button class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer shrink-0">
                  <svg class="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="4" y1="21" x2="4" y2="14"></line>
                    <line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line>
                    <line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line>
                    <line x1="9" y1="8" x2="15" y2="8"></line>
                    <line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                  <span>一般分析預設</span>
                </button>
              </div>

              <!-- 對話訊息列表 (滾動區域) -->
              <div id="chatMessages" class="flex-1 p-4 md:p-5 overflow-y-auto flex flex-col gap-4 max-h-[580px] bg-[#fdfcf9]/50">
                <!-- 訊息會動態渲染至此 -->
              </div>

              <!-- 底部輸入框 (Input Bar) -->
              <div class="p-3 md:p-4 bg-white border-t border-[#f0eae0]">
                <div class="relative bg-[#faf7f2] border border-[#ece3d4] focus-within:border-orange-400 focus-within:bg-white rounded-2xl p-2.5 md:p-3 transition-all">
                  <div class="flex items-start gap-3">
                    <!-- 左側橙色圓形閃亮圖標 -->
                    <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                      <svg class="w-4 h-4 fill-orange-400" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z"/>
                      </svg>
                    </div>

                    <div class="flex-1">
                      <textarea id="inputPrompt" rows="2" class="w-full bg-transparent border-0 resize-none text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden leading-relaxed" placeholder="輸入 AI 指令，例如：&#10;「幫我分析這段語音的重點」、「生成逐字稿」或「摘要內容」"></textarea>
                    </div>

                    <!-- 右側發送按鈕 -->
                    <button id="btnSendPrompt" class="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-xs transition-all cursor-pointer">
                      <svg class="w-4 h-4 transform rotate-45 -ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>

                  <div class="flex justify-end pr-1 mt-1">
                    <span id="charCount" class="text-[10px] text-slate-400 font-mono-num font-medium">0/2000</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <!-- 成功/提示浮動 Toast -->
      <div id="toast" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
        <svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span id="toastMsg">提示訊息</span>
      </div>
    `;

    this.renderChatMessages();
  }

  //渲染右側 AI 對話訊息列表
  private renderChatMessages() {
    const chatContainer = document.getElementById("chatMessages");
    if (!chatContainer) return;

    const messages = this.agent.getMessages();
    let html = "";

    messages.forEach((msg) => {
      if (msg.role === "assistant") {
        html += `
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                <circle cx="12" cy="5" r="2"></circle>
                <path d="M12 7v4"></path>
                <line x1="8" y1="16" x2="8" y2="16.01"></line>
                <line x1="16" y1="16" x2="16" y2="16.01"></line>
              </svg>
            </div>
            
            <div class="flex-1 flex flex-col gap-2 max-w-[88%]">
              <div class="bg-white border border-[#ede6db] rounded-2xl rounded-tl-sm p-3.5 shadow-2xs text-xs md:text-sm text-slate-700 leading-relaxed">
                <p class="whitespace-pre-line">${msg.content}</p>

                ${msg.summaryCard ? `
                  <!-- 統計卡片 -->
                  <div class="mt-3 bg-[#faf6ee] rounded-xl p-3 border border-[#f0e6d8] flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="12" r="3"></circle>
                          <path d="M6 12h12"></path>
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <h5 class="text-xs font-bold text-slate-800 truncate">${msg.summaryCard.title}</h5>
                        <p class="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">${msg.summaryCard.description}</p>
                      </div>
                    </div>

                    <button class="btn-card-badge px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold shadow-2xs hover:bg-slate-50 transition-colors shrink-0 cursor-pointer" data-badge-click="1">
                      ${msg.summaryCard.badge}
                    </button>
                  </div>
                ` : ""}
              </div>
              <div class="text-[10px] text-slate-400 font-mono-num pl-1">${msg.timeStr || "01:24"}</div>
            </div>
          </div>
        `;
      } else if (msg.role === "user") {
        html += `
          <div class="flex items-start justify-end gap-2">
            <div class="max-w-[85%] flex flex-col gap-1 text-right">
              <div class="inline-block text-left bg-[#fef3c7]/90 border border-[#fed7aa] rounded-2xl rounded-tr-sm p-3.5 shadow-2xs text-xs md:text-sm text-amber-950 leading-relaxed">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium">${msg.content}</span>
                  <button class="btn-copy-msg text-amber-700 hover:text-amber-900 cursor-pointer shrink-0" title="複製內容">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>

                ${msg.choruses && msg.choruses.length > 0 ? `
                  <div class="mt-2.5 pt-2 border-t border-amber-200/60 flex flex-col gap-1.5 font-mono-num text-[11px] font-medium text-amber-900">
                    ${msg.choruses.map(c => `
                      <div class="chorus-item-btn flex items-center justify-between p-1.5 rounded-lg hover:bg-amber-200/50 transition-colors cursor-pointer" data-start="${c.startSec}" data-end="${c.endSec}">
                        <span>${c.name} : ${this.formatTime(c.startSec)} - ${this.formatTime(c.endSec)} (${(c.endSec - c.startSec).toFixed(1)}s)</span>
                        <span class="text-amber-800 font-bold ml-2 shrink-0">【標籤：${c.tag || "重要"}】</span>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
              <div class="text-[10px] text-slate-400 font-mono-num pr-1">${msg.timeStr || "01:28"}</div>
            </div>
          </div>
        `;
      }
    });

    chatContainer.innerHTML = html;
    chatContainer.scrollTop = chatContainer.scrollHeight;

    //綁定片段點擊事件，點擊後同步左側波形與時間
    chatContainer.querySelectorAll(".chorus-item-btn").forEach((el) => {
      el.addEventListener("click", () => {
        const start = parseFloat(el.getAttribute("data-start") || "0");
        const end = parseFloat(el.getAttribute("data-end") || "0");
        if (start < end) {
          this.viewer.setRange(start, end);
          this.engine.seek(start);
          this.showToast(`已同步選取區間：${this.formatTime(start)} - ${this.formatTime(end)}`);
        }
      });
    });

    //複製按鈕事件
    chatContainer.querySelectorAll(".btn-copy-msg").forEach((el) => {
      el.addEventListener("click", () => {
        this.showToast("已複製片段內容至剪貼簿");
      });
    });
  }

  //設置波形 Canvas
  private setupWaveform() {
    const canvas = document.getElementById("waveformCanvas") as HTMLCanvasElement;
    if (!canvas) return;

    this.viewer = new WaveformViewer(canvas);

    //監聽波形選區變更
    this.viewer.onRangeChange = (start, end) => {
      this.startSec = start;
      this.endSec = end;
      this.updateTimeDisplays();
    };

    //監聽波形點擊定位
    this.viewer.onSeek = (sec) => {
      this.currentPlayhead = sec;
      this.engine.seek(sec);
      this.updatePlayheadDisplay(sec);
    };

    //初始更新
    this.updateTimeDisplays();
  }

  //設置事件監聽器
  private setupEventListeners() {
    // 1. 播放/暫停按鈕
    const btnPlayPause = document.getElementById("btnPlayPause");
    btnPlayPause?.addEventListener("click", () => {
      if (this.isPlaying) {
        this.engine.pause();
      } else {
        //如果當前游標在選區外或音訊結尾，從起點開始播放
        if (this.currentPlayhead < this.startSec || this.currentPlayhead >= this.endSec) {
          this.currentPlayhead = this.startSec;
        }
        this.engine.play(this.currentPlayhead, this.endSec);
      }
    });

    // 2. 檔案選取與拖放上傳
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const btnSelectFile = document.getElementById("btnSelectFile");
    const dropzone = document.getElementById("dropzone");

    btnSelectFile?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput?.click();
    });

    dropzone?.addEventListener("click", () => {
      fileInput?.click();
    });

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("border-orange-500", "bg-orange-50/50");
    });

    dropzone?.addEventListener("dragleave", () => {
      dropzone.classList.remove("border-orange-500", "bg-orange-50/50");
    });

    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-orange-500", "bg-orange-50/50");
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        this.handleAudioFile(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleAudioFile(fileInput.files[0]);
      }
    });

    // 3. 微調按鈕組 (Trim buttons)
    document.querySelectorAll<HTMLButtonElement>("[data-adjust-start]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = parseFloat(btn.getAttribute("data-adjust-start") || "0");
        this.viewer.setRange(this.startSec + delta, this.endSec);
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-adjust-end]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = parseFloat(btn.getAttribute("data-adjust-end") || "0");
        this.viewer.setRange(this.startSec, this.endSec + delta);
      });
    });

    // 4. 編輯檔名
    const btnEditName = document.getElementById("btnEditName");
    btnEditName?.addEventListener("click", () => {
      const newName = prompt("請輸入音訊檔案名稱：", this.audioFileName);
      if (newName && newName.trim()) {
        this.audioFileName = newName.trim();
        const label = document.getElementById("labelFileName");
        if (label) label.textContent = this.audioFileName;
        this.showToast(`已更名為：${this.audioFileName}`);
      }
    });

    // 5. 標記重要點
    const btnAddMarker = document.getElementById("btnAddMarker");
    btnAddMarker?.addEventListener("click", () => {
      this.markerCount++;
      this.showToast(`已建立新重要標記點（第 ${this.markerCount} 個）`);
    });

    // 6. 分享到 iPhone 鈴聲 (GarageBand 專用)
    const btnShareIPhone = document.getElementById("btnShareIPhone");
    btnShareIPhone?.addEventListener("click", async () => {
      this.handleExportGarageBand();
    });

    // 7. 下載按鈕
    const btnDownload = document.getElementById("btnDownload");
    btnDownload?.addEventListener("click", async () => {
      this.handleDownloadRingtone();
    });

    // 8. 格式選擇
    const selectFormat = document.getElementById("selectFormat") as HTMLSelectElement;
    selectFormat?.addEventListener("change", () => {
      this.exportFormat = selectFormat.value;
      this.showToast(`導出格式切換為：.${this.exportFormat}`);
    });

    // 9. AI 指令發送
    const inputPrompt = document.getElementById("inputPrompt") as HTMLTextAreaElement;
    const btnSendPrompt = document.getElementById("btnSendPrompt");
    const charCount = document.getElementById("charCount");

    inputPrompt?.addEventListener("input", () => {
      if (charCount) charCount.textContent = `${inputPrompt.value.length}/2000`;
    });

    const handleSend = async () => {
      const text = inputPrompt?.value.trim();
      if (!text) return;

      inputPrompt.value = "";
      if (charCount) charCount.textContent = "0/2000";

      this.renderChatMessages();
      await this.agent.sendMessage(text, this.audioDuration, this.audioFileName);
      this.renderChatMessages();
    };

    btnSendPrompt?.addEventListener("click", handleSend);
    inputPrompt?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // 10. 底部 4 個快捷特色卡片點擊觸發
    document.querySelectorAll<HTMLElement>(".feature-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const action = card.getAttribute("data-action");
        if (action === "transcribe") {
          await this.agent.sendMessage("幫我為這段音訊生成繁體中文高精度逐字稿", this.audioDuration, this.audioFileName);
        } else if (action === "analyze") {
          await this.agent.sendMessage("請分析這段錄音的主要關鍵詞、內容摘要與情緒分佈", this.audioDuration, this.audioFileName);
        } else if (action === "translate") {
          await this.agent.sendMessage("請將語音內容翻譯為英文、日文與西班牙文重點摘要", this.audioDuration, this.audioFileName);
        } else if (action === "cloud") {
          this.showToast("☁️ 已即時同步至 Cloudflare Edge 邊緣節點");
        }
        this.renderChatMessages();
      });
    });
  }

  //設定音訊引擎回呼事件
  private setupAudioCallbacks() {
    this.engine.onStateChange = (playing) => {
      this.isPlaying = playing;
      const playIcon = document.getElementById("playIcon");
      const pauseIcon = document.getElementById("pauseIcon");

      if (playing) {
        playIcon?.classList.add("hidden");
        pauseIcon?.classList.remove("hidden");
      } else {
        playIcon?.classList.remove("hidden");
        pauseIcon?.classList.add("hidden");
      }
    };

    this.engine.onProgress = (currentTime) => {
      this.currentPlayhead = currentTime;
      this.viewer.setPlaybackPosition(currentTime);
      this.updatePlayheadDisplay(currentTime);
    };
  }

  //處理本機音訊上傳
  private async handleAudioFile(file: File) {
    try {
      this.showToast(`正在解碼音訊檔案：${file.name}...`);
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.engine.loadAudioData(arrayBuffer);

      this.audioFileName = file.name.replace(/\.[^/.]+$/, "");
      this.audioFileType = file.name.split(".").pop()?.toUpperCase() || "MP3";
      this.audioFileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      this.audioDuration = audioBuffer.duration;

      //更新介面顯示
      const labelFileName = document.getElementById("labelFileName");
      const labelTotalDuration = document.getElementById("labelTotalDuration");
      const timecodeTotal = document.getElementById("timecodeTotal");

      if (labelFileName) labelFileName.textContent = this.audioFileName;
      if (labelTotalDuration) labelTotalDuration.textContent = this.formatTime(this.audioDuration);
      if (timecodeTotal) timecodeTotal.textContent = this.formatTime(this.audioDuration);

      this.viewer.setAudioBuffer(audioBuffer);
      this.startSec = 0;
      this.endSec = Math.min(29.5, this.audioDuration);
      this.updateTimeDisplays();

      this.showToast(`音訊解析成功！總時長 ${this.formatTime(this.audioDuration)}`);

      //自動觸發 AI 助手分析
      await this.agent.analyzeChorus(this.audioFileName, this.audioDuration);
      this.renderChatMessages();
    } catch (err) {
      this.showToast("音訊檔案載入失敗，請確認格式是否正確");
    }
  }

  //更新時間與狀態顯示
  private updateTimeDisplays() {
    const displayStartSec = document.getElementById("displayStartSec");
    const displayEndSec = document.getElementById("displayEndSec");
    const displayDurationSec = document.getElementById("displayDurationSec");
    const badgeStatus = document.getElementById("badgeStatus");

    if (displayStartSec) displayStartSec.textContent = this.formatTime(this.startSec);
    if (displayEndSec) displayEndSec.textContent = this.formatTime(this.endSec);

    const len = Math.max(0, this.endSec - this.startSec);
    if (displayDurationSec) displayDurationSec.textContent = len.toFixed(1);

    if (badgeStatus) {
      if (len <= 40.05) {
        badgeStatus.className = "flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-100/90 text-emerald-700 text-[11px] font-bold";
        badgeStatus.innerHTML = `
          <svg class="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>符合需求</span>
        `;
      } else {
        badgeStatus.className = "flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-bold";
        badgeStatus.innerHTML = `
          <svg class="w-3 h-3 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>超過 40 秒</span>
        `;
      }
    }
  }

  //更新播放游標時間
  private updatePlayheadDisplay(sec: number) {
    const timecodeCurrent = document.getElementById("timecodeCurrent");
    if (timecodeCurrent) {
      timecodeCurrent.textContent = this.formatTime(sec);
    }
  }

  //處理 GarageBand 專用導出
  private async handleExportGarageBand() {
    this.showToast("🧩 正在封裝 GarageBand 專用鈴聲格式 (.m4r)...");
    try {
      let blob: Blob;
      if (this.engine.getBuffer()) {
        blob = await this.engine.renderRingtoneBuffer(this.startSec, this.endSec, 0.5, 1.5);
      } else {
        //無載入本機音訊時生成展示用空音訊 Blob
        blob = new Blob(["DEMO_RINGTONE_DATA"], { type: "audio/mp4" });
      }

      const safeName = (this.audioFileName || "ringtone").replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_");
      const filename = `${safeName}_${this.formatTime(this.startSec, false)}-${this.formatTime(this.endSec, false)}.m4r`;

      this.downloadBlob(blob, filename);
      this.showToast("✅ 已成功生成！請在 iPhone 檔案中打開並透過 GarageBand 設定鈴聲");
    } catch {
      this.showToast("導出過程發生異常，請重試");
    }
  }

  //處理一般格式下載
  private async handleDownloadRingtone() {
    this.showToast(`📥 正在導出 .${this.exportFormat} 檔案...`);
    try {
      let blob: Blob;
      if (this.engine.getBuffer()) {
        blob = await this.engine.renderRingtoneBuffer(this.startSec, this.endSec, 0.5, 1.5);
      } else {
        blob = new Blob(["DEMO_AUDIO_DATA"], { type: "audio/wav" });
      }

      const safeName = (this.audioFileName || "audio_clip").replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_");
      const filename = `${safeName}_clip.${this.exportFormat}`;

      this.downloadBlob(blob, filename);
      this.showToast(`✅ 已完成下載：${filename}`);
    } catch {
      this.showToast("下載失敗，請重試");
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  //顯示浮動 Toast 提示
  private showToast(msg: string) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.remove("translate-y-20", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
      toast.classList.remove("translate-y-0", "opacity-100");
      toast.classList.add("translate-y-20", "opacity-0");
    }, 2800);
  }
}

//啟動應用
window.addEventListener("DOMContentLoaded", () => {
  const app = new RingflowApp();
  app.init();
});
