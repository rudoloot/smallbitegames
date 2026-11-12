import {cellKey,footprint} from '../game/layout.js';
import {dockBody} from '../game/docks.js';
import {isInlet} from '../game/docks.js';
import {outputColor, inletColors, inletCellColor} from '../game/simulation.js';
import {TRAY_GREEN, markTrayCell} from './tray-flag.js';
import {EQUIPMENT} from '../game/config.js';

export function showReference(container,stage){
  const grid=document.createElement('div');
  grid.className='reference-grid';
  grid.style.gridTemplateColumns='repeat('+stage.height+',1fr)';
  const marks=new Map(), legend=document.createElement('ol');
  for(const dock of stage.fixtures){
    const text=dock.supplies?'입'+(1+stage.fixtures.filter(f=>f.supplies).indexOf(dock)):'출';
    const colors=isInlet(dock.id) ? inletColors(dock,stage) : [dock.color];
    for(const p of dockBody(dock)) marks.set(cellKey(p),[text,inletCellColor(dock,p,colors)]);
    if(dock.id==='outbound')marks.set(cellKey(dock.access),[text+'·W','#bfd7e3']);
    const row=document.createElement('li');row.textContent=text+' · '+dock.label;legend.append(row);
  }
  for(const [i,item] of stage.referenceLayout.entries()){
    const shape=footprint(item),number=String(i+1),recipe=stage.stepRecipes[item.id];
    for(const p of shape.body){
      const tray=cellKey(p)===cellKey(shape.output);
      marks.set(cellKey(p),[number+(tray?'·O':''),tray?TRAY_GREEN:EQUIPMENT[item.type].color,tray?outputColor(item,stage):null]);
    }
    marks.set(cellKey(shape.work[0]),[number+'·W','#bfd7e3']);
    const row=document.createElement('li');
    row.textContent=number+' · '+recipe.operation+' — '+Object.entries(recipe.needs).map(([name,n])=>name+' ×'+n).join(' + ')+' → '+recipe.output;
    legend.append(row);
  }
  for(const p of stage.pillars)marks.set(cellKey(p),['■','#b7b5a7']);
  for(let x=0;x<stage.width;x++)for(let y=stage.height-1;y>=0;y--){
    const key=cellKey({x,y}),cell=document.createElement('span');
    if(stage.cells.includes(key)){
      const [text,color,flag]=marks.get(key)??['','#e4dece'];
      cell.textContent=text;cell.style.backgroundColor=color;
      if(flag) markTrayCell(cell,flag);
      const [r,g,b]=color.slice(1).match(/../g).map(hex=>parseInt(hex,16));
      cell.style.color=.299*r+.587*g+.114*b<132?'#fff':'#192820';
    }
    grid.append(cell);
  }
  container.replaceChildren(grid,legend);
}
