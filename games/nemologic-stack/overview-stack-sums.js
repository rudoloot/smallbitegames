/* Show accumulated heights while solving; reveal colors only after completion. */
(() => {
  const svg=$('overview-svg');
  function selectLine(axis,line){const same=terrainSelection?.axis===axis&&terrainSelection.line===line;selectBoardLine(axis,line===null||same?null:line);}
  window.selectTerrainLine=selectLine;window.clearTerrainSelection=()=>selectLine('row',null);
  if(!svg)return;
  let tiles=[],stackLabels=[],lastValues=[],lastLayoutKey='',lastSolved=null,layout;
  function updateStatus(lines){
    for(const l of lines){
      const clue=C.combinedClues[l],feedback=ClueFeedback.evaluate(clue.cells.map(i=>boardState[i].includes(null)?null:C.sum(boardState[i])),clue.groups,clue.maximum);
      svg.querySelectorAll(`[data-overview-clue="${l}"] [data-clue-token]`).forEach(el=>{const state=feedback.tokens[Number(el.dataset.clueToken)];el.classList.toggle('clue-done',state==='done');el.classList.toggle('clue-conflict',state==='conflict');});
      svg.querySelectorAll(`.overview-maximum[data-overview-clue="${l}"] .clue-text`).forEach(el=>{el.classList.toggle('clue-done',feedback.maximum==='done');el.classList.toggle('clue-conflict',feedback.maximum==='conflict');});
    }
  }
  function updateCells(indices){
    if(!tiles.length||$('terrain-panel').hidden)return;
    const solved=isSolved();
    if(solved!==lastSolved){
      indices=Array.from({length:N*N},(_,i)=>i);lastValues=[];lastSolved=solved;
    }
    svg.dataset.mode=solved?'art':'totals';
    const lines=new Set();
    for(const i of indices){
      const value=boardState[i],key=value.join(',');if(lastValues[i]===key)continue;
      const empty=value.every(v=>v===null),partial=value.some(v=>v===null),tile=tiles[i];
      tile.setAttribute('fill',solved?rgb(value):'#edf0e8');tile.setAttribute('fill-opacity','1');
      tile.setAttribute('stroke',solved?'none':'#cbd4c4');
      tile.dataset.state=empty?'unknown':partial?'partial':'filled';
      const total=value.reduce((sum,v)=>sum+(v??0),0),label=stackLabels[i];
      label.textContent=solved||empty?'':String(total);
      label.setAttribute('fill','#536057');
      tile.querySelector('title').textContent=`${Math.floor(i/N)+1}행 ${i%N+1}열 · ${solved?'완성된 색상':empty?'미정':'현재 누적 '+total+'스택'}`;
      lastValues[i]=key;lines.add(Math.floor(i/N));lines.add(N+i%N);
    }
    updateStatus(lines);updateSelection();
  }
  function renderOverview(){
    if($('terrain-panel').hidden)return;
    const nextLayout=window.stackBoardLayout||window.getStackBoardLayout(svg.parentElement.clientWidth);
    const key=`${nextLayout.width}:${nextLayout.height}:${nextLayout.font}:${nextLayout.left}:${nextLayout.top}:${nextLayout.cell}`;
    if(!tiles.length||key!==lastLayoutKey){
      lastLayoutKey=key;layout=nextLayout;
      const width=layout.width;
      const {height,left,top,cell,end,font,coordinatePadding}=layout,extent=N*cell;
      svg.parentElement.style.height=height+'px';
      svg.parentElement.style.width=width+'px';
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const coordinateSize=layout.coordinateSize;
      let html=`<g id="overview-coordinates" role="status" aria-live="polite" aria-atomic="true" style="font:650 ${coordinateSize}px system-ui;fill:#34493a;text-anchor:end"><text x="${left-coordinatePadding}" y="${top-coordinatePadding}" dominant-baseline="text-after-edge"><tspan data-coordinate="row">—</tspan><tspan>,</tspan><tspan data-coordinate="col">—</tspan></text></g>`;
      for(let i=0;i<N*N;i++)html+=`<rect class="overview-cell" data-overview-cell="${i}" x="${left+i%N*cell}" y="${top+Math.floor(i/N)*cell}" width="${cell}" height="${cell}" stroke="#cbd4c4" stroke-width="1"><title></title></rect>`;
      for(let i=0;i<N*N;i++)html+=`<text class="overview-stack-total" data-stack-total="${i}" x="${left+i%N*cell+cell/2}" y="${top+Math.floor(i/N)*cell+cell/2}" text-anchor="middle" dominant-baseline="central" pointer-events="none" aria-hidden="true" style="font-size:${font}px"></text>`;
      for(const clue of C.combinedClues){
        const {axis,line,groups,maximum}=clue,row=axis==='row',l=line+(row?0:N),label=groups.join(' ');
        const x=row?0:left+line*cell,y=row?top+line*cell:0;
        const positions=window.getStackCluePositions(groups,axis,layout);
        const text=groups.map((number,k)=>{
          return `<text data-clue-token="${k}" class="clue-text" x="${row?positions[k]:cell/2}" y="${row?cell/2:positions[k]}" text-anchor="middle" dominant-baseline="central" style="font-size:${font}px">${number}</text>`;
        }).join('');
        const separator=`<path class="overview-clue-separator" d="${row?`M0 ${cell}H${left}`:`M${cell} 0V${top}`}"/>`;
        html+=`<g class="overview-marker overview-run-clue" data-axis="${axis}" data-line="${line}" data-overview-clue="${l}" role="button" tabindex="0" aria-label="전체 ${line+1}${row?'행':'열'} 구간 스택 합계 ${label}" transform="translate(${x},${y})"><rect width="${row?left:cell}" height="${row?cell:top}"/>${text}${separator}</g>`;
        html+=`<g class="overview-marker overview-maximum" data-axis="${axis}" data-line="${line}" data-overview-clue="${l}" role="button" tabindex="0" aria-label="전체 ${line+1}${row?'행':'열'} 최대 높이 ${maximum}" transform="translate(${row?left+extent:left+line*cell},${row?top+line*cell:top+extent})"><rect width="${row?end:cell}" height="${row?cell:end}"/><text class="clue-text" x="${(row?end:cell)/2}" y="${(row?cell:end)/2}" text-anchor="middle" dominant-baseline="central" style="font-size:${font}px">${maximum}</text><path class="overview-clue-separator" d="${row?`M0 ${cell}H${end}`:`M${cell} 0V${end}`}"/></g>`;
      }
      html+='<rect id="overview-line-outline" fill="none" stroke="#426d51" stroke-width="1.5" pointer-events="none" visibility="hidden"/><rect id="overview-cursor" fill="none" stroke="#263e30" stroke-width="2" pointer-events="none"/>';
      svg.innerHTML=html;tiles=Array.from(svg.querySelectorAll('[data-overview-cell]'));stackLabels=Array.from(svg.querySelectorAll('[data-stack-total]'));lastValues=[];
    }
    updateCells(Array.from({length:N*N},(_,i)=>i));
  }
  function updateSelection(){
    if(!layout)return;
    const outline=$('overview-line-outline'),{left,top,cell}=layout,extent=N*cell;
    const cursor=$('overview-cursor');cursor.setAttribute('visibility',selected===null||inputMode==='touch'?'hidden':'visible');
    const coordinates=getSelectedCoordinates();
    svg.querySelector('#overview-coordinates [data-coordinate="row"]').textContent=coordinates.row??'—';
    svg.querySelector('#overview-coordinates [data-coordinate="col"]').textContent=coordinates.col??'—';
    svg.querySelector('#overview-coordinates').setAttribute('aria-label',`${coordinates.row===null?'행 미선택':coordinates.row+'행'}, ${coordinates.col===null?'열 미선택':coordinates.col+'열'}`);
    if(selected!==null){cursor.setAttribute('x',left+selected%N*cell+1);cursor.setAttribute('y',top+Math.floor(selected/N)*cell+1);cursor.setAttribute('width',Math.max(0,cell-2));cursor.setAttribute('height',Math.max(0,cell-2));}
    outline.setAttribute('visibility',terrainSelection?'visible':'hidden');
    if(terrainSelection){const {axis,line}=terrainSelection;outline.setAttribute('x',left+(axis==='col'?line*cell:0));outline.setAttribute('y',top+(axis==='row'?line*cell:0));outline.setAttribute('width',axis==='row'?extent:cell);outline.setAttribute('height',axis==='row'?cell:extent);}
    svg.querySelectorAll('.overview-marker').forEach(el=>{
      const active=activeClue(el.dataset.axis,Number(el.dataset.line));
      el.classList.toggle('active-line',active);el.setAttribute('aria-pressed',active);
    });
  }
  const activate=e=>{const marker=e.target.closest('.overview-marker');if(marker)selectLine(marker.dataset.axis,Number(marker.dataset.line));};
  svg.addEventListener('click',activate);svg.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.closest('.overview-marker')){e.preventDefault();activate(e);}});
  window.renderTerrain=renderOverview;window.updateTerrainCells=updateCells;
  render();
})();
