/* ───────── 佈景：海藻柱、珊瑚、地被、遺跡、沉船——全部長在雕刻出來的岩石表面上 ───────── */
// 海藻柱「多股莖＋數百片獨立葉片」與「在網格頂點上取樣擺放」的做法，參考了 Noniv/abyssal-garden（MIT 授權）的構想，程式為重新撰寫。
// 第五版的美術重做也向它學了幾個原理：岩塊用平面削出稜角、岩面大量散佈石塊、葉片的透光與逆光、用螢光留住深處的紅色、壓低固有色與曝光來做出明暗層次。數值與程式都是自己重寫、對照截圖調出來的。
// 亂數：每個佈置階段各自重設種子，測試用的低密度模式與正式版的佈局才會一致（只是比較稀疏）
let rngF=mulberry(20261115);const rng=()=>rngF(),reseed=s=>{rngF=mulberry(s);};
const R=(a,b)=>a+(b-a)*rng();
const pick=a=>a[(rng()*a.length)|0];
const chunkOf=(x,z)=>Math.min(CH-1,(x/CHS)|0)+CH*Math.min(CH-1,(z/CHS)|0);
class FB{constructor(){this.a=new Float32Array(2048);this.n=0;}
  need(k){if(this.n+k>this.a.length){const b=new Float32Array(Math.max(this.a.length*2,this.n+k));b.set(this.a.subarray(0,this.n));this.a=b;}}}
const mkFB=()=>Array.from({length:NCH},()=>new FB());
const leafBig=mkFB(),leafStem=mkFB(),leafSmall=mkFB(),glintB=mkFB();
function leaf(L,x,y,z,len,yaw,tilt,wid,stemH,type,rnd,bend,fl){const wx=wrapP(x),wz=wrapP(z),b=L[chunkOf(wx,wz)];b.need(12);const a=b.a;let n=b.n;
  a[n++]=wx;a[n++]=y;a[n++]=wz;a[n++]=len;a[n++]=yaw;a[n++]=tilt;a[n++]=wid;a[n++]=stemH;a[n++]=type;a[n++]=rnd;a[n++]=bend;a[n++]=fl;b.n=n;}
function glint(x,y,z,h,rnd,hue,size){const wx=wrapP(x),wz=wrapP(z),b=glintB[chunkOf(wx,wz)];b.need(8);const a=b.a;let n=b.n;a[n++]=wx;a[n++]=y;a[n++]=wz;a[n++]=h;a[n++]=rnd;a[n++]=hue;a[n++]=size;a[n++]=0;b.n=n;}
const kinds={};
const HG=16,HN=P/HG,hitGrid=[];for(let i=0;i<HN*HN;i++)hitGrid.push([]);
function hit(x,y,z,a,b,cyl){const wx=wrapP(x),wz=wrapP(z);hitGrid[Math.min(HN-1,(wx/HG)|0)+HN*Math.min(HN-1,(wz/HG)|0)].push([wx,y,wz,a,b,cyl]);}
function kind(name,geo,o){kinds[name]=Object.assign({geo,list:[],sway:[0,0,0,0],det:[.6,.35,0,.2],mat:[0,0],far:1,cast:true,fade:false},o||{});}
function put(name,x,y,z,q,sx,sy,sz,col,rnd){kinds[name].list.push([wrapP(x),y,wrapP(z),rnd===undefined?rng()*TAU:rnd,q[0],q[1],q[2],q[3],sx,sy,sz,0,col[0],col[1],col[2],rng()]);}
const tmpN=[0,0,0];
const normalAt=(x,z)=>{const y=heightAt(x,z);gradAt(x,y,z,tmpN);return[tmpN[0],tmpN[1],tmpN[2]];};
function onGround(name,x,z,o){o=o||{};const s=o.s||1,n=normalAt(x,z),q=qMul(qUpTo(n,o.align===undefined?.6:o.align),qYaw(rng()*TAU));
  const y=heightAt(x,z)+(o.dy||0)*s;put(name,x,y,z,q,s*(o.sx||1),s*(o.sy||1),s*(o.sz||1),o.col||[1,1,1]);if(o.hit)hit(x,y,z,s*o.hit[0],s*(o.sy||1)*o.hit[1],0);}
