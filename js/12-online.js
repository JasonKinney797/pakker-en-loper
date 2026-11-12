'use strict';
/* ---------- Online: met vrienden spelen ---------- */
/* PeerJS, rechtstreeks tussen browsers. De host rekent het spel uit.
   Elke speler heeft een plaats (seat): een ploeg en, als er twee op een ploeg zitten, een eigen helft van de kinderen.
   Een gast ziet zijn eigen ploeg altijd als "ploeg 0": de host draait de ploegen om voor wie in ploeg 1 zit.
   Formaten: 1 tegen 1, 2 tegen 1, 1 tegen 2, 2 tegen 2, 2 tegen de computer. */
const SETUP_MAX=60, PEER_PREFIX='pakkerenloper-';
const FMT={'11':[[0],[1]],'21':[[0],[0],[1]],'12':[[0],[1],[1]],'22':[[0],[0],[1],[1]],'2c':[[0],[0]]};
const FMT_TXT={'11':'1 tegen 1','21':'2 tegen 1','12':'1 tegen 2','22':'2 tegen 2','2c':'2 tegen de computer'};
S.tp1={wd:3,bh:'onder'};S.vis1=new Set();S.visT0=new Set();S.visK={};S.tbp=null;S.pickUntil=0;
try{NET.gid=sessionStorage.getItem('pel-gid')||'';}catch(e){}
if(!NET.gid){NET.gid=Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('pel-gid',NET.gid);}catch(e){}}
const seatLive=s=>s&&(s.i===0||(s.joined&&!s.gone));
function liveSeats(t){return NET.seats.filter(s=>s.i>0&&s.joined&&!s.gone&&(t==null||s.team===t));}
function seatCaptain(t){return NET.seats.find(s=>s.team===t&&seatLive(s))||null;}
function seatOfKid(id){return NET.seats.find(s=>s.rp&&s.rp.id===id)||null;}
function rawSend(s,o){
  try{
    if(NET.bc)NET.bc.postMessage({from:NET.mode,to:s?s.gid:null,gid:NET.gid,d:o});
    else{const c=s?s.conn:NET.conn;if(c&&c.open)c.send(o);}
  }catch(e){}
}
function netTo(s,o){if(s&&s.i>0&&s.joined&&!s.gone)rawSend(s,o);}
function netTeam(t,o){if(isHost())for(const s of NET.seats)if(s.team===t)netTo(s,o);}
function net2(o0,o1){if(o0)netTeam(0,o0);if(o1)netTeam(1,o1);}
/* gast: naar de host. host: naar de andere ploeg (zoals vroeger) */
function netSend(o){if(isGuest())rawSend(null,o);else netTeam(1,o);}
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

/* wie bestuurt welk kind: elke plaats krijgt de helft van zijn ploeg (eerlijk verdeeld op snelheid).
   Is een speler weg, dan neemt zijn ploegmaat zijn kinderen over; is niemand van die ploeg er, dan de computer. */
function assignOwners(){
  for(const k of S.kids){k.own=null;k.notMine=false;}
  if(!isHost())return;
  for(const t of [0,1]){
    const seats=NET.seats.filter(s=>s.team===t);if(!seats.length)continue;
    const live=seats.filter(seatLive);
    const ks=S.kids.filter(k=>k.team===t).sort((a,b)=>b.top-a.top||a.id-b.id);
    ks.forEach((k,j)=>{let s=seats.length>1?seats[[0,1,1,0][j%4]]:seats[0];
      if(!seatLive(s))s=live[0]||null;k.own=s?s.i:null;});
  }
  for(const k of S.kids){k.notMine=k.team===0&&k.own!=null&&k.own!==0;if(k.notMine)S.sel.delete(k.id);}
  if(S.pos){const k=S.byId.get(S.pos.id);if(k&&k.notMine)release(null);}
}

