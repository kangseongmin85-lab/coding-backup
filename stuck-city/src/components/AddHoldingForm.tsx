import { useEffect, useRef, useState } from 'react'
import { Holding } from '../types'
import { searchSymbols, SymbolHit } from '../searchService'
import Character, { CHAR_TYPES, CharType } from './Character'
import { useLang } from '../i18n'

type NewHolding = Omit<Holding, 'id' | 'createdAt' | 'ownerId'>

type Props = {
  nickname: string
  onAdd: (h: NewHolding) => void
}

export default function AddHoldingForm({ nickname, onAdd }: Props) {
  const { t } = useLang()
  const [ticker, setTicker] = useState('')
  const [symbol, setSymbol] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [message, setMessage] = useState('')
  const [charType, setCharType] = useState<CharType>('ant')

  const [results, setResults] = useState<SymbolHit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const skipNext = useRef(false)
  const latestResults = useRef<SymbolHit[]>([])

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    const q = ticker.trim()
    if (q.length < 1) {
      setResults([])
      setOpen(false)
      return
    }
    setSearching(true)
    const id = window.setTimeout(async () => {
      const hits = await searchSymbols(q)
      latestResults.current = hits
      setResults(hits)
      setOpen(hits.length > 0)
      setSearching(false)
    }, 300)
    return () => window.clearTimeout(id)
  }, [ticker])

  function pick(hit: SymbolHit) {
    skipNext.current = true
    setTicker(hit.name)
    setSymbol(hit.symbol)
    setOpen(false)
    setResults([])
  }

  function onTickerChange(v: string) {
    setTicker(v)
    setSymbol('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const avg = Number(avgPrice)
    const qty = Number(quantity)
    if (!ticker.trim() || !avg || avg <= 0) return
    const sym = symbol || latestResults.current[0]?.symbol || undefined
    onAdd({
      ticker: ticker.trim(),
      symbol: sym,
      charType,
      avgPrice: avg,
      quantity: qty || 0,
      nickname: nickname || '익명개미',
      message: message.trim(),
    })
    setTicker('')
    setSymbol('')
    setAvgPrice('')
    setQuantity('')
    setMessage('')
    setResults([])
  }

  return (
    <form className="add-form" onSubmit={submit} autoComplete="off">
      <div className="search-wrap">
        <input
          placeholder={t('searchPh')}
          value={ticker}
          onChange={(e) => onTickerChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {searching && <span className="search-spin">검색 중…</span>}
        {symbol && (
          <span className="symbol-chip" title="자동 매칭된 종목 코드">
            <iconify-icon icon="solar:check-circle-bold" /> {symbol}
          </span>
        )}
        {open && results.length > 0 && (
          <ul className="search-results">
            {results.map((r) => (
              <li
                key={r.symbol}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(r)
                }}
              >
                <span className="sr-name">{r.name}</span>
                <span className="sr-meta">
                  {r.symbol}
                  {r.exch ? ` · ${r.exch}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="form-hint">{t('formHint')}</p>

      {/* 캐릭터 선택 */}
      <div className="char-picker">
        {CHAR_TYPES.map((ct: CharType) => (
          <button
            type="button"
            key={ct}
            className={`char-opt ${charType === ct ? 'sel' : ''}`}
            onClick={() => setCharType(ct)}
            title={t('char_' + ct)}
          >
            <Character type={ct} mood="chill" size={34} />
            <span>{t('char_' + ct)}</span>
          </button>
        ))}
      </div>

      <div className="form-row">
        <input
          type="number"
          inputMode="decimal"
          placeholder={t('avgPh')}
          value={avgPrice}
          onChange={(e) => setAvgPrice(e.target.value)}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder={t('qtyPh')}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <input
        placeholder={t('msgPh')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button type="submit">
        <iconify-icon icon="solar:buildings-3-bold" /> {t('moveIn')}
      </button>
    </form>
  )
}
