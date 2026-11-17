/* ───────── 生物 ───────── */
function swimGroup(geo,cap,swim,swimZ,spec){const mesh=upload(geo),buf=gl.createBuffer(),data=new Float32Array(cap*16);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
  return{mesh,buf,data,cap,n:0,vao:meshVAO(mesh,buf,0),swim,swimZ,spec};}
const FQ=lite?.3:1;
const SP={
  fusilier:{g:'torp',A:[.14,.50,1],B:[1,.88,.15],pat:2,size:[.37,.51],v:[1.3,2.6],wk:9},
  sardine:{g:'torp',A:[.70,.78,.84],B:[.42,.52,.62],pat:0,size:[.24,.34],v:[1.6,3.2],wk:12},
  goldie:{g:'torp',A:[1,.45,.18],B:[1,.28,.62],pat:3,size:[.17,.27],v:[.5,1.4],wk:14},
  purple:{g:'torp',A:[.62,.25,.95],B:[1,.8,.2],pat:3,size:[.16,.24],v:[.5,1.4],wk:14},
  neon:{g:'torp',A:[.08,.12,.3],B:[.2,.95,1],pat:2,size:[.12,.18],v:[.6,1.6],wk:15},
  cardinal:{g:'torp',A:[.98,.16,.14],B:[1,.6,.2],pat:0,size:[.16,.23],v:[.4,1.2],wk:14},
  clown:{g:'torp',A:[1,.42,.06],B:[.98,.98,.98],pat:1,size:[.16,.22],v:[.3,.9],wk:14},
  wrasse:{g:'torp',A:[.15,.8,.5],B:[.2,.4,1],pat:2,size:[.29,.44],v:[.6,1.6],wk:10},
  parrot:{g:'torp',A:[.12,.82,.74],B:[1,.42,.66],pat:5,size:[.55,.85],v:[.5,1.3],wk:7},
  trevally:{g:'torp',A:[.64,.70,.74],B:[.32,.38,.44],pat:0,size:[.73,1.10],v:[1.6,3.0],wk:6},
  kelpfish:{g:'torp',A:[.95,.66,.16],B:[.6,.38,.1],pat:0,size:[.32,.49],v:[.6,1.6],wk:9},
  tang:{g:'tall',A:[1,.86,.10],B:[1,.94,.5],pat:0,size:[.32,.44],v:[.5,1.4],wk:10},
  bluetang:{g:'tall',A:[.10,.30,1],B:[1,.86,.12],pat:3,size:[.29,.40],v:[.5,1.4],wk:10},
  banner:{g:'tall',A:[.97,.97,.9],B:[.06,.06,.1],pat:1,size:[.29,.40],v:[.4,1.1],wk:10},
  butterfly:{g:'tall',A:[1,.80,.12],B:[.08,.08,.1],pat:7,size:[.24,.34],v:[.4,1.1],wk:11},
  angel:{g:'tall',A:[.16,.24,.9],B:[1,.82,.14],pat:1,size:[.37,.51],v:[.4,1.0],wk:9},
  discus:{g:'tall',A:[1,.36,.52],B:[.4,.9,1],pat:6,size:[.27,.37],v:[.4,1.1],wk:10},
  chromis:{g:'tall',A:[.25,.92,.80],B:[.2,.62,.76],pat:0,size:[.16,.23],v:[.4,1.2],wk:15}
};
const groups={
  torp:swimGroup(mFish({H:.15,W:.085,belly:.75,tailT:.17,tailB:.17,tailL:.2,notch:.45,d0:.3,d1:.7,dH:.09,dSweep:.05,aH:.05,pL:.12,pW:.07,pDrop:.5}),Math.ceil(2800*FQ),[.075,6,0,0],0,.9),
  tall:swimGroup(mFish({H:.30,W:.055,pk:.55,belly:.25,tailT:.15,tailB:.15,tailL:.14,notch:.72,d0:.2,d1:.82,dH:.12,dSweep:.06,aH:.11,a0:.4,a1:.85,pL:.1,pW:.06,pDrop:.4}),Math.ceil(1100*FQ),[.06,5,0,0],0,.5),
  shark:swimGroup(mFish({H:.10,W:.09,pk:.5,belly:1,tailT:.25,tailB:.11,tailL:.2,tailBL:.5,notch:.35,d0:.34,d1:.52,dH:.17,dSweep:.08,dTri:true,aH:.04,a0:.72,a1:.82,pL:.25,pW:.1,pDrop:.4,pz:.12}),8,[.07,5,0,0],0,.4),
  whale:swimGroup(mFish({H:.115,W:.11,pk:.45,belly:.9,fluke:true,tailT:.2,tailB:.2,tailL:.11,notch:.4,d0:.62,d1:.72,dH:.03,pL:.24,pW:.08,pDrop:.45,pz:.16,vertical:true}),4,[0,0,.05,0],4.2,.3),
  dolphin:swimGroup(mFish({H:.10,W:.085,pk:.52,belly:.8,fluke:true,tailT:.15,tailB:.15,tailL:.1,notch:.3,d0:.42,d1:.58,dH:.11,dSweep:.08,dTri:true,pL:.16,pW:.07,pDrop:.5,pz:.14,vertical:true}),10,[0,0,.07,0],5.5,.4),
  manta:swimGroup(mManta(),8,[.02,2,.34,1.7],0,.3),
  turtle:swimGroup(mTurtle(),8,[0,0,.26,1.6],0,.3)
};
const schools=[],fishes=[];
function school(sp,n,ax,az,rad,h,dh,spread,spd){const S=SP[sp],s={ax,az,rad,h,dh,spd:spd||1,fa:R(.6,1.2)*(rng()<.5?-1:1),fb:R(.6,1.2),p1:R(0,TAU),p2:R(0,TAU),p3:R(0,TAU),lx:ax,ly:-10,lz:az};schools.push(s);
  for(let i=0;i<n;i++){const k=R(.88,1.1),a=R(0,TAU),r=Math.cbrt(rng())*spread;
    fishes.push({s,g:groups[S.g],x:ax+Math.cos(a)*r,y:0,z:az+Math.sin(a)*r,vx:R(-1,1),vy:0,vz:R(-1,1),dx:0,dy:0,dz:1,ox:Math.cos(a)*r,oy:R(-.4,.4)*spread,oz:Math.sin(a)*r,
      a0:R(0,TAU),spin:R(.5,1.5)*(rng()<.5?-1:1),ph:R(0,TAU),size:R(S.size[0],S.size[1]),vmin:S.v[0],vmax:S.v[1]*R(.85,1.1),wk:S.wk,turn:R(2.2,3.6),
      A:[S.A[0]*k,S.A[1]*k,S.A[2]*k],B:S.B,pat:S.pat,init:false});}}
