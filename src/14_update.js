/* ───────── 每幀更新 ───────── */
let time=0,lastT=0,ready=false,ema=16,scaleClock=0,goodFor=0,lastDown=-99,hudClock=0;
const VP=new Float32Array(16),fwd=[0,0,-1],right=[1,0,0],up=[0,1,0],planes=new Float32Array(24),eye=[0,0,0],tmp=[0,0,0],tmp2=[0,0,0];
let tanY=1,aspect=1,NEAR=.12,FAR=1100;
function camera(){const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
  fwd[0]=sy*cp;fwd[1]=sp;fwd[2]=-cy*cp;right[0]=cy;right[1]=0;right[2]=sy;
  up[0]=right[1]*fwd[2]-right[2]*fwd[1];up[1]=right[2]*fwd[0]-right[0]*fwd[2];up[2]=right[0]*fwd[1]-right[1]*fwd[0];
  const bob=reduced?0:1;eye[0]=cam[0]+Math.sin(time*.5)*.03*bob;eye[1]=cam[1]+Math.sin(time*.83)*.045*bob;eye[2]=cam[2];
  aspect=W/H;const half=aspect>=1?12:Math.min(12/aspect,18);tanY=half/focal;
  const f=1/tanY,nf=1/(NEAR-FAR),ex=-(right[0]*eye[0]+right[1]*eye[1]+right[2]*eye[2]),ey=-(up[0]*eye[0]+up[1]*eye[1]+up[2]*eye[2]),ez=fwd[0]*eye[0]+fwd[1]*eye[1]+fwd[2]*eye[2];
  const a=f/aspect,c=(FAR+NEAR)*nf,d=2*FAR*NEAR*nf;
  // VP = Proj * View（column-major）
  const V=[right[0],up[0],-fwd[0],right[1],up[1],-fwd[1],right[2],up[2],-fwd[2],ex,ey,ez];
  for(let col=0;col<4;col++){const vx=col<3?V[col*3]:V[9],vy=col<3?V[col*3+1]:V[10],vz=col<3?V[col*3+2]:V[11],vw=col<3?0:1;
    VP[col*4]=a*vx;VP[col*4+1]=f*vy;VP[col*4+2]=c*vz+d*vw;VP[col*4+3]=-vz;}
  const m=VP,row=(i,k)=>m[k*4+i];
  const set=(n,s,i)=>{let x=row(3,0)+s*row(i,0),y=row(3,1)+s*row(i,1),z=row(3,2)+s*row(i,2),w=row(3,3)+s*row(i,3);const l=Math.hypot(x,y,z)||1;planes[n*4]=x/l;planes[n*4+1]=y/l;planes[n*4+2]=z/l;planes[n*4+3]=w/l;};
  set(0,1,0);set(1,-1,0);set(2,1,1);set(3,-1,1);set(4,1,2);set(5,-1,2);}
function inFrustum(x,y,z,r){for(let i=0;i<6;i++){if(planes[i*4]*x+planes[i*4+1]*y+planes[i*4+2]*z+planes[i*4+3]<-r)return false;}return true;}
const vis=[],visL=[];
function visible(){vis.length=0;visL.length=0;const tx=Math.floor(eye[0]/P),tz=Math.floor(eye[2]/P),far=230*QT[qLevel].far;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const ox=(tx+i)*P,oz=(tz+j)*P;
    for(let c=0;c<NCH;c++){const cx=ox+((c%CH)+.5)*CHS,cz=oz+(((c/CH)|0)+.5)*CHS,dx=Math.max(Math.abs(eye[0]-cx)-CHS/2,0),dz=Math.max(Math.abs(eye[2]-cz)-CHS/2,0),d=Math.hypot(dx,dz);
      if(d>far)continue;if(!inFrustum(cx,-32,cz,80))continue;vis.push(ox,oz,c,d);}
    for(let c=0;c<LNCH;c++){const cx=ox+((c%LCH)+.5)*LCS,cz=oz+(((c/LCH)|0)+.5)*LCS,dx=Math.max(Math.abs(eye[0]-cx)-LCS/2,0),dz=Math.max(Math.abs(eye[2]-cz)-LCS/2,0),d=Math.hypot(dx,dz);
      if(d>far)continue;if(!inFrustum(cx,-32,cz,50))continue;visL.push(ox,oz,c,d);}}}
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
function collide(){const gx=Math.floor(wrapP(cam[0])/HG),gz=Math.floor(wrapP(cam[2])/HG),m=.42;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const L=hitGrid[((gx+i+HN)%HN)+HN*((gz+j+HN)%HN)];
    for(let n=0;n<L.length;n++){const h=L[n],dx=wrapD(cam[0]-h[0]),dz=wrapD(cam[2]-h[2]),dy=cam[1]-h[1];
      if(h[5]){if(dy>-m&&dy<h[4]+m){const d=Math.hypot(dx,dz),Rr=h[3]+m;if(d<Rr&&d>1e-4){const k=(Rr-d)/d;cam[0]+=dx*k;cam[2]+=dz*k;}}}
      else{const rx=h[3]+m,ry=h[4]+m,q=Math.sqrt((dx*dx+dz*dz)/(rx*rx)+dy*dy/(ry*ry));if(q<1){if(q>1e-4){const k=1/q-1;cam[0]+=dx*k;cam[1]+=dy*k;cam[2]+=dz*k;}else cam[1]=h[1]+ry;}}}}}
