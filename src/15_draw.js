/* ───────── 繪製 ───────── */
function common(Pg){gl.useProgram(Pg.p);const u=Pg.u;
  if(u.uVP)gl.uniformMatrix4fv(u.uVP,false,VP);if(u.uCam)gl.uniform3f(u.uCam,eye[0],eye[1],eye[2]);if(u.uTime)gl.uniform1f(u.uTime,time);if(u.uSun)gl.uniform3f(u.uSun,SUN[0],SUN[1],SUN[2]);
  if(u.uLamp)gl.uniform4f(u.uLamp,fwd[0],fwd[1],fwd[2],lampI);if(u.uLDR)gl.uniform1f(u.uLDR,hdr?0:1);if(u.uShE)gl.uniform1f(u.uShE,1.3/shRes);
  if(u.uFwd){gl.uniform3f(u.uFwd,fwd[0],fwd[1],fwd[2]);gl.uniform3f(u.uRight,right[0],right[1],right[2]);gl.uniform3f(u.uUp,up[0],up[1],up[2]);gl.uniform2f(u.uTan,tanY*aspect,tanY);}
  if(u.uPx)gl.uniform1f(u.uPx,H/(2*tanY));if(u.uNF)gl.uniform2f(u.uNF,NEAR,FAR);return u;}
let drawn=0;
function leafPass(u,L,maxD,frac0,lod){const NV=(LEAFSEG+1)*2;
  for(let i=0;i<visL.length;i+=4){const c=visL[i+2],d=visL[i+3];if(!L.cnt[c]||d>maxD)continue;
    const f=lod?clamp(frac0*(d<28?1:d<62?.56:d<112?.3:.17),.05,1):1,n=Math.max(1,Math.ceil(L.cnt[c]*f));
    gl.uniform3f(u.uOff,visL[i],0,visL[i+1]);gl.uniform1f(u.uWide,lod?Math.min(1.9,Math.sqrt(1/f)):1);
    gl.bindVertexArray(L.vaos[c]);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,NV,n);drawn+=n;}}
function draw(){const q=QT[qLevel],far=q.far;drawn=0;
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.fMS||T.fRes);gl.viewport(0,0,W,H);
  gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  common(P_bg);gl.bindVertexArray(emptyVAO);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
  let u=common(P_terrain);gl.bindVertexArray(terrain.vao);
  for(let i=0;i<vis.length;i+=4){gl.uniform3f(u.uOff,vis[i],0,vis[i+1]);gl.drawElements(gl.TRIANGLES,terrain.per,gl.UNSIGNED_INT,vis[i+2]*terrain.per*4);}
  u=common(P_static);
  for(const k of statics){gl.uniform4f(u.uSway,k.sway[0],k.sway[1],k.sway[2],k.sway[3]);gl.uniform4f(u.uDet,k.det[0],k.det[1],k.det[2],k.det[3]);gl.uniform2f(u.uMat,k.mat[0],k.mat[1]);
    const maxD=165*far*k.far;
    for(let i=0;i<vis.length;i+=4){const c=vis[i+2],d=vis[i+3];if(!k.cnt[c]||d>maxD)continue;gl.uniform3f(u.uOff,vis[i],0,vis[i+1]);
      if(k.meshLo&&d>60){gl.bindVertexArray(k.vaosLo[c]);gl.drawElementsInstanced(gl.TRIANGLES,k.meshLo.count,gl.UNSIGNED_INT,0,k.cnt[c]);}
      else{gl.bindVertexArray(k.vaos[c]);gl.drawElementsInstanced(gl.TRIANGLES,k.mesh.count,gl.UNSIGNED_INT,0,k.cnt[c]);}}}
  u=common(P_leaf);
  leafPass(u,LV_stem,190*far,1,false);
  leafPass(u,LV_big,190*far,q.leaf*leafK,true);
  leafPass(u,LV_small,70*far,q.leaf*leafK,true);
  u=common(P_swim);
  for(const n in groups){const g=groups[n];if(!g.n)continue;gl.bindBuffer(gl.ARRAY_BUFFER,g.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,g.data,0,g.n*16);
    gl.uniform4f(u.uSwim,g.swim[0],g.swim[1],g.swim[2],g.swim[3]);gl.uniform1f(u.uSwimZ,g.swimZ);gl.uniform1f(u.uSpec,g.spec);
    gl.bindVertexArray(g.vao);gl.drawElementsInstanced(gl.TRIANGLES,g.mesh.count,gl.UNSIGNED_INT,0,g.n);}
  common(P_surface);gl.bindVertexArray(surf);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.enable(gl.BLEND);gl.depthMask(false);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  u=common(P_jelly);
  for(let i=0;i<vis.length;i+=4){const c=vis[i+2];if(!jellyKind.cnt[c]||vis[i+3]>150)continue;gl.uniform3f(u.uOff,vis[i],0,vis[i+1]);gl.bindVertexArray(jellyKind.vaos[c]);gl.drawElementsInstanced(gl.TRIANGLES,jellyKind.mesh.count,gl.UNSIGNED_INT,0,jellyKind.cnt[c]);}
  u=common(P_bubble);gl.bindVertexArray(bubbles.vao);
  {const tx=Math.floor(eye[0]/P),tz=Math.floor(eye[2]/P);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const ox=(tx+i)*P,oz=(tz+j)*P,dx=Math.max(Math.abs(eye[0]-ox-P/2)-P/2,0),dz=Math.max(Math.abs(eye[2]-oz-P/2)-P/2,0);if(dx*dx+dz*dz>110*110)continue;gl.uniform3f(u.uOff,ox,0,oz);gl.drawArrays(gl.POINTS,0,bubbles.n);}}
  gl.blendFunc(gl.ONE,gl.ONE);
  u=common(P_glint);
  for(let i=0;i<visL.length;i+=4){const c=visL[i+2];if(!glints.cnt[c]||visL[i+3]>130)continue;gl.uniform3f(u.uOff,visL[i],0,visL[i+1]);gl.bindVertexArray(glints.vaos[c]);gl.drawArrays(gl.POINTS,0,glints.cnt[c]);}
  common(P_snow);gl.bindVertexArray(snow.vao);gl.drawArrays(gl.POINTS,0,snow.n);
  gl.disable(gl.BLEND);gl.depthMask(true);gl.disable(gl.DEPTH_TEST);
  if(T.fMS){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,T.fMS);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,T.fRes);gl.blitFramebuffer(0,0,W,H,0,0,W,H,gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT,gl.NEAREST);}
  gl.bindVertexArray(emptyVAO);
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.fRays);gl.viewport(0,0,T.hw,T.hh);
  u=common(P_rays);gl.uniform1i(u.uSteps,q.steps);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,T.rays);gl.bindFramebuffer(gl.FRAMEBUFFER,T.fRaysB);common(P_rblur);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindTexture(gl.TEXTURE_2D,T.raysB);
  if(T.bloom){
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.fA);gl.viewport(0,0,T.bw,T.bh);u=common(P_bloomDown);gl.uniform2f(u.uPxS,1/W,1/H);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.useProgram(P_blur.p);gl.activeTexture(gl.TEXTURE8);
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.fB);gl.bindTexture(gl.TEXTURE_2D,T.blA);gl.uniform2f(P_blur.u.uDir,1.6/T.bw,0);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.fA);gl.bindTexture(gl.TEXTURE_2D,T.blB);gl.uniform2f(P_blur.u.uDir,0,1.6/T.bh);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindTexture(gl.TEXTURE_2D,null);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);
  u=common(P_post);gl.uniform1f(u.uBloomK,T.bloom?.42:0);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindVertexArray(null);
}
const roD=$('roDepth'),roF=$('roFocal'),roH=$('roHead');
function hud(){roD.textContent=(-cam[1]).toFixed(1);roF.textContent=String(Math.round(focal));let h=Math.round(yaw*180/Math.PI)%360;if(h<0)h+=360;roH.textContent=('00'+h).slice(-3);}
// 只有在低於約 30 fps 時才自動降載：先降解析度，再降畫質級別，最後減少葉片
let lastUp=-99;
function adapt(dt,frameMs){ema+=(frameMs-ema)*.06;scaleClock+=dt;if(scaleClock<1.2)return;scaleClock=0;
  if(ema>34){
    if(time-lastUp<14)maxScale=Math.max(.5,rscale-.14);
    if(rscale>.74)rscale-=.14;else if(qAuto&&qLevel<2){setQuality(qLevel+1,true);rscale=Math.min(1,maxScale);}else if(leafK>.55)leafK-=.2;else if(rscale>.5)rscale=Math.max(.5,rscale-.1);
    lastDown=time;goodFor=0;ema=24;}
  else if(ema<21&&rscale<maxScale){goodFor++;if(goodFor>=6&&time-lastDown>10){rscale=Math.min(maxScale,rscale+.14);goodFor=0;lastUp=time;}}
  else goodFor=0;}
