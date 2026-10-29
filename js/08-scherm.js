'use strict';
/* ---------- Verslagen en tiebreaker ---------- */
function showReport(winner,wt,wasTb){
  const ev=S.ev,L=lt(),P=1-L;
  const title=`${wasTb?'Tiebreaker':'Ronde '+S.round}: punt voor ${wt===0?'jouw ploeg':'de andere ploeg'}`;
  const li=[];
  li.push(`Duur: <b>${fmt(S.rt)}</b>.`);
  if(winner==='lopers')li.push(`<b>${ev.cross.name}</b> raakte over C bij ${zoneOf(ev.cross.y)}.`);
  else li.push('Alle lopers zijn getikt.');
  li.push(ev.cdBy?`${ev.cdBy} begon af te tellen na ${fmt(ev.cdAt)}.`:'Er werd niet afgeteld.');
  if(ev.tags.length)li.push('Getikt: '+ev.tags.map(t=>`${t.p} tikte ${t.l} (${zoneOf(t.y)}, ${fmt(t.t)})`).join('; ')+'.');
  else li.push('Niemand werd getikt.');
  li.push(`Net niet: ${ev.miss[P]} mislukte tikpogingen.`);
  li.push(`Opstelling van de andere ploeg (${S.role[1]}): <b>${ev.tac[1]||'onbekend'}</b>.`);
  const ls=learnSummary(1);if(ls.length)li.push('De andere ploeg heeft gemerkt: '+ls.join('; ')+'.');
  const ov=document.getElementById('repOv');
  document.getElementById('repTitle').textContent=title;
  document.getElementById('repList').innerHTML=li.map((s,i)=>`<li class="${i===1?'k':''}">${s}</li>`).join('');
  syncUI();
  if(S.reportsOff){nextRound();return;}
  ov.hidden=false;document.getElementById('repNext').focus();
}
function showInfoReport(title,txt){
  if(S.reportsOff){nextRound();return;}
  document.getElementById('repTitle').textContent=title;
  document.getElementById('repList').innerHTML=`<li class="k">${esc(txt)}</li>`;
  document.getElementById('repOv').hidden=false;syncUI();
}
function nextRound(){
  document.getElementById('repOv').hidden=true;
  if(S.pendingSwap){swapRoles();S.pendingSwap=false;}
  startRound();syncUI();buildRoster();
}
function cpuPick(team,n){
  const ks=S.kids.filter(k=>k.team===team);const cap=captainOf(team)||ks[0];
  const lvn=cap?cap.level:'gem';
  if(lvn==='slim'||lvn==='boven')return ks.slice().sort((a,b)=>(b.top+LV_RANK[b.level]*.35)-(a.top+LV_RANK[a.level]*.35)).slice(0,n);
  if(lvn==='gem')return ks.slice().sort((a,b)=>b.top-a.top).slice(0,n);
  if(lvn==='onder'){const f=ks.slice().sort((a,b)=>b.top-a.top).slice(0,Math.ceil(n/2));const r=shuffle(ks.filter(k=>!f.includes(k))).slice(0,n-f.length);return f.concat(r);}
  return shuffle(ks.slice()).slice(0,n);
}
function showTiebreak(){
  const myLoper=S.role[0]==='lopers',n=myLoper?3:5;
  document.getElementById('tbText').textContent=`Zelfde regels, 3 lopers tegen 5 pakkers, met een eigen klok van 3 minuten. Jouw ploeg ${myLoper?'loopt':'pakt'}: kies ${n} kinderen. De andere ploeg kiest ook.`;
  const mine=S.kids.filter(k=>k.team===0).sort((a,b)=>b.top-a.top);
  const box=document.getElementById('tbPicks');
  box.innerHTML=mine.map(k=>`<label><input type="checkbox" value="${k.id}"> ${esc(k.name)}<span class="sp">${k.top.toFixed(2)} m/s${S.set.realism?' · '+LV[k.level].nm:''}</span></label>`).join('');
  const goB=document.getElementById('tbGo');goB.disabled=true;
  box.onchange=()=>{const c=box.querySelectorAll('input:checked');goB.disabled=c.length!==n;
    box.querySelectorAll('input').forEach(i=>{if(!i.checked)i.disabled=c.length>=n;});};
  goB.onclick=()=>{
    const ids=S.auto0?cpuPick(0,n).map(k=>k.id):[...box.querySelectorAll('input:checked')].map(i=>+i.value);
    const other=cpuPick(1,myLoper?5:3).map(k=>k.id);
    S.tb={clock:180,chosen:new Set(ids.concat(other))};
    if(S.pos&&!S.tb.chosen.has(S.pos.id))release('Je kind speelt de tiebreaker niet mee: losgelaten.');
    document.getElementById('tbOv').hidden=true;
    log(`Tiebreaker: de andere ploeg kiest ${other.map(id=>S.byId.get(id).name).join(', ')}.`);
    startRound();buildRoster();syncUI();
  };
  document.getElementById('tbOv').hidden=false;
}

