/* ───────── 繪圖管線（WGSL） ───────── */
const W_TERR=W_B+/*wgsl*/`
@group(1) @binding(0) var<uniform> dr:D;
struct VO { @builtin(position) pos:vec4f, @location(0) w:vec3f, @location(1) n:vec3f, @location(2) sand:f32 };
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f,@location(2) a:vec2f)->VO{let w=p+dr.off.xyz;return VO(g.vp*vec4f(w,1.),w,n,a.x);}
@vertex fn vsS(@location(0) p:vec3f)->@builtin(position) vec4f{return projS(p+dr.off.xyz);}
@fragment fn fs(v:VO)->@location(0) vec4f{
  let N=normalize(v.n);let dist=length(g.cam.xyz-v.w);let q=v.w.xz;
  let n1=textureSample(tNo,sR,q*.0375).r;let n2=textureSample(tNo,sR,q*.35).g;let n3=textureSample(tNo,sR,q*1.7).b;
  let n4=textureSample(tNo,sR,q*.009+.3).g;
  let n5=textureSample(tNo,sR,q*9.3).r;let n6=textureSample(tNo,sR,q*23.+.4).g;
  // 沙地：淺褐沙與灰泥交錯、水流留下的波紋、零星的貝殼碎屑；整體偏暗，亮度交給陽光與光斑
  let rf=ss(.80,.96,N.y)*exp(-dist*.05);
  let ph=(q.x*.8+q.y*.6)*9.+n1*16.+n2*2.5;
  let Ns=normalize(N+vec3f(.8,0.,.6)*cos(ph)*.42*rf+vec3f(n5-.5,0.,n6-.5)*.30*exp(-dist*.1));
  var albS=mix(vec3f(.265,.250,.205),vec3f(.170,.180,.172),ss(.35,.7,n4))*(.68+.36*n2+.28*n3)*(.82+.36*n1)*(1.+.12*sin(ph)*rf);
  albS=mix(albS,vec3f(.40,.385,.33),ss(.74,.86,n5)*ss(.5,.8,n6)*.55*exp(-dist*.05));
  let glit=(.05+1.8*ss(.72,.86,n5)*ss(.55,.8,n6))*exp(-dist*.06);
  let rm=rockMat(v.w,N,dist,0.);
  let alb=mix(rm.c,albS,v.sand);let Nf=normalize(mix(rm.n,Ns,v.sand));
  return fin(lit(alb,Nf,v.w,.0,0.,vec3f(0.),mix(rm.s,glit,v.sand)));
}`;
const W_STATIC=W_B+/*wgsl*/`
struct K { sway:vec4f, det:vec4f, mat:vec4f };
@group(1) @binding(0) var<uniform> dr:D;
@group(2) @binding(0) var<uniform> kd:K;
struct VI { @location(0) pos:vec3f, @location(1) nrm:vec3f, @location(2) col:vec3f, @location(3) aux:vec2f, @location(4) iP:vec4f, @location(5) iQ:vec4f, @location(6) iS:vec4f, @location(7) iC:vec4f };
struct VO { @builtin(position) pos:vec4f, @location(0) w:vec3f, @location(1) n:vec3f, @location(2) col:vec3f, @location(3) obj:vec3f, @location(4) seed:f32, @location(5) on:vec3f, @location(6) @interpolate(flat) q:vec4f };
fn wpos(i:VI)->vec3f{
  // 小石頭之類：接近繪製距離上限時慢慢縮小（烘焙遠景陰影時 g.sun.w 為 0，不縮）
  let fd=kd.mat.z*g.sun.w;var sc=1.;if(fd>0.){sc=1.-ss(fd*.70,fd,distance(i.iP.xyz+dr.off.xyz,g.cam.xyz));}
  let lp=i.pos*i.iS.xyz*sc;
  var wp=qrot(i.iQ,lp)+i.iP.xyz+dr.off.xyz;
  let w=i.aux.x*kd.sway.x*i.iS.y;
  let ph=g.misc.x*kd.sway.y+dot(i.iP.xz,vec2f(.13,.09))+i.aux.y+i.iP.w;
  wp.x+=w*(sin(ph)+.4*sin(ph*2.3+1.)+kd.sway.z);
  wp.z+=w*(.7*cos(ph*.8+.6)+kd.sway.z*.4);
  return wp;}
@vertex fn vs(i:VI)->VO{let wp=wpos(i);return VO(g.vp*vec4f(wp,1.),wp,qrot(i.iQ,i.nrm/i.iS.xyz),i.col*i.iC.rgb,i.pos*i.iS.xyz+i.iC.w*7.,i.iC.w,i.nrm,i.iQ);}
@vertex fn vsS(i:VI)->@builtin(position) vec4f{return projS(wpos(i));}
// 珊瑚等：物件空間的三向投影細節（兩層）——凹凸擾動法線、凹處壓暗顏色，表面才有石灰質的粗糙感；kd.det＝細節尺度、強度、稜脊加強、柔光；kd.mat.y＝螢光
@fragment fn fs(v:VO,@builtin(front_facing) ff:bool)->@location(0) vec4f{
  let sg=select(-1.,1.,ff);
  let N0=normalize(v.n)*sg;let on=normalize(v.on);
  var w=on*on;w=w*w;w=w/(w.x+w.y+w.z);
  let s1=kd.det.x*.17;let s2=kd.det.x*.66;
  let ax=textureSample(tRk,sR,v.obj.zy*s1);let ay=textureSample(tRk,sR,v.obj.xz*s1);let az=textureSample(tRk,sR,v.obj.xy*s1);
  let bx=textureSample(tRk,sR,v.obj.zy*s2+.37);let by=textureSample(tRk,sR,v.obj.xz*s2+.37);let bz=textureSample(tRk,sR,v.obj.xy*s2+.37);
  let h=ax.b*w.x+ay.b*w.y+az.b*w.z;let h2=bx.b*w.x+by.b*w.y+bz.b*w.z;
  let mot=ax.a*w.x+ay.a*w.y+az.a*w.z;
  let dist=length(g.cam.xyz-v.w);let fade=exp(-dist*.04);
  let gx=(ax.rg-.5)*3.2+(bx.rg-.5)*3.0*fade;let gy=(ay.rg-.5)*3.2+(by.rg-.5)*3.0*fade;let gz=(az.rg-.5)*3.2+(bz.rg-.5)*3.0*fade;
  let bump=kd.det.y*(2.0+1.2*kd.det.z);
  let pert=(w.x*vec3f(0.,gx.y,gx.x)+w.y*vec3f(gy.x,0.,gy.y)+w.z*vec3f(gz.x,gz.y,0.))*bump;
  let N=normalize(N0-qrot(v.q,pert)*sg);
  let hgt=h*.55+h2*.45;
  let k=clamp(kd.det.y*1.7,0.,1.);
  var alb=v.col*mix(1.,.26+1.42*hgt,k)*(.84+.32*mot);
  // 木頭（沉船）：一片片船板之間的暗縫、順著船身的木紋
  let pk=v.obj.y*2.7+ax.a*.2;let pf=fract(pk);
  let grain=textureSample(tRk,sR,vec2f(v.obj.z*.30+floor(pk)*.37,v.obj.y*1.9)).b;
  alb=mix(alb,alb*(.50+1.0*grain)*(1.-.62*ss(.07,0.,min(pf,1.-pf))*(.25+.75*fade)),kd.mat.w);
  // 稜脊類（腦紋、桌面珊瑚）：凸起的稜線顏色淡一些
  alb=mix(alb,alb*1.35+vec3f(.02),kd.det.z*ss(.62,.86,h2)*.4)*mix(1.,.55+.45*ss(.22,.5,h2),kd.det.z);
  // 夜裡：珊瑚上一塊塊的螢光斑點，慢慢地明滅
  let ng=g.sunC.w*kd.mat.y*ss(.56,.72,mot*.6+h2*.4)*(.55+.45*sin(g.misc.x*1.1+v.seed*37.+v.obj.y*2.3));
  let fl=select(select(vec3f(.25,1.,.45),vec3f(.2,.8,1.),fract(v.seed*7.13)>.5),vec3f(1.,.3,.75),fract(v.seed*3.71)>.72);
  return fin(lit(alb,N,v.w,kd.det.w,kd.mat.y,mix(normalize(v.col+vec3f(.01)),fl,.6)*ng*.9,.06+.22*hgt));
}
@fragment fn fsR(v:VO,@builtin(front_facing) ff:bool)->@location(0) vec4f{
  var N=normalize(v.n);if(!ff){N=-N;}
  let rm=rockMat(v.w,N,length(g.cam.xyz-v.w),v.seed);
  return fin(lit(rm.c*v.col,rm.n,v.w,0.,0.,vec3f(0.),rm.s));
}`;
// 葉片：每一片都是獨立實例。頂點階段決定形狀（彎曲、扭轉、葉緣起伏）並取樣陰影與天光；片段階段逐像素算葉面紋理、正面受光、背面透光、逆光時整片透亮、高光與光斑。
const W_LEAF=W_B+/*wgsl*/`
@group(1) @binding(0) var<uniform> dr:D;
struct LI { @location(0) ts:vec2f, @location(4) iA:vec4f, @location(5) iB:vec4f, @location(6) iC:vec4f };
struct LO { @builtin(position) pos:vec4f, @location(0) n:vec3f, @location(1) v:vec3f, @location(2) e:vec3f, @location(3) a:vec3f, @location(4) t:vec3f, @location(5) s:vec3f,
  @location(6) col:vec3f, @location(7) uv:vec4f, @location(8) cs:vec2f, @location(9) @interpolate(flat) prm:vec4f, @location(10) @interpolate(flat) ir:vec3f, @location(11) em:vec3f };
struct LP { wp:vec3f, n:vec3f, tang:vec3f, side:vec3f, t:f32 };
fn leafPos(i:LI)->LP{
  let t=sin(i.ts.x*1.5708);let fl=i.iC.w;let rnd=i.iC.y;let tm=g.misc.x;let ty=i32(i.iC.x+.5);
  let r2=fract(rnd*7.31);let r3=fract(rnd*13.7);
  let th0=i.iB.y+sin(tm*1.1+rnd*37.+i.iA.y*.4)*.10*fl;
  let b=max(i.iC.z,.05)*1.3;let th=th0+b*t;let L=i.iA.w;
  let fw=L*(cos(th0)-cos(th))/b;let up=L*(sin(th)-sin(th0))/b;
  let yw=i.iB.x+sin(tm*.7+rnd*91.)*.16*fl;
  let f=vec3f(cos(yw),0.,sin(yw));let sd0=vec3f(-f.z,0.,f.x);
  let tang=f*sin(th)+vec3f(0.,cos(th),0.);
  let n0=cross(sd0,tang);
  // 沿著葉身扭轉；葉緣像荷葉邊一樣起伏（莖不做）
  let lf=select(1.,0.,ty==1);
  let tw=((r2-.5)*2.4*t+sin(tm*.9+r3*20.)*.22*t)*fl*lf;
  let sd=sd0*cos(tw)+n0*sin(tw);let nn=n0*cos(tw)-sd0*sin(tw);
  // 葉形：帶狀——基部細，很快變寬，一路維持到末端才收圓；莖維持等寬
  let prof=mix(1.,.08*(1.-t)+pow(max(sin(3.14159*pow(t,.5)),0.),.42),lf);
  let w=i.iB.z*dr.off.w*prof;
  let ruf=sin(t*7.+r3*30.+tm*.6)*i.iB.z*.16*i.ts.y*sin(3.14159*t)*lf;
  var p=i.iA.xyz+f*fw+vec3f(0.,up,0.)+sd*(i.ts.y*w*.5)+nn*ruf;
  let sw=kelpSway(i.iA.xz,i.iB.w,tm);p.x+=sw.x;p.z+=sw.y;
  return LP(p+dr.off.xyz,nn,tang,sd,t);}
@vertex fn vsS(i:LI)->@builtin(position) vec4f{return projS(leafPos(i).wp);}
@vertex fn vs(i:LI)->LO{
  let lp=leafPos(i);let wp=lp.wp;let t=lp.t;let rnd=i.iC.y;let r2=fract(rnd*7.31);let r3=fract(rnd*13.7);
  var o:LO;o.pos=g.vp*vec4f(wp,1.);
  // 葉面略成槽狀，葉緣的法線隨起伏擺動
  let ty=i32(i.iC.x+.5);
  o.n=lp.n+lp.side*i.ts.y*select(.42,1.3,ty==1)-lp.tang*cos(t*7.+r3*30.+g.misc.x*.6)*i.ts.y*select(.4,0.,ty==1);
  let Vv=g.cam.xyz-wp;let dist=length(Vv);let V=Vv/max(dist,1e-4);o.v=V;
  let sh=shadow1(wp+g.sun.xyz*.3);
  let vv=volS(wp+vec3f(0.,.6,0.));let sv=vv.x;
  o.e=sunE(wp.y)*sh*cloud(wp);
  o.a=skyA(wp.y)*1.4*(.24+.76*sv)*(.70+.30*sh)*mix(vec3f(1.),vec3f(1.30,.84,1.18),vv.y*.65)+lampL(wp);
  o.t=exp(-SIG*dist);o.s=inscatter(-V,dist,mix(g.fwd.w,vv.y,.5))*(.40+.60*mix(skyVis(g.cam.xyz),sv,.5));
  o.cs=sproj(wp,g.sun.xyz);
  // 各種葉子：基部色、末端色、透光度、虹彩色、自發光
  var c0:vec3f;var c1:vec3f;var ir=vec3f(0.);var tr=.8;var em=0.;var gl=.5;
  switch ty {
    case 0 {c0=mix(vec3f(.040,.066,.020),vec3f(.060,.070,.018),r2);c1=mix(vec3f(.100,.130,.028),vec3f(.150,.135,.026),r2);
            if(r3>.86){c0=vec3f(.130,.085,.016);c1=vec3f(.250,.165,.028);}tr=.95;}
    case 1 {c0=vec3f(.085,.074,.030);c1=vec3f(.110,.094,.036);tr=.12;gl=.25;}
    case 2 {c0=vec3f(.028,.105,.055);c1=mix(vec3f(.075,.210,.090),vec3f(.130,.230,.060),r2);if(r3>.88){c0=vec3f(.14,.05,.10);c1=vec3f(.28,.11,.19);}tr=1.;}
    case 3 {c0=vec3f(.036,.026,.085);c1=mix(vec3f(.115,.055,.210),vec3f(.065,.065,.230),r2);ir=vec3f(.20,.55,.95);tr=.8;em=.015;gl=.9;}
    case 4 {c0=vec3f(.300,.050,.150);c1=mix(vec3f(.520,.150,.280),vec3f(.560,.260,.130),r2);ir=vec3f(1.,.75,.35);tr=.9;em=.02;gl=.8;}
    case 5 {c0=vec3f(.480,.045,.240);c1=mix(vec3f(.700,.110,.400),vec3f(.520,.110,.620),r2);tr=.6;em=.20;}
    case 6 {c0=vec3f(.200,.125,.020);c1=vec3f(.400,.270,.045);tr=1.;}
    case 8 {c0=vec3f(.020,.085,.130);c1=mix(vec3f(.060,.260,.340),vec3f(.130,.170,.380),r2);tr=.5;em=.55;}
    default {c0=vec3f(.020,.190,.190);c1=mix(vec3f(.060,.400,.360),vec3f(.080,.300,.480),r2);tr=.6;em=.16;}
  }
  let col=mix(c0,c1,clamp(t*.9+.12*rnd,0.,1.));
  o.col=col;o.ir=ir;
  let dark=(1.-sv)*(1.-sv);
  o.em=col*em*(.6+.4*sin(g.misc.x*.6+rnd*40.))*(.10+1.5*dark+3.2*g.sunC.w);
  o.uv=vec4f(i.ts.y,t,t*i.iA.w,rnd);
  o.prm=vec4f(tr,gl,r2,f32(ty));
  return o;}
@fragment fn fs(v:LO)->@location(0) vec4f{
  var N=normalize(v.n);let V=normalize(v.v);if(dot(N,V)<0.){N=-N;}
  let L=g.sun.xyz;let u=v.uv.x;let t=v.uv.y;let au=abs(u);let tr=v.prm.x;
  // 葉面：沿葉身拉長的斑駁與纖維紋、中肋、斜向葉脈、葉緣與基部較暗
  let tx=textureSample(tRk,sR,vec2f(u*.12+v.uv.w*3.7,v.uv.z*.33+v.prm.z*5.3));
  let vein=abs(fract(t*11.-au*2.4)-.5);
  var alb=v.col*(.50+1.00*tx.b)*(.72+.56*tx.a);
  alb*=(1.-.34*ss(.15,0.,au))*(1.-.20*ss(.10,0.,vein)*ss(.06,.4,au)*v.t.g*v.t.g)*(.80+.20*ss(1.,.55,au))*mix(.55,1.08,ss(0.,.35,t));
  // 虹彩（紫色區的葉子）：掠射角時泛出藍綠或金色
  let ndv=abs(dot(N,V));let fr=1.-ndv;
  let hasIr=step(.001,v.ir.r+v.ir.g);
  alb=mix(alb,alb*.5+v.ir*.16,fr*fr*.75*hasIr);
  // 光斑逐像素取樣
  let ca=min(pow(textureSampleLevel(tCa,sR,vec3f(v.cs*.109375,g.misc.x*.2),.6).r*4.,1.5)*1.05,5.);
  let ck=.85*pow(v.t.g,.6);
  let E=v.e*(1.-ck+ck*ca);
  let ndl=dot(N,L);
  // 透過葉肉的光偏黃綠；背面受光時整片透亮，朝著太陽看時更亮
  let trc=alb*mix(vec3f(1.),vec3f(1.75,1.55,.62),tr*(1.-hasIr*.6));
  var c=E*(alb*max(ndl,0.)*.95+trc*tr*(max(-ndl,0.)*.95+.10));
  c+=E*trc*tr*pow(max(dot(-V,L),0.),3.)*1.25;
  let upK=N.y*.5+.5;
  c+=alb*v.a*(.26+.74*upK)+trc*tr*v.a*(.26+.74*(1.-upK))*.42;
  let H=normalize(V+L);let nh=max(dot(N,H),0.);
  c+=E*(pow(nh,44.)*.55+pow(nh,9.)*.05)*v.prm.y+v.a*v.ir*fr*fr*fr*.9*hasIr;
  c+=v.em;
  return fin(c*v.t+v.s);
}`;
const W_GLINT=W_B+/*wgsl*/`
@group(1) @binding(0) var<uniform> dr:D;
struct GO { @builtin(position) pos:vec4f, @location(0) c:vec3f, @location(1) q:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(4) a:vec4f,@location(5) h:vec4f)->GO{
  var p=a.xyz;let sw=kelpSway(a.xz,a.w,g.misc.x);p.x+=sw.x;p.z+=sw.y;
  let r=h.x;let tm=g.misc.x;
  p+=vec3f(sin(tm*.3+r*40.),cos(tm*.23+r*17.),sin(tm*.27+r*29.))*.12;
  let wp=p+dr.off.xyz;let d=length(wp-g.cam.xyz);
  let tw=pow(max(sin(tm*(.7+r*1.9)+r*311.),0.),6.);
  let q=vec2f(f32(vi&1u),f32(vi>>1u))*2.-1.;
  let rad=max(h.z*(.6+.8*tw),d*g.nf.w/g.res.y*1.1);
  var col=mix(vec3f(1.,.82,.30),vec3f(.50,1.,.42),h.y);
  if(h.y>1.5){col=vec3f(1.,.35,.85);}if(h.y>2.5){col=vec3f(.35,.75,1.);}
  let c=col*(.15+1.6*tw)*exp(-SIG*d)*(.35+.65*exp(KD.g*min(wp.y,0.)))*(.2+.8*g.skyC.g+1.6*g.sunC.w)*ss(150.,90.,d)*ss(1.5,5.,d)*(h.z/rad)*(h.z/rad)*1.6;
  return GO(g.vp*vec4f(wp+(g.right.xyz*q.x+g.up.xyz*q.y)*rad,1.),c,q);}
@fragment fn fs(v:GO)->@location(0) vec4f{let a=ss(1.,0.,dot(v.q,v.q));return vec4f(v.c*a*a,0.);}`;
const W_SWIMF=/*wgsl*/`
struct SW { swim:vec4f, p2:vec4f };
struct SO { @builtin(position) pos:vec4f, @location(0) w:vec3f, @location(1) n:vec3f, @location(2) col:vec3f, @location(3) obj:vec3f, @location(4) A:vec4f, @location(5) B:vec3f };
fn swimPos(pos:vec3f,aux:vec2f,iP:vec4f,iD:vec4f,roll:f32)->vec3f{
  var p=pos;let ph=iD.w;
  p.x+=aux.x*sin(ph+p.z*sw.swim.y)*sw.swim.x;
  p.y+=aux.y*sin(ph+p.z*sw.p2.x-abs(p.x)*sw.swim.w)*sw.swim.z;
  let cr=cos(roll);let sr=sin(roll);p=vec3f(p.x*cr-p.y*sr,p.x*sr+p.y*cr,p.z);
  let f=iD.xyz;let r=normalize(cross(vec3f(0.,1.,0.),f));let u=cross(f,r);
  return iP.xyz+(r*p.x+u*p.y+f*p.z)*iP.w;}
fn swimT(pos:vec3f,nrm:vec3f,col:vec3f,aux:vec2f,iP:vec4f,iD:vec4f,iA:vec4f,iB:vec4f)->SO{
  let w=swimPos(pos,aux,iP,iD,iB.w);
  let cr=cos(iB.w);let sr=sin(iB.w);let n=vec3f(nrm.x*cr-nrm.y*sr,nrm.x*sr+nrm.y*cr,nrm.z);
  let f=iD.xyz;let r=normalize(cross(vec3f(0.,1.,0.),f));let u=cross(f,r);
  return SO(g.vp*vec4f(w,1.),w,r*n.x+u*n.y+f*n.z,col,pos,iA,iB.rgb);}
@fragment fn fs(v:SO,@builtin(front_facing) ff:bool)->@location(0) vec4f{
  var N=normalize(v.n);if(!ff){N=-N;}
  let pat=i32(v.A.w+.5);
  // 背深腹淺（從上看融入深色海底、從下看融入亮的水面），腹部銀白
  let belly=clamp((v.col.r-.62)/.38,0.,1.);
  var c=v.A.rgb*mix(.42,1.,belly);
  c=mix(c,vec3f(.74,.78,.78),v.col.g*select(1.,.35,pat==5||pat==6));
  let nz=textureSample(tNo,sR,v.obj.xz*2.3).r;let nz2=textureSample(tNo,sR,v.obj.zy*3.1).g;
  var m=0.;
  switch pat {
    case 1 {m=ss(-.05,.45,sin(v.obj.z*21.+.6));}
    case 2 {m=ss(.060,.012,abs(v.obj.y-.03))*ss(-.40,-.30,v.obj.z);}
    case 3 {m=ss(.02,-.36,v.obj.z);}
    case 4 {m=ss(.40,.62,nz)*.6*(1.-v.col.g);}
    case 5 {m=ss(.34,-.30,v.obj.z+v.obj.y*.8);}
    case 6 {m=ss(.48,.66,nz2);}
    case 7 {m=ss(-.02,.14,v.obj.y)*.9;}
    default {}
  }
  m=max(m,v.col.b*.85);
  c=mix(c,v.B,m);
  // 鱗片：細碎的明暗，近看有一格格菱形的鱗紋；鰭上有一條條鰭條
  let scl=textureSample(tNo,sR,v.obj.zy*vec2f(11.,17.)).b;
  let dist=length(g.cam.xyz-v.w);let near=exp(-dist*.12);
  let dia=sin(v.obj.z*260.+v.obj.y*190.)*sin(v.obj.z*260.-v.obj.y*190.)*exp(-dist*.5);
  c*=(.78+.44*scl)*(1.+.07*dia*(1.-v.col.b));
  c*=mix(1.,.55+.30*sin(v.obj.z*150.+v.obj.y*40.)*near,v.col.b);
  // 眼睛：黑瞳孔、銀色虹膜（sw.p2.w＝眼睛高度，0 表示這種模型不畫）
  let ed=length(vec2f(v.obj.z-.375,v.obj.y-sw.p2.w))/.030;
  let eyeK=step(.0005,sw.p2.w)*ss(1.,.86,ed);
  c=mix(c,mix(vec3f(.012),vec3f(.62,.60,.50),ss(.50,.66,ed)),eyeK);
  // 夜裡：霓虹色條紋的魚會發光
  let ng=g.sunC.w*select(0.,1.3,pat==2)*m;
  // 朝下的面（腹部）受海底反射上來的光
  let bounce=skyA(v.w.y)*c*(.5-.5*N.y)*.45;
  return fin(lit(c,N,v.w,.22,select(.08,.20,sw.p2.y>.45)*(1.-eyeK),v.B*ng+bounce,sw.p2.y*(.85+.3*dia)+eyeK*1.5));
}`;
const W_SWIM=W_B+/*wgsl*/`
@group(1) @binding(0) var<uniform> sw:SW;
`+W_SWIMF+/*wgsl*/`
@vertex fn vs(@location(0) pos:vec3f,@location(1) nrm:vec3f,@location(2) col:vec3f,@location(3) aux:vec2f,@location(4) iP:vec4f,@location(5) iD:vec4f,@location(6) iA:vec4f,@location(7) iB:vec4f)->SO{return swimT(pos,nrm,col,aux,iP,iD,iA,iB);}
@vertex fn vsS(@location(0) pos:vec3f,@location(3) aux:vec2f,@location(4) iP:vec4f,@location(5) iD:vec4f,@location(7) iB:vec4f)->@builtin(position) vec4f{return projS(swimPos(pos,aux,iP,iD,iB.w));}`;
// 顯示卡上模擬的魚群：狀態在儲存緩衝區，頂點著色器直接讀
const W_BOID=W_B+/*wgsl*/`
struct Fish { p:vec4f, v:vec4f };
struct Sp { A:vec4f, B:vec4f };
@group(1) @binding(0) var<uniform> sw:SW;
@group(1) @binding(1) var<storage,read> fish:array<Fish>;
@group(1) @binding(2) var<storage,read> visL:array<u32>;
@group(1) @binding(3) var<storage,read> spec:array<Sp>;
`+W_SWIMF+/*wgsl*/`
struct BI { p:vec4f, d:vec4f, A:vec4f, B:vec4f };
fn boidI(ii:u32)->BI{
  let id=visL[u32(sw.p2.z)+ii];let f=fish[id];let s=spec[id/256u];
  var p=f.p.xyz;p.x+=320.*round((g.cam.x-p.x)/320.);p.z+=320.*round((g.cam.z-p.z)/320.);
  let sp=max(length(f.v.xyz),1e-3);var d=f.v.xyz/sp;d.y=clamp(d.y,-.6,.6);d=normalize(d);
  let k=.88+.24*fract(f32(id)*.6180339);
  return BI(vec4f(p,s.B.w*k),vec4f(d,f.p.w),vec4f(s.A.rgb*(.9+.2*fract(f32(id)*.377)),s.A.w),vec4f(s.B.rgb,0.));}
@vertex fn vs(@builtin(instance_index) ii:u32,@location(0) pos:vec3f,@location(1) nrm:vec3f,@location(2) col:vec3f,@location(3) aux:vec2f)->SO{
  let b=boidI(ii);return swimT(pos,nrm,col,aux,b.p,b.d,b.A,b.B);}
@vertex fn vsS(@builtin(instance_index) ii:u32,@location(0) pos:vec3f,@location(3) aux:vec2f)->@builtin(position) vec4f{
  let b=boidI(ii);return projS(swimPos(pos,aux,b.p,b.d,0.));}`;
