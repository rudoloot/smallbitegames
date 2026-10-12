(function(G){
  'use strict';
  const INK='#293837',colors=()=>G.AntGame?.ART_COLORS??{egg:'#FFF4D8',larva:'#F3D84C',food:'#F28B43'};
  const types={queen:{headX:23,headR:24,bellyX:32,bellyR:45,scale:1},soldier:{headX:28,headR:26,bellyX:23,bellyR:34,scale:.97},worker:{headX:19,headR:21,bellyX:22,bellyR:34,scale:.84},enemy:{headX:28,headR:26,bellyX:23,bellyR:34,scale:.97}};
  function ellipse(c,x,y,rx,ry,fill,stroke=null,width=1.5){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function curve(c,points,color,width){c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=4)c.quadraticCurveTo(...points.slice(i,i+4));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
  function ant(c,type,x,y,size=1,angle=0,phase=0,moving=false,color=null){
    const palette=colors(),body=color??(type==='enemy'?'#D84949':G.AntGame?.ROOMS?.[type]?.objectColor??INK);
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    if(type==='egg'){ellipse(c,0,0,17,27,palette.egg,'#A99C79',1.6);c.restore();return;}
    if(type==='larva'){
      c.beginPath();c.moveTo(0,-34);c.bezierCurveTo(26,-34,27,34,0,34);c.bezierCurveTo(-27,34,-26,-34,0,-34);c.closePath();c.fillStyle=palette.larva;c.fill();c.strokeStyle='#A18B36';c.lineWidth=1.5;c.stroke();
      for(const y of [-9,8])curve(c,[-17,y,0,y+4,17,y],'#BBA346',1.3);
      c.restore();return;
    }
    if(type==='aphid'){
      for(const side of [-1,1])for(let row=0;row<3;row++)curve(c,[side*6,row*6-6,side*12,row*6-9,side*16,row*6-3],INK,1.4);
      ellipse(c,0,9,12,16,body);ellipse(c,0,-9,7,7,body);
      for(const side of [-1,1])curve(c,[side*3,-14,side*7,-21,side*11,-23],INK,1.4);c.restore();return;
    }
    const t=types[type]??types.worker;c.scale(t.scale,t.scale);
    for(const side of [-1,1])for(let row=0;row<3;row++){
      const y=[-13,2,16][row],foot=[-39,11,52][row],swing=moving?Math.sin(phase+row*Math.PI+(side>0?Math.PI:0))*8:0;
      curve(c,[side*9,y,side*24,y+swing,side*46,foot+swing],INK,3.2);
    }
    ellipse(c,0,62,t.bellyX,t.bellyR,body);ellipse(c,0,24,5,9,body);ellipse(c,0,-1,12,22,body);ellipse(c,0,-43,t.headX,t.headR,body);
    for(const side of [-1,1])curve(c,[side*10,-59,side*20,-77,side*32,-81],INK,2.6);
    c.restore();
  }
  function foodBug(c,bug,x=bug.x,y=bug.y,size=1){
    c.save();c.translate(x,y);c.rotate(Number.isFinite(bug.angle)?bug.angle:bug.dir>0?Math.PI/2:-Math.PI/2);c.scale(size,size);
    const flying=bug.travelMode==='fly'&&['arriving','leaving'].includes(bug.lifecycle);
    if(flying)for(const side of [-1,1]){c.save();c.rotate(side*(.45+Math.sin(bug.phase*1.8)*.3));ellipse(c,side*8,1,7.5,3.5,'#E4ECE8');c.restore();}
    for(const side of [-1,1])for(let row=0;row<3;row++){const y=-2+row*3,swing=bug.moving&&!flying?Math.sin(bug.phase+row*Math.PI+(side>0?Math.PI:0))*1.7:0;curve(c,[side*3,y,side*6,y+swing,side*8,y+2+swing],INK,.85);}
    ellipse(c,0,2,5.2,6.5,colors().food);ellipse(c,0,-5,3.6,3.3,INK);
    for(const side of [-1,1])curve(c,[side*2,-7,side*3,-10,side*5,-10],INK,.8);c.restore();
  }
  function grub(c,bug,x=bug.x,y=bug.y,size=1){
    c.save();c.translate(x,y);c.rotate(bug.angle);c.scale(size*.5,size*.5);
    const wiggle=Math.sin(bug.phase)*.7;
    c.beginPath();c.moveTo(-4,7);c.bezierCurveTo(-12,4,-11,-7,-3,-8);c.bezierCurveTo(4,-10,9,-3+wiggle,5,4+wiggle);c.lineCap='round';c.lineJoin='round';c.strokeStyle=colors().food;c.lineWidth=9;c.stroke();
    ellipse(c,5,4+wiggle,4.5,4,INK);c.restore();
  }
  function foodChunk(c,chunk,x=chunk.x,y=chunk.y,size=1){
    const r=chunk.size??4;c.save();c.translate(x,y);c.scale(size,size);c.rotate((chunk.shape??0)*.12);
    c.beginPath();c.roundRect(-r,-r,r*2,r*2,r*.45);c.fillStyle=colors().food;c.fill();c.restore();
  }
  G.AntGame={...(G.AntGame??{}),drawAnt:ant,drawFoodBug:foodBug,drawGrub:grub,drawFoodChunk:foodChunk};
})(globalThis);
