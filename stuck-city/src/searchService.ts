// 종목명 → 야후 심볼 검색. 서버(Worker) 우선, 실패 시 무료 프록시로 폴백.

export type SymbolHit = {
  symbol: string
  name: string
  exch: string
  type?: string
}

function apiBase(): string {
  return import.meta.env.DEV ? 'http://localhost:8787' : ''
}

async function viaWorker(q: string): Promise<SymbolHit[]> {
  const r = await fetch(`${apiBase()}/api/search?q=${encodeURIComponent(q)}`)
  if (!r.ok) throw new Error(`http ${r.status}`)
  const data = await r.json()
  return data.results ?? []
}

// 오프라인(서버 없음) 폴백: 네이버 자동완성을 무료 프록시로 (한글 지원)
async function viaProxy(q: string): Promise<SymbolHit[]> {
  const naver = `https://m.stock.naver.com/front-api/search/autoComplete?query=${encodeURIComponent(
    q,
  )}&target=stock`
  const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(naver))
  if (!r.ok) throw new Error(`http ${r.status}`)
  const data = await r.json()
  const items: any[] = data?.result?.items || []
  return items
    .filter((x) => x.category === 'stock' && x.code && x.name)
    .map((x) => ({
      symbol:
        x.nationCode === 'KOR'
          ? `${x.code}.${x.typeCode === 'KOSDAQ' ? 'KQ' : 'KS'}`
          : x.code,
      name: x.name,
      exch: x.typeName || x.typeCode || '',
      type: x.nationCode,
    }))
    .slice(0, 8)
}

export async function searchSymbols(q: string): Promise<SymbolHit[]> {
  const query = q.trim()
  if (!query) return []
  try {
    return await viaWorker(query)
  } catch {
    try {
      return await viaProxy(query)
    } catch {
      return []
    }
  }
}
