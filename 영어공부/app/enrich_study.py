# -*- coding: utf-8 -*-
"""문장별 받아쓰기 학습 보강(study) 생성 — 상세 발음해설 + 응용 예문 + 쓰임 팁.

sentences.json의 각 문장에 study={sound, examples:[{en,ko}], tip} 를 채운다.
이미 study.sound가 있는 문장은 건너뛴다(멱등, 재실행으로 이어서 채움).
Claude CLI로 batch_size개씩 묶어 생성하고, 배치마다 저장해 중단돼도 재개된다.

실행:  python app/enrich_study.py            # study 없는 문장 전부
       python app/enrich_study.py --size 8
weekly_update.py가 매주 호출해 새 문장도 자동 보강된다.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "sentences.json"

PROMPT = """다음은 한국인 바이오 R&D 프로젝트 매니저의 비즈니스 영어 받아쓰기 학습 문장들이다.
각 문장(id)에 대해 학습 보강 자료를 JSON으로 만들어라. (사전/외부 링크는 필요 없다.)

각 id별로 다음 네 가지를 만든다:
- "sound": 이 문장이 '왜 잘 안 들리는지' 자세한 듣기 해설(한국어 4~6문장). 문장을 의미 단위
  청크로 끊어가며 연음·약형·flap t·자음 탈락·강세 이동을 짚고, 실제 들리는 대로 한글로
  (예: <b>쿠쥬</b>, <b>워너</b>, <b>가댓라잇</b>) 표기한다. 어디에 강세가 떨어지고 어느
  부분이 뭉개지는지 구체적으로. HTML <b> 강조 사용 가능. 기존보다 더 자세히.
- "examples": 같은 패턴을 사용자 실무(CRO 위탁·에셋 평가·사내 글로벌 미팅·발표 Q&A·일정
  협상 등) 맥락에서 변형한 실전 예문 정확히 3개. 각각 {"en": 영어 문장, "ko": 한국어 뜻}.
- "vocab": 이 문장에서 비즈니스 영어로 알아둘 만한 중요 단어·관용어구·구동사 2~4개. 각각
  {"term": 표현(영어), "ko": 뜻·쓰임 설명(한국어)}. 쉬운 기초 단어 말고 관용어·구동사·
  콜로케이션·뉘앙스 있는 표현 위주로.
- "tip": 언제/누구에게/얼마나 격식 있게 쓰는지, 뉘앙스나 주의점을 한 줄(한국어)로.

문장 목록:
__ITEMS__

출력은 JSON 객체만(설명·마크다운 금지). 형식:
{"s001":{"sound":"...","examples":[{"en":"...","ko":"..."}],"vocab":[{"term":"...","ko":"..."}],"tip":"..."}}
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


def run(batch_size: int = 10) -> int:
    db = json.loads(DB.read_text(encoding="utf-8"))
    sents = db["sentences"]
    by_id = {s["id"]: s for s in sents}
    targets = [s for s in sents if not (s.get("study") or {}).get("vocab")]
    if not targets:
        return 0

    total = 0
    for i in range(0, len(targets), batch_size):
        batch = targets[i:i + batch_size]
        items = "\n".join(
            f'{s["id"]} | "{s["en"]}" | pattern: {s.get("pattern", "")} | scenario: {s.get("scenario", "")}'
            for s in batch
        )
        obj = parse_obj(run_claude(PROMPT.replace("__ITEMS__", items)))
        if not isinstance(obj, dict):
            print(f"배치 {i // batch_size + 1}: 파싱 실패, 건너뜀", file=sys.stderr)
            continue
        for sid, st in obj.items():
            s = by_id.get(sid)
            if not s or not isinstance(st, dict):
                continue
            sound = str(st.get("sound", "")).strip()
            tip = str(st.get("tip", "")).strip()
            exs = []
            for e in (st.get("examples") or [])[:4]:
                if isinstance(e, dict) and str(e.get("en", "")).strip():
                    exs.append({"en": str(e["en"]).strip(), "ko": str(e.get("ko", "")).strip()})
            vocab = []
            for w in (st.get("vocab") or [])[:5]:
                if isinstance(w, dict) and str(w.get("term", "")).strip():
                    vocab.append({"term": str(w["term"]).strip(), "ko": str(w.get("ko", "")).strip()})
            if sound or exs or vocab:
                s["study"] = {"sound": sound, "examples": exs, "vocab": vocab, "tip": tip}
                total += 1
        DB.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")  # 배치마다 저장
        print(f"배치 {i // batch_size + 1}/{(len(targets) + batch_size - 1) // batch_size}: 누적 {total}개 보강", flush=True)
    return total


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=10)
    args = ap.parse_args()
    n = run(args.size)
    print(f"study 보강 완료: {n}개")
