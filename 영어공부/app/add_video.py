# -*- coding: utf-8 -*-
"""유튜브 영상 자막을 문장 단위로 잘라 data/video_scripts.json에 영상 하나를 추가한다.

자막(youtube-transcript-api) → 문장 경계 `.?!` · `>>`(화자 전환)로 분할 → [music] 등 태그 제거.
각 문장의 t = 그 문장이 시작되는 자막 조각의 시작 시각(초). 이미 있는 videoId면 건너뛴다.
한글 번역(ko/terms)은 이어서 `python app/enrich_video.py`로 채운다.

실행:  python app/add_video.py <유튜브 URL 또는 videoId> --title "영상 제목" --id 짧은id
"""
import argparse
import json
import re
from pathlib import Path

from youtube_transcript_api import YouTubeTranscriptApi

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "video_scripts.json"
MAX_CHARS = 120  # 이보다 긴 문장은 다음 자막 조각 경계에서 끊는다


def split_lines(snippets):
    """자막 조각 → [{t, en, turn}] 문장 목록."""
    lines, buf, t0, turn = [], [], None, False

    def flush():
        nonlocal buf, t0, turn
        en = " ".join(buf).strip()
        if en:
            lines.append({"t": round(t0, 2), "en": en, "turn": turn})
        buf, t0, turn = [], None, False

    for s in snippets:
        text = re.sub(r"\[[^\]]*\]", " ", s.text.replace("\n", " "))  # [music] [laughter] 등
        for tok in text.split():
            if tok == ">>":
                flush()
                turn = True
                continue
            if t0 is None:
                t0 = s.start
            buf.append(tok)
            if re.search(r"[.?!][\"')\]]*$", tok):
                flush()
        if len(" ".join(buf)) > MAX_CHARS:  # 문장부호 없는 자막: 자막 조각 끝에서 끊음
            flush()
    flush()
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--title", required=True)
    ap.add_argument("--id", required=True)
    a = ap.parse_args()
    m = re.search(r"(?:v=|youtu\.be/)([\w-]{11})", a.video)
    vid = m.group(1) if m else a.video

    db = json.loads(DB.read_text(encoding="utf-8"))
    if any(v["videoId"] == vid for v in db["videos"]):
        print(f"이미 있는 영상: {vid}")
        return
    snippets = list(YouTubeTranscriptApi().fetch(vid, languages=["en"]))
    lines = split_lines(snippets)
    db["videos"].append({
        "id": a.id, "videoId": vid, "title": a.title,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "duration": round(snippets[-1].start + snippets[-1].duration),
        "lines": lines,
    })
    DB.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"추가 완료: {a.title} ({vid}) {len(lines)}문장")


if __name__ == "__main__":
    main()
