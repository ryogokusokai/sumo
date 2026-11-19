"use strict";
/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const kim=k=>k?(KIM[k.trim().toLowerCase()]||k):"";
const heya=h=>HEYA[h]||h||"";
const pref=s=>{if(!s)return"";const p=s.split(",")[0].trim().replace(/-(ken|to|fu)$/,"");return PREF[p]||p};
function cleanJp(s,en){if(!s||/[<>]/.test(s))return en||"";return s.split(/[\s　(（]/)[0]||en||""}
function parseRank(r){if(!r)return null;const m=r.match(/^(\w+)\s*(\d+)?\s*(East|West)?/);if(!m||!RANK[m[1]])return{full:r,short:r,val:99999,div:""};const [full,sh,ord]=RANK[m[1]];const n=+(m[2]||1);const side=m[3]==="West"?"西":m[3]==="East"?"東":"";const sanyaku=ord<=4;return{full:(side)+full+(sanyaku?"":n+"枚目"),short:sanyaku?full:sh+n,side,val:ord*1000+n*2+(m[3]==="West"?1:0),ord,num:n}}
function bashoName(id){id=String(id);return id.slice(0,4)+"年"+(BASHO_NAME[id.slice(4,6)]||id.slice(4,6)+"月")}
function age(d){if(!d)return"";const b=new Date(d),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--;return a}
const ymd=d=>d?d.slice(0,10):"";
const ym=s=>s?s.slice(0,4)+"-"+s.slice(4,6):"";
const PALETTE=["#c0392b","#2f6db0","#2e8a57","#a0782a","#7a4fa3","#d35400","#16a085","#8e44ad","#2c3e50","#b03a7a","#5d7c16","#1f8fb3"];

/* ---------- API（メモリ＋localStorageキャッシュ） ---------- */
const mem=new Map();
async function api(path,ttl=300){
  const key="sumo:"+path;
  if(mem.has(key)){const m=mem.get(key);if(Date.now()-m.t<ttl*1000)return m.v}
  try{const c=JSON.parse(localStorage.getItem(key)||"null");if(c&&Date.now()-c.t<ttl*1000){mem.set(key,c);return c.v}}catch(e){}
  let lastErr;
  for(let i=0;i<3;i++){
    try{const r=await fetch(API+path);if(!r.ok)throw new Error("HTTP "+r.status);const v=await r.json();const e={t:Date.now(),v};mem.set(key,e);try{localStorage.setItem(key,JSON.stringify(e))}catch(_){try{for(const k of Object.keys(localStorage))if(k.startsWith("sumo:/"))localStorage.removeItem(k)}catch(__){}}return v}
    catch(e){lastErr=e;await new Promise(r=>setTimeout(r,600*(i+1)))}
  }
  throw lastErr;
}
async function pool(items,fn,c=6){const out=new Array(items.length);let i=0;await Promise.all([...Array(Math.min(c,items.length))].map(async()=>{while(i<items.length){const k=i++;try{out[k]=await fn(items[k])}catch(e){out[k]=null}}}));return out}

/* ---------- 場所 ---------- */
function bashoCandidates(n=24){const d=new Date(Date.now()+9*3600e3);let y=d.getUTCFullYear(),m=d.getUTCMonth()+1;if(m%2===0)m--;const out=[];for(let i=0;i<n;i++){out.push(y+String(m).padStart(2,"0"));m-=2;if(m<1){m+=12;y--}}return out}
let CUR=null;
async function currentBasho(){if(CUR)return CUR;for(const b of bashoCandidates(3)){try{const z=await api(`/basho/${b}/banzuke/Makuuchi`,600);if(z&&z.east&&z.east.length){CUR=b;return b}}catch(e){}}CUR=bashoCandidates(2)[1];return CUR}
function bashoTTL(b){return b===CUR?300:86400}
const bashoOpts=(cur,sel)=>bashoCandidates(36).filter(b=>b<=cur).map(b=>`<option value="${b}"${b===sel?" selected":""}>${bashoName(b)}</option>`).join("");

/* ---------- 成績 ---------- */
function recOf(rec,sekitori){let w=0,l=0,a=0;for(const r of rec||[]){const s=r.result||"";if(s==="win"||s==="fusen win")w++;else if(s==="loss"||s==="fusen loss")l++;else if(s==="absent"&&sekitori)a++}return{w,l,a,txt:w+"-"+l+(a?"-"+a:"")}}
const recHtml=o=>`<span class="${o.w>o.l?"w":o.l>o.w?"l":""}">${o.txt}</span>`;
function dayFromRecord(rec){let d=0;(rec||[]).forEach((r,i)=>{if(/^(fusen )?(win|loss)$/.test(r.result||""))d=i+1});return d}
/* 1日分の星：W=白星 L=黒星 FW=不戦勝 FL=不戦敗 A=休 ""=取組なし */
function hoshi(r,sekitori){const s=(r&&r.result)||"";if(s==="win")return"W";if(s==="loss")return"L";if(s==="fusen win")return"FW";if(s==="fusen loss")return"FL";if(s==="absent"&&sekitori)return"A";return""}
const HOSHI_CH={W:"○",L:"●",FW:"□",FL:"■",A:"や","":""};

/* ---------- 名前 ---------- */
const NAMES={};
function addNames(list){for(const r of list||[]){const id=r.rikishiID??r.id;if(id!=null&&!NAMES[id])NAMES[id]=cleanJp(r.shikonaJp,r.shikonaEn)}}
async function loadAllRikishi(){const z=await api("/rikishis?intai=false&limit=1000",3600);addNames(z.records);return z.records}
const nm=(id,en)=>NAMES[id]||en||"?";
const link=(id,en)=>`<a class="rk" href="#r-${id}" data-rid="${id}">${esc(nm(id,en))}</a>`;

/* ---------- 描画・遷移 ---------- */
const app=$("#app");
function render(html){app.classList.remove("fade");app.innerHTML=html;void app.offsetWidth;app.classList.add("fade")}
function skeleton(kind){
  const rows=n=>Array.from({length:n},(_,i)=>`<div class="sk skrow" style="width:${88-(i%4)*9}%"></div>`).join("");
  if(kind==="detail")return`<div class="sk" style="height:28px;width:40%;margin:6px 0 14px"></div><div class="grid">${Array.from({length:8},()=>'<div class="sk" style="height:58px"></div>').join("")}</div><div class="sk" style="height:220px;margin-top:16px"></div>`;
  return`<div class="sk" style="height:26px;width:45%;margin:6px 0 14px"></div><div class="sk" style="height:30px;width:70%;margin-bottom:12px"></div><div class="card">${rows(12)}</div>`;
}
function setNav(k){$$("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.k===k))}
let token=0;
const live=my=>my===token;
async function route(){
  hidePop();
  const h=decodeURIComponent(location.hash.slice(1))||"banzuke";const my=++token;
  const kind=/^(r-|heya-)/.test(h)?"detail":"list";
  app.classList.remove("fade");app.innerHTML=skeleton(kind);window.scrollTo(0,0);
  try{
    let m;
    if((m=h.match(/^r-(\d+)$/))){setNav("rikishi");await viewRikishi(+m[1],my)}
    else if(h.startsWith("rikishi")){setNav("rikishi");await viewList(my)}
    else if((m=h.match(/^heya-(\w+)$/))){setNav("heya");await viewHeyaDetail(m[1],my)}
    else if(h.startsWith("heya")){setNav("heya");await viewHeya(my)}
    else if((m=h.match(/^day(?:-(\d{6}))?(?:-(\d+))?(?:-(\w+))?$/))){setNav("day");await viewDay(m[1],m[2],m[3],my)}
    else{m=h.match(/^banzuke(?:-(\d{6}))?(?:-(\w+))?$/)||[];setNav("banzuke");await viewBanzuke(m[1],m[2],my)}
  }catch(e){console.error(e);if(my===token)render(`<div class="err">データを取得できませんでした（${esc(e.message)}）。少し時間をおいて再読み込みしてください。</div>`)}
}
window.addEventListener("hashchange",route);

/* ---------- ライト／ダーク ---------- */
const themeIcon=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;$("#theme").textContent=dark?"☀":"☾";$("#theme").title=dark?"ライトにする":"ダークにする"};
themeIcon();
$("#theme").addEventListener("click",()=>{
  const root=document.documentElement;
  const sysDark=matchMedia("(prefers-color-scheme: dark)").matches;
  const nowDark=root.dataset.theme?root.dataset.theme==="dark":sysDark;
  const next=nowDark?"light":"dark";root.dataset.theme=next;
  try{localStorage.setItem("sumo:theme",next)}catch(e){}
  themeIcon();
});

/* ---------- ポップアップ（スマホは下から出るシート） ---------- */
const pop=$("#pop");
function showPop(html,anchor){
  pop.innerHTML=`<button class="x" aria-label="閉じる">×</button>${html}`;
  pop.hidden=false;
  const narrow=innerWidth<640;pop.classList.toggle("sheet",narrow);
  if(!narrow&&anchor){const r=anchor.getBoundingClientRect();const w=pop.offsetWidth,h=pop.offsetHeight;let x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+6;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-6);pop.style.left=x+"px";pop.style.top=y+"px"}
  else{pop.style.left="";pop.style.top=""}
  pop.querySelector(".x").onclick=hidePop;
}
function hidePop(){pop.hidden=true;pop.innerHTML=""}
document.addEventListener("keydown",e=>{if(e.key==="Escape")hidePop()});
document.addEventListener("pointerdown",e=>{if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest("[data-pop]"))hidePop()});

