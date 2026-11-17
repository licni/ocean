/* ───────── 著色器 ───────── */
const HEAD='#version 300 es\nprecision highp float;\nprecision highp sampler3D;\nprecision highp sampler2DShadow;\n';
// 光學常數：SIG 沿視線的衰減、KD 向下的衰減、WCOL 海水散射色、SUNC 陽光
const CORE=`
const vec3 SIG=vec3(0.050,0.0205,0.0162);
const vec3 KD=vec3(0.046,0.0190,0.0128);
const vec3 WCOL=vec3(0.13,0.56,0.86);
const vec3 SUNC=vec3(1.75,1.62,1.42);
const float EXPO=1.18;
vec3 inscatter(vec3 rd,float d){
  vec3 a=max(SIG-KD*rd.y,vec3(0.0015));
  vec3 I=(1.0-exp(-a*d))/a;
  float mu=max(dot(rd,uSun),0.0);float m2=mu*mu;
  return WCOL*SIG*exp(KD*min(uCam.y,0.0))*I*(0.78+0.36*m2*m2);
}
vec3 sunE(float y){return SUNC*exp(KD*(min(y,0.0)/uSun.y));}
vec3 skyA(float y){return vec3(0.20,0.56,0.78)*exp(KD*min(y,0.0)*1.15)*1.1;}
vec3 shUV(vec3 p){return vec3((p.xz-uSun.xz*(p.y/uSun.y))/320.0,-p.y/64.0-0.0026);}
vec2 kelpSway(vec2 xz,float h,float t){float a=0.012*pow(max(h,0.0),1.35);float ph=xz.x*0.0589+xz.y*0.0393;return a*vec2(sin(t*0.45+ph-h*0.09)+0.5,cos(t*0.36+ph*1.3-h*0.07)+0.2);}
`;
const FS_COMMON=HEAD+`
uniform vec3 uCam;uniform float uTime;uniform vec3 uSun;uniform vec4 uLamp;uniform float uLDR;uniform float uShE;
uniform sampler3D uCaus;uniform sampler2D uNoise;uniform sampler2D uRock;uniform sampler2DShadow uShadow;
out vec4 oCol;
`+CORE+`
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
vec3 tmap(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
float shadow1(vec3 p){return texture(uShadow,shUV(p));}
float shadow4(vec3 p){vec3 s=shUV(p);float e=uShE;
  return (texture(uShadow,s+vec3(-e,-e,0.0))+texture(uShadow,s+vec3(e,-e,0.0))+texture(uShadow,s+vec3(-e,e,0.0))+texture(uShadow,s+vec3(e,e,0.0)))*0.25;}
float caustic(vec3 wp,float bias){
  vec2 s=wp.xz-uSun.xz*(wp.y/uSun.y);
  float t=uTime*0.2;
  float a=texture(uCaus,vec3(s*0.109375,t),bias).r;
  float b=texture(uCaus,vec3(s.yx*0.071875+vec2(0.31,0.17),t*0.73+0.4),bias).r;
  return (a+b)*2.0;
}
vec3 lampL(vec3 V,float dist){
  float cone=smoothstep(0.76,0.99,dot(-V,uLamp.xyz))*uLamp.w;
  return vec3(1.0,0.96,0.86)*(cone*cone*2.2/(1.0+0.035*dist*dist))*exp(-dist*SIG*2.0);
}
vec3 lit(vec3 alb,vec3 N,vec3 wp,float wrapK,float glow,vec3 emis){
  vec3 Vv=uCam-wp;float dist=length(Vv);vec3 V=Vv/max(dist,1e-4);
  float depth=max(-wp.y,0.0);
  float ndl=dot(N,uSun);
  float dif=mix(max(ndl,0.0),ndl*0.5+0.5,wrapK);
  float sh=shadow4(wp+N*0.14);
  float ck=0.86*exp(-depth*0.011);
  float ca=1.0-ck+ck*caustic(wp,depth*0.028);
  float up=N.y*0.5+0.5;
  vec3 A=skyA(wp.y)*(0.16+0.84*up*up)*(0.30+0.70*sh)+vec3(0.003,0.010,0.016);
  vec3 c=alb*(sunE(wp.y)*dif*sh*ca+A);
  c+=alb*lampL(V,dist)*(0.35+0.65*max(dot(N,V),0.0));
  c+=alb*glow*(0.10+0.25*exp(-depth*0.02))+emis;
  return c*exp(-SIG*dist)+inscatter(-V,dist);
}
vec4 finish(vec3 c){
  c=max(c,vec3(0.0));
  if(uLDR>0.5){c=pow(tmap(c*EXPO),vec3(0.4545));c+=(ign(gl_FragCoord.xy)-0.5)/255.0;}
  else c=min(c,vec3(24.0));
  return vec4(c,1.0);
}
vec3 coralPal(float t){t=fract(t);
  vec3 a=vec3(0.95,0.34,0.55),b=vec3(1.0,0.56,0.24),c=vec3(0.62,0.36,0.92),d=vec3(0.96,0.80,0.30);
  return t<0.25?mix(a,b,t*4.0):t<0.5?mix(b,c,(t-0.25)*4.0):t<0.75?mix(c,d,(t-0.5)*4.0):mix(d,a,(t-0.75)*4.0);}
// 岩石材質：三向投影的凹凸與裂隙、層理、附生珊瑚色斑、朝上的藻
vec3 rockMat(vec3 p,inout vec3 N,float dist,float seed){
  vec3 w=N*N;w/=(w.x+w.y+w.z);
  const float f1=0.085,f2=0.42;
  vec4 ax=texture(uRock,p.zy*f1),ay=texture(uRock,p.xz*f1),az=texture(uRock,p.xy*f1);
  vec4 bx=texture(uRock,p.zy*f2+0.37),by=texture(uRock,p.xz*f2+0.37),bz=texture(uRock,p.xy*f2+0.37);
  float h=ax.b*w.x+ay.b*w.y+az.b*w.z;
  float h2=bx.b*w.x+by.b*w.y+bz.b*w.z;
  float mot=ax.a*w.x+ay.a*w.y+az.a*w.z;
  float fade=exp(-dist*0.02);
  float fade3=exp(-dist*0.07);
  vec4 cx=texture(uRock,p.zy*1.9+0.11),cy=texture(uRock,p.xz*1.9+0.11),cz=texture(uRock,p.xy*1.9+0.11);
  float h3=cx.b*w.x+cy.b*w.y+cz.b*w.z;
  vec2 gx=(ax.rg-0.5)*3.4+(bx.rg-0.5)*2.4*fade+(cx.rg-0.5)*1.5*fade3,gy=(ay.rg-0.5)*3.4+(by.rg-0.5)*2.4*fade+(cy.rg-0.5)*1.5*fade3,gz=(az.rg-0.5)*3.4+(bz.rg-0.5)*2.4*fade+(cz.rg-0.5)*1.5*fade3;
  vec3 N0=N;
  N=normalize(N-(w.x*vec3(0.0,gx.y,gx.x)+w.y*vec3(gy.x,0.0,gy.y)+w.z*vec3(gz.x,gz.y,0.0)));
  float strata=texture(uNoise,vec2(p.y*0.06+h*0.22+seed,(p.x+p.z)*0.004)).r;
  vec3 c=mix(vec3(0.27,0.29,0.30),vec3(0.36,0.30,0.22),smoothstep(0.38,0.62,strata));
  c=mix(c,vec3(0.20,0.27,0.22),smoothstep(0.5,0.75,texture(uNoise,p.xz*0.013+p.y*0.021).g));
  c*=(0.30+1.25*h*(0.45+1.0*h2))*mix(1.0,0.7+0.6*h3,fade3)*(0.82+0.36*texture(uNoise,(p.xz+p.yy*vec2(0.7,0.4))*1.7).b);
  float e=smoothstep(0.55,0.68,mot)*smoothstep(-0.55,0.25,N0.y);
  vec3 ec=coralPal(texture(uNoise,p.xz*0.017+p.y*0.011).b*2.3+seed);
  c=mix(c,ec*(0.30+0.6*h2),e*0.75);
  c=mix(c,vec3(0.17,0.33,0.19)*(0.6+0.8*h2),smoothstep(0.5,0.95,N0.y)*0.55*smoothstep(0.25,0.6,h));
  return c;
}
`;
const VS_FULL=HEAD+`out vec2 vUv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUv=p*2.0-1.0;gl_Position=vec4(vUv,0.0,1.0);}`;
// 頂點著色器共用開頭：一般投影，或烘焙陰影時沿陽光方向投到水面
const VSP=s=>HEAD+(s?'#define SHADOW\n':'')+`uniform mat4 uVP;uniform vec3 uSun;uniform vec2 uShOff;
vec4 proj(vec3 p){
#ifdef SHADOW
  vec2 s=(p.xz-uSun.xz*(p.y/uSun.y))/320.0;return vec4(s*2.0-1.0+uShOff,(-p.y/64.0)*2.0-1.0,1.0);
#else
  return uVP*vec4(p,1.0);
#endif
}
`;
const FS_NULL=HEAD+'void main(){}';

