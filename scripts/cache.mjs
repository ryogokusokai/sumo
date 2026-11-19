// サイト表示用のAPIデータを data/live/cache に保存する（snapshot.mjs から最初に呼ばれる）
// 目的：見る人が増えても Sumo API への問い合わせが増えないようにする。
// サイト側（js/cache.js）は、ここに新しいデータがあればそれを使い、なければAPIを直接読む。
import fs from "node:fs";
const API = "https://www.sumo-api.com/api";
const DIR = "data/live/cache";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const keyOf = p => p.replace(/[^A-Za-z0-9]/g, "_") + ".json";
async function get(p) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(API + p); if (r.ok) return await r.json(); } catch (e) {}
    await sleep(800 * (i + 1));
  }
  return null;
}
fs.mkdirSync(DIR, { recursive: true });
const idxPath = DIR + "/index.json";
const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8")) : { paths: {} };
const now = Date.now();
let n = 0;
async function save(p, gap = 120) {
  const v = await get(p); if (!v) return null;
  const f = DIR + "/" + keyOf(p), s = JSON.stringify(v);
  if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== s) fs.writeFileSync(f, s);
  idx.paths[p] = now; n++; await sleep(gap); return v;
}
const old = (p, h) => !idx.paths[p] || now - idx.paths[p] > h * 3600e3;
function candidates(k) {
  const d = new Date(now + 9 * 3600e3); let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (m % 2 === 0) m--; const out = [];
  for (let i = 0; i < k; i++) { out.push(y + String(m).padStart(2, "0")); m -= 2; if (m < 1) { m += 12; y--; } }
  return out;
}
try {
  // 現在の場所（番付が出ている最新の場所）
  let cur = null;
  for (const b of candidates(3)) { const z = await get(`/basho/${b}/banzuke/Makuuchi`); if (z && z.east && z.east.length) { cur = b; break; } }
  if (cur) {
    idx.current = cur;
    let maxDay = 0;
    for (const div of ["Makuuchi", "Juryo", "Makushita", "Sandanme", "Jonidan", "Jonokuchi"]) {
      const z = await save(`/basho/${cur}/banzuke/${div}`);
      if (z && (div === "Makuuchi" || div === "Juryo")) for (const r of [...(z.east || []), ...(z.west || [])]) {
        (r.record || []).forEach((x, i) => { if (x.result) maxDay = Math.max(maxDay, i + 1); });
      }
    }
    for (const div of ["Makuuchi", "Juryo"]) for (let d = 1; d <= Math.min(15, maxDay + 1); d++) {
      const p = `/basho/${cur}/torikumi/${div}/${d}`;
      if (d < maxDay - 1 && !old(p, 24)) continue; // 終わった日は1日1回で十分
      await save(p);
    }
    // 前の2場所の幕内番付（ニュース・優勝争いで使用）
    const prev = candidates(6).filter(b => b < cur).slice(0, 2);
    for (const b of prev) { const p = `/basho/${b}/banzuke/Makuuchi`; if (old(p, 20)) await save(p); }
  }
  // 現役力士の一覧と番付の履歴（1日1回）
  const lp = "/rikishis?intai=false&limit=1000";
  const list = old(lp, 20) ? await save(lp) : JSON.parse(fs.readFileSync(DIR + "/" + keyOf(lp), "utf8"));
  if (list && list.records) {
    for (const r of list.records) { const p = `/rikishi/${r.id}?ranks=true`; if (old(p, 20)) await save(p, 100); }
  }
} catch (e) { console.log("cache error", e.message); }
idx.updated = new Date(now).toISOString();
fs.writeFileSync(idxPath, JSON.stringify(idx));
console.log("cache saved", n);
