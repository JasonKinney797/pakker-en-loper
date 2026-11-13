'use strict';
/* ---------- Computerploeg: plannen ---------- */
function captainOf(team){return S.kids.filter(k=>k.team===team&&k.status==='active').sort((a,b)=>LV_RANK[b.level]-LV_RANK[a.level]||b.top-a.top)[0];}
function wallSlots(n,a,b,x){const r=[];for(let i=0;i<n;i++)r.push({x,y:n===1?(a+b)/2:a+i*(b-a)/(n-1)});return r;}
function arcSlots(n,corner,sh=0){const sg=corner==='onder'?1:-1,cy=corner==='onder'?21:4,R=4,r=[];
  for(let i=0;i<n;i++){const t=n===1?Math.PI/4:i*(Math.PI/2)/(n-1);r.push({x:30.5-sh+R*Math.cos(t),y:clamp(cy+sg*R*Math.sin(t),.6,24.4)});}return r;}
function assignByY(ks,slots){const a=ks.slice().sort((p,q)=>p.y-q.y),s=slots.slice().sort((p,q)=>p.y-q.y);a.forEach((k,i)=>k.ai.slot=s[i]);}
/* afstand van jouw muur tot C, ingesteld bij Formaties */
function myWallX(){const v=parseFloat((document.getElementById('wallDist')||{}).value);return 35-clamp(isFinite(v)?v:3,1,25);}
const myShift=()=>32-myWallX();
const corName=c=>c==='onder'?'onder':'boven';

/* ---------- Leren: de computer onthoudt wat jij doet en wat werkt ---------- */
function newLearn(){return {pak:{},lop:{},rounds:0,massa:0,lokaas:0,obs:0,wallX:[],vangnet:0,pakRounds:0};}
function stat(tbl,key){return tbl[key]||(tbl[key]={n:0,w:0});}
/* kans dat een tactiek wint tegen deze speler, met wat ruimte om iets nieuws te proberen */
function score(tbl,key,total,explore){const s=stat(tbl,key);return (s.w+1)/(s.n+2)+explore*Math.sqrt(Math.log(total+2)/(s.n+1));}
function learnRound(winner){
  const L=lt(),P=1-L;
  for(const T of aiTeams()){
    const lr=S.learn[T],key=S.ev.key[T];
    if(S.role[T]==='pakkers'){
      if(key){const s=stat(lr.pak,key);s.n++;if(winner==='pakkers')s.w++;}
      lr.rounds++;
      const lok=S.ev.lures[T]>=2;
      if(lok)lr.lokaas++;
      if(S.ev.obsMassa[T]!=null){lr.obs++;if(S.ev.obsMassa[T]&&!lok)lr.massa++;}
    }else{
      if(key){const s=stat(lr.lop,key);s.n++;if(winner==='lopers')s.w++;}
    }
  }
}
/* tijdens de ronde: hoe valt de tegenstander aan, hoe staat zijn muur? */
function observe(){
  for(const T of aiTeams()){
    // lokaas herkennen: lopers die lang vlak voor de muur blijven hangen
    if(S.role[T]==='pakkers'){const hv=S.ev.hov[T]||(S.ev.hov[T]={});
      for(const e of teamKnown(T))if(e.x>26&&e.x<31.6){hv[e.o.id]=(hv[e.o.id]||0)+.1;}
      const vs=Object.values(hv);S.ev.lures[T]=Math.max(vs.filter(t=>t>=1.2).length,vs.reduce((a,b)=>a+b,0)>=5?2:0);}
    if(S.role[T]==='pakkers'&&S.ev.obsMassa[T]==null){
      const opp=teamKnown(T).filter(e=>e.x>12);
      if(opp.some(e=>e.x>22)&&opp.length>=3){
        const m=opp.reduce((a,e)=>a+e.y,0)/opp.length,sd=Math.sqrt(opp.reduce((a,e)=>a+(e.y-m)**2,0)/opp.length);
        const charging=opp.filter(e=>e.vx>2).length/opp.length;
        S.ev.obsMassa[T]=sd<3.6&&charging>=.6;
      }
    }
  }
}
function wallWeak(T){
  // grootste gat in de muur die dit team van de tegenstander kent
  const ys=teamKnown(T).filter(e=>e.x>24).map(e=>e.y).sort((a,b)=>a-b);
  if(ys.length<3)return null;
  let best=null,bw=0,prev=0;
  for(const y of ys.concat([25])){const w=y-prev;if(w>bw){bw=w;best=(y+prev)/2;}prev=y;}
  return {y:clamp(best,1.2,23.8),w:bw};
}
function learnSummary(T){
  const lr=S.learn[T],out=[];
  if(lr.obs>=2&&lr.massa/lr.obs>=.4)out.push('jij valt meestal in één massa aan');
  if(lr.rounds>=2&&lr.lokaas/lr.rounds>=.4)out.push('jij gebruikt veel lokaas');
  if(lr.wallX.length>=2){const d=35-lr.wallX.reduce((a,b)=>a+b,0)/lr.wallX.length;if(d>5.5)out.push(`jouw muur staat ver van C (ongeveer ${d.toFixed(0)} m)`);}
  if(lr.vangnet>=2)out.push('jij zet vaak een vangnet');
  const ys=S.hists[T].lScoresY.slice(-6);const hb=ys.filter(y=>y<6).length,ho=ys.filter(y=>y>19).length;
  if(hb>=2||ho>=2)out.push(`jij breekt vaak door in de hoek ${ho>=hb?'onder':'boven'}`);
  return out;
}

