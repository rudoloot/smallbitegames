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
    // Local +Y is the head. Each wave has its own anatomy, not a shared beetle body.
    const phase=t*8+e.id,w=e.wave;
    const base=w>=25?'#202d32':w>=19?'#5d6555':w>=14?'#887463':w>=10?'#547e78':w>=3&&w<=6?'#9a754b':'#766b58';
    const light=w>=25?'#81e9d2':w>=19?'#c8bb82':w>=14?'#d4aa98':w>=10?'#b3ece0':'#cbbb8e';
    const oval=(x,y,rx,ry,color=base,angle=0)=>{c.fillStyle=color;c.strokeStyle='#202d25';c.lineWidth=1.2;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();c.stroke();};
    const shape=(pts,color=light)=>poly(c,pts,color,'#29372c');
    const legs=(pairs,width,length,thick=2)=>{for(let i=0;i<pairs;i++)for(const side of [-1,1]){const y=-12+i*24/Math.max(1,pairs-1),step=Math.sin(phase+i*1.5)*2;line(c,side*width,y,side*(width+length*.6),y-7+step,light,thick);line(c,side*(width+length*.6),y-7+step,side*(width+length),y+7+step,base,thick);}};
    const eyes=(x,y,r=2)=>{for(const side of [-1,1])oval(side*x,y,r,r,'#ffd797');};
    const jaws=(width,y,length,thick=4)=>{for(const side of [-1,1])shape([[side*width,y],[side*(width+thick),y+length*.5],[side*(width-2),y+length],[side*(width-5),y+length-3],[side*(width+thick-3),y+length*.4],[side*(width-4),y]]);};
    const plates=(count,width,from,step)=>{for(let i=0;i<count;i++)shape([[-width,from+i*step],[-width*.6,from+i*step-5],[0,from+i*step-7],[width*.6,from+i*step-5],[width,from+i*step],[0,from+i*step+4]],i%2?base:light);};
    const wings=(count=3)=>{for(const side of [-1,1])for(let i=0;i<count;i++){oval(side*(17+i*2),-8+i*7,22,5,'#c4eee76b',side*(.55-i*.45+Math.sin(phase)*.06));line(c,side*4,-6+i*5,side*37,-15+i*15,'#c8e7d388');}};
    const tail=(length,split=false)=>{shape([[-5,-9],[-3,-length],[0,-length-7],[4,-length],[5,-9]],base);if(split)for(const side of [-1,1])shape([[0,-length+3],[side*13,-length-8],[side*4,-length+6]]);};
    const sacs=(x,y,rx,ry,color='#d9bf6899')=>{for(const side of [-1,1]){oval(side*x,y,rx,ry,color);line(c,side*x,y-ry*.6,side*(x+2),y+ry*.5,'#efdeb299',1);}};
    switch(w){
      case 1: legs(3,8,12,3);oval(0,-3,10,17);oval(0,15,5,11,light);for(let i=0;i<5;i++)shape([[-3,-17+i*6],[0,-23+i*6],[3,-17+i*6]]);eyes(5,10);eyes(5,16,1.5);for(const side of [-1,1])for(let i=0;i<3;i++)shape([[side*4,18+i*3],[side*7,20+i*3],[side*4,21+i*3]],'#ece2bf');break;
      case 2: legs(3,15,9,4);oval(0,-3,20,12);for(let i=0;i<7;i++)shape([[-14+i*4,-5],[-17+i*5,-24],[-9+i*4,-5]],'#4b453b');oval(0,11,14,9,light);jaws(11,13,17,5);jaws(5,14,13,3);plates(2,10,4,6);eyes(7,13);break;
      case 3: legs(3,7,9,4);oval(0,-10,11,11);oval(0,8,14,12,light);jaws(12,13,14,6);eyes(7,11);break;
      case 4: legs(3,5,10,2);oval(0,-5,8,20);plates(5,7,-19,6);oval(0,12,5,4);for(const side of [-1,1])shape([[side*5,5],[side*24,13],[side*22,25],[side*19,21],[side*16,26],[side*13,21],[side*10,24]],'#c5a878');break;
      case 5: legs(3,10,12,5);oval(0,0,15,16);sacs(12,-6,9,13);oval(0,13,8,6,light);eyes(5,15);break;
      case 6: legs(6,12,5,2);oval(0,-9,16,25,'#b2a06d');for(let i=0;i<7;i++){c.beginPath();c.ellipse(0,-27+i*5,14,4,0,0,Math.PI);c.stroke();}oval(0,18,7,6,base);jaws(5,20,6);break;
      case 7: legs(2,8,9,3);oval(0,-3,13,17);for(const side of [-1,1]){oval(side*16,10,10,9,'#77786b');for(let i=0;i<4;i++)shape([[side*(10+i*4),13],[side*(12+i*4),26],[side*(14+i*4),13]],'#ded0a6');}for(let i=0;i<10;i++)oval(Math.sin(i*8)*9,-12+i*2,2,2,'#555b4c');break;
      case 8: legs(3,8,8,2);oval(0,0,15,16,'#657b7b');for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a),y=Math.sin(a);shape([[x*10-y*4,y*10+x*4],[x*28,y*28],[x*10+y*4,y*10-x*4]],'#b0dcceaa');}oval(0,17,5,4);break;
      case 9: legs(3,11,13,5);oval(0,-5,15,20);oval(0,6,20,12,'#797c66');for(const side of [-1,1])for(let i=0;i<2;i++){oval(side*(16+i*8),5+i*9,7,10);for(let j=0;j<3;j++)shape([[side*(12+i*8+j*3),12+i*9],[side*(14+i*8+j*3),25+i*7],[side*(16+i*8+j*3),11+i*9]]);}plates(4,13,-20,7);eyes(6,15);break;
      case 10: legs(3,10,25,1.5);oval(0,0,14,7);for(const side of [-1,1]){line(c,side*4,5,side*12,36,light,1);line(c,side*12,36,side*23,42,light,1);line(c,side*10,-4,0,5,'#afffd3',2);}break;
      case 11: legs(2,4,9,1.5);for(const side of [-1,1]){line(c,side*4,-6,side*25,-24,light,6);line(c,side*25,-24,side*20,17,base,3);shape([[side*4,-7],[side*14,-14],[side*8,3]],'#a4c7a7');}oval(0,-1,6,12);shape([[-6,10],[0,25],[6,10]]);break;
      case 12: wings();tail(34);oval(0,-2,4,15);oval(0,12,8,6);eyes(5,14,4);for(let i=0;i<5;i++)oval(0,-15-i*4,2,1,'#bafce6');break;
      case 13: for(const side of [-1,1]){shape([[side*3,12],[side*33,-19],[side*30,15],[side*14,22]],'#939eae');oval(side*21,7,7,6,'#40385b');oval(side*21,7,3,4,'#f1ce91');for(let j=0;j<2;j++){line(c,side*(3+j*3),11,side*(9+j*9),30,light,1);for(let k=0;k<4;k++)line(c,side*(7+j*5+k),16+k*3,side*(12+j*6+k),16+k*3,light);}line(c,side*3,-12,side*9,-38,light);}oval(0,0,5,19);eyes(3,15);break;
      case 14: tail(24,true);legs(2,8,13,2);oval(0,0,10,13,'#b3aa91');for(const side of [-1,1])for(let i=0;i<3;i++)line(c,side*20,15,side*(16+i*5),23,light,1.5);oval(0,12,7,6);eyes(4,15);break;
      case 15: legs(2,8,10,3);oval(0,-9,10,23);for(const side of [-1,1]){shape([[0,15],[side*25,15],[side*22,-7],[side*7,-1]],'#b37264');for(let i=0;i<4;i++)line(c,0,10,side*(12+i*4),12-i*6,'#de9890',1);}oval(0,14,8,7);jaws(8,17,14,2);break;
      case 16: legs(3,14,7,2);oval(0,0,21,13);plates(3,20,-7,7);oval(0,8,7,7,'#bd6b83');oval(0,8,3,4,'#ffe0b0');break;
      case 17: tail(33);legs(3,8,11,3);oval(0,-4,10,22);for(let i=0;i<6;i++)shape([[-4,-13-i*4],[0,-22-i*4],[4,-13-i*4]],light);sacs(6,-5,3,12,'#bb7788');oval(0,15,14,6);jaws(12,16,8);for(const side of [-1,1])oval(side*16,10,6,10);break;
      case 18: legs(3,12,12,6);oval(0,-8,15,18);shape([[-21,5],[-18,20],[0,24],[18,20],[21,5],[0,-5]],light);for(const x of [-13,0,13])shape([[x-3,17],[x,36-Math.abs(x)*.4],[x+3,17]],'#e2d5aa');oval(0,11,8,8,'#b75274');for(const side of [-1,1])line(c,0,11,side*13,20,'#ed829b',2);break;
      case 19: legs(2,6,14,2);oval(0,-9,8,18);for(const side of [-1,1]){shape([[side*5,3],[side*22,-1],[side*27,25],[side*13,17],[side*23,18],[side*17,5]],'#c8c497');for(let i=0;i<4;i++)shape([[side*22,7+i*3],[side*17,10+i*3],[side*23,10+i*3]]);}shape([[-8,10],[0,21],[8,10]]);eyes(4,13);break;
      case 20: legs(3,12,8,4);oval(0,-8,13,14);shape([[-23,5],[-15,19],[0,24],[15,19],[23,5],[0,-7]],'#929c7b');shape([[-5,17],[0,37],[5,17]],'#e4d6a2');break;
      case 21: legs(3,6,10,2);sacs(10,-13,12,16,'#baa15c');oval(0,-13,4,12,'#ffba69');shape([[-6,-24],[-11,-36],[11,-36],[6,-24]],'#5a5b43');oval(0,7,7,11);eyes(4,14);break;
      case 22: legs(4,9,25,1.5);shape([[-15,-10],[0,-28],[15,-10],[12,8],[0,13],[-12,8]],'#9d939f');oval(0,14,7,5);for(const side of [-1,1]){line(c,side*33,-8,side*27,15,'#d7dfc899');line(c,side*27,15,side*12,0,'#d7dfc899');}for(let i=-1;i<=1;i++)line(c,i*3,-13,i*4,-25,light,2);break;
      case 23: legs(8,7,10,2);for(let i=0;i<8;i++)oval(Math.sin(i*.5)*3,-30+i*7,8+i*.5,5,i%2?base:light);oval(0,18,13,8);jaws(12,22,12,4);break;
      case 24: legs(4,10,9,3);oval(0,0,13,17);plates(4,12,-12,7);for(const side of [-1,1]){line(c,side*8,5,side*23,15,base,5);oval(side*24,19,10,9);shape([[side*18,20],[side*16,34],[side*25,26],[side*32,33],[side*31,17]]);}line(c,0,-14,12,-30,light,7);line(c,12,-30,22,-17,light,6);oval(22,-13,6,9,'#b1d282aa');shape([[19,-8],[16,7],[26,-9]]);break;
      case 25: legs(3,4,26,2);oval(0,-4,5,16);line(c,-4,-16,-4,8,light,2);line(c,4,-16,4,8,light,2);oval(0,12,7,6);jaws(8,15,14,4);break;
      case 26: oval(0,0,19,21,'#273c3f');for(let i=0;i<6;i++){c.beginPath();c.ellipse(0,-12+i*5,18-Math.abs(i-2)*2,8,0,0,Math.PI);c.strokeStyle=i%2?light:'#557c7c';c.lineWidth=3;c.stroke();}break;
      case 27: legs(2,12,10,2);oval(0,-3,19,11);sacs(15,-4,4,13,'#88bfa3aa');for(const side of [-1,1]){line(c,side*11,6,side*26,19,light,4);line(c,side*26,19,side*12,13,base,4);}shape([[-3,10],[0,31],[3,10]],'#dbdac2');eyes(6,9);break;
      case 28: legs(3,9,10,3);oval(0,-10,10,16);plates(2,14,0,8);jaws(14,10,29,8);for(const side of [-1,1])for(let i=0;i<3;i++)shape([[side*15,20+i*5],[side*9,23+i*5],[side*16,25+i*5]]);eyes(7,10);break;
      case 29: wings();oval(0,-17,9,23);plates(6,8,-32,6);shape([[-4,-35],[0,-52],[4,-35]],light);oval(0,6,3,9);oval(0,17,8,7);eyes(5,18);legs(3,4,12,1.5);break;
      case 30: legs(3,13,20,5);oval(0,-15,21,26,'#354a48');for(const side of [-1,1])shape([[side*3,-37],[side*20,-28],[side*25,-6],[side*10,7],[side*7,-19]],base);for(let i=0;i<5;i++)oval(Math.sin(i*2)*9,-29+i*7,4,3,'#b5f9ba');shape([[-12,10],[0,-6],[12,10],[8,24],[-8,24]],'#87b2a2');oval(0,24,9,7);for(let i=-2;i<=2;i++)shape([[i*3,26],[i*10,40-Math.abs(i)*3],[i*3+3,26]],'#c7e6a5');eyes(5,26);break;
    }
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
    entity(c,b,game,kind){
      const draw=ctx=>kind==='building'?structure(ctx,b.type,b.level,b.angle,b.powered,game.time):alien(ctx,b,game.time);
      const age=game.time-b.hitAt;
      if(!Number.isFinite(age)||age<0||age>=.3){draw(c);return;}
      // Tint only the sprite silhouette, retaining its original detail underneath.
      if(!this.hitCanvas){this.hitCanvas=document.createElement('canvas');this.hitCanvas.width=this.hitCanvas.height=240;}
      const h=this.hitCanvas.getContext('2d');h.clearRect(0,0,240,240);h.save();h.translate(120,120);draw(h);h.restore();
      h.save();h.globalCompositeOperation='source-atop';h.fillStyle='rgba(255,55,55,'+(.16+.3*Math.pow(Math.cos(age/.3*Math.PI*2),2))+')';h.fillRect(0,0,240,240);h.restore();c.drawImage(this.hitCanvas,-120,-120);
    }
    event(event){if(['shot','death','meteor','build','destroy','impact','leak'].includes(event.type))this.fx.push({...event,life:0,duration:event.type==='meteor'?1.1:event.type==='death'?1.2:event.type==='shot'?(['flame','frost'].includes(event.weapon)?.5:.22):.6});if(this.fx.length>200)this.fx.splice(0,this.fx.length-200);}
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
      for(let y=1;y<12;y++)for(let x=0;x<7;x++){const p=this.point(x,y),n=Math.sin(x*78.23+y*37.79+game.seed);c.fillStyle=n>.4?'#5a59401c':n<-.4?'#222e241e':'#89956d08';c.fillRect(p.x,p.y,70,54);c.strokeStyle='#b2b5890e';c.lineWidth=.7;c.strokeRect(p.x,p.y,70,54);
        if((x*3+y)%7===0){line(c,p.x+17,p.y+25,p.x+22,p.y+23,'#292d201c');line(c,p.x+22,p.y+23,p.x+26,p.y+25,'#292d201c');}}
      for(let y=0;y<12;y++){const p=this.point(0,y);c.fillStyle='#344330';c.fillRect(15,p.y+1,12,49);c.fillRect(533,p.y+1,12,49);line(c,17,p.y+2,25,p.y+2,'#88916a',1);line(c,535,p.y+2,543,p.y+2,'#88916a',1);c.fillStyle=y%3===0?'#d9c586':'#81916a';c.fillRect(19,p.y+21,4,7);c.fillRect(537,p.y+21,4,7);}
      c.font='8px Consolas';c.textAlign='center';c.fillStyle='#bbc59d66';for(let x=0;x<7;x++)c.fillText(String.fromCharCode(65+x),this.point(x+.5,0).x,91);
      for(let y=0;y<12;y++){c.fillStyle='#cbd1ad55';c.fillText(String(y+1).padStart(2,'0'),7,this.point(0,y+.5).y+3);}
      for(let x=0;x<7;x++){const p=this.point(x,12);poly(c,[[p.x, p.y+7],[p.x+30,p.y+7],[p.x+18,p.y+17],[p.x-12,p.y+17]],'#a89d5366');}
      line(c,35,end.y+3,525,end.y+3,'#c4bb7888',2);c.fillStyle='#bdc397';c.font='9px Consolas';c.fillText('DEFENSE PERIMETER  /  DO NOT CROSS',280,end.y+42);
      c.fillStyle='#73866466';c.font='8px Consolas';c.fillText('SECTOR 07 • GRID 7 × 12 • 10m / CELL',280,825);
      for(const d of game.deposits){if(d.deep&&!game.scanned)continue;const tile=this.point(d.x,d.y);c.fillStyle=d.resource==='iron'?'#a8804f':'#718447';c.fillRect(tile.x+1,tile.y+1,68,52);c.strokeStyle=d.resource==='iron'?'#e4c08a':'#cadb8d';c.lineWidth=2;c.strokeRect(tile.x+2,tile.y+2,66,50);const p=this.point(d.x+.5,d.y+.5);c.save();c.translate(p.x,p.y);c.fillStyle=d.resource==='iron'?'#533b26aa':'#344b28aa';c.beginPath();c.ellipse(0,4,23,14,0,0,Math.PI*2);c.fill();
        for(let i=0;i<5;i++){const x=-15+i*7,y=(i%2)*7;poly(c,[[x-5,y],[x-2,y-10-i%3*3],[x+5,y-5],[x+7,y+5],[x,y+8]],d.resource==='iron'?(i%2?'#c4965a':'#a8804f'):(i%2?'#acbb64':'#718447'),'#303826');}
        c.font='7px Consolas';c.textAlign='center';c.fillStyle=d.resource==='iron'?'#e4c08a':'#cadb8d';c.fillText(d.deep?'DEEP / LV2':d.resource==='iron'?'Fe':'U',0,23);c.restore();}
      for(const r of game.rocks){const p=this.point(r.x+.5,r.y+.5);c.save();c.translate(p.x,p.y);poly(c,[[-27,8],[-25,-9],[-13,-24],[11,-22],[26,-6],[25,11],[1,20]],'#4e5541','#313c2d');poly(c,[[-25,-9],[-13,-24],[11,-22],[6,-4],[-7,3]],'#778068');poly(c,[[6,-4],[11,-22],[26,-6],[25,11]],'#616950');line(c,-13,-24,-8,-9,'#a0a28666');c.restore();}
      if(game.pickup){const p=this.point(game.pickup.x+.5,game.pickup.y+.5);c.save();c.translate(p.x,p.y);c.strokeStyle='#e4c17b66';c.lineWidth=1;c.beginPath();c.ellipse(0,5,20+Math.sin(time*2)*2,13,0,0,Math.PI*2);c.stroke();poly(c,[[-12,-7],[1,-14],[14,-6],[14,9],[1,16],[-12,8]],'#857647','#dec286');poly(c,[[-12,-7],[1,-14],[14,-6],[1,1]],'#c7b376');line(c,1,0,1,15,'#e5ce8b',3);c.fillStyle='#ffe4a0';c.font='15px Consolas';c.fillText('+',0,-20);c.restore();}
      if(ui.overlay==='power'||ui.resourceOverlay==='power'||['solar','reactor','relay'].includes(ui.placing)){for(const a of game.buildings){if(!['solar','reactor','relay'].includes(a.type))continue;const p=this.point(a.x+.5,a.y+.5);c.strokeStyle=a.powered?'#b4d58b50':'#eb9e7050';c.fillStyle=a.powered?'#a0ca7009':'#d5754009';c.beginPath();c.ellipse(p.x,p.y,game.powerRadius(a)*70,game.powerRadius(a)*54,0,0,Math.PI*2);c.fill();c.stroke();for(const b of game.buildings)if(a.id!==b.id&&a.disabledUntil<=game.time&&b.disabledUntil<=game.time&&(['solar','reactor','relay'].includes(b.type)?a.id<b.id&&D.dist(a,b)<=Math.min(game.powerRadius(a),game.powerRadius(b))+.001:B[b.type].power[b.level-1]>0&&D.dist(a,b)<=game.powerRadius(a)+.001)){const q=this.point(b.x+.5,b.y+.5);line(c,p.x,p.y,q.x,q.y,'#b1d79188',1);}}}
      if(ui.overlay==='paths'){for(const size of ['medium','large','small']){const route=game.route({x:size==='large'?3:3.5,y:0,size});c.setLineDash([4,5]);c.strokeStyle=size==='large'?'#e5b37177':size==='small'?'#98cddb77':'#e3e8b088';c.lineWidth=1.5;c.beginPath();route.forEach((n,i)=>{const p=this.point(n.x,n.y);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.stroke();c.setLineDash([]);}}
      for(const shield of game.buildings.filter(b=>b.type==='shield'&&b.powered)){const p=this.point(shield.x+.5,shield.y+.5);c.strokeStyle='#9ccddb33';c.lineWidth=1;c.fillStyle='#83c2cc08';c.beginPath();c.ellipse(p.x,p.y,140,108,0,0,Math.PI*2);c.fill();c.stroke();}
      const selected=game.buildings.find(b=>b.id===ui.selected);
      if(selected){const p=this.point(selected.x+.5,selected.y+.5),d=B[selected.type];c.strokeStyle='#e0c177aa';c.lineWidth=1.5;c.strokeRect(this.point(selected.x,selected.y).x+2,this.point(selected.x,selected.y).y+2,66,50);const range=(d.range||(['solar','reactor','relay'].includes(selected.type)?game.powerRadius(selected):selected.type==='shield'?2:0))*(d.damage&&game.has('lens')?1.1:1);if(range){c.fillStyle='#e3cf9109';c.setLineDash([4,5]);c.beginPath();c.ellipse(p.x,p.y,range*70,range*54,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);}}
      if(ui.placing){for(let y=1;y<11;y++)for(let x=0;x<7;x++){const p=this.point(x,y),okay=!game.canBuild(ui.placing,x,y);c.fillStyle=okay?'#abd38512':'#401b120d';c.fillRect(p.x+1,p.y+1,68,52);if(okay){c.strokeStyle='#b5ce8740';c.strokeRect(p.x+3,p.y+3,64,48);}}}
      if(ui.placing&&ui.tile&&['solar','reactor','relay'].includes(ui.placing)){
        const p=this.point(ui.tile.x+.5,ui.tile.y+.5),radius=game.powerRadius({type:ui.placing,level:1}),valid=!game.canBuild(ui.placing,ui.tile.x,ui.tile.y);
        c.save();c.fillStyle=valid?'#b5d49a22':'#ef806c22';c.strokeStyle=valid?'#d8e8b1':'#ef806c';c.lineWidth=2;c.setLineDash([6,4]);c.beginPath();c.ellipse(p.x,p.y,radius*70,radius*54,0,0,Math.PI*2);c.fill();c.stroke();c.restore();
      }
      const entities=[...game.buildings.map(b=>({kind:'building',y:b.y+.5,data:b})),...game.enemies.filter(e=>e.y>=-.2&&e.y<12.6).map(e=>({kind:'enemy',y:e.y,data:e}))].sort((a,b)=>a.y-b.y);
      for(const o of entities){const b=o.data;if(o.kind==='building'){const p=this.point(b.x+.5,b.y+.5);c.save();c.translate(p.x,p.y);this.entity(c,b,game,'building');c.restore();if(b.hp<game.maxHP(b)||selected?.id===b.id){c.fillStyle='#162619';c.fillRect(p.x-20,p.y-45,40,3);c.fillStyle=b.hp/game.maxHP(b)>.4?'#b6c88f':'#ef986e';c.fillRect(p.x-20,p.y-45,40*b.hp/game.maxHP(b),3);}if(!b.powered){c.font='12px Consolas';c.fillStyle='#e9b076';c.textAlign='center';c.fillText(b.disabledUntil>game.time?'⌛':'ϟ',p.x+22,p.y-23);}}
        else{const p=this.point(b.x,b.y);c.save();c.translate(p.x,p.y);this.entity(c,b,game,'enemy');c.restore();if(b.hp<b.maxHP||b.boss){const width=b.boss?44:22;c.fillStyle='#1b2219';c.fillRect(p.x-width/2,p.y-(b.size==='large'?45:28),width,3);c.fillStyle=b.boss?'#e1a56e':'#b8c47d';c.fillRect(p.x-width/2,p.y-(b.size==='large'?45:28),width*Math.max(0,b.hp/b.maxHP),3);}}}
      if(['iron','uranium','research','crystal'].includes(ui.resourceOverlay)){
        const names={iron:'철',uranium:'우라늄',research:'연구',crystal:'결정'};let total=0;
        c.save();c.font='bold 12px "Malgun Gothic",sans-serif';c.textAlign='center';
        for(const b of game.buildings){const production=game.production(b);if(production?.resource!==ui.resourceOverlay)continue;total+=production.rate;
          const p=this.point(b.x+.5,b.y+.5),full=production.resource!=='research'&&game.resources[production.resource]>=game.capacity();
          const label=names[production.resource]+' +'+production.rate+'/s'+(full?' · 가득 참':production.rate===0?' · 중지':'');
          const width=c.measureText(label).width+12;c.fillStyle='#132019ee';c.fillRect(p.x-width/2,p.y-39,width,19);c.fillStyle=production.rate>0?'#e5eabf':'#ef9a83';c.fillText(label,p.x,p.y-25);
        }
        const label=ui.resourceOverlay==='crystal'?'결정 · 적 처치 / 거래로 획득':names[ui.resourceOverlay]+' 총 생산 +'+total+'/s';c.fillStyle='#132019ee';c.fillRect(120,773,320,25);c.fillStyle='#e5eabf';c.fillText(label,280,790);c.restore();
      }
      if(ui.placing&&ui.tile){const p=this.point(ui.tile.x,ui.tile.y),valid=!game.canBuild(ui.placing,ui.tile.x,ui.tile.y);c.fillStyle=valid?'#b5d49a30':'#e79b6130';c.strokeStyle=valid?'#d8e8b1':'#ef9a73';c.lineWidth=2;c.fillRect(p.x+2,p.y+2,66,50);c.strokeRect(p.x+2,p.y+2,66,50);c.save();c.globalAlpha=.65;c.translate(p.x+35,p.y+27);structure(c,ui.placing);c.restore();}
      for(const f of this.fx){f.life+=delta;const q=f.life/f.duration,p=this.point(f.x,f.y);c.save();c.globalAlpha=Math.max(0,1-q);
        if(f.type==='shot'&&['flame','frost'].includes(f.weapon)){
          const target=this.point(f.tx,f.ty),dx=target.x-p.x,dy=target.y-(p.y-9),length=Math.hypot(dx,dy)||1;
          for(let i=0;i<9;i++){const t=D.clamp(q*1.45-i*.075,0,1);if(t<=0)continue;const spread=Math.sin(i*2.4)*t*length*.19,r=3+t*8+(i%3);
            const x=p.x+dx*t-dy/length*spread,y=p.y-9+dy*t+dx/length*spread;
            c.globalAlpha=(1-q)*(.55-.25*t);c.fillStyle=f.weapon==='flame'?(i%2?'#ffb64f':'#ff7043'):(i%2?'#dcf8ff':'#85ccf4');c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
            c.globalAlpha=(1-q)*.55;c.fillStyle=f.weapon==='flame'?'#ffe5a0':'#efffff';c.beginPath();c.arc(x-r*.2,y-r*.2,r*.4,0,Math.PI*2);c.fill();
          }
        }
        else if(f.type==='shot'){const target=this.point(f.tx,f.ty);line(c,p.x,p.y-9,target.x,target.y,f.color,f.weapon==='laser'?2:f.weapon==='sniper'?1:2);c.fillStyle='#ffdf9e';c.beginPath();c.arc(target.x,target.y,f.weapon==='mortar'?12+q*45:3+q*5,0,Math.PI*2);c.fill();}
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
