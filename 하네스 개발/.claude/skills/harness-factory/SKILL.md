---
name: harness-factory
description: "하네스 공장 — 전담 전문 에이전트 팀(architect·agent-engineer·skill-engineer·QA)을 가동하여 어떤 도메인이든 위한 하네스(에이전트 정의 + 스킬 + 오케스트레이터 + CLAUDE.md 포인터)를 자동 설계·생성·검증한다. '하네스 만들어줘/구축/구성/설계', '{도메인}용 자동화 팀 만들어줘', '에이전트 팀 짜줘' 요청 시 사용. 후속 작업 — 하네스 재구성/확장/수정/보완/업데이트/부분 재실행, 하네스 점검·감사·동기화·진화, 기존 하네스에 에이전트·스킬 추가 요청 시에도 반드시 이 스킬을 사용. 단순히 하네스 개념을 묻는 질문에는 직접 답한다."
---

# Harness Factory — 하네스 자동 제작 오케스트레이터

전담 전문 에이전트 팀을 가동하여 하네스를 설계·생성·검증·진화하는 통합 스킬. 단일 에이전트가 7개 Phase를 순차 수행하던 기존 메타 방식을, **분업·병렬·자동검증·생성-검증 루프**로 격상한 운영 시스템이다.

## 실행 모드: 에이전트 팀 (기본)

**패턴:** 파이프라인(architect → builders → QA) + 빌드 단계 팬아웃(agent-engineer ∥ skill-engineer) + 생성-검증 루프(QA ↔ builders).

## 에이전트 구성

| 팀원 | 타입 | model | 역할 | 로드 reference | 출력 |
|------|------|-------|------|---------------|------|
| harness-architect | custom | opus | 감사·도메인분석·패턴선택·팀설계 | blueprint-schema.md | `_workspace/01_architect_blueprint.md` |
| agent-engineer | custom | opus | 에이전트 정의 파일 생성 | agent-authoring.md | `{대상}/.claude/agents/*.md`, `_workspace/03_agent_engineer_manifest.md` |
| skill-engineer | custom | opus | 스킬 + 오케스트레이터 생성 | skill-authoring.md | `{대상}/.claude/skills/*/SKILL.md`, `_workspace/04_skill_engineer_manifest.md` |
| harness-qa | general-purpose | opus | 구조검증·트리거·드라이런·경계면 교차검증 | qa-protocol.md | `_workspace/05_qa_report.md` |
| (리더 = 이 스킬) | — | — | 팀 조율·CLAUDE.md 포인터·최종 보고 | — | CLAUDE.md 갱신 |

> QA는 스크립트 실행이 필요하므로 `general-purpose`(읽기 전용 `Explore` 아님). 모든 팀원은 `.claude/agents/`에 정의 파일이 존재한다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (현황 감사 + 후속 작업 분기)

먼저 **대상 프로젝트 경로**를 확정한다 — 사용자가 "이 프로젝트", 특정 경로, 또는 새 도메인을 지정한다. 기본은 현재 작업 디렉토리.

대상의 `.claude/agents/`, `.claude/skills/`, `CLAUDE.md`와 `_workspace/`를 확인하여 실행 모드를 결정한다:

| 상황 | 실행 모드 | 행동 |
|------|----------|------|
| `.claude/`가 비어 있음 | **신규 구축** | Phase 1부터 전체 실행 |
| 기존 하네스 있음 + 에이전트/스킬 추가 요청 | **기존 확장** | 영향 Phase만 실행, 오케스트레이터는 신규 생성 말고 수정 |
| 기존 하네스 있음 + 점검/감사/동기화 요청 | **유지보수** | architect가 drift 감사 → 불일치 리포트 → 사용자 확인 후 수정 |
| `_workspace/` 존재 + 부분 수정 요청 | **부분 재실행** | 해당 에이전트만 재호출, 수정 대상만 덮어씀 |
| `_workspace/` 존재 + 새 도메인 입력 | **새 실행** | 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1 |

감사 결과(기존 에이전트/스킬 목록 vs CLAUDE.md 기록의 불일치 포함)를 사용자에게 요약 보고하고, 대규모 변경이면 실행 계획을 확인받는다.

### Phase 1: 준비

1. 사용자 입력 분석 — 도메인, 핵심 작업 유형, 산출물, 사용자 숙련도(용어·질문 수준으로 톤 조절).
2. 대상 프로젝트에 `_workspace/` 생성(신규/새 실행 시). 새 실행이면 기존 `_workspace/`를 타임스탬프 디렉토리로 이동한 뒤 재생성.
3. 도메인 입력을 `_workspace/00_input/`에 저장.

