(function(root){
  'use strict';
  const D=root.XTD, B=D.buildings;
  const poly=(c,points,fill,stroke)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
  const line=(c,x,y,xx,yy,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};
  function structure(c,type,level=1,angle=-Math.PI/2,active=true,t=0){
    const d=B[type],accent=active?d.color:'#787668';
    c.save();c.lineWidth=1;c.fillStyle='#080e0c55';c.beginPath();c.ellipse(3,9,24,13,0,0,Math.PI*2);c.fill();
    if(d.trap){poly(c,[[-23,-7],[0,-19],[23,-7],[23,7],[0,19],[-23,7]],'#343b31','#65715a');
      for(let x=-12;x<=12;x+=12)for(let y=-5;y<=7;y+=12){if(type==='spike')poly(c,[[x-4,y+4],[x,y-9],[x+4,y+4]],'#a7ad92','#444f3d');else {c.fillStyle=accent;c.fillRect(x-2,y-4,4,8);line(c,x-6,y,x+6,y,accent);}}
      c.restore();return;
    }
    poly(c,[[-24,-5],[0,-17],[24,-5],[24,10],[0,22],[-24,10]],'#303b32','#111b16');
    poly(c,[[-24,-5],[0,7],[0,22],[-24,10]],'#3b4638');poly(c,[[0,7],[24,-5],[24,10],[0,22]],'#252f28');
    poly(c,[[-24,-5],[0,-17],[24,-5],[0,7]],'#65705a','#859072');
    for(const [x,y]of [[-18,-4],[0,-12],[18,-4],[0,5]]){c.fillStyle='#d0c79d';c.fillRect(x-1,y-1,2,2);}
    c.fillStyle='#abb783';c.fillRect(-18,8,8,2);c.fillStyle=active?'#c9da98':'#9b674a';c.fillRect(12,9,5,2);
    if(['gun','laser','mortar','flame','sniper','frost'].includes(type)){
      c.fillStyle='#222c25';c.beginPath();c.ellipse(0,-3,15,10,0,0,Math.PI*2);c.fill();
      poly(c,[[-13,-9],[0,-16],[13,-9],[13,2],[0,9],[-13,2]],'#444f3d','#a2ab82');
      poly(c,[[-13,-9],[0,-16],[13,-9],[0,-2]],'#899272');
      c.save();c.translate(0,-6);c.rotate(Math.atan2(Math.sin(angle)*.78,Math.cos(angle))+Math.PI/2);
      const length=type==='sniper'?36:type==='mortar'?19:29;
      c.fillStyle='#101b16';c.fillRect(-7,-length,14,length-3);c.fillStyle='#9da987';c.fillRect(-5,-length+1,4,length-1);c.fillStyle='#63775f';c.fillRect(2,-length+1,3,length-1);
      if(type==='gun'){c.fillStyle='#202d23';c.fillRect(-1,-length,2,length-6);line(c,-7,-length+8,7,-length+8,'#bec39c',2);}
      if(type==='mortar'){c.fillStyle='#77826a';c.fillRect(-10,-length,20,16);c.fillStyle='#17251b';c.beginPath();c.ellipse(0,-length,9,6,0,0,Math.PI*2);c.fill();c.strokeStyle='#b5b391';c.stroke();}
      if(['laser','frost'].includes(type)){c.shadowBlur=active?8:0;c.shadowColor=accent;c.fillStyle=accent;c.fillRect(-4,-length+4,8,4);c.fillRect(-3,-13,6,5);}
      if(type==='flame'){c.fillStyle='#bb854e';c.fillRect(-8,-15,4,14);c.fillRect(5,-15,4,14);c.fillStyle=accent;c.fillRect(-4,-length,8,3);}
      c.restore();
    }else if(type==='solar'){
      c.fillStyle='#69745d';c.fillRect(-3,-27,6,23);poly(c,[[-25,-24],[11,-37],[26,-10],[-10,3]],'#34606a','#b2bbb0');
      for(let i=1;i<4;i++)line(c,-25+36*i/4,-24-13*i/4,-10+36*i/4,3-13*i/4,'#73a3a966');for(let i=1;i<4;i++)line(c,-25+15*i/4,-24+27*i/4,11+15*i/4,-37+27*i/4,'#a1c6c466');
      line(c,-23,-23,10,-35,'#b7d7d0',1.5);
    }else if(type==='mine'){
      poly(c,[[-14,-11],[0,-19],[15,-11],[15,3],[0,11],[-14,3]],'#4f5e49','#8c9571');
      line(c,-16,-6,-13,-30,'#c2b98a',5);line(c,15,-5,12,-30,'#a5996e',5);line(c,-13,-30,12,-30,'#d0b881',5);
      c.fillStyle='#343c2d';c.fillRect(-5,-31,10,25);for(let y=-25;y<-5;y+=5)line(c,-6,y,6,y-4,'#b7a576',2);c.fillStyle='#dfb266';c.fillRect(-18,-7,7,9);
      if(active){c.fillStyle='#edc889';for(let i=0;i<3;i++){const q=(t*3+i/3)%1;c.fillRect(-8+i*8,-4+q*8,2,2);}}
    }else if(type==='relay'||type==='scanner'){
      line(c,0,0,0,-36,'#a5ad8b',4);line(c,-9,0,0,-27,'#6e7f63',2);line(c,9,0,0,-27,'#6e7f63',2);
      if(type==='relay'){line(c,-13,-30,13,-30,'#c3c6a1',3);line(c,-7,-23,7,-23,'#919f81',2);c.fillStyle=accent;c.fillRect(-2,-43,4,6);}
      else{c.save();c.translate(0,-28);c.rotate(Math.sin(t*.5)*.5);c.fillStyle='#929e7d';c.beginPath();c.ellipse(0,0,16,8,-.45,0,Math.PI*2);c.fill();line(c,-8,4,7,-9,'#d6ddb2',2);c.restore();}
    }else if(type==='reactor'){
      c.fillStyle='#5a6c50';c.fillRect(-13,-25,26,27);c.fillStyle='#9cae7b';c.beginPath();c.ellipse(0,-25,13,7,0,0,Math.PI*2);c.fill();
      for(const x of [-9,0,9]){c.fillStyle='#273d2b';c.fillRect(x-2,-20,4,20);c.fillStyle=accent;c.fillRect(x-1,-17,2,13);}
      c.fillStyle='#293b27';c.beginPath();c.ellipse(0,-25,7,4,0,0,Math.PI*2);c.fill();
    }else if(type==='shield'){
      line(c,0,0,0,-25,'#b0bfa0',5);c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.ellipse(0,-23,16,10,0,0,Math.PI*2);c.stroke();
      c.fillStyle=accent;c.beginPath();c.arc(0,-24,5,0,Math.PI*2);c.fill();line(c,0,-38,0,-9,'#d4dbc5',2);
    }else{
      poly(c,[[-18,-16],[0,-26],[19,-16],[19,3],[0,13],[-18,3]],'#4e604a','#8b9877');poly(c,[[0,-6],[19,-16],[19,3],[0,13]],'#344532');poly(c,[[-18,-16],[0,-26],[19,-16],[0,-6]],'#889875');
      c.fillStyle='#1d352a';c.fillRect(-13,-10,7,7);c.fillStyle=accent;c.fillRect(-12,-9,5,3);
      if(type==='lab'){poly(c,[[-9,-22],[0,-30],[9,-22],[0,-17]],'#9bb7a5');line(c,0,-27,0,-20,'#d7e4c9',2);line(c,-4,-24,4,-24,'#d7e4c9',2);}
      if(type==='storage'){for(let i=0;i<3;i++)line(c,4+i*4,-5-i*2,4+i*4,7-i*2,'#73876a',1.5);}
      if(type==='market'){poly(c,[[-21,-15],[-3,-27],[21,-15],[0,-3]],'#ae9863');for(let i=0;i<3;i++)line(c,-14+i*10,-12-i*1,0+i*5,-21+i*2,'#d9c18e',3);}
    }
    if(level>1){for(let i=0;i<level;i++){line(c,-9+i*7,14,-6+i*7,12,'#ecce7f',2);}}
    c.restore();
  }
  function alien(c,e,t){
    c.save();const scale=e.size==='large'?1.8:e.size==='small'?.66:1;c.scale(scale,scale);
    c.fillStyle='#060b0655';c.beginPath();c.ellipse(3,5,17,10,0,0,Math.PI*2);c.fill();
    c.rotate(Math.atan2(Math.sin(e.angle)*.78,Math.cos(e.angle))-Math.PI/2);
    const palette=[['#6a7047','#a5a264'],['#767446','#b1aa61'],['#777a63','#c0b382'],['#6a6153','#bc9c6e'],['#605c43','#9f9862'],['#434d3e','#a4b776']];
    const [base,light]=palette[Math.min(5,Math.floor((e.wave-1)/5))];const phase=t*8+e.id,feature=D.waves[e.wave-1].feature;
    if(['wings','queen','stinger'].includes(feature))for(const s of [-1,1])for(let i=0;i<3;i++){c.fillStyle='#c6ceb92d';c.strokeStyle='#b7c8a044';c.lineWidth=1;c.beginPath();c.ellipse(s*(12+i*3),-8+i*6,17,5,s*(.4-i*.35),0,Math.PI*2);c.fill();c.stroke();}
    if(['tail','stinger','segments','abdomen','queen'].includes(feature)){poly(c,[[-7,-10],[-5,-23],[4,-30],[8,-22],[5,-12]],base,'#24321f');for(let i=0;i<3;i++)line(c,-4,-15-i*4,5,-17-i*4,light,2);if(feature==='stinger')poly(c,[[4,-29],[13,-35],[10,-24]],'#ccbd87');}
    for(let i=0;i<3;i++)for(const s of [-1,1]){const y=-8+i*8,wobble=Math.sin(phase+i*1.7)*3;const elbow={x:s*(18+Math.abs(i-1)*2),y:y+wobble-6};line(c,s*6,y,elbow.x,elbow.y,'#252d21',4);line(c,elbow.x,elbow.y,s*23,y+9+wobble,'#252d21',3);line(c,s*6,y,elbow.x,elbow.y,light,2);line(c,elbow.x,elbow.y,s*23,y+9+wobble,base,1.5);}
    c.fillStyle=base;c.strokeStyle='#232d22';c.lineWidth=2;c.beginPath();c.ellipse(0,-5,10,15,0,0,Math.PI*2);c.fill();c.stroke();
    for(let i=0;i<4;i++){poly(c,[[-8,-12+i*6],[0,-16+i*6],[8,-12+i*6],[5,-6+i*6],[0,-4+i*6],[-5,-6+i*6]],i%2?base:light,'#3d4931');}
    if(['spines','armor'].includes(feature))for(let i=0;i<4;i++)for(const s of [-1,1])poly(c,[[s*7,-12+i*6],[s*(feature==='spines'?16:12),-18+i*6],[s*9,-7+i*6]],light,'#35432a');
    if(feature==='sacs')for(const s of [-1,1]){c.fillStyle='#c9b25a88';c.beginPath();c.ellipse(s*9,-8,6,11,0,0,Math.PI*2);c.fill();c.strokeStyle='#968442';c.stroke();}
    if(['core','queen'].includes(feature)){c.fillStyle='#b9806477';c.beginPath();c.ellipse(0,-4,6,9,0,0,Math.PI*2);c.fill();c.fillStyle='#ecc182';c.beginPath();c.arc(0,-5,3,0,Math.PI*2);c.fill();}
    if(['jaw','claws','tusks','frill'].includes(feature))for(const s of [-1,1])poly(c,[[s*7,4],[s*19,9],[s*15,23],[s*13,13],[s*4,10]],feature==='frill'?'#a47c59':light,'#303e24');
    if(feature==='antenna')for(const s of [-1,1]){line(c,s*5,14,s*10,29,'#bac68c',1);line(c,s*10,29,s*16,33,'#bac68c',1);}
    if(feature==='horn')poly(c,[[-5,13],[0,30],[5,13]],'#d4c596','#38452a');
    if(['jumper','spinner'].includes(feature))for(const s of [-1,1]){line(c,s*7,-12,s*26,-20,light,3);line(c,s*26,-20,s*29,8,base,2);}
    poly(c,[[-8,7],[0,4],[8,7],[6,15],[0,18],[-6,15]],light,'#293623');
    for(const s of [-1,1]){poly(c,[[s*4,12],[s*11,21],[s*5,25],[s*7,20],[s*1,15]],'#c1b682','#393f2c');c.fillStyle='#eaa153';c.fillRect(s*4-1,11,2,3);}
    if(e.boss){for(const s of [-1,1]){poly(c,[[s*7,-13],[s*17,-24],[s*11,-5]],'#b09a59','#35452b');}line(c,0,-18,0,12,'#ddd098',2);}
    if(e.slowUntil>t){c.strokeStyle='#9ce3f5';c.lineWidth=1;c.strokeRect(-13,-19,26,38);}
    if(e.burnUntil>t){c.fillStyle='#ffb55288';c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.fill();}
    c.restore();
  }
  class Renderer {
    constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.scale=1;this.ox=0;this.oy=0;this.fx=[];this.icons={};this.overlay='none';this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);}
    resize(){const r=this.canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(r.width*dpr));this.canvas.height=Math.max(1,Math.round(r.height*dpr));this.width=r.width;this.height=r.height;this.dpr=dpr;this.scale=Math.min(r.width/560,r.height/850);this.ox=(r.width-560*this.scale)/2;this.oy=(r.height-850*this.scale)/2;}
    point(x,y){return {x:35+x*70,y:99+y*54};}
    tile(clientX,clientY){const r=this.canvas.getBoundingClientRect(),x=((clientX-r.left-this.ox)/this.scale-35)/70,y=((clientY-r.top-this.oy)/this.scale-99)/54;return {x:Math.floor(x),y:Math.floor(y)};}
    icon(type){if(!this.icons[type]){const canvas=document.createElement('canvas');canvas.width=140;canvas.height=112;const c=canvas.getContext('2d');c.translate(70,72);c.scale(1.8,1.8);structure(c,type);this.icons[type]=canvas.toDataURL();}return this.icons[type];}
    event(event){if(['shot','death','meteor','build','destroy','impact','leak'].includes(event.type))this.fx.push({...event,life:0,duration:event.type==='meteor'?1.1:event.type==='death'?1.2:event.type==='shot'?.22:.6});if(this.fx.length>200)this.fx.splice(0,this.fx.length-200);}
    draw(game,ui,delta,time){const c=this.c;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#252b22';c.fillRect(0,0,this.width,this.height);c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
      const backdrop=c.createLinearGradient(0,0,560,850);backdrop.addColorStop(0,'#343e2c');backdrop.addColorStop(.5,'#51503a');backdrop.addColorStop(1,'#303a2b');c.fillStyle=backdrop;c.fillRect(0,0,560,850);
      // Deterministic grain, stones and contour lines stay fixed to the battlefield.
      for(let i=0;i<480;i++){const x=(Math.sin(i*17.17+game.seed)*43758.5)%1*560,y=(Math.cos(i*6.57+game.seed)*23718.7)%1*850;c.fillStyle=i%3?'#d3c4910b':'#090e0a15';c.fillRect(Math.abs(x),Math.abs(y),i%4+1,i%3+1);}
      for(let i=0;i<11;i++){c.strokeStyle='#a5a27509';c.lineWidth=1;c.beginPath();c.moveTo(-20,i*85);c.bezierCurveTo(160,i*85-70,330,i*85+70,580,i*85-25);c.stroke();}
      // Breach throat, perimeter bulkheads and embedded hazard markings.
      poly(c,[[175,0],[385,0],[353,94],[209,94]],'#202d23');
      for(let i=0;i<5;i++){line(c,230-i*5,15+i*16,245-i*5,26+i*16,'#a7b37933',2);line(c,330+i*5,15+i*16,315+i*5,26+i*16,'#a7b37933',2);}
      c.fillStyle='#bac399';c.font='9px Consolas,monospace';c.textAlign='center';c.fillText('HOSTILE APPROACH',280,68);
      const top=this.point(0,0),end=this.point(7,12);
      c.fillStyle='#18271d50';c.fillRect(22,94,516,656);c.fillStyle='#4b5036';c.fillRect(top.x,top.y,490,648);
      for(let y=0;y<12;y++)for(let x=0;x<7;x++){const p=this.point(x,y),n=Math.sin(x*78.23+y*37.79+game.seed);c.fillStyle=n>.4?'#5a59401c':n<-.4?'#222e241e':'#89956d08';c.fillRect(p.x,p.y,70,54);c.strokeStyle='#b2b5890e';c.lineWidth=.7;c.strokeRect(p.x,p.y,70,54);
        if((x*3+y)%7===0){line(c,p.x+17,p.y+25,p.x+22,p.y+23,'#292d201c');line(c,p.x+22,p.y+23,p.x+26,p.y+25,'#292d201c');}}
      for(let y=0;y<12;y++){const p=this.point(0,y);c.fillStyle='#344330';c.fillRect(15,p.y+1,12,49);c.fillRect(533,p.y+1,12,49);line(c,17,p.y+2,25,p.y+2,'#88916a',1);line(c,535,p.y+2,543,p.y+2,'#88916a',1);c.fillStyle=y%3===0?'#d9c586':'#81916a';c.fillRect(19,p.y+21,4,7);c.fillRect(537,p.y+21,4,7);}
      c.font='8px Consolas';c.textAlign='center';c.fillStyle='#bbc59d66';for(let x=0;x<7;x++)c.fillText(String.fromCharCode(65+x),this.point(x+.5,0).x,91);
      for(let y=0;y<12;y++){c.fillStyle='#cbd1ad55';c.fillText(String(y+1).padStart(2,'0'),7,this.point(0,y+.5).y+3);}
      for(let x=0;x<7;x++){const p=this.point(x,12);poly(c,[[p.x, p.y+7],[p.x+30,p.y+7],[p.x+18,p.y+17],[p.x-12,p.y+17]],'#a89d5366');}
      line(c,35,end.y+3,525,end.y+3,'#c4bb7888',2);c.fillStyle='#bdc397';c.font='9px Consolas';c.fillText('DEFENSE PERIMETER  /  DO NOT CROSS',280,end.y+42);
      c.fillStyle='#73866466';c.font='8px Consolas';c.fillText('SECTOR 07 • GRID 7 × 12 • 10m / CELL',280,825);
      for(const d of game.deposits){if(d.deep&&!game.scanned)continue;const p=this.point(d.x+.5,d.y+.5);c.save();c.translate(p.x,p.y);c.fillStyle=d.resource==='iron'?'#533b26aa':'#344b28aa';c.beginPath();c.ellipse(0,4,23,14,0,0,Math.PI*2);c.fill();
        for(let i=0;i<5;i++){const x=-15+i*7,y=(i%2)*7;poly(c,[[x-5,y],[x-2,y-10-i%3*3],[x+5,y-5],[x+7,y+5],[x,y+8]],d.resource==='iron'?(i%2?'#c4965a':'#a8804f'):(i%2?'#acbb64':'#718447'),'#303826');}
        c.font='7px Consolas';c.textAlign='center';c.fillStyle=d.resource==='iron'?'#e4c08a':'#cadb8d';c.fillText(d.deep?'DEEP / LV2':d.resource==='iron'?'Fe':'U',0,23);c.restore();}
      for(const r of game.rocks){const p=this.point(r.x+.5,r.y+.5);c.save();c.translate(p.x,p.y);poly(c,[[-27,8],[-25,-9],[-13,-24],[11,-22],[26,-6],[25,11],[1,20]],'#4e5541','#313c2d');poly(c,[[-25,-9],[-13,-24],[11,-22],[6,-4],[-7,3]],'#778068');poly(c,[[6,-4],[11,-22],[26,-6],[25,11]],'#616950');line(c,-13,-24,-8,-9,'#a0a28666');c.restore();}
      if(game.pickup){const p=this.point(game.pickup.x+.5,game.pickup.y+.5);c.save();c.translate(p.x,p.y);c.strokeStyle='#e4c17b66';c.lineWidth=1;c.beginPath();c.ellipse(0,5,20+Math.sin(time*2)*2,13,0,0,Math.PI*2);c.stroke();poly(c,[[-12,-7],[1,-14],[14,-6],[14,9],[1,16],[-12,8]],'#857647','#dec286');poly(c,[[-12,-7],[1,-14],[14,-6],[1,1]],'#c7b376');line(c,1,0,1,15,'#e5ce8b',3);c.fillStyle='#ffe4a0';c.font='15px Consolas';c.fillText('+',0,-20);c.restore();}
      if(ui.overlay==='power'){for(const a of game.buildings){if(!['solar','reactor','relay'].includes(a.type))continue;const p=this.point(a.x+.5,a.y+.5);c.strokeStyle=a.powered?'#b4d58b50':'#eb9e7050';c.fillStyle=a.powered?'#a0ca7009':'#d5754009';c.beginPath();c.ellipse(p.x,p.y,game.powerRadius(a)*70,game.powerRadius(a)*54,0,0,Math.PI*2);c.fill();c.stroke();for(const b of game.buildings)if(a.id<b.id&&D.dist(a,b)<=game.powerRadius(a)){const q=this.point(b.x+.5,b.y+.5);line(c,p.x,p.y,q.x,q.y,'#b1d79188',1);}}}
      if(ui.overlay==='paths'){for(const size of ['medium','large','small']){const route=game.route({x:size==='large'?3:3.5,y:0,size});c.setLineDash([4,5]);c.strokeStyle=size==='large'?'#e5b37177':size==='small'?'#98cddb77':'#e3e8b088';c.lineWidth=1.5;c.beginPath();route.forEach((n,i)=>{const p=this.point(n.x,n.y);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.stroke();c.setLineDash([]);}}
      for(const shield of game.buildings.filter(b=>b.type==='shield'&&b.powered)){const p=this.point(shield.x+.5,shield.y+.5);c.strokeStyle='#9ccddb33';c.lineWidth=1;c.fillStyle='#83c2cc08';c.beginPath();c.ellipse(p.x,p.y,140,108,0,0,Math.PI*2);c.fill();c.stroke();}
      const selected=game.buildings.find(b=>b.id===ui.selected);
      if(selected){const p=this.point(selected.x+.5,selected.y+.5),d=B[selected.type];c.strokeStyle='#e0c177aa';c.lineWidth=1.5;c.strokeRect(this.point(selected.x,selected.y).x+2,this.point(selected.x,selected.y).y+2,66,50);const range=(d.range||(['solar','reactor','relay'].includes(selected.type)?game.powerRadius(selected):selected.type==='shield'?2:0))*(d.damage&&game.has('lens')?1.1:1);if(range){c.fillStyle='#e3cf9109';c.setLineDash([4,5]);c.beginPath();c.ellipse(p.x,p.y,range*70,range*54,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);}}
      if(ui.placing){for(let y=1;y<11;y++)for(let x=0;x<7;x++){const p=this.point(x,y),okay=!game.canBuild(ui.placing,x,y);c.fillStyle=okay?'#abd38512':'#401b120d';c.fillRect(p.x+1,p.y+1,68,52);if(okay){c.strokeStyle='#b5ce8740';c.strokeRect(p.x+3,p.y+3,64,48);}}}
      const entities=[...game.buildings.map(b=>({kind:'building',y:b.y+.5,data:b})),...game.enemies.filter(e=>e.y>=-.2&&e.y<12.6).map(e=>({kind:'enemy',y:e.y,data:e}))].sort((a,b)=>a.y-b.y);
      for(const o of entities){const b=o.data;if(o.kind==='building'){const p=this.point(b.x+.5,b.y+.5);c.save();c.translate(p.x,p.y);structure(c,b.type,b.level,b.angle,b.powered,game.time);c.restore();if(b.hp<game.maxHP(b)||selected?.id===b.id){c.fillStyle='#162619';c.fillRect(p.x-20,p.y-45,40,3);c.fillStyle=b.hp/game.maxHP(b)>.4?'#b6c88f':'#ef986e';c.fillRect(p.x-20,p.y-45,40*b.hp/game.maxHP(b),3);}if(!b.powered){c.font='12px Consolas';c.fillStyle='#e9b076';c.textAlign='center';c.fillText(b.disabledUntil>game.time?'⌛':'ϟ',p.x+22,p.y-23);}}
        else{const p=this.point(b.x,b.y);c.save();c.translate(p.x,p.y);alien(c,b,game.time);c.restore();if(b.hp<b.maxHP||b.boss){const width=b.boss?44:22;c.fillStyle='#1b2219';c.fillRect(p.x-width/2,p.y-(b.size==='large'?45:28),width,3);c.fillStyle=b.boss?'#e1a56e':'#b8c47d';c.fillRect(p.x-width/2,p.y-(b.size==='large'?45:28),width*Math.max(0,b.hp/b.maxHP),3);}}}
      if(ui.placing&&ui.tile){const p=this.point(ui.tile.x,ui.tile.y),valid=!game.canBuild(ui.placing,ui.tile.x,ui.tile.y);c.fillStyle=valid?'#b5d49a30':'#e79b6130';c.strokeStyle=valid?'#d8e8b1':'#ef9a73';c.lineWidth=2;c.fillRect(p.x+2,p.y+2,66,50);c.strokeRect(p.x+2,p.y+2,66,50);c.save();c.globalAlpha=.65;c.translate(p.x+35,p.y+27);structure(c,ui.placing);c.restore();}
      for(const f of this.fx){f.life+=delta;const q=f.life/f.duration,p=this.point(f.x,f.y);c.save();c.globalAlpha=Math.max(0,1-q);
        if(f.type==='shot'){const target=this.point(f.tx,f.ty);line(c,p.x,p.y-9,target.x,target.y,f.color,f.weapon==='laser'?2:f.weapon==='sniper'?1:2);c.fillStyle='#ffdf9e';c.beginPath();c.arc(target.x,target.y,f.weapon==='mortar'?12+q*45:3+q*5,0,Math.PI*2);c.fill();}
        else if(f.type==='death'){c.fillStyle='#1b2c18';for(let i=0;i<6;i++){const a=i*1.05;c.fillRect(p.x+Math.cos(a)*q*20,p.y+Math.sin(a)*q*16,5,3);}}
        else if(f.type==='meteor'){line(c,p.x-120*(1-q),p.y-220*(1-q),p.x,p.y,'#f8c283',5*(1-q));c.strokeStyle='#f4c078';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y,q*100,q*70,0,0,Math.PI*2);c.stroke();}
        else{c.strokeStyle=f.type==='build'?'#cce4ad':'#f0ae79';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,10+q*35,7+q*20,0,0,Math.PI*2);c.stroke();}c.restore();}
      this.fx=this.fx.filter(f=>f.life<f.duration);
      if(game.weather.some(w=>w.kind==='acid'&&w.at<=game.time)){c.strokeStyle='#b5d17844';c.lineWidth=1;for(let i=0;i<70;i++){const x=(i*127+time*40)%560,y=(i*73+time*280)%850;line(c,x,y,x-6,y+20,'#b5d17844');}}
      const vignette=c.createRadialGradient(280,430,150,280,430,500);vignette.addColorStop(0,'#07100900');vignette.addColorStop(1,'#07100988');c.fillStyle=vignette;c.fillRect(0,0,560,850);
    }
  }
  D.Renderer=Renderer;
})(window);
