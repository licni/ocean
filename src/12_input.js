/* ───────── 攝影機與操作 ───────── */
const reduced=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const cam=[SPAWN[0],heightAt(SPAWN[0],SPAWN[1])+4,SPAWN[1]],vel=[0,0,0];
let yaw=Math.atan2(TOUR[6][0]-SPAWN[0],-(TOUR[6][1]-SPAWN[1])),pitch=.3,focal=18,focalT=18;
let started=false,locked=false,everLocked=false,lockFail=false,drag=false,lamp=false,lampI=0,tour=!reduced,soundOn=false,usedTouch=false;
const keys=new Set();const joy={x:0,y:0,id:null,ox:0,oy:0};let vUp=0,vDown=0,lastLook=-99;
let tourI=0,tourYaw=yaw,tourT=0;
function nearestTour(){let b=0,bd=1e9;TOUR.forEach((w,i)=>{const d=distW(cam[0],cam[2],w[0],w[1]);if(d<bd){bd=d;b=i;}});tourI=(b+1)%TOUR.length;tourYaw=yaw;}
const sensK=()=>18/focal;
function look(dx,dy,s){yaw+=dx*s*sensK();pitch=clamp(pitch-dy*s*sensK(),-1.5,1.5);lastLook=time;}
function setTour(v){tour=v;if(v)nearestTour();$('bTour').setAttribute('aria-pressed',v?'true':'false');}
function setLamp(v){lamp=v;$('bLamp').setAttribute('aria-pressed',v?'true':'false');}
const hintEl=$('hint');let hintTimer=0;
function showHint(){if(usedTouch)return;const k=(a,b)=>'<span><kbd>'+a+'</kbd>'+b+'</span>';
  hintEl.innerHTML=k('W A S D','移動')+k(locked?'滑鼠':'按住滑鼠拖曳','視角')+k('滾輪','焦距')+k('Space／Q','上浮／下潛')+k('Shift','加速')+k('F','探照燈')+(locked?k('Esc','釋放滑鼠'):'');
  hintEl.classList.remove('off');clearTimeout(hintTimer);hintTimer=setTimeout(()=>hintEl.classList.add('off'),14000);}
function tryLock(){if(lockFail||locked||usedTouch||!canvas.requestPointerLock)return;try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{if(!everLocked){lockFail=true;if(started)showHint();}});}catch(e){lockFail=true;}}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(locked)everLocked=true;document.body.classList.toggle('locked',locked);if(started)showHint();});
document.addEventListener('pointerlockerror',()=>{if(!everLocked){lockFail=true;if(started)showHint();}});
function start(viaTouch){if(started||!ready)return;started=true;document.body.classList.add('started');$('intro').classList.add('gone');setTour(false);
  if(viaTouch||usedTouch){usedTouch=true;document.body.classList.add('touch');}else{tryLock();showHint();}
  try{canvas.focus({preventScroll:true});}catch(e){}}
$('intro').addEventListener('click',e=>{start(usedTouch||e.pointerType==='touch');});
window.addEventListener('touchstart',()=>{if(!usedTouch){usedTouch=true;document.body.classList.add('touch');hintEl.classList.add('off');}},{passive:true,capture:true});

canvas.addEventListener('mousedown',e=>{if(!started||usedTouch&&e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents)return;if(e.button===0){drag=true;tryLock();}});
window.addEventListener('mouseup',()=>{drag=false;});
window.addEventListener('mousemove',e=>{if(!started||!(locked||drag))return;const dx=e.movementX||0,dy=e.movementY||0;if(Math.abs(dx)>300||Math.abs(dy)>300)return;look(dx,dy,.0023);});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!started)return;const d=e.deltaMode===1?e.deltaY*32:e.deltaMode===2?e.deltaY*400:e.deltaY;focalT=clamp(focalT*Math.exp(-clamp(d,-240,240)*.0016),12,135);},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const MOVE=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyQ','KeyC','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(!started){if(e.code==='Enter'||e.code==='Space'){e.preventDefault();start(false);}return;}
  if(MOVE.has(e.code)){e.preventDefault();keys.add(e.code);if(tour&&e.code.indexOf('Shift')<0)setTour(false);return;}
  if(e.repeat)return;
  if(e.code==='KeyF')setLamp(!lamp);else if(e.code==='KeyT')setTour(!tour);else if(e.code==='KeyM')setSound(!soundOn);else if(e.code==='KeyH'){if(hintEl.classList.contains('off'))showHint();else hintEl.classList.add('off');}});
window.addEventListener('keyup',e=>{keys.delete(e.code);});
window.addEventListener('blur',()=>{keys.clear();drag=false;joy.id=null;joy.x=joy.y=0;vUp=vDown=0;lookT.clear();$('pad').classList.remove('on');});

/* 觸控：左下半部第一指＝搖桿，其餘手指＝視角；兩指＝縮放焦距 */
const lookT=new Map();let pinch0=0,pinchF=18;
const pad=$('pad'),knob=$('knob');
function syncTouches(e){const live=new Set();for(const t of e.touches)live.add(t.identifier);for(const id of[...lookT.keys()])if(!live.has(id))lookT.delete(id);
  if(joy.id!==null&&!live.has(joy.id)){joy.id=null;joy.x=joy.y=0;pad.classList.remove('on');}}
