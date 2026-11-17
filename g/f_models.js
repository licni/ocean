/* ───────── 第五版新增模型：稜角岩塊、層狀岩板、卵石、盤狀珊瑚（單層與多層）、腦紋珊瑚 ───────── */
function qRand(r){const u=r(),v=r()*TAU,w=r()*TAU,a=Math.sqrt(1-u),b=Math.sqrt(u);return[a*Math.sin(v),a*Math.cos(v),b*Math.sin(w),b*Math.cos(w)];}
// 稜角岩塊：凹凸不平的球體被幾個隨機平面削過，留下平整的斷面與稜線
function mChunk(seed,sub){const g=new Geo(),r=mulberry(seed*977+13),pl=[],np=5+((r()*3)|0);
  for(let i=0;i<np;i++){const n=norm([r()*2-1,(r()*2-1)*.8,r()*2-1]);pl.push([n[0],n[1],n[2],.60+.32*r()]);}
  blob(g,sub,p=>{const k=1+(vnoise3(p[0]*1.5+seed*3.1,p[1]*1.5,p[2]*1.5,seed)-.5)*.8+(sub>1?(vnoise3(p[0]*3.7,p[1]*3.7+seed,p[2]*3.7,seed+5)-.5)*.3:0);
    let x=p[0]*k,y=p[1]*k*.84,z=p[2]*k;
    for(const q of pl){const d=x*q[0]+y*q[1]+z*q[2]-q[3];if(d>0){x-=q[0]*d;y-=q[1]*d;z-=q[2]*d;}}
    if(sub>2){const e=(vnoise3(x*6+seed,y*6,z*6,seed+9)-.5)*.07;x+=p[0]*e;y+=p[1]*e;z+=p[2]*e;}
    const c=.88+.18*vnoise3(x*2,y*2,z*2,seed+2);return{p:[x,y,z],c:[c,c,c]};});
  return g.normals();}
// 層狀岩板：沿高度切成幾層，每層伸出的遠近不同，層與層之間是內縮的陡坎
function mSlab(seed,sub){const g=new Geo(),r=mulberry(seed*613+5),ext=[];for(let i=0;i<12;i++)ext.push(.72+.42*r());const F=2.6+r()*1.2,ph=r();
  blob(g,sub,p=>{const k=1+(vnoise3(p[0]*1.3+seed*1.7,p[1]*1.3,p[2]*1.3,seed+20)-.5)*.6;
    const h=p[1]*.5+.5,u=h*F+ph,li=Math.floor(u),lf=u-li,e=mix(ext[li%12],ext[(li+1)%12],sstep(.78,1,lf));
    const yq=((li+Math.min(lf/.78,1)-ph)/F-.5)*2;
    const x=p[0]*k*e,z=p[2]*k*e,y=yq*.62*k,c=(.80+.26*sstep(0,.7,lf))*(.9+.14*vnoise3(x*2,y*2,z*2,seed+3));
    return{p:[x,y,z],c:[c,c,c]};});
  return g.normals();}
