var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
import { DurableObject } from "cloudflare:workers";
var STATE_VERSION = 3;
function seedState() {
  return {
    version: STATE_VERSION,
    holdings: [],
    prices: {},
    marketCaps: {},
    names: {},
    messages: [],
    lastPriceUpdate: 0
  };
}
__name(seedState, "seedState");
var NAVER_H = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://m.stock.naver.com/",
  Accept: "application/json"
};
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
        if (!this.state.names) this.state.names = {};
      } else await ctx.storage.put("state", this.state);
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
      server.send(this.snapshot());
      this.broadcast();
      return new Response(null, { status: 101, webSocket: client });
    }
    return Response.json(this.state);
  }
  async webSocketClose() {
    this.broadcast();
  }
  snapshot() {
    return JSON.stringify({
      type: "state",
      state: this.state,
      online: this.ctx.getWebSockets().length
    });
  }
  broadcast() {
    const snap = this.snapshot();
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(snap);
      } catch {
      }
    }
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
  async handle(msg) {
    const s = this.state;
    switch (msg?.t) {
      case "add": {
        const h = msg.holding ?? {};
        if (!h.ticker || !(h.avgPrice > 0) || !h.ownerId) return;
        const holding = {
          id: crypto.randomUUID(),
          ticker: String(h.ticker).slice(0, 24),
          symbol: h.symbol ? String(h.symbol).slice(0, 20) : void 0,
          ownerId: String(h.ownerId).slice(0, 40),
          charType: h.charType ? String(h.charType).slice(0, 16) : void 0,
          nickname: String(h.nickname || "\uC775\uBA85\uAC1C\uBBF8").slice(0, 20),
          avgPrice: Number(h.avgPrice),
          quantity: Number(h.quantity) || 0,
          message: String(h.message || "").slice(0, 60),
          createdAt: Date.now()
        };
        s.holdings.push(holding);
        if (s.holdings.length > 600) s.holdings = s.holdings.slice(-600);
        if (holding.symbol) {
          await this.updateOne(holding.ticker, holding.symbol);
        } else if (s.prices[holding.ticker] == null) {
          s.prices[holding.ticker] = holding.avgPrice;
        }
        break;
      }
      case "edit": {
        const h = s.holdings.find(
          (x) => x.id === msg.holdingId && x.ownerId === msg.ownerId
        );
        if (!h) return;
        if (msg.avgPrice > 0) h.avgPrice = Number(msg.avgPrice);
        if (msg.quantity != null) h.quantity = Number(msg.quantity) || 0;
        if (typeof msg.message === "string") h.message = msg.message.slice(0, 60);
        if (msg.charType) h.charType = String(msg.charType).slice(0, 16);
        break;
      }
      case "remove": {
        s.holdings = s.holdings.filter(
          (x) => !(x.id === msg.holdingId && x.ownerId === msg.ownerId)
        );
        const live = new Set(s.holdings.map((x) => x.ticker));
        for (const t of Object.keys(s.prices)) if (!live.has(t)) delete s.prices[t];
        for (const t of Object.keys(s.marketCaps)) if (!live.has(t)) delete s.marketCaps[t];
        for (const t of Object.keys(s.names)) if (!live.has(t)) delete s.names[t];
        break;
      }
      case "chat": {
        const raw = String(msg.text || "").trim().slice(0, 200);
        if (!raw) return;
        s.messages.push({
          id: crypto.randomUUID(),
          nickname: String(msg.nickname || "\uC775\uBA85\uAC1C\uBBF8").slice(0, 20),
          ticker: String(msg.ticker || "").slice(0, 24),
          text: maskProfanity(raw),
          createdAt: Date.now()
        });
        if (s.messages.length > 200) s.messages = s.messages.slice(-200);
        break;
      }
      case "refresh": {
        await this.updateAll();
        break;
      }
      default:
        return;
    }
    await this.persistAndBroadcast();
  }
  async persistAndBroadcast() {
    await this.ctx.storage.put("state", this.state);
    this.broadcast();
  }
  async updateOne(ticker, symbol) {
    try {
      const info = await fetchNaverInfo(symbol);
      if (info.open > 0) this.state.prices[ticker] = info.open;
      if (info.marketCap > 0) this.state.marketCaps[ticker] = info.marketCap;
      if (!this.state.names[ticker]) {
        let en = info.nameEn || "";
        if (!en) {
          try {
            en = await yahooEnglishName(symbol);
          } catch {
          }
        }
        if (en) this.state.names[ticker] = en;
      }
    } catch {
    }
  }
  async updateAll() {
    const seen = /* @__PURE__ */ new Map();
    for (const h of this.state.holdings) if (h.symbol) seen.set(h.ticker, h.symbol);
    for (const [ticker, symbol] of seen) await this.updateOne(ticker, symbol);
    this.state.lastPriceUpdate = Date.now();
  }
  async alarm() {
    await this.updateAll();
    await this.persistAndBroadcast();
    await this.ctx.storage.setAlarm(Date.now() + 3 * 3600 * 1e3);
  }
};
function naverNum(s) {
  if (s == null) return 0;
  return parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;
}
__name(naverNum, "naverNum");
function parseMarketCap(s) {
  if (!s) return 0;
  const str = String(s);
  const usd = /USD|\$/i.test(str);
  const jo = str.match(/([\d,]+)\s*조/);
  const eok = str.match(/([\d,]+)\s*억/);
  let v = 0;
  if (jo) v += parseFloat(jo[1].replace(/,/g, "")) * 1e12;
  if (eok) v += parseFloat(eok[1].replace(/,/g, "")) * 1e8;
  if (!jo && !eok) v = naverNum(str);
  if (usd) v *= 1350;
  return v;
}
__name(parseMarketCap, "parseMarketCap");
async function fetchNaverInfo(reuters) {
  const isKR = /^[0-9]+$/.test(reuters);
  const url = isKR ? `https://m.stock.naver.com/api/stock/${reuters}/integration` : `https://api.stock.naver.com/stock/${encodeURIComponent(reuters)}/basic`;
  const r = await fetch(url, { headers: NAVER_H });
  if (!r.ok) throw new Error(`naver ${r.status}`);
  const j = await r.json();
  const ti = j.totalInfos || j.stockItemTotalInfos || [];
  const pick = /* @__PURE__ */ __name((k) => ti.find((t) => t.code === k)?.value, "pick");
  return {
    open: naverNum(pick("openPrice")),
    marketCap: parseMarketCap(pick("marketValue")),
    nameEn: j.stockNameEng || ""
    // 해외종목은 영문명 제공
  };
}
__name(fetchNaverInfo, "fetchNaverInfo");
async function yahooEnglishName(reuters) {
  const q = /^[0-9]+$/.test(reuters) ? reuters : reuters.split(".")[0];
  const u = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=3&newsCount=0`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return "";
  const d = await r.json();
  const hit = (d.quotes || []).find((x) => x.symbol);
  return hit ? hit.shortname || hit.longname || "" : "";
}
__name(yahooEnglishName, "yahooEnglishName");
var SEP = "[\\s.,~^*\\-_=]*";
var BAD_WORDS = [
  ["\uC2DC", "\uBC1C"],
  ["\uC528", "\uBC1C"],
  ["\uC2DC", "\uBC8C"],
  ["\uC528", "\uBC8C"],
  ["\uC2DC", "\uBC14"],
  ["\uC528", "\uBC14"],
  ["\uC2DC", "\uD314"],
  ["\uBCD1", "\uC2E0"],
  ["\uBE05", "\uC2E0"],
  ["\uBCD1", "\uB531"],
  ["\uC9C0", "\uB784"],
  ["\uC9C0", "\uB7F4"],
  ["\uAC1C", "\uC0C8", "\uB07C"],
  ["\uAC1C", "\uC0C9", "\uAE30"],
  ["\uAC1C", "\uC138", "\uB07C"],
  ["\uC0C8", "\uB07C"],
  ["\uC314", "\uB07C"],
  ["\uC886"],
  ["\uC887"],
  ["\uC874", "\uB098"],
  ["\uC874", "\uB0B4"],
  ["\uC880", "\uAC19"],
  ["\uC5FF", "\uBA39"],
  ["\uB2E5", "\uCCD0"],
  ["\uAEBC", "\uC838"],
  ["\uB290", "\uAE08", "\uB9C8"],
  ["\uC570", "\uCC3D"],
  ["\uB2C8", "\uC560", "\uBBF8"],
  ["\uC560", "\uBBF8"],
  ["\uC345"],
  ["\uC30D", "\uB188"],
  ["\uCC3D", "\uB140"],
  ["\uAC78", "\uB808"],
  ["\uBCF4", "\uC9C0"],
  ["\uC790", "\uC9C0"]
];
var BAD_SINGLES = [
  "\u3145\u3142",
  "\u3146\u3142",
  "\u3142\u3145",
  "\u3144",
  "\u3148\u3139",
  "\u3132\u3148",
  "tlqkf",
  "qudtls",
  "fuck",
  "fxck",
  "shit",
  "bitch",
  "asshole",
  "dick"
];
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
__name(escapeRe, "escapeRe");
var BAD_RE = new RegExp(
  [...BAD_WORDS.map((w) => w.join(SEP)), ...BAD_SINGLES.map(escapeRe)].join("|"),
  "gi"
);
function maskProfanity(text) {
  return text.replace(BAD_RE, (m) => `\uE000${m}\uE001`);
}
__name(maskProfanity, "maskProfanity");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ws" || url.pathname === "/api/state") {
      const room = url.searchParams.get("room") || "global";
      return env.CITY.getByName(room).fetch(request);
    }
    if (url.pathname === "/api/search") {
      return handleSearch(url.searchParams.get("q") || "");
    }
    if (url.pathname === "/api/weather") {
      return handleWeather(request, url);
    }
    return env.ASSETS.fetch(request);
  }
};
function wmoToCategory(c) {
  if (c <= 1) return "clear";
  if (c <= 48) return "cloud";
  if (c >= 71 && c <= 77 || c >= 85 && c <= 86) return "snow";
  return "rain";
}
__name(wmoToCategory, "wmoToCategory");
async function handleWeather(request, url) {
  const cors = { "Access-Control-Allow-Origin": "*" };
  const cf = request.cf || {};
  let lat = url.searchParams.get("lat") || cf.latitude;
  let lon = url.searchParams.get("lon") || cf.longitude;
  const city = url.searchParams.get("city") || cf.city || null;
  if (!lat || !lon) {
    lat = "37.5665";
    lon = "126.9780";
  }
  try {
    const wu = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day,temperature_2m`;
    const r = await fetch(wu);
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    const d = await r.json();
    const code = d?.current?.weather_code ?? 0;
    return Response.json(
      {
        weather: wmoToCategory(code),
        isDay: (d?.current?.is_day ?? 1) === 1,
        temp: d?.current?.temperature_2m ?? null,
        city
      },
      { headers: cors }
    );
  } catch (e) {
    return Response.json(
      { weather: "clear", isDay: true, city, error: String(e?.message || e) },
      { headers: cors }
    );
  }
}
__name(handleWeather, "handleWeather");
async function handleSearch(q) {
  const cors = { "Access-Control-Allow-Origin": "*" };
  if (!q.trim()) return Response.json({ results: [] }, { headers: cors });
  try {
    const u = `https://m.stock.naver.com/front-api/search/autoComplete?query=${encodeURIComponent(
      q
    )}&target=stock`;
    const r = await fetch(u, { headers: NAVER_H });
    if (!r.ok) throw new Error(`naver ${r.status}`);
    const d = await r.json();
    const items = d?.result?.items || [];
    const results = items.filter((x) => x.category === "stock" && x.reutersCode && x.name).map((x) => ({
      symbol: x.reutersCode,
      // 가격/시총 조회 키
      name: x.name,
      // 한국어 종목명
      exch: x.typeName || x.typeCode || "",
      type: x.nationCode
    })).slice(0, 8);
    return Response.json({ results }, { headers: cors });
  } catch (e) {
    return Response.json(
      { results: [], error: String(e?.message || e) },
      { headers: cors }
    );
  }
}
__name(handleSearch, "handleSearch");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-D2031v/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-D2031v/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  CityDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
