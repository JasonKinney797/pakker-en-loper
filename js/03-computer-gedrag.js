'use strict';
/* ---------- Waarneming ---------- */
function canSee(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=hyp(dx,dy);
  if(d<2)return true;
  if(!(a.scanUntil>S.time)&&Math.abs(angDiff(Math.atan2(dy,dx),a.face))>80*Math.PI/180)return false;
  for(const c of S.kids){
    if(c===a||c===b||c.status!=='active')continue;
    const t=((c.x-a.x)*dx+(c.y-a.y)*dy)/(d*d);
    if(t<=0||t>=1)continue;
    const qx=a.x+dx*t-c.x,qy=a.y+dy*t-c.y;
    if(qx*qx+qy*qy<.28*.28)return false;
  }
  return true;
}
function perceive(){
  S.vis0.clear();
  const act=active();
  for(const a of act){
    if(a.ctrl!=='mens'&&S.time>=a.nextScan){const L=lv(a);a.scanUntil=S.time+.35;a.nextScan=S.time+L.scan*(.85+rand()*.3);}
    for(const b of act){
      if(b.team===a.team)continue;
      if(!canSee(a,b))continue;
      const m=a.mem.get(b.id);
      const cont=m&&S.time-m.t<.5;
      const first=cont?m.first:S.time, fd=cont?m.fd:hyp(b.x-a.x,b.y-a.y);
      a.mem.set(b.id,{x:b.x,y:b.y,vx:b.vx,vy:b.vy,t:S.time,first,fd});
      if(a.team===0&&(!S.pos||a.id===S.pos.id)){S.vis0.add(b.id);S.ghost.set(b.id,{x:b.x,y:b.y,t:S.time});}
    }
  }
}
function known(k,ready){
  const out=[];
  for(const [id,m] of k.mem){
    const o=S.byId.get(id);if(!o||o.status!=='active')continue;
    if(S.time-m.first<k.react&&!(ready&&m.fd>4))continue;   // klaar-houding: wie van ver komt, verrast niet
    const age=S.time-m.t;if(age>1.5)continue;
    const f=Math.min(age,.5);
    out.push({o,x:m.x+m.vx*f,y:m.y+m.vy*f,vx:m.vx,vy:m.vy,age});
  }
  return out;
}
function teamKnown(team){
  const best=new Map();
  for(const k of S.kids){if(k.team!==team||k.status!=='active')continue;
    for(const e of known(k)){const b=best.get(e.o.id);if(!b||e.age<b.age)best.set(e.o.id,e);}}
  return [...best.values()];
}
function nearest(p,list,f){let b=null,bd=1e9;for(const e of list){if(f&&!f(e))continue;const d=hyp(e.x-p.x,e.y-p.y);if(d<bd){bd=d;b=e;}}return b?{e:b,d:bd}:null;}
const safe=k=>!S.cdDone&&inB(k.x,k.y);
function go(k,x,y,pace){k.intent={x,y,pace:pace||'sprint'};}

/* ---------- Gedrag ---------- */
function evade(k,dangerDist){
  if(safe(k))return false;
  const n=nearest(k,known(k));
  if(!n||n.d>dangerDist)return false;
  if(!S.cdDone&&distToB(k.x,k.y)<4){go(k,2.5,12.5,'sprint');return true;}
  let ax=k.x-n.e.x,ay=k.y-n.e.y;const L=hyp(ax,ay)||1;ax/=L;ay/=L;
  ax+=.35;
  if(k.y<1.5)ay+=.9;if(k.y>23.5)ay-=.9;if(k.x<1.2)ax+=.9;if(k.x>33.5)ax-=.4;
  const L2=hyp(ax,ay)||1;go(k,k.x+ax/L2*3,k.y+ay/L2*3,'sprint');return true;
}
function instinct(k){
  if(isLoper(k)){evade(k,3);return;}
  const n=nearest(k,known(k).filter(e=>!safe(e.o)));
  if(n&&n.d<2)go(k,n.e.x,n.e.y,'sprint');
}
function gaps(k){
  const ps=known(k).filter(e=>e.x>26.5).sort((a,b)=>a.y-b.y);
  const deep=ps.filter(e=>e.x>33.3);
  const g=[];let py=0,pr=0;
  const push=(y,w)=>{if(w<=0)return;if(deep.some(d=>Math.abs(d.y-y)<1.6))w-=1.2;if(w>0)g.push({y,w});};
  for(const p of ps){const w=(p.y-py)-pr-.9;push(py+pr+w/2,w);py=p.y;pr=.9;}
  const w=(25-py)-pr;push(py+pr+w/2,w);
  return g;
}
function chargeTo(k,wx,gy){k.ai.role='charge';k.ai.wx=wx;k.ai.tx=35.8;k.ai.ty=gy;}

