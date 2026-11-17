/* ───────── 佈景：海藻柱、珊瑚岩、拱門、珊瑚、遺跡、沉船 ───────── */
// 海藻柱「多股莖＋數百片獨立葉片」的做法，參考了 Noniv/abyssal-garden（MIT 授權）的構想，程式為重新撰寫。
const rng=mulberry(20261115);
const R=(a,b)=>a+(b-a)*rng();
const pick=a=>a[(rng()*a.length)|0];
const NCH=CH*CH;
const chunkOf=(x,z)=>Math.min(CH-1,(x/CHS)|0)+CH*Math.min(CH-1,(z/CHS)|0);
class FB{constructor(){this.a=new Float32Array(2048);this.n=0;}
  need(k){if(this.n+k>this.a.length){const b=new Float32Array(Math.max(this.a.length*2,this.n+k));b.set(this.a.subarray(0,this.n));this.a=b;}}}
const LCH=8,LCS=P/LCH,LNCH=LCH*LCH,lchunk=(x,z)=>Math.min(LCH-1,(x/LCS)|0)+LCH*Math.min(LCH-1,(z/LCS)|0);
const mkFB=()=>Array.from({length:LNCH},()=>new FB());
const leafBig=mkFB(),leafStem=mkFB(),leafSmall=mkFB(),glintB=mkFB();
function leaf(L,x,y,z,len,yaw,tilt,wid,stemH,type,rnd,bend,fl){const wx=wrapP(x),wz=wrapP(z),b=L[lchunk(wx,wz)];b.need(12);const a=b.a;let n=b.n;
  a[n++]=wx;a[n++]=y;a[n++]=wz;a[n++]=len;a[n++]=yaw;a[n++]=tilt;a[n++]=wid;a[n++]=stemH;a[n++]=type;a[n++]=rnd;a[n++]=bend;a[n++]=fl;b.n=n;}
function glint(x,y,z,h,rnd,hue,size){const wx=wrapP(x),wz=wrapP(z),b=glintB[lchunk(wx,wz)];b.need(8);const a=b.a;let n=b.n;a[n++]=wx;a[n++]=y;a[n++]=wz;a[n++]=h;a[n++]=rnd;a[n++]=hue;a[n++]=size;a[n++]=0;b.n=n;}

const kinds={};
const HG=16,HN=P/HG,hitGrid=[];for(let i=0;i<HN*HN;i++)hitGrid.push([]);
function hit(x,y,z,a,b,cyl){const wx=wrapP(x),wz=wrapP(z);hitGrid[Math.min(HN-1,(wx/HG)|0)+HN*Math.min(HN-1,(wz/HG)|0)].push([wx,y,wz,a,b,cyl]);}
function kind(name,geo,o){kinds[name]=Object.assign({geo,list:[],sway:[0,0,0,0],det:[.6,.35,0,.2],mat:[0,0],far:1,cast:true},o||{});}
function put(name,x,y,z,q,sx,sy,sz,col,rnd){kinds[name].list.push([wrapP(x),y,wrapP(z),rnd===undefined?rng()*TAU:rnd,q[0],q[1],q[2],q[3],sx,sy,sz,0,col[0],col[1],col[2],rng()]);}
function onGround(name,x,z,o){o=o||{};const s=o.s||1,n=normalAt(x,z),q=qMul(qUpTo(n,o.align===undefined?.6:o.align),qYaw(rng()*TAU));
  const y=heightAt(x,z)+(o.dy||0)*s;put(name,x,y,z,q,s*(o.sx||1),s*(o.sy||1),s*(o.sz||1),o.col||[1,1,1]);if(o.hit)hit(x,y,z,s*o.hit[0],s*(o.sy||1)*o.hit[1],0);}
function scatter(count,dens,fn){let placed=0,tries=0;while(placed<count&&tries<count*40){tries++;const x=rng()*P,z=rng()*P;if(rng()<dens(x,z)){fn(x,z);placed++;}}}
const slope=(x,z)=>1-normalAt(x,z)[1];
const freeOf=(x,z)=>distW(x,z,RUIN[0],RUIN[1])>13&&distW(x,z,WRECK[0],WRECK[1])>7;
const clus=(x,z)=>sstep(.38,.62,nCl(x/P,z/P));
const clus2=(x,z)=>sstep(.40,.62,nCl2(x/P,z/P));
function qrotJS(q,v){const x=q[0],y=q[1],z=q[2],w=q[3],cx=y*v[2]-z*v[1]+w*v[0],cy=z*v[0]-x*v[2]+w*v[1],cz=x*v[1]-y*v[0]+w*v[2];
  return[v[0]+2*(y*cz-z*cy),v[1]+2*(z*cx-x*cz),v[2]+2*(x*cy-y*cx)];}

