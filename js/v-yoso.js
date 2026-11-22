"use strict";
/* ---------- 番付予想 ----------
   予想そのもの（番付表・判断・比較）は data/yoso/{場所}.json に書く。
   九州場所の地位と成績は data/live/{前の場所}.json から引く。 */
const YS_SEQ={"横綱":-4,"大関":-3,"関脇":-2,"小結":-1};
const ysVal=(label,side)=>{const m=label.match(/^(前頭|十両)(\d+)$/);let v=m?(m[1]==="前頭"?+m[2]:17+ +m[2]):YS_SEQ[label];return v+(side==="西"?0.5:0)};
const ysOldVal=r=>{const t=r.rank.split(" ");const n=+t[1],h=t[2]==="West"?0.5:0;return({Yokozuna:-4,Ozeki:-3,Sekiwake:-2,Komusubi:-1,Maegashira:n,Juryo:17+n}[t[0]])+h};
const ysOldLabel=r=>{const t=r.rank.split(" ");const s=t[2]==="West"?"西":"東";const j={Yokozuna:"横綱",Ozeki:"大関",Sekiwake:"関脇",Komusubi:"小結"}[t[0]];return s+(j||(t[0]==="Maegashira"?"前頭":"十両")+t[1]+"枚目")};
let YS_INDEX=null;

