// 4-캐릭터 SVG를 사분면별로 분리해 각 캐릭터의 패스 + viewBox 추출
const fs = require("fs");
const src = fs.readFileSync("create-a-clean-modern-illustration-icon-set-of-4-u.svg", "utf8");

// <path fill="#xxx" d="..."/> 모두 추출 (배경 전체 rect 제외)
const paths = [];
const re = /<path\s+fill="([^"]+)"\s+d="([^"]+)"\s*\/>/g;
let m;
while ((m = re.exec(src))) paths.push({ fill: m[1], d: m[2] });

function bbox(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = "";
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const num = () => parseFloat(toks[i++]);
  const pt = (x, y) => { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) { cmd = toks[i]; i++; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "M") { let x = num(), y = num(); if (rel) { x += cx; y += cy; } cx = x; cy = y; sx = x; sy = y; pt(x, y); cmd = rel ? "l" : "L"; }
    else if (C === "L") { let x = num(), y = num(); if (rel) { x += cx; y += cy; } cx = x; cy = y; pt(x, y); }
    else if (C === "H") { let x = num(); if (rel) x += cx; cx = x; pt(x, cy); }
    else if (C === "V") { let y = num(); if (rel) y += cy; cy = y; pt(cx, y); }
    else if (C === "C") { let a = num(), b = num(), c = num(), e = num(), x = num(), y = num(); if (rel) { a += cx; b += cy; c += cx; e += cy; x += cx; y += cy; } pt(a, b); pt(c, e); pt(x, y); cx = x; cy = y; }
    else if (C === "S") { let c = num(), e = num(), x = num(), y = num(); if (rel) { c += cx; e += cy; x += cx; y += cy; } pt(c, e); pt(x, y); cx = x; cy = y; }
    else if (C === "Q") { let a = num(), b = num(), x = num(), y = num(); if (rel) { a += cx; b += cy; x += cx; y += cy; } pt(a, b); pt(x, y); cx = x; cy = y; }
    else if (C === "T") { let x = num(), y = num(); if (rel) { x += cx; y += cy; } pt(x, y); cx = x; cy = y; }
    else if (C === "A") { num(); num(); num(); num(); num(); let x = num(), y = num(); if (rel) { x += cx; y += cy; } pt(x, y); cx = x; cy = y; }
    else if (C === "Z") { cx = sx; cy = sy; }
    else { i++; }
  }
  return { minX, minY, maxX, maxY };
}

// 사분면 그룹
const groups = { TL: [], TR: [], BL: [], BR: [] };
for (const p of paths) {
  const b = bbox(p.d);
  // 전체 캔버스를 덮는 배경 패스는 제외
  if (b.maxX - b.minX > 1800 && b.maxY - b.minY > 1800) continue;
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const q = (cy < 1024 ? "T" : "B") + (cx < 1024 ? "L" : "R");
  p.b = b;
  groups[q].push(p);
}

const out = {};
for (const q of Object.keys(groups)) {
  const g = groups[q];
  if (!g.length) continue;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of g) { minX = Math.min(minX, p.b.minX); minY = Math.min(minY, p.b.minY); maxX = Math.max(maxX, p.b.maxX); maxY = Math.max(maxY, p.b.maxY); }
  const pad = 24;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const vb = `${Math.round(minX)} ${Math.round(minY)} ${Math.round(maxX - minX)} ${Math.round(maxY - minY)}`;
  const markup = g.map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join("");
  out[q] = { vb, markup, count: g.length, bg: minX + " " + minY + " " + (maxX - minX) + " " + (maxY - minY) };
}

console.log("counts:", Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])));
console.log("viewBoxes:", Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.vb])));
fs.writeFileSync("_workspace/chars_extracted.json", JSON.stringify(out));
console.log("wrote _workspace/chars_extracted.json");
