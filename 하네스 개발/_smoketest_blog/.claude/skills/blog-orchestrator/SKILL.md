---
name: blog-orchestrator
description: "주제/키워드로부터 리서치→개요→초안→편집을 거쳐 발행 가능한 블로그 글 1편을 자동 생성하는 오케스트레이터. '블로그 글 써줘 / 블로그 작성 / 포스트 작성 / {주제}로 글 써줘 / {키워드} 블로그 만들어줘 / 이 주제로 블로그 한 편' 요청 시 반드시 이 스킬을 사용. 후속 작업 — 글 재실행 / 수정 / 보완 / 업데이트 / 부분 재작성, 특정 섹션 다시 쓰기('결론만 다시', '이 섹션만'), 분량 조정(더 길게·짧게), 톤 변경(더 캐주얼/격식), 리서치 보강, 제목·메타 변경, 이전 글 개선 요청 시에도 반드시 이 스킬을 사용. 블로그 한 편 산출이 아니라 단순 사실 질의·요약 등 파이프라인이 불필요한 작업에는 쓰지 않는다."
---

# Blog Orchestrator — 블로그 글 작성 팀 조율

**실행 모드: 에이전트 팀 (전 구간 단일 팀).**

세 역할(리서처·작가·편집자)이 리서치→개요→초안→편집의 파이프라인으로 협업하되, 편집자가 작가에게 재작성을 반려하고 작가가 리서처에게 추가 근거를 요청하는 **되먹임 통신**이 품질을 만든다. 이 피드백 루프 때문에 단방향 서브 에이전트가 아니라 에이전트 팀 모드를 쓴다. 아키텍처는 파이프라인 + 생성-검증 게이트(편집자가 검증 게이트).

호출하는 에이전트(이름을 글자 그대로 사용 — 경계면):
- `blog-researcher`, `blog-writer`, `blog-editor` (파일: `_smoketest_blog/.claude/agents/{name}.md`)

---

## Phase 0 — 컨텍스트 확인 (분기)

`_workspace/`의 기존 산출물로 신규/후속을 분기한다. **이 단계를 건너뛰면 후속 작업이 전체 재실행되어 비용·일관성을 해친다.**

1. `_workspace/`와 산출물(`02_research_outline.md`, `03_draft.md`, `05_final_blog_post.md`) 존재를 Read/ls로 확인한다.
2. 분기:
   - **산출물 없음 → 신규 실행.** Phase 1부터 전 파이프라인.
   - **산출물 있음 + 사용자가 보완/수정 요청(같은 주제) → 부분 재실행.** 요청을 변경 지점에 매핑해 **필요한 에이전트만** 재가동(아래 표). 앞 단계 산출물은 보존·재사용.
   - **산출물 있음 + 명백히 새 주제 → 새 실행.** 기존 `_workspace/`를 `_workspace_{타임스탬프}/`로 옮겨 보존한 뒤 신규 실행.

### 후속 요청 → 재실행 범위 매핑

| 사용자 요청 유형 | 재실행 에이전트 | 비고 |
|------------------|-----------------|------|
| "리서치 보강 / 출처 부족 / 근거 더" | researcher → (writer → editor) | 근거 변하면 하류도 갱신 |
| "이 섹션만 다시 / 결론 다시 / 더 길게·짧게 / 톤 변경" | writer → editor | 02 재사용, 03 갱신 후 재편집 |
| "재교정 / 메타 다시 / 제목 바꿔 / 맞춤법" | editor | 03 재사용, 05·04만 갱신 |

부분 재실행 시에도 팀은 동일하게 구성하되, Phase 3에서 해당 시작 단계의 TaskCreate만 발행한다.

---

## Phase 1 — 준비

1. `_workspace/00_input/domain.md`와 사용자 요청 텍스트에서 **주제/키워드·톤·대상 독자·목표 분량**을 정규화한다.
2. 누락 옵션은 기본값 적용: **중립 톤 / 일반 독자 / 800~1200단어**.
3. 신규 실행이면 `_workspace/` 하위 경로가 준비됐는지 확인(없으면 생성). 정규화 결과는 `domain.md`에 반영하거나 researcher에게 전달할 프롬프트에 명시한다.

