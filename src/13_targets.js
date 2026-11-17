/* ───────── 繪圖目標：HDR 場景（可多重取樣）→ 半解析度光束 → 泛光 → 合成 ───────── */
let W=0,H=0,rscale=1,maxScale=1,leafK=1,tgtKey='';
const T={};
function mkTex(unit,ifmt,fmt,type,w,h,filter){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
function mkFBO(color,depth){const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);
  if(depth)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,depth,0);return f;}
const hdr=(function(){if(forceLDR)return false;if(!gl.getExtension('EXT_color_buffer_float')&&!gl.getExtension('EXT_color_buffer_half_float'))return false;
  const t=mkTex(8,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT,4,4,gl.LINEAR),f=mkFBO(t,null),ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(f);gl.deleteTexture(t);return ok;})();
const CF=hdr?gl.RGBA16F:gl.RGBA8,CTY=hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE;
function targets(w,h){const q=QT[qLevel];
  for(const k of['scene','depth','rays','raysB','blA','blB'])if(T[k]){gl.deleteTexture(T[k]);T[k]=null;}
  for(const k of['fRes','fMS','fRays','fRaysB','fA','fB'])if(T[k]){gl.deleteFramebuffer(T[k]);T[k]=null;}
  for(const k of['rbC','rbD'])if(T[k]){gl.deleteRenderbuffer(T[k]);T[k]=null;}
  T.scene=mkTex(2,CF,gl.RGBA,CTY,w,h,gl.LINEAR);T.depth=mkTex(3,gl.DEPTH_COMPONENT24,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,w,h,gl.NEAREST);T.fRes=mkFBO(T.scene,T.depth);
  const ms=Math.min(q.msaa,gl.getParameter(gl.MAX_SAMPLES)|0);
  if(ms>1){T.rbC=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,T.rbC);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,ms,CF,w,h);
    T.rbD=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,T.rbD);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,ms,gl.DEPTH_COMPONENT24,w,h);
    T.fMS=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,T.fMS);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,T.rbC);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,T.rbD);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE||gl.getError()!==gl.NO_ERROR){gl.deleteFramebuffer(T.fMS);T.fMS=null;}}
  T.hw=Math.max(1,w>>1);T.hh=Math.max(1,h>>1);T.rays=mkTex(6,CF,gl.RGBA,CTY,T.hw,T.hh,gl.LINEAR);T.fRays=mkFBO(T.rays,null);T.raysB=mkTex(6,CF,gl.RGBA,CTY,T.hw,T.hh,gl.LINEAR);T.fRaysB=mkFBO(T.raysB,null);
  T.bloom=hdr&&q.bloom;
  if(T.bloom){T.bw=Math.max(1,w>>2);T.bh=Math.max(1,h>>2);T.blA=mkTex(7,CF,gl.RGBA,CTY,T.bw,T.bh,gl.LINEAR);T.fA=mkFBO(T.blA,null);T.blB=mkTex(8,CF,gl.RGBA,CTY,T.bw,T.bh,gl.LINEAR);T.fB=mkFBO(T.blB,null);}
  else T.blA=mkTex(7,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,1,1,gl.LINEAR);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);}
function resize(){const cw=canvas.clientWidth||innerWidth,chh=canvas.clientHeight||innerHeight;let pr=Math.min(window.devicePixelRatio||1,2);
  const budget=QT[qLevel].px;pr=Math.min(pr,Math.sqrt(budget/(cw*chh)));pr*=rscale;
  const w=Math.max(2,Math.round(cw*pr)),h=Math.max(2,Math.round(chh*pr)),key=w+'x'+h+'q'+qLevel;
  if(key!==tgtKey){tgtKey=key;W=w;H=h;canvas.width=w;canvas.height=h;targets(w,h);}}

/* 陰影圖：沿陽光方向把整塊海床投到水面座標，只在載入與切換畫質時烘焙一次 */
let shTex=null,shFbo=null,shRes=0;
function bakeShadow(res){res=Math.min(res,gl.getParameter(gl.MAX_TEXTURE_SIZE)|0);
  if(shTex){gl.deleteTexture(shTex);gl.deleteFramebuffer(shFbo);}
  shRes=res;shTex=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,shTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,res,res,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  shFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shTex,0);
  gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  gl.viewport(0,0,res,res);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3);
  const shx=64*SUN[0]/SUN[1],shz=64*SUN[2]/SUN[1],pad=12;
  const mkList=(ch,cs)=>{const l=[];for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)for(let c=0;c<ch*ch;c++){const x0=(c%ch)*cs-pad+Math.min(0,shx)+i*P,x1=(c%ch+1)*cs+pad+Math.max(0,shx)+i*P,z0=((c/ch)|0)*cs-pad+Math.min(0,shz)+j*P,z1=(((c/ch)|0)+1)*cs+pad+Math.max(0,shz)+j*P;
    if(x1>0&&x0<P&&z1>0&&z0<P)l.push(i*2,j*2,c);}return l;};
  let list=mkList(CH,CHS);
  const each=(u,fn)=>{gl.uniform3f(u.uSun,SUN[0],SUN[1],SUN[2]);if(u.uOff)gl.uniform3f(u.uOff,0,0,0);if(u.uTime)gl.uniform1f(u.uTime,0);for(let n=0;n<list.length;n+=3){gl.uniform2f(u.uShOff,list[n],list[n+1]);fn(list[n+2]);}};
  gl.useProgram(P_terrainSh.p);gl.bindVertexArray(terrain.vao);each(P_terrainSh.u,c=>gl.drawElements(gl.TRIANGLES,terrain.per,gl.UNSIGNED_INT,c*terrain.per*4));
  gl.useProgram(P_staticSh.p);
  for(const k of statics){if(!k.cast)continue;gl.uniform4f(P_staticSh.u.uSway,k.sway[0],k.sway[1],k.sway[2],k.sway[3]);
    each(P_staticSh.u,c=>{if(!k.cnt[c])return;gl.bindVertexArray(k.vaos[c]);gl.drawElementsInstanced(gl.TRIANGLES,k.mesh.count,gl.UNSIGNED_INT,0,k.cnt[c]);});}
  gl.useProgram(P_leafSh.p);gl.uniform1f(P_leafSh.u.uWide,1);list=mkList(LCH,LCS);
  for(const L of[LV_stem,LV_big])each(P_leafSh.u,c=>{if(!L.cnt[c])return;gl.bindVertexArray(L.vaos[c]);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,(LEAFSEG+1)*2,L.cnt[c]);});
  gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindVertexArray(null);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.drawBuffers([gl.BACK]);gl.readBuffer(gl.BACK);}
function setQuality(level,auto){qLevel=clamp(level,0,2);qAuto=!!auto;const b=$('bQ');if(b)b.textContent='畫質 '+(qAuto?'自動':QT[qLevel].name);
  if(shRes&&shRes!==Math.min(QT[qLevel].sh,gl.getParameter(gl.MAX_TEXTURE_SIZE)|0))bakeShadow(QT[qLevel].sh);tgtKey='';}