function scatter(count,dens,fn){let placed=0,tries=0;while(placed<count&&tries<count*40){tries++;const x=rng()*P,z=rng()*P;if(rng()<dens(x,z)){fn(x,z);placed++;}}}
const freeOf=(x,z)=>distW(x,z,RUIN[0],RUIN[1])>13&&distW(x,z,WRECK[0],WRECK[1])>7;
const clus=(x,z)=>sstep(.38,.62,nCl(x/P,z/P));
const clus2=(x,z)=>sstep(.40,.62,nCl2(x/P,z/P));
const ROCKDET=[.5,.5,0,.12];
// 岩塊：大（細分三次）、中（兩次）、小（一次）各幾種造型；卵石。小的只在近處畫，並隨距離縮小到消失，不會一整片突然冒出來
for(let i=0;i<2;i++)kind('rkL'+i,i?mSlab(11,3):mChunk(10,3),{mat:[1,0],det:ROCKDET,far:1.25});
for(let i=0;i<4;i++)kind('rkM'+i,i===3?mSlab(23,2):mChunk(20+i,2),{mat:[1,0],det:ROCKDET,far:.85,fade:true});
for(let i=0;i<3;i++)kind('rkS'+i,i===2?mSlab(33,1):mChunk(30+i,1),{mat:[1,0],det:ROCKDET,far:.45,fade:true,cast:false});
for(let i=0;i<2;i++)kind('peb'+i,mPebble(40+i),{mat:[1,0],det:ROCKDET,far:.24,fade:true,cast:false});
kind('dome',mBrain(4),{det:[2.6,.8,1,.2],mat:[0,.35]});
kind('stag0',mBranch(5,{depth:3,trunks:2,len:.42,rad:.075,bend:.5,spread:1.2,up:.55,extra:.45,lean:.9,sides:6}),{det:[3.5,.5,0,.25],mat:[0,.55]});
kind('stag1',mBranch(6,{depth:3,trunks:3,len:.5,rad:.06,bend:.3,spread:.8,up:.9,extra:.25,lean:.6,sides:6}),{det:[3.5,.5,0,.25],mat:[0,.55]});
kind('stag2',mBranch(11,{depth:4,trunks:2,len:.5,rad:.07,bend:.6,spread:1.4,up:.4,extra:.5,lean:1.1,sides:6}),{det:[3.5,.5,0,.25],mat:[0,.55]});
kind('table',mPlate(1,1),{det:[2.6,.6,1,.2],mat:[0,.3]});kind('table2',mPlate(2,3),{det:[2.6,.6,1,.2],mat:[0,.3]});kind('table3',mPlate(3,2),{det:[2.6,.6,1,.2],mat:[0,.3]});
kind('sponge',mSponge(7),{det:[3,.5,0,.25],mat:[0,.5]});
kind('barrel',mBarrel(),{det:[2.2,.65,1,.2],mat:[0,.3]});
kind('fan',mFan(8),{sway:[1,1.1,.3,0],det:[2,.25,0,.55],mat:[0,.6],cast:false});
kind('anem',mAnemone(9),{sway:[1,1.9,.2,0],det:[2,.2,0,.55],mat:[0,.65]});
kind('urchin',mUrchin(),{det:[3,.2,0,.3],mat:[0,.2],far:.6,cast:false});
kind('clam',mClam(),{det:[4,.4,1,.3],mat:[0,.6],far:.7});
kind('star',mStar(),{det:[5,.45,0,.2],mat:[0,.5],far:.5,cast:false});
kind('column',mColumn2(0),{det:[.9,.6,0,.1]});kind('stump',mColumn2(.6),{det:[.9,.6,0,.1]});
kind('box',mBox(),{det:[.45,.6,0,.15]});kind('disc',mDisc(),{det:[.3,.55,0,.15]});
kind('wreck',mWreck2(),{det:[.5,.6,0,.1],mat:[0,0,0,1],far:1.3});
// 配色：都是偏深的固有色，靠陽光、光斑與螢光提亮（不再用粉彩色）
const TABLES=['table','table','table2','table3'];
const CORAL=[[.72,.07,.08],[.78,.16,.28],[.76,.28,.05],[.40,.12,.60],[.70,.46,.07],[.62,.50,.36],[.70,.08,.40],[.78,.30,.22],[.50,.22,.66],[.74,.12,.20]];
const SPONGE=[[.74,.50,.05],[.76,.26,.05],[.44,.14,.62],[.70,.10,.34],[.72,.14,.12],[.66,.40,.10]];
const FANC=[[.74,.08,.08],[.78,.28,.05],[.56,.10,.50],[.72,.48,.08],[.76,.14,.32]],DOMEC=[[.60,.40,.10],[.36,.42,.12],[.58,.22,.30],[.50,.30,.12],[.62,.34,.16]],ANEC=[[.78,.34,.26],[.52,.56,.14],[.56,.20,.66],[.76,.50,.12],[.74,.16,.40]],TABC=[[.58,.38,.14],[.46,.36,.16],[.60,.26,.22],[.44,.24,.52]],BARC=[[.62,.30,.10],[.42,.16,.52],[.64,.42,.12],[.56,.14,.20]];

