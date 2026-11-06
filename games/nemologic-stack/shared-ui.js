/* Shared navigation and two-pointer game controls. Inlined by the builders. */
(() => {
  const header=document.querySelector('main > header');
  if(!header)return;
  const isMenu=!!document.querySelector('#monochrome-games');
  const mode=()=>isMenu?(document.body.dataset.mode||'color'):(document.body.dataset.presentation||'color');
  const heartPalette=window.StackTutorialPalette=['#ffffff','#f7bed5','#e774a2','#aa3468'];
  const icon=path=>`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`;
  const questionContext=document.createElement('canvas').getContext('2d'),questionOffsets=new Map();
  window.centerStackQuestionMarks=(root=document)=>{
    for(const element of root.querySelectorAll('#help span,.card-question')){
      const style=getComputedStyle(element),font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if(!questionOffsets.has(font)){
        questionContext.font=font;
        const m=questionContext.measureText('?');
        questionOffsets.set(font,{
          x:(m.width-m.actualBoundingBoxRight+m.actualBoundingBoxLeft)/2,
          y:Number.isFinite(m.fontBoundingBoxAscent)?(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent-m.fontBoundingBoxAscent+m.fontBoundingBoxDescent)/2:0
        });
      }
      for(const [axis,offset] of Object.entries(questionOffsets.get(font))){
        const name='--question-offset-'+axis,value=offset+'px';
        if(element.style.getPropertyValue(name)!==value)element.style.setProperty(name,value);
      }
    }
  };
  const pixelGlyphs={
    N:['10001','11001','10101','10011','10001','10001','10001','00000'],
    o:['00000','00000','01110','10001','10001','10001','01110','00000'],
    n:['00000','00000','11110','10001','10001','10001','10001','00000'],
    g:['00000','00000','01111','10001','10001','01111','00001','01110'],
    r:['00000','00000','10110','11001','10000','10000','10000','00000'],
    a:['00000','00000','01110','00001','01111','10001','01111','00000'],
    m:['00000','00000','11010','10101','10101','10101','10101','00000'],
    S:['01111','10000','10000','01110','00001','00001','11110','00000'],
    t:['00100','00100','11111','00100','00100','00100','00011','00000'],
    c:['00000','00000','01111','10000','10000','10000','01111','00000'],
    k:['10000','10000','10010','10100','11000','10100','10010','00000']
  };
  let pen=0;
  const pixelLetters=['Nono','gram','Stack'].map((word,tone)=>{
    let path='';
    for(const letter of word){
      pixelGlyphs[letter].forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1')path+=`M${pen+x} ${y}h1v1h-1Z`;}));
      pen+=5.5;
    }
    return `<path class="wordmark-tone" data-tone="${tone}" d="${path}"/>`;
  }).join('');
  const logoWidth=pen-.5;
  const pixelLogo=`<svg class="wordmark-logo" viewBox="0 0 ${logoWidth} 8" width="136" height="16" preserveAspectRatio="xMinYMid meet" shape-rendering="crispEdges" aria-hidden="true"><defs><linearGradient id="wordmark-rainbow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${logoWidth}" y2="0"><stop offset="0" stop-color="#d64d55"/><stop offset=".16" stop-color="#df8739"/><stop offset=".33" stop-color="#91a83e"/><stop offset=".5" stop-color="#409665"/><stop offset=".66" stop-color="#398fba"/><stop offset=".83" stop-color="#6f68bb"/><stop offset="1" stop-color="#b559a5"/></linearGradient></defs>${pixelLetters}</svg>`;
  const gearPoints=Array.from({length:8},(_,tooth)=>[[7.2,-22.5],[7.2,-14],[9.5,-9],[9.5,9],[7.2,14]].map(([radius,offset])=>{
    const angle=(tooth*45+offset-90)*Math.PI/180;
    return `${(12+radius*Math.cos(angle)).toFixed(3)} ${(12+radius*Math.sin(angle)).toFixed(3)}`;
  })).flat();
  const gearIcon=icon(`<path d="M${gearPoints.join('L')}Z"/><circle cx="12" cy="12" r="3.2"/>`);
  const hintEntry=window.StackPuzzle?`<button class="nav-icon" id="hint-entry" aria-label="힌트" title="힌트" aria-haspopup="dialog" aria-controls="hint-dialog" disabled>${icon('<path d="M9 18h6M10 21h4M9 15c0-2-3-3-3-7a6 6 0 0 1 12 0c0 4-3 5-3 7Z"/>')}</button>`:'<span class="header-slot" aria-hidden="true"></span>';
  header.className='header shared-header';
  const backIcon=isMenu?icon('<path d="M9 5H4v14h5M12 12h9m-4-4 4 4-4 4"/>'):icon('<path d="m12 5-7 7 7 7M5 12h14"/>');
  header.innerHTML=`<button class="wordmark" id="home" aria-label="메인 화면">${pixelLogo}<span class="wordmark-text">NonogramStack</span></button><div class="header-actions">${hintEntry}<button class="nav-icon" id="help" aria-label="게임 도움말" aria-haspopup="dialog" aria-controls="help-dialog"><span aria-hidden="true">?</span></button><button class="nav-icon" id="settings" aria-label="설정" aria-haspopup="dialog" aria-controls="settings-dialog">${gearIcon}</button><button class="nav-icon" id="navigate-back" aria-label="${isMenu?'나가기':'뒤로가기'}">${backIcon}</button></div>`;
  window.centerStackQuestionMarks();
  const help=document.getElementById('help-dialog')||document.createElement('dialog');
  // This temporary rectangular example is explanatory UI, separate from approved puzzles.
  const example=[[1,1,0,1,1],[3,3,2,2,2]];
  const exampleRuns=values=>{const sums=[];for(let i=0;i<values.length;){let end=i+1;while(end<values.length&&values[end]===values[i])end++;if(values[i])sums.push(values[i]*(end-i));i=end;}return sums;};
  let drawing='';
  for(let row=0;row<2;row++)for(let col=0;col<5;col++){
    const value=example[row][col];
    drawing+=`<rect data-help-cell data-row="${row}" data-col="${col}" data-height="${value}" x="${64+col*36}" y="${62+row*36}" width="36" height="36" fill="${heartPalette[value]}" stroke="#d8b7c6"/><text x="${82+col*36}" y="${80+row*36}" fill="${value>=2?'#fff':'#60354a'}">${value||'×'}</text>`;
  }
  for(let row=0;row<2;row++)drawing+=`<text data-help-row-clue="${row}" x="56" y="${80+row*36}" text-anchor="end">${exampleRuns(example[row]).join(' ')}</text><text x="261" y="${80+row*36}">${Math.max(...example[row])}</text>`;
  for(let col=0;col<5;col++){
    const values=example.map(row=>row[col]),runs=exampleRuns(values);
    runs.forEach((value,i)=>drawing+=`<text x="${82+col*36}" y="${48-(runs.length-1-i)*16}">${value}</text>`);
    drawing+=`<text x="${82+col*36}" y="151">${Math.max(...values)}</text>`;
  }
  help.id='help-dialog';help.classList.add('game-help');help.setAttribute('aria-labelledby','help-title');
  // Stable IDs keep future illustrations attached to the right explanation.
  const rules=[
    {
      "id": "picture",
      "text": "노노그램 스택은 빈칸에 숫자를 넣어 숨은 그림을 완성하는 퍼즐이에요."
    },
    {
      "id": "values",
      "text": "각 칸에는 0, 1, 2, 3 중 하나가 들어가요. 흑백 모드에서는 숫자가 클수록 어둡고, 작을수록 밝아요. 컬러 모드에서는 각 숫자에 정해진 색을 사용해요."
    },
    {
      "id": "outside-clues",
      "text": "게임판 밖의 단서 숫자를 보고, 각 칸에 어떤 숫자가 들어갈지 찾아보세요."
    },
    {
      "id": "directions",
      "text": "왼쪽 단서는 가로줄을 왼쪽에서 오른쪽으로, 위쪽 단서는 세로줄을 위에서 아래로 읽어요."
    },
    {
      "id": "run-sums",
      "text": "같은 숫자가 끊기지 않고 이어진 칸들을 하나의 구간이라고 해요. 단서 하나는 그 구간의 숫자를 모두 더한 값이에요."
    },
    {
      "id": "five-example",
      "text": "예를 들어 단서가 5라면, 1이 다섯 칸 이어진 구간이에요. 1+1+1+1+1=5이기 때문이에요."
    },
    {
      "id": "run-count",
      "text": "한 줄에 단서가 두 개라면, 0이 아닌 숫자의 구간도 두 개예요. 각 구간의 숫자는 서로 같을 수도, 다를 수도 있어요. 단서가 나온 순서대로 구간을 찾아보세요."
    },
    {
      "id": "unknown-zero",
      "text": "빈칸은 미정이고, ×는 0이에요."
    },
    {
      "id": "maximum",
      "text": "오른쪽·아래 숫자는 그 줄의 가장 큰 값이에요."
    },
    {
      "id": "same-value-gap",
      "text": "같은 값의 두 구간 사이에는 ×가 필요해요."
    },
    {
      "id": "different-values",
      "text": "다른 값의 구간은 붙어도 돼요."
    },
    {
      "id": "zero-omitted",
      "text": "× 구간은 위·왼쪽 단서에서 생략해요."
    }
  ];
  help.innerHTML=`<div class="settings-top"><h2 id="help-title">게임 규칙</h2><button class="nav-icon" data-close="help-dialog" aria-label="도움말 닫기">×</button></div><ul id="help-rule">${rules.map(({id,text})=>`<li data-help-rule="${id}"><p>${text}</p><figure class="help-rule-image" data-help-image="${id}" hidden><!-- Add the illustration and descriptive alt text here, then remove hidden. --></figure></li>`).join('')}</ul><figure class="help-example"><svg viewBox="0 0 284 166" role="img" aria-label="2행 5열 규칙 예시"><g font-family="system-ui" font-size="13" font-weight="650" text-anchor="middle" dominant-baseline="central" fill="#60354a">${drawing}</g></svg><figcaption><p>첫 6은 3+3이에요.</p><p>다음 6은 2+2+2예요.</p></figcaption></figure><a class="tutorial-start" href="tutorial.html">튜토리얼 시작하기</a>`;
  if(!help.isConnected)document.body.append(help);
  help.querySelector('[data-close]').onclick=()=>help.close();
  help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close();}});
  const showHelp=()=>{window.stopStackControls?.();window.finishStroke?.();if(!help.open)help.showModal();};
  document.getElementById('help').onclick=showHelp;
  const seenKey='nonogram-stack-help-seen-v1';
  setTimeout(()=>{try{const storage=globalThis.StackStorage||localStorage;if(storage.getItem(seenKey)!=='1'){showHelp();storage.setItem(seenKey,'1');}}catch{/* A storage failure leaves manual help available. */}},0);
  const dialog=document.createElement('dialog');dialog.id='settings-dialog';
  dialog.innerHTML='<div class="settings-top"><h2>설정</h2><button class="nav-icon" aria-label="설정 닫기">×</button></div><div class="settings-actions"></div>';
  document.body.append(dialog);
  const languageRow=document.createElement('label');languageRow.className='settings-language';languageRow.htmlFor='language-select';
  languageRow.innerHTML='<span>언어</span><select id="language-select"><option value="ko" lang="ko">한국어</option><option value="en" lang="en">English</option></select>';
  dialog.querySelector('.settings-top').after(languageRow);
  const soundRow=document.createElement('label');soundRow.className='settings-language';soundRow.htmlFor='sound-toggle';
  soundRow.innerHTML='<span>효과음</span><input id="sound-toggle" type="checkbox">';languageRow.after(soundRow);
  const soundToggle=soundRow.querySelector('input');soundToggle.checked=window.StackInputSound?.enabled??true;
  soundToggle.onchange=()=>window.StackInputSound?.setEnabled(soundToggle.checked);
  const languageSelect=languageRow.querySelector('select');languageSelect.value=window.StackI18n?.language||'ko';
  languageSelect.onchange=()=>window.StackI18n?.setLanguage(languageSelect.value);
  dialog.querySelector('.nav-icon').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  for(const [id,label] of [['reset-dialog','처음부터 다시 풀기']]){
    if(!document.getElementById(id))continue;
    const button=document.createElement('button');button.textContent=label;button.onclick=()=>{dialog.close();document.getElementById(id).showModal();};dialog.querySelector('.settings-actions').append(button);
  }
  document.getElementById('settings').onclick=()=>dialog.showModal();
  if(window.StackRuntime?.isNative){
    const privacy=document.createElement('button');privacy.textContent='개인정보 선택';privacy.hidden=!StackRuntime.privacyOptionsRequired;
    privacy.onclick=()=>{dialog.close();StackRuntime.privacyChoices().catch(()=>{});};dialog.querySelector('.settings-actions').append(privacy);
    const policy=document.createElement('a');policy.textContent='개인정보처리방침';policy.hidden=true;policy.target='_blank';policy.rel='noopener noreferrer';dialog.querySelector('.settings-actions').append(policy);
    const support=document.createElement('a');support.textContent='문의하기';support.hidden=true;dialog.querySelector('.settings-actions').append(support);
    const refreshPrivacy=()=>{privacy.hidden=!StackRuntime.privacyOptionsRequired;policy.hidden=!/^https:\/\//.test(StackRuntime.privacyPolicyUrl||'');if(!policy.hidden)policy.href=StackRuntime.privacyPolicyUrl;support.hidden=!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(StackRuntime.supportEmail||'');if(!support.hidden)support.href='mailto:'+StackRuntime.supportEmail;};
    refreshPrivacy();window.addEventListener('stack-privacy-change',refreshPrivacy);
  }
  const grayscaleRow=document.createElement('label');grayscaleRow.className='settings-language';grayscaleRow.htmlFor='grayscale-toggle';
  grayscaleRow.innerHTML='<span>흑백 모드</span><input id="grayscale-toggle" type="checkbox">';languageRow.after(grayscaleRow);
  const grayscale=grayscaleRow.querySelector('input');
  window.updateStackModeLabel=()=>{document.getElementById('home').dataset.mode=mode();grayscale.checked=mode()==='monochrome';};
  grayscale.onchange=()=>{
    const next=grayscale.checked?'monochrome':'color';
    try{(globalThis.StackStorage||localStorage).setItem('nonogram-stack-mode',next);}catch{}
    if(isMenu)window.selectStackMode(next);else if(window.StackPuzzle)window.selectStackPalette?.(next);else{document.body.dataset.presentation=next;window.updateStackModeLabel();window.updateStackTutorialPalette?.(next);}
  };
  const goHome=()=>{if(isMenu){window.resetStackCollectionPage?.();return;}window.stopStackControls?.();window.finishStroke?.();if(window.StackRuntime)StackRuntime.navigate(StackRuntime.collectionUrl()).catch(()=>{});else location.href='collection.html#'+mode();};
  document.getElementById('home').onclick=goHome;
  document.getElementById('navigate-back').onclick=()=>{if(isMenu)window.StackRuntime?.exit().catch(()=>{});else goHome();};
  window.updateStackModeLabel();
})();

