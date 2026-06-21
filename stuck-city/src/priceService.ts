// 무료 주가 조회. Yahoo Finance 비공식 엔드포인트를 CORS 프록시 경유로 호출.
// - prevClose: 전일 종가 (무료로 안정적으로 얻을 수 있음)
// - price: 최근 체결가 (무료는 보통 15분 지연 — 진짜 실시간 아님)
//
// 프록시(allorigins)는 무료라 가끔 느리거나 막힐 수 있음 → 실패 시 수동 입력으로 폴백.

const PROXY = 'https://api.allorigins.win/raw?url='

export type Quote = {
  symbol: string
  price: number // 최근가(지연 가능)
  prevClose: number // 전일 종가
  currency?: string
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=5d&interval=1d`
  const res = await fetch(PROXY + encodeURIComponent(target), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error('quote parse failed')
  }
  return {
    symbol,
    price: meta.regularMarketPrice,
    prevClose:
      typeof meta.chartPreviousClose === 'number'
        ? meta.chartPreviousClose
        : meta.previousClose ?? meta.regularMarketPrice,
    currency: meta.currency,
  }
}

// 여러 종목을 동시에 (실패는 개별 무시)
export async function fetchQuotes(
  symbols: string[],
): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {}
  await Promise.all(
    symbols.map(async (s) => {
      try {
        out[s] = await fetchQuote(s)
      } catch {
        /* 개별 실패 무시 */
      }
    }),
  )
  return out
}