/* ── 海藻柱：長在任何上方有足夠淨空的地面（包括大洞穴裡和岩台頂） ── */
// 各視點手動擺放的海藻：[x, z, 種類, 密度, 高度上限(0＝自動)]
const HERO_KELP=[
  // 視點 1：左右兩側框住岩拱
  [55.6,217.7,0,1.15,0],[60.4,221.6,0,1.1,0],[58.5,214.5,0,1,0],[44.8,224.2,0,1.2,0],[46.4,230.5,0,1.1,0],[42.5,229,0,1,0],
  // 岩拱後方遠處的剪影
  [73,244,0,1,0],[77,249,0,1.1,0],[66,256,0,1,0],[62,252,2,1,0],[80,243,0,.9,0],
  // 視點 2：圍成一圈的高海藻
  [74.6,262.5,0,1.25,0],[72.4,266.3,0,1.2,0],[68,266.2,0,1.25,0],[65.6,262.6,0,1.2,0],[67.3,258.3,0,1.25,0],[71.8,257.6,0,1.2,0],[77.5,258.5,0,1.1,0],[63,267.5,0,1.1,0],
  // 視點 5（沉船）：左前方的海藻、船後方的幾根
  [219.5,126.5,0,1.15,0],[216.5,128.5,0,1.05,0],[221.5,129.5,0,1,0],[188,103,0,1.1,0],[191.5,99,0,1,0],[184.5,109.5,0,1.1,0],[196,95,0,.9,0],
  // 視點 6（遺跡）：兩側的海藻
  [133.2,73.4,0,1.1,0],[131,76,0,1,0],[141.5,65,0,1.1,0],[143.5,62,0,1,0],[113,50,0,1,0],[118,43,0,1.1,0]];
function placeHero(){HERO_KELP.forEach((h,i)=>tryColumn(h[0],h[1],h[2],h[3],900001+i*31,true,h[4]||0));}
const occ=new Set(),kelpMap=new Float32Array(160*160*2);          // 給天光體積用：每 2 m 一格的海藻密度與冠層高度
function column(x,y,z,H,kd,dens,rng){const R=(a,b)=>a+(b-a)*rng();
  const strands=2+(rng()<.6?1:0)+(rng()<.3?1:0),ph=R(0,TAU),tw=R(.1,.26),sr=R(.2,.5),sc=R(.8,1.25),la=R(0,TAU),lm=R(0,.1),wk=BF<1?1.3:1;
  let px=0,pz=0,pa=0;const stem=(s,h)=>{pa=ph+s*TAU/strands+h*tw;const r=sr*(1-.6*h/H),ln=lm*h*h/H;px=x+Math.cos(pa)*r+Math.cos(la)*ln;pz=z+Math.sin(pa)*r+Math.sin(la)*ln;};
  for(let s=0;s<strands;s++)for(let h=0;h<H-1;h+=1.8){stem(s,h);leaf(leafStem,px,y+h,pz,2.2,pa+Math.PI/2,.1,.10,h,1,rng(),.25,0);}
  const n=Math.floor(H*40*dens*BF),t0=kd===1?3:kd===2?4:0;
  for(let i=0;i<n;i++){const t=Math.pow(rng(),.9),h=t*H;stem((rng()*strands)|0,h);
    const L=((.6+.8*rng()*rng())*(1-.45*t*t)*sc+.25)*(kd===1?1.05:.95),tilt=mix(R(.45,1.05),R(.15,.5),t);
    const type=kd===1?(rng()<.75?3:4):kd===2?(rng()<.5?4:6):(rng()<.1?6:0);
    leaf(leafBig,px,y+h,pz,L,R(0,TAU),tilt,(L*(kd===1?R(.11,.16):R(.16,.22))+.03)*wk,h,type,rng(),R(.4,.95),1);}
  stem(0,H-1);for(let i=Math.ceil(9*BF);i>0;i--)leaf(leafBig,px+R(-.3,.3),y+H-R(.3,1.8),pz+R(-.3,.3),R(1.2,2.3),R(0,TAU),R(.5,1.3),.3*wk,H,t0,rng(),R(.5,1),1);
  for(let i=Math.floor(H*11*BF);i>0;i--){const h=rng()*H,a=R(0,TAU),r=R(.15,.9)*(1-.5*h/H),ln=lm*h*h/H;
    glint(x+Math.cos(a)*r+Math.cos(la)*ln,y+h,z+Math.sin(a)*r+Math.sin(la)*ln,h,rng(),kd===1?(rng()<.45?2:rng()):rng(),R(.012,.028));}
  const o=((Math.floor(wrapP(z)/2)%160)*160+(Math.floor(wrapP(x)/2)%160))*2;kelpMap[o]+=.35*dens;kelpMap[o+1]=Math.max(kelpMap[o+1],y+H+66);
}
// seed＝這根海藻自己的亂數種子（葉片細節用），force＝手動擺放（不受巡航路線與坡度限制），hMax＝指定高度上限
function tryColumn(x,z,kd,dens,seed,force,hMax){const key=Math.floor(x/2.7)*4096+Math.floor(z/2.7);if(occ.has(key))return false;if(!force&&nearTour(x,z,4.2))return false;
  const lr=mulberry(seed),LR=(a,b)=>a+(b-a)*lr();
  const fl=floorsAt(x,z).filter(f=>f[1]>(force?5:10));if(!fl.length)return false;const f=fl[(lr()*fl.length)|0],y=f[0];gradAt(x,y+.3,z,tmpN);if(!force&&tmpN[1]<.72)return false;
  occ.add(key);column(x,y-.3,z,Math.min(f[1]-LR(1,5),hMax||LR(17,42)),kd,dens,lr);return true;}
