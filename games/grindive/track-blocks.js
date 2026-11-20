// Road-relative cross-section in metres; segment length follows the music.
const TRACK_CELL = 1;
// Cooldowns are seconds; eligible placements still land on the analyzed beat grid.
const beatStageStyles={
  'midnight-taxi':       {slalom:28, longJump:18, duck:12, rest:0},
  'the-iron-portcullis': {slalom:30, longJump:23, duck:6,  rest:0},
  'skyline-ignition':    {slalom:37, longJump:11, duck:18, rest:-1},
  'prairie-express':     {slalom:28, longJump:18, duck:22, rest:0},
  'rails-under-fire':    {slalom:10, longJump:24, duck:14, rest:0},
};
function isSingleBeatStage(id){return Object.hasOwn(beatStageStyles,id);}
function trackBlockTop(block,x,z=block.a){
  if(block.shape==='slope')return block.h0+(block.h1-block.h0)*Math.max(0,Math.min(1,(z-block.a)/(block.b-block.a)));
  const u=Math.max(0,Math.min(1,(x-block.l)/TRACK_CELL));
  const t=block.mirror?1-u:u;
  if(block.shape==='triangle')return block.base+TRACK_CELL*t;
  if(block.shape==='curve')return block.base+TRACK_CELL*(1-Math.sqrt(Math.max(0,1-t*t)));
  return block.base+TRACK_CELL;
}

function trackBlockAt(block,x,z){
  return x>=block.l&&x<=block.l+TRACK_CELL&&z>=block.a&&z<block.b;
}

// Route-first generation: reserve traversable corridors before placing hazards.
function buildTrackBlocks(course,track){
  const at=time=>{const p=course.phrases.find(p=>time<=p.end)||course.phrases.at(-1),t=time-p.start;return 2*Math.round((p.startZ+p.speed*t+.5*p.acceleration*t*t)/2)};
  course.kickMarks=new Map();
  let lastKick=-Infinity;
  for(const hit of track.attacks){
    if(hit.kind!=='kick'||hit.time>course.duration||hit.time-lastKick<.22)continue;
    const phrase=course.phrases.find(p=>hit.time<=p.end);
    if(!phrase)continue;
    const t=hit.time-phrase.start;
    const station=phrase.startZ+phrase.speed*t+.5*phrase.acceleration*t*t;
    const grid=2*Math.floor(station/2);
    course.kickMarks.set(grid,station);
    lastKick=hit.time;
  }
  course.floor=[];course.blocks=[];course.routes=[];
  course.traps=[];course.ramps=[];course.rails=[];course.street=[];course.bonuses=[];
  course.mergeZones=[];course.actionGates=[];
  const drums=track.attacks.filter(hit=>hit.kind==='kick'||hit.kind==='snare');
  const finish=2*Math.ceil(course.finish/2);
  let time=0,step=0,previousTier=0;
  // Row zero is the receiving floor. Rows 1..9 are shelves in the same cross-section.
  while(time<course.duration){
    const section=track.sections.find(s=>time<s.end)||track.sections.at(-1);
    const cue=drums.find(hit=>hit.time>=time+1.8&&hit.time<=time+2.5);
    const until=Math.min(course.duration,cue?.time??time+2.25);
    const a=at(time),b=until===course.duration?finish:at(until);
    const pitch=section.contour[Math.min(3,Math.floor(4*(time-section.start)/(section.end-section.start)))]??60;
    const phase=step%20,distance=Math.min(phase,20-phase);
    const peak=section.highlight?9:Math.min(8,4+Math.round(section.energy*3+(pitch-60)/12));
    const tier=Math.max(0,Math.min(distance,previousTier+1,Math.max(previousTier-1,peak)));
    const recovery=phase===0||b===finish;
    const left=((Math.floor(step/3)+Math.floor(step/20))%2)===0;
    const opening=step%2===0?[1,2]:[4,5];
    const row=Array.from({length:7},(_,lane)=>recovery||opening.includes(lane)?'1':'0').join('');
    const footEnd=recovery?b:Math.min(a+12,b);
    const landing=step%4===0?Math.max(footEnd,b-18):b;
    if(landing<b)course.mergeZones.push({a:landing,b});
    if(footEnd>a)course.floor.push({a,b:footEnd,row,restart:Math.max(0,a-24)});
    function span(lane,level,from,to,layer){
      if(to<=from)return;
      course.blocks.push({a:from,b:to,l:(lane-3.5)*TRACK_CELL,base:(level-1)*TRACK_CELL,shape:'square',ground:level===0,layer});
    }
    for(let lane=0;lane<7;lane++){
      span(lane,0,row[lane]==='1'?a:footEnd,b);
      if(recovery)continue;
      // A broad terrace overlaps the middle lanes when the mass changes sides.
      const column=left?lane:6-lane;
      const level=Math.max(1,tier-Math.max(0,column-2));
      if(landing<b&&column>=3){
        span(lane,1,landing,b,'melody');
      }
      if(column<=4){
        const from=step%4===2&&column<2?Math.min(b,a+8):a;
        span(lane,level,from,column>=3?landing:b,'melody');
        if(level>1&&column<2)span(lane,level-1,from,b,'melody');
      }else{
        const island=Math.max(1,tier-2);
        span(lane,island,Math.min(b,a+8),Math.max(a,landing-6),'upper');
      }
    }
    if(recovery)course.mergeZones.push({a,b});
    else{
      course.actionGates.push({z:a,end:footEnd,time,kind:'terrace'});
      if(step%3===2)course.bonuses.push({z:2*Math.round((a+b)/4),x:(left?3:-3)*TRACK_CELL,h:TRACK_CELL*Math.max(1,tier-2),points:350,sourceTime:time});
    }
    previousTier=tier;time=until;step++;
  }
  if(isSingleBeatStage(track.id)){
    buildSkylineBeatRoute(course,track,at);
    const first=course.beatRoute[0];
    const launchEnd=at(first.takeoff+.20);
    course.blocks=course.blocks.filter(b=>b.beatPlatform);
    course.blocks.push({a:0,b:launchEnd,l:-.5,base:-1,ground:true,shape:'square'});
    course.floor=[{a:0,b:launchEnd,row:'0001000'},{a:launchEnd,b:finish,row:'0000000'}];
    course.ramps=course.ramps.filter(r=>r.longJump);course.mergeZones=[];course.bonuses=[];
  }
  // Keep the musical clock running through the three-lane approach.
  const approach=30;
  course.blocks=course.blocks.filter(b=>b.b>approach);
  for(const b of course.blocks)b.a=Math.max(approach,b.a);
  for(const l of [-1.5,-.5,.5])
    course.blocks.push({a:0,b:approach,l,base:-1,ground:true,shape:'square'});
  course.floor=[{a:0,b:approach,row:'0011100'},...course.floor.filter(f=>f.b>approach).map(f=>({...f,a:Math.max(approach,f.a)}))];
  course.turns=course.turns.filter(t=>t[1]>approach).map(([a,b,angle])=>[Math.max(approach,a),b,angle*(b-Math.max(approach,a))/(b-a)]);
  course.blocks.forEach((block,i)=>block.id='track-block-'+i);
  course.blockSlices=new Map();
  for(const block of course.blocks){
    for(let z=2*Math.floor(block.a/2);z<block.b;z+=2){
      if(!course.blockSlices.has(z))course.blockSlices.set(z,[]);
      course.blockSlices.get(z).push(block);
    }
  }
  for(const turn of course.turns)turn[2]*=.2;
  course.routeAnalysis={columns:7,rows:10};

}

