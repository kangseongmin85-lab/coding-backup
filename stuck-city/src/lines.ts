import { Lang } from './i18n'

// 손익률(pnl%) 구간별 익살 멘트 (한국어 / 영어)
type Bucket = { max: number; ko: string[]; en: string[] }

const BUCKETS: Bucket[] = [
  {
    max: -50,
    ko: [
      '여기 지하 암반층입니다… 햇빛 본 지 오래됐어요',
      '구조대 안 와요? 화석 될 것 같아요',
      '평단이 화성에 있어요. 지구 안녕히…',
      '이건 투자가 아니라 기부였나 봅니다',
      '여기서 김장 담그며 겨울 납니다',
      '두더지도 여기까진 안 와요',
      '제 노후자금이 여기 잠들어 있어요',
      '바닥인 줄 알았는데 지하실, 지하실인 줄 알았는데 동굴',
    ],
    en: [
      'I live here now. Send snacks.',
      'Tell my portfolio I loved it.',
      'Basement level: bedrock.',
      'HODLing from the Earth\'s core.',
      'My avg is on another planet.',
      'This isn\'t a dip, it\'s a cave.',
    ],
  },
  {
    max: -25,
    ko: [
      '여기 사람 있어요!! 누가 좀 끌어올려줘요 ㅠㅠ',
      '꼭대기에서 살려달라고 외칩니다',
      '구조 헬기 좀 보내주세요 🚁',
      '한 층만, 딱 한 층만 더 버티면…',
      '계좌 보면 눈물이 앞을 가려요',
      '엄마한테는 비밀로 해주세요',
      '추매했더니 더 깊은 층으로 이사 왔어요',
    ],
    en: [
      'Send a rescue chopper up here 🚁',
      'Anyone got a ladder?',
      'I\'m not stuck, I\'m committed.',
      'Diamond hands, sweaty palms.',
      'One more dip and I\'m buying.',
      'Holding for dear life.',
    ],
  },
  {
    max: -10,
    ko: [
      '엘리베이터가 멈췄어요. 곧 움직이겠죠?',
      '조금만 더 내려오면 추매 들어갑니다',
      '음… 장기투자라고 해두죠',
      '살짝 물렸지만 아직 여유 있어요',
      '내일은 오르겠죠 (매일 하는 말)',
      '여기 잠깐 들른 거예요 곧 올라가요',
    ],
    en: [
      'Just visiting this floor, brb.',
      'It\'ll bounce... right?',
      'A little red never hurt anybody.',
      'Long-term investor (cope).',
      'Elevator\'s coming back up soon.',
    ],
  },
  {
    max: 0,
    ko: [
      '본전 근처에서 줄타기 중입니다',
      '탈출할까 말까 고민 중…',
      '여기서 한 발만 떼면 본전이에요',
      '제발 한 번만 초록불 보여주세요',
    ],
    en: [
      'Breakeven tightrope walk.',
      'To sell or not to sell…',
      'So close to green I can taste it.',
      'Heart rate: maximum.',
    ],
  },
  {
    max: 10,
    ko: [
      '커피값은 벌었네요 ☕',
      '슬슬 익절 각 보는 중',
      '플러스다! 일단 기분은 좋아요',
      '드디어 빨간불 탈출!',
    ],
    en: [
      'Coffee money secured ☕',
      'Green day, good day.',
      'Tendies acquired.',
      'Slowly climbing 📈',
    ],
  },
  {
    max: 25,
    ko: [
      '표정 관리 중입니다 (입꼬리 실룩)',
      '오늘 저녁은 제가 쏩니다',
      '슬슬 펜트하우스 보이네요',
      '계좌 보는 맛에 삽니다',
    ],
    en: [
      'Trying not to smile.',
      'Chicken dinner tonight 🍗',
      'Penthouse in sight.',
      'Up only, baby.',
    ],
  },
  {
    max: Infinity,
    ko: [
      '펜트하우스에서 와인 마시는 중 🍷',
      '여러분, 저 먼저 올라갑니다 🚀',
      '이 구역 건물주는 접니다',
      '가즈아를 외친 보람이 있네요',
      '엄마 나 드디어 효도해요',
    ],
    en: [
      'Penthouse, popping bottles 🍾',
      'See you on the moon 🚀',
      'I own this building now.',
      'Stonks only go up.',
      'Lambo loading…',
    ],
  },
]

function bucketFor(pnl: number): Bucket {
  return BUCKETS.find((b) => pnl <= b.max) ?? BUCKETS[BUCKETS.length - 1]
}

export function randomLine(pnl: number, lang: Lang = 'ko'): string {
  const b = bucketFor(pnl)
  const arr = lang === 'en' ? b.en : b.ko
  return arr[Math.floor(Math.random() * arr.length)]
}

// 구조대 헬기 익살 멘트
const RESCUE = {
  ko: [
    '구조 요청 접수! 갑니다 🚁',
    '물리신 분~ 어디 계세요?',
    '사다리 내려갑니다, 꽉 잡아요!',
    '고점 조난자 구출 중!',
    '조금만 버텨요, 구조대 갑니다!',
    '지하 몇 층이세요? 내려갑니다!',
    '존버 중인 분, 손 흔들어주세요!',
  ],
  en: [
    'Rescue squad incoming! 🚁',
    'Anyone stuck up there?',
    'Lowering the ladder, hold on!',
    'Rescuing top-floor survivors!',
    'Hang tight, help is coming!',
    'Which basement floor? On my way!',
  ],
}

export function rescueLine(lang: Lang = 'ko'): string {
  const arr = lang === 'en' ? RESCUE.en : RESCUE.ko
  return arr[Math.floor(Math.random() * arr.length)]
}
