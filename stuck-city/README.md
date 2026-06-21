# 물림 시티 (Stuck City) 🏙️

주식 밈("몇 층에 물렸어요? 살려주세요~")을 SimCity 풍으로 시각화하는 멀티플레이 웹앱.
종목 = 건물, 평단가 = 층수, 현재가 = 금색 점선. 점선 위 캐릭터는 물린 투자자.

## 구조

- **프론트엔드**: React + Vite + TypeScript (`src/`)
- **백엔드**: Cloudflare Worker + Durable Object (`worker/index.ts`)
  - 공유 도시 상태(건물·입주민·현재가·채팅)를 Durable Object 하나가 보관
  - WebSocket(하이버네이션)으로 모든 접속자에게 실시간 브로드캐스트
  - 하루 1회 알람으로 Yahoo Finance에서 전일 종가를 서버사이드로 가져옴(CORS 없음)
  - Worker가 정적 프론트(`dist/`)도 같이 서빙 → 한 번의 배포로 끝

## 로컬 개발

두 개를 같이 띄웁니다:

```bash
npm install
npm run server   # 터미널 1: 공유 백엔드 (http://localhost:8787)
npm run dev      # 터미널 2: 프론트 (http://localhost:5173) — WS는 8787로 자동 연결
```

브라우저 두 개(또는 시크릿창)로 5173을 열면 같은 도시를 공유합니다.
백엔드를 안 켜면 자동으로 **오프라인(로컬 localStorage)** 모드로 동작합니다.

## 공개 배포 (모두가 함께 쓰기)

```bash
npx wrangler login     # 최초 1회 (무료 Cloudflare 계정)
npm run deploy         # vite build + wrangler deploy
```

배포되면 `https://mullim-city.<계정>.workers.dev` 로 누구나 접속해 같은 도시를 공유합니다.
- Durable Objects(SQLite)는 **무료 Workers 플랜**에서 사용 가능.
- 프론트와 WebSocket이 같은 오리진이라 별도 설정 불필요.
- 도시를 여러 개로 나누고 싶으면 `?room=이름` 쿼리로 분리 가능(현재 기본 `global`).

## 그래픽 출처

초기 탑다운 타일 실험에 쓰인 에셋은 Micropolis(원조 SimCity 오픈소스, GPLv3).
현재 옆면 타워·캐릭터는 SimCity 팔레트 기반 자체 픽셀아트.
