// ⭐ 내 문장 공유 저장소 — PC(localhost)·폰(Netlify) 양쪽이 같은 목록을 읽고 씀
// GET → {picks}, POST {ops:[{v,i,on}]} → 순서대로 담기/빼기 적용 후 {picks}
import { getStore } from '@netlify/blobs';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = body => new Response(JSON.stringify(body), { headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const valid = o => o && typeof o.v === 'string' && /^[\w-]{1,20}$/.test(o.v) && Number.isInteger(o.i) && o.i >= 0 && o.i < 100000;

export default async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: 'video-picks', consistency: 'strong' });
  const picks = (await store.get('picks', { type: 'json' })) || [];
  if (req.method !== 'POST') return json({ picks });
  const { ops } = await req.json().catch(() => ({}));
  if (!Array.isArray(ops) || ops.length > 500 || !ops.every(valid)) return new Response('bad ops', { status: 400, headers: CORS });
  // ponytail: 읽고-쓰기 사이 경합은 무시(사용자 1명) — 동시 사용자 생기면 etag(onlyIfMatch)로
  for (const { v, i, on } of ops) {
    const at = picks.findIndex(p => p.v === v && p.i === i);
    if (on && at < 0) picks.push({ v, i });
    if (!on && at >= 0) picks.splice(at, 1);
  }
  await store.setJSON('picks', picks);
  return json({ picks });
};

export const config = { path: '/api/picks' };