/* ---- host ---- */
function startHost(){
  setWatch(false);S.tut=null;tutRender();NET.mode='host';NET.joined=false;NET.started=false;setOnline(true);
  NET.fmt=FMT[S.set.fmt]?S.set.fmt:'11';
  NET.seats=FMT[NET.fmt].map(([team],i)=>({i,team,conn:null,gid:i===0?NET.gid:null,joined:i===0,gone:false,lastRx:0,rp:null,rin:null,ready:false,fog:false}));
  document.getElementById('startOv').hidden=true;document.getElementById('lobbyOv').hidden=false;
  const st=document.getElementById('lobbyState');
  const show=code=>{NET.code=code;document.getElementById('lobbyCode').textContent=code;
    document.getElementById('lobbyLink').value=location.origin+location.pathname+'#join-'+code;lobbyRender();};
  lobbyRender();
  if(window.PEL_TRANSPORT==='bc'){show(window.PEL_CODE||newCode());openBC();return;}
  st.textContent='Verbinden met de server…';
  loadPeer().then(()=>{
    const tryOpen=()=>{
      const code=newCode();const peer=new (PeerCls())(PEER_PREFIX+code);NET.peer=peer;
      peer.on('open',()=>show(code));
      peer.on('connection',c=>{
        c.on('data',d=>{if(!c._seat){if(d&&d.t==='hello')hostAccept(c,String(d.gid||''));return;}onMsg(d,c._seat);});
        c.on('close',()=>{if(c._seat&&c._seat.conn===c)seatLeft(c._seat);});
      });
      peer.on('error',e=>{
        if(e&&e.type==='unavailable-id'){peer.destroy();tryOpen();return;}
        if(!NET.started)st.textContent='Er ging iets mis met de verbinding ('+(e&&e.type||'onbekend')+'). Probeer opnieuw, of kijk of je internet hebt.';
      });
      peer.on('disconnected',()=>{try{peer.reconnect();}catch(_){}});
    };
    tryOpen();
  }).catch(()=>{st.textContent='De online-module kon niet laden. Heb je internet? Online spelen werkt alleen via je eigen link, niet hier in Claude.';});
}
function openBC(){
  NET.bc=new BroadcastChannel('pel-'+NET.code);
  NET.bc.onmessage=e=>{const m=e.data;if(!m||m.from===NET.mode)return;
    if(NET.mode==='host'){
      let s=NET.seats.find(o=>o.i>0&&o.gid===m.gid&&o.joined&&!o.gone);
      if(!s&&m.d&&m.d.t==='hello'){hostAccept(null,m.gid);return;}
      if(s)onMsg(m.d,s);
    }else{if(m.to&&m.to!==NET.gid)return;onMsg(m.d);}
  };
}
function lobbyRender(){
  if(!isHost())return;
  const seats=NET.seats,n=seats.length,got=seats.filter(seatLive).length;
  document.getElementById('lobbyH').textContent=n>2?'Wachten op je vrienden':'Wachten op je vriend';
  document.getElementById('lobbyFmt').textContent=FMT_TXT[NET.fmt]+(NET.fmt==='2c'?'':'');
  const nm=t=>t===0?'Jouw ploeg':'Andere ploeg';
  document.getElementById('lobbySeats').innerHTML=[0,1].map(t=>{
    const ss=seats.filter(s=>s.team===t);
    const body=ss.length?ss.map(s=>`<li class="${seatLive(s)?'ok':''}">${s.i===0?'Jij':seatLive(s)?'Speler '+(s.i+1)+' is er':'Wachten op speler '+(s.i+1)+'…'}</li>`).join(''):'<li class="ok">De computer</li>';
    return `<div class="lseat t${t}"><b>${nm(t)}</b><ul>${body}</ul></div>`;}).join('');
  const st=document.getElementById('lobbyState');
  if(NET.code)st.textContent=got===n?'Iedereen is er. Het spel start…':`${got} van ${n} spelers. Het spel start zodra iedereen er is.`;
  const go=document.getElementById('lobbyGo');go.hidden=!(n>2&&got>=2&&got<n);
}
function hostAccept(c,gid){
  // terugkomer: dezelfde browser krijgt zijn plaats terug, anders de eerste vrije plaats
  let s=NET.seats.find(o=>o.i>0&&gid&&o.gid===gid&&(!o.joined||o.gone))
    ||NET.seats.find(o=>o.i>0&&!o.joined)||NET.seats.find(o=>o.i>0&&o.gone);
  if(!s){try{if(c){c.send({t:'full'});setTimeout(()=>c.close(),300);}else rawSend({gid,i:-1},{t:'full'});}catch(_){}
    if(!c&&NET.bc)NET.bc.postMessage({from:'host',to:gid,d:{t:'full'}});return;}
  const teamWasAI=NET.started&&isAI(s.team);
  const back=s.joined&&s.gone;
  s.conn=c;s.gid=gid;s.lastRx=performance.now();s.joined=true;s.gone=false;s.ready=false;s.rp=null;s.rin=null;
  if(c)c._seat=s;
  NET.joined=true;
  if(!NET.started){lobbyRender();if(NET.seats.every(seatLive))hostStartGame();else lobbyPing();return;}
  if(teamWasAI){for(const k of S.kids)if(k.team===s.team){k.orders=[];k.role='';k.role2='';k.switched=false;k.ai={};}defaultRolesFor(s.team);}
  assignOwners();
  const mate=NET.seats.find(o=>o!==s&&o.team===s.team&&seatLive(o));
  const txt=back?'Een speler is terug.':'Een nieuwe speler doet mee.';
  say(s.team===0?`${txt} Hij bestuurt nu een deel van jouw ploeg.`:`${txt} Hij speelt bij de andere ploeg.`,s.team===1?`${txt} Hij speelt bij jouw ploeg.`:`${txt} Hij speelt bij de andere ploeg.`);
  if(mate&&mate.i>0)netTo(mate,{t:'toast',m:'Je ploegmaat is er. Jullie hebben elk weer je eigen helft.'});
  sendInit(s);
}
function lobbyPing(){for(const s of liveSeats()){const got=NET.seats.filter(seatLive).length;
  netTo(s,{t:'wait',got,n:NET.seats.length,fmt:NET.fmt,team:s.team});}}
