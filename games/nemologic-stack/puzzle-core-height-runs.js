(function(root){
  'use strict';
  const runs=line=>{const out=[];let last=null;for(const v of line){if(v!==last){out.push(v===0?0:1);last=v;}else if(v!==0)out[out.length-1]++;}return out;};
  // Segment DP: dot consumes >=1 zeros; positive token consumes exactly that many
  // equal positive heights; adjacent positive segments must have different heights.
  function lineSupports(groups,maximum,domains,total=null){
    const n=domains.length,suffix=Array(groups.length+1).fill(0),memo=new Map();
    const positiveSuffix=Array(groups.length+1).fill(0);
    for(let k=groups.length-1;k>=0;k--)suffix[k]=suffix[k+1]+(groups[k]||1);
    for(let k=groups.length-1;k>=0;k--)positiveSuffix[k]=positiveSuffix[k+1]+groups[k];
    function visit(k,pos,previous,hit,remaining){
      if(total!==null&&(remaining<positiveSuffix[k]||remaining>positiveSuffix[k]*maximum))return {ok:false,edges:[]};
      const base=((k*(n+1)+pos)*(maximum+1)+previous)*2+Number(hit);
      const key=total===null?base:base*(total+1)+remaining;
      if(memo.has(key))return memo.get(key);
      const node={ok:false,edges:[]};memo.set(key,node);
      if(k===groups.length){node.ok=pos===n&&hit&&(total===null||remaining===0);return node;}
      if(pos+suffix[k]>n)return node;
      const add=(length,value)=>{
        const child=visit(k+1,pos+length,value,hit||value===maximum,total===null?null:remaining-length*value);
        if(child.ok){node.ok=true;node.edges.push({start:pos,length,value,child});}
      };
      if(groups[k]===0){
        for(let length=1;pos+length+suffix[k+1]<=n;length++){
          if(!(domains[pos+length-1]&1))break;add(length,0);
        }
      }else{
        const length=groups[k];let shared=(1<<(maximum+1))-2;
        for(let p=pos;p<pos+length;p++)shared&=domains[p];
        for(let v=1;v<=maximum;v++)if(v!==previous&&(shared&(1<<v)))add(length,v);
      }
      return node;
    }
    const first=visit(0,0,0,maximum===0,total);if(!first.ok)return null;
    const support=Array(n).fill(0),seen=new Set();
    function collect(node){if(seen.has(node))return;seen.add(node);for(const e of node.edges){for(let p=e.start;p<e.start+e.length;p++)support[p]|=1<<e.value;collect(e.child);}}
    collect(first);return support;
  }
  function createCore(spec){
    const maxStack=spec.maxStack??3,domainMask=(1<<(maxStack+1))-1;
    const N=spec.width,solution=spec.cells,sum=a=>a.reduce((x,y)=>x+y,0);
    const indices=(axis,line)=>Array.from({length:N},(_,p)=>axis==='row'?line*N+p:p*N+line);
    const values=mask=>Array.from({length:maxStack+1},(_,v)=>v).filter(v=>mask&(1<<v)),singleton=m=>m>0&&(m&(m-1))===0;
    const clues=[0,1,2].map(c=>['row','col'].flatMap(axis=>Array.from({length:N},(_,line)=>{
      const cells=indices(axis,line),v=cells.map(i=>solution[i][c]),maximum=Math.max(...v);
      return {axis,line,cells,groups:runs(v),maximum,total:maximum};
    })));
    const caches=clues.map(list=>list.map(()=>new Map()));
    function supports(channel,index,domains){
      const clue=clues[channel][index],line=clue.cells.map(i=>domains[i]),key=line.join(','),cache=caches[channel][index];
      if(cache.has(key))return cache.get(key);
      const result=lineSupports(clue.groups,clue.maximum,line);
      if(cache.size>1500)cache.clear();cache.set(key,result);return result;
    }
    function propagate(channel,initial,stop=false){
      const domains=initial.slice(),steps=[];let changed=true;
      while(changed){changed=false;
        for(let line=0;line<2*N;line++){
          const clue=clues[channel][line],support=supports(channel,line,domains);
          if(!support)throw new Error('동일 높이 구간 또는 최대 높이와 맞지 않는 입력이 있어요.');
          for(let p=0;p<N;p++){
            const index=clue.cells[p],before=domains[index],after=before&support[p];
            if(after!==before){domains[index]=after;changed=true;steps.push({channel,index,before,after,axis:clue.axis,line:clue.line,kind:'height-runs',groups:clue.groups,maximum:clue.maximum});if(stop&&singleton(after))return {domains,steps};}
          }
        }
      }
      return {domains,steps};
    }
    function solve(givens){
      const domains=[],steps=[];
      for(let c=0;c<3;c++){const initial=Array(N*N).fill(domainMask);for(const g of givens)if(g.channel===c)initial[g.index]=1<<g.value;const result=propagate(c,initial);domains.push(result.domains);steps.push(...result.steps);}
      return {domains,steps};
    }
    function makeGivens(progress=()=>{}){
      const givens=[];
      for(let channel=0;channel<3;channel++){
        let result=propagate(channel,Array(N*N).fill(domainMask)),added=0;
        while(result.domains.some(d=>!singleton(d))){
          const rows=Array(N).fill(0),cols=Array(N).fill(0);
          result.domains.forEach((d,i)=>{if(!singleton(d)){rows[Math.floor(i/N)]++;cols[i%N]++;}});
          const candidates=result.domains.map((d,index)=>({d,index})).filter(x=>!singleton(x.d));
          candidates.sort((a,b)=>values(a.d).length-values(b.d).length||Math.min(rows[Math.floor(a.index/N)],cols[a.index%N])-Math.min(rows[Math.floor(b.index/N)],cols[b.index%N])||a.index-b.index);
          let best;
          for(const {index} of candidates.slice(0,8)){
            const next=result.domains.slice();next[index]=1<<solution[index][channel];const trial=propagate(channel,next);
            const score=trial.domains.reduce((s,d)=>s+(singleton(d)?30:maxStack+1-values(d).length),0);
            if(!best||score>best.score)best={index,trial,score};
          }
          givens.push({channel,index:best.index,value:solution[best.index][channel]});result=best.trial;added++;
          if(added%25===0)progress({channel,added,remaining:result.domains.filter(d=>!singleton(d)).length});
        }
        progress({channel,added,remaining:0});
      }
      // Remove anchors that later deductions made unnecessary.
      for(let p=givens.length-1;p>=0;p--){const trial=givens.filter((_,i)=>i!==p);if(solve(trial).domains.every(d=>d.every(singleton)))givens.splice(p,1);}
      return givens;
    }
    function deduce(board,stop=true){const domains=[],steps=[];for(let c=0;c<3;c++){const r=propagate(c,board.map(v=>v[c]===null?domainMask:1<<v[c]),stop);domains.push(r.domains);steps.push(...r.steps);if(stop&&r.steps.some(s=>singleton(s.after)))break;}return {domains,steps};}
    function lineStatus(line,groups,maximum){const valid=lineSupports(groups,maximum,line.map(v=>v===null?domainMask:1<<v));return !valid?'conflict':line.some(v=>v===null)?'':'done';}
    return {N,maxStack,domainMask,solution,sum,indices,values,singleton,runs,clues,propagate,solve,makeGivens,deduce,lineStatus,lineSupports,rule:'height-runs-max',showTerrainValues:false};
  }
  if(typeof module!=='undefined')module.exports={createCore,runs,lineSupports};
  root.HeightRunCore={createCore,runs,lineSupports};
  if(root.PUZZLE_SPEC)root.PicrossCore=createCore(root.PUZZLE_SPEC);
})(typeof globalThis!=='undefined'?globalThis:this);
