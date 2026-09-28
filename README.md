# Hangul Now (훈민정음)

영어권 학습자가 AI 튜터와 메신저처럼 대화하며 한국어를 연습할 수 있는 교육 플랫폼입니다. 대화, 문장 교정, 작문 첨삭, 발음 평가, 형태소 분석 및 복습 콘텐츠 생성을 하나의 Express 애플리케이션으로 제공합니다.

## 주요 기능

- 지우·민호·수진 등 페르소나 기반 AI 한국어 튜터 대화
- 문법, 맞춤법 및 자연스러운 표현 교정
- 문법·발음·어휘 서브 에이전트를 이용한 병렬 코칭
- 한국어 형태소 분석, 문장 성분 표시 및 로마자 변환
- 작문 첨삭과 발음 평가
- 학습 세션 요약 및 오답 기반 복습 퀴즈 생성
- Gemini Live 기반 10분 튜터 수업, 종료 1분 전 자동 마무리 및 핵심 데이터 확정
- 최근 일상 3개·반복 실수 5개의 경량 장기 기억과 5챕터 개인 오디오 복습 생성
- Firebase Admin 연동 시 대화와 학습 기록 저장
- Gemini API 키가 없을 때도 확인 가능한 데모 응답

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| 웹 서버 | Node.js, Express, ESM |
| 프런트엔드 | `preview/`의 정적 HTML/CSS/JavaScript SPA |
| 생성형 AI | Google Gemini API |
| 언어 처리 | Kiwi NLP, 자체 한국어 분석 및 로마자 변환 모듈 |
| 데이터 | Firebase Admin, Firestore, Firebase Storage |
| 배포 | Docker, Google Cloud Run, Firebase Hosting/App Hosting |

> 현재 프런트엔드는 React/Vite 빌드가 아니라 Express가 `preview/` 디렉터리를 직접 제공하는 구조입니다.

## 빠른 시작

### 요구 사항

- Node.js 20 이상
- npm
- 선택 사항: Google Gemini API 키
- 선택 사항: Firebase 서비스 계정

### 설치

```bash
git clone https://github.com/Henrry1028/Hangul-Now.git
cd Hangul-Now
npm install
```

### 환경변수

`.env.example`을 `.env`로 복사한 후 필요한 값을 입력합니다.

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_TUTOR_LIVE_MODEL=gemini-3.8-live-extended-thinking
GEMINI_REVIEW_MODEL=gemini-3.8-flash
GEMINI_REVIEW_TTS_MODEL=gemini-3.8-flash-lite-tts
PORT=3000
```

Firebase를 연결하려면 다음 값을 추가할 수 있습니다.

```dotenv
FIREBASE_SERVICE_ACCOUNT_KEY=base64_or_json_service_account
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
```

`FIREBASE_SERVICE_ACCOUNT_KEY`는 서비스 계정 JSON 문자열 또는 해당 JSON을 Base64로 인코딩한 값입니다. 비밀키가 포함된 `.env` 파일은 커밋하지 마세요.

### 실행

```bash
npm run dev
```

브라우저에서 <http://localhost:3000>으로 접속합니다.

서버 상태는 다음 주소에서 확인할 수 있습니다.

```bash
curl http://localhost:3000/api/health
```

## 프로젝트 구조

```text
Hangul-Now/
├── preview/                    # 정적 웹 UI와 캐릭터 에셋
│   ├── index.html
│   ├── js/dc-runtime.js
│   └── assets/
├── src/
│   ├── agents/                 # 문법·발음·어휘 에이전트와 오케스트레이터
│   ├── pos/                    # 형태소 분석, 문장 성분, 로마자 변환
│   ├── firebase.js             # Firebase Admin 초기화
│   ├── geminiService.js        # Gemini 대화·교정·평가 서비스
│   ├── liveConversation.js     # Gemini Live WebSocket 중계와 튜터 수업 도구
│   ├── tutorSession.js         # 장기 기억 및 10분 오디오 복습 파이프라인
│   ├── tts-verification.mjs    # 한국어 음성 텍스트 검증
│   └── usage-meter.mjs         # 모델 사용량 계측
├── server.js                   # Express API 및 정적 파일 서버
├── Dockerfile                  # Cloud Run용 컨테이너 설정
├── firebase.json               # Firebase Hosting 설정
├── apphosting.yaml             # Firebase App Hosting 설정
└── package.json
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | 서버, Gemini 및 Firebase 연결 상태 확인 |
| `POST` | `/api/chat` | AI 튜터 대화 생성 |
| `POST` | `/api/correction` | 문장 오류 분석 및 교정 |
| `POST` | `/api/coaching` | 문법·발음·어휘 통합 코칭 |
| `POST` | `/api/pos/tag` | 형태소 및 문장 성분 분석 |
| `POST` | `/api/romanize` | 한국어 로마자 변환 |
| `POST` | `/api/writing/feedback` | 작문 첨삭과 점수 생성 |
| `POST` | `/api/speaking/assess` | 발음 평가 결과 생성 |
| `POST` | `/api/session/artifact` | 학습 세션 요약 생성 |
| `POST` | `/api/session/quiz` | 오답 기반 복습 퀴즈 생성 |
| `POST` | `/api/session/complete-and-review` | 튜터 수업 기억 갱신 및 10분 오디오 복습 생성 |
| `GET` | `/api/session/audio-review/:sessionId` | 로컬 개발 모드의 생성 오디오 재생 |
| `WS` | `/api/live` | Gemini Live 튜터 수업·Survival 롤플레잉 중계 |

대화 요청 예시:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"tutorId":"jiwoo","message":"안녕하세요!"}'
```

## AI 모델 설정

- 일반 대화·교정·작문·발음 서비스는 `src/geminiService.js`에 지정된 Gemini 모델을 사용합니다.
- 멀티 에이전트 코칭은 `src/agents/orchestrator.mjs`의 전용 모델 설정을 사용합니다.
- `/api/health` 응답에서 서버가 노출하는 모델 계층과 API 키 설정 여부를 확인할 수 있습니다.

모델 이름은 실제 Google Gemini API에서 사용할 수 있는 모델 ID와 일치해야 합니다.

## 배포

### Docker

```bash
docker build -t hangul-now .
docker run --rm -p 3000:8080 --env-file .env hangul-now
```

### Google Cloud Run

```bash
gcloud run deploy hangul-now \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated
```

### Firebase

`firebase.json`, `firestore.rules`, `storage.rules`, `apphosting.yaml`을 배포 환경에 맞게 검토한 후 Firebase CLI로 배포합니다.

```bash
firebase deploy
```

## 보안 참고사항

- `.env`와 Firebase 서비스 계정 키를 Git에 커밋하지 마세요.
- 현재 Firestore 규칙은 인증 사용자에게 비교적 넓은 쓰기 권한을 허용하므로 프로덕션 배포 전에 사용자 소유권 검증을 강화하세요.
- 공개 배포에서는 CORS 허용 범위와 API 요청 크기 제한을 서비스 요구사항에 맞게 조정하세요.

## 라이선스

이 프로젝트의 패키지 메타데이터는 ISC 라이선스를 사용합니다.
