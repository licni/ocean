/* ───────── 生物：六萬多條魚的群游在顯示卡上模擬（運算著色器），會躲開鯊魚與海豚；大型生物走固定航線 ───────── */
const SP={
  fusilier:{g:0,A:[.08,.30,.62],B:[.78,.62,.10],pat:2,size:.36,v:[1.3,2.6],wk:9},
  sardine:{g:0,A:[.42,.50,.56],B:[.26,.34,.42],pat:0,size:.29,v:[1.6,3.2],wk:12},
  goldie:{g:0,A:[.80,.34,.12],B:[.74,.20,.42],pat:3,size:.22,v:[.5,1.4],wk:14},
  purple:{g:0,A:[.42,.16,.62],B:[.78,.56,.14],pat:3,size:.20,v:[.5,1.4],wk:14},
  neon:{g:0,A:[.05,.08,.20],B:[.15,.75,.85],pat:2,size:.16,v:[.6,1.6],wk:15},
  cardinal:{g:0,A:[.70,.12,.10],B:[.74,.42,.14],pat:0,size:.19,v:[.4,1.2],wk:14},
  clown:{g:0,A:[.82,.32,.05],B:[.82,.82,.80],pat:1,size:.19,v:[.3,.9],wk:14},
  wrasse:{g:0,A:[.10,.52,.34],B:[.14,.28,.66],pat:2,size:.30,v:[.6,1.6],wk:10},
  parrot:{g:0,A:[.08,.50,.46],B:[.72,.30,.46],pat:5,size:.52,v:[.5,1.3],wk:7},
  trevally:{g:0,A:[.46,.52,.56],B:[.22,.27,.32],pat:0,size:.9,v:[1.6,3.0],wk:6},
  kelpfish:{g:0,A:[.66,.44,.10],B:[.40,.25,.07],pat:0,size:.4,v:[.6,1.6],wk:9},
  tang:{g:1,A:[.84,.68,.07],B:[.80,.72,.34],pat:0,size:.29,v:[.5,1.4],wk:10},
  bluetang:{g:1,A:[.07,.20,.70],B:[.80,.64,.08],pat:3,size:.27,v:[.5,1.4],wk:10},
  banner:{g:1,A:[.80,.80,.72],B:[.05,.05,.07],pat:1,size:.28,v:[.4,1.1],wk:10},
  butterfly:{g:1,A:[.82,.62,.08],B:[.06,.06,.07],pat:7,size:.24,v:[.4,1.1],wk:11},
  angel:{g:1,A:[.10,.16,.62],B:[.80,.62,.10],pat:1,size:.31,v:[.4,1.0],wk:9},
  discus:{g:1,A:[.76,.26,.36],B:[.28,.66,.76],pat:6,size:.26,v:[.4,1.1],wk:10},
  chromis:{g:1,A:[.16,.62,.54],B:[.12,.42,.52],pat:0,size:.20,v:[.4,1.2],wk:15}};
