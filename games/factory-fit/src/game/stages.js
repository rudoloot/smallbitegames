import {processes} from './forward-processes.js';
import {forwardLayouts} from './forward-layouts.js';

export function forwardStage(base,spec,index){
  const [factory,title,inlets,steps]=processes[index];
  const goods=[...inlets.flatMap(([, ...items])=>items),...steps.map(row=>row[2])];
  const stepRecipes=Object.fromEntries(steps.map(([type,operation,output,needs],i)=>{
    const input=Object.keys(needs)[0];
    return ['m'+(i+1),{operation,output,needs,input,inputStage:goods.indexOf(input),outputStage:goods.indexOf(output)}];
  }));
  return {...base,...spec,forward:true,goods,stepRecipes,product:steps.at(-1)[2],input:goods[0],factory,
    id:index?'factory-'+factory:'sample-01',name:index?title+' 공장':'첫 번째 나무상자',processTitle:title,
    processSummary:inlets.map(d=>d[0]+' 입고').join(' · ')+' → '+steps.map(s=>s[1]).join(' → '),
    revision:factory==='slipper'?'delivery-v2':'delivery-v1',region:index<3?'meadow':'snow',number:index+1,shape:'custom',playbackGoals:true,
    playerPlacesInbound:true,unlimitedEquipment:false,startLayout:[],holes:[],sampleCount:10,batch:null,
    hint:'입고장과 각 설비에 담당자를 배치하세요. 필요한 부품이 모두 도착하면 가공하고 다음 설비로 배달합니다.'};
}
export const buildStages=base=>forwardLayouts.map((s,i)=>forwardStage(base,s,i));
