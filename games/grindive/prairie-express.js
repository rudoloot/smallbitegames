function drawPrairieExpress(horizon,camera){
  const skyline=clamp(horizon+H*.22,H*.26,H*.49);
  const vanishing=W*(.5-.1*Math.sin(camera.yaw)),lens=Math.min(W*.85,H*1.35);
  const point=(x,y,d)=>[vanishing+lens*x/d,skyline+lens*(8-y)/d];
  function oval(x,y,rx,ry,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
  }
  const sky=ctx.createLinearGradient(0,0,0,skyline);
  sky.addColorStop(0,'#609eb4');sky.addColorStop(.68,'#c4dad1');sky.addColorStop(1,'#ffe0a3');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,skyline+1);
  oval(W*.76,skyline*.63,H*.043,H*.043,'#fff3c5');
  for(let i=-2;i<9;i++){
    const x=vanishing+(i-3)*W*.21,y=skyline-H*(.035+.018*Math.cos(i*5));
    poly([[x-W*.18,skyline+1],[x-W*.08,y+H*.018],[x-W*.06,y],[x,y],[x+W*.017,y+H*.021],[x+W*.04,y+H*.023],[x+W*.12,skyline+1]],i%2?'#c19b80':'#cda68b');
  }
  const grass=ctx.createLinearGradient(0,skyline,0,H);
  grass.addColorStop(0,'#ddbc76');grass.addColorStop(.5,'#bd903e');grass.addColorStop(1,'#886232');
  ctx.fillStyle=grass;ctx.fillRect(0,skyline,W,H-skyline);
  function strip(x,w,a,b,color){poly([point(x-w,0,a),point(x+w,0,a),point(x+w,0,b),point(x-w,0,b)],color)}
  const track=-10;
  strip(track,1.8,3,850,'#816244');
  for(let n=Math.ceil((s.z+4)/2);n*2<s.z+130;n++)strip(track,1.45,n*2-s.z,n*2-s.z+.32,'#554438');
  for(const side of [-1,1])strip(track+side*.94,.09,3,850,'#d8c4a4');
  for(let i=Math.floor(s.z/3)+2;i*3<s.z+145;i++){
    const d=i*3-s.z,x=(i%2?1:-1)*(7+((i*37)%43)),[px,py]=point(x,0,d),k=lens/d;
    poly([[px-k,py],[px-.3*k,py-.26*k],[px,py-.08*k],[px+.3*k,py-.36*k],[px+.2*k,py]],'#938043');
  }
  function box(x,d,w,length,bottom,height,side,end,roof){
    const a=d,b=d+length,l=x-w/2,r=x+w/2,y=bottom,t=y+height;
    poly([point(r,y,a),point(r,y,b),point(r,t,b),point(r,t,a)],side);
    poly([point(l,y,a),point(r,y,a),point(r,t,a),point(l,t,a)],end);
    poly([point(l,t,a),point(r,t,a),point(r,t,b),point(l,t,b)],roof);
  }
  const engine=57+14*Math.sin(s.time*.13);
  // Older cars trail the engine toward the camera on the same pair of rails.
  for(let j=0;j<5;j++){
    const d=engine-j*8.5;if(d<3)continue;
    for(const offset of [1.1,5.6]){
      const [x,y]=point(track+1.17,.49,d+offset),k=lens/(d+offset);
      oval(x,y,.24*k,.52*k,'#392e29');oval(x,y,.11*k,.23*k,'#b57c4e');
    }
    if(j===0){
      box(track,d,2.55,2.5,.72,2.65,'#43635b','#304943','#53665c');
      box(track,d-.15,2.85,2.85,3.37,.22,'#443b33','#4a382e','#79604a');
      box(track,d+2.5,2.12,4.8,.85,1.9,'#393d39','#353731','#59605a');
      box(track,d+5.8,.75,.9,2.75,1.4,'#463e37','#403b35','#82644b');
      for(let i=9;i>=0;i--){
        const t=(i+s.time*2%1)/10,depth=d+6-t*8,k=lens/depth;
        const [x,y]=point(track-2*t,4.15+5*t,depth);
        oval(x,y,k*(.32+t),k*(.27+.65*t),'rgba(95,81,67,'+(.38*(1-t))+')');
      }
    }else{
      box(track,d,2.6,7.7,.75,2.35,'#aa5634','#743c2d','#d59a5a');
      box(track,d-.08,2.85,7.9,3.1,.23,'#564535','#544134','#866948');
      for(let w=0;w<5;w++)box(track+1.32,d+.55+w*1.42,.035,.92,1.86,.85,'#374d50','#4a5450','#d2a575');
    }
  }
  // Herds keep their spacing in world metres while the player overtakes them.
  const travel=s.z-s.time*5.4;
  for(let i=Math.floor((travel+110)/4);i>=(travel+6)/4;i--){
    const d=i*4-travel,horse=i%7===0;
    const lateral=(i%13<9?1:-1)*(8+(i*13%17)+Math.sin(s.time*1.5+i)*.7);
    const [x,y]=point(lateral,0,d),k=lens/d,step=s.time*8+i;
    if(x< -3*k||x>W+3*k)continue;
    ctx.save();ctx.translate(x,y);ctx.scale((i%3?-1:1)*k,k);
    oval(0,.02,1.25,.16,'#997645');
    const hide=horse?'#69402c':['#875033','#aa764d','#694637'][i%3];
    for(let leg=0;leg<4;leg++){
      const hip=(leg%2?-.69:.59)+.12*(leg>>1),swing=Math.sin(step+leg*2.5)*.32;
      poly([[hip-.11,-.93],[hip+.12,-.92],[hip+swing+.08,-.08],[hip+swing-.07,-.04]],hide);
    }
    oval(0,-1.03,1.02,.48,hide);
    poly([[.42,-1.22],[.85,horse?-2:-1.6],[1.32,horse?-1.96:-1.52],[1.55,-1.23],[1.27,-1.14],[.86,-1.32],[.68,-.95]],hide);
    if(horse){
      poly([[-.34,-1.38],[-.26,-2.14],[.12,-2.24],[.36,-1.48]],'#42585a');
      oval(-.06,-2.32,.22,.25,'#b77e55');
      ctx.fillStyle='#543e2a';ctx.fillRect(-.48,-2.54,.86,.09);ctx.fillRect(-.26,-2.72,.4,.22);
    }else poly([[.98,-1.5],[.76,-1.84],[1.06,-1.66],[1.29,-1.7],[1.55,-1.9],[1.44,-1.55]],'#efe1b4');
    ctx.restore();
  }
}
