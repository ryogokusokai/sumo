"use strict";
/* ---------- 力士の特性（関取のみ）：決まり手から取り口の型・直近3場所の勝ち方・負け方・上位戦を集計 ---------- */
const TR_CAT=[
  ["push","押し・突き","#c0392b",["oshidashi","oshitaoshi","tsukidashi","tsukitaoshi"]],
  ["yori","寄り・つり","#2f6db0",["yorikiri","yoritaoshi","abisetaoshi","kimedashi","kimetaoshi","tsuridashi","tsuriotoshi"]],
  ["nage","投げ・ひねり","#2e8a57",["uwatenage","shitatenage","kotenage","sukuinage","uwatedashinage","shitatedashinage","koshinage","kubinage","ipponzeoi","nichonage","yaguranage","kakenage","tsukaminage","harimanage","tokkurinage","dashinage","uwatehineri","shitatehineri","kotehineri","kubihineri","tottari","sakatottari","makiotoshi","tsukiotoshi","sotomuso","uchimuso","zubuneri","amiuchi","kainahineri","gasshohineri"]],
  ["hiki","引き・はたき","#a0782a",["hatakikomi","hikiotoshi","hikkake","katasukashi"]],
  ["etc","その他","#888780",[]]];
const TR_SKIP=new Set(["fusen","fusensho","fusenpai","hansoku","hikiwake","itamiwake",""]);
const trCode=k=>(k||"").trim().toLowerCase();
const trCat=k=>{const c=trCode(k);for(const x of TR_CAT)if(x[3].includes(c))return x[0];return"etc"};
const trShare=list=>{const n=list.length,o={};for(const x of TR_CAT)o[x[0]]=0;for(const k of list)o[trCat(k)]++;const p={};for(const x of TR_CAT)p[x[0]]=n?o[x[0]]/n:0;return{n,cnt:o,p}};
const trPct=v=>Math.round(v*100);
function trType(s){
  const p=s.p,yotsu=p.yori+p.nage;
  if(p.push>=.5)return"押し相撲";
  if(yotsu>=.5)return p.nage>p.yori?"四つ相撲（投げが多い）":"四つ相撲";
  return"万能型";
}
function trBar(s){return`<div class="trbar">${TR_CAT.map(([k,j,c])=>s.p[k]?`<i style="width:${s.p[k]*100}%;background:${c}" title="${j} ${trPct(s.p[k])}%（${s.cnt[k]}勝）"></i>`:"").join("")}</div>`}
function trTop(list,n){const o={};for(const k of list)o[k]=(o[k]||0)+1;return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n)}