// 卵石
function mPebble(seed){const g=new Geo();blob(g,1,p=>{const k=1+(vnoise3(p[0]*1.2+seed,p[1]*1.2,p[2]*1.2,seed+40)-.5)*.45;return{p:[p[0]*k,p[1]*k*.62,p[2]*k],c:[1,1,1]};});return g.normals();}
// 盤狀珊瑚：邊緣不規則的薄盤，略成碗狀，表面有同心的生長紋；可以單層，也可以高低錯落好幾層
function mPlate(seed,tiers){const g=new Geo(),r=mulberry(seed*31+7),SEG=28;
  const plate=(cx,cy,cz,R,cup,th,rot)=>{const lobes=[];for(let i=0;i<4;i++)lobes.push([2+((r()*4)|0),r()*TAU,.05+.10*r()]);
    const Rf=a=>{let k=1;for(const l of lobes)k+=l[2]*Math.sin(a*l[0]+l[1]);return k;};
    const base=g.n,top=[.07,.30,.54,.76,.92,1],und=[1,.90,.60,.20],rows=top.length+und.length;
    for(let k=0;k<rows;k++){const isTop=k<top.length,rr=isTop?top[k]:und[k-top.length];
      for(let j=0;j<SEG;j++){const a=j/SEG*TAU+rot,rad=R*rr*mix(1,Rf(a),rr),x=Math.cos(a)*rad,z=Math.sin(a)*rad;
        const wob=(vnoise3(x*2.2+seed,0,z*2.2,seed+60)-.5)*.09*rr*R;
        let y,c;
        if(isTop){y=cy+cup*rr*rr*R+wob+.016*R*Math.sin(rr*24);c=.60+.46*rr+(k===top.length-1?.22:0);}
        else{const ku=k-top.length;y=cy+cup*rr*rr*R+wob-th*(ku===0?.5:1)-(1-rr)*th*1.5;c=ku===0?.80:.30;}
        g.vert([cx+x,y,cz+z],[c,c,c]);}}
    for(let k=0;k<rows-1;k++)for(let j=0;j<SEG;j++){const a=base+k*SEG+j,b=base+k*SEG+(j+1)%SEG,c=a+SEG,d=b+SEG;g.i.push(a,d,b,a,c,d);}
    const ct=g.vert([cx,cy+.004,cz],[.58,.58,.58]);for(let j=0;j<SEG;j++)g.tri(ct,base+j,base+(j+1)%SEG);};
  if(tiers<=1){plate(0,.60,0,1,.13,.07,r()*TAU);g.lathe([[.24,-.08],[.20,.05],[.13,.28],[.15,.50],[.22,.58]],10,(t,k)=>{const c=.34+.22*t;return[c,c,c];});}
  else{let y=.34,R=1;const pts=[[0,-.08,0]];for(let i=0;i<tiers;i++){const ox=(r()-.5)*.5*R,oz=(r()-.5)*.5*R;plate(ox,y,oz,R,.10,.06,r()*TAU);pts.push([ox*.7,y-.03,oz*.7]);y+=.26+.12*r();R*=.72+.1*r();}
    g.tube(pts,pts.map((p,i)=>.2-.03*i),8,t=>{const c=.32+.2*t;return[c,c,c];},null,false);}
  return g.normals();}
