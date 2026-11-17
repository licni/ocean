/* ───────── 地形：在顯示卡上用運算著色器雕刻密度場（岩台、懸岩、蟲洞般的洞穴、拱門、岩柱、漂浮巨石、岩堆），讀回後轉成網格 ───────── */
const NV=NX*NY*NZ;
const DG=new Int8Array(NV);                         // 密度（公尺×31，正值＝岩石），之後碰撞、擺放、魚群避障都查它
const HM=new Float32Array(NX*NZ*4);                 // r 基礎沙地高度、g 岩台加高、b 礁台、a 峽谷
for(let k=0;k<NZ;k++)for(let i=0;i<NX;i++){const o=(k*NX+i)*4;HM[o]=baseH(i,k);HM[o+1]=mesaAt(i,k);HM[o+2]=reefG(i,k);HM[o+3]=canyon(i,k);}
const FLOATERS=[];
{const r=mulberry(4242),R=(a,b)=>a+(b-a)*r();
  for(const c of[[160,166,-24],[60,236,-19],[236,206,-15],[110,60,-13],[282,40,-22],[40,96,-20],[200,250,-18]]){const n=5+(r()*3|0);for(let i=0;i<n&&FLOATERS.length<48;i++)FLOATERS.push([c[0]+R(-13,13),c[2]+R(-5,5),c[1]+R(-13,13),R(1.2,3.6)]);}}
