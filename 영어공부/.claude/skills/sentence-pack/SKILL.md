---
name: sentence-pack
description: 바이오 R&D 비즈니스 영어 문장 생성 가이드. 학습 문장을 만들거나, 사용자가 가져온 문장을 등록하거나, 문장팩을 생성·수정·보완할 때 반드시 이 스킬을 따를 것. sentences.json 스키마와 id 규칙의 단일 기준. lesson-builder 에이전트의 핵심 스킬.
---

# Sentence Pack — 문장 생성 가이드

## 사용자 도메인 컨텍스트

사용자는 바이오 연구원 출신 프로젝트 매니저다. 문장은 이 실무 맥락에서 나와야 한다:

- **CRO/외부 용역**: 실험 위탁, 프로토콜 논의, 중간/최종 결과 리뷰, 일정·비용 협상, 품질 이슈 제기
- **에셋 평가**: 파이프라인/물질 평가, due diligence Q&A, 데이터 패키지 검토, 라이선싱 디스커션
- **사내 글로벌 미팅**: 프로젝트 업데이트, 마일스톤 보고, 리스크 공유

## 생성 원칙

1. **사용자가 가져온 문장이 최우선.** 어색한 부분만 자연스럽게 교정하고 등록한다. 교정했다면 무엇을 왜 바꿨는지 한 줄로 알려준다. 커리큘럼식 강요 금지.
2. **패턴 중심.** 낱개 문장이 아니라 재사용 가능한 패턴 단위로 만든다. 패턴 하나당 사용자 업무 맥락의 변형 3~5개. 예:
   - 패턴 `Could you walk me through ~?` → "...the stability data?", "...your QC process?", "...the timeline again?"
3. **길이 8~14단어.** 받아쓰기 훈련에 적합한 길이. 더 길면 절 단위로 쪼갠다.
4. **듣기 생존 표현을 섞는다.** 사용자는 못 알아들었을 때 대화가 끊기는 것이 가장 큰 고통이다. "Sorry, could you say that again?", "Do you mean ~?", "Let me make sure I got that right." 같은 표현은 우선순위가 높다.
5. **formal/casual 짝.** 같은 의도의 격식/비격식 버전을 함께 제시하면 미팅 상대에 따라 골라 쓸 수 있다. 둘 다 등록할지는 사용자 선택.
6. **실제 발화 그대로.** 교과서식 완전문보다 원어민이 미팅에서 실제로 말하는 형태(축약, 구어체 연결어 포함)로 쓴다. 듣기 훈련 재료이기 때문이다.

## sentences.json 스키마

```json
{
  "sentences": [
    {
      "id": "s001",
      "en": "Could you walk me through the stability data from the last batch?",
      "ko": "지난 배치의 안정성 데이터를 차근차근 설명해 주시겠어요?",
      "pattern": "Could you walk me through ~?",
      "notes": "\"Could you\"는 d+y가 합쳐져 <b>쿠쥬</b>로 들립니다. \"walk me through\"는 세 단어가 붙어 <b>웍미쓰루</b>. ...",
      "scenario": "cro-results-review",
      "tags": ["request", "meeting"],
      "added": "2026-06-10",
      "srs": { "box": 1, "next_review": "2026-06-10", "last_result": null },
      "listening": { "attempts": 0, "correct": 0, "missed_words": [], "weak_accents": [] }
    }
  ]
}
```

- **id**: `s` + 3자리 연번. 기존 최대 번호에 이어서.
- **notes** (필수): 듣기 해설 — 이 문장에서 연음·약형·flap t 등으로 뭉개지는 부분을 한국어로, 들리는 대로 표기(예: <b>쿠쥬</b>)해 가며 2~4문장으로 설명한다. 학습 앱이 받아쓰기 채점 후 그대로 보여주므로 HTML `<b>` 강조 사용 가능. 등록 시점에 반드시 함께 작성한다.
- **scenario** 값: `cro-kickoff`, `cro-protocol`, `cro-results-review`, `cro-negotiation`, `asset-evaluation`, `licensing`, `internal-update`, `meeting`(격식 미팅 일반), `presentation`(강의·발표·세미나), `survival`(생존 표현), `general`
- **srs / listening**: 신규 등록 시 위 초기값 그대로. 갱신 규칙은 `review-srs` 스킬 소관.
- **study** (선택): 받아쓰기 채점 화면 보강용. `{ "sound": 더 자세한 듣기 해설(연음·약형·강세), "examples": [{en, ko}] 패턴 응용 예문 3개, "tip": 쓰임 한 줄 }`. notes는 짧은 기본 해설이고 study.sound는 확장 해설(앱은 study.sound가 있으면 그걸 우선 표시). 미설정 시 `app/enrich_study.py`(또는 주간 파이프라인)가 자동 생성한다.
- 기존 데이터는 절대 삭제하지 않고 append만 한다.

## 등록 후 필수 작업

1. 보통 속도 오디오: `python .claude/skills/multi-accent-audio/scripts/generate_audio.py --batch data/sentences.json --ids {새 id들}`
2. 느린 버전: 같은 명령에 `--rate=-15%` 추가 (음수 rate는 반드시 `=`로 붙여 쓴다)
3. 사용자에게 결과 요약: 문장 목록(영어/한국어/패턴) + 오디오 생성 수
