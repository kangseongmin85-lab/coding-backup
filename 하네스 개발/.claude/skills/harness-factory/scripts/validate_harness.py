#!/usr/bin/env python3
"""하네스 구조 검증 스크립트.

생성된 하네스의 결정적(determinstic) 정합성을 검사한다. 의미적(트리거 정확도,
경계면 의도) 검증은 harness-qa가 수동으로 수행한다 — 이 스크립트는 손으로 매번
반복하기엔 지루하고 실수하기 쉬운 구조 검사만 자동화한다.

사용법:
    python validate_harness.py [대상 .claude 경로]
    (경로 생략 시 현재 디렉토리에서 .claude 를 탐색)

종료 코드: FAIL 이 하나라도 있으면 1, 아니면 0.
"""
import sys
import re
from pathlib import Path

# 오케스트레이터 판별 신호. 자연어 단어("오케스트레이터", "실행 모드")가 아니라 실제 팀/서브
# 에이전트를 가동하는 토큰으로 한정한다 — 도메인 스킬이 본문에서 오케스트레이터를 단지
# '언급'만 해도 오탐하던 문제(스모크 테스트에서 발견)를 방지하기 위함이다.
ORCHESTRATOR_SIGNALS = ("TeamCreate", "TaskCreate", "subagent_type")
# 오케스트레이터 description 에 있어야 하는 후속 작업 키워드(하나 이상)
FOLLOWUP_KEYWORDS = ("재실행", "재구성", "업데이트", "수정", "보완", "부분 재실행",
                     "개선", "다시", "확장", "감사", "동기화", "again", "re-run", "update")

results = []  # (level, message) — level ∈ {PASS, FAIL, WARN}


def add(level, msg):
    results.append((level, msg))