const ROCKDET=[.5,.5,0,.12];
for(let k=0;k<4;k++){kind('bd'+k,mBoulder(k,ROCKSUB),{lo:mBoulder(k,2),mat:[1,0],det:ROCKDET,far:1.25});kind('bf'+k,mBoulder(k,3),{lo:mBoulder(k,2),mat:[1,0],det:ROCKDET,sway:[0,0,0,.7],far:1.25});}
kind('arch0',mArch(3,48,14),{mat:[1,0],det:ROCKDET,far:1.3});kind('arch1',mArch(8,48,14),{mat:[1,0],det:ROCKDET,far:1.3});
kind('rock0',mRock(1),{mat:[1,0],det:ROCKDET});kind('rock1',mRock(2),{mat:[1,0],det:ROCKDET});kind('rock2',mRock(3),{mat:[1,0],det:ROCKDET});
kind('dome',mDome(4),{det:[2.6,.7,1,.25],mat:[0,.45]});
kind('stag0',mBranch(5,{depth:3,trunks:2,len:.42,rad:.075,bend:.5,spread:1.2,up:.55,extra:.45,lean:.9,sides:6}),{det:[3.5,.4,0,.35],mat:[0,.6]});
kind('stag1',mBranch(6,{depth:3,trunks:3,len:.5,rad:.06,bend:.3,spread:.8,up:.9,extra:.25,lean:.6,sides:6}),{det:[3.5,.4,0,.35],mat:[0,.6]});
kind('table',mTable(),{det:[2.2,.5,1,.3],mat:[0,.4]});
kind('sponge',mSponge(7),{det:[3,.4,0,.35],mat:[0,.55]});
kind('barrel',mBarrel(),{det:[2.2,.55,1,.3],mat:[0,.45]});
kind('fan',mFan(8),{sway:[1,1.1,.3,0],det:[1,.1,0,.6],mat:[0,.7],cast:false});
kind('anem',mAnemone(9),{sway:[1,1.9,.2,0],det:[1,.1,0,.6],mat:[0,.7]});
kind('urchin',mUrchin(),{det:[3,.2,0,.3],mat:[0,.35],far:.6,cast:false});
kind('clam',mClam(),{det:[4,.35,1,.3],mat:[0,.8],far:.7});
kind('star',mStar(),{det:[5,.35,0,.2],mat:[0,.6],far:.5,cast:false});
kind('column',mColumn(0),{det:[.9,.55,0,.15]});kind('stump',mColumn(.6),{det:[.9,.55,0,.15]});
kind('box',mBox(),{det:[.45,.6,0,.15]});kind('disc',mDisc(),{det:[.3,.55,0,.15]});
kind('wreck',mWreck(),{det:[.5,.6,0,.25],far:1.3});
const CORAL=[[1,.42,.30],[1,.30,.52],[.66,.46,1],[1,.84,.30],[.30,.92,.76],[1,.60,.20],[.9,.95,1],[.80,.32,.95],[1,.36,.72],[.35,.70,1]];
const SPONGE=[[1,.82,.2],[1,.48,.2],[.72,.36,.95],[.3,.62,1],[1,.4,.55],[.95,.3,.3]];