---

## Phase 2 — 팀 구성

TeamCreate로 팀을 만든다. **모든 멤버에 `model: "opus"` 명시**(품질은 추론 능력에 직결).

```
TeamCreate({
  team_name: "blog-team",
  members: [
    { name: "blog-researcher", agent_type: "blog-researcher", model: "opus",
      prompt: "blog-research 스킬을 사용. 입력: _workspace/00_input/domain.md + 전달된 주제/키워드·옵션. 출력: _workspace/02_research_outline.md (리서치 노트+출처+섹션 개요). 완료 시 blog-writer에게 위치 통지." },
    { name: "blog-writer", agent_type: "blog-writer", model: "opus",
      prompt: "blog-writing 스킬을 사용. 입력: _workspace/02_research_outline.md. 출력: _workspace/03_draft.md. 근거 부족 시 blog-researcher에게 추가 리서치 요청. 완료 시 blog-editor에게 통지. editor 반려 시 사유대로 해당 범위만 수정." },
    { name: "blog-editor", agent_type: "blog-editor", model: "opus",
      prompt: "blog-editing 스킬을 사용. 입력: _workspace/03_draft.md (참조 _workspace/02_research_outline.md). 출력: _workspace/05_final_blog_post.md + _workspace/04_edit_notes.md. 사실 정합 미달 시 blog-writer에게 1회 반려(사유 포함). 최종본 확정 시 오케스트레이터에게 통지." }
  ]
})
```

> `agent_type`은 `_smoketest_blog/.claude/agents/`의 파일명(=name)과 글자 그대로 일치해야 한다. 존재하지 않는 이름 호출 = 런타임 실패.

### 에이전트 구성표

| name | agent_type | model | 역할 | 입력 | 출력 |
|------|-----------|-------|------|------|------|
| blog-researcher | blog-researcher | opus | 리서치·개요 | `00_input/domain.md` + 주제/옵션 | `02_research_outline.md` |
| blog-writer | blog-writer | opus | 초안 작성 | `02_research_outline.md` | `03_draft.md` |
| blog-editor | blog-editor | opus | 교정·검증·발행본 | `03_draft.md` (+`02_*` 참조) | `05_final_blog_post.md`, `04_edit_notes.md` |

---

## Phase 3 — 주요 작업 (파이프라인 + 피드백)

TaskCreate로 의존을 건 태스크를 발행한다. 팀원은 SendMessage로 보완 요청을 주고받는다.

```
TaskCreate({ tasks: [
  { title: "T1 research", assignee: "blog-researcher", depends_on: [] },
  { title: "T2 draft",    assignee: "blog-writer",    depends_on: ["T1"] },
  { title: "T3 edit",     assignee: "blog-editor",    depends_on: ["T2"] }
]})
```

- 실행 흐름: researcher가 `02_research_outline.md` 산출 → writer가 Read해 `03_draft.md` 산출 → editor가 Read해 검증.
- **피드백 통신(허용):** writer→researcher "근거 부족 섹션 추가 리서치", editor→researcher "사실 출처 보강", editor→writer "재작성 반려(사유)".
- **반려 루프:** editor가 반려하면 추가 태스크를 발행한다.
  ```
  TaskCreate({ tasks: [
    { title: "T2b draft-revise", assignee: "blog-writer", depends_on: ["T3-reject"] }
  ]})
  ```
  writer가 `03_draft.md`를 갱신하면 editor가 재검토. **반려는 최대 1회.**
- 부분 재실행(Phase 0 분기)이면 해당 시작 단계의 태스크만 발행하고 앞 산출물은 재사용한다.

---

## Phase 4 — 검증/통합

1. TaskGet으로 T3(반려 시 재검토 포함) 완료를 확인한다.
2. `05_final_blog_post.md`를 Read해 **발행본 4대 구성(제목·메타 설명≤160자·본문·출처)**이 모두 있는지 확인한다.
3. 본문 인용 출처가 `02_research_outline.md` 출처 목록에 실재하는지(허위 인용 없음) 교차 확인한다.
4. 반려가 있었다면 `04_edit_notes.md`에 사유가 기록됐는지 확인한다.
5. 누락/미달이 있으면 에러 핸들링표대로 처리한다.

