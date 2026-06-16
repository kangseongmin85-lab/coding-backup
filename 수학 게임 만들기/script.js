/* =========================================================
   블록 수학 → 세로셈 수학
   덧셈의 받아올림 / 뺄셈의 받아내림을
   학교에서 가르치는 세로셈 방식으로 한 칸씩 보여준다.
   ========================================================= */

const $ = (sel) => document.querySelector(sel);

// ---- 화면 요소 ----
const homeScreen = $("#home");
const stageScreen = $("#stage");
const villageScreen = $("#village");
const vform = $("#vform");
const helper = $("#helper");
const speechEl = $("#speech");
const controlsEl = $("#controls");
const stageTitle = $("#stageTitle");
const scoreStarsEl = $("#scoreStars");
const levelTagEl = $("#levelTag");
const fxLayer = $("#fxLayer");

// ---- 상태 ----
const MAX_LEVEL = 4;
const state = {
  op: "add",      // "add" | "sub"
  mode: "learn",  // "learn" | "quiz" | "village"
  ctx: "quiz",    // 문제 풀이 맥락: "quiz"(별) | "village"(코인)
  stars: 0,
  correctCount: 0,
  level: 1,       // 명시적 레벨(−/+로 조절, 정답 5개마다 자동 상승)
  player: "",     // 고른 아이 이름(범진·다현) — 메시지에 불러줌
  coins: 0,       // 꾸미기 코인(localStorage 저장)
  unlocked: ["fox"], // 해금한 캐릭터 key
  owned: [],      // 보유한 배경 key
  ownedItems: [], // 보유한 이펙트 아이템 key
  equip: {},      // { charKey: { bg, item } }
  curChar: "fox", // 현재 꾸미는 캐릭터
  shopTab: "bg",  // 상점 카테고리 탭(bg|item)
  advStage: 1,    // 모험 현재 스테이지
  advPos: 0,      // 모험 현재 칸(0=출발)
  advMap: null,   // 스테이지마다 무작위 생성되는 박스 맵 {path, specials, theme, decos}
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const level = () => state.level;

/* ===================== 여우 선생님 마스코트 (소프트 손그림풍) ===================== */
const FOX_SVG = `
<svg class="fox" viewBox="0 0 120 124" aria-hidden="true">
  <!-- 꼬리 -->
  <path d="M24 102 C0 98 2 60 26 68 C16 84 28 102 40 96 Z" fill="#e8915a" stroke="#5e5048" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M28 98 C13 94 14 72 24 68 C22 84 30 94 38 92 Z" fill="#f6ead9"/>
  <!-- 귀 -->
  <path d="M30 40 L18 9 L49 30 Z" fill="#e8915a" stroke="#5e5048" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M90 40 L102 9 L71 30 Z" fill="#e8915a" stroke="#5e5048" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M33 34 L26 18 L44 30 Z" fill="#7a4a36"/>
  <path d="M87 34 L94 18 L76 30 Z" fill="#7a4a36"/>
  <!-- 머리 -->
  <path d="M60 18 C84 18 99 36 99 60 C99 86 82 104 60 104 C38 104 21 86 21 60 C21 36 36 18 60 18 Z" fill="#e8915a" stroke="#5e5048" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M60 18 C40 18 21 36 21 60 C21 86 40 104 60 104 C50 100 44 90 43 74 C42 54 47 32 60 18 Z" fill="#d77f48" opacity=".4"/>
  <!-- 흰 주둥이 -->
  <path d="M60 60 C75 60 84 71 84 82 C84 96 73 104 60 104 C47 104 36 96 36 82 C36 71 45 60 60 60 Z" fill="#f6ead9"/>
  <!-- 볼터치 + 수염 점 + 코 (항상) -->
  <ellipse cx="35" cy="70" rx="5.6" ry="3.6" fill="#f3a6aa" opacity=".5"/>
  <ellipse cx="85" cy="70" rx="5.6" ry="3.6" fill="#f3a6aa" opacity=".5"/>
  <g fill="#5e5048"><circle cx="30" cy="66" r="1"/><circle cx="29" cy="71" r="1"/><circle cx="90" cy="66" r="1"/><circle cx="91" cy="71" r="1"/></g>
  <path d="M55.5 71 Q60 68 64.5 71 Q62 77 60 78 Q58 77 55.5 71 Z" fill="#df8c9a" stroke="#5e5048" stroke-width="1"/>

  <!-- 표정: 기본 -->
  <g class="face-idle">
    <ellipse cx="46" cy="58" rx="6" ry="7" fill="#41372f"/>
    <ellipse cx="74" cy="58" rx="6" ry="7" fill="#41372f"/>
    <circle cx="48" cy="55.4" r="2" fill="#fff"/>
    <circle cx="76" cy="55.4" r="2" fill="#fff"/>
    <path d="M60 78 Q56 82 52 80 M60 78 Q64 82 68 80" stroke="#5e5048" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g>
  <!-- 표정: 정답(웃음) -->
  <g class="face-happy">
    <path d="M40 59 Q46 53 52 59" stroke="#41372f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M68 59 Q74 53 80 59" stroke="#41372f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M52 79 Q60 89 68 79 Q60 84 52 79 Z" fill="#9c5a52"/>
    <path d="M57 84 Q60 87 63 84 Z" fill="#ef8a96"/>
  </g>
  <!-- 표정: 생각 -->
  <g class="face-think">
    <ellipse cx="46" cy="56" rx="5.6" ry="6.4" fill="#41372f"/>
    <ellipse cx="74" cy="56" rx="5.6" ry="6.4" fill="#41372f"/>
    <circle cx="48" cy="53.6" r="1.8" fill="#fff"/>
    <circle cx="76" cy="53.6" r="1.8" fill="#fff"/>
    <path d="M66 47 Q74 43 82 48" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M55 81 Q60 79 65 81" stroke="#5e5048" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <text x="90" y="34" font-size="20" font-weight="900" fill="#e8915a">?</text>
  </g>
  <!-- 표정: 아쉬움 -->
  <g class="face-oops">
    <ellipse cx="46" cy="59" rx="5.4" ry="6" fill="#41372f"/>
    <ellipse cx="74" cy="59" rx="5.4" ry="6" fill="#41372f"/>
    <circle cx="48" cy="57" r="1.7" fill="#fff"/>
    <circle cx="76" cy="57" r="1.7" fill="#fff"/>
    <path d="M40 50 Q46 47 51 52" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M69 52 Q74 47 80 50" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M54 82 Q60 79 66 82" stroke="#5e5048" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M88 44 q3 5 0 7 q-3 -2 0 -7 Z" fill="#8fd4ff" stroke="#3aa6e0" stroke-width="1"/>
  </g>
  <!-- 표정: 축하 -->
  <g class="face-cheer">
    <path d="M40 58 Q46 51 52 58" stroke="#41372f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M68 58 Q74 51 80 58" stroke="#41372f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M51 78 Q60 90 69 78 Q60 84 51 78 Z" fill="#9c5a52"/>
    <path d="M56 83 Q60 87 64 83 Z" fill="#ef8a96"/>
    <text x="13" y="30" font-size="14" fill="#ffce3a">✦</text>
    <text x="95" y="30" font-size="12" fill="#ffce3a">✦</text>
  </g>
</svg>`;

// 🦉 부엉이 — 안경 쓴 상점지기(소프트 손그림풍, 자체 완결 색)
const OWL_SVG = `
<svg class="owl" viewBox="0 0 120 124" aria-hidden="true">
  <path d="M33 28 L25 7 L50 24 Z" fill="#a07a4e" stroke="#5e5048" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M87 28 L95 7 L70 24 Z" fill="#a07a4e" stroke="#5e5048" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M60 16 C87 16 101 38 101 66 C101 96 83 112 60 112 C37 112 19 96 19 66 C19 38 33 16 60 16 Z" fill="#b78a5e" stroke="#5e5048" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M60 16 C37 16 19 38 19 66 C19 96 37 112 60 112 C49 107 41 94 40 74 C39 52 46 30 60 16 Z" fill="#a2774d" opacity=".3"/>
  <path d="M60 54 C79 54 89 71 89 87 C89 103 75 112 60 112 C45 112 31 103 31 87 C31 71 41 54 60 54 Z" fill="#ead9c0" stroke="#5e5048" stroke-width="2" stroke-linejoin="round"/>
  <path d="M48 73 q6 5 0 10 M60 71 q6 5 0 10 M72 73 q6 5 0 10 M54 87 q6 5 0 10 M66 87 q6 5 0 10" stroke="#d8c19a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M30 60 C21 76 25 94 39 102 C34 87 33 72 42 60 Z" fill="#a07a4e" stroke="#5e5048" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M90 60 C99 76 95 94 81 102 C86 87 87 72 78 60 Z" fill="#a07a4e" stroke="#5e5048" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M33 40 Q45 34 57 39" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M63 39 Q75 34 87 40" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <circle cx="45" cy="57" r="15" fill="#fbf7ef" stroke="#5e5048" stroke-width="2.3"/>
  <circle cx="75" cy="57" r="15" fill="#fbf7ef" stroke="#5e5048" stroke-width="2.3"/>
  <circle cx="46" cy="58" r="8" fill="#3a2f28"/>
  <circle cx="74" cy="58" r="8" fill="#3a2f28"/>
  <circle cx="49" cy="54.5" r="2.8" fill="#fff"/>
  <circle cx="77" cy="54.5" r="2.8" fill="#fff"/>
  <circle cx="45" cy="57" r="16.2" fill="none" stroke="#7a5a38" stroke-width="2"/>
  <circle cx="75" cy="57" r="16.2" fill="none" stroke="#7a5a38" stroke-width="2"/>
  <path d="M60 56 q5 -4 10 0" stroke="#7a5a38" stroke-width="2" fill="none"/>
  <path d="M60 63 L52.5 72 Q60 76 67.5 72 Z" fill="#eaa23a" stroke="#c8801a" stroke-width="1.5" stroke-linejoin="round"/>
  <ellipse cx="29" cy="77" rx="4.4" ry="3" fill="#f0a48f" opacity=".45"/>
  <ellipse cx="91" cy="77" rx="4.4" ry="3" fill="#f0a48f" opacity=".45"/>
  <path d="M52 112 l-4 6 M56 112 l0 6 M60 112 l4 6" stroke="#eaa23a" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M60 112 l-4 6 M64 112 l0 6 M68 112 l4 6" stroke="#eaa23a" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;

/* ===================== 친구 캐릭터(소프트 손그림풍) + 꾸미기 자산 =====================
   참고: 다운로드.jpg(통통 너구리) + kawaii 캐릭터 디자인 — 큰 머리·통통한 몸·둥근 실루엣,
   부드러운 잉크선, 차분한 자연색, 털 질감, 작고 귀여운 얼굴. 좌표 계약 유지(눈 y58, 머리 위 y18,
   목 y100)로 액세서리 정렬 호환. */
const INK = "#5e5048";                 // 부드러운 갈회색 잉크
// 공통 귀여운 얼굴(idle): 둥근 눈 + 분홍 코 + 작은 입 + 홍조 + 수염 점
const FACE_IDLE = `
  <ellipse cx="46" cy="58" rx="6" ry="7" fill="#41372f"/>
  <ellipse cx="74" cy="58" rx="6" ry="7" fill="#41372f"/>
  <circle cx="48" cy="55.4" r="2" fill="#fff"/>
  <circle cx="76" cy="55.4" r="2" fill="#fff"/>
  <path d="M55.5 71 Q60 68 64.5 71 Q62 77 60 78 Q58 77 55.5 71 Z" fill="#df8c9a" stroke="${INK}" stroke-width="1"/>
  <path d="M60 78 Q56 82 52 80 M60 78 Q64 82 68 80" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="36" cy="70" rx="5.6" ry="3.6" fill="#f3a6aa" opacity=".5"/>
  <ellipse cx="84" cy="70" rx="5.6" ry="3.6" fill="#f3a6aa" opacity=".5"/>
  <g fill="${INK}"><circle cx="30" cy="66" r="1"/><circle cx="29" cy="71" r="1"/><circle cx="90" cy="66" r="1"/><circle cx="91" cy="71" r="1"/></g>`;
const HEAD = (col) => `<path d="M60 18 C84 18 99 36 99 60 C99 86 82 102 60 102 C38 102 21 86 21 60 C21 36 36 18 60 18 Z" fill="${col}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
const HEAD_SHADE = (col) => `<path d="M60 18 C40 18 21 36 21 60 C21 86 40 102 60 102 C50 98 44 88 43 72 C42 54 47 32 60 18 Z" fill="${col}" opacity=".4"/>`;

// 🐰 토끼 (긴 귀)
const RABBIT_BODY = `
  <path d="M48 40 C42 8 48 3 52 6 C56 9 55 26 53 40 Z" fill="#efe9e2" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M72 40 C78 8 72 3 68 6 C64 9 65 26 67 40 Z" fill="#efe9e2" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M49 35 C47 16 50 11 51 13 C52 22 51 30 50 35 Z" fill="#f0c2cb"/>
  <path d="M71 35 C73 16 70 11 69 13 C68 22 69 30 70 35 Z" fill="#f0c2cb"/>
  ${HEAD("#efe9e2")}${HEAD_SHADE("#e1d9cf")}
  <path d="M22 56 l-5 -3 M20 62 l-6 0 M98 56 l5 -3 M100 62 l6 0" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".5"/>
  ${FACE_IDLE}`;

// 🐱 고양이 (삼각 귀 + 줄무늬)
const CAT_BODY = `
  <path d="M31 38 L25 15 L50 31 Z" fill="#b8c0c9" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M89 38 L95 15 L70 31 Z" fill="#b8c0c9" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M34 35 L31 23 L45 32 Z" fill="#f0c2cb"/>
  <path d="M86 35 L89 23 L75 32 Z" fill="#f0c2cb"/>
  ${HEAD("#b8c0c9")}${HEAD_SHADE("#a6afba")}
  <path d="M60 19 q-4 7 -1 13 M49 22 q-3 6 -1 11 M71 22 q3 6 1 11" stroke="#9aa4ae" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${FACE_IDLE}`;

// 🐻 곰 (둥근 귀 + 주둥이)
const BEAR_BODY = `
  <circle cx="32" cy="27" r="11" fill="#b78a5e" stroke="${INK}" stroke-width="2.3"/>
  <circle cx="88" cy="27" r="11" fill="#b78a5e" stroke="${INK}" stroke-width="2.3"/>
  <circle cx="32" cy="27" r="5.5" fill="#cfa978"/>
  <circle cx="88" cy="27" r="5.5" fill="#cfa978"/>
  ${HEAD("#b78a5e")}${HEAD_SHADE("#a2774d")}
  <ellipse cx="60" cy="76" rx="17" ry="13" fill="#ead9c0" stroke="${INK}" stroke-width="1.6"/>
  ${FACE_IDLE}`;

// 🐿️ 다람쥐 (뾰족 귀 + 통통 볼 + 앞니)
const SQUIRREL_BODY = `
  <path d="M37 36 C32 16 39 12 44 18 C47 23 46 31 44 36 Z" fill="#c98a52" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M83 36 C88 16 81 12 76 18 C73 23 74 31 76 36 Z" fill="#c98a52" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  ${HEAD("#c98a52")}${HEAD_SHADE("#b3743e")}
  <ellipse cx="33" cy="73" rx="10" ry="8.5" fill="#d49a63"/>
  <ellipse cx="87" cy="73" rx="10" ry="8.5" fill="#d49a63"/>
  ${FACE_IDLE}
  <path d="M56.5 80 h7 v5 q-3.5 2 -7 0 Z" fill="#fff" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M60 80 v5" stroke="${INK}" stroke-width="0.9"/>`;

// 🦉 부엉이 헤드(전신 합성용 — 몸통은 공용 BODY가 담당). 안경 쓴 큰 눈
const OWL_HEAD = `
  <path d="M33 28 L25 7 L50 24 Z" fill="#a07a4e" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M87 28 L95 7 L70 24 Z" fill="#a07a4e" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  ${HEAD("#b78a5e")}${HEAD_SHADE("#a2774d")}
  <path d="M49 22 C62 20 76 24 84 31 C72 26 60 27 49 30 Z" fill="#cfa978" opacity=".7"/>
  <path d="M33 41 Q45 35 57 40" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M63 40 Q75 35 87 41" stroke="#6b5038" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <circle cx="45" cy="57" r="14" fill="#fbf7ef" stroke="${INK}" stroke-width="2.2"/>
  <circle cx="75" cy="57" r="14" fill="#fbf7ef" stroke="${INK}" stroke-width="2.2"/>
  <circle cx="46" cy="58" r="7.5" fill="#3a2f28"/>
  <circle cx="74" cy="58" r="7.5" fill="#3a2f28"/>
  <circle cx="48.5" cy="55" r="2.6" fill="#fff"/>
  <circle cx="76.5" cy="55" r="2.6" fill="#fff"/>
  <circle cx="45" cy="57" r="15.2" fill="none" stroke="#7a5a38" stroke-width="2"/>
  <circle cx="75" cy="57" r="15.2" fill="none" stroke="#7a5a38" stroke-width="2"/>
  <path d="M60 56 q5 -4 10 0" stroke="#7a5a38" stroke-width="2" fill="none"/>
  <path d="M60 63 L53 71 Q60 75 67 71 Z" fill="#eaa23a" stroke="#c8801a" stroke-width="1.4" stroke-linejoin="round"/>
  <ellipse cx="30" cy="75" rx="4.4" ry="3" fill="#f0a48f" opacity=".45"/>
  <ellipse cx="90" cy="75" rx="4.4" ry="3" fill="#f0a48f" opacity=".45"/>`;

// 🦝 너구리 헤드(레퍼런스 시그니처: 눈 마스크 + 회색 정수리)
const RACCOON_BODY = `
  <path d="M31 33 C26 17 33 13 40 20 C44 25 43 32 40 36 Z" fill="#8f9094" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M89 33 C94 17 87 13 80 20 C76 25 77 32 80 36 Z" fill="#8f9094" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M34 31 C31 23 36 21 39 25 Z" fill="#cfcabf"/>
  <path d="M86 31 C89 23 84 21 81 25 Z" fill="#cfcabf"/>
  ${HEAD("#f1ece2")}
  <path d="M60 18 C76 18 90 28 96 43 C72 35 48 35 24 43 C30 28 44 18 60 18 Z" fill="#8f9094"/>
  <path d="M28 54 C32 46 44 45 51 51 C56 55 55 64 49 67 C39 71 28 64 27 58 Z" fill="#5f5f5f"/>
  <path d="M92 54 C88 46 76 45 69 51 C64 55 65 64 71 67 C81 71 92 64 93 58 Z" fill="#5f5f5f"/>
  <ellipse cx="46" cy="58" rx="6" ry="7" fill="#1f1f1f"/>
  <ellipse cx="74" cy="58" rx="6" ry="7" fill="#1f1f1f"/>
  <circle cx="48" cy="55.4" r="2" fill="#fff"/>
  <circle cx="76" cy="55.4" r="2" fill="#fff"/>
  <path d="M55.5 71 Q60 68 64.5 71 Q62 77 60 78 Q58 77 55.5 71 Z" fill="#df8c9a" stroke="${INK}" stroke-width="1"/>
  <path d="M60 78 Q56 82 52 80 M60 78 Q64 82 68 80" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="34" cy="71" rx="5" ry="3.2" fill="#f3a6aa" opacity=".45"/>
  <ellipse cx="86" cy="71" rx="5" ry="3.2" fill="#f3a6aa" opacity=".45"/>`;

// 공용 전신 몸체(머리 아래) — 통통하고 둥글게. fur=몸 색, belly=배·발바닥 색
const BODY = (fur, belly) => `
  <ellipse cx="48" cy="184" rx="11" ry="12" fill="${fur}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <ellipse cx="72" cy="184" rx="11" ry="12" fill="${fur}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <ellipse cx="46" cy="190" rx="9" ry="5" fill="${belly}" stroke="${INK}" stroke-width="1.8"/>
  <ellipse cx="74" cy="190" rx="9" ry="5" fill="${belly}" stroke="${INK}" stroke-width="1.8"/>
  <path d="M60 98 C90 98 95 128 91 152 C87 176 75 185 60 185 C45 185 33 176 29 152 C25 128 30 98 60 98 Z" fill="${fur}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M60 110 C77 110 83 130 81 150 C79 168 71 177 60 177 C49 177 41 168 39 150 C37 130 43 110 60 110 Z" fill="${belly}"/>
  <g fill="${fur}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
    <ellipse cx="30" cy="138" rx="9" ry="13" transform="rotate(20 30 138)"/>
    <ellipse cx="90" cy="138" rx="9" ry="13" transform="rotate(-20 90 138)"/></g>
  <ellipse cx="27" cy="150" rx="6" ry="6.6" fill="${belly}" stroke="${INK}" stroke-width="1.8"/>
  <ellipse cx="93" cy="150" rx="6" ry="6.6" fill="${belly}" stroke="${INK}" stroke-width="1.8"/>
  <path d="M52 156 l4 4 M60 157 l4 4 M68 156 l4 4" stroke="${INK}" stroke-width="1" opacity=".35" stroke-linecap="round"/>`;

// 꼬리(몸통 뒤에 그림)
const TAIL = {
  fox: `<path d="M26 158 C-2 154 0 108 26 116 C16 132 28 158 42 152 Z" fill="#e8915a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M30 152 C12 148 13 122 24 119 C22 132 30 148 38 148 Z" fill="#f6ead9"/>`,
  squirrel: `<path d="M98 168 C130 156 126 92 96 102 C112 116 104 140 98 158 C96 142 84 150 88 166 Z" fill="#c98a52" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
             <path d="M100 158 C118 146 116 110 100 106 C110 120 104 140 100 154 Z" fill="#e2b483" opacity=".7"/>`,
  raccoon: `<g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
              <path d="M28 190 C-4 184 2 116 30 126 C18 144 26 172 44 178 Z" fill="#cfcabf"/></g>
            <path d="M30 126 C22 132 18 142 18 150 L33 152 C34 142 38 134 44 130 Z" fill="#6f6f6f"/>
            <path d="M18 152 C17 162 20 172 26 178 L40 174 C33 168 32 160 33 152 Z" fill="#6f6f6f"/>`,
};

const CHAR_COLORS = {
  fox: ["#e8915a", "#f6ead9"], rabbit: ["#efe9e2", "#fbf7f1"], cat: ["#b8c0c9", "#e9edf1"],
  bear: ["#b78a5e", "#ead9c0"], squirrel: ["#c98a52", "#ecd4b4"], owl: ["#b78a5e", "#ead9c0"],
  raccoon: ["#bfc0c4", "#f4f0e8"],
};

// 🦊 여우 헤드(꾸미기 전신용 — 소프트 손그림풍, 마스코트 FOX_SVG와 별개)
const FOX_HEAD = `
  <path d="M30 38 L18 9 L49 30 Z" fill="#e8915a" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M90 38 L102 9 L71 30 Z" fill="#e8915a" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="M33 33 L26 17 L44 29 Z" fill="#7a4a36"/>
  <path d="M87 33 L94 17 L76 29 Z" fill="#7a4a36"/>
  ${HEAD("#e8915a")}${HEAD_SHADE("#d77f48")}
  <path d="M60 62 C74 62 82 72 82 82 C82 94 72 102 60 102 C48 102 38 94 38 82 C38 72 46 62 60 62 Z" fill="#f6ead9"/>
  ${FACE_IDLE}`;

/* ===== 빨강 두들 캐릭터 4종 (케릭터.png 재현 — 전신 자체완결, viewBox -12 -20 144 250) ===== */
const DRED = "#d8362b", DCREAM = "#f4ede1";
const DSHOE = (cx) => `
  <path d="M${cx - 14} 196 Q${cx - 16} 208 ${cx - 9} 210 L${cx + 13} 210 Q${cx + 17} 210 ${cx + 17} 203 L${cx + 16} 196 Z" fill="${DCREAM}" stroke="${DRED}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M${cx - 13} 204 L${cx + 16} 204" stroke="${DRED}" stroke-width="2.6"/>
  <path d="M${cx - 6} 196 l-1 7 M${cx + 1} 196 l-1 7 M${cx + 8} 196 l-1 7" stroke="${DRED}" stroke-width="1.8"/>`;
// ① 털뭉치 새
const D_BIRD = `
  <path d="M50 150 L50 197 M70 150 L70 197" stroke="${DRED}" stroke-width="7" stroke-linecap="round"/>
  ${DSHOE(50)}${DSHOE(70)}
  <path d="M34 96 C28 80 40 64 52 68 C54 54 66 54 68 68 C80 64 92 80 86 96 C98 100 98 122 86 126 C88 144 72 156 60 156 C48 156 32 144 34 126 C22 122 22 100 34 96 Z" fill="${DRED}"/>
  <circle cx="52" cy="100" r="3.4" fill="${DCREAM}"/>
  <circle cx="68" cy="100" r="3.4" fill="${DCREAM}"/>
  <path d="M56 108 L64 108 L60 115 Z" fill="${DCREAM}"/>
  <path d="M22 74 l0 8 M18 78 l8 0 M98 82 l0 8 M94 86 l8 0" stroke="${DRED}" stroke-width="2"/>`;
// ② 선글라스 멋쟁이
const D_COOL = `
  <path d="M50 150 L48 197 M70 150 L72 197" stroke="${DRED}" stroke-width="7" stroke-linecap="round"/>
  ${DSHOE(48)}${DSHOE(72)}
  <path d="M60 38 C84 38 92 72 90 106 C88 138 76 154 60 154 C44 154 32 138 30 106 C28 72 36 38 60 38 Z" fill="${DCREAM}" stroke="${DRED}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M31 98 C20 102 16 114 21 122" fill="none" stroke="${DRED}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M89 98 C100 102 104 114 99 122" fill="none" stroke="${DRED}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M38 70 Q60 64 82 70 L82 75 Q60 70 38 75 Z" fill="${DRED}"/>
  <path d="M40 73 h17 v11 q-8.5 4 -17 0 Z" fill="${DRED}"/>
  <path d="M63 73 h17 v11 q-8.5 4 -17 0 Z" fill="${DRED}"/>
  <path d="M52 98 Q60 104 68 98" fill="none" stroke="${DRED}" stroke-width="3" stroke-linecap="round"/>
  <path d="M20 56 l0 8 M16 60 l8 0 M100 60 l0 8 M96 64 l8 0" stroke="${DRED}" stroke-width="2"/>`;
// ③ 입 큰 몬스터
const D_MONSTER = `
  <path d="M48 150 L46 197 M72 150 L74 197" stroke="${DRED}" stroke-width="7" stroke-linecap="round"/>
  ${DSHOE(46)}${DSHOE(74)}
  <path d="M40 50 L80 50 Q92 50 92 64 L92 138 Q92 152 78 152 L42 152 Q28 152 28 138 L28 64 Q28 50 40 50 Z" fill="${DRED}"/>
  <path d="M28 98 C18 100 16 112 23 118" fill="none" stroke="${DRED}" stroke-width="6" stroke-linecap="round"/>
  <path d="M92 98 C102 100 104 112 97 118" fill="none" stroke="${DRED}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="50" cy="76" r="3.6" fill="${DCREAM}"/>
  <circle cx="70" cy="76" r="3.6" fill="${DCREAM}"/>
  <path d="M42 92 Q60 118 78 92 Q60 104 42 92 Z" fill="${DCREAM}"/>
  <path d="M50 97 l0 8 M58 100 l0 9 M66 100 l0 9 M74 97 l0 8" stroke="${DRED}" stroke-width="2"/>`;
// ④ 꽃 머리
const D_FLOWER = `
  <path d="M52 150 L50 197 M70 150 L72 197" stroke="${DRED}" stroke-width="6.5" stroke-linecap="round"/>
  ${DSHOE(50)}${DSHOE(72)}
  <path d="M60 98 C77 98 85 122 83 144 C81 160 71 170 60 170 C49 170 39 160 37 144 C35 122 43 98 60 98 Z" fill="${DCREAM}" stroke="${DRED}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M60 98 L60 72" stroke="${DRED}" stroke-width="3.5"/>
  <path d="M60 88 C70 84 79 88 74 94 C67 96 62 92 60 88 Z" fill="${DRED}"/>
  <g fill="${DRED}"><circle cx="60" cy="44" r="11"/><circle cx="45" cy="50" r="11"/><circle cx="75" cy="50" r="11"/><circle cx="50" cy="35" r="11"/><circle cx="70" cy="35" r="11"/></g>
  <circle cx="60" cy="44" r="7.5" fill="${DCREAM}"/>
  <circle cx="54" cy="126" r="2.6" fill="${DRED}"/><circle cx="66" cy="126" r="2.6" fill="${DRED}"/>
  <path d="M54 134 Q60 139 66 134" fill="none" stroke="${DRED}" stroke-width="2.4" stroke-linecap="round"/>`;
// ===== 케릭터.png에서 추출한 실제 벡터 4종을 캐릭터로 사용 (characters.js) =====
const CHAR_ART = {}, CHAR_VB = {}, CHAR_META = [];
for (const [k, c] of Object.entries(window.GAME_CHARS)) {
  CHAR_ART[k] = c.art; CHAR_VB[k] = c.vb; CHAR_META.push({ key: k, name: c.name, cost: c.cost });
}
// 배경색(캐릭터 카드 뒤에 적용)
const BGS = [
  { key: "cream",  name: "크림",   color: "#f6eeec", cost: 0 },
  { key: "mint",   name: "민트",   color: "#def3ea", cost: 5 },
  { key: "sky",    name: "하늘",   color: "#dcebfb", cost: 5 },
  { key: "pink",   name: "분홍",   color: "#fbe4ea", cost: 6 },
  { key: "lemon",  name: "레몬",   color: "#fbf2d6", cost: 6 },
  { key: "lilac",  name: "라일락", color: "#ece4f7", cost: 8 },
];
const bgColor = (key) => (BGS.find((b) => b.key === key) || BGS[0]).color;

// 꾸미기 아이템 — 슬롯(머리 1 + 주변 1 동시 착용). 주변은 떨어지는/떠오르는 파티클.
const ITEMS = [
  // 머리(한 번에 하나)
  { key: "crown",   name: "왕관",     cost: 14, emoji: "👑", slot: "head", cls: "fx-crown" },
  { key: "party",   name: "파티모자", cost: 12, emoji: "🎉", slot: "head", cls: "fx-party" },
  { key: "flower",  name: "꽃",       cost: 8,  emoji: "🌸", slot: "head", cls: "fx-flower" },
  { key: "rainbow", name: "무지개",   cost: 16, emoji: "🌈", slot: "head", cls: "fx-rainbow" },
  // 주변 파티클(한 번에 하나)
  { key: "heart",   name: "하트비",   cost: 10, emoji: "💖", slot: "aura", cls: "fx-heart", fx: "rain" },
  { key: "stars",   name: "별가루",   cost: 10, emoji: "⭐", slot: "aura", cls: "fx-stars", fx: "rain" },
  { key: "spark",   name: "반짝이",   cost: 8,  emoji: "✨", slot: "aura", cls: "fx-spark", fx: "twinkle" },
  { key: "music",   name: "음표",     cost: 10, emoji: "🎵", slot: "aura", cls: "fx-music", fx: "float" },
];
const itemOf = (key) => ITEMS.find((i) => i.key === key);

// 액세서리(같은 좌표계에 겹쳐 그림). cat=같은 칸엔 하나만(머리/눈/목/풍선)
const ACC_ART = {
  bow: `<g>
    <path d="M77 24 L64 17 L64 31 Z" fill="#ff5d7a" stroke="#b02748" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M77 24 L90 17 L90 31 Z" fill="#ff5d7a" stroke="#b02748" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="77" cy="24" r="4" fill="#ff8098" stroke="#b02748" stroke-width="1.2"/></g>`,
  party: `<g>
    <path d="M60 -14 L44 20 L76 20 Z" fill="#7cc6ff" stroke="#2f7be8" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M52 4 L60 0 M48 12 L62 6 M56 16 L68 11" stroke="#ffd23f" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="60" cy="-15" r="4.5" fill="#ff7a85" stroke="#d6485a" stroke-width="1.2"/></g>`,
  crown: `<g>
    <path d="M40 16 L42 -6 L52 8 L60 -10 L68 8 L78 -6 L80 16 Z" fill="#ffce3a" stroke="#d49a16" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="42" cy="-6" r="2.4" fill="#ff7a85"/><circle cx="60" cy="-10" r="2.6" fill="#ff7a85"/><circle cx="78" cy="-6" r="2.4" fill="#ff7a85"/>
    <rect x="40" y="13" width="40" height="5" fill="#ffd96a" stroke="#d49a16" stroke-width="1.2"/></g>`,
  glasses: `<g fill="none" stroke="#3a2a22" stroke-width="2.4">
    <circle cx="46" cy="57" r="11"/><circle cx="74" cy="57" r="11"/>
    <path d="M57 57 q3 -3 6 0"/><path d="M35 56 l-7 -3 M85 56 l7 -3"/></g>`,
  bowtie: `<g>
    <path d="M60 104 L48 98 L48 110 Z" fill="#ff5d7a" stroke="#b02748" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M60 104 L72 98 L72 110 Z" fill="#ff5d7a" stroke="#b02748" stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="56" y="100" width="8" height="8" rx="2" fill="#ff8098" stroke="#b02748" stroke-width="1.2"/></g>`,
  scarf: `<g>
    <path d="M30 100 Q60 117 90 100 Q90 110 86 113 Q60 124 34 113 Q30 110 30 100 Z" fill="#7ad0a0" stroke="#2f9a6a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M78 111 q10 4 8 17 l-10 -2 q4 -8 0 -15 Z" fill="#7ad0a0" stroke="#2f9a6a" stroke-width="1.6" stroke-linejoin="round"/></g>`,
  flower: `<g>
    <g fill="#ff8fb0" stroke="#d6485a" stroke-width="1">
      <circle cx="30" cy="20" r="4"/><circle cx="37" cy="24" r="4"/><circle cx="34" cy="31" r="4"/><circle cx="26" cy="30" r="4"/><circle cx="23" cy="22" r="4"/></g>
    <circle cx="30" cy="25" r="3.2" fill="#ffd23f"/></g>`,
  balloon: `<g>
    <ellipse cx="101" cy="-2" rx="11" ry="13" fill="#ff7a85" stroke="#d6485a" stroke-width="1.4"/>
    <path d="M101 11 L99 14 L103 14 Z" fill="#ff7a85"/>
    <path d="M101 14 q-5 12 -12 20" stroke="#c9a9b0" stroke-width="1.2" fill="none"/>
    <ellipse cx="97" cy="-6" rx="3" ry="4" fill="#fff" opacity=".4"/></g>`,
  headband: `<g>
    <path d="M28 30 Q60 15 92 30" stroke="#7ad0a0" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g fill="#ff8fb0" stroke="#d6485a" stroke-width="0.8">
      <circle cx="36" cy="22" r="3.4"/><circle cx="50" cy="16" r="3.4"/><circle cx="60" cy="14" r="3.4"/><circle cx="70" cy="16" r="3.4"/><circle cx="84" cy="22" r="3.4"/></g>
    <circle cx="60" cy="15" r="1.8" fill="#ffd23f"/></g>`,
  wizard: `<g>
    <path d="M60 -16 L40 18 L80 18 Z" fill="#6c5ce7" stroke="#4a3aa8" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M34 18 q26 9 52 0 l0 6 q-26 9 -52 0 Z" fill="#5546c0" stroke="#4a3aa8" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M58 -4 l2.5 6 l6.5 .8 l-5 4.5 l1.5 6.4 l-5.5 -3 l-5.5 3 l1.5 -6.4 l-5 -4.5 l6.5 -.8 Z" fill="#ffd23f"/></g>`,
  sunglasses: `<g>
    <rect x="33" y="50" width="25" height="13" rx="5" fill="#2a2a33" stroke="#111" stroke-width="1.4"/>
    <rect x="62" y="50" width="25" height="13" rx="5" fill="#2a2a33" stroke="#111" stroke-width="1.4"/>
    <path d="M58 53 h4" stroke="#111" stroke-width="2"/><path d="M33 53 l-6 -3 M87 53 l6 -3" stroke="#111" stroke-width="2"/>
    <path d="M37 53 l7 0" stroke="#fff" stroke-width="1.4" opacity=".5"/></g>`,
  wand: `<g>
    <path d="M93 152 L114 110" stroke="#b9863f" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M114 101 l3 7 l7.5 1 l-5.5 5 l1.5 7.5 l-6.5 -3.5 l-6.5 3.5 l1.5 -7.5 l-5.5 -5 l7.5 -1 Z" fill="#ffd23f" stroke="#e0a81e" stroke-width="1"/></g>`,
  tee: `<g fill="#ff6b6b" stroke="#d24b4b" stroke-width="2" stroke-linejoin="round">
    <path d="M45 112 C50 108 70 108 75 112 C82 117 84 140 81 156 C72 163 48 163 39 156 C36 140 38 117 45 112 Z"/>
    <path d="M41 115 L30 126 L36 135 L47 126 Z"/><path d="M79 115 L90 126 L84 135 L73 126 Z"/></g>`,
  hoodie: `<g>
    <path d="M45 112 C50 108 70 108 75 112 C82 117 84 142 81 158 C72 165 48 165 39 158 C36 142 38 117 45 112 Z" fill="#5b8def" stroke="#3f63b0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M41 115 L30 127 L36 136 L47 127 Z" fill="#5b8def" stroke="#3f63b0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M79 115 L90 127 L84 136 L73 127 Z" fill="#5b8def" stroke="#3f63b0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M52 112 q8 7 16 0 l-1 9 q-7 4 -14 0 Z" fill="#3f63b0"/>
    <path d="M58 120 v20 M62 120 v20" stroke="#3f63b0" stroke-width="1.6"/></g>`,
  dress: `<g fill="#ff8fc0" stroke="#d65f97" stroke-width="2" stroke-linejoin="round">
    <path d="M47 112 C52 108 68 108 73 112 C77 120 77 130 75 138 L86 170 C70 180 50 180 34 170 L45 138 C43 130 43 120 47 112 Z"/>
    <path d="M43 115 L33 126 L39 134 L49 125 Z"/><path d="M77 115 L87 126 L81 134 L71 125 Z"/></g>`,
  overalls: `<g fill="#6b8fd6" stroke="#46639e" stroke-width="2" stroke-linejoin="round">
    <path d="M45 132 C50 128 70 128 75 132 C79 146 77 166 73 173 C65 177 55 177 47 173 C43 166 41 146 45 132 Z"/>
    <path d="M51 112 L51 134" stroke-width="4.5"/><path d="M69 112 L69 134" stroke-width="4.5"/>
    <rect x="52" y="142" width="16" height="13" rx="2" fill="#46639e"/></g>`,
  cape: `<g>
    <path d="M41 110 C34 132 30 162 37 186 L60 178 L83 186 C90 162 86 132 79 110 C70 117 50 117 41 110 Z" fill="#ff5d5d" stroke="#c33636" stroke-width="2" stroke-linejoin="round"/>
    <path d="M48 112 q12 8 24 0 l-3 8 q-9 5 -18 0 Z" fill="#ffd23f"/></g>`,
};

// 배경(꾸미기 무대 뒤, viewBox -12 -20 144 250 전체를 채움)
const BG_ART = {
  bg_sky: `<g>
    <rect x="-12" y="-20" width="144" height="250" fill="#d4ecff"/>
    <rect x="-12" y="158" width="144" height="72" fill="#bfe8a6"/>
    <path d="M-12 158 Q60 144 132 158 L132 174 L-12 174 Z" fill="#a9dd8d"/>
    <circle cx="14" cy="2" r="15" fill="#ffe27a"/>
    <g fill="#fff" opacity=".95"><ellipse cx="96" cy="16" rx="16" ry="9"/><ellipse cx="108" cy="11" rx="10" ry="7"/><ellipse cx="84" cy="11" rx="9" ry="6"/></g></g>`,
  bg_field: `<g>
    <rect x="-12" y="-20" width="144" height="250" fill="#cdeaff"/>
    <ellipse cx="18" cy="192" rx="84" ry="46" fill="#bfe8a6"/>
    <ellipse cx="112" cy="202" rx="84" ry="48" fill="#a9dd8d"/>
    <rect x="-12" y="198" width="144" height="32" fill="#9ad27e"/>
    <circle cx="104" cy="4" r="14" fill="#ffe27a"/>
    <g fill="#ff8fb0"><circle cx="22" cy="180" r="3"/><circle cx="40" cy="188" r="3"/><circle cx="92" cy="186" r="3"/></g></g>`,
  bg_rainbow: `<g>
    <rect x="-12" y="-20" width="144" height="250" fill="#eaf6ff"/>
    <g fill="none" stroke-width="6">
      <path d="M-6 152 A66 66 0 0 1 126 152" stroke="#ff6b6b"/>
      <path d="M2 152 A58 58 0 0 1 118 152" stroke="#ffac42"/>
      <path d="M10 152 A50 50 0 0 1 110 152" stroke="#ffd23f"/>
      <path d="M18 152 A42 42 0 0 1 102 152" stroke="#5fc77e"/>
      <path d="M26 152 A34 34 0 0 1 94 152" stroke="#5b8def"/></g>
    <rect x="-12" y="152" width="144" height="78" fill="#bfe8a6"/>
    <g fill="#fff" opacity=".95"><ellipse cx="4" cy="152" rx="16" ry="9"/><ellipse cx="116" cy="152" rx="16" ry="9"/></g></g>`,
  bg_night: `<g>
    <rect x="-12" y="-20" width="144" height="250" fill="#2b2f5e"/>
    <rect x="-12" y="162" width="144" height="68" fill="#3b3f72"/>
    <circle cx="100" cy="4" r="12" fill="#ffe9a8"/><circle cx="95" cy="0" r="11" fill="#2b2f5e"/>
    <g fill="#fff"><circle cx="20" cy="8" r="1.6"/><circle cx="42" cy="24" r="1.3"/><circle cx="62" cy="4" r="1.5"/><circle cx="14" cy="42" r="1.2"/><circle cx="78" cy="32" r="1.3"/><circle cx="30" cy="52" r="1.2"/><circle cx="120" cy="40" r="1.3"/></g></g>`,
  bg_cream: `<g>
    <rect x="-12" y="-20" width="144" height="250" fill="#f4ede1"/>
    <g fill="none" stroke="#e1c7be" stroke-width="2" stroke-linecap="round"><path d="M16 28 l0 9 M11 32 l10 0"/><path d="M104 40 l0 9 M99 44 l10 0"/><path d="M22 150 l0 8 M18 154 l8 0"/></g></g>`,
};

const ACC_META = [
  { key: "bg_cream",   name: "크림",       cost: 0,  cat: "bg" },
  { key: "bg_sky",     name: "하늘",       cost: 0,  cat: "bg" },
  { key: "bg_field",   name: "들판",       cost: 6,  cat: "bg" },
  { key: "bg_night",   name: "밤하늘",     cost: 8,  cat: "bg" },
  { key: "bg_rainbow", name: "무지개",     cost: 10, cat: "bg" },
  { key: "tee",        name: "티셔츠",     cost: 6,  cat: "body" },
  { key: "overalls",   name: "멜빵바지",   cost: 9,  cat: "body" },
  { key: "hoodie",     name: "후드티",     cost: 9,  cat: "body" },
  { key: "dress",      name: "원피스",     cost: 10, cat: "body" },
  { key: "cape",       name: "영웅 망토",  cost: 12, cat: "body" },
  { key: "bow",        name: "리본",       cost: 4,  cat: "head" },
  { key: "flower",     name: "꽃",         cost: 5,  cat: "head" },
  { key: "headband",   name: "꽃머리띠",   cost: 6,  cat: "head" },
  { key: "party",      name: "고깔모자",   cost: 8,  cat: "head" },
  { key: "wizard",     name: "마법사모자", cost: 12, cat: "head" },
  { key: "crown",      name: "왕관",       cost: 15, cat: "head" },
  { key: "glasses",    name: "안경",       cost: 6,  cat: "eyes" },
  { key: "sunglasses", name: "선글라스",   cost: 8,  cat: "eyes" },
  { key: "bowtie",     name: "나비넥타이", cost: 7,  cat: "neck" },
  { key: "scarf",      name: "목도리",     cost: 8,  cat: "neck" },
  { key: "balloon",    name: "풍선",       cost: 10, cat: "float" },
  { key: "wand",       name: "요술봉",     cost: 11, cat: "float" },
];
const SHOP_TABS = [
  { k: "bg", n: "🖼️ 배경" }, { k: "body", n: "👕 옷" }, { k: "head", n: "🎩 머리" },
  { k: "eyes", n: "👓 얼굴" }, { k: "neck", n: "🧣 목" }, { k: "float", n: "✨ 손" },
];

function paintCharacters() {
  // 홈 히어로: 캐릭터 4종 한 줄
  document.querySelectorAll("[data-crew]").forEach((el) => {
    el.innerHTML = CHAR_META.map((c) => `<span class="crew-ch">${charInner(c.key)}</span>`).join("");
  });
  // 안내 친구(학습/꾸미기): data-guide 속성의 캐릭터 1종
  document.querySelectorAll("[data-guide]").forEach((el) => {
    const key = el.getAttribute("data-guide");
    el.innerHTML = charInner(CHAR_ART[key] ? key : CHAR_META[0].key);
  });
}
// 표정 전환: #mascot의 mood 클래스를 토글(face-* 그룹 show/hide). idle/happy/think/oops/cheer
function setMood(mood) {
  const m = document.querySelector("#mascot");
  if (!m) return;
  m.classList.remove("mood-happy", "mood-think", "mood-oops", "mood-cheer");
  if (mood) { void m.offsetWidth; m.classList.add("mood-" + mood); }
}

/* ===================== 플레이어 이름(범진·다현) =====================
   고른 이름을 메시지에 불러줘서 친밀감을 준다. 한국어 호격조사 자동(받침○→아, ✕→야). */
function hasJong(ch) { const c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
function josaVoc(name) { return name + (hasJong(name[name.length - 1]) ? "아" : "야"); }
// 메시지 앞에 붙일 호칭("범진아, " 또는 이름 없으면 "")
function callName() { return state.player ? josaVoc(state.player) + ", " : ""; }
function setPlayer(name) {
  state.player = name;
  if (name) localStorage.setItem("mg_player", name);
  document.querySelectorAll("#whoPick .who-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.who === name));
  const sub = $("#subtitle");
  if (sub) sub.textContent = name
    ? `${josaVoc(name)}, 받아올림·받아내림을 한 칸씩 같이 풀어요!`
    : "받아올림·받아내림을 한 칸씩, 천천히 같이 풀어요";
}

/* ===================== 효과음 (Web Audio 합성, 외부 파일 없음) ===================== */
let actx = null;
let muted = localStorage.getItem("mg_muted") === "1";

// 첫 사용자 제스처 후에 오디오 컨텍스트를 만든다(브라우저 자동재생 정책)
function audioCtx() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}

// 한 음: 부드러운 페이드인/아웃 엔벨로프로 짧게
function tone(freq, dur = 0.12, type = "sine", vol = 0.18, when = 0) {
  if (muted) return;
  const ctx = audioCtx(); if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.03);
}
function arp(freqs, gap = 0.09, type = "sine", vol = 0.18) {
  freqs.forEach((f, i) => tone(f, 0.16, type, vol, i * gap));
}
// 위로 글라이드(반짝)
function sparkle(f0 = 1046, f1 = 1318, dur = 0.18) {
  if (muted) return;
  const ctx = audioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.03);
}

