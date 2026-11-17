/* ───────── 幾何建構器 ───────── */
class Geo{
  constructor(){this.v=[];this.i=[];this.n=0;}
  vert(p,c,a0,a1){this.v.push(p[0],p[1],p[2],0,0,0,c[0],c[1],c[2],a0||0,a1||0);return this.n++;}
  tri(a,b,c){this.i.push(a,b,c);}
  quad(a,b,c,d){this.i.push(a,b,c,a,c,d);}
  pos(i){const o=i*11;return[this.v[o],this.v[o+1],this.v[o+2]];}
  normals(){const v=this.v,ix=this.i;for(let i=0;i<this.n;i++){v[i*11+3]=v[i*11+4]=v[i*11+5]=0;}
    for(let t=0;t<ix.length;t+=3){const a=ix[t]*11,b=ix[t+1]*11,c=ix[t+2]*11;
      const ux=v[b]-v[a],uy=v[b+1]-v[a+1],uz=v[b+2]-v[a+2],wx=v[c]-v[a],wy=v[c+1]-v[a+1],wz=v[c+2]-v[a+2];
      const nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;
      for(const o of[a,b,c]){v[o+3]+=nx;v[o+4]+=ny;v[o+5]+=nz;}}
    for(let i=0;i<this.n;i++){const o=i*11,l=Math.hypot(v[o+3],v[o+4],v[o+5]);if(l>1e-12){v[o+3]/=l;v[o+4]/=l;v[o+5]/=l;}else v[o+4]=1;}
    return this;}
  tube(path,radii,sides,cFn,aFn,cap){const m=path.length,base=this.n;let N=null;
    for(let k=0;k<m;k++){const T=norm(sub(path[Math.min(k+1,m-1)],path[Math.max(k-1,0)]));
      if(!N)N=Math.abs(T[1])<.9?[0,1,0]:[1,0,0];
      const d=dot(N,T);N=norm([N[0]-T[0]*d,N[1]-T[1]*d,N[2]-T[2]*d]);const B=cross(T,N);
      const c=cFn(k/(m-1),k),ax=aFn?aFn(k/(m-1),path[k]):[0,0];
      for(let j=0;j<sides;j++){const an=j/sides*TAU,cs=Math.cos(an)*radii[k],sn=Math.sin(an)*radii[k];
        this.vert([path[k][0]+N[0]*cs+B[0]*sn,path[k][1]+N[1]*cs+B[1]*sn,path[k][2]+N[2]*cs+B[2]*sn],c,ax[0],ax[1]);}}
    for(let k=0;k<m-1;k++)for(let j=0;j<sides;j++){const a=base+k*sides+j,b=base+k*sides+(j+1)%sides,c=a+sides,d=b+sides;this.i.push(a,d,c,a,b,d);}
    if(cap){const ax=aFn?aFn(1,path[m-1]):[0,0],ci=this.vert(path[m-1],cFn(1,m-1),ax[0],ax[1]);for(let j=0;j<sides;j++)this.i.push(base+(m-1)*sides+j,base+(m-1)*sides+(j+1)%sides,ci);}
    return this;}
  lathe(prof,segs,cFn,aFn,off){const base=this.n,m=prof.length;off=off||[0,0,0];
    for(let k=0;k<m;k++){const c=cFn(k/(m-1),k),ax=aFn?aFn(k/(m-1),k):[0,0];
      for(let j=0;j<segs;j++){const an=j/segs*TAU;this.vert([off[0]+prof[k][0]*Math.cos(an),off[1]+prof[k][1],off[2]+prof[k][0]*Math.sin(an)],c,ax[0],ax[1]);}}
    for(let k=0;k<m-1;k++)for(let j=0;j<segs;j++){const a=base+k*segs+j,b=base+k*segs+(j+1)%segs,c=a+segs,d=b+segs;this.i.push(a,c,d,a,d,b);}
    return this;}
  strip(pts,widths,side,cFn,aFn){const base=this.n,m=pts.length;
    for(let k=0;k<m;k++){const c=cFn(k/(m-1),k),ax=aFn?aFn(k/(m-1),pts[k]):[0,0],w=widths[k]/2;
      this.vert([pts[k][0]-side[0]*w,pts[k][1]-side[1]*w,pts[k][2]-side[2]*w],c,ax[0],ax[1]);
      this.vert([pts[k][0]+side[0]*w,pts[k][1]+side[1]*w,pts[k][2]+side[2]*w],c,ax[0],ax[1]);}
    for(let k=0;k<m-1;k++){const a=base+k*2;this.i.push(a,a+1,a+3,a,a+3,a+2);}
    return this;}
  box(c,h,col){const s=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for(const n of s){const u=[n[1],n[2],n[0]],w=cross(n,u),q=[];
      for(const[a,b]of[[-1,-1],[1,-1],[1,1],[-1,1]])q.push(this.vert([c[0]+(n[0]+u[0]*a+w[0]*b)*h[0],c[1]+(n[1]+u[1]*a+w[1]*b)*h[1],c[2]+(n[2]+u[2]*a+w[2]*b)*h[2]],col));
      this.quad(q[0],q[1],q[2],q[3]);}
    return this;}
}
let ICO=null;
function ico(sub){if(!ICO)ICO={};if(ICO[sub])return ICO[sub];
  const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(norm);
  let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let s=0;s<sub;s++){const cache=new Map(),mid=(a,b)=>{const k=a<b?a*100000+b:b*100000+a;if(cache.has(k))return cache.get(k);V.push(norm([V[a][0]+V[b][0],V[a][1]+V[b][1],V[a][2]+V[b][2]]));cache.set(k,V.length-1);return V.length-1;};
    const nf=[];for(const f of F){const a=mid(f[0],f[1]),b=mid(f[1],f[2]),c=mid(f[2],f[0]);nf.push([f[0],a,c],[f[1],b,a],[f[2],c,b],[a,b,c]);}F=nf;}
  return ICO[sub]={V,F};}
