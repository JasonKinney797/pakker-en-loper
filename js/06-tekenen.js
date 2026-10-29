'use strict';
/* ---------- Tekenen ---------- */
const cv=document.getElementById('veld'),ctx=cv.getContext('2d'),stageEl=document.getElementById('stage');
/* VW/VH: scherm. VVW/VVH: het "virtuele" vlak waarin het veld liggend getekend wordt.
   ROT: staand scherm, dan wordt dat vlak 90° gedraaid zodat B onderaan en C bovenaan ligt. */
let VW=0,VH=0,VVW=0,VVH=0,ROT=false,SC=1,OX=0,OY=0,DPR=1,FIT={SC:1,OX:0,OY:0};
const VIEW={x0:-.8,x1:37.6,y0:-2.9,y1:25.9};
const noise=(()=>{const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d');
  for(let i=0;i<1600;i++){const v=rand()<.5?255:0;g.fillStyle=`rgba(${v},${v},${v},${.02+rand()*.05})`;g.fillRect(rand()*160,rand()*160,1+rand()*1.6,1+rand()*1.6);}return c;})();
let noisePat=null;
function resize(){
  const r=stageEl.getBoundingClientRect();DPR=window.devicePixelRatio||1;VW=r.width;VH=r.height;
  cv.width=Math.max(1,Math.round(VW*DPR));cv.height=Math.max(1,Math.round(VH*DPR));
  ROT=VH>VW*1.08;VVW=ROT?VH:VW;VVH=ROT?VW:VH;
  const sc=Math.min(VVW/(VIEW.x1-VIEW.x0),VVH/(VIEW.y1-VIEW.y0));
  FIT={SC:sc,OX:(VVW-(VIEW.x1-VIEW.x0)*sc)/2-VIEW.x0*sc,OY:(VVH-(VIEW.y1-VIEW.y0)*sc)/2-VIEW.y0*sc};
  SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;
  noisePat=ctx.createPattern(noise,'repeat');
}
const wx=x=>OX+x*SC,wy=y=>OY+y*SC;
function toV(px,py){return ROT?{u:VVW-py,v:px}:{u:px,v:py};}
function toW(px,py){const q=toV(px,py);return {x:(q.u-OX)/SC,y:(q.v-OY)/SC};}
/* zoomen en verschuiven (twee vingers, of muiswiel) */
function clampView(){
  if(SC<=FIT.SC*1.001){SC=FIT.SC;OX=FIT.OX;OY=FIT.OY;return;}
  const fw=(VIEW.x1-VIEW.x0)*SC,fh=(VIEW.y1-VIEW.y0)*SC;
  OX=fw<=VVW?(VVW-fw)/2-VIEW.x0*SC:clamp(OX,VVW-VIEW.x1*SC,-VIEW.x0*SC);
  OY=fh<=VVH?(VVH-fh)/2-VIEW.y0*SC:clamp(OY,VVH-VIEW.y1*SC,-VIEW.y0*SC);
}
function zoomAt(px,py,k){const q=toV(px,py),ns=clamp(SC*k,FIT.SC,FIT.SC*4),kk=ns/SC;OX=q.u-(q.u-OX)*kk;OY=q.v-(q.v-OY)*kk;SC=ns;clampView();}
function panBy(dx,dy){if(ROT){OX-=dy;OY+=dx;}else{OX+=dx;OY+=dy;}clampView();}
const css=getComputedStyle(document.documentElement);
const C={krijt:css.getPropertyValue('--krijt').trim(),mijn:css.getPropertyValue('--mijn').trim(),ander:css.getPropertyValue('--ander').trim(),
  geel:css.getPropertyValue('--geel').trim(),rood:css.getPropertyValue('--rood').trim(),groen:css.getPropertyValue('--groen').trim(),
  asfalt:css.getPropertyValue('--asfalt').trim(),asfalt2:css.getPropertyValue('--asfalt-2').trim(),dim:css.getPropertyValue('--krijt-dim').trim()};
