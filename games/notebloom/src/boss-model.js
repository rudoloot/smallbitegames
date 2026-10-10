import * as THREE from 'three';
import { bossColliders } from './themes.js?v=7b71865ac2d8';

// Cut triangular armor and polygonal joints keep every silhouette angular.
// The collision data supplies the armor bounds; reflections are shared by World.
export function buildRobotBoss(theme, environment = null) {
  const root = new THREE.Group(); root.name = `robot-${theme.boss}`;
  const stageColor = new THREE.Color(theme.color);
  const alloy = (color, roughness = .16, glow = 0) => new THREE.MeshPhysicalMaterial({
    color, metalness: 1, roughness, flatShading: true, clearcoat: .8,
    clearcoatRoughness: .12, envMap: environment, envMapIntensity: 1.8,
    emissive: color, emissiveIntensity: glow, fog: false,
  });
  const metal = alloy(stageColor.clone().lerp(new THREE.Color(0xffffff), theme.id === 'black' ? .12 : .28), .12);
  const dark = alloy(stageColor.clone().multiplyScalar(.32), .22);
  const plate = alloy(stageColor, .16, .06);
  const light = alloy(theme.id === 'black' ? 0x8298ae : theme.color, .12, 1.1);
  const white = alloy(0xe8f8ff, .12, 1.1);
  const animated = [], jets = [];
  const add = (geometry, material, position, scale, parent = root) => {
    // Independent triangle normals prevent smoothing across cut faces.
    const triangles = geometry.index ? geometry.toNonIndexed() : geometry;
    if (triangles !== geometry) geometry.dispose();
    triangles.computeVertexNormals();
    const mesh = new THREE.Mesh(triangles, material); mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale); parent.add(mesh); return mesh;
  };
  const facet = (material, position, scale, parent) => add(new THREE.IcosahedronGeometry(1, 0), material, position, scale, parent);
  const box = (material, position, scale, parent) => add(new THREE.BoxGeometry(1, 1, 1), material, position, scale, parent);
  const cone = (material, position, radius, height, parent, segments = 4) => add(new THREE.ConeGeometry(radius, height, segments), material, position, null, parent);
  const link = (from, to, radius, material, parent = root) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
    const mesh = add(new THREE.CylinderGeometry(radius, radius, direction.length(), 4), material, a.add(b).multiplyScalar(.5).toArray(), null, parent);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return mesh;
  };
  const frame = (radius, width, material, position, segments = 8) => {
    const group = new THREE.Group(); group.position.set(...position); root.add(group);
    for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments;
      const from = new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      const to = new THREE.Vector3(Math.cos(b) * radius, Math.sin(b) * radius, 0);
      const direction = to.clone().sub(from);
      const bar = box(material, from.add(to).multiplyScalar(.5).toArray(), [width, direction.length() + width * .4, width], group);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }
    return group;
  };
  const jet = (x, y, z) => {
    add(new THREE.CylinderGeometry(.17, .2, .22, 4), dark, [x, y, z]);
    const glow = cone(light, [x, y - .28, z], .13, .45); glow.rotation.z = Math.PI; jets.push(glow);
  };
  const colliders = bossColliders(theme.boss);
  for (const [i, part] of colliders.entries()) {
    const angularWing = i > 0 && ['bird','shark'].includes(theme.boss);
    const geometry = angularWing ? new THREE.OctahedronGeometry(1,0) : new THREE.IcosahedronGeometry(1,0);
    const armor = add(geometry, plate, [part.x, part.y, part.z], [part.rx, part.ry, part.rz]);
    armor.userData.collider = part;
  }
  const core = add(new THREE.OctahedronGeometry(.32), light, [0, .02, .78]);
  const ring = frame(.43, .07, metal, [0, .02, .76], 6);
  for (const side of [-1, 1]) {
    box(white, [side * .34, .32, .71], [.22, .08, .055]);
    jet(side * .55, -.7, -.05);
  }

  if (theme.boss === 'octopus') {
    facet(plate, [0, .36, -.04], [.86, .8, .62]);
    box(dark, [0, .28, .72], [.87, .2, .08]);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, arm = new THREE.Group(); root.add(arm);
      const x = Math.cos(a), z = Math.sin(a);
      const points = [[x * .6, -.25, z * .3], [x * 1.25, -.5, z * .6], [x * 1.95, -.62, z * .9], [x * 2.05, -.22, z * 1.05]];
      for (let j = 0; j < points.length - 1; j++) {
        link(points[j], points[j + 1], .115 - j * .018, j % 2 ? plate : metal, arm);
        facet(light, points[j + 1], [.13, .13, .13], arm);
      }
      animated.push({ object: arm, axis: 'z', amplitude: .06, speed: 2, phase: a });
    }
  } else if (theme.boss === 'bird') {
    for (const side of [-1, 1]) {
      const wing = new THREE.Group(); root.add(wing);
      for (let i = 0; i < 4; i++) {
        const feather = box(i % 2 ? metal : plate, [side * (1.05 + i * .3), -.2 - i * .13, .36 - i * .06], [.7, .12, .8 - i * .1], wing);
        feather.rotation.z = side * -.16; feather.rotation.y = side * -.3;
        box(light, [side * (1.1 + i * .3), -.1 - i * .07, .23], [.3, .03, .025], wing);
      }
      animated.push({ object: wing, axis: 'z', amplitude: .07, speed: 2.4, phase: side > 0 ? 0 : Math.PI });
    }
    core.position.y=-.27;ring.position.y=-.27;
    const beak = cone(plate, [0, .4, 1.02], .25, .7, root, 4); beak.rotation.x = Math.PI / 2;
    for(const side of [-1,1])box(white,[side*.3,.5,.76],[.2,.08,.06]).rotation.z=side*-.18;
    for (const side of [-1, 1]) box(metal, [side * .23, .89, -.1], [.16, .42, .2]).rotation.z = side * -.2;
  } else if (theme.boss === 'ufo') {
    const rim = frame(1.7, .2, metal, [0, -.12, 0]); rim.rotation.x = Math.PI / 2; rim.scale.y = .6;
    facet(plate, [0, .4, -.05], [.72, .67, .65]);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; facet(light, [Math.cos(a) * 1.95, -.05, Math.sin(a) * .78], [.1, .07, .1]); }
    link([0, .9, 0], [0, 1.24, 0], .04, metal); facet(white, [0, 1.26, 0], [.1, .1, .1]);
    jet(-1.3, -.34, 0); jet(1.3, -.34, 0);
    animated.push({ object: rim, axis: 'y', amplitude: .15, speed: 1, phase: 0 });
  } else if (theme.boss === 'crab') {
    box(plate, [0, .18, -.1], [1.45, .85, .9]);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        link([side * .62, -.2, (i - 1) * .28], [side * 1.35, -.52, (i - 1) * .5], .07, metal);
        link([side * 1.35, -.52, (i - 1) * .5], [side * 1.65, -.7, (i - 1) * .62], .06, plate);
      }
      link([side * .75, .1, 0], [side * 1.7, .15, .3], .14, metal);
      for (const jaw of [-1, 1]) {
        link([side*1.7,.15,.38],[side*2.12,.15+jaw*.45,.6],.12,plate);
        const pincer = cone(plate, [side * 2.18, .15 + jaw * .38, .73], .18, .5, root, 4);
        pincer.rotation.z = jaw>0?Math.PI:0;
      }
      link([side * .4, .5, .3], [side * .48, .98, .35], .06, metal);
      facet(dark, [side * .48, 1, .35], [.2, .18, .16]); facet(white, [side * .48, 1, .5], [.09, .09, .035]);
    }
  } else if (theme.boss === 'snake') {
    for (let i = 0; i < 15; i++) {
      const x = -2.1 + i * .3, y = Math.sin(i * .7) * .18;
      const segment = facet(i % 2 ? plate : metal, [x, y, -.2], [.23, .29, .32]);
      box(light, [x, y + .05, .1], [.13, .035, .03]);
      animated.push({ object: segment, axis: 'z', amplitude: .09, speed: 2, phase: i * .5 });
    }
    facet(plate, [0, .08, .35], [.8, .53, .7]);
    box(dark, [0, -.25, 1], [.85, .11, .08]);
    for(const side of [-1,1])box(white,[side*.4,.29,1.01],[.22,.09,.04]).rotation.z=side*-.18;
    for (const side of [-1, 1]) cone(white, [side * .27, -.39, .96], .065, .2).rotation.z = Math.PI;
    link([0, -.25, 1.04], [0, -.32, 1.3], .025, light);
  } else if (theme.boss === 'shark') {
    facet(plate, [0, 0, .2], [.8, .64, 1.15]);
    const dorsal = cone(metal, [0, 1, -.23], .5, .9, root, 3); dorsal.scale.z = .4;
    for (const side of [-1, 1]) {
      const fin = cone(metal, [side * 1.6, -.08, -.16], .45, 1.35, root, 3); fin.rotation.z = -side * Math.PI / 2; fin.scale.z = .35;
      const tail = cone(plate, [side * .38, .15, -1.25], .32, .85, root, 3); tail.rotation.z = -side * .9;
    }
    box(dark, [0, -.25, 1.25], [.95, .26, .1]);
    for(const side of [-1,1])box(white,[side*.38,.25,1.19],[.2,.07,.03]).rotation.z=side*.2;
    for (let i = 0; i < 7; i++) cone(white, [(i - 3) * .12, -.21, 1.32], .055, .15, root, 3).rotation.z = Math.PI;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) box(dark, [side * .75, .02, .15 - i * .16], [.025, .32, .035]);
  } else if (theme.boss === 'urchin') {
    for (let i = 0; i < 18; i++) {
      const a = i * Math.PI / 9, direction = new THREE.Vector3(Math.cos(a), Math.sin(a) * .58, i % 2 ? .22 : -.22).normalize();
      const spike = cone(i % 2 ? metal : plate, [direction.x * 1.5, direction.y * 1.25, direction.z], .16, .85, root, 5);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      facet(light, [direction.x * 1.22, direction.y * 1.05, direction.z * .8], [.1, .1, .1]);
    }
    const gyro = frame(1.12, .08, light, [0, 0, 0]); gyro.rotation.y = .6;
    animated.push({ object: gyro, axis: 'z', amplitude: Math.PI, speed: .35, phase: 0 });
  } else if (theme.boss === 'rose') {
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      const petal = facet(i % 2 ? metal : plate, [Math.cos(a) * 1.27, Math.sin(a) * .74, .22], [.75, .32, .22]); petal.rotation.z = a;
      const seam = box(light, [Math.cos(a) * 1.3, Math.sin(a) * .76, .44], [.43, .025, .025]); seam.rotation.z = a;
    }
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + .3;
      const petal = facet(plate, [Math.cos(a) * .49, Math.sin(a) * .4, .6], [.52, .2, .22]); petal.rotation.z = a + .55;
    }
    link([0, -.55, 0], [0, -.95, -.1], .1, metal);
    const rotor = frame(.56, .08, light, [0, -.86, 0], 6); rotor.rotation.x = Math.PI / 2;
    animated.push({ object: rotor, axis: 'y', amplitude: Math.PI, speed: .8, phase: 0 });
  }
  // Exposed rivets and a front reactor unify the otherwise distinct silhouettes.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) facet(metal, [side * .75, -.18 + i * .2, .5], [.05, .05, .05]);
  root.userData = { kind: theme.boss, colliders, core, ring, jets, animated };
  return root;
}

export function animateRobotBoss(model, time) {
  for (const item of model.userData.animated) item.object.rotation[item.axis] = Math.sin(time * item.speed + item.phase) * item.amplitude;
  model.userData.jets.forEach((jet, i) => { jet.scale.y = 1 + Math.sin(time * 9 + i) * .15; });
}
