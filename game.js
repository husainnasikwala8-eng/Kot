/* ===================== Aljamea Library — scene demo =====================
   A first pass at: exterior -> enter -> door opens -> figure revealed ->
   camera hands control to the player (first person) -> pick up books ->
   an NPC enters -> show her a book.
   Written as one script so it's easy to read top-to-bottom and to drop
   straight into your GitHub Pages repo.
   =========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- tiny helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Assets live as separate files next to this one in the repo:
//   model.glb, door.jpg, shelf.jpg, book_drop.mp3, npc.png

// ---------- renderer / scene / camera ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0805);
scene.fog = new THREE.Fog(0x0b0805, 9, 30);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 100);
camera.rotation.order = 'YXZ';

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- lighting ----------
scene.add(new THREE.HemisphereLight(0xfff1d0, 0x241708, 0.6));
const lamp1 = new THREE.PointLight(0xffcf8a, 1.2, 11);
lamp1.position.set(-2.6, 2.5, -2.6);
scene.add(lamp1);
const lamp2 = new THREE.PointLight(0xffcf8a, 1.2, 11);
lamp2.position.set(2.6, 2.5, -2.6);
scene.add(lamp2);
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(0, 6, 6);
scene.add(fill);

// ---------- texture loader ----------
const texLoader = new THREE.TextureLoader();
function loadTex(url) {
  const tex = texLoader.load(url);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const doorTex = loadTex('door.jpg');
const shelfTex = loadTex('shelf.jpg');

// ---------- room ----------
const ROOM = { x: 3.8, zBack: -4.8, zDoor: 4.6, outerZ: 9.2 };

const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9, side: THREE.DoubleSide });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2 + 2, (ROOM.outerZ - ROOM.zBack) + 2), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, (ROOM.zBack + ROOM.outerZ) / 2);
scene.add(floor);

// back wall, textured with the real library photo
const backWallGeo = new THREE.PlaneGeometry(ROOM.x * 2, 3.4);
const backWallMat = new THREE.MeshStandardMaterial({ map: shelfTex, roughness: 0.85, side: THREE.DoubleSide });
const backWall = new THREE.Mesh(backWallGeo, backWallMat);
backWall.position.set(0, 1.7, ROOM.zBack);
scene.add(backWall);

// side walls, plain warm tone
const sideMat = new THREE.MeshStandardMaterial({ color: 0x3a2716, roughness: 0.95, side: THREE.DoubleSide });
const wallDepth = ROOM.zDoor - ROOM.zBack;
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(wallDepth, 3.4), sideMat);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-ROOM.x, 1.7, (ROOM.zBack + ROOM.zDoor) / 2);
scene.add(leftWall);
const rightWall = leftWall.clone();
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(ROOM.x, 1.7, (ROOM.zBack + ROOM.zDoor) / 2);
scene.add(rightWall);

// low-poly "carved arch" trim strips along the side walls, just for texture/interest
const trimMat = new THREE.MeshStandardMaterial({ color: 0x6b431f, roughness: 0.7 });
for (let i = 0; i < 3; i++) {
  const z = ROOM.zBack + 0.8 + i * 2.1;
  [-ROOM.x + 0.03, ROOM.x - 0.03].forEach((x) => {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 16, Math.PI), trimMat);
    arch.position.set(x, 2.55, z);
    arch.rotation.y = Math.PI / 2;
    scene.add(arch);
  });
}

// exterior facade (outside the door), textured with the real storefront photo —
// built as three panels (left / right / header) so there's an actual doorway
// hole instead of one solid photo plane blocking the entrance.
const FACADE_W = ROOM.x * 2 + 2;   // 9.6, matches the old single-plane width
const FACADE_H = 3.6;
const DOOR_HALF_W = 0.55;
const DOOR_H = 2.3;

function facadePanel(width, height, worldX, worldY, uMin, uMax, vMin, vMax) {
  const tex = doorTex.clone();
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.offset.set(uMin, vMin);
  tex.repeat.set(uMax - uMin, vMax - vMin);
  tex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.position.set(worldX, worldY, ROOM.zDoor + 0.02);
  mesh.rotation.y = Math.PI; // faces outward, toward the intro camera
  scene.add(mesh);
  return mesh;
}

const leftPanelW = FACADE_W / 2 - DOOR_HALF_W;
const rightPanelW = leftPanelW;
facadePanel(
  leftPanelW, FACADE_H,
  -FACADE_W / 2 + leftPanelW / 2, FACADE_H / 2,
  0, leftPanelW / FACADE_W,
  0, 1
);
facadePanel(
  rightPanelW, FACADE_H,
  FACADE_W / 2 - rightPanelW / 2, FACADE_H / 2,
  1 - rightPanelW / FACADE_W, 1,
  0, 1
);
facadePanel(
  DOOR_HALF_W * 2, FACADE_H - DOOR_H,
  0, (DOOR_H + FACADE_H) / 2,
  0.5 - DOOR_HALF_W / FACADE_W, 0.5 + DOOR_HALF_W / FACADE_W,
  DOOR_H / FACADE_H, 1
);

// the door itself — a separate hinged group so it can swing open
const doorGroup = new THREE.Group();
doorGroup.position.set(-0.55, 0, ROOM.zDoor); // hinge on the left edge of the doorway
scene.add(doorGroup);
const doorMat = new THREE.MeshStandardMaterial({ color: 0x1c3f52, roughness: 0.5, metalness: 0.1 });
const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.06), doorMat);
doorMesh.position.set(0.55, 1.15, 0);
doorGroup.add(doorMesh);

// bookshelves (interactive side) — a real 3D shelf on the right, close to the table
const shelfWoodMat = new THREE.MeshStandardMaterial({ color: 0x7a4c22, roughness: 0.8 });
const shelfUnit = new THREE.Group();
const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.0, 0.08), shelfWoodMat);
shelfBack.position.set(0, 1.0, -0.04);
shelfUnit.add(shelfBack);
const shelfBoardYs = [0.15, 0.75, 1.35, 1.95];
shelfBoardYs.forEach((y) => {
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.42), shelfWoodMat);
  board.position.set(0, y, 0.17);
  shelfUnit.add(board);
});
shelfUnit.position.set(ROOM.x - 0.9, 0, -1.2);
shelfUnit.rotation.y = -Math.PI / 2;
scene.add(shelfUnit);

// books on the second shelf-from-bottom — these are the pickable ones
const bookColors = [0x1d3a6e, 0x2f6b3a, 0x6e1d2e, 0xd8c27a, 0x3a3a5c, 0x8a5a2b];
const books = [];
bookColors.forEach((color, i) => {
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.26, 0.045),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  const localX = -0.6 + i * 0.22;
  book.position.set(localX, 0.9, 0.15);
  book.rotation.z = (Math.random() - 0.5) * 0.08;
  shelfUnit.add(book);
  books.push({ mesh: book, homePos: book.position.clone(), picked: false });
});

// a simple table where the main figure stands
const woodDark = new THREE.MeshStandardMaterial({ color: 0x5c3a1c, roughness: 0.7 });
const table = new THREE.Group();
const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.75), woodDark);
top.position.y = 0.78;
table.add(top);
[[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(([x, z]) => {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.78, 8), woodDark);
  leg.position.set(x, 0.39, z);
  table.add(leg);
});
table.position.set(0.95, 0, -2.6);
scene.add(table);

// ---------- collision (very simple: circle vs. box push-out) ----------
const obstacles = [
  { cx: table.position.x, cz: table.position.z, hx: 0.85, hz: 0.5 },
  { cx: shelfUnit.position.x, cz: shelfUnit.position.z, hx: 0.55, hz: 0.95 },
];
function resolveCollision(pos, radius) {
  obstacles.forEach((o) => {
    const dx = pos.x - o.cx, dz = pos.z - o.cz;
    const ox = o.hx + radius - Math.abs(dx);
    const oz = o.hz + radius - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      if (ox < oz) pos.x += Math.sign(dx || 1) * ox;
      else pos.z += Math.sign(dz || 1) * oz;
    }
  });

  // The front wall only has a gap at the doorway — block crossing it anywhere else,
  // so you can't clip straight through the facade like before.
  const wallZ = ROOM.zDoor;
  const gap = DOOR_HALF_W - radius * 0.5;
  if (Math.abs(pos.x) > Math.max(gap, 0.05) && Math.abs(pos.z - wallZ) < radius) {
    pos.z = (pos.z < wallZ) ? wallZ - radius : wallZ + radius;
  }

  pos.x = clamp(pos.x, -ROOM.x + 0.35, ROOM.x - 0.35);
  pos.z = clamp(pos.z, ROOM.zBack + 0.35, ROOM.outerZ - 0.35);
}

// ---------- the "white viewer" placeholder (outside, before entering) ----------
function makeGhostFigure(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.85, 14), mat);
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
  head.position.y = 1.62;
  g.add(head);
  [-0.12, 0.12].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 10), mat);
    leg.position.set(x, 0.38, 0);
    g.add(leg);
  });
  return g;
}
const viewerGhost = makeGhostFigure(0xffffff);
viewerGhost.position.set(0, 0, 7.6);
scene.add(viewerGhost);

// ---------- main figure (your dressed avatar, loaded from the .glb) ----------
let mainFigure = null;
let headAnchor = null; // world-space eye height comes from this bone if we find it

// The avatar ships with no animation clips, so it renders in its raw bind
// pose — which for this rig is a T-pose. This fixes it by measuring where
// each upper arm currently points (in world space) and rotating it to a
// relaxed "hanging at the side" direction instead. It works from real
// bone positions rather than guessing the rig's local axis conventions,
// which is the part that's normally impossible to get right blind.
function relaxArm(root, boneName, childName, targetDir) {
  const bone = root.getObjectByName(boneName);
  const child = root.getObjectByName(childName);
  if (!bone || !child) { console.warn('relaxArm: bone not found', boneName, childName); return; }

  root.updateMatrixWorld(true);
  const boneWorldPos = new THREE.Vector3();
  const childWorldPos = new THREE.Vector3();
  bone.getWorldPosition(boneWorldPos);
  child.getWorldPosition(childWorldPos);
  const currentDir = childWorldPos.clone().sub(boneWorldPos).normalize();
  const target = targetDir.clone().normalize();

  const deltaQuat = new THREE.Quaternion().setFromUnitVectors(currentDir, target);
  const currentWorldQuat = new THREE.Quaternion();
  bone.getWorldQuaternion(currentWorldQuat);
  const newWorldQuat = deltaQuat.multiply(currentWorldQuat);

  const parentWorldQuat = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(parentWorldQuat);
  const newLocalQuat = parentWorldQuat.invert().multiply(newWorldQuat);

  bone.quaternion.copy(newLocalQuat);
  root.updateMatrixWorld(true);
}

const loader = new GLTFLoader();
let modelReady = false;
loader.load(
  'model.glb',
  (gltf) => {
    mainFigure = gltf.scene;
    mainFigure.visible = false; // revealed once the door opens
    mainFigure.position.set(0.75, 0, -2.55);
    mainFigure.rotation.y = 0; // most glTF avatars face +Z by default — flip to Math.PI if he ends up facing away from you
    mainFigure.traverse((o) => {
      if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
    });
    // Bring the arms down from the T-pose bind pose to a relaxed standing pose.
    // Target directions are in world space: mostly straight down, angled very
    // slightly outward. If the rig turns out mirrored, swap the two X signs below.
    relaxArm(mainFigure, 'LeftArm', 'LeftForeArm', new THREE.Vector3(-0.28, -1, 0.05));
    relaxArm(mainFigure, 'RightArm', 'RightForeArm', new THREE.Vector3(0.28, -1, 0.05));
    headAnchor = mainFigure.getObjectByName('Head') || null;
    scene.add(mainFigure);
    modelReady = true;
    onAssetReady();
  },
  (xhr) => {
    if (xhr.lengthComputable) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      const p = document.querySelector('#loading p');
      if (p) p.textContent = 'Loading the model… ' + pct + '%';
    }
  },
  (err) => {
    console.error('GLB load failed', err);
    const p = document.querySelector('#loading p');
    if (p) p.textContent = 'Error loading model.glb — check it was uploaded next to this file.';
    modelReady = true; // don't block the demo forever
    onAssetReady();
  }
);

// ---------- NPC placeholder ("a figurative lady") ----------
const NPC_NAMES = ['Husaina', 'Fatema', 'Zainab', 'Tasneem', 'Aaliya'];
let npc = null;
let npcSpawned = false;
function nameSprite(text) {
  const cnv = document.createElement('canvas');
  cnv.width = 256; cnv.height = 64;
  const ctx = cnv.getContext('2d');
  ctx.font = '600 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, cnv.width, cnv.height);
  ctx.fillStyle = '#f3ead8';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, cnv.width / 2, 42);
  const tex = new THREE.CanvasTexture(cnv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1.1, 0.28, 1);
  return spr;
}
const npcTex = loadTex('npc.png');
function makeNpc() {
  const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
  const g = new THREE.Group();
  // She's a photo cutout (face already blurred in npc.png) rather than a
  // geometric placeholder — a camera-facing sprite, sized to about human height.
  const aspect = 420 / 641; // width / height of npc.png — update if you swap the image
  const bodyHeight = 1.72;
  const body = new THREE.Sprite(new THREE.SpriteMaterial({ map: npcTex, transparent: true }));
  body.scale.set(bodyHeight * aspect, bodyHeight, 1);
  body.position.y = bodyHeight / 2;
  g.add(body);
  const tag = nameSprite(name);
  tag.position.y = bodyHeight + 0.22;
  g.add(tag);
  g.userData = { type: 'npc', name };
  g.position.set(2.6, 0, -4.2);
  scene.add(g);
  return g;
}
function spawnNpcIfNeeded() {
  if (npcSpawned) return;
  npcSpawned = true;
  npc = makeNpc();
  npcWalkTarget.set(1.55, 0, -2.35);
  showBanner(npc.userData.name + ' enters the room.');
}
const npcWalkTarget = new THREE.Vector3();

// ---------- audio ----------
const bookAudio = document.getElementById('bookDropSound');
function playBookDrop() {
  try { bookAudio.currentTime = 0; bookAudio.play().catch(() => {}); } catch (e) {}
}

// ---------- state machine ----------
const STATE = { INTRO: 'intro', WALKING_IN: 'walkingIn', REVEAL: 'reveal', HANDOFF: 'handoff', PLAY: 'play' };
let state = STATE.INTRO;
let stateT = 0; // seconds since state started
let assetsReady = false;
let userPressedEnter = false;

function onAssetReady() {
  assetsReady = true;
  const btn = document.getElementById('enterBtn');
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
  if (btn) btn.disabled = false;
}

document.getElementById('enterBtn').addEventListener('click', () => {
  if (!assetsReady || userPressedEnter) return;
  userPressedEnter = true;
  document.getElementById('intro-ui').classList.add('hidden');
  state = STATE.WALKING_IN;
  stateT = 0;
});

function showBanner(text, ms = 2600) {
  const el = document.getElementById('banner');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => el.classList.remove('show'), ms);
}
function setPrompt(text) {
  const el = document.getElementById('prompt-text');
  if (text) { el.textContent = text; el.classList.add('show'); }
  else el.classList.remove('show');
}

// ---------- first-person player state ----------
const player = { pos: new THREE.Vector3(0, 1.6, -2.0), yaw: 0, pitch: 0, eyeHeight: 1.62 };
let heldBook = null;

// ---------- touch / mouse controls ----------
const moveVec = { x: 0, y: 0 }; // from joystick: x = strafe, y = forward
let look = { active: false, lastX: 0, lastY: 0 };

function setupJoystick() {
  const base = document.getElementById('joyBase');
  const knob = document.getElementById('joyKnob');
  let dragging = false, originX = 0, originY = 0;
  const maxR = 42;

  function start(x, y) { dragging = true; originX = x; originY = y; }
  function move(x, y) {
    if (!dragging) return;
    let dx = x - originX, dy = y - originY;
    const dist = Math.min(maxR, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    dx = Math.cos(ang) * dist; dy = Math.sin(ang) * dist;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    moveVec.x = dx / maxR;
    moveVec.y = -dy / maxR;
  }
  function end() { dragging = false; moveVec.x = 0; moveVec.y = 0; knob.style.transform = 'translate(0,0)'; }

  base.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; start(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  base.addEventListener('touchmove', (e) => { const t = e.changedTouches[0]; move(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  base.addEventListener('touchend', end);
  // desktop fallback with mouse on the base
  base.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
  window.addEventListener('mouseup', end);
}

function setupLook() {
  const lookZone = document.getElementById('lookZone');
  const onStart = (x, y) => { look.active = true; look.lastX = x; look.lastY = y; };
  const onMove = (x, y) => {
    if (!look.active) return;
    const dx = x - look.lastX, dy = y - look.lastY;
    look.lastX = x; look.lastY = y;
    player.yaw -= dx * 0.0035;
    player.pitch = clamp(player.pitch - dy * 0.0035, -1.2, 1.2);
  };
  const onEnd = () => { look.active = false; };

  lookZone.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; onStart(t.clientX, t.clientY); }, { passive: true });
  lookZone.addEventListener('touchmove', (e) => { const t = e.changedTouches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  lookZone.addEventListener('touchend', onEnd);

  lookZone.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => { if (look.active) onMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', onEnd);
}

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'e') doInteract(); });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

setupJoystick();
setupLook();
document.getElementById('interactBtn').addEventListener('click', doInteract);

// ---------- interaction targeting ----------
let currentTarget = null; // { type:'book', book } | { type:'npc' } | null

function updateTargeting() {
  if (state !== STATE.PLAY) { currentTarget = null; setPrompt(''); return; }
  currentTarget = null;

  if (!heldBook) {
    for (const b of books) {
      if (b.picked) continue;
      const worldPos = new THREE.Vector3();
      b.mesh.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);
      if (dist < 1.9) {
        const toBook = worldPos.clone().sub(camera.position).normalize();
        const facing = camera.getWorldDirection(new THREE.Vector3());
        if (toBook.dot(facing) > 0.75) {
          currentTarget = { type: 'book', book: b };
          break;
        }
      }
    }
  }
  if (!currentTarget && heldBook && npc) {
    const dist = camera.position.distanceTo(npc.position);
    if (dist < 2.4) currentTarget = { type: 'npc' };
  }

  if (currentTarget?.type === 'book') setPrompt('Tap to pick up the book');
  else if (currentTarget?.type === 'npc') setPrompt(`Tap to show ${npc.userData.name} the book`);
  else setPrompt('');
}

function doInteract() {
  if (state !== STATE.PLAY || !currentTarget) return;
  if (currentTarget.type === 'book') {
    const b = currentTarget.book;
    b.picked = true;
    heldBook = b;
    playBookDrop();
    spawnNpcIfNeeded();
  } else if (currentTarget.type === 'npc') {
    showBanner(`You show ${npc.userData.name} the book.`);
    // Open question for next iteration: what should happen here —
    // does she react, take the book, start dialogue, or something else?
  }
}

// ---------- main loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  stateT += dt;

  if (state === STATE.WALKING_IN) {
    const t = clamp(stateT / 1.3, 0, 1);
    const ease = t * t * (3 - 2 * t);
    viewerGhost.position.z = lerp(7.6, 5.3, ease);
    doorGroup.rotation.y = lerp(0, -1.9, ease);
    camera.position.set(0, 1.85, lerp(9.4, 6.9, ease));
    camera.lookAt(viewerGhost.position.x, 1.3, viewerGhost.position.z - 1);
    if (t >= 1) {
      viewerGhost.visible = false;
      if (mainFigure) mainFigure.visible = true;
      state = STATE.REVEAL; stateT = 0;
    }
  } else if (state === STATE.REVEAL) {
    const camPos = new THREE.Vector3(1.9, 1.6, -0.6);
    camera.position.lerp(camPos, 0.06);
    const lookTarget = mainFigure ? mainFigure.position.clone().add(new THREE.Vector3(0, 1.4, 0)) : new THREE.Vector3(0.75, 1.4, -2.55);
    camera.lookAt(lookTarget);
    if (stateT > 2.1) { state = STATE.HANDOFF; stateT = 0; }
  } else if (state === STATE.HANDOFF) {
    const t = clamp(stateT / 1.4, 0, 1);
    const ease = t * t * (3 - 2 * t);
    const eyeY = headAnchor ? headAnchor.getWorldPosition(new THREE.Vector3()).y : player.eyeHeight;
    player.eyeHeight = eyeY > 0.5 ? eyeY : 1.62;
    player.pos.set(0.75, player.eyeHeight, -2.0);
    player.yaw = 0; // yaw 0 == looking down -Z, matching the lookAt() above
    const fromPos = new THREE.Vector3(1.9, 1.6, -0.6);
    const toPos = player.pos.clone();
    camera.position.lerpVectors(fromPos, toPos, ease);
    const fromLook = mainFigure ? mainFigure.position.clone().add(new THREE.Vector3(0, 1.4, 0)) : toPos.clone();
    const toLook = toPos.clone().add(new THREE.Vector3(0, 0, -1));
    const lookPt = fromLook.clone().lerp(toLook, ease);
    camera.lookAt(lookPt);
    if (t >= 1) {
      if (mainFigure) mainFigure.visible = false; // first-person: hide own body
      state = STATE.PLAY; stateT = 0;
      document.getElementById('touchUI').classList.add('show');
      document.getElementById('crosshair').classList.add('show');
    }
  } else if (state === STATE.PLAY) {
    const speed = 2.1;
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).multiplyScalar(-1);
    const right = new THREE.Vector3(-forward.z, 0, forward.x); // perpendicular to forward, pointing screen-right
    let mx = moveVec.x, my = moveVec.y;
    if (keys['w']) my += 1; if (keys['s']) my -= 1;
    if (keys['a']) mx -= 1; if (keys['d']) mx += 1;
    mx = clamp(mx, -1, 1); my = clamp(my, -1, 1);

    const delta = new THREE.Vector3();
    delta.addScaledVector(forward, my * speed * dt);
    delta.addScaledVector(right, mx * speed * dt);
    player.pos.add(delta);
    resolveCollision(player.pos, 0.32);
    player.pos.y = player.eyeHeight;

    camera.position.copy(player.pos);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

    if (heldBook) {
      const holdOffset = new THREE.Vector3(0.32, -0.28, -0.65).applyEuler(camera.rotation);
      heldBook.mesh.position.copy(camera.position).add(holdOffset);
      heldBook.mesh.rotation.copy(camera.rotation);
    }
    if (npc) {
      npc.position.lerp(npcWalkTarget, 0.01); // she's a sprite, so she always faces the camera automatically
    }
    updateTargeting();
  }

  renderer.render(scene, camera);
}
animate();
