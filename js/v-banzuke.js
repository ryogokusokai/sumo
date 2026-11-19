"use strict";
/* ---------- 番付（番付表／星取表、タップで星取カード、一門ハイライト） ---------- */
let BZ_MODE="table",BZ_ICH="";
async function viewBanzuke(basho,div,my){
  const cur=await currentBasho();basho=basho||cur;div=DIVJP[div]?div:"Makuuchi";
  const z=await api(`/basho/${basho}/banzuke/${div}`,bashoTTL(basho));if(!live(my))return;
  const E=z.east||[],W=z.west||[];addNames(E);addNames(W);
  const sek=div==="Makuuchi"||div==="Juryo";
  const all=[...E,...W];const byId=Object.fromEntries(all.map(r=>[r.rikishiID,r]));
  let day=0;for(const r of all)day=Math.max(day,dayFromRecord(r.record));
  const nmh=r=>`<span class="hd"></span>${link(r.rikishiID,r.shikonaEn).replace("<a ","<a data-pop ")}<span class="tg" data-id="${r.rikishiID}"></span>`;
  /* 番付表 */
  const rows=new Map();
  for(const r of all){const p=parseRank(r.rank);const k=(p.ord<=4&&div==="Makuuchi")?p.ord*100+p.num:1000+p.num;if(!rows.has(k))rows.set(k,{k,label:"",E:null,W:null});const row=rows.get(k);const head=RANK[r.rank.split(" ")[0]];row.label=p.ord<=4?head[0]+(p.num>1?p.num:""):head[1]+p.num;row[r.side==="West"?"W":"E"]=r}
  const sorted=[...rows.values()].sort((a,b)=>a.k-b.k);
  const tableHtml=`<table><thead><tr><th class="c">成績</th><th class="r">東</th><th class="c">番付</th><th>西</th><th class="c">成績</th></tr></thead><tbody>
  ${sorted.map(row=>{const cell=(r,side)=>{if(!r)return'<td></td><td></td>';const rc=recOf(r.record,sek);const a=`data-id="${r.rikishiID}"`;return side==="E"?`<td class="c" ${a}>${recHtml(rc)}</td><td class="r" ${a}>${nmh(r)}</td>`:`<td ${a}>${nmh(r)}</td><td class="c" ${a}>${recHtml(rc)}</td>`};return`<tr>${cell(row.E,"E")}<td class="c muted">${row.label}</td>${cell(row.W,"W")}</tr>`}).join("")}
  </tbody></table>`;
  /* 星取表 */
  const order=all.slice().sort((a,b)=>parseRank(a.rank).val-parseRank(b.rank).val);
  const hoshiHtml=`<table class="htab"><thead><tr><th class="nm">番付・四股名</th>${Array.from({length:15},(_,i)=>`<th class="d">${i+1}</th>`).join("")}<th class="c">成績</th></tr></thead><tbody>
  ${order.map(r=>{const p=parseRank(r.rank);const rec=r.record||[];return`<tr data-id="${r.rikishiID}"><td class="nm"><span class="muted">${esc(p.side+p.short)}</span> ${nmh(r)}</td>${Array.from({length:15},(_,i)=>{const x=rec[i];const h=hoshi(x,sek);const t=x&&x.opponentID?`${i+1}日目 ${HOSHI_CH[h]||""} ${cleanJp(x.opponentShikonaJp,x.opponentShikonaEn)} ${kim(x.kimarite)}`:"";return`<td class="d ${h}" title="${esc(t)}">${HOSHI_CH[h]}</td>`}).join("")}<td class="c">${recHtml(recOf(rec,sek))}</td></tr>`}).join("")}
  </tbody></table>`;
  render(`<h1>${bashoName(basho)} 番付</h1>
  <div class="ctrl"><select id="bsel">${bashoOpts(cur,basho)}</select><span class="muted">${day?day+"日目まで反映":"場所前"}</span>
   <span class="seg" style="margin-left:auto"><button data-m="table" class="${BZ_MODE==="table"?"on":""}">番付表</button><button data-m="hoshi" class="${BZ_MODE==="hoshi"?"on":""}">星取表</button></span></div>
  <div class="tabs">${DIVS.map(([k,j])=>`<button data-d="${k}" class="${k===div?"on":""}">${j}</button>`).join("")}</div>
  <div class="ctrl" id="ichleg">${ICHIMON.map(i=>`<button class="ichip${BZ_ICH===i.k?" on":BZ_ICH?" off":""}" data-i="${i.k}"><span class="dot" style="background:${i.c}"></span>${i.k}</button>`).join("")}<span class="muted">タップでその一門を強調</span></div>
  <div class="card scroll" id="bzbody">${BZ_MODE==="table"?tableHtml:hoshiHtml}</div>
  <p class="muted">四股名をタップすると今場所の星取が開きます。${sek?"成績は 勝-敗-休。印（新入幕・再入幕・新十両・再十両・自己最高位・休場）は番付履歴から算出。":"成績は 勝-敗。"}${BZ_MODE==="hoshi"?"　○勝 ●負 □不戦勝 ■不戦敗 や休み":""}　一門の色は現在の所属部屋で判定。</p>`);
  $("#bsel").onchange=e=>location.hash=`banzuke-${e.target.value}-${div}`;
  $$(".tabs button").forEach(b=>b.onclick=()=>location.hash=`banzuke-${basho}-${b.dataset.d}`);
  $$(".seg button").forEach(b=>b.onclick=()=>{BZ_MODE=b.dataset.m;viewBanzuke(basho,div,token)});
  /* 一門ハイライト */
  let heyaOf={};
  const applyIch=()=>{$$("#bzbody [data-id]").forEach(el=>{const ich=ichOf(heyaOf[el.dataset.id]);el.classList.toggle("dim",!!BZ_ICH&&ich!==BZ_ICH)});$$("#ichleg .ichip").forEach(b=>{b.classList.toggle("on",BZ_ICH===b.dataset.i);b.classList.toggle("off",!!BZ_ICH&&BZ_ICH!==b.dataset.i)})};
  $$("#ichleg .ichip").forEach(b=>b.onclick=()=>{BZ_ICH=BZ_ICH===b.dataset.i?"":b.dataset.i;applyIch()});
  loadAllRikishi().then(list=>{if(!live(my))return;heyaOf=Object.fromEntries(list.map(r=>[r.id,r.heya]));$$("#bzbody a.rk[data-rid]").forEach(a=>{const d=a.previousElementSibling;if(d&&d.classList.contains("hd"))d.innerHTML=ichDot(ichOf(heyaOf[a.dataset.rid]))});applyIch()}).catch(()=>{});
  /* 星取カード */
  $("#bzbody").addEventListener("click",e=>{const a=e.target.closest("a.rk[data-rid]");if(!a)return;e.preventDefault();const r=byId[a.dataset.rid];if(r)showPop(hoshiCard(r,sek,heyaOf[r.rikishiID],basho),a)});
  /* 印 */
  if(sek){
    const tag=(id,html)=>$$(`.tg[data-id="${id}"]`).forEach(el=>el.innerHTML+=html);
    for(const r of all)if((r.record||[]).some(x=>x.result==="absent"))tag(r.rikishiID,'<span class="tag">休場</span>');
    await pool(all,async r=>{const d=await api(`/rikishi/${r.rikishiID}?ranks=true`,86400);if(!live(my))return;const hist=(d.rankHistory||[]).filter(x=>x.bashoId<basho);const curv=parseRank(r.rank);const prevVals=hist.map(x=>parseRank(x.rank));
      const inDiv=v=>div==="Makuuchi"?v.ord<=5:v.ord===6;
      const last=hist.sort((a,b)=>b.bashoId.localeCompare(a.bashoId))[0];
      const prevIn=last&&inDiv(parseRank(last.rank));const ever=prevVals.some(inDiv);
      if(!prevIn){if(!ever)tag(r.rikishiID,`<span class="tag hot">${div==="Makuuchi"?"新入幕":"新十両"}</span>`);else tag(r.rikishiID,`<span class="tag">${div==="Makuuchi"?"再入幕":"再十両"}</span>`)}
      if(prevVals.length&&curv.val<Math.min(...prevVals.map(v=>v.val))&&prevIn)tag(r.rikishiID,'<span class="tag hot">自己最高位</span>');
    },6);
  }
}
function hoshiCard(r,sek,heyaEn,basho){
  const p=parseRank(r.rank),rec=r.record||[],rc=recOf(rec,sek);
  const cells=Array.from({length:15},(_,i)=>{const h=hoshi(rec[i],sek);return`<span class="${h}" title="${i+1}日目">${h==="A"?"や":""}</span>`}).join("");
  const rows=rec.map((x,i)=>{const h=hoshi(x,sek);if(!h)return"";const opp=x.opponentID?link(x.opponentID,cleanJp(x.opponentShikonaJp,x.opponentShikonaEn)):"";return`<tr><td class="muted">${i+1}日目</td><td class="${h==="W"||h==="FW"?"w":h==="A"?"muted":"l"}">${HOSHI_CH[h]}</td><td>${opp}</td><td class="muted">${esc(kim(x.kimarite))}</td></tr>`}).join("");
  const ich=ichOf(heyaEn);
  return`<h3>${esc(nm(r.rikishiID,r.shikonaEn))}</h3>
  <div class="muted">${esc(p.full)}${heyaEn?`・${heyaLink(heyaEn)}部屋 ${ichDot(ich)}${ich?ich+"一門":""}`:""}</div>
  <div style="margin-top:6px"><b>${bashoName(basho)}</b> ${recHtml(rc)}</div>
  <div class="hoshi">${cells}</div>
  <table class="plist">${rows||'<tr><td class="muted">取組はまだありません</td></tr>'}</table>
  <p style="margin:10px 0 0"><a class="btn" href="#r-${r.rikishiID}">力士ページへ →</a></p>`;
}
