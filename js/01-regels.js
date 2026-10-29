'use strict';
/* ---------- Constanten ---------- */
const W=35,H=25,CX=35;
const B={x0:0,y0:10,x1:5,y1:15};
const GUARD=3, TAG_CD=.6, CONTACT=.6;
/* kans dat een pakker al aan de rand van zijn bereik grijpt, terwijl de loper nog dichterbij komt */
const GRAB={slim:0,perfect:0,boven:.15,gem:.35,onder:.6,dom:1};
const NAMES=['Lucas','Noah','Arthur','Louis','Liam','Jules','Adam','Victor','Finn','Mathis','Lars','Wout','Seppe','Vic','Mats','Warre','Leon','Rune','Kobe','Ruben','Ilias','Amir','Rayan','Jasper','Senne','Emma','Olivia','Louise','Mila','Elena','Nina','Lena','Ella','Fien','Lore','Hanne','Julie','Marie','Noor','Lotte','Febe','Amber','Jana','Zoë','Yasmine','Sara','Lina','Axelle'];
/* Niveaus: scan-interval (s), kleinste gat dat gezien wordt (m), kans beste keuze, kans uit formatie per 10 s,
   kans in lokaas te trappen, seconden voor hulproep, kans dat er geroepen wordt, kans/snelheid reactie op hulp,
   leiband rond eigen plek (m), gevarenafstand (m), maximaal wachten als sneaker (s), marge van lokaas (m). */
const LV={
  slim:   {nm:'slim',            scan:1.0,gap:1.5,best:1.00,brk:.02,lure:.30,helpAt:1.0,helpP:1.0,resp:1.0, leash:1.8,danger:3.5,wait:25,margin:1.0},
  boven:  {nm:'boven gemiddeld', scan:1.5,gap:2.0,best:0.80,brk:.05,lure:.50,helpAt:1.5,helpP:1.0,resp:.95,leash:2.2,danger:3.2,wait:20,margin:.8},
  gem:    {nm:'gemiddeld',       scan:2.0,gap:2.5,best:0.55,brk:.12,lure:.70,helpAt:2.5,helpP:.9, resp:.75,leash:2.8,danger:3.0,wait:15,margin:.6},
  onder:  {nm:'onder gemiddeld', scan:3.0,gap:3.0,best:0.15,brk:.25,lure:.85,helpAt:3.5,helpP:.3, resp:.45,leash:3.5,danger:2.6,wait:12,margin:.4},
  dom:    {nm:'dom',             scan:4.0,gap:3.5,best:0.00,brk:.40,lure:1.0,helpAt:99, helpP:0,  resp:.25,leash:5.0,danger:2.2,wait:8, margin:.2},
  perfect:{nm:'perfect',         scan:0.5,gap:1.2,best:1.00,brk:0,  lure:0,  helpAt:1.0,helpP:1.0,resp:1.0, leash:1.6,danger:3.5,wait:25,margin:1.0}
};
const LV_ROLL=[['slim',.25],['boven',.30],['gem',.25],['onder',.13],['dom',.07]];
/* de andere ploeg is sterker: meer slimme kinderen, bijna geen domme */
const LV_ROLL_CPU=[['slim',.42],['boven',.35],['gem',.17],['onder',.05],['dom',.01]];
const LV_RANK={dom:0,onder:1,gem:2,boven:3,slim:4};
const ROLES_P=[['','geen rol'],['jager','jager'],['bewaker','bewaker'],['muur','muur'],['boogman','boogman'],['vangnet','vangnet']];
const ROLES_L=[['','geen rol'],['sneaker','sneaker'],['lokaas','lokaas']];

