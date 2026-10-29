'use strict';
/* ---------- Beweging ---------- */
function move(k,dt){
  let cap=0,tx=0,ty=0,dist=0;
  if(k.intent){tx=k.intent.x-k.x;ty=k.intent.y-k.y;dist=hyp(tx,ty);const p=k.intent.pace;
    cap=p==='sprint'?k.top:p==='jog'?Math.min(3.5,k.top):1.4;if(k.tired)cap=Math.min(cap,k.top*.8);}
  const a=k.top/k.acc*(k.intent&&k.intent.quick?1.7:1);let dvx,dvy;
  if(dist>.05&&cap>0){const want=Math.min(cap,Math.sqrt(2*a*1.2*dist));dvx=tx/dist*want-k.vx;dvy=ty/dist*want-k.vy;}
  else{dvx=-k.vx;dvy=-k.vy;}
  const sp=hyp(k.vx,k.vy);let maxA=a;
  if(sp>.5&&dist>.05){const dot=(k.vx*tx+k.vy*ty)/(sp*dist);if(dot<.7){maxA=a*(1+k.agi/100*.8);if(sp>2.5)k.lastTurn=S.time;}}
  const dv=hyp(dvx,dvy),lim=maxA*dt;if(dv>lim){dvx*=lim/dv;dvy*=lim/dv;}
  k.vx+=dvx;k.vy+=dvy;
  k.px=k.x;k.py=k.y;k.x+=k.vx*dt;k.y+=k.vy*dt;
  const s2=hyp(k.vx,k.vy);
  if(s2>3.7){k.energy-=dt/k.stam;if(k.energy<=0){k.energy=0;k.tired=true;}}
  else k.energy=Math.min(1,k.energy+(s2<1.7?.08:.025)*dt);
  if(k.tired&&k.energy>=.35)k.tired=false;
  const tf=s2>.6?Math.atan2(k.vy,k.vx):(k.look!=null?k.look:k.face);
  const d=angDiff(tf,k.face),st=9*dt;k.face+=clamp(d,-st,st);
}
function prisonSpot(k){
  const ps=S.kids.filter(o=>o.status==='prisoner').sort((a,b)=>a.pIdx-b.pIdx);
  const i=ps.indexOf(k);return {x:35.8+(i%2)*.8,y:1+Math.floor(i/2)*1.1};
}
function walkPrisoner(k,dt){
  const s=prisonSpot(k),dx=s.x-k.x,dy=s.y-k.y,d=hyp(dx,dy);
  if(d>.05){const m=Math.min(d,1.2*dt);k.x+=dx/d*m;k.y+=dy/d*m;k.face=Math.atan2(dy,dx);}
}
function physics(){
  const act=active();
  for(let i=0;i<act.length;i++)for(let j=i+1;j<act.length;j++){
    const a=act[i],b=act[j];const dx=b.x-a.x,dy=b.y-a.y,d=hyp(dx,dy);
    if(d<.56&&d>1e-6){const o=(.56-d)/2,ux=dx/d,uy=dy/d;a.x-=ux*o;a.y-=uy*o;b.x+=ux*o;b.y+=uy*o;}
  }
  for(const k of act){
    if(isLoper(k)){if(S.setup){k.x=clamp(k.x,.35,4.65);k.y=clamp(k.y,10.35,14.65);}else{k.x=clamp(k.x,.3,36.5);k.y=clamp(k.y,.3,24.7);}}
    else{k.x=clamp(k.x,.3,34.7);k.y=clamp(k.y,.3,24.7);}
  }
  if(!S.cdDone){   // hoogstens 2 pakkers binnen 3 m van B
    const P=1-lt();
    const inZ=act.filter(k=>k.team===P&&distToB(k.x,k.y)<GUARD);
    if(inZ.length>2){
      const newc=inZ.filter(k=>distToB(k.px,k.py)>=GUARD);
      const old=inZ.length-newc.length;
      let allow=Math.max(0,2-old);
      for(const k of newc){if(allow>0){allow--;continue;}k.x=k.px;k.y=k.py;k.vx=0;k.vy=0;}
      const still=act.filter(k=>k.team===P&&distToB(k.x,k.y)<GUARD).sort((a,b)=>distToB(b.x,b.y)-distToB(a.x,a.y));
      for(let i=0;i<still.length-2;i++){const k=still[i];const dx=k.x-2.5,dy=k.y-12.5,l=hyp(dx,dy)||1;k.x+=dx/l*.15;k.y+=dy/l*.15;}
    }
  }
}