const P_bg=program(VS_FULL,FS_COMMON+`
in vec2 vUv;uniform vec3 uFwd,uRight,uUp;uniform vec2 uTan;
void main(){vec3 rd=normalize(uFwd+uRight*vUv.x*uTan.x+uUp*vUv.y*uTan.y);
  float d=rd.y>1e-3?min(-uCam.y/rd.y,2000.0):2000.0;oCol=finish(inscatter(rd,d));}`);

const VS_TERRAIN=s=>VSP(s)+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;
uniform vec3 uOff;out vec3 vW,vN;out vec4 vCol;
void main(){vW=aPos+uOff;vN=aNrm;vCol=aCol;gl_Position=proj(vW);}`;
const P_terrain=program(VS_TERRAIN(0),FS_COMMON+`
in vec3 vW,vN;in vec4 vCol;
void main(){
  vec3 N=normalize(vN);
  float dist=length(uCam-vW);
  vec2 q=vW.xz;
  float n1=texture(uNoise,q*0.0375).r;
  float n2=texture(uNoise,q*0.35).g;
  float n3=texture(uNoise,q*1.7).b;
  float rf=smoothstep(0.80,0.96,N.y)*exp(-dist*0.06);
  float ph=(q.x*0.8+q.y*0.6)*11.0+n1*16.0+n2*2.5;
  vec3 Ns=normalize(N+vec3(0.8,0.0,0.6)*cos(ph)*0.30*rf);
  vec3 alb=vCol.rgb*(0.74+0.30*n2+0.20*n3)*(0.86+0.28*n1)*(1.0+0.07*sin(ph)*rf)*0.66;
  if(vCol.a>0.02){vec3 Nr=N;vec3 ar=rockMat(vW,Nr,dist,0.0);alb=mix(alb,ar,vCol.a);Ns=normalize(mix(Ns,Nr,vCol.a));}
  oCol=finish(lit(alb,Ns,vW,0.12,0.0,vec3(0.0)));
}`);
const P_terrainSh=program(VS_TERRAIN(1),FS_NULL);

const VS_STATIC=s=>VSP(s)+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec3 aCol;layout(location=3) in vec2 aAux;
layout(location=4) in vec4 iPosS;layout(location=5) in vec4 iQuat;layout(location=6) in vec4 iScale;layout(location=7) in vec4 iCol;
uniform vec3 uOff;uniform float uTime;uniform vec4 uSway;
out vec3 vW,vN,vCol,vObj;out float vSeed;
vec3 qrot(vec4 q,vec3 v){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
void main(){
  vec3 lp=aPos*iScale.xyz;
  vec3 wp=qrot(iQuat,lp)+iPosS.xyz+uOff;
  float w=aAux.x*uSway.x*iScale.y;
  float ph=uTime*uSway.y+dot(iPosS.xz,vec2(0.13,0.09))+aAux.y+iPosS.w;
  wp.x+=w*(sin(ph)+0.4*sin(ph*2.3+1.0)+uSway.z);
  wp.z+=w*(0.7*cos(ph*0.8+0.6)+uSway.z*0.4);
  wp.y+=uSway.w*sin(uTime*0.21+iPosS.w*3.0);
  vW=wp;vN=qrot(iQuat,aNrm/iScale.xyz);vCol=aCol*iCol.rgb;vObj=lp+iCol.w*7.0;vSeed=iCol.w;
  gl_Position=proj(wp);
}`;
const P_static=program(VS_STATIC(0),FS_COMMON+`
in vec3 vW,vN,vCol,vObj;in float vSeed;uniform vec4 uDet;uniform vec2 uMat;
void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;
  vec3 alb;
  if(uMat.x>0.5){alb=rockMat(vW,N,length(uCam-vW),vSeed)*vCol;}
  else{
    float d1=texture(uNoise,vObj.xy*uDet.x+vObj.zz*uDet.x*vec2(0.7,0.4)).r;
    float d2=texture(uNoise,vObj.zx*uDet.x*1.3+vObj.yy*uDet.x*vec2(0.3,0.6)).g;
    float det=mix((d1+d2)*0.5,1.0-abs(d1+d2-1.0)*2.2,uDet.z);
    alb=(uMat.y>0.01?mix(vCol,vCol*vCol,0.6):vCol)*mix(1.0,0.5+1.0*det,uDet.y)*0.60;
  }
  oCol=finish(lit(alb,N,vW,uDet.w,uMat.y,vec3(0.0)));
}`);
const P_staticSh=program(VS_STATIC(1),FS_NULL);

