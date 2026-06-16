# Blueprint: 블로그 글 작성 하네스

## 0. 감사 결과 (현황)
- 타깃 `_smoketest_blog/.claude/` 은 비어 있음(에이전트·스킬·커맨드 없음). 신규 구축.
- `_smoketest_blog/_workspace/` 에 이전 blueprint 없음 → 진화 모드 아님, 최초 설계.
- 기존 하네스(harness-factory)와의 트리거 충돌: 없음. 본 하네스는 별도 타깃 디렉터리(`_smoketest_blog/.claude/`)에 격리 생성되며, 오케스트레이터명 `blog-orchestrator`는 기존 스킬명과 중복되지 않음.
- 재사용 검토: harness-factory의 architect/agent-engineer/skill-engineer/qa 는 "하네스를 만드는" 메타 에이전트이고, 본 도메인 에이전트는 "블로그 글을 쓰는" 도메인 에이전트로 역할이 직교 → 재사용·확장 대상 없음. 신규 3종 생성.

---

## 1. 도메인 요약
- 목표: 사용자가 준 주제/키워드 하나로부터 리서치→개요→초안→편집을 거쳐 발행 가능한 블로그 글 1편을 자동 산출한다.
- 핵심 작업 유형: 생성(리서치·초안) + 편집(교정·다듬기) + 부분 검증(편집자의 사실/구조 점검)
- 입력: 사용자가 주는 주제 또는 키워드. 선택적으로 톤/대상 독자/목표 분량. `_workspace/00_input/domain.md` 및 오케스트레이터가 받은 요청 텍스트.
- 최종 산출물: 발행 가능한 마크다운 블로그 글 1편 → `_workspace/05_final_blog_post.md` (제목·메타 설명·본문·출처 포함). 중간 산출물은 `_workspace/0X_*` 로 단계별 보존.
- 기술 스택/제약: 마크다운 텍스트 기반. 외부 리서치는 WebSearch/WebFetch 사용(가용 시). 코드/빌드 의존성 없음. 모든 경로는 `C:\Users\vamos\Desktop\코딩\하네스 개발\_smoketest_blog\_workspace\` 기준 상대.

## 2. 실행 모드
- 선택: 에이전트 팀
- 이유: 세 역할(리서처·작가·편집자)이 순차 의존하지만, 편집자가 작가에게 "재작성 요청"을 보내거나 작가가 리서처에게 "추가 근거 요청"을 보내는 **되먹임(feedback) 통신**이 품질에 직접 기여한다. 단방향 서브 에이전트 호출로는 이 반복 교정 루프를 표현하기 어렵다. 또한 오케스트레이터가 TaskCreate/depends_on으로 단계 의존을 관리하고 팀원 간 SendMessage로 보완 요청을 주고받는 구조가 자연스럽다. 병렬성은 낮으나(파이프라인), 팀 통신 필요성이 모드 선택의 결정 근거.
- (하이브리드 아님 — 전 구간 단일 팀)

## 3. 아키텍처 패턴
- 패턴: 파이프라인 + 생성-검증(편집자가 검증·교정 게이트 역할)
- 이유: 작업이 리서치→개요→초안→편집의 명확한 선형 의존을 가진다(앞 산출물 없이는 다음 단계 불가). 동시에 마지막 편집자 단계가 작가 산출물을 검증/교정하고 미달 시 작가에게 1회 반려하는 생성-검증 게이트를 형성한다. 팬아웃이 필요할 만큼 독립 병렬 하위작업이 없으므로 순수 파이프라인에 검증 루프를 얹은 복합 구조가 가장 단순하면서 충분하다.

## 4. 에이전트 명세표

| name | 타입 | model | 핵심 역할 | 입력 경로 | 출력 경로 | 사용 스킬 | 팀 통신 대상 |
|------|------|-------|----------|----------|----------|----------|------------|
| blog-researcher | custom | opus | 주제/키워드를 받아 사실·통계·출처·하위 논점을 수집하고 글의 개요(outline)를 설계한다 | `_workspace/00_input/domain.md` + 오케스트레이터가 전달한 주제/키워드·옵션 | `_workspace/02_research_outline.md` (리서치 노트 + 출처 목록 + 섹션별 개요) | blog-research (인라인 가능, WebSearch/WebFetch 활용) | 발신: blog-writer→리서치·개요 완료 통지 및 위치 전달 / 수신: blog-writer→근거 부족 섹션 추가 리서치 요청, blog-editor→사실 출처 보강 요청 |
| blog-writer | custom | opus | 개요와 리서치 노트를 바탕으로 제목·도입·본문·결론을 갖춘 블로그 초안을 작성한다 | `_workspace/02_research_outline.md` | `_workspace/03_draft.md` (제목 + 전체 본문 초안, 출처 인용 포함) | blog-writing | 발신: blog-editor→초안 완료 통지 및 위치 전달, blog-researcher→근거 부족 섹션 추가 리서치 요청 / 수신: blog-editor→재작성/수정 반려 요청(반려 사유 포함), blog-researcher→추가 근거 회신 |
| blog-editor | custom | opus | 초안을 교정(문법·맞춤법·일관성)하고 구조·가독성·사실정합·SEO 메타를 점검하여 발행본을 확정한다. 미달 시 작가에게 1회 반려 | `_workspace/03_draft.md` (+ 필요 시 `_workspace/02_research_outline.md` 참조) | `_workspace/05_final_blog_post.md` (발행본: 제목·메타 설명·본문·출처) + `_workspace/04_edit_notes.md` (수정 내역·반려 사유) | blog-editing | 발신: blog-writer→재작성/수정 반려 요청, blog-researcher→사실 출처 보강 요청, 오케스트레이터→최종본 확정 통지 / 수신: blog-writer→수정된 초안 회신 |

> name은 kebab-case이며 `agents/{name}.md` 파일명과 일치. 출력 경로는 `{phase}_{artifact}` 컨벤션. 본 도메인은 스크립트 실행이 불필요하므로 QA 외 모든 에이전트는 custom 타입.

## 5. 스킬 명세표

| 스킬명 | description 초안(pushy, 후속 키워드 포함) | references 필요? | scripts 필요? | 연결 에이전트 |
|--------|------------------------------------------|-----------------|---------------|--------------|
| blog-research | 주제/키워드로 사실·통계·출처를 수집하고 섹션별 개요를 설계한다. 블로그 리서치·개요 작성, 그리고 리서치 보완/추가 근거 수집/개요 수정/재리서치 요청 시 사용. | 예 — 리서치 체크리스트(출처 신뢰도 기준, 최소 출처 수, 개요 표준 구조: 제목후보·도입·본문 3~5섹션·결론) | 아니오 | blog-researcher |
| blog-writing | 개요와 리서치 노트로 발행 지향 블로그 초안(제목·도입·본문·결론)을 작성한다. 초안 작성, 그리고 초안 수정/재작성/분량 조정/문체 변경/보완 요청 시 사용. | 예 — 작문 가이드(블로그 톤, 문단 길이, 인용 표기법, 제목 작성 패턴, 도입-본문-결론 구조) | 아니오 | blog-writer |
| blog-editing | 초안을 교정·구조 점검·SEO 메타 생성하여 발행본을 확정한다. 편집/교정, 그리고 재교정/수정 보완/발행본 업데이트/메타 보강 요청 시 사용. | 예 — 편집 체크리스트(맞춤법·문법·일관성·사실정합·가독성·메타 설명 ≤160자·반려 기준) | 아니오 | blog-editor |

> 재사용 검토 결과: 기존 스킬과 **중복 없음**. 세 스킬은 본 블로그 도메인 전용 신규 스킬이며, harness-factory 메타 스킬과 트리거·기능이 겹치지 않는다.

## 6. 오케스트레이터 명세
- 오케스트레이터 스킬명: blog-orchestrator
- description 초안: "주제/키워드로부터 리서치→개요→초안→편집을 거쳐 발행 가능한 블로그 글 1편을 자동 생성한다. '블로그 글 써줘/블로그 작성/포스트 작성/{주제}로 글 써줘' 요청 시 사용. 후속 작업 — 글 재실행/수정/보완/업데이트/부분 재작성, 특정 섹션 다시 쓰기, 분량·톤 조정, 리서치 보강, 이전 글 개선 요청 시에도 반드시 이 스킬을 사용."
- Phase 구성:
  - Phase 0: 컨텍스트 확인 — `_workspace/`에 기존 산출물(02/03/05) 존재 여부로 신규/후속 분기. 후속이면 사용자 피드백에 해당하는 단계부터 재실행(예: "결론만 다시" → editor 또는 writer 부분 재실행).
  - Phase 1: 준비 — `_workspace/00_input/domain.md` 및 사용자 요청에서 주제/키워드·톤·대상 독자·목표 분량 정규화. 누락 옵션은 기본값(중립 톤, 일반 독자, 800~1200단어) 적용.
  - Phase 2: 팀 구성 — members: blog-researcher, blog-writer, blog-editor.
  - Phase 3: 주요 작업 — researcher→writer→editor 파이프라인 실행. 단계 간 SendMessage로 보완 요청 허용.
  - Phase 4: 검증/통합 — editor가 발행본을 확정(`05_final_blog_post.md`)했는지, 출처가 본문과 정합하는지 확인. editor 반려 루프는 최대 1회.
  - Phase 5: 정리 — 최종본 경로와 한 줄 요약을 리더에게 보고. 중간 산출물 보존.
- 작업 할당(TaskCreate):
  - T1 research: assignee=blog-researcher, depends_on=[] → 산출 `02_research_outline.md`
  - T2 draft: assignee=blog-writer, depends_on=[T1] → 산출 `03_draft.md`
  - T3 edit: assignee=blog-editor, depends_on=[T2] → 산출 `04_edit_notes.md`, `05_final_blog_post.md`
  - (반려 시) T2ب draft-revise: assignee=blog-writer, depends_on=[T3 반려] → `03_draft.md` 갱신 후 T3 재검토(최대 1회)
- 에러 정책: 각 단계 1회 재시도 → 실패 시 누락을 `05_final_blog_post.md` 상단에 명시하고 가용 부분으로 진행. 리서치 출처 상충 시 양쪽 출처 병기. WebSearch 불가 시 모델 지식 기반으로 작성하되 "출처 미검증" 표기.

## 7. 데이터 흐름
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
                                   │                        ├─▶ 04_edit_notes.md (수정 내역·반려 사유)
                  (반려 시 재작성 SendMessage + 갱신된 03_draft.md) │
                                   └────────────────────────┤
                                                            ▼
                                              05_final_blog_post.md ──▶ 오케스트레이터/리더 (최종 보고)
```
- dead-link 점검: `02_research_outline.md`는 blog-writer의 입력으로 소비됨 ✔ / `03_draft.md`는 blog-editor의 입력으로 소비됨 ✔ / `04_edit_notes.md`는 editor의 부산물(반려 사유 추적·QA 참조용)로 소비됨 ✔ / `05_final_blog_post.md`는 최종 산출이자 오케스트레이터 보고 입력 ✔. 모든 산출 노드가 하류 소비처를 가짐(끊긴 노드 없음).

