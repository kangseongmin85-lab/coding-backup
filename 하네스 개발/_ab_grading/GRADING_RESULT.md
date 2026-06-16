# A/B 블라인드 채점 결과 — 블로그 글 작성 하네스

채점관: 독립 채점관 (블라인드). 근거는 모두 산출물 파일에서 직접 인용. 루브릭: `_ab_grading/RUBRIC.md` (6 카테고리 × 10점 = 60점).

구조 검증 스크립트(`validate_harness.py`)는 두 하네스에 각각 실행했으며 출력 원문을 카테고리1 근거로 인용한다.

---

## Harness-A

| # | 카테고리 | 점수/10 | 근거 |
|---|---------|--------|------|
| 1 | 구조 유효성 | 10 | `validate_harness.py` 실행 결과: **PASS 9 / WARN 0 / FAIL 0**. 인용: "blog-orchestrator/SKILL.md: 오케스트레이터 description 에 후속 키워드 있음", "정의된 모든 에이전트가 오케스트레이터에서 호출됨", "commands/ 미생성 — 정상". FAIL 0·WARN 0 → 만점. |
| 2 | 경계면 정합 | 10 | 불일치 0건. ① 오케스트레이터 TeamCreate의 `agent_type`(`blog-researcher`/`blog-writer`/`blog-editor`, orchestrator 59·61·63행) ↔ `agents/*.md` 3파일 1:1 실재. ② 출력→입력 체인 정합: researcher 출력 `01_researcher_sources.md`+`01_researcher_outline.md`(blog-researcher.md:26-27) = writer 입력(blog-writer.md:25-26) = blog-draft SKILL 입력(16-18); writer 출력 `02_writer_draft.md` = editor 입력(blog-editor.md:25); editor 출력 `03_editor_final.md`(blog-editor.md:29). 오케스트레이터 데이터흐름도(118-137행)와 정확히 일치. ③ 스킬 참조: 오케스트레이터가 호출하는 `blog-research`/`blog-draft`/`blog-edit` 모두 실재. ④ 고아·dead-link 없음 — 모든 노드(domain→sources/outline→draft→final→복사본)가 하류 소비처 보유. references/ 디렉토리 자체가 없으나 어떤 파일도 references 경로를 참조하지 않아 dead-link 아님. |
| 3 | 완전성 | 10 | **에이전트:** 3개 모두 핵심역할/작업원칙/입출력/팀통신/재호출/에러핸들링/협업 7섹션 완비(예 blog-editor.md:10·17·24·45·50·54·58). 누락 0. **오케스트레이터:** Phase 0 컨텍스트 확인(27-44행)·에이전트 구성표(16-23)·데이터 흐름(118-140)·에러 핸들링표(142-154)·테스트 시나리오 정상+에러+후속 3종(156-180) 모두 존재. 누락 0. **CLAUDE.md:** 존재(`.claude/CLAUDE.md`), 트리거(7행)+변경 이력 표(9-12행) 모두 포함. |
| 4 | 트리거 품질 | 10 | 오케스트레이터 description(3행)에 pushy 호출("반드시 이 스킬을 사용")+후속 키워드(수정·재실행·재실행·업데이트·보완·"제목·메타설명만 수정") 포함, 직접응답 예외("글쓰기 팁" 직접 응답) 명시. 도메인 스킬 3종 description에 구체 트리거+후속 키워드 보유(blog-research 3행 등). should-trigger 5/5 트리거(글 써줘/포스트/결론만 다시/메타설명만/리서치만 다시 — 분량 키워드는 "보완"으로 흡수). near-miss 5건 중 "글쓰기 팁"은 명시 제외(7행). 오답 0. harness-factory 트리거와 도메인 분리(블로그 한정)되어 충돌 없음. |
| 5 | 방법론 준수 | 10 | TeamCreate 3멤버 모두 `model:"opus"` 명시(orchestrator 59·61·63행) — 누락 0. 실행 모드 명시("실행 모드: 에이전트 팀", 10행 + 근거 12행). SKILL.md 4종 모두 ≤500줄(최대 orchestrator 180줄) — references 분리 불요·위반 0. `commands/` 미생성(스크립트 확인). `_workspace` 파일명 컨벤션 일관 사용(00_input/·01_·02_·03_). 에이전트 3개 = 도메인 대비 적정, 과분리 없음("리서치+개요를 researcher로 통합" 23행 명시). |
| 6 | 도메인 적합성 | 10 | 분해(researcher/writer/editor)가 블로그 도메인에 자연스러움. **품질 보장:** editor↔writer 생성-검증 루프(최대 2회, blog-editor.md:22) + 출처 교차검증("양쪽 동시에 읽기", blog-edit SKILL 10-24행). **도메인 특화 검증 기준:** 메타설명 150~160자(blog-edit:35, blog-editor.md:14), 출처 over-claim/누락 교차검증 표(blog-edit:18-23), 발행 4요소(제목·메타·본문·출처) 점검(blog-edit:55-59). 데이터 흐름이 "주제→발행본" 완성(domain→final→사용자 경로 복사, orchestrator 104-108행). |
| **합계** | | **60/60** | |

