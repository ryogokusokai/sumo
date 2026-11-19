"use strict";
/* ---------- 力士詳細（番付グラフをなぞる・期間切替、決まり手で絞込、対戦相手を展開） ---------- */
let RK_RANGE="all";
async function viewRikishi(id,my){
  const [r,st]=await Promise.all([api(`/rikishi/${id}?ranks=true&shikonas=true&measurements=true`,3600),api(`/rikishi/${id}/stats`,3600)]);
  let matches=[],skip=0;
  while(true){const m=await api(`/rikishi/${id}/matches?limit=1000&skip=${skip}`,600);const rs=m.records||[];matches=matches.concat(rs);if(rs.length<1000)break;skip+=1000}
  try{await loadAllRikishi()}catch(e){}
  if(!live(my))return;
  const jp=cleanJp(r.shikonaJp,r.shikonaEn);NAMES[id]=jp;
  const ranks=(r.rankHistory||[]).slice().sort((a,b)=>a.bashoId.localeCompare(b.bashoId));
  const pr=ranks.map(x=>({b:x.bashoId,p:parseRank(x.rank)})).filter(x=>x.p&&x.p.ord);
  const best=pr.length?pr.reduce((a,b)=>b.p.val<a.p.val?b:a):null;
  const key=m=>m.bashoId+String(m.day).padStart(2,"0");
  const ms=matches.slice().sort((a,b)=>key(b).localeCompare(key(a)));
  const oppOf=m=>m.eastId===id?{id:m.westId,en:m.westShikona}:{id:m.eastId,en:m.eastShikona};
  const res=m=>!m.winnerId?"":m.winnerId===id?'<span class="w">○</span>':'<span class="l">●</span>';
  /* 場所別 */
  const byB={};for(const m of matches){const o=byB[m.bashoId]||(byB[m.bashoId]={w:0,l:0});if(m.winnerId===id)o.w++;else if(m.winnerId)o.l++}
  const rankOf=Object.fromEntries(ranks.map(x=>[x.bashoId,parseRank(x.rank)]));
  const bashoRows=Object.keys({...byB,...rankOf}).sort().reverse();
  /* 決まり手 */
  const kw={},kl={};for(const m of matches){if(!m.kimarite||!m.winnerId)continue;const k=kim(m.kimarite);if(m.winnerId===id)kw[k]=(kw[k]||0)+1;else kl[k]=(kl[k]||0)+1}
  const kTable=(o,side)=>{const t=Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,10),mx=t.length?t[0][1]:1,tot=Object.values(o).reduce((a,b)=>a+b,0)||1;return t.map(([k,n])=>`<tr class="clickable" data-k="${esc(k)}" data-s="${side}"><td>${esc(k)}</td><td style="width:45%"><div class="bar" style="width:0;${side==="l"?"background:var(--sub)":""}" data-w="${n/mx*100}"></div></td><td class="r">${n}</td><td class="r muted">${(n/tot*100).toFixed(0)}%</td></tr>`).join("")||'<tr><td class="muted">データなし</td></tr>'};
  /* 対戦 */
  const h2h={};for(const m of ms){const o=oppOf(m);const x=h2h[o.id]||(h2h[o.id]={id:o.id,en:o.en,w:0,l:0,list:[]});if(m.winnerId===id)x.w++;else if(m.winnerId)x.l++;x.list.push(m)}
  const h2hRows=Object.values(h2h).sort((a,b)=>(b.w+b.l)-(a.w+a.l)||key(b.list[0]).localeCompare(key(a.list[0])));
  const sansho=st.sansho||{};const sanshoTxt=[["Shukun-sho","殊勲賞"],["Kanto-sho","敢闘賞"],["Gino-sho","技能賞"]].map(([k,j])=>sansho[k]?j+sansho[k]:"").filter(Boolean).join("・")||"なし";
  const yushoTxt=st.yushoByDivision?Object.entries(st.yushoByDivision).filter(([,n])=>n).map(([d,n])=>(DIVJP[d]||d)+n).join("・"):"";
  const ab=st.absenceByDivision||{};
  const mkTxt=st.winsByDivision&&st.winsByDivision.Makuuchi!=null?`${st.winsByDivision.Makuuchi||0}勝${(st.lossByDivision||{}).Makuuchi||0}敗${ab.Makuuchi?ab.Makuuchi+"休":""}`:"—";
  const cur=parseRank(r.currentRank);
  const firstSeki=pr.find(x=>x.p.ord<=6);
  render(`<h1>${esc(jp)} <span class="muted">${esc(r.shikonaEn)}</span></h1>
  <div class="card"><div class="grid">
   <div class="kv"><span>現番付</span><b>${cur?esc(cur.full):"—"}</b></div>
   <div class="kv"><span>最高位</span><b>${best?esc(best.p.full.replace(/^[東西]/,"")):"—"}</b><span>${best?bashoName(best.b):""}</span></div>
   <div class="kv"><span>部屋・一門</span><b>${heyaLink(r.heya)}</b><span>${ichDot(ichOf(r.heya))}${ichOf(r.heya)?ichOf(r.heya)+"一門":""}</span></div>
   <div class="kv"><span>出身</span><b>${esc(pref(r.shusshin))}</b></div>
   <div class="kv"><span>生年月日</span><b>${ymd(r.birthDate)}</b><span>${age(r.birthDate)}歳</span></div>
   <div class="kv"><span>初土俵</span><b>${ym(r.debut)}</b></div>
   <div class="kv"><span>身長・体重</span><b>${r.height||"—"}cm / ${r.weight||"—"}kg</b></div>
   <div class="kv"><span>通算成績</span><b>${st.totalWins||0}勝${st.totalLosses||0}敗${st.totalAbsences?st.totalAbsences+"休":""}</b><span>${st.basho||0}場所</span></div>
   <div class="kv"><span>幕内成績</span><b>${mkTxt}</b></div>
   <div class="kv"><span>優勝</span><b>${yushoTxt||"なし"}</b></div>
   <div class="kv"><span>三賞</span><b style="font-size:14px">${sanshoTxt}</b></div>
  </div></div>
  <h2>番付推移</h2><div class="card">
   <div class="ctrl"><span class="seg" id="rng"><button data-r="all">全期間</button>${firstSeki&&firstSeki!==pr[0]?'<button data-r="seki">関取以降</button>':""}<button data-r="5">直近5年</button><button data-r="2">直近2年</button></span><span class="muted">グラフをなぞると場所・番付・成績を表示</span></div>
   <div class="chartwrap" id="rchart"></div></div>
  <h2>直近の取組</h2><div class="card scroll"><table><thead><tr><th>場所</th><th class="c">日</th><th class="c"></th><th>相手</th><th>決まり手</th></tr></thead><tbody>
  ${ms.slice(0,15).map(m=>{const o=oppOf(m);return`<tr><td class="muted">${bashoName(m.bashoId)}</td><td class="c">${m.day}</td><td class="c">${res(m)}</td><td>${link(o.id,o.en)}</td><td>${esc(kim(m.kimarite))}</td></tr>`}).join("")||'<tr><td colspan="5" class="muted">データなし</td></tr>'}
  </tbody></table></div>
  <h2>場所別成績</h2><div class="card scroll" style="max-height:420px;overflow:auto"><table><thead><tr><th>場所</th><th>番付</th><th class="c">成績</th></tr></thead><tbody>
  ${bashoRows.map(b=>{const x=byB[b]||{w:0,l:0};const p=rankOf[b];return`<tr><td>${bashoName(b)}</td><td>${p?esc(p.full):""}</td><td class="c"><span class="${x.w>x.l?"w":x.l>x.w?"l":""}">${x.w}-${x.l}</span></td></tr>`}).join("")}
  </tbody></table></div>
  <p class="muted">場所別成績は取組データからの集計（不戦勝・不戦敗を含み、休場は含まない）。</p>
  <h2>決まり手</h2><div class="card">
   <div class="scroll" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px"><div><b>勝ち</b><table>${kTable(kw,"w")}</table></div><div><b>負け</b><table>${kTable(kl,"l")}</table></div></div>
   <p class="muted" style="margin:8px 0 0">決まり手をタップすると、その取組の一覧を表示</p><div id="kb"></div></div>
  <h2>対戦成績</h2>
  <div class="ctrl"><input id="hq" placeholder="相手の四股名で絞り込み" style="flex:1;min-width:160px"><span class="muted">相手をタップで全対戦を表示</span></div>
  <div class="card scroll" style="max-height:560px;overflow:auto"><table><thead><tr><th>相手</th><th class="c">勝</th><th class="c">敗</th><th>最新の対戦</th></tr></thead><tbody id="h2h"></tbody></table></div>`);
  /* 決まり手バーを伸ばす */
  requestAnimationFrame(()=>$$(".bar[data-w]").forEach(b=>b.style.width=b.dataset.w+"%"));
  /* 番付推移 */
  const drawChart=()=>{
    let data=pr;const lastB=pr.length?pr[pr.length-1].b:"";
    if(RK_RANGE==="seki"&&firstSeki)data=pr.slice(pr.indexOf(firstSeki));
    else if(RK_RANGE==="5"||RK_RANGE==="2"){const y=+lastB.slice(0,4)-(+RK_RANGE);const from=y+lastB.slice(4);data=pr.filter(x=>x.b>from)}
    $$("#rng button").forEach(b=>b.classList.toggle("on",b.dataset.r===RK_RANGE));
    rankChartI($("#rchart"),data,byB);
  };
  $$("#rng button").forEach(b=>b.onclick=()=>{RK_RANGE=b.dataset.r;drawChart()});
  if(![...$$("#rng button")].some(b=>b.dataset.r===RK_RANGE))RK_RANGE="all";
  drawChart();
  /* 決まり手で絞込 */
  let kSel="";
  $$("tr[data-k]").forEach(tr=>tr.onclick=()=>{const k=tr.dataset.k,s=tr.dataset.s,sig=k+s;$$("tr[data-k]").forEach(x=>x.classList.remove("open"));
    if(kSel===sig){kSel="";$("#kb").innerHTML="";return}kSel=sig;tr.classList.add("open");
    const list=ms.filter(m=>m.winnerId&&kim(m.kimarite)===k&&((m.winnerId===id)===(s==="w")));
    $("#kb").innerHTML=`<div style="margin-top:8px"><b>${esc(k)}</b>で${s==="w"?"勝った":"負けた"}取組 ${list.length}件</div><div class="scroll" style="max-height:300px;overflow:auto"><table class="plist">${list.map(m=>{const o=oppOf(m);return`<tr><td class="muted">${bashoName(m.bashoId)} ${m.day}日目</td><td>${res(m)}</td><td>${link(o.id,o.en)}</td></tr>`}).join("")}</table></div>`;
    $("#kb").classList.remove("fade");void $("#kb").offsetWidth;});
  /* 対戦成績（タップで展開） */
  const open=new Set();
  const drawH=q=>{q=(q||"").trim().toLowerCase();$("#h2h").innerHTML=h2hRows.filter(o=>!q||nm(o.id,o.en).includes(q)||(o.en||"").toLowerCase().includes(q)).slice(0,300).map(o=>{const l=o.list[0];const main=`<tr class="clickable${open.has(o.id)?" open":""}" data-o="${o.id}"><td>${open.has(o.id)?"▾":"▸"} ${esc(nm(o.id,o.en))} <a class="muted" href="#r-${o.id}" title="力士ページへ">→</a></td><td class="c w">${o.w}</td><td class="c l">${o.l}</td><td class="muted">${bashoName(l.bashoId)}${l.day}日目 ${l.winnerId===id?"○":l.winnerId?"●":""} ${esc(kim(l.kimarite))}</td></tr>`;
    const sub=open.has(o.id)?`<tr class="sub"><td colspan="4">${o.list.map(m=>`<div>${bashoName(m.bashoId)} ${m.day}日目 ${res(m)} ${esc(kim(m.kimarite))}</div>`).join("")}</td></tr>`:"";return main+sub}).join("")};
  $("#hq").oninput=e=>drawH(e.target.value);
  $("#h2h").addEventListener("click",e=>{if(e.target.closest("a"))return;const tr=e.target.closest("tr[data-o]");if(!tr)return;const oid=+tr.dataset.o;open.has(oid)?open.delete(oid):open.add(oid);drawH($("#hq").value)});
  drawH("");
}
/* 番付推移グラフ：番付を階級の帯に配置し、なぞると内容を表示 */
function rankChartI(wrap,pr,byB){
  if(pr.length<2){wrap.innerHTML='<div class="muted">データ不足</div>';return}
  const band={1:0,2:1,3:2,4:3,5:4,6:7,7:9,8:12,9:15,10:18},span={5:3,6:2,7:3,8:3,9:3,10:2},maxN={5:17,6:14,7:60,8:100,9:110,10:30};
  const yv=p=>{const b=band[p.ord];if(p.ord<=4)return b+(p.val%2)*0.3;return b+Math.min(1,(p.num-1)/maxN[p.ord])*span[p.ord]};
  const lo=Math.max(0,Math.floor(Math.min(...pr.map(x=>yv(x.p))))-1),hi=Math.min(20,Math.ceil(Math.max(...pr.map(x=>yv(x.p))))+1);
  const W=Math.max(320,wrap.clientWidth||600),H=260,pl=48,prr=12,pt=10,pb=24;
  const Y=v=>pt+(v-lo)/((hi-lo)||1)*(H-pt-pb),X=i=>pl+i*(W-pl-prr)/(pr.length-1);
  const labels=[[0,"横綱"],[1,"大関"],[2,"関脇"],[3,"小結"],[4,"前頭"],[7,"十両"],[9,"幕下"],[12,"三段目"],[15,"序二段"],[18,"序ノ口"]].filter(([v])=>v>=lo&&v<=hi);
  const step=Math.max(1,Math.ceil(pr.length/Math.max(2,Math.floor((W-pl-prr)/56))));
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  svg+=`<rect x="${pl}" y="${Y(Math.max(lo,0))}" width="${W-pl-prr}" height="${Math.max(0,Y(Math.min(7,hi))-Y(Math.max(lo,0)))}" fill="var(--chip)" opacity=".6"/>`;
  svg+=labels.map(([v,t])=>`<line x1="${pl}" x2="${W-prr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="4" y="${Y(v)+3}">${t}</text>`).join("");
  svg+=pr.map((x,i)=>i%step===0?`<text x="${X(i)}" y="${H-8}" text-anchor="middle">${x.b.slice(0,4)}.${+x.b.slice(4)}</text>`:"").join("");
  const d=pr.map((x,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(yv(x.p)).toFixed(1)).join("");
  svg+=`<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur=".7s" fill="freeze"/></path>`;
  svg+=pr.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(yv(x.p))}" r="2.4" fill="var(--accent)"/>`).join("");
  svg+=`<line id="cx" y1="${pt}" y2="${H-pb}" stroke="var(--sub)" stroke-dasharray="3 3" visibility="hidden"/><circle id="cd" r="5" fill="none" stroke="var(--accent)" stroke-width="2" visibility="hidden"/></svg>`;
  wrap.innerHTML=svg+'<div class="tip" hidden></div>';
  const el=wrap.querySelector("svg"),tip=wrap.querySelector(".tip"),cx=wrap.querySelector("#cx"),cd=wrap.querySelector("#cd");
  const at=e=>{const rc=el.getBoundingClientRect();const px=(e.clientX-rc.left)*W/rc.width;const i=Math.max(0,Math.min(pr.length-1,Math.round((px-pl)/((W-pl-prr)/(pr.length-1)))));const x=pr[i],y=Y(yv(x.p));
    cx.setAttribute("x1",X(i));cx.setAttribute("x2",X(i));cx.setAttribute("visibility","visible");cd.setAttribute("cx",X(i));cd.setAttribute("cy",y);cd.setAttribute("visibility","visible");
    const r=byB[x.b];tip.innerHTML=`<b>${bashoName(x.b)}</b><br>${esc(x.p.full)}${r?`　${r.w}勝${r.l}敗`:""}`;tip.hidden=false;const tx=X(i)*rc.width/W;tip.style.left=Math.min(Math.max(tx,80),rc.width-80)+"px";tip.style.top="4px"};
  el.addEventListener("pointermove",at);el.addEventListener("pointerdown",at);
  el.addEventListener("pointerleave",e=>{if(e.pointerType!=="mouse")return;tip.hidden=true;cx.setAttribute("visibility","hidden");cd.setAttribute("visibility","hidden")});
}