---

## Phase 5 — 정리

1. **TeamDelete**로 팀을 해제한다.
2. `_workspace/`는 보존한다(사후 검증·후속 작업 입력).
3. 리더에게 **최종본 경로(`_workspace/05_final_blog_post.md`)와 한 줄 요약(제목·분량·출처 수)**을 보고한다.

---

## 데이터 흐름

```
사용자 주제/키워드 + 00_input/domain.md
        │
        ▼
blog-researcher ── 02_research_outline.md ──▶ blog-writer (Read)
        ▲                                          │
        └─ (추가 근거 요청 SendMessage) ────────────┘
                                                   │
                              03_draft.md ─────────┴──▶ blog-editor (Read)
                                   ▲                        │
                                   │                        ├─▶ 04_edit_notes.md (수정·반려 사유)
                  (반려 시 재작성 SendMessage + 갱신 03_draft.md) │
                                   └────────────────────────┤
                                                            ▼
                                              05_final_blog_post.md ──▶ 오케스트레이터/리더 (보고)
```

dead-link 점검: `02`→writer 입력 ✔ / `03`→editor 입력 ✔ / `04`→반려 추적·QA 참조 ✔ / `05`→최종 산출·보고 입력 ✔. 끊긴 노드 없음. (에이전트 manifest의 입출력 경로와 일대일 일치.)

---

## 에러 핸들링

| 상황 | 정책 |
|------|------|
| 단계 산출물 미생성/실패 | 해당 단계 1회 재시도 → 실패 시 누락을 `05_final_blog_post.md` 상단에 명시하고 가용 부분으로 진행 |
| WebSearch/WebFetch 불가 | researcher가 모델 지식으로 작성, 해당 항목 `[출처 미검증]` 표기. editor가 발행본에서 단정 표현 완화 |
| 리서치 출처 상충 | 한쪽 폐기 금지 — 양쪽 출처 병기, 차이 한 줄 기록 |
| editor 사실 정합 미달 | blog-writer에게 1회 반려(사유 포함). 회신 후에도 미달이면 가용 부분 발행 + 한계 명시 |
| 반려 2회 이상 시도 | 차단 — 반려는 최대 1회. 1회 후 미달은 발행+한계 명시로 종결 |
| 존재하지 않는 에이전트 이름 호출 | 발생 불가하도록 Phase 2 agent_type을 manifest name과 대조. 불일치 의심 시 중단·확인 |

---

## 테스트 시나리오

### 정상 (신규 실행)
입력: "원격근무 생산성에 대한 블로그 글 써줘" (옵션 없음).
1. Phase 0: `_workspace/`에 02/03/05 없음 → 신규.
2. Phase 1: 주제=원격근무 생산성, 기본값(중립·일반·800~1200단어).
3. Phase 2: blog-team 구성(3 멤버, model opus).
4. Phase 3: researcher→`02_research_outline.md`(출처 ≥3) → writer→`03_draft.md` → editor 검증 통과→`05_final_blog_post.md`+`04_edit_notes.md`.
5. Phase 4: 발행본 4대 구성 확인, 인용 출처 02와 정합 확인.
6. Phase 5: TeamDelete, 리더에 경로+요약 보고.
기대: `05_final_blog_post.md`에 제목·메타(≤160자)·본문·출처 모두 존재.

### 에러 (사실 정합 반려 루프)
입력: 위와 동일하나 writer 초안에 `02`에 없는 통계가 인용됨.
1. Phase 3: editor가 사실 정합 검증에서 허위 인용 발견 → blog-writer에게 1회 반려(사유: "출처 N이 02 목록에 없음").
2. T2b draft-revise 발행 → writer가 해당 통계를 출처 있는 주장으로 교체하거나 researcher에게 보강 요청 후 `03_draft.md` 갱신.
3. editor 재검토 통과 → `05_final_blog_post.md` 확정, `04_edit_notes.md`에 반려 사유 기록.
기대: 반려 1회로 수렴, `04_edit_notes.md`에 사유 존재, 발행본에 허위 인용 없음.