/* ---------- スワイプ ---------- */
function onSwipe(el,left,right){
  let x0=null,y0=null,t0=0;
  el.addEventListener("touchstart",e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;t0=Date.now()},{passive:true});
  el.addEventListener("touchend",e=>{if(x0==null)return;const t=e.changedTouches[0];const dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(Date.now()-t0<600&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){dx<0?left():right()}},{passive:true});
}

/* ---------- 横断検索 ---------- */
(()=>{
  const q=$("#gq"),box=$("#gres");let items=[],sel=-1,list=null;
  const close=()=>{box.hidden=true;sel=-1};
  const go=i=>{const it=items[i];if(!it)return;close();q.value="";q.blur();location.hash=it.href};
  const draw=()=>{box.innerHTML=items.map((it,i)=>`<a href="#${it.href}" class="${i===sel?"sel":""}" data-i="${i}">${it.dot||""}<span>${esc(it.label)}</span><span class="k">${esc(it.kind)}</span></a>`).join("")||'<div class="muted" style="padding:8px 10px">該当なし</div>';box.hidden=false};
  q.addEventListener("focus",()=>{if(!list)loadAllRikishi().then(l=>{list=l}).catch(()=>{})});
  q.addEventListener("input",async()=>{
    const s=q.value.trim();if(!s){close();return}
    if(!list){try{list=await loadAllRikishi()}catch(e){list=[]}}
    const lo=s.toLowerCase();
    const rk=list.filter(r=>cleanJp(r.shikonaJp,r.shikonaEn).includes(s)||(r.shikonaEn||"").toLowerCase().includes(lo))
      .map(r=>({r,p:parseRank(r.currentRank)})).sort((a,b)=>(a.p?a.p.val:99999)-(b.p?b.p.val:99999)).slice(0,8)
      .map(({r,p})=>({href:"r-"+r.id,label:cleanJp(r.shikonaJp,r.shikonaEn),kind:(p?p.short+"・":"")+heya(r.heya),dot:ichDot(ichOf(r.heya))}));
    const hy=HEYA_DATA.filter(h=>h.en&&(h.id.includes(s)||h.en.toLowerCase().includes(lo))).slice(0,4).map(h=>({href:"heya-"+h.en,label:h.id+"部屋",kind:h.ich+"一門",dot:ichDot(h.ich)}));
    items=[...rk,...hy];sel=items.length?0:-1;draw();
  });
  q.addEventListener("keydown",e=>{if(box.hidden)return;if(e.key==="ArrowDown"){sel=Math.min(items.length-1,sel+1);draw();e.preventDefault()}else if(e.key==="ArrowUp"){sel=Math.max(0,sel-1);draw();e.preventDefault()}else if(e.key==="Enter"){go(sel);e.preventDefault()}else if(e.key==="Escape")close()});
  box.addEventListener("pointerdown",e=>{const a=e.target.closest("a[data-i]");if(a){e.preventDefault();go(+a.dataset.i)}});
  document.addEventListener("pointerdown",e=>{if(!e.target.closest(".gsearch"))close()});
  document.addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement.tagName!=="INPUT"){e.preventDefault();q.focus()}});
})();

