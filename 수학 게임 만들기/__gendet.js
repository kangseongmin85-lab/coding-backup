const fs=require('fs');
const b64=fs.readFileSync('소스 그림들.png').toString('base64');
const script=`
const img=new Image();
img.onload=()=>{try{
const W=img.naturalWidth,H=img.naturalHeight;
const cv=document.getElementById('c');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0);
const d=ctx.getImageData(0,0,W,H).data;const idx=(x,y)=>(y*W+x)*4;
// background = sample several cream spots
const bs=[[1390,740],[20,740],[700,250]].map(([x,y])=>{const i=idx(x,y);return [d[i],d[i+1],d[i+2]];});
const bg=[0,1,2].map(k=>Math.round(bs.reduce((s,c)=>s+c[k],0)/bs.length));
const isContent=(x,y)=>{const i=idx(x,y);if(d[i+3]<40)return false;const dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2];return (dr*dr+dg*dg+db*db)>3200;};
const Y0=238; // skip title row
const mask=new Uint8Array(W*H);
for(let y=Y0;y<H;y++)for(let x=0;x<W;x++) if(isContent(x,y)) mask[y*W+x]=1;
// dilate a little to bridge internal gaps
const lab=new Int32Array(W*H);let cur=0;const blobs=[];const st=[];
for(let y=Y0;y<H;y++)for(let x=0;x<W;x++){if(mask[y*W+x]&&!lab[y*W+x]){cur++;let minx=x,maxx=x,miny=y,maxy=y,n=0;st.push(x,y);lab[y*W+x]=cur;
 while(st.length){const yy=st.pop(),xx=st.pop();n++;if(xx<minx)minx=xx;if(xx>maxx)maxx=xx;if(yy<miny)miny=yy;if(yy>maxy)maxy=yy;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=xx+dx,bb=yy+dy;if(a>=0&&bb>=Y0&&a<W&&bb<H&&mask[bb*W+a]&&!lab[bb*W+a]){lab[bb*W+a]=cur;st.push(a,bb);}}}
 blobs.push({x:minx,y:miny,w:maxx-minx+1,h:maxy-miny+1,n});}}
const cand=blobs.filter(b=>b.w>44&&b.h>44&&b.w<210&&b.h<210&&b.n>900).sort((a,b)=>(Math.round(a.y/40)-Math.round(b.y/40))||(a.x-b.x));
ctx.lineWidth=3;ctx.strokeStyle='#ff1466';ctx.font='bold 22px monospace';ctx.fillStyle='#ff1466';
cand.forEach((b,i)=>{ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#000';ctx.fillRect(b.x,b.y,26,22);ctx.fillStyle='#fff';ctx.fillText(i,b.x+3,b.y+18);ctx.fillStyle='#ff1466';});
document.getElementById('out').textContent='RES '+JSON.stringify(cand.map((b,i)=>({i,x:b.x,y:b.y,w:b.w,h:b.h})));
}catch(e){document.getElementById('out').textContent='ERR '+e.message;}};
img.src='data:image/png;base64,${b64}';
`;
const html='<!doctype html><html><head><meta charset=utf-8><style>body{margin:0}#out{font:10px monospace;word-break:break-all}</style></head><body><canvas id=c style="width:1408px;display:block"></canvas><pre id=out>w</pre><script>'+script+'<\/script></body></html>';
fs.writeFileSync('__det.html',html);console.log('ok');
