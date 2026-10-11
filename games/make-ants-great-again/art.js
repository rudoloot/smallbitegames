(function(G){
  'use strict';
  const BLACK='#000000';
  const types={queen:{headY:-47,headX:22,headR:24,bellyY:75,bellyX:34,bellyR:48,scale:1},soldier:{headY:-46,headX:29,headR:26,bellyY:66,bellyX:24,bellyR:35,scale:.97},worker:{headY:-44,headX:20,headR:22,bellyY:65,bellyX:23,bellyR:35,scale:.84},enemy:{headY:-46,headX:29,headR:26,bellyY:66,bellyX:24,bellyR:35,scale:.97}};
  function ellipse(c,x,y,rx,ry,fill,stroke=BLACK,width=3.4){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function curve(c,points,color,width){c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=4)c.quadraticCurveTo(...points.slice(i,i+4));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
  function ant(c,type,x,y,size=1,angle=0,phase=0,moving=false,color=null){
    const body=color??(type==='enemy'?'#D84949':G.AntGame?.ROOMS?.[type]?.objectColor??BLACK);
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    if(type==='egg'){ellipse(c,0,0,17,27,body,BLACK,2.5);c.restore();return;}
    if(type==='larva'){
      c.beginPath();c.moveTo(0,-35);c.bezierCurveTo(12,-35,19,-20,20,-5);c.bezierCurveTo(21,14,14,35,0,35);c.bezierCurveTo(-14,35,-21,14,-20,-5);c.bezierCurveTo(-19,-20,-12,-35,0,-35);c.closePath();c.fillStyle=body;c.fill();c.strokeStyle=BLACK;c.lineWidth=2.5;c.stroke();
      for(const [w,y] of [[18,-12],[20,0],[18,12],[13,24]])curve(c,[-w,y,0,y+5,w,y],BLACK,1.1);
      ellipse(c,0,-26,11,10,body,BLACK,2);for(const side of [-1,1])ellipse(c,side*6,-27,1.8,2,BLACK,null);c.restore();return;
    }
    if(type==='aphid'){
      for(const side of [-1,1])for(let row=0;row<3;row++)curve(c,[side*7,row*6-7,side*13,row*6-11,side*18,row*6-5],BLACK,1.6);
      c.beginPath();c.moveTo(0,-8);c.bezierCurveTo(8,-7,16,7,13,17);c.bezierCurveTo(9,27,-9,27,-13,17);c.bezierCurveTo(-16,7,-8,-7,0,-8);c.closePath();c.fillStyle=body;c.fill();c.strokeStyle=BLACK;c.lineWidth=2;c.stroke();
      ellipse(c,0,-12,8,7,body,BLACK,2);for(const side of [-1,1]){curve(c,[side*4,-17,side*9,-25,side*14,-27],BLACK,1.8);curve(c,[side*10,13,side*13,15,side*14,18],BLACK,2);ellipse(c,side*6,-13,1.7,2,BLACK,null);}c.restore();return;
    }
    const t=types[type]??types.worker;c.scale(t.scale,t.scale);
    for(const side of [-1,1])for(let row=0;row<3;row++){
      const hy=[-16,-1,15][row],ky=[-32,3,34][row],fy=[-53,10,66][row],offset=row%2*Math.PI+(side>0?Math.PI:0),swing=moving?Math.sin(phase+offset)*9:0;
      curve(c,[side*10,hy,side*23,hy+side*swing,side*34,ky+swing,side*46,ky+swing,side*56,fy+swing],BLACK,4.3);
    }
    ellipse(c,0,t.bellyY,t.bellyX,t.bellyR,body,BLACK,3);
    ellipse(c,0,28,6,8,body,BLACK,2.5);ellipse(c,0,40,7,7,body,BLACK,2.5);ellipse(c,0,-3,13,23,body,BLACK,3);
    const top=t.headY-t.headR;
    for(const side of [-1,1]){
      curve(c,[side*7,top+5,side*14,top-8,side*4,top-12],BLACK,type==='soldier'||type==='enemy'?5:3.3);
      curve(c,[side*10,top+9,side*18,top-14,side*24,top-16,side*29,top-17,side*36,top-10],BLACK,3);
    }
    ellipse(c,0,t.headY,t.headX,t.headR,body,BLACK,3);
    for(const side of [-1,1])ellipse(c,side*t.headX*.83,t.headY-2,2.8,4,BLACK,null);
    c.restore();
  }
  function foodBug(c,bug,x=bug.x,y=bug.y,size=1){
    c.save();c.translate(x,y);c.rotate(Number.isFinite(bug.angle)?bug.angle:bug.dir>0?Math.PI/2:-Math.PI/2);c.scale(size,size);
    const body=bug.variant==='gold'?'#D9AD32':'#F29B38',head=body;
    const flying=bug.travelMode==='fly'&&['arriving','leaving'].includes(bug.lifecycle);
    if(flying)for(const side of [-1,1]){c.save();c.rotate(side*(.45+Math.sin(bug.phase*1.8)*.3));ellipse(c,side*8,1,7.5,3.5,'#F5F5F5',BLACK,.7);c.restore();}
    for(const side of [-1,1])for(let row=0;row<3;row++){const y=-2+row*3,swing=bug.moving&&!flying?Math.sin(bug.phase+row*Math.PI+(side>0?Math.PI:0))*1.7:0;curve(c,[side*3,y,side*6,y+swing,side*8,y+2+swing],BLACK,1.1);}
    ellipse(c,0,2,5.2,6.5,body,BLACK,1.1);curve(c,[0,-3,0,2,0,7],BLACK,.6);
    ellipse(c,0,-5,3.9,3.5,head,BLACK,1.1);
    for(const side of [-1,1]){curve(c,[side*2,-7,side*3,-10,side*5,-10],BLACK,.9);ellipse(c,side*1.6,-5.8,.95,1.1,BLACK,null);}
    c.restore();
  }
  function grub(c,bug,x=bug.x,y=bug.y,size=1){
    c.save();c.translate(x,y);c.rotate(bug.angle);c.scale(size*.5,size*.5);
    const wiggle=Math.sin(bug.phase)*.7;
    c.beginPath();c.moveTo(-4,7);c.bezierCurveTo(-12,4,-11,-7,-3,-8);c.bezierCurveTo(4,-10,9,-3+wiggle,5,4+wiggle);
    c.lineCap='round';c.lineJoin='round';c.strokeStyle=BLACK;c.lineWidth=10.5;c.stroke();c.strokeStyle='#fff3d7';c.lineWidth=8.4;c.stroke();
    for(const [x,y,angle] of [[-7,4,-.7],[-9,-1,0],[-7,-6,.8],[-2,-8,1.4],[3,-7,2]]){
      c.save();c.translate(x,y);c.rotate(angle);curve(c,[-3,0,0,1.2,3,0],BLACK,.75);c.restore();
    }
    for(const side of [-1,1]){const sway=Math.sin(bug.phase+side)*.6;curve(c,[5+side*3,1,5+side*5,1+sway,5+side*6,3+sway],BLACK,.9);}
    ellipse(c,5,4+wiggle,5.1,4.6,'#FFF9E5',BLACK,1);
    ellipse(c,3,5+wiggle,1.15,1.5,BLACK,null);ellipse(c,7,5+wiggle,1.15,1.5,BLACK,null);
    c.restore();
  }
  function foodChunk(c,chunk,x=chunk.x,y=chunk.y,size=1){
    const r=chunk.size??4,shape=chunk.shape??0,kind=chunk.sourceKind??chunk.kind,room=kind==='mushroom'?'mushroom':kind==='honey'?'aphid':'food';c.save();c.translate(x,y);c.scale(size,size);c.rotate(shape);
    c.beginPath();c.moveTo(-r*.9,-r*.4);c.quadraticCurveTo(-r*.2,-r*1.25,r*.6,-r*.8);c.quadraticCurveTo(r*1.2,-r*.3,r*.85,r*.55);c.quadraticCurveTo(r*.15,r*1.1,-r*.6,r*.75);c.quadraticCurveTo(-r*1.25,r*.2,-r*.9,-r*.4);c.closePath();c.fillStyle=G.AntGame?.ROOMS?.[room]?.objectColor??chunk.color??'#F29B38';c.fill();c.strokeStyle=BLACK;c.lineWidth=.8;c.stroke();
    c.restore();
  }
  G.AntGame={...(G.AntGame??{}),drawAnt:ant,drawFoodBug:foodBug,drawGrub:grub,drawFoodChunk:foodChunk};
})(globalThis);