/* ---------- UI ---------- */
const logEl=document.getElementById('log');
function logClear(){logEl.innerHTML='';}
function log(html){const li=document.createElement('li');li.innerHTML=`<span class="tm">${fmt(S.rt||0)}</span>${html}`;logEl.prepend(li);while(logEl.children.length>60)logEl.lastChild.remove();}
function toast(t){const el=document.createElement('div');el.className='toast';el.textContent=t;document.getElementById('toasts').prepend(el);setTimeout(()=>el.remove(),3200);}
function toggleKeys(on){document.getElementById('keysOv').hidden=!on;if(on&&!S.paused&&!S.over){S.paused=true;S._keysPaused=true;}else if(!on&&S._keysPaused){S.paused=false;S._keysPaused=false;}syncUI();}
const ROLE_TXT={jager:'jager',bewaker:'bewaker',muur:'muur',boogman:'boogman',vangnet:'vangnet',sneaker:'sneaker',lokaas:'lokaas'};
const ORD_TXT={guard:'bewaakt B',move:'ga naar',attack:'aanval',follow:'volgt',cover:'dekt',inout:'in-uit',hold:'houdt positie',net:'vangnet'};
function kidStatus(k){
  if(k.status==='prisoner')return 'getikt';if(k.status==='bench')return 'bank';
  if(S.pos&&S.pos.id===k.id)return 'jij';
  if(k.orders.length)return ORD_TXT[k.orders[0].t]+(k.orders.length>1?' +'+(k.orders.length-1):'');
  const r=activeRole(k);if(S.set.mode==='rol'&&r)return ROLE_TXT[r]+(k.role2&&!k.switched?' → '+ROLE_TXT[k.role2]:'');
  return 'vrij';
}
function buildRoster(){
  const box=document.getElementById('roster');
  const mine=S.kids.filter(k=>k.team===0).sort((a,b)=>b.top-a.top);
  box.innerHTML=mine.map(k=>`<button data-kid="${k.id}"><span class="n">${esc(k.name)}</span><span class="sp">${k.top.toFixed(2)}</span><span class="st" data-st="${k.id}"></span></button>`).join('');
  document.getElementById('teamSize').textContent=`${mine.length} kinderen · m/s`;
}
document.getElementById('roster').addEventListener('click',e=>{
  const b=e.target.closest('[data-kid]');if(!b)return;const k=S.byId.get(+b.dataset.kid);
  if(!k||k.status!=='active')return;
  if(e.shiftKey){if(S.sel.has(k.id))S.sel.delete(k.id);else S.sel.add(k.id);}else S.sel=new Set([k.id]);syncUI();
});
function syncUI(){
  if(typeof syncMobile==='function')try{syncMobile();}catch(_){}
  try{for(const id of ['soundBtn','mSound'])document.getElementById(id).setAttribute('aria-pressed',String(SFX.on));}catch(_){}
  if(typeof syncPossess==='function')try{syncPossess();}catch(_){}
  document.getElementById('s0').textContent=S.score[0];document.getElementById('s1').textContent=S.score[1];
  document.getElementById('roleChip').textContent='Jij: '+S.role[0];
  const cc=document.getElementById('clockChip');
  cc.innerHTML=S.tb?`Tiebreaker <b>${fmt(S.tb.clock)}</b>`:`Blok <b>${fmt(S.block)}</b>`;
  cc.className='chip'+(S.tb?' warn':'');
  const cd=document.getElementById('cdChip');
  if(S.setup){cd.textContent=S.ready[0]?'Wachten op de andere ploeg':'Opstellen';cd.className='chip warn';}
  else if(S.cdDone){cd.textContent='B niet meer veilig';cd.className='chip hot';}
  else if(S.cd){cd.innerHTML=`Aftellen <b>${Math.ceil(S.cd.left)}</b>`;cd.className='chip warn';}
  else{cd.textContent='B is veilig';cd.className='chip';}
  const rdb=document.getElementById('readyBtn');rdb.hidden=!S.setup||S.over;rdb.disabled=S.ready&&S.ready[0];
  const cdb=document.getElementById('cdBtn');cdb.hidden=S.role[0]!=='pakkers';cdb.disabled=!!S.cd||S.over||S.setup;
  document.getElementById('pauseBtn').firstChild.textContent=S.paused?'Verder ':'Pauze ';
  const pak=S.role[0]==='pakkers';
  document.getElementById('formP').hidden=!pak;document.getElementById('formL').hidden=pak;
  document.getElementById('formFor').textContent=pak?'pakkers':'lopers';
  const rb=document.getElementById('rolBox');rb.hidden=S.set.mode!=='rol';
  if(!rb.hidden&&rb.dataset.for!==S.role[0]){fillRoleSelects();rb.dataset.for=S.role[0];}
  // selectie
  const ks=selected();
  document.getElementById('selCount').textContent=ks.length?ks.length+(ks.length===1?' kind':' kinderen'):'niemand';
  const si=document.getElementById('selInfo');
  if(ks.length===1){const k=ks[0];
    si.innerHTML=`<dl class="stats">
      <dt>Naam</dt><dd>${esc(k.name)}</dd>
      <dt>Topsnelheid</dt><dd>${k.top.toFixed(2)} m/s (${(k.top*3.6).toFixed(1)} km/u)</dd>
      <dt>Versnelling</dt><dd>${k.acc.toFixed(2)} s tot top</dd>
      <dt>Wendbaarheid</dt><dd>${k.agi}/100</dd>
      <dt>Uithouding</dt><dd>${k.stam.toFixed(1)} s volle sprint</dd>
      <dt>Reactietijd</dt><dd>${k.react.toFixed(2)} s</dd>
      <dt>Tikbereik</dt><dd>${k.reach.toFixed(2)} m</dd>
      ${S.set.realism?`<dt>Niveau</dt><dd>${LV[k.level].nm}</dd>`:''}
      <dt>Bezig</dt><dd>${kidStatus(k)}</dd>
    </dl><div class="meter" title="Energie"><i style="width:${Math.round(k.energy*100)}%;${k.tired?'background:var(--rood)':''}"></i></div>`;
  }else if(ks.length){si.textContent=ks.map(k=>k.name).join(', ');}
  else si.innerHTML=(typeof TOUCH!=='undefined'&&TOUCH)?'Tik op een kind van jouw ploeg, of druk lang en sleep een vak. Houd een groepknop (1–5) ingedrukt om je selectie te bewaren.':'Klik op een kind van jouw ploeg, of sleep een vak rond meerdere kinderen. <kbd>Ctrl</kbd>+<kbd>1</kbd>–<kbd>5</kbd> bewaart een groep.';
  document.querySelectorAll('#roster [data-kid]').forEach(b=>b.classList.toggle('sel',S.sel.has(+b.dataset.kid)));
  document.querySelectorAll('#roster [data-st]').forEach(s=>{const k=S.byId.get(+s.dataset.st);s.textContent=kidStatus(k);s.classList.toggle('out',k.status!=='active');});
}

