/* ───────── 世界設定：320 m 見方、可無限重複；水面 y=0；岩石由顯示卡雕刻的密度場決定 ───────── */
const P=320,NX=320,NY=64,NZ=320,Y0=-66,CH=8,CHS=P/CH,NCH=CH*CH;
const SUN=norm([0.36,0.88,0.26]);
const wrapD=d=>d-P*Math.round(d/P);
const wrapP=x=>((x%P)+P)%P;
const gauss=(x,z,cx,cz,r)=>{const dx=wrapD(x-cx),dz=wrapD(z-cz);return Math.exp(-(dx*dx+dz*dz)/(r*r));};
const distW=(x,z,cx,cz)=>Math.hypot(wrapD(x-cx),wrapD(z-cz));
const REEFS=[[90,100,46],[232,212,42],[252,58,28],[22,300,24]];
const BASINS=[[58,236,58,1],[188,28,38,1],[300,150,30,.9],[150,190,26,.8],[20,60,34,.9]];
const MESAS=[[162,240,22,22],[26,150,18,19],[280,126,19,24],[138,6,16,17],[104,176,13,15]];
const RUIN=[128,58],WRECK=[204,112],JELLY=[58,168];
const SPAWN=[52,217];
const TOUR=[[118,74],[128,44],[100,92],[78,122],[62,168],[50,214],[70,250],[112,266],[150,244],[188,214],[226,214],[246,176],[262,134],[232,112],[236,86],[252,60],[214,40],[188,28],[158,46]];
const SPIRES=[[38,222,5.5,26],[84,264,5,22],[70,204,4.6,28],[174,16,5,24],[206,42,4.6,20],[302,162,5,24],[148,198,4.6,22],[16,46,5,24],[288,238,5,20],[112,150,4.2,16],[200,176,4.5,18],[60,30,5,22]];
const ARCHES=[[89,107,12,-.63],[60,232,14,.51],[241,157,12,.25],[176,44,11,1.2],[150,167,14,Math.PI/2],[284,206,10,2.2],[30,110,9,.9],[112,266,11,1.2]];
const reefG=(x,z)=>{let m=0;for(const r of REEFS)m=Math.max(m,gauss(x,z,r[0],r[1],r[2]));return m;};
const zoneP=(x,z)=>Math.max(gauss(x,z,232,212,58),gauss(x,z,252,58,44),gauss(x,z,300,150,40),gauss(x,z,20,60,30)*.8,gauss(x,z,162,240,30));
const canyonZ=x=>160+34*Math.sin(TAU*x/P);
const canyon=(x,z)=>{const d=wrapD(z-canyonZ(x));return Math.exp(-(d*d)/169);};
const nA=tileNoise(3,11),nB=tileNoise(7,12),nC=tileNoise(17,13),nD=tileNoise(43,14),nE=tileNoise(53,15),nF=tileNoise(5,16),nG=tileNoise(6,17),nCl=tileNoise(37,18),nCl2=tileNoise(23,19),nK=tileNoise(9,20);
function mesaAt(x,z){let m=0;const u=x/P,v=z/P;for(const s of MESAS){const d=distW(x,z,s[0],s[1])+(nB(u+.3,v+.7)-.5)*s[2]*.55+(nC(u,v)-.5)*3;m=Math.max(m,s[3]*sstep(s[2],s[2]*.74,d));}return m;}
// 基礎沙地高度（不含岩台），岩台另外給顯示卡當作雕刻的材料
function baseH(x,z){const u=x/P,v=z/P;
  let h=-43+(nA(u,v)-.5)*9+(nB(u,v)-.5)*4.5+(nC(u,v)-.5)*1.8+(nD(u,v)-.5)*.5;
  const rg=reefG(x,z);h+=sstep(.12,.8,rg)*17+sstep(.2,.7,rg)*(nE(u,v)-.35)*1.8;
  h-=canyon(x,z)*(12+6*nF(u,v));
  h=mix(h,-27.5,sstep(27,13,distW(x,z,RUIN[0],RUIN[1])));
  return clamp(h,-61,-6);}
const reefM=(x,z)=>sstep(.3,.72,reefG(x,z)+(nB(x/P,z/P)-.5)*.5);
// 巡航路線：通過各景點的封閉曲線，雕刻地形時會沿著它挖出可通行的通道（穿過岩台就成了隧道）
const TW=TOUR.map(w=>[w[0],baseH(w[0],w[1])+5,w[1]]);
const tourPts=[];(function(){const n=TW.length,cr=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for(let i=0;i<n;i++){const p0=TW[(i+n-1)%n],p1=TW[i],p2=TW[(i+1)%n],p3=TW[(i+2)%n];
    const ux=k=>p1[0]+wrapD(k[0]-p1[0]),uz=k=>p1[2]+wrapD(k[2]-p1[2]);
    const len=Math.hypot(wrapD(p2[0]-p1[0]),wrapD(p2[2]-p1[2])),m=Math.max(2,Math.ceil(len/1.5));
    for(let k=0;k<m;k++){const t=k/m;tourPts.push([cr(ux(p0),p1[0],ux(p2),ux(p3),t),cr(p0[1],p1[1],p2[1],p3[1],t),cr(uz(p0),p1[2],uz(p2),uz(p3),t)]);}}})();
const tourLen=tourPts.length;
const nearTour=(x,z,r)=>{for(let i=0;i<tourLen;i+=2){const p=tourPts[i];if(Math.abs(wrapD(x-p[0]))<r&&Math.abs(wrapD(z-p[2]))<r&&distW(x,z,p[0],p[2])<r)return true;}return false;};
// 紫色區的程度（給水色與光線的色調用）
const zoneK=(x,z)=>Math.pow(zoneP(x,z),1.3);
// 不長海藻的區域（各視點的視線與場地）：線段 [ax,az,bx,bz,半徑]
const KCLEAR=[
  [44,212,74,254,5.5],          // 視點 1：從出生點穿過岩拱的視線
  [70,262,70,262,3.2]];         // 視點 2：海藻環中央的空地（仰望用）
function segD(x,z,s){const ax=wrapD(x-s[0]),az=wrapD(z-s[1]),bx=s[2]-s[0],bz=s[3]-s[1],t=clamp((ax*bx+az*bz)/(bx*bx+bz*bz||1),0,1);return Math.hypot(ax-bx*t,az-bz*t);}
// 海藻長成一叢一叢，叢與叢之間留出通道，視線才透得過去、光也照得進來
function kelpDens(x,z){if(distW(x,z,RUIN[0],RUIN[1])<16||distW(x,z,WRECK[0],WRECK[1])<12||distW(x,z,SPAWN[0],SPAWN[1])<4.5)return 0;
  for(const s of KCLEAR)if(segD(x,z,s)<s[4])return 0;
  const grove=sstep(.45,.60,nCl2(x/P,z/P));
  let d=sstep(.56,.70,nK(x/P,z/P))*.45*grove;for(const b of BASINS)d=Math.max(d,b[3]*sstep(b[2],b[2]*.7,distW(x,z,b[0],b[1]))*(.06+.94*grove));
  return d*(1-.85*sstep(.25,.6,canyon(x,z)));}
mark('world');
