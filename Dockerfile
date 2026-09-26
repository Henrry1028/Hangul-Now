# Google Cloud Run 및 컨테이너 배포를 위한 공식 경량 Node.js 20 베이스 이미지
FROM node:20-slim

# 작업 디렉터리 설정
WORKDIR /app

# 패키지 매니페스트 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# 애플리케이션 전체 소스 복사
COPY . .

# Cloud Run 기본 포트 환경변수(8080) 기본값 제공
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# 서버 시작 명령어
CMD ["node", "server.js"]
