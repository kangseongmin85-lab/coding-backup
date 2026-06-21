// 픽셀아트 캐릭터 (이모지 아님). 종목 투자자를 표현하는 여러 종류 + 감정.
// viewBox 0 0 16 24, shape-rendering crispEdges 로 픽셀 느낌.

export type CharType =
  | 'ant' // 개미 (기본 개미투자자)
  | 'heugwu' // 흑우 (고점에 물리는 호구 개미)
  | 'bull' // 황소
  | 'bear' // 곰
  | 'diamond' // 다이아몬드 핸즈 (존버)
  | 'rocket' // 로켓맨 (가즈아)
  | 'paper' // 종이손

export type Mood = 'panic' | 'sad' | 'chill' | 'happy'

export const CHAR_TYPES: CharType[] = [
  'ant',
  'heugwu',
  'bull',
  'bear',
  'diamond',
  'rocket',
  'paper',
]

// 닉네임 → 캐릭터 종류 (결정적)
export function pickType(seed: string): CharType {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return CHAR_TYPES[h % CHAR_TYPES.length]
}

export function moodFromPnl(pnl: number, stuck: boolean): Mood {
  if (!stuck) return pnl > 25 ? 'happy' : 'chill'
  return pnl < -25 ? 'panic' : 'sad'
}

const PAL: Record<CharType, { body: string; dark: string; head: string }> = {
  ant: { body: '#8a5a2b', dark: '#5e3c18', head: '#a86b34' },
  heugwu: { body: '#2b2b31', dark: '#161619', head: '#3a3a42' },
  bull: { body: '#9c6b3a', dark: '#6b481f', head: '#b07d45' },
  bear: { body: '#4a4a52', dark: '#2e2e35', head: '#5a5a64' },
  diamond: { body: '#1d6e8c', dark: '#114156', head: '#39c6e8' },
  rocket: { body: '#c9d3e6', dark: '#8a93ad', head: '#eef3ff' },
  paper: { body: '#d8d2c0', dark: '#a8a290', head: '#efe9d8' },
}

