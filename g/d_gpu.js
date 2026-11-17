/* ───────── WebGPU 小工具 ───────── */
const BU=GPUBufferUsage,TU=GPUTextureUsage,SS=GPUShaderStage;
function buf(data,usage){const b=device.createBuffer({size:Math.max(16,Math.ceil(data.byteLength/4)*4),usage:usage|BU.COPY_DST,mappedAtCreation:true});
  new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));b.unmap();return b;}
function shader(code,label){const m=device.createShaderModule({code,label});
  compileP.push(m.getCompilationInfo().then(i=>{for(const x of i.messages)if(x.type==='error'){const L=code.split('\n');console.error('WGSL '+label+' L'+x.lineNum+': '+x.message+'\n> '+(L[x.lineNum-1]||''));if(!gpuErr)gpuErr='wgsl '+label;}}));return m;}
function mips2D(d,S,ch){const out=[d];let s=S,p=d;while(s>1){const h=s>>1,n=new Uint8Array(h*h*ch);for(let y=0;y<h;y++)for(let x=0;x<h;x++)for(let c=0;c<ch;c++){const o=(y*2*s+x*2)*ch+c;n[(y*h+x)*ch+c]=(p[o]+p[o+ch]+p[o+s*ch]+p[o+s*ch+ch]+2)>>2;}out.push(n);p=n;s=h;}return out;}
function tex2D(d,S,fmt,ch){const m=mips2D(d,S,ch),t=device.createTexture({size:[S,S],format:fmt,mipLevelCount:m.length,usage:TU.TEXTURE_BINDING|TU.COPY_DST});
  m.forEach((a,i)=>{const s=S>>i;device.queue.writeTexture({texture:t,mipLevel:i},a,{bytesPerRow:s*ch,rowsPerImage:s},[s,s]);});return t;}
function tex3D(d,w,h,dp,fmt,mip){const lv=[{d,w,h,dp}];
  if(mip){let c=lv[0];while(c.w>1||c.h>1||c.dp>1){const w2=Math.max(1,c.w>>1),h2=Math.max(1,c.h>>1),d2=Math.max(1,c.dp>>1),n=new Uint8Array(w2*h2*d2);
    for(let z=0;z<d2;z++)for(let y=0;y<h2;y++)for(let x=0;x<w2;x++){let s=0;for(let k=0;k<8;k++){const xx=Math.min(c.w-1,x*2+(k&1)),yy=Math.min(c.h-1,y*2+((k>>1)&1)),zz=Math.min(c.dp-1,z*2+(k>>2));s+=c.d[(zz*c.h+yy)*c.w+xx];}n[(z*h2+y)*w2+x]=(s+4)>>3;}
    c={d:n,w:w2,h:h2,dp:d2};lv.push(c);}}
  const t=device.createTexture({size:[w,h,dp],dimension:'3d',format:fmt,mipLevelCount:lv.length,usage:TU.TEXTURE_BINDING|TU.COPY_DST});
  lv.forEach((c,i)=>device.queue.writeTexture({texture:t,mipLevel:i},c.d,{bytesPerRow:c.w,rowsPerImage:c.h},[c.w,c.h,c.dp]));return t;}