function blob(g,sub,fn){const s=ico(sub),base=g.n;for(const p of s.V){const o=fn(p);g.vert(o.p,o.c,o.a?o.a[0]:0,o.a?o.a[1]:0);}for(const f of s.F)g.tri(base+f[0],base+f[1],base+f[2]);return g;}

/* ── 靜態模型 ── */
function mRock(seed){const g=new Geo();blob(g,2,p=>{const r=1+(vnoise3(p[0]*1.4+seed,p[1]*1.4,p[2]*1.4,seed)-.5)*.75+(vnoise3(p[0]*3.3,p[1]*3.3+seed,p[2]*3.3,seed+1)-.5)*.28;
    const y=p[1]*r*.72,k=.62+.38*sstep(-.7,.6,p[1]),al=sstep(.2,.9,p[1])*.45;
    return{p:[p[0]*r,y,p[2]*r],c:[mix(.50,.36,al)*k,mix(.47,.46,al)*k,mix(.43,.30,al)*k]};});return g.normals();}
function mDome(seed){const g=new Geo();blob(g,2,p=>{const r=1+(vnoise3(p[0]*2.2+seed,p[1]*2.2,p[2]*2.2,seed)-.5)*.22;const y=p[1]>0?p[1]*.78:p[1]*.3;const k=.55+.55*sstep(-.3,.9,p[1]);
    return{p:[p[0]*r,y*r,p[2]*r],c:[k,k,k]};});return g.normals();}
function mBranch(seed,o){const g=new Geo(),r=mulberry(seed);
  const col=t=>{const k=.5+.85*t;return[k,k,k*.96];};
  const rec=(p,d,len,rad,lvl)=>{const bx=(r()-.5)*o.bend,by=(r()-.5)*o.bend*.3,bz=(r()-.5)*o.bend;
    const mid=[p[0]+d[0]*len*.5+bx*len*.25,p[1]+d[1]*len*.5+by*len*.25,p[2]+d[2]*len*.5+bz*len*.25],end=[p[0]+d[0]*len+bx*len*.4,p[1]+d[1]*len+by*len*.4,p[2]+d[2]*len+bz*len*.4];
    const last=lvl>=o.depth,tr=last?rad*.5:rad*.72,t0=lvl/(o.depth+1),t1=(lvl+1)/(o.depth+1);
    g.tube([p,mid,end],[rad,(rad+tr)/2,tr],o.sides,t=>col(mix(t0,t1,t)),null,last);
    if(!last){const n=2+(r()<o.extra?1:0);for(let c=0;c<n;c++){const nd=norm([d[0]+(r()-.5)*o.spread,d[1]+(r()-.5)*o.spread*.6+o.up,d[2]+(r()-.5)*o.spread]);rec(end,nd,len*(.62+r()*.2),tr*.95,lvl+1);}}};
  for(let i=0;i<o.trunks;i++)rec([(r()-.5)*.2,-.05,(r()-.5)*.2],norm([(r()-.5)*o.lean,1,(r()-.5)*o.lean]),o.len,o.rad,0);
  return g.normals();}
