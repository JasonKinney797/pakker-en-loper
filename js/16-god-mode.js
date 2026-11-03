'use strict';
/* ---------- God Mode ---------- */
/* Alleen voor de maker. Het wachtwoord staat niet in de code, alleen een versleutelde versie (SHA-256).
   Instellingen per ploeg: snelheid, wendbaarheid, bereik, onaantastbaar. Plus geen mist, punten en klok.
   Werkt solo en online (ook als gast: de host past het toe). De lerende computer leert niet uit deze spellen. */
const GOD_H='ae3e4da6317eff81a5d633802171c89036038a9b613a2f2dae32f67ba40a6747';
const godT=()=>({spd:0,agi:-5,reach:0,inv:false});
S.god={on:false,fog:false,t:[godT(),godT()]};S.godUsed=false;
let godOK=false;try{godOK=localStorage.getItem('pel-god')===GOD_H;}catch(e){}
function sha256(ascii){
  const rr=(v,a)=>(v>>>a)|(v<<(32-a));const W=[];const K=[];const H=[];let p=0;
  const isC={};for(let c=2;p<64;c++){if(!isC[c]){for(let i=0;i<313;i+=c)isC[i]=c;H[p]=(Math.pow(c,.5)*4294967296)|0;K[p++]=(Math.pow(c,1/3)*4294967296)|0;}}
  let h=H.slice(0,8);
  const bytes=unescape(encodeURIComponent(ascii));const words=[];const bl=bytes.length*8;let s=bytes+'\x80';
  while(s.length%64-56)s+='\x00';
  for(let i=0;i<s.length;i++){const j=s.charCodeAt(i);words[i>>2]|=j<<((3-i)%4)*8;}
  words[words.length]=((bl/4294967296)|0);words[words.length]=bl;
  for(let j=0;j<words.length;){
    const w=words.slice(j,j+=16);const old=h.slice(0);
    for(let i=0;i<64;i++){
      const w15=W[i-15],w2=W[i-2];const a=h[0],e=h[4];
      const t1=h[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&h[5])^((~e)&h[6]))+K[i]+
        (W[i]=(i<16)?w[i]:(W[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+W[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
      const t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&h[1])^(a&h[2])^(h[1]&h[2]));
      h=[(t1+t2)|0].concat(h);h[4]=(h[4]+t1)|0;h.length=8;
    }
    for(let i=0;i<8;i++)h[i]=(h[i]+old[i])|0;
  }
  let r='';for(let i=0;i<8;i++)for(let j=3;j+1;j--){const b=(h[i]>>(j*8))&255;r+=(b<16?'0':'')+b.toString(16);}
  return r;
}
function godUnlock(pw){
  if(sha256('pel-god|'+pw)!==GOD_H)return false;
  godOK=true;try{localStorage.setItem('pel-god',GOD_H);}catch(e){}
  document.documentElement.classList.add('god');return true;
}
if(godOK)document.documentElement.classList.add('god');
/* echte waarden bewaren in k.b, de God-waarden erover leggen */
function godApply(){
  if(isGuest())return;
  for(const k of S.kids){
    const b=k.b||(k.b={top:k.top,agi:k.agi,reach:k.reach});
    const c=S.god.on?S.god.t[k.team]:null;
    k.top=c&&c.spd>0?c.spd:b.top;
    k.agi=c&&c.agi>=0?c.agi:b.agi;
    k.reach=c&&c.reach>0?c.reach:b.reach;
  }
  if(S.god.on)S.godUsed=true;
}
const godInv=k=>S.god.on&&!!S.god.t[k.team].inv;
const godFog=()=>S.god.on&&S.god.fog;
function godAct(a,t){   // t: ploeg vanuit het standpunt van de host
  if(a==='pt'){S.score[t]++;S.godUsed=true;}
  if(a==='bell+'&&S.bell>0)S.bell+=60;
  if(a==='bell-'&&S.bell>0)S.bell=Math.max(5,S.bell-60);
  if(a==='blk+')S.block+=60;
  if(a==='blk-')S.block=Math.max(5,S.block-60);
  syncUI();
}
/* een gast met God Mode: de host controleert de sleutel en draait de ploegen om */
function godFromGuest(s,m){
  if(m.h!==GOD_H)return;
  const f=s.team;
  if(m.act){godAct(m.act,(m.team|0)^f);return;}
  if(!m.cfg)return;
  const t=m.cfg.t.map(x=>({spd:clamp(+x.spd||0,0,12),agi:clamp(+x.agi,-5,100),reach:clamp(+x.reach||0,0,3),inv:!!x.inv}));
  S.god.on=!!m.cfg.on;S.god.t=f?[t[1],t[0]]:t;s.fog=S.god.on&&!!m.cfg.fog;
  godApply();
}
/* het paneel */
const godCfg={on:false,fog:false,t:[godT(),godT()]};   // wat jij instelt, vanuit jouw standpunt
function godSend(){
  if(isGuest()){netSend({t:'god',h:GOD_H,cfg:godCfg});return;}
  S.god.on=godCfg.on;S.god.fog=godCfg.fog;S.god.t=godCfg.t.map(x=>Object.assign({},x));godApply();
}
function godRow(t,key,lbl,min,max,step,fmtV){
  const v=godCfg.t[t][key];
  return `<label class="grow"><span>${lbl}: <b id="gv${t}${key}">${fmtV(v)}</b></span><input type="range" data-g="${t}" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
}
const gSpd=v=>v>0?(+v).toFixed(1)+' m/s':'normaal',gAgi=v=>v>=0?String(v):'normaal',gRch=v=>v>0?(+v).toFixed(1)+' m':'normaal';
function godRender(){
  const col=(t,nm)=>`<div class="gcol"><h4>${nm}</h4>
    ${godRow(t,'spd','Snelheid',0,12,.5,gSpd)}
    ${godRow(t,'agi','Wendbaarheid',-5,100,5,gAgi)}
    ${godRow(t,'reach','Bereik',0,3,.1,gRch)}
    <label class="gchk"><input type="checkbox" data-g="${t}" data-k="inv" ${godCfg.t[t].inv?'checked':''}> Onaantastbaar</label>
    <button data-ga="pt" data-gt="${t}">+1 punt</button></div>`;
  document.getElementById('godBody').innerHTML=`
    <label class="gchk gmain"><input type="checkbox" id="godOn" ${godCfg.on?'checked':''}> God Mode aan</label>
    <div class="gcols">${col(0,'Jouw ploeg')}${col(1,'Andere ploeg')}</div>
    <label class="gchk"><input type="checkbox" id="godFog" ${godCfg.fog?'checked':''}> Geen mist: je ziet iedereen</label>
    <div class="grow2"><span>Speeltijd</span><button data-ga="bell-">−1 min</button><button data-ga="bell+">+1 min</button>
      <span>Blok</span><button data-ga="blk-">−1 min</button><button data-ga="blk+">+1 min</button></div>
    <p class="hint">Op 0 (of helemaal links) blijft een waarde normaal. Online ziet de andere niets van God Mode.</p>`;
}
function openGod(){
  if(!godOK){document.getElementById('godLock').hidden=false;const i=document.getElementById('godPw');i.value='';document.getElementById('godErr').hidden=true;setTimeout(()=>i.focus(),30);return;}
  godRender();document.getElementById('godOv').hidden=false;
}
document.getElementById('godBody').addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='godOn'){godCfg.on=el.checked;godSend();return;}
  if(el.id==='godFog'){godCfg.fog=el.checked;godSend();return;}
  const t=+el.dataset.g,k=el.dataset.k;if(isNaN(t)||!k)return;
  if(k==='inv')godCfg.t[t].inv=el.checked;
  else{godCfg.t[t][k]=+el.value;const f={spd:gSpd,agi:gAgi,reach:gRch}[k];document.getElementById('gv'+t+k).textContent=f(+el.value);}
  godSend();
});
document.getElementById('godBody').addEventListener('click',e=>{
  const b=e.target.closest('[data-ga]');if(!b||!S.started||S.watch)return;
  const a=b.dataset.ga,t=+(b.dataset.gt||0);
  if(isGuest())netSend({t:'god',h:GOD_H,act:a,team:t});else godAct(a,t);
});
document.getElementById('godClose').addEventListener('click',()=>{document.getElementById('godOv').hidden=true;});
document.getElementById('godPwGo').addEventListener('click',()=>{
  const ok=godUnlock(document.getElementById('godPw').value);
  if(!ok){document.getElementById('godErr').hidden=false;return;}
  document.getElementById('godLock').hidden=true;toast('God Mode is ontgrendeld op dit toestel.');
});
document.getElementById('godPw').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('godPwGo').click();e.stopPropagation();});
document.getElementById('godPwX').addEventListener('click',()=>{document.getElementById('godLock').hidden=true;});
['godBtn','mGod'].forEach(id=>document.getElementById(id).addEventListener('click',openGod));
/* geheime ingang: 5 keer snel op de titel in het menu tikken */
{let n=0,t0=0;document.querySelector('.mtitle').addEventListener('click',()=>{const now=performance.now();if(now-t0>2500)n=0;t0=now;if(++n>=5){n=0;openGod();}});}
window.addEventListener('keydown',e=>{if(e.shiftKey&&e.key.toLowerCase()==='g'&&godOK&&!e.target.closest('input,textarea')){e.preventDefault();openGod();}},true);
