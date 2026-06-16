---
name: blog-orchestrator
description: "블로그 글 작성 에이전트 팀(researcher·writer·editor)을 조율하여 주제/키워드로부터 발행 가능한 블로그 글 1편(제목·메타설명·본문·출처)을 산출하는 오케스트레이터. '블로그 글 써줘', '~에 대한 포스트 작성', '글 작성 하네스 실행' 등 블로그 글 작성 요청 시 사용. 후속 작업: 블로그 글 수정, 다시 실행, 재실행, 업데이트, 보완, 리서치/개요/초안/편집만 다시, 제목·메타설명만 수정, 이전 결과 기반 개선 요청 시에도 반드시 이 스킬을 사용. 단순히 글쓰기 팁을 묻는 질문에는 직접 응답."
---

# Blog Orchestrator — 블로그 글 작성 팀 조율

블로그 글 작성 에이전트 팀을 조율하여 주제/키워드를 발행 가능한 글 1편으로 완성하는 통합 스킬.

## 실행 모드: 에이전트 팀

아키텍처는 **파이프라인(리서치→초안→편집) + 생성-검증(editor↔writer 루프)** 복합 패턴이다. editor가 writer에게 실시간 수정 지시를 보내고, writer/researcher가 출처를 보강하는 양방향 통신이 결과 품질을 좌우하므로 에이전트 팀을 사용한다.

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|-------------|------|------|------|
| researcher | blog-researcher (커스텀) | 리서치 + 개요 설계 | blog-research | `01_researcher_sources.md`, `01_researcher_outline.md` |
| writer | blog-writer (커스텀) | 초안 집필 | blog-draft | `02_writer_draft.md` |
| editor | blog-editor (커스텀) | 편집·교정·출처검증·발행 패키징 | blog-edit | `03_editor_final.md` |
| (리더 = 오케스트레이터) | — | 팀 조율 + 최종 산출물 복사 | — | 사용자 지정 경로의 최종 글 |

> 3명의 집중된 팀(소규모, 5~10개 작업)이 적정하다. 리서치와 개요는 강하게 결합되어 한 에이전트(researcher)로 통합했다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

작업 디렉토리(`_smoketest_blog_baseline/`) 기준으로 기존 산출물을 확인하여 실행 모드를 결정한다:

1. `_workspace/`에 `01_*`/`02_*`/`03_*` 산출물이 있는지 확인 (`00_input/`만 있으면 초기 실행)
2. 실행 모드 결정:
   - **산출물 없음** → 초기 실행. Phase 1로 진행
   - **산출물 있음 + 부분 수정 요청** (예: "제목만 다시", "초안 3번째 섹션 보완", "출처 더 찾아줘") → **부분 재실행**. 해당 단계 에이전트만 재호출하고, 그 에이전트의 출력만 덮어쓴다. 하류 단계(예: editor)도 영향받으면 이어서 재실행
   - **산출물 있음 + 새 주제 제공** → **새 실행**. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동한 뒤 Phase 1 진행
3. 부분 재실행 시: 이전 산출물 경로를 에이전트 프롬프트에 포함하여, 에이전트가 기존 결과를 읽고 피드백만 반영하도록 지시

**부분 재실행 영향 범위 (하류 전파):**
| 수정 대상 | 재호출 순서 |
|----------|-----------|
| 리서치/개요 | researcher → writer → editor (전체 하류) |
| 초안 | writer → editor |
| 제목/메타설명/교정 | editor만 |

### Phase 1: 준비
1. 사용자 입력에서 주제/키워드, 톤·분량 요구, 최종 출력 경로(미지정 시 `_smoketest_blog_baseline/blog_post.md`)를 파악
2. `_workspace/` 준비:
   - **초기 실행**: 기존 구조 유지 (`00_input/`는 보존)
   - **새 실행**: 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후, `00_input/`을 포함해 새로 생성
3. 주제/키워드/요구사항을 `_workspace/00_input/domain.md`에 반영(또는 보강)

### Phase 2: 팀 구성