const PER=256,NSCH=lite?24:tmode?48:256,NB=NSCH*PER,NPRED=12;
const schools=[];
reseed(107);
(function(){const want=[];const add=(sp,ax,az,rad,h,dh,spread,spd)=>want.push({sp,ax,az,rad,h,dh,spread:spread*(SP[sp].g===1?1.7:SP[sp].size<.3?1.35:1.15),spd:spd||1});
  // 視點 1：穿過岩拱的魚群
  add('sardine',57,234,9,9,3,6,1.6);add('fusilier',60,240,12,12,3,6,1.4);add('kelpfish',50,224,7,5,2,5,.8);add('tang',52,230,6,4,1.2,4);add('neon',58,228,6,6,2,5,1.2);
  REEFS.forEach((r,i)=>{const J=d=>[r[0]+R(-d,d),r[1]+R(-d,d)];let p;
    p=J(8);add('goldie',p[0],p[1],9,2.2,.7,6);p=J(20);add('purple',p[0],p[1],8,2,.6,5.5);p=J(18);add('neon',p[0],p[1],10,2.6,.8,5,1.3);
    p=J(14);add('chromis',p[0],p[1],7,2,.6,5.5);add('fusilier',r[0],r[1],r[2]*.55,8,2,7,1.6);add('tang',r[0],r[1],18,3,.9,6);
    p=J(10);add(i%2?'bluetang':'banner',p[0],p[1],14,3.4,.9,5.5);p=J(15);add('discus',p[0],p[1],9,3,.8,5);
    if(r[2]>35){p=J(16);add('cardinal',p[0],p[1],6,1.8,.5,5);p=J(12);add('butterfly',p[0],p[1],10,2.8,.8,5);p=J(20);add('wrasse',p[0],p[1],16,2.6,.8,6);p=J(15);add('angel',p[0],p[1],12,3.6,1,5.5);p=J(18);add('parrot',p[0],p[1],18,3,.8,7);p=J(14);add('clown',p[0],p[1],3,1.2,.3,2.5);}});
  add('sardine',160,160,60,15,4,9,2.2);add('sardine',40,60,45,13,4,8,2.2);add('sardine',WRECK[0],WRECK[1],16,9,2,6,1.8);add('sardine',250,250,50,14,4,8,2.2);add('sardine',100,230,40,16,4,8,2.1);add('sardine',280,90,40,14,4,8,2.1);
  add('trevally',150,120,55,11,3,9,2.2);add('trevally',WRECK[0],WRECK[1],22,7,2,8,1.8);
  BASINS.forEach(k=>{add('kelpfish',k[0],k[1],k[2]*.5,10,5,10,.9);add('neon',k[0]-6,k[1]+5,12,13,5,6,1.2);add('fusilier',k[0],k[1],k[2]*.6,17,4,7,1.5);add('kelpfish',k[0]+9,k[1]-7,10,6,2.5,7,.8);});
  MESAS.forEach(m=>{add('goldie',m[0],m[1],m[2]*.7,2.4,.7,7);add('discus',m[0],m[1],m[2]*.8,3.4,.8,6);add('bluetang',m[0],m[1],m[2],4,1,6);add('purple',m[0]+R(-6,6),m[1]+R(-6,6),8,2.2,.6,5);});
  add('banner',RUIN[0],RUIN[1],9,4.8,1.5,5);add('tang',RUIN[0],RUIN[1],11,3.6,1,5.5);add('goldie',RUIN[0],RUIN[1],6,3.2,1.5,6);add('angel',RUIN[0],RUIN[1],8,4.4,1,5);
  for(let i=0;i<TOUR.length;i++){const w=TOUR[i];add(pick(['neon','fusilier','sardine','purple','goldie','kelpfish','cardinal']),w[0]+R(-7,7),w[1]+R(-7,7),9,R(3,7),1.5,6,1.3);add(pick(['tang','bluetang','butterfly','discus','banner','chromis']),w[0]+R(-8,8),w[1]+R(-8,8),8,R(2.5,5),1,5);}
  while(want.length<NSCH)add(pick(Object.keys(SP)),R(0,P),R(0,P),R(8,30),R(3,12),2,6,1.2);
  // 依模型分組（細長型在前、側扁型在後），顯示卡剔除時才能分成兩批繪製
  const pri=want.slice(0,NSCH).sort((a,b)=>SP[a.sp].g-SP[b.sp].g);
  for(const w of pri)schools.push(Object.assign(w,{S:SP[w.sp],fa:R(.6,1.2)*(rng()<.5?-1:1),fb:R(.6,1.2),p1:R(0,TAU),p2:R(0,TAU),p3:R(0,TAU),lx:w.ax,ly:-12,lz:w.az}));})();
