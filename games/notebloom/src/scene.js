import * as THREE from 'three';
import { terrainSlope } from './terrain.js?v=d1310a12066c';
import { weaponForId } from './weapons.js?v=d1310a12066c';
import { buildWeaponModel } from './weapon-model.js?v=d1310a12066c';
import { bossPose, projectilePoint } from './projectiles.js?v=d1310a12066c';

const COLORS = { mint: 0xb4ffe0, lilac: 0xcfbcff, pink: 0xffbbdc, navy: 0x343756, metal: 0xe1e4f5 };
const CHARACTER_SCALE = .7;
const SCROLL_SPEED = 3;
const material = (color, glow = 0) => new THREE.MeshStandardMaterial({ color, roughness: .65, metalness: .12, emissive: color, emissiveIntensity: glow });

export class World {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xaebcde);
    this.scene.fog = new THREE.Fog(0xb7badf, 25, 85);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(49, 1, .1, 130);
    this.camera.position.set(0, 6.6, 12.6); this.camera.lookAt(0, .8, -10);
    this.ambientLight = new THREE.HemisphereLight(0xf4efff, 0x657296, 2.2); this.scene.add(this.ambientLight);
    const sunlight = new THREE.DirectionalLight(0xffe6f4, 3.1); sunlight.position.set(-10, 18, 8); this.scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0xa0ffeb, 1.4); fill.position.set(5, 6, -10); this.scene.add(fill);
    this.sunlight = sunlight; this.fillLight = fill;
    this.materials = { road: material(0x555876), edge: material(0x99f7d2, .7), dark: material(COLORS.navy), white: material(COLORS.metal), hair: material(0xb5b4e4), mint: material(COLORS.mint, .45), lilac: material(COLORS.lilac, .2), pink: material(COLORS.pink, .2), black: material(0x35324e), mine: material(0x35334f), spike: material(0xf28ca8, .5) };
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.sphereGeo = new THREE.SphereGeometry(1, 12, 10);
    this.cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    this.notes = new Map(); this.effects = []; this.lastTime = 0;
    this.damageNumbers = []; this.damageSerial = 0; this.hitFlash = 0;
    this.damageLayer = document.createElement('div'); this.damageLayer.className = 'damage-numbers';
    this.damageLayer.setAttribute('aria-hidden', 'true'); container.appendChild(this.damageLayer);
    this.buildSky(); this.course = new THREE.Group(); this.scene.add(this.course); this.buildRoad(); this.buildGarden(); this.prepareEnvironment(); this.buildCharacter(); this.buildBoss();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.resize();
  }
  mesh(parent, geometry, mat, position, scale) {
    const obj = new THREE.Mesh(geometry, mat);
    if (position) obj.position.set(...position);
    if (scale) obj.scale.set(...scale);
    parent.add(obj); return obj;
  }
  box(parent, mat, p, s) { return this.mesh(parent, this.boxGeo, mat, p, s); }
  ball(parent, mat, p, s) { return this.mesh(parent, this.sphereGeo, mat, p, s); }
  cylinder(parent, mat, p, s) { return this.mesh(parent, this.cylinderGeo, mat, p, s); }
  buildSky() {
    const skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 256;
    const ctx = skyCanvas.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#869ccd'); gradient.addColorStop(.5, '#c9c1e1'); gradient.addColorStop(.78, '#efd2e2'); gradient.addColorStop(1, '#c0d9df');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 8, 256);
    const texture = new THREE.CanvasTexture(skyCanvas); texture.colorSpace = THREE.SRGBColorSpace;
    this.skyCanvas = skyCanvas; this.skyTexture = texture;
    this.scene.background = texture;
    this.ball(this.scene, material(0xffecdd, .25), [-12, 20, -65], [7, 7, 3]);
    const ring = this.mesh(this.scene, new THREE.TorusGeometry(10, .045, 6, 70), material(0xfff6f4, .7), [-12, 20, -65]); ring.rotation.z = -.35; ring.rotation.x = .55;
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group(); cloud.position.set(Math.sin(i * 4) * 28, 10 + (i % 4) * 3, -25 - i * 7);
      for (let j = 0; j < 3; j++) this.ball(cloud, material(0xe6ddf4), [j * 1.5, j % 2 * .25, 0], [2.1, .48, .7]);
      this.scene.add(cloud);
    }
    this.dust = [];
    const geo = new THREE.OctahedronGeometry(.05);
    for (let i = 0; i < 45; i++) { const mote = this.mesh(this.scene, geo, this.materials.mint, [Math.sin(i * 5.8) * 12, 1 + i % 8, -i * 1.5]); this.dust.push(mote); }
  }
  buildRoad() {
    this.box(this.course, this.materials.road, [0, -.23, -32], [4.88, .4, 100]);
    this.attackFloors = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 1.22;
      const attack = false;
      const mat = material(attack ? 0x9983c9 : i === 2 ? 0x718a96 : 0x667687, .12);
      // Four broad road surfaces; objects travel through their centers, not on lines.
      this.box(this.course, mat, [x, -.014, -32], [1.18, .04, 100]);
      if (attack) this.attackFloors.push(mat);
    }
    for (let i = 1; i < 4; i++) {
      this.box(this.course, material(0xb9e8e0, .25), [(i - 2) * 1.22, .006, -32], [.035, .02, 100]);
    }
    for (const side of [-1, 1]) {
      this.box(this.course, this.materials.edge, [side * 2.44, .035, -32], [.065, .09, 100]);
      this.box(this.course, this.materials.white, [side * 2.54, -.12, -32], [.12, .28, 100]);
    }
    this.beatLines = [];
    for (let i = 0; i < 26; i++) this.beatLines.push(this.box(this.course, material(0x8a8caa), [0, .007, -i * 3], [4.88, .015, .027]));
    this.box(this.course, material(0xb9ffe0, .9), [0, .04, 3.25], [4.88, .026, .06]);
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e8ddff'; ctx.font = 'bold 35px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⌁', 64, 42);
    const tex = new THREE.CanvasTexture(canvas), mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    for (const side of [-1, 1]) { const m = this.mesh(this.course, new THREE.PlaneGeometry(.8, .5), mat, [side * 1.83, .04, 1.8]); m.rotation.x = -Math.PI / 2; }
  }
  buildGarden() {
    this.garden = [];
    this.livingTrees = [];
    const trunkMat = material(0x777399), leafA = material(0xd6b6df), leafB = material(0xb8dccc), islandMat = material(0x889abb);
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group(); const side = i % 2 === 0 ? -1 : 1;
      group.position.set(side * (4.6 + (i % 3) * 1.3), -.25, 8 - i * 3.1);
      const scale = .7 + (i % 5) * .15; group.scale.setScalar(scale);
      const island = this.mesh(group, new THREE.ConeGeometry(2, 2.4, 5), islandMat, [0, -1.25, 0]); island.rotation.z = Math.PI;
      this.cylinder(group, material(0xa5c6c1), [0, -.1, 0], [1.8, .18, 1.6]);
      const tree = new THREE.Group(); group.add(tree); this.livingTrees.push(tree);
      this.cylinder(tree, trunkMat, [0, .85, 0], [.12, 1.8, .12]);
      const leaves = i % 3 ? leafA : leafB;
      this.mesh(tree, new THREE.IcosahedronGeometry(1, 0), leaves, [0, 2.2, 0], [1.35, 1.5, 1.1]);
      this.mesh(tree, new THREE.IcosahedronGeometry(1, 0), leaves, [.75, 1.85, .1], [.75, .8, .8]);
      this.mesh(group, new THREE.OctahedronGeometry(.4), this.materials.lilac, [-1, .4, .2], [.45, 1.4, .45]);
      this.course.add(group); this.garden.push(group);
    }
    // Floating gates frame the path without obscuring the notes.
    this.gates = [];
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      for (const side of [-1, 1]) {
        this.box(group, material(0xc8c5e5), [side * 3.8, 2.3, 0], [.24, 4.8, .3]);
        this.box(group, this.materials.mint, [side * 3.8, 3.9, .17], [.1, .9, .035]);
      }
      const arch = this.mesh(group, new THREE.TorusGeometry(3.8, .12, 6, 24, Math.PI), material(0xd4c9ef), [0, 4.5, 0]);
      group.position.z = -18 - i * 22; this.course.add(group); this.gates.push(group);
    }
  }
  buildCharacter() {
    const m = this.materials, root = new THREE.Group(); this.character = root; root.position.set(0, .06, 3.25);
    this.course.add(root);
    // The character faces -Z: bob-cut android, sailor-collar combat uniform.
    this.legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * .17, .7, 0);
      this.cylinder(leg, m.dark, [0, -.15, 0], [.105, .32, .105]);
      this.ball(leg, m.mint, [0, -.3, 0], [.1, .085, .1]);
      this.cylinder(leg, m.white, [0, -.47, 0], [.115, .3, .115]);
      this.box(leg, m.dark, [0, -.62, -.055], [.24, .16, .34]);
      this.box(leg, m.mint, [0, -.63, .12], [.13, .06, .018]); root.add(leg); this.legs.push(leg);
    }
    const skirt = this.mesh(root, new THREE.CylinderGeometry(.27, .47, .36, 10), m.dark, [0, .84, 0]);
    this.cylinder(root, m.lilac, [0, .675, 0], [.465, .045, .465]);
    for (let i = 0; i < 10; i++) { const angle = i * Math.PI / 5; const strip = this.box(root, m.lilac, [Math.sin(angle) * .36, .83, Math.cos(angle) * .36], [.018, .28, .028]); strip.rotation.x = Math.cos(angle) * .35; strip.rotation.z = -Math.sin(angle) * .35; }
    this.mesh(root, new THREE.CylinderGeometry(.24, .28, .5, 8), m.white, [0, 1.23, 0], [1, 1, .78]);
    this.box(root, m.dark, [0, 1.41, .17], [.47, .13, .12]);
    this.box(root, m.lilac, [0, 1.34, .234], [.35, .027, .025]);
    this.box(root, m.dark, [0, 1.04, 0], [.56, .1, .38]);
    this.ball(root, m.mint, [0, 1.2, .21], [.065, .065, .026]);
    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .35, 1.42, 0);
      this.ball(arm, m.dark, [0, -.03, 0], [.16, .17, .15]);
      this.cylinder(arm, m.white, [0, -.23, 0], [.1, .3, .1]);
      this.ball(arm, m.mint, [0, -.39, 0], [.09, .08, .09]);
      this.box(arm, m.dark, [0, -.44, -.12], [.14, .14, .3]);
      root.add(arm); this.arms.push(arm);
    }
    this.gun = new THREE.Group(); this.gun.position.set(.39, 1.02, -.3);
    root.add(this.gun); this.gunModels = new Map();
    this.head = new THREE.Group(); this.head.position.y = 1.9; root.add(this.head);
    this.ball(this.head, material(0xffe7e3), [0, 0, -.025], [.39, .4, .35]);
    this.ball(this.head, m.hair, [0, .09, .05], [.47, .45, .41]);
    this.mesh(this.head, new THREE.CylinderGeometry(.46, .44, .37, 12, 1, true, -Math.PI / 2, Math.PI), m.hair, [0, -.12, .02]);
    this.box(this.head, m.hair, [-.38, -.18, -.06], [.15, .39, .42]); this.box(this.head, m.hair, [.38, -.18, -.06], [.15, .39, .42]);
    this.box(this.head, m.dark, [0, .2, .397], [.68, .075, .04]);
    this.box(this.head, m.mint, [0, .2, .424], [.2, .04, .035]);
    for (const side of [-1, 1]) { this.ball(this.head, m.dark, [side * .44, -.02, 0], [.09, .13, .14]); this.ball(this.head, m.mint, [side * .5, -.02, 0], [.025, .07, .075]); }
    // Shoulder cape panels and a compact android spine.
    this.box(root, m.dark, [-.16, 1.36, .23], [.2, .23, .04]).rotation.z = -.25;
    this.box(root, m.dark, [.16, 1.36, .23], [.2, .23, .04]).rotation.z = .25;
    for (let i = 0; i < 3; i++) this.box(root, m.mint, [0, 1.05 + i * .08, .225], [.04, .03, .025]);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: 0x242a47, transparent: true, opacity: .3, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.025; root.add(shadow);
    this.aura = this.mesh(root, new THREE.TorusGeometry(.53, .012, 5, 35), m.mint, [0, .01, 0]); this.aura.rotation.x = Math.PI / 2;
  }
  prepareEnvironment() {
    // Clone only environment materials: notes, mines and the android keep their contrast.
    this.environmentMaterials = [];
    const clones = new Map();
    this.scene.traverse(object => {
      if (!object.isMesh || !object.material.isMeshStandardMaterial) return;
      const original = object.material;
      if (!clones.has(original)) {
        const copy = original.clone(), luminous = original.emissiveIntensity >= .2;
        clones.set(original, copy);
        this.environmentMaterials.push({ mat: copy, bright: original.color.clone(), dark: new THREE.Color(luminous ? 0x715aa8 : 0x242838), emissive: original.emissive.clone(), darkEmissive: new THREE.Color(luminous ? 0x9475df : 0x242139), glow: original.emissiveIntensity, roughness: original.roughness, metalness: original.metalness, luminous });
      }
      object.material = clones.get(original);
    });
    this.attackFloors = this.attackFloors.map(mat => clones.get(mat));
    this.obsidian = [];
    const crystalGeo = new THREE.ConeGeometry(.45, 2.5, 5);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x11131f, metalness: .72, roughness: .18, emissive: 0x281c44, emissiveIntensity: .12 });
    const thornGeo = new THREE.ConeGeometry(1, 1, 4);
    const thornMat = new THREE.MeshStandardMaterial({ color: 0x242033, metalness: .58, roughness: .22, emissive: 0x413053, emissiveIntensity: .22 });
    this.thornMaterials = [crystalMat, thornMat];
    for (let i = 0; i < this.garden.length; i++) {
      const group = new THREE.Group(); this.garden[i].add(group);
      // Replace the rounded canopy with a tall spear and sharp, branching barbs.
      this.mesh(group, thornGeo, thornMat, [0, 2, 0], [.38, 4.2, .32]);
      for (let j = 0; j < 6; j++) {
        const side = j % 2 ? 1 : -1, tier = Math.floor(j / 2);
        const barb = this.mesh(group, thornGeo, thornMat,
          [side * .42, 1.1 + tier * .85, (j % 3 - 1) * .2],
          [.23, 1.8 - tier * .22, .2]);
        barb.rotation.z = -side * (.58 - tier * .06);
        barb.rotation.x = (j % 3 - 1) * .2;
      }
      for (let j = 0; j < 3; j++) {
        const spike = this.mesh(group, crystalGeo, crystalMat, [(j - 1) * .75, .65 + j * .2, .65], [.8, .65 + j * .22, .8]);
        spike.rotation.z = (j - 1) * -.23;
      }
      this.obsidian.push(group);
    }
    this.themeBlend = -1;
    this.darkSky = ['#080b16', '#17142b', '#30223e', '#141c2c'].map(c => new THREE.Color(c));
    this.brightSky = ['#869ccd', '#c9c1e1', '#efd2e2', '#c0d9df'].map(c => new THREE.Color(c));
    this.darkFog = new THREE.Color(0x191629); this.brightFog = new THREE.Color(0xb7badf);
    this.themeColor = new THREE.Color();
    this.updateEnvironment(null);
  }
  updateEnvironment(state) {
    const mood = state?.chart?.mood;
    const hue = mood?.hue ?? .58, saturation = mood?.saturation ?? .45;
    const paletteKey = `${hue}:${saturation}`;
    if (paletteKey !== this.paletteKey) {
      this.paletteKey = paletteKey; this.themeBlend = -1;
      for (const item of this.environmentMaterials) {
        item.dark.setHSL(hue, saturation, item.luminous ? .43 : .19);
        item.darkEmissive.setHSL(hue, saturation, item.luminous ? .47 : .13);
      }
      this.darkSky.forEach((color, i) => color.setHSL(hue, saturation, [.045, .105, .20, .13][i]));
      this.darkFog.setHSL(hue, saturation, .12);
      this.moodLight = new THREE.Color().setHSL(hue, saturation * .65, .78);
      for (const mat of this.thornMaterials) {
        mat.color.setHSL(hue, saturation, .15);
        mat.emissive.setHSL(hue, saturation, .20);
      }
    }
    const progress = state && state.boss <= 0 ? THREE.MathUtils.clamp((state.time - (state.defeatedAt ?? state.time)) / 2.4, 0, 1) : 0;
    const blend = progress * progress * (3 - 2 * progress);
    if (blend === this.themeBlend) return;
    this.themeBlend = blend;
    for (const item of this.environmentMaterials) {
      item.mat.color.lerpColors(item.dark, item.bright, blend);
      item.mat.emissive.lerpColors(item.darkEmissive, item.emissive, blend);
      item.mat.emissiveIntensity = THREE.MathUtils.lerp(item.luminous ? .55 : .12, item.glow, blend);
      item.mat.roughness = THREE.MathUtils.lerp(.2, item.roughness, blend);
      item.mat.metalness = THREE.MathUtils.lerp(.65, item.metalness, blend);
    }
    this.scene.fog.color.lerpColors(this.darkFog, this.brightFog, blend);
    this.ambientLight.intensity = THREE.MathUtils.lerp(1.15, 2.2, blend);
    this.sunlight.intensity = THREE.MathUtils.lerp(1.65, 3.1, blend);
    this.sunlight.color.copy(this.moodLight).lerp(new THREE.Color(0xffe6f4), blend);
    this.fillLight.color.copy(this.moodLight).lerp(new THREE.Color(0xa0ffeb), blend);
    this.ambientLight.color.copy(this.moodLight).lerp(new THREE.Color(0xf4efff), blend);
    this.ambientLight.groundColor.copy(this.darkFog).lerp(new THREE.Color(0x657296), blend);
    this.fillLight.intensity = THREE.MathUtils.lerp(.85, 1.4, blend);
    for (const crystal of this.obsidian) {
      crystal.visible = blend < 1;
      crystal.scale.setScalar(Math.max(.001, 1 - blend));
    }
    for (const tree of this.livingTrees) {
      tree.visible = blend > 0;
      tree.scale.setScalar(Math.max(.001, blend));
    }
    const ctx = this.skyCanvas.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 0, 256);
    for (const [i, stop] of [0, .5, .78, 1].entries()) gradient.addColorStop(stop, this.themeColor.lerpColors(this.darkSky[i], this.brightSky[i], blend).getStyle());
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 8, 256); this.skyTexture.needsUpdate = true;
  }
  buildBoss() {
    const boss = new THREE.Group(); this.boss = boss; boss.position.set(0, 1.05, -52); this.course.add(boss);
    this.mesh(boss, new THREE.IcosahedronGeometry(1.05, 1), this.materials.black, [0, 0, 0], [1, .78, .7]);
    this.bossCore = this.mesh(boss, new THREE.OctahedronGeometry(.55), this.materials.pink, [0, 0, .6]);
    this.bossRing = this.mesh(boss, new THREE.TorusGeometry(1.32, .055, 6, 36), this.materials.lilac, [0, 0, 0]);
    this.bossRing.rotation.x = .4;
    for (const side of [-1, 1]) {
      this.mesh(boss, new THREE.OctahedronGeometry(.75), this.materials.dark, [side * 1.5, .05, 0], [1.2, .5, .5]);
      this.box(boss, this.materials.pink, [side * 1.4, .02, .25], [.65, .07, .1]);
      this.mesh(boss, new THREE.ConeGeometry(.25, .8, 5), this.materials.dark, [side * .6, .8, 0]);
    }
    for (let i = 0; i < 3; i++) this.mesh(boss, new THREE.OctahedronGeometry(.24), this.materials.lilac, [(i - 1) * .55, -1.05, 0], [.5, 1.4, .5]);
  }
  createNote(type, weaponId) {
    const root = new THREE.Group();
    if (type === 'weapon') {
      const model = this.weaponModel(weaponId); model.rotation.y = Math.PI / 2; model.position.set(-.2, .65, 0); model.scale.setScalar(.85); root.add(model);
      const halo = this.mesh(root, new THREE.TorusGeometry(.55, .035, 6, 24), this.materials.mint, [0, .55, 0]);
      halo.rotation.y = .2;
    } else if (type === 'note') {
      this.ball(root, this.materials.mint, [-.06, .18, 0], [.22, .17, .16]);
      this.cylinder(root, this.materials.mint, [.1, .45, 0], [.035, .53, .035]);
      const flag = this.box(root, this.materials.mint, [.23, .67, 0], [.28, .1, .07]); flag.rotation.z = -.32;
      const halo = this.mesh(root, new THREE.TorusGeometry(.31, .015, 5, 18), this.materials.white, [0, .27, -.04]); halo.rotation.y = .2;
      this.ball(root, this.materials.dark, [-.13, .23, .15], [.024, .03, .018]);
      this.ball(root, this.materials.dark, [-.02, .23, .15], [.024, .03, .018]);
    } else {
      this.ball(root, this.materials.mine, [0, .3, 0], [.29, .29, .29]);
      for (let i = 0; i < 8; i++) {
        const direction = new THREE.Vector3(Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4), i % 2 ? .35 : -.2).normalize();
        const spike = this.mesh(root, new THREE.ConeGeometry(.085, .25, 5), this.materials.spike, [direction.x * .31, .3 + direction.y * .31, direction.z * .31]);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      }
      this.box(root, this.materials.pink, [0, .3, .28], [.23, .045, .03]);
    }
    this.course.add(root); return root;
  }
  burst(lane, color) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = this.mesh(this.course, new THREE.OctahedronGeometry(.07), mat, [(lane - 1.5) * 1.22, .6, 3.25]);
      this.effects.push({ mesh, age: 0, life: .65, velocity: new THREE.Vector3(Math.sin(i * 3) * 2, 1.5 + i % 3, Math.cos(i * 3) * 1.5) });
    }
  }
  shoot(lane, weaponId = 'pistol', pellets = 1, projectiles = []) {
    const weapon = weaponForId(weaponId);
    for (let i = 0; i < pellets; i++) {
      const start = new THREE.Vector3((lane - 1.5) * 1.22 + (pellets > 1 ? (i ? -.26 : .26) : .22), .8, 2.65);
      const mesh = this.mesh(this.course, new THREE.SphereGeometry(.11, 8, 6), new THREE.MeshBasicMaterial({ color: weapon.color, toneMapped: false, fog: false }), start.toArray(), weaponId === 'rail' ? [.5,.5,45] : weaponId === 'rocket' ? [2,2,5] : [1,1,6]);
      const target = start.clone(); target.z = -32;
      this.effects.push({ mesh, age: 0, life: .6, start, target, shot: true, projectile: projectiles[i] });
    }
  }
  impact(hit) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      if (effect.projectile?.id === hit.id) { this.disposeEffect(effect.mesh); this.effects.splice(i, 1); }
    }
    const point = hit.point, color = weaponForId(hit.weapon).color;
    const ring = this.mesh(this.course, new THREE.TorusGeometry(.26, .055, 6, 20), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false }), [point.x, point.y, point.z + .04]);
    this.effects.push({ mesh: ring, age: 0, life: .22, impact: true, velocity: new THREE.Vector3() });
    for (let i = 0; i < 8; i++) {
      const mesh = this.mesh(this.course, new THREE.OctahedronGeometry(.065), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false }), [point.x, point.y, point.z]);
      this.effects.push({ mesh, age: 0, life: .28, velocity: new THREE.Vector3(Math.cos(i * Math.PI / 4) * 2.5, Math.sin(i * Math.PI / 4) * 2.5, 1.2) });
    }
    this.showDamage(hit.damage, point);
  }
  showDamage(damage, point) {
    while (this.damageNumbers.length >= 4) this.damageNumbers.shift().label.remove();
    const label = document.createElement('span'); label.className = 'boss-damage';
    label.textContent = `−${Number(damage.toFixed(1)).toLocaleString()}`;
    this.damageLayer.appendChild(label);
    this.damageNumbers.push({ label, age: 0, anchor: point ? new THREE.Vector3(point.x, point.y + 1, point.z) : this.boss.position.clone().add(new THREE.Vector3(0, 1.2, 0)), offset: (this.damageSerial++ % 3 - 1) * 22 });
    this.hitFlash = .14;
  }
  showUpgrade(weaponId, ammo) {
    this.upgradeNotice?.label.remove();
    const label = document.createElement('div'); label.className = 'upgrade-notice';
    const title = document.createElement('strong'); title.textContent = weaponId === 'pistol' ? '기본 권총 복귀' : 'WEAPON GET';
    const name = document.createElement('small'); name.textContent = weaponForId(weaponId).name;
    const count = document.createElement('small'); count.textContent = ammo === Infinity ? '탄약 무한' : '탄약 ' + ammo;
    label.append(title, name, count); this.damageLayer.appendChild(label); this.upgradeNotice = { label, age: 0 };
  }
  disposeEffect(mesh) {
    mesh.traverse(child => { if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); } });
    mesh.removeFromParent();
  }
  weaponModel(id) { return buildWeaponModel(id, this.materials, { box: this.boxGeo, sphere: this.sphereGeo, cylinder: this.cylinderGeo }); }
  setGunLevel(id) {
    if (this.gunId === id) return;
    this.gunId = id;
    if (!this.gunModels.has(id)) { const model = this.weaponModel(id); this.gunModels.set(id, model); this.gun.add(model); }
    for (const [key, model] of this.gunModels) model.visible = key === id;
  }
  clearGameObjects() {
    for (const note of this.notes.values()) this.disposeObject(note);
    this.notes.clear();
    for (const effect of this.effects) this.disposeEffect(effect.mesh);
    this.effects = [];
    for (const number of this.damageNumbers) number.label.remove();
    this.damageNumbers = []; this.hitFlash = 0;
    this.upgradeNotice?.label.remove(); this.upgradeNotice = null;
  }
  disposeObject(object) {
    // Shared geometry/materials remain owned by the scene.
    object.traverse(child => { if (child.isMesh && ![this.boxGeo, this.sphereGeo, this.cylinderGeo].includes(child.geometry)) child.geometry.dispose(); });
    object.removeFromParent();
  }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    // Preserve a safe horizontal field of view on tall phones: outer lanes,
    // the android and her pistol must fit inside the two HUD meters.
    this.camera.fov = Math.max(49, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(49 / 2)) * .68 / this.camera.aspect)));
    this.camera.updateProjectionMatrix();
  }
  render(elapsed, dt, state, playerX, mode) {
    this.updateEnvironment(state);
    const active = !!state && ['playing', 'paused', 'countdown'].includes(mode);
    const time = active ? state.time : elapsed * .28;
    const slope = state ? terrainSlope(state.chart.terrain, state.time) : 0;
    this.course.rotation.x = slope;
    // Pivot at the collection line so the runner stays stable.
    this.course.position.set(0, 3.25 * Math.sin(slope), 3.25 * (1 - Math.cos(slope)));
    this.course.updateMatrixWorld(true);
    const moving = mode === 'playing' || mode === 'home';
    const run = moving ? time * 12 * SCROLL_SPEED : 0;
    const showHome = mode === 'home' || mode === 'loading';
    this.character.position.x += ((showHome ? .7 : playerX * 1.22) - this.character.position.x) * Math.min(1, dt * 22);
    this.character.position.z = showHome ? -6 : 3.25;
    this.character.scale.setScalar((showHome ? 1.7 : 1) * CHARACTER_SCALE);
    this.character.rotation.y = showHome ? -.35 : -(playerX * 1.22 - this.character.position.x) * .13;
    this.character.position.y = .07 + Math.abs(Math.sin(run)) * .045;
    this.legs[0].rotation.x = Math.sin(run) * .38; this.legs[1].rotation.x = -Math.sin(run) * .38;
    this.arms[0].rotation.x = -.15 + Math.sin(run) * .16; this.arms[1].rotation.x = -.2;
    this.head.rotation.z = Math.sin(time * 2) * .03;
    this.aura.scale.setScalar(1 + Math.sin(time * 5) * .04);
    this.gun.scale.setScalar(1.2);
    this.setGunLevel(state?.weaponId || 'pistol');
    const rotor = this.gunModels.get(this.gunId)?.userData.rotor; if (rotor && moving) rotor.rotation.z += dt * 24;
    this.boss.visible = !state || state.boss > 0 || showHome;
    const bossPosition = bossPose(time, state?.bossMotion); this.boss.position.set(bossPosition.x, bossPosition.y, bossPosition.z);
    this.boss.rotation.z = 0; this.bossCore.rotation.y = time; this.bossRing.rotation.z = time * .3;
    for (let i = 0; i < this.beatLines.length; i++) this.beatLines[i].position.z = 9 - ((i * 3 + 80 - time * 7 * SCROLL_SPEED % 78) % 78);
    for (let i = 0; i < this.garden.length; i++) { this.garden[i].position.z = 13 - ((i * 3.1 + 105 - time * 3 * SCROLL_SPEED % 99.2) % 99.2); }
    for (let i = 0; i < this.dust.length; i++) { this.dust[i].position.y += Math.sin(elapsed + i) * dt * .12; this.dust[i].rotation.y += dt; }
    const pulse = .2 + Math.max(0, Math.sin(time / (state?.chart.beat || .5) * Math.PI * 2)) * .2;
    for (const mat of this.attackFloors) mat.emissiveIntensity = state?.attackWindow && state.boss > 0 ? pulse + .25 : .08;
    const visible = new Set();
    if (active) {
      for (let i = state.index; i < state.chart.events.length; i++) {
        const event = state.chart.events[i], until = event.time - time;
        if (until > 3 / SCROLL_SPEED) break;
        if (until < -.1 || (event.type === 'mine' && state.boss <= 0)) continue;
        visible.add(event.id);
        let mesh = this.notes.get(event.id);
        if (!mesh) { mesh = this.createNote(event.type, event.weapon); this.notes.set(event.id, mesh); }
        mesh.position.set((event.lane - 1.5) * 1.22, .12, 3.25 - until * 14 * SCROLL_SPEED);
        mesh.rotation.y = event.type === 'mine' ? time * 1.6 : Math.sin(time * 3 + event.id) * .2;
      }
    }
    for (const [id, mesh] of this.notes) if (!visible.has(id)) { this.disposeObject(mesh); this.notes.delete(id); }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; if (mode !== 'paused') e.age += dt;
      if (e.projectile) {
        const point = projectilePoint(e.projectile, state?.time ?? e.projectile.time);
        if (point.z < -70) { this.disposeEffect(e.mesh); this.effects.splice(i, 1); }
        else e.mesh.position.set(point.x, point.y, point.z);
        continue;
      }
      if (e.age >= e.life) { this.disposeEffect(e.mesh); this.effects.splice(i, 1); continue; }
      if (e.shot) e.mesh.position.lerpVectors(e.start, e.target, e.age / e.life);
      else { const effectDt = mode === 'paused' ? 0 : dt; e.mesh.position.addScaledVector(e.velocity, effectDt); e.mesh.material.opacity = 1 - e.age / e.life; if (e.impact) e.mesh.scale.setScalar(1 + e.age * 9); else e.mesh.rotation.x += effectDt * 4; }
    }
    const effectDt = mode === 'paused' ? 0 : dt;
    if (this.upgradeNotice) {
      const notice = this.upgradeNotice; notice.age += effectDt;
      if (notice.age >= 2) { notice.label.remove(); this.upgradeNotice = null; }
      else {
        this.character.updateWorldMatrix(true, false);
        const anchor = this.character.localToWorld(new THREE.Vector3(0, 3.05, 0)).project(this.camera);
        notice.label.style.left = `${(anchor.x * .5 + .5) * this.container.clientWidth}px`;
        notice.label.style.top = `${(-anchor.y * .5 + .5) * this.container.clientHeight - Math.min(notice.age, .4) * 20}px`;
        notice.label.style.opacity = Math.min(1, (2 - notice.age) / .4);
      }
    }
    this.hitFlash = Math.max(0, this.hitFlash - effectDt);
    this.bossCore.scale.setScalar(this.hitFlash > 0 ? 1.3 : 1);
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const number = this.damageNumbers[i]; number.age += effectDt;
      if (number.age >= .95) { number.label.remove(); this.damageNumbers.splice(i, 1); continue; }
      const projected = this.course.localToWorld(number.anchor.clone()).project(this.camera);
      const x = (projected.x * .5 + .5) * this.container.clientWidth + number.offset;
      const y = (-projected.y * .5 + .5) * this.container.clientHeight - number.age * 38;
      number.label.style.left = `${x}px`; number.label.style.top = `${y}px`;
      number.label.style.opacity = Math.min(1, (.95 - number.age) / .25);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
