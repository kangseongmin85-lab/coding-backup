# 🏡 여우 마을 꾸미기 — 설계 노트

## 핵심 루프 (성취감 우선)
문제 풀기 → 코인 획득 → 상점에서 아이템 구매 → 마을 격자판에 배치 → 영구 저장(localStorage).
"내가 모아서 내가 꾸민 마을"이 다시 켜도 남는다 = 이 연령대 최강 동기(수집/소유).

## design-director (kid-friendly-design)
- 마을판: 잔디 톤(연초록 그라데이션) 카드 + 6×4 둥근 타일 격자. 빈 칸은 점선, 채운 칸은 실선+흰 배경.
- 색 의미 유지: 코인/가격 = 주황(`--hundred`), 정답/포인트 = coral, 완성/성공 = 초록(`--ten`).
- 한 화면 강한 색 2~3개: 초록(마을) + 주황(코인) + coral(액션). 나머지 잉크.
- 모션: 배치 시 위에서 톡 떨어지는 drop(`cubic-bezier(.2,1.5,.4,1)`), 코인 보상 pin 팝.
- 여우 선생님: 마을에도 말풍선으로 안내(꼬리 여우 쪽). idle bob 유지.
- 둥근 모서리·여백 일관(`--r-md/--r-lg`). 터치 타깃: 상점 아이템·타일 크게.

## math-pedagogue (elementary-math-pedagogy)
- 기존 세로셈 풀이(buildAddSteps/buildSubSteps) 그대로 재사용 → 교육적 정확성 보장.
- 마을 코인 모으기에서는 매 문제 덧셈/뺄셈을 무작위로 섞어 둘 다 연습(둘 다 학습한 단계라 혼합 적절).
- 암산 강요 없음: 펜 캔버스 + "풀이 보기"(한 단계씩) 그대로 제공.
- 난이도: 기존 레벨 1~4 그대로(−/+ 조절). 보상 = 2 + 레벨(어려울수록 더 많은 코인) → 도전 동기.
- 오답은 벌 아님: 부드러운 톤, 재시도 가능.

## sound-designer (game-audio)
- coin(코인 획득): 밝은 상승 3음 arp E5–A5–C6, triangle, vol .16 — '짤랑'.
- buy(구매/배치): 부드러운 2음 G5→C6, sine, vol .12 — '뽕'.
- 완성: 기존 fanfare 재사용. 정답: 기존 correct. 오답: 기존 wrong(부드러움).
- 음소거 토글: 마을 화면 상단바에도 노출, 기존 localStorage 상태 공유.

## frontend-builder (vanilla-web-game)
- 새 화면 `#village`(꾸미기) + 기존 `#stage` 재사용(코인 모으기=퀴즈 인프라 재활용).
- 상태: `state.coins`, `state.tiles[24]`, `state.ctx`("quiz"|"village"). localStorage: `mg_coins`, `mg_village`.
- 외과적: 기존 renderVForm/keypad/checkAnswer/hint/펜 캔버스 재사용, checkAnswer 성공 분기만 추가.
- mute/home 버튼 다중 화면 → 클래스(`.js-mute`/`.js-home`) 바인딩으로 통일.

## render-qa (검증 대상)
- 홈에 마을 카드 보임 / 마을판·상점 정렬·겹침·잘림 없음.
- 코인 모으기 진입 → 정답 시 코인 증가, 상점 구매 → 타일 배치 → 새로고침 후에도 유지(localStorage).
- 산술 회귀: 기존 덧셈/뺄셈 풀이 정상.
- 음소거 토글 존재 + 콘솔 에러 0. (소리 품질은 사용자 청취)