function mTable(){const g=new Geo(),pr=[[.02,-.1],[.2,0],[.14,.25],[.16,.45],[.5,.58],[.9,.62],[1.02,.66],[1.0,.72],[.6,.70],[.02,.67]];
  g.lathe(pr,14,(t,k)=>{const c=k<4?.5:k>=6?1.15:.8;return[c,c,c];});
  for(let i=0;i<g.n;i++){const o=i*11,x=g.v[o],z=g.v[o+2],rr=Math.hypot(x,z);if(rr>.3){const w=1+(vnoise3(x*2.5,0,z*2.5,5)-.5)*.3;g.v[o]*=w;g.v[o+2]*=w;g.v[o+1]+=(vnoise3(x*3,1,z*3,6)-.5)*.07;}}
  return g.normals();}
function mSponge(seed){const g=new Geo(),r=mulberry(seed),n=5;
  for(let i=0;i<n;i++){const a=i/n*TAU+r(),d=i===0?0:.16+r()*.14,h=.55+r()*.75,rad=.09+r()*.06,lx=Math.cos(a)*.25*(i?1:0),lz=Math.sin(a)*.25*(i?1:0),bx=Math.cos(a)*d,bz=Math.sin(a)*d;
    const path=[],rr=[];for(let k=0;k<=5;k++){const t=k/5;path.push([bx+lx*h*t*t,h*t-.04,bz+lz*h*t*t]);rr.push(rad*(.75+.55*Math.sin(t*2.2)));}
    g.tube(path,rr,8,(t,k)=>{const c=.55+.6*(k/5);return[c,c,c];},null,false);
    const e=path[5],q=path[4],er=rr[5],L=(t)=>[e[0]+(q[0]-e[0])*t,e[1]+(q[1]-e[1])*t,e[2]+(q[2]-e[2])*t];g.tube([L(0),L(.3),L(1.2)],[er,er*.7,er*.35],8,(t,k)=>{const c=k===0?1.1:.14;return[c,c,c];},null,true);}
  return g.normals();}
function mFan(seed){const g=new Geo(),r=mulberry(seed);
  const rec=(p,ang,len,w,lvl)=>{const e=[p[0]+Math.sin(ang)*len,p[1]+Math.cos(ang)*len,p[2]+(r()-.5)*.03];const s=[Math.cos(ang),-Math.sin(ang),0],k=.6+.12*lvl;
    g.strip([p,e],[w,w*.7],s,()=>[k,k,k],(t,q)=>[q[1]*.05,q[1]*.6]);
    if(lvl<5){const n=lvl<2?3:2;for(let c=0;c<n;c++)rec(e,ang+(c-(n-1)/2)*(.55+r()*.25)+(r()-.5)*.25,len*(.66+r()*.16),w*.7,lvl+1);}};
  rec([0,-.05,0],0,.34,.06,0);return g.normals();}
function mAnemone(seed){const g=new Geo(),r=mulberry(seed);
  g.lathe([[.02,-.05],[.3,-.05],[.26,.12],[.3,.2],[.02,.22]],10,(t,k)=>{const c=.45+.2*k/4;return[c,c*.8,c*.75];});
  for(let i=0;i<34;i++){const a=r()*TAU,d=Math.sqrt(r())*.27,len=.3+r()*.22,ox=Math.cos(a),oz=Math.sin(a),bx=ox*d,bz=oz*d,out=.25+d*1.6;
    const path=[],rr=[];for(let k=0;k<=3;k++){const t=k/3;path.push([bx+ox*out*len*t*t,.2+len*t,bz+oz*out*len*t*t]);rr.push(k===3?.03:.022);}
    g.tube(path,rr,4,t=>{const c=.7+.6*t;return[c,c,c];},(t)=>[t*t*.25+.02,a],true);}
  return g.normals();}