/* ── 海藻柱 ── */
const occ=new Set();
function column(x,y,z,H,kd,dens){
  const strands=2+(rng()<.6?1:0)+(rng()<.3?1:0),ph=R(0,TAU),tw=R(.1,.26),sr=R(.2,.5),sc=R(.8,1.25),la=R(0,TAU),lm=R(0,.1),wk=BF<1?1.3:1;
  let px=0,pz=0,pa=0;const stem=(s,h)=>{pa=ph+s*TAU/strands+h*tw;const r=sr*(1-.6*h/H),ln=lm*h*h/H;px=x+Math.cos(pa)*r+Math.cos(la)*ln;pz=z+Math.sin(pa)*r+Math.sin(la)*ln;};
  for(let s=0;s<strands;s++)for(let h=0;h<H-1;h+=1.8){stem(s,h);leaf(leafStem,px,y+h,pz,2.2,pa+Math.PI/2,.1,.15,h,1,rng(),.25,0);}
  const n=Math.floor(H*27*dens*BF),t0=kd===1?3:kd===2?4:0;
  for(let i=0;i<n;i++){const t=Math.pow(rng(),.9),h=t*H;stem((rng()*strands)|0,h);
    const L=((.6+.8*rng()*rng())*(1-.45*t*t)*sc+.25)*(kd===1?1.2:1.1),tilt=mix(R(.45,1.05),R(.15,.5),t);
    const type=kd===1?(rng()<.75?3:4):kd===2?(rng()<.5?4:6):(rng()<.1?6:0);
    leaf(leafBig,px,y+h,pz,L,R(0,TAU),tilt,(L*(kd===1?R(.11,.16):R(.16,.22))+.03)*wk,h,type,rng(),R(.4,.95),1);}
  stem(0,H-1);for(let i=Math.ceil(9*BF);i>0;i--)leaf(leafBig,px+R(-.3,.3),y+H-R(.3,1.8),pz+R(-.3,.3),R(1.2,2.3),R(0,TAU),R(.5,1.3),.3*wk,H,t0,rng(),R(.5,1),1);
  for(let i=Math.floor(H*7*BF);i>0;i--){const h=rng()*H,a=R(0,TAU),r=R(.15,.9)*(1-.5*h/H),ln=lm*h*h/H;
    glint(x+Math.cos(a)*r+Math.cos(la)*ln,y+h,z+Math.sin(a)*r+Math.sin(la)*ln,h,rng(),kd===1?(rng()<.45?2:rng()):rng(),R(.022,.05));}
}
function tryColumn(x,z,kd,dens){const key=Math.floor(x/2.7)*4096+Math.floor(z/2.7);if(occ.has(key))return;
  if(normalAt(x,z)[1]<.8||nearTour(x,z,3.4))return;const y=heightAt(x,z),H=Math.min(-y-R(3.5,9),R(17,40));if(H<9)return;
  occ.add(key);column(x,y-.3,z,H,kd,dens);}
for(let i=0;i<6200;i++){const x=rng()*P,z=rng()*P;if(rng()<kelpDens(x,z))tryColumn(x,z,zoneP(x,z)>.42&&rng()<.6?1:rng()<.04?2:0,R(.6,1.25));}
mark('kelp');

/* ── 地面的帶狀葉叢與地被 ── */
function cluster(x,y,z,n,type,lmin,lmax,wmin,wmax,tmax,sway){for(let i=0;i<n;i++){const a=R(0,TAU),r=rng()*.5;
  leaf(leafBig,x+Math.cos(a)*r,y-.12,z+Math.sin(a)*r,R(lmin,lmax),a,R(.05,tmax),R(wmin,wmax)*(BF<1?1.25:1),sway,type,rng(),R(.3,.8),1);}}
function tuft(x,y,z,n,type,lmin,lmax){const yw=R(0,TAU);for(let j=0;j<n;j++)leaf(leafSmall,x+R(-.12,.12),y-.04,z+R(-.12,.12),R(lmin,lmax),yw+j*TAU/n+R(-.4,.4),R(.08,.8),R(.045,.085)*(BF<1?1.3:1),0,type,rng(),R(.3,.7),1);}
const flat=(x,z)=>slope(x,z)<.14?1:0;
scatter(Math.floor(3800*BF),(x,z)=>(sstep(.5,.66,nG(x/P,z/P))*(1-reefM(x,z))+.7*kelpDens(x,z))*(1-sstep(.05,.2,canyon(x,z)))*(freeOf(x,z)?1:0)*flat(x,z),(x,z)=>cluster(x,heightAt(x,z),z,8+(rng()*11|0),rng()<.1?6:2,1,2.8,.12,.24,.6,2.5));
scatter(Math.floor(2400*BF),(x,z)=>zoneP(x,z)*(.25+.75*clus(x,z))*(freeOf(x,z)?1:0)*flat(x,z),(x,z)=>cluster(x,heightAt(x,z),z,10+(rng()*15|0),rng()<.72?3:4,.9,2.6,.13,.26,.9,1.5));
scatter(Math.floor(1500*BF),(x,z)=>reefM(x,z)*.6*(freeOf(x,z)?1:0)*flat(x,z),(x,z)=>cluster(x,heightAt(x,z),z,7+(rng()*9|0),pick([2,3,4,7,2]),.7,1.9,.11,.22,.8,1.5));
scatter(Math.floor(34000*BF),(x,z)=>Math.max(zoneP(x,z)*clus2(x,z),reefM(x,z)*clus(x,z)*.6)*flat(x,z),(x,z)=>{const y=heightAt(x,z);tuft(x,y,z,4,5,.12,.36);if(rng()<.25)glint(x,y+R(.1,.3),z,0,rng(),2,R(.015,.03));});
scatter(Math.floor(7000*BF),(x,z)=>Math.max(canyon(x,z)*.8,.5*sstep(2,8,mesaAt(x,z)))*clus(x,z),(x,z)=>{const y=heightAt(x,z);tuft(x,y,z,3,7,.25,.7);if(rng()<.2)glint(x,y+R(.1,.4),z,0,rng(),.9,R(.015,.03));});
scatter(Math.floor(18000*BF),(x,z)=>sstep(.52,.66,nG(x/P,z/P))*(1-reefM(x,z))*(.3+.7*clus2(x,z))*flat(x,z),(x,z)=>tuft(x,heightAt(x,z),z,3,2,.2,.55));
mark('cover');

