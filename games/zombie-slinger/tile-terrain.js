// One world tile is 1m x 1m. Raised cells are obstacles, never standing surfaces.
function tileStage(layout) {
 const size=RULES.unitsPerMeter,rect=([col,row,height=0])=>({col,row,x:col*size,y:row*size,w:size,h:size,height});
 const object=([col,row])=>({col,row,x:(col+.5)*size,y:(row+.5)*size,radius:size/2,height:1,alive:true});
 return {walls:layout.walls.map(rect),gaps:layout.gaps.map(rect),drums:(layout.drums||[layout.drum]).map(object),crates:(layout.crates||[]).map(cell=>({...object(cell),kind:'supply'}))};
}
function terrainObjects(game){return [...game.drums,...(game.crates||[])].filter(d=>d.alive);}
function objectBlocks(p,radius,d){return d.kind==='supply'?circleRect(p,Math.max(radius,.001),{x:d.x-50,y:d.y-50,w:100,h:100}):dist(p,d)<radius+(d.radius??18);}
function terrainGap(game,p,radius=0){return game.gaps.some(g=>circleRect(p,radius,g)||(radius===0&&p.x>=g.x&&p.x<g.x+g.w&&p.y>=g.y&&p.y<g.y+g.h));}
function terrainCell(game,col,row){
 const size=RULES.unitsPerMeter,p={x:(col+.5)*size,y:(row+.5)*size};
 if(col<0||row<0||col>=RULES.size/size||row>=RULES.size/size)return {kind:'outside'};
 const wall=game.walls.find(w=>p.x>=w.x&&p.x<w.x+w.w&&p.y>=w.y&&p.y<w.y+w.h);if(wall)return {kind:'wall',height:wall.height??2};
 if(terrainGap(game,p))return {kind:'gap'};
 const object=terrainObjects(game).find(d=>objectBlocks(p,0,d));if(object)return {kind:'object',height:object.height??1};
 return {kind:'floor',height:0};
}
function jumpBlockers(game,p,radius){
 const result=[];
 for(const w of game.walls)if(circleRect(p,radius,w))result.push({key:w,kind:'wall',height:w.height??2});
 for(const g of game.gaps)if(circleRect(p,radius,g))result.push({key:g,kind:'gap',height:0});
 for(const d of terrainObjects(game))if(objectBlocks(p,radius,d))result.push({key:d,kind:'object',height:d.height??1});
 return result;
}
function planPlayerJump(game,direction){
 const dir=norm(direction.x,direction.y),start={...game.player},radius=18;
 if(Math.hypot(direction.x,direction.y)<1e-8||!game.canStand(start))return null;
 let obstacle=null,kind=null,height=0;
 // A diagonal across one tile is valid; two distinct void/obstacle cells are not.
 const limit=RULES.unitsPerMeter*Math.SQRT2+radius*2+6;
 for(let length=2;length<=limit;length+=2){
  const p={x:start.x+dir.x*length,y:start.y+dir.y*length};
  if(p.x<radius||p.y<radius||p.x>RULES.size-radius||p.y>RULES.size-radius||game.perimeterWalls.some(w=>circleRect(p,radius,w))||game.zombies.some(z=>z.alive&&dist(p,z)<34))return null;
  const blockers=jumpBlockers(game,p,radius);
  for(const b of blockers){
   if((b.kind!=='gap'&&b.height>RULES.playerVaultHeight)||b.kind==='gap'&&(b.key.w>RULES.unitsPerMeter||b.key.h>RULES.unitsPerMeter))return null;
   if(obstacle&&obstacle!==b.key)return null;
   obstacle=b.key;kind=b.kind;height=b.height;
  }
  if(obstacle&&!blockers.length){
   if(!game.canStand(p)||dist(p,game.moveOrigin)>game.movementRadius()+1e-7)return null;
   return {from:start,to:p,t:0,duration:.32,height:0,peak:Math.max(65,height*RULES.unitsPerMeter+25),kind};
  }
 }
 return null;
}
function advancePlayerJump(game,dt){
 const jump=game.jump;if(!jump)return;
 jump.t=Math.min(jump.duration,jump.t+dt);const t=jump.t/jump.duration;
 game.player={x:jump.from.x+(jump.to.x-jump.from.x)*t,y:jump.from.y+(jump.to.y-jump.from.y)*t};jump.height=Math.sin(t*Math.PI)*jump.peak;
 if(t>=1){game.player={...jump.to};game.jump=null;game.noticePlayer();game.collectDrops();game.effects.push({x:game.player.x,y:game.player.y,t:0,type:'dust'});if(game.pendingUpgrades)game.suspendForUpgrades('move');}
}
function clearEnemyAttackPath(game,from,to){
 const length=dist(from,to),steps=Math.max(1,Math.ceil(length/5));
 for(let i=1;i<steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(game.walls.some(w=>circleRect(p,1,w))||game.perimeterWalls.some(w=>circleRect(p,1,w))||terrainGap(game,p)||terrainObjects(game).some(d=>objectBlocks(p,1,d)))return false;}
 return true;
}
// Perception does not use the player's trajectory-preview sight stat.
function zombieCanSee(game,z){
 if(dist(z,game.player)>RULES.zombieSight)return false;
 const length=dist(z,game.player),steps=Math.max(1,Math.ceil(length/5));
 for(let i=1;i<steps;i++){
  const p={x:z.x+(game.player.x-z.x)*i/steps,y:z.y+(game.player.y-z.y)*i/steps};
  if([...game.walls,...game.perimeterWalls].some(w=>(w.height??2)>=1&&circleRect(p,1,w))||terrainObjects(game).some(d=>objectBlocks(p,1,d)))return false;
 }
 return true;
}
function noticeVisiblePlayer(game,z){
 if(!zombieCanSee(game,z))return false;
 z.awareness='chase';z.lastKnown={...game.player};z.alertTurns=RULES.zombieMemoryTurns;return true;
}
function updateZombiePerception(game,z){
 if(noticeVisiblePlayer(game,z)){z.heardNoise=false;return;}
 if(z.heardNoise){z.awareness='investigate';z.alertTurns--;}
 else if((z.alertTurns??0)>0&&z.lastKnown&&dist(z,z.lastKnown)>40){z.awareness='investigate';z.alertTurns--;}
 else {z.awareness='idle';z.lastKnown=null;z.alertTurns=0;}
 z.heardNoise=false;
}