def parse_frontmatter(text):
    """--- ... --- 사이의 name/description 을 단순 파싱한다. PyYAML 의존 없음."""
    m = re.match(r"^﻿?---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return None
    block = m.group(1)
    fields = {}
    for key in ("name", "description"):
        km = re.search(rf"^{key}\s*:\s*(.+?)\s*$", block, re.MULTILINE)
        if km:
            fields[key] = km.group(1).strip().strip('"').strip("'")
    return fields


def body_after_frontmatter(text):
    m = re.match(r"^﻿?---\s*\n.*?\n---\s*\n", text, re.DOTALL)
    return text[m.end():] if m else text


def check_agents(agents_dir):
    names = set()
    if not agents_dir.is_dir():
        add("WARN", f"agents/ 디렉토리가 없음: {agents_dir}")
        return names
    md_files = sorted(agents_dir.glob("*.md"))
    if not md_files:
        add("WARN", "agents/ 에 에이전트 정의 파일이 없음")
    for f in md_files:
        text = f.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        stem = f.stem
        if fm is None:
            add("FAIL", f"{f.name}: frontmatter(---) 누락")
            continue
        if "name" not in fm:
            add("FAIL", f"{f.name}: frontmatter 에 name 누락")
        else:
            names.add(fm["name"])
            if fm["name"] != stem:
                add("FAIL", f"{f.name}: name '{fm['name']}' 가 파일명 '{stem}' 과 불일치")
        if "description" not in fm:
            add("FAIL", f"{f.name}: frontmatter 에 description 누락")
        section_count = len(re.findall(r"^##\s+", body_after_frontmatter(text), re.MULTILINE))
        if section_count < 4:
            add("WARN", f"{f.name}: 섹션(##)이 {section_count}개 — 필수 섹션 누락 의심")
        else:
            add("PASS", f"{f.name}: frontmatter·구조 정상")
    return names


def check_skills(skills_dir, agent_names):
    if not skills_dir.is_dir():
        add("WARN", f"skills/ 디렉토리가 없음: {skills_dir}")
        return
    skill_dirs = [d for d in sorted(skills_dir.iterdir()) if d.is_dir()]
    if not skill_dirs:
        add("WARN", "skills/ 에 스킬이 없음")
    for d in skill_dirs:
        sk = d / "SKILL.md"
        if not sk.is_file():
            add("FAIL", f"{d.name}/: SKILL.md 가 없음")
            continue
        text = sk.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if fm is None:
            add("FAIL", f"{d.name}/SKILL.md: frontmatter 누락")
            continue
        if "name" not in fm:
            add("FAIL", f"{d.name}/SKILL.md: name 누락")
        if "description" not in fm:
            add("FAIL", f"{d.name}/SKILL.md: description 누락")
        body = body_after_frontmatter(text)
        line_count = body.count("\n") + 1
        if line_count > 500:
            add("WARN", f"{d.name}/SKILL.md: 본문 {line_count}줄 (>500) — references/ 분리 권장")

        is_orchestrator = any(sig in text for sig in ORCHESTRATOR_SIGNALS)
        if is_orchestrator:
            desc = fm.get("description", "")
            if not any(k in desc for k in FOLLOWUP_KEYWORDS):
                add("WARN", f"{d.name}/SKILL.md: 오케스트레이터로 보이나 description 에 후속 작업 키워드 없음")
            else:
                add("PASS", f"{d.name}/SKILL.md: 오케스트레이터 description 에 후속 키워드 있음")
            # 경계면 교차검사: 정의됐으나 오케스트레이터가 호출 안 하는 에이전트 점검.
            # (역방향 — '호출되나 정의 없음'은 토큰 판별이 불확실하므로 harness-qa가
            #  매니페스트와 함께 수동 교차검증한다.)
            if agent_names:
                called = find_referenced_agents(text, agent_names)
                uncalled = sorted(agent_names - called)
                if uncalled:
                    add("WARN", f"{d.name}/SKILL.md: 정의됐으나 오케스트레이터가 호출 안 하는 에이전트: {', '.join(uncalled)}")
                else:
                    add("PASS", f"{d.name}/SKILL.md: 정의된 모든 에이전트가 오케스트레이터에서 호출됨")
        else:
            add("PASS", f"{d.name}/SKILL.md: frontmatter 정상")


def find_referenced_agents(text, agent_names):
    """본문에 등장하는 에이전트 이름 집합을 반환."""
    return {n for n in agent_names if re.search(rf"(?<![\w-]){re.escape(n)}(?![\w-])", text)}


def check_commands(claude_dir):
    cmd = claude_dir / "commands"
    if cmd.is_dir() and any(cmd.iterdir()):
        files = [p.name for p in cmd.iterdir()]
        add("FAIL", f"commands/ 에 파일이 있음(하네스는 커맨드를 만들지 않음): {', '.join(files)}")
    else:
        add("PASS", "commands/ 미생성 — 정상")


def main():
    # Windows 콘솔(cp949 등)에서 em-dash 등 비ASCII 출력이 깨지거나 크래시하지 않도록
    # 출력 스트림을 UTF-8 로 고정한다.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    arg = sys.argv[1] if len(sys.argv) > 1 else "."
    base = Path(arg)
    claude_dir = base if base.name == ".claude" else base / ".claude"
    if not claude_dir.is_dir():
        print(f"[ERROR] .claude 디렉토리를 찾을 수 없음: {claude_dir}")
        sys.exit(2)

    print(f"=== 하네스 구조 검증: {claude_dir} ===\n")
    agent_names = check_agents(claude_dir / "agents")
    check_skills(claude_dir / "skills", agent_names)
    check_commands(claude_dir)

    fails = [m for lvl, m in results if lvl == "FAIL"]
    warns = [m for lvl, m in results if lvl == "WARN"]
    passes = [m for lvl, m in results if lvl == "PASS"]

    for lvl in ("FAIL", "WARN", "PASS"):
        for l, m in results:
            if l == lvl:
                print(f"[{l}] {m}")

    print(f"\n=== 요약: PASS {len(passes)} / WARN {len(warns)} / FAIL {len(fails)} ===")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
