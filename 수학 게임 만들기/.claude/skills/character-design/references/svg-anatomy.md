# SVG 캐릭터 해부 — 코드 호환 제작 상세

기존 게임의 마스코트는 인라인 SVG 문자열(`FOX_SVG`)을 `paintFoxes()`가 `[data-fox]` 요소에 주입하고, `setMood()`가 `#mascot`의 클래스를 토글해 표정을 바꾼다. 이 문서는 새 캐릭터/표정을 **그 구조에 그대로 꽂히게** 만드는 좌표·레이어·토글 규약을 담는다. 여우뿐 아니라 토끼·곰·고양이 등 다른 캐릭터에도 동일하게 적용된다.

## 목차
1. 좌표계와 viewBox
2. 레이어 순서
3. 표정 그룹과 mood 토글
4. 새 mood 추가 절차
5. 눈·눈썹·입으로 감정 만들기
6. 동물별 비율 가이드(여우 아닌 캐릭터)
7. 드롭인 체크리스트

---

## 1. 좌표계와 viewBox

- 기존 viewBox는 `0 0 120 124`. **이 비율을 유지**해야 `.mascot{width:64px}` / `.mascot.big{width:132px}` 레이아웃이 안 튄다. 다른 viewBox가 꼭 필요하면 CSS width도 함께 조정해야 하므로 frontend-builder와 협의.
- 머리 중심은 대략 `(60, 64)`. 눈은 `y≈60`, 코/입은 `y≈77~90`. 새 캐릭터도 이 "머리 큰 유아 비율"을 따른다(눈이 세로 중앙~아래).
- 좌우 대칭축은 `x=60`. 단, 살짝의 비대칭(고개 기울기, 한쪽 눈썹)이 생동감을 준다.

## 2. 레이어 순서 (뒤 → 앞)

SVG는 나중에 그린 것이 위에 온다. 권장 순서:

```
1) 꼬리/뒤 장식 (있으면)
2) 귀 (바깥색 → 안쪽색)
3) 머리 (메인 색 path)
4) 주둥이/볼 (흰 영역)
5) 표정 그룹 ── 눈(open/happy/…) · 눈썹 · 입   ← mood로 토글되는 부분
6) 코
7) 볼터치(opacity ~.7)
8) 소품 (물음표·별·안경 등, mood별)
```

## 3. 표정 그룹과 mood 토글

표정은 **이미지 교체가 아니라 그룹 show/hide**로 만든다. 기존 패턴:

```html
<g class="eyes-open"> …뜬 눈… </g>
<g class="eyes-happy"> …웃는 아치 눈… </g>
```
```css
.fox .eyes-happy { display: none; }          /* 기본 숨김 */
.mascot.mood-happy .eyes-open  { display: none; }
.mascot.mood-happy .eyes-happy { display: block; }
```

`setMood('happy')`는 `#mascot`에 `mood-happy`를 토글한다. 즉 **mood 클래스 = 표정 스위치**.

## 4. 새 mood 추가 절차 (예: `think`, `oops`)

1. SVG에 그 표정의 그룹을 추가: `<g class="eyes-think">…</g>`, 필요하면 `<g class="brow-think">`, `<g class="prop-think">`(물음표 소품).
2. CSS에 토글 규칙 추가:
   ```css
   .fox .eyes-think, .fox .brow-think, .fox .prop-think { display: none; }
   .mascot.mood-think .eyes-open  { display: none; }
   .mascot.mood-think .eyes-think { display: block; }
   .mascot.mood-think .brow-think { display: block; }
   .mascot.mood-think .prop-think { display: block; }
   ```
3. `setMood()`가 모든 mood 클래스를 지우고 하나만 켜도록 확장(현재는 happy만 처리):
   ```js
   function setMood(mood){
     const m = document.querySelector("#mascot"); if(!m) return;
     m.classList.remove("mood-happy","mood-think","mood-cheer","mood-oops");
     if(mood){ void m.offsetWidth; m.classList.add("mood-"+mood); }
   }
   ```
4. 게임 이벤트에 훅: 정답→`setMood('happy')`, 살펴보기 단계→`setMood('think')`, 오답→`setMood('oops')`, 완성→`setMood('cheer')`.

## 5. 눈·눈썹·입으로 감정 만들기

표정의 90%는 이 셋이다. 좌표 감각(머리 중심 60,64 기준):

- **뜬 눈(idle):** `<circle cx="45" cy="60" r="6.5">` + 하이라이트 `<circle cx="47" cy="57.5" r="2" fill="#fff">`. 하이라이트가 "살아있는 눈"의 핵심.
- **웃는 눈(happy):** 아치 `<path d="M38 61 Q45 53 52 61" stroke-width="4" fill="none" stroke-linecap="round">`.
- **생각 눈(think):** 눈동자를 위로(작은 원을 눈 위쪽에), 한쪽 눈썹 ↑.
- **아쉬움(oops):** 눈썹 八자 `<path d="M40 54 Q45 57 50 58">`(안쪽이 내려옴), 입 작게.
- **눈썹:** idle엔 없어도 되지만, think/oops/장난기 표현에 강력. 머리 색보다 진한 갈색 짧은 선.
- **입:** 미소 곡선의 곡률·크기로 감정 조절. 벌린 입(작은 타원)+혀로 신남 강조.

## 6. 동물별 비율 가이드 (여우 아닌 캐릭터)

같은 viewBox·선 굵기·팔레트를 쓰되 **실루엣의 고유 형태**로 구별한다:

| 캐릭터 | 실루엣 키 | 색(팔레트 내) |
|--------|-----------|----------------|
| 여우 | 뾰족한 삼각 귀, 갸름한 볼 | 주황 `#ff8a3d` |
| 토끼 | 길쭉한 귀(세로로 김), 동그란 볼 | 흰/연회색 + 분홍 안귀 |
| 곰 | 작고 둥근 귀, 넓은 얼굴 | 갈색 `#b07a4a` |
| 고양이 | 삼각 귀(여우보다 작고 넓게), 수염 | 회색/치즈 |
| 부엉이(출제자 역) | 큰 눈 정면, 깃 뿔 | 갈색+크림 |

- **공유 규칙:** 머리 큰 유아 비율, 눈 하이라이트, 볼터치, 둥근 형태, 동일 선 굵기. → "한 손에서 나온" 캐스트.
- **구별 규칙:** 귀 형태 + 색 + 성격. 이 셋이면 충분히 구별된다.

## 7. 드롭인 체크리스트

- [ ] viewBox = 기존 비율(또는 CSS width 동반 수정)
- [ ] 레이어 순서 준수(표정 그룹이 머리·주둥이 위, 코·볼터치 아래)
- [ ] 표정 = 그룹 class + CSS show/hide (이미지 교체 아님)
- [ ] mood 클래스 명명 `mood-{name}`, `setMood`가 전부 remove 후 하나만 add
- [ ] `[data-fox]` 주입·`#mascot` 토글 경로 그대로 동작
- [ ] 색은 `kid-friendly-design` 팔레트 내, 선 굵기 일관
- [ ] render-qa로 각 mood 캡처해 표정이 실제 바뀌는지 확인
