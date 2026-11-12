import {processes} from './forward-processes.js';
import {forwardLayouts} from './forward-layouts.js';

export function forwardStage(base,spec,index){
  const [factory,title,inlets,steps]=processes[index];
  const goods=[...inlets.flatMap(([, ...items])=>items),...steps.map(row=>row[2])];
  const stepRecipes=Object.fromEntries(steps.map(([type,operation,output,needs],i)=>{
    const input=Object.keys(needs)[0];
    return ['m'+(i+1),{operation,output,needs,input,inputStage:goods.indexOf(input),outputStage:goods.indexOf(output)}];
  }));
  return {...base,...spec,paired:true,goods,stepRecipes,product:steps.at(-1)[2],input:goods[0],factory,
    id:index?'factory-'+factory:'sample-01',name:index?title+' 공장':'첫 번째 나무상자',processTitle:title,
    processSummary:inlets.map(d=>d[0]+' 입고').join(' · ')+' → '+steps.map(s=>s[1]).join(' → '),
    revision:factory==='glasses'?'collection-v2':'collection-v1',region:index<3?'meadow':'snow',number:index+1,shape:'custom',playbackGoals:true,
    playerPlacesInbound:true,unlimitedEquipment:false,startLayout:[],holes:[],sampleCount:10,batch:null,
    hint:'작업대마다 담당자가 함께 설치됩니다. 담당자가 필요한 재료를 가져오면 가공하고 마지막 작업자가 완제품을 출고 담당자에게 전달합니다.'};
}
export const buildStages=base=>forwardLayouts.map((s,i)=>forwardStage(base,s,i));
