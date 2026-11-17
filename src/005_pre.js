(function(){
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('gl');
function fail(msg){const e=$('err');e.textContent=msg;e.style.display='flex';$('intro').style.display='none';}
const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance'});
if(!gl){fail('這個瀏覽器不支援 WebGL2，無法顯示海底世界。請改用新版 Chrome、Edge、Firefox 或 Safari 開啟。');return;}

