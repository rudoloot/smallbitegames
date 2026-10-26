/* Shared navigation and two-pointer game controls. Inlined by the builders. */
(() => {
  const header=document.querySelector('main > header');
  if(!header)return;
  const isMenu=!!document.querySelector('#monochrome-games');
  const mode=()=>isMenu?(document.body.dataset.mode||'monochrome'):(document.body.dataset.presentation||'monochrome');
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
  const pixelLogo=`<svg class="wordmark-logo" viewBox="0 0 ${logoWidth} 8" width="136" height="16" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true"><defs><linearGradient id="wordmark-rainbow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${logoWidth}" y2="0"><stop offset="0" stop-color="#d64d55"/><stop offset=".16" stop-color="#df8739"/><stop offset=".33" stop-color="#91a83e"/><stop offset=".5" stop-color="#409665"/><stop offset=".66" stop-color="#398fba"/><stop offset=".83" stop-color="#6f68bb"/><stop offset="1" stop-color="#b559a5"/></linearGradient></defs>${pixelLetters}</svg>`;
  const canToggle=isMenu||!!window.StackPuzzle;
  const wordmarkTag=canToggle?'button':'div';
  const gearPoints=Array.from({length:8},(_,tooth)=>[[7.2,-22.5],[7.2,-14],[9.5,-9],[9.5,9],[7.2,14]].map(([radius,offset])=>{
    const angle=(tooth*45+offset-90)*Math.PI/180;
    return `${(12+radius*Math.cos(angle)).toFixed(3)} ${(12+radius*Math.sin(angle)).toFixed(3)}`;
  })).flat();
  const gearIcon=icon(`<path d="M${gearPoints.join('L')}Z"/><circle cx="12" cy="12" r="3.2"/>`);
  const paletteControl=window.StackPuzzle?`<button class="nav-icon palette-toggle" id="palette-toggle" aria-label="컬러로 전환" aria-controls="board height-picker" aria-pressed="false">${icon('<rect data-palette-swatch="0" x="3" y="3" width="8" height="8" rx="2"/><rect data-palette-swatch="1" x="13" y="3" width="8" height="8" rx="2"/><rect data-palette-swatch="2" x="3" y="13" width="8" height="8" rx="2"/><rect data-palette-swatch="3" x="13" y="13" width="8" height="8" rx="2"/>')}<span>컬러</span></button>`:'';
  header.className='header shared-header';
  header.innerHTML=`<${wordmarkTag} class="wordmark" id="mode-toggle">${pixelLogo}<span class="wordmark-text">NonogramStack</span></${wordmarkTag}><div class="header-actions">${paletteControl}<button class="nav-icon" id="help" aria-label="게임 도움말" aria-haspopup="dialog" aria-controls="help-dialog"><span aria-hidden="true">?</span></button><button class="nav-icon" id="settings" aria-label="설정" aria-haspopup="dialog" aria-controls="settings-dialog">${gearIcon}</button><button class="nav-icon" id="navigate-back" aria-label="뒤로가기">${icon('<path d="m12 5-7 7 7 7M5 12h14"/>')}</button></div>`;
  window.centerStackQuestionMarks();
  const help=document.getElementById('help-dialog')||document.createElement('dialog');
  const example=['01010','11111','22222','03330','00300'].map(row=>[...row].map(Number));
  const exampleRuns=values=>{const sums=[];for(let i=0;i<values.length;){let end=i+1;while(end<values.length&&values[end]===values[i])end++;if(values[i])sums.push(values[i]*(end-i));i=end;}return sums;};
  let exampleDrawing='';
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const value=example[row][col],shade=255-value*85;
    exampleDrawing+=`<rect data-help-cell data-height="${value}" x="${56+col*28}" y="${60+row*28}" width="28" height="28" fill="rgb(${shade},${shade},${shade})" stroke="#c2cbbd"/><text x="${70+col*28}" y="${74+row*28}" fill="${value>=2?'#fff':'#34493a'}">${value||'×'}</text>`;
  }
  for(let line=0;line<5;line++){
    const row=example[line],col=example.map(values=>values[line]);
    exampleDrawing+=`<text x="47" y="${74+line*28}" text-anchor="end">${exampleRuns(row).join(' ')}</text><text x="211" y="${74+line*28}">${Math.max(...row)}</text><text x="${70+line*28}" y="216">${Math.max(...col)}</text>`;
    const runs=exampleRuns(col);
    runs.forEach((value,i)=>exampleDrawing+=`<text x="${70+line*28}" y="${48-(runs.length-1-i)*14}">${value}</text>`);
  }
  const helpExample=`<figure class="help-example"><h3>5×5 완성 예시</h3><svg viewBox="0 0 232 232" role="img" aria-label="5×5 완성된 하트와 구간 합·최댓값 힌트"><g font-family="system-ui" font-size="11" font-weight="650" text-anchor="middle" dominant-baseline="central" fill="#34493a">${exampleDrawing}</g><rect class="help-example-highlight" x="55" y="115" width="142" height="30" fill="none" stroke="#b18527" stroke-width="2"/></svg><figcaption>튜토리얼에서 완성하는 하트예요. 칸 안에는 입력한 값을, 바깥에는 힌트 숫자를 표시했어요.</figcaption><p>강조한 셋째 줄은 2가 다섯 칸이므로 구간 합은 10, 최댓값은 2예요.</p></figure>`;
  help.id='help-dialog';help.classList.add('game-help');help.setAttribute('aria-labelledby','help-title');
  help.innerHTML=`<div class="settings-top"><h2 id="help-title">게임 도움말</h2><button class="nav-icon" data-close="help-dialog" aria-label="도움말 닫기">×</button></div>
    <section class="help-section"><h3>숨은 그림 찾기</h3>
      <p data-help-mode="monochrome">각 칸을 0~3의 명암으로 채워 그림을 완성해요. ×는 0(흰색), 1은 밝은 회색, 2는 어두운 회색, 3은 검정이에요.</p>
      <p data-help-mode="color">0~3의 값마다 정해진 색으로 그림을 완성해요. ×는 0이에요. 4색 컬러와 4단계 명암은 같은 문제이며, 전환해도 단서와 입력은 그대로예요.</p>
    </section>
    ${helpExample}
    <section class="help-section"><h3>힌트 숫자 읽기</h3><ul>
      <li><b>위·왼쪽:</b> 같은 값이 이어진 구간의 합이에요. 값이 2인 칸이 세 칸 이어지면 2 + 2 + 2 = 6으로 표시해요. 가로줄은 왼쪽부터, 세로줄은 위부터 읽어요.</li>
      <li><b>오른쪽·아래:</b> 해당 행·열에서 가장 큰 값이에요.</li>
      <li>0인 구간은 단서에서 생략해요. 같은 값의 두 구간 사이에는 0이 필요하고, 서로 다른 값의 구간은 붙을 수 있어요.</li>
      <li><b>미정과 ×:</b> 빈칸은 아직 정하지 않은 칸, ×는 0으로 확정한 칸이에요. 지우개는 미정으로 되돌려요.</li>
    </ul></section>
    <a class="tutorial-start" href="tutorial.html">튜토리얼 시작하기</a>`;
  if(!help.isConnected)document.body.append(help);
  help.querySelector('[data-close]').onclick=()=>help.close();
  help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close();}});
  const showHelp=()=>{
    help.querySelectorAll('[data-help-mode]').forEach(el=>el.hidden=el.dataset.helpMode!==mode());
    const palette=window.StackPalette?.colors(window.StackPuzzle||{},mode());
    if(palette)help.querySelectorAll('[data-help-cell]').forEach(cell=>{
      cell.setAttribute('fill',palette[Number(cell.dataset.height)]);
      cell.nextElementSibling?.setAttribute('fill',StackPalette.foreground(palette[Number(cell.dataset.height)]));
    });
    if(!help.open)help.showModal();
  };
  document.getElementById('help').onclick=showHelp;
  const dialog=document.createElement('dialog');dialog.id='settings-dialog';
  dialog.innerHTML='<div class="settings-top"><h2>설정</h2><button class="nav-icon" aria-label="설정 닫기">×</button></div><div class="settings-actions"></div>';
  document.body.append(dialog);
  const languageRow=document.createElement('label');languageRow.className='settings-language';languageRow.htmlFor='language-select';
  languageRow.innerHTML='<span>언어</span><select id="language-select"><option value="ko" lang="ko">한국어</option><option value="en" lang="en">English</option></select>';
  dialog.querySelector('.settings-top').after(languageRow);
  const languageSelect=languageRow.querySelector('select');languageSelect.value=window.StackI18n?.language||'ko';
  languageSelect.onchange=()=>window.StackI18n?.setLanguage(languageSelect.value);
  dialog.querySelector('.nav-icon').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  for(const [id,label] of [['reset-dialog','처음부터 다시 풀기']]){
    if(!document.getElementById(id))continue;
    const button=document.createElement('button');button.textContent=label;button.onclick=()=>{dialog.close();document.getElementById(id).showModal();};dialog.querySelector('.settings-actions').append(button);
  }
  document.getElementById('settings').onclick=()=>dialog.showModal();
  window.updateStackModeLabel=()=>{
    const current=mode();document.getElementById('mode-toggle').dataset.mode=current;
    if(canToggle)document.getElementById('mode-toggle').setAttribute('aria-label',`NonogramStack · ${current==='color'?'흑백':'컬러'} 게임으로 전환`);
    const toggle=document.getElementById('palette-toggle');
    if(toggle){
      const next=current==='color'?'monochrome':'color',label=next==='color'?'컬러로 전환':'명암으로 전환';
      toggle.setAttribute('aria-label',label);toggle.title=label;toggle.setAttribute('aria-pressed',String(current==='color'));
      const caption=toggle.querySelector('span');caption.setAttribute('translate','no');
      caption.textContent=window.StackI18n?.language==='en'?(next==='color'?'Color':'Gray'):(next==='color'?'컬러':'명암');
      const colors=StackPalette.colors(window.StackPuzzle,next);
      toggle.querySelectorAll('[data-palette-swatch]').forEach(swatch=>swatch.setAttribute('fill',colors[Number(swatch.dataset.paletteSwatch)]));
    }
  };
  const paletteToggle=document.getElementById('palette-toggle');
  if(paletteToggle)paletteToggle.onclick=()=>window.selectStackPalette?.(mode()==='color'?'monochrome':'color');
  addEventListener('stack-language-change',()=>window.updateStackModeLabel());
  if(canToggle)document.getElementById('mode-toggle').onclick=()=>{
    const next=mode()==='color'?'monochrome':'color';
    try{localStorage.setItem('nonogram-stack-mode',next);}catch{}
    if(isMenu)window.selectStackMode(next);else window.selectStackPalette?.(next);
  };
  document.getElementById('navigate-back').onclick=()=>{
    if(isMenu){if(history.length>1)history.back();}else location.href='collection.html#'+mode();
  };
  if(isMenu&&history.length<=1)document.getElementById('navigate-back').disabled=true;
  window.updateStackModeLabel();
})();

window.installStackDpad=({dpad,buttons,move,apply,choose=()=>{}})=>{
  const directions=[['up','위로 이동','M6 15l6-6 6 6'],['left','왼쪽으로 이동','M15 6l-6 6 6 6'],['right','오른쪽으로 이동','M9 6l6 6-6 6'],['down','아래로 이동','M6 9l6 6 6-6']];
  dpad.innerHTML=directions.map(([value,label,path])=>`<button type="button" data-direction="${value}" aria-label="${label}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${path}"/></svg></button>`).join('')+'<span class="dpad-center" aria-hidden="true"></span>';
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
      step();timer=setInterval(()=>step(),200);
    },500);
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
