/* ───────── 每幀更新 ───────── */
let time=0,lastT=0,ready=false,ema=16,scaleClock=0,goodFor=0,lastDown=-99,lastUp=-99,hudClock=0,drawn=0;
const VP=new Float32Array(16),fwd=[0,0,-1],right=[1,0,0],up=[0,1,0],planes=new Float32Array(24),eye=[0,0,0],tmp=[0,0,0],tmp2=[0,0,0],gN=[0,0,0];
let tanY=1,aspect=1;const NEAR=.12,FAR=1100;
function camera(){const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
  fwd[0]=sy*cp;fwd[1]=sp;fwd[2]=-cy*cp;right[0]=cy;right[1]=0;right[2]=sy;
  up[0]=right[1]*fwd[2]-right[2]*fwd[1];up[1]=right[2]*fwd[0]-right[0]*fwd[2];up[2]=right[0]*fwd[1]-right[1]*fwd[0];
  const bob=reduced?0:1;eye[0]=cam[0]+Math.sin(time*.5)*.03*bob;eye[1]=cam[1]+Math.sin(time*.83)*.045*bob;eye[2]=cam[2];
  aspect=W/H;const half=aspect>=1?12:Math.min(12/aspect,18);tanY=half/focal;
  const f=1/tanY,ex=-(right[0]*eye[0]+right[1]*eye[1]+right[2]*eye[2]),ey=-(up[0]*eye[0]+up[1]*eye[1]+up[2]*eye[2]),ez=fwd[0]*eye[0]+fwd[1]*eye[1]+fwd[2]*eye[2];
  const a=f/aspect,c=FAR/(NEAR-FAR),d=NEAR*FAR/(NEAR-FAR);
  // VP = Proj * View（column-major，深度範圍 0–1）
  const V=[right[0],up[0],-fwd[0],right[1],up[1],-fwd[1],right[2],up[2],-fwd[2],ex,ey,ez];
  for(let col=0;col<4;col++){const vx=V[col*3],vy=V[col*3+1],vz=V[col*3+2],vw=col<3?0:1;
    VP[col*4]=a*vx;VP[col*4+1]=f*vy;VP[col*4+2]=c*vz+d*vw;VP[col*4+3]=-vz;}
  const row=(i,k)=>VP[k*4+i];
  const set=(n,s,i,z)=>{let x=(z?0:row(3,0))+s*row(i,0),y=(z?0:row(3,1))+s*row(i,1),zz=(z?0:row(3,2))+s*row(i,2),w=(z?0:row(3,3))+s*row(i,3);const l=Math.hypot(x,y,zz)||1;planes[n*4]=x/l;planes[n*4+1]=y/l;planes[n*4+2]=zz/l;planes[n*4+3]=w/l;};
  set(0,1,0);set(1,-1,0);set(2,1,1);set(3,-1,1);set(4,1,2,true);set(5,-1,2);}
function inFrustum(x,y,z,r){for(let i=0;i<6;i++){if(planes[i*4]*x+planes[i*4+1]*y+planes[i*4+2]*z+planes[i*4+3]<-r)return false;}return true;}
const vis=[];let tileX=0,tileZ=0;
function visible(){vis.length=0;tileX=Math.floor(eye[0]/P);tileZ=Math.floor(eye[2]/P);const far=230*QT[qLevel].far;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const ox=(tileX+i)*P,oz=(tileZ+j)*P,tile=(j+1)*3+(i+1);
    for(let c=0;c<NCH;c++){const cx=ox+((c%CH)+.5)*CHS,cz=oz+(((c/CH)|0)+.5)*CHS,dx=Math.max(Math.abs(eye[0]-cx)-CHS/2,0),dz=Math.max(Math.abs(eye[2]-cz)-CHS/2,0),d=Math.hypot(dx,dz);
      if(d>far)continue;if(!inFrustum(cx,-33,cz,52))continue;vis.push(tile,c,d);}}}
// 近景陰影視窗：對準鏡頭前方 24 m 處，沿光的方向投到水面座標；位置對齊到陰影圖的像素，移動時影子邊緣才不會閃
const svis=[];let shOx=0,shOz=0;
function shadowWindow(){const S=SKY.sun,tex=SHW/shNRes,fy=Math.min(eye[1]+fwd[1]*24,-1),k=fy/S[1];
  const cx=eye[0]+fwd[0]*24-S[0]*k,cz=eye[2]+fwd[2]*24-S[2]*k;
  shOx=Math.floor((cx-SHW/2)/tex)*tex;shOz=Math.floor((cz-SHW/2)/tex)*tex;svis.length=0;
  const shx=66*S[0]/S[1],shz=66*S[2]/S[1],pad=12,x0=shOx-pad-Math.max(0,shx),x1=shOx+SHW+pad-Math.min(0,shx),z0=shOz-pad-Math.max(0,shz),z1=shOz+SHW+pad-Math.min(0,shz);
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const ox=(tileX+i)*P,oz=(tileZ+j)*P,tile=(j+1)*3+(i+1);
    for(let c=0;c<NCH;c++){const ax=ox+(c%CH)*CHS,az=oz+((c/CH)|0)*CHS;if(ax+CHS<x0||ax>x1||az+CHS<z0||az>z1)continue;
      const dx=Math.max(Math.abs(eye[0]-ax-CHS/2)-CHS/2,0),dz=Math.max(Math.abs(eye[2]-az-CHS/2)-CHS/2,0);svis.push(tile,c,Math.hypot(dx,dz));}}}