function rkTraits(id,matches,cur){
  if(!cur||!cur.ord||cur.ord>6)return"";
  const done=matches.filter(m=>m.winnerId);
  const won=m=>m.winnerId===id;
  const oppRank=m=>parseRank(m.eastId===id?m.westRank:m.eastRank);
  const seki=done.filter(m=>m.division==="Makuuchi"||m.division==="Juryo");
  let base=seki,baseNote="関取（十両以上）での全取組";
  const winsOf=ms=>ms.filter(won).map(m=>trCode(m.kimarite)).filter(k=>!TR_SKIP.has(k));
  if(winsOf(base).length<20){base=done;baseNote="幕下以下を含む全取組（関取での白星が20未満のため）"}
  const career=trShare(winsOf(base));
  /* 直近3場所（取組のある場所） */
  const bs=[...new Set(done.map(m=>m.bashoId))].sort().reverse().slice(0,3);
  const rec=done.filter(m=>bs.includes(m.bashoId));
  const recentW=winsOf(rec),recent=trShare(recentW);
  const lossK=rec.filter(m=>!won(m)).map(m=>trCode(m.kimarite)).filter(k=>!TR_SKIP.has(k));
  const lossS=trShare(lossK);
  const upper=rec.filter(m=>{const r=oppRank(m);return r&&r.ord&&r.ord<=4});
  const uw=upper.filter(won).length,ul=upper.length-uw;
  const rows=bs.map(b=>{const ms=done.filter(m=>m.bashoId===b);const w=ms.filter(won).length,l=ms.length-w;
    const top=trTop(winsOf(ms),3).map(([k,n])=>`${esc(kim(k))}${n}`).join("・")||"—";
    const r=ms[0]?parseRank(ms[0].eastId===id?ms[0].eastRank:ms[0].westRank):null;
    const part=b===bs[0]&&Math.max(...ms.map(m=>m.day))<15?'<span class="muted">（途中）</span>':'';
    return`<tr><td>${bashoName(b)}${part}</td><td class="muted">${r?esc(r.short):""}</td><td class="c">${w}勝${l}敗</td><td>${top}</td></tr>`}).join("");
  /* ひと言まとめ（決まった基準で作文） */
  const type=trType(career);
  const main=TR_CAT.slice(0,4).map(x=>x[0]).sort((a,b)=>recent.p[b]-recent.p[a])[0];
  const nm=k=>TR_CAT.find(x=>x[0]===k)[1];
  const sent=[];
  sent.push(`${type}。${career.n}勝の内訳は押し・突き${trPct(career.p.push)}%、寄り・つり${trPct(career.p.yori)}%、投げ・ひねり${trPct(career.p.nage)}%、引き・はたき${trPct(career.p.hiki)}%。`);
  if(recent.n>=5){
    const ch=TR_CAT.slice(0,4).map(([k])=>[k,recent.p[k]-career.p[k]]).filter(([,d])=>Math.abs(d)>=.15).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
    let s=`直近3場所は白星${recent.n}のうち${nm(main)}が${trPct(recent.p[main])}%`;
    if(ch.length){const [k,d]=ch[0];s+=`で、通算より${nm(k)}が${d>0?"増えている":"減っている"}（${trPct(career.p[k])}%→${trPct(recent.p[k])}%）`}
    sent.push(s+"。");
  }else if(recent.n){sent.push(`直近3場所の白星は${recent.n}で、傾向を言うには少なめ。`)}
  if(lossS.n>=5){const lm=TR_CAT.slice(0,4).map(x=>x[0]).sort((a,b)=>lossS.p[b]-lossS.p[a])[0];
    if(lossS.p[lm]>=.4)sent.push(`負けは${nm(lm)}で敗れたものが${trPct(lossS.p[lm])}%を占める。`)}
  if(upper.length>=3)sent.push(`三役以上との対戦は${uw}勝${ul}敗。`);
  const lossTop=trTop(lossK,3).map(([k,n])=>`${esc(kim(k))}${n}`).join("・")||"—";
  return`<h2>特性 <span class="muted" style="font-size:12px;font-weight:400">決まり手から自動集計</span></h2>
  <div class="card trcard">
   <p class="trsum">${esc(sent.join(""))}</p>
   <div class="trgrid">
    <div><div class="trh">取り口の型 <b>${esc(type)}</b></div>${trBar(career)}<div class="trnote">${baseNote}・白星${career.n}（不戦勝を除く）</div></div>
    <div><div class="trh">直近3場所の勝ち方</div>${recent.n?trBar(recent):'<div class="muted">白星なし</div>'}<div class="trnote">白星${recent.n}（不戦勝を除く）</div></div>
   </div>
   <div class="trleg">${TR_CAT.map(([,j,c])=>`<span><i style="background:${c}"></i>${j}</span>`).join("")}</div>
   <table class="trtbl"><thead><tr><th>場所</th><th>番付</th><th class="c">成績</th><th>勝ちの決まり手（上位3）</th></tr></thead><tbody>${rows}</tbody></table>
   <div class="grid trkv">
    <div class="kv"><span>直近3場所の負け方（上位3）</span><b style="font-size:14px">${lossTop}</b></div>
    <div class="kv"><span>直近3場所の三役以上との対戦</span><b>${upper.length?`${uw}勝${ul}敗`:"対戦なし"}</b></div>
   </div>
   <p class="trnote">成績は不戦勝・不戦敗を含み、決まり手の集計からは除いています。左右の四つ・得意技の公式表記はデータにないため載せていません。</p>
  </div>`;
}

/* 力士詳細ページの「番付推移」の前に差し込む（取組データはキャッシュ済みのものを再利用） */
{const _vr=viewRikishi;viewRikishi=async function(id,my){await _vr(id,my);if(!live(my))return;
  try{const r=await api(`/rikishi/${id}?ranks=true&shikonas=true&measurements=true`,3600);const cur=parseRank(r.currentRank);if(!cur||!cur.ord||cur.ord>6)return;
    let matches=[],skip=0;while(true){const m=await api(`/rikishi/${id}/matches?limit=1000&skip=${skip}`,600);const rs=m.records||[];matches=matches.concat(rs);if(rs.length<1000)break;skip+=1000}
    if(!live(my))return;const h=[...$$("#app h2")].find(x=>x.textContent.startsWith("番付推移"));const html=rkTraits(id,matches,cur);if(h&&html)h.insertAdjacentHTML("beforebegin",html)}catch(e){console.error(e)}}}
