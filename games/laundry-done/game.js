/* LaundryDone: no build step, no network dependencies. */
(() => {
  'use strict';
  const C=window.LaundryCore, $=id=>document.getElementById(id);
  const canvas=$('game'),ctx=canvas.getContext('2d'),W=1440,H=810;
  const state={mode:'home',time:0,score:0,hearts:3,stage:1,nextSpawn:.5,entities:[],results:[],history:[],id:0,practice:false,practiceIndex:0,toastUntil:0,muted:false};
  let lastFrame=performance.now(),stroke=null,audio=null,best=0;
  try{best=Number(localStorage.getItem('laundrydone.best'))||0;}catch{}
  $('home-best').textContent=best.toLocaleString();
  const practiceButton=document.createElement('button');practiceButton.textContent='실전 시작 →';practiceButton.className='text-button';practiceButton.hidden=true;practiceButton.style.pointerEvents='auto';$('play-footer').prepend(practiceButton);
  const finishPractice=document.createElement('button');finishPractice.textContent='결과 확인';finishPractice.className='text-button';finishPractice.hidden=true;finishPractice.style.pointerEvents='auto';$('play-footer').prepend(finishPractice);
  const targetCache=new Map(C.clothes.map(item=>[item.name,C.folded(item)]));
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  resize();window.addEventListener('resize',resize);
  function text(s,x,y,size=16,color='#65765c',weight=400,align='left'){ctx.font=`${weight} ${size}px "Malgun Gothic",system-ui,sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);}
  function rounded(x,y,w,h,r,fill,strokeColor){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(strokeColor){ctx.strokeStyle=strokeColor;ctx.lineWidth=1;ctx.stroke();}}
  function path(g,points){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();}
  function line(a,b,color='#9dba85',width=2,dash=[]){ctx.beginPath();ctx.setLineDash(dash);ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([]);}
  function sound(kind){if(state.muted)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;const tones=kind==='iron'?[190,373,612]:kind==='fail'?[240,170]:kind==='result'?[523,659,784]:[620,830];tones.forEach((freq,i)=>{const o=audio.createOscillator(),gain=audio.createGain();o.type=kind==='iron'?'triangle':'sine';o.frequency.setValueAtTime(freq,now+i*.045);gain.gain.setValueAtTime(.0001,now);gain.gain.setValueAtTime(kind==='iron'?.12:.065,now+i*.045);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.045+.2);o.connect(gain);gain.connect(audio.destination);o.start(now+i*.045);o.stop(now+i*.045+.22);});}catch{}}
  function toast(message,duration=1.6){$('toast').textContent=message;$('toast').classList.add('visible');state.toastUntil=state.time+duration;}
  function sync(){
    $('score').textContent=state.score.toLocaleString();$('stage-label').textContent=state.practice?'연습 중':`${String(state.stage).padStart(2,'0')} 단계`;
    $('timer').textContent=`${String(Math.floor(state.time/60)).padStart(2,'0')}:${String(Math.floor(state.time%60)).padStart(2,'0')}`;
    $('stage-progress').style.width=`${state.stage===6?100:state.time%30/30*100}%`;
    $('hearts').innerHTML=Array.from({length:3},(_,i)=>i<state.hearts?'♥':'<span class="lost-heart">×</span>').join(' ');
    $('hearts').setAttribute('aria-label',`남은 하트 ${state.hearts}개`);
  }
  function entityPosition(e){
    const scale=e.scale||1.5,angle=(e.angle||0)+(e.spin||0)*(state.time-e.born);
    if(state.practice&&e.type==='cloth'){const dy=e.release===undefined?0:Math.pow(Math.min(1,(state.time-e.release)/.6),2)*600;return {x:870,y:367+dy,scale,angle};}
    return {...C.position(e,state.time),scale,angle};
  }
  function makeCloth(item,x,drift,apex){return {id:++state.id,type:'cloth',item,x,drift,apex,born:state.time,color:C.COLORS[(state.id-1)%C.COLORS.length],inputs:[],scale:1.5,angle:state.practice?0:(Math.random()-.5)*Math.PI*.8,spin:state.practice?0:(Math.random()-.5)*.55,interval:C.interval(state.stage)};}
  function spawn(){
    if(state.practice){const names=['손수건','수건','반팔티','원피스'];const item=C.clothes.find(c=>c.name===names[state.practiceIndex%names.length]);state.entities=[makeCloth(item,870,0,367)];state.practiceIndex++;state.nextSpawn=Infinity;return;}
    const levels=C.composition(state.stage);state.entities=levels.map((level,i)=>makeCloth(C.pick(C.clothes.filter(item=>item.level===level)),levels.length===1?865:(i===0?630:1130),levels.length===1?(Math.random()<.5?520:-520):(i===0?350:-350),levels.length===1?335:(i===0?355:395)));
    if(Math.random()<.1)state.entities.push({id:++state.id,type:'iron',born:state.time,x:levels.length===1?1180:870,drift:Math.random()<.5?200:-200,apex:250,scale:1.5,angle:(Math.random()-.5)*.7,spin:(Math.random()-.5)*.4,hit:false});
    state.nextSpawn=state.time+C.interval(state.stage);
  }
  function start(practice=false){
    Object.assign(state,{mode:'playing',time:0,score:0,hearts:3,stage:1,nextSpawn:.4,entities:[],results:[],history:[],id:0,practice,practiceIndex:0,toastUntil:0});stroke=null;
    for(const id of ['home','over','pause-screen'])$(id).hidden=true;
    for(const id of ['run-info','score-block','pause','play-footer'])$(id).hidden=false;
    practiceButton.hidden=!practice;finishPractice.hidden=!practice;$('hint').textContent=practice?'자유롭게 그은 뒤 결과 확인을 눌러보세요':'안내선은 힌트예요 — 그은 선 그대로 접혀요';$('toast').classList.remove('visible');sync();sound('line');lastFrame=performance.now();
  }
  function home(){state.mode='home';state.entities=[];stroke=null;for(const id of ['over','pause-screen','run-info','score-block','pause','play-footer'])$(id).hidden=true;$('home').hidden=false;$('toast').classList.remove('visible');$('home-best').textContent=best.toLocaleString();}
  function pause(){if(state.mode!=='playing')return;state.mode='paused';stroke=null;$('pause-screen').hidden=false;$('pause').setAttribute('aria-label','일시정지됨');}
  function resume(){if(state.mode!=='paused')return;state.mode='playing';$('pause-screen').hidden=true;$('pause').setAttribute('aria-label','일시정지');lastFrame=performance.now();}
  function lose(message,kind='fail'){if(state.practice)return;state.hearts=Math.max(0,state.hearts-1);sound(kind);toast(message);sync();if(state.hearts===0)gameOver();}
  function resolve(e){
    if(e.type!=='cloth')return;
    const result=C.evaluate(e.item,e.inputs);
    if(!result){state.results.push({id:e.id,name:e.item.name,color:e.color,miss:true,born:state.time,expires:state.time+e.interval,target:targetCache.get(e.item.name)});lose('앗, 놓쳤어요. 하트 −1');return;}
    const record={...result,id:e.id,name:e.item.name,color:e.color,born:state.time,expires:state.time+e.interval};
    state.results.push(record);state.history.push(record);state.score+=result.score;
    if(result.grade==='Bad')lose('조금 삐뚤어졌어요. 하트 −1');else sound('result');sync();
  }
  function gameOver(){
    state.mode='over';stroke=null;state.entities=[];best=Math.max(best,state.score);try{localStorage.setItem('laundrydone.best',String(best));}catch{}
    $('final-score').textContent=state.score.toLocaleString();$('final-count').innerHTML=`${state.history.length}<small>벌</small>`;$('final-best').textContent=best.toLocaleString();
    $('over-caption').textContent=state.history.length?'작은 정성이 이만큼 쌓였어요.':'괜찮아요. 다음 빨래는 조금 더 가볍게!';
    renderStacks();$('over').hidden=false;for(const id of ['run-info','score-block','pause','play-footer'])$(id).hidden=true;$('toast').classList.remove('visible');$('toast').textContent='';$('restart').focus({preventScroll:true});
  }
  function renderStacks(){
    const stacks=$('stacks');stacks.replaceChildren();
    if(!state.history.length){const p=document.createElement('p');p.className='empty-stack';p.textContent='접은 옷 0개 · 다음에는 이곳을 채워봐요';stacks.append(p);return;}
    C.stackGroups(state.history).forEach((items,index)=>{const pile=document.createElement('div');pile.className='pile';pile.setAttribute('aria-label',`${index+1}번째 더미, ${items.length}벌`);items.forEach((item,i)=>{const cv=document.createElement('canvas');cv.width=260;cv.height=100;cv.style.bottom=`${i*7}%`;cv.title=`${item.name} · ${item.grade} ${Math.floor(item.accuracy*100)}%`;drawStackCloth(cv.getContext('2d'),item,i);pile.append(cv);});const count=document.createElement('span');count.className='pile-count';count.textContent=`${items.length}벌`;pile.append(count);stacks.append(pile);});
    requestAnimationFrame(()=>{$('stack-scroll').scrollLeft=($('stack-scroll').scrollWidth-$('stack-scroll').clientWidth)/2;});
  }
  function drawStackCloth(g,item,index){
    // A side view for the stack: the folded silhouette becomes the top surface.
    // This display-only projection never changes the scoring mask.
    const polys=C.centered(item.result),b=C.bounds(polys),w=b.maxX-b.minX,h=b.maxY-b.minY;
    const width=194+(index%3)*8,depth=27,shift=(index%3-1)*3;
    const projected=polys.map(poly=>poly.map(p=>[130+shift+p[0]/w*width,p[1]/h*depth+47]));
    for(let y=25;y>=0;y-=2){g.save();g.translate(0,y);g.fillStyle=item.color;g.strokeStyle=item.color;g.lineWidth=1.5;for(const poly of projected){path(g,poly);g.fill();g.stroke();}g.restore();}
    g.fillStyle='#34472d16';g.fillRect(130-width/2+shift,50,width,25);
    g.fillStyle=item.color;g.strokeStyle=item.color;for(const poly of projected){path(g,poly);g.fill();g.stroke();}
    g.beginPath();g.moveTo(138-width/2+shift,65);g.lineTo(122+width/2+shift,65);g.strokeStyle='#fff8e87a';g.lineWidth=1.4;g.stroke();
    g.fillStyle='#fff8e88a';g.fillRect(130+width/2-23+shift,59,11,8);
  }
  function tick(dt){
    if(state.mode!=='playing')return;
    state.time+=dt;
    const stage=C.stageAt(state.time);if(stage!==state.stage&&!state.practice){state.stage=stage;toast(`${stage}단계 · ${C.interval(stage)}초마다 새로운 빨래`,2);sound('result');}
    // Resolve the old wave before spawning the next one, including at equal timestamps.
    finishPractice.disabled=!state.entities.some(e=>e.type==='cloth'&&e.release===undefined);
    const expired=state.entities.filter(e=>state.practice?e.release!==undefined&&state.time-e.release>=.6:state.time-e.born>=C.FLIGHT);
    if(stroke&&expired.length)commitStroke(expired);
    state.entities=state.entities.filter(e=>!expired.includes(e));
    for(const e of expired){if(state.mode!=='playing')break;resolve(e);if(state.practice)state.nextSpawn=state.time+1.5;}
    if(state.mode!=='playing')return;
    if(state.time>=state.nextSpawn)spawn();
    state.results=state.results.filter(r=>r.expires>state.time);
    if(state.time>state.toastUntil)$('toast').classList.remove('visible');sync();
  }
  function garment(item,color,x,y,scale=1,rotation=0,shadow=true){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);
    if(shadow){ctx.shadowColor='#3c4c2826';ctx.shadowBlur=17;ctx.shadowOffsetY=10;}
    path(ctx,item.outline);ctx.fillStyle=color;ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='#31463435';ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.stroke();
    ctx.save();path(ctx,item.outline);ctx.clip();
    ctx.strokeStyle='#fff8e830';ctx.lineWidth=1;
    for(let yy=-110;yy<120;yy+=7){ctx.beginPath();ctx.moveTo(-100,yy);ctx.lineTo(100,yy);ctx.stroke();}
    const kind=item.kind;
    if(['tee','polo','sweat','knit','cardigan','jacket','pajama','baby'].includes(kind)){
      ctx.beginPath();ctx.arc(0,-82,22,0,Math.PI);ctx.strokeStyle='#344a3540';ctx.lineWidth=3;ctx.stroke();
      line([-38,74],[38,74],'#344a3526',2);
      if(['polo','cardigan','jacket','pajama'].includes(kind)){line([0,-65],[0,kind==='polo'?-29:76],'#344a3540',2);for(let yy=-53;yy<(kind==='polo'?-25:70);yy+=22){ctx.beginPath();ctx.arc(0,yy,2.2,0,7);ctx.fillStyle='#faf8e7';ctx.fill();}}
      if(kind==='tee'||kind==='baby'){ctx.fillStyle='#fff7e75c';ctx.beginPath();ctx.arc(15,-21,12,0,7);ctx.fill();text('✳',15,-15,17,'#fff8e7',500,'center');}
      if(kind==='knit'){for(let x=-32;x<=32;x+=16)line([x,-55],[x,65],'#fff9e848',3);}
    }
    if(['jeans','joggers','leggings','pajama-pants','shorts'].includes(kind)){line([-48,-71],[48,-71],'#344a3550',3);line([0,-70],[0,-8],'#344a3540',1.5);if(kind==='jeans'){line([-42,-67],[-24,-40],'#fff7e870',2);line([42,-67],[24,-40],'#fff7e870',2);}}
    if(kind==='hoodie'){ctx.beginPath();ctx.ellipse(0,-67,27,31,0,0,7);ctx.strokeStyle='#344a3540';ctx.lineWidth=3;ctx.stroke();rounded(-25,43,50,24,7,'#fff8e825','#344a3520');}
    if(['towel','bath','handkerchief','pillow','blanket','sheet','duvet','scarf'].includes(kind)) {const b=C.bounds([item.outline]);line([b.minX+8,b.maxY-16],[b.maxX-8,b.maxY-16],'#fff9e890',4);line([b.minX+8,b.minY+16],[b.maxX-8,b.minY+16],'#fff9e890',4);}
    if(kind==='sock')line([-28,-62],[28,-62],'#fff9e880',9);
    if(kind==='apron')rounded(-19,7,38,32,3,'#fff9e833','#344a3540');
    ctx.restore();ctx.restore();
  }
  function drawFold(g,polys,x,y,scale,color,options={}){
    const centered=C.centered(polys),b=C.bounds(centered);if(options.fitW)scale=Math.min(scale,options.fitW/(b.maxX-b.minX),options.fitH/(b.maxY-b.minY));
    g.save();g.translate(x,y);g.scale(scale,scale);g.lineJoin='round';g.fillStyle=color;g.strokeStyle=color;g.lineWidth=.6;
    for(const poly of centered){path(g,poly);g.fill();g.stroke();}
    if(!options.silhouette){g.globalAlpha=.4;g.strokeStyle='#fffbe8';g.lineWidth=1.2;g.beginPath();g.moveTo(b.minX+4,b.maxY-4);g.lineTo(b.maxX-4,b.maxY-4);g.stroke();g.globalAlpha=1;}
    g.restore();return scale;
  }
  function room(homeScreen){
    ctx.fillStyle='#f6f3e9';ctx.fillRect(0,0,W,H);
    // Quiet paper grain, drawn deterministically so frames do not flicker.
    ctx.fillStyle='#7b876506';for(let i=0;i<700;i++)ctx.fillRect((i*173)%W,(i*97)%H,2,2);
    if(homeScreen){
      ctx.save();ctx.translate(995,376);ctx.rotate(.04);rounded(-250,-211,492,414,240,'#e9eddf');ctx.restore();
      rounded(1050,166,193,209,90,'#f4f1dd','#dce2cf');line([1146,168],[1146,375],'#dce2cf',5);line([1052,270],[1241,270],'#dce2cf',5);
      ctx.beginPath();ctx.moveTo(733,260);ctx.quadraticCurveTo(995,305,1270,232);ctx.strokeStyle='#b6b99d';ctx.lineWidth=2;ctx.stroke();
      garment(C.clothes.find(c=>c.name==='반팔티'),'#a5b697',923,372,1.23,-.12);
      garment(C.clothes.find(c=>c.name==='수건'),'#dec198',1142,391,.91,.13);
      for(const [x,y] of [[864,278],[967,281],[1093,277],[1166,263]]){ctx.save();ctx.translate(x,y);ctx.rotate(-.1);rounded(-4,-10,8,29,2,'#b99e75');ctx.restore();}
      ctx.save();ctx.translate(920,369);ctx.rotate(-.12);line([-18,-58],[-18,70],'#fcfae8',2,[5,6]);line([18,-58],[18,70],'#fcfae8',2,[5,6]);line([-42,8],[42,8],'#fcfae8',2,[5,6]);ctx.restore();
      text('✦',777,389,31,'#c6b276');text('✧',1250,439,37,'#acb895');text('✳',1061,178,31,'#c1ccaf');
      ctx.save();ctx.translate(1002,584);ctx.rotate(-.08);rounded(-125,-10,250,26,9,'#c0ccae');rounded(-105,-33,220,23,8,'#dfb498');rounded(-115,-55,220,23,8,'#a5b9b3');ctx.restore();
    }else{
      rounded(318,132,1080,574,25,'#eff0e5');
      ctx.save();ctx.beginPath();ctx.roundRect(318,132,1080,574,25);ctx.clip();
      const sun=ctx.createRadialGradient(1120,220,5,1120,220,450);sun.addColorStop(0,'#fffbea99');sun.addColorStop(1,'#fffbea00');ctx.fillStyle=sun;ctx.fillRect(318,132,1080,574);
      rounded(1190,165,126,148,63,'#f8f7ec','#e1e4d5');line([1253,166],[1253,311],'#e1e4d5',4);line([1191,245],[1315,245],'#e1e4d5',4);
      ctx.beginPath();ctx.moveTo(355,192);ctx.quadraticCurveTo(770,241,1140,190);ctx.strokeStyle='#d1d8c3';ctx.lineWidth=1.5;ctx.stroke();
      for(const [x,y] of [[412,198],[638,215],[985,208]])rounded(x,y-5,6,19,2,'#c5cbae');
      ctx.fillStyle='#e4e8d7';ctx.beginPath();ctx.ellipse(860,735,640,104,0,0,7);ctx.fill();
      ctx.restore();text('FOLD A LITTLE HAPPINESS',857,678,10,'#b1baa1',500,'center');
    }
  }
  function panel(){
    rounded(38,132,254,574,20,'#fcfaf2','#e2e4d7');
    const cards=[...state.results.filter(r=>r.expires>state.time),...state.entities.filter(e=>e.type==='cloth').map(e=>({id:e.id,name:e.item.name,target:targetCache.get(e.item.name)}))].slice(-4);
    if(!cards.length)return;
    const rowHeight=538/cards.length;
    cards.forEach((card,i)=>{
      const cy=151+i*rowHeight+rowHeight*.43,space=Math.min(182,rowHeight-42);
      const bb=C.bounds([...C.centered(card.target),...(card.result?C.centered(card.result):[])]);
      const fitScale=Math.min(8,180/(bb.maxX-bb.minX),space/(bb.maxY-bb.minY));
      const scale=drawFold(ctx,card.target,165,cy,fitScale,'#c8d3b9',{silhouette:true});
      if(card.result){
        const progress=Math.min(1,(state.time-card.born)/.15),pop=1+Math.sin(progress*Math.PI)*.08;
        ctx.save();ctx.globalAlpha=.8;drawFold(ctx,card.result,165,cy,scale*pop,card.color);ctx.restore();
        text(card.grade+' · '+Math.floor(card.accuracy*100)+'%',165,cy-space/2-9,14,card.grade==='Bad'?'#c58c74':'#658257',600,'center');
      }
      if(card.miss)text('×',165,cy+12,42,'#c58c74',400,'center');
      text(card.name,165,cy+space/2+27,17,'#607751',600,'center');
    });
  }
  function drawIron(e,p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);ctx.scale(p.scale,p.scale);ctx.shadowColor='#394c3126';ctx.shadowBlur=14;ctx.shadowOffsetY=10;ctx.beginPath();ctx.moveTo(-49,25);ctx.lineTo(-32,-19);ctx.quadraticCurveTo(-10,-43,25,-22);ctx.lineTo(52,25);ctx.closePath();ctx.fillStyle=e.hit?'#b6ae9f':'#879c95';ctx.fill();ctx.shadowColor='transparent';rounded(-17,-36,39,18,8,null,'#5f766e');rounded(-53,22,111,10,4,'#566f68');rounded(-15,-12,22,9,4,'#e2b881');ctx.restore();text('다리미',p.x,p.y+59,11,'#a4aa93',500,'center');}
  function drawEntity(e){const p=entityPosition(e);if(e.type==='iron'){drawIron(e,p);return;}
    garment(e.item,e.color,p.x,p.y,p.scale,p.angle);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(p.scale,p.scale);
    e.item.folds.forEach(op=>line(op.guide[0],op.guide[1],'#fffdf1',2,[7,6]));
    // Recorded player creases are ink, never correctness checks or guide snaps.
    ctx.save();path(ctx,e.item.outline);ctx.clip();
    for(const axis of e.inputs){const dx=axis.b[0]-axis.a[0],dy=axis.b[1]-axis.a[1],l=Math.hypot(dx,dy);line([axis.a[0]-dx/l*500,axis.a[1]-dy/l*500],[axis.b[0]+dx/l*500,axis.b[1]+dy/l*500],'#375d4a99',1.5);}
    ctx.restore();ctx.restore();
  }
  function draw(){ctx.clearRect(0,0,W,H);room(state.mode==='home');if(state.mode==='playing'||state.mode==='paused'){panel();ctx.save();ctx.beginPath();ctx.roundRect(318,132,1080,574,25);ctx.clip();for(const e of state.entities)drawEntity(e);if(stroke&&stroke.screen.length>1){ctx.beginPath();stroke.screen.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle='#fffaf0dd';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#91a878';ctx.shadowBlur=10;ctx.stroke();}ctx.restore();}}
  const screenPoint=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];};
  function addPoint(p){
    if(!stroke)return;stroke.screen.push(p);if(stroke.screen.length>200)stroke.screen.splice(1,1);
    for(const e of state.entities){const pos=entityPosition(e),local=C.toLocal(p,pos);if(e.type==='cloth'){if(!stroke.local.has(e.id))stroke.local.set(e.id,[]);stroke.local.get(e.id).push(local);}else if(!e.hit){const prev=stroke.iron.get(e.id)||local;stroke.iron.set(e.id,local);if(C.distanceToSegment([0,0],prev,local)<52){e.hit=true;lose('깡! 다리미는 피해주세요.','iron');if(state.mode!=='playing')return;}}}
  }
  function commitStroke(entities=state.entities){
    if(!stroke||state.mode!=='playing')return;
    let added=false;
    for(const e of entities){
      if(e.type!=='cloth'||e.release!==undefined||stroke.committed.has(e.id))continue;
      const axis=C.strokeAxis(stroke.local.get(e.id)||[],e.item.outline);
      if(axis){e.inputs.push(axis);stroke.committed.add(e.id);added=true;}
    }
    if(added)sound('line');
  }
  // Listen beyond the canvas so a stroke may start outside the play area.
  window.addEventListener('pointerdown',e=>{
    if(state.mode!=='playing'||stroke||e.button>0||e.target.closest?.('button,a'))return;
    stroke={pointer:e.pointerId,screen:[],local:new Map(),iron:new Map(),committed:new Set()};
    canvas.setPointerCapture(e.pointerId);addPoint(screenPoint(e));e.preventDefault();
  });
  window.addEventListener('pointermove',e=>{if(!stroke||stroke.pointer!==e.pointerId||state.mode!=='playing')return;addPoint(screenPoint(e));e.preventDefault();});
  window.addEventListener('pointerup',e=>{
    if(!stroke||stroke.pointer!==e.pointerId)return;addPoint(screenPoint(e));commitStroke();
    stroke=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  });
  finishPractice.onclick=()=>{const e=state.entities.find(e=>e.type==='cloth'&&e.release===undefined);if(e)e.release=state.time;};
  canvas.addEventListener('pointercancel',()=>{stroke=null;});canvas.addEventListener('lostpointercapture',()=>{stroke=null;});
  $('start').onclick=()=>start();$('practice').onclick=()=>start(true);practiceButton.onclick=()=>start();$('restart').onclick=()=>start();$('pause').onclick=pause;$('resume').onclick=resume;$('back-home').onclick=home;$('over-home').onclick=home;
  $('sound').onclick=()=>{state.muted=!state.muted;$('sound').textContent=state.muted?'♩':'♫';$('sound').setAttribute('aria-label',state.muted?'소리 켜기':'소리 끄기');$('sound').title=state.muted?'소리 켜기':'소리 끄기';};
  window.addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='KeyP'){if(state.mode==='playing')pause();else if(state.mode==='paused')resume();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;tick(dt);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
  // Explicit test mode only: deterministic browser checks without production cheats.
  if(new URLSearchParams(location.search).has('test'))window.LaundryTest={state,start,tick,draw,spawn,resolve,gameOver,entityPosition,pause,resume,renderStacks};
})();
