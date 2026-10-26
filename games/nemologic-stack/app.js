'use strict';
const C=PicrossCore, N=C.N, MAX_STACK=C.maxStack, CHANNEL_COUNT=C.channels||3, CHANNELS=Array.from({length:CHANNEL_COUNT},(_,i)=>i), MONO=CHANNEL_COUNT===1, names=MONO?['명암']:['빨강','녹색','파랑'];
const themes=MONO?[['#555555','#e5e5e5']]:[['#c6544d','#fae8e3'],['#518568','#e2f0e4'],['#547fae','#e1ebf7']];
const TAB_ORDER=MONO?CHANNELS:[...CHANNELS,'all'];
const key=C.storageKey||(C.rule==='height-runs-max'?'rgb-stack-picross-v2-bull-height-runs-max':globalThis.PUZZLE_SPEC?'rgb-stack-picross-v1-bull-30-adjust30':'rgb-stack-picross-v1-rocket-10');
const $=id=>document.getElementById(id);
const allClues=[...C.clues.flat(),...C.combinedClues];
const CLUE_SLOTS={row:Math.max(1,...allClues.filter(c=>c.axis==='row').map(c=>c.groups.length)),col:Math.max(1,...allClues.filter(c=>c.axis==='col').map(c=>c.groups.length))};
document.documentElement.style.setProperty('--n',N);
const fixed=Array.from({length:N*N},()=>Array(CHANNEL_COUNT).fill(false));
GIVEN_DATA.forEach(g=>fixed[g.index][g.channel]=true);
let boardState=fresh(), tab=0, selected=0, history=[], pendingHint=null, errors=new Set(), completed=false, storageOK=true;
let paintValue=0, stroke=null;
let terrainSelection=null;
let inputMode='dpad';
function setInputMode(mode){
  if(inputMode===mode)return;
  finishStroke();window.stopStackControls?.();
  inputMode=mode;
  document.body.classList.toggle('touch-input-mode',mode==='touch');
  render();
}
function inTerrainLine(i){return terrainSelection!==null&&(terrainSelection.axis==='row'?Math.floor(i/N):i%N)===terrainSelection.line;}
function activeClue(axis,line){return selected!==null?(axis==='row'?Math.floor(selected/N):selected%N)===line:terrainSelection!==null&&terrainSelection.axis===axis&&terrainSelection.line===line;}
function selectBoardLine(axis,line){finishStroke();terrainSelection=line===null?null:{axis,line};selected=null;cancelHint();render();if(window.revealBoardLine)window.revealBoardLine(axis,line);}
let cellNodes=[],clueNodes=[],dragFrame=0,renderedSelection=null;
const dirtyCells=new Set();
function fresh(){const a=Array.from({length:N*N},()=>Array(CHANNEL_COUNT).fill(null));GIVEN_DATA.forEach(g=>a[g.index][g.channel]=g.value);return a;}
try{
  const ownSave=localStorage.getItem(key),legacySave=!C.noGivens&&!ownSave&&C.rule==='height-runs-max'?localStorage.getItem('rgb-stack-picross-v1-bull-30-adjust30'):null;
  const saved=JSON.parse(ownSave||legacySave||'null');
  if(saved && Array.isArray(saved.cells) && saved.cells.length===N*N && saved.cells.every(a=>Array.isArray(a)&&a.length===CHANNEL_COUNT&&a.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<=MAX_STACK))){
    boardState=saved.cells;
    if(legacySave)for(const g of globalThis.LEGACY_GIVENS||[])boardState[g.index][g.channel]=null;
    GIVEN_DATA.forEach(g=>boardState[g.index][g.channel]=g.value);
    if(TAB_ORDER.includes(saved.tab))tab=saved.tab;
    completed=isSolved();
  }
}catch{storageOK=false;}
function save(){
  try{localStorage.setItem(key,JSON.stringify({cells:boardState,tab}));}catch{storageOK=false;}
  try{if(globalThis.StackPuzzle?.statusKey)localStorage.setItem(StackPuzzle.statusKey,JSON.stringify({filled:boardState.flat().filter(v=>v!==null).length,complete:isSolved(),updated:Date.now()}));}catch{}
  if(!storageOK)say('이 브라우저에서는 자동 저장할 수 없어요.',true);
}
function say(message,warning=false){$('message').textContent=message;$('message').classList.toggle('warning',warning);}
function isSolved(){return boardState.every((cell,i)=>cell.every((v,c)=>v===C.solution[i][c]));}
function displayMode(){return document.body.dataset.presentation||'monochrome';}
function displayPalette(){return StackPalette.colors(globalThis.StackPuzzle||{},displayMode());}
function rgb(values){if(MONO)return displayPalette()[values[0]??0];const levels=values.map(v=>Math.round((v??0)*255/MAX_STACK));return 'rgb('+levels.join(',')+')';}
function drawCompletedPicture(){
  const ctx=$('win-art').getContext('2d');
  ctx.fillStyle=displayPalette()[0];ctx.fillRect(0,0,300,300);
  C.solution.forEach((cell,i)=>{ctx.fillStyle=rgb(cell);ctx.fillRect((i%N)*(260/N)+20,Math.floor(i/N)*(260/N)+20,260/N,260/N);});
}
window.selectStackPalette=mode=>{
  finishStroke();window.stopStackControls?.();
  document.body.dataset.presentation=mode==='color'?'color':'monochrome';
  StackPalette.writeMode(displayMode());
  const url=new URL(location.href);url.searchParams.set('mode',displayMode());window.history.replaceState(null,'',url);
  render();if(completed)drawCompletedPicture();window.updateStackModeLabel?.();
};
function cancelHint(){pendingHint=null;if(!$('hint'))return;$('hint').classList.remove('pending');$('hint').innerHTML='<span aria-hidden="true">✦</span>논리 힌트';}
function status(cells,channel,groups,total,knownClue){
  const data=cells.map(i=>channel==='all'?(boardState[i].every(v=>v!==null)?C.sum(boardState[i]):null):boardState[i][channel]);
  if(C.lineStatus)return C.lineStatus(data,groups,total,knownClue||C.clues[channel]?.find(clue=>clue.cells.every((v,p)=>v===cells[p])));
  if(channel==='all'){
    const lo=C.sum(cells.flatMap(i=>boardState[i].map(v=>v??0))), hi=C.sum(cells.flatMap(i=>boardState[i].map(v=>v??MAX_STACK)));
    if(lo>total||hi<total)return 'conflict';
  }else{
    const lo=C.sum(data.map(v=>v??0)),hi=C.sum(data.map(v=>v??MAX_STACK));
    if(lo>total||hi<total)return 'conflict';
    const clue=knownClue||C.clues[channel].find(c=>c.cells.every((v,p)=>v===cells[p]));
    if(!clue.patterns.some(mask=>data.every((v,p)=>v===null||Boolean((mask>>p)&1)===(v>0))))return 'conflict';
  }
  if(data.some(v=>v===null))return '';
  return C.sum(data)===total&&C.runs(data).join(',')===groups.join(',')?'done':'conflict';
}
function cellAppearance(i,channel){
  const row=Math.floor(i/N),col=i%N,cell=boardState[i],value=channel===null?null:cell[channel],anchor=channel===null?fixed[i].some(Boolean):fixed[i][channel];
  const classes=['cell',col===0?'first-col':'',row===0?'first-row':'',col%5===4?'major-col':'',row%5===4?'major-row':'',inputMode==='dpad'&&selected===i?'selected':'',anchor?'fixed':'',pendingHint?.index===i?'hint-cell':'',errors.has(`${i}:${channel}`)?'error':''];
  let bg='',fg='',content='';
  if(inTerrainLine(i))classes.push('line-focused');
  if((C.diagonals?.[window.overviewDiagonal]?.cells||C.diagonal?.cells)?.includes(i))classes.push('diagonal-cell');
  if(channel===null){
    classes.push('merged');
    if(cell.every(v=>v===null)){classes.push('unknown');}
    else if(cell.every(v=>v===0)){classes.push('zero');content='×';}
    else{bg=rgb(cell);fg='#ffffff';content=cell.some(v=>v===null)?'<span class="unknown-rgb">?</span>':'';}
  }else if(value===null){classes.push('unknown');}
  else if(value===0){classes.push('zero');content='×';if(MONO){bg=rgb(cell);fg=StackPalette.foreground(bg);}}
  else if(MONO){bg=rgb(cell);fg=StackPalette.foreground(bg);content=String(value);}
  else{
    const opacity=[0,.18,.36,.58,.84][Math.round(value*4/MAX_STACK)],colors=[[213,91,80],[73,143,92],[69,125,185]][channel];
    bg=`rgba(${colors.join(',')},${opacity})`;fg=value>=3?'#fff':themes[channel][0];
    content=`${value}<span class="micro" aria-hidden="true">${'<i></i>'.repeat(value)}</span>`;
  }
  if(content==='×')content='<svg class="cell-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 2L22 22M22 2L2 22"/></svg>';
  const desc=channel===null?cell.map((v,c)=>`${names[c]} ${v===null?'미정':v+'스택'}`).join(', '):`${names[channel]} ${value===null?'미정':value+'스택'}${anchor?', 공개 높이':''}`;
  return {row,col,classes:classes.join(' '),bg,fg,content,label:`${row+1}행 ${col+1}열, ${desc}`};
}
function getSelectedCoordinates(){
  const row=selected!==null?Math.floor(selected/N)+1:terrainSelection?.axis==='row'?terrainSelection.line+1:null;
  const col=selected!==null?selected%N+1:terrainSelection?.axis==='col'?terrainSelection.line+1:null;
  return {row,col};
}
function updateCoordinates(){
  const output=$('selection-coordinates');if(!output)return;
  const {row,col}=getSelectedCoordinates();
  output.querySelector('[data-coordinate="row"]').textContent=row??'—';
  output.querySelector('[data-coordinate="col"]').textContent=col??'—';
  output.setAttribute('aria-label',`${row===null?'행 미선택':row+'행'}, ${col===null?'열 미선택':col+'열'}`);
}
function updateProgress(){
  const filled=boardState.flat().filter(v=>v!==null).length;
  if($('progress-text'))$('progress-text').textContent=`${filled} / ${N*N*CHANNEL_COUNT}`;if($('progress-fill'))$('progress-fill').style.width=`${filled/(N*N*CHANNEL_COUNT)*100}%`;
}
function render(){
  if(dragFrame)cancelAnimationFrame(dragFrame);
  dragFrame=0;dirtyCells.clear();
  const focused=document.activeElement?.dataset?.index;
  const channel=tab==='all'?null:tab;
  if(MONO)names[0]=displayMode()==='color'?'색상':'명암';
  $('game-panel').hidden=channel===null;
  if($('terrain-panel'))$('terrain-panel').hidden=channel!==null;
  const theme=channel===null?['#64804e','#e8eedf']:themes[channel];
  document.documentElement.style.setProperty('--accent',theme[0]);document.documentElement.style.setProperty('--tint',theme[1]);
  $('game-panel').setAttribute('aria-label',`${displayMode()==='color'?'컬러':'명암'} 퍼즐`);
  const palette=displayPalette();
  document.querySelectorAll('#height-picker [data-value]').forEach(button=>{
    const value=Number(button.dataset.value);button.style.backgroundColor=palette[value];button.style.color=StackPalette.foreground(palette[value]);
    button.setAttribute('aria-label',`${value}스택`);
  });
  const next=new URL(StackPuzzle.next,location.href);if(next.pathname.endsWith('/game.html'))next.searchParams.set('mode',displayMode());else next.hash=displayMode();
  $('next-puzzle').setAttribute('href',next.pathname.split('/').pop()+next.search+next.hash);
  if($('board-title'))$('board-title').textContent=channel===null?'COLOR COMPOSITE':['RED CHANNEL','GREEN CHANNEL','BLUE CHANNEL'][channel];
  if($('anchor-count'))$('anchor-count').textContent=channel===null?GIVEN_DATA.length:GIVEN_DATA.filter(g=>g.channel===channel).length;
  const lineInfo=['row','col'].map(axis=>Array.from({length:N},(_,line)=>{
    const clue=(channel===null?C.combinedClues:C.clues[channel])[line+(axis==='col'?N:0)],cells=clue.cells,groups=clue.groups,total=clue.maximum??clue.total;
    const values=cells.map(i=>channel===null?(boardState[i].includes(null)?null:C.sum(boardState[i])):boardState[i][channel]);
    return {groups,total,feedback:ClueFeedback.evaluate(values,groups,total)};
  }));
  let html='<div id="selection-coordinates" class="corner coordinates" style="grid-row:1;grid-column:1" role="status" aria-live="polite" aria-atomic="true"><span data-coordinate="row">—</span><span aria-hidden="true">,</span><span data-coordinate="col">—</span></div>';
  for(let l=0;l<N;l++){
    for(const axis of ['row','col']){
      const a=axis==='row'?0:1,info=lineInfo[a][l],active=activeClue(axis,l);
      const place=a===0?`grid-row:${l+2};grid-column:1`:`grid-row:1;grid-column:${l+2}`;
      const totalPlace=a===0?`grid-row:${l+2};grid-column:${N+2}`:`grid-row:${N+2};grid-column:${l+2}`;
      const classes=active?'active-line':'';
      const tokens=info.groups.map(n=>C.rule==='height-runs-max'&&!C.stackSumRuns&&n===0?'·':n);
      const values=tokens.length||C.omitAllZeros?tokens:[0];
      const slots=values.map((n,k)=>`<span data-clue-token="${k}" class="clue-slot ${n==='·'?'gap-token':''} clue-${info.feedback.tokens[k]||'pending'}">${n}</span>`).join('');
      html+=`<div class="clue ${a===0?'left':'top'} ${classes}" data-clue="${a*N+l}" style="${place}" aria-label="${l+1}${a===0?'행':'열'} ${C.rule==='height-runs-max'?'동일 높이 구간':'연속 칸 수'} ${tokens.join(' ')||(C.omitAllZeros?'빈 줄':0)}"><div class="run-tokens">${slots}</div></div>`;
      html+=`<div class="clue total ${a===0?'right':'bottom'} ${classes} clue-${info.feedback.maximum||'pending'}" data-clue="${a*N+l}" style="${totalPlace}" aria-label="${l+1}${a===0?'행':'열'} ${C.rule==='height-runs-max'?'최대 높이':'스택 합'} ${info.total}">${info.total}</div>`;
    }
  }
  for(let i=0;i<N*N;i++){
    const a=cellAppearance(i,channel);
    html+=`<button class="${a.classes}" data-index="${i}" style="grid-row:${a.row+2};grid-column:${a.col+2};${a.bg?'background:'+a.bg+';':''}${a.fg?'color:'+a.fg+';':''}" tabindex="${i===(selected??0)?0:-1}" aria-label="${a.label}" aria-pressed="${inputMode==='dpad'&&selected===i}">${a.content}</button>`;
  }
  if(terrainSelection){
    const {axis,line}=terrainSelection;
    const place=axis==='row'?`grid-row:${line+2};grid-column:2 / ${N+2}`:`grid-row:2 / ${N+2};grid-column:${line+2}`;
    html+=`<div class="line-outline" style="${place}" aria-hidden="true"></div>`;
  }
  html+=`<div class="corner" style="grid-row:${N+2};grid-column:1" aria-hidden="true"></div>`;
  $('board').innerHTML=html;
  cellNodes=Array.from($('board').querySelectorAll('[data-index]'));
  clueNodes=Array.from({length:2*N},()=>[]);
  $('board').querySelectorAll('[data-clue]').forEach(el=>clueNodes[Number(el.dataset.clue)].push(el));
  renderedSelection=selected;
  updateCoordinates();
  if(focused!==undefined)$('board').querySelector(`[data-index="${focused}"]`)?.focus({preventScroll:true});
  updateProgress();
  $('diagonals').hidden=channel!==null;
  if(channel===null)$('diagonals').innerHTML=[false,true].map(reverse=>{
    const ids=Array.from({length:N},(_,p)=>p*N+(reverse?N-1-p:p));
    const goal=C.sum(ids.flatMap(i=>C.solution[i]));
    const current=C.sum(ids.flatMap(i=>boardState[i].map(v=>v??0)));
    return `<span>${reverse?'↙':'↘'} 대각선 <b>${current} / ${goal}</b></span>`;
  }).join('');

  document.querySelectorAll('[data-value]').forEach(b=>{b.disabled=channel===null;const active=channel!==null&&paintValue===Number(b.dataset.value);b.classList.toggle('current',active);b.setAttribute('aria-pressed',active);});
  $('erase').disabled=channel===null;
  $('erase').classList.toggle('current',channel!==null&&paintValue===null);
  $('erase').setAttribute('aria-pressed',channel!==null&&paintValue===null);
  $('undo').disabled=history.length===0;
  if(typeof window.renderTerrain==='function')window.renderTerrain();
  if(window.syncLargeUI)window.syncLargeUI();
}
function setTab(value){if(!TAB_ORDER.includes(value))return;finishStroke();tab=value;cancelHint();render();save();}
function edit(value){
  if(value!==null&&(!Number.isInteger(value)||value<0||value>MAX_STACK))return;
  if(tab==='all'||value==='select'||selected===null||fixed[selected][tab])return;
  const before=boardState[selected][tab];if(before===value){render();return;}
  history.push({channel:tab,changes:[{index:selected,before,after:value}]});
  boardState[selected][tab]=value;errors.clear();cancelHint();save();render();checkWin();
}
function checkWin(){
  if(!isSolved())return;
  cancelHint();terrainSelection=null;render();save();say(`완성! ${N*N*CHANNEL_COUNT}개의 높이가 모두 맞아요.`);
  if(completed)return;completed=true;
  drawCompletedPicture();
  $('win-dialog').showModal();
}
function undo(){finishStroke();const action=history.pop();if(!action)return;for(const change of action.changes)boardState[change.index][action.channel]=change.before;selected=action.changes[0].index;tab=action.channel;completed=false;errors.clear();cancelHint();save();render();say(`${action.changes.length}칸의 입력을 되돌렸어요.`);}
function findMistakes(){const result=[];boardState.forEach((cell,i)=>cell.forEach((v,c)=>{if(v!==null&&v!==C.solution[i][c])result.push({index:i,channel:c});}));return result;}
function hint(){
  if(pendingHint){const h=pendingHint;selected=h.index;tab=h.channel;edit(h.value);if(!isSolved())say(`${names[h.channel]} ${Math.floor(h.index/N)+1}행 ${h.index%N+1}열을 ${h.value}스택으로 적용했어요.`);return;}
  if(isSolved()){say('이미 모든 높이를 찾았어요!');return;}
  if(findMistakes().length){say('현재 입력 중 정답과 다른 높이가 있어요. ‘검사’로 위치를 확인한 뒤 힌트를 받아 보세요.',true);return;}
  if(C.deduce){
    const result=C.deduce(boardState,true),step=result.steps.find(s=>C.singleton(s.after)&&boardState[s.index][s.channel]===null);
    if(!step){say('현재 입력에서 새로운 확정 칸을 찾지 못했어요.',true);return;}
    const value=C.values(step.after)[0];pendingHint={...step,value};selected=step.index;tab=step.channel;
    const range=step.otherMinimum===step.otherMaximum?String(step.otherMinimum):`${step.otherMinimum}~${step.otherMaximum}`;
    const reason=C.hintReason?C.hintReason(step):step.kind==='diagonal-sum'?`${step.edge==='right'?'우측':'하단'} ${step.line+1}번 ↘ 대각선의 ${names[step.channel]} 합계 ${step.total}와 남은 후보를 적용하면`:step.kind==='height-runs-sum'?`${step.line+1}${step.axis==='row'?'행':'열'}의 ${names[step.channel]} 합계 ${step.total}, 같은 높이 구간과 최대 높이 ${step.maximum}를 적용하면`:step.kind==='height-runs'?`${step.line+1}${step.axis==='row'?'행':'열'}의 구간 [${step.groups.map(n=>n===0?'·':n).join(' ')}], 최대 높이 ${step.maximum}와 교차하는 줄의 조건을 적용하면`:step.kind==='height'?`이 칸의 RGB 총높이는 ${step.total}, 다른 두 색의 가능한 합은 ${range}이므로`:step.kind==='shape'?`${step.line+1}${step.axis==='row'?'행':'열'}의 연속 칸 수 [${step.groups.join(', ')||0}]와 교차하는 줄의 조건을 적용하면`:`${step.line+1}${step.axis==='row'?'행':'열'}의 합 ${step.total}에서 다른 칸의 가능한 합 ${range}을 고려하면`;
    say(`${reason}, ${Math.floor(step.index/N)+1}행 ${step.index%N+1}열 ${names[step.channel]}은 ${value}스택이에요. 다시 누르면 적용해요.`);
    $('hint').classList.add('pending');$('hint').innerHTML='<span aria-hidden="true">✦</span>적용';render();save();if(window.revealBoardCell)window.revealBoardCell(selected);return;
  }
  const channels=tab==='all'?CHANNELS:[tab,...CHANNELS.filter(c=>c!==tab)];
  for(const channel of channels){
    const initial=boardState.map(cell=>cell[channel]===null?C.domainMask:1<<cell[channel]);
    let result;try{result=C.propagate(channel,initial,true);}catch{say('입력과 힌트가 서로 맞지 않아요. 검사를 눌러 확인해 주세요.',true);return;}
    const step=result.steps.find(s=>C.singleton(s.after)&&boardState[s.index][channel]===null);
    if(!step)continue;
    const value=C.values(step.after)[0];pendingHint={...step,value};selected=step.index;tab=channel;
    const where=`${step.line+1}${step.axis==='row'?'행':'열'}`;
    const range=step.otherMinimum===step.otherMaximum?String(step.otherMinimum):`${step.otherMinimum}~${step.otherMaximum}`;
    const reason=step.kind==='shape'?`${where}의 연속 칸 수 [${step.groups.join(', ')||0}]와 교차하는 줄의 조건을 적용하면`:`다른 줄의 조건까지 적용했을 때 ${where}의 나머지 칸 합은 ${range}이에요. 이 줄의 총합 ${step.total}을 맞추면`;
    say(`${names[channel]} · ${reason}, ${Math.floor(step.index/N)+1}행 ${step.index%N+1}열은 ${value}스택으로 확정돼요. ‘적용’을 누르면 입력해요.`);
    $('hint').classList.add('pending');$('hint').innerHTML='<span aria-hidden="true">✦</span>적용';render();save();return;
  }
  say('현재 입력에서 새로운 확정 칸을 찾지 못했어요.',true);
}
function choosePaint(value){if(value!==null&&value!=='select'&&(!Number.isInteger(value)||value<0||value>MAX_STACK))return;finishStroke();paintValue=value;if(value==='select')selected=null;cancelHint();render();}
function refreshDrag(){
  dragFrame=0;
  if(!stroke)return;
  const channel=stroke.channel,lines=new Set();
  if(renderedSelection!==selected){
    dirtyCells.add(renderedSelection??0);
    if(selected!==null)dirtyCells.add(selected);
  }
  for(const i of dirtyCells){
    const el=cellNodes[i],a=cellAppearance(i,channel);
    el.className=a.classes;el.style.background=a.bg;el.style.color=a.fg;
    if(el.innerHTML!==a.content)el.innerHTML=a.content;
    el.tabIndex=i===(selected??0)?0:-1;
    el.setAttribute('aria-label',a.label);el.setAttribute('aria-pressed',inputMode==='dpad'&&i===selected);
    lines.add(Math.floor(i/N));lines.add(N+i%N);
  }
  for(const index of lines){
    const clue=C.clues[channel][index],feedback=ClueFeedback.evaluate(clue.cells.map(i=>boardState[i][channel]),clue.groups,clue.maximum??clue.total);
    for(const el of clueNodes[index]){
      if(el.classList.contains('total')){el.classList.toggle('clue-done',feedback.maximum==='done');el.classList.toggle('clue-conflict',feedback.maximum==='conflict');}
      else for(const token of el.querySelectorAll('[data-clue-token]')){const state=feedback.tokens[Number(token.dataset.clueToken)];token.classList.toggle('clue-done',state==='done');token.classList.toggle('clue-conflict',state==='conflict');}
    }
  }
  clueNodes.forEach((nodes,index)=>nodes.forEach(el=>el.classList.toggle('active-line',activeClue(index<N?'row':'col',index%N))));
  updateCoordinates();
  if(typeof window.updateTerrainCells==='function')window.updateTerrainCells(dirtyCells);
  dirtyCells.clear();renderedSelection=selected;
updateProgress();
}
function scheduleDragRefresh(){
  if(!dragFrame&&(dirtyCells.size||renderedSelection!==selected))dragFrame=requestAnimationFrame(refreshDrag);
}
function paintAt(x,y){
  if(!stroke)return;
  const g=stroke.geometry,px=x+window.scrollX-g.left,py=y+window.scrollY-g.top;
  if(x<g.clipLeft||x>=g.clipRight||y<g.clipTop||y>=g.clipBottom)return;
  if(px<0||py<0||px>=g.width||py>=g.height)return;
  const index=Math.floor(py/g.cellHeight)*N+Math.floor(px/g.cellWidth);selected=index;
  if(stroke.visited.has(index))return;
  stroke.visited.add(index);
  if(stroke.value==='select'||fixed[index][stroke.channel])return;
  const before=boardState[index][stroke.channel];
  if(before===stroke.value)return;
  stroke.changes.push({index,before,after:stroke.value});
  boardState[index][stroke.channel]=stroke.value;
  dirtyCells.add(index);
}
function paintSegment(x,y){
  if(!stroke)return;
  const [px,py]=stroke.last,steps=Math.max(1,Math.ceil(Math.hypot(x-px,y-py)/stroke.spacing));
  for(let p=1;p<=steps;p++)paintAt(px+(x-px)*p/steps,py+(y-py)*p/steps);
  stroke.last=[x,y];
}
function finishStroke(){
  if(!stroke)return;
  const finished=stroke;stroke=null;
  $('board').classList.remove('is-painting');
  if($('board').hasPointerCapture(finished.pointerId))$('board').releasePointerCapture(finished.pointerId);
  if(finished.changes.length){history.push({channel:finished.channel,changes:finished.changes});save();}
  render();if(finished.changes.length)checkWin();
}
$('board').addEventListener('pointerdown',e=>{
  const cell=e.target.closest('[data-index]');
  if(!cell||!e.isPrimary||e.button!==0||stroke)return;
  if($('board-viewport')?.classList.contains('pan-mode'))return;
  setInputMode('touch');
  const hadLine=terrainSelection!==null;terrainSelection=null;
  selected=Number(cell.dataset.index);cancelHint();if(hadLine)render();
  if(tab==='all'){render();return;}
  e.preventDefault();errors.clear();
  const first=cellNodes[0].getBoundingClientRect(),last=cellNodes[N*N-1].getBoundingClientRect();
  const geometry={left:first.left+window.scrollX,top:first.top+window.scrollY,width:last.right-first.left,height:last.bottom-first.top};
  const editor=($('board-viewport')||$('editor-panel')).getBoundingClientRect();
  const dockTop=document.querySelector('.input-dock')?.getBoundingClientRect().top??innerHeight;
  Object.assign(geometry,{clipLeft:Math.max(editor.left,first.left),clipRight:Math.min(editor.right,last.right),clipTop:Math.max(editor.top,first.top),clipBottom:Math.min(dockTop,editor.bottom,last.bottom)});
  geometry.cellWidth=geometry.width/N;geometry.cellHeight=geometry.height/N;
  $('board').querySelectorAll('.error,.hint-cell').forEach(el=>dirtyCells.add(Number(el.dataset.index)));
  stroke={pointerId:e.pointerId,channel:tab,value:paintValue,last:[e.clientX,e.clientY],spacing:Math.min(geometry.cellWidth,geometry.cellHeight)/3,geometry,visited:new Set(),changes:[]};
  $('board').setPointerCapture(e.pointerId);
  $('board').classList.add('is-painting');
  paintAt(e.clientX,e.clientY);scheduleDragRefresh();
});
$('board').addEventListener('pointermove',e=>{
  if(!stroke||e.pointerId!==stroke.pointerId)return;
  e.preventDefault();
  const samples=e.getCoalescedEvents?.()||[];
  for(const sample of samples)paintSegment(sample.clientX,sample.clientY);
  if(stroke.last[0]!==e.clientX||stroke.last[1]!==e.clientY)paintSegment(e.clientX,e.clientY);
  scheduleDragRefresh();
});
$('board').addEventListener('pointerup',e=>{if(stroke&&e.pointerId===stroke.pointerId){paintSegment(e.clientX,e.clientY);finishStroke();}});
$('board').addEventListener('pointercancel',e=>{if(stroke&&e.pointerId===stroke.pointerId)finishStroke();});
$('board').addEventListener('lostpointercapture',e=>{if(stroke&&e.pointerId===stroke.pointerId)finishStroke();});
window.addEventListener('blur',finishStroke);
window.addEventListener('resize',finishStroke);
$('editor-panel').addEventListener('scroll',finishStroke,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishStroke();});
window.addEventListener('pagehide',finishStroke);
$('board').addEventListener('contextmenu',e=>{if(tab!=='all')e.preventDefault();});
$('board').addEventListener('click',e=>{
  if(e.detail!==0)return; // Pointer input is handled above; keep keyboard/screen-reader activation.
  const cell=e.target.closest('[data-index]');if(!cell)return;
  setInputMode('touch');
  terrainSelection=null;selected=Number(cell.dataset.index);cancelHint();
  if(tab==='all'||paintValue==='select')render();else edit(paintValue);
});
$('undo').onclick=undo;$('erase').onclick=()=>choosePaint(null);if($('hint'))$('hint').onclick=hint;
if($('check'))$('check').onclick=()=>{
  const mistakes=findMistakes();errors=new Set(mistakes.map(e=>`${e.index}:${e.channel}`));cancelHint();
  if(mistakes.length){const first=mistakes[0];tab=first.channel;selected=first.index;say(`정답과 다른 입력이 ${mistakes.length}개 있어요. 색상 탭의 붉은 테두리 칸을 확인해 주세요.`,true);}
  else say(isSolved()?'모든 높이가 정확해요. 완성!':'입력한 높이는 모두 맞아요. 미정인 칸을 계속 풀어 보세요.');
  render();checkWin();
};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{$(b.dataset.close).close();if(b.dataset.close==='win-dialog'&&!MONO)setTab('all');});
document.querySelectorAll('dialog').forEach(d=>{
  let backdropPointer=null;
  const outside=e=>{if(e.target!==d)return false;const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  // Completion can open during an existing press. Only a new backdrop press may dismiss it.
  d.addEventListener('pointerdown',e=>{backdropPointer=outside(e)?e.pointerId:null;});
  for(const event of ['pointercancel','close'])d.addEventListener(event,()=>{backdropPointer=null;});
  d.addEventListener('click',e=>{
    const beganOutside=backdropPointer!==null&&(e.pointerId===undefined||e.pointerId===backdropPointer);
    backdropPointer=null;
    if(beganOutside&&outside(e))d.close();
  });
});
$('confirm-reset').onclick=()=>{finishStroke();boardState=fresh();history=[];errors.clear();selected=null;tab=0;paintValue=0;completed=false;cancelHint();save();render();$('reset-dialog').close();say('빈 보드에서 시작해요. 같은 값의 구간 합과 최대 높이를 살펴보세요.');};
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||e.target.closest('.tabs,#terrain-panel')||e.target.matches('input,select'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    setInputMode('dpad');
    e.preventDefault();terrainSelection=null;const current=selected??0,row=Math.floor(current/N),col=current%N;
    selected=e.key==='ArrowUp'?Math.max(0,row-1)*N+col:e.key==='ArrowDown'?Math.min(N-1,row+1)*N+col:e.key==='ArrowLeft'?row*N+Math.max(0,col-1):row*N+Math.min(N-1,col+1);
    cancelHint();render();$('board').querySelector(`[data-index="${selected}"]`).focus({preventScroll:true});if(window.revealBoardCell)window.revealBoardCell(selected);
  }else if(/^[0-9]$/.test(e.key)&&Number(e.key)<=MAX_STACK){e.preventDefault();choosePaint(Number(e.key));if(inputMode==='dpad')edit(paintValue);}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();choosePaint(null);if(inputMode==='dpad')edit(null);}
});
render();save();
if(!storageOK)say('현재 브라우저에서는 자동 저장이 제한돼요. 이 창을 열어둔 채 플레이해 주세요.',true);