function planAI(){
  for(const T of aiTeams()){const cap=captainOf(T);if(!cap){S.plans[T]=null;continue;}
    if(S.role[T]==='pakkers')planPakkers(cap,T);else planLopers(cap,T);}
}

function planPakkers(cap,T){
  const ks=S.kids.filter(k=>k.team===T&&k.status==='active').sort((a,b)=>b.top-a.top);
  const lvn=cap.level, ys=S.hists[T].lScoresY.slice(-4);
  const cnt={boven:ys.filter(y=>y<6).length,onder:ys.filter(y=>y>19).length,mid:ys.filter(y=>y>=6&&y<=19).length};
  let tactic,corner=null;
  const lr=S.learn[T],learns=lvn==='slim'||lvn==='boven';
  if(learns&&lr.rounds>=2){
    const massa=lr.obs?lr.massa/lr.obs:0,lok=lr.rounds?lr.lokaas/lr.rounds:0;
    const tot=Object.values(lr.pak).reduce((a,s)=>a+s.n,0),ex=lvn==='slim'?.25:.4;
    const cand={muurJager:0,hogeDruk:massa*.18,muurVangnet:.06+lok*.12+(cnt.mid>=2?.1:0),
      boogonder:(cnt.onder>=2?.2:0)-.04,boogboven:(cnt.boven>=2?.2:0)-.04};
    let bk=null,bs=-9;
    for(const [k,b] of Object.entries(cand)){const s=score(lr.pak,k,tot,ex)+b+(lvn==='boven'?(rand()-.5)*.2:0);if(s>bs){bs=s;bk=k;}}
    if(bk.startsWith('boog')){tactic='boog';corner=bk.slice(4);}else tactic=bk;
  }
  else if(lvn==='dom'||lvn==='onder')tactic='jaagt';
  else if(lvn==='gem')tactic='muurJager';
  else if(lvn==='boven'){
    if(cnt.boven>=3||cnt.onder>=3){tactic='boog';corner=cnt.onder>=cnt.boven?'onder':'boven';}
    else tactic=rand()<.7?'muurJager':'hogeDruk';
  }else{
    if(cnt.boven>=2||cnt.onder>=2){tactic='boog';corner=cnt.onder>=cnt.boven?'onder':'boven';}
    else if(cnt.mid>=2)tactic='muurVangnet';
    else{tactic=wpick([['muurJager',.35],['hogeDruk',.2],['muurVangnet',.25],['boog',.2]]);if(tactic==='boog')corner=rand()<.5?'onder':'boven';}
  }
  if(S.force&&S.force.pak){tactic=S.force.pak;corner=null;if(tactic.startsWith('boog')){corner=tactic.slice(4)||(rand()<.5?'onder':'boven');tactic='boog';}}   // alleen voor de balanstest
  if(ks.length<=5&&tactic==='hogeDruk')tactic='muurJager';
  let countAt;
  if(tactic==='jaagt'){
    ks.forEach(k=>k.ai.role='jaagt');countAt=.4;
    S.ev.tac[T]='Iedereen jaagt, meteen aftellen';
  }else{
    const nJ=tactic==='hogeDruk'?2:1;
    const jag=ks.slice(0,nJ);jag.forEach((k,i)=>{k.ai.role='jager';k.ai.hspot=i?{x:10,y:17}:{x:9.5,y:nJ>1?8:12.5};});
    let rest=ks.slice(nJ);
    if(tactic==='muurVangnet'&&rest.length>2){const v=rest[0];v.ai.role='vangnet';rest=rest.slice(1);}
    let nG=0;{const gr=rand();if(lvn==='slim'||lvn==='boven')nG=gr<.1?2:gr<.3?1:0;else if(lvn==='gem')nG=gr<.1?1:0;}
    if(rest.length<6)nG=0;
    rest.slice(0,nG).forEach((k,i)=>{k.ai.role='bewaker';k.ai.gspot=GSPOT[i];});rest=rest.slice(nG);
    S._nG=nG;
    if(tactic==='boog'&&rest.length>=4){
      const nA=Math.min(4,Math.max(2,Math.round(rest.length*.35)));
      const cy=corner==='onder'?25:0;
      const byC=rest.slice().sort((a,b)=>Math.abs(a.y-cy)-Math.abs(b.y-cy));
      const arc=byC.slice(0,nA),wall=byC.slice(nA);
      arc.forEach(k=>k.ai.role='boog');assignByY(arc,arcSlots(nA,corner));
      wall.forEach(k=>k.ai.role='muur');
      assignByY(wall,corner==='onder'?wallSlots(wall.length,.8,19.4,32):wallSlots(wall.length,5.6,24.2,32));
    }else{
      if(tactic==='boog')tactic='muurJager';
      rest.forEach(k=>k.ai.role='muur');assignByY(rest,wallSlots(rest.length,.8,24.2,32));
    }
    const patient=lvn==='slim'?rand()*15:lvn==='boven'?rand()*8:rand()*4;
    countAt=tactic==='hogeDruk'?.5:6+patient;
    S.ev.tac[T]={muurJager:'Muur 3 m voor C met één jager',hogeDruk:'Hoge druk: meteen aftellen, twee jagers, muur',
      muurVangnet:'Muur met vangnet achteraan en één jager',boog:`Boog in de hoek ${corName(corner)}, muur en één jager`}[tactic];
    if(S._nG)S.ev.tac[T]+=S._nG===1?', één bewaker bij B':', twee bewakers bij B';
  }
  const lr2=S.learn[T];
  // tegen veel lokaas blijft een slimme muur gedisciplineerd
  const disc=(lvn==='slim'||lvn==='boven')&&lr2.rounds>=2&&lr2.lokaas/lr2.rounds>=.4?.4:1;
  S.ev.key[T]=tactic==='boog'?'boog'+corner:tactic;
  S.plans[T]={side:'pakkers',tactic,countAt,corner,disc};
}