const NOTE = { C5: 523, E5: 659, G5: 784, A5: 880, C6: 1046, E6: 1318, A3: 220, F3: 175 };
// 이벤트별 소리 — 부드럽고 짧게, 오답은 벌이 아닌 부드러운 톤
const Snd = {
  step:    () => tone(NOTE.E5, 0.07, "triangle", 0.09),                       // 단계 진행
  magic:   () => sparkle(NOTE.C6, NOTE.E6, 0.18),                             // 받아올림/내림 변신
  place:   () => tone(NOTE.G5, 0.10, "sine", 0.11),                           // 결과 숫자 등장
  correct: () => arp([NOTE.C5, NOTE.E5, NOTE.G5], 0.09, "sine", 0.18),        // 정답
  wrong:   () => { tone(NOTE.A3, 0.16, "sine", 0.15); tone(NOTE.F3, 0.20, "sine", 0.13, 0.10); }, // 오답(부드럽게)
  fanfare: () => arp([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.10, "triangle", 0.18), // 완성/레벨업
  coin:    () => arp([NOTE.E5, NOTE.A5, NOTE.C6], 0.07, "triangle", 0.16),           // 코인 획득 '짤랑'
  buy:     () => { tone(NOTE.G5, 0.08, "sine", 0.12); tone(NOTE.C6, 0.10, "sine", 0.12, 0.07); }, // 구매/배치 '뽕'
};

function setMuted(on) {
  muted = on;
  localStorage.setItem("mg_muted", on ? "1" : "0");
  document.querySelectorAll(".js-mute").forEach((b) => { b.textContent = on ? "🔇" : "🔊"; });
}

const PARENT = { o: "t", t: "h", h: "th", th: null };
const KIND_NAME = { o: "일", t: "십", h: "백", th: "천" };
const placeIndex = { o: 0, t: 1, h: 2, th: 3 };
const PLACES = ["o", "t", "h", "th"];
const CELLW = 64;

/* ===================== 화면 전환 ===================== */
function show(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
}
function goHome() {
  stageScreen.classList.remove("adv-full");
  const sc = document.querySelector(".stage-solve-col"); if (sc) sc.classList.remove("hidden");
  show(homeScreen);
}

function digits(n) {
  return { th: Math.floor(n / 1000) % 10, h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10 };
}
function say(html) {
  speechEl.innerHTML = html;
  speechEl.classList.toggle("sub", state.op === "sub");
}

/* ===================== 세로셈 판 그리기 ===================== */
let cells = { top: {}, bot: {}, res: {} };
let divCells = {};        // 나눗셈(긴 나눗셈) 셀 참조
let curForm = "v";        // "v"=세로셈(가감승) | "div"=나눗셈

function mkRow() { const d = document.createElement("div"); d.className = "vrow"; return d; }
function mkSign(sym, cls) {
  const c = document.createElement("div");
  c.className = "cell sign" + (cls ? " " + cls : "");
  c.innerHTML = `<span class="d">${sym}</span>`;
  return c;
}
function mkCell(t) {
  const c = document.createElement("div");
  c.className = "cell";
  c.innerHTML = `<span class="d">${t}</span>`;
  return c;
}
function mkTopCell(t) {
  const c = document.createElement("div");
  c.className = "cell";
  c.innerHTML = `<span class="ann-above"></span><span class="borrow1"></span><span class="d">${t}</span>`;
  return c;
}

function renderVForm(a, b, opSym) {
  curForm = "v";
  const la = String(a).length, lb = String(b).length;
  const result = opSym === "+" ? a + b : opSym === "−" ? a - b : a * b;
  const lr = String(result).length;
  const width = Math.max(2, la, lb, lr);
  const places = PLACES.slice(0, width);
  const order = places.slice().reverse(); // 왼쪽(높은 자리)부터
  const da = digits(a), db = digits(b);

  cells = { top: {}, bot: {}, res: {} };
  vform.innerHTML = "";
  const topRow = mkRow(), botRow = mkRow(), resRow = mkRow();
  topRow.appendChild(mkSign(""));
  resRow.appendChild(mkSign(""));
  botRow.appendChild(mkSign(opSym, opSym === "+" ? "add" : opSym === "−" ? "sub" : "mul"));

  for (const p of order) {
    const idx = placeIndex[p];
    const tc = mkTopCell(idx < la ? da[p] : "");
    const bc = mkCell(idx < lb ? db[p] : "");
    const rc = mkCell("");
    cells.top[p] = tc; cells.bot[p] = bc; cells.res[p] = rc;
    topRow.appendChild(tc); botRow.appendChild(bc); resRow.appendChild(rc);
  }

  const line = document.createElement("div");
  line.className = "vline";
  line.style.width = ((places.length + 1) * CELLW - 8) + "px";
  vform.append(topRow, botRow, line, resRow);
  return { places, lr };
}

/* ===================== 나눗셈 판(긴 나눗셈) ===================== */
// 두 자리 ÷ 한 자리, 몫 두 자리. 셀: 몫(q1,q2) · 나누는수/나뉘는수 · 곱(p1,p2) · 나머지(r1,rem) · 내림(bring)
function renderDivForm(a, b) {
  curForm = "div";
  const da = digits(a);
  const C = (cls, txt) => `<div class="dcell ${cls}">${txt != null ? txt : ""}</div>`;
  vform.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "divform";
  wrap.innerHTML =
    `<div class="drow">${C("dlab")}${C("c-q1")}${C("c-q2")}</div>` +
    `<div class="drow dvd">${C("dvr", b)}${C("c-dt", da.t)}${C("c-do", da.o)}</div>` +
    `<div class="drow">${C("dlab")}${C("c-p1")}${C("dempty")}</div>` +
    `<div class="drow">${C("dlab")}${C("c-r1")}${C("c-bring")}</div>` +
    `<div class="drow">${C("dlab")}${C("c-p2t")}${C("c-p2o")}</div>` +
    `<div class="drow">${C("dlab")}${C("dempty")}${C("c-rem")}</div>`;
  vform.appendChild(wrap);
  divCells = {};
  ["q1", "q2", "dt", "do", "p1", "r1", "bring", "p2t", "p2o", "rem"].forEach((k) => { divCells[k] = wrap.querySelector(".c-" + k); });
}
// 나눗셈 셀에 숫자를 톡 써넣는다 (val==="" 이면 비움)
async function setDiv(cell, val) {
  if (!cell) return;
  if (val === "") { cell.textContent = ""; return; }
  cell.textContent = val;
  cell.classList.remove("pin"); void cell.offsetWidth; cell.classList.add("pin");
  Snd.place();
  await sleep(360);
}
// 정답 시 몫 칸 채우기
function divFillQuotient(q) {
  const d = digits(q);
  if (divCells.q1) divCells.q1.textContent = q >= 10 ? d.t : "";
  if (divCells.q2) divCells.q2.textContent = d.o;
}

function highlightCol(p) {
  vform.querySelectorAll(".cell.col-hi").forEach((c) => c.classList.remove("col-hi"));
  if (p && cells.top[p]) {
    [cells.top[p], cells.bot[p], cells.res[p]].forEach((c) => c.classList.add("col-hi"));
  }
}
// 곱셈: 윗수의 현재 자리 + 결과 칸 + 항상 밑의 수(b, 일의 자리)를 블록 표시
function highlightMulCol(p) {
  vform.querySelectorAll(".cell.col-hi").forEach((c) => c.classList.remove("col-hi"));
  [cells.top[p], cells.res[p], cells.bot.o].forEach((c) => c && c.classList.add("col-hi"));
}

/* ===================== 세로셈 애니메이션 조각 ===================== */

// 윗자리 숫자에 빗금을 긋고, 1 줄어든 값을 위에 적는다 (빌려줌)
async function strikeReduce(p, newVal) {
  const cell = cells.top[p];
  cell.querySelector(".d").classList.add("struck");
  const ab = cell.querySelector(".ann-above");
  ab.textContent = newVal;
  ab.classList.remove("carry");
  requestAnimationFrame(() => ab.classList.add("show"));
  await sleep(480);
}

// 아랫자리에 작은 1을 붙인다 (빌려옴 → +10)
async function borrowIn(p) {
  const b1 = cells.top[p].querySelector(".borrow1");
  b1.textContent = "1";
  Snd.magic();
  requestAnimationFrame(() => b1.classList.add("show"));
  await sleep(480);
}

// 윗 칸 위에 올림수를 적는다 (받아올림/곱셈 올림). 기본 1, 곱셈은 여러 값.
async function showCarry(p, val = 1) {
  const ab = cells.top[p].querySelector(".ann-above");
  ab.textContent = val;
  ab.classList.add("carry");
  Snd.magic();
  requestAnimationFrame(() => ab.classList.add("show"));
  await sleep(420);
}

// 결과 칸에 숫자를 톡 써넣는다
async function setResult(p, val) {
  const d = cells.res[p].querySelector(".d");
  d.textContent = val === "" ? "" : val;
  if (val !== "") {
    d.classList.remove("pin"); void d.offsetWidth; d.classList.add("pin");
    Snd.place();
  }
  await sleep(360);
}

/* ---- 수직선 + 숫자 계산 연동 (10에서 빼기) ----
   teen = 10 + r 로 가르고, 10에서 bot을 빼(m), 남은 r을 더해서 답.
   🦊는 10에서 출발 → bot칸 뒤로(빼기) → r칸 앞으로(더하기).
   d = { teen, bot, r, m, result }   (r = teen-10, m = 10-bot, result = m+r)
*/
const NL = { token: null, svg: null, calc: null, hi: 0, W: 280, pad: 20, axisY: 42, H: 96, hops: [], marks: {}, d: null };

function nlX(v) { return NL.pad + v / NL.hi * (NL.W - 2 * NL.pad); }

function nlDraw() {
  const y = NL.axisY;
  let s = `<line x1="${nlX(0)}" y1="${y}" x2="${nlX(NL.hi)}" y2="${y}" class="nl-axis"/>`;
  // 정수 눈금(작게) + 주요 눈금 라벨
  for (let v = 0; v <= NL.hi; v++) {
    const X = nlX(v);
    const labelCls = v === 0 ? "nl-zero" : v === 10 ? "nl-ten" : v === NL.hi ? "nl-teen" : NL.marks[v];
    const big = !!labelCls;
    s += `<line x1="${X}" y1="${y - (big ? 6 : 3)}" x2="${X}" y2="${y + (big ? 6 : 3)}" class="nl-tick ${big ? "big" : ""}"/>`;
    if (big) s += `<text x="${X}" y="${y + 18}" class="nl-mark ${labelCls}">${v}</text>`;
  }
  // 지나온 점프 아치(빼기는 ←, 더하기는 →) + 라벨
  for (const h of NL.hops) {
    const xa = nlX(h.from), xb = nlX(h.to), mid = (xa + xb) / 2, ht = 24;
    s += `<path d="M ${xa} ${y - 5} Q ${mid} ${y - ht} ${xb} ${y - 5}" class="nl-arc ${h.cls}"/>`;
    s += `<text x="${mid}" y="${y - ht - 1}" class="nl-jump ${h.cls}">${h.label}</text>`;
  }
  // 가르기 괄호: 0~10 = "10", 10~teen = r
  const by = y + 26;
  const brace = (x0, x1, label, cls) =>
    `<path d="M ${nlX(x0)} ${by} L ${nlX(x0)} ${by + 5} L ${nlX(x1)} ${by + 5} L ${nlX(x1)} ${by}" class="nl-brace ${cls}"/>` +
    `<text x="${nlX((x0 + x1) / 2)}" y="${by + 18}" class="nl-brace-label ${cls}">${label}</text>`;
  s += brace(0, 10, "10", "ten");
  if (NL.d.r > 0) s += brace(10, NL.hi, NL.d.r, "add");
  NL.svg.innerHTML = s;
}

// 수직선 + 계산식 판을 해당 자리(p) 아래에 그리고 🦊를 10에 놓는다
function nlInit(d, p) {
  // 수직선 보드(폭 NL.W)는 vform 정중앙에 둔다. 특정 자리(오른쪽 일의 자리)
  // 중심에 맞추면 280px 보드가 옆으로 삐져나가고, getBoundingClientRect는
  // fitApp scale이 섞여 로컬 좌표인 left/NL.W와 어긋난다. offsetWidth(로컬)로 중앙 정렬.
  const cx = vform.offsetWidth / 2;
  NL.d = d; NL.hi = d.teen; NL.hops = []; NL.marks = {};
  helper.classList.add("reserve");
  helper.innerHTML =
    `<div class="bond-wrap" style="left:${cx}px">
       <div class="bond-link"></div>
       <div class="nline" style="width:${NL.W}px">
         <div class="nl-board" style="height:${NL.H}px">
           <svg class="nl-svg" viewBox="0 0 ${NL.W} ${NL.H}" width="${NL.W}" height="${NL.H}"></svg>
           <div class="fox-token" style="left:${nlX(10) - 15}px">🦊</div>
         </div>
         <div class="nl-calc" id="nlCalc"></div>
       </div>
     </div>`;
  NL.svg = helper.querySelector(".nl-svg");
  NL.token = helper.querySelector(".fox-token");
  NL.calc = helper.querySelector("#nlCalc");
  nlDraw();
}

// 🦊가 toValue로 점프(아치). landCls=착지 눈금 색, calcHTML=함께 뜨는 계산식
async function nlHop(toValue, jumpLabel, cls, landCls, calcHTML) {
  const from = NL.hops.length ? NL.hops[NL.hops.length - 1].to : 10;
  NL.hops.push({ from, to: toValue, label: jumpLabel, cls });
  NL.marks[toValue] = landCls;
  nlDraw();
  if (NL.token) {
    NL.token.style.left = (nlX(toValue) - 15) + "px";
    NL.token.classList.remove("hop"); void NL.token.offsetWidth; NL.token.classList.add("hop");
  }
  if (calcHTML && NL.calc) {
    const div = document.createElement("div");
    div.className = "nl-cline";
    div.innerHTML = calcHTML;
    NL.calc.appendChild(div);
    requestAnimationFrame(() => div.classList.add("show"));
  }
  Snd.magic();
  await sleep(740);
}
// 받아내림 문제 동안 높이를 확보(세로셈 흔들림 방지). 내용은 비움.
function reserveHelper() { helper.classList.add("reserve"); helper.innerHTML = ""; }
// 내용만 지우고 확보 높이는 유지(칸 사이에서 세로셈이 튀지 않게)
function clearMini() { helper.innerHTML = ""; }
// 보조판 완전히 닫음(덧셈/시작/퀴즈 풀이 등)
function hideHelper() { helper.classList.remove("reserve"); helper.innerHTML = ""; }

/* ===================== 손글씨 캔버스 ===================== */
const vwrap = $("#vwrap");
const scratch = $("#scratch");
const sctx = scratch.getContext("2d");
const penTools = $("#penTools");
let tool = "pen", drawing = false, lastX = 0, lastY = 0;

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  // offsetWidth/Height는 fitApp의 scale 변환에 영향받지 않는 레이아웃 크기.
  // getBoundingClientRect를 쓰면 캔버스가 부모 scale로 한 번 더 줄어 이중 축소된다.
  const w = vwrap.offsetWidth, h = vwrap.offsetHeight;
  if (w === 0) return;
  scratch.width = Math.round(w * dpr);
  scratch.height = Math.round(h * dpr);
  scratch.style.width = w + "px";
  scratch.style.height = h + "px";
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.lineCap = "round";
  sctx.lineJoin = "round";
}
function clearScratch() {
  sctx.save();
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.restore();
}
function enableScratch(on) {
  vwrap.classList.toggle("draw", on);
  penTools.style.display = on ? "flex" : "none";
  if (on) { sizeCanvas(); }
}
function penPos(e) {
  const r = scratch.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  // 화면 좌표를 캔버스 그리기 좌표계로 변환(어떤 scale 변환이 걸려도 정확히 일치).
  const cssW = scratch.width / dpr, cssH = scratch.height / dpr;
  return {
    x: (e.clientX - r.left) / r.width * cssW,
    y: (e.clientY - r.top) / r.height * cssH,
  };
}
function strokeTo(x0, y0, x1, y1, pressure) {
  sctx.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
  sctx.strokeStyle = "#e23b6d";
  sctx.lineWidth = tool === "erase" ? 24 : 4 + (pressure > 0 ? pressure * 3 : 0);
  sctx.beginPath();
  sctx.moveTo(x0, y0);
  sctx.lineTo(x1, y1);
  sctx.stroke();
}

