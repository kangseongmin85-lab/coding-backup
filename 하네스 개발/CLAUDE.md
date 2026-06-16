# CLAUDE.md — 하네스 개발

상위 `../CLAUDE.md`의 행동 지침을 상속한다. 이 파일은 이 프로젝트의 하네스 포인터를 담는다.

## 하네스: 메타 하네스 (Harness Factory)

**목표:** 어떤 도메인이든 받아 에이전트 정의·스킬·오케스트레이터·CLAUDE.md 포인터를 자동 설계·생성·검증하는 전담 에이전트 팀(하네스 공장)을 운영한다.

**트리거:** 하네스 구축/구성/설계, "{도메인}용 자동화 팀 만들어줘", 기존 하네스 확장·수정·점검·감사·동기화·진화 요청 시 `harness-factory` 스킬을 사용하라. 단순히 하네스 개념을 묻는 질문은 직접 응답 가능.

**플러그인 메타 스킬과의 관계:** 플러그인 `harness:harness`는 방법론 문서(리더가 수동으로 따르는 가이드)다. `harness-factory`는 그 방법론을 전담 에이전트 팀 + 자동 검증으로 operationalize한 운영 버전이다. 이 프로젝트에서 하네스 제작은 `harness-factory`를 우선 사용한다.

**구성:** 4 에이전트(harness-architect / agent-engineer / skill-engineer / harness-qa) + 오케스트레이터 스킬 `harness-factory`(references 4종 + 검증 스크립트). 상세는 `.claude/agents/`, `.claude/skills/`에서 직접 확인.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-14 | 초기 구성 — 메타 하네스(에이전트 4 + harness-factory 오케스트레이터 + 검증 스크립트) | 전체 | 단일 메타 스킬을 전담 팀·자동검증·생성-검증 루프로 격상 |
| 2026-06-14 | references 경로 dead-link 수정(`.claude/` 접두사 추가) | agents/*, qa-protocol.md | 드라이런에서 경계면 결함 포착 |
| 2026-06-14 | 스모크 테스트 통과 — "블로그 글 작성 하네스"를 4-에이전트 팀으로 end-to-end 생성·검증(QA PASS 19/0, 경계면 결함 0) | (검증) | 실전 가동 확인 |
| 2026-06-14 | `validate_harness.py` 오케스트레이터 판별 신호를 가동 토큰(TeamCreate/TaskCreate/subagent_type)으로 한정 | scripts/validate_harness.py | 스모크 테스트에서 도메인 스킬 오탐(WARN) 발견 → 휴리스틱 개선 |