function planLopers(cap,T){
  const ks=S.kids.filter(k=>k.team===T&&k.status==='active');
  const lvn=cap.level, seen=S.hists[T].boogSeen.slice(-2).filter(Boolean);
  const boog=seen.length?seen[seen.length-1]:null;
  let tactic;
  if(lvn==='dom'||lvn==='onder')tactic='rennen';
  else if(lvn==='gem')tactic=rand()<.7?'concentratie':'groepen';
  else if(lvn==='boven')tactic=wpick([['concentratie',.6],['groepen',.25],['lokaas',.15]]);
  else tactic=boog?wpick([['lokaas',.3],['concentratie',.3],['schijn',.2],['groepen',.2]]):wpick([['concentratie',.4],['schijn',.25],['groepen',.25],['lokaas',.1]]);
  const lr=S.learn[T],tot=Object.values(lr.lop).reduce((a,s)=>a+s.n,0);
  if((lvn==='slim'||lvn==='boven')&&tot>=2){
    const wx=lr.wallX.length?35-lr.wallX.slice(-3).reduce((a,b)=>a+b,0)/Math.min(3,lr.wallX.length):3;
    const cand={concentratie:(wx>5.5?.15:0),schijn:.02,groepen:.02,lokaas:(boog?.12:0)+(lr.vangnet>=2?.06:0)};
    let bk=null,bs=-9,ex=lvn==='slim'?.25:.4;
    for(const [k,b] of Object.entries(cand)){const s=score(lr.lop,k,tot,ex)+b+(lvn==='boven'?(rand()-.5)*.2:0);if(s>bs){bs=s;bk=k;}}
    tactic=bk;
  }
  if(S.force&&S.force.lop)tactic=S.force.lop;   // alleen voor de balanstest
  if(ks.length<=3&&tactic==='lokaas')tactic='concentratie';
  let corner=rand()<.5?'onder':'boven';
  if(boog&&tactic!=='lokaas')corner=boog==='onder'?'boven':'onder';
  const breachY=(tactic==='lokaas'&&boog)?(boog==='onder'?19.6:5.4):6+rand()*13;
  ks.forEach(k=>{k.ai.role='wacht';});
  S.ev.key[T]=tactic;
  S.plans[T]={side:'lopers',tactic,corner,breachY,go:false,goAt:0,phase:'wacht',smart:lvn==='slim'||lvn==='boven'};
  S.ev.tac[T]={rennen:'Iedereen rent naar C',concentratie:`Concentratie op de hoek ${corner}`,
    schijn:`Schijnaanval: eerst de hoek ${corner}, dan de andere kant`,
    groepen:'Kleine groepjes, tegelijk op meerdere plekken',
    lokaas:`Lokaas op de muur bij ${zoneOf(breachY)}, sneakers wachten op een gat`}[tactic];
}

