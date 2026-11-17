async function startGPU(){
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('gl');
function fail(msg){const e=$('err');e.textContent=msg;e.style.display='flex';$('intro').style.display='none';}
const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
if(!adapter)throw new Error('no adapter');
const device=await adapter.requestDevice();
device.pushErrorScope('validation');const compileP=[];
const ctx=canvas.getContext('webgpu');
if(!ctx)throw new Error('no webgpu context');
const CFMT=navigator.gpu.getPreferredCanvasFormat();
ctx.configure({device,format:CFMT,alphaMode:'opaque'});
let gpuErr=null,lost=false;
device.addEventListener('uncapturederror',e=>{if(!gpuErr)gpuErr=e.error.message;console.error('WebGPU: '+e.error.message);});
device.lost.then(i=>{lost=true;console.error('device lost: '+i.reason+' '+i.message);if(i.reason==='destroyed')return;
  // 顯示卡驅動重置（多半是負載超過這張卡的能力）：自動降一級畫質重新載入；最低一級還不行，就改用 WebGL2 版
  try{if(!FLAGS.includes('off')&&!FLAGS.includes('nof')){location.hash=qLevel>=QMAX?'#gl2':'#q'+(qLevel+1);location.reload();return;}}catch(e){}
  fail('繪圖裝置中斷了，請重新整理頁面再試一次。');});
/* ───────── 畫質分級：所有裝置都從最高畫質開始，只有幀率明顯不足時才自動降一級，也可手動鎖定 ───────── */
const coarse=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const FLAGS=(location.hash||'').toLowerCase().slice(1).split('-'),lite=FLAGS.includes('lite'),tmode=FLAGS.includes('t');
const BF=lite?.14:tmode?.4:1;
// steps＝體積光每條視線的取樣數；ao＝環境遮蔽取樣數；sh／shN＝遠景／近景陰影圖邊長；dyn＝會動的投影者（2 全部、1 不含地被、0 只有岩石與海藻）
const QT=[{name:'極致',leaf:1,msaa:4,steps:44,bloom:true,ao:16,px:8.3e6,sh:4096,shN:4096,far:1,dyn:2},
          {name:'高',leaf:1,msaa:4,steps:26,bloom:true,ao:10,px:2.6e6,sh:4096,shN:2048,far:1,dyn:2},
          {name:'中',leaf:.62,msaa:1,steps:14,bloom:true,ao:0,px:1.6e6,sh:2048,shN:2048,far:.85,dyn:1},
          {name:'低',leaf:.36,msaa:1,steps:8,bloom:false,ao:0,px:.9e6,sh:2048,shN:1024,far:.7,dyn:0}];
const QMAX=QT.length-1;
const qFlag=FLAGS.find(f=>/^q[0-3]$/.test(f));
let qAuto=true,qLevel=qFlag?+qFlag[1]:lite?3:tmode?2:0;
