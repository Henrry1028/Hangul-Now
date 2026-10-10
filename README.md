# Hangul Now (훈민정음)

영어권 학습자가 AI 튜터와 한국어를 연습하는 교육 플랫폼입니다. 대화, 문장 교정, 읽기·듣기·말하기·쓰기 연습, Gemini Live 실시간 회화, 학습 기록을 제공합니다.

> **제품의 유일한 프론트엔드 소스는 `frontend/src`(React 18 + Vite 5)입니다.**
> `preview/`는 마이그레이션 이전 레거시 화면으로 **롤백용 보관본**이며, 수정해도 운영에 반영되지 않습니다.

## 운영 현황

| 항목 | 값 |
| --- | --- |
| 운영 URL | https://hangul-now-api-onpsj3o5ta-uk.a.run.app (또는 https://hangul-now-api-313423647793.us-east4.run.app) |
| 스테이징 | https://hangulnow-staging-313423647793.us-east4.run.app |
| 구성 | Cloud Run 단일 서비스(`hangul-now-api`, `us-east4` / 미국 버지니아 북부)가 React 빌드 + Express API + WebSocket을 같은 출처로 서빙 (Supabase DB `aws-0-us-east-1`와 동일 지역) |
| 운영 리비전 | 트래픽이 검증된 리비전에 **고정**되어 있음 (자동 전환 없음) |
| Firebase Hosting / 커스텀 도메인 | 사용하지 않음 |
| 비용 알림 | 결제 계정 예산 ₩140,000/월 (앱 프로젝트 + Gemini 키 프로젝트 `gen-lang-client-0898376857`), 50/90/100%·예상 100%에 이메일 |

배포 기록과 운영 명세: 종합 기술 문서 `GEMINI.md` 참조.

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| 프론트엔드 | React 18, Vite 5 (`frontend/`) — 빌드 결과 `frontend/dist`를 Express가 서빙 |
| 서버 | Node.js, Express 4 (ESM, `server.js`), WebSocket `/api/live` |
| 생성형 AI | Google Gemini API (대화·교정·생성·Live·TTS) |
| 인증·데이터 | Firebase Auth(Google 로그인), Firestore, Firebase Storage (서버는 Firebase Admin) |
| 배포 | Docker 멀티 스테이지(Node 20 빌드 → Node 22 런타임), Cloud Build, Cloud Run |
| 품질 | ESLint, Vitest, Playwright 스모크 테스트 (`frontend/`) |

## 빠른 시작

### 요구 사항

- **Node.js 20 또는 22** (`.nvmrc`, `engines: >=20 <23`). Node 24에서는 Vite 빌드가 메시지 없이 멈춥니다.
- npm, (선택) Docker

### 설치와 환경변수

```bash
npm install
cd frontend && npm install && cd ..
cp .env.example .env   # 값을 채운다 — .env는 절대 커밋·압축 공유하지 않는다
```

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `GEMINI_API_KEY` | 예 | AI 기능 전체 |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | 예 | 서비스 계정 JSON 또는 Base64. 없으면 Mock 모드(관리자 API 503, 서버 기록 없음) |
| `ADMIN_EMAILS` | 예 | 관리자 이메일(쉼표 구분). 비우면 관리자 콘솔·화상수업 미리보기가 사라짐 (또는 Firebase custom claim `admin`) |
| `FIREBASE_STORAGE_BUCKET` | 아니오 | 기본 `<project_id>.firebasestorage.app` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | 아니오 | 네 값을 모두 채우면 복습 PDF·오디오 리뷰를 Cloudflare R2에 저장. 하나라도 비면 Firebase Storage. 현재 백엔드는 `/api/health`의 `fileStorage`로 확인 |
| `SUPABASE_DB_URL` | 아니오 | 채우면 서버 기록(학습 이력·수업 기록·튜터 기억·채팅·오답 노트)을 Postgres(Supabase)에 저장. 비면 Firestore. 테이블 생성은 `npm run db:migrate`, 현재 백엔드는 `/api/health`의 `dataStore`로 확인 |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | 아니오 | 채우면 로그인을 Supabase Auth로 전환(서버 토큰 검증 + 화면 로그인 방식). `SUPABASE_DB_URL`과 반드시 함께 켜고 끈다. 현재 방식은 `/api/health`의 `authProvider`로 확인 |
| `ALLOWED_ORIGINS` | 아니오 | CORS 허용 출처(쉼표). 기본값은 운영·스테이징·localhost |
| `RATE_LIMIT_SCALE`, `RATE_LIMIT_DISABLED`, `TRUST_PROXY_HOPS` | 아니오 | 요청 제한 배율·비활성(로컬 테스트용)·프록시 홉 수(기본 1) |
| `GEMINI_*_MODEL` 등 | 아니오 | 모델 오버라이드 (`.env.example` 참조) |

운영 값은 **Secret Manager**에만 둡니다.

### 개발 (핫 리로드) — http://localhost:5173

```bash
npm start                    # 터미널 1: API + WebSocket (http://localhost:3000)
cd frontend && npm run dev   # 터미널 2: Vite 개발 서버 (/api, /api/live는 3000으로 프록시)
```

