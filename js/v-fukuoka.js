"use strict";
/* ---------- 出身・部屋別：番付推移チャート ----------
   縦＝番付（段ごとの帯、上ほど上位）、横＝場所。力士ごとの折れ線と、最新場所の位置に名前ラベル。
   線・ラベルに乗せる（スマホはタップ）とその力士だけ強調。 */
const FK={range:"ms",span:12};
const FK_BANDS=[ /* ord:段, max:枚数の目安, h:帯の高さ(px) */
  {k:"幕内",ords:[1,2,3,4,5],max:21,h:230,c:"#2a78d6"},
  {k:"十両",ords:[6],max:14,h:120,c:"#1baf7a"},
  {k:"幕下",ords:[7],max:60,h:170,c:"#eda100"},
  {k:"三段目",ords:[8],max:100,h:110,c:"#888780"},
  {k:"序二段",ords:[9],max:110,h:100,c:"#888780"},
  {k:"序ノ口",ords:[10],max:35,h:50,c:"#888780"}];
const FK_RANGE={seki:2,ms:3,all:6};
/* 番付→帯の中の位置（0始まり、西は半枚下） */
function fkPos(rk){if(!rk||!rk.ord)return null;const b=FK_BANDS.findIndex(x=>x.ords.includes(rk.ord));if(b<0)return null;
  let s=rk.ord<=4?rk.ord-1:rk.ord===5?3+rk.num:rk.num;if(rk.ord>=6)s=rk.num-1;return{b,s:s+(rk.side==="西"?.5:0)}}
function fkShort(rk){return rk?rk.short:""}

/* 条件（出身・部屋）を #origin?pref=福岡&heya=Isegahama の形でURLに持つ */
function ogParse(h){const q=new URLSearchParams((h.split("?")[1])||"");return{pref:q.get("pref")||"",heya:q.get("heya")||""}}
function ogHash(c){const q=new URLSearchParams();if(c.pref)q.set("pref",c.pref);if(c.heya)q.set("heya",c.heya);const t=q.toString();return"origin"+(t?"?"+t:"")}
const OG_WARN=60;