// 手動擺放的海藻（各視點的構圖）要先佔位，之後才是隨機的
placeHero();
for(let i=0;i<14000;i++){const x=rng()*P,z=rng()*P,u=rng(),u2=rng(),u3=rng(),dn=R(.6,1.25);if(u<kelpDens(x,z))tryColumn(x,z,zoneP(x,z)>.42&&u2<.6?1:u3<.04?2:0,dn,i*7919+17,false,0);}
mark('kelp');

/* ── 在網格表面取樣：珊瑚、海綿、葉叢、地被、倒掛的藻、洞穴裡的發光植物 ── */
reseed(101);
function cluster(x,y,z,n,type,lmin,lmax,wmin,wmax,tmax,sway){for(let i=0;i<n;i++){const a=R(0,TAU),r=rng()*.5;
  leaf(leafBig,x+Math.cos(a)*r,y-.12,z+Math.sin(a)*r,R(lmin,lmax),a,R(.05,tmax),R(wmin,wmax)*(BF<1?1.25:1),sway,type,rng(),R(.3,.8),1);}}
function tuft(x,y,z,n,type,lmin,lmax){const yw=R(0,TAU);for(let j=0;j<n;j++)leaf(leafSmall,x+R(-.12,.12),y-.04,z+R(-.12,.12),R(lmin,lmax),yw+j*TAU/n+R(-.4,.4),R(.08,.8),R(.045,.085)*(BF<1?1.3:1),0,type,rng(),R(.3,.7),1);}
function putOn(name,p,n,sc,col,sy,al){put(name,p[0],p[1],p[2],qMul(qUpTo(n,al===undefined?.9:al),qYaw(R(0,TAU))),sc,sc*(sy||1),sc,col);}
const SV=TER.V,SN=TER.surf.length;
const sample=()=>{const o=TER.surf[(rng()*SN)|0]*8;return o;};
const enclosed=(x,y,z)=>{for(let h=2;h<=16;h+=2)if(dAt(x,y+h,z)>0)return 1-h/18;return 0;};
// 岩面上的珊瑚群落
for(let i=72000;i>0;i--){const o=sample(),x=SV[o],y=SV[o+1],z=SV[o+2],ny=SV[o+4],sand=SV[o+6];
  if(y>-6||sand>.5||!freeOf(x,z)||nearTour(x,z,2.2))continue;
  const p=[x,y,z],n=[SV[o+3],ny,SV[o+5]],zp=zoneP(x,z),rm=reefM(x,z),w=.35+.65*Math.max(rm,zp,sstep(2,8,mesaAt(x,z)))*(.4+.6*clus(x,z));
  if(rng()>w)continue;const u=rng(),enc=enclosed(x,y,z);
  if(ny<-.3){const m=8+(rng()*14|0);for(let j=0;j<m;j++)leaf(leafBig,x+R(-.6,.6),y+.2,z+R(-.6,.6),R(.8,3.2),R(0,TAU),Math.PI-R(0,.4),R(.09,.18),0,enc>.3?(rng()<.6?8:7):zp>.3||rng()<.4?3:0,rng(),R(.3,.6),1);continue;}
  if(enc>.25&&ny>.3){if(u<.5){tuft(x,y,z,4,rng()<.6?8:7,.2,.6);glint(x,y+R(.2,.8),z,0,rng(),3,R(.02,.04));}else if(u<.75)cluster(x,y,z,6+(rng()*8|0),rng()<.6?8:7,.5,1.6,.09,.18,.9,1.2);else putOn('anem',p,n,R(.7,1.4),pick([[.4,.9,1],[.7,.5,1],[1,.5,.9]]));continue;}
  if(u<.2)putOn(pick(['stag0','stag1','stag2']),p,n,R(.7,1.9),pick(CORAL),1,.45);
  else if(u<.34)putOn('fan',p,n,R(.9,2.3),pick(FANC),1,.75);
  else if(u<.47)putOn('sponge',p,n,R(.7,1.6),pick(SPONGE),1,.3);
  else if(u<.56&&ny>.6)putOn(pick(TABLES),p,n,R(.7,1.9),pick(TABC),R(.8,1.1));
  else if(u<.64&&ny>.5)putOn('dome',p,n,R(.35,1.1),pick(DOMEC));
  else if(u<.72&&ny>.3)putOn('anem',p,n,R(.7,1.4),pick(ANEC),1,.6);
  else if(u<.77&&ny>.7)putOn('barrel',p,n,R(.6,1.7),pick(BARC),R(.8,1.3));
  else if(u<.88&&ny>.55)cluster(x,y,z,6+(rng()*8|0),zp>.3?(rng()<.7?3:4):pick([2,2,3,7,6]),.6,1.8,.1,.2,.9,1.5);
  else if(ny>-.1&&ny<.75){const yaw=Math.atan2(n[2],n[0]),m=5+(rng()*7|0);for(let j=0;j<m;j++)leaf(leafBig,x,y,z,R(.5,1.4),yaw+R(-.9,.9),R(.3,1.1),R(.07,.13),.5,zp>.4&&rng()<.6?3:0,rng(),R(.2,.6),1);}
  else if(ny>.5)tuft(x,y,z,4,rng()<.6?5:7,.14,.4);}
