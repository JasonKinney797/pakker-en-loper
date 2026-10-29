'use strict';
/* ---------- Unit Possession: zelf een kind besturen ---------- */
const MOVEKEY={w:'u',arrowup:'u',s:'d',arrowdown:'d',a:'l',arrowleft:'l',d:'r',arrowright:'r'};
const JOY_R=56;let joy=null;
S.pos=null;S.keys=new Set();S.camFollow=true;S.camZ=matchMedia('(pointer:coarse)').matches?2:1.6;
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p);}catch(_){}}
function canSwitch(){return online()?(S.setup&&!S.over):(S.paused||S.setup);}
function tryPossess(k){
  if(!S.started||S.over)return;
  if(!k||k.team!==0||k.status!=='active'){toast('Kies één kind van jouw ploeg dat nog meedoet.');return;}
  if(S.pos&&S.pos.id===k.id)return;
  if(!canSwitch()){toast(online()?'Online kan overnemen alleen tijdens het opstellen.':'Overnemen kan alleen in pauze of tijdens het opstellen.');return;}
  if(isGuest()){netSend({t:'possess',id:k.id});return;}
  if(S.pos){const o=S.byId.get(S.pos.id);if(o){o.ctrl='cpu';o.intent=null;}}
  k.ctrl='mens';k.orders=[];k.intent=null;k.look=null;S.pos={id:k.id,tagReq:false};S.keys.clear();joy=null;
  S.camZ=S.camZ||2;log(`Jij bestuurt nu <b>${k.name}</b>.`);syncUI();
}
function release(msg){
  if(!S.pos)return;const k=S.byId.get(S.pos.id);
  if(k){k.ctrl='cpu';k.intent=null;k.look=null;k.ai=k.ai||{};}
  S.pos=null;S.keys.clear();joy=null;
  SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;
  if(msg)log(msg);
  if(typeof syncUI==='function')syncUI();
}
function togglePossess(){
  if(S.pos&&isGuest()){netSend({t:'release'});return;}
  if(S.pos){const k=S.byId.get(S.pos.id);release(k?`Je laat <b>${k.name}</b> los.`:null);return;}
  const ks=selected();
  if(ks.length!==1){toast('Kies eerst precies één kind om over te nemen.');return;}
  tryPossess(ks[0]);
}
/* elke stap: jouw joystick of toetsen worden de richting van het kind */
/* joystick of toetsen, omgezet naar een richting op het veld (staand scherm: omhoog is naar C) */
function inputVec(){
  let sx=0,sy=0,mag=0;const jog=S.keys.has('jog');
  if(joy){sx=(joy.x-joy.ox)/JOY_R;sy=(joy.y-joy.oy)/JOY_R;mag=Math.min(1,hyp(sx,sy));}
  else{sx=(S.keys.has('r')?1:0)-(S.keys.has('l')?1:0);sy=(S.keys.has('d')?1:0)-(S.keys.has('u')?1:0);mag=(sx||sy)?1:0;}
  let dx=ROT?-sy:sx,dy=ROT?sx:sy;const l=hyp(dx,dy)||1;
  return {dx:dx/l,dy:dy/l,mag,jog};
}
function drive(k,v){
  if(!v||v.mag<.12){k.intent=null;return;}
  if(v.mag<.3){k.intent=null;k.look=Math.atan2(v.dy,v.dx);return;}   // zacht duwen: rondkijken
  k.look=null;
  k.intent={x:k.x+v.dx*3,y:k.y+v.dy*3,pace:(v.jog||v.mag<.6)?'jog':'sprint'};
}
function applyPossession(){
  if(!S.pos)return;const k=S.byId.get(S.pos.id);
  if(!k||k.status!=='active'){release(null);return;}
  if(isLoper(k))S.pos.tagReq=false;
  drive(k,inputVec());
}
function requestTag(){if(S.paused||S.over||!S.pos)return;if(isGuest())netSend({t:'tag'});else S.pos.tagReq=true;}
function updateCam(){
  if(!S.pos||!S.camFollow)return;const k=S.byId.get(S.pos.id);if(!k)return;
  const z=clamp(S.camZ||2,1,4),ns=FIT.SC*z;
  SC+= (ns-SC)*.15;
  const tox=VVW/2-k.x*SC,toy=VVH/2-k.y*SC;
  OX+=(tox-OX)*.2;OY+=(toy-OY)*.2;clampView();
}
document.getElementById('tikBtn').addEventListener('pointerdown',e=>{e.preventDefault();requestTag();});
document.getElementById('posBtn').addEventListener('click',togglePossess);
document.getElementById('mPos').addEventListener('click',togglePossess);
document.getElementById('camFollow').addEventListener('change',e=>{S.camFollow=e.target.checked;if(!S.camFollow){SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;}syncUI();});
document.getElementById('mCam').addEventListener('click',()=>{S.camFollow=!S.camFollow;if(!S.camFollow){SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;}syncUI();});
function syncPossess(){
  const on=!!S.pos,k=on?S.byId.get(S.pos.id):null;
  for(const id of ['posBtn','mPos']){const b=document.getElementById(id);b.setAttribute('aria-pressed',String(on));
    b.firstChild.textContent=on?'Loslaten ':(id==='posBtn'?'Overnemen ':'Overnemen');}
  document.getElementById('mCam').setAttribute('aria-pressed',String(!!S.camFollow));
  document.getElementById('camFollow').checked=!!S.camFollow;
  document.getElementById('tikBtn').hidden=!(on&&TOUCH&&k&&!isLoper(k)&&!S.paused&&!S.over&&!S.setup);
  document.getElementById('posHelp').textContent=on?`Jij bestuurt ${k?k.name:''}. Je ziet alleen wat dit kind ziet.`:
    (TOUCH?'Overnemen: kies één kind en druk op Overnemen, of dubbeltik op het kind. Alleen in pauze of tijdens het opstellen.':'Overnemen: kies één kind en druk op O, of dubbelklik op het kind. Alleen in pauze of tijdens het opstellen.');
  const grp=document.querySelectorAll('.mbar .mrow')[1];if(grp)grp.hidden=on&&!S.paused;
}