const TMODES=[['自動',-1],['正午',12],['黃昏',17.3],['夜晚',.4],['清晨',6.4]];let tMode=0,tHold=false;
function setTime(m){tMode=m%TMODES.length;tHold=false;clockHold=0;const b=$('bT');if(b)b.textContent='時間 '+TMODES[tMode][0];}
// 自動模式：白天約三分鐘、夜晚約七十秒走完一輪；指定時段時，時鐘快轉過去（光影跟著掃過）
function skyStep(dt){const S=SKY;
  if(!tHold){if(tMode===0){if(clockHold>0){if(started)clockHold-=dt;}else S.hour=(S.hour+dt*(S.night>.5?.17:.0667))%24;}
    else{const d=((TMODES[tMode][1]-S.hour+36)%24)-12,st=dt*5;S.hour=(S.hour+(Math.abs(d)<st?d:Math.sign(d)*st)+24)%24;}}
  skyEval(S.hour,time);}
// 六個設計過的視點：x, y, z, 水平角, 俯仰角, 焦距, 最適合的時刻（鍵盤 1–6 或「視點」按鈕）。時間在「自動」時，跳到視點會把時鐘撥到那個時刻並停留一會兒
const POSES=[[47,-41.5,215.5,2.51,.26,18,9.4],[70,-42.5,262,2.1,1.2,16,9.4],[222.4,-21.7,215.5,.95,.1,18,9.4],[106.2,-18.3,81.7,-2.6,-.02,18,9.4],[224,-40,120,-1.75,.25,18,17.4],[139,-25.5,72,-.75,.2,18,17.4]];
// clockHold＝自動時鐘暫停的剩餘秒數：剛開啟時停在第一個視點的時刻，按下「開始潛水」後才倒數
const HOLD=40;let poseI=-1,clockHold=HOLD;
function goPose(i){const n=POSES.length,p=POSES[((i%n)+n)%n];poseI=((i%n)+n)%n;if(tour)setTour(false);cam[0]=p[0];cam[1]=p[1];cam[2]=p[2];yaw=p[3];pitch=p[4];focal=focalT=p[5];vel[0]=vel[1]=vel[2]=0;if(tMode===0&&!tHold){SKY.hour=p[6];clockHold=HOLD;skyEval(SKY.hour,time);}expoStep(99);
  const b=$('bV');if(b)b.textContent='視點 '+(poseI+1);}
// 眼睛適應：鏡頭在海藻林裡、岩拱或洞穴下、或比較深的地方時，曝光慢慢提高；回到開闊處再降回來
let expoK=1,zoneCam=0;
function expoStep(dt){const x=cam[0],y=cam[1],z=cam[2];let kel=0,roof=0;
  // 視線前方 6–30 m、左右各約 20° 內有多少海藻（海藻林裡畫面偏暗）
  for(let d=6;d<=30;d+=6)for(let s=-1;s<=1;s++){const a=yaw+s*.35,px=x+Math.sin(a)*d,pz=z-Math.cos(a)*d,o=((Math.floor(wrapP(pz)/2)%160)*160+(Math.floor(wrapP(px)/2)%160))*2;if(kelpMap[o+1]-66>y-6)kel+=kelpMap[o];}
  kel=Math.min(1,kel*.55);
  for(let h=3;h<=27;h+=3)if(dAt(x,y+h,z)>0){roof=1-h/40;break;}
  // 仰望水面時畫面本來就亮：不加亮，還稍微收一點
  const upK=sstep(.45,1.15,pitch),tgt=(1+.40*Math.max(kel,roof)*(1-upK)+.12*clamp((-y-10)/32,0,1))*(1-.14*upK),k=1-Math.exp(-dt*.9);
  expoK+=(tgt-expoK)*k;zoneCam+=(zoneK(x,z)-zoneCam)*(1-Math.exp(-dt*1.5));}
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
function collide(){const gx=Math.floor(wrapP(cam[0])/HG),gz=Math.floor(wrapP(cam[2])/HG),m=.42;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const L=hitGrid[((gx+i+HN)%HN)+HN*((gz+j+HN)%HN)];
    for(let n=0;n<L.length;n++){const h=L[n],dx=wrapD(cam[0]-h[0]),dz=wrapD(cam[2]-h[2]),dy=cam[1]-h[1];
      if(h[5]){if(dy>-m&&dy<h[4]+m){const d=Math.hypot(dx,dz),Rr=h[3]+m;if(d<Rr&&d>1e-4){const k=(Rr-d)/d;cam[0]+=dx*k;cam[2]+=dz*k;}}}
      else{const rx=h[3]+m,ry=h[4]+m,q=Math.sqrt((dx*dx+dz*dz)/(rx*rx)+dy*dy/(ry*ry));if(q<1){if(q>1e-4){const k=1/q-1;cam[0]+=dx*k;cam[1]+=dy*k;cam[2]+=dz*k;}else cam[1]=h[1]+ry;}}}}
  // 岩石：直接查密度場，貼著岩面滑過去（洞穴、隧道、拱門都能鑽）
  for(let it=0;it<3;it++){const d=dAt(cam[0],cam[1],cam[2])+.8;if(d<=0)break;gradAt(cam[0],cam[1],cam[2],gN);
    cam[0]+=gN[0]*d*.9;cam[1]+=gN[1]*d*.9;cam[2]+=gN[2]*d*.9;const vn=vel[0]*gN[0]+vel[1]*gN[1]+vel[2]*gN[2];if(vn<0){vel[0]-=gN[0]*vn;vel[1]-=gN[1]*vn;vel[2]-=gN[2]*vn;}}
  if(dAt(cam[0],cam[1],cam[2])>2.5)cam[1]+=1.5;}
