import * as THREE from 'three';
import { createArtKit } from './art.js';

// Render the game's actual models once; cards need no extra animation loop or live contexts.
export function createEquipmentPreviews(inventory) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(320, 200);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .95;
  const art = createArtKit(renderer), scene = new THREE.Scene(), images = new Map();
  scene.add(new THREE.HemisphereLight('#fff5e9', '#c8b7aa', 1.4));
  const light = new THREE.DirectionalLight('#fff3e4', 2.6);
  light.position.set(-3, 8, 5); scene.add(light);
  const camera = new THREE.PerspectiveCamera(28, 1.6, .1, 50);
  try {
    for (const item of inventory) {
      const model = art.machine({ ...item, x: 0, y: 0, rotation: 0 });
      model.position.set(0, 0, 0); scene.add(model);
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
  } finally { art.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
}