1. 팀 생성:
   ```
   TeamCreate(
     team_name: "blog-team",
     members: [
       { name: "researcher", agent_type: "blog-researcher", model: "opus",
         prompt: "blog-research 스킬을 따라 주제의 출처를 조사하고 출처 기반 개요를 설계하라. 개요 완성 시 writer에게 SendMessage로 통지하라." },
       { name: "writer", agent_type: "blog-writer", model: "opus",
         prompt: "blog-draft 스킬을 따라 researcher의 개요+출처로 초안을 집필하라. 개요에 없는 사실은 추가하지 말고, 부족하면 researcher에게 요청하라. 완성 시 editor에게 통지하라." },
       { name: "editor", agent_type: "blog-editor", model: "opus",
         prompt: "blog-edit 스킬을 따라 초안을 교정하고 본문과 sources를 양쪽 동시에 읽어 출처를 교차 검증하라. 불일치는 writer/researcher에게 수정 지시(최대 2회). 최종 제목·메타설명·본문·출처를 패키징하라." }
     ]
   )
   ```

2. 작업 등록 (의존성 명시):
   ```
   TaskCreate(tasks: [
     { title: "리서치 + 개요 설계", assignee: "researcher" },
     { title: "초안 집필", assignee: "writer", depends_on: ["리서치 + 개요 설계"] },
     { title: "편집·교정·출처검증·패키징", assignee: "editor", depends_on: ["초안 집필"] }
   ])
   ```
   > 부분 재실행 시에는 Phase 0의 영향 범위 표에 따라 필요한 작업만 등록한다.

### Phase 3: 파이프라인 실행 + 생성-검증 루프

**실행 방식:** 팀원들이 공유 작업 목록으로 자체 조율. 파이프라인이므로 의존성 순서(researcher→writer→editor)를 따르되, 통신은 실시간으로 흐른다.

**팀원 간 통신 규칙:**
- researcher → writer: 개요 완성 시 SendMessage로 "개요 경로 + 주의할 핵심 사실" 통지
- writer → researcher: 특정 섹션 출처가 부족하면 SendMessage로 보강 요청
- writer → editor: 초안 완성 시 SendMessage로 "초안 경로" 통지
- editor → writer: 출처 미일치/과장 발견 시 구체적 수정 지시 SendMessage (생성-검증 루프, 최대 2회)
- editor → researcher: 출처 자체 보강이 필요하면 SendMessage로 요청
- 경계 이슈(본문 주장 vs 출처 불일치)는 editor가 writer와 researcher **모두**에게 통지

**산출물 저장:**

| 팀원 | 출력 경로 |
|------|----------|
| researcher | `_workspace/01_researcher_sources.md`, `_workspace/01_researcher_outline.md` |
| writer | `_workspace/02_writer_draft.md` |
| editor | `_workspace/03_editor_final.md` |

**리더 모니터링:**
- 팀원이 유휴 상태가 되면 자동 알림 수신 → 다음 단계 팀원이 시작했는지 확인
- editor의 생성-검증 루프가 2회를 초과하면 리더가 개입하여 미해결 항목을 확정(약화/제거)하고 진행
- 전체 진행률은 TaskGet으로 확인

### Phase 4: 최종 산출물 생성
1. 모든 작업 완료 대기 (TaskGet으로 editor 작업 done 확인)
2. `_workspace/03_editor_final.md`를 Read로 수집
3. 최종 검증: 제목·메타설명·본문·출처 4요소가 모두 있고 본문에 내부 표시([Sx])가 남아있지 않은지 확인
4. 최종본을 사용자 지정 경로(기본 `_smoketest_blog_baseline/blog_post.md`)에 복사

### Phase 5: 정리
1. 팀원들에게 종료 요청 (SendMessage)
2. 팀 정리 (TeamDelete)
3. `_workspace/` 보존 (중간 산출물 삭제 금지 — 사후 검증·감사 추적용)
4. 사용자에게 결과 요약 보고 + 피드백 기회 제공 ("개선할 부분이 있나요?")

## 데이터 흐름

