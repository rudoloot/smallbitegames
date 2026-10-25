(function(root){
'use strict';
const helpers=typeof module!=='undefined'?require('./puzzle-core-stack-sums.js'):root.StackSumCore;
function createCore(spec){
  const N=spec.width,maxStack=3,domainMask=15,solution=spec.cells.map(cell=>cell.slice());
  const sum=values=>values.reduce((a,b)=>a+b,0),singleton=mask=>mask>0&&(mask&(mask-1))===0;
  const values=mask=>[0,1,2,3].filter(value=>mask&(1<<value));
  const indices=(axis,line)=>Array.from({length:N},(_,i)=>axis==='row'?line*N+i:i*N+line);
  const runs=line=>helpers.runs(line).filter(value=>value>0);
  const lineClues=['row','col'].flatMap(axis=>Array.from({length:N},(_,line)=>{
    const cells=indices(axis,line),heights=cells.map(i=>solution[i][0]);
    return {axis,line,cells,groups:runs(heights),maximum:Math.max(...heights),total:Math.max(...heights)};
  }));
  const supports=(clue,masks)=>helpers.lineSupportsNoZeros(clue.groups,clue.maximum,masks);
  function propagate(initial,stop=false){
    const domains=initial.slice(),steps=[];let changed=true;
    while(changed){changed=false;for(const clue of lineClues){
      const allowed=supports(clue,clue.cells.map(i=>domains[i]));
      if(!allowed)throw new Error('구간 스택 합계 또는 최대 높이와 맞지 않아요.');
      for(let p=0;p<N;p++){
        const index=clue.cells[p],before=domains[index],after=allowed[p]&before;
        if(after===before)continue;
        domains[index]=after;changed=true;
        steps.push({channel:0,index,before,after,kind:'run-stack-sums',axis:clue.axis,line:clue.line,groups:clue.groups,maximum:clue.maximum});
        if(stop&&singleton(after))return {domains:[domains],steps};
      }
    }}
    return {domains:[domains],steps};
  }
  function solve(givens=[]){const masks=Array(N*N).fill(domainMask);for(const g of givens)masks[g.index]=1<<g.value;return propagate(masks);}
  const deduce=(board,stop=true)=>propagate(board.map(cell=>cell[0]===null?domainMask:1<<cell[0]),stop);
  const lineStatus=(line,groups,maximum)=>!helpers.lineSupportsNoZeros(groups,maximum,line.map(v=>v===null?domainMask:1<<v))?'conflict':line.includes(null)?'':'done';
  return {N,maxStack,domainMask,channels:1,solution,sum,singleton,values,indices,runs,clues:[lineClues],combinedClues:lineClues,solve,deduce,lineStatus,
    combinedStatus:(board,clue)=>lineStatus(clue.cells.map(i=>board[i][0]),clue.groups,clue.maximum),
    storageKey:spec.storageKey,rule:'height-runs-max',stackSumRuns:true,omitAllZeros:true,omitOuterZeros:true,noGivens:true,showTerrainValues:false};
}
if(typeof module!=='undefined')module.exports={createCore};
root.MonochromeCore={createCore};
if(root.MONO_SPEC)root.PicrossCore=createCore(root.MONO_SPEC);
})(typeof globalThis!=='undefined'?globalThis:this);
