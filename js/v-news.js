"use strict";
/* ---------- 今日のニュース（取組結果ページの上部） ----------
   その日の結果で「前日から変わったこと」を自動で文章にする。番付の見込みは目安。
   判定の目安：
   ・幕下→十両：幕下15枚目以内の全勝は十両昇進（内規）。筆頭〜2枚目の勝ち越し、5枚目以内の5勝以上は濃厚。
   ・十両→幕下／幕内→十両：負け越し確定で「枚数＋（黒星−白星）」が段の最下位を超えたら陥落の可能性。
   ・十両→幕内：勝ち越し確定で「枚数−（白星−黒星）」が0以下なら入幕の可能性。
   ・三役：平幕の勝ち越し確定者を「白星−黒星−（枚数−1）」で並べ、負け越した三役の数＝空きの数まで濃厚。
   ・大関：前場所負け越しは角番。関脇で前場所大関なら10勝で復帰。三役3場所合計33勝が大関昇進の目安。 */
const NEWS_CACHE=new Map();
const prevBasho=(b,k)=>{let y=+b.slice(0,4),m=+b.slice(4,6);for(let i=0;i<k;i++){m-=2;if(m<1){m+=12;y--}}return y+String(m).padStart(2,"0")};
function nwSt(rec,D,lower){let w=0,l=0,a=0,last="";for(let i=0;i<Math.min(D,rec.length);i++){const s=(rec[i]||{}).result||"";if(s==="win"||s==="fusen win")w++;else if(s==="loss"||s==="fusen loss")l++;else if(s==="absent"&&!lower)a++;if(s&&!(lower&&s==="absent"))last=s}return{w,l,a,kyujo:!lower&&(last==="absent"||last==="fusen loss")}}
const nwRec=s=>`${s.w}勝${s.l}敗${s.a?s.a+"休":""}`;
const nwL=r=>link(r.id,r.en);

