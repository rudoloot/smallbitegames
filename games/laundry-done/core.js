(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LaundryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FLIGHT = 2.5;
  const COLORS = ['#9eaf8b','#dfad85','#92acb5','#c3afd0','#d4be7e','#d29585','#91b7a4'];
  const rect = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const V = (x, y1, y2, side=1, guide=null) => ({a:[x,y1],b:[x,y2],side,guide:guide || [[x,y1],[x,y2]]});
  const H = (y, x1, x2, side=1, guide=null) => ({a:[x1,y],b:[x2,y],side,guide:guide || [[x1,y],[x2,y]]});
  const shirt = [[-45,-78],[-22,-87],[-14,-72],[14,-72],[22,-87],[45,-78],[84,-44],[62,-18],[45,-30],[45,83],[-45,83],[-45,-30],[-62,-18],[-84,-44]];
  const tank = [[-43,-78],[-24,-78],[-17,-52],[17,-52],[24,-78],[43,-78],[38,-22],[48,78],[-48,78],[-38,-22]];
  const pants = [[-52,-85],[52,-85],[61,85],[10,85],[0,-7],[-10,85],[-61,85]];
  const shorts = [[-63,-58],[63,-58],[68,60],[11,60],[0,5],[-11,60],[-68,60]];
  const skirt = [[-39,-83],[39,-83],[77,83],[-77,83]];
  const dress = [[-31,-100],[-15,-100],[-12,-78],[12,-78],[15,-100],[31,-100],[37,-38],[76,100],[-76,100],[-37,-38]];
  const apron = [[-30,-90],[30,-90],[35,-30],[67,90],[-67,90],[-35,-30]];
  const sock = [[-30,-82],[30,-82],[30,27],[58,41],[65,58],[57,79],[-14,79],[-30,59]];
  const glove = [[-35,-36],[-48,-58],[-62,-44],[-46,-8],[-36,6],[-32,77],[34,77],[40,-53],[26,-82],[-12,-88],[-33,-70]];
  const tie = [[-12,-100],[12,-100],[18,62],[0,100],[-18,62]];
  const brief = [[-68,-50],[68,-50],[45,-5],[21,60],[-21,60],[-45,-5]];
  const body = [[-38,-74],[-20,-82],[-12,-69],[12,-69],[20,-82],[38,-74],[65,-49],[47,-28],[37,-37],[32,29],[17,40],[17,76],[-17,76],[-17,40],[-32,29],[-37,-37],[-47,-28],[-65,-49]];
  const hoodie = [[-43,-38],[-35,-85],[-17,-104],[17,-104],[35,-85],[43,-38],[49,84],[-49,84]];
  const shirtFolds = () => [V(-15,-68,75,1,[[-15,-60],[-15,65]]),V(15,-68,75,-1,[[15,-60],[15,65]]),H(0,-15,15,1,[[-39,0],[39,0]])];
  const pantFolds = () => [V(0,-78,76,-1),H(0,-60,0,1,[[-52,0],[52,0]]),H(-42,-60,0,1,[[-48,-42],[48,-42]])];
  const clothFolds = (w,h,n) => [V(0,-h/2+8,h/2-8,-1),H(0,-w/2,0,1,[[-w/2+8,0],[w/2-8,0]]),H(-h/4,-w/2,0,1,[[-w/2+8,-h/4],[w/2-8,-h/4]])].slice(0,n);
  const entry = (name,level,kind,outline,folds) => ({name,level,kind,outline,folds});
  const clothes = [
    entry('민소매','medium','tank',tank,shirtFolds()),
    entry('폴로셔츠','medium','polo',shirt,shirtFolds()),
    entry('후드티','hard','hoodie',hoodie,[H(-38,-35,35,-1),H(23,-48,48,1),H(-7,-46,46,1)]),
    ...['맨투맨','스웨터','가디건','재킷'].map((n,i)=>entry(n,'medium',['sweat','knit','cardigan','jacket'][i],shirt,shirtFolds())),
    entry('치마','medium','skirt',skirt,pantFolds()),
    entry('원피스','hard','dress',dress,[{a:[-32,-30],b:[-57,88],side:1,guide:[[-32,-30],[-57,88]]},{a:[32,-30],b:[57,88],side:-1,guide:[[32,-30],[57,88]]},H(0,-25,25,1,[[-35,0],[35,0]])]),
    entry('잠옷 상의','medium','pajama',shirt,shirtFolds()),
    ...['잠옷 하의','레깅스','청바지','트레이닝 바지'].map((n,i)=>entry(n,'medium',['pajama-pants','leggings','jeans','joggers'][i],pants,pantFolds())),
    entry('아기옷','medium','baby',shirt,[V(-45,-70,40,1),V(45,-70,40,-1),H(0,-42,42,1)]),
    entry('아기 바디슈트','medium','bodysuit',body,[V(-36,-67,25,1),V(36,-67,25,-1),H(0,-32,32,1)]),
    entry('손수건','easy','handkerchief',rect(-65,-65,130,130),clothFolds(130,130,2)),
    entry('목도리','medium','scarf',rect(-29,-108,58,216),[H(0,-29,29,1),H(-54,-29,29,1),H(-81,-29,29,1)]),
    entry('앞치마','hard','apron',apron,[{a:[-30,-24],b:[-50,78],side:1,guide:[[-30,-24],[-50,78]]},{a:[30,-24],b:[50,78],side:-1,guide:[[30,-24],[50,78]]},H(-25,-25,25,-1)]),
    entry('베개커버','easy','pillow',rect(-65,-85,130,170),clothFolds(130,170,2)),
    ...['침대시트','담요','목욕타월'].map((n,i)=>entry(n,'medium',['sheet','blanket','bath'][i],rect(-65,-90,130,180),clothFolds(130,180,3))),
    entry('수건','easy','towel',rect(-60,-85,120,170),clothFolds(120,170,2)),
    entry('장갑','easy','glove',glove,[H(-3,-38,38,-1)]),
    entry('넥타이','medium','tie',tie,[H(0,-13,13,-1),H(50,-16,16,1)]),
    entry('양말','easy','sock',sock,[H(0,-30,30,1)]),
    entry('반팔티','medium','tee',shirt,shirtFolds()),
    entry('팬티','medium','brief',brief,[H(5,-42,42,1),V(-22,-50,5,1,[[-22,-43],[-22,35]]),V(22,-50,5,-1,[[22,-43],[22,35]])]),
    entry('반바지','easy','shorts',shorts,[V(0,-52,52,-1),H(0,-65,0,1,[[-58,0],[58,0]])]),
    entry('이불','medium','duvet',rect(-73,-95,146,190),clothFolds(146,190,3))
  ];
  const cross = (a,b,p) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  function area(poly) {return poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;}
  function inside(p,poly) {
    let result=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) result=!result;}
    return result;
  }
  function triangulate(poly) {
    const points=poly.map(p=>p.slice());if(area(points)<0)points.reverse();
    const triangles=[];let safety=0;
    while(points.length>3&&safety++<500) {
      let found=false;
      for(let i=0;i<points.length;i++) {
        const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
        if(cross(a,b,c)<=0.00001)continue;
        if(points.some(p=>p!==a&&p!==b&&p!==c&&cross(a,b,p)>=0&&cross(b,c,p)>=0&&cross(c,a,p)>=0))continue;
        triangles.push([a,b,c]);points.splice(i,1);found=true;break;
      }
      if(!found)throw new Error('Invalid garment polygon');
    }
    if(points.length===3)triangles.push(points);return triangles;
  }
  function clip(poly,a,b,side) {
    const out=[];
    for(let i=0;i<poly.length;i++) {
      const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p)*side,dq=cross(a,b,q)*side;
      if(dp>=-1e-7)out.push(p);
      if((dp>0&&dq<0)||(dp<0&&dq>0)) {const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
    }
    return out;
  }
  function reflect(p,a,b) {const dx=b[0]-a[0],dy=b[1]-a[1],t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy);return [2*(a[0]+t*dx)-p[0],2*(a[1]+t*dy)-p[1]];}
  function fold(polys,op,offset=0,angle=0) {
    const cx=(op.a[0]+op.b[0])/2,cy=(op.a[1]+op.b[1])/2,dx=op.b[0]-op.a[0],dy=op.b[1]-op.a[1],len=Math.hypot(dx,dy);
    const mx=cx-dy/len*offset,my=cy+dx/len*offset,cs=Math.cos(angle),sn=Math.sin(angle);
    const rx=(dx*cs-dy*sn)/2,ry=(dx*sn+dy*cs)/2,a=[mx-rx,my-ry],b=[mx+rx,my+ry];
    return polys.flatMap(poly=>{const fixed=clip(poly,a,b,-op.side),moving=clip(poly,a,b,op.side).map(p=>reflect(p,a,b));return [fixed,moving].filter(p=>p.length>=3&&Math.abs(area(p))>1e-5);});
  }
  // Guides are artwork only. Both the reference and the player's result use
  // actual crease axes, with a deterministic order independent of draw order.
  function canonicalAxis(axis) {
    let a=axis.a.slice(),b=axis.b.slice();
    // Choose direction by the dominant axis: a nearly horizontal line must not
    // reverse its normal just because its endpoints differ by a fraction of a pixel.
    if(Math.abs(b[1]-a[1])>Math.abs(b[0]-a[0])?b[1]<a[1]:b[0]<a[0])[a,b]=[b,a];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    return {a,b,angle:Math.atan2(dx,dy),offset:(-dy*a[0]+dx*a[1])/length};
  }
  function foldAxes(item,axes) {
    let polys=triangulate(item.outline);
    // Buckets affect scheduling only, never the actual crease coordinates.
    // Parallel folds stay in a stable spatial order under small drawing errors.
    const order=op=>[Math.round(Math.abs(op.angle)/(Math.PI/6)),Math.round(Math.abs(op.offset)/8),Math.round(op.offset/8)];
    const sorted=axes.map(canonicalAxis).sort((a,b)=>{const x=order(a),y=order(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2]||a.offset-b.offset||a.angle-b.angle;});
    for(const op of sorted){
      const positive=polys.reduce((sum,p)=>sum+Math.abs(area(clip(p,op.a,op.b,1))),0);
      const negative=polys.reduce((sum,p)=>sum+Math.abs(area(clip(p,op.a,op.b,-1))),0);
      if(Math.min(positive,negative)<1e-6)continue;
      const dx=op.b[0]-op.a[0],dy=op.b[1]-op.a[1];
      const side=Math.abs(positive-negative)<(positive+negative)*.05?(Math.abs(dx)>=Math.abs(dy)?1:-1):(positive<negative?1:-1);
      polys=fold(polys,{...op,side});
    }
    return polys;
  }
  function folded(item) {return foldAxes(item,item.folds.map(op=>({a:op.guide[0],b:op.guide[1]})));}
  function bounds(polys) {const points=polys.flat();return {minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};}
  function centered(polys) {const b=bounds(polys),x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2;return polys.map(poly=>poly.map(p=>[p[0]-x,p[1]-y]));}
  function similarity(target,result) {
    const a=centered(target),b=centered(result),bb=bounds([...a,...b]);let union=0,intersection=0;
    // Fixed 2px occupancy grid; both shapes share scale and alignment.
    for(let y=Math.floor(bb.minY);y<=bb.maxY;y+=2)for(let x=Math.floor(bb.minX);x<=bb.maxX;x+=2){const p=[x+.5,y+.5],ia=a.some(poly=>inside(p,poly)),ib=b.some(poly=>inside(p,poly));if(ia||ib)union++;if(ia&&ib)intersection++;}
    return union?intersection/union:0;
  }
  const grade = accuracy => accuracy>=.9?'Perfect':accuracy>=.7?'Great':accuracy>=.5?'Good':'Bad';
  function evaluate(item,inputs) {if(!inputs.length)return null;const target=folded(item),result=foldAxes(item,inputs),accuracy=similarity(target,result);return {target,result,accuracy,grade:grade(accuracy),score:accuracy>=.5?Math.floor(100*accuracy+1e-8):0};}
  function stageAt(time){return Math.min(6,Math.floor(time/30)+1);}
  function interval(stage){return stage<=2?3:stage<=4?2.5:2;}
  function composition(stage,rng=Math.random) {if(stage===1)return ['easy'];if(stage===6)return ['hard','hard'];if(stage<=3)return rng()<.5?['easy','easy']:['medium'];return rng()<.5?['hard']:['medium','medium'];}
  const pick=(list,rng=Math.random)=>list[Math.min(list.length-1,Math.floor(rng()*list.length))];
  function strokeAxis(points,outline) {
    if(points.length<2)return null;
    const a=points[0],b=points[points.length-1],dx=b[0]-a[0],dy=b[1]-a[1];
    if(![...a,...b].every(Number.isFinite)||Math.hypot(dx,dy)<6)return null;
    // Segment/polygon intersection, including two endpoints outside the cloth.
    const cuts=[0,1];
    for(let i=0;i<outline.length;i++){
      const p=outline[i],q=outline[(i+1)%outline.length],ex=q[0]-p[0],ey=q[1]-p[1],den=dx*ey-dy*ex;
      if(Math.abs(den)<1e-8)continue;
      const px=p[0]-a[0],py=p[1]-a[1],t=(px*ey-py*ex)/den,u=(px*dy-py*dx)/den;
      if(t>=0&&t<=1&&u>=0&&u<=1)cuts.push(t);
    }
    cuts.sort((x,y)=>x-y);
    const intersects=cuts.some((t,i)=>i&&t-cuts[i-1]>1e-6&&inside([a[0]+dx*(t+cuts[i-1])/2,a[1]+dy*(t+cuts[i-1])/2],outline));
    return intersects?{a:a.slice(),b:b.slice()}:null;
  }
  function toLocal(point,pose){const dx=point[0]-pose.x,dy=point[1]-pose.y,c=Math.cos(pose.angle||0),s=Math.sin(pose.angle||0),scale=pose.scale||1;return [(dx*c+dy*s)/scale,(-dx*s+dy*c)/scale];}
  function toWorld(point,pose){const c=Math.cos(pose.angle||0),s=Math.sin(pose.angle||0),scale=pose.scale||1;return [pose.x+scale*(point[0]*c-point[1]*s),pose.y+scale*(point[0]*s+point[1]*c)];}
  function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function position(entity,time) {const p=Math.max(0,Math.min(1,(time-entity.born)/FLIGHT));return {x:entity.x+entity.drift*(p-.5),y:(entity.floor||920)-((entity.floor||920)-entity.apex)*4*p*(1-p)};}
  const stackGroups=items=>Array.from({length:Math.ceil(items.length/10)},(_,i)=>items.slice(i*10,i*10+10));
  return {FLIGHT,COLORS,clothes,rect,inside,triangulate,fold,folded,foldAxes,bounds,centered,similarity,grade,evaluate,stageAt,interval,composition,pick,strokeAxis,toLocal,toWorld,distanceToSegment,position,stackGroups};
});