await (async function sculpt(){
  const code=/*wgsl*/`
struct S { arch:array<vec4f,16>, pil:array<vec4f,16>, flo:array<vec4f,48>, cnt:vec4f };
@group(0) @binding(0) var<storage,read_write> Dn:array<f32>;
@group(0) @binding(1) var tH:texture_2d<f32>;
@group(0) @binding(2) var<uniform> U:S;
fn wr(d:f32)->f32{return d-320.*round(d/320.);}
fn h3(p:vec3i,per:i32)->f32{
  let q=vec3i(((p.x%per)+per)%per,p.y,((p.z%per)+per)%per);
  var n=u32(q.x)*374761393u+u32(q.y)*668265263u+u32(q.z)*1440662683u;n=(n^(n>>13u))*1274126177u;
  return f32((n^(n>>16u))&0xffffu)/65535.;}
fn vn(p:vec3f,per:i32)->f32{
  let i=vec3i(floor(p));let f=fract(p);let u=f*f*(3.-2.*f);
  let a=mix(mix(h3(i,per),h3(i+vec3i(1,0,0),per),u.x),mix(h3(i+vec3i(0,1,0),per),h3(i+vec3i(1,1,0),per),u.x),u.y);
  let b=mix(mix(h3(i+vec3i(0,0,1),per),h3(i+vec3i(1,0,1),per),u.x),mix(h3(i+vec3i(0,1,1),per),h3(i+vec3i(1,1,1),per),u.x),u.y);
  return mix(a,b,u.z);}
fn hm(xz:vec2f)->vec4f{
  let q=xz-floor(xz/320.)*320.;let i=vec2i(floor(q));let f=fract(q);
  let x0=i.x%320;let x1=(i.x+1)%320;let z0=i.y%320;let z1=(i.y+1)%320;
  return mix(mix(textureLoad(tH,vec2i(x0,z0),0),textureLoad(tH,vec2i(x1,z0),0),f.x),mix(textureLoad(tH,vec2i(x0,z1),0),textureLoad(tH,vec2i(x1,z1),0),f.x),f.y);}
fn h3v(p:vec3i,per:i32)->vec3f{return vec3f(h3(p,per),h3(p+vec3i(0,57,0),per),h3(p+vec3i(0,113,0),per));}
// 週期性的細胞雜訊：到最近與次近特徵點的距離（以格為單位）。最近距離小的地方鼓成一塊塊岩石，兩者相近的地方是塊與塊之間的裂隙
fn wor(p:vec3f,per:i32)->vec2f{
  let i=vec3i(floor(p));let f=fract(p);var d1=9.;var d2=9.;
  for(var z=-1;z<=1;z++){for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){
    let o=vec3i(x,y,z);let r=vec3f(o)+h3v(i+o,per)-f;let l=dot(r,r);
    if(l<d1){d2=d1;d1=l;}else if(l<d2){d2=l;}}}}
  return sqrt(vec2f(d1,d2));}
fn smax(a:f32,b:f32,k:f32)->f32{let h=clamp(.5+.5*(a-b)/k,0.,1.);return mix(b,a,h)+k*h*(1.-h);}
fn dens(p:vec3f)->f32{
  let m=hm(p.xz);
  let rk=clamp(max(m.g/7.,max(m.b*.5,m.a*.6)),0.,1.);
  let n1=vn(p*vec3f(.05,.085,.05),16);
  let n2=vn(p*vec3f(.125,.19,.125)+7.3,40);
  let n3=vn(p*vec3f(.3125,.4,.3125)+3.1,100);
  var d=m.r+m.g-p.y;
  // 層狀岩階：每層慢慢往外伸、到頂突然內縮，形成一道道岩簷
  let sw=fract(p.y*.21+n1*1.4+n2*.5);
  d+=((n1-.5)*8.5+(n2-.5)*3.2+(sw-ss2(.82,1.,sw)-.4)*1.5)*rk+(n3-.5)*1.2*max(rk,.12);
  // 岩堆：每 10 m 一格，在礁緣、峽谷邊、岩台腳下長出巨石
  let cell=floor(p.xz/10.);
  for(var dj=-1;dj<=1;dj++){for(var di=-1;di<=1;di++){
    let c=cell+vec2f(f32(di),f32(dj));let ci=vec2i(c);
    let r1=h3(vec3i(ci.x,7,ci.y),32);let r2=h3(vec3i(ci.x,13,ci.y),32);let r3=h3(vec3i(ci.x,29,ci.y),32);let r4=h3(vec3i(ci.x,41,ci.y),32);
    let ctr=(c+vec2f(.2+.6*r1,.2+.6*r2))*10.;let mm=hm(ctr);
    let zone=max(mm.b*(1.-mm.b)*3.4,max(mm.a*(1.-mm.a)*2.6,ss2(1.,5.,mm.g)*ss2(15.,7.,mm.g)))+.07;
    if(r3<zone){
      let rad=2.+3.4*r4;let cy=mm.r+mm.g+rad*.35;
      let dp=vec3f(wr(p.x-ctr.x),(p.y-cy)*1.15,wr(p.z-ctr.y));
      d=smax(d,rad*(1.+(n2-.5)*.9+(n3-.5)*.4)-length(dp),1.2);
      if(r4*7.3-floor(r4*7.3)<.5){let r5=rad*.62;let dp2=vec3f(wr(p.x-ctr.x-(r1-.5)*rad),(p.y-cy-rad*.95)*1.1,wr(p.z-ctr.y-(r2-.5)*rad));
        d=smax(d,r5*(1.+(n2-.5)*.9+(n3-.5)*.4)-length(dp2),1.);}
    }}}
  // 拱門：直立的圓環
  for(var i=0;i<i32(U.cnt.x);i++){let A=U.arch[2*i];let B=U.arch[2*i+1];
    let dp=vec3f(wr(p.x-A.x),p.y-A.y,wr(p.z-A.z));
    if(dot(dp,dp)<A.w*A.w*3.2){
      let qx=dp.x*B.x+dp.z*B.y;let qz=-dp.x*B.y+dp.z*B.x;let qy=dp.y/B.w;
      let td=length(vec2f(length(vec2f(qx,qy))-A.w,qz*.72));
      d=smax(d,A.w*B.z*(1.+(n1-.5)*.9+(n2-.5)*.55)-td,1.6);}}
  // 岩柱
  for(var i=0;i<i32(U.cnt.y);i++){let Pl=U.pil[i];let hd=length(vec2f(wr(p.x-Pl.x),wr(p.z-Pl.y)));
    if(hd<Pl.z*2.6){let base=hm(Pl.xy).r;let t=clamp((p.y-base)/Pl.w,0.,1.);
      let rr=Pl.z*(1.2-.62*t)*(1.+(n1-.5)*1.1+(n2-.5)*.55);
      d=smax(d,min(rr-hd,base+Pl.w-p.y),2.);}}
  // 岩台與礁台內部的蟲洞
  let cp=p*vec3f(.034375,.055,.034375);
  let ca=vn(cp+11.7,11)-.5;let cb=vn(cp+vec3f(31.4,17.2,5.9),11)-.5;
  let cm=clamp(ss2(4.,9.,m.g)+ss2(.8,.97,m.b)*.7,0.,1.);
  d=mix(d,min(d,length(vec2f(ca,cb))/.045-3.5),cm);
  d=max(d,(m.r-1.6)-p.y);
  // 漂浮巨石
  for(var i=0;i<i32(U.cnt.z);i++){let F=U.flo[i];let dp=vec3f(wr(p.x-F.x),(p.y-F.y)*1.25,wr(p.z-F.z));
    if(dot(dp,dp)<F.w*F.w*4.){d=smax(d,F.w*(1.+(n2-.5)*1.1+(n3-.5)*.5)-length(dp),.8);}}
  // 塊狀：只在岩石表面附近算（大部分體素離表面很遠，省下計算）；沙地保持平滑
  let rkW=max(rk,ss2(.4,2.6,p.y-m.r));
  if(abs(d)<6.5&&rkW>.02){
    let w1=wor(p*vec3f(.15625,.20,.15625),50);
    let w2=wor(p*vec3f(.4,.5,.4)+vec3f(3.3,1.7,8.1),128);
    d+=rkW*((.50-w1.x)*2.9-ss2(.10,0.,w1.y-w1.x)*.8+(.50-w2.x)*1.05);
  }
  d=min(d,-(p.y+3.5));
  return clamp(d,-4.,4.);
}
fn ss2(a:f32,b:f32,x:f32)->f32{let t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){
  if(id.x>=${NX}u||id.y>=${NY}u||id.z>=${NZ}u){return;}
  Dn[id.x+${NX}u*(id.y+${NY}u*id.z)]=dens(vec3f(f32(id.x),${Y0}.+f32(id.y),f32(id.z)));
}`;
  const u=new Float32Array(16*4+16*4+48*4+4);
  ARCHES.forEach((a,i)=>{const R0=a[2],ux=Math.cos(a[3]),uz=-Math.sin(a[3]),tall=i<3||i===7,sy=tall?1.25:.95;
    const y=Math.max(baseH(a[0]+ux*R0,a[1]+uz*R0),baseH(a[0]-ux*R0,a[1]-uz*R0))-R0*(tall?.08:.2);a[4]=y;a[5]=sy;
    u.set([a[0],y,a[1],R0,ux,uz,.2,sy],i*8);});
  SPIRES.forEach((s,i)=>u.set([s[0],s[1],s[2],s[3]],64+i*4));
  FLOATERS.forEach((f,i)=>u.set(f,128+i*4));
  u.set([ARCHES.length,SPIRES.length,FLOATERS.length,0],320);
  const tH=device.createTexture({size:[NX,NZ],format:'rgba32float',usage:TU.TEXTURE_BINDING|TU.COPY_DST});
  device.queue.writeTexture({texture:tH},HM,{bytesPerRow:NX*16},[NX,NZ]);
  const dB=device.createBuffer({size:NV*4,usage:BU.STORAGE|BU.COPY_SRC}),rB=device.createBuffer({size:NV*4,usage:BU.MAP_READ|BU.COPY_DST}),uB=buf(u,BU.UNIFORM);
  const pl=device.createComputePipeline({layout:'auto',compute:{module:shader(code,'sculpt'),entryPoint:'main'}});
  const bg=device.createBindGroup({layout:pl.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:dB}},{binding:1,resource:tH.createView()},{binding:2,resource:{buffer:uB}}]});
  const enc=device.createCommandEncoder(),ps=enc.beginComputePass();ps.setPipeline(pl);ps.setBindGroup(0,bg);ps.dispatchWorkgroups(NX/4,NY/4,NZ/4);ps.end();
  enc.copyBufferToBuffer(dB,0,rB,0,NV*4);device.queue.submit([enc.finish()]);
  await rB.mapAsync(GPUMapMode.READ);const f=new Float32Array(rB.getMappedRange());
  for(let i=0;i<NV;i++)DG[i]=Math.max(-124,Math.min(124,Math.round(f[i]*31)));
  rB.unmap();rB.destroy();dB.destroy();tH.destroy();
})();
mark('sculpt');
const gi=(x,y,z)=>x+NX*(y+NY*z);
// 讀回後在 CPU 上的修整：沿巡航曲線挖出通道、清出遺跡與沉船的場地
function carve(cx,cy,cz,r){const x0=Math.floor(cx-r-1),x1=Math.ceil(cx+r+1),y0=Math.max(0,Math.floor(cy-r-1-Y0)),y1=Math.min(NY-1,Math.ceil(cy+r+1-Y0)),z0=Math.floor(cz-r-1),z1=Math.ceil(cz+r+1);
  for(let z=z0;z<=z1;z++)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=Math.round((Math.hypot(x-cx,(y+Y0-cy)*1.12,z-cz)-r)*31),i=gi(((x%NX)+NX)%NX,y,((z%NZ)+NZ)%NZ);if(v<DG[i])DG[i]=Math.max(-124,v);}}
