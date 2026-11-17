/* ───────── 世界設定：一塊 320 m 見方、可無限重複的海床，水面在 y=0 ───────── */
const P=320,GN=320,CELL=P/GN,CH=4,CHS=P/CH,CELLS_PER_CH=GN/CH;
const SUN=norm([0.36,0.88,0.26]);
const wrapD=d=>d-P*Math.round(d/P);
const wrapP=x=>((x%P)+P)%P;
const gauss=(x,z,cx,cz,r)=>{const dx=wrapD(x-cx),dz=wrapD(z-cz);return Math.exp(-(dx*dx+dz*dz)/(r*r));};
const distW=(x,z,cx,cz)=>Math.hypot(wrapD(x-cx),wrapD(z-cz));
const REEFS=[[90,100,46],[232,212,42],[252,58,28],[22,300,24]];
const BASINS=[[58,236,58,1],[188,28,38,1],[300,150,30,.9],[150,190,26,.8],[20,60,34,.9]];
const MESAS=[[162,240,20,19],[26,150,16,16],[280,126,17,21],[138,6,14,14]];
const RUIN=[128,58],WRECK=[204,112],JELLY=[58,168];
const SPAWN=[52,217];
const TOUR=[[118,74],[128,44],[100,92],[78,122],[62,168],[50,214],[70,250],[112,266],[134,212],[188,204],[226,214],[246,176],[236,138],[210,120],[236,86],[252,60],[214,40],[188,28],[158,46]];
const reefG=(x,z)=>{let m=0;for(const r of REEFS)m=Math.max(m,gauss(x,z,r[0],r[1],r[2]));return m;};
const zoneP=(x,z)=>Math.max(gauss(x,z,232,212,58),gauss(x,z,252,58,44),gauss(x,z,300,150,40),gauss(x,z,20,60,30)*.8);
const canyonZ=x=>160+34*Math.sin(TAU*x/P);
const canyon=(x,z)=>{const d=wrapD(z-canyonZ(x));return Math.exp(-(d*d)/169);};
const nA=tileNoise(3,11),nB=tileNoise(7,12),nC=tileNoise(17,13),nD=tileNoise(43,14),nE=tileNoise(53,15),nF=tileNoise(5,16),nG=tileNoise(6,17),nCl=tileNoise(37,18),nCl2=tileNoise(23,19),nK=tileNoise(9,20);
function mesaAt(x,z){let m=0;const u=x/P,v=z/P;for(const s of MESAS){const d=distW(x,z,s[0],s[1])+(nB(u+.3,v+.7)-.5)*s[2]*.55+(nC(u,v)-.5)*3;m=Math.max(m,s[3]*sstep(s[2],s[2]*.74,d));}return m;}
function heightRaw(x,z){const u=x/P,v=z/P;
  let h=-43+(nA(u,v)-.5)*9+(nB(u,v)-.5)*4.5+(nC(u,v)-.5)*1.8+(nD(u,v)-.5)*.5;
  const rg=reefG(x,z);h+=sstep(.12,.8,rg)*17+sstep(.2,.7,rg)*(nE(u,v)-.35)*1.8;
  h+=mesaAt(x,z)*(.9+.2*nC(u+.5,v+.5));
  h-=canyon(x,z)*(12+6*nF(u,v));
  h=mix(h,-27.5,sstep(27,13,distW(x,z,RUIN[0],RUIN[1])));
  return clamp(h,-61,-6);}
const HF=new Float32Array(GN*GN);
for(let j=0;j<GN;j++)for(let i=0;i<GN;i++)HF[j*GN+i]=heightRaw(i*CELL,j*CELL);
function heightAt(x,z){const fx=wrapP(x)/CELL,fz=wrapP(z)/CELL;const xi=Math.floor(fx)%GN,zi=Math.floor(fz)%GN,tx=fx-Math.floor(fx),tz=fz-Math.floor(fz),x1=(xi+1)%GN,z1=(zi+1)%GN;
  const a=HF[zi*GN+xi],b=HF[zi*GN+x1],c=HF[z1*GN+xi],d=HF[z1*GN+x1];return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz;}
function normalAt(x,z){const e=1.2;return norm([heightAt(x-e,z)-heightAt(x+e,z),2*e,heightAt(x,z-e)-heightAt(x,z+e)]);}
const reefM=(x,z)=>sstep(.3,.72,reefG(x,z)+(nB(x/P,z/P)-.5)*.5);
const tourPts=[];for(let i=0;i<TOUR.length;i++){const a=TOUR[i],b=TOUR[(i+1)%TOUR.length],dx=wrapD(b[0]-a[0]),dz=wrapD(b[1]-a[1]),n=Math.ceil(Math.hypot(dx,dz)/3);for(let k=0;k<n;k++)tourPts.push([wrapP(a[0]+dx*k/n),wrapP(a[1]+dz*k/n)]);}
const nearTour=(x,z,r)=>{for(const p of tourPts)if(Math.abs(wrapD(x-p[0]))<r&&Math.abs(wrapD(z-p[1]))<r&&distW(x,z,p[0],p[1])<r)return true;return false;};
function kelpDens(x,z){if(distW(x,z,RUIN[0],RUIN[1])<16||distW(x,z,WRECK[0],WRECK[1])<12||distW(x,z,SPAWN[0],SPAWN[1])<4.5)return 0;
  let d=sstep(.56,.70,nK(x/P,z/P))*.45;for(const b of BASINS)d=Math.max(d,b[3]*sstep(b[2],b[2]*.7,distW(x,z,b[0],b[1])));
  return d*(1-.85*sstep(.25,.6,canyon(x,z)));}
