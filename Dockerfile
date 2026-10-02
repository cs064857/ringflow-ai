# 構建階段
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 運行階段
FROM node:20-alpine

WORKDIR /app

# 安裝 Python 虛擬環境、FFmpeg 與 QuickJS
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    quickjs \
    curl \
    ca-certificates

# 建立 Python 虛擬環境並安裝 yt-dlp
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir yt-dlp

# 安裝 Node 生產環境相依套件
COPY package*.json ./
RUN npm install --only=production

# 複製構建產物與後端程式
COPY --from=builder /app/dist ./dist
COPY server.mjs ./
COPY audio-agent-core.mjs ./

EXPOSE 3005

CMD ["node", "server.mjs"]