let lost=false;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;fail('繪圖裝置中斷了，請重新整理頁面再試一次。');});
function frame(now){requestAnimationFrame(frame);if(lost)return;
  const raw=lastT?now-lastT:16;lastT=now;const dt=Math.min(raw,60)/1000;time+=dt;
  resize();player(dt);camera();visible();life(dt);draw();
  if(raw<250&&time>3)adapt(dt,raw);
  hudClock+=dt;if(hudClock>.1){hudClock=0;hud();}
  if(soundOn){bubT-=dt;if(bubT<0){bubT=.4+Math.random()*2.6;blip();if(Math.random()<.4)setTimeout(blip,90);}}
}
gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,texCaus);
bakeShadow(QT[qLevel].sh);mark('shadow');
setQuality(qLevel,true);
if(tour)nearestTour();
resize();camera();
mark('ready');ready=true;const go=$('go');go.disabled=false;go.textContent='開始潛水';
window.__sea={cam,start:()=>start(false),get yaw(){return yaw;},set yaw(v){yaw=v;},get pitch(){return pitch;},set pitch(v){pitch=v;},get focal(){return focal;},set focal(v){focal=focalT=v;},
  get tour(){return tour;},set tour(v){setTour(v);},set lamp(v){setLamp(v);lampI=v?1:0;},get time(){return time;},set time(v){time=v;},set quality(v){setQuality(v,false);},
  hit0:()=>{for(const L of hitGrid)for(const h of L)if(!h[5]&&h[3]>1.2)return h;},bigAt:i=>{const o=[0,0,0];bigPos(bigs[i],time,o);return o;},schoolAt:i=>[schools[i].lx,schools[i].ly,schools[i].lz,schools.length],heightAt,TOUR,
  stats:()=>({TM,W,H,hdr,msaa:!!T.fMS,q:qLevel,rscale,leafK,ema:+ema.toFixed(1),vis:vis.length/4,leaves:drawn,fish:groups.torp.n+groups.tall.n,total:{big:LV_big.total,stem:LV_stem.total,small:LV_small.total,fish:fishes.length},started,locked,focalT})};
requestAnimationFrame(frame);
})();