scratch.addEventListener("pointerdown", (e) => {
  drawing = true;
  scratch.setPointerCapture(e.pointerId);
  const p = penPos(e);
  lastX = p.x; lastY = p.y;
  strokeTo(p.x, p.y, p.x + 0.1, p.y, e.pressure); // 점 찍기
});
scratch.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = penPos(e);
  strokeTo(lastX, lastY, p.x, p.y, e.pressure);
  lastX = p.x; lastY = p.y;
});
window.addEventListener("pointerup", () => { drawing = false; });

penTools.addEventListener("click", (e) => {
  const t = e.target.dataset.tool;
  if (!t) return;
  if (t === "clear") { clearScratch(); return; }
  tool = t;
  penTools.querySelectorAll(".tool-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tool === t));
});
/* ===================== 화면 딱 맞추기 (스크롤 없이 한 화면) ===================== */
const appEl = $("#app");
let fitRAF = 0;
function fitApp() {
  appEl.style.transform = "none";          // 자연 크기 측정
  const w = appEl.offsetWidth, h = appEl.offsetHeight;
  if (!w || !h) return;
  // 가로·세로 모두 화면 안에 들어오게(둘 중 더 작은 비율). 작은 화면은 최대 1.4배까지 키움.
  const pad = 8;
  const s = Math.min((window.innerWidth - pad) / w, (window.innerHeight - pad) / h, 1.4);
  appEl.style.transform = `scale(${s})`;   // origin: top center → 가로 가운데, 세로 위 기준(잘림 없음)
  if (vwrap.classList.contains("draw")) sizeCanvas();  // 캔버스 크기 재보정
}
const scheduleFit = () => { cancelAnimationFrame(fitRAF); fitRAF = requestAnimationFrame(fitApp); };
new ResizeObserver(scheduleFit).observe(appEl);          // 내용 높이 바뀔 때마다 자동 맞춤
window.addEventListener("resize", scheduleFit);
window.addEventListener("orientationchange", () => setTimeout(fitApp, 250));

/* ===================== 효과 ===================== */
function starShower(n = 7) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const s = document.createElement("div");
      s.className = "fx-star";
      s.textContent = ["⭐", "🌟", "✨"][i % 3];
      s.style.left = 25 + Math.random() * 50 + "%";
      s.style.top = 45 + Math.random() * 20 + "%";
      fxLayer.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }, i * 90);
  }
}
function banner(text, color = "#18b56a") {
  const b = document.createElement("div");
  b.className = "fx-banner";
  b.style.color = color;
  b.textContent = text;
  fxLayer.appendChild(b);
  setTimeout(() => b.remove(), 1300);
  setMood("cheer"); // 여우 선생님이 신남
  Snd.fanfare();
}