function installTrackBlockEdges(){
  const blocks=songCourse?.blocks??[];
  const exposed=(block,x,z,height)=>{
    return !blocks.some(other=>other!==block&&trackBlockAt(other,x,z)&&
      other.base<height+.04&&trackBlockTop(other,x,z)>height-.04);
  };
  for(const block of blocks){
    for(const x of [block.l,block.l+TRACK_CELL]){
      const outside=x===block.l?x-.02:x+.02,top=trackBlockTop(block,x);
      let run=null;
      for(let z=block.a;z<=block.b;z+=2){
        const open=z<block.b&&exposed(block,outside,z+1,trackBlockTop(block,x,z+1));
        if(open&&run===null)run=z;
        if(!open&&run!==null){
          rims.push({name:'트랙블럭',block,a:run,b:z,x,key:block.id+':'+x+':'+run,
            height:m=>reviewSurface(x,m)+trackBlockTop(block,x,m)});
          run=null;
        }
      }
    }
    for(const z of [block.a,block.b]){
      const outside=z===block.a?z-.02:z+.02;
      const top=trackBlockTop(block,block.l+TRACK_CELL/2,z);
      if(!exposed(block,block.l+TRACK_CELL/2,outside,top))continue;
      rims.push({name:'트랙블럭',block,left:block.l,right:block.l+TRACK_CELL,z,key:block.id+'@'+z,
        height:()=>reviewSurface(s.x,z)+trackBlockTop(block,s.x,s.z)});
    }
  }
}

function trackBlockSupport(x,z,foot){
  let best=null,height=-Infinity;
  for(const block of songCourse?.blockSlices?.get(2*Math.floor(z/2))??[]){
    if(!trackBlockAt(block,x,z))continue;
    const top=reviewSurface(x,z)+trackBlockTop(block,x,z);
    if(top<=foot+.10&&top>height){best=block;height=top;}
  }
  return best;
}

// Even the lowest remaining deck, including its downhill bank, is now above the board.
function belowRemainingTrack(z,y){
  for(const block of songCourse.blocks){
    if(block.b<=z)continue;
    const low=block.shape==='square'?block.base+TRACK_CELL:
      block.shape==='slope'?Math.min(block.h0,block.h1):block.base;
    const bankAllowance=.33*Math.max(Math.abs(block.l),Math.abs(block.l+TRACK_CELL));
    if(y>=low-bankAllowance-.55)return false;
  }
  return z<songCourse.finish;
}