const NT=schools.filter(s=>s.S.g===0).length;
function leader(s,t){const T=t*s.spd/s.rad;s.lx=s.ax+Math.cos(T*s.fa+s.p1)*s.rad;s.lz=s.az+Math.sin(T*s.fb+s.p2)*s.rad;s.ly=Math.min(-2,heightAt(s.lx,s.lz)+s.h+Math.sin(T*.7+s.p3)*s.dh);}
const boids=(function(){
  const init=new Float32Array(NB*8),spec=new Float32Array(NSCH*8),scD=new Float32Array(NSCH*8);
  schools.forEach((s,k)=>{leader(s,0);const S=s.S;spec.set([S.A[0],S.A[1],S.A[2],S.pat,S.B[0],S.B[1],S.B[2],S.size],k*8);scD.set([s.lx,s.ly,s.lz,s.spread,S.v[0],S.v[1],S.wk,Math.max(.25,S.size*1.1)],k*8);
    for(let i=0;i<PER;i++){const o=(k*PER+i)*8,a=R(0,TAU),r=Math.sqrt(rng())*s.spread;init.set([s.lx+Math.cos(a)*r,Math.min(-2,s.ly+R(-.4,.4)*s.spread),s.lz+Math.sin(a)*r,R(0,TAU),R(-1,1),0,R(-1,1),rng()],o);}});
  const U=BU.STORAGE,A=buf(init,U),B=buf(init,U),specB=buf(spec,U),scB=buf(scD,U);
  const simU=device.createBuffer({size:352,usage:BU.UNIFORM|BU.COPY_DST}),cnt=device.createBuffer({size:16,usage:BU.STORAGE|BU.COPY_SRC|BU.COPY_DST}),vis=device.createBuffer({size:NB*16,usage:BU.STORAGE});
  const COMMON=/*wgsl*/`
struct Fish { p:vec4f, v:vec4f };
struct U { cam:vec4f, misc:vec4f, pl:array<vec4f,6>, shw:vec4f, sunv:vec4f, pred:array<vec4f,12> };
@group(0) @binding(0) var<uniform> u:U;`;
  const simP=device.createComputePipeline({layout:'auto',compute:{entryPoint:'sim',module:shader(COMMON+/*wgsl*/`
struct Sc { t:vec4f, k:vec4f };
@group(0) @binding(1) var<storage,read> A:array<Fish>;
@group(0) @binding(2) var<storage,read_write> B:array<Fish>;
@group(0) @binding(3) var<storage,read> sc:array<Sc>;
@group(0) @binding(4) var tD:texture_3d<f32>;
@group(0) @binding(5) var sV:sampler;
fn hsh(n:u32)->u32{var x=n*747796405u+2891336453u;x=((x>>((x>>28u)+4u))^x)*277803737u;return (x>>22u)^x;}
fn dn(p:vec3f)->f32{return (textureSampleLevel(tD,sV,vec3f((p.x+.5)/320.,(p.y+66.5)/64.,(p.z+.5)/320.),0.).r*255.-128.)/31.;}
@compute @workgroup_size(64) fn sim(@builtin(global_invocation_id) gid:vec3u){
  let i=gid.x;if(i>=arrayLength(&A)){return;}
  let s=i/256u;let f=A[i];let S=sc[s];let dt=u.cam.w;let tm=u.misc.x;
  var p=f.p.xyz;var v=f.v.xyz;let seed=f.v.w;
  let a0=seed*6.283+tm*.35*(fract(seed*7.)-.5);let rr=sqrt(fract(seed*13.7))*S.t.w;
  let tgt=S.t.xyz+vec3f(cos(a0)*rr,(fract(seed*5.3)-.5)*S.t.w*.7,sin(a0)*rr);
  var coh=vec3f(0.);var ali=vec3f(0.);var sep=vec3f(0.);
  for(var j=0u;j<8u;j++){
    let nb=((i%256u)+1u+hsh(i*8u+j+u32(u.misc.y)*131u)%255u)%256u;
    let o=A[s*256u+nb];let d=o.p.xyz-p;let l=length(d)+1e-4;
    coh+=o.p.xyz;ali+=o.v.xyz;if(l<S.k.w){sep-=d/l*(S.k.w-l);}
  }
  var acc=(tgt-p)*.55+(coh/8.-p)*.30+(ali/8.-v)*.9+sep*4.;
  let q=p+v*.7;let d0=dn(q);
  if(d0>-1.6){let e=.9;
    let gr=vec3f(dn(q+vec3f(e,0.,0.))-dn(q-vec3f(e,0.,0.)),dn(q+vec3f(0.,e,0.))-dn(q-vec3f(0.,e,0.)),dn(q+vec3f(0.,0.,e))-dn(q-vec3f(0.,0.,e)));
    acc-=normalize(gr+vec3f(1e-5,2e-5,0.))*(d0+1.6)*10.;}
  var e2=p-u.cam.xyz;e2.x-=320.*round(e2.x/320.);e2.z-=320.*round(e2.z/320.);let el=length(e2)+1e-4;
  if(el<4.5){acc+=e2/el*(4.5-el)*S.k.y*1.8;}
  // 掠食者（鯊魚、海豚）靠近時整群閃開
  for(var k=0;k<12;k++){let pr=u.pred[k];var e3=p-pr.xyz;e3.x-=320.*round(e3.x/320.);e3.z-=320.*round(e3.z/320.);let l3=length(e3)+1e-4;
    if(l3<pr.w){acc+=e3/l3*(pr.w-l3)*S.k.y*1.5;}}
  if(p.y>-1.5){acc.y-=(p.y+1.5)*8.;}
  v+=acc*dt;v.y*=exp(-1.1*dt);
  let sp=length(v);let cl=clamp(sp,S.k.x,S.k.y);v=v/max(sp,1e-4)*cl;
  p+=v*dt;
  let ph=f.p.w+dt*(3.+cl*S.k.z);
  B[i]=Fish(vec4f(p,ph-6.2831853*floor(ph/6.2831853)),vec4f(v,seed));
}`,'boidSim')}});
  const cullP=device.createComputePipeline({layout:'auto',compute:{entryPoint:'cull',module:shader(COMMON+/*wgsl*/`
struct C { c:array<atomic<u32>,4> };
@group(0) @binding(1) var<storage,read> F:array<Fish>;
@group(0) @binding(2) var<storage,read_write> cn:C;
@group(0) @binding(3) var<storage,read_write> vis:array<u32>;
@compute @workgroup_size(64) fn cull(@builtin(global_invocation_id) gid:vec3u){
  let i=gid.x;let n=arrayLength(&F);if(i>=n){return;}
  var p=F[i].p.xyz;p.x+=320.*round((u.cam.x-p.x)/320.);p.z+=320.*round((u.cam.z-p.z)/320.);
  let gI=select(0u,1u,i>=u32(u.misc.z));
  // 第 2、3 份清單：落在近景陰影視窗裡的魚（不管鏡頭看不看得到，影子都要畫）
  let sq=(p.xz-u.sunv.xz*(p.y/u.sunv.y)-u.shw.xy)*u.shw.z;
  if(u.shw.w>.5&&sq.x>-.02&&sq.y>-.02&&sq.x<1.02&&sq.y<1.02){let s2=atomicAdd(&cn.c[2u+gI],1u);vis[(2u+gI)*n+s2]=i;}
  let d=p-u.cam.xyz;if(dot(d,d)>u.misc.w*u.misc.w){return;}
  for(var k=0;k<6;k++){if(dot(u.pl[k].xyz,p)+u.pl[k].w<-1.2){return;}}
  let slot=atomicAdd(&cn.c[gI],1u);vis[gI*n+slot]=i;
}`,'boidCull')}});
  const g0=upload(mFish({K:10,S:8,H:.15,W:.085,belly:.75,tailT:.17,tailB:.17,tailL:.2,notch:.45,d0:.3,d1:.7,dH:.09,dSweep:.05,aH:.05,pL:.12,pW:.07,pDrop:.5}));
  const g1=upload(mFish({K:10,S:8,H:.30,W:.055,pk:.55,belly:.25,tailT:.15,tailB:.15,tailL:.14,notch:.72,d0:.2,d1:.82,dH:.12,dSweep:.06,aH:.11,a0:.4,a1:.85,pL:.1,pW:.06,pDrop:.4}));
  const ind=buf(new Uint32Array([g0.count,0,0,0,0,g1.count,0,0,0,0,g0.count,0,0,0,0,g1.count,0,0,0,0]),BU.INDIRECT);
  const sw0=buf(new Float32Array([.075,6,0,0,0,.9,0,.036]),BU.UNIFORM),sw1=buf(new Float32Array([.06,5,0,0,0,.5,NB,.074]),BU.UNIFORM),sw2=buf(new Float32Array([.075,6,0,0,0,.9,NB*2,.036]),BU.UNIFORM),sw3=buf(new Float32Array([.06,5,0,0,0,.5,NB*3,.074]),BU.UNIFORM);
  const mk=(st,sw)=>device.createBindGroup({layout:LBOID,entries:[{binding:0,resource:{buffer:sw}},{binding:1,resource:{buffer:st}},{binding:2,resource:{buffer:vis}},{binding:3,resource:{buffer:specB}}]});
  return{A,B,scB,scD,simU,cnt,vis,ind,simP,cullP,g0,g1,drawBG:[[mk(A,sw0),mk(A,sw1),mk(A,sw2),mk(A,sw3)],[mk(B,sw0),mk(B,sw1),mk(B,sw2),mk(B,sw3)]],simBG:null,cullBG:null,flip:0,uD:new Float32Array(88),frame:0,zero:new Uint32Array(4)};})();
