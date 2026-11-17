/* ───────── 基本數學 ───────── */
const TAU=Math.PI*2;const T0=performance.now(),TM=[];const mark=n=>TM.push(n+':'+Math.round(performance.now()-T0));
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const mix=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const qAxis=(ax,an)=>{const s=Math.sin(an/2);return[ax[0]*s,ax[1]*s,ax[2]*s,Math.cos(an/2)];};
const qMul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qYaw=a=>[0,Math.sin(a/2),0,Math.cos(a/2)];
function qUpTo(n,k){const ax=[n[2],0,-n[0]],l=Math.hypot(ax[0],ax[2]);if(l<1e-5)return[0,0,0,1];return qAxis([ax[0]/l,0,ax[2]/l],Math.acos(clamp(n[1],-1,1))*k);}
function hash3(x,y,z,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1440662683)^Math.imul(s,1274126177);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function vnoise3(x,y,z,s){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);let fx=x-xi,fy=y-yi,fz=z-zi;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
  const h=(a,b,c)=>hash3(xi+a,yi+b,zi+c,s);
  return mix(mix(mix(h(0,0,0),h(1,0,0),fx),mix(h(0,1,0),h(1,1,0),fx),fy),mix(mix(h(0,0,1),h(1,0,1),fx),mix(h(0,1,1),h(1,1,1),fx),fy),fz);}
function tileNoise(period,seed){const r=mulberry(seed),g=new Float32Array(period*period);for(let i=0;i<g.length;i++)g[i]=r();
  return function(u,v){const x=u*period,y=v*period;let xi=Math.floor(x),yi=Math.floor(y);let fx=x-xi,fy=y-yi;xi=((xi%period)+period)%period;yi=((yi%period)+period)%period;
    const x1=(xi+1)%period,y1=(yi+1)%period;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const a=g[yi*period+xi],b=g[yi*period+x1],c=g[y1*period+xi],d=g[y1*period+x1];return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;};}