function player(dt){
  focal+=(focalT-focal)*(1-Math.exp(-dt*9));
  let mf=0,mr=0,mu=0;
  if(started){if(keys.has('KeyW')||keys.has('ArrowUp'))mf+=1;if(keys.has('KeyS')||keys.has('ArrowDown'))mf-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))mr+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))mr-=1;
    if(keys.has('Space')||keys.has('KeyE'))mu+=1;if(keys.has('KeyQ')||keys.has('KeyC'))mu-=1;mf+=joy.y;mr+=joy.x;mu+=vUp-vDown;}
  if(tour){
    // 沿著雕刻時挖好的曲線前進
    const i0=Math.floor(tourS)%tourLen,i1=(i0+1)%tourLen,i3=(i0+5)%tourLen,t=tourS-Math.floor(tourS),a=tourPts[i0],b=tourPts[i1],c=tourPts[i3];
    const tx=a[0]+wrapD(b[0]-a[0])*t,ty=a[1]+(b[1]-a[1])*t+.5*Math.sin(time*.21),tz=a[2]+wrapD(b[2]-a[2])*t;
    const ex=wrapD(tx-cam[0]),ey=ty-cam[1],ez=wrapD(tz-cam[2]),gap=Math.hypot(ex,ey,ez);
    if(gap<6)tourS=(tourS+2.4*dt/Math.max(.5,Math.hypot(wrapD(b[0]-a[0]),b[1]-a[1],wrapD(b[2]-a[2]))))%tourLen;
    const k=Math.min(1,dt*2.2),sp=Math.min(gap*1.4,gap<6?3.2:6.5),gl=gap||1;
    vel[0]+=(ex/gl*sp-vel[0])*k;vel[1]+=(ey/gl*sp-vel[1])*k;vel[2]+=(ez/gl*sp-vel[2])*k;
    if(time-lastLook>3.5){const dx=wrapD(c[0]-cam[0]),dz=wrapD(c[2]-cam[2]),dy=c[1]-cam[1],kk=1-Math.exp(-dt*1.2);
      yaw+=angDiff(Math.atan2(dx,-dz),yaw)*kk;pitch+=(clamp(Math.atan2(dy,Math.hypot(dx,dz))*.7,-.5,.5)-pitch)*kk;}
  }else{
    const l=Math.hypot(mf,mr,mu);if(l>1){mf/=l;mr/=l;mu/=l;}
    const acc=11*(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.3:1);
    vel[0]+=(fwd[0]*mf+right[0]*mr)*acc*dt;vel[1]+=(fwd[1]*mf+mu)*acc*dt;vel[2]+=(fwd[2]*mf+right[2]*mr)*acc*dt;
    const dr=Math.exp(-2.2*dt);vel[0]*=dr;vel[1]*=dr;vel[2]*=dr;}
  cam[0]+=vel[0]*dt;cam[1]+=vel[1]*dt;cam[2]+=vel[2]*dt;collide();
  if(cam[1]<Y0+2.5)cam[1]=Y0+2.5;
  if(cam[1]>-.9){cam[1]=-.9;if(vel[1]>0)vel[1]=0;}
  lampI+=((lamp?1:0)-lampI)*(1-Math.exp(-dt*8));
}
function instance(g,x,y,z,size,dx,dy,dz,ph,A,pat,B,roll){if(g.n>=g.cap)return;const o=g.n*16,D=g.data;g.n++;
  D[o]=x;D[o+1]=y;D[o+2]=z;D[o+3]=size;D[o+4]=dx;D[o+5]=dy;D[o+6]=dz;D[o+7]=ph;D[o+8]=A[0];D[o+9]=A[1];D[o+10]=A[2];D[o+11]=pat;D[o+12]=B[0];D[o+13]=B[1];D[o+14]=B[2];D[o+15]=roll;}
