/* ───────── 密度場貼圖、天光體積、陰影圖 ───────── */
const texDens=(function(){const d=new Uint8Array(NV);for(let i=0;i<NV;i++)d[i]=DG[i]+128;return tex3D(d,NX,NY,NZ,'r8unorm',false);})();
boidBind(texDens);
// 天光體積（每格 2 m）：每個位置朝上方七個方向走，被岩石擋住或穿過海藻冠層就變暗。洞穴、岩縫、海藻林深處因此自然變暗。
const texVol=device.createTexture({size:[160,32,160],dimension:'3d',format:'rgba8unorm',usage:TU.STORAGE_BINDING|TU.TEXTURE_BINDING});
(function(){const km=new Uint8Array(160*160*4);for(let i=0;i<160*160;i++){km[i*4]=Math.min(255,kelpMap[i*2]*255);km[i*4+1]=Math.min(255,kelpMap[i*2+1]/64*255);km[i*4+2]=Math.round(255*zoneK((i%160)*2+1,((i/160)|0)*2+1));km[i*4+3]=255;}
  const tK=device.createTexture({size:[160,160],format:'rgba8unorm',usage:TU.TEXTURE_BINDING|TU.COPY_DST});device.queue.writeTexture({texture:tK},km,{bytesPerRow:640},[160,160]);
  const pl=device.createComputePipeline({layout:'auto',compute:{entryPoint:'main',module:shader(/*wgsl*/`
@group(0) @binding(0) var tD:texture_3d<f32>;
@group(0) @binding(1) var sV:sampler;
@group(0) @binding(2) var tK:texture_2d<f32>;
@group(0) @binding(3) var outT:texture_storage_3d<rgba8unorm,write>;
fn dn(p:vec3f)->f32{return (textureSampleLevel(tD,sV,vec3f((p.x+.5)/320.,(p.y+66.5)/64.,(p.z+.5)/320.),0.).r*255.-128.)/31.;}
const DIRS=array<vec3f,7>(vec3f(0.,1.,0.),vec3f(.5,.866,0.),vec3f(-.5,.866,0.),vec3f(0.,.866,.5),vec3f(0.,.866,-.5),vec3f(.6,.53,.6),vec3f(-.6,.53,-.6));
const WTS=array<f32,7>(1.6,1.,1.,1.,1.,.5,.5);
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){
  if(id.x>=160u||id.y>=32u||id.z>=160u){return;}
  let p=vec3f(f32(id.x)*2.+1.,-65.+f32(id.y)*2.,f32(id.z)*2.+1.);
  var vis=0.;var dirs=DIRS;var wts=WTS;
  for(var k=0;k<7;k++){var t=1.;var q=p;
    for(var s=0;s<${lite?12:24};s++){q+=dirs[k]*2.;if(q.y>-3.||t<.02){break;}
      t*=1.-smoothstep(-.7,.7,dn(q));
      let kk=textureSampleLevel(tK,sV,q.xz/320.,0.).rg;
      if(q.y+66.<kk.g*64.){t*=exp(-kk.r*.24);}}
    vis+=t*wts[k];}
  textureStore(outT,id,vec4f(vis/6.6,textureLoad(tK,vec2i(i32(id.x),i32(id.z)),0).b,0.,1.));
}`,'skyvol')}});
  const bg=device.createBindGroup({layout:pl.getBindGroupLayout(0),entries:[{binding:0,resource:texDens.createView()},{binding:1,resource:sVol},{binding:2,resource:tK.createView()},{binding:3,resource:texVol.createView()}]});
  const enc=device.createCommandEncoder(),ps=enc.beginComputePass();ps.setPipeline(pl);ps.setBindGroup(0,bg);ps.dispatchWorkgroups(40,8,40);ps.end();device.queue.submit([enc.finish()]);})();