/* ===================== 덧셈 단계 만들기 ===================== */
function buildAddSteps(a, b) {
  const steps = [];
  const da = digits(a), db = digits(b);
  const la = String(a).length, lb = String(b).length, lr = String(a + b).length;
  const width = Math.max(2, la, lb, lr);
  const places = PLACES.slice(0, width);

  // 각 자리 계산을 미리 구해둔다 (올림 전파)
  let carry = 0;
  const cols = [];
  for (const p of places) {
    const ta = placeIndex[p] < la ? da[p] : 0;
    const tb = placeIndex[p] < lb ? db[p] : 0;
    const sum = ta + tb + carry;
    cols.push({ p, ta, tb, cIn: carry, sum, digit: sum % 10, cOut: sum >= 10 ? 1 : 0 });
    carry = sum >= 10 ? 1 : 0;
  }

  steps.push(async () => {
    hideHelper();
    renderVForm(a, b, "+");
    highlightCol(null);
    say(`<b>${a} + ${b}</b> 를 세로셈으로! 일의 자리부터 더해요. ✏️`);
  });

  for (const col of cols) {
    const name = KIND_NAME[col.p];
    steps.push(async () => {
      highlightCol(col.p);
      await setResult(col.p, col.digit);
      const eq = `${col.ta} + ${col.tb}${col.cIn ? ` + ${col.cIn}(올림)` : ""} = <b>${col.sum}</b>`;
      if (col.cOut) {
        const up = PARENT[col.p];
        if (up) await showCarry(up);
        say(`${name}의 자리: ${eq}. 10이 넘으니 <span class="pop-word">1을 윗자리로 올려요!</span>`);
      } else {
        say(`${name}의 자리: ${eq}`);
      }
    });
  }

  steps.push(async () => {
    highlightCol(null);
    const res = a + b;
    say(`다 더했어요! 정답은 <b>${res}</b> 🎉`);
    banner(`${res}`, "#ff6b9d");
    starShower(6);
  });

  return steps;
}

