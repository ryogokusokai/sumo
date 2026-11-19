"use strict";
/* ---------- 力士一覧 ---------- */
let LIST_STATE={q:"",heya:"",pref:"",ich:"",sort:"rank",dir:1};
async function viewList(my){
  const recs=await loadAllRikishi();if(!live(my))return;
  const rows=recs.map(r=>({id:r.id,jp:cleanJp(r.shikonaJp,r.shikonaEn),en:r.shikonaEn,heya:heya(r.heya),hen:r.heya,ich:ichOf(r.heya),pref:pref(r.shusshin),birth:ymd(r.birthDate),age:age(r.birthDate),debut:r.debut,h:r.height,w:r.weight,rank:parseRank(r.currentRank)}));
  const heyas=[...new Set(rows.map(r=>r.heya))].sort((a,b)=>a.localeCompare(b,"ja"));
  const JPN=Object.values(PREF).slice(0,47);const used=new Set(rows.map(r=>r.pref).filter(Boolean));
  const prefsF=[...used].filter(p=>!JPN.includes(p)).sort((a,b)=>a.localeCompare(b,"ja")),prefsJ=JPN.filter(p=>used.has(p));
  render(`<h1>力士一覧（現役）</h1>
  <div class="ctrl"><input id="q" placeholder="四股名で検索（漢字・ローマ字）" value="${esc(LIST_STATE.q)}" style="flex:1;min-width:160px">
  <select id="fh"><option value="">部屋：すべて</option>${heyas.map(h=>`<option${h===LIST_STATE.heya?" selected":""}>${esc(h)}</option>`).join("")}</select>
  <select id="fi"><option value="">一門：すべて</option>${ICHIMON.map(i=>`<option value="${i.k}"${i.k===LIST_STATE.ich?" selected":""}>${i.k}一門</option>`).join("")}</select>
  <select id="fp"><option value="">出身：すべて</option>${[["海外",prefsF],["日本（北から）",prefsJ]].map(([g,a])=>`<optgroup label="${g}">${a.map(h=>`<option${h===LIST_STATE.pref?" selected":""}>${esc(h)}</option>`).join("")}</optgroup>`).join("")}</select></div>
  <div class="muted" id="cnt"></div>
  <div class="card scroll"><table><thead><tr>
  ${[["rank","番付"],["jp","四股名"],["heya","部屋"],["ich","一門"],["pref","出身"],["age","年齢"],["birth","生年月日"],["debut","初土俵"],["h","身長"],["w","体重"]].map(([k,j])=>`<th class="sort" data-k="${k}">${j}</th>`).join("")}
  </tr></thead><tbody id="tb"></tbody></table></div>`);
  const draw=()=>{const s=LIST_STATE,q=s.q.trim().toLowerCase();
    let v=rows.filter(r=>(!q||r.jp.includes(s.q.trim())||r.en.toLowerCase().includes(q))&&(!s.heya||r.heya===s.heya)&&(!s.pref||r.pref===s.pref)&&(!s.ich||r.ich===s.ich));
    const key={rank:r=>r.rank?r.rank.val:99999,jp:r=>r.en,heya:r=>r.heya,pref:r=>r.pref,ich:r=>r.ich,age:r=>r.birth?-new Date(r.birth):0,birth:r=>r.birth,debut:r=>r.debut,h:r=>r.h,w:r=>r.w}[s.sort];
    v.sort((a,b)=>{const x=key(a),y=key(b);return(x>y?1:x<y?-1:0)*s.dir});
    $("#cnt").textContent=v.length+"人";
    $("#tb").innerHTML=v.map(r=>`<tr><td class="muted">${r.rank?esc(r.rank.full):""}</td><td>${link(r.id,r.en)}</td><td>${heyaLink(r.hen)}</td><td>${ichDot(r.ich)}${esc(r.ich)}</td><td>${esc(r.pref)}</td><td class="r">${r.age}</td><td>${r.birth}</td><td>${ym(r.debut)}</td><td class="r">${r.h||""}</td><td class="r">${r.w||""}</td></tr>`).join("");
    document.querySelectorAll("th.sort").forEach(th=>th.textContent=th.textContent.replace(/[▲▼]/g,"")+(th.dataset.k===s.sort?(s.dir>0?"▲":"▼"):""));
  };
  $("#q").oninput=e=>{LIST_STATE.q=e.target.value;draw()};
  $("#fh").onchange=e=>{LIST_STATE.heya=e.target.value;draw()};
  $("#fp").onchange=e=>{LIST_STATE.pref=e.target.value;draw()};
  $("#fi").onchange=e=>{LIST_STATE.ich=e.target.value;draw()};
  document.querySelectorAll("th.sort").forEach(th=>th.onclick=()=>{const k=th.dataset.k;if(LIST_STATE.sort===k)LIST_STATE.dir*=-1;else{LIST_STATE.sort=k;LIST_STATE.dir=1}draw()});
  draw();
}
