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
  private isDraggingPlayhead = false;

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

  //生成高擬真預設展示波形（模擬圖片中密集細膩的柱狀聲波）
  private initDemoPeaks() {
    const numBars = 180;
    this.peaks = new Float32Array(numBars);
    for (let i = 0; i < numBars; i++) {
      const ratio = i / numBars;
      //創造自然起伏的音樂聲波特徵
      const base = 0.28 + 0.18 * Math.sin(ratio * Math.PI * 3.5);
      const isIntro = ratio < 0.15;
      const isHighlight1 = ratio >= 0.22 && ratio <= 0.38; //圖片中選區位置
      const isDrop = ratio > 0.38 && ratio < 0.45;
      const isHighlight2 = ratio >= 0.60 && ratio <= 0.78;
      
      let boost = 0;
      if (isIntro) boost = -0.08;
      if (isHighlight1) boost = 0.35 + 0.15 * Math.sin((ratio - 0.22) / 0.16 * Math.PI);
      if (isDrop) boost = -0.12;
      if (isHighlight2) boost = 0.38;

      const randomJitter = ((i * 37) % 31) / 110 - 0.05;
      const val = Math.min(0.96, Math.max(0.12, base + boost + randomJitter));
      this.peaks[i] = val;
    }
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
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
    this.startSec = 0;
    this.endSec = Math.min(29.5, buffer.duration);
    this.currentSec = 0;
    this.draw();
  }

  public setRange(start: number, end: number) {
    const duration = this.getDuration();
    this.startSec = Math.max(0, Math.min(start, duration));
    this.endSec = Math.max(this.startSec + 0.1, Math.min(end, duration));
    this.draw();
    if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
  }

  public setPlaybackPosition(sec: number) {
    this.currentSec = Math.max(0, Math.min(sec, this.getDuration()));
    this.draw();
  }

  public getDuration(): number {
    return this.buffer ? this.buffer.duration : this.virtualDuration;
  }

  private extractPeaks() {
    if (!this.buffer) return;
    const channelData = this.buffer.getChannelData(0);
    const numBars = 180;
    const step = Math.floor(channelData.length / numBars);
    this.peaks = new Float32Array(numBars);

    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * step;
      const end = start + step;
      for (let j = start; j < end; j += 6) {
        const val = Math.abs(channelData[j] || 0);
        if (val > max) max = val;
      }
      this.peaks[i] = Math.min(1.0, Math.pow(max, 0.72) * 1.3);
    }
  }

  public draw() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    if (!this.peaks) return;

    const duration = this.getDuration();
    const rulerHeight = 24;
    const waveTop = rulerHeight;
    const waveHeight = height - rulerHeight;
    const centerY = waveTop + waveHeight / 2;

    const startX = (this.startSec / duration) * width;
    const endX = (this.endSec / duration) * width;
    const currentX = (this.currentSec / duration) * width;
    const ringtoneLen = this.endSec - this.startSec;
    const isLegalLength = ringtoneLen <= 40.05;

    // 1. 繪製頂部時間刻度標尺 (Ruler)
    this.drawRuler(width, rulerHeight, duration);

    // 2. 繪製選取區間的暖橘色半透明光幕背景
    const selWidth = Math.max(2, endX - startX);
    this.ctx.fillStyle = isLegalLength ? "rgba(254, 215, 170, 0.35)" : "rgba(254, 202, 202, 0.35)";
    this.ctx.fillRect(startX, waveTop, selWidth, waveHeight);

    // 繪製選區頂部與底部細線
    this.ctx.strokeStyle = isLegalLength ? "rgba(249, 115, 22, 0.4)" : "rgba(239, 68, 68, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(startX, waveTop, selWidth, waveHeight);

    // 3. 繪製雙向對稱柱狀波形
    const numBars = this.peaks.length;
    const barStep = width / numBars;
    const barWidth = Math.max(1.5, barStep * 0.55);

    for (let i = 0; i < numBars; i++) {
      const barX = i * barStep + (barStep - barWidth) / 2;
      const peak = this.peaks[i];
      const maxHalfHeight = (waveHeight / 2) * 0.88;
      const halfHeight = Math.max(2, peak * maxHalfHeight);

      const inSelection = barX >= startX - 1 && barX <= endX + 1;

      if (inSelection) {
        //選區內鮮明橙色
        this.ctx.fillStyle = isLegalLength ? "#f97316" : "#ef4444";
      } else {
        //選區外溫暖淡杏色柱狀
        this.ctx.fillStyle = "#fed7aa";
      }

      this.ctx.beginPath();
      this.ctx.roundRect(barX, centerY - halfHeight, barWidth, halfHeight * 2, 1);
      this.ctx.fill();
    }

    // 4. 起點錨點指標 (START 🚩)
    this.drawHandle(startX, waveTop, height, "#f97316", true);

    // 5. 終點錨點指標 (END 🏁)
    this.drawHandle(endX, waveTop, height, isLegalLength ? "#f97316" : "#ef4444", false);

    // 6. 播放雷射進度指針 (橙色垂直線 + 頂部指針)
    if (this.currentSec >= 0 && this.currentSec <= duration) {
      this.ctx.save();
      this.ctx.strokeStyle = "#ea580c";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, waveTop);
      this.ctx.lineTo(currentX, height);
      this.ctx.stroke();

      //頂部指示菱形
      this.ctx.fillStyle = "#ea580c";
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, waveTop - 2);
      this.ctx.lineTo(currentX + 5, waveTop + 5);
      this.ctx.lineTo(currentX, waveTop + 12);
      this.ctx.lineTo(currentX - 5, waveTop + 5);
      this.ctx.closePath();
      this.ctx.fill();

      //中心小白點
      this.ctx.fillStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.arc(currentX, waveTop + 5, 1.8, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  //繪製淺色時間刻度標尺 (0:00, 0:30, 1:00, 1:30, 2:00, 2:30, 3:00, 3:30, 4:02)
  private drawRuler(width: number, rulerHeight: number, duration: number) {
    this.ctx.fillStyle = "#faf6f0";
    this.ctx.fillRect(0, 0, width, rulerHeight);

    this.ctx.strokeStyle = "#e7dfd5";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, rulerHeight);
    this.ctx.lineTo(width, rulerHeight);
    this.ctx.stroke();

    const intervalSec = width < 500 ? 60 : 30;
    this.ctx.fillStyle = "#9ca3af";
    this.ctx.font = "10px Inter, -apple-system, sans-serif";

    for (let t = 0; t < duration - 15; t += intervalSec) {
      const x = (t / duration) * width;
      this.ctx.strokeStyle = "#d1d5db";
      this.ctx.beginPath();
      this.ctx.moveTo(x, rulerHeight - 6);
      this.ctx.lineTo(x, rulerHeight);
      this.ctx.stroke();

      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      const label = `${min}:${sec.toString().padStart(2, "0")}`;

      if (t === 0) {
        this.ctx.textAlign = "left";
        this.ctx.fillText(label, 4, rulerHeight - 8);
      } else {
        this.ctx.textAlign = "center";
        this.ctx.fillText(label, x, rulerHeight - 8);
      }
    }

    //結尾標籤 (例如 4:02)
    const endX = width - 4;
    const totalMin = Math.floor(duration / 60);
    const totalSec = Math.floor(duration % 60);
    this.ctx.textAlign = "right";
    this.ctx.fillText(`${totalMin}:${totalSec.toString().padStart(2, "0")}`, endX, rulerHeight - 8);
  }

  //繪製把手錨點 (頂部菱形 + 垂直線 + 底部菱形錨點)
  private drawHandle(x: number, top: number, bottom: number, color: string, isStart: boolean) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, top);
    this.ctx.lineTo(x, bottom);
    this.ctx.stroke();

    // 錨點標記
    const handleY = isStart ? top + 10 : bottom - 10;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, handleY - 6);
    this.ctx.lineTo(x + 5.5, handleY);
    this.ctx.lineTo(x, handleY + 6);
    this.ctx.lineTo(x - 5.5, handleY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.arc(x, handleY, 2, 0, Math.PI * 2);
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

      if (Math.abs(x - startX) <= 16) {
        this.isDraggingStart = true;
      } else if (Math.abs(x - endX) <= 16) {
        this.isDraggingEnd = true;
      } else {
        const clickSec = (x / rect.width) * duration;
        this.isDraggingPlayhead = true;
        if (this.onSeek) this.onSeek(clickSec);
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = getXPos(e);
      const rect = this.canvas.getBoundingClientRect();
      const duration = this.getDuration();
      const targetSec = (x / rect.width) * duration;

      if (this.isDraggingStart) {
        this.startSec = Math.max(0, Math.min(targetSec, this.endSec - 0.2));
        this.draw();
        if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
      } else if (this.isDraggingEnd) {
        this.endSec = Math.max(this.startSec + 0.2, Math.min(targetSec, duration));
        this.draw();
        if (this.onRangeChange) this.onRangeChange(this.startSec, this.endSec);
      } else if (this.isDraggingPlayhead) {
        if (this.onSeek) this.onSeek(targetSec);
      }
    };

    const handleEnd = () => {
      this.isDraggingStart = false;
      this.isDraggingEnd = false;
      this.isDraggingPlayhead = false;
    };

    this.canvas.addEventListener("mousedown", handleStart);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
  }
}