// 葉片：每一片都是獨立實例；光照在頂點算好，片段只做合成
const VS_LEAF=s=>VSP(s)+`
layout(location=0) in vec2 aTS;
layout(location=4) in vec4 iA;layout(location=5) in vec4 iB;layout(location=6) in vec4 iC;
uniform vec3 uOff;uniform float uTime;uniform float uWide;
#ifndef SHADOW
uniform vec3 uCam;uniform vec4 uLamp;uniform sampler3D uCaus;uniform sampler2DShadow uShadow;
out vec3 vN,vV,vE,vA,vT,vS,vCol,vIr,vEm;out vec3 vP;
`+CORE+`
#else
vec2 kelpSway(vec2 xz,float h,float t){float a=0.012*pow(max(h,0.0),1.35);float ph=xz.x*0.0589+xz.y*0.0393;return a*vec2(sin(t*0.45+ph-h*0.09)+0.5,cos(t*0.36+ph*1.3-h*0.07)+0.2);}
#endif
void main(){
  float t=aTS.x,fl=iC.w,rnd=iC.y;
  float th0=iB.y+sin(uTime*1.1+rnd*37.0+iA.y*0.4)*0.10*fl;
  float b=max(iC.z,0.05)*1.3;
  float th=th0+b*t;
  float L=iA.w;
  float fw=L*(cos(th0)-cos(th))/b,up=L*(sin(th)-sin(th0))/b;
  float yw=iB.x+sin(uTime*0.7+rnd*91.0)*0.16*fl;
  vec3 f=vec3(cos(yw),0.0,sin(yw)),sd=vec3(-f.z,0.0,f.x);
  float w=iB.z*uWide*(0.14+1.9*sqrt(t)*pow(1.0-t,0.8));
  vec3 p=iA.xyz+f*fw+vec3(0.0,up,0.0)+sd*(aTS.y*w*0.5);
  p.xz+=kelpSway(iA.xz,iB.w,uTime);
  vec3 wp=p+uOff;
  gl_Position=proj(wp);
#ifndef SHADOW
  vec3 tang=f*sin(th)+vec3(0.0,cos(th),0.0);
  vN=cross(sd,tang)+sd*aTS.y*0.35;
  vec3 Vv=uCam-wp;float dist=length(Vv);vec3 V=Vv/max(dist,1e-4);vV=V;
  float depth=max(-wp.y,0.0);
  float sh=texture(uShadow,shUV(wp+uSun*0.3));
  vec2 cs=wp.xz-uSun.xz*(wp.y/uSun.y);
  float ck=0.8*exp(-depth*0.011);
  float ca=1.0-ck+ck*textureLod(uCaus,vec3(cs*0.109375,uTime*0.2),1.0).r*4.0;
  vE=sunE(wp.y)*sh*ca;
  float cone=smoothstep(0.76,0.99,dot(-V,uLamp.xyz))*uLamp.w;
  vA=skyA(wp.y)*(0.22+0.78*sh)*0.85+vec3(1.0,0.96,0.86)*(cone*cone*2.2/(1.0+0.035*dist*dist))*exp(-dist*SIG*2.0);
  vT=exp(-SIG*dist);vS=inscatter(-V,dist);
  int ty=int(iC.x+0.5);
  vec3 c0,c1;vec3 ir=vec3(0.0);float tr=0.8,em=0.0;
  if(ty==0){c0=mix(vec3(0.17,0.27,0.06),vec3(0.30,0.27,0.05),rnd*rnd);c1=mix(vec3(0.40,0.46,0.10),vec3(0.60,0.50,0.10),rnd);tr=0.95;}
  else if(ty==1){c0=vec3(0.15,0.14,0.06);c1=vec3(0.21,0.19,0.07);tr=0.2;}
  else if(ty==2){c0=vec3(0.10,0.34,0.13);c1=mix(vec3(0.30,0.62,0.22),vec3(0.55,0.70,0.20),rnd);}
  else if(ty==3){c0=vec3(0.30,0.13,0.56);c1=mix(vec3(0.60,0.30,0.88),vec3(0.38,0.36,0.95),rnd);ir=vec3(0.15,0.65,0.95);em=0.05;}
  else if(ty==4){c0=vec3(0.66,0.13,0.42);c1=mix(vec3(0.98,0.42,0.66),vec3(1.0,0.60,0.45),rnd);ir=vec3(1.0,0.80,0.35);em=0.06;}
  else if(ty==5){c0=vec3(0.70,0.08,0.45);c1=mix(vec3(0.98,0.20,0.62),vec3(0.78,0.22,0.95),rnd);tr=0.5;em=0.22;}
  else if(ty==6){c0=vec3(0.50,0.36,0.06);c1=vec3(0.90,0.68,0.14);tr=0.95;}
  else{c0=vec3(0.04,0.42,0.42);c1=mix(vec3(0.15,0.85,0.72),vec3(0.20,0.62,0.98),rnd);tr=0.5;em=0.20;}
  vec3 col=mix(c0,c1,t*0.85+0.15*rnd)*0.74;
  vCol=col;vIr=ir;
  float sp=step(0.955,fract(rnd*7.31))*pow(max(sin(uTime*(0.8+rnd*1.7)+rnd*211.0),0.0),14.0);
  vEm=col*em*(0.5+0.5*exp(-depth*0.01))+vec3(1.0,0.85,0.40)*sp*1.3*float(ty!=1);
  vP=vec3(aTS.y,t,tr);
#endif
}`;
const P_leaf=program(VS_LEAF(0),HEAD+`
uniform vec3 uSun;uniform float uLDR;
in vec3 vN,vV,vE,vA,vT,vS,vCol,vIr,vEm;in vec3 vP;out vec4 oCol;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
vec3 tmap(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
void main(){
  vec3 N=normalize(vN),V=normalize(vV);if(dot(N,V)<0.0)N=-N;
  float ndl=dot(N,uSun);
  float dif=max(ndl,0.0)*0.85+max(-ndl,0.0)*vP.z+0.08;
  float rib=1.0-0.30*smoothstep(0.16,0.0,abs(vP.x));
  float fr=1.0-abs(dot(N,V));
  vec3 alb=mix(vCol*rib,vIr,fr*fr*0.55*step(0.001,vIr.r+vIr.g));
  float up=N.y*0.5+0.5;
  vec3 c=alb*(vE*dif+vA*(0.30+0.70*up))+vEm;
  c=max(c*vT+vS,vec3(0.0));
  if(uLDR>0.5){c=pow(tmap(c*1.18),vec3(0.4545));c+=(ign(gl_FragCoord.xy)-0.5)/255.0;}else c=min(c,vec3(24.0));
  oCol=vec4(c,1.0);
}`);
const P_leafSh=program(VS_LEAF(1),FS_NULL);