function Px({ x, y, w, h, f }: { x: number; y: number; w: number; h: number; f: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={f} />
}

export default function Character({
  type,
  mood,
  size = 30,
  delay = 0,
  crying = false,
}: {
  type: CharType
  mood: Mood
  size?: number
  delay?: number
  crying?: boolean
}) {
  const p = PAL[type]
  const skin = '#f2c9a0'

  return (
    <svg
      className={`pixel-char mood-${mood}`}
      width={(size * 16) / 24}
      height={size}
      viewBox="0 0 16 24"
      style={{
        shapeRendering: 'crispEdges',
        overflow: 'visible',
        animationDelay: `${delay}ms`,
      }}
    >
      {/* 다리 */}
      <Px x={5} y={20} w={2} h={4} f={p.dark} />
      <Px x={9} y={20} w={2} h={4} f={p.dark} />
      {/* 팔 */}
      <Px x={2} y={13} w={2} h={6} f={p.dark} />
      <Px x={12} y={13} w={2} h={6} f={p.dark} />
      {/* 몸통 */}
      <Px x={4} y={12} w={8} h={8} f={p.body} />
      {/* 얼굴(피부) */}
      <Px x={5} y={5} w={6} h={7} f={skin} />

      {/* 종류별 머리/장식 */}
      {type === 'ant' && (
        <>
          <Px x={4} y={3} w={8} h={3} f={p.head} />
          <Px x={4} y={1} w={1} h={2} f={p.dark} />
          <Px x={11} y={1} w={1} h={2} f={p.dark} />
        </>
      )}
      {type === 'heugwu' && (
        <>
          {/* 검은 소 머리 */}
          <Px x={4} y={2} w={8} h={4} f={p.head} />
          {/* 뿔 (밝은 회색) */}
          <Px x={3} y={0} w={1} h={2} f="#e3ddcb" />
          <Px x={2} y={1} w={1} h={1} f="#e3ddcb" />
          <Px x={12} y={0} w={1} h={2} f="#e3ddcb" />
          <Px x={13} y={1} w={1} h={1} f="#e3ddcb" />
          {/* 귀 */}
          <Px x={3} y={3} w={1} h={2} f={p.dark} />
          <Px x={12} y={3} w={1} h={2} f={p.dark} />
        </>
      )}
      {type === 'bull' && (
        <>
          <Px x={4} y={3} w={8} h={3} f={p.head} />
          <Px x={2} y={2} w={2} h={1} f="#f0ead6" />
          <Px x={2} y={3} w={1} h={1} f="#f0ead6" />
          <Px x={12} y={2} w={2} h={1} f="#f0ead6" />
          <Px x={13} y={3} w={1} h={1} f="#f0ead6" />
        </>
      )}
      {type === 'bear' && (
        <>
          <Px x={4} y={3} w={8} h={3} f={p.head} />
          <Px x={3} y={2} w={2} h={2} f={p.head} />
          <Px x={11} y={2} w={2} h={2} f={p.head} />
        </>
      )}
      {type === 'diamond' && (
        <>
          <Px x={6} y={1} w={4} h={1} f={p.head} />
          <Px x={5} y={2} w={6} h={2} f={p.head} />
          <Px x={7} y={4} w={2} h={1} f={p.head} />
          <Px x={7} y={2} w={1} h={1} f="#ffffff" />
        </>
      )}
      {type === 'rocket' && (
        <>
          <Px x={4} y={2} w={8} h={5} f={p.head} />
          <Px x={5} y={4} w={6} h={2} f="#3a5a9c" />
          <Px x={6} y={4} w={2} h={1} f="#9fc0ff" />
        </>
      )}
      {type === 'paper' && (
        <>
          <Px x={4} y={2} w={8} h={4} f={p.head} />
          <Px x={4} y={2} w={2} h={1} f={p.dark} />
          <Px x={10} y={5} w={2} h={1} f={p.dark} />
        </>
      )}

      {/* 눈 (감정별) */}
      {mood === 'panic' && (
        <>
          <Px x={6} y={7} w={2} h={2} f="#222" />
          <Px x={9} y={7} w={2} h={2} f="#222" />
          <Px x={7} y={10} w={3} h={2} f="#3a1010" /> {/* 벌어진 입 */}
          <Px x={3} y={6} w={1} h={3} f="#7fd4ff" /> {/* 식은땀 */}
        </>
      )}
      {mood === 'sad' && (
        <>
          <Px x={6} y={8} w={1} h={1} f="#222" />
          <Px x={10} y={8} w={1} h={1} f="#222" />
          <Px x={7} y={11} w={3} h={1} f="#5a2a2a" />
          <Px x={10} y={9} w={1} h={2} f="#7fd4ff" /> {/* 눈물 */}
        </>
      )}
      {mood === 'chill' && (
        <>
          <Px x={6} y={7} w={5} h={2} f="#1a1a1a" /> {/* 선글라스 */}
          <Px x={7} y={11} w={3} h={1} f="#5a3a2a" />
        </>
      )}
      {mood === 'happy' && (
        <>
          <Px x={6} y={8} w={1} h={1} f="#222" />
          <Px x={10} y={8} w={1} h={1} f="#222" />
          <Px x={6} y={10} w={5} h={1} f="#5a2a2a" />
          <Px x={7} y={11} w={3} h={1} f="#5a2a2a" />
        </>
      )}

      {/* 통곡 눈물 (많이 물렸을 때 툭툭) */}
      {crying && (
        <>
          <rect className="tear tear-l" x={6} y={9} width={1.4} height={2.4} fill="#7fd4ff" />
          <rect className="tear tear-r" x={9.6} y={9} width={1.4} height={2.4} fill="#7fd4ff" />
        </>
      )}
    </svg>
  )
}
