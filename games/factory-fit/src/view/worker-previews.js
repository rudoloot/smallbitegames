import * as THREE from 'three';
import {createArtKit} from './art.js';

// Portraits are renders of exactly the same worker model used on the factory floor.
export function createWorkerPreviews(workers) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(240,240);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;
  const art=createArtKit(renderer),scene=new THREE.Scene(),images=new Map();
  scene.add(new THREE.HemisphereLight('#fff5e9','#c8b7aa',1.5));
  const sun=new THREE.DirectionalLight('#fff3e4',2.6);sun.position.set(-3,5,6);scene.add(sun);
  const camera=new THREE.OrthographicCamera(-.60,.60,.60,-.60,.1,20);
  camera.position.set(.12,1.53,5);camera.lookAt(0,1.38,0);
  try {
    workers.forEach((worker,index)=>{
      const model=art.worker(worker.color,index,worker);scene.add(model.group);
      renderer.render(scene,camera);images.set(worker.key,renderer.domElement.toDataURL('image/png'));scene.remove(model.group);
    });return images;
  } finally {art.dispose();renderer.dispose();renderer.forceContextLoss();}
}