function resolveTrackBlockWalls(oldX,oldY,oldZ){
  if(s.rail?.block)return false;
  for(const block of songCourse?.blocks??[]){
    if(block.ground||s.z<block.a||s.z>=block.b)continue;
    const x=clamp(s.x,block.l,block.l+TRACK_CELL),floor=reviewSurface(x,s.z);
    const top=floor+trackBlockTop(block,x,s.z),bottom=floor+block.base;
    if(s.y>=top-.09||s.y+1.5<bottom)continue;
    if(s.x<block.l-.18||s.x>block.l+TRACK_CELL+.18)continue;
    // Let the board cross a flush ramp seam before applying the side bumper.
    const support=s.trackBlock;
    if(!s.air&&support?.shape==='triangle'&&(s.x<block.l||s.x>block.l+TRACK_CELL)&&
       x>=support.l&&x<=support.l+TRACK_CELL&&Math.abs(trackBlockTop(support,x,s.z)-trackBlockTop(block,x,s.z))<.01)continue;
    if(oldZ<block.a&&s.z>=block.a&&!(block.shape==='slope'&&s.y>=floor+block.h0-.12)){endRun('트랙블럭 충돌',true);return true;}
    // Entering a low ramp edge is allowed. The slope carries the board upward.
    const priorTop=reviewSurface(oldX,oldZ)+trackBlockTop(block,oldX,oldZ);
    if(block.shape!=='square'&&!s.air&&s.y>=priorTop-.30){
      const was=s.y;
      s.y=top;s.trackBlock=block;
      if(block.shape==='curve'&&Math.abs(s.vx)>2&&trackBlockTop(block,x)>block.base+TRACK_CELL*5/6)
        launch(Math.min(10,Math.abs(s.vx)*1.35),s.vx);
      if(s.y>=was)return false;
    }
    if(s.air&&oldY+1.5<=bottom&&s.vy>0){s.y=bottom-1.51;s.vy=0;s.jumpElapsed=null;continue;}
    const left=oldX<block.l||oldX<=block.l+TRACK_CELL/2;
    s.x=left?block.l-.19:block.l+TRACK_CELL+.19;
    s.vx=0;s.airVX=0;
  }
  return false;
}

function landOnTrackBlock(oldY){
  if(!s.air||s.vy>0||s.rail)return;
  let best=null,highest=-Infinity;
  for(const block of songCourse?.blocks??[]){
    if(!trackBlockAt(block,s.x,s.z))continue;
    const top=reviewSurface(s.x,s.z)+trackBlockTop(block,s.x,s.z);
    if(oldY>=top-.08&&s.y<=top+.08&&top>highest){best=block;highest=top;}
  }
  if(best){s.trackBlock=best;s.y=highest;}
}

