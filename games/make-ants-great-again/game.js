(function(){
  'use strict';
  const {C,ROOMS,ART_COLORS:ART,MAX_HP,RADIUS,TASK_NAMES,Simulation,drawAnt,drawFoodBug,drawGrub,drawFoodChunk,clamp,distance,pathStrokeCells,FRUIT_CROWN,FRUIT_OFFSETS,TREE_TOP}=AntGame;
  const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),SAVE_KEY='make-ants-great-again-v1';
  let stored=null;try{stored=localStorage.getItem(SAVE_KEY);}catch{}
  const restored=stored?Simulation.restore(stored):null;
  const app={sim:restored??new Simulation(),paused:true,mode:null,selection:new Set(),camera:{x:14*C.CELL,y:0,zoom:1.15},selected:null,drag:null,saveWarning:false};
  window.game=app;
  let width=0,height=0,dpr=1,lastTime=0,accumulator=0,uiClock=0,saveClock=0;
  const antNames={queen:'여왕개미',soldier:'병정개미',worker:'일꾼',egg:'알',larva:'애벌레',aphid:'진딧물',enemy:'다른 세력 병정개미'};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const FRUIT_TREE_WIDTH=C.CELL,FRUIT_TREE_HEIGHT=C.CELL*6,SKY_TOP=(C.SURFACE+1-10)*C.CELL;
  const timeString=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);clampCamera();}
  new ResizeObserver(resize).observe(canvas);
  function clampCamera(){const bounds=app.sim.viewBounds(),left=bounds.minX*C.CELL,right=(bounds.maxX+1)*C.CELL,bottom=(bounds.maxY+1)*C.CELL;app.camera.zoom=clamp(app.camera.zoom,Math.max(.65,width/(right-left),height/(bottom-SKY_TOP)),2.5);app.camera.x=clamp(app.camera.x,left,Math.max(left,right-width/app.camera.zoom));app.camera.y=clamp(app.camera.y,SKY_TOP,Math.max(SKY_TOP,bottom-height/app.camera.zoom));}
  function screenPoint(cell){return {x:((cell.x+.5)*C.CELL-app.camera.x)*app.camera.zoom,y:((cell.y+.5)*C.CELL-app.camera.y)*app.camera.zoom};}
  app.screenPoint=screenPoint;
  function centerQueen(){const queen=app.sim.queen();if(queen){app.camera.x=queen.x-width/app.camera.zoom/2;const y=queen.y-height/app.camera.zoom*.3;app.camera.y=app.sim.at(queen)?.y===C.SURFACE?Math.min(y,(C.SURFACE+1)*C.CELL-FRUIT_TREE_HEIGHT-20):Math.max(0,y);clampCamera();}}
  $('food-stock').onclick=()=>{const sim=app.sim,store=sim.foodStorage(),chunk=!sim.food&&sim.foodChunks.find(c=>sim.at(c)?.open),source=chunk??(!store.room&&!sim.food&&sim.fruitPlants.find(p=>p.fruit>0)),point=source??store.point;if(point){app.camera.x=point.x-width/app.camera.zoom/2;app.camera.y=Math.max(SKY_TOP,point.y-height/app.camera.zoom*.4);clampCamera();}sim.record(chunk?store.room?'흩어진 먹이를 일꾼들이 음식 보관소로 옮깁니다.':'먹이는 채집한 자리에 남습니다. 개미가 찾아와 먹고, 보관소를 만들면 옮겨 저장합니다.':source?'일꾼이 열매를 수확하면 먹이 덩어리로 흩어집니다.':store.room?'먹이는 이 음식 보관소의 공용 재고입니다.':'먹이가 없습니다. 일꾼이 외부에서 채집해야 합니다.');};
  function zoom(factor,screenX=width/2,screenY=height/2){const x=app.camera.x+screenX/app.camera.zoom,y=app.camera.y+screenY/app.camera.zoom;app.camera.zoom=clamp(app.camera.zoom*factor,.65,2.5);clampCamera();app.camera.x=x-screenX/app.camera.zoom;app.camera.y=y-screenY/app.camera.zoom;clampCamera();}
  function setMode(mode){app.mode=mode;app.selection.clear();closeDrawer();canvas.classList.toggle('building',!!mode);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));updateSelection();updateUI();}
  document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>setMode(app.mode===button.dataset.mode?null:button.dataset.mode));
  $('clear-selection').onclick=()=>{app.selection.clear();updateSelection();};
  function updateSelection(){
    const n=app.selection.size,preview=app.sim.constructionPreview(app.mode,[...app.selection]);$('selection-actions').hidden=!n;
    $('selection-count').textContent=app.mode==='fill'?n+'칸 메우기':n+'칸 · '+preview.after+' / '+preview.limit+(preview.overLimit?' · 한도 초과':'');
    $('request-build').textContent='확인';$('request-build').disabled=preview.invalid||preview.overLimit||!preview.cells.length;
  }
  $('request-build').onclick=()=>{if(!app.mode)return;app.sim.request(app.mode,[...app.selection]);setMode(null);app.drag=null;updateUI();save();};
  function worldPoint(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/app.camera.zoom+app.camera.x,y:(event.clientY-r.top)/app.camera.zoom+app.camera.y};}
  function eventCell(event){const p=worldPoint(event),bounds=app.sim.viewBounds();return {x:clamp(Math.floor(p.x/C.CELL),bounds.minX,bounds.maxX),y:clamp(Math.floor(p.y/C.CELL),0,bounds.maxY)};}
  function selectionTo(event){
    const drag=app.drag,cell=eventCell(event);if(app.mode==='path'){
      const samples=event.getCoalescedEvents?.()??[];
      for(const sample of [...samples,event]){const point=worldPoint(sample);for(const index of pathStrokeCells(drag.lastPoint,point,app.sim))app.selection.add(index);drag.lastPoint=point;}
    }
    else{app.selection.clear();for(let y=Math.min(drag.cell.y,cell.y);y<=Math.max(drag.cell.y,cell.y);y++)for(let x=Math.min(drag.cell.x,cell.x);x<=Math.max(drag.cell.x,cell.x);x++)app.selection.add(app.sim.index(x,y));}updateSelection();
  }
  const touches=new Map();let pinch=null,suppressTouch=false;
  function pinchPoints(){const [a,b]=[...touches.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(b.x-a.x,b.y-a.y)};}
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    canvas.setPointerCapture(event.pointerId);
    if(event.pointerType==='touch'){
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(touches.size>=2){
        // Undo the first finger's tentative stroke when it becomes a pinch.
        if(app.drag?.selectionBefore){app.selection=new Set(app.drag.selectionBefore);updateSelection();}
        app.drag=null;suppressTouch=true;pinch=pinchPoints();return;
      }
      if(suppressTouch)return;
    }else if(touches.size)return;
    const cell=eventCell(event);
    app.drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,cell,lastPoint:worldPoint(event),moved:false,selectionBefore:event.pointerType==='touch'&&app.mode?new Set(app.selection):null};
    if(app.mode){if(app.mode!=='path')app.selection.clear();selectionTo(event);}
  });
  canvas.addEventListener('pointermove',event=>{
    if(touches.has(event.pointerId)){
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pinch&&touches.size>=2){
        const next=pinchPoints(),rect=canvas.getBoundingClientRect();
        zoom(pinch.distance>0?next.distance/pinch.distance:1,pinch.x-rect.left,pinch.y-rect.top);
        app.camera.x-=(next.x-pinch.x)/app.camera.zoom;app.camera.y-=(next.y-pinch.y)/app.camera.zoom;clampCamera();
        pinch=next;return;
      }
      if(suppressTouch)return;
    }
    const drag=app.drag;if(!drag||drag.id!==event.pointerId)return;
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5)drag.moved=true;
    if(app.mode)selectionTo(event);else{app.camera.x-=(event.clientX-drag.lastX)/app.camera.zoom;app.camera.y-=(event.clientY-drag.lastY)/app.camera.zoom;clampCamera();}
    drag.lastX=event.clientX;drag.lastY=event.clientY;
  });
  function endPointer(event,cancelled=false){
    if(touches.has(event.pointerId)){
      touches.delete(event.pointerId);pinch=touches.size>=2?pinchPoints():null;
      if(suppressTouch){if(!touches.size)suppressTouch=false;return;}
    }
    if(!app.drag||app.drag.id!==event.pointerId)return;
    if(!cancelled){if(app.mode)selectionTo(event);else if(!app.drag.moved)inspectAt(worldPoint(event));}
    app.drag=null;
  }
  canvas.addEventListener('pointerup',event=>endPointer(event));
  canvas.addEventListener('pointercancel',event=>endPointer(event,true));
  canvas.addEventListener('lostpointercapture',event=>endPointer(event,true));
  canvas.addEventListener('wheel',event=>{event.preventDefault();if(!event.deltaY)return;const rect=canvas.getBoundingClientRect(),unit=event.deltaMode===1?16:event.deltaMode===2?height:1,delta=clamp(event.deltaY*unit,-240,240);zoom(Math.exp(-delta*.0015),event.clientX-rect.left,event.clientY-rect.top);},{passive:false});
  canvas.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];app.camera.x+=direction[0]*C.CELL;app.camera.y+=direction[1]*C.CELL;clampCamera();}if(event.key==='Enter'&&app.selection.size)$('request-build').click();if(event.key==='Escape'){setMode(null);closeDrawer();}});
  function inspectAt(p){
    const ant=app.sim.ants.filter(a=>!a.dead&&!a.carriedBy).sort((a,b)=>distance(a,p)-distance(b,p)).find(a=>distance(a,p)<Math.max(13,RADIUS[a.type]+4));
    if(ant){app.selected={type:'ant',id:ant.id};showDrawer();return;}
    const bug=app.sim.foodBugs.find(b=>distance(b,p)<14);if(bug){app.selected={type:'bug',id:bug.id};showDrawer();return;}
    const grub=app.sim.grubs.find(b=>distance(b,p)<9);if(grub){app.selected={type:'grub',id:grub.id};showDrawer();return;}
    const chunk=app.sim.foodChunks.find(c=>app.sim.at(c)?.open&&distance(c,p)<9);if(chunk){app.selected={type:'food-chunk',id:chunk.id};showDrawer();return;}
    const plant=app.sim.fruitPlants.find(plant=>{const x=p.x-plant.x,y=p.y-((C.SURFACE+1)*C.CELL-3);return (Math.abs(x)<=FRUIT_TREE_WIDTH/2+4&&y<=0&&y>=-FRUIT_TREE_HEIGHT*.84)||FRUIT_CROWN.some(([dx,dy,rx,ry])=>((x-dx*C.CELL)/(rx*C.CELL+4))**2+((y-dy*FRUIT_TREE_HEIGHT)/(ry*FRUIT_TREE_HEIGHT+4))**2<=1);});
    if(plant){app.selected={type:'fruit-plant',id:plant.id};showDrawer();return;}
    const tile=app.sim.tile(Math.floor(p.x/C.CELL),Math.floor(p.y/C.CELL));
    if(tile?.room){app.selected={type:'room',id:tile.room};showDrawer();return;}
    closeDrawer();
  }
  function closeDrawer(){app.selected=null;$('drawer').hidden=true;}
  $('close-drawer').onclick=closeDrawer;
  $('jobs-button').onclick=()=>{app.selected={type:'jobs'};showDrawer();};
  function stat(label,value,max){return `<div><div class="stat-label"><span>${label}</span><b>${Math.ceil(Math.max(0,value))} / ${max}</b></div><div class="stat-track"><i class="${value/max<.3?'low':''}" style="width:${clamp(value/max*100,0,100)}%"></i></div></div>`;}
  function showDrawer(){
    if(!app.selected)return;const sim=app.sim;$('drawer').hidden=false;const content=$('drawer-content');
    if(app.selected.type==='fruit-plant'){
      const plant=sim.fruitPlants.find(p=>p.id===app.selected.id);if(!plant){closeDrawer();return;}
      content.innerHTML=`<span class="eyebrow">지표면의 먹이 자원</span><h2>열매 나무</h2><span class="tag">남은 열매 ${plant.fruit} / 10개</span><p>일꾼이 나무를 올라 열매 위치에서 2초 동안 수확한 뒤 내려옵니다. 열매 하나는 먹이 덩어리 3개로 흩어집니다. 덩어리 하나가 먹이 1개이므로 총 먹이 3개입니다.</p>`;
    }else if(app.selected.type==='ant'){
      const ant=sim.ants.find(a=>a.id===app.selected.id&&!a.dead);if(!ant){closeDrawer();return;}
      const task=ant.task?.type==='forage'?(ant.task.deliveryDone?'먹이 운반':ant.task.chunkId?'먹이 덩어리 줍기':'먹이 채집'):ant.task?TASK_NAMES[ant.task.type]:'대기';
      content.innerHTML=`<div class="inspect-header"><canvas id="inspect-ant" width="140" height="180"></canvas><div><span class="eyebrow">군체의 구성원</span><h2>${antNames[ant.type]}</h2><span class="tag">${ant.carriedBy?'운반 중':ant.swimming?.path?.length?'물에서 빠져나오는 중':sim.inWater(ant)?'물 위에 떠 있음':escape(task)}${ant.sick?' · 질병':''}</span>${ant.type==='egg'?`<p>부화까지 ${Math.ceil(Math.max(0,120-ant.age))}초<br>알 보관실과 빈 공간이 필요합니다.</p>`:ant.type==='larva'?'<p>애벌레실에 내려놓으면 상단에서 병정 또는 일꾼으로 성장시킬 수 있습니다.</p>':''}</div></div><div class="stats-grid">${stat('체력',ant.hp,ant.maxHp??MAX_HP[ant.type])}${stat('위생',ant.hygiene,100)}${!['egg','aphid'].includes(ant.type)?stat('포만감',ant.hunger,100):''}${['queen','worker','soldier','enemy'].includes(ant.type)?stat('에너지',ant.energy,100):''}</div>`;
      const c=$('inspect-ant').getContext('2d');drawAnt(c,ant.type,70,75,['egg','larva','aphid'].includes(ant.type)?1.4:.48,0,ant.phase,ant.moving,sim.entityColor(ant));
    }else if(app.selected.type==='bug'){
      const bug=sim.foodBugs.find(b=>b.id===app.selected.id);if(!bug){closeDrawer();return;}
      const activity=bug.lifecycle==='leaving'?'맵 밖으로 떠나는 중':bug.lifecycle==='arriving'?(bug.travelMode==='fly'?'나무로 날아오는 중':'나무로 기어오는 중'):sim.reservations['prey:'+bug.id]?'일꾼이 채집하는 중':'나무에서 기어 다니는 중';
      content.innerHTML=`<div class="inspect-header"><canvas id="inspect-bug" width="140" height="180"></canvas><div><span class="eyebrow">지표면의 작은 방문자</span><h2>먹이 벌레</h2><span class="tag">${activity}</span><p>잡으면 먹이 덩어리 5개로 흩어집니다. 일꾼들이 하나씩 옮겨 총 먹이 5개를 얻습니다.</p></div></div>`;drawFoodBug($('inspect-bug').getContext('2d'),bug,70,90,5);
    }else if(app.selected.type==='grub'){
      const bug=sim.grubs.find(b=>b.id===app.selected.id);if(!bug){closeDrawer();return;}
      content.innerHTML='<div class="inspect-header"><canvas id="inspect-grub" width="140" height="180"></canvas><div><span class="eyebrow">땅속의 작은 이웃</span><h2>굼벵이</h2><span class="tag">자연 굴에 사는 벌레</span><p>길이 연결되면 일꾼이 채집할 수 있습니다. 잡으면 먹이 덩어리 5개로 흩어집니다.</p></div></div>';
      drawGrub($('inspect-grub').getContext('2d'),bug,70,90,3.5);
    }else if(app.selected.type==='food-chunk'){
      const chunk=sim.foodChunks.find(c=>c.id===app.selected.id);if(!chunk){closeDrawer();return;}
      content.innerHTML=`<span class="eyebrow">흩어진 채집 자원</span><h2>먹이 덩어리</h2><span class="tag">${sim.reservations['food:'+chunk.id]?'개미가 가지러 오는 중':sim.foodStorage().room?'운반 대기':'채집한 자리에 남은 먹이'}</span><p>덩어리 하나가 먹이 1개이며, 먹으면 포만감이 30 회복됩니다. 음식 보관소가 있으면 일꾼이 하나씩 옮겨 저장합니다. 배고픈 개미는 보관 재고가 있어도 가장 가까운 먹이를 찾아 먹습니다. 일꾼은 여왕과 애벌레에게 먹이를 가져다줍니다.</p>`;
    }else if(app.selected.type==='room'){
      const room=sim.rooms.find(r=>r.id===app.selected.id);if(!room){closeDrawer();return;}
      const flooded=room.cells.filter(i=>sim.tiles[i].water>=.025).length;
      const occupancy=sim.roomOccupants(room).length,capacity=sim.roomCapacity(room),waiting=sim.ants.filter(a=>!a.dead&&a.entranceQueue?.roomId===room.id).length;
      content.innerHTML=`<span class="eyebrow">방의 용도 지정</span><h2>${ROOMS[room.type].name}</h2><p>${ROOMS[room.type].description}</p><p>${room.cells.length}칸 · ${room.cells.length}cm²${flooded?` · 침수 ${flooded}칸`:''}${room.type==='mushroom'?` · ${sim.hasWaterNear(room)?'물 조건 충족':'물 필요'} · 성장 ${Math.floor(room.crop/30*100)}%`:''}${room.type==='aphid'?` · ${sim.hasRootNear(room)?'뿌리 조건 충족':'뿌리 필요'}`:''}</p><div class="room-options">${Object.entries(ROOMS).map(([key,value])=>`<button data-room-type="${key}" style="background:${room.type===key?value.accent:value.color};border-color:${value.accent}" class="${room.type===key?'active':''} ${key==='aphid'&&!sim.hasRootNear(room)?'invalid':''}" aria-pressed="${room.type===key}">${value.name}</button>`).join('')}</div>`;
      content.querySelector('.room-options').insertAdjacentHTML('beforebegin',`<p class="room-capacity">아군 개미 ${occupancy} / ${capacity}마리${waiting?` · 입구 대기 ${waiting}마리`:''}<br><small>벽에 닿은 그리드 1칸당 1마리 · 알·애벌레 제외</small></p>`);
      if(['egg','queen'].includes(room.type)){
        const eggs=sim.ants.filter(a=>a.type==='egg'&&!a.dead&&!a.carriedBy&&sim.at(a)?.room===room.id).length,places=new Set(room.cells.filter(i=>sim.tiles[i]?.open&&sim.tiles[i].room===room.id)).size*4;
        content.querySelector('.room-options').insertAdjacentHTML('beforebegin',`<p class="egg-capacity">알 ${eggs} / ${places}개 · 블록당 4개</p>`);
      }
      content.querySelectorAll('[data-room-type]').forEach(button=>button.onclick=()=>{sim.designate(room.id,button.dataset.roomType);showDrawer();save();});
    }else{
      content.innerHTML='<span class="eyebrow">군체의 작업 기록</span><h2>작업 내역</h2><p>안전한 메우기 대기 '+sim.jobs.filter(j=>j.type==='fill').length+'칸 · 굴착 한도 대기 '+sim.jobs.filter(j=>j.type==='dig').length+'칸</p>'+sim.jobs.slice(0,8).map(j=>'<div class="job-row"><span>'+ (j.type==='dig'?'이전 굴착 요청':'메우기')+' · ('+sim.tiles[j.cell].x+', '+(sim.tiles[j.cell].y-4)+')</span><b>대기</b></div>').join('')+'<div style="margin-top:16px">'+sim.log.slice(0,7).map(item=>'<div class="log-item">'+timeString(item.time)+'　'+escape(item.text)+'</div>').join('')+'</div>';
    }
  }
  function save(){try{localStorage.setItem(SAVE_KEY,app.sim.serialize());}catch{if(!app.saveWarning){app.saveWarning=true;app.sim.record('이 브라우저에서는 저장할 수 없습니다. 창을 닫기 전까지 플레이할 수 있습니다.',true);}}}
  function setPaused(value){app.paused=value;$('pause-icon').setAttribute('d',value?'M8 4L20 12L8 20Z':'M8 4V20M16 4V20');$('pause-label').textContent=value?'계속하기':'일시정지';$('pause').setAttribute('aria-label',value?'게임 계속하기':'게임 일시 정지');$('pause').setAttribute('aria-pressed',String(value));if(value)save();}
  $('pause').onclick=()=>setPaused(!app.paused);
  function updateFullscreen(){const active=!!document.fullscreenElement;$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').setAttribute('aria-label',active?'전체화면 끄기':'전체화면 켜기');$('fullscreen-label').textContent=active?'화면 복귀':'전체화면';$('fullscreen-icon').setAttribute('d',active?'M3 8H8V3M16 3V8H21M3 16H8V21M16 21V16H21':'M8 3H3V8M16 3H21V8M3 16V21H8M16 21H21V16');}
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{app.sim.record('이 브라우저에서는 전체화면을 사용할 수 없습니다.');updateUI();}};
  document.addEventListener('fullscreenchange',updateFullscreen);
  let beforeHelp=true;
  $('menu').onclick=()=>{beforeHelp=app.paused;setPaused(true);$('help-dialog').showModal();};
  $('close-help').onclick=()=>$('help-dialog').close();$('help-dialog').addEventListener('close',()=>setPaused(beforeHelp));
  $('grow-worker').onclick=()=>{app.sim.growth('worker');updateUI();save();};$('grow-soldier').onclick=()=>{app.sim.growth('soldier');updateUI();save();};
  function newGame(){app.sim=new Simulation(Date.now()>>>0);app.selection.clear();closeDrawer();setMode(null);centerQueen();setPaused(false);save();updateUI();}
  $('new-game').onclick=()=>{if(confirm('현재 진행을 초기화하고 새 군체를 시작할까요?')){$('help-dialog').close();beforeHelp=false;newGame();}};
  $('restart').onclick=()=>{$('gameover').close();newGame();};
  $('start').onclick=()=>{$('welcome').close();setPaused(false);if(app.sim.over)showGameOver();};
  $('start-new').onclick=()=>{if(restored&&!confirm('저장된 진행을 초기화하고 새 군체를 시작할까요?'))return;$('welcome').close();if($('gameover').open)$('gameover').close();newGame();};
  $('welcome').addEventListener('cancel',event=>event.preventDefault());$('gameover').addEventListener('cancel',event=>event.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){save();lastTime=0;}});window.addEventListener('pagehide',save);
  function showGameOver(){setPaused(true);$('gameover-stats').textContent=`생존 ${timeString(app.sim.time)} · 최고 개미 수 ${app.sim.peak}마리 · 군체가 남긴 ${app.sim.rooms.reduce((n,r)=>n+r.cells.length,0)}칸의 방`;$('gameover').showModal();}
  function updateUI(){
    if(app.mode&&app.selection.size)updateSelection();
    const sim=app.sim,counts=sim.counts();for(const key of ['total','soldier','worker','larva','egg'])$('count-'+key).textContent=counts[key];
    const ready=sim.growthCandidates().length;for(const id of ['grow-worker','grow-soldier']){$(id).disabled=!ready;$(id).title=ready?`애벌레실의 애벌레 ${ready}마리가 성장할 수 있습니다.`:'애벌레실에 내려놓은 애벌레가 있어야 성장할 수 있습니다.';}const food=Math.floor(sim.food+1e-8);$('food').textContent=food;const storage=sim.foodStorage(),loose=!sim.food&&sim.foodChunks.some(c=>sim.at(c)?.open);$('food-stock').setAttribute('aria-label',`저장된 먹이 ${food}개 · ${loose?'흩어진 먹이 덩어리':storage.room?'음식 보관소':'열매 식물'} 위치 보기`);
    $('job-count').textContent=sim.jobs.length;$('job-count').hidden=!sim.jobs.length;
    const excavation=sim.excavationStats();$('excavation-count').textContent=excavation.current+' / '+excavation.limit;$('excavation-budget').classList.toggle('over-limit',excavation.current>excavation.limit);
    const notice=$('notice');notice.textContent=sim.notice;notice.classList.toggle('visible',sim.time<sim.noticeUntil);notice.classList.toggle('warning',sim.noticeWarning);
    if(app.selected)showDrawer();if(sim.over&&!$('gameover').open&&!$('welcome').open)showGameOver();
  }
  function roundRect(x,y,w,h,r,fill,stroke=null,line=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
  function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function drawFruitPlant(plant){
    const baseY=(C.SURFACE+1)*C.CELL-3,h=FRUIT_TREE_HEIGHT,w=FRUIT_TREE_WIDTH;ctx.save();ctx.translate(plant.x,baseY);
    roundRect(-w/2,-h*.84,w,h*.84,5,ART.root);
    ctx.strokeStyle=ART.root;ctx.lineWidth=8;ctx.lineCap='round';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,-h*.47);ctx.quadraticCurveTo(side*w*.2,-h*.63,side*w*.8,-h*.72);ctx.stroke();}
    const crown=new Path2D();for(const [dx,dy,rx,ry] of FRUIT_CROWN){crown.moveTo((dx+rx)*C.CELL,dy*h);crown.ellipse(dx*C.CELL,dy*h,rx*C.CELL,ry*h,0,0,Math.PI*2);}
    ctx.fillStyle=ART.leaf;ctx.fill(crown);
    for(const [dx,dy] of FRUIT_OFFSETS.slice(0,plant.fruit)){
      const x=dx*C.CELL,y=dy*h;circle(x,y,C.CELL*.12,ART.food);
    }
    ctx.restore();
  }
  function drawWater(sim,visible,roomPaths,left,right,top,bottom){
    const fluid=sim.waterPhysics();fluid.prepare();const clip=new Path2D();
    for(const path of roomPaths.values())clip.addPath(path);
    for(const t of visible)if(t.open&&!t.room&&t.y>C.SURFACE){
      const p=sim.point(t),radius=C.CELL*C.PATH_WIDTH_RATIO/2;clip.moveTo(p.x+radius,p.y);clip.arc(p.x,p.y,radius,0,Math.PI*2);
      for(const n of sim.neighbors(t))if(n.open&&n.y>=C.SURFACE){
        const q=sim.point(n),length=distance(p,q),rx=-(q.y-p.y)/length*radius,ry=(q.x-p.x)/length*radius;
        clip.moveTo(p.x+rx,p.y+ry);clip.lineTo(p.x-rx,p.y-ry);clip.lineTo(q.x-rx,q.y-ry);clip.lineTo(q.x+rx,q.y+ry);clip.closePath();
      }
    }
    const bounds=sim.viewBounds();ctx.save();ctx.beginPath();ctx.rect(bounds.minX*C.CELL,(C.SURFACE+1)*C.CELL,(bounds.maxX-bounds.minX+1)*C.CELL,(bounds.maxY-C.SURFACE)*C.CELL);ctx.clip();ctx.clip(clip);
    const drops=sim.waterDrops.filter(p=>p.x>=left*C.CELL-12&&p.x<=(right+1)*C.CELL+12&&p.y>=top*C.CELL-12&&p.y<=(bottom+1)*C.CELL+12),body=new Path2D();
    const pools=fluid.poolGeometry(),pooledIds=new Set(pools.flatMap(p=>p.dropIds));
    for(const pool of pools){
      // Extend sampled edges to the actual wall; the cavity clip keeps the
      // rounded floor and adjoining rooms exact without particle-sized gaps.
      for(const span of pool.spans){const edge=fluid.size*.55,y=Math.max(pool.level,span.y-edge);body.rect(span.x-edge,y,span.width+edge*2,span.y+span.height+edge-y);}
    }
    // Falling and rolling particles keep their individual outlines until they
    // stop; settled particles share a flat surface clipped to the cave floor.
    for(const p of drops)if(!pooledIds.has(p.id)){
      const r=fluid.radiusOf(p),stretch=1/(1+Math.min(.25,Math.abs(p.vy)/800));
      body.moveTo(p.x+r*stretch,p.y);body.ellipse(p.x,p.y,r*stretch,r/stretch,0,0,Math.PI*2);
    }
    ctx.fillStyle=ART.water;ctx.fill(body);
    ctx.restore();
  }
  function sameMaterial(sim,t,kind,dx,dy){const n=sim.tile(t.x+dx,t.y+dy);return n?.kind===kind&&(kind==='root'||!n.open);}
  function materialCorners(sim,t,kind){
    const r=C.CELL*.49;
    return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy])=>{
      // The surface roots join the broad tree trunk without a notch.
      if(kind==='root'&&dy===-1&&t.y===C.SURFACE+1&&t.x>=C.TREE_X-C.TREE_WIDTH/2&&t.x<C.TREE_X+C.TREE_WIDTH/2)return 0;
      return !sameMaterial(sim,t,kind,dx,0)&&!sameMaterial(sim,t,kind,0,dy)?r:0;
    });
  }
  function drawRoots(sim,visible){
    const roots=visible.filter(t=>t.kind==='root'),shape=new Path2D(),cell=C.CELL;
    for(const t of roots)shape.roundRect(t.x*cell,t.y*cell,cell,cell,materialCorners(sim,t,'root'));
    ctx.fillStyle=ART.root;ctx.fill(shape);
  }
  function drawTree(x,ground){
    const cell=C.CELL,top=TREE_TOP,height=ground-top,half=C.TREE_WIDTH*cell/2;
    // A ten-cell-wide base feeds full root blocks that taper into the main root.
    ctx.beginPath();ctx.moveTo(x-half,ground+2);ctx.bezierCurveTo(x-half*.96,ground-height*.3,x-half*.9,top+cell,x-half*.86,top);
    ctx.lineTo(x+half*.86,top);ctx.bezierCurveTo(x+half*.94,top+cell,x+half*.99,ground-height*.3,x+half,ground+2);ctx.closePath();ctx.fillStyle=ART.root;ctx.fill();
  }
  function drawGrass(sim,left,right,ground){
    const start=left*C.CELL,end=(right+1)*C.CELL,top=(C.SURFACE+1-C.GRASS_CELLS)*C.CELL;
    ctx.beginPath();ctx.moveTo(start,ground);ctx.lineTo(start,sim.grassTop(start));for(let x=start+2;x<end;x+=2)ctx.lineTo(x,sim.grassTop(x));ctx.lineTo(end,sim.grassTop(end));ctx.lineTo(end,ground);ctx.closePath();
    ctx.fillStyle=ART.leaf;ctx.fill();
  }
  function drawWorld(){
    if(!width||!height)return;clampCamera();const sim=app.sim,z=app.camera.zoom,cell=C.CELL,bounds=sim.viewBounds();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.scale(z,z);ctx.translate(-app.camera.x,-app.camera.y);
    const left=Math.max(bounds.minX,Math.floor(app.camera.x/cell)-1),right=Math.min(bounds.maxX,Math.ceil((app.camera.x+width/z)/cell)+1),top=Math.max(0,Math.floor(app.camera.y/cell)-1),bottom=Math.min(bounds.maxY,Math.ceil((app.camera.y+height/z)/cell)+1);
    ctx.fillStyle=ART.paper;ctx.fillRect(app.camera.x,app.camera.y,width/z,height/z);
    ctx.fillStyle=ART.soil;ctx.fillRect(app.camera.x,(C.SURFACE+1)*cell,width/z,(bounds.maxY-C.SURFACE)*cell);
    const visible=[];
    for(let y=Math.max(top,C.SURFACE+1);y<=bottom;y++)for(let x=left;x<=right;x++){
      const t=sim.tile(x,y);visible.push(t);const px=x*cell,py=y*cell;
      if(t.rootDistance<=5){ctx.fillStyle=`rgba(99,125,70,${(1-t.rootDistance/6)*.22})`;ctx.fillRect(px,py,cell,cell);}
      if(t.wetDistance<=10){ctx.fillStyle=`rgba(81,48,31,${(1-t.wetDistance/11)*.62})`;ctx.fillRect(px,py,cell,cell);}
    }
    // Tunnel circles and connectors are rendered as one smooth silhouette.
    ctx.save();ctx.beginPath();ctx.rect(bounds.minX*cell,(C.SURFACE+1)*cell,(bounds.maxX-bounds.minX+1)*cell,(bounds.maxY-C.SURFACE)*cell);ctx.clip();
    const roomPaths=new Map();
    for(const t of visible)if(t.open){
      const p=sim.point(t),space=t.room??t.cave;if(space){let path=roomPaths.get(space);if(!path){path=new Path2D();roomPaths.set(space,path);}path.roundRect(t.x*cell,t.y*cell,cell,cell,sim.roomCorners(t));}else{
        for(const n of sim.neighbors(t))if(n.open&&n.y>=C.SURFACE){ctx.strokeStyle=ART.tunnel;ctx.lineWidth=cell*C.PATH_WIDTH_RATIO;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);const q=sim.point(n);ctx.lineTo(q.x,q.y);ctx.stroke();}
        circle(p.x,p.y,cell*C.PATH_WIDTH_RATIO/2,ART.tunnel);
      }
    }
    for(const [id,path] of roomPaths){const room=sim.rooms.find(r=>r.id===id);ctx.fillStyle=ROOMS[room?.type??'empty'].color;ctx.fill(path);}ctx.restore();
    for(const t of visible)if(!t.open&&t.kind==='rock'){
      const px=t.x*cell,py=t.y*cell,corners=materialCorners(sim,t,'rock');
      ctx.save();ctx.beginPath();ctx.roundRect(px,py,cell,cell,corners);ctx.clip();ctx.fillStyle=ART.rock;ctx.fillRect(px,py,cell,cell);ctx.restore();
    }
    drawRoots(sim,visible);
    const ground=(C.SURFACE+1)*cell;
    if(top<=C.SURFACE+1){
      drawGrass(sim,left,right,ground);
      if(C.TREE_X+C.TREE_WIDTH>=left&&C.TREE_X-C.TREE_WIDTH<=right)drawTree(C.TREE_X*cell,ground);
      for(const plant of sim.fruitPlants)if(plant.x>=left*cell-cell*1.5&&plant.x<=(right+1)*cell+cell*1.5)drawFruitPlant(plant);
      ctx.font='10px system-ui';ctx.fillStyle='#718057';ctx.fillText('지표면',(17.5)*cell-17,ground-C.GRASS_CELLS*cell-12);
      // Entrances use the tunnel drawing clipped below ground; a separate
      // entrance cap would cover grass and protrude above the surface.
    }
    for(const room of sim.rooms){
      if(!room.cells.length)continue;const xs=room.cells.map(i=>sim.tiles[i].x),ys=room.cells.map(i=>sim.tiles[i].y),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
      if(minx>right||maxx<left||miny>bottom||maxy<top)continue;
      const cx=(minx+maxx+1)*cell/2,cy=miny*cell-5/z;
      ctx.textAlign='center';ctx.font=`500 ${10/z}px system-ui`;ctx.fillStyle=ART.ink;ctx.fillText(ROOMS[room.type].name,cx,cy);ctx.textAlign='left';
      if(room.type==='mushroom'&&room.planted){for(const i of room.cells.filter((_,i)=>i%2===0)){const p=sim.point(sim.tiles[i]);roundRect(p.x-1.5,p.y+2,3,9,1,ROOMS.mushroom.objectColor);ctx.beginPath();ctx.ellipse(p.x,p.y+3,5+room.crop/10,4,0,Math.PI,0);ctx.closePath();ctx.fillStyle=ROOMS.mushroom.objectColor;ctx.fill();}}
      if(room.type==='rest'){const p=sim.roomCenter(room);if(p)roundRect(p.x-10,p.y+7,20,7,4,ROOMS.rest.objectColor);}
    }
    const stock=sim.foodStorage();
    if(stock.room&&sim.food>0){
      for(const chunk of sim.storedFoodChunks())drawFoodChunk(ctx,chunk);
    }
    drawWater(sim,visible,roomPaths,left,right,top,bottom);
    for(const chunk of sim.foodChunks){
      if((!chunk.falling&&!sim.at(chunk)?.open)||chunk.x<app.camera.x-10||chunk.x>app.camera.x+width/z+10||chunk.y<app.camera.y-15||chunk.y>app.camera.y+height/z+15)continue;
      const lift=!chunk.surfaceDrop&&!chunk.falling&&chunk.age<.45?Math.sin(chunk.age/.45*Math.PI)*9:0;
      if(app.selected?.type==='food-chunk'&&app.selected.id===chunk.id){ctx.strokeStyle='#f2d68e';ctx.lineWidth=1;ctx.beginPath();ctx.arc(chunk.x,chunk.y,9,0,Math.PI*2);ctx.stroke();}
      drawFoodChunk(ctx,chunk,chunk.x,chunk.y-lift);
    }
    if(sim.rainLeft>0){ctx.strokeStyle='#86a9ae99';ctx.lineWidth=1.5;for(let i=0;i<32;i++){const px=app.camera.x+((i*71+sim.time*9)% (width/z)),py=(sim.time*80+i*17)%(C.SURFACE*cell);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-3,py+10);ctx.stroke();}}
    for(const trash of sim.trash){if(trash.type==='corpse'){drawAnt(ctx,'worker',trash.x,trash.y,.055,Math.PI*.4,0,false,ROOMS.trash.objectColor);}else{circle(trash.x,trash.y,3,ROOMS.trash.objectColor);circle(trash.x+3,trash.y+2,2,ROOMS.trash.objectColor);}}
    for(const bug of sim.foodBugs){if(app.selected?.type==='bug'&&app.selected.id===bug.id){ctx.strokeStyle='#f2d68e';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(bug.x,bug.y,12,0,Math.PI*2);ctx.stroke();}drawFoodBug(ctx,bug);}
    for(const bug of sim.grubs){
      if(bug.x<left*cell-20||bug.x>(right+1)*cell+20||bug.y<top*cell-20||bug.y>(bottom+1)*cell+20)continue;
      if(app.selected?.type==='grub'&&app.selected.id===bug.id){ctx.strokeStyle='#f2d68e';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(bug.x,bug.y,17,0,Math.PI*2);ctx.stroke();}
      drawGrub(ctx,bug);
    }
    for(const ant of sim.ants){
      if(ant.dead||ant.carriedBy||ant.x<app.camera.x-30||ant.x>app.camera.x+width/z+30||ant.y<app.camera.y-30||ant.y>app.camera.y+height/z+30)continue;
      if(app.selected?.type==='ant'&&app.selected.id===ant.id){ctx.strokeStyle='#f2d68e';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(ant.x,ant.y,RADIUS[ant.type]+4,0,Math.PI*2);ctx.stroke();}
      const size=ant.type==='egg'?.19:ant.type==='larva'?.21:ant.type==='aphid'?.21:.085;
      drawAnt(ctx,ant.type,ant.x,ant.y,size,ant.angle,ant.phase,ant.moving,sim.entityColor(ant));
      if(ant.carry){const baby=sim.ants.find(a=>a.id===ant.carry);if(baby)drawAnt(ctx,baby.type,ant.x+5,ant.y+5,baby.type==='egg'?.15:.16,ant.angle,0,false,sim.entityColor(baby));}
      if(ant.foodCargo)drawFoodChunk(ctx,ant.foodCargo,ant.x+Math.sin(ant.angle)*7,ant.y-Math.cos(ant.angle)*7,.8);
      if(ant.type==='enemy'){ctx.fillStyle=sim.entityColor(ant);ctx.font='8px system-ui';ctx.fillText('!',ant.x-2,ant.y-14);}
      if(ant.task?.type==='sleep'){ctx.fillStyle='#e8dab2';ctx.font='8px system-ui';ctx.fillText('z',ant.x+7,ant.y-8);}
    }
    for(const job of sim.jobs){const t=sim.tiles[job.cell];if(t.x<left||t.x>right||t.y<top||t.y>bottom)continue;ctx.strokeStyle=job.type==='fill'?'#edc18b':'#f5e3b4';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.strokeRect(t.x*cell+3,t.y*cell+3,cell-6,cell-6);ctx.setLineDash([]);if(job.status==='active'){ctx.fillStyle='#f5e3b455';ctx.fillRect(t.x*cell+3,(t.y+1)*cell-3-job.progress*(cell-6),cell-6,job.progress*(cell-6));}}
    if(app.mode){
      // Construction guides belong to the ground and roads; room floors stay
      // continuous even while selecting construction or backfill work.
      const gridMask=new Path2D();gridMask.rect(left*cell,top*cell,(right-left+1)*cell,(bottom-top+1)*cell);for(const path of roomPaths.values())gridMask.addPath(path);
      ctx.save();ctx.clip(gridMask,'evenodd');
      ctx.strokeStyle='#fff3d137';ctx.lineWidth=.7/z;ctx.beginPath();for(let x=left;x<=right+1;x++){ctx.moveTo(x*cell,top*cell);ctx.lineTo(x*cell,(bottom+1)*cell);}for(let y=top;y<=bottom+1;y++){ctx.moveTo(left*cell,y*cell);ctx.lineTo((right+1)*cell,y*cell);}ctx.stroke();
      if(app.mode==='path'){
        ctx.strokeStyle='#fff3d14d';ctx.beginPath();for(let y=Math.max(top,C.SURFACE+1);y<=bottom;y++)for(let x=left;x<=right;x++){ctx.moveTo((x+.75)*cell,(y+.5)*cell);ctx.arc((x+.5)*cell,(y+.5)*cell,cell*.25,0,Math.PI*2);}ctx.stroke();
      }
      ctx.restore();const selectedRooms=new Path2D();
      for(const index of app.selection){const t=sim.tiles[index];if(t.open&&t.room){selectedRooms.roundRect(t.x*cell,t.y*cell,cell,cell,sim.roomCorners(t));continue;}const invalid=t.y<=C.SURFACE||t.kind==='rock'||(app.mode==='fill'&&!t.open);ctx.fillStyle=invalid?'#b3554f70':'#c3dfac88';ctx.fillRect(t.x*cell+1,t.y*cell+1,cell-2,cell-2);ctx.strokeStyle=invalid?'#eaba97':'#e7f2d8';ctx.lineWidth=1;ctx.strokeRect(t.x*cell+1,t.y*cell+1,cell-2,cell-2);}
      ctx.fillStyle='#c3dfac88';ctx.fill(selectedRooms);
    }
  }
  function frame(now){
    const elapsed=lastTime?Math.min((now-lastTime)/1000,.15):0;lastTime=now;
    if(!app.paused&&!document.hidden&&!app.sim.over){accumulator+=elapsed;while(accumulator>=1/30){app.sim.tick(1/30);accumulator-=1/30;}}
    else accumulator=0;
    uiClock+=elapsed;saveClock+=elapsed;if(uiClock>.25){updateUI();uiClock=0;}if(saveClock>5){save();saveClock=0;}
    drawWorld();requestAnimationFrame(frame);
  }

  function exitAntColony(){
    setPaused(true);
    const raw=new URLSearchParams(location.search).get('returnTo');
    if(raw){
      try{
        const target=new URL(raw);
        if(target.protocol==='https:'&&!target.username&&!target.password&&target.origin===location.origin){
          location.replace(target.href);return;
        }
      }catch{}
    }
    beforeHelp=true;
    for(const id of ['help-dialog','gameover'])if($(id).open)$(id).close();
    closeDrawer();setMode(null);
    $('start').textContent=app.sim.over?'군체 기록 보기':'군체 이어하기';
    if(!$('welcome').open)$('welcome').showModal();
  }
  for(const id of ['exit-welcome','exit-menu','exit-gameover'])$(id).onclick=exitAntColony;
  resize();centerQueen();updateUI();
  const welcomeContext=$('welcome-ant').getContext('2d');drawAnt(welcomeContext,'queen',140,62,.38,Math.PI*.08);
  for(const [x,y,angle] of [[45,92,-.15],[85,136,-.08],[140,143,0],[194,136,.08],[234,92,.15]])drawAnt(welcomeContext,'worker',x,y,.24,Math.PI*angle);
  drawAnt(welcomeContext,'soldier',221,36,.3,Math.PI*.12);
  if(restored){$('start').textContent=restored.over?'군체 기록 보기':'군체 이어하기';$('new-game-note').hidden=false;}$('welcome').showModal();requestAnimationFrame(frame);
})();
