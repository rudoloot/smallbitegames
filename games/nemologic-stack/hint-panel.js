/* A hint is charged only after choosing a line and an enlarged clue number. */
(() => {
 'use strict';
 const entry=document.getElementById('hint-entry');if(!entry)return;
 const dialog=document.createElement('dialog');dialog.id='hint-dialog';dialog.className='hint-dialog';dialog.setAttribute('aria-labelledby','hint-title');
 dialog.innerHTML='<div class="settings-top"><h2 id="hint-title">힌트</h2><button class="nav-icon" id="hint-close" aria-label="힌트 닫기">×</button></div><div class="hint-balance"><span>남은 힌트</span><output id="hint-count" aria-live="polite">—</output></div><p class="hint-description">사용 → 줄 선택 → 확대된 숫자를 선택하면 해당 구간의 미정 칸을 채워요.</p><div class="hint-actions"><button class="primary-button" id="hint-use">사용</button><button id="hint-acquire">획득하기</button></div><p class="hint-reward-note">광고 보고 힌트 1개 받기</p><p id="hint-feedback" role="status" aria-live="polite"></p>';
 document.body.append(dialog);
 const count=document.getElementById('hint-count'),use=document.getElementById('hint-use'),feedback=document.getElementById('hint-feedback');
 const board=document.getElementById('board'),gamepad=document.querySelector('.gamepad'),size=Number(window.StackPuzzle.size);
 const selection=document.createElement('div');selection.id='hint-selection';selection.hidden=true;
 selection.innerHTML='<p role="status">숫자가 있는 행이나 열을 선택하세요.</p><button id="hint-cancel">취소</button>';
 document.querySelector('.input-panel').append(selection);
 const popup=document.createElement('dialog');popup.id='hint-line-dialog';popup.className='hint-dialog';popup.setAttribute('aria-labelledby','hint-line-title');
 popup.innerHTML='<div class="settings-top"><h2 id="hint-line-title"></h2><button class="nav-icon" id="hint-line-close" aria-label="힌트 선택 취소">×</button></div><p>숫자를 선택하면 힌트 1개를 사용해요.</p><div id="hint-line-numbers" class="hint-line-numbers"></div><button id="hint-line-back">줄 다시 선택</button>';
 document.body.append(popup);let activeLine=null;
 function refresh(){
  try{const balance=window.getStackHintBalance();count.textContent=balance;use.disabled=balance===0||!window.getStackHintPlan();}
  catch{count.textContent='—';use.disabled=true;feedback.textContent='힌트를 저장할 수 없어요. 저장 공간을 확인해 주세요.';}
 }
 function cancel(){
  window.stackHintSelecting=false;selection.hidden=true;gamepad.hidden=false;board.classList.remove('hint-selecting');
  if(popup.open)popup.close();
  for(const line of board.querySelectorAll('[data-hint-line]'))delete line.dataset.hintLine;
  activeLine=null;
 }
 window.cancelStackHintSelection=cancel;
 document.getElementById('hint-cancel').onclick=document.getElementById('hint-line-close').onclick=()=>{cancel();entry.focus();};
 document.getElementById('hint-line-back').onclick=()=>popup.close();
 popup.addEventListener('close',()=>{if(window.stackHintSelecting)activeLine?.focus({preventScroll:true});});
 function begin(){
  const choices=window.getStackHintChoices();if(!choices.length||window.getStackHintBalance()===0)return false;
  window.stackHintSelecting=true;selection.hidden=false;gamepad.hidden=true;board.classList.add('hint-selecting');
  const lines=new Set(choices.map(h=>h.line+(h.axis==='col'?size:0)));
  for(const line of board.querySelectorAll('.clue.left[data-clue],.clue.top[data-clue]'))if(lines.has(Number(line.dataset.clue)))line.dataset.hintLine=line.dataset.clue;
  board.querySelector('[data-hint-line]')?.focus({preventScroll:true});return true;
 }
 function selectLine(event){
  if(!window.stackHintSelecting||popup.open)return;
  event.preventDefault();event.stopImmediatePropagation();
  const line=event.target.closest('[data-hint-line]');if(!line)return;
  activeLine=line;const id=Number(line.dataset.hintLine),axis=id<size?'row':'col',number=id%size;
  const choices=window.getStackHintChoices().filter(h=>h.axis===axis&&h.line===number);
  const groups=window.PicrossCore.clues[0][id].groups,container=document.getElementById('hint-line-numbers');
  document.getElementById('hint-line-title').textContent=`${number+1}${axis==='row'?'행':'열'} 숫자 선택`;
  container.replaceChildren();container.classList.toggle('vertical',axis==='col');
  groups.forEach((sum,token)=>{
   const button=document.createElement('button');button.type='button';button.textContent=sum;button.dataset.hintToken=token;
   button.disabled=!choices.some(h=>h.token===token);button.setAttribute('aria-label',`선택할 힌트: ${number+1}${axis==='row'?'행':'열'}, ${token+1}번째 숫자 ${sum}`);
   button.onclick=()=>{
    cancel();
    try{if(window.useStackHint({axis,line:number,token}))return;feedback.textContent='사용할 수 있는 힌트가 없어요.';}
    catch{feedback.textContent='힌트를 저장할 수 없어요. 저장 공간을 확인해 주세요.';}
    refresh();dialog.showModal();
   };
   container.append(button);
  });
  popup.showModal();container.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 }
 board.addEventListener('click',selectLine,true);
 board.addEventListener('pointerdown',event=>{if(window.stackHintSelecting){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('keydown',event=>{
  if(!window.stackHintSelecting||popup.open)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();entry.focus();}
  else if(['Enter',' '].includes(event.key)&&event.target.matches('[data-hint-line]'))selectLine(event);
  else if(event.key!=='Tab'){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 for(const id of ['help','settings','home'])document.getElementById(id)?.addEventListener('click',cancel,true);
 entry.disabled=false;entry.onclick=()=>{cancel();window.stopStackControls?.();window.finishStroke?.();feedback.textContent='';refresh();if(!dialog.open)dialog.showModal();};
 document.getElementById('hint-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 use.onclick=()=>{
  dialog.close();
  try{if(!begin()){refresh();feedback.textContent='사용할 수 있는 힌트가 없어요.';dialog.showModal();}}
  catch{refresh();feedback.textContent='힌트를 저장할 수 없어요. 저장 공간을 확인해 주세요.';dialog.showModal();}
 };
 document.getElementById('hint-acquire').onclick=async event=>{
  const button=event.currentTarget;button.disabled=true;feedback.textContent='';
  try{const result=await window.StackRuntime?.ads.acquireHint();refresh();feedback.textContent=result?.earned?'힌트 1개를 받았어요.':'지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.';}
  catch{feedback.textContent='지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.';}
  finally{button.disabled=false;}
 };
 window.addEventListener('storage',()=>{if(dialog.open)refresh();});
 window.addEventListener('stack-hints-change',()=>{if(dialog.open)refresh();});
})();
