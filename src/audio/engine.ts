//音訊處理核心引擎純瀏覽器端Web Audio API
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private rawBuffer: ArrayBuffer | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private isPlaying = false;
  private playbackTimer: number | null = null;

  public onProgress?: (currentTime: number, progressRatio: number) => void;
  public onStateChange?: (isPlaying: boolean) => void;

  constructor() {
    // 延遲初始化 AudioContext 以符合 iOS/Safari 手勢喚醒規範
  }

  // 解鎖並取得 AudioContext 以適配 iOS Safari
  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getRawArrayBuffer(): ArrayBuffer | null {
    return this.rawBuffer;
  }

  // 解碼音訊二進制資料：完美相容 Safari / iOS WebKit 與 Chromium
  public async loadAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    this.rawBuffer = arrayBuffer;
    const ctx = this.getContext();
    this.stop();

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {}
    }

    // 優先使用標準 Promise 風格，若失敗或不支援回退至 Callback 模式
    try {
      const copy = arrayBuffer.slice(0);
      const decoded = await ctx.decodeAudioData(copy);
      this.currentBuffer = decoded;
      this.pauseOffset = 0;
      return decoded;
    } catch (promiseErr) {
      return new Promise((resolve, reject) => {
        const copy = arrayBuffer.slice(0);
        ctx.decodeAudioData(
          copy,
          (decoded) => {
            this.currentBuffer = decoded;
            this.pauseOffset = 0;
            resolve(decoded);
          },
          (err) => {
            reject(err || promiseErr || new Error("Safari 音訊解碼失敗"));
          }
        );
      });
    }
  }

  public getDuration(): number {
    return this.currentBuffer ? this.currentBuffer.duration : 0;
  }

  public getBuffer(): AudioBuffer | null {
    return this.currentBuffer;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) return this.pauseOffset;
    return this.pauseOffset + (this.ctx.currentTime - this.startTime);
  }

  // 播放指定時間點或區間
  public play(fromSec?: number, toSec?: number) {
    if (!this.currentBuffer) return;
    const ctx = this.getContext();

    this.stop();

    const start = fromSec !== undefined ? Math.max(0, fromSec) : this.pauseOffset;
    const duration = toSec !== undefined ? Math.max(0, toSec - start) : this.currentBuffer.duration - start;

    if (duration <= 0) return;

    const source = ctx.createBufferSource();
    source.buffer = this.currentBuffer;
    source.connect(ctx.destination);

    source.onended = () => {
      if (this.activeSource === source) {
        this.isPlaying = false;
        this.activeSource = null;
        this.stopTimer();
        if (this.onStateChange) this.onStateChange(false);
      }
    };

    this.activeSource = source;
    this.startTime = ctx.currentTime;
    this.pauseOffset = start;
    this.isPlaying = true;

    if (toSec !== undefined) {
      source.start(0, start, duration);
    } else {
      source.start(0, start);
    }

    this.startTimer(toSec);
    if (this.onStateChange) this.onStateChange(true);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stop();
  }

  public stop() {
    this.stopTimer();
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {}
      this.activeSource = null;
    }
    this.isPlaying = false;
    if (this.onStateChange) this.onStateChange(false);
  }

  public seek(sec: number) {
    const clamped = Math.max(0, Math.min(sec, this.getDuration()));
    const wasPlaying = this.isPlaying;
    this.pauseOffset = clamped;
    if (wasPlaying) {
      this.play(clamped);
    } else if (this.onProgress && this.currentBuffer) {
      this.onProgress(clamped, clamped / this.currentBuffer.duration);
    }
  }

  private startTimer(maxEndSec?: number) {
    this.stopTimer();
    this.playbackTimer = window.setInterval(() => {
      if (!this.isPlaying || !this.currentBuffer) return;
      const current = this.getCurrentTime();
      if (maxEndSec !== undefined && current >= maxEndSec) {
        this.stop();
        return;
      }
      if (this.onProgress) {
        this.onProgress(current, current / this.currentBuffer.duration);
      }
    }, 50);
  }

  private stopTimer() {
    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  // 純前端音訊渲染導出：裁切、淡入淡出、峰值正規化
  public async renderRingtoneBuffer(
    startSec: number,
    endSec: number,
    fadeInSec = 1.0,
    fadeOutSec = 2.0
  ): Promise<Blob> {
    if (!this.currentBuffer) throw new Error("尚未載入音訊");

    const duration = Math.max(0.1, endSec - startSec);
    const sampleRate = 44100;
    const channels = Math.min(2, this.currentBuffer.numberOfChannels);

    const offlineCtx = new OfflineAudioContext(
      channels,
      Math.ceil(sampleRate * duration),
      sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = this.currentBuffer;

    const gainNode = offlineCtx.createGain();

    let peak = 0;
    const startSample = Math.floor(startSec * this.currentBuffer.sampleRate);
    const endSample = Math.min(
      Math.floor(endSec * this.currentBuffer.sampleRate),
      this.currentBuffer.length
    );
    for (let c = 0; c < channels; c++) {
      const data = this.currentBuffer.getChannelData(c);
      for (let i = startSample; i < endSample; i += 10) {
        const val = Math.abs(data[i] || 0);
        if (val > peak) peak = val;
      }
    }

    const normGain = peak > 0.05 ? Math.min(2.5, 0.95 / peak) : 1.0;
    gainNode.gain.setValueAtTime(normGain, 0);

    if (fadeInSec > 0) {
      gainNode.gain.setValueAtTime(0, 0);
      gainNode.gain.linearRampToValueAtTime(normGain, Math.min(fadeInSec, duration / 2));
    }

    if (fadeOutSec > 0 && duration > fadeOutSec) {
      const fadeStart = duration - fadeOutSec;
      gainNode.gain.setValueAtTime(normGain, fadeStart);
      gainNode.gain.linearRampToValueAtTime(0.001, duration);
    }

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start(0, startSec, duration);

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(renderedBuffer);
  }

  // 將 AudioBuffer 轉換編碼為標準 WAV PCM 二進制 Blob
  private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result: Float32Array;
    if (numChannels === 2) {
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);
      result = new Float32Array(ch0.length * 2);
      for (let i = 0; i < ch0.length; i++) {
        result[i * 2] = ch0[i];
        result[i * 2 + 1] = ch1[i];
      }
    } else {
      result = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = result.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, "WAVE");
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < result.length; i++) {
      let sample = Math.max(-1, Math.min(1, result[i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
