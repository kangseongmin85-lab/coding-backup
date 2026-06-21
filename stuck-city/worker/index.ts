import { DurableObject } from 'cloudflare:workers'

export interface Env {
  ASSETS: Fetcher
  CITY: DurableObjectNamespace<CityDO>
}

type Holding = {
  id: string
  ticker: string
  symbol?: string // 네이버 reutersCode (예: 005930, TSLA.O)
  ownerId: string // 작성자 식별
  charType?: string
  nickname: string
  avgPrice: number
  quantity: number
  message: string
  createdAt: number
}
type ChatMessage = {
  id: string
  nickname: string
  ticker: string
  text: string
  createdAt: number
}
type CityState = {
  version: number
  holdings: Holding[]
  prices: Record<string, number> // ticker -> 금일 시가
  marketCaps: Record<string, number> // ticker -> 시총(원 환산)
  names: Record<string, string> // ticker(한글) -> 영문명
  messages: ChatMessage[]
  lastPriceUpdate: number
}

const STATE_VERSION = 3

function seedState(): CityState {
  return {
    version: STATE_VERSION,
    holdings: [],
    prices: {},
    marketCaps: {},
    names: {},
    messages: [],
    lastPriceUpdate: 0,
  }
}

const NAVER_H = {
  'User-Agent': 'Mozilla/5.0',
  Referer: 'https://m.stock.naver.com/',
  Accept: 'application/json',
}

export class CityDO extends DurableObject<Env> {
  state: CityState

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.state = seedState()
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<CityState>('state')
      if (saved && saved.version === STATE_VERSION) {
        this.state = saved
        if (!this.state.names) this.state.names = {} // 구버전 보정
      } else await ctx.storage.put('state', this.state)
      if ((await ctx.storage.getAlarm()) == null) {
        await ctx.storage.setAlarm(Date.now() + 4000)
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.ctx.acceptWebSocket(server)
      server.send(this.snapshot())
      this.broadcast() // 접속자 수 갱신을 모두에게
      return new Response(null, { status: 101, webSocket: client })
    }
    return Response.json(this.state)
  }

  async webSocketClose() {
    this.broadcast() // 나가면 접속자 수 갱신
  }

  private snapshot(): string {
    return JSON.stringify({
      type: 'state',
      state: this.state,
      online: this.ctx.getWebSockets().length,
    })
  }

  private broadcast() {
    const snap = this.snapshot()
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(snap)
      } catch {
        /* ignore */
      }
    }
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer) {
    let msg: any
    try {
      msg = JSON.parse(typeof message === 'string' ? message : '')
    } catch {
      return
    }
    await this.handle(msg)
  }

  private async handle(msg: any) {
    const s = this.state
    switch (msg?.t) {
      case 'add': {
        const h = msg.holding ?? {}
        if (!h.ticker || !(h.avgPrice > 0) || !h.ownerId) return
        const holding: Holding = {
          id: crypto.randomUUID(),
          ticker: String(h.ticker).slice(0, 24),
          symbol: h.symbol ? String(h.symbol).slice(0, 20) : undefined,
          ownerId: String(h.ownerId).slice(0, 40),
          charType: h.charType ? String(h.charType).slice(0, 16) : undefined,
          nickname: String(h.nickname || '익명개미').slice(0, 20),
          avgPrice: Number(h.avgPrice),
          quantity: Number(h.quantity) || 0,
          message: String(h.message || '').slice(0, 60),
          createdAt: Date.now(),
        }
        s.holdings.push(holding)
        if (s.holdings.length > 600) s.holdings = s.holdings.slice(-600)
        // 입주 즉시 시가/시총 자동 반영 (클릭 불필요)
        if (holding.symbol) {
          await this.updateOne(holding.ticker, holding.symbol)
        } else if (s.prices[holding.ticker] == null) {
          s.prices[holding.ticker] = holding.avgPrice
        }
        break
      }
      case 'edit': {
        // 본인 보유만 수정 (평단/수량/말풍선/캐릭터)
        const h = s.holdings.find(
          (x) => x.id === msg.holdingId && x.ownerId === msg.ownerId,
        )
        if (!h) return
        if (msg.avgPrice > 0) h.avgPrice = Number(msg.avgPrice)
        if (msg.quantity != null) h.quantity = Number(msg.quantity) || 0
        if (typeof msg.message === 'string') h.message = msg.message.slice(0, 60)
        if (msg.charType) h.charType = String(msg.charType).slice(0, 16)
        break
      }
      case 'remove': {
        // 본인이 만든 것만 삭제 가능
        s.holdings = s.holdings.filter(
          (x) => !(x.id === msg.holdingId && x.ownerId === msg.ownerId),
        )
        // 아무도 없는 종목 정리
        const live = new Set(s.holdings.map((x) => x.ticker))
        for (const t of Object.keys(s.prices)) if (!live.has(t)) delete s.prices[t]
        for (const t of Object.keys(s.marketCaps)) if (!live.has(t)) delete s.marketCaps[t]
        for (const t of Object.keys(s.names)) if (!live.has(t)) delete s.names[t]
        break
      }
      case 'chat': {
        // 채팅창에는 사용자가 직접 친 메시지만 + 욕설 블러(서버 강제)
        const raw = String(msg.text || '').trim().slice(0, 200)
        if (!raw) return
        s.messages.push({
          id: crypto.randomUUID(),
          nickname: String(msg.nickname || '익명개미').slice(0, 20),
          ticker: String(msg.ticker || '').slice(0, 24),
          text: maskProfanity(raw),
          createdAt: Date.now(),
        })
        if (s.messages.length > 200) s.messages = s.messages.slice(-200)
        break
      }
      case 'refresh': {
        await this.updateAll()
        break
      }
      default:
        return
    }
    await this.persistAndBroadcast()
  }

  private async persistAndBroadcast() {
    await this.ctx.storage.put('state', this.state)
    this.broadcast()
  }

  private async updateOne(ticker: string, symbol: string) {
    try {
      const info = await fetchNaverInfo(symbol)
      if (info.open > 0) this.state.prices[ticker] = info.open
      if (info.marketCap > 0) this.state.marketCaps[ticker] = info.marketCap
      // 영문명 1회 확보 (US=네이버 stockNameEng, KR=야후 심볼검색)
      if (!this.state.names[ticker]) {
        let en = info.nameEn || ''
        if (!en) {
          try {
            en = await yahooEnglishName(symbol)
          } catch {
            /* 무시 */
          }
        }
        if (en) this.state.names[ticker] = en
      }
    } catch {
      /* 실패 시 기존 값 유지 */
    }
  }

  private async updateAll() {
    const seen = new Map<string, string>() // ticker -> symbol
    for (const h of this.state.holdings) if (h.symbol) seen.set(h.ticker, h.symbol)
    for (const [ticker, symbol] of seen) await this.updateOne(ticker, symbol)
    this.state.lastPriceUpdate = Date.now()
  }

  async alarm() {
    await this.updateAll()
    await this.persistAndBroadcast()
    // 장중 시가 반영을 위해 주기적 갱신 (3시간)
    await this.ctx.storage.setAlarm(Date.now() + 3 * 3600 * 1000)
  }
}

