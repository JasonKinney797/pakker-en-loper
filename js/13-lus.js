'use strict';
/* ---------- Lus ---------- */
const FIX=1/60;let acc=0,last=performance.now(),uiT=0;
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;
  if(!S.paused&&!S.over){acc+=dt*S.speed;while(acc>=FIX){step(FIX);acc-=FIX;if(S.over){acc=0;break;}}}
  updateCam();
  draw();
  uiT-=dt;if(uiT<=0){uiT=.15;if(S.started)syncUI();}
  requestAnimationFrame(frame);
}
new ResizeObserver(resize).observe(stageEl);resize();
requestAnimationFrame(frame);
