"use strict";
/* ---------- APIの前に、GitHub Actionsが保存したデータ（data/live/cache）を使う ----------
   見る人が増えても Sumo API への問い合わせが増えないようにするため。
   新しさの基準を満たさないときは、これまでどおりAPIを直接読む。 */
const CACHE_DIR="data/live/cache/";
let CACHE_IDX=null;
function cacheIdx(){if(!CACHE_IDX)CACHE_IDX=fetch(CACHE_DIR+"index.json?t="+Math.floor(Date.now()/120000)).then(r=>r.ok?r.json():null).catch(()=>null);return CACHE_IDX}
const cacheKey=p=>p.replace(/[^A-Za-z0-9]/g,"_")+".json";
/* 本場所の取組中（日本時間 8:00〜18:30）は40分以内のデータだけ使う。それ以外は直近の18:30以降に取ったデータなら使う */
function cacheFresh(path,t,idx){
  const now=Date.now(),age=now-t;
  const m=path.match(/^\/basho\/(\d{6})\//);
  if(!m||m[1]!==idx.current)return age<26*3600e3;
  const j=new Date(now+9*3600e3),mins=j.getUTCHours()*60+j.getUTCMinutes();
  const ongoing=typeof trOngoing==="function"?trOngoing(m[1]):true;
  if(ongoing&&mins>=480&&mins<1110)return age<40*60e3;
  const last=Date.UTC(j.getUTCFullYear(),j.getUTCMonth(),j.getUTCDate(),18,30)-9*3600e3-(mins<1110?864e5:0);
  return t>=last&&age<26*3600e3;
}
{const _api=api;api=async function(path,ttl=300){
  const key="sumo:"+path;
  if(mem.has(key)&&Date.now()-mem.get(key).t<ttl*1000)return mem.get(key).v;
  try{const idx=await cacheIdx();const t=idx&&idx.paths&&idx.paths[path];
    if(t&&cacheFresh(path,t,idx)){const r=await fetch(CACHE_DIR+cacheKey(path)+"?t="+t);if(r.ok){const v=await r.json();mem.set(key,{t:Date.now(),v});return v}}}catch(e){}
  return _api(path,ttl)}}
