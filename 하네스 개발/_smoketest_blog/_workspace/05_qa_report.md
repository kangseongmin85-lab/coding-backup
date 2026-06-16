# QA 리포트: 블로그 글 작성 하네스

검증 일자: 2026-06-14 / 검증자: harness-qa
검증 대상: `_smoketest_blog/.claude` (agents 3 / skills 4 / references 3)

## 요약
- **PASS 19 / FAIL 0 / WARN 2**
- WARN 2건은 모두 `validate_harness.py`의 휴리스틱 오탐(도메인 스킬을 오케스트레이터로 오인). 실제 결함 아님.
- blueprint §9 assertion 8개 전부 PASS(도메인 특화 3개는 "구조적으로 산출되도록 설계됐는가" 기준으로 PASS).
- **경계면 결함 0건.** 오케스트레이터↔에이전트 이름, 데이터 흐름 입출력 경로, 스킬 참조, references 로드 경로가 모두 글자 그대로 맞물린다.

---

## 1. 구조 검증 (validate_harness.py)

스크립트 출력: **PASS 9 / WARN 2 / FAIL 0** (exit 0).

| 항목 | 결과 |
|------|------|
| agents 3개 frontmatter(name=파일명)·구조 | PASS |
| SKILL.md 4개 frontmatter | PASS |
| 오케스트레이터 description 후속 키워드 | PASS |
| 정의된 에이전트 전원 오케스트레이터에서 호출됨 | PASS |
| commands/ 미생성 | PASS |
| SKILL 본문 ≤500줄 | PASS (최대 173줄, blog-orchestrator) |

**WARN 2건 (오탐 — 무시 가능):**
```
[WARN] blog-editing/SKILL.md: 정의됐으나 오케스트레이터가 호출 안 하는 에이전트: blog-editor, blog-researcher
[WARN] blog-research/SKILL.md: 정의됐으나 오케스트레이터가 호출 안 하는 에이전트: blog-editor, blog-researcher
```
원인: 스크립트가 본문에 에이전트 이름이 다수 등장하는 `blog-editing`/`blog-research` SKILL.md를 "오케스트레이터 후보"로 잘못 분류한 뒤, 그 파일 안에서 모든 에이전트가 호출되지 않는다고 경고. 진짜 오케스트레이터(`blog-orchestrator`)에 대해서는 `[PASS] 정의된 모든 에이전트가 오케스트레이터에서 호출됨`을 정상 출력했으므로 **실제 경계면은 건전**. 책임/수정 불필요(스크립트 휴리스틱 한계, 리더에 참고 보고).

본문 줄 수(전부 ≤500): blog-research 64 / blog-writing 63 / blog-editing 76 / blog-orchestrator 173. references: 50 / 43 / 58.

---

## 2. 경계면 교차검증 (최우선)

생산자·소비자를 동시에 열어 대조. **전 항목 PASS.**

| 경계면 | 결과 | 근거(파일:라인) | 비고 |
|--------|------|----------------|------|
| 에이전트 호출명 ↔ agents/ 파일 | PASS | orchestrator SKILL.md:13,55,57,59 (`blog-researcher`/`blog-writer`/`blog-editor`) ↔ agents/blog-researcher.md:2, blog-writer.md:2, blog-editor.md:2 (name 일치) | 호출 3 = 정의 3, 1:1. 고아·미정의 호출 없음 |
| TeamCreate members.agent_type ↔ name | PASS | orchestrator:55/57/59 agent_type ↔ 각 agent frontmatter name | 글자 그대로 일치 |
| TaskCreate assignee ↔ members | PASS | orchestrator:83-85 assignee(researcher/writer/editor) ↔ members 정의 | 동일 3명 |
| 데이터흐름 02: researcher 출력 ↔ writer 입력 | PASS | researcher.md:24 출력 `02_research_outline.md` ↔ writer.md:23 입력 `02_research_outline.md` | 동일 경로 |
| 데이터흐름 03: writer 출력 ↔ editor 입력 | PASS | writer.md:24 출력 `03_draft.md` ↔ editor.md:23 입력 `03_draft.md` | 동일 경로 |
| 데이터흐름 02: editor 참조 ↔ researcher 출력 | PASS | editor.md:23 참조 `02_research_outline.md`(사실정합) ↔ researcher 출력 | 진실 공급원 정합 |
| 데이터흐름 05/04: editor 출력 ↔ orchestrator 검증 입력 | PASS | editor.md:25-26 출력 `05_final_blog_post.md`+`04_edit_notes.md` ↔ orchestrator:105-107 Read 검증 | 보고·QA 입력 |
| 스킬 참조: 에이전트 ↔ skills/ | PASS | researcher.md:16→`blog-research`, writer.md:16→`blog-writing`, editor.md:16→`blog-editing` ↔ skills/{}/SKILL.md name(:2) | 3:3 일치 |
| 오케스트레이터 멤버 prompt 스킬 지정 ↔ skills/ | PASS | orchestrator:56/58/60 ("blog-research/writing/editing 스킬을 사용") ↔ 실재 스킬 | 일치 |
| references 로드: blog-research ↔ 파일 | PASS | SKILL.md:21,23,64 "research-checklist.md" ↔ references/research-checklist.md 실재(50줄) | 실재·실질 내용 |
| references 로드: blog-writing ↔ 파일 | PASS | SKILL.md:19,21,63 "writing-guide.md" ↔ references/writing-guide.md 실재(43줄) | 실재 |
| references 로드: blog-editing ↔ 파일 | PASS | SKILL.md:20,24,76 "editing-checklist.md" ↔ references/editing-checklist.md 실재(58줄) | 실재·실질 내용 |

