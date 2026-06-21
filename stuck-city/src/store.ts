import { Holding, ChatMessage } from './types'

const HOLDINGS_KEY = 'stuck-city:holdings'
const PRICES_KEY = 'stuck-city:prices'      // ticker -> currentPrice
const NICK_KEY = 'stuck-city:nickname'
const CHAT_KEY = 'stuck-city:chat'
const SYMBOLS_KEY = 'stuck-city:symbols'    // ticker -> 야후 심볼

export function loadSymbols(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SYMBOLS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveSymbols(s: Record<string, string>) {
  localStorage.setItem(SYMBOLS_KEY, JSON.stringify(s))
}

export function seedSymbols(): Record<string, string> {
  return {}
}

export function loadMessages(): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(CHAT_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveMessages(msgs: ChatMessage[]) {
  // 최근 200개만 보관
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-200)))
}

export function seedMessages(): ChatMessage[] {
  return [
    {
      id: 'welcome',
      nickname: '시스템',
      ticker: '',
      text: '물림 시티에 오신 걸 환영합니다! "입주하기"로 종목과 평단을 올려보세요 🏙️',
      createdAt: Date.now(),
    },
  ]
}

export function loadHoldings(): Holding[] {
  try {
    return JSON.parse(localStorage.getItem(HOLDINGS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveHoldings(holdings: Holding[]) {
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings))
}

export function loadPrices(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PRICES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function savePrices(prices: Record<string, number>) {
  localStorage.setItem(PRICES_KEY, JSON.stringify(prices))
}

export function loadNickname(): string {
  return localStorage.getItem(NICK_KEY) ?? ''
}

export function saveNickname(nick: string) {
  localStorage.setItem(NICK_KEY, nick)
}

const UID_KEY = 'stuck-city:uid'
export function ensureUserId(): string {
  let id = localStorage.getItem(UID_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'u' + Date.now() + Math.random().toString(36).slice(2)
    localStorage.setItem(UID_KEY, id)
  }
  return id
}

// 기본은 빈 도시 — 입주는 직접.
export function seedHoldings(): Holding[] {
  return []
}

export function seedPrices(): Record<string, number> {
  return {}
}