function waitB(k){
  const s=k.ai.spot||{x:2.5,y:12.5};
  if(S.cdDone){k.ai.role='charge';k.ai.tx=35.8;k.ai.ty=clamp(k.y+(rand()-.5)*8,1,24);return charge(k);}
  go(k,s.x,s.y,'walk');k.look=0;
}
function stage(k){
  if(evade(k,lv(k).danger))return;
  go(k,k.ai.tx,k.ai.ty,'jog');k.look=0;
}
function charge(k){
  const L=lv(k);
  if(k.ai.wx!=null&&k.x<k.ai.wx-.3){go(k,k.ai.wx,k.ai.ty,'sprint');}
  else go(k,k.ai.tx,k.ai.ty,'sprint');
  const ks=known(k);
  let thr=null,td=2.4;
  for(const e of ks){const dx=e.x-k.x;if(dx<-.3)continue;const d=hyp(dx,e.y-k.y);if(d<td){td=d;thr=e;}}
  if(thr&&k.x<34){
    let side=k.y<thr.y?-1:1;
    if(L.best>=.55){const g=gaps(k).filter(g=>g.w>=L.gap).sort((a,b)=>Math.abs(a.y-k.y)-Math.abs(b.y-k.y))[0];if(g)side=g.y<k.y?-1:1;}
    if(k.y<1.5)side=1;if(k.y>23.5)side=-1;
    go(k,k.x+1.6,clamp(k.y+side*2.6,.6,24.4),'sprint');
  }
}
function decoy(k){
  const L=lv(k),ks=known(k);
  const tgt=ks.find(e=>e.o.id===k.ai.target);
  const thr=nearest(k,ks,e=>e.o.id!==k.ai.target);
  if(thr&&thr.d<L.danger*.8){
    let ax=k.x-thr.e.x,ay=k.y-thr.e.y;const l=hyp(ax,ay)||1;
    go(k,clamp(k.x+ax/l*3,.5,33),clamp(k.y+ay/l*3,.6,24.4),'sprint');return;
  }
  if(L.best>=.8||k.role2==='sneaker'){
    const g=gaps(k).filter(g=>g.w>=L.gap&&Math.abs(g.y-k.y)<4)[0];
    if(g&&isAI(k.team)){chargeTo(k,31.2,g.y);return charge(k);}
  }
  let px,py;
  if(tgt){px=tgt.x;py=tgt.y;}
  else if(k.ai.tp){px=k.ai.tp.x;py=k.ai.tp.y;}
  else{
    const n=nearest(k,ks.filter(e=>e.x>20));
    if(n){k.ai.target=n.e.o.id;px=n.e.x;py=n.e.y;}
    else{go(k,24,k.y,'jog');k.look=0;return;}
  }
  const dist=k.ai.ioDist||(.95+L.margin);
  const inX=px-dist,outX=px-3.8,side=k.ai.side||1;
  if(tgt&&hyp(px-k.x,py-k.y)<1.5&&k.ai.ph==='in'){k.ai.ph='out';k.ai.phT=S.time;}
  if(k.ai.ph==='in'){
    const ty=py+side*.5;go(k,inX,ty,'sprint');
    if(hyp(inX-k.x,ty-k.y)<.35||S.time-k.ai.phT>1.6){k.ai.ph='out';k.ai.phT=S.time;}
  }else{
    const ty=py+side*1.3;go(k,outX,ty,'jog');
    if(S.time-(k.ai.phT||0)>1.1&&hyp(outX-k.x,ty-k.y)<1){k.ai.ph='in';k.ai.phT=S.time;k.ai.side=rand()<.5?-1:1;}
  }
  k.look=0;
}
function sneak(k){
  const L=lv(k);
  if(evade(k,L.danger))return;
  const post=k.ai.post||k.post||{x:24,y:clamp(k.y,1,24)};
  const g=gaps(k);
  const ok=g.filter(e=>e.w>=L.gap).sort((a,b)=>Math.abs(a.y-k.y)-Math.abs(b.y-k.y))[0];
  if(ok&&Math.abs(ok.y-k.y)<9&&k.x>18){chargeTo(k,31.2,ok.y);return charge(k);}
  if(S.time-(k.ai.since||0)>L.wait&&g.length&&k.x>18){const b=g.slice().sort((a,b)=>b.w-a.w)[0];chargeTo(k,31.2,b.y);return charge(k);}
  go(k,post.x,post.y,'jog');k.look=0;
}