**출처 번호 체계 경계면(추가 점검):** researcher가 출처 번호 부여(research-checklist.md:25-30), writer가 그 번호를 인용(writing-guide 경유 SKILL.md:21), editor가 `[출처 N]`을 02 목록과 대조(editing-checklist.md:20-24). 세 단계가 동일한 `[출처 N]` 규약을 공유 → 인용 체인 정합. PASS.

---

## 3. 트리거 검증

오케스트레이터 description(orchestrator SKILL.md:3) 대상.

### should-trigger (8/8 트리거 예상 — PASS)
1. "원격근무 생산성 블로그 글 써줘" → 명시 트리거(블로그 글 써줘)
2. "AI 윤리 주제로 포스트 작성해줘" → "{주제}로 글/포스트 작성"
3. "이 키워드로 블로그 한 편 만들어줘" → "{키워드} 블로그 만들어줘"
4. "방금 쓴 블로그 결론만 다시 써줘" → 후속(특정 섹션 재작성)
5. "그 글 더 짧게/캐주얼하게 바꿔줘" → 후속(분량·톤 조정)
6. "블로그 리서치 보강해줘" → 후속(리서치 보강)
7. "제목이랑 메타 설명 다시 만들어줘" → 후속(제목·메타 변경)
8. "이전 블로그 글 업데이트해줘" → 후속(업데이트/이전 글 개선)

### should-NOT-trigger / near-miss (8/8 비트리거 예상 — PASS)
1. "이 주제 한 문장으로 요약해줘" → 단순 요약, 파이프라인 불필요(description 말미 명시 배제)
2. "원격근무 통계 사실만 알려줘" → 단순 사실 질의, 글 산출 아님(배제 조항 적중)
3. "이 글 맞춤법만 봐줘"(임의 텍스트) → 블로그 발행본 산출이 아니면 모호 — **경계 주의**. 단, blog-editing은 "초안의 편집"으로 한정되고 오케스트레이터는 "블로그 한 편 산출"이 전제. 임의 텍스트 교정은 일반 편집이지 본 하네스 아님. 비트리거 타당하나 사용자 표현이 "블로그 글 교정"이면 트리거될 수 있음(의도된 동작).
4. "하네스 만들어줘 / 에이전트 팀 짜줘" → harness-factory 영역. 트리거 충돌 **없음**(키워드 "블로그/글/포스트" 부재).
5. "블로그 플랫폼 코드 짜줘 / 워드프레스 테마" → 코드 작업, 글 작성 아님
6. "내 블로그 SEO 분석해줘"(기존 사이트 분석) → 분석 작업, 신규 글 산출 아님. 단 "메타 보강"과 어휘 인접 — description이 "발행본 메타 변경"으로 한정해 경계 명확
7. "트위터 스레드 써줘 / 뉴스레터 작성" → 블로그 글 아님(매체 상이), 키워드 미적중
8. "이 블로그 글 번역해줘" → 번역 작업, 리서치→편집 파이프라인 불필요

### 기존 스킬 충돌
- **harness-factory / harness:harness 와 충돌 없음.** 메타 하네스는 "하네스/에이전트 팀 구축", 본 스킬은 "블로그 글 산출"로 어휘·의도 직교(blueprint §0 확인과 일치).
- 도메인 3스킬(blog-research/writing/editing) 상호 경계: 각 description 말미에 **상호 배제 조항**이 명시됨(research:3 "글 쓰는 작업은 blog-writing", writing:3 "수집은 blog-research·교정은 blog-editing", editing:3 "쓰기는 blog-writing·수집은 blog-research"). 같은 쿼리가 둘을 동시 트리거할 위험 낮음. PASS.

