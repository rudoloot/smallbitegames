/* A single game document loads one catalog entry and its unchanged puzzle data. */
(async()=>{
  const english=(()=>{try{return localStorage.getItem('nonogram-stack-language')==='en';}catch{return false;}})();
  const $=id=>document.getElementById(id);
  if(english)$('game-loading').textContent='Loading puzzle…';
  async function readJSON(file){
    const response=await fetch(file,{cache:'no-store'});
    if(!response.ok)throw Error(`Could not load ${file}: ${response.status}`);
    return response.json();
  }
  function loadScript(file){return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=file+'?v=cb05b2c165e8';script.onload=resolve;
    script.onerror=()=>reject(Error(`Could not load ${file}`));document.body.append(script);
  });}
  try{
    const catalog=await readJSON('pack-data/game-catalog.json');
    const id=new URLSearchParams(location.search).get('puzzle');
    const puzzle=catalog.puzzles.find(entry=>entry.id===id);
    if(!puzzle)throw Error('Unknown puzzle');
    if(!/^pack-data\/(?:mono-)?game-\d+\.json$/.test(puzzle.data))throw Error('Invalid puzzle data path');
    const [spec,layoutProfile]=await Promise.all([readJSON(puzzle.data),readJSON(`pack-data/layout-profile-${puzzle.size}.json`)]),channels=puzzle.mode==='monochrome'?1:3;
    if(!Number.isInteger(puzzle.size)||puzzle.size<1||spec.width!==puzzle.size||spec.height!==puzzle.size||
      spec.storageKey!==puzzle.storageKey||spec.maxStack!==3||(spec.channels||3)!==channels||
      !Array.isArray(spec.cells)||spec.cells.length!==puzzle.size*puzzle.size||
      !spec.cells.every(cell=>Array.isArray(cell)&&cell.length===channels&&cell.every(value=>Number.isInteger(value)&&value>=0&&value<=3)))throw Error('Invalid puzzle data');
    if(layoutProfile.size!==puzzle.size||!['rows','columns'].every(axis=>Array.isArray(layoutProfile[axis])&&layoutProfile[axis].length&&layoutProfile[axis].every(groups=>Array.isArray(groups)&&groups.length<=puzzle.size&&groups.every(value=>Number.isInteger(value)&&value>=0&&value<=puzzle.size*9))))throw Error('Invalid layout profile');
    const mono=channels===1,n=puzzle.size;
    globalThis.StackPuzzle=puzzle;globalThis.StackLayoutProfile=layoutProfile;globalThis.GIVEN_DATA=[];
    if(mono)globalThis.MONO_SPEC=spec;else globalThis.PUZZLE_SPEC=spec;
    globalThis.PicrossCore=(mono?MonochromeCore:StackSumCore).createCore(spec);
    document.body.classList.toggle('monochrome-game',mono);
    document.title=mono?`흑백 문제 ${puzzle.number} · 노노그램스택`:`문제 ${String(puzzle.number).padStart(2,'0')} · 노노그램스택 · ${n}×${n} 스택 피크로스`;
    $('board').setAttribute('aria-label',`${n}행 ${n}열 피크로스`);
    $('board-viewport').setAttribute('aria-label',`화면에 맞춘 ${n}×${n} 입력판`);
    $('editor-panel').setAttribute('aria-label',mono?'명암 스택 입력':'색상별 스택 입력');
    if(mono){
      document.querySelector('.tabs').outerHTML='<nav class="tabs" aria-label="명암 입력" hidden><button id="tab-0" data-tab="0" aria-selected="true">명암</button></nav>';
      $('game-panel').setAttribute('aria-label','명암 퍼즐');
      $('terrain-panel').remove();
    }else $('overview-svg').setAttribute('aria-label',`${n}행 ${n}열 RGB 전체뷰`);
    $('win-art').setAttribute('aria-label',mono?'완성된 흑백 그림':`완성된 문제 ${String(puzzle.number).padStart(2,'0')} 그림`);
    const answer=spec.answer||spec.source?.subject;
    if(answer){$('win-description').textContent=answer;$('win-description').classList.add('win-answer');}
    else $('win-description').textContent=`${n*n*channels}개의 높이를 모두 찾았어요.`;
    $('next-puzzle').href=puzzle.next;$('next-puzzle').textContent=puzzle.nextLabel;
    for(const file of ['i18n.js','shared-ui.js','clue-feedback.js','app.js','board-layout.js','overview-stack-sums.js','fruit-game-ui.js'])await loadScript(file);
    $('game-loading').hidden=true;delete document.body.dataset.loading;
    globalThis.stackGameReady=true;dispatchEvent(new Event('stack-game-ready'));
  }catch(error){
    globalThis.stackGameError=error.message;
    $('game-loading').hidden=true;
    const panel=$('game-load-error');panel.hidden=false;
    panel.querySelector('h1').textContent=english?'Unable to load puzzle':'문제를 불러올 수 없어요';
    panel.querySelector('p').textContent=english?'Please try again or return to the puzzle list.':'다시 시도하거나 문제 목록으로 돌아가 주세요.';
    $('retry-game').textContent=english?'Try again':'다시 시도';
    panel.querySelector('a').textContent=english?'Puzzle list':'문제 목록으로';
    $('retry-game').onclick=()=>location.reload();
  }
})();
