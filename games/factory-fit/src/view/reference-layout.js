import {cellKey,footprint} from '../game/layout.js';
import {dockBody} from '../game/docks.js';
import {EQUIPMENT} from '../game/config.js';

export function showReference(container,stage){
  const grid=document.createElement('div');
  grid.className='reference-grid';
  grid.style.gridTemplateColumns='repeat('+stage.height+',1fr)';
  const marks=new Map(), legend=document.createElement('ol');
  for(const dock of stage.fixtures){
    const text=dock.supplies?'입'+(1+stage.fixtures.filter(f=>f.supplies).indexOf(dock)):'출';
    for(const p of dockBody(dock)) marks.set(cellKey(p),[text,dock.color]);
    if(dock.supplies)marks.set(cellKey(dock.access),[text+'·W','#bfd7e3']);
    const row=document.createElement('li');row.textContent=text+' · '+dock.label;legend.append(row);
  }
  for(const [i,item] of stage.referenceLayout.entries()){
    const shape=footprint(item),number=String(i+1),recipe=stage.stepRecipes[item.id];
    for(const p of shape.body)marks.set(cellKey(p),[number+(cellKey(p)===cellKey(shape.output)?'·I':''),EQUIPMENT[item.type].color]);
    marks.set(cellKey(shape.work[0]),[number+'·W','#bfd7e3']);
    const row=document.createElement('li');
    row.textContent=number+' · '+recipe.operation+' — '+Object.entries(recipe.needs).map(([name,n])=>name+' ×'+n).join(' + ')+' → '+recipe.output;
    legend.append(row);
  }
  for(const p of stage.pillars)marks.set(cellKey(p),['■','#b7b5a7']);
  for(let x=0;x<stage.width;x++)for(let y=stage.height-1;y>=0;y--){
    const key=cellKey({x,y}),cell=document.createElement('span');
    if(stage.cells.includes(key)){
      const [text,color]=marks.get(key)??['','#e4dece'];
      cell.textContent=text;cell.style.backgroundColor=color;
    }
    grid.append(cell);
  }
  container.replaceChildren(grid,legend);
}