/* ── 珊瑚岩：把幾種巨岩原型疊成岩堆、岩柱、拱門和懸浮石 ── */
const boulders=[];
function boulder(x,y,z,sx,sy,sz,fl){const k=(rng()*4)|0,q=qMul(qYaw(R(0,TAU)),qAxis(norm([R(-1,1),0,R(-1,1)]),R(-.35,.35))),g=R(.84,1.06);
  put((fl?'bf':'bd')+k,x,y,z,q,sx,sy,sz,[g,g,g*R(.95,1.02)]);
  if(!fl)hit(x,y,z,Math.min(sx,sz)*.92,sy*.88,0);
  const b={k,x,y,z,q,s:[sx,sy,sz],fl:!!fl};boulders.push(b);return b;}
function onBoulder(b,lo){const d=norm([R(-1,1),R(lo,1),R(-1,1)]),l=BFN[b.k](d),w=qrotJS(b.q,[l[0]*b.s[0],l[1]*b.s[1],l[2]*b.s[2]]);
  return{p:[b.x+w[0],b.y+w[1],b.z+w[2]],n:norm(qrotJS(b.q,[d[0]/b.s[0],d[1]/b.s[1],d[2]/b.s[2]]))};}
function pile(x,z,Rr,H){const y0=heightAt(x,z);let cx=x,cz=z;const n=Math.max(1,Math.round(H/(Rr*.75)));
  for(let i=0;i<n;i++){const t=n>1?i/(n-1):0,r=Rr*(1-.45*t)*R(.85,1.15);
    boulder(cx,y0+Rr*.25+t*H*.85,cz,r*R(.9,1.3),r*R(.75,1.1),r*R(.9,1.3));
    if(rng()<.55&&i<n-1)boulder(cx+R(-1,1)*r*.95,y0+Rr*.2+t*H*.8,cz+R(-1,1)*r*.95,r*R(.5,.8),r*R(.45,.7),r*R(.5,.8));
    cx+=R(-1,1)*r*.45;cz+=R(-1,1)*r*.45;}}
const clearOf=(x,z,r)=>!nearTour(x,z,r)&&distW(x,z,RUIN[0],RUIN[1])>15&&distW(x,z,WRECK[0],WRECK[1])>9&&distW(x,z,SPAWN[0],SPAWN[1])>7;
for(const r of REEFS){const m=Math.round(r[2]/3.6);for(let i=0;i<m;i++){const a=i/m*TAU+R(-.2,.2),d=r[2]*R(.6,.92),x=r[0]+Math.cos(a)*d,z=r[1]+Math.sin(a)*d,s=R(2.2,4.6);if(clearOf(x,z,s+2.5))pile(x,z,s,R(3,11));}}
for(let x=4;x<P;x+=12.5)for(const sd of[-1,1]){const px=x+R(-3,3),pz=canyonZ(px)+sd*R(15,22),s=R(2.4,4.6);if(clearOf(px,pz,s+2.5))pile(px,pz,s,R(4,12));}
for(const m of MESAS){for(let i=0;i<9;i++){const a=i/9*TAU+R(-.25,.25),d=m[2]*R(.9,1.15),x=m[0]+Math.cos(a)*d,z=m[1]+Math.sin(a)*d,s=R(2.6,5);if(clearOf(x,z,s+2.5))pile(x,z,s,R(5,14));}
  for(let i=0;i<3;i++){const a=R(0,TAU),d=m[2]*R(0,.5);pile(m[0]+Math.cos(a)*d,m[1]+Math.sin(a)*d,R(1.8,3.2),R(3,7));}}