// ── 네이버 시가/시총 (한국 integration, 해외 basic) ──
function naverNum(s: any): number {
  if (s == null) return 0
  return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0
}

// "1,990조 6,579억" / "1조 5,198억 USD" → 원 환산 숫자
function parseMarketCap(s: any): number {
  if (!s) return 0
  const str = String(s)
  const usd = /USD|\$/i.test(str)
  const jo = str.match(/([\d,]+)\s*조/)
  const eok = str.match(/([\d,]+)\s*억/)
  let v = 0
  if (jo) v += parseFloat(jo[1].replace(/,/g, '')) * 1e12
  if (eok) v += parseFloat(eok[1].replace(/,/g, '')) * 1e8
  if (!jo && !eok) v = naverNum(str)
  if (usd) v *= 1350 // USD → KRW 대략 환산 (비교용)
  return v
}

async function fetchNaverInfo(
  reuters: string,
): Promise<{ open: number; marketCap: number; nameEn: string }> {
  const isKR = /^[0-9]+$/.test(reuters)
  const url = isKR
    ? `https://m.stock.naver.com/api/stock/${reuters}/integration`
    : `https://api.stock.naver.com/stock/${encodeURIComponent(reuters)}/basic`
  const r = await fetch(url, { headers: NAVER_H })
  if (!r.ok) throw new Error(`naver ${r.status}`)
  const j: any = await r.json()
  const ti: any[] = j.totalInfos || j.stockItemTotalInfos || []
  const pick = (k: string) => ti.find((t) => t.code === k)?.value
  return {
    open: naverNum(pick('openPrice')),
    marketCap: parseMarketCap(pick('marketValue')),
    nameEn: j.stockNameEng || '', // 해외종목은 영문명 제공
  }
}

