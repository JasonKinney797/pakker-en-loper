'use strict';
/* ---------- Nieuwe look ---------- */
/* Alles hieronder werkt alleen als html de klasse "nl" heeft. De klassieke look blijft onaangeroerd. */
S.edge=[];S.rec=[];S.recT=0;S.replay=null;S.rp=null;S.demo=false;
let hdrag=null,rhold=null,lastDrawT=performance.now();
S.look=(()=>{if(window.PEL_LOOK)return window.PEL_LOOK;try{return localStorage.getItem('pel-look')||'nieuw';}catch(e){return 'nieuw';}})();
function NL(){return S.look==='nieuw';}
function refreshColors(){
  const c2=getComputedStyle(document.documentElement);
  for(const [k,v] of [['krijt','--krijt'],['mijn','--mijn'],['ander','--ander'],['geel','--geel'],['rood','--rood'],['groen','--groen'],['asfalt','--asfalt'],['asfalt2','--asfalt-2'],['dim','--krijt-dim']])C[k]=c2.getPropertyValue(v).trim();
}
function setLook(v){
  S.look=v==='klassiek'?'klassiek':'nieuw';
  try{localStorage.setItem('pel-look',S.look);}catch(e){}
  document.documentElement.classList.toggle('nl',NL());
  document.querySelectorAll('[data-set="look"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.look)));
  refreshColors();
  if(!NL()){closeSheet(false);if(S.demo){stopDemo();S.kids=[];S.byId.clear();S.over=true;}}
  else if(!S.started)startDemo();
  resize();syncUI();
}
/* ---- demo achter het menu: twee computerploegen spelen rustig ---- */
function startDemo(){
  if(!NL()||S.started||online()||window.PEL_NODEMO)return;
  const keep=Object.assign({},S.set);
  S.demo=true;setWatch(true);Object.assign(S.set,{count:16,bell:0,mode:'rol',realism:true});
  newGame();S.set=keep;S.bell=0;S.speed=1;S.paused=false;S.sel.clear();
}
function stopDemo(){if(!S.demo)return;S.demo=false;setWatch(false);S.over=true;}

/* ---- scherm-coördinaten ---- */
function scr(x,y){const u=OX+x*SC,v=OY+y*SC;return ROT?{x:v,y:VVW-u}:{x:u,y:v};}
function rrect(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
const SKIN=['#f1c7a3','#d9a37c','#a8704a','#6d4630'],HAIR=['#2a1d14','#4a3020','#151515','#7a5230','#c9a25b'];

/* ---- herhaling van de laatste ronde, vertraagd ---- */
function playReplay(){
  if(!S.replay||!S.replay.frames.length||online()||S.rp)return;
  const rep=document.getElementById('repOv');const reopen=!rep.hidden;rep.hidden=true;
  S.rp={t:0,wasPaused:S.paused,reopen};S.paused=true;
  SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;
  document.getElementById('rpBar').hidden=false;syncUI();
}
function endReplay(){
  if(!S.rp)return;const r=S.rp;S.rp=null;S.paused=r.wasPaused;
  document.getElementById('rpBar').hidden=true;
  if(r.reopen)document.getElementById('repOv').hidden=false;
  syncUI();
}
function replayKids(){
  const fr=S.replay.frames,t=S.rp.t/.1,i=Math.min(fr.length-1,Math.floor(t)),j=Math.min(fr.length-1,i+1),a=t-Math.floor(t);
  const B2=new Map(fr[j].map(e=>[e[0],e]));
  return fr[i].map(e=>{const k=S.byId.get(e[0]);if(!k)return null;const n=B2.get(e[0])||e;
    const p=Object.create(k);p.x=e[1]+(n[1]-e[1])*a;p.y=e[2]+(n[2]-e[2])*a;p.face=e[3];p.status=e[4]?'prisoner':'active';p.vx=e[5];p.vy=e[6];p._ph=k._rph=(k._rph||0);return p;}).filter(Boolean);
}
document.getElementById('rpSkip').addEventListener('click',endReplay);

/* ---- een kind tekenen: schaduw, beentjes, hesje, hoofd ---- */
function kidNL(k,X,Y,r,fdt,pak){
  const mv=hyp(k.vx||0,k.vy||0);
  if(S.rp){k._rph=(k._rph||0)+mv*fdt*.5*3.4;}else k._ph=(k._ph||0)+mv*fdt*S.speed*3.4;
  const ph=S.rp?k._rph:k._ph;
  const f=k.face,c=Math.cos(f),s=Math.sin(f),px=-s,py=c;
  const pr=k.status==='prisoner',bench=k.status==='bench';
  ctx.globalAlpha=bench?.3:pr?.55:1;
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(X+r*.18,Y+r*.3,r*1.02,r*.78,0,0,7);ctx.fill();
  if(!pr&&mv>.35){const sw=Math.sin(ph)*r*.55;ctx.fillStyle='#0b0f15';
    for(const sd of [-1,1]){const lx=X+px*sd*r*.32+c*sw*sd,ly=Y+py*sd*r*.32+s*sw*sd;ctx.beginPath();ctx.ellipse(lx,ly,r*.27,r*.2,f,0,7);ctx.fill();}}
  ctx.fillStyle=pr?'#4b5565':teamCol(k.team);
  ctx.beginPath();ctx.ellipse(X-c*r*.08,Y-s*r*.08,r*.56,r*1.0,f,0,7);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1;ctx.stroke();
  if(pak&&!bench){ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=Math.max(1.6,.075*SC);ctx.stroke();}
  if(pr){ctx.strokeStyle=SKIN[k.id%4];ctx.lineWidth=Math.max(2,r*.2);ctx.lineCap='round';ctx.beginPath();
    const a1=X+c*r*.42,b1=Y+s*r*.42;
    ctx.moveTo(a1+px*r*.55,b1+py*r*.55);ctx.lineTo(a1-px*r*.35-c*r*.1,b1-py*r*.35-s*r*.1);
    ctx.moveTo(a1-px*r*.55,b1-py*r*.55);ctx.lineTo(a1+px*r*.35-c*r*.1,b1+py*r*.35-s*r*.1);ctx.stroke();}
  const hx=X+c*r*.12,hy=Y+s*r*.12;
  ctx.fillStyle=HAIR[(k.id*7)%5];ctx.beginPath();ctx.arc(hx-c*r*.1,hy-s*r*.1,r*.47,0,7);ctx.fill();
  ctx.fillStyle=SKIN[k.id%4];ctx.beginPath();ctx.arc(hx+c*r*.05,hy+s*r*.05,r*.38,0,7);ctx.fill();
  ctx.globalAlpha=1;
}
function nameTag(txt,X,Y,up,col){
  const fb=css.getPropertyValue('--f-body');ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.font=`600 ${12}px ${fb}`;const w=ctx.measureText(txt).width+12;
  const sx=X,sy=Y-up-12;ctx.fillStyle='rgba(13,17,23,.85)';rrect(sx-w/2,sy-9,w,18,9);ctx.fill();
  ctx.fillStyle=col||C.krijt;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,sx,sy);ctx.restore();
}
function drawNL(){
  const now=performance.now(),fdt=Math.min(.1,(now-lastDrawT)/1000);lastDrawT=now;
  if(S.rp){S.rp.t+=fdt*.5;if(S.rp.t>=(S.replay.frames.length-1)*.1){endReplay();}}
  const fd=css.getPropertyValue('--f-disp'),fb=css.getPropertyValue('--f-body');
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle=C.asfalt2;ctx.fillRect(0,0,VW,VH);
  fieldT();
  // veld
  ctx.fillStyle='#141b25';rrect(wx(0),wy(0),W*SC,H*SC,Math.max(3,.18*SC));ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=1;ctx.beginPath();
  for(let x=5;x<35;x+=5){ctx.moveTo(wx(x),wy(0));ctx.lineTo(wx(x),wy(25));}
  for(let y=5;y<25;y+=5){ctx.moveTo(wx(0),wy(y));ctx.lineTo(wx(35),wy(y));}ctx.stroke();
  ctx.fillStyle='rgba(240,82,82,.06)';ctx.fillRect(wx(35),wy(0),2.4*SC,H*SC);
  ctx.strokeStyle='rgba(233,238,245,.42)';ctx.lineWidth=Math.max(1.5,.07*SC);rrect(wx(0),wy(0),W*SC,H*SC,Math.max(3,.18*SC));ctx.stroke();
  // 3 m-zone
  ctx.setLineDash([.4*SC,.32*SC]);ctx.strokeStyle='rgba(233,238,245,.16)';ctx.lineWidth=Math.max(1,.05*SC);
  ctx.beginPath();ctx.moveTo(wx(0),wy(7));ctx.lineTo(wx(5),wy(7));ctx.arc(wx(5),wy(10),3*SC,-Math.PI/2,0);ctx.lineTo(wx(8),wy(15));
  ctx.arc(wx(5),wy(15),3*SC,0,Math.PI/2);ctx.lineTo(wx(0),wy(18));ctx.stroke();ctx.setLineDash([]);
  // B
  const bc=S.cdDone?'240,82,82':'74,222,128';
  ctx.fillStyle=`rgba(${bc},.09)`;ctx.fillRect(wx(0),wy(10),5*SC,5*SC);
  ctx.strokeStyle=`rgba(${bc},.75)`;ctx.lineWidth=Math.max(1.5,.08*SC);ctx.strokeRect(wx(0),wy(10),5*SC,5*SC);
  ctx.fillStyle=`rgba(${bc},.55)`;ctx.font=`700 ${Math.max(11,.9*SC)}px ${fd}`;ctx.textAlign='center';ctx.textBaseline='middle';T('B',wx(2.5),wy(12.5));
  // C, met gloed
  ctx.save();ctx.shadowColor='rgba(255,210,63,.55)';ctx.shadowBlur=14;ctx.strokeStyle=C.geel;ctx.lineWidth=Math.max(2.5,.13*SC);
  ctx.beginPath();ctx.moveTo(wx(35),wy(0));ctx.lineTo(wx(35),wy(25));ctx.stroke();ctx.restore();
  ctx.fillStyle='rgba(255,210,63,.7)';ctx.font=`700 ${Math.max(11,.9*SC)}px ${fd}`;T('C',wx(36.2),wy(12.5));
  if(S.tb&&!S.rp){ctx.fillStyle=C.dim;ctx.font=`500 ${Math.max(10,.5*SC)}px ${fb}`;ctx.textAlign='left';T('Bank tijdens de tiebreaker',wx(0),wy(-2.4));ctx.textAlign='center';}
  // aftellen: groot getal op de achtergrond
  if(S.cd&&!S.cdDone&&!S.rp){ctx.fillStyle='rgba(255,210,63,.16)';ctx.font=`700 ${9*SC}px ${fd}`;T(Math.ceil(S.cd.left),wx(19),wy(12.5));}
  // pings
  for(const p of S.pings){const a=(S.time-p.t)/2;if(a>1)continue;ctx.strokeStyle=`rgba(255,210,63,${1-a})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(wx(p.x),wy(p.y),(.6+a*3)*SC,0,7);ctx.stroke();}
  S.pings=S.pings.filter(p=>S.time-p.t<2);
  const r=Math.max(.44*SC,7);
  const list=S.rp?replayKids():S.kids;
  if(!S.rp){
    // zichtkegels
    for(const id of S.sel){const k=S.byId.get(id);if(!k||k.status!=='active')continue;
      const g=ctx.createRadialGradient(wx(k.x),wy(k.y),0,wx(k.x),wy(k.y),7*SC);g.addColorStop(0,'rgba(56,189,248,.10)');g.addColorStop(1,'rgba(56,189,248,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(wx(k.x),wy(k.y));ctx.arc(wx(k.x),wy(k.y),7*SC,k.face-80*Math.PI/180,k.face+80*Math.PI/180);ctx.closePath();ctx.fill();}
    // bevelen: geselecteerd volledig, tijdens opstellen ook de rest als planvoorbeeld
    for(const k of S.kids){
      if(k.team!==0&&!S.watch)continue;if(k.status!=='active'||!k.orders.length)continue;
      const sel=S.sel.has(k.id);if(!sel&&!(S.setup&&k.team===0))continue;
      ctx.globalAlpha=sel?1:.35;let px=k.x,py=k.y;
      for(const o of k.orders){let tx,ty;
        if(o.x!=null){tx=o.x;ty=o.y;}else{const t=S.byId.get(o.id);if(!t)continue;const g=t.team===0||S.vis0.has(t.id)?t:S.ghost.get(t.id);if(!g)continue;tx=g.x;ty=g.y;}
        const col=o.t==='attack'?C.rood:o.t==='hold'?C.geel:C.groen;
        ctx.strokeStyle=col;ctx.lineWidth=Math.max(1.5,.06*SC);ctx.beginPath();ctx.moveTo(wx(px),wy(py));ctx.lineTo(wx(tx),wy(ty));ctx.stroke();
        if(o.x!=null){ctx.fillStyle=col;ctx.beginPath();ctx.arc(wx(tx),wy(ty),sel?Math.max(5,.2*SC):3,0,7);ctx.fill();
          if(sel){ctx.strokeStyle='rgba(13,17,23,.9)';ctx.lineWidth=2;ctx.stroke();}}
        px=tx;py=ty;}
      ctx.globalAlpha=1;
    }
    // schimmen
    for(const k of S.kids){
      if(S.watch||k.team===0||k.status!=='active'||S.vis0.has(k.id))continue;
      const g=S.ghost.get(k.id);if(!g)continue;const age=S.time-g.t;if(age>6)continue;
      ctx.setLineDash([3,3]);ctx.strokeStyle=`rgba(251,122,80,${.5*(1-age/6)})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.ellipse(wx(g.x),wy(g.y),r*.7,r*1.05,0,0,7);ctx.stroke();ctx.setLineDash([]);
    }
  }
  // kinderen
  for(const k of list){
    const vis=S.rp||S.watch||k.team===0||k.status!=='active'||S.vis0.has(k.id);if(!vis)continue;
    const X=wx(k.x),Y=wy(k.y),pak=S.role[k.team]==='pakkers';
    const sel=!S.rp&&S.sel.has(k.id);
    if(sel){ctx.save();ctx.shadowColor=teamCol(k.team);ctx.shadowBlur=12;ctx.strokeStyle=teamCol(k.team);ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(X,Y,r*1.35,0,7);ctx.stroke();ctx.restore();}
    kidNL(k,X,Y,r,fdt,pak);
    if(!S.rp&&k.tired&&k.status==='active'){ctx.fillStyle=C.rood;ctx.beginPath();ctx.arc(X+r*.9,Y-r*.9,Math.max(2.5,.09*SC),0,7);ctx.fill();}
    if(!S.rp&&S.pos&&S.pos.id===k.id&&k.status==='active'){
      ctx.strokeStyle=C.geel;ctx.lineWidth=Math.max(2.5,.08*SC);ctx.beginPath();ctx.arc(X,Y,r*1.5,0,7);ctx.stroke();
      ctx.strokeStyle=k.tired?C.rood:C.groen;ctx.lineWidth=Math.max(2.5,.08*SC);ctx.beginPath();ctx.arc(X,Y,r*1.85,-Math.PI/2,-Math.PI/2+Math.PI*2*k.energy);ctx.stroke();
    }
  }
  // namen (in schermruimte, altijd rechtop)
  if(!S.rp)for(const k of S.kids){
    const own=S.pos&&S.pos.id===k.id;if(!(own||S.sel.has(k.id)||hover===k))continue;
    if(!(S.watch||k.team===0||S.vis0.has(k.id)))continue;
    const p=scr(k.x,k.y);nameTag(k.name,p.x,p.y,r*(own?1.9:1.4),own?C.geel:null);
  }
  // zwevende teksten
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(!S.rp)for(const f of S.floats){const a=(S.time-f.t)/1.3;if(a>1)continue;ctx.fillStyle=f.txt==='getikt'?`rgba(240,82,82,${1-a})`:`rgba(255,210,63,${1-a})`;
    ctx.font=`700 ${Math.max(12,.55*SC)}px ${fd}`;T(f.txt.toUpperCase(),wx(f.x),wy(f.y),(.9+a*.8)*Math.max(SC,14));}
  S.floats=S.floats.filter(f=>S.time-f.t<1.3);
  // herhaling: plek van de doorbraak
  if(S.rp&&S.replay.cross){ctx.save();ctx.shadowColor=C.geel;ctx.shadowBlur=18;ctx.strokeStyle=C.geel;ctx.lineWidth=3;ctx.beginPath();ctx.arc(wx(35),wy(S.replay.cross.y),1.2*SC,0,7);ctx.stroke();ctx.restore();}
  // tactiekbord
  if(drawing){const d=drawing,ks=drawKids();ctx.strokeStyle=C.geel;ctx.fillStyle=C.geel;ctx.lineWidth=2.5;ctx.setLineDash([7,6]);
    if(d.tool==='arrow'){ctx.beginPath();ctx.moveTo(wx(d.a.x),wy(d.a.y));ctx.lineTo(wx(d.b.x),wy(d.b.y));ctx.stroke();ctx.setLineDash([]);
      const an=Math.atan2(wy(d.b.y)-wy(d.a.y),wx(d.b.x)-wx(d.a.x)),L=Math.max(12,.7*SC);ctx.beginPath();ctx.moveTo(wx(d.b.x),wy(d.b.y));
      ctx.lineTo(wx(d.b.x)-Math.cos(an-.45)*L,wy(d.b.y)-Math.sin(an-.45)*L);ctx.lineTo(wx(d.b.x)-Math.cos(an+.45)*L,wy(d.b.y)-Math.sin(an+.45)*L);ctx.closePath();ctx.fill();}
    else{const curve=d.tool==='arc'?arcPts(d.a,d.b,24):[d.a,d.b];
      ctx.beginPath();curve.forEach((p,i)=>i?ctx.lineTo(wx(p.x),wy(p.y)):ctx.moveTo(wx(p.x),wy(p.y)));ctx.stroke();ctx.setLineDash([]);
      for(const p of drawSlots(d,ks.length)){ctx.beginPath();ctx.arc(wx(p.x),wy(p.y),Math.max(5,.28*SC),0,7);ctx.fill();}}
    ctx.setLineDash([]);}
  // ---- schermruimte ----
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // pijlen aan de rand voor wat buiten beeld gebeurt
  const tn=performance.now();S.edge=S.edge.filter(e=>tn-e.t<2600);
  if(SC>FIT.SC*1.02)for(const e of S.edge){
    const p=scr(e.x,e.y),m=26,top=74,bot=84;
    if(p.x>=m&&p.x<=VW-m&&p.y>=top&&p.y<=VH-bot)continue;
    const cx=clamp(p.x,m,VW-m),cy=clamp(p.y,top,VH-bot),an=Math.atan2(p.y-cy,p.x-cx),al=1-(tn-e.t)/2600;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(an);ctx.globalAlpha=al;ctx.fillStyle=e.c===0?C.mijn:C.ander;
    ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-6,-9);ctx.lineTo(-6,9);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(joy){ctx.strokeStyle='rgba(233,238,245,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,JOY_R,0,7);ctx.stroke();
    const dx=joy.x-joy.ox,dy=joy.y-joy.oy,l=hyp(dx,dy),m=Math.min(l,JOY_R)/(l||1);
    ctx.fillStyle='rgba(255,210,63,.8)';ctx.beginPath();ctx.arc(joy.ox+dx*m,joy.oy+dy*m,22,0,7);ctx.fill();}
  else if(S.pos&&TOUCH&&!S.paused&&!S.over){ctx.strokeStyle='rgba(233,238,245,.16)';ctx.setLineDash([5,5]);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(80,VH-160,JOY_R,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(233,238,245,.35)';ctx.font=`500 12px ${fb}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('duim hier',80,VH-160);}
  if(drag&&drag.box){ctx.strokeStyle=C.mijn;ctx.setLineDash([5,4]);ctx.lineWidth=1.5;ctx.fillStyle='rgba(56,189,248,.08)';
    const x=Math.min(drag.sx,drag.cx),y=Math.min(drag.sy,drag.cy),w=Math.abs(drag.cx-drag.sx),hh=Math.abs(drag.cy-drag.sy);
    ctx.fillRect(x,y,w,hh);ctx.strokeRect(x,y,w,hh);ctx.setLineDash([]);}
}

/* ---- bevelpunten verslepen ---- */
function handleAt(px,py,tol){
  if(!NL()||S.watch||S.rp)return null;
  let best=null,bd=tol;
  for(const k of selected()){if(k.team!==0)continue;for(const o of k.orders){if(o.x==null)continue;const p=scr(o.x,o.y),d=hyp(p.x-px,p.y-py);if(d<bd){bd=d;best={k,o};}}}
  return best;
}
function moveHandle(hd,px,py){const w=toW(px,py);hd.o.x=clamp(w.x,.3,isLoper(hd.k)?36.5:34.6);hd.o.y=clamp(w.y,.3,24.7);}

/* ---- bevelwiel ---- */
const wheelEl=document.getElementById('wheel');
function wheelOpen(){return !wheelEl.hidden;}
function closeWheel(){wheelEl.hidden=true;wheelEl.classList.remove('open');wheelEl.innerHTML='';}
function holdAt(w,ks){
  const n=ks.length,cols=Math.ceil(Math.sqrt(n));
  ks.slice().sort((a,b)=>a.y-b.y).forEach((k,i)=>{const ox=n===1?0:((i%cols)-(cols-1)/2)*.9,oy=n===1?0:(Math.floor(i/cols)-(Math.ceil(n/cols)-1)/2)*.9;
    giveOrder({t:'hold',x:clamp(w.x+ox,.3,isLoper(k)?36.5:34.6),y:clamp(w.y+oy,.3,24.7)},S.queue,[k]);});
}
function openWheel(px,py,w){
  if(!NL()||S.watch||!S.started||S.rp)return;
  const tol=TOUCH?touchTol():.8;
  const en=enemyAt(w,tol+.05),own=pickKid(w,k=>k.team===0&&k.status==='active',tol);
  let ks=selected();
  if(!ks.length&&own){S.sel=new Set([own.id]);ks=[own];}
  if(!ks.length){toast(TOUCH?'Tik eerst op een kind.':'Kies eerst een kind.');return;}
  const lp=ks.filter(isLoper),q=()=>S.queue;let items,title;
  if(en){title=en.name;
    items=[['Achtervolg',()=>giveOrder({t:'follow',id:en.id,pace:'sprint'},q(),ks)],['Dek',()=>giveOrder({t:'cover',id:en.id},q(),ks)]];
    if(lp.length)items.push(['In-uit',()=>{const d=+document.getElementById('ioDist').value||1.8;giveOrder({t:'inout',id:en.id,dist:clamp(d,1,4)},q(),lp);}]);
  }else if(own&&!S.sel.has(own.id)){title=own.name;items=[['Volg',()=>giveOrder({t:'follow',id:own.id,pace:S.pace},q(),ks)]];}
  else if(own&&ks.length===1&&own.id===ks[0].id){title=own.name;
    items=[['Houd positie',()=>holdAt({x:own.x,y:own.y},ks)]];
    if(!S.pos&&canSwitch())items.push(['Overnemen',()=>tryPossess(own)]);
    if(isLoper(own))items.push(['Aanval op C',()=>giveOrder({t:'attack',x:35.8,y:own.y},q(),ks)]);
  }else{title=ks.length===1?ks[0].name:`${ks.length} kinderen`;
    items=[['Ga hier',()=>groupMove(w,q(),S.pace)],['Sprint hier',()=>groupMove(w,q(),'sprint')],['Houd hier',()=>holdAt(w,ks)],
      ['Aanval',()=>ks.forEach(k=>giveOrder({t:'attack',x:isLoper(k)&&w.x>28?35.8:w.x,y:w.y},q(),[k]))]];
    if(lp.length)items.push(['Verzamel hier',()=>{lp.forEach((k,i)=>{const a=i/lp.length*Math.PI*2,rr=lp.length>1?.9:0;giveOrder({t:'hold',x:clamp(w.x+Math.cos(a)*rr,.4,34),y:clamp(w.y+Math.sin(a)*rr,.4,24.6)},q(),[k]);});}]);
  }
  items.push(['Stop',()=>{ks.forEach(k=>k.orders=[]);syncUI();}]);
  const R0=Math.min(92,Math.max(76,items.length*14));
  const cx=clamp(px,R0+56,VW-R0-56),cy=clamp(py,R0+30,VH-R0-30);
  wheelEl.style.left=cx+'px';wheelEl.style.top=cy+'px';
  wheelEl.innerHTML=`<span class="wt" style="left:0;top:${-R0-34}px">${esc(title)}</span>`+items.map((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/items.length;
    return `<button data-wi="${i}" style="left:${Math.cos(a)*R0}px;top:${Math.sin(a)*R0}px">${it[0]}</button>`;}).join('')+'<button class="wc" data-wi="x" style="left:0;top:0" aria-label="Sluiten">✕</button>';
  wheelEl._items=items;wheelEl._t=performance.now();wheelEl.hidden=false;requestAnimationFrame(()=>wheelEl.classList.add('open'));
}
wheelEl.addEventListener('click',e=>{const b=e.target.closest('[data-wi]');if(!b)return;const i=b.dataset.wi;
  if(performance.now()-wheelEl._t<450)return;   // de klik die meteen na het loslaten komt, telt niet
  if(i!=='x'){try{wheelEl._items[+i][1]();}catch(err){console.error(err);}}closeWheel();syncUI();});
wheelEl.addEventListener('contextmenu',e=>e.preventDefault());

/* ---- menu-knop linksboven ---- */
const hmenuEl=document.getElementById('hMenuPop');
function hmenuOpen(){return !hmenuEl.hidden;}
function closeHMenu(){hmenuEl.hidden=true;document.getElementById('hMenu').setAttribute('aria-expanded','false');}
document.getElementById('hMenu').addEventListener('click',e=>{e.stopPropagation();hmenuEl.hidden=!hmenuEl.hidden;document.getElementById('hMenu').setAttribute('aria-expanded',String(!hmenuEl.hidden));syncUI();});
hmenuEl.addEventListener('click',e=>{const b=e.target.closest('[data-hm]');if(!b)return;const a=b.dataset.hm;
  if(a==='stats'){closeHMenu();openStats();}
  else if(a==='msg'){closeHMenu();const mb=document.getElementById('msgBox');mb.hidden=!mb.hidden;}
  else if(a==='sound'){toggleSound();}
  else if(a==='cam'){S.camFollow=!S.camFollow;if(!S.camFollow){SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;}syncUI();}
  else if(a==='keys'){closeHMenu();toggleKeys(true);}
  else if(a==='look'){closeHMenu();setLook('klassiek');}
  else if(a==='menu'){closeHMenu();document.getElementById('newBtn').click();}
});
document.addEventListener('pointerdown',e=>{if(hmenuOpen()&&!e.target.closest('#hMenuPop,#hMenu'))closeHMenu();if(wheelOpen()&&!e.target.closest('#wheel'))closeWheel();},true);

/* ---- knoppen bovenaan en onderaan ---- */
document.getElementById('hPause').addEventListener('click',()=>{S._sheetPaused=false;togglePause();});
document.getElementById('hSpeed').addEventListener('click',()=>setSpeed(S.watch?(S.speed===1?2:S.speed===2?4:S.speed===4?.5:1):(S.speed===1?2:S.speed===2?.5:1)));
document.getElementById('dReady').addEventListener('click',playerReady);
document.getElementById('dCd').addEventListener('click',playerCountdown);
function teamForm(f){if(!selected().length)S.sel=new Set(S.kids.filter(k=>k.team===0&&k.status==='active'&&k.ctrl!=='mens').map(k=>k.id));applyForm(f,S.queue);}
document.getElementById('dCharge').addEventListener('click',()=>teamForm('charge'));
document.getElementById('dHome').addEventListener('click',()=>teamForm('home'));
document.getElementById('dPos').addEventListener('click',togglePossess);
document.getElementById('dQueue').addEventListener('click',()=>{S.queue=!S.queue;syncUI();});
document.getElementById('dReplay').addEventListener('click',()=>playReplay());
document.getElementById('dStats').addEventListener('click',openStats);
document.getElementById('dMore').addEventListener('click',()=>{if(!S.watch&&S.tab==='sel')setTab('form');panelEl.classList.contains('open')?closeSheet(true):openSheet();});

/* ---- kaart van de selectie ---- */
const selCardEl=document.getElementById('selCard');let selSig='';
selCardEl.addEventListener('click',e=>{const b=e.target.closest('[data-sa]');if(!b)return;const a=b.dataset.sa,ks=selected();
  if(a==='x'){S.sel.clear();}
  else if(a==='hold'){ks.forEach(k=>giveOrder({t:'hold',x:k.x,y:k.y},S.queue,[k]));}
  else if(a==='stop'){ks.forEach(k=>k.orders=[]);}
  else if(a==='pos'){togglePossess();}
  else if(['follow','cover','inout','move','attack'].includes(a)){setDraw(null);setCmd(a);}
  else if(a==='all'){S.sel=new Set(S.kids.filter(k=>k.team===0&&k.status==='active').map(k=>k.id));}
  syncUI();});
function renderSelCard(){
  const ks=selected();
  if(!ks.length||S.rp){selCardEl.hidden=true;selSig='';return;}
  const k=ks[0],one=ks.length===1;
  const sig=ks.map(k=>k.id+':'+kidStatus(k)).join(',')+'|'+S.watch+'|'+(S.pos?S.pos.id:'')+'|'+canSwitch()+'|'+S.role[0];
  if(sig!==selSig){selSig=sig;
    if(one){const lp=isLoper(k),mine=k.team===0&&!S.watch;
      selCardEl.innerHTML=`<div class="sh"><span class="dot" style="background:${teamCol(k.team)}"></span><b>${esc(k.name)}</b><button class="x" data-sa="x" aria-label="Selectie wissen">✕</button></div>
        <div class="tag">${esc(kidStatus(k))}${(S.set.realism||S.watch)?' · '+LV[k.level].nm:''}</div>
        <div class="nums"><span><b>${k.top.toFixed(1)}</b> m/s</span><span>wendbaar <b>${k.agi}</b></span><span>bereik <b>${k.reach.toFixed(2)}</b></span></div>
        <div class="bar2"><i id="selEn"></i></div>
        ${mine?`<div class="acts"><button data-sa="move">Ga naar</button><button data-sa="follow">Volg</button><button data-sa="cover">Dek</button>${lp?'<button data-sa="inout">In-uit</button>':''}<button data-sa="hold">Houd</button><button data-sa="stop">Stop</button><button data-sa="pos">${S.pos&&S.pos.id===k.id?'Loslaten':'Overnemen'}</button></div>`:''}`;
    }else{
      selCardEl.innerHTML=`<div class="sh"><span class="dot" style="background:${teamCol(0)}"></span><b>${ks.length} kinderen</b><button class="x" data-sa="x" aria-label="Selectie wissen">✕</button></div>
        <div class="tag">${esc(ks.map(k=>k.name).join(', '))}</div>
        ${S.watch?'':'<div class="acts"><button data-sa="move">Ga naar</button><button data-sa="attack">Aanval</button><button data-sa="hold">Houd</button><button data-sa="stop">Stop</button><button data-sa="all">Hele ploeg</button></div>'}`;
    }
  }
  const en=document.getElementById('selEn');if(en){en.style.width=Math.round(k.energy*100)+'%';en.style.background=k.tired?'var(--rood)':'var(--groen)';}
  selCardEl.hidden=false;
}

/* ---- alles bijwerken ---- */
function syncNL(){
  if(!NL())return;
  const t=id=>document.getElementById(id);
  const n0=S.watch?'Blauw':'Jij',n1=S.watch?'Oranje':(online()?'Vriend':'Computer');
  t('sbN0').textContent=n0;t('sbN1').textContent=n1;
  t('sbS0').textContent=S.score[0];t('sbS1').textContent=S.score[1];
  const rl=r=>r==='lopers'?'loopt':'pakt';t('sbR0').textContent=rl(S.role[0]);t('sbR1').textContent=rl(S.role[1]);
  const ck=t('sbClock');
  if(S.bell>0||S.ended){ck.textContent=fmt(S.bell||0);ck.className=S.bell<=60?'hot':'';}
  else if(S.tb){ck.textContent=fmt(S.tb.clock);ck.className='';}
  else{ck.textContent=fmt(S.block);ck.className='';}
  const ph=t('sbPhase');
  if(S.rp){ph.textContent='Herhaling';ph.className='warn';}
  else if(S.ended){ph.textContent='De bel';ph.className='hot';}
  else if(S.setup){ph.textContent=(S.ready&&S.ready[0]&&!S.watch?'Wachten':'Opstellen')+(online()?` ${Math.max(0,Math.ceil(SETUP_MAX-(S.setupT||0)))}s`:'');ph.className='warn';}
  else if(S.cd&&!S.cdDone){ph.textContent=`Aftellen ${Math.ceil(S.cd.left)}`;ph.className='warn';}
  else if(S.cdDone){ph.textContent='B is open';ph.className='hot';}
  else{ph.textContent=S.tb?'Tiebreaker':'B is veilig';ph.className='';}
  if(t('hPause').dataset.p!==String(S.paused)){t('hPause').dataset.p=String(S.paused);t('hPause').innerHTML=S.paused?'<svg viewBox="0 0 20 20"><path d="M6 4l10 6-10 6z"/></svg>':'<svg viewBox="0 0 20 20"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>';}
  t('hPause').setAttribute('aria-label',S.paused?'Verder':'Pauze');
  t('hSpeed').textContent=(S.speed===.5?'½':S.speed)+'×';
  // menu-knop
  hmenuEl.querySelector('[data-hm="sound"]').setAttribute('aria-pressed',String(SFX.on));
  hmenuEl.querySelector('[data-hm="cam"]').setAttribute('aria-pressed',String(!!S.camFollow));
  t('hmKeys').hidden=TOUCH;
  // actiebalk
  const watch=S.watch,setup=S.setup&&!S.over,pak=S.role[0]==='pakkers',live=!S.setup&&!S.over,play=S.started&&!S.ended;
  const show=(id,on)=>{t(id).hidden=!on;};
  show('dReady',play&&setup&&!watch);t('dReady').disabled=!!(S.ready&&S.ready[0]);t('dReady').textContent=S.ready&&S.ready[0]?'Wachten…':'Klaar';
  show('dCd',play&&live&&pak&&!watch&&!S.cd);
  show('dCharge',play&&!pak&&!watch&&!S.over);show('dHome',play&&!pak&&!watch&&!S.over);
  const draws=play&&!watch&&!S.over;document.querySelectorAll('#dock [data-draw]').forEach(b=>b.hidden=!draws);
  show('dSep1',draws);
  const one=selected().length===1;
  show('dPos',play&&!watch&&!!S.pos);t('dPos').textContent=S.pos?'Loslaten':'Overnemen';t('dPos').disabled=!S.pos&&!canSwitch();
  show('dQueue',play&&!watch&&TOUCH);t('dQueue').setAttribute('aria-pressed',String(!!S.queue));
  show('dReplay',!!S.replay&&!online()&&!S.rp&&S.started);
  show('dStats',watch);
  show('dSep2',draws);
  t('dMoreT').textContent=panelEl.classList.contains('open')?'Sluiten':'Meer';
  // groepen
  document.querySelectorAll('#grail [data-grp]').forEach(b=>{const g=S.groups[b.dataset.grp]||[];const n=g.filter(id=>{const x=S.byId.get(id);return x&&x.status==='active';}).length;
    const hv=b.dataset.grp+(n?`<small>${n}</small>`:'');if(b._h!==hv){b._h=hv;b.innerHTML=hv;}});
  t('grail').hidden=!play||watch;
  t('dock').hidden=!S.started||S.demo;
  t('sb').hidden=!S.started&&!S.demo;
  document.querySelector('.hud-top').style.visibility=S.demo?'hidden':'visible';
  renderSelCard();
}
document.documentElement.classList.toggle('nl',NL());
document.querySelectorAll('[data-set="look"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.look)));
refreshColors();