async function viewYoso(basho,my){
  YS_INDEX=YS_INDEX||smJson("data/yoso/index.json").catch(()=>({list:[]}));
  const idx=await YS_INDEX;if(!live(my))return;
  const list=(idx.list||[]).slice().sort().reverse();basho=basho||list[0];
  if(!basho){render(`<h1>番付予想</h1><div class="card muted">まだ予想はありません。</div>`);return}
  const Y=await smJson(`data/yoso/${basho}.json`);
  const D=await smJson(`data/live/${Y.from}.json`).catch(()=>null);if(!live(my))return;
  const old=new Map();if(D)for(const div of ["Makuuchi","Juryo"])for(const r of D.divisions[div]||[]){old.set(r.name,r);if(!NAMES[r.id])NAMES[r.id]=r.name}
  const nm=n=>{const r=old.get(n);return r?link(r.id,r.en):esc(n)};
  const cell=(n,label,side)=>{
    if(!n)return`<td class="yscell"></td>`;
    const r=old.get(n),ms=Y.makushita&&Y.makushita[n];let from="",cls="same",mv="";
    if(r){const ov=ysOldVal(r),nv=ysVal(label,side),d=ov-nv;
      from=`${ysOldLabel(r)} ${r.w}勝${r.l}敗${r.a?r.a+"休":""}`;
      if(r.rank.startsWith("Juryo")&&!label.startsWith("十両")){cls="up";mv="入幕"}
      else if(r.rank.startsWith("Maegashira")&&label.startsWith("十両")){cls="down";mv="十両へ"}
      else if(r.rank.match(/^(Sekiwake|Komusubi)/)&&label.startsWith("前頭")){cls="down";mv="平幕へ"}
      else if(r.rank.startsWith("Maegashira")&&!label.match(/^(前頭|十両)/)){cls="up";mv="三役へ"}
      else if(Math.abs(d)<0.25){cls="same";mv="→"}
      else{cls=d>0?"up":"down";mv=(d>0?"↑":"↓")+(Math.abs(d)%1?Math.abs(d).toFixed(1):Math.abs(d))+"枚"}}
    else if(ms){from=`${ms[0]} ${ms[1]}`;cls="up";mv="新十両候補"}
    const rg=(Y.range||{})[n];
    return`<td class="yscell"><div class="ysn">${nm(n)}<span class="ysmv ${cls}">${mv}</span></div><div class="ysfrom">${esc(from)}</div>${rg?`<div class="ysrg">幅：${esc(rg)}</div>`:""}</td>`};
  const table=(rows,title)=>`<h2>${title}</h2><div class="scroll"><table class="ystbl"><thead><tr><th>東</th><th class="ysmid">地位</th><th>西</th></tr></thead><tbody>${rows.map(([l,e,w])=>`<tr>${cell(e,l,"東")}<th class="ysmid">${esc(l)}</th>${cell(w,l,"西")}</tr>`).join("")}</tbody></table></div>`;

  /* 入れ替えの一覧 */
  const mkNames=new Set(Y.makuuchi.flatMap(r=>[r[1],r[2]]).filter(Boolean));
  const jrNames=new Set(Y.juryo.flatMap(r=>[r[1],r[2]]).filter(Boolean));
  const upM=[...old.values()].filter(r=>r.rank.startsWith("Juryo")&&mkNames.has(r.name));
  const downM=[...old.values()].filter(r=>!r.rank.startsWith("Juryo")&&jrNames.has(r.name));
  const newS=Y.makuuchi.filter(r=>/関脇|小結/.test(r[0])).flatMap(r=>[r[1],r[2]]).filter(n=>n&&old.get(n)&&old.get(n).rank.startsWith("Maegashira"));
  const rec=r=>`${r.w}勝${r.l}敗${r.a?r.a+"休":""}`;
  const moves=`<div class="smcols">
   <div class="card"><h3>三役に上がる</h3>${newS.map(n=>`<div>${nm(n)} <span class="muted">${esc(ysOldLabel(old.get(n)))} ${rec(old.get(n))}</span></div>`).join("")||'<span class="muted">なし</span>'}</div>
   <div class="card"><h3>十両 → 幕内（${upM.length}人）</h3>${upM.map(r=>`<div>${link(r.id,r.en)} <span class="muted">${esc(ysOldLabel(r))} ${rec(r)}</span></div>`).join("")}</div>
   <div class="card"><h3>幕内 → 十両（${downM.length}人）</h3>${downM.map(r=>`<div>${link(r.id,r.en)} <span class="muted">${esc(ysOldLabel(r))} ${rec(r)}</span></div>`).join("")}</div>
   <div class="card"><h3>幕下 ⇄ 十両（${Object.keys(Y.makushita||{}).length}人ずつ）</h3><div class="muted">十両へ</div>${Object.entries(Y.makushita||{}).map(([n,v])=>`<div>${esc(n)} <span class="muted">${esc(v[0])} ${esc(v[1])}</span></div>`).join("")}<div class="muted" style="margin-top:6px">幕下へ</div>${(Y.demotedToMakushita||[]).map(n=>{const r=old.get(n);return`<div>${nm(n)} <span class="muted">${r?esc(ysOldLabel(r))+" "+rec(r):""}</span></div>`}).join("")}</div>
  </div>`;

  /* ネットの予想との比較：地位が一致した人数と、違う力士 */
  const pos=rows=>{const m=new Map();rows.forEach(([l,e,w])=>{if(e)m.set(e,l+"東");if(w)m.set(w,l+"西")});return m};
  const mine=pos(Y.makuuchi);
  const cmp=(Y.compare||[]).map(c=>{
    let body="";
    if(c.rows){const th=pos(c.rows);const diff=[],same=[];
      for(const [n,p] of th){const q=mine.get(n)||(jrNames.has(n)?"十両":"—");(q===p?same:diff).push([n,q,p])}
      if(!c.partial)for(const [n,q] of mine)if(!th.has(n))diff.push([n,q,"十両"]);
      body=`<p class="muted">比べた${th.size}人のうち、地位まで一致 <b>${same.length}人</b>${c.partial?"（上位のみ）":""}</p>
       ${diff.length?`<details><summary>違う力士（${diff.length}人）</summary><table class="smtbl"><thead><tr><th>力士</th><th>このサイト</th><th>${esc(c.src)}</th></tr></thead><tbody>${diff.map(([n,q,p])=>`<tr><td>${nm(n)}</td><td>${esc(q)}</td><td>${esc(p)}</td></tr>`).join("")}</tbody></table></details>`:""}`}
    return`<div class="card"><h3><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.src)}</a> <span class="tag">${esc(c.scope)}</span></h3><p>${esc(c.summary)}</p>${body}</div>`}).join("");

  render(`<h1>${esc(Y.title)}</h1>
  <div class="ctrl"><span class="muted">${esc(new Date(Y.updated).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo",dateStyle:"long",timeStyle:"short"}))}時点の予想</span></div>
  <p class="smlead">${esc(Y.lead)}</p>
  ${moves}
  ${table(Y.makuuchi,"幕内")}
  ${table(Y.juryo,"十両")}
  <p class="muted">矢印は九州場所の地位からの上下（半枚＝東西の差）。「幅」は判断が分かれて上下しやすい力士です。</p>
  <h2>判断が分かれた所</h2><div class="card"><ul class="smlist">${(Y.points||[]).map(p=>`<li><b>${esc(p.h)}</b><br>${esc(p.t)}</li>`).join("")}</ul></div>
  <h2>ネットの予想との比較</h2><div class="smcols">${cmp}</div>
  <h2>答え合わせ</h2><div class="card muted">${Y.result?"":"12月21日の番付発表後に、予想と実際の差をここに追加します。"}</div>
  <h2>予想の作り方</h2><div class="card"><ul class="smlist">${(Y.method||[]).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
  <details class="card"><summary><b>出典</b></summary><ul class="smlist">${(Y.sources||[]).map(s=>`<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join("")}</ul></details>`);
}

/* ルーティング：#yoso / #yoso-YYYYMM */
{const _vb=viewBanzuke;viewBanzuke=async function(b,d,my){const h=decodeURIComponent(location.hash.slice(1));const m=h.match(/^yoso(?:-(\d{6}))?$/);if(m){setNav("yoso");return viewYoso(m[1],my)}return _vb(b,d,my)}}
