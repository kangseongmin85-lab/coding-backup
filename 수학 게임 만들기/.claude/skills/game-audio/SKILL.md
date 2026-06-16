---
name: game-audio
description: "프레임워크 없는 순수 웹 게임의 아이 친화 효과음을 Web Audio API로 합성·설계하는 스킬. 정답·오답·단계·받아올림/내림·별·레벨업·축하의 소리 캐릭터와 합성 파라미터(파형·음정·엔벨로프), 음소거/음량 UX, 시각 이벤트와의 동기화 훅을 다룬다. 소리·효과음·사운드를 추가·변경하거나 청각 피드백을 검토할 때 반드시 사용."
---

# Game Audio — Web Audio 합성으로 만드는 아이 친화 효과음

이 게임은 빌드·외부 음원 파일이 없다. 따라서 효과음을 **Web Audio API로 즉석 합성**한다(에셋 0개, 오프라인 동작, 용량 무게 없음). 목표는 **부드럽고 짧고 기분 좋은** 피드백.

## 설계 철학 (왜)

소리는 아이에게 가장 빠른 보상 신호다. 단, 두 가지를 어기면 역효과:
- **놀라게 하면 안 된다** — 갑작스럽고 큰 소리는 위축시킨다.
- **벌주면 안 된다** — 오답에 거친 버저를 쓰면 아이가 실수를 두려워해 학습을 멈춘다.

→ 맑은 음색(사인/삼각), 짧은 길이(0.1~0.4s), 부드러운 페이드, 적당한 음량. 보상음은 희소하게.

## 소리 팔레트 (이벤트 → 캐릭터)

| 이벤트 (코드 지점) | 소리 캐릭터 | 파형 | 음정/음계 | 길이 |
|--------------------|-------------|------|-----------|------|
| 단계 진행 (`다음 ▶`/step) | 가벼운 '톡' | triangle | 짧은 단음(예 E5) | 0.08s |
| 받아올림/내림 변신 (`carry`/`borrow`) | 반짝 '핑' | sine | 위로 글라이드(C6→E6) | 0.18s |
| 결과 숫자 등장 (`setResult`) | 부드러운 '딩' | sine | 단음(G5) | 0.12s |
| 정답 (`checkAnswer` 정답) | 밝은 상승 차임 | sine | 아르페지오 C5–E5–G5 | 0.3s |
| 오답 (`checkAnswer` 오답) | 부드러운 '뽁' (놀리지 않게) | sine | 낮은 두 음 하강(A3→F3), 약하게 | 0.18s |
| 별 (`starShower`) | 반짝임 | triangle | 높은 랜덤 단음(쨍하지 않게) | 0.1s |
| 레벨업 (`banner` 레벨) | 짧은 팡파르 | triangle | 상승 아르페지오 C5–E5–G5–C6 | 0.5s |
| 완성 축하 (`banner` 결과) | 밝은 차임 + 살짝 김 | sine | C5–E5–G5 | 0.4s |

> 보상음(정답·레벨업·완성)은 강하게, 진행·결과음은 아주 약하게(보조). 강약 대비가 성취감을 만든다.

## Web Audio 합성 레시피

단일 `AudioContext`를 만들고, 짧은 음을 oscillator + gain 엔벨로프로 친다.

```js
let actx; // 첫 사용자 제스처 후 생성 (자동재생 정책)
function audioCtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}
// 한 음: 주파수 freq, 길이 dur, 파형 type, 시작 음량 vol
function tone(freq, dur = 0.12, type = "sine", vol = 0.2, when = 0) {
  const ctx = audioCtx();
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);     // 빠른 페이드인(클릭 방지)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur); // 부드러운 페이드아웃
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
// 아르페지오: 음 배열을 간격 gap으로 차례로
function arp(freqs, gap = 0.09, type = "sine", vol = 0.2) {
  freqs.forEach((f, i) => tone(f, 0.16, type, vol, i * gap));
}
// 위로 글라이드(반짝): 한 osc의 주파수를 램프
function sparkle(f0 = 1046, f1 = 1318, dur = 0.18) {
  const ctx = audioCtx(), t = ctx.currentTime;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
```

음계 주파수(Hz): C5 523, E5 659, G5 784, C6 1046, E6 1318, A3 220, F3 175.

## 음소거 / 음량 UX

- **음소거 토글 필수.** 상단바에 🔊/🔇 버튼. 상태는 `localStorage`에 저장해 다음에도 유지.
- 음소거 시 `tone()` 등이 조용히 반환(아무 것도 재생 안 함).
- 기본 음량은 보조음 `vol≈0.12`, 보상음 `vol≈0.2` 정도로 과하지 않게.
- **첫 사용자 제스처 후 활성화:** 브라우저는 사용자 클릭 전 오디오를 막는다. 첫 버튼 클릭 시 `audioCtx()`를 생성(또는 `resume()`)한다. 그 전 호출은 조용히 무시.

## 구현 가이드 (frontend-builder)

- 작은 사운드 모듈을 `script.js`에 추가(또는 `sound.js` 신설 후 index.html에 로드).
- 기존 시각 이벤트 함수에 한 줄씩 훅: `setResult`→`tone(784)`, `carry/borrow`→`sparkle()`, 정답→`arp([523,659,784])`, 오답→부드러운 하강음, `banner`→팡파르, `starShower`→반짝임.
- 소리는 시각과 **동시에**. 어긋나면 어색하다.
- `vanilla-web-game` 스킬의 단순함·외과적 변경 원칙을 따른다.

## 검증 한계 (중요)

소리는 스크린샷으로 검증할 수 없다. render-qa에는 다음만 요청한다:
- 음소거 토글이 화면에 있는가(캡처)
- 콘솔 에러 없는가, AudioContext가 정상 생성되는가

**소리의 실제 품질(놀라지 않는가, 기분 좋은가)은 사용자 청취로만 판정.** 이 한계를 보고에 명시하고, 사용자에게 직접 들어보길 요청한다.

## 산출물

- `_workspace/{phase}_sound-designer_audio.md`: 이벤트→소리 매핑표 + 합성 파라미터 + 음소거 UX + 훅 지점.