/* ---------- Tikken en einde ---------- */
function tagProb(p,l,d){
  const r=d/p.reach;let pr=r<=.6?.9:r<=.85?.6:.25;
  const ux=(l.x-p.x)/d,uy=(l.y-p.y)/d;
  if(l.vx*ux+l.vy*uy>p.vx*ux+p.vy*uy)pr-=.15;
  if(S.time-l.lastTurn<.3)pr-=l.agi/700;
  if(!canSee(l,p))pr+=.10;
  if(p.tired||p.energy<.3)pr-=.10;
  return clamp(pr,.02,.97);
}
function tagsAndEnd(){
  const L=lt(),P=1-L;
  const lop=S.kids.filter(k=>k.team===L&&k.status==='active');
  const pak=S.kids.filter(k=>k.team===P&&k.status==='active');
  const tagged=new Map();
  for(const p of pak){
    // aanraken is tikken: lichamen die elkaar raken, altijd en zonder wachttijd
    // een geslaagde tik kost wel even tijd: één loper tegelijk; een mislukte poging blokkeert aanraken niet
    let touch=null;
    if(S.time-(p.lastOK||-9)>=TAG_CD)for(const l of lop){if(tagged.has(l.id)||safe(l))continue;if(hyp(l.x-p.x,l.y-p.y)<=CONTACT){touch=l;break;}}
    if(touch){tagged.set(touch.id,p);p.tagCD=S.time+TAG_CD;p.lastOK=S.time;continue;}
    if(p.ctrl==='mens'){   // je tikt zelf
      const pq=(S.pos&&S.pos.id===p.id)?S.pos:(S.rpos&&S.rpos.id===p.id)?S.rpos:null;
      if(pq&&pq.tagReq){pq.tagReq=false;
        if(p.tagCD<=S.time){
          let tb=null,tbd=1e9;
          for(const l of lop){if(tagged.has(l.id)||safe(l))continue;const d=hyp(l.x-p.x,l.y-p.y);if(d<=p.reach&&d<tbd){tbd=d;tb=l;}}
          if(tb){p.tagCD=S.time+TAG_CD;
            if(rand()<tagProb(p,tb,Math.max(tbd,.01))){tagged.set(tb.id,p);p.lastOK=S.time;if(p.team===0)buzz(25);else netSend({t:'buzz',p:25});}
            else{S.ev.miss[p.team]++;p.st.miss++;fx(tb,'net niet');sfx('miss',p.team);}
          }else fx(p,'te ver');
        }}
      continue;
    }
    if(p.tagCD>S.time)continue;
    let best=null,bd=1e9;
    for(const l of lop){if(tagged.has(l.id)||safe(l))continue;const d=hyp(l.x-p.x,l.y-p.y);if(d<=p.reach&&d<bd){bd=d;best=l;}}
    if(!best)continue;
    // het moment kiezen: komt de loper nog dichterbij en zit hij aan de rand, dan wacht een slim kind
    const ux=(best.x-p.x)/bd,uy=(best.y-p.y)/bd,closing=(best.vx-p.vx)*ux+(best.vy-p.vy)*uy<-.05;
    if(closing&&bd>p.reach*.85){
      if(p.eKey!==best.id||S.time-p.eT>1){p.eKey=best.id;p.eGrab=rand()<GRAB[lvKey(p)];}
      p.eT=S.time;
      if(!p.eGrab)continue;
    }
    p.eKey=null;
    p.tagCD=S.time+TAG_CD;
    if(rand()<tagProb(p,best,Math.max(bd,.01))){tagged.set(best.id,p);p.lastOK=S.time;}
    else{S.ev.miss[P]++;p.st.miss++;fx(best,'net niet');sfx('miss',p.team);}
  }
  const cross=lop.filter(l=>l.x>=CX);
  if(cross.length){
    const free=cross.filter(l=>!tagged.has(l.id));
    if(free.length)return endRound('lopers',free[0]);
    return tie(cross[0],tagged.get(cross[0].id));
  }
  let pi=S.kids.filter(k=>k.status==='prisoner').length;
  for(const [id,p] of tagged){
    const l=S.byId.get(id);l.status='prisoner';l.pIdx=pi++;l.orders=[];l.vx=l.vy=0;
    if(S.pos&&S.pos.id===l.id){buzz([40,40,40]);release(`<b>${l.name}</b> is getikt. Je laat los en stuurt de rest weer van bovenaf.`);}
    if(S.rpos&&S.rpos.id===l.id){netSend({t:'buzz',p:[40,40,40]});remoteRelease(`<b>${l.name}</b> is getikt. Je laat los en stuurt de rest weer van bovenaf.`);}
    S.ev.tags.push({p:p.name,l:l.name,y:l.y,t:S.rt,pt:p.team});
    p.st.tags++;l.st.got++;sfx('tag',p.team);S.marks.push([+l.x.toFixed(1),+l.y.toFixed(1),p.team,'t']);
    feedAll(`${p.name} tikt ${l.name}`,p.team);
    fx(l,'getikt');
    if(l.team===0)S.sel.delete(l.id);
  }
  if(tagged.size&&lop.every(l=>tagged.has(l.id)))endRound('pakkers');
}

