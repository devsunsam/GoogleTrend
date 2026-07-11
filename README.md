# TrendBlog — 트렌드 블로그 자동화

Google Trends(US, 4시간) 키워드를 수집하고, Gemini로 블로그 초안을 생성한 뒤 관리자가 편집·승인·발행하는 웹 대시보드입니다.

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # GEMINI_API_KEY 등 입력
npm run dev
```

브라우저에서 http://localhost:3000 접속 → **샘플로 테스트** 또는 **트렌드 수집 + 초안 생성**

## 주요 기능

| 기능 | 설명 |
|------|------|
| 트렌드 수집 | Google Trends 실시간/일간 API (4시간 주기 스케줄러) |
| Gemini 초안 | 제목, 요약, 본문(서두 `## 요약` 포함) 자동 생성 |
| SpamBrain 회피 | 프롬프트 가이드 + 실시간 스팸 위험 점수 |
| 알림 | 브라우저 Web Notification (새 초안 도착) |
| 편집 | 제목/요약/본문 수정, Gemini 재생성 |
| 승인 발행 | WordPress / Webhook / 시뮬레이션 |

## 환경 변수

`.env.example` 참고.

| 변수 | 필수 | 설명 |
|------|------|------|
| `GEMINI_API_KEY` | 권장 | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | 선택 | 기본 `gemini-2.0-flash` |
| `CRON_SECRET` | 프로덕션 | cron API 보호용 |
| `APP_URL` | 스케줄러 | 기본 `http://localhost:3000` |
| `USE_SAMPLE_TRENDS` | 선택 | `true`면 샘플 데이터 사용 |

**GEMINI_API_KEY 없이도** 샘플 트렌드 + Mock 초안으로 UI 테스트 가능합니다.

## 4시간 자동 수집

### 로컬
```bash
npm run dev          # 터미널 1
npm run scheduler    # 터미널 2
```

### AWS (EventBridge + Lambda 또는 EC2 cron)
```
POST https://your-domain.com/api/cron/trends
Authorization: Bearer {CRON_SECRET}
```

EventBridge 규칙: `rate(4 hours)` 또는 `cron(0 */4 * * ? *)`

## AWS / GCP 세팅 가이드

### Google Gemini (필수 — 실제 AI 초안)
1. [Google AI Studio](https://aistudio.google.com/) → API 키 생성
2. `.env.local`에 `GEMINI_API_KEY=...` 설정
3. (선택) GCP 프로젝트에서 Generative Language API 활성화

### AWS 배포 (선택)
1. **Amplify / App Runner / EC2** 중 하나에 Next.js 배포
2. **EventBridge** → 4시간마다 `/api/cron/trends` 호출
3. **Secrets Manager**에 `GEMINI_API_KEY`, `CRON_SECRET` 저장
4. 현재 JSON 파일 저장 — 프로덕션 다중 인스턴스면 **RDS PostgreSQL** 또는 **DynamoDB**로 교체 권장

### 블로그 발행 (추후)
- **설정 → 블로그 URL** 입력
- WordPress: Application Password + REST API
- 커스텀: Webhook URL + Bearer 토큰

## 안드로이드 (추후)
현재 웹앱은 반응형 UI. Android 앱은 **Capacitor** 또는 **React Native WebView**로 동일 API 재사용 가능.

## Lightsail 배포 (Ubuntu)

```bash
# Lightsail SSH 접속 후
git clone <repo-url> trendblog && cd trendblog

# .env.local 작성 (GEMINI_API_KEY, CRON_SECRET, APP_URL 등)
cp .env.example .env.local && nano .env.local

# 최초 1회 (Node.js, PM2, swap 설치 + 빌드 + 실행)
chmod +x scripts/deploy.sh
./scripts/deploy.sh --setup

# 이후 업데이트
git pull
./scripts/deploy.sh
```

Lightsail Firewall에서 **3000** 포트(또는 Nginx 사용 시 80/443)를 허용하세요.

## 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run start      # 프로덕션 실행
npm run test       # Vitest
npm run scheduler  # 4시간 cron (별도 프로세스)
```
