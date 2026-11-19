// 場所中のデータを data/live/{場所}.json に保存する（GitHub Actionsから実行）
// AIの分析（スケジュールタスク）はこのファイルを読む。サイト本体はSumo APIを直接読む。
import fs from "node:fs";
const API = "https://www.sumo-api.com/api";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(p) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(API + p); if (r.ok) return await r.json(); } catch (e) {}
    await sleep(800 * (i + 1));
  }
  throw new Error("fetch failed " + p);
}
function candidates() {
  const d = new Date(Date.now() + 9 * 3600e3); let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (m % 2 === 0) m--; const out = [];
  for (let i = 0; i < 2; i++) { out.push(y + String(m).padStart(2, "0")); m -= 2; if (m < 1) { m += 12; y--; } }
  return out;
}
const jp = (s, en) => (!s || /[<>]/.test(s)) ? en : (s.split(/[\s　(（]/)[0] || en);
let basho = null, bz = {};
for (const b of candidates()) {
  const z = await get(`/basho/${b}/banzuke/Makuuchi`).catch(() => null);
  if (z && z.east && z.east.length) { basho = b; bz.Makuuchi = z; break; }
}
if (!basho) { console.log("no basho"); process.exit(0); }
bz.Juryo = await get(`/basho/${basho}/banzuke/Juryo`);
const rs = await get("/rikishis?intai=false&limit=1000");
const heya = {}; for (const r of rs.records || []) heya[r.id] = r.heya;
const out = { basho, fetchedAt: new Date().toISOString(), divisions: {}, h2h: {} };
let maxDayAll = 0;
for (const div of ["Makuuchi", "Juryo"]) {
  const list = [...(bz[div].east || []), ...(bz[div].west || [])].map(r => {
    const rec = (r.record || []).map(x => ({ r: x.result || "", o: x.opponentID || 0, on: jp(x.opponentShikonaJp, x.opponentShikonaEn) || "", k: x.kimarite || "" }));
    let w = 0, l = 0, a = 0, day = 0;
    rec.forEach((x, i) => { if (x.r === "win" || x.r === "fusen win") w++; else if (x.r === "loss" || x.r === "fusen loss") l++; else if (x.r === "absent") a++; if (/^(fusen )?(win|loss)$/.test(x.r)) day = i + 1; });
    maxDayAll = Math.max(maxDayAll, day);
    return { id: r.rikishiID, name: jp(r.shikonaJp, r.shikonaEn), en: r.shikonaEn, rank: r.rank, heya: heya[r.rikishiID] || "", w, l, a, rec };
  });
  out.divisions[div] = list;
}
out.maxDay = maxDayAll;
// 対戦成績：優勝争い（首位から3差以内）の力士 × 未対戦の上位・優勝争いの力士
const pairs = [];
for (const div of ["Makuuchi", "Juryo"]) {
  const L = out.divisions[div]; const top = Math.max(...L.map(r => r.w));
  const cont = L.filter(r => top - r.w <= 3 && r.w + 15 - r.rec.filter(x => x.r).length >= top);
  const upper = L.filter(r => div === "Makuuchi" ? /Yokozuna|Ozeki|Sekiwake|Komusubi/.test(r.rank) : /^Juryo [1-3] /.test(r.rank));
  for (const r of cont) {
    const faced = new Set(r.rec.filter(x => x.r && x.r !== "absent").map(x => x.o));
    for (const o of new Set([...cont, ...upper])) if (o !== r && !faced.has(o.id) && !(r.heya && r.heya === o.heya)) {
      const k = [r.id, o.id].sort((a, b) => a - b).join("-"); if (!pairs.includes(k)) pairs.push(k);
    }
  }
}
for (const k of pairs.slice(0, 220)) {
  const [a, b] = k.split("-");
  const z = await get(`/rikishi/${a}/matches/${b}`).catch(() => null);
  if (z) out.h2h[k] = [z.rikishiWins || 0, z.opponentWins || 0];
  await sleep(120);
}
const path = `data/live/${basho}.json`;
const prev = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : null;
if (prev) { const strip = o => JSON.stringify({ ...o, fetchedAt: 0 }); if (strip(prev) === strip(out)) { console.log("unchanged"); process.exit(0); } }
fs.mkdirSync("data/live", { recursive: true });
fs.writeFileSync(path, JSON.stringify(out));
fs.writeFileSync("data/live/latest.json", JSON.stringify({ basho, maxDay: out.maxDay, fetchedAt: out.fetchedAt, path }));
console.log("saved", path, "day", out.maxDay, "h2h", Object.keys(out.h2h).length);
