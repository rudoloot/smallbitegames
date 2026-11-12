// Miniatures share proportions across the inlet pallet, hands, tray and warehouse.
export function buildProduct(name,group,{box,sphere,cylinder,ring}){
  const slab=(w,h,d,x,y,z,c)=>box(group,w,h,d,x,y,z,c);
  const ball=(r,x,y,z,c,scale)=>sphere(group,r,x,y,z,c,scale);
  const disc=(r,h,x,y,z,c)=>cylinder(group,r,r,h,x,y,z,c);
  const hoop=(r,t,x,y,z,c)=>{const m=ring(group,r,t,x,y,z,c);m.rotation.x=Math.PI/2;return m;};
  const oak='#cb9963',ink='#253847',teal='#377e87',pink='#ce8c97',cream='#f3dbaf';
  if(['앞바퀴','뒷바퀴','바퀴 한 쌍'].includes(name)){
    const pair=name==='바퀴 한 쌍';
    for(const x of pair?[-.24,.24]:[0]){
      hoop(pair?.17:.37,.055,x,.09,0,ink);slab(pair?.31:.67,.045,.045,x,.09,0,teal);
    }
  }else if(name==='복층유리'){
    for(const y of [.06,.14])slab(.92,.04,.63,0,y,0,'#9bd9dc');
  }else if(name==='손잡이·꼭지 세트'){
    hoop(.18,.055,-.18,.08,0,ink);ball(.12,.22,.12,0,ink,[1,1,1]);
  }else if(name.includes('키트')){
    slab(.80,.07,.55,0,.05,0,cream);
    for(const x of [-.21,.05,.25])slab(.10,.12,.31,x,.14,0,teal);
  }else if(name.includes('렌즈')){
    const round=name.includes('원형'),side=name.includes('왼쪽')?-1:1;
    const lens=ball(.43,0,.12,0,ink,[1,.26,round?1:.72]);lens.rotation.y=round?0:side*.33;
    slab(.23,.04,.06,side*.16,.23,-.09,'#96b8c2');
  }else if(name==='빈 테'||name.includes('선글라스')){
    if(name.includes('케이스')){
      slab(1.22,.22,.69,0,.11,0,'#bc8761');
      slab(1.18,.30,.07,0,.33,-.32,'#704f44').rotation.x=-.20;
    }
    const y=name.includes('케이스')?.25:.09;
    for(const x of [-.28,.28]){
      hoop(.22,.045,x,y,0,ink);
      if(name!=='빈 테')disc(.19,.05,x,y,0,teal);
      slab(.06,.07,name.includes('검사')?.23:.50,x*1.69,y,-.20,ink);
    }
    slab(.19,.065,.07,0,y,0,ink);
  }else if(name.includes('알갱이')){
    for(let i=0;i<9;i++)ball(.14,(i%3-1)*.25,.13,((i/3|0)-1)*.23,'#8fd4ba');
  }else if(/슬리퍼|밑창|스트랩/.test(name)){
    for(const x of [-.24,.24]){
      if(name==='성형 밑창')slab(.47,.06,.81,x,.06,0,'#92bbac');
      if(!name.includes('스트랩'))ball(.39,x,.1,0,teal,[.53,.28,1.22]);
      if(!name.includes('밑창')){const m=ring(group,.16,.065,x,.13,-.1,cream);m.scale.y=.83;}
      if(name==='검사한 슬리퍼'){
        disc(.095,.035,x,.215,.19,'#ffdb6c');
        disc(.04,.015,x,.24,.19,ink);
      }
    }
    if(name==='포장 슬리퍼'){
      slab(.97,.04,.31,0,.21,.20,cream);
      for(const x of [-.46,.46])slab(.04,.22,.31,x,.11,.20,cream);
      slab(.97,.035,.31,0,.016,.20,cream);
    }
  }else if(/상판|책상|목재|판재/.test(name)){
    if(name==='목재'){
      for(const z of [-.17,.17])slab(1.17,.19,.25,0,.10,z,oak);
    }else if(name.includes('다리'))slab(.15,.14,1.15,0,.07,0,oak);
    else{
      const desk=name.includes('책상');slab(1.18,.13,.68,0,desk?.54:.1,0,oak);
      if(desk)for(const x of [-.45,.45])for(const z of [-.23,.23])slab(.11,.52,.11,x,.26,z,'#785439');
      if(name==='마감 상판')for(const z of [-.32,.32])slab(1.18,.13,.055,0,.1,z,'#875f40');
      if(name.includes('가공'))for(const x of [-.44,.44])disc(.048,.025,x,.175,.2,ink);
      if(name==='검사한 책상'){
        slab(.67,.085,.17,0,.645,0,'#f7bd45');
        slab(.27,.025,.095,0,.695,0,teal);
        ball(.04,0,.706,0,cream,[1,.4,1]);
      }
      if(name==='포장 책상')for(const x of [-1,1])for(const z of [-1,1]){
        slab(.26,.055,.19,x*.48,.625,z*.26,cream);
        slab(.045,.18,.19,x*.59,.55,z*.26,cream);
      }
    }
  }else if(/캐비닛|패널|스피커|드라이버|기판/.test(name)){
    if(name.includes('기판')){
      slab(.86,.09,.62,0,.05,0,'#38876c');for(const x of [-.2,.18])slab(.19,.1,.25,x,.12,0,ink);
    }else{
      const flat=name==='드라이버'||name.includes('패널');
      if(name!=='드라이버')slab(.75,flat?.12:.54,.86,0,flat?.06:.27,0,name==='도장 캐비닛'?'#554840':'#916e50');
      disc(.29,.06,0,flat?.14:.56,0,ink);
      if(!/캐비닛|패널/.test(name))ball(.15,0,flat?.18:.6,0,'#71818b',[1,.5,1]);
      if(name==='검사한 스피커'){
        slab(.48,.035,.17,0,.555,.32,cream);
        for(const [i,d] of [.04,.11,.07,.13,.05].entries())slab(.035,.015,d,(i-2)*.065,.58,.32,teal);
      }
      if(name==='포장 스피커')for(const z of [-.41,.41]){
        slab(.85,.65,.14,0,.325,z,'#e9e4d7');
        slab(.85,.09,.24,0,.65,z*.9,'#e9e4d7');
      }
    }
  }else if(name.includes('원단')){
    slab(.87,.15,.60,0,.09,0,name.includes('앞')?pink:'#b78a9b');
    const roll=disc(.13,.84,0,.19,-.21,cream);roll.rotation.z=Math.PI/2;
  }else{
    const stuffing=name==='솜',full=name.includes('인형'),face=full||name.includes('자수')||name==='빈 몸통';
    const fabric=stuffing?'#fff3d9':name.includes('뒷')?'#ba8999':pink;
    ball(.32,0,.16,.1,fabric,[1,full||stuffing?.95:.25,1.13]);
    if(name==='빈 몸통'||name==='봉제 몸통')hoop(.13,.035,0,.21,.35,cream);
    if(!stuffing){
      ball(.3,0,.17,-.2,fabric,[1,full?.95:.26,1]);
      for(const sign of [-1,1]){
        ball(.12,sign*.22,.17,-.43,fabric);
        if(face)ball(.037,sign*.11,full?.445:.247,-.22,ink);
      }
    }
  }
  if(['충전 인형','봉제인형','검사한 인형','포장 인형'].includes(name)){
    for(const x of [-.29,.29])ball(.13,x,.21,.13,pink,[.8,.8,1.3]);
    if(name==='충전 인형')ball(.11,0,.22,.39,'#fff3d9');
    else for(const x of [-.08,0,.08])slab(.024,.035,.09,x,.30,.39,cream);
  }
  if(name==='검사한 인형')disc(.115,.035,.22,.32,.22,teal);
  if(name==='포장 인형'){
    slab(.85,.07,1.10,0,.035,0,cream);
    for(const x of [-.40,.40])slab(.055,.19,1.10,x,.12,0,cream);
    for(const z of [-.52,.52])slab(.8,.19,.055,0,.12,z,cream);
    slab(.13,.04,.99,0,.49,0,'#cc665b');
  }
}
