// One bundle represents the inputs for a step. Repeated machine types have distinct step IDs.
const definitions = [
  ['box','나무상자','목재','cutter:목재 절단|assembly:상자 조립|packing:포장'],
  ['glasses','안경','렌즈·안경테','machining:렌즈 외곽 가공|assembly:렌즈 장착|inspection:피팅 검사|packing:포장'],
  ['chair','의자','목재','cutter:목재 절단|machining:부품 가공|grinder:샌딩|assembly:의자 조립|painting:표면 마감|heating:건조|inspection:검사|packing:포장'],
  ['desk','책상','판재·다리 부품','cutter:판재 절단|gluing:테두리 마감|machining:구멍 가공|assembly:책상 조립|inspection:검사|packing:포장'],
  ['bike','자전거','튜브·자전거 부품','cutter:튜브 절단|machining:접합부 가공|joining:프레임 접합|painting:도장|heating:건조|assembly:바퀴·구동계 조립|inspection:제동 검사|packing:포장'],
  ['scooter','킥보드','압출재·튜브·바퀴','machining:데크·튜브 가공|assembly:데크·핸들 조립|assembly:바퀴·브레이크 장착|inspection:접힘·주행 검사|packing:포장'],
  ['tv','TV','섀시·기판·패널','electronics:기판 장착|electronics:패널 배선|assembly:커버·스탠드 조립|inspection:화면·음향 검사|packing:포장'],
  ['shoe','운동화','원단·밑창','cutting:갑피 재단|sewing:갑피 봉제|press:형태 잡기|gluing:밑창 접착|press:밑창 압착|inspection:검사|packing:포장'],
  ['slipper','슬리퍼','수지·스트랩','injection:밑창 발포 성형|grinder:밑창 정리|assembly:스트랩 결합|inspection:짝 맞춤 검사|packing:포장'],
  ['fan','선풍기','받침·모터·날개','assembly:받침·몸체 조립|electronics:모터 배선|assembly:날개·안전망 장착|inspection:회전 검사|packing:포장'],
  ['mug','머그컵','점토·유약','press:몸체·손잡이 성형|gluing:손잡이 부착|heating:건조|heating:초벌|painting:시유|heating:재벌|inspection:검사|packing:포장'],
  ['window','창문','프로파일·유리·철물','cutter:프로파일 절단|machining:프레임 가공|assembly:보강재 삽입|joining:모서리 용착|assembly:유리·철물 조립|inspection:검사|packing:포장'],
  ['speaker','스피커','판재·유닛·회로','cutter:판재 절단|machining:구멍 가공|gluing:캐비닛 접합|painting:표면 마감|electronics:유닛·회로 배선|inspection:음향 검사|packing:포장'],
  ['bookshelf','책장','판재·철물','cutter:판재 절단|gluing:테두리 마감|machining:구멍·홈 가공|assembly:선반 조립|inspection:검사|packing:포장'],
  ['console','게임기','케이스·기판·냉각부','assembly:케이스 준비|electronics:기판·냉각부 장착|electronics:전원·배선 결합|assembly:케이스 조립|inspection:프로그램·기능 검사|packing:포장'],
  ['pants','바지','원단·지퍼·단추','cutting:원단 재단|sewing:주머니·지퍼 작업|sewing:몸판 봉제|sewing:허리·밑단 마감|press:다림질|inspection:검사|packing:포장'],
  ['plush','봉제인형','원단·솜','cutting:원단 재단|sewing:얼굴 자수|sewing:몸체 봉제|assembly:뒤집기|filling:솜 충전|sewing:봉합|inspection:검사|packing:포장'],
  ['shirt','셔츠','원단·심지·단추','cutting:원단 재단|gluing:심지 접착|sewing:칼라·소매 봉제|sewing:몸판 결합|sewing:단추 작업|press:다림질|packing:접기·포장'],
  ['dumbbell','아령','주철 소재·피복재','grinder:주철 연마|inspection:중량 확인|injection:고무 피복 성형|heating:경화|inspection:마감 검사|packing:포장'],
  ['pot','냄비','주물 재료·법랑','press:주형 준비|casting:주조|machining:탈사 정리|grinder:표면 연마|painting:법랑 도포|heating:소성|assembly:손잡이 조립|inspection:검사|packing:포장'],
  ['model','로봇 프라모델','성형 수지','injection:런너 사출|inspection:런너 검사|assembly:설명서·부품 구성|packing:상자 포장'],
];
export const FACTORIES = Object.fromEntries(definitions.map(([key,name,raw,route]) => [key, {
  key,name,raw,steps:route.split('|').map((entry,i)=>{
    const [type,label]=entry.split(':');
    return {id:'m'+(i+1),type,label};
  })
}]));

export function processConfig(key = 'box', selected) {
  if (!Object.hasOwn(FACTORIES,key)) throw new Error('제품을 확인해 주세요.');
  const factory=FACTORIES[key];
  if(selected!==undefined && !Array.isArray(selected)) throw new Error('공정 목록을 확인해 주세요.');
  const steps=selected===undefined ? factory.steps : factory.steps.filter(s=>selected.includes(s.id));
  if (!steps.length || (selected!==undefined && steps.length!==selected.length))
    throw new Error('사용할 공정을 하나 이상 선택하세요.');
  const inventory=steps.map(({id,type})=>({id,type}));
  if(key==='box' && steps.length===factory.steps.length) return {
    inventory,input:'timber',product:'finished',weights:{finished:5},
    itemNames:{timber:'목재',parts:'상자 부재',crate:'나무상자',finished:'포장된 나무상자'},
    processTitle:factory.name,processSummary:steps.map(s=>s.label).join(' → ')
  };
  const first=factory.steps.indexOf(steps[0]), lastStep=steps.at(-1);
  const input='raw', product='final', itemNames={
    raw:first===0 ? factory.raw : factory.steps[first-1].label+' 완료품',
    final:lastStep===factory.steps.at(-1) ? factory.name : lastStep.label+' 완료품'
  };
  const stepRecipes={};
  let previous=input;
  for (const [i,step] of steps.entries()) {
    const last=i===steps.length-1, output=last?product:'after-'+step.id;
    if(!last)itemNames[output]=step.label+' 완료품';
    stepRecipes[step.id]={operation:step.label,input:previous,output,inputStage:i===0?0:1,outputStage:last?4:1};
    previous=output;
  }
  return {inventory,input,product,itemNames,stepRecipes,weights:{final:5},processTitle:factory.name,
    processSummary:steps.map(s=>s.label).join(' → ')};
}
