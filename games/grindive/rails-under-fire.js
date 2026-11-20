// Reuse painted industrial buildings across the moving streets.
const fireCityBuildings=[];
function fireCityBuilding(type,side){
  const key=type*2+(side>0?1:0);
  if(fireCityBuildings[key])return fireCityBuildings[key];
  const art=document.createElement('canvas');art.width=108;art.height=138;
  const g=art.getContext('2d');
  const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
  function shape(points,color){
    g.beginPath();for(const [i,[x,y]] of points.entries())if(i)g.lineTo(x,y);else g.moveTo(x,y);
    g.closePath();g.fillStyle=color;g.fill();
  }
  if(side<0){g.translate(108,0);g.scale(-1,1);}
  const roof=[58,49,72,61,41,68][type];
  shape([[5,roof],[77,roof],[101,roof-13],[31,roof-13]],'#79828b');
  shape([[77,roof],[101,roof-13],[101,117],[77,133]],'#343d4b');
  const gradient=g.createLinearGradient(0,roof,0,133);
  gradient.addColorStop(0,['#596572','#635b62','#535b62'][type%3]);gradient.addColorStop(1,'#303440');
  rect(5,roof,72,133-roof,gradient);
  for(let row=0;roof+8+row*10<128;row++)for(let col=0;col<8;col++){
    const lit=(row*13+col*7+type*3)%11;
    rect(10+col*8,roof+6+row*10,5,2.6,lit<3?'#dab386':lit===4?'#a2b6bb':'#303744');
  }
  for(let j=0;j<3;j++)rect(82+j*6,roof-j*3,2,116-roof,'#47535c');
  rect(8,roof+2,63,2,'#929097');rect(8,127,65,4,'#262d38');
  if(type%3===0){
    for(let j=0;j<2;j++){const x=35+j*19;rect(x,roof-42+j*7,7,34-j*7,'#48505a');rect(x,roof-36+j*7,7,4,'#ae776e');}
    rect(15,roof-14,24,9,'#454b54');
  }else if(type%3===1){
    rect(27,roof-23,32,15,'#505766');rect(26,roof-24,35,3,'#899198');rect(44,roof-38,2,16,'#384655');
    rect(43,roof-39,4,2,'#ff8c6c');
  }else{
    for(let j=0;j<2;j++){rect(21+j*26,roof-19,19,13,'#5e646b');g.fillStyle='#99a0a2';g.beginPath();g.ellipse(30+j*26,roof-19,9.5,3,0,0,Math.PI*2);g.fill();}
    for(let j=0;j<3;j++)rect(14+j*11,roof+14,3,111-roof,'#899091');
  }
  fireCityBuildings[key]=art;return art;
}
function drawRailsUnderFire(horizon,camera){
  const ease=(a,b,v)=>{const u=clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);};
  const t=s.time,dive=ease(29,61,t),avenue=ease(54,68,t);
  const base=clamp(horizon+H*.23,H*.28,H*.49)+H*(.15*(1-dive)-.10*Math.sin(Math.PI*dive));
  const gate=songCourse.portal;
  const target=reviewPoint(gate.x,reviewSurface(gate.x,FINISH)+gate.bottom,FINISH,camera);
  const align=ease(FINISH-180,FINISH-16,s.z);
  const distantX=W*(.5-.065*Math.sin(camera.yaw)),cx=distantX+(target[0]-distantX)*align;
  const lens=Math.min(W*.85,H*1.22);
  const at=(x,y,d)=>[cx+lens*x/d,base+lens*(8-y)/d];
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#192238');sky.addColorStop(.34,'#59576b');sky.addColorStop(.53,'#c98268');sky.addColorStop(1,'#282e39');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  function line(a,b,color,width){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
  }
  function ellipse(x,y,rx,ry,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
  }
  for(let i=-12;i<=12;i++){
    const x=cx+i*W*.055,h=H*(.018+.036*Math.abs(Math.sin(i*37)));
    ctx.fillStyle='#655864';ctx.fillRect(x,base-h,W*.047,h+1);
  }
  const soil=ctx.createLinearGradient(0,base,0,H);
  soil.addColorStop(0,'#81605b');soil.addColorStop(.5,'#47404a');soil.addColorStop(1,'#242733');
  ctx.fillStyle=soil;ctx.fillRect(0,base,W,H-base);
  // The dark citadel grows as the player approaches the objective.
  ctx.save();ctx.translate(cx,base+H*.016+(target[1]-base-H*.016)*align);
  const scale=H*(.043+.072*dive+.19*ease(.62,1,s.z/FINISH));ctx.scale(scale,scale);
  for(const side of [-1,1]){
    ctx.save();ctx.scale(side,1);
    poly([[0,0],[1.5,0],[1.3,-.25],[.75,-.36],[.62,-.68],[.41,-.62],[.24,-.9],[0,-.7]],'#353441');
    for(let i=0;i<4;i++)line([.44+i*.19,-.19],[.55+i*.19,-.19],'#e76a51',.021);
    ctx.restore();
  }
  poly([[-.32,0],[-.24,-.96],[-.14,-1.04],[0,-1.46],[.13,-1.04],[.25,-.96],[.33,0]],'#22283a');
  line([0,-1.09],[0,-.32],'#fe7258',.048);ellipse(0,-1.17,.045,.045,'#ffd194');ctx.restore();
  // Linear perspective ties street motion to distance traveled; camera jumps do not move the city.
  const ground=-115+105*dive,travel=s.z*.65;
  // The boulevard resolves beneath the board as the cloud cover thins.
  poly([at(-9,ground,5),at(9,ground,5),at(9,ground,520),at(-9,ground,520)],'#494855');
  for(const side of [-1,1]){
    for(const street of [10,32,62]){
      const x=side*street;
      poly([at(x-1.7,ground,7),at(x+1.7,ground,7),at(x+1.7,ground,470),at(x-1.7,ground,470)],'#3b4049');
      line(at(x,ground,7),at(x,ground,470),'#7c7371',1);
    }
  }
  for(let row=Math.floor((travel+410)/20);row*20>travel+8;row--){
    const d=row*20-travel;
    for(const side of [-1,1]){
      poly([at(side*11,ground,d),at(side*85,ground,d),at(side*85,ground,d+2),at(side*11,ground,d+2)],'#44454d');
      for(let lane=2;lane>=0;lane--){
        const seed=row*11+lane*13+(side+1)*7,type=seed%6;
        const x=side*(20-5*avenue+lane*25+3*Math.sin(seed)),z=d+seed%5;
        const [px,py]=at(x,ground,z),w=(10+seed%6)*lens/z,h=(13+seed%10)*lens/z;
        if(px+w/2<0||px-w/2>W||py-h>H)continue;
        ctx.globalAlpha=.97-.47*z/430;
        ctx.drawImage(fireCityBuilding(type,side),px-w/2,py-h,w,h);
      }
      ctx.globalAlpha=1;
      // Distant sites enter the view first. Each road block keeps its garrison.
      const district=ease(FINISH*.37,FINISH*.98,row*20/.65);
      const roll=(row*47+(side+1)*19)%101/101;
      if(roll<.06+.68*district){
        const x=side*(9.9+2.3*Math.sin(row*3)),[px,py]=at(x,ground,d),k=lens/d;
        if(px>-6*k&&px<W+6*k&&py<H+3*k){
          ctx.save();ctx.translate(px,py);ctx.scale(side*k,k);
          poly([[-2.3,-.24],[-1.7,-1.2],[1.6,-1.2],[2.3,-.33],[1.6,.02],[-1.7,.02]],'#30333e');
          poly([[-1.4,-1.2],[-1,-2.0],[.55,-2.12],[1.32,-1.2]],'#616575');
          for(const n of [0,.38])line([-.1+n,-1.85],[-1.25+n,-3.05],'#414653',.18);
          const flash=(t*1.4+row*.37)%1;
          if(flash<.14)ellipse(-1.23,-3.09,.31,.27,'#ffda9c');
          ctx.restore();
          for(let j=0;j<3+Math.floor(3*district);j++){
            const m=d+2+(j%3)*.96,[u,v]=at(x+side*(2.6+Math.floor(j/3)*1.1),ground,m),unit=lens/m;
            ctx.save();ctx.translate(u,v);ctx.scale(unit,unit);
            ellipse(0,-1.46,.21,.22,'#373a46');
            poly([[-.23,-1.26],[.2,-1.26],[.29,-.52],[.13,-.53],[.2,0],[.02,0],[-.08,-.48],[-.23,0],[-.38,0],[-.23,-.6]],'#464453');
            ctx.restore();
          }
        }
      }
    }
  }
  // High-altitude haze and escort flights recede continuously during the dive.
  const airCover=1-dive;
  if(airCover>.001){
    ctx.save();ctx.globalAlpha=.30*airCover;
    for(let i=0;i<12;i++){
      const d=24+(310+i*25-(travel%300))%300;
      const [x,y]=at((i%2?1:-1)*(20+(i*13)%72),-15-(i%4)*3,d);
      ellipse(x,y,lens*(9+i%5)/d,lens*1.8/d,'#bbb0b2');
    }
    ctx.globalAlpha=.96*airCover;
    for(let i=0;i<7;i++){
      const side=i%2?1:-1,d=45+(t*(5+i%3)+19*i)%170;
      const [x,y]=at(side*(14+4*(i%4)),13+(i%3)*4,d),k=lens/d;
      ctx.save();ctx.translate(x,y);ctx.scale(side*k,k);
      poly([[-2,.42],[-.44,-.22],[0,-1.05],[.47,-.18],[1.9,.43],[.31,.30],[0,.62],[-.34,.28]],'#384859');
      ellipse(0,.48,.19,.09,'#b4e4eb');ctx.restore();
    }
    ctx.restore();
  }
  const ships=[];
  for(const [side,height,span] of [[-1,.20,.20],[1,.28,.14],[-1,.09,.075]]){
    const x=cx+side*W*(span+.09)+Math.sin(t*.19+height*22)*W*.024,y=base-H*height+H*.009*Math.sin(t*.36+side);
    const size=Math.min(H*.48,W*.32)*(span/.20)*(1-.58*dive);
    ctx.save();ctx.translate(x,y);ctx.scale(-side*size,size);
    poly([[-.55,-.035],[-.64,-.13],[-.46,-.10],[-.31,-.16],[.24,-.14],[.49,-.07],[.58,0],[.34,.058],[-.27,.074],[-.54,.02]],'#30394c');
    poly([[-.49,-.033],[.56,-.005],[.31,.067],[-.22,.09]],'#1c2535');
    poly([[-.22,.07],[-.09,.15],[.17,.14],[.26,.06]],'#283244');
    line([-.29,-.075],[.29,-.076],'#82939e',.012);
    for(let j=0;j<6;j++)line([-.25+j*.09,.027],[-.21+j*.09,.027],'#84d3de',.009);
    ellipse(-.56,-.012,.034,.02,'#8be3fa');ctx.restore();
    ships.push([x,y+size*.085]);
  }
  // Silhouetted chain volleys read separately from the brighter exchange of fire.
  for(let i=0;i<2;i++){
    const u=(t*.16+i*.5)%1;
    if(u>.79)continue;
    const a=ships[i],b=[cx+(i?1:-1)*scale*.28,base-scale*.33];
    const travel=Math.min(1,u/.55),dx=b[0]-a[0],dy=b[1]-a[1],angle=Math.atan2(dy,dx);
    ctx.save();ctx.globalAlpha=Math.min(1,(.79-u)*8);
    for(let n=1;n<=travel*24;n++){
      const k=n/24;
      ellipse(a[0]+dx*k,a[1]+dy*k+Math.sin(Math.PI*k)*H*.013,H*.004,H*.0025,n%2?'#abafb1':'#454852');
    }
    ctx.translate(a[0]+dx*travel,a[1]+dy*travel+Math.sin(Math.PI*travel)*H*.013);ctx.rotate(angle);
    poly([[H*.024,0],[-H*.011,-H*.009],[-H*.005,0],[-H*.011,H*.009]],'#ccd4d2');ctx.restore();
  }
  // Project each volley downrange on its own side of the course.
  for(let i=0;i<18;i++){
    const side=i%2?1:-1,air=i%3===0,tracer=i%3===2;
    const x=side*(16+(i*7)%33),near=27+(i*11)%45,far=near+120+(i%4)*28;
    const phase=(t*(.39+(i%5)*.045)+i*.618)%1;
    const height=air?18:14*(1-dive)+(ground+2)*dive;
    const loc=u=>at(x,height+(air?-9:9)*u,near+(far-near)*u);
    if(i%6===1){
      if(phase<.26){
        const front=Math.min(1,phase/.16),tail=Math.max(0,(phase-.10)/.16);
        line(loc(tail),loc(front),'#f59087',Math.max(1,H*.0023));
      }
      continue;
    }
    const tip=loc(phase);
    line(loc(Math.max(0,phase-(tracer?.035:.095))),tip,tracer?'#ffcf84':air?'#a6d4df':'#dea996',Math.max(.8,H*.003*(1-.65*phase)));
    if(!tracer){const r=Math.max(.8,H*.0037*(1-.72*phase));ellipse(...tip,r,r,'#fff3bb');}
  }
  // Two harpoons race below the deck. Each link is attached to the moving shaft.
  for(const side of [-1,1]){
    const x=side*5.8,d=19+3*Math.sin(t*.95+side),y=1.1;
    for(let j=0;j<22;j++){
      const z=d-3-j*.79;if(z<3)break;
      const a=at(x,y,z),b=at(x,y,z-.62),r=Math.max(.9,lens*.10/z);
      ctx.save();ctx.translate((a[0]+b[0])/2,(a[1]+b[1])/2);ctx.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));
      ctx.beginPath();ctx.ellipse(0,0,Math.max(r,Math.hypot(b[0]-a[0],b[1]-a[1])*.65),r*(j%2?.48:1),0,0,Math.PI*2);
      ctx.strokeStyle=j%2?'#80929b':'#c6c6b7';ctx.lineWidth=Math.max(1,r*.45);ctx.stroke();ctx.restore();
    }
    line(at(x,y,d-3),at(x,y,d+2),'#263341',lens*.31/d);
    line(at(x-.05,y+.07,d-3),at(x-.05,y+.07,d+2),'#b2b6ab',lens*.09/d);
    poly([at(x,y,d+5.5),at(x-.65,y,d+.2),at(x,y,d+1.2),at(x+.65,y,d+.2)],'#a9b6bb');
    poly([at(x,y,d+5.5),at(x,y,d+1.2),at(x+.65,y,d+.2)],'#465462');
  }
}
