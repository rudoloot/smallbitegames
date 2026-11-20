const rideStartSpeed=160/3.6;
const songSpeedMultiplier=2;
const highlightSpeed=240/3.6;
// Each analyzed phrase gets a bend, a downhill grade and a rideable grind line.
// Integrating a smooth speed change gives both placement and playback the same timeline.
function makeSongCourse(track,taxiTrapVariant=false){
  if(track.courseAnalysis&&track.sections){
    if(track.finishTime>0&&track.finishTime<track.duration){
      const end=track.finishTime;
      track={...track,duration:end,sections:track.sections.filter(p=>p.start<end).map(p=>({...p,end:Math.min(p.end,end)}))};
    }
    return makeAnalyzedCourse(track,taxiTrapVariant);
  }
  if(track.score){
    const course=furnishCourse(makeScoredCourse(track),track);
    if(['downbeat-dive','skyline-ignition'].includes(track.id))addDownbeatFloor(course,track.score.bpm);
    return course;
  }
  const course={id:track.id,title:track.title,duration:track.duration,phrases:[],turns:[],hills:[],rails:[],traps:[]};
  // In the sample-song courses, drum-led arrangements favor lateral obstacles.
  // Carry the fractional share between accents so short phrases also contribute.
  const drumShare=track.sections.reduce((sum,p)=>sum+(p.end-p.start)*p.drumRatio,0)/track.duration;
  let dodgeCredit=0;
  let startZ=0,speed=rideStartSpeed,previousSide=1;
  for(const section of track.sections){
    const start=section.start,end=Math.min(section.end,track.duration),seconds=end-start;
    if(seconds<=0)continue;
    const cues=track.cues.filter(t=>t>=start&&t<end);
    const density=cues.length/seconds;
    const nextSpeed=songSpeedMultiplier*Math.min(31,21+2*density+(section.mode==='drums'?3:0));
    const acceleration=(nextSpeed-speed)/seconds;
    const at=time=>{
      const dt=time-start;
      return startZ+speed*dt+.5*acceleration*dt*dt;
    };
    const endZ=at(end);
    course.phrases.push({start,end,startZ,endZ,speed,acceleration});
    const side=Math.abs(section.build)<.25?-previousSide:section.build>0?1:-1;
    const beat=Math.max(.25,Math.min(1,section.beat||.5));
    const railX=side*(section.mode==='melody'?2.4:3.4);
    const drums=section.mode==='drums';
    const railStart=2*Math.ceil(at(start+seconds*(drums?.48:.16))/2);
    const railEnd=2*Math.floor(at(start+seconds*(drums?.84:.93))/2);
    if(railEnd-railStart>=24){
      course.rails.push({a:railStart,b:railEnd,x:railX});
      const angle=Math.min(75,13+density*9+Math.abs(section.build)*4);
      if(drums){
        const apex=at(start+seconds*.46);
        course.turns.push([startZ,apex,side*angle*.65],[apex,endZ,-side*angle]);
      }else course.turns.push([railStart,railEnd,-side*angle]);
      course.hills.push([startZ,endZ,.055+.18*section.drumRatio+.07*Math.min(3,density)]);
      previousSide=side;
    }
    // Put a low jump obstacle on the opposite side, never across the note line.
    const accents=cues.filter(t=>t>=start+Math.max(2,beat*4)&&t<end-.8);
    for(let i=0;i<accents.length;i++){
      const t=accents[i];
      if(t<3||t>track.duration-2)continue;
      const z=2*Math.round(at(t)/2),last=course.traps.at(-1);
      if(last&&z-last.z<Math.max(55,speed*beat*6))continue;
      const x=-side*(2.1+(i%3)*.55);
      dodgeCredit+=Math.max(.15,Math.min(.85,.12+.60*drumShare+.25*section.drumRatio));
      const dodge=dodgeCredit>=1;
      if(dodge)dodgeCredit--;
      course.traps.push({kind:dodge?'block':'jump',z,length:1.2,left:x-1.25,right:x+1.25});
    }
    startZ=endZ;speed=nextSpeed;
  }
  course.finish=startZ;
  return furnishCourse(course,track);
}

