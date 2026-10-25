/* Static hosts use this 404 fallback for old bookmarked game URLs. */
(async()=>{
  const name=decodeURIComponent(location.pathname.split('/').pop());
  try{
    const response=await fetch('pack-data/game-catalog.json');if(!response.ok)throw Error('Catalog unavailable');
    const catalog=await response.json(),puzzle=catalog.puzzles.find(entry=>entry.legacyPath===name);
    const target=puzzle?'game.html?puzzle='+encodeURIComponent(puzzle.id):catalog.legacyRedirects[name];
    if(target){location.replace(target);return;}
  }catch{}
  document.getElementById('legacy-message').textContent='페이지를 찾을 수 없어요. 문제 목록에서 선택해 주세요.';
})();
