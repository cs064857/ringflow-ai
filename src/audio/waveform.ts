//專業級音訊波形視覺化組件：含時間刻度尺、高動態對稱柱狀波形、選區光幕與雷射指針
export class WaveformViewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: AudioBuffer | null = null;
  private peaks: Float32Array | null = null;

  public startSec = 0;
  public endSec = 29.5;
  public currentSec = 0;

  private isDraggingStart = false;
  private isDraggingEnd = false;
  private hoverSec: number | null = null;

  public onRangeChange?: (start: number, end: number) => void;
  public onSeek?: (sec: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D Context 初始化失敗");
    this.ctx = context;

    this.setupEvents();
    window.addEventListener("resize", () => this.resize());
    setTimeout(() => this.resize(), 50);
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
    this.extractPeaks();
    this.startSec = 0;
    this.endSec = Math.min(29.5, buffer.duration);
    this.currentSec = 0;
    this.draw();
  }

  public setRange(start: number, end: number) {
    if (!this.buffer) return;
    this.startSec = Math.max(0, Math.min(start, this.buffer.duration));
    this.endSec = Math.max(this.startSec + 0.5, Math.min(end, this.buffer.duration));
    this.draw();
    if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
  }

  public setPlaybackPosition(sec: number) {
    this.currentSec = sec;
    this.draw();
  }

  private extractPeaks() {
    if (!this.buffer) return;
    const channelData = this.buffer.getChannelData(0);
    const numBars = 160;
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

    if (!this.buffer || !this.peaks) {
      this.drawEmptyState(width, height);
      return;
    }

    const duration = this.buffer.duration;
    const rulerHeight = 22;
    const waveTop = rulerHeight;
    const waveHeight = height - rulerHeight;
    const centerY = waveTop + waveHeight / 2;

    const startX = (this.startSec / duration) * width;
    const endX = (this.endSec / duration) * width;
    const currentX = (this.currentSec / duration) * width;
    const ringtoneLen = this.endSec - this.startSec;
    const isLegalLength = ringtoneLen <= 40;

    // 1. 繪製專業頂部時間刻度尺 (Timecode Ruler)
    this.drawRuler(width, rulerHeight, duration);

    // 2. 繪製選取區間的半透明光幕背景
    const selGrad = this.ctx.createLinearGradient(0, waveTop, 0, height);
    if (isLegalLength) {
      selGrad.addColorStop(0, "rgba(245, 158, 11, 0.12)");
      selGrad.addColorStop(1, "rgba(245, 158, 11, 0.03)");
    } else {
      selGrad.addColorStop(0, "rgba(239, 68, 68, 0.18)");
      selGrad.addColorStop(1, "rgba(239, 68, 68, 0.04)");
    }
    this.ctx.fillStyle = selGrad;
    this.ctx.fillRect(startX, waveTop, endX - startX, waveHeight);

    // 3. 繪製雙向對稱鏡像柱狀波形 (Pro Studio Mirrored Waveform)
    const numBars = this.peaks.length;
    const barWidth = width / numBars;
    const gap = Math.max(1.5, barWidth * 0.28);
    const actualBarWidth = Math.max(1, barWidth - gap);

    for (let i = 0; i < numBars; i++) {
      const barX = i * barWidth;
      const peak = this.peaks[i];
      const maxHalfHeight = (waveHeight / 2) * 0.85;
      const halfHeight = Math.max(2, peak * maxHalfHeight);

      const inSelection = barX >= startX - actualBarWidth && barX <= endX;

      if (inSelection) {
        //選區內漸變金色高光
        const barGrad = this.ctx.createLinearGradient(0, centerY - halfHeight, 0, centerY + halfHeight);
        if (isLegalLength) {
          barGrad.addColorStop(0, "#fbbf24");
          barGrad.addColorStop(0.5, "#f59e0b");
          barGrad.addColorStop(1, "#b45309");
        } else {
          barGrad.addColorStop(0, "#f87171");
          barGrad.addColorStop(0.5, "#ef4444");
          barGrad.addColorStop(1, "#991b1b");
        }
        this.ctx.fillStyle = barGrad;
      } else {
        //選區外暗鈦合金啞光
        this.ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
      }

      this.ctx.beginPath();
      this.ctx.roundRect(barX, centerY - halfHeight, actualBarWidth, halfHeight * 2, 2);
      this.ctx.fill();
    }

    // 4. 起點錨點指標 (Start Pin)
    this.drawHandle(startX, waveTop, height, "#fbbf24", "START 🚩", true);

    // 5. 終點錨點指標 (End Pin)
    this.drawHandle(endX, waveTop, height, isLegalLength ? "#f59e0b" : "#ef4444", "END 🏁", false);

    // 6. 播放雷射發光掃描指針 (Laser Playhead)
    if (this.currentSec >= 0 && this.currentSec <= duration) {
      this.ctx.save();
      this.ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
      this.ctx.shadowBlur = 8;
      this.ctx.strokeStyle = "#38bdf8";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, 0);
      this.ctx.lineTo(currentX, height);
      this.ctx.stroke();

      //頂部指示小菱形
      this.ctx.fillStyle = "#38bdf8";
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, 0);
      this.ctx.lineTo(currentX + 4, 6);
      this.ctx.lineTo(currentX, 12);
      this.ctx.lineTo(currentX - 4, 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  //繪製專業時間尺標
  private drawRuler(width: number, rulerHeight: number, duration: number) {
    this.ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    this.ctx.fillRect(0, 0, width, rulerHeight);

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, rulerHeight);
    this.ctx.lineTo(width, rulerHeight);
    this.ctx.stroke();

    const intervalSec = duration > 180 ? 30 : duration > 60 ? 10 : 5;
    this.ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    this.ctx.font = "9px 'JetBrains Mono', -apple-system, monospace";
    this.ctx.textAlign = "center";

    for (let t = 0; t <= duration; t += intervalSec) {
      const x = (t / duration) * width;
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      this.ctx.beginPath();
      this.ctx.moveTo(x, rulerHeight - 7);
      this.ctx.lineTo(x, rulerHeight);
      this.ctx.stroke();

      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      const label = `${min}:${sec.toString().padStart(2, "0")}`;
      this.ctx.fillText(label, x, rulerHeight - 10);
    }
  }

  //繪製專業指針把手
  private drawHandle(x: number, top: number, bottom: number, color: string, _label: string, isStart: boolean) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, top);
    this.ctx.lineTo(x, bottom);
    this.ctx.stroke();

    //把手觸控圓球
    const headY = isStart ? top + 10 : bottom - 10;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, headY, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#0f172a";
    this.ctx.beginPath();
    this.ctx.arc(x, headY, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawEmptyState(width: number, height: number) {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    this.ctx.fillRect(0, 0, width, height);

    //繪製微弱網格
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    this.ctx.font = "12px -apple-system, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("請貼上 YouTube 連結或將音訊檔拖曳至此", width / 2, height / 2 + 4);
  }

  private setupEvents() {
    const getXPos = (e: MouseEvent | TouchEvent): number => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(clientX - rect.left, rect.width));
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (!this.buffer) return;
      const x = getXPos(e);
      const rect = this.canvas.getBoundingClientRect();
      const duration = this.buffer.duration;
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
      if (!this.buffer) return;
      const x = getXPos(e);
      const rect = this.canvas.getBoundingClientRect();
      const duration = this.buffer.duration;
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
