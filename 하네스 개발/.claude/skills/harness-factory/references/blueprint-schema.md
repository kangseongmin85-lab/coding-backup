# Blueprint 표준 스키마

harness-architect가 산출하는 설계도(`_workspace/01_architect_blueprint.md`)의 표준 형식. agent-engineer·skill-engineer·harness-qa가 모두 이 한 문서를 단일 진실 공급원으로 삼는다. 따라서 빈칸·모호함 없이 완결적으로 채운다.

아래 템플릿을 그대로 복사하여 `{ }`를 채운다.

---

```markdown
# Blueprint: {도메인명} 하네스

## 1. 도메인 요약
- 목표: {이 하네스가 달성할 핵심 한 줄}
- 핵심 작업 유형: {생성/검증/편집/분석 중 해당}
- 입력: {사용자가 무엇을 주는가}
- 최종 산출물: {무엇을 어디에 출력하는가}
- 기술 스택/제약: {파악된 스택, 데이터 모델, 주요 모듈}

## 2. 실행 모드
- 선택: {에이전트 팀 | 서브 에이전트 | 하이브리드}
- 이유: {왜 이 모드인가 — 팀 통신 필요성/병렬성 근거}
- (하이브리드면) Phase별 모드 표

## 3. 아키텍처 패턴
- 패턴: {파이프라인 | 팬아웃·팬인 | 전문가 풀 | 생성-검증 | 감독자 | 계층적 위임 | 복합}
- 이유: {작업 의존 구조와 패턴이 맞는 근거}

## 4. 에이전트 명세표
각 에이전트마다 아래 표의 한 행을 완결적으로 채운다.

| name | 타입 | model | 핵심 역할 | 입력 경로 | 출력 경로 | 사용 스킬 | 팀 통신 대상 |
|------|------|-------|----------|----------|----------|----------|------------|
| {kebab-name} | {custom / general-purpose / Explore / Plan} | opus | {한 줄} | {_workspace/...} | {_workspace/{phase}_{agent}_{artifact}.ext} | {skill명 또는 인라인} | {수신:누구→무엇 / 발신:누구→무엇} |

> 규칙: name은 kebab-case, 파일명과 일치. 출력 경로는 `{phase}_{agent}_{artifact}.ext` 컨벤션. QA 타입이면 general-purpose(스크립트 실행 필요).

## 5. 스킬 명세표
| 스킬명 | description 초안(pushy, 후속 키워드 포함) | references 필요? | scripts 필요? | 연결 에이전트 |
|--------|------------------------------------------|-----------------|---------------|--------------|
| {skill-name} | {하는 일 + 트리거 상황 + 재실행/수정/보완} | {예/아니오 + 내용} | {예/아니오 + 내용} | {agent name} |

> 재사용 검토 결과를 한 줄로: 기존 스킬과 {중복 없음 / 재사용 / 일반화 확장} 중 무엇인가.

## 6. 오케스트레이터 명세
- 오케스트레이터 스킬명: {domain}-orchestrator
- description 초안: {초기 키워드 + 후속 키워드}
- Phase 구성:
  - Phase 0: 컨텍스트 확인 (_workspace 분기)
  - Phase 1: {준비}
  - Phase 2: {팀 구성 — 누구를 members로}
  - Phase 3: {주요 작업}
  - Phase 4: {검증/통합}
  - Phase 5: {정리}
- 작업 할당(TaskCreate): {작업 목록 + assignee + depends_on}
- 에러 정책: {1회 재시도 → 누락 명시 진행, 상충 데이터 출처 병기}

## 7. 데이터 흐름
{에이전트 간 출력→입력 연결을 화살표로. 모든 출력 파일이 어떤 에이전트의 입력으로 쓰이는지 명시. 끊긴 노드(dead-link)가 없어야 한다.}

예:
architect → 01_blueprint.md → (agent-engineer, skill-engineer 둘 다 Read)
agent-engineer → agents/*.md + 03_manifest.md → (qa Read)
skill-engineer → skills/*/SKILL.md + 04_manifest.md → (qa Read)
qa → 05_qa_report.md → (리더 통합)

## 8. 트리거 키워드
- 초기 실행: {도메인 작업 요청 표현들}
- 후속 작업: 재실행 / 업데이트 / 수정 / 보완 / 부분 재실행 / 이전 결과 개선 + {도메인 일상 표현}

## 9. QA 검증 기준 (assertion)
harness-qa가 확인할 객관적 검증 항목. 예:
- [ ] 오케스트레이터의 members/subagent_type에 등장하는 모든 이름이 `agents/`에 파일로 존재한다.
- [ ] 각 에이전트의 출력 경로가 그것을 입력으로 쓰는 에이전트의 입력 경로와 일치한다.
- [ ] 모든 스킬 SKILL.md에 name·description frontmatter가 있다.
- [ ] 오케스트레이터 description에 후속 작업 키워드가 포함된다.
- [ ] `.claude/commands/`에 아무것도 생성되지 않았다.
- [ ] {도메인 특화 검증 항목}
```

---

## 작성 시 자주 틀리는 곳
- **출력 경로 누락** → agent-engineer가 빈칸을 임의로 채우고 경계면이 깨진다. 모든 행의 입력·출력을 반드시 채운다.
- **팀 통신 대상이 추상적** → "다른 팀원과 협업" 같은 표현 금지. "media에게 투자정보 발신" 수준으로 구체화한다.
- **QA 검증 기준이 비어 있음** → QA가 무엇을 볼지 모른다. 도메인 특화 assertion을 최소 2개 추가한다.
- **에이전트 수 과다** → 분리 전 "이 역할은 독립 실행되는가, 다른 팀에서도 쓰는가"를 자문. 아니면 통합한다.