// 腦紋珊瑚：一顆顆鼓起的瘤，瘤與瘤之間是暗的凹溝
function mBrain(seed){const g=new Geo(),r=mulberry(seed*71+3),pts=[];for(let i=0;i<16;i++)pts.push(norm([r()*2-1,r()*1.4-.2,r()*2-1]));
  blob(g,3,p=>{let d1=9,d2=9;for(const q of pts){const d=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
    const crease=sstep(0,.22,d2-d1),k=1+.15*crease-.05*d1+(vnoise3(p[0]*2+seed,p[1]*2,p[2]*2,seed+7)-.5)*.16;
    const y=p[1]>0?p[1]*.82:p[1]*.3,c=(.50+.52*crease)*(.62+.42*sstep(-.3,.9,p[1]));
    return{p:[p[0]*k,y*k,p[2]*k],c:[c,c,c]};});
  return g.normals();}
// 沉船（重做）：船殼有破洞、看得到裡面的肋骨；舷緣、破損的甲板、抬高的艉樓與艉板、主桅與帆桁、斷掉的前桅、倒在甲板上的桁木、船首斜桅
function mWreck2(){const g=new Geo(),L=26,W=3.7,D=4.3,K=26,J=12,ring=[];
  const sec=t=>{const w=W*Math.pow(Math.max(0,1-Math.pow(Math.abs(t-.42)/.58,2.3)),.62)*(t<.06?.55+t*7.5:1),d=D*(.72+.28*Math.sin(Math.PI*t)),top=1.1*(2*t-1)*(2*t-1);return{w:Math.max(w,.06),d,top};};
  const hole=(k,j)=>(k>=9&&k<=13&&j>=1&&j<=4&&!(k===9&&j>=3)&&!(k===13&&j<=2))||(k>=17&&k<=18&&j>=8&&j<=10)||(k===21&&j===3)||(k===5&&j===9);
  const zt=t=>-L/2+L*t,wood=k=>[.30*k,.22*k,.15*k];
  for(let k=0;k<=K;k++){const t=k/K,z=zt(t),s=sec(t),row=[];
    for(let j=0;j<=J;j++){const th=Math.PI*j/J,x=-s.w*Math.cos(th),y=s.top-s.d*Math.pow(Math.sin(th),.8),kk=.58+.46*(1-Math.sin(th))+.10*vnoise3(k*.7,j*.9,0,5);row.push(g.vert([x,y,z],wood(kk)));}
    ring.push(row);}
  for(let k=0;k<K;k++)for(let j=0;j<J;j++){if(hole(k,j))continue;g.quad(ring[k][j],ring[k+1][j],ring[k+1][j+1],ring[k][j+1]);}
  // 艉板
  {const s=sec(0),c=g.vert([0,s.top-s.d*.45,zt(0)],wood(.6));for(let j=0;j<J;j++)g.tri(c,ring[0][j],ring[0][j+1]);}
  // 肋骨
  for(let k=2;k<K-1;k+=2){const t=k/K,s=sec(t),z=zt(t),pts=[],rr=[];for(let j=0;j<=8;j++){const th=Math.PI*j/8;pts.push([-s.w*.95*Math.cos(th),s.top+.2-s.d*.95*Math.pow(Math.sin(th),.8),z]);rr.push(.10);}
    g.tube(pts,rr,5,()=>wood(.62),null,false);}
  // 龍骨與舷緣
  {const pts=[],rr=[];for(let k=0;k<=K;k++){const t=k/K,s=sec(t);pts.push([0,s.top-s.d-.12,zt(t)]);rr.push(.16);}g.tube(pts,rr,5,()=>wood(.5),null,true);}
  for(const sd of[-1,1]){const pts=[],rr=[];for(let k=0;k<=K;k++){const t=k/K,s=sec(t);pts.push([sd*s.w,s.top+.06,zt(t)]);rr.push(.12);}g.tube(pts,rr,5,()=>wood(.8),null,true);}
  // 甲板：一格格橫樑上的板，有幾處塌陷
  for(let k=6;k<K-2;k++){if(k===10||k===11||k===12||k===17||k===20)continue;const t0=k/K,t1=(k+1)/K,s0=sec(t0),s1=sec(t1),c=wood(.95+.12*(k%2));
    const a=g.vert([-s0.w*.92,s0.top-.42,zt(t0)],c),b=g.vert([s0.w*.92,s0.top-.42,zt(t0)],c),cc=g.vert([s1.w*.92,s1.top-.42,zt(t1)],c),d=g.vert([-s1.w*.92,s1.top-.42,zt(t1)],c);g.quad(a,b,cc,d);}
  for(let k=6;k<K-2;k+=2){const t=k/K,s=sec(t);g.tube([[-s.w*.94,s.top-.52,zt(t)],[s.w*.94,s.top-.52,zt(t)]],[.09,.09],4,()=>wood(.6),null,false);}
  // 艉樓：船尾六站抬高 1.5 m，前面一道有門洞的隔板
  {const KS=6,H=1.5;const tops=[];for(let k=0;k<=KS;k++){const t=k/K,s=sec(t),z=zt(t);tops.push([g.vert([-s.w*.96,s.top+.05,z],wood(.9)),g.vert([-s.w*.90,s.top+H,z],wood(1.05)),g.vert([s.w*.90,s.top+H,z],wood(1.05)),g.vert([s.w*.96,s.top+.05,z],wood(.9))]);}
    for(let k=0;k<KS;k++){const a=tops[k],b=tops[k+1];g.quad(a[0],b[0],b[1],a[1]);if(k!==2&&k!==3)g.quad(a[1],b[1],b[2],a[2]);g.quad(a[2],b[2],b[3],a[3]);}
    const a=tops[0];g.quad(a[0],a[1],a[2],a[3]);
    const f=tops[KS],sF=sec(KS/K),zF=zt(KS/K),dw=.55,p=(x,y)=>g.vert([x,y,zF],wood(.85));
    g.quad(f[0],p(-dw,sF.top+.05),p(-dw,sF.top+H),f[1]);g.quad(p(dw,sF.top+.05),f[3],f[2],p(dw,sF.top+H));g.quad(p(-dw,sF.top+1.15),p(dw,sF.top+1.15),p(dw,sF.top+H),p(-dw,sF.top+H));
    for(const sd of[-1,1]){const pts=[],rr=[];for(let k=0;k<=KS;k++){const t=k/K,s=sec(t);pts.push([sd*s.w*.9,s.top+H+.05,zt(t)]);rr.push(.09);}g.tube(pts,rr,4,()=>wood(.8),null,true);}}
  const mast=t=>wood(1-.25*t);
  // 主桅、帆桁與瞭望台
  g.tube([[0,-1.4,2.5],[0,5,2.6],[.12,13.4,2.9]],[.27,.22,.12],8,mast,null,true);
  g.tube([[-3.6,9.3,2.85],[0,9.7,2.78],[3.6,9.3,2.85]],[.07,.11,.07],5,mast,null,true);
  g.tube([[-2.3,5.9,2.7],[0,6.1,2.66],[2.3,5.9,2.7]],[.06,.09,.06],5,mast,null,true);
  g.lathe([[.24,7.3],[.62,7.45],[.66,8.0],[.58,8.0],[.56,7.55],[.24,7.45]],10,()=>wood(.75),null,[.05,0,2.72]);
  // 斷掉的前桅、倒下的桁木、後桅殘樁、船首斜桅
  g.tube([[0,-1,8.0],[.05,2.6,8.05],[.5,4.1,8.2]],[.22,.19,.15],7,mast,null,true);
  g.tube([[-2.6,.9,5.2],[.4,1.25,7.4],[2.9,2.0,9.4]],[.10,.12,.08],5,mast,null,true);
  g.tube([[0,.4,-9.2],[0,3.3,-9.3],[-.3,4.4,-9.5]],[.19,.16,.12],7,mast,null,true);
  g.tube([[0,.9,L/2-1.4],[0,1.7,L/2+1.2],[0,2.5,L/2+3.6]],[.14,.10,.05],5,mast,null,true);
  return g.normals();}
// 石柱（重做）：有凹槽的柱身、微微鼓起、一節節石鼓的接縫、方形柱礎與柱頭；斷柱頂端參差不齊
function mColumn2(broken){const g=new Geo(),H=broken?1.6+broken:5.4,SEG=32,rows=[];
  const prof=[[.70,0,0],[.70,.20,0],[.56,.30,0],[.47,.42,1]];const n=10;
  for(let i=1;i<=n;i++){const t=i/n,y=.42+(H-.92)*t;prof.push([.47-.07*t+.025*Math.sin(Math.PI*t),y,1]);}
  if(!broken)prof.push([.46,H-.44,0],[.60,H-.30,0],[.63,H-.14,0]);
  for(const p of prof){const row=[];for(let j=0;j<SEG;j++){const a=j/SEG*TAU,fl=p[2]?1-.055*(.5+.5*Math.cos(a*16)):1,jn=p[2]?1-.02*Math.pow(Math.abs(Math.sin(p[1]*2.6)),24):1;
      let y=p[1];if(broken&&p[1]>H-.7)y+=(vnoise3(Math.cos(a)*2,0,Math.sin(a)*2,9)-.5)*.9;
      const c=(.80+.22*((Math.floor(p[1]*.83)*7)%3)/2)*(p[2]?.86+.14*Math.cos(a*16):1);row.push(g.vert([Math.cos(a)*p[0]*fl*jn,y,Math.sin(a)*p[0]*fl*jn],[c,c,c*.97]));}rows.push(row);}
  for(let k=0;k<rows.length-1;k++)for(let j=0;j<SEG;j++)g.quad(rows[k][j],rows[k+1][j],rows[k+1][(j+1)%SEG],rows[k][(j+1)%SEG]);
  const top=rows[rows.length-1],ct=g.vert([0,broken?H-.25:H-.14,0],[.7,.7,.68]);for(let j=0;j<SEG;j++)g.tri(ct,top[j],top[(j+1)%SEG]);
  g.box([0,-.06,0],[.80,.10,.80],[.82,.82,.80]);if(!broken)g.box([0,H-.07,0],[.72,.09,.72],[.9,.9,.88]);
  return g.normals();}
