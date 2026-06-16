import { useState, useEffect, useRef } from "react";
import { CAR_IMAGES } from "./carAssets";

/* ===================== 데이터 ===================== */
const DIFF = {
  easy:   { label: "쉬움",   ops: ["+", "−"],           bases: [55, 72, 92],   btn: "from-emerald-400 to-emerald-600", desc: "덧셈 · 뺄셈" },
  medium: { label: "보통",   ops: ["+", "−", "×"],      bases: [92, 112, 132], btn: "from-amber-400 to-orange-600",   desc: "덧셈 · 뺄셈 · 곱셈" },
  hard:   { label: "어려움", ops: ["+", "−", "×", "÷"], bases: [122, 145, 166],btn: "from-rose-400 to-red-600",       desc: "사칙연산 전부" },
};
const FINISH = 3600, FLOOR = 35, MAXS = 300, DECAY = 42, PXU = 0.3;

/* 차량 3종 × 4단계. 코인으로 데려오고(unlock), 코인으로 단계 업그레이드(그림+속도 ↑) */
const CARS = [
  { id: "atv",   name: "오프로드 ATV", price: 0,   dot: "#f97316", desc: "튼튼한 사막 레이서" },
  { id: "super", name: "슈퍼카",       price: 260, dot: "#e11d2a", desc: "날렵한 도로의 제왕" },
  { id: "f1",    name: "F1 레이서",    price: 520, dot: "#fb7185", desc: "가장 빠른 포뮬러카" },
];
const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));
const MAX_LEVEL = 4;
const UPGRADE_COST = { 1: 150, 2: 320, 3: 640 };           // Lv1→2, 2→3, 3→4
const CAR_SPEED = { atv: 0.92, super: 1.06, f1: 1.2 };      // 종류별 기본 속도
const LEVEL_BONUS = { 1: 1.0, 2: 1.09, 3: 1.18, 4: 1.28 };  // 단계별 가속
function pmulOf(car, level) { return (CAR_SPEED[car] || 1) * (LEVEL_BONUS[level] || 1); }
function speedPct(car, level) { return Math.round((pmulOf(car, level) / pmulOf("atv", 1) - 1) * 100); }
const carImg = (car, level) => {
  const a = CAR_IMAGES[car]; if (!a) return null;
  return a[Math.min(MAX_LEVEL, Math.max(1, level)) - 1];
};
// 원본 그림은 전부 주황색 → 종류·단계별로 색을 돌려 다양하게
const CAR_HUE = { atv: 0, super: 150, f1: 255 };
const carHue = (car, level) => ((CAR_HUE[car] || 0) + (level - 1) * 28) % 360;

const OPP = [
  { car: "super", level: 2, dot: "#e11d2a", name: "레드 윙" },
  { car: "f1",    level: 1, dot: "#22d3ee", name: "블루 노즈" },
  { car: "atv",   level: 3, dot: "#facc15", name: "더트 킹" },
];
const OPP_W = [186, 186, 196], OPP_BOTTOM = ["31%", "39%", "33%"], OPP_Z = [22, 16, 19];

const DEFAULT_OWNED = ["atv"];
const DEFAULT_EQUIP = "atv";
const DEFAULT_LEVEL = { atv: 1, super: 1, f1: 1 };

/* ===================== 유틸 ===================== */
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function makeProblem(diff) {
  const ops = DIFF[diff].ops, op = ops[ri(0, ops.length - 1)];
  let a, b, answer, offs;
  if (op === "+") { const hi = diff === "easy" ? 20 : diff === "medium" ? 40 : 60; a = ri(1, hi); b = ri(1, hi); answer = a + b; offs = [1, -1, 2, -2, 5, -5, 10, -10, 3, -3]; }
  else if (op === "−") { const hi = diff === "easy" ? 20 : diff === "medium" ? 40 : 60; a = ri(1, hi); b = ri(1, a); answer = a - b; offs = [1, -1, 2, -2, 5, -5, 10, -10, 3, -3]; }
  else if (op === "×") { if (diff === "medium") { a = ri(2, 9); b = ri(2, 9); } else { a = ri(2, 12); b = ri(2, 12); } answer = a * b; offs = [a, -a, b, -b, 1, -1, 2, -2, 10, -10]; }
  else { const d = ri(2, 12), q = ri(2, 12); a = d * q; b = d; answer = q; offs = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]; }
  const pool = new Set(); for (const o of offs) { const v = answer + o; if (v !== answer && v >= 0) pool.add(v); }
  const arr = [...pool].sort(() => Math.random() - 0.5), distract = arr.slice(0, 3);
  let pad = answer + 11; while (distract.length < 3) { if (pad !== answer && !distract.includes(pad) && pad >= 0) distract.push(pad); pad++; }
  return { a, b, op, answer, options: [answer, ...distract].sort(() => Math.random() - 0.5) };
}

