'use strict';
/* ---------- Statistieken ---------- */
function statsHTML(team,label,cls){
  const ks=S.kids.filter(k=>k.team===team).sort((a,b)=>(b.st.tags+b.st.cross*2)-(a.st.tags+a.st.cross*2)||a.st.got-b.st.got);
  const v=n=>`<span class="v${n?'':' z'}">${n}</span>`;
  const hd=(l,s,c)=>`<span class="hd${c?' '+c:''}"><span class="lg">${l}</span><span class="sm">${s}</span></span>`;
  return `<div class="sth ${cls}">${label}</div><div class="stt">${hd('Naam','Naam')}${hd('Tikken','Tik')}${hd('Getikt','Get.')}${hd('Over C','C')}${hd('Net niet','Mis')}${hd('Rondes','R','r')}`+
    ks.map(k=>`<span class="n">${esc(k.name)}</span>${v(k.st.tags)}${v(k.st.got)}${v(k.st.cross)}${v(k.st.miss)}<span class="v r">${k.st.rounds}</span>`).join('')+'</div>';
}
function openStats(){
  if(!S.kids.length)return;
  document.getElementById('statsBody').innerHTML=statsHTML(0,'Jouw ploeg','mijn')+statsHTML(1,'Andere ploeg','ander');
  if(!S.paused&&!S.over&&S.started){S.paused=true;S._statsPaused=true;}
  document.getElementById('statsOv').hidden=false;syncUI();
}
function closeStats(){document.getElementById('statsOv').hidden=true;if(S._statsPaused&&!S.over)S.paused=false;S._statsPaused=false;syncUI();}
document.getElementById('statsBtn').addEventListener('click',openStats);
document.getElementById('statsBtn2').addEventListener('click',()=>{if(typeof closeSheet==='function'&&document.getElementById('panel').classList.contains('open'))closeSheet(false);openStats();});
document.getElementById('statsClose').addEventListener('click',closeStats);
function toggleSound(){SFX.set(!SFX.on);syncUI();}
document.getElementById('soundBtn').addEventListener('click',toggleSound);
document.getElementById('mSound').addEventListener('click',toggleSound);