function callHelp(k){
  const c={team:k.team,x:k.x,y:k.y,t:S.time,name:k.name};
  S.calls.push(c);S.pings.push({x:k.x,y:k.y,t:S.time,team:k.team});if(k.team===0)SFX.help();
  for(const h of S.kids){
    if(h.team!==k.team||h.status!=='active')continue;
    const isJ=isAI(h.team)?h.ai.role==='jager':(activeRole(h)==='jager');
    if(!isJ)continue;
    const L=lv(h);if(rand()>L.resp)continue;
    const delay=(1-L.resp)*2;
    h.ai.call={x:c.x,y:c.y,t:S.time+delay,until:S.time+delay+6};
  }
  if(k.team===0)toast(`${k.name} roept om hulp bij ${zoneOf(k.y)}.`);
}
function hunter(k){
  const L=lv(k);const ks=known(k).filter(e=>!safe(e.o));
  const c=k.ai.call;
  if(c&&S.time>=c.t&&S.time<c.until){
    const n=nearest(c,ks);
    if(n&&n.d<6){k.ai.tgt=n.e.o.id;}
    else{go(k,clamp(c.x-2,1,33),c.y,'sprint');return;}
  }
  let t=ks.find(e=>e.o.id===k.ai.tgt);
  if(!t||S.time-(k.ai.tgtT||0)>1.5){
    k.ai.tgtT=S.time;
    if(ks.length){
      if(rand()<L.best){let bs=1e9;for(const e of ks){const s=hyp(e.x-k.x,e.y-k.y)-(e.x>26?4:0)-(hyp(e.vx,e.vy)<1.5?1:0);if(s<bs){bs=s;t=e;}}}
      else t=nearest(k,ks).e;
      k.ai.tgt=t.o.id;
    }else t=null;
  }
  if(t){const d=hyp(t.x-k.x,t.y-k.y),f=Math.min(.6,d/k.top);go(k,t.x+t.vx*f,t.y+t.vy*f,(k.tired&&d>3)?'jog':'sprint');return;}
  const hs=k.ai.hspot||{x:9.5,y:12.5};if(!S.cdDone)go(k,hs.x,hs.y,'jog');else go(k,15,hs.y,'jog');
  k.look=Math.PI;
}
const STEP={slim:1.8,boven:1.8,gem:2.0,onder:2.4,dom:3.0,perfect:1.8};   // 2 à 3 stapjes, dom loopt te ver mee
function lvKey(k){return (k.team===0&&!S.set.realism)?'perfect':k.level;}
function wallHold(k,slot){
  const L=lv(k);const ks=known(k,true).filter(e=>!safe(e.o));
  const n=nearest(k,ks);
  if(k.ai.chase&&S.time<k.ai.chaseUntil){const t=ks.find(e=>e.o.id===k.ai.chase);if(t){go(k,t.x+t.vx*.3,t.y+t.vy*.3,'sprint');return;}}
  k.ai.chase=null;
  if(n&&n.d<6&&L.brk>0&&rand()<L.brk*.1/10){k.ai.chase=n.e.o.id;k.ai.chaseUntil=S.time+3+rand()*2;}
  let lure=null,ld=1e9;
  for(const e of ks){if(e.x<k.x+.3&&k.x-e.x<4.5&&Math.abs(e.y-k.y)<3.2){const d=hyp(e.x-k.x,e.y-k.y);if(d<ld){ld=d;lure=e;}}}
  if(lure){
    if(k.lureT===null||k.lureId!==lure.o.id){k.lureT=S.time;k.lureId=lure.o.id;k.lured=rand()<L.lure*((S.plans[k.team]&&S.plans[k.team].disc)||1);k.called=false;}
    k.lureSeen=S.time;
    if(!k.called&&S.time-k.lureT>=L.helpAt*((S.plans[k.team]&&S.plans[k.team].disc)||1)){k.called=true;if(rand()<L.helpP)callHelp(k);}
  }else if(k.lureT!==null&&S.time-k.lureSeen>1){k.lureT=null;k.lureId=null;k.lured=false;}
  // klaar-houding: stapjes naar een loper die het eigen gebied binnenkomt, en meteen terug
  const step=STEP[lvKey(k)];
  let best=null,bd=1e9;
  for(const e of ks){const fx=e.x+e.vx*.3,fy=e.y+e.vy*.3,ds=hyp(fx-slot.x,fy-slot.y);if(ds<=step+k.reach&&ds<bd){bd=ds;best={x:fx,y:fy};}}
  const justTried=k.tagCD-S.time>.3;
  if(best&&!justTried){const dx=best.x-slot.x,dy=best.y-slot.y,l=hyp(dx,dy)||1,m=Math.min(l,step);
    k.intent={x:slot.x+dx/l*m,y:slot.y+dy/l*m,pace:'sprint',quick:true};return;}
  if(lure&&k.lured){go(k,slot.x-.4,clamp(lure.y,slot.y-L.leash,slot.y+L.leash),'sprint');return;}
  const ds=hyp(k.x-slot.x,k.y-slot.y);
  k.intent={x:slot.x,y:slot.y,pace:ds>.4?'sprint':'jog',quick:ds<step+.5};k.look=Math.PI;
}
function net(k){
  const ks=known(k).filter(e=>!safe(e.o));const n=nearest(k,ks);
  if(n&&n.d<k.reach+1.2){go(k,n.e.x,n.e.y,'sprint');return;}
  let far=null;for(const e of ks)if(e.x>22&&(!far||e.x>far.x))far=e;
  go(k,34.2,far?clamp(far.y,1,24):12.5,far?'sprint':'jog');k.look=Math.PI;
}
const GSPOT=[{x:6.2,y:9.3},{x:6.2,y:15.7}];
function lopersInB(){const t=lt();return S.kids.filter(o=>o.team===t&&o.status==='active'&&inB(o.x,o.y));}
function bEdge(t){
  if(t.x>B.x1-.5)return {x:B.x1+.5,y:clamp(t.y,B.y0,B.y1)};
  return t.y<12.5?{x:clamp(t.x,.4,B.x1),y:B.y0-.5}:{x:clamp(t.x,.4,B.x1),y:B.y1+.5};
}
function guardPick(k,ks,skip){
  const key=lvKey(k),c=ks.filter(e=>e.o.id!==skip&&!safe(e.o));if(!c.length)return null;
  const near=()=>nearest(k,c).e;
  const bestCatch=()=>{let b=null,bs=1e9;for(const e of c){const s=hyp(e.x-k.x,e.y-k.y)/Math.max(.4,k.top-e.o.top*.85);if(s<bs){bs=s;b=e;}}return b;};
  const slowest=()=>c.slice().sort((a,b)=>a.o.top-b.o.top)[0];
  if(key==='slim'||key==='perfect')return bestCatch();
  if(key==='boven')return rand()<.8?bestCatch():near();
  if(key==='gem')return rand()<.55?bestCatch():near();
  if(key==='onder')return rand()<.8?slowest():near();
  return near();
}
const GBACK={slim:2,perfect:2,boven:3};   // vanaf zoveel lopers terug in B gaat hij opnieuw wachten
function guard(k,spot){
  const key=lvKey(k),g=k.ai,ks=known(k,true),free=ks.filter(e=>!safe(e.o));
  const total=S.kids.filter(o=>o.team===lt()&&o.status==='active').length,nInB=lopersInB().length;
  const home=()=>{g.gp='wacht';g.tgt=null;g.inBSince=null;go(k,spot.x,spot.y,'jog');k.look=Math.atan2(12.5-k.y,2.5-k.x);};
  if(!g.gp)g.gp='wacht';
  if(S.cdDone)g.gp='jaag';
  if(g.gp==='wacht'){
    const n=nearest(k,free);
    if(n&&n.d<k.reach+.4){k.intent={x:n.e.x,y:n.e.y,pace:'sprint',quick:true};return;}   // binnen armbereik: altijd tikken
    if(nInB===0&&S.rt>0){g.gp='jaag';g.tgt=null;}
    else return home();
  }
  let t=g.tgt!=null?ks.find(e=>e.o.id===g.tgt):null;
  if(t&&safe(t.o)){
    if(!g.inBSince)g.inBSince=S.time;
    const waited=S.time-g.inBSince;
    if(GBACK[key]&&nInB>=GBACK[key])return home();
    if(key==='slim'||key==='perfect'||(key==='boven'&&waited>=.5)){g.tgt=null;g.inBSince=null;t=null;}
    else if((key==='gem'&&waited>5)||(key==='onder'&&waited>10)){g.skip=t.o.id;g.tgt=null;g.inBSince=null;t=null;}
    else if(key==='boven'){return;}
    else{
      if((key==='gem'||key==='onder')&&total>0&&nInB>=total)return home();
      const p=bEdge(t);go(k,p.x,p.y,'jog');k.look=Math.atan2(t.y-k.y,t.x-k.x);return;
    }
  }else if(t)g.inBSince=null;
  if(!t){
    if((key==='gem'||key==='onder')&&total>0&&nInB>=total)return home();
    const p=guardPick(k,free,g.skip);g.skip=null;
    if(p){g.tgt=p.o.id;t=p;}
  }
  if(t){const d=hyp(t.x-k.x,t.y-k.y),f=Math.min(.6,d/k.top);go(k,t.x+t.vx*f,t.y+t.vy*f,(k.tired&&d>3)?'jog':'sprint');return;}
  if(!S.cdDone)return home();
  go(k,6,12.5,'jog');
}
function allHunt(k){
  const ks=known(k).filter(e=>!safe(e.o));const n=nearest(k,ks);
  if(n){go(k,n.e.x+n.e.vx*.3,n.e.y+n.e.vy*.3,'sprint');return;}
  if(!k.ai.wait)k.ai.wait={x:7.6+rand()*2,y:8+rand()*9};
  go(k,k.ai.wait.x,k.ai.wait.y,'jog');k.look=Math.PI;
}

