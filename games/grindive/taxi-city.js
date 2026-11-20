// Distant buildings are tiled artwork. Traffic and streets use the course camera.
const taxiSkylineTiles=[];
function taxiFade(a,b,t){
  const u=clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);
}
function taxiSeed(n){const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);}
function taxiColor(a,b,t){
  const rgb=[16,8,0].map(shift=>{const x=(a>>shift)&255;return Math.round(x+(((b>>shift)&255)-x)*t);});
  return 'rgb('+rgb.join(',')+')';
}
const taxiDarkPane='#111218';
function taxiWindowColor(id,occupancy,time){
  if(taxiSeed(id)>occupancy)return taxiDarkPane;
  const start=14+67*taxiSeed(id+61.7),light=taxiFade(start,start+1.6,time);
  if(!light)return taxiDarkPane;
  const warm=taxiSeed(id+19.1)>.48;
  if(light===1)return warm?'#ffcb8f':'#efe0b7';
  return taxiColor(0x111218,warm?0xffcb8f:0xefe0b7,light);
}
function taxiSkyline(layer){
  if(taxiSkylineTiles[layer])return taxiSkylineTiles[layer];
  const tile=document.createElement('canvas');
  tile.width=1024;tile.height=208;
  const g=tile.getContext('2d');
  const lights=Array.from({length:5},()=>{const c=document.createElement('canvas');c.width=tile.width;c.height=tile.height;return c;});
  const inks=lights.map(c=>c.getContext('2d'));
  let seed=521+layer*601;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let x=0;x<tile.width;){
    const w=14+Math.floor(random()*50),h=25+Math.floor(random()*98);
    const y=tile.height-h;
    g.fillStyle=layer?'#554051':'#a37980';
    g.fillRect(x,y,w,h);
    g.fillRect(x+w*.15,y-4,w*.55,4);
    if(random()>.75){
      g.fillRect(x+w*.34,y-13,w*.31,13);
      g.fillRect(x+w*.49,y-26,1,15);
    }
    g.fillStyle=layer?'#ac7973':'#c8968b';
    g.fillRect(x,y,2,h);
    const occupancy=.16+.32*taxiSeed(x+layer*131);
    for(let yy=y+7;yy<tile.height;yy+=8)
      for(let xx=x+5;xx<x+w-3;xx+=8){
        const paneWidth=3+Math.floor(random()*3);
        g.fillStyle=taxiDarkPane;g.fillRect(xx,yy,paneWidth,2);
        if(random()>=occupancy)continue;
        const ink=inks[Math.floor(random()*inks.length)];
        ink.fillStyle=random()>.28?'#efba83':'#f6dfac';
        ink.fillRect(xx,yy,paneWidth,2);
      }
    x+=w+2+Math.floor(random()*5);
  }
  return taxiSkylineTiles[layer]={tile,lights};
}
function drawTaxiCity(horizon,camera){
  const point=(x,y,m)=>reviewPoint(x,y,m,camera);
  const time=s.time,night=taxiFade(12,78,time),urban=taxiFade(19,45,time),base=clamp(horizon,H*.11,H*.72);
  const sky=ctx.createLinearGradient(0,0,0,Math.max(base+H*.32,H*.42));
  sky.addColorStop(0,taxiColor(0x986a83,0x11162e,night));sky.addColorStop(.48,taxiColor(0xf09b81,0x232743,night));
  sky.addColorStop(.78,taxiColor(0xffd19a,0x46415c,night));sky.addColorStop(1,taxiColor(0x997482,0x2a293c,night));
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const sunX=W*(.72-.16*Math.sin(camera.yaw)),sunY=base-H*(.045-night*.18);
  ctx.globalAlpha=1-night;ctx.fillStyle='#ffdfac';ctx.beginPath();ctx.arc(sunX,sunY,H*.077,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  for(let layer=0;layer<2;layer++){
    const {tile:img,lights}=taxiSkyline(layer),scale=H*(layer?.32:.22)*(.66+.34*urban)/img.height,width=img.width*scale;
    const bottom=base+H*(layer?.17:.08);
    const offset=camera.yaw*W*(layer?.48:.30)+s.z*(layer?.04:.016);
    for(let x=-((offset%width+width)%width);x<W;x+=width){
      const y=bottom-img.height*scale,h=img.height*scale;
      ctx.drawImage(img,x,y,width+.5,h);
      lights.forEach((light,i)=>{
        const start=16+i*10;ctx.globalAlpha=taxiFade(start,start+9,time);
        if(ctx.globalAlpha)ctx.drawImage(light,x,y,width+.5,h);
      });
      ctx.globalAlpha=1;
    }
    ctx.fillStyle=layer?'#554051':'#a37980';ctx.fillRect(0,bottom,W,H-bottom);
  }
  // Rows of roofs fill the distance between the skyline and the moving street.
  for(let row=0;row<4;row++){
    const unit=H*(.09+row*.055),stride=unit*1.24;
    const scroll=camera.yaw*W*(.38+row*.06)+s.z*(.026+row*.015);
    const first=Math.floor(scroll/stride);
    const y=base+H*(.14+row*.054);
    for(let i=first-1;i<first+W/stride+2;i++){
      const x=i*stride-scroll,variation=Math.abs(i*13+row*7)%5;
      const top=y-unit*(.04+.052*variation),w=unit*(.66+.06*variation),skew=unit*.14;
      poly([[x,top],[x+w,top],[x+w+skew,top+skew*.44],[x+skew,top+skew*.44]],'#98757a');
      ctx.fillStyle='#695463';ctx.fillRect(x+skew,top+skew*.44,w,unit*.3);
      for(let pane=0;pane<4;pane++){
        ctx.fillStyle=taxiWindowColor(i*57+row*353+pane,.16+.32*taxiSeed(i+row*231),time);
        ctx.fillRect(x+skew+w*(.08+.23*pane),top+unit*.14,w*.13,Math.max(1,unit*.032));
      }
    }
  }
  ctx.fillStyle='rgba(18,23,56,'+(.04+.23*night)+')';ctx.fillRect(0,0,W,H);
  const street=-9,lead=224;
  const cross=songCourse.ramps.find(r=>r.jumpTransfer);
  const junction=cross?Math.round((cross.b+12)/8)*8:-100;
  const quad=(x0,x1,z0,z1,y,color)=>poly([point(x0,y,z0),point(x1,y,z0),point(x1,y,z1),point(x0,y,z1)],color);
  // Same-direction yellow taxis can be overtaken. The other lane flows uphill.
  const cars=[];
  for(let lane=0;lane<4;lane++){
    const spacing=lane%2?30:24,shift=(lane<2?10:-14)*s.time+lane*13;
    for(let n=Math.ceil((s.z+1-shift)/spacing);;n++){
      const z=n*spacing+shift;if(z>s.z+lead)break;
      const seed=taxiSeed(n*11+lane*307);
      const opacity=seed<.22?1:taxiFade(19+seed*17,24+seed*17,time);
      if(!opacity)continue;
      const lights=taxiFade(54+seed*18,56+seed*18,time);
      cars.push({z,opacity,lights,x:[-5.4,-2.1,2.1,5.4][lane],oncoming:lane>=2,taxi:(n+lane)%3===0});
    }
  }
  cars.sort((a,b)=>b.z-a.z);
  let carIndex=0;
  function vehicle(x,z,taxi,oncoming,lights,across=false){
    const p=(u,v,h)=>across?point(x+v,street+h,z+u):point(x+u,street+h,z+v);
    const top=(w,l,h,color)=>poly([p(-w,-l,h),p(w,-l,h),p(w,l,h),p(-w,l,h)],color);
    const body=taxi?taxiColor(0xe4af5e,0xb08246,night):oncoming?taxiColor(0x8e92aa,0x535d78,night):taxiColor(0xab7272,0x764e61,night);
    top(.85,1.9,.07,'#34303f');top(.84,1.9,.70,body);
    poly([p(-.84,-1.9,.25),p(.84,-1.9,.25),p(.84,-1.9,.7),p(-.84,-1.9,.7)],taxi?'#996742':'#585065');
    top(.71,1.12,.78,'#494655');top(.59,.7,1.16,body);
    if(taxi)top(.29,.14,1.23,'#ffe3a0');
    for(const side of [-1,1]){
      const u=side*.65;
      poly([p(u-.14,-1.91,.44),p(u+.14,-1.91,.44),p(u+.14,-1.91,.64),p(u-.14,-1.91,.64)],oncoming?taxiColor(0xb6a794,0xfff4cc,lights):taxiColor(0x8b504b,0xff705e,lights));
    }
  }
  const pavement=taxiColor(0x423d4e,0x232838,night);
  const ground=taxiColor(0x806555,0x353346,night);
  const sideWall=taxiColor(0x785e63,0x2c2c40,night),frontWall=taxiColor(0x986f6a,0x41364a,night);
  // Clip each headlight footprint to the street slice that owns it.
  function headlights(car,a,b){
    const dir=car.oncoming?-1:1, nose=car.z+dir*1.9,reach=8;
    const near=Math.max(0,Math.min((a-nose)*dir,(b-nose)*dir)),far=Math.min(reach,Math.max((a-nose)*dir,(b-nose)*dir));
    if(near>=far||!car.lights)return;
    ctx.globalAlpha=.23*car.lights*car.opacity;
    for(const side of [-1,1]){
      const x=car.x+side*.59;
      const edge=(d,k)=>point(x+k*(.15+.12*d),street+.035,nose+dir*d);
      poly([edge(near,-1),edge(near,1),edge(far,1),edge(far,-1)],'#ffdf9a');
    }
    ctx.globalAlpha=1;
  }
  function streetLamp(side,z){
    const lightAt=24+taxiSeed(z*1.37+side)*35,lit=taxiFade(lightAt,lightAt+2,time);
    const pole=side*8.7,lamp=side*7.35;
    const foot=point(pole,street,z),arm=point(pole,street+4.7,z),bulb=point(lamp,street+4.9,z);
    const size=Math.max(.65,Math.hypot(arm[0]-foot[0],arm[1]-foot[1])*.032);
    if(lit){
      ctx.globalAlpha=lit*.18;
      const pool=[];for(let i=0;i<12;i++){const t=i*Math.PI/6;pool.push(point(lamp+1.7*Math.cos(t),street+.04,z+3*Math.sin(t)));}
      poly(pool,'#ffcf80');ctx.globalAlpha=1;
    }
    ctx.lineWidth=size;ctx.strokeStyle='#494752';ctx.beginPath();ctx.moveTo(...foot);ctx.lineTo(...arm);ctx.lineTo(...bulb);ctx.stroke();
    if(lit){ctx.globalAlpha=lit*.22;ctx.fillStyle='#ffbc68';ctx.beginPath();ctx.arc(...bulb,size*3.3,0,2*Math.PI);ctx.fill();}
    ctx.globalAlpha=1;ctx.fillStyle=taxiColor(0x8e8274,0xffedba,lit);ctx.beginPath();ctx.arc(...bulb,size*1.35,0,2*Math.PI);ctx.fill();
  }
  for(let z=Math.floor((s.z+lead)/8)*8;z+8>s.z-2;z-=8){
    const a=Math.max(z,s.z-2),b=z+8,isCross=Math.abs(z-junction)<12;
    quad(-42,42,a,b,street-.3,ground);
    quad(-8,8,a,b,street,pavement);
    if(isCross)quad(-42,42,a,b,street,pavement);
    else{
      for(const x of [-7.6,7.45])quad(x,x+.15,a,b,street+.02,'#bf9e81');
      for(const x of [-3.8,3.75])quad(x,x+.09,a,Math.min(a+3,b),street+.02,'#ae998e');
      quad(-.08,.08,a,b,street+.02,'#bf9970');
    }
    if(z===junction+16||z===junction-16)
      for(let x=-7.4;x<7.4;x+=1.25)quad(x,x+.66,a,Math.min(a+2.5,b),street+.02,'#baaaa0');
    for(const car of cars)if(Math.abs(car.z-z)<20)headlights(car,a,b);
    // A narrow frontage on each side keeps the landing corridor clear.
    const lot=Math.floor(z/24);
    if(z===lot*24&&!isCross){
      for(const sign of [-1,1]){
        const salt=Math.abs(lot*17+sign*31)%13;
        // Density belongs to the lot, so an existing building keeps its shape as we approach.
        const district=taxiFade(20,42,songPosition(songCourse,Math.min(z,FINISH)).time);
        if(taxiSeed(lot*37+sign*3)>.40+.60*district)continue;
        const tower=district>.42&&(salt===2||salt===6||salt===11);
        const x=sign*((tower?22:12)+salt%3),edge=x+sign*(tower?9:5+salt%4),end=z+(tower?18:12)+salt%5;
        const roof=street+(tower?14+salt*1.35:3.5+salt*.34);
        poly([point(x,street,z),point(x,street,end),point(x,roof,end),point(x,roof,z)],sideWall);
        poly([point(x,street,z),point(edge,street,z),point(edge,roof,z),point(x,roof,z)],frontWall);
        quad(Math.min(x,edge),Math.max(x,edge),z,end,roof,taxiColor(0xa47b78,0x4f4258,night));
        const occupancy=.16+.32*taxiSeed(lot*23+sign);
        for(let floor=street+1.4;floor<roof-.4;floor+=1.6){
          for(let m=z+1;m<end-1;m+=3){
            const color=taxiWindowColor(m*2.6+floor*11+sign*19,occupancy,time);
            poly([point(x,floor,m),point(x,floor+.6,m),point(x,floor+.6,m+1.4),point(x,floor,m+1.4)],color);
          }
        }
        if(tower){
          const inset=x+sign*1.1,back=edge-sign*1.2,crown=roof+2.8;
          poly([point(inset,roof,z+2),point(inset,roof,end-2),point(inset,crown,end-2),point(inset,crown,z+2)],'#604c60');
          poly([point(inset,roof,z+2),point(back,roof,z+2),point(back,crown,z+2),point(inset,crown,z+2)],'#8d6972');
          quad(Math.min(inset,back),Math.max(inset,back),z+2,end-2,crown,'#ba8c83');
        }
        for(let floor=street+1.4;floor<roof-.4;floor+=2.4){
          for(let u=1;u<Math.abs(edge-x)-.8;u+=2.1){
            const left=x+sign*u,right=left+sign*.95;
            const color=taxiWindowColor(z*7+u*19+floor*5+sign,occupancy,time);
            poly([point(left,floor,z),point(right,floor,z),point(right,floor+.65,z),point(left,floor+.65,z)],color);
          }
        }
        if(salt%4===0)quad(Math.min(x,edge)+.7,Math.max(x,edge)-.7,z+1,z+2,roof+.12,'#e49a83');
      }
    }
    if(!isCross&&z%16===0)streetLamp(z%32===0?-1:1,z+4);
    if(z===junction)for(let j=0;j<3;j++)vehicle(((s.time*10+j*14)%42)-21,junction+2,j===1,false,taxiFade(54+j*4,57+j*4,time),true);
    while(carIndex<cars.length&&cars[carIndex].z>=a){
      const car=cars[carIndex++];ctx.globalAlpha=car.opacity;vehicle(car.x,car.z,car.taxi,car.oncoming,car.lights);ctx.globalAlpha=1;
    }
  }
}