---

## Harness-B

| # | 카테고리 | 점수/10 | 근거 |
|---|---------|--------|------|
| 1 | 구조 유효성 | 10 | `validate_harness.py` 실행 결과: **PASS 9 / WARN 0 / FAIL 0**. 인용: "blog-orchestrator/SKILL.md: 오케스트레이터 description 에 후속 키워드 있음", "정의된 모든 에이전트가 오케스트레이터에서 호출됨", "blog-writing/SKILL.md: frontmatter 정상", "commands/ 미생성 — 정상". FAIL 0·WARN 0 → 만점. |
| 2 | 경계면 정합 | 10 | 불일치 0건. ① TeamCreate `agent_type`(`blog-researcher`/`blog-writer`/`blog-editor`, orchestrator 55·57·59행 + 구성표 71-73행) ↔ `agents/*.md` 3파일 1:1 실재. ② 출력→입력 체인 정합: researcher 출력 `02_research_outline.md`(blog-researcher.md:24) = writer 입력(blog-writer.md:23, blog-writing SKILL:12) = editor 검증참조; writer 출력 `03_draft.md`(blog-writer.md:24) = editor 입력(blog-editor.md:23); editor 출력 `05_final_blog_post.md`+`04_edit_notes.md`(blog-editor.md:25-26). 데이터흐름도(122-137행)와 일치. ③ 스킬 참조: `blog-research`/`blog-writing`/`blog-editing` 실재, 각 SKILL의 `references/{research-checklist,writing-guide,editing-checklist}.md` 3파일 모두 실재(예 blog-research SKILL:64 ↔ research-checklist.md 존재). ④ dead-link 없음(orchestrator 139행 자가 점검과 실측 일치). *경미 주의(감점 아님): 산출물 번호가 00→02→03→04→05로 01이 비고, 오케스트레이터가 에이전트 위치를 `_smoketest_blog/.claude/agents/`로 표기(14·65행)하나 실제 파일과 이름 일치하므로 경계면 불일치는 아님.* |
| 3 | 완전성 | 8.5 | **에이전트:** 3개 모두 7섹션 완비(예 blog-editor.md 핵심역할10·작업원칙15·입출력22·팀통신29·이전산출물34·에러38·협업43). 누락 0. **오케스트레이터:** Phase 0(17-35행)·구성표(67-73)·데이터흐름(120-139)·에러핸들링표(143-153)·테스트 시나리오 정상+에러(156-173) 모두 존재. 누락 0. **CLAUDE.md: 부재 — 하네스 전체에 CLAUDE.md 파일이 존재하지 않음**(find 확인). 루브릭 "CLAUDE.md 포인터(트리거+변경 이력) 존재" 미충족 → **−1.5**. (트리거 정보는 오케스트레이터 description에 있으나 CLAUDE.md 포인터·변경 이력은 부재.) |
| 4 | 트리거 품질 | 10 | 오케스트레이터 description(3행)에 pushy("반드시 이 스킬을 사용")+풍부한 후속 키워드(재실행·수정·보완·업데이트·부분 재작성·"결론만 다시"·"이 섹션만"·"분량 조정(더 길게·짧게)"·"톤 변경(캐주얼/격식)"·"제목·메타 변경") 포함. **명시 제외**("단순 사실 질의·요약 등 파이프라인 불필요 작업엔 쓰지 않는다"). 도메인 스킬 3종 description에 구체 트리거+**상호 배제 경계**("초안 작성은 blog-writing이…", "사실 수집은 blog-research가…", blog-editing 3행 등) 포함 — 루브릭의 "상호 배제 경계" 요건 충족. should-trigger 5/5(분량·톤이 명시 키워드라 더 정확). near-miss 5/5(요약·사실질의 명시 제외로 "통계 요약해줘"까지 정확히 미트리거). 오답 0. harness-factory와 도메인 분리. |
| 5 | 방법론 준수 | 10 | TeamCreate 3멤버 모두 `model:"opus"` 명시(orchestrator 55·57·59행) + 본문에 "모든 멤버에 model:opus 명시" 강조(49행) — 누락 0. 실행 모드 명시("실행 모드: 에이전트 팀", 8행 + 근거 10행). SKILL.md 4종 모두 ≤500줄, **본문 비대를 references/로 분리**(checklist·guide 3파일) — progressive disclosure 모범 준수. `commands/` 미생성. `_workspace` 컨벤션 사용. 에이전트 3개 = 적정, 과분리 없음. |
| 6 | 도메인 적합성 | 10 | 분해(researcher/writer/editor) 자연스러움. **품질 보장:** editor 생성-검증 게이트 + writer 반려 루프(최대 1회, blog-editor.md:18, orchestrator 97행). **도메인 특화 검증 기준이 references에 구체화:** 출처 신뢰도 A/B/C/미검증 등급표·최소 출처 수 ≥3·통계엔 A/B 등급 강제(research-checklist.md:5-22), 메타설명 ≤160자(editing-checklist.md:40-43), 발행 4요소 체크리스트(editing-checklist.md:45-58), 반려 기준 명문화(editing-checklist.md:25-37). 데이터 흐름이 "주제→발행본" 완성(domain→05_final, orchestrator 122-137행). |
| **합계** | | **58.5/60** | |