mark('skyvol');
/* ───────── 日夜循環：太陽與月亮的方向（經水面折射）、顏色、天光、曝光、雲影 ───────── */
const EXPO=.85;      // 白天的曝光
const SKY={hour:9.4,sun:[0,1,0],sunC:[1,1,1,0],skyC:[1,1,1,1.18],cld:[0,0,.5,.5],grd:[1,1,1,0],night:0};
function skyEval(h,t){const a=(h-6)/12*Math.PI,sn=Math.sin(a),cs=Math.cos(a),S=SKY;
  let x=cs,y=sn*.93,z=sn*.37+.10*cs;const moon=y<0;if(moon){x=-x;y=-y;z=-z;}      // 太陽在地平線下時，改由對面的月亮當主光
  const l=Math.hypot(x,y,z);x/=l;y/=l;z/=l;                                         // 空氣中的光源方向，y＝仰角的正弦
  const hx=x*.75,hz=z*.75;S.sun[0]=hx;S.sun[2]=hz;S.sun[1]=Math.sqrt(1-hx*hx-hz*hz); // 司乃耳折射：進水後最斜也只有約 48.6°
  const sunEl=moon?-y:y,up=sstep(.01,.25,y),hi=sstep(.2,.75,y),warm=sstep(.04,.5,y);
  if(moon){const I=.24*up;S.sunC[0]=.55*I;S.sunC[1]=.72*I;S.sunC[2]=I;}
  else{const I=1.75*up*(.62+.38*hi);S.sunC[0]=I;S.sunC[1]=I*mix(.42,.926,warm);S.sunC[2]=I*mix(.17,.811,warm);}
  const nk=sstep(.12,-.12,sunEl),dayK=sstep(-.10,.32,sunEl),dusk=Math.exp(-(sunEl*sunEl)/(.17*.17));
  S.night=nk;S.sunC[3]=nk;
  S.skyC[0]=mix(.030,1,dayK)*mix(1,1.12,dusk);S.skyC[1]=mix(.050,1,dayK)*mix(1,.74,dusk);S.skyC[2]=mix(.100,1,dayK)*mix(1,.56,dusk);
  S.skyC[3]=mix(EXPO,EXPO*2.5,nk)+.15*dusk*(1-nk);
  // 調色：黃昏偏暖、夜晚偏冷
  // 調色用較寬的黃昏曲線：日落前兩小時就開始轉暖
  const dk=Math.exp(-(sunEl*sunEl)/(.30*.30))*(1-nk);
  S.grd[0]=mix(1,1.17,dk)*mix(1,.84,nk);S.grd[1]=mix(1,.95,dk)*mix(1,.95,nk);S.grd[2]=mix(1,.78,dk)*mix(1,1.14,nk);S.grd[3]=dk;
  S.cld[0]=t*.0019;S.cld[1]=t*.0012;S.cld[2]=.50+.07*Math.sin(t*.021);S.cld[3]=mix(.58,.40,nk);}
skyEval(SKY.hour,0);

/* ───────── 陰影：遠景（整塊地磚，太陽移動時分幾幀重新烘焙）＋近景（跟著鏡頭的視窗，每幀重畫，所以海藻、魚、鯨魚的影子都會動） ───────── */
let BG0=null,shRes=0,shNRes=0,shNTex=null,shNV=null,shCur=0,bake=null;
const shFarT=[null,null],shFarV=[null,null],BG0v=[null,null],sunF=[0,1,0],bakeG=new Float32Array(GN),SHW=100,BAKEF=10;
const slotOff=(tile,cls)=>(tile*4+cls)*256,bakeSlot=t=>(36+t)*256;
function writeSlots(tx,tz,wide){for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)for(let c=0;c<4;c++){const o=(((j+1)*3+(i+1))*4+c)*64;dData[o]=(tx+i)*P;dData[o+1]=0;dData[o+2]=(tz+j)*P;dData[o+3]=wide[c];}
  device.queue.writeBuffer(dBuf,0,dData,0,36*64);}
// 烘焙遠景陰影用的九個固定位移（第 36–44 格），只寫一次
(function(){const d=new Float32Array(9*64);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const o=((j+1)*3+(i+1))*64;d[o]=i*P;d[o+2]=j*P;d[o+3]=1;}device.queue.writeBuffer(dBuf,36*256,d);})();
function bakeBegin(sn,t){const shx=66*sn[0]/sn[1],shz=66*sn[2]/sn[1],pad=12,list=[];
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)for(let c=0;c<NCH;c++){const x0=(c%CH)*CHS-pad+Math.min(0,shx)+i*P,x1=(c%CH+1)*CHS+pad+Math.max(0,shx)+i*P,z0=((c/CH)|0)*CHS-pad+Math.min(0,shz)+j*P,z1=(((c/CH)|0)+1)*CHS+pad+Math.max(0,shz)+j*P;
    if(x1>0&&x0<P&&z1>0&&z0<P)list.push(bakeSlot((j+1)*3+(i+1)),c);}
  bake={sun:[sn[0],sn[1],sn[2]],list,pos:0,tex:shCur^1};
  bakeG.fill(0);bakeG.set(bake.sun,20);bakeG[16]=P/2;bakeG[18]=P/2;bakeG[40]=t;bakeG[66]=1/P;device.queue.writeBuffer(gBufS,0,bakeG);}
