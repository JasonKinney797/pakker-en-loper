'use strict';
/* ---------- Online: met een vriend spelen ---------- */
/* PeerJS, rechtstreeks tussen twee browsers.
   De host rekent het spel uit. De gast stuurt zijn bevelen en krijgt 15 keer per seconde terug
   wat zijn ploeg ziet. Voor de gast is zijn eigen ploeg altijd "ploeg 0", zodat het hele scherm
   gewoon werkt: de host draait de ploegen om in alles wat hij stuurt. */
const SETUP_MAX=60, PEER_PREFIX='pakkerenloper-';
S.tp1={wd:3,bh:'onder'};S.rpos=null;S.rin=null;S.vis1=new Set();S.tbp=null;S.pickUntil=0;
function netSend(o){
  try{
    if(NET.bc)NET.bc.postMessage({from:NET.mode,d:o});
    else if(NET.conn&&NET.conn.open)NET.conn.send(o);
  }catch(e){}
}
function loadPeer(){
  return new Promise((res,rej)=>{
    if(window.Peer||window.peerjs)return res();
    const urls=['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js','https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'];let i=0;
    const next=()=>{if(i>=urls.length)return rej(new Error('load'));const s=document.createElement('script');s.src=urls[i++];s.onload=()=>res();s.onerror=next;document.head.appendChild(s);};
    next();
  });
}
const PeerCls=()=>window.Peer||(window.peerjs&&window.peerjs.Peer);
function newCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
function netErr(msg){const e=document.getElementById('netErr');e.textContent=msg;e.hidden=!msg;}
function setOnline(on){document.body.classList.toggle('online',on);if(on){S.speed=1;S.paused=false;}}