function life(dt){
  for(const k in groups)groups[k].n=0;
  const cx=eye[0],cy=eye[1],cz=eye[2],b=boids,u=b.uD;let np=0;
  for(let k=0;k<NSCH;k++){const s=schools[k];leader(s,time);b.scD[k*8]=s.lx;b.scD[k*8+1]=s.ly;b.scD[k*8+2]=s.lz;}
  device.queue.writeBuffer(b.scB,0,b.scD);
  for(const g of bigs){bigPos(g,time,tmp);bigPos(g,time+.25,tmp2);
    if((g.g===groups.shark||g.g===groups.dolphin)&&np<NPRED){const o=40+np*4;u[o]=tmp[0];u[o+1]=tmp[1];u[o+2]=tmp[2];u[o+3]=g.size*2.2+2.5;np++;}
    let dx=tmp2[0]-tmp[0],dy=tmp2[1]-tmp[1],dz=tmp2[2]-tmp[2];const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy=clamp(dy/l,-.5,.5);dz/=l;const l2=Math.hypot(dx,dy,dz);
    let ex=tmp[0]-cx,ez=tmp[2]-cz;ex-=P*Math.round(ex/P);ez-=P*Math.round(ez/P);
    if(ex*ex+ez*ez<200*200)instance(g.g,cx+ex,tmp[1],cz+ez,g.size,dx/l2,dy/l2,dz/l2,time*g.freq+g.th0*5,g.A,g.pat,g.B,-g.sign*g.bank);}
  for(;np<NPRED;np++)u[40+np*4+3]=0;
  u[0]=cx;u[1]=cy;u[2]=cz;u[3]=dt;u[4]=time;u[5]=b.frame++%100000;u[6]=NT*PER;u[7]=120;u.set(planes,8);
  u[32]=shOx;u[33]=shOz;u[34]=1/SHW;u[35]=QT[qLevel].dyn>=1?1:0;u[36]=SKY.sun[0];u[37]=SKY.sun[1];u[38]=SKY.sun[2];
  device.queue.writeBuffer(b.simU,0,u);device.queue.writeBuffer(b.cnt,0,b.zero);
  for(const k in groups){const g=groups[k];if(g.n)device.queue.writeBuffer(g.ib,0,g.data,0,g.n*16);}
}

/* ───────── 繪製 ───────── */
const LODF=[1,.56,.3,.17],wideK=[1,1,1,1];let DBG=1023,paused=false,offTex=null,offKey='';const OFF=FLAGS.includes('off');
const lodCls=d=>d<28?0:d<62?1:d<112?2:3;
function leafDraw(ps,list,L,maxD,lod,lf){ps.setVertexBuffer(1,L.buf);let tot=0;
  for(let i=0;i<list.length;i+=3){const c=list[i+1],d=list[i+2];if(!L.cnt[c]||d>maxD)continue;
    const cls=lod?lodCls(d):0,n=lod?Math.max(1,Math.ceil(L.cnt[c]*clamp(lf*LODF[cls],.05,1))):L.cnt[c];
    ps.setBindGroup(1,BG1,[slotOff(list[i],lod?cls:0)]);ps.draw((LEAFSEG+1)*2,n,0,L.start[c]);tot+=n;}return tot;}
// 近景陰影：視窗內的岩石、珊瑚、每一片海藻葉、大型生物與魚群，每幀照當下的姿勢重畫一次
function nearShadow(enc,q,lf){const L=svis,b=boids,far=q.far;
  const ps=enc.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:shNV,depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
  ps.setBindGroup(0,BG0N);
  ps.setPipeline(shPipes.terrain);ps.setVertexBuffer(0,TER.vb);ps.setIndexBuffer(TER.ib,'uint32');
  for(let i=0;i<L.length;i+=3){const c=L[i+1];if(!TER.cnt[c])continue;ps.setBindGroup(1,BG1,[slotOff(L[i],0)]);ps.drawIndexed(TER.cnt[c],1,TER.start[c]);}
  ps.setPipeline(shPipes.stat);
  for(const k of statics){if(!k.cast)continue;const maxD=165*far*k.far;let bound=false;
    for(let i=0;i<L.length;i+=3){const c=L[i+1];if(!k.cnt[c]||L[i+2]>maxD)continue;
      if(!bound){ps.setVertexBuffer(0,k.mesh.vb);ps.setVertexBuffer(1,k.ibuf);ps.setIndexBuffer(k.mesh.ib,'uint32');ps.setBindGroup(2,k.bg);bound=true;}
      ps.setBindGroup(1,BG1,[slotOff(L[i],0)]);ps.drawIndexed(k.mesh.count,k.cnt[c],0,0,k.start[c]);}}
  ps.setPipeline(shPipes.leaf);ps.setVertexBuffer(0,leafStrip);
  leafDraw(ps,L,LV_stem,190*far,false,lf);leafDraw(ps,L,LV_big,190*far,true,lf);if(q.dyn>=2)leafDraw(ps,L,LV_small,42,true,lf);
  ps.setPipeline(shPipes.swim);
  for(const n in groups){const gr=groups[n];if(!gr.n)continue;ps.setBindGroup(1,gr.bg);ps.setVertexBuffer(0,gr.mesh.vb);ps.setVertexBuffer(1,gr.ib);ps.setIndexBuffer(gr.mesh.ib,'uint32');ps.drawIndexed(gr.mesh.count,gr.n);}
  if(q.dyn>=1&&(DBG&1)){ps.setPipeline(shPipes.boid);const st=b.flip?0:1;
    ps.setBindGroup(1,b.drawBG[st][2]);ps.setVertexBuffer(0,b.g0.vb);ps.setIndexBuffer(b.g0.ib,'uint32');ps.drawIndexedIndirect(b.ind,40);
    ps.setBindGroup(1,b.drawBG[st][3]);ps.setVertexBuffer(0,b.g1.vb);ps.setIndexBuffer(b.g1.ib,'uint32');ps.drawIndexedIndirect(b.ind,60);}
  ps.end();}