// 沙地：帶狀葉叢、洋紅與青色的發光地被、短草
reseed(102);
for(let i=Math.floor(840000*BF);i>0;i--){const o=sample(),ny=SV[o+4];if(ny<.74)continue;const x=SV[o]+R(-.45,.45),z=SV[o+2]+R(-.45,.45),y=SV[o+1],sand=SV[o+6];
  if(!freeOf(x,z)||y>-6)continue;const zp=zoneP(x,z),rm=reefM(x,z),kd=kelpDens(x,z),u=rng(),gz=sstep(.5,.66,nG(x/P,z/P));
  if(u<.016*(gz*(1-rm)+.7*kd)*sand)cluster(x,y,z,8+(rng()*11|0),rng()<.1?6:2,1,2.8,.12,.24,.6,2.5);
  else if(u<.016*zp*(.25+.75*clus(x,z)))cluster(x,y,z,10+(rng()*15|0),rng()<.72?3:4,.9,2.6,.13,.26,.9,1.5);
  else if(u<.01*rm)cluster(x,y,z,7+(rng()*9|0),pick([2,3,4,7,2]),.7,1.9,.11,.22,.8,1.5);
  else if(u<.75*Math.max(zp*clus2(x,z),rm*clus(x,z)*.7)){tuft(x,y,z,4,5,.12,.36);if(rng()<.25)glint(x,y+R(.1,.3),z,0,rng(),2,R(.015,.03));}
  else if(u<.7*Math.max(canyon(x,z)*.8,.6*sstep(2,8,mesaAt(x,z)))*clus(x,z)){tuft(x,y,z,3,7,.25,.7);if(rng()<.2)glint(x,y+R(.1,.4),z,0,rng(),.9,R(.015,.03));}
  else if(u<.5*gz*(1-rm)*(.3+.7*clus2(x,z))*sand)tuft(x,y,z,3,2,.2,.55);}
