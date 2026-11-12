// W marks the operator, O the tray, and # the working surface.
const templates = {
  O: ['#O', '#W'], T: ['##O', '.W.'],
  S: ['.#O', 'W#.'], Z: ['O#.', '.#W'],
  J: ['W..', '##O'], L: ['..W', 'O##'],
};
function geometry(rows) {
  const y = rows.findIndex(row => row.includes('W'));
  const mask = rows.map(row => row.replace('W', '.'));
  if (/^\.+$/.test(mask.at(-1))) mask.pop();
  return { mask, workCell: [rows[y].indexOf('W'), y], width: rows[0].length, height: mask.length };
}
const normal = Object.fromEntries(Object.entries(templates).map(([key, rows]) => [key, geometry(rows)]));
function large(rows) {
  return { original: geometry(rows), mirror: geometry(rows.map(row => [...row].reverse().join(''))) };
}
const largeShapes = {
  injection: large(['####', '###O', '.W..']),
  casting: large(['####', 'O###', '..W.']),
};
export const EQUIPMENT_SHAPES = {
  cutter: { name: '절단기', color: '#07874e', seconds: 2.4 },
  machining: { name: '가공기', color: '#efa313', seconds: 5.5 },
  grinder: { name: '연마기', color: '#9cbd18', seconds: 3.2 },
  injection: { name: '사출기', color: '#8144b5', seconds: 8 },
  press: { name: '성형프레스', color: '#26334a', seconds: 6 },
  joining: { name: '접합기', color: '#9b491e', seconds: 4.5 },
  gluing: { name: '접착대', color: '#f2d639', seconds: 2.8 },
  painting: { name: '도장기', color: '#b62287', seconds: 3.5 },
  heating: { name: '열처리기', color: '#a31938', seconds: 10 },
  cutting: { name: '재단대', color: '#15bcca', seconds: 3 },
  sewing: { name: '재봉기', color: '#f082a5', seconds: 5.5 },
  assembly: { name: '조립대', color: '#2364cf', seconds: 4.8 },
  electronics: { name: '전자조립대', color: '#53509b', seconds: 6.5 },
  inspection: { name: '검사대', color: '#68d4ac', seconds: 2.5 },
  packing: { name: '포장대', color: '#ea5030', seconds: 2.2 },
  casting: { name: '주조기', color: '#5b372c', seconds: 9 },
  filling: { name: '충전기', color: '#bba1e6', seconds: 3.8 },
};
for (const [type, spec] of Object.entries(EQUIPMENT_SHAPES)) {
  spec.variants = largeShapes[type] ?? normal;
  spec.defaultVariant = largeShapes[type] ? 'original' : 'O';
  Object.assign(spec, spec.variants[spec.defaultVariant]);
}
export function shapeFor(item) {
  const spec = EQUIPMENT_SHAPES[item.type];
  return spec?.variants[item.variant ?? spec.defaultVariant];
}

export function processCell(spec,variant) {
  const cells=spec.mask.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='#'?[[x,y]]:[]));
  if(cells.length===2) return cells.find(([x,y])=>Math.abs(x-spec.workCell[0])+Math.abs(y-spec.workCell[1])===1) ?? cells[0];
  return variant==='mirror' ? [spec.width-1,0] : cells[0];
}
