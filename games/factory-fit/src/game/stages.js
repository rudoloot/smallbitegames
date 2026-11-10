import { STAGE_LAYOUTS } from './stage-layouts.js';
import { STAGE_FLOORS } from './stage-floors.js';
export function buildStages(base, floors = STAGE_FLOORS) {
  const specs = [
    ['작은 시작',8,5,'rectangle','meadow'], ['골목 공장',9,6,'corner','meadow'],
    ['중앙 기둥',10,8,'rectangle','meadow'], ['긴 작업장',12,8,'notch','meadow'],
    ['두 개의 마당',12,10,'courtyard','meadow'], ['눈 덮인 별관',14,10,'ell','snow'],
    ['얼어붙은 바닥',14,12,'rectangle','snow'], ['연결된 공장',16,14,'bridge','snow'],
    ['북쪽 날개',18,16,'tee','snow'], ['큰 설원 공장',20,20,'cross','snow'],
  ];
  return specs.map(([name,width,height,shape,region],index)=>{
    const id='sample-'+String(index+1).padStart(2,'0');
    const valid=(x,y)=>shape==='corner'?!(x>=width-3&&y<2):shape==='notch'?!(x>=width-3&&y>=3&&y<5):shape==='courtyard'?!(x>=4&&x<8&&y>=3&&y<6):shape==='ell'?!(x>=8&&y<4):shape==='bridge'?!(x>=6&&x<10&&(y<5||y>=9)):shape==='tee'?!(x>=10&&(y<4||y>=12)):shape==='cross'?!(x>=12&&(y<5||y>=15)):true;
    const cells=[];for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(valid(x,y) && (!floors[id] || floors[id][y][x] === '#'))cells.push(x+','+y);
    const pillars=index===2?[{x:5,y:4}]:index>=4?[{x:3,y:3},{x:Math.floor(width/2),y:height-3}].filter(c=>valid(c.x,c.y)):[];
    const holes=index===3?[{x:6,y:5}]:index>=6?[{x:4,y:6},{x:5,y:6},{x:width-3,y:height-3}].filter(c=>valid(c.x,c.y)):[];
    const authored=STAGE_LAYOUTS[id]??{};
    return {...base,id,name,number:index+1,width,height,shape,region,cells,holes,pillars,
      referenceLines: index < 3 ? 1 : index < 7 ? 2 : 3, referenceAssignments: authored.referenceAssignments,
      targetPerMinute:authored.target??3, startLayout:authored.startLayout, referenceLayout:authored.referenceLayout,
      fixtures:[{id:'inbound',label:'입고장',x:0,y:0,width:1,height:1,access:{x:1,y:0},color:'#b98950'},
        {id:'outbound',label:'출고장',x:0,y:height-1,width:1,height:1,access:{x:1,y:height-1},color:'#579087'}]};
  });
}