## 8. 트리거 키워드
- 초기 실행: "블로그 글 써줘", "블로그 작성/포스트 작성", "{주제}로 글 써줘", "{키워드} 블로그 만들어줘", "이 주제로 블로그 한 편"
- 후속 작업: 재실행 / 업데이트 / 수정 / 보완 / 부분 재작성 / 이전 글 개선 + 도메인 표현("결론 다시 써줘", "더 짧게/길게", "톤을 더 캐주얼하게", "리서치 보강해줘", "제목 바꿔줘", "이 섹션만 다시")

## 9. QA 검증 기준 (assertion)
- [ ] 오케스트레이터(`blog-orchestrator`)의 members에 등장하는 모든 이름(blog-researcher, blog-writer, blog-editor)이 `_smoketest_blog/.claude/agents/`에 파일로 존재한다.
- [ ] 각 에이전트의 출력 경로가 그것을 입력으로 쓰는 에이전트의 입력 경로와 정확히 일치한다(02→writer 입력, 03→editor 입력).
- [ ] 모든 스킬 SKILL.md(blog-research, blog-writing, blog-editing, blog-orchestrator)에 name·description frontmatter가 있다.
- [ ] `blog-orchestrator` description에 후속 작업 키워드(재실행/수정/보완/업데이트)가 포함된다.
- [ ] `_smoketest_blog/.claude/commands/`에 아무것도 생성되지 않았다.
- [ ] (도메인 특화) 최종 산출 `05_final_blog_post.md`에 제목·메타 설명(≤160자)·본문·출처 섹션이 모두 존재한다.
- [ ] (도메인 특화) 본문에서 인용한 출처가 `02_research_outline.md`의 출처 목록에 실재하며, 본문 주장과 출처가 정합한다(허위 인용·dead 출처 없음).
- [ ] (도메인 특화) editor 반려 루프가 발생한 경우 `04_edit_notes.md`에 반려 사유가 기록되어 있다.