/* ===================== 곱셈 단계 만들기 (두/세 자리 × 한 자리) ===================== */
function buildMulSteps(a, b) {
  const steps = [];
  const da = digits(a);
  const la = String(a).length, lr = String(a * b).length;
  const width = Math.max(2, la, lr);
  const places = PLACES.slice(0, width);

  // 자리별 곱 + 올림 전파 미리 계산
  let carry = 0;
  const cols = [];
  for (const p of places) {
    const ap = placeIndex[p] < la ? da[p] : 0;
    const prod = ap * b + carry;
    cols.push({ p, ap, hasTop: placeIndex[p] < la, cIn: carry, prod, digit: prod % 10, cOut: Math.floor(prod / 10) });
    carry = Math.floor(prod / 10);
  }

  steps.push(async () => {
    hideHelper();
    renderVForm(a, b, "×");
    highlightCol(null);
    say(`<b>${a} × ${b}</b> 를 세로셈으로! 일의 자리부터 곱해요. ✏️`);
  });

  for (const col of cols) {
    const name = KIND_NAME[col.p];
    const up = PARENT[col.p];

    if (!col.hasTop) {  // 윗수가 없는 자리 — 남은 올림만 내려 적기
      steps.push(async () => {
        highlightMulCol(col.p);
        await setResult(col.p, col.digit);
        say(`${name}의 자리엔 곱할 숫자가 없어요. 남은 올림 <b>${col.cIn}</b>을 그대로 내려 써요. 🎉`);
      });
      continue;
    }

    const base = col.ap * b;
    // 1) 곱하기
    steps.push(async () => {
      highlightMulCol(col.p);
      say(`${name}의 자리예요. 먼저 곱해요: <b>${col.ap} × ${b} = ${base}</b> ✏️`);
    });
    // 2) 올림 더하기 (아래에서 올라온 올림이 있을 때만)
    if (col.cIn) {
      steps.push(async () => {
        highlightMulCol(col.p);
        say(`아래에서 올라온 올림 <b>${col.cIn}</b>을 더해요: <b>${base} + ${col.cIn} = ${col.prod}</b>`);
      });
    }
    // 3) 결과의 일의 자리 쓰기
    steps.push(async () => {
      highlightMulCol(col.p);
      await setResult(col.p, col.digit);
      say(`<b>${col.prod}</b>에서 일의 자리 <b>${col.digit}</b>을 ${name}의 자리 결과에 써요.`);
    });
    // 4) 올림 올리기 (10 이상일 때)
    if (col.cOut) {
      steps.push(async () => {
        if (up) await showCarry(up, col.cOut);
        say(`<b>${col.prod}</b>은 10이 넘어요. 십의 자리 <b>${col.cOut}</b>을 <span class="pop-word">윗자리로 올려요!</span> ⬆️`);
      });
    }
  }

  steps.push(async () => {
    highlightCol(null);
    const res = a * b;
    say(`다 곱했어요! 정답은 <b>${res}</b> 🎉`);
    banner(`${res}`, "#2aa7a0");
    starShower(6);
  });

  return steps;
}

/* ===================== 나눗셈 단계 만들기 (긴 나눗셈, 두 자리 ÷ 한 자리) ===================== */
function buildDivSteps(a, b) {
  const steps = [];
  const da = digits(a), aT = da.t, aO = da.o;
  const q1 = Math.floor(aT / b), r1 = aT - q1 * b, p1 = q1 * b;
  const mid = r1 * 10 + aO, q2 = Math.floor(mid / b), p2 = q2 * b, rem = mid - p2;
  const quotient = q1 * 10 + q2;

  steps.push(async () => {
    hideHelper();
    renderDivForm(a, b);
    say(`<b>${a} ÷ ${b}</b> 를 세로셈으로! 큰 자리(십의 자리)부터 하나씩 나눠요. ✏️`);
  });
  // 몫 십의 자리: ① 몇 번 들어가는지 가늠 ② 몫 쓰기
  steps.push(async () => {
    say(`먼저 십의 자리 <b>${aT}</b>를 <b>${b}</b>로 나눠요. <b>${b}</b>를 몇 번 곱하면 <b>${aT}</b>를 넘지 않을까요? 🤔`);
  });
  steps.push(async () => {
    await setDiv(divCells.q1, q1);
    say(`<b>${b} × ${q1} = ${p1}</b> 로 <b>${aT}</b>를 넘지 않아요(${q1 + 1}번이면 넘쳐요). 그래서 몫 십의 자리는 <span class="pop-word">${q1}</span>! ✨`);
  });
  steps.push(async () => {
    await setDiv(divCells.p1, p1);
    say(`그 <b>${p1}</b>(=${b}×${q1})을 <b>${aT}</b> 바로 아래에 적어요.`);
  });
  steps.push(async () => {
    divCells.p1.classList.add("uline");
    await setDiv(divCells.r1, r1);
    say(`이제 빼요: <b>${aT} − ${p1} = ${r1}</b>. 남은 건 <b>${r1}</b>이에요.`);
  });
  steps.push(async () => {
    await setDiv(divCells.bring, aO);
    say(`아직 일의 자리 <b>${aO}</b>이 남았어요. 아래로 내려와요 → <b>${r1}</b> 옆에 붙여 <b>${mid}</b>! 🔽`);
  });
  // 몫 일의 자리: ① 가늠 ② 몫 쓰기
  steps.push(async () => {
    say(`이번엔 <b>${mid}</b>를 <b>${b}</b>로 나눠요. <b>${b}</b>를 몇 번 곱하면 <b>${mid}</b>가 될까요? 🤔`);
  });
  steps.push(async () => {
    await setDiv(divCells.q2, q2);
    say(`<b>${b} × ${q2} = ${p2}</b> 예요. 몫 일의 자리는 <span class="pop-word">${q2}</span>! ✨`);
  });
  steps.push(async () => {
    await setDiv(divCells.p2t, p2 >= 10 ? Math.floor(p2 / 10) : "");
    await setDiv(divCells.p2o, p2 % 10);
    say(`그 <b>${p2}</b>(=${b}×${q2})을 <b>${mid}</b> 아래에 적어요.`);
  });
  steps.push(async () => {
    divCells.p2t.classList.add("uline"); divCells.p2o.classList.add("uline");
    await setDiv(divCells.rem, rem);
    say(`마지막으로 빼요: <b>${mid} − ${p2} = ${rem}</b>. 딱 나누어떨어졌어요! 몫은 <b>${quotient}</b> 🎉`);
    banner(`${quotient}`, "#8a5cf6");
    starShower(6);
  });
  return steps;
}

/* ===================== 뺄셈 단계 만들기 ===================== */
function buildSubSteps(a, b) {
  const steps = [];
  const db = digits(b);
  const lb = String(b).length, lr = String(a - b).length;
  const width = Math.max(2, String(a).length);
  const places = PLACES.slice(0, width);

  // ---- 미리 계산: 받아내림 체인과 가르기 값 ----
  const work = digits(a);
  function planBorrow(place, ops) {
    const up = PARENT[place];
    if (work[up] === 0) planBorrow(up, ops);   // 윗자리가 0이면 먼저 빌려옴
    ops.push({ kind: "reduce", place: up, val: work[up] - 1 });
    work[up] -= 1;
    ops.push({ kind: "borrowIn", place });
    work[place] += 10;
  }
  const plan = [];
  for (const p of places) {
    const bot = placeIndex[p] < lb ? db[p] : 0;
    const before = work[p];
    if (before < bot) {
      const ops = [];
      planBorrow(p, ops);
      const teen = work[p];        // 예: 12
      const result = teen - bot;   // 예: 5
      work[p] = result;
      plan.push({ p, bot, borrow: true, ops, teen, result });
    } else {
      work[p] = before - bot;
      plan.push({ p, bot, borrow: false, before, result: before - bot });
    }
  }

  const hasBorrow = plan.some((c) => c.borrow);

  // ---- 단계 만들기 ----
  steps.push(async () => {
    renderVForm(a, b, "−");
    highlightCol(null);
    if (hasBorrow) reserveHelper(); else hideHelper();
    say(`<b>${a} − ${b}</b> 를 세로셈으로! 일의 자리부터 빼요. ✏️`);
  });

  for (const col of plan) {
    const p = col.p, name = KIND_NAME[p];
    const showVal = placeIndex[p] < lr ? col.result : ""; // 결과 맨 앞 0은 비움

    // 1) 살펴보기
    steps.push(async () => {
      clearMini();
      highlightCol(p);
      setMood("think");
      if (!col.borrow) {
        say(col.bot === 0
          ? `${name}의 자리: 뺄 게 없어요. 그대로 내려와요.`
          : `${name}의 자리: <b>${col.before} − ${col.bot}</b>, 바로 뺄 수 있어요. 👍`);
      } else {
        say(`${name}의 자리에서 <b>${col.bot}</b>을(를) 빼야 하는데 모자라요. ` +
            `${KIND_NAME[PARENT[p]]}의 자리에서 <span class="pop-word">10을 빌려와요!</span> 💡`);
      }
    });

    if (!col.borrow) {
      // 2) 그대로 빼기
      steps.push(async () => {
        highlightCol(p);
        await setResult(p, showVal);
        say(`${name}의 자리: <b>${col.before} − ${col.bot} = ${col.result}</b>`);
      });
      continue;
    }

    // 2) 받아내림 애니메이션 (필요하면 연쇄) → teen 이 됨
    steps.push(async () => {
      highlightCol(p);
      for (const op of col.ops) {
        if (op.kind === "reduce") await strikeReduce(op.place, op.val);
        else await borrowIn(op.place);
      }
      say(`빌려왔어요! ${name}의 자리는 <b>${col.teen}</b>이 됐어요. ` +
          `이제 <span class="hl-ten">10에서 빼기</span>로 풀어볼까요? 🤔`);
    });

    // "10에서 빼기": r=남는 부분, m=10−bot, result=m+r
    const r = col.teen - 10;        // 10을 뺀 나머지(원래 일의 자리)
    const m = 10 - col.bot;         // 10에서 bot을 뺀 값
    const d = { teen: col.teen, bot: col.bot, r, m, result: col.result };

    // 3) 수직선 등장 — 🦊는 10에서 출발, 가르기 괄호(10 | r) 표시
    steps.push(async () => {
      highlightCol(p);
      nlInit(d, p);
      if (r > 0) {
        say(`<b>${col.teen}</b>은 <span class="hl-ten">10</span>과 <span class="hl-r">${r}</span>로 나눠요. ` +
            `🦊는 <span class="hl-ten">10</span>에서 출발해요!`);
      } else {
        say(`<b>${col.teen}</b>은 딱 <span class="hl-ten">10</span>이에요. 🦊가 <span class="hl-ten">10</span>에서 출발!`);
      }
    });

    // 4) 10에서 bot 빼기 — 🦊 뒤로 점프 + 계산식
    steps.push(async () => {
      await nlHop(m, `−${col.bot}`, "is-sub", "nl-mid",
        `<span class="hl-ten">10</span> − <b>${col.bot}</b> = <b class="hl-mid">${m}</b>`);
      say(`<span class="hl-ten">10</span>에서 <b>${col.bot}</b>을(를) 빼요. 🦊가 <b>${col.bot}칸</b> 뒤로! ` +
          `<b>10 − ${col.bot} = ${m}</b>`);
      if (r === 0) { await setResult(p, showVal); say(`<b>10 − ${col.bot} = ${col.result}</b>. 도착! 🎉`); }
    });

    // 5) 남은 r 더하기 — 🦊 앞으로 점프 + 계산식 (r>0일 때만)
    if (r > 0) {
      steps.push(async () => {
        await nlHop(col.result, `+${r}`, "is-add", "nl-res",
          `<b class="hl-mid">${m}</b> + <span class="hl-r">${r}</span> = <b class="hl-res">${col.result}</b>`);
        await setResult(p, showVal);
        say(`이제 남은 <span class="hl-r">${r}</span>을(를) 더해요. 🦊가 <b>${r}칸</b> 앞으로! ` +
            `<b>${m} + ${r} = ${col.result}</b>. 도착! 🎉`);
      });
    }
  }

  steps.push(async () => {
    clearMini();
    highlightCol(null);
    const res = a - b;
    say(`다 풀었어요! 정답은 <b>${res}</b> 🎉`);
    banner(`${res}`, "#6c5ce7");
    starShower(6);
  });

  return steps;
}

