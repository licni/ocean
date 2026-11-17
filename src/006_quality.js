/* ───────── 畫質分級：所有裝置都從最高畫質開始，只有幀率明顯不足時才自動降一級，也可手動鎖定 ───────── */
const coarse=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const HASH=(location.hash||'').toLowerCase();
const FLAGS=HASH.slice(1).split('-'),lite=FLAGS.includes('lite'),tmode=FLAGS.includes('t'),forceLDR=FLAGS.includes('ldr');
const devMem=navigator.deviceMemory||8;
const BF=lite?.16:tmode?.4:1;            // 建造時的葉片密度
const QT=[{name:'高',leaf:1,msaa:4,steps:20,bloom:true,px:2.3e6,sh:4096,far:1},
          {name:'中',leaf:.62,msaa:0,steps:12,bloom:true,px:1.5e6,sh:2048,far:.85},
          {name:'低',leaf:.36,msaa:0,steps:8,bloom:false,px:.85e6,sh:1024,far:.7}];
let qAuto=true,qLevel=lite?2:tmode?1:0;
