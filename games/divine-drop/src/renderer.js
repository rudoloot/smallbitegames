import {WORLD} from './core.js?v=3d43dea3bde5';
import {sprite} from './art.js?v=3d43dea3bde5';
export class Renderer{
  constructor(canvas,data){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.data=data;this.effects=[];this.focus=null;}
  resize(width,height){const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}
  burst(event){this.effects.push({x:event.body.position.x,y:event.body.position.y,score:event.item.score,at:event.time,color:event.item.kind==='collection'?'#b59457':'#638979'});}
  render(game,supply,aim,paused){
    const c=this.ctx;const scale=this.canvas.width/WORLD.cameraW;c.setTransform(scale,0,0,scale,-WORLD.cameraX*scale,-WORLD.cameraY*scale);c.clearRect(WORLD.cameraX,WORLD.cameraY,WORLD.cameraW,WORLD.cameraH);
    c.save();c.shadowColor='#00000090';c.shadowBlur=22;c.shadowOffsetY=12;c.fillStyle='#102f35d9';c.beginPath();c.roundRect(WORLD.left-5,WORLD.top-4,842,553,[12,12,22,22]);c.fill();c.restore();
    const glass=c.createLinearGradient(WORLD.left,0,WORLD.right,0);glass.addColorStop(0,'#a9d0c920');glass.addColorStop(.15,'#79b5c308');glass.addColorStop(.85,'#39789608');glass.addColorStop(1,'#b8d3c620');c.fillStyle=glass;c.fillRect(WORLD.left,WORLD.top,832,544);
    c.strokeStyle='#d6b57899';c.lineWidth=4;c.beginPath();c.moveTo(WORLD.left,WORLD.top);c.lineTo(WORLD.left,WORLD.bottom-16);c.quadraticCurveTo(WORLD.left,WORLD.bottom,WORLD.left+18,WORLD.bottom);c.lineTo(WORLD.right-18,WORLD.bottom);c.quadraticCurveTo(WORLD.right,WORLD.bottom,WORLD.right,WORLD.bottom-16);c.lineTo(WORLD.right,WORLD.top);c.stroke();
    c.strokeStyle='#ffffffb0';c.lineWidth=2;c.beginPath();c.moveTo(WORLD.left+7,WORLD.top+12);c.lineTo(WORLD.left+7,WORLD.bottom-24);c.moveTo(WORLD.right-7,WORLD.top+12);c.lineTo(WORLD.right-7,WORLD.bottom-24);c.stroke();
    c.fillStyle='#becdb34a';c.fillRect(WORLD.left+6,WORLD.bottom+5,820,6);
    c.setLineDash([5,9]);c.strokeStyle=game.dangerMs>0?'#c47d61':'#bac7ad88';c.lineWidth=1.3;c.beginPath();c.moveTo(WORLD.left+8,WORLD.dangerY);c.lineTo(WORLD.right-8,WORLD.dangerY);c.stroke();c.setLineDash([]);
    if(game.dangerMs>0){c.fillStyle='#bd7056';c.font='14px sans-serif';c.textAlign='right';c.fillText(`${Math.max(0,2-game.dangerMs/1000).toFixed(1)}`,WORLD.right-14,WORLD.dangerY-9);}
    for(const body of game.blocks){const r=body.visualRadius;c.save();c.translate(body.position.x,body.position.y);c.rotate(body.angle);c.drawImage(sprite(this.data.byId.get(body.itemId)),body.renderOffset.x-r*1.11,body.renderOffset.y-r*1.11,r*2.22,r*2.22);c.restore();}
    if(!paused&&!game.over){const valid=game.canDrop(aim,supply.current);const probe=game.probe(aim,supply.current),x=probe.position.x+probe.renderOffset.x,y=probe.position.y+probe.renderOffset.y;const r=probe.visualRadius*1.11;c.save();c.globalAlpha=valid?.8:.3;c.setLineDash([3,8]);c.strokeStyle='#c7b58370';c.lineWidth=1;c.beginPath();c.moveTo(x,probe.bounds.max.y+4);c.lineTo(x,WORLD.bottom-8);c.stroke();c.setLineDash([]);c.drawImage(sprite(this.data.byId.get(supply.current)),x-r,y-r,r*2,r*2);c.restore();}
    this.effects=this.effects.filter(e=>game.time-e.at<850);for(const e of this.effects){const t=(game.time-e.at)/850;c.globalAlpha=1-t;c.fillStyle=e.color;c.font='bold 18px sans-serif';c.textAlign='center';c.fillText(`+${e.score}`,e.x,e.y-24-t*35);c.strokeStyle=e.color;c.lineWidth=1;c.beginPath();c.arc(e.x,e.y,15+t*38,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    if(this.focus&&this.focus.until>performance.now()){const b=game.blocks.find(b=>b.id===this.focus.id);if(b){const item=this.data.byId.get(b.itemId);c.font='12px sans-serif';c.textAlign='center';c.fillStyle='#f1dfb8';c.fillText(item.name,b.position.x,b.bounds.min.y-10);}}
  }
}
