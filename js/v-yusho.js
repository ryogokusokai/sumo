"use strict";
/* ---------- 優勝争い・優勝予想 ----------
   ・状況と残りの相手：取組編成のルールをもとにしたスコア（元の「優勝争いボード」と同じ基準）
   ・優勝確率：残りの取組をモンテカルロ法でシミュレーション（目安）
   ・状況まとめ：上の計算結果から文章を自動生成
   ・AIの分析：data/analysis/{場所}.json（スケジュールタスクが毎日更新）を表示 */
const YU_SIMS=3000;
const yuDayName=d=>d===1?"初日":d===8?"中日":d===15?"千秋楽":d+"日目";
const yuRec=r=>`${r.w}勝${r.l}敗${r.a?r.a+"休":""}`;

function yushoState(bz,heyaOf,div){
  const raw=[...(bz.east||[]),...(bz.west||[])];
  const list=raw.map(r=>{
    const rk=parseRank(r.rank)||{val:99999,ord:9,num:99,short:"",full:""};const rec=r.record||[];
    let w=0,l=0,a=0;const faced=new Set(),next=[],res=new Array(15).fill("");
    rec.forEach((x,i)=>{const s=x.result||"";
      if(s){res[i]=s;if(s==="win"||s==="fusen win")w++;else if(s==="loss"||s==="fusen loss")l++;else if(s==="absent")a++;if(x.opponentID&&s!=="absent")faced.add(x.opponentID)}
      else if(x.opponentID&&(x.opponentShikonaEn||x.opponentShikonaJp))next.push({day:i+1,opp:x.opponentID,en:x.opponentShikonaEn,jp:cleanJp(x.opponentShikonaJp,x.opponentShikonaEn)})});
    const last=[...rec].reverse().find(x=>x.result);
    const kyujo=!!last&&(last.result==="absent"||last.result==="fusen loss")&&!next.length;
    const played=res.filter(Boolean).length;
    return{id:r.rikishiID,en:r.shikonaEn,rk,rec,res,w,l,a,played,rem:kyujo?0:15-played,faced,next,kyujo,heya:heyaOf[r.rikishiID]||""};
  }).sort((a,b)=>a.rk.val-b.rk.val);
  list.forEach((r,i)=>{r.slot=Math.floor(i/2);r.idx=i});
  for(const r of list)for(const n of r.next)if(!NAMES[n.opp]&&n.jp)NAMES[n.opp]=n.jp;
  const byId=new Map(list.map(r=>[r.id,r]));
  let maxDay=0;for(const r of list)maxDay=Math.max(maxDay,dayFromRecord(r.rec));
  const pending=maxDay?list.filter(r=>{const x=r.rec[maxDay-1];return x&&!x.result&&x.opponentID}).length:0;
  const leaderW=Math.max(0,...list.map(r=>r.w));
  const act=list.filter(r=>!r.kyujo);
  const minL=act.length?Math.min(...act.map(r=>r.l+r.a)):0;
  const maxL=minL+2;
  for(const r of list){r.diff=leaderW-r.w;r.maxW=r.w+r.rem;r.alive=!r.kyujo&&r.maxW>=leaderW&&(maxDay<=8||r.l+r.a<=maxL)}
  /* 残りの相手の見込み（元ボードの判定基準） */
  const mk=div==="Makuuchi";
  for(const r of list.filter(x=>x.alive)){
    const sched=new Set(r.next.map(n=>n.opp));
    r.cands=list.filter(o=>o!==r&&!o.kyujo&&!r.faced.has(o.id)&&!sched.has(o.id)&&!(r.heya&&o.heya===r.heya)).map(o=>{
      let s=0;const why=[];
      if(mk){
        if(o.alive&&o.diff<=2){s+=3;why.push("相手も優勝争い")}else if(o.alive){s+=1;why.push("相手も優勝圏内")}
        if(r.rk.ord>=5&&o.rk.ord<=4){s+=2;why.push("三役以上との割崩し")}
        if(r.rk.ord<=2&&o.rk.ord<=2){s+=4;why.push("横綱・大関どうし")}
        if(Math.abs(o.w-r.w)<=1){s+=1;why.push("星が近い")}
        if(Math.abs(o.slot-r.slot)<=6){s+=1;why.push("番付が近い")}
      }else{
        if(o.alive){s+=3;why.push("相手も優勝争い")}
        if(o.rk.ord===6&&o.rk.num<=3&&r.rk.val>o.rk.val){s+=2;why.push("十両上位")}
        if(Math.abs(o.w-r.w)<=1){s+=1;why.push("星が近い")}
        if(Math.abs(o.slot-r.slot)<=3){s+=1;why.push("番付が近い")}
      }
      return{o,s,lv:s>=4?"高":s>=2?"中":"低",why:why.join("・")};
    }).sort((a,b)=>b.s-a.s||a.o.rk.val-b.o.rk.val);
  }
  return{list,byId,maxDay,pending,leaderW,minL,maxL,div};
}

