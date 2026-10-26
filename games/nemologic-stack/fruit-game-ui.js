(() => {
  const viewport=$('board-viewport'),board=$('board');
  const frames=[$('game-panel'),$('terrain-panel')].filter(Boolean);
  function fitBoard(){
    const dpadArea=$('dpad-area');
    const padding=getComputedStyle(dpadArea);
    const dpadWidth=dpadArea.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight);
    const dpadHeight=dpadArea.clientHeight-parseFloat(padding.paddingTop)-parseFloat(padding.paddingBottom);
    $('dpad').style.setProperty('--dpad-size',Math.max(0,Math.min(dpadWidth,dpadHeight))+'px');
    const visibleFrames=frames.filter(frame=>!frame.hidden);
    const width=Math.min(...visibleFrames.map(el=>el.clientWidth))-2,height=Math.min(...visibleFrames.map(el=>el.clientHeight))-2;
    if(width<=0||height<=0)return;
    const layout=window.getStackBoardLayout(width,height);
    window.stackBoardLayout=layout;
    for(const [name,value] of Object.entries({'clue-gap':layout.gap,'clue-column-gap':layout.columnGap,'number-size':layout.font,'cell-size':layout.cell,gutter:layout.left,top:layout.top,end:layout.end,bottom:layout.end})){
      board.style.setProperty('--'+name,value+'px');
    }
    board.style.setProperty('--n',N);
    board.style.setProperty('--coordinate-size',layout.coordinateSize+'px');
    board.style.setProperty('--coordinate-padding',layout.coordinatePadding+'px');
    board.querySelectorAll('.clue.left,.clue.top').forEach(clue=>{
      const row=clue.classList.contains('left'),tokens=[...clue.querySelectorAll('[data-clue-token]')];
      const positions=window.getStackCluePositions(tokens.map(token=>token.textContent),row?'row':'col',layout);
      tokens.forEach((token,i)=>{
        token.style.left=row?positions[i]+'px':'50%';token.style.top=row?'50%':positions[i]+'px';
      });
    });
    viewport.style.width=layout.width+'px';
    viewport.style.height=layout.height+'px';
    window.renderTerrain?.();
  }
  window.syncLargeUI=()=>{
    board.querySelectorAll('[data-clue]').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;});
    fitBoard();
  };
  const selectClue=e=>{const el=e.target.closest('[data-clue]');if(!el)return;const id=Number(el.dataset.clue);window.selectTerrainLine(id<N?'row':'col',id%N);};
  board.addEventListener('click',selectClue);
  board.addEventListener('keydown',e=>{if(e.target.matches('[data-clue]')&&['Enter',' '].includes(e.key)){e.preventDefault();selectClue(e);}});
  window.revealBoardCell=()=>{};
  window.revealBoardLine=()=>{};
  let fitFrame=0;
  const observer=new ResizeObserver(()=>{if(!fitFrame)fitFrame=requestAnimationFrame(()=>{fitFrame=0;fitBoard();});});
  frames.forEach(frame=>observer.observe(frame));
  observer.observe($('dpad-area'));
  window.syncLargeUI();
  $('dpad').addEventListener('pointerdown',e=>{if(e.button===0&&!document.querySelector('dialog[open]'))setInputMode('dpad');},{capture:true});
  $('terrain-panel')?.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)setInputMode('touch');});
  window.stopStackControls=window.installStackDpad({
    dpad:$('dpad'),buttons:[...$('height-picker').querySelectorAll('button')],
    move:direction=>{
      setInputMode('dpad');
      finishStroke();terrainSelection=null;
      const i=selected??0,row=Math.floor(i/N),col=i%N;
      selected=direction==='up'?Math.max(0,row-1)*N+col:direction==='down'?Math.min(N-1,row+1)*N+col:direction==='left'?row*N+Math.max(0,col-1):row*N+Math.min(N-1,col+1);
      if(selected===i)return false;
      cancelHint();render();window.revealBoardCell(selected);
      return true;
    },
    choose:button=>{if(button.id!=='undo')choosePaint(button.id==='erase'?null:Number(button.dataset.value));},
    apply:button=>{
      if(button.id==='undo'){const cursor=selected;undo();selected=cursor;render();}
      else if(inputMode==='dpad'){selected??=0;edit(button.id==='erase'?null:Number(button.dataset.value));}
    }
  });
})();