const P_glint=program(HEAD+`
layout(location=0) in vec4 aG;layout(location=1) in vec4 aH;
uniform mat4 uVP;uniform vec3 uCam,uSun,uOff;uniform float uTime,uPx;out vec4 vC;
`+CORE+`
void main(){
  vec3 p=aG.xyz;p.xz+=kelpSway(aG.xz,aG.w,uTime);
  float r=aH.x;p+=vec3(sin(uTime*0.3+r*40.0),cos(uTime*0.23+r*17.0),sin(uTime*0.27+r*29.0))*0.12;
  vec3 wp=p+uOff;float d=length(wp-uCam);
  gl_Position=uVP*vec4(wp,1.0);
  float tw=pow(max(sin(uTime*(0.7+r*1.9)+r*311.0),0.0),6.0);
  gl_PointSize=clamp(uPx*aH.z*(0.6+0.8*tw)/max(gl_Position.w,0.05),1.0,6.0);
  vec3 col=mix(vec3(1.0,0.82,0.30),vec3(0.50,1.0,0.42),aH.y);
  if(aH.y>1.5)col=vec3(1.0,0.35,0.85);
  vC=vec4(col*(0.15+1.6*tw)*exp(-SIG*d)*(0.35+0.65*exp(KD.g*min(wp.y,0.0)))*smoothstep(150.0,90.0,d),1.0);
}`,HEAD+`in vec4 vC;out vec4 oCol;void main(){vec2 q=gl_PointCoord*2.0-1.0;float a=smoothstep(1.0,0.0,dot(q,q));oCol=vec4(vC.rgb*a*a,0.0);}`);

