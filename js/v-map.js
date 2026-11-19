"use strict";
/* ---------- 部屋マップ（東京＝部屋の所在地、大阪・名古屋・福岡＝2026年の地方場所の宿舎） ----------
   データ：data/heya-map.json（出典・確認状況つき）。地図：Google Maps JavaScript API（キーは js/maps-key.js）。
   キー未設定のときは、選んだ部屋の位置をGoogleマップの埋め込み（キー不要）で表示する。 */
const MAP_ST={city:"fukuoka",ich:new Set(),lv:new Set(["A","B","C"])};
let MAP_DATA=null,GMAP_P=null;
const MAP_CITIES=[["tokyo","東京"],["osaka","大阪"],["nagoya","名古屋"],["fukuoka","福岡"]];
const MAP_LV={A:{t:"2026年確認",c:"ok"},B:{t:"2026年の情報",c:"mid"},C:{t:"過年度の情報",c:"old"},X:{t:"非公開・不明",c:"old"}};
async function mapData(){if(MAP_DATA)return MAP_DATA;const r=await fetch("data/heya-map.json?v=1");if(!r.ok)throw new Error("HTTP "+r.status);MAP_DATA=await r.json();return MAP_DATA}
function loadGmaps(){if(GMAP_P)return GMAP_P;const key=(window.GMAPS_KEY||"").trim();if(!key)return Promise.resolve(null);
  GMAP_P=new Promise((ok,ng)=>{window.__gmapsReady=()=>ok(window.google&&google.maps);const s=document.createElement("script");s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ja&region=JP&callback=__gmapsReady`;s.async=true;s.onerror=()=>{GMAP_P=null;ng(new Error("Google Mapsを読み込めませんでした"))};document.head.appendChild(s)});return GMAP_P}
const gLink=x=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.lat!=null?x.lat+","+x.lng:(x.fac?x.fac+" ":"")+x.addr)}`;
const gEmbed=x=>`https://maps.google.com/maps?q=${encodeURIComponent(x.lat+","+x.lng)}&z=15&hl=ja&output=embed`;

async function viewMap(city,my){
  if(MAP_CITIES.some(c=>c[0]===city))MAP_ST.city=city;
  const D=await mapData();if(!live(my))return;
  const C=D.cities[MAP_ST.city];
  const items=(D.rows[MAP_ST.city]||[]).map(([h,fac,addr,lat,lng,lv,note,approx])=>{const hd=HMAP[h]||{};return{h,en:hd.en,ich:hd.ich||"",fac,addr,lat,lng,lv,note,approx}});
  const counts={};items.forEach(x=>counts[x.lv]=(counts[x.lv]||0)+1);
  const vis=x=>MAP_ST.lv.has(x.lv==="X"?"C":x.lv)&&(!MAP_ST.ich.size||MAP_ST.ich.has(x.ich));
  const hasKey=!!(window.GMAPS_KEY||"").trim();
  render(`<h1>部屋マップ <span class="muted">${esc(C.label)}</span></h1>
  <div class="ctrl"><span class="seg" id="mcity">${MAP_CITIES.map(([k,n])=>`<button data-c="${k}" class="${k===MAP_ST.city?"on":""}">${n}</button>`).join("")}</span></div>
  <div class="ctrl" id="mich">${ICHIMON.map(i=>`<button class="ichip${MAP_ST.ich.has(i.k)?" on":""}" data-i="${i.k}"><span class="dot" style="background:${i.c}"></span>${i.k}</button>`).join("")}</div>
  ${MAP_ST.city==="tokyo"?"":`<div class="ctrl mlv" id="mlv">${["A","B","C"].map(l=>`<label><input type="checkbox" data-l="${l}" ${MAP_ST.lv.has(l)?"checked":""}><span class="mbadge ${MAP_LV[l].c}">${MAP_LV[l].t}</span> ${counts[l]||0}${l==="C"&&counts.X?`＋不明${counts.X}`:""}</label>`).join("")}</div>`}
  <div class="mapgrid"><div class="mapbox"><div id="gmap" class="gmap"></div>${hasKey?"":`<p class="muted mnokey">Googleマップの全体表示にはAPIキーの設定が必要です（js/maps-key.js）。今は一覧で選んだ部屋の位置を表示しています。</p>`}</div>
  <div class="mlist" id="mlist"></div></div>
  <p class="muted">${esc(D.note)} 位置は住所から国土地理院の住所検索で求めたもので、「町まで」の印があるものは町の代表点です。宿舎は年によって変わるので、訪ねる前に各部屋の最新の案内を確かめてください。出典：${C.src.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join("、")}${MAP_ST.city==="fukuoka"?"、各部屋公式サイト・自治体発表（個別の注記）":""}。</p>`);
  $$("#mcity button").forEach(b=>b.onclick=()=>location.hash="map-"+b.dataset.c);
  /* 一覧 */
  const listHtml=()=>{const g=ICHIMON.map(i=>{const xs=items.filter(x=>x.ich===i.k&&vis(x));if(!xs.length)return"";
      return`<div class="mgrp"><div class="mgh" style="--c:${i.c}">${i.k}一門 <span class="muted">${xs.length}</span></div>${xs.map(x=>`<button class="mitem" data-h="${esc(x.h)}" style="--c:${i.c}"><b>${esc(x.h)}</b>${MAP_ST.city==="tokyo"?"":`<span class="mbadge ${MAP_LV[x.lv].c}">${MAP_LV[x.lv].t}</span>`}<span class="ma">${esc(x.fac||x.addr||x.note)}</span></button>`).join("")}</div>`}).join("");
    return`<button class="mitem mvenue" data-h="__venue"><b>${esc(C.venue.name)}</b><span class="ma">本場所の会場</span></button>`+g||'<p class="muted">該当する部屋がありません。</p>'};
  const info=x=>{if(x==="__venue")return`<div class="minfo"><b>${esc(C.venue.name)}</b><div>${esc(C.venue.addr)}</div><a href="${gLink(C.venue)}" target="_blank" rel="noopener">Googleマップで開く</a></div>`;
    return`<div class="minfo"><b>${x.en?`<a href="#heya-${x.en}">${esc(x.h)}部屋</a>`:esc(x.h)+"部屋"}</b> <span class="muted">${esc(x.ich)}一門</span>
     ${x.fac?`<div>${esc(x.fac)}</div>`:""}<div>${esc(x.addr||"住所は非公開")}${x.approx?' <span class="mbadge old">町まで</span>':""}</div>
     ${MAP_ST.city==="tokyo"?"":`<div><span class="mbadge ${MAP_LV[x.lv].c}">${MAP_LV[x.lv].t}</span> <span class="muted">${esc(x.note)}</span></div>`}
     ${x.lat!=null?`<a href="${gLink(x)}" target="_blank" rel="noopener">Googleマップで開く</a>`:""}</div>`};
  let gm=null,markers=new Map(),iw=null;
  const focus=h=>{const x=h==="__venue"?C.venue:items.find(i=>i.h===h);if(!x||x.lat==null){if(x)toastInfo(x);return}
    $$("#mlist .mitem").forEach(b=>b.classList.toggle("on",b.dataset.h===h));
    if(gm){const m=markers.get(h);gm.panTo({lat:x.lat,lng:x.lng});if(gm.getZoom()<12)gm.setZoom(13);if(m){iw.setContent(info(h==="__venue"?"__venue":x));iw.open({map:gm,anchor:m})}}
    else{$("#gmap").innerHTML=`<iframe src="${gEmbed(x)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="地図"></iframe>`;const p=$("#minfo-static");if(p)p.innerHTML=info(h==="__venue"?"__venue":x);else $("#gmap").insertAdjacentHTML("afterend",`<div id="minfo-static" class="card">${info(h==="__venue"?"__venue":x)}</div>`)}};
  const toastInfo=x=>{const p=$("#minfo-static");const html=info(x);if(p)p.innerHTML=html;else $("#gmap").insertAdjacentHTML("afterend",`<div id="minfo-static" class="card">${html}</div>`)};
  const drawList=()=>{$("#mlist").innerHTML=listHtml();$$("#mlist .mitem").forEach(b=>b.onclick=()=>focus(b.dataset.h))};
  const redrawMarkers=()=>{if(!gm)return;for(const [h,m] of markers){if(h==="__venue")continue;const x=items.find(i=>i.h===h);m.setVisible(!!x&&vis(x))}};
  drawList();
  $$("#mich .ichip").forEach(b=>b.onclick=()=>{const k=b.dataset.i;MAP_ST.ich.has(k)?MAP_ST.ich.delete(k):MAP_ST.ich.add(k);b.classList.toggle("on");drawList();redrawMarkers()});
  $$("#mlv input").forEach(c=>c.onchange=()=>{c.checked?MAP_ST.lv.add(c.dataset.l):MAP_ST.lv.delete(c.dataset.l);drawList();redrawMarkers()});
  let g=null;try{g=await loadGmaps()}catch(e){$("#gmap").insertAdjacentHTML("afterend",`<p class="err">${esc(e.message)}。APIキーと許可するURLの設定を確認してください。</p>`)}
  if(!live(my))return;
  if(!g){focus("__venue");return}
  gm=new g.Map($("#gmap"),{center:{lat:C.venue.lat,lng:C.venue.lng},zoom:11,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:"cooperative"});
  iw=new g.InfoWindow();
  const bounds=new g.LatLngBounds();
  const vm=new g.Marker({position:{lat:C.venue.lat,lng:C.venue.lng},map:gm,title:C.venue.name,zIndex:999,label:{text:"場",color:"#fff",fontSize:"11px",fontWeight:"700"},icon:{path:g.SymbolPath.CIRCLE,scale:11,fillColor:"#1d1b18",fillOpacity:1,strokeColor:"#fff",strokeWeight:2}});
  vm.addListener("click",()=>focus("__venue"));markers.set("__venue",vm);bounds.extend(vm.getPosition());
  for(const x of items){if(x.lat==null)continue;const col=ICOL[x.ich]||"#888";const old=x.lv==="C"||x.lv==="X";
    const m=new g.Marker({position:{lat:x.lat,lng:x.lng},map:gm,title:x.h+"部屋",label:{text:x.h.slice(0,1),color:old?col:"#fff",fontSize:"10px",fontWeight:"700"},
      icon:{path:g.SymbolPath.CIRCLE,scale:9,fillColor:old?"#fff":col,fillOpacity:1,strokeColor:col,strokeWeight:old?2:1.5}});
    m.addListener("click",()=>focus(x.h));markers.set(x.h,m);bounds.extend(m.getPosition())}
  gm.fitBounds(bounds,40);redrawMarkers();
}

{const _vb=viewBanzuke;viewBanzuke=async function(b,d,my){const h=decodeURIComponent(location.hash.slice(1));const m=h.match(/^map(?:-(\w+))?$/);if(m){setNav("map");return viewMap(m[1],my)}return _vb(b,d,my)}}