for(const s of[[38,222,5.5,24],[84,264,5,20],[70,204,4.6,26],[174,16,5,22],[206,42,4.6,18],[302,162,5,22],[148,198,4.6,20],[16,46,5,22],[288,238,5,18],[112,150,4.2,14]])if(clearOf(s[0],s[1],s[2]+2))pile(s[0],s[1],s[2],s[3]);
const ARCHES=[[89,107,12,-.63,1],[60,232,14,.51,1],[241,157,12,.25,1],[176,44,10,1.2,0],[150,167,13.5,Math.PI/2,0],[284,206,9,2.2,0],[30,110,8,.9,0]];
ARCHES.forEach((a,i)=>{const R0=a[2],ux=Math.cos(a[3]),uz=-Math.sin(a[3]),f1=[a[0]+ux*R0,a[1]+uz*R0],f2=[a[0]-ux*R0,a[1]-uz*R0];
  const y=Math.max(heightAt(f1[0],f1[1]),heightAt(f2[0],f2[1]))-R0*(a[4]?.1:.22),g=R(.86,1.02),sy=a[4]?R(1.22,1.3):R(.82,1.05);
  put('arch'+(i%2),a[0],y,a[1],qYaw(a[3]),R0,R0*sy,R0*1.5,[g,g,g]);
  for(let k=0;k<=10;k++){const an=Math.PI*k/10;hit(a[0]+ux*Math.cos(an)*R0,y+Math.sin(an)*R0*sy,a[1]+uz*Math.cos(an)*R0,R0*.3,R0*.3,0);}
  for(const f of[f1,f2]){hit(f[0],heightAt(f[0],f[1]),f[1],R0*.3,R0*.55,1);for(let k=0;k<2;k++){const px=f[0]+ux*R(-.1,.25)*R0*(f===f1?1:-1)+R(-1.5,1.5),pz=f[1]+uz*R(-.1,.25)*R0*(f===f1?1:-1)+R(-1.5,1.5);if(!nearTour(px,pz,4))pile(px,pz,R0*R(.16,.26),R0*R(.2,.5));}}});
for(const c of[[160,166,-24],[60,236,-19],[236,206,-15],[110,60,-13],[282,40,-22],[40,96,-20]]){const n=5+(rng()*4|0);for(let i=0;i<n;i++){const s=R(.8,3.2);boulder(c[0]+R(-13,13),c[2]+R(-5,5),c[1]+R(-13,13),s*R(.9,1.3),s*R(.7,1),s*R(.9,1.3),true);}}
mark('rocks');

/* ── 珊瑚、海綿、海扇、海葵……長在岩石和礁台上 ── */
function putOn(name,s,sc,col,sy){put(name,s.p[0],s.p[1],s.p[2],qMul(qUpTo(s.n,.9),qYaw(R(0,TAU))),sc,sc*(sy||1),sc,col);}
for(const b of boulders){const big=Math.min(b.s[0],b.s[2]),n=Math.round(clamp(big*big*(b.fl?.5:.9),2,26));
  for(let i=0;i<n;i++){const s=onBoulder(b,b.fl?-.6:-.15);if(s.p[1]>-5||(!b.fl&&s.p[1]<heightAt(s.p[0],s.p[2])+.25))continue;const u=rng(),ny=s.n[1];
    if(ny<-.25){if(b.fl||rng()<.5){const m=6+(rng()*10|0);for(let j=0;j<m;j++)leaf(leafBig,s.p[0]+R(-.5,.5),s.p[1]+.15,s.p[2]+R(-.5,.5),R(.8,3),R(0,TAU),Math.PI-R(0,.4),R(.09,.18),0,zoneP(s.p[0],s.p[2])>.3||rng()<.4?3:0,rng(),R(.3,.6),1);}continue;}
    if(u<.2)putOn(rng()<.5?'stag0':'stag1',s,R(.7,1.9),pick(CORAL));
    else if(u<.36)putOn('fan',s,R(.9,2.3),pick([[1,.3,.25],[1,.55,.2],[.85,.3,.85],[1,.8,.3],[1,.4,.62]]));
    else if(u<.5)putOn('sponge',s,R(.7,1.6),pick(SPONGE));
    else if(u<.6&&ny>.6)putOn('table',s,R(.7,1.9),pick([[.74,.64,.42],[.5,.74,.62],[.85,.6,.55],[.6,.6,.9]]),R(.8,1.1));
    else if(u<.68&&ny>.5)putOn('dome',s,R(.35,1.1),pick([[.9,.74,.36],[.6,.8,.42],[.85,.55,.75],[.5,.74,.82],[.95,.6,.4]]));
    else if(u<.76&&ny>.3)putOn('anem',s,R(.7,1.4),pick([[1,.7,.6],[.7,.95,.6],[.9,.6,1],[.6,.85,.95],[1,.85,.5]]));
    else if(u<.82&&ny>.7)putOn('barrel',s,R(.6,1.7),pick([[.85,.6,.4],[.62,.5,.85],[.9,.75,.4],[.7,.4,.5]]),R(.8,1.3));
    else if(u<.9&&ny>.55)cluster(s.p[0],s.p[1],s.p[2],6+(rng()*8|0),zoneP(s.p[0],s.p[2])>.3?(rng()<.7?3:4):pick([2,2,3,7,6]),.6,1.8,.1,.2,.9,1.5);
    else if(ny>.5)tuft(s.p[0],s.p[1],s.p[2],4,rng()<.6?5:7,.14,.4);
  }}