/* 強さの目安：今場所の星（3勝3敗を足して平滑化）＋番付 */
function yuStrength(r){const rb={1:.45,2:.3,3:.15,4:.1}[r.rk.ord]||0;const num=r.rk.ord>=5?-(r.rk.num||0)*.012:0;return .8*Math.log((r.w+3)/(r.l+3))+rb+num}

function yushoSim(S,n=YU_SIMS){
  const L=S.list,N=L.length,idx=new Map(L.map((r,i)=>[r.id,i]));
  const st=L.map(yuStrength),outS=S.div==="Makuuchi"?-.3:0;
  const pw=(a,b)=>1/(1+Math.exp(-(a-b)));
  const known=[];const knownOn=new Set();let lastKnown=0;
  L.forEach((r,i)=>{for(const x of r.next){const j=idx.get(x.opp);lastKnown=Math.max(lastKnown,x.day);knownOn.add(x.day+":"+i);if(j==null)known.push({d:x.day,i,j:-1});else if(i<j)known.push({d:x.day,i,j})}});
  const baseF=new Uint8Array(N*N);L.forEach((r,i)=>{for(const o of r.faced){const j=idx.get(o);if(j!=null)baseF[i*N+j]=1}});
  for(const k of known)if(k.j>=0){baseF[k.i*N+k.j]=baseF[k.j*N+k.i]=1}
  const wins=new Float64Array(N),line={},kb=known.filter(k=>k.j>=0).map(k=>({...k,eW:new Float64Array(N),eN:0,wW:new Float64Array(N),wN:0}));
  const order=L.map((_,i)=>i);
  for(let s=0;s<n;s++){
    const W=L.map(r=>r.w),F=baseF.slice(),out=new Uint8Array(kb.length);
    for(let d=1;d<=15;d++){
      if(d<=lastKnown){
        for(const k of known){if(k.d!==d)continue;
          if(k.j<0){if(Math.random()<pw(st[k.i],outS))W[k.i]++}
          else{const e=Math.random()<pw(st[k.i],st[k.j]);e?W[k.i]++:W[k.j]++;const t=kb.findIndex(b=>b.d===d&&b.i===k.i&&b.j===k.j);if(t>=0)out[t]=e?1:2}}
        continue;
      }
      const av=order.filter(i=>!L[i].kyujo&&!L[i].res[d-1]);
      av.sort((a,b)=>W[b]-W[a]||a-b);
      const used=new Uint8Array(N);
      for(const i of av){if(used[i])continue;used[i]=1;let pj=-1;
        for(const j of av){if(used[j]||F[i*N+j])continue;if(L[i].heya&&L[i].heya===L[j].heya)continue;pj=j;break}
        if(pj<0){if(Math.random()<pw(st[i],outS))W[i]++;continue}
        used[pj]=1;F[i*N+pj]=F[pj*N+i]=1;Math.random()<pw(st[i],st[pj])?W[i]++:W[pj]++}
    }
    const top=Math.max(...W);line[top]=(line[top]||0)+1;
    const tied=W.map((w,i)=>w===top?i:-1).filter(i=>i>=0);
    let win=tied[0];if(tied.length>1){const ws=tied.map(i=>Math.exp(st[i]*1.2));let x=Math.random()*ws.reduce((a,b)=>a+b);for(let t=0;t<tied.length;t++){x-=ws[t];if(x<=0){win=tied[t];break}}}
    wins[win]++;
    kb.forEach((b,t)=>{if(out[t]===1){b.eW[win]++;b.eN++}else if(out[t]===2){b.wW[win]++;b.wN++}});
  }
  const prob=new Map(L.map((r,i)=>[r.id,wins[i]/n]));
  /* 一番ごとの影響度：どちらが勝つかで優勝確率がどれだけ動くか */
  const swing=kb.map(b=>{let best=0,who=-1,pe=0,pw2=0;for(let i=0;i<N;i++){const a=b.eN?b.eW[i]/b.eN:0,c=b.wN?b.wW[i]/b.wN:0;if(Math.abs(a-c)>best){best=Math.abs(a-c);who=i;pe=a;pw2=c}}return{d:b.d,e:L[b.i],w:L[b.j],best,who:who>=0?L[who]:null,pe,pw:pw2}}).sort((a,b)=>b.best-a.best);
  return{prob,line,n,swing};
}