function recordBoog(T){
  // de computerploeg (als lopers) onthoudt of er een boog in een hoek stond
  const kn=teamKnown(T).filter(e=>e.x>28);
  const on=kn.filter(e=>e.y>19.5).length,bo=kn.filter(e=>e.y<5.5).length;
  S.hists[T].boogSeen.push(on>=3&&on>=bo?'onder':bo>=3?'boven':null);
}
function endRound(winner,crosser){
  if(S.over)return;
  S.over=true;
  const L=lt(),P=1-L,wt=winner==='lopers'?L:P;
  S.score[wt]++;
  const wasTb=!!S.tb;S.tb=null;
  if(winner==='lopers'){S.ev.cross={name:crosser.name,y:crosser.y,team:L};crosser.st.cross++;S.marks.push([35,+crosser.y.toFixed(1),L,'c']);
    feedAll(`${crosser.name} is over C!`,L);if(isAI(P))S.hists[P].lScoresY.push(crosser.y);}
  if(isAI(L))recordBoog(L);
  learnRound(winner);
  S.pendingSwap=winner==='pakkers';
  SFX.point(wt===0);if(isHost())netSend({t:'sfx',n:'point',a:wt===1});
  for(const k of S.kids)if(k.status!=='bench')k.st.rounds++;
  const who=wt===0?'jouw ploeg':'de andere ploeg';
  const msg=w=>winner==='lopers'?`<b>${crosser.name}</b> is over C bij ${zoneOf(crosser.y)}. Punt voor ${w}.`:`Alle lopers getikt. Punt voor ${w}.`;
  say(msg(who),msg(wt===1?'jouw ploeg':'de andere ploeg'));
  showReport(winner,wt,wasTb);
}
function tie(l,p){
  S.over=true;
  say(`<b>${l.name}</b> raakt over C op hetzelfde moment dat ${p?p.name:'een pakker'} hem tikt. <b>Tiebreaker!</b>`);
  if(online())onlineTiebreak();else if(S.watch)watchTiebreak();else showTiebreak();
}