/* ===================== 학습 모드 진행 ===================== */
// 연산별 분기 헬퍼
const OP_SYM = { add: "+", sub: "−", mul: "×" };
const OP_ICON = { add: "➕", sub: "➖", mul: "✖️", div: "➗" };
const OP_NAME = { add: "덧셈", sub: "뺄셈", mul: "곱셈", div: "나눗셈" };
const OP_BTN = { add: "", sub: "purple", mul: "teal", div: "violet" };
function buildSteps(a, b) {
  return state.op === "add" ? buildAddSteps(a, b)
    : state.op === "sub" ? buildSubSteps(a, b)
    : state.op === "mul" ? buildMulSteps(a, b)
    : buildDivSteps(a, b);
}
function renderForm(a, b) {
  if (state.op === "div") renderDivForm(a, b);
  else renderVForm(a, b, OP_SYM[state.op]);
}
function answerOf(a, b) {
  return state.op === "add" ? a + b : state.op === "sub" ? a - b : state.op === "mul" ? a * b : Math.floor(a / b);
}

function startLearn() {
  state.ctx = "quiz";
  advBoardColEl.style.display = "none"; stageScreen.classList.remove("adv-full");   // 모험 보드 숨김
  stageTitle.textContent = `${OP_ICON[state.op]} ${OP_NAME[state.op]} 배우기`;
  const { a, b } = makeProblem(true);
  const steps = buildSteps(a, b);
  let idx = 0;
  const bc = OP_BTN[state.op];

  hideHelper();
  setMood("");
  showLevelCtrl(false);
  renderForm(a, b);
  say("한 칸씩 따라가 봐요. 버튼을 눌러요!");

  controlsEl.innerHTML = `<button class="big-btn ${bc}" id="nextBtn">시작하기 ▶</button>`;
  const nextBtn = $("#nextBtn");

  nextBtn.onclick = async () => {
    nextBtn.disabled = true;
    Snd.step();
    await steps[idx]();
    idx++;
    if (idx < steps.length) {
      nextBtn.textContent = "다음 ▶";
      nextBtn.disabled = false;
    } else {
      controlsEl.innerHTML = `<button class="big-btn ${bc}" id="againBtn">다른 문제로 한 번 더 🔁</button>`;
      $("#againBtn").onclick = startLearn;
    }
  };

  show(stageScreen);
  enableScratch(true);  // 배우기에서도 마우스·펜으로 직접 써볼 수 있게
  clearScratch();
}

/* ===================== 문제 만들기 ===================== */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 레벨별 난이도:
//  L1 두 자리(받아올림/내림 가끔)  L2 두 자리(항상)
//  L3 세 자리                      L4 세 자리(큰 수, 항상)
// forceEvent=true(학습) 또는 L2/L4면 받아올림/내림이 꼭 일어나는 문제를 고른다
function makeProblem(forceEvent = false) {
  const lv = level();
  const threeDigit = lv >= 3;
  const mustEvent = forceEvent || lv === 2 || lv === 4;
  if (state.op === "mul") {  // (두/세 자리) × (한 자리)
    for (let t = 0; t < 80; t++) {
      const a = threeDigit ? rand(112, 989) : rand(13, 98);
      const b = rand(2, 9);
      if (!mustEvent || (a % 10) * b >= 10) return { a, b };  // 일의 자리에서 올림 발생
    }
    return { a: 24, b: 3 };
  }
  if (state.op === "div") {  // (두 자리) ÷ (한 자리), 나누어떨어짐, 몫 두 자리
    const bmax = lv >= 3 ? 9 : lv === 2 ? 6 : 4;
    let best = null;
    for (let t = 0; t < 80; t++) {
      const b = rand(2, bmax);
      const qmax = Math.floor(99 / b);
      if (qmax < 10) continue;
      const a = rand(10, qmax) * b;   // a=몫×나누는수 → 나누어떨어지고 a≥10b라 십의자리≥b 보장
      best = { a, b };
      if (a % 10 !== 0) return { a, b };  // 일의 자리 0 아닌 더 또렷한 문제 우선
    }
    return best || { a: 72, b: 3 };
  }
  if (state.op === "add") {
    for (let t = 0; t < 80; t++) {
      const a = lv === 4 ? rand(305, 879) : threeDigit ? rand(105, 489) : rand(15, 79);
      const b = lv === 4 ? rand(305, 879) : threeDigit ? rand(105, 489) : rand(15, 79);
      if (!mustEvent || (a % 10) + (b % 10) >= 10) return { a, b };
    }
    return { a: 47, b: 28 };
  } else {
    for (let t = 0; t < 80; t++) {
      const a = lv === 4 ? rand(305, 899) : threeDigit ? rand(210, 899) : rand(23, 99);
      const b = lv === 4 ? rand(108, a - 1) : threeDigit ? rand(105, a - 1) : rand(14, a - 1);
      if (!mustEvent || (a % 10) < (b % 10)) return { a, b };
    }
    return { a: 34, b: 19 };
  }
}

/* ===================== 퀴즈 모드 ===================== */
let quiz = { a: 0, b: 0, answer: 0 };

function startQuiz() {
  state.ctx = "quiz";
  advBoardColEl.style.display = "none"; stageScreen.classList.remove("adv-full");   // 모험 보드 숨김
  stageTitle.textContent = `${OP_ICON[state.op]} ${OP_NAME[state.op]} 도전!`;
  showLevelCtrl(true);  // 도전에서 레벨 −/+ 노출
  show(stageScreen);   // 먼저 화면을 보여야 캔버스 크기를 잴 수 있음
  nextQuestion();
}

function nextQuestion() {
  if (state.ctx === "village") state.op = Math.random() < 0.5 ? "add" : "sub"; // 마을: 덧셈·뺄셈 섞기
  if (state.ctx === "adventure") {            // 모험: 스테이지별 연산·난이도
    const ops = advOps();
    state.op = ops[Math.floor(Math.random() * ops.length)];
    state.level = advLevel();
    stageTitle.textContent = `🗺️ ${advTheme().name} · 스테이지 ${state.advStage}`;
  }
  const { a, b } = makeProblem(false);
  quiz = { a, b, answer: answerOf(a, b) };

  hideHelper();
  setMood("");
  renderForm(a, b);
  // 도전(모험 제외)에서는 손으로 풀 넓은 펜 패드를 켠다
  vwrap.classList.toggle("pen-lg", state.ctx !== "adventure");
  enableScratch(true);  // 펜으로 직접 풀어볼 수 있게
  clearScratch();
  say(`${callName()}펜으로 직접 풀어봐요! 어려우면 <b>풀이 보기</b>를 눌러요. ✏️`);
  updateScoreUI();
  renderQuizControls();
}

// 퀴즈 입력 UI(키패드 + 풀이 보기)를 그린다. 힌트 후 복귀에도 재사용.
function renderQuizControls() {
  controlsEl.innerHTML = `
    <button class="hint-btn" id="hintBtn">🔍 막히면 풀이 보기</button>
    <div class="quiz-input">
      <input id="answerInput" type="text" inputmode="numeric" readonly placeholder="?" />
    </div>
    <div class="keypad" id="keypad">
      ${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
      <button class="del" data-k="del">⌫</button>
      <button data-k="0">0</button>
      <button class="ok" data-k="ok">확인</button>
    </div>
    <div class="feedback" id="feedback"></div>
  `;
  const input = $("#answerInput");
  $("#keypad").onclick = (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    if (k === "del") input.value = input.value.slice(0, -1);
    else if (k === "ok") checkAnswer();
    else if (input.value.length < 4) input.value += k;
  };
  $("#hintBtn").onclick = showHint;
}

function fillResult(value) {
  if (curForm === "div") { divFillQuotient(value); return; }
  const d = digits(value), lr = String(value).length;
  for (const p of PLACES) {
    if (cells.res[p]) {
      cells.res[p].querySelector(".d").textContent = placeIndex[p] < lr ? d[p] : "";
    }
  }
}

function checkAnswer() {
  const input = $("#answerInput");
  const fb = $("#feedback");
  const val = parseInt(input.value, 10);
  if (isNaN(val)) { fb.textContent = "숫자를 눌러봐요!"; fb.className = "feedback bad"; return; }

  if (val === quiz.answer) {
    fillResult(quiz.answer);
    Snd.correct();
    starShower(7);
    setMood("happy");
    if (state.ctx === "adventure") {          // 모험: 코인 적립 + 보드로 돌아가 주사위 굴리기
      const reward = 1 + state.level;         // 정답마다 코인
      state.coins += reward;
      saveDress();
      updateScoreUI();
      fb.innerHTML = `${callName()}정답! 🪙+${reward} · 주사위를 굴려요! 🎲`;
      fb.className = "feedback good";
      $("#keypad").style.pointerEvents = "none";
      $("#hintBtn").style.visibility = "hidden";   // display:none이면 풀이판 높이가 줄어 화면이 출렁임
      setTimeout(advReturnAdvance, 1100);
      return;
    }
    if (state.ctx === "village") {            // 마을: 별 대신 코인 보상
      const reward = 2 + state.level;
      state.coins += reward;
      saveDress();
      updateScoreUI();
      Snd.coin();
      say(`정답이에요! 🪙 코인 <b>${reward}</b>개를 모았어요! 꾸미러 가요 🎨`);
      earnDone(reward);
      return;
    }
    fb.textContent = `${callName()}정답이에요! 🎉`;
    fb.className = "feedback good";
    state.stars += 1;
    state.correctCount += 1;
    let leveledUp = false;
    if (state.correctCount % 5 === 0 && state.level < MAX_LEVEL) { state.level++; leveledUp = true; }
    updateScoreUI();
    if (leveledUp) banner(`레벨 ${state.level}! 🚀`, "#ff9f43");
    $("#keypad").style.pointerEvents = "none";
    $("#hintBtn").style.visibility = "hidden";
    setTimeout(nextQuestion, leveledUp ? 1700 : 1100);
  } else {
    fb.textContent = `${callName()}조금 달라요. 다시 해볼까? 💪`;
    fb.className = "feedback bad";
    Snd.wrong();
    setMood("oops");
    input.value = "";
  }
}

// 퀴즈 힌트: 풀이를 '다음 ▶' 버튼으로 한 단계씩 직접 넘기며 본다(따라갈 수 있게).
function showHint() {
  clearScratch();
  enableScratch(false);                 // 힌트 동안엔 펜 끔(애니메이션 보이게)
  const bc = OP_BTN[state.op];
  const steps = buildSteps(quiz.a, quiz.b);
  let idx = 0;

  controlsEl.innerHTML = `<button class="big-btn ${bc}" id="hintNext">시작 ▶</button>`;
  const btn = $("#hintNext");

  btn.onclick = async () => {
    btn.disabled = true;
    Snd.step();
    await steps[idx]();
    idx++;
    if (idx < steps.length) {
      btn.textContent = "다음 ▶";
      btn.disabled = false;
    } else {
      controlsEl.innerHTML = `<button class="big-btn ${bc}" id="hintDone">직접 풀어보기 ✏️</button>`;
      $("#hintDone").onclick = () => {
        hideHelper();
        renderForm(quiz.a, quiz.b);
        enableScratch(true);
        say("풀이를 봤어요! 이제 직접 답을 적어봐요. ✏️");
        renderQuizControls();
      };
    }
  };
}

function updateScoreUI() {
  scoreStarsEl.textContent = (state.ctx === "village" || state.ctx === "adventure") ? `🪙 ${state.coins}` : `⭐ ${state.stars}`;
  levelTagEl.textContent = `레벨 ${level()}`;
}

// 도전 모드에서만 레벨 −/+ 버튼을 보인다
function showLevelCtrl(on) {
  ["#lvDown", "#lvUp"].forEach((s) => {
    const b = document.querySelector(s);
    if (b) b.style.display = on ? "inline-flex" : "none";
  });
}
// 레벨을 직접 조절(1~MAX). 도전 중이면 바뀐 난이도로 새 문제를 낸다.
function setLevel(lv) {
  state.level = Math.max(1, Math.min(MAX_LEVEL, lv));
  updateScoreUI();
  if (state.mode === "quiz") nextQuestion();
}

/* ===================== 캐릭터 꾸미기 ===================== */
const shopRowEl = $("#shopRow");
const villageSpeechEl = $("#villageSpeech");
const charViewEl = $("#charView");
const charPickEl = $("#charPick");

function loadDress() {
  const first = CHAR_META[0].key;
  state.coins = parseInt(localStorage.getItem("mg_coins") || "0", 10) || 0;
  try { state.unlocked = JSON.parse(localStorage.getItem("mg_unlocked")) || []; } catch (e) { state.unlocked = []; }
  try { state.owned = JSON.parse(localStorage.getItem("mg_owned")) || []; } catch (e) { state.owned = []; }
  try { state.ownedItems = JSON.parse(localStorage.getItem("mg_items")) || []; } catch (e) { state.ownedItems = []; }
  if (!Array.isArray(state.ownedItems)) state.ownedItems = [];
  try { state.equip = JSON.parse(localStorage.getItem("mg_equip")) || {}; } catch (e) { state.equip = {}; }
  if (!Array.isArray(state.unlocked)) state.unlocked = [];
  state.unlocked = state.unlocked.filter((k) => CHAR_ART[k]);                 // 옛 캐릭터 키 제거
  if (!Array.isArray(state.owned)) state.owned = [];
  state.owned = state.owned.filter((k) => BGS.some((b) => b.key === k));      // 옛 아이템 키 제거
  CHAR_META.forEach((c) => { if (c.cost === 0 && !state.unlocked.includes(c.key)) state.unlocked.push(c.key); });
  state.curChar = localStorage.getItem("mg_char") || first;
  if (!CHAR_ART[state.curChar] || !state.unlocked.includes(state.curChar)) state.curChar = first;
  state.advStage = parseInt(localStorage.getItem("mg_adv_stage") || "1", 10) || 1;
  state.advPos = parseInt(localStorage.getItem("mg_adv_pos") || "0", 10) || 0;
}
function saveDress() {
  localStorage.setItem("mg_coins", String(state.coins));
  localStorage.setItem("mg_unlocked", JSON.stringify(state.unlocked));
  localStorage.setItem("mg_owned", JSON.stringify(state.owned));
  localStorage.setItem("mg_items", JSON.stringify(state.ownedItems));
  localStorage.setItem("mg_equip", JSON.stringify(state.equip));
  localStorage.setItem("mg_char", state.curChar);
  localStorage.setItem("mg_adv_stage", String(state.advStage));
  localStorage.setItem("mg_adv_pos", String(state.advPos));
}

