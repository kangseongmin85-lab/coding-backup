import { useEffect, useState } from 'react'
import { Building, Holding } from '../types'
import { floorOf, isStuck, pnlPercent } from '../floors'
import Character, { pickType, moodFromPnl, CharType } from './Character'
import Typewriter from './Typewriter'
import { randomLine } from '../lines'
import { useLang } from '../i18n'

const FLOOR_H = 34
const WIDTH = 168
const CHAR = 38

const THEMES = [
  { wall: '#33507a', win: '#7fb4ee', winOff: '#274066', roof: '#22364f' },
  { wall: '#3c3c46', win: '#9aa6c0', winOff: '#2a2a31', roof: '#1f1f25' },
  { wall: '#6a5238', win: '#e8c98a', winOff: '#4a3826', roof: '#3a2c1d' },
  { wall: '#2f5c4a', win: '#7fd9b0', winOff: '#1f4032', roof: '#1c3a2e' },
  { wall: '#5a3550', win: '#e69ccf', winOff: '#3d2237', roof: '#2c1828' },
]

type Props = {
  building: Building
  index: number
  myId: string
  onRemove: (h: Holding) => void
  onEdit: (h: Holding) => void
  onOpenChannel: (ticker: string) => void
}

export default function BuildingTower({
  building,
  index,
  myId,
  onRemove,
  onEdit,
  onOpenChannel,
}: Props) {
  const { lang, t } = useLang()
  const theme = THEMES[index % THEMES.length]
  const FC = building.floorCount
  const facadeH = FC * FLOOR_H
  const priceFloor = floorOf(building.currentPrice, building)
  const priceTop = (FC - priceFloor) * FLOOR_H

  const [speaker, setSpeaker] = useState<{ id: string; line: string } | null>(null)
  useEffect(() => {
    function rotate() {
      const hs = building.holdings
      if (hs.length === 0) return
      const h = hs[Math.floor(Math.random() * hs.length)]
      setSpeaker({ id: h.id, line: randomLine(pnlPercent(h, building.currentPrice), lang) })
    }
    rotate()
    const id = window.setInterval(rotate, 4500)
    return () => window.clearInterval(id)
  }, [building.holdings, building.currentPrice, lang])

  const avgPnl =
    building.holdings.length > 0
      ? building.holdings.reduce((s, h) => s + pnlPercent(h, building.currentPrice), 0) /
        building.holdings.length
      : 0

  const byFloor = new Map<number, Holding[]>()
  for (const h of building.holdings) {
    const f = floorOf(h.avgPrice, building)
    const arr = byFloor.get(f) ?? []
    arr.push(h)
    byFloor.set(f, arr)
  }

  let ci = 0
  return (
    <div
      className="tower-col"
      style={{ width: WIDTH, animationDelay: `${index * 110}ms` }}
    >
      <div className="rooftop-sign">
        <button
          className="rs-ticker"
          onClick={() => onOpenChannel(building.ticker)}
          title={t('openChatTip')}
        >
          {lang === 'en' && building.nameEn ? building.nameEn : building.ticker}
          <span className="rs-members">
            <iconify-icon icon="solar:users-group-rounded-bold" />
            {building.holdings.length}
          </span>
        </button>
        <span className={`rs-price ${avgPnl >= 0 ? 'up' : 'down'}`} title={t('openTip')}>
          {building.currentPrice.toLocaleString('ko-KR')}
          <span className="rs-chg">
            {avgPnl >= 0 ? '▲' : '▼'}
            {Math.abs(avgPnl).toFixed(1)}%
          </span>
        </span>
      </div>

      <div className="roof" style={{ background: theme.roof }} />

      <div className="facade" style={{ height: facadeH, width: WIDTH, background: theme.wall }}>
        {Array.from({ length: FC }).map((_, i) => {
          const floorNum = FC - i
          return (
            <div className="floor-row" key={i} style={{ height: FLOOR_H }}>
              <span className="floor-label">{floorNum}</span>
              <div className="windows">
                {Array.from({ length: 4 }).map((_, w) => (
                  <span
                    key={w}
                    className="win"
                    style={{ background: (i + w) % 3 === 0 ? theme.winOff : theme.win }}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <div className="cur-line" style={{ top: priceTop }}>
          <span className="cur-tag">{t('openLabel')}</span>
        </div>

        {Array.from(byFloor.entries()).map(([floor, hs]) => {
          const rowTop = (FC - floor) * FLOOR_H
          return hs.map((h, j) => {
            const stuck = isStuck(h, building.currentPrice)
            const pnl = pnlPercent(h, building.currentPrice)
            const mood = moodFromPnl(pnl, stuck)
            const type = (h.charType as CharType) || pickType(h.nickname + h.id)
            const isSpeaking = speaker?.id === h.id
            const crying = pnl < -25
            const mine = h.ownerId === myId
            const slot = hs.length > 1 ? j - (hs.length - 1) / 2 : 0
            const left = WIDTH / 2 + slot * 34 - CHAR / 2
            const delay = (ci++ * 230) % 1800
            const line = h.message?.trim() ? h.message : speaker?.line ?? ''
            return (
              <div
                key={h.id}
                className="char-btn"
                style={{ top: rowTop + FLOOR_H - CHAR, left, width: CHAR }}
              >
                {isSpeaking && line && (
                  <span className={`speech ${stuck ? 'bad' : 'good'}`}>
                    <Typewriter text={line} />
                  </span>
                )}
                {mine && (
                  <button
                    className="char-edit"
                    title={t('editTip')}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(h)
                    }}
                  >
                    ✎
                  </button>
                )}
                {mine && (
                  <button
                    className="char-del"
                    title={t('delTip')}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(h)
                    }}
                  >
                    ✕
                  </button>
                )}
                <button
                  className="char-poke"
                  title={`${h.nickname} · ${h.avgPrice.toLocaleString()} · ${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%`}
                  onClick={() =>
                    setSpeaker({ id: h.id, line: randomLine(pnl, lang) })
                  }
                >
                  <Character type={type} mood={mood} size={CHAR} delay={delay} crying={crying} />
                  <span className={`char-name ${stuck ? 'stuck' : ''}`}>{h.nickname}</span>
                </button>
              </div>
            )
          })
        })}
      </div>

      <div className="entrance" style={{ background: theme.roof }}>
        <span className="door" />
      </div>
    </div>
  )
}