/* ---------- Simulatiestap ---------- */
function cpuReady(T){
  if(S.setupT<1.5)return false;
  if(S.role[T]==='lopers'||S.setupT>20)return true;
  return S.kids.every(k=>k.team!==T||k.status!=='active'||hyp(k.vx,k.vy)<.4||(k.intent&&hyp(k.intent.x-k.x,k.intent.y-k.y)<1));
}
function playerReady(){if(!S.setup||S.ready[0]||S.over)return;if(isGuest()){netSend({t:'ready'});return;}S.ready[0]=true;say('Jouw ploeg is <b>klaar</b>.','De andere ploeg is <b>klaar</b>.');syncUI();}
function step(dt){
  if(S.over)return;
  if(S.bell>0){
    const before=S.bell;S.bell-=dt;
    if(before>60&&S.bell<=60){feedAll('Nog 1 minuut tot de bel.','mg');}
    if(Math.ceil(before)!==Math.ceil(S.bell)&&S.bell<=10&&S.bell>0){feedAll(`Bel over ${Math.ceil(S.bell)}`,'mg');sfx('beep',false);}
    if(S.bell<=0){S.bell=0;return ringBell();}
  }
  applyPossession();applyRemote();
  S.time+=dt;
  if(S.setup){
    S.setupT+=dt;
    S.percT-=dt;if(S.percT<=0){S.percT=.1;perceive();}
    for(const k of S.kids){k.thinkT-=dt;if(k.thinkT<=0){k.thinkT+=.1;think(k);}}
    for(const k of S.kids)if(k.status==='active')move(k,dt);
    physics();
    if(S.auto0&&!S.ready[0]&&cpuReady(0))S.ready[0]=true;
    if(!S.ready[1]&&isAI(1)&&cpuReady(1)){S.ready[1]=true;if(!S.watch)say('De andere ploeg is <b>klaar</b>.','Jouw ploeg is <b>klaar</b>.');}
    if(online()&&S.setupT>=SETUP_MAX&&!(S.ready[0]&&S.ready[1])){S.ready=[true,true];say(`${SETUP_MAX} seconden opstellen zijn om: de ronde start.`);}
    if(S.ready[0]&&S.ready[1]){
      if(S.watch){const L=lt(),P=1-L,nm=t=>t===0?'Blauw':'Oranje';
        log(`${nm(P)} pakt: ${S.ev.tac[P]||'?'}. ${nm(L)} loopt: ${S.ev.tac[L]||'?'}.`);}
      S.setup=false;say('<b>Start!</b> Beide ploegen staan klaar.');sfx('whistle');}
    return;
  }
  S.rt+=dt;
  if(S.tb){S.tb.clock-=dt;if(S.tb.clock<=0)return tbTimeout();}
  else{S.block-=dt;if(S.block<=0)return blockTimeout();}
  if(S.cd&&!S.cdDone){const pc=Math.ceil(S.cd.left);S.cd.left-=dt;const nc=Math.ceil(S.cd.left);if(nc!==pc&&nc>0)sfx('beep',false);if(S.cd.left<=0)sfx('beep',true);if(S.cd.left<=0){S.cdDone=true;feedAll('B is niet meer veilig','mg');say('Aftellen klaar: <b>B is niet meer veilig</b>.');}}
  S.percT-=dt;if(S.percT<=0){S.percT=.1;perceive();}
  S.capT-=dt;if(S.capT<=0){S.capT=.1;captain();observe();}
  for(const k of S.kids){k.thinkT-=dt;if(k.thinkT<=0){k.thinkT+=.1;think(k);}}
  for(const k of S.kids){if(k.status==='active')move(k,dt);else if(k.status==='prisoner')walkPrisoner(k,dt);}
  physics();
  tagsAndEnd();
  S.calls=S.calls.filter(c=>S.time-c.t<6);
}
/* de bel: het spel stopt meteen, de lopende ronde telt niet */
function ringBell(){
  S.over=true;S.ended=true;S.tb=null;
  sfx('bell');
  say('<b>De bel!</b> De speeltijd is voorbij.');
  showEnd();
}
function mvpOf(t){
  const ks=S.kids.filter(k=>k.team===t);if(!ks.length)return null;
  return ks.slice().sort((a,b)=>(b.st.tags+b.st.cross*2)-(a.st.tags+a.st.cross*2)||a.st.got-b.st.got)[0];
}
function endData(me){
  const s=S.score,mine=s[me],their=s[1-me];
  const nm=t=>S.watch?(t===0?'Blauw':'Oranje'):(t===me?'Jij':'Je tegenstander');
  let title;
  if(mine===their)title='Gelijkspel';
  else if(S.watch)title=`${mine>their?'Blauw':'Oranje'} wint`;
  else title=mine>their?'Jouw ploeg wint':'De andere ploeg wint';
  const lines=[];
  for(const t of [me,1-me]){const k=mvpOf(t);if(!k)continue;
    const who=S.watch?(t===0?'Blauw':'Oranje'):(t===me?'Jouw ploeg':'Andere ploeg');
    lines.push(`${who}: <b>${esc(k.name)}</b>, ${k.st.tags} ${k.st.tags===1?'tik':'tikken'} en ${k.st.cross}× over C`);}
  const tg=S.kids.slice().sort((a,b)=>b.st.tags-a.st.tags)[0];
  if(tg&&tg.st.tags)lines.push(`Meeste tikken: <b>${esc(tg.name)}</b> (${tg.st.tags})`);
  lines.push(`Rondes gespeeld: ${S.round-(S.over&&!S.tb?1:0)}`);
  return {title,s:[mine,their],lines,marks:S.marks.map(m=>[m[0],m[1],m[2]===me?0:1,m[3]])};
}
function drawEndMap(marks){
  const c=document.getElementById('endMap'),g=c.getContext('2d'),sx=c.width/37,sy=c.height/25;
  g.clearRect(0,0,c.width,c.height);g.fillStyle=C.asfalt;g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='rgba(238,236,226,.6)';g.lineWidth=1.5;g.strokeRect(1,1,35*sx-1,25*sy-2);g.strokeRect(1,10*sy,5*sx,5*sy);
  g.beginPath();g.moveTo(35*sx,0);g.lineTo(35*sx,c.height);g.lineWidth=3;g.stroke();
  for(const [x,y,t,kind] of marks){g.fillStyle=t===0?C.mijn:C.ander;
    if(kind==='c'){const X=35*sx,Y=y*sy;g.beginPath();for(let i=0;i<10;i++){const r=i%2?3:7,a=-Math.PI/2+i*Math.PI/5;g.lineTo(X+Math.cos(a)*r,Y+Math.sin(a)*r);}g.closePath();g.fill();}
    else{g.globalAlpha=.75;g.beginPath();g.arc(x*sx,y*sy,3,0,7);g.fill();g.globalAlpha=1;}}
}
function renderEnd(d,host){
  document.getElementById('endTitle').textContent=d.title;
  document.getElementById('endS0').textContent=d.s[0];document.getElementById('endS1').textContent=d.s[1];
  document.getElementById('endMvp').innerHTML=d.lines.map(l=>`<li>${l}</li>`).join('');
  drawEndMap(d.marks);
  document.getElementById('endRematch').hidden=!host;document.getElementById('endNew').hidden=!host;
  document.getElementById('endWait').hidden=host;
  ['repOv','tbOv','statsOv'].forEach(id=>document.getElementById(id).hidden=true);
  document.getElementById('endOv').hidden=false;
}
function showEnd(){
  if(S.pos)release(null);if(S.rpos)remoteRelease(null);
  renderEnd(endData(0),!isGuest());
  if(isHost()){sendStats();netSend({t:'end',d:endData(1)});}
  syncUI();
}
function endAction(kind){
  document.getElementById('endOv').hidden=true;
  if(kind==='menu'){if(online())netLeave();S.over=true;S.started=false;setWatch(false);document.getElementById('startOv').hidden=false;return;}
  newGame(kind==='rematch');
  if(isHost())sendInit();
}
document.getElementById('endRematch').addEventListener('click',()=>endAction('rematch'));
document.getElementById('endNew').addEventListener('click',()=>endAction('new'));
document.getElementById('endMenu').addEventListener('click',()=>endAction('menu'));
function tbTimeout(){
  S.over=true;S.tb=null;S.pendingSwap=false;
  say('Tiebreaker: <b>3 minuten om</b>, geen beslissing. Gewone ronde, zelfde rollen.');
  showInfoReport('Tiebreaker zonder beslissing','De 3 minuten zijn om zonder punt. Er volgt een gewone ronde met dezelfde rollen.');
}
function blockTimeout(){
  S.over=true;S.pendingSwap=true;
  say('<b>10 minuten om</b>: er wordt gewisseld.');
  showInfoReport('10 minuten om','De pakkers hebben in deze 10 minuten niet alle lopers getikt. Er wordt gewisseld zonder punt.');
}