function mStar(){const g=new Geo(),c=g.vert([0,.17,0],[1.1,1.1,1.1]),ring=[];
  for(let i=0;i<10;i++){const a=i/10*TAU,rad=i%2?.36:1;ring.push(g.vert([Math.cos(a)*rad,i%2?.06:.01,Math.sin(a)*rad],i%2?[.9,.9,.9]:[.7,.7,.7]));}
  for(let i=0;i<10;i++)g.tri(c,ring[(i+1)%10],ring[i]);return g.normals();}
function mColumn(broken){const g=new Geo(),H=broken?1.6+broken:5.4;
  const pr=[[.66,0],[.66,.22],[.52,.3],[.44,.42],[.38,H-.5]];
  if(!broken)pr.push([.42,H-.42],[.56,H-.3],[.6,H-.12],[.6,H],[.02,H]);else pr.push([.38,H],[.02,H-.15]);
  g.lathe(pr,12,(t,k)=>{const c=.78+.22*((k*7)%3)/2;return[c,c,c*.97];});
  if(broken)for(let i=0;i<g.n;i++){const o=i*11;if(g.v[o+1]>H-.6)g.v[o+1]+=(vnoise3(g.v[o]*3,0,g.v[o+2]*3,9)-.5)*.7;}
  return g.normals();}
function mBox(){return new Geo().box([0,0,0],[.5,.5,.5],[1,1,1]).normals();}
function mDisc(){return new Geo().lathe([[.02,1],[1,1],[1,0],[.02,0]],28,()=>[1,1,1]).normals();}
function mWreck(){const g=new Geo(),r=mulberry(77),L=26,W=3.7,D=4.3,K=18,J=10,ring=[];
  const sec=t=>{const w=W*Math.pow(Math.max(0,1-Math.pow(Math.abs(t-.42)/.58,2.3)),.62)*(t<.06?.55+t*7.5:1),d=D*(.72+.28*Math.sin(Math.PI*t)),top=1.1*(2*t-1)*(2*t-1);return{w:Math.max(w,.06),d,top};};
  for(let k=0;k<=K;k++){const t=k/K,z=-L/2+L*t,s=sec(t),row=[];
    for(let j=0;j<=J;j++){const th=Math.PI*j/J,x=-s.w*Math.cos(th),y=s.top-s.d*Math.pow(Math.sin(th),.8),kk=.55+.5*(1-Math.sin(th))+(((k+j)%2)?.06:0);
      row.push(g.vert([x,y,z],[.30*kk,.22*kk,.15*kk]));}
    ring.push(row);}
  for(let k=0;k<K;k++)for(let j=0;j<J;j++){if((k>=6&&k<=9&&j>=1&&j<=3)&&!(k===6&&j===3)&&!(k===9&&j===1))continue;if(k===13&&j===7)continue;g.quad(ring[k][j],ring[k+1][j],ring[k+1][j+1],ring[k][j+1]);}
  for(let k=1;k<K-1;k++){if(k===7||k===8||k===12)continue;const t0=k/K,t1=(k+1)/K,s0=sec(t0),s1=sec(t1),z0=-L/2+L*t0,z1=-L/2+L*t1,c=[.34+.05*(k%2),.26,.17];
    const a=g.vert([-s0.w*.93,s0.top-.45,z0],c),b=g.vert([s0.w*.93,s0.top-.45,z0],c),cc=g.vert([s1.w*.93,s1.top-.45,z1],c),d=g.vert([-s1.w*.93,s1.top-.45,z1],c);g.quad(a,b,cc,d);}
  const wood=t=>[.30-.08*t,.23-.06*t,.15-.04*t];
  g.tube([[0,-1,2.5],[0,5,2.6],[.1,13,2.9]],[.24,.2,.12],7,wood,null,true);
  g.tube([[-3.4,9.2,2.8],[0,9.6,2.75],[3.4,9.2,2.8]],[.07,.1,.07],5,wood,null,true);
  g.tube([[0,-1,-5.5],[0,3.2,-5.6],[.9,5.2,-5.9]],[.22,.19,.16],7,wood,null,true);
  g.tube([[0,.9,L/2-1.2],[0,2.2,L/2+3.2]],[.13,.06],5,wood,null,true);
  for(let k=3;k<K-1;k+=2){const t=k/K,s=sec(t),z=-L/2+L*t,pts=[],rr=[];for(let j=0;j<=6;j++){const th=Math.PI*j/6;pts.push([-s.w*.97*Math.cos(th),s.top+.25-s.d*.97*Math.pow(Math.sin(th),.8),z]);rr.push(.07);}
    g.tube(pts,rr,4,()=>[.22,.17,.12],null,false);}
  return g.normals();}
