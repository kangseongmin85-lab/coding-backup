---
name: study-record
description: 학습 기록의 단일 기준 — 단어장(vocab.json)과 누적 공부 이력(study_log.json)의 스키마·기록 규칙. "단어장", "내가 외운 단어", "이 단어 기억해줘", "공부 이력", "지금까지 뭐 공부했지", "학습 기록 보여줘" 요청 시 사용할 것. 또한 모든 학습 세션(받아쓰기, 롤플레이, 복습) 종료 시 반드시 이 규칙대로 기록을 남길 것.
---

# Study Record — 단어장 & 공부 이력

모든 학습 활동은 흔적을 남긴다. 기록이 쌓여야 약점 분석과 복습이 가능하고, 사용자가 자신의 성장을 확인할 수 있다.

## 기록 파일 3종

| 파일 | 내용 | 갱신 시점 |
|------|------|----------|
| `data/vocab.json` | 단어장 — 뜻을 몰랐던 단어/표현 | 세션 중 새 단어 발견 시 |
| `data/study_log.json` | 누적 공부 이력 — 세션당 1엔트리 | 모든 세션 종료 시 (필수) |
| `data/sessions/*.md` | 세션 상세 로그 (대화 전문, 해설) | 각 모드 스킬의 형식대로 |

## vocab.json — 단어장

```json
{
  "words": [
    {
      "id": "w001",
      "term": "reproducibility",
      "ko": "재현성",
      "example": "the reproducibility of the assay",
      "sentence_ref": "s004",
      "source": "dictation",
      "added": "2026-06-10",
      "encounters": 1,
      "last_seen": "2026-06-10"
    }
  ]
}
```

- **id**: `w` + 3자리 연번. **term**: 단어 또는 청크(구 단위 표현도 가능, 예: "walk me through").
- **source**: `dictation`(받아쓰기에서 발견) / `roleplay`(롤플레이 피드백) / `user`(사용자가 직접 "이 단어 기억해줘") / `pack`(문장팩 해설 중)
- **sentence_ref**: 관련 학습 문장 id (없으면 null). **encounters/last_seen**: 이미 있는 단어를 다시 만나면 +1/날짜 갱신 (중복 등록 금지).

**무엇을 단어장에 넣는가 — 핵심 구분:**
- 받아쓰기에서 놓친 단어가 **아는 단어인데 못 들은 것**(of, to, last 등) → 듣기 문제. `sentences.json`의 `missed_words`에만 기록하고 단어장에는 넣지 않는다.
- **뜻 자체를 모르는 단어/표현** → 단어장 등록. 애매하면 사용자에게 한 번 확인한다: "reproducibility는 뜻 알고 계셨어요?"
- 롤플레이 피드백에서 알려준 새 표현, 사용자가 기억해 달라는 단어는 바로 등록.

## study_log.json — 누적 공부 이력

세션당 1엔트리. **어떤 모드든 세션이 끝나면 반드시 추가한다.**

```json
{
  "entries": [
    {
      "date": "2026-06-10",
      "mode": "dictation",
      "sentences": ["s001", "s002", "s003"],
      "results": { "attempted": 3, "passed": 2 },
      "new_words": ["w001"],
      "note": "약형 of/to를 일관되게 놓침. gb-f 악센트 약함."
    }
  ]
}
```

- **mode**: `dictation` / `roleplay` / `review` / `pack`(문장팩 생성)
- **results**: 모드에 맞게 — dictation/review는 attempted/passed, roleplay는 `{ "turns": 8, "scenario": "cro-negotiation" }`, pack은 `{ "added": 5 }`
- **note**: 그날의 핵심 관찰 1~2줄 (약점, 특이사항). progress-analyst가 추이 분석에 사용한다.
- 같은 날 여러 세션이면 엔트리를 여러 개 추가한다 (병합하지 않음).

## 이력 조회 ("지금까지 뭐 공부했지?", "단어장 보여줘")

- **단어장**: vocab.json을 읽고 최근 추가순으로 표 제시 (term / 뜻 / 출처 / 만난 횟수). 10개 넘으면 최근 10개 + 전체 수.
- **공부 이력**: study_log.json을 읽고 요약 — 총 세션 수, 모드별 횟수, 최근 7일 활동, 정답률 추이, 새로 배운 단어 수. 상세 분석이 필요하면 progress-analyst 서브 에이전트를 호출한다.

## 에러 대응

- vocab.json/study_log.json이 없으면 위 스키마의 빈 구조로 생성 후 진행.
- 파싱 실패 시 `.bak` 백업 후 사용자에게 보고 (임의 복구 금지 — sentences.json과 동일 원칙).
