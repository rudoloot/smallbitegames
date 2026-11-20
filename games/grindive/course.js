function sampleCoursePiece(entry,piece){
  const points=[], steps=piece.length;
  let last=entry;
  for(let i=1;i<=steps;i++){
    const t=(i-.5)/steps;
    const heading=(entry.yaw+piece.turn*t)*(Math.PI/180);
    const slope=(entry.pitch+piece.tilt*t)*(Math.PI/180);
    const point={
      x:last.x+Math.sin(heading)*Math.cos(slope), y:last.y+Math.sin(slope),
      z:last.z+Math.cos(heading)*Math.cos(slope),
      yaw:entry.yaw+piece.turn*i/steps,pitch:entry.pitch+piece.tilt*i/steps,
      width:(entry.width??12)+((piece.width??entry.width??12)-(entry.width??12))*i/steps
    };
    points.push(point);last=point;
  }
  return points;
}

function formatRideTime(seconds){
  const tenths=Math.floor(Math.max(0,seconds)*10+1e-8);
  const minutes=Math.floor(tenths/600);
  const wholeSeconds=String(Math.floor(tenths/10)%60).padStart(2,'0');
  return minutes+':'+wholeSeconds+'.'+tenths%10;
}

const rampAngles=[10,20,30,45];
const asphaltColor='#242629';
const rampWidth=3;
const laneOffsets=[-4.5,-1.5,1.5,4.5,-7.5];
const laneNames=laneOffsets.map(x=>(x<0?'왼쪽 ':'오른쪽 ')+Math.abs(x)+' m');
function laneAngles(saved){
  if(saved?.slots)return laneOffsets.map((_,i)=>rampAngles.includes(saved.slots[i])?saved.slots[i]:0);
  const old=Array.isArray(saved)?saved:[0,saved,0];
  const angles=[0,0,0,0,0];
  const used=[0,3,1,4,2].filter(i=>rampAngles.includes(old[i]));
  // Preserve lateral order and every angle when opening a legacy five-ramp row.
  if(used.length===5)return [old[3],old[1],old[4],old[2],old[0]];
  let previous=-1;
  used.forEach((id,i)=>{
    const preferred=[0,1,3,1,2][id];
    const lane=Math.min(4-used.length+i,Math.max(previous+1,preferred));
    angles[lane]=old[id];previous=lane;
  });
  return angles;
}
function rampSlots(length,entryWidth,exitWidth=entryWidth){
  const margin=(length-12)/(2*length);
  const narrow=Math.min(entryWidth,exitWidth)+Math.abs(entryWidth-exitWidth)*margin;
  return laneOffsets.map((x,lane)=>({lane,x,fits:2*Math.abs(x)+rampWidth<=narrow}));
}
function courseRamps(start,length,saved,entryWidth=12,exitWidth=entryWidth){
  const a=start+(length-12)/2,angles=laneAngles(saved);
  return rampSlots(length,entryWidth,exitWidth).filter(slot=>angles[slot.lane]).map(slot=>{
    const angle=angles[slot.lane];
    return {...slot,a,b:a+12,width:rampWidth,h:12*Math.tan(angle*Math.PI/180),angle};
  });
}
// Corners use lateral offset, course distance and vertical lift.
function rampFaces(ramp,m){
  const left=ramp.x-ramp.width/2,right=ramp.x+ramp.width/2;
  function cross(z){
    const h=ramp.h*(z-ramp.a)/12;
    return [[left,z,h],[right,z,h],[right,z,0],[left,z,0]];
  }
  const a=cross(m),b=cross(m+1);
  const faces=[
    {color:'#b48150',vertices:[a[0],a[1],b[1],b[0]]},
    {color:'#674c37',vertices:[a[3],a[0],b[0],b[3]]},
    {color:'#674c37',vertices:[a[1],a[2],b[2],b[1]]},
    {color:'#574435',vertices:[a[2],a[3],b[3],b[2]]}
  ];
  if((m-ramp.a)%3===1){
    const mark=(offset,t)=>[ramp.x+offset*ramp.width,m+t,ramp.h*(m+t-ramp.a)/12+.025];
    for(const side of [-1,1])faces.push({color:'#fff1bd',vertices:[
      mark(.36*side,.15),mark(0,.59),mark(0,.84),mark(.36*side,.4)]});
  }
  if(m+1===ramp.b)faces.push({color:'#76573e',vertices:b});
  return faces;
}

