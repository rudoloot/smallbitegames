import {WORLD,keyFor} from './core.js?v=3d43dea3bde5';
export const MERGE_INTERVAL=900;
export const RESULT_LOCK=1800;
export const CONTACT_DWELL=180;
export class Physics {
  constructor(data,{onMerge=()=>{},onGameOver=()=>{},Matter=globalThis.Matter}={}){
    this.M=Matter;this.data=data;this.onMerge=onMerge;this.onGameOver=onGameOver;
    this.engine=Matter.Engine.create({enableSleeping:false,positionIterations:8,velocityIterations:6});
    this.engine.gravity.y=1;this.engine.gravity.scale=.001;
    this.blocks=[];this.time=0;this.dangerMs=0;this.over=false;this.lastDrop=-400;this.contacts=new Map();this.sequence=0;this.probes=new Map();this.nextMergeAt=0;this.parentContacts=new Map();
    const {Bodies,Composite,Events}=Matter;
    this.walls=[Bodies.rectangle(WORLD.left-16,350,32,800,{isStatic:true,label:'wall'}),Bodies.rectangle(WORLD.right+16,350,32,800,{isStatic:true,label:'wall'}),Bodies.rectangle(640,WORLD.bottom+16,896,32,{isStatic:true,label:'floor'})];
    Composite.add(this.engine.world,this.walls);
    const collect=({pairs})=>{for(const {bodyA:partA,bodyB:partB} of pairs){
      const a=partA.parent,b=partB.parent;
      if(a.itemId&&!b.isStatic||a.itemId&&b.label==='floor')a.eligible=true;
      if(b.itemId&&!a.isStatic||b.itemId&&a.label==='floor')b.eligible=true;
      if(a.itemId&&b.itemId&&a!==b){const k=[partA.id,partB.id].sort((x,y)=>x-y).join(':');if(!this.contacts.has(k))this.contacts.set(k,{a,b,at:this.time});}
    }};
    Events.on(this.engine,'collisionStart',collect);Events.on(this.engine,'collisionActive',collect);
    Events.on(this.engine,'collisionEnd',({pairs})=>{for(const {bodyA:a,bodyB:b} of pairs)this.contacts.delete([a.id,b.id].sort((x,y)=>x-y).join(':'));});
  }
  createBody(id,x,y){
    const item=this.data.byId.get(id);if(!item)throw Error('Unknown item '+id);
    const geometry=this.data.geometry?.[id];if(!geometry?.parts?.length)throw Error('Missing silhouette collision geometry: '+id);
    const scale=item.radius*1.11,options={restitution:.08,friction:.35,frictionStatic:.65,frictionAir:.012,density:.001,slop:.08};
    const parts=geometry.parts.map(p=>this.M.Bodies.rectangle(p.x*scale,p.y*scale,p.w*scale,p.h*scale,options));
    const body=parts.length===1?parts[0]:this.M.Body.create({...options,parts});
    body.renderOffset={x:-body.position.x,y:-body.position.y};body.visualRadius=item.radius;
    this.M.Body.setPosition(body,{x,y});body.itemId=id;
    return body;
  }
  fitBody(body){
    const b=body.bounds;const dx=b.min.x<WORLD.left?WORLD.left-b.min.x:b.max.x>WORLD.right?WORLD.right-b.max.x:0;
    const dy=b.max.y>WORLD.bottom?WORLD.bottom-b.max.y:0;
    if(dx||dy)this.M.Body.translate(body,{x:dx,y:dy});return body;
  }
  add(id,x,y,{eligible=false,locked=0}={}){
    const body=this.fitBody(this.createBody(id,x,y));
    body.itemId=id;body.eligible=eligible;body.lockUntil=this.time+locked;
    this.M.Composite.add(this.engine.world,body);this.blocks.push(body);return body;
  }
  probe(x,id){let body=this.probes.get(id);if(!body){body=this.createBody(id,x,WORLD.spawnY);this.probes.set(id,body);}this.M.Body.setPosition(body,{x,y:WORLD.spawnY});return this.fitBody(body);}
  canDrop(x,id){if(this.over||this.time-this.lastDrop<400)return false;return this.M.Query.collides(this.probe(x,id),this.blocks).length===0;}
  drop(x,id){if(!this.canDrop(x,id))return false;const point=this.probe(x,id).position;this.add(id,point.x,point.y);this.lastDrop=this.time;return true;}
  pick(x,y){return this.M.Query.point(this.blocks,{x,y})[0]||null;}
  step(dt=1000/60){
    if(this.over)return;
    this.time+=dt;
    for(const b of this.blocks)if(b.speed>20)this.M.Body.setVelocity(b,{x:b.velocity.x*20/b.speed,y:b.velocity.y*20/b.speed});
    this.M.Engine.update(this.engine,dt);
    const used=new Set();const existing=new Set(this.blocks.map(b=>b.id));
    const parentPairs=new Map();
    for(const {a,b} of this.contacts.values())if(existing.has(a.id)&&existing.has(b.id)){
      const key=[a.id,b.id].sort((x,y)=>x-y).join(':');
      if(!parentPairs.has(key))parentPairs.set(key,{a,b,at:this.parentContacts.get(key)?.at??this.time});
    }
    this.parentContacts=parentPairs;
    const candidates=[...parentPairs.values()].sort((u,v)=>u.at-v.at||Math.min(u.a.id,u.b.id)-Math.min(v.a.id,v.b.id)||Math.max(u.a.id,u.b.id)-Math.max(v.a.id,v.b.id));
    for(const {a,b,at} of candidates){
      if(this.time<this.nextMergeAt)break;
      if(this.time-at<CONTACT_DWELL)continue;
      if(!existing.has(a.id)||!existing.has(b.id)||used.has(a.id)||used.has(b.id)||this.time<a.lockUntil||this.time<b.lockUntil)continue;
      const recipe=this.data.byPair.get(keyFor(a.itemId,b.itemId));if(!recipe)continue;
      used.add(a.id);used.add(b.id);
      const mass=a.mass+b.mass;const x=(a.position.x*a.mass+b.position.x*b.mass)/mass;const y=(a.position.y*a.mass+b.position.y*b.mass)/mass;
      const velocity={x:(a.velocity.x*a.mass+b.velocity.x*b.mass)/mass*.5,y:(a.velocity.y*a.mass+b.velocity.y*b.mass)/mass*.5};
      this.M.Composite.remove(this.engine.world,[a,b]);
      this.blocks=this.blocks.filter(body=>body!==a&&body!==b);
      const result=this.add(recipe.result,x,y,{eligible:true,locked:RESULT_LOCK});this.M.Body.setVelocity(result,velocity);
      this.nextMergeAt=this.time+MERGE_INTERVAL;
      this.onMerge({eventId:++this.sequence,item:this.data.byId.get(recipe.result),recipe,body:result,time:this.time});
      break;
    }
    for(const [key,{a,b}] of this.contacts)if(used.has(a.id)||used.has(b.id))this.contacts.delete(key);
    let danger=false;
    for(const b of this.blocks){if(b.bounds.min.y>=WORLD.dangerY)b.eligible=true;if(b.eligible&&b.bounds.min.y<WORLD.dangerY-2)danger=true;}
    this.dangerMs=danger?this.dangerMs+dt:0;
    if(this.dangerMs>=2000){this.over=true;this.onGameOver();}
  }
  destroy(){this.M.Events.off(this.engine);this.M.Composite.clear(this.engine.world,false);this.M.Engine.clear(this.engine);this.blocks=[];this.contacts.clear();this.parentContacts.clear();this.probes.clear();}
}