const W_JELLY=W_B+/*wgsl*/`
@group(1) @binding(0) var<uniform> dr:D;
struct JO { @builtin(position) pos:vec4f, @location(0) w:vec3f, @location(1) n:vec3f, @location(2) col:vec3f };
@vertex fn vs(@location(0) pos:vec3f,@location(1) nrm:vec3f,@location(2) col:vec3f,@location(3) aux:vec2f,@location(4) iP:vec4f,@location(6) iS:vec4f,@location(7) iC:vec4f)->JO{
  let tm=g.misc.x;let ph=tm*1.7+iP.w*6.283;let pu=sin(ph);
  var p=pos;
  p.x*=1.+aux.x*.20*pu;p.z*=1.+aux.x*.20*pu;
  p.y+=(1.-aux.x)*.04*pu;
  p.x+=aux.y*sin(ph*.5+p.y*2.2+pos.z*5.)*.16;
  p.z+=aux.y*cos(ph*.43+p.y*1.9+pos.x*5.)*.16;
  var wp=p*iS.x+iP.xyz+dr.off.xyz;
  wp.y+=sin(tm*.23+iP.w*40.)*1.2+.06*cos(ph)*iS.x;
  wp.x+=sin(tm*.11+iP.w*17.)*.8;
  return JO(g.vp*vec4f(wp,1.),wp,nrm,col*iC.rgb);}
@fragment fn fs(v:JO)->@location(0) vec4f{
  let N=normalize(v.n);let Vv=g.cam.xyz-v.w;let dist=length(Vv);let V=Vv/dist;
  let rim=pow(1.-abs(dot(N,V)),1.5);
  var c=v.col*(.25+1.1*rim)*(skyA(v.w.y)*1.4+sunE(v.w.y)*.5)+v.col*(.05+.12*rim)*(1.+9.*g.sunC.w);
  c+=v.col*lampL(v.w);
  let T=exp(-SIG*dist);
  let a=clamp(.22+.70*rim,0.,1.)*T.b;
  return vec4f(min(c*T,vec3f(24.))*a,a);
}`;
const W_SURF=W_B+/*wgsl*/`
struct SO2 { @builtin(position) pos:vec4f, @location(0) w:vec3f };
@vertex fn vs(@builtin(vertex_index) vi:u32)->SO2{
  let q=vec2f(f32(vi&1u),f32(vi>>1u))*2.-1.;let w=vec3f(g.cam.x+q.x*900.,0.,g.cam.z+q.y*900.);return SO2(g.vp*vec4f(w,1.),w);}
@fragment fn fs(v:SO2)->@location(0) vec4f{
  let Vv=v.w-g.cam.xyz;let dist=length(Vv);let V=Vv/dist;
  let q=v.w.xz;let tm=g.misc.x;
  var gr=(textureSample(tNo,sR,q*.027+vec2f(tm*.010,tm*.006)).rg-.5)*.45
        +(textureSample(tNo,sR,q*.071+vec2f(-tm*.016,tm*.012)).gb-.5)*.80
        +(textureSample(tNo,sR,q*.19+vec2f(tm*.028,-tm*.020)).br-.5)*.65
        +(textureSample(tNo,sR,q*.47+vec2f(-tm*.05,-tm*.036)).rg-.5)*.40;
  gr*=1.2*exp(-dist*.010);
  let N=normalize(vec3f(-gr.x,-1.,-gr.y));
  let Nf=normalize(vec3f(-gr.x*.2,-1.,-gr.y*.2));
  let R=refract(V,N,1.333);
  let refl=inscatter(reflect(V,Nf),2000.,g.fwd.w*.7)*.9;
  var col=refl;
  // 從水下看水面：只有正上方一個圓錐內看得到天空，圓錐外是全反射；邊界平滑過渡
  let ci=clamp(-dot(V,N),0.,1.);let kk=1.-1.777*(1.-ci*ci);let win=ss(-.02,.42,kk);
  if(kk>1e-4){
    let cosT=max(R.y,0.);
    let cl=cloud(vec3f(v.w.x+R.x*60.,0.,v.w.z+R.z*60.));
    let sd=max(dot(R,g.sun.xyz),0.);
    // 水面上的天空：白天青白，黃昏時太陽那側橘紅、對面轉紫
    let dusk=mix(vec3f(.42,.30,.62),vec3f(1.55,.66,.30),pow(dot(R,g.sun.xyz)*.5+.5,3.))*1.25;
    var sky=mix(mix(vec3f(.62,.95,1.10),vec3f(.36,.74,1.15),cosT)*1.15*g.skyC.rgb,dusk,g.grd.w)*(.55+.45*cl);
    sky+=g.sunC.rgb*(pow(sd,40.)*.8+pow(sd,400.)*10.)*cl;
    col=mix(refl,sky,win*(1.-clamp(pow(1.-cosT,4.),0.,1.)));
  }
  return fin(col*exp(-SIG*dist)+inscatter(V,dist,g.fwd.w));
}`;
const W_BG=W_B+W_FS+/*wgsl*/`
@fragment fn fs(v:FO)->@location(0) vec4f{
  let rd=normalize(g.fwd.xyz+g.right.xyz*v.uv.x*g.nf.z+g.up.xyz*v.uv.y*g.nf.w);
  var d=2000.;if(rd.y>1e-3){d=min(-g.cam.y/rd.y,2000.);}
  return fin(inscatter(rd,d,g.fwd.w*.85)*(.40+.60*skyVis(g.cam.xyz)));
}`;
const W_SNOW=W_B+/*wgsl*/`
struct PO { @builtin(position) pos:vec4f, @location(0) a:f32, @location(1) q:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(4) sd:vec4f)->PO{
  let box=vec3f(40.,26.,40.);let r=sd.w;let tm=g.misc.x;
  let drift=vec3f(sin(tm*.11+r*6.28)*.7+tm*.06,-tm*.045*(.4+r),cos(tm*.13+r*4.)*.7);
  let u=sd.xyz*box+drift-g.cam.xyz;
  let rel=u-box*floor(u/box)-box*.5;
  let wp=g.cam.xyz+rel;let d=length(rel);
  let q=vec2f(f32(vi&1u),f32(vi>>1u))*2.-1.;
  let rad=max(.012+.02*r,d*g.nf.w/g.res.y*.9);
  var lt=(.10+.55*exp(min(wp.y,0.)*.02))*(.12+.88*g.skyC.g)+g.sunC.w*.9*pow(max(sin(tm*(.6+r*2.)+r*90.),0.),10.);
  let lr=wp-lampP();let ld=length(lr);
  let cone=ss(.84,.97,dot(lr/max(ld,.01),g.lamp.xyz))*g.lamp.w;
  lt+=cone*2.2/(1.+.10*ld*ld);
  // 夜裡游動時，身邊被擾動的浮游生物會一閃一閃地發出藍光
  lt+=g.sunC.w*clamp(g.cam.w*.35,0.,1.4)*ss(5.,1.2,d)*(.35+.65*pow(max(sin(tm*2.3+r*77.),0.),3.))*3.;
  let a=ss(19.,9.,d)*ss(.8,3.,d)*(.25+.75*r)*lt*step(wp.y,-.15)*(.2+.8*skyVis(wp));
  return PO(g.vp*vec4f(wp+(g.right.xyz*q.x+g.up.xyz*q.y)*rad,1.),a,q);}
@fragment fn fs(v:PO)->@location(0) vec4f{let a=ss(1.,.2,dot(v.q,v.q))*v.a;return vec4f(mix(vec3f(.62,.86,.84),vec3f(.25,.75,1.),g.sunC.w)*a*.5,0.);}`;
const W_BUB=W_B+/*wgsl*/`
@group(1) @binding(0) var<uniform> dr:D;
struct PO { @builtin(position) pos:vec4f, @location(0) a:f32, @location(1) q:vec2f };
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(4) src:vec4f)->PO{
  let H=-src.y-.3;let tm=g.misc.x;
  let sp=.9+.6*fract(src.w*7.13);
  let rise=fract(src.w*3.7+tm*sp/H)*H;
  var wp=vec3f(src.x,src.y+rise,src.z)+dr.off.xyz;
  let wob=rise*.9+src.w*40.;let spread=.06+rise*.03;
  wp.x+=sin(wob*1.7)*spread+sin(wob*.31+src.w*9.)*spread*1.6;
  wp.z+=cos(wob*1.3)*spread+cos(wob*.27+src.w*5.)*spread*1.6;
  let d=length(wp-g.cam.xyz);
  let q=vec2f(f32(vi&1u),f32(vi>>1u))*2.-1.;
  let rad=max((.02+.045*fract(src.w*5.3))*(1.+rise/H*1.6),d*g.nf.w/g.res.y*1.2);
  let a=exp(-d*.022)*(.35+.65*exp(wp.y*.02))*ss(0.,.6,rise)*(.18+.82*g.skyC.g);
  return PO(g.vp*vec4f(wp+(g.right.xyz*q.x+g.up.xyz*q.y)*rad,1.),a,q);}
@fragment fn fs(v:PO)->@location(0) vec4f{
  let r2=dot(v.q,v.q);if(r2>1.){discard;}
  let rim=ss(.35,1.,r2);let hl=ss(.30,0.,length(v.q-vec2f(-.32,.38)));
  let a=clamp(.08+.55*rim+.9*hl,0.,1.)*v.a;return vec4f(vec3f(.70,1.,1.05)*a*1.2,a*.7);}`;

