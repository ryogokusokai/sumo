"use strict";
/* ---------- 取組結果（スワイプで日送り、優勝争いグラフ） ---------- */
const RACE_OFF=new Set();
async function viewDay(basho,day,div,my){
  const cur=await currentBasho();basho=basho||cur;div=DIVJP[div]?div:"Makuuchi";
  const bz=await api(`/basho/${basho}/banzuke/Makuuchi`,bashoTTL(basho));if(!live(my))return;
  addNames(bz.east);addNames(bz.west);
  const mk=[...(bz.east||[]),...(bz.west||[])];
  let maxDay=0;for(const r of mk)maxDay=Math.max(maxDay,dayFromRecord(r.record));
  day=Math.min(15,Math.max(1,+(day||maxDay||1)));
  if(div!=="Makuuchi"){const z=await api(`/basho/${basho}/banzuke/${div}`,bashoTTL(basho));addNames(z.east);addNames(z.west)}
  const t=await api(`/basho/${basho}/torikumi/${div}/${day}`,bashoTTL(basho));if(!live(my))return;
  const tk=(t.torikumi||[]).slice().sort((a,b)=>a.matchNo-b.matchNo);
  const mark=(id,w)=>!w?"":id===w?'<span class="w">○</span>':'<span class="l">●</span>';
  /* 優勝争い */
  const recs=mk.map(r=>({id:r.rikishiID,en:r.shikonaEn,rank:parseRank(r.rank),rc:recOf(r.record,true),rec:r.record||[]}));
  const minL=Math.min(...recs.map(x=>x.rc.l+x.rc.a));
  const groups=[0,1,2].map(g=>recs.filter(x=>x.rc.l+x.rc.a===minL+g).sort((a,b)=>b.rc.w-a.rc.w||a.rank.val-b.rank.val));
  const cont=groups.flat().slice(0,10);
  const go=d=>{if(d>=1&&d<=15)location.hash=`day-${basho}-${d}-${div}`};
  render(`<h1>${bashoName(basho)} ${day}日目 ${DIVJP[div]}</h1>
  <div class="ctrl"><select id="bsel">${bashoOpts(cur,basho)}</select>
   <span style="margin-left:auto;display:flex;gap:6px"><button class="btn" id="prev" ${day<=1?"disabled":""}>‹ 前日</button><button class="btn" id="next" ${day>=15?"disabled":""}>翌日 ›</button></span></div>
  <div class="tabs" id="days">${Array.from({length:15},(_,i)=>`<button data-x="${i+1}" class="${i+1===day?"on":""}">${i+1}</button>`).join("")}</div>
  <div class="tabs" id="divs">${DIVS.map(([k,j])=>`<button data-d="${k}" class="${k===div?"on":""}">${j}</button>`).join("")}</div>
  <div class="swipehint">← 左右にスワイプで日を切り替え →</div>
  <div id="bouts">${tk.length?`<div class="card scroll"><table class="bout"><thead><tr><th class="r">東</th><th></th><th class="c">決まり手</th><th></th><th>西</th></tr></thead><tbody>
  ${tk.map(x=>{const er=parseRank(x.eastRank),wr=parseRank(x.westRank);return`<tr><td class="r"><span class="muted">${er?er.short:""}</span> ${link(x.eastId,x.eastShikona)}</td><td class="c">${mark(x.eastId,x.winnerId)}</td><td class="mid">${esc(kim(x.kimarite))||(x.winnerId?"":"—")}</td><td class="c">${mark(x.westId,x.winnerId)}</td><td>${link(x.westId,x.westShikona)} <span class="muted">${wr?wr.short:""}</span></td></tr>`}).join("")}
  </tbody></table></div>`:'<div class="card muted">この日の取組データはありません。</div>'}</div>
  <h2>幕内 優勝争い（${maxDay}日目終了時点）</h2>
  <div class="card">${groups.map((g,i)=>g.length?`<div style="margin-bottom:8px"><b>${i===0?"首位":i+"差"}</b>（${g[0].rc.txt}）：${g.slice(0,i===2?12:30).map(x=>`<span class="muted">${x.rank.short}</span> ${link(x.id,x.en)}`).join("、")}${g.length>(i===2?12:30)?` ほか${g.length-(i===2?12:30)}人`:""}</div>`:"").join("")}
   ${maxDay>=2&&cont.length?`<div class="muted" style="margin:10px 0 4px">勝ち数の推移（上位${cont.length}人）　グラフをなぞると日ごとの勝ち数、凡例タップで表示切替</div><div class="chartwrap" id="race"></div><div class="legend" id="raceleg"></div>`:""}</div>`);
  $("#bsel").onchange=e=>location.hash=`day-${e.target.value}-1-${div}`;
  $$("#days button").forEach(b=>b.onclick=()=>go(+b.dataset.x));
  $$("#divs button").forEach(b=>b.onclick=()=>location.hash=`day-${basho}-${day}-${b.dataset.d}`);
  $("#prev").onclick=()=>go(day-1);$("#next").onclick=()=>go(day+1);
  onSwipe($("#bouts"),()=>go(day+1),()=>go(day-1));
  if(maxDay>=2&&cont.length){
    const xs=Array.from({length:maxDay},(_,i)=>(i+1)+"日");
    const series=cont.map((c,k)=>{let w=0;return{id:c.id,name:nm(c.id,c.en),color:PALETTE[k%PALETTE.length],values:xs.map((_,i)=>{const s=(c.rec[i]||{}).result||"";if(s==="win"||s==="fusen win")w++;return w}),off:RACE_OFF.has(c.id)}});
    const draw=()=>{lineChart($("#race"),series,xs,{h:260,yMax:maxDay,onTip:i=>`<b>${i+1}日目</b><br>`+series.filter(s=>!s.off).map(s=>({s,v:s.values[i]})).sort((a,b)=>b.v-a.v).map(o=>`<span style="color:${o.s.color}">●</span> ${esc(o.s.name)} ${o.v}勝`).join("<br>")});
      $("#raceleg").innerHTML=series.map(s=>`<button data-id="${s.id}" class="${s.off?"off":""}"><i style="background:${s.color}"></i>${esc(s.name)}</button>`).join("");
      $$("#raceleg button").forEach(b=>b.onclick=()=>{const s=series.find(x=>String(x.id)===b.dataset.id);s.off=!s.off;s.off?RACE_OFF.add(s.id):RACE_OFF.delete(s.id);draw()})};
    draw();
  }
}