### 운영과 같은 확인 — http://localhost:3000

`npm start`는 `frontend/dist`를 서빙하므로 **프론트를 고친 뒤 반드시 다시 빌드**합니다 (Node 20/22).

```bash
cd frontend && npm run build && cd .. && npm start
```

호스트가 Node 24라면 Docker로 빌드합니다:

```bash
rm -rf frontend/dist && mkdir frontend/dist
docker run --rm -v "$(pwd -W)/frontend:/src:ro" -v "$(pwd -W)/frontend/dist:/out" node:20-slim \
  sh -c 'mkdir /w && cd /src && tar cf - --exclude=node_modules --exclude=dist . | (cd /w && tar xf -) && cd /w && npm ci --include=dev && npm run build && cp -r dist/. /out/'
```

### 테스트

```bash
cd frontend
npm run lint        # ESLint (React Hooks 규칙 포함)
npm test            # Vitest 단위 테스트
npm run test:e2e    # Playwright 스모크 — 실행 중인 서버 대상, 기본 http://localhost:3000 (BASE_URL로 변경)
```

처음 한 번 `npx playwright install chromium`이 필요합니다.

## 개발 규칙 (반드시 지킬 것)

### 코드 위치와 브랜치

1. 새 화면·기능은 **`frontend/src`에만** 만듭니다. `preview/index.html`은 고치지 않습니다.
2. 기능 브랜치는 `main`에서 만들고, `main`에는 fast-forward 또는 PR로만 반영합니다.
3. 화면을 추가하면 세 곳을 함께 고칩니다: `pages/새페이지.jsx`, `App.jsx`의 `handleNavigate` 허용 목록과 렌더 분기, `components/AppShell.jsx`의 `navDefs`. 하나라도 빠지면 메뉴를 눌러도 이동하지 않습니다.
4. 이미지·정적 파일은 `frontend/public/assets`(또는 `frontend/public`)에 넣고 `/assets/파일명`으로 참조합니다. 루트·`assets/`·`preview/assets`의 파일은 웹에서 서빙되지 않습니다.

### 빌드와 배포

1. 프론트 빌드는 Node 20 또는 22로 합니다.
2. `frontend/dist`는 git에 없습니다. Docker 빌드는 자동으로 만들지만, `npm start`로 로컬 확인할 때는 먼저 빌드합니다. 안 하면 이전 번들이 나갑니다.
3. **Windows에서 `gcloud run deploy --source .`를 쓰지 않습니다** — 한글 파일명(`훈이_book.png` 등)이 깨져 빌드가 실패합니다. 아래 절차를 씁니다.
4. 새 리비전은 **항상 `--no-traffic --tag`로 배포**하고, 태그 URL에서 확인한 뒤 `update-traffic`으로 옮깁니다. 문제가 있으면 같은 명령으로 이전 리비전에 되돌립니다.
5. Cloud Run **max 인스턴스를 1보다 올리지 않습니다.** 복습 작업(`reviewJobs`)·화상수업 예약 데이터·요청 제한 카운터가 프로세스 메모리에 있습니다. Firestore 등으로 옮긴 다음에만 올릴 수 있습니다.
6. 실시간 회화(WebSocket `/api/live`)는 Cloud Run 주소에서만 동작합니다. Firebase Hosting 리라이트는 WebSocket을 전달하지 못합니다. 세션은 3,600초에서 강제 종료됩니다.
7. 커스텀 도메인을 붙이면 Firebase Auth 승인 도메인과 `ALLOWED_ORIGINS`에 추가해야 합니다.
8. `firebase deploy`를 인자 없이 실행하지 않습니다. 규칙만 바꿀 때는 `firebase deploy --only firestore:rules --project hnageul-copilot-dev-918`.

```bash
# 배포 절차 (예: 커밋 <sha>, 운영 서비스)
git -c core.autocrlf=false archive --format=tar.gz -o hn-<sha>.tgz <sha>
gcloud builds submit hn-<sha>.tgz --region us-east4 \
  --tag us-east4-docker.pkg.dev/hnageul-copilot-dev-918/cloud-run-source-deploy/hangul-now-api:<sha>
gcloud run deploy hangul-now-api --image <위 태그> --region us-east4 \
  --no-traffic --tag rc-<sha> --service-account hangul-now-api-runtime@hnageul-copilot-dev-918.iam.gserviceaccount.com \
  --timeout 3600 --max-instances 1 \
  --set-secrets GEMINI_API_KEY=hn-staging-gemini-api-key:latest,FIREBASE_SERVICE_ACCOUNT_KEY=hn-staging-firebase-sa-key:latest,ADMIN_EMAILS=hn-staging-admin-emails:latest
# 태그 URL 확인 후
gcloud run services update-traffic hangul-now-api --to-revisions <새 리비전>=100 --region us-east4
```

### 보안과 데이터

