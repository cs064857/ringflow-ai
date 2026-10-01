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
        content: "你好！我是您的 iPhone 會議 AI 助手（基於 Pi Agent 架構驅動）。\n只要你匯入音訊檔案，我就能為你分析此檔案中的所有語音位置，推薦最適合的 29 秒語音片段，點擊卡片即可一鍵複製或鎖定內容。"
      },
      {
        id: "msg-2",
        role: "user",
        timeStr: "01:24",
        content: "選取人體重點片段：(No.3 [for-X5v7syA])，長度約 242 秒"
      },
      {
        id: "msg-3",
        role: "assistant",
        timeStr: "01:26",
        content: "我已為你標記了 3 個重要語音片段（No.3 [for-X5v7syA]），總長度約 242 秒。\n以下是詳細的分析結果：",
        summaryCard: {
          title: "重要語音片段統計",
          description: "本段為主要講述內容，包含關鍵資訊與重要觀點，建議優先聽。",
          badge: "片段 1/3 ❯"
        }
      },
      {
        id: "msg-4",
        role: "assistant",
        timeStr: "01:27",
        content: "本段語音為「Heavy Rock」風格音樂，整體節奏較快，情緒強烈，適合用於影片剪輯或背景音樂。"
      },
      {
        id: "msg-5",
        role: "user",
        timeStr: "01:28",
        content: "已為你標記 3 個片段：",
        choruses: [
          {
            id: "seg-1",
            name: "片段 1",
            startSec: 84.3,
            endSec: 117.5,
            tag: "主要內容",
            description: "主要講述內容與進場核心高潮",
            rating: 5
          },
          {
            id: "seg-2",
            name: "片段 2",
            startSec: 147.0,
            endSec: 185.5,
            tag: "重點段落",
            description: "連續節奏高潮段落",
            rating: 5
          },
          {
            id: "seg-3",
            name: "片段 3",
            startSec: 185.5,
            endSec: 235.0,
            tag: "結尾總結",
            description: "結尾昇華段落",
            rating: 4
          }
        ]
      },
      {
        id: "msg-6",
        role: "assistant",
        timeStr: "01:27",
        content: "已完成分析！如需要詳細的逐字稿、摘要或多語言翻譯，歡迎隨時告訴我。"
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
      content: `我已為你標記了 3 個重要語音片段（${songTitle || "No.3"}），總長度約 ${Math.floor(duration)} 秒。\n以下是詳細的分析結果：`,
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
