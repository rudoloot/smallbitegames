'use strict';
// Encounter times describe a clean, unboosted run (30 metres per second).
const diveSpeed=30,diveLength=2700,diveSlope=30*Math.PI/180;
const divePlan=[
 [6,'missile',2],[8.5,'shots',-2],
 [11,'missile',0],[13,'missile',3],
 [15,'laser',-2],[17.5,'shots',2],
 [20,'missile',1],[22,'missile',-2],
 [24,'shots',-1],[26,'blast',2],
 [28,'blast',2],[30,'missile',-2],
 [32,'rocket',0],[33.15,'shots',-3],
 [34.3,'beam',0],[36.65,'missile',3],
 [39,'shots',0],[41,'shots',2],
 [43,'rotor',0],[45,'missile',3],
 [47,'missile',-2],[48.5,'missile',1],
 [50,'shots',2],[52,'blast',-2],
 [54,'rocket',1],[55.2,'shots',-2],
 [56.4,'high',1],[58.2,'missile',-2],
 [60,'blast',-1],[62,'shots',2],
 [64,'shots',1],[66,'missile',-1],
 [68,'rotor',1],[70,'shots',-3],
 [72,'rocket',-1],[73.15,'missile',2],
 [74.3,'beam',-1],[76.15,'shots',3],
 [78,'missile',2],[79.5,'missile',-2],
 [81,'blast',1],[82.5,'shots',-2],
 [84,'shots',2],[85.5,'missile',0],
 [87,'shots',0],[88.5,'missile',-2]
];
const diveNames={missile:'미사일 · 점프해 그라인드',high:'공중 레일 · 갈아타기',rocket:'대형 로켓 · 꼬리날개 도약',laser:'레이저 · 숙이기',beam:'낮은 빔 · 점프',shots:'탄막 · 옆으로',blast:'근접탄 · 폭발 범위 이탈',rotor:'회전 날개 · 틈으로'};
function diveSection(){
 const points=Array.from({length:diveLength+1},(_,m)=>({x:0,z:m*Math.cos(diveSlope),h:m*Math.sin(diveSlope),yaw:0,pitch:-diveSlope,width:7}));
 return {points,objects:new Map(),ramps:[],buses:[],busMetres:new Map(),railRuns:[],railMetres:new Map()};
}
// One-metre cells, numbered from the left. The bottom row spans y=0..1.
const harpoonHalfWidth=.23,harpoonCenterY=.5;
// Vertical offsets in the track coordinates project onto the inclined cable cross-section.
const cableVerticalRadius=harpoonHalfWidth/Math.cos(diveSlope);
const harpoonTop=harpoonCenterY+cableVerticalRadius;
const steelShades=['#acbec9','#788b9a','#4a5a68','#33414d','#293540','#25303b',
 '#303d49','#435462','#617481','#9bacb4','#d7e1e4','#bac8d1'];