const N=n=>Math.max(3,Math.round(n*FQ));
REEFS.forEach((r,i)=>{const q=r[2]>35?1:.6,J=(d)=>[r[0]+R(-d,d),r[1]+R(-d,d)];let p;
  p=J(8);school('goldie',N(80*q),p[0],p[1],9,2,.7,5);p=J(20);school('purple',N(60*q),p[0],p[1],8,1.8,.6,4.5);
  p=J(14);school('chromis',N(70*q),p[0],p[1],7,1.8,.6,4.5);p=J(18);school('neon',N(90*q),p[0],p[1],10,2.4,.8,3.5,1.3);
  p=J(16);school('cardinal',N(40*q),p[0],p[1],6,1.4,.5,3.5);school('tang',N(26*q),r[0],r[1],18,2.6,.9,3.5);
  p=J(10);school(i%2?'bluetang':'banner',N(20*q),p[0],p[1],14,3,.9,3.2);p=J(12);school('butterfly',N(18*q),p[0],p[1],10,2.4,.8,3);
  p=J(15);school('angel',N(10*q),p[0],p[1],12,3.2,1,3);p=J(15);school('discus',N(22*q),p[0],p[1],9,2.6,.8,3.2);
  p=J(14);school('clown',N(10),p[0],p[1],2.5,1,.3,1.4);p=J(20);school('wrasse',N(16*q),p[0],p[1],16,2.2,.8,4);
  p=J(18);school('parrot',N(9*q),p[0],p[1],18,2.6,.8,4);school('fusilier',N(80*q),r[0],r[1],r[2]*.55,7,2,5,1.6);});
