// Continuous contacts in world coordinates. No DOM or rendering dependencies.
function circleContact(start,delta,center,radius) {
  const x=start.x-center.x,y=start.y-center.y;
  const a=delta.x*delta.x+delta.y*delta.y;if(a<1e-16)return null;
  const b=x*delta.x+y*delta.y,c=x*x+y*y-radius*radius;
  let t=0;
  if(c>1e-8){const disc=b*b-a*c;if(disc<0)return null;t=(-b-Math.sqrt(disc))/a;if(t<0||t>1)return null;}
  const nx=x+delta.x*t,ny=y+delta.y*t,len=Math.hypot(nx,ny);
  const n=len>1e-8?{x:nx/len,y:ny/len}:norm(-delta.x,-delta.y);
  if(delta.x*n.x+delta.y*n.y>=-1e-9)return null;
  return {t,nx:n.x,ny:n.y};
}
function wallContact(start,delta,wall,radius) {
  // Offset straight faces plus circular corners form the swept circle boundary.
  let best=null;
  const take=c=>{if(c&&c.t>=-1e-9&&c.t<=1&&(!best||c.t<best.t))best={...c,t:Math.max(0,c.t)};};
  for(const [axis,other,min,length] of [['x','y',wall.x,wall.h],['y','x',wall.y,wall.w]]){
    const low=wall[other],v=delta[axis];if(Math.abs(v)<1e-12)continue;
    const face=v>0?min-radius:min+wall[axis==='x'?'w':'h']+radius;
    const t=(face-start[axis])/v,q=start[other]+delta[other]*t;
    if(q>=low&&q<=low+length)take({t,nx:axis==='x'?-Math.sign(v):0,ny:axis==='y'?-Math.sign(v):0});
  }
  for(const [x,sx] of [[wall.x,-1],[wall.x+wall.w,1]])for(const [y,sy] of [[wall.y,-1],[wall.y+wall.h,1]]){
    const c=circleContact(start,delta,{x,y},radius);
    if(c&&c.nx*sx>=-1e-8&&c.ny*sy>=-1e-8)take(c);
  }
  return best;
}