function mJelly(){const g=new Geo();
  g.lathe([[.01,.5],[.2,.48],[.37,.38],[.47,.2],[.5,0],[.45,-.06],[.34,.08],[.01,.2]],16,(t,k)=>{const c=k<5?1:.7;return[c,c,c];},(t,k)=>[[0,.25,.55,.85,1,1,.7,0][k],0]);
  for(let i=0;i<12;i++){const a=i/12*TAU,x=Math.cos(a)*.44,z=Math.sin(a)*.44,len=1.6+((i*7)%5)*.3,pts=[],ws=[];
    for(let k=0;k<=8;k++){const t=k/8;pts.push([x*(1-.25*t),-.03-len*t,z*(1-.25*t)]);ws.push(.035*(1-.6*t));}
    g.strip(pts,ws,[-Math.sin(a),0,Math.cos(a)],t=>[.9-.3*t,.9-.3*t,.9-.3*t],(t)=>[1-t,t*1.0]);}
  for(let i=0;i<4;i++){const a=i/4*TAU+.4,x=Math.cos(a)*.1,z=Math.sin(a)*.1,pts=[],ws=[];
    for(let k=0;k<=6;k++){const t=k/6;pts.push([x*(1+t),.15-1.25*t,z*(1+t)]);ws.push(.13*(1-.5*t)+.03*Math.sin(k*2.3));}
    g.strip(pts,ws,[-Math.sin(a),0,Math.cos(a)],t=>[1.15,1.15,1.15],(t)=>[.3,t*.7]);}
  return g.normals();}

/* ── 會游的生物模型（+z 為前方） ── */
function mFish(o){const g=new Geo(),K=11,S=8,z0=.5,z1=-.38;
  const pH=t=>{const s=Math.pow(Math.sin(Math.PI*Math.pow(t,o.pk||.62)),.8);return .11*t+.89*s;},pW=t=>{const s=Math.pow(Math.sin(Math.PI*Math.pow(t,.5)),.7);return .10*t+.90*s;};
  const flex=z=>Math.pow(clamp((.32-z)/.9,0,1),1.6),ax=z=>o.vertical?[0,flex(z)]:[flex(z),0],zt=t=>z0+(z1-z0)*t,rows=[];
  for(let k=0;k<=K;k++){const t=k/K,z=zt(t),hh=o.H*pH(t),hw=o.W*pW(t),row=[],a=ax(z);
    for(let j=0;j<S;j++){const an=j/S*TAU,sn=Math.sin(an);row.push(g.vert([hw*Math.cos(an),hh*sn,z],[.62+.38*sstep(.9,-.3,sn),sstep(-.1,-.85,sn)*o.belly,0],a[0],a[1]));}rows.push(row);}
  for(let k=0;k<K;k++)for(let j=0;j<S;j++)g.quad(rows[k][j],rows[k][(j+1)%S],rows[k+1][(j+1)%S],rows[k+1][j]);
  const fin=(p,sh)=>{const a=ax(p[2]);return g.vert(p,[sh||.9,0,1],a[0]*1.1,a[1]*1.1);};
  const ph=o.H*.11,T=o.fluke?(x,z)=>[x,0,z]:(y,z)=>[0,y,z];
  {const a=fin(T(ph,z1+.03)),b=fin(T(-ph,z1+.03)),tt=fin(T(o.tailT,z1-o.tailL)),tb=fin(T(-o.tailB,z1-o.tailL*(o.tailBL||1))),nt=fin(T(0,z1-o.tailL*o.notch));g.tri(a,tt,nt);g.tri(a,nt,b);g.tri(b,nt,tb);}
  const edge=(sign,t0,t1,h,sweep,tri)=>{const n=5;let pb=null,pt=null;for(let m=0;m<=n;m++){const s=m/n,t=mix(t0,t1,s),z=zt(t),yb=o.H*pH(t)*.92*sign;
      const sh=tri?(s<.3?s/.3:1-(s-.3)/.7):Math.sin(Math.PI*Math.min(1,s*1.15))*(1-.25*s);const b=fin([0,yb,z],.85),tp=fin([0,yb+sign*h*Math.max(sh,.02),z-sweep*sh],.75);
      if(pb!==null)g.quad(pb,pt,tp,b);pb=b;pt=tp;}};
  if(o.dH)edge(1,o.d0,o.d1,o.dH,o.dSweep||.04,o.dTri);
  if(o.aH)edge(-1,o.a0||.5,o.a1||.8,o.aH,.03,false);
  if(o.pL)for(const sd of[-1,1]){const zp=o.pz!==undefined?o.pz:.14,hw=o.W*pW((z0-zp)/(z0-z1))*.9,y=-o.H*.28;
    const a=fin([sd*hw,y,zp],.8),b=fin([sd*(hw+o.pL*.82),y-o.pL*o.pDrop,zp-o.pL*.62],.7),c=fin([sd*hw,y-.01,zp-o.pW],.8);
    if(o.vertical){g.v[b*11+10]=.5;}g.tri(a,b,c);}
  return g.normals();}