for(let i=0;i<tourLen;i++){const p=tourPts[i];carve(p[0],p[1]+.3,p[2],3.4+1.1*vnoise3(p[0]*.11,p[1]*.11,p[2]*.11,5));}
function clearSite(cx,cz,rad,yf){for(let z=Math.floor(cz-rad);z<=cz+rad;z++)for(let x=Math.floor(cx-rad);x<=cx+rad;x++){const d=Math.hypot(x-cx,z-cz);if(d>rad)continue;const e=sstep(rad,rad-4,d);
  for(let y=0;y<NY;y++){const yy=y+Y0,i=gi(((x%NX)+NX)%NX,y,((z%NZ)+NZ)%NZ),v=Math.round(mix(DG[i],clamp((yf-yy)*31,-124,124),e));if(yy>yf-1.5&&v<DG[i])DG[i]=v;}}}
clearSite(RUIN[0],RUIN[1],18,-27.4);clearSite(WRECK[0],WRECK[1],14,baseH(WRECK[0],WRECK[1])+.3);
carve(SPAWN[0],baseH(SPAWN[0],SPAWN[1])+4.5,SPAWN[1],5.5);
// 查詢
function dAt(x,y,z){const fx=wrapP(x),fz=wrapP(z),fy=clamp(y-Y0,0,NY-1.001);const xi=Math.floor(fx)%NX,yi=Math.floor(fy),zi=Math.floor(fz)%NZ,tx=fx-Math.floor(fx),ty=fy-yi,tz=fz-Math.floor(fz),x1=(xi+1)%NX,z1=(zi+1)%NZ;
  const a=DG[gi(xi,yi,zi)],b=DG[gi(x1,yi,zi)],c=DG[gi(xi,yi+1,zi)],d=DG[gi(x1,yi+1,zi)],e=DG[gi(xi,yi,z1)],f=DG[gi(x1,yi,z1)],g2=DG[gi(xi,yi+1,z1)],h=DG[gi(x1,yi+1,z1)];
  const m0=a+(b-a)*tx,m1=c+(d-c)*tx,m2=e+(f-e)*tx,m3=g2+(h-g2)*tx,n0=m0+(m1-m0)*ty,n1=m2+(m3-m2)*ty;return(n0+(n1-n0)*tz)/31;}
