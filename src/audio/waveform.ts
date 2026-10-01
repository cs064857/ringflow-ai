//專業級音訊波形視覺化組件：含時間刻度尺、暖橘柱狀波形、選區光幕與手柄
export class WaveformViewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: AudioBuffer | null = null;
  private peaks: Float32Array | null = null;
  private virtualDuration = 242.7; //預設展示時長 04:02.7

  public startSec = 54.0;
  public endSec = 84.3;
  public currentSec = 64.0;

  private isDraggingStart = false;
  private isDraggingEnd = false;

  public onRangeChange?: (start: number, end: number) => void;
  public onSeek?: (sec: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D Context 初始化失敗");
    this.ctx = context;

    this.initDemoPeaks();
    this.setupEvents();
    window.addEventListener("resize", () => this.resize());
    setTimeout(() => this.resize(), 50);
  }

  //生成高擬真預設展示波形 (符合 04:02.7 搖滾樂起伏)
  private initDemoPeaks() {
    const numBars = 150;
    this.peaks = new Float32Array(numBars);
    for (let i = 0; i < numBars; i++) {
      const ratio = i / numBars;
      //模擬歌曲能量動態：前奏低、主歌漸強、副歌爆發、間奏平緩、最終副歌最高
      const base = 0.35 + 0.25 * Math.sin(ratio * Math.PI * 3.5);
      const isChorus1 = ratio >= 0.22 && ratio <= 0.38;
      const isChorus2 = ratio >= 0.60 && ratio <= 0.76;
      const boost = isChorus1 ? 0.35 : isChorus2 ? 0.4 : 0;
      const jitter = ((i * 17) % 19) / 100 - 0.09;
      this.peaks[i] = Math.min(0.95, Math.max(0.18, base + boost + jitter));
    }
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  public setAudioBuffer(buffer: AudioBuffer) {
    this.buffer = buffer;
    this.virtualDuration = buffer.duration;
    this.extractPeaks();
    this.startSec = 54.0;
    this.endSec = Math.min(84.3, buffer.duration);
    this.currentSec = 0;
    this.draw();
  }

  public setRange(start: number, end: number) {
    const duration = this.getDuration();
    this.startSec = Math.max(0, Math.min(start, duration));
    this.endSec = Math.max(this.startSec + 0.5, Math.min(end, duration));
    this.draw();
    if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
  }

  public setPlaybackPosition(sec: number) {
    this.currentSec = sec;
    this.draw();
  }

  public getDuration(): number {
    return this.buffer ? this.buffer.duration : this.virtualDuration;
  }

  private extractPeaks() {
    if (!this.buffer) return;
    const channelData = this.buffer.getChannelData(0);
    const numBars = 150;
    const step = Math.floor(channelData.length / numBars);
    this.peaks = new Float32Array(numBars);

    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * step;
      const end = start + step;
      for (let j = start; j < end; j += 8) {
        const val = Math.abs(channelData[j] || 0);
        if (val > max) max = val;
      }
      this.peaks[i] = Math.min(1.0, Math.pow(max, 0.75) * 1.25);
    }
  }

  public draw() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    if (!this.peaks) {
      return;
    }

    const duration = this.getDuration();
    const rulerHeight = 24;
    const waveTop = rulerHeight;
    const waveHeight = height - rulerHeight;
    const centerY = waveTop + waveHeight / 2;

    const startX = (this.startSec / duration) * width;
    const endX = (this.endSec / duration) * width;
    const currentX = (this.currentSec / duration) * width;
    const ringtoneLen = this.endSec - this.startSec;
    const isLegalLength = ringtoneLen <= 40;

    // 1. 繪製頂部時間刻度尺 (Ruler)
    this.drawRuler(width, rulerHeight, duration);

    // 2. 繪製選取區間的淡橘色光幕背景
    const selGrad = this.ctx.createLinearGradient(0, waveTop, 0, height);
    if (isLegalLength) {
      selGrad.addColorStop(0, "rgba(251, 146, 60, 0.25)");
      selGrad.addColorStop(1, "rgba(251, 146, 60, 0.08)");
    } else {
      selGrad.addColorStop(0, "rgba(239, 68, 68, 0.25)");
      selGrad.addColorStop(1, "rgba(239, 68, 68, 0.06)");
    }
    this.ctx.fillStyle = selGrad;
    this.ctx.fillRect(startX, waveTop, endX - startX, waveHeight);

    // 3. 繪製雙向對稱柱狀波形
    const numBars = this.peaks.length;
    const barWidth = width / numBars;
    const gap = Math.max(1.2, barWidth * 0.25);
    const actualBarWidth = Math.max(1, barWidth - gap);

    for (let i = 0; i < numBars; i++) {
      const barX = i * barWidth;
      const peak = this.peaks[i];
      const maxHalfHeight = (waveHeight / 2) * 0.82;
      const halfHeight = Math.max(2, peak * maxHalfHeight);

      const inSelection = barX >= startX - actualBarWidth && barX <= endX;

      if (inSelection) {
        //選區內活力橙黃漸層
        const barGrad = this.ctx.createLinearGradient(0, centerY - halfHeight, 0, centerY + halfHeight);
        if (isLegalLength) {
          barGrad.addColorStop(0, "#fb923c");
          barGrad.addColorStop(0.5, "#f97316");
          barGrad.addColorStop(1, "#ea580c");
        } else {
          barGrad.addColorStop(0, "#f87171");
          barGrad.addColorStop(0.5, "#ef4444");
          barGrad.addColorStop(1, "#dc2626");
        }
        this.ctx.fillStyle = barGrad;
      } else {
        //選區外溫暖淡杏色柱狀
        this.ctx.fillStyle = "rgba(251, 146, 60, 0.32)";
      }

      this.ctx.beginPath();
      this.ctx.roundRect(barX, centerY - halfHeight, actualBarWidth, halfHeight * 2, 2);
      this.ctx.fill();
    }

    // 4. 起點錨點把手 (START)
    this.drawHandle(startX, waveTop, height, "#f97316", true);

    // 5. 終點錨點把手 (END)
    this.drawHandle(endX, waveTop, height, isLegalLength ? "#ea580c" : "#ef4444", false);

    // 6. 播放進度雷射指針
    if (this.currentSec >= 0 && this.currentSec <= duration) {
      this.ctx.save();
      this.ctx.shadowColor = "rgba(234, 88, 12, 0.4)";
      this.ctx.shadowBlur = 6;
      this.ctx.strokeStyle = "#ea580c";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, 0);
      this.ctx.lineTo(currentX, height);
      this.ctx.stroke();

      //頂部指示菱形
      this.ctx.fillStyle = "#ea580c";
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, 0);
      this.ctx.lineTo(currentX + 4.5, 6.5);
      this.ctx.lineTo(currentX, 13);
      this.ctx.lineTo(currentX - 4.5, 6.5);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  //繪製淺色時間刻度尺 (如 0:00, 0:30, 1:00, 1:30, 2:00, 2:30, 3:00, 3:30, 4:02)
  private drawRuler(width: number, rulerHeight: number, duration: number) {
    this.ctx.fillStyle = "#faf8f5";
    this.ctx.fillRect(0, 0, width, rulerHeight);

    this.ctx.strokeStyle = "#eee6dc";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, rulerHeight);
    this.ctx.lineTo(width, rulerHeight);
    this.ctx.stroke();

    const intervalSec = 30; //每 30 秒一個刻度，完美匹配圖片
    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "10px -apple-system, BlinkMacSystemFont, monospace";
    this.ctx.textAlign = "center";

    for (let t = 0; t <= duration; t += intervalSec) {
      const x = (t / duration) * width;
      this.ctx.strokeStyle = "#cbd5e1";
      this.ctx.beginPath();
      this.ctx.moveTo(x, rulerHeight - 5);
      this.ctx.lineTo(x, rulerHeight);
      this.ctx.stroke();

      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      const label = `${min}:${sec.toString().padStart(2, "0")}`;
      this.ctx.fillText(label, x, rulerHeight - 8);
    }

    //繪製總時長結尾標籤 (如 4:02)
    const endX = width - 12;
    const totalMin = Math.floor(duration / 60);
    const totalSec = Math.floor(duration % 60);
    this.ctx.fillText(`${totalMin}:${totalSec.toString().padStart(2, "0")}`, endX, rulerHeight - 8);
  }

  //繪製指針把手與菱形標記
  private drawHandle(x: number, top: number, bottom: number, color: string, isStart: boolean) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, top);
    this.ctx.lineTo(x, bottom);
    this.ctx.stroke();

    //頂部或底部菱形指示標
    const tagY = isStart ? top + 8 : bottom - 8;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, tagY - 6);
    this.ctx.lineTo(x + 5, tagY);
    this.ctx.lineTo(x, tagY + 6);
    this.ctx.lineTo(x - 5, tagY);
    this.ctx.closePath();
    this.ctx.fill();

    //中心小白點
    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.arc(x, tagY, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private setupEvents() {
    const getXPos = (e: MouseEvent | TouchEvent): number => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(clientX - rect.left, rect.width));
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      const x = getXPos(e);
      const rect = this.canvas.getBoundingClientRect();
      const duration = this.getDuration();
      const startX = (this.startSec / duration) * rect.width;
      const endX = (this.endSec / duration) * rect.width;

      if (Math.abs(x - startX) <= 24) {
        this.isDraggingStart = true;
      } else if (Math.abs(x - endX) <= 24) {
        this.isDraggingEnd = true;
      } else {
        const clickSec = (x / rect.width) * duration;
        if (this.onSeek) this.onSeek(clickSec);
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = getXPos(e);
      const rect = this.canvas.getBoundingClientRect();
      const duration = this.getDuration();
      const targetSec = (x / rect.width) * duration;

      if (this.isDraggingStart) {
        this.startSec = Math.max(0, Math.min(targetSec, this.endSec - 0.5));
        this.draw();
        if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
      } else if (this.isDraggingEnd) {
        this.endSec = Math.max(this.startSec + 0.5, Math.min(targetSec, duration));
        this.draw();
        if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
      }
    };

    const handleEnd = () => {
      this.isDraggingStart = false;
      this.isDraggingEnd = false;
    };

    this.canvas.addEventListener("mousedown", handleStart);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
  }
}