function guideSay(html) { villageSpeechEl.innerHTML = html; }

function updateCoinUI() {
  const c = $("#coinTag"); if (c) c.textContent = `🪙 ${state.coins}`;
  const n = $("#villageCount"); if (n) n.textContent = `🦊 ${state.unlocked.length}/${CHAR_META.length}`;
}

// 캐릭터 = 추출한 벡터 일러스트(고유 viewBox). 배경은 카드 색으로 적용.
function charInner(key) { return `<svg viewBox="${CHAR_VB[key]}" class="cv" preserveAspectRatio="xMidYMid meet">${CHAR_ART[key]}</svg>`; }

// 주변 파티클(떨어지는 하트비/별가루·떠오르는 음표·반짝임) HTML
function auraHTML(it) {
  const n = it.fx === "twinkle" ? 8 : 7;
  let s = `<span class="char-aura ${it.cls}">`;
  for (let i = 0; i < n; i++) {
    const left = (4 + (i * 92 / n) + Math.random() * 8).toFixed(0);
    const top = it.fx === "twinkle" ? `top:${(10 + Math.random() * 75).toFixed(0)}%;` : "";
    const delay = (Math.random() * 2.4).toFixed(2);
    const dur = (it.fx === "twinkle" ? 1 + Math.random() * 0.8 : 2.4 + Math.random() * 1.4).toFixed(2);
    const sc = (0.7 + Math.random() * 0.6).toFixed(2);
    s += `<span class="p" style="left:${left}%;${top}animation-delay:${delay}s;animation-duration:${dur}s;font-size:${sc}em">${it.emoji}</span>`;
  }
  return s + `</span>`;
}
function renderCharView() {
  const eq = state.equip[state.curChar] || {};
  const head = itemOf(eq.head), aura = itemOf(eq.aura);
  let fx = "";
  if (aura) fx += auraHTML(aura);
  if (head) fx += `<span class="char-fx head ${head.cls}">${head.emoji}</span>`;
  charViewEl.innerHTML = charInner(state.curChar) + fx;
  charViewEl.style.background = bgColor(eq.bg);
}

function renderCharPick() {
  charPickEl.innerHTML = "";
  CHAR_META.forEach((c) => {
    const unlocked = state.unlocked.includes(c.key);
    const b = document.createElement("button");
    b.className = "pick-item" + (state.curChar === c.key ? " cur" : "") + (unlocked ? "" : " locked");
    b.innerHTML =
      `<span class="pick-thumb">${charInner(c.key)}</span>` +
      `<span class="pick-name">${c.name}</span>` +
      (unlocked ? "" : `<span class="pick-cost">🪙${c.cost}</span>`);
    b.onclick = () => onPickChar(c);
    charPickEl.appendChild(b);
  });
}
function renderShopTabs() {
  const el = $("#shopTabs"); if (!el) return;
  const tabs = [["bg", "🎨 배경"], ["item", "✨ 아이템"]];
  el.innerHTML = tabs.map(([k, label]) =>
    `<button class="shop-tab${state.shopTab === k ? " on" : ""}" data-tab="${k}">${label}</button>`).join("");
  el.querySelectorAll(".shop-tab").forEach((b) =>
    b.onclick = () => { state.shopTab = b.dataset.tab; renderShopTabs(); renderShop(); updateShopTitle(); });
}
function updateShopTitle() {
  const t = $(".shop-title");
  if (t) t.textContent = state.shopTab === "item" ? "✨ 아이템 — 캐릭터를 꾸며요 (다시 누르면 벗기)" : "🎨 배경 색 — 코인으로 바꿔요";
}
function renderItemShop() {
  const eq = state.equip[state.curChar] || {};
  ITEMS.forEach((it) => {
    const owned = state.ownedItems.includes(it.key);
    const worn = eq[it.slot] === it.key;
    const affordable = owned || state.coins >= it.cost;
    const b = document.createElement("button");
    b.className = "shop-item" + (worn ? " picked" : "") + (affordable ? "" : " locked");
    b.innerHTML =
      `<span class="item-slot">${it.slot === "head" ? "머리" : "주변"}</span>` +
      `<span class="item-emoji">${it.emoji}</span>` +
      `<span class="shop-name">${it.name}</span>` +
      `<span class="shop-cost">${owned ? (worn ? "착용 ✓" : "보유") : "🪙" + it.cost}</span>`;
    b.onclick = () => onPickItem(it);
    shopRowEl.appendChild(b);
  });
}
function renderShop() {
  shopRowEl.innerHTML = "";
  if (state.shopTab === "item") { renderItemShop(); return; }
  const eq = state.equip[state.curChar] || {};
  const curBg = eq.bg || "cream";
  BGS.forEach((bg) => {
    const owned = state.owned.includes(bg.key) || bg.cost === 0;
    const worn = curBg === bg.key;
    const affordable = owned || state.coins >= bg.cost;
    const b = document.createElement("button");
    b.className = "shop-item" + (worn ? " picked" : "") + (affordable ? "" : " locked");
    b.innerHTML =
      `<span class="bg-swatch" style="background:${bg.color}"></span>` +
      `<span class="shop-name">${bg.name}</span>` +
      `<span class="shop-cost">${owned ? (worn ? "선택 ✓" : "보유") : "🪙" + bg.cost}</span>`;
    b.onclick = () => onPickBg(bg);
    shopRowEl.appendChild(b);
  });
}
function renderDress() {
  updateCoinUI();
  renderCharView();
  renderCharPick();
  renderShopTabs();
  renderShop();
  updateShopTitle();
}
function onPickItem(it) {
  const eq = state.equip[state.curChar] = state.equip[state.curChar] || {};
  if (!state.ownedItems.includes(it.key)) {
    if (state.coins < it.cost) { guideSay(`<b>${it.name}</b>은(는) 🪙${it.cost}이 필요해요! 모험에서 코인을 모아요 🗺️`); Snd.wrong(); return; }
    state.coins -= it.cost; state.ownedItems.push(it.key); Snd.buy(); banner(`${it.emoji} ${it.name} 획득!`, "#ff7aa2");
  } else { Snd.step(); }
  eq[it.slot] = (eq[it.slot] === it.key) ? null : it.key;   // 슬롯별 착용/벗기(머리·주변 동시 가능)
  guideSay(eq[it.slot] ? `${it.emoji} <b>${it.name}</b>를 달았어요!` : `${it.name}를 벗었어요.`);
  saveDress();
  renderDress();
}

function openDressup() {
  state.mode = "village";
  state.ctx = "village";
  renderDress();
  guideSay("🪙 코인으로 친구를 데려오고 배경도 꾸며요! 더 모으려면 <b>모험으로 돌아가</b> 문제를 풀어요! 🗺️");
  show(villageScreen);
}

function onPickChar(c) {
  if (!state.unlocked.includes(c.key)) {
    if (state.coins < c.cost) { guideSay(`<b>${c.name}</b>은(는) 🪙${c.cost}이 필요해요. 문제를 더 풀어요! ✏️`); Snd.wrong(); return; }
    state.coins -= c.cost;
    state.unlocked.push(c.key);
    Snd.buy(); banner(`${c.name} 등장! 🎉`, "#ff9f43");
    guideSay(`<b>${c.name}</b>을(를) 데려왔어요! 🎉`);
  } else {
    Snd.step();
  }
  state.curChar = c.key;
  saveDress();
  renderDress();
}
function onPickBg(bg) {
  const eq = state.equip[state.curChar] = state.equip[state.curChar] || {};
  if (!state.owned.includes(bg.key) && bg.cost > 0) {
    if (state.coins < bg.cost) { guideSay(`<b>${bg.name}</b> 배경은 🪙${bg.cost}이 필요해요. 문제를 더 풀어요! ✏️`); Snd.wrong(); return; }
    state.coins -= bg.cost;
    state.owned.push(bg.key);
    Snd.buy();
  } else {
    Snd.step();
  }
  eq.bg = bg.key;
  guideSay(`<b>${bg.name}</b> 배경으로 바꿨어요! 🎨`);
  saveDress();
  renderDress();
}

// 정답 후: 보상 표시 + '한 문제 더 / 꾸미러 가기' (마을 퀴즈 잔재 — 현재 미사용)
function earnDone(reward) {
  const kp = $("#keypad"); if (kp) kp.style.pointerEvents = "none";
  controlsEl.innerHTML =
    `<div class="coin-reward">+${reward} 🪙</div>
     <div class="earn-actions">
       <button class="big-btn" id="moreBtn">한 문제 더 ✏️</button>
       <button class="big-btn green" id="toVillageBtn">🎨 꾸미러 가기</button>
     </div>`;
  $("#moreBtn").onclick = nextQuestion;
  $("#toVillageBtn").onclick = openDressup;
}

/* ===================== 친구 모험(보드 게임) ===================== */
const advBoardEl = $("#advBoard");
const advSpeechEl = $("#advSpeech");
const advBoardColEl = $("#advBoardCol");
const advActionsEl = $("#advActions");

// 보드 길이 = 무작위 생성된 길 박스 수. 스테이지마다 새 맵.
const advSteps = () => (state.advMap ? state.advMap.path.length - 1 : 0);
const advLevel = () => Math.min(MAX_LEVEL, 1 + Math.floor((state.advStage - 1) / 2));
const advOps = () =>
  state.advStage >= 5 ? ["add", "sub", "mul", "div"]
  : state.advStage >= 3 ? ["add", "sub", "mul"]
  : ["add", "sub"];
const charName = (key) => { const m = CHAR_META.find((c) => c.key === key); return m ? m.name : "친구"; };

/* === 박스 타일 맵 모험 (스테이지마다 무작위 생성) ===
   격자의 모든 칸이 박스. 길 박스 한 칸 = 주사위 한 칸. 맵은 스테이지마다 랜덤. */
const ADV_GW = 9, ADV_GH = 6, ADV_CELL = 120;
const ADV_VBW = ADV_GW * ADV_CELL, ADV_VBH = ADV_GH * ADV_CELL;
const ADV_MARGIN = 46;   // 격자 둘레 여백(가장자리 박스·장식이 잘리지 않게)
// 테마: 잔디 박스 색(fill·stroke) + 장식 후보. 길 박스는 항상 탄색 tile_path(대비).
const ADV_THEMES = [
  { name: "숲",     gf: "#86cf63", gs: "#65ab47", decos: ["tree", "tree2", "rock", "flower"] },
  { name: "정글",   gf: "#6cc24c", gs: "#4ea636", decos: ["palm", "tree", "dino", "flower"] },
  { name: "초원",   gf: "#a7da78", gs: "#84bd54", decos: ["tree", "flower", "rock", "tree2"] },
  { name: "바닷가", gf: "#8ed3b1", gs: "#69b494", decos: ["palm", "rock", "flower"] },
];
const advTheme = () => ADV_THEMES[state.advMap ? state.advMap.theme : 0];
let advSvgEl = null, advSceneG = null, advTokenG = null, advTokenHop = null;

function ensureAdvSvg() {
  if (advSvgEl) return;
  advBoardEl.innerHTML =
    `<svg class="adv-svg" viewBox="${-ADV_MARGIN} ${-ADV_MARGIN} ${ADV_VBW + 2 * ADV_MARGIN} ${ADV_VBH + 2 * ADV_MARGIN}" preserveAspectRatio="xMidYMid meet">` +
    `<g class="adv-scene"></g><g class="adv-tok"><g class="adv-tok-hop"></g></g></svg>`;
  advSvgEl = advBoardEl.querySelector(".adv-svg");
  advSceneG = advBoardEl.querySelector(".adv-scene");
  advTokenG = advBoardEl.querySelector(".adv-tok");
  advTokenHop = advTokenG.querySelector(".adv-tok-hop");
}

// 장식 스프라이트(셀 바닥 기준 정렬). 식물류만 살랑 흔들림.
const ADV_SWAY = new Set(["tree", "tree2", "palm", "flower"]);
function advSprite(name, cx, by, h) {
  const dly = -(((cx * 13) % 300) / 100);
  const anim = ADV_SWAY.has(name) ? ` class="adv-deco" style="animation-delay:${dly.toFixed(2)}s"` : "";
  return `<ellipse cx="${cx}" cy="${by - 2}" rx="${(h * 0.3).toFixed(1)}" ry="${(h * 0.1).toFixed(1)}" fill="rgba(0,0,0,.14)"/>` +
    `<image${anim} href="assets/${name}.png" x="${cx - h / 2}" y="${by - h}" width="${h}" height="${h}" preserveAspectRatio="xMidYMax meet"/>`;
}

// ── 무작위 맵 생성: 자기회피 보행(Warnsdorff 편향)으로 박스 길을 깐다 ──
const advIdx = (c, r) => r * ADV_GW + c;
function advGenMap() {
  const freeNb = (c, r, vis) => {
    const o = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
      const nc = c + dc, nr = r + dr;
      if (nc >= 0 && nr >= 0 && nc < ADV_GW && nr < ADV_GH && !vis[advIdx(nc, nr)]) o.push([nc, nr]);
    });
    return o;
  };
  // 좌하단 START → 우상단 GOAL을 향해 가되 무작위로 흔들려 맵 전체를 가로질러 굽이친다.
  const start = [0, ADV_GH - 1], goal = [ADV_GW - 1, 0];
  const atGoal = (c, r) => c === goal[0] && r === goal[1];
  const walk = () => {
    const vis = new Uint8Array(ADV_GW * ADV_GH);
    let c = start[0], r = start[1]; vis[advIdx(c, r)] = 1; const path = [[c, r]];
    while (!atGoal(c, r)) {
      let nb = freeNb(c, r, vis); if (!nb.length) return null;
      const open = nb.filter((n) => atGoal(n[0], n[1]) || freeNb(n[0], n[1], vis).length > 0);
      if (open.length) nb = open;
      let best = null, bs = -1e9;
      nb.forEach((n) => {
        const dist = Math.abs(n[0] - goal[0]) + Math.abs(n[1] - goal[1]);
        const sc = -dist + Math.random() * 4.6;        // 목표지향 + 흔들림
        if (sc > bs) { bs = sc; best = n; }
      });
      vis[advIdx(best[0], best[1])] = 1; path.push(best); c = best[0]; r = best[1];
      if (path.length > ADV_GW * ADV_GH) return null;
    }
    return path;
  };
  let path = null;
  for (let t = 0; t < 250 && !path; t++) path = walk();
  if (!path || path.length < 10) {              // 안전망: 대각 계단 경로(항상 성공)
    path = []; let c = 0, r = ADV_GH - 1; path.push([c, r]);
    while (!(c === goal[0] && r === goal[1])) {
      if (c < goal[0] && (r === goal[1] || Math.random() < 0.5)) c++; else r--;
      path.push([c, r]);
    }
  }

  // 특수 칸: 내부 인덱스 무작위 배치
  const interior = []; for (let i = 2; i < path.length - 2; i++) interior.push(i);
  for (let i = interior.length - 1; i > 0; i--) { const j = rand(0, i); [interior[i], interior[j]] = [interior[j], interior[i]]; }
  const specials = {};
  ["dice", "back", "mystery", "mystery", "monster"].forEach((k) => { if (interior.length) specials[interior.pop()] = k; });

  // 테마 + 장식(경로 밖 칸에 무작위)
  const theme = rand(0, ADV_THEMES.length - 1);
  const dl = ADV_THEMES[theme].decos;
  const onPath = new Set(path.map(([c, r]) => advIdx(c, r)));
  const decos = [];
  for (let r = 0; r < ADV_GH; r++) for (let c = 0; c < ADV_GW; c++) {
    if (onPath.has(advIdx(c, r))) continue;
    if (Math.random() < 0.26) decos.push([dl[rand(0, dl.length - 1)], c, r]);
  }
  return { path, specials, theme, decos };
}

