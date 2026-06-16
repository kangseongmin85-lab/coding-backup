# -*- coding: utf-8 -*-
"""상황극(scenarios.json) 상대역 대사 오디오 생성.

각 시나리오의 partner 턴 대사를 그 시나리오의 partner.voice 로 생성한다
(보통 + 느린). 사용자 턴은 학습 문장(sentences.json)의 기존 오디오를 재사용하므로
여기서 만들지 않는다. 기존 파일은 generate_audio.py가 알아서 건너뛴다.

실행:  python app/seed_scenarios_audio.py
시나리오를 추가·수정한 뒤 다시 돌리면 새 대사만 생성된다.
출력:  audio/scenario/{scenarioId}_{aid}_{voice}{_slow}.mp3
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT / ".claude" / "skills" / "multi-accent-audio" / "scripts" / "generate_audio.py"
OUT = ROOT / "audio" / "scenario"
SCN = ROOT / "data" / "scenarios.json"

data = json.loads(SCN.read_text(encoding="utf-8"))
made = 0
for sc in data["scenarios"]:
    voice = sc["partner"]["voice"]
    for t in sc["turns"]:
        if t.get("role") != "partner":
            continue
        sid = f'{sc["id"]}_{t["aid"]}'
        for rate in ("+0%", "-15%"):
            try:
                p = subprocess.run(
                    [sys.executable, str(GEN), "--text", t["en"], "--id", sid,
                     "--voices", voice, "--rate=" + rate, "--out", str(OUT)],
                    capture_output=True, timeout=120, cwd=str(ROOT),
                )
                made += p.stdout.decode("utf-8", errors="replace").count(".mp3")
            except Exception as e:  # noqa: BLE001
                print(f"실패 {sid} ({rate}): {e}", file=sys.stderr)
print(f"생성/확인 완료: {made}개 파일")
