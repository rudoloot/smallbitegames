import * as THREE from 'three';
import { MAX_TERRAIN_SLOPE, roadProfile, roadHeight, roadPitch, terrainScroll, ROAD_SCROLL_FACTOR } from './terrain.js?v=65c6e7f65907';
import { weaponForId, attackForEnergy, chargeColorForWeapon } from './weapons.js?v=65c6e7f65907';
import { buildWeaponModel } from './weapon-model.js?v=65c6e7f65907';
import { bossPose, projectilePoint } from './projectiles.js?v=65c6e7f65907';
import { COLLECTION_Z, visibleNotes } from './timing.js?v=65c6e7f65907';
import { themeForChart } from './themes.js?v=65c6e7f65907';
import { buildRobotBoss, animateRobotBoss } from './boss-model.js?v=65c6e7f65907';
import { advanceFirework, fireworkForwardDistance, fireworkLifetime } from './fireworks.js?v=65c6e7f65907';
import { bossRotation, bossWeakPointAt, bossShieldAt, BOSS_SHIELD_RADIUS } from './boss-rotation.js?v=65c6e7f65907';

const COLORS = { mint: 0xb4ffe0, lilac: 0xcfbcff, pink: 0xffbbdc, navy: 0x343756, metal: 0xe1e4f5 };
const CHARACTER_SCALE = .7;
const SCROLL_SPEED = 3;
const RAINBOW_HUES = [0, .075, .145, .36, .59, .68, .78];
const SKY_STOPS = [0, .16, .32, .5, .66, .83, 1];
const FLAT_TERRAIN = { step: 1, slopes: [0] };
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
    // A single studio reflection map gives the boss armor sharp metallic highlights.
    // Assign it to boss materials only so the course and character keep their look.
    const studio = new THREE.Scene(), reflections = new THREE.PMREMGenerator(this.renderer);
    studio.background = new THREE.Color(0x60646d);
    const cards = [
      { p: [-5, 4, 6], size: [2, 7], brightness: 3 },
      { p: [6, 2, 2], size: [1.5, 5], brightness: 2 },
      { p: [0, 7, -5], size: [7, 2], brightness: 2.5 },
    ];
    for (const card of cards) {
      const color = new THREE.Color().setRGB(card.brightness, card.brightness, card.brightness);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(...card.size), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      panel.position.set(...card.p); panel.lookAt(0, 0, 0); studio.add(panel);
    }
    this.bossReflections = reflections.fromScene(studio, .02);
    studio.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
    reflections.dispose();
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
    this.playerFeedback = [];
    this.pendingImpacts = [];
    this.damageLayer = document.createElement('div'); this.damageLayer.className = 'damage-numbers';
    this.damageLayer.setAttribute('aria-hidden', 'true'); container.appendChild(this.damageLayer);
    this.weakPointMarker = document.createElement('div'); this.weakPointMarker.className = 'weak-point hidden';
    const weakCircle = document.createElement('i'), weakLabel = document.createElement('strong');
    weakLabel.textContent = 'Week Point'; this.weakPointMarker.append(weakCircle, weakLabel); this.damageLayer.append(this.weakPointMarker);
    this.shieldLabel = document.createElement('strong'); this.shieldLabel.className = 'shield-label hidden';
    this.shieldLabel.textContent = 'Shield'; this.damageLayer.append(this.shieldLabel);
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
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      // Keep the whole cloud outside the road corridor and above its steepest ascent.
      const z = -28 - i * 6, side = i % 2 ? -1 : 1;
      const height = Math.max(16, (COLLECTION_Z - z) * Math.tan(MAX_TERRAIN_SLOPE) + 8);
      const cloud = new THREE.Group(); cloud.position.set(side * (16 + i % 3 * 5), height + i % 3, z);
      cloud.userData.rainbowHue = RAINBOW_HUES[i % RAINBOW_HUES.length];
      for (let j = 0; j < 3; j++) this.ball(cloud, material(0xe6ddf4), [j * 1.5, j % 2 * .25, 0], [2.1, .48, .7]);
      this.scene.add(cloud); this.clouds.push(cloud);
    }
    this.dust = [];
    const geo = new THREE.OctahedronGeometry(.05);
    for (let i = 0; i < 45; i++) { const mote = this.mesh(this.scene, geo, this.materials.mint, [Math.sin(i * 5.8) * 12, 1 + i % 8, -i * 1.5]); this.dust.push(mote); }
  }
  buildRoad() {
    this.roadMeshes = [];
    this.roadBox(this.materials.road, [0, -.23, -32], [4.88, .4, 100]);
    this.attackFloors = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 1.22;
      const attack = false;
      const mat = material(attack ? 0x9983c9 : i === 2 ? 0x718a96 : 0x667687, .12);
      // Four broad road surfaces; objects travel through their centers, not on lines.
      this.roadBox(mat, [x, -.014, -32], [1.18, .04, 100]).userData.rainbowHue = [0, .145, .36, .59][i];
      if (attack) this.attackFloors.push(mat);
    }
    for (let i = 1; i < 4; i++) {
      this.roadBox(material(0xb9e8e0, .25), [(i - 2) * 1.22, .006, -32], [.035, .02, 100]);
    }
    for (const side of [-1, 1]) {
      this.roadBox(this.materials.edge, [side * 2.44, .035, -32], [.065, .09, 100]);
      this.roadBox(this.materials.white, [side * 2.54, -.12, -32], [.12, .28, 100]);
    }
    this.beatLines = [];
    for (let i = 0; i < 26; i++) this.beatLines.push(this.box(this.course, material(0x8a8caa), [0, .007, -i * 3], [4.88, .015, .027]));
    this.box(this.course, material(0xb9ffe0, .9), [0, .04, COLLECTION_Z], [4.88, .026, .06]);
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e8ddff'; ctx.font = 'bold 35px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⌁', 64, 42);
    const tex = new THREE.CanvasTexture(canvas), mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    for (const side of [-1, 1]) { const m = this.mesh(this.course, new THREE.PlaneGeometry(.8, .5), mat, [side * 1.83, .04, 1.8]); m.rotation.x = -Math.PI / 2; }
  }
  roadBox(mat, position, size) {
    const mesh = this.mesh(this.course, new THREE.BoxGeometry(...size, 1, 1, 120), mat, position);
    mesh.userData.roadSurface = size[0] > .5;
    this.roadMeshes.push({ mesh, base: mesh.geometry.attributes.position.array.slice() });
    return mesh;
  }
  height(z) { return roadHeight(this.trackProfile, z); }
  trackPoint(point) {
    // Lift the hovering boss above the next crest; projectiles and hit effects
    // share this mapping so every visible impact still touches the same hull.
    const approach = THREE.MathUtils.smoothstep(-point.z, 30, 45);
    const height = THREE.MathUtils.lerp(this.height(point.z), this.height(-52) + (this.bossLift ?? 0), approach);
    return new THREE.Vector3(point.x, point.y + height, point.z);
  }
  updateRoad(profile, time) {
    if ((!profile && !this.trackProfile) || (this.trackProfile && this.lastTerrain === profile && this.lastTerrainTime === time)) return;
    this.lastTerrain = profile; this.lastTerrainTime = time;
    this.trackProfile = profile ? roadProfile(profile, time, COLLECTION_Z) : null;
    let crest = 0;
    for (let z = COLLECTION_Z; z >= -52; z--) crest = Math.max(crest, this.height(z));
    this.bossLift = this.trackProfile ? Math.max(0, crest - this.height(-52) + 1.5) : 0;
    this.camera.position.y = this.trackProfile ? 7.6 + crest * .45 : 6.6;
    for (const { mesh, base } of this.roadMeshes) {
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) position.setY(i, base[i * 3 + 1] + this.height(base[i * 3 + 2] + mesh.position.z));
      position.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    }
    for (const gate of this.gates) { gate.position.y = this.height(gate.position.z); gate.rotation.x = roadPitch(this.trackProfile, gate.position.z); }
  }
  buildGarden() {
    this.garden = [];
    this.livingTrees = [];
    const trunkMat = material(0x777399), leafA = material(0xd6b6df), leafB = material(0xb8dccc), islandMat = material(0x889abb);
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group(); const side = i % 2 === 0 ? -1 : 1;
      group.userData.rainbowHue = RAINBOW_HUES[i % RAINBOW_HUES.length];
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
      group.userData.rainbowHue = RAINBOW_HUES[(i + 4) % RAINBOW_HUES.length];
      for (const side of [-1, 1]) {
        this.box(group, material(0xc8c5e5), [side * 3.8, 2.3, 0], [.24, 4.8, .3]);
        this.box(group, this.materials.mint, [side * 3.8, 3.9, .17], [.1, .9, .035]);
      }
      const arch = this.mesh(group, new THREE.TorusGeometry(3.8, .12, 6, 24, Math.PI), material(0xd4c9ef), [0, 4.5, 0]);
      group.position.z = -18 - i * 22; this.course.add(group); this.gates.push(group);
    }
  }
  buildCharacter() {
    const m = this.materials, root = new THREE.Group(); this.character = root; root.position.set(0, .06, COLLECTION_Z);
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
    // Expand each body part in view space, keeping the outline equally thick
    // on the head, torso and animated limbs despite their different scales.
    this.auraOutlineMaterial = new THREE.ShaderMaterial({
      uniforms: { auraColor: { value: new THREE.Color(COLORS.mint) }, thickness: { value: .025 }, opacity: { value: 1 } },
      vertexShader: `uniform float thickness;
        void main() {
          vec4 point = modelViewMatrix * vec4(position, 1.0);
          point.xyz += normalize(normalMatrix * normal) * thickness;
          gl_Position = projectionMatrix * point;
        }`,
      fragmentShader: `uniform vec3 auraColor;
        uniform float opacity;
        void main() {
          gl_FragColor = vec4(auraColor, opacity);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, toneMapped: false,
    });
    this.auraGlowMaterial = this.auraOutlineMaterial.clone();
    this.auraGlowMaterial.transparent = true; this.auraGlowMaterial.depthWrite = false;
    this.auraGlowMaterial.uniforms.thickness.value = .055;
    this.auraGlowMaterial.uniforms.opacity.value = .18;
    const body = []; this.auraMeshes = [];
    root.traverse(part => { if (part.isMesh) body.push(part); });
    for (const part of body) {
      for (const mat of [this.auraOutlineMaterial, this.auraGlowMaterial]) {
        const outline = new THREE.Mesh(part.geometry, mat); outline.visible = false;
        part.add(outline); this.auraMeshes.push(outline);
      }
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: 0x242a47, transparent: true, opacity: .3, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.025; root.add(shadow);
    const auraMaterial = new THREE.MeshBasicMaterial({ color: COLORS.mint, toneMapped: false, transparent: true, opacity: .6, depthWrite: false });
    this.aura = this.mesh(root, new THREE.TorusGeometry(.53, .012, 5, 35), auraMaterial, [0, .01, 0]); this.aura.rotation.x = Math.PI / 2;
    this.aura.visible = false;
  }
  updateCharacterAura(energy = 0) {
    const attack = attackForEnergy(energy), color = attack ? chargeColorForWeapon(attack.weapon) : COLORS.mint;
    for (const mesh of this.auraMeshes) mesh.visible = energy > 0;
    this.aura.visible = energy > 0;
    const strength = THREE.MathUtils.clamp(energy / 30, 0, 1);
    this.auraOutlineMaterial.uniforms.auraColor.value.setHex(color);
    this.auraOutlineMaterial.uniforms.thickness.value = .025 + strength * .012;
    this.auraGlowMaterial.uniforms.auraColor.value.setHex(color);
    this.auraGlowMaterial.uniforms.thickness.value = .05 + strength * .035;
    this.auraGlowMaterial.uniforms.opacity.value = energy > 0 ? .18 + strength * .12 : .06;
    this.aura.material.color.setHex(color);
    this.aura.material.opacity = energy > 0 ? .75 : .4;
  }
  prepareEnvironment() {
    // Clone only environment materials: notes, mines and the android keep their contrast.
    this.environmentMaterials = [];
    const clones = new Map(); let rainbowIndex = 0;
    this.scene.traverse(object => {
      if (!object.isMesh || !object.material.isMeshStandardMaterial) return;
      const original = object.material;
      let ancestor = object;
      while (ancestor && ancestor.userData.rainbowHue === undefined) ancestor = ancestor.parent;
      const rainbowHue = ancestor?.userData.rainbowHue ?? RAINBOW_HUES[rainbowIndex++ % RAINBOW_HUES.length];
      const road = object.userData.roadSurface === true;
      const key = `${original.uuid}:${rainbowHue}:${road}`;
      if (!clones.has(key)) {
        const copy = original.clone(), luminous = original.emissiveIntensity >= .2;
        if (road) copy.fog = false;
        clones.set(key, copy);
        this.environmentMaterials.push({ mat: copy, road, bright: new THREE.Color().setHSL(rainbowHue, road ? .95 : .74, road ? .16 : luminous ? .67 : .5), dark: new THREE.Color(), emissive: road ? new THREE.Color(0) : new THREE.Color().setHSL(rainbowHue, .68, .4), darkEmissive: new THREE.Color(), glow: road ? 0 : original.emissiveIntensity, roughness: road ? .9 : original.roughness, metalness: road ? .04 : original.metalness, luminous });
      }
      object.material = clones.get(key);
    });
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
    this.darkSky = SKY_STOPS.map(() => new THREE.Color());
    this.brightSky = RAINBOW_HUES.map(hue => new THREE.Color().setHSL(hue, .55, .78));
    this.darkFog = new THREE.Color(0x191629); this.brightFog = new THREE.Color(0xb7badf);
    this.themeColor = new THREE.Color();
    this.updateEnvironment(null);
  }
  updateEnvironment(state) {
    const theme = state?.theme || themeForChart(state?.chart);
    const { hue, saturation } = theme;
    const paletteKey = theme.id;
    if (paletteKey !== this.paletteKey) {
      this.paletteKey = paletteKey; this.themeBlend = -1;
      for (const item of this.environmentMaterials) {
        item.dark.setHSL(hue, saturation, item.luminous ? .52 : .24);
        item.darkEmissive.setHSL(hue, saturation, item.luminous ? .47 : .13);
      }
      this.darkSky.forEach((color, i) => color.setHSL(hue, saturation, [.07, .1, .13, .14, .19, .24, .16][i]));
      this.darkFog.setHSL(hue, saturation, .12);
      this.brightFog.set(0xc8d9f2);
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
    for (const [i, stop] of SKY_STOPS.entries()) gradient.addColorStop(stop, this.themeColor.lerpColors(this.darkSky[i], this.brightSky[i], blend).getStyle());
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 8, 256); this.skyTexture.needsUpdate = true;
  }
  buildBoss() {
    const boss = new THREE.Group(); this.boss = boss; boss.position.set(0, 1.05, -52); this.course.add(boss);
    this.bossShield = new THREE.Group(); this.bossShield.visible = false; this.course.add(this.bossShield);
    const shieldMaterial = new THREE.MeshBasicMaterial({ color: 0x6cddff, transparent: true, opacity: .09, depthWrite: false, fog: false, toneMapped: false });
    this.mesh(this.bossShield, new THREE.SphereGeometry(BOSS_SHIELD_RADIUS, 32, 20), shieldMaterial);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0x96edff, transparent: true, opacity: .85, depthWrite: false, fog: false, toneMapped: false });
    this.mesh(this.bossShield, new THREE.TorusGeometry(BOSS_SHIELD_RADIUS, .04, 8, 64), rimMaterial);
    this.bossModels = new Map(); this.setBossTheme(themeForChart());
  }
  setBossTheme(theme) {
    if (this.bossTheme === theme.id) return;
    this.bossTheme = theme.id;
    if (!this.bossModels.has(theme.id)) { const model = buildRobotBoss(theme, this.bossReflections.texture); this.bossModels.set(theme.id, model); this.boss.add(model); }
    for (const [id, model] of this.bossModels) model.visible = id === theme.id;
    this.bossModel = this.bossModels.get(theme.id);
    this.bossCore = this.bossModel.userData.core; this.bossRing = this.bossModel.userData.ring;
  }
  createNote(type) {
    const root = new THREE.Group();
    if (type === 'note') {
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
  burst(lane, color, point = { x: (lane - 1.5) * 1.22, y: .6, z: COLLECTION_Z }) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = this.mesh(this.course, new THREE.OctahedronGeometry(.07), mat, [point.x, point.y, point.z]);
      this.effects.push({ mesh, age: 0, life: .65, velocity: new THREE.Vector3(Math.sin(i * 3) * 2, 1.5 + i % 3, Math.cos(i * 3) * 1.5) });
    }
  }
  shoot(lane, weaponId = 'pistol', pellets = 1, projectiles = []) {
    const weapon = weaponForId(weaponId);
    for (let i = 0; i < pellets; i++) {
      const p = projectiles[i];
      const start = p ? new THREE.Vector3(p.x, p.y, p.z) : new THREE.Vector3((lane - 1.5) * 1.22 + .22, .8, 2.65);
      const mesh = this.mesh(this.course, new THREE.SphereGeometry(.11, 8, 6), new THREE.MeshBasicMaterial({ color: weapon.color, toneMapped: false, fog: false }), start.toArray(), weaponId === 'rail' ? [.5,.5,45] : weaponId === 'rocket' ? [2,2,5] : [1,1,6]);
      if (p?.direction) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(p.direction.x, p.direction.y, p.direction.z));
      const target = start.clone(); target.z = -32;
      this.effects.push({ mesh, age: 0, life: .6, start, target, shot: true, projectile: projectiles[i] });
    }
  }
  shootMissiles(projectiles) {
    for (const projectile of projectiles) {
      const root = new THREE.Group(); this.course.add(root);
      const hull = new THREE.MeshBasicMaterial({ color: 0xe8daff, toneMapped: false });
      const glow = new THREE.MeshBasicMaterial({ color: weaponForId('missile').color, toneMapped: false, transparent: true });
      this.mesh(root, new THREE.ConeGeometry(.12, .38, 8), hull, [0, 0, -.23]).rotation.x = -Math.PI / 2;
      this.mesh(root, new THREE.CylinderGeometry(.095, .095, .32, 8), hull, [0, 0, .1]).rotation.x = Math.PI / 2;
      this.mesh(root, new THREE.ConeGeometry(.12, .6, 8), glow, [0, 0, .55]).rotation.x = Math.PI / 2;
      root.position.set(projectile.x, projectile.y, projectile.z);
      this.effects.push({ mesh: root, projectile, age: 0, missile: true });
    }
  }
  impact(hit) {
    if (hit.weakPoint) {
      this.pendingImpacts ??= [];
      this.pendingImpacts.push({ remaining: .1, hit: { ...hit, weakPoint: false, damage: hit.bonusDamage } });
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      if (effect.projectile?.id === hit.id) { this.disposeEffect(effect.mesh); this.effects.splice(i, 1); }
    }
    if (hit.shielded) { this.shieldImpact(hit); return; }
    const point = hit.point, color = weaponForId(hit.weapon).color, missile = hit.weapon === 'missile';
    const impactScale = .35;
    const firstEffect = this.effects.length;
    const mat = tint => new THREE.MeshBasicMaterial({ color: tint, transparent: true, depthWrite: false, toneMapped: false, fog: false, blending: THREE.AdditiveBlending });
    const add = (geometry, tint, offset, life, expand, velocity = new THREE.Vector3(), scale) => {
      const mesh = this.mesh(this.course, geometry, mat(tint), [point.x + offset[0], point.y + offset[1], point.z + offset[2]], scale);
      this.effects.push({ mesh, position: mesh.position.clone(), baseScale: mesh.scale.clone(), age: 0, life, expand, velocity }); return mesh;
    };
    if (missile) {
      // White-hot core, orange fireball lobes and two expanding shock waves.
      add(new THREE.SphereGeometry(.6, 16, 12), 0xfff5cc, [0, 0, .25], .16, 10);
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7;
        const flame = add(new THREE.SphereGeometry(.65, 12, 8), i % 2 ? 0xff7620 : 0xffb53a,
          [Math.cos(a) * .9, Math.sin(a) * .9, .3], .8, 7, new THREE.Vector3(Math.cos(a), Math.sin(a), .5));
        flame.material.blending = THREE.NormalBlending;
        this.effects[this.effects.length - 1].opacity = .8;
      }
      add(new THREE.TorusGeometry(1, .07, 8, 40), 0xffdba0, [0, 0, .5], .95, 8);
      add(new THREE.TorusGeometry(1.2, .04, 8, 40), color, [0, 0, .7], .85, 9).rotation.x = .45;
    } else {
      const dual = hit.weapon === 'dual', machine = hit.weapon === 'machine';
      add(new THREE.TorusGeometry(machine ? .18 : .25, .025, 6, 24), color, [0, 0, .15], machine ? .16 : .3, machine ? 8 : 5);
      const flashes = dual ? 2 : 1;
      for (let i = 0; i < flashes; i++) {
        const flare = add(new THREE.OctahedronGeometry(.3), machine ? 0xe3ffad : 0xfff5dd,
          [dual ? (i ? .22 : -.22) : 0, 0, .25], machine ? .12 : .2, 3, new THREE.Vector3(), [1, 1, .3]);
        flare.rotation.z = Math.PI / 4;
      }
    }
    const count = missile ? 32 : hit.weapon === 'machine' ? 5 : hit.weapon === 'dual' ? 12 : 7;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count, speed = missile ? 4 + i % 4 : hit.weapon === 'machine' ? 5 : 3;
      const mesh = add(new THREE.OctahedronGeometry(missile ? .12 : .06), missile ? i % 2 ? 0xffaa45 : 0xffeab1 : color,
        [0, 0, .25], missile ? 1.1 : .32, 0,
        new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed + (missile ? 1.5 : 0), 1.5 + i % 3));
      if (hit.weapon === 'machine') mesh.scale.set(.5, .5, 3);
      this.effects[this.effects.length - 1].gravity = missile ? 5 : 0;
    }
    // Shrink the entire impact: flash, wave, spacing and flying debris together.
    for (const effect of this.effects.slice(firstEffect)) {
      effect.position.set(point.x, point.y, point.z).addScaledVector(effect.mesh.position.clone().sub(new THREE.Vector3(point.x, point.y, point.z)), impactScale);
      effect.mesh.position.copy(effect.position); effect.mesh.scale.multiplyScalar(impactScale);
      effect.baseScale.copy(effect.mesh.scale); effect.velocity.multiplyScalar(impactScale);
      if (effect.gravity) effect.gravity *= impactScale;
    }
    const displayDamage = hit.weakPoint ? hit.baseDamage : hit.damage;
    if (displayDamage > 0) this.showDamage(displayDamage, point, hit.shielded);
    if (missile) this.hitFlash = .35;
  }
  shieldImpact(hit) {
    const point = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z);
    const normal = hit.point.normal ? new THREE.Vector3(hit.point.normal.x, hit.point.normal.y, hit.point.normal.z) : new THREE.Vector3(0, 0, 1);
    const add = (geometry, color, life, expand, offset) => {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthWrite: false, toneMapped: false, fog: false, blending: THREE.AdditiveBlending });
      const mesh = this.mesh(this.course, geometry, material, point.clone().addScaledVector(normal, offset).toArray());
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      this.effects.push({ mesh, position: mesh.position.clone(), baseScale: mesh.scale.clone(), velocity: new THREE.Vector3(), age: 0, life, expand, opacity: .85, shieldWave: true });
    };
    add(new THREE.SphereGeometry(.065, 8, 6), 0xb9f3ff, .14, 1, .035);
    add(new THREE.TorusGeometry(.13, .012, 6, 32), 0x49baff, .42, 7, .025);
    add(new THREE.TorusGeometry(.09, .009, 6, 32), 0x80dfff, .32, 6, .03);
    if (hit.damage > 0) this.showDamage(hit.damage, hit.point, true);
  }
  updateImpacts(dt) {
    for (let i = (this.pendingImpacts?.length ?? 0) - 1; i >= 0; i--) {
      const pending = this.pendingImpacts[i]; pending.remaining -= dt;
      if (pending.remaining <= 1e-9) { this.pendingImpacts.splice(i, 1); this.impact(pending.hit); }
    }
  }
  get hasPendingFinishEffects() {
    return Boolean(this.pendingImpacts?.length || this.effects.some(effect => effect.firework));
  }
  showDamage(damage, point, shielded = false) {
    while (this.damageNumbers.length >= 4) this.damageNumbers.shift().label.remove();
    const label = document.createElement('span'); label.className = shielded ? 'boss-damage shielded' : 'boss-damage';
    label.textContent = `−${Number(damage.toFixed(1)).toLocaleString()}`;
    this.damageLayer.appendChild(label);
    this.damageNumbers.push({ label, age: 0, anchor: point ? new THREE.Vector3(point.x, point.y + 1, point.z) : this.boss.position.clone().add(new THREE.Vector3(0, 1.2, 0)), offset: (this.damageSerial++ % 3 - 1) * 22 });
    if (!shielded) this.hitFlash = .14;
  }
  fireworkTarget(point) {
    const target = this.trackPoint(point);
    // Keep the burst in the sky visible below the top HUD on steep roads too.
    const projected = target.clone().project(this.camera);
    projected.x = THREE.MathUtils.clamp(projected.x,-.65,.65);
    projected.y = THREE.MathUtils.clamp(projected.y,.08,.38);
    const ray = projected.unproject(this.camera).sub(this.camera.position);
    // Keep the burst at the boss's depth when adjusting its screen position.
    target.copy(this.camera.position).addScaledVector(ray, (point.z - this.camera.position.z) / ray.z);
    target.y = Math.max(target.y,this.height(target.z)+4);
    return target;
  }
  celebrationPoint(projectile,time) {
    const t = THREE.MathUtils.clamp((time-projectile.time)/projectile.flightTime,0,1);
    const start = this.trackPoint({x:projectile.x,y:projectile.y,z:projectile.z});
    const point = start.lerp(this.fireworkTarget(projectile.target),t);
    point.y += Math.sin(t*Math.PI)*.8;
    return point;
  }
  firework(hit) {
    for (let i = this.effects.length-1;i>=0;i--) {
      if (this.effects[i].projectile?.id === hit.id) { this.disposeEffect(this.effects[i].mesh); this.effects.splice(i,1); }
    }
    const center = this.fireworkTarget(hit.point), big = hit.weapon === 'missile', burstScale = 2;
    const colors = [0xff4455,0xffb72a,0xffed5c,0x53ff9c,0x40cfff,0x9773ff,0xff65d4];
    const count = big ? 224 : hit.weapon === 'machine' ? 28 : 40;
    for (let i=0;i<count;i++) {
      const y = 1-2*(i+.5)/count, angle = i*2.399963, radius = Math.sqrt(1-y*y), speed = big ? 10+i%5 : 4+i%4*.8;
      const velocity = new THREE.Vector3(Math.cos(angle)*radius,y,Math.sin(angle)*radius).multiplyScalar(speed);
      // Some sparks fall onto the narrow road even from the distant sky.
      if (i % 6 === 0) velocity.set((i % 3 - 1) * .15, -speed * .5, 3);
      velocity.multiplyScalar(burstScale);
      const mat = new THREE.MeshBasicMaterial({color:colors[i%colors.length],toneMapped:false,fog:false,transparent:true,depthWrite:false});
      const mesh = this.mesh(this.course,new THREE.SphereGeometry(big ? .16 : .1,6,4),mat,center.toArray(),[.65,.65,big ? 4 : 2.5]);
      mesh.scale.multiplyScalar(burstScale);
      this.effects.push({mesh,position:center.clone(),velocity,gravity:(big ? 15 : 12)*burstScale,age:0,life:fireworkLifetime(hit.weapon),worldSpace:true,firework:true,fireworkSpark:true,scrollTime:hit.time,bounce:i%3!==2});
    }
    for (let i=0;i<(big?3:1);i++) {
      const mat = new THREE.MeshBasicMaterial({color:colors[(hit.id+i)%colors.length],toneMapped:false,fog:false,transparent:true,depthWrite:false});
      const mesh = this.mesh(this.course,new THREE.TorusGeometry(big ? .6 : .16,big ? .023 : .01,6,48),mat,center.toArray());
      mesh.scale.setScalar(burstScale);
      mesh.rotation.set(i*.7,i*.9,0);
      this.effects.push({mesh,position:center.clone(),velocity:new THREE.Vector3(),age:0,life:big ? .65 : .35,expand:big ? 10 : 8,baseScale:mesh.scale.clone(),worldSpace:true,firework:true,scrollTime:hit.time});
    }
    const flashMat = new THREE.MeshBasicMaterial({color:big ? 0xffdf71 : 0xfff7cb,toneMapped:false,fog:false,transparent:true,depthWrite:false});
    const flash = this.mesh(this.course,new THREE.SphereGeometry(big ? .45 : .12,12,8),flashMat,center.toArray());
    flash.scale.setScalar(burstScale);
    this.effects.push({mesh:flash,position:center.clone(),velocity:new THREE.Vector3(),age:0,life:.22,expand:big ? 12 : 6,baseScale:flash.scale.clone(),worldSpace:true,firework:true,scrollTime:hit.time});
  }
  showPlayerFeedback(effect) {
    if (!['save', 'miss', 'mine'].includes(effect.type)) return;
    const last = this.playerFeedback.at(-1);
    if (last?.type === effect.type && last.age < .08) this.playerFeedback.pop().label.remove();
    while (this.playerFeedback.length >= 3) this.playerFeedback.shift().label.remove();
    const label = document.createElement('span');
    label.className = `player-feedback ${effect.type}`;
    label.textContent = effect.type === 'save' ? 'Good' : effect.type === 'miss' ? 'Bad' : `−${Number(effect.damage.toFixed(1))}`;
    this.damageLayer.appendChild(label);
    this.playerFeedback.push({label,age:0,x:this.character.position.x,type:effect.type});
  }
  updatePlayerFeedback(dt) {
    for (let i = this.playerFeedback.length - 1; i >= 0; i--) {
      const item = this.playerFeedback[i]; item.age += dt;
      if (item.age >= .7) { item.label.remove(); this.playerFeedback.splice(i, 1); continue; }
      const progress = item.age / .7, z = COLLECTION_Z - progress * .8;
      const anchor = new THREE.Vector3(item.x, this.height(z) + 2.5 * CHARACTER_SCALE + progress * .08, z);
      const projected = this.course.localToWorld(anchor).project(this.camera);
      item.label.style.left = `${(projected.x * .5 + .5) * this.viewWidth}px`;
      item.label.style.top = `${(-projected.y * .5 + .5) * this.container.clientHeight}px`;
      item.label.style.opacity = Math.min(1, (1 - progress) / .35);
      item.label.style.transform = `translate(-50%,-100%) scale(${1 - progress * .4})`;
    }
  }
  disposeEffect(mesh) {
    mesh.traverse(child => { if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); } });
    mesh.removeFromParent();
  }
  weaponModel(id) { return buildWeaponModel(id, this.materials, { box: this.boxGeo, sphere: this.sphereGeo, cylinder: this.cylinderGeo }); }
  setGunLevel(id) {
    this.gun.visible = Boolean(id);
    if (this.gunId === id) return;
    this.gunId = id;
    if (!id) return;
    if (!this.gunModels.has(id)) { const model = this.weaponModel(id); this.gunModels.set(id, model); this.gun.add(model); }
    for (const [key, model] of this.gunModels) model.visible = key === id;
  }
  clearGameObjects() {
    this.resize();
    for (const note of this.notes.values()) this.disposeObject(note);
    this.notes.clear();
    for (const effect of this.effects) this.disposeEffect(effect.mesh);
    this.effects = [];
    this.pendingImpacts = [];
    this.weakPointMarker?.classList.add('hidden');
    this.shieldLabel?.classList.add('hidden');
    if (this.bossShield) this.bossShield.visible = false;
    for (const number of this.damageNumbers) number.label.remove();
    this.damageNumbers = []; this.hitFlash = 0;
    for (const item of this.playerFeedback) item.label.remove();
    this.playerFeedback = [];

  }
  disposeObject(object) {
    // Shared geometry/materials remain owned by the scene.
    object.traverse(child => { if (child.isMesh && ![this.boxGeo, this.sphereGeo, this.cylinderGeo].includes(child.geometry)) child.geometry.dispose(); });
    object.removeFromParent();
  }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.viewWidth = w;
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.setSize(this.viewWidth, h, false); this.camera.aspect = this.viewWidth / h;
    // Preserve a safe horizontal field of view on tall phones: outer lanes,
    // the android and her pistol must fit inside the two HUD meters.
    this.baseFov = Math.max(49, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(49 / 2)) * .68 / this.camera.aspect)));
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }
  render(elapsed, dt, state, playerX, mode) {
    this.updateEnvironment(state);
    this.setBossTheme(state?.theme || themeForChart(state?.chart));
    const active = !!state && ['playing', 'paused', 'countdown'].includes(mode);
    const time = active ? state.time : elapsed * .28;
    this.updateRoad(active ? state.chart.terrain ?? FLAT_TERRAIN : null, time);
    const slope = roadPitch(this.trackProfile, COLLECTION_Z);
    const fov = Math.max(this.baseFov, 53 + THREE.MathUtils.radToDeg(Math.abs(slope)) * .5);
    if (Math.abs(this.camera.fov - fov) > .001) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.course.rotation.x = 0; this.course.position.set(0, 0, 0);
    this.camera.lookAt(0, .8 + this.height(-28) * .23, -10);
    this.course.updateMatrixWorld(true);
    const moving = mode === 'playing' || mode === 'home';
    const travel = active ? terrainScroll(state.chart.terrain, time) : time * 14;
    const run = moving ? travel * 12 * SCROLL_SPEED / 14 : 0;
    const showHome = mode === 'home' || mode === 'loading';
    this.character.position.x += ((showHome ? .7 : playerX * 1.22) - this.character.position.x) * Math.min(1, dt * 22);
    this.character.position.z = showHome ? -6 : COLLECTION_Z;
    this.character.scale.setScalar((showHome ? 1.7 : 1) * CHARACTER_SCALE);
    this.character.rotation.y = showHome ? -.35 : -(playerX * 1.22 - this.character.position.x) * .13;
    this.character.position.y = this.height(this.character.position.z) + .07 + Math.abs(Math.sin(run)) * .045;
    this.character.rotation.x = roadPitch(this.trackProfile, this.character.position.z);
    this.legs[0].rotation.x = Math.sin(run) * .38; this.legs[1].rotation.x = -Math.sin(run) * .38;
    this.arms[0].rotation.x = -.15 + Math.sin(run) * .16; this.arms[1].rotation.x = -.2;
    this.head.rotation.z = Math.sin(time * 2) * .03;
    this.updateCharacterAura(showHome ? 0 : state?.energy ?? 0);
    this.aura.scale.setScalar(1 + Math.sin(time * 5) * .04);
    this.gun.scale.setScalar(1.2);
    this.setGunLevel(showHome ? 'pistol' : state?.weaponId ?? null);
    const rotor = this.gunModels.get(this.gunId)?.userData.rotor; if (rotor && moving) rotor.rotation.z += dt * 24;
    this.boss.visible = !state || state.boss > 0 || showHome;
    const bossPosition = bossPose(time, state?.bossMotion); this.boss.position.copy(this.trackPoint(bossPosition));
    this.boss.rotation.y = bossRotation(time);
    this.boss.rotation.z = 0; this.bossCore.rotation.y = time; this.bossRing.rotation.z = time * .3;
    const weakPoint = active && state.boss > 0 && bossWeakPointAt(time);
    const shielded = active && state.boss > 0 && bossShieldAt(time);
    this.bossShield.visible = shielded;
    this.shieldLabel.classList.toggle('hidden', !shielded);
    if (shielded) {
      this.bossShield.position.copy(this.boss.position); this.bossShield.lookAt(this.camera.position);
      this.bossShield.children[0].material.opacity = .09 + Math.sin(time * 2) * .012;
      const labelPoint = this.boss.position.clone().add(new THREE.Vector3(0, -3.5, .1)).project(this.camera);
      this.shieldLabel.style.left = `${(labelPoint.x * .5 + .5) * this.viewWidth}px`;
      this.shieldLabel.style.top = `${(-labelPoint.y * .5 + .5) * this.container.clientHeight}px`;
    }
    this.weakPointMarker.classList.toggle('hidden', !weakPoint);
    this.bossModel.userData.weakCore.material.emissiveIntensity = weakPoint ? 2 : .15;
    if (weakPoint) {
      const rear = new THREE.Vector3(0, .12, -.88).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.boss.rotation.y).add(new THREE.Vector3(bossPosition.x, bossPosition.y, bossPosition.z));
      const projected = this.trackPoint(rear).project(this.camera);
      this.weakPointMarker.style.left = `${(projected.x * .5 + .5) * this.viewWidth}px`;
      this.weakPointMarker.style.top = `${(-projected.y * .5 + .5) * this.container.clientHeight}px`;
    }
    animateRobotBoss(this.bossModel, time);
    for (let i = 0; i < this.beatLines.length; i++) {
      const line = this.beatLines[i]; line.position.z = 9 - ((i * 3 + 80 - travel * ROAD_SCROLL_FACTOR % 78) % 78);
      line.position.y = this.height(line.position.z) + .007; line.rotation.x = roadPitch(this.trackProfile, line.position.z);
    }
    for (let i = 0; i < this.garden.length; i++) {
      const garden = this.garden[i]; garden.position.z = 13 - ((i * 3.1 + 105 - travel * 3 * SCROLL_SPEED / 14 % 99.2) % 99.2);
      garden.position.y = this.height(garden.position.z) - .25;
    }
    for (let i = 0; i < this.dust.length; i++) { this.dust[i].position.y += Math.sin(elapsed + i) * dt * .12; this.dust[i].rotation.y += dt; }
    const pulse = .2 + Math.max(0, Math.sin(time / (state?.chart.beat || .5) * Math.PI * 2)) * .2;
    for (const mat of this.attackFloors) mat.emissiveIntensity = state?.attackWindow && state.boss > 0 ? pulse + .25 : .08;
    const visible = new Set();
    if (active) {
      for (const { event, z, scale } of visibleNotes(state.chart.events, time, state.chart.terrain, true, state.chart.scrollSpeed ?? 1)) {
        if (event.type === 'mine' && state.boss <= 0) continue;
        visible.add(event.id);
        let mesh = this.notes.get(event.id);
        if (!mesh) { mesh = this.createNote(event.type); this.notes.set(event.id, mesh); }
        mesh.position.set((event.lane - 1.5) * 1.22, this.height(z) + .12, z);
        mesh.rotation.x = roadPitch(this.trackProfile, z);
        mesh.scale.setScalar(scale);
        mesh.rotation.y = Math.sin(time * 3 + event.id) * .2;
      }
    }
    for (const [id, mesh] of this.notes) if (!visible.has(id)) { this.disposeObject(mesh); this.notes.delete(id); }
    const liveProjectiles = new Set(state?.projectiles.map(p => p.id));
    this.updateImpacts(mode === 'paused' ? 0 : dt);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; if (mode !== 'paused') e.age += dt;
      if (e.projectile) {
        const point = projectilePoint(e.projectile, state?.time ?? e.projectile.time);
        const rendered = e.projectile.celebration ? this.celebrationPoint(e.projectile,state?.time ?? e.projectile.time) : this.trackPoint(point);
        if (point.z < -70 || (state && !liveProjectiles.has(e.projectile.id))) { this.disposeEffect(e.mesh); this.effects.splice(i, 1); }
        else {
          if (e.missile || e.projectile.celebration) {
            const direction = rendered.clone().sub(e.mesh.position);
            if (direction.lengthSq() > .00001) e.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.normalize());
          }
          e.mesh.position.copy(rendered);
        }
        continue;
      }
      if (e.age >= e.life) { this.disposeEffect(e.mesh); this.effects.splice(i, 1); continue; }
      if (e.shot) e.mesh.position.copy(this.trackPoint(e.start.clone().lerp(e.target, e.age / e.life)));
      else {
        const effectDt = mode === 'paused' ? 0 : dt;
        e.position ??= e.mesh.position.clone();
        if (e.firework) {
          const forwardDistance = mode === 'playing' && effectDt > 0 ? fireworkForwardDistance(state?.chart.terrain, e.scrollTime ?? time, time) : 0;
          advanceFirework(e,effectDt,z=>this.height(z),forwardDistance);
          e.scrollTime = time;
          if (e.fireworkSpark && e.velocity.lengthSq()>0) e.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),e.velocity.clone().normalize());
        }
        else e.position.addScaledVector(e.velocity, effectDt);
        e.mesh.position.copy(e.worldSpace ? e.position : this.trackPoint(e.position));
        e.mesh.traverse(child => { if (child.isMesh) child.material.opacity = (e.opacity ?? 1) * (1 - e.age / e.life); });
        if (e.expand) e.mesh.scale.copy(e.baseScale).multiplyScalar(1 + e.age * e.expand);
        else if (!e.fireworkSpark) e.mesh.rotation.x += effectDt * 4;
        if (e.gravity && !e.fireworkSpark) e.velocity.y -= e.gravity * effectDt;
      }
    }
    const effectDt = mode === 'paused' ? 0 : dt;
    this.updatePlayerFeedback(effectDt);
    this.hitFlash = Math.max(0, this.hitFlash - effectDt);
    this.bossCore.scale.setScalar(this.hitFlash > 0 ? 1.3 : 1);
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const number = this.damageNumbers[i]; number.age += effectDt;
      if (number.age >= .95) { number.label.remove(); this.damageNumbers.splice(i, 1); continue; }
      const projected = this.course.localToWorld(this.trackPoint(number.anchor)).project(this.camera);
      const x = (projected.x * .5 + .5) * this.viewWidth + number.offset;
      const y = (-projected.y * .5 + .5) * this.container.clientHeight - number.age * 38;
      number.label.style.left = `${x}px`; number.label.style.top = `${y}px`;
      number.label.style.opacity = Math.min(1, (.95 - number.age) / .25);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
