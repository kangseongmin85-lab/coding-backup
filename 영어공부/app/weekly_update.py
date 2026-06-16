# -*- coding: utf-8 -*-
"""주간 비즈니스 영어 문장 자동 업데이트.

공개 비즈니스 영어 빈출 표현(Business English Pod / Cambridge BEC /
BBC Learning English Business 등 잘 알려진 자료 계열)에서 N개 문장을 생성해
data/sentences.json 에 추가하고, 다국 악센트 오디오(보통+느린)를 생성한다.
이미 등록된 문장과 중복되면 건너뛴다.

실행:
  python app/weekly_update.py            # 기본 5개
  python app/weekly_update.py --count 8

Windows 작업 스케줄러가 주 1회 이 스크립트를 호출한다.
YouGlish 실제표현 검증은 앱(받아쓰기 채점 후 / 문장 카드)에서 사용자가 직접 한다.
"""
import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "sentences.json"
LOG_PATH = ROOT / "data" / "update_log.json"
GEN_SCRIPT = ROOT / ".claude" / "skills" / "multi-accent-audio" / "scripts" / "generate_audio.py"

SCENARIOS = [
    "cro-kickoff", "cro-protocol", "cro-results-review", "cro-negotiation",
    "asset-evaluation", "licensing", "internal-update", "meeting", "presentation",
    "survival", "general",
]

PROMPT = """You are generating business English STUDY sentences for a Korean
bio R&D project manager who wants to master commonly-used, real-world business
English -- the kind taught in well-known resources such as Business English Pod,
Cambridge BEC, and BBC Learning English (Business). Focus on expressions people
actually SAY in meetings, calls, and emails: project updates, clarification and
"survival" phrases, negotiation, scheduling, giving opinions, asking questions.

Generate EXACTLY __COUNT__ new sentences. Rules:
- Pattern-centric and reusable; 8-14 words; natural spoken form (contractions,
  real linking) -- NOT stiff textbook sentences.
- Include one or two high-value listening "survival" phrases (asking someone to
  repeat / slow down / confirm understanding) when not already covered below.
- These expressions must be ones a learner can verify on YouGlish, i.e. real,
  frequently-spoken business English -- avoid invented or overly niche wording.
- Must NOT duplicate or trivially rephrase any of these EXISTING sentences:
__EXISTING__
- "notes" = a Korean listening explanation: point out the parts that blur via
  linking / weak forms / flap-t, written as they actually SOUND in Korean using
  <b>...</b> emphasis (e.g. <b>쿠쥬</b>), 2-4 sentences.
- "scenario" must be exactly one of: __SCENARIOS__
- "ko" = natural Korean translation. "pattern" = reusable template using ~ for
  the variable slot. "tags" = 1-3 lowercase English tags.

Output ONLY a JSON object, no prose, no markdown fences:
{"sentences":[{"en":"...","ko":"...","pattern":"...","notes":"...","scenario":"...","tags":["..."]}]}
"""


def run_claude(prompt: str) -> str:
    """Claude CLI로 문장 배치 생성. 실패 시 빈 문자열."""
    try:
        p = subprocess.run(
            "claude -p",
            input=prompt.encode("utf-8"),
            shell=True, capture_output=True, timeout=300, cwd=str(ROOT),
        )
        return p.stdout.decode("utf-8", errors="replace")
    except Exception as e:  # noqa: BLE001
        print(f"claude 호출 실패: {e}", file=sys.stderr)
        return ""


def parse_items(raw: str) -> list:
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        return []
    try:
        obj = json.loads(raw[start:end + 1])
    except Exception:
        return []
    items = obj.get("sentences", []) if isinstance(obj, dict) else []
    return items if isinstance(items, list) else []


def gen_audio(ids: list) -> None:
    for rate in ("+0%", "-15%"):
        try:
            subprocess.run(
                [sys.executable, str(GEN_SCRIPT), "--batch", str(DB_PATH),
                 "--ids", ",".join(ids), "--rate=" + rate, "--out", str(ROOT / "audio")],
                cwd=str(ROOT), timeout=300,
            )
        except Exception as e:  # noqa: BLE001
            print(f"오디오 생성 실패(rate={rate}): {e}", file=sys.stderr)


def log_run(ids: list, ok: bool) -> None:
    log = []
    if LOG_PATH.exists():
        try:
            log = json.loads(LOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            log = []
    log.append({
        "date": date.today().isoformat(),
        "added_ids": ids,
        "count": len(ids),
        "claude_ok": ok,
    })
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=5, help="추가할 문장 수 (기본 5)")
    args = ap.parse_args()

    db = json.loads(DB_PATH.read_text(encoding="utf-8"))
    existing = [s["en"] for s in db["sentences"]]

    prompt = (PROMPT
              .replace("__COUNT__", str(args.count))
              .replace("__EXISTING__", "\n".join("  - " + e for e in existing) or "  (none yet)")
              .replace("__SCENARIOS__", ", ".join(SCENARIOS)))

    raw = run_claude(prompt)
    items = parse_items(raw)
    if not items:
        log_run([], ok=False)
        print("생성된 문장이 없습니다 (claude 응답 파싱 실패).", file=sys.stderr)
        return 1

    existing_lower = {s["en"].lower() for s in db["sentences"]}
    max_n = max((int(s["id"][1:]) for s in db["sentences"]), default=0)
    new_ids = []
    for it in items:
        en = " ".join(str(it.get("en", "")).split())
        if not en or en.lower() in existing_lower:
            continue
        max_n += 1
        sid = "s" + str(max_n).zfill(3)
        scenario = it.get("scenario", "general")
        if scenario not in SCENARIOS:
            scenario = "general"
        db["sentences"].append({
            "id": sid, "en": en,
            "ko": str(it.get("ko", "")),
            "pattern": str(it.get("pattern", "")),
            "notes": str(it.get("notes", "")),
            "scenario": scenario,
            "tags": [str(t) for t in it.get("tags", [])][:3],
            "added": date.today().isoformat(),
            "srs": {"box": 1, "next_review": date.today().isoformat(), "last_result": None},
            "listening": {"attempts": 0, "correct": 0, "missed_words": [], "weak_accents": []},
        })
        existing_lower.add(en.lower())
        new_ids.append(sid)

    if new_ids:
        DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        gen_audio(new_ids)

    # 문장이 늘어난 만큼 상황극도 1개 추가 (배운 문장을 배치한 시나리오 + 상대역 오디오)
    try:
        import generate_scenario
        sc_id = generate_scenario.run()
        if sc_id:
            print(f"새 상황극 추가: {sc_id}")
    except Exception as e:  # noqa: BLE001
        print(f"상황극 생성 건너뜀: {e}", file=sys.stderr)

    # 새 문장에 듣기 해설·응용 예문 보강(study) 채우기
    try:
        import enrich_study
        n = enrich_study.run()
        if n:
            print(f"study 보강: {n}개")
    except Exception as e:  # noqa: BLE001
        print(f"study 보강 건너뜀: {e}", file=sys.stderr)

    log_run(new_ids, ok=True)
    print(f"추가된 문장 {len(new_ids)}개: {', '.join(new_ids) if new_ids else '(없음 — 모두 중복)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
