# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# 安裝 Python 與 ffmpeg / yt-dlp 支援 YouTube 轉碼與音訊提取
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -U yt-dlp

ENV PATH="/opt/venv/bin:$PATH"
ENV NODE_ENV=production
ENV PORT=3005

# 僅安裝生產環境依賴
COPY package*.json ./
RUN npm ci --omit=dev

# 複製構建產物與伺服器邏輯
COPY --from=builder /app/dist ./dist
COPY server.mjs ./
COPY audio-agent-core.mjs ./

EXPOSE 3005

CMD ["node", "server.mjs"]