### Phase 2: 팀 구성

```
TeamCreate(
  team_name: "harness-factory-team",
  members: [
    { name: "harness-architect", agent_type: "harness-architect", model: "opus",
      prompt: "blueprint-schema.md를 로드하고, {도메인}을 분석하여 _workspace/01_architect_blueprint.md를 산출하라. 완성 즉시 agent-engineer·skill-engineer에게 SendMessage로 알려라." },
    { name: "agent-engineer", agent_type: "agent-engineer", model: "opus",
      prompt: "agent-authoring.md를 로드하고, blueprint의 에이전트 명세표대로 {대상}/.claude/agents/*.md를 생성하라. 생성한 name 목록을 skill-engineer에게 SendMessage하고 03_manifest에 기록하라." },
    { name: "skill-engineer", agent_type: "skill-engineer", model: "opus",
      prompt: "skill-authoring.md를 로드하고, blueprint대로 스킬과 오케스트레이터를 {대상}/.claude/skills/에 생성하라. agent-engineer가 준 정확한 에이전트 이름을 오케스트레이터에 사용하라. 04_manifest에 기록." },
    { name: "harness-qa", agent_type: "general-purpose", model: "opus",
      prompt: "qa-protocol.md를 로드하고, validate_harness.py 실행 + 경계면 교차검증 + 트리거 검증 + 드라이런을 점진적으로 수행하라. 결함은 책임 에이전트에게 SendMessage, 결과를 05_qa_report.md에 기록." }
  ]
)
```

작업 등록:
```
TaskCreate(tasks: [
  { title: "blueprint 설계", assignee: "harness-architect" },
  { title: "에이전트 정의 생성", assignee: "agent-engineer", depends_on: ["blueprint 설계"] },
  { title: "스킬·오케스트레이터 생성", assignee: "skill-engineer", depends_on: ["blueprint 설계"] },
  { title: "에이전트 구조·이름 검증", assignee: "harness-qa", depends_on: ["에이전트 정의 생성"] },
  { title: "오케스트레이터 경계면·트리거·드라이런 검증", assignee: "harness-qa", depends_on: ["스킬·오케스트레이터 생성"] },
  { title: "결함 수정 반영", assignee: "agent-engineer", depends_on: ["에이전트 구조·이름 검증"] },
  { title: "결함 수정 반영", assignee: "skill-engineer", depends_on: ["오케스트레이터 경계면·트리거·드라이런 검증"] }
])
```

### Phase 3: 설계 → 빌드 (팬아웃) → 검증 (생성-검증 루프)

**실행 방식:** 팀원 자체 조율.

1. architect가 blueprint를 완성하고 두 엔지니어에게 SendMessage로 알린다.
2. agent-engineer와 skill-engineer가 **병렬로** 파일을 생성한다. 단, skill-engineer는 오케스트레이터에 쓸 에이전트 이름이 필요하므로, agent-engineer로부터 name 목록을 받을 때까지 오케스트레이터의 호출부 작성을 보류하고 받은 뒤 채운다.
3. harness-qa가 **점진적으로** 검증한다 — 에이전트가 끝나면 즉시 구조+이름 검증, 오케스트레이터가 끝나면 즉시 경계면 교차검증. 결함은 책임 엔지니어에게 SendMessage(파일:라인 + 수정 방법). 경계면 이슈는 양쪽 모두에게.
4. 엔지니어는 결함을 1회 즉시 수정 후 재보고. QA가 재검증.

**리더 모니터링:** 팀원이 유휴가 되면 자동 알림. 막힌 팀원에게 SendMessage로 지시·재할당. 진행률은 TaskGet으로 확인. 설계 결함(중복 역할, 끊긴 Phase)이 보고되면 architect에게 blueprint 수정을 요청.

### Phase 4: 통합 및 CLAUDE.md 포인터 등록

1. 모든 작업 완료를 TaskGet으로 확인하고 `_workspace/05_qa_report.md`를 Read한다.
2. QA 리포트에 FAIL이 남아 있으면 해당 엔지니어에게 1회 더 수정 요청. 그래도 남으면 "미해결"로 명시하고 진행.
3. 대상 프로젝트의 `CLAUDE.md`에 하네스 포인터를 등록한다(아래 템플릿). **에이전트·스킬 목록이나 디렉토리 구조는 넣지 않는다** — 포인터(트리거 규칙) + 변경 이력만.

