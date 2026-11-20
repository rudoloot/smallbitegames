let skylineAdAtlas;
const skylineBrands=['KOI GARDEN','VECTOR MOTORS','NOVA AUGMENTS','AURUM BANK','PULSE EXCHANGE','WAVE AUDIO'];
const skylineInks=['#ffd08c','#90eaff','#e3acff','#ffdb97','#a0ffd1','#ffb8e1'];
const skylineSigns=new Map();
function signTexture(index,textOnly,time){
  if(!skylineAdAtlas){
    skylineAdAtlas=new Image();
    skylineAdAtlas.src='skyline-holograms.webp';
  }
  const key=index+(textOnly?6:0),frame=Math.floor(time*16);
  let sign=skylineSigns.get(key);
  if(!sign){
    const canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=textOnly?192:512;
    sign={canvas,frame:-1};skylineSigns.set(key,sign);
  }
  if(sign.frame===frame)return sign.canvas;
  sign.frame=frame;
  const c=sign.canvas,g=c.getContext('2d'),name=skylineBrands[index];
  g.clearRect(0,0,c.width,c.height);
  if(!textOnly&&skylineAdAtlas.naturalWidth){
    const tile=skylineAdAtlas.naturalWidth/3;
    g.drawImage(skylineAdAtlas,index%3*tile,Math.floor(index/3)*tile,tile,tile,34,0,444,444);
  }
  g.fillStyle=skylineInks[index];g.font='bold '+(textOnly?74:42)+'px sans-serif';g.textBaseline='middle';
  const repeat=g.measureText(name).width+65;
  const shift=(frame*(textOnly?2.5:1.7)+index*43)%repeat;
  for(let x=-shift;x<c.width;x+=repeat)g.fillText(name,x,textOnly?96:468);
  return c;
}
function paintHologram(uv,index,style,time,camera,textOnly){
  const img=signTexture(index,textOnly,time);
  const [width,height,base]=style;
  const bottom=base+.22*Math.sin(time*1.4+index);
  const project=(u,v)=>{
    const [x,y,d]=uv(.5+(u-.5)*width,bottom+(1-v)*height);
    return d<.5?null:[W*.5+x*camera.focal/d,H*.61+y*camera.focal/d];
  };
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.88;
  // Tile the texture in perspective. Each affine patch stays inside its wall triangle.
  const n=4,stepX=img.width/n,stepY=img.height/n;
  function triangle(a,b,c,u,v,sign){
    if(!a||!b||!c)return;
    ctx.save();ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();ctx.clip();
    ctx.transform(sign*(b[0]-a[0])/stepX,sign*(b[1]-a[1])/stepX,sign*(c[0]-a[0])/stepY,sign*(c[1]-a[1])/stepY,a[0],a[1]);
    ctx.drawImage(img,-u*img.width,-v*img.height);ctx.restore();
  }
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const u=i/n,v=j/n,U=(i+1)/n,V=(j+1)/n;
    const a=project(u,v),b=project(U,v),c=project(u,V),d=project(U,V);
    triangle(a,b,c,u,v,1);triangle(d,c,b,U,V,-1);
  }
  ctx.restore();
}
const skylineAdFormats=[[.86,14,-5],[.64,23,3],[.52,28,-6],[.89,12,9],[.58,20,1]];
function skylineDensity(z){
  const u=clamp((z/FINISH-.12)/.55,0,1);return u*u*(3-2*u);
}
function drawSkylineConcert(camera){
  const remaining=FINISH-s.z;
  if(remaining>500)return;
  const gate=songCourse.portal,center=gate.x;
  const floor=reviewSurface(center,FINISH)+gate.bottom;
  const p=(x,h)=>reviewPoint(center+x,floor+h,FINISH,camera);
  const panel=(x,y,w,h,color)=>poly([p(x,y),p(x+w,y),p(x+w,y+h),p(x,y+h)],color);
  const beam=(x,y,u,v,color,width)=>{ctx.beginPath();ctx.moveTo(...p(x,y));ctx.lineTo(...p(u,v));ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();};
  const intensity=clamp((500-remaining)/95,0,1),beat=rideMusic.accent();
  const stroke=clamp(camera.focal/(Math.max(0,remaining)+camera.distance)*.20,.55,5);
  ctx.save();ctx.globalAlpha=intensity;
  // Tiered seating and two LED wings leave the actual finish portal open at center stage.
  for(const side of [-1,1]){
    ctx.save();ctx.globalAlpha=intensity*.17;
    for(let j=0;j<3;j++){
      const x=side*(5+j*8),end=x+10*Math.sin(s.time*.75+j+side);
      poly([p(x-.3,12),p(x+.3,12),p(end+4,33+j*2),p(end-4,33+j*2)],j%2?'#ff5cb8':'#72edff');
    }
    ctx.restore();
    for(let row=0;row<5;row++){
      const x=side*(29+row*2),h=-3+row*1.2;
      panel(Math.min(x,x+side*18),h,18,.8,'#363047');
      for(let j=0;j<12;j++)panel(x+side*j*1.46,h+.72,.26,.38,(j+row)%3?'#a7eaff':'#f9a2d8');
    }
    const x=side*15;
    panel(x-9,-1,18,13,'#19152c');
    for(let j=0;j<15;j++){
      const h=2+6*Math.abs(Math.sin(j*.46+s.time*2.2))+beat*2;
      panel(x-8+j*1.08,.6,.79,h,j%4?'#5cbce5':'#f387cc');
    }
    for(const offset of [4,25]){
      const a=side*offset;beam(a,0,a,15,'#747188',stroke*2);beam(a+side*.9,0,a+side*.9,15,'#827f98',stroke);
      for(let j=0;j<5;j++)beam(a,j*3,a+side*.9,j*3+2.8,'#af94b4',stroke);
    }
    for(let j=0;j<4;j++)panel(side*3.2-.5,.6+j*1.18,1.0,.98,'#262235');
  }
  panel(-26,14,52,1.2,'#393147');panel(-26,14,52,.15,'#fbbbdf');
  for(let j=-24;j<=24;j+=3)panel(j,13.7,.6,.35,j%2?'#8df4fc':'#ff91d2');
  ctx.restore();
}
function drawSkylineCity(horizon,camera){
  const point=(x,y,m)=>reviewPoint(x,y,m,camera);
  const base=clamp(horizon+H*.18,H*.18,H*.53);
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#100f2c');sky.addColorStop(base/H,'#68406d');sky.addColorStop(.72,'#29213e');sky.addColorStop(1,'#101526');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Distant skyline stays legible between the two rows of foreground facades.
  for(let layer=0;layer<2;layer++){
    const unit=H*(.044+.031*layer),scroll=camera.yaw*W*.22+s.z*(.026+.025*layer);
    const first=Math.floor(scroll/unit);
    for(let n=first-1;n<first+W/unit+2;n++){
      const x=n*unit-scroll,height=H*(.09+.18*Math.abs(Math.sin(n*2.71+layer))),y=base+H*(.22+layer*.12)-height;
      ctx.fillStyle=layer?'#252343':'#494064';ctx.fillRect(x,y,unit*.9,H-y);
      ctx.fillStyle=layer?'#896195':'#766185';ctx.fillRect(x+unit*.16,y-5,unit*.53,5);
      for(let j=1;j<6;j++)ctx.fillRect(x+unit*.12,y+j*7,unit*.37,1);
    }
  }
  drawSkylineConcert(camera);
  const end=s.z+184,lotSize=25;
  for(let lot=Math.floor(end/lotSize);lot>=Math.floor((s.z-16)/lotSize);lot--){
    for(const side of [-1,1]){
      const seed=Math.abs(lot*17+side*11),z=lot*lotSize-(side<0?11:0);
      if(z>FINISH-70)continue;
      const x=side*(15+seed%9),outer=x+side*(13+seed%6);
      const low=-38,roof=32+seed%53;
      const anchor=reviewSample(z);
      // Each tower has a rigid local frame, including its advertising and trim.
      const dx=anchor.x-camera.x,dz=anchor.z-camera.z;
      const angle=anchor.yaw-camera.yaw,cs=Math.cos(angle),sn=Math.sin(angle);
      const cx=dx*camera.cos-dz*camera.sin-camera.sideOffset,cz=dx*camera.sin+dz*camera.cos;
      function vertex(u,h,v){
        const f=cz-u*sn+v*cs,down=camera.targetY-h+anchor.h-camera.h;
        return [cx+u*cs+v*sn,down*camera.tiltCos-f*camera.tiltSin,camera.distance+f*camera.tiltCos+down*camera.tiltSin];
      }
      function paint(vertices,color){
        const screen=[];
        const project=([u,h,d])=>screen.push([W*.5+u*camera.focal/d,H*.61+h*camera.focal/d]);
        for(let i=0;i<vertices.length;i++){
          const a=vertices[i],b=vertices[(i+1)%vertices.length];
          if(a[2]>=.5)project(a);
          if((a[2]>=.5)!==(b[2]>=.5)){
            const t=(.5-a[2])/(b[2]-a[2]);project([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),.5]);
          }
        }
        if(screen.length>=3)poly(screen,color);
      }
      const eyeForward=-camera.distance*camera.tiltCos;
      const eyeX=(camera.sideOffset-(dx*camera.cos-dz*camera.sin))*cs-(eyeForward-cz)*sn;
      const eyeZ=(camera.sideOffset-(dx*camera.cos-dz*camera.sin))*sn+(eyeForward-cz)*cs;
      function facade(sideWall,back=false){
        const inner=sideWall&&(eyeX-x)*side<0;
        const uv=(u,v)=>sideWall?vertex(inner?x:outer,v,u*22):vertex(x+(outer-x)*u,v,back?22:0);
        const panel=(points,color)=>paint(points.map(([u,v])=>uv(u,v)),color);
        const rect=(a,b,y,h,color)=>panel([[a,y],[b,y],[b,h],[a,h]],color);
        rect(0,1,low,roof,sideWall?'#212238':'#382e49');
        for(let y=low+2;y<roof-1;y+=5)rect(0,1,y,y+.27,'#594d69');
        for(let i=1;i<5;i++)rect(i/5,i/5+.009,low,roof,side>0?'#78539c':'#347d89');
        if(lot<2)return;
        const density=skylineDensity(z);
        // Fixed lots keep signs attached to their walls throughout the approach.
        if(lot%4!==0&&(lot%2===0?density<.28:density<.48+.12*(lot%4)))return;
        const placement=lot-1;
        if(side!==(Math.floor(placement/2)%2?1:-1)||back||sideWall!==(side<0))return;
        // Orient the writing left to right even on the far side of a bend.
        const start=uv(0,0),end=uv(1,0);
        const flip=start[0]*end[2]>end[0]*start[2];
        const faceUV=(u,v)=>uv(flip?1-u:u,v);
        const textOnly=placement%4===2,format=skylineAdFormats[placement%skylineAdFormats.length];
        const style=textOnly?[.93,6,format[2]+4]:format;
        paintHologram(faceUV,placement%6,style,s.time,camera,textOnly);
      }
      if((eyeX-x)*side<0||(eyeX-outer)*side>0)facade(true);
      if(eyeZ<0||eyeZ>22)facade(false,eyeZ>22);
    }
    // Opposing streams fly at different heights; their lights describe the traffic lanes.
    for(const side of [-1,1])for(let lane=0;lane<2;lane++){
      const spacing=lotSize,travel=s.time*side*(11+lane*4)+lane*13;
      const m=lot*spacing+((travel%spacing)+spacing)%spacing;
      if(m<s.z+4||m>end)continue;
      const vehicleId=lot-Math.floor(travel/spacing);
      const density=skylineDensity(m),seed=Math.abs(vehicleId*37+side*17)%11/11;
      const opacity=lane===0&&vehicleId%3===0?1:clamp((density-(lane?.46:.05)-seed*.38)/.14,0,1);
      if(!opacity||m>FINISH-35)continue;
      ctx.save();ctx.globalAlpha=opacity;
      const x=side*(8.5+lane*4+Math.abs(vehicleId%3)*1.6),y=(side>0?.8:-2.8)+lane*5;
      const car=(u,h,v)=>point(x+u,y+h,m+v);
      poly([car(-1,0,-1.8),car(.96,0,-1.8),car(.84,.45,1.6),car(-.84,.45,1.6)],'#7783ab');
      poly([car(-.64,.33,-.75),car(.64,.33,-.75),car(.45,.87,.7),car(-.45,.87,.7)],'#a1d8e2');
      for(const lamp of [-.69,.69]){
        const a=car(lamp,.05,-1.8),b=car(lamp,.06,-1.8-side*2.7);
        ctx.strokeStyle=side>0?'#ff51bc':'#8dfbff';ctx.lineWidth=clamp(H/(m-s.z+4)*.12,1,4);
        ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
      }
      ctx.restore();
    }
  }
}
