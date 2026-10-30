'use strict';
/* ---------- Geluid (gemaakt in de browser, geen bestanden) ---------- */
const SFX=(()=>{
  let ac=null,on=true;
  try{on=localStorage.getItem('pel-sound')!=='0';}catch(e){}
  function ctx(){if(!on)return null;if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}if(ac.state==='suspended')ac.resume();return ac;}
  function tone(f,dur,type,vol,when,f2){if(S.demo)return;const a=ctx();if(!a)return;const t=a.currentTime+(when||0);
    const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||.15,t+.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02);}
  function noise(dur,vol,hp){if(S.demo)return;const a=ctx();if(!a)return;const t=a.currentTime;const b=a.createBuffer(1,Math.floor(a.sampleRate*dur),a.sampleRate);const d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=hp||1200;
    const g=a.createGain();g.gain.value=vol||.08;s.connect(f).connect(g).connect(a.destination);s.start(t);}
  let lastTag=0;
  return {
    get on(){return on;},
    set(v){on=v;try{localStorage.setItem('pel-sound',v?'1':'0');}catch(e){}if(v)ctx();},
    unlock(){ctx();},
    whistle(){for(let i=0;i<2;i++)tone(2350,.16,'square',.05,i*.2,2250);tone(2350,.42,'square',.05,.42,2200);},
    beep(last){tone(last?1320:880,last?.35:.08,'sine',.12);},
    tag(team){const n=performance.now();if(n-lastTag<60)return;lastTag=n;noise(.06,.12,1800);tone(team===0?520:300,.09,'triangle',.1);},
    miss(){noise(.12,.035,3500);},
    help(){tone(990,.07,'sine',.08);tone(990,.07,'sine',.08,.11);},
    point(mine){const seq=mine?[523,659,784]:[392,330,262];seq.forEach((f,i)=>tone(f,.18,'triangle',.12,i*.12));},
    ready(){tone(660,.07,'sine',.08);},
    bell(){for(let i=0;i<22;i++)tone(i%2?1180:1320,.07,'square',.045,i*.075);},
    chat(){tone(880,.06,'sine',.08);tone(1175,.08,'sine',.08,.07);}
  };
})();
['pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>SFX.unlock(),{once:true,capture:true}));