const LSW=device.createBindGroupLayout({entries:[{binding:0,visibility:SS.VERTEX|SS.FRAGMENT,buffer:{}}]});
const LBOID=device.createBindGroupLayout({entries:[{binding:0,visibility:SS.VERTEX|SS.FRAGMENT,buffer:{}},{binding:1,visibility:SS.VERTEX,buffer:{type:'read-only-storage'}},{binding:2,visibility:SS.VERTEX,buffer:{type:'read-only-storage'}},{binding:3,visibility:SS.VERTEX,buffer:{type:'read-only-storage'}}]});
const pipeCache={};
function scenePipes(samples){if(pipeCache[samples])return pipeCache[samples];
  const S=(label,code,layouts,buffers,o)=>pipeline(Object.assign({kind:'scene',label,code,layouts,buffers,samples},o||{}));
  const p={
    bg:S('bg',W_BG,[L0],[],{depthWrite:false,depthCompare:'always'}),
    terrain:S('terrain',W_TERR,[L0,L1],[VB.terr]),
    stat:S('static',W_STATIC,[L0,L1,LK],[VB.mesh,VB.inst16]),
    rock:S('rock',W_STATIC,[L0,L1,LK],[VB.mesh,VB.inst16],{fs:'fsR'}),
    leaf:S('leaf',W_LEAF,[L0,L1],[VB.strip,VB.inst12],{topology:'triangle-strip'}),
    swim:S('swim',W_SWIM,[L0,LSW],[VB.mesh,VB.inst16]),
    boid:S('boid',W_BOID,[L0,LBOID],[VB.mesh]),
    surf:S('surf',W_SURF,[L0],[],{topology:'triangle-strip'}),
    jelly:S('jelly',W_JELLY,[L0,L1],[VB.mesh,VB.inst16],{blend:BLEND_PM,depthWrite:false}),
    bub:S('bubble',W_BUB,[L0,L1],[VB.inst4],{topology:'triangle-strip',blend:BLEND_PM,depthWrite:false}),
    glint:S('glint',W_GLINT,[L0,L1],[VB.inst8],{topology:'triangle-strip',blend:BLEND_ADD,depthWrite:false}),
    snow:S('snow',W_SNOW,[L0],[VB.inst4],{topology:'triangle-strip',blend:BLEND_ADD,depthWrite:false})};
  return pipeCache[samples]=p;}
