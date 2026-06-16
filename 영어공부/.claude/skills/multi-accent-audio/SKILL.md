---
name: multi-accent-audio
description: 영어 문장의 다국 악센트 음성(TTS) 생성·재생 도구. 발음 듣기, 오디오 생성, 악센트 비교, "발음 들려줘", "느리게 들려줘", "영국식으로 들려줘" 요청 시 반드시 이 스킬의 번들 스크립트를 사용할 것. 듣기 훈련·롤플레이의 오디오 인프라.
---

# Multi-Accent Audio — 음성 생성/재생

edge-tts(무료, Microsoft 신경망 음성)로 악센트별 mp3를 생성하고, PowerShell로 재생한다. 모든 명령은 프로젝트 루트(`영어공부/`)에서 실행한다.

## 음성 구성

| 키 | 음성 | 악센트 |
|----|------|--------|
| `us-m` | en-US-AndrewNeural | 미국 남성 |
| `us-f` | en-US-AvaNeural | 미국 여성 |
| `gb-m` | en-GB-RyanNeural | 영국 남성 |
| `gb-f` | en-GB-SoniaNeural | 영국 여성 |

악센트 추가(인도 `en-IN-NeerjaNeural`, 호주 `en-AU-NatashaNeural` 등)는 `scripts/generate_audio.py`의 `VOICES` dict에 한 줄 추가하면 된다. 사용자가 요청하면 추가하고 CLAUDE.md 변경 이력에 기록한다.

## 오디오 생성

```powershell
# 단일 문장 (4개 음성 모두)
python .claude/skills/multi-accent-audio/scripts/generate_audio.py --text "문장" --id s001

# sentences.json에서 배치 (이미 생성된 파일은 자동 건너뜀)
python .claude/skills/multi-accent-audio/scripts/generate_audio.py --batch data/sentences.json

# 특정 문장·음성·속도만
python .claude/skills/multi-accent-audio/scripts/generate_audio.py --batch data/sentences.json --ids s001,s003 --voices gb-f --rate=-15%
```

- 출력: `audio/{id}_{음성키}.mp3`, 속도 변경 시 `_slow`/`_fast` 접미사 (예: `s001_gb-f_slow.mp3`)
- 속도 가이드: 받아쓰기 재청취용 느린 버전 `--rate=-15%`, 도전용 빠른 버전 `--rate=+15%`
- **주의**: 음수 rate는 반드시 `--rate=-15%`처럼 `=`로 붙여 쓴다. `--rate -15%`로 띄우면 argparse가 플래그로 오인해 실패한다.
- 롤플레이 등 임시 오디오는 `--out audio/roleplay --id turn01` 식으로 분리한다.

## 오디오 재생

```powershell
# 한 파일 재생 (재생이 끝날 때까지 블록됨)
powershell -ExecutionPolicy Bypass -File .claude/skills/multi-accent-audio/scripts/play_audio.ps1 -Path audio/s001_us-m.mp3

# 연속 재생 (악센트 비교: 같은 문장을 미국 → 영국 순으로)
powershell -ExecutionPolicy Bypass -File .claude/skills/multi-accent-audio/scripts/play_audio.ps1 -Path audio/s001_us-m.mp3 -Path2 audio/s001_gb-f.mp3
```

## 에러 대응

- `edge-tts` 미설치 오류 → `pip install edge-tts` 후 재시도
- 생성 실패(네트워크) → 1회 재시도, 재실패 시 사용자에게 알리고 진행
- 재생할 파일 없음 → 위 생성 명령으로 즉석 생성 후 재생
