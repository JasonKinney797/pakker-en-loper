'use strict';
/* ---------- Gsm en tablet ---------- */
const TOUCH=matchMedia('(pointer:coarse)').matches;
const SHEETQ=matchMedia('(max-width:900px),(max-width:1100px) and (orientation:portrait)');
const panelEl=document.getElementById('panel');
S.queue=false;S.tab='cmd';
function setTab(t){S.tab=t;panelEl.querySelectorAll('.box').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===t)));}
/* de lade pauzeert het spel; sluiten zet het weer verder als de lade het gepauzeerd had */
function openSheet(){if(!S.paused&&!S.over&&S.started&&!online()){S.paused=true;S._sheetPaused=true;}panelEl.classList.add('open');syncUI();}
function closeSheet(resume){panelEl.classList.remove('open');if(resume&&S._sheetPaused&&!S.over)S.paused=false;S._sheetPaused=false;syncUI();}
/* na een bevel of formatie uit de lade: lade dicht, spel blijft gepauzeerd zodat je rustig kan kijken of tikken */
function sheetAfterAction(){if(SHEETQ.matches&&panelEl.classList.contains('open'))closeSheet(false);}
document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
document.getElementById('sheetClose').addEventListener('click',()=>closeSheet(true));
document.getElementById('mPanel').addEventListener('click',()=>panelEl.classList.contains('open')?closeSheet(true):openSheet());
document.getElementById('mPause').addEventListener('click',()=>{S._sheetPaused=false;togglePause();});
document.getElementById('mReady').addEventListener('click',playerReady);
document.getElementById('mCd').addEventListener('click',playerCountdown);
document.getElementById('mSpeed').addEventListener('click',()=>setSpeed(S.watch?(S.speed===1?2:S.speed===2?4:S.speed===4?.5:1):(S.speed===1?2:S.speed===2?.5:1)));
document.getElementById('mQueue').addEventListener('click',()=>{S.queue=!S.queue;syncUI();});
document.getElementById('mClear').addEventListener('click',()=>{if(S.cmd)setCmd(null);else{S.sel.clear();syncUI();}});
document.getElementById('mAll').addEventListener('click',()=>{S.sel=new Set(S.kids.filter(x=>x.team===0&&x.status==='active').map(x=>x.id));syncUI();});
/* groepen: tikken selecteert, lang drukken bewaart */
document.querySelectorAll('[data-grp]').forEach(b=>{
  let t=null,long=false;
  b.addEventListener('pointerdown',()=>{long=false;t=setTimeout(()=>{long=true;S.groups[b.dataset.grp]=[...S.sel];toast(`Groep ${b.dataset.grp} bewaard (${S.sel.size}).`);syncUI();},500);});
  const stop=()=>clearTimeout(t);b.addEventListener('pointerup',stop);b.addEventListener('pointerleave',stop);b.addEventListener('pointercancel',stop);
  b.addEventListener('contextmenu',e=>e.preventDefault());
  b.addEventListener('click',()=>{if(long)return;const g=S.groups[b.dataset.grp];
    if(!g||!g.length){toast('Lege groep. Houd de knop ingedrukt om je selectie te bewaren.');return;}
    S.sel=new Set(g.filter(id=>{const x=S.byId.get(id);return x&&x.status==='active';}));syncUI();});
});
function syncMobile(){
  const mr=document.getElementById('mReady');mr.hidden=!S.setup||S.over;mr.disabled=!!(S.ready&&S.ready[0]);
  const mc=document.getElementById('mCd');mc.hidden=S.role[0]!=='pakkers'||S.setup;mc.disabled=!!S.cd||S.over;
  document.getElementById('mPause').textContent=S.paused?'Verder':'Pauze';
  document.getElementById('mSpeed').textContent=(S.speed===.5?'0,5':S.speed)+'×';
  document.getElementById('mQueue').setAttribute('aria-pressed',String(!!S.queue));
  document.getElementById('mPanel').setAttribute('aria-pressed',String(panelEl.classList.contains('open')));
  const n=selected().length;document.getElementById('mClear').textContent=S.cmd?'Annuleer':n?`Wis (${n})`:'Wis';
  document.querySelectorAll('[data-grp]').forEach(b=>b.classList.toggle('has',!!(S.groups[b.dataset.grp]&&S.groups[b.dataset.grp].length)));
  document.getElementById('tabRol').hidden=S.set.mode!=='rol';
  if(S.tab==='rol'&&S.set.mode!=='rol')setTab('cmd');
}
setTab('cmd');
if(TOUCH){
  document.getElementById('cmdHelp').textContent='Tik op een kind om het te kiezen of weg te halen. Tik op de grond: ga naar. Tik op een tegenstander: achtervolgen (pakkers) of in-uit (lopers). Lang drukken en slepen: selectievak. Twee vingers: zoomen en verschuiven.';
  const sh=document.querySelector('[data-tab="cmd"] h2 small');if(sh)sh.textContent='Wachtrij-knop onderaan';
  const si=document.getElementById('selInfo');if(si&&!S.started)si.textContent='Tik op een kind van jouw ploeg, of druk lang en sleep een vak. Houd een groepknop (1–5) ingedrukt om je selectie te bewaren.';
}
{const m=/^#join-([A-Za-z]{4})$/.exec(location.hash||'');if(m){setNetChoice('join');document.getElementById('joinCode').value=m[1].toUpperCase();}}
SHEETQ.addEventListener&&SHEETQ.addEventListener('change',()=>{if(!SHEETQ.matches)closeSheet(true);});
