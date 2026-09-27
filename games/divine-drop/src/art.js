const sets={
  animals:'dog bear dinosaur cat rabbit fox deer fish turtle penguin animal horse bird lizard pegasus unicorn dragon phoenix griffin sea_dragon nine_tail_fox'.split(' '),
  food:'cake bread cookie pizza ice_cream chocolate pudding candy juice donut fruit milk sugar cocoa cream cheese honey flour dough'.split(' '),
  crystal:'crystal gem philosopher_stone ice crystal_ball glass lens'.split(' '),
  metal:'metal gold armor magic_shield battery phone screen computer console circuit engine machine robot car train tank cart'.split(' '),
};
const cache=new Map();
const photos=new Map();
const toys=new Map();
export async function prepareAssets(data){
  const response=await fetch('assets/generated/manifest.json');if(!response.ok)throw Error('Missing photo atlas manifest');
  const manifest=await response.json();
  await Promise.all([...manifest.sheets,...(manifest.toySheets||[])].map(async sheet=>{
    const image=new Image();image.src=sheet.path;await image.decode();
    const columns=sheet.columns||4,rows=sheet.rows||4;
    const cellW=image.naturalWidth/columns,cellH=image.naturalHeight/rows;
    const rowCuts=Array.from({length:rows+1},(_,r)=>Math.round(r*cellH));
    if(sheet.autoRows){
      const sheetCanvas=document.createElement('canvas');sheetCanvas.width=image.naturalWidth;sheetCanvas.height=image.naturalHeight;const sheetContext=sheetCanvas.getContext('2d');sheetContext.drawImage(image,0,0);const rgba=sheetContext.getImageData(0,0,sheetCanvas.width,sheetCanvas.height).data;
      const density=new Float32Array(sheetCanvas.height);for(let y=0;y<sheetCanvas.height;y++)for(let x=0;x<sheetCanvas.width;x++)if(rgba[(y*sheetCanvas.width+x)*4+3]>64)density[y]++;
      for(let r=1;r<rows;r++){let best=Infinity;for(let y=Math.round(r*cellH-cellH*.22);y<r*cellH+cellH*.22;y++){const value=density[y-1]+density[y]+density[y+1];if(value<best){best=value;rowCuts[r]=y;}}}
    }
    for(let i=0;i<sheet.ids.length;i++){
      const row=Math.floor(i/columns),y0=rowCuts[row],heightInSheet=rowCuts[row+1]-y0;
      const cut=document.createElement('canvas');cut.width=Math.floor(cellW);cut.height=heightInSheet;const cx=cut.getContext('2d');
      cx.drawImage(image,(i%columns)*cellW,y0,cellW,heightInSheet,0,0,cut.width,cut.height);
      const rgba=cx.getImageData(0,0,cut.width,cut.height).data;let left=cut.width,top=cut.height,right=0,bottom=0;
      for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(rgba[(y*cut.width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(left>right)throw Error('Empty photographic sprite '+sheet.ids[i]);
      const width=right-left+1,height=bottom-top+1,scale=232/Math.max(width,height);
      const out=document.createElement('canvas');out.width=out.height=256;const paint=out.getContext('2d');
      paint.drawImage(cut,left,top,width,height,(256-width*scale)/2,(256-height*scale)/2,width*scale,height*scale);
      (sheet.toy?toys:photos).set(sheet.ids[i],out);
    }
  }));
  for(const item of data.items)if(!photos.has(item.id))throw Error('Missing photographic sprite '+item.id);
}
function materialize(canvas,item){
  const c=canvas.getContext('2d');const pixels=c.getImageData(0,0,160,160);const random=rng(seed(item.id));
  const metal=sets.metal.includes(item.id)||['gold','sword','magic_sword'].includes(item.id);
  const crystal=sets.crystal.includes(item.id);const fur=sets.animals.includes(item.id);
  const wood=['wood','tree','forest','wand'].includes(item.id);const food=sets.food.includes(item.id);
  for(let y=0;y<160;y++)for(let x=0;x<160;x++){
    const n=(y*160+x)*4;if(!pixels.data[n+3])continue;
    // Shade the object surface, not a spherical container around it.
    const u=(x-80)/80,v=(y-80)/80;
    const alpha=(xx,yy)=>xx<0||yy<0||xx>=160||yy>=160?0:pixels.data[(yy*160+xx)*4+3]/255;
    const edgeLight=(alpha(x+3,y)+alpha(x,y+3)-alpha(x-3,y)-alpha(x,y-3))*.1;
    const light=Math.max(0,Math.min(1,.78-u*.1-v*.14+edgeLight));
    let grain=(random()-.5)*(fur?20:food?14:7);
    if(wood)grain+=Math.sin(x*.6+Math.sin(y*.04)*6)*7;
    if(fur)grain+=Math.sin(x*1.9+y*.31)*4;
    const spec=metal?Math.pow(light,20)*55:crystal?Math.pow(light,32)*70:Math.pow(light,14)*14;
    const shade=.67+light*.36;
    for(let channel=0;channel<3;channel++)pixels.data[n+channel]=Math.max(0,Math.min(255,pixels.data[n+channel]*shade+grain+spec));
  }
  c.putImageData(pixels,0,0);
}
function seed(id){return [...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);}
function rng(s){return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function line(c,points,color,width=3){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function polygon(c,points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function rect(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
function star(c,x,y,r,fill){const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.3:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}polygon(c,pts,fill);}
function symbol(c,item,toy){
  const id=item.id;const dark='#4c5145',light='#fff4d9',cream='#e5d3a8';
  if(id==='fire'||id==='lava'){c.beginPath();c.moveTo(0,-28);c.bezierCurveTo(21,-2,18,2,20,12);c.bezierCurveTo(15,35,-20,32,-21,10);c.bezierCurveTo(-22,-4,-9,-8,-10,-20);c.bezierCurveTo(-4,-14,-4,-8,0,-28);c.fillStyle='#e88c43';c.fill();ellipse(c,1,14,8,11,'#ffe4a0');return;}
  if(id==='water'){c.beginPath();c.moveTo(0,-28);c.bezierCurveTo(7,-13,23,0,21,14);c.bezierCurveTo(17,37,-22,33,-21,13);c.bezierCurveTo(-20,0,-8,-15,0,-28);c.fillStyle='#74b6c9';c.fill();ellipse(c,-8,11,4,7,'#dff8f2');return;}
  if(['air','wind','wind_spirit','steam'].includes(id)){for(let i=0;i<3;i++){c.beginPath();c.moveTo(-26,12-i*12);c.bezierCurveTo(-2,16-i*12,24,12-i*12,20,4-i*12);c.bezierCurveTo(16,-2-i*12,9,2-i*12,11,6-i*12);c.strokeStyle='#83a99f';c.lineWidth=4-i*.5;c.lineCap='round';c.stroke();}return;}
  if(id==='earth'||id==='mountain'||id==='stone'||id==='mud'||id==='sand'){polygon(c,[[-29,18],[-10,-21],[3,0],[14,-13],[30,20]],id==='earth'?'#e5e4b5':'#e0d8bd');polygon(c,[[-10,-21],[-17,-7],[-9,-10],[-4,-5]],'#f5edd1');if(id==='earth')line(c,[[-20,20],[-7,17],[15,23],[29,19]],'#899866',3);return;}
  if(sets.animals.includes(id)){
    const bird=['bird','penguin','phoenix','griffin'].includes(id),reptile=['lizard','dinosaur','dragon','sea_dragon','turtle'].includes(id);
    if(id==='fish'){ellipse(c,-2,1,24,16,'#f7d49d');polygon(c,[[17,0],[32,-16],[32,17]],'#dfbc81');ellipse(c,-14,-2,3,3,dark);line(c,[[-3,-10],[3,0],[-3,10]],'#bd9e6a',2);return;}
    if(id==='turtle'){ellipse(c,0,4,22,24,'#638965');ellipse(c,0,-22,10,10,'#c8d69e');for(const x of [-22,22])for(const y of [-10,20])ellipse(c,x,y,7,9,'#c8d69e');line(c,[[-15,-2],[0,-12],[15,-2],[15,13],[0,23],[-15,13],[-15,-2]],'#bdd29c',2);return;}
    if(['pegasus','dragon','griffin','phoenix'].includes(id)){polygon(c,[[-13,5],[-33,-21],[-30,10],[-18,22]],light);polygon(c,[[13,5],[33,-21],[30,10],[18,22]],light);}
    if(id==='rabbit'){ellipse(c,-12,-22,7,19,light);ellipse(c,12,-22,7,19,light);ellipse(c,-12,-23,3,12,'#d5aa98');ellipse(c,12,-23,3,12,'#d5aa98');}
    else if(['cat','fox','nine_tail_fox'].includes(id)){polygon(c,[[-23,-4],[-25,-29],[-5,-14]],light);polygon(c,[[23,-4],[25,-29],[5,-14]],light);}
    else if(id==='deer'){for(const sign of [-1,1]){line(c,[[sign*13,-13],[sign*17,-32],[sign*27,-36]],cream,4);line(c,[[sign*17,-29],[sign*8,-36]],cream,3);}}
    else if(!bird&&!reptile){ellipse(c,-21,-14,9,id==='dog'?17:10,cream);ellipse(c,21,-14,9,id==='dog'?17:10,cream);}
    ellipse(c,0,4,bird?20:25,bird?28:23,bird?'#526f73':reptile?'#90b392':light);
    if(bird)ellipse(c,0,9,15,20,'#f9edcf');
    if(['unicorn','pegasus'].includes(id))polygon(c,[[-5,-17],[0,-39],[5,-17]],'#d6ac6b');
    if(reptile){for(let i=0;i<3;i++)polygon(c,[[-10+i*10,-16],[-7+i*10,-29],[-3+i*10,-16]],'#eddb9c');}
    if(id==='fox'||id==='nine_tail_fox'){polygon(c,[[-24,-5],[0,11],[-10,24]],'#dba06b');polygon(c,[[24,-5],[0,11],[10,24]],'#dba06b');}
    ellipse(c,-9,1,2.8,3.8,dark);ellipse(c,9,1,2.8,3.8,dark);
    if(bird)polygon(c,[[-6,9],[6,9],[0,15]],'#dba859');else {ellipse(c,0,11,4,3,dark);line(c,[[-5,17],[0,19],[5,17]],'#ad9980',1.5);}
    if(toy){ellipse(c,-16,10,4,2.4,'#e3ad97aa');ellipse(c,16,10,4,2.4,'#e3ad97aa');}return;
  }
  if(sets.food.includes(id)){
    if(id==='cake'){rect(c,-25,-9,50,34,5,'#dfb075');rect(c,-25,-10,50,10,4,light);rect(c,-25,10,50,5,0,'#9c6451');line(c,[[0,-10],[0,-24]],'#d69a89',4);ellipse(c,0,-28,3,5,'#fff1ae');}
    else if(id==='bread'||id==='dough'){rect(c,-27,-17,54,39,15,'#efd098');for(let i=0;i<3;i++)line(c,[[-16+i*14,-10],[-23+i*14,3]],'#bc8c5a',3);}
    else if(id==='pizza'||id==='cheese'){polygon(c,[[-25,23],[0,-29],[27,23]],'#f4d993');if(id==='pizza')line(c,[[-24,23],[25,23]],'#b98152',6);for(const [x,y] of [[0,-4],[-9,11],[13,13]])ellipse(c,x,y,5,5,id==='pizza'?'#b75f49':'#cfac67');}
    else if(id==='ice_cream'){polygon(c,[[-15,3],[15,3],[0,32]],'#ca9b67');ellipse(c,0,-7,20,20,light);ellipse(c,-7,-13,12,13,'#e9bac0');}
    else if(id==='donut'||id==='cookie'){ellipse(c,0,0,27,27,'#e0b57e');if(id==='donut'){ellipse(c,0,-2,24,22,'#e4a6a0');c.save();c.globalCompositeOperation='destination-out';ellipse(c,0,0,9,9,'#000');c.restore();}for(const [x,y] of [[-14,-8],[13,10],[8,-15],[-12,14]])ellipse(c,x,y,2.5,2.5,'#8a6654');}
    else if(id==='candy'){polygon(c,[[-14,0],[-31,-14],[-31,15]],'#f3e0b7');polygon(c,[[14,0],[31,-14],[31,15]],'#f3e0b7');ellipse(c,0,0,18,18,'#e9a1a0');line(c,[[-8,-12],[8,12]],light,5);}
    else if(id==='chocolate'){rect(c,-23,-28,46,56,4,'#754b3c');for(let x=-19;x<20;x+=14)for(let y=-24;y<24;y+=17)rect(c,x,y,11,13,2,'#a66e4e');}
    else if(['juice','milk','honey','cream','sugar','flour'].includes(id)){rect(c,-18,-19,36,47,6,'#e9e5cb');rect(c,-17,-5,34,30,4,id==='juice'?'#e7af6d':id==='honey'?'#c5a15b':'#fff3d5');rect(c,-12,-28,24,10,2,'#b8c7ad');if(id==='juice')line(c,[[5,2],[9,-31],[19,-31]],'#859e7a',3);}
    else if(id==='fruit'||id==='cocoa'){ellipse(c,-9,4,16,22,id==='fruit'?'#c98264':'#977451');ellipse(c,8,4,16,22,id==='fruit'?'#d9916d':'#aa8860');line(c,[[0,-13],[5,-28]],'#728253',4);ellipse(c,11,-23,10,5,'#98b17e');}
    else {polygon(c,[[-23,23],[-15,-15],[15,-15],[23,23]],light);ellipse(c,0,-15,15,5,'#a67750');}return;
  }
  if(sets.crystal.includes(id)){polygon(c,[[0,-31],[22,-14],[26,17],[0,31],[-26,17],[-22,-14]],id==='ice'?'#d8ece5':'#dce1ee');polygon(c,[[0,-31],[4,0],[-26,17],[-22,-14]],'#ffffff8c');polygon(c,[[4,0],[22,-14],[26,17],[0,31]],'#8da6b788');line(c,[[0,-31],[4,0],[0,31]],'#fff8e6aa',1.5);star(c,15,-18,8,'#fff9e4');return;}
  if(['tree','forest','plant','forest_spirit','wheat'].includes(id)){
    if(id==='wheat'){line(c,[[0,30],[0,-27]],'#f5dfaa',3);for(let y=-19;y<20;y+=10){ellipse(c,-7,y,8,4,'#f4db9d');ellipse(c,7,y+3,8,4,'#e2c686');}}
    else {line(c,[[0,29],[0,-13]],'#99805b',7);ellipse(c,-12,-9,16,17,'#acc492');ellipse(c,10,-14,17,20,'#d2dfb3');ellipse(c,0,-27,12,12,'#e4e8c0');if(id==='forest'){ellipse(c,-23,4,9,13,'#c8dbaa');ellipse(c,24,2,9,13,'#b4c695');}}return;
  }
  if(['cloud','rain'].includes(id)){ellipse(c,-16,1,14,14,light);ellipse(c,0,-6,17,20,light);ellipse(c,18,1,14,13,light);rect(c,-19,2,40,12,5,light);if(id==='rain')for(let x=-15;x<=15;x+=15)line(c,[[x,21],[x-3,29]],'#9ab9c1',3);return;}
  if(id==='sun'){for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,[[Math.cos(a)*23,Math.sin(a)*23],[Math.cos(a)*31,Math.sin(a)*31]],'#f9e5aa',3);}ellipse(c,0,0,17,17,'#fff2b5');return;}
  if(id==='rainbow'){['#cc9484','#e8bb83','#e8d591','#a6bda0','#a4b5c8'].forEach((col,i)=>{c.beginPath();c.arc(0,16,30-i*5,Math.PI,0);c.strokeStyle=col;c.lineWidth=5;c.stroke();});return;}
  if(id==='lightning'||id==='electricity'){polygon(c,[[3,-31],[-20,6],[-2,3],[-8,32],[23,-8],[5,-5]],'#fff2b5');return;}
  if(['magic','life','slime'].includes(id)){if(id==='slime'){ellipse(c,0,7,28,22,'#b8d6b8');ellipse(c,-9,5,3,4,dark);ellipse(c,9,5,3,4,dark);}else{star(c,0,0,31,light);star(c,-22,18,8,'#e2cc91');star(c,24,-21,7,'#d9c597');}return;}
  if(id==='human'){ellipse(c,0,-15,12,12,light);rect(c,-16,1,32,28,12,'#e4c89c');return;}
  if(['wand','magic_sword','sword','tool'].includes(id)){c.save();c.rotate(.55);rect(c,-4,-28,8,47,2,light);rect(c,-12,8,24,6,2,'#dab876');rect(c,-5,14,10,17,3,'#907659');if(id==='wand')star(c,0,-24,15,'#fff0b4');c.restore();return;}
  if(id==='crown'){polygon(c,[[-28,-20],[-12,-1],[0,-25],[12,-1],[28,-20],[21,24],[-21,24]],'#f2d393');for(const x of [-15,0,15])ellipse(c,x,13,3,4,'#a598b3');return;}
  if(id==='potion'){rect(c,-9,-29,18,18,3,'#ebdfc0');ellipse(c,0,9,24,24,'#cadbd3');ellipse(c,0,14,21,16,'#b6a3c9');star(c,8,6,8,light);return;}
  if(id==='spellbook'||id==='leather'||id==='cloth'||id==='carpet'){rect(c,-23,-27,46,54,id==='carpet'?1:5,id==='leather'?'#b49470':'#d6c3a3');rect(c,-17,-22,35,43,3,id==='spellbook'?'#8d9e94':'#e8d7b8');if(id==='spellbook')star(c,1,0,17,'#f2deb1');else for(let y=-15;y<=15;y+=8)line(c,[[-13,y],[14,y]],'#ba9f77',2);return;}
  if(id==='portal'){c.beginPath();c.ellipse(0,0,24,31,0,0,Math.PI*2);c.strokeStyle='#f0d9a9';c.lineWidth=7;c.stroke();ellipse(c,0,0,17,24,'#a9a3c3');star(c,0,0,14,'#f3e8c9');return;}
  if(['rocket','airplane','drone','satellite','propeller','wing','antenna'].includes(id)){
    if(id==='rocket'){polygon(c,[[-12,12],[-24,26],[-23,3],[-8,-8]],'#c99a80');polygon(c,[[12,12],[24,26],[23,3],[8,-8]],'#c99a80');ellipse(c,0,-2,13,29,light);ellipse(c,0,-9,6,7,'#8aa9b5');polygon(c,[[-7,25],[0,37],[7,25]],'#e8b979');}
    else if(id==='satellite'){rect(c,-8,-16,16,32,3,light);for(const x of [-32,15]){rect(c,x,-21,17,41,2,'#658995');for(let y=-14;y<20;y+=10)line(c,[[x+2,y],[x+15,y]],'#b5cecd',1);}line(c,[[0,-16],[8,-30]],cream,3);}
    else if(id==='drone'||id==='propeller'){line(c,[[-23,-17],[23,17]],light,5);line(c,[[23,-17],[-23,17]],light,5);for(const x of [-24,24])for(const y of [-18,18])ellipse(c,x,y,12,6,'#c2d4c9');rect(c,-10,-8,20,16,5,'#e6dfbd');}
    else if(id==='antenna'){line(c,[[0,28],[0,-20]],light,5);c.beginPath();c.arc(0,-7,21,.1,Math.PI-.1);c.strokeStyle=light;c.lineWidth=5;c.stroke();ellipse(c,0,-22,4,4,'#e6c69c');}
    else {polygon(c,[[0,-31],[7,-4],[31,15],[29,20],[6,12],[5,27],[-5,27],[-6,12],[-29,20],[-31,15],[-7,-4]],light);}return;
  }
  if(id==='wheel'){ellipse(c,0,0,27,27,'#6b7468');ellipse(c,0,0,18,18,'#dad7bc');for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,[[0,0],[Math.cos(a)*17,Math.sin(a)*17]],'#919783',3);}return;}
  if(id==='wood'||id==='rail'){rect(c,-28,-18,56,36,5,'#e3c18b');for(let y=-10;y<=10;y+=10)line(c,[[-22,y],[0,y+3],[22,y-2]],'#a78660',2);if(id==='rail')for(const y of [-20,20])line(c,[[-31,y],[31,y]],'#e5e5cd',5);return;}
  if(sets.metal.includes(id)){
    if(['robot','machine'].includes(id)){rect(c,-24,-18,48,39,8,'#d5e2d8');rect(c,-18,-10,36,15,5,'#6f979c');ellipse(c,-9,-3,3,3,light);ellipse(c,9,-3,3,3,light);line(c,[[-9,13],[9,13]],'#7e9d99',3);line(c,[[0,-18],[0,-29]],'#e4d7ad',3);ellipse(c,0,-31,4,4,'#ddaf89');}
    else if(['car','train','tank','cart'].includes(id)){rect(c,-29,-6,58,27,7,'#cfddd1');rect(c,-17,-21,34,24,6,'#b7ccd0');rect(c,-12,-16,24,12,3,'#698c95');ellipse(c,-18,22,8,8,'#606e64');ellipse(c,18,22,8,8,'#606e64');if(id==='tank')line(c,[[0,-18],[29,-22]],'#d9dfc9',6);}
    else if(['phone','screen','computer','console','battery','circuit'].includes(id)){const w=id==='phone'||id==='battery'?29:53;rect(c,-w/2,-24,w,48,5,'#e2e5d3');rect(c,-w/2+5,-18,w-10,32,2,'#739a9b');if(id==='console'){ellipse(c,-18,0,4,4,'#f4dfb5');ellipse(c,18,0,4,4,'#f4dfb5');}else line(c,[[-6,1],[0,6],[8,-7]],'#dbe8ce',3);ellipse(c,0,20,2,2,'#8b9b8d');}
    else {polygon(c,[[-24,-19],[15,-26],[28,-11],[24,22],[-15,28],[-28,12]],id==='gold'?'#edd091':'#d9ddd1');line(c,[[-23,-16],[13,-22],[20,-14]],'#fff9e0aa',3);if(id==='magic_shield')star(c,0,0,18,'#b6ad88');}return;
  }
  // Engine and less common raw materials retain a distinct deterministic embossed motif.
  const random=rng(seed(id));for(let n=0;n<4;n++){const x=(random()-.5)*37,y=(random()-.5)*37;ellipse(c,x,y,6+random()*8,6+random()*8,light);}star(c,0,0,12,'#b2b996');
}
export function sprite(item,{toy=false,ghost=false}={}){
  if(!toy&&!ghost&&photos.has(item.id))return photos.get(item.id);
  if(toy&&toys.has(item.id)){
    if(!ghost)return toys.get(item.id);
    const key=`photo-toy-ghost:${item.id}`;if(cache.has(key))return cache.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.drawImage(toys.get(item.id),0,0);c.globalCompositeOperation='source-in';c.fillStyle='#c5b58e';c.fillRect(0,0,256,256);cache.set(key,canvas);return canvas;
  }
  const key=`${item.id}:${toy}:${ghost}`;if(cache.has(key))return cache.get(key);
  const shape=document.createElement('canvas');shape.width=shape.height=160;const ink=shape.getContext('2d');
  ink.translate(80,80);ink.scale(1.5,1.5);symbol(ink,item,toy);
  // Fit the actual silhouette into the existing visual footprint, leaving all surrounding pixels transparent.
  const pixels=ink.getImageData(0,0,160,160).data;let left=160,top=160,right=0,bottom=0;
  for(let y=0;y<160;y++)for(let x=0;x<160;x++)if(pixels[(y*160+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const cx=(left+right)/2,cy=(top+bottom)/2;let radius=1;
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(pixels[(y*160+x)*4+3]>16)radius=Math.max(radius,Math.hypot(x-cx,y-cy));
  const scale=70/radius;
  const surface=document.createElement('canvas');surface.width=surface.height=160;const paint=surface.getContext('2d');paint.drawImage(shape,80-cx*scale,80-cy*scale,160*scale,160*scale);
  if(!toy&&!ghost)materialize(surface,item);
  if(ghost){paint.globalCompositeOperation='source-in';paint.fillStyle='#c5c6b4';paint.fillRect(0,0,160,160);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const c=canvas.getContext('2d');
  if(!ghost){c.shadowColor='#34433035';c.shadowBlur=toy?2:3;c.shadowOffsetY=2;}
  c.drawImage(surface,0,0);
  cache.set(key,canvas);return canvas;
}
export function paintIcon(canvas,item,options={}){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(sprite(item,options),0,0,canvas.width,canvas.height);}
export function familySVG(count){const happy=count>=5;return `<svg viewBox="0 0 220 145" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="함께 웃는 남매"><ellipse cx="111" cy="134" rx="86" ry="7" fill="#dcd9c3" opacity=".5"/><path d="M25 128Q27 86 64 91Q92 95 90 130" fill="#d1b68a"/><path d="M126 130Q128 91 161 92Q192 94 191 130" fill="#9eae8b"/><path d="M29 70Q27 19 62 23Q105 18 94 81L27 91Z" fill="#695c4b"/><ellipse cx="63" cy="67" rx="29" ry="33" fill="#efd6ae"/><path d="M30 58Q25 23 61 22Q95 20 94 53Q73 52 58 36Q46 54 30 58" fill="#695c4b"/><path d="M129 53Q127 20 161 22Q199 24 192 65L130 71Z" fill="#7b6950"/><ellipse cx="161" cy="69" rx="29" ry="32" fill="#efd6ae"/><path d="M128 55Q126 24 161 23Q190 22 193 50L181 46L172 38L156 48L142 43Z" fill="#7b6950"/><path d="M37 36L22 25L21 44L37 43L45 52L53 34L38 34" fill="#b7836c"/><g fill="#5d5948"><ellipse cx="52" cy="65" rx="2.5" ry="3.5"/><ellipse cx="74" cy="65" rx="2.5" ry="3.5"/><ellipse cx="150" cy="66" rx="2.5" ry="3.5"/><ellipse cx="172" cy="66" rx="2.5" ry="3.5"/></g><g fill="none" stroke="#b7836c" stroke-width="2.5" stroke-linecap="round"><path d="M57 78Q63 ${happy?89:84} 69 78"/><path d="M155 79Q161 ${happy?90:85} 167 79"/></g><g fill="#d99f86" opacity=".5"><ellipse cx="44" cy="76" rx="6" ry="3"/><ellipse cx="81" cy="76" rx="6" ry="3"/><ellipse cx="142" cy="77" rx="6" ry="3"/><ellipse cx="179" cy="77" rx="6" ry="3"/></g><path d="M77 114Q113 100 139 113" fill="none" stroke="#efd6ae" stroke-width="12" stroke-linecap="round"/>${count>=1?'<path d="M108 69C89 56 96 42 108 51C120 41 129 56 108 69" fill="#cf9983"/>':''}${count>=20?'<path d="M103 106L110 92L117 106L132 108L120 119L123 134L110 127L97 134L100 119L88 108Z" fill="#dfc477"/>':''}</svg>`;}