function hostStartGame(){
  if(NET.started)return;NET.started=true;
  document.getElementById('lobbyOv').hidden=true;
  S.started=true;document.getElementById('rolBox').dataset.for='';
  // wie niet kwam: zijn plaats valt weg (ploegmaat of computer neemt over)
  for(const s of NET.seats)if(s.i>0&&!s.joined){s.joined=true;s.gone=true;}
  newGame();
  sendInit();
}
function seatLeft(s){
  if(!s||s.i===0)return;
  if(!NET.started){if(!s.gone){s.joined=false;s.conn=null;s.gid=null;lobbyRender();}return;}
  if(s.gone)return;
  s.gone=true;s.conn=null;s.ready=false;seatRelease(s,null);
  assignOwners();
  const mate=seatCaptain(s.team);
  if(mate){
    const m='Je ploegmaat is weg. Jij bestuurt nu ook zijn kinderen, tot hij terugkomt via dezelfde link.';
    if(mate.i===0){toastLong(m,6000);log(m);}else{netTo(mate,{t:'toast',m,ms:6000});netTo(mate,{t:'log',h:m});}
  }else{
    toastLong('Je vriend is weg. De computer neemt zijn ploeg over tot hij terugkomt via dezelfde link.',6000);
    log('Je vriend heeft de verbinding verloren. De computer neemt zijn ploeg over.');
    planAI();
  }
  checkTeamReady(s.team);
}
function teamCounts(f){const c=[0,1].map(t=>NET.seats.filter(s=>s.team===t).length);return f?[c[1],c[0]]:c;}
function sendInit(only){
  if(!isHost())return;NET.tc=teamCounts(0);
  for(const s of (only?[only]:liveSeats())){
    const f=s.team;
    netTo(s,{t:'init',tc:teamCounts(f),set:{mode:S.set.mode,realism:S.set.realism},
      kids:S.kids.map(k=>{const b=k.b||k;return {id:k.id,name:k.name,team:k.team^f,top:b.top,acc:k.acc,agi:b.agi,stam:k.stam,react:k.react,reach:b.reach,level:k.level};})});
    netTo(s,{t:'set',bell:S.set.bell});
  }
  sendStats();sendSnap();
}
function sendStats(){if(!isHost())return;const o={t:'st',st:S.kids.map(k=>[k.id,k.st.tags,k.st.got,k.st.cross,k.st.miss,k.st.rounds])};net2(o,o);}
const r2=v=>Math.round(v*100)/100;
function seatVis(s){if(s.rp)return S.visK[s.rp.id]||new Set();return s.team===0?S.visT0:S.vis1;}
function snapFor(s){
  const f=s.team,V=seatVis(s),ks=[],sts=[];
  for(const k of S.kids){
    sts.push(k.status[0]);
    const show=k.team===f||k.status!=='active'||V.has(k.id)||s.fog;
    if(show)ks.push([k.id,r2(k.x),r2(k.y),r2(k.face),r2(k.vx),r2(k.vy),Math.round(k.energy*100),k.tired?1:0]);
  }
  const own=S.kids.filter(k=>k.team===f).map(k=>({id:k.id,o:k.orders,r:k.role,r2:k.role2,c:k.cond,cv:k.condVal,sw:k.switched}));
  const sw=a=>f?[a[1],a[0]]:[a[0],a[1]];
  return {t:'s',sc:sw(S.score),role:sw(S.role),blk:r2(S.block),tb:S.tb?r2(S.tb.clock):null,
    cd:S.cd&&!S.cdDone?r2(S.cd.left):null,cdDone:S.cdDone,setup:!!S.setup,setupT:r2(S.setupT||0),ready:S.ready?sw(S.ready):[false,false],me:!!s.ready,
    over:S.over,round:S.round,rt:r2(S.rt),bell:r2(S.bell||0),ended:!!S.ended,pos:s.rp?s.rp.id:null,st:sts.join(''),k:ks,own,
    mine:S.kids.filter(k=>k.own===s.i).map(k=>k.id)};
}
function sendSnap(){if(!isHost()||!NET.started)return;for(const s of liveSeats())netTo(s,snapFor(s));}
/* de kinderen die gasten zelf besturen (joystick) */
function applyRemote(){
  if(!isHost())return;
  for(const s of NET.seats){if(!s.rp)continue;const k=S.byId.get(s.rp.id);
    if(!k||k.status!=='active'||k.team!==s.team){seatRelease(s,null);continue;}
    if(isLoper(k))s.rp.tagReq=false;
    drive(k,s.rin);}
}
function seatRelease(s,msg){
  if(!s||!s.rp)return;const k=S.byId.get(s.rp.id);
  if(k){k.ctrl='cpu';k.intent=null;k.look=null;}
  s.rp=null;s.rin=null;
  if(msg)netTo(s,{t:'log',h:msg});
}
function remoteReleaseAll(msg){for(const s of NET.seats)seatRelease(s,msg);}
function buzzKid(k,p){if(S.pos&&S.pos.id===k.id){buzz(p);return;}const s=seatOfKid(k.id);if(s)netTo(s,{t:'buzz',p});}
/* klaar: een ploeg is klaar als iedereen van die ploeg op Klaar drukte */
function seatReady(s){
  if(!S.setup||S.over||S.ready[s.team])return;
  s.ready=true;
  const tell=(o,h)=>{if(o.i===0)log(h);else netTo(o,{t:'log',h});};
  const others=NET.seats.filter(o=>o!==s&&o.team===s.team&&seatLive(o));
  if(others.some(o=>!o.ready)){tell(s,'Jij bent klaar. Wachten op je ploegmaat.');for(const o of others)tell(o,'Je ploegmaat is <b>klaar</b>.');}
  checkTeamReady(s.team);syncUI();
}
function checkTeamReady(t){
  if(!isHost()||!S.setup||S.over||S.ready[t]||isAI(t))return;
  const need=NET.seats.filter(o=>o.team===t&&seatLive(o));
  if(need.length&&need.every(o=>o.ready)){S.ready[t]=true;
    if(t===0)say('Jouw ploeg is <b>klaar</b>.','De andere ploeg is <b>klaar</b>.');else say('De andere ploeg is <b>klaar</b>.','Jouw ploeg is <b>klaar</b>.');}
}
function hostHandle(m,s){
  if(!s)return;
  switch(m.t){
    case 'hello':case 'hb':break;
    case 'ready':seatReady(s);break;
    case 'cd':if(!S.over&&!S.setup&&!S.cd&&S.role[s.team]==='pakkers'){const k=S.byId.get(m.by);startCountdown(k&&k.team===s.team&&k.status==='active'?k:S.kids.find(o=>o.team===s.team&&o.status==='active'));}break;
    case 'mine':
      if(m.tp&&s.team===1){S.tp1.wd=clamp(+m.tp.wd||3,1,25);S.tp1.bh=m.tp.bh==='boven'?'boven':'onder';}
      for(const u of (m.kids||[])){const k=S.byId.get(u.id);if(!k||k.team!==s.team||k.own!==s.i||k.ctrl==='mens')continue;
        k.orders=Array.isArray(u.o)?u.o.slice(0,12).map(o=>Object.assign({},o)):[];k.ai.ph=null;
        if(u.r!==k.role||u.r2!==k.role2||u.c!==k.cond||u.cv!==k.condVal){
          k.role=u.r||'';k.role2=u.r2||'';k.cond=u.c||'cd';k.condVal=+u.cv||0;k.switched=false;
          k.post=u.post||{x:k.x,y:k.y};k.ai={since:S.time,side:rand()<.5?-1:1,ph:'out',phT:S.time};}
      }
      break;
    case 'possess':{
      const k=S.byId.get(m.id);
      if(!k||k.team!==s.team||k.own!==s.i||k.status!=='active'||(k.ctrl==='mens'&&!(s.rp&&s.rp.id===k.id))){netTo(s,{t:'toast',m:'Kies één kind van jouw ploeg dat nog meedoet.'});break;}
      if(!canSwitch()){netTo(s,{t:'toast',m:'Online kan overnemen alleen tijdens het opstellen.'});break;}
      seatRelease(s,null);
      k.ctrl='mens';k.orders=[];k.intent=null;k.look=null;s.rp={id:k.id,tagReq:false};s.rin=null;
      netTo(s,{t:'log',h:`Jij bestuurt nu <b>${k.name}</b>.`});break;}
    case 'release':{const k=s.rp&&S.byId.get(s.rp.id);seatRelease(s,k?`Je laat <b>${k.name}</b> los.`:null);break;}
    case 'in':if(s.rp)s.rin={dx:+m.dx||0,dy:+m.dy||0,mag:clamp(+m.mag||0,0,1),jog:!!m.jog};break;
    case 'tag':if(s.rp&&!S.over)s.rp.tagReq=true;break;
    case 'tbpick':if(S.tbp&&Array.isArray(m.ids)&&seatCaptain(s.team)===s){const ok=m.ids.filter(id=>{const k=S.byId.get(id);return k&&k.team===s.team;});
      if(ok.length===S.tbp.n[s.team])S.tbp.picks[s.team]=ok;}break;
    case 'bye':seatLeft(s);break;
    case 'msg':chatShow(m.i,false);for(const o of liveSeats())if(o!==s)netTo(o,{t:'msg',i:m.i});break;
    case 'god':godFromGuest(s,m);break;
  }
}