// 박스 격자(전부 박스) + 길 박스 + 장식 + 특수칸을 그린다.
function renderAdvScene() {
  ensureAdvSvg();
  const m = state.advMap, th = ADV_THEMES[m.theme], C = ADV_CELL, last = m.path.length - 1;
  // 여백까지 채우는 바닥(가장자리 잘림 없이)
  let svg = `<rect x="${-ADV_MARGIN}" y="${-ADV_MARGIN}" width="${ADV_VBW + 2 * ADV_MARGIN}" height="${ADV_VBH + 2 * ADV_MARGIN}" fill="${th.gs}"/>`;
  // 잔디 박스(깔끔한 초록 박스 + 윗면 하이라이트)
  for (let r = 0; r < ADV_GH; r++) for (let c = 0; c < ADV_GW; c++) {
    const x = c * C, y = r * C;
    svg += `<rect x="${x + 2}" y="${y + 2}" width="${C - 4}" height="${C - 4}" rx="14" fill="${th.gf}" stroke="${th.gs}" stroke-width="3"/>` +
      `<rect x="${x + 8}" y="${y + 7}" width="${C - 16}" height="${(C - 16) * 0.42}" rx="10" fill="#ffffff" opacity=".12"/>`;
  }
  m.decos.forEach(([name, c, r]) => { const h = C * 1.12; svg += advSprite(name, c * C + C / 2, r * C + C * 0.94, h); });
  m.path.forEach(([c, r]) => { svg += `<image href="assets/tile_path.png" x="${c * C}" y="${r * C}" width="${C}" height="${C}" preserveAspectRatio="none"/>`; });
  // 진행 방향 화살표(박스 사이마다) → 길이 어디로 이어지는지 보이게
  for (let i = 0; i < last; i++) {
    const a = m.path[i], b = m.path[i + 1];
    const mx = (a[0] + b[0]) / 2 * C + C / 2, my = (a[1] + b[1]) / 2 * C + C / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], s = 16;
    const tx = mx + dx * s, ty = my + dy * s;
    const p1x = mx - dx * s + (-dy) * s * 0.95, p1y = my - dy * s + dx * s * 0.95;
    const p2x = mx - dx * s - (-dy) * s * 0.95, p2y = my - dy * s - dx * s * 0.95;
    svg += `<path class="adv-arrow" style="animation-delay:${(i * 0.09).toFixed(2)}s" d="M${tx.toFixed(1)} ${ty.toFixed(1)} L${p1x.toFixed(1)} ${p1y.toFixed(1)} L${p2x.toFixed(1)} ${p2y.toFixed(1)} Z" fill="#fff" stroke="#7a521f" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  m.path.forEach(([c, r], i) => {
    const cx = c * C + C / 2, cy = r * C + C / 2;
    const badge = i === 0 ? "start" : i === last ? "treasure" : (m.specials[i] && i > state.advPos ? m.specials[i] : null);
    if (badge) {
      const sz = i === last ? C * 0.92 : i === 0 ? C * 0.86 : C * 0.8;
      const bob = (badge === "treasure" || badge === "mystery" || badge === "dice") ? ` class="adv-bob" style="animation-delay:-${(i % 5) * 0.3}s"` : "";
      svg += `<image${bob} href="assets/${badge}.png" x="${cx - sz / 2}" y="${cy - sz / 2}" width="${sz}" height="${sz}" preserveAspectRatio="xMidYMid meet"/>`;
    } else if (i > 0 && i <= state.advPos && i !== last) {
      svg += `<path d="M${cx - 13} ${cy} l9 10 l17 -20" fill="none" stroke="#3f7a2e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
    }
    if (i === state.advPos && i !== last) svg += `<circle cx="${cx}" cy="${cy}" r="${C * 0.42}" fill="none" stroke="#fff" stroke-width="5"/>`;
  });
  advSceneG.innerHTML = svg;
}

function renderAdvBoard(animate) {
  renderAdvScene();
  const eq = state.equip[state.curChar] || {};
  const bgVal = bgColor(eq.bg);
  const R = ADV_CELL * 0.36;
  // 말(토큰): 둥근 게임 말 안에 캐릭터를 넣어 칸 위에 세운다. 원점=칸 중심.
  advTokenHop.innerHTML =
    `<ellipse cx="0" cy="${R * 0.9}" rx="${R * 0.85}" ry="${R * 0.32}" fill="rgba(0,0,0,.26)"/>` +
    `<circle cx="0" cy="0" r="${R}" fill="${bgVal}" stroke="#fff" stroke-width="4.5"/>` +
    `<clipPath id="advTokClip"><circle cx="0" cy="0" r="${R - 3}"/></clipPath>` +
    `<g clip-path="url(#advTokClip)"><svg x="${-(R - 2)}" y="${-(R - 2)}" width="${(R - 2) * 2}" height="${(R - 2) * 2}" ` +
    `viewBox="${CHAR_VB[state.curChar]}" preserveAspectRatio="xMidYMid meet">${CHAR_ART[state.curChar]}</svg></g>` +
    advTokenFx(eq, R);
  placeToken(animate);
}
// 말 위 아이템: 머리(위에 하나) + 주변(작은 파티클 2개 둥실)
function advTokenFx(eq, R) {
  const head = itemOf(eq.head), aura = itemOf(eq.aura);
  let s = "";
  if (head) s += `<text class="adv-tok-fx" x="0" y="${-R * 1.32}" font-size="${(R * 0.95).toFixed(0)}" text-anchor="middle">${head.emoji}</text>`;
  if (aura) s += `<text class="adv-tok-aura a1" x="${(-R * 1.05).toFixed(0)}" y="${(-R * 0.35).toFixed(0)}" font-size="${(R * 0.62).toFixed(0)}">${aura.emoji}</text>` +
    `<text class="adv-tok-aura a2" x="${(R * 0.6).toFixed(0)}" y="${(-R * 0.85).toFixed(0)}" font-size="${(R * 0.55).toFixed(0)}">${aura.emoji}</text>`;
  return s;
}

// 말을 현재 길 박스(state.advPos)로 옮긴다 — 셀 중심 좌표.
function placeToken(animate) {
  const cell = state.advMap && state.advMap.path[state.advPos];
  if (!cell || !advTokenG) return;
  const x = cell[0] * ADV_CELL + ADV_CELL / 2, y = cell[1] * ADV_CELL + ADV_CELL / 2;
  if (!animate) {
    const prev = advTokenG.style.transition;
    advTokenG.style.transition = "none";
    advTokenG.style.transform = `translate(${x}px, ${y}px)`;
    advSvgEl.getBoundingClientRect();
    advTokenG.style.transition = prev || "";
  } else {
    advTokenG.style.transform = `translate(${x}px, ${y}px)`;
    advTokenHop.classList.remove("hop");
    advSvgEl.getBoundingClientRect();
    advTokenHop.classList.add("hop");
    clearTimeout(advTokenHop._t);
    advTokenHop._t = setTimeout(() => advTokenHop.classList.remove("hop"), 430);  // 끝나면 idle 바운스 재개
  }
}

async function showDice(n) {
  hideDice();
  const d = document.createElement("div");
  d.className = "adv-dice rolling"; d.id = "advDice";
  d.innerHTML = `🎲 데굴데굴`;
  advBoardEl.appendChild(d);
  
  const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const duration = 720;
  const intervalTime = 80;
  let elapsed = 0;
  
  const timer = setInterval(() => {
    const randomFace = diceFaces[Math.floor(Math.random() * 6)];
    d.innerHTML = `${randomFace} 데굴데굴`;
    Snd.step();
    elapsed += intervalTime;
    if (elapsed >= duration) {
      clearInterval(timer);
    }
  }, intervalTime);
  
  await sleep(duration + 100);
  
  d.classList.remove("rolling");
  const finalFace = diceFaces[n - 1];
  d.innerHTML = `${finalFace} ${n}`;
  Snd.magic(); // 정지음향
  await sleep(600);
}
function hideDice() { const d = $("#advDice"); if (d) d.remove(); }

// 보드 옆 액션영역(다음 스테이지 버튼 등). label 없으면 비운다.
function advAction(label, handler, cls) {
  if (!label) { advActionsEl.innerHTML = ""; return; }
  advActionsEl.innerHTML = `<button class="big-btn ${cls || "green"}" id="advActBtn">${label}</button>`;
  $("#advActBtn").onclick = handler;
}

// 풀이 카드를 맵 위에 띄우거나(보임) 잠시 사라지게 한다.
function advSolveCard(showIt) {
  const el = document.querySelector(".stage-solve-col");
  if (el) el.classList.toggle("hidden", !showIt);
}

// 모험 진입. fresh=true면 새 무작위 맵, false면 진행 중 맵 그대로(상점 다녀와도 유지).
function openAdventure(fresh) {
  state.mode = "quiz";
  state.ctx = "adventure";
  if (fresh || !state.advMap) { state.advMap = advGenMap(); state.advPos = 0; }
  advBoardColEl.style.display = "";
  stageScreen.classList.add("adv-full");     // 전체화면 맵 레이아웃
  showLevelCtrl(false);
  show(stageScreen);
  renderAdvBoard(false);
  advAction(null);
  const cn = charName(state.curChar);
  advSpeechEl.innerHTML = fresh || state.advPos === 0
    ? `${callName()}<b>${cn}</b>${hasJong(cn[cn.length - 1]) ? "이랑" : "랑"} 모험 출발! 박스 길을 따라 🚩보물상자까지! ✏️`
    : `${callName()}다시 모험! 🪙${state.coins} · 🚩까지 <b>${advSteps() - state.advPos}</b>칸! 문제를 풀어요. ✏️`;
  advSolveCard(true);
  nextQuestion();
  scheduleFit();
}

// 정답 후: 풀이 카드가 사라지고 → 주사위 굴려 박스를 칸칸 이동 → 특수칸 효과 → 다시 새 문제 카드.
async function advReturnAdvance() {
  advSolveCard(false);
  await sleep(280);
  const steps = advSteps();
  let roll = rand(1, 6);
  if (state.advPos + roll > steps) roll = steps - state.advPos;
  advSpeechEl.innerHTML = `🎲 주사위 <b>${roll}</b>! ${charName(state.curChar)}가 ${roll}칸!`;
  await showDice(roll);
  for (let k = 0; k < roll; k++) {
    state.advPos += 1;
    renderAdvScene();
    placeToken(true);
    Snd.step();
    await sleep(420);
  }
  hideDice();
  const sp = state.advMap.specials[state.advPos];
  if (sp && state.advPos < steps) await advApplySpecial(sp);
  if (state.advPos >= steps) { advStageClear(); return; }
  advSpeechEl.innerHTML = `좋아요! 🚩까지 <b>${steps - state.advPos}</b>칸! 다음 문제예요. ✏️`;
  advSolveCard(true);
  nextQuestion();
}

// 특수 박스 효과
async function advApplySpecial(kind) {
  await sleep(300);
  const steps = advSteps();
  if (kind === "dice") {
    const extra = Math.min(2, steps - state.advPos);
    banner("+주사위! 앞으로 🎲", "#16a06a"); Snd.magic();
    advSpeechEl.innerHTML = `🎲 +주사위 칸! 앞으로 더 가요!`;
    for (let k = 0; k < extra; k++) { state.advPos += 1; renderAdvScene(); placeToken(true); Snd.step(); await sleep(380); }
  } else if (kind === "back") {
    const back = Math.min(2, state.advPos); state.advPos -= back; renderAdvScene(); placeToken(true);
    Snd.wrong(); setMood("oops"); banner("뒤로 2칸! ↩", "#ec7a3c");
    advSpeechEl.innerHTML = `⬅️ 뒤로 가는 칸! 2칸 미끄러졌어요. ${callName()}괜찮아요! 💪`; await sleep(560);
  } else if (kind === "monster") {
    const back = Math.min(1, state.advPos); state.advPos -= back; renderAdvScene(); placeToken(true);
    Snd.wrong(); setMood("oops"); banner("몬스터! 뒤로 1칸 👾", "#9b59b6");
    advSpeechEl.innerHTML = `👾 몬스터를 만나 1칸 뒤로! ${callName()}조심! `; await sleep(560);
  } else if (kind === "mystery") {
    state.coins += 3; saveDress(); banner("미스터리 +🪙3", "#f0a020"); starShower(6); Snd.coin();
    advSpeechEl.innerHTML = `🎁 미스터리 박스! 코인 3개 획득!`; await sleep(420);
  }
}

function advStageClear() {
  advSolveCard(false);
  banner(`스테이지 ${state.advStage} 클리어! 🎉`, "#16a06a");
  starShower(14);
  advSpeechEl.innerHTML = `🚩 ${callName()}보물 발견! <b>스테이지 ${state.advStage}</b> 완료! 🎉`;
  advAction("다음 스테이지로 ▶", advNextStage);
}

function advNextStage() {
  state.advStage += 1;
  state.advMap = advGenMap();                // 새 무작위 맵
  state.advPos = 0;
  saveDress();
  renderAdvBoard(false);
  advAction(null);
  advSpeechEl.innerHTML = `${callName()}새 스테이지! 새 맵에서 다시 🚩보물상자까지! 🗺️`;
  advSolveCard(true);
  nextQuestion();
  scheduleFit();
}

/* ===================== 시작 화면 버튼 ===================== */
document.querySelectorAll(".op-card").forEach((card) => {
  card.onclick = () => {
    audioCtx(); // 첫 사용자 제스처에서 오디오 깨우기
    if (card.dataset.op) state.op = card.dataset.op;
    state.mode = card.dataset.mode;
    if (state.mode === "village") { openDressup(); return; }
    if (state.mode === "adventure") { openAdventure(true); return; }
    if (state.mode === "racing") { openRacing(); return; }
    updateScoreUI();
    if (state.mode === "learn") startLearn();
    else startQuiz();
  };
});

// 레이싱: iframe(자동차 게임/play.html)을 전체화면 오버레이로 띄움(첫 진입 때 lazy-load)
function openRacing() {
  const ov = document.getElementById("racingOverlay");
  const fr = document.getElementById("racingFrame");
  fr.src = "자동차 게임/play.html";   // 매번 새로 로드(닫을 때 언로드되므로). 코인 등은 localStorage에 저장돼 유지됨
  ov.classList.add("open");
}
function closeRacing() {
  document.getElementById("racingOverlay").classList.remove("open");
  document.getElementById("racingFrame").src = "about:blank";  // iframe 언로드 → 배경음악·상태 완전 정지
}
document.getElementById("racingClose").onclick = closeRacing;
document.querySelectorAll(".js-home").forEach((b) => { b.onclick = goHome; });
document.querySelectorAll(".js-mute").forEach((b) => { b.onclick = () => setMuted(!muted); });
$("#earnBtn").onclick = () => openAdventure(false);   // 상점 → 모험으로(진행 맵 유지)
$("#advShopBtn").onclick = openDressup;               // 모험 중 상점 열기
$("#lvDown").onclick = () => setLevel(state.level - 1);
$("#lvUp").onclick = () => setLevel(state.level + 1);
loadDress();   // 저장된 캐릭터·코인 불러오기
$("#whoPick").addEventListener("click", (e) => {
  const b = e.target.closest(".who-btn");
  if (b) { setPlayer(b.dataset.who); Snd.coin(); }
});
setPlayer(localStorage.getItem("mg_player") || "");  // 저장된 이름 복원
setMuted(muted); // 저장된 음소거 상태로 버튼 아이콘 동기화
showLevelCtrl(false);
paintCharacters();
updateScoreUI();
scheduleFit();   // 첫 화면도 딱 맞춤
window.addEventListener("load", scheduleFit);   // 폰트 로드 후 재보정

// PWA: 오프라인 캐시(서비스 워커). https 또는 localhost에서만 동작(직접 파일 열기는 무시).
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}