window.installStackDpad=({dpad,buttons,move,apply,choose=()=>{}})=>{
  const directions=[['up','위로 이동','M6 15l6-6 6 6'],['left','왼쪽으로 이동','M15 6l-6 6 6 6'],['right','오른쪽으로 이동','M9 6l6 6-6 6'],['down','아래로 이동','M6 9l6 6 6-6']];
  dpad.innerHTML=directions.map(([value,label,path])=>`<button type="button" data-direction="${value}" aria-label="${label}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${path}"/></svg></button>`).join('');
  const directionButtons=[...dpad.querySelectorAll('[data-direction]')];
  const pointerClicks=new WeakSet();
  function keyboardClick(e,button){
    // A pointer press was already applied on pointerdown, including zero-detail compatibility clicks.
    if(pointerClicks.delete(button))return false;
    return e.detail===0&&!e.pointerType&&!e.sourceCapabilities?.firesTouchEvents;
  }
  function prepareKeyboardClick(e){
    if(e.key==='Enter'||e.key===' ')pointerClicks.delete(e.target.closest('button'));
  }
  let directionPointer=null,actionPointer=null,held=null,timer=0,repeatDelay=0,direction='';
  function step(value=direction){if(!value||document.querySelector('dialog[open]'))return;const moved=move(value);if(held!==null&&moved!==false)apply(held);}
  function setDirection(value){
    if(value===direction)return;
    direction=value;
    directionButtons.forEach(button=>{const active=button.dataset.direction===value;button.classList.toggle('held',active);button.setAttribute('aria-pressed',active);});
  }
  function beginDirection(value){
    setDirection(value);step();
    repeatDelay=setTimeout(()=>{
      repeatDelay=0;
      if(directionPointer===null)return;
      step();timer=setInterval(()=>step(),100);
    },300);
  }
  function stopDirection(){clearTimeout(repeatDelay);repeatDelay=0;clearInterval(timer);timer=0;setDirection('');directionPointer=null;}
  function stopAction(){buttons.forEach(b=>b.classList.remove('held'));held=null;actionPointer=null;}
  dpad.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-direction]');if(!button||directionPointer!==null||e.button!==0||document.querySelector('dialog[open]'))return;e.preventDefault();pointerClicks.add(button);directionPointer=e.pointerId;dpad.setPointerCapture(e.pointerId);beginDirection(button.dataset.direction);});
  dpad.addEventListener('pointermove',e=>{if(e.pointerId!==directionPointer)return;e.preventDefault();const button=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-direction]');setDirection(button&&dpad.contains(button)?button.dataset.direction:'');});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])dpad.addEventListener(event,e=>{if(e.pointerId===directionPointer)stopDirection();});
  dpad.addEventListener('keydown',e=>{prepareKeyboardClick(e);const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(d){e.preventDefault();e.stopPropagation();step(d);}});
  dpad.addEventListener('click',e=>{const button=e.target.closest('[data-direction]');if(button&&keyboardClick(e,button))step(button.dataset.direction);});
  dpad.addEventListener('contextmenu',e=>e.preventDefault());
  for(const button of buttons){
    button.onclick=e=>{if(keyboardClick(e,button)&&!button.disabled){choose(button);apply(button);}};
    button.addEventListener('keydown',prepareKeyboardClick);
    button.addEventListener('pointerdown',e=>{if(actionPointer!==null||e.button!==0||button.disabled||document.querySelector('dialog[open]'))return;e.preventDefault();pointerClicks.add(button);actionPointer=e.pointerId;held=button;button.setPointerCapture(e.pointerId);button.classList.add('held');choose(button);apply(button);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{if(e.pointerId===actionPointer)stopAction();});
    button.addEventListener('contextmenu',e=>e.preventDefault());
  }
  const stop=()=>{stopDirection();stopAction();};
  addEventListener('blur',stop);addEventListener('pagehide',stop);addEventListener('resize',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new MutationObserver(()=>{if(document.querySelector('dialog[open]'))stop();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  return stop;
};