async function buildNews(basho,D){
  const key=basho+"-"+D;if(NEWS_CACHE.has(key)&&basho!==CUR)return NEWS_CACHE.get(key);
  const ttl=bashoTTL(basho);
  const [mk,jr,ms,p1,p2]=await Promise.all([
    api(`/basho/${basho}/banzuke/Makuuchi`,ttl),api(`/basho/${basho}/banzuke/Juryo`,ttl),api(`/basho/${basho}/banzuke/Makushita`,ttl).catch(()=>null),
    api(`/basho/${prevBasho(basho,1)}/banzuke/Makuuchi`,86400).catch(()=>null),api(`/basho/${prevBasho(basho,2)}/banzuke/Makuuchi`,86400).catch(()=>null)]);
  const mkL=z=>z?[...(z.east||[]),...(z.west||[])].map(r=>{addNames([r]);return{id:r.rikishiID,en:r.shikonaEn,rk:parseRank(r.rank)||{},rec:r.record||[],wins:r.wins,losses:r.losses,abs:r.absences}}):[];
  const M=mkL(mk),J=mkL(jr),S=mkL(ms).filter(r=>r.rk.num<=15);
  const prev=k=>{const z=k===1?p1:p2;const m=new Map();for(const r of mkL(z))m.set(r.id,r);return m};
  const P1=prev(1),P2=prev(2);
  const items=[];const add=(cat,pri,html,rid)=>items.push({cat,pri,html,rid});
  const st=(r,d,lower)=>nwSt(r.rec,d,lower);
  const pending=M.some(r=>{const x=r.rec[D-1];return x&&!x.result&&x.opponentID});

  /* 1. 優勝争い */
  const race=(L,d)=>{const s=L.map(r=>({r,s:st(r,d)})).filter(o=>!o.s.kyujo);const lw=Math.max(0,...s.map(o=>o.s.w));const rem=15-d;
    const lead=s.filter(o=>o.s.w===lw);const cont=s.filter(o=>o.s.w+rem>=lw&&lw-o.s.w<=2);return{lw,lead,cont,ids:new Set(cont.map(o=>o.r.id)),rem}};
  for(const [L,dj,base] of [[M,"幕内",100],[J,"十両",60]]){
    if(D<5)break;const a=race(L,D),b=race(L,D-1);const ln=a.lead.length;if(!ln||!b.lead.length)continue;
    const leadTxt=a.lead.map(o=>nwL(o.r)).join("・");
    const wasLead=new Set(b.lead.map(o=>o.r.id));
    const unbeaten=a.lead.filter(o=>o.s.l===0&&o.s.a===0),unbeatenB=b.lead.filter(o=>o.s.l===0&&o.s.a===0);
    let t=`${dj}は${leadTxt}が${nwRec(a.lead[0].s)}で`;
    if(ln===1){const id=a.lead[0].r.id;t+=b.lead.length===1&&wasLead.has(id)?"単独首位を守りました。":wasLead.has(id)?"単独首位に立ちました。":"単独首位に浮上しました。"}
    else t+=ln>=4?`首位に${ln}人が並んでいます。`:"首位に並んでいます。";
    if(unbeatenB.length&&!unbeaten.length)t+=`全勝が消えました（${unbeatenB.map(o=>nwL(o.r)).join("・")}に初黒星）。`;
    else if(unbeaten.length)t+="全勝を守っています。";
    add("優勝争い",base,t);
    const out=b.cont.filter(o=>!a.ids.has(o.r.id)).map(o=>{const s=st(o.r,D);return{o,s,dead:s.w+a.rem<a.lw}});
    if(out.length&&D>=8)add("優勝争い",base-5,`${out.map(x=>`${nwL(x.o.r)}（${nwRec(x.s)}）`).join("・")}は${out.every(x=>x.dead)?"優勝の可能性が消えました":"首位との差が3に広がりました"}。${dj}の優勝争いは${a.cont.length}人に絞られています（${a.cont.filter(o=>!a.lead.includes(o)).slice(0,6).map(o=>nwL(o.r)).join("・")||"首位のみ"}が追走）。`);
  }

  /* 2. 横綱・大関・三役の勝ち越し／負け越し、角番、大関復帰、大関取り */
  for(const r of M.filter(x=>x.rk.ord<=4)){
    const a=st(r,D),b=st(r,D-1);const p=P1.get(r.id),q=P2.get(r.id);
    const kk=a.w>=8&&b.w<8,mk8=a.l+a.a>=8&&b.l+b.a<8;
    const pRk=p&&p.rk.ord,kadoban=r.rk.ord===2&&pRk===2&&(p.losses+(p.abs||0))>=8;
    const pos=r.rk.full||r.rk.short||"";
    if(r.rk.ord===2){
      if(kk)add("大関",90,`大関${nwL(r)}が勝ち越し（${nwRec(a)}）${kadoban?"。角番を脱出しました":"を決めました"}。`);
      if(mk8)add("大関",92,kadoban?`角番の大関${nwL(r)}が負け越し（${nwRec(a)}）。来場所は関脇に陥落します。`:`大関${nwL(r)}が負け越し（${nwRec(a)}）。来場所は角番です。`);
    }else if(r.rk.ord===1){
      if(kk)add("横綱",68,`横綱${nwL(r)}が勝ち越し（${nwRec(a)}）。`);if(mk8)add("横綱",91,`横綱${nwL(r)}が負け越し（${nwRec(a)}）。`);
    }else{
      if(kk)add("三役",70,`${pos}${nwL(r)}が勝ち越し（${nwRec(a)}）、三役の地位を守る見込みです。`);
      if(mk8)add("三役",72,`${pos}${nwL(r)}が負け越し（${nwRec(a)}）、${r.rk.ord===3?"関脇から":"三役から"}陥落の見込みです。`);
      if(r.rk.ord===3&&pRk===2){
        if(a.w>=10&&b.w<10)add("大関",95,`前場所大関の関脇${nwL(r)}が10勝目。来場所の大関復帰が決まりました（陥落直後の場所で関脇10勝の特例）。`);
        else if(a.l+a.a>=6&&b.l+b.a<6)add("大関",80,`関脇${nwL(r)}は6敗目で、大関復帰の条件（10勝）に届かなくなりました。`);
      }
      const sa=x=>x&&x.rk.ord>=3&&x.rk.ord<=4;
      if(sa(p)&&sa(q)){const base=p.wins+q.wins,need=33-base;
        if(a.w>=need&&b.w<need)add("大関",94,`${pos}${nwL(r)}が三役3場所合計33勝（大関昇進の目安）に到達しました（前々場所${q.wins}勝・前場所${p.wins}勝・今場所${a.w}勝）。`);
        else if(a.w<need&&p.wins>=10&&base>=21){const left=15-D;if(a.w+left>=need&&a.w>b.w)add("大関",78,`${pos}${nwL(r)}の大関取り：目安の33勝まであと${need-a.w}勝（残り${left}日）。`);
          else if(a.w+left<need&&b.w+left+1>=need)add("大関",78,`${pos}${nwL(r)}は目安の33勝に届かなくなりました。`)}}
    }
  }

  /* 3. 三役昇進の見込み（平幕の勝ち越し確定者 × 空き） */
  const sanyakuStatus=d=>{const vac=M.filter(r=>r.rk.ord>=3&&r.rk.ord<=4&&(()=>{const s=st(r,d);return s.l+s.a>=8})()).length;
    const c=M.filter(r=>r.rk.ord===5).map(r=>({r,s:st(r,d)})).filter(o=>o.s.w>=8&&(o.r.rk.num<=6||o.s.w>=11)).map(o=>({...o,score:o.s.w-o.s.l-(o.r.rk.num-1)})).sort((x,y)=>y.score-x.score||x.r.rk.val-y.r.rk.val);
    const m=new Map();c.forEach((o,i)=>{if(i<vac)m.set(o.r.id,{lv:2,o});else if(o.r.rk.num<=2||o.score>=3)m.set(o.r.id,{lv:1,o})});return{m,vac}};
  const sA=sanyakuStatus(D),sB=sanyakuStatus(D-1);
  const promos=[];
  for(const [id,x] of sA.m){const y=sB.m.get(id);if(!y||y.lv<x.lv)promos.push({kind:"三役",lv:x.lv,r:x.o.r,s:x.o.s,vac:sA.vac})}

  /* 4. 幕内⇔十両、十両⇔幕下 */
  const maxNum=(L,ord)=>Math.max(0,...L.filter(r=>r.rk.ord===ord).map(r=>r.rk.num||0));
  const maxM=maxNum(M,5),maxJ=maxNum(J,6);
  const downLv=(r,d,max)=>{const s=st(r,d);if(s.l+s.a<8)return 0;const p=r.rk.num+(s.l+s.a-s.w);return p>max+2?2:p>max?1:0};
  const upJ=(r,d)=>{const s=st(r,d);if(s.w<8)return 0;const p=r.rk.num-(s.w-s.l-s.a);return p<=-2?2:p<=0?1:0};
  const upS=(r,d)=>{const s=st(r,d,true);const n=r.rk.num;if(s.w===7&&n<=15)return 3;if(s.w>=4&&n<=2)return 2;if(s.w>=5&&n<=5)return 2;if(s.w===4&&n<=5)return 1;if(s.w>=6&&n<=10)return 1;return 0};
  const downs=[];
  for(const r of M.filter(x=>x.rk.ord===5)){const a=downLv(r,D,maxM),b=downLv(r,D-1,maxM);if(a>b)downs.push({to:"十両",lv:a,r,s:st(r,D)})}
  for(const r of J){const a=downLv(r,D,maxJ),b=downLv(r,D-1,maxJ);if(a>b)downs.push({to:"幕下",lv:a,r,s:st(r,D)})}
  for(const r of J){const a=upJ(r,D),b=upJ(r,D-1);if(a>b)promos.push({kind:"入幕",lv:a,r,s:st(r,D)})}
  for(const r of S){const a=upS(r,D),b=upS(r,D-1);if(a>b)promos.push({kind:"十両",lv:a,r,s:st(r,D,true)})}
  for(const r of S){const s=st(r,D,true),b=st(r,D-1,true);if(s.w===6&&s.l===0&&b.w<6)add("十両",55,`幕下${r.rk.num}枚目の${nwL(r)}が6戦全勝。七番相撲に勝てば十両昇進です（幕下15枚目以内の全勝は十両昇進の内規）。`)}

  /* 新・再の判定（番付の履歴） */
  const ever=async(id,maxVal)=>{try{const z=await api(`/rikishi/${id}?ranks=true`,86400);return(z.rankHistory||[]).some(h=>String(h.bashoId)<basho&&h.rankValue&&h.rankValue<maxVal)}catch(e){return null}};
  await pool(promos,async p=>{const lim=p.kind==="三役"?500:p.kind==="入幕"?600:700;const e=await ever(p.r.id,lim);
    p.label=e==null?p.kind+"昇進":p.kind==="三役"?(e?"三役復帰":"新三役"):p.kind==="入幕"?(e?"再入幕":"新入幕"):(e?"再十両":"新十両")},4);
  for(const p of promos){
    if(p.kind==="三役")add("三役",p.lv>=2?76:66,`前頭${p.r.rk.num}枚目の${nwL(p.r)}が${nwRec(p.s)}。${p.label}${p.lv>=2?"が濃厚です":"の可能性があります"}（負け越しが決まった関脇・小結は${p.vac?p.vac+"人":"まだいません"}）。`);
    else if(p.kind==="入幕")add("入幕",p.lv>=2?64:58,`十両${p.r.rk.num}枚目の${nwL(p.r)}が${nwRec(p.s)}で${p.label}${p.lv>=2?"が濃厚に":"の可能性が出てきました"}${p.lv>=2?"なりました":""}。`);
    else add("十両",p.lv===3?62:p.lv>=2?60:52,`幕下${p.r.rk.num}枚目の${nwL(p.r)}が${p.s.w}勝${p.s.l}敗${p.lv===3?"の全勝。"+p.label+"が決定的です（内規）":`で${p.label}${p.lv>=2?"が濃厚です":"の可能性があります"}`}。`);
}
  for(const d of downs)add("陥落",d.to==="十両"?63:57,`${d.to==="十両"?"前頭":"十両"}${d.r.rk.num}枚目の${nwL(d.r)}が${nwRec(d.s)}。${d.to}陥落${d.lv>=2?"が濃厚です":"の可能性があります"}。`);

  items.sort((a,b)=>b.pri-a.pri);
  const res={items,pending};NEWS_CACHE.set(key,res);return res;
}

