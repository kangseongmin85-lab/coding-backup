/* 오프라인 캐시 — 인터넷 없이도 앱이 열리게. 파일을 바꾸면 CACHE 버전을 올린다. */
const CACHE = "serosem-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./characters.js",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  // 모험 보드 일러스트 스프라이트
  "./assets/start.png", "./assets/finish.png", "./assets/dice.png", "./assets/back.png",
  "./assets/treasure.png", "./assets/trap.png", "./assets/monster.png", "./assets/mystery.png",
  "./assets/tree.png", "./assets/tree2.png", "./assets/palm.png", "./assets/cactus.png",
  "./assets/rock.png", "./assets/rockbig.png", "./assets/dino.png",
  "./assets/flower.png", "./assets/campfire.png",
  // 박스 타일(길)
  "./assets/tile_path.png", "./assets/tile_grass.png", "./assets/tile_grass2.png",
  "./assets/tile_water.png", "./assets/tile_dirt.png", "./assets/tile_wood.png",
  // 사칙연산 레이싱(차 그림은 bundle.js에 base64로 내장)
  "./자동차 게임/play.html", "./자동차 게임/racing.css", "./자동차 게임/bundle.js",
  // 레이싱 음성(배경음악·정답·가속)
  "./자동차 게임/bgm.mp3", "./자동차 게임/sfx_correct.mp3", "./자동차 게임/sfx_accel.mp3",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => caches.match("./index.html")))
  );
});