function furnishCourse(course,track){
  course.ramps=[];course.street=[];
  let last=-Infinity;
  // Replace existing obstacle beats, keeping the melodic line open on the other side.
  course.traps=course.traps.filter(trap=>{
    if(trap.z<48 || trap.z-last<88 || trap.z>course.finish-55)return true;
    const {time}=songPosition(course,trap.z);
    const section=track.sections?.find(p=>time>=p.start&&time<p.end);
    const drum=section?section.mode==='drums':trap.kind==='block';
    const x=trap.left+trap.right>0?3.5:-3.5;
    const bus=course.ramps.length>0 && (drum?course.street.length<=course.ramps.length:course.street.length*3<course.ramps.length);
    const a=trap.z,b=a+(bus?10:12);
    if(course.gap && a<course.gap.b+30&&b+38>course.gap.a)return true;
    if(course.rails.some(r=>r.a<b+32&&r.b>a-4&&Math.abs(r.x-x)<2.4))return true;
    if(bus)course.street.push({a,b,x});
    else course.ramps.push({a,b,x,width:3,h:drum?1.35:.95});
    last=a;return false;
  });
  return course;
}

function makeScoredCourse(track){
  const {score}=track,beatSeconds=60/score.bpm;
  const course={id:track.id,title:track.title,duration:track.duration,phrases:[],turns:[],hills:[],rails:[],traps:[],grades:[]};
  let start=0,startZ=0,speed=rideStartSpeed;
  for(const [endBeat,angle] of score.grades.slice(1)){
    const end=endBeat*beatSeconds,nextSpeed=songSpeedMultiplier*(22+angle*.32);
    const acceleration=(nextSpeed-speed)/(end-start);
    const endZ=startZ+(speed+nextSpeed)*.5*(end-start);
    course.phrases.push({start,end,startZ,endZ,speed,acceleration});
    start=end;startZ=endZ;speed=nextSpeed;
  }
  course.finish=startZ;
  function at(beat){
    const time=beat*beatSeconds;
    const p=course.phrases.find(p=>time<=p.end)||course.phrases.at(-1);
    const dt=time-p.start;
    return p.startZ+p.speed*dt+.5*p.acceleration*dt*dt;
  }
  const snap=beat=>2*Math.round(at(beat)/2);
  course.grades=score.grades.map(([beat,angle])=>[at(beat),Math.tan(angle*Math.PI/180)]);
  const landing=score.landingBeat;
  course.gap={a:snap(landing-1.6),b:snap(landing-.65),restart:snap(landing-10)};
  for(const [beat,,length] of score.rails){
    const melody=score.lead.filter(n=>n[0]>=beat&&n[0]<beat+8);
    const delta=melody.at(-1)[1]-melody[0][1];
    const bend=Math.sign(delta)*Math.min(55,Math.abs(delta)*5);
    const x=bend>0?-2.6:2.6;
    const a=snap(beat===landing?beat-.5:beat-1.4),b=snap(beat+length+.35);
    course.rails.push({a,b,x});
    if(bend)course.turns.push([snap(beat),snap(beat+8),bend]);
  }
  for(const [beat,kind] of score.accents){
    if(beat<8||Math.abs(beat-landing)<8||beat>214)continue;
    const z=snap(beat);
    const rail=course.rails.find(r=>r.b>z-12&&r.a<z+45);
    const side=rail?-Math.sign(rail.x):(kind==='kick'?1:-1);
    const x=side*3.4,half=kind==='kick'?1.3:.75;
    course.traps.push({kind:kind==='kick'?'jump':'block',z,length:1.2,left:x-half,right:x+half});
  }
  return course;
}

function songPosition(course,z){
  const phrase=course.phrases.find(p=>z<p.endZ)||course.phrases.at(-1);
  const distance=Math.max(0,Math.min(z,phrase.endZ)-phrase.startZ);
  const speed=Math.sqrt(phrase.speed**2+2*phrase.acceleration*distance);
  return {speed,time:phrase.start+2*distance/(speed+phrase.speed)};
}

