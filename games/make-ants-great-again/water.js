(function(G){
  'use strict';
  class WaterPhysics {
    constructor(sim,C){
      this.sim=sim;this.C=C;this.quantum=1/16;this.radius=C.CELL*Math.sqrt(this.quantum/Math.PI);
      this.sub=12;this.size=C.CELL/this.sub;this.width=1;this.height=1;this.originX=0;this.originY=0;
      this.mask=new Uint8Array(1);this.depth=new Float32Array(1);this.active=[];this.byTile=[];this.totals=new Float64Array(sim.tiles.length);this.geometry=null;
    }
    radiusOf(drop){return this.C.CELL*Math.sqrt(drop.volume/Math.PI);}
    prepare(){
      const s=this.sim,C=this.C,signature=s.tiles.map(t=>t.open?`${t.index}:${t.room??t.cave??''}`:'').join('|');
      if(this.totals.length!==s.tiles.length){const totals=new Float64Array(s.tiles.length);totals.set(this.totals);this.totals=totals;}
      if(signature!==this.geometry){
        this._pools=null;
        if(this.geometry!==null)for(const p of s.waterDrops){delete p.poolGroup;delete p.poolBounds;}
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const t of s.tiles)if(t.open&&t.y>C.SURFACE){minX=Math.min(minX,t.x);maxX=Math.max(maxX,t.x);minY=Math.min(minY,t.y);maxY=Math.max(maxY,t.y);}
        if(!Number.isFinite(minX)){minX=maxX=0;minY=maxY=C.SURFACE+1;}
        this.originX=(minX-1)*C.CELL;this.originY=(minY-1)*C.CELL;this.width=(maxX-minX+3)*this.sub;this.height=(maxY-minY+3)*this.sub;
        this.geometry=signature;this.mask=new Uint8Array(this.width*this.height);this.depth=new Float32Array(this.mask.length);this.active=[];this.byTile=Array.from({length:s.tiles.length},()=>[]);
        for(const t of s.tiles){
          if(t.y<=C.SURFACE||(!t.open&&!s.neighbors(t).some(n=>n.open&&n.y>C.SURFACE)))continue;
          for(let sy=0;sy<this.sub;sy++)for(let sx=0;sx<this.sub;sx++){
            const x=(t.x-minX+1)*this.sub+sx,y=(t.y-minY+1)*this.sub+sy,k=y*this.width+x;
            if(x>=0&&x<this.width&&y>=0&&y<this.height&&s.groundContains(this.originX+(x+.5)*this.size,this.originY+(y+.5)*this.size)){this.mask[k]=1;this.depth[k]=10000;this.active.push(k);this.byTile[t.index].push(k);}
          }
        }
        this.active.sort((a,b)=>a-b);
        const d=this.depth,w=this.width;
        for(const k of this.active)d[k]=Math.min(d[k],(d[k-1]??0)+1,(d[k-w]??0)+1,(d[k-w-1]??0)+Math.SQRT2,(d[k-w+1]??0)+Math.SQRT2);
        for(let i=this.active.length-1;i>=0;i--){const k=this.active[i];d[k]=Math.min(d[k],(d[k+1]??0)+1,(d[k+w]??0)+1,(d[k+w-1]??0)+Math.SQRT2,(d[k+w+1]??0)+Math.SQRT2);}
      }
      for(const p of s.waterDrops){p.id??=s.uid('w');p.vx??=0;p.vy??=0;p.age??=0;p.seek??=0;}
      let imported=false;
      for(const t of s.tiles)if(Math.abs(t.water-this.totals[t.index])>1e-8){
        s.waterDrops=s.waterDrops.filter(p=>s.at(p)?.index!==t.index);
        this.seed(t,Math.max(0,t.water));imported=true;
      }
      if(imported)this.syncTiles();
    }
    distance(x,y){
      const fx=(x-this.originX)/this.size-.5,fy=(y-this.originY)/this.size-.5,ix=Math.floor(fx),iy=Math.floor(fy),ax=fx-ix,ay=fy-iy;
      const sample=(xx,yy)=>xx<0||xx>=this.width||yy<0||yy>=this.height?0:this.depth[yy*this.width+xx];
      return ((sample(ix,iy)*(1-ax)+sample(ix+1,iy)*ax)*(1-ay)+(sample(ix,iy+1)*(1-ax)+sample(ix+1,iy+1)*ax)*ay-.5)*this.size;
    }
    add(x,y,volume=this.quantum,vx=0,vy=0){
      const p={id:this.sim.uid('w'),x,y,vx,vy,volume,age:0,grounded:false,settled:false,pooled:false,seek:0,downhill:0};this.sim.waterDrops.push(p);return p;
    }
    seed(tile,volume){
      const spots=(this.byTile[tile.index]??[]).map(k=>({x:this.originX+(k%this.width+.5)*this.size,y:this.originY+(Math.floor(k/this.width)+.5)*this.size})).filter(p=>this.distance(p.x,p.y)>=this.radius*.8).sort((a,b)=>b.y-a.y||a.x-b.x);
      if(!spots.length)return;
      const occupied=[];
      while(volume>1e-8){
        const p=spots.find(p=>occupied.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>this.radius*1.7))??spots[occupied.length%spots.length];
        this.add(p.x,p.y,Math.min(this.quantum,volume));occupied.push(p);volume-=Math.min(this.quantum,volume);
      }
    }
    syncTiles(){
      this._pools=null;
      this.totals.fill(0);for(const p of this.sim.waterDrops){const t=this.sim.at(p);if(t)this.totals[t.index]+=p.volume;}
      for(const t of this.sim.tiles)t.water=this.totals[t.index];
    }
    poolGeometry(){
      if(this._pools)return this._pools;
      // Display pooling is latched separately from momentary collision speeds.
      // Fixed anchors keep a resting pool's outline and waterline stable.
      const drops=this.sim.waterDrops.filter(p=>p.pooled??(p.settled&&(p.poolRest??.2)>=.2&&Math.hypot(p.vx,p.vy)<12)),bins=new Map(),binSize=this.radius*4,parent=drops.map((_,i)=>i),previousGroups=new Map();
      const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
      // A connected pool does not split when its particles shuffle or evaporate.
      for(let i=0;i<drops.length;i++){const group=drops[i].poolGroup;if(!group)continue;if(previousGroups.has(group))parent[root(i)]=root(previousGroups.get(group));else previousGroups.set(group,i);}
      // Only touching, resting particles in the same cavity form a pool.
      for(let i=0;i<drops.length;i++){
        const p=drops[i],bx=Math.floor(p.x/binSize),by=Math.floor(p.y/binSize);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const j of bins.get(`${bx+dx},${by+dy}`)??[]){
          const q=drops[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d>this.radiusOf(p)+this.radiusOf(q)+this.size*1.5)continue;
          const steps=Math.max(1,Math.ceil(d/this.size));let connected=true;
          for(let k=1;k<steps;k++)if(!this.sim.groundContains(p.x+(q.x-p.x)*k/steps,p.y+(q.y-p.y)*k/steps)){connected=false;break;}
          if(connected)parent[root(i)]=root(j);
        }
        const key=`${bx},${by}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);
      }
      const groups=new Map();for(let i=0;i<drops.length;i++){const key=root(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(drops[i]);}
      const pools=[];
      for(const particles of groups.values()){
        const left=Math.min(...particles.map(p=>(p.poolX??p.x)-this.radiusOf(p))),right=Math.max(...particles.map(p=>(p.poolX??p.x)+this.radiusOf(p))),bottom=Math.max(...particles.map(p=>(p.poolY??p.y)+this.radiusOf(p)))+this.size*2;
        const minColumn=Math.max(0,Math.floor((left-this.originX)/this.size)),maxColumn=Math.min(this.width-1,Math.floor((right-this.originX)/this.size));
        const bottomRow=Math.min(this.height-1,Math.floor((bottom-this.originY)/this.size)),area=particles.reduce((n,p)=>n+p.volume*this.C.CELL**2,0);
        let remaining=area,level=bottom;
        // Fill the actual cavity below one horizontal plane, conserving the
        // resting particles' area instead of drawing their circular outlines.
        for(let row=bottomRow;row>=0&&remaining>1e-8;row--){
          const y=this.originY+row*this.size,height=Math.min(this.size,bottom-y);let width=0;
          for(let col=minColumn;col<=maxColumn;col++)if(this.mask[row*this.width+col]){const x=this.originX+col*this.size;width+=Math.max(0,Math.min(right,x+this.size)-Math.max(left,x));}
          if(width&&remaining<=width*height){level=y+height-remaining/width;remaining=0;break;}remaining-=width*height;
        }
        if(remaining<=1e-8){
          const pool={left,right,bottom,level,area,dropIds:particles.map(p=>p.id)};pools.push(pool);
          const group=particles.map(p=>p.id).sort()[0];for(const p of particles){p.poolGroup=group;p.poolBounds={left,right,bottom,level};}
        }
      }
      this._pools=pools;return pools;
    }
    surface(x,y){
      const candidates=this.poolGeometry().filter(p=>x>=p.left&&x<=p.right&&y>=p.level-this.C.CELL&&y<=p.bottom+this.C.CELL&&this.sim.groundContains(x,p.level+.5)).sort((a,b)=>Math.abs(a.level-y)-Math.abs(b.level-y));
      return candidates[0]?.level??null;
    }
    wall(p){
      const r=this.radiusOf(p),depth=this.distance(p.x,p.y);if(depth>=r)return;
      const e=this.size*.55,nx=this.distance(p.x+e,p.y)-this.distance(p.x-e,p.y),ny=this.distance(p.x,p.y+e)-this.distance(p.x,p.y-e),length=Math.hypot(nx,ny);
      if(length>.001){p.x+=nx/length*(r-depth);p.y+=ny/length*(r-depth);if(ny/length<-.3)p.grounded=true;}
      else{
        // Recover an old save or newly changed tunnel edge to its nearest cavity.
        const ix=Math.floor(p.x/this.size),iy=Math.floor(p.y/this.size);
        for(let ring=1;ring<20;ring++)for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
          const x=(ix+dx+.5)*this.size,y=(iy+dy+.5)*this.size;if(this.distance(x,y)>=r){p.x=x;p.y=y;return;}
        }
      }
    }
    downhill(p){
      const r=this.radiusOf(p),reach=p.supported?this.C.CELL*2:this.width*this.size;
      const floor=(x,y)=>{
        let depth=this.C.CELL;for(let d=2;d<=this.C.CELL;d+=3)if(this.distance(x,y+d)<r){depth=d;break;}
        if(this.bins){const bx=Math.floor(x/this.binSize),by=Math.floor(y/this.binSize);
          for(let dy=0;dy<=4;dy++)for(let dx=-1;dx<=1;dx++)for(const i of this.bins.get(`${bx+dx},${by+dy}`)??[]){
            const q=this.sim.waterDrops[i];if(q&&q!==p&&q.y>y+r*.7&&Math.abs(q.x-x)<r*.95)depth=Math.min(depth,Math.max(0,q.y-y-(r+this.radiusOf(q))*.94));
          }
        }return depth;
      };
      const current=floor(p.x,p.y);let direction=0,best=current+3;
      for(const dir of [-1,1])for(let dx=4;dx<=reach;dx+=4){
        const x=p.x+dir*dx;if(this.distance(x,p.y)<r-.6)break;
        const depth=floor(x,p.y);if(depth>best){best=depth;direction=dir;}if(depth===this.C.CELL)break;
      }return direction;
    }
    rain(dt){
      const s=this.sim,C=this.C;
      if(s.rainLeft<=0){s.rainDripClock=0;return;}
      s.rainDripClock+=Math.min(dt,s.rainLeft);s.rainLeft=Math.max(0,s.rainLeft-dt);
      while(s.rainDripClock>=.5-1e-9){s.rainDripClock-=.5;
        for(const t of s.tiles)if(t.y===C.SURFACE+1&&t.open)this.add((t.x+.5)*C.CELL+(s.random()-.5)*C.CELL*.35,(C.SURFACE+1)*C.CELL+this.radius+1,this.quantum,(s.random()-.5)*12,10);
      }
    }
    updatePoolState(p,dt){
      const r=this.radiusOf(p),speed=Math.hypot(p.vx,p.vy);
      if(p.pooled){
        const bounds=p.poolBounds??{left:p.poolX-r,right:p.poolX+r,bottom:p.poolY+r+this.size*2,level:p.poolY-r};
        const outward=(p.x<bounds.left-r*.5&&p.vx<-2)||(p.x>bounds.right+r*.5&&p.vx>2)||(p.y>bounds.bottom+r*.5&&p.vy>2)||(p.y<bounds.level-r*3&&p.vy<-2);
        const invalid=!this.sim.groundContains(p.poolX,p.poolY);
        // Jostling anywhere inside the pool does not turn it into droplets.
        p.poolFlow=outward&&speed>2?(p.poolFlow??0)+dt:0;
        if(invalid||p.poolFlow>=.12){p.pooled=false;p.poolRest=0;delete p.poolX;delete p.poolY;delete p.poolBounds;delete p.poolGroup;p.poolFlow=0;}
      }else if(p.settled&&p.poolRest>=.35){
        p.pooled=true;p.poolX=p.x;p.poolY=p.y;p.poolFlow=0;
      }
    }
    step(dt){
      this._pools=null;
      const s=this.sim,ps=s.waterDrops,origins=[],binSize=this.radius*2,bins=new Map();
      if(ps.some(p=>p.pooled))this.poolGeometry();
      this.binSize=binSize;
      for(const p of ps){
        origins.push({x:p.x,y:p.y,vy:p.vy,settled:p.settled});p.age+=dt;p.seek-=dt;
        if((p.grounded||p.supported)&&p.seek<=0){p.downhill=this.downhill(p);p.seek=.3;}
        if((p.grounded||p.supported)&&p.downhill)p.vx+=p.downhill*180*dt;
        p.vy=Math.min(220,p.vy+420*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.grounded=false;p.supported=false;
      }
      for(let pass=0;pass<5;pass++){
        bins.clear();
        for(let i=0;i<ps.length;i++){const p=ps[i],key=`${Math.floor(p.x/binSize)},${Math.floor(p.y/binSize)}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);}
        for(let i=0;i<ps.length;i++){
          const a=ps[i],bx=Math.floor(a.x/binSize),by=Math.floor(a.y/binSize);
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const j of bins.get(`${bx+dx},${by+dy}`)??[]){
            if(j<=i)continue;const b=ps[j],rx=b.x-a.x,ry=b.y-a.y,separation=(this.radiusOf(a)+this.radiusOf(b))*.94,d=Math.hypot(rx,ry);
            if(d<separation+.4){if(ry>separation*.3)a.supported=true;else if(ry<-separation*.3)b.supported=true;}
            if(d>=separation)continue;
            const nx=d>1e-5?rx/d:(i%2?1:-1),ny=d>1e-5?ry/d:0,shift=(separation-d)*.5;
            a.x-=nx*shift;a.y-=ny*shift;b.x+=nx*shift;b.y+=ny*shift;
          }
        }
        for(const p of ps)this.wall(p);
      }
      this.bins=bins;
      for(let i=0;i<ps.length;i++){
        const p=ps[i],o=origins[i],damping=(p.grounded||p.supported) ? .94 : .997;
        p.vx=Math.max(-100,Math.min(100,(p.x-o.x)/dt*damping));p.vy=Math.max(-220,Math.min(220,(p.y-o.y)/dt*damping));
        p.settled=!!(p.grounded||p.supported)&&Math.hypot(p.vx,p.vy)<28;
        p.poolRest=p.settled&&Math.hypot(p.vx,p.vy)<12?(p.poolRest??0)+dt:0;
        this.updatePoolState(p,dt);
        if(!o.settled&&p.settled&&o.vy>45){p.squash=.18;s.waterRipples.push({x:p.x,y:p.y-this.radiusOf(p),age:0});}
        p.squash=Math.max(0,(p.squash??0)-dt);
      }
    }
    evaporate(dt){
      const s=this.sim;if(!s.waterDrops.length){s.waterEvaporation=0;return;}
      s.waterEvaporation=(s.waterEvaporation??0)+dt/60;
      while(s.waterDrops.length){
        const i=s.waterDrops.findIndex(p=>p.volume<=s.waterEvaporation+1e-9);if(i<0)break;
        s.waterEvaporation=Math.max(0,s.waterEvaporation-s.waterDrops[i].volume);s.waterDrops.splice(i,1);
      }
    }
    update(dt){
      this.prepare();let left=dt;
      while(left>1e-8){const h=Math.min(1/90,left);this.rain(h);this.step(h);this.evaporate(h);for(const r of this.sim.waterRipples)r.age+=h;this.sim.waterRipples=this.sim.waterRipples.filter(r=>r.age<.65).slice(-60);left-=h;}
      this.syncTiles();
    }
    saved(){return this.sim.waterDrops.map(p=>({...p}));}
    load(state){
      if(state.waterModel==='particles-v1'&&Array.isArray(state.waterDrops)){
        for(const t of this.sim.tiles)this.totals[t.index]=t.water;
        this.prepare();this.syncTiles();
      }else{
        const falling=this.sim.waterDrops;this.sim.waterDrops=[];this.prepare();
        for(const p of falling){p.id??=this.sim.uid('w');p.age??=0;p.seek=0;this.sim.waterDrops.push(p);}
        this.syncTiles();
      }
    }
  }
  G.AntWaterPhysics=WaterPhysics;
  if(typeof module!=='undefined')module.exports=WaterPhysics;
})(globalThis);