const P_swim=program(HEAD+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec3 aCol;layout(location=3) in vec2 aAux;
layout(location=4) in vec4 iPosS;layout(location=5) in vec4 iDir;layout(location=6) in vec4 iColA;layout(location=7) in vec4 iColB;
uniform mat4 uVP;uniform vec4 uSwim;uniform float uSwimZ;
out vec3 vW,vN,vCol,vObj;out vec4 vA;out vec3 vB;
void main(){
  vec3 p=aPos;float ph=iDir.w;
  p.x+=aAux.x*sin(ph+p.z*uSwim.y)*uSwim.x;
  p.y+=aAux.y*sin(ph+p.z*uSwimZ-abs(p.x)*uSwim.w)*uSwim.z;
  float cr=cos(iColB.w),sr=sin(iColB.w);
  vec3 n=aNrm;
  p.xy=vec2(p.x*cr-p.y*sr,p.x*sr+p.y*cr);n.xy=vec2(n.x*cr-n.y*sr,n.x*sr+n.y*cr);
  vec3 f=iDir.xyz;vec3 r=normalize(cross(vec3(0.0,1.0,0.0),f));vec3 u=cross(f,r);
  vW=iPosS.xyz+(r*p.x+u*p.y+f*p.z)*iPosS.w;
  vN=r*n.x+u*n.y+f*n.z;vCol=aCol;vObj=aPos;vA=iColA;vB=iColB.rgb;
  gl_Position=uVP*vec4(vW,1.0);
}`,FS_COMMON+`
in vec3 vW,vN,vCol,vObj;in vec4 vA;in vec3 vB;uniform float uSpec;
void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;
  int pat=int(vA.w+0.5);
  vec3 c=vA.rgb*vCol.r;
  c=mix(c,vec3(0.90,0.92,0.90),vCol.g*(pat==5||pat==6?0.35:1.0));
  float m=0.0;
  if(pat==1)m=smoothstep(0.1,0.4,sin(vObj.z*21.0+0.6));
  else if(pat==2)m=smoothstep(0.045,0.02,abs(vObj.y-0.03))*step(-0.37,vObj.z);
  else if(pat==3)m=smoothstep(-0.05,-0.33,vObj.z);
  else if(pat==4)m=smoothstep(0.42,0.6,texture(uNoise,vObj.xz*2.3).r)*0.6*(1.0-vCol.g);
  else if(pat==5)m=smoothstep(0.30,-0.25,vObj.z+vObj.y*0.8);
  else if(pat==6)m=smoothstep(0.52,0.62,texture(uNoise,vObj.zy*3.1).g);
  else if(pat==7)m=smoothstep(0.0,0.12,vObj.y)*0.9;
  m=max(m,vCol.b*0.85);
  c=mix(c,vB,m);
  vec3 V=normalize(uCam-vW);
  float sp=pow(max(dot(N,normalize(uSun+V)),0.0),22.0)*uSpec*exp(min(vW.y,0.0)*0.02);
  oCol=finish(lit(c,N,vW,0.3,uSpec>0.45?0.55:0.0,vec3(0.6,0.65,0.65)*sp));
}`);

const P_jelly=program(HEAD+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec3 aCol;layout(location=3) in vec2 aAux;
layout(location=4) in vec4 iPosS;layout(location=6) in vec4 iScale;layout(location=7) in vec4 iCol;
uniform mat4 uVP;uniform vec3 uOff;uniform float uTime;
out vec3 vW,vN,vCol;
void main(){
  float ph=uTime*1.7+iPosS.w*6.283;float pu=sin(ph);
  vec3 p=aPos;
  p.xz*=1.0+aAux.x*0.20*pu;
  p.y+=(1.0-aAux.x)*0.04*pu;
  float tw=aAux.y;
  p.x+=tw*sin(ph*0.5+p.y*2.2+aPos.z*5.0)*0.16;
  p.z+=tw*cos(ph*0.43+p.y*1.9+aPos.x*5.0)*0.16;
  vec3 wp=p*iScale.x+iPosS.xyz+uOff;
  wp.y+=sin(uTime*0.23+iPosS.w*40.0)*1.2+0.06*cos(ph)*iScale.x;
  wp.x+=sin(uTime*0.11+iPosS.w*17.0)*0.8;
  vW=wp;vN=aNrm;vCol=aCol*iCol.rgb;
  gl_Position=uVP*vec4(wp,1.0);
}`,FS_COMMON+`
in vec3 vW,vN,vCol;
void main(){
  vec3 N=normalize(vN);vec3 Vv=uCam-vW;float dist=length(Vv);vec3 V=Vv/dist;
  float rim=pow(1.0-abs(dot(N,V)),1.5);
  vec3 c=vCol*(0.25+1.1*rim)*(skyA(vW.y)*1.4+sunE(vW.y)*0.5)+vCol*(0.22+0.3*rim);
  c+=vCol*lampL(V,dist);
  float a=clamp(0.22+0.70*rim,0.0,1.0);
  vec3 T=exp(-SIG*dist);
  c=c*T;a*=T.b;
  vec4 o=finish(c);oCol=vec4(o.rgb*a,a);
}`);

