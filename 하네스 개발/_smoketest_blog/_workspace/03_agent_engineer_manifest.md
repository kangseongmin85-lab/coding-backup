# Agent Engineer Manifest — 블로그 글 작성 하네스

생성 출처: `_workspace/01_architect_blueprint.md` §4 에이전트 명세표
저장 위치: `_smoketest_blog/.claude/agents/{name}.md`
8개 필수 섹션(frontmatter / 핵심 역할 / 작업 원칙 / 입력·출력 프로토콜 / 팀 통신 프로토콜 / 이전 산출물이 있을 때 / 에러 핸들링 / 협업) 모두 충족.

## 생성 파일 목록

| 파일명 | name (frontmatter) | 타입 | 입력 경로 | 출력 경로 |
|--------|--------------------|------|-----------|-----------|
| blog-researcher.md | blog-researcher | custom | `_workspace/00_input/domain.md` + 오케스트레이터 전달 주제/키워드·옵션 | `_workspace/02_research_outline.md` |
| blog-writer.md | blog-writer | custom | `_workspace/02_research_outline.md` | `_workspace/03_draft.md` |
| blog-editor.md | blog-editor | custom | `_workspace/03_draft.md` (+ 참조 `_workspace/02_research_outline.md`) | `_workspace/05_final_blog_post.md` + `_workspace/04_edit_notes.md` |

## 경계면 점검 (QA 교차검증용)
- name = 파일명 = blueprint §4 명세표 글자 그대로 일치 ✔
- 입력/출력 경로 = blueprint §4 값과 정확히 일치 (임의 변경 없음) ✔
- 데이터 흐름 체인: 02 → writer 입력 → 03 → editor 입력 → 05 (+04) ✔ (blueprint §7과 정합)
- description에 트리거 키워드(리서치/추가 근거/초안/재작성/편집/교정/재교정/메타 보강 등) 포함 ✔
- model 명시 없음 — 오케스트레이터(skill-engineer 산출물)가 `model: "opus"`로 지정 ✔
- commands/ 생성 없음 (blueprint §9 QA 기준 준수) ✔

## skill-engineer에게 전달할 name 목록 (오케스트레이터 members / subagent_type 경계면)
- blog-researcher
- blog-writer
- blog-editor
