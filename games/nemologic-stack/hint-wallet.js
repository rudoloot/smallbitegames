/* Local web wallet. A durable journal keeps a hint debit and its board change together. */
(function(root){
 'use strict';
 const KEY='nonogram-stack-hints-v1',INITIAL=3;
 const copy=value=>JSON.parse(JSON.stringify(value));
 const validCells=cells=>Array.isArray(cells)&&cells.length>0&&cells.length<=400&&cells.every(cell=>Array.isArray(cell)&&cell.length===1&&(cell[0]===null||Number.isInteger(cell[0])&&cell[0]>=0&&cell[0]<=3));
 function findHint(cells,solution,selected=null){
  if(!validCells(cells)||!validCells(solution)||cells.length!==solution.length||solution.some(cell=>cell[0]===null))throw Error('Invalid hint board');
  const order=[...(Number.isInteger(selected)&&selected>=0&&selected<cells.length?[selected]:[]),...cells.map((_,index)=>index).filter(index=>index!==selected)];
  const index=order.find(index=>cells[index][0]===null);
  return index===undefined?null:{index,channel:0,before:null,value:solution[index][0],kind:'reveal'};
 }
 function clueHints(cells,solution,size){
  if(!validCells(cells)||!validCells(solution)||cells.length!==size*size||solution.length!==cells.length||solution.some(cell=>cell[0]===null))throw Error('Invalid clue hint board');
  const hints=[];
  for(const axis of ['row','col'])for(let line=0;line<size;line++){
   const indices=Array.from({length:size},(_,p)=>axis==='row'?line*size+p:p*size+line);
   let token=0;
   for(let start=0;start<size;){
    const value=solution[indices[start]][0];let end=start+1;
    while(end<size&&solution[indices[end]][0]===value)end++;
    if(value>0){
     const changes=indices.slice(start,end).filter(index=>cells[index][0]===null).map(index=>({index,channel:0,before:null,value}));
     if(changes.length)hints.push({axis,line,token,sum:value*(end-start),changes});
     token++;
    }
    start=end;
   }
  }
  return hints;
 }
 function create(storage){
  function read(){
   const raw=storage.getItem(KEY);
   if(raw===null){const initial={version:1,balance:INITIAL,pending:null};write(initial);return initial;}
   const state=JSON.parse(raw);
   if(state?.version!==1||!Number.isSafeInteger(state.balance)||state.balance<0)throw Error('Invalid hint wallet');
   if(state.receipts!==undefined&&(!Array.isArray(state.receipts)||state.receipts.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(id))||new Set(state.receipts).size!==state.receipts.length))throw Error('Invalid reward receipts');
   const p=state.pending;
   if(p!==null&&(!p||typeof p.storageKey!=='string'||typeof p.statusKey!=='string'||!validCells(p.board?.cells)||p.board.tab!==0||typeof p.status?.complete!=='boolean'||!Number.isInteger(p.status?.filled)))throw Error('Invalid hint journal');
   return state;
  }
  function write(state){storage.setItem(KEY,JSON.stringify(state));}
  function flush(state){
   if(!state.pending)return state;
   const pending=state.pending;
   storage.setItem(pending.storageKey,JSON.stringify(pending.board));
   storage.setItem(pending.statusKey,JSON.stringify(pending.status));
   const cleared={...state,pending:null};write(cleared);return cleared;
  }
  function recover(){return flush(read());}
  function balance(){return read().balance;}
  function grantReward(id){
   if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('Invalid reward receipt');
   const state=recover(),receipts=state.receipts||[];
   if(receipts.includes(id))return false;
   write({...state,balance:state.balance+1,receipts:[...receipts,id]});return true;
  }
  function pendingGame(storageKey){const p=read().pending;return p?.storageKey===storageKey?JSON.stringify(p.board):null;}
  function spend({storageKey,statusKey,cells,solution,selected=null,size,clue}){
   if(typeof storageKey!=='string'||!storageKey||typeof statusKey!=='string'||!statusKey||storageKey===statusKey||[storageKey,statusKey].includes(KEY))throw Error('Invalid game save keys');
   const state=recover(),hint=size?clueHints(cells,solution,size).find(h=>h.axis===clue?.axis&&h.line===clue.line&&h.token===clue.token):findHint(cells,solution,selected);
   if(!hint||state.balance===0)return null;
   const next=copy(cells);for(const change of hint.changes||[hint])next[change.index][0]=change.value;
   const pending={storageKey,statusKey,board:{cells:next,tab:0},status:{filled:next.filter(cell=>cell[0]!==null).length,complete:next.every((cell,index)=>cell[0]===solution[index][0]),updated:Date.now()}};
   const committed={...state,balance:state.balance-1,pending};
   // No board changes occur if this single authoritative commit fails.
   write(committed);let deferred=false;
   try{flush(committed);}catch{deferred=true;}
   return {hint,cells:next,balance:committed.balance,deferred};
  }
  read();return {balance,recover,pendingGame,spend,grantReward};
 }
 const api={KEY,INITIAL,create,findHint,clueHints};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.StackHintWallet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
