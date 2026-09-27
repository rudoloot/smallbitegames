import {WORLD,Supply,indexData,fitWorld,clientToWorld,returnTarget,blankSave,recordMerge,unlocked} from './core.js';
import {readSave,writeSave} from './storage.js';
import {Physics} from './physics.js';
import {Renderer} from './renderer.js';
import {paintIcon,familySVG,prepareAssets,sprite} from './art.js';
import {SHELF_IDS,SHELF_SET,shelfCount,shelfItems} from './collections.js';
import {geometryFromAlpha} from './collision-shapes.js';

const $=id=>document.getElementById(id);
const icons={pause:'<path d="M8 5v14M16 5v14"/>',book:'<path d="M12 6Q7 3 3 5v14q4-2 9 1q5-3 9-1V5q-4-2-9 1v14"/>',settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',back:'<path d="m14 5-7 7 7 7"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
$('pause-button').innerHTML=icon('pause');$('book-button').innerHTML=icon('book');$('settings-button').innerHTML=icon('settings');
const debug=new URLSearchParams(location.search).get('debug')==='1';
const partnerOrigins=['https://rudoloot.github.io'];
let data,save,physics,renderer,supply,score=0,highestTier=0,category='all',screen='shelf',modal=false,portrait=false,aim=640,pointer=null,previousTime=0,accumulator=0,runDiscoveries=[],runCollections=[],toastTimer,mergeTimer,lastFocus,saveError=false,dropCount=0,audioContext;
const milestoneCopy={count_1:['첫 번째 하트','아빠가 만들어 준 첫 장난감!'],count_5:['아빠와 우리','아빠랑 만드는 거 좋아!'],count_10:['최고의 아빠','우리가 직접 그렸어요. 아빠 최고!'],count_20:['아빠에게 쓰는 편지','아빠가 만들어 준 거 다 기억해.'],count_35:['아빠의 종이 메달','우리 아빠에게 주는 특별한 상!'],count_50:['우리 아빠 최고!','아빠랑 함께여서 행복해.'],category_food:['우리 가족 소풍','아빠랑 소풍 가는 날!'],category_animals:['우리 집 동물원','발자국을 따라가 볼까?'],category_myth:['하늘까지 함께','아빠랑 하늘까지 가 볼래!'],category_magic:['최고의 마법사','아빠는 최고의 마법사!'],category_tech:['우리의 우주여행','아빠랑 우주여행!']};
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function persist(){if(debug)return true;const ok=writeSave(save);if(!ok&&!saveError)notify('기록을 저장할 수 없어요. 이 판은 계속할 수 있어요.');saveError=!ok;return ok;}
Object.assign(milestoneCopy,{count_3:milestoneCopy.count_5,count_6:milestoneCopy.count_10,count_10:milestoneCopy.count_20,count_14:milestoneCopy.count_35,count_18:milestoneCopy.count_50});
function count(){return shelfCount(save);}
function sound(tier=1){if(save.settings.muted)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(280+tier*45,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(440+tier*55,audioContext.currentTime+.1);gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.24);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.25);}catch{}}
function isRunning(){return physics&&!physics.over&&screen==='play'&&!modal&&!portrait&&!document.hidden;}
function shortResult(text){$('merge-label').textContent=text;$('merge-label').classList.add('visible');clearTimeout(mergeTimer);mergeTimer=setTimeout(()=>$('merge-label').classList.remove('visible'),1800);}
function onMerge(event){
  score+=event.item.score;highestTier=Math.max(highestTier,event.item.tier);save.highScore=Math.max(save.highScore,score);
  const result=recordMerge(save,event.item,event.recipe.id);if(result.firstDiscovery)runDiscoveries.push(event.item.id);if(result.firstCollection)runCollections.push(event.item.id);
  renderer.burst(event);shortResult(`${result.firstCollection?'♥ ':result.firstDiscovery?'✦ ':''}${event.item.name}  +${event.item.score}`);sound(event.item.tier);persist();updateHud();
}
function updateHud(){
  $('score').textContent=score.toLocaleString('ko-KR');$('best-score').textContent=`BEST ${save.highScore.toLocaleString('ko-KR')}`;
  if(supply){paintIcon($('current-icon'),data.byId.get(supply.current));paintIcon($('next-icon'),data.byId.get(supply.next));$('current-name').textContent=data.byId.get(supply.current).name;$('next-name').textContent=`다음 ${data.byId.get(supply.next).name}`;}
}
function makeCanvas(item,options={}){const canvas=document.createElement('canvas');canvas.width=canvas.height=160;canvas.setAttribute('aria-hidden','true');paintIcon(canvas,item,options);return canvas;}
function renderShelf(){
  const n=count();$('total-count').textContent=`${n} / 18`;$('family').innerHTML=familySVG(n);
  const memoryKeys=unlocked(save,data);const last=memoryKeys.filter(k=>k.startsWith('count_')).at(-1);
  $('family-line').textContent=last?milestoneCopy[last][1]:'아빠, 오늘은 뭐 만들 거야?';
  $('memory-note').hidden=n<1;if(last)$('memory-note').innerHTML=`${n>=5?'<svg viewBox="0 0 100 44" width="76" height="38" aria-hidden="true"><g fill="none" stroke="#bb876b" stroke-width="2.2" stroke-linecap="round"><circle cx="50" cy="10" r="8"/><circle cx="25" cy="20" r="6"/><circle cx="75" cy="20" r="6"/><path d="M50 19v20m-3-10L32 31m21-2 15 2M25 27v13m50-13v13M38 41l12-8 12 8M21 20h1m7 0h1m41 0h1m7 0h1M46 10h1m6 0h1"/></g></svg>':'<small aria-hidden="true">♡</small>'}${milestoneCopy[last][0]}`;
  $('shelf-caption').textContent=n?`${memoryKeys.length}개의 추억이 자라고 있어요`:'우리의 첫 장난감을 기다리는 중';
  $('categories').replaceChildren();
  for(const cat of [{id:'all',name:'모두',color:'#dcb971'},...data.categories]){const items=shelfItems(data).filter(i=>cat.id==='all'||i.category===cat.id);const amount=items.filter(i=>save.collectionFirstCreatedAt[i.id]).length;const button=document.createElement('button');button.className=cat.id===category?'active':'';button.setAttribute('aria-pressed',String(cat.id===category));button.innerHTML=`<i class="category-dot" style="background:${cat.color}"></i>${cat.name}<span>${amount}/${items.length}</span>`;button.onclick=()=>{category=cat.id;renderShelf();};$('categories').append(button);}
  $('shelf-grid').replaceChildren();
  for(const item of shelfItems(data).filter(i=>category==='all'||i.category===category)){const got=!!save.collectionFirstCreatedAt[item.id];const button=document.createElement('button');button.className=`shelf-slot ${got?'collected':''}`;button.dataset.item=item.id;button.setAttribute('aria-label',`${item.name}, ${got?'수집함':'미수집'}`);button.append(makeCanvas(item,{toy:true,ghost:!got}));const name=document.createElement('span');name.className='item-name';name.textContent=item.name;button.append(name);if(got)button.insertAdjacentHTML('beforeend','<i class="new-dot"></i>');button.onclick=()=>openItem(item.id);$('shelf-grid').append(button);}
  $('start-button').querySelector('span').textContent=physics&&!physics.over?'이어서 만들기':'만들러 가기';
}
function showShelf(keepRun=false){
  if(!keepRun){physics?.destroy();physics=null;}
  screen='shelf';pointer=null;hideDialog();$('play-view').hidden=true;$('shelf-view').hidden=false;$('rotate').hidden=true;renderShelf();
  const fresh=unlocked(save,data).filter(k=>!save.seenMilestones.includes(k));
  if(fresh.length){save.seenMilestones.push(...fresh);persist();setTimeout(()=>{if(screen==='shelf')notify(`아이들이 선반을 꾸몄어요 · ${milestoneCopy[fresh[0]][0]}${fresh.length>1?` 외 ${fresh.length-1}개`:''}`);},300);}
}
function start(){
  if(physics&&!physics.over){screen='play';$('shelf-view').hidden=true;$('play-view').hidden=false;hideDialog();resize();$('game').focus();return;}
  physics?.destroy();score=0;highestTier=0;runDiscoveries=[];runCollections=[];dropCount=0;supply=new Supply();renderer.effects=[];
  physics=new Physics(data,{onMerge,onGameOver:()=>{persist();openResults();}});
  screen='play';$('shelf-view').hidden=true;$('play-view').hidden=false;$('drop-hint').style.opacity='1';$('debug-badge').hidden=!debug;hideDialog();updateHud();resize();$('game').focus();
}
function resize(){
  const was=portrait;portrait=window.innerHeight>window.innerWidth;
  if(screen==='play'){
    const rect=$('play-view').getBoundingClientRect();const fit=fitWorld(rect.width,rect.height);
    $('game-stage').style.width=`${fit.width}px`;$('game-stage').style.height=`${fit.height}px`;renderer?.resize(fit.width,fit.height);
    $('rotate').hidden=!portrait;pointer=null;
    if(was&&!portrait&&physics&&!physics.over&&!modal)openPause();
  }else $('rotate').hidden=true;
  accumulator=0;previousTime=0;
}
function openDialog(title,body,{wide=false,back=null,closable=true}={}){
  pointer=null;lastFocus=document.activeElement;modal=true;accumulator=0;
  $('dialog').className=`dialog ${wide?'wide':''}`;
  $('dialog').innerHTML=`<div class="dialog-header">${back?`<button class="icon-button" id="dialog-back" aria-label="뒤로">${icon('back')}</button>`:''}<h2 id="dialog-title">${title}</h2>${closable?`<button class="icon-button close-dialog" id="dialog-close" aria-label="닫기">${icon('close')}</button>`:''}</div>${body}`;
  $('overlay').hidden=false;$('dialog-close')?.addEventListener('click',hideDialog);$('dialog-back')?.addEventListener('click',back);$('dialog').focus();
  $('shelf-view').inert=true;$('play-view').inert=true;
}
function hideDialog(){modal=false;$('overlay').hidden=true;$('shelf-view').inert=false;$('play-view').inert=false;accumulator=0;previousTime=0;lastFocus?.focus?.();if(screen==='play')$('game').focus();}
function openPause(){
  if(!physics||physics.over)return;
  openDialog('잠깐 쉬어 가요',`<div class="stack"><button class="primary" id="resume">계속하기</button><button class="secondary" id="pause-book">조합 도감</button><button class="secondary" id="pause-shelf">장난감 선반</button><button class="secondary" id="restart">새로 만들기</button><button class="text-button" id="exit">게임 종료하기</button></div>`);
  $('resume').onclick=hideDialog;$('pause-book').onclick=()=>openBook(openPause);$('pause-shelf').onclick=()=>showShelf(true);$('exit').onclick=exitGame;
  $('restart').onclick=()=>{openDialog('다시 시작할까요?',`<p>이번 수조는 비워져요. 수집한 장난감과 추억은 그대로예요.</p><div class="row"><button class="secondary" id="cancel-restart">돌아가기</button><button class="primary" id="confirm-restart">새로 시작</button></div>`,{back:openPause});$('cancel-restart').onclick=openPause;$('confirm-restart').onclick=()=>{physics.destroy();physics=null;start();};};
}
function openResults(){
  const materials=runDiscoveries.filter(id=>data.byId.get(id).kind==='material');const fresh=unlocked(save,data).filter(k=>!save.seenMilestones.includes(k));
  openDialog('오늘의 작은 발견',`<div class="item-detail"><span class="tiny-label">SCORE</span><div class="result-score">${score.toLocaleString('ko-KR')}</div><div class="result-summary"><span>최고 ${save.highScore.toLocaleString('ko-KR')}</span><span>${highestTier}단계</span><span>새 재료 ${materials.length}</span></div>${runCollections.length?`<p>새 장난감 ${runCollections.map(id=>data.byId.get(id).name).join(' · ')}</p>`:''}${fresh.length?'<p>♥ 아이들이 선반에 선물을 준비했어요</p>':''}<div class="stack"><button class="primary" id="again">다시 만들기</button><button class="secondary" id="results-shelf">선반으로 · ${count()}/18</button><button class="text-button" id="exit">게임 종료하기</button></div></div>`,{closable:false});
  $('again').onclick=start;$('results-shelf').onclick=()=>showShelf();$('exit').onclick=exitGame;
}
function openItem(id,back=null){
  const item=data.byId.get(id),recipe=data.byResult.get(id);const made=save.craftedCountByItem[id]||0;const got=save.collectionFirstCreatedAt[id];
  openDialog(item.name,`<div class="item-detail"><canvas id="detail-art" width="200" height="200"></canvas><div class="stat-line">${item.tier}단계 · 조합 +${item.score}${made?` · ${made}번 만들었어요`:''}</div>${recipe?'<div class="recipe" id="recipe"></div>':'<p>무작위로 찾아오는 기본 원소예요.</p>'}${got?`<p>${new Date(got).toLocaleDateString('ko-KR')} · 선반에 놓인 첫날</p>`:SHELF_SET.has(item.id)?'<p>만들면 선반에 작은 장난감이 놓여요.</p>':''}${SHELF_SET.has(item.id)?'<canvas id="detail-toy" width="120" height="120" style="width:65px;height:65px"></canvas><div class="stat-line">선반 위 모습</div>':''}</div>`,{back});
  paintIcon($('detail-art'),item);if($('detail-toy'))paintIcon($('detail-toy'),item,{toy:true});
  if(recipe)recipe.inputs.forEach((input,i)=>{if(i){const plus=document.createElement('span');plus.textContent='+';$('recipe').append(plus);}const part=data.byId.get(input),button=document.createElement('button');button.append(makeCanvas(part));button.append(document.createTextNode(part.name));button.onclick=()=>openItem(input,()=>openItem(id,back));$('recipe').append(button);});
}
let bookQuery='',bookCategory='all';
function openBook(back=null){
  openDialog('조합 도감',`<div class="book-controls"><input id="book-search" type="search" placeholder="무엇을 만들어 볼까?" aria-label="아이템 검색"><select id="book-filter" aria-label="도감 카테고리"><option value="all">모두</option><option value="discovered">발견한 것</option><option value="materials">중간 재료</option>${data.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div id="book-grid" class="book-grid"></div>`,{wide:true,back});
  $('book-search').value=bookQuery;$('book-filter').value=bookCategory;
  function fill(){bookQuery=$('book-search').value;bookCategory=$('book-filter').value;$('book-grid').replaceChildren();const list=data.items.filter(i=>i.name.includes(bookQuery)&&(bookCategory==='all'||bookCategory==='discovered'&&save.discoveredItemIds.includes(i.id)||bookCategory==='materials'&&i.kind==='material'||i.tags.includes(bookCategory)));for(const item of list){const discovered=save.discoveredItemIds.includes(item.id);const button=document.createElement('button');button.className=`book-item ${discovered?'':'undiscovered'}`;button.append(makeCanvas(item));const name=document.createElement('span');name.textContent=item.name;button.append(name);const sub=document.createElement('small');sub.textContent=`${item.tier}단계 · +${item.score}`;button.append(sub);button.onclick=()=>openItem(item.id,()=>openBook(back));$('book-grid').append(button);}if(!list.length)$('book-grid').textContent='아직 그런 이름은 없어요.';}
  $('book-search').oninput=fill;$('book-filter').onchange=fill;fill();
}
function openMemories(){
  const keys=unlocked(save,data);openDialog('아빠에게, 우리가',`<div class="memory-list">${keys.map(k=>`<div class="memory-card"><strong>♡ ${milestoneCopy[k][0]}</strong><span>${milestoneCopy[k][1]}</span></div>`).join('')}</div>`);
}
function openSettings(){
  openDialog('작은 공방 설정',`<div class="stack"><button class="secondary" id="mute" aria-pressed="${save.settings.muted}">${save.settings.muted?'소리 켜기':'소리 끄기'}</button><button class="secondary" id="help">놀이 방법</button><button class="secondary" id="memories">우리의 추억 · ${unlocked(save,data).length}</button><button class="text-button" id="reset-record">기록 초기화</button><button class="text-button" id="exit">게임 종료하기</button></div>`);
  $('memories').onclick=openMemories;
  $('mute').onclick=()=>{save.settings.muted=!save.settings.muted;persist();openSettings();};$('help').onclick=()=>openDialog('작은 창조의 시작',`<div class="stack"><p>① 다음 원소를 보고, 자리를 골라 놓아요.</p><p>② 서로 맞는 재료가 닿으면 새 물건이 돼요.</p><p>③ 높은 단계일수록 더 많은 점수!</p><p>장난감은 수조에 남고, 선반에는 추억이 쌓여요.</p><p>점선 위로 2초 동안 쌓이면 이번 놀이는 끝나요.</p></div>`,{back:openSettings});$('exit').onclick=exitGame;
  $('reset-record').onclick=()=>{openDialog('추억을 지울까요?',`<p>장난감, 도감, 최고 점수와 가족 그림이 모두 초기화돼요.</p><div class="row"><button class="secondary" id="reset-no">간직하기</button><button class="primary" id="reset-yes">모두 지우기</button></div>`,{back:openSettings});$('reset-no').onclick=openSettings;$('reset-yes').onclick=()=>{save=blankSave();persist();showShelf();notify('새 공방을 준비했어요.');};};
}
function leave(){const target=returnTarget(location.search,location.origin,partnerOrigins);if(target)location.replace(target);else showShelf();}
function exitGame(){
  pointer=null;
  if(!persist()){
    openDialog('기록을 저장하지 못했어요',`<p>이번 기록이 남지 않을 수 있어요.</p><div class="stack"><button class="primary" id="retry-save">다시 시도</button><button class="secondary" id="leave-anyway">저장 없이 종료</button></div>`,{closable:false});$('retry-save').onclick=exitGame;$('leave-anyway').onclick=leave;return;
  }
  if(physics&&!physics.over){openDialog('공방을 나갈까요?',`<p>수집과 점수는 저장됐어요. 진행 중인 수조는 다시 열 수 없어요.</p><div class="row"><button class="secondary" id="stay">계속 만들기</button><button class="primary" id="leave">게임 종료하기</button></div>`);$('stay').onclick=()=>{if(screen==='play')hideDialog();else hideDialog();};$('leave').onclick=leave;}else leave();
}
function position(event){return clientToWorld(event.clientX,event.clientY,$('game').getBoundingClientRect());}
function drop(x){if(!isRunning())return false;if(physics.drop(x,supply.current)){supply.consume();dropCount++;$('drop-hint').style.opacity='0';updateHud();return true;}return false;}
function bind(){
  $('start-button').onclick=start;$('pause-button').onclick=openPause;$('book-button').onclick=()=>openBook();$('settings-button').onclick=openSettings;$('memory-note').onclick=openMemories;
  const canvas=$('game');
  canvas.addEventListener('pointerdown',e=>{if(!isRunning()||e.button!==0||pointer!==null)return;const p=position(e);if(p.x<WORLD.left||p.x>WORLD.right||p.y<WORLD.top||p.y>WORLD.bottom)return;pointer=e.pointerId;aim=p.x;canvas.setPointerCapture(e.pointerId);canvas.focus();});
  canvas.addEventListener('pointermove',e=>{if(!isRunning())return;const p=position(e);aim=Math.max(WORLD.left+22,Math.min(WORLD.right-22,p.x));if(pointer===null){const b=physics.pick(p.x,p.y);renderer.focus=b?{id:b.id,until:performance.now()+1500}:null;}});
  canvas.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;const p=position(e);pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(p.x>=WORLD.left&&p.x<=WORLD.right&&p.y>=WORLD.top&&p.y<=WORLD.bottom)drop(p.x);});
  canvas.addEventListener('pointercancel',()=>pointer=null);canvas.addEventListener('lostpointercapture',()=>pointer=null);
  canvas.addEventListener('keydown',e=>{if(!isRunning())return;if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')aim=Math.max(WORLD.left+22,aim-24);else if(e.key==='ArrowRight')aim=Math.min(WORLD.right-22,aim+24);else if(!e.repeat)drop(aim);}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(physics?.over)return;if(modal&&$('dialog-close'))hideDialog();else if(screen==='play')openPause();}
    if(e.key==='Tab'&&modal){const nodes=[...$('dialog').querySelectorAll('button,input,select,[tabindex="0"]')].filter(n=>!n.disabled);const first=nodes[0],last=nodes.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('dialog'))){e.preventDefault();first.focus();}}
  });
  window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{pointer=null;if(document.hidden&&screen==='play'&&physics&&!physics.over&&!modal)openPause();accumulator=0;previousTime=0;});
}
function frame(now){
  if(isRunning()){if(previousTime)accumulator+=Math.min(now-previousTime,67);let steps=0;while(accumulator>=1000/60&&steps<4&&isRunning()){physics.step();accumulator-=1000/60;steps++;}if(steps===4)accumulator=0;}else accumulator=0;
  previousTime=now;if(screen==='play'&&physics)renderer.render(physics,supply,aim,!isRunning());requestAnimationFrame(frame);
}
async function init(){
  try{const response=await fetch('data/game-data.json');if(!response.ok)throw Error('data');data=indexData(await response.json());await prepareAssets(data);data.geometry={};for(const item of data.items){const canvas=sprite(item);data.geometry[item.id]=geometryFromAlpha(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);}const loaded=debug?{save:blankSave(),error:false}:readSave(data);save=loaded.save;saveError=loaded.error;renderer=new Renderer($('game'),data);bind();showShelf();$('loading').hidden=true;if(saveError)notify('저장 기록을 읽지 못했어요. 이번에는 새 공방으로 시작해요.');
    if(debug)window.__game={
      snapshot:()=>({screen,modal,portrait,score,highestTier,collectionCount:count(),save:structuredClone(save),world:{...WORLD},current:supply?.current,next:supply?.next,time:physics?.time,dangerMs:physics?.dangerMs,over:physics?.over,blocks:physics?.blocks.map(b=>({id:b.id,itemId:b.itemId,x:b.position.x,y:b.position.y,r:b.visualRadius,eligible:b.eligible,parts:b.parts.length,bounds:structuredClone(b.bounds)}))||[]}),
      spawn:(id,x,y,options)=>physics.add(id,x,y,options),step:n=>{for(let i=0;i<n;i++)physics.step();},start,drop,
      grant:id=>{const item=data.byId.get(id);recordMerge(save,item,data.byResult.get(id)?.id||'');renderShelf();},
      setSupply:(current,next)=>{supply.current=current;supply.next=next;updateHud();},
      finish:()=>{physics.over=true;openResults();},setAim:x=>aim=x,geometry:()=>structuredClone(data.geometry),
    };
    requestAnimationFrame(frame);
  }catch(error){console.error(error);$('loading').innerHTML='<div>공방을 열지 못했어요.<br><br><button class="secondary" id="reload">다시 열기</button></div>';$('reload').onclick=()=>location.reload();}
}
init();
