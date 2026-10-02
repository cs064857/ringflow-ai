import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { analyzeAudioWithLLM } from "./audio-agent-core.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;

// 支援大容量音訊Base64上傳（50MB）
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 跨域支援
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

function getYtDlpArgs(extraArgs = []) {
  const args = [
    "--js-runtimes", "quickjs:/usr/bin/qjs",
    "--remote-components", "ejs:github",
    "--no-warnings"
  ];
  const cookiePath = path.resolve(__dirname, "cookies.txt");
  if (fs.existsSync(cookiePath)) {
    args.push("--cookies", cookiePath);
  }
  return [...args, ...extraArgs];
}

// 1. YouTube 資訊端點
app.get("/api/youtube-info", (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).json({ error: "缺少 url 參數" });
  }

  const args = getYtDlpArgs(["--dump-json", "--no-playlist", targetUrl]);
  const proc = spawn("yt-dlp", args, {
    env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" }
  });

  let stdoutData = "";
  let stderrData = "";
  proc.stdout.on("data", (chunk) => { stdoutData += chunk.toString(); });
  proc.stderr.on("data", (chunk) => { stderrData += chunk.toString(); });

  proc.on("close", (code) => {
    if (code === 0 && stdoutData.trim()) {
      try {
        const info = JSON.parse(stdoutData);
        return res.json({
          success: true,
          title: info.title || "YouTube 音訊",
          duration: info.duration || 240,
          uploader: info.uploader || ""
        });
      } catch {
        // 解析失敗
      }
    }
    console.error("[yt-dlp info error]", stderrData);
    return res.status(400).json({
      success: false,
      error: "YouTube 解析失敗或影片受限",
      detail: stderrData.slice(0, 200)
    });
  });
});

// 2. YouTube 音訊串流端點
app.get("/api/youtube-audio", (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).send("Missing url parameter");
  }

  const args = getYtDlpArgs([
    "-f", "bestaudio/best",
    "-o", "-",
    "--quiet",
    targetUrl
  ]);

  const yt = spawn("yt-dlp", args, {
    env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" }
  });

  let hasData = false;
  yt.stdout.on("data", (chunk) => {
    if (!hasData) {
      hasData = true;
      res.setHeader("Content-Type", "audio/mp4");
    }
    res.write(chunk);
  });

  yt.on("close", (code) => {
    if (!hasData) {
      return res.status(400).send("無法下載音訊串流，該影片受限或無效");
    }
    res.end();
  });

  req.on("close", () => {
    yt.kill();
  });
});

// 3. PI Agent 多模態原生音訊分析端點
app.post("/api/agent", async (req, res) => {
  try {
    const body = req.body || {};
    const config = {
      PI_AGENT_PROVIDER: process.env.PI_AGENT_PROVIDER || "openai",
      PI_AGENT_MODEL: process.env.PI_AGENT_MODEL || "gemini-3.8-flash-high",
      PI_AGENT_API_KEY: process.env.PI_AGENT_API_KEY || "",
      PI_AGENT_BASE_URL: process.env.PI_AGENT_BASE_URL || ""
    };

    const analysisResult = await analyzeAudioWithLLM(config, {
      audioBase64: body.audioBase64,
      mimeType: body.mimeType || "audio/mp3",
      title: body.title || "",
      duration: body.duration || 0
    });

    return res.json(analysisResult);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// 4. 託管前端靜態資源
const distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[RingFlow AI] Server is running on http://0.0.0.0:${PORT}`);
});
