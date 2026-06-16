---
name: math-game-orchestrator
description: "초등 수학 게임 '여우 선생님과 세로셈'의 에이전트 팀(디자인·캐릭터·교수법·구현·사운드·QA)을 조율하는 오케스트레이터. 화면 디자인·애니메이션 변경, 캐릭터 개발(마스코트·표정·새 친구 캐릭터·'여우가 단순/밋밋'·더 매력적), 풀이 방법·단계 추가, 효과음/소리 추가·변경, 새 기능(곱셈/나눗셈 등) 구현, 버그 수정 요청 시 사용. 후속 작업: 다시 실행·재실행·업데이트·수정·보완·이전 결과 개선, '디자인만 다시', '캐릭터만 바꿔', '풀이만 바꿔', '소리 넣어줘', '이 화면 친근하게' 등에도 반드시 이 스킬을 사용. 단순 질문은 직접 응답 가능."
---

# Math Game Orchestrator — 여우 선생님과 세로셈 팀 조율

초등 3학년 수학 게임을 디자인·교수법·구현·검증 4역할의 에이전트 팀으로 발전시킨다. **디자인(아이 친근함)이 최우선 가치**이며 design-director가 비주얼 결정을 리드한다.

## 실행 모드: 에이전트 팀

설계+구현+검증의 피드백 루프가 핵심이라 팀 모드가 기본. (디자인→구현→QA→디자인 검수가 실시간으로 돌아야 품질이 난다.)

## 에이전트 구성

| 팀원 | 타입 | 역할 | 스킬 | 출력 |
|------|------|------|------|------|
| design-director | 커스텀 | 화면 비주얼·레이아웃·모션 디렉션(리드), 캐릭터의 화면 통합 검수 | kid-friendly-design | `_workspace/*_design-director_spec.md` |
| character-designer | 커스텀 | 캐릭터 개발(컨셉·성격·실루엣·표정 시트·캐스트·SVG) | character-design | `_workspace/*_character-designer_charsheet.md` |
| math-pedagogue | 커스텀 | 교수법·연령 적합성·용어·검증 케이스 | elementary-math-pedagogy | `_workspace/*_math-pedagogue_method.md` |
| sound-designer | 커스텀 | 효과음·청각 피드백·음소거 UX | game-audio | `_workspace/*_sound-designer_audio.md` |
| frontend-builder | 커스텀 | HTML/CSS/JS 구현 | vanilla-web-game | 프로젝트 파일 + `_workspace/*_frontend-builder_changes.md` |
| render-qa | general-purpose | 헤드리스 캡처·로직 케이스 검증 | render-qa | `_workspace/*_render-qa_report.md` + `_workspace/shots/` |

> 사운드는 디자인과 한 몸이다(시각↔청각 톤 일치). 단, **소리 품질은 스크린샷으로 검증 불가** → render-qa는 음소거 토글 존재·콘솔 에러 유무만 보고, 소리 자체는 사용자 청취로 판정한다.

모든 Agent 호출에 `model: "opus"`.

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

1. `_workspace/` 존재 여부 확인.
2. 실행 모드 결정:
   - **미존재** → 초기 실행. Phase 1.
   - **존재 + 부분 수정 요청**("디자인만", "이 단계만") → 부분 재실행. 해당 팀원만 재호출하고 관련 산출물만 덮어쓴다.
   - **존재 + 새 기능 요청** → 새 실행. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1.
3. 요청 분류로 어느 팀원이 주도할지 정한다:
   - "캐릭터/마스코트/여우가 단순·밋밋/표정/새 친구 캐릭터/더 매력적·귀엽게" → **character-designer 주도** + design-director(화면 통합 검수) + frontend-builder + render-qa
   - "친근하게/색/레이아웃/움직임" → **design-director 주도**
   - "풀이/단계/암산/방법" → **math-pedagogue 주도**
   - "소리/효과음/사운드/음소거" → **sound-designer 주도** + frontend-builder
   - "버그/안 보임/깨짐/구현" → **frontend-builder 주도** + render-qa
   - "검증/맞는지 확인" → **render-qa 주도**

> 경계: **캐릭터 그 자체**(생김새·성격·표정·SVG)는 character-designer, **화면 전체**(색·레이아웃·캐릭터의 화면 통합)는 design-director. 캐릭터 작업은 character-designer가 만들고 design-director가 화면에 녹는지 검수한다.

> 규모가 작은 요청은 관련 팀원만 소집한다(예: 소리만 → sound-designer + frontend-builder + render-qa 3명).

### Phase 1: 준비
1. 사용자 요청을 분석해 변경 범위와 주도 팀원을 정한다.
2. `_workspace/`(+ `_workspace/shots/`) 생성.
3. 현재 `index.html`/`style.css`/`script.js`와 `DESIGN-cohere.md`(참고)를 `_workspace/00_input/`에 메모(경로만 기록해도 됨).