function teamCol(t){return t===0?C.mijn:C.ander;}
function chalk(w,alpha){ctx.strokeStyle=`rgba(238,236,226,${alpha==null?.9:alpha})`;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';}
/* tekst die altijd rechtop staat; up = afstand naar boven op het scherm, in pixels */
function T(txt,x,y,up){ctx.save();if(ROT){ctx.translate(x+(up||0),y);ctx.rotate(Math.PI/2);}else ctx.translate(x,y-(up||0));ctx.fillText(txt,0,0);ctx.restore();}
function fieldT(){if(ROT)ctx.setTransform(0,-DPR,DPR,0,0,VVW*DPR);else ctx.setTransform(DPR,0,0,DPR,0,0);}

let drag=null,hover=null,mouseW=null;
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle=C.asfalt2;ctx.fillRect(0,0,VW,VH);
  fieldT();
  ctx.fillStyle=C.asfalt;ctx.fillRect(wx(0),wy(0),W*SC,H*SC);
  if(noisePat){ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=noisePat;ctx.fillRect(0,0,VW,VH);ctx.restore();}
  // gevangenenstrook en bank
  ctx.fillStyle='rgba(229,88,76,.08)';ctx.fillRect(wx(35),wy(0),2.4*SC,H*SC);
  ctx.fillStyle=C.dim;ctx.font=`${Math.max(10,.55*SC)}px ${css.getPropertyValue('--f-body')}`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
  if(S.tb)T('Bank tijdens de tiebreaker',wx(0),wy(-2.4));
  // veldlijnen
  chalk(Math.max(1.5,.09*SC));ctx.strokeRect(wx(0),wy(0),W*SC,H*SC);
  // 3 m-zone rond B
  ctx.setLineDash([.35*SC,.3*SC]);chalk(Math.max(1,.05*SC),.45);
  ctx.beginPath();ctx.moveTo(wx(0),wy(7));ctx.lineTo(wx(5),wy(7));ctx.arc(wx(5),wy(10),3*SC,-Math.PI/2,0);ctx.lineTo(wx(8),wy(15));
  ctx.arc(wx(5),wy(15),3*SC,0,Math.PI/2);ctx.lineTo(wx(0),wy(18));ctx.stroke();ctx.setLineDash([]);
  // B
  ctx.fillStyle=S.cdDone?'rgba(229,88,76,.13)':'rgba(134,209,122,.12)';ctx.fillRect(wx(0),wy(10),5*SC,5*SC);
  chalk(Math.max(1.5,.09*SC));ctx.strokeRect(wx(0),wy(10),5*SC,5*SC);
  ctx.font=`${2.2*SC}px ${css.getPropertyValue('--f-disp')}`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(238,236,226,.13)';T('B',wx(2.5),wy(12.6));T('A',wx(19),wy(12.6));
  // lijn C
  chalk(Math.max(2.5,.16*SC),.95);ctx.beginPath();ctx.moveTo(wx(35),wy(0));ctx.lineTo(wx(35),wy(25));ctx.stroke();
  ctx.fillStyle='rgba(238,236,226,.5)';ctx.font=`${1.2*SC}px ${css.getPropertyValue('--f-disp')}`;T('C',wx(36.2),wy(24));
  // pings
  for(const p of S.pings){const a=(S.time-p.t)/2;if(a>1)continue;ctx.strokeStyle=`rgba(242,201,76,${1-a})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(wx(p.x),wy(p.y),(.6+a*3)*SC,0,7);ctx.stroke();}
  S.pings=S.pings.filter(p=>S.time-p.t<2);
  // zichtkegels van de selectie
  for(const id of S.sel){const k=S.byId.get(id);if(!k||k.status!=='active')continue;
    ctx.fillStyle='rgba(63,198,218,.07)';ctx.beginPath();ctx.moveTo(wx(k.x),wy(k.y));
    ctx.arc(wx(k.x),wy(k.y),7*SC,k.face-80*Math.PI/180,k.face+80*Math.PI/180);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(63,198,218,.18)';ctx.beginPath();ctx.arc(wx(k.x),wy(k.y),2*SC,0,7);ctx.stroke();}
  // bevelen
  ctx.setLineDash([.25*SC,.2*SC]);
  for(const id of S.sel){const k=S.byId.get(id);if(!k||k.status!=='active')continue;
    let px=k.x,py=k.y;
    for(const o of k.orders){let tx,ty;
      if(o.x!=null){tx=o.x;ty=o.y;}else{const t=S.byId.get(o.id);if(!t)continue;const g=t.team===0||S.vis0.has(t.id)?t:S.ghost.get(t.id);if(!g)continue;tx=g.x;ty=g.y;}
      ctx.strokeStyle=o.t==='attack'?'rgba(229,88,76,.7)':o.t==='hold'?'rgba(242,201,76,.6)':'rgba(134,209,122,.7)';
      ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(wx(px),wy(py));ctx.lineTo(wx(tx),wy(ty));ctx.stroke();px=tx;py=ty;}
  }
  ctx.setLineDash([]);
  const r=Math.max(.33*SC,5);
  // schimmen van tegenstanders
  for(const k of S.kids){
    if(S.watch||k.team===0||k.status!=='active'||S.vis0.has(k.id))continue;
    const g=S.ghost.get(k.id);if(!g)continue;const age=S.time-g.t;if(age>6)continue;
    ctx.setLineDash([3,3]);ctx.strokeStyle=`rgba(242,121,79,${.55*(1-age/6)})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(wx(g.x),wy(g.y),r,0,7);ctx.stroke();ctx.setLineDash([]);
  }
  // kinderen
  for(const k of S.kids){
    const vis=S.watch||k.team===0||k.status!=='active'||S.vis0.has(k.id);if(!vis)continue;
    const X=wx(k.x),Y=wy(k.y),pak=!isLoper(k);
    if(k.status==='bench'){ctx.globalAlpha=.35;}
    if(k.status==='prisoner'){ctx.globalAlpha=.55;}
    ctx.fillStyle=teamCol(k.team);ctx.beginPath();ctx.arc(X,Y,r,0,7);ctx.fill();
    if(pak&&k.status!=='bench'){ctx.strokeStyle=C.krijt;ctx.lineWidth=Math.max(1.5,.1*SC);ctx.beginPath();ctx.arc(X,Y,r+Math.max(1,.06*SC),0,7);ctx.stroke();}
    if(k.status==='active'){ctx.strokeStyle='rgba(20,24,26,.75)';ctx.lineWidth=Math.max(1.2,.06*SC);ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X+Math.cos(k.face)*r,Y+Math.sin(k.face)*r);ctx.stroke();}
    if(k.status==='prisoner'){ctx.strokeStyle='#1a1d1f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X-r*.6,Y-r*.6);ctx.lineTo(X+r*.6,Y+r*.6);ctx.moveTo(X+r*.6,Y-r*.6);ctx.lineTo(X-r*.6,Y+r*.6);ctx.stroke();}
    ctx.globalAlpha=1;
    if(k.tired&&k.status==='active'){ctx.fillStyle=C.rood;ctx.beginPath();ctx.arc(X+r*.8,Y-r*.8,Math.max(2,.08*SC),0,7);ctx.fill();}
    if(S.pos&&S.pos.id===k.id&&k.status==='active'){
      ctx.strokeStyle=C.geel;ctx.lineWidth=Math.max(2.5,.08*SC);ctx.beginPath();ctx.arc(X,Y,r+Math.max(5,.4*SC),0,7);ctx.stroke();
      ctx.strokeStyle=k.tired?C.rood:C.groen;ctx.lineWidth=Math.max(2,.06*SC);ctx.beginPath();
      ctx.arc(X,Y,r+Math.max(8,.6*SC),-Math.PI/2,-Math.PI/2+Math.PI*2*k.energy);ctx.stroke();
      ctx.fillStyle=C.geel;ctx.font=`700 ${Math.max(11,.55*SC)}px ${css.getPropertyValue('--f-body')}`;ctx.textAlign='center';ctx.textBaseline='bottom';
      T(k.name,X,Y,r+Math.max(10,.75*SC));
    }
    const sel=S.sel.has(k.id);
    if(sel){ctx.strokeStyle=C.groen;ctx.lineWidth=2;ctx.beginPath();ctx.arc(X,Y,r+Math.max(3,.22*SC),0,7);ctx.stroke();}
    if((sel||hover===k)&&!(S.pos&&S.pos.id===k.id)){ctx.fillStyle=C.krijt;ctx.font=`600 ${Math.max(10,.5*SC)}px ${css.getPropertyValue('--f-body')}`;ctx.textAlign='center';ctx.textBaseline='bottom';T(k.name,X,Y,r+Math.max(3,.25*SC));}
  }
  // zwevende teksten
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const f of S.floats){const a=(S.time-f.t)/1.3;if(a>1)continue;ctx.fillStyle=f.txt==='getikt'?`rgba(229,88,76,${1-a})`:`rgba(242,201,76,${1-a})`;
    ctx.font=`700 ${Math.max(10,.5*SC)}px ${css.getPropertyValue('--f-body')}`;T(f.txt,wx(f.x),wy(f.y),(.8+a*.8)*Math.max(SC,14));}
  S.floats=S.floats.filter(f=>S.time-f.t<1.3);
  // aftellen
  if(S.cd&&!S.cdDone){ctx.fillStyle='rgba(242,201,76,.9)';ctx.font=`${3*SC}px ${css.getPropertyValue('--f-disp')}`;T(Math.ceil(S.cd.left),wx(12),wy(3));}
  // tactiekbord: voorbeeld
  if(drawing){const d=drawing,ks=drawKids();ctx.strokeStyle='rgba(242,201,76,.9)';ctx.fillStyle='rgba(242,201,76,.9)';ctx.lineWidth=2;ctx.setLineDash([6,5]);
    if(d.tool==='arrow'){ctx.beginPath();ctx.moveTo(wx(d.a.x),wy(d.a.y));ctx.lineTo(wx(d.b.x),wy(d.b.y));ctx.stroke();ctx.setLineDash([]);
      const an=Math.atan2(wy(d.b.y)-wy(d.a.y),wx(d.b.x)-wx(d.a.x)),L=Math.max(10,.6*SC);ctx.beginPath();ctx.moveTo(wx(d.b.x),wy(d.b.y));
      ctx.lineTo(wx(d.b.x)-Math.cos(an-.45)*L,wy(d.b.y)-Math.sin(an-.45)*L);ctx.lineTo(wx(d.b.x)-Math.cos(an+.45)*L,wy(d.b.y)-Math.sin(an+.45)*L);ctx.closePath();ctx.fill();}
    else{const pts=drawSlots(d,Math.max(2,ks.length)),curve=d.tool==='arc'?arcPts(d.a,d.b,24):[d.a,d.b];
      ctx.beginPath();curve.forEach((p,i)=>i?ctx.lineTo(wx(p.x),wy(p.y)):ctx.moveTo(wx(p.x),wy(p.y)));ctx.stroke();ctx.setLineDash([]);
      for(const p of drawSlots(d,ks.length)){ctx.beginPath();ctx.arc(wx(p.x),wy(p.y),Math.max(4,.25*SC),0,7);ctx.fill();}}
    ctx.setLineDash([]);}
  // vanaf hier: schermruimte
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(joy){ctx.strokeStyle='rgba(238,236,226,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,JOY_R,0,7);ctx.stroke();
    const dx=joy.x-joy.ox,dy=joy.y-joy.oy,l=hyp(dx,dy),m=Math.min(l,JOY_R)/(l||1);
    ctx.fillStyle='rgba(242,201,76,.75)';ctx.beginPath();ctx.arc(joy.ox+dx*m,joy.oy+dy*m,22,0,7);ctx.fill();}
  else if(S.pos&&TOUCH&&!S.paused&&!S.over){ctx.strokeStyle='rgba(238,236,226,.18)';ctx.setLineDash([5,5]);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(70,VH-80,JOY_R,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(238,236,226,.35)';ctx.font=`12px ${css.getPropertyValue('--f-body')}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('duim hier',70,VH-80);}
  if(S.setup){const fs=clamp(Math.min(VW,VH)/20,13,26),msg=(S.ready[0]?'Wachten op de andere ploeg':'Opstellen · druk op Klaar')+(online()?` · ${Math.max(0,Math.ceil(SETUP_MAX-(S.setupT||0)))} s`:'');
    ctx.font=`${fs}px ${css.getPropertyValue('--f-disp')}`;ctx.textAlign='center';ctx.textBaseline='middle';
    const tw=ctx.measureText(msg).width;ctx.fillStyle='rgba(31,36,39,.82)';ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(VW/2-tw/2-12,8,tw+24,fs+14,8);else ctx.rect(VW/2-tw/2-12,8,tw+24,fs+14);ctx.fill();
    ctx.fillStyle='rgba(242,201,76,.95)';ctx.fillText(msg,VW/2,8+(fs+14)/2);}
  if(drag&&drag.box){ctx.strokeStyle=C.groen;ctx.setLineDash([4,3]);ctx.lineWidth=1;ctx.fillStyle='rgba(134,209,122,.08)';
    const x=Math.min(drag.sx,drag.cx),y=Math.min(drag.sy,drag.cy),w=Math.abs(drag.cx-drag.sx),h=Math.abs(drag.cy-drag.sy);
    ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);}
  if(S.paused&&!S.over){ctx.fillStyle='rgba(238,236,226,.85)';ctx.font=`${clamp(VW/30,14,24)}px ${css.getPropertyValue('--f-disp')}`;ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText('PAUZE',VW-12,VH-10);}
}
