"use strict";
/* ---------- 部屋の系譜と一門（開閉・道筋強調・検索・拡大移動） ---------- */
let HEYA_FILTER="";const HEYA_COLLAPSED=new Set();
const founderOf=h=>{const m=(h.f||"").match(/（(.+?)）/);return m?m[1].split("・").pop():""};
function chainOf(id){const out=[];let h=HMAP[id],g=0;while(h&&g++<20){out.unshift(h);h=h.p?HMAP[h.p]:null}return out}
function heyaCounts(list){const c={};for(const r of list){const o=c[r.heya]||(c[r.heya]={n:0,seki:0});o.n++;const p=parseRank(r.currentRank);if(p&&p.ord&&p.ord<=6)o.seki++}return c}
const dispId=id=>id.replace("(旧)","（旧）");
async function viewHeya(my){
  let list=[];try{list=await loadAllRikishi()}catch(e){}
  if(!live(my))return;
  const cnt=heyaCounts(list);
  const kids={};for(const h of HEYA_DATA)if(h.p)(kids[h.p]||(kids[h.p]=[])).push(h);
  for(const k in kids)kids[k].sort((a,b)=>String(a.y).localeCompare(String(b.y)));
  const roots=HEYA_DATA.filter(h=>!h.p).sort((a,b)=>ICHIMON.findIndex(i=>i.k===a.ich)-ICHIMON.findIndex(i=>i.k===b.ich)||String(a.y).localeCompare(String(b.y)));
  const node=h=>{const def=h.st==="def";const c=cnt[h.en]||{n:0,seki:0};const moved=h.p&&HMAP[h.p]&&HMAP[h.p].ich!==h.ich&&!def;const ks=kids[h.id]||[];
    return`<li data-h="${esc(h.id)}" class="${HEYA_COLLAPSED.has(h.id)?"collapsed":""}"><span class="row">${ks.length?`<button class="caret" aria-label="開閉">▼</button>`:'<span style="width:18px;display:inline-block"></span>'}<span class="node${def?" def":""}" data-h="${esc(h.id)}" data-ich="${h.ich}" style="--c:${ICOL[h.ich]||"#999"}">${def?`<b>${esc(dispId(h.id))}</b>`:`<a href="#heya-${h.en}">${esc(h.id)}</a>`}${h.sou?'<span class="tag hot">一門の本家</span>':""}<span class="sub">${h.y?esc(h.y)+"年":""}${def&&h.close?"〜"+esc(h.close)+"年閉鎖":""}${founderOf(h)?" "+esc(founderOf(h))+"が創設":""}</span>${!def?`<span class="sub">力士${c.n}人${c.seki?"・関取"+c.seki:""}</span>`:""}${moved?`<span class="tag">→${esc(h.ich)}一門</span>`:""}${h.pt?`<span class="sub">（${esc(h.pt)}）</span>`:""}${ks.length&&HEYA_COLLAPSED.has(h.id)?`<span class="tag">+${countDesc(h.id,kids)}</span>`:""}</span></span>${ks.length?`<ul>${ks.map(node).join("")}</ul>`:""}</li>`};
  const sum=ICHIMON.map(i=>{const hs=HEYA_DATA.filter(h=>h.ich===i.k&&h.st!=="def");const n=hs.reduce((a,h)=>a+(cnt[h.en]||{n:0}).n,0),sk=hs.reduce((a,h)=>a+(cnt[h.en]||{seki:0}).seki,0);const top=hs.find(h=>h.sou);return`<div class="kv" style="--c:${i.c}"><span>${i.k}一門</span><b>${hs.length}部屋</b><span>力士${n}人・関取${sk}人／本家 ${top?esc(top.id):""}部屋</span></div>`}).join("");
  render(`<h1>部屋の系譜と一門</h1>
  <div class="ichsum">${sum}</div>
  <div class="ctrl"><button class="ichip${HEYA_FILTER?"":" on"}" data-i="">すべて</button>${ICHIMON.map(i=>`<button class="ichip${HEYA_FILTER===i.k?" on":""}" data-i="${i.k}"><span class="dot" style="background:${i.c}"></span>${i.k}一門</button>`).join("")}</div>
  <div class="ctrl"><input id="hsearch" list="hlist" placeholder="部屋名で探す" style="flex:1;min-width:140px"><datalist id="hlist">${HEYA_DATA.map(h=>`<option value="${esc(dispId(h.id))}">`).join("")}</datalist>
   <button class="btn" id="hopen">すべて開く</button><button class="btn" id="hclose">すべて閉じる</button></div>
  <p class="muted">線は「どの部屋から独立したか」。部屋の枠をタップすると本家までの道筋を強調（もう一度タップで解除）、部屋名タップで詳細へ。▼で枝の開閉。ドラッグで移動、ピンチ・＋−ボタン・Ctrl＋ホイールで拡大縮小。点線の枠は閉鎖済みの部屋、「→○○一門」は独立元と一門が異なる部屋。</p>
  <div class="viewport" id="vp"><div class="zoomctl"><button id="zin" aria-label="拡大">＋</button><button id="zout" aria-label="縮小">−</button><button id="zfit" aria-label="元に戻す" style="font-size:12px">↺</button></div>
   <div class="canvas" id="cv"><ul class="tree" id="tree">${roots.map(node).join("")}</ul></div></div>
  <p class="muted">出典：師匠・所在地は日本相撲協会公式サイト「相撲部屋のご紹介」、一門・創設年・独立元はWikipedia日本語版「相撲部屋」（2026年11月17日版）および各部屋の記事（2026年11月19日確認）。力士数はSumo APIの現役力士データから集計。</p>`);
  const tree=$("#tree");
  /* 一門フィルタ（その一門以外を薄く） */
  const applyFilter=()=>{$$("#tree .node").forEach(n=>n.classList.toggle("fdim",!!HEYA_FILTER&&n.dataset.ich!==HEYA_FILTER));$$(".ichip").forEach(b=>b.classList.toggle("on",b.dataset.i===HEYA_FILTER))};
  $$(".ichip").forEach(b=>b.onclick=()=>{HEYA_FILTER=b.dataset.i;applyFilter()});applyFilter();
  /* 開閉 */
  const setCollapsed=(li,c)=>{li.classList.toggle("collapsed",c);const id=li.dataset.h;c?HEYA_COLLAPSED.add(id):HEYA_COLLAPSED.delete(id)};
  $("#hopen").onclick=()=>$$("#tree li").forEach(li=>setCollapsed(li,false));
  $("#hclose").onclick=()=>$$("#tree li").forEach(li=>{if(li.querySelector(":scope>ul"))setCollapsed(li,true)});
  /* 道筋強調 */
  let pathOf="";
  const showPath=id=>{$$("#tree .node").forEach(n=>n.classList.remove("onpath"));if(!id||pathOf===id){pathOf="";tree.classList.remove("pathmode");return}pathOf=id;tree.classList.add("pathmode");for(const h of chainOf(id))$$(`#tree .node[data-h="${CSS.escape(h.id)}"]`).forEach(n=>n.classList.add("onpath"))};
  tree.addEventListener("click",e=>{if(moved)return;const c=e.target.closest(".caret");if(c){const li=c.closest("li");setCollapsed(li,!li.classList.contains("collapsed"));return}if(e.target.closest("a"))return;const n=e.target.closest(".node");if(n)showPath(n.dataset.h)});
  /* 拡大・移動 */
  const vp=$("#vp"),cv=$("#cv");let s=1,tx=0,ty=0,moved=false;
  const apply=()=>{cv.style.transform=`translate(${tx}px,${ty}px) scale(${s})`};
  const zoomAt=(f,cx,cy)=>{const ns=Math.min(2.5,Math.max(.35,s*f));tx=cx-(cx-tx)*ns/s;ty=cy-(cy-ty)*ns/s;s=ns;apply()};
  $("#zin").onclick=()=>zoomAt(1.2,vp.clientWidth/2,vp.clientHeight/2);
  $("#zout").onclick=()=>zoomAt(1/1.2,vp.clientWidth/2,vp.clientHeight/2);
  $("#zfit").onclick=()=>{s=1;tx=0;ty=0;apply()};
  vp.addEventListener("wheel",e=>{if(!e.ctrlKey&&!e.metaKey){ty-=e.deltaY;tx-=e.deltaX;apply();e.preventDefault();return}const r=vp.getBoundingClientRect();zoomAt(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top);e.preventDefault()},{passive:false});
  const pts=new Map();let last=null,dist0=0,s0=1,dragStart=null;
  vp.addEventListener("pointerdown",e=>{if(e.target.closest(".zoomctl"))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;dragStart={x:e.clientX,y:e.clientY};if(pts.size===2){const [a,b]=[...pts.values()];dist0=Math.hypot(a.x-b.x,a.y-b.y);s0=s}last={x:e.clientX,y:e.clientY}});
  vp.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=vp.getBoundingClientRect();zoomAt(s0*d/dist0/s,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);moved=true;return}
    if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>6){moved=true;vp.classList.add("drag");if(!vp.hasPointerCapture(e.pointerId))vp.setPointerCapture(e.pointerId)}
    if(moved){tx+=e.clientX-last.x;ty+=e.clientY-last.y;apply()}last={x:e.clientX,y:e.clientY}});
  const end=e=>{pts.delete(e.pointerId);vp.classList.remove("drag");if(pts.size<2)dist0=0;setTimeout(()=>{moved=false},0)};
  vp.addEventListener("pointerup",end);vp.addEventListener("pointercancel",end);
  /* 検索で移動 */
  const jump=v=>{v=(v||"").trim().replace(/部屋$/,"");if(!v)return;const h=HEYA_DATA.find(x=>dispId(x.id)===v||x.id===v)||HEYA_DATA.find(x=>x.id.includes(v));if(!h)return;
    for(const a of chainOf(h.id)){const li=tree.querySelector(`li[data-h="${CSS.escape(a.id)}"]`);if(li&&a.id!==h.id)setCollapsed(li,false)}
    const n=tree.querySelector(`.node[data-h="${CSS.escape(h.id)}"]`);if(!n)return;
    const vr=vp.getBoundingClientRect(),nr=n.getBoundingClientRect();tx+=vr.left+vr.width/2-(nr.left+nr.width/2);ty+=vr.top+vr.height/3-(nr.top+nr.height/2);apply();
    vp.scrollIntoView({behavior:"smooth",block:"nearest"});n.classList.remove("flash");void n.offsetWidth;n.classList.add("flash");showPath("");showPath(h.id)};
  $("#hsearch").addEventListener("change",e=>jump(e.target.value));
  $("#hsearch").addEventListener("keydown",e=>{if(e.key==="Enter")jump(e.target.value)});
}
function countDesc(id,kids){return(kids[id]||[]).reduce((a,c)=>a+1+countDesc(c.id,kids),0)}
async function viewHeyaDetail(en,my){
  const h=HEN[en];if(!h){render('<div class="err">部屋が見つかりません。</div>');return}
  let list=[];try{list=await loadAllRikishi()}catch(e){}
  if(!live(my))return;
  const mem=list.filter(r=>r.heya===en).map(r=>({id:r.id,en:r.shikonaEn,rank:parseRank(r.currentRank)})).sort((a,b)=>(a.rank?a.rank.val:99999)-(b.rank?b.rank.val:99999));
  const chain=chainOf(h.id);
  const kids=HEYA_DATA.filter(x=>x.p===h.id);
  const nameOf=x=>x.st==="def"?esc(dispId(x.id)):`<a class="rk" href="#heya-${x.en}">${esc(x.id)}</a>`;
  const seki=mem.filter(m=>m.rank&&m.rank.ord<=6);
  render(`<h1>${ichDot(h.ich)}${esc(h.id)}部屋 <span class="muted">${esc(h.ich)}一門${h.sou?"（本家）":""}</span></h1>
  <div class="card"><div class="grid">
   <div class="kv"><span>師匠</span><b style="font-size:15px">${esc(h.m||"—")}</b></div>
   <div class="kv"><span>創設</span><b>${esc(h.y||"—")}年</b><span>${esc(h.f||"")}</span></div>
   <div class="kv"><span>所在地</span><b style="font-size:15px">${esc(h.loc||"—")}</b></div>
   <div class="kv"><span>所属力士</span><b>${mem.length}人</b><span>うち関取${seki.length}人</span></div>
  </div>
  ${h.old?`<p><b>旧名</b>：${esc(h.old)}</p>`:""}${h.note?`<p><b>備考</b>：${esc(h.note)}</p>`:""}</div>
  <h2>系譜</h2><div class="card"><div class="chain">${chain[0].pt?`<span class="muted">${esc(chain[0].pt)}</span> →`:""}${chain.map((x,i)=>`${i?"→":""}<span class="node${x.st==="def"?" def":""}" style="--c:${ICOL[x.ich]||"#999"};cursor:default">${nameOf(x)}<span class="sub">${x.y?esc(x.y)+"年":""}</span></span>`).join(" ")}</div>
  ${kids.length?`<p style="margin-top:10px"><b>この部屋から独立した部屋</b>：${kids.map(nameOf).join("、")}</p>`:""}
  <p class="muted"><a href="#heya">系譜全体を見る</a></p></div>
  <h2>所属力士（現役）</h2><div class="card scroll"><table><thead><tr><th>番付</th><th>四股名</th></tr></thead><tbody>${mem.map(m=>`<tr><td class="muted">${m.rank?esc(m.rank.full):""}</td><td>${link(m.id,m.en)}</td></tr>`).join("")||'<tr><td colspan="2" class="muted">データなし</td></tr>'}</tbody></table></div>
  <p class="muted">出典：<a href="https://www.sumo.or.jp/ResultRikishiDataSumoBeya/detail/${h.nsk}/" target="_blank" rel="noopener">日本相撲協会 公式ページ</a>／<a href="https://ja.wikipedia.org/wiki/${encodeURIComponent(h.id+"部屋")}" target="_blank" rel="noopener">Wikipedia</a></p>`);
}