function gradAt(x,y,z,out){const e=.7;out[0]=dAt(x+e,y,z)-dAt(x-e,y,z);out[1]=dAt(x,y+e,z)-dAt(x,y-e,z);out[2]=dAt(x,y,z+e)-dAt(x,y,z-e);const l=Math.hypot(out[0],out[1],out[2])||1;out[0]/=-l;out[1]/=-l;out[2]/=-l;return out;}
const TOP=new Float32Array(NX*NZ);
for(let k=0;k<NZ;k++)for(let i=0;i<NX;i++){let y=Y0;for(let j=NY-2;j>=0;j--){const a=DG[gi(i,j,k)];if(a>0){const b=DG[gi(i,j+1,k)];y=Y0+j+(b<0?a/(a-b):1);break;}}TOP[k*NX+i]=y;}
function heightAt(x,z){const fx=wrapP(x),fz=wrapP(z),xi=Math.floor(fx)%NX,zi=Math.floor(fz)%NZ,tx=fx-Math.floor(fx),tz=fz-Math.floor(fz),x1=(xi+1)%NX,z1=(zi+1)%NZ;
  const a=TOP[zi*NX+xi],b=TOP[zi*NX+x1],c=TOP[z1*NX+xi],d=TOP[z1*NX+x1];return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz;}