// 密度場貼圖建立後才能接上模擬（魚靠它繞過岩石）
function boidBind(texDens){const b=boids,sim=(a,c)=>device.createBindGroup({layout:b.simP.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:b.simU}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:b.scB}},{binding:4,resource:texDens.createView()},{binding:5,resource:sVol}]});
  const cu=a=>device.createBindGroup({layout:b.cullP.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:b.simU}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:b.cnt}},{binding:3,resource:{buffer:b.vis}}]});
  b.simBG=[sim(b.A,b.B),sim(b.B,b.A)];b.cullBG=[cu(b.B),cu(b.A)];}

/* 大型生物：固定航線，每幀在 CPU 更新少量實例 */
function swimGroup(geo,cap,swim,swimZ,spec){const mesh=upload(geo),data=new Float32Array(cap*16),ib=device.createBuffer({size:cap*64,usage:BU.VERTEX|BU.COPY_DST});
  const bg=device.createBindGroup({layout:LSW,entries:[{binding:0,resource:{buffer:buf(new Float32Array([...swim,swimZ,spec,0,0]),BU.UNIFORM)}}]});
  return{mesh,ib,data,cap,n:0,bg};}
const groups={
  shark:swimGroup(mFish({H:.10,W:.09,pk:.5,belly:1,tailT:.25,tailB:.11,tailL:.2,tailBL:.5,notch:.35,d0:.34,d1:.52,dH:.17,dSweep:.08,dTri:true,aH:.04,a0:.72,a1:.82,pL:.25,pW:.1,pDrop:.4,pz:.12}),8,[.07,5,0,0],0,.4),
  whale:swimGroup(mFish({K:16,S:12,H:.115,W:.11,pk:.45,belly:.9,fluke:true,tailT:.2,tailB:.2,tailL:.11,notch:.4,d0:.62,d1:.72,dH:.03,pL:.24,pW:.08,pDrop:.45,pz:.16,vertical:true}),4,[0,0,.05,0],4.2,.3),
  dolphin:swimGroup(mFish({H:.10,W:.085,pk:.52,belly:.8,fluke:true,tailT:.15,tailB:.15,tailL:.1,notch:.3,d0:.42,d1:.58,dH:.11,dSweep:.08,dTri:true,pL:.16,pW:.07,pDrop:.5,pz:.14,vertical:true}),10,[0,0,.07,0],5.5,.4),
  manta:swimGroup(mManta(),8,[.02,2,.34,1.7],0,.3),
  turtle:swimGroup(mTurtle(),8,[0,0,.26,1.6],0,.3)};
