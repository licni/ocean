/* ───────── 程序化貼圖：真實折射焦散（3D，可循環）與雜訊 ───────── */
function makeCaustics(S,F,D,NW,seed){
  const SS=2,M=S*SS,TB=4096,ct=new Float32Array(TB);
  for(let i=0;i<TB;i++)ct[i]=Math.cos(i/TB*TAU);
  const r=mulberry(seed),W=[];
  while(W.length<NW){const kx=Math.round((r()*2-1)*7),ky=Math.round((r()*2-1)*7),k=Math.hypot(kx,ky);if(k<1.9||k>7.5)continue;
    const a=Math.pow(k,-1.15);W.push({kx,ky,ax:a*kx/k,ay:a*ky/k,w:(r()<.5?-1:1)*Math.max(1,Math.round(Math.sqrt(k)*.8)),ph:r()});}
  const out=new Uint8Array(S*S*F),acc=new Float32Array(S*S),gx=new Float32Array(M*M),gy=new Float32Array(M*M),st=TB/M;
  for(let f=0;f<F;f++){
    gx.fill(0);gy.fill(0);
    for(const w of W){const off=Math.round((.5*(w.kx+w.ky)/M+w.w*f/F+w.ph)*TB),dk=(w.kx*st)&4095;
      for(let j=0;j<M;j++){let idx=(w.ky*j*st+off)&4095;const o=j*M;
        for(let i=0;i<M;i++){const c=ct[idx];gx[o+i]+=w.ax*c;gy[o+i]+=w.ay*c;idx=(idx+dk)&4095;}}}
    acc.fill(0);
    for(let j=0;j<M;j++)for(let i=0;i<M;i++){const o=j*M+i,x=(i+.5)/SS+gx[o]*D*S-.5,y=(j+.5)/SS+gy[o]*D*S-.5;
      const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,x0=((xi%S)+S)%S,y0=((yi%S)+S)%S,x1=(x0+1)%S,y1=(y0+1)%S;
      acc[y0*S+x0]+=(1-fx)*(1-fy);acc[y0*S+x1]+=fx*(1-fy);acc[y1*S+x0]+=(1-fx)*fy;acc[y1*S+x1]+=fx*fy;}
    const k=255*.25/(SS*SS),b=f*S*S;for(let i=0;i<S*S;i++){const v=acc[i]*k;out[b+i]=v>255?255:v;}
  }
  return out;}
gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
const texCaus=gl.createTexture();
gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,texCaus);
gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,128,128,24,0,gl.RED,gl.UNSIGNED_BYTE,makeCaustics(128,24,0.05,14,7));
gl.generateMipmap(gl.TEXTURE_3D);
gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.REPEAT);
(function(){const S=256,d=new Uint8Array(S*S*4);
  const ch=[[tileNoise(8,31),tileNoise(16,32),tileNoise(32,33),tileNoise(64,34)],[tileNoise(8,41),tileNoise(16,42),tileNoise(32,43),tileNoise(64,44)],[tileNoise(16,51),tileNoise(32,52),tileNoise(64,53),tileNoise(128,54)]];
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=x/S,v=y/S,o=(y*S+x)*4;
    for(let c=0;c<3;c++){const n=ch[c];d[o+c]=clamp((n[0](u,v)*.5+n[1](u,v)*.26+n[2](u,v)*.15+n[3](u,v)*.09)*255,0,255);}d[o+3]=255;}
  const t=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,S,S,0,gl.RGBA,gl.UNSIGNED_BYTE,d);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);})();

mark('tex');
// 岩石貼圖：rg = 坡度（法線擾動）、b = 高度（稜脊狀）、a = 色斑
(function(){const S=256,h=new Float32Array(S*S),d=new Uint8Array(S*S*4);
  const oc=[tileNoise(4,61),tileNoise(8,62),tileNoise(16,63),tileNoise(32,64),tileNoise(64,65)],am=[.40,.27,.17,.10,.06],mo=[tileNoise(3,71),tileNoise(7,72),tileNoise(15,73)];
  let lo=9,hi=-9;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=x/S,v=y/S;let s=0;for(let k=0;k<5;k++){const n=oc[k](u,v);s+=am[k]*(k<3?1-Math.abs(2*n-1):n);}h[y*S+x]=s;lo=Math.min(lo,s);hi=Math.max(hi,s);}
  for(let i=0;i<S*S;i++)h[i]=(h[i]-lo)/(hi-lo);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const o=(y*S+x)*4,u=x/S,v=y/S;
    const gx=(h[y*S+(x+1)%S]-h[y*S+(x+S-1)%S])*S*.5*.05,gy=(h[((y+1)%S)*S+x]-h[((y+S-1)%S)*S+x])*S*.5*.05;
    d[o]=clamp(127.5+gx*127.5,0,255);d[o+1]=clamp(127.5+gy*127.5,0,255);d[o+2]=h[y*S+x]*255;d[o+3]=clamp((mo[0](u,v)*.5+mo[1](u,v)*.32+mo[2](u,v)*.18)*255,0,255);}
  const t=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,S,S,0,gl.RGBA,gl.UNSIGNED_BYTE,d);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);})();
