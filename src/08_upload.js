/* ───────── 上傳模型 ───────── */
function upload(g){const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.v),gl.STATIC_DRAW);
  const ibo=gl.createBuffer();gl.bindVertexArray(null);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(g.i),gl.STATIC_DRAW);
  return{vbo,ibo,count:g.i.length};}
function meshVAO(m,ibuf,first){const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.vbo);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,44,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,44,12);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,44,24);gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,2,gl.FLOAT,false,44,36);
  gl.bindBuffer(gl.ARRAY_BUFFER,ibuf);for(let l=4;l<8;l++){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,64,first*64+(l-4)*16);gl.vertexAttribDivisor(l,1);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ibo);gl.bindVertexArray(null);return vao;}

