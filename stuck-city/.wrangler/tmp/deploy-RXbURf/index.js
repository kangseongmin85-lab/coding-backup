var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
import { DurableObject } from "cloudflare:workers";
var STATE_VERSION = 2;
function seedState() {
  return {
    version: STATE_VERSION,
    holdings: [],
    prices: {},
    symbols: {},
    messages: [
      {
        id: "welcome",
        nickname: "\uC2DC\uC2A4\uD15C",
        ticker: "",
        text: '\uBB3C\uB9BC \uC2DC\uD2F0\uC5D0 \uC624\uC2E0 \uAC78 \uD658\uC601\uD569\uB2C8\uB2E4! "\uC785\uC8FC\uD558\uAE30"\uB85C \uC885\uBAA9\uACFC \uD3C9\uB2E8\uC744 \uC62C\uB824\uBCF4\uC138\uC694 \u{1F3D9}\uFE0F',
        createdAt: 0
      }
    ],
    lastPriceUpdate: 0
  };
}
__name(seedState, "seedState");
var CityDO = class extends DurableObject {
  static {
    __name(this, "CityDO");
  }
  state;
  constructor(ctx, env) {
    super(ctx, env);
    this.state = seedState();
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get("state");
      if (saved && saved.version === STATE_VERSION) {
        this.state = saved;
      } else {
        await ctx.storage.put("state", this.state);
      }
      if (await ctx.storage.getAlarm() == null) {
        await ctx.storage.setAlarm(Date.now() + 4e3);
      }
    });
  }
  async fetch(request) {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "state", state: this.state }));
      return new Response(null, { status: 101, webSocket: client });
    }
    return Response.json(this.state);
  }
  async webSocketMessage(_ws, message) {
    let msg;
    try {
      msg = JSON.parse(typeof message === "string" ? message : "");
    } catch {
      return;
    }
    await this.handle(msg);
  }
  pushMsg(nickname, ticker, text) {
    this.state.messages.push({
      id: crypto.randomUUID(),
      nickname,
      ticker,
      text,
      createdAt: Date.now()
    });
  }
  async handle(msg) {
    const s = this.state;
    switch (msg?.t) {
      case "add": {
        const h = msg.holding ?? {};
        if (!h.ticker || !(h.avgPrice > 0)) return;
        const holding = {
          id: crypto.randomUUID(),
          ticker: String(h.ticker).slice(0, 24),
          symbol: h.symbol ? String(h.symbol).slice(0, 20) : void 0,
          nickname: String(h.nickname || "\uC775\uBA85\uAC1C\uBBF8").slice(0, 20),
          avgPrice: Number(h.avgPrice),
          quantity: Number(h.quantity) || 0,
          message: String(h.message || "").slice(0, 60),
          createdAt: Date.now()
        };
        s.holdings.push(holding);
        if (s.prices[holding.ticker] == null) s.prices[holding.ticker] = holding.avgPrice;
        if (holding.symbol) s.symbols[holding.ticker] = holding.symbol;
        this.pushMsg(holding.nickname, holding.ticker, String(msg.entryText || `${holding.ticker} \uC785\uC8FC!`).slice(0, 80));
        break;
      }
      case "chat": {
        this.pushMsg(
          String(msg.nickname || "\uC775\uBA85\uAC1C\uBBF8").slice(0, 20),
          String(msg.ticker || "").slice(0, 24),
          String(msg.text || "").slice(0, 200)
        );
        break;
      }
      case "price": {
        const p = Number(msg.price);
        if (msg.ticker && p > 0) s.prices[String(msg.ticker)] = p;
        break;
      }
      case "updatePrices": {
        await this.updatePrices();
        break;
      }
      default:
        return;
    }
    if (s.holdings.length > 300) s.holdings = s.holdings.slice(-300);
    if (s.messages.length > 120) s.messages = s.messages.slice(-120);
    await this.persistAndBroadcast();
  }
  async persistAndBroadcast() {
    await this.ctx.storage.put("state", this.state);
    const snap = JSON.stringify({ type: "state", state: this.state });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(snap);
      } catch {
      }
    }
  }
  async updatePrices() {
    const tickers = new Set(this.state.holdings.map((h) => h.ticker));
    const entries = Object.entries(this.state.symbols).filter(([t]) => tickers.has(t));
    const report = [];
    for (const [ticker, sym] of entries) {
      try {
        const v = await fetchPrevClose(sym);
        if (Number.isFinite(v)) {
          this.state.prices[ticker] = Math.round(v * 100) / 100;
          report.push(`${ticker} ${this.state.prices[ticker]}`);
        }
      } catch {
      }
    }
    this.state.lastPriceUpdate = Date.now();
    if (report.length) this.pushMsg("\uC2DC\uC2A4\uD15C", "", `\u{1F4C8} \uC804\uC77C \uC885\uAC00 \uAC31\uC2E0 \u2014 ${report.join(" \xB7 ")}`);
  }
  async alarm() {
    await this.updatePrices();
    await this.persistAndBroadcast();
    await this.ctx.storage.setAlarm(Date.now() + 24 * 3600 * 1e3);
  }
};
async function fetchPrevClose(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=5d&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const v = meta?.chartPreviousClose ?? meta?.previousClose ?? meta?.regularMarketPrice;
  if (typeof v !== "number") throw new Error("parse");
  return v;
}
__name(fetchPrevClose, "fetchPrevClose");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ws" || url.pathname === "/api/state") {
      const room = url.searchParams.get("room") || "global";
      return env.CITY.getByName(room).fetch(request);
    }
    if (url.pathname === "/api/search") {
      return handleSearch(url.searchParams.get("q") || "");
    }
    return env.ASSETS.fetch(request);
  }
};
async function handleSearch(q) {
  const cors = { "Access-Control-Allow-Origin": "*" };
  if (!q.trim()) return Response.json({ results: [] }, { headers: cors });
  try {
    const naver = await searchNaver(q);
    if (naver.length) return Response.json({ results: naver }, { headers: cors });
  } catch {
  }
  try {
    const yh = await searchYahoo(q);
    return Response.json({ results: yh }, { headers: cors });
  } catch (e) {
    return Response.json(
      { results: [], error: String(e?.message || e) },
      { headers: cors }
    );
  }
}
__name(handleSearch, "handleSearch");
function naverToYahoo(code, typeCode, nation) {
  if (nation === "KOR") return `${code}.${typeCode === "KOSDAQ" ? "KQ" : "KS"}`;
  return code;
}
__name(naverToYahoo, "naverToYahoo");
async function searchNaver(q) {
  const u = `https://m.stock.naver.com/front-api/search/autoComplete?query=${encodeURIComponent(
    q
  )}&target=stock,index,marketValue`;
  const r = await fetch(u, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://m.stock.naver.com/" }
  });
  if (!r.ok) throw new Error(`naver ${r.status}`);
  const d = await r.json();
  const items = d?.result?.items || [];
  return items.filter((x) => x.category === "stock" && x.code && x.name).map((x) => ({
    symbol: naverToYahoo(x.code, x.typeCode, x.nationCode),
    name: x.name,
    exch: x.typeName || x.typeCode || "",
    type: x.nationCode
  })).slice(0, 8);
}
__name(searchNaver, "searchNaver");
async function searchYahoo(q) {
  const y = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=8&newsCount=0`;
  const r = await fetch(y, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }
  });
  if (!r.ok) throw new Error(`yahoo ${r.status}`);
  const data = await r.json();
  return (data.quotes || []).filter(
    (x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF" || x.quoteType === "INDEX")
  ).map((x) => ({
    symbol: x.symbol,
    name: x.shortname || x.longname || x.symbol,
    exch: x.exchDisp || x.exchange || "",
    type: x.quoteType
  })).slice(0, 8);
}
__name(searchYahoo, "searchYahoo");
export {
  CityDO,
  index_default as default
};
//# sourceMappingURL=index.js.map
