/* ───────── WebGL 小工具 ───────── */
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw new Error('shader: '+gl.getShaderInfoLog(s)+'\n'+src.split('\n').map((l,i)=>(i+1)+': '+l).join('\n'));}return s;}
const TEXUNIT={uCaus:0,uNoise:1,uScene:2,uDepth:3,uRock:4,uShadow:5,uRays:6,uBloom:7,uSrc:8};
function program(vs,fs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('link: '+gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const nm=gl.getActiveUniform(p,i).name.replace(/\[0\]$/,'');u[nm]=gl.getUniformLocation(p,nm);}
  gl.useProgram(p);for(const k in TEXUNIT)if(u[k])gl.uniform1i(u[k],TEXUNIT[k]);
  return{p,u};}
