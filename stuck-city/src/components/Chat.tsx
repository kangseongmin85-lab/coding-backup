import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '../types'
import { useLang, buildingPh } from '../i18n'

const MARK_S = ''
const MARK_E = ''

export type Channel = { ticker: string; label: string; count: number }

type Props = {
  messages: ChatMessage[]
  nickname: string
  online: number
  channels: Channel[]
  channel: string
  onChannel: (ticker: string) => void
  onSend: (text: string) => void
}

// 욕설 마커(..)를 블러 처리, 탭하면 보기
function MessageText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  if (!text.includes(MARK_S)) return <span className="msg-text">{text}</span>
  const parts: { bad: boolean; t: string }[] = []
  let rest = text
  let guard = 0
  while (rest.length && guard++ < 50) {
    const s = rest.indexOf(MARK_S)
    if (s === -1) {
      parts.push({ bad: false, t: rest })
      break
    }
    if (s > 0) parts.push({ bad: false, t: rest.slice(0, s) })
    const e = rest.indexOf(MARK_E, s + 1)
    if (e === -1) {
      parts.push({ bad: false, t: rest.slice(s + 1) })
      break
    }
    parts.push({ bad: true, t: rest.slice(s + 1, e) })
    rest = rest.slice(e + 1)
  }
  return (
    <span className="msg-text">
      {parts.map((p, i) =>
        p.bad ? (
          <span
            key={i}
            className={`bad-word ${revealed[i] ? 'shown' : ''}`}
            onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
            title="탭하면 보기"
          >
            {p.t}
          </span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </span>
  )
}

export default function Chat({
  messages,
  nickname,
  online,
  channels,
  channel,
  onChannel,
  onSend,
}: Props) {
  const { lang, t } = useLang()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, channel])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  const cur = channels.find((c) => c.ticker === channel)
  const placeholder = nickname
    ? channel
      ? buildingPh(lang, cur?.label ?? channel)
      : t('phPlaza')
    : t('phSetNick')

  return (
    <div className="chat">
      <div className="chat-head">
        <span className="live-dot" />
        <span>
          {channel ? cur?.label : t('plaza')}
          {t('chatSuffix')}
        </span>
        <span className="online-badge" title="현재 접속자">
          <iconify-icon icon="solar:users-group-rounded-bold" /> {online}
        </span>
      </div>

      <div className="chan-tabs">
        {channels.map((c) => (
          <button
            key={c.ticker || '__plaza'}
            className={`chan-tab ${c.ticker === channel ? 'sel' : ''}`}
            onClick={() => onChannel(c.ticker)}
          >
            {c.ticker === '' ? (
              <iconify-icon icon="solar:city-bold" />
            ) : null}{' '}
            {c.label}
            {c.ticker !== '' && <span className="chan-count">{c.count}</span>}
          </button>
        ))}
      </div>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-empty">
            {channel ? t('chatEmptyBuilding') : t('chatEmptyPlaza')}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.nickname === nickname && nickname
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              <span className="msg-nick">{m.nickname}</span>
              <MessageText text={m.text} />
            </div>
          )
        })}
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
        />
        <button type="submit">전송</button>
      </form>
    </div>
  )
}
