// The workshop stores the original operation number even when a preview skips steps.
// Existing playable-stage miniatures are reused for the corresponding workshop goods.
import {buildProduct} from './product-models.js';

const sharedGoods={
  glasses:['원형 렌즈','가공 렌즈','선글라스','검사한 선글라스','선글라스 케이스'],
  desk:['목재','상판','마감 상판','가공 상판','책상','검사한 책상','포장 책상'],
  slipper:['EVA 알갱이','성형 밑창','밑창 한 쌍','슬리퍼','검사한 슬리퍼','포장 슬리퍼'],
  speaker:['목재','재단 판재','스피커 패널','빈 캐비닛','도장 캐비닛','스피커','검사한 스피커','포장 스피커'],
  plush:['앞면 원단','앞감','자수 앞감','봉제 몸통','빈 몸통','충전 인형','봉제인형','검사한 인형','포장 인형'],
};

export function workshopProduct(factory,step,group,kit){
  if(sharedGoods[factory.key]){
    buildProduct(sharedGoods[factory.key][step],group,kit);
    return;
  }
  const op=factory.steps[step-1]?.type;
  const oak='#c49160', steel='#8d9ca4',dark='#32414c',mint='#549d90',paper='#f2ddb4',red='#bc5751';
  const box=(w,h,d,x,y,z,c)=>kit.box(group,w,h,d,x,y,z,c);
  const disk=(r,h,x,y,z,c)=>kit.cylinder(group,r,r,h,x,y,z,c);
  const ring=(r,t,x,y,z,c)=>kit.ring(group,r,t,x,y,z,c);
  const orb=(r,x,y,z,c,scale)=>kit.sphere(group,r,x,y,z,c,scale);
  // Keep the inspected or packaged product visible with its paperwork or cradle.
  if(op==='inspection'||op==='packing'){
    workshopProduct(factory,step-1,group,kit);
    if(op==='inspection'){
      box(.35,.06,.34,.40,.095,.30,paper);
      disk(.09,.025,.40,.135,.30,mint);
    }else{
      box(1.25,.09,1.06,0,.01,0,paper);
      for(const x of [-.58,.58])box(.09,.23,1.06,x,.12,0,oak);
      for(const z of [-.49,.49])box(1.13,.21,.08,0,.11,z,oak);
    }
    return;
  }
  switch(factory.key){
    case 'chair':
    case 'bookshelf':{
      const chair=factory.key==='chair';
      if(step<4){
        const count=step?3:1;
        for(let i=0;i<count;i++)box(step===0?1.17:.9,.09,step===0?.32:.51,i*.05,.05+i*.095,0,step===3?'#e0b786':oak);
        if(step===2)box(.83,.035,.06,.05,.30,.2,paper);
      }else if(chair){
        const color=step===4?oak:step===5?'#417c74':'#66a297';
        box(.69,.12,.59,0,.44,0,color);
        box(.69,.36,.10,0,.68,-.24,color);
        for(const x of [-.26,.26])for(const z of [-.22,.22])box(.09,.42,.09,x,.21,z,color);
      }else{
        for(const x of [-.46,.46])box(.09,.8,.45,x,.40,0,oak);
        for(const y of [.06,.4,.76])box(.93,.085,.45,0,y,0,oak);
      }
      break;
    }
    case 'bike':
    case 'scooter':{
      const bike=factory.key==='bike';
      if(step<2){
        for(const z of [-.13,.13])box(step?.72:1.12,.09,.09,0,.07,z,steel);
        if(step)box(.32,.10,.10,.27,.08,.28,steel);
        break;
      }
      const color=bike && step<4?steel:bike && step===4?red:mint;
      box(.78,.09,.15,0,.28,0,color);
      const stem=box(.085,.50,.09,.34,.45,0,color);stem.rotation.z=.15;
      if(bike){
        box(.08,.41,.09,-.17,.34,0,color).rotation.z=.48;
        if(step>=3)box(.58,.075,.09,.02,.47,0,color).rotation.z=-.23;
      }else box(.78,.075,.23,-.05,.22,0,mint);
      if(!bike||step>=6)box(.09,.07,.36,.30,.72,0,dark);
      if(step>=(bike?6:3))for(const x of [-.41,.41])ring(bike?.24:.15,.055,x,.22,0,dark);
      break;
    }
    case 'tv':
    case 'console':{
      const tv=factory.key==='tv';
      const closed=step>=(tv?3:4);
      box(1.10,.10,.64,0,.06,0,steel);
      if(step>=(tv?1:2))box(.53,.08,.35,-.14,.15,0,mint);
      if(step>=(tv?2:3))for(const x of [.17,.28])box(.055,.06,.44,x,.16,0,red);
      if(closed){
        box(1.09,.14,.67,0,.21,0,dark);
        if(tv){box(.97,.025,.54,0,.29,0,'#517d98');box(.42,.08,.20,0,.12,.39,steel);}
        else for(const x of [-.28,-.18,-.08])box(.035,.02,.4,x,.289,0,steel);
      }else if(!tv && step===1)for(const z of [-.29,.29])box(1.09,.15,.07,0,.13,z,dark);
      break;
    }
    case 'shoe':{
      if(!step){box(.92,.13,.53,0,.075,0,red);break;}
      for(const x of [-.24,.24]){
        orb(.38,x,.15,0,step===1?'#d78c7d':red,[.52,step<3?.32:.62,1.12]);
        if(step>=2)for(const z of [-.12,.03])box(.21,.035,.044,x,.15+(step>=3?.2:.10),z,paper);
        if(step>=4)box(.38,step===4?.12:.09,.76,x,.06,0,step===4?paper:dark);
      }break;
    }
    case 'fan':{
      if(!step){box(.57,.10,.44,0,.05,0,steel);disk(.17,.16,.38,.09,.13,dark);break;}
      box(.60,.12,.48,0,.06,0,mint);box(.10,.48,.10,0,.28,0,steel);
      if(step>=2)orb(.19,0,.53,0,dark,[1,1,1]);
      if(step>=3){
        ring(.37,.034,0,.53,.13,steel);
        for(let i=0;i<3;i++){
          const angle=i*Math.PI*2/3;
          orb(.18,.15*Math.sin(angle),.53+.15*Math.cos(angle),.13,mint,[.6,1,.28]).rotation.z=-angle;
        }
      }break;
    }
    case 'mug':
    case 'pot':{
      const mug=factory.key==='mug';
      const colors=mug?['#ad826b','#bd8974','#bd8974','#c8a590','#dfbba0','#559a96','#297c81']:
        ['#747b80','#a17e59','#575b60','#72767a','#90969b','#719eab','#467a8c','#467a8c'];
      const color=colors[step];
      if(!step){orb(.35,0,.23,0,color,[1,.68,.8]);break;}
      if(!mug && step===1){box(.93,.17,.78,0,.09,0,color);disk(.26,.04,0,.19,0,dark);break;}
      const r=mug?.28:.42,h=mug?.48:.34;
      disk(r,h,0,h/2,0,color);disk(r*.79,.014,0,h+.002,0,dark);
      if(mug||step>=7){
        ring(.14,.045,step===1?.55:r+.08,h*.60,0,color);
        if(!mug)ring(.14,.045,-r-.08,h*.60,0,color);
      }break;
    }
    case 'window':{
      const color=step<4?steel:paper;
      if(step<2){for(const z of [-.14,.14])box(step?.74:1.15,.10,.09,0,.06,z,color);break;}
      for(const z of [-.34,.34])box(.92,.11,.08,0,.06,z,color);
      for(const x of [-.43,.43])box(.08,.11,.65,x,.06,0,color);
      if(step>=3)box(.06,.12,.65,0,.07,0,steel);
      if(step>=5)for(const x of [-.21,.21])box(.34,.035,.59,x,.07,0,'#8ccbd2');
      break;
    }
    case 'pants':
    case 'shirt':{
      const shirt=factory.key==='shirt',cloth=shirt?'#75a6ba':'#465e86';
      if(!step){disk(.21,.81,0,.22,0,cloth).rotation.z=Math.PI/2;break;}
      if(shirt){
        box(.49,.10,.73,0,.06,0,cloth);
        if(step>=2)box(.26,.045,.15,0,.135,-.24,paper);
        if(step>=3)for(const x of [-.34,.34])box(.23,.09,.34,x,.07,-.15,cloth);
        if(step>=4)box(.055,.04,.58,0,.13,0,paper);
        if(step>=5)for(const z of [-.10,.06,.22])disk(.035,.024,0,.16,z,dark);
        if(step>=6)box(.43,.055,.11,0,.135,.32,cloth);
      }else{
        for(const x of [-.18,.18])box(.29,.09,.82,x,.06,0,cloth);
        if(step>=2)box(.17,.045,.21,.16,.13,-.19,'#7890b0');
        if(step>=3)box(.65,.10,.23,0,.11,-.24,cloth);
        if(step>=4)box(.66,.09,.10,0,.15,-.34,dark);
        if(step>=5)for(const x of [-.17,.17])box(.028,.025,.52,x,.12,.09,'#7890b0');
      }break;
    }
    case 'dumbbell':{
      const color=step?steel:'#665e57';
      box(.92,.12,.13,0,.24,0,steel);
      for(const x of [-.37,.37])disk(.23,.22,x,.24,0,color).rotation.z=Math.PI/2;
      break;
    }
    case 'model':{
      if(!step){for(let i=0;i<5;i++)orb(.11,(i%3-1)*.23,.12,Math.floor(i/3)*.23,red,[1,1,1]);break;}
      for(const z of [-.31,.31,0])box(.95,.045,.035,0,.07,z,steel);
      for(const x of [-.45,.45])box(.035,.045,.64,x,.07,0,steel);
      for(const x of [-.24,0,.24])box(.15,.12,.29,x,.10,0,red);
      if(step>=3)box(.36,.035,.45,.28,.20,.10,paper);
      break;
    }
    default:throw new Error('Unknown workshop product '+factory.key);
  }
}