/* ---------- Hulpjes ---------- */
const rand=Math.random, hyp=Math.hypot;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function gauss(m,s){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return m+s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function wpick(pairs){let r=rand(),s=0;for(const [v,w] of pairs){s+=w;if(r<s)return v;}return pairs[pairs.length-1][0];}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
function distToB(x,y){const dx=Math.max(B.x0-x,0,x-B.x1),dy=Math.max(B.y0-y,0,y-B.y1);return hyp(dx,dy);}
function inB(x,y){return x>=B.x0&&x<=B.x1&&y>=B.y0&&y<=B.y1;}
function zoneOf(y){if(y<6)return 'de hoek boven';if(y<10)return 'boven';if(y<=15)return 'het midden';if(y<=19)return 'onder';return 'de hoek onder';}
function fmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
function speedLabel(k){return k.top>=6.7?'snel':k.top<=5.7?'traag':'gemiddeld';}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- Toestand ---------- */
const S={
  set:{mode:'dyn',realism:false,start:'lopers'},
  kids:[],byId:new Map(),time:0,rt:0,role:['lopers','pakkers'],score:[0,0],block:600,
  tb:null,cd:null,cdDone:false,paused:true,speed:1,over:true,round:0,
  hists:[{lScoresY:[],boogSeen:[]},{lScoresY:[],boogSeen:[]}],plans:[null,null],auto0:false,ev:null,
  sel:new Set(),groups:{},cmd:null,pace:'sprint',reportsOff:false,boogHoek:'onder',
  ghost:new Map(),vis0:new Set(),floats:[],pings:[],pendingSwap:false,percT:0,capT:0
};
try{S.reportsOff=localStorage.getItem('pel-rep-off')==='1';}catch(e){}

const lt=()=>S.role[0]==='lopers'?0:1;   // team dat loopt
const isLoper=k=>S.role[k.team]==='lopers';
function lv(k){return (!isAI(k.team)&&!S.set.realism)?LV.perfect:LV[k.level];}
const active=()=>S.kids.filter(k=>k.status==='active');
/* ---- online: wie bestuurt welke ploeg ----
   NET.mode: 'off' (tegen de computer), 'host' (jouw browser rekent het spel uit), 'guest' (je vriend) */
const NET={mode:'off',conn:null,peer:null,bc:null,code:'',lastRx:0,guestGone:false,sendT:0,inT:0,lastIn:'',base:{},nextAt:0,hbT:0,joined:false};
const online=()=>NET.mode!=='off';
const isGuest=()=>NET.mode==='guest';
const isHost=()=>NET.mode==='host';
const isAI=t=>t===1?!(isHost()&&!NET.guestGone):!!S.auto0;   // auto0: ook jouw ploeg door de computer (alleen voor tests)
const aiTeams=()=>[0,1].filter(isAI);

function rollKid(id,name,team){
  const top=clamp(gauss(6.2,.45),5,7.3), z=(top-6.2)/.45;
  return {id,name,team,top,
    acc:clamp(2.1-.17*z+gauss(0,.15),1.6,2.6),
    agi:Math.round(clamp(50+6*z+gauss(0,15),0,100)),
    stam:clamp(gauss(11.5,1.8),8,15),
    react:clamp(gauss(.35,.05),.25,.45),
    reach:1.1+rand()*.1,
    level:wpick(team===1&&!online()?LV_ROLL_CPU:LV_ROLL),
    x:0,y:0,vx:0,vy:0,px:0,py:0,face:0,energy:1,tired:false,status:'active',
    orders:[],role:'',role2:'',cond:'cd',condVal:0,switched:false,post:null,
    mem:new Map(),tagCD:0,lastTurn:-9,nextScan:rand()*2,scanUntil:0,intent:null,look:null,
    ai:{},thinkT:rand()*.1,lureT:null,lureId:null,lureSeen:0,lured:false,called:false,
    ctrl:'cpu',st:{tags:0,got:0,cross:0,miss:0,rounds:0}};
}

/* ---------- Spel opzetten ---------- */
function newGame(){
  const names=shuffle(NAMES.slice()).slice(0,25);
  const big=rand()<.5?0:1;               // welke ploeg heeft er 13
  S.kids=[];S.byId.clear();
  names.forEach((n,i)=>{const team=i<13?big:1-big;const k=rollKid(i,n,team);S.kids.push(k);S.byId.set(i,k);});
  S.role=[S.set.start,S.set.start==='lopers'?'pakkers':'lopers'];
  S.score=[0,0];S.block=600;S.round=0;S.tb=null;S.learn=[newLearn(),newLearn()];S.hists=[{lScoresY:[],boogSeen:[]},{lScoresY:[],boogSeen:[]}];
  if(S.pos)release(null);if(S.rpos)remoteRelease(null);S.sel.clear();S.groups={};S.time=0;
  logClear();
  applyDefaultRoles();
  const n0=S.kids.filter(k=>k.team===0).length,n1=S.kids.filter(k=>k.team===1).length;
  say(`Nieuwe klas gerold. Jouw ploeg telt <b>${n0}</b> kinderen, de andere <b>${n1}</b>.`,`Nieuwe klas gerold. Jouw ploeg telt <b>${n1}</b> kinderen, de andere <b>${n0}</b>.`);
  startRound();
  S.paused=false;
  buildRoster();syncUI();
}

function applyDefaultRoles(){
  for(const k of S.kids){k.role='';k.role2='';k.switched=false;k.ai={};}
  if(S.set.mode!=='rol')return;
  for(const t of [0,1]){if(isAI(t))continue;
    const mine=S.kids.filter(k=>k.team===t).sort((a,b)=>b.top-a.top);
    if(S.role[t]==='pakkers'){mine.forEach((k,i)=>{k.role=i===0?'jager':'muur';});}}
}

function startRound(){
  S.round++;S.rt=0;S.cd=null;S.cdDone=false;S.over=false;S.setup=true;S.setupT=0;S.ready=[false,false];S._nG=0;S.calls=[];S.floats=[];S.pings=[];
  S.ghost.clear();S.vis0.clear();
  S.plans=[null,null];S.ev={hov:[null,null],lures:[0,0],obsMassa:[null,null],key:['',''],tags:[],miss:[0,0],cross:null,tac:['',''],cdBy:null,cdAt:null,startClock:S.time};
  const L=lt(),P=1-L;
  const part=S.tb?S.tb.chosen:null;
  for(const k of S.kids){
    Object.assign(k,{vx:0,vy:0,energy:1,tired:false,orders:[],intent:null,look:null,tagCD:0,lureT:null,lureId:null,lured:false,called:false,lastTurn:-9});
    k.mem.clear();k.ai={since:0,side:rand()<.5?-1:1};k.switched=false;k.post=null;
    k.status=(part&&!part.has(k.id))?'bench':'active';
  }
  const lop=S.kids.filter(k=>k.team===L&&k.status==='active');
  const pak=S.kids.filter(k=>k.team===P&&k.status==='active');
  // lopers verspreid in B
  const spots=[];for(let gx=0;gx<5;gx++)for(let gy=0;gy<5;gy++)spots.push([.65+gx*.92,10.65+gy*.92]);
  shuffle(spots);
  lop.forEach((k,i)=>{const s=spots[i%spots.length];k.x=s[0]+(rand()-.5)*.2;k.y=s[1]+(rand()-.5)*.2;k.face=0;k.ai.spot={x:k.x,y:k.y};});
  pak.sort((a,b)=>a.id-b.id).forEach((k,i)=>{k.x=17.5+(rand()-.5)*1.5;k.y=pak.length===1?12.5:1.5+i*(22/(pak.length-1));k.face=Math.PI;});
  // bank voor de tiebreaker
  let bi=0;for(const k of S.kids)if(k.status==='bench'){k.x=2+bi*1.5;k.y=-1.7;bi++;}
  for(const k of S.kids){k.px=k.x;k.py=k.y;}
  for(const id of [...S.sel]){const k=S.byId.get(id);if(!k||k.status!=='active')S.sel.delete(id);}
  planAI();
  const lbl=S.tb?'Tiebreaker':'Ronde '+S.round;
  const rl=t=>`<b>${lbl}</b>: opstellen. Jouw ploeg ${S.role[t]==='lopers'?'loopt':'pakt'}. Druk op Klaar als je klaarstaat.`;
  say(rl(0),rl(1));
}

function swapRoles(){
  S.role=[S.role[1],S.role[0]];S.block=600;applyDefaultRoles();
  say(`Wissel: jouw ploeg is nu <b>${S.role[0]}</b>.`,`Wissel: jouw ploeg is nu <b>${S.role[1]}</b>.`);
}