function player(dt){
  focal+=(focalT-focal)*(1-Math.exp(-dt*9));
  let mf=0,mr=0,mu=0;
  if(started){if(keys.has('KeyW')||keys.has('ArrowUp'))mf+=1;if(keys.has('KeyS')||keys.has('ArrowDown'))mf-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))mr+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))mr-=1;
    if(keys.has('Space')||keys.has('KeyE'))mu+=1;if(keys.has('KeyQ')||keys.has('KeyC'))mu-=1;mf+=joy.y;mr+=joy.x;mu+=vUp-vDown;}
  if(tour){tourT+=dt;const w=TOUR[tourI],dx=wrapD(w[0]-cam[0]),dz=wrapD(w[1]-cam[2]);if(dx*dx+dz*dz<15*15)tourI=(tourI+1)%TOUR.length;
    const want=Math.atan2(dx,-dz);tourYaw+=clamp(angDiff(want,tourYaw),-.32*dt,.32*dt);
    const sp=2.3,fx=Math.sin(tourYaw),fz=-Math.cos(tourYaw);
    const ty=Math.min(-4,Math.max(heightAt(cam[0],cam[2])+3.0,heightAt(cam[0]+fx*9,cam[2]+fz*9)+3.8,heightAt(cam[0]+fx*18,cam[2]+fz*18)+3.6,heightAt(cam[0]+fx*30,cam[2]+fz*30)+2.5)+1.6+1.6*Math.sin(tourT*.17));
    const vy=clamp((ty-cam[1])*.6,-1.4,2.4);
    vel[0]+=(fx*sp-vel[0])*Math.min(1,dt*2);vel[2]+=(fz*sp-vel[2])*Math.min(1,dt*2);vel[1]+=(vy-vel[1])*Math.min(1,dt*2);
    if(time-lastLook>3.5){const k=1-Math.exp(-dt*1.1);yaw+=angDiff(tourYaw,yaw)*k;pitch+=(clamp(vy*.22,-.3,.3)-.05-pitch)*k;}
  }else{
    const l=Math.hypot(mf,mr,mu);if(l>1){mf/=l;mr/=l;mu/=l;}
    const acc=11*(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.3:1);
    vel[0]+=(fwd[0]*mf+right[0]*mr)*acc*dt;vel[1]+=(fwd[1]*mf+mu)*acc*dt;vel[2]+=(fwd[2]*mf+right[2]*mr)*acc*dt;
    const dr=Math.exp(-2.2*dt);vel[0]*=dr;vel[1]*=dr;vel[2]*=dr;}
  cam[0]+=vel[0]*dt;cam[1]+=vel[1]*dt;cam[2]+=vel[2]*dt;collide();
  const floor=heightAt(cam[0],cam[2])+1.15;if(cam[1]<floor){cam[1]+=(floor-cam[1])*Math.min(1,dt*14);if(vel[1]<0)vel[1]=0;if(cam[1]<floor-.6)cam[1]=floor-.6;}
  if(cam[1]>-.9){cam[1]=-.9;if(vel[1]>0)vel[1]=0;}
  lampI+=((lamp?1:0)-lampI)*(1-Math.exp(-dt*8));
}
function instance(g,x,y,z,size,dx,dy,dz,ph,A,pat,B,roll){if(g.n>=g.cap)return;const o=g.n*16,D=g.data;g.n++;
  D[o]=x;D[o+1]=y;D[o+2]=z;D[o+3]=size;D[o+4]=dx;D[o+5]=dy;D[o+6]=dz;D[o+7]=ph;D[o+8]=A[0];D[o+9]=A[1];D[o+10]=A[2];D[o+11]=pat;D[o+12]=B[0];D[o+13]=B[1];D[o+14]=B[2];D[o+15]=roll;}
