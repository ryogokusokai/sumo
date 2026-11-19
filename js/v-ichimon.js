"use strict";
/* ---------- 部屋・一門：一門別の一覧（初期表示）と、系譜図の補強 ----------
   v-heya.js の viewHeya（系譜図）を包み、表示切替「一門別｜系譜図」を付ける */
let HEYA_VIEW="ich";try{HEYA_VIEW=localStorage.getItem("sumo:heyaView")||"ich"}catch(e){}
const heyaViewSeg=()=>`<div class="ctrl"><span class="seg" id="hview"><button data-v="ich" class="${HEYA_VIEW==="ich"?"on":""}">一門別</button><button data-v="tree" class="${HEYA_VIEW==="tree"?"on":""}">系譜図</button></span></div>`;
function bindHeyaView(){$$("#hview button").forEach(b=>b.onclick=()=>{if(HEYA_VIEW===b.dataset.v)return;HEYA_VIEW=b.dataset.v;try{localStorage.setItem("sumo:heyaView",HEYA_VIEW)}catch(e){}route()})}

/* 同じ一門の中での親：独立元を遡り、他の一門をまたがずに着く最初の現存部屋 */
function ichParent(h){let p=h.p?HMAP[h.p]:null,g=0;while(p&&g++<20){if(p.ich!==h.ich)return null;if(p.st!=="def")return p;p=p.p?HMAP[p.p]:null}return null}

async function viewIchimon(my){
  let list=[];try{list=await loadAllRikishi()}catch(e){}
  if(!live(my))return;
  const cnt=heyaCounts(list);const c0={n:0,seki:0};
  const liveH=HEYA_DATA.filter(h=>h.st!=="def");
  const par=new Map(liveH.map(h=>[h.id,ichParent(h)]));
  const kids={};for(const h of liveH){const p=par.get(h.id);if(p)(kids[p.id]||(kids[p.id]=[])).push(h)}
  const byY=(a,b)=>String(a.y).localeCompare(String(b.y));
  for(const k in kids)kids[k].sort(byY);
  const note=h=>{const p=h.p?HMAP[h.p]:null;if(!p)return h.pt?`独立元：${esc(h.pt)}`:"";const ip=par.get(h.id);if(ip&&ip.id===p.id)return"";
    return`${esc(p.id.replace("(旧)",""))}部屋${p.st==="def"?"（旧）":""}${p.ich!==h.ich?`（<span class="dot" style="background:${ICOL[p.ich]}"></span>${esc(p.ich)}一門）`:""}から独立`};
  const row=h=>{const c=cnt[h.en]||c0;const nt=note(h);const ks=kids[h.id]||[];
    return`<li><div class="irow"><a class="rk" href="#heya-${h.en}">${esc(h.id)}</a>${h.sou?'<span class="tag hot">本家</span>':""}<span class="icnt">${c.n}人${c.seki?`・<b>関取${c.seki}</b>`:""}</span></div>
     <div class="imeta">${esc(h.m||"")}${nt?`<span class="inote">${nt}</span>`:""}</div>${ks.length?`<ul>${ks.map(row).join("")}</ul>`:""}</li>`};
  const cols=ICHIMON.map(i=>{const hs=liveH.filter(h=>h.ich===i.k);
    const roots=hs.filter(h=>!par.get(h.id)).sort((a,b)=>(b.sou?1:0)-(a.sou?1:0)||byY(a,b));
    const n=hs.reduce((a,h)=>a+(cnt[h.en]||c0).n,0),sk=hs.reduce((a,h)=>a+(cnt[h.en]||c0).seki,0);
    return`<section class="ichcol" id="ich-${i.k}" style="--c:${i.c}"><header><b>${i.k}一門</b><span>${hs.length}部屋・力士${n}人・関取${sk}人</span></header><ul class="ilist">${roots.map(row).join("")}</ul></section>`}).join("");
  render(`<h1>部屋の系譜と一門</h1>${heyaViewSeg()}
  <div class="ctrl ichjump">${ICHIMON.map(i=>`<button class="ichip" data-i="${i.k}"><span class="dot" style="background:${i.c}"></span>${i.k}</button>`).join("")}</div>
  <p class="muted">現存する${liveH.length}部屋を一門ごとに並べています。字下げは同じ一門の中での独立の流れ（上が独立元）。「○○部屋（△△一門）から独立」は、ほかの一門の部屋から独立した部屋です。人数は現役力士、関取は十両以上。閉鎖した部屋を含む系譜全体は「系譜図」で見られます。</p>
  <div class="ichcols">${cols}</div>
  <p class="muted">出典：師匠は日本相撲協会公式サイト「相撲部屋のご紹介」、一門・独立元はWikipedia日本語版「相撲部屋」（2026年11月17日版）と各部屋の記事。力士数はSumo APIの現役力士データから集計。</p>`);
  bindHeyaView();
  $$(".ichjump .ichip").forEach(b=>b.onclick=()=>{const s=document.getElementById("ich-"+b.dataset.i);if(s){s.scrollIntoView({behavior:"smooth",block:"start"});s.classList.remove("iflash");void s.offsetWidth;s.classList.add("iflash")}});
}

/* 系譜図の補強：一門名のラベル、一門で絞ったらその一門のある枝だけ開く */
function enhanceTree(){
  const h1=$("#app h1");if(h1)h1.insertAdjacentHTML("afterend",heyaViewSeg());bindHeyaView();
  $$("#tree .node").forEach(n=>{const ich=n.dataset.ich;if(ich&&!n.querySelector(".ichb"))n.insertAdjacentHTML("beforeend",`<span class="ichb">${esc(ich)}</span>`)});
  const openFor=f=>{$$("#tree li").forEach(li=>{if(!li.querySelector(":scope>ul"))return;const has=!f||!!li.querySelector(`:scope>ul .node[data-ich="${CSS.escape(f)}"]`);li.classList.toggle("collapsed",!has);const id=li.dataset.h;has?HEYA_COLLAPSED.delete(id):HEYA_COLLAPSED.add(id)})};
  $$(".ichip").forEach(b=>b.addEventListener("click",()=>openFor(b.dataset.i)));
}

{const _vh=viewHeya;viewHeya=async function(my){if(HEYA_VIEW==="ich")return viewIchimon(my);await _vh(my);if(live(my))enhanceTree()}}