// Ordinary decks share one finish per stage. Darker vertical faces show their depth.
const blockMaterials=new Map();
function blockMaterial(hex='#a6a9ac'){
  if(!blockMaterials.has(hex)){
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const shade=factor=>'rgb('+rgb.map(v=>Math.round(v*factor)).join(',')+')';
    blockMaterials.set(hex,{top:shade(1),side:shade(.32),front:shade(.48)});
  }
  return blockMaterials.get(hex);
}
// Only a completed record run supplies colors. Live contact data stays on the rider.
function loadTrail(course){
  const key='grindive.cell-trail.v2.'+(course.stageId??course.id);
  try{
    const saved=JSON.parse(localStorage.getItem(key));
    if(Number.isInteger(saved?.best)&&Array.isArray(saved.cells))
      return {key,best:saved.best,cells:new Map(saved.cells)};
    // Earlier versions combined every attempt. Preserve only their distance.
    const legacy=JSON.parse(localStorage.getItem('grindive.cell-trail.v1.'+(course.stageId??course.id)));
    if(Number.isInteger(legacy?.best))return {key,best:legacy.best,cells:new Map(),legacy:true};
  }catch{}
  return {key,best:-1,cells:new Map()};
}
function finishTrail(){
  const course=songCourse,run=s?.runTrail;
  if(!course?.trail||!run)return;
  s.runTrail=null;
  const stored=loadTrail(course);
  if(stored.best>course.trail.best)course.trail=stored;
  if(run.best<course.trail.best||run.best===course.trail.best&&!course.trail.legacy)return;
  course.trail={key:course.trail.key,best:run.best,cells:run.cells};
  try{localStorage.setItem(course.trail.key,JSON.stringify({best:run.best,cells:[...run.cells]}));}catch{}
}
function cellKey(block,cell){return cell+'|'+block.l+'|'+block.base;}
const stageDeckColors={
  'midnight-taxi':'#c98a67','the-iron-portcullis':'#ac9a69','skyline-ignition':'#987eca',
  'prairie-express':'#c8a252','rails-under-fire':'#678f98','downbeat-dive':'#bd8273',
  escape:'#83b8a4',medicine:'#8296c5',carnaval:'#db9770',water:'#68a9af',funk:'#c18db1',
  football:'#9ab678',future:'#839bc8',peace:'#a6b9a8',wonders:'#baad79',dark:'#9386a6',
  background:'#a09bb7',dramatic:'#ac8599'
};
const defaultPathFinish={top:'#2459c9',side:'#142f68',front:'#203f82',gradient:['#ffffff','#a7cbff','#2459c9']};
function stageDeckMaterial(){return blockMaterial(stageDeckColors[songCourse?.id]??'#aa9873');}
function recordTrail(jump=false,ramp=null,station=s.z){
  const run=s.runTrail;
  if(!run||s.edgeFall||s.balanceDrop||s.recover)return;
  const cell=Math.floor(station);
  run.best=Math.max(run.best,cell);
  if(s.air||s.rail&&!s.rail.block&&!ramp)return;
  // At a kicker lip the departing cell is the final metre under the ramp.
  const z=ramp?Math.min(station,ramp.b-.001):station;
  const x=ramp?clamp(s.x,ramp.x-ramp.width/2+.001,ramp.x+ramp.width/2-.001):s.x;
  const block=s.rail?.block??trackBlockSupport(x,z,s.y);
  if(!block||!ramp&&!s.rail&&Math.abs(s.y-reviewSurface(x,z)-trackBlockTop(block,x,z))>.10)return;
  const contact=clamp(Math.floor(z),Math.floor(block.a),Math.ceil(block.b)-1);
  const key=cellKey(block,contact),kind=jump?3:s.rail?2:1;
  run.cells.set(key,Math.max(kind,run.cells.get(key)??0));
}
function trackBlockMaterial(block,station=s.z){
  if(block.red)return stageDeckMaterial();
  if(songCourse.trail?.cells.has(cellKey(block,Math.floor(station))))return defaultPathFinish;
  if(block.shape!=='square')return blockMaterial('#71c9bd');
  return stageDeckMaterial();
}
// A neighbour removes a rim only when both painted surfaces meet along the edge.
function pathJoins(block,side,station,start,end){
  const l=block.l,r=l+TRACK_CELL,lateral=side!==0;
  const z=lateral?(start+end)/2:station;
  const lane=l+side*TRACK_CELL;
  const candidates=songCourse.blockSlices.get(2*Math.floor(z/2))??[];
  const boundary=station<start?start:end;
  function meets(other,x,m){return Math.abs(trackBlockTop(block,x,m)-trackBlockTop(other,x,m))<.001;}
  return candidates.some(other=>{
    if(other.l!==lane||other.red||z<other.a||z>=other.b||
       !songCourse.trail.cells.has(cellKey(other,Math.floor(z))))return false;
    if(lateral){
      const x=side<0?l:r;
      return other.a<=start&&other.b>=end&&meets(other,x,start)&&meets(other,x,end);
    }
    return meets(other,l,boundary)&&meets(other,r,boundary)&&meets(other,(l+r)/2,boundary);
  });
}
function checkRedBlockContact(){
  if(s.air||grinding()||s.recover||s.edgeFall){s.redContact=null;return false;}
  const block=trackBlockSupport(s.x,s.z,s.y);
  const touching=block?.red&&Math.abs(s.y-reviewSurface(s.x,s.z)-trackBlockTop(block,s.x,s.z))<.09?block:null;
  if(touching===s.redContact)return false;
  s.redContact=touching;
  if(!touching)return false;
  endRun('위험 블록 접촉',true);return true;
}
function drawTrackBlocks(z){
  const blocks=songCourse?.blockSlices?.get(z);
  if(!blocks)return;
  const c=reviewCamera,eye=c.sideOffset;
  // Draw adjacent lanes back to front as well as sorting the longitudinal slices.
  const ordered=blocks.length===1?blocks:blocks.slice().sort((a,b)=>
    a.base-b.base||Math.abs(b.l+.5-eye)-Math.abs(a.l+.5-eye));
  function vertex(x,h,m,path){
    return courseViewVertex(x,reviewSurface(x,m)+h,m,path);
  }
  function face(points,color,gradient,overlay=false){
    if(!overlay&&Math.abs(z-s.z)<12)riderOccluders.push(points);
    // Clip in camera space. Projecting a corner behind the eye can paint a
    // stretched side over the top of the neighbouring platform.
    const near=.25,visible=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      if(a[2]>=near)visible.push(a);
      if((a[2]>=near)===(b[2]>=near))continue;
      const t=(near-a[2])/(b[2]-a[2]);
      visible.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),near]);
    }
    if(visible.length<3)return;
    const screen=visible.map(([x,y,d])=>[W*.5+x*c.focal/d,H*.61+y*c.focal/d]);
    const area=screen.reduce((sum,[x,y],i)=>{const n=screen[(i+1)%screen.length];return sum+x*n[1]-y*n[0];},0);
    if(area<0){if(gradient)gradientBlockFace(screen,gradient);else poly(screen,color);}
  }
  for(const block of ordered){
    const low=Math.max(z,block.a),high=Math.min(z+2,block.b);
    // Split the render slice only where adjacent metre cells have different finishes.
    const split=z+1;
    const edges=low<split&&split<high&&(block.red||trackBlockMaterial(block,low).gradient||trackBlockMaterial(block,low)!==trackBlockMaterial(block,split))?[low,split,high]:[low,high];
    for(let part=edges.length-2;part>=0;part--){
      const start=edges[part],end=edges[part+1];
      const from=reviewSample(start),to=reviewSample(end);
      const l=block.l,r=l+TRACK_CELL,colors=trackBlockMaterial(block,start);
      const path=!!colors.gradient,gradient=block.red?hazardGradient:null;
      const borders=path?[
        !pathJoins(block,-1,start,start,end),!pathJoins(block,1,start,start,end),
        !pathJoins(block,0,start-.00001,start,end),!pathJoins(block,0,end+.00001,start,end)
      ]:null;
      const top=(x,m)=>trackBlockTop(block,x,m);
      const atStart=(x,h)=>vertex(x,h,start,from),atEnd=(x,h)=>vertex(x,h,end,to);
      face([atStart(l,block.base),atStart(l,top(l,start)),atEnd(l,top(l,end)),atEnd(l,block.base)],colors.side,gradient);
      face([atStart(r,block.base),atEnd(r,block.base),atEnd(r,top(r,end)),atStart(r,top(r,start))],colors.side,gradient);
      face([atStart(l,block.base),atEnd(l,block.base),atEnd(r,block.base),atStart(r,block.base)],colors.side,gradient);
      const slices=block.shape==='curve'?(z-s.z>120?4:16):1;
      for(let i=0;i<slices;i++){
        const x=l+TRACK_CELL*i/slices,n=l+TRACK_CELL*(i+1)/slices;
        const left=atStart(x,top(x,start)),right=atStart(n,top(n,start));
        if(start===block.a)face([atStart(x,block.base),atStart(n,block.base),right,left],colors.front,gradient);
        if(end===block.b)face([atEnd(n,block.base),atEnd(x,block.base),atEnd(x,top(x,end)),atEnd(n,top(n,end))],colors.front,gradient);
        face([left,right,atEnd(n,top(n,end)),atEnd(x,top(x,end))],colors.top,gradient);
        const kick=songCourse.kickMarks?.get(z);
        if(!block.red&&kick>=start&&kick<end&&z-s.z<80){
          const tail=Math.min(end,kick+.18);
          const mark=(u,m)=>vertex(u,top(u,m)+.008,m,reviewSample(m));
          const glow=Math.max(0,1-Math.abs(kick-s.z)/2);
          face([mark(x,kick),mark(n,kick),mark(n,tail),mark(x,tail)],
            'rgba(206,249,255,'+(.44+.48*glow)+')',null,true);
        }
        if(path){
          // Bound the fade in metres, independent of slice length and mesh tessellation.
          const strip=(x0,x1,m0,m1,axis,outer,inner)=>{
            x0=Math.max(x,x0);x1=Math.min(n,x1);if(x1<=x0)return;
            const pt=(u,m)=>vertex(u,top(u,m),m,m===start?from:m===end?to:reviewSample(m));
            const midX=(x0+x1)/2,midZ=(m0+m1)/2;
            const a=axis==='x'?pt(outer,midZ):pt(midX,outer);
            const b=axis==='x'?pt(inner,midZ):pt(midX,inner);
            const screen=p=>[W*.5+p[0]*c.focal/Math.max(.25,p[2]),H*.61+p[1]*c.focal/Math.max(.25,p[2])];
            const [ax,ay]=screen(a),[bx,by]=screen(b);
            const tangent=screen(axis==='x'?pt(outer,m1):pt(x1,outer));
            const tx=tangent[0]-ax,ty=tangent[1]-ay,len=Math.hypot(tx,ty);
            if(len<.001)return;
            const nx=-ty/len,ny=tx/len,span=(bx-ax)*nx+(by-ay)*ny;
            const g=ctx.createLinearGradient(ax,ay,ax+nx*span,ay+ny*span);
            g.addColorStop(0,colors.gradient[0]);g.addColorStop(.30,colors.gradient[1]);g.addColorStop(1,colors.gradient[2]+'00');
            face([pt(x0,m0),pt(x1,m0),pt(x1,m1),pt(x0,m1)],g,null,true);
          };
          const w=.23,d=Math.min(w,(end-start)/2);
          if(borders[0])strip(l,l+w,start,end,'x',l,l+w);
          if(borders[1])strip(r-w,r,start,end,'x',r,r-w);
          if(borders[2])strip(x,n,start,start+d,'z',start,start+d);
          if(borders[3])strip(x,n,end-d,end,'z',end,end-d);
        }
      }

    }
  }
}

