import * as THREE from 'three';

const COLORS = { mint: 0xb4ffe0, lilac: 0xcfbcff, pink: 0xffbbdc, navy: 0x343756, metal: 0xe1e4f5 };
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
    this.scene.add(new THREE.HemisphereLight(0xf4efff, 0x657296, 2.2));
    const sunlight = new THREE.DirectionalLight(0xffe6f4, 3.1); sunlight.position.set(-10, 18, 8); this.scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0xa0ffeb, 1.4); fill.position.set(5, 6, -10); this.scene.add(fill);
    this.materials = { road: material(0x555876), edge: material(0x99f7d2, .7), dark: material(COLORS.navy), white: material(COLORS.metal), hair: material(0xb5b4e4), mint: material(COLORS.mint, .45), lilac: material(COLORS.lilac, .2), pink: material(COLORS.pink, .2), black: material(0x35324e), mine: material(0x35334f), spike: material(0xf28ca8, .5) };
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.sphereGeo = new THREE.SphereGeometry(1, 12, 10);
    this.cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    this.notes = new Map(); this.effects = []; this.lastTime = 0;
    this.buildSky(); this.buildRoad(); this.buildGarden(); this.buildCharacter(); this.buildBoss();
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
    this.box(this.scene, this.materials.road, [0, -.23, -32], [6.5, .4, 100]);
    this.attackFloors = [];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 1.22;
      if (i === 0 || i === 4) {
        const mat = material(0x9983c9, .12);
        this.box(this.scene, mat, [x, -.014, -32], [1.16, .04, 100]); this.attackFloors.push(mat);
      }
      this.box(this.scene, material(i === 0 || i === 4 ? 0xd5b4ff : 0xb9e8e0, .25), [x, .006, -32], [.023, .02, 100]);
    }
    for (const side of [-1, 1]) {
      this.box(this.scene, this.materials.edge, [side * 3.26, .035, -32], [.065, .09, 100]);
      this.box(this.scene, this.materials.white, [side * 3.36, -.12, -32], [.12, .28, 100]);
    }
    this.beatLines = [];
    for (let i = 0; i < 26; i++) this.beatLines.push(this.box(this.scene, material(0x8a8caa), [0, .007, -i * 3], [6.45, .015, .027]));
    this.box(this.scene, material(0xb9ffe0, .9), [0, .04, 3.25], [6.4, .026, .06]);
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e8ddff'; ctx.font = 'bold 35px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⌁', 64, 42);
    const tex = new THREE.CanvasTexture(canvas), mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    for (const side of [-1, 1]) { const m = this.mesh(this.scene, new THREE.PlaneGeometry(.8, .5), mat, [side * 2.44, .04, 1.8]); m.rotation.x = -Math.PI / 2; }
  }
  buildGarden() {
    this.garden = [];
    const trunkMat = material(0x777399), leafA = material(0xd6b6df), leafB = material(0xb8dccc), islandMat = material(0x889abb);
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group(); const side = i % 2 === 0 ? -1 : 1;
      group.position.set(side * (4.6 + (i % 3) * 1.3), -.25, 8 - i * 3.1);
      const scale = .7 + (i % 5) * .15; group.scale.setScalar(scale);
      const island = this.mesh(group, new THREE.ConeGeometry(2, 2.4, 5), islandMat, [0, -1.25, 0]); island.rotation.z = Math.PI;
      this.cylinder(group, material(0xa5c6c1), [0, -.1, 0], [1.8, .18, 1.6]);
      this.cylinder(group, trunkMat, [0, .85, 0], [.12, 1.8, .12]);
      const leaves = i % 3 ? leafA : leafB;
      this.mesh(group, new THREE.IcosahedronGeometry(1, 0), leaves, [0, 2.2, 0], [1.35, 1.5, 1.1]);
      this.mesh(group, new THREE.IcosahedronGeometry(1, 0), leaves, [.75, 1.85, .1], [.75, .8, .8]);
      this.mesh(group, new THREE.OctahedronGeometry(.4), this.materials.lilac, [-1, .4, .2], [.45, 1.4, .45]);
      this.scene.add(group); this.garden.push(group);
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
      group.position.z = -18 - i * 22; this.scene.add(group); this.gates.push(group);
    }
  }
  buildCharacter() {
    const m = this.materials, root = new THREE.Group(); this.character = root; root.position.set(0, .06, 3.25);
    this.scene.add(root);
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
    this.box(this.gun, m.dark, [0, 0, -.17], [.17, .2, .44]);
    this.box(this.gun, m.white, [0, .09, -.21], [.2, .09, .45]);
    this.box(this.gun, m.mint, [0, .02, -.41], [.12, .08, .07]);
    this.box(this.gun, m.dark, [0, -.12, 0], [.13, .2, .13]); root.add(this.gun);
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
  buildBoss() {
    const boss = new THREE.Group(); this.boss = boss; boss.position.set(0, 3.8, -23); this.scene.add(boss);
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
    this.scene.add(root); return root;
  }
  burst(lane, color) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = this.mesh(this.scene, new THREE.OctahedronGeometry(.07), mat, [(lane - 2) * 1.22, .6, 3.25]);
      this.effects.push({ mesh, age: 0, life: .65, velocity: new THREE.Vector3(Math.sin(i * 3) * 2, 1.5 + i % 3, Math.cos(i * 3) * 1.5) });
    }
  }
  shoot(lane) {
    const mesh = this.mesh(this.scene, new THREE.SphereGeometry(.065, 6, 5), new THREE.MeshBasicMaterial({ color: 0xb8ffe1 }), [(lane - 2) * 1.22 + .39, 1.2, 2.8], [1, 1, 3]);
    this.effects.push({ mesh, age: 0, life: .28, start: mesh.position.clone(), target: this.boss.position.clone(), shot: true });
  }
  clearGameObjects() {
    for (const note of this.notes.values()) this.disposeObject(note);
    this.notes.clear();
    for (const effect of this.effects) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose(); }
    this.effects = [];
  }
  disposeObject(object) {
    // Shared geometry/materials remain owned by the scene.
    object.traverse(child => { if (child.isMesh && ![this.boxGeo, this.sphereGeo, this.cylinderGeo].includes(child.geometry)) child.geometry.dispose(); });
    this.scene.remove(object);
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
    const active = !!state && ['playing', 'paused', 'countdown'].includes(mode);
    const time = active ? state.time : elapsed * .28;
    const moving = mode === 'playing' || mode === 'home';
    const run = moving ? time * 12 : 0;
    const showHome = mode === 'home' || mode === 'loading';
    this.character.position.x += ((showHome ? .7 : playerX * 1.22) - this.character.position.x) * Math.min(1, dt * 22);
    this.character.position.z = showHome ? -6 : 3.25;
    this.character.scale.setScalar(showHome ? 1.7 : 1);
    this.character.rotation.y = showHome ? -.35 : -(playerX * 1.22 - this.character.position.x) * .13;
    this.character.position.y = .07 + Math.abs(Math.sin(run)) * .045;
    this.legs[0].rotation.x = Math.sin(run) * .38; this.legs[1].rotation.x = -Math.sin(run) * .38;
    this.arms[0].rotation.x = -.15 + Math.sin(run) * .16; this.arms[1].rotation.x = -.2;
    this.head.rotation.z = Math.sin(time * 2) * .03;
    this.aura.scale.setScalar(1 + Math.sin(time * 5) * .04);
    this.gun.scale.setScalar(state?.saved >= 50 ? 1.35 : state?.saved >= 20 ? 1.16 : 1);
    this.boss.visible = !state || state.boss > 0 || showHome;
    this.boss.position.x = Math.sin(time * .7) * 1.7; this.boss.position.y = 3.6 + Math.sin(time * 2) * .3;
    this.boss.rotation.z = Math.sin(time) * .1; this.bossCore.rotation.y = time; this.bossRing.rotation.z = time * .3;
    for (let i = 0; i < this.beatLines.length; i++) this.beatLines[i].position.z = 9 - ((i * 3 + 80 - time * 7 % 78) % 78);
    for (let i = 0; i < this.garden.length; i++) { this.garden[i].position.z = 13 - ((i * 3.1 + 105 - time * 3 % 99.2) % 99.2); }
    for (let i = 0; i < this.dust.length; i++) { this.dust[i].position.y += Math.sin(elapsed + i) * dt * .12; this.dust[i].rotation.y += dt; }
    const pulse = .2 + Math.max(0, Math.sin(time / (state?.chart.beat || .5) * Math.PI * 2)) * .2;
    for (const mat of this.attackFloors) mat.emissiveIntensity = state?.attackWindow && state.boss > 0 ? pulse + .25 : .08;
    const visible = new Set();
    if (active) {
      for (let i = state.index; i < state.chart.events.length; i++) {
        const event = state.chart.events[i], until = event.time - time;
        if (until > 3) break;
        if (until < -.1 || (event.type === 'mine' && state.boss <= 0)) continue;
        visible.add(event.id);
        let mesh = this.notes.get(event.id);
        if (!mesh) { mesh = this.createNote(event.type); this.notes.set(event.id, mesh); }
        mesh.position.set((event.lane - 2) * 1.22, .12, 3.25 - until * 14);
        mesh.rotation.y = event.type === 'mine' ? time * 1.6 : Math.sin(time * 3 + event.id) * .2;
      }
    }
    for (const [id, mesh] of this.notes) if (!visible.has(id)) { this.disposeObject(mesh); this.notes.delete(id); }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; if (mode !== 'paused') e.age += dt;
      if (e.age >= e.life) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); this.effects.splice(i, 1); continue; }
      if (e.shot) e.mesh.position.lerpVectors(e.start, e.target, e.age / e.life);
      else { const effectDt = mode === 'paused' ? 0 : dt; e.mesh.position.addScaledVector(e.velocity, effectDt); e.mesh.material.opacity = 1 - e.age / e.life; e.mesh.rotation.x += effectDt * 4; }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
