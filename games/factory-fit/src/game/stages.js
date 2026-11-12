import { firstBoxStage } from './first-box-stage.js';
import { productStages } from './product-stages.js';
import { FACTORIES,processConfig } from './products.js';

export function buildStages(base) {
  const common = {...base,shape:'custom',playerPlacesInbound:true,holes:[],unlimitedEquipment:false,startLayout:[]};
  const box = {...common,...firstBoxStage,id:'sample-01',factory:'box',name:'첫 번째 나무상자',
    number:1,region:'meadow',revision:'box-v2',referenceAssignments:{w1:'m1',w2:'m2',w3:'m3',w4:'outbound'}};
  return [box,...productStages.map((spec,index)=>({
    ...common,...processConfig(spec.factory),...spec,id:'factory-'+spec.factory,
    name:FACTORIES[spec.factory].name+' 공장',number:index+2,region:index<2?'meadow':'snow',
  }))];
}
