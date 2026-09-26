(function(root){
  'use strict';
  const make = (name,category,cost,hp,power,extra={})=>({name,category,cost,hp,power,...extra});
  const buildings = {
    gun: make('기관포탑','combat',[100,200,300],[500,750,1000],[0,0,0],{damage:[5,7.5,10],interval:1,range:2,color:'#d2b98d',desc:'전력 없이 작동하는 기본 방어 포탑.',icon:'gun'}),
    laser: make('레이저포탑','combat',[100,200,300],[500,750,1000],[5,6,7],{damage:[2,3.25,4.5],interval:.2,range:2,research:100,color:'#6be9dd',desc:'빠른 연속 광선으로 단일 표적을 제압.',icon:'laser'}),
    mortar: make('박격포포탑','combat',[100,200,300],[500,750,1000],[5,6,7],{damage:[10,15,20],interval:3,range:5,splash:1.5,research:100,color:'#f1b95e',desc:'50m 사거리 · 반경 15m 광역 포격.',icon:'mortar'}),
    flame: make('화염포탑','combat',[100,200,300],[500,750,1000],[5,6,7],{damage:[0.5,0.75,1],interval:.2,range:1,cone:true,research:100,color:'#ff8358',desc:'30° 화염 분사 · 5초간 지속 화상.',icon:'flame'}),
    sniper: make('저격포탑','combat',[100,200,300],[500,750,1000],[5,6,7],{damage:[15,22.5,30],interval:2,range:5,research:100,color:'#b2cecc',desc:'50m 장거리 정밀 사격.',icon:'sniper'}),
    frost: make('냉각포탑','combat',[100,200,300],[500,750,1000],[5,6,7],{damage:[1,1,1],interval:.2,range:1,cone:true,research:100,color:'#93cfff',desc:'30° 냉각 분사 · 5초 감속 (30/40/50%).',icon:'frost'}),
    mine: make('채굴기','industry',[100,200,300],[500,750,1000],[2,2,2],{rate:[2.5,3.75,5],color:'#c6ac76',desc:'광맥 위 설치 · LV2부터 지하 자원 채굴.',icon:'mine'}),
    solar: make('태양광 발전기','industry',[100],[500],[0],{supply:30,color:'#82bfd0',desc:'전력 30 공급 · 전달 반경 20m.',icon:'solar'}),
    reactor: make('원자력 발전기','industry',[300],[1000],[0],{supply:60,research:200,color:'#bded91',desc:'우라늄 10/s 소비 · 전력 60 공급.',icon:'reactor'}),
    relay: make('송신기','industry',[25,50],[250,500],[0,0],{color:'#decb95',desc:'전력망 연결 · 전달 반경 20/30m.',icon:'relay'}),
    lab: make('연구소','industry',[100,200,300],[500,750,1000],[5,6,7],{rate:[1,1.5,2],color:'#96bfff',desc:'연구 점수 1/1.5/2초당 생산.',icon:'lab'}),
    scanner: make('지하 탐지기','industry',[100],[500],[2],{research:100,color:'#72dcb8',desc:'전력 공급 시 맵 전체의 지하 광맥 발견.',icon:'scanner'}),
    storage: make('창고','industry',[100,300],[500,1000],[0,0],{color:'#beaa8a',desc:'자원별 보유 한도 +2,000 / +5,000.',icon:'storage'}),
    spike: make('가시함정','defense',[100,200],[500,1000],[0,0],{damage:[2.5,5],interval:.5,range:.55,research:100,trap:true,color:'#d7bda5',desc:'이동을 막지 않는 접촉 피해 함정.',icon:'spike'}),
    shock: make('전기함정','defense',[100,200],[500,1000],[3,3],{damage:[2.5,5],interval:.5,range:.55,research:100,trap:true,color:'#baabff',desc:'접촉 피해 · 10/20% 확률로 1초 스턴.',icon:'shock'}),
    shield: make('방어막','defense',[100,200],[500,1000],[3,3],{research:100,color:'#8fcfe5',desc:'20m 내 유성 방어 · LV2는 산성비도 방어.',icon:'shield'}),
    market: make('마켓','support',[200],[1000],[2],{research:100,color:'#d9bf7a',desc:'결정으로 자원과 아티펙트 거래.',icon:'market'})
  };
  const names=['야생동물','중간 보스 · 야생동물','일꾼 I','일꾼 II','일꾼 III','중간 보스 · 일꾼','야생동물 I','야생동물 II','중간 보스 · 야생동물','정찰부대 I','정찰부대 II','정찰부대 III','중간 보스 · 정찰부대','노예부대 I','노예부대 II','노예부대 III','노예부대 IV','보스 · 노예부대','본부대 I','본부대 II','본부대 III','본부대 IV','본부대 V','보스 · 본부대','정예부대 I','정예부대 II','정예부대 III','정예부대 IV','정예부대 V','최종 보스 · 여왕'];
  const health=[30,300,32,34,36,350,38,40,400,42,44,46,450,48,50,52,54,550,56,58,60,62,64,650,66,68,70,72,74,1000];
  const attack=[15,150,16,17,18,160,19,20,200,21,22,23,225,24,25,26,27,275,28,29,30,31,32,325,33,34,35,36,37,500];
  const bosses=[2,6,9,13,18,24,30], small=[10,16,22,25], large=[9,13,18,24,29,30];
  const features=['spines','tusks','jaw','claws','sacs','abdomen','claws','spines','claws','antenna','jumper','wings','wings','tail','frill','core','tail','core','claws','horn','sacs','spinner','segments','stinger','jaw','armor','claws','jaw','stinger','queen'];
  const waves=names.map((name,i)=>({name,feature:features[i],hp:health[i],damage:attack[i],reward:attack[i]/2,speed:.5,interval:.5,spawnInterval:large.includes(i+1)?4:2,size:large.includes(i+1)?'large':small.includes(i+1)?'small':'medium',boss:bosses.includes(i+1),count:bosses.includes(i+1)?1:20}));
  const artifacts=[
    {id:'ammo',name:'탄약상자',desc:'아군 공격력 +5%',price:300,tier:'일반',symbol:'▥'},
    {id:'fan',name:'냉각팬',desc:'아군 공격속도 +5%',price:300,tier:'일반',symbol:'✣'},
    {id:'battery',name:'예비전력',desc:'전력 소비량 −5%',price:300,tier:'일반',symbol:'ϟ'},
    {id:'bolt',name:'강화볼트',desc:'건물 최대 HP +25%',price:300,tier:'일반',symbol:'⬡'},
    {id:'lens',name:'고성능렌즈',desc:'무기 사거리 +10%',price:600,tier:'레어',symbol:'◎'},
    {id:'blueprint',name:'설계도',desc:'무기 업그레이드 철 비용 −5%',price:600,tier:'레어',symbol:'▧'},
    {id:'repair',name:'수리키트',desc:'웨이브 시작 시 최대 HP의 10% 회복',price:600,tier:'레어',symbol:'✚'},
    {id:'bank',name:'통장',desc:'웨이브 시작 시 철·우라늄·결정 +5%',price:1000,tier:'희귀',symbol:'▤'},
    {id:'magnet',name:'자석',desc:'적 처치 결정 보상 +10%',price:1000,tier:'희귀',symbol:'∩'},
    {id:'insurance',name:'보험증서',desc:'철거 환급률 70% → 90% (HP 비례)',price:1000,tier:'희귀',symbol:'◈'}
  ];
  const data={buildings,waves,artifacts,COLS:7,ROWS:12,WAVE_INTERVAL:120,VERSION:1};
  root.XTD=data;
  if(typeof module!=='undefined') module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
