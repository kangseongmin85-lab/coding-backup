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
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ws" || url.pathname === "/api/state") {
      const room = url.searchParams.get("room") || "global";
      return env.CITY.getByName(room).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};

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

// .wrangler/tmp/bundle-5mSKsv/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-5mSKsv/middleware-loader.entry.ts
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