/* ---- host ---- */
function startHost(){
  setWatch(false);NET.mode='host';NET.guestGone=true;NET.joined=false;setOnline(true);
  document.getElementById('startOv').hidden=true;document.getElementById('lobbyOv').hidden=false;
  const st=document.getElementById('lobbyState');
  const show=code=>{NET.code=code;document.getElementById('lobbyCode').textContent=code;
    document.getElementById('lobbyLink').value=location.origin+location.pathname+'#join-'+code;
    st.textContent='Wachten op je vriend…';};
  if(window.PEL_TRANSPORT==='bc'){show(window.PEL_CODE||newCode());openBC();return;}
  st.textContent='Verbinden met de server…';
  loadPeer().then(()=>{
    const tryOpen=()=>{
      const code=newCode();const peer=new (PeerCls())(PEER_PREFIX+code);NET.peer=peer;
      peer.on('open',()=>show(code));
      peer.on('connection',c=>{c.on('open',()=>hostAccept(c));});
      peer.on('error',e=>{
        if(e&&e.type==='unavailable-id'){peer.destroy();tryOpen();return;}
        if(!NET.joined)st.textContent='Er ging iets mis met de verbinding ('+(e&&e.type||'onbekend')+'). Probeer opnieuw, of kijk of je internet hebt.';
      });
      peer.on('disconnected',()=>{try{peer.reconnect();}catch(_){}});
    };
    tryOpen();
  }).catch(()=>{st.textContent='De online-module kon niet laden. Heb je internet? Online spelen werkt alleen via je eigen link, niet hier in Claude.';});
}
function openBC(){
  NET.bc=new BroadcastChannel('pel-'+NET.code);
  NET.bc.onmessage=e=>{const m=e.data;if(!m||m.from===NET.mode)return;
    if(NET.mode==='host'&&m.d&&m.d.t==='hello'&&(NET.guestGone||!NET.joined))hostAccept(null);
    onMsg(m.d);};
}
function hostAccept(c){
  if(c){
    if(NET.conn&&NET.conn.open&&!NET.guestGone){try{c.send({t:'full'});c.close();}catch(_){}return;}
    NET.conn=c;c.on('data',onMsg);c.on('close',()=>{if(NET.conn===c)guestLeft();});
  }
  NET.lastRx=performance.now();
  const first=!NET.joined;NET.joined=true;NET.guestGone=false;
  document.getElementById('lobbyOv').hidden=true;
  if(first){S.started=true;document.getElementById('rolBox').dataset.for='';newGame();}
  else{
    for(const k of S.kids)if(k.team===1){k.orders=[];k.role='';k.role2='';k.switched=false;k.ai={};}
    applyDefaultRoles();say('Je vriend is terug en bestuurt zijn ploeg weer.');
  }
  sendInit();
}
function guestLeft(){
  if(NET.guestGone)return;NET.guestGone=true;
  if(S.rpos){const k=S.byId.get(S.rpos.id);if(k){k.ctrl='cpu';k.intent=null;}S.rpos=null;}
  toastLong('Je vriend is weg. De computer neemt zijn ploeg over tot hij terugkomt via dezelfde link.',6000);
  log('Je vriend heeft de verbinding verloren. De computer neemt zijn ploeg over.');
  planAI();
}
function sendInit(){
  netSend({t:'init',set:{mode:S.set.mode,realism:S.set.realism},
    kids:S.kids.map(k=>({id:k.id,name:k.name,team:k.team^1,top:k.top,acc:k.acc,agi:k.agi,stam:k.stam,react:k.react,reach:k.reach,level:k.level}))});
  sendStats();sendSnap();
}
function sendStats(){if(!isHost())return;netSend({t:'st',st:S.kids.map(k=>[k.id,k.st.tags,k.st.got,k.st.cross,k.st.miss,k.st.rounds])});}
const r2=v=>Math.round(v*100)/100;
function sendSnap(){
  if(!isHost()||NET.guestGone)return;
  const ks=[],sts=[];
  for(const k of S.kids){
    sts.push(k.status[0]);
    const own=k.team===1,show=own||k.status!=='active'||S.vis1.has(k.id);
    if(show)ks.push([k.id,r2(k.x),r2(k.y),r2(k.face),r2(k.vx),r2(k.vy),Math.round(k.energy*100),k.tired?1:0]);
  }
  const own=S.kids.filter(k=>k.team===1).map(k=>({id:k.id,o:k.orders,r:k.role,r2:k.role2,c:k.cond,cv:k.condVal,sw:k.switched}));
  netSend({t:'s',sc:[S.score[1],S.score[0]],role:[S.role[1],S.role[0]],blk:r2(S.block),tb:S.tb?r2(S.tb.clock):null,
    cd:S.cd&&!S.cdDone?r2(S.cd.left):null,cdDone:S.cdDone,setup:!!S.setup,setupT:r2(S.setupT||0),ready:S.ready?[S.ready[1],S.ready[0]]:[false,false],
    over:S.over,round:S.round,rt:r2(S.rt),pos:S.rpos?S.rpos.id:null,st:sts.join(''),k:ks,own});
}
/* het kind van de gast bewegen met zijn joystick */
function applyRemote(){
  if(!S.rpos)return;const k=S.byId.get(S.rpos.id);
  if(!k||k.status!=='active'||k.team!==1){remoteRelease(null);return;}
  if(isLoper(k))S.rpos.tagReq=false;
  drive(k,S.rin);
}
function remoteRelease(msg){
  if(!S.rpos)return;const k=S.byId.get(S.rpos.id);
  if(k){k.ctrl='cpu';k.intent=null;k.look=null;}
  S.rpos=null;S.rin=null;
  if(msg)netSend({t:'log',h:msg});
}
function hostHandle(m){
  switch(m.t){
    case 'hello':case 'hb':break;
    case 'ready':if(S.setup&&!S.ready[1]&&!S.over){S.ready[1]=true;say('De andere ploeg is <b>klaar</b>.','Jouw ploeg is <b>klaar</b>.');}break;
    case 'cd':if(!S.over&&!S.setup&&!S.cd&&S.role[1]==='pakkers'){const k=S.byId.get(m.by);startCountdown(k&&k.team===1&&k.status==='active'?k:S.kids.find(o=>o.team===1&&o.status==='active'));}break;
    case 'mine':
      if(m.tp){S.tp1.wd=clamp(+m.tp.wd||3,1,25);S.tp1.bh=m.tp.bh==='boven'?'boven':'onder';}
      for(const u of (m.kids||[])){const k=S.byId.get(u.id);if(!k||k.team!==1||k.ctrl==='mens')continue;
        k.orders=Array.isArray(u.o)?u.o.slice(0,12).map(o=>Object.assign({},o)):[];k.ai.ph=null;
        if(u.r!==k.role||u.r2!==k.role2||u.c!==k.cond||u.cv!==k.condVal){
          k.role=u.r||'';k.role2=u.r2||'';k.cond=u.c||'cd';k.condVal=+u.cv||0;k.switched=false;
          k.post=u.post||{x:k.x,y:k.y};k.ai={since:S.time,side:rand()<.5?-1:1,ph:'out',phT:S.time};}
      }
      break;
    case 'possess':{
      const k=S.byId.get(m.id);
      if(!k||k.team!==1||k.status!=='active'){netSend({t:'toast',m:'Kies één kind van jouw ploeg dat nog meedoet.'});break;}
      if(!canSwitch()){netSend({t:'toast',m:'Online kan overnemen alleen tijdens het opstellen.'});break;}
      if(S.rpos){const o=S.byId.get(S.rpos.id);if(o){o.ctrl='cpu';o.intent=null;}}
      k.ctrl='mens';k.orders=[];k.intent=null;k.look=null;S.rpos={id:k.id,tagReq:false};S.rin=null;
      netSend({t:'log',h:`Jij bestuurt nu <b>${k.name}</b>.`});break;}
    case 'release':{const k=S.rpos&&S.byId.get(S.rpos.id);remoteRelease(k?`Je laat <b>${k.name}</b> los.`:null);break;}
    case 'in':if(S.rpos)S.rin={dx:+m.dx||0,dy:+m.dy||0,mag:clamp(+m.mag||0,0,1),jog:!!m.jog};break;
    case 'tag':if(S.rpos&&!S.over)S.rpos.tagReq=true;break;
    case 'tbpick':if(S.tbp&&Array.isArray(m.ids)){const ok=m.ids.filter(id=>{const k=S.byId.get(id);return k&&k.team===1;});
      if(ok.length===S.tbp.n[1])S.tbp.picks[1]=ok;}break;
    case 'bye':guestLeft();break;
  }
}