function yuSummary(S,sim){
  const L=S.list,out=[];const nmr=r=>nm(r.id,r.en);
  const g=k=>L.filter(r=>!r.kyujo&&r.diff===k);
  const g0=L.filter(r=>r.diff===0);
  if(!S.maxDay)return["まだ取組が始まっていません。"];
  const fin=S.maxDay===15&&!S.pending;
  const clinch=g0.length===1&&L.every(r=>r===g0[0]||r.maxW<g0[0].w)?g0[0]:null;
  if(fin){out.push(g0.length===1?`千秋楽を終えて、${nmr(g0[0])}が${yuRec(g0[0])}で最多勝です。`:`千秋楽を終えて、${g0.map(nmr).join("・")}が${yuRec(g0[0])}で並びました（優勝決定戦の結果はこのページでは扱っていません）。`);return out}
  if(clinch)out.push(`${nmr(clinch)}の優勝が決まりました（${yuRec(clinch)}。ほかの力士は残り全勝しても届きません）。`);
  out.push(`首位は${g0.map(nmr).join("・")}（${yuRec(g0[0])}）${g0.length===1?"の単独":`の${g0.length}人`}。`+[1,2].map(k=>{const x=g(k);return x.length?`${k}差に${x.slice(0,6).map(nmr).join("・")}${x.length>6?`ほか${x.length-6}人`:""}`:""}).filter(Boolean).join("、")+"。");
  const pr=[...L].map(r=>({r,p:sim.prob.get(r.id)})).filter(o=>o.p>=.005).sort((a,b)=>b.p-a.p);
  if(pr.length&&!clinch)out.push(`残りの取組を${sim.n.toLocaleString()}回シミュレーションすると、優勝確率は${pr.slice(0,4).map(o=>`${nmr(o.r)} ${yuPct(o.p)}`).join("、")}です。`);
  const ln=Object.entries(sim.line).map(([w,c])=>[+w,c]).sort((a,b)=>b[1]-a[1]);
  if(ln.length&&!clinch){const tot=sim.n;const acc=Object.entries(sim.line).map(([w,c])=>[+w,c]).sort((a,b)=>a[0]-b[0]);let c=0,lo=null,hi=null;for(const [w,k] of acc){c+=k;if(lo==null&&c>=tot*.1)lo=w;if(hi==null&&c>=tot*.9)hi=w}
    out.push(`優勝ラインは${ln[0][0]}勝の可能性が最も高く（${yuPct(ln[0][1]/tot)}）、8割がたは${lo===hi?lo+"勝":lo+"〜"+hi+"勝"}に収まる見込みです。`)}
  for(const r of g0){if(clinch)break;const rest=L.filter(o=>o!==r&&!o.kyujo);
    if(rest.every(o=>o.maxW<r.maxW))out.push(`${nmr(r)}は残り${r.rem}番を全勝すれば、ほかの結果に関係なく優勝が決まります。`);
    else if(rest.every(o=>o.maxW<=r.maxW)&&r.rem)out.push(`${nmr(r)}は残り全勝なら、少なくとも優勝決定戦には進めます。`)}
  const nd=Math.min(...L.flatMap(r=>r.next.map(n=>n.day)),99);
  if(nd<99){const seen=new Set(),bouts=[];
    for(const r of L.filter(x=>x.alive))for(const n of r.next.filter(x=>x.day===nd)){const k=[r.id,n.opp].sort().join("-");if(seen.has(k))continue;seen.add(k);const o=S.byId.get(n.opp);bouts.push({r,o,n,both:o&&o.alive})}
    const direct=bouts.filter(b=>b.both);
    if(direct.length)out.push(`${yuDayName(nd)}は${direct.map(b=>`${nmr(b.r)}（${yuRec(b.r)}）－${nmr(b.o)}（${yuRec(b.o)}）`).join("、")}の優勝争いどうしの対戦があります。`);
    const sw=sim.swing.filter(x=>x.d===nd&&x.who)[0];
    if(sw&&sw.best>=.05)out.push(`${yuDayName(nd)}で一番影響が大きいのは${nmr(sw.e)}－${nmr(sw.w)}です。${nmr(sw.who)}の優勝確率は、${nmr(sw.e)}が勝つと${yuPct(sw.pe)}、${nmr(sw.w)}が勝つと${yuPct(sw.pw)}に変わります。`);
  }
  return out;
}
const yuPct=p=>p>=.995?"99%以上":p<.005?"1%未満":Math.round(p*100)+"%";