// 畫出清單中第 pos 起的 n 組（地磚位移、區塊）；回傳是否整張烘焙完成
function bakeSlice(enc,n){const b=bake,L=b.list,i0=b.pos,i1=Math.min(L.length,i0+n*2);
  const ps=enc.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:shFarV[b.tex],depthClearValue:1,depthLoadOp:i0?'load':'clear',depthStoreOp:'store'}});
  ps.setBindGroup(0,BG0S);
  ps.setPipeline(shPipes.terrain);ps.setVertexBuffer(0,TER.vb);ps.setIndexBuffer(TER.ib,'uint32');
  for(let k=i0;k<i1;k+=2){const c=L[k+1];if(!TER.cnt[c])continue;ps.setBindGroup(1,BG1,[L[k]]);ps.drawIndexed(TER.cnt[c],1,TER.start[c]);}
  ps.setPipeline(shPipes.stat);
  for(const kd of statics){if(!kd.cast)continue;let bound=false;
    for(let k=i0;k<i1;k+=2){const c=L[k+1];if(!kd.cnt[c])continue;
      if(!bound){ps.setVertexBuffer(0,kd.mesh.vb);ps.setVertexBuffer(1,kd.ibuf);ps.setIndexBuffer(kd.mesh.ib,'uint32');ps.setBindGroup(2,kd.bg);bound=true;}
      ps.setBindGroup(1,BG1,[L[k]]);ps.drawIndexed(kd.mesh.count,kd.cnt[c],0,0,kd.start[c]);}}
  ps.setPipeline(shPipes.leaf);ps.setVertexBuffer(0,leafStrip);
  for(const Lf of[LV_stem,LV_big]){ps.setVertexBuffer(1,Lf.buf);for(let k=i0;k<i1;k+=2){const c=L[k+1];if(!Lf.cnt[c])continue;ps.setBindGroup(1,BG1,[L[k]]);ps.draw((LEAFSEG+1)*2,Lf.cnt[c],0,Lf.start[c]);}}
  ps.end();b.pos=i1;return i1>=L.length;}
function bakeEnd(){shCur=bake.tex;sunF[0]=bake.sun[0];sunF[1]=bake.sun[1];sunF[2]=bake.sun[2];bake=null;BG0=BG0v[shCur];}
// 建立（或依畫質重建）陰影貼圖，並立刻把遠景烘焙一次
function setupShadows(q){const lim=device.limits.maxTextureDimension2D,rf=Math.min(q.sh,lim),rn=Math.min(q.shN,lim);
  if(rf===shRes&&rn===shNRes)return;
  for(const t of[shFarT[0],shFarT[1],shNTex])if(t)t.destroy();
  shRes=rf;shNRes=rn;bake=null;
  const mk=r=>device.createTexture({size:[r,r],format:'depth16unorm',usage:TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING|TU.COPY_SRC});
  shNTex=mk(rn);shNV=shNTex.createView();
  for(let i=0;i<2;i++){shFarT[i]=mk(rf);shFarV[i]=shFarT[i].createView();
    BG0v[i]=device.createBindGroup({layout:L0,entries:[{binding:0,resource:{buffer:gBuf}},{binding:1,resource:sRep},{binding:2,resource:sClamp},{binding:3,resource:sCmp},{binding:4,resource:shFarV[i]},
      {binding:5,resource:texCaus.createView()},{binding:6,resource:texNoise.createView()},{binding:7,resource:texRock.createView()},{binding:8,resource:texVol.createView()},{binding:9,resource:sVol},{binding:10,resource:shNV},{binding:11,resource:texDens.createView()}]});}
  shCur=1;bakeBegin(SKY.sun,0);const enc=device.createCommandEncoder();bakeSlice(enc,bake.list.length);device.queue.submit([enc.finish()]);bakeEnd();}
setupShadows(QT[qLevel]);mark('shadow');