/* ---- gast ---- */
function startJoin(code){
  code=(code||'').toUpperCase().replace(/[^A-Z]/g,'');
  if(code.length!==4){netErr('Een code heeft 4 letters.');return;}
  netErr('');setWatch(false);NET.mode='guest';NET.code=code;setOnline(true);
  const btn=document.getElementById('startBtn');btn.disabled=true;btn.textContent='Verbinden…';
  const fail=msg=>{btn.disabled=false;btn.textContent='Meedoen';NET.mode='off';setOnline(false);netErr(msg);
    try{NET.peer&&NET.peer.destroy();}catch(_){}NET.peer=null;NET.conn=null;};
  const tmo=setTimeout(()=>{if(!NET.joined)fail('Geen verbinding na 15 seconden. Klopt de code, en staat het spel van je vriend nog open? Op sommige netwerken (school, mobiele data) lukt een rechtstreekse verbinding niet.');},15000);
  if(window.PEL_TRANSPORT==='bc'){openBC();netSend({t:'hello'});return;}
  loadPeer().then(()=>{
    const peer=new (PeerCls())();NET.peer=peer;
    peer.on('open',()=>{
      const c=peer.connect(PEER_PREFIX+code,{reliable:true,serialization:'json'});
      c.on('open',()=>{NET.conn=c;netSend({t:'hello'});});
      c.on('data',onMsg);
      c.on('close',()=>{if(NET.joined)hostLost();});
    });
    peer.on('error',e=>{clearTimeout(tmo);
      if(e&&e.type==='peer-unavailable')fail(`Geen spel gevonden met code ${code}. Kijk de code na.`);
      else if(!NET.joined)fail('Er ging iets mis met de verbinding ('+(e&&e.type||'onbekend')+').');
      else hostLost();});
  }).catch(()=>{clearTimeout(tmo);fail('De online-module kon niet laden. Heb je internet? Online spelen werkt alleen via je eigen link, niet hier in Claude.');});
}
function hostLost(){
  if(NET.mode!=='guest')return;
  NET.mode='off';NET.joined=false;setOnline(false);S.over=true;S.started=false;
  try{NET.peer&&NET.peer.destroy();}catch(_){}
  document.getElementById('tbOv').hidden=true;
  document.getElementById('startOv').hidden=false;
  const b=document.getElementById('startBtn');b.disabled=false;b.textContent='Meedoen';
  netErr('De verbinding met de host is weg. Het spel is gestopt. Vraag je vriend om de code en doe opnieuw mee.');
}
function netLeave(msg){
  netSend({t:'bye'});
  try{NET.conn&&NET.conn.close();}catch(_){}try{NET.peer&&NET.peer.destroy();}catch(_){}try{NET.bc&&NET.bc.close();}catch(_){}
  NET.mode='off';NET.conn=null;NET.peer=null;NET.bc=null;NET.joined=false;setOnline(false);
  S.over=true;S.started=false;document.getElementById('startOv').hidden=false;
  const b=document.getElementById('startBtn');b.disabled=false;
  if(msg)netErr(msg);
}
function guestInit(m){
  NET.joined=true;
  S.set.mode=m.set.mode;S.set.realism=!!m.set.realism;
  S.kids=[];S.byId.clear();
  for(const d of m.kids){const k=rollKid(d.id,d.name,d.team);Object.assign(k,{top:d.top,acc:d.acc,agi:d.agi,stam:d.stam,react:d.react,reach:d.reach,level:d.level});
    k.tx=k.x;k.ty=k.y;S.kids.push(k);S.byId.set(k.id,k);}
  S.sel.clear();S.groups={};S.ghost.clear();S.vis0.clear();S.pos=null;
  S.started=true;S.paused=false;S.over=false;NET.base={};
  ['startOv','lobbyOv','repOv'].forEach(id=>document.getElementById(id).hidden=true);
  const b=document.getElementById('startBtn');b.disabled=false;b.textContent='Meedoen';
  document.getElementById('rolBox').dataset.for='';
  buildRoster();syncUI();
}
const ST={a:'active',p:'prisoner',b:'bench'};
function guestSnap(m){
  if(!S.kids.length)return;
  const wasSetup=S.setup;
  S.score=m.sc;S.role=m.role;S.block=m.blk;S.tb=m.tb!=null?{clock:m.tb}:null;
  S.cd=m.cd!=null?{left:m.cd}:(m.cdDone?{left:0}:null);S.cdDone=m.cdDone;S.setup=m.setup;S.setupT=m.setupT;S.ready=m.ready;
  S.over=m.over;S.round=m.round;S.rt=m.rt;
  for(let i=0;i<S.kids.length;i++){const k=S.kids[i];const s=ST[m.st[i]]||'active';
    if(k.status!==s&&s!=='active'&&k.team===0)S.sel.delete(k.id);k.status=s;}
  S.vis0=new Set();
  for(const [id,x,y,f,vx,vy,en,ti] of m.k){const k=S.byId.get(id);if(!k)continue;
    const far=hyp(x-k.x,y-k.y)>3||(k.team===1&&!k._seen);
    k.tx=x;k.ty=y;k.face=f;k.vx=vx;k.vy=vy;k.energy=en/100;k.tired=!!ti;if(far){k.x=x;k.y=y;}
    if(k.team===1&&k.status==='active'){S.vis0.add(id);S.ghost.set(id,{x,y,t:S.time});k._seen=true;}}
  for(const k of S.kids)if(k.team===1&&!S.vis0.has(k.id))k._seen=false;
  for(const u of m.own){const k=S.byId.get(u.id);if(!k)continue;
    k.orders=u.o||[];k.role=u.r||'';k.role2=u.r2||'';k.cond=u.c||'cd';k.condVal=u.cv||0;k.switched=!!u.sw;
    NET.base[k.id]=mineKey(k);}
  // overgenomen kind
  const pid=m.pos;
  if(pid!=null&&(!S.pos||S.pos.id!==pid)){S.pos={id:pid,tagReq:false};S.keys.clear();}
  else if(pid==null&&S.pos){const k=S.byId.get(S.pos.id);release(null);}
  if(wasSetup&&!S.setup){}
}
const mineKey=k=>JSON.stringify([k.orders,k.role,k.role2,k.cond,k.condVal,k.post||null]);
/* wat de gast zelf veranderde (bevelen, formaties, rollen) naar de host sturen */
function guestSyncMine(){
  if(!isGuest()||!NET.joined)return;
  const ch=[];
  for(const k of S.kids){if(k.team!==0)continue;const key=mineKey(k);if(NET.base[k.id]!==key){NET.base[k.id]=key;
    ch.push({id:k.id,o:k.orders,r:k.role,r2:k.role2,c:k.cond,cv:k.condVal,post:k.post||null});}}
  const tp={wd:+document.getElementById('wallDist').value||3,bh:S.boogHoek};const tk=JSON.stringify(tp);
  if(ch.length||NET.lastTp!==tk){NET.lastTp=tk;netSend({t:'mine',kids:ch,tp});}
}
function guestFrame(dt){
  S.time+=dt;
  const f=Math.min(1,dt*12);
  for(const k of S.kids){if(k.tx==null)continue;k.x+=(k.tx-k.x)*f;k.y+=(k.ty-k.y)*f;}
  NET.inT-=dt;NET.hbT-=dt;
  if(S.pos&&!S.over){const v=inputVec();const key=JSON.stringify([+v.dx.toFixed(2),+v.dy.toFixed(2),+v.mag.toFixed(2),v.jog]);
    if((key!==NET.lastIn&&NET.inT<=0)||NET.inT<-.25){NET.lastIn=key;NET.inT=.05;netSend({t:'in',dx:v.dx,dy:v.dy,mag:v.mag,jog:v.jog});NET.hbT=1;}}
  if(NET.hbT<=0){NET.hbT=1;netSend({t:'hb'});}
  if(NET.joined&&performance.now()-NET.lastRx>8000)hostLost();
}
function guestHandle(m){
  switch(m.t){
    case 'init':guestInit(m);break;
    case 's':guestSnap(m);break;
    case 'st':for(const [id,a,b,c,d,e] of m.st){const k=S.byId.get(id);if(k)k.st={tags:a,got:b,cross:c,miss:d,rounds:e};}
      if(!document.getElementById('statsOv').hidden)document.getElementById('statsBody').innerHTML=statsHTML(0,'Jouw ploeg','mijn')+statsHTML(1,'Andere ploeg','ander');break;
    case 'log':log(m.h);break;
    case 'toast':toastLong(m.m,m.ms||3200);break;
    case 'sfx':try{SFX[m.n](m.a);}catch(_){}break;
    case 'fx':S.floats.push({x:m.x,y:m.y,t:S.time,txt:m.txt});break;
    case 'ping':S.pings.push({x:m.x,y:m.y,t:S.time,team:0});break;
    case 'buzz':buzz(m.p);break;
    case 'tb':openPicker(0,m.n,performance.now()+m.ms,ids=>netSend({t:'tbpick',ids}));break;
    case 'tbclose':document.getElementById('tbOv').hidden=true;S.pickUntil=0;break;
    case 'full':netErr('Dit spel heeft al een tweede speler.');netLeave();break;
    case 'bye':hostLost();break;
  }
}
function onMsg(m){
  if(!m||typeof m!=='object')return;
  NET.lastRx=performance.now();
  if(NET.mode==='host')hostHandle(m);else if(NET.mode==='guest')guestHandle(m);
}
/* per beeld: snapshots sturen, tiebreak en volgende ronde regelen, verbinding bewaken */
function netFrame(dt){
  if(S.pickUntil){const left=Math.max(0,Math.ceil((S.pickUntil-performance.now())/1000));document.getElementById('tbClock').textContent=left+' s';}
  if(isGuest()){guestFrame(dt);return;}
  if(!isHost()||!NET.joined)return;
  NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=1/15;sendSnap();}
  if(S.tbp&&((S.tbp.picks[0]&&S.tbp.picks[1])||performance.now()>S.tbp.until))finishOnlineTiebreak();
  if(NET.nextAt&&performance.now()>NET.nextAt){NET.nextAt=0;nextRound();}
  if(!NET.guestGone&&performance.now()-NET.lastRx>8000)guestLeft();
}
document.getElementById('lobbyCopy').addEventListener('click',()=>{
  const inp=document.getElementById('lobbyLink');
  try{navigator.clipboard.writeText(inp.value).then(()=>toast('Link gekopieerd.'),()=>{inp.select();toast('Selecteer en kopieer de link.');});}catch(_){inp.select();}
});
document.getElementById('lobbyCancel').addEventListener('click',()=>{netLeave();document.getElementById('lobbyOv').hidden=true;});
window.addEventListener('pagehide',()=>{if(online())netSend({t:'bye'});});
