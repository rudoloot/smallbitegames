import {processConfig} from './products.js';

// Parts are delivered individually even when they share a receiving dock.
const inboundPlans={
  pot:{labels:['냄비 자재'],raw:'주물 재료',parts:[['m7','손잡이·꼭지 세트',0]]},
  window:{labels:['프레임 자재','창문 조립 부품'],raw:'PVC 프로파일',parts:[['m5','복층유리',1],['m5','창호 철물 키트',1]]},
  bike:{labels:['프레임 자재','자전거 조립 부품'],raw:'강관',parts:[['m6','앞바퀴',1],['m6','뒷바퀴',1],['m6','자전거 조립 키트',1]]},
  scooter:{labels:['차체 자재','킥보드 조립 부품'],raw:'압출재·튜브',parts:[['m2','접이식 조향 키트',1],['m3','바퀴 한 쌍',1],['m3','제동 키트',1]]},
};

export function workshopConfig(doc){
  const config=processConfig(doc.factory,doc.steps),plan=inboundPlans[doc.factory];
  if(!plan)return config;
  const labels=plan.labels;
  const parts=plan.parts.filter(([id])=>config.stepRecipes[id]);
  const raw=config.modelSteps[0]===0?plan.raw:config.itemNames.raw;
  const goods=[raw,...parts.map(([,name])=>name)];
  const modelSteps=[config.modelSteps[0],...parts.map(()=>null)];
  const supplies=labels.map(()=>[]);
  supplies[0].push(raw);
  for(const [,name,dock] of parts)supplies[dock].push(name);
  let previous=raw;
  for(const [id,recipe] of Object.entries(config.stepRecipes)){
    const output=config.itemNames[recipe.output];
    recipe.needs=Object.fromEntries([[previous,1],...parts.filter(([target])=>target===id).map(([,name])=>[name,1])]);
    modelSteps.push(config.modelSteps[recipe.outputStage]);
    recipe.input=previous;recipe.inputStage=goods.indexOf(previous);
    recipe.output=output;recipe.outputStage=goods.length;
    goods.push(output);previous=output;
  }
  const template=doc.fixtures.find(f=>f.id==='inbound');
  const fixtures=labels.map((label,i)=>({...template,id:i?'inbound-2':'inbound',label:label+' 입고장',supplies:supplies[i]}));
  fixtures.push(doc.fixtures.find(f=>f.id==='outbound'));
  return {...config,fixtures,modelSteps,goods,input:raw,product:previous,forward:true,workshopInlets:true,
    hint:'입고장과 설비에 작업자를 배치하세요. 모든 부품이 도착하면 담당자가 가공 후 다음 공정으로 운반합니다.'};
}
