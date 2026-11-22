"use strict";
/* ---------- 場所総括 ----------
   数字（成績・推移・場所全体のデータ）は data/live/{場所}.json から計算する。
   文章（三賞・話題・予想の答え合わせ・展望・出典）は data/summary/{場所}.json に手で書く。 */
const SM_DIVS=[["Makuuchi","幕内"],["Juryo","十両"]];
const smJson=async p=>{const r=await fetch(p+"?t="+Math.floor(Date.now()/600000));if(!r.ok)throw new Error(p+" "+r.status);return r.json()};
let SM_INDEX=null;
const smIndex=()=>SM_INDEX||(SM_INDEX=smJson("data/summary/index.json").catch(()=>({list:[]})));
const smMark=r=>({win:"○",loss:"●","fusen win":"□","fusen loss":"■",absent:"や"}[r]||"");
const smWon=r=>r==="win"||r==="fusen win";
const smDay=d=>d===1?"初日":d===8?"中日":d===15?"千秋楽":String(d);

async function viewSummary(basho,my){
  const idx=await smIndex();if(!live(my))return;
  const list=(idx.list||[]).slice().sort().reverse();
  basho=basho||list[0];
  if(!basho){render(`<h1>場所総括</h1><div class="card muted">まだ総括はありません。</div>`);return}
  const [S,D]=await Promise.all([smJson(`data/summary/${basho}.json`),smJson(`data/live/${basho}.json`)]);
  if(!live(my))return;
  const byId=new Map(),byName=new Map();
  for(const [div] of SM_DIVS)for(const r of (D.divisions[div]||[])){r.div=div;r.rk=parseRank(r.rank);if(!byId.has(r.id))byId.set(r.id,r);byName.set(r.name,r);if(!NAMES[r.id])NAMES[r.id]=r.name}
  const lk=n=>{const r=byName.get(n);return r?link(r.id,r.en):esc(n)};
  const rec=r=>`${r.w}勝${r.l}敗${r.a?r.a+"休":""}`;
  const P=S.prediction||{};

  const tiles=SM_DIVS.map(([k,j])=>{const y=S.yusho&&S.yusho[k];return y?`<div class="smtile lead"><span class="k">${j}優勝</span><span class="v">${lk(y.name)}</span><span class="n">${esc(y.text)}</span></div>`:""}).join("")
   +(S.sansho||[]).map(s=>`<div class="smtile"><span class="k">${esc(s.prize)}</span><span class="v">${s.names.map(lk).join("・")}</span><span class="n">${esc(s.text)}</span></div>`).join("");

  const topTable=div=>{
    const L=(D.divisions[div]||[]).slice().sort((a,b)=>b.w-a.w||a.rk.val-b.rk.val);
    const cut=div==="Makuuchi"?10:11;const rows=L.filter(r=>r.w>=cut);
    return`<div class="scroll"><table class="smtbl"><thead><tr><th>力士</th><th>番付</th><th>成績</th><th>星取</th><th>12日目〜千秋楽</th><th>メモ</th></tr></thead><tbody>${rows.map(r=>`<tr>
      <td>${link(r.id,r.en)}</td><td>${esc(r.rk.full)}</td><td class="num">${rec(r)}</td>
      <td class="smhoshi">${r.rec.map(x=>`<span class="${smWon(x.r)?"w":/loss/.test(x.r)?"l":"muted"}">${smMark(x.r)}</span>`).join("")}</td>
      <td class="smlate">${r.rec.slice(11).map(x=>`<span class="${smWon(x.r)?"w":"l"}">${smMark(x.r)}</span>${x.o?link(x.o,x.on):esc(x.on)}<small class="muted">${esc(kim(x.k))}</small>`).join(" ")}</td>
      <td class="smnote">${esc((S.notes||{})[r.name]||"")}</td></tr>`).join("")}</tbody></table></div>`};

  const chartBlock=div=>{const ids=(S.chart&&S.chart[div])||[];if(!ids.length)return"";
    return`<div class="card"><div class="legend smleg">${ids.map((id,i)=>{const r=byId.get(id);return r?`<span><i style="background:${PALETTE[i]}"></i>${esc(r.name)} ${r.w}勝</span>`:""}).join("")}</div>
     <div class="chart smchart" data-div="${div}"></div><p>${esc((S.raceText||{})[div]||"")}</p></div>`};

  /* 場所全体のデータ（幕内） */
  const M=(D.divisions.Makuuchi||[]);
  const kinboshi=[];const kimCount={};
  for(const r of M){r.rec.forEach((x,i)=>{if(x.r!=="win")return;const o=byId.get(x.o);
    if(r.rk.ord>=5&&o&&o.rk.ord===1)kinboshi.push({d:i+1,w:r,o,k:x.k});
    const k=kim(x.k);if(k)kimCount[k]=(kimCount[k]||0)+1})}
  kinboshi.sort((a,b)=>a.d-b.d);
  const kimTop=Object.entries(kimCount).sort((a,b)=>b[1]-a[1]);const kimTotal=kimTop.reduce((s,x)=>s+x[1],0);
  const upper=M.filter(r=>r.rk.ord<=4).sort((a,b)=>a.rk.val-b.rk.val);
  const kk=M.filter(r=>r.w>=8).length,mk=M.filter(r=>r.l+r.a>=8).length,kyu=M.filter(r=>r.a>0);
  const dataBlock=`<div class="grid">
    <div class="kv"><span>幕内の勝ち越し</span><b>${kk}人</b><span>負け越し ${mk}人（全${M.length}人）</span></div>
    <div class="kv"><span>金星</span><b>${kinboshi.length}個</b><span>${[...new Set(kinboshi.map(k=>k.o.name))].map(esc).join("・")||"なし"}から</span></div>
    <div class="kv"><span>休場した幕内力士</span><b>${kyu.length}人</b><span>${kyu.map(r=>esc(r.name)).join("・")||"なし"}</span></div>
    <div class="kv"><span>いちばん多い決まり手</span><b>${kimTop[0]?esc(kimTop[0][0]):"-"}</b><span>${kimTop[0]?`${kimTop[0][1]}番（全${kimTotal}番の${Math.round(kimTop[0][1]/kimTotal*100)}%）`:""}</span></div>
   </div>
   <div class="smcols">
    <div class="card"><h3>横綱・大関・三役の成績</h3><table class="smtbl"><tbody>${upper.map(r=>`<tr><td>${esc(r.rk.full)}</td><td>${link(r.id,r.en)}</td><td class="num ${r.w>=8?"w":"l"}">${rec(r)}</td></tr>`).join("")}</tbody></table></div>
    <div class="card"><h3>決まり手（幕内・上位8）</h3>${kimTop.slice(0,8).map(([k,n])=>`<div class="smbar"><span>${esc(k)}</span><span class="pb"><i style="width:${(n/kimTop[0][1]*100).toFixed(1)}%"></i></span><b class="num">${n}</b></div>`).join("")}<p class="muted">不戦を除く${kimTotal}番。</p></div>
    <div class="card"><h3>金星</h3>${kinboshi.length?`<table class="smtbl"><tbody>${kinboshi.map(k=>`<tr><td>${smDay(k.d)}${k.d===1||k.d===8||k.d===15?"":"日目"}</td><td>${link(k.w.id,k.w.en)}</td><td>${link(k.o.id,k.o.en)}を${esc(kim(k.k))}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">なし</p>'}</div>
   </div>`;

  const H=P.history||{};
  const predBlock=`<p>${esc(P.intro||"")}</p>
   <div class="smcols">${SM_DIVS.map(([k,j])=>H[k]?`<div class="card"><h3>${j}：日ごとの予想</h3><table class="smtbl"><tbody>${H[k].map(h=>`<tr><td class="num">${h.day}日目</td><td>${esc(h.picks)}<br><small class="muted">${esc(h.point)}</small></td></tr>`).join("")}</tbody></table></div>`:"").join("")}</div>
   <div class="scroll"><table class="smtbl wrap"><thead><tr><th>予想</th><th>結果</th><th>判定</th></tr></thead><tbody>${(P.verdicts||[]).map(v=>`<tr><td>${esc(v.pred)}</td><td>${esc(v.result)}</td><td><span class="smpill ${v.v==="hit"?"hit":"miss"}">${esc(v.label)}</span></td></tr>`).join("")}</tbody></table></div>
   ${P.opp?`<h3>残りの対戦相手の予想</h3><p class="muted">${esc(P.oppIntro)}</p>
   <div class="scroll"><table class="smtbl"><thead><tr><th>力士</th><th>実際の相手（13→14→千秋楽）</th><th>11日目時点の見込み</th></tr></thead><tbody>${P.opp.map(o=>`<tr><td>${lk(o.name)}</td><td>${o.opps.split(" → ").map(lk).join(" → ")}</td><td>${esc(o.lv)}</td></tr>`).join("")}</tbody></table></div>
   <p>${esc(P.oppResult)}</p>`:""}
   ${P.lessons?`<h3>次に生かすこと</h3><ul class="smlist">${P.lessons.map(l=>`<li><b>${esc(l.h)}。</b>${esc(l.t)}</li>`).join("")}</ul>`:""}`;

  render(`<h1>${bashoName(basho)} 場所総括</h1>
  <div class="ctrl">${list.length>1?`<select id="smsel">${list.map(b=>`<option value="${b}"${b===basho?" selected":""}>${bashoName(b)}</option>`).join("")}</select>`:""}<span class="muted">${esc(S.period||"")}</span></div>
  <p class="smlead">${esc(S.lead||"")}</p>
  <div class="smtiles">${tiles}</div>
  <h2>幕内 上位の成績</h2>${topTable("Makuuchi")}
  <h2>十両 上位の成績</h2>${topTable("Juryo")}
  <h2>優勝争いの推移</h2>
  <div class="smcols">${SM_DIVS.map(([k,j])=>`<div><h3>${j}</h3>${chartBlock(k)}</div>`).join("")}</div>
  <h2>場所全体のデータ（幕内）</h2>${dataBlock}
  <h2>予想の答え合わせ</h2>${predBlock}
  <h2>ネットで関心を集めた話題</h2><p class="muted">${esc(S.topicsNote||"")}</p>
  <div class="smtopics">${(S.topics||[]).map(t=>`<article class="card smtopic"><span class="tag2">${esc(t.tag)}</span><h3>${esc(t.h)}</h3><p>${esc(t.t)}</p><p class="why">${esc(t.why)}</p></article>`).join("")}</div>
  <h2>次の場所への展望</h2><div class="card"><ul class="smlist">${(S.outlook||[]).map(o=>`<li><b>${esc(o.h)}</b> <span class="tag">${esc(o.k)}</span><br>${esc(o.t)}</li>`).join("")}</ul><p class="muted">番付は協会の発表前です。「見立て」はこのサイトの見方です。</p>${S.yosoLink?`<a class="card smgo" href="${esc(S.yosoLink)}"><b>番付予想を見る →</b> <span class="muted">幕内・十両の全員の予想と、ネットの予想との比較</span></a>`:""}</div>
  <details class="card"><summary><b>このページについて・出典</b></summary>
   <ul class="smlist muted"><li>成績・星取・推移・場所全体のデータは、Sumo APIのデータ（${esc(new Date(D.fetchedAt).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}))}取得）から計算しています。優勝決定戦は星取に含みません。</li><li>三賞・話題・展望は報道をもとに書いています。</li></ul>
   <ul class="smlist">${(S.sources||[]).map(s=>`<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join("")}</ul></details>`);

  const xs=Array.from({length:15},(_,i)=>smDay(i+1));
  $$(".smchart").forEach(w=>{const ids=(S.chart[w.dataset.div])||[];
    const series=ids.map((id,i)=>{const r=byId.get(id);if(!r)return null;let c=0;return{name:r.name,color:PALETTE[i],values:r.rec.map(x=>{if(smWon(x.r))c++;return c})}}).filter(Boolean);
    lineChart(w,series,xs,{h:230,yMax:15,yTicks:[0,3,6,9,12,15]})});
  const sel=$("#smsel");if(sel)sel.onchange=e=>location.hash="summary-"+e.target.value;
}

/* ルーティング：#summary / #summary-YYYYMM */
{const _vb=viewBanzuke;viewBanzuke=async function(b,d,my){const h=decodeURIComponent(location.hash.slice(1));const m=h.match(/^summary(?:-(\d{6}))?$/);if(m){setNav("summary");return viewSummary(m[1],my)}return _vb(b,d,my)}}
/* 優勝争いページ：総括がある場所には案内を出す */
{const _vy=viewYusho;viewYusho=async function(b,d,my){await _vy(b,d,my);if(!live(my))return;
  const idx=await smIndex();const basho=b||await currentBasho();
  if((idx.list||[]).includes(basho)&&live(my)){const h1=$("#app h1");if(h1)h1.insertAdjacentHTML("afterend",`<a class="card smgo" href="#summary-${basho}"><b>場所総括を見る →</b> <span class="muted">優勝・三賞、予想の答え合わせ、話題をまとめています</span></a>`)}}}