/* ---------- 簡易折れ線グラフ（なぞると値を表示） ---------- */
/* series:[{name,color,values:[number|null]}], xs:[label], opts:{h,yMax,yLabel,invert,yTicks,onTip} */
function lineChart(wrap,series,xs,opts={}){
  const W=Math.max(320,wrap.clientWidth||600),H=opts.h||240,pl=36,pr=12,pt=12,pb=26;
  const vis=series.filter(s=>!s.off);
  const all=vis.flatMap(s=>s.values.filter(v=>v!=null));
  const yMax=opts.yMax??Math.max(1,...all),yMin=opts.yMin??0;
  const X=i=>pl+(xs.length<2?0:i*(W-pl-pr)/(xs.length-1)),Y=v=>pt+(1-(v-yMin)/((yMax-yMin)||1))*(H-pt-pb);
  const stp=Math.max(1,Math.ceil((yMax-yMin)/5)),ticks=opts.yTicks||Array.from({length:Math.floor((yMax-yMin)/stp)+1},(_,i)=>yMin+i*stp);
  const step=Math.max(1,Math.ceil(xs.length/Math.max(2,Math.floor((W-pl-pr)/34))));
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  svg+=ticks.map(t=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(t)+3}" text-anchor="end">${t}</text>`).join("");
  svg+=xs.map((x,i)=>i%step===0||i===xs.length-1?`<text x="${X(i)}" y="${H-8}" text-anchor="middle">${esc(x)}</text>`:"").join("");
  for(const s of vis){let d="",pen=false;s.values.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1);pen=true});svg+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" class="ln"/>`;s.values.forEach((v,i)=>{if(v!=null)svg+=`<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${s.color}"/>`})}
  svg+=`<line id="cx" x1="0" x2="0" y1="${pt}" y2="${H-pb}" stroke="var(--sub)" stroke-dasharray="3 3" visibility="hidden"/></svg>`;
  wrap.innerHTML=svg+'<div class="tip" hidden></div>';
  const el=wrap.querySelector("svg"),tip=wrap.querySelector(".tip"),cx=wrap.querySelector("#cx");
  const at=e=>{const r=el.getBoundingClientRect();const px=(e.clientX-r.left)*W/r.width;let i=Math.round((px-pl)/((W-pl-pr)/Math.max(1,xs.length-1)));i=Math.max(0,Math.min(xs.length-1,i));
    cx.setAttribute("x1",X(i));cx.setAttribute("x2",X(i));cx.setAttribute("visibility","visible");
    tip.innerHTML=opts.onTip?opts.onTip(i):`<b>${esc(xs[i])}</b><br>`+vis.map(s=>({s,v:s.values[i]})).filter(o=>o.v!=null).sort((a,b)=>b.v-a.v).map(o=>`<span style="color:${o.s.color}">●</span> ${esc(o.s.name)} ${o.v}`).join("<br>");
    tip.hidden=false;const tx=X(i)*r.width/W;tip.style.left=Math.min(Math.max(tx,70),r.width-70)+"px";tip.style.top="4px"};
  el.addEventListener("pointermove",at);el.addEventListener("pointerdown",at);
  el.addEventListener("pointerleave",e=>{if(e.pointerType!=="mouse")return;tip.hidden=true;cx.setAttribute("visibility","hidden")});
}
