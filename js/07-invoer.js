'use strict';
/* ---------- Invoer ---------- */
function pickKid(w,filter,tol){let b=null,bd=tol||.75;for(const k of S.kids){if(filter&&!filter(k))continue;const d=hyp(k.x-w.x,k.y-w.y);if(d<bd){bd=d;b=k;}}return b;}
const visibleEnemy=k=>k.team===1&&k.status==='active'&&S.vis0.has(k.id);
const ghostEnemy=k=>k.team===1&&k.status==='active'&&(S.vis0.has(k.id)||S.ghost.has(k.id));
function enemyAt(w,tol){
  let b=null,bd=tol||.8;
  for(const k of S.kids){if(!ghostEnemy(k))continue;const p=S.vis0.has(k.id)?k:S.ghost.get(k.id);const d=hyp(p.x-w.x,p.y-w.y);if(d<bd){bd=d;b=k;}}
  return b;
}
function selected(){return [...S.sel].map(id=>S.byId.get(id)).filter(k=>k&&(k.team===0||S.watch)&&k.status==='active');}
const mineSel=k=>(k.team===0||S.watch)&&k.status==='active';
function giveOrder(o,queue,ks){
  ks=ks||selected();if(!ks.length)return;
  queue=queue||S.queue;
  for(const k of ks){const oo=Object.assign({},o);if(queue)k.orders.push(oo);else{k.orders=[oo];k.ai.ph=null;}}
  syncUI();
}
function groupMove(w,queue,pace){
  const ks=selected();if(!ks.length)return;
  const n=ks.length;const cols=Math.ceil(Math.sqrt(n));
  ks.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>{
    const ox=n===1?0:((i%cols)-(cols-1)/2)*.8,oy=n===1?0:(Math.floor(i/cols)-(Math.ceil(n/cols)-1)/2)*.8;
    giveOrder({t:'move',x:clamp(w.x+ox,.3,36.5),y:clamp(w.y+oy,.3,24.7),pace},queue,[k]);
  });
}
function setCmd(c){S.cmd=c;const h=document.getElementById('cmdHint');
  const v=TOUCH?'Tik':'Klik';
  const t={move:`${v} waar ze naartoe moeten`,follow:`${v} op het kind dat gevolgd moet worden`,cover:`${v} op de tegenstander om te dekken`,
    inout:`${v} op de pakker voor in-uit`,attack:`${v} op het doel van de aanval`,conc:`${v} op het punt van de concentratie`}[c];
  h.hidden=!c;h.textContent=c?t+(TOUCH?' · Wis annuleert':' · Esc annuleert'):'';
  document.querySelectorAll('[data-cmd]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cmd===c)));
}
function execCmd(w,shift,tol){
  const c=S.cmd;if(!c)return false;shift=shift||S.queue;
  const e=enemyAt(w,tol&&tol+.05),own=pickKid(w,k=>k.team===0&&k.status==='active',tol);
  if(c==='move')groupMove(w,shift,S.pace);
  else if(c==='attack'){selected().forEach(k=>giveOrder({t:'attack',x:isLoper(k)?Math.max(w.x,k.x>w.x?35.8:w.x):w.x,y:w.y},shift,[k]));}
  else if(c==='follow'){const t=e||own;if(!t)return true;giveOrder({t:'follow',id:t.id,pace:S.pace},shift);}
  else if(c==='cover'){if(!e)return true;giveOrder({t:'cover',id:e.id},shift);}
  else if(c==='inout'){if(!e)return true;const d=+document.getElementById('ioDist').value||1.8;giveOrder({t:'inout',id:e.id,dist:clamp(d,1,4)},shift,selected().filter(isLoper));}
  else if(c==='conc'){const ks=selected().filter(isLoper);ks.forEach((k,i)=>{const a=i/ks.length*Math.PI*2,rr=ks.length>1?.9:0;
      giveOrder({t:'hold',x:clamp(w.x+Math.cos(a)*rr,.4,34),y:clamp(w.y+Math.sin(a)*rr,.4,24.6)},shift,[k]);});}
  if(!shift)setCmd(null);
  return true;
}
cv.addEventListener('contextmenu',e=>e.preventDefault());
/* ---- tactiekbord ---- */
S.draw=null;let drawing=null;
function setDraw(t){
  if(S.watch)return;
  S.draw=S.draw===t?null:t;if(S.draw&&S.cmd)setCmd(null);
  document.querySelectorAll('[data-draw]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.draw===S.draw)));
  const hnt=document.getElementById('cmdHint');
  const v=TOUCH?'Sleep':'Sleep met de muis';
  hnt.hidden=!S.draw;hnt.textContent=S.draw?{line:`${v} een lijn: de kinderen gaan erop staan`,arc:`${v} een boog, de bolle kant naar C`,arrow:`${v} een pijl: verzamelen bij het begin, aanvallen naar de punt`}[S.draw]+(TOUCH?' · Wis annuleert':' · Esc annuleert'):'';
}
function drawKids(){
  let ks=selected();
  if(!ks.length)ks=S.kids.filter(k=>k.team===0&&k.status==='active'&&k.ctrl!=='mens');
  return ks.filter(k=>k.ctrl!=='mens');
}
function arcPts(a,b,n){
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,L=hyp(dx,dy)||1;
  let nx=-dy/L,ny=dx/L;if(nx<0||(Math.abs(nx)<1e-3&&my>12.5&&ny>0)||(Math.abs(nx)<1e-3&&my<=12.5&&ny<0)){nx=-nx;ny=-ny;}
  const s=L*.3,out=[];
  for(let i=0;i<n;i++){const t=n===1?.5:i/(n-1);const bx=a.x+dx*t,by=a.y+dy*t,bump=4*s*t*(1-t);out.push({x:bx+nx*bump,y:by+ny*bump});}
  return out;
}
function drawSlots(d,n){
  if(d.tool==='arc')return arcPts(d.a,d.b,n);
  const out=[];for(let i=0;i<n;i++){const t=n===1?.5:i/(n-1);out.push({x:d.a.x+(d.b.x-d.a.x)*t,y:d.a.y+(d.b.y-d.a.y)*t});}
  return out;
}
function applyDraw(d){
  const ks=drawKids();if(!ks.length){toast('Geen kinderen om te plaatsen.');return;}
  const q=S.queue;
  const cl=p=>({x:clamp(p.x,.4,isLoper(ks[0])?36:34.6),y:clamp(p.y,.4,24.6)});
  if(hyp(d.b.x-d.a.x,d.b.y-d.a.y)<1){toast('Sleep een langere lijn.');return;}
  if(d.tool==='arrow'){
    ks.forEach((k,i)=>{const a=i/ks.length*Math.PI*2,r=ks.length>1?Math.min(1.6,.35*Math.sqrt(ks.length)):0;
      const g=cl({x:d.a.x+Math.cos(a)*r,y:d.a.y+Math.sin(a)*r});
      giveOrder({t:'move',x:g.x,y:g.y,pace:'jog'},q,[k]);
      const end=isLoper(k)?{x:Math.max(d.b.x,35.8),y:d.b.y}:{x:d.b.x,y:d.b.y};
      giveOrder({t:'attack',x:end.x,y:clamp(end.y+(Math.sin(a)*r),.4,24.6)},true,[k]);});
    toast(`Pijl: ${ks.length} ${ks.length===1?'kind verzamelt':'kinderen verzamelen'} en vallen aan.`);
  }else{
    const sl=drawSlots(d,ks.length).map(cl);
    // elk kind naar het dichtstbijzijnde vrije punt, in volgorde langs de lijn
    const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y;
    const proj=k=>(k.x-d.a.x)*dx+(k.y-d.a.y)*dy;
    ks.slice().sort((a,b)=>proj(a)-proj(b)).forEach((k,i)=>giveOrder({t:'hold',x:sl[i].x,y:sl[i].y},q,[k]));
    toast(`${d.tool==='arc'?'Boog':'Lijn'}: ${ks.length} ${ks.length===1?'kind':'kinderen'} op hun plek.`);
  }
  if(!q)setDraw(null);
}
document.querySelectorAll('[data-draw]').forEach(b=>b.addEventListener('click',()=>{setDraw(b.dataset.draw);if(S.draw)sheetAfterAction();}));
/* rechtsklik (muis) en tik op de grond of een tegenstander (aanraken) */
function orderAt(w,shift,tol,ownFollow){
  const en=enemyAt(w,tol&&tol+.05),own=ownFollow?pickKid(w,k=>k.team===0&&k.status==='active'&&!S.sel.has(k.id),tol):null;
  const ks=selected();if(!ks.length)return;
  if(en){
    const pk=ks.filter(k=>!isLoper(k)),lp=ks.filter(isLoper);
    if(pk.length)giveOrder({t:'follow',id:en.id,pace:'sprint'},shift,pk);
    if(lp.length){const d=+document.getElementById('ioDist').value||1.8;giveOrder({t:'inout',id:en.id,dist:clamp(d,1,4)},shift,lp);}
  }else if(own)giveOrder({t:'follow',id:own.id,pace:S.pace},shift);
  else groupMove(w,shift,S.pace);
}
function boxSelect(d,add){
  if(!add)S.sel.clear();
  const a=toW(d.sx,d.sy),b=toW(d.cx,d.cy);
  const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);
  for(const k of S.kids)if(mineSel(k)&&k.x>=x0&&k.x<=x1&&k.y>=y0&&k.y<=y1)S.sel.add(k.id);
  syncUI();
}
const touchTol=()=>Math.max(.75,24/SC);
function tapAt(px,py){
  if(!S.started)return;
  const w=toW(px,py),tol=touchTol();
  if(S.cmd){execCmd(w,S.queue,tol);return;}
  const own=pickKid(w,mineSel,tol);
  if(S.watch){S.sel=own?new Set([own.id]):new Set();syncUI();return;}
  if(own){
    const now=performance.now();
    if(lastTap&&lastTap.id===own.id&&now-lastTap.t<380){lastTap=null;S.sel=new Set([own.id]);tryPossess(own);return;}
    lastTap={id:own.id,t:now};
    if(S.sel.has(own.id))S.sel.delete(own.id);else S.sel.add(own.id);syncUI();return;}
  orderAt(w,S.queue,tol,false);
}
let lastTap=null;
cv.addEventListener('dblclick',e=>{const q=local(e);const k=pickKid(toW(q.x,q.y),k=>k.team===0&&k.status==='active');if(k){S.sel=new Set([k.id]);tryPossess(k);}});
const local=e=>{const rc=cv.getBoundingClientRect();return {x:e.clientX-rc.left,y:e.clientY-rc.top};};
const ptrs=new Map();let ts=null,lpTimer=null;
cv.addEventListener('pointerdown',e=>{
  const q=local(e);
  if(e.pointerType==='mouse'){
    const w=toW(q.x,q.y);
    if(S.over&&!S.paused&&!S.started)return;
    if(e.button===2){if(S.watch)return;if(S.cmd)setCmd(null);orderAt(w,e.shiftKey,null,true);return;}
    if(e.button!==0)return;
    if(S.draw){drawing={tool:S.draw,a:w,b:w};return;}
    if(S.cmd){execCmd(w,e.shiftKey);return;}
    drag={sx:q.x,sy:q.y,cx:q.x,cy:q.y,box:false,shift:e.shiftKey};
    return;
  }
  e.preventDefault();
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(S.pos&&!S.paused&&!S.over&&!joy&&q.x<VW*.5){joy={id:e.pointerId,ox:q.x,oy:q.y,x:q.x,y:q.y};return;}
  ptrs.set(e.pointerId,q);clearTimeout(lpTimer);
  if(S.draw&&ptrs.size===1&&S.started){const w=toW(q.x,q.y);drawing={tool:S.draw,a:w,b:w};ts={mode:'draw',id:e.pointerId};return;}
  if(ptrs.size>=2){drawing=null;
    const [p1,p2]=[...ptrs.values()];drag=null;
    ts={mode:'pinch',d:hyp(p1.x-p2.x,p1.y-p2.y)||1,mx:(p1.x+p2.x)/2,my:(p1.y+p2.y)/2};
    return;
  }
  ts={mode:'tap',sx:q.x,sy:q.y,lx:q.x,ly:q.y,id:e.pointerId};
  lpTimer=setTimeout(()=>{if(ts&&ts.mode==='tap'&&S.started){ts.mode='box';drag={sx:ts.sx,sy:ts.sy,cx:ts.lx,cy:ts.ly,box:true};try{navigator.vibrate&&navigator.vibrate(12);}catch(_){}}},380);
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse')return;
  if(joy&&e.pointerId===joy.id){const q=local(e);joy.x=q.x;joy.y=q.y;return;}
  if(!ptrs.has(e.pointerId))return;
  const q=local(e);ptrs.set(e.pointerId,q);
  if(!ts)return;
  if(ts.mode==='pinch'&&ptrs.size>=2){
    const [p1,p2]=[...ptrs.values()];const d=hyp(p1.x-p2.x,p1.y-p2.y)||1,mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
    panBy(mx-ts.mx,my-ts.my);zoomAt(mx,my,d/ts.d);S.camZ=SC/FIT.SC;ts.d=d;ts.mx=mx;ts.my=my;return;
  }
  if(e.pointerId!==ts.id)return;
  if(ts.mode==='draw'){if(drawing)drawing.b=toW(q.x,q.y);return;}
  if(ts.mode==='tap'&&hyp(q.x-ts.sx,q.y-ts.sy)>10){clearTimeout(lpTimer);ts.mode='pan';if(S.pos&&S.camFollow&&SC>FIT.SC*1.01){S.camFollow=false;syncUI();}}
  if(ts.mode==='pan')panBy(q.x-ts.lx,q.y-ts.ly);
  if(ts.mode==='box'&&drag){drag.cx=q.x;drag.cy=q.y;}
  ts.lx=q.x;ts.ly=q.y;
});
function touchEnd(e){
  if(joy&&e.pointerId===joy.id){joy=null;return;}
  if(e.pointerType==='mouse'||!ptrs.has(e.pointerId))return;
  ptrs.delete(e.pointerId);clearTimeout(lpTimer);
  if(!ts)return;
  if(ts.mode==='pinch'){
    if(ptrs.size===1){const [id,p]=[...ptrs.entries()][0];ts={mode:'pan',id,sx:p.x,sy:p.y,lx:p.x,ly:p.y};}
    else if(!ptrs.size)ts=null;
    return;
  }
  if(e.pointerId!==ts.id)return;
  if(ts.mode==='draw'){const d=drawing;drawing=null;ts=null;if(d&&e.type==='pointerup')applyDraw(d);return;}
  if(e.type==='pointerup'){
    if(ts.mode==='tap')tapAt(ts.sx,ts.sy);
    else if(ts.mode==='box'&&drag)boxSelect(drag,false);
  }
  drag=null;ts=null;
}
cv.addEventListener('pointerup',touchEnd);
cv.addEventListener('pointercancel',touchEnd);
cv.addEventListener('wheel',e=>{e.preventDefault();const q=local(e);zoomAt(q.x,q.y,Math.exp(-e.deltaY*.0015));S.camZ=SC/FIT.SC;},{passive:false});
window.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse')return;
  const q=local(e);
  mouseW=toW(q.x,q.y);
  if(drawing)drawing.b=mouseW;
  hover=pickKid(mouseW,k=>S.watch||k.team===0||k.status!=='active'||S.vis0.has(k.id));
  if(drag){drag.cx=q.x;drag.cy=q.y;if(Math.abs(q.x-drag.sx)+Math.abs(q.y-drag.sy)>6)drag.box=true;}
});
window.addEventListener('pointerup',e=>{
  if(e.pointerType==='mouse'&&drawing&&e.button===0){const d=drawing;drawing=null;applyDraw(d);return;}
  if(e.pointerType!=='mouse'||!drag||e.button!==0)return;
  const d=drag;drag=null;
  if(d.box)boxSelect(d,d.shift);
  else{
    if(!d.shift)S.sel.clear();
    const k=pickKid(toW(d.sx,d.sy),mineSel);
    if(k){if(d.shift&&S.sel.has(k.id))S.sel.delete(k.id);else S.sel.add(k.id);}
    syncUI();
  }
});
window.addEventListener('keydown',e=>{
  if(e.target.matches('input,select'))return;
  const ovOpen=[...document.querySelectorAll('.ov')].some(o=>!o.hidden);
  if(ovOpen){if(e.key==='Escape'&&!document.getElementById('keysOv').hidden)toggleKeys(false);
    if(e.key==='Escape'&&!document.getElementById('statsOv').hidden)closeStats();
    if(e.key==='Enter'&&!document.getElementById('repOv').hidden)nextRound();return;}
  const k=e.key.toLowerCase();
  if(S.watch&&!e.ctrlKey&&!e.metaKey){   // kijkmodus: alleen pauze, snelheid, statistieken en toetsen
    if(k===' '){togglePause();e.preventDefault();}
    else if(k==='-')setSpeed(S.speed===4?2:S.speed===2?1:.5);
    else if(k==='='||k==='+')setSpeed(S.speed===.5?1:S.speed===1?2:4);
    else if(k==='k')toggleKeys(true);
    else if(k==='escape'){S.sel.clear();syncUI();}
    return;}
  if(k==='o'&&!e.ctrlKey&&!e.metaKey){togglePossess();e.preventDefault();return;}
  if(S.pos&&!e.ctrlKey&&!e.metaKey){
    const mk=MOVEKEY[k];
    if(mk){S.keys.add(mk);e.preventDefault();return;}
    if(k==='shift'){S.keys.add('jog');return;}
    if(k===' '){requestTag();e.preventDefault();return;}
    if(k==='p'||k==='escape'){togglePause();e.preventDefault();return;}
  }
  if(e.ctrlKey||e.metaKey){
    if(/^[1-5]$/.test(k)){S.groups[k]=[...S.sel];toast(`Groep ${k} bewaard (${S.sel.size}).`);e.preventDefault();}
    else if(k==='a'){S.sel=new Set(S.kids.filter(x=>x.team===0&&x.status==='active').map(x=>x.id));syncUI();e.preventDefault();}
    return;
  }
  if(k===' '){togglePause();e.preventDefault();return;}
  if(k==='enter'){playerReady();e.preventDefault();return;}
  if(/^[1-5]$/.test(k)){const g=S.groups[k];if(g){S.sel=new Set(g.filter(id=>{const x=S.byId.get(id);return x&&x.status==='active';}));syncUI();}return;}
  const map={q:'walk',w:'jog',e:'sprint'};if(map[k]){setPace(map[k]);return;}
  const cm={g:'move',f:'follow',d:'cover',i:'inout',a:'attack'};if(cm[k]){setDraw(null);setCmd(cm[k]);return;}
  const dm={l:'line',j:'arc',u:'arrow'};if(dm[k]){setDraw(dm[k]);return;}
  if(k==='h'){holdSel(e.shiftKey);return;}
  if(k==='s'){selected().forEach(x=>{x.orders=[];});syncUI();return;}
  if(k==='t'){playerCountdown();return;}
  if(k==='k'){toggleKeys(true);return;}
  if(k==='escape'){if(S.draw)setDraw(null);else if(S.cmd)setCmd(null);else{S.sel.clear();syncUI();}return;}
  if(k==='-'){if(!online())setSpeed(S.speed===2?1:.5);return;}
  if(k==='='||k==='+'){setSpeed(S.speed===.5?1:2);return;}
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();const mk=MOVEKEY[k];if(mk)S.keys.delete(mk);if(k==='shift')S.keys.delete('jog');});
window.addEventListener('blur',()=>{S.keys.clear();joy=null;});
function holdSel(shift){selected().forEach(k=>giveOrder({t:'hold',x:k.x,y:k.y},shift,[k]));}
function setPace(p){S.pace=p;document.querySelectorAll('[data-pace]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pace===p)));}
function setSpeed(s){if(online())s=1;S.speed=s;document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.speed===s)));}
function togglePause(){if(S.over)return;if(online()){toast('Online is er geen pauze.');return;}S.paused=!S.paused;syncUI();}
function playerCountdown(){
  if(S.over||S.setup||S.cd||S.role[0]!=='pakkers')return;
  if(isGuest()){const by=selected().find(k=>!isLoper(k))||S.kids.find(k=>k.team===0&&k.status==='active');netSend({t:'cd',by:by?by.id:null});return;}
  const by=selected().find(k=>!isLoper(k))||S.kids.find(k=>k.team===0&&k.status==='active');
  if(by)startCountdown(by);syncUI();
}

