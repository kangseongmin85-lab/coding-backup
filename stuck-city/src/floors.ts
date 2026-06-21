import { Building, Holding } from './types'

export const DEFAULT_FLOORS = 12
export const MIN_FLOORS = 9
export const MAX_FLOORS = 16

// 한 건물 안의 모든 가격(평단들 + 기준가/시가)을 floorCount 범위로 정규화한다.
export function priceRange(b: Building) {
  const prices = [b.currentPrice, ...b.holdings.map((h) => h.avgPrice)].filter(
    (p) => p > 0,
  )
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = (max - min) * 0.08 || max * 0.05 || 1
  return { low: min - pad, high: max + pad }
}

// 평단/시가 → 층. 가장 비싼 가격이 위층, 싼 가격이 아래층.
export function floorOf(price: number, b: Building): number {
  const fc = b.floorCount || DEFAULT_FLOORS
  if (!Number.isFinite(price)) return Math.ceil(fc / 2)
  const { low, high } = priceRange(b)
  if (high === low || !Number.isFinite(high) || !Number.isFinite(low))
    return Math.ceil(fc / 2)
  const ratio = (price - low) / (high - low)
  const floor = Math.round(ratio * (fc - 1)) + 1
  if (!Number.isFinite(floor)) return Math.ceil(fc / 2)
  return Math.min(fc, Math.max(1, floor))
}

export function isStuck(h: Holding, currentPrice: number): boolean {
  return h.avgPrice > currentPrice
}

export function pnlPercent(h: Holding, currentPrice: number): number {
  if (!h.avgPrice) return 0
  return ((currentPrice - h.avgPrice) / h.avgPrice) * 100
}

// 시가총액(원 환산) → 건물 층수. 로그 압축으로 차이를 작게(한 화면에 다 보이게).
// 약 1000억(1e11) → MIN, 약 1500조(1.5e15) → MAX.
function floorCountFromCap(cap: number): number {
  if (!cap || cap <= 0) return DEFAULT_FLOORS
  const lo = 11 // log10(1e11) = 1000억
  const hi = 15.2 // log10(약 1500조)
  const t = (Math.log10(cap) - lo) / (hi - lo)
  const f = MIN_FLOORS + t * (MAX_FLOORS - MIN_FLOORS)
  return Math.round(Math.min(MAX_FLOORS, Math.max(MIN_FLOORS, f)))
}

export function groupByTicker(
  holdings: Holding[],
  prices: Record<string, number>,
  marketCaps: Record<string, number> = {},
  names: Record<string, string> = {},
): Building[] {
  const map = new Map<string, Holding[]>()
  for (const h of holdings) {
    const arr = map.get(h.ticker) ?? []
    arr.push(h)
    map.set(h.ticker, arr)
  }
  return Array.from(map.entries())
    .map(([ticker, hs]) => {
      const sorted = hs.slice().sort((a, b) => b.avgPrice - a.avgPrice)
      let currentPrice = prices[ticker] ?? 0
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        const mid = sorted[Math.floor(sorted.length / 2)]
        currentPrice = mid ? mid.avgPrice : 0
      }
      return {
        ticker,
        nameEn: names[ticker],
        currentPrice,
        holdings: sorted,
        floorCount: floorCountFromCap(marketCaps[ticker]),
      }
    })
    .sort((a, b) => b.holdings.length - a.holdings.length)
}
