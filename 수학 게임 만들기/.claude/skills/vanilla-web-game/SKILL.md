---
name: vanilla-web-game
description: "프레임워크 없는 순수 HTML/CSS/JS 수학 게임의 구현 패턴 스킬. 세로셈 애니메이션 엔진(plan→단계 함수), async/await + CSS 전이, 자리값 모델, 손글씨 캔버스(Pointer Events), SVG 마스코트, 파일 구조를 다룬다. index.html/style.css/script.js를 구현·수정·확장할 때 반드시 사용."
---

# Vanilla Web Game — 순수 웹 게임 구현 패턴

이 게임은 빌드·설치 없이 `index.html`을 더블클릭해 여는 **단일 페이지 순수 웹앱**이다. 구현 시 이 구조를 지킨다.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `index.html` | 화면 골격(홈/스테이지), 마스코트·캔버스·보조판 자리 |
| `style.css` | 디자인 토큰(`:root`) + 모든 스타일 |
| `script.js` | 상태·단계 엔진·애니메이션·퀴즈·마스코트 |

전역 의존 없음. 외부 라이브러리 없음. 한국어 주석.

## 핵심 패턴 1: plan → 단계(step) 엔진

분기(받아올림/내림 발생 여부)는 **순수 계산으로 미리 결정**하고, 단계 함수는 그 값으로 DOM만 움직인다. 이래야 분기마다 단계 수가 달라져도 "다음 ▶" 버튼이 일관되게 동작한다.

```
buildSubSteps(a,b):
  1) plan: 자리별로 받아내림 체인·결과를 순수 계산 (work 사본 mutate)
  2) steps[]: plan을 바탕으로 async 단계 함수 배열 생성
  3) startLearn: 버튼 클릭마다 steps[idx++] 실행(중간 disable)
```

- 학습 모드: 버튼 클릭으로 한 단계씩.
- 퀴즈 힌트: 같은 steps를 sleep으로 자동 재생.

## 핵심 패턴 2: async/await 애니메이션

`sleep(ms)` + CSS 클래스 토글로 순차 애니메이션. 단계 함수는 `async`, 내부에서 `await`로 타이밍을 제어한다. CSS 전이/키프레임이 실제 움직임을 그린다(JS는 클래스만 토글).

## 핵심 패턴 3: 자리값 세로셈 모델

- 자리 키: `o`(일)/`t`(십)/`h`(백). `PARENT`, `placeIndex`, `KIND_NAME` 맵 사용.
- `renderVForm(a,b,op)`: 셀 격자(윗수/아랫수/결과 행)를 그리고 `cells.{top,bot,res}[p]`에 참조 저장.
- 받아내림 조각: `strikeReduce`(빗금+줄인값), `borrowIn`(작은 1), `showCarry`(올림 1), `setResult`(결과 pin).
- **좌표 기준 주의:** 보조판(`renderMini`)의 가로 위치는 `cells.top[p]`의 화면 좌표를 **vform 기준**으로 계산한다. `#helper`는 `#vwrap` 안에 두어 좌표 원점을 vform과 일치시킨다(원점이 어긋나면 겹침·쏠림 발생 — 과거 실제 버그).

## 핵심 패턴 4: 보조판(가르기) — 자리 아래 연결

받아내림 보조 계산은 해당 자리 칸 **바로 아래**에 세로로 이어 그리고, 연결선(`bond-link`)으로 위 칸과 잇는다. 높이는 `reserve` 클래스로 미리 확보해 단계 전이 시 세로셈이 위아래로 튀지 않게 한다.

## 핵심 패턴 5: 손글씨 캔버스 (Pointer Events)

- 도전 모드에서 세로셈 위에 `<canvas>`를 덮어 펜/터치펜으로 직접 풀게 한다.
- Pointer Events로 마우스·터치·펜 통합 지원, `e.pressure`로 필압 반영, `touch-action:none`으로 스크롤 방지.
- 캔버스 크기는 표시 후 `vwrap` 기준으로 잰다(숨김 상태에서 재면 0). `devicePixelRatio` 보정.
- 학습 모드에선 캔버스 끔(애니메이션이 대신 그림).

## 핵심 패턴 6: SVG 마스코트

- `FOX_SVG` 문자열을 `paintFoxes()`가 `[data-fox]` 요소에 주입(중복 마크업 회피).
- 표정은 `setMood('happy'|'')`가 `#mascot`의 클래스를 토글 → CSS가 `.eyes-open`/`.eyes-happy` show/hide.
- 정답·완성·배너에서 happy, 새 문제에서 기본으로 리셋.

## 구현 원칙 (프로젝트 CLAUDE.md 준수)

- **단순함 우선** — 요청을 푸는 최소 코드. 투기적 추상화 금지.
- **외과적 변경** — 요청과 직접 연결된 줄만. 무관한 코드·주석·포맷 건드리지 않음.
- **기존 스타일 따르기** — 한국어 주석, 기존 네이밍.
- **고아 정리** — 내 변경이 만든 미사용 코드만 제거.

## 검증 훅(임시) 패턴

특정 단계까지 자동 진행해 캡처해야 할 때, `?demo=N&a=..&b=..`로 `makeProblem`을 고정하고 `#nextBtn`을 N번 자동 클릭하는 임시 훅을 script.js 끝에 둘 수 있다. **검증 후 반드시 제거**한다(미사용/디버그 코드 잔존 금지).

## 출력 후 확인

- `node --check script.js`로 문법 확인.
- render-qa에 캡처 검증 요청. 스스로 "됐다"고 단정하지 않는다.