---

## 비교 결론

### 항목별 우열

| # | 카테고리 | A | B | 우열 |
|---|---------|----|----|------|
| 1 | 구조 유효성 | 10 | 10 | 동점 (둘 다 PASS 9/WARN 0/FAIL 0) |
| 2 | 경계면 정합 | 10 | 10 | 동점 (둘 다 불일치 0; B는 references 경로까지 추가로 실재) |
| 3 | 완전성 | 10 | 8.5 | **A 우위** (B는 CLAUDE.md 포인터 부재 −1.5) |
| 4 | 트리거 품질 | 10 | 10 | 동점 (둘 다 오답 0; B가 상호 배제 경계·요약 제외에서 미세 우수하나 만점 상한) |
| 5 | 방법론 준수 | 10 | 10 | 동점 (B는 references 분리로 progressive disclosure를 더 적극 시연하나 A도 위반 0) |
| 6 | 도메인 적합성 | 10 | 10 | 동점 (A는 2회 교차검증 루프, B는 신뢰도 등급표 등 검증 기준을 references에 체계화 — 접근만 다름) |

### 총점 차이
- **Harness-A: 60/60**
- **Harness-B: 58.5/60**
- **차이: A가 +1.5** — 유일한 격차는 카테고리3(완전성)의 CLAUDE.md 포인터 유무 단 한 건.

### 더 우수한 쪽: **Harness-A** — 결정적 이유 3가지
1. **CLAUDE.md 포인터의 존재 (유일하고 결정적인 차이).** A는 `.claude/CLAUDE.md`에 트리거(7행)와 변경 이력 표(9-12행)를 갖춰 루브릭 카테고리3을 완전 충족한다. B는 하네스 전체에 CLAUDE.md가 존재하지 않아 −1.5. 이 한 파일이 60 대 58.5의 전부다.
2. **편집 게이트의 교차검증 절차가 더 명시적·강건.** A의 editor는 "본문 [Sx] 표시와 sources 원문을 **양쪽 동시에** 읽어 over-claim·누락을 잡는다"는 절차와 검증 항목 표(blog-edit:18-23)를 갖고, 수정 루프를 **2회**까지 허용해 수렴 여지를 더 준다. B는 반려 **1회** 한도로 더 빠르나 미해결 시 한계 명시로 종결 — 품질 수렴 측면에선 A의 2회가 약간 더 보수적이다(다만 두 설계 모두 무한루프는 차단).
3. **최종 산출물의 사용자 경로 복사가 명문화.** A의 오케스트레이터는 `03_editor_final.md`를 사용자 지정 경로(`blog_post.md`)에 복사하고 4요소·내부표시 잔존을 최종 검증한다(104-108행). B는 `05_final_blog_post.md` 위치 보고에서 끝나 사용자 발행 경로로의 "복사·전달" 단계가 약하다(orchestrator 116행).

> 단, B의 강점도 분명하다: references/로의 progressive disclosure 분리, 출처 신뢰도 A/B/C 등급표·최소 출처 수 강제, 도메인 스킬 description의 명시적 상호 배제 경계는 A보다 체계적이다. 이 강점들은 해당 카테고리에서 이미 만점이라 점수로는 드러나지 않았다. 격차는 오직 CLAUDE.md 한 건에서 발생했다.

### 각 하네스의 가장 약한 1가지 결함
- **Harness-A:** 도메인 스킬 description에 **상호 배제 경계(어느 작업이 어느 스킬이 아닌지)** 문구가 없다. B의 "초안 작성은 blog-writing이, 사실 수집은 blog-research가 담당하므로 이 스킬은 쓰지 않는다"류 가드가 없어, 스킬 간 트리거 경합 시 B보다 분리도가 약하다(현 테스트에선 오트리거 없었으나 잠재 위험).
- **Harness-B:** **CLAUDE.md 포인터 완전 부재.** 하네스의 진입 트리거·변경 이력을 담는 표준 포인터 파일이 없어, 루트에서 "이 하네스를 언제 발동하는가"를 선언하는 계층이 비어 있다(유일한 실점 항목이자 운영·감사 추적 관점의 약점).

---

*블라인드 유지: 어느 쪽이 어떤 방식으로 생성되었는지 추론하지 않고, 오직 산출물 파일 증거로만 채점함.*