const sRep=device.createSampler({addressModeU:'repeat',addressModeV:'repeat',addressModeW:'repeat',magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',maxAnisotropy:(lite||tmode)?1:8});
const sClamp=device.createSampler({magFilter:'linear',minFilter:'linear'});
const sVol=device.createSampler({addressModeU:'repeat',addressModeV:'clamp-to-edge',addressModeW:'repeat',magFilter:'linear',minFilter:'linear'});
const sCmp=device.createSampler({addressModeU:'repeat',addressModeV:'repeat',magFilter:'linear',minFilter:'linear',compare:'less-equal'});

/* ───────── WGSL 共用程式 ───────── */
// 光學常數：SIG 沿視線的衰減、KD 向下的衰減、WCOL 海水散射色、SUNC 陽光
const W_G=/*wgsl*/`
struct G { vp:mat4x4f, cam:vec4f, sun:vec4f, right:vec4f, up:vec4f, fwd:vec4f, lamp:vec4f, misc:vec4f, res:vec4f, nf:vec4f,
  sunC:vec4f,   // rgb 主光（太陽或月亮）顏色×強度，w 夜晚程度
  skyC:vec4f,   // rgb 天光與散射的色調×強度，w 曝光
  sunF:vec4f,   // 遠景陰影圖烘焙當下的光方向
  shN:vec4f,    // 近景陰影視窗：原點 xy、1/尺寸、取樣半徑
  cld:vec4f,    // 雲影：位移 xy、覆蓋門檻、強度
  grd:vec4f };  // 調色：rgb 依時段的色調，w 黃昏程度
struct D { off:vec4f };
const SIG=vec3f(.050,.0205,.0162);
const KD=vec3f(.046,.0190,.0128);
const WCOL=vec3f(.13,.56,.86);
@group(0) @binding(0) var<uniform> g:G;
fn ign(p:vec2f)->f32{return fract(52.9829189*fract(dot(p,vec2f(.06711056,.00583715))));}
fn ss(a:f32,b:f32,x:f32)->f32{let t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
// 紫色區的水色（zn＝所在位置屬於紫色區的程度，0–1）：散射光從藍綠轉成紫紅
const ZCOL=vec3f(.175,.115,.26);
fn inscatter(rd:vec3f,d:f32,zn:f32)->vec3f{
  let a=max(SIG-KD*rd.y,vec3f(.0015));
  let I=(1.-exp(-a*d))/a;
  let mu=max(dot(rd,g.sun.xyz),0.);let m2=mu*mu;let cy=min(g.cam.y,0.);let k=zn*.78;
  let wc=mix(WCOL*g.skyC.rgb*exp(KD*cy),ZCOL*g.skyC.g*exp(KD.b*cy*.6),k);
  return wc*SIG*I*.78+g.sunC.rgb*mix(WCOL,ZCOL*2.2,k)*SIG*exp(KD*cy)*I*(.22*m2*m2);
}
fn sunE(y:f32)->vec3f{return g.sunC.rgb*exp(KD*(min(y,0.)/g.sun.y));}
fn skyA(y:f32)->vec3f{return vec3f(.20,.56,.78)*g.skyC.rgb*exp(KD*min(y,0.)*1.15)*1.1;}
fn sproj(p:vec3f,sn:vec3f)->vec2f{return p.xz-sn.xz*(p.y/sn.y);}
fn kelpSway(xz:vec2f,h:f32,t:f32)->vec2f{let a=.012*pow(max(h,0.),1.35);let ph=xz.x*.0589+xz.y*.0393;return a*vec2f(sin(t*.45+ph-h*.09)+.5,cos(t*.36+ph*1.3-h*.07)+.2);}
fn qrot(q:vec4f,v:vec3f)->vec3f{return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
// 探照燈裝在鏡頭右下方
fn lampP()->vec3f{return g.cam.xyz+g.right.xyz*.32-g.up.xyz*.22;}
fn volUV(p:vec3f)->vec3f{return vec3f(p.x/320.,(p.y+66.)/64.,p.z/320.);}
// 陰影用的投影：沿光的方向把世界投到水面座標，再對到陰影圖的視窗（遠景＝整塊地磚、近景＝跟著鏡頭的小視窗）
fn projS(p:vec3f)->vec4f{let q=(sproj(p,g.sun.xyz)-g.shN.xy)*g.shN.z;return vec4f(q.x*2.-1.,1.-q.y*2.,clamp(-p.y/64.,0.,1.),1.);}
`;
const W_B=W_G+/*wgsl*/`
@group(0) @binding(1) var sR:sampler;
@group(0) @binding(2) var sC:sampler;
@group(0) @binding(3) var sS:sampler_comparison;
@group(0) @binding(4) var tSh:texture_depth_2d;
@group(0) @binding(5) var tCa:texture_3d<f32>;
@group(0) @binding(6) var tNo:texture_2d<f32>;
@group(0) @binding(7) var tRk:texture_2d<f32>;
@group(0) @binding(8) var tVol:texture_3d<f32>;
@group(0) @binding(9) var sV:sampler;
@group(0) @binding(10) var tShN:texture_depth_2d;
@group(0) @binding(11) var tDn:texture_3d<f32>;
// 陰影：近景視窗內用每幀重畫的高解析陰影（會動），視窗外用整塊地磚的遠景陰影
fn shFar(p:vec3f,e:f32)->f32{let s=sproj(p,g.sunF.xyz)/320.;let z=-p.y/64.-.0028;
  if(e<=0.){return textureSampleCompareLevel(tSh,sS,s,z);}
  return (textureSampleCompareLevel(tSh,sS,s+vec2f(-e,-e),z)+textureSampleCompareLevel(tSh,sS,s+vec2f(e,-e),z)+textureSampleCompareLevel(tSh,sS,s+vec2f(-e,e),z)+textureSampleCompareLevel(tSh,sS,s+vec2f(e,e),z))*.25;}
fn shNear(q:vec2f,z:f32,e:f32)->f32{
  if(e<=0.){return textureSampleCompareLevel(tShN,sS,q,z);}
  return (textureSampleCompareLevel(tShN,sS,q+vec2f(-e,-e),z)+textureSampleCompareLevel(tShN,sS,q+vec2f(e,-e),z)+textureSampleCompareLevel(tShN,sS,q+vec2f(-e,e),z)+textureSampleCompareLevel(tShN,sS,q+vec2f(e,e),z)
    +textureSampleCompareLevel(tShN,sS,q+vec2f(0.,-e*1.6),z)+textureSampleCompareLevel(tShN,sS,q+vec2f(0.,e*1.6),z)+textureSampleCompareLevel(tShN,sS,q+vec2f(-e*1.6,0.),z)+textureSampleCompareLevel(tShN,sS,q+vec2f(e*1.6,0.),z))*.125;}
fn shadowK(p:vec3f,soft:f32)->f32{
  let q=(sproj(p,g.sun.xyz)-g.shN.xy)*g.shN.z;
  let w=ss(0.,.05,min(min(q.x,q.y),min(1.-q.x,1.-q.y)));
  var r=0.;
  if(w<.999){r=shFar(p,g.misc.z*soft);}
  if(w>.001){r=mix(r,shNear(q,-p.y/64.-.0011,g.shN.w*soft),w);}
  return r;}
fn shadow1(p:vec3f)->f32{return shadowK(p,0.);}
fn shadow4(p:vec3f)->f32{return shadowK(p,1.);}
fn skyVis(p:vec3f)->f32{return textureSampleLevel(tVol,sV,volUV(p),0.).r;}
// 天光體積的兩個值：r 天空可見度、g 紫色區程度
fn volS(p:vec3f)->vec2f{return textureSampleLevel(tVol,sV,volUV(p),0.).rg;}
// 雲影：水面上方慢慢飄過的雲，讓整片海域的明暗一塊一塊地移動
fn cloud(p:vec3f)->f32{let s=sproj(p,g.sun.xyz);
  let n=textureSampleLevel(tNo,sR,s*.003125+g.cld.xy,0.).r*.62+textureSampleLevel(tNo,sR,s*.009375+g.cld.xy*1.7,0.).g*.38;
  return 1.-g.cld.w*ss(g.cld.z,g.cld.z+.20,n);}
fn causticL(wp:vec3f,lod:f32)->f32{
  let s=sproj(wp,g.sun.xyz);let t=g.misc.x*.2;
  let a=textureSampleLevel(tCa,sR,vec3f(s*.109375,t),lod).r*4.;
  let b=textureSampleLevel(tCa,sR,vec3f(s.yx*.071875+vec2f(.31,.17),t*.73+.4),lod).r;
  return mix(min(pow(a,1.6)*(.4+2.4*b),5.),1.,clamp(lod*.3-.15,0.,1.));
}
// 探照燈的照明：方向稍慢地跟著視線，轉頭時光束會掃過去
fn lampL(wp:vec3f)->vec3f{
  let Lv=wp-lampP();let d=length(Lv);
  let cone=ss(.76,.99,dot(Lv/max(d,1e-4),g.lamp.xyz))*g.lamp.w;
  return vec3f(1.,.96,.86)*(cone*cone*2.4/(1.+.035*d*d))*exp(-(d+length(g.cam.xyz-wp))*SIG);
}
// 密度場（公尺，正值在岩石內）；用來算大尺度的遮蔽
fn dens(p:vec3f)->f32{return (textureSampleLevel(tDn,sV,vec3f((p.x+.5)/320.,(p.y+66.5)/64.,(p.z+.5)/320.),0.).r*255.-128.)/31.;}
// 沿法線往外走 1.1 m 與 3.4 m：越靠近別的岩面（岩縫、岩腳、洞壁）越暗
fn sdfAO(wp:vec3f,N:vec3f)->f32{
  let a=clamp(-dens(wp+N*1.1)/1.1*1.25-.10,0.,1.);
  let b=clamp(-dens(wp+N*3.4)/3.4*1.20-.08,0.,1.);
  return a*(.42+.58*b);}
fn h1(x:f32)->f32{return fract(sin(x*91.3458)*47453.5453);}
// 光照：陽光（陰影×光斑×雲影）＋天光（半球、天空可見度、遮蔽）＋側向散射光；flu＝螢光（把藍綠光轉成自己的顏色，深處的紅與粉才不會發黑）
fn lit(alb:vec3f,N:vec3f,wp:vec3f,wrapK:f32,flu:f32,emis:vec3f,spec:f32)->vec3f{
  let Vv=g.cam.xyz-wp;let dist=length(Vv);let V=Vv/max(dist,1e-4);
  let depth=max(-wp.y,0.);
  let ndl=dot(N,g.sun.xyz);
  let dif=mix(max(ndl,0.),ndl*.5+.5,wrapK);
  let sh=shadow4(wp+N*.10);
  let ck=.90*exp(-depth*.010);
  let px=length(fwidth(wp.xz))*14.;
  let ca=1.-ck+ck*causticL(wp,clamp(log2(max(px,1e-3))+depth*.028,0.,6.));
  let cl=cloud(wp);
  let vv=volS(wp+N*.9);let sv=vv.x;let zt=vv.y;
  let ao=sdfAO(wp,N);
  let up=N.y*.5+.5;
  let sky=skyA(wp.y)*1.45;
  // 天空被擋住的地方（岩拱下、洞裡、海藻深處）仍有四面八方散射來的光，不會全黑
  let A=(sky*(.24+.76*up*up)*(.24+.76*sv)+sky*vec3f(.55,.78,1.)*(1.-abs(N.y))*.34*(.38+.62*sv))*ao*(.72+.28*sh)*(.60+.40*cl)+vec3f(.004,.012,.017)*(.3+g.skyC.g)*(1.+1.2*(1.-sv))*(.5+.5*ao);
  let E=sunE(wp.y)*sh*ca*cl*(.35+.65*ao)*mix(vec3f(1.),vec3f(1.12,.90,1.06),zt*.5);
  let Az=A*mix(vec3f(1.),vec3f(1.30,.84,1.18),zt*.65);
  var c=alb*(E*dif+Az);
  c+=alb*flu*dot(E*max(dif,.25)+A,vec3f(.04,.42,.50));
  // 濕潤表面的高光：陽光（含光斑）在岩面與沙粒上的閃爍
  let Hv=normalize(g.sun.xyz+V);
  c+=E*spec*(pow(max(dot(N,Hv),0.),48.)*.9+pow(max(dot(N,Hv),0.),8.)*.06);
  // 掠射角時表面映出周圍水色（濕潤感）
  c+=sky*(.10+.90*sv)*ao*spec*pow(1.-max(dot(N,V),0.),4.)*.55;
  let lp=lampL(wp);
  c+=alb*(1.+flu)*lp*(.35+.65*max(dot(N,V),0.))+lp*spec*pow(max(dot(N,V),0.),30.)*.5;
  c+=emis;
  let fv=.40+.60*mix(skyVis(g.cam.xyz),sv,.5);
  return c*exp(-SIG*dist)+inscatter(-V,dist,mix(g.fwd.w,zt,.5))*fv;
}
fn fin(c:vec3f)->vec4f{return vec4f(clamp(c,vec3f(0.),vec3f(24.)),1.);}
// 岩面附著生物的顏色：暗紅、赭、灰紫、土黃（都偏暗，靠光斑提亮）
fn coralPal(t0:f32)->vec3f{let t=fract(t0);
  let a=vec3f(.30,.065,.085);let b=vec3f(.34,.20,.06);let c=vec3f(.20,.12,.30);let d=vec3f(.33,.30,.22);
  if(t<.25){return mix(a,b,t*4.);}if(t<.5){return mix(b,c,(t-.25)*4.);}if(t<.75){return mix(c,d,(t-.5)*4.);}return mix(d,a,(t-.75)*4.);}
struct RM { c:vec3f, n:vec3f, s:f32 };
// 岩石材質：三向投影的四層凹凸；顏色分層——沿高度成帶的岩層（帶與帶之間有暗縫）、暖色鏽斑、附著生物、淺色殼狀斑、朝上面的藻；凹處壓暗。s＝高光強度
fn rockMat(p:vec3f,N0:vec3f,dist:f32,seed:f32)->RM{
  var w=N0*N0;w=w*w;w=w/(w.x+w.y+w.z);
  let f1=.085;let f2=.42;let f3=1.9;let f4=7.3;
  let ax=textureSample(tRk,sR,p.zy*f1);let ay=textureSample(tRk,sR,p.xz*f1);let az=textureSample(tRk,sR,p.xy*f1);
  let bx=textureSample(tRk,sR,p.zy*f2+.37);let by=textureSample(tRk,sR,p.xz*f2+.37);let bz=textureSample(tRk,sR,p.xy*f2+.37);
  let cx=textureSample(tRk,sR,p.zy*f3+.11);let cy=textureSample(tRk,sR,p.xz*f3+.11);let cz=textureSample(tRk,sR,p.xy*f3+.11);
  let dx=textureSample(tRk,sR,p.zy*f4+.53);let dy=textureSample(tRk,sR,p.xz*f4+.53);let dz=textureSample(tRk,sR,p.xy*f4+.53);
  let h=ax.b*w.x+ay.b*w.y+az.b*w.z;
  let h2=bx.b*w.x+by.b*w.y+bz.b*w.z;
  let h3=cx.b*w.x+cy.b*w.y+cz.b*w.z;
  let h4=dx.b*w.x+dy.b*w.y+dz.b*w.z;
  let mot=ax.a*w.x+ay.a*w.y+az.a*w.z;
  let mot2=bx.a*w.x+by.a*w.y+bz.a*w.z;
  let fade=exp(-dist*.02);let fade3=exp(-dist*.07);let fade4=exp(-dist*.22);
  let gx=(ax.rg-.5)*6.4+(bx.rg-.5)*5.4*fade+(cx.rg-.5)*3.4*fade3+(dx.rg-.5)*2.6*fade4;
  let gy=(ay.rg-.5)*6.4+(by.rg-.5)*5.4*fade+(cy.rg-.5)*3.4*fade3+(dy.rg-.5)*2.6*fade4;
  let gz=(az.rg-.5)*6.4+(bz.rg-.5)*5.4*fade+(cz.rg-.5)*3.4*fade3+(dz.rg-.5)*2.6*fade4;
  let big=textureSample(tNo,sR,p.xz*.013+p.y*.021+seed).g;
  let big2=textureSample(tNo,sR,p.zx*.031+p.y*.043+.37).r;
  let steep=1.-abs(N0.y);
  // 岩層
  let band=p.y*.46+h*1.5+big*4.5+big2*2.5+seed*9.;
  let bh=h1(floor(band));let bf=fract(band);
  let seam=ss(.13,0.,bf)*steep;
  var c=mix(vec3f(.100,.110,.120),vec3f(.250,.225,.190),clamp(mot*1.7-.35,0.,1.));
  c=mix(c,mix(vec3f(.205,.150,.085),vec3f(.140,.160,.105),bh),ss(.40,.64,big)*.65);
  c*=mix(.72,1.16,bh)*(1.-.45*seam);
  let hgt=h*.50+h2*.34+h3*.16;
  // 附著生物與殼狀斑
  let e=ss(.50,.64,mot2*.55+big2*.5)*ss(.28,.6,hgt)*ss(-.6,.2,N0.y);
  c=mix(c,coralPal(big*2.6+seed*3.)*(.55+.85*h2),e*.72);
  c=mix(c,vec3f(.40,.40,.37)*(.5+.7*h3),ss(.62,.72,mot2*.6+h3*.5)*.42*fade);
  // 朝上的面長藻
  c=mix(c,vec3f(.032,.115,.060)*(.6+.9*h2),ss(-.05,.65,N0.y)*ss(.30,.54,mot*.55+big*.5)*.78);
  c*=(.20+1.42*hgt)*mix(1.,.62+.76*h4,fade4);
  let N=normalize(N0-(w.x*vec3f(0.,gx.y,gx.x)+w.y*vec3f(gy.x,0.,gy.y)+w.z*vec3f(gz.x,gz.y,0.))+vec3f(0.,-seam*.9,0.));
  return RM(c,N,(.10+.55*h*h2)*(1.-e*.5));
}
`;
const W_FS=/*wgsl*/`
struct FO { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->FO{let p=vec2f(f32((i<<1u)&2u),f32(i&2u));return FO(vec4f(p*2.-1.,0.,1.),p*2.-1.);}
`;
// 繫結配置：第 0 組＝全域（場景用含貼圖、陰影烘焙用只有常數），第 1 組＝每次繪製的地磚位移，第 2 組＝各管線自己的資料
const L0=device.createBindGroupLayout({entries:[
  {binding:0,visibility:SS.VERTEX|SS.FRAGMENT,buffer:{}},{binding:1,visibility:SS.VERTEX|SS.FRAGMENT,sampler:{}},{binding:2,visibility:SS.FRAGMENT,sampler:{}},
  {binding:3,visibility:SS.VERTEX|SS.FRAGMENT,sampler:{type:'comparison'}},{binding:4,visibility:SS.VERTEX|SS.FRAGMENT,texture:{sampleType:'depth'}},
  {binding:5,visibility:SS.VERTEX|SS.FRAGMENT,texture:{viewDimension:'3d'}},{binding:6,visibility:SS.VERTEX|SS.FRAGMENT,texture:{}},{binding:7,visibility:SS.FRAGMENT,texture:{}},
  {binding:8,visibility:SS.VERTEX|SS.FRAGMENT,texture:{viewDimension:'3d'}},{binding:9,visibility:SS.VERTEX|SS.FRAGMENT,sampler:{}},{binding:10,visibility:SS.VERTEX|SS.FRAGMENT,texture:{sampleType:'depth'}},{binding:11,visibility:SS.VERTEX|SS.FRAGMENT,texture:{viewDimension:'3d'}}]});
const L0S=device.createBindGroupLayout({entries:[{binding:0,visibility:SS.VERTEX|SS.FRAGMENT,buffer:{}}]});
const L1=device.createBindGroupLayout({entries:[{binding:0,visibility:SS.VERTEX|SS.FRAGMENT,buffer:{hasDynamicOffset:true,minBindingSize:16}}]});
const LK=device.createBindGroupLayout({entries:[{binding:0,visibility:SS.VERTEX|SS.FRAGMENT,buffer:{}}]});
const GN=76,gBuf=device.createBuffer({size:GN*4,usage:BU.UNIFORM|BU.COPY_DST}),gData=new Float32Array(GN);
const gBufS=device.createBuffer({size:GN*4,usage:BU.UNIFORM|BU.COPY_DST});
const SLOTS=64,dBuf=device.createBuffer({size:SLOTS*256,usage:BU.UNIFORM|BU.COPY_DST}),dData=new Float32Array(SLOTS*64);
const BG1=device.createBindGroup({layout:L1,entries:[{binding:0,resource:{buffer:dBuf,size:16}}]});
const BG0S=device.createBindGroup({layout:L0S,entries:[{binding:0,resource:{buffer:gBufS}}]}),BG0N=device.createBindGroup({layout:L0S,entries:[{binding:0,resource:{buffer:gBuf}}]});
const HDR='rgba16float',DEPTH='depth32float';
const VB={mesh:{arrayStride:44,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'},{shaderLocation:3,offset:36,format:'float32x2'}]},
  inst16:{arrayStride:64,stepMode:'instance',attributes:[4,5,6,7].map((l,i)=>({shaderLocation:l,offset:i*16,format:'float32x4'}))},
  inst12:{arrayStride:48,stepMode:'instance',attributes:[4,5,6].map((l,i)=>({shaderLocation:l,offset:i*16,format:'float32x4'}))},
  inst8:{arrayStride:32,stepMode:'instance',attributes:[4,5].map((l,i)=>({shaderLocation:l,offset:i*16,format:'float32x4'}))},
  inst4:{arrayStride:16,stepMode:'instance',attributes:[{shaderLocation:4,offset:0,format:'float32x4'}]},
  terr:{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x2'}]},
  strip:{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:'float32x2'}]}};
// 建立管線：o.kind = 'scene'（HDR＋深度，可多重取樣）｜'shadow'（只寫深度）｜'post'（全螢幕）
function pipeline(o){const m=shader(o.code,o.label);
  const d={label:o.label,layout:device.createPipelineLayout({bindGroupLayouts:o.layouts}),vertex:{module:m,entryPoint:o.vs||'vs',buffers:o.buffers||[]},primitive:{topology:o.topology||'triangle-list',cullMode:'none'}};
  if(o.kind==='shadow'){d.depthStencil={format:'depth16unorm',depthWriteEnabled:true,depthCompare:'less',depthBias:3,depthBiasSlopeScale:2.5};}
  else{d.fragment={module:m,entryPoint:o.fs||'fs',targets:[{format:o.format||HDR,blend:o.blend}]};
    if(o.kind==='scene'){d.depthStencil={format:DEPTH,depthWriteEnabled:o.depthWrite!==false,depthCompare:o.depthCompare||'less-equal'};d.multisample={count:o.samples||1};}}
  return device.createRenderPipeline(d);}
const BLEND_PM={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
const BLEND_ADD={color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'one',dstFactor:'one'}};
mark('gpu');
