'use strict';
/* ---------- Bevelen en rollen van jouw ploeg ---------- */
function activeRole(k){return (k.switched&&k.role2)?k.role2:k.role;}
function checkSwitch(k){
  if(!k.role2||k.switched)return;
  const v=+k.condVal||0;let ok=false;
  switch(k.cond){
    case 'cd':ok=S.cdDone;break;
    case 'gap':ok=gaps(k).some(g=>g.w>=v);break;
    case 'help':ok=S.calls.some(c=>c.team===k.team&&S.time-c.t<3);break;
    case 'time':ok=S.rt>=v;break;
    case 'near':{const n=nearest(k,known(k));ok=!!(n&&n.d<=v);break;}
    case 'left':ok=S.kids.filter(o=>o.team===lt()&&o.status==='active').length<=v;break;
  }
  if(ok){k.switched=true;k.ai={since:S.time,side:rand()<.5?-1:1,ph:'out',phT:S.time};log(`<b>${k.name}</b> wordt ${k.role2}.`);}
}
function playerSlot(k,kind){
  const mine=S.kids.filter(o=>o.team===0&&o.status==='active');
  const arc=mine.filter(o=>activeRole(o)==='boogman').sort((a,b)=>a.id-b.id);
  if(kind==='boog'){const sl=arcSlots(arc.length,S.boogHoek,myShift()).sort((a,b)=>a.y-b.y);return sl[arc.indexOf(k)]||{x:myWallX(),y:k.y};}
  const wall=mine.filter(o=>activeRole(o)==='muur').sort((a,b)=>(a.post?a.post.y:a.id)-(b.post?b.post.y:b.id));
  const [a,b]=arc.length?(S.boogHoek==='onder'?[.8,19.4]:[5.6,24.2]):[.8,24.2];
  return wallSlots(wall.length,a,b,myWallX())[wall.indexOf(k)]||{x:myWallX(),y:k.y};
}
function roleThink(k,r){
  switch(r){
    case 'jager':return hunter(k);
    case 'bewaker':{const g=S.kids.filter(o=>o.team===0&&o.status==='active'&&activeRole(o)==='bewaker').sort((a,b)=>a.id-b.id);return guard(k,GSPOT[Math.min(1,g.indexOf(k))]);}
    case 'muur':return wallHold(k,playerSlot(k,'muur'));
    case 'boogman':return wallHold(k,playerSlot(k,'boog'));
    case 'vangnet':return net(k);
    case 'sneaker':if(k.ai.role==='charge')return charge(k);return sneak(k);
    case 'lokaas':return decoy(k);
  }
  instinct(k);
}
function arrived(k,x,y,r){return hyp(k.x-x,k.y-y)<r;}
function orderThink(k){
  const o=k.orders[0];
  const next=()=>{k.orders.shift();think(k);};
  switch(o.t){
    case 'move':if(arrived(k,o.x,o.y,.35))return next();go(k,o.x,o.y,o.pace);return;
    case 'attack':
      if(arrived(k,o.x,o.y,.35)||(isLoper(k)&&k.x>=CX))return next();
      if(!isLoper(k)){const n=nearest(k,known(k).filter(e=>!safe(e.o)));if(n&&n.d<2.5){go(k,n.e.x,n.e.y,'sprint');return;}}
      go(k,o.x,o.y,'sprint');return;
    case 'follow':{
      const t=S.byId.get(o.id);if(!t||t.status!=='active')return next();
      if(t.team===k.team){const d=hyp(t.x-k.x,t.y-k.y);if(d>1.3)go(k,t.x,t.y,o.pace);else k.look=t.face;return;}
      const e=known(k).find(e=>e.o.id===o.id);
      const g=S.ghost.get(o.id);
      if(e){const d=hyp(e.x-k.x,e.y-k.y);
        if(isLoper(k)){if(d>2.2)go(k,e.x,e.y,o.pace);}
        else{const f=Math.min(.6,d/k.top);go(k,e.x+e.vx*f,e.y+e.vy*f,o.pace);}
      }else if(g)go(k,g.x,g.y,o.pace);
      return;}
    case 'cover':{
      const t=S.byId.get(o.id);if(!t||t.status!=='active')return next();
      const e=known(k).find(e=>e.o.id===o.id)||S.ghost.get(o.id);
      if(e){const n=nearest(k,known(k).filter(x=>!safe(x.o)));if(!isLoper(k)&&n&&n.d<k.reach+.6){go(k,n.e.x,n.e.y,'sprint');return;}
        go(k,Math.min(e.x+2.2,34.4),e.y,'sprint');k.look=Math.PI;}
      return;}
    case 'inout':{
      const t=S.byId.get(o.id);if(!t||t.status!=='active')return next();
      k.ai.target=o.id;k.ai.ioDist=o.dist;if(!k.ai.ph){k.ai.ph='out';k.ai.phT=S.time;}
      const save=k.ai.tp;k.ai.tp=S.ghost.get(o.id)||null;decoy(k);k.ai.tp=save;return;}
    case 'hold':
      if(isLoper(k)){if(evade(k,2))return;go(k,o.x,o.y,hyp(k.x-o.x,k.y-o.y)>1.5?'sprint':'jog');return;}
      return wallHold(k,{x:o.x,y:o.y});
    case 'net':return net(k);
    case 'guard':return guard(k,GSPOT[o.i]);
  }
  next();
}