```markdown
## 하네스: {도메인명}

**목표:** {핵심 목표 한 줄}

**트리거:** {도메인} 관련 작업 요청 시 `{생성된 오케스트레이터 스킬명}` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| {YYYY-MM-DD} | 초기 구성 | 전체 | - |
```

### Phase 5: 정리 및 보고

1. 팀원들에게 종료 요청(SendMessage) 후 TeamDelete.
2. `_workspace/`는 보존(사후 검증·감사 추적용).
3. 사용자에게 산출물 체크리스트 결과를 보고하고 **피드백을 요청**한다("결과에서 개선할 부분이 있나요? 팀 구성/워크플로우에 바꾸고 싶은 점은?"). 강요하지 않되 기회를 반드시 준다.

## 데이터 흐름

```
[리더] → TeamCreate
   ↓
harness-architect → 01_blueprint.md
   ├──SendMessage──→ agent-engineer → agents/*.md + 03_manifest
   └──SendMessage──→ skill-engineer → skills/*/SKILL.md + 04_manifest
                          ↑ (에이전트 이름 수신)
   agent-engineer ──SendMessage(name 목록)──→ skill-engineer
   ↓                                    ↓
harness-qa ←─── 03_manifest, 04_manifest, agents/, skills/ 를 Read하여 교차검증
   ↓ (결함 SendMessage)
agent-engineer / skill-engineer 수정 → qa 재검증 → 05_qa_report.md
   ↓
[리더: CLAUDE.md 포인터 등록 + 최종 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 엔지니어 1명 실패/중지 | 리더가 유휴 알림 감지 → SendMessage로 상태 확인 → 재시작 또는 작업 재할당 |
| blueprint 모호/불완전 | architect가 2~3 방향 제시 → 리더가 사용자 확인 → 확정 후 빌드 |
| QA가 경계면 불일치 발견 | 양쪽 엔지니어에게 SendMessage, 1회 수정 → 재검증. 재실패 시 리포트에 명시 |
| 엔지니어 간 이름 불일치 | skill-engineer가 추측으로 채우지 말고 agent-engineer에게 요청 후 대기 |
| 트리거가 기존 스킬과 충돌 | skill-engineer가 description 경계 조건 강화. 네임스페이스 분리 검토 |
| 팀원 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| 데이터 충돌 | 삭제하지 않고 출처 병기 |

## 진화 (Phase 7 — 후속 호출 시)

같은 유형 피드백이 2회 이상 반복되거나, 에이전트가 반복 실패하거나, 사용자가 오케스트레이터를 우회하면 진화를 제안한다. 피드백 유형별 수정 대상:

| 피드백 | 수정 대상 |
|--------|----------|
| 결과물 품질 | 해당 에이전트의 스킬/references |
| 에이전트 역할 | 에이전트 정의 `.md` (추가/병합) |
| 워크플로우 순서 | 오케스트레이터 Phase |
| 트리거 누락 | 스킬 description |

모든 변경은 CLAUDE.md 변경 이력 테이블에 기록하여 회귀를 방지한다.

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "{도메인}용 하네스 만들어줘" 요청.
2. Phase 0: `.claude/` 비어 있음 → 신규 구축. Phase 1에서 `_workspace/` 생성.
3. Phase 2: 4명 팀 + 7개 작업 등록.
4. Phase 3: architect가 blueprint 산출 → agent/skill 엔지니어 병렬 빌드 → QA 점진 검증, 경계면 결함 1건 발견 → skill-engineer 수정 → 재검증 PASS.
5. Phase 4: CLAUDE.md 포인터 등록.
6. Phase 5: 팀 정리, 피드백 요청.
7. 예상 결과: `{대상}/.claude/agents/*.md`, `skills/*/SKILL.md`, CLAUDE.md 포인터 생성, QA 리포트 PASS.

### 에러 흐름
1. Phase 3에서 skill-engineer가 오케스트레이터에 `analyzer`를 호출하나 agent-engineer는 `analyst.md`를 생성(이름 불일치).
2. harness-qa가 경계면 교차검증에서 "오케스트레이터가 존재하지 않는 에이전트 호출"을 FAIL 보고.
3. 양쪽 엔지니어에게 SendMessage → 이름을 `analyst`로 통일.
4. QA 재검증 PASS → Phase 4 진행.
5. 최종 보고서에 "경계면 결함 1건 수정됨" 명시.