function buildSkylineBeatRoute(course,track,station){
  const sections=track.sections,beats=[0];
  function bankAt(x,z){
    const turn=course.turns.find(([a,b])=>z>=a&&z<b);
    return turn?-x*Math.sign(turn[2])*.33*Math.sin(Math.PI*(z-turn[0])/(turn[1]-turn[0]))**2:0;
  }
  function jumpTime(rise,x,fromX,land,grind){
    let flight=2*ollieHalfTime;
    for(let pass=0;pass<3;pass++){
      const target=rise+bankAt(x,station(land))-bankAt(fromX,station(land-flight))+(grind?.14:0);
      flight=ollieHalfTime;
      while(flight<2*ollieHalfTime&&ollieHeight(flight/ollieHalfTime-1)>target)flight+=1/480;
      if(target<0)flight+=(Math.sqrt(ollieVelocity(1)**2-2*normalGravity*target)+ollieVelocity(1))/normalGravity;
    }
    return flight;
  }
  // From the last rideable metre, find where a descending ollie meets the target deck.
  function landingLimit(e,prev,lip){
    const startTime=songPosition(course,lip).time;
    const startHeight=(prev?.height??0)+(prev?.sideExit?3:0)+bankAt(prev?.sideExit??prev?.x??0,lip);
    function distanceAt(t){
      const phrase=course.phrases.find(p=>startTime+t<=p.end)||course.phrases.at(-1);
      const elapsed=startTime+t-phrase.start;
      return phrase.startZ+phrase.speed*elapsed+.5*phrase.acceleration*elapsed**2-lip;
    }
    let lo=ollieHalfTime,hi=2*ollieHalfTime+1;
    for(let pass=0;pass<16;pass++){
      const t=(lo+hi)/2,extra=t-2*ollieHalfTime;
      const rise=extra<=0?ollieHeight(t/ollieHalfTime-1):ollieVelocity(1)*extra-.5*normalGravity*extra**2;
      if(startHeight+rise>e.height+bankAt(e.x,lip+distanceAt(t)))lo=t;
      else hi=t;
    }
    // Round toward the rider on the same 2 m grid as the rendered platforms.
    return lip+2*Math.floor(.75*distanceAt(lo)/2);
  }
  for(const p of sections)beats.push(beats.at(-1)+(p.end-p.start)/p.beat);
  const drums=track.attacks.filter(h=>['kick','snare'].includes(h.kind));
  const events=[];
  const style=beatStageStyles[track.id];
  const taxiPatterns=course.taxiTraps?[
    [6,'ring'],[17,'zigzag',false],[29,'ringFlight'],
    [41,'drop',false],[54,'zigzag',true],[69,'drop',true]
  ]:[];
  course.rings=[];
  let beat=4,previous,nextSlalom=10,slalomIndex=0;
  course.pillars=[];
  while(beat<beats.at(-1)){
    const i=sections.findIndex((_,i)=>beat<beats[i+1]),p=sections[i];
    const grid=p.start+(beat-beats[i])*p.beat;
    if(grid>track.duration-1)break;
    const hit=drums.filter(h=>Math.abs(h.time-grid)<.065).sort((a,b)=>Math.abs(a.time-grid)-Math.abs(b.time-grid))[0];
    const land=hit?.time??grid;
    const j=Math.min(3,Math.floor((grid-p.start)/(p.end-p.start)*4));
    const change=p.contour[j]-p.contour[Math.max(0,j-1)];
    const high=previous?.height??0;
    const height=Math.max(1,Math.min(4,high+(change>1?1:change< -1?-1:0)));
    const grind=!previous?.grind&&(p.highlight||Math.abs(change)<=1);
    const x=(events.length%2===0?-1:1)*(grind?1.5:1);
    // Account for lateral travel across banked corners in road-relative metres.
    const flight=jumpTime(height-high,x,previous?.x??0,land,grind);
    if(!previous&&station(land-flight)<32){beat++;continue;}
    previous={beat,land,takeoff:land-flight,x,height,grind};
    events.push(previous);
    let holdBeats=grind?6:4;
    if(isSingleBeatStage(track.id)){
      // Strong changes get a quick transfer; sustained notes give the rider room to coast.
      if(grind)holdBeats=p.highlight||Math.abs(change)<.5?8:6;
      else holdBeats=Math.max(3,(Math.abs(change)>=4?3:Math.abs(change)<1?5:4)+style.rest);
    }
    if(isSingleBeatStage(track.id)&&!grind&&events.length%5===0)
      holdBeats=Math.max(holdBeats,Math.ceil(2.85/p.beat));
    if(taxiPatterns.length&&land>=taxiPatterns[0][0]){
      const [,pattern,trapRail=false]=taxiPatterns.shift();
      previous.pattern=pattern;
      previous.trapRail=trapRail;
      previous.beatSeconds=p.beat;
      previous.grind=false;
      holdBeats=Math.max(holdBeats,previous.pattern==='zigzag'?18:14);
    }else if(isSingleBeatStage(track.id)&&!grind&&land>=nextSlalom&&land<track.duration-8){
      const lanes=2+slalomIndex++%3;
      const targetRows=3+(slalomIndex+Math.abs(Math.round(change)))%3;
      const beats=[];
      let offset=Math.ceil(.75/p.beat);
      for(let j=0;j<targetRows&&offset*p.beat<=3.7;j++){
        beats.push(offset);
        const rhythm=[1.5,2,1.5,2.5][(j+slalomIndex)%4];
        offset+=Math.max(rhythm,Math.ceil(.50/p.beat*2)/2);
      }
      previous.slalom={lanes,beats,beatSeconds:p.beat};
      holdBeats=Math.max(holdBeats,Math.ceil(5.2/p.beat));
      nextSlalom=land+style.slalom;
      // Reserve a straight between the musical landing and the next jump.
      const from=station(land+.35),to=station(land+(previous.slalom.beats.at(-1)+1)*p.beat);
      course.turns=course.turns.flatMap(turn=>{
        const [a,b,angle]=turn;
        if(b<=from||a>=to)return [turn];
        const pieces=[];
        if(a<from)pieces.push([a,from,angle*(from-a)/(b-a)]);
        if(b>to)pieces.push([to,b,angle*(b-to)/(b-a)]);
        return pieces;
      });
    }
    // The fast opening needs time on each deck between its lateral ollies.
    if(track.id==='rails-under-fire'&&land<12)holdBeats=Math.max(holdBeats,6);
    beat+=holdBeats;
  }
  // Move just the third and fourth contacts two beats later; rejoin the chart on jump five.
  if(track.id==='rails-under-fire')for(const i of [2,3]){
    const e=events[i],prev=events[i-1];
    e.phraseLand=e.land;
    e.beat+=2;
    const section=sections.findIndex((_,n)=>e.beat<beats[n+1]);
    const grid=sections[section].start+(e.beat-beats[section])*sections[section].beat;
    const hit=drums.filter(h=>Math.abs(h.time-grid)<.065).sort((a,b)=>Math.abs(a.time-grid)-Math.abs(b.time-grid))[0];
    e.land=hit?.time??grid;
    e.takeoff=e.land-jumpTime(e.height-prev.height,e.x,prev.x,e.land,e.grind);
  }
  course.blocks=course.blocks.filter(b=>!b.ground&&(b.l===-3.5||b.l===2.5));
  course.floor=[];course.bonuses=[];course.actionGates=[];course.mergeZones=[];
  const finish=2*Math.ceil(course.finish/2);
  // Carve short windows under beat landings. Full-width approaches double as checkpoints.
  let cursor=0,window=0;
  function floorRun(a,b,row){
    if(b<=a)return;
    for(let lane=0;lane<7;lane++)if(row[lane]==='1')
      course.blocks.push({l:lane-3.5,base:-1,a,b,shape:'square',ground:true});
  }
  for(const e of events){
    if(e.land<4||e.land>track.duration-3)continue;
    const a=station(e.land-.24),b=station(e.land+.28);
    const section=sections.find(p=>e.land<p.end)||sections.at(-1);
    if(course.grades.some(([z],i,keys)=>keys[i+1]&&keys[i+1][1]!==keys[i][1]&&
      z>=a-25&&z<=b+25))continue;
    const partial=e.x<0?'1110000':'0000111';
    const row=section.highlight&&window%3===1?'0000000':window%4===2?'0011100':partial;
    floorRun(cursor,a,'1111111');
    floorRun(a,b,row);
    course.floor.push({a,b,row,restart:Math.max(cursor,a-20)});
    cursor=b;window++;
  }
  floorRun(cursor,finish,'1111111');
  const singleRoute=isSingleBeatStage(track.id);
  if(singleRoute){
    let raised=0,lastLong=0,hasJumpTransfer=false;
    for(const [i,e] of events.entries()){
      const prev=events[i-1];
      e.height+=raised;
      if(prev?.sideExit)e.takeoff=e.land-jumpTime(e.height-prev.height-3,e.x,prev.sideExit,e.land,e.grind);
      if(e.pattern||prev?.pattern)continue;
      if(!raised&&e.grind&&e.land>track.duration*.32&&e.land<track.duration*.65){
        e.grind=false;e.x=Math.sign(e.x);e.sideExit=-3*e.x;
        raised=3;
      }else if(prev&&!e.slalom&&!prev.slalom&&!prev.grind&&!prev.sideExit&&!prev.jumpTransfer&&e.land-prev.land>2.25&&e.land-lastLong>style.longJump){
        e.grind=false;e.x=Math.sign(e.x);
        e.longJump=true;e.takeoff=e.land-1.65;lastLong=e.land;
        if(!hasJumpTransfer&&e.land>track.duration*.5){
          const lift=prev.height+2-e.height;
          e.height+=lift;raised+=lift;e.jumpTransfer=true;hasJumpTransfer=true;
          e.x=2*Math.sign(e.x);e.takeoff=e.land-1;
        }
      }
    }
  }
  let grindCount=0;
  events.forEach((e,i)=>{
    const red=e.grind&&++grindCount%2===0;
    const lead=singleRoute?(e.grind?.42:.12):.28;
    let a=station(e.jumpTransfer?e.takeoff-.25:e.land-(e.longJump?.32:lead));
    if(singleRoute&&!e.longJump){
      const prev=events[i-1],lip=prev?.b??station(e.takeoff+.20);
      a=Math.min(a,landingLimit(e,prev,lip));
    }
    const next=events[i+1];
    const b=next?.jumpTransfer?station(next.land-.18):next?station(next.takeoff+(singleRoute&&!e.grind?.07:.18)):finish;
    const center=e.jumpTransfer?e.x:Math.sign(e.x);
    function tile(lane,from,to,base=e.height-1,shape='square',mirror=false){
      if(to>from)course.blocks.push({l:lane-.5,base,a:from,b:to,shape,mirror,red,beatPlatform:true,layer:e.grind?'upper':'melody'});
    }
    if(e.pattern){
      buildTaxiTrap(course,e,a,b,station);
    }else if(e.slalom){
      const {lanes,beats,beatSeconds}=e.slalom;
      const laneX=k=>center*(1-k);
      for(let k=0;k<lanes;k++)tile(laneX(k),a,b);
      let safe=0,dir=1;
      for(const offset of beats){
        if(safe===0)dir=1;
        if(safe===lanes-1)dir=-1;
        safe+=dir;
        const z=station(e.land+offset*beatSeconds);
        for(let k=0;k<lanes;k++)if(k!==safe)
          course.pillars.push({z,length:1,x:laneX(k),safeX:laneX(safe),width:1,bottom:e.height,top:e.height+2});
      }
    }else if(e.sideExit){
      const toe=station(e.land+.25),end=station(e.land+1.6),dir=-center;
      tile(center,a,end);
      for(let step=0;step<3;step++)tile(center+dir*(step+1),toe,end,e.height+step,'triangle',dir<0);
      tile(e.sideExit,toe,b,e.height+2);
      e.sideStart=toe;
    }else if(e.jumpTransfer){
      tile(center,a,b);tile(center+Math.sign(center),a,b);
    }else{
      tile(center,a,b);
      if(!singleRoute&&!e.grind){tile(center-1,a,b);tile(center+1,a,b);}
      if(singleRoute&&!next?.jumpTransfer){
        const middle=a+2*Math.floor((b-a)/4);
        tile(0,i%2?a:middle,b);
        if(i%3!==0)tile(-center,middle,b);
        if(!e.grind&&i%3!==1)tile(2*center,a,middle);
      }
    }
    if(next?.longJump){
      const launch=station(next.takeoff),flight=next.land-songPosition(course,launch).time;
      const dir=next.jumpTransfer?Math.sign(next.x-center):0;
      // Keep the low side flush for the full usable length of every lateral ramp.
      if(dir){
        // A shallow step on the approach leaves the original grind lip exposed.
        tile(center-dir,a,launch-8,e.height-1-.08);
        tile(center-dir,launch-8,launch+8,e.height-1);
      }
      const rise=dir?.5:1;
      const velocity=(next.height-e.height-rise+.5*normalGravity*flight**2)/flight;
      course.ramps.push({x:center,a:dir?launch-8:launch-4,b:dir?launch+8:launch,base:e.height,width:1,h:1,mini:true,
        longJump:true,jumpTransfer:next.jumpTransfer,sideDirection:dir,
        sideSpeed:dir?(next.x-center)/flight:0,landingEdgeX:next.x-dir*.5,landingHeight:next.height,flight,launchVelocity:velocity});
    }
    e.a=a;e.b=b;
  });
  // Place ground kickers on solid approaches with room to fly and land.
  let lastRamp=-Infinity;
  events.forEach(e=>{
    if(e.land<6||e.land-lastRamp<9||e.land>track.duration-3)return;
    const a=station(e.land-.7),landing=station(e.land+.4);
    const side=Math.sign(e.x);
    for(const x of [2*side,-2*side,3*side,-3*side,side,-side,0]){
      const lane=x+3;
      const missing=course.floor.some(f=>f.a<landing+4&&f.b>a-4&&f.row[lane]==='0');
      const blocked=course.blocks.some(b=>!b.ground&&b.a<landing+4&&b.b>a-4&&
        b.l<x+.49&&b.l+1>x-.49&&b.base<4);
      if(missing||blocked)continue;
      course.ramps.push({x,a,b:a+1,width:1,h:1,mini:true});
      lastRamp=e.land;break;
    }
  });
  // Outside lane of wide beat platforms gives riders a choice after landing.
  let lastUpper=-Infinity;
  for(const e of events){
    if(e.grind||e.land<4||e.land-lastUpper<10||e.land>track.duration-3)continue;
    const x=2*Math.sign(e.x),a=station(e.land+.2);
    if(a<e.a+2||a+2>=e.b)continue;
    if(course.blocks.some(b=>b.l===x-.5&&b.a<a+12&&b.b>a-2&&b.base>=e.height&&b.base<e.height+4))continue;
    course.ramps.push({x,a,b:a+1,width:1,h:1,mini:true,base:e.height});
    lastUpper=e.land;
  }
  course.duckGates=[];
  let lastDuck=-12;
  if(singleRoute)for(let i=0;i+1<events.length;i++){
    const e=events[i],next=events[i+1];
    if(e.pattern||e.slalom||e.sideExit||e.longJump||next.longJump||e.land<3||(e.phraseLand??e.land)-lastDuck<style.duck)continue;
    const section=sections.find(section=>e.land<section.end)??sections.at(-1);
    const crossing=e.land+section.beat;
    if(crossing-e.land<.28||next.takeoff-crossing<.42)continue;
    course.duckGates.push({z:station(crossing),length:2,x:e.x,width:2,bottom:e.height+1.05,top:e.height+3.05});
    lastDuck=e.phraseLand??e.land;
  }
  course.beatRoute=events;
}