// Parked street bus used by the obstacle courses.
const busOffsets=[-1.5,1.5];
function courseBus(start,length,x){
  const a=start+(length-10)/2;
  return {a,b:a+10,x,l:x-1.2,r:x+1.2,h:3.5};
}
function busFaces(bus,m){
  const {a,b,l,r,h}=bus,n=m+1;
  const faces=[{color:'#a6d1c7',vertices:[[l,m,h],[r,m,h],[r,n,h],[l,n,h]]}];
  function side(x,low,high,color){
    faces.push({color,vertices:[[x,m,low],[x,n,low],[x,n,high],[x,m,high]]});
  }
  for(const x of [l,r]){
    side(x,0,1.5,'#316c79');
    side(x,1.5,2.95,(m-a)%2?'#a8ccd1':'#587f89');
    side(x,2.95,h,'#316c79');
  }
  for(const z of [a,b])if(z===m||z===n){
    for(const [lo,hi,color] of [[0,1.6,'#316c79'],[1.6,3.05,'#314955'],[3.05,h,'#316c79']])
      faces.push({color,vertices:[[l,z,lo],[r,z,lo],[r,z,hi],[l,z,hi]]});
  }
  return faces;
}

const railNames={center:'중앙',left:'왼쪽',right:'오른쪽'};
const grindRailHeight=.75;
function railSide(anchor,inset,width){
  if(anchor==='center')return 0;
  return (anchor==='left'?-1:1)*(width/2-inset);
}
// Both renderers use this metre of rail. Heights are relative to the local road.
function railFaces(anchor,inset,m,w0,w1){
  const a=railSide(anchor,inset,w0),b=railSide(anchor,inset,w1);
  const h=grindRailHeight,r=.085;
  const faces=[
    {color:'#dce9ec',vertices:[[a-r,m,h],[a+r,m,h],[b+r,m+1,h],[b-r,m+1,h]]},
    {color:'#6c8796',vertices:[[a-r,m,h-r*2],[a-r,m,h],[b-r,m+1,h],[b-r,m+1,h-r*2]]},
    {color:'#91a9b4',vertices:[[a+r,m,h],[a+r,m,h-r*2],[b+r,m+1,h-r*2],[b+r,m+1,h]]}
  ];
  if(m%4===0){
    for(const dx of [-.045,.045])faces.push({color:'#72909d',vertices:[[a+dx,m,0],[a+dx,m,h-r],[a+dx,m+.1,h-r],[a+dx,m+.1,0]]});
  }
  return faces;
}
function buildCourseSection(origin,pieces){
  // Older courses could park a bus on the centreline.
  pieces=pieces.map(p=>p.bus===0?{...p,bus:busOffsets[0]}:p);
  const path=[{width:12,...origin}],spans=[],ramps=[],railRuns=[],lastRail={};
  for(const piece of pieces){
    const entry=path.at(-1),endWidth=piece.width??entry.width;
    const pitch=entry.pitch+piece.tilt;
    if(![12,24].includes(piece.length)||!Number.isFinite(piece.turn)||Math.abs(piece.turn)>90||
      !Number.isFinite(pitch)||Math.abs(pitch)>80||![6,12,24].includes(endWidth))
      throw Error('조각 길이·폭 또는 연결된 경사 범위를 확인하세요.');
    for(const [anchor,inset] of Object.entries(piece.rails??{})){
      if(!Object.hasOwn(railNames,anchor)||!Number.isFinite(inset)||inset<0||inset>Math.min(entry.width,endWidth)/2)
        throw Error((spans.length+1)+'번 조각의 레일 거리와 길 폭을 확인하세요.');
      const a=path.length-1,prev=lastRail[anchor];
      if(prev&&prev.b===a&&prev.inset===inset)prev.b+=piece.length;
      else{
        const rail={a,b:a+piece.length,anchor,inset};
        lastRail[anchor]=rail;railRuns.push(rail);
      }
    }
    spans.push(path.length);
    const objects=courseRamps(path.length-1,piece.length,piece.ramp,entry.width,endWidth);
    const conflict=objects.find(r=>!r.fits);
    if(conflict){
      const error=Error(spans.length+'번 조각의 '+laneNames[conflict.lane]+' 점프대가 폭을 벗어나요. 점프대를 옮기거나 제거하세요.');
      error.rampConflict={index:spans.length-1,lane:conflict.lane};
      throw error;
    }
    ramps.push(...objects);path.push(...sampleCoursePiece(entry,piece));
  }
  return {origin:path[0],pieces,path,spans,ramps,railRuns};
}