// 영문 종목명 (Yahoo 심볼 검색). KR=6자리 코드, US=티커(.O 제거)
async function yahooEnglishName(reuters: string): Promise<string> {
  const q = /^[0-9]+$/.test(reuters) ? reuters : reuters.split('.')[0]
  const u = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q,
  )}&quotesCount=3&newsCount=0`
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) return ''
  const d: any = await r.json()
  const hit = (d.quotes || []).find((x: any) => x.symbol)
  return hit ? hit.shortname || hit.longname || '' : ''
}

// ── 욕설 블러 (서버 강제). 걸린 단어를 .. 로 감싸 클라가 블러 처리 ──
const SEP = '[\\s.,~^*\\-_=]*'
const BAD_WORDS = [
  ['시', '발'], ['씨', '발'], ['시', '벌'], ['씨', '벌'], ['시', '바'], ['씨', '바'], ['시', '팔'],
  ['병', '신'], ['븅', '신'], ['병', '딱'],
  ['지', '랄'], ['지', '럴'],
  ['개', '새', '끼'], ['개', '색', '기'], ['개', '세', '끼'], ['새', '끼'], ['쌔', '끼'],
  ['좆'], ['좇'], ['존', '나'], ['존', '내'], ['좀', '같'],
  ['엿', '먹'], ['닥', '쳐'], ['꺼', '져'],
  ['느', '금', '마'], ['앰', '창'], ['니', '애', '미'], ['애', '미'],
  ['썅'], ['쌍', '놈'], ['창', '녀'], ['걸', '레'], ['보', '지'], ['자', '지'],
]
const BAD_SINGLES = [
  'ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅄ', 'ㅈㄹ', 'ㄲㅈ', 'tlqkf', 'qudtls',
  'fuck', 'fxck', 'shit', 'bitch', 'asshole', 'dick',
]
function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const BAD_RE = new RegExp(
  [...BAD_WORDS.map((w) => w.join(SEP)), ...BAD_SINGLES.map(escapeRe)].join('|'),
  'gi',
)
function maskProfanity(text: string): string {
  return text.replace(BAD_RE, (m) => `${m}`)
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/ws' || url.pathname === '/api/state') {
      const room = url.searchParams.get('room') || 'global'
      return env.CITY.getByName(room).fetch(request)
    }
    if (url.pathname === '/api/search') {
      return handleSearch(url.searchParams.get('q') || '')
    }
    if (url.pathname === '/api/weather') {
      return handleWeather(request, url)
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

// ── 접속 지역 날씨 (Cloudflare geo + Open-Meteo, 무료/키 불필요) ──
function wmoToCategory(c: number): string {
  if (c <= 1) return 'clear' // 0 맑음, 1 대체로 맑음
  if (c <= 48) return 'cloud' // 2,3 구름, 45,48 안개
  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'snow'
  return 'rain' // 51~67 비, 80~82 소나기, 95~99 뇌우 등
}

async function handleWeather(request: Request, url: URL): Promise<Response> {
  const cors = { 'Access-Control-Allow-Origin': '*' }
  const cf: any = (request as any).cf || {}
  let lat = url.searchParams.get('lat') || cf.latitude
  let lon = url.searchParams.get('lon') || cf.longitude
  const city = url.searchParams.get('city') || cf.city || null
  if (!lat || !lon) {
    lat = '37.5665' // 폴백: 서울 (로컬 dev엔 geo 없음)
    lon = '126.9780'
  }
  try {
    const wu = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day,temperature_2m`
    const r = await fetch(wu)
    if (!r.ok) throw new Error(`open-meteo ${r.status}`)
    const d: any = await r.json()
    const code = d?.current?.weather_code ?? 0
    return Response.json(
      {
        weather: wmoToCategory(code),
        isDay: (d?.current?.is_day ?? 1) === 1,
        temp: d?.current?.temperature_2m ?? null,
        city,
      },
      { headers: cors },
    )
  } catch (e: any) {
    return Response.json(
      { weather: 'clear', isDay: true, city, error: String(e?.message || e) },
      { headers: cors },
    )
  }
}

// ── 종목명 검색 (네이버 자동완성, 한글 OK) → reutersCode 반환 ──
type Hit = { symbol: string; name: string; exch: string; type?: string }

async function handleSearch(q: string): Promise<Response> {
  const cors = { 'Access-Control-Allow-Origin': '*' }
  if (!q.trim()) return Response.json({ results: [] }, { headers: cors })
  try {
    const u = `https://m.stock.naver.com/front-api/search/autoComplete?query=${encodeURIComponent(
      q,
    )}&target=stock`
    const r = await fetch(u, { headers: NAVER_H })
    if (!r.ok) throw new Error(`naver ${r.status}`)
    const d: any = await r.json()
    const items: any[] = d?.result?.items || []
    const results: Hit[] = items
      .filter((x) => x.category === 'stock' && x.reutersCode && x.name)
      .map((x) => ({
        symbol: x.reutersCode, // 가격/시총 조회 키
        name: x.name, // 한국어 종목명
        exch: x.typeName || x.typeCode || '',
        type: x.nationCode,
      }))
      .slice(0, 8)
    return Response.json({ results }, { headers: cors })
  } catch (e: any) {
    return Response.json(
      { results: [], error: String(e?.message || e) },
      { headers: cors },
    )
  }
}
