(function(root){
'use strict';
const base=typeof module!=='undefined'?require('./puzzle-core-height-runs.js'):root.HeightRunCore;
function runs(line){
  const out=[];let previous=null;
  for(const value of line){if(value!==previous)out.push(value);else if(value>0)out[out.length-1]+=value;previous=value;}
  return out;
}
function trimOuterZeros(groups){const out=groups.slice();if(out[0]===0)out.shift();if(out.at(-1)===0)out.pop();return out.length?out:[0];}
function supports(groups,maximum,domains,omitOuterZeros=false){
  const n=domains.length,memo=new Map(),suffix=Array(groups.length+1).fill(0);
  for(let k=groups.length-1;k>=0;k--)suffix[k]=suffix[k+1]+(groups[k]===0?1:Math.ceil(groups[k]/maximum));
  function visit(k,pos,previous,hit){
    const key=[k,pos,previous,Number(hit)].join(',');if(memo.has(key))return memo.get(key);
    const node={ok:false,edges:[]};memo.set(key,node);
    if(k===groups.length){
      node.ok=hit&&(pos===n||omitOuterZeros&&domains.slice(pos).every(mask=>mask&1));
      if(node.ok&&pos<n)node.edges.push({pos,length:n-pos,value:0,child:{ok:true,edges:[]}});
      return node;
    }
    if(pos+suffix[k]>n)return node;
    function add(length,value){
      const child=visit(k+1,pos+length,value,hit||value===maximum);
      if(child.ok){node.ok=true;node.edges.push({pos,length,value,child});}
    }
    if(groups[k]===0){
      for(let length=1;pos+length+suffix[k+1]<=n;length++){if(!(domains[pos+length-1]&1))break;add(length,0);}
    }else for(let value=1;value<=maximum;value++){
      if(value===previous||groups[k]%value!==0)continue;
      const length=groups[k]/value;if(pos+length+suffix[k+1]>n)continue;
      if(domains.slice(pos,pos+length).every(mask=>mask&(1<<value)))add(length,value);
    }
    return node;
  }
  let root;
  if(omitOuterZeros&&maximum>0){
    root={ok:false,edges:[]};
    for(let start=0;start<=n;start++){
      if(start>0&&!(domains[start-1]&1))break;
      const child=visit(0,start,0,false);
      if(child.ok){root.ok=true;root.edges.push({pos:0,length:start,value:0,child});}
    }
  }else root=visit(0,0,0,maximum===0);
  if(!root.ok)return null;
  const masks=Array(n).fill(0),seen=new Set();
  function collect(node){if(seen.has(node))return;seen.add(node);for(const e of node.edges){for(let i=e.pos;i<e.pos+e.length;i++)masks[i]|=1<<e.value;collect(e.child);}}
  collect(root);return masks;
}

// A hidden zero gap can occur before any positive run. Equal heights need a
// nonempty gap; different heights may touch or have a gap of unknown length.
function supportsNoZeros(groups,maximum,domains){
  const n=domains.length;
  if(!groups.length)return maximum===0&&domains.every(m=>m&1)?domains.map(()=>1):null;
  if(maximum<=0)return null;
  const memo=new Map(),suffix=Array(groups.length+1).fill(0);
  for(let k=groups.length-1;k>=0;k--)suffix[k]=suffix[k+1]+Math.ceil(groups[k]/maximum);
  function visit(k,pos,previous,hit){
    const key=[k,pos,previous,+hit].join(','),cached=memo.get(key);if(cached)return cached;
    const node={ok:false,edges:[]};memo.set(key,node);
    if(k===groups.length){
      node.ok=hit&&domains.slice(pos).every(m=>m&1);
      if(node.ok)node.edges.push({segments:[[pos,n-pos,0]],child:null});
      return node;
    }
    for(let start=pos;start+suffix[k]<=n;start++){
      if(start>pos&&!(domains[start-1]&1))break;
      for(let value=1;value<=maximum;value++){
        if(groups[k]%value||start===pos&&previous===value)continue;
        const length=groups[k]/value;
        if(start+length+suffix[k+1]>n||!domains.slice(start,start+length).every(m=>m&(1<<value)))continue;
        const child=visit(k+1,start+length,value,hit||value===maximum);
        if(child.ok){node.ok=true;node.edges.push({segments:[[pos,start-pos,0],[start,length,value]],child});}
      }
    }
    return node;
  }
  const root=visit(0,0,0,false);if(!root.ok)return null;
  const masks=Array(n).fill(0),seen=new Set();
  function collect(node){if(!node||seen.has(node))return;seen.add(node);for(const e of node.edges){for(const [pos,length,value] of e.segments)for(let i=pos;i<pos+length;i++)masks[i]|=1<<value;collect(e.child);}}
  collect(root);return masks;
}

function createCore(spec){
  const legacy=base.createCore(spec),{N,solution,indices,singleton,values,domainMask}=legacy;
  const omitAllZeros=!!spec.omitAllZeros,omitOuterZeros=!!spec.omitOuterZeros;
  const clueRuns=line=>omitAllZeros?runs(line).filter(v=>v>0):omitOuterZeros?trimOuterZeros(runs(line)):runs(line);
  const lineSupports=(groups,maximum,domains)=>omitAllZeros?supportsNoZeros(groups,maximum,domains):supports(groups,maximum,domains,omitOuterZeros);
  function makeClues(channel){return ['row','col'].flatMap(axis=>Array.from({length:N},(_,line)=>{
    const cells=indices(axis,line),heights=cells.map(i=>channel===null?solution[i].reduce((s,v)=>s+v,0):solution[i][channel]);
    return {axis,line,cells,groups:clueRuns(heights),maximum:Math.max(...heights),total:Math.max(...heights)};
  }));}
  const clues=[0,1,2].map(makeClues),combinedClues=makeClues(null),caches=new Map();
  function cached(clue,domains){
    let cache=caches.get(clue);if(!cache){cache=new Map();caches.set(clue,cache);}
    const key=domains.join(',');if(cache.has(key))return cache.get(key);
    const result=lineSupports(clue.groups,clue.maximum,domains);if(cache.size>1200)cache.clear();cache.set(key,result);return result;
  }
  function triples(masks){const out=[];for(const r of values(masks[0]))for(const g of values(masks[1]))for(const b of values(masks[2]))out.push([r,g,b]);return out;}
  function propagate(initial,stop=false){
    const domains=initial.map(d=>d.slice()),steps=[];let changed=true;
    function apply(channel,index,after,clue,combined){
      const before=domains[channel][index];after&=before;if(!after)throw new Error('구간 스택 합계 또는 최대 높이와 맞지 않아요.');
      if(after===before)return false;
      domains[channel][index]=after;changed=true;
      steps.push({channel,index,before,after,kind:combined?'combined-run-sums':'run-stack-sums',axis:clue.axis,line:clue.line,groups:clue.groups,maximum:clue.maximum});
      return stop&&singleton(after);
    }
    while(changed){changed=false;
      for(let c=0;c<3;c++)for(const clue of clues[c]){
        const allowed=cached(clue,clue.cells.map(i=>domains[c][i]));if(!allowed)throw new Error('구간 스택 합계 또는 최대 높이와 맞지 않아요.');
        for(let p=0;p<N;p++)if(apply(c,clue.cells[p],allowed[p],clue,false))return {domains,steps};
      }
      for(const clue of combinedClues){
        const combinations=clue.cells.map(i=>triples(domains.map(d=>d[i])));
        const sums=combinations.map(list=>list.reduce((m,t)=>m|(1<<(t[0]+t[1]+t[2])),0));
        const allowed=cached(clue,sums);if(!allowed)throw new Error('전체뷰의 구간 합계 또는 최대 높이와 맞지 않아요.');
        for(let p=0;p<N;p++){
          const masks=[0,0,0];for(const t of combinations[p])if(allowed[p]&(1<<(t[0]+t[1]+t[2])))for(let c=0;c<3;c++)masks[c]|=1<<t[c];
          for(let c=0;c<3;c++)if(apply(c,clue.cells[p],masks[c],clue,true))return {domains,steps};
        }
      }
    }
    return {domains,steps};
  }
  function solve(givens=[]){const domains=Array.from({length:3},()=>Array(N*N).fill(domainMask));for(const g of givens)domains[g.channel][g.index]=1<<g.value;return propagate(domains);}
  const deduce=(board,stop=true)=>propagate([0,1,2].map(c=>board.map(t=>t[c]===null?domainMask:1<<t[c])),stop);
  function lineStatus(line,groups,maximum){const valid=lineSupports(groups,maximum,line.map(v=>v===null?domainMask:1<<v));return !valid?'conflict':line.some(v=>v===null)?'':'done';}
  function combinedStatus(board,clue){
    const sums=clue.cells.map(i=>triples(board[i].map(v=>v===null?domainMask:1<<v)).reduce((m,t)=>m|(1<<(t[0]+t[1]+t[2])),0));
    return !cached(clue,sums)?'conflict':clue.cells.every(i=>board[i].every(v=>v!==null))?'done':'';
  }
  const hintReason=step=>`${step.kind==='combined-run-sums'?'전체뷰 RGB 합산 높이': ['빨강','녹색','파랑'][step.channel]} ${step.line+1}${step.axis==='row'?'행':'열'}의 구간 스택 합계 [${step.groups.join(' ')}], 최대 높이 ${step.maximum}와 교차하는 줄의 조건을 적용하면`;
  return {...legacy,clues,combinedClues,runs:clueRuns,solve,deduce,propagate,lineStatus,combinedStatus,hintReason,stackSumRuns:true,omitAllZeros,omitOuterZeros,noGivens:true,storageKey:spec.storageKey||'rgb-stack-picross-fruit-square-v1'};
}
if(typeof module!=='undefined')module.exports={createCore,runs,trimOuterZeros,lineSupports:supports,lineSupportsNoZeros:supportsNoZeros};
root.StackSumCore={createCore,runs,lineSupportsNoZeros:supportsNoZeros};
if(root.PUZZLE_SPEC)root.PicrossCore=createCore(root.PUZZLE_SPEC);
})(typeof globalThis!=='undefined'?globalThis:this);