function goLopers(T){
  const P=S.plans[T];P.go=true;P.goAt=S.rt;
  const ks=S.kids.filter(k=>k.team===T&&k.status==='active');
  {const kn=teamKnown(T),lr=S.learn[T];const wall=kn.filter(e=>e.x>20&&e.x<34);
   if(wall.length>=4){const xs=wall.map(e=>e.x).sort((a,b)=>a-b);lr.wallX.push(xs[Math.floor(xs.length/2)]);}
   if(kn.some(e=>e.x>33.4))lr.vangnet++;
   if(P.smart&&P.tactic!=='lokaas'){const wk=wallWeak(T);if(wk&&wk.w>3){P.weak=wk.y;}}}
  const cy=P.corner==='onder'?20.8:4.2, stY=P.corner==='onder'?19.5:5.5;
  if(P.tactic==='rennen'){   // zonder plan: elk kind kiest zelf een plek, verspreid over de hele breedte
    if(P.breakout){   // uitbreken: samen door één plek in de kring, schuin weg van de meeste pakkers
      const kn2=teamKnown(T),up=kn2.filter(e=>e.y<12.5).length<=kn2.filter(e=>e.y>=12.5).length,tY=up?3.5:21.5;
      ks.forEach((k,i)=>{k.ai.role='charge';k.ai.wx=8.5;k.ai.tx=35.8;k.ai.ty=clamp(tY+((i%4)-1.5)*.8,.8,24.2);});
    }else ks.forEach(k=>{k.ai.goT=S.rt+rand()*6;k.ai.wx=null;k.ai.tx=35.8;k.ai.ty=1+rand()*23;});}   // elk kind vertrekt wanneer het zelf durft
  else if(P.tactic==='concentratie'){
    // één massa, tegelijk uit B, recht op één plek in de muur: het grootste gat dat de kapitein ziet, anders de gekozen plek
    let tY=P.breachY;if(P.smart&&P.weak!=null)tY=P.weak;
    P.phase='charge';P.cy=tY;
    ks.forEach((k,i)=>{k.ai.role='charge';k.ai.wx=null;k.ai.tx=35.8;k.ai.ty=clamp(tY+((i%5)-2)*.8,.8,24.2);});
  }else if(P.tactic==='groepen'){
    // kleine groepjes, tegelijk uit B, elk op een andere plek in de muur: de muur kan niet overal bijspringen
    // groepjes van minstens vijf: kleiner en elk muurkind heeft maar één loper voor zich
    const nG=ks.length>=15?3:ks.length>=6?2:1;
    const ys=nG===3?[4,12.5,21]:nG===2?[5.5,19.5]:[P.breachY];
    if(P.smart&&P.weak!=null){let bi=0;ys.forEach((y,i)=>{if(Math.abs(y-P.weak)<Math.abs(ys[bi]-P.weak))bi=i;});ys[bi]=P.weak;}
    // snelle kinderen gelijk verdeeld over de groepjes; wie het dichtst bij een plek staat, krijgt die plek
    const order=ks.slice().sort((a,b)=>b.top-a.top);
    P.phase='charge';
    order.forEach((k,i)=>{const g=i%nG;k.ai.role='charge';k.ai.wx=null;k.ai.tx=35.8;k.ai.ty=clamp(ys[g]+((Math.floor(i/nG)%3)-1)*.8,.8,24.2);});
  }else if(P.tactic==='schijn'){
    // schijnaanval: een derde trekt eerst naar één hoek, de massa breekt even later door aan de andere kant
    const fast=ks.slice().sort((a,b)=>b.top-a.top),nF=Math.max(1,Math.round(ks.length/3));
    fast.forEach((k,i)=>{
      if(i<nF){const a=i/nF*Math.PI*2;k.ai.role='stage';k.ai.tx=24+Math.cos(a)*1.1;k.ai.ty=clamp(stY+Math.sin(a)*1.1,.8,24.2);}
      else{k.ai.role='wacht';}
    });
    P.phase='stage';P.cy=cy;
  }else{ // lokaas
    const sn=ks.slice().sort((a,b)=>b.top-a.top).slice(0,ks.length>=6?2:1);
    const kn=teamKnown(T).filter(e=>e.x>26).sort((a,b)=>Math.abs(a.y-P.breachY)-Math.abs(b.y-P.breachY));
    sn.forEach((k,i)=>{k.ai.role='sneak';k.ai.since=S.time;k.ai.post={x:25,y:clamp(P.breachY+(i?2.4:-2.4),1,24)};});
    ks.filter(k=>!sn.includes(k)).sort((a,b)=>a.top-b.top).forEach((k,i)=>{
      k.ai.role='decoy';k.ai.ph='out';k.ai.phT=S.time;
      if(kn.length){k.ai.target=kn[i%kn.length].o.id;k.ai.tp=null;}
      else{k.ai.target=null;k.ai.tp={x:32,y:clamp(P.breachY+((i%5)-2)*2.4,1,24)};}
    });
  }
}
