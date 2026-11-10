import { buildStages } from './stages.js';
import { EQUIPMENT_SHAPES } from './equipment-shapes.js';
const RECIPES = {
  cutter: { name: '절단기', short: '절단', width: 3, height: 2, color: '#629b82', seconds: 2.4, input: 'timber', output: 'parts', inputStage: 0, outputStage: 1 },
  assembly: { name: '조립대', short: '조립', width: 3, height: 3, color: '#ca9659', seconds: 4.8, input: 'parts', output: 'crate', inputStage: 1, outputStage: 2 },
  packing: { name: '포장대', short: '포장', width: 2, height: 2, color: '#d1a05f', seconds: 2.2, input: 'crate', output: 'finished', inputStage: 2, outputStage: 4 },
  press: { name: '성형 작업대', short: '성형', width: 2, height: 1, color: '#8ba6bc', seconds: 6, input: 'timber', output: 'finished', inputStage: 0, outputStage: 4 },
  conveyor: { name: '컨베이어', short: '벨트', width: 1, height: 1, color: '#829b93', belt: true },
};
export const EQUIPMENT = Object.freeze(Object.fromEntries([...new Set([...Object.keys(RECIPES), ...Object.keys(EQUIPMENT_SHAPES)])].map(type => [type, { short: EQUIPMENT_SHAPES[type]?.name, color: '#788665', ...RECIPES[type], ...EQUIPMENT_SHAPES[type] }])));
export const PRODUCTS = Object.freeze({ timber: '목재', parts: '상자 부재', crate: '나무상자', finished: '완제품' });
const WORKER_NAMES = ['Alex','Emma','Mia','Noah','Leo','Lily','Max','Chloe','Jack','Zoe','Owen','Ruby','Finn','Ivy','Luke','Ella','Ben','Lucy','Sam','Nora'];
export const WORKERS = Object.freeze(WORKER_NAMES.map((name,index)=>({
  key:`w${index+1}`,name,gender:[1,2,5,7,9,11,13,15,17,19].includes(index)?'female':'male',
  hairstyle:[1,2,5,7,9,11,13,15,17,19].includes(index)?(index%3===2?'bob':'ponytail'):'short',
  color:['#e7b348','#739dc8','#d99a8e','#93aa6e'][index%4],
  skin:['#edc5a1','#dba77d','#b87d55','#f0cfaf'][index%4],
  hairColor:['#59402f','#322f2c','#ae7140','#74503b','#c69b58'][index%5],
  faceStyle:index,trait:['차분한 작업','꼼꼼한 작업','밝은 에너지','꾸준한 작업'][index%4],strength:1,
})));
const LEGACY_STAGE = Object.freeze({
  id: 'first-workflow-01', name: '첫 번째 나무상자', number: 1,
  width: 10, height: 8, tileMeters: 0.5, holes: [], unlimitedEquipment: true,
  inventory: [{ id: 'm1', type: 'cutter' }, { id: 'm2', type: 'assembly' }, { id: 'm3', type: 'packing' }],
  workers: WORKERS, input: 'timber', product: 'finished', batch: null, targetPerMinute: 10, sampleCount: 5, warehouseCarryKg: 20, weights: { finished: 5 },
  fixtures: [
    { id: 'inbound', label: '목재 입고', x: 0, y: 0, width: 1, height: 2, access: { x: 1, y: 1 }, color: '#b98950' },
    { id: 'outbound', label: '완제품 창고', x: 0, y: 6, width: 1, height: 2, access: { x: 1, y: 6 }, color: '#579087' },
  ],
  hint: '절단 → 조립 → 포장. 작업대 앞 한 칸을 비우고, 각 공정 담당자와 창고 직원을 배치하세요.',
});
export const STAGES = buildStages(LEGACY_STAGE);
const selectedStage = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('stage');
export const STAGE = STAGES.find(stage => stage.id === selectedStage) ?? LEGACY_STAGE;
export const MAP = { width: STAGE.width, height: STAGE.height, tileMeters: STAGE.tileMeters };
export const FIXED = STAGE.fixtures;
export const WAREHOUSE = FIXED.find(item => item.id === 'outbound');
export const TYPES = ['cutter', 'assembly', 'packing'];
export const DIRECTIONS = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }];
export function createDefaultLayout() { return []; }
// Opening demonstration layout, also used as the initial editable layout and QA fixture.
export function createSuggestedLayout() { if (STAGE.startLayout) return structuredClone(STAGE.startLayout); return [{ id: 'm1', type: 'cutter', x: 2, y: 0, rotation: 0 }, { id: 'm2', type: 'assembly', x: 6, y: 1, rotation: 0 }, { id: 'm3', type: 'packing', x: 4, y: 4, rotation: 0 }]; }
export function createAssignments(layout, stage = STAGE) { return Object.fromEntries(stage.workers.map(worker => [worker.key, null])); }

export function suppliedEquipment(id, stage = STAGE) {
  if (typeof id !== 'string') return undefined;
  return stage.inventory.find(item => item.id === id || (stage.unlimitedEquipment && new RegExp(`^${item.id}-[1-9][0-9]*$`).test(id)));
}
