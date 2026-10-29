'use strict';
/* ---------- Oefenen: rondleiding voor nieuwe spelers ---------- */
const TUT=[
  {t:'Dit is de speelplaats',d:()=>`Jouw ploeg is blauw en staat in het kot B, links. Je bent loper: één loper over lijn C (rechts) is een punt. ${TOUCH?'Tik':'Klik'} op een van je kinderen.`,ok:()=>S.sel.size>=1},
  {t:'Meerdere kinderen kiezen',d:()=>TOUCH?'Druk lang op het veld en sleep een vak rond een paar kinderen.':'Sleep met de muis een vak rond een paar kinderen.',ok:()=>S.sel.size>=3},
  {t:'Een bevel geven',d:()=>TOUCH?'Tik op de grond in het kot: je kinderen lopen erheen. Tijdens het opstellen blijven lopers in B.':'Rechtsklik op de grond in het kot: je kinderen lopen erheen. Tijdens het opstellen blijven lopers in B.',ok:()=>S.kids.some(k=>k.team===0&&k.orders.some(o=>o.t==='move'))},
  {t:'Het tactiekbord',d:()=>`Kies ${TOUCH?'in het Paneel bij Formaties':'bij Formaties'} de Pijl, en sleep een pijl van B naar C. Je kinderen verzamelen aan het begin en vallen aan naar de punt.`,ok:()=>S.kids.some(k=>k.team===0&&k.orders.some(o=>o.t==='attack'))},
  {t:'Zelf een kind besturen',d:()=>TOUCH?'Dubbeltik op één van je kinderen. Jij bestuurt het nu, en je ziet alleen wat dat kind ziet.':'Dubbelklik op één van je kinderen. Jij bestuurt het nu, en je ziet alleen wat dat kind ziet.',ok:()=>!!S.pos},
  {t:'Klaar',d:()=>`Druk op Klaar${TOUCH?'':' (of Enter)'}. De ronde start als de andere ploeg ook klaar is. Pakkers tellen af: na 10 seconden is B niet meer veilig.`,ok:()=>!S.setup},
  {t:'Loop naar C',d:()=>TOUCH?'Leg je duim op de linkerhelft van het veld: een joystick verschijnt. Loop met je kind over lijn C, of laat je ploeg aanvallen.':'Loop met WASD of de pijltjes naar lijn C. Shift ingedrukt is joggen. Of laat je ploeg aanvallen.',ok:()=>S.score[0]>0||S.score[1]>0||S.round>1},
  {t:'Klaar met oefenen',d:()=>`Als pakker tik je zelf met ${TOUCH?'de Tik-knop':'Spatie'} en tel je af met ${TOUCH?'Aftellen':'T'}. Alles staat ook bij Toetsen. Veel plezier!`,ok:()=>false,last:true}
];
function tutRender(){
  const box=document.getElementById('tutBox');if(!S.tut){box.hidden=true;return;}
  const st=TUT[S.tut.i];
  box.innerHTML=`<b>${S.tut.i+1}/${TUT.length} · ${st.t}</b><div>${st.d()}</div><div class="row">${st.last?'<button data-tut="end">Naar het menu</button><button data-tut="play">Verder spelen</button>':'<button data-tut="skip">Volgende</button><button data-tut="stop">Stoppen</button>'}</div>`;
  box.hidden=false;
}
function tutTick(){
  if(!S.tut)return;const st=TUT[S.tut.i];
  if(!st.last&&st.ok()){if(!S.tut.done){S.tut.done=performance.now();}
    else if(performance.now()-S.tut.done>700){S.tut.i++;S.tut.done=0;tutRender();if(TUT[S.tut.i].t==='Zelf een kind besturen'&&!S.paused&&!S.setup)S.paused=true;}}
}
document.getElementById('tutBox').addEventListener('click',e=>{
  const b=e.target.closest('[data-tut]');if(!b)return;const a=b.dataset.tut;
  if(a==='skip'){S.tut.i=Math.min(TUT.length-1,S.tut.i+1);S.tut.done=0;tutRender();}
  else if(a==='stop'||a==='play'){S.tut=null;tutRender();}
  else if(a==='end'){S.tut=null;tutRender();S.over=true;S.started=false;document.getElementById('startOv').hidden=false;}
});
function startTutorial(){
  setWatch(false);
  Object.assign(S.set,{mode:'dyn',realism:false,start:'lopers',count:14,bell:0});
  S.tut={i:0,done:0};
  document.getElementById('startOv').hidden=true;S.started=true;document.getElementById('rolBox').dataset.for='';
  newGame();tutRender();
}