scatter(360,(x,z)=>(.06+.4*reefM(x,z)+.3*canyon(x,z)*sstep(.1,.3,slope(x,z)))*(freeOf(x,z)?1:0),(x,z)=>{const s=R(.4,1.4);
  onGround(pick(['rock0','rock1','rock2']),x,z,{s,sy:R(.7,1.2),dy:-.25,col:[R(.85,1.05),R(.85,1.05),R(.85,1.0)],hit:[1.05,.78]});});
const reefy=(x,z)=>Math.max(reefM(x,z),.8*sstep(4,10,mesaAt(x,z)));
scatter(900,(x,z)=>reefy(x,z)*(.15+.85*clus(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround(rng()<.55?'stag0':'stag1',x,z,{s:R(.7,2.1),col:pick(CORAL),align:.3}));
scatter(480,(x,z)=>reefy(x,z)*(.2+.8*clus2(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround('dome',x,z,{s:R(.35,1.3),sy:R(.8,1.25),dy:.1,hit:[1,.82],col:pick([[.9,.74,.36],[.6,.8,.42],[.85,.55,.75],[.5,.74,.82],[.95,.6,.4]])}));
scatter(280,(x,z)=>reefy(x,z)*(.2+.8*clus(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround('table',x,z,{s:R(.6,2.0),sy:R(.8,1.1),col:pick([[.74,.64,.42],[.5,.74,.62],[.85,.6,.55],[.6,.6,.9]]),align:.25}));
scatter(360,(x,z)=>reefy(x,z)*(.25+.75*clus2(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround('sponge',x,z,{s:R(.7,1.7),col:pick(SPONGE),align:.3}));
scatter(170,(x,z)=>(reefy(x,z)*.7+.2*zoneP(x,z))*clus2(x,z)*(freeOf(x,z)?1:0)*flat(x,z),(x,z)=>onGround('barrel',x,z,{s:R(.7,2.0),sy:R(.8,1.3),hit:[.5,.9],col:pick([[.85,.6,.4],[.62,.5,.85],[.9,.75,.4],[.7,.4,.5]]),align:.3}));
scatter(360,(x,z)=>(reefy(x,z)*.8+canyon(x,z)*sstep(.12,.3,slope(x,z))*.6)*(freeOf(x,z)?1:0),(x,z)=>onGround('fan',x,z,{s:R(.9,2.4),col:pick([[1,.3,.25],[1,.55,.2],[.85,.3,.85],[1,.8,.3],[1,.4,.62]]),align:.2}));
scatter(230,(x,z)=>reefy(x,z)*clus(x,z)*(freeOf(x,z)?1:0),(x,z)=>onGround('anem',x,z,{s:R(.7,1.5),col:pick([[1,.7,.6],[.7,.95,.6],[.9,.6,1],[.6,.85,.95],[1,.85,.5]])}));
scatter(170,(x,z)=>(.2+.8*reefy(x,z))*flat(x,z)*(1-canyon(x,z)),(x,z)=>onGround('star',x,z,{s:R(.16,.34),dy:.02,col:pick([[1,.45,.15],[.95,.2,.2],[.3,.45,1],[1,.75,.3],[.8,.3,.8]]),align:1}));
scatter(260,(x,z)=>(.15+.6*reefy(x,z)+.4*canyon(x,z))*clus2(x,z)*(freeOf(x,z)?1:0),(x,z)=>onGround('urchin',x,z,{s:R(.5,1.1),dy:.12,col:pick([[.35,.12,.5],[.12,.12,.16],[.6,.12,.2],[.2,.2,.6]]),align:1}));
scatter(70,(x,z)=>reefy(x,z)*flat(x,z)*(freeOf(x,z)?1:0),(x,z)=>onGround('clam',x,z,{s:R(.45,1.0),dy:.2,col:pick([[1,1,1],[1.2,.7,1],[.7,1.1,.8],[1,.9,.6]]),align:.8}));

/* ── 石柱遺跡與沉船 ── */
(function(){const cx=RUIN[0],cz=RUIN[1],y0=-27.5,stone=()=>{const k=R(.86,1.02);return[.78*k,.76*k,.66*k];},Q0=[0,0,0,1];
  put('disc',cx,y0-.25,cz,Q0,11.5,.55,11.5,stone());put('disc',cx,y0+.3,cz,Q0,9.8,.4,9.8,stone());
  const top=y0+.7,n=10,st=[1,1,0,1,1,2,1,1,3,1];
  for(let i=0;i<n;i++){const a=i/n*TAU+.2,x=cx+Math.cos(a)*8,z=cz+Math.sin(a)*8;
    if(st[i]===1){put('column',x,top,z,qYaw(R(0,TAU)),1,1,1,stone());hit(x,top,z,.6,5.5,1);}
    else if(st[i]===0){put('stump',x,top,z,qYaw(R(0,TAU)),1,1,1,stone());hit(x,top,z,.6,2.2,1);}
    else if(st[i]===2){put('stump',x,top,z,qYaw(1),1,.6,1,stone());put('column',cx+Math.cos(a)*10.5,top+.55,cz+Math.sin(a)*10.5,qMul(qYaw(-a+1.3),qAxis([0,0,1],Math.PI/2)),1,.8,1,stone());}
    else{put('column',cx+Math.cos(a)*4.5,top+.5,cz+Math.sin(a)*4.5,qMul(qYaw(-a+.5),qAxis([0,0,1],Math.PI/2+.05)),1,.9,1,stone());}
    const j=(i+1)%n;if(st[i]===1&&st[j]===1){const a2=j/n*TAU+.2,x2=cx+Math.cos(a2)*8,z2=cz+Math.sin(a2)*8,len=Math.hypot(x2-x,z2-z)+1.1;
      put('box',(x+x2)/2,top+5.4+.33,(z+z2)/2,qYaw(-Math.atan2(z2-z,x2-x)),len,.66,1.05,stone());}}
  hit(cx,top,cz,1.6,1.4,1);put('box',cx,top+.55,cz,qYaw(.3),2.6,1.1,1.5,stone());put('box',cx,top+1.25,cz,qYaw(.3),3.0,.3,1.8,stone());
  const gy=(x,z,d)=>d<9.6?top:d<11.3?y0+.3:heightAt(x,z);
  for(let i=0;i<14;i++){const a=R(0,TAU),d=R(3,15),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
    put('box',x,gy(x,z,d)+.2,z,qMul(qYaw(R(0,TAU)),qAxis([1,0,0],R(-.5,.5))),R(.6,2.2),R(.4,.8),R(.5,1.1),stone());}
  for(let i=0;i<30;i++){const a=R(0,TAU),d=R(2,12),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
    put(pick(['stag0','sponge','anem','fan','dome','barrel']),x,gy(x,z,d),z,qYaw(R(0,TAU)),R(.5,1.1),R(.5,1.1),R(.5,1.1),pick(CORAL));}
  for(let i=0;i<40;i++){const a=R(0,TAU),d=R(2,13),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(rng()<.5)cluster(x,gy(x,z,d),z,6+(rng()*7|0),pick([2,3,4]),.6,1.6,.1,.2,.8,1.5);else tuft(x,gy(x,z,d),z,4,5,.14,.36);}
})();
(function(){const x=WRECK[0],z=WRECK[1],q=qMul(qYaw(.9),qMul(qAxis([0,0,1],.33),qAxis([1,0,0],-.07)));
  put('wreck',x,heightAt(x,z)+2.1,z,q,1,1,1,[1,1,1]);
  for(let i=0;i<26;i++){const a=R(0,TAU),d=R(3,13),px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;onGround(pick(['rock0','rock1','sponge','fan','stag1','barrel']),px,pz,{s:R(.5,1.2),col:pick(CORAL)});}
  for(let i=0;i<8;i++){const a=R(0,TAU),d=R(6,13),px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;put('box',px,heightAt(px,pz)+.15,pz,qMul(qYaw(R(0,TAU)),qAxis([1,0,0],R(-.3,.3))),R(1.5,4),.14,R(.25,.4),[.36,.27,.18]);}
  pile(x+11,z+7,3.6,9);pile(x-12,z-5,3,6);
})();
const jellyKind={geo:mJelly(),list:[],far:1,cast:false};
(function(){kinds.j=jellyKind;
  const JC=[[1,.55,.85],[.6,.7,1],[.75,.55,1],[.5,.95,.95],[1,.75,.6],[.6,1,.7]];
  for(let i=0;i<90;i++){const a=R(0,TAU),d=Math.sqrt(rng())*30,x=JELLY[0]+Math.cos(a)*d,z=JELLY[1]+Math.sin(a)*d*1.5,s=R(.5,1.4);
    put('j',x,R(-36,-10),z,[0,0,0,1],s,s,s,pick(JC),rng());}
  for(let i=0;i<70;i++){const x=R(0,P),z=R(0,P),s=R(.5,1.2);put('j',x,Math.max(heightAt(x,z)+5,R(-30,-7)),z,[0,0,0,1],s,s,s,pick(JC),rng());}
  delete kinds.j;})();
mark('place');

/* ── 上傳：依區塊排序，每個區塊一組 VAO ── */
function buildKind(k){k.mesh=upload(k.geo);if(k.lo)k.meshLo=upload(k.lo);const L=k.list,cOf=e=>chunkOf(e[0],e[2]);
  L.sort((a,b)=>cOf(a)-cOf(b));const d=new Float32Array(L.length*16);k.start=new Int32Array(NCH);k.cnt=new Int32Array(NCH);
  for(let i=0;i<L.length;i++){d.set(L[i],i*16);const c=cOf(L[i]);if(k.cnt[c]===0)k.start[c]=i;k.cnt[c]++;}
  k.ibuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,k.ibuf);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);
  k.vaos=[];k.vaosLo=[];for(let c=0;c<NCH;c++){k.vaos.push(k.cnt[c]?meshVAO(k.mesh,k.ibuf,k.start[c]):null);k.vaosLo.push(k.cnt[c]&&k.meshLo?meshVAO(k.meshLo,k.ibuf,k.start[c]):null);}
  k.geo=k.lo=null;k.list=null;}
const statics=Object.keys(kinds).map(n=>kinds[n]);
statics.forEach(buildKind);buildKind(jellyKind);
const LEAFSEG=4,leafStrip=(function(){const d=[];for(let i=0;i<=LEAFSEG;i++){d.push(i/LEAFSEG,-1,i/LEAFSEG,1);}const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d),gl.STATIC_DRAW);return b;})();
function buildLeaves(L,shuffle){let tot=0;for(const b of L)tot+=b.n;const d=new Float32Array(tot),o={start:new Int32Array(LNCH),cnt:new Int32Array(LNCH),vaos:[],total:tot/12};let p=0;
  for(let c=0;c<LNCH;c++){const b=L[c],n=b.n/12,a=b.a;
    if(shuffle)for(let i=n-1;i>0;i--){const j=(rng()*(i+1))|0;if(j!==i)for(let k=0;k<12;k++){const t=a[i*12+k];a[i*12+k]=a[j*12+k];a[j*12+k]=t;}}
    d.set(a.subarray(0,b.n),p);o.start[c]=p/12;o.cnt[c]=n;p+=b.n;b.a=null;}
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);
  for(let c=0;c<LNCH;c++){if(!o.cnt[c]){o.vaos.push(null);continue;}const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,leafStrip);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);for(let l=4;l<7;l++){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,48,o.start[c]*48+(l-4)*16);gl.vertexAttribDivisor(l,1);}
    o.vaos.push(vao);}
  gl.bindVertexArray(null);return o;}
