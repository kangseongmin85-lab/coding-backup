# Skill Engineer Manifest — 블로그 글 작성 하네스

생성 출처: `_workspace/01_architect_blueprint.md` §5(스킬 명세표)·§6(오케스트레이터 명세)·§7(데이터 흐름)
에이전트 name 출처: `_workspace/03_agent_engineer_manifest.md` (글자 그대로 사용)
저장 위치: `_smoketest_blog/.claude/skills/{skill-name}/SKILL.md` (+ `references/`)

## 생성 스킬 목록

| 스킬명 | 종류 | 본문 줄수 | references | 연결 에이전트 |
|--------|------|-----------|------------|---------------|
| blog-research | 도메인 | 64 | research-checklist.md (50줄) | blog-researcher |
| blog-writing | 도메인 | 63 | writing-guide.md (43줄) | blog-writer |
| blog-editing | 도메인 | 76 | editing-checklist.md (58줄) | blog-editor |
| blog-orchestrator | 오케스트레이터 | 173 | (없음 — 본문 내 수용) | blog-researcher, blog-writer, blog-editor |

전 파일 500줄 이내 ✔. progressive disclosure: 각 도메인 스킬의 체크리스트/가이드 세부를 `references/`로 분리.

## 오케스트레이터가 참조하는 에이전트 이름 (경계면 — 글자 그대로)

- blog-researcher
- blog-writer
- blog-editor

→ `_smoketest_blog/.claude/agents/{name}.md` 3개 파일과 일치 확인(blog-researcher.md, blog-writer.md, blog-editor.md). agent-engineer manifest의 name 목록과 일대일 ✔.

## QA 교차검증 체크 (blueprint §9 대응)

- [x] 오케스트레이터 members 이름(blog-researcher/writer/editor) 모두 `.claude/agents/`에 파일 실재.
- [x] 출력→입력 경로 일치: 02→writer 입력, 03→editor 입력 (data flow = agent manifest 경로와 일대일, dead-link 없음).
- [x] 4개 SKILL.md 모두 name·description frontmatter 보유.
- [x] blog-orchestrator description에 후속 키워드(재실행/수정/보완/업데이트/부분 재작성/특정 섹션/분량·톤 조정/리서치 보강) 포함.
- [x] commands/ 미생성(스킬만 생성).
- [x] 모든 TeamCreate 멤버에 `model: "opus"` 명시.
- [x] 도메인 특화: blog-editing이 발행본 4대 구성(제목·메타≤160자·본문·출처) + 출처 정합 + 반려 사유 기록(04_edit_notes.md)을 보장.

## 오케스트레이터 핵심 구조

- 실행 모드: 에이전트 팀 (전 구간 단일 팀), 본문 상단 명시.
- Phase 0(컨텍스트 확인·신규/부분/새 실행 분기) + Phase 1~5.
- 포함: 에이전트 구성표 / 데이터 흐름도 / 에러 핸들링표 / 테스트 시나리오(정상1 신규실행 + 에러1 사실정합 반려루프).
- 부분 재실행 매핑표: 리서치보강→researcher↓, 섹션/분량/톤→writer↓, 재교정/메타→editor.
