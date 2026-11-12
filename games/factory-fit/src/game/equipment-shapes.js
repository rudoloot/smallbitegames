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
  cutter: { name: '절단기', color: '#43936c', seconds: 2.4 },
  machining: { name: '가공기', color: '#396ba9', seconds: 5.5 },
  grinder: { name: '연마기', color: '#a5ac43', seconds: 3.2 },
  injection: { name: '사출기', color: '#8462aa', seconds: 8 },
  press: { name: '성형프레스', color: '#537c88', seconds: 6 },
  joining: { name: '접합기', color: '#bc5c35', seconds: 4.5 },
  gluing: { name: '접착대', color: '#e6c261', seconds: 2.8 },
  painting: { name: '도장기', color: '#bc508a', seconds: 3.5 },
  heating: { name: '열처리기', color: '#b84a48', seconds: 10 },
  cutting: { name: '재단대', color: '#36aeb2', seconds: 3 },
  sewing: { name: '재봉기', color: '#d597b0', seconds: 5.5 },
  assembly: { name: '조립대', color: '#bd884f', seconds: 4.8 },
  electronics: { name: '전자조립대', color: '#515684', seconds: 6.5 },
  inspection: { name: '검사대', color: '#80be94', seconds: 2.5 },
  packing: { name: '포장대', color: '#ee923e', seconds: 2.2 },
  casting: { name: '주조기', color: '#774e49', seconds: 9 },
  filling: { name: '충전기', color: '#a99bd3', seconds: 3.8 },
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
