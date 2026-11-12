import * as THREE from 'three';
import { footprint, operatorFacing } from '../game/layout.js';
import { EQUIPMENT } from '../game/config.js';
import { shapeFor } from '../game/equipment-shapes.js';
import { createArtKit } from './art.js';

// Trim the rendered silhouette so each variant can use the full image area of its card.
function trimmedImage(source) {
  const canvas=document.createElement('canvas');
  canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(source,0,0);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
  let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
  for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++){
    if(data[(y*canvas.width+x)*4+3]<8) continue;
    left=Math.min(left,x);right=Math.max(right,x);
    top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<left) return canvas.toDataURL();
  const crop=document.createElement('canvas');
  crop.width=right-left+5;crop.height=bottom-top+5;
  crop.getContext('2d').drawImage(canvas,left,top,right-left+1,bottom-top+1,2,2,right-left+1,bottom-top+1);
  return crop.toDataURL();
}

// Render the game's actual models once; cards need no extra animation loop or live contexts.
export function createEquipmentPreviews(inventory, {inventoryView=false,stage}={}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(320, inventoryView ? 320 : 200);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .95;
  const art = createArtKit(renderer,stage), scene = new THREE.Scene(), images = new Map();
  scene.add(new THREE.HemisphereLight('#fff5e9', '#c8b7aa', 1.4));
  const light = new THREE.DirectionalLight('#fff3e4', 2.6);
  light.position.set(-3, 8, 5); scene.add(light);
  const camera = new THREE.PerspectiveCamera(28, 1.6, .1, 50);

  try {
    for (const item of inventory) {
      const key=inventoryView ? item.id : item.type;
      if(images.has(key)) continue;
      const model = item.type==='inbound' ? art.inbound({...item,x:0,y:0}) : art.machine({ ...item, x: 0, y: 0, rotation: 0 });
      scene.add(model);
      if (inventoryView) {
        const bounds=new THREE.Box3().setFromObject(model), markers=[];
        if(item.operator && shapeFor(item)?.workCell){
          const shape=footprint({...item,x:0,y:0,rotation:0}), work=shape.work[0];
          const operator=art.worker(EQUIPMENT[item.type].color,item.operator.faceStyle,item.operator);
          const facing=operatorFacing(shape);
          operator.group.position.set(work.x+.5,0,work.y+.5);
          operator.body.rotation.y=Math.atan2(facing.x,facing.y);
          scene.add(operator.group);markers.push(operator.group);bounds.expandByObject(operator.group);
        }
        const center=bounds.getCenter(new THREE.Vector3());
        const radius=bounds.getBoundingSphere(new THREE.Sphere()).radius*1.03;
        const topCamera=new THREE.OrthographicCamera(-radius,radius,radius,-radius,.1,50);
        topCamera.position.copy(center).add(new THREE.Vector3(0,10,2.2));
        topCamera.lookAt(center);
        renderer.render(scene,topCamera);
        images.set(key,trimmedImage(renderer.domElement));
        scene.remove(model,...markers);
        continue;
      }
      model.position.set(0,0,0);
      const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3());
      const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
      camera.position.copy(center).addScaledVector(new THREE.Vector3(1, 1.2, 1.4).normalize(), radius / Math.sin(THREE.MathUtils.degToRad(14)) * 1.05);
      camera.zoom = 1; camera.updateProjectionMatrix(); camera.lookAt(center); camera.updateMatrixWorld();
      let extent = 0;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      }
      camera.zoom = .92 / extent; camera.updateProjectionMatrix(); renderer.render(scene, camera);
      images.set(item.type, renderer.domElement.toDataURL('image/png'));
      scene.remove(model);
    }
    return images;
  } finally {

    art.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
}
