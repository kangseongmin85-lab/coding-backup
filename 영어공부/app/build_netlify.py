# -*- coding: utf-8 -*-
"""Netlify 배포 폴더 생성.

실행: python app/build_netlify.py
→ netlify_deploy/ 폴더가 만들어진다. 이 폴더 전체를
  https://app.netlify.com/drop 에 드래그하면 배포 완료.

포함: index.html(앱), data/(학습 데이터 시드), audio/(발음 mp3)
제외: 서버 코드, 롤플레이 임시 오디오, 하네스 파일
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "netlify_deploy"

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()

shutil.copy(ROOT / "app" / "index.html", OUT / "index.html")
shutil.copytree(ROOT / "data", OUT / "data")
shutil.copytree(ROOT / "audio", OUT / "audio", ignore=shutil.ignore_patterns("roleplay"))

# 세션 상세 로그(md)는 배포에 불필요
sessions = OUT / "data" / "sessions"
if sessions.exists():
    shutil.rmtree(sessions)

n_audio = len(list((OUT / "audio").glob("*.mp3")))
size_mb = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()) / 1024 / 1024
# 콘솔 인코딩(CP949/UTF-8)과 무관하게 깨지지 않도록 ASCII로만 출력
print(f"DONE: {OUT}")
print(f"  audio files: {n_audio}, total size: {size_mb:.1f} MB")
print("Drag the whole 'netlify_deploy' folder onto https://app.netlify.com/drop")
