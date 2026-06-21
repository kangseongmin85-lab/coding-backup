import { useState } from 'react'
import { Holding } from '../types'
import Character, { CHAR_TYPES, CharType } from './Character'
import { useLang } from '../i18n'

type Props = {
  holding: Holding
  onSave: (fields: {
    avgPrice: number
    quantity: number
    message: string
    charType: CharType
  }) => void
}

export default function EditHoldingForm({ holding, onSave }: Props) {
  const { t } = useLang()
  const [avgPrice, setAvgPrice] = useState(String(holding.avgPrice))
  const [quantity, setQuantity] = useState(String(holding.quantity || ''))
  const [message, setMessage] = useState(holding.message || '')
  const [charType, setCharType] = useState<CharType>(
    (holding.charType as CharType) || 'ant',
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const avg = Number(avgPrice)
    if (!avg || avg <= 0) return
    onSave({ avgPrice: avg, quantity: Number(quantity) || 0, message: message.trim(), charType })
  }

  return (
    <form className="add-form" onSubmit={submit} autoComplete="off">
      <div className="edit-ticker">{holding.ticker}</div>
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
          autoFocus
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
        <iconify-icon icon="solar:diskette-bold" /> {t('save')}
      </button>
    </form>
  )
}