// Each digit in a row is one 1.5 m lane, read left to right.
function addDownbeatFloor(course,bpm){
  const full='1111111';
  const patterns=[
    [[12,'1111100'],[16,'1100000'],[22,full]],
    [[30,'0011111'],[34,'0000011'],[42,full]],
    [[49,'0011100'],[55,'0001000'],[62,full]],
    [[70,'1100000'],[75,'1111000'],[79,'0011100'],[83,'0001111'],[87,'0000011'],[92,full]],
    [[100,'0011100'],[104,'0000000'],[105,'0011000'],[110,'0000000'],[111,'0001100'],[116,full]],
    [[120,'0000011'],[124,'0001111'],[127,'0011100'],[131,'1111000'],[135,'1100000'],[147,full]],
    [[162,'0011100'],[166,'0000000'],[167,'0001100'],[173,'0000000'],[174,'0001111'],[178,full]],
    [[183,'1111000'],[186,'1100000'],[188,'0000000'],[189,'1111000'],[193,'0000000'],[194,'0001100'],[198,'0000000'],[199,'0001111'],[212,full]]
  ];
  function station(beat){
    const time=beat*60/bpm;
    const p=course.phrases.find(p=>time<=p.end)||course.phrases.at(-1),dt=time-p.start;
    return 2*Math.round((p.startZ+p.speed*dt+.5*p.acceleration*dt*dt)/2);
  }
  course.floor=[];
  const zones=[];
  // Reserve a bar on either side of the start of each grade change.
  const buffer=4*60/bpm;
  const gradeStarts=course.grades.filter((key,i,keys)=>keys[i+1]&&keys[i+1][1]!==key[1])
    .map(([z])=>songPosition(course,z).time);
  for(const pattern of patterns){
    const safe=pattern.every(([beat,row],i)=>{
      const previous=i?pattern[i-1][1]:full;
      if(![...row].some((lane,j)=>lane==='0'&&previous[j]==='1'))return true;
      const from=songPosition(course,station(beat)).time;
      const until=row==='0000000'?songPosition(course,station(pattern[i+1][0])).time:from;
      return gradeStarts.every(t=>until<t-buffer||from>t+buffer);
    });
    if(!safe)continue;
    const restart=station(pattern[0][0]-4);
    zones.push([restart,station(pattern.at(-1)[0])+12]);
    for(let i=0;i<pattern.length-1;i++){
      const [beat,row]=pattern[i];
      course.floor.push({a:station(beat),b:station(pattern[i+1][0]),row,restart});
    }
  }
  const clear=(a,b)=>zones.every(([left,right])=>b<=left||a>=right);
  // Keep corner drift below a lane width during a jump.
  for(const turn of course.turns){
    if(course.floor.some(p=>p.row==='0000000'&&turn[0]<p.b+25&&turn[1]>p.a-15))turn[2]*=.15;
  }
  course.ramps=course.ramps.filter(k=>clear(k.a,k.b+24));
  course.street=course.street.filter(k=>clear(k.a,k.b));
  course.rails=course.rails.filter(r=>clear(r.a,r.b));
  course.traps=course.traps.filter(t=>clear(t.z,t.z+t.length));
  // Set pieces occupy the full-width passages between floor challenges.
  for(const [beat,kind,left,right] of [[6,'horizontal',-5,-.3],[44,'vertical',1.95,2.35],[152,'diagonal',-4.8,.3],[217,'horizontal',.3,5]]){
    const angle=kind==='horizontal'?0:kind==='vertical'?Math.PI/2:Math.PI/4;
    const dx=10.5*Math.cos(angle),dy=10.5*Math.sin(angle),x=kind==='vertical'?2.25:-dx/2;
    course.traps.push({kind,beam:true,z:station(beat),length:.18,left:x-.09,right:x+dx+.09,beamStart:[x,.78],beamEnd:[x+dx,.78+dy]});
  }
  for(const [beat,x,spring] of [[24,3.5,false],[150,3.5,true]]){
    const a=station(beat);
    course.ramps.push({a,b:a+12,x,width:3,h:spring?1.4:.95,spring});
  }
  for(const [begin,end,x] of [[63,68,-2.5],[94,98,2.5],[213,221,-2.5]]){
    course.rails.push({a:station(begin),b:station(end),x});
  }
  const busStart=station(148);
  course.street.push({a:busStart,b:busStart+10,x:-3.4});
  delete course.gap; // The second island sequence now owns the original break.
}