/* ---------- Formaties ---------- */
function applyForm(f,shift){
  const ks=selected();if(!ks.length){toast('Selecteer eerst kinderen.');return;}
  const pk=ks.filter(k=>!isLoper(k)),lp=ks.filter(isLoper);
  const hold=(k,s)=>giveOrder({t:'hold',x:s.x,y:s.y},shift,[k]);
  if(f==='muur'){const s=wallSlots(pk.length,.8,24.2,myWallX());pk.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>hold(k,s[i]));}
  else if(f==='boogBoven'||f==='boogOnder'){
    const corner=f==='boogOnder'?'onder':'boven',cy=corner==='onder'?25:0;
    if(pk.length<3){toast('Een boog vraagt minstens 3 pakkers.');return;}
    const nA=Math.min(4,Math.max(2,Math.round(pk.length*.4)));
    const byC=pk.slice().sort((a,b)=>Math.abs(a.y-cy)-Math.abs(b.y-cy));
    const arc=byC.slice(0,nA),wall=byC.slice(nA);
    const as=arcSlots(nA,corner,myShift()).sort((a,b)=>a.y-b.y);arc.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>hold(k,as[i]));
    const WX=myWallX(),ws=corner==='onder'?wallSlots(wall.length,.8,19.4,WX):wallSlots(wall.length,5.6,24.2,WX);
    wall.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>hold(k,ws[i]));
  }
  else if(f==='vangnet'){
    if(pk.length<2){toast('Muur + vangnet vraagt minstens 2 pakkers.');return;}
    const v=pk.slice().sort((a,b)=>Math.abs(a.y-12.5)-Math.abs(b.y-12.5))[0];
    giveOrder({t:'net'},shift,[v]);
    const rest=pk.filter(k=>k!==v),s=wallSlots(rest.length,.8,24.2,myWallX());rest.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>hold(k,s[i]));
  }
  else if(f==='bewaak'){
    if(pk.length>2)toast('Hoogstens 2 bewakers: alleen de eerste twee gaan.');
    pk.slice(0,2).forEach((k,i)=>{giveOrder({t:'guard',i},shift,[k]);k.ai.gp=null;});
  }
  else if(f==='conc'){if(!lp.length)return;setCmd('conc');}
  else if(f==='spread'){const s=wallSlots(lp.length,1.2,23.8,23);lp.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>hold(k,s[i]));}
  else if(f==='charge'){lp.forEach(k=>giveOrder({t:'attack',x:35.8,y:k.y},shift,[k]));}
  else if(f==='home'){lp.forEach(k=>giveOrder({t:'move',x:.7+rand()*3.6,y:10.7+rand()*3.6,pace:S.pace},shift,[k]));}
}

