(function (G) {
  'use strict';
  const C = { CELL:38, PATH_WIDTH_RATIO:.8, W:34, H:58, SURFACE:4, GRASS_CELLS:2, TREE_X:8, TREE_WIDTH:10, TREE_ROOT:7, SAVE_VERSION:1, INITIAL_FOOD:0, EGG_SECONDS:120, FOOD_BUG_RADIUS:7, FOOD_BUG_LIMIT:5, FOOD_BUG_LIFE:120 };
  const ROOMS = {
    empty:{name:'빈방',color:'#ead6b1',description:'방을 지정하면 개미들이 목적에 맞게 이용합니다.'},
    queen:{name:'여왕개미실',color:'#d7ae7d',description:'여왕이 머무르고 알을 낳으며 휴식을 취하는 방입니다.'},
    food:{name:'음식 보관소',color:'#c4ae75',description:'모든 개미의 먹이를 보관합니다. 일꾼이 채집한 음식을 가져옵니다.'},
    egg:{name:'알 보관실',color:'#e8dcbd',description:'알이 이 방에서 2분을 보내면 애벌레가 됩니다.'},
    larva:{name:'애벌레실',color:'#e7ccae',description:'일꾼이 애벌레를 운반하고 먹이를 주며 돌봅니다. 이 방에 내려놓은 애벌레만 병정 또는 일꾼으로 성장시킬 수 있습니다.'},
    rest:{name:'휴식실',color:'#b5b88a',description:'에너지가 30 이하인 개미들이 쉬는 방입니다.'},
    aphid:{name:'진딧물사육실',color:'#a7bd82',description:'열매나무 주변의 진딧물을 데려와 기릅니다. 위생 30 이하이면 일꾼이 청소하며, 뿌리에서 5칸 이내인 방에서 건강한 진딧물의 단물을 얻습니다.'},
    mushroom:{name:'버섯재배실',color:'#b59d7c',description:'물에서 10칸 이내인 방에서 버섯을 재배하고 수확합니다.'},
    trash:{name:'쓰레기 처리실',color:'#a9a48c',description:'일꾼이 쓰레기와 시체를 모아 처리합니다.'},
    toilet:{name:'화장실',color:'#c8bba2',description:'식사 후 일꾼이 배설합니다. 생긴 쓰레기는 청소가 필요합니다.'},
    guard:{name:'경비실',color:'#bd9d7f',description:'전투 중이 아닌 병정이 머무는 방입니다.'}
  };
  const MAX_HP={queen:100,soldier:150,worker:100,egg:30,larva:60,aphid:30,enemy:70};
  const ROOM_PALETTE={queen:['#FFF0BE','#D9AD32'],food:['#FFE0B5','#F29B38'],egg:['#FFF9E5','#E8DCAF'],larva:['#FFE0ED','#EC91B9'],rest:['#E8E8ED','#9999AA'],aphid:['#F4D7F3','#C66BC6'],mushroom:['#EADDF8','#A276CE'],trash:['#D9D9DE','#74747F'],toilet:['#F5F5F5','#D0D0D8'],empty:['#F1EBD9','#C7BFA8'],guard:['#FAF4BD','#D9CF43']};
  for(const [type,[color,objectColor]] of Object.entries(ROOM_PALETTE))Object.assign(ROOMS[type],{color,objectColor});
  const ATTACK={queen:10,soldier:50,worker:20,enemy:12};
  // Body collision sizes leave room for two lanes inside an 8mm tunnel;
  // antennae and moving legs are visual details outside the body collider.
  const RADIUS={queen:8,worker:6,soldier:6.64,enemy:6.64,egg:4,larva:5.2,aphid:4};
  const isAdultAnt=entity=>['queen','worker','soldier','enemy'].includes(entity.type);
  const TASK_NAMES={eat:'음식 섭취',sleep:'휴식',clean:'청소',feed:'먹이 주기',carry:'운반',dig:'굴착',fill:'땅채우기',plant:'버섯 재배',tend:'진딧물 관리',harvest:'버섯 수확',honey:'단물 채취',forage:'외부 채집',toilet:'화장실',trash:'쓰레기 처리',fight:'전투',move:'이동',wander:'이동'};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const FRUIT_CROWN=[[0,-.79,1.05,.21],[-.58,-.70,.87,.16],[.58,-.70,.87,.16],[0,-.61,1.06,.16]];
  const FRUIT_OFFSETS=[[-.62,-.79],[-.25,-.91],[.26,-.89],[.73,-.76],[-1.05,-.69],[-.47,-.66],[.16,-.76],[1.02,-.65],[-.15,-.56],[.56,-.57]];
  const TREE_TOP=-C.CELL*16;
  function pathStrokeCells(from,to,sim=null){
    const radius=C.CELL*.25,dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy,hits=[];
    const bounds=sim?.viewBounds()??{minX:0,maxX:C.W-1,maxY:C.H-1};
    const left=Math.max(bounds.minX,Math.floor((Math.min(from.x,to.x)-radius)/C.CELL)),right=Math.min(bounds.maxX,Math.floor((Math.max(from.x,to.x)+radius)/C.CELL));
    const top=Math.max(0,Math.floor((Math.min(from.y,to.y)-radius)/C.CELL)),bottom=Math.min(bounds.maxY,Math.floor((Math.max(from.y,to.y)+radius)/C.CELL));
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const px=(x+.5)*C.CELL,py=(y+.5)*C.CELL,f=length2?clamp(((px-from.x)*dx+(py-from.y)*dy)/length2,0,1):0;
      if((px-from.x-f*dx)**2+(py-from.y-f*dy)**2<=radius*radius+1e-8)hits.push({index:sim?sim.index(x,y):y*C.W+x,f});
    }
    return hits.sort((a,b)=>a.f-b.f).map(hit=>hit.index);
  }
  const WaterPhysics=G.AntWaterPhysics??(typeof require==='function'?require('./water.js'):null);
  class Simulation {
    constructor(seed=217){
      this.seed=seed;this.randomState=seed;this.time=0;this.id=0;this.food=C.INITIAL_FOOD;this.peak=4;this.deadCount=0;this.over=false;
      this.tiles=[];this.tileLookup=new Map();this.worldBounds={minX:0,maxX:C.W-1,maxY:C.H-1};this._viewBounds=null;this.mapClock=0;this.ants=[];this.rooms=[];this.jobs=[];this.trash=[];this.log=[];this.reservations={};this.waterClock=0;this.scheduleClock=0;this.supplyClock=0;
      this.rainLeft=0;this.nextRain=180;this.nextInvasion=250;this.rainWarned=false;this.invasionWarned=false;this.lastSave=0;this.notice='';this.noticeUntil=0;this.noticeWarning=false;
      this.initializeWorld();
      this.foodBugs=[];this.nextFoodBug=12+this.random()*13;
      this.foodChunks=[];this.foodRemainder=0;
      this.waterDrops=[];this.waterRipples=[];this.waterEvaporation=0;this.rainDripClock=0;this.wetClock=0;this._waterPhysics=null;
      this.addAnt('queen',17.5*C.CELL,C.SURFACE*C.CELL+10.2);
      this.addAnt('worker',16.5*C.CELL,4.5*C.CELL);
      this.addAnt('worker',18.5*C.CELL,4.5*C.CELL);
      this.addAnt('worker',19.5*C.CELL,4.5*C.CELL);
      this.initializeFruitPlants();
      this.initializeCaverns();
      this.nextAphid=45+this.terrainNoise(67,9)*45;
      this.updateMapBounds();
      this.record('지표면에 여왕과 일꾼 세 마리가 도착했습니다.',false,false);
    }
    initializeFruitPlants(){this.fruitPlants=[14.5,20.5].map((x,i)=>({id:this.uid('p'),x:x*C.CELL,y:4.5*C.CELL,fruit:10,color:i?'#bb7894':'#dd8056'}));}
    spawnAphid(){
      const wild=this.ants.filter(a=>a.type==='aphid'&&!a.dead&&!a.carriedBy&&a.y<(C.SURFACE+1)*C.CELL);
      if(wild.length>=6||!this.fruitPlants.length)return null;
      const plant=this.fruitPlants[Math.floor(this.random()*this.fruitPlants.length)];
      for(let n=0;n<12;n++){
        const p={x:plant.x+(this.random()-.5)*C.CELL*2,y:(C.SURFACE+.5)*C.CELL},probe={id:'new-aphid',type:'aphid'};
        if(!this.terrainFits(probe,p.x,p.y)||wild.some(a=>distance(a,p)<RADIUS.aphid*2+1))continue;
        const aphid=this.addAnt('aphid',p.x,p.y);aphid.originPlantId=plant.id;
        this.record('열매나무 주변에 진딧물이 생겼습니다. 일꾼이 사육실로 데려옵니다.',false,false);return aphid;
      }return null;
    }
    updateAphids(){
      if(this.time<this.nextAphid)return;
      this.spawnAphid();this.nextAphid=this.time+60+this.random()*60;
    }
    initializeCaverns(){
      this.caverns=[];this.grubs=[];
      this.populateCaverns();
    }
    cavernSiteSafe(x,y){
      for(let yy=y-1;yy<=y+2;yy++)for(let xx=x-1;xx<=x+2;xx++){
        const t=this.tile(xx,yy),inside=xx>=x&&xx<=x+1&&yy>=y&&yy<=y+1;
        if(!t||(inside&&t.kind!=='soil')||t.open||t.room||t.cave||t.rootRemoved||t.water||this.jobs.some(j=>j.cell===t.index)||this.ants.some(a=>!a.dead&&this.at(a)?.index===t.index))return false;
      }return true;
    }
    populateCaverns(existingGrubs=null){
      // A separate seeded stream keeps scenery generation from changing colony events.
      let seed=(this.seed^0x7c3a91e5)>>>0;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const sites=([left,right,top,bottom])=>{
        const points=[];for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)points.push({x,y});
        for(let i=points.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[points[i],points[j]]=[points[j],points[i]];}return points;
      };
      // Four pockets flank the broad trunk and roots, within 20 cells of ground.
      const ground=C.SURFACE+1,maxTop=ground+18,zones=[[1,4,ground+5,ground+8],[11,11,ground+3,ground+4],[2,5,ground+12,maxTop-1],[12,14,ground+13,maxTop]];
      for(let slot=0;slot<zones.length;slot++){
        const fallback=[1,14,ground+1,maxTop];
        const site=[...sites(zones[slot]),...sites(fallback)].find(p=>this.cavernSiteSafe(p.x,p.y));
        if(site){
          const {x,y}=site,area=[this.tile(x,y),this.tile(x+1,y),this.tile(x,y+1),this.tile(x+1,y+1)];
          const cave={id:this.uid('c'),cells:area.map(t=>t.index)};this.caverns.push(cave);
          for(const t of area){t.open=true;t.cave=cave.id;}
          const bug=existingGrubs?existingGrubs[slot]:{id:this.uid('g'),angle:random()*Math.PI*2,phase:random()*Math.PI*2,speed:3+random()*3,turn:1+random()*3};
          if(bug)this.grubs.push({...bug,cave:cave.id,x:(x+1)*C.CELL,y:(y+1)*C.CELL,moving:false,buried:false});
        }
      }
      this.caveLayout='tree-four-v3';
    }
    relocateCaverns(){
      const connected=this.surfaceConnected(),existingGrubs=this.grubs.slice(0,4),retained=[];
      for(const cave of this.caverns){
        const tiles=cave.cells.map(i=>this.tiles[i]),protectedSpace=tiles.some(t=>connected.has(t.index)||t.room||t.water||t.kind!=='soil'||t.rootRemoved||this.jobs.some(j=>j.cell===t.index)||this.ants.some(a=>!a.dead&&this.at(a)?.index===t.index)||this.foodChunks.some(c=>this.at(c)?.index===t.index));
        if(protectedSpace)retained.push(cave);
        else for(const t of tiles){t.open=false;delete t.cave;}
      }
      this.caverns=retained;this.grubs=[];this.populateCaverns(existingGrubs);
      const moved=new Set(existingGrubs.map(b=>b.id));
      for(const ant of this.ants){if(moved.has(ant.task?.grubId))this.clearTask(ant);if(moved.has(ant.resume?.grubId))ant.resume=null;}
    }
    reduceCaverns(){
      const connected=this.surfaceConnected(),retained=[],near=new Set();
      for(const cave of this.caverns){
        const tiles=cave.cells.map(i=>this.tiles[i]),center=tiles.reduce((n,t)=>n+t.x+.5,0)/tiles.length;
        if(Math.abs(center-C.TREE_X)<=7){near.add(cave.id);retained.push(cave);continue;}
        const protectedSpace=tiles.some(t=>connected.has(t.index)||t.room||t.water||t.kind!=='soil'||t.rootRemoved||this.jobs.some(j=>j.cell===t.index)||this.ants.some(a=>!a.dead&&this.at(a)?.index===t.index)||this.foodChunks.some(c=>this.at(c)?.index===t.index));
        if(protectedSpace)retained.push(cave);else for(const t of tiles){t.open=false;delete t.cave;}
      }
      const remaining=this.grubs.filter(b=>near.has(b.cave)).slice(0,4),removed=new Set(this.grubs.filter(b=>!remaining.includes(b)).map(b=>b.id));
      this.grubs=remaining;this.caverns=retained;this.caveLayout='tree-four-v3';
      for(const ant of this.ants){if(removed.has(ant.task?.grubId))this.clearTask(ant);if(removed.has(ant.resume?.grubId))ant.resume=null;}
    }
    upgradeCaverns(){
      const connected=this.surfaceConnected(),count=Math.min(8,this.caverns.length),keep=new Set(Array.from({length:count},(_,i)=>this.caverns[Math.floor(i*this.caverns.length/count)].id)),retained=[];
      for(const cave of this.caverns){
        const tiles=cave.cells.map(i=>this.tiles[i]),protectedSpace=tiles.some(t=>connected.has(t.index)||t.room||t.water||t.kind!=='soil'||this.jobs.some(j=>j.cell===t.index)||this.ants.some(a=>!a.dead&&this.at(a)?.index===t.index)||this.foodChunks.some(c=>this.at(c)?.index===t.index));
        let cells=cave.cells;
        if(!protectedSpace){
          const x=Math.min(...tiles.map(t=>t.x)),y=Math.min(...tiles.map(t=>t.y));
          cells=keep.has(cave.id)?tiles.filter(t=>t.x<x+2&&t.y<y+2).map(t=>t.index):[];
          if(cells.length&&cells.length!==4)cells=cave.cells;
          for(const t of tiles)if(!cells.includes(t.index)){t.open=false;delete t.cave;}
        }
        if(cells.length)retained.push({...cave,cells});
      }
      this.caverns=retained;const occupied=new Set();
      this.grubs=this.grubs.filter(b=>{if(!keep.has(b.cave)||occupied.has(b.cave)||!this.caverns.some(c=>c.id===b.cave))return false;occupied.add(b.cave);return true;});
      for(const bug of this.grubs)if(!this.grubFits(bug,bug.x,bug.y)){
        const cave=this.caverns.find(c=>c.id===bug.cave),spot=cave.cells.map(i=>this.point(this.tiles[i])).find(p=>this.grubFits(bug,p.x,p.y));if(spot)Object.assign(bug,spot);
      }
      this.caveLayout='eight-single-v1';
    }
    random(){this.randomState=(this.randomState*1664525+1013904223)>>>0;return this.randomState/4294967296;}
    uid(prefix){return prefix+(++this.id);}
    index(x,y){return this.tileLookup.get(`${x},${y}`);}
    tile(x,y){return this.tiles[this.index(x,y)]??null;}
    rebuildTileLookup(){
      this.tileLookup=new Map();let minX=Infinity,maxX=-Infinity,maxY=0;
      for(const t of this.tiles){this.tileLookup.set(`${t.x},${t.y}`,t.index);minX=Math.min(minX,t.x);maxX=Math.max(maxX,t.x);maxY=Math.max(maxY,t.y);}
      this.worldBounds={minX,maxX,maxY};this._viewBounds=null;
    }
    terrainNoise(x,y){let n=(this.seed^Math.imul(x,374761393)^Math.imul(y,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
    ensureWorldBounds(bounds){
      const old=this.worldBounds,next={minX:Math.min(old.minX,bounds.minX),maxX:Math.max(old.maxX,bounds.maxX),maxY:Math.max(old.maxY,bounds.maxY)};
      if(next.minX===old.minX&&next.maxX===old.maxX&&next.maxY===old.maxY)return false;
      const roots=this.tiles.filter(t=>t.kind==='root');
      const append=(x,y)=>{
        const texture=this.terrainNoise(x,y),surface=y<=C.SURFACE,rx=x-Math.floor(x/8)*8-3,ry=y-Math.floor(y/8)*8-4;
        const rock=!surface&&this.terrainNoise(Math.floor(x/8),Math.floor(y/8))<.18&&rx*rx+ry*ry<4;
        const t={index:this.tiles.length,x,y,open:surface,kind:surface?'surface':rock?'rock':'soil',room:null,water:0,texture,rootDistance:surface?99:roots.reduce((d,r)=>Math.min(d,Math.hypot(x-r.x,y-r.y)),99),wetDistance:99};
        this.tileLookup.set(`${x},${y}`,t.index);this.tiles.push(t);
      };
      for(let y=0;y<=old.maxY;y++){for(let x=next.minX;x<old.minX;x++)append(x,y);for(let x=old.maxX+1;x<=next.maxX;x++)append(x,y);}
      for(let y=old.maxY+1;y<=next.maxY;y++)for(let x=next.minX;x<=next.maxX;x++)append(x,y);
      this.worldBounds=next;return true;
    }
    updateMapBounds(){
      let minX=Infinity,maxX=-Infinity,maxY=C.SURFACE;
      for(const t of this.tiles)if(t.open&&t.y>C.SURFACE&&(!t.cave||t.room)){minX=Math.min(minX,t.x);maxX=Math.max(maxX,t.x);maxY=Math.max(maxY,t.y);}
      if(!Number.isFinite(minX))minX=maxX=17;
      this._viewBounds={minX:minX-10,maxX:maxX+10,maxY:maxY+10};this.ensureWorldBounds(this._viewBounds);return this._viewBounds;
    }
    viewBounds(){return this._viewBounds??this.updateMapBounds();}
    cellOf(a){return {x:Math.floor(a.x/C.CELL),y:Math.floor(a.y/C.CELL)};}
    at(a){const p=this.cellOf(a);return this.tile(p.x,p.y);}
    point(cell){return {x:(cell.x+.5)*C.CELL,y:(cell.y+.5)*C.CELL};}
    adjacent(cell){return [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>this.tile(cell.x+dx,cell.y+dy)).filter(Boolean);}
    connects(a,b){
      if(!a||!b)return false;const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
      if(dx+dy===1)return true;if(dx!==1||dy!==1)return false;
      const sides=[this.tile(a.x,b.y),this.tile(b.x,a.y)];
      if(sides.some(t=>!t||(!t.open&&['rock','root'].includes(t.kind))))return false;
      if((a.room??a.cave)&&(a.room??a.cave)===(b.room??b.cave))return sides.some(t=>t.open);
      // Prefer an existing cardinal connection at entrances, room edges and turns.
      // Only a true corner-to-corner corridor needs a diagonal connector.
      return !sides.some(t=>t.open)&&(!(a.room??a.cave)||!(b.room??b.cave));
    }
    neighbors(cell){
      return [...this.adjacent(cell),...[[1,1],[1,-1],[-1,1],[-1,-1]].map(([dx,dy])=>this.tile(cell.x+dx,cell.y+dy)).filter(t=>this.connects(cell,t))].filter(t=>{
        if(cell.y>=C.SURFACE&&t.y>=C.SURFACE)return true;
        // Outdoor paths follow continuous plant material, never bridge sky.
        const a=this.point(cell),b=this.point(t),steps=Math.ceil(distance(a,b)/4);
        for(let i=0;i<=steps;i++)if(!this.outdoorContains(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
        return true;
      });
    }
    grassTop(x){return (C.SURFACE+1-C.GRASS_CELLS)*C.CELL+Math.sin(x*.17)*3+Math.sin(x*.035)*5;}
    outdoorContains(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y)||y>(C.SURFACE+1)*C.CELL)return false;
      return y>=this.grassTop(x)||this.treeHabitats().some(host=>this.treeContains(host,{x,y}));
    }
    roomCorners(t){
      // Touching chambers share a flat opening even when their room IDs differ.
      const joined=(dx,dy)=>{const n=this.tile(t.x+dx,t.y+dy);return n?.open&&(n.room??n.cave)!=null;},r=C.CELL*.49;
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy])=>!joined(dx,0)&&!joined(0,dy)?r:0);
    }
    groundContains(x,y){
      if(y<(C.SURFACE+1)*C.CELL)return this.outdoorContains(x,y);
      const cx=Math.floor(x/C.CELL),cy=Math.floor(y/C.CELL),cell=this.tile(cx,cy);
      if(!cell||cy<C.SURFACE)return false;
      if(cell.y===C.SURFACE&&cell.open)return true;
      if(cell.open&&(cell.room||cell.cave)){
        const px=x-cx*C.CELL,py=y-cy*C.CELL,rs=this.roomCorners(cell);
        const corners=[[0,0],[C.CELL,0],[C.CELL,C.CELL],[0,C.CELL]];
        if(!rs.some((r,i)=>r&&Math.abs(px-corners[i][0])<r&&Math.abs(py-corners[i][1])<r&&Math.hypot(px-(corners[i][0]?C.CELL-r:r),py-(corners[i][1]?C.CELL-r:r))>r))return true;
      }
      for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++){
        const t=this.tile(xx,yy);if(!t?.open||t.room||t.cave||t.y<C.SURFACE)continue;
        const p=this.point(t);if(Math.hypot(x-p.x,y-p.y)<=C.CELL*C.PATH_WIDTH_RATIO/2)return true;
        for(const n of this.neighbors(t))if(n.open&&n.y>=C.SURFACE){
          const q=this.point(n),dx=q.x-p.x,dy=q.y-p.y,f=clamp(((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy),0,1);
          if(Math.hypot(x-p.x-f*dx,y-p.y-f*dy)<=C.CELL*C.PATH_WIDTH_RATIO/2)return true;
        }
      }return false;
    }
    walkable(tile,avoidFill=false){
      if(!tile||!tile.open||tile.water>=.025||avoidFill&&this.jobs.some(j=>j.type==='fill'&&j.status!=='done'&&j.cell===tile.index))return false;
      if(tile.y>=C.SURFACE+1-C.GRASS_CELLS)return true;
      const p=this.point(tile);return [[0,0],[8,0],[-8,0],[0,8],[0,-8]].every(([dx,dy])=>this.outdoorContains(p.x+dx,p.y+dy));
    }
    initializeWorld(){
      for(let y=0;y<C.H;y++)for(let x=0;x<C.W;x++){const t={index:this.tiles.length,x,y,open:y<=C.SURFACE,kind:y<=C.SURFACE?'surface':'soil',room:null,water:0,texture:this.random(),rootDistance:99,wetDistance:99};this.tileLookup.set(`${x},${y}`,t.index);this.tiles.push(t);}
      for(const [base,sign] of [[C.TREE_ROOT,1]]){
        for(let y=5;y<22;y++){
          const x=base+Math.floor((y-5)*.18)*sign;
          this.tile(x,y).kind='root';
          if(y===10||y===16)for(let n=1;n<=3;n++){const t=this.tile(x+n*sign,y+n);if(t)t.kind='root';}
        }
      }
      this.widenTreeRoots();
      for(const [cx,cy,rx,ry] of [[11,14,2,1],[24,20,2,2],[15,29,3,1],[6,36,2,2],[27,44,3,2],[20,51,2,1]]){
        for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){const t=this.tile(x,y);if(t&&((x-cx)**2/rx**2+(y-cy)**2/ry**2<1.2))t.kind='rock';}
      }
      this.connectRoots();this.updateRootDistances();
      this.treeLayout='single-wide-v1';
      this.spreadTreeRoots();
    }
    widenTreeRoots(){
      const left=C.TREE_X-C.TREE_WIDTH/2;
      for(let depth=0;depth<5;depth++)for(let x=left+depth;x<left+C.TREE_WIDTH-depth;x++){
        const t=this.tile(x,C.SURFACE+1+depth);
        if(t?.kind==='soil'&&!t.open&&!t.room&&!t.cave&&!t.rootRemoved&&!t.water&&!this.jobs.some(j=>j.cell===t.index)&&!this.ants.some(a=>!a.dead&&this.at(a)?.index===t.index)&&!this.adjacent(t).some(n=>n.open&&n.y>C.SURFACE))t.kind='root';
      }
    }
    upgradeTreeLayout(){
      // The old right-hand tree has no trunk now. Keep excavations, plans and
      // occupants, replacing only its root material with ordinary soil.
      for(const t of this.tiles)if(t.kind==='root'&&t.x>=C.W/2)t.kind='soil';
      this.widenTreeRoots();this.connectRoots();this.updateRootDistances();this.treeLayout='single-wide-v1';
    }
    spreadTreeRoots(){
      // Branches start at different points of the broad base. Lateral roots
      // fork again, while deeper roots anchor the same single tree.
      const branches=[
        [[-4,6],[-7,9],[-11,12],[-15,14]],
        [[-7,9],[-9,14],[-11,18]],
        [[-11,12],[-15,11]],
        [[-2,7],[-4,11],[-6,15],[-7,22]],
        [[-4,11],[-8,13],[-12,16]],
        [[-6,15],[-9,19],[-10,25]],
        [[0,8],[-1,12],[0,16],[0,21],[1,28]],
        [[0,16],[-3,19],[-5,24]],
        [[0,21],[4,24],[6,27]],
        [[2,7],[4,10],[6,12],[8,16],[8,20],[10,25]],
        [[8,16],[12,18],[15,21]],
        [[8,20],[6,23],[6,28]],
        [[3,6],[7,8],[10,10],[12,13]],
        [[7,8],[8,12],[9,16]],
        [[10,10],[14,9],[16,11]],
      ].map(branch=>branch.map(([dx,y])=>({x:C.TREE_X+dx,y:C.SURFACE+y-4})));
      const points=branches.flat();this.ensureWorldBounds({minX:Math.min(...points.map(p=>p.x))-3,maxX:Math.max(...points.map(p=>p.x))+3,maxY:Math.max(...points.map(p=>p.y))+3});
      const reserved=new Set(this.jobs.filter(j=>j.status!=='done').map(j=>j.cell)),occupied=new Set([...this.ants,...(this.foodChunks??[]),...this.trash].filter(a=>!a.dead).map(a=>this.at(a)?.index));
      const canGrow=t=>t&&(t.kind==='root'||(t.kind==='soil'&&!t.open&&!t.room&&!t.cave&&!t.rootRemoved&&!t.water&&!reserved.has(t.index)&&!occupied.has(t.index)&&!this.adjacent(t).some(n=>n.open&&n.y>C.SURFACE)));
      const grow=(start,end)=>{
        const first=this.tile(start.x,start.y),last=this.tile(end.x,end.y);if(first?.kind!=='root'||!canGrow(last))return false;
        const left=Math.min(start.x,end.x)-3,right=Math.max(start.x,end.x)+3,top=Math.max(C.SURFACE+1,Math.min(start.y,end.y)-3),bottom=Math.max(start.y,end.y)+3;
        const queue=[{t:first,g:0,f:0}],cost=new Map([[first.index,0]]),parent=new Map(),dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy)||1;
        while(queue.length){
          queue.sort((a,b)=>b.f-a.f);const {t,g}=queue.pop();if(g!==cost.get(t.index))continue;
          if(t===last){let current=t;while(current!==first){current.kind='root';current=this.tiles[parent.get(current.index)];}return true;}
          for(const n of this.adjacent(t)){
            if(n.x<left||n.x>right||n.y<top||n.y>bottom||!canGrow(n))continue;
            const deviation=Math.abs((n.x-start.x)*dy-(n.y-start.y)*dx)/length,next=g+1+deviation*.06+this.terrainNoise(n.x,n.y)*.03;
            if(next>=(cost.get(n.index)??Infinity))continue;cost.set(n.index,next);parent.set(n.index,t.index);queue.push({t:n,g:next,f:next+Math.abs(n.x-end.x)+Math.abs(n.y-end.y)});
          }
        }return false;
      };
      for(const branch of branches)for(let i=1;i<branch.length;i++)if(!grow(branch[i-1],branch[i]))break;
      while(this.connectRoots()){}
      this.updateRootDistances();this.treeLayout='radial-roots-v2';
    }
    connectRoots(){
      let added=0;
      for(const t of this.tiles.filter(t=>t.kind==='root'))for(const dx of [-1,1]){
        const diagonal=this.tile(t.x+dx,t.y+1);if(diagonal?.kind!=='root')continue;
        const sides=[this.tile(t.x,t.y+1),this.tile(t.x+dx,t.y)];if(sides.some(n=>n?.kind==='root'))continue;
        // Connect bends with full root blocks, preserving built and queued spaces
        // when upgrading an older colony, including nearby diagonal tunnels.
        const bridge=sides.find(n=>n&&n.kind==='soil'&&!n.rootRemoved&&!n.open&&!n.room&&n.water<.025&&!this.jobs.some(j=>j.cell===n.index)&&!this.adjacent(n).some(a=>a.open&&a.y>C.SURFACE));
        if(bridge){bridge.kind='root';added++;}
      }return added;
    }
    updateRootDistances(){
      const roots=this.tiles.filter(t=>t.kind==='root');
      for(const t of this.tiles)if(t.y>C.SURFACE)t.rootDistance=roots.length?Math.min(...roots.map(r=>Math.hypot(t.x-r.x,t.y-r.y))):99;
    }
    addAnt(type,x,y){
      const ant={id:this.uid('a'),type,x,y,hp:MAX_HP[type],hunger:100,energy:100,hygiene:100,lastDamage:-10,cooldown:0,age:0,angle:0,phase:0,moving:false,task:null,resume:null,sick:false,dead:false,carriedBy:null,carry:null,toiletNeed:0,stuck:0,replan:0};
      this.ants.push(ant);return ant;
    }
    queen(){return this.ants.find(a=>a.type==='queen'&&!a.dead);}
    counts(){const counts={queen:0,worker:0,soldier:0,egg:0,larva:0};for(const a of this.ants)if(!a.dead&&a.type in counts)counts[a.type]++;counts.total=counts.queen+counts.worker+counts.soldier;return counts;}
    record(text,warning=false,notify=true){
      this.log.unshift({time:this.time,text});this.log=this.log.slice(0,40);
      if(notify){this.notice=text;this.noticeUntil=this.time+7;this.noticeWarning=warning;}
    }
    findPath(from,to,avoidFill=true){
      const fromHost=!from.treeHost&&from.y<0?this.treeHabitats().find(h=>this.treeContains(h,from)):null,toHost=to.y<0?this.treeHabitats().find(h=>this.treeContains(h,to)):null;
      const origin=from.treeHost?this.treeHabitat(from.treeHost)?.base??from:fromHost?.base??from,destination=toHost?.base??to;
      const a=this.cellOf(origin),b=this.cellOf(destination),start=this.tile(a.x,a.y),end=this.tile(b.x,b.y);
      if(!start||!this.walkable(end,avoidFill))return null;
      const descent=fromHost?[start.index]:[];
      if(start.index===end.index)return descent;
      const queue=[start.index],seen=new Set(queue),parent=new Map();
      for(let head=0;head<queue.length;head++){
        const current=this.tiles[queue[head]];
        for(const next of this.neighbors(current)){
          if(seen.has(next.index)||!this.walkable(next,avoidFill))continue;
          seen.add(next.index);parent.set(next.index,current.index);
          if(next.index===end.index){const path=[];let k=next.index;while(k!==start.index){path.unshift(k);k=parent.get(k);}return [...descent,...path];}
          queue.push(next.index);
        }
      }
      return null;
    }
    roomTiles(room){return room.cells.map(i=>this.tiles[i]).filter(t=>this.walkable(t,true));}
    roomFor(kind,from){
      const options=this.rooms.filter(r=>r.type===kind&&this.roomTiles(r).length);
      options.sort((a,b)=>distance(this.point(this.tiles[a.cells[0]]),from)-distance(this.point(this.tiles[b.cells[0]]),from));
      for(const room of options){const p=this.roomPoint(room,from);if(p&&this.findPath(from,p)!==null)return {room,point:p};}return null;
    }
    roomCenter(room){const cells=this.roomTiles(room);return cells.length?cells.reduce((p,t)=>({x:p.x+(t.x+.5)*C.CELL/cells.length,y:p.y+(t.y+.5)*C.CELL/cells.length}),{x:0,y:0}):null;}
    roomSpots(room){
      const center=this.roomCenter(room);if(!center)return [];
      const spots=[center,...this.roomTiles(room).flatMap(t=>{const p=this.point(t);return [p,...[[-10,-10],[0,-10],[10,-10],[-10,0],[10,0],[-10,10],[0,10],[10,10]].map(([dx,dy])=>({x:p.x+dx,y:p.y+dy}))];})];
      return spots.filter(p=>this.at(p)?.room===room.id&&this.walkable(this.at(p),true)).sort((a,b)=>distance(a,center)-distance(b,center));
    }
    roomPoint(room,from={x:0,y:0}){
      const probe=from.type?from:{id:'room-probe',type:'worker'};
      return this.roomPlacement(room,probe)??this.roomSpots(room)[0]??null;
    }
    roomPlacement(room,entity){
      const spots=this.roomSpots(room).filter(p=>this.canStand(entity,p.x,p.y));
      // Brood spacing is a visual preference, never a movement or capacity limit.
      if(!isAdultAnt(entity)){
        const spaced=spots.find(p=>!this.ants.some(a=>a.id!==entity.id&&!a.dead&&!a.carriedBy&&!isAdultAnt(a)&&distance(p,a)<RADIUS[entity.type]+RADIUS[a.type]+.2));
        if(spaced)return spaced;
      }
      return spots[0]??null;
    }
    foodStorage(){const room=this.rooms.find(r=>r.type==='food'&&this.roomTiles(r).length);return {room,point:room?this.roomCenter(room):null};}
    foodPoint(from){const store=this.foodStorage();return store.room?this.roomPoint(store.room,from):null;}
    foodSupply(){return this.food+this.foodChunks.length+this.ants.filter(a=>!a.dead&&a.foodCargo).length;}
    taskRoomType(ant){
      const task=ant.task;if(!task||task.type==='wander')return null;
      if(task.type==='sleep'&&ant.type==='queen')return 'queen';
      const room=this.rooms.find(r=>r.id===(task.destinationRoom??task.roomId));if(room)return room.type;
      if(['plant','harvest'].includes(task.type))return 'mushroom';
      if(['tend','honey'].includes(task.type))return 'aphid';
      if(task.type==='sleep')return 'rest';if(task.type==='toilet')return 'toilet';if(task.type==='trash')return 'trash';if(task.type==='fight')return 'guard';
      const target=this.ants.find(a=>a.id===(task.mealTarget??task.target));
      if(['feed','clean','carry','forage'].includes(task.type)&&target&&target!==ant&&ROOMS[target.type])return target.type;
      if(['eat','forage'].includes(task.type))return 'food';
      if(['dig','fill'].includes(task.type)){const job=this.jobs.find(j=>j.id===task.jobId),room=this.rooms.find(r=>r.id===(job?.room??this.tiles[job?.cell]?.room));return room?.type??'empty';}
      const destination=this.rooms.find(r=>r.id===this.at(task.goal??ant)?.room);return destination?.type??null;
    }
    entityColor(ant){
      if(ant.type==='enemy')return '#D84949';
      if(['egg','larva','aphid'].includes(ant.type))return ROOMS[ant.type].objectColor;
      const type=this.taskRoomType(ant);return type?ROOMS[type].objectColor:'#000000';
    }
    storedFoodChunks(){
      const {room,point}=this.foodStorage(),count=Math.max(0,Math.floor(this.food));if(!room||!count)return [];
      const cells=this.roomTiles(room),key=`${room.id}:${count}:${cells.map(t=>t.index).join(',')}`;
      if(this.foodDisplay?.key===key)return this.foodDisplay.chunks;
      let slots=[],size=4;
      for(let divisions=3;slots.length<count;divisions++){
        slots=[];const spacing=C.CELL/divisions;size=Math.min(4,spacing*.3);
        for(const t of cells)for(let row=0;row<divisions;row++)for(let col=0;col<divisions;col++){
          const p={x:(t.x+(col+.5)/divisions)*C.CELL,y:(t.y+(row+.5)/divisions)*C.CELL},radius=size*1.4;
          if([[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.707,radius*.707],[-radius*.707,radius*.707],[radius*.707,-radius*.707],[-radius*.707,-radius*.707]].every(([dx,dy])=>this.at({x:p.x+dx,y:p.y+dy})?.room===room.id&&this.groundContains(p.x+dx,p.y+dy)))slots.push(p);
        }
      }
      slots.sort((a,b)=>distance(a,point)-distance(b,point)||a.y-b.y||a.x-b.x);
      const chunks=slots.slice(0,count).map((p,i)=>({...p,nutrition:1,size,shape:i*2.399963,color:ROOMS.food.objectColor,sourceKind:'stored'}));
      this.foodDisplay={key,chunks};return chunks;
    }
    dropFoodCargo(ant){if(ant.foodCargo){const cargo=ant.foodCargo;this.scatterFood(ant,1,cargo.color??'#d6b36f',cargo.sourceKind??cargo.kind,1);ant.foodCargo=null;}}
    normalizeFoodUnits(){
      // Old fruit fragments were thirds. Each surviving visible/carried piece
      // now counts as one; already deposited partial thirds become whole food.
      this.food+=Math.round(this.foodRemainder*3);this.foodRemainder=0;
      for(const chunk of this.foodChunks)chunk.nutrition=1;
      for(const ant of this.ants)if(ant.foodCargo)ant.foodCargo.nutrition=1;
    }
    releaseUnstoredFood(point){
      if(this.foodStorage().room||!(this.food+this.foodRemainder>0))return;
      const nutrition=this.food+this.foodRemainder;this.food=0;this.foodRemainder=0;
      this.scatterFood(point??this.queen()??this.point(this.tile(17,C.SURFACE)),nutrition,'#d6b36f','stored',Math.ceil(nutrition));
    }
    assignLooseMeal(ant,target=ant){
      if(target!==ant&&this.reservations['service:'+target.id])return false;
      for(const chunk of this.foodChunks.filter(c=>!c.falling&&c.age>=.45&&this.at(c)?.open&&this.at(c).water<.025).sort((a,b)=>distance(ant,a)-distance(ant,b))){
        if(this.assign(ant,{type:'forage',chunkId:chunk.id,mealTarget:target.id,goal:{x:chunk.x,y:chunk.y},range:12,duration:.35,key:'food:'+chunk.id}))return true;
      }return false;
    }
    assignForage(ant,outsideOnly=false){
      if(this.foodChunks.some(c=>c.age<.45))return false;
      const bugs=this.foodBugs.slice().sort((a,b)=>distance(ant,a)-distance(ant,b));
      for(const bug of bugs){const goal=this.foodBugGoal(bug,ant);if(goal&&this.assign(ant,{type:'forage',target:bug.id,goal,range:RADIUS[ant.type]+C.FOOD_BUG_RADIUS+3,duration:2,key:'prey:'+bug.id}))return true;}
      if(!outsideOnly)for(const grub of this.grubs.slice().sort((a,b)=>distance(ant,a)-distance(ant,b)))if(this.assign(ant,{type:'forage',grubId:grub.id,goal:{x:grub.x,y:grub.y},range:RADIUS[ant.type]+9,duration:2,key:'prey:'+grub.id}))return true;
      const plants=this.fruitPlants.filter(p=>p.fruit>0).sort((a,b)=>distance(ant,a)-distance(ant,b));
      for(const plant of plants)if(this.assign(ant,{type:'forage',plantId:plant.id,goal:{x:plant.x,y:plant.y},range:12,duration:2,key:'fruit:'+plant.id}))return true;
      return false;
    }
    hasWaterNear(room){return room.cells.some(i=>this.tiles[i].wetDistance<=10);}
    hasRootNear(room){return room.cells.some(i=>this.tiles[i].rootDistance<=5);}
    designate(roomId,type){
      const room=this.rooms.find(r=>r.id===roomId);if(!room||!ROOMS[type])return false;
      if(type==='aphid'&&!this.hasRootNear(room)){this.record('진딧물사육실은 뿌리에서 5칸 이내에 있어야 합니다.',true);return false;}
      if(type==='mushroom'&&!this.hasWaterNear(room))this.record('버섯재배실을 지정했습니다. 물에서 10칸 이내일 때 자랍니다.');
      else this.record(ROOMS[type].name+'로 지정했습니다.');
      const oldFoodPoint=room.type==='food'?this.roomCenter(room):null;
      room.type=type;room.crop=0;room.planted=false;room.tended=0;
      if(oldFoodPoint)this.releaseUnstoredFood(oldFoodPoint);
      // A nursery houses existing wild aphids; designating it creates none.
      return true;
    }
    request(type,indices){
      const unique=[...new Set(indices)].filter(i=>Number.isInteger(i)&&this.tiles[i]);
      let room=null,accepted=0,blocked=0;
      if(type==='room'){
        if(unique.some(i=>this.tiles[i].y<=C.SURFACE||this.tiles[i].kind==='rock'||this.tiles[i].room||this.jobs.some(j=>j.cell===i&&j.status!=='done'))){this.record('방은 장애물·다른 방·예약 작업과 겹칠 수 없습니다.',true);return 0;}
        room={id:this.uid('r'),type:'empty',cells:[],requested:unique,crop:0,planted:false,tended:0};this.rooms.push(room);
      }
      for(const i of unique){
        const t=this.tiles[i];
        if(t.y<=C.SURFACE||this.jobs.some(j=>j.cell===i&&j.status!=='done')){blocked++;continue;}
        if(type==='fill'){
          if(!t.open){blocked++;continue;}
          this.jobs.push({id:this.uid('j'),type:'fill',cell:i,status:'pending',created:this.time,worker:null,progress:0});accepted++;
        }else if(t.open){if(room){t.room=room.id;room.cells.push(i);accepted++;}}
        else if(t.kind==='soil'||t.kind==='root'){
          this.jobs.push({id:this.uid('j'),type:'dig',cell:i,room:room?.id??null,status:'pending',created:this.time,worker:null,progress:0});accepted++;
        }else blocked++;
      }
      if(room&&!accepted)this.rooms=this.rooms.filter(r=>r!==room);
      if(type==='room'&&accepted)this.recognizeConnectedCaverns(false);
      this.record(accepted?`${accepted}칸 ${type==='fill'?'땅채우기':'굴착'} 요청${blocked?` · 장애물 ${blocked}칸 제외`:''}`:'작업할 수 있는 칸이 없습니다.',!accepted);
      return accepted;
    }
    cancelConstruction(indices=this.jobs.map(j=>j.cell)){
      const cells=new Set(indices),cancelled=this.jobs.filter(j=>j.status!=='done'&&cells.has(j.cell)),ids=new Set(cancelled.map(j=>j.id));
      for(const ant of this.ants){if(ids.has(ant.task?.jobId))this.clearTask(ant);if(ids.has(ant.resume?.jobId))ant.resume=null;}
      for(const job of cancelled)if(this.reservations['job:'+job.id])delete this.reservations['job:'+job.id];
      this.jobs=this.jobs.filter(j=>!ids.has(j.id));
      for(const room of this.rooms)room.requested=(room.requested??room.cells).filter(i=>room.cells.includes(i)||!cancelled.some(j=>j.room===room.id&&j.cell===i));
      this.rooms=this.rooms.filter(r=>r.cells.length||this.jobs.some(j=>j.room===r.id));
      this.record(cancelled.length?`${cancelled.length}칸의 건설 요청을 취소했습니다.`:'선택한 영역에 취소할 건설 요청이 없습니다.',!cancelled.length);return cancelled.length;
    }
    safeToFill(index){
      const t=this.tiles[index];if(!t.open||t.water>=.025)return false;
      if(this.ants.some(a=>!a.dead&&!a.carriedBy&&this.at(a)?.index===index))return false;
      // Unopened natural pockets already exist in isolation. Preserve every
      // pocket connected to the colony, without blocking all backfill elsewhere.
      const connected=this.surfaceConnected();
      const starts=this.tiles.filter(t=>t.y===C.SURFACE&&t.open),seen=new Set(starts.map(t=>t.index)),queue=starts.map(t=>t.index);
      // Removed tiles must not create a diagonal bridge in the safety search.
      t.open=false;for(let h=0;h<queue.length;h++)for(const n of this.neighbors(this.tiles[queue[h]]))if(n.index!==index&&n.open&&n.y>=C.SURFACE&&!seen.has(n.index)){seen.add(n.index);queue.push(n.index);}
      const safe=this.tiles.every(t=>!t.open||t.y<C.SURFACE||t.index===index||seen.has(t.index)||(t.cave&&!t.room&&!connected.has(t.index)))&&this.ants.filter(a=>!a.dead&&!a.carriedBy&&this.at(a)?.water<.025).every(a=>this.terrainFits(a,a.x,a.y));t.open=true;return safe;
    }
    surfaceConnected(){
      const queue=this.tiles.filter(t=>t.y===C.SURFACE&&t.open),seen=new Set(queue.map(t=>t.index));
      for(let h=0;h<queue.length;h++)for(const n of this.neighbors(queue[h]))if(n.open&&n.y>=C.SURFACE&&!seen.has(n.index)){seen.add(n.index);queue.push(n);}
      return seen;
    }
    recognizeConnectedCaverns(notify=true){
      let created=0;
      for(const cave of this.caverns){
        const tiles=cave.cells.map(i=>this.tiles[i]).filter(t=>t.open);if(!tiles.length)continue;
        let room=this.rooms.find(r=>r.id===cave.room)??this.rooms.find(r=>tiles.some(t=>t.room===r.id));
        if(room)cave.room=room.id;
        if(room&&tiles.every(t=>t.room))continue;
        const own=new Set(cave.cells),connected=tiles.some(t=>this.neighbors(t).some(n=>n.open&&n.y>=C.SURFACE&&!own.has(n.index)&&(!n.cave||n.room)));
        if(!room&&!connected)continue;
        if(!room){room={id:this.uid('r'),type:'empty',cells:[],requested:[],crop:0,planted:false,tended:0};this.rooms.push(room);created++;}
        cave.room=room.id;room.requested??=[...room.cells];
        for(const t of tiles)if(!t.room){t.room=room.id;if(!room.cells.includes(t.index))room.cells.push(t.index);if(!room.requested.includes(t.index))room.requested.push(t.index);}
      }
      if(created&&notify)this.record(`연결된 자연 굴 ${created}개가 빈방이 되었습니다. 방을 눌러 용도를 지정하세요.`,false,false);
      return created;
    }
    fillTouches(ant,index){const t=this.tiles[index];if(!t.open||distance(ant,this.point(t))>C.CELL*1.7)return false;t.open=false;const touches=!this.terrainFits(ant,ant.x,ant.y);t.open=true;return touches;}
    relocatePoint(ant){
      const cell=this.at(ant);if(!cell)return null;
      const queue=[cell],seen=new Set([cell.index]);
      for(let h=0;h<queue.length;h++){
        const t=queue[h];if(t.index!==cell.index&&this.walkable(t,true)){
          const center=this.point(t),spots=[center,{x:center.x+9,y:center.y+9},{x:center.x-9,y:center.y+9},{x:center.x+9,y:center.y-9},{x:center.x-9,y:center.y-9}];
          const spot=spots.find(p=>this.canStand(ant,p.x,p.y));if(spot)return spot;
        }
        for(const n of this.neighbors(t))if(n.open&&n.water<.025&&n.y>=C.SURFACE&&!seen.has(n.index)){seen.add(n.index);queue.push(n);}
      }return null;
    }
    growthCandidates(){
      const nurseries=new Map(this.rooms.filter(r=>r.type==='larva').map(r=>[r.id,new Set(r.cells)]));
      return this.ants.filter(a=>{const tile=this.at(a);return a.type==='larva'&&!a.dead&&!a.carriedBy&&tile?.open&&tile.water<.025&&nurseries.get(tile.room)?.has(tile.index)&&this.terrainFits(a,a.x,a.y);});
    }
    growth(type){
      const baby=this.growthCandidates()[0];
      if(!baby){this.record('애벌레실에 내려놓은 애벌레가 있어야 성장시킬 수 있습니다. 침수된 방에서는 성장할 수 없습니다.');return false;}
      // Reserve a collision-free spot before transforming the smaller larva.
      const spots=[{x:baby.x,y:baby.y},...this.adjacent(this.at(baby)).filter(t=>this.walkable(t,true)).map(t=>this.point(t))];
      const spot=spots.find(p=>this.canStand({...baby,type},p.x,p.y));
      if(!spot){this.record('성장할 공간이 부족합니다. 방을 넓혀주세요.',true);return false;}
      this.clearTask(baby);baby.type=type;baby.hp=MAX_HP[type];baby.energy=100;baby.x=spot.x;baby.y=spot.y;baby.age=0;
      this.record(type==='soldier'?'새로운 병정개미가 태어났습니다.':'새로운 일꾼이 태어났습니다.');this.peak=Math.max(this.peak,this.counts().total);return true;
    }
    damage(ant,amount){if(ant.dead)return;ant.hp-=amount;ant.lastDamage=this.time;if(ant.hp<=0)this.kill(ant);}
    kill(ant){
      if(ant.dead)return;ant.dead=true;this.clearTask(ant);this.deadCount++;
      this.dropFoodCargo(ant);
      if(ant.carry){const carried=this.ants.find(a=>a.id===ant.carry);if(carried){carried.carriedBy=null;carried.x=ant.x;carried.y=ant.y;}ant.carry=null;}
      this.trash.push({id:this.uid('t'),x:ant.x,y:ant.treeHost?(C.SURFACE+.5)*C.CELL:ant.y,type:'corpse',created:this.time});
      if(ant.type==='queen'){this.over=true;this.record('여왕개미가 사망했습니다.',true,false);}
    }
    reservationKeys(ant,task){
      const keys=task?.key?[task.key]:[];
      // Claim the recipient before fetching its meal, and share the same
      // recipient lock for care and transport. Other workers can select the
      // next available target while this worker is still travelling.
      const target=task?.type==='carry'?task.target:task?.type==='forage'?task.mealTarget:null;
      if(target&&target!==ant.id)keys.push('service:'+target);
      return [...new Set(keys)];
    }
    clearTask(ant){
      const task=ant.task;for(const key of this.reservationKeys(ant,task))if(this.reservations[key]===ant.id)delete this.reservations[key];
      if(task?.jobId){const job=this.jobs.find(j=>j.id===task.jobId);if(job&&job.status!=='done'){job.status='pending';job.worker=null;job.progress=0;}}
      ant.task=null;ant.stuck=0;ant.yieldGoal=null;ant.detour=null;ant.traffic=null;ant.passing=null;
    }
    assign(ant,task){
      if(!task.goal)return false;
      const keys=this.reservationKeys(ant,task);if(keys.some(key=>this.reservations[key]))return false;
      const path=ant.treeHost&&distance(ant,task.goal)<.1?[]:this.findPath(ant,task.goal,!['move','fill'].includes(task.type));if(path===null)return false;
      task.path=path;task.pathFrom=this.at(ant)?.index;task.progress=0;task.stage='move';task.created=this.time;task.range=task.range??14;
      for(const key of keys)this.reservations[key]=ant.id;
      ant.task=task;ant.stuck=0;return true;
    }
    sleepTask(ant){
      const kind=ant.type==='queen'?'queen':'rest',current=this.rooms.find(r=>r.id===this.at(ant)?.room),stay=kind==='queen'&&current?.type==='queen'&&this.walkable(this.at(ant),true);
      const room=stay?{room:current,point:{x:ant.x,y:ant.y}}:this.roomFor(kind,ant);
      return {type:'sleep',goal:room?.point??{x:ant.x,y:ant.y},roomId:room?.room.id,duration:100,range:6};
    }
    chooseTask(ant){
      if(ant.task||ant.dead||ant.carriedBy||['egg','larva','aphid'].includes(ant.type)||this.at(ant)?.water>=.025)return;
      const allEnemies=this.ants.filter(a=>a.type==='enemy'&&!a.dead&&!a.carriedBy);
      if(ant.type==='enemy'){
        const target=this.ants.filter(a=>['queen','worker','soldier'].includes(a.type)&&!a.dead&&!a.carriedBy).sort((a,b)=>distance(ant,a)-distance(ant,b))[0];
        if(target)this.assign(ant,{type:'fight',target:target.id,goal:{x:target.x,y:target.y},range:RADIUS[ant.type]+RADIUS[target.type]+7,duration:1});return;
      }
      const filling=this.jobs.some(j=>j.type==='fill'&&j.status!=='done'&&(j.cell===this.at(ant)?.index||this.fillTouches(ant,j.cell)));
      if(filling){const p=this.relocatePoint(ant);if(p&&this.assign(ant,{type:'move',goal:p,duration:0,range:2}))return;}
      if(ant.energy<=0){this.assign(ant,this.sleepTask(ant));return;}
      if(ant.type==='soldier'&&allEnemies.length){
        allEnemies.sort((a,b)=>distance(ant,a)-distance(ant,b));
        for(const target of allEnemies)if(this.assign(ant,{type:'fight',target:target.id,goal:{x:target.x,y:target.y},range:RADIUS.soldier+RADIUS.enemy+7,duration:1}))return;
      }
      if(ant.type==='queen'){
        if(ant.energy<=30){this.assign(ant,this.sleepTask(ant));return;}
        const room=this.roomFor('queen',ant);if(room&&distance(room.point,ant)>8)this.assign(ant,{type:'move',goal:room.point,duration:0,range:6});return;
      }
      if(ant.hunger<=50){
        if(ant.foodCargo&&this.assign(ant,{type:'eat',goal:{x:ant.x,y:ant.y},duration:2,range:1}))return;
        if(this.food>0&&this.assign(ant,{type:'eat',goal:this.foodPoint(ant),duration:2,range:18}))return;
        if(this.assignLooseMeal(ant))return;
      }
      if(ant.energy<=30&&this.assign(ant,this.sleepTask(ant)))return;
      if(ant.foodCargo){
        const target=this.ants.find(a=>a.id===ant.foodCargo.mealTarget&&!a.dead&&a.hunger<100);
        if(target&&this.assign(ant,{type:'feed',target:target.id,goal:{x:target.x,y:target.y},duration:2,key:'service:'+target.id,range:RADIUS[ant.type]+RADIUS[target.type]+12}))return;
        const goal=this.foodPoint(ant);if(goal&&this.assign(ant,{type:'forage',goal,duration:1,key:'forage:'+ant.id,deliveryDone:true}))return;
        this.dropFoodCargo(ant);
      }
      const targets=(type,test)=>this.ants.filter(a=>a.type===type&&!a.dead&&!a.carriedBy&&test(a)).sort((a,b)=>distance(ant,a)-distance(ant,b));
      const service=(type,target,duration)=>this.assign(ant,{type,target:target.id,goal:{x:target.x,y:target.y},duration,key:'service:'+target.id,range:RADIUS[ant.type]+RADIUS[target.type]+12});
      if(ant.type==='soldier'){
        if(ant.hygiene<=30&&this.assign(ant,{type:'clean',target:ant.id,goal:{x:ant.x,y:ant.y},duration:5}))return;
        const guard=this.roomFor('guard',ant);if(guard&&distance(guard.point,ant)>8)this.assign(ant,{type:'move',goal:guard.point,duration:0,range:6});return;
      }
      // This order is the design's worker priority list. Existing tasks are never
      // interrupted by a newly appearing higher priority demand.
      for(const queen of targets('queen',a=>a.hygiene<=30))if(service('clean',queen,5))return;
      if(this.food>0)for(const queen of targets('queen',a=>a.hunger<=50||a.needsFullMeal))if(service('feed',queen,2))return;
      if(!this.food)for(const queen of targets('queen',a=>a.hunger<=50||a.needsFullMeal))if(this.assignLooseMeal(ant,queen))return;
      if(this.food>0)for(const larva of targets('larva',a=>a.hunger<=50))if(service('feed',larva,2))return;
      if(!this.food)for(const larva of targets('larva',a=>a.hunger<=50))if(this.assignLooseMeal(ant,larva))return;
      for(const larva of targets('larva',a=>a.hygiene<=30))if(service('clean',larva,5))return;
      for(const egg of targets('egg',a=>a.hygiene<=30))if(service('clean',egg,5))return;
      if(ant.hygiene<=30&&this.assign(ant,{type:'clean',target:ant.id,goal:{x:ant.x,y:ant.y},duration:5}))return;
      if(ant.carry){
        const target=this.ants.find(a=>a.id===ant.carry&&!a.dead);
        if(!target)ant.carry=null;
        else{const destination=this.roomFor(target.type==='aphid'?'aphid':target.type,ant);if(destination)this.assign(ant,{type:'carry',target:target.id,goal:destination.point,destinationRoom:destination.room.id,delivery:true,duration:1,key:'carry:'+target.id,range:12});return;}
      }
      for(const target of this.ants.filter(a=>['egg','larva','aphid'].includes(a.type)&&!a.dead&&!a.carriedBy)){
        const kind=target.type==='aphid'?'aphid':target.type;
        const destination=this.roomFor(kind,ant);if(!destination)continue;
        const central=this.roomPoint(destination.room,target);
        const current=this.at(target),needsCarry=current?.water>=.025||!destination.room.cells.includes(current?.index)||(central&&distance(target,central)>C.CELL*.7)||this.jobs.some(j=>j.type==='fill'&&j.status!=='done'&&j.cell===current?.index);
        if(!needsCarry)continue;
        let pickup={x:target.x,y:target.y};
        if(current?.water>=.025){const shore=this.adjacent(current).filter(t=>this.walkable(t,true)).sort((a,b)=>distance(this.point(a),ant)-distance(this.point(b),ant))[0];if(!shore)continue;pickup=this.point(shore);}
        if(this.assign(ant,{type:'carry',target:target.id,goal:pickup,destination:destination.point,destinationRoom:destination.room.id,duration:1,key:'carry:'+target.id,range:current?.water>=.025?C.CELL+2:22}))return;
      }
      for(const room of this.rooms)if(room.type==='mushroom'&&this.hasWaterNear(room)&&!room.planted){const p=this.roomPoint(room,ant);if(p&&this.assign(ant,{type:'plant',roomId:room.id,goal:p,duration:3,key:'crop:'+room.id}))return;}
      for(const aphid of targets('aphid',a=>a.hygiene<=30))if(service('tend',aphid,5))return;
      for(const type of ['harvest','honey'])for(const room of this.rooms)if(room.type===(type==='harvest'?'mushroom':'aphid')&&room.crop>=30){const p=this.roomPoint(room,ant);if(p&&this.assign(ant,{type,roomId:room.id,goal:p,duration:3,key:'crop:'+room.id}))return;}
      const candidate=this.foodPoint(ant),storageGoal=candidate&&this.findPath(ant,candidate)!==null?candidate:null;
      for(const chunk of this.foodChunks.filter(c=>storageGoal&&!c.falling&&c.age>=.45&&this.at(c)?.open).sort((a,b)=>distance(ant,a)-distance(ant,b))){
        const wet=this.at(chunk).water>=.025,shore=wet?this.adjacent(this.at(chunk)).filter(t=>this.walkable(t,true)).sort((a,b)=>distance(ant,this.point(a))-distance(ant,this.point(b)))[0]:null;
        if(wet&&!shore)continue;
        if(this.assign(ant,{type:'forage',chunkId:chunk.id,goal:shore?this.point(shore):{x:chunk.x,y:chunk.y},range:wet?C.CELL+2:12,duration:.35,key:'food:'+chunk.id}))return;
      }
      // At or below five foods per living adult, forage before construction.
      // Only food already deposited in storage counts toward the target.
      if(!this.foodChunks.some(c=>c.age<.45)&&this.food<=this.counts().total*5){
        if(this.assignForage(ant))return;
      }
      if(ant.toiletNeed>=3){const toilet=this.roomFor('toilet',ant);if(toilet&&this.assign(ant,{type:'toilet',goal:toilet.point,duration:2}))return;}
      for(const type of ['dig','fill']){
        const jobs=this.jobs.filter(j=>j.type===type&&j.status==='pending');if(type==='fill')jobs.sort((a,b)=>this.tiles[b.cell].y-this.tiles[a.cell].y||b.created-a.created);
        for(const job of jobs){
          if(type==='fill'&&!this.safeToFill(job.cell))continue;
          const t=this.tiles[job.cell];const neighbors=this.neighbors(t).filter(n=>this.walkable(n,type!=='fill')).sort((a,b)=>distance(this.point(a),ant)-distance(this.point(b),ant));
          for(const n of neighbors)if(this.assign(ant,{type,goal:this.point(n),duration:1,jobId:job.id,key:'job:'+job.id,range:22})){job.status='active';job.worker=ant.id;return;}
        }
      }
      const disposal=this.roomFor('trash',ant);
      if(disposal)for(const trash of this.trash){if(this.at(trash)?.water>=.025)continue;if(this.assign(ant,{type:'trash',goal:{x:trash.x,y:trash.y},target:trash.id,destination:disposal.point,duration:2,key:'trash:'+trash.id,range:18}))return;}
      // Idle workers forage even when the colony already has enough food.
      // With no unclaimed resource, search the surface without creating food.
      if(storageGoal&&this.foodChunks.some(c=>c.falling)&&this.assign(ant,{type:'forage',searching:true,goal:{x:ant.x,y:ant.y},duration:.5,key:'forage:'+ant.id}))return;
      if(this.assignForage(ant,true))return;
      const bounds=this.viewBounds(),column=clamp(Math.floor(ant.x/C.CELL)+(this.random()<.5?-1:1)*(3+Math.floor(this.random()*5)),bounds.minX+1,bounds.maxX-1);
      if(this.assign(ant,{type:'forage',searching:true,goal:{x:(column+.5)*C.CELL,y:(C.SURFACE+.5)*C.CELL},duration:2,key:'forage:'+ant.id}))return;
      // Finite idle moves distribute ants over rooms rather than pinning a doorway.
      const room=this.rooms.filter(r=>this.roomTiles(r).length).sort(()=>this.random()-.5)[0];
      if(room){const p=this.roomPoint(room,ant);if(p&&distance(p,ant)>12)this.assign(ant,{type:'wander',goal:p,duration:0,range:6});}
      if(!ant.task&&this.ants.some(other=>other!==ant&&other.task&&['dig','fill'].includes(other.task.type)&&distance(ant,other.task.goal)<40)){
        const p=this.relocatePoint(ant);if(p)this.assign(ant,{type:'move',goal:p,duration:0,range:10});
      }
      if(!ant.task&&ant.treeHost){const host=this.treeHabitat(ant.treeHost);if(host)this.assign(ant,{type:'move',goal:host.base,duration:0,range:2});}
    }
    terrainFits(ant,x,y){
      const r=RADIUS[ant.type],host=ant.treeHost&&this.treeHabitat(ant.treeHost);
      for(const [dx,dy] of [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.707,r*.707],[-r*.707,r*.707],[r*.707,-r*.707],[-r*.707,-r*.707]]){
        const px=x+dx,py=y+dy,t=this.tile(Math.floor(px/C.CELL),Math.floor(py/C.CELL));
        if((!this.groundContains(px,py)&&!(host&&this.treeContains(host,{x:px,y:py})))||(t?.water??0)>=.025)return false;
      }
      return true;
    }
    canStand(ant,x,y){
      if(!this.terrainFits(ant,x,y))return false;const p={x,y},r=RADIUS[ant.type];
      if(isAdultAnt(ant))for(const other of this.ants)if(isAdultAnt(other)&&other!==ant&&other.id!==ant.id&&!other.dead&&!other.carriedBy&&distance(p,other)<r+RADIUS[other.type]+.2)return false;
      return true;
    }
    recoverTunnelAnt(ant,target=null){
      const cell=this.at(ant),r=RADIUS[ant.type];
      if(!isAdultAnt(ant)||ant.dead||ant.carriedBy||!cell||cell.y<=C.SURFACE||cell.water>=.025||(!cell.open&&['rock','root'].includes(cell.kind))||this.time<(ant.unstickAfter??0))return false;
      const clipped=!this.terrainFits(ant,ant.x,ant.y);
      if(!clipped){
        if(!target||distance(ant,target)<2)return false;
        const d=distance(ant,target),p={x:ant.x+(target.x-ant.x)*2/d,y:ant.y+(target.y-ant.y)*2/d};
        if(this.terrainFits(ant,p.x,p.y))return false;
      }
      // Room excavation can replace a diagonal strip just like a road turn.
      // Recover into the nearest connected dry space, including room edges.
      const space=t=>t?.open&&t.y>C.SURFACE&&t.water<.025;
      const nearby=[];for(let y=cell.y-1;y<=cell.y+1;y++)for(let x=cell.x-1;x<=cell.x+1;x++){const t=this.tile(x,y);if(space(t)&&distance(ant,this.point(t))<=C.CELL)nearby.push(t);}
      nearby.sort((a,b)=>distance(ant,this.point(a))-distance(ant,this.point(b)));
      const anchor=space(cell)?cell:(target&&nearby.find(t=>this.findPath(this.point(t),target)!==null))||nearby[0];
      if(!anchor)return false;
      const local=new Set([anchor.index]),queue=[anchor];
      for(const t of queue)for(const n of this.neighbors(t))if(space(n)&&Math.abs(n.x-cell.x)<=1&&Math.abs(n.y-cell.y)<=1&&!local.has(n.index)){local.add(n.index);queue.push(n);}
      const clearPush=p=>{
        let entered=!clipped;const steps=Math.ceil(distance(ant,p)/2);
        for(let i=1;i<=steps;i++){
          const q={x:ant.x+(p.x-ant.x)*i/steps,y:ant.y+(p.y-ant.y)*i/steps};
          if((!clipped&&!this.trafficAllows(ant,q))||this.ants.some(a=>isAdultAnt(a)&&a!==ant&&a.id!==ant.id&&!a.dead&&!a.carriedBy&&distance(q,a)<r+RADIUS[a.type]+.2))return false;
          for(const [dx,dy] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){const t=this.at({x:q.x+dx,y:q.y+dy});if(!t||t.water>=.025||(!t.open&&['rock','root'].includes(t.kind)))return false;}
          const fits=this.terrainFits(ant,q.x,q.y);if(entered&&!fits)return false;if(fits)entered=true;
        }return entered;
      };
      ant.unstickAfter=this.time+.25;
      let spot=null;
      for(let radius=1;radius<=C.CELL&&!spot;radius++){
        const candidates=[];
        for(let i=0;i<32;i++){
          const p={x:ant.x+Math.cos(i*Math.PI/16)*radius,y:ant.y+Math.sin(i*Math.PI/16)*radius};
          if(!local.has(this.at(p)?.index)||!this.canStand(ant,p.x,p.y))continue;
          if(!clipped&&target){const d=distance(p,target);if(d<.1)continue;const forward={x:p.x+(target.x-p.x)*2/d,y:p.y+(target.y-p.y)*2/d};if(!this.canStand(ant,forward.x,forward.y)||!this.trafficAllows(ant,forward))continue;}
          if(clearPush(p))candidates.push(p);
        }
        spot=candidates.sort((a,b)=>target?distance(a,target)-distance(b,target):distance(a,this.point(anchor))-distance(b,this.point(anchor)))[0];
      }
      if(!spot)return false;
      const before={x:ant.x,y:ant.y},moved=distance(ant,spot);ant.angle=Math.atan2(spot.y-ant.y,spot.x-ant.x)+Math.PI/2;ant.x=spot.x;ant.y=spot.y;ant.phase+=moved*.22;ant.moving=true;ant.stuck=0;
      ant.detour=null;ant.yieldGoal=null;ant.traffic=null;ant.passing=null;ant.replan=0;
      for(const task of [ant.task,ant.resume])if(task){
        if(['sleep','eat','clean'].includes(task.type)&&(!task.target||task.target===ant.id)&&distance(task.goal,before)<.1)task.goal={x:ant.x,y:ant.y};
        task.path=this.findPath(ant,task.goal,!['move','fill'].includes(task.type))??[];task.pathFrom=this.at(ant)?.index;task.navKey=null;task.lastProgress=this.time;
      }
      if(ant.carry){const baby=this.ants.find(a=>a.id===ant.carry);if(baby){baby.x=ant.x;baby.y=ant.y;}}
      return true;
    }
    treeHabitats(){
      const signature=this.fruitPlants.map(p=>`${p.id}:${p.x}`).join('|');
      if(this._treeHabitats?.signature===signature)return this._treeHabitats.hosts;
      const ground=(C.SURFACE+1)*C.CELL,hosts=[{id:'tree-main',x:C.TREE_X*C.CELL,ground,width:C.CELL*10,height:ground-TREE_TOP,walkTop:ground-C.CELL*14,main:true},...this.fruitPlants.map(p=>({id:p.id,x:p.x,ground:ground-3,width:C.CELL,height:C.CELL*6,main:false}))];
      for(const host of hosts){
        host.top=host.ground-host.height*(host.main?1:.84);host.base={x:host.x,y:(C.SURFACE+.5)*C.CELL};host.nodes=[];
        const levels=host.main?14:6,spread=host.width*(host.main?.25:.25);
        // The main trunk extends beyond the map; harvesting routes use its
        // accessible lower section and retain existing trunk node positions.
        for(let level=0;level<=levels;level++)for(const offset of [0,-spread,spread])host.nodes.push({x:host.x+offset,y:host.base.y+((host.walkTop??host.top)+9-host.base.y)*level/levels,zone:'trunk',links:[]});
        host.entries=[0,1,2];
        if(!host.main){
          for(const [dx,dy] of FRUIT_CROWN)host.nodes.push({x:host.x+dx*C.CELL,y:host.ground+dy*host.height,zone:'leaf',links:[]});
          for(const [dx,dy] of FRUIT_OFFSETS)host.nodes.push({x:host.x+dx*C.CELL,y:host.ground+dy*host.height,zone:'fruit',links:[]});
        }
        // Edges stay inside the trunk/leaves, including the insect's body.
        const segmentFits=(a,b)=>{const steps=Math.ceil(distance(a,b)/4);for(let k=0;k<=steps;k++){const p={x:a.x+(b.x-a.x)*k/steps,y:a.y+(b.y-a.y)*k/steps};if(![[0,0],[7,0],[-7,0],[0,7],[0,-7]].every(([dx,dy])=>this.treeContains(host,{x:p.x+dx,y:p.y+dy})))return false;}return true;};
        const link=(i,j)=>{if(segmentFits(host.nodes[i],host.nodes[j])){host.nodes[i].links.push(j);host.nodes[j].links.push(i);}};
        for(let level=0;level<=levels;level++){const i=level*3;link(i,i+1);link(i,i+2);if(level<levels)for(let column=0;column<3;column++)link(i+column,i+column+3);}
        for(let i=(levels+1)*3;i<host.nodes.length;i++)for(const j of host.nodes.map((p,j)=>({j,d:distance(p,host.nodes[i])})).filter(p=>p.j<i).sort((a,b)=>a.d-b.d).slice(0,5))link(i,j.j);
      }
      this._treeHabitats={signature,hosts};return hosts;
    }
    treeHabitat(id){return this.treeHabitats().find(h=>h.id===id);}
    treeContains(host,p){
      const x=p.x-host.x,y=p.y-host.ground;
      const half=host.width/2*(host.main?.86+.14*clamp((p.y-host.top)/host.height,0,1):1);
      if(p.y>=host.top&&p.y<=host.ground&&Math.abs(x)<=half)return true;
      if(host.main)return false;
      return FRUIT_CROWN.some(([dx,dy,rx,ry])=>((x-dx*C.CELL)/(rx*C.CELL))**2+((y-dy*host.height)/(ry*host.height))**2<=1);
    }
    attachFoodBug(bug){
      if(['arriving','leaving'].includes(bug.lifecycle)&&Array.isArray(bug.travelRoute))return;
      bug.lifecycle??='attached';
      const host=bug.hostId&&this.treeHabitat(bug.hostId);
      if(host?.nodes[bug.node]&&(bug.nextNode==null||host.nodes[bug.nextNode])&&this.foodBugFits(bug,bug))return;
      const choices=this.treeHabitats().flatMap(host=>host.nodes.filter(n=>n.links.length).map(node=>({host,node,d:distance(bug,node)}))).sort((a,b)=>a.d-b.d),choice=choices[0];
      if(choice)Object.assign(bug,{hostId:choice.host.id,node:choice.host.nodes.indexOf(choice.node),nextNode:null,x:choice.node.x,y:choice.node.y,angle:0});
    }
    foodBugGoal(bug,ant){
      if(['arriving','leaving'].includes(bug.lifecycle))return null;
      const host=this.treeHabitat(bug.hostId);if(!host)return {x:bug.x,y:bug.y};
      const entries=host.entries.map(i=>({...host.nodes[i],treeNode:i})).filter(p=>this.canStand(ant,p.x,p.y));
      return entries.sort((a,b)=>distance(ant,a)-distance(ant,b))[0]??null;
    }
    treeRoute(host,from,to){
      const queue=[from],parent=new Map([[from,null]]);for(let n=0;n<queue.length;n++){const i=queue[n];if(i===to){const route=[];let j=i;while(parent.get(j)!==null){route.unshift(j);j=parent.get(j);}return route;}for(const j of host.nodes[i].links)if(!parent.has(j)){parent.set(j,i);queue.push(j);}}return null;
    }
    updateTreeTask(ant,dt){
      const task=ant.task,host=this.treeHabitat(ant.treeHost);if(!host){delete ant.treeHost;return false;}
      // Emergency rest and meals carried by a worker can finish in place.
      if(['sleep','eat','clean'].includes(task.type)&&distance(ant,task.goal)<.1)return false;
      const bug=task.type==='forage'&&!task.treeCaught?this.foodBugs.find(b=>b.id===task.target&&b.hostId===host.id&&!['arriving','leaving'].includes(b.lifecycle)):null;
      ant.traffic=null;ant.passing=null;ant.detour=null;
      if(bug&&distance(ant,bug)<=task.range){
        task.treePhase='catch';task.progress+=dt;
        if(task.progress>=task.duration){this.scatterFood(bug,5,'#d6b36f','bug');this.foodBugs=this.foodBugs.filter(b=>b!==bug);task.treeCaught=true;task.treeRoute=null;}
        return true;
      }
      task.treePhase=bug?'hunt':'return';
      const current=Number.isInteger(ant.treeNode)?ant.treeNode:host.nodes.reduce((best,p,i)=>distance(ant,p)<distance(ant,host.nodes[best])?i:best,0);
      const destination=bug?(bug.nextNode??bug.node):host.entries.reduce((best,i)=>distance(ant,host.nodes[i])<distance(ant,host.nodes[best])?i:best,0);
      if(!task.treeRoute?.length||task.treeDestination!==destination){
        task.treeRoute=this.treeRoute(host,current,destination)??[];
        if(distance(ant,host.nodes[current])>2)task.treeRoute.unshift(current);
        task.treeDestination=destination;
      }
      if(task.treeRoute.length){const i=task.treeRoute[0],p=host.nodes[i];this.move(ant,p,dt);if(distance(ant,p)<1){ant.treeNode=i;task.treeRoute.shift();}return true;}
      if(!bug&&distance(ant,host.nodes[destination])<2){
        delete ant.treeHost;delete ant.treeNode;delete task.treeRoute;
        if(task.treeCaught||task.type==='move'){this.clearTask(ant);return true;}
        task.stage='move';task.path=this.findPath(ant,task.goal)??[];task.pathFrom=this.at(ant)?.index;task.navKey=null;
      }return true;
    }
    foodBugFits(bug,p){
      if(['arriving','leaving'].includes(bug.lifecycle)){
        if(bug.travelMode==='fly')return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y<=(C.SURFACE+1)*C.CELL;
        return [[0,0],[7,0],[-7,0],[0,7],[0,-7]].every(([dx,dy])=>this.outdoorContains(p.x+dx,p.y+dy));
      }
      const host=bug.hostId&&this.treeHabitat(bug.hostId);if(host)return [[0,0],[7,0],[-7,0],[0,7],[0,-7]].every(([dx,dy])=>this.treeContains(host,{x:p.x+dx,y:p.y+dy}));
      const r=C.FOOD_BUG_RADIUS,bounds=this.viewBounds();if(p.x<bounds.minX*C.CELL+r+1||p.x>(bounds.maxX+1)*C.CELL-r-1||p.y<C.SURFACE*C.CELL+r||p.y>(C.SURFACE+1)*C.CELL-r)return false;
      return true;
    }
    foodBugEdge(side){const b=this.viewBounds();return (side<0?b.minX:b.maxX+1)*C.CELL+side*26;}
    startFoodBugArrival(bug,mode,side){
      const host=this.treeHabitat(bug.hostId),landing=host.nodes[bug.node];
      bug.lifecycle='arriving';bug.travelMode=mode??(this.random()<.5?'fly':'crawl');bug.travelSide=side??(this.random()<.5?-1:1);bug.landingNode=bug.node;
      bug.x=this.foodBugEdge(bug.travelSide);bug.travelRoute=[];bug.flightSpeed=100+this.random()*30;
      if(bug.travelMode==='fly'){
        bug.y=Math.max(-C.CELL*14+20,landing.y-50-this.random()*60);
        bug.travelRoute=[{x:(bug.x+landing.x)/2,y:Math.max(-C.CELL*14+20,Math.min(bug.y,landing.y)-35)},{x:landing.x,y:landing.y,treeNode:bug.node}];
      }else{
        bug.y=host.base.y;
        const entry=host.entries.reduce((best,i)=>Math.abs(host.nodes[i].x-bug.x)<Math.abs(host.nodes[best].x-bug.x)?i:best,host.entries[0]);
        const route=[entry,...this.treeRoute(host,entry,bug.node)];
        bug.travelRoute=route.map(i=>({x:host.nodes[i].x,y:host.nodes[i].y,treeNode:i}));bug.node=entry;
      }
      const target=bug.travelRoute[0];bug.angle=Math.atan2(target.y-bug.y,target.x-bug.x)+Math.PI/2;bug.moving=true;
    }
    startFoodBugDeparture(bug){
      const host=this.treeHabitat(bug.hostId);bug.lifecycle='leaving';bug.travelMode??='fly';bug.flightSpeed??=110;
      bug.travelSide??=Math.abs(bug.x-this.foodBugEdge(-1))<Math.abs(bug.x-this.foodBugEdge(1))?-1:1;
      const edge=this.foodBugEdge(bug.travelSide);
      if(bug.travelMode==='crawl'&&host){
        const current=host.nodes.reduce((best,p,i)=>distance(bug,p)<distance(bug,host.nodes[best])?i:best,0);
        const entry=host.entries.reduce((best,i)=>Math.abs(host.nodes[i].x-edge)<Math.abs(host.nodes[best].x-edge)?i:best,host.entries[0]);
        bug.travelRoute=[current,...this.treeRoute(host,current,entry)].map(i=>({x:host.nodes[i].x,y:host.nodes[i].y,treeNode:i}));
        bug.travelRoute.push({x:edge,y:host.base.y});
      }else{
        bug.travelMode='fly';const y=Math.max(-C.CELL*14+20,bug.y-70);
        bug.travelRoute=[{x:(bug.x+edge)/2,y},{x:edge,y}];
      }
    }
    updateFoodBugTravel(bug,dt){
      let remaining=dt;
      while(bug.travelRoute.length&&remaining>0){
        const target=bug.travelRoute[0],d=distance(bug,target),speed=bug.travelMode==='fly'?bug.flightSpeed:(Math.min(bug.y,target.y)<(C.SURFACE+.5)*C.CELL-1?bug.speed:28),step=Math.min(d,speed*remaining);
        if(d>.001){bug.angle=Math.atan2(target.y-bug.y,target.x-bug.x)+Math.PI/2;bug.x+=(target.x-bug.x)*step/d;bug.y+=(target.y-bug.y)*step/d;bug.phase+=step*.6;bug.moving=step>.01;}
        remaining-=d/speed;
        if(d<=step+.001){bug.x=target.x;bug.y=target.y;if(target.treeNode!=null)bug.node=target.treeNode;bug.travelRoute.shift();}else break;
      }
      if(bug.travelRoute.length)return;
      if(bug.lifecycle==='arriving'){
        bug.lifecycle='attached';bug.node=bug.landingNode;bug.nextNode=null;bug.previousNode=null;bug.age=0;delete bug.landingNode;delete bug.travelRoute;
      }else{
        // A growing map may reveal the old exit; continue to its new edge.
        const b=this.viewBounds();if(bug.x<b.minX*C.CELL-20||bug.x>(b.maxX+1)*C.CELL+20)bug.departed=true;
        else bug.travelRoute=[{x:this.foodBugEdge(bug.travelSide),y:bug.y}];
      }
    }
    spawnFoodBug({arrival=true,mode,side}={}){
      if(this.foodBugs.length>=C.FOOD_BUG_LIMIT)return null;
      const bounds=this.viewBounds(),hosts=this.treeHabitats().filter(h=>h.base.x>bounds.minX*C.CELL&&h.base.x<(bounds.maxX+1)*C.CELL);if(!hosts.length)return null;
      const host=hosts[Math.floor(this.random()*hosts.length)],upper=this.random()<.7,nodes=host.nodes.map((node,i)=>({node,i})).filter(({node,i})=>node.links.length&&this.treeRoute(host,host.entries[0],i)&&(!upper||(host.main?node.y<host.ground-C.CELL*5:node.zone!=='trunk')));
      const {node,i}=nodes[Math.floor(this.random()*nodes.length)],bug={id:this.uid('b'),x:node.x,y:node.y,hostId:host.id,node:i,nextNode:null,angle:0,dir:1,speed:8+this.random()*8,variant:this.random()<.5?'green':'gold',phase:0,age:0,moving:false,lifecycle:'attached'};
      if(arrival)this.startFoodBugArrival(bug,mode,side);
      this.foodBugs.push(bug);return bug;
    }
    updateFoodBugs(dt){
      if(this.time>=this.nextFoodBug){const bug=this.spawnFoodBug();this.nextFoodBug=this.time+25+this.random()*30;if(bug)this.record('먹이 벌레가 나무로 다가옵니다. 나무에 붙으면 일꾼이 올라가 잡습니다.',false,false);}
      for(const bug of this.foodBugs){
        bug.moving=false;
        if(['arriving','leaving'].includes(bug.lifecycle)){this.updateFoodBugTravel(bug,dt);continue;}
        bug.age+=dt;
        if(bug.age>=C.FOOD_BUG_LIFE&&!this.reservations['prey:'+bug.id]){this.startFoodBugDeparture(bug);this.updateFoodBugTravel(bug,dt);continue;}
        const hunter=this.ants.find(a=>!a.dead&&a.task?.type==='forage'&&a.task.target===bug.id&&!a.task.deliveryDone&&(a.task.stage==='act'||a.task.treePhase==='catch')&&distance(a,bug)<=a.task.range+2);
        if(hunter)continue;
        const host=bug.hostId&&this.treeHabitat(bug.hostId);
        if(host){
          if(bug.nextNode==null){const links=host.nodes[bug.node].links,choices=links.filter(i=>i!==bug.previousNode);bug.nextNode=(choices.length?choices:links)[Math.floor(this.random()*(choices.length||links.length))];}
          const target=host.nodes[bug.nextNode],d=distance(bug,target),step=Math.min(d,bug.speed*dt);bug.angle=Math.atan2(target.y-bug.y,target.x-bug.x)+Math.PI/2;
          if(d>.001){bug.x+=(target.x-bug.x)*step/d;bug.y+=(target.y-bug.y)*step/d;bug.phase+=step*.6;bug.moving=step>.01;}
          if(d<=step+.01){bug.previousNode=bug.node;bug.node=bug.nextNode;bug.nextNode=null;}continue;
        }
        bug.turn-=dt;if(bug.turn<=0){bug.dir=this.random()<.5?-1:1;bug.turn=2+this.random()*5;}
        const p={x:bug.x+bug.dir*bug.speed*dt,y:clamp(bug.y+Math.sin(bug.age*.8)*dt*2,C.SURFACE*C.CELL+9,(C.SURFACE+1)*C.CELL-9)};
        if(this.foodBugFits(bug,p)){const moved=distance(bug,p);bug.x=p.x;bug.y=p.y;bug.phase+=moved*.6;bug.moving=moved>.01;}else{bug.dir*=-1;bug.turn=1;}
      }
      this.foodBugs=this.foodBugs.filter(b=>!b.departed);
    }
    grubFits(bug,x,y){
      const r=6;
      return [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.707,r*.707],[-r*.707,r*.707],[r*.707,-r*.707],[-r*.707,-r*.707]].every(([dx,dy])=>{const t=this.tile(Math.floor((x+dx)/C.CELL),Math.floor((y+dy)/C.CELL));return t?.open&&t.cave===bug.cave&&this.groundContains(x+dx,y+dy);});
    }
    updateGrubs(dt){
      for(const bug of this.grubs){
        bug.phase+=dt*3;bug.moving=false;
        if(this.ants.some(a=>!a.dead&&a.task?.grubId===bug.id&&a.task.stage==='act'&&distance(a,bug)<=a.task.range+2))continue;
        if(!this.grubFits(bug,bug.x,bug.y)){
          const cave=this.caverns.find(c=>c.id===bug.cave),spot=cave?.cells.map(i=>this.point(this.tiles[i])).find(p=>this.grubFits(bug,p.x,p.y));
          if(!spot){bug.buried=true;continue;}Object.assign(bug,spot);
        }
        if(this.at(bug)?.water>=.025){const surface=this.waterPhysics().surface(bug.x,bug.y);if(surface!==null)bug.y+=(surface-3-bug.y)*Math.min(1,dt*3);continue;}
        bug.turn-=dt;if(bug.turn<=0){bug.angle+=(this.random()-.5)*2;bug.turn=1+this.random()*3;}
        const x=bug.x+Math.sin(bug.angle)*bug.speed*dt,y=bug.y-Math.cos(bug.angle)*bug.speed*dt;
        if(this.grubFits(bug,x,y)){bug.x=x;bug.y=y;bug.moving=true;}else{bug.angle+=Math.PI*.65;bug.turn=.5;}
      }
      this.grubs=this.grubs.filter(b=>!b.buried);
    }
    scatterFood(source,nutrition,color='#d6b36f',kind='seed',count=Math.max(3,Math.ceil(nutrition))){
      const created=[],surfaceDrop=source.y<(C.SURFACE+1)*C.CELL;
      for(let i=0;i<count;i++){
        const angle=i*Math.PI*2/count+this.random()*.4,radius=12+this.random()*18;let target={x:source.x,y:source.y};
        for(let r=radius;r>=0;r-=2){const p={x:source.x+Math.cos(angle)*r,y:surfaceDrop?source.y:source.y+Math.sin(angle)*r};if(surfaceDrop||[[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>this.groundContains(p.x+dx,p.y+dy))){target=p;break;}}
        const chunk={id:this.uid('f'),x:source.x,y:source.y,startX:source.x,startY:source.y,targetX:target.x,targetY:target.y,age:0,nutrition:1,color,sourceKind:kind,size:3.4+this.random()*1.4,shape:this.random()*Math.PI*2,falling:false,scatterSeconds:.45};
        if(surfaceDrop)this.startSurfaceFoodDrop(chunk);
        this.foodChunks.push(chunk);created.push(chunk);
      }return created;
    }
    startSurfaceFoodDrop(chunk){
      // Keep each whole piece above the soil, irrespective of grass/tree height.
      const floor=(C.SURFACE+1)*C.CELL-(chunk.size??4)*1.1-.4;
      Object.assign(chunk,{surfaceDrop:true,startX:chunk.x,startY:Math.min(chunk.y,floor),targetY:floor,age:0,falling:true,scatterSeconds:Math.max(.45,Math.sqrt(2*Math.max(0,floor-chunk.y)/420))});
      chunk.y=chunk.startY;
    }
    depositFood(){this.food++;}
    updateFoodChunks(dt){
      for(const chunk of this.foodChunks){
        if(!chunk.surfaceDrop&&chunk.y<(C.SURFACE+1)*C.CELL)this.startSurfaceFoodDrop(chunk);
        chunk.age+=dt;
        const duration=chunk.scatterSeconds??.45;
        if(chunk.age<duration){const f=chunk.age/duration,t=chunk.falling?f:1-(1-f)**2;chunk.x=chunk.startX+(chunk.targetX-chunk.startX)*t;chunk.y=chunk.startY+(chunk.targetY-chunk.startY)*(chunk.falling?f*f:t);if(chunk.falling)continue;}
        else if(chunk.age-dt<duration){chunk.x=chunk.targetX;chunk.y=chunk.targetY;chunk.falling=false;}
        const tile=this.at(chunk);if(!tile?.open){
          const neighbor=tile&&this.neighbors(tile).find(t=>t.open&&t.water<.025);if(neighbor){const p=this.point(neighbor);Object.assign(chunk,p,{startX:p.x,startY:p.y,targetX:p.x,targetY:p.y,age:1});}continue;
        }
        if(chunk.age>=.45&&tile.water>=.025){const surface=this.waterPhysics().surface(chunk.x,chunk.y);if(surface!==null)chunk.y+=(surface-2-chunk.y)*Math.min(1,dt*3);}
      }
    }
    travelDirection(ant){
      if(ant.traffic&&ant.task?.stage==='move')return ant.traffic.dir;
      if(ant.task?.stage!=='move')return null;
      const next=this.tiles[ant.task.path?.[0]],previous=this.tiles[ant.task.pathFrom];
      const p=next?this.point(next):ant.task.goal,q=next&&previous?this.point(previous):ant;
      const d=distance(p,q);return d>.1?{x:(p.x-q.x)/d,y:(p.y-q.y)/d}:null;
    }
    opposingTraffic(ant,traffic){
      const {dir,origin}=traffic,right={x:-dir.y,y:dir.x};
      return this.ants.filter(other=>{
        if(!isAdultAnt(ant)||!isAdultAnt(other)||other===ant||other.dead||other.carriedBy)return false;
        const heading=this.travelDirection(other);if(heading&&heading.x*dir.x+heading.y*dir.y>-.5)return false;
        const ahead=(other.x-ant.x)*dir.x+(other.y-ant.y)*dir.y,side=(other.x-origin.x)*right.x+(other.y-origin.y)*right.y;
        return ahead>-26&&ahead<130&&side<4&&side>-C.CELL*.8;
      });
    }
    trafficAllows(ant,p){
      const t=ant.traffic;if(!isAdultAnt(ant)||!t||this.at(ant)?.room||this.at(p)?.room||ant.y<(C.SURFACE+1)*C.CELL)return true;
      const right={x:-t.dir.y,y:t.dir.x},side=(p.x-t.origin.x)*right.x+(p.y-t.origin.y)*right.y;
      const current=(ant.x-t.origin.x)*right.x+(ant.y-t.origin.y)*right.y;
      // A car already overtaking may retreat toward its own lane, but it may
      // not keep advancing into the lane of an approaching owner of that lane.
      if(side<1&&this.opposingTraffic(ant,t).length){
        const advance=(p.x-ant.x)*t.dir.x+(p.y-ant.y)*t.dir.y;
        return side>current+.01||advance<-.01;
      }return true;
    }
    laneTarget(ant,next,previous){
      const p=this.point(next);if(!previous){ant.traffic=null;ant.passing=null;return p;}
      const origin=this.point(previous),d=distance(p,origin),dir={x:(p.x-origin.x)/d,y:(p.y-origin.y)/d},right={x:-dir.y,y:dir.x},lane=Math.min(10.2,C.CELL*C.PATH_WIDTH_RATIO/2-RADIUS[ant.type]-.4);
      if(!isAdultAnt(ant)||next.room||previous.room||next.y<=C.SURFACE||previous.y<=C.SURFACE){ant.traffic=null;ant.passing=null;return p;}
      const traffic={dir,origin,lane};ant.traffic=traffic;
      const oncoming=this.opposingTraffic(ant,traffic);
      const blocker=ant.passing&&this.ants.find(a=>isAdultAnt(a)&&a.id===ant.passing.id&&!a.dead);
      if(ant.passing&&(!blocker||(blocker.x-ant.x)*dir.x+(blocker.y-ant.y)*dir.y<-RADIUS[ant.type]-RADIUS[blocker.type]-8||ant.passing.dir.x*dir.x+ant.passing.dir.y*dir.y<.9))ant.passing=null;
      if(oncoming.length){
        ant.passing=null;
        const side=(ant.x-origin.x)*right.x+(ant.y-origin.y)*right.y;
        if(side<lane-2){const ahead=(ant.x-origin.x)*dir.x+(ant.y-origin.y)*dir.y;return {x:origin.x+dir.x*(ahead-4)+right.x*lane,y:origin.y+dir.y*(ahead-4)+right.y*lane};}
      }else if(!ant.passing){
        const ahead=this.ants.filter(a=>isAdultAnt(a)&&a!==ant&&!a.dead&&!a.carriedBy).map(a=>({ant:a,forward:(a.x-ant.x)*dir.x+(a.y-ant.y)*dir.y,side:(a.x-origin.x)*right.x+(a.y-origin.y)*right.y,heading:this.travelDirection(a)})).filter(a=>a.forward>5&&a.forward<65&&a.side>2&&Math.abs(a.side-lane)<12&&(!a.heading||a.heading.x*dir.x+a.heading.y*dir.y>.7)).sort((a,b)=>a.forward-b.forward)[0];
        if(ahead){
          const longitudinal=(ant.x-origin.x)*dir.x+(ant.y-origin.y)*dir.y;
          const opposite={x:origin.x+dir.x*longitudinal-right.x*lane,y:origin.y+dir.y*longitudinal-right.y*lane};
          const otherPass=this.ants.some(a=>isAdultAnt(a)&&a!==ant&&!a.dead&&a.passing&&distance(a,ant)<85);
          if(!otherPass&&this.canStand(ant,opposite.x,opposite.y))ant.passing={id:ahead.ant.id,dir};
        }
      }
      const sign=ant.passing?-1:1;return {x:p.x+right.x*lane*sign,y:p.y+right.y*lane*sign};
    }
    move(ant,target,dt){
      const d=distance(ant,target);if(d<.2)return true;
      const speed=ant.type==='queen'?25:ant.type==='enemy'?34:ant.type==='soldier'?44:48;
      const step=Math.min(speed*dt,d),dx=(target.x-ant.x)/d,dy=(target.y-ant.y)/d;
      let x=ant.x+dx*step,y=ant.y+dy*step;
      const allowed=(x,y)=>this.canStand(ant,x,y)&&this.trafficAllows(ant,{x,y});
      if(!allowed(x,y)){
        const cell=this.at(ant),room=ant.treeHost||cell?.room||cell?.y===C.SURFACE||(cell&&this.adjacent(cell).some(t=>t.room&&t.open));
        let found=false;
        // Slide along a wall at a corner; never step through another collider.
        for(const p of [{x:ant.x+dx*step,y:ant.y},{x:ant.x,y:ant.y+dy*step}])if(distance(p,ant)>.05&&allowed(p.x,p.y)){x=p.x;y=p.y;found=true;break;}
        if(!found&&room)for(const angle of [.5,-.5,.9,-.9,1.3,-1.3,1.55,-1.55]){const ax=dx*Math.cos(angle)-dy*Math.sin(angle),ay=dx*Math.sin(angle)+dy*Math.cos(angle);x=ant.x+ax*step;y=ant.y+ay*step;if(allowed(x,y)){found=true;break;}}
        if(!found){ant.stuck+=dt;if(ant.stuck>=.4)this.recoverTunnelAnt(ant,target);return false;}
      }
      const moved=Math.hypot(x-ant.x,y-ant.y);ant.angle=Math.atan2(y-ant.y,x-ant.x)+Math.PI/2;ant.x=x;ant.y=y;ant.moving=moved>.01;ant.phase+=moved*.22;ant.stuck=0;
      if(ant.carry){const baby=this.ants.find(a=>a.id===ant.carry);if(baby){baby.x=x;baby.y=y;}}
      return d<=step+.5;
    }
    detourPath(ant,target,range,targetCell=null){
      // A small spatial A* resolves room entrances and turns around stationary
      // bodies. The same collider is used for every node and every actual step.
      const quantum=C.CELL/6,encode=(x,y)=>`${x},${y}`,decode=k=>{const [x,y]=k.split(',').map(Number);return {x,y};},bounds=this.worldBounds;
      const start={x:Math.round(ant.x/quantum),y:Math.round(ant.y/quantum)},minx=Math.max(bounds.minX*6,Math.floor(Math.min(ant.x,target.x)/quantum)-12),maxx=Math.min((bounds.maxX+1)*6-1,Math.ceil(Math.max(ant.x,target.x)/quantum)+12),miny=Math.max(0,Math.floor(Math.min(ant.y,target.y)/quantum)-12),maxy=Math.min((bounds.maxY+1)*6-1,Math.ceil(Math.max(ant.y,target.y)/quantum)+12);
      const heap=[],cost=new Map(),parent=new Map(),stand=new Map();
      const push=node=>{heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
      const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let n=i*2+1;if(n+1<heap.length&&heap[n+1].f<heap[n].f)n++;if(heap[n].f>=last.f)break;heap[i]=heap[n];i=n;}heap[i]=last;}return first;};
      const valid=(x,y)=>{const key=encode(x,y);if(!stand.has(key))stand.set(key,this.canStand(ant,x*quantum,y*quantum)&&this.trafficAllows(ant,{x:x*quantum,y:y*quantum}));return stand.get(key);};
      const startKey=encode(start.x,start.y);cost.set(startKey,0);push({key:startKey,g:0,f:distance(ant,target)/quantum});
      let visits=0;
      while(heap.length&&visits++<1800){
        const node=pop();if(node.g!==cost.get(node.key))continue;const p=decode(node.key),world={x:p.x*quantum,y:p.y*quantum};
        if(node.key!==startKey&&distance(world,target)<=range&&(targetCell===null||this.at(world)?.index===targetCell)){
          const path=[];let key=node.key;while(key!==startKey){const q=decode(key);path.unshift({x:q.x*quantum,y:q.y*quantum});key=parent.get(key);}return path;
        }
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
          const x=p.x+dx,y=p.y+dy;if(x<minx||x>maxx||y<miny||y>maxy||!valid(x,y))continue;
          if(dx&&dy&&!this.canStand(ant,(p.x+dx*.5)*quantum,(p.y+dy*.5)*quantum))continue;
          const key=encode(x,y),g=node.g+(dx&&dy?Math.SQRT2:1);if(g>=(cost.get(key)??Infinity))continue;
          cost.set(key,g);parent.set(key,node.key);push({key,g,f:g+Math.max(0,distance({x:x*quantum,y:y*quantum},target)-range)/quantum});
        }
      }return null;
    }
    updateTask(ant,dt){
      const task=ant.task;if(!task)return;
      if(ant.treeHost&&this.updateTreeTask(ant,dt))return;
      if(task.type==='forage'&&task.deliveryDone&&ant.foodCargo){
        const store=this.foodStorage(),destination=this.at(task.goal);
        if(!store.room){this.dropFoodCargo(ant);this.clearTask(ant);return;}
        const changed=destination?.room!==store.room.id||destination.water>=.025;
        if(changed){const goal=this.foodPoint(ant);this.clearTask(ant);if(goal)this.assign(ant,{type:'forage',goal,duration:1,deliveryDone:true,key:'forage:'+ant.id});return;}
      }
      if(ant.detour?.length){
        const p=ant.detour[0];if(distance(ant,p)<2.5){ant.detour.shift();if(!ant.detour.length){ant.detour=null;task.navKey=null;}return;}
        this.move(ant,p,dt);if(ant.stuck>1.5){ant.detour=null;task.navKey=null;}return;
      }
      if(ant.yieldGoal){
        if(distance(ant,ant.yieldGoal)>10){this.move(ant,ant.yieldGoal,dt);return;}
        ant.yieldGoal=null;ant.stuck=0;task.navKey=null;task.path=this.findPath(ant,task.goal,!['move','fill'].includes(task.type))??[];task.pathFrom=this.at(ant)?.index;
      }
      if(task.type==='fight'){
        const target=this.ants.find(a=>a.id===task.target&&!a.dead);if(!target){this.clearTask(ant);return;}
        task.goal={x:target.x,y:target.y};
        if(ant.replan<=0){task.path=this.findPath(ant,task.goal)??[];task.pathFrom=this.at(ant)?.index;ant.replan=.7;}
      }
      if(task.type==='forage'&&task.target&&!task.deliveryDone){
        const bug=this.foodBugs.find(b=>b.id===task.target);if(!bug){this.clearTask(ant);return;}
        if(['arriving','leaving'].includes(bug.lifecycle)){this.clearTask(ant);return;}
        if(bug.hostId){
          task.catchRange??=task.range;task.range=2;
          if(ant.replan<=0){const goal=this.foodBugGoal(bug,ant);if(!goal){this.clearTask(ant);return;}task.goal=goal;task.path=this.findPath(ant,goal)??[];task.pathFrom=this.at(ant)?.index;ant.replan=.5;}
          if(distance(ant,task.goal)<=2){ant.treeHost=bug.hostId;ant.treeNode=task.goal.treeNode??0;task.range=task.catchRange;task.stage='tree';task.treePhase='hunt';this.updateTreeTask(ant,dt);return;}
          task.stage='move';
        }else task.goal={x:bug.x,y:bug.y};
        if(task.stage==='act'&&distance(ant,bug)>task.range+2){task.stage='move';task.navKey=null;}
        if(ant.replan<=0&&task.stage==='move'){task.path=this.findPath(ant,task.goal)??[];task.pathFrom=this.at(ant)?.index;ant.replan=.5;}
      }
      if(task.type==='forage'&&task.grubId&&!task.deliveryDone){
        const bug=this.grubs.find(b=>b.id===task.grubId);if(!bug){this.clearTask(ant);return;}
        task.goal={x:bug.x,y:bug.y};if(task.stage==='act'&&distance(ant,bug)>task.range+2){task.stage='move';task.navKey=null;}
        if(ant.replan<=0&&task.stage==='move'){task.path=this.findPath(ant,task.goal)??[];task.pathFrom=this.at(ant)?.index;ant.replan=.5;}
      }
      if(task.type==='forage'&&task.chunkId&&!task.deliveryDone){
        const chunk=this.foodChunks.find(c=>c.id===task.chunkId);if(!chunk){this.clearTask(ant);return;}
        if(chunk.falling){this.clearTask(ant);return;}
        if(this.at(chunk)?.water<.025)task.goal={x:chunk.x,y:chunk.y};
      }
      if(task.type==='forage'&&task.plantId&&!task.deliveryDone){
        const plant=this.fruitPlants.find(p=>p.id===task.plantId&&p.fruit>0);if(!plant){this.clearTask(ant);return;}
      }
      if(['clean','tend','feed'].includes(task.type)&&task.target!==ant.id){
        const target=this.ants.find(a=>a.id===task.target&&!a.dead);if(!target){this.clearTask(ant);return;}task.goal={x:target.x,y:target.y};
        if(distance(ant,target)>task.range+4&&task.stage==='act'){task.stage='move';task.navKey=null;}
        if(ant.replan<=0&&task.stage==='move'){task.path=this.findPath(ant,task.goal)??[];task.pathFrom=this.at(ant)?.index;ant.replan=.8;}
      }
      if(task.stage==='move'){
        if(distance(ant,task.goal)<=task.range){task.stage='act';}
        else{
          let p=task.goal,navCell=null,arrival=task.range;
          if(task.path?.length){
            const cell=this.tiles[task.path[0]];if(!this.walkable(cell,!['move','fill'].includes(task.type))){task.path=this.findPath(ant,task.goal,!['move','fill'].includes(task.type));task.pathFrom=this.at(ant)?.index;if(task.path===null){this.clearTask(ant);return;}}
            const next=this.tiles[task.path?.[0]];
            if(next){const previous=this.tiles[task.pathFrom]??this.at(ant);p=this.laneTarget(ant,next,previous);
              const occupied=isAdultAnt(ant)&&this.ants.some(a=>isAdultAnt(a)&&a!==ant&&!a.dead&&!a.carriedBy&&distance(a,p)<RADIUS[a.type]+RADIUS[ant.type]+.3);
              navCell=next.index;arrival=occupied?21.5:5;
              if(distance(ant,p)<(occupied?22:5)&&this.at(ant)?.index===next.index){task.path.shift();task.pathFrom=next.index;return;}}
          }
          if(!task.path?.length){ant.traffic=null;ant.passing=null;}
          this.move(ant,p,dt);
          const navKey=`${p.x.toFixed(1)},${p.y.toFixed(1)}`,remaining=distance(ant,p);
          if(task.navKey!==navKey){task.navKey=navKey;task.bestDistance=remaining;task.lastProgress=this.time;}
          else if(remaining<task.bestDistance-.5){task.bestDistance=remaining;task.lastProgress=this.time;}
          if(ant.stuck>1.2||this.time-task.lastProgress>1.8){
            if(!task.detourAfter||this.time>=task.detourAfter){
              task.detourAfter=this.time+2;const detour=this.detourPath(ant,p,arrival,navCell);
              if(detour?.length){ant.detour=detour;ant.stuck=0;task.lastProgress=this.time;return;}
            }
            const blockers=isAdultAnt(ant)?this.ants.filter(a=>isAdultAnt(a)&&a!==ant&&!a.dead&&!a.carriedBy&&distance(a,ant)<RADIUS[a.type]+RADIUS[ant.type]+4):[];
            const ownOrder=Number(ant.id.slice(1));
            if(blockers.length&&!blockers.some(a=>a.yieldGoal)&&blockers.every(a=>!a.task||a.task.type==='sleep'||Number(a.id.slice(1))<ownOrder)){
              const cell=this.at(ant),candidates=this.adjacent(cell).filter(t=>this.walkable(t,false)).flatMap(t=>{const q=this.point(t);return [q,{x:q.x+9,y:q.y+9},{x:q.x-9,y:q.y-9}];});
              const retreat=candidates.filter(q=>this.canStand(ant,q.x,q.y)&&distance(q,ant)>20&&((q.x-ant.x)*(p.x-ant.x)+(q.y-ant.y)*(p.y-ant.y))<0).sort((a,b)=>distance(b,p)-distance(a,p))[0];
              if(retreat)ant.yieldGoal=retreat;
            }
          }
          // Waiting preserves a task; a failed idle stroll has a finite end.
          if(task.type==='wander'&&this.time-task.created>6)this.clearTask(ant);
          if(ant.stuck>6&&task.type!=='fight'){
            task.path=this.findPath(ant,task.goal,!['move','fill'].includes(task.type));task.pathFrom=this.at(ant)?.index;ant.stuck=0;
            if(this.time-task.created>40)this.clearTask(ant);
          }
          return;
        }
      }
      if(task.type==='sleep'){ant.energy=Math.min(100,ant.energy+5*dt);if(ant.energy>=100){this.clearTask(ant);if(ant.resume){const resume=ant.resume;ant.resume=null;this.assign(ant,resume);}}return;}
      if(task.type==='fight')return;
      if(['clean','tend'].includes(task.type)){
        const target=this.ants.find(a=>a.id===task.target&&!a.dead);if(!target){this.clearTask(ant);return;}target.hygiene=Math.min(100,target.hygiene+20*dt);if(target.hygiene>=20)target.sick=false;
        if(target.hygiene>=99.99){this.clearTask(ant);return;}
      }
      task.progress+=dt;
      if(task.jobId){const job=this.jobs.find(j=>j.id===task.jobId);if(job)job.progress=task.progress;}
      if(task.progress>=task.duration&&!['clean','tend'].includes(task.type))this.finishTask(ant);
    }
    finishTask(ant){
      const task=ant.task;if(!task)return;
      if(['eat','feed'].includes(task.type)){
        const target=task.type==='eat'?ant:this.ants.find(a=>a.id===task.target&&!a.dead);
        if(target&&ant.foodCargo){target.hunger=Math.min(100,target.hunger+30);target.toiletNeed++;ant.foodCargo=null;}
        else if(target&&this.food>0){this.food--;target.hunger=Math.min(100,target.hunger+30);target.toiletNeed++;}
        if(task.type==='feed'&&target?.type==='queen'){
          target.needsFullMeal=target.hunger<100;
          this.tryLayEgg();
          // A queen's meal continues in 30-point portions until she is full.
          // Keep the task reservation while waiting for another food portion.
          if(target.hunger<100&&this.food>0){task.progress=0;return;}
        }
      }else if(['dig','fill'].includes(task.type)){
        const job=this.jobs.find(j=>j.id===task.jobId);if(job){const t=this.tiles[job.cell];
          if(task.type==='dig'){
            if(t.kind==='root'){t.kind='soil';t.rootRemoved=true;this.updateRootDistances();}
            t.open=true;t.room=job.room??null;const room=this.rooms.find(r=>r.id===job.room);if(room&&!room.cells.includes(t.index))room.cells.push(t.index);job.status='done';this.recognizeConnectedCaverns();this.updateMapBounds();
          }
          else if(this.safeToFill(job.cell)){const stock=this.foodStorage();t.open=false;t.room=null;t.water=0;for(const room of this.rooms)room.cells=room.cells.filter(i=>i!==t.index);this.releaseUnstoredFood(stock.point);job.status='done';this.updateMapBounds();}
          else{job.status='pending';job.worker=null;job.progress=0;}
        }
      }else if(task.type==='carry'){
        const target=this.ants.find(a=>a.id===task.target&&!a.dead);
        if(target&&!task.delivery){
          target.carriedBy=ant.id;ant.carry=target.id;
          const next={...task,goal:task.destination,stage:'move',duration:1,range:12,delivery:true};
          this.clearTask(ant);this.assign(ant,next);if(!ant.task){target.carriedBy=null;ant.carry=null;}return;
        }
      }else if(task.type==='forage'){
        if(task.searching){this.clearTask(ant);return;}
        if(!task.deliveryDone){
          if(task.chunkId){
            const chunk=this.foodChunks.find(c=>c.id===task.chunkId);if(!chunk){this.clearTask(ant);return;}
            if(distance(ant,chunk)>task.range+2){task.stage='move';task.progress=0;return;}
            if(!task.mealTarget&&!this.foodPoint(ant)){this.clearTask(ant);return;}
            ant.foodCargo={kind:'chunk',sourceKind:chunk.sourceKind,nutrition:chunk.nutrition,color:chunk.color,size:chunk.size,shape:chunk.shape,mealTarget:task.mealTarget};this.foodChunks=this.foodChunks.filter(c=>c!==chunk);
            const target=this.ants.find(a=>a.id===task.mealTarget&&!a.dead);
            const next=target?{type:target===ant?'eat':'feed',target:target.id,goal:{x:target.x,y:target.y},duration:2,range:target===ant?1:RADIUS[ant.type]+RADIUS[target.type]+12,key:'service:'+target.id}:{type:'forage',goal:this.foodPoint(ant),duration:1,deliveryDone:true,key:'forage:'+ant.id};this.clearTask(ant);this.assign(ant,next);return;
          }
          const plant=task.plantId?this.fruitPlants.find(p=>p.id===task.plantId&&p.fruit>0):null;
          if(task.plantId&&!plant){this.clearTask(ant);return;}
          const bug=task.target?this.foodBugs.find(b=>b.id===task.target):task.grubId?this.grubs.find(b=>b.id===task.grubId):null;
          if((task.target||task.grubId)&&!bug){this.clearTask(ant);return;}
          if(bug&&distance(ant,bug)>task.range+2){task.stage='move';task.progress=0;return;}
          const offset=plant&&FRUIT_OFFSETS[plant.fruit-1],source=plant?{x:plant.x+offset[0]*C.CELL,y:(C.SURFACE+1)*C.CELL-3+offset[1]*C.CELL*6}:bug??ant;this.scatterFood(source,plant?1:5,plant?.color??'#d6b36f',plant?'fruit':bug?'bug':'seed');
          if(plant)plant.fruit--;if(task.target)this.foodBugs=this.foodBugs.filter(b=>b!==bug);if(task.grubId)this.grubs=this.grubs.filter(b=>b!==bug);
          this.clearTask(ant);return;
        }if(ant.foodCargo){if(this.foodStorage().room){this.depositFood();ant.foodCargo=null;}else this.dropFoodCargo(ant);}
      }else if(task.type==='trash'){
        if(!task.deliveryDone){this.trash=this.trash.filter(t=>t.id!==task.target);const next={...task,goal:task.destination,duration:2,deliveryDone:true};this.clearTask(ant);this.assign(ant,next);return;}
      }else if(task.type==='toilet'){ant.toiletNeed=0;this.trash.push({id:this.uid('t'),x:ant.x+10,y:ant.y,type:'waste',created:this.time});}
      else if(['plant','harvest','honey'].includes(task.type)){const room=this.rooms.find(r=>r.id===task.roomId);if(room){if(task.type==='plant')room.planted=true;else{this.scatterFood(ant,task.type==='harvest'?4:3,ROOMS[room.type].objectColor,task.type==='harvest'?'mushroom':'honey');room.crop=0;}}}
      if(task.type==='carry'&&task.delivery){const target=this.ants.find(a=>a.id===ant.carry);if(target){
        const room=this.rooms.find(r=>r.id===task.destinationRoom),p=room?this.roomPlacement(room,target):null;
        if(!p){task.progress=0;return;}target.carriedBy=null;target.x=p.x;target.y=p.y;ant.carry=null;
      }}
      this.clearTask(ant);
    }
    waterPhysics(){if(!this._waterPhysics)this._waterPhysics=new WaterPhysics(this,C);return this._waterPhysics;}
    updateWater(dt){
      this.waterPhysics().update(dt);this.wetClock+=dt;if(this.wetClock<.25)return;this.wetClock=0;
      const water=this.tiles.filter(t=>t.water>=.025);
      for(const t of this.tiles)t.wetDistance=water.length?Math.min(...water.map(w=>Math.hypot(t.x-w.x,t.y-w.y))):99;
    }
    float(ant,dt){
      const cell=this.at(ant);if(!cell)return;
      const neighbors=this.adjacent(cell).filter(t=>t.open&&t.water>=.025).sort((a,b)=>b.y-a.y||b.water-a.water);
      const fluid=this.waterPhysics();if(fluid.geometry===null)fluid.prepare();const surface=fluid.surface(ant.x,ant.y);
      const target=neighbors[0],p=surface!==null?{x:ant.x,y:surface+1}:target&&target.y>=cell.y?this.point(target):null;
      if(p){const d=distance(p,ant);if(d>.1){const step=Math.min(d,dt*20),next={x:ant.x+(p.x-ant.x)/d*step,y:ant.y+(p.y-ant.y)/d*step};
        if(!isAdultAnt(ant)||!this.ants.some(other=>isAdultAnt(other)&&other!==ant&&!other.dead&&!other.carriedBy&&distance(next,other)<RADIUS[ant.type]+RADIUS[other.type]+.2)){ant.x=next.x;ant.y=next.y;}
      }}
    }
    tryLayEgg(){
      const queen=this.queen();if(!queen)return false;
      if(queen.hunger<100){queen.laidWhileFull=false;return false;}
      const cell=this.at(queen),room=this.rooms.find(r=>r.id===cell?.room&&r.type==='queen'&&r.cells.includes(cell.index));
      if(queen.hunger!==100||queen.laidWhileFull||!room||!cell.open||cell.water>=.025||queen.hygiene<=30||queen.energy<=30||queen.carriedBy)return false;
      const counts=this.counts(),capacity=Math.max(3,this.rooms.reduce((n,r)=>n+r.cells.length*2,0));if(counts.egg+counts.larva>=capacity)return false;
      const points=[{x:queen.x+18,y:queen.y},{x:queen.x-18,y:queen.y},{x:queen.x,y:queen.y+18}],prototype={id:'new',type:'egg'};
      const spot=points.find(p=>this.at(p)?.room===room.id&&this.canStand(prototype,p.x,p.y));if(!spot)return false;
      this.addAnt('egg',spot.x,spot.y);queen.laidWhileFull=true;return true;
    }
    tick(dt){
      if(this.over)return;this.time+=dt;this.scheduleClock+=dt;this.waterClock+=dt;this.mapClock+=dt;
      this.recognizeConnectedCaverns();
      if(this.mapClock>=.3){this.mapClock=0;this.updateMapBounds();}
      this.updateFoodBugs(dt);
      this.updateAphids();
      this.updateGrubs(dt);
      this.updateFoodChunks(dt);
      if(this.waterClock>=1/30-1e-8){this.updateWater(this.waterClock);this.waterClock=0;}
      if(!this.rainWarned&&this.nextRain-this.time<25){this.rainWarned=true;this.record('비구름이 다가옵니다. 침수에 대비하세요.',true,false);}
      if(this.time>=this.nextRain){this.rainLeft=18;this.nextRain=this.time+190+this.random()*60;this.rainWarned=false;this.record('비가 내립니다. 굴의 낮은 곳으로 물이 흐릅니다.',true,false);}
      const colonySize=this.counts().total,canInvade=colonySize>=10;
      if(!canInvade)this.invasionWarned=false;
      if(canInvade&&!this.invasionWarned&&this.nextInvasion-this.time<25){this.invasionWarned=true;this.record('다른 세력의 병정개미가 접근하고 있습니다.',true,false);}
      if(canInvade&&this.time>=this.nextInvasion){
        const wave=Math.floor(this.time/230),count=Math.floor(colonySize/5),probe={id:'spawn',type:'enemy'};
        const bounds=this.updateMapBounds(),columns=Array.from({length:bounds.maxX-bounds.minX+1},(_,i)=>bounds.maxX-i);
        const spots=[.5,.25,.75].flatMap(offset=>columns.map(x=>({x:(x+.5)*C.CELL,y:(C.SURFACE+offset)*C.CELL})));
        let spawned=0;
        for(let n=0;n<count;n++){
          const spot=spots.find(q=>this.canStand(probe,q.x,q.y));
          if(!spot)break;
          const enemy=this.addAnt('enemy',spot.x,spot.y);enemy.hp=70+wave*8;enemy.maxHp=enemy.hp;enemy.attack=12+wave*2;spawned++;
        }
        this.nextInvasion=this.time+210;this.invasionWarned=false;if(spawned)this.record(`다른 세력 병정개미 ${spawned}마리가 침입했습니다. 경비를 확인하세요.`,true,false);
      }
      for(const room of this.rooms){if(room.type==='mushroom'&&room.planted&&this.hasWaterNear(room)&&this.roomTiles(room).length)room.crop=Math.min(30,room.crop+dt);if(room.type==='aphid'&&this.hasRootNear(room)&&this.ants.some(a=>a.type==='aphid'&&!a.dead&&!a.carriedBy&&!a.sick&&a.hygiene>30&&room.cells.includes(this.at(a)?.index)&&this.at(a).water<.025))room.crop=Math.min(30,room.crop+dt);}
      const schedule=this.scheduleClock>=.3;if(schedule)this.scheduleClock=0;
      this.tryLayEgg();
      for(const ant of this.ants){
        ant.moving=false;ant.replan-=dt;ant.cooldown=Math.max(0,ant.cooldown-dt);if(ant.dead)continue;
        const isAdult=['queen','worker','soldier','enemy'].includes(ant.type);
        if(ant.type!=='enemy'){
          if(ant.type!=='egg'&&ant.type!=='aphid'){ant.hunger-=dt*.5;if(ant.hunger<=0){this.kill(ant);continue;}}
          const cleaned=this.ants.some(a=>!a.dead&&['clean','tend'].includes(a.task?.type)&&a.task.stage==='act'&&a.task.target===ant.id);
          if(!cleaned){const contamination=this.trash.some(t=>distance(t,ant)<=C.CELL)?0.75:(ant.treeHost||ant.y<(C.SURFACE+1)*C.CELL?0.5:0.25);ant.hygiene=Math.max(0,ant.hygiene-dt*contamination);}
          if(ant.hygiene<=0)ant.sick=true;
          if(ant.sick)this.damage(ant,10*dt);else if(this.time-ant.lastDamage>=3)ant.hp=Math.min(MAX_HP[ant.type],ant.hp+dt);
          if(isAdult&&!(ant.task?.type==='sleep'&&ant.task.stage==='act'))ant.energy=Math.max(0,ant.energy-dt*.5);
        }
        if(ant.dead||ant.carriedBy)continue;
        if(this.at(ant)?.water>=.025){if(ant.task)this.clearTask(ant);this.float(ant,dt);continue;}
        if(ant.type==='egg'){
          const room=this.rooms.find(r=>r.id===this.at(ant)?.room);if(room?.type==='egg')ant.age+=dt;
          if(ant.age>=C.EGG_SECONDS&&room?.type==='egg'){
            const probe={...ant,type:'larva'},spot=this.roomPlacement(room,probe);
            if(spot){ant.type='larva';ant.hp=MAX_HP.larva;ant.hunger=100;ant.age=0;ant.x=spot.x;ant.y=spot.y;this.record('알에서 애벌레가 태어났습니다. 애벌레실로 옮긴 뒤 상단에서 병정 또는 일꾼으로 성장시키세요.',false,false);}
          }continue;
        }
        if(!isAdult)continue;
        if(!this.terrainFits(ant,ant.x,ant.y))this.recoverTunnelAnt(ant,ant.task?.goal);
        if(ant.energy<=0&&!(ant.task?.type==='sleep'&&ant.task.stage==='act')){
          const resume=ant.task&&ant.task.type!=='sleep'?{...ant.task}:null;this.clearTask(ant);ant.resume=resume;
          this.assign(ant,{type:'sleep',goal:{x:ant.x,y:ant.y},duration:100,range:15});
        }
        if(schedule&&!ant.task)this.chooseTask(ant);
        this.updateTask(ant,dt);
        const hostile=ant.type==='enemy';
        const target=this.ants.filter(a=>!a.dead&&!a.carriedBy&&['queen','worker','soldier','enemy'].includes(a.type)&&(hostile?a.type!=='enemy':a.type==='enemy')).sort((a,b)=>distance(ant,a)-distance(ant,b))[0];
        if(target&&ant.energy>0&&ant.cooldown<=0&&distance(ant,target)<=RADIUS[ant.type]+RADIUS[target.type]+8){this.damage(target,ant.attack??ATTACK[ant.type]);ant.cooldown=1;ant.angle=Math.atan2(target.y-ant.y,target.x-ant.x)+Math.PI/2;}
      }
      if(!this.queen()){this.over=true;return;}
      this.tryLayEgg();
      this.peak=Math.max(this.peak,this.counts().total);
      this.jobs=this.jobs.filter(j=>j.status!=='done');this.rooms=this.rooms.filter(r=>r.cells.length||this.jobs.some(j=>j.room===r.id));
      this.ants=this.ants.filter(a=>!a.dead);
    }
    serialize(){this.updateMapBounds();const fluid=this.waterPhysics();fluid.prepare();return JSON.stringify({version:C.SAVE_VERSION,state:{worldModel:'expanding-v1',seed:this.seed,randomState:this.randomState,treeLayout:this.treeLayout,caveLayout:this.caveLayout,time:this.time,id:this.id,food:this.food,peak:this.peak,deadCount:this.deadCount,over:this.over,tiles:this.tiles,ants:this.ants,rooms:this.rooms,jobs:this.jobs,trash:this.trash,log:this.log,rainLeft:this.rainLeft,nextRain:this.nextRain,nextInvasion:this.nextInvasion,rainWarned:this.rainWarned,invasionWarned:this.invasionWarned,foodBugs:this.foodBugs,nextFoodBug:this.nextFoodBug,nextAphid:this.nextAphid,fruitPlants:this.fruitPlants,foodChunks:this.foodChunks,foodRemainder:this.foodRemainder,caverns:this.caverns,grubs:this.grubs,waterModel:'particles-v1',waterDrops:this.waterDrops,waterEvaporation:this.waterEvaporation,rainDripClock:this.rainDripClock}});}
    static restore(text){
      try{const data=JSON.parse(text);if(data.version!==C.SAVE_VERSION||!Array.isArray(data.state?.tiles)||data.state.tiles.length<C.W*C.H||!Array.isArray(data.state.ants)||!data.state.tiles.every((t,i)=>t?.index===i&&Number.isInteger(t.x)&&Number.isInteger(t.y)&&t.y>=0))return null;
        const sim=new Simulation(data.state.seed);Object.assign(sim,data.state);sim.rebuildTileLookup();if(sim.tileLookup.size!==sim.tiles.length)return null;sim.reservations={};
        if(!['single-wide-v1','radial-roots-v2'].includes(data.state.treeLayout))sim.upgradeTreeLayout();
        if(data.state.treeLayout!=='radial-roots-v2')sim.spreadTreeRoots();
        if(sim.connectRoots())sim.updateRootDistances();
        if(!Array.isArray(data.state.caverns))sim.initializeCaverns();else sim.grubs=data.state.grubs??[];
        sim.foodChunks=data.state.foodChunks??[];sim.foodRemainder=data.state.foodRemainder??0;sim.foodBugs=data.state.foodBugs??[];if(!Number.isFinite(data.state.nextFoodBug))sim.nextFoodBug=sim.time+12+sim.random()*13;
        sim.normalizeFoodUnits();
        if(!Array.isArray(data.state.fruitPlants))sim.initializeFruitPlants();
        if(!Number.isFinite(data.state.nextAphid))sim.nextAphid=sim.time+45+sim.terrainNoise(67,9)*45;
        delete sim._treeHabitats;for(const bug of sim.foodBugs)sim.attachFoodBug(bug);
        // Saved hunters on the former main-tree canopy return to its trunk.
        for(const ant of sim.ants)if(ant.treeHost==='tree-main'){
          const host=sim.treeHabitat(ant.treeHost),nodes=host.nodes.map((p,i)=>({p,i,d:distance(ant,p)})).sort((a,b)=>a.d-b.d),moved=!sim.terrainFits(ant,ant.x,ant.y);
          const nearest=nodes.find(({p})=>!moved||sim.canStand(ant,p.x,p.y));
          if(nearest){ant.treeNode=nearest.i;if(moved){Object.assign(ant,{x:nearest.p.x,y:nearest.p.y});const baby=sim.ants.find(a=>a.id===ant.carry);if(baby)Object.assign(baby,{x:ant.x,y:ant.y});}}
          for(const task of [ant.task,ant.resume])if(task){task.treeRoute=null;task.treeDestination=null;if(moved&&['sleep','eat','clean'].includes(task.type)&&(!task.target||task.target===ant.id))task.goal={x:ant.x,y:ant.y};}
        }
        for(const ant of sim.ants)if(!ant.treeHost&&ant.task?.type==='forage'&&ant.task.target){const bug=sim.foodBugs.find(b=>b.id===ant.task.target);if(bug){ant.task.goal=sim.foodBugGoal(bug,ant)??sim.treeHabitat(bug.hostId).base;ant.task.stage='move';ant.replan=0;}}
        sim.releaseUnstoredFood();
        for(const chunk of sim.foodChunks)if(!chunk.surfaceDrop&&chunk.y<(C.SURFACE+1)*C.CELL)sim.startSurfaceFoodDrop(chunk);
        sim.waterDrops=data.state.waterDrops??[];sim.rainDripClock=data.state.rainDripClock??0;sim.waterRipples=[];
        sim.waterEvaporation=data.state.waterEvaporation??0;sim.waterPhysics().load(data.state);
        if(Array.isArray(data.state.caverns)&&!['eight-single-v1','shallow-tree-v2','tree-four-v3'].includes(data.state.caveLayout))sim.upgradeCaverns();
        if(Array.isArray(data.state.caverns)&&data.state.caveLayout==='shallow-tree-v2')sim.reduceCaverns();
        else if(Array.isArray(data.state.caverns)&&data.state.caveLayout!=='tree-four-v3')sim.relocateCaverns();
        sim.recognizeConnectedCaverns(false);
        sim.updateMapBounds();
        delete sim.waterCells;
        delete sim.layClock;
        // Use the same collision-safe recovery for saved narrow roads and
        // corners changed by room excavation, keeping tasks and cargo together.
        for(const ant of sim.ants)if(isAdultAnt(ant)&&!ant.dead&&!ant.carriedBy&&sim.at(ant)?.water<.025&&!sim.terrainFits(ant,ant.x,ant.y)){
          ant.unstickAfter=0;sim.recoverTunnelAnt(ant,ant.task?.goal);
        }
        for(const ant of sim.ants){
          if(ant.task?.type==='tend'&&!ant.task.target)sim.clearTask(ant);
          if(ant.resume?.type==='tend'&&!ant.resume.target)ant.resume=null;
          if(ant.type==='queen'&&ant.task?.type==='sleep'&&sim.rooms.some(r=>r.type==='rest'&&(r.id===ant.task.roomId||r.id===sim.at(ant.task.goal)?.room))){sim.clearTask(ant);sim.assign(ant,sim.sleepTask(ant));}
          if(!sim.foodStorage().room&&ant.task?.type==='eat'&&!ant.foodCargo)sim.clearTask(ant);
          const keys=sim.reservationKeys(ant,ant.task);
          if(keys.some(key=>sim.reservations[key]))sim.clearTask(ant);
          else for(const key of keys)sim.reservations[key]=ant.id;
        }
        return sim;
      }catch{return null;}
    }
  }
  G.AntGame={...(G.AntGame??{}),C,ROOMS,MAX_HP,ATTACK,RADIUS,TASK_NAMES,Simulation,distance,clamp,pathStrokeCells,FRUIT_CROWN,FRUIT_OFFSETS,TREE_TOP};
  if(typeof module!=='undefined')module.exports=G.AntGame;
})(globalThis);