const P_surface=program(HEAD+`
layout(location=0) in vec2 aPos;uniform mat4 uVP;uniform vec3 uCam;out vec3 vW;
void main(){vW=vec3(uCam.x+aPos.x*900.0,0.0,uCam.z+aPos.y*900.0);gl_Position=uVP*vec4(vW,1.0);}`,FS_COMMON+`
in vec3 vW;
const vec4 WV[7]=vec4[7](vec4(0.8,0.6,0.35,0.9),vec4(-0.5,0.866,0.6,1.25),vec4(0.2,-0.98,1.1,1.7),vec4(-0.91,-0.41,1.9,2.3),vec4(0.6,-0.8,3.1,3.0),vec4(-0.3,0.954,5.2,3.9),vec4(0.95,0.31,8.0,4.9));
const float WA[7]=float[7](0.12,0.10,0.07,0.04,0.022,0.012,0.006);
void main(){
  vec3 Vv=vW-uCam;float dist=length(Vv);vec3 V=Vv/dist;
  vec2 g=vec2(0.0);
  for(int i=0;i<7;i++){float k=WV[i].z;g+=WV[i].xy*(WA[i]*k*cos(dot(WV[i].xy,vW.xz)*k+uTime*WV[i].w));}
  g*=exp(-dist*0.022);
  vec3 N=normalize(vec3(-g.x,-1.0,-g.y));
  vec3 Nf=normalize(vec3(-g.x*0.2,-1.0,-g.y*0.2));
  vec3 R=refract(V,N,1.333);
  vec3 refl=inscatter(reflect(V,Nf),2000.0)*0.9;
  vec3 col;
  if(dot(R,R)<1e-4){col=refl;}
  else{
    float cosT=max(R.y,0.0);
    vec3 sky=mix(vec3(0.62,0.95,1.10),vec3(0.36,0.74,1.15),cosT)*1.9;
    float sd=max(dot(R,uSun),0.0);
    sky+=vec3(1.0,0.95,0.8)*(pow(sd,40.0)*2.5+pow(sd,400.0)*30.0);
    float fr=pow(1.0-cosT,4.0);
    col=mix(sky,refl,clamp(fr,0.0,1.0));
  }
  oCol=finish(col*exp(-SIG*dist)+inscatter(V,dist));
}`);