const bigs=[];
function big(g,o){bigs.push(Object.assign({g:groups[g],sign:1,th0:0,dy:1.5,alt:null,bank:.22,freq:2,pat:0,B:[.3,.3,.3]},o));}
big('whale',{cx:160,cz:160,rx:112,rz:92,y0:-13,dy:3,spd:2.3,size:13,A:[.20,.25,.32],B:[.15,.19,.25],freq:.95,bank:.08});
big('whale',{cx:160,cz:160,rx:107,rz:87,y0:-16,dy:3,spd:2.3*105/100,size:6.2,A:[.26,.31,.38],B:[.2,.24,.3],freq:1.4,bank:.08,th0:-.1});
big('whale',{cx:150,cz:170,rx:118,rz:100,y0:-11,dy:2.5,spd:2.1,size:11.5,A:[.18,.22,.30],B:[.14,.18,.24],freq:1,bank:.08,th0:3.3});
for(let i=0;i<4;i++)big('manta',{cx:120,cz:96,rx:60-i*4,rz:46-i*3,y0:-15-i*1.5,dy:2.5,spd:1.9,size:2.5-i*.25,A:[.22,.25,.30],B:[.14,.15,.18],freq:1.7,bank:.3,th0:1-i*.1});
for(let i=0;i<3;i++)big('manta',{cx:70,cz:236,rx:44-i*4,rz:52-i*3,y0:-14-i*1.6,dy:3,spd:1.7,size:2.3-i*.2,A:[.22,.25,.30],B:[.14,.15,.18],freq:1.6,bank:.3,th0:3-i*.11,sign:-1});
for(let i=0;i<7;i++)big('dolphin',{cx:170,cz:150,rx:128-i*3,rz:108+i*2,y0:-6.5-(i%3)*1.4,dy:2.2,spd:5.2,size:2.3+(i%3)*.15,A:[.40,.46,.54],B:[.3,.35,.42],freq:4.6,bank:.14,th0:2.2-i*.035-(i%2)*.02});
big('shark',{cx:160,cz:0,rx:135,rz:6,alt:3.5,spd:1.7,size:2.9,A:[.42,.47,.52],B:[.3,.34,.38],freq:3.2,canyon:true,th0:.5});
big('shark',{cx:160,cz:0,rx:120,rz:5,alt:5,spd:1.5,size:2.4,A:[.45,.5,.54],B:[.3,.34,.38],freq:3.5,canyon:true,th0:3.4,sign:-1});
big('shark',{cx:REEFS[0][0],cz:REEFS[0][1],rx:34,rz:30,alt:5,spd:1.5,size:1.9,A:[.5,.5,.47],B:[.12,.12,.13],freq:4,th0:2});
big('shark',{cx:REEFS[1][0],cz:REEFS[1][1],rx:30,rz:36,alt:5,spd:1.5,size:2.0,A:[.5,.5,.47],B:[.12,.12,.13],freq:4,th0:5,sign:-1});
big('shark',{cx:WRECK[0],cz:WRECK[1],rx:22,rz:26,alt:7,spd:1.4,size:2.6,A:[.42,.47,.52],B:[.3,.34,.38],freq:3.4,th0:1});
big('turtle',{cx:REEFS[0][0]+6,cz:REEFS[0][1]-8,rx:20,rz:16,alt:5,dy:1.5,spd:.75,size:1.25,A:[.42,.5,.26],B:[.3,.36,.2],freq:2.1,pat:4,bank:.12});
big('turtle',{cx:RUIN[0],cz:RUIN[1],rx:13,rz:15,alt:7,dy:1.5,spd:.7,size:1.1,A:[.5,.45,.26],B:[.3,.36,.2],freq:2.2,pat:4,bank:.12,sign:-1,th0:2});
big('turtle',{cx:REEFS[1][0],cz:REEFS[1][1],rx:22,rz:18,alt:6,dy:2,spd:.75,size:1.35,A:[.4,.5,.3],B:[.3,.36,.2],freq:2,pat:4,bank:.12,th0:4});
big('turtle',{cx:60,cz:236,rx:26,rz:20,alt:14,dy:4,spd:.7,size:1.2,A:[.44,.5,.28],B:[.3,.36,.2],freq:2,pat:4,bank:.12,th0:1});
big('turtle',{cx:REEFS[2][0],cz:REEFS[2][1],rx:16,rz:14,alt:5,dy:2,spd:.7,size:1.1,A:[.46,.48,.28],B:[.3,.36,.2],freq:2.1,pat:4,bank:.12,th0:3,sign:-1});
function bigPos(b,t,out){const th=b.th0+b.sign*t*b.spd/((b.rx+b.rz)*.5);const x=b.cx+b.rx*Math.cos(th);let z=b.cz+b.rz*Math.sin(th);if(b.canyon)z=canyonZ(x)+b.rz*Math.sin(th*3);
  let y=b.alt!==null?heightAt(x,z)+b.alt+b.dy*Math.sin(th*2.3+b.th0):b.y0+b.dy*Math.sin(th*2+b.th0);y=Math.min(Math.max(y,heightAt(x,z)+1.8),-2);out[0]=x;out[1]=y;out[2]=z;}
mark('life');
