(function(root){
  'use strict';
  const D=root.XTD || require('./data.js');
  const {buildings:B,waves:W,artifacts:A}=D;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  class Game {
    constructor(seed=Date.now()) {
      this.version=D.VERSION; this.seed=seed>>>0; this.rng=this.seed||1; this.time=0; this.wave=0; this.nextWave=60;
      this.resources={iron:1000,uranium:0,crystal:0,research:0}; this.buildings=[]; this.enemies=[]; this.rocks=[]; this.deposits=[];
      this.id=1; this.kills=0; this.leaks=0; this.status='playing'; this.paused=false; this.speed=1; this.unlocked={};
      this.owned=[]; this.equipped=[]; this.events=[]; this.weather=[]; this.pending=[]; this.revision=0; this.scanned=false;
      this.power={supply:0,demand:0,used:0}; this.stats={built:0,damage:0,earned:0}; this.pathCache=new Map();
      Object.entries(B).forEach(([k,b])=>{if(!b.research) this.unlocked[k+':1']=true;});
      this.generateMap(); this.recalculate();
    }
    random(){let t=this.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);this.rng>>>=0;return ((t^t>>>14)>>>0)/4294967296;}
    generateMap(){
      const slots=[{x:0,y:2},{x:5,y:2},{x:0,y:5},{x:5,y:5},{x:0,y:8},{x:5,y:8}];
      for(let i=slots.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
      ['iron','iron','uranium','iron','uranium'].forEach((resource,i)=>{
        for(let dx=0;dx<2;dx++) this.deposits.push({x:slots[i].x+dx,y:slots[i].y,resource,deep:i>=3});
      });
      const candidates=[];
      for(let y=2;y<10;y++)for(const x of [0,1,5,6])if(!this.depositAt(x,y))candidates.push({x,y});
      for(let n=0;n<2;n++){const i=Math.floor(this.random()*candidates.length);this.rocks.push(candidates.splice(i,1)[0]);}
      this.pickup={x:3,y:7,artifact:A[Math.floor(this.random()*4)].id};
    }
    emit(type,data={}){this.events.push({type,time:this.time,...data});if(this.events.length>100)this.events.shift();}
    has(id){return this.equipped.includes(id);}
    def(b){return B[b.type];}
    maxHP(b){return this.def(b).hp[b.level-1]*(this.has('bolt')?1.25:1);}
    capacity(){return 5000+this.buildings.filter(b=>b.type==='storage').reduce((s,b)=>s+(b.level===1?2000:5000),0);}
    add(resource,amount){const cap=resource==='research'?1e9:this.capacity();this.resources[resource]=clamp(this.resources[resource]+amount,0,cap);}
    depositAt(x,y){return this.deposits.find(d=>d.x===x&&d.y===y);}
    buildingAt(x,y){return this.buildings.find(b=>b.x===x&&b.y===y);}
    center(b){return {x:b.x+.5,y:b.y+.5};}
    touchMap(){this.revision++;this.pathCache.clear();}
    canBuild(type,x,y){
      const def=B[type]; if(!def)return '알 수 없는 건물입니다.';
      if(this.status!=='playing')return '종료된 작전입니다.';
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>6||y<1||y>10)return '진입로와 최하단 방어선에는 설치할 수 없습니다.';
      if(!this.unlocked[type+':1'])return '연구소에서 먼저 해금하세요.';
      if(this.buildingAt(x,y)||this.rocks.some(r=>r.x===x&&r.y===y))return '이미 점유된 타일입니다.';
      if(this.pickup?.x===x&&this.pickup?.y===y)return '먼저 보급품을 회수하세요.';
      const d=this.depositAt(x,y);
      if(type==='mine'&&(!d||(d.deep&&!this.scanned)))return '발견된 철 또는 우라늄 광맥에 설치하세요.';
      if(type!=='mine'&&d&&(!d.deep||this.scanned))return '광맥은 채굴기를 위해 비워두세요.';
      if(this.enemies.some(e=>Math.abs(e.x-(x+.5))<(e.size==='large'?1.45:.75)&&Math.abs(e.y-(y+.5))<(e.size==='large'?1.45:.75)))return '적이 지나가는 위치입니다.';
      if(this.resources.iron<def.cost[0])return '철이 부족합니다.';
      return '';
    }
    build(type,x,y){const error=this.canBuild(type,x,y);if(error)return {error};
      const b={id:this.id++,type,x,y,level:1,hp:B[type].hp[0]*(this.has('bolt')?1.25:1),invested:B[type].cost[0],cooldown:0,disabledUntil:0,angle:-Math.PI/2,powered:false};
      this.resources.iron-=b.invested; this.buildings.push(b); this.stats.built++;this.touchMap();this.recalculate();this.emit('build',{x:x+.5,y:y+.5});return {building:b};
    }
    research(type,level=1){
      const d=B[type];if(this.status!=='playing')return {error:'종료된 작전입니다.'};
      if(!d||level<1||level>d.cost.length||!Number.isInteger(level))return {error:'잘못된 연구입니다.'};
      if(this.unlocked[type+':'+level])return {error:'이미 완료된 연구입니다.'};
      if(!this.buildings.some(b=>b.type==='lab'&&b.powered))return {error:'작동 중인 연구소가 필요합니다.'};
      if(level>1&&!this.unlocked[type+':'+(level-1)])return {error:'이전 단계 연구가 필요합니다.'};
      const cost=level===1?(d.research||0):100;
      if(this.resources.research<cost)return {error:'연구 점수가 부족합니다.'};
      this.resources.research-=cost;this.unlocked[type+':'+level]=true;this.emit('research',{name:d.name,level});return {};
    }
    upgradeCost(b){return Math.ceil((this.def(b).cost[b.level]||0)*(this.has('blueprint')&&this.def(b).damage?.length? .95:1));}
    upgrade(id){
      const b=this.buildings.find(b=>b.id===id);if(!b||this.status!=='playing')return {error:'건물을 찾을 수 없습니다.'};
      const d=this.def(b); if(b.level===d.cost.length)return {error:'최고 레벨입니다.'};
      if(!this.unlocked[b.type+':'+(b.level+1)])return {error:'다음 레벨 연구를 먼저 완료하세요.'};
      const cost=this.upgradeCost(b);if(this.resources.iron<cost)return {error:'철이 부족합니다.'};
      const ratio=b.hp/this.maxHP(b);this.resources.iron-=cost;b.invested+=cost;b.level++;b.hp=this.maxHP(b)*ratio;
      this.recalculate();this.emit('build',{x:b.x+.5,y:b.y+.5});return {};
    }
    repairCost(b){return Math.max(0,Math.ceil(Math.max(0,.9-b.hp/this.maxHP(b))*b.invested-1e-9));}
    repair(id){const b=this.buildings.find(b=>b.id===id);if(!b||this.status!=='playing')return {error:'건물을 찾을 수 없습니다.'};
      const cost=this.repairCost(b);if(cost<=0)return {error:'HP가 이미 90% 이상입니다.'};if(this.resources.iron<cost)return {error:'철이 부족합니다.'};
      this.resources.iron-=cost;b.hp=this.maxHP(b)*.9;return {};
    }
    salvage(b){return Math.floor(b.invested*clamp(b.hp/this.maxHP(b),0,1)*(this.has('insurance')?.9:.7));}
    demolitionImpact(b){const capacity=this.capacity()-(b.type==='storage'?(b.level===1?2000:5000):0),amount=this.salvage(b);return {amount,capacity,received:Math.max(0,Math.min(amount,capacity-this.resources.iron)),lost:Object.fromEntries(['iron','uranium','crystal'].map(k=>[k,Math.max(0,this.resources[k]-capacity)]))};}
    demolish(id,quoted){const b=this.buildings.find(b=>b.id===id);if(!b||this.status!=='playing')return {error:'이미 철거되거나 파괴된 건물입니다.'};
      const amount=this.salvage(b);if(amount!==quoted)return {error:'HP가 변해 회수량이 변경되었습니다. 금액을 다시 확인하세요.',quote:amount};
      const impact=this.demolitionImpact(b);this.removeBuilding(b);this.add('iron',amount);this.recalculate();return impact;
    }
    removeBuilding(b){this.buildings=this.buildings.filter(v=>v.id!==b.id);this.touchMap();for(const k of ['iron','uranium','crystal'])this.resources[k]=Math.min(this.resources[k],this.capacity());}
    powerRadius(b){return b.type==='relay'?(b.level===2?3:2):2;}
    recalculate(dt=0){
      for(const b of this.buildings){b.powered=false;b.reason='';}
      const nodes=this.buildings.filter(b=>['solar','reactor','relay'].includes(b.type)&&b.disabledUntil<=this.time);
      const groups=[];const visited=new Set();
      for(const node of nodes){if(visited.has(node.id))continue;const group={nodes:[],supply:0,used:0};const q=[node];visited.add(node.id);
        while(q.length){const n=q.shift();group.nodes.push(n);for(const other of nodes)if(!visited.has(other.id)&&dist(n,other)<=Math.min(this.powerRadius(n),this.powerRadius(other))+.001){visited.add(other.id);q.push(other);}}
        for(const n of group.nodes){if(n.type==='solar'){group.supply+=30;n.powered=true;}
          if(n.type==='reactor'){if(this.resources.uranium>=Math.max(dt*10,.001)){group.supply+=60;n.powered=true;this.resources.uranium-=dt*10;}else n.reason='우라늄 부족';}}
        for(const n of group.nodes)if(n.type==='relay'){n.powered=group.supply>0;n.reason=n.powered?'':'발전기 연결 필요';}groups.push(group);
      }
      let demand=0;const order={mine:0,lab:1,scanner:2,shield:3,market:4};
      const consumers=[...this.buildings].sort((a,b)=>(order[a.type]??5)-(order[b.type]??5)||a.id-b.id);
      for(const b of consumers){const d=this.def(b),need=d.power[b.level-1]*(this.has('battery')?.95:1);demand+=need;
        if(b.disabledUntil>this.time){b.powered=false;b.reason='유성 피격 · 복구 중';continue;}
        if(['solar','reactor','relay'].includes(b.type))continue;
        if(!need){b.powered=true;continue;}
        const connected=groups.filter(g=>g.nodes.some(n=>dist(n,b)<=this.powerRadius(n)+.001));
        const group=connected.find(g=>g.supply-g.used>=need-1e-9);
        if(group){group.used+=need;b.powered=true;}else b.reason=connected.some(g=>g.supply>0)?'전력 공급 부족':'전력망 연결 필요';
      }
      this.power={supply:groups.reduce((s,g)=>s+g.supply,0),used:groups.reduce((s,g)=>s+g.used,0),demand};
      if(this.buildings.some(b=>b.type==='scanner'&&b.powered))this.scanned=true;
    }
    marketOnline(){return this.buildings.some(b=>b.type==='market'&&b.powered);}
    trade(resource,buy){if(!this.marketOnline()||this.status!=='playing')return {error:'작동 중인 마켓이 필요합니다.'};if(!['iron','uranium'].includes(resource))return {error:'거래 불가 자원입니다.'};
      const price=resource==='iron'?(buy?50:35):(buy?25:17),from=buy?'crystal':resource,to=buy?resource:'crystal',cost=buy?price:100,gain=buy?100:price;
      if(this.resources[from]<cost)return {error:'거래 자원이 부족합니다.'};if(this.resources[to]+gain>this.capacity())return {error:'보유 한도가 부족합니다. 창고를 확장하세요.'};
      this.resources[from]-=cost;this.add(to,gain);return {};
    }
    buyArtifact(id){const a=A.find(a=>a.id===id);if(!a||!this.marketOnline()||this.status!=='playing')return {error:'작동 중인 마켓이 필요합니다.'};
      if(this.owned.includes(id))return {error:'이미 보유 중입니다.'};if(this.resources.crystal<a.price)return {error:'결정이 부족합니다.'};this.resources.crystal-=a.price;this.owned.push(id);return {};
    }
    sellArtifact(id){const a=A.find(a=>a.id===id);if(!a||!this.marketOnline()||!this.owned.includes(id)||this.status!=='playing')return {error:'판매할 수 없습니다.'};
      if(this.resources.crystal+Math.floor(a.price*.5)>this.capacity())return {error:'결정 보유 한도가 부족합니다.'};
      if(this.has(id))this.equip(id);this.owned=this.owned.filter(v=>v!==id);this.add('crystal',Math.floor(a.price*.5));return {};
    }
    equip(id){if(!this.owned.includes(id)||this.status!=='playing')return {error:'보유하지 않은 아티펙트입니다.'};
      const removing=this.has(id);if(!removing&&this.equipped.length>=3)return {error:'슬롯 3개가 가득 찼습니다. 먼저 하나를 해제하세요.'};
      const ratios=this.buildings.map(b=>[b,b.hp/this.maxHP(b)]);
      this.equipped=removing?this.equipped.filter(v=>v!==id):[...this.equipped,id];
      for(const [b,ratio]of ratios)b.hp=this.maxHP(b)*ratio;this.recalculate();return {};
    }
    collect(){if(!this.pickup||this.status!=='playing')return {error:'회수할 보급품이 없습니다.'};const id=this.pickup.artifact;if(!this.owned.includes(id))this.owned.push(id);this.pickup=null;if(this.equipped.length<3&&!this.has(id))this.equip(id);return {artifact:A.find(a=>a.id===id)};}
    startWave(){if(this.wave>=30||this.status!=='playing')return false;
      this.wave++;this.nextWave=this.time+60;const def=W[this.wave-1];
      for(let i=0;i<def.count;i++)this.pending.push({at:this.time+i*.5,wave:this.wave});
      if(this.has('bank'))for(const r of ['iron','uranium','crystal'])this.add(r,Math.floor(this.resources[r]*.05));
      if(this.has('repair'))for(const b of this.buildings)b.hp=Math.min(this.maxHP(b),b.hp+this.maxHP(b)*.1);
      if([5,15,25].includes(this.wave))for(let i=1;i<=4;i++)this.weather.push({kind:'meteor',at:this.time+15*i});
      if([9,19,29].includes(this.wave))this.weather.push({kind:'acid',at:this.time,end:this.time+60});
      this.emit('wave',{wave:this.wave,name:def.name,boss:def.boss});return true;
    }
    launchEarly(){if(this.pending.length||this.enemies.length)return {error:'현재 웨이브를 먼저 정리하세요.'};if(this.wave>=30)return {error:'마지막 웨이브입니다.'};return this.startWave()?{}:{error:'작전을 시작할 수 없습니다.'};}
    spawn(wave){const d=W[wave-1];const e={id:this.id++,wave,x:d.size==='large'?3:3.5,y:-.8,hp:d.hp,maxHP:d.hp,size:d.size,boss:d.boss,damage:d.damage,reward:d.reward,cooldown:0,slowUntil:0,slow:1,stunUntil:0,burnUntil:0,burn:0,angle:Math.PI/2,path:[],pathRevision:-1};this.enemies.push(e);return e;}
    grid(size){if(size==='small')return {cols:13,rows:23,step:.5,offset:.5};if(size==='large')return {cols:6,rows:11,step:1,offset:1};return {cols:7,rows:12,step:1,offset:.5};}
    blockers(x,y,size){const half=size==='large'?.97:size==='small'?.1:.34;
      const rocks=this.rocks.filter(r=>Math.abs(x-r.x-.5)<.49+half&&Math.abs(y-r.y-.5)<.49+half);
      const buildings=this.buildings.filter(b=>!this.def(b).trap&&Math.abs(x-b.x-.5)<(size==='small'?.34:.49)+half&&Math.abs(y-b.y-.5)<(size==='small'?.34:.49)+half);
      return {rocks,buildings};
    }
    field(size){const key=size+':'+this.revision;if(this.pathCache.has(key))return this.pathCache.get(key);
      const g=this.grid(size),N=g.cols*g.rows,blocked=Array.from({length:N},(_,i)=>this.blockers((i%g.cols)*g.step+g.offset,Math.floor(i/g.cols)*g.step+g.offset,size));
      const costs=new Float64Array(N).fill(Infinity),next=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
      for(let x=0;x<g.cols;x++){const i=(g.rows-1)*g.cols+x;if(!blocked[i].rocks.length)costs[i]=blocked[i].buildings.length*10000;}
      for(let pass=0;pass<N;pass++){
        let u=-1,min=Infinity;for(let i=0;i<N;i++)if(!closed[i]&&costs[i]<min){u=i;min=costs[i];}if(u<0)break;closed[u]=1;
        const x=u%g.cols,y=Math.floor(u/g.cols);
        for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=g.cols||ny<0||ny>=g.rows)continue;const v=ny*g.cols+nx;if(blocked[v].rocks.length)continue;
          const cost=min+g.step+blocked[u].buildings.length*10000;if(cost<costs[v]){costs[v]=cost;next[v]=u;}}
      }
      const field={...g,costs,next,blocked};this.pathCache.set(key,field);return field;
    }
    route(e){const f=this.field(e.size);const gx=clamp(Math.round((e.x-f.offset)/f.step),0,f.cols-1),gy=clamp(Math.round((e.y-f.offset)/f.step),0,f.rows-1);let i=gy*f.cols+gx;const path=[];
      if(!Number.isFinite(f.costs[i]))return [];
      for(let count=0;count<f.cols*f.rows;count++){path.push({x:(i%f.cols)*f.step+f.offset,y:Math.floor(i/f.cols)*f.step+f.offset});if(f.next[i]===-1)break;i=f.next[i];}
      const last=path[path.length-1];if(last&&last.y>=f.offset+(f.rows-1)*f.step-.01)path.push({x:last.x,y:13});return path;
    }
    moveEnemy(e,dt){
      e.cooldown=Math.max(0,e.cooldown-dt);if(e.burnUntil>this.time)this.hit(e,e.burn*dt);
      if(e.hp<=0||e.stunUntil>this.time)return;
      if(e.pathRevision!==this.revision||!e.path.length){e.path=this.route(e);e.pathRevision=this.revision;}
      let target=e.path[0];if(!target)return;
      const block=this.blockers(target.x,target.y,e.size).buildings[0];
      if(block){const range=e.size==='large'?1.7:.9;if(dist(e,this.center(block))<=range){
        if(e.cooldown<=0){block.hp-=e.damage;e.cooldown=.5;this.emit('impact',{x:block.x+.5,y:block.y+.5,color:'#e8ad6d'});}return;
      }}
      const dx=target.x-e.x,dy=target.y-e.y,length=Math.hypot(dx,dy),travel=.5*dt*(e.slowUntil>this.time?e.slow:1);
      if(length<=travel){e.x=target.x;e.y=target.y;e.path.shift();}else{e.x+=dx/length*travel;e.y+=dy/length*travel;}if(length>.001)e.angle=Math.atan2(dy,dx);
      if(e.y>=12.5){e.escaped=true;this.leaks++;this.emit('leak',{x:e.x,y:11.8});if(this.leaks>=20){this.status='lost';this.emit('end',{status:'lost'});}}
    }
    hit(e,damage){if(e.hp<=0||e.escaped)return;e.hp-=damage;this.stats.damage+=damage;if(e.hp<=0){this.kills++;const reward=Math.floor(e.reward*(this.has('magnet')?1.1:1));this.add('crystal',reward);this.stats.earned+=reward;this.emit('death',{x:e.x,y:e.y,size:e.size});}}
    protected(b,kind){return this.buildings.some(s=>s.type==='shield'&&s.powered&&(kind==='meteor'||s.level>=2)&&dist(s,b)<=2+.001);}
    updateWeather(dt){
      for(const weather of this.weather){if(weather.kind==='meteor'&&weather.at<=this.time){const x=Math.floor(this.random()*7),y=Math.floor(this.random()*12);for(const b of this.buildings)if(Math.abs(b.x-x)+Math.abs(b.y-y)<=1&&!this.protected(b,'meteor'))b.disabledUntil=Math.max(b.disabledUntil,this.time+5);weather.done=true;this.emit('meteor',{x:x+.5,y:y+.5});}
        if(weather.kind==='acid'&&weather.at<=this.time&&weather.end>this.time)for(const b of this.buildings)if(!this.protected(b,'acid'))b.hp-=this.maxHP(b)*.01*dt;
      }this.weather=this.weather.filter(w=>!w.done&&(w.kind!=='acid'||w.end>this.time));
    }
    fire(b,dt){const d=this.def(b);b.cooldown=Math.max(0,b.cooldown-dt);if(!b.powered||!d.damage||b.cooldown>0)return;
      const p=this.center(b),range=d.range*(this.has('lens')?1.1:1),targets=this.enemies.filter(e=>e.hp>0&&!e.escaped&&dist(p,e)<=range+(e.size==='large'?.6:0)).sort((a,b)=>b.y-a.y);
      if(!targets.length)return;const target=targets[0];b.angle=Math.atan2(target.y-p.y,target.x-p.x);
      const damage=d.damage[b.level-1]*(this.has('ammo')?1.05:1);let hit=[target];
      if(d.splash)hit=this.enemies.filter(e=>e.hp>0&&dist(e,target)<=d.splash);
      if(d.cone)hit=targets.filter(e=>{const a=Math.atan2(e.y-p.y,e.x-p.x)-b.angle;return Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<=Math.PI/12;});
      if(d.trap)hit=targets;
      for(const e of hit){this.hit(e,damage);if(b.type==='flame'){e.burnUntil=this.time+5;e.burn=Math.max(e.burn,damage);}
        if(b.type==='frost'){e.slowUntil=this.time+5;e.slow=1-(.2+.1*b.level);}
        if(b.type==='shock'&&this.random()<b.level*.1)e.stunUntil=this.time+1;
      }
      b.cooldown=d.interval/(this.has('fan')?1.05:1);this.emit('shot',{x:p.x,y:p.y,tx:target.x,ty:target.y,weapon:b.type,color:d.color});
    }
    tick(dt){if(this.status!=='playing'||this.paused||!Number.isFinite(dt)||dt<=0)return;this.time+=dt;
      if(this.wave<30&&this.time>=this.nextWave)this.startWave();
      const spawning=this.pending.filter(p=>p.at<=this.time);this.pending=this.pending.filter(p=>p.at>this.time);for(const p of spawning)this.spawn(p.wave);
      this.recalculate(dt);this.updateWeather(dt);
      for(const b of [...this.buildings]){if(b.hp<=0){this.emit('destroy',{x:b.x+.5,y:b.y+.5});this.removeBuilding(b);continue;}
        if(b.powered){if(b.type==='mine'){const deposit=this.depositAt(b.x,b.y);if(deposit&&(!deposit.deep||(this.scanned&&b.level>=2)))this.add(deposit.resource,this.def(b).rate[b.level-1]*dt);}
          if(b.type==='lab')this.add('research',this.def(b).rate[b.level-1]*dt);this.fire(b,dt);}
      }
      for(const e of this.enemies){if(this.status!=='playing')break;if(e.hp>0&&!e.escaped)this.moveEnemy(e,dt);}
      this.enemies=this.enemies.filter(e=>e.hp>0&&!e.escaped);
      for(const b of [...this.buildings])if(b.hp<=0){this.emit('destroy',{x:b.x+.5,y:b.y+.5});this.removeBuilding(b);}
      if(this.wave===30&&!this.pending.length&&!this.enemies.length&&this.status==='playing'){this.status='won';this.emit('end',{status:'won'});}
    }
    serialize(){const {pathCache,events,...state}=this;return JSON.stringify(state);}
    static restore(text){const s=JSON.parse(text);if(s.version!==D.VERSION||!Number.isFinite(s.time)||s.time<0||!Number.isInteger(s.wave)||s.wave<0||s.wave>30||!Array.isArray(s.buildings)||!Array.isArray(s.enemies)||!s.resources)throw new Error('저장 데이터 형식이 올바르지 않습니다.');
      for(const k of ['iron','uranium','crystal','research'])if(!Number.isFinite(s.resources[k])||s.resources[k]<0)throw new Error('자원 데이터 오류');
      for(const b of s.buildings)if(!B[b.type]||!Number.isInteger(b.level)||b.level<1||b.level>B[b.type].cost.length||!Number.isFinite(b.hp)||b.hp<=0)throw new Error('건물 데이터 오류');
      for(const key of ['weather','pending','rocks','deposits','owned','equipped'])if(!Array.isArray(s[key]))throw new Error('저장 데이터 누락');
      const game=new Game(s.seed);Object.assign(game,s);game.events=[];game.pathCache=new Map();game.paused=true;game.recalculate();return game;
    }
  }
  D.Game=Game;D.dist=dist;D.clamp=clamp;if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
