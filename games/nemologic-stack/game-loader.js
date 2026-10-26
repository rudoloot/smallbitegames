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
    const script=document.createElement('script');script.src=file+'?v=1a6027320bb5';script.onload=resolve;
    script.onerror=()=>reject(Error(`Could not load ${file}`));document.body.append(script);
  });}
  try{
    const catalog=await readJSON('pack-data/game-catalog.json');
    const id=new URLSearchParams(location.search).get('puzzle');
    const puzzle=catalog.puzzles.find(entry=>entry.id===id);
    if(!puzzle)throw Error('Unknown puzzle');
    if(!/^pack-data\/(?:mono-)?game-\d+\.json$/.test(puzzle.data))throw Error('Invalid puzzle data path');
    const [spec,layoutProfile]=await Promise.all([readJSON(puzzle.data),readJSON(`pack-data/layout-profile-${puzzle.size}.json`)]),channels=1;
    if(!Number.isInteger(puzzle.size)||puzzle.size<1||spec.width!==puzzle.size||spec.height!==puzzle.size||
      spec.storageKey!==puzzle.storageKey||spec.maxStack!==3||spec.channels!==channels||
      !Array.isArray(spec.cells)||spec.cells.length!==puzzle.size*puzzle.size||
      !spec.cells.every(cell=>Array.isArray(cell)&&cell.length===channels&&cell.every(value=>Number.isInteger(value)&&value>=0&&value<=3)))throw Error('Invalid puzzle data');
    if(layoutProfile.size!==puzzle.size||!['rows','columns'].every(axis=>Array.isArray(layoutProfile[axis])&&layoutProfile[axis].length&&layoutProfile[axis].every(groups=>Array.isArray(groups)&&groups.length<=puzzle.size&&groups.every(value=>Number.isInteger(value)&&value>=0&&value<=puzzle.size*9))))throw Error('Invalid layout profile');
    const n=puzzle.size,requestedMode=new URLSearchParams(location.search).get('mode');
    document.body.dataset.presentation=requestedMode==='color'||requestedMode==='monochrome'?requestedMode:StackPalette.readMode();
    StackPalette.writeMode(document.body.dataset.presentation);
    globalThis.StackPuzzle=puzzle;globalThis.StackLayoutProfile=layoutProfile;globalThis.GIVEN_DATA=[];
    globalThis.MONO_SPEC=spec;
    globalThis.PicrossCore=MonochromeCore.createCore(spec);
    document.body.classList.add('monochrome-game');
    document.title=`문제 ${puzzle.number} · 노노그램스택`;
    $('board').setAttribute('aria-label',`${n}행 ${n}열 피크로스`);
    $('board-viewport').setAttribute('aria-label',`화면에 맞춘 ${n}×${n} 입력판`);
    $('editor-panel').setAttribute('aria-label','스택 입력');
    $('win-art').setAttribute('aria-label','완성된 그림');
    const answer=spec.answer||spec.source?.subject;
    if(answer){$('win-description').textContent=answer;$('win-description').classList.add('win-answer');}
    else $('win-description').textContent=`${n*n*channels}개의 높이를 모두 찾았어요.`;
    $('next-puzzle').href=puzzle.next;$('next-puzzle').textContent=puzzle.nextLabel;
    for(const file of ['i18n.js','shared-ui.js','clue-feedback.js','app.js','board-layout.js','fruit-game-ui.js'])await loadScript(file);
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
