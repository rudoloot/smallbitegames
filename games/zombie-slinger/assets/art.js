/* Local art pack. Shared head-to-foot height and per-sprite foot anchors.
   These dimensions affect rendering only; all world collisions stay in Game. */
const ART = Object.freeze({
  height: 76,
  sprites: [
    {x:145,y:7,w:390,h:615,foot:165},
    {x:756,y:9,w:403,h:613,foot:146},
    {x:126,y:641,w:407,h:608,foot:148},
    {x:753,y:636,w:412,h:612,foot:148}
  ]
});
// Image-free fallback also supports the existing headless input fixture.
const characterArt = typeof Image === 'undefined' ? null : new Image();
const groundArt = typeof Image === 'undefined' ? null : new Image();
if (characterArt) characterArt.src = 'assets/characters-v1.png?v=4fb3b6260a23';
if (groundArt) groundArt.src = 'assets/alley-asphalt-v1.png?v=ebbd4ff5d493';
const artReady = image => Boolean(image && image.complete && image.naturalWidth);
function drawFlyingStone(p) {
  // Exact contact points retain the corner where the stone ricocheted.
  const tail=(p.path||p.trail).filter(v=>v.distance===undefined||v.distance>=p.distance-85).map(v=>{
    const q=project(v);return {x:q.x,y:q.y-(v.height??p.height)*scale};
  });
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  line(tail,'#101b2be0',Math.max(3,7*scale));
  line(tail,'#ffe1a5cc',Math.max(1.5,3.5*scale));
  const q=project(p),s=Math.max(scale,.28),y=q.y-p.height*scale;
  ellipse(q.x,q.y,8*scale,4*scale,'#07101b88');
  ellipse(q.x,y,15*s,12*s,'#ffe0a51c');
  const point=(x,dy)=>({x:q.x+x*s,y:y+dy*s});
  poly([point(-11,-2),point(-7,-8),point(3,-9),point(10,-4),point(11,3),point(5,8),point(-6,9),point(-11,3)],STONES[p.stone].color,'#202b39',Math.max(1.2,1.7*s));
  poly([point(-7,-3),point(-4,-6),point(3,-6),point(5,-3),point(-3,-1)],'#fff2cf');
  line([point(-5,6),point(4,5),point(8,2)],STONES[p.stone].shade,Math.max(1,1.3*s));
  ctx.restore();
}
function spriteRect(index,height=ART.height) {
  const f=ART.sprites[index],ratio=height/f.h;
  return {sx:f.x,sy:f.y,sw:f.w,sh:f.h,x:-f.foot*ratio,y:-height,w:f.w*ratio,h:height};
}
function paintSprite(index,height) {
  const r=spriteRect(index,height);
  ctx.drawImage(characterArt,r.sx,r.sy,r.sw,r.sh,r.x,r.y,r.w,r.h);
}
function characterFacing(p,zombie) {
  if(!zombie)return game.facing;
  const from=p.from||p,to=p.to||game.player;
  return Math.sign(to.x-from.x)||1;
}
function characterPoint(p,zombie) {
  const q=project(p);
  if(!zombie&&game.jump)q.y-=game.jump.height*.57*scale;
  if(zombie){const r=feedback.recoil(p.id);q.x+=r.x*VIEW.x*scale;q.y+=r.y*VIEW.y*scale;}
  if(zombie&&p.attack&&game.phase==='enemy'){
    const to=project(game.player),d=norm(to.x-q.x,to.y-q.y);
    const lunge=Math.sin(clamp((game.enemyAge-.55)/.23,0,1)*Math.PI)*12*scale;
    q.x+=d.x*lunge;q.y+=d.y*lunge;
  }
  return q;
}
function character(p,zombie=false,id=0) {
  if(!artReady(characterArt)){fallbackCharacter(p,zombie,id);if(zombie)drawAwareness(p);return;}
  const q=characterPoint(p,zombie),ground=project(!zombie&&game.jump?game.jump.to:p),s=scale;
  // Shadows and feet remain at the simulation position, even during motion.
  ellipse(ground.x+3*s,ground.y+2*s,21*s,8*s,'#050c14a0');
  ellipse(ground.x+2*s,ground.y+1*s,12*s,4*s,'#02081077');
  if(!zombie){
    ellipse(ground.x,ground.y+1*s,24*s,11*s,'#e8bc6020','#e8bc60bb');
    line([{x:ground.x-9*s,y:ground.y+12*s},{x:ground.x+9*s,y:ground.y+12*s}],'#ffe0a5',2*s);
  }
  const facing=characterFacing(p,zombie);
  const recoil=zombie?feedback.recoil(id):{squash:0},hit=zombie?feedback.forTarget(id):null;
  ctx.save();ctx.translate(q.x,q.y);ctx.scale(s*facing*(1+recoil.squash),s*(1-recoil.squash));
  if(hit&&hit.age<(hit.critical?.075:.055))ctx.filter='brightness(3.2) saturate(.15)';
  const moving=zombie?game.phase==='enemy'&&p.from&&p.to&&dist(p.from,p.to)>1:game.phase==='move'&&game.moveInput.power>.05;
  if(moving){const sway=Math.sin((zombie?game.enemyAge:game.age)*13+id);ctx.rotate(sway*.022);}
  // Both use exactly the same visible height; identity comes from the art.
  paintSprite(zombie?1+id%3:0,ART.height);
  ctx.restore();
  if(zombie)drawAwareness(p);
}
function drawAwareness(z){
  if(!z.awareness||z.awareness==='idle')return;
  const p=project(z);ctx.save();ctx.font='bold '+Math.max(10,17*scale)+'px system-ui';ctx.textAlign='center';ctx.fillStyle=z.awareness==='chase'?'#f0a38e':'#efd08d';ctx.fillText(z.awareness==='chase'?'!':'?',p.x,p.y-(ART.height+9)*scale);ctx.restore();
}
function drawCorpse(c) {
  if(!artReady(characterArt)){fallbackCorpse(c);return;}
  const q=project(c),s=scale,hit=feedback.forTarget(c.artId);
  ellipse(q.x,q.y,32*s,10*s,'#050c1480');
  const t=hit&&hit.killed&&!feedback.reducedMotion?clamp(hit.age/.24,0,1):1,ease=1-(1-t)**3;
  const kick=hit?Math.sin(t*Math.PI)*(hit.critical?18:12)*s:0;
  ctx.save();ctx.translate(q.x+(hit?.dx??0)*kick,q.y+(hit?.dy??0)*VIEW.y*kick);ctx.rotate(c.rot*.45*ease);
  ctx.scale(s*(1-.08*ease),s*(1-.53*ease));ctx.rotate((c.rot<0?-Math.PI/2:Math.PI/2)*ease);
  ctx.translate(0,ART.height*.42*ease);ctx.scale(c.facing??1,1);ctx.globalAlpha=1-.3*ease;
  if(hit&&hit.age<(hit.critical?.075:.055))ctx.filter='brightness(3.2) saturate(.15)';
  paintSprite(1+(c.artId??0)%3,ART.height);ctx.restore();
}
function floorPatch(x,y,w,h,color,stroke) {
  poly([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}].map(project),color,stroke,.7*scale);
}
function drawBoundaryWall(w) {
  const p=[{x:w.x,y:w.y},{x:w.x+w.w,y:w.y},{x:w.x+w.w,y:w.y+w.h},{x:w.x,y:w.y+w.h}].map(project);
  const rise=(w.height??2)*RULES.unitsPerMeter*.57*scale,up=q=>({x:q.x,y:q.y-rise});
  poly([p[3],p[2],up(p[2]),up(p[3])],'#273441','#111c29',scale);
  poly(p.map(up),'#65717a','#202d3b',scale);
  line([up(p[3]),up(p[2])],'#a3a8a366',scale);
  if(w.w>w.h)for(let x=w.x+60;x<w.x+w.w;x+=75){const q=project({x,y:w.y+w.h});line([{x:q.x,y:q.y-rise},{x:q.x,y:q.y}],'#14202e88',scale);}
}
function drawDoor(d) {
 const q=project(d),s=scale,open=!d.entry&&['clear','win'].includes(game.phase),label=d.entry?'입구':d.targetStage===null?'출구':'구역 '+String(d.targetStage+1).padStart(2,'0');
 if(d.edge==='west'||d.edge==='east'){
  floorPatch(d.edge==='west'?0:RULES.size-24,d.y-d.width/2,24,d.width,'#8d836155','#e3c48d66');
  const a=project({x:d.x,y:d.y-d.width/2}),b=project({x:d.x,y:d.y+d.width/2}),inside=d.edge==='west'?1:-1;
  line([a,b],open?'#b6dc9e':'#8b9b9e',5*s);
  for(const p of [a,b])line([p,{x:p.x,y:p.y-57*s}],'#697882',7*s);
  line([{x:a.x,y:a.y-57*s},{x:b.x,y:b.y-57*s}],'#879298',5*s);
  if(!open)poly([a,b,{x:b.x+inside*9*s,y:b.y-45*s},{x:a.x+inside*9*s,y:a.y-45*s}],'#263c49cc','#82918c55',s);
  ctx.font=`${10*s}px system-ui`;ctx.fillStyle='#dfcea9';ctx.textAlign=d.edge==='west'?'left':'right';ctx.fillText(label,q.x+inside*16*s,q.y-64*s);return;
 }
 const width=d.width*s;floorPatch(d.x-d.width/2,d.edge==='north'?0:RULES.size-24,d.width,24,'#8d836155','#e3c48d66');
 ctx.fillStyle='#1a2735';ctx.fillRect(q.x-width/2,q.y-57*s,9*s,58*s);ctx.fillRect(q.x+width/2-9*s,q.y-57*s,9*s,58*s);
 ctx.fillStyle='#66717a';ctx.fillRect(q.x-width/2,q.y-60*s,width,8*s);
 if(!open){ctx.fillStyle='#263c49';ctx.fillRect(q.x-width/2+10*s,q.y-50*s,width-20*s,48*s);for(let y=-43;y<-5;y+=10)line([{x:q.x-width/2+12*s,y:q.y+y*s},{x:q.x+width/2-12*s,y:q.y+y*s}],'#8c9d9a33',s);line([{x:q.x,y:q.y-48*s},{x:q.x,y:q.y-2*s}],'#aab9ad55',s);}
 ellipse(q.x,q.y-55*s,4*s,2*s,open?'#c2e7ae':d.entry?'#e4bc7d':'#8c9c9d');ctx.font=`${10*s}px system-ui`;ctx.fillStyle=d.entry?'#e1c594':'#c4d4cd';ctx.textAlign='center';ctx.fillText(label,q.x,q.y-68*s);
}
function drawGround() {
  ctx.fillStyle='#141e29';ctx.fillRect(0,0,W,H);
  const size=RULES.size,origin=project({x:0,y:0}),s=scale;
  const corners=[{x:0,y:0},{x:size,y:0},{x:size,y:size},{x:0,y:size}].map(project);
  poly(corners.map(p=>({x:p.x,y:p.y+14*s})),'#0d131c');
  poly(corners,'#303c49','#63707a',1.5*s);
  if(artReady(groundArt)){
    ctx.save();ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
    ctx.transform(VIEW.x*s,0,0,VIEW.y*s,origin.x,origin.y);
    // A shared world transform keeps the texture attached during zoom and pan.
    for(let x=0;x<size;x+=360)for(let y=0;y<size;y+=360)ctx.drawImage(groundArt,x,y,360,360);
    ctx.restore();
  }
  // One tile is one meter; gaps remove the standing surface entirely.
  for(let t=0;t<=size;t+=RULES.unitsPerMeter){
    line([project({x:t,y:0}),project({x:t,y:size})],'#9bacb417',.7*s);
    line([project({x:0,y:t}),project({x:size,y:t})],'#9bacb417',.7*s);
  }
  for(const gap of game.gaps){
    floorPatch(gap.x,gap.y,gap.w,gap.h,'#070d15','#89969a88');
    const a=project({x:gap.x,y:gap.y}),b=project({x:gap.x+gap.w,y:gap.y});
    poly([a,b,{x:b.x,y:b.y+13*s},{x:a.x,y:a.y+13*s}],'#28323c');
    line([project({x:gap.x+5,y:gap.y+gap.h-5}),project({x:gap.x+gap.w-5,y:gap.y+gap.h-5})],'#080d15',3*s);
  }
  // Curbs sit at the perimeter. They are visual borders, never extra obstacles.
  for(let t=0;t<size;t+=80){
    const color=(t/80)%3===0?'#56616b':'#444f5b';
    floorPatch(t,0,77,13,color,'#222e3b');floorPatch(0,t,13,77,color,'#222e3b');
    floorPatch(t,size-13,77,13,color,'#222e3b');floorPatch(size-13,t,13,77,color,'#222e3b');
  }
  // Ground paint, drains, and paper are flush with the floor and non-blocking.
  for(let i=0;i<8;i++){
    const x=140+(i*337)%1160,y=100+(i*223)%1220;
    if(terrainGap(game,{x,y},20)||game.walls.some(w=>circleRect({x,y},45,w))||dist({x,y},game.player)<80)continue;
    if(i%3===0){
      floorPatch(x,y,48,39,'#18232d','#59616b');
      for(let j=5;j<44;j+=7)line([project({x:x+j,y:y+4}),project({x:x+j,y:y+35})],'#75808b55',1.4*s);
    }else{
      floorPatch(x,y,15,20,'#a2a6a270','#1c2734');
      line([project({x:x+3,y:y+7}),project({x:x+12,y:y+7})],'#3b465877',s);
    }
  }
  // Small reflected pools make the alley feel damp without obscuring targets.
  for(let i=0;i<12;i++){
    const q=project({x:90+(i*229)%1260,y:60+(i*311)%1300});
    ellipse(q.x,q.y,(12+i%4*7)*s,(3+i%3)*s,'#7fabc511');
    line([{x:q.x-8*s,y:q.y},{x:q.x+12*s,y:q.y}],'#9fb9ce20',.7*s);
  }
  line([...corners,corners[0]],'#9baab566',s,[4*s,8*s]);
  // Lamps outside the arena are scenery. Zombies may still enter on every side.
  for(const pos of [{x:0,y:240},{x:680,y:0},{x:size,y:850},{x:320,y:size}]){
    const q=project(pos);
    ellipse(q.x,q.y,60*s,25*s,'#ffc66f09');
    line([{x:q.x,y:q.y},{x:q.x,y:q.y-59*s}],'#121c28',4*s);
    ellipse(q.x,q.y-60*s,9*s,4*s,'#f5cb87','#92754d');
    ellipse(q.x,q.y-60*s,15*s,9*s,'#ffc66f13');
  }
  for(const z of game.zombies.filter(z=>z.alive&&(z.x<0||z.y<0||z.x>size||z.y>size))){
    const p=project(z);ctx.fillStyle='#f2bd79';ctx.font=`${12*s}px system-ui`;ctx.textAlign='center';ctx.fillText('⌄',p.x,p.y-(ART.height+7)*s);
  }
}
function drawDrum(d) {
 const p=project(d),s=scale,r=(d.radius??18)*s,ry=r*VIEW.y,height=(d.height??1)*RULES.unitsPerMeter*.57*s;
 if(!d.alive){ellipse(p.x,p.y,r*1.1,ry,'#0e1721');line([{x:p.x-r*.6,y:p.y},{x:p.x+r*.6,y:p.y+3*s}],'#6f4a3d',3*s);return;}
 ellipse(p.x+4*s,p.y+3*s,r*1.12,ry*1.08,'#080f1888');
 const metal=ctx.createLinearGradient(p.x-r,0,p.x+r,0);metal.addColorStop(0,'#753a38');metal.addColorStop(.25,'#b85e4c');metal.addColorStop(.6,'#9e4b40');metal.addColorStop(1,'#5c3034');
 ctx.fillStyle=metal;ctx.fillRect(p.x-r,p.y-height,r*2,height);ellipse(p.x,p.y,r,ry,'#753a38','#281f2b');ellipse(p.x,p.y-height,r,ry,'#ba6b55','#321f2b');
 ellipse(p.x+r*.35,p.y-height-r*.1,r*.17,ry*.16,'#4a3335','#d7946b');
 for(const y of [.2,.8])line([{x:p.x-r,y:p.y-height*y},{x:p.x+r,y:p.y-height*y}],'#d2917266',2*s);
 const mark=Math.min(r*.5,height*.3),y=p.y-height*.48;
 poly([{x:p.x,y:y-mark},{x:p.x+mark,y},{x:p.x,y:y+mark},{x:p.x-mark,y}],'#f2d3a4','#743d38',s);
 line([{x:p.x,y:y-mark*.5},{x:p.x,y:y+mark*.1}],'#6a3531',2*s);ellipse(p.x,y+mark*.45,s,s,'#6a3531');
}
function drawSupplyCrate(c){
 const s=scale,q=project(c);
 if(!c.alive){
  ellipse(q.x,q.y,43*s,24*s,'#10182277');
  for(let i=0;i<4;i++)line([{x:q.x+(i*17-33)*s,y:q.y+(i%2?9:-7)*s},{x:q.x+(i*13-20)*s,y:q.y+(i%2?-6:12)*s}],'#936e48',5*s);
  return;
 }
 const a=project({x:c.x-50,y:c.y-50}),b=project({x:c.x+50,y:c.y-50}),d=project({x:c.x-50,y:c.y+50}),f=project({x:c.x+50,y:c.y+50}),up=p=>({x:p.x,y:p.y-57*s});
 ellipse(q.x+5*s,q.y+8*s,60*s,39*s,'#070f1977');
 poly([d,f,up(f),up(d)],'#785d3f','#192330',1.5*s);
 poly([b,f,up(f),up(b)],'#554936','#192330',1.5*s);
 poly([up(a),up(b),up(f),up(d)],'#b18a59','#26312e',1.5*s);
 line([up(a),up(f)],'#d4b37d',6*s);line([up(b),up(d)],'#d4b37d',6*s);
 for(const fraction of [.2,.8]){
  const x=d.x+(f.x-d.x)*fraction;line([{x,y:d.y},{x,y:d.y-57*s}],'#a5b18a',7*s);
 }
 ctx.save();ctx.fillStyle='#f5e1b5';ctx.font='bold '+Math.max(9,12*s)+'px system-ui';ctx.textAlign='center';ctx.fillText('보급',q.x,q.y+12*s);ctx.restore();
}
function drawSupplyDrop(drop){
 const item=SUPPLY_ITEMS[drop.kind],q=project(drop),s=Math.max(scale,.45),bob=feedback.reducedMotion?0:Math.sin(game.age*3+drop.id)*3*scale,y=q.y-23*scale+bob;
 ellipse(q.x,q.y,22*scale,10*scale,item.color+'33',item.color+'99');
 ellipse(q.x,y,16*s,16*s,'#172637',item.color);
 ctx.save();ctx.textAlign='center';ctx.fillStyle=item.color;ctx.font='bold '+(20*s)+'px system-ui';ctx.fillText(item.icon,q.x,y+7*s);
 ctx.fillStyle='#f3e6ce';ctx.font=Math.max(9,10*scale)+'px system-ui';ctx.fillText(item.name,q.x,y-21*s);ctx.restore();
}
function drawCrateBurst(e){
 const q=project(e),s=scale;
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,x=q.x+Math.cos(angle)*(12+e.t*85)*s,y=q.y-28*s+Math.sin(angle)*e.t*50*s-e.t*(1-e.t)*65*s;
  poly([{x:x-5*s,y:y-3*s},{x:x+7*s,y:y+2*s},{x:x+2*s,y:y+6*s}],i%2?'#d4b37d':'#937047','#423c30',s);
 }
}
