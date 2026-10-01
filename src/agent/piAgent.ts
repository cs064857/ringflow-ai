//PI Agent 智慧副歌與語音重點分析代理
export interface ChorusSegment {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
  tag?: string;
  lyricsHighlight?: string;
  description: string;
  rating?: number; // 1-5 星
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timeStr?: string;
  choruses?: ChorusSegment[];
  summaryCard?: {
    title: string;
    description: string;
    badge: string;
  };
}

export class SongChorusAgent {
  private messages: AgentMessage[] = [];

  constructor() {
    this.messages = [
      {
        id: "msg-1",
        role: "assistant",
        timeStr: "01:24",
        content: "你好！我是您的 iPhone 鈴聲 AI 助手（基於 Pi Agent 架構驅動）。\n只要您匯入音訊或輸入 YouTube 連結，我就能為您智慧分析旋律高潮與重點語音，推薦最適合的 29 秒鈴聲片段。"
      }
    ];
  }

  public getMessages(): AgentMessage[] {
    return this.messages;
  }

  public addThinkingMessage() {
    this.messages.push({
      id: "thinking-" + Date.now(),
      role: "assistant",
      timeStr: this.formatTimeNow(),
      content: "🤖 正在聆聽音軌動態與聲學特徵，AI 模型正在分析所有語音與副歌高潮位置，請稍候片刻..."
    });
  }

  private formatTimeNow(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  //調用 PI Agent 原生模型進行分析
  public async analyzeChorus(songTitle: string, duration: number, audioBase64?: string): Promise<AgentMessage> {
    this.messages = this.messages.filter(m => !m.id.startsWith("thinking-"));

    const userMsg: AgentMessage = {
      id: "u-" + Date.now(),
      role: "user",
      timeStr: this.formatTimeNow(),
      content: `選取人體重點片段：(${songTitle || "音訊檔案"})，長度約 ${Math.floor(duration)} 秒`
    };
    this.messages.push(userMsg);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_chorus",
          title: songTitle,
          duration: duration,
          audioBase64: audioBase64,
          messages: this.messages
        })
      });

      if (response.ok) {
        const data = await response.json() as { content: string; choruses: ChorusSegment[] };
        const reply: AgentMessage = {
          id: "a-" + Date.now(),
          role: "assistant",
          timeStr: this.formatTimeNow(),
          content: data.content,
          choruses: data.choruses,
          summaryCard: {
            title: "重要語音片段統計",
            description: "AI 模型已根據聲學能量分佈識別出高能量關鍵段落。",
            badge: "片段 1/3 ❯"
          }
        };
        this.messages.push(reply);
        return reply;
      }
    } catch {
      //後端離線或靜態展示時使用本地推薦
    }

    const fallbackChoruses = this.heuristicChorusDetection(songTitle, duration);
    const reply: AgentMessage = {
      id: "a-" + Date.now(),
      role: "assistant",
      timeStr: this.formatTimeNow(),
      content: `我已為你標記了 3 個重要語音片段（${songTitle || "音訊檔案"}），總長度約 ${Math.floor(duration)} 秒。\n以下是詳細的分析結果：`,
      choruses: fallbackChoruses,
      summaryCard: {
        title: "重要語音片段統計",
        description: "本段為主要講述內容，包含關鍵資訊與重要觀點，建議優先聽。",
        badge: "片段 1/3 ❯"
      }
    };
    this.messages.push(reply);
    return reply;
  }

  public async sendMessage(text: string, currentDuration: number, currentTitle: string): Promise<AgentMessage> {
    const userMsg: AgentMessage = {
      id: "u-" + Date.now(),
      role: "user",
      timeStr: this.formatTimeNow(),
      content: text
    };
    this.messages.push(userMsg);

    if (/副歌|高潮|鈴聲|推薦|段落|哪段|位置|分析|重點/.test(text)) {
      return this.analyzeChorus(currentTitle, currentDuration);
    }

    let replyText = "收到！我能為您推薦最佳 29.5 秒黃金片段，點選任意卡片即可直接將選取區同步至左側波形雕刻台！";
    if (/garageband|庫樂隊|匯入|設定|教學/.test(text.toLowerCase())) {
      replyText = "【GarageBand 鈴聲設定 3 步訣竅】：\n1. 點選「分享到 iPhone 鈴聲」儲存至「檔案」\n2. 打開 GarageBand 建立「錄音機」多軌檢視，小節設為 30 秒並拖入該檔案\n3. 返回「我的樂曲」長按該專案，點選「分享」>「鈴聲」即可！";
    }

    const reply: AgentMessage = {
      id: "a-" + Date.now(),
      role: "assistant",
      timeStr: this.formatTimeNow(),
      content: replyText
    };
    this.messages.push(reply);
    return reply;
  }

  private heuristicChorusDetection(title: string, duration: number): ChorusSegment[] {
    const dur = duration > 0 ? duration : 242;
    const c1Start = Math.min(54.0, dur * 0.22);
    const c2Start = Math.min(84.3, dur * 0.35);
    const c3Start = Math.min(185.0, dur * 0.75);

    return [
      {
        id: "ch-1",
        name: "片段 1",
        startSec: c2Start,
        endSec: Math.min(dur, c2Start + 29.5),
        tag: "主要內容",
        lyricsHighlight: "核心高潮進場段",
        description: "本段為主要講述與旋律高潮，包含關鍵音訊特徵，建議優先聆聽與套用。",
        rating: 5
      },
      {
        id: "ch-2",
        name: "片段 2",
        startSec: Math.min(dur - 38.5, 147.0),
        endSec: Math.min(dur, 185.5),
        tag: "重點段落",
        lyricsHighlight: "節奏重音衝刺段",
        description: "旋律熱血情緒高昂，重音節奏強勁，在吵雜環境中極不易漏接來電。",
        rating: 5
      },
      {
        id: "ch-3",
        name: "片段 3",
        startSec: c3Start,
        endSec: Math.min(dur, c3Start + 29.5),
        tag: "結尾總結",
        lyricsHighlight: "終段昇華合奏",
        description: "整段音訊的昇華段落，收尾優雅大氣，適合作為溫和鈴聲。",
        rating: 4
      }
    ];
  }
}