const cableRing=steelShades.map((_,i)=>{
 const angle=i*2*Math.PI/steelShades.length;
 return [harpoonHalfWidth*Math.sin(angle),cableVerticalRadius*Math.cos(angle)];
});
const harpoonCatchRadius=.65;
const diveLayouts={easy:[2,3,4,5,6],normal:[2,4,7],hard:[1,4]};
function startDive(){
 const layout=diveLayouts[document.getElementById('diveDifficulty')?.value]||diveLayouts.easy;
 const harpoons=layout.map(col=>({x:col-4,type:'harpoon',key:'shaft-'+col,name:'작살'}));
 return {harpoons,next:0,attacks:[],gap:48,hits:0,flash:0,ambient:0,ceremony:0};
}
function diveRail(a){return ['missile','rocket','high'].includes(a.type);}
function hasDiveFin(a){return a.type==='missile'||a.type==='rocket';}
function diveTop(a,m){
 const fin=hasDiveFin(a)?(m-a.length+10)/10:0;
 return a.height+clamp(fin,0,1)*.65;
}
// Integer columns -3..3 and rows 0..6 correspond to A..G and 1..7.
function diveCell(a,col,row){
 const x=col-a.x;
 switch(a.type){
 case 'laser':return Math.abs(x)<=1&&row===1;
 case 'beam':return Math.abs(x)<=1&&row===0;
 case 'shots':return x===0&&row<=1;
 case 'blast':return Math.abs(x)<=1&&row<=2;
 case 'rotor':{
   const y=row-2,angle=a.age*1.3;
   return Math.hypot(x,y)<=2.6&&Math.abs(y*Math.cos(angle)-x*Math.sin(angle))<.65;
 }
 default:return false;
 }
}
function diveImpact(a){
 if(a.hit||s.dive.flash>.45)return;
 a.hit=true;s.dive.hits++;s.dive.flash=1;
 s.normalSpeed=Math.max(8,s.normalSpeed-14);s.speed=s.normalSpeed;
 if(s.rail){s.rail=null;s.air=true;s.vy=0;}
 tell('피격 · 작살 거리 증가');tone(120,.2,.4);buzz(30);
}
function diveFinish(won){
 mode='result';
 panel(won?'미션 클리어':s.y < -4?'작살 아래로 추락':'작살 신호 이탈','주행 '+formatRideTime(s.time)+' · 피격 '+s.dive.hits+'회 · '+Math.floor(s.z)+' m','다시 다이브','GRINDIVE　/　빛길 돌파');
}
function updateDive(dt){
 const d=s.dive;
 if(s.time===0&&!s.air&&!s.rail){
   s.rail=d.harpoons.find(p=>p.x===s.x);
   faceGrind();
 }
 if(d.ceremony){d.ceremony+=dt;if(d.ceremony>=1.7)diveFinish(true);return;}
 d.flash=Math.max(0,d.flash-dt);d.ambient+=dt*(d.flash?.9:.15);
 s.time+=dt;
 const cruise=d.gap>54?normalSpeedLimit:diveSpeed;
 s.normalSpeed+=clamp(cruise-s.normalSpeed,-3.5*dt,3.5*dt);
 s.speed=s.normalSpeed;s.airForward=s.speed;
 const before=s.z,oldY=s.y,oldX=s.x;
 s.z=Math.min(diveLength,s.z+s.speed*dt);
 // The harpoons cruise slightly slower than an unharmed rider until contact with the base.
 d.gap=clamp(Math.min(diveLength,Math.max(before+d.gap+28*dt,s.z+24))-s.z,0,200);
 if(d.gap>102){diveFinish(false);return;}
 if(s.z>=diveLength){d.ceremony=.001;bank();tone(240,.6,2);return;}
 while(d.next<divePlan.length&&s.z>=divePlan[d.next][0]*diveSpeed-150){
   const [time,type,x]=divePlan[d.next++];
   const length=type==='rocket'?82:type==='high'?48:35;
   d.attacks.push({type,x,key:'dive-'+d.next,name:diveNames[type],age:0,nose:time*diveSpeed+60,length,height:type==='high'?2.4:1,hit:false});
 }
 s.tuck=(s.tuck??.035)+((duck&&!s.air?.49:.035)-(s.tuck??.035))*(1-Math.exp(-16*dt));
 if(!s.rail){
   if(s.air){advanceAirControl(dt);advanceJump(dt,normalGravity,true);}
   s.vx=s.air?s.airVX:steerAcross(s.vx,dt);
   s.x=clamp(s.x+s.vx*dt,-3.5,3.5);
 }
 s.travelYaw=Math.atan2(s.vx,s.speed);
 for(const a of d.attacks){
   const oldNose=a.nose;a.age+=dt;a.nose-=12*dt;
   const m=s.z-a.nose;
   if(diveRail(a)){
     if(s.rail===a){
       s.x=a.x;s.y=diveTop(a,m);s.vx=0;
       if(m>=a.length){const fin=hasDiveFin(a);launch(fin?8:0,0);tell(fin?'꼬리날개 도약':'레일 이탈');}
     }else if(!a.hit&&m>=0&&m<=a.length){
       const top=diveTop(a,m),dx=Math.abs(s.x-a.x),width=a.type==='rocket'?1.5:.5;
       if(s.air&&!s.balanceDrop&&s.vy<0&&dx<=.85&&oldY>=top-.22&&s.y<=top+.20){
         faceGrind();absorbLanding();clearAir();s.rail=a;s.x=a.x;s.y=top;s.air=false;s.vy=s.vx=s.balance=s.edgeTime=0;
         skill('미사일 그라인드',130,a.key);tone(560,.1);
       }else if(dx<width+.12&&s.y<top-.18&&s.y+(duck?1:2)>a.height-1)diveImpact(a);
     }
   }else if(before-oldNose<=1&&m>=0&&!a.hit){
     const height=duck&&!s.air?1:2;
     for(let col=-3;col<=3;col++)if(Math.abs(s.x-col)<.64)
       for(let row=0;row<7;row++)if(s.y<row+1-.01&&s.y+height>row+.01&&diveCell(a,col,row))diveImpact(a);
   }
 }
 if(s.air&&s.vy<0&&oldY>=harpoonTop&&s.y<=harpoonTop){
   const fraction=oldY===s.y?1:(oldY-harpoonTop)/(oldY-s.y);
   const landingX=oldX+(s.x-oldX)*fraction;
   const shaft=d.harpoons.reduce((nearest,p)=>Math.abs(landingX-p.x)<Math.abs(landingX-nearest.x)?p:nearest);
   if(Math.abs(landingX-shaft.x)<=harpoonCatchRadius){
     faceGrind();absorbLanding();clearAir();s.rail=shaft;s.air=false;
     s.x=shaft.x;s.y=harpoonTop;s.vy=s.vx=s.airVX=s.edgeTime=0;
     skill('작살 그라인드',130,shaft.key);tone(560,.1);
   }
 }
 if(s.y < -4){diveFinish(false);return;}
 if(!s.air&&!s.rail&&s.base){s.grace-=dt;if(s.grace<=0)bank();}
 d.attacks=d.attacks.filter(a=>a.nose+(diveRail(a)?a.length:4)>s.z-8);
}
function diveCue(){
 const d=s.dive;
 if(d.ceremony)return '기지 돌파';
 if(d.gap>78)return '작살 신호 약화';
 if(s.rail?.type==='harpoon')return '작살 그라인드 · 점프 후 좌우로 갈아타기';
 if(s.rail)return hasDiveFin(s.rail)?'꼬리날개까지 타면 자동 도약':'그라인드 · 점프로 이탈';
 return '';
}

