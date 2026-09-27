(function(){
  'use strict';
  const D=window.XTD,{Game,buildings:B,artifacts:A,waves:W}=D;
  const $=id=>document.getElementById(id),fmt=n=>Math.floor(n).toLocaleString('en-US');
  const SAVE='xenotide.save.v1',SETTINGS='xenotide.settings.v1';
  let game=null,started=false,saved=null,settings={sound:true},toastTimer,confirmCallback,focusBeforeConfirm;
  const ui={selected:null,placing:null,tile:null,overlay:'none',resourceOverlay:'none',panel:null,category:'combat',marketTab:'resources'};
  const renderer=new D.Renderer($('battle-canvas'));
  try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};saved=localStorage.getItem(SAVE);if(saved){const check=Game.restore(saved);if(check.status==='playing')$('continue-button').hidden=false;else saved=null;}}catch{saved=null;}
  const preview=new Game(270786);preview.resources.iron=10000;Object.keys(B).forEach(k=>preview.unlocked[k+':1']=true);
  [['gun',2,3],['gun',4,3],['mortar',2,7],['sniper',4,7],['solar',1,10],['relay',3,10],['shield',5,10]].forEach(([type,x,y])=>preview.build(type,x,y));
  for(let i=0;i<13;i++){const e=preview.spawn(i%4===0?9:19);e.x=2.4+(i%3)*.9;e.y=.5+Math.floor(i/3)*1.2;e.angle=Math.PI/2;}
  preview.events=[];
  let audio=null,lastSound=0;
  function sound(kind){if(!settings.sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();if(kind==='shot'&&audio.currentTime-lastSound<.08)return;lastSound=audio.currentTime;
    const o=audio.createOscillator(),gain=audio.createGain();o.connect(gain);gain.connect(audio.destination);o.type=kind==='wave'?'sine':kind==='shot'?'triangle':'sine';const hz=kind==='wave'?330:kind==='build'?700:kind==='death'?110:kind==='shot'?170:480;o.frequency.setValueAtTime(hz,audio.currentTime);o.frequency.exponentialRampToValueAtTime(hz*.4,audio.currentTime+.12);gain.gain.setValueAtTime(kind==='shot'?.018:.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.16);
  }catch{}}
  function toast(message){$('notification').textContent=message;$('notification').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('notification').hidden=true,3600);}
  function persist(silent=true){if(!game)return;try{localStorage.setItem(SAVE,game.serialize());saved=localStorage.getItem(SAVE);if(!silent)toast('현재 작전을 저장했습니다.');}catch{if(!silent)toast('브라우저 저장 공간을 사용할 수 없습니다.');}}
  function storeSettings(){try{localStorage.setItem(SETTINGS,JSON.stringify(settings));}catch{}}
  function resultOf(result,message){if(result?.error){toast(result.error);sound('error');return false;}if(message)toast(message);sound('build');persist();updateHUD();return true;}
  function start(continuing=false){try{game=continuing?Game.restore(saved):new Game(Date.now());}catch{toast('저장을 읽을 수 없습니다. 새 작전을 시작하세요.');return;}
    if(!continuing)game.paused=true;
    started=true;ui.selected=null;ui.placing=null;ui.tile=null;ui.overlay='none';ui.resourceOverlay='none';closeSheet();$('start-screen').hidden=true;$('result-screen').hidden=true;$('mission-hud').hidden=false;$('integrity').hidden=false;$('idle-label').hidden=true;$('command-tools').hidden=false;$('build-button').disabled=false;renderer.fx=[];sound('build');updateHUD();persist();
    toast(continuing?'작전을 복구했습니다. ▶ 버튼으로 재개하세요.':'준비 중에는 시간이 멈춥니다. 시설을 배치하고 웨이브를 출발시키세요.');if(!continuing)openSheet('briefing');
  }
  function closeSheet(){if(ui.overlay==='power')ui.overlay='none';ui.panel=null;$('sheet').hidden=true;}
  function openSheet(panel){if(ui.overlay==='power')ui.overlay='none';if(panel==='building'&&['solar','reactor','relay'].includes(game.buildings.find(b=>b.id===ui.selected)?.type))ui.overlay='power';ui.panel=panel;ui.placing=null;ui.tile=null;$('placement-bar').hidden=true;$('sheet').hidden=false;renderSheet();$('sheet-content').scrollTop=0;$('sheet-close').focus({preventScroll:true});}
  function modal(title,html,callback,label='확인'){focusBeforeConfirm=document.activeElement;$('confirm-title').textContent=title;$('confirm-body').innerHTML=html;$('confirm-yes').textContent=label;confirmCallback=callback;$('confirm-layer').hidden=false;$('confirm-no').focus();}
  function hideModal(){ $('confirm-layer').hidden=true;confirmCallback=null;if(focusBeforeConfirm?.isConnected)focusBeforeConfirm.focus({preventScroll:true});}
  $('confirm-no').onclick=hideModal;$('confirm-yes').onclick=()=>{const fn=confirmCallback;hideModal();fn?.();};
  $('start-button').onclick=()=>start(false);$('continue-button').onclick=()=>start(true);$('briefing-button').onclick=()=>openSheet('briefing');$('sheet-close').onclick=()=>{closeSheet();ui.selected=null;};
  document.querySelectorAll('[data-overlay]').forEach(button=>button.onclick=()=>{
    if(!started||!game||!$('confirm-layer').hidden)return;
    const resource=button.dataset.overlay;
    ui.resourceOverlay=ui.resourceOverlay===resource?'none':resource;
    closeSheet();ui.selected=null;updateHUD();
    if(ui.resourceOverlay==='crystal')toast('결정은 적 처치와 거래로 획득합니다. 생산 시설은 없습니다.');
  });
  $('menu-button').onclick=()=>openSheet(started?'menu':'briefing');
  $('market-button').onclick=()=>{if(game?.buildings.some(b=>b.type==='market'))openSheet('market');};
  $('build-button').onclick=()=>{ui.selected=null;ui.category='combat';openSheet('build');};
  $('pause-button').onclick=()=>{if(!game||game.status!=='playing')return;game.paused=!game.paused;updateHUD();persist();sound('click');};
  $('speed-button').onclick=()=>{if(!game)return;game.speed=game.speed%3+1;updateHUD();persist();};
  $('launch-button').onclick=()=>{if(game&&resultOf(game.launchEarly())){game.paused=false;updateHUD();persist();}};
  $('place-cancel').onclick=()=>{ui.placing=null;ui.tile=null;$('placement-bar').hidden=true;};
  $('place-confirm').onclick=()=>{if(!ui.placing||!ui.tile)return;const result=game.build(ui.placing,ui.tile.x,ui.tile.y);if(resultOf(result,`${B[ui.placing].name} 설치 완료`)){ui.placing=null;ui.tile=null;$('placement-bar').hidden=true;ui.selected=null;closeSheet();}};
  $('battle-canvas').addEventListener('pointerdown',e=>{if(!started||game.status!=='playing'||!$('confirm-layer').hidden)return;const tile=renderer.tile(e.clientX,e.clientY);if(tile.x<0||tile.x>6||tile.y<0||tile.y>11)return;
    if(ui.placing){ui.tile=tile;updatePlacement();return;}
    if(game.pickup&&game.pickup.x===tile.x&&game.pickup.y===tile.y){const r=game.collect();if(!r.error)resultOf(r,`${r.artifact.name} 회수 · ${r.artifact.desc}`);return;}
    const b=game.buildingAt(tile.x,tile.y);if(b){ui.selected=b.id;openSheet('building');return;}
    ui.selected=null;closeSheet();const ore=game.depositAt(tile.x,tile.y);if(ore&&(!ore.deep||game.scanned))toast(`${ore.deep?'지하 ':''}${ore.resource==='iron'?'철':'우라늄'} 광맥 · 채굴기 설치${ore.deep?' 후 LV2 업그레이드':''}`);
  });
  function updatePlacement(){if(!ui.placing)return;const name=B[ui.placing].name;$('placement-name').innerHTML=`${name} · ${cost('iron',B[ui.placing].cost[0],'철 '+B[ui.placing].cost[0])}`;$('placement-bar').hidden=false;const error=ui.tile?game.canBuild(ui.placing,ui.tile.x,ui.tile.y):'타일을 눌러 위치를 선택하세요';$('placement-hint').textContent=error||`${String.fromCharCode(65+ui.tile.x)}${String(ui.tile.y+1).padStart(2,'0')} · 설치 가능`;$('place-confirm').disabled=!!error;}
  const art=(type,cls='building-art')=>`<img class="${cls}" src="${renderer.icon(type)}" alt="">`;
  const cost=(resource,amount,label)=>`<span class="cost${game.resources[resource]<amount?' cost-shortage':''}" data-resource="${resource}" data-cost="${amount}">${label}</span>`;
  function updateCosts(){document.querySelectorAll('[data-cost]').forEach(el=>el.classList.toggle('cost-shortage',game.resources[el.dataset.resource]<Number(el.dataset.cost)));}
  const btn=(action,label,kind='secondary',extra='')=>`<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;
  function renderSheet(){const panel=ui.panel;if(!panel)return;const titles={build:'방어 시설 설치',building:'시설 관리',menu:'지휘 메뉴',market:'보급 마켓',artifacts:'아티펙트',briefing:'작전 브리핑'};
    $('sheet').classList.toggle('build-sheet',panel==='build');$('sheet-title').textContent=titles[panel];$('sheet-kicker').textContent={build:'CONSTRUCTION / SELECT FACILITY',building:'FACILITY / STATUS',menu:'COMMAND / OPERATIONS',market:'SUPPLY / EXCHANGE',artifacts:'EQUIPMENT / 3 SLOTS',briefing:'FIELD MANUAL / READ BEFORE DEPLOYMENT'}[panel];let html='';
    if(panel==='build'){
      const tabs=[['combat','공격'],['industry','생산'],['defense','방어'],['support','지원']];html=`<div class="tabs">${tabs.map(([id,name])=>btn('category',name,id===ui.category?'active':'',`data-value="${id}"`)).join('')}</div><div class="building-grid">`;
      for(const [id,d]of Object.entries(B).filter(([,d])=>d.category===ui.category)){const locked=!game.unlocked[id+':1'];html+=`<button class="build-card ${locked?'locked':''}" data-action="${locked?'unlock':'choose-build'}" data-level="1" data-value="${id}"><span class="card-power">${d.power[0]?'ϟ '+d.power[0]:d.supply?'ϟ +'+d.supply:'무전력'}</span>${art(id)}<strong>${d.name}</strong><p>${d.desc}</p><span class="card-cost">${locked?cost('research',d.research,'⌘ 연구 '+d.research):'설치 · '+cost('iron',d.cost[0],'철 '+d.cost[0])}</span></button>`;}html+='</div>';
    }else if(panel==='building'){
      const b=game.buildings.find(b=>b.id===ui.selected);if(!b){closeSheet();ui.selected=null;return;}const d=B[b.type],max=b.level===d.cost.length,needResearch=!max&&!game.unlocked[b.type+':'+(b.level+1)];$('sheet-title').textContent=d.name;
      html=`<div class="selected-building">${art(b.type)}<div class="building-meta"><div class="level-badge">LEVEL ${String(b.level).padStart(2,'0')} / ${String(d.cost.length).padStart(2,'0')}</div><div class="hp-text"><span>HP</span><span id="building-hp">${Math.ceil(b.hp)} / ${game.maxHP(b)}</span></div><div class="hp-track"><i id="building-hp-bar" style="width:${100*b.hp/game.maxHP(b)}%"></i></div><p class="building-state ${b.powered?'':'off'}" id="building-state">${buildingState(b)}</p></div></div><p class="section-note">${d.desc}</p><div class="stats-grid"><div>전력 소비 <b>${d.power[b.level-1]}</b></div><div>누적 투입 철 <b>${b.invested}</b></div>${d.damage?`<div>공격력 <b>${d.damage[b.level-1]}</b></div><div>공격 간격 <b>${d.interval}s</b></div><div>사거리 <b>${d.range*10}m</b></div><div>타일 <b>${String.fromCharCode(65+b.x)}${b.y+1}</b></div>`:''}</div><div class="manage-actions">${btn(needResearch?'unlock':'upgrade',`${needResearch?'연구':'업그레이드'}<small>${max?'최고 레벨':needResearch?'LV'+(b.level+1)+' · '+cost('research',100,'연구 100'):'LV'+(b.level+1)+' · '+cost('iron',game.upgradeCost(b),'철 '+game.upgradeCost(b))}</small>`,'primary',max?'disabled':`data-value="${b.type}" data-level="${b.level+1}"`)}${btn('repair',`수리<small id="repair-cost">${cost('iron',game.repairCost(b),'철 '+game.repairCost(b))} · HP 90%</small>`)}${btn('demolish','철거<small>회수 자원 확인</small>','danger')}</div>`;
      const utility={market:['market','마켓 열기']};if(utility[b.type])html+=`<div class="utility-actions">${btn(...utility[b.type])}</div>`;
    }else if(panel==='menu'){
      html=`<p class="section-note">${game.paused?'시간이 멈춰 있습니다. 건설·수리·거래는 가능합니다.':'작전 진행 중입니다. 메뉴를 열어도 시간은 흐릅니다.'}</p><div class="menu-grid">${btn('artifacts','◈ 아티펙트')}${btn('paths',ui.overlay==='paths'?'이동 경로 숨기기':'↳ 이동 경로 보기')}${btn('save','현재 작전 저장')}${btn('sound',settings.sound?'♪ 사운드 켜짐':'♪ 사운드 꺼짐')}${btn('briefing','작전 브리핑')}${btn('restart','새 작전 시작','danger')}${btn('close','전장으로 돌아가기')}</div><div class="menu-info">SEED ${game.seed} · ${Math.floor(game.time/60)}:${String(Math.floor(game.time%60)).padStart(2,'0')}<br>자원별 보유 한도 ${fmt(game.capacity())} · 처치 ${game.kills}<br>전력 수요 ${game.power.demand.toFixed(1)} / 공급 ${game.power.supply} · 실제 사용 ${game.power.used.toFixed(1)}<br>5초마다 자동 저장 · 백그라운드 전환 시 자동 정지</div>`;
    }else if(panel==='market'){
      html=`<p class="section-note">${game.marketOnline()?'마켓 연결됨 · 결정으로 거래합니다.':'마켓이 작동해야 거래할 수 있습니다. 연구 후 건설하고 전력을 연결하세요.'}</p><div class="tabs">${btn('market-tab','자원 교환',ui.marketTab==='resources'?'active':'','data-value="resources"')}${btn('market-tab','아티펙트',ui.marketTab==='artifacts'?'active':'','data-value="artifacts"')}</div>`;
      if(ui.marketTab==='resources')for(const [id,name,buy,sell]of [['iron','철',50,35],['uranium','우라늄',25,17]])html+=`<div class="trade-row"><h3>${id==='iron'?'▰':'◉'} ${name} ×100</h3><div class="button-row">${btn('buy-resource',`100개 구매 <small>${cost('crystal',buy,'결정 −'+buy)}</small>`,'primary',`data-value="${id}"`)}${btn('sell-resource',`${cost(id,100,name+' 100개')} 판매 <small>결정 +${sell}</small>`,'secondary',`data-value="${id}"`)}</div></div>`;
      else for(const a of A)html+=`<div class="artifact-row"><div class="artifact-symbol">${a.symbol}</div><div class="artifact-info"><small>${a.tier}</small><h3>${a.name}</h3><p>${a.desc}</p></div>${btn('buy-artifact',game.owned.includes(a.id)?'보유 중':cost('crystal',a.price,'◆ '+a.price),'primary',`data-value="${a.id}" ${game.owned.includes(a.id)?'disabled':''}`)}</div>`;
    }else if(panel==='artifacts'){
      html=`<p class="section-note">최대 3개 장착 · 같은 종류는 중복 장착할 수 없습니다.<br>시작 보급품은 전장 중앙의 금색 상자를 눌러 회수하세요.</p><div class="slots">`;
      for(let i=0;i<3;i++){const a=A.find(a=>a.id===game.equipped[i]);html+=a?`<button class="slot filled" data-action="equip" data-value="${a.id}"><b>${a.symbol}</b>${a.name}</button>`:`<div class="slot"><b>+</b>빈 슬롯 ${i+1}</div>`;}html+='</div>';
      if(!game.owned.length)html+='<p class="section-note">아직 보유한 아티펙트가 없습니다.</p>';
      for(const id of game.owned){const a=A.find(a=>a.id===id);html+=`<div class="artifact-row"><div class="artifact-symbol">${a.symbol}</div><div class="artifact-info"><small>${a.tier}</small><h3>${a.name}</h3><p>${a.desc}</p></div><div class="artifact-actions">${btn('equip',game.has(id)?'장착 해제':'장착','primary',`data-value="${id}"`)}${btn('sell-artifact',`판매 ◆ ${Math.floor(a.price*.5)}`,'secondary',`data-value="${id}"`)}</div></div>`;}
    }else if(panel==='briefing'){
      html=`<div class="manual"><h3>01 / 방어선을 구축하세요</h3><p>우측 하단 <b>+</b>로 시설을 선택한 뒤 타일을 누르고 설치를 확정하세요. 기관포탑은 전력 없이 작동합니다. 일반 적 20마리가 하단을 통과하면 패배합니다. 보스는 한 마리만 통과해도 즉시 패배합니다.</p><h3>02 / 생산과 연구를 연결하세요</h3><p>철 광맥 위에 채굴기를 놓고 25m 안에 태양광을 건설하세요. 송신기로 전력망을 확장할 수 있습니다. 연구소에서 점수를 생산하고 + 건설 목록의 연구 버튼으로 새 시설을 해금하세요. 상위 레벨 연구는 해당 건물의 관리 패널에서 진행합니다. 전력 소비 시설은 연결되어야 작동합니다.</p><h3>03 / 막힌 길은 공격받습니다</h3><p>중형은 1칸, 대형은 2×2 공간이 필요합니다. 소형은 건물 사이의 틈으로 통과합니다. 길을 완전히 막으면 적이 건물을 부수고 전진합니다.</p><h3>04 / 정지 시간을 활용하세요</h3><p>하단 Ⅱ 버튼으로 시간을 멈추고 건설·수리·업그레이드·철거·거래하세요. 건물을 누르면 관리 패널이 열립니다. 철거는 회수 자원을 확인한 후 실행됩니다.</p><h3>05 / 환경과 보급</h3><p>5·15·25웨이브에는 유성우, 9·19·29에는 산성비가 발생합니다. 방어막으로 보호하세요. 금색 보급품을 회수하고 메뉴에서 아티펙트 3개를 장착하세요.</p><h3>작전 목표</h3><p>30웨이브의 잔여 적을 모두 처리하고 돌파 수를 20 미만으로 유지하세요. 일반 웨이브는 20마리, 보스는 1마리입니다. 첫 웨이브는 30초 후, 이후에는 90초(1분 30초)마다 출발합니다. 하단 버튼으로 준비를 일찍 마칠 수 있습니다.</p></div>`;
      if(started&&game.wave===0&&game.buildings.length===0)html+=btn('quick',`추천 초반 배치 · ${cost('iron',800,'철 800')}`,'primary wide');html+=btn('close',started?'전장으로 돌아가기':'브리핑 닫기','secondary wide');
    }
    const content=$('sheet-content'),scroll=content.scrollTop;content.innerHTML=html;content.scrollTop=scroll;
  }
  function buildingState(b){const dep=game.depositAt(b.x,b.y);return !b.powered?b.reason:b.type==='mine'&&dep?.deep&&b.level<2?'지하 채굴은 LV2부터 가능':'● 정상 작동';}
  function demolishPrompt(){
    const b=game.buildings.find(b=>b.id===ui.selected);if(!b){closeSheet();return;}
    const impact=game.demolitionImpact(b),quote=impact.amount;
    const loss=Object.entries(impact.lost).filter(([,n])=>n>0).map(([k,n])=>`${{iron:'철',uranium:'우라늄',crystal:'결정'}[k]} ${Math.ceil(n)}`).join(', ');
    modal(`${B[b.type].name} 철거`, `<p>LV${b.level} · HP ${Math.ceil(b.hp)} / ${game.maxHP(b)}<br>철거하면 시설이 제거되고 전력망과 이동 경로가 바뀝니다.</p><div class="refund"><span>회수되는 자원 · 철</span><b>+${quote}</b></div>${impact.received<quote?`<p>보유 한도로 실제 수령은 ${Math.floor(impact.received)}입니다. 초과분은 사라집니다.</p>`:''}${loss?`<p>창고 철거로 보유 한도가 ${fmt(impact.capacity)}로 줄어 ${loss}이 추가로 소실됩니다.</p>`:''}<p>철거를 진행할까요?</p>`,()=>{
      const current=game.buildings.find(v=>v.id===b.id);if(current){const next=game.demolitionImpact(current);if(Math.floor(next.received)!==Math.floor(impact.received)||Object.keys(next.lost).some(k=>Math.ceil(next.lost[k])!==Math.ceil(impact.lost[k]))){toast('회수량 또는 보유 한도가 변경되었습니다. 다시 확인하세요.');demolishPrompt();return;}}
      const r=game.demolish(b.id,quote);if(r.error){toast(r.error);if(r.quote!==undefined)demolishPrompt();else closeSheet();}else{resultOf(r,`철거 완료 · 철 ${Math.floor(r.received)} 회수`);ui.selected=null;closeSheet();}
    },'철거 확인');
  }
  function quickDeploy(){if(game.wave!==0||game.buildings.length||game.resources.iron<800){toast('아무 시설이 없는 준비 단계에서 철 800이 필요합니다.');return;}
    // Plan on a copy first: the preset is applied only if every placement succeeds.
    const copy=Game.restore(game.serialize());copy.paused=game.paused;const steps=[];
    const ore=copy.deposits.filter(d=>d.resource==='iron'&&!d.deep).sort((a,b)=>a.y-b.y)[0];
    copy.build('mine',ore.x,ore.y);steps.push(['mine',ore.x,ore.y]);
    for(const target of [{x:2,y:3},{x:4,y:3},{x:2,y:6},{x:4,y:6},{x:3,y:9}]){const candidates=[];for(let y=1;y<=10;y++)for(let x=0;x<7;x++)if(!copy.canBuild('gun',x,y))candidates.push({x,y});candidates.sort((a,b)=>D.dist(a,target)-D.dist(b,target));const p=candidates[0];if(!p){toast('추천 배치 공간이 부족합니다.');return;}copy.build('gun',p.x,p.y);steps.push(['gun',p.x,p.y]);}
    for(const type of ['solar','lab']){const anchor=type==='solar'?{x:ore.x,y:ore.y}:copy.buildings.find(b=>b.type==='solar');const candidates=[];for(let y=1;y<=10;y++)for(let x=0;x<7;x++)if(!copy.canBuild(type,x,y)&&D.dist({x,y},anchor)<=2)candidates.push({x,y});candidates.sort((a,b)=>D.dist(a,anchor)-D.dist(b,anchor));if(!candidates.length){toast('추천 배치 공간이 부족합니다.');return;}const p=candidates[0];copy.build(type,p.x,p.y);steps.push([type,p.x,p.y]);}
    for(const [type,x,y]of steps)game.build(type,x,y);closeSheet();toast('기관포탑 5기·채굴기·태양광·연구소 배치 완료. 준비되면 웨이브를 출발시키세요.');persist();updateHUD();
  }
  $('sheet-content').addEventListener('click',event=>{const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,value=b.dataset.value;
    if(action==='close'){closeSheet();ui.selected=null;return;}
    if(action==='briefing'){openSheet('briefing');return;}
    if(!game)return;
    if(action==='category'){ui.category=value;renderSheet();return;}
    if(action==='choose-build'){if(!game.unlocked[value+':1']){return;}ui.placing=value;ui.tile=null;ui.selected=null;closeSheet();updatePlacement();return;}
    if(action==='upgrade'){const selected=game.buildings.find(x=>x.id===ui.selected);if(selected&&!game.unlocked[selected.type+':'+(selected.level+1)]&&selected.level<B[selected.type].cost.length){if(resultOf(game.research(selected.type,selected.level+1),'기술 연구 완료'))renderSheet();return;}if(resultOf(game.upgrade(ui.selected),'업그레이드 완료'))renderSheet();return;}
    if(action==='repair'){if(resultOf(game.repair(ui.selected),'HP를 90%까지 수리했습니다.'))renderSheet();return;}
    if(action==='demolish'){demolishPrompt();return;}
    if(['market','artifacts'].includes(action)){openSheet(action);return;}
    if(action==='paths'){ui.overlay=ui.overlay===action?'none':action;closeSheet();toast(ui.overlay==='none'?'전장 오버레이 숨김':'이동 경로 · 중형 / 대형 / 소형');return;}
    if(action==='save'){persist(false);return;}
    if(action==='sound'){settings.sound=!settings.sound;storeSettings();renderSheet();return;}
    if(action==='restart'){modal('새 작전 시작','<p>현재 작전의 진행 상황은 새 작전으로 교체됩니다.</p>',()=>start(false),'새 작전 시작');return;}
    if(action==='unlock'){if(resultOf(game.research(value,Number(b.dataset.level)),'기술 연구 완료'))renderSheet();return;}
    if(action==='market-tab'){ui.marketTab=value;renderSheet();return;}
    if(action==='buy-resource'||action==='sell-resource'){resultOf(game.trade(value,action==='buy-resource'),'자원 교환 완료');return;}
    if(action==='buy-artifact'){if(resultOf(game.buyArtifact(value),'구매 완료 · 아티펙트 메뉴에서 장착하세요.'))renderSheet();return;}
    if(action==='equip'){if(resultOf(game.equip(value)))renderSheet();return;}
    if(action==='sell-artifact'){if(resultOf(game.sellArtifact(value),'아티펙트 판매 완료'))renderSheet();return;}
    if(action==='quick')quickDeploy();
  });
  function updateHUD(){if(!game)return;document.querySelectorAll('[data-overlay]').forEach(button=>button.setAttribute('aria-pressed',String(ui.resourceOverlay===button.dataset.overlay)));$('market-button').disabled=game.status!=='playing'||!game.buildings.some(b=>b.type==='market');$('market-button').title=$('market-button').disabled?'마켓 건설 후 이용 가능':'보급 마켓';for(const r of ['iron','uranium','crystal','research'])$(r).textContent=fmt(game.resources[r]);$('energy').innerHTML=`${Math.ceil(game.power.demand)}<span>/${game.power.supply}</span>`;$('energy').parentElement.classList.toggle('shortage',game.power.used+1e-6<game.power.demand);$('iron').parentElement.title=`철 / 자원별 보유 한도 ${fmt(game.capacity())}`;
    $('wave').textContent=String(game.wave).padStart(2,'0');$('phase-label').textContent=game.wave===0?'DEPLOYMENT':game.status!=='playing'?'OPERATION ENDED':W[game.wave-1].boss?'BOSS APPROACHING':'DEFENSE IN PROGRESS';$('wave-name').textContent=game.wave===0?'방어 시설을 배치하세요':W[game.wave-1].name;$('countdown').textContent=game.wave<30?Math.max(0,Math.ceil(game.nextWave-game.time))+'s':`${game.enemies.length+game.pending.length} 잔여`;$('wave-progress').style.width=game.wave===30?'100%':D.clamp((game.nextWave-game.time)/(game.wave===0?D.FIRST_WAVE_DELAY:D.WAVE_INTERVAL)*100,0,100)+'%';$('leaks').innerHTML=String(game.leaks).padStart(2,'0')+'<span> / 20</span>';$('integrity-ticks').innerHTML=Array.from({length:20},(_,i)=>`<i class="${i<game.leaks?'broken':''}"></i>`).join('');
    $('pause-badge').hidden=!game.paused||game.status!=='playing';$('pause-button').textContent=game.paused?'▶':'Ⅱ';$('pause-button').setAttribute('aria-label',game.paused?'작전 재개':'일시 정지');$('speed-button').innerHTML=game.speed+'<span>×</span>';$('launch-button').disabled=!!(game.enemies.length||game.pending.length)||game.wave>=30||game.status!=='playing';$('launch-button').innerHTML=game.wave===0?'웨이브 출발 <span>▸</span>':game.wave>=30?'마지막 방어전':game.enemies.length||game.pending.length?`적 ${game.enemies.length+game.pending.length} 남음`:'다음 웨이브 <span>▸</span>';
    const acid=game.weather.find(w=>w.kind==='acid'),meteor=game.weather.filter(w=>w.kind==='meteor');$('weather-label').hidden=!acid&&!meteor.length;$('weather-label').textContent=acid?`☂ 산성비 · ${Math.ceil(acid.end-game.time)}초`:`☄ 유성우 · ${meteor.length}회 남음`;
    if(ui.panel==='building'){const b=game.buildings.find(b=>b.id===ui.selected);if(!b){ui.selected=null;closeSheet();}else{if($('building-hp'))$('building-hp').textContent=`${Math.ceil(b.hp)} / ${game.maxHP(b)}`;if($('building-hp-bar'))$('building-hp-bar').style.width=100*b.hp/game.maxHP(b)+'%';if($('building-state')){$('building-state').textContent=buildingState(b);$('building-state').classList.toggle('off',!b.powered);}if($('repair-cost'))$('repair-cost').innerHTML=`${cost('iron',game.repairCost(b),'철 '+game.repairCost(b))} · HP 90%`;}}
    if(ui.placing)updatePlacement();updateCosts();
  }
  function endScreen(){closeSheet();hideModal();ui.placing=null;$('placement-bar').hidden=true;$('pause-badge').hidden=true;$('build-button').disabled=true;const won=game.status==='won';$('result-screen').hidden=false;$('result-screen').innerHTML=`<div class="eyebrow">OPERATION ${won?'COMPLETE':'TERMINATED'} / SECTOR 07</div><div class="result-emblem">${won?'✦':'⌖'}</div><h2>${won?'LINE HELD.':'LINE BREACHED.'}</h2><h3>${won?'전초기지를 지켜냈습니다.':game.lossReason==='boss'?'보스가 방어선을 돌파했습니다.':'방어선이 무너졌습니다.'}</h3><p>${won?'30번의 습격을 버텨냈습니다.<br>이 행성에 우리의 내일이 남았습니다.':'다음 작전에서는 생산과 방어의 균형을 바꿔보세요.<br>정지 중에도 시설을 건설하고 수리할 수 있습니다.'}</p><div class="result-stats"><div>도달 웨이브<b>${game.wave} / 30</b></div><div>군체 처치<b>${fmt(game.kills)}</b></div><div>방어선 돌파<b>${game.leaks} / 20</b></div><div>작전 시간<b>${Math.floor(game.time/60)}:${String(Math.floor(game.time%60)).padStart(2,'0')}</b></div></div><button class="primary wide" id="result-restart">새 작전 시작 <span>↗</span></button>`;$('result-restart').onclick=()=>start(false);persist();}
  document.addEventListener('keydown',e=>{if(!$('confirm-layer').hidden){if(e.key==='Escape'){hideModal();e.preventDefault();}if(e.key==='Tab'){const first=$('confirm-no'),last=$('confirm-yes');if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}return;}if(e.key==='Escape'){closeSheet();ui.selected=null;ui.placing=null;$('placement-bar').hidden=true;}if(e.code==='Space'&&started&&e.target===document.body){e.preventDefault();$('pause-button').click();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.status==='playing'){game.paused=true;updateHUD();persist();}});window.addEventListener('pagehide',()=>persist());
  let last=performance.now(),acc=0,hudClock=0,saveClock=0;
  function frame(now){const delta=Math.min((now-last)/1000,.2);last=now;
    if(started&&game){if(!game.paused&&game.status==='playing'){acc+=delta*game.speed;while(acc>=1/30){game.tick(1/30);acc-=1/30;}}else acc=0;
      for(const event of game.events){renderer.event(event);if(['shot','build','death'].includes(event.type))sound(event.type);if(event.type==='wave'){toast(`${event.boss?'보스 접근':'군체 접근'} · WAVE ${String(event.wave).padStart(2,'0')} · ${event.name}`);sound('wave');}if(event.type==='end')endScreen();}game.events=[];
      hudClock+=delta;saveClock+=delta;if(hudClock>.2){hudClock=0;updateHUD();}if(saveClock>5){saveClock=0;persist();}renderer.draw(game,ui,delta,now/1000);
    }else{preview.time=now/1000;renderer.draw(preview,ui,delta,now/1000);}requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Diagnostics for local acceptance tests and performance inspection.
  window.XenoTide={get state(){return game;},get ui(){return {...ui};},version:D.VERSION};
})();