**결과: should-trigger 8/8, should-NOT 8/8, 충돌 0.** WARN 없음(near-miss #3은 의도된 경계 동작으로 판정).

---

## 4. 드라이런 (논리 점검)

- **Phase 순서 ↔ 의존:** PASS. T1(depends_on=[]) → T2(depends_on=[T1]) → T3(depends_on=[T2]) (orchestrator:83-85). 선행이 후행보다 항상 먼저. Phase 0(분기)→1(준비)→2(팀)→3(파이프라인)→4(검증)→5(정리) 단조 진행.
- **dead-link:** PASS. 02→writer입력, 03→editor입력, 02→editor참조, 05→보고·04→QA참조. 모든 입력이 선행 출력과 매칭(orchestrator:139, blueprint §7 정합). 빈 구간 없음.
- **고아 산출물:** PASS. 02(writer 소비)/03(editor 소비)/04(QA·후속 추적 소비, orchestrator:107)/05(리더 보고 소비, orchestrator:116). 끊긴 노드 없음.
- **에러 폴백:** PASS. 반려 루프 **최대 1회** 강제(orchestrator:97,151 / editor.md:32 / editing-checklist.md:37). 1회 후 미달 시 "발행본 상단 한계 명시 + 가용 부분 진행"으로 종결 — 무한 루프 차단. 단계 실패 1회 재시도→누락 명시(orchestrator:147). WebSearch 불가→`[출처 미검증]` 표기(orchestrator:148, researcher.md:18). 존재하지 않는 이름 호출 방지 가드(orchestrator:152).
- **팀 라이프사이클:** PASS. Phase 2 TeamCreate(orchestrator:52) ↔ Phase 5 TeamDelete(orchestrator:114). 누수 없음.

---

## 5. blueprint §9 assertion 판정 (8개)

| # | assertion | 판정 | 근거 |
|---|-----------|------|------|
| 1 | members 이름 전원 agents/에 파일 실재 | **PASS** | orchestrator:55-59 ↔ agents/ 3파일 name 일치 |
| 2 | 출력↔입력 경로 정확 일치(02→writer, 03→editor) | **PASS** | researcher:24↔writer:23, writer:24↔editor:23 |
| 3 | 4 SKILL.md 모두 name·description frontmatter | **PASS** | research:2-3, writing:2-3, editing:2-3, orchestrator:2-3 |
| 4 | orchestrator description에 후속 키워드 | **PASS** | orchestrator:3 (재실행/수정/보완/업데이트/부분 재작성/톤·분량/리서치 보강) |
| 5 | commands/ 미생성 | **PASS** | 디렉터리 부재 확인(스크립트 [PASS]) |
| 6 | (도메인) 05에 제목·메타≤160·본문·출처 모두 산출되도록 설계 | **PASS** | editing SKILL:34-44 산출 구조 + checklist:45-50 4대 구성 게이트 + :41 메타≤160 강제 |
| 7 | (도메인) 본문 인용 출처가 02 목록에 실재·정합하도록 설계 | **PASS** | editing SKILL:24 사실정합 게이트 + checklist:20-24, :47 dead 인용 차단. writer:18·researcher:42 출처번호 체계 보존 |
| 8 | (도메인) 반려 시 04_edit_notes.md에 반려 사유 기록되도록 설계 | **PASS** | editing SKILL:15,26 + checklist:58 + 04 구조 SKILL:53-54(반려 사유 필드) |

> 도메인 assertion 6/7/8은 실제 글 산출 전이므로 "구조적으로 산출되도록 설계됐는가" 기준으로 판정 — 세 항목 모두 스킬 본문+references에 강제 게이트가 명시되어 PASS. 실제 런타임 산출물 검증은 첫 실행 후 회귀 점검 권장.

---

## 미해결 항목
- **없음.** FAIL 0, 1회 수정 요청 필요 항목 없음.
- 참고(비결함): `validate_harness.py`가 도메인 스킬(blog-editing/blog-research)을 오케스트레이터로 오인해 WARN 2건 발생. 스크립트 휴리스틱 개선 여지(오케스트레이터 식별을 description의 모드 명시나 파일명 컨벤션으로 한정) — 리더에게 도구 개선 사항으로 보고. 본 하네스 결함 아님.