school('sardine',N(240),160,160,60,14,4,7,2.2);school('sardine',N(180),40,60,45,12,4,6,2.2);school('sardine',N(120),WRECK[0],WRECK[1],16,8,2,4.5,1.8);school('sardine',N(160),250,250,50,13,4,6,2.2);
school('trevally',N(14),150,120,55,10,3,5,2.2);school('trevally',N(10),WRECK[0],WRECK[1],22,6,2,4,1.8);
BASINS.forEach(k=>{school('kelpfish',N(60),k[0],k[1],k[2]*.5,9,5,8,.9);school('kelpfish',N(30),k[0]+8,k[1]-6,10,5,2.5,5,.8);school('neon',N(70),k[0]-6,k[1]+5,12,12,5,4,1.2);school('fusilier',N(40),k[0],k[1],k[2]*.6,16,4,5,1.5);});
MESAS.forEach(m=>{school('goldie',N(50),m[0],m[1],8,2,.7,5);school('discus',N(16),m[0],m[1],9,3,.8,3);school('bluetang',N(14),m[0],m[1],11,3.5,1,3);});
school('banner',N(16),RUIN[0],RUIN[1],9,4.5,1.5,3);school('tang',N(20),RUIN[0],RUIN[1],11,3.2,1,3.5);school('bluetang',N(12),RUIN[0]+3,RUIN[1]-2,7,5,1,2.5);school('goldie',N(50),RUIN[0],RUIN[1],6,3,1.5,5);school('angel',N(8),RUIN[0],RUIN[1],8,4,1,3);
for(let i=0;i<TOUR.length;i++){const w=TOUR[i],sp=pick(['neon','fusilier','sardine','purple','goldie','kelpfish','chromis']);school(sp,N(sp==='sardine'?110:70),w[0]+R(-7,7),w[1]+R(-7,7),9,R(3,7),1.5,4,1.3);if(i%2)school(pick(['tang','bluetang','butterfly','discus','banner']),N(18),w[0]+R(-8,8),w[1]+R(-8,8),8,R(2.5,5),1,3);}
school('neon',N(80),SPAWN[0]+5,SPAWN[1]+9,7,5,2,3.5,1.2);school('tang',N(24),SPAWN[0]+4,SPAWN[1]+12,6,6,2,3);
const bigs=[];
function big(g,o){bigs.push(Object.assign({g:groups[g],sign:1,th0:0,dy:1.5,alt:null,bank:.22,freq:2,pat:0,B:[.3,.3,.3],lag:0},o));}
big('whale',{cx:160,cz:160,rx:112,rz:92,y0:-13,dy:3,spd:2.3,size:13,A:[.20,.25,.32],B:[.15,.19,.25],freq:.95,bank:.08});
big('whale',{cx:160,cz:160,rx:107,rz:87,y0:-16,dy:3,spd:2.3*105/100,size:6.2,A:[.26,.31,.38],B:[.2,.24,.3],freq:1.4,bank:.08,th0:-.1});
big('whale',{cx:150,cz:170,rx:118,rz:100,y0:-11,dy:2.5,spd:2.1,size:11.5,A:[.18,.22,.30],B:[.14,.18,.24],freq:1,bank:.08,th0:3.3});
for(let i=0;i<4;i++)big('manta',{cx:120,cz:96,rx:60-i*4,rz:46-i*3,y0:-15-i*1.5,dy:2.5,spd:1.9,size:2.5-i*.25,A:[.12,.13,.16],B:[.1,.1,.12],freq:1.7,bank:.3,th0:1-i*.1});
for(let i=0;i<3;i++)big('manta',{cx:70,cz:236,rx:44-i*4,rz:52-i*3,y0:-14-i*1.6,dy:3,spd:1.7,size:2.3-i*.2,A:[.12,.13,.16],B:[.1,.1,.12],freq:1.6,bank:.3,th0:3-i*.11,sign:-1});
for(let i=0;i<7;i++)big('dolphin',{cx:170,cz:150,rx:128-i*3,rz:108+i*2,y0:-6.5-(i%3)*1.4,dy:2.2,spd:5.2,size:2.3+(i%3)*.15,A:[.40,.46,.54],B:[.3,.35,.42],freq:4.6,bank:.14,th0:2.2-i*.035-(i%2)*.02});
big('shark',{cx:160,cz:0,rx:135,rz:6,alt:3,spd:1.7,size:2.9,A:[.42,.47,.52],B:[.3,.34,.38],freq:3.2,canyon:true,th0:.5});
big('shark',{cx:160,cz:0,rx:120,rz:5,alt:4.5,spd:1.5,size:2.4,A:[.45,.5,.54],B:[.3,.34,.38],freq:3.5,canyon:true,th0:3.4,sign:-1});
big('shark',{cx:REEFS[0][0],cz:REEFS[0][1],rx:34,rz:30,alt:5,spd:1.5,size:1.9,A:[.5,.5,.47],B:[.12,.12,.13],freq:4,th0:2});
big('shark',{cx:REEFS[1][0],cz:REEFS[1][1],rx:30,rz:36,alt:5,spd:1.5,size:2.0,A:[.5,.5,.47],B:[.12,.12,.13],freq:4,th0:5,sign:-1});
big('shark',{cx:WRECK[0],cz:WRECK[1],rx:22,rz:26,alt:7,spd:1.4,size:2.6,A:[.42,.47,.52],B:[.3,.34,.38],freq:3.4,th0:1});
big('turtle',{cx:REEFS[0][0]+6,cz:REEFS[0][1]-8,rx:20,rz:16,alt:5,dy:1.5,spd:.75,size:1.25,A:[.42,.5,.26],B:[.3,.36,.2],freq:2.1,pat:4,bank:.12});
big('turtle',{cx:RUIN[0],cz:RUIN[1],rx:13,rz:15,alt:7,dy:1.5,spd:.7,size:1.1,A:[.5,.45,.26],B:[.3,.36,.2],freq:2.2,pat:4,bank:.12,sign:-1,th0:2});
big('turtle',{cx:REEFS[1][0],cz:REEFS[1][1],rx:22,rz:18,alt:6,dy:2,spd:.75,size:1.35,A:[.4,.5,.3],B:[.3,.36,.2],freq:2,pat:4,bank:.12,th0:4});
big('turtle',{cx:60,cz:236,rx:26,rz:20,alt:12,dy:4,spd:.7,size:1.2,A:[.44,.5,.28],B:[.3,.36,.2],freq:2,pat:4,bank:.12,th0:1});
big('turtle',{cx:REEFS[2][0],cz:REEFS[2][1],rx:16,rz:14,alt:5,dy:2,spd:.7,size:1.1,A:[.46,.48,.28],B:[.3,.36,.2],freq:2.1,pat:4,bank:.12,th0:3,sign:-1});
function bigPos(b,t,out){const th=b.th0+b.sign*t*b.spd/((b.rx+b.rz)*.5);const x=b.cx+b.rx*Math.cos(th);let z=b.cz+b.rz*Math.sin(th);if(b.canyon)z=canyonZ(x)+b.rz*Math.sin(th*3);
  let y=b.alt!==null?heightAt(x,z)+b.alt+b.dy*Math.sin(th*2.3+b.th0):b.y0+b.dy*Math.sin(th*2+b.th0);y=Math.min(Math.max(y,heightAt(x,z)+1.6),-2);out[0]=x;out[1]=y;out[2]=z;}