function earliestShotContact(game,p,delta) {
  let best=null;
  const take=(hit,type,target)=>{if(hit&&hit.t>=-1e-9&&hit.t<=1&&(!best||hit.t<best.t))best={...hit,t:Math.max(0,hit.t),type,target};};
  for(const axis of ['x','y']){
    const v=delta[axis];if(Math.abs(v)<1e-12)continue;
    const t=((v>0?RULES.size-7:7)-p[axis])/v;
    take({t,nx:axis==='x'?-Math.sign(v):0,ny:axis==='y'?-Math.sign(v):0},'wall');
  }
  for(const w of [...game.walls,...game.perimeterWalls])take(wallContact(p,delta,w,7),'wall',w);
  for(const z of game.zombies)if(z.alive&&!p.hit.has(z.id))take(circleContact(p,delta,z,25),'zombie',z);
  for(const d of game.drums)if(d.alive)take(circleContact(p,delta,d,(d.radius??18)+7),'drum',d);
  for(const c of game.crates)if(c.alive)take(wallContact(p,delta,{x:c.x-50,y:c.y-50,w:100,h:100},7),'crate',c);
  return best;
}
function recordShotPoint(p,x,y) {
  p.distance+=Math.hypot(x-p.x,y-p.y);p.x=x;p.y=y;
  p.path.push({x,y,height:Math.max(0,p.height),distance:p.distance});
}
function advanceProjectile(game,dt) {
  const p=game.projectile;if(!p)return;
  // Fixed maximum step, with swept contacts inside each step: high strength
  // cannot skip targets, and the earliest object wins regardless of array order.
  const steps=Math.max(1,Math.ceil(dt/.005)),step=dt/steps;
  for(let i=0;i<steps&&game.projectile;i++){
    p.time+=step;
    const drag=Math.exp(-(p.falling?5:RULES.airDrag)*step);p.vx*=drag;p.vy*=drag;
    if(p.falling){
      recordShotPoint(p,clamp(p.x+p.vx*step,7,RULES.size-7),clamp(p.y+p.vy*step,7,RULES.size-7));
      p.vz-=RULES.gravity*step;p.height+=p.vz*step;
      p.path[p.path.length-1].height=Math.max(0,p.height);
      if(p.height<=0)game.land(p);
      continue;
    }
    let remaining=step;
    for(let contacts=0;contacts<12&&remaining>1e-10;contacts++){
      const delta={x:p.vx*remaining,y:p.vy*remaining},hit=earliestShotContact(game,p,delta);
      if(!hit){recordShotPoint(p,p.x+delta.x,p.y+delta.y);break;}
      recordShotPoint(p,p.x+delta.x*hit.t,p.y+delta.y*hit.t);
      remaining*=1-hit.t;
      if(hit.type==='zombie'){
        p.hit.add(hit.target.id);game.hitZombie(hit.target,{x:p.x,y:p.y,height:p.height,vx:p.vx,vy:p.vy});p.left--;
        game.bounce(p,hit.nx,hit.ny);game.loseEnergy(p,RULES.zombieRetention);
      }else if(hit.type==='drum'){
        game.explode(hit.target);p.left--;game.loseEnergy(p,RULES.drumRetention);
      }else if(hit.type==='crate'){
        game.breakCrate(hit.target);p.left--;game.bounce(p,hit.nx,hit.ny);game.loseEnergy(p,.68);
      }else{
        game.emitNoise(p,RULES.impactNoise);
        game.bounce(p,hit.nx,hit.ny);game.loseEnergy(p,RULES.wallRetention);p.wallHits++;
      }
      p.impacts.push({x:p.x,y:p.y,height:p.height,distance:p.distance,type:hit.type});
      if(p.left<=0||Math.hypot(p.vx,p.vy)<=RULES.landingSpeed){game.drop(p,p.left<=0?'spent':'slow');break;}
    }
    const speed=Math.hypot(p.vx,p.vy),lift=28*clamp((speed-RULES.landingSpeed)/(p.initialSpeed-RULES.landingSpeed),0,1);
    p.height+=(lift-p.height)*Math.min(1,step*14);
    if(p.path.length)p.path[p.path.length-1].height=Math.max(0,p.height);
    if(speed<=RULES.landingSpeed||p.left<=0)game.drop(p,p.left<=0?'spent':'slow');
  }
  if(game.projectile){p.trail.push({x:p.x,y:p.y,height:p.height});if(p.trail.length>12)p.trail.shift();}
}
function predictShotPath(game,dir,power) {
  if(power<.13||Math.hypot(dir.x,dir.y)<.001)return {points:[],impacts:[],distance:0};
  // Simulate the exact same rules on an isolated copy. Prediction never damages
  // live zombies, explodes live drums, advances turns, or consumes the stone.
  const sim=Object.assign(Object.create(Object.getPrototypeOf(game)),game,{
    clearedStages:[...game.clearedStages],stats:{...game.stats},player:{...game.player},zombies:game.zombies.map(z=>({...z})),drums:game.drums.map(d=>({...d})),crates:game.crates.map(c=>({...c})),drops:game.drops.map(d=>({...d})),itemsCollected:{...game.itemsCollected},
    effects:[],corpses:[],settledStones:[],history:[],phase:'aim',projectile:null
  });
  sim.fire(dir,power);const shot=sim.projectile,limit=game.stats.sight*RULES.unitsPerMeter;
  for(let i=0;i<10000&&sim.projectile&&shot.distance<limit;i++)sim.advanceShot(.005);
  const points=[];
  for(const point of shot.path){
    if(point.distance<=limit){points.push({...point});continue;}
    const a=points[points.length-1],t=(limit-a.distance)/(point.distance-a.distance);
    points.push({x:a.x+(point.x-a.x)*t,y:a.y+(point.y-a.y)*t,height:a.height+(point.height-a.height)*t,distance:limit});break;
  }
  return {points,impacts:shot.impacts.filter(p=>p.distance<=limit),distance:points.at(-1)?.distance||0};
}