function floorBelow(x,y,z){let p=dAt(x,y,z);if(p>0)return y;for(let yy=y-.5;yy>Y0;yy-=.5){const d=dAt(x,yy,z);if(d>0)return yy+.5*d/(d-p);p=d;}return Y0;}
function roomAbove(x,y,z,max){for(let h=1;h<max;h+=1)if(dAt(x,y+h,z)>0||y+h>-3.5)return h-1;return max;}
// 一個位置上的所有「地面」：[高度, 上方淨空]（有洞穴或懸岩時不只一層）
function floorsAt(x,z){const xi=Math.round(wrapP(x))%NX,zi=Math.round(wrapP(z))%NZ,out=[];let ceil=-3.5;
  for(let j=NY-2;j>=0;j--){const a=DG[gi(xi,j,zi)],b=DG[gi(xi,j+1,zi)];if(b<=0&&a>0){const y=Y0+j+a/(a-b);out.push([y,ceil-y]);}else if(b>0&&a<=0)ceil=Y0+j+.5;}return out;}
mark('carve');

/* 密度場 → 網格（surface nets，x、z 方向無縫相接） */
const TER=(function nets(){const MX=NX+1,MZ=NZ+1,vid=new Int32Array(MX*NY*MZ).fill(-1);
  let V=new Float32Array(1<<21),nv=0;const idx=[];for(let c=0;c<NCH;c++)idx.push([]);
  const c8=new Float32Array(8),E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const surf=[];                                      // 給擺放用的表面取樣點
  for(let k=0;k<MZ;k++){const k0=k%NZ,k1=(k+1)%NZ;for(let j=0;j<NY-1;j++)for(let i=0;i<MX;i++){const i0=i%NX,i1=(i+1)%NX;
    c8[0]=DG[gi(i0,j,k0)];c8[1]=DG[gi(i1,j,k0)];c8[2]=DG[gi(i0,j+1,k0)];c8[3]=DG[gi(i1,j+1,k0)];c8[4]=DG[gi(i0,j,k1)];c8[5]=DG[gi(i1,j,k1)];c8[6]=DG[gi(i0,j+1,k1)];c8[7]=DG[gi(i1,j+1,k1)];
    let m=0;for(let n=0;n<8;n++)if(c8[n]>0)m|=1<<n;if(m===0||m===255)continue;
    let sx=0,sy=0,sz=0,ne=0;for(let e=0;e<12;e++){const a=E[e][0],b=E[e][1],va=c8[a],vb=c8[b];if((va>0)===(vb>0))continue;const t=va/(va-vb);
      sx+=(a&1)+((b&1)-(a&1))*t;sy+=((a>>1)&1)+(((b>>1)&1)-((a>>1)&1))*t;sz+=(a>>2)+((b>>2)-(a>>2))*t;ne++;}
    const px=i+sx/ne,py=Y0+j+sy/ne,pz=k+sz/ne;
    let nx=-((c8[1]+c8[3]+c8[5]+c8[7])-(c8[0]+c8[2]+c8[4]+c8[6])),ny=-((c8[2]+c8[3]+c8[6]+c8[7])-(c8[0]+c8[1]+c8[4]+c8[5])),nz=-((c8[4]+c8[5]+c8[6]+c8[7])-(c8[0]+c8[1]+c8[2]+c8[3]));
    const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    if(nv*8+8>V.length){const n=new Float32Array(V.length*2);n.set(V);V=n;}
    const o=HM[((k0)*NX+i0)*4],mg=HM[(k0*NX+i0)*4+1];
    const sand=ny>.78&&Math.abs(py-o)<1.3&&mg<1.2?sstep(.78,.92,ny):0;
    V[nv*8]=px;V[nv*8+1]=py;V[nv*8+2]=pz;V[nv*8+3]=nx;V[nv*8+4]=ny;V[nv*8+5]=nz;V[nv*8+6]=sand;V[nv*8+7]=0;
    vid[i+MX*(j+NY*k)]=nv;if(i<NX&&k<NZ)surf.push(nv);nv++;}}
  const quad=(a,b,c,d,flip,ch)=>{if(a<0||b<0||c<0||d<0)return;const L=idx[ch];if(flip)L.push(a,c,b,b,c,d);else L.push(a,b,c,b,d,c);};
  for(let k=1;k<MZ;k++)for(let j=1;j<NY-1;j++)for(let i=1;i<MX;i++){const a=DG[gi(i%NX,j,k%NZ)],s=a>0;
    const ch=Math.min(CH-1,((i-1)/CHS)|0)+CH*Math.min(CH-1,((k-1)/CHS)|0);
    {const b=DG[gi((i+1)%NX,j,k%NZ)];if((b>0)!==s)quad(vid[i+MX*(j-1+NY*(k-1))],vid[i+MX*(j+NY*(k-1))],vid[i+MX*(j-1+NY*k)],vid[i+MX*(j+NY*k)],s,ch);}
    {const b=DG[gi(i%NX,j+1,k%NZ)];if((b>0)!==s)quad(vid[i-1+MX*(j+NY*(k-1))],vid[i+MX*(j+NY*(k-1))],vid[i-1+MX*(j+NY*k)],vid[i+MX*(j+NY*k)],!s,ch);}
    {const b=DG[gi(i%NX,j,(k+1)%NZ)];if((b>0)!==s)quad(vid[i-1+MX*(j-1+NY*k)],vid[i+MX*(j-1+NY*k)],vid[i-1+MX*(j+NY*k)],vid[i+MX*(j+NY*k)],s,ch);}}
  let tot=0;const start=new Int32Array(NCH),cnt=new Int32Array(NCH);for(let c=0;c<NCH;c++){start[c]=tot;cnt[c]=idx[c].length;tot+=cnt[c];}
  const I=new Uint32Array(tot);for(let c=0;c<NCH;c++)I.set(idx[c],start[c]);
  return{vb:buf(V.subarray(0,nv*8),BU.VERTEX),ib:buf(I,BU.INDEX),start,cnt,V,nv,surf,tris:tot/3};})();
mark('mesh');