/* ---------- Knoppen ---------- */
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>setSpeed(+b.dataset.speed)));
document.querySelectorAll('[data-pace]').forEach(b=>b.addEventListener('click',()=>setPace(b.dataset.pace)));
document.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>{setCmd(S.cmd===b.dataset.cmd?null:b.dataset.cmd);if(S.cmd)sheetAfterAction();}));
document.querySelector('[data-act="hold"]').addEventListener('click',e=>{holdSel(e.shiftKey);sheetAfterAction();});
document.querySelector('[data-act="stop"]').addEventListener('click',()=>{selected().forEach(k=>k.orders=[]);syncUI();});
document.querySelectorAll('[data-form]').forEach(b=>b.addEventListener('click',e=>{applyForm(b.dataset.form,e.shiftKey||S.queue);sheetAfterAction();}));
document.getElementById('pauseBtn').addEventListener('click',togglePause);
document.getElementById('cdBtn').addEventListener('click',playerCountdown);
document.getElementById('readyBtn').addEventListener('click',playerReady);
document.getElementById('keysBtn').addEventListener('click',()=>toggleKeys(true));
document.getElementById('keysClose').addEventListener('click',()=>toggleKeys(false));
document.getElementById('newBtn').addEventListener('click',()=>{S.over=true;S.paused=true;document.getElementById('startOv').hidden=false;});
document.getElementById('repNext').addEventListener('click',nextRound);
const repOff=document.getElementById('repOff');repOff.checked=S.reportsOff;
repOff.addEventListener('change',()=>{S.reportsOff=repOff.checked;try{localStorage.setItem('pel-rep-off',S.reportsOff?'1':'0');}catch(e){}});
const DESC={mode:{dyn:'Geen rollen. Kinderen doen alleen wat je beveelt, plus ontwijken en tikken op korte afstand.',rol:'Geef kinderen een rol (of twee met een wisselvoorwaarde). Bevelen gaan altijd voor de rol.'},
  realism:{'0':'Jouw kinderen voeren alles perfect uit.','1':'Jouw kinderen hebben ook een niveau: trager kijken, uit formatie lopen, in lokaas trappen.'}};
document.querySelectorAll('[data-set]').forEach(b=>b.addEventListener('click',()=>{
  const key=b.dataset.set,v=b.dataset.v;
  document.querySelectorAll(`[data-set="${key}"]`).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  if(key==='mode'){S.set.mode=v;document.getElementById('modeD').textContent=DESC.mode[v];}
  if(key==='realism'){S.set.realism=v==='1';document.getElementById('realD').textContent=DESC.realism[v];}
  if(key==='start')S.set.start=v;
}));
document.getElementById('startBtn').addEventListener('click',()=>{
  document.getElementById('startOv').hidden=true;S.started=true;
  document.getElementById('rolBox').dataset.for='';
  newGame();
});
