//專業級音訊波形視覺化組件：含時間刻度尺、暖橘柱狀波形、選區光幕與手柄
export class WaveformViewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: AudioBuffer | null = null;
  private peaks: Float32Array | null = null;
  private virtualDuration = 242.7; //預設 04:02.7

  public startSec = 54.0;
  public endSec = 84.3;
  public currentSec = 64.0; //對應 01:04.0

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

  //生成高擬真預設展示波形
  private initDemoPeaks() {
    const numBars = 160;
    this.peaks = new Float32Array(numBars);
    for (let i = 0; i < numBars; i++) {
      const ratio = i / numBars;
      const base = 0.32 + 0.22 * Math.sin(ratio * Math.PI * 4);
      const isChorus1 = ratio >= 0.20 && ratio <= 0.38;
      const isChorus2 = ratio >= 0.60 && ratio <= 0.78;
      const boost = isChorus1 ? 0.38 : isChorus2 ? 0.42 : 0;
      const jitter = ((i * 23) % 29) / 120 - 0.08;
      this.peaks[i] = Math.min(0.96, Math.max(0.18, base + boost + jitter));
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

    if (!this.peaks) return;

    const duration = this.getDuration();
    const rulerHeight = 22;
    const waveTop = rulerHeight;
    const waveHeight = height - rulerHeight;
    const centerY = waveTop + waveHeight / 2;

    const startX = (this.startSec / duration) * width;
    const endX = (this.endSec / duration) * width;
    const currentX = (this.currentSec / duration) * width;
    const ringtoneLen = this.endSec - this.startSec;
    const isLegalLength = ringtoneLen <= 40;

    // 1. 繪製頂部時間刻度標尺 (Ruler)
    this.drawRuler(width, rulerHeight, duration);

    // 2. 繪製選取區間的暖橘色半透明光幕背景
    this.ctx.fillStyle = isLegalLength ? "rgba(251, 146, 60, 0.22)" : "rgba(239, 68, 68, 0.22)";
    this.ctx.fillRect(startX, waveTop, endX - startX, waveHeight);

    // 3. 繪製雙向對稱柱狀波形
    const numBars = this.peaks.length;
    const barWidth = width / numBars;
    const gap = Math.max(1.2, barWidth * 0.28);
    const actualBarWidth = Math.max(1.2, barWidth - gap);

    for (let i = 0; i < numBars; i++) {
      const barX = i * barWidth;
      const peak = this.peaks[i];
      const maxHalfHeight = (waveHeight / 2) * 0.85;
      const halfHeight = Math.max(2, peak * maxHalfHeight);

      const inSelection = barX >= startX - actualBarWidth && barX <= endX;

      if (inSelection) {
        //選區內鮮明橙黃漸層
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
        //選區外溫暖淺杏色柱狀
        this.ctx.fillStyle = "rgba(244, 207, 182, 0.85)";
      }

      this.ctx.beginPath();
      this.ctx.roundRect(barX, centerY - halfHeight, actualBarWidth, halfHeight * 2, 1.5);
      this.ctx.fill();
    }

    // 4. 起點錨點指標 (START 🚩)
    this.drawHandle(startX, waveTop, height, "#f97316", true);

    // 5. 終點錨點指標 (END 🏁)
    this.drawHandle(endX, waveTop, height, isLegalLength ? "#f97316" : "#ef4444", false);

    // 6. 播放雷射進度指針
    if (this.currentSec >= 0 && this.currentSec <= duration) {
      this.ctx.save();
      this.ctx.strokeStyle = "#f97316";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, 0);
      this.ctx.lineTo(currentX, height);
      this.ctx.stroke();

      //頂部指示菱形
      this.ctx.fillStyle = "#ea580c";
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, 0);
      this.ctx.lineTo(currentX + 4.5, 6);
      this.ctx.lineTo(currentX, 12);
      this.ctx.lineTo(currentX - 4.5, 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  //繪製淺色時間刻度標尺 (0:00, 0:30, 1:00, 1:30, 2:00, 2:30, 3:00, 3:30, 4:02)
  private drawRuler(width: number, rulerHeight: number, duration: number) {
    this.ctx.fillStyle = "#fcfaf7";
    this.ctx.fillRect(0, 0, width, rulerHeight);

    this.ctx.strokeStyle = "#eee4d8";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, rulerHeight);
    this.ctx.lineTo(width, rulerHeight);
    this.ctx.stroke();

    const intervalSec = width < 400 ? 60 : 30; //手機螢幕小則每 60 秒一個標籤，避免擁擠
    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "9.5px -apple-system, BlinkMacSystemFont, monospace";

    for (let t = 0; t < duration - 18; t += intervalSec) {
      const x = (t / duration) * width;
      this.ctx.strokeStyle = "#cbd5e1";
      this.ctx.beginPath();
      this.ctx.moveTo(x, rulerHeight - 5);
      this.ctx.lineTo(x, rulerHeight);
      this.ctx.stroke();

      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      const label = `${min}:${sec.toString().padStart(2, "0")}`;

      if (t === 0) {
        this.ctx.textAlign = "left";
        this.ctx.fillText(label, 4, rulerHeight - 7);
      } else {
        this.ctx.textAlign = "center";
        this.ctx.fillText(label, x, rulerHeight - 7);
      }
    }

    //結尾標籤 (例如 4:02)
    const endX = width - 4;
    const totalMin = Math.floor(duration / 60);
    const totalSec = Math.floor(duration % 60);
    this.ctx.textAlign = "right";
    this.ctx.fillText(`${totalMin}:${totalSec.toString().padStart(2, "0")}`, endX, rulerHeight - 7);
  }

  //繪製指針把手
  private drawHandle(x: number, top: number, bottom: number, color: string, isStart: boolean) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, top);
    this.ctx.lineTo(x, bottom);
    this.ctx.stroke();

    //把手菱形指示頭
    const tagY = isStart ? top + 8 : bottom - 8;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, tagY - 6.5);
    this.ctx.lineTo(x + 5.5, tagY);
    this.ctx.lineTo(x, tagY + 6.5);
    this.ctx.lineTo(x - 5.5, tagY);
    this.ctx.closePath();
    this.ctx.fill();

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

      if (Math.abs(x - startX) <= 20) {
        this.isDraggingStart = true;
      } else if (Math.abs(x - endX) <= 20) {
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