mark('cover');
reseed(103);
const flat=(x,z)=>normalAt(x,z)[1]>.86?1:0,reefy=(x,z)=>Math.max(reefM(x,z),.8*sstep(4,10,mesaAt(x,z)));
// 岩塊：在岩面上取樣，陡的地方多而大、平的地方少而小，各自隨機旋轉並埋進岩面三成；大塊加上碰撞。用獨立的亂數序列，不影響其他佈置
(function(){const rk=mulberry(90210),Q=(a,b)=>a+(b-a)*rk(),near3=(x,y,z,r)=>{for(let i=0;i<tourLen;i+=2){const p=tourPts[i];if(Math.abs(wrapD(x-p[0]))<r&&Math.abs(wrapD(z-p[2]))<r&&Math.hypot(wrapD(x-p[0]),y-p[1],wrapD(z-p[2]))<r)return true;}return false;};
  const grey=()=>{const k=Q(.86,1.12);return[k*Q(.96,1.04),k,k*Q(.95,1.03)];};
  for(let i=Math.floor(95000*Math.max(BF,.3));i>0;i--){const o=TER.surf[(rk()*SN)|0]*8,x=SV[o],y=SV[o+1],z=SV[o+2],nx=SV[o+3],ny=SV[o+4],nz=SV[o+5],sand=SV[o+6];
    if(y>-5||!freeOf(x,z)||(ny>.8&&rk()<(sand>.5?.9:.6)))continue;
    const sc=(.26+2.0*Math.pow(rk(),2.5))*(ny>.8?.55:1);if(near3(x,y,z,2.6+sc))continue;
    const name=sc>1.5?'rkL'+((rk()*2)|0):sc>.62?'rkM'+((rk()*4)|0):'rkS'+((rk()*3)|0),e=sc*.3;
    put(name,x-nx*e,y-ny*e,z-nz*e,qRand(rk),sc*Q(.8,1.25),sc*Q(.7,1.1),sc*Q(.8,1.25),grey(),rk());
    if(sc>1.1)hit(x-nx*e,y-ny*e,z-nz*e,sc*.82,sc*.74,0);}
  // 沙地與平坦岩面上的卵石、碎石
  for(let i=Math.floor(210000*BF);i>0;i--){const o=TER.surf[(rk()*SN)|0]*8,ny=SV[o+4];if(ny<.78)continue;const x=SV[o]+Q(-.45,.45),z=SV[o+2]+Q(-.45,.45),y=SV[o+1];
    if(y>-5||!freeOf(x,z))continue;const sc=.045+.30*Math.pow(rk(),2.2);
    put('peb'+((rk()*2)|0),x,y-sc*.2,z,qRand(rk),sc*Q(.8,1.3),sc*Q(.6,1.),sc*Q(.8,1.3),grey(),rk());}
})();
scatter(1000,(x,z)=>reefy(x,z)*(.15+.85*clus(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround(pick(['stag0','stag1','stag2']),x,z,{s:R(.7,2.1),col:pick(CORAL),align:.3}));
scatter(600,(x,z)=>reefy(x,z)*(.2+.8*clus2(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround('dome',x,z,{s:R(.35,1.3),sy:R(.8,1.25),dy:.1,hit:[1,.82],col:pick(DOMEC)}));
scatter(380,(x,z)=>reefy(x,z)*(.2+.8*clus(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround(pick(TABLES),x,z,{s:R(.6,2.0),sy:R(.8,1.1),col:pick(TABC),align:.25}));
scatter(430,(x,z)=>reefy(x,z)*(.25+.75*clus2(x,z))*(freeOf(x,z)?1:0),(x,z)=>onGround('sponge',x,z,{s:R(.7,1.7),col:pick(SPONGE),align:.3}));
scatter(190,(x,z)=>(reefy(x,z)*.7+.2*zoneP(x,z))*clus2(x,z)*(freeOf(x,z)?1:0)*flat(x,z),(x,z)=>onGround('barrel',x,z,{s:R(.7,2.0),sy:R(.8,1.3),hit:[.5,.9],col:pick(BARC),align:.3}));
scatter(320,(x,z)=>(.2+.8*reefy(x,z))*flat(x,z)*(1-canyon(x,z)),(x,z)=>onGround('star',x,z,{s:R(.16,.34),dy:.02,col:pick([[.62,.26,.08],[.60,.12,.12],[.16,.24,.58],[.62,.44,.16],[.46,.16,.46]]),align:1}));
scatter(460,(x,z)=>(.15+.6*reefy(x,z)+.4*canyon(x,z))*clus2(x,z)*(freeOf(x,z)?1:0),(x,z)=>onGround('urchin',x,z,{s:R(.5,1.1),dy:.12,col:pick([[.35,.12,.5],[.12,.12,.16],[.6,.12,.2],[.2,.2,.6]]),align:1}));
scatter(140,(x,z)=>reefy(x,z)*flat(x,z)*(freeOf(x,z)?1:0),(x,z)=>onGround('clam',x,z,{s:R(.45,1.0),dy:.2,col:pick([[.42,.42,.42],[.50,.28,.42],[.28,.44,.34],[.44,.38,.26]]),align:.8}));

/* ── 各視點的前景：手動指定位置的珊瑚與海綿叢 ── */
function garden(seed,x,z,rad,n,names,sMin,sMax){const r=mulberry(seed),Q=(a,b)=>a+(b-a)*r();
  for(let i=0;i<n;i++){const a=Q(0,TAU),d=Math.sqrt(r())*rad,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d,name=names[(r()*names.length)|0],s=Q(sMin,sMax);
    const pal=name==='barrel'?BARC:name==='sponge'?SPONGE:name==='fan'?FANC:name==='dome'?DOMEC:name==='anem'?ANEC:name.indexOf('table')===0?TABC:CORAL;
    const nrm=normalAt(px,pz),q=qMul(qUpTo(nrm,.3),qYaw(Q(0,TAU))),y=heightAt(px,pz)+(name==='dome'?.1:0)*s;
    put(name,px,y,pz,q,s,s*Q(.85,1.2),s,pal[(r()*pal.length)|0],r()*TAU);if(name==='barrel'||name==='dome')hit(px,y,pz,s*.5,s*.9,0);}}
// 視點 1：岩拱腳下與前景
garden(501,51.5,221.5,2.2,9,['barrel','sponge','stag0','fan','stag1'],.6,1.5);
garden(502,44.5,219.5,2.0,7,['barrel','table2','stag2','sponge'],.6,1.3);
garden(503,50,238,3.0,12,['stag0','stag1','fan','sponge','table','anem'],.7,1.6);
garden(504,66,228,3.0,12,['stag2','fan','sponge','barrel','table3','anem'],.7,1.6);
// 視點 4：珊瑚礁前景的桶狀海綿與珊瑚
garden(511,103.5,86.5,2.4,9,['barrel','barrel','sponge','stag0','table2'],.7,1.6);
garden(512,108.5,87.5,2.2,8,['barrel','fan','stag2','sponge','dome'],.6,1.4);
/* ── 石柱遺跡與沉船 ── */
reseed(104);
(function(){const cx=RUIN[0],cz=RUIN[1],y0=-27.5,stone=()=>{const k=R(.84,1.04);return[.30*k,.285*k,.24*k];},Q0=[0,0,0,1];
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
  put('wreck',x,heightAt(x,z)+2.1,z,q,1,1,1,[.8,.8,.8]);
  for(let i=0;i<26;i++){const a=R(0,TAU),d=R(3,13),px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;onGround(pick(['sponge','fan','stag1','barrel','stag0']),px,pz,{s:R(.5,1.2),col:pick(CORAL)});}
  for(let i=0;i<8;i++){const a=R(0,TAU),d=R(6,13),px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;put('box',px,heightAt(px,pz)+.15,pz,qMul(qYaw(R(0,TAU)),qAxis([1,0,0],R(-.3,.3))),R(1.5,4),.14,R(.25,.4),[.26,.19,.12]);}
})();
reseed(105);
const jellyKind={geo:mJelly(),list:[],far:1,cast:false,sway:[0,0,0,0],det:[0,0,0,0],mat:[0,0]};
(function(){kinds.j=jellyKind;
  const JC=[[1,.55,.85],[.6,.7,1],[.75,.55,1],[.5,.95,.95],[1,.75,.6],[.6,1,.7]];
  for(let i=0;i<170;i++){const a=R(0,TAU),d=Math.sqrt(rng())*30,x=JELLY[0]+Math.cos(a)*d,z=JELLY[1]+Math.sin(a)*d*1.5,s=R(.5,1.4);
    put('j',x,R(-36,-10),z,[0,0,0,1],s,s,s,pick(JC),rng());}
  for(let i=0;i<170;i++){const x=R(0,P),z=R(0,P),s=R(.5,1.2);put('j',x,Math.max(heightAt(x,z)+5,R(-30,-7)),z,[0,0,0,1],s,s,s,pick(JC),rng());}
  delete kinds.j;})();
mark('place');

/* ── 上傳：實例依區塊排序，繪製時用 firstInstance 取出該區塊 ── */
function upload(g){return{vb:buf(new Float32Array(g.v),BU.VERTEX),ib:buf(new Uint32Array(g.i),BU.INDEX),count:g.i.length};}
function buildKind(k){k.mesh=upload(k.geo);const L=k.list,cOf=e=>chunkOf(e[0],e[2]);
  L.sort((a,b)=>cOf(a)-cOf(b));const d=new Float32Array(Math.max(16,L.length*16));k.start=new Int32Array(NCH);k.cnt=new Int32Array(NCH);
  for(let i=0;i<L.length;i++){d.set(L[i],i*16);const c=cOf(L[i]);if(k.cnt[c]===0)k.start[c]=i;k.cnt[c]++;}
  k.ibuf=buf(d,BU.VERTEX);
  k.bg=device.createBindGroup({layout:LK,entries:[{binding:0,resource:{buffer:buf(new Float32Array([...k.sway,...k.det,k.mat[0],k.mat[1],k.fade?165*k.far*.96:0,k.mat[3]||0]),BU.UNIFORM)}}]});
  k.geo=null;k.list=null;}
const statics=Object.keys(kinds).map(n=>kinds[n]);
statics.forEach(buildKind);buildKind(jellyKind);
const LEAFSEG=6,leafStrip=(function(){const d=[];for(let i=0;i<=LEAFSEG;i++){d.push(i/LEAFSEG,-1,i/LEAFSEG,1);}return buf(new Float32Array(d),BU.VERTEX);})();
function buildInst(L,stride,shuffle){let tot=0;for(const b of L)tot+=b.n;const d=new Float32Array(Math.max(stride,tot)),o={start:new Int32Array(NCH),cnt:new Int32Array(NCH),total:tot/stride};let p=0;
  for(let c=0;c<NCH;c++){const b=L[c],n=b.n/stride,a=b.a;
    if(shuffle)for(let i=n-1;i>0;i--){const j=(rng()*(i+1))|0;if(j!==i)for(let k=0;k<stride;k++){const t=a[i*stride+k];a[i*stride+k]=a[j*stride+k];a[j*stride+k]=t;}}
    d.set(a.subarray(0,b.n),p);o.start[c]=p/stride;o.cnt[c]=n;p+=b.n;b.a=null;}
  o.buf=buf(d,BU.VERTEX);return o;}
const LV_big=buildInst(leafBig,12,true),LV_stem=buildInst(leafStem,12,false),LV_small=buildInst(leafSmall,12,true),glints=buildInst(glintB,8,false);
mark('build');
reseed(106);
const bubbles=(function(){const src=[[RUIN[0],RUIN[1]],[RUIN[0]+5,RUIN[1]-3],[WRECK[0]+2,WRECK[1]+1],[WRECK[0]-4,WRECK[1]-3],[96,104],[84,92],[238,208],[226,220],[250,60],[58,236],[70,250],[40,220],[150,262],[160,150],[30,296],[112,90],[188,28],[176,44],[300,150],[150,190],[20,60],[241,157],[150,244],[262,134]];
  src.push([70,262],[57,233],[49,221]);
  const d=[];for(const s of src){const y=floorBelow(s[0],baseH(s[0],s[1])+6,s[1])+.2;for(let i=0;i<40;i++)d.push(s[0]+R(-.6,.6),y,s[1]+R(-.6,.6),rng());}
  return{buf:buf(new Float32Array(d),BU.VERTEX),n:d.length/4};})();
const snow=(function(){const n=lite?3600:12000,d=new Float32Array(n*4);for(let i=0;i<n*4;i++)d[i]=rng();return{buf:buf(d,BU.VERTEX),n};})();