function floorSlice(course,z){
  return course?.floor?.find(part=>z>=part.a&&z<part.b);
}

function makeAnalyzedCourse(track,taxiTrapVariant=false){
  const course={id:track.id,title:track.title,duration:track.duration,phrases:[],grades:[],turns:[],hills:[],rails:[],traps:[],ramps:[],street:[],bonuses:[],floor:[]};
  let z=0,speed=track.sections[0].highlight?highlightSpeed:rideStartSpeed;
  function addSpeedSpan(start,end,nextSpeed){
    const seconds=end-start;
    if(seconds<=0)return;
    const acceleration=(nextSpeed-speed)/seconds,endZ=z+(speed+nextSpeed)*seconds/2;
    course.phrases.push({start,end,startZ:z,endZ,speed,acceleration});
    z=endZ;speed=nextSpeed;
  }
  track.sections.forEach((section,i)=>{
    const {start,end}=section;
    const target=section.highlight?highlightSpeed:songSpeedMultiplier*(23+section.energy*5);
    if(!section.highlight&&track.sections[i+1]?.highlight){
      const buildup=Math.max(start,end-4*section.beat);
      addSpeedSpan(start,buildup,target);
      addSpeedSpan(buildup,end,highlightSpeed);
    }else addSpeedSpan(start,end,target);
  });
  course.finish=z;
  const at=time=>{
    const p=course.phrases.find(p=>time<=p.end)||course.phrases.at(-1),dt=time-p.start;
    return p.startZ+p.speed*dt+.5*p.acceleration*dt*dt;
  };
  const snap=time=>2*Math.round(at(time)/2);
  const angle=s=>s.highlight?30:7+s.energy*9;
  let lastAngle=angle(track.sections[0]),lastTrap=-Infinity;
  course.grades.push([0,Math.tan(lastAngle*Math.PI/180)]);
  const gradeChanges=[];
  track.sections.forEach((section,index)=>{
    const {start,end,beat,contour}=section,seconds=end-start,target=angle(section);
    if(index&&Math.abs(target-lastAngle)>.1){
      const change=Math.max(track.sections[index-1].start+.1,start-Math.min(1.2,beat*2));
      course.grades.push([at(change),Math.tan(lastAngle*Math.PI/180)],[at(start),Math.tan(target*Math.PI/180)]);
      gradeChanges.push(change);lastAngle=target;
    }
    const delta=contour.at(-1)-contour[0],side=delta>0?-1:1;
    const bend=Math.max(-38,Math.min(38,delta*3));
    if(Math.abs(bend)>3)course.turns.push([snap(start+.5),snap(end-.5),bend]);
    // Leave approach and exit time around every phrase and grade transition.
    if(seconds>5&&start>4){
      const a=snap(start+2),b=snap(end-2);
      const row=section.highlight?(side<0?'1110000':'0000111'):'0011100';
      course.floor.push({a,b,row,restart:snap(start)});
      if(!section.highlight&&index%3===1){
        course.rails.push({a,b,x:0});
      }
    }
    const hits=(track.attacks||[]).filter(c=>c.time>=start+1&&c.time<end-1&&['kick','snare'].includes(c.kind));
    const trapInterval=Math.max(1.25,2.6-hits.length/seconds*.35-section.energy*.35);
    for(const hit of hits){
      if(hit.time-lastTrap<trapInterval)continue;
      const station=snap(hit.time),row=floorSlice(course,station)?.row??'1111111';
      const occupied=[...row].flatMap((v,i)=>v==='1'?[i]:[]);
      const lane=occupied[side<0?0:occupied.length-1],x=(lane-3)*1.5;
      if(course.rails.some(r=>station>=r.a-6&&station<=r.b+6&&Math.abs(r.x-x)<1))continue;
      const kind=hit.kind==='kick'?'block':['horizontal','vertical','diagonal'][index%3];
      if(kind==='block')course.traps.push({kind,z:station,length:1.2,left:x-.55,right:x+.55});
      else{
        const theta=kind==='horizontal'?0:kind==='vertical'?Math.PI/2:Math.PI/4;
        const dx=10.5*Math.cos(theta)*side,dy=10.5*Math.sin(theta);
        const origin=kind==='horizontal'?-side*5.25:x;
        // Rise outward from the occupied edge, keeping a passable lane.
        course.traps.push({kind,beam:true,z:station,length:.18,left:Math.min(origin,origin+dx)-.09,right:Math.max(origin,origin+dx)+.09,beamStart:[origin,.78],beamEnd:[origin+dx,.78+dy]});
      }
      lastTrap=hit.time;
    }
  });
  course.grades.push([course.finish,Math.tan(lastAngle*Math.PI/180)]);
  // Put short jump gaps inside sustained phrases, away from grade-change starts.
  for(let i=2;i<track.sections.length-1;i+=3){
    const section=track.sections[i],time=section.start+(section.end-section.start)*.48;
    const a=snap(time),b=a+14;
    if(gradeChanges.some(t=>Math.abs(time-t)<2.5))continue;
    const part=course.floor.find(p=>a>p.a+18&&b<p.b-24);
    if(!part)continue;
    course.floor.splice(course.floor.indexOf(part),1,{...part,b:a},{...part,a,b,row:'0000000'},{...part,a:b});
    course.traps=course.traps.filter(t=>t.z<a-25||t.z>b+30);
    course.rails=course.rails.filter(r=>r.b<a-20||r.a>b+20);
    for(const turn of course.turns)if(turn[0]<b+25&&turn[1]>a-15)turn[2]*=.15;
  }
  course.floor.sort((a,b)=>a.a-b.a);
  addMusicalAirRoutes(course,track,snap);
  course.taxiTraps=track.id==='midnight-taxi'&&taxiTrapVariant;
  buildTrackBlocks(course,track);
  return course;
}