async function fillNews(basho,D,my){
  const box=$("#news");if(!box)return;
  try{const {items,pending}=await buildNews(basho,D);if(!live(my)||!$("#news"))return;
    const shown=items.slice(0,8),more=items.slice(8);
    const li=it=>`<li><span class="ntag" data-c="${esc(it.cat)}">${esc(it.cat)}</span><span>${it.html}</span></li>`;
    box.innerHTML=`<div class="nhd"><b>今日のニュース</b><span class="muted">${D}日目${pending?"（途中経過）":""}</span></div>
     ${items.length?`<ul class="nlist">${shown.map(li).join("")}</ul>${more.length?`<details><summary class="muted">ほか${more.length}件</summary><ul class="nlist">${more.map(li).join("")}</ul></details>`:""}`:'<p class="muted">この日は大きな動きはありません。</p>'}
     <p class="muted nnote">前日からの変化を自動でまとめています。昇進・陥落は番付編成会議で決まるため、ここでの判定は目安です（判定の基準は<a href="#" id="nrule">こちら</a>）。</p>
     <div id="nrules" class="muted" hidden><ul>
      <li>幕下→十両：15枚目以内の全勝は内規で昇進。筆頭〜2枚目の勝ち越し、5枚目以内の5勝以上は「濃厚」、5枚目以内の4勝・10枚目以内の6勝は「可能性」。</li>
      <li>十両→幕内：勝ち越し確定で「枚数−（白星−黒星）」が0以下なら可能性、−2以下なら濃厚。</li>
      <li>幕内→十両、十両→幕下：負け越し確定で「枚数＋（黒星−白星）」がその段の最下位の枚数を超えたら可能性、2枚以上超えたら濃厚。</li>
      <li>三役：平幕の勝ち越し確定者を「白星−黒星−（枚数−1）」で並べ、負け越しが確定した関脇・小結の人数（空き）までを濃厚、前頭2枚目以内などを可能性。</li>
      <li>大関：前場所負け越しなら角番。陥落直後の関脇は10勝で大関復帰。昇進は「三役で3場所合計33勝」が目安（明文化された規定ではありません）。前場所に三役で10勝以上した力士を「大関取り」として扱います。</li>
      <li>「新」「再」は番付の履歴で、その地位に就いたことがあるかで判定しています。</li></ul></div>`;
    const a=$("#nrule");if(a)a.onclick=e=>{e.preventDefault();const r=$("#nrules");r.hidden=!r.hidden};
  }catch(e){console.error(e);if(live(my)&&$("#news"))$("#news").innerHTML='<p class="muted">ニュースを作れませんでした（データの取得に失敗）。</p>'}
}

{const _vd=viewDay;viewDay=async function(basho,day,div,my){await _vd(basho,day,div,my);if(!live(my))return;
  const b=($("#bsel")||{}).value,on=$("#days button.on");const D=on?+on.dataset.x:0;if(!b||!D)return;
  const h1=$("#app h1");if(!h1)return;h1.insertAdjacentHTML("afterend",'<div id="news" class="card news"><div class="sk skrow" style="width:60%"></div><div class="sk skrow" style="width:85%"></div><div class="sk skrow" style="width:75%"></div></div>');
  fillNews(b,D,my)}}
