# -*- coding: utf-8 -*-
"""영상 스크립트(video_scripts.json)의 각 줄에 한글 번역(ko) + 핵심 표현(terms)을 채운다.

영어 자막을 기본으로 보되, 원할 때만 토글로 한글 뜻·관용표현을 확인하기 위한 데이터.
각 줄에 ko(한국어 번역)와 terms([{term, ko}] — 관용어·구동사·중요단어)를 넣는다.
이미 ko가 있는 줄은 건너뛴다(멱등, 재실행으로 이어서 채움).
Claude CLI로 batch_size개씩 묶어 생성하고, 배치마다 저장해 중단돼도 재개된다.

실행:  python app/enrich_video.py            # ko 없는 줄 전부
       python app/enrich_video.py --size 20 --limit 60
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "video_scripts.json"

PROMPT = """다음은 어느 영어 인터뷰 영상의 자막 문장들이다(기술/AI/반도체 관련 대화).
한국인 학습자가 영어 자막을 보다가, 원할 때만 한글 뜻을 펼쳐 보기 위한 학습 데이터를 만든다.

각 줄(번호)에 대해 JSON으로 다음 두 가지를 만든다:
- "ko": 그 문장의 자연스러운 한국어 번역(한 문장). 직역이 아니라 실제 뜻이 통하게. 앞뒤 맥락상
  대명사가 가리키는 대상이 불명확하면 무리하게 채우지 말고 자연스럽게 옮긴다.
- "terms": 그 문장에서 학습자가 알아둘 만한 관용어·구동사·콜로케이션·중요 표현 0~3개.
  각각 {"term": 표현(영어, 원문 그대로), "ko": 뜻·쓰임(한국어 짧게)}. 아주 쉬운 기초 단어나
  고유명사는 넣지 말 것. "Yeah.", "Right." 같은 짧은 맞장구 문장은 terms를 빈 배열로 둔다.

문장 목록(번호 | 영어):
__ITEMS__

출력은 JSON 객체만(설명·마크다운·코드펜스 금지). 형식:
{"12":{"ko":"...","terms":[{"term":"...","ko":"..."}]},"13":{"ko":"...","terms":[]}}
"""


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


def run(batch_size: int = 20, limit: int = 0) -> int:
    db = json.loads(DB.read_text(encoding="utf-8"))
    lines = db["videos"][0]["lines"]
    targets = [(i, L) for i, L in enumerate(lines) if not L.get("ko")]
    if limit:
        targets = targets[:limit]
    if not targets:
        print("모든 줄에 이미 번역이 있습니다.")
        return 0

    total = 0
    nbatch = (len(targets) + batch_size - 1) // batch_size
    for bi in range(0, len(targets), batch_size):
        batch = targets[bi:bi + batch_size]
        items = "\n".join(f'{i} | "{L["en"]}"' for i, L in batch)
        obj = parse_obj(run_claude(PROMPT.replace("__ITEMS__", items)))
        if not isinstance(obj, dict):
            print(f"배치 {bi // batch_size + 1}/{nbatch}: 파싱 실패, 건너뜀", file=sys.stderr)
            continue
        for key, val in obj.items():
            try:
                idx = int(key)
            except (ValueError, TypeError):
                continue
            if idx < 0 or idx >= len(lines) or not isinstance(val, dict):
                continue
            ko = str(val.get("ko", "")).strip()
            terms = []
            for t in (val.get("terms") or [])[:4]:
                if isinstance(t, dict) and str(t.get("term", "")).strip():
                    terms.append({"term": str(t["term"]).strip(), "ko": str(t.get("ko", "")).strip()})
            if ko:
                lines[idx]["ko"] = ko
                lines[idx]["terms"] = terms
                total += 1
        DB.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")  # 배치마다 저장
        print(f"배치 {bi // batch_size + 1}/{nbatch}: 누적 {total}개 번역", flush=True)
    return total


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=20)
    ap.add_argument("--limit", type=int, default=0, help="처음 N줄만(테스트용)")
    args = ap.parse_args()
    n = run(args.size, args.limit)
    print(f"영상 번역 보강 완료: {n}개")
