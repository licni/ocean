/* ── 第二版新增模型：巨岩、拱門、桶狀海綿、海膽、硨磲 ── */
const ROCKSUB=lite?3:4;
function boulderFn(seed){return p=>{const n1=vnoise3(p[0]*1.1+seed*7,p[1]*1.1,p[2]*1.1,seed),n2=vnoise3(p[0]*2.4,p[1]*2.4+seed*3,p[2]*2.4,seed+1),n3=vnoise3(p[0]*5.2,p[1]*5.2,p[2]*5.2+seed,seed+2),n4=vnoise3(p[0]*11,p[1]*11,p[2]*11,seed+3);
  const r=1+(n1-.5)*.72+(1-Math.abs(2*n2-1)-.5)*.46+(1-Math.abs(2*n3-1)-.5)*.22+(n4-.5)*.10;return[p[0]*r,p[1]*r,p[2]*r];};}
const BFN=[boulderFn(1),boulderFn(2),boulderFn(3),boulderFn(4)];
function mBoulder(k,sub){const g=new Geo(),f=BFN[k];blob(g,sub,p=>({p:f(p),c:[1,1,1]}));return g.normals();}
function mArch(seed,segs,sides){const g=new Geo(),pts=[],rr=[];
  for(let i=0;i<=segs;i++){const a=-.32+(Math.PI+.64)*i/segs,wob=1+.06*Math.sin(i*.5+seed);pts.push([Math.cos(a)*wob,Math.sin(a)*wob,.08*Math.sin(i*.37+seed*2)]);rr.push(.17+.10*vnoise3(i*.33,seed,0,seed)+.04*Math.sin(i*.9+seed));}
  g.tube(pts,rr,sides,()=>[1,1,1],null,false);
  for(let i=0;i<g.n;i++){const o=i*11,x=g.v[o],y=g.v[o+1],z=g.v[o+2];g.v[o]+=(vnoise3(x*4,y*4,z*4,seed)-.5)*.11;g.v[o+1]+=(vnoise3(x*4+9,y*4,z*4,seed)-.5)*.11;g.v[o+2]+=(vnoise3(x*4,y*4+9,z*4,seed)-.5)*.17;}
  return g.normals();}
function mBarrel(){const g=new Geo();
  g.lathe([[.26,-.05],[.43,.15],[.5,.5],[.47,.85],[.40,1.0],[.33,1.02],[.27,.9],[.22,.5],[.02,.3]],18,(t,k)=>{const c=k>=5?(k>=7?.16:.5):.7+.4*k/5;return[c,c,c];});
  for(let i=0;i<g.n;i++){const o=i*11,x=g.v[o],z=g.v[o+2],a=Math.atan2(z,x),w=1+.07*Math.sin(a*9)+.08*(vnoise3(x*3,g.v[o+1]*3,z*3,4)-.5);g.v[o]*=w;g.v[o+2]*=w;}
  return g.normals();}
function mUrchin(){const g=new Geo(),r=mulberry(5);blob(g,1,p=>({p:[p[0]*.2,p[1]*.17,p[2]*.2],c:[.5,.5,.5]}));
  const dirs=ico(1).V.filter(v=>v[1]>-.45).concat(Array.from({length:22},()=>norm([r()*2-1,r()*1.2-.1,r()*2-1])));
  for(const d of dirs){const L=.45+r()*.35;g.tube([[d[0]*.15,d[1]*.13,d[2]*.15],[d[0]*L,d[1]*L,d[2]*L]],[.02,.003],3,t=>[.7+.7*t,.7+.7*t,.7+.7*t],null,false);}
  return g.normals();}
function mClam(){const g=new Geo();blob(g,2,p=>{const up=sstep(.05,.7,p[1]),wav=1+.11*Math.sin(p[0]*8.5)*up,slit=Math.exp(-(p[2]*p[2])/.035)*up;
  return{p:[p[0],p[1]*.62*wav-slit*.26,p[2]*.72*(1+.08*Math.sin(p[0]*8.5)*up)],c:[mix(.74,.10,slit),mix(.70,.85,slit),mix(.62,1.5,slit)]};});return g.normals();}