```
사용자 주제/키워드
        │
        ▼
[00_input/domain.md]
        │
        ▼
[researcher] ──→ 01_researcher_sources.md ──┐
        │   ──→ 01_researcher_outline.md ──┐│
        │ SendMessage(개요 준비)            ││
        ▼                                   ▼▼
[writer] ────────→ 02_writer_draft.md  (개요+출처를 Read)
        │   ▲ SendMessage(출처 보강 요청)
        │ SendMessage(초안 준비)
        ▼   │ SendMessage(수정 지시, 최대 2회)
[editor] ◀──┘  (draft + sources 양쪽 Read로 교차 검증)
        │
        ▼
03_editor_final.md ──복사──→ {사용자 지정 경로}/blog_post.md
```

**데이터 전달 프로토콜:** 태스크 기반(의존성 조율) + 파일 기반(산출물) + 메시지 기반(통지·수정 지시).
각 출력이 다음 입력과 정확히 맞물린다 — outline+sources는 writer의 유일한 입력, draft+sources는 editor의 유일한 입력. dead-link 없음.

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| researcher가 신뢰할 출처를 못 찾음 | 해당 주장을 개요 "조사 한계"에 기록, 그 주제 없이 진행. 보고서에 명시 |
| writer가 개요에 없는 사실이 필요 | researcher에게 SendMessage로 출처 요청. 1회 보강 실패 시 해당 문장 제외 |
| editor↔writer 수정 루프 2회 초과 | 리더 개입 → 미해결 주장 약화/제거 후 발행, 보고서에 "미해결" 명시 |
| 출처 파일 손상/누락 | editor가 검증 불가 항목을 "출처 미확인" 표시, 리더에게 보고 |
| 팀원 1명 실패/중지 | 리더가 유휴 알림 감지 → SendMessage로 상태 확인 → 재시작. 재실패 시 부분 결과로 진행하고 누락 명시 |
| 팀원 간 데이터 충돌(상충 정보) | 삭제하지 않고 출처 병기 (researcher가 양쪽 기록, editor가 본문에 균형 반영) |
| 주제 모호 | researcher가 2~3개 해석 제시 → 리더가 사용자에게 선택 요청 |

핵심 원칙: 1회 재시도 후 재실패 시 해당 결과 없이 진행(누락 명시), 상충 데이터는 삭제하지 않고 출처 병기.

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "원격 근무 생산성 높이는 법"을 주제로 요청 (톤: 실무자 대상, 분량: 1500자)
2. Phase 0: `_workspace/`에 산출물 없음 → 초기 실행
3. Phase 1: 주제/톤/분량/출력 경로 파악, `00_input/domain.md` 보강
4. Phase 2: blog-team 구성(3명) + 3개 작업 등록(의존성 체인)
5. Phase 3: researcher가 출처 5개 조사+개요 설계 → writer에게 통지 → writer가 초안 집필 → editor에게 통지 → editor가 교차 검증(1개 over-claim 발견→writer 수정 1회) → 최종 패키징
6. Phase 4: `03_editor_final.md` 4요소 검증 후 `blog_post.md`로 복사
7. Phase 5: 팀 정리, `_workspace/` 보존, 결과 보고
8. 예상 결과: `_smoketest_blog_baseline/blog_post.md`에 제목·메타설명·본문·출처를 갖춘 글 생성

### 에러 흐름 (출처 부족 + 수정 루프 초과)
1. Phase 3에서 researcher가 한 핵심 통계의 1차 출처를 못 찾음 → 개요 "조사 한계"에 기록
2. writer가 해당 통계 없이 초안 집필
3. editor가 본문 한 주장이 출처보다 과장됨을 발견 → writer에게 수정 지시
4. writer 수정 후에도 editor가 여전히 불일치 판단 → 2회째 수정 지시
5. 2회 초과 → 리더 개입, 해당 주장을 약화 처리
6. 최종 글은 정상 발행, 보고서에 "1개 통계 출처 미확보(조사 한계), 1개 주장 약화 처리" 명시

### 후속 작업 흐름 (부분 재실행)
1. 사용자가 "제목이 너무 밋밋해, 제목만 다시"라고 요청
2. Phase 0: `03_editor_final.md` 존재 + 부분 수정 → 부분 재실행, editor만 재호출
3. editor가 기존 최종본을 읽고 제목만 교체, 나머지 보존
4. `blog_post.md` 갱신, 결과 보고
