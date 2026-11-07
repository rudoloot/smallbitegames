// Presentation time is separate from projectile time. No gameplay RNG or camera
// focus is changed by impact effects. All effects are bounded and short lived.
class ImpactFeedback {
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.reset();}
 reset(){this.items=[];this.stop=0;this.seen=0;this.source=null;this.epoch=null;}
 bind(game){if(this.source!==game||this.epoch!==game.effectEpoch){this.reset();this.source=game;this.epoch=game.effectEpoch;return true;}return false;}
 advance(dt){const blocked=Math.min(this.stop,dt);this.stop=Math.max(0,this.stop-dt);this.items.forEach(e=>e.age+=dt);this.items=this.items.filter(e=>e.age<.34);return Math.max(0,dt-blocked);}
 collect(game){this.bind(game);const added=[];
  for(const e of game.effects){if(e.type!=='impact'||e.serial<=this.seen)continue;this.seen=e.serial;const item={...e,age:0};this.items.push(item);added.push(item);this.stop=Math.max(this.stop,e.critical?.06:.035);}
  if(this.items.length>12)this.items.splice(0,this.items.length-12);
  return added;
 }
 forTarget(id){for(let i=this.items.length-1;i>=0;i--)if(this.items[i].targetId===id)return this.items[i];return null;}
 shake(){if(this.reducedMotion)return {x:0,y:0};let x=0,y=0;
  for(const e of this.items){const duration=e.critical?.18:.12;if(e.age>=duration)continue;const a=(e.critical?3.5:2.1)*(1-e.age/duration)**2;
   const angle=Math.atan2(e.dy*.82,e.dx);x+=Math.cos(angle+Math.sin(e.age*210)*.8)*a*Math.cos(e.age*145);y+=Math.sin(angle+Math.cos(e.age*190)*.8)*a*Math.sin(e.age*155+1);}
  return {x:Math.max(-4,Math.min(4,x)),y:Math.max(-4,Math.min(4,y))};
 }
 recoil(id){const e=this.forTarget(id);if(!e||this.reducedMotion||e.age>=.15)return {x:0,y:0,squash:0};const a=(1-e.age/.15)**2;return {x:e.dx*(e.critical?13:9)*a,y:e.dy*(e.critical?13:9)*a,squash:a*.1};}
}

function drawImpactBursts() {
 for(const e of feedback.items){
  const duration=e.critical?.3:.22;if(e.age>=duration)continue;
  const q=project(e);q.y-=e.height*scale;
  const t=e.age/duration,energy=e.critical?1.4:1;
  ctx.save();ctx.globalAlpha=(1-t)**1.5;
  ellipse(q.x,q.y,(5+t*25)*scale*energy,(3+t*17)*scale*energy,null,e.critical?'#ffd184':'#ffe2b1');
  if(e.age<.065){
   const size=(e.critical?15:11)*(1-e.age/.075)*scale,points=[];
   for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?size*.28:size;points.push({x:q.x+Math.cos(a)*r,y:q.y+Math.sin(a)*r});}
   poly(points,'#fff5dc');
  }
  const count=e.critical?12:8;
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count+(e.targetId%5)*.23,speed=(100+(i%3)*50)*energy;
   const dx=Math.cos(a)*speed*e.age+e.dx*e.age*55,dy=Math.sin(a)*speed*e.age+e.dy*e.age*45+e.age*e.age*130;
   const end={x:q.x+dx*scale,y:q.y+dy*scale},tail={x:end.x-Math.cos(a)*(3+4*(1-t))*scale,y:end.y-Math.sin(a)*(3+4*(1-t))*scale};
   line([tail,end],i%3===0?'#fff5de':e.critical?'#f5b65c':'#d6bd8c',(i%3===0?2:1.3)*scale);
  }
  ctx.restore();
 }
}
