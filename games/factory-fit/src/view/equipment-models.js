import * as THREE from 'three';
import { EQUIPMENT_SHAPES } from '../game/equipment-shapes.js';

// Trace only exposed edges; shared tile edges never become visible model seams.
function silhouette(mask) {
  const edges = new Map(), key = p => p.join(',');
  for(let y=0;y<mask.length;y++)for(let x=0;x<mask[y].length;x++)if(mask[y][x]!=='.') {
    const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];
    for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],reverse=`${key(b)}:${key(a)}`;
      if(edges.has(reverse))edges.delete(reverse);else edges.set(`${key(a)}:${key(b)}`,[a,b]);}
  }
  const next=new Map([...edges.values()].map(([a,b])=>[key(a),b])),start=edges.values().next().value[0],points=[];
  let p=start;do{points.push(p);p=next.get(key(p));}while(key(p)!==key(start));
  return points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
}

// Tile-unit construction: empty polyomino cells never receive a cabinet or tabletop.
export function buildEquipment(type, kit) {
  const spec = EQUIPMENT_SHAPES[type], group = new THREE.Group();
  const { box, cylinder, sphere, wood, material, cached } = kit;
  const body = '#788665', dark = '#414b3c', gold = '#efb83c', metal = '#aeb6ad', cream = '#e4d9bb';
  const paint = material(body); paint.userData.equipmentBody = true;
  const part = (w,h,d,x,y,z,c=body) => box(group,w,h,d,x-spec.width/2+.5,y,z-spec.height/2+.5,c);
  const cyl = (r,h,x,y,z,c=metal,r2=r) => cylinder(group,r,r2,h,x-spec.width/2+.5,y,z-spec.height/2+.5,c);
  const ball = (r,x,y,z,c) => sphere(group,r,x-spec.width/2+.5,y,z-spec.height/2+.5,c);
  const plank = (w,h,d,x,y,z) => wood(group,w,h,d,x-spec.width/2+.5,y,z-spec.height/2+.5,'#c99b5e');
  const screen = (x,z) => { part(.65,.48,.10,x,1.52,z,dark); part(.55,.35,.025,x,1.53,z+.065,'#83c8b7'); part(.08,.22,.12,x,1.18,z,metal); };
  const controls = (x,z,y=1.4) => { for(let i=0;i<3;i++) ball(.045,x+.14*i,y,z,['#e1b546','#c7684c','#a3c78d'][i]); };
  const handle = (x,z) => part(.24,.045,.06,x,.66,z,cream);
  const cabinetTop = 1.05;
  const contour=silhouette(spec.mask);
  const directions=(p,i)=>{
    const before=contour[(i+contour.length-1)%contour.length],after=contour[(i+1)%contour.length];
    return [[Math.sign(p[0]-before[0]),Math.sign(p[1]-before[1])],[Math.sign(after[0]-p[0]),Math.sign(after[1]-p[1])]];
  };
  function shell(inset,height,bottom,color,kind='clay') {
    const geometry=cached(`unified-shell/${type}/${inset}/${height}`,()=>{
      const shape=new THREE.Shape();
      contour.forEach((p,i)=>{const [a,b]=directions(p,i);
        const x=p[0]-(a[1]+b[1])*inset-spec.width/2,z=p[1]+(a[0]+b[0])*inset-spec.height/2;
        if(i===0)shape.moveTo(x,-z);else shape.lineTo(x,-z);
      });shape.closePath();
      const g=new THREE.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:1});
      g.rotateX(-Math.PI/2);return g;
    });
    const mesh=new THREE.Mesh(geometry,material(color,kind));mesh.position.y=bottom;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  shell(.08,.67,.23,body);
  shell(.035,.14,.9,'#c99b5e','wood');
  // Feet at external corners only, instead of four feet per tile.
  contour.forEach((p,i)=>{const [a,b]=directions(p,i);if(a[0]*b[1]-a[1]*b[0]>0)
    part(.14,.19,.14,p[0]-(a[1]+b[1])*.19-.5,.13,p[1]+(a[0]+b[0])*.19-.5,dark);
  });
  const fronts=contour.map((p,i)=>[p,contour[(i+1)%contour.length]]).filter(([a,b])=>a[1]===b[1]&&b[0]<a[0]).sort(([a,b],[c,d])=>(c[0]-d[0])-(a[0]-b[0]));
  const [a,b]=fronts[0],frontX=(a[0]+b[0])/2-.5,frontZ=a[1]-.565;
  part(a[0]-b[0]-.35,.43,.025,frontX,.56,frontZ);handle(frontX,frontZ+.035);
  const outputY=spec.mask.findIndex(row=>row.includes('O')), outputX=spec.mask[outputY].indexOf('O');
  // One full tile is reserved for goods. Rim and arrow stay within that tile.
  part(.92,.035,.92,outputX,1.065,outputY,'#278f88');
  for(const dx of [-.46,.46]) part(.045,.13,.96,outputX+dx,1.12,outputY,body);
  part(.88,.13,.045,outputX,1.12,outputY-.46,body);
  part(.09,.012,.36,outputX,1.09,outputY,cream);
  for(const sign of [-1,1]) { const p=part(.09,.012,.23,outputX+sign*.065,1.09,outputY+.12,cream); p.rotation.y=sign*Math.PI/4; }

  if(type==='cutter') {
    for(let x=0;x<2.4;x+=.3) { const p=cyl(.065,.78,x,1.1,0,metal); p.rotation.x=Math.PI/2; }
    part(.45,.72,.6,.6,1.48,0); part(.13,.12,.7,1.4,1.1,0,dark);
    const blade=cyl(.36,.06,1.4,1.37,0,metal); blade.rotation.z=Math.PI/2;
    for(let i=0;i<14;i++){const a=i*Math.PI/7;part(.09,.07,.07,1.4,1.37+Math.sin(a)*.36,Math.cos(a)*.36,metal);}
    const guard=cyl(.4,.16,1.3,1.57,0,gold); guard.rotation.z=Math.PI/2;
    part(.06,.30,.06,1.15,1.94,0,dark); part(.4,.06,.06,1,2.08,0,dark);
  } else if(type==='machining') {
    part(1.75,.12,.9,.5,2.38,0); part(.22,1.32,.9,-.27,1.73,0); part(.22,1.32,.9,1.27,1.73,0);
    part(1.55,1.25,.12,.5,1.72,-.4); cyl(.16,.55,.5,1.99,0,gold); cyl(.045,.24,.5,1.61,0,metal);
    part(.7,.08,.65,.5,1.16,0,metal); controls(1,1,1.2);
  } else if(type==='grinder') {
    const wheel=cyl(.36,.17,0,1.43,0,'#cf974f'); wheel.rotation.z=Math.PI/2;
    part(.25,.4,.45,-.25,1.25,0); part(.5,.10,.3,0,1.13,.2,metal);
  } else if(type==='injection') {
    part(2.05,1.05,.87,1,1.57,0); part(1.3,.66,.045,1,1.56,.46,dark);
    part(.95,.48,.025,1,1.56,.49,'#bb9760'); part(.3,.7,.7,2.27,1.4,0);
    cyl(.22,.4,0,2.24,0,gold,.10); cyl(.3,.1,0,2.48,0,gold); controls(2,1,1.27);
    const chute=part(.65,.08,.9,3,1.26,.5,metal); chute.rotation.x=.35;
    for(let i=0;i<4;i++) part(.45,.04,.025,0,1.33+i*.12,.46,dark);
  } else if(type==='press') {
    for(const x of [0,2]) part(.22,1.3,.55,x,1.65,0);
    part(2.3,.25,.65,1,2.27,0); cyl(.23,.25,1,2.52,0,gold);
    cyl(.12,.8,1,1.9,0,metal); part(.7,.17,.65,1,1.35,0,metal); part(.85,.15,.72,1,1.13,0,dark);
  } else if(type==='joining') {
    part(.7,.60,.1,0,1.4,-.38,gold); part(.1,.60,.75,-.37,1.4,0,gold);
    part(.12,.7,.12,1,1.5,.75); part(.7,.12,.12,.75,1.85,.75);
    cyl(.08,.32,.45,1.65,.75,metal); part(.55,.07,.5,1,1.12,1,metal);
  } else if(type==='gluing') {
    part(.12,.85,.14,0,1.5,0); part(.9,.13,.18,.4,1.9,0);
    cyl(.17,.4,.75,1.64,0,gold); cyl(.05,.12,.75,1.38,0,cream);
  } else if(type==='painting') {
    part(2.7,1.05,.13,1,1.57,-.4); part(2.9,.16,.9,1,2.15,0);
    for(const x of [-.35,2.35]) part(.14,1.05,.9,x,1.57,0);
    part(1.1,.08,.1,1,2.02,.3,cream); cyl(.24,.4,1,2.42,0); controls(0,1,1.2);
  } else if(type==='heating') {
    part(1.85,1.15,1.8,.5,1.6,.5); part(1.35,.7,.06,.5,1.55,1.43,dark);
    part(1.14,.5,.04,.5,1.55,1.47,'#c87325');
    for(let i=0;i<4;i++)part(.07,.4,.025,.15+i*.23,1.55,1.5,gold);
    for(let i=0;i<3;i++) part(.8,.025,.055,.5,2.19,.2+i*.18,dark);
    controls(1,1.48,1.13);
  } else if(type==='cutting'||type==='packing') {
    const length=type==='cutting'?2:1.4;
    const roll=cyl(.22,length,length/2-.2,1.45,0,cream);roll.rotation.z=Math.PI/2;
    for(const x of [-.35,length-.05])part(.1,.5,.23,x,1.3,0);
    plank(length,.025,.5,length/2-.2,1.065,.2);
    if(type==='packing') {part(.55,.5,.55,2,1.34,0,'#c49a64');part(.48,.035,.48,2,1.60,0,'#8e6d43');}
    else {part(.48,.03,.05,2.3,1.09,0,metal).rotation.y=.4;part(.48,.035,.05,2.3,1.11,0,metal).rotation.y=-.4;}
  } else if(type==='sewing') {
    part(.75,.1,.65,0,1.13,0,cream);part(.18,.65,.36,.26,1.46,0,cream);part(.65,.2,.36,0,1.77,0,cream);
    cyl(.025,.33,-.25,1.5,0,metal);cyl(.1,.24,.25,2,0,cream);ball(.12,.3,1.55,.22,gold);
  } else if(type==='assembly') {
    part(1.2,.02,.65,1.4,1.06,0,'#527d71');
    for(let i=0;i<5;i++)part(.008,.006,.65,.9+i*.23,1.075,0,'#b0c9a2');
    plank(.6,.05,.08,.2,1.09,0);part(.22,.14,.2,-.05,1.15,0,metal);part(.6,.17,.45,2.7,1.15,0,gold);
  } else if(type==='electronics') {
    screen(1,-.12);part(.75,.025,.55,1,1.065,1,'#3e8e6c');
    for(let i=0;i<3;i++)part(.12,.06,.12,.8+i*.2,1.11,1,dark);
    cyl(.09,.4,0,1.27,0,metal);part(.5,.12,.4,0,1.12,0,gold);
  } else if(type==='inspection') {
    screen(0,-.15);part(.5,.03,.6,1,1.07,0,dark);part(.12,.8,.16,1.25,1.47,-.25);
    part(.55,.12,.18,1.05,1.9,-.25);cyl(.13,.18,.85,1.74,-.25,gold);
  } else if(type==='casting') {
    part(1.65,1.3,.85,.4,1.7,0);part(1.2,.55,.04,.4,1.6,.45,dark);
    for(let i=0;i<5;i++)part(.09,.40,.03,i*.22,1.6,.48,gold);
    cyl(.25,.4,.3,2.55,0,dark);part(1.5,.2,.85,2.5,2.14,0,cream);
    for(const x of [2,3])part(.12,.85,.12,x,1.65,0,metal);
    part(1.5,.12,.75,2.5,1.17,0,metal);for(const x of [2.15,2.8])part(.4,.025,.4,x,1.25,0,dark);
  } else if(type==='filling') {
    cyl(.38,.5,0,1.93,0,cream,.13);cyl(.38,.09,0,2.2,0,gold);cyl(.32,.03,0,2.25,0,'#f4ead6');
    for(const dx of [-.3,.3])part(.08,.6,.1,dx,1.4,0);
    part(.85,.14,.18,.5,1.9,0,dark);cyl(.10,.5,1,1.65,0,gold);
    ball(.16,1,1.2,0,cream);
  }
  // Fixed production anchors are independent from camera and rotation.
  group.userData.outputAnchor = new THREE.Vector3(outputX+.5-spec.width/2, cabinetTop+.08, outputY+.5-spec.height/2);
  group.userData.processAnchor = new THREE.Vector3(.5-spec.width/2, cabinetTop+.08, .5-spec.height/2);
  return group;
}
