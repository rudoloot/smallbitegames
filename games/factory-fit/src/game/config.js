export const EQUIPMENT = Object.freeze({
  cutter: { name: '절단기', short: '절단', width: 3, height: 2, color: '#629b82', seconds: 1.4, input: 'timber', output: 'parts', inputStage: 0, outputStage: 1 },
  assembly: { name: '조립대', short: '조립', width: 3, height: 3, color: '#ca9659', seconds: 2.2, input: 'parts', output: 'crate', inputStage: 1, outputStage: 2 },
  packing: { name: '포장대', short: '포장', width: 2, height: 2, color: '#d1a05f', seconds: 1.6, input: 'crate', output: 'finished', inputStage: 2, outputStage: 4 },
  press: { name: '성형 작업대', short: '성형', width: 2, height: 1, color: '#8ba6bc', seconds: 1.8, input: 'timber', output: 'finished', inputStage: 0, outputStage: 4 },
  conveyor: { name: '컨베이어', short: '벨트', width: 1, height: 1, color: '#829b93', belt: true },
});
export const PRODUCTS = Object.freeze({ timber: '목재', parts: '상자 부재', crate: '나무상자', finished: '완제품' });
export const WORKERS = Object.freeze([
  { key: 'w1', name: '민수', color: '#e7b348', trait: '차분한 작업', strength: 1 },
  { key: 'w2', name: '지우', color: '#739dc8', trait: '꼼꼼한 작업', strength: 1 },
  { key: 'w3', name: '수진', color: '#d99a8e', trait: '성실한 작업', strength: 1 },
  { key: 'w4', name: '준호', color: '#93aa6e', trait: '꾸준한 작업', strength: 1 },
]);
export const STAGE = Object.freeze({
  id: 'first-workflow-01', name: '첫 번째 나무상자', number: 1,
  width: 10, height: 8, tileMeters: 0.5, holes: [],
  inventory: [{ id: 'm1', type: 'cutter' }, { id: 'm2', type: 'assembly' }, { id: 'm3', type: 'packing' }],
  workers: WORKERS, input: 'timber', product: 'finished', batch: 3, goal: 1,
  fixtures: [
    { id: 'inbound', label: '목재 입고', x: 0, y: 0, width: 1, height: 2, access: { x: 1, y: 1 }, color: '#b98950' },
    { id: 'outbound', label: '완제품 창고', x: 0, y: 6, width: 1, height: 2, access: { x: 1, y: 6 }, color: '#579087' },
  ],
  hint: '절단 → 조립 → 포장. 작업대 앞 한 칸을 비우고, 각 공정 담당자와 창고 직원을 배치하세요.',
});
export const STAGES = [STAGE];
export const MAP = { width: STAGE.width, height: STAGE.height, tileMeters: STAGE.tileMeters };
export const FIXED = STAGE.fixtures;
export const WAREHOUSE = FIXED.find(item => item.id === 'outbound');
export const TYPES = ['cutter', 'assembly', 'packing'];
export const DIRECTIONS = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }];
export function createDefaultLayout() { return []; }
// Authoring/QA solution. The game never applies it automatically.
export function createSuggestedLayout() { return [{ id: 'm1', type: 'cutter', x: 2, y: 0, rotation: 0 }, { id: 'm2', type: 'assembly', x: 6, y: 1, rotation: 0 }, { id: 'm3', type: 'packing', x: 3, y: 5, rotation: 0 }]; }
export function createAssignments(layout, stage = STAGE) { return Object.fromEntries(stage.workers.map(worker => [worker.key, null])); }
