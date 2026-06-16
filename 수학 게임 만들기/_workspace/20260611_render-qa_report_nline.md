# Render QA — 뺄셈 수직선 등장 "덜컹 + 옆으로 밀림" 수정 검증 (2026-06-11)

## 증상 (사용자 보고)
받아내림 수직선이 시작될 때 덜컹하며 자리 조정되고, 옆에서 나오는 것처럼 보임.

## 원인
`.bond-wrap`은 `transform: translateX(-50%)`로 vform 중앙 정렬되는데,
등장 애니메이션 `fadeUp`의 keyframe(`transform: translateY(12px)→translateY(0)`)이
재생 중 base transform을 **통째로 덮어써** translateX(-50%)가 풀림.
→ 0.3초 동안 보드가 오른쪽으로 반폭(~140px) 밀려 있다가, 애니메이션 종료 순간
base transform 복귀로 중앙으로 "덜컹" 점프.

## 수정 (style.css)
`.bond-wrap`에 translateX(-50%)를 포함한 전용 keyframe `bondIn` 적용:
`from { opacity:0; transform: translate(-50%, 12px); } to { opacity:1; transform: translate(-50%, 0); }`

## 검증 (Chrome headless, 임시 데모 훅 ?demo=sub&a=52&b=27&n=4, 검증 후 제거)
| 케이스 | 기대 | 실제 | 합격? |
|---|---|---|---|
| 애니메이션 50% 지점(fadeUp, 수정 전 재현) | — | 보드가 vform 중앙에서 오른쪽으로 반폭 밀림 | 버그 재현 ✔ |
| 애니메이션 50% 지점(bondIn, 수정 후) | 중앙에서 반투명·살짝 아래 | 정중앙, 옆 밀림 없음 | 합격 |
| 정착 후(52−27 가르기 단계) | 보드 중앙, 🦊=10, 괄호 10\|2 | 동일 | 합격(회귀 없음) |

스크린샷: `shots/nl_mid_before.png`(수정 전 재현) / `nl_mid_after.png`(수정 후) / `nl_settled.png`(정착)

## 정리
- 임시 데모 훅(script.js)·CSS freeze 제거 완료, `node --check` OK.