async function yuAnalysis(basho){
  try{const r=await fetch(`data/analysis/${basho}.json?t=${Math.floor(Date.now()/300000)}`);if(!r.ok)return null;return await r.json()}catch(e){return null}
}
function yuAnalysisHtml(A,div,S){
  const D=A&&A.divisions&&A.divisions[div];
  if(!D)return'<div class="card muted">この場所・この段のAIの分析はまだありません。毎日、取組が終わったあと（19時ごろ）に更新されます。</div>';
  const stale=S.maxDay>D.asOfDay||(S.maxDay===D.asOfDay&&S.pending);
  const pk=(D.picks||[]).map((p,i)=>`<div class="kv ${i===0?"lead":""}"><span>${esc(p.role)}</span><b>${p.rid?link(p.rid,p.name):esc(p.name)}</b><span>${esc(p.info||"")}</span></div>`).join("");
  return`<div class="card yai">
   <div class="muted">${esc(D.asOfLabel||D.asOfDay+"日目終了時点")}の分析（更新 ${esc((A.updated||"").replace("T"," ").slice(0,16))}）${stale?`　<span class="tag hot">最新の結果（${S.maxDay}日目${S.pending?"途中":""}）は未反映</span>`:""}</div>
   ${D.headline?`<p class="yhead">${esc(D.headline)}</p>`:""}
   ${pk?`<div class="grid">${pk}</div>`:""}
   ${(D.sections||[]).map(s=>`<details ${s.open?"open":""}><summary>${esc(s.h)}</summary><ul>${(s.items||[]).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></details>`).join("")}
   ${D.note?`<p class="muted">${esc(D.note)}</p>`:""}</div>`;
}

const YU_H2H=new Map();
async function yuH2H(a,b){const k=a+"-"+b;if(YU_H2H.has(k))return YU_H2H.get(k);const z=await api(`/rikishi/${a}/matches/${b}`,86400);const v={w:z.rikishiWins||0,l:z.opponentWins||0};YU_H2H.set(k,v);return v}

async function viewYusho(basho,div,my){
  const cur=await currentBasho();basho=basho||cur;div=div==="Juryo"?"Juryo":"Makuuchi";
  const [bz,all,A]=await Promise.all([api(`/basho/${basho}/banzuke/${div}`,bashoTTL(basho)),loadAllRikishi().catch(()=>[]),yuAnalysis(basho)]);
  if(!live(my))return;
  addNames(bz.east);addNames(bz.west);
  const heyaOf={};for(const r of all||[])heyaOf[r.id]=r.heya;
  const S=yushoState(bz,heyaOf,div);
  if(!S.list.length){render(`<h1>${bashoName(basho)} 優勝争い</h1><div class="card muted">番付データがありません。</div>`);return}
  const sim=S.maxDay&&!(S.maxDay===15&&!S.pending)?yushoSim(S):{prob:new Map(),line:{},n:0,swing:[]};
  const asOf=S.maxDay?(S.pending?`${S.maxDay}日目 途中経過`:`${S.maxDay}日目終了時点`):"場所前";
  const L=S.list,alive=L.filter(r=>r.alive).sort((a,b)=>a.diff-b.diff||(sim.prob.get(b.id)||0)-(sim.prob.get(a.id)||0)||a.rk.val-b.rk.val);
  const grp=k=>L.filter(r=>!r.kyujo&&r.diff===k);
  const names=(x,max=8)=>x.slice(0,max).map(r=>link(r.id,r.en)).join("・")+(x.length>max?` ほか${x.length-max}人`:"")||"なし";
  const pr=L.map(r=>({r,p:sim.prob.get(r.id)||0})).filter(o=>o.p>=.005).sort((a,b)=>b.p-a.p);
  const hoshiStr=r=>r.res.map((s,i)=>{const c=s==="win"?"○":s==="loss"?"●":s==="fusen win"?"□":s==="fusen loss"?"■":s==="absent"?"や":"";return c?`<span class="${/win/.test(s)?"w":/loss/.test(s)?"l":"muted"}">${c}</span>`:""}).join("");
  const chip=(r,c)=>`<span class="ychip ${c.lv==="高"?"h":c.lv==="中"?"m":"lo"}" title="${esc(c.o.rk.short+" "+yuRec(c.o)+"／"+c.why)}">${link(c.o.id,c.o.en)} <small>${c.o.rk.short} ${c.o.w}-${c.o.l}</small><small class="h2h" data-a="${r.id}" data-b="${c.o.id}"></small></span>`;
  render(`<h1>${bashoName(basho)} 優勝争い・予想 ${DIVJP[div]}</h1>
  <div class="ctrl"><select id="bsel">${bashoOpts(cur,basho)}</select>
   <span class="seg" id="ydiv">${[["Makuuchi","幕内"],["Juryo","十両"]].map(([k,j])=>`<button data-d="${k}" class="${k===div?"on":""}">${j}</button>`).join("")}</span>
   <span class="muted">${asOf}${S.pending?`（${S.maxDay}日目の取組が${S.pending}人分残っています）`:""}</span></div>
  <div class="grid">
   <div class="kv lead"><span>首位 ${S.leaderW}勝</span><b>${names(grp(0),4)}</b></div>
   <div class="kv"><span>1差 ${Math.max(0,S.leaderW-1)}勝</span><b>${names(grp(1),4)}</b></div>
   <div class="kv"><span>2差 ${Math.max(0,S.leaderW-2)}勝</span><b>${names(grp(2),4)}</b></div>
   <div class="kv"><span>優勝の可能性</span><b>${alive.length}人</b><span>${S.maxDay>8?`${S.maxL}敗以内で首位に届く力士`:"計算上、首位に届く力士"}</span></div>
  </div>
  ${pr.length?`<h2>優勝確率（シミュレーション）</h2><div class="card">${pr.slice(0,10).map(o=>`<div class="prow"><span class="pn">${link(o.r.id,o.r.en)} <span class="muted">${o.r.rk.short} ${yuRec(o.r)}</span></span><span class="pb"><i style="width:${(o.p*100).toFixed(1)}%"></i></span><b class="pp">${yuPct(o.p)}</b></div>`).join("")}
   <p class="muted" style="margin:8px 0 0">残りの取組を${sim.n.toLocaleString()}回くり返し計算した目安です。発表済みの取組はそのまま、未発表の日は「星の近い力士どうし・未対戦・別部屋」で組み、勝敗は今場所の成績と番付から出した強さで決めています。けがの状態などは入っていません。</p></div>`:""}
  <h2>状況まとめ（自動）</h2><div class="card"><ul class="ysum">${yuSummary(S,sim).map(t=>`<li>${esc(t)}</li>`).join("")}</ul><p class="muted" style="margin:6px 0 0">ページを開いた時点のデータから自動で作った文章です。</p></div>
  <h2>AIの分析</h2>${yuAnalysisHtml(A,div,S)}
  <h2>優勝争いの力士と残りの相手</h2>
  <div class="legend ylegend"><span class="ychip h">高</span>当たる見込みが高い <span class="ychip m">中</span>可能性あり <span class="ychip lo">低</span>ルール上は可能　<span class="muted">数字は幕下以下も含めた通算対戦成績</span></div>
  <div class="ycards">${alive.slice(0,12).map(r=>{const p=sim.prob.get(r.id);const top=(r.cands||[]).filter(c=>c.lv!=="低"),low=(r.cands||[]).filter(c=>c.lv==="低");
   return`<article class="card ycard ${r.diff===0?"t1":r.diff<=2?"t2":"t3"}">
    <div class="yhd"><span>${link(r.id,r.en)} <span class="muted">${r.rk.full}・${esc(heya(r.heya))}</span></span><span>${r.diff===0?'<span class="tag hot">首位</span>':`<span class="tag">${r.diff}差</span>`} <b>${yuRec(r)}</b>${p!=null&&sim.n?` <span class="muted">${yuPct(p)}</span>`:""}</span></div>
    <div class="ymarks">${hoshiStr(r)}</div>
    ${r.next.length?`<div><div class="muted">発表済みの取組</div>${r.next.map(n=>{const o=S.byId.get(n.opp);return`<span class="ychip sched">${yuDayName(n.day)} ${link(n.opp,n.en)}${o?` <small>${o.rk.short} ${o.w}-${o.l}</small>`:""}<small class="h2h" data-a="${r.id}" data-b="${n.opp}"></small></span>`}).join("")}</div>`:""}
    <div><div class="muted">この先当たる可能性のある相手（見込み順）</div><div class="ychips">${top.map(c=>chip(r,c)).join("")||'<span class="muted">該当なし</span>'}</div></div>
    ${low.length?`<details><summary class="muted">ルール上は当たりうる相手 ${low.length}人</summary><div class="ychips">${low.map(c=>chip(r,c)).join("")}</div></details>`:""}
   </article>`}).join("")||'<div class="card muted">優勝の可能性がある力士はいません。</div>'}</div>${alive.length>12?`<p class="muted">ほか${alive.length-12}人（${alive.slice(12).map(r=>esc(nm(r.id,r.en))).join("・")}）</p>`:""}
  <details class="card"><summary><b>判定方法と取組編成のルール</b></summary>
   <ul class="ysum">
    <li>取組は審判部が前日に翌日分を決めます。同じ部屋どうし・同じ場所での再戦はありません（優勝決定戦を除く）。終盤は優勝争いを優先し、平幕でも星を伸ばしていれば上位と当てられます（割崩し）。</li>
    <li><b>優勝の可能性</b>：残り全勝で首位の今の勝ち星に届く力士。中日（8日目）を過ぎてからは、首位の黒星＋2敗以内に絞っています。休場中の力士は除きます。</li>
    <li><b>見込み（高・中・低）</b>：${div==="Makuuchi"?"相手も優勝争い（首位と2差以内）＋3、優勝圏内（3差以上）＋1、平幕から見て三役以上の相手＋2、横綱・大関どうし＋4、星の差1以内＋1、番付が近い（6枚以内）＋1":"相手も優勝争い＋3、十両三枚目以上の相手で自分がそれより下＋2、星の差1以内＋1、番付が近い（3枚以内）＋1"}。4点以上を「高」、2〜3点を「中」としています。${div==="Juryo"?"十両は幕内・幕下と当たることもありますが、候補は十両の力士だけです。":""}</li>
    <li>未対戦・別部屋の判定には、Sumo APIの今場所の取組記録と現在の所属部屋を使っています。</li>
   </ul></details>`);
  $("#bsel").onchange=e=>location.hash=`yusho-${e.target.value}-${div}`;
  $$("#ydiv button").forEach(b=>b.onclick=()=>location.hash=`yusho-${basho}-${b.dataset.d}`);
  /* 対戦成績は後から埋める（上位の候補だけ） */
  const els=$$(".ycards .h2h");const seen=new Set();const jobs=[];
  for(const el of els){const k=el.dataset.a+"-"+el.dataset.b;if(!seen.has(k)){seen.add(k);jobs.push(el)}}
  await pool(jobs.slice(0,60),async el=>{const v=await yuH2H(el.dataset.a,el.dataset.b);if(!live(my))return;
    $$(`.h2h[data-a="${el.dataset.a}"][data-b="${el.dataset.b}"]`).forEach(x=>{x.textContent=` 通算${v.w}-${v.l}`;x.classList.add(v.w>v.l?"w":v.l>v.w?"l":"muted")})},4);
}

/* ルーティング：core.js の route() は該当しないハッシュを番付として扱うので、
   番付の描画関数を包んで #yusho をここで受け持つ */
{const _vb=viewBanzuke;viewBanzuke=async function(b,d,my){const h=decodeURIComponent(location.hash.slice(1));const m=h.match(/^yusho(?:-(\d{6}))?(?:-(\w+))?$/);if(m){setNav("yusho");app.innerHTML=skeleton("list");return viewYusho(m[1],m[2],my)}return _vb(b,d,my)}}