/* ===================== 자동차 (이미지) ===================== */
function RaceCar({ width = 250, img = null, boost = "none", hue = 0 }) {
  if (!img) return <div style={{ width, height: width * 0.4 }} />;
  return (
    <div style={{ position: "relative", width, lineHeight: 0 }}>
      {boost !== "none" && (
        <div className="mr-flame" style={{ position: "absolute", left: -width * 0.07, bottom: "16%", width: width * 0.2, height: width * 0.07, borderRadius: "9999px", transformOrigin: "right center", background: boost === "nitro" ? "linear-gradient(to left,#60a5fa,#1d4ed8,transparent)" : "linear-gradient(to left,#fde047,#f97316,transparent)" }} />
      )}
      {/* 원본 그림이 왼쪽을 보고 있어 scaleX(-1)로 진행방향(오른쪽)을 보게 뒤집음 */}
      <img src={img} alt="car" draggable={false} style={{ width: "100%", display: "block", transform: "scaleX(-1)", filter: `hue-rotate(${hue}deg) saturate(1.2) drop-shadow(0 6px 6px rgba(0,0,0,0.22))` }} />
    </div>
  );
}

/* ===================== 메인 ===================== */
export default function MathRacing() {
  const [screen, setScreen] = useState("menu");
  const [difficulty, setDifficulty] = useState("medium");
  const [problem, setProblem] = useState(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [count, setCount] = useState("3");
  const [soundOn, setSoundOn] = useState(true);
  const [result, setResult] = useState(null);
  const [hud, setHud] = useState({ speed: 0, rank: 4, prog: 0, nitro: 0, ready: false, nitroOn: false, coins: 0 });
  const [coinPops, setCoinPops] = useState([]);
  const [overtake, setOvertake] = useState(0);
  const [misses, setMisses] = useState(0);   // 틀린 횟수 (2번이면 실패)

  const [coins, setCoins] = useState(0);
  const [owned, setOwned] = useState(DEFAULT_OWNED);
  const [equipped, setEquipped] = useState(DEFAULT_EQUIP);
  const [carLevel, setCarLevel] = useState(DEFAULT_LEVEL);

  const audioRef = useRef(null);
  const fbRef = useRef(null);
  const sfxRef = useRef({ correct: null, accel: null });   // 디코드된 효과음 버퍼
  const bgmAudioRef = useRef(null);                          // 배경음악 HTMLAudio
  const speedRef = useRef(0), distRef = useRef(0), nitroRef = useRef(0), nitroUntilRef = useRef(0);
  const raceCoinsRef = useRef(0), startTsRef = useRef(0), qStartRef = useRef(0);
  const missRef = useRef(0);   // 틀린 횟수(로직용)
  const pmulRef = useRef(1), maxSpeedRef = useRef(MAXS);
  const cpusRef = useRef([]);
  const roadOff = useRef(0), hillN = useRef(0), hillF = useRef(0);
  const sceneRef = useRef(null), roadDashRef = useRef(null), hillNRef = useRef(null), hillFRef = useRef(null);
  const needleRef = useRef(null), nitroFillRef = useRef(null), spdRef = useRef(null);
  const oppRefs = useRef([]), markerRefs = useRef([]);
  const ownedRef = useRef(owned), equipRef = useRef(equipped), levelRef = useRef(carLevel);
  useEffect(() => { ownedRef.current = owned; }, [owned]);
  useEffect(() => { equipRef.current = equipped; }, [equipped]);
  useEffect(() => { levelRef.current = carLevel; }, [carLevel]);
  useEffect(() => { loadAudio(); }, []);   // 음성 파일 미리 디코드/준비

  function ensureAudio() {
    if (!audioRef.current) { try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (audioRef.current && audioRef.current.state === "suspended") audioRef.current.resume().catch(() => {});
    loadAudio();
    // iOS 등: 첫 제스처에서 배경음악 엘리먼트 잠금 해제(음소거 재생→정지)
    const a = bgmAudioRef.current; if (a && !a._unlocked) { a._unlocked = true; const mute = a.muted; a.muted = true; const p = a.play(); if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = mute; }).catch(() => { a.muted = mute; }); }
  }
  function beep(f, d, t = "sine", v = 0.13, w = 0) { if (!soundOn || !audioRef.current) return; const c = audioRef.current, n = c.currentTime + w, o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(v, n + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, n + d); o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + d + 0.02); }
  function sweep(f1, f2, d, t = "sawtooth", v = 0.13) { if (!soundOn || !audioRef.current) return; const c = audioRef.current, n = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.setValueAtTime(f1, n); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), n + d); g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d); o.connect(g); g.connect(c.destination); o.start(n); o.stop(n + d + 0.02); }
  const sCoin = () => { beep(988, 0.07, "square", 0.1); beep(1319, 0.09, "square", 0.1, 0.07); };
  const sWin = () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, "triangle", 0.16, i * 0.1));
  const sLose = () => [392, 330, 262].forEach((f, i) => beep(f, 0.25, "sine", 0.14, i * 0.14));
  const sLevel = () => [523, 659, 784, 1046, 1318].forEach((f, i) => beep(f, 0.14, "triangle", 0.16, i * 0.07));
  /* ===== 오디오 파일: 부스터·정답 SFX(AudioBuffer) + 배경음악(HTMLAudio 루프) ===== */
  function decodeUrl(url) { return fetch(url).then(r => r.arrayBuffer()).then(buf => audioRef.current.decodeAudioData(buf)); }
  function loadAudio() {
    if (!audioRef.current) { try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    const s = sfxRef.current;
    if (!s.correct) decodeUrl("sfx_correct.mp3").then(b => { s.correct = b; }).catch(() => {});
    if (!s.accel) decodeUrl("sfx_accel.mp3").then(b => { s.accel = b; }).catch(() => {});
    if (!bgmAudioRef.current) { const a = new Audio("bgm.mp3"); a.loop = true; a.volume = 0.55; a.preload = "auto"; bgmAudioRef.current = a; }
  }
  function playSfx(buf, vol, offset, dur) {
    if (!soundOn || !audioRef.current || !buf) return;
    const c = audioRef.current, src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(c.destination);
    const off = Math.min(offset || 0, Math.max(0, buf.duration - 0.05));
    if (dur) src.start(c.currentTime, off, dur); else src.start(c.currentTime, off);
  }
  const playCorrect = () => playSfx(sfxRef.current.correct, 0.9);            // 정답: "문제 맞췄을때 소리"
  const playAccel = () => playSfx(sfxRef.current.accel, 0.95, 4.0, 3.5);     // 부스터: "자동차 가속소리" 4.0~7.5초 구간(앞 잔잔한 부분 건너뜀)
  const sNitroReady = () => { beep(880, 0.1, "triangle", 0.13); beep(1320, 0.16, "triangle", 0.13, 0.1); }; // 니트로 충전 완료 알림
  function bgmStart() { const a = bgmAudioRef.current; if (!a) return; try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
  function bgmStop() { const a = bgmAudioRef.current; if (!a) return; try { a.pause(); a.currentTime = 0; } catch (_) {} }

  function saveAll(c, o, e) { if (typeof window !== "undefined" && window.storage) { try { window.storage.set("mathRacing:save4", JSON.stringify({ coins: c, owned: o, equipped: e, carLevel: levelRef.current })); } catch (_) {} } }
  useEffect(() => { (async () => {
    try { if (window.storage) {
      const r = await window.storage.get("mathRacing:save4");
      if (r && r.value) { const s = JSON.parse(r.value);
        if (typeof s.coins === "number") setCoins(s.coins);
        if (Array.isArray(s.owned)) setOwned([...new Set([...DEFAULT_OWNED, ...s.owned])]);
        if (typeof s.equipped === "string" && CAR_BY_ID[s.equipped]) setEquipped(s.equipped);
        if (s.carLevel) setCarLevel({ ...DEFAULT_LEVEL, ...s.carLevel });
      }
    } } catch (_) {}
  })(); }, []);

  function doShake() { const el = sceneRef.current; if (!el) return; el.classList.remove("mr-shake"); void el.offsetWidth; el.classList.add("mr-shake"); }
  function addCoinPop(amt) { const id = Math.random(); setCoinPops(p => [...p.slice(-5), { id, amt }]); setTimeout(() => setCoinPops(p => p.filter(x => x.id !== id)), 1000); }

  function upgradeCar(id) {
    const cur = carLevel[id] || 1; if (cur >= MAX_LEVEL) return;
    const cost = UPGRADE_COST[cur]; if (coins < cost) { beep(160, 0.18, "square", 0.1); return; }
    const nc = coins - cost; const nl = { ...carLevel, [id]: cur + 1 };
    levelRef.current = nl; setCoins(nc); setCarLevel(nl); saveAll(nc, owned, equipped); sLevel();
  }
  function tapCar(id) {
    const c = CAR_BY_ID[id];
    if (owned.includes(id)) { setEquipped(id); saveAll(coins, owned, id); beep(620, 0.06, "sine", 0.1); }
    else if (coins >= c.price) { const no = [...owned, id]; const nc = coins - c.price; setCoins(nc); setOwned(no); setEquipped(id); saveAll(nc, no, id); sCoin(); }
    else { beep(160, 0.18, "square", 0.1); }
  }

  function startGame(diff) { ensureAudio(); setDifficulty(diff); setCombo(0); setMaxCombo(0); setCorrect(0); setTotal(0); setFeedback(null); setResult(null); setMisses(0); missRef.current = 0; setHud({ speed: 0, rank: 4, prog: 0, nitro: 0, ready: false, nitroOn: false, coins: 0 }); setScreen("countdown"); }
  function newQuestion() { setProblem(makeProblem(difficulty)); qStartRef.current = performance.now(); }
  function startRace() {
    speedRef.current = 0; distRef.current = 0; nitroRef.current = 0; nitroUntilRef.current = 0; raceCoinsRef.current = 0; roadOff.current = 0; hillN.current = 0; hillF.current = 0;
    pmulRef.current = pmulOf(equipped, carLevel[equipped] || 1); maxSpeedRef.current = MAXS * pmulRef.current;
    const bases = DIFF[difficulty].bases; cpusRef.current = OPP.map((o, i) => ({ dist: 0, base: bases[i], phase: Math.random() * 6.28 })); startTsRef.current = performance.now(); newQuestion(); setScreen("racing");
  }
  function endRace(rank) { const earned = Math.round(raceCoinsRef.current); const bonus = [0, 60, 30, 15, 5][rank] ?? 5; const tot = earned + bonus; setCoins(c => { const nc = c + tot; saveAll(nc, ownedRef.current, equipRef.current); return nc; }); setResult({ rank, earned, bonus, total: tot }); setScreen("result"); rank === 1 ? sWin() : sLose(); }
  function endRaceFail() { const earned = Math.round(raceCoinsRef.current); setCoins(c => { const nc = c + earned; saveAll(nc, ownedRef.current, equipRef.current); return nc; }); setResult({ failed: true, rank: 4, earned, bonus: 0, total: earned }); setScreen("result"); sLose(); } // 2번 틀려 실패
  function fireNitro() { if (nitroRef.current < 100) return; nitroUntilRef.current = performance.now() + 2400; nitroRef.current = 0; speedRef.current = Math.max(speedRef.current, maxSpeedRef.current * 0.85); playAccel(); doShake(); } // 니트로 발사: "자동차 가속소리"
  function answer(value) {
    if (screen !== "racing" || !problem) return; setTotal(c => c + 1); const now = performance.now(); const nitroActive = now < nitroUntilRef.current; const pmul = pmulRef.current, cap = maxSpeedRef.current;
    if (value === problem.answer) {
      const dt = (now - qStartRef.current) / 1000; const turbo = dt < 1.2, mid = dt < 2.5; const nc = combo + 1;
      speedRef.current = Math.min(cap, speedRef.current + ((turbo ? 88 : mid ? 58 : 42) + Math.min(nc, 10) * 3.5) * pmul);
      const wasReady = nitroRef.current >= 100;
      nitroRef.current = Math.min(100, nitroRef.current + (turbo ? 18 : 12));
      let gain = 5 + Math.min(nc, 10) + (turbo ? 5 : 0); if (nitroActive) gain *= 2; raceCoinsRef.current += gain; addCoinPop(gain); sCoin();
      setCombo(nc); setMaxCombo(m => Math.max(m, nc)); setCorrect(c => c + 1); setFeedback(turbo ? "turbo" : "correct");
      playCorrect();                                       // 정답: "문제 맞췄을때 소리"
      if (nitroRef.current >= 100 && !wasReady) sNitroReady(); // 니트로 충전 완료 알림
    } else {
      speedRef.current *= 0.45; setCombo(0); setFeedback("wrong"); doShake(); sweep(300, 60, 0.25, "square", 0.14);
      missRef.current += 1; setMisses(missRef.current);
      if (missRef.current >= 3) { clearTimeout(fbRef.current); endRaceFail(); return; }   // 세 번 틀리면 실패
    }
    clearTimeout(fbRef.current); fbRef.current = setTimeout(() => setFeedback(null), 320); newQuestion();
  }

  useEffect(() => {
    if (screen !== "racing") return;
    let raf, last = performance.now(), hudT = 0, prevRank = 4;
    const tick = (ts) => {
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts; const tsec = (ts - startTsRef.current) / 1000; const nitro = ts < nitroUntilRef.current; const cap = maxSpeedRef.current;
      let s = speedRef.current; if (nitro) { s += (cap - s) * Math.min(1, dt * 5); } else { s -= DECAY * dt; if (s < FLOOR) s = FLOOR; } if (s > cap) s = cap; speedRef.current = s;
      distRef.current = Math.min(FINISH, distRef.current + s * dt);
      cpusRef.current.forEach(c => { const eff = c.base * (1 + 0.18 * Math.sin(tsec * 0.6 + c.phase)); c.dist = Math.min(FINISH, c.dist + eff * dt); });
      roadOff.current += s * dt * 1.7; if (roadDashRef.current) roadDashRef.current.style.backgroundPositionX = `${-roadOff.current}px`;
      hillN.current += s * dt * 0.62; if (hillNRef.current) hillNRef.current.style.backgroundPositionX = `${-hillN.current}px`;
      hillF.current += s * dt * 0.24; if (hillFRef.current) hillFRef.current.style.backgroundPositionX = `${-hillF.current}px`;
      if (spdRef.current) spdRef.current.style.opacity = Math.max(0, Math.min(1, (s - 75) / 140));
      if (needleRef.current) { const ang = -90 + Math.min(1, s / cap) * 180; needleRef.current.setAttribute("transform", `rotate(${ang} 50 52)`); }
      if (nitroFillRef.current) nitroFillRef.current.style.width = nitroRef.current + "%";
      cpusRef.current.forEach((c, i) => { const el = oppRefs.current[i]; if (!el) return; const x = (c.dist - distRef.current) * PXU; if (Math.abs(x) > 340) { el.style.opacity = "0"; } else { el.style.opacity = "1"; el.style.transform = `translateX(${x}px)`; } });
      if (markerRefs.current[0]) markerRefs.current[0].style.left = (distRef.current / FINISH * 100) + "%";
      cpusRef.current.forEach((c, i) => { const m = markerRefs.current[i + 1]; if (m) m.style.left = (c.dist / FINISH * 100) + "%"; });
      const rank = 1 + cpusRef.current.filter(c => c.dist > distRef.current).length;
      hudT += dt;
      if (hudT > 0.1) { hudT = 0; setHud({ speed: Math.round(s), rank, prog: Math.round(distRef.current / FINISH * 100), nitro: Math.round(nitroRef.current), ready: nitroRef.current >= 100, nitroOn: nitro, coins: Math.round(raceCoinsRef.current) }); if (rank < prevRank && distRef.current > 120) setOvertake(k => k + 1); prevRank = rank; }
      if (distRef.current >= FINISH) { endRace(rank); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [screen]);

  useEffect(() => { if (screen !== "countdown") return; const t = []; setCount("3"); beep(500, 0.1); t.push(setTimeout(() => { setCount("2"); beep(500, 0.1); }, 800)); t.push(setTimeout(() => { setCount("1"); beep(500, 0.1); }, 1600)); t.push(setTimeout(() => { setCount("GO"); beep(950, 0.2, "triangle", 0.16); }, 2400)); t.push(setTimeout(() => startRace(), 3000)); return () => t.forEach(clearTimeout); }, [screen]);
  useEffect(() => { if (screen !== "racing") return; const onKey = (e) => { if (e.key === " ") { e.preventDefault(); fireNitro(); return; } const n = parseInt(e.key); if (n >= 1 && n <= 4 && problem) answer(problem.options[n - 1]); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [screen, problem, combo]);
  useEffect(() => { if (screen === "racing" && soundOn) bgmStart(); return () => bgmStop(); }, [screen, soundOn]);

  const eqLevel = carLevel[equipped] || 1;
  const eqImg = carImg(equipped, eqLevel);
  const playerDot = CAR_BY_ID[equipped].dot;
  const playerBoost = hud.nitroOn ? "nitro" : (feedback === "turbo" || feedback === "correct" || hud.speed > 210 ? "normal" : "none");
  const acc = total > 0 ? Math.round(correct / total * 100) : 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-500 via-sky-300 to-emerald-300 flex items-center justify-center p-3 font-sans select-none">
      <style>{`
        .mr-bob{animation:mrbob 0.18s ease-in-out infinite alternate;}
        @keyframes mrbob{from{transform:translateY(0) rotate(-0.4deg)}to{transform:translateY(-3px) rotate(0.4deg)}}
        .mr-flame{animation:mrflame 0.1s infinite alternate;transform-origin:right center;}
        @keyframes mrflame{from{transform:scaleX(0.8) scaleY(0.9);opacity:.85}to{transform:scaleX(1.2) scaleY(1.1);opacity:1}}
        .mr-shake{animation:mrshake 0.4s;}
        @keyframes mrshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        .coinpop{animation:coinpop 1s ease-out forwards;}
        @keyframes coinpop{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-46px);opacity:0}}
        .otake{animation:otake 1s ease-out forwards;}
        @keyframes otake{0%{transform:translate(-50%,0) scale(.5);opacity:0}20%{opacity:1;transform:translate(-50%,-12px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-44px) scale(1)}}
        .streak{animation:streak linear infinite;}
        @keyframes streak{from{transform:translateX(60px)}to{transform:translateX(-120%)}}
        .mr-glow{animation:mrglow 0.6s infinite alternate;}
        @keyframes mrglow{from{box-shadow:0 0 0 0 #f59e0b00}to{box-shadow:0 0 18px 2px #f59e0baa}}
      `}</style>

      <div className="w-full max-w-4xl">

        {/* ===== MENU ===== */}
        {screen === "menu" && (
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-6 text-center">
            <div className="flex items-center justify-between mb-1"><span /><div className="bg-amber-100 text-amber-700 font-black rounded-full px-3 py-1 text-sm flex items-center gap-1">🪙 {coins}</div></div>
            <div className="my-2 relative inline-block">
              <div className="mr-bob"><RaceCar width={320} img={eqImg} boost="normal" hue={carHue(equipped, eqLevel)} /></div>
              <span className="absolute -top-1 left-0 text-white text-xs font-black rounded-full px-2 py-0.5" style={{ background: playerDot }}>Lv {eqLevel}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">사칙연산 레이싱</h1>
            <p className="text-slate-500 mt-1 mb-5">문제를 풀어 가속하고, 상대를 추월해 1등으로 들어오세요!</p>
            <div className="grid gap-3">
              {Object.entries(DIFF).map(([k, v]) => (
                <button key={k} onClick={() => startGame(k)} className={`bg-gradient-to-r ${v.btn} text-white rounded-2xl py-4 px-5 shadow-lg flex items-center justify-between transition-transform hover:scale-105 active:scale-95`}>
                  <span className="text-xl font-black flex items-center gap-2">🏁 {v.label}</span><span className="text-sm font-medium opacity-90">{v.desc}</span>
                </button>
              ))}
              <button onClick={() => { ensureAudio(); setScreen("garage"); }} className="bg-slate-800 text-white rounded-2xl py-3 px-5 shadow-lg flex items-center justify-center gap-2 font-black transition-transform hover:scale-105 active:scale-95">🔧 차고 · 자동차 업그레이드</button>
            </div>
            <p className="text-xs text-slate-400 mt-4">⚡ 터보 · 🔥 콤보 · 🚀 NITRO · ⬆️ 코인으로 차 단계 업그레이드(그림+속도 ↑)</p>
          </div>
        )}

        {/* ===== GARAGE ===== */}
        {screen === "garage" && (
          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-2"><h2 className="text-2xl font-black text-slate-800">🔧 차고</h2><div className="bg-amber-100 text-amber-700 font-black rounded-full px-3 py-1 text-sm flex items-center gap-1">🪙 {coins}</div></div>
            <div className="rounded-2xl mb-4 flex items-center justify-center py-3 relative" style={{ background: "linear-gradient(#e0f2fe,#f1f5f9)" }}>
              <div className="mr-bob"><RaceCar width={340} img={eqImg} boost="none" hue={carHue(equipped, eqLevel)} /></div>
              <span className="absolute top-2 left-2 text-white text-xs font-black rounded-full px-2 py-0.5" style={{ background: playerDot }}>{CAR_BY_ID[equipped].name} · Lv {eqLevel}/4</span>
            </div>

            <div className="grid gap-3 mb-3">
              {CARS.map(c => {
                const isOwned = owned.includes(c.id), isEq = equipped === c.id, lvl = carLevel[c.id] || 1;
                const canBuy = coins >= c.price, canUp = lvl < MAX_LEVEL, upCost = UPGRADE_COST[lvl];
                return (
                  <div key={c.id} className={`rounded-2xl p-3 border-2 ${isEq ? "border-emerald-500 bg-emerald-50" : isOwned ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => tapCar(c.id)} className="shrink-0 w-32 h-16 flex items-center justify-center overflow-hidden rounded-xl bg-slate-100/60" style={{ opacity: isOwned ? 1 : 0.45 }}>
                        <RaceCar width={124} img={carImg(c.id, isOwned ? lvl : 1)} hue={carHue(c.id, isOwned ? lvl : 1)} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800">{c.name}</span>
                          {isEq && <span className="bg-emerald-500 text-white text-[10px] font-black rounded-full px-1.5">선택됨</span>}
                          {isOwned && <span className="text-[11px] text-slate-400 font-bold">속도 +{speedPct(c.id, lvl)}%</span>}
                        </div>
                        {isOwned ? (
                          <>
                            <div className="flex gap-1 my-1.5">
                              {[1, 2, 3, 4].map(L => (
                                <div key={L} className={`flex-1 h-2 rounded-full ${L <= lvl ? "bg-orange-400" : "bg-slate-200"}`} />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              {!isEq && <button onClick={() => tapCar(c.id)} className="flex-1 bg-slate-800 text-white rounded-lg py-1.5 text-xs font-black active:scale-95">선택</button>}
                              {canUp ? (
                                <button onClick={() => upgradeCar(c.id)} disabled={coins < upCost} className={`flex-[2] rounded-lg py-1.5 text-xs font-black text-white active:scale-95 ${coins >= upCost ? "bg-gradient-to-r from-orange-500 to-red-600" : "bg-slate-300"}`}>⬆️ Lv{lvl + 1} 업그레이드 · 🪙{upCost}</button>
                              ) : (<div className="flex-[2] text-center text-orange-600 font-black text-xs py-1.5">🏆 최고 단계!</div>)}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-[12px] text-slate-500 mb-1.5">{c.desc}</p>
                            <button onClick={() => tapCar(c.id)} className={`w-full rounded-lg py-2 text-sm font-black text-white active:scale-95 ${canBuy ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-slate-300"}`}>{canBuy ? "🔓 데려오기" : "🔒"} · 🪙 {c.price}</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setScreen("menu")} className="flex-1 bg-slate-200 text-slate-700 rounded-2xl py-3 font-black hover:scale-105 active:scale-95 transition-transform">← 메뉴</button>
              <button onClick={() => startGame(difficulty)} className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-2xl py-3 font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">🏁 바로 경주!</button>
            </div>
          </div>
        )}

        {/* ===== COUNTDOWN ===== */}
        {screen === "countdown" && (
          <div className="rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-800 relative" style={{ height: 300, background: "linear-gradient(#7dd3fc,#bae6fd 60%,#3f3f46 60%)" }}>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 16 }}><div className="mr-bob"><RaceCar width={320} img={eqImg} boost="normal" hue={carHue(equipped, eqLevel)} /></div></div>
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-900/80 rounded-2xl px-4 py-3 flex gap-3">
              {[0, 1, 2].map(i => { const lit = count !== "GO" && ((count === "3" && i === 0) || (count === "2" && i <= 1) || (count === "1")); const go = count === "GO"; return <div key={i} className="w-9 h-9 rounded-full" style={{ background: go ? "#22c55e" : lit ? "#ef4444" : "#3f3f46", boxShadow: (go || lit) ? `0 0 14px ${go ? "#22c55e" : "#ef4444"}` : "none" }} />; })}
            </div>
            <div className={`absolute top-24 left-1/2 -translate-x-1/2 font-black ${count === "GO" ? "text-6xl text-emerald-400" : "text-7xl text-white"}`} style={{ textShadow: "0 3px 0 #0006" }}>{count}</div>
          </div>
        )}

        {/* ===== RACING / RESULT ===== */}
        {(screen === "racing" || screen === "result") && (
          <div className="space-y-3">
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[52px]"><div className="text-[10px] text-slate-400">순위</div><div className={`font-black text-2xl leading-none ${hud.rank === 1 ? "text-amber-500" : "text-slate-700"}`}>{hud.rank}<span className="text-sm">위</span></div></div>
                  <div className="flex items-center gap-1">
                    <svg viewBox="0 0 100 58" width="76" height="44">
                      <path d="M8 52 A 42 42 0 0 1 92 52" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
                      <path d="M8 52 A 42 42 0 0 1 50 10" fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round" />
                      <path d="M50 10 A 42 42 0 0 1 92 52" fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" opacity="0.55" />
                      <line ref={needleRef} x1="50" y1="52" x2="50" y2="15" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-90 50 52)" />
                      <circle cx="50" cy="52" r="5" fill="#1f2937" />
                    </svg>
                    <div><div className="font-black text-lg leading-none tabular-nums">{hud.speed}</div><div className="text-[9px] text-slate-400">km/h</div></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center"><div className="text-[10px] text-slate-400">기회</div><div className="font-black text-base leading-none tracking-tight">{"❤️".repeat(Math.max(0, 3 - misses))}{"🤍".repeat(Math.min(3, misses))}</div></div>
                  <div className="text-center"><div className="text-[10px] text-slate-400">콤보</div><div className={`font-black text-lg leading-none ${combo >= 3 ? "text-orange-500" : "text-slate-700"}`}>{combo > 0 ? `x${combo}` : "-"}{combo >= 3 ? "🔥" : ""}</div></div>
                  <div className="text-center"><div className="text-[10px] text-slate-400">획득 코인</div><div className="font-black text-lg leading-none text-amber-500">🪙{hud.coins}</div></div>
                  <button onClick={() => setSoundOn(s => !s)} className="text-xl">{soundOn ? "🔊" : "🔇"}</button>
                </div>
              </div>
              <div className="relative h-3 bg-slate-200 rounded-full">
                <span className="absolute right-0 -top-3 text-base">🏁</span>
                <div ref={el => markerRefs.current[0] = el} className="absolute -top-1.5 w-5 h-5 rounded-full border-2 border-white shadow z-10" style={{ left: "0%", transform: "translateX(-50%)", background: playerDot }} />
                {OPP.map((o, i) => (<div key={i} ref={el => markerRefs.current[i + 1] = el} className="absolute -top-0.5 w-3.5 h-3.5 rounded-full border border-white" style={{ left: "0%", transform: "translateX(-50%)", background: o.dot }} />))}
              </div>
            </div>

            <div ref={sceneRef} className="relative w-full rounded-2xl overflow-hidden border-4 border-slate-800 shadow-xl" style={{ height: "clamp(300px,54vh,560px)" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(#7dd3fc,#bae6fd 58%)" }} />
              <div className="absolute" style={{ top: 14, right: 20, width: 44, height: 44, borderRadius: "9999px", background: "#fde047", boxShadow: "0 0 24px #fde04788" }} />
              <div className="absolute" style={{ top: 30, left: "14%", width: 60, height: 20, borderRadius: "9999px", background: "#fff", opacity: 0.85 }} />
              <div className="absolute" style={{ top: 22, left: "18%", width: 34, height: 18, borderRadius: "9999px", background: "#fff", opacity: 0.85 }} />
              <div className="absolute" style={{ top: 40, left: "58%", width: 50, height: 18, borderRadius: "9999px", background: "#fff", opacity: 0.8 }} />
              <div ref={hillFRef} className="absolute left-0 right-0" style={{ bottom: "42%", height: 90, backgroundImage: "radial-gradient(circle at 50% 100%,#86efac 0 70px,transparent 72px)", backgroundSize: "210px 90px", backgroundRepeat: "repeat-x", opacity: 0.85 }} />
              <div ref={hillNRef} className="absolute left-0 right-0" style={{ bottom: "40%", height: 70, backgroundImage: "radial-gradient(circle at 50% 100%,#4ade80 0 60px,transparent 62px)", backgroundSize: "150px 70px", backgroundRepeat: "repeat-x" }} />
              <div className="absolute left-0 right-0 bottom-0" style={{ height: "42%", background: "#3f3f46" }} />
              <div className="absolute left-0 right-0" style={{ bottom: "42%", height: 5, background: "#fbbf24" }} />
              <div ref={roadDashRef} className="absolute left-0 right-0" style={{ bottom: "19%", height: 7, backgroundImage: "repeating-linear-gradient(to right,#fde047 0 40px,transparent 40px 80px)", backgroundSize: "80px 7px" }} />
              <div ref={spdRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0 }}>
                {[{ t: "22%", w: 80, d: 0.5 }, { t: "34%", w: 120, d: 0.4 }, { t: "50%", w: 90, d: 0.55 }, { t: "64%", w: 140, d: 0.38 }, { t: "76%", w: 70, d: 0.6 }, { t: "88%", w: 110, d: 0.45 }].map((s, i) => (<div key={i} className="streak absolute rounded-full" style={{ top: s.t, right: 0, width: s.w, height: 4, background: "#ffffffcc", animationDuration: `${s.d}s`, animationDelay: `${i * 0.07}s` }} />))}
              </div>
              {OPP.map((o, i) => (
                <div key={i} ref={el => oppRefs.current[i] = el} className="absolute" style={{ left: "50%", marginLeft: -(OPP_W[i] / 2), bottom: OPP_BOTTOM[i], zIndex: OPP_Z[i], opacity: 0 }}>
                  <div className="mr-bob"><RaceCar width={OPP_W[i]} img={carImg(o.car, o.level)} hue={carHue(o.car, o.level)} /></div>
                </div>
              ))}
              <div className="absolute" style={{ left: "50%", bottom: "5%", transform: "translateX(-50%)", zIndex: 30 }}>
                <div className="mr-bob"><RaceCar width={380} img={eqImg} boost={playerBoost} hue={carHue(equipped, eqLevel)} /></div>
              </div>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none z-40">
                {coinPops.map(c => (<div key={c.id} className="coinpop font-black text-amber-400 text-lg" style={{ textShadow: "0 1px 2px #0008" }}>+{c.amt}🪙</div>))}
              </div>
              {overtake > 0 && screen === "racing" && (<div key={overtake} className="otake absolute top-1/3 left-1/2 font-black text-2xl text-white pointer-events-none z-40" style={{ textShadow: "0 2px 0 #f59e0b,0 0 14px #000" }}>추월! 🏎️💨</div>)}
              {hud.nitroOn && (<div className="absolute inset-0 pointer-events-none z-30" style={{ boxShadow: "inset 0 0 60px 10px #60a5fa66" }} />)}
            </div>

            {screen === "racing" && problem && (
              <div className={`bg-white rounded-2xl shadow-xl p-4 ring-4 transition-all ${feedback === "wrong" ? "ring-rose-400" : feedback === "turbo" ? "ring-orange-400" : feedback === "correct" ? "ring-emerald-400" : "ring-transparent"}`}>
                <div className="text-center mb-3"><span className="text-4xl sm:text-5xl font-black text-slate-800 tabular-nums tracking-wide">{problem.a} {problem.op} {problem.b} = ?</span></div>
                <div className="grid grid-cols-2 gap-2.5">
                  {problem.options.map((opt, i) => { const colors = ["from-rose-400 to-rose-600", "from-sky-400 to-sky-600", "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600"]; return (<button key={i} onClick={() => answer(opt)} className={`relative bg-gradient-to-br ${colors[i]} text-white active:scale-95 transition rounded-xl py-4 text-3xl font-black shadow-md`}><span className="absolute top-1.5 left-2.5 text-xs opacity-80 font-bold">{i + 1}</span>{opt}</button>); })}
                </div>
                <button onClick={fireNitro} disabled={!hud.ready} className={`relative mt-3 w-full rounded-xl py-3 font-black text-white overflow-hidden transition ${hud.ready ? "bg-gradient-to-r from-indigo-500 to-fuchsia-600 mr-glow active:scale-95" : "bg-slate-300"}`}>
                  <div ref={nitroFillRef} className="absolute left-0 top-0 bottom-0 bg-white/25" style={{ width: hud.nitro + "%" }} />
                  <span className="relative">{hud.ready ? "🚀 NITRO 발사! (스페이스)" : `🚀 NITRO 충전 ${hud.nitro}%`}</span>
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">키보드 1·2·3·4로 정답 선택 · 스페이스로 부스트</p>
              </div>
            )}

            {screen === "result" && result && (
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                <div className="text-6xl mb-1">{result.failed ? "💥" : result.rank === 1 ? "🏆" : result.rank === 2 ? "🥈" : result.rank === 3 ? "🥉" : "🏁"}</div>
                <h2 className={`text-3xl font-black ${result.failed ? "text-rose-500" : result.rank === 1 ? "text-amber-500" : "text-slate-600"}`}>{result.failed ? "세 번 틀려서 실패! 😢" : result.rank === 1 ? "우승! 1등 🎉" : `${result.rank}등으로 완주!`}</h2>
                <div className="bg-amber-50 rounded-2xl py-3 my-4"><div className="text-sm text-amber-700">획득 코인</div><div className="text-3xl font-black text-amber-600">🪙 +{result.total}</div><div className="text-xs text-amber-600/80">{result.failed ? "문제를 풀어 모은 코인 · 다음엔 천천히 풀어요!" : `정답 ${result.earned} + 순위 보너스 ${result.bonus}`}</div></div>
                <div className="grid grid-cols-3 gap-2 mb-5"><Stat label="정답" value={correct} /><Stat label="정답률" value={`${acc}%`} /><Stat label="최고 콤보" value={`x${maxCombo}`} /></div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button onClick={() => startGame(difficulty)} className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-2xl py-3 font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">🔄 다시 경주</button>
                  <button onClick={() => setScreen("garage")} className="bg-slate-800 text-white rounded-2xl py-3 font-black hover:scale-105 active:scale-95 transition-transform">🔧 차고</button>
                </div>
                <button onClick={() => setScreen("menu")} className="w-full bg-slate-100 text-slate-600 rounded-2xl py-2.5 font-bold hover:scale-105 active:scale-95 transition-transform">메뉴로</button>
              </div>
            )}

            {screen === "racing" && (<button onClick={() => setScreen("menu")} className="w-full text-slate-500 text-xs py-1 hover:text-slate-700">⏹ 그만두기</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (<div className="bg-slate-100 rounded-xl py-3"><div className="text-xs text-slate-400">{label}</div><div className="text-xl font-black text-slate-700">{value}</div></div>);
}