const LV_big=buildLeaves(leafBig,true),LV_stem=buildLeaves(leafStem,false),LV_small=buildLeaves(leafSmall,true);
const glints=(function(){let tot=0;for(const b of glintB)tot+=b.n;const d=new Float32Array(tot),o={start:new Int32Array(LNCH),cnt:new Int32Array(LNCH),vaos:[],total:tot/8};let p=0;
  for(let c=0;c<LNCH;c++){d.set(glintB[c].a.subarray(0,glintB[c].n),p);o.start[c]=p/8;o.cnt[c]=glintB[c].n/8;p+=glintB[c].n;glintB[c].a=null;}
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);
  for(let c=0;c<LNCH;c++){if(!o.cnt[c]){o.vaos.push(null);continue;}const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,32,o.start[c]*32);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,o.start[c]*32+16);o.vaos.push(vao);}
  gl.bindVertexArray(null);return o;})();
mark('build');

/* 氣泡與懸浮微粒 */
const bubbles=(function(){const src=[[RUIN[0],RUIN[1]],[RUIN[0]+5,RUIN[1]-3],[WRECK[0]+2,WRECK[1]+1],[WRECK[0]-4,WRECK[1]-3],[96,104],[84,92],[238,208],[226,220],[250,60],[58,236],[70,250],[40,220],[150,262],[160,150],[30,296],[112,90],[188,28],[176,44],[300,150],[150,190],[20,60],[241,157]];
  const d=[];for(const s of src){const y=heightAt(s[0],s[1])+.2;for(let i=0;i<40;i++)d.push(s[0]+R(-.6,.6),y,s[1]+R(-.6,.6),rng());}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.bindVertexArray(null);return{vao,n:d.length/4};})();
const snow=(function(){const n=3600,d=new Float32Array(n*4);for(let i=0;i<n*4;i++)d[i]=rng();
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.bindVertexArray(null);return{vao,n};})();
const surf=(function(){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);return vao;})();
const emptyVAO=gl.createVertexArray();
