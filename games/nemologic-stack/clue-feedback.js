(function(root){
  'use strict';
  const cache=new Map();
  // Only visible line clues and entered values are accepted; no answer data.
  function evaluate(line,groups,maximum){
    const key=JSON.stringify([line,groups,maximum]);if(cache.has(key))return cache.get(key);
    const tokens=groups.map(()=>''),known=line.filter(v=>v!==null);
    const maximumState=known.some(v=>v>maximum)?'conflict':known.includes(maximum)?'done':'';
    const mark=(i,state)=>{if(i>=0&&i<tokens.length&&(tokens[i]!=='conflict'||state==='conflict'))tokens[i]=state;};
    function scan(values,reverse){
      let pos=0,k=0;
      while(pos<values.length){
        while(values[pos]===0)pos++;
        if(pos===values.length||values[pos]===null)return;
        const index=reverse?groups.length-1-k:k,target=groups[index],value=values[pos];
        if(target===undefined){mark(reverse?0:groups.length-1,'conflict');return;}
        let sum=0;while(pos<values.length&&values[pos]===value){sum+=value;pos++;}
        const closed=pos===values.length||values[pos]!==null;
        if(value>maximum||target%value!==0||sum>target||closed&&sum!==target){mark(index,'conflict');return;}
        if(sum===target)mark(index,'done');
        if(!closed)return;
        k++;
      }
    }
    scan(line,false);scan(line.slice().reverse(),true);
    const allows=(i,v)=>line[i]===null||line[i]===v,memo=new Map(),suffix=Array(groups.length+1).fill(0);
    if(maximum>0)for(let k=groups.length-1;k>=0;k--)suffix[k]=suffix[k+1]+Math.ceil(groups[k]/maximum);
    function fits(k,pos,previous,hit){
      const id=[k,pos,previous,+hit].join(',');if(memo.has(id))return memo.get(id);
      let result=false;
      if(k===groups.length)result=hit&&line.slice(pos).every(v=>v===null||v===0);
      else if(maximum>0)outer:for(let start=pos;start+suffix[k]<=line.length;start++){
        if(start>pos&&!allows(start-1,0))break;
        for(let value=1;value<=maximum;value++){
          if(groups[k]%value||start===pos&&previous===value)continue;
          const length=groups[k]/value;if(start+length+suffix[k+1]>line.length)continue;
          let valid=true;for(let i=start;i<start+length;i++)if(!allows(i,value)){valid=false;break;}
          if(valid&&fits(k+1,start+length,value,hit||value===maximum)){result=true;break outer;}
        }
      }
      memo.set(id,result);return result;
    }
    const possible=fits(0,0,0,maximum===0);
    // Feasibility is diagnostic only. An impossible full-line completion must
    // not color unresolved clues: only the two edge scans grade those tokens.
    const result={tokens,maximum:maximumState,possible};
    if(cache.size>1600)cache.clear();cache.set(key,result);return result;
  }
  const api={evaluate};if(typeof module!=='undefined')module.exports=api;root.ClueFeedback=api;
})(typeof globalThis!=='undefined'?globalThis:this);
