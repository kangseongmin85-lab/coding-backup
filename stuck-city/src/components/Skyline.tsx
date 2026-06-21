import { useEffect, useMemo, useRef, useState } from 'react'
import { Building, Holding } from '../types'
import { Weather } from '../weatherService'
import { rescueLine } from '../lines'
import { useLang } from '../i18n'
import BuildingTower from './BuildingTower'
import Typewriter from './Typewriter'

type Props = {
  buildings: Building[]
  myId: string
  onRemove: (h: Holding) => void
  onEdit: (h: Holding) => void
  onOpenChannel: (ticker: string) => void
  emptyHint: string
  weather: Weather | null
}

export default function Skyline({
  buildings,
  myId,
  onRemove,
  onEdit,
  onOpenChannel,
  emptyHint,
  weather,
}: Props) {
  const { lang } = useLang()
  const w = weather?.weather ?? 'clear'
  const day = weather?.isDay ?? false // 기본은 밤(달)

  // 헬기 구조 멘트: 타이핑 완료 → 잠깐 쉼 → 다른 멘트 타이핑 (무한 순환)
  const [rescue, setRescue] = useState(() => rescueLine(lang))
  const lastRescue = useRef(rescue)
  const pauseRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    const l = rescueLine(lang)
    lastRescue.current = l
    setRescue(l)
    return () => {
      if (pauseRef.current) window.clearTimeout(pauseRef.current)
    }
  }, [lang])
  function cycleRescue() {
    if (pauseRef.current) window.clearTimeout(pauseRef.current)
    pauseRef.current = window.setTimeout(() => {
      let l = rescueLine(lang)
      let g = 0
      while (l === lastRescue.current && g++ < 6) l = rescueLine(lang)
      lastRescue.current = l
      setRescue(l)
    }, 2600)
  }
  const drops = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 53) % 100) / 100,
        dur: 0.5 + ((i * 17) % 40) / 100,
      })),
    [],
  )
  const flakes = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 41) % 100,
        delay: ((i * 67) % 100) / 10,
        dur: 5 + ((i * 23) % 50) / 10,
        drift: ((i * 13) % 40) - 20,
      })),
    [],
  )

  return (
    <>
      <div className={`sky-bg ${day ? 'day' : 'night'} w-${w}`} aria-hidden="true">
        {day ? <div className="sun" /> : <div className="moon" />}
        {!day && <div className="stars" />}

        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
        <div className="cloud c4" />

        {w === 'rain' && (
          <div className="rain">
            {drops.map((d, i) => (
              <span
                key={i}
                className="drop"
                style={{
                  left: `${d.left}%`,
                  animationDelay: `${d.delay}s`,
                  animationDuration: `${d.dur}s`,
                }}
              />
            ))}
          </div>
        )}
        {w === 'snow' && (
          <div className="snow">
            {flakes.map((f, i) => (
              <span
                key={i}
                className="flake"
                style={
                  {
                    left: `${f.left}%`,
                    animationDelay: `${f.delay}s`,
                    animationDuration: `${f.dur}s`,
                    '--drift': `${f.drift}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}


        {/* 구조대 헬기 — 약 10분에 한 번 지나감 */}
        <div className="heli">
          <div className="heli-bubble">
            <Typewriter text={rescue} onDone={cycleRescue} />
          </div>
          <svg width="72" height="50" viewBox="0 0 72 50" style={{ overflow: 'visible' }}>
            {/* 마스트 */}
            <rect x="29" y="11" width="3" height="5" fill="#3a4252" />
            {/* 로터 디스크 (항상 흐릿하게 보임) */}
            <ellipse cx="30" cy="10" rx="26" ry="2.5" fill="#cfd6e6" opacity="0.35" />
            {/* 로터 블레이드 (회전) */}
            <g className="rotor">
              <rect x="3" y="8.5" width="54" height="3" rx="1.5" fill="#2a2f3a" />
              <circle cx="30" cy="10" r="3" fill="#2a2f3a" />
            </g>
            {/* 꼬리 붐 */}
            <rect x="2" y="18" width="16" height="3.5" fill="#e8edf6" />
            {/* 꼬리 날개 + 꼬리 로터 (회전) */}
            <rect x="1" y="12" width="3" height="9" fill="#d23b4a" />
            <g className="tailrotor">
              <rect x="0" y="13" width="1.5" height="8" rx="0.7" fill="#2a2f3a" />
            </g>
            {/* 동체 */}
            <rect x="15" y="14" width="30" height="13" rx="3" fill="#eef2fa" />
            <rect x="15" y="23" width="30" height="4" fill="#d23b4a" />
            <rect x="43" y="16" width="7" height="9" rx="2" fill="#eef2fa" />
            {/* 조종석 창 */}
            <rect x="40" y="17" width="7" height="6" rx="1" fill="#7fb4ee" />
            {/* 구조 십자 */}
            <rect x="23" y="16" width="6" height="2" fill="#d23b4a" />
            <rect x="25" y="14" width="2" height="6" fill="#d23b4a" />
            {/* 착륙 스키드 */}
            <rect x="17" y="30" width="24" height="2" rx="1" fill="#3a4252" />
            <rect x="20" y="27" width="2" height="3" fill="#3a4252" />
            <rect x="37" y="27" width="2" height="3" fill="#3a4252" />
            {/* 구조 로프 + 고리 */}
            <rect x="29" y="27" width="1" height="15" fill="#8a6a3a" />
            <circle cx="29.5" cy="43" r="2.4" fill="none" stroke="#caa86a" strokeWidth="1.2" />
          </svg>
        </div>

      </div>

      <div className="skyline">
        <div className="city">
          <div className="street">
            {buildings.length === 0 && (
              <p className="empty" dangerouslySetInnerHTML={{ __html: emptyHint }} />
            )}
            {buildings.map((b, i) => (
              <BuildingTower
                key={b.ticker}
                building={b}
                index={i}
                myId={myId}
                onRemove={onRemove}
                onEdit={onEdit}
                onOpenChannel={onOpenChannel}
              />
            ))}
          </div>
          <div className="ground" />
        </div>
      </div>
    </>
  )
}