1. 사용자 신원은 서버에서 `Authorization: Bearer <Firebase ID 토큰>`을 검증한 값(`req.user.uid`)만 씁니다. body·query의 `userId`·`email`을 신원으로 믿지 않습니다.
   - 로그인 필수 API: `authenticateUser`
   - 게스트도 쓰는 API: `identifyUser` (검증 실패 시 게스트로 처리)
   - 게스트 요청을 명확히 거부해야 하는 API: `authenticateOptionalUser`
   - 프론트는 `frontend/src/data/authHeaders.js`의 `authHeaders()`로 토큰을 붙입니다.
2. 관리자 판정은 `src/adminPolicy.js` 한 곳에서만 합니다 (`requireAdmin`, `GET /api/admin/status`). 클라이언트의 관리자 표시는 서버 응답만 따르며, 데이터 보호는 항상 서버가 맡습니다.
3. 운영의 `ADMIN_EMAILS` 시크릿(또는 `admin` custom claim)을 비우면 관리자 콘솔과 화상수업 화면이 사라집니다.
4. 공개 튜터 API에 `email`·`tutorUid`를 다시 넣지 않습니다.
5. 화상수업은 관리자 미리보기로만 둡니다. 예약·튜터 데이터가 메모리 목업이라 재시작하면 사라집니다.
6. Firestore 규칙(`firestore.rules`)은 본인 문서만 허용합니다. 클라이언트가 새 컬렉션을 쓰려면 규칙을 먼저 추가하고 Rules 테스트로 검증합니다.
7. AI·TTS API는 요청 제한(`src/rateLimit.js`)이 걸려 있습니다. 새 비용 API를 만들면 함께 적용합니다.
8. `.env`와 서비스 계정 JSON은 커밋·압축 공유하지 않습니다.

### 호환성

1. localStorage 키 12개(`hn-lang`, `hn-theme`, `hn-tutor`, `hn-user-xp`, `hn-profile-<uid>`, `hn-learned`, `hn-activity-logs`, `hn-study-dates`, `hn-conversations`, `hn-guest-id`, `hn-sidebar-collapsed`, `hn-sidebar-width`)와 Firestore `users/{uid}` 문서 구조를 바꾸면 기존 사용자 기록이 사라집니다. 바꿀 때는 이전 키를 읽는 변환 코드를 함께 넣습니다.
2. Express SPA 폴백 정규식(`/api` 제외)을 `app.get("*")`로 되돌리지 않습니다. 새 API 라우트는 폴백보다 위에 등록합니다.
3. React StrictMode가 켜져 있어 개발 모드에서 effect가 두 번 실행됩니다. WebSocket·타이머·오디오는 반드시 cleanup을 작성합니다.

## 프로젝트 구조

```text
├── frontend/                 # 제품 프론트엔드 (React + Vite)
│   ├── src/                  #   pages/, components/, hooks/, data/, styles/
│   ├── public/               #   정적 파일 (assets/, favicon, manifest)
│   ├── e2e/                  #   Playwright 스모크 테스트
│   └── dist/                 #   빌드 결과 (git 제외)
├── server.js                 # Express API, 정적 서빙(frontend/dist), SPA 폴백
├── src/
│   ├── authMiddleware.js     # 토큰 검증 / identifyUser / requireAdmin
│   ├── adminPolicy.js        # 관리자 판정 (단일 기준)
│   ├── rateLimit.js          # AI·TTS 요청 제한
│   ├── liveConversation.js   # Gemini Live WebSocket 중계
│   ├── tutorSession.js       # 튜터 장기 기억·오디오 복습
│   ├── learningHistory.js    # 학습 이력
│   ├── videoClassService.js  # 화상수업 (관리자 미리보기, 메모리 목업)
│   └── ...
├── preview/                  # 레거시 화면 — 롤백용 보관본 (수정 금지)
├── firestore.rules, storage.rules
└── Dockerfile                # Node 20 프론트 빌드 → Node 22 런타임
```

## 주요 API

| 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | 상태 확인 |
| `POST` | `/api/chat`, `/api/correction` | 선택 (토큰 있으면 본인 기록) | 튜터 대화, 문장 교정 |
| `POST` | `/api/content/generate` | 선택 | 읽기·듣기·말하기 자료 생성 |
| `POST` | `/api/tts`, `/api/translate` | — | 음성 합성, 번역 |
| `POST` | `/api/learning/record`, `/api/learning/pick` | 선택 | 학습 이력 기록·선택 |
| `GET` | `/api/learning/history`, `/api/session/list` | 선택 (게스트는 빈 결과) | 본인 학습 이력·복습 노트 |
| `POST` | `/api/session/report`, `/api/session/complete-and-review` | 선택 | 복습 노트 PDF, 튜터 오디오 복습 |
| `GET` | `/api/admin/status` | 필수 | 화면 표시용 관리자 여부 |
| `POST`/`GET` | `/api/admin/check`, `/api/admin/dashboard` | 관리자 | 관리자 확인·대시보드 |
| — | `/api/v1/*` | 엔드포인트별 | 화상수업 (관리자 미리보기) |
| `WS` | `/api/live` | — | Gemini Live 튜터 수업·롤플레잉 |

AI·TTS 경로는 1분당 요청 수가 제한되며 초과 시 `429`와 `Retry-After`를 돌려줍니다.

## 라이선스

ISC (package.json 기준)