const P_snow=program(HEAD+`
layout(location=0) in vec4 aSeed;uniform mat4 uVP;uniform vec3 uCam;uniform float uTime;uniform float uPx;uniform vec4 uLamp;
out float vA;
void main(){
  vec3 box=vec3(40.0,26.0,40.0);
  float r=aSeed.w;
  vec3 drift=vec3(sin(uTime*0.11+r*6.28)*0.7+uTime*0.06,-uTime*0.045*(0.4+r),cos(uTime*0.13+r*4.0)*0.7);
  vec3 rel=mod(aSeed.xyz*box+drift-uCam,box)-box*0.5;
  vec3 wp=uCam+rel;float d=length(rel);
  gl_Position=uVP*vec4(wp,1.0);
  gl_PointSize=clamp(uPx*(0.016+0.03*r)/max(gl_Position.w,0.05),1.0,7.0);
  float lit=0.10+0.55*exp(min(wp.y,0.0)*0.02);
  float cone=smoothstep(0.84,0.97,dot(rel/max(d,0.01),uLamp.xyz))*uLamp.w;
  lit+=cone*2.2/(1.0+0.10*d*d);
  vA=smoothstep(19.0,9.0,d)*smoothstep(0.25,1.2,d)*(0.25+0.75*r)*lit*step(wp.y,-0.15);
}`,HEAD+`in float vA;out vec4 oCol;
void main(){vec2 q=gl_PointCoord*2.0-1.0;float a=smoothstep(1.0,0.2,dot(q,q))*vA;oCol=vec4(vec3(0.62,0.86,0.84)*a*0.8,0.0);}`);

const P_bubble=program(HEAD+`
layout(location=0) in vec4 aSrc;uniform mat4 uVP;uniform vec3 uCam;uniform vec3 uOff;uniform float uTime;uniform float uPx;
out float vA;
void main(){
  float H=-aSrc.y-0.3;
  float sp=0.9+0.6*fract(aSrc.w*7.13);
  float rise=fract(aSrc.w*3.7+uTime*sp/H)*H;
  vec3 wp=vec3(aSrc.x,aSrc.y+rise,aSrc.z)+uOff;
  float wob=rise*0.9+aSrc.w*40.0;float spread=0.06+rise*0.03;
  wp.x+=sin(wob*1.7)*spread+sin(wob*0.31+aSrc.w*9.0)*spread*1.6;
  wp.z+=cos(wob*1.3)*spread+cos(wob*0.27+aSrc.w*5.0)*spread*1.6;
  float d=length(wp-uCam);
  gl_Position=uVP*vec4(wp,1.0);
  float r=(0.02+0.045*fract(aSrc.w*5.3))*(1.0+rise/H*1.6);
  gl_PointSize=clamp(uPx*r*2.0/max(gl_Position.w,0.05),1.5,48.0);
  vA=exp(-d*0.022)*(0.35+0.65*exp(wp.y*0.02))*smoothstep(0.0,0.6,rise);
}`,HEAD+`in float vA;out vec4 oCol;
void main(){vec2 q=gl_PointCoord*2.0-1.0;float r2=dot(q,q);if(r2>1.0)discard;
  float rim=smoothstep(0.35,1.0,r2);float hl=smoothstep(0.30,0.0,length(q-vec2(-0.32,-0.38)));
  float a=clamp(0.08+0.55*rim+0.9*hl,0.0,1.0)*vA;oCol=vec4(vec3(0.70,1.0,1.05)*a*1.2,a*0.7);}`);