function pinchDist(){const a=[...lookT.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
canvas.addEventListener('touchstart',e=>{e.preventDefault();if(!started){start(true);return;}syncTouches(e);
  for(const t of e.changedTouches){if(joy.id===null&&t.clientX<innerWidth*.45&&t.clientY>innerHeight*.5){joy.id=t.identifier;joy.ox=t.clientX;joy.oy=t.clientY;joy.x=joy.y=0;
      pad.style.left=t.clientX+'px';pad.style.top=t.clientY+'px';knob.style.transform='translate(0px,0px)';pad.classList.add('on');$('padGhost').classList.add('hide');if(tour)setTour(false);}
    else lookT.set(t.identifier,{x:t.clientX,y:t.clientY});}
  if(lookT.size===2){pinch0=pinchDist();pinchF=focalT;}},{passive:false});
canvas.addEventListener('touchmove',e=>{e.preventDefault();{const n=lookT.size;syncTouches(e);if(lookT.size!==n)pinch0=0;}
  for(const t of e.changedTouches){if(t.identifier===joy.id){let dx=(t.clientX-joy.ox)/52,dy=(t.clientY-joy.oy)/52;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}joy.x=dx;joy.y=-dy;knob.style.transform='translate('+(dx*38)+'px,'+(dy*38)+'px)';}
    else if(lookT.has(t.identifier)){const p=lookT.get(t.identifier);if(lookT.size===1)look(t.clientX-p.x,t.clientY-p.y,.0048);p.x=t.clientX;p.y=t.clientY;}}
  if(lookT.size===2&&pinch0>10){focalT=clamp(pinchF*pinchDist()/pinch0,12,135);lastLook=time;}},{passive:false});
function tEnd(e){e.preventDefault();for(const t of e.changedTouches){if(t.identifier===joy.id){joy.id=null;joy.x=joy.y=0;pad.classList.remove('on');}lookT.delete(t.identifier);}syncTouches(e);pinch0=0;if(lookT.size===2){pinch0=pinchDist();pinchF=focalT;}}
canvas.addEventListener('touchend',tEnd,{passive:false});canvas.addEventListener('touchcancel',tEnd,{passive:false});
function hold(el,set){const on=e=>{e.preventDefault();set(1);el.classList.add('down');if(tour)setTour(false);try{el.setPointerCapture(e.pointerId);}catch(x){}},off=()=>{set(0);el.classList.remove('down');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('lostpointercapture',off);el.addEventListener('contextmenu',e=>e.preventDefault());}
hold($('bUp'),v=>{vUp=v;});hold($('bDown'),v=>{vDown=v;});
const blurBtn=b=>{try{b.blur();canvas.focus({preventScroll:true});}catch(e){}};
$('bLamp').addEventListener('click',e=>{setLamp(!lamp);blurBtn(e.currentTarget);});
$('bTour').addEventListener('click',e=>{setTour(!tour);blurBtn(e.currentTarget);});
$('bSnd').addEventListener('click',e=>{setSound(!soundOn);blurBtn(e.currentTarget);});
$('bQ').addEventListener('click',e=>{if(qAuto)setQuality(0,false);else if(qLevel<2)setQuality(qLevel+1,false);else setQuality(0,true);rscale=1;maxScale=1;leafK=1;blurBtn(e.currentTarget);});
const fsEl=document.documentElement,fsReq=fsEl.requestFullscreen||fsEl.webkitRequestFullscreen;
if(!fsReq||document.fullscreenEnabled===false)$('bFull').style.display='none';
$('bFull').addEventListener('click',e=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}else{const p=fsReq.call(fsEl);if(p&&p.catch)p.catch(()=>{$('bFull').style.display='none';});}}catch(x){$('bFull').style.display='none';}blurBtn(e.currentTarget);});

/* 聲音：低頻水聲與零星氣泡，預設關閉 */
let AC=null,master=null,bubT=0;
function setSound(v){soundOn=v;$('bSnd').setAttribute('aria-pressed',v?'true':'false');
  try{if(v&&!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C){soundOn=false;$('bSnd').style.display='none';return;}
      AC=new C();master=AC.createGain();master.gain.value=0;master.connect(AC.destination);
      const len=AC.sampleRate*5|0,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);let last=0;
      for(let i=0;i<len;i++){last=(last+.02*(Math.random()*2-1))/1.02;d[i]=last*3.2;}
      const fade=AC.sampleRate*.5|0;for(let i=0;i<fade;i++){const t=i/fade;d[i]=d[i]*t+d[len-fade+i]*(1-t);}
      const src=AC.createBufferSource();src.buffer=buf;src.loop=true;src.loopEnd=(len-fade)/AC.sampleRate;
      const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=300;const g=AC.createGain();g.gain.value=.9;
      const lfo=AC.createOscillator(),lg=AC.createGain();lfo.frequency.value=.13;lg.gain.value=110;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
      src.connect(lp);lp.connect(g);g.connect(master);src.start();}
    if(AC){if(v)AC.resume();master.gain.setTargetAtTime(v?.55:0,AC.currentTime,.4);}
  }catch(e){soundOn=false;$('bSnd').setAttribute('aria-pressed','false');}}
function blip(){if(!AC||!soundOn)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain(),f=260+Math.random()*500;
  o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*2.4,t+.09);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05+Math.random()*.05,t+.012);g.gain.exponentialRampToValueAtTime(.0005,t+.12);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+.14);}