/* ───────── 繪圖目標：HDR 場景（4x 多重取樣）→ 半解析度光束與環境遮蔽 → 兩層泛光 → 合成 ───────── */
let W=0,H=0,rscale=1,maxScale=1,leafK=1,tgtKey='';
const T={},TNAMES=['scene','msc','depth','raysA','raysB','aoA','aoB','q0','q1','e0','e1'];
const blurU=[0,1,2,3].map(()=>device.createBuffer({size:16,usage:BU.UNIFORM|BU.COPY_DST}));
function targets(w,h){const q=QT[qLevel],ms=q.msaa>1;for(const k of TNAMES)if(T[k]){T[k].destroy();T[k]=null;}
  const mk=(ww,hh,fmt,samples)=>device.createTexture({size:[Math.max(1,ww),Math.max(1,hh)],format:fmt,sampleCount:samples||1,usage:TU.RENDER_ATTACHMENT|TU.TEXTURE_BINDING});
  T.ms=ms;T.scene=mk(w,h,HDR);T.depth=mk(w,h,DEPTH,ms?4:1);if(ms)T.msc=mk(w,h,HDR,4);
  T.raysA=mk(w>>1,h>>1,HDR);T.raysB=mk(w>>1,h>>1,HDR);T.aoA=mk(w>>1,h>>1,HDR);T.aoB=mk(w>>1,h>>1,HDR);
  T.q0=mk(w>>2,h>>2,HDR);T.q1=mk(w>>2,h>>2,HDR);T.e0=mk(w>>3,h>>3,HDR);T.e1=mk(w>>3,h>>3,HDR);
  const V={};for(const k of TNAMES)if(T[k])V[k]=T[k].createView();T.V=V;
  const pp=postPipes(ms),bg=(p,e)=>device.createBindGroup({layout:p.getBindGroupLayout(0),entries:e.map(r=>({binding:r[0],resource:r[1]}))});
  T.pp=pp;T.sp=scenePipes(ms?4:1);
  T.bRays=[0,1].map(i=>bg(pp.rays,[[0,{buffer:gBuf}],[1,sRep],[2,sCmp],[3,shFarV[i]],[4,texCaus.createView()],[5,V.depth],[6,texVol.createView()],[7,sVol],[8,shNV],[9,texNoise.createView()]]));
  T.bRblur=bg(pp.rblur,[[0,V.raysA]]);
  T.bAO=bg(pp.ao,[[0,{buffer:gBuf}],[1,V.depth]]);T.bAOblur=bg(pp.rblur,[[0,V.aoA]]);
  T.bDown=bg(pp.bdown,[[0,sClamp],[1,V.scene],[2,V.raysB]]);
  const qw=Math.max(1,w>>2),qh=Math.max(1,h>>2),ew=Math.max(1,w>>3),eh=Math.max(1,h>>3);
  [[1.5/qw,0],[0,1.5/qh],[1.6/qw,0],[0,1.6/eh]].forEach((d,i)=>device.queue.writeBuffer(blurU[i],0,new Float32Array([d[0],d[1],0,0])));
  T.bBl=[bg(pp.blur,[[0,sClamp],[1,V.q0],[2,{buffer:blurU[0]}]]),bg(pp.blur,[[0,sClamp],[1,V.q1],[2,{buffer:blurU[1]}]]),bg(pp.blur,[[0,sClamp],[1,V.q0],[2,{buffer:blurU[2]}]]),bg(pp.blur,[[0,sClamp],[1,V.e1],[2,{buffer:blurU[3]}]])];
  T.bPost=bg(pp.post,[[0,{buffer:gBuf}],[1,sClamp],[2,V.scene],[3,V.raysB],[4,V.q0],[5,V.e0],[6,V.depth],[7,V.aoB]]);}
function resize(){const cw=canvas.clientWidth||innerWidth,chh=canvas.clientHeight||innerHeight;let pr=Math.min(window.devicePixelRatio||1,2);
  pr=Math.min(pr,Math.sqrt(QT[qLevel].px/(cw*chh)))*rscale;
  const lim=device.limits.maxTextureDimension2D,w=Math.min(lim,Math.max(16,Math.round(cw*pr))),h=Math.min(lim,Math.max(16,Math.round(chh*pr))),key=w+'x'+h+'q'+qLevel+'s'+shRes+'n'+shNRes;
  if(key!==tgtKey){tgtKey=key;W=w;H=h;canvas.width=w;canvas.height=h;targets(w,h);}}
function setQuality(level,auto){qLevel=clamp(level,0,QMAX);qAuto=!!auto;const b=$('bQ');if(b)b.textContent='畫質 '+(qAuto?'自動':QT[qLevel].name);
  setupShadows(QT[qLevel]);tgtKey='';}
// 初始化到這裡如果有任何 WebGPU 錯誤，就丟出例外讓外層改用 WebGL2 版
targets(64,64);tgtKey='';
await Promise.all(compileP);await device.queue.onSubmittedWorkDone();
{const e=await device.popErrorScope();if(e)throw new Error(e.message);if(gpuErr)throw new Error(gpuErr);}
mark('gpu-ok');