/* ---- gast ---- */
function startJoin(code){
  code=(code||'').toUpperCase().replace(/[^A-Z]/g,'');
  if(code.length!==4){netErr('Een code heeft 4 letters.');return;}
  netErr('');setWatch(false);NET.mode='guest';NET.code=code;setOnline(true);
  const btn=document.getElementById('startBtn');btn.disabled=true;btn.textContent='Verbinden…';
  const fail=msg=>{btn.disabled=false;btn.textContent='Meedoen';NET.mode='off';setOnline(false);netErr(msg);
    try{NET.peer&&NET.peer.destroy();}catch(_){}try{NET.bc&&NET.bc.close();}catch(_){}NET.peer=null;NET.conn=null;NET.bc=null;};
  NET.tmo=setTimeout(()=>{if(!NET.joined)fail('Geen verbinding na 15 seconden. Klopt de code, en staat het spel van je vriend nog open? Op sommige netwerken (school, mobiele data) lukt een rechtstreekse verbinding niet.');},15000);
  if(window.PEL_TRANSPORT==='bc'){openBC();netSend({t:'hello',gid:NET.gid});return;}
  loadPeer().then(()=>{
    const peer=new (PeerCls())();NET.peer=peer;
    peer.on('open',()=>{
      const c=peer.connect(PEER_PREFIX+code,{reliable:true,serialization:'json'});
      c.on('open',()=>{NET.conn=c;netSend({t:'hello',gid:NET.gid});});
      c.on('data',d=>onMsg(d));
      c.on('close',()=>{if(NET.joined)hostLost();});
    });
    peer.on('error',e=>{clearTimeout(NET.tmo);
      if(e&&e.type==='peer-unavailable')fail(`Geen spel gevonden met code ${code}. Kijk de code na.`);
      else if(!NET.joined)fail('Er ging iets mis met de verbinding ('+(e&&e.type||'onbekend')+').');
      else hostLost();});
  }).catch(()=>{clearTimeout(NET.tmo);fail('De online-module kon niet laden. Heb je internet? Online spelen werkt alleen via je eigen link, niet hier in Claude.');});
}
function hostLost(){
  if(NET.mode!=='guest')return;
  NET.mode='off';NET.joined=false;setOnline(false);S.over=true;S.started=false;
  try{NET.peer&&NET.peer.destroy();}catch(_){}try{NET.bc&&NET.bc.close();}catch(_){}NET.bc=null;
  ['tbOv','lobbyOv'].forEach(id=>document.getElementById(id).hidden=true);
  document.getElementById('startOv').hidden=false;
  const b=document.getElementById('startBtn');b.disabled=false;b.textContent='Meedoen';
  netErr('De verbinding met de host is weg. Het spel is gestopt. Vraag je vriend om de code en doe opnieuw mee.');
}
function netLeave(msg){
  if(isGuest())netSend({t:'bye'});else for(const s of liveSeats())netTo(s,{t:'bye'});
  try{NET.conn&&NET.conn.close();}catch(_){}try{NET.peer&&NET.peer.destroy();}catch(_){}try{NET.bc&&NET.bc.close();}catch(_){}
  NET.mode='off';NET.conn=null;NET.peer=null;NET.bc=null;NET.joined=false;NET.started=false;NET.seats=[];NET.tc=null;setOnline(false);
  S.over=true;S.started=false;document.getElementById('startOv').hidden=false;
  const b=document.getElementById('startBtn');b.disabled=false;
  for(const k of S.kids){k.own=null;k.notMine=false;}
  if(msg)netErr(msg);
}
function guestWait(m){
  NET.joined=true;clearTimeout(NET.tmo);
  if(S.started)return;
  document.getElementById('startOv').hidden=true;document.getElementById('lobbyOv').hidden=false;
  document.getElementById('lobbyH').textContent='Je bent binnen';
  document.getElementById('lobbyFmt').textContent=FMT_TXT[m.fmt]||'';
  document.getElementById('lobbyCode').textContent=NET.code;
  document.getElementById('lobbyLink').value=location.origin+location.pathname+'#join-'+NET.code;
  document.getElementById('lobbySeats').innerHTML='';document.getElementById('lobbyGo').hidden=true;
  document.getElementById('lobbyState').textContent=`${m.got} van ${m.n} spelers. Het spel start zodra iedereen er is, of als de host start.`;
}
function guestInit(m){
  NET.joined=true;clearTimeout(NET.tmo);NET.tc=m.tc||[1,1];
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
  S.score=m.sc;S.role=m.role;S.block=m.blk;S.tb=m.tb!=null?{clock:m.tb}:null;
  S.cd=m.cd!=null?{left:m.cd}:(m.cdDone?{left:0}:null);S.cdDone=m.cdDone;S.setup=m.setup;S.setupT=m.setupT;S.ready=m.ready;S.meReady=!!m.me;
  S.over=m.over;S.round=m.round;S.rt=m.rt;S.bell=m.bell;S.ended=m.ended;
  if(!m.ended&&!document.getElementById('endOv').hidden)document.getElementById('endOv').hidden=true;
  for(let i=0;i<S.kids.length;i++){const k=S.kids[i];const s=ST[m.st[i]]||'active';
    if(k.status!==s&&s!=='active'&&k.team===0)S.sel.delete(k.id);k.status=s;}
  if(m.mine){const mm=new Set(m.mine);let ch=false;
    for(const k of S.kids){const nm=k.team===0&&!mm.has(k.id);if(nm!==!!k.notMine){k.notMine=nm;ch=true;}if(nm)S.sel.delete(k.id);}
    if(ch)buildRoster();}
  S.vis0=new Set();
  for(const [id,x,y,f,vx,vy,en,ti] of m.k){const k=S.byId.get(id);if(!k)continue;
    const far=hyp(x-k.x,y-k.y)>3||(k.team===1&&!k._seen);
    k.tx=x;k.ty=y;k.face=f;k.vx=vx;k.vy=vy;k.energy=en/100;k.tired=!!ti;if(far){k.x=x;k.y=y;}
    if(k.team===1&&k.status==='active'){S.vis0.add(id);S.ghost.set(id,{x,y,t:S.time});k._seen=true;}}
  for(const k of S.kids)if(k.team===1&&!S.vis0.has(k.id))k._seen=false;
  for(const u of m.own){const k=S.byId.get(u.id);if(!k)continue;
    k.orders=u.o||[];k.role=u.r||'';k.role2=u.r2||'';k.cond=u.c||'cd';k.condVal=u.cv||0;k.switched=!!u.sw;
    NET.base[k.id]=mineKey(k);}
  const pid=m.pos;
  if(pid!=null&&(!S.pos||S.pos.id!==pid)){S.pos={id:pid,tagReq:false};S.keys.clear();}
  else if(pid==null&&S.pos){release(null);}
}
const mineKey=k=>JSON.stringify([k.orders,k.role,k.role2,k.cond,k.condVal,k.post||null]);
/* wat de gast zelf veranderde (bevelen, formaties, rollen) naar de host sturen; alleen zijn eigen kinderen */
function guestSyncMine(){
  if(!isGuest()||!NET.joined)return;
  const ch=[];
  for(const k of S.kids){if(k.team!==0||k.notMine)continue;const key=mineKey(k);if(NET.base[k.id]!==key){NET.base[k.id]=key;
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
    case 'wait':guestWait(m);break;
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
    case 'end':renderEnd(m.d,false);break;
    case 'feed':feedShow(m.x,m.c);break;
    case 'bn':banner(m.x,m.c);break;
    case 'msg':chatShow(m.i,false);break;
    case 'tbclose':document.getElementById('tbOv').hidden=true;S.pickUntil=0;break;
    case 'full':netErr('Dit spel zit al vol.');netLeave();break;
    case 'bye':hostLost();break;
  }
}
function onMsg(m,s){
  if(!m||typeof m!=='object')return;
  NET.lastRx=performance.now();if(s)s.lastRx=NET.lastRx;
  if(NET.mode==='host')hostHandle(m,s);else if(NET.mode==='guest')guestHandle(m);
}
/* per beeld: snapshots sturen, tiebreak en volgende ronde regelen, verbindingen bewaken */
function netFrame(dt){
  if(S.pickUntil){const left=Math.max(0,Math.ceil((S.pickUntil-performance.now())/1000));document.getElementById('tbClock').textContent=left+' s';}
  if(isGuest()){guestFrame(dt);return;}
  if(!isHost())return;
  const now=performance.now();
  for(const s of NET.seats)if(s.i>0&&s.joined&&!s.gone&&s.lastRx&&now-s.lastRx>8000)seatLeft(s);
  NET.sendT-=dt;
  if(!NET.started){if(NET.sendT<=0){NET.sendT=1;lobbyPing();}return;}
  if(NET.sendT<=0){NET.sendT=1/15;sendSnap();}
  if(S.tbp&&((S.tbp.picks[0]&&S.tbp.picks[1])||performance.now()>S.tbp.until))finishOnlineTiebreak();
  if(NET.nextAt&&performance.now()>NET.nextAt){NET.nextAt=0;nextRound();}
}
document.getElementById('lobbyCopy').addEventListener('click',()=>{
  const inp=document.getElementById('lobbyLink');
  try{navigator.clipboard.writeText(inp.value).then(()=>toast('Link gekopieerd.'),()=>{inp.select();toast('Selecteer en kopieer de link.');});}catch(_){inp.select();}
});
document.getElementById('lobbyCancel').addEventListener('click',()=>{netLeave();document.getElementById('lobbyOv').hidden=true;});
document.getElementById('lobbyGo').addEventListener('click',()=>{if(isHost()&&!NET.started)hostStartGame();});
window.addEventListener('pagehide',()=>{if(online())netLeave();});
