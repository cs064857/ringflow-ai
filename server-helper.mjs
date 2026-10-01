import { spawn } from "node:child_process";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { analyzeAudioWithLLM } from "./audio-agent-core.mjs";

//嘗試載入.env檔案
function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || "";
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          if (!process.env[key]) process.env[key] = val.trim();
        }
      });
    } catch {
      //忽略讀取錯誤
    }
  }
}

loadLocalEnv();

//處理YouTube音訊串流、影片資訊提取與多模態音訊AI分析
export function setupDevApi(server) {
  server.middlewares.use(async (req, res, next) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    // 1. YouTube 資訊端點
    if (reqUrl.pathname === "/api/youtube-info") {
      const targetUrl = reqUrl.searchParams.get("url");
      if (!targetUrl) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "缺少 url 參數" }));
      }

      const proc = spawn("yt-dlp", [
        "--extractor-args", "youtube:player_client=android,ios",
        "--dump-json",
        "--no-playlist",
        "--no-warnings",
        targetUrl
      ]);

      let stdoutData = "";
      proc.stdout.on("data", (chunk) => { stdoutData += chunk.toString(); });

      proc.on("close", (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdoutData);
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            return res.end(JSON.stringify({
              success: true,
              title: info.title || "YouTube 音訊",
              duration: info.duration || 240,
              uploader: info.uploader || ""
            }));
          } catch {
            //解析失敗
          }
        }
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.end(JSON.stringify({
          success: true,
          title: "YouTube 音訊",
          duration: 240
        }));
      });
      return;
    }

    // 2. YouTube 音訊二進制串流端點
    if (reqUrl.pathname === "/api/youtube-audio") {
      const targetUrl = reqUrl.searchParams.get("url");
      if (!targetUrl) {
        res.statusCode = 400;
        return res.end("Missing url parameter");
      }

      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const yt = spawn("yt-dlp", [
        "--extractor-args", "youtube:player_client=android,ios",
        "-f", "bestaudio/best",
        "-o", "-",
        "--quiet",
        "--no-warnings",
        targetUrl
      ]);

      yt.stdout.pipe(res);

      req.on("close", () => {
        yt.kill();
      });
      return;
    }

    // 3. PI Agent 多模態原生音訊分析端點 (支援原生音訊分析模型，免去ASR)
    if (reqUrl.pathname === "/api/agent" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", (chunk) => { bodyStr += chunk.toString(); });
      req.on("end", async () => {
        try {
          const body = JSON.parse(bodyStr);
          const config = {
            PI_AGENT_PROVIDER: process.env.PI_AGENT_PROVIDER || "google",
            PI_AGENT_MODEL: process.env.PI_AGENT_MODEL || "gemini-2.0-flash",
            PI_AGENT_API_KEY: process.env.PI_AGENT_API_KEY || "",
            PI_AGENT_BASE_URL: process.env.PI_AGENT_BASE_URL || ""
          };

          const analysisResult = await analyzeAudioWithLLM(config, {
            audioBase64: body.audioBase64,
            mimeType: body.mimeType || "audio/mp3",
            title: body.title || "",
            duration: body.duration || 0
          });

          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          return res.end(JSON.stringify(analysisResult));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }

    next();
  });
}