function mManta(){const g=new Geo(),K=18,rows=[];
  for(let k=0;k<=K;k++){const s=-1+2*k/K,as=Math.abs(s),ch=.62*Math.pow(1-Math.pow(as,1.5),.9)+.015,le=.32-.42*Math.pow(as,1.6),te=le-ch,th=.085*Math.pow(1-as,1.4)+.004,fw=Math.pow(as,1.7),row=[];
    const P6=[[le,0],[le-ch*.25,th],[le-ch*.7,th*.5],[te,0],[le-ch*.7,-th*.45],[le-ch*.25,-th*.8]];
    for(let j=0;j<6;j++){const top=j===1||j===2,bot=j>=4;row.push(g.vert([s,P6[j][1],P6[j][0]],[top?.34:bot?1:.6,bot?.9:top?0:.3,0],0,fw));}rows.push(row);}
  for(let k=0;k<K;k++)for(let j=0;j<6;j++)g.quad(rows[k][j],rows[k][(j+1)%6],rows[k+1][(j+1)%6],rows[k+1][j]);
  for(const sd of[-1,1])g.tube([[sd*.1,0,.3],[sd*.13,-.02,.42],[sd*.1,-.03,.5]],[.035,.03,.012],5,()=>[.4,0,0],null,true);
  g.tube([[0,0,-.3],[0,0,-.8],[0,-.02,-1.35]],[.022,.012,.004],4,()=>[.3,0,0],(t)=>[t*.6,0],true);
  return g.normals();}
function mTurtle(){const g=new Geo();
  blob(g,2,p=>{const y=p[1]>0?p[1]*.2:p[1]*.07,top=p[1]>0;return{p:[p[0]*.4,y,p[2]*.5],c:[top?.55+.4*vnoise3(p[0]*4,p[1]*4,p[2]*4,3):.95,top?0:.55,0]};});
  blob(g,1,p=>({p:[p[0]*.095,p[1]*.085+.01,p[2]*.13+.6],c:[.85,.25,0]}));
  g.tube([[0,0,.42],[0,.01,.52]],[.07,.065],6,()=>[.8,.25,0],null,false);
  const fl=(pts,w,fw)=>{g.strip(pts,w,[0,0,1],()=>[.75,.2,0],(t)=>[0,t*t*fw]);};
  for(const sd of[-1,1]){fl([[sd*.3,0,.28],[sd*.62,0,.22],[sd*.95,0,-.02]],[.2,.22,.06],1);fl([[sd*.26,0,-.38],[sd*.44,0,-.56]],[.16,.08],.25);}
  return g.normals();}