// 體積光束（半解析度）：沿視線取樣陰影圖，海藻與岩石會把光切成一束一束
const P_rays=program(VS_FULL,HEAD+`
in vec2 vUv;out vec4 oCol;
uniform highp sampler2D uDepth;uniform sampler3D uCaus;uniform sampler2DShadow uShadow;
uniform vec3 uCam,uFwd,uRight,uUp,uSun;uniform vec2 uTan;uniform vec2 uNF;uniform float uTime;uniform int uSteps;uniform float uLDR;
`+CORE+`
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
void main(){
  vec2 uv=vUv*0.5+0.5;
  float zn=texture(uDepth,uv).r*2.0-1.0;
  float vz=2.0*uNF.x*uNF.y/(uNF.y+uNF.x-zn*(uNF.y-uNF.x));
  vec3 rdv=uFwd+uRight*vUv.x*uTan.x+uUp*vUv.y*uTan.y;
  float len=length(rdv);vec3 rd=rdv/len;
  float tm=min(vz*len,115.0);
  if(rd.y>1e-4)tm=min(tm,-uCam.y/rd.y);
  float j=ign(gl_FragCoord.xy);
  float dt=tm/float(uSteps);vec3 acc=vec3(0.0);
  for(int i=0;i<uSteps;i++){
    float t=(float(i)+j)*dt;
    vec3 p=uCam+rd*t;
    float vis=texture(uShadow,shUV(p));
    vec2 s=p.xz-uSun.xz*(p.y/uSun.y);
    float pat=smoothstep(0.17,0.50,textureLod(uCaus,vec3(s*0.034375,uTime*0.04),1.3).r);
    acc+=exp(-SIG*t+KD*(p.y/uSun.y))*(vis*(0.16+pat*4.2));
  }
  float mu=max(dot(rd,uSun),0.0);
  float ph=0.30+2.1*mu*mu*mu;
  vec3 r=acc*dt*SIG*(WCOL+vec3(0.05,0.07,0.05))*SUNC*ph*1.5;
  if(uLDR>0.5)r=1.0-exp(-r*2.2);
  oCol=vec4(min(r,vec3(16.0)),vz);
}`);
const P_rblur=program(VS_FULL,HEAD+`
in vec2 vUv;out vec4 oCol;uniform sampler2D uRays;uniform float uLDR;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);ivec2 mx=textureSize(uRays,0)-1;vec4 c=texelFetch(uRays,p,0);vec3 acc=vec3(0.0);float ws=0.0;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec4 r=texelFetch(uRays,clamp(p+ivec2(x,y),ivec2(0),mx),0);
    float w=uLDR>0.5?1.0:1.0/(0.03+abs(r.a-c.a)/max(c.a,0.1));acc+=r.rgb*w;ws+=w;}
  oCol=vec4(acc/ws,c.a);}`);
const P_bloomDown=program(VS_FULL,HEAD+`
in vec2 vUv;out vec4 oCol;uniform sampler2D uScene;uniform sampler2D uRays;uniform vec2 uPxS;
void main(){vec2 uv=vUv*0.5+0.5;vec3 c=vec3(0.0);
  for(int i=0;i<4;i++){vec2 o=vec2(float(i&1)*2.0-1.0,float(i>>1)*2.0-1.0)*uPxS;c+=texture(uScene,uv+o).rgb;}
  c=c*0.25+texture(uRays,uv).rgb;
  float l=max(c.r,max(c.g,c.b));
  oCol=vec4(c*smoothstep(0.75,1.9,l),1.0);}`);
const P_blur=program(VS_FULL,HEAD+`
in vec2 vUv;out vec4 oCol;uniform sampler2D uSrc;uniform vec2 uDir;
void main(){vec2 uv=vUv*0.5+0.5;
  vec3 c=texture(uSrc,uv).rgb*0.227;
  c+=(texture(uSrc,uv+uDir*1.385).rgb+texture(uSrc,uv-uDir*1.385).rgb)*0.316;
  c+=(texture(uSrc,uv+uDir*3.231).rgb+texture(uSrc,uv-uDir*3.231).rgb)*0.070;
  oCol=vec4(c,1.0);}`);
const P_post=program(VS_FULL,HEAD+`
in vec2 vUv;out vec4 oCol;
uniform sampler2D uScene;uniform highp sampler2D uDepth;uniform sampler2D uRays;uniform sampler2D uBloom;
uniform vec2 uNF;uniform float uLDR;uniform float uBloomK;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}
vec3 tmap(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
void main(){
  vec2 uv=vUv*0.5+0.5;
  vec3 col=texture(uScene,uv).rgb;
  vec3 rays;
  if(uLDR>0.5){rays=texture(uRays,uv).rgb;col+=rays*(1.0-col);}
  else{
    float zn=texture(uDepth,uv).r*2.0-1.0;
    float vz=2.0*uNF.x*uNF.y/(uNF.y+uNF.x-zn*(uNF.y-uNF.x));
    ivec2 sz=textureSize(uRays,0);
    vec2 h=uv*vec2(sz)-0.5;vec2 b=floor(h),f=h-b;ivec2 bi=ivec2(b);
    vec3 acc=vec3(0.0);float ws=0.0;
    for(int k=0;k<4;k++){ivec2 o=ivec2(k&1,k>>1);
      vec4 r=texelFetch(uRays,clamp(bi+o,ivec2(0),sz-1),0);
      float wb=(o.x==1?f.x:1.0-f.x)*(o.y==1?f.y:1.0-f.y);
      float w=(wb+0.02)/(0.04+abs(r.a-vz)/max(vz,0.1));
      acc+=r.rgb*w;ws+=w;}
    rays=acc/ws;
    col+=rays;
    col+=texture(uBloom,uv).rgb*uBloomK;
    col=pow(tmap(col*1.18),vec3(0.4545));
  }
  col=mix(col,col*col*(3.0-2.0*col),0.42);
  float lum=dot(col,vec3(0.2126,0.7152,0.0722));col=max(mix(vec3(lum),col,1.16),vec3(0.0));
  col*=1.0-0.22*dot(vUv,vUv);
  col+=(ign(gl_FragCoord.xy+19.0)-0.5)/255.0;
  oCol=vec4(col,1.0);
}`);