function buildTaxiTrap(course,event,a,b,station){
  const {pattern,land,beatSeconds,height}=event;
  const center=Math.sign(event.x), beat=n=>station(land+n*beatSeconds);
  // Keep the advertised flight line straight throughout the encounter.
  course.turns=course.turns.flatMap(([from,to,angle])=>{
    if(to<=a||from>=b)return [[from,to,angle]];
    const turns=[];
    if(from<a)turns.push([from,a,angle*(a-from)/(to-from)]);
    if(to>b)turns.push([b,to,angle*(to-b)/(to-from)]);
    return turns;
  });
  function block(l,from,to,top,red=false){
    course.blocks.push({l,a:from,b:to,base:top-1,shape:'square',red,beatPlatform:true,layer:'melody'});
  }
  function deck(from,to){
    for(let lane=-2;lane<=2;lane++)block(lane-.5,from,to,height);
  }
  function addRing(z,y){
    course.rings.push({x:center,z,y});
    // A one-cell border around a clear three-by-three opening.
    for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
      if(Math.max(Math.abs(row),Math.abs(col))!==2)continue;
      const bottom=y+(row-.5)*TRACK_CELL;
      course.pillars.push({ring:true,x:center+col*TRACK_CELL,z,width:TRACK_CELL,
        length:TRACK_CELL,bottom,top:bottom+TRACK_CELL});
    }
  }
  if(pattern==='ring'||pattern==='ringFlight'){
    for(let lane=center-1;lane<=center+1;lane++)block(lane-.5,a,b,height);
    if(pattern==='ring'){
      addRing(beat(4),height+2.65);
    }else{
      const lip=beat(4),rise=2.4,velocity=13;
      course.ramps.push({x:center,a:beat(3),b:lip,width:2.8,h:rise,base:height,
        mini:true,longJump:true,launchVelocity:velocity});
      for(const n of [5,6,7]){
        const z=beat(n),t=songPosition(course,z).time-songPosition(course,lip).time;
        addRing(z,height+rise+velocity*t-.5*normalGravity*t*t+.8);
      }
    }
    return;
  }
  deck(a,beat(2));
  if(pattern==='zigzag'){
    // Three beats per rail leave time for an ollie and a brief grind.
    for(let i=0;i<4;i++){
      const left=i%2===0;
      block(left?-2.5:1.5,beat(2+3*i),beat(5+3*i)-(i<3?2*TRACK_CELL:0),height,event.trapRail);
    }
    deck(beat(14),b);
  }else{
    // The upper rail ends before the wall. Its outer edge shares a line
    // with the receiving rail, two metres below.
    const l=center-.5;
    course.blocks.push({l,a:beat(2),b:beat(4),base:height-1,shape:'slope',
      h0:height,h1:height+2.4,beatPlatform:true,layer:'melody'});
    block(l,beat(4),beat(7),height+2.4,event.trapRail);
    block(l,beat(7),beat(11),height,event.trapRail);
    course.pillars.push({x:center,z:beat(9),width:3,length:2,bottom:height+2.1,top:height+6});
    deck(beat(11),b);
  }
}