function life(dt){
  for(const k in groups)groups[k].n=0;
  for(const s of schools){const T=time*s.spd/s.rad;s.lx=s.ax+Math.cos(T*s.fa+s.p1)*s.rad;s.lz=s.az+Math.sin(T*s.fb+s.p2)*s.rad;s.ly=Math.min(-1.5,heightAt(s.lx,s.lz)+s.h+Math.sin(T*.7+s.p3)*s.dh);}
  const cx=eye[0],cy=eye[1],cz=eye[2];
  for(let i=0;i<fishes.length;i++){const f=fishes[i],s=f.s;
    const an=time*.12*f.spin+f.a0,ca=Math.cos(an),sa=Math.sin(an);
    const tx=s.lx+f.ox*ca-f.oz*sa,ty=s.ly+f.oy+Math.sin(time*.5+f.a0*7)*.3,tz=s.lz+f.ox*sa+f.oz*ca;
    if(!f.init){f.x=tx;f.y=ty;f.z=tz;f.init=true;}
    let dx=tx-f.x,dy=ty-f.y,dz=tz-f.z;const d=Math.hypot(dx,dy,dz)+1e-5,sp=Math.min(f.vmax,Math.max(f.vmin,d*1.2));
    let wx=dx/d*sp,wy=dy/d*sp*.6,wz=dz/d*sp;
    let ex=f.x-cx,ey=f.y-cy,ez=f.z-cz;ex-=P*Math.round(ex/P);ez-=P*Math.round(ez/P);
    const e2=ex*ex+ey*ey+ez*ez;
    if(e2<20.25){const e=Math.sqrt(e2)+1e-4,k=(4.5-e)/4.5*f.vmax*3.2;wx+=ex/e*k;wy+=ey/e*k*.5;wz+=ez/e*k;}
    const tr=Math.min(1,dt*f.turn);f.vx+=(wx-f.vx)*tr;f.vy+=(wy-f.vy)*tr;f.vz+=(wz-f.vz)*tr;
    f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;
    const gy=heightAt(f.x,f.z)+.35;if(f.y<gy){f.y=gy;if(f.vy<0)f.vy=0;}if(f.y>-.8)f.y=-.8;
    const v=Math.hypot(f.vx,f.vy,f.vz);f.ph+=dt*(3+v*f.wk);
    if(v>.05){let nx=f.vx/v,ny=clamp(f.vy/v,-.6,.6),nz=f.vz/v;const k=Math.min(1,dt*8);nx=f.dx+(nx-f.dx)*k;ny=f.dy+(ny-f.dy)*k;nz=f.dz+(nz-f.dz)*k;const l=Math.hypot(nx,ny,nz)||1;f.dx=nx/l;f.dy=ny/l;f.dz=nz/l;}
    if(e2<125*125){ex+=f.vx*dt;ey+=f.vy*dt;ez+=f.vz*dt;if(inFrustum(cx+ex,cy+ey,cz+ez,f.size))instance(f.g,cx+ex,cy+ey,cz+ez,f.size,f.dx,f.dy,f.dz,f.ph,f.A,f.pat,f.B,0);}
  }
  for(const b of bigs){bigPos(b,time,tmp);bigPos(b,time+.25,tmp2);
    let dx=tmp2[0]-tmp[0],dy=tmp2[1]-tmp[1],dz=tmp2[2]-tmp[2];const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy=clamp(dy/l,-.5,.5);dz/=l;const l2=Math.hypot(dx,dy,dz);
    let ex=tmp[0]-cx,ez=tmp[2]-cz;ex-=P*Math.round(ex/P);ez-=P*Math.round(ez/P);
    if(ex*ex+ez*ez<200*200&&inFrustum(cx+ex,tmp[1],cz+ez,b.size*1.2))instance(b.g,cx+ex,tmp[1],cz+ez,b.size,dx/l2,dy/l2,dz/l2,time*b.freq+b.th0*5,b.A,b.pat,b.B,-b.sign*b.bank);}
}