function draw(){const q=QT[qLevel],far=q.far,sp=T.sp,pp=T.pp,V=T.V,S=SKY,aoOn=q.ao>0&&(DBG&64)!==0;drawn=0;
  const lf=q.leaf*leafK;for(let c=0;c<4;c++)wideK[c]=Math.min(1.9,Math.sqrt(1/clamp(lf*LODF[c],.05,1)));
  writeSlots(tileX,tileZ,wideK);
  const g=gData;g.set(VP,0);g[16]=eye[0];g[17]=eye[1];g[18]=eye[2];g[19]=0;g[20]=S.sun[0];g[21]=S.sun[1];g[22]=S.sun[2];g[23]=far;
  g[24]=right[0];g[25]=right[1];g[26]=right[2];g[27]=aoOn?.85:0;g[28]=up[0];g[29]=up[1];g[30]=up[2];g[31]=q.ao;g[32]=fwd[0];g[33]=fwd[1];g[34]=fwd[2];g[35]=zoneCam;
  g[36]=lampD[0];g[37]=lampD[1];g[38]=lampD[2];g[39]=lampI;g[40]=time;g[41]=q.bloom?1:0;g[42]=1.3/shRes;g[43]=q.steps;
  g[44]=W;g[45]=H;g[46]=1/W;g[47]=1/H;g[48]=NEAR;g[49]=FAR;g[50]=tanY*aspect;g[51]=tanY;
  g.set(S.sunC,52);g.set(S.skyC,56);g[59]=S.skyC[3]*expoK;g[60]=sunF[0];g[61]=sunF[1];g[62]=sunF[2];g[19]=Math.hypot(vel[0],vel[1],vel[2]);g[64]=shOx;g[65]=shOz;g[66]=1/SHW;g[67]=Math.max(1/shNRes,.045/SHW);g.set(S.cld,68);g.set(S.grd,72);
  device.queue.writeBuffer(gBuf,0,g);
  const enc=device.createCommandEncoder(),b=boids;let baked=false;
  // 太陽（或月亮）移動超過約 0.36° 就重新烘焙遠景陰影，分十幀畫進備用貼圖，畫完才換上
  if(!bake&&(DBG&512)&&sunF[0]*S.sun[0]+sunF[1]*S.sun[1]+sunF[2]*S.sun[2]<.99998)bakeBegin(S.sun,time);
  if(bake)baked=bakeSlice(enc,Math.ceil(bake.list.length/2/BAKEF));
  if(DBG&1){const cp=enc.beginComputePass();cp.setPipeline(b.simP);cp.setBindGroup(0,b.simBG[b.flip]);cp.dispatchWorkgroups(Math.ceil(NB/64));
    cp.setPipeline(b.cullP);cp.setBindGroup(0,b.cullBG[b.flip]);cp.dispatchWorkgroups(Math.ceil(NB/64));cp.end();
    for(let i=0;i<4;i++)enc.copyBufferToBuffer(b.cnt,i*4,b.ind,i*20+4,4);}
  if(DBG&256)nearShadow(enc,q,lf);
  const rp=enc.beginRenderPass({colorAttachments:[T.ms?{view:V.msc,resolveTarget:V.scene,loadOp:'clear',storeOp:'discard',clearValue:[0,0,0,1]}:{view:V.scene,loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}],
    depthStencilAttachment:{view:V.depth,depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
  rp.setBindGroup(0,BG0);
  rp.setPipeline(sp.bg);rp.draw(3);
  rp.setPipeline(sp.terrain);rp.setVertexBuffer(0,TER.vb);rp.setIndexBuffer(TER.ib,'uint32');
  if(DBG&2)for(let i=0;i<vis.length;i+=3){const c=vis[i+1];if(!TER.cnt[c])continue;rp.setBindGroup(1,BG1,[slotOff(vis[i],0)]);rp.drawIndexed(TER.cnt[c],1,TER.start[c]);}
  let cur=null;
  if(DBG&4)for(const k of statics){const pl=k.mat[0]>.5?sp.rock:sp.stat,maxD=165*far*k.far;let bound=false;
    for(let i=0;i<vis.length;i+=3){const c=vis[i+1];if(!k.cnt[c]||vis[i+2]>maxD)continue;
      if(!bound){if(cur!==pl){rp.setPipeline(pl);cur=pl;}rp.setVertexBuffer(0,k.mesh.vb);rp.setVertexBuffer(1,k.ibuf);rp.setIndexBuffer(k.mesh.ib,'uint32');rp.setBindGroup(2,k.bg);bound=true;}
      rp.setBindGroup(1,BG1,[slotOff(vis[i],0)]);rp.drawIndexed(k.mesh.count,k.cnt[c],0,0,k.start[c]);}}
  rp.setPipeline(sp.leaf);rp.setVertexBuffer(0,leafStrip);
  if(DBG&8)drawn=leafDraw(rp,vis,LV_stem,190*far,false,lf)+leafDraw(rp,vis,LV_big,190*far,true,lf)+leafDraw(rp,vis,LV_small,70*far,true,lf);
  rp.setPipeline(sp.swim);
  if(DBG&16)for(const n in groups){const gr=groups[n];if(!gr.n)continue;rp.setBindGroup(1,gr.bg);rp.setVertexBuffer(0,gr.mesh.vb);rp.setVertexBuffer(1,gr.ib);rp.setIndexBuffer(gr.mesh.ib,'uint32');rp.drawIndexed(gr.mesh.count,gr.n);}
  if(DBG&16){rp.setPipeline(sp.boid);const st=b.flip?0:1;
  rp.setBindGroup(1,b.drawBG[st][0]);rp.setVertexBuffer(0,b.g0.vb);rp.setIndexBuffer(b.g0.ib,'uint32');rp.drawIndexedIndirect(b.ind,0);
  rp.setBindGroup(1,b.drawBG[st][1]);rp.setVertexBuffer(0,b.g1.vb);rp.setIndexBuffer(b.g1.ib,'uint32');rp.drawIndexedIndirect(b.ind,20);
  b.flip^=1;}
  if(DBG&32){rp.setPipeline(sp.surf);rp.draw(4);
  rp.setPipeline(sp.jelly);rp.setVertexBuffer(0,jellyKind.mesh.vb);rp.setVertexBuffer(1,jellyKind.ibuf);rp.setIndexBuffer(jellyKind.mesh.ib,'uint32');
  for(let i=0;i<vis.length;i+=3){const c=vis[i+1];if(!jellyKind.cnt[c]||vis[i+2]>150)continue;rp.setBindGroup(1,BG1,[slotOff(vis[i],0)]);rp.drawIndexed(jellyKind.mesh.count,jellyKind.cnt[c],0,0,jellyKind.start[c]);}
  rp.setPipeline(sp.bub);rp.setVertexBuffer(0,bubbles.buf);
  for(let t=0;t<9;t++){const ox=(tileX+t%3-1)*P,oz=(tileZ+((t/3)|0)-1)*P,dx=Math.max(Math.abs(eye[0]-ox-P/2)-P/2,0),dz=Math.max(Math.abs(eye[2]-oz-P/2)-P/2,0);if(dx*dx+dz*dz>110*110)continue;rp.setBindGroup(1,BG1,[slotOff(t,0)]);rp.draw(4,bubbles.n);}
  rp.setPipeline(sp.glint);rp.setVertexBuffer(0,glints.buf);
  for(let i=0;i<vis.length;i+=3){const c=vis[i+1];if(!glints.cnt[c]||vis[i+2]>130)continue;rp.setBindGroup(1,BG1,[slotOff(vis[i],0)]);rp.draw(4,glints.cnt[c],0,glints.start[c]);}
  rp.setPipeline(sp.snow);rp.setVertexBuffer(0,snow.buf);rp.draw(4,snow.n);}
  rp.end();
  const full=(view,pl,bgp)=>{const p=enc.beginRenderPass({colorAttachments:[{view,loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});p.setPipeline(pl);p.setBindGroup(0,bgp);p.draw(3);p.end();};
  if(DBG&64){full(V.raysA,pp.rays,T.bRays[shCur]);full(V.raysB,pp.rblur,T.bRblur);}
  if(aoOn){full(V.aoA,pp.ao,T.bAO);full(V.aoB,pp.rblur,T.bAOblur);}
  if(q.bloom&&(DBG&128)){full(V.q0,pp.bdown,T.bDown);full(V.q1,pp.blur,T.bBl[0]);full(V.q0,pp.blur,T.bBl[1]);full(V.e1,pp.blur,T.bBl[2]);full(V.e0,pp.blur,T.bBl[3]);}
  if(OFF){if(offKey!==W+'x'+H){offKey=W+'x'+H;offTex=device.createTexture({size:[W,H],format:CFMT,usage:TU.RENDER_ATTACHMENT|TU.COPY_SRC});}full(offTex.createView(),pp.post,T.bPost);}
  else full(ctx.getCurrentTexture().createView(),pp.post,T.bPost);
  device.queue.submit([enc.finish()]);
  if(baked)bakeEnd();
}
const roD=$('roDepth'),roF=$('roFocal'),roH=$('roHead'),roTm=$('roTime'),roFps=$('roFps');let fpsMs=16;
function hud(){roD.textContent=(-cam[1]).toFixed(1);roF.textContent=String(Math.round(focal));let h=Math.round(yaw*180/Math.PI)%360;if(h<0)h+=360;roH.textContent=('00'+h).slice(-3);
  if(roTm){const m=Math.floor(SKY.hour*60)%1440;roTm.textContent=('0'+((m/60)|0)).slice(-2)+':'+('0'+m%60).slice(-2);}if(roFps)roFps.textContent=Math.round(1000/fpsMs)+' fps';}
// 只有在低於約 30 fps 時才自動降載：先降解析度，再降畫質級別，最後減少葉片
// rawMs＝實際經過的毫秒（不受每幀 60 ms 上限影響），慢的裝置才能在幾秒內降到跑得動的級別
function adapt(rawMs){ema+=(Math.min(rawMs,250)-ema)*.06;scaleClock+=rawMs/1000;if(scaleClock<1.2)return;scaleClock=0;
  if(ema>34){
    if(time-lastUp<14)maxScale=Math.max(.5,rscale-.14);
    if(ema>60&&qAuto&&qLevel<QMAX){setQuality(qLevel+1,true);rscale=Math.min(1,maxScale);}
    else if(rscale>.74)rscale-=.14;else if(qAuto&&qLevel<QMAX){setQuality(qLevel+1,true);rscale=Math.min(1,maxScale);}else if(leafK>.55)leafK-=.2;else if(rscale>.5)rscale=Math.max(.5,rscale-.1);
    lastDown=time;goodFor=0;ema=24;}
  else if(ema<21&&rscale<maxScale){goodFor++;if(goodFor>=6&&time-lastDown>10){rscale=Math.min(maxScale,rscale+.14);goodFor=0;lastUp=time;}}
  else goodFor=0;}
let frames=0,errRetry=0;
// 探照燈方向稍慢地跟著視線（像手持的燈）
const lampD=[0,0,-1];function lampFollow(dt){const k=1-Math.exp(-dt*7);for(let i=0;i<3;i++)lampD[i]+=(fwd[i]-lampD[i])*k;const l=Math.hypot(lampD[0],lampD[1],lampD[2])||1;for(let i=0;i<3;i++)lampD[i]/=l;}
function tick(dt){resize();player(dt);camera();lampFollow(dt);expoStep(dt);skyStep(dt);visible();shadowWindow();life(dt);draw();}
function frame(now){requestAnimationFrame(frame);if(lost||paused)return;
  // 開始繪製後才冒出來的 WebGPU 錯誤（少數瀏覽器的實作差異）：改用 WebGL2 版重新載入一次
  if(gpuErr&&frames<400&&!OFF&&!errRetry&&qLevel===0){errRetry=frames+1;console.warn('極致畫質失敗，改用高畫質：'+gpuErr);setQuality(1,qAuto);}
  if(errRetry&&frames<errRetry+6)gpuErr=null;          // 換畫質前已送出的幀，晚到的錯誤不算
  if(gpuErr&&frames<400&&!OFF){lost=true;try{location.hash='#gl2';location.reload();}catch(e){fail('這個瀏覽器的 WebGPU 無法正常繪製，請在網址後面加上 #gl2 重新開啟。');}return;}frames++;
  const raw=lastT?now-lastT:16;lastT=now;const dt=Math.min(raw,60)/1000;time+=dt;
  fpsMs+=(Math.min(raw,500)-fpsMs)*.06;
  tick(dt);
  if(raw<1500&&frames>30)adapt(raw);
  hudClock+=dt;if(hudClock>.1){hudClock=0;hud();}
  if(soundOn){bubT-=dt;if(bubT<0){bubT=.4+Math.random()*2.6;blip();if(Math.random()<.4)setTimeout(blip,90);}}
}
setQuality(qLevel,true);
// 一開始停在第一個視點（設計過的畫面），自動巡航改由按鈕或 T 鍵啟動
setTour(false);{const p=POSES[0];cam[0]=p[0];cam[1]=p[1];cam[2]=p[2];yaw=p[3];pitch=p[4];focal=focalT=p[5];poseI=0;expoStep(99);}
resize();camera();lampD[0]=fwd[0];lampD[1]=fwd[1];lampD[2]=fwd[2];visible();shadowWindow();
mark('ready');ready=true;{const go=$('go');go.disabled=false;go.textContent='開始潛水';const r=$('rend');if(r)r.textContent='WebGPU';
  const t=$('roT');if(t)t.style.display='';document.querySelectorAll('.gpuOnly').forEach(e=>e.style.display='');const bt=$('bT');if(bt){bt.style.display='';bt.addEventListener('click',e=>{setTime(tMode+1);blurBtn(e.currentTarget);});}
  addEventListener('keydown',e=>{if(!started||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='KeyN')setTime(tMode+1);else if(/^Digit[1-6]$/.test(e.code))goPose(+e.code[5]-1);});
  const bv=$('bV');if(bv){bv.style.display='';bv.addEventListener('click',e=>{goPose(poseI+1);blurBtn(e.currentTarget);});}
  const bl=$('blurb');if(bl)bl.textContent='四十公尺高的海藻森林、鑽得進去的岩洞與隧道、石拱、深谷、沉船和石柱遺跡，六萬多條會躲鯊魚的魚，還有從清晨到月夜不停變化的光影，都在這一個檔案裡。';}
window.__sea={cam,dbg:async m=>{paused=true;DBG=m;resize();camera();lampFollow(1);expoStep(99);skyStep(0);visible();shadowWindow();life(.016);const t=performance.now();draw();await device.queue.onSubmittedWorkDone();return Math.round(performance.now()-t);},
  sim:(n,dt)=>{for(let i=0;i<n;i++){time+=dt;player(dt);camera();}return{cam:[...cam],yaw,pitch,d:dAt(cam[0],cam[1],cam[2]),tourS};},
  step:async(n,dt)=>{for(let i=0;i<n;i++){time+=dt;tick(dt);hud();}await device.queue.onSubmittedWorkDone();return gpuErr;},
  shot:async()=>{const bpr=Math.ceil(W*4/256)*256,rb=device.createBuffer({size:bpr*H,usage:BU.MAP_READ|BU.COPY_DST}),e=device.createCommandEncoder();e.copyTextureToBuffer({texture:offTex},{buffer:rb,bytesPerRow:bpr},[W,H]);device.queue.submit([e.finish()]);
    await rb.mapAsync(GPUMapMode.READ);const a=new Uint8Array(rb.getMappedRange()),o=new Uint8Array(W*H*4);for(let y=0;y<H;y++)o.set(a.subarray(y*bpr,y*bpr+W*4),y*W*4);rb.unmap();rb.destroy();
    let s='';for(let i=0;i<o.length;i+=8192)s+=String.fromCharCode.apply(null,o.subarray(i,i+8192));return{w:W,h:H,fmt:CFMT,b64:btoa(s)};},start:()=>start(false),get yaw(){return yaw;},set yaw(v){yaw=v;},get pitch(){return pitch;},set pitch(v){pitch=v;},get focal(){return focal;},set focal(v){focal=focalT=v;},
  get tour(){return tour;},set tour(v){setTour(v);},set lamp(v){setLamp(v);lampI=v?1:0;const cp=Math.cos(pitch);lampD[0]=Math.sin(yaw)*cp;lampD[1]=Math.sin(pitch);lampD[2]=-Math.cos(yaw)*cp;},get time(){return time;},set time(v){time=v;},set quality(v){setQuality(v,false);},get hour(){return SKY.hour;},set hour(v){SKY.hour=v;tHold=true;skyEval(v,time);},set tmode(v){setTime(v);},POSES,pose:i=>goPose(i),settle:()=>expoStep(99),clock:(n,dt)=>{for(let i=0;i<n;i++)skyStep(dt);return[SKY.hour,clockHold];},get expo(){return[+expoK.toFixed(3),+zoneCam.toFixed(3)];},floorsAt,kelpMap,rebake:()=>{shRes=0;setupShadows(QT[qLevel]);tgtKey='';},
  farSum:async near=>{const t=near?shNTex:shFarT[shCur],r=near?shNRes:shRes,rb=device.createBuffer({size:r*r*2,usage:BU.MAP_READ|BU.COPY_DST}),e=device.createCommandEncoder();
    e.copyTextureToBuffer({texture:t,aspect:'depth-only'},{buffer:rb,bytesPerRow:r*2},[r,r]);device.queue.submit([e.finish()]);await rb.mapAsync(GPUMapMode.READ);
    const a=new Uint16Array(rb.getMappedRange()),L=a.length;let s=0,n=0;for(let i=0;i<L;i++){s=(s*31+a[i])>>>0;if(a[i]<65535)n++;}rb.unmap();rb.destroy();return{hash:s,covered:+(n/L).toFixed(4),sunF:[...sunF].map(v=>+v.toFixed(4))};},sky:()=>JSON.parse(JSON.stringify(SKY)),
  bigAt:i=>{const o=[0,0,0];bigPos(bigs[i],time,o);return o;},schoolAt:i=>[schools[i].lx,schools[i].ly,schools[i].lz,schools.length],heightAt,floorBelow,dAt,TOUR,tourPts,
  stats:()=>({TM,gpu:true,err:gpuErr,W,H,msaa:T.ms,q:qLevel,hour:+SKY.hour.toFixed(2),tMode,baking:!!bake,svis:svis.length/3,small:LV_small.total,rscale,leafK,ema:+ema.toFixed(1),vis:vis.length/3,leaves:drawn,total:{big:LV_big.total,stem:LV_stem.total,small:LV_small.total,fish:NB,tris:TER.tris,glints:glints.total},started,locked,focalT})};
if(!FLAGS.includes('nof'))requestAnimationFrame(frame);
}