const shPipes={
  terrain:pipeline({kind:'shadow',label:'terrainSh',code:W_TERR,vs:'vsS',layouts:[L0S,L1],buffers:[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x3'}]}]}),
  stat:pipeline({kind:'shadow',label:'staticSh',code:W_STATIC,vs:'vsS',layouts:[L0S,L1,LK],buffers:[VB.mesh,VB.inst16]}),
  leaf:pipeline({kind:'shadow',label:'leafSh',code:W_LEAF,vs:'vsS',layouts:[L0S,L1],buffers:[VB.strip,VB.inst12],topology:'triangle-strip'}),
  swim:pipeline({kind:'shadow',label:'swimSh',code:W_SWIM,vs:'vsS',layouts:[L0S,LSW],buffers:[VB.mesh,VB.inst16]}),
  boid:pipeline({kind:'shadow',label:'boidSh',code:W_BOID,vs:'vsS',layouts:[L0S,LBOID],buffers:[VB.mesh]})};

// 後製：體積光束（半解析度，沿視線取樣陰影圖與天光體積）→ 模糊 → 泛光 → 合成
const W_RAYS=ms=>W_G+W_FS+/*wgsl*/`
@group(0) @binding(1) var sR:sampler;
@group(0) @binding(2) var sS:sampler_comparison;
@group(0) @binding(3) var tSh:texture_depth_2d;
@group(0) @binding(4) var tCa:texture_3d<f32>;
@group(0) @binding(5) var tDp:texture_depth${ms?'_multisampled':''}_2d;
@group(0) @binding(6) var tVol:texture_3d<f32>;
@group(0) @binding(7) var sV:sampler;
@group(0) @binding(8) var tShN:texture_depth_2d;
@group(0) @binding(9) var tNo:texture_2d<f32>;
@fragment fn fs(v:FO)->@location(0) vec4f{
  let fc=v.pos.xy;
  let dp=textureLoad(tDp,min(vec2i(fc*2.),vec2i(g.res.xy)-1),0);
  let vz=g.nf.x*g.nf.y/(g.nf.y-dp*(g.nf.y-g.nf.x));
  let rv=g.fwd.xyz+g.right.xyz*v.uv.x*g.nf.z+g.up.xyz*v.uv.y*g.nf.w;
  let len=length(rv);let rd=rv/len;
  var tm=min(vz*len,130.);
  if(rd.y>1e-4){tm=min(tm,-g.cam.y/rd.y);}
  let n=i32(g.misc.w);let dt=tm/f32(n);let j=ign(fc);
  var acc=vec3f(0.);var accz=vec3f(0.);
  for(var i=0;i<n;i++){
    let t=(f32(i)+j)*dt;let p=g.cam.xyz+rd*t;
    let sp=sproj(p,g.sun.xyz);let q=(sp-g.shN.xy)*g.shN.z;let z=-p.y/64.;
    let w=ss(0.,.05,min(min(q.x,q.y),min(1.-q.x,1.-q.y)));
    var vis=0.;
    if(w<.999){vis=textureSampleCompareLevel(tSh,sS,sproj(p,g.sunF.xyz)/320.,z-.0028);}
    if(w>.001){vis=mix(vis,textureSampleCompareLevel(tShN,sS,q,z-.0011),w);}
    let pat=ss(.17,.50,textureSampleLevel(tCa,sR,vec3f(sp*.034375,g.misc.x*.04),1.3).r);
    let cl=1.-g.cld.w*ss(g.cld.z,g.cld.z+.20,textureSampleLevel(tNo,sR,sp*.003125+g.cld.xy,0.).r*.62+.19);
    let vv=textureSampleLevel(tVol,sV,volUV(p),0.).rg;
    let wt=exp(-SIG*t+KD*(p.y/g.sun.y))*(vis*cl*(.16+pat*4.2)*(.25+.75*vv.x));
    acc+=wt;accz+=wt*vv.y;
  }
  let mu=max(dot(rd,g.sun.xyz),0.);
  let ph=.32+1.5*mu*mu*mu;
  // 黃昏時光束帶一點金色
  var r=((acc-accz)*mix(WCOL+vec3f(.05,.07,.05),vec3f(.80,.62,.42),g.grd.w*.55)+accz*vec3f(.50,.33,.68))*dt*SIG*g.sunC.rgb*ph*1.6;
  // 探照燈的光柱：燈在鏡頭旁邊，沿視線積分光錐內的散射，轉頭時看得到光束掃過
  if(g.lamp.w>.001){
    let L0=lampP();let tl=min(vz*len,36.);let dl=tl/14.;var la=0.;
    for(var i=0;i<14;i++){let t=(f32(i)+j)*dl;let p=g.cam.xyz+rd*t;let lv=p-L0;let d=length(lv);
      let c=ss(.80,.995,dot(lv/max(d,1e-3),g.lamp.xyz));la+=c*c*exp(-SIG.g*(d+t))/(1.+.035*d*d);}
    r+=vec3f(1.,.96,.86)*la*dl*g.lamp.w*.019;}
  return vec4f(min(r,vec3f(16.)),vz);
}`;
// 環境遮蔽（半解析度）：只用深度重建位置與法線，在半徑約 1.2 m 內找遮擋；岩縫、珊瑚根部、葉叢深處因此變暗
const W_AO=ms=>W_G+W_FS+/*wgsl*/`
@group(0) @binding(1) var tDp:texture_depth${ms?'_multisampled':''}_2d;
fn vpos(pi:vec2i)->vec3f{
  let q=clamp(pi,vec2i(0),vec2i(g.res.xy)-1);
  let dp=textureLoad(tDp,q,0);let z=g.nf.x*g.nf.y/(g.nf.y-dp*(g.nf.y-g.nf.x));
  let uv=(vec2f(q)+.5)*g.res.zw*2.-1.;return vec3f(uv.x*g.nf.z,-uv.y*g.nf.w,1.)*z;}
@fragment fn fs(v:FO)->@location(0) vec4f{
  let c=vec2i(v.pos.xy*2.);let P=vpos(c);
  if(P.z>75.){return vec4f(1.,1.,1.,P.z);}
  let Pr=vpos(c+vec2i(2,0));let Pl=vpos(c-vec2i(2,0));let Pu=vpos(c+vec2i(0,2));let Pd=vpos(c-vec2i(0,2));
  var dx=Pr-P;if(abs(Pl.z-P.z)<abs(Pr.z-P.z)){dx=P-Pl;}
  var dy=Pu-P;if(abs(Pd.z-P.z)<abs(Pu.z-P.z)){dy=P-Pd;}
  var N=normalize(cross(dy,dx)+vec3f(0.,0.,-1e-6));if(dot(N,P)>0.){N=-N;}
  let R=1.2;let pr=clamp(R*g.res.y/(2.*g.nf.w*P.z),5.,150.);
  let n=i32(g.up.w);let a0=ign(v.pos.xy)*6.2832;
  var occ=0.;
  for(var k=0;k<n;k++){
    let an=a0+f32(k)*2.39996;let o=vec2f(cos(an),sin(an))*(pr*sqrt((f32(k)+.5)/f32(n)));
    let d=vpos(c+vec2i(o))-P;let d2=dot(d,d);
    occ+=max(dot(N,d)-.012*P.z-.025,0.)/(d2+.03)*max(1.-d2/(R*R),0.);}
  let ao=clamp(1.-occ*1.15/f32(n),0.,1.);
  return vec4f(vec3f(mix(1.,ao*ao,exp(-P.z*.035))),P.z);
}`;
const W_RBLUR=W_FS+/*wgsl*/`
@group(0) @binding(0) var tR:texture_2d<f32>;
@fragment fn fs(v:FO)->@location(0) vec4f{
  let p=vec2i(v.pos.xy);let mx=vec2i(textureDimensions(tR))-1;let c=textureLoad(tR,p,0);
  var acc=vec3f(0.);var ws=0.;
  for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){let r=textureLoad(tR,clamp(p+vec2i(x,y),vec2i(0),mx),0);
    let w=1./(.03+abs(r.a-c.a)/max(c.a,.1));acc+=r.rgb*w;ws+=w;}}
  return vec4f(acc/ws,c.a);
}`;
const W_BDOWN=W_FS+/*wgsl*/`
@group(0) @binding(0) var sC:sampler;
@group(0) @binding(1) var tS:texture_2d<f32>;
@group(0) @binding(2) var tR:texture_2d<f32>;
@fragment fn fs(v:FO)->@location(0) vec4f{
  let uv=vec2f(v.uv.x*.5+.5,.5-v.uv.y*.5);let px=1./vec2f(textureDimensions(tS));
  var c=vec3f(0.);
  for(var i=0;i<4;i++){c+=textureSampleLevel(tS,sC,uv+(vec2f(f32(i&1),f32(i>>1))*2.-1.)*px,0.).rgb;}
  c=c*.25+textureSampleLevel(tR,sC,uv,0.).rgb;
  let l=max(c.r,max(c.g,c.b));
  return vec4f(c*smoothstep(.75,1.9,l),1.);
}`;
const W_BLUR=W_FS+/*wgsl*/`
@group(0) @binding(0) var sC:sampler;
@group(0) @binding(1) var tS:texture_2d<f32>;
@group(0) @binding(2) var<uniform> dir:vec4f;
@fragment fn fs(v:FO)->@location(0) vec4f{
  let uv=vec2f(v.uv.x*.5+.5,.5-v.uv.y*.5);
  var c=textureSampleLevel(tS,sC,uv,0.).rgb*.227;
  c+=(textureSampleLevel(tS,sC,uv+dir.xy*1.385,0.).rgb+textureSampleLevel(tS,sC,uv-dir.xy*1.385,0.).rgb)*.316;
  c+=(textureSampleLevel(tS,sC,uv+dir.xy*3.231,0.).rgb+textureSampleLevel(tS,sC,uv-dir.xy*3.231,0.).rgb)*.070;
  return vec4f(c,1.);
}`;
const W_POST=ms=>W_G+W_FS+/*wgsl*/`
@group(0) @binding(1) var sC:sampler;
@group(0) @binding(2) var tS:texture_2d<f32>;
@group(0) @binding(3) var tR:texture_2d<f32>;
@group(0) @binding(4) var tB:texture_2d<f32>;
@group(0) @binding(5) var tB2:texture_2d<f32>;
@group(0) @binding(6) var tDp:texture_depth${ms?'_multisampled':''}_2d;
@group(0) @binding(7) var tAO:texture_2d<f32>;
fn tmap(x:vec3f)->vec3f{return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0.),vec3f(1.));}
@fragment fn fs(v:FO)->@location(0) vec4f{
  let fc=v.pos.xy;let uv=fc*g.res.zw;
  var col=textureLoad(tS,vec2i(fc),0).rgb;
  let dp=textureLoad(tDp,vec2i(fc),0);
  let vz=g.nf.x*g.nf.y/(g.nf.y-dp*(g.nf.y-g.nf.x));
  let sz=vec2i(textureDimensions(tR));
  let h=fc*.5-.5;let b=floor(h);let f=h-b;let bi=vec2i(b);
  var acc=vec3f(0.);var ao=0.;var ws=0.;
  for(var k=0;k<4;k++){let o=vec2i(k&1,k>>1);let pc=clamp(bi+o,vec2i(0),sz-1);
    let r=textureLoad(tR,pc,0);
    let wb=select(1.-f.x,f.x,o.x==1)*select(1.-f.y,f.y,o.y==1);
    let w=(wb+.02)/(.04+abs(r.a-vz)/max(vz,.1));
    acc+=r.rgb*w;ao+=textureLoad(tAO,pc,0).r*w;ws+=w;}
  col*=mix(1.,ao/ws,g.right.w);
  col+=acc/ws;
  col+=(textureSampleLevel(tB,sC,uv,0.).rgb*.20+textureSampleLevel(tB2,sC,uv,0.).rgb*.16)*g.misc.y;
  // 暗角 → 曝光與時段色調 → 底片式壓縮 → 亮度 S 曲線（暗部再壓、亮部留層次；最亮處略為退色）
  let q=uv*2.-1.;col*=1.-.15*dot(q,q);
  col=tmap(col*g.skyC.w*g.grd.rgb);
  let l0=dot(col,vec3f(.2126,.7152,.0722));
  let l1=mix(l0,l0*l0*(3.-2.*l0),.52);
  col*=l1/max(l0,1e-4);
  col=mix(vec3f(l1),col,.895-.12*ss(.6,1.,l1));
  col=pow(max(col,vec3f(0.)),vec3f(.4545));
  col+=(ign(fc+19.)+ign(fc+47.)-1.)/255.;
  return vec4f(col,1.);
}`;
const postCache={};
function postPipes(ms){if(postCache[ms])return postCache[ms];
  const mk=(label,code,format)=>{const m=shader(code,label);return device.createRenderPipeline({label,layout:'auto',vertex:{module:m,entryPoint:'vs'},fragment:{module:m,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});};
  return postCache[ms]={rays:mk('rays',W_RAYS(ms),HDR),ao:mk('ao',W_AO(ms),HDR),rblur:mk('rblur',W_RBLUR,HDR),bdown:mk('bdown',W_BDOWN,HDR),blur:mk('blur',W_BLUR,HDR),post:mk('post',W_POST(ms),CFMT)};}
mark('pipes');