function addMusicalAirRoutes(course,track,snap){
  const features=track.sections.map(section=>{
    const melody=track.attacks.filter(c=>c.kind==='melody'&&c.time>=section.start&&c.time<section.end);
    return {section,melody,activity:melody.length/(section.end-section.start)};
  });
  const median=features.map(f=>f.activity).sort((a,b)=>a-b)[Math.floor(features.length/2)];
  for(const {section,melody,activity} of features){
    if(section.start<4||activity<median||section.energy<.35)continue;
    const cue=melody.find(c=>c.time>=section.start+.35&&c.time<section.start+1.1);
    if(!cue)continue;
    const a=snap(cue.time),b=a+12;
    const row=floorSlice(course,b+45)?.row??'1111111';
    if(row==='0000000'||course.floor.some(p=>p.row==='0000000'&&p.a<b+90&&p.b>a))continue;
    const lanes=[...row].flatMap((v,i)=>v==='1'?[i]:[]);
    const rising=section.contour.at(-1)>=section.contour[0];
    const x=(lanes[rising?lanes.length-1:0]-3)*1.5;
    const height=section.highlight?3:2.4;
    const speed=songPosition(course,b).speed;
    const ramp={a,b,x,width:1.5,h:1.25,spring:true,sourceTime:cue.time};
    // Predict descent to the rail from the same take-off equation used in play.
    const slope=3*ramp.h/12,forward=speed/Math.hypot(1,slope),vy=forward*slope+3;
    const discriminant=vy*vy-28*(height-ramp.h);
    if(discriminant<=0)continue;
    const flight=(vy+Math.sqrt(discriminant))/14;
    const land=2*Math.round((b+speed*flight)/2);
    const end=Math.min(snap(section.end-.55),land+Math.max(30,speed*section.beat*3));
    if(end<land+24||!lanes.length)continue;
    course.ramps.push(ramp);
    course.rails=course.rails.filter(r=>r.b<a||r.a>end);
    course.rails.push({a:land-12,b:end,x,h:height});
    // The bonus follows a measured melodic attack while the rider is above ground.
    const note=melody.find(c=>snap(c.time)>land+5&&snap(c.time)<end-5);
    const z=note?snap(note.time):2*Math.round((land+end)/4);
    if(note)course.bonuses.push({z,x,h:height,points:500,sourceTime:note.time});
    course.traps=course.traps.filter(t=>t.z<a-10||t.z>end+15||
      !t.beam&& (t.right<x-1.2||t.left>x+1.2)||
      t.kind==='block'&&t.z>land);
    for(const turn of course.turns)if(turn[0]<end&&turn[1]>a)turn[2]*=.15;
  }
}
