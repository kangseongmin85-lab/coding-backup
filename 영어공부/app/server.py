# -*- coding: utf-8 -*-
"""영어공부 앱 로컬 서버.

실행:  python app/server.py   →  브라우저에서 http://localhost:8770 열기

- 프로젝트 루트(영어공부/)를 정적으로 서빙 (audio/, data/, app/)
- POST /api/save          : data/*.json 저장 (허용 목록만)
- POST /api/add_sentence  : 문장 등록 — Claude CLI로 번역·패턴·듣기 해설 생성 + 오디오 생성
"""
import json
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
PORT = 8770
ALLOWED_SAVE = {"data/sentences.json", "data/vocab.json", "data/study_log.json"}
GEN_SCRIPT = ROOT / ".claude/skills/multi-accent-audio/scripts/generate_audio.py"

META_PROMPT = """당신은 비즈니스 영어 학습 데이터 생성기다. 사용자는 한국인 바이오 R&D 프로젝트 매니저다.
다음 영어 문장에 대해 아래 키를 가진 JSON 객체 하나만 출력하라. 코드블록, 설명, 다른 텍스트 절대 금지.

문장: "{en}"

- "ko": 자연스러운 한국어 번역
- "pattern": 이 문장에서 재사용 가능한 핵심 패턴 (예: "Could you walk me through ~?")
- "notes": 듣기 해설. 이 문장에서 연음, 약형(weak form), flap t, 자음 탈락 등으로 원어민 발음이 뭉개져 들리는 부분을 한국어로 2~4문장 설명. 들리는 대로 한글 표기를 <b></b>로 강조 (예: "Could you"는 <b>쿠쥬</b>로 들립니다).
- "scenario": cro-kickoff, cro-protocol, cro-results-review, cro-negotiation, asset-evaluation, licensing, internal-update, meeting, presentation, survival, general 중 하나
- "tags": 영어 소문자 태그 1~3개 배열"""


def generate_meta(en: str) -> tuple[dict, bool]:
    """Claude CLI로 번역/패턴/해설 생성. 실패 시 빈 메타와 False 반환."""
    fallback = {"ko": "", "pattern": "", "notes": "", "scenario": "general", "tags": []}
    try:
        p = subprocess.run(
            "claude -p",
            input=META_PROMPT.format(en=en).encode("utf-8"),
            shell=True, capture_output=True, timeout=120, cwd=str(ROOT),
        )
        out = p.stdout.decode("utf-8", errors="replace")
        start, end = out.find("{"), out.rfind("}")
        if start == -1 or end <= start:
            return fallback, False
        meta = json.loads(out[start:end + 1])
        return {
            "ko": str(meta.get("ko", "")),
            "pattern": str(meta.get("pattern", "")),
            "notes": str(meta.get("notes", "")),
            "scenario": str(meta.get("scenario", "general")),
            "tags": [str(t) for t in meta.get("tags", [])][:3],
        }, True
    except Exception:
        return fallback, False


def generate_audio(en: str, sid: str) -> int:
    """보통+느린 속도 오디오 생성. 생성된 파일 수 반환."""
    count = 0
    for rate in ("+0%", "-15%"):
        try:
            p = subprocess.run(
                [sys.executable, str(GEN_SCRIPT), "--text", en, "--id", sid,
                 "--rate=" + rate, "--out", str(ROOT / "audio")],
                capture_output=True, timeout=120, cwd=str(ROOT),
            )
            count += p.stdout.decode("utf-8", errors="replace").count(".mp3")
        except Exception:
            pass
    return count


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/app/index.html")
            self.end_headers()
            return
        super().do_GET()

    def _json(self, code: int, obj: dict):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            self._json(400, {"ok": False, "error": str(e)})
            return

        if self.path == "/api/save":
            self.handle_save(payload)
        elif self.path == "/api/add_sentence":
            self.handle_add_sentence(payload)
        else:
            self.send_error(404)

    def handle_save(self, payload):
        rel = payload.get("file", "")
        if rel not in ALLOWED_SAVE:
            self._json(403, {"ok": False, "error": "file not allowed"})
            return
        (ROOT / rel).write_text(
            json.dumps(payload["content"], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self._json(200, {"ok": True})

    def handle_add_sentence(self, payload):
        en = " ".join(str(payload.get("en", "")).split())
        if not en:
            self._json(400, {"ok": False, "error": "문장이 비어 있어요"})
            return
        db_path = ROOT / "data/sentences.json"
        db = json.loads(db_path.read_text(encoding="utf-8"))
        if any(s["en"].lower() == en.lower() for s in db["sentences"]):
            self._json(200, {"ok": False, "error": "이미 등록된 문장이에요"})
            return

        max_n = max((int(s["id"][1:]) for s in db["sentences"]), default=0)
        sid = "s" + str(max_n + 1).zfill(3)
        meta, claude_ok = generate_meta(en)
        sentence = {
            "id": sid, "en": en,
            "ko": meta["ko"], "pattern": meta["pattern"], "notes": meta["notes"],
            "scenario": meta["scenario"], "tags": meta["tags"],
            "added": date.today().isoformat(),
            "srs": {"box": 1, "next_review": date.today().isoformat(), "last_result": None},
            "listening": {"attempts": 0, "correct": 0, "missed_words": [], "weak_accents": []},
        }
        db["sentences"].append(sentence)
        db_path.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        audio_n = generate_audio(en, sid)
        self._json(200, {"ok": True, "sentence": sentence, "claude": claude_ok, "audio": audio_n})

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    print(f"영어공부 앱: http://localhost:{port}  (중지: Ctrl+C)")
    try:
        ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
    except OSError as e:
        print(f"\n[오류] {port} 포트를 못 열었어요 ({e}).")
        print("다른 프로그램이 이 포트를 쓰는 중일 수 있어요.")
        print(f"  확인:  netstat -ano | findstr {port}")
        print(f"  대안:  python app/server.py 8771   (다른 포트로 실행)")
        input("\n엔터를 누르면 닫힙니다... ")
