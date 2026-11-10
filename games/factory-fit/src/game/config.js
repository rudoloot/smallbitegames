// SAMPLE 01: 밸런스 검증을 위한 시험값. 부지·입고장은 저장 데이터로 변경할 수 없다.
export const MAP = Object.freeze({ width: 16, height: 12, tileMeters: 0.5 });
export const STAGE = Object.freeze({ id: 'woodworks-01', name: '느릿느릿 나무상자 공장', budget: 400, duration: 60, goal: 9, maxMachines: 10 });
export const FIXED = Object.freeze([
  Object.freeze({ id: 'inbound', label: '목재 입고장', x: 0, y: 1, width: 2, height: 3, access: Object.freeze({ x: 2, y: 2 }), color: '#b98950' }),
  Object.freeze({ id: 'outbound', label: '완제품 창고', x: 0, y: 8, width: 2, height: 3, access: Object.freeze({ x: 2, y: 9 }), color: '#579087' }),
  Object.freeze({ id: 'toilet', label: '화장실', x: 14, y: 4, width: 2, height: 2, access: Object.freeze({ x: 14, y: 6 }), color: '#a6c5ba' }),
]);
export const PORTS = FIXED.slice(0, 2);
export const WAREHOUSE = FIXED[1]; // 이전 저장과 호환하도록 내부 ID outbound 유지
export const TYPES = Object.freeze(['cutter', 'assembly', 'paint', 'packing']);
export const WORKERS = Object.freeze([
  Object.freeze({ key: 'w1', name: '민수', color: '#e7b348', trait: '꼼꼼한 작업', toilet: false }),
  Object.freeze({ key: 'w2', name: '지우', color: '#739dc8', trait: '화장실 단골', toilet: true }),
  Object.freeze({ key: 'w3', name: '수진', color: '#d99a8e', trait: '성실한 작업', toilet: false }),
  Object.freeze({ key: 'w4', name: '준호', color: '#93aa6e', trait: '꾸준한 작업', toilet: false }),
  Object.freeze({ key: 'w5', name: '다솔', color: '#b69dcc', trait: '창고 담당', toilet: false }),
]);
export function createAssignments(layout) { return Object.fromEntries(WORKERS.map((worker, i) => [worker.key, i === 4 ? WAREHOUSE.id : layout.find(item => item.type === TYPES[i])?.id ?? null])); }
export const EQUIPMENT = Object.freeze({
  cutter: Object.freeze({ name: '절단기', short: '절단', width: 3, height: 2, color: '#5c9d8c', price: 240, seconds: 1.4, output: '상자 부재' }),
  assembly: Object.freeze({ name: '조립대', short: '조립', width: 3, height: 3, color: '#c4914d', price: 320, seconds: 2.2, output: '나무상자' }),
  paint: Object.freeze({ name: '도색대', short: '도색', width: 2, height: 3, color: '#799fc8', price: 280, seconds: 3.2, output: '도색 상자' }),
  packing: Object.freeze({ name: '포장대', short: '포장', width: 2, height: 2, color: '#dbb55b', price: 180, seconds: 1.6, output: '완제품' }),
});
export function createDefaultLayout() {
  return [
    { id: 'm1', type: 'cutter', x: 3, y: 0, rotation: 0, paid: 240 },
    { id: 'm2', type: 'assembly', x: 10, y: 0, rotation: 0, paid: 320 },
    { id: 'm3', type: 'paint', x: 11, y: 7, rotation: 0, paid: 280 },
    { id: 'm4', type: 'packing', x: 3, y: 8, rotation: 0, paid: 180 },
  ];
}

// 실행 결과를 만들어 내지 않는다. 아래 배치도 동일한 엔진으로 시험한다.
export function createSuggestedLayout() {
  return createDefaultLayout().map(item => ({ ...item, ...({
    cutter: { x: 3, y: 1, rotation: 0 },
    assembly: { x: 7, y: 1, rotation: 0 },
    paint: { x: 7, y: 6, rotation: 2 },
    packing: { x: 3, y: 6, rotation: 2 },
  }[item.type]) }));
}
