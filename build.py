import re,os
d=os.path.dirname(os.path.abspath(__file__))
R=lambda f:open(os.path.join(d,f),encoding='utf-8').read()
def sub1(s,a,b):
    assert s.count(a)==1,(a[:60],s.count(a)); return s.replace(a,b)
# ---- WebGL2 後備版（第二版原封不動包成函式）
gl2=''.join(R('src/'+f) for f in ['005_pre.js','006_quality.js','01_math.js','02_world.js','03_gl.js','04_shaders.js','05_tex.js','06_geo.js','07_models2.js','08_upload.js','09_terrain.js','10_scene.js','11_life.js','12_input.js','13_targets.js','14_update.js','15_draw.js'])
gl2=sub1(gl2,"(function(){\n'use strict';","function startGL2(){\n'use strict';")
assert gl2.rstrip().endswith('})();'); gl2=gl2.rstrip()[:-5]+'}\n'
gl2=sub1(gl2,"mark('ready');ready=true;const go=$('go');go.disabled=false;go.textContent='開始潛水';","mark('ready');ready=true;const go=$('go');go.disabled=false;go.textContent='開始潛水';{const r=$('rend');if(r)r.textContent='WebGL2';}")
# ---- WebGPU 版
geo=sub1(R('src/06_geo.js'),"const g=new Geo(),K=11,S=8,z0=.5,z1=-.38;","const g=new Geo(),K=o.K||11,S=o.S||8,z0=.5,z1=-.38;")
m2=R('src/07_models2.js'); m2=m2[m2.index('function mBarrel'):]
inp=R('src/12_input.js')
inp=sub1(inp,"const cam=[SPAWN[0],heightAt(SPAWN[0],SPAWN[1])+4,SPAWN[1]]","const cam=[SPAWN[0],baseH(SPAWN[0],SPAWN[1])+4.5,SPAWN[1]]")
a=inp.index("function nearestTour(){");b=inp.index("\n",a)
inp=sub1(inp,"else if(qLevel<2)setQuality(qLevel+1,false);","else if(qLevel<QMAX)setQuality(qLevel+1,false);")
inp=sub1(inp,"+k('F','探照燈')+","+k('F','探照燈')+k('N','時間')+k('1–6','視點')+")
a=inp.index("function nearestTour(){");b=inp.index("\n",a)
inp=inp[:a]+"let tourS=0;function nearestTour(){let bd=1e9;for(let i=0;i<tourLen;i++){const p=tourPts[i],d=Math.hypot(wrapD(cam[0]-p[0]),cam[1]-p[1],wrapD(cam[2]-p[2]));if(d<bd){bd=d;tourS=i;}}}"+inp[b:]
gpu=R('g/a_pre.js')+R('src/01_math.js')+R('g/c_world.js')+R('g/d_gpu.js')+R('g/g_tex.js')+geo+"/* ── 桶狀海綿、海膽、硨磲 ── */\n"+m2+R('g/f_models.js')+R('g/h_pipes.js')+R('g/e_terrain.js')+R('g/i_scene.js')+R('g/j_life.js')+R('g/k_frame.js')+inp+R('g/m_run.js')
boot="""
// 啟動：支援 WebGPU 就用 WebGPU 版；沒有或初始化失敗，就換一張新畫布改用 WebGL2 版
(async function(){let ok=false;
  if(navigator.gpu&&!(location.hash||'').includes('gl2')){try{await startGPU();ok=true;}catch(e){console.warn('WebGPU 無法使用，改用 WebGL2：'+(e&&e.message||e));const c=document.getElementById('gl');c.replaceWith(c.cloneNode(false));}}
  if(!ok)startGL2();})();
"""
head=R('src/00_head.html')
head=sub1(head,'  <div class="ro"><span>航向</span><b id="roHead">000</b><i>°</i></div>','  <div class="ro"><span>航向</span><b id="roHead">000</b><i>°</i></div>\n  <div class="ro" id="roT" style="display:none"><span>時刻</span><b id="roTime">09:24</b></div>\n  <div class="ro"><span>繪圖</span><b id="rend" style="font-size:13px;letter-spacing:.04em">…</b><i id="roFps"></i></div>')
head=sub1(head,'  <button id="bQ" type="button">畫質 自動</button>','  <button id="bV" type="button" style="display:none">視點</button>\n  <button id="bT" type="button" style="display:none">時間 自動</button>\n  <button id="bQ" type="button">畫質 自動</button>')
head=sub1(head,'<dt>F ／ T ／ M</dt><dd>探照燈／自動巡航／聲音</dd>','<dt>F ／ T ／ M</dt><dd>探照燈／自動巡航／聲音</dd>\n      <dt class="gpuOnly" style="display:none">N</dt><dd class="gpuOnly" style="display:none">切換時間：自動日夜、正午、黃昏、夜晚、清晨</dd>\n      <dt class="gpuOnly" style="display:none">1 – 6</dt><dd class="gpuOnly" style="display:none">跳到六個視點</dd>')
head=sub1(head,'#hud{position:fixed;left:max(14px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));display:flex;gap:6px;pointer-events:none}','#hud{position:fixed;left:max(14px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));display:flex;flex-wrap:wrap;max-width:50vw;gap:6px;pointer-events:none}')
head=sub1(head,"<p>四十公尺高的海藻森林、珊瑚岩與石拱、深谷、沉船和石柱遺跡，都在這一個檔案裡。游過去看看，魚群會讓路。</p>","<p id=\"blurb\">四十公尺高的海藻森林、珊瑚岩與石拱、深谷、沉船和石柱遺跡，都在這一個檔案裡。游過去看看，魚群會讓路。</p>")
out=head+gl2+gpu+boot+R('src/99_tail.html')
open(os.path.join(d,'index.html'),'w',encoding='utf-8').write(out)
print(len(out.encode()))