/* ---------- Denken ---------- */
function think(k){
  if(k.ctrl==='mens')return;   // jij bent het brein
  k.intent=null;k.look=null;
  if(k.status!=='active')return;
  if(isAI(k.team))return cpuThink(k);
  if(k.orders.length)return orderThink(k);
  if(S.set.mode==='rol'){checkSwitch(k);const r=activeRole(k);if(r)return roleThink(k,r);}
  instinct(k);
}
function cpuThink(k){
  switch(k.ai.role){
    case 'jager':return hunter(k);
    case 'muur':case 'boog':return wallHold(k,k.ai.slot||{x:32,y:k.y});
    case 'vangnet':return net(k);
    case 'bewaker':return guard(k,k.ai.gspot||GSPOT[0]);
    case 'jaagt':return allHunt(k);
    case 'wacht':return waitB(k);
    case 'stage':return stage(k);
    case 'charge':return charge(k);
    case 'decoy':return decoy(k);
    case 'sneak':return sneak(k);
  }
  instinct(k);
}
function captain(){for(const T of aiTeams())captainT(T);}
function captainT(T){
  const P=S.plans[T];if(!P)return;
  const cap=captainOf(T);if(!cap)return;
  if(P.side==='pakkers'){
    if(!S.cd&&S.rt>=P.countAt)startCountdown(cap);
    return;
  }
  const lvn=cap.level,left=S.cd?S.cd.left:99;
  if(!P.go){
    let trig;
    if(lvn==='slim'||lvn==='boven')trig=left<=6||S.cdDone||S.rt>30;
    else if(lvn==='gem')trig=left<=3||S.cdDone||S.rt>40;
    else trig=S.cdDone||S.rt>50;
    if(trig)goLopers(T);
    return;
  }
  const ks=S.kids.filter(k=>k.team===T&&k.status==='active');
  if((P.tactic==='concentratie'||P.tactic==='schijn')&&P.phase==='stage'){
    const st=ks.filter(k=>k.ai.role==='stage');
    const near=st.filter(k=>hyp(k.x-k.ai.tx,k.y-k.ai.ty)<3).length;
    const wait=P.tactic==='schijn'?4.5:5;
    if(st.length===0||near>=st.length*.7||S.rt-P.goAt>wait+4){
      P.phase='charge';
      let tY=P.tactic==='schijn'?(P.corner==='onder'?4.2:20.8):P.cy;
      if(P.smart){const wk=wallWeak(T);
        if(P.tactic==='concentratie'&&wk&&wk.w>3)tY=wk.y;
        else if(P.tactic==='schijn'&&wk){const want=P.corner==='onder'?'boven':'onder';if((want==='boven')===(wk.y<12.5))tY=wk.y;}}
      if(P.tactic==='schijn')S.ev.tac[T]+=` (doorbraak gezocht bij ${zoneOf(tY)})`;
      ks.forEach((k,i)=>{if(k.ai.role==='stage'){k.ai.role='charge';k.ai.wx=null;k.ai.tx=35.8;k.ai.ty=clamp(tY+((i%5)-2)*.9,.8,24.2);}});
    }
  }
}
function startCountdown(by){
  if(S.cd)return;
  S.cd={left:10,by:by.name};S.ev.cdBy=by.name;S.ev.cdAt=S.rt;
  log(`<b>${by.name}</b> begint af te tellen.`);
}
