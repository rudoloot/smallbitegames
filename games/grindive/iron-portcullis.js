// All siege scenery is decorative. It only projects and paints the current frame.
let ironFortArt;
function ironFortress(){
  if(ironFortArt)return ironFortArt;
  const art=document.createElement('canvas');art.width=1400;art.height=380;
  const g=art.getContext('2d');
  function shape(points,color){
    g.fillStyle=color;g.beginPath();for(const [i,[x,y]] of points.entries())i?g.lineTo(x,y):g.moveTo(x,y);
    g.closePath();g.fill();
  }
  function stone(x,y,w,h,shadow=false){
    const fill=g.createLinearGradient(x,y,x+w,y+h);
    fill.addColorStop(0,shadow?'#77776d':'#afa68d');fill.addColorStop(.63,shadow?'#575e59':'#817f70');fill.addColorStop(1,'#555b55');
    g.fillStyle=fill;g.fillRect(x,y,w,h);
    g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    g.fillStyle='rgba(44,46,41,.18)';
    for(let j=0;j<h/12;j++){
      g.fillRect(x,y+j*12,w,1);
      for(let k=j%2?-14:0;k<w;k+=29)g.fillRect(x+k,y+j*12,1,12);
    }
    g.restore();
  }
  function parapet(x,y,w){
    g.fillStyle='#c3b9a2';g.fillRect(x,y,w,5);
    for(let i=x;i<x+w-5;i+=16){g.fillStyle='#a29d87';g.fillRect(i,y-8,10,9);g.fillStyle='#d2c5a5';g.fillRect(i,y-9,10,2);}
  }
  function banner(x,y,h){
    g.fillStyle='#4c4540';g.fillRect(x,y,2,h);
    shape([[x+2,y+1],[x+29,y+4],[x+22,y+8],[x+35,y+12],[x+2,y+11]],'#943e36');
  }
  function tower(x,y,w,h,spire=false){
    stone(x,y,w,h);shape([[x+w*.73,y],[x+w,y],[x+w,y+h],[x+w*.73,y+h]],'#696e62');
    for(let row=y+20;row<y+h-15;row+=40)for(const f of [.28,.61]){
      g.fillStyle='#373f3c';g.fillRect(x+w*f,row,4,13);
    }
    if(spire){shape([[x-7,y+1],[x+w*.48,y-w*.7],[x+w+7,y+1]],'#495651');banner(x+w*.48,y-w*.7-22,22);}
    else parapet(x-3,y,w+6);
  }
  tower(560,128,68,218,true);tower(795,122,58,216,true);
  stone(628,113,157,210,true);parapet(626,112,161);tower(682,66,49,200,true);
  for(const [x,y,w] of [[0,245,240],[220,226,340],[815,226,340],[1145,245,255]]){
    stone(x,y,w,380-y);parapet(x,y,w);
  }
  for(const x of [150,400,925,1185])tower(x,199,60,181);
  stone(551,190,298,190);parapet(548,188,304);
  tower(521,151,75,229);tower(804,151,75,229);
  for(const x of [548,837]){banner(x,112,37);shape([[x-11,179],[x+12,179],[x+12,219],[x,230],[x-11,219]],'#8f4239');}
  function arch(radius,color){
    g.beginPath();g.moveTo(700-radius,380);g.lineTo(700-radius,289);
    g.arc(700,289,radius,Math.PI,Math.PI*2);g.lineTo(700+radius,380);g.closePath();g.fillStyle=color;g.fill();
  }
  arch(73,'#b7ad94');arch(62,'#282f2d');g.save();g.clip();
  for(let x=638;x<=762;x+=11){
    g.fillStyle='#717c78';g.fillRect(x,215,5,140);g.fillStyle='#bfbbb0';g.fillRect(x,215,1.5,140);
    shape([[x,355],[x+5,355],[x+2.5,365]],'#89928b');
  }
  for(let y=251;y<355;y+=30){g.fillStyle='#525e59';g.fillRect(638,y,125,7);g.fillStyle='#9da398';g.fillRect(638,y,125,2);}
  g.restore();ironFortArt=art;return art;
}
function drawIronPortcullis(horizon,camera){
  const point=(x,y,m)=>reviewPoint(x,y,m,camera);
  const progress=clamp(s.z/FINISH,0,1),base=clamp(horizon+H*.27,H*.27,H*.53);
  const sky=ctx.createLinearGradient(0,0,0,base+H*.15);
  sky.addColorStop(0,'#647b88');sky.addColorStop(.69,'#ccc3a2');sky.addColorStop(1,'#eee0b6');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  for(let layer=0;layer<2;layer++){
    const color=layer?'#808775':'#a3aa97',y=base-H*(layer?.025:.12);
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=0;x<W+16;x+=16){const t=x/W*7+camera.yaw*.5;ctx.lineTo(x,y+H*(.034*Math.sin(t*2+layer)+.019*Math.cos(t*4.3)));}
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  const earth=ctx.createLinearGradient(0,base,0,H);earth.addColorStop(0,'#96916c');earth.addColorStop(1,'#556044');
  ctx.fillStyle=earth;ctx.fillRect(0,base,W,H-base);
  const art=ironFortress(),height=H*(.25+.18*progress),width=art.width/art.height*height;
  const center=W*(.5-.07*Math.sin(camera.yaw));
  ctx.drawImage(art,center-width/2,base-height,width,height);
  const floor=-5;
  const floorPoint=(x,m)=>point(x,floor,m);
  const trail=(x,w,a,b,col)=>poly([floorPoint(x-w,a),floorPoint(x+w,a),floorPoint(x+w,b),floorPoint(x-w,b)],col);
  const noise=n=>{const v=Math.sin(n*127.1+17.13)*43758.5453;return v-Math.floor(v);};
  const fade=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
  // Camp sites stay in the world. New units come into view beyond the last tents.
  const campEnd=m=>songPosition(songCourse,Math.max(0,m)).time;
  const isCamp=(m,seed)=>campEnd(m)<27+noise(seed)*8;
  function camp(side,lot,m){
    const x=side*(10+Math.abs(lot%3)*3);
    const v=(dx,h,d)=>point(x+dx,floor+h,m+d);
    // Canvas tents face the road, behind a row of pointed timber stakes.
    poly([v(-2,0,0),v(0,2.7,0),v(0,2.7,4),v(-2,0,4)],'#857859');
    poly([v(2,0,0),v(0,2.7,0),v(0,2.7,4),v(2,0,4)],'#afa07c');
    poly([v(-2,0,0),v(0,2.7,0),v(2,0,0)],'#c7af83');
    poly([v(-.6,0,0),v(0,1.8,0),v(.55,0,0)],'#4a4438');
    for(let j=0;j<6;j++){
      const d=j*.7;
      poly([v(-side*3,0,d),v(-side*3,1.3,d),v(-side*3,1.65,d+.19),v(-side*3,1.25,d+.38),v(-side*3,0,d+.38)],'#6a5643');
    }
    if(lot%2===0){
      const pole=v(2.4,3.8,1);
      ctx.beginPath();ctx.moveTo(...v(2.4,0,1));ctx.lineTo(...pole);ctx.strokeStyle='#534538';ctx.lineWidth=1.5;ctx.stroke();
      poly([pole,v(3.8,3.55+.12*Math.sin(s.time*4+lot),1),v(2.4,3.05,1)],'#963e3a');
    }
  }
  const ranks=[];
  function addSoldier(x,m,phase){
    if(m<=s.z||m>s.z+140||m>FINISH)return;
    ranks.push({x,m,phase,opacity:fade((s.z+140-m)/18)});
  }
  // Small watch details occupy the same lots as the fixed camp scenery.
  for(let lot=Math.floor(s.z/32);lot*32<s.z+142;lot++)for(const side of [-1,1]){
    const m=lot*32+side*3;
    if(isCamp(m,lot*2+side))addSoldier(side*(8+noise(lot+side)*2),m,0);
  }
  const march=3.4;
  for(const side of [-1,1]){
    // Search a padded range for whole companies, including their trailing ranks.
    const extra=5*Math.max(0,s.time-55);
    const first=Math.floor((s.z-s.time*march-extra-45)/42);
    const last=Math.ceil((s.z+155-s.time*march)/42);
    for(let id=first;id<=last;id++){
      const seed=id*19+side*7;
      const anchor=id*42+noise(seed)*14+side*9;
      if(campEnd(anchor+30*march)<27+noise(seed+1)*7)continue;
      const cols=2+Math.floor(noise(seed+2)*3),rows=2+Math.floor(noise(seed+3)*3);
      const flank=10+noise(seed+4)*16;
      const call=56+noise(seed+5)*7;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const member=seed*31+row*5+col;
        const elapsed=Math.max(0,s.time-call-row*.46-noise(member)*1.4);
        const spread=fade(elapsed/4);
        // Integrate the speed gain so the charging soldier starts in his own rank.
        const burst=(3+noise(member+1)*2)*(elapsed-2*(1-Math.exp(-elapsed/2)));
        const m=anchor+march*s.time-row*2.25+burst;
        const x=side*(flank+(col-(cols-1)/2)*1.65+
          spread*((noise(member+2)-.5)*6+Math.sin(elapsed*1.4+member)*.65));
        addSoldier(x,m,s.time*5.1+seed+row*.38+col*.12+burst*1.25);
      }
    }
  }
  ranks.sort((a,b)=>b.m-a.m);
  function soldier({x,m,phase,opacity}){
    const foot=floorPoint(x,m),head=point(x,floor+2,m),size=foot[1]-head[1];
    if(size<1||foot[0]<-size||foot[0]>W+size)return;
    ctx.save();ctx.globalAlpha=opacity;ctx.translate(...foot);ctx.scale(size,size);
    const stride=Math.sin(phase),bob=Math.abs(stride)*.044;
    ctx.fillStyle='#373c3488';ctx.beginPath();ctx.ellipse(0,.018,.24,.063,-.12,0,Math.PI*2);ctx.fill();
    for(const d of [-1,1]){
      const knee=d*(.095+.072*stride),heel=d*.13+stride*d*.16;
      ctx.strokeStyle='#3b403b';ctx.lineWidth=.095;ctx.beginPath();ctx.moveTo(d*.08,-.40-bob);ctx.lineTo(knee,-.21);ctx.lineTo(heel,-.025-Math.max(0,d*stride)*.12);ctx.stroke();
    }
    ctx.translate(0,-bob);
    poly([[-.18,-.77],[.17,-.77],[.13,-.46],[.095,-.39],[-.13,-.40]],'#63706d');
    poly([[-.18,-.77],[-.045,-.81],[.11,-.76],[.055,-.61],[-.16,-.62]],'#b0b7a5');
    poly([[-.15,-.48],[.14,-.48],[.17,-.35],[-.18,-.36]],'#753f37');
    poly([[-.12,-.84],[-.10,-.96],[.025,-1.02],[.12,-.95],[.13,-.84],[.05,-.78],[-.09,-.79]],'#899794');
    poly([[-.12,-.87],[-.09,-.97],[.01,-1.01],[-.025,-.87]],'#d0cbb3');
    poly([[-.25,-.72],[-.10,-.73],[-.08,-.50],[-.17,-.40],[-.26,-.49]],'#77473e');
    ctx.lineWidth=.026;ctx.strokeStyle='#c0b69c';ctx.stroke();ctx.strokeStyle='#544d40';ctx.beginPath();
    const tip=.26+stride*.05;ctx.moveTo(.16,-.40);ctx.lineTo(tip,-1.31);ctx.stroke();
    poly([[tip-.033,-1.27],[tip+.016,-1.41],[tip+.044,-1.26]],'#b4bbae');ctx.restore();
  }
  let index=0;
  ctx.save();ctx.beginPath();ctx.rect(0,base,W,H-base);ctx.clip();
  for(let z=Math.floor((s.z+144)/8)*8;z+8>s.z;z-=8){
    const a=Math.max(s.z,z),b=z+8,lot=Math.floor(z/8);
    for(const side of [-1,1]){
      if(lot%2===0&&isCamp(b,lot+side))camp(side,lot,b);
      trail(side*7.6,2.8+.32*Math.sin(lot*.61),a,b,'#8e7a5c');
      trail(side*(12+Math.abs(lot%5)),.6,a,b,'#66704d');
      const m=a+(b-a)*.65,x=side*(3.4+Math.abs(lot*7%16));
      poly([floorPoint(x-.24,m),point(x-.14,floor+.28,m),floorPoint(x,m),point(x+.26,floor+.20,m),floorPoint(x+.2,m+.3)],'#687249');
    }
    while(index<ranks.length&&ranks[index].m>=a)soldier(ranks[index++]);
  }
  ctx.restore();
  // Painted overlaps at the field margins; the arrows have no contact geometry.
  if(s.time<56)return;
  for(let j=0;j<72;j++){
    const flight=(s.time-56-noise(j)*10)*(.48+.02*(j%5));
    if(flight<0)continue;
    const side=j%2?1:-1,u=flight%1;
    const lane=side*(6+(j*17%39)),m=s.z+92-82*u;
    const y=floor+1.9+(7+j%6)*(1-u)+(4+j%4)*Math.sin(Math.PI*u);
    const tip=point(lane,y,m),tail=point(lane-side*.14,y+.18,m+1.7);
    ctx.strokeStyle='#463e33';ctx.lineWidth=clamp(1.9*u,.7,1.9);ctx.beginPath();ctx.moveTo(...tail);ctx.lineTo(...tip);ctx.stroke();
    const dx=tail[0]-tip[0],dy=tail[1]-tip[1];
    poly([tail,[tail[0]+dx*.25-dy*.15,tail[1]+dy*.25+dx*.15],[tail[0]-dx*.23,tail[1]-dy*.23]],'#b6a78d');
  }
}
