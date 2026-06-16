# -*- coding: utf-8 -*-
"""배운 문장을 배치한 상황극 시나리오 1개를 자동 생성해 data/scenarios.json 에 추가.

sentences.json의 학습 문장 전체를 Claude CLI에 주고 현실적인 대화 시나리오를
만들되, 사용자 턴은 반드시 학습 문장을 '그대로' 쓰도록 강제한다(en 일치로 ref 매핑).
일치하지 않는 사용자 턴은 버린다 → 앱은 항상 실제 학습 문장의 오디오를 재사용한다.
상대역 대사 오디오(보통+느린)도 생성한다.

실행:        python app/generate_scenario.py
weekly_update.py가 매주 호출 → 문장이 늘면 상황극도 함께 늘어난다.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SENT = ROOT / "data" / "sentences.json"
SCN = ROOT / "data" / "scenarios.json"
GEN = ROOT / ".claude" / "skills" / "multi-accent-audio" / "scripts" / "generate_audio.py"
AUDIO_OUT = ROOT / "audio" / "scenario"
VOICES = ("us-m", "us-f", "gb-m", "gb-f")

PROMPT = """You are creating ONE realistic business-English role-play scenario for a Korean
bio R&D project manager. The scenario must place the user's ALREADY-LEARNED
sentences as natural responses, so the learner practices using them in context.

The user's learned sentences (each line = exact English, then its category):
__SENTENCES__

Avoid duplicating these existing scenario titles: __AVOID__

Create ONE coherent scenario as JSON:
- Choose a realistic situation (CRO call, internal update, schedule/cost
  negotiation, conference talk + audience Q&A, asset-evaluation due diligence...).
- "partner" = the counterpart with "name", "role" (Korean allowed), and "voice"
  = exactly one of: us-m, us-f, gb-m, gb-f.
- "turns" alternate naturally between partner and user (consecutive user turns
  are fine in a presentation). Aim for 5-8 USER turns.
- Each USER turn MUST reuse ONE of the learned sentences VERBATIM in its "en"
  field (copy the exact English unchanged). Add a Korean "hint" for the learner.
- partner turns are what a real counterpart actually says (8-18 words) + a
  Korean "ko" translation.
- REALISM IS CRITICAL: only place a learned sentence where a real person would
  genuinely say it. Never force a sentence whose specific wording or object does
  not fit the moment — skip such sentences. It must read like a real meeting.

Output ONLY a JSON object, no prose, no markdown fences:
{"title":"<한국어 제목>","scenario":"<category>","brief":"<한국어 상황 설명 2-3문장>","goal":"<한국어 목표 한 줄>","partner":{"name":"...","role":"...","voice":"us-m"},"turns":[{"role":"partner","en":"...","ko":"..."},{"role":"user","en":"<EXACT learned sentence>","hint":"..."}]}
"""


def norm(s: str) -> str:
    s = s.lower().replace("—", " ").replace("–", " ")
    s = re.sub(r"[^a-z0-9' ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def run_claude(prompt: str) -> str:
    try:
        p = subprocess.run(
            "claude -p", input=prompt.encode("utf-8"), shell=True,
            capture_output=True, timeout=300, cwd=str(ROOT),
        )
        return p.stdout.decode("utf-8", errors="replace")
    except Exception as e:  # noqa: BLE001
        print(f"claude 실패: {e}", file=sys.stderr)
        return ""


def parse_obj(raw: str):
    a, b = raw.find("{"), raw.rfind("}")
    if a == -1 or b <= a:
        return None
    try:
        return json.loads(raw[a:b + 1])
    except Exception:
        return None


def gen_partner_audio(scid: str, turns: list, voice: str) -> None:
    for t in turns:
        if t.get("role") != "partner":
            continue
        sid = f'{scid}_{t["aid"]}'
        for rate in ("+0%", "-15%"):
            try:
                subprocess.run(
                    [sys.executable, str(GEN), "--text", t["en"], "--id", sid,
                     "--voices", voice, "--rate=" + rate, "--out", str(AUDIO_OUT)],
                    capture_output=True, timeout=120, cwd=str(ROOT),
                )
            except Exception as e:  # noqa: BLE001
                print(f"오디오 실패 {sid}: {e}", file=sys.stderr)


def run():
    """시나리오 1개 생성·등록·오디오. 성공 시 시나리오 id, 실패 시 None."""
    sentences = json.loads(SENT.read_text(encoding="utf-8"))["sentences"]
    if len(sentences) < 4:
        return None
    by_en = {norm(s["en"]): s for s in sentences}
    listing = "\n".join(f'- "{s["en"]}" ({s.get("scenario", "general")})' for s in sentences)

    scn = json.loads(SCN.read_text(encoding="utf-8"))
    existing_titles = {sc["title"] for sc in scn["scenarios"]}
    max_n = max((int(sc["id"][2:]) for sc in scn["scenarios"] if sc["id"].startswith("sc")), default=0)

    prompt = (PROMPT
              .replace("__SENTENCES__", listing)
              .replace("__AVOID__", "; ".join(existing_titles) or "(none)"))
    obj = parse_obj(run_claude(prompt))
    if not obj or "turns" not in obj:
        return None

    turns, user_matches = [], 0
    for t in obj.get("turns", []):
        role = t.get("role")
        en = " ".join(str(t.get("en", "")).split())
        if role == "user":
            s = by_en.get(norm(en))
            if not s:
                continue  # 학습 문장과 정확히 일치하지 않으면 버림
            turns.append({"role": "user", "ref": s["id"], "en": s["en"],
                          "ko": s.get("ko", ""), "hint": str(t.get("hint", ""))})
            user_matches += 1
        elif role == "partner" and en:
            turns.append({"role": "partner", "en": en, "ko": str(t.get("ko", ""))})
    if user_matches < 3:
        return None

    pi = 0
    for t in turns:
        if t["role"] == "partner":
            pi += 1
            t["aid"] = "p" + str(pi).zfill(2)

    voice = obj.get("partner", {}).get("voice", "us-m")
    if voice not in VOICES:
        voice = "us-m"
    scid = "sc" + str(max_n + 1).zfill(2)
    scn["scenarios"].append({
        "id": scid,
        "title": str(obj.get("title", "비즈니스 상황극")),
        "scenario": str(obj.get("scenario", "general")),
        "brief": str(obj.get("brief", "")),
        "goal": str(obj.get("goal", "")),
        "partner": {
            "name": str(obj.get("partner", {}).get("name", "Alex")),
            "role": str(obj.get("partner", {}).get("role", "상대역")),
            "voice": voice,
        },
        "turns": turns,
        "auto": True,
    })
    SCN.write_text(json.dumps(scn, ensure_ascii=False, indent=2), encoding="utf-8")
    gen_partner_audio(scid, turns, voice)
    return scid


if __name__ == "__main__":
    sid = run()
    print(f"생성된 상황극: {sid}" if sid else "상황극 생성 실패(또는 매칭 문장 부족)")
