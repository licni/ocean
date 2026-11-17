/* ───────── 地形 ───────── */
const terrain=(function(){const N1=GN+1,v=new Float32Array(N1*N1*10);
  for(let j=0;j<N1;j++)for(let i=0;i<N1;i++){const x=i*CELL,z=j*CELL,o=(j*N1+i)*10,h=HF[(j%GN)*GN+(i%GN)];
    const hx0=HF[(j%GN)*GN+((i+GN-1)%GN)],hx1=HF[(j%GN)*GN+((i+1)%GN)],hz0=HF[((j+GN-1)%GN)*GN+(i%GN)],hz1=HF[((j+1)%GN)*GN+(i%GN)];
    const n=norm([hx0-hx1,2*CELL,hz0-hz1]),rm=reefM(x,z),cy=canyon(x,z),kd=kelpDens(x,z),ms=mesaAt(x,z),sl=sstep(.12,.36,1-n[1]),gr=sstep(.56,.70,nG(x/P,z/P))*(1-rm),zp=zoneP(x,z);
    let c=[.84,.77,.60];const L=(d,t)=>{c=[mix(c[0],d[0],t),mix(c[1],d[1],t),mix(c[2],d[2],t)];};
    L([.66,.63,.54],rm*.7);L([.46,.54,.38],gr*.4);L([.50,.47,.38],sstep(.2,.7,kd)*.55);L([.62,.52,.62],zp*.35);L([.48,.46,.42],cy*.6);
    const rock=clamp(Math.max(sl,.6*sstep(1,7,ms),.22*rm,.3*cy),0,1);
    v[o]=x;v[o+1]=h;v[o+2]=z;v[o+3]=n[0];v[o+4]=n[1];v[o+5]=n[2];v[o+6]=c[0];v[o+7]=c[1];v[o+8]=c[2];v[o+9]=rock;}
  const idx=new Uint32Array(GN*GN*6);let q=0;
  for(let c=0;c<CH*CH;c++){const cx=c%CH,cz=(c/CH)|0;for(let j=0;j<CELLS_PER_CH;j++)for(let i=0;i<CELLS_PER_CH;i++){const a=(cz*CELLS_PER_CH+j)*N1+cx*CELLS_PER_CH+i,b=a+1,d=a+N1,e=d+1;idx[q++]=a;idx[q++]=d;idx[q++]=b;idx[q++]=b;idx[q++]=d;idx[q++]=e;}}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,40,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,40,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,40,24);
  const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.bindVertexArray(null);
  return{vao,per:CELLS_PER_CH*CELLS_PER_CH*6};})();
mark('terrain');