/* ---------- Rollen ---------- */
function fillRoleSelects(){
  const opts=S.role[0]==='pakkers'?ROLES_P:ROLES_L;
  for(const id of ['r1','r2']){const s=document.getElementById(id);s.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');}
  document.getElementById('r2').options[0].textContent='geen tweede rol';
}
document.getElementById('rolApply').addEventListener('click',()=>{
  const ks=selected();if(!ks.length){toast('Selecteer eerst kinderen.');return;}
  const r1=document.getElementById('r1').value,r2=document.getElementById('r2').value,rc=document.getElementById('rc').value,rv=+document.getElementById('rv').value||0;
  const nb=S.kids.filter(k=>k.team===0&&!ks.includes(k)&&activeRole(k)==='bewaker').length;
  let bw=0;
  for(const k of ks){
    if(r1==='bewaker'){if(nb+bw>=2){toast('Hoogstens 2 bewakers.');continue;}bw++;}
    k.role=r1;k.role2=r2===r1?'':r2;k.cond=rc;k.condVal=rv;k.switched=false;
    k.post={x:k.x,y:k.y};if(inB(k.x,k.y))k.post={x:24,y:clamp(k.y,1,24)};
    k.ai={since:S.time,side:rand()<.5?-1:1,ph:'out',phT:S.time};k.orders=[];
  }
  log(`Rollen gegeven aan ${ks.length} ${ks.length===1?'kind':'kinderen'}.`);syncUI();
});
document.getElementById('boogHoek').addEventListener('change',e=>{S.boogHoek=e.target.value;});