### Phase 2: 팀 구성
```
TeamCreate(team_name: "math-game-team", members: [
  { name: "design-director",  agent_type: "design-director",  model: "opus",
    prompt: "kid-friendly-design 스킬을 따라 화면 비주얼/레이아웃/모션을 리드하고 캐릭터의 화면 통합을 검수. 판단은 render-qa 스크린샷 근거." },
  { name: "character-designer", agent_type: "character-designer", model: "opus",
    prompt: "character-design 스킬로 캐릭터 컨셉·성격·실루엣·표정 시트·캐스트·SVG를 개발. '단순함≠밋밋함', 기존 FOX_SVG/setMood 토글과 드롭인 호환." },
  { name: "math-pedagogue",   agent_type: "math-pedagogue",   model: "opus",
    prompt: "elementary-math-pedagogy 스킬로 풀이법·단계·용어·검증 케이스를 책임. 암산 강요 금지." },
  { name: "sound-designer",   agent_type: "sound-designer",   model: "opus",
    prompt: "game-audio 스킬로 Web Audio 효과음을 설계. 부드럽고 짧게, 오답은 벌 아님, 음소거 필수." },
  { name: "frontend-builder", agent_type: "frontend-builder", model: "opus",
    prompt: "vanilla-web-game 스킬로 순수 HTML/CSS/JS 구현. 외과적 변경, node --check 후 QA 요청." },
  { name: "render-qa",        agent_type: "general-purpose",  model: "opus",
    prompt: "render-qa 스킬로 헤드리스 캡처·레이아웃·산술 케이스 검증. 상상 금지, 실제 픽셀 확인." }
])
```
요청 규모에 따라 팀원을 줄여도 된다(예: 순수 디자인 미세조정은 design-director + frontend-builder + render-qa 3명).

작업 등록(`TaskCreate`)은 주도 팀원에 핵심 작업을, 나머지에 검토/구현/검증 작업을 의존성과 함께 건다.

### Phase 3: 협업 실행 (팀원 자체 조율)

전형적 흐름(디자인 변경 예):
1. design-director가 스펙 작성 → `_workspace/`에 저장, frontend-builder에 SendMessage.
2. (개념 관련 시) math-pedagogue가 교육적 표현·문장·검증 케이스를 design-director/frontend-builder에 전달.
3. frontend-builder가 코드 반영 → render-qa에 캡처 요청.
4. render-qa가 캡처·체크리스트·산술 케이스 검증 → 결함을 frontend-builder/design-director에 보고.
5. design-director가 스크린샷으로 합격/불합격 판단. 불합격이면 2~3으로 루프(최대 2~3회).

**통신 규칙:**
- 디자인 최종 판단은 design-director. 단, 근거는 render-qa 스크린샷.
- 교육적 정확성 거부권은 math-pedagogue(틀린 풀이는 막는다).
- 구현 제약은 frontend-builder가 즉시 공유.

### Phase 4: 통합·확인
1. 모든 작업 완료 확인(TaskGet).
2. render-qa 최종 리포트로 레이아웃·산술 케이스 전부 합격인지 확인.
3. 프로젝트 파일이 최종 상태인지, 임시 데모 훅·캡처 잔여물이 제거됐는지 확인.
4. 사용자에게 변경 요약 + 검증 결과(스크린샷 근거) 보고.

### Phase 5: 정리
1. 팀원 종료(SendMessage) 후 `TeamDelete`.
2. `_workspace/` 보존(감사 추적). 임시 캡처는 `_workspace/shots/`에 정리.
3. CLAUDE.md **변경 이력**에 이번 변경 기록.
4. 사용자에게 피드백 요청(Phase 7 진화).

## 데이터 흐름

```
[리더] → TeamCreate
  design-director ──spec──▶ frontend-builder ──구현──▶ 프로젝트 파일
        ▲  ▲  ▲  ▲                │
        │  │  │  └──캐릭터시트·SVG── character-designer
        │  │  └──오디오매핑── sound-designer
        │  └──검증케이스── math-pedagogue
        │                         ▼
        └──합격판단◀──shots──── render-qa (헤드리스 캡처; 소리는 사용자 청취)
  (캐릭터 작업: character-designer가 만들고 → design-director가 화면 통합 검수)
```
- 산출물·중간물: `_workspace/` 파일 기반.
- 실시간 소통: SendMessage. 진행/의존: TaskCreate/Update.

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 디자인 의도≠구현 | design-director가 구체 수치로 1회 재지시 → 재검수. 그래도 어긋나면 사용자에 선택지 제시 |
| 레이아웃 결함(겹침/쏠림) | render-qa가 좌표·원인 추정 보고 → frontend-builder가 좌표/폭/원점 진단(추측 금지) |
| 산술 케이스 실패 | math-pedagogue가 어느 단계가 틀렸는지 짚음 → frontend-builder 수정 → 재검증 |
| 소리 품질 판단 불가 | render-qa는 음소거 토글·콘솔 에러만 검증. 소리 자체는 사용자 청취 요청, 한계를 보고에 명시 |
| 풀이법이 복수 타당 | math-pedagogue가 임의 선택 금지, 장단점과 함께 사용자에 제시 |
| 팀원 1명 중지 | 리더가 SendMessage로 상태 확인 → 재시작 또는 작업 재할당 |
| 무한 검수 루프 | 디자인 검수 최대 2~3회. 이후 사용자 판단 요청 |

## 테스트 시나리오

### 정상 흐름 (디자인 친근화 요청)
1. 사용자: "이 화면 더 아이답게, 캐릭터 살려서."
2. Phase 0: 주도=design-director.
3. 팀 구성 → design-director 스펙 → frontend-builder 구현 → render-qa 캡처.
4. design-director가 스크린샷으로 체크리스트 합격 확인.
5. 산술 케이스도 회귀 없는지 render-qa 확인.
6. 변경 요약 + 스크린샷 근거 보고, CLAUDE.md 이력 기록.

### 에러 흐름 (구현이 디자인과 어긋남)
1. render-qa가 "보조판이 오른쪽으로 쏠려 잘림" 보고(스크린샷).
2. frontend-builder가 좌표 원점(`#helper` 부모, cx 기준)을 진단·수정.
3. render-qa 재캡처로 회귀 확인.
4. 2회 내 미해결 시 design-director가 대안 레이아웃을 사용자에 제시.

## 후속 작업
- 부분 재실행: 해당 팀원만 호출, 이전 `_workspace/` 산출물을 프롬프트에 경로로 전달.
- 같은 유형 피드백 2회 이상 반복 시 스킬·에이전트 갱신 제안(Phase 7).
