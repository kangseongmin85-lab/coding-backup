var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
import { DurableObject } from "cloudflare:workers";
function seedState() {
  const now = Date.now();
  const holdings = [
    { id: "s1", ticker: "\uD14C\uC2AC\uB77C", symbol: "TSLA", avgPrice: 380, quantity: 10, nickname: "\uC874\uBC84\uD0B9", message: "", createdAt: now },
    { id: "s2", ticker: "\uD14C\uC2AC\uB77C", symbol: "TSLA", avgPrice: 250, quantity: 5, nickname: "\uCD94\uB9E4\uC694\uC815", message: "", createdAt: now },
    { id: "s3", ticker: "\uD14C\uC2AC\uB77C", symbol: "TSLA", avgPrice: 180, quantity: 20, nickname: "\uB290\uAE0B\uC774", message: "", createdAt: now },
    { id: "s4", ticker: "\uC5D4\uBE44\uB514\uC544", symbol: "NVDA", avgPrice: 1400, quantity: 3, nickname: "\uAF2D\uB300\uAE30\uB9E8", message: "", createdAt: now },
    { id: "s5", ticker: "\uC5D4\uBE44\uB514\uC544", symbol: "NVDA", avgPrice: 900, quantity: 8, nickname: "\uAD6D\uBC25\uB7EC", message: "", createdAt: now },
    { id: "s6", ticker: "\uC0BC\uC131\uC804\uC790", symbol: "005930.KS", avgPrice: 78e3, quantity: 100, nickname: "\uB3D9\uD559\uAC1C\uBBF8", message: "", createdAt: now },
    { id: "s7", ticker: "\uC0BC\uC131\uC804\uC790", symbol: "005930.KS", avgPrice: 55e3, quantity: 50, nickname: "\uAD6D\uBC25\uC8FCbeliever", message: "", createdAt: now }
  ];
  return {
    holdings,
    prices: { \uD14C\uC2AC\uB77C: 300, \uC5D4\uBE44\uB514\uC544: 1100, \uC0BC\uC131\uC804\uC790: 6e4 },
    symbols: { \uD14C\uC2AC\uB77C: "TSLA", \uC5D4\uBE44\uB514\uC544: "NVDA", \uC0BC\uC131\uC804\uC790: "005930.KS" },
    messages: [
      { id: "m0", nickname: "\uC2DC\uC2A4\uD15C", ticker: "", text: "\uBB3C\uB9BC \uC2DC\uD2F0\uC5D0 \uC624\uC2E0 \uAC78 \uD658\uC601\uD569\uB2C8\uB2E4! \uB2E4 \uAC19\uC774 \uBB3C\uB824\uBD05\uC2DC\uB2E4 \u{1F3D9}\uFE0F", createdAt: now }
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
      if (saved) {
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
    return env.ASSETS.fetch(request);
  }
};
export {
  CityDO,
  index_default as default
};
//# sourceMappingURL=index.js.map
