# -*- coding: utf-8 -*-
"""Generate multi-accent TTS audio for English study sentences.

Usage:
  # Single sentence
  python generate_audio.py --text "Could you walk me through the data?" --id s001

  # Batch from sentences.json (all sentences missing audio)
  python generate_audio.py --batch data/sentences.json

  # Batch, specific ids only
  python generate_audio.py --batch data/sentences.json --ids s001,s003

  # Options
  --voices us-m,gb-f     subset of voices (default: all four)
  --rate=-15%            slower/faster speech (default +0%). NOTE: negative
                         values must use the = form (--rate=-15%), otherwise
                         argparse treats -15% as a flag.
  --out audio            output directory (default: audio)

Output files: {out}/{id}_{voice}{rate_suffix}.mp3  (e.g. audio/s001_us-m.mp3, audio/s001_gb-f_slow.mp3)
Prints one line per generated file.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

# voice key -> edge-tts voice name. Extend here when adding accents
# (e.g. "in-f": "en-IN-NeerjaNeural", "au-f": "en-AU-NatashaNeural").
VOICES = {
    "us-m": "en-US-AndrewNeural",
    "us-f": "en-US-AvaNeural",
    "gb-m": "en-GB-RyanNeural",
    "gb-f": "en-GB-SoniaNeural",
}


def rate_suffix(rate: str) -> str:
    if rate in ("+0%", "0%", ""):
        return ""
    return "_slow" if rate.startswith("-") else "_fast"


async def generate_one(text: str, sid: str, voice_key: str, rate: str, out_dir: Path) -> Path:
    out = out_dir / f"{sid}_{voice_key}{rate_suffix(rate)}.mp3"
    communicate = edge_tts.Communicate(text, VOICES[voice_key], rate=rate)
    await communicate.save(str(out))
    return out


async def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--text")
    p.add_argument("--id", dest="sid")
    p.add_argument("--batch", help="path to sentences.json")
    p.add_argument("--ids", help="comma-separated sentence ids (with --batch)")
    p.add_argument("--voices", default=",".join(VOICES))
    p.add_argument("--rate", default="+0%")
    p.add_argument("--out", default="audio")
    args = p.parse_args()

    voice_keys = [v.strip() for v in args.voices.split(",") if v.strip()]
    unknown = [v for v in voice_keys if v not in VOICES]
    if unknown:
        print(f"unknown voices: {unknown}; available: {list(VOICES)}", file=sys.stderr)
        return 1

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    items = []  # (text, id)
    if args.batch:
        data = json.loads(Path(args.batch).read_text(encoding="utf-8"))
        wanted = set(args.ids.split(",")) if args.ids else None
        for s in data["sentences"]:
            if wanted and s["id"] not in wanted:
                continue
            # skip sentences that already have all requested files at this rate
            missing = [
                vk for vk in voice_keys
                if not (out_dir / f"{s['id']}_{vk}{rate_suffix(args.rate)}.mp3").exists()
            ]
            if missing:
                items.append((s["en"], s["id"]))
    elif args.text and args.sid:
        items.append((args.text, args.sid))
    else:
        print("need --text with --id, or --batch", file=sys.stderr)
        return 1

    tasks = [
        generate_one(text, sid, vk, args.rate, out_dir)
        for text, sid in items
        for vk in voice_keys
        if not (out_dir / f"{sid}_{vk}{rate_suffix(args.rate)}.mp3").exists()
    ]
    results = await asyncio.gather(*tasks)
    for r in results:
        print(r)
    print(f"generated {len(results)} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