function drawDive(){
 const d=s.dive;
 prepareReviewCamera();
 const c=reviewCamera;
 const horizon=H*.61-c.focal*c.tiltSin/c.tiltCos;
 const sky=ctx.createLinearGradient(0,horizon-H*.24,0,horizon);
 sky.addColorStop(0,'#120e30');sky.addColorStop(.82,'#513c69');sky.addColorStop(1,'#bb889f');
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const ground=ctx.createLinearGradient(0,horizon,0,horizon+H);
 ground.addColorStop(0,'#765a7c');ground.addColorStop(.18,'#453457');ground.addColorStop(1,'#111b39');
 ctx.fillStyle=ground;ctx.fillRect(0,horizon,W,H-horizon);
 ctx.fillStyle='#e7bdc7';ctx.fillRect(0,horizon-1,W,1);
 // Distant rooftops sit below eye level and rise toward the horizon on descent.
 for(let layer=0;layer<2;layer++){
   const unit=c.focal*(layer?.036:.023);
   const baseY=horizon+c.focal*(.018+(1-s.z/diveLength)*.07)*(1+layer*.45);
   ctx.fillStyle=layer?'#574b68':'#76627d';
   for(let i=0;i*unit<W+unit;i++){
     const seed=(i*73+layer*41)%113;
     const h=unit*(.4+(seed%13)*.13),left=i*unit;
     ctx.fillRect(left,baseY-h,unit*.85,h);
     if(seed%4===0)ctx.fillRect(left+unit*.25,baseY-h-unit*.42,unit*.18,unit*.46);
   }
   const haze=ctx.createLinearGradient(0,baseY-1,0,baseY+unit*1.4);
   haze.addColorStop(0,ctx.fillStyle);haze.addColorStop(1,layer?'#574b6800':'#76627d00');
   ctx.fillStyle=haze;ctx.fillRect(0,baseY-1,W,unit*1.4+1);
 }
 // The citadel stays on the track axis and grows as the harpoons approach it.
 const base=reviewPoint(0,0,diveLength),size=c.focal*55/(diveLength-s.z+105);
 const bx=base[0],by=base[1];
 // Rings mark the real endpoint; their apparent growth shows the closing distance.
 for(const radius of [2.8,4]){
   ctx.strokeStyle='#a4549e';ctx.lineWidth=2;ctx.beginPath();
   ctx.ellipse(bx,by,size*radius,size*radius*.54,0,0,Math.PI*2);ctx.stroke();
 }
 ctx.fillStyle='#fa5494';ctx.beginPath();ctx.ellipse(bx,by,size*2,size*.36,0,0,2*Math.PI);ctx.fill();
 ctx.fillStyle='#251934';ctx.fillRect(bx-size,by-size*.55,size*2,size*.55);
 for(let i=-3;i<=3;i++)ctx.fillRect(bx+i*size*.22,by-size*(1.45-Math.abs(i)*.24),size*.16,size);
 depthView.begin(W,H,c.focal,H*.61);
 function face(vertices,color){drawEditorFace(vertices,color);}
 function sheet(l,r,a,b,h,color){face([[l,a,h],[r,a,h],[r,b,h],[l,b,h]],color);}
 function wall(x,a,b,lo,hi,color){face([[x,a,lo],[x,b,lo],[x,b,hi],[x,a,hi]],color);}
 function front(l,r,m,lo,hi,color){face([[l,m,lo],[r,m,lo],[r,m,hi],[l,m,hi]],color);}
 const tip=Math.min(diveLength,s.z+d.gap),start=Math.max(0,s.z-12,tip-102);
 for(const {x} of d.harpoons){
   for(let i=0;i<cableRing.length;i++){
     const [dx,dy]=cableRing[i],[ex,ey]=cableRing[(i+1)%cableRing.length];
     const l=x+dx,r=x+ex,h=harpoonCenterY+dy,k=harpoonCenterY+ey;
     face([[l,start,h],[r,start,k],[r,tip,k],[l,tip,h]],steelShades[i]);
     face([[x+dx*1.6,tip,harpoonCenterY+dy*1.6],[x+ex*1.6,tip,harpoonCenterY+ey*1.6],
       [x,tip+1.7,harpoonCenterY]],steelShades[i]);
     // Diagonal grooves wind around the near surface. Omit subpixel detail farther ahead.
     if(dy<0&&ey<0)continue;
     const twistStep=.14,spacing=.84,phase=(i*twistStep+x*.19)%spacing;
     const end=Math.min(tip,s.z+16);
     for(let m=Math.ceil((start-phase)/spacing)*spacing+phase;m+twistStep+.035<end;m+=spacing){
       face([[l,m,h+.004],[r,m+twistStep,k+.004],[r,m+twistStep+.035,k+.004],[l,m+.035,h+.004]],'#586a77');
     }
   }
 }
 // Cargo bay sill and open wings at the launch end.
 if(s.z<30){
   sheet(-4,4,-10,0,.015,'#425467');sheet(-10,10,-7,-4,2.6,'#45516b');
   for(const x of [-4,4])wall(x,-9,0,0,3,'#303448');
 }
 for(const a of d.attacks){
   const m=a.nose;
   if(diveRail(a)){
     const x=a.x,h=a.height,tail=m+a.length;
     const tip=[[x,m,h-.45],[x-.5,m+2,h],[x+.5,m+2,h]];
     face(tip,'#d4e6eb');sheet(x-.5,x+.5,m+2,tail-10,h,'#8294ab');
     wall(x-.5,m+2,tail,h-.8,h,'#46536e');wall(x+.5,m+2,tail,h-.8,h,'#57647a');
     const width=a.type==='rocket'?1.5:.5,top=diveTop(a,a.length);
     face([[x-.5,tail-10,h],[x+.5,tail-10,h],[x+width,tail,top],[x-width,tail,top]],'#98b4c4');
     sheet(x-.08,x+.08,m+2,tail-10,h+.02,'#6affdb');
     face([[x-.4,tail,h-.4],[x+.4,tail,h-.4],[x,tail+3,h-.4]],'#ffab61');
   }else if(a.type==='blast'&&m-s.z>20){
     const color=Math.sin(a.age*12)>0?'#ffce88':'#ff6b68';
     face([[a.x-.48,m,1],[a.x,m-.8,1.7],[a.x+.48,m,1],[a.x,m, .45]],color);
     front(a.x-1.5,a.x+1.5,m+.1,.02,.09,color);
   }else{
     for(let col=-3;col<=3;col++)for(let row=0;row<7;row++)if(diveCell(a,col,row)){
       const l=col-.5,r=col+.5;
       if(a.type==='shots'){
         for(const offset of [-.25,.25])sheet(col+offset-.045,col+offset+.045,m,m+3,row+.5,'#ffd788');
       }else{
         const color=a.type==='blast'?'#ff945b':a.type==='rotor'?'#ffce74':'#ff518e';
         front(l+.02,r-.02,m,row+.06,row+.94,color);
         front(l+.03,r-.03,m-.03,row+.44,row+.56,'#fff2c8');
       }
     }
   }
 }
 rider();depthView.paint(ctx);paintIona();
 ctx.strokeStyle='#b6e9ff66';ctx.beginPath();
 for(let i=0;i<34;i++){
   const x=((i*.618+d.ambient*.023)%1)*W,y=((i*.371+d.ambient*.23)%1)*H;
   ctx.moveTo(x,y);ctx.lineTo(x-2,y+5);
 }
 ctx.stroke();
 if(d.flash>.8){ctx.fillStyle='rgba(255,92,111,'+(d.flash-.8)+')';ctx.fillRect(0,0,W,H);}
 if(d.ceremony){
   for(let i=0;i<16;i++){
     const t=d.ceremony,r=t*(45+i*4),ang=i*2.4;
     ctx.fillStyle=i%2?'#ffbc70':'#ff639b';ctx.beginPath();
     ctx.arc(bx+r*Math.cos(ang),by+r*Math.sin(ang),Math.max(1,18*(1-t/1.8)),0,2*Math.PI);ctx.fill();
   }
 }
}
