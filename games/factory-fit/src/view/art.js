import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EQUIPMENT, TYPES } from '../game/config.js';

// The approved concept image is the visual reference. Geometry stays in tile units.
export function createArtKit(renderer) {
  const materials = new Map(), geometries = new Map();
  let seed = 12771;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function surfaceTexture(wood = false) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = 249 + Math.floor(random() * 6);
      pixels.data.set([value, value - (wood ? 2 : 0), value - (wood ? 5 : 1), 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    if (wood) {
      for (let y = 3; y < 256; y += 5 + random() * 8) {
        ctx.strokeStyle = `rgba(112,77,41,${0.035 + random() * 0.045})`; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.bezierCurveTo(64, y + random() * 8, 184, y - random() * 7, 256, y + 1); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(126,85,49,.045)';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(36 + random() * 185, 20 + random() * 215, 24, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const textures = { clay: surfaceTexture(), wood: surfaceTexture(true) };
  const woodBump = textures.wood.clone(); woodBump.colorSpace = THREE.NoColorSpace; woodBump.needsUpdate = true;
  function material(color, kind = 'clay') {
    const key = `${color}/${kind}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, map: kind === 'metal' ? null : textures[kind] ?? textures.clay,
      roughness: kind === 'wood' ? 0.72 : kind === 'cloth' ? 0.95 : kind === 'metal' ? 0.44 : 0.61,
      metalness: kind === 'metal' ? 0.22 : 0,
      bumpMap: kind === 'wood' ? woodBump : null, bumpScale: kind === 'wood' ? 0.008 : 0,
    }));
    return materials.get(key);
  }
  function cached(key, create) { if (!geometries.has(key)) geometries.set(key, create()); return geometries.get(key); }
  function mesh(group, geometry, color, x, y, z, kind = 'clay') {
    const item = new THREE.Mesh(geometry, material(color, kind)); item.position.set(x, y, z);
    item.castShadow = true; item.receiveShadow = true; group.add(item); return item;
  }
  function box(group, w, h, d, x, y, z, color, round = true, kind = 'clay') {
    const radius = Math.min(0.12, w / 5, h / 3, d / 5);
    return mesh(group, cached(`box/${w}/${h}/${d}/${round}`, () => round ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d)), color, x, y, z, kind);
  }
  const wood = (group, w, h, d, x, y, z, color) => box(group, w, h, d, x, y, z, color, true, 'wood');
  function sphere(group, radius, x, y, z, color, scale = [1, 1, 1]) {
    const item = mesh(group, cached(`sphere/${radius}`, () => new THREE.SphereGeometry(radius, radius < .1 ? 12 : 24, radius < .1 ? 8 : 16)), color, x, y, z);
    item.scale.set(...scale); return item;
  }
  function cylinder(group, top, bottom, h, x, y, z, color, segments = 24, kind = 'clay') {
    return mesh(group, cached(`cyl/${top}/${bottom}/${h}/${segments}`, () => new THREE.CylinderGeometry(top, bottom, h, segments)), color, x, y, z, kind);
  }
  function ring(group, radius, tube, x, y, z, color) {
    return mesh(group, cached(`ring/${radius}/${tube}`, () => new THREE.TorusGeometry(radius, tube, 10, 24)), color, x, y, z);
  }
  // Collapse immutable details by material; animation and stock visibility stay on their parent groups.
  const templates = new Map();
  function compact(group, key) {
    if (!templates.has(key)) {
      group.updateWorldMatrix(true, true);
      const inverse = group.matrixWorld.clone().invert(), batches = new Map();
      group.traverse(child => {
        if (!child.isMesh || child.material.transparent) return;
        const geometry = child.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld));
        const flat = geometry.index ? geometry.toNonIndexed() : geometry;
        if (flat !== geometry) geometry.dispose();
        if (!batches.has(child.material)) batches.set(child.material, []);
        batches.get(child.material).push(flat);
      });
      const template = new THREE.Group();
      for (const [mat, parts] of batches) {
        const geometry = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) {
          const arrays = parts.map(part => part.getAttribute(name).array);
          const values = new Float32Array(arrays.reduce((sum, array) => sum + array.length, 0));
          let offset = 0; for (const array of arrays) { values.set(array, offset); offset += array.length; }
          geometry.setAttribute(name, new THREE.BufferAttribute(values, name === 'uv' ? 2 : 3));
        }
        parts.forEach(part => part.dispose()); geometry.computeBoundingSphere();
        geometries.set(`${key}/${mat.uuid}`, geometry);
        const item = new THREE.Mesh(geometry, mat); item.castShadow = item.receiveShadow = true; template.add(item);
      }
      templates.set(key, template);
    }
    const transparent = group.children.filter(child => child.isMesh && child.material.transparent);
    group.clear(); group.add(...transparent, ...templates.get(key).clone().children.slice()); return group;
  }
  const shade = (color, amount) => `#${new THREE.Color(color).lerp(new THREE.Color(amount > 0 ? '#fff1d3' : '#5b4030'), Math.abs(amount)).getHexString()}`;
  function crate(group, x, y, z, size = 0.65, color = '#c49159') {
    const item = new THREE.Group(); item.position.set(x, y, z); group.add(item);
    const post = size * 0.11, height = size * 0.78;
    for (let i = 0; i < 3; i++) wood(item, size - 0.04, size * 0.09, size / 3 - 0.014, 0, size * 0.045, (i - 1) * size / 3, color);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wood(item, post, height, post, sx * (size - post) / 2, height / 2, sz * (size - post) / 2, shade(color, 0.12));
    for (let row = 0; row < 3; row++) {
      const level = size * (0.18 + row * 0.245);
      for (const sign of [-1, 1]) {
        wood(item, size, size * 0.19, size * 0.065, 0, level, sign * size * 0.475, shade(color, row % 2 ? 0.05 : 0));
        wood(item, size * 0.065, size * 0.19, size - post, sign * size * 0.475, level, 0, color);
      }
    }
    for (const sign of [-1, 1]) { const brace = wood(item, size * 0.98, size * 0.09, size * 0.045, 0, height / 2, sign * size * 0.52, shade(color, 0.18)); brace.rotation.z = 0.55; }
    return item;
  }
  function goods(group, stage, x, y, z, size = 0.55) {
    const key = `goods/${stage}/${size}`;
    if (templates.has(key)) {
      const item = templates.get(key).clone(); item.position.set(x, y, z); group.add(item); return item;
    }
    let item;
    if (stage < 2) {
      item = new THREE.Group(); item.position.set(x, y, z); group.add(item);
      for (let i = 0; i < 3; i++) wood(item, size * (stage ? 0.87 : 1.35), size * 0.16, size * 0.25, 0, size * 0.08 + (stage ? i * size * 0.16 : 0), stage ? 0 : (i - 1) * size * 0.27, i % 2 ? '#e3b681' : '#cda069');
    } else {
      item = crate(group, x, y, z, size, stage >= 3 ? '#80a9d1' : '#c99c60');
      if (stage === 4) {
        for (let i = 0; i < 3; i++) wood(item, size, size * 0.07, size / 3 - 0.01, 0, size * 0.81, (i - 1) * size / 3, '#87afd5');
        box(item, size * 0.16, size * 0.86, size + 0.065, 0, size * 0.43, 0, '#f3d9a9');
        box(item, size + 0.065, size * 0.86, size * 0.16, 0, size * 0.43, 0, '#f3d9a9');
      }
    }
    return compact(item, key);
  }
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d'), gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(91,62,49,.28)'); gradient.addColorStop(.42, 'rgba(91,62,49,.18)'); gradient.addColorStop(1, 'rgba(91,62,49,0)');
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas); shadowMap.colorSpace = THREE.SRGBColorSpace;
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.75 });
  function contactShadow(group, w, d, x = 0, y = 0.07, z = 0) {
    const item = new THREE.Mesh(cached('shadow-plane', () => new THREE.PlaneGeometry(1, 1)), shadowMaterial);
    item.rotation.x = -Math.PI / 2; item.scale.set(w, d, 1); item.position.set(x, y, z); group.add(item); return item;
  }
  function bench(group, w, d, color) {
    for (const x of [-w / 2 + .27, w / 2 - .27]) for (const z of [-d / 2 + .26, d / 2 - .26]) {
      const leg = wood(group, .24, .92, .25, x, .46, z, '#bf9566'); leg.rotation.z = x > 0 ? -.025 : .025;
    }
    wood(group, w - .22, .13, d - .3, 0, .76, 0, '#bc9260');
    for (let i = 0; i < 4; i++) wood(group, w - .12, .23, (d - .13) / 4 - .012, 0, .92, (i - 1.5) * (d - .13) / 4, i % 2 ? shade(color, .045) : color);
  }
  function machine(item) {
    const spec = EQUIPMENT[item.type], group = new THREE.Group(), model = new THREE.Group(); group.add(model);
    const w = spec.width, d = spec.height;
    group.position.set(item.x + (item.rotation % 2 ? d : w) / 2, .07, item.y + (item.rotation % 2 ? w : d) / 2);
    model.rotation.y = -item.rotation * Math.PI / 2;
    contactShadow(model, w + .6, d + .5, 0, 0, 0);
    if (item.type === 'cutter') {
      box(model, w - .3, .85, d - .35, 0, .47, 0, '#629b82');
      box(model, w - .62, .35, .12, 0, .43, d / 2 - .12, '#68977f');
      box(model, w - .1, .15, d - .12, 0, .98, 0, '#c8cec7');
      box(model, .13, .018, 1.25, -.05, 1.062, .02, '#6c7774');
      box(model, .72, 1.05, .5, -.75, 1.34, -.5, '#76a48e');
      box(model, 1.15, .33, .36, -.25, 1.7, -.5, '#83b09d');
      const blade = cylinder(model, .45, .45, .065, -.045, 1.36, .05, '#d7d9d3', 40, 'metal'); blade.rotation.z = Math.PI / 2;
      for (let i = 0; i < 18; i++) { const angle = i / 18 * Math.PI * 2; const tooth = box(model, .07, .075, .07, -.045, 1.36 + Math.sin(angle) * .45, .05 + Math.cos(angle) * .45, '#c7cfcb'); tooth.rotation.x = -angle; }
      const coverShape = new THREE.Shape(); coverShape.moveTo(-.53, 0); coverShape.absarc(0, 0, .53, Math.PI, 0, true); coverShape.closePath();
      const cover = mesh(model, cached('saw-cover', () => new THREE.ExtrudeGeometry(coverShape, { depth: .2, bevelEnabled: true, bevelSegments: 3, bevelSize: .035, bevelThickness: .035, steps: 1, curveSegments: 20 })), '#efbb4c', -.08, 1.56, .05); cover.rotation.y = Math.PI / 2;
      for (const y of [.34, .46, .58]) box(model, .025, .045, .52, w / 2 - .14, y, -.25, '#618b76');
      const button = cylinder(model, .095, .095, .045, w / 2 - .12, .65, .45, '#ed9851'); button.rotation.z = Math.PI / 2;
    } else if (item.type === 'paint') {
      for (const x of [-.7, .7]) for (const z of [-1.15, 1.15]) box(model, .22, .92, .23, x, .46, z, '#8fa4b1');
      box(model, w - .12, .22, d - .15, 0, .9, 0, '#9cb9d5');
      for (const x of [-w / 2 + .15, w / 2 - .15]) { const near = x > 0; box(model, .19, near ? .53 : .98, d - .25, x, near ? 1.175 : 1.4, 0, '#88a9ce'); }
      box(model, w - .22, .98, .18, 0, 1.4, -d / 2 + .17, '#88a9ce');
      box(model, w - .09, .22, .76, 0, 1.99, -.98, '#9ab6d5');
      box(model, .5, .38, .49, 0, 2.26, -1.02, '#b1b7b6');
      const light = box(model, .82, .045, .17, 0, 1.85, -1.12, '#fff0b0'); if (!materials.has('booth-light')) materials.set('booth-light', new THREE.MeshStandardMaterial({ color: '#fff2c1', emissive: '#ffe3a0', emissiveIntensity: .6, roughness: .6 })); light.material = materials.get('booth-light');
      const tin = cylinder(model, .16, .16, .26, .56, 1.12, .28, '#f0c267'); ring(model, .16, .025, .56, 1.255, .28, '#f5d690').rotation.x = Math.PI / 2;
    } else {
      bench(model, w, d, item.type === 'assembly' ? '#ca9659' : '#d1a05f');
      if (item.type === 'assembly') {
        wood(model, .95, .07, .15, -.65, 1.09, -.95, '#ebc58e');
        const handle = cylinder(model, .045, .045, .43, .91, 1.1, -.76, '#b6834b'); handle.rotation.z = Math.PI / 2;
        box(model, .18, .14, .32, 1.12, 1.15, -.76, '#899a9b');
        box(model, .34, .21, .32, -1.12, 1.13, -.82, '#7d9995');
      } else {
        ring(model, .17, .07, .52, 1.21, -.48, '#f1ce7d');
        wood(model, .5, .035, .4, -.5, 1.055, -.5, '#ecd5ac');
        ring(model, .085, .025, -.57, 1.11, -.52, '#6b929d').rotation.x = Math.PI / 2;
      }
    }
    compact(model, `machine/${item.type}`);
    const stage = spec.inputStage, top = item.type === 'paint' ? 1.02 : 1.065;
    const processingItem = goods(model, stage, item.type === 'cutter' ? -.65 : 0, top, item.type === 'assembly' || item.type === 'packing' ? -.35 : 0, .7); processingItem.visible = false;
    const positions = item.type === 'cutter' ? [[-.85, .6], [.85, .6]] : item.type === 'assembly' ? [[-.85, .85], [.85, .85]] : item.type === 'paint' ? [[-.4, 1], [.4, 1]] : [[-.43, .55], [.43, .55]];
    const outputItems = positions.map(([x, z]) => { const output = goods(model, spec.outputStage, x, top, z, .54); output.visible = false; return output; });
    group.userData.inventory = { processingItem, outputItems };
    group.traverse(obj => { if (obj.isMesh) obj.userData.machineId = item.id; }); return group;
  }
  function worker(color, index = 0) {
    const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
    group.scale.setScalar(1.1);
    contactShadow(group, .85, .68, 0, .003, 0);
    const head = new THREE.Group(); head.position.y = 1.08; body.add(head);
    sphere(head, .31, 0, 0, 0, '#edc5a1', [1.02, 1.02, .96]);
    sphere(head, .29, 0, -.045, -.075, '#795337', [1, .92, .8]);
    for (const sign of [-1, 1]) {
      sphere(head, .065, sign * .29, -.015, 0, '#e5b58d', [.7, 1, .8]);
      sphere(head, .034, sign * .108, .015, .281, '#3d392f', [.82, 1.1, .55]);
      sphere(head, .043, sign * .211, -.07, .214, '#eab393', [1.15, .7, .5]);
      box(head, .11, .15, .12, sign * .245, .005, -.12, '#795337');
    }
    sphere(head, .055, 0, -.055, .298, '#e4b58d', [.85, .8, .8]);
    const hat = index % 2 ? '#7199c9' : '#efbd4c';
    const dome = mesh(head, cached('helmet-dome', () => new THREE.SphereGeometry(.355, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), hat, 0, .16, -.015); dome.scale.z = 1.04;
    cylinder(head, .374, .374, .048, 0, .17, 0, hat, 32);
    box(head, .48, .05, .25, 0, .17, .265, hat);
    box(head, .055, .048, .47, 0, .5, -.015, shade(hat, .12));
    box(head, .11, .04, .018, 0, .215, .35, color);
    compact(head, `head/${color}/${index % 2}`);
    box(body, .4, .4, .32, 0, .62, 0, '#e2dfcf', true, 'cloth');
    box(body, .32, .3, .065, 0, .57, .173, '#7297b1', true, 'cloth');
    box(body, .15, .12, .035, 0, .57, .219, '#6489a5', true, 'cloth');
    for (const sign of [-1, 1]) { box(body, .055, .3, .045, sign * .115, .73, .18, '#7297b1'); box(body, .055, .35, .045, sign * .115, .65, -.17, '#7297b1'); sphere(body, .018, sign * .115, .66, .211, '#ebcf8a'); }
    const legs = [-.115, .115].map(x => { const leg = new THREE.Group(); leg.position.set(x, .38, 0); body.add(leg); box(leg, .17, .27, .18, 0, -.12, 0, '#668ba4', true, 'cloth'); box(leg, .2, .14, .29, 0, -.31, .045, '#627375'); return leg; });
    const arms = [-1, 1].map(sign => { const arm = new THREE.Group(); arm.position.set(sign * .235, .75, 0); body.add(arm); sphere(arm, .105, 0, -.08, 0, '#e0ddcd', [.85, 1.35, 1]); sphere(arm, .085, 0, -.28, .045, '#edc39a', [.9, 1.1, 1]); return arm; });
    const cargo = Array.from({ length: 5 }, (_, stage) => { const item = goods(body, stage, 0, .4, .4, .43); item.visible = false; return item; });
    const marker = sphere(group, .09, 0, 1.85, 0, '#f1c366'); marker.visible = false;
    return { group, body, head, arms, legs, cargo, marker };
  }
  function plant(group, x, z) {
    cylinder(group, .27, .2, .4, x, .18, z, '#d59a71');
    ring(group, .25, .045, x, .39, z, '#e2b18c').rotation.x = Math.PI / 2;
    cylinder(group, .21, .21, .03, x, .39, z, '#8c7352');
    for (let i = 0; i < 5; i++) { const angle = i * Math.PI * 2 / 5; const leaf = sphere(group, .25, x + Math.cos(angle) * .15, .65 + i % 2 * .05, z + Math.sin(angle) * .15, i % 2 ? '#a6bb79' : '#8ba967', [.55, 1.3, .65]); leaf.rotation.z = -Math.cos(angle) * .4; leaf.rotation.x = Math.sin(angle) * .4; }
    contactShadow(group, .85, .75, x, .069, z);
  }
  function audit() {
    let invalid = 0, triangles = 0;
    for (const geometry of geometries.values()) {
      const p = geometry.getAttribute('position'); for (const value of p.array) if (!Number.isFinite(value)) invalid++;
      triangles += (geometry.index ? geometry.index.count : p.count) / 3;
    }
    return { geometries: geometries.size, materials: materials.size, cachedTriangles: Math.round(triangles), invalidValues: invalid, proceduralTextures: 3 };
  }
  return { box, wood, sphere, cylinder, ring, crate, goods, material, contactShadow, compact, machine, worker, plant, audit };
}
