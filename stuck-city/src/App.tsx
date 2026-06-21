import { useEffect, useMemo, useState } from 'react'
import { ChatMessage, Holding } from './types'
import { groupByTicker, isStuck } from './floors'
import { useCity } from './net'
import {
  loadHoldings,
  saveHoldings,
  loadMessages,
  saveMessages,
  loadNickname,
  saveNickname,
  ensureUserId,
} from './store'
import Skyline from './components/Skyline'
import Chat from './components/Chat'
import AddHoldingForm from './components/AddHoldingForm'
import EditHoldingForm from './components/EditHoldingForm'
import { fetchWeather, Weather } from './weatherService'
import { useLang } from './i18n'

let mid = 0
const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id' + Date.now() + '-' + mid++

type NewHolding = Omit<Holding, 'id' | 'createdAt' | 'ownerId'>

export default function App() {
  const { lang, setLang, t } = useLang()
  const myId = useMemo(() => ensureUserId(), [])
  const { state: serverState, connected, online: onlineCount, send } = useCity()
  const online = connected && !!serverState

  // 오프라인 폴백 (로컬)
  const [localHoldings, setLocalHoldings] = useState<Holding[]>(() => loadHoldings())
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({})
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => loadMessages())

  const [nickname, setNickname] = useState(() => loadNickname())
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const [viewAll, setViewAll] = useState(false) // 기본: 내 종목만
  const [channel, setChannel] = useState('') // '' = 광장
  const [weather, setWeather] = useState<Weather | null>(null)

  useEffect(() => {
    fetchWeather().then(setWeather)
  }, [])

  useEffect(() => {
    if (!online) saveHoldings(localHoldings)
  }, [localHoldings, online])
  useEffect(() => {
    if (!online) saveMessages(localMessages)
  }, [localMessages, online])

  const allHoldings = online ? serverState!.holdings : localHoldings
  const prices = online ? serverState!.prices : localPrices
  const marketCaps = online ? serverState!.marketCaps ?? {} : {}
  const names = online ? serverState!.names ?? {} : {}
  const messages = online ? serverState!.messages : localMessages

  // 내 종목만 보기 (기본) / 전체 보기 토글
  const visibleHoldings = useMemo(
    () => (viewAll ? allHoldings : allHoldings.filter((h) => h.ownerId === myId)),
    [allHoldings, viewAll, myId],
  )

  const buildings = useMemo(
    () => groupByTicker(visibleHoldings, prices, marketCaps, names),
    [visibleHoldings, prices, marketCaps, names],
  )
  const dispName = (b: { ticker: string; nameEn?: string }) =>
    lang === 'en' && b.nameEn ? b.nameEn : b.ticker

  const stuckCount = useMemo(
    () => visibleHoldings.filter((h) => isStuck(h, prices[h.ticker] ?? 0)).length,
    [visibleHoldings, prices],
  )
  const myCount = useMemo(
    () => allHoldings.filter((h) => h.ownerId === myId).length,
    [allHoldings, myId],
  )

  // 채널: 광장 + 보이는 건물들 (입주 인원수 = 전체 소유자 기준)
  const channels = useMemo(
    () => [
      { ticker: '', label: t('plaza'), count: 0 },
      ...buildings.map((b) => ({
        ticker: b.ticker,
        label: dispName(b),
        count: allHoldings.filter((h) => h.ticker === b.ticker).length,
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildings, allHoldings, lang],
  )
  useEffect(() => {
    if (channel && !channels.some((c) => c.ticker === channel)) setChannel('')
  }, [channels, channel])
  const channelMessages = useMemo(
    () => messages.filter((m) => (m.ticker || '') === channel),
    [messages, channel],
  )
  function openChannel(ticker: string) {
    setChannel(ticker)
    setChatOpen(true)
  }

  function addHolding(h: NewHolding) {
    const holding = { ...h, ownerId: myId }
    if (online) {
      send({ t: 'add', holding })
    } else {
      setLocalHoldings((prev) => [
        ...prev,
        { ...holding, id: newId(), createdAt: Date.now() },
      ])
      setLocalPrices((prev) =>
        prev[h.ticker] ? prev : { ...prev, [h.ticker]: h.avgPrice },
      )
    }
    setShowAdd(false)
    if (!viewAll) setViewAll(false)
  }

  function removeHolding(h: Holding) {
    const msg =
      lang === 'ko'
        ? `'${h.nickname}' (${h.ticker}) 캐릭터를 삭제할까요?`
        : `Remove '${h.nickname}' from ${h.ticker}?`
    if (!confirm(msg)) return
    if (online) send({ t: 'remove', holdingId: h.id, ownerId: myId })
    else setLocalHoldings((prev) => prev.filter((x) => x.id !== h.id))
  }

  function saveEdit(fields: {
    avgPrice: number
    quantity: number
    message: string
    charType: string
  }) {
    if (!editing) return
    if (online) {
      send({ t: 'edit', holdingId: editing.id, ownerId: myId, ...fields })
    } else {
      setLocalHoldings((prev) =>
        prev.map((x) => (x.id === editing.id ? { ...x, ...fields } : x)),
      )
    }
    setEditing(null)
  }

  function changeNickname() {
    const label = lang === 'ko' ? '내 닉네임' : 'Your nickname'
    const def = nickname || (lang === 'ko' ? '익명개미' : 'anon')
    const next = window.prompt(label, def)
    if (next == null) return
    setNickname(next)
    saveNickname(next)
  }

  function sendChat(text: string) {
    const nick = nickname || '익명개미'
    if (online) send({ t: 'chat', nickname: nick, ticker: channel, text })
    else
      setLocalMessages((prev) => [
        ...prev,
        { id: newId(), nickname: nick, ticker: channel, text, createdAt: Date.now() },
      ])
  }

  const emptyHint = viewAll ? t('emptyAll') : t('emptyMine')

  useEffect(() => {
    document.title = `${t('appName')} · ${t('tagline')}`
  }, [lang])

  return (
    <div className="game">
      <div className="grain" aria-hidden="true" />
      <header className="hud">
        <div className="hud-title">
          <span className="logo">
            <iconify-icon icon="solar:city-bold" />
          </span>
          <strong>{t('appName')}</strong>
          <span className="tagline">{t('tagline')}</span>
          <span className={`conn ${online ? 'on' : 'off'}`}>
            <iconify-icon icon={online ? 'solar:users-group-rounded-bold' : 'solar:wi-fi-router-minimalistic-bold'} />
            {online ? t('online') : t('offline')}
          </span>
          {stuckCount > 0 && (
            <span className="stuck-pill">
              <iconify-icon icon="solar:siren-bold" /> {t('stuck')} {stuckCount}
            </span>
          )}
        </div>
        <div className="hud-actions">
          <button className="primary" onClick={() => setShowAdd(true)}>
            <iconify-icon icon="solar:buildings-3-bold" /> {t('moveIn')}
          </button>
          <button onClick={() => setViewAll((v) => !v)}>
            <iconify-icon icon={viewAll ? 'solar:global-bold' : 'solar:user-bold'} />
            {viewAll ? ` ${t('allCity')}` : ` ${t('myStocks')} ${myCount}`}
          </button>
          <button onClick={changeNickname}>
            <iconify-icon icon="solar:user-circle-bold" /> {nickname || t('nickname')}
          </button>
          <button
            className="lang-btn"
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            title="Language"
          >
            <iconify-icon icon="solar:global-linear" /> {lang === 'ko' ? 'EN' : '한'}
          </button>
        </div>
      </header>

      <Skyline
        buildings={buildings}
        myId={myId}
        onRemove={removeHolding}
        onEdit={setEditing}
        onOpenChannel={openChannel}
        emptyHint={emptyHint}
        weather={weather}
      />

      <div className={`chat-dock ${chatOpen ? 'open' : 'closed'}`}>
        <button className="chat-toggle" onClick={() => setChatOpen((v) => !v)}>
          <iconify-icon icon="solar:chat-round-line-bold" />{' '}
          {t('chat')} {chatOpen ? '▾' : '▴'}
          {channel ? ` · ${channels.find((c) => c.ticker === channel)?.label ?? channel}` : ''}
        </button>
        {chatOpen && (
          <Chat
            messages={channelMessages}
            nickname={nickname}
            online={onlineCount}
            channels={channels}
            channel={channel}
            onChannel={setChannel}
            onSend={sendChat}
          />
        )}
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{t('newMoveIn')}</h2>
              <button onClick={() => setShowAdd(false)} aria-label="닫기">
                <iconify-icon icon="solar:close-circle-bold" />
              </button>
            </div>
            <AddHoldingForm nickname={nickname} onAdd={addHolding} />
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{t('editTitle')}</h2>
              <button onClick={() => setEditing(null)} aria-label="close">
                <iconify-icon icon="solar:close-circle-bold" />
              </button>
            </div>
            <EditHoldingForm holding={editing} onSave={saveEdit} />
          </div>
        </div>
      )}
    </div>
  )
}
