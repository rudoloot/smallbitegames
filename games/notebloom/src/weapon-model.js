import * as THREE from 'three';
import { weaponForId } from './weapons.js?v=40db8754166d';
const palettes = new WeakMap();
export function weaponMaterials(kind, materials) {
  if (!palettes.has(materials)) palettes.set(materials, new Map());
  const cache = palettes.get(materials);
  if (!cache.has(kind)) {
    const color = new THREE.Color(weaponForId(kind).color);
    const colored = (lightness, glow) => new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(lightness), emissive: color,
      emissiveIntensity: glow, roughness: .35, metalness: .4,
    });
    cache.set(kind, { dark: colored(.22, .08), white: colored(.85, .25),
      lilac: colored(.55, .3), mint: colored(1, .9) });
  }
  return cache.get(kind);
}
// Every weapon faces -Z. Distinct receivers, magazines, vents and muzzle hardware.
export function buildWeaponModel(kind, materials, geometries) {
  const root = new THREE.Group(), { dark, white, mint, lilac } = weaponMaterials(kind, materials);
  const part = (geo, mat, position, scale, parent = root) => {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  };
  const box = (mat, p, s, parent) => part(geometries.box, mat, p, s, parent);
  const tube = (mat, p, radius, length, parent) => {
    const mesh = part(geometries.cylinder, mat, p, [radius, length, radius], parent); mesh.rotation.x = Math.PI / 2; return mesh;
  };
  const pistol = (x, parent = root) => {
    box(dark, [x, 0, -.22], [.18, .2, .46], parent);
    box(white, [x, .11, -.25], [.2, .08, .48], parent);
    box(dark, [x, -.16, -.03], [.14, .26, .17], parent).rotation.x = -.18;
    tube(dark, [x, .035, -.52], .045, .14, parent);
    box(mint, [x, .17, -.37], [.045, .035, .08], parent);
    for (let i = 0; i < 4; i++) box(lilac, [x + .103, .09, -.13 - i * .05], [.012, .065, .012], parent);
    box(white, [x, -.13, -.21], [.025, .12, .02], parent);
  };
  if (kind === 'pistol' || kind === 'dual') {
    pistol(0); if (kind === 'dual') pistol(-.78);
    return root;
  }
  box(dark, [0, -.02, -.2], [.29, .28, .55]);
  box(white, [0, .14, -.25], [.32, .065, .56]);
  box(dark, [0, -.22, -.02], [.15, .28, .17]);
  box(lilac, [0, .015, .18], [.23, .23, .24]);
  box(dark, [0, .015, .32], [.3, .31, .07]);
  if (kind === 'machine') {
    tube(dark, [0, .02, -.86], .06, .75);
    tube(white, [0, .02, -1.18], .085, .14);
    box(lilac, [.22, -.17, -.21], [.3, .32, .3]);
    for (let i = 0; i < 6; i++) {
      box(mint, [.19 + i * .045, -.02 - i * .03, -.12], [.035, .09, .12]);
      box(dark, [0, .185, -.42 + i * .065], [.15, .025, .025]);
    }
    for (const x of [-.12, .12]) box(dark, [x, -.17, -.95], [.035, .35, .04]).rotation.z = -x * 2;
  } else if (kind === 'minigun') {
    root.scale.set(1.3, 1.3, 1.05);
    const rotor = new THREE.Group(); root.add(rotor); root.userData.rotor = rotor;
    tube(dark, [0, 0, -.35], .23, .28);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      tube(white, [Math.cos(angle) * .145, Math.sin(angle) * .145, -.85], .043, .85, rotor);
      tube(dark, [Math.cos(angle) * .145, Math.sin(angle) * .145, -1.28], .053, .06, rotor);
    }
    for (const z of [-.56, -1.12]) tube(dark, [0, 0, z], .205, .06, rotor);
    tube(lilac, [0, -.27, -.08], .2, .34);
    box(white, [0, .32, -.1], [.25, .06, .3]);
    for (const x of [-.1, .1]) box(dark, [x, .23, -.1], [.04, .18, .05]);
  } else if (kind === 'rocket') {
    root.scale.set(1.35, 1.35, 1.15);
    tube(lilac, [0, .08, -.48], .22, 1.25);
    for (const z of [-1.11, .16]) tube(dark, [0, .08, z], .25, .09);
    tube(mint, [0, .08, -1.165], .17, .02);
    box(white, [.23, .22, -.25], [.1, .12, .4]);
    box(dark, [.23, .29, -.28], [.07, .04, .24]);
    for (let i = 0; i < 3; i++) box(mint, [-.23, .08, -.12 - i * .1], [.025, .16, .045]);
  } else if (kind === 'rail') {
    root.scale.set(.9, .9, 1.25);
    for (const x of [-.12, .12]) {
      box(white, [x, .02, -.87], [.08, .15, .94]);
      box(mint, [x * .55, .02, -.87], [.026, .07, .88]);
      for (let i = 0; i < 5; i++) box(lilac, [x, .02, -.55 - i * .15], [.12, .21, .045]);
    }
    box(mint, [0, .02, -.53], [.09, .09, .18]);
    tube(dark, [0, .26, -.35], .055, .3); tube(mint, [0, .26, -.51], .045, .015);
    box(lilac, [0, -.25, -.3], [.16, .34, .16]);
  }
  return root;
}