async function viewOrigin(cond,my){
  const all=await loadAllRikishi();if(!live(my))return;
  const JPN=Object.values(PREF).slice(0,47);
  const usedP=new Set(all.map(r=>pref(r.shusshin)).filter(Boolean));
  const prefsF=[...usedP].filter(p=>!JPN.includes(p)).sort((a,b)=>a.localeCompare(b,"ja")),prefsJ=JPN.filter(p=>usedP.has(p));
  const heyas=[...new Set(all.map(r=>r.heya).filter(Boolean))].map(en=>[en,heya(en)]).sort((a,b)=>a[1].localeCompare(b[1],"ja"));
  const cnt=c=>all.filter(r=>(!c.pref||pref(r.shusshin)===c.pref)&&(!c.heya||r.heya===c.heya)).length;
  const optP=`<option value="">出身：指定なし</option>${[["日本（北から）",prefsJ],["海外",prefsF]].map(([g,a])=>`<optgroup label="${g}">${a.map(x=>`<option value="${esc(x)}"${x===cond.pref?" selected":""}>${esc(x)}（${cnt({pref:x,heya:cond.heya})}）</option>`).join("")}</optgroup>`).join("")}`;
  const optH=`<option value="">部屋：指定なし</option>${heyas.map(([en,j])=>`<option value="${esc(en)}"${en===cond.heya?" selected":""}>${esc(j)}（${cnt({pref:cond.pref,heya:en})}）</option>`).join("")}`;
  const label=[cond.pref&&`${cond.pref}出身`,cond.heya&&`${heya(cond.heya)}部屋`].filter(Boolean).join("・");
  render(`<h1>出身・部屋別 番付推移</h1>
  <div class="ctrl ogsel"><select id="ogp" aria-label="出身">${optP}</select><select id="ogh" aria-label="部屋">${optH}</select>${cond.pref||cond.heya?'<button id="ogclr" class="btn">クリア</button>':""}</div>
  <div id="ogbody"></div>`);
  const go=()=>{location.hash=ogHash({pref:$("#ogp").value,heya:$("#ogh").value})};
  $("#ogp").onchange=go;$("#ogh").onchange=go;if($("#ogclr"))$("#ogclr").onclick=()=>{location.hash="origin"};
  const body=$("#ogbody");
  if(!cond.pref&&!cond.heya){body.innerHTML='<div class="card muted">出身か部屋（または両方）を選ぶと、該当する現役力士の番付推移を表示します。</div>';return}
  const fk=all.filter(r=>(!cond.pref||pref(r.shusshin)===cond.pref)&&(!cond.heya||r.heya===cond.heya));
  if(!fk.length){body.innerHTML=`<div class="card muted">${esc(label)}の現役力士はいません。</div>`;return}
  body.innerHTML=`<div class="card muted">${fk.length}人の番付履歴を読み込み中…${fk.length>OG_WARN?"（人数が多いため時間がかかります）":""}</div>`;
  const hist=await pool(fk,r=>api(`/rikishi/${r.id}?ranks=true`,86400),6);if(!live(my))return;
  const cur=await currentBasho();
  const people=fk.map((r,i)=>{const h=((hist[i]||{}).rankHistory||[]).map(x=>({b:String(x.bashoId),rk:parseRank(x.rank),raw:x.rank})).filter(x=>x.rk&&x.rk.ord);
    const now=parseRank(r.currentRank);return{id:r.id,en:r.shikonaEn,jp:cleanJp(r.shikonaJp,r.shikonaEn),now,heya:r.heya,debut:r.debut,h:new Map(h.map(x=>[x.b,x]))}}).filter(p=>p.h.size||p.now);
  people.sort((a,b)=>(a.now?a.now.val:99999)-(b.now?b.now.val:99999));
  people.forEach((p,i)=>p.color=PALETTE[i%PALETTE.length]);
  const byDiv={};for(const p of people){const b=p.now?FK_BANDS.findIndex(x=>x.ords.includes(p.now.ord)):-1;const k=b>=0?FK_BANDS[b].k:"その他";byDiv[k]=(byDiv[k]||0)+1}
  const draw=()=>{
    const nB=FK_RANGE[FK.range],bands=FK_BANDS.slice(0,nB);
    let xs=bashoCandidates(200).filter(b=>b<=cur);
    const earliest=Math.min(...people.flatMap(p=>[...p.h.keys()].map(Number)),+cur);
    xs=xs.filter(b=>+b>=earliest).reverse();
    if(FK.span!=="all")xs=xs.slice(-FK.span);
    const colW=xs.length>30?22:xs.length>14?34:46,L=74,T=10,R=126;
    let y0=T;const top=bands.map(b=>{const t=y0;y0+=b.h;return t});const H=y0+28,W=L+colW*(xs.length-1)+R+20;
    const X=i=>L+10+i*colW;
    const Y=pos=>{const b=bands[pos.b];return top[pos.b]+Math.min(1,(pos.s+.5)/b.max)*b.h};
    let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" id="fksvg">`;
    bands.forEach((b,i)=>{svg+=`<rect x="${L}" y="${top[i]}" width="${W-L-R+6}" height="${b.h}" class="fkband" style="fill:${b.c}"/><text x="4" y="${top[i]+b.h/2+4}" class="fkbl">${b.k}</text>`});
    /* 幕内の内訳の目盛 */
    const mk=bands[0];if(mk&&mk.k==="幕内"){[["横綱",0],["大関",1],["関脇",2],["小結",3],["前1",4],["前5",8],["前10",13],["前15",18]].forEach(([t,s])=>{const y=Y({b:0,s});svg+=`<text x="${L-4}" y="${y+3}" text-anchor="end" class="fktk">${t}</text><line x1="${L}" x2="${W-R+6}" y1="${y}" y2="${y}" class="fkgl"/>`})}
    if(bands[1]){[1,5,10].forEach(n=>{const y=Y({b:1,s:n-1});svg+=`<text x="${L-4}" y="${y+3}" text-anchor="end" class="fktk">十${n}</text><line x1="${L}" x2="${W-R+6}" y1="${y}" y2="${y}" class="fkgl"/>`})}
    if(bands[2]){[15,30,45,60].forEach(n=>{const y=Y({b:2,s:n-1});svg+=`<text x="${L-4}" y="${y+3}" text-anchor="end" class="fktk">幕${n}</text>`})}
    const step=Math.max(1,Math.ceil(42/colW));
    xs.forEach((b,i)=>{if((xs.length-1-i)%step===0){const lab=b.slice(2,4)+"."+(+b.slice(4));svg+=`<text x="${X(i)}" y="${H-10}" text-anchor="middle" class="fktk">${lab}</text>`}});
    const labels=[];
    for(const p of people){
      let d="",pen=false,dots="",last=null;
      xs.forEach((b,i)=>{const e=p.h.get(b);const pos=e&&fkPos(e.rk);if(!pos||pos.b>=nB){pen=false;return}const x=X(i),y=Y(pos);d+=(pen?"L":"M")+x.toFixed(1)+","+y.toFixed(1);pen=true;
        dots+=`<circle cx="${x}" cy="${y}" r="2.6" data-t="${esc(bashoName(b)+"　"+p.jp+"　"+(e.rk.full||e.raw))}"/>`;last={x,y,e,i}});
      if(!d)continue;
      svg+=`<g class="fkg" data-id="${p.id}" style="--c:${p.color}"><path d="${d}" class="fkhit"/><path d="${d}" class="fkln"/>${dots}</g>`;
      if(last&&last.i===xs.length-1)labels.push({p,y:last.y,x:last.x,rk:last.e.rk});
    }
    /* ラベルの重なりを避ける */
    labels.sort((a,b)=>a.y-b.y);let prev=-1e9;for(const l of labels){l.ly=Math.max(l.y,prev+15);prev=l.ly}
    const over=labels.length?labels[labels.length-1].ly-(H-30):0;if(over>0){for(const l of labels)l.ly-=over;prev=1e9;for(let i=labels.length-1;i>=0;i--){labels[i].ly=Math.min(labels[i].ly,prev-15);prev=labels[i].ly}}
    for(const l of labels){const lx=W-R+12,txt=`${l.p.jp} ${fkShort(l.rk)}`;
      svg+=`<g class="fkg fklab" data-id="${l.p.id}" style="--c:${l.p.color}"><line x1="${l.x}" y1="${l.y}" x2="${lx}" y2="${l.ly}" class="fklead"/><a href="#r-${l.p.id}"><rect x="${lx}" y="${l.ly-7}" width="${Math.min(R-6,14+txt.length*11)}" height="14" rx="4" class="fkrect"/><text x="${lx+5}" y="${l.ly+4}" class="fklt">${esc(txt)}</text></a></g>`}
    svg+="</svg>";
    $("#fkwrap").innerHTML=svg+'<div class="tip" hidden></div>';
    const wrap=$("#fkwrap");wrap.scrollLeft=wrap.scrollWidth;
    const s=$("#fksvg"),tip=wrap.querySelector(".tip");let pinned=null;
    const hl=id=>{s.classList.toggle("fkhl",!!id);$$("#fksvg .fkg").forEach(g=>g.classList.toggle("on",g.dataset.id===String(id)))};
    s.addEventListener("pointerover",e=>{const g=e.target.closest(".fkg");if(e.pointerType==="mouse"&&!pinned)hl(g?g.dataset.id:null)});
    s.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!pinned)hl(null);tip.hidden=true});
    s.addEventListener("click",e=>{if(e.target.closest("a"))return;const g=e.target.closest(".fkg");const id=g?g.dataset.id:null;pinned=id&&pinned!==id?id:null;hl(pinned)});
    s.addEventListener("pointermove",e=>{const c=e.target.closest("circle");if(!c){tip.hidden=true;return}const r=wrap.getBoundingClientRect();tip.textContent=c.dataset.t;tip.hidden=false;tip.style.left=(e.clientX-r.left+wrap.scrollLeft)+"px";tip.style.top=(e.clientY-r.top+12)+"px"});
    $("#fklist").innerHTML=people.map(p=>`<button data-id="${p.id}" style="--c:${p.color}"><i></i>${esc(p.jp)}<span>${p.now?esc(p.now.short):"—"}</span></button>`).join("");
    $$("#fklist button").forEach(b=>{b.onmouseenter=()=>{if(!pinned)hl(b.dataset.id)};b.onmouseleave=()=>{if(!pinned)hl(null)};b.onclick=()=>{pinned=pinned===b.dataset.id?null:b.dataset.id;hl(pinned);if(pinned){const g=$(`#fksvg .fklab[data-id="${pinned}"]`);if(g)g.scrollIntoView({block:"nearest",inline:"nearest"})}}});
  };
  const seg=(id,opts,key)=>`<span class="seg" id="${id}">${opts.map(([v,t])=>`<button data-v="${v}" class="${String(FK[key])===String(v)?"on":""}">${t}</button>`).join("")}</span>`;
  body.innerHTML=`<h2>${esc(label)} <span class="muted">${people.length}人</span></h2>
  ${people.length>OG_WARN?`<div class="card warn">${people.length}人と多いため線が重なって見づらくなります。部屋も組み合わせて絞り込むのがおすすめです。</div>`:""}
  <div class="grid fksum">${FK_BANDS.map(b=>`<div class="kv"><span>${b.k}</span><b>${byDiv[b.k]||0}人</b></div>`).join("")}</div>
  <div class="ctrl">${seg("fkr",[["seki","関取"],["ms","幕下以上"],["all","全段"]],"range")}${seg("fks",[[12,"直近12場所"],[24,"直近24場所"],["all","初土俵から"]],"span")}</div>
  <p class="muted">縦が番付（上ほど上位）、横が場所です。名前は最新の場所の位置に付けています。線や名前にマウスを乗せる（スマホはタップ）と、その力士だけ強調します。点に乗せるとその場所の番付が出ます。表示範囲より下にいた場所は線を切っています。</p>
  <div class="chartwrap fkwrap" id="fkwrap"></div>
  <div class="fklist" id="fklist"></div>
  <p class="muted">対象：Sumo APIの現役力士のうち、上の条件に合う力士。番付の履歴もSumo APIによる。</p>`;
  $$("#fkr button").forEach(b=>b.onclick=()=>{FK.range=b.dataset.v;$$("#fkr button").forEach(x=>x.classList.toggle("on",x===b));draw()});
  $$("#fks button").forEach(b=>b.onclick=()=>{FK.span=b.dataset.v==="all"?"all":+b.dataset.v;$$("#fks button").forEach(x=>x.classList.toggle("on",x===b));draw()});
  draw();
}

{const _vb=viewBanzuke;viewBanzuke=async function(b,d,my){const h=decodeURIComponent(location.hash.slice(1));
  if(h==="fukuoka"){location.replace("#"+ogHash({pref:"福岡"}));return}
  if(h==="origin"||h.startsWith("origin?")){setNav("origin");return viewOrigin(ogParse(h),my)}
  return _vb(b,d,my)}}
/* 部屋の詳細ページに「番付推移」へのリンク */
{const _vh=viewHeyaDetail;viewHeyaDetail=async function(en,my){await _vh(en,my);if(!live(my)||!HEN[en])return;const h1=$("#app h1");if(h1)h1.insertAdjacentHTML("beforeend",` <a class="oglink" href="#${ogHash({heya:en})}">所属力士の番付推移 →</a>`)}}
