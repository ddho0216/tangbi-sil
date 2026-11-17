import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DRINK_IMG } from './drink-images.js';
import { SNACK_IMG } from './snack-images.js';

/* ---------- 저장소 (브라우저 localStorage, 접속한 사람 본인 것만) ---------- */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('tb:' + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('tb:' + key, JSON.stringify(value)); } catch {}
  }
};

/* ---------- 장면 기본 ---------- */
const stage = document.getElementById('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe4d9c4);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100);
camera.position.set(13.1, 7.3, 12.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const ENV_TEX = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;   // 방 안 반사광 (금속·유광이 진짜처럼 보이게)

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(2.5, 1.3, 0.8);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 0.6;
controls.maxDistance = 32;
controls.minAzimuthAngle = -0.15;
controls.maxAzimuthAngle = Math.PI / 2 + 0.15;

const hemi = new THREE.HemisphereLight(0xfff4e4, 0xb8a98c, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e0, 2.0);
sun.position.set(9, 11, 9);
sun.target.position.set(2.5, 0, 1); scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(3072, 3072); sun.shadow.radius = 4; sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 12, bottom: -12, far: 40 });
scene.add(sun);

/* ---------- 도우미 (둥근 모서리 위주로, 각진 느낌을 줄인다) ---------- */
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, envMap: ENV_TEX, envMapIntensity: 0.4, ...opts });
}
function put(mesh, x, y, z, parent) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function rbox(w, h, d, color, x, y, z, parent = scene, r = 0.05, opts) {
  const rad = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  return put(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat(color, opts)), x, y, z, parent);
}
function cyl(rt, rb, h, color, x, y, z, parent = scene, opts) {
  return put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 32), mat(color, opts)), x, y, z, parent);
}
function sph(r, color, x, y, z, parent = scene, scale = [1, 1, 1], opts) {
  const m = put(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat(color, opts)), x, y, z, parent);
  m.scale.set(...scale);
  return m;
}

/* ---------- 방 ---------- */
const X0 = -5, X1 = 10, Z0 = -4, Z1 = 6;                 // 방: 가로 15m x 세로 10m (왼쪽 뒤 모서리는 그대로 두고 오른쪽과 앞쪽으로 넓혔다)
const W = X1 - X0, D = Z1 - Z0, RCX = (X0 + X1) / 2, RCZ = (Z0 + Z1) / 2;
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; t.userData.shared = true;
  return t;
}
// 바닥: 밝은 오크 마루 (바둑판 모양으로 방향이 번갈아 가는 파케이)
const parquet = canvasTex(512, 512, (g, S) => {
  const base = ['#dcc39a', '#d3b788', '#e0caa4', '#d0b080', '#e3cfab'], bs = S / 2;
  for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
    const horiz = (bx + by) % 2 === 0;
    for (let k = 0; k < 4; k++) {
      const x = horiz ? bx * bs : bx * bs + k * bs / 4, y = horiz ? by * bs + k * bs / 4 : by * bs, w = horiz ? bs : bs / 4, h = horiz ? bs / 4 : bs;
      g.fillStyle = base[(bx * 7 + by * 3 + k * 2 + (horiz ? 1 : 0)) % 5]; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(130,92,52,0.13)'; g.lineWidth = 1;
      for (let n = 0; n < 4; n++) { g.beginPath(); if (horiz) { const yy = y + 6 + n * 13 + (k % 2) * 3; g.moveTo(x, yy); g.lineTo(x + w, yy + 2); } else { const xx = x + 6 + n * 13 + (k % 2) * 3; g.moveTo(xx, y); g.lineTo(xx + 2, y + h); } g.stroke(); }
      g.strokeStyle = 'rgba(95,66,36,0.4)'; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }
}, W / 1.6, D / 1.6);
rbox(W, 0.2, D, 0xcdb48f, RCX, -0.1, RCZ, scene, 0.01);                                    // 바닥 받침
const floorTop = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: parquet, roughness: 0.38, metalness: 0.02 }));
floorTop.rotation.x = -Math.PI / 2; floorTop.position.set(RCX, 0.003, RCZ); floorTop.receiveShadow = true; scene.add(floorTop);
rbox(W, 4.2, 0.2, 0xefebe3, RCX, 2.1, Z0, scene, 0.01);                                    // 뒷벽 (따뜻한 흰색)
rbox(0.2, 4.2, D, 0xe7e3da, X0, 2.1, RCZ, scene, 0.01);                                    // 왼벽
rbox(W, 0.12, 0.03, 0xf8f7f4, RCX, 0.06, Z0 + 0.115, scene, 0.005);                        // 걸레받이 (흰색)
rbox(0.03, 0.12, D, 0xf8f7f4, X0 + 0.115, 0.06, RCZ, scene, 0.005);
// 카운터 뒤 서브웨이 타일
const subway = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#cfcbc3'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) { const x = c * 128 + (r % 2 ? 64 : 0); g.fillStyle = r % 2 ? '#f7f6f3' : '#f3f2ee'; g.fillRect(x + 2, r * 64 + 2, 124, 60); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 2, r * 64 + 2, 124, 5); }
}, 5.7 / 1.2, 0.75 / 0.6);
const tilePlane = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 0.75), new THREE.MeshStandardMaterial({ map: subway, roughness: 0.25 }));
tilePlane.position.set(0.1, 1.31, Z0 + 0.105); tilePlane.receiveShadow = true; scene.add(tilePlane);
// 오른쪽 뒷벽: 오크 슬랫 포인트 벽
const slats = canvasTex(256, 256, (g, w, h) => {
  const cols = ['#c9a77a', '#bf9d70', '#d0b084', '#c4a276'];
  for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i * 16, 0, 13, h); g.fillStyle = 'rgba(60,40,20,0.55)'; g.fillRect(i * 16 + 13, 0, 3, h); g.fillStyle = 'rgba(120,85,45,0.18)'; for (let n = 0; n < 5; n++) g.fillRect(i * 16 + 2 + n * 2, (n * 53 + i * 17) % h, 1, 60); }
}, 3, 1);
const slatWall = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.4), new THREE.MeshStandardMaterial({ map: slats, roughness: 0.6 }));
slatWall.position.set(7.15, 1.75, Z0 + 0.105); slatWall.receiveShadow = true; scene.add(slatWall);

// (창문은 아래에서 날씨가 비치는 창문으로 만든다)

/* ---------- 클릭 가능한 물건 ---------- */
const clickable = [];
function makeInteractive(group, id, label) {
  group.traverse(o => { if (o.isMesh) o.userData.owner = group; });
  group.userData.id = id;
  group.userData.label = label;
  clickable.push(group);
  scene.add(group);
  return group;
}
const glow = {};   // id -> { mat, on, off }
function setGlow(id, on) {
  const g = glow[id]; if (!g) return;
  g.mat.emissive.set(on ? g.on : 0x000000);
  g.mat.emissiveIntensity = on ? 1 : 0;
}

/* ---------- 카운터 (뒷벽) ---------- */
const CZ = -3.45;
rbox(5.6, 0.85, 0.9, 0xe9e7e2, 0.1, 0.425, CZ, scene, 0.015);
rbox(5.7, 0.08, 1.0, 0x3a3d42, 0.1, 0.89, CZ, scene, 0.03, { roughness: 0.35 });   // 짙은 차콜 상판
for (let i = 0; i <= 5; i++) rbox(0.012, 0.76, 0.02, 0x8d8a83, -2.5 + i * 0.94, 0.45, CZ + 0.46, scene, 0.004);
for (let i = 3; i < 5; i++) rbox(0.22, 0.02, 0.025, 0x2e3338, -2.03 + i * 0.94, 0.78, CZ + 0.47, scene, 0.008, STEEL);

/* ---------- 가전 공통: 파스텔 색과 크롬 ---------- */
const PASTEL = { mint: 0xc5cacd, blue: 0x30363b, cream: 0xe7e4dd, pink: 0xc2c7ca, lemon: 0xe9e3c9 };   // (이름은 예전 그대로, 색은 스테인리스·그래파이트·오프화이트)
const STEEL = { metalness: 0.55, roughness: 0.36, envMapIntensity: 1.2 };
const CHROME = { metalness: 0.4, roughness: 0.25 };
const CHROME_C = 0xe6eaed;


/* ---------- 과자 자판기 (오른쪽 슬랫 벽 앞) ---------- */
const VEND = [
  { n: '새우깡', p: 1500, c: '#e7873a' }, { n: '포카칩', p: 1700, c: '#f0b323' }, { n: '오징어땅콩', p: 1500, c: '#d8452b' },
  { n: '초코파이', p: 2000, c: '#c8102e' }, { n: '빼빼로', p: 1800, c: '#d7263d' }, { n: '홈런볼', p: 1700, c: '#2b7bc4' }];
const vend = new THREE.Group();
rbox(1.0, 1.9, 0.82, 0x2e3338, 0, 1.0, 0, vend, 0.03, { roughness: 0.45, metalness: 0.15 });                 // 본체 (짙은 그래파이트)
rbox(1.04, 0.06, 0.86, 0x3b4147, 0, 1.97, 0, vend, 0.02);
rbox(0.96, 0.18, 0.02, 0x1f2428, -0.0, 1.8, 0.415, vend, 0.01);                                              // 윗 간판 자리
const vendSign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.14), new THREE.MeshBasicMaterial({ map: canvasTex(360, 56, (g, w, h) => {
  g.fillStyle = '#1b2024'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 34px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SNACK  ·  과자 자판기', w / 2, h / 2 + 2);
  g.fillStyle = '#e8b04a'; g.fillRect(20, h - 7, w - 40, 3);
}) }));
vendSign.position.set(0, 1.8, 0.427); vend.add(vendSign);
const vendGoods = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.42), new THREE.MeshBasicMaterial({ map: canvasTex(310, 710, (g, w, h) => {   // 진열된 과자 (불 켜진 안쪽)
  g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 6; r++) {
    const y0 = r * 118 + 8; g.fillStyle = '#d9d6cf'; g.fillRect(0, y0 + 96, w, 6);
    const v = VEND[r];
    for (let k = 0; k < 4; k++) {
      const x = 12 + k * 74;
      g.fillStyle = v.c; g.fillRect(x, y0 + 10, 62, 86); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y0 + 10, 62, 20);
      g.fillStyle = '#ffffff'; g.font = 'bold 14px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillText(v.n, x + 31, y0 + 58);
    }
    g.fillStyle = '#2b2f33'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText(`${String.fromCharCode(65 + r)}  ${v.p.toLocaleString()}원`, w / 2, y0 + 114);
  }
}) }));
vendGoods.position.set(-0.13, 1.0, 0.417); vend.add(vendGoods);
rbox(0.68, 1.48, 0.012, 0x0d1114, -0.13, 1.0, 0.41, vend, 0.004);                                              // 유리창 테두리
rbox(0.64, 1.44, 0.012, 0xbcd6e6, -0.13, 1.0, 0.432, vend, 0.004, { transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2 });   // 유리
const vendDisp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.07), new THREE.MeshBasicMaterial({ map: canvasTex(100, 36, (g, w, h) => {
  g.fillStyle = '#0c1410'; g.fillRect(0, 0, w, h); g.fillStyle = '#6dff9a'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('0 원', w / 2, h / 2);
}) }));
vendDisp.position.set(0.38, 1.55, 0.418); vend.add(vendDisp);
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rbox(0.045, 0.03, 0.012, 0xcfd3d6, 0.31 + c * 0.07, 1.4 - r * 0.07, 0.418, vend, 0.005);    // 키패드
rbox(0.2, 0.07, 0.012, 0x15191c, 0.38, 1.05, 0.418, vend, 0.005);                                              // 카드 단말기
rbox(0.1, 0.02, 0.014, 0x6dff9a, 0.38, 1.05, 0.425, vend, 0.004, { emissive: 0x3ccf6a, emissiveIntensity: 0.8 });
rbox(0.05, 0.1, 0.012, 0x15191c, 0.38, 0.88, 0.418, vend, 0.005);                                              // 동전 투입구
rbox(0.8, 0.2, 0.02, 0x16191c, 0, 0.2, 0.418, vend, 0.01);                                                     // 수취구
rbox(0.72, 0.15, 0.012, 0x07090a, 0, 0.2, 0.43, vend, 0.01);
vend.position.set(7.0, 0.05, -3.44);
makeInteractive(vend, 'vending', '과자 자판기 · 눌러서 사 보기');

/* ---------- 라운지 한쪽 (소파 + 작은 테이블 + 화분 + 액자) ---------- */
const sofa = new THREE.Group();
rbox(0.95, 0.34, 2.5, 0x9c968c, 0, 0.3, 0, sofa, 0.06);
rbox(0.26, 0.6, 2.5, 0x8f897f, 0.4, 0.72, 0, sofa, 0.06);
[-0.9, 0, 0.9].forEach(z => rbox(0.7, 0.16, 0.78, 0xb2ada3, -0.06, 0.55, z, sofa, 0.06));
[-1.22, 1.22].forEach(z => rbox(0.95, 0.5, 0.18, 0x8f897f, 0, 0.5, z, sofa, 0.05));
[[-0.4, -1.1], [-0.4, 1.1], [0.4, -1.1], [0.4, 1.1]].forEach(([x, z]) => cyl(0.03, 0.025, 0.1, 0x3b3631, x, 0.05, z, sofa));
sofa.position.set(9.35, 0, 1.5);
scene.add(sofa);
const sideT = new THREE.Group();
rbox(0.55, 0.04, 0.55, 0xd8bf96, 0, 0.5, 0, sideT, 0.015); cyl(0.04, 0.04, 0.48, 0x2e3338, 0, 0.25, 0, sideT);
cyl(0.2, 0.2, 0.02, 0x2e3338, 0, 0.01, 0, sideT);
cyl(0.09, 0.07, 0.16, 0xf1eee8, 0, 0.6, 0, sideT);
[[0, 0.78, 0, 0.12], [0.07, 0.72, 0.04, 0.09], [-0.07, 0.74, -0.03, 0.09], [0.02, 0.86, -0.04, 0.08]].forEach(([x, y, z, r]) => sph(r, 0x5f8f5a, x, y, z, sideT, [1, 1.1, 1]));
sideT.position.set(9.3, 0, -1.2);
scene.add(sideT);
function posterTex(top, mid, bot, bg, fg) {
  return canvasTex(220, 300, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center';
    g.font = 'bold 30px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.fillText(top, w / 2, 70);
    g.beginPath(); g.arc(w / 2, 150, 44, 0, 7); g.lineWidth = 6; g.strokeStyle = fg; g.stroke();
    g.beginPath(); g.moveTo(w / 2 - 22, 150); g.lineTo(w / 2 + 22, 150); g.stroke();
    g.font = '22px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.fillText(mid, w / 2, 244); g.font = '15px sans-serif'; g.fillText(bot, w / 2, 274);
  });
}
[[5.2, 2.2, 'TAKE A BREAK', '잠깐 쉬어가요', 'PANTRY ROOM', '#f3efe6', '#2f3a40'], [9.3, 2.3, 'COFFEE', '커피 한 잔', 'since 9:00', '#2f3a40', '#f3efe6']].forEach(([x, y, a1, a2, a3, bg, fg]) => {
  rbox(0.62, 0.85, 0.03, 0x2b2b2b, x, y, Z0 + 0.12, scene, 0.008);
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.77), new THREE.MeshStandardMaterial({ map: posterTex(a1, a2, a3, bg, fg), roughness: 0.8 }));
  pm.position.set(x, y, Z0 + 0.138); scene.add(pm);
});


// 카운터 위 상부장 (화이트 도어, 하부 간접조명)
for (let i = 0; i < 6; i++) {
  const x = -2.55 + i * 0.93;
  rbox(0.9, 0.85, 0.36, 0xeceae6, x, 2.32, Z0 + 0.3, scene, 0.012);
  rbox(0.2, 0.02, 0.025, 0x2e3338, x + (i % 2 ? -0.3 : 0.3), 1.95, Z0 + 0.49, scene, 0.008, STEEL);
}
rbox(5.6, 0.02, 0.34, 0xfff3d6, 0.1, 1.88, Z0 + 0.3, scene, 0.005, { emissive: 0xffe2a8, emissiveIntensity: 1.2 });   // 상부장 아래 조명

/* ---------- 에스프레소 머신 (그래파이트 + 크롬) ---------- */
const coffee = new THREE.Group();
rbox(0.5, 0.05, 0.36, CHROME_C, 0, 0.025, 0.02, coffee, 0.02, CHROME);          // 크롬 받침
rbox(0.42, 0.012, 0.27, 0x9aa1a6, 0, 0.056, 0.05, coffee, 0.005);               // 드립 그릴
rbox(0.3, 0.5, 0.22, PASTEL.blue, 0, 0.3, -0.09, coffee, 0.03, { roughness: 0.35 });                  // 기둥
rbox(0.42, 0.2, 0.32, PASTEL.blue, 0, 0.5, 0.0, coffee, 0.03, { roughness: 0.35 });                   // 머리
cyl(0.06, 0.05, 0.04, CHROME_C, 0, 0.385, 0.08, coffee, CHROME);                // 포터필터
const pfHandle = cyl(0.016, 0.016, 0.2, 0x2f3438, -0.16, 0.375, 0.13, coffee);  // 검은 손잡이
pfHandle.rotation.z = Math.PI / 2;
cyl(0.008, 0.008, 0.22, CHROME_C, 0.2, 0.34, 0.13, coffee, CHROME);             // 스팀 완드
sph(0.02, CHROME_C, 0.15, 0.605, 0.04, coffee);                                 // 크롬 손잡이
rbox(0.07, 0.3, 0.16, 0xdff0f5, 0.235, 0.32, -0.05, coffee, 0.03, { transparent: true, opacity: 0.5 });  // 물탱크
const coffeeLamp = sph(0.014, 0x7be0a0, 0, 0.52, 0.162, coffee, [1, 1, 0.6], { emissive: 0x000000 });
glow.coffee = { mat: coffeeLamp.material, on: 0xff8a3d, off: 0 };
cyl(0.04, 0.032, 0.06, 0xffffff, 0, 0.095, 0.07, coffee);                       // 에스프레소 잔
coffee.position.set(-2.15, 0.93, CZ);
makeInteractive(coffee, 'coffee', '에스프레소 머신');

/* ---------- 토스터 (크림) ---------- */
const toaster = new THREE.Group();
const breads = [];
rbox(0.52, 0.025, 0.28, CHROME_C, 0, 0.0125, 0, toaster, 0.01, CHROME);
rbox(0.5, 0.28, 0.26, 0xcfd2d5, 0, 0.17, 0, toaster, 0.05, STEEL);
const slotMat = rbox(0.4, 0.008, 0.04, 0x6e6a62, 0, 0.312, 0.05, toaster, 0.004);
rbox(0.4, 0.008, 0.04, 0x6e6a62, 0, 0.312, -0.05, toaster, 0.004).material = slotMat.material;
glow.toaster = { mat: slotMat.material, on: 0xff6a3d, off: 0 };
[-0.05, 0.05].forEach(dz => {
  const b = rbox(0.2, 0.07, 0.012, 0xe0b873, 0, 0.33, dz, toaster, 0.005);
  b.userData.y0 = 0.33; breads.push(b);
});
cyl(0.01, 0.01, 0.05, CHROME_C, 0.265, 0.26, 0, toaster, CHROME).rotation.z = Math.PI / 2;
sph(0.022, CHROME_C, 0.3, 0.26, 0, toaster);
cyl(0.045, 0.045, 0.02, CHROME_C, 0.255, 0.12, 0.08, toaster, CHROME).rotation.z = Math.PI / 2;
toaster.position.set(-0.8, 0.93, CZ);
makeInteractive(toaster, 'toaster', '토스터');


/* ---------- 전자레인지 (파스텔 핑크) ---------- */
const microwave = new THREE.Group();
rbox(0.9, 0.02, 0.5, CHROME_C, 0, 0.01, 0, microwave, 0.008, CHROME);
rbox(0.96, 0.5, 0.56, 0xc6cacd, 0, 0.27, 0, microwave, 0.04, STEEL);
rbox(0.62, 0.42, 0.03, 0x1b1e21, -0.12, 0.28, 0.285, microwave, 0.04);
const mwDoor = rbox(0.55, 0.35, 0.03, 0x2b3036, -0.12, 0.28, 0.3, microwave, 0.03, { roughness: 0.15 });
glow.microwave = { mat: mwDoor.material, on: 0xff9a2e, off: 0 };
cyl(0.06, 0.06, 0.04, CHROME_C, 0.36, 0.38, 0.29, microwave, CHROME).rotation.x = Math.PI / 2;
cyl(0.06, 0.06, 0.04, CHROME_C, 0.36, 0.18, 0.29, microwave, CHROME).rotation.x = Math.PI / 2;
rbox(0.12, 0.05, 0.01, 0xcfe9e0, 0.36, 0.28, 0.285, microwave, 0.01, { emissive: 0x6fb5a0, emissiveIntensity: 0.4 });
rbox(0.03, 0.3, 0.04, CHROME_C, 0.2, 0.28, 0.32, microwave, 0.012, CHROME);
microwave.position.set(0.6, 0.93, CZ);
makeInteractive(microwave, 'microwave', '전자레인지');


/* ---------- 전기포트 (파스텔 민트, 동글동글) ---------- */
const kettle = new THREE.Group();
const kBase = cyl(0.18, 0.19, 0.035, 0xcfd6da, 0, 0.0175, 0, kettle, CHROME);
glow.kettle = { mat: kBase.material, on: 0x2d9cdb, off: 0 };
cyl(0.12, 0.15, 0.38, 0xd5d8db, 0, 0.22, 0, kettle, STEEL);
cyl(0.065, 0.09, 0.03, CHROME_C, 0, 0.405, 0, kettle, CHROME);
sph(0.026, CHROME_C, 0, 0.435, 0, kettle);
cyl(0.015, 0.055, 0.12, CHROME_C, 0.16, 0.32, 0, kettle, CHROME).rotation.z = -0.8;
const kHandle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 10, 24, Math.PI), mat(CHROME_C, CHROME));
put(kHandle, -0.14, 0.24, 0, kettle).rotation.z = Math.PI / 2;
kettle.position.set(1.65, 0.93, CZ);
makeInteractive(kettle, 'kettle', '전기포트');

/* ---------- 대형 냉장고 (파스텔 민트, 열리는 문) ---------- */
const fridge = new THREE.Group();
const fridgeInner = { emissive: 0xffffff, emissiveIntensity: 0.03 };
rbox(0.06, 2.4, 1.5, 0xd6dbde, -0.62, 1.2, 0, fridge, 0.02, fridgeInner);            // 뒷판
rbox(1.3, 2.4, 0.06, 0xc9ced1, 0, 1.2, -0.72, fridge, 0.02, STEEL);                      // 옆판
rbox(1.3, 2.4, 0.06, 0xc9ced1, 0, 1.2, 0.72, fridge, 0.02, STEEL);
rbox(1.3, 0.12, 1.5, 0x3a3f44, 0, 0.06, 0, fridge, 0.02);                         // 하단
rbox(1.3, 0.08, 1.5, 0xc9ced1, 0, 1.52, 0, fridge, 0.02, STEEL);                         // 칸막이
rbox(1.3, 0.16, 1.5, 0xc9ced1, 0, 2.34, 0, fridge, 0.02, STEEL);                         // 둥근 윗판
rbox(1.2, 1.36, 0.012, 0xd6dbde, -0.02, 0.82, -0.684, fridge, 0.004, fridgeInner);   // 안쪽 벽
rbox(1.2, 1.36, 0.012, 0xd6dbde, -0.02, 0.82, 0.684, fridge, 0.004, fridgeInner);
rbox(1.2, 0.012, 1.36, 0xd6dbde, -0.02, 0.13, 0, fridge, 0.004, fridgeInner);
for (const y of [0.5, 0.88, 1.2]) rbox(1.18, 0.018, 1.36, 0xdff0f2, -0.02, y, 0, fridge, 0.008, { transparent: true, opacity: 0.55 });
for (let i = 0; i < 3; i++) rbox(0.02, 0.012, 1.46, CHROME_C, 0.66, 0.03 + i * 0.03, 0, fridge, 0.005, CHROME);   // 크롬 하단 선
// 냉동실 문 (냉장실과 따로, 경첩이 뒤쪽에 있어 앞으로 열린다) + 안쪽
const fridgeInner2 = { emissive: 0x5d7688, emissiveIntensity: 0.06 };   // 냉동실 안쪽은 한 톤 어둡게
const freezerParts = [
  rbox(1.2, 0.7, 0.012, 0x9fb0bb, -0.02, 1.92, -0.684, fridge, 0.004, fridgeInner2),
  rbox(1.2, 0.7, 0.012, 0x9fb0bb, -0.02, 1.92, 0.684, fridge, 0.004, fridgeInner2),
  rbox(1.2, 0.012, 1.36, 0x9fb0bb, -0.02, 1.57, 0, fridge, 0.004, fridgeInner2),
  rbox(1.2, 0.012, 1.36, 0x9fb0bb, -0.02, 2.27, 0, fridge, 0.004, fridgeInner2),
  rbox(1.18, 0.018, 1.36, 0xdff0f2, -0.02, 1.92, 0, fridge, 0.008, { transparent: true, opacity: 0.55 })
];
const freezerDoor = new THREE.Group();
rbox(0.07, 0.84, 1.44, 0xc9ced1, 0, 0.42, 0.72, freezerDoor, 0.02, STEEL);
rbox(0.02, 0.76, 1.36, 0x9fb0bb, -0.045, 0.42, 0.72, freezerDoor, 0.004, { emissive: 0x5d7688, emissiveIntensity: 0.06 });
rbox(0.035, 0.5, 0.035, 0x8f969b, 0.075, 0.42, 1.3, freezerDoor, 0.012, STEEL);
rbox(0.02, 0.1, 0.08, 0xe9b949, 0.04, 0.6, 0.5, freezerDoor, 0.02);
freezerDoor.position.set(0.65, 1.56, -0.72);
fridge.add(freezerDoor);
const freezerItems = new THREE.Group();
fridge.add(freezerItems);
// 냉동실은 누르면 냉동실만 열리도록, 냉동실에 속한 부품의 "주인"을 따로 둔다
const freezerOwner = new THREE.Group();
freezerOwner.userData.id = 'freezer'; freezerOwner.userData.label = '냉동실 · 눌러서 열기';
fridge.add(freezerOwner);
// 냉장실 문 (경첩이 뒤쪽 -z, 앞으로 열린다)
const fridgeDoor = new THREE.Group();
rbox(0.07, 1.38, 1.44, 0xc9ced1, 0, 0.69, 0.72, fridgeDoor, 0.02, STEEL);
rbox(0.02, 1.3, 1.36, 0xd6dbde, -0.045, 0.69, 0.72, fridgeDoor, 0.004, fridgeInner);
rbox(0.1, 0.02, 1.3, 0xdff0f2, -0.1, 0.45, 0.72, fridgeDoor, 0.008);
rbox(0.1, 0.02, 1.3, 0xdff0f2, -0.1, 0.95, 0.72, fridgeDoor, 0.008);
rbox(0.035, 0.95, 0.035, 0x8f969b, 0.075, 0.75, 1.3, fridgeDoor, 0.012, STEEL);
rbox(0.02, 0.12, 0.08, 0xd94e4e, 0.04, 1.2, 0.35, fridgeDoor, 0.02);                 // 마그넷
rbox(0.02, 0.1, 0.1, 0x2b6cb0, 0.04, 1.0, 0.2, fridgeDoor, 0.02);
fridgeDoor.position.set(0.65, 0.12, -0.72);
fridge.add(fridgeDoor);
const fridgeLight = new THREE.PointLight(0xfff2dd, 0, 2.6);
fridgeLight.position.set(0.05, 1.0, 0);
fridge.add(fridgeLight);
const freezerLight = new THREE.PointLight(0xe8f4ff, 0, 2.4);
freezerLight.position.set(0.05, 1.95, 0);
fridge.add(freezerLight);
const fridgeItems = new THREE.Group();
fridge.add(fridgeItems);
fridge.position.set(-4.15, 0, 0.1);
makeInteractive(fridge, 'fridge', '냉장실 · 눌러서 열기');
freezerDoor.traverse(o => { if (o.isMesh) o.userData.owner = freezerOwner; });
freezerParts.forEach(m => { m.userData.owner = freezerOwner; });

const TAG_COLORS = ['#fdf5c4', '#d9efe4', '#fbe0e6', '#dbe9f6'];
function makeTag(text, color, w, h, sub, old) {
  let tex;
  if (sub) {   // 이름 + 아래 줄에 "몇 시간 전" (하루가 넘으면 빨간색)
    const c = document.createElement('canvas'); c.width = 224; c.height = 130;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 224, 130);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrap(text, 7).slice(0, 2);
    g.fillStyle = '#2b2620'; g.font = `38px ${NOTE_FONT}`;
    lines.forEach((l, i) => g.fillText(l, 112, (lines.length === 1 ? 46 : 30) + i * 36));
    g.fillStyle = old ? '#c0392b' : '#5b5346'; g.font = `32px ${NOTE_FONT}`;
    g.fillText(sub, 112, 108);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  } else tex = textTexture(wrap(text, 7).slice(0, 2), color, '#2b2620', 224, 100, 42);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  m.rotation.y = Math.PI / 2;
  return m;
}
// 도시락: 칸막이 있는 사각 통 + 속이 비치는 뚜껑 + 걸쇠. 이름에 따라 속이 다르다
function lunchBox(g, name, c) {
  const dark = new THREE.Color(c).multiplyScalar(0.72).getHex();
  rbox(0.25, 0.055, 0.32, c, 0, -0.022, 0, g, 0.02);                                      // 통
  rbox(0.225, 0.012, 0.295, 0xf8f5ee, 0, 0.008, 0, g, 0.006);                              // 속 바닥
  if (name.includes('샐러드')) {
    [[-0.05, -0.08, 0x6fb56a], [0.05, -0.04, 0x8cc76f], [-0.03, 0.05, 0x5aa05a], [0.05, 0.08, 0x9ad07f]].forEach(([x, z, col]) => sph(1, col, x, 0.04, z, g, [0.06, 0.03, 0.05]));
    [[0.0, -0.01, 0xd94e4e], [-0.06, 0.1, 0xd94e4e], [0.06, -0.11, 0xe9c46a]].forEach(([x, z, col]) => sph(1, col, x, 0.058, z, g, [0.022, 0.016, 0.022]));
  } else if (name.includes('샌드위치')) {
    [-0.065, 0.065].forEach(z => {
      rbox(0.19, 0.022, 0.1, 0xe3c58f, 0, 0.026, z, g, 0.008); rbox(0.185, 0.012, 0.095, 0x78b26a, 0, 0.042, z, g, 0.004);
      rbox(0.18, 0.014, 0.09, 0xe8a1a1, 0, 0.052, z, g, 0.004); rbox(0.19, 0.022, 0.1, 0xe3c58f, 0, 0.068, z, g, 0.008);
    });
  } else {
    rbox(0.012, 0.03, 0.295, dark, 0, 0.03, 0.0, g, 0.004); rbox(0.115, 0.03, 0.012, dark, 0.06, 0.03, 0.02, g, 0.004);   // 칸막이
    sph(1, 0xfdfbf4, -0.062, 0.035, 0.0, g, [0.052, 0.034, 0.12]);                         // 밥
    sph(1, 0x2f3a2c, -0.062, 0.058, 0.0, g, [0.022, 0.004, 0.05]);                         // 김가루
    [[0.062, -0.085, 0xd9803a], [0.062, 0.095, 0x5aa05a], [0.062, 0.1, 0x8a3b24]].forEach(([x, z, col], k) => { if (k < 2) sph(1, col, x, 0.034, z - (k ? 0 : 0.0), g, [0.04, 0.024, 0.04]); });
    sph(1, 0xf2d03b, 0.065, 0.034, 0.045, g, [0.04, 0.02, 0.045]);                         // 계란말이
    sph(1, 0x8a3b24, 0.065, 0.034, 0.0, g, [0.03, 0.018, 0.02]);
  }
  rbox(0.255, 0.014, 0.325, c, 0, 0.0, 0, g, 0.01);                                          // 뚜껑 테두리
  rbox(0.235, 0.022, 0.305, 0xffffff, 0, 0.052, 0, g, 0.008, { transparent: true, opacity: 0.3, roughness: 0.1 });   // 속이 비치는 뚜껑
  [-0.165, 0.165].forEach(z => rbox(0.07, 0.04, 0.014, dark, 0, 0.022, z, g, 0.005));     // 양 끝 걸쇠
}
function refreshFridge() {
  fridgeItems.children.slice().forEach(c => { fridgeItems.remove(c); disposeObj(c); });
  itemTargets.fridge = []; tagList.fridge = []; hoverItem = null;
  const slot = i => -0.5 + i * 0.34;
  // 맨 위 칸: 도시락 (이름표는 확대했을 때만 나타난다)
  const boxColors = [0xf6d9c9, 0xcfe6f2, 0xf3ecc4, 0xd5ecd8];
  getBoxes().slice(0, 4).forEach((b, i) => {
    const g = newItem(fridgeItems, 'box', i); g.position.set(0.12, 1.265, slot(i));
    lunchBox(g, b.name, boxColors[i % 4]);
    addTag(g, 'fridge', makeTag(b.name, TAG_COLORS[i % 4], 0.2, 0.115, ago(b.at), Date.now() - b.at > DAY), 0.126, 0, 0);
    finishItem(g, itemTargets.fridge);
  });
  // 가운데 칸: 먹던 커피
  getCups().slice(0, 4).forEach((c, i) => {
    const g = newItem(fridgeItems, 'cup', i); g.position.set(0.12, 0.969, slot(i));
    cyl(0.062, 0.045, 0.16, 0xe8f2f4, 0, 0, 0, g, { transparent: true, opacity: 0.45 });
    cyl(0.055, 0.042, 0.1, 0x6b4a35, 0, -0.03, 0, g);
    cyl(0.064, 0.064, 0.015, 0xffffff, 0, 0.086, 0, g);
    cyl(0.006, 0.006, 0.12, 0xd94e4e, 0, 0.13, 0, g).rotation.z = 0.15;
    addTag(g, 'fridge', makeTag(c.name, TAG_COLORS[(i + 2) % 4], 0.19, 0.11, ago(c.at), Date.now() - c.at > DAY), 0.07, -0.005, 0);
    finishItem(g, itemTargets.fridge);
  });
  // 아래 칸: 음료수 (실제 제품 사진)
  getDrinks().slice(0, 6).forEach(([name, q], i) => {
    for (let j = 0; j < Math.min(q, 3); j++) {
      const g = newItem(fridgeItems, 'drink', i);
      const h = buildDrink(g, name, i);
      g.position.set(0.3 - j * 0.1, 0.509 + h / 2 + 0.004, -0.55 + i * 0.22);
      finishItem(g, itemTargets.fridge);
    }
  });
  fridgeItems.traverse(o => { if (o.isMesh) o.userData.owner = fridge; });
  refreshFreezer();
}

const FRZ_OLD = 3 * 24 * 3600e3;
let bibigoTex = null;
function bibigoTexture() {                                                // 비비고 왕교자 봉지 느낌으로 그린 포장 (실제 사진이 아니라 제가 그린 것)
  if (bibigoTex) return bibigoTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 352;
  const g = c.getContext('2d');
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, 256, 352);
  g.fillStyle = '#a30c24'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 334, 256, 18);                 // 열 접착 부분
  for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, 2, 18); g.fillRect(x, 334, 2, 18); }
  g.fillStyle = '#fff7e6'; g.beginPath(); g.ellipse(128, 215, 112, 84, 0, 0, 7); g.fill();          // 흰 접시 모양
  g.fillStyle = '#f0e2c0'; g.beginPath(); g.ellipse(128, 222, 100, 70, 0, 0, 7); g.fill();
  [[84, 205, 0.4], [168, 200, -0.3], [126, 245, 0.05]].forEach(([x, y, r]) => {                 // 왕만두
    g.save(); g.translate(x, y); g.rotate(r);
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#d8c39a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-42, 8); g.quadraticCurveTo(0, -48, 42, 8); g.quadraticCurveTo(0, 30, -42, 8); g.fill(); g.stroke();
    for (let k = -30; k <= 30; k += 10) { g.beginPath(); g.moveTo(k, -4 - (30 - Math.abs(k)) * 0.45 + 12); g.lineTo(k + 2, 8); g.stroke(); }
    g.restore();
  });
  g.fillStyle = '#ffffff'; g.font = 'bold 66px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('비비고', 128, 62);
  g.fillStyle = '#ffd34d'; g.font = 'bold 44px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.fillText('왕교자', 128, 120);
  g.fillStyle = '#ffffff'; g.font = '22px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.fillText('1.05kg', 128, 312);
  bibigoTex = new THREE.CanvasTexture(c); bibigoTex.colorSpace = THREE.SRGBColorSpace; bibigoTex.userData.shared = true;
  return bibigoTex;
}
function refreshFreezer() {
  freezerItems.children.slice().forEach(c => { freezerItems.remove(c); disposeObj(c); });
  itemTargets.freezer = []; tagList.freezer = [];
  const slot = i => -0.5 + i * 0.34;
  const cols = [0xf5c9d4, 0xbcd8ee, 0xf7e8ac, 0xd5ecd8];
  // 아래쪽: 이름표 붙은 냉동식품 (아이스크림 통 / 아이스바 상자 / 냉동 봉지 순서로)
  getFreezer().slice(0, 4).forEach((f, i) => {
    const g = newItem(freezerItems, 'frz', i); g.position.set(0.12, 1.63, slot(i));
    const c = cols[i % 4], shape = f.name.includes('만두') ? 3 : f.name.includes('아이스크림') ? 0 : (i % 2 ? 1 : 2);
    let tagX = 0.08;
    if (shape === 0) {                                                  // 통 아이스크림
      cyl(0.075, 0.065, 0.11, c, 0, 0, 0, g); cyl(0.078, 0.078, 0.015, 0xffffff, 0, 0.06, 0, g);
    } else if (shape === 1) {                                           // 아이스바 상자 + 바 두 개
      rbox(0.2, 0.1, 0.16, c, 0, -0.005, 0, g, 0.02); rbox(0.205, 0.03, 0.165, 0xffffff, 0, 0.04, 0, g, 0.01);
      [-0.045, 0.045].forEach((dx, k) => { rbox(0.04, 0.09, 0.012, k ? 0xf5a0b5 : 0xf7d76a, dx, 0.115, 0, g, 0.01); cyl(0.005, 0.005, 0.05, 0xe6d3b3, dx, 0.05, 0, g); });
      tagX = 0.105;
    } else if (shape === 2) {                                           // 냉동 봉지
      sph(1, 0xdfeaf5, 0, 0, 0, g, [0.12, 0.05, 0.1]); sph(1, 0xe86f6f, 0.02, 0.03, 0.05, g, [0.07, 0.02, 0.03]);
      tagX = 0.11;
    } else {                                                            // 비비고 왕교자 봉지 (납작하게 눕혀 놓아 위에서 보면 포장이 보인다)
      const side = new THREE.MeshStandardMaterial({ color: 0xb30e28, roughness: 0.6 });
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.3), [side, side, new THREE.MeshStandardMaterial({ map: bibigoTexture(), roughness: 0.9 }), side, side, side]);
      bag.rotation.y = Math.PI / 2; g.add(bag);
      sph(1, 0xb30e28, 0, -0.005, 0, g, [0.16, 0.03, 0.12]);               // 봉지가 부푼 느낌
      tagX = 0.165;
    }
    addTag(g, 'freezer', makeTag(f.name, TAG_COLORS[(i + 1) % 4], 0.19, 0.11, ago(f.at), Date.now() - f.at > FRZ_OLD), tagX, 0.01, 0);
    finishItem(g, itemTargets.freezer);
  });
  // 선반 위: 냉동 피자 상자, 얼음 트레이, 아이스바 팩
  rbox(0.3, 0.035, 0.3, 0xe9d3a5, 0.12, 1.95, -0.4, freezerItems, 0.01);
  rbox(0.26, 0.037, 0.12, 0xd94e4e, 0.12, 1.952, -0.4, freezerItems, 0.01);
  rbox(0.3, 0.04, 0.3, 0xcfe8f2, 0.12, 1.95, -0.05, freezerItems, 0.02);
  [[-0.08, -0.08], [0.0, -0.08], [0.08, -0.08], [-0.08, 0.0], [0.0, 0.0], [0.08, 0.0], [-0.08, 0.08], [0.0, 0.08], [0.08, 0.08]].forEach(([dx, dz]) => rbox(0.06, 0.03, 0.06, 0xffffff, 0.12 + dx, 1.985, -0.05 + dz, freezerItems, 0.012, { transparent: true, opacity: 0.9 }));
  rbox(0.22, 0.06, 0.16, 0xbcd8ee, 0.12, 1.962, 0.3, freezerItems, 0.02);
  [[-0.06, 0xf5a0b5], [0, 0xf7d76a], [0.06, 0x9fd5ec]].forEach(([dz, col]) => rbox(0.045, 0.1, 0.012, col, 0.12, 2.04, 0.3 + dz, freezerItems, 0.01));
  freezerItems.traverse(o => { if (o.isMesh) o.userData.owner = freezerOwner; });
}

/* ---------- 미니 제빙기 (탁상용) ---------- */
const icer = new THREE.Group();
rbox(0.36, 0.26, 0.28, 0x3a3e43, 0, 0.13, 0, icer, 0.06);
rbox(0.366, 0.012, 0.286, 0xffffff, 0, 0.262, 0, icer, 0.01);
rbox(0.32, 0.09, 0.24, 0xcfe8f2, 0, 0.31, 0, icer, 0.05, { transparent: true, opacity: 0.5 });
[[-0.08, 0.05], [0.0, -0.03], [0.07, 0.04], [-0.03, 0.06], [0.09, -0.04]].forEach(([x, z]) => {
  rbox(0.05, 0.04, 0.05, 0xffffff, x, 0.29, z, icer, 0.018, { transparent: true, opacity: 0.9 });
});
rbox(0.14, 0.008, 0.04, 0x23262a, 0, 0.268, 0.1, icer, 0.004);
[-0.04, 0, 0.04].forEach(x => sph(0.007, 0x7be0a0, x, 0.274, 0.1, icer, [1, 0.5, 1], { emissive: 0x2d6b4a, emissiveIntensity: 0.8 }));
cyl(0.065, 0.065, 0.01, 0x1f2224, 0.182, 0.13, 0, icer).rotation.z = Math.PI / 2;
cyl(0.072, 0.072, 0.006, 0x55595d, 0.18, 0.13, 0, icer).rotation.z = Math.PI / 2;
rbox(0.03, 0.07, 0.1, 0x3a3e43, -0.19, 0.22, 0, icer, 0.015);
icer.scale.setScalar(1.5);                      // 더 크게
icer.position.set(-1.55, 0.93, CZ);              // 커피 머신 바로 옆
makeInteractive(icer, 'ice', '미니 제빙기');

/* ---------- 간식 서랍장 (한 번에 한 칸만 열리고, 열면 위에서 내려다보인다) ---------- */
const SNACK_NAMES = ['초코파이 (오리온)', '포카칩 (오리온)', '오징어땅콩 (오리온)', '새우깡 (농심)', '빼빼로 (롯데)', '홈런볼 (해태)'];
const SNACK_SHORT = ['초코파이', '포카칩', '오징어땅콩', '새우깡', '빼빼로', '홈런볼'];
const SNACK_DEFAULT = [16, 14, 6, 18, 10, 15];     // 개수 (서랍 속 과자 하나가 1개)
const SNACK_LOW = 5, SNACK_ORDER = 16;
const SNACK_FRONT = [0xeceae6, 0xd8d4cc, 0xeceae6, 0xd8d4cc, 0xeceae6, 0xd8d4cc];
const SNACK_FRONT_CSS = ['#eceae6', '#d8d4cc', '#eceae6', '#d8d4cc', '#eceae6', '#d8d4cc'];
const SNACK_PULL = 0.7;
let snackIdx = -1;                                  // 지금 열려 있는 서랍 번호 (-1이면 모두 닫힘)
// 따로 서 있는 서랍장 대신, 카운터 아래 하부장 세 칸을 각각 서랍 두 개로 바꿨다
const snackChest = new THREE.Group();
const snackDrawers = [];
const DRAWER_FRONT_Z = CZ + 0.45;                   // 하부장 앞면
for (let i = 0; i < 6; i++) {
  const col = Math.floor(i / 2), up = i % 2 === 0;
  const x = -2.03 + col * 0.94, y = up ? 0.63 : 0.23;
  const d = new THREE.Group();
  d.position.set(x, y, DRAWER_FRONT_Z);
  d.userData.idx = i; d.userData.pull = SNACK_PULL;
  d.userData.front = rbox(0.88, 0.38, 0.03, SNACK_FRONT[i], 0, 0, 0.0, d, 0.008);       // 서랍 앞판 (눌러서 연다)
  rbox(0.3, 0.02, 0.03, 0x2e3338, 0, 0.11, 0.03, d, 0.008, STEEL);                      // 손잡이
  rbox(0.84, 0.02, 0.5, 0xe6d3b3, 0, -0.13, -0.28, d, 0.008);                           // 서랍 바닥
  rbox(0.02, 0.12, 0.5, 0xe6d3b3, -0.43, -0.08, -0.28, d, 0.008);
  rbox(0.02, 0.12, 0.5, 0xe6d3b3, 0.43, -0.08, -0.28, d, 0.008);
  rbox(0.88, 0.12, 0.02, 0xe6d3b3, 0, -0.08, -0.53, d, 0.008);
  [-0.24, -0.12, 0, 0.12, 0.24].forEach(lx => rbox(0.004, 0.004, 0.48, 0xc9b790, lx, -0.118, -0.28, d, 0.001));   // 칸 구분선 (6칸 x 3줄)
  [-0.35, -0.21].forEach(lz => rbox(0.84, 0.004, 0.004, 0xc9b790, 0, -0.118, lz, d, 0.001));
  d.userData.lowTag = rbox(0.14, 0.05, 0.01, 0xd94e4e, 0.34, -0.12, 0.02, d, 0.01, { emissive: 0x8a1f1f, emissiveIntensity: 0.5 });
  const items = new THREE.Group(); d.add(items); d.userData.items = items;
  snackChest.add(d); snackDrawers.push(d);
}
makeInteractive(snackChest, 'snack', '간식 서랍 · 눌러서 열기');

function makeSnack(type) {
  const g = new THREE.Group();
  if (type === 0) {            // 초코파이: 빨간 박스 + 흰 띠
    rbox(0.28, 0.14, 0.2, 0xc8102e, 0, 0.07, 0, g, 0.04);
    rbox(0.282, 0.045, 0.202, 0xffffff, 0, 0.07, 0, g, 0.015);
    sph(0.04, 0x4a2c1a, 0.07, 0.15, 0, g, [1, 0.5, 1]);
  } else if (type === 1) {     // 포카칩: 노란 봉지
    sph(1, 0xf0b323, 0, 0.15, 0, g, [0.12, 0.16, 0.05]);
    sph(1, 0xd8412f, 0, 0.12, 0.045, g, [0.07, 0.04, 0.01]);
  } else if (type === 2) {     // 오징어땅콩: 주황 봉지
    sph(1, 0xe8731a, 0, 0.15, 0, g, [0.12, 0.16, 0.05]);
    sph(1, 0xfbe7b2, 0, 0.15, 0.045, g, [0.06, 0.07, 0.01]);
  } else if (type === 3) {     // 새우깡: 붉은 봉지
    sph(1, 0xd83a2a, 0, 0.15, 0, g, [0.12, 0.16, 0.05]);
    sph(1, 0xf6c9a0, 0, 0.14, 0.045, g, [0.06, 0.05, 0.01]);
  } else if (type === 4) {     // 빼빼로: 얇은 긴 상자 두 개
    [-0.045, 0.045].forEach((dx, i) => {
      rbox(0.085, 0.26, 0.05, i ? 0xf4a8b8 : 0xd7263d, dx, 0.13, 0, g, 0.015);
      rbox(0.087, 0.06, 0.052, 0xffffff, dx, 0.13, 0, g, 0.012);
    });
  } else {                     // 홈런볼: 파란 봉지
    sph(1, 0x1d6fb8, 0, 0.14, 0, g, [0.11, 0.15, 0.055]);
    sph(1, 0xffffff, 0, 0.14, 0.05, g, [0.06, 0.05, 0.01]);
  }
  return g;
}
function getSnacks() { return store.get('snacks2', SNACK_DEFAULT.slice()); }
function saveSnacks(q) { store.set('snacks2', q); }
// 서랍 앞판의 이름 글씨 (글씨체가 늦게 도착하면 다시 그린다)
function snackLabels() {
  snackDrawers.forEach((d, i) => {
    if (d.userData.label) { d.remove(d.userData.label); disposeObj(d.userData.label); }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.11), new THREE.MeshStandardMaterial({ map: textTexture([SNACK_SHORT[i]], SNACK_FRONT_CSS[i], '#2b2620', 256, 80, 50) }));
    label.position.set(-0.12, -0.02, 0.018); label.userData.owner = snackChest;
    d.userData.label = label; d.add(label);
  });
}
// 과자 하나: 서랍 바닥에 눕혀 놓은 납작한 포장. 윗면이 제품 사진이라 위에서 내려다보면 사진이 보인다
const SNACK_DIM = [[0.1, 0.05, 0.13], [0.105, 0.022, 0.13], [0.105, 0.022, 0.13], [0.105, 0.022, 0.13], [0.07, 0.035, 0.13], [0.105, 0.022, 0.13]];
const SNACK_SIDE = [0xc8102e, 0xf0b323, 0xe8731a, 0xd83a2a, 0xd7263d, 0x1d6fb8];
const snackTex = {};
// 제품 사진이 snack-images.js에 있으면 그것을 쓰고, 없으면 임시 그림을 그린다
function snackArt(i) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  const P = [['#c8102e', '#ffffff', '#4a2c1a'], ['#f0b323', '#d8412f', '#7a4a1a'], ['#e8731a', '#fbe7b2', '#7a3b12'],
    ['#d83a2a', '#f6c9a0', '#ffffff'], ['#d7263d', '#ffe3ec', '#5a3320'], ['#1d6fb8', '#ffffff', '#f2c14e']][i];
  g.fillStyle = P[0]; g.fillRect(0, 0, 256, 320);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, 256, 80);
  g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 272, 256, 48);
  g.fillStyle = P[1]; g.beginPath(); g.ellipse(128, 190, 86, 64, 0, 0, 7); g.fill();
  g.fillStyle = P[2];
  if (i === 0) { [[98, 190], [160, 196]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 34, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.fillStyle = P[2]; }); }
  else if (i === 1) { [[96, 180], [150, 168], [140, 214]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 30, 22, 0.4, 0, 7); g.fill(); }); }
  else if (i === 2) { [[90, 180], [128, 160], [166, 184], [120, 212], [152, 216]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 20, 14, 0.3, 0, 7); g.fill(); }); }
  else if (i === 3) { [[100, 190], [150, 176], [128, 216]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 24, 0.3, 4.4); g.lineWidth = 12; g.strokeStyle = '#e8873a'; g.stroke(); }); }
  else if (i === 4) { g.lineWidth = 10; [80, 108, 136, 164].forEach(x => { g.strokeStyle = '#e9c68a'; g.beginPath(); g.moveTo(x, 232); g.lineTo(x + 20, 150); g.stroke(); g.strokeStyle = P[2]; g.beginPath(); g.moveTo(x + 8, 198); g.lineTo(x + 20, 150); g.stroke(); }); }
  else { [[100, 190], [140, 178], [128, 214], [166, 208]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); }); }
  g.font = 'bold 56px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.strokeText(SNACK_SHORT[i], 128, 46);
  g.fillStyle = '#ffffff'; g.fillText(SNACK_SHORT[i], 128, 46);
  return new THREE.CanvasTexture(c);
}
function snackTexture(i) {
  if (!snackTex[i]) {
    const t = SNACK_IMG['s' + i] ? new THREE.TextureLoader().load(SNACK_IMG['s' + i]) : snackArt(i);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.shared = true;
    snackTex[i] = t;
  }
  return snackTex[i];
}
function makeSnackPack(i) {
  const [w, t, d] = SNACK_DIM[i];
  const side = new THREE.MeshStandardMaterial({ color: SNACK_SIDE[i], roughness: 0.6 });
  const top = new THREE.MeshStandardMaterial({ map: snackTexture(i), roughness: 0.5 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [side, side, top, side, side, side]);   // 윗면(+y)에 사진
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const SNACK_ROWZ = [-0.42, -0.28, -0.14];
function refreshSnacks() {
  if (!snackLabels.done) { snackLabels(); snackLabels.done = true; }
  const q = getSnacks();
  hoverItem = null;
  snackDrawers.forEach((d, i) => {
    const holder = d.userData.items;
    holder.children.slice().forEach(c => { holder.remove(c); disposeObj(c); });
    const t = SNACK_DIM[i][1], n = Math.min(36, q[i]);       // 6칸 x 3줄 = 18자리, 자리마다 최대 2개까지 쌓는다
    for (let k = 0; k < n; k++) {
      const slot = k % 18, layer = Math.floor(k / 18);
      const g = newItem(holder, 'snack', i);
      const j = ((k * 37 + i * 11) % 10) / 10 - 0.5;          // 매번 같은 모양으로 살짝 흐트러뜨린다
      g.position.set(-0.3 + (slot % 6) * 0.12 + j * 0.006, -0.12 + t * (layer + 0.5) + 0.001, SNACK_ROWZ[Math.floor(slot / 6)] + j * 0.006);
      g.rotation.y = j * 0.06;
      g.add(makeSnackPack(i));
      g.traverse(o => { if (o.isMesh) o.userData.itemGroup = g; });
    }
    d.userData.lowTag.visible = q[i] < SNACK_LOW;              // 부족하면 서랍 앞에 빨간 표시 (눌러서 주문)
  });
  rebuildSnackTargets();
  snackChest.traverse(o => { if (o.isMesh) o.userData.owner = snackChest; });
}
// 눌러 볼 수 있는 것: 모든 서랍 앞판과 빨간 표시, 그리고 "열려 있는 서랍 속" 과자 (닫힌 서랍 속은 눌리지 않게)
function rebuildSnackTargets() {
  const list = [];
  snackDrawers.forEach((d, i) => {
    const f = d.userData.front; f.userData.info = { kind: 'drawer', i }; f.userData.itemGroup = f; list.push(f);
    const lt = d.userData.lowTag; lt.userData.info = { kind: 'order', i }; lt.userData.itemGroup = lt; list.push(lt);
    if (snackIdx === i) d.userData.items.traverse(o => { if (o.isMesh) list.push(o); });
  });
  itemTargets.snack = list;
}

/* ---------- 건의사항 게시판 ---------- */
const board = new THREE.Group();
rbox(1.9, 1.3, 0.06, 0x8a6a52, 0, 0, 0, board, 0.03);
rbox(1.76, 1.16, 0.02, 0xc79a62, 0, 0, 0.035, board, 0.01);
const NOTE_FONT = '"GoDing", "Apple SD Gothic Neo", sans-serif';   // 건의사항 글씨체: 이 한 줄만 바꾸면 된다
function textTexture(lines, bg, fg, w = 256, h = 96, size = 26) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `${size}px ${NOTE_FONT}`; g.textBaseline = 'middle'; g.textAlign = 'center';
  const gap = h / (lines.length + 1);
  lines.forEach((l, i) => g.fillText(l, w / 2, gap * (i + 1)));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const plateTex = () => textTexture(['건의사항 게시판'], '#2f7f79', '#ffffff', 512, 100, 70);
const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.22), new THREE.MeshStandardMaterial({ map: plateTex() }));
plate.position.set(0, 0.76, 0.04); board.add(plate);
board.position.set(3.85, 2.3, -3.88);
const boardNotes = [];
const NOTE_COLORS = ['#f6d94c', '#f4a8b8', '#9ad7c9', '#f5b97a', '#b9c8f2'];
function wrap(text, n = 7) {
  // 띄어쓰기 기준으로 줄을 나누고, 한 단어가 너무 길 때만 글자 수로 자른다
  const lines = [];
  let cur = '';
  const push = () => { if (cur) { lines.push(cur); cur = ''; } };
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const chars = [...w];
    if (chars.length > n) {
      push();
      for (let i = 0; i < chars.length; i += n) lines.push(chars.slice(i, i + n).join(''));
    } else if ([...(cur ? cur + ' ' + w : w)].length <= n) cur = cur ? cur + ' ' + w : w;
    else { push(); cur = w; }
  }
  push();
  return lines.slice(0, 4);
}
function suggestions() {
  return store.get('suggestions', ['정수기도 놔주세요', '탄산수 늘려 주세요', '전자레인지 한 대 더']);
}
function renderBoardNotes() {
  boardNotes.forEach(g => { board.remove(g); disposeObj(g); });
  boardNotes.length = 0; itemTargets.board = []; hoverItem = null;
  const all = suggestions(), shown = all.slice(-9), off = all.length - shown.length;
  shown.forEach((text, i) => {
    const g = newItem(board, 'note', off + i); g.userData.axis = 'z';          // 게시판 앞쪽(+z)으로 당겨서 본다
    g.position.set(-0.55 + (i % 3) * 0.55, 0.28 - Math.floor(i / 3) * 0.42, 0.055);
    g.rotation.z = ((i * 37) % 11 - 5) * 0.025;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.4), new THREE.MeshStandardMaterial({ map: textTexture(wrap(text), NOTE_COLORS[i % 5], '#2b2620', 160, 144, 38) }));
    g.add(m); m.userData.owner = board;
    finishItem(g, itemTargets.board);
    boardNotes.push(g);
  });
}
makeInteractive(board, 'board', '건의사항 게시판 · 눌러서 확대');
// 웹폰트가 늦게 도착해도 게시판 글씨가 바뀌도록 다시 그린다
if (document.fonts && document.fonts.load) {
  document.fonts.load('30px "GoDing"', '건의사항 게시판 김ㅇㅇ')
    .then(() => { plate.material.map = plateTex(); plate.material.needsUpdate = true; renderBoardNotes(); refreshFridge(); drawSky(0); snackLabels(); })
    .catch(() => {});
}

/* ---------- 창문: 날씨 + 시간 + 테마가 비친다 ---------- */
const windowGroup = new THREE.Group();
const wxCanvas = document.createElement('canvas'); wxCanvas.width = 380; wxCanvas.height = 340;
const wxCtx = wxCanvas.getContext('2d');
const wxTex = new THREE.CanvasTexture(wxCanvas); wxTex.colorSpace = THREE.SRGBColorSpace;
const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.7), new THREE.MeshBasicMaterial({ map: wxTex }));
sky.rotation.y = Math.PI / 2;
sky.position.set(X0 + 0.16, 2.4, 2.4);
windowGroup.add(sky);
rbox(0.12, 0.07, 2.1, 0xffffff, X0 + 0.14, 1.5, 2.4, windowGroup, 0.02);       // 창틀
rbox(0.12, 0.07, 2.1, 0xffffff, X0 + 0.14, 3.3, 2.4, windowGroup, 0.02);
rbox(0.12, 1.86, 0.07, 0xffffff, X0 + 0.14, 2.4, 1.4, windowGroup, 0.02);
rbox(0.12, 1.86, 0.07, 0xffffff, X0 + 0.14, 2.4, 3.4, windowGroup, 0.02);
makeInteractive(windowGroup, 'window', '창문 · 날씨와 테마');

let wx = store.get('weather', 'clear');        // clear | cloudy | rain | snow
let themeSetting = store.get('theme', 'none'); // none | auto | xmas | ...
let bdayName = store.get('bdayName', '장사원');
let timeOffset = null;                         // null이면 실제 시각, 숫자면 "설정한 시각 - 실제 시각"(ms). 새로고침하면 실제 시각으로 돌아온다
const simDate = () => new Date(Date.now() + (timeOffset || 0));
const simHour = () => { const d = simDate(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
const pad2 = n => String(n).padStart(2, '0');
function timeLabel(h) {
  if (h < 5) return '새벽 · 야근 중';
  if (h < 8.5) return '이른 아침';
  if (h < 12) return '오전 근무';
  if (h < 13) return '점심시간';
  if (h < 18) return '오후 근무';
  if (h < 19) return '퇴근 시간';
  return '야근 중';
}

/* 시간대별 하늘 색 (키프레임 사이를 부드럽게 이어 붙인다) */
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const rgbCss = c => `rgb(${c.map(Math.round).join(',')})`;
const SKY_KEYS = [[0, '#0b1426', '#1c2a4a'], [5, '#16213e', '#3b3a5c'], [6.5, '#f2a07b', '#f9d7a0'], [8, '#8fd0f5', '#d8f0fb'],
  [12, '#6fc2f2', '#cdeefb'], [16.5, '#8fd0f5', '#e3f0f4'], [18, '#f6a97a', '#f9d9a8'], [19.5, '#5a4a7a', '#c98a7a'],
  [21, '#14213d', '#2d3a63'], [24, '#0b1426', '#1c2a4a']].map(([h, a, b]) => [h, hex2rgb(a), hex2rgb(b)]);
const BRIGHT_KEYS = [[0, 0.08], [5, 0.12], [6.5, 0.55], [8, 0.95], [12, 1], [16.5, 0.95], [18, 0.6], [19.5, 0.3], [21, 0.12], [24, 0.08]];
function lerpKeys(keys, h, f) {
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (h >= a[0] && h <= b[0]) return f(a, b, (h - a[0]) / (b[0] - a[0])); }
  return f(keys[0], keys[0], 0);
}
const skyAt = h => lerpKeys(SKY_KEYS, h, (a, b, k) => [mix(a[1], b[1], k), mix(a[2], b[2], k)]);
const bright = h => lerpKeys(BRIGHT_KEYS, h, (a, b, k) => a[1] + (b[1] - a[1]) * k);

/* 테마 */
const THEMES = [['none', '없음'], ['auto', '오늘 날짜로 자동'], ['xmas', '크리스마스'], ['halloween', '할로윈'], ['seollal', '설날'],
  ['chuseok', '추석'], ['newyear', '새해'], ['children', '어린이날'], ['pepero', '빼빼로데이'], ['birthday', '생일']];
const THEME_NAME = { none: '없음', xmas: '크리스마스', halloween: '할로윈', seollal: '설날', chuseok: '추석', newyear: '새해', children: '어린이날', pepero: '빼빼로데이', birthday: '생일' };
const LUNAR = { 2026: { seollal: [2, 17], chuseok: [9, 25] }, 2027: { seollal: [2, 6], chuseok: [9, 15] }, 2028: { seollal: [1, 26], chuseok: [10, 3] } };
function autoTheme() {
  const d = new Date(), y = d.getFullYear(), today = new Date(y, d.getMonth(), d.getDate()).getTime();
  const within = (mm, dd, before, after) => { const t = new Date(y, mm - 1, dd).getTime(); return today >= t - before * 864e5 && today <= t + after * 864e5; };
  if (within(9, 9, 0, 0)) return 'birthday';
  if (within(12, 20, 0, 6)) return 'xmas';
  if (within(10, 25, 0, 6)) return 'halloween';
  if (within(12, 31, 0, 0) || within(1, 1, 0, 2)) return 'newyear';
  if (within(5, 5, 2, 0)) return 'children';
  if (within(11, 9, 0, 2)) return 'pepero';
  const L = LUNAR[y];
  if (L && within(L.seollal[0], L.seollal[1], 2, 1)) return 'seollal';
  if (L && within(L.chuseok[0], L.chuseok[1], 2, 1)) return 'chuseok';
  return 'none';
}
const activeTheme = () => (themeSetting === 'auto' ? autoTheme() : themeSetting);

function outlined(c, text, x, y, size, fill, stroke) {
  c.font = `${size}px ${NOTE_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 3.5; c.strokeStyle = stroke; c.strokeText(text, x, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}
function heart(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.6, y - s, x, y - s * 0.4);
  c.bezierCurveTo(x + s * 0.6, y - s, x + s, y - s * 0.4, x, y + s * 0.35); c.fill();
}
function balloons(c, t, n, xs, y0, cols) {
  for (let i = 0; i < n; i++) {
    const bx = xs + i * (150 / Math.max(1, n - 1)), by = y0 + Math.sin(t * 1.3 + i * 1.7) * 7 + (i % 2) * 14;
    c.fillStyle = cols[i % cols.length]; c.beginPath(); c.ellipse(bx, by, 10, 13, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(bx - 3.5, by - 5, 2.4, 4, 0.5, 0, 7); c.fill();
    c.strokeStyle = 'rgba(80,70,60,0.7)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(bx, by + 13); c.quadraticCurveTo(bx + 5, by + 28, bx - 1, by + 42); c.stroke();
  }
}
function drawTheme(c, id, t) {
  if (id === 'xmas') {
    c.strokeStyle = '#2b4a3a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-2, 8); c.quadraticCurveTo(95, 36, 192, 8); c.stroke();
    const cols = ['#ff5a5a', '#ffd45a', '#5ad17a', '#5aa9ff'];
    for (let i = 0; i < 12; i++) {
      const u = i / 11, x = u * 190, y = (1 - u) * (1 - u) * 8 + 2 * (1 - u) * u * 36 + u * u * 8;
      c.globalAlpha = (i + Math.floor(t * 2)) % 2 ? 1 : 0.45; c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(x, y + 4, 3.4, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    const tx = 30, ty = 158;
    c.fillStyle = '#5b3a24'; c.fillRect(tx - 3, ty - 4, 6, 8);
    [[ty - 4, 22, 24], [ty - 22, 18, 20], [ty - 38, 13, 16]].forEach(([by, hw, hh], i) => {
      c.fillStyle = i % 2 ? '#2f8a4f' : '#237a43'; c.beginPath(); c.moveTo(tx, by - hh); c.lineTo(tx - hw, by); c.lineTo(tx + hw, by); c.closePath(); c.fill();
    });
    c.fillStyle = '#ffd45a'; c.beginPath(); c.arc(tx, ty - 56, 4, 0, 7); c.fill();
    [[-8, -12], [7, -26], [-3, -40], [10, -6]].forEach(([dx, dy], i) => { c.fillStyle = ['#ff5a5a', '#ffd45a', '#5aa9ff', '#ff9ad5'][i]; c.beginPath(); c.arc(tx + dx, ty + dy, 2.5, 0, 7); c.fill(); });
    c.fillStyle = '#e86f6f'; c.fillRect(62, 150, 16, 14); c.fillStyle = '#ffd45a'; c.fillRect(68, 150, 4, 14); c.fillRect(62, 155, 16, 3);
    c.fillStyle = '#fff';
    for (let i = 0; i < 18; i++) { const x = (i * 41 + Math.sin(t + i) * 6 + 190) % 190, y = (i * 29 + t * 22) % 170; c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
    outlined(c, '메리 크리스마스', 95, 54, 17, '#ffffff', '#b8323a');
  } else if (id === 'halloween') {
    c.fillStyle = 'rgba(70,24,100,0.30)'; c.fillRect(0, 0, 190, 170);
    const g = c.createRadialGradient(140, 46, 6, 140, 46, 44); g.addColorStop(0, 'rgba(255,170,60,0.9)'); g.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = g; c.fillRect(90, 0, 100, 100);
    c.fillStyle = '#ffa63a'; c.beginPath(); c.arc(140, 46, 24, 0, 7); c.fill();
    c.fillStyle = 'rgba(180,90,20,0.45)'; [[132, 40, 5], [148, 52, 6], [142, 36, 3]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { const a = i * Math.PI / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 60, Math.sin(a) * 60); c.stroke(); }
    for (let r = 14; r <= 56; r += 14) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI / 2); c.stroke(); }
    for (let i = 0; i < 3; i++) {
      const bx = ((t * 26 + i * 75) % 240) - 25, by = 50 + i * 22 + Math.sin(t * 3 + i) * 7, w = Math.sin(t * 12 + i) * 5;
      c.fillStyle = '#1a1022'; c.beginPath(); c.moveTo(bx, by);
      c.quadraticCurveTo(bx - 9, by - 8 - w, bx - 15, by + 1); c.quadraticCurveTo(bx - 8, by - 1, bx, by + 4);
      c.quadraticCurveTo(bx + 8, by - 1, bx + 15, by + 1); c.quadraticCurveTo(bx + 9, by - 8 - w, bx, by); c.fill();
    }
    const px = 160, py = 152;
    c.fillStyle = '#f08a1c'; c.beginPath(); c.ellipse(px, py, 17, 14, 0, 0, 7); c.fill();
    c.fillStyle = '#3a6b2a'; c.fillRect(px - 2, py - 18, 4, 6);
    c.fillStyle = '#ffe27a';
    c.beginPath(); c.moveTo(px - 9, py - 3); c.lineTo(px - 4, py - 9); c.lineTo(px - 1, py - 3); c.fill();
    c.beginPath(); c.moveTo(px + 9, py - 3); c.lineTo(px + 4, py - 9); c.lineTo(px + 1, py - 3); c.fill();
    c.beginPath(); c.moveTo(px - 9, py + 4); c.lineTo(px - 4, py + 9); c.lineTo(px, py + 5); c.lineTo(px + 4, py + 9); c.lineTo(px + 9, py + 4); c.lineTo(px, py + 2); c.fill();
    outlined(c, '해피 할로윈', 80, 22, 20, '#ffb347', '#3a1850');
  } else if (id === 'seollal') {
    for (let i = 0; i < 2; i++) {
      const kx = 48 + i * 90 + Math.sin(t * 1.4 + i) * 6, ky = 62 + i * 12 + Math.cos(t * 1.1 + i) * 5;
      c.fillStyle = i ? '#3b78c9' : '#e8503a'; c.beginPath(); c.moveTo(kx, ky - 14); c.lineTo(kx + 10, ky); c.lineTo(kx, ky + 14); c.lineTo(kx - 10, ky); c.closePath(); c.fill();
      c.strokeStyle = '#ffd45a'; c.lineWidth = 1; c.beginPath(); c.moveTo(kx, ky - 14); c.lineTo(kx, ky + 14); c.moveTo(kx - 10, ky); c.lineTo(kx + 10, ky); c.stroke();
      c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(kx, ky + 14); c.quadraticCurveTo(kx - 8 + Math.sin(t * 3) * 6, ky + 30, kx + Math.sin(t * 2 + i) * 8, ky + 46); c.stroke();
    }
    c.save(); c.translate(150, 118); c.rotate(Math.PI / 4); c.fillStyle = '#c8322e'; c.fillRect(-20, -20, 40, 40);
    c.strokeStyle = '#ffd45a'; c.lineWidth = 2; c.strokeRect(-17, -17, 34, 34); c.restore();
    outlined(c, '福', 150, 119, 26, '#ffd45a', '#7a1210');
    outlined(c, '새해 복 많이 받으세요', 95, 20, 15, '#ffd45a', '#7a1210');
    outlined(c, '설날', 40, 120, 20, '#ffffff', '#c8322e');
  } else if (id === 'chuseok') {
    const g = c.createRadialGradient(120, 58, 10, 120, 58, 72); g.addColorStop(0, 'rgba(255,240,170,0.75)'); g.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = g; c.fillRect(30, 0, 160, 140);
    c.fillStyle = '#fff1b0'; c.beginPath(); c.arc(120, 58, 34, 0, 7); c.fill();
    c.fillStyle = 'rgba(210,180,90,0.45)'; [[110, 50, 7], [128, 66, 9], [124, 44, 4], [108, 70, 5]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    c.strokeStyle = '#d9c796'; c.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) {
      const x = 6 + i * 12, sw = Math.sin(t * 1.5 + i) * 4, top = 118 + (i % 3) * 6;
      c.beginPath(); c.moveTo(x, 170); c.quadraticCurveTo(x + sw * 0.5, 140, x + sw, top); c.stroke();
      c.fillStyle = '#efe3bd'; c.beginPath(); c.ellipse(x + sw, top - 2, 2.2, 7, sw * 0.05, 0, 7); c.fill();
    }
    [[24, 24], [44, 36]].forEach(([x, y]) => {
      c.strokeStyle = '#5b3a24'; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - 8); c.stroke();
      c.fillStyle = '#f08a1c'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.fillStyle = '#4a8a3a'; c.fillRect(x - 4, y - 9, 8, 3);
    });
    outlined(c, '풍성한 한가위', 95, 20, 17, '#fff7d6', '#8a5a1c');
  } else if (id === 'newyear') {
    const yr = new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear();
    const cols = ['#ff6b6b', '#ffd45a', '#6bd6ff', '#9dff8a', '#ff9ad5'];
    for (let b = 0; b < 3; b++) {
      const cyc = (t * 0.6 + b * 0.37) % 1, cx = 35 + b * 60 + (b % 2) * 10, cy = 55 + (b % 2) * 18, rr = cyc * 34;
      c.globalAlpha = 1 - cyc; c.strokeStyle = cols[(b + Math.floor(t * 0.6 + b * 0.37)) % 5]; c.lineWidth = 1.6;
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; c.beginPath(); c.moveTo(cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6); c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); c.stroke(); }
    }
    c.globalAlpha = 1;
    outlined(c, String(yr), 95, 96, 34, '#ffd45a', '#2a2040');
    outlined(c, '새해 복 많이 받으세요', 95, 128, 14, '#ffffff', '#2a2040');
  } else if (id === 'children') {
    const rc = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'];
    for (let i = 0; i < 6; i++) { c.strokeStyle = rc[i]; c.lineWidth = 4; c.beginPath(); c.arc(95, 140, 74 - i * 4.2, Math.PI, 0); c.stroke(); }
    balloons(c, t, 4, 24, 72, ['#ff6b6b', '#ffd45a', '#4dabf7', '#69db7c']);
    c.fillStyle = '#ffe066';
    for (let i = 0; i < 6; i++) { const x = (i * 37 + 14) % 190, y = 14 + (i * 23) % 60, s = 2 + Math.abs(Math.sin(t * 3 + i)) * 2; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
    outlined(c, '어린이날', 95, 20, 20, '#ffffff', '#e8503a');
    outlined(c, '5월 5일', 95, 38, 13, '#ffffff', '#4dabf7');
  } else if (id === 'pepero') {
    for (let i = 0; i < 9; i++) {
      const x = (i * 23 + 10 + Math.sin(t * 0.8 + i) * 4) % 190, y = ((i * 41 + t * 14) % 190) - 10, ang = 0.5 + (i % 3) * 0.25;
      c.save(); c.translate(x, y); c.rotate(ang);
      c.fillStyle = '#e9c68a'; c.fillRect(-1.6, -24, 3.2, 48); c.fillStyle = '#5a3320'; c.fillRect(-2.2, -24, 4.4, 30); c.restore();
    }
    for (let i = 0; i < 5; i++) heart(c, 20 + i * 38, 150 - ((t * 10 + i * 25) % 90), 6 + (i % 2) * 3, '#ff7ba5');
    outlined(c, '11/11', 95, 62, 38, '#ffffff', '#c2185b');
    outlined(c, '빼빼로데이', 95, 96, 18, '#ffe3ec', '#c2185b');
  } else if (id === 'birthday') {
    c.strokeStyle = '#6b5b4b'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(95, 30, 190, 6); c.stroke();
    const fc = ['#ff6b6b', '#ffd45a', '#4dabf7', '#69db7c', '#ff9ad5'];
    for (let i = 0; i < 10; i++) {
      const u = (i + 0.5) / 10, x = u * 190, y = (1 - u) * (1 - u) * 6 + 2 * (1 - u) * u * 30 + u * u * 6;
      c.fillStyle = fc[i % 5]; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y + 1); c.lineTo(x, y + 14); c.closePath(); c.fill();
    }
    balloons(c, t, 5, 22, 84, fc);
    c.fillStyle = '#f7d9a8'; c.fillRect(70, 140, 50, 20); c.fillStyle = '#ff9ad5'; c.fillRect(70, 135, 50, 8);
    c.fillStyle = '#ffffff'; c.fillRect(92, 120, 6, 16);
    c.fillStyle = '#ffd45a'; c.beginPath(); c.ellipse(95, 116, 3, 5 + Math.sin(t * 9) * 1.2, 0, 0, 7); c.fill();
    for (let i = 0; i < 22; i++) { const x = (i * 37 + Math.sin(t * 2 + i) * 6 + 190) % 190, y = (i * 23 + t * 34) % 170; c.fillStyle = fc[i % 5]; c.fillRect(x, y, 3, 5); }
    outlined(c, `${bdayName} 생일 축하해요!`, 95, 50, 15, '#ffffff', '#d6336c');
    outlined(c, '9/9', 95, 68, 13, '#fff1f5', '#d6336c');
  }
}

function drawSky(t = 0) {
  const c = wxCtx, w = 190, hgt = 170, hr = simHour(), b = bright(hr);
  c.setTransform(2, 0, 0, 2, 0, 0);
  const [top0, bot0] = skyAt(hr);
  let top = top0, bot = bot0;
  if (wx !== 'clear') {
    const gr = { cloudy: [150, 158, 166], rain: [105, 116, 128], snow: [196, 204, 210] }[wx].map(v => v * (0.25 + 0.75 * b));
    top = mix(top0, gr, 0.7); bot = mix(bot0, gr.map(v => Math.min(255, v * 1.1)), 0.7);
  }
  const g = c.createLinearGradient(0, 0, 0, hgt); g.addColorStop(0, rgbCss(top)); g.addColorStop(1, rgbCss(bot));
  c.fillStyle = g; c.fillRect(0, 0, w, hgt);
  if (b < 0.3 && wx === 'clear') {
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 24; i++) { c.globalAlpha = Math.min(1, (0.3 - b) * 4) * (0.6 + 0.4 * Math.sin(t * 2 + i)); c.fillRect((i * 53) % w, (i * 31) % 90, 2, 2); }
    c.globalAlpha = 1;
  }
  if (wx === 'clear' || wx === 'cloudy') {
    if (hr >= 6 && hr <= 18) {                       // 해: 아침에 떠서 저녁에 진다
      const p = (hr - 6) / 12, x = 20 + p * 150, y = 138 - Math.sin(Math.PI * p) * 100, low = p < 0.12 || p > 0.88;
      const gl = c.createRadialGradient(x, y, 4, x, y, 40); gl.addColorStop(0, low ? 'rgba(255,150,80,0.55)' : 'rgba(255,230,120,0.5)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
      c.fillStyle = gl; c.fillRect(x - 40, y - 40, 80, 80);
      c.fillStyle = low ? '#ff9a5a' : '#ffe27a'; c.beginPath(); c.arc(x, y, 18, 0, 7); c.fill();
    } else {                                         // 달
      const hh = hr >= 18 ? hr - 18 : hr + 6, p = hh / 12, x = 20 + p * 150, y = 134 - Math.sin(Math.PI * p) * 96;
      c.fillStyle = '#f4f1de'; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill();
      c.fillStyle = rgbCss(top); c.beginPath(); c.arc(x + 7, y - 4, 12, 0, 7); c.fill();
    }
  }
  if (wx !== 'clear') {
    c.fillStyle = rgbCss(mix(wx === 'rain' ? [135, 147, 160] : [255, 255, 255], [70, 80, 95], 1 - b));
    [[40, 40, 34, 14], [100, 30, 40, 16], [150, 52, 32, 13], [70, 66, 36, 14]].forEach(([x, y, rx, ry]) => {
      const cx = ((x + t * 4) % (w + 80)) - 40; c.beginPath(); c.ellipse(cx, y, rx, ry, 0, 0, 7); c.fill();
    });
  }
  c.fillStyle = rgbCss(mix([111, 130, 148], [12, 17, 29], 1 - b));
  [[0, 118, 26, 52], [26, 104, 22, 66], [48, 126, 30, 44], [78, 96, 24, 74], [102, 122, 28, 48], [130, 108, 26, 62], [156, 128, 34, 42]].forEach(([x, y, bw, bh]) => c.fillRect(x, y, bw, bh));
  if (b < 0.5) {                                     // 어두워지면 사무실 창에 불이 켜진다 (야근 중)
    c.fillStyle = '#ffd56b';
    for (let i = 0; i < 34; i++) if ((i * 7) % 3) c.fillRect(((i * 29) % 180) + 4, 112 + ((i * 17) % 50), 3, 4);
  }
  if (wx === 'rain') {
    c.strokeStyle = 'rgba(220,235,248,0.75)'; c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i < 46; i++) { const x = (i * 47 + t * 50) % w, y = (i * 29 + t * 320) % hgt; c.moveTo(x, y); c.lineTo(x - 4, y + 12); }
    c.stroke();
  }
  if (wx === 'snow') {
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) { const x = (i * 37 + Math.sin(t + i) * 8 + w) % w, y = (i * 23 + t * 28) % hgt; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
  }
  const th = activeTheme();
  if (th !== 'none') drawTheme(c, th, t);
  wxTex.needsUpdate = true;
}
function applyEnv() {
  const b = bright(simHour()), k = { clear: 1, cloudy: 0.88, rain: 0.78, snow: 0.92 }[wx];
  hemi.intensity = (0.55 + 0.75 * b) * k;
  sun.intensity = (0.5 + 1.4 * b) * k;
  sun.color.set(rgbCss(mix([188, 200, 255], [255, 244, 221], b)));
  scene.background.set(rgbCss(mix([58, 59, 74], [228, 217, 196], b)));
}
function refreshWorldTime() { drawSky(performance.now() / 1000); applyEnv(); }
function setSimTime(hh, mm) {
  const d = new Date(); d.setHours(hh, mm, 0, 0);
  timeOffset = d.getTime() - Date.now();
  refreshWorldTime();
}

/* ---------- 싱크대 + 텀블러 (왼벽) ---------- */
const sink = new THREE.Group();
// 싱크볼 두 개를 상판에 구멍을 내고 아래로 푹 들어가게 만든다. 앞(z -)은 설거지 볼, 뒤(z +)는 텀블러 건조 볼
const HX0 = -0.36, HX1 = 0.28, TOP = 0.93;
const HOLES = [[-1.04, -0.26, 0.64], [-0.05, 0.95, 0.6]];            // [z0, z1, 바닥 높이]
const ZCUT = [-1.1, ...HOLES.flatMap(h => [h[0], h[1]]), 1.1];        // 구멍 사이 띠: [-1.1,-1.04] [-0.26,-0.05] [0.95,1.1]
function ring(y, h, color, ox, oz, r) {
  rbox(HX0 + ox, h, 2 * oz, color, (-ox + HX0) / 2, y, 0, sink, r);                      // 왼쪽 띠
  rbox(ox - HX1, h, 2 * oz, color, (ox + HX1) / 2, y, 0, sink, r);                       // 오른쪽 띠
  [[ZCUT[0], ZCUT[1]], [ZCUT[2], ZCUT[3]], [ZCUT[4], ZCUT[5]]].forEach(([z0, z1]) => {
    const zz0 = Math.max(z0, -oz), zz1 = Math.min(z1, oz);
    if (zz1 > zz0) rbox(HX1 - HX0, h, zz1 - zz0, color, (HX0 + HX1) / 2, y, (zz0 + zz1) / 2, sink, r);
  });
}
rbox(0.9, 0.58, 2.1, 0xe9e7e2, 0, 0.29, 0, sink, 0.015);                                 // 아래 수납장
ring(0.715, 0.27, 0xe9e7e2, 0.45, 1.05, 0.01);
ring(0.89, 0.08, 0x3a3d42, 0.5, 1.1, 0.02);                                              // 상판
HOLES.forEach(([z0, z1, fl]) => {
  const cx = (HX0 + HX1) / 2, cz = (z0 + z1) / 2, bh = TOP - fl;
  [[HX1 - HX0 + 0.05, 0.025, cx, z0 - 0.0125], [HX1 - HX0 + 0.05, 0.025, cx, z1 + 0.0125]].forEach(([w, d, x, z]) => rbox(w, 0.012, d, 0xd5dde1, x, TOP + 0.002, z, sink, 0.004, CHROME));   // 구멍 둘레 스테인리스 테두리 (4개 띠, 가운데는 뚫려 있다)
  [HX0 - 0.0125, HX1 + 0.0125].forEach(x => rbox(0.025, 0.012, z1 - z0, 0xd5dde1, x, TOP + 0.002, cz, sink, 0.004, CHROME));
  rbox(HX1 - HX0, 0.02, z1 - z0, 0x5f6a71, cx, fl - 0.01, cz, sink, 0.008, CHROME);                  // 바닥
  rbox(0.014, bh, z1 - z0, 0x9aa3a8, HX0 + 0.007, fl + bh / 2, cz, sink, 0.004, CHROME);             // 네 벽
  rbox(0.014, bh, z1 - z0, 0x9aa3a8, HX1 - 0.007, fl + bh / 2, cz, sink, 0.004, CHROME);
  rbox(HX1 - HX0, bh, 0.014, 0x848d92, cx, fl + bh / 2, z0 + 0.007, sink, 0.004, CHROME);
  rbox(HX1 - HX0, bh, 0.014, 0xaab3b8, cx, fl + bh / 2, z1 - 0.007, sink, 0.004, CHROME);
  cyl(0.03, 0.03, 0.006, 0x4a5156, cx, fl + 0.004, cz, sink, CHROME);                               // 배수구
});
const faucetPost = cyl(0.02, 0.02, 0.28, CHROME_C, -0.38, 1.07, -0.65, sink, CHROME);                // 수전
const faucetTube = put(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.38, 1.2, -0.65), new THREE.Vector3(-0.33, 1.3, -0.65),
  new THREE.Vector3(-0.2, 1.3, -0.65), new THREE.Vector3(-0.13, 1.2, -0.65)]), 16, 0.017, 8), mat(CHROME_C, CHROME)), 0, 0, 0, sink);
const soapBottle = cyl(0.035, 0.035, 0.14, PASTEL.mint, 0.25, 1.0, -0.95, sink);                     // 주방 세제
const soapCap = cyl(0.015, 0.015, 0.04, CHROME_C, 0.25, 1.09, -0.95, sink);
const tumblerItems = new THREE.Group();
sink.add(tumblerItems);
sink.position.set(-4.45, 0, -1.95);
makeInteractive(sink, 'sink', '싱크대 · 텀블러 (눌러서 확대)');

const TUMBLER_DEFAULT = ['ㅇㅇㅇ사원 텀블러', '김ㅇㅇ대리 텀블러', '박ㅇㅇ과장 텀블러', '이ㅇㅇ인턴 텀블러', '최ㅇㅇ팀장 텀블러', '주인 찾는 텀블러', '정ㅇㅇ주임 텀블러', '한ㅇㅇ사원 텀블러', '오ㅇㅇ부장 텀블러'];
const getTumblers = () => store.get('tumblers', TUMBLER_DEFAULT);
const TUMBLER_COLORS = [0xf5c9d4, 0xbcd8ee, 0xbfe3d0, 0xf7e8ac, 0xf4ead2, 0xf6d9c9, 0xcfe6f2, 0xd5ecd8, 0xe3d6ee];
let wetUntil = store.get('wetUntil', Date.now() + 90000);   // 씻은 직후에는 물이 뚝뚝 떨어진다
let tumblerDrips = [];
function refreshTumblers() {
  tumblerItems.children.slice().forEach(c => { tumblerItems.remove(c); disposeObj(c); });
  tumblerDrips = []; itemTargets.sink = []; tagList.sink = []; hoverItem = null;
  getTumblers().slice(0, 9).forEach((name, i) => {
    const r = Math.floor(i / 3), x = 0.17 - r * 0.23, z = 0.15 + (i % 3) * 0.3, y0 = 0.78 + r * 0.04;   // 건조 볼 안쪽에 푹 들어가 있다
    // 막대에 거꾸로 엎어 비스듬히 걸어 둔다 (입구가 아래, 앞쪽으로 살짝 기울어 물이 흘러내린다)
    const ig = newItem(tumblerItems, 'tumbler', i); ig.position.set(x, y0, z);
    const tg = new THREE.Group(); tg.rotation.z = 0.25; ig.add(tg);
    cyl(0.011, 0.011, 0.17, 0xc9d3d8, 0, 0.085, 0, tg, CHROME);
    cyl(0.04, 0.05, 0.2, TUMBLER_COLORS[i % 9], 0, 0.13, 0, tg, { metalness: 0.2, roughness: 0.25 });
    cyl(0.041, 0.041, 0.012, 0xe8ecef, 0, 0.232, 0, tg);
    addTag(ig, 'sink', makeTag(name, TAG_COLORS[i % 4], 0.2, 0.085), 0.045, r === 0 ? 0.13 : 0.2, 0);
    finishItem(ig, itemTargets.sink);
    const puddle = cyl(0.075, 0.075, 0.005, 0x9fd5ec, x + 0.02, y0 + 0.004, z, tumblerItems, { transparent: true, opacity: 0.6 });
    const drops = [0, 1].map(k => sph(0.012, 0x9fd5ec, x + 0.05 + k * 0.02, y0 + 0.03, z + (k ? 0.015 : -0.015), tumblerItems, [1, 1.4, 1], { transparent: true, opacity: 0.9 }));
    tumblerDrips.push({ puddle, drops, x, z, y0, ph: (i * 0.37) % 1 });
  });
  tumblerItems.traverse(o => { if (o.isMesh) o.userData.owner = sink; });
}
function dripTick() {
  const wet = Date.now() < wetUntil, now = performance.now() / 1000;
  tumblerDrips.forEach(d => {
    d.puddle.visible = wet;
    d.drops.forEach((m, k) => {
      m.visible = wet;
      if (wet) { const p = (now * 1.2 + d.ph + k * 0.5) % 1; m.position.y = d.y0 + 0.03 - p * 0.03; m.scale.set(1, 1.4 * (1 - p * 0.4), 1); }
    });
  });
}

/* ---------- 정수기 + 종이컵 ---------- */
const purifier = new THREE.Group();
rbox(0.36, 1.0, 0.4, 0xeeeeec, 0, 0.5, 0, purifier, 0.03);
rbox(0.37, 0.04, 0.41, 0x9aa1a6, 0, 0.99, 0, purifier, 0.015, STEEL);
rbox(0.3, 0.2, 0.03, 0xdfe7ea, 0, 0.8, 0.2, purifier, 0.03);
for (const [x, c] of [[-0.09, 0x4aa3e8], [0, 0xbfe6f5], [0.09, 0xe86f6f]]) {
  cyl(0.022, 0.022, 0.02, c, x, 0.83, 0.22, purifier, { emissive: c, emissiveIntensity: 0.25 }).rotation.x = Math.PI / 2;
}
cyl(0.018, 0.018, 0.08, 0x4aa3e8, -0.05, 0.68, 0.22, purifier);                    // 냉수 꼭지
cyl(0.018, 0.018, 0.08, 0xe86f6f, 0.05, 0.68, 0.22, purifier);                     // 온수 꼭지
rbox(0.26, 0.24, 0.12, 0xcbd5d9, 0, 0.5, 0.15, purifier, 0.04);                    // 컵 놓는 곳
rbox(0.28, 0.02, 0.16, 0x9aa1a6, 0, 0.375, 0.2, purifier, 0.008, CHROME);          // 물받이
rbox(0.3, 0.3, 0.03, 0xdfe7ea, 0, 0.17, 0.2, purifier, 0.03);
purifier.position.set(3.2, 0, -3.55);
const purifierStream = cyl(0.007, 0.007, 0.2, 0x6fc3f0, 0, 0.58, 0.22, purifier, { transparent: true, opacity: 0.8 });
purifierStream.visible = false;
makeInteractive(purifier, 'purifier', '정수기');

const cupDisp = new THREE.Group();
cyl(0.05, 0.05, 0.42, 0xe8f2f4, 0, 0, 0, cupDisp, { transparent: true, opacity: 0.3 });
rbox(0.12, 0.05, 0.05, CHROME_C, 0, 0.23, 0.0, cupDisp, 0.015, CHROME);
rbox(0.12, 0.05, 0.05, CHROME_C, 0, -0.2, 0.0, cupDisp, 0.015, CHROME);
const cupStack = new THREE.Group();
cupDisp.add(cupStack);
cupDisp.position.set(3.2, 1.32, -3.82);
makeInteractive(cupDisp, 'cups', '종이컵');
const getPaperCups = () => store.get('paperCups', 24);
function refreshCups() {
  cupStack.children.slice().forEach(c => { cupStack.remove(c); c.geometry.dispose(); c.material.dispose(); });
  const n = Math.min(8, Math.ceil(getPaperCups() / 4));
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.032, 0.07, 20), mat(i % 2 ? 0xffffff : 0xf3f7f6));
    put(m, 0, -0.175 + i * 0.042, 0, cupStack); m.userData.owner = cupDisp;
  }
}

/* ---------- 벽걸이 에어컨 ---------- */
const aircon = new THREE.Group();
rbox(0.24, 0.32, 1.2, 0xf4f3ef, 0, 0, 0, aircon, 0.05, { roughness: 0.4 });
rbox(0.01, 0.02, 1.0, 0x9aa1a6, 0.12, -0.02, 0, aircon, 0.005, STEEL);
const acFlap = new THREE.Group();
rbox(0.1, 0.015, 1.08, 0xeceae3, 0.05, 0, 0, acFlap, 0.006);
acFlap.position.set(0.12, -0.15, 0);
aircon.add(acFlap);
const acCanvas = document.createElement('canvas'); acCanvas.width = 96; acCanvas.height = 40;
const acTex = new THREE.CanvasTexture(acCanvas); acTex.colorSpace = THREE.SRGBColorSpace;
const acDisp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.085), new THREE.MeshBasicMaterial({ map: acTex }));
acDisp.rotation.y = Math.PI / 2; acDisp.position.set(0.126, 0.06, 0.4);
aircon.add(acDisp);
const acWind = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.26), new THREE.MeshBasicMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0, depthWrite: false }));
  m.rotation.y = Math.PI / 2; m.userData.i = i; m.raycast = () => {};
  aircon.add(m); acWind.push(m);
}
aircon.position.set(X0 + 0.22, 3.3, -1.95);
makeInteractive(aircon, 'aircon', '벽걸이 에어컨');
const ac = store.get('ac', { on: false, temp: 24, mode: '냉방', fan: '중' });
function updateAcDisplay() {
  const g = acCanvas.getContext('2d');
  g.fillStyle = '#16201f'; g.fillRect(0, 0, 96, 40);
  g.fillStyle = ac.on ? '#6fe0c0' : '#33423f'; g.font = 'bold 26px monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillText(ac.on ? `${ac.temp}` : '--', 40, 21);
  g.font = '12px sans-serif'; g.fillText(ac.on ? ac.mode : 'OFF', 76, 21);
  acTex.needsUpdate = true;
}

/* ---------- 매 프레임 갱신 (날씨 애니메이션, 에어컨 바람, 정수기 물줄기) ---------- */
let wxLast = 0;
function tickWorld(dt) {
  const now = performance.now();
  const animated = wx !== 'clear' || activeTheme() !== 'none';
  if (now - wxLast > (animated ? 100 : 2000)) { wxLast = now; drawSky(now / 1000); }
  updateClock(); washTick(dt); ramenTick(); dripTick(); tagTick(dt); leavingTick(dt); pulledTick(dt);
  snackDrawers.forEach(d => {
    const goal = DRAWER_FRONT_Z + (snackIdx === d.userData.idx ? d.userData.pull : 0);      // 한 번에 한 칸만 열린다
    d.position.z += (goal - d.position.z) * (1 - Math.exp(-dt * 6));
    if (Math.abs(goal - d.position.z) < 0.004) d.position.z = goal;      // 끝까지 딱 닫히거나 열리도록
  });
  acFlap.rotation.z += ((ac.on ? -0.6 : 0) - acFlap.rotation.z) * (1 - Math.exp(-dt * 6));
  const speed = { 약: 0.4, 중: 0.7, 강: 1.1 }[ac.fan] || 0.7;
  acWind.forEach(m => {
    const p = ((now / 1000) * speed + m.userData.i / acWind.length) % 1;
    m.visible = ac.on;
    m.material.opacity = ac.on ? (1 - p) * 0.5 : 0;
    m.position.set(0.2 + p * 0.55, -0.25 - p * 0.55, -0.45 + m.userData.i * 0.18);
  });
  if (purifierBusy) {
    purifierStream.visible = true;
    if (Date.now() >= purifierBusy.end) {
      const n = store.get('water', 0) + 1; store.set('water', n);
      toast(`${purifierBusy.type} 한 잔 (오늘 ${n}잔째)`);
      purifierBusy = null; purifierStream.visible = false;
      if (currentApp === 'purifier') APPS.purifier();
    }
  } else purifierStream.visible = false;
}
let purifierBusy = null;
setInterval(() => { applyEnv(); drawSky(performance.now() / 1000); }, 30000);

/* ---------- 점심 테이블 두 개 ---------- */
const lunch = new THREE.Group();
function table(cx, withBox) {
  rbox(1.3, 0.07, 0.8, 0xcdb18a, cx, 0.78, 1.1, lunch, 0.012, { roughness: 0.5 });
  for (const [dx, dz] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) cyl(0.025, 0.025, 0.75, 0x2b2f33, cx + dx, 0.375, 1.1 + dz, lunch, STEEL);
  if (withBox) {
    // 열어 둔 스테인리스 도시락통 (밥 + 반찬 두 가지) + 뚜껑 + 젓가락
    const x = cx - 0.2, z = 1.05;
    rbox(0.4, 0.1, 0.28, 0xc9d3d8, x, 0.865, z, lunch, 0.04, { metalness: 0.3, roughness: 0.4 });
    sph(1, 0xfaf7ee, x - 0.09, 0.912, z, lunch, [0.085, 0.045, 0.1]);
    sph(1, 0xd9803a, x + 0.08, 0.918, z - 0.06, lunch, [0.06, 0.035, 0.05]);
    sph(1, 0x5aa05a, x + 0.08, 0.918, z + 0.06, lunch, [0.05, 0.035, 0.045]);
    rbox(0.012, 0.07, 0.24, 0x9aa1a6, x + 0.0, 0.9, z, lunch, 0.005);
    const lid = rbox(0.4, 0.035, 0.28, 0x3d4349, cx + 0.28, 0.85, 1.0, lunch, 0.02);
    lid.rotation.z = 0.12; lid.rotation.y = -0.25;
    for (const dz of [0.22, 0.245]) cyl(0.006, 0.006, 0.26, 0x8a5a3b, x, 0.826, 1.1 + dz, lunch).rotation.z = Math.PI / 2;
    rbox(0.14, 0.1, 0.12, 0xe0a14a, cx + 0.5, 0.865, 1.3, lunch, 0.05);      // 보온 가방
  } else {
    cyl(0.17, 0.17, 0.02, 0xffffff, cx - 0.3, 0.83, 1.1, lunch);
    cyl(0.11, 0.09, 0.07, 0xd94e4e, cx - 0.3, 0.87, 1.1, lunch);
  }
  cyl(0.05, 0.045, 0.1, 0xffffff, cx + 0.35, 0.9, 1.05, lunch);
  for (const dz of [-0.78, 0.78]) {
    const col = dz < 0 ? 0x3d4349 : 0x575e65;
    cyl(0.25, 0.25, 0.06, col, cx, 0.46, 1.1 + dz, lunch);
    cyl(0.03, 0.03, 0.43, 0x9aa1a6, cx, 0.23, 1.1 + dz, lunch, STEEL);
    cyl(0.18, 0.2, 0.03, 0x2b2f33, cx, 0.015, 1.1 + dz, lunch);
    rbox(0.42, 0.36, 0.05, col, cx, 0.7, 1.1 + dz * 1.27, lunch, 0.05);
  }
}
table(1.2, false); table(3.4, true);
const rug = cyl(2.9, 2.9, 0.02, 0xcfc9be, 2.3, 0.012, 1.1, scene);
rug.scale.set(1.0, 1, 0.55);
makeInteractive(lunch, 'lunch', '점심 테이블 · 오늘 뭐 먹지');

/* ---------- 장식 ---------- */
// 화분
cyl(0.26, 0.2, 0.42, 0xe3dfd6, 4.4, 0.21, 3.1);
[[0, 0.75, 0, 0.3], [0.15, 0.95, 0.05, 0.22], [-0.15, 0.9, -0.05, 0.22], [0.02, 1.15, 0.0, 0.2]].forEach(([dx, y, dz, r]) => sph(r, 0x4f9a56, 4.4 + dx, y, 3.1 + dz));
// 쓰레기통 3종 (일반 / 재활용 / 음식물): 눌러서 분리배출 게임
const bins = new THREE.Group();
cyl(0.22, 0.2, 0.52, 0x8a9096, 3.7, 0.26, CZ + 0.05, bins, STEEL);
cyl(0.22, 0.2, 0.52, 0x56708f, 4.2, 0.26, CZ + 0.05, bins);
cyl(0.17, 0.15, 0.4, 0x5f7d5a, 4.65, 0.2, CZ + 0.05, bins);
cyl(0.222, 0.222, 0.03, 0xe3e6e8, 3.7, 0.5, CZ + 0.05, bins);
cyl(0.222, 0.222, 0.03, 0xe3e6e8, 4.2, 0.5, CZ + 0.05, bins);
cyl(0.172, 0.172, 0.03, 0xe3e6e8, 4.65, 0.4, CZ + 0.05, bins);
const trashPile = new THREE.Group();
bins.add(trashPile);
makeInteractive(bins, 'trash', '쓰레기통 · 눌러서 비우기');
// 벽시계 (시각을 실제로 따라가고, 눌러서 시간을 바꿀 수 있다)
const clock = new THREE.Group();
cyl(0.36, 0.36, 0.05, 0xffffff, 0, 0, 0, clock).rotation.x = Math.PI / 2;
for (let i = 0; i < 12; i++) {
  const a = i * Math.PI / 6, big = i % 3 === 0;
  rbox(big ? 0.03 : 0.015, big ? 0.06 : 0.035, 0.012, 0x2b2620, Math.sin(a) * 0.29, Math.cos(a) * 0.29, 0.03, clock, 0.005);
}
const hourHand = new THREE.Group(), minHand = new THREE.Group(), secHand = new THREE.Group();
rbox(0.035, 0.17, 0.02, 0x2b2620, 0, 0.085, 0, hourHand, 0.01);
rbox(0.025, 0.26, 0.02, 0x2b2620, 0, 0.13, 0.012, minHand, 0.01);
rbox(0.008, 0.29, 0.01, 0xd94e4e, 0, 0.1, 0.024, secHand, 0.003);
[hourHand, minHand, secHand].forEach(h => { h.position.z = 0.035; clock.add(h); });
sph(0.025, 0x2b2620, 0, 0, 0.045, clock);
clock.position.set(-3.5, 3.1, -3.86);
makeInteractive(clock, 'clock', '시계 · 눌러서 시간 바꾸기');
function updateClock() {
  const d = simDate(), h = d.getHours() % 12 + d.getMinutes() / 60, m = d.getMinutes() + d.getSeconds() / 60;
  hourHand.rotation.z = -h * Math.PI / 6; minHand.rotation.z = -m * Math.PI / 30; secHand.rotation.z = -d.getSeconds() * Math.PI / 30;
}

/* ---------- 클릭 / 호버 ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const labelEl = document.getElementById('label');
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const toastEl = document.getElementById('toast');
let downAt = null;

function pick(ev, maxDist = Infinity) {
  pointer.x = (ev.clientX / innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  for (const h of raycaster.intersectObjects(clickable, true)) {
    if (h.distance > maxDist) break;
    const o = h.object.userData.owner;
    if (o && o.visible && h.object.visible) return o;
  }
  return null;
}
renderer.domElement.addEventListener('pointermove', ev => {
  if (currentApp === 'wash' || (overlay.classList.contains('open') && !overlay.classList.contains('side'))) return;
  if (inspectActive()) { inspectHover(ev); return; }
  const hovered = pick(ev, fps.on ? 3.8 : Infinity);
  renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  if (hovered) {
    labelEl.style.display = 'block'; labelEl.textContent = hovered.userData.label;
    labelEl.style.left = ev.clientX + 'px'; labelEl.style.top = ev.clientY + 'px';
  } else labelEl.style.display = 'none';
});
renderer.domElement.addEventListener('pointerdown', ev => { downAt = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (!downAt) return;
  const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]);
  downAt = null;
  if (inspectActive()) { if (moved <= 6) inspectClick(ev); return; }
  if (fps.on) { if (moved <= 6 || fps.locked) fpsInteract(ev); return; }
  if (moved > 6 || currentApp === 'wash') return;
  const obj = pick(ev);
  if (obj && obj.userData.act) obj.userData.act();
  else if (obj && obj.userData.id !== currentApp) openApp(obj.userData.id);
});

/* ---------- 패널(앱) 공통 ---------- */
let cleanup = null;
let currentApp = null;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = sel => panel.querySelector(sel);
const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('show'), 3000);
}
function closeApp() {
  if (cleanup) { cleanup(); cleanup = null; }
  currentApp = null; hoverItem = null;
  overlay.classList.remove('open'); panel.innerHTML = '';
  labelEl.style.display = 'none';
}
overlay.addEventListener('pointerdown', ev => { if (ev.target === overlay) closeApp(); });
addEventListener('keydown', ev => { if (ev.key === 'Escape') closeApp(); });

const APPS = {};
function openApp(id) {
  if (cleanup) { cleanup(); cleanup = null; }
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* 무시 */ }
  panel.innerHTML = '';
  overlay.classList.remove('side');
  if (APPS[id].noPanel) overlay.classList.remove('open'); else overlay.classList.add('open');   // 사물 눌러 보기는 큰 창을 쓰지 않는다
  currentApp = id;
  APPS[id]();
}

/* ---------- 타이머 (가전 공통) ---------- */
const timers = {};
function startTimer(id, sec, doneMsg) {
  timers[id] = { end: Date.now() + sec * 1000, total: sec * 1000, doneMsg };
  setGlow(id, true);
}
function stopTimer(id) { delete timers[id]; setGlow(id, false); }
function tickTimers() {
  const t = Date.now();
  for (const id of Object.keys(timers)) {
    if (t >= timers[id].end) { if (id === 'toaster') breadPopUntil = Date.now() + 1800; toast(timers[id].doneMsg); stopTimer(id); if (currentApp === id) APPS[id](); }
  }
}
function timerPanel(id, title, sub, presets, doneMsg) {
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>${title}</h2>
    <p class="sub">${sub}</p>
    <div class="presets">${presets.map((p, i) => `<button data-i="${i}">${p.label}<small>${fmt(p.sec)}</small></button>`).join('')}</div>
    <div class="timer" id="tm"></div>
    <div class="bar"><i id="bar"></i></div>
    <div class="row"><button id="stop">중지</button></div>`;
  const tm = $('#tm'), bar = $('#bar');
  function show() {
    const t = timers[id];
    if (!t) { tm.textContent = '대기 중'; bar.style.width = '0'; return; }
    tm.textContent = `${mmss(t.end - Date.now())} 남음`;
    bar.style.width = `${100 - ((t.end - Date.now()) / t.total) * 100}%`;
  }
  const iv = setInterval(show, 250);
  cleanup = () => clearInterval(iv);
  panel.querySelectorAll('.presets button').forEach(b => b.onclick = () => {
    startTimer(id, presets[+b.dataset.i].sec, doneMsg); show();
  });
  $('#stop').onclick = () => { stopTimer(id); show(); };
  $('#x').onclick = closeApp;
  show();
}

APPS.microwave = () => timerPanel('microwave', '전자레인지', '데울 시간을 고르세요. 끝나면 알림이 뜹니다.',
  [{ label: '음료 데우기', sec: 20 }, { label: '도시락', sec: 90 }, { label: '즉석밥', sec: 120 }, { label: '10초 추가', sec: 10 }],
  '전자레인지: 띵! 꺼내 가세요');
APPS.kettle = () => {
  timerPanel('kettle', '전기포트', '물을 끓이거나 차를 우려 보세요.',
    [{ label: '물 끓이기', sec: 8 }, { label: '차 우리기', sec: 120 }], '전기포트: 다 됐습니다');
  panel.insertAdjacentHTML('beforeend', `<h3>컵라면</h3><p class="sub">누르면 이 창이 닫히고, 라면을 뜯어 스프를 넣고 물을 붓는 장면이 진행됩니다.</p><div class="row"><button class="primary" id="ramen">컵라면 만들기</button></div>`);
  $('#ramen').onclick = () => { closeApp(); startRamen(); };
};
APPS.toaster = () => timerPanel('toaster', '토스터', '굽기 정도를 고르세요. 시간은 데모용으로 줄여 두었습니다.',
  [{ label: '살짝', sec: 12 }, { label: '보통', sec: 20 }, { label: '바삭', sec: 30 }],
  '토스터: 빵이 튀어나왔습니다');

/* ---------- 핸드드립 스테이션 앱 ---------- */
const BEANS = [
  { name: '에티오피아 예가체프', note: '꽃향과 산미' },
  { name: '콜롬비아 수프리모', note: '고소함과 단맛' },
  { name: '케냐 AA', note: '과일향과 묵직한 산미' },
  { name: '브라질 산토스', note: '견과류 향, 쓴맛이 적음' }
];
APPS.coffee = () => {
  let step = 0, bean = null, grind = 0, tamp = 0, shotEnd = 0, drink = null;
  const STEPS = ['원두', '갈기', '탬핑', '추출', '완성'];
  function draw() {
    let body = '';
    if (step === 0) body = `<p class="sub">오늘 내릴 원두를 고르세요.</p><div class="presets">${BEANS.map((b, i) => `<button data-bean="${i}">${b.name}<small>${b.note}</small></button>`).join('')}</div>`;
    if (step === 1) body = `<p class="sub">${bean.name} 18g을 그라인더로 갈아 포터필터에 담습니다.</p><div class="bar"><i style="width:${grind / 10 * 100}%"></i></div><div class="row"><button class="primary" id="grind">갈기 (${grind}/10)</button></div>`;
    if (step === 2) body = `<p class="sub">탬퍼로 가루를 평평하게 꾹 눌러 줍니다. 세 번 고르게 눌러 주세요.</p><div class="bar"><i style="width:${tamp / 3 * 100}%"></i></div><div class="row"><button class="primary" id="tamp">꾹 누르기 (${tamp}/3)</button></div>`;
    if (step === 3) body = `<p class="sub">포터필터를 끼우고 추출합니다. 실제로는 25~30초이고 데모는 10초입니다.</p><div class="bar"><i id="bl" style="width:0"></i></div><div class="row"><button class="primary" id="shot">추출 시작</button></div><div class="timer" id="tm"></div>`;
    if (step === 4 && !drink) body = `<p class="sub">샷이 나왔습니다. 어떻게 마실까요?</p><div class="presets"><button data-drink="에스프레소">에스프레소<small>그대로</small></button><button data-drink="아메리카노">아메리카노<small>뜨거운 물 추가</small></button><button data-drink="카페라떼">카페라떼<small>우유 스팀</small></button></div>`;
    if (step === 4 && drink) body = `<div class="result">${drink}</div><p class="sub">${bean.name}, ${bean.note}. 식기 전에 드세요.</p><div class="row"><button class="primary" id="again">한 잔 더 내리기</button></div>`;
    panel.innerHTML = `
      <button class="close" id="x">닫기</button>
      <h2>에스프레소 머신</h2>
      <p class="sub">직접 갈고 눌러서 내려 마십니다. 지금까지 내린 커피 <b>${store.get('coffee', 0)}</b>잔</p>
      <div class="steps">${STEPS.map((n, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}">${i + 1}. ${n}</span>`).join('')}</div>
      ${body}
      <h3>휴식</h3>
      <div class="row"><button id="brk">커피 들고 3분 쉬기</button><button id="brkStop">그만 쉬기</button></div>
      <div class="timer" id="bt"></div>`;
  }
  const iv = setInterval(() => {
    const bt = $('#bt');
    if (bt) { const t = timers.break; bt.textContent = t ? `휴식 ${mmss(t.end - Date.now())} 남음` : ''; }
    if (step === 3 && shotEnd) {
      const p = 1 - (shotEnd - Date.now()) / 10000;
      const bl = $('#bl'), tm = $('#tm');
      if (bl) bl.style.width = `${Math.min(100, p * 100)}%`;
      if (tm) tm.textContent = `${mmss(shotEnd - Date.now())} 남음`;
      if (p >= 1) { shotEnd = 0; step = 4; setGlow('coffee', false); toast('샷 추출 끝'); draw(); }
    }
  }, 200);
  cleanup = () => { clearInterval(iv); panel.onclick = null; setGlow('coffee', false); };
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.dataset.bean !== undefined) { bean = BEANS[+b.dataset.bean]; step = 1; grind = 0; tamp = 0; drink = null; draw(); return; }
    if (b.id === 'grind') { grind++; if (grind >= 10) { step = 2; toast('원두를 다 갈았습니다'); } draw(); return; }
    if (b.id === 'tamp') { tamp++; if (tamp >= 3) { step = 3; toast('탬핑 완료'); } draw(); return; }
    if (b.id === 'shot') { shotEnd = Date.now() + 10000; setGlow('coffee', true); b.disabled = true; return; }
    if (b.dataset.drink) { drink = b.dataset.drink; store.set('coffee', store.get('coffee', 0) + 1); toast(`${drink} 완성`); draw(); return; }
    if (b.id === 'again') { step = 0; bean = null; drink = null; draw(); return; }
    if (b.id === 'brk') { timers.break = { end: Date.now() + 180000, total: 180000, doneMsg: '휴식 끝. 자리로 돌아갈 시간입니다' }; return; }
    if (b.id === 'brkStop') { delete timers.break; }
  };
  draw();
};

/* ---------- 제빙기 ---------- */
let ice = 100;
setInterval(() => { if (ice < 100) { ice += 1; if (currentApp === 'ice') APPS.ice(); } }, 3000);
APPS.ice = () => {
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>미니 제빙기</h2>
    <p class="sub">작은 탁상용이라 통이 금방 비고, 3초마다 1%씩 다시 얼어 채워집니다. 잔량 <b>${ice}%</b></p>
    <div class="bar"><i style="width:${ice}%"></i></div>
    <div class="row">
      <button class="primary" id="one" ${ice < 10 ? 'disabled' : ''}>한 컵 받기 (-10%)</button>
      <button id="two" ${ice < 25 ? 'disabled' : ''}>큰 컵 받기 (-25%)</button>
    </div>
    <p class="sub">${ice < 10 ? '얼음이 부족합니다. 조금만 기다려 주세요.' : ''}</p>`;
  $('#one').onclick = () => { ice -= 10; toast('얼음 한 컵 받았습니다'); APPS.ice(); };
  $('#two').onclick = () => { ice -= 25; toast('얼음 큰 컵 받았습니다'); APPS.ice(); };
  $('#x').onclick = closeApp;
};

/* ---------- 냉장고 (음료 + 도시락) ---------- */
const DRINK_DEFAULT = [['프로핏 (밀크 바닐라)', 5], ['솔의눈', 5], ['코카콜라 제로', 6], ['몬스터 울트라', 3], ['몬스터 에너지', 3], ['몬스터 울트라 시트라', 3]];
const DRINK_ART = {                     // 이름 -> 사진과 크기 (사용자가 올린 제품 사진)
  '프로핏 (밀크 바닐라)': { img: 'profit', carton: true },
  '솔의눈': { img: 'solnun', r: 0.029, h: 0.125, base: 0xe9eeea },
  '코카콜라 제로': { img: 'cola', r: 0.029, h: 0.132, base: 0xc01f2a },
  '몬스터 울트라': { img: 'm1', r: 0.033, h: 0.15, base: 0xe9ebee },
  '몬스터 에너지': { img: 'm2', r: 0.033, h: 0.15, base: 0x1b1b1b },
  '몬스터 울트라 시트라': { img: 'm3', r: 0.033, h: 0.15, base: 0xf1d94a }
};
const drinkTex = {};
function drinkTexture(key) {
  if (!drinkTex[key]) { const t = new THREE.TextureLoader().load(DRINK_IMG[key]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.shared = true; drinkTex[key] = t; }
  return drinkTex[key];
}
// 음료 하나를 만든다 (g의 가운데가 몸통 가운데). 앞면(+x)에 제품 사진을 입힌다
function buildDrink(g, name, idx) {
  const a = DRINK_ART[name];
  if (a && a.carton) {                                              // 프로핏: 사각 팩 + 흰 뚜껑
    const w = 0.062, h = 0.125;
    const face = new THREE.MeshStandardMaterial({ map: drinkTexture(a.img), roughness: 0.6 }), side = new THREE.MeshStandardMaterial({ color: 0xf1e6c8, roughness: 0.7 });
    put(new THREE.Mesh(new THREE.BoxGeometry(w, h, w), [face, side, side, side, side, side]), 0, 0, 0, g);
    cyl(0.016, 0.016, 0.022, 0xffffff, 0, h / 2 + 0.011, 0, g);
    return h;
  }
  const r = a ? a.r : 0.033, h = a ? a.h : 0.13;
  cyl(r, r, h, a ? a.base : [0xc0392b, 0x4fae6a, 0x7fb8d6, 0xc9d94a][idx % 4], 0, 0, 0, g, { metalness: 0.3, roughness: 0.4 });
  cyl(r * 0.88, r * 0.88, 0.006, 0xd4d8dc, 0, h / 2 + 0.003, 0, g, { metalness: 0.5, roughness: 0.35 });    // 캔 윗면과 아랫면
  cyl(r * 0.88, r * 0.88, 0.006, 0xd4d8dc, 0, -h / 2 - 0.003, 0, g, { metalness: 0.5, roughness: 0.35 });
  if (a) {                                                                                                 // 캔 앞쪽 132도에 사진을 감는다
    const arc = 2.3, geo = new THREE.CylinderGeometry(r + 0.0006, r + 0.0006, h, 32, 1, true, Math.PI / 2 - arc / 2, arc);
    put(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: drinkTexture(a.img), roughness: 0.4, metalness: 0.1 })), 0, 0, 0, g);
  }
  return h;
}
const HOUR = 3600e3, DAY = 24 * HOUR;
function ago(at) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}
const fmtAt = at => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
// 목록을 읽을 때 '넣은 시각'이 없는 옛 값은 지금 넣은 것으로 채워 저장한다
function seeded(key, make) {
  let v = store.get(key, null), changed = false;
  if (!Array.isArray(v)) { v = make(); changed = true; }
  v = v.map(x => {
    if (typeof x === 'string') { changed = true; return { name: x, at: Date.now() }; }
    if (!x.at) { changed = true; return { ...x, at: Date.now() }; }
    return x;
  });
  if (changed) store.set(key, v);
  return v;
}
const getDrinks = () => store.get('drinks2', DRINK_DEFAULT);
const saveDrinks = a => store.set('drinks2', a);
const getFreezer = () => seeded('freezer', () => [
  { name: '정ㅇㅇ과장 아이스크림', at: Date.now() - 80 * HOUR },
  { name: '냉동 만두', at: Date.now() - 5 * HOUR },
  { name: '아이스크림 (건드리지 마세요)', at: Date.now() - 30 * HOUR }]);
const getBoxes = () => seeded('boxes', () => [
  { name: '김ㅇㅇ사원 도시락', at: Date.now() - 4 * HOUR },
  { name: '박ㅇㅇ대리 샐러드', at: Date.now() - 26 * HOUR },
  { name: '최ㅇㅇ팀장 샌드위치', at: Date.now() - 0.5 * HOUR }]);
const getCups = () => seeded('cups', () => [
  { name: '누가 먹던 커피', at: Date.now() - 75 * HOUR },
  { name: '정ㅇㅇ과장 아아', at: Date.now() - 2 * HOUR }]);
APPS.fridge = () => {
  fridgeOpen = true;
  beginFocus(new THREE.Vector3(-1.4, 1.5, 1.2), new THREE.Vector3(-4.15, 0.85, 0.05));
  const bar = () => showBar({
    title: '냉장실', info: '올리면 이름, 누르면 확대해서 골라요',
    kinds: [['box', '도시락'], ['cup', '먹던 커피'], ['drink', '음료']],
    placeholder: '이름표 (예: 김ㅇㅇ사원 도시락)',
    onAdd(kind, v) {
      if (kind === 'box') { const a = getBoxes(); a.push({ name: v, at: Date.now() }); store.set('boxes', a); }
      else if (kind === 'cup') { const a = getCups(); a.push({ name: v, at: Date.now() }); store.set('cups', a); }
      else { const a = getDrinks(), d = a.find(x => x[0] === v); if (d) d[1] += 6; else a.push([v, 6]); saveDrinks(a); }
      toast(`${v} 넣었습니다`); refreshFridge();
    }
  });
  bar(); restoreBar = bar;
  cleanup = () => { fridgeOpen = false; resetItemFocus(); hideBar(); endFocus(); };
};
APPS.fridge.noPanel = true;

APPS.freezer = () => {
  freezerOpen = true;
  beginFocus(new THREE.Vector3(-1.5, 2.4, 1.1), new THREE.Vector3(-4.15, 1.95, 0.05));
  const bar = () => showBar({
    title: '냉동실', info: '올리면 이름, 누르면 확대해서 골라요',
    placeholder: '냉동 식품 (예: 정ㅇㅇ과장 아이스크림)',
    onAdd(kind, v) { const a = getFreezer(); a.push({ name: v, at: Date.now() }); store.set('freezer', a); toast(`${v} 넣었습니다`); refreshFreezer(); }
  });
  bar(); restoreBar = bar;
  cleanup = () => { freezerOpen = false; resetItemFocus(); hideBar(); endFocus(); };
};
APPS.freezer.noPanel = true;

/* ---------- 간식 서랍장 + 쿠팡 모의 자동 주문 ---------- */
const pending = new Set();
function addLog(msg) {
  const log = store.get('orderLog', []);
  log.unshift(`${new Date().toTimeString().slice(0, 5)}  ${msg}`);
  store.set('orderLog', log.slice(0, 8));
}
function orderSnack(i, auto) {
  if (pending.has(i)) { toast('이미 주문해서 배송 중입니다'); return; }
  pending.add(i);
  addLog(`${auto ? '[자동] ' : ''}주문 접수(모의) ${SNACK_NAMES[i]} x${SNACK_ORDER}`);
  toast(`쿠팡 ${auto ? '자동 ' : ''}주문 접수 (모의): ${SNACK_NAMES[i]} x${SNACK_ORDER} · 5초 뒤 도착`);
  setTimeout(() => {
    const q = getSnacks(); q[i] += SNACK_ORDER; saveSnacks(q);
    pending.delete(i);
    addLog(`도착(모의) ${SNACK_NAMES[i]} x${SNACK_ORDER}`);
    refreshSnacks(); if (currentApp === 'snack') showSnackBar();
    toast(`${SNACK_NAMES[i]} x${SNACK_ORDER} 도착했습니다 (모의)`);
  }, 5000);
}
function eatSnack(g) {
  const i = g.userData.info.i, q = getSnacks();
  if (q[i] <= 0) return;
  q[i]--; saveSnacks(q);
  toast(`${SNACK_SHORT[i]} 하나 먹었습니다 (${q[i]}개 남음)`);
  leave(g, () => { refreshSnacks(); if (currentApp === 'snack') showSnackBar(); });
  if (store.get('auto', true) && q[i] < SNACK_LOW) orderSnack(i, true);
}
const CHEST_VIEW = { pos: new THREE.Vector3(-1.1, 1.5, -0.7), target: new THREE.Vector3(-1.1, 0.5, -3.0) };
function openDrawer(i) {
  snackIdx = i;
  const d = snackDrawers[i], wx0 = d.position.x, wz = DRAWER_FRONT_Z + SNACK_PULL - 0.28;      // 열린 서랍 바닥 한가운데
  flyTo(new THREE.Vector3(wx0, d.position.y + 1.25, wz + 0.55), new THREE.Vector3(wx0, d.position.y - 0.12, wz), 700);   // 열린 서랍을 바로 위에서 내려다본다
  hoverItem = null; labelEl.style.display = 'none';
  rebuildSnackTargets(); showSnackBar();
}
function closeDrawer() {
  snackIdx = -1;
  flyTo(CHEST_VIEW.pos, CHEST_VIEW.target, 700);
  hoverItem = null; labelEl.style.display = 'none';
  rebuildSnackTargets(); showSnackBar();
}
const toggleDrawer = i => (snackIdx === i ? closeDrawer() : openDrawer(i));
function showSnackBar() {
  const q = getSnacks(), i = snackIdx;
  const autoLabel = () => `자동 주문 ${store.get('auto', true) ? '켜짐' : '꺼짐'}`;
  showBar({
    title: i < 0 ? '간식 서랍장' : `${SNACK_SHORT[i]} 서랍`,
    info: i < 0 ? '서랍을 눌러 한 칸씩 열어요 · 빨간 표시: 모의 주문' : `${q[i]}개 · 6칸 x 3줄에 놓여 있어요 (자리마다 최대 2개) · 누르면 먹기`,
    buttons: [...(i >= 0 ? [['shut', '서랍 닫기']] : []), ['auto', autoLabel()]],
    onButton(act) {
      if (act === 'shut') { closeDrawer(); return; }
      store.set('auto', !store.get('auto', true));
      ibarEl.querySelector('[data-act="auto"]').textContent = autoLabel();
      toast(`${autoLabel()} (${SNACK_LOW}개 미만이면 자동으로 모의 주문)`);
    }
  });
}
APPS.snack = () => {
  snackIdx = -1;
  beginFocus(CHEST_VIEW.pos, CHEST_VIEW.target);
  rebuildSnackTargets(); showSnackBar();
  cleanup = () => { snackIdx = -1; rebuildSnackTargets(); resetItemFocus(); hideBar(); endFocus(); };
};
APPS.snack.noPanel = true;

/* ---------- 건의사항 게시판 ---------- */
APPS.board = () => {
  beginFocus(new THREE.Vector3(3.75, 2.3, -1.7), new THREE.Vector3(3.85, 2.3, -3.88));
  const bar = () => showBar({
    title: '건의사항 게시판', info: '올리면 내용, 누르면 확대해서 떼요',
    placeholder: '건의사항 (예: 우유 종류를 늘려 주세요)', addLabel: '붙이기',
    onAdd(kind, v) { const a = suggestions(); a.push(v); store.set('suggestions', a); toast('건의사항을 붙였습니다'); renderBoardNotes(); }
  });
  bar(); restoreBar = bar;
  cleanup = () => { resetItemFocus(); hideBar(); endFocus(); };
};
APPS.board.noPanel = true;

/* ---------- 과자 자판기 ---------- */
APPS.vending = () => {
  beginFocus(new THREE.Vector3(7.0, 1.55, -0.85), new THREE.Vector3(7.0, 1.1, -3.4));
  const spent = () => store.get('vendSpent', 0);
  const bar = () => showBar({
    title: '과자 자판기', info: `누르면 나옵니다 (모의 결제) · 지금까지 ${spent().toLocaleString()}원`,
    buttons: VEND.map((v, i) => ['v' + i, `${String.fromCharCode(65 + i)} ${v.n} ${v.p.toLocaleString()}원`, i === 0]),
    onButton(act) {
      const i = +act.slice(1), v = VEND[i]; if (!v) return;
      store.set('vendSpent', spent() + v.p);
      const pk = rbox(0.12, 0.17, 0.04, new THREE.Color(v.c).getHex(), 7.0, 1.35 - i * 0.05, -3.0, scene, 0.01);   // 떨어지는 과자
      const t0 = performance.now(), y0 = pk.position.y;
      (function fall() { const k = Math.min(1, (performance.now() - t0) / 550); pk.position.y = y0 + (0.26 - y0) * k * k; if (k < 1) requestAnimationFrame(fall); else setTimeout(() => { scene.remove(pk); disposeObj(pk); }, 1400); })();
      toast(`${v.n}이(가) 나왔습니다 (-${v.p.toLocaleString()}원, 모의)`); bar();
    }
  });
  bar(); restoreBar = bar;
  cleanup = () => { hideBar(); endFocus(); restoreBar = null; };
};
APPS.vending.noPanel = true;

/* ---------- 점심 테이블: 오늘 뭐 먹지 ---------- */
const MENU_DEFAULT = ['김치찌개', '제육볶음', '돈까스', '비빔밥', '칼국수', '샐러드', '삼각김밥'];
APPS.lunch = () => {
  const menu = store.get('menu', MENU_DEFAULT);
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>점심 테이블</h2>
    <p class="sub">고르기 귀찮을 때 돌려 보세요.</p>
    <div class="result" id="res">오늘의 점심은?</div>
    <div class="row"><button class="primary" id="spin">돌리기</button></div>
    <h3>후보 메뉴</h3>
    <div class="row"><input type="text" id="mn" maxlength="14" placeholder="메뉴 추가"><button id="addm">추가</button></div>
    <div class="log" id="ml">${menu.map((m, i) => `${esc(m)} <button data-i="${i}" style="padding:0 7px;font-size:12px">x</button>`).join(' &nbsp; ')}</div>`;
  let iv = null;
  cleanup = () => clearInterval(iv);
  $('#spin').onclick = () => {
    if (!menu.length) return;
    clearInterval(iv);
    let n = 0;
    iv = setInterval(() => {
      $('#res').textContent = menu[Math.floor(Math.random() * menu.length)];
      if (++n > 14) { clearInterval(iv); toast(`오늘은 ${$('#res').textContent}!`); }
    }, 90);
  };
  const addm = () => { const v = $('#mn').value.trim(); if (!v) return; menu.push(v); store.set('menu', menu); APPS.lunch(); };
  $('#addm').onclick = addm;
  $('#mn').addEventListener('keydown', e => { if (e.key === 'Enter') addm(); });
  $('#ml').onclick = e => { const b = e.target.closest('button'); if (!b) return; menu.splice(+b.dataset.i, 1); store.set('menu', menu); APPS.lunch(); };
  $('#x').onclick = closeApp;
};

/* ---------- 싱크대: 텀블러 확대 ---------- */
APPS.sink = () => {
  beginFocus(new THREE.Vector3(-3.0, 1.7, -0.9), new THREE.Vector3(-4.5, 0.8, -1.5));
  const bar = () => showBar({
    title: '싱크대', info: `설거지 ${mess.dishes} · 텀블러 ${mess.tumblers} · 눌러서 확대`,
    placeholder: '텀블러 이름 (예: 김ㅇㅇ사원 텀블러)', addLabel: '올리기',
    buttons: [['wash', '설거지하기', true], ['washt', '텀블러 씻기']],
    onAdd(kind, v) { const t = getTumblers(); t.push(v); store.set('tumblers', t); toast(`${v} 올렸습니다`); refreshTumblers(); },
    onButton(act) { washKind = act === 'washt' ? 'tumbler' : 'dish'; wash.on = false; openApp('wash'); }
  });
  bar(); restoreBar = bar;
  cleanup = () => { resetItemFocus(); hideBar(); endFocus(); };
};
APPS.sink.noPanel = true;

/* ---------- 창문: 날씨와 테마 ---------- */
APPS.window = () => {
  const th = activeTheme();
  const seg = (items, cur, attr) => `<div class="seg">${items.map(([v, n]) => `<button class="${v === cur ? 'on' : ''}" data-${attr}="${v}">${v === 'birthday' ? `생일 (${esc(bdayName)})` : n}</button>`).join('')}</div>`;
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>창문</h2>
    <p class="sub">창밖은 지금 방의 시각(${pad2(simDate().getHours())}:${pad2(simDate().getMinutes())})에 맞춰 바뀝니다. 시각은 벽시계를 눌러 바꾸세요. 실시간 날씨는 이 페이지에서 가져올 수 없어서 날씨는 직접 고릅니다.</p>
    <h3>날씨</h3>
    ${seg([['clear', '맑음'], ['cloudy', '구름'], ['rain', '비'], ['snow', '눈']], wx, 'wx')}
    <h3>테마 꾸미기</h3>
    ${seg(THEMES, themeSetting, 'theme')}
    ${themeSetting === 'auto' ? `<p class="sub">오늘 날짜 기준 테마: <b>${THEME_NAME[th]}</b>${th === 'none' ? ' (오늘은 해당하는 기념일이 없습니다)' : ''}</p>` : ''}
    <h3>생일 주인공</h3>
    <div class="row"><input type="text" id="bn" maxlength="8" value="${esc(bdayName)}" placeholder="이름"><button id="savebn">저장</button></div>
    <p class="sub">생일 테마는 9/9에 "${esc(bdayName)} 생일 축하해요!"로 걸립니다.</p>`;
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.id === 'savebn') { bdayName = $('#bn').value.trim() || '장사원'; store.set('bdayName', bdayName); toast(`생일 주인공: ${bdayName}`); refreshWorldTime(); APPS.window(); return; }
    if (b.dataset.wx) { wx = b.dataset.wx; store.set('weather', wx); }
    if (b.dataset.theme) { themeSetting = b.dataset.theme; store.set('theme', themeSetting); }
    refreshWorldTime(); APPS.window();
  };
  cleanup = () => { panel.onclick = null; };
};

/* ---------- 벽시계: 24시간으로 시각 바꾸기 ---------- */
const TIME_PRESETS = [['06:30', '이른 아침'], ['08:50', '출근'], ['12:10', '점심'], ['15:00', '오후'], ['18:00', '퇴근 시간'], ['19:00', '야근 시작'], ['23:30', '밤샘 야근'], ['03:00', '새벽']];
const parseTime = v => { const m = v.trim().match(/^([01]?\d|2[0-3]):?([0-5]\d)$/); return m ? [+m[1], +m[2]] : null; };
APPS.clock = () => {
  const nowText = () => { const d = simDate(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>벽시계</h2>
    <p class="sub" id="mode">${timeOffset === null ? '지금은 실제 시각을 따라갑니다.' : '입력한 시각부터 시간이 계속 흐릅니다. (새로고침하면 실제 시각으로 돌아옵니다)'}</p>
    <div class="result"><span id="now">${nowText()}</span> <small id="lab">${timeLabel(simHour())}</small></div>
    <div class="row"><input type="text" id="tm" inputmode="numeric" maxlength="5" placeholder="24시간으로 입력 (예: 19:00)"><button class="primary" id="settm">바꾸기</button></div>
    <p class="sub" id="tmsg">창밖 하늘, 해와 달, 방 조명이 이 시각에 맞춰 바뀝니다. 19시 이후는 야근입니다.</p>
    <h3>빠르게 고르기</h3>
    <div class="presets">${TIME_PRESETS.map(([t, n]) => `<button data-t="${t}">${t}<small>${n}</small></button>`).join('')}</div>
    <div class="row"><button id="real">지금 실제 시각으로</button></div>`;
  const iv = setInterval(() => { const n = $('#now'); if (n) { n.textContent = nowText(); $('#lab').textContent = timeLabel(simHour()); } }, 1000);
  const apply = hhmm => {
    const p = parseTime(hhmm);
    if (!p) { $('#tmsg').textContent = '24시간 형식으로 입력해 주세요. 예: 07:30, 19:00, 23:45'; return; }
    setSimTime(p[0], p[1]); toast(`${pad2(p[0])}:${pad2(p[1])} · ${timeLabel(simHour())}`); APPS.clock();
  };
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.id === 'settm') apply($('#tm').value);
    if (b.dataset.t) apply(b.dataset.t);
    if (b.id === 'real') { timeOffset = null; refreshWorldTime(); toast('실제 시각으로 돌아왔습니다'); APPS.clock(); }
  };
  $('#tm').addEventListener('keydown', e => { if (e.key === 'Enter') apply($('#tm').value); });
  cleanup = () => { clearInterval(iv); panel.onclick = null; };
};

/* ---------- 에어컨 ---------- */
APPS.aircon = () => {
  const seg = (items, cur, attr) => `<div class="seg">${items.map(v => `<button class="${v === cur ? 'on' : ''}" data-${attr}="${v}">${v}</button>`).join('')}</div>`;
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>벽걸이 에어컨</h2>
    <p class="sub">${ac.on ? `${ac.mode} 중 · 설정 ${ac.temp}도 · 바람 ${ac.fan}` : '꺼져 있습니다.'}</p>
    <div class="row"><button class="${ac.on ? '' : 'primary'}" data-pw="1">${ac.on ? '끄기' : '켜기'}</button></div>
    <h3>설정 온도</h3>
    <div class="row"><button data-t="-1" ${ac.temp <= 18 ? 'disabled' : ''}>-1도</button><div class="timer" style="margin:0 8px">${ac.temp}도</div><button data-t="1" ${ac.temp >= 30 ? 'disabled' : ''}>+1도</button></div>
    <h3>모드</h3>${seg(['냉방', '제습', '송풍'], ac.mode, 'mode')}
    <h3>바람 세기</h3>${seg(['약', '중', '강'], ac.fan, 'fan')}`;
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.dataset.pw) ac.on = !ac.on;
    if (b.dataset.t) ac.temp = Math.max(18, Math.min(30, ac.temp + +b.dataset.t));
    if (b.dataset.mode) ac.mode = b.dataset.mode;
    if (b.dataset.fan) ac.fan = b.dataset.fan;
    store.set('ac', ac); updateAcDisplay(); APPS.aircon();
  };
  cleanup = () => { panel.onclick = null; };
};

/* ---------- 정수기 / 종이컵 ---------- */
let useCup = true;
APPS.purifier = () => {
  const stock = getPaperCups(), water = store.get('water', 0);
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>정수기</h2>
    <p class="sub">오늘 마신 물 <b>${water}</b>잔 · 종이컵 <b>${stock}</b>개 남음${purifierBusy ? ` · ${purifierBusy.type} 받는 중...` : ''}</p>
    <label class="check"><input type="checkbox" id="uc" ${useCup ? 'checked' : ''}> 종이컵 사용 (끄면 텀블러로 받기)</label>
    <div class="presets">
      <button data-w="냉수" ${purifierBusy ? 'disabled' : ''}>냉수<small>시원한 물</small></button>
      <button data-w="정수" ${purifierBusy ? 'disabled' : ''}>정수<small>실온</small></button>
      <button data-w="온수" ${purifierBusy ? 'disabled' : ''}>온수<small>뜨거우니 조심</small></button>
    </div>`;
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (!b.dataset.w || purifierBusy) return;
    if (useCup && getPaperCups() <= 0) { toast('종이컵이 떨어졌습니다. 종이컵 통을 채워 주세요'); return; }
    if (useCup) { store.set('paperCups', getPaperCups() - 1); refreshCups(); }
    purifierStream.material.color.set({ 냉수: 0x6fc3f0, 정수: 0xbfe6f5, 온수: 0xf0a37a }[b.dataset.w]);
    purifierBusy = { type: b.dataset.w, end: Date.now() + 3000 };
    APPS.purifier();
  };
  $('#uc').onchange = e => { useCup = e.target.checked; };
  cleanup = () => { panel.onclick = null; };
};
APPS.cups = () => {
  const stock = getPaperCups();
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>종이컵</h2>
    <p class="sub">남은 종이컵 <b>${stock}</b>개${stock < 8 ? ' · 얼마 안 남았습니다' : ''}</p>
    <div class="row"><button class="primary" data-a="take" ${stock ? '' : 'disabled'}>한 장 뽑기</button><button data-a="fill">+50 채우기</button></div>`;
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.dataset.a === 'take') { store.set('paperCups', stock - 1); toast('종이컵 한 장'); }
    if (b.dataset.a === 'fill') { store.set('paperCups', stock + 50); toast('종이컵 50개를 채웠습니다'); }
    refreshCups(); APPS.cups();
  };
  cleanup = () => { panel.onclick = null; };
};

/* ---------- 지저분해지는 탕비실 ---------- */
const MESS_DEFAULT = { trash: 2, floor: 1, stain: 1, dishes: 2, tumblers: 1 };
const MESS_CAP = { trash: 6, floor: 4, stain: 2, dishes: 5, tumblers: 4 };
const MESS_EVERY = 45000, CLEAN_GRACE = 6 * 3600e3;   // 청소하고 6시간이 지나야 다시 어질러지기 시작한다 (그 뒤로는 45초마다 한 가지씩)
const messSaved = store.get('mess', null);
const mess = { ...MESS_DEFAULT, ...(messSaved || {}) };
if (!mess.cleanAt) mess.cleanAt = Date.now();    // 처음 열었을 때도 지금부터 6시간은 새로 어질러지지 않는다
if (!mess.evAt) mess.evAt = mess.cleanAt;
const messGrace = { dishes: 0, tumblers: 0 };
function messEvent() {
  const bag = ['trash', 'trash', 'trash', 'floor', 'floor', 'stain', 'stain', 'dishes', 'dishes', 'tumblers'];
  const k = bag[Math.floor(Math.random() * bag.length)];
  if (mess[k] < MESS_CAP[k]) mess[k]++;
}
function markClean() { mess.cleanAt = Date.now(); mess.evAt = mess.cleanAt; }   // 청소를 하면 그때부터 6시간을 다시 센다
// 마지막 청소 후 6시간이 지났을 때만 저절로 어질러진다 (자리를 비운 동안 지난 시간도 계산, 한 번에 최대 8가지)
function autoMess() {
  const now = Date.now(), start = mess.cleanAt + CLEAN_GRACE;
  if (now < start) return 0;
  const from = Math.max(start, mess.evAt), raw = Math.floor((now - from) / MESS_EVERY);
  if (raw <= 0) return 0;
  const n = Math.min(8, raw);
  for (let i = 0; i < n; i++) messEvent();
  mess.evAt = raw > 8 ? now : from + raw * MESS_EVERY;
  return n;
}
autoMess();
function messUp() {                               // "일부러 어지르기": 바로 세 가지가 어질러진다
  for (let i = 0; i < 3; i++) messEvent();
  saveMess(); refreshMess(); toast('일부러 어질렀습니다');
}
function saveMess() { mess.at = Date.now(); store.set('mess', mess); }
const cleanliness = () => Math.max(0, Math.round(100 - mess.trash * 6 - mess.floor * 7 - mess.stain * 8 - mess.dishes * 6 - mess.tumblers * 5));
const hudEl = document.getElementById('hud');
const hmLeft = ms => `${Math.floor(ms / 3600e3)}시간 ${String(Math.floor(ms % 3600e3 / 60e3)).padStart(2, '0')}분`;
function tickMessLeft() {
  const el = document.getElementById('messleft'); if (!el) return;
  const left = mess.cleanAt + CLEAN_GRACE - Date.now();
  el.textContent = left > 0 ? `청소 후 ${hmLeft(left)} 동안은 안 어질러져요` : '시간이 지나 어질러지는 중';
}
function updateHud() {
  const c = cleanliness();
  const parts = [];
  if (mess.trash) parts.push(`쓰레기통 ${mess.trash}/6`);
  if (mess.floor) parts.push(`바닥 쓰레기 ${mess.floor}`);
  if (mess.stain) parts.push(`식탁 얼룩 ${mess.stain}`);
  if (mess.dishes) parts.push(`설거지 ${mess.dishes}`);
  if (mess.tumblers) parts.push(`텀블러 ${mess.tumblers}`);
  hudEl.innerHTML = `청결도 <b class="${c < 60 ? 'low' : ''}">${c}%</b><div class="tasks">${parts.length ? parts.join(' · ') : '깨끗합니다'}</div>`
    + '<div class="tasks" id="messleft"></div><button id="messbtn">일부러 어지르기</button>';
  tickMessLeft();
}
hudEl.addEventListener('click', e => { if (e.target.closest('#messbtn')) messUp(); });

// 눌러서 치우는 물건은 "누른 것"이 사라져야 하므로 자리별로 켜짐/꺼짐을 따로 기억한다
const litterOn = [false, false, false, false], stainOn = [false, false];
function syncSlots(on, groups, count) {
  let n = on.filter(Boolean).length;
  for (let i = 0; i < on.length && n < count; i++) if (!on[i]) { on[i] = true; n++; }
  for (let i = on.length - 1; i >= 0 && n > count; i--) if (on[i]) { on[i] = false; n--; }
  groups.forEach((g, i) => { g.visible = on[i]; });
}
// 바닥 쓰레기 (눌러서 줍기)
const LITTER_SLOTS = [[-1.2, 2.6], [2.9, 3.0], [0.4, -1.1], [4.4, -0.6]];
const litter = LITTER_SLOTS.map(([x, z], i) => {
  const g = new THREE.Group();
  if (i % 2 === 0) {          // 구겨진 종이 뭉치 두 개
    put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mat(0xffffff)), 0, 0.1, 0, g);
    put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat(0xf4e9c8)), 0.14, 0.07, 0.06, g);
  } else {                    // 찌그러진 캔 + 과자 봉지
    cyl(0.055, 0.055, 0.18, 0xd94e4e, 0, 0.055, 0, g).rotation.z = Math.PI / 2;
    sph(1, 0xe8913a, 0.2, 0.04, 0.05, g, [0.1, 0.04, 0.07]);
  }
  g.position.set(x, 0, z); g.rotation.y = i;
  g.userData.act = () => pickLitter(i);
  makeInteractive(g, 'litter', '바닥 쓰레기 · 눌러서 줍기');
  return g;
});
function pickLitter(i) {
  litterOn[i] = false;
  mess.floor = Math.max(0, mess.floor - 1); mess.trash = Math.min(MESS_CAP.trash, mess.trash + 1);
  markClean(); saveMess(); refreshMess(); toast('바닥 쓰레기를 주워 쓰레기통에 넣었습니다');
}
// 식탁 얼룩 (세 번 눌러 닦기)
const STAIN_SLOTS = [[1.45, 0.82, 1.32], [2.93, 0.82, 1.38]];   // 접시·도시락통과 겹치지 않는 식탁의 빈 자리
const stainHp = [3, 3];
const stains = STAIN_SLOTS.map(([x, y, z], i) => {
  const g = new THREE.Group();
  sph(1, 0x4a2e1c, 0, 0, 0, g, [0.13, 0.012, 0.085]);
  sph(1, 0x4a2e1c, 0.15, 0, 0.05, g, [0.045, 0.01, 0.035]);
  [[-0.11, 0.08], [0.05, -0.09], [0.16, -0.03], [-0.04, 0.1]].forEach(([dx, dz]) => sph(0.016, 0xe0c890, dx, 0.014, dz, g));
  g.position.set(x, y, z); g.rotation.y = i * 1.3;
  g.userData.act = () => wipeStain(i);
  makeInteractive(g, 'stain', '식탁 얼룩 · 눌러서 닦기');
  return g;
});
function wipeStain(i) {
  stainHp[i]--;
  if (stainHp[i] > 0) { stains[i].scale.setScalar(stainHp[i] / 3 + 0.15); toast(`쓱쓱 닦는 중 (${3 - stainHp[i]}/3)`); return; }
  stainHp[i] = 3; stains[i].scale.setScalar(1); stainOn[i] = false;
  mess.stain = Math.max(0, mess.stain - 1); markClean(); saveMess(); refreshMess(); toast('식탁을 깨끗하게 닦았습니다');
}
// 싱크대에 쌓인 설거지
const sinkPile = new THREE.Group();
scene.add(sinkPile);
function refreshSinkPile() {
  sinkPile.children.slice().forEach(c => { sinkPile.remove(c); disposeObj(c); });
  for (let i = 0; i < mess.dishes; i++) {
    const x = -4.56 + (i % 2) * 0.12, z = -2.78 + (i % 3) * 0.12, y = 0.655 + Math.floor(i / 3) * 0.022;
    cyl(0.08, 0.07, 0.018, i % 2 ? 0xf5d5c8 : 0xffffff, x, y, z, sinkPile);
    sph(0.014, 0x8a4b2a, x + 0.02, y + 0.012, z, sinkPile, [1, 0.35, 1]);
  }
  sinkPile.traverse(o => { if (o.isMesh) o.userData.owner = sink; });
}
// 쓰레기통에 쌓인 쓰레기
function refreshTrashPile() {
  trashPile.children.slice().forEach(c => { trashPile.remove(c); disposeObj(c); });
  const cols = [0xf2f2ee, 0xd9c8a0, 0xc9d3d8, 0xe8b9a0, 0xb8c9a0, 0xe9e1d0];
  for (let i = 0; i < mess.trash; i++) {
    const m = put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + (i % 3) * 0.008, 0), mat(cols[i % 6])),
      3.7 + ((i % 3) - 1) * 0.08, 0.54 + Math.floor(i / 3) * 0.07, CZ + 0.05 + ((i % 2) - 0.5) * 0.07, trashPile);
    m.userData.owner = bins;
  }
}
let wasLow = false;
function refreshMess() {
  refreshTrashPile(); refreshSinkPile();
  syncSlots(litterOn, litter, mess.floor);
  syncSlots(stainOn, stains, mess.stain);
  updateHud();
  const low = cleanliness() < 60;
  if (low && !wasLow) toast('탕비실이 많이 지저분해졌어요. 정리해 주세요');
  wasLow = low;
}
setInterval(() => { if (autoMess()) { saveMess(); refreshMess(); } else tickMessLeft(); }, 30000);

/* ---------- 쓰레기통 비우기: 분리배출 게임 ---------- */
const BIN_LABEL = { general: '일반 쓰레기', recycle: '재활용', food: '음식물' };
const TRASH_POOL = [
  ['페트병', 'recycle'], ['음료 캔', 'recycle'], ['유리병', 'recycle'], ['종이 박스', 'recycle'], ['신문지', 'recycle'],
  ['휴지', 'general'], ['나무젓가락', 'general'], ['컵라면 용기 (국물 묻음)', 'general'], ['일회용 빨대', 'general'], ['영수증', 'general'],
  ['물티슈', 'general'], ['달걀 껍데기', 'general'], ['생선 뼈', 'general'],
  ['바나나 껍질', 'food'], ['남은 밥', 'food'], ['커피 찌꺼기', 'food'], ['귤 껍질', 'food'], ['수박 껍질', 'food'], ['남은 김치', 'food']
];
let tg = null;
function trashPanel() {
  if (tg.finished) {
    const win = tg.finished === 'win';
    panel.innerHTML = `
      <button class="close" id="x">닫기</button>
      <h2>쓰레기통 비우기</h2>
      <div class="result">${win ? '쓰레기통을 비웠습니다' : '쓰레기가 섞여 버렸어요'}</div>
      <p class="sub">${win ? `맞힌 개수 ${tg.score} / ${tg.items.length} · 청결도 ${cleanliness()}%` : `기회를 모두 썼습니다. 맞힌 개수 ${tg.score}. 마지막 오답: ${esc(tg.msg || '')}`}</p>
      <div class="row"><button class="primary" id="again">${win ? '한 번 더 (연습)' : '다시 도전'}</button></div>`;
    return;
  }
  const it = tg.items[tg.i];
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>쓰레기통 비우기</h2>
    <p class="sub">쓰레기통 ${mess.trash}/6. 알맞은 통에 분리배출하세요. 지자체마다 규정이 조금씩 다를 수 있습니다.</p>
    <div class="steps"><span class="on">${tg.i + 1} / ${tg.items.length}</span><span>기회 ${tg.lives}</span><span class="done">맞힌 개수 ${tg.score}</span></div>
    <div class="result" id="item">${esc(it[0])}</div>
    <div class="bar"><i id="tb" style="width:100%"></i></div>
    <div class="presets"><button data-c="general">일반 쓰레기</button><button data-c="recycle">재활용</button><button data-c="food">음식물</button></div>
    <p class="sub" id="fb">${esc(tg.msg || '')}</p>`;
}
function trashAnswer(c) {
  if (tg.finished) return;
  const it = tg.items[tg.i];
  if (c === it[1]) { tg.score++; tg.msg = '정답!'; } else { tg.lives--; tg.msg = `${it[0]}은(는) ${BIN_LABEL[it[1]]}입니다.`; }
  tg.i++; tg.deadline = Date.now() + 7000;
  if (tg.lives <= 0) tg.finished = 'fail';
  else if (tg.i >= tg.items.length) { tg.finished = 'win'; mess.trash = 0; markClean(); saveMess(); refreshMess(); toast('쓰레기통을 비웠습니다'); }
  trashPanel();
}
function newTrashGame() {
  const pool = TRASH_POOL.slice().sort(() => Math.random() - 0.5);
  tg = { items: pool.slice(0, Math.min(pool.length, 6 + mess.trash * 2)), i: 0, lives: 3, score: 0, deadline: Date.now() + 7000, finished: null, msg: '' };
}
APPS.trash = () => {
  newTrashGame(); trashPanel();
  const iv = setInterval(() => {
    if (!tg || tg.finished) return;
    const left = tg.deadline - Date.now(), tb = $('#tb');
    if (tb) tb.style.width = `${Math.max(0, left / 7000 * 100)}%`;
    if (left <= 0) trashAnswer(null);
  }, 100);
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.id === 'again') { newTrashGame(); trashPanel(); return; }
    if (b.dataset.c) trashAnswer(b.dataset.c);
  };
  cleanup = () => { clearInterval(iv); panel.onclick = null; };
};

/* ---------- 설거지 / 텀블러 씻기 (싱크대) ---------- */
[faucetPost, faucetTube].forEach(m => { m.userData.tool = 'faucet'; });
[soapBottle, soapCap].forEach(m => { m.userData.tool = 'soap'; });
const washTools = [faucetPost, faucetTube, soapBottle, soapCap];
const BASIN = { x: -4.5, y: 0.655, z: -2.6 };
const washGroup = new THREE.Group();
scene.add(washGroup);
let washKind = 'dish';                           // 'dish' | 'tumbler'
const wash = { on: false, soap: 0, water: false, dishes: [], left: 0, start: 0, done: false, time: 0, hint: '' };
const sponge = new THREE.Group();
rbox(0.1, 0.035, 0.07, 0xf4d03f, 0, 0, 0, sponge, 0.012);
rbox(0.1, 0.012, 0.07, 0x4aa06a, 0, 0.022, 0, sponge, 0.006);
const spongeFoam = new THREE.Group();
[[-0.03, 0.01], [0.02, -0.01], [0.03, 0.015], [-0.01, -0.02]].forEach(([x, z]) => sph(0.016, 0xffffff, x, 0.04, z, spongeFoam));
sponge.add(spongeFoam);
sponge.visible = false;
scene.add(sponge);
const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.64), new THREE.MeshBasicMaterial({ color: 0x9fd5ec, transparent: true, opacity: 0.4, depthWrite: false }));
waterPlane.rotation.x = -Math.PI / 2; waterPlane.position.set(BASIN.x, 0.67, BASIN.z); waterPlane.visible = false;
scene.add(waterPlane);
const stream = cyl(0.01, 0.01, 0.55, 0x9fd5ec, -4.58, 0.93, BASIN.z, scene, { transparent: true, opacity: 0.75 });
stream.visible = false;

const DISH_TYPES = [
  { n: '접시', r: 0.06, build: g => { cyl(0.085, 0.075, 0.02, 0xffffff, 0, 0.01, 0, g); return 0.022; } },
  { n: '밥그릇', r: 0.045, build: g => { cyl(0.075, 0.04, 0.06, 0xf5d5c8, 0, 0.03, 0, g); return 0.062; } },
  { n: '머그컵', r: 0.03, build: g => { cyl(0.04, 0.04, 0.08, 0xbcd8ee, 0, 0.04, 0, g); put(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 16), mat(0xbcd8ee)), 0.055, 0.04, 0, g); return 0.082; } },
  { n: '프라이팬', r: 0.06, build: g => { cyl(0.085, 0.08, 0.03, 0x3a3e43, 0, 0.015, 0, g); rbox(0.12, 0.015, 0.025, 0x2f3438, 0.14, 0.02, 0, g, 0.006); return 0.032; } },
  { n: '유리컵', r: 0.025, build: g => { cyl(0.035, 0.03, 0.1, 0xdfeef2, 0, 0.05, 0, g, { transparent: true, opacity: 0.6 }); return 0.102; } }
];
const DISH_SPOTS = [[-4.62, -2.82], [-4.38, -2.78], [-4.5, -2.6], [-4.62, -2.4], [-4.38, -2.38]];
const TUMBLER_SPOTS = [[-4.5, -2.86], [-4.5, -2.68], [-4.5, -2.5], [-4.5, -2.32]];
function disposeObj(o) {
  o.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => {      // 팩처럼 면마다 재질이 다른 것도 있다
      if (mt.map && !mt.map.userData.shared) mt.map.dispose();                    // 여러 곳에서 같이 쓰는 제품 사진은 지우지 않는다
      mt.dispose();
    });
  });
}
function clearWashDishes() { washGroup.children.slice().forEach(c => { washGroup.remove(c); disposeObj(c); }); wash.dishes = []; }
function makeWashItem(i) {
  if (washKind === 'tumbler') {
    const names = getTumblers();
    return {
      n: names[i] || `텀블러 ${i + 1}`, rx: 0.07, rz: 0.02, build: gg => {
        cyl(0.045, 0.038, 0.2, TUMBLER_COLORS[i % 9], 0, 0.045, 0, gg, { metalness: 0.2, roughness: 0.35 }).rotation.z = Math.PI / 2;
        cyl(0.048, 0.048, 0.03, 0xffffff, 0.115, 0.045, 0, gg).rotation.z = Math.PI / 2;
        return 0.09;
      }
    };
  }
  return DISH_TYPES[i % DISH_TYPES.length];
}
function newWashRound() {
  clearWashDishes();
  const n = washKind === 'tumbler' ? Math.max(2, Math.min(4, mess.tumblers || 3)) : Math.max(2, Math.min(5, mess.dishes || 3));
  const spots = washKind === 'tumbler' ? TUMBLER_SPOTS : DISH_SPOTS;
  for (let i = 0; i < n; i++) {
    const t = makeWashItem(i), g = new THREE.Group(), top = t.build(g);
    g.position.set(spots[i][0], BASIN.y, spots[i][1]); if (washKind !== 'tumbler') g.rotation.y = Math.random() * 6;
    const rx = t.rx || t.r * 0.75, rz = t.rz || t.r * 0.75;
    const d = { g, top, rx, rz, name: t.n, dirt: [], foam: [], done: false, scrubs: 0, dry: 0, t0: 0 };
    for (let k = 0; k < 6; k++) {
      d.dirt.push(sph(0.013, [0x8a4b2a, 0xc0392b, 0xe0b04a, 0x5a3a22][k % 4], (Math.random() * 2 - 1) * rx, top + 0.004, (Math.random() * 2 - 1) * rz, g, [1, 0.35, 1]));
    }
    // 작은 그릇도 쉽게 문지를 수 있게, 눈에 안 보이는 넓은 판정 영역을 둔다
    const cr = Math.max(t.r || 0, t.rx || 0, 0.045) + 0.03;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, 0.1, 12), new THREE.MeshBasicMaterial({ visible: false }));
    col.position.y = 0.05; g.add(col);
    g.traverse(o => { if (o.isMesh) o.userData.dish = d; });
    washGroup.add(g); wash.dishes.push(d);
  }
  wash.left = wash.dishes.length; wash.start = Date.now(); wash.done = false;
  wash.hint = '세제를 짠 뒤 위에서 누른 채 문질러 보세요.';
}
function addFoam(d) {
  if (d.foam.length >= 14) return;
  d.foam.push(sph(0.01 + Math.random() * 0.012, 0xffffff, (Math.random() * 2 - 1) * d.rx, d.top + 0.012 + Math.random() * 0.012, (Math.random() * 2 - 1) * d.rz, d.g, [1, 1, 1], { transparent: true, opacity: 0.92 }));
}
function dropMesh(m) { if (m.parent) m.parent.remove(m); disposeObj(m); }
function washSoap() { wash.soap = 100; wash.hint = '스펀지에 세제가 묻었어요. 위에서 누른 채 문지르세요.'; toast('세제를 짰습니다'); washPanelSoon(); }
function washWater(on) { wash.water = on; stream.visible = on; waterPlane.visible = on; if (on) wash.hint = '물이 나옵니다. 거품 난 곳 위로 스펀지를 가져가 헹구세요.'; washPanelSoon(); }
function checkDish(d) {
  if (d.done || d.dirt.length || d.foam.length) return;
  d.done = true; d.t0 = performance.now(); wash.left--;
  toast(`${d.name} 깨끗해졌습니다`);
  if (wash.left === 0) {
    wash.done = true; wash.time = Math.round((Date.now() - wash.start) / 1000);
    const n = wash.dishes.length;
    if (washKind === 'tumbler') {
      mess.tumblers = Math.max(0, mess.tumblers - n); messGrace.tumblers = Date.now() + 180000;
      wetUntil = Date.now() + 180000; store.set('wetUntil', wetUntil); refreshTumblers();   // 씻은 텀블러는 건조대에서 물이 빠진다
    } else { mess.dishes = Math.max(0, mess.dishes - n); messGrace.dishes = Date.now() + 180000; }
    store.set('dishesWashed', store.get('dishesWashed', 0) + n);
    markClean(); saveMess(); refreshMess();
    toast(`${washKind === 'tumbler' ? '텀블러 씻기' : '설거지'} 끝! 싱크볼이 비었습니다 (${wash.time}초)`);
  }
}
const washRay = new THREE.Raycaster(), washPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.72), washPt = new THREE.Vector3();
let washDown = false, lastScrub = 0, washPanelTimer = 0;
function washAim(ev) {
  washRay.setFromCamera(new THREE.Vector2((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1), camera);
  return washRay;
}
function moveSponge(ev) {
  if (!washAim(ev).ray.intersectPlane(washPlane, washPt)) return;
  sponge.position.set(Math.max(-4.78, Math.min(-4.22, washPt.x)), 0.72, Math.max(-2.98, Math.min(-2.22, washPt.z)));
  sponge.rotation.y = Math.sin(performance.now() / 150) * 0.15;
}
function scrub(ev) {
  const hit = washAim(ev).intersectObjects(washGroup.children, true).find(h => h.object.userData.dish);
  if (!hit) return;
  const d = hit.object.userData.dish; if (d.done) return;
  const now = performance.now(); if (now - lastScrub < 45) return; lastScrub = now;
  if (washDown) {
    if (wash.soap > 0) {
      wash.soap = Math.max(0, wash.soap - 0.9); d.scrubs++; addFoam(d);
      if (d.dirt.length && d.scrubs % 3 === 0) dropMesh(d.dirt.pop());
      wash.hint = d.dirt.length ? '좋아요, 계속 문지르세요.' : '얼룩이 다 빠졌어요. 이제 물을 틀고 헹구세요.';
    } else if (d.dirt.length) {
      d.dry++; if (d.dry % 14 === 0) dropMesh(d.dirt.pop());
      wash.hint = '세제가 없으면 잘 안 닦여요. 세제를 짜 보세요.';
    }
  } else if (wash.water && d.foam.length) {
    for (let i = 0; i < 2 && d.foam.length; i++) dropMesh(d.foam.pop());
    wash.hint = d.foam.length ? '헹구는 중...' : '깨끗하게 헹궜어요.';
  }
  checkDish(d); washPanelSoon();
}
renderer.domElement.addEventListener('pointerdown', ev => {
  if (currentApp !== 'wash') return;
  washDown = true;
  const tool = washAim(ev).intersectObjects(washTools, false)[0];
  if (tool) { washDown = false; if (tool.object.userData.tool === 'soap') washSoap(); else washWater(!wash.water); return; }
  moveSponge(ev); scrub(ev);
});
renderer.domElement.addEventListener('pointermove', ev => {
  if (currentApp !== 'wash') return;
  moveSponge(ev); scrub(ev);
});
addEventListener('pointerup', () => { washDown = false; });
function washTick() {
  sinkPile.visible = !wash.on;
  if (!wash.on) return;
  spongeFoam.visible = wash.soap > 0;
  wash.dishes.forEach(d => {
    if (!d.done || !d.t0) return;
    const k = Math.min(1, (performance.now() - d.t0) / 600);
    d.g.position.y = BASIN.y + k * 0.14; d.g.scale.setScalar((1 - k) * (1 + 0.15 * Math.sin(Math.PI * k)));
    if (k >= 1) d.g.visible = false;
  });
}
function washPanelSoon() {
  if (washPanelTimer) return;
  washPanelTimer = setTimeout(() => { washPanelTimer = 0; if (currentApp === 'wash') washPanel(); }, 120);
}
function washPanel() {
  const tum = washKind === 'tumbler';
  const rows = wash.dishes.map(d => `<div class="item"><div>${esc(d.name)}</div><div class="when ${!d.done && d.dirt.length ? 'old' : ''}">${d.done ? '깨끗함' : d.dirt.length ? `얼룩 ${d.dirt.length}개` : `거품 ${d.foam.length}개 · 헹구기`}</div></div>`).join('');
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>${tum ? '텀블러 씻기' : '설거지'}</h2>
    <p class="sub">스펀지가 마우스를 따라옵니다. ① 세제를 짜고 ② ${tum ? '텀블러' : '그릇'} 위에서 누른 채 문지른 뒤 ③ 물을 틀고 거품 난 곳 위로 스펀지를 가져가 헹구세요. 3D 화면의 세제통과 수도꼭지를 직접 눌러도 됩니다.</p>
    <div class="presets">
      <button id="soap">세제 짜기<small>세제 ${Math.round(wash.soap)}%</small></button>
      <button id="water">${wash.water ? '물 잠그기' : '물 틀기'}<small>${wash.water ? '물이 나오는 중' : '꺼져 있음'}</small></button>
    </div>
    <div class="bar"><i style="width:${wash.soap}%"></i></div>
    <h3>남은 ${tum ? '텀블러' : '그릇'} ${wash.left} / ${wash.dishes.length}</h3>
    <div class="list">${rows}</div>
    <p class="sub" style="margin-top:12px">${wash.done ? `다 닦았습니다. 걸린 시간 ${wash.time}초 · 지금까지 닦은 개수 ${store.get('dishesWashed', 0)}개` : wash.hint}</p>
    <div class="row"><button class="primary" id="again">${wash.done ? '한 번 더' : `${tum ? '텀블러' : '그릇'} 새로 쌓기`}</button></div>`;
}
APPS.wash = () => {
  beginFocus(new THREE.Vector3(-2.3, 2.3, -2.6), new THREE.Vector3(-4.5, 0.7, -2.6));
  overlay.classList.add('side');
  controls.enabled = false;
  if (!wash.on) { wash.on = true; newWashRound(); }
  sponge.visible = true;
  washPanel();
  panel.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'x') { closeApp(); return; }
    if (b.id === 'soap') washSoap();
    if (b.id === 'water') washWater(!wash.water);
    if (b.id === 'again') { newWashRound(); washPanel(); }
  };
  cleanup = () => {
    panel.onclick = null; overlay.classList.remove('side'); controls.enabled = !fps.on;
    sponge.visible = false; washWater(false); clearWashDishes(); wash.on = false; washDown = false;
    endFocus();
  };
};

/* ---------- 컵라면: 뜯기 → 스프 → 물 붓기 → 3분 → 젓가락 가르기 → 먹기 → 버리기 ---------- */
const ramen = { phase: 'idle', t0: 0, waitEnd: 0, bites: 0, chops: false };
const ramenHudEl = document.getElementById('ramenhud');
const ramenGroup = new THREE.Group();
ramenGroup.position.set(2.05, 0.93, CZ + 0.05); ramenGroup.visible = false;
scene.add(ramenGroup);
const rCup = new THREE.Group(); rCup.scale.setScalar(1.5); ramenGroup.add(rCup);   // 눈에 잘 띄도록 컵을 크게
cyl(0.062, 0.045, 0.11, 0xe86f5a, 0, 0.055, 0, rCup);
cyl(0.0625, 0.0585, 0.03, 0xf6e7b0, 0, 0.07, 0, rCup);
const rNoodle = cyl(0.056, 0.056, 0.012, 0xf0d890, 0, 0.098, 0, rCup);
const rWater = cyl(0.054, 0.05, 0.08, 0xc98a3a, 0, 0.055, 0, rCup, { transparent: true, opacity: 0.85 });
const rLidPivot = new THREE.Group(); rLidPivot.position.set(-0.062, 0.112, 0); rCup.add(rLidPivot);
cyl(0.064, 0.064, 0.006, 0xf3d9a8, 0.064, 0, 0, rLidPivot);
rbox(0.012, 0.006, 0.02, 0xe86f5a, 0.125, 0.004, 0, rLidPivot, 0.002);
const rPackets = [rbox(0.035, 0.004, 0.045, 0xd94e4e, 0, 0.3, 0, ramenGroup, 0.001), rbox(0.035, 0.004, 0.045, 0xe3e6e8, 0.03, 0.3, 0.02, ramenGroup, 0.001)];
const rVeg = [0x5aa05a, 0xe0873a, 0x5aa05a, 0xe0873a, 0x8ac06a, 0xd96a4a].map((c, i) => sph(0.009, c, Math.cos(i * 1.1) * 0.03, 0.106, Math.sin(i * 1.1) * 0.03, rCup));
const rStream = cyl(0.008, 0.008, 0.2, 0x9fd5ec, 0.003, 0.19, 0, ramenGroup, { transparent: true, opacity: 0.8 });
const rSteam = [0, 1, 2, 3, 4].map(() => sph(0.025, 0xffffff, 0, 0.15, 0, ramenGroup, [1, 1, 1], { transparent: true, opacity: 0, depthWrite: false }));
const rChops = new THREE.Group();
[0, 1].forEach(i => { cyl(0.004, 0.003, 0.22, 0xd9b27a, 0.12, 0.006, 0.09 + i * 0.014, rChops).rotation.z = Math.PI / 2 - 0.06 * i; });
rChops.visible = false; ramenGroup.add(rChops);
const easeIO = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const clamp01 = k => Math.max(0, Math.min(1, k));
function startRamen() {
  if (ramen.phase !== 'idle') { toast('이미 라면을 만드는 중입니다'); return; }
  Object.assign(ramen, { phase: 'prep', t0: performance.now(), bites: 0, chops: false });
  ramenGroup.visible = true; ramenGroup.scale.setScalar(0.01);
  rNoodle.visible = true; rNoodle.scale.set(1, 1, 1); rChops.visible = false; rLidPivot.rotation.z = 0;
  rVeg.forEach(v => { v.visible = false; });
  beginFocus(new THREE.Vector3(3.05, 1.55, -2.2), new THREE.Vector3(2.05, 1.02, CZ));
  toast('컵라면을 꺼냈습니다'); ramenHudUpdate();
}
function ramenTick() {
  if (ramen.phase === 'idle') return;
  const now = performance.now();
  let level = 0;
  if (ramen.phase === 'prep') {
    const t = (now - ramen.t0) / 1000;
    ramenGroup.scale.setScalar(0.01 + 0.99 * easeIO(clamp01(t / 0.7)));
    rLidPivot.rotation.z = t < 7.6 ? 2.4 * easeIO(clamp01((t - 0.7) / 1.3)) : 2.4 - 2.3 * easeIO(clamp01((t - 7.6) / 0.8));
    rPackets.forEach((p, i) => {
      const k = (t - (2.0 + i * 0.6)) / 0.7;
      p.visible = k > 0 && k < 1; p.position.y = 0.3 - 0.12 * easeIO(clamp01(k));
    });
    rVeg.forEach(v => { v.visible = t > 3.1; });
    const m = t < 3.4 ? 0 : t < 4.6 ? easeIO((t - 3.4) / 1.2) : t < 6.6 ? 1 : t < 7.6 ? 1 - easeIO(t - 6.6) : 0;
    kettle.position.set(1.65 + 0.09 * m, 0.93 + 0.11 * m, CZ); kettle.rotation.z = -0.6 * m;
    setGlow('kettle', t > 3.4 && t < 7.6);
    rStream.visible = t >= 4.6 && t < 6.6;
    level = t >= 4.6 ? easeIO(clamp01((t - 4.6) / 2)) : 0;
    if (t >= 8.4) { ramen.phase = 'wait'; ramen.waitEnd = now + 180000; toast('뚜껑을 덮었습니다. 3분 기다리세요'); ramenHudUpdate(); }
  } else {
    level = 1; rStream.visible = false;
    if (ramen.phase === 'wait') {
      rLidPivot.rotation.z += (0.1 - rLidPivot.rotation.z) * 0.2;
      if (now >= ramen.waitEnd) { ramen.phase = 'ready'; toast('라면이 다 익었습니다!'); ramenHudUpdate(); }
    } else rLidPivot.rotation.z += (2.4 - rLidPivot.rotation.z) * 0.12;
  }
  rWater.scale.y = Math.max(0.001, level); rWater.position.y = 0.015 + 0.04 * level;
  const hot = ramen.phase === 'wait' || ramen.phase === 'ready' || ramen.phase === 'eat';
  rSteam.forEach((m, i) => {
    const p = ((now / 1000) * 0.45 + i / 5) % 1;
    m.visible = hot; m.position.set(Math.sin(p * 6 + i) * 0.03, 0.2 + p * 0.26, Math.cos(p * 5 + i) * 0.03); m.material.opacity = (1 - p) * 0.3;
  });
  ramenHudUpdate();
}
function ramenHudUpdate() {
  const p = ramen.phase;
  const key = `${p}|${ramen.chops}|${ramen.bites}`;
  if (key !== ramenHudUpdate.last) {            // 단계가 바뀔 때만 다시 그린다 (매초 다시 그리면 누르는 순간 버튼이 사라진다)
    let html = '';
    if (p === 'prep') html = '<span>컵라면을 만드는 중...</span>';
    else if (p === 'wait') html = `<span>익는 중 <b id="rtime"></b></span><button data-r="chops">${ramen.chops ? '젓가락 준비됨' : '젓가락 가르기'}</button><button data-r="fast">빨리 감기</button>`;
    else if (p === 'ready' || p === 'eat') html = ramen.chops ? `<span>다 익었어요</span><button class="primary" data-r="bite">한 입 먹기 (${ramen.bites}/8)</button>` : '<span>다 익었어요</span><button class="primary" data-r="chops">젓가락 가르기</button>';
    else if (p === 'done') html = '<span>잘 먹었습니다</span><button class="primary" data-r="throw">그릇 버리기</button>';
    ramenHudEl.innerHTML = html; ramenHudEl.style.display = html ? 'flex' : 'none'; ramenHudUpdate.last = key;
  }
  const rt = document.getElementById('rtime');
  if (rt) rt.textContent = mmss(ramen.waitEnd - performance.now());
}
function ramenBite() {
  if (!ramen.chops) { toast('젓가락부터 갈라야 해요'); openApp('chopsticks'); return; }
  ramen.bites++;
  const k = ramen.bites / 8;
  rNoodle.scale.set(1 - k * 0.92, 1 - k * 0.6, 1 - k * 0.92);
  toast(['후루룩!', '앗 뜨거', '면이 쫄깃하다', '국물이 진하다', '한 젓가락 더', '거의 다 먹었다', '마지막 면발', '잘 먹었습니다'][Math.min(7, ramen.bites - 1)]);
  if (ramen.bites >= 8) { ramen.phase = 'done'; rNoodle.visible = false; } else ramen.phase = 'eat';
  ramenHudUpdate();
}
function ramenThrow() {
  ramen.phase = 'idle'; ramenGroup.visible = false; rChops.visible = false;
  mess.trash = Math.min(MESS_CAP.trash, mess.trash + 1); saveMess(); refreshMess();
  toast('컵라면 용기를 쓰레기통에 버렸습니다'); endFocus(); ramenHudUpdate();
}
ramenHudEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.r === 'chops') openApp('chopsticks');
  if (b.dataset.r === 'fast') { ramen.waitEnd = performance.now() + 1500; }
  if (b.dataset.r === 'bite') ramenBite();
  if (b.dataset.r === 'throw') ramenThrow();
});

/* 젓가락 가르기 미니게임 */
APPS.chopsticks = () => {
  panel.innerHTML = `
    <button class="close" id="x">닫기</button>
    <h2>젓가락 가르기</h2>
    <p class="sub">나무젓가락 윗부분(밝은 곳)을 누른 채 <b>가운데 선을 따라 아래로 천천히</b> 끌어내리세요. 너무 빠르면 부러지고, 선에서 벗어나면 한쪽이 가늘게 갈라집니다.</p>
    <canvas id="cs" width="300" height="330" style="width:100%;max-width:300px;touch-action:none;display:block;margin:0 auto 10px;background:var(--field);border:1px solid var(--line);border-radius:8px"></canvas>
    <p class="sub" id="csmsg">윗부분을 누르고 시작하세요.</p>
    <div class="row"><button id="csnew">새 젓가락</button></div>`;
  const cv = $('#cs'), g = cv.getContext('2d'), msg = $('#csmsg');
  const CX = 150, TOP = 50, JOINT = 82, BOT = 300, HALF = 34;
  let pts = [], state = 'ready', t0 = 0, spread = 0, result = null, raf = 0, closeTimer = 0;
  const boundary = y => {
    if (!pts.length) return CX;
    let best = pts[0];
    for (const p of pts) { if (p[1] <= y) best = p; }
    return best[0];
  };
  function wood(x0, x1, y0, y1) {
    const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#e1c08a'); gr.addColorStop(0.5, '#efd8a6'); gr.addColorStop(1, '#d9b57a');
    g.fillStyle = gr;
  }
  function piece(side, off) {
    g.save(); g.translate(side * off, 0);
    wood(CX - HALF, CX + HALF);
    g.beginPath();
    if (side < 0) { g.moveTo(CX - HALF, TOP); g.lineTo(boundary(TOP), TOP); for (let y = TOP; y <= BOT; y += 3) g.lineTo(boundary(y), y); g.lineTo(CX - HALF, BOT); }
    else { g.moveTo(CX + HALF, TOP); g.lineTo(boundary(TOP), TOP); for (let y = TOP; y <= BOT; y += 3) g.lineTo(boundary(y), y); g.lineTo(CX + HALF, BOT); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,80,30,0.25)'; g.lineWidth = 1; g.stroke();
    g.restore();
  }
  function draw() {
    g.clearRect(0, 0, 300, 330);
    if (state === 'done') { piece(-1, spread); piece(1, spread); return; }
    wood(CX - HALF, CX + HALF); g.fillRect(CX - HALF, TOP, HALF * 2, BOT - TOP);
    g.strokeStyle = 'rgba(120,80,30,0.2)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(CX - HALF + 10 + i * 10, TOP); g.lineTo(CX - HALF + 10 + i * 10, BOT); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(CX - HALF, TOP, HALF * 2, JOINT - TOP);          // 이어진 윗부분
    g.setLineDash([5, 5]); g.strokeStyle = 'rgba(60,110,100,0.7)'; g.beginPath(); g.moveTo(CX, JOINT); g.lineTo(CX, BOT); g.stroke(); g.setLineDash([]);
    if (pts.length > 1) { g.strokeStyle = '#6b3a1a'; g.lineWidth = 2.4; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
  }
  function pos(ev) { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * (cv.width / r.width), (ev.clientY - r.top) * (cv.height / r.height)]; }
  cv.addEventListener('pointerdown', ev => {
    if (state !== 'ready') return;
    const [x, y] = pos(ev);
    if (y < TOP - 10 || y > JOINT + 10 || Math.abs(x - CX) > HALF + 10) { msg.textContent = '윗부분(밝은 곳)에서 시작해 주세요.'; return; }
    try { cv.setPointerCapture(ev.pointerId); } catch { /* 합성 이벤트에서는 무시 */ }
    state = 'drag'; t0 = performance.now(); pts = [[x, y]]; msg.textContent = '천천히, 가운데 선을 따라...'; draw();
  });
  cv.addEventListener('pointermove', ev => {
    if (state !== 'drag') return;
    const [x, y] = pos(ev);
    if (y >= pts[pts.length - 1][1]) pts.push([x, y]);      // 위로 되돌아가는 움직임은 무시
    draw();
  });
  const finish = () => {
    if (state !== 'drag') return;
    const maxY = Math.max(...pts.map(p => p[1]));
    if (maxY < BOT - 14) { state = 'ready'; pts = []; msg.textContent = '끝까지 내려야 해요. 다시 시도하세요.'; draw(); return; }
    const dur = performance.now() - t0, dev = Math.max(...pts.filter(p => p[1] > JOINT).map(p => Math.abs(p[0] - CX)), 0);
    result = dur < 700 ? 'broke' : dev <= 10 ? 'perfect' : dev <= 22 ? 'ok' : 'bad';
    state = 'done'; spread = 0;
    msg.textContent = { broke: '와지끈! 너무 빨라서 부러졌어요. 새 젓가락을 뜯으세요.', bad: '삐뚤게 갈라졌어요. 한쪽이 너무 가늘어요. 새 젓가락으로 다시!', ok: '살짝 삐뚤지만 쓸 만하게 갈라졌어요!', perfect: '완벽하게 반으로 갈랐어요!' }[result];
    const t1 = performance.now();
    const step = () => { spread = Math.min(26, (performance.now() - t1) / 20); draw(); if (spread < 26) raf = requestAnimationFrame(step); };
    step();
    if (result === 'perfect' || result === 'ok') {
      ramen.chops = true; rChops.visible = true; toast('젓가락 준비 완료'); ramenHudUpdate();
      closeTimer = setTimeout(() => { if (currentApp === 'chopsticks') closeApp(); }, 1800);
    }
  };
  cv.addEventListener('pointerup', finish);
  cv.addEventListener('pointercancel', finish);
  $('#csnew').onclick = () => { cancelAnimationFrame(raf); clearTimeout(closeTimer); state = 'ready'; pts = []; spread = 0; msg.textContent = '새 젓가락입니다. 윗부분을 누르고 시작하세요.'; draw(); };
  panel.onclick = e => { const b = e.target.closest('button'); if (b && b.id === 'x') closeApp(); };
  cleanup = () => { cancelAnimationFrame(raf); clearTimeout(closeTimer); panel.onclick = null; };
  window.__chopsInfo = () => ({ state, result });
  draw();
};

/* ---------- 1인칭 시점 (걸어 다니며 물건을 누른다) ---------- */
const fps = { on: false, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, vx: 0, vz: 0, pos: new THREE.Vector3(-0.8, 1.55, 2.0), keys: {}, locked: false, dragging: false, lx: 0, ly: 0, saved: null };
const FPS_R = 0.28;
// 1인칭일 때만 나타나는 나머지 벽과 천장 (열려 있는 쪽이 허공으로 보이지 않게)
const fpsShell = new THREE.Group();
[[0.2, 4.2, D, 0xe7e3da, X1 + 0.1, 2.1, RCZ], [W, 4.2, 0.2, 0xefebe3, RCX, 2.1, Z1 + 0.1], [W + 0.4, 0.2, D + 0.4, 0xf4f2ee, RCX, 4.3, RCZ]].forEach(([w, h, d, c, x, y, z]) => {
  const m = rbox(w, h, d, c, x, y, z, fpsShell, 0.01); m.castShadow = false; m.receiveShadow = false;
  if (y > 4) m.material = new THREE.MeshBasicMaterial({ color: 0xece9e3 });                 // 천장은 위에서 빛이 안 들어오니 밝은 색으로 고정
});
const panelMat = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
[-3, 0.5, 4, 7.5].forEach(x => [-2, 1, 4].forEach(z => {                  // 천장 매입등 패널 12개
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), panelMat); lp.rotation.x = Math.PI / 2; lp.position.set(x, 4.18, z); fpsShell.add(lp);
  rbox(1.22, 0.03, 1.22, 0xd8d5cf, x, 4.205, z, fpsShell, 0.005).castShadow = false;
}));
fpsShell.visible = false;
scene.add(fpsShell);
const FPS_BLOCKS = [[-2.85, 3.05, -4.0, -2.8], [3.0, 4.95, -3.95, -3.1], [-5.0, -3.95, -3.1, -0.8],
  [-4.9, -3.45, -0.75, 0.95], [0.45, 1.95, 0.6, 1.6], [2.65, 4.15, 0.6, 1.6], [4.1, 4.7, 2.8, 3.4],
  [6.4, 7.6, -3.95, -2.95], [8.85, 9.95, -0.2, 3.3], [8.9, 9.7, -1.6, -0.8]];   // 가구가 차지하는 자리 [x0, x1, z0, z1]
function fpsBlocked(x, z) {
  if (x < -4.6 || x > 9.6 || z > 5.6 || z < -3.6) return true;
  return FPS_BLOCKS.some(([x0, x1, z0, z1]) => x > x0 - FPS_R && x < x1 + FPS_R && z > z0 - FPS_R && z < z1 + FPS_R);
}
const fpsBtn = document.getElementById('fpsbtn'), crossEl = document.getElementById('cross'), dpadEl = document.getElementById('dpad'), hintEl = document.getElementById('hint');
const HINT_ORBIT = hintEl.innerHTML;
const HINT_FPS = 'W A S D 이동 · Shift 달리기 · 화면을 클릭하거나 드래그해서 둘러보기<br>가리킨 물건은 클릭 또는 E · F를 누르면 1인칭을 나갑니다';
function applyFpsCamera() { camera.position.copy(fps.pos); camera.rotation.set(fps.pitch, fps.yaw, 0, 'YXZ'); }
function enterFps() {
  if (fps.on) return;
  closeApp(); camAnim = null; focusActive = false;
  fps.saved = { pos: camera.position.clone(), target: controls.target.clone() };
  Object.assign(fps, { on: true, locked: false, dragging: false, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, vx: 0, vz: 0 });
  controls.enabled = false; controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity; controls.maxPolarAngle = Math.PI;
  camera.fov = 72; camera.updateProjectionMatrix();
  fpsShell.visible = true;
  applyFpsCamera();
  fpsBtn.textContent = '1인칭 나가기'; crossEl.style.display = 'block'; hintEl.innerHTML = HINT_FPS;
  if (matchMedia('(pointer: coarse)').matches) dpadEl.style.display = 'grid';
  toast('1인칭 시점입니다. 화면을 클릭하면 마우스로 둘러볼 수 있어요');
}
function exitFps() {
  if (!fps.on) return;
  closeApp(); camAnim = null; focusActive = false;
  fps.on = false; fps.keys = {};
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* 무시 */ }
  camera.fov = 48; camera.updateProjectionMatrix();
  fpsShell.visible = false;
  camera.position.copy(fps.saved.pos); controls.target.copy(fps.saved.target);
  controls.enabled = true; controls.minAzimuthAngle = -0.15; controls.maxAzimuthAngle = Math.PI / 2 + 0.15; controls.maxPolarAngle = Math.PI / 2.05;
  fpsBtn.textContent = '1인칭'; crossEl.style.display = 'none'; dpadEl.style.display = 'none'; hintEl.innerHTML = HINT_ORBIT;
  labelEl.style.display = 'none';
  controls.update();
}
fpsBtn.addEventListener('click', () => (fps.on ? exitFps() : enterFps()));
function fpsInteract(ev) {
  const hit = pick(ev, 3.8);
  if (!hit) return;
  if (hit.userData.act) hit.userData.act(); else if (hit.userData.id !== currentApp) openApp(hit.userData.id);
}
// 시선은 목표값(tYaw/tPitch)을 따라가며 부드럽게 움직이고, 감도는 예전보다 훨씬 빠르게 했다
const LOOK = 0.0062;
function fpsLook(dx, dy) {
  dx = Math.max(-160, Math.min(160, dx)); dy = Math.max(-160, Math.min(160, dy));
  fps.tYaw -= dx * LOOK; fps.tPitch = Math.max(-1.35, Math.min(1.35, fps.tPitch - dy * LOOK));
}
renderer.domElement.addEventListener('pointerdown', ev => {
  if (!fps.on || currentApp) return;
  fps.dragging = true; fps.lx = ev.clientX; fps.ly = ev.clientY;
  if (!fps.locked && ev.pointerType === 'mouse' && renderer.domElement.requestPointerLock) {
    try { const r = renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* 샌드박스에서 막히면 드래그로 둘러본다 */ }
  }
});
renderer.domElement.addEventListener('pointermove', ev => {
  if (!fps.on || currentApp || focusActive || camAnim) return;
  if (fps.locked) fpsLook(ev.movementX || 0, ev.movementY || 0);
  else if (fps.dragging) { fpsLook(ev.clientX - fps.lx, ev.clientY - fps.ly); fps.lx = ev.clientX; fps.ly = ev.clientY; }
});
addEventListener('pointerup', () => { fps.dragging = false; });
document.addEventListener('pointerlockchange', () => { fps.locked = document.pointerLockElement === renderer.domElement; });
const KEYMAP = { w: 'w', arrowup: 'w', s: 's', arrowdown: 's', a: 'a', arrowleft: 'a', d: 'd', arrowright: 'd', shift: 'shift' };
addEventListener('keydown', ev => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const k = ev.key.toLowerCase();
  if (k === 'f') { fps.on ? exitFps() : enterFps(); return; }
  if (!fps.on) return;
  if (k === 'e') { if (!inspectActive()) fpsInteract({ clientX: innerWidth / 2, clientY: innerHeight / 2 }); return; }
  if (KEYMAP[k]) { fps.keys[KEYMAP[k]] = true; ev.preventDefault(); }
});
addEventListener('keyup', ev => { const k = ev.key.toLowerCase(); if (KEYMAP[k]) fps.keys[KEYMAP[k]] = false; });
dpadEl.querySelectorAll('button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); fps.keys[k] = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { fps.keys[k] = false; }));
});
let fpsHoverAt = 0;
function fpsStep(dt) {
  dt = Math.min(dt, 0.05);
  const lk = 1 - Math.exp(-dt * 22);                       // 시선 부드럽게 따라가기
  fps.yaw += (fps.tYaw - fps.yaw) * lk; fps.pitch += (fps.tPitch - fps.pitch) * lk;
  if (!currentApp) {
    const k = fps.keys;
    let fx = (k.d ? 1 : 0) - (k.a ? 1 : 0), fz = (k.s ? 1 : 0) - (k.w ? 1 : 0);
    const len = Math.hypot(fx, fz) || 1, top = k.shift ? 5.0 : 3.1;
    const c = Math.cos(fps.yaw), sn = Math.sin(fps.yaw);
    const wx = (fx / len) * c + (fz / len) * sn, wz = (-fx / len) * sn + (fz / len) * c;
    const a = 1 - Math.exp(-dt * ((fx || fz) ? 11 : 14));      // 가속은 부드럽게, 멈출 때는 살짝 미끄러지듯
    fps.vx += (wx * ((fx || fz) ? top : 0) - fps.vx) * a; fps.vz += (wz * ((fx || fz) ? top : 0) - fps.vz) * a;
    if (Math.abs(fps.vx) < 0.01) fps.vx = 0; if (Math.abs(fps.vz) < 0.01) fps.vz = 0;
    const nx = fps.pos.x + fps.vx * dt, nz = fps.pos.z + fps.vz * dt;
    if (!fpsBlocked(nx, fps.pos.z)) fps.pos.x = nx; else fps.vx = 0;
    if (!fpsBlocked(fps.pos.x, nz)) fps.pos.z = nz; else fps.vz = 0;
  }
  applyFpsCamera();
  if (fps.locked && !currentApp && performance.now() - fpsHoverAt > 120) {     // 마우스를 잠갔을 때는 화면 중앙 십자선으로 가리킨 물건을 알려 준다
    fpsHoverAt = performance.now();
    const o = pick({ clientX: innerWidth / 2, clientY: innerHeight / 2 }, 3.8);
    if (o) { labelEl.style.display = 'block'; labelEl.textContent = o.userData.label; labelEl.style.left = `${innerWidth / 2}px`; labelEl.style.top = `${innerHeight / 2 + 58}px`; }
    else labelEl.style.display = 'none';
  }
}

/* ---------- 사물 눌러 보기: 마우스를 올리면 이름, 누르면 확대해서 어떻게 할지 고른다 ---------- */
const itemTargets = { fridge: [], freezer: [], sink: [], snack: [], board: [] };   // 지금 눌러 볼 수 있는 사물의 메쉬
const tagList = { fridge: [], freezer: [], sink: [] };                   // 사물에 붙은 이름표(메모지)
const leaving = [];                                                      // 꺼내지는 중인 사물
const pulled = [];                                                       // 손에 든 것처럼 앞으로 나온 사물
let hoverItem = null, itemFocus = null, restoreBar = null;
const ibarEl = document.getElementById('ibar');
let ibarHandlers = null, barKind = null;
const tmpV = new THREE.Vector3();

function newItem(parent, kind, i) { const g = new THREE.Group(); g.userData.info = { kind, i }; parent.add(g); return g; }
function addTag(g, owner, tag, x, y, z) {
  tag.position.set(x, y, z); tag.userData.isTag = true; tag.material.transparent = true; tag.material.opacity = 0; tag.visible = false;
  g.add(tag); g.userData.tag = tag; tagList[owner].push(tag);
}
function finishItem(g, list) { g.traverse(o => { if (o.isMesh && !o.userData.isTag) { o.userData.itemGroup = g; list.push(o); } }); }
const inspectActive = () => currentApp === 'fridge' || currentApp === 'freezer' || currentApp === 'sink' || currentApp === 'snack' || currentApp === 'board';
const itemList = () => itemTargets[currentApp] || [];
function pickItem(ev, maxDist = Infinity) {
  const list = itemList();
  if (!list.length) return null;
  pointer.x = (ev.clientX / innerWidth) * 2 - 1; pointer.y = -(ev.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  for (const h of raycaster.intersectObjects(list, false)) {
    if (h.distance > maxDist) break;
    let o = h.object, vis = true;
    while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
    if (!vis) continue;
    const g = h.object.userData.itemGroup;
    if (g && !g.userData.leaving) return g;
  }
  return null;
}
function itemData(g) {
  const { kind, i } = g.userData.info;
  if (kind === 'box') return getBoxes()[i];
  if (kind === 'cup') return getCups()[i];
  if (kind === 'frz') return getFreezer()[i];
  if (kind === 'drink') { const d = getDrinks()[i]; return d ? { name: d[0], qty: d[1] } : null; }
  if (kind === 'tumbler') { const t = getTumblers()[i]; return t ? { name: t } : null; }
  if (kind === 'note') { const t = suggestions()[i]; return t ? { name: t } : null; }
  return null;
}
function itemSub(g) {
  const d = itemData(g); if (!d) return '';
  const old = d.at && Date.now() - d.at > (g.userData.info.kind === 'frz' ? FRZ_OLD : DAY);
  return `${d.at ? `${ago(d.at)} 넣음 · ${fmtAt(d.at)}${old ? ' · 오래됨' : ''}` : ''}${d.qty !== undefined ? `${d.qty}개 남음` : ''}`;
}
function itemLabel(g) {
  const { kind, i } = g.userData.info;
  if (kind === 'drawer') return `${SNACK_NAMES[i]} 서랍 · ${getSnacks()[i]}개 — ${snackIdx === i ? '눌러서 닫기' : '눌러서 열기'}`;
  if (kind === 'snack') return `${SNACK_NAMES[i]} · ${getSnacks()[i]}개 남음 — 눌러서 먹기`;
  if (kind === 'order') return `${SNACK_SHORT[i]}이(가) 부족해요 — 눌러서 쿠팡 모의 주문`;
  const d = itemData(g); if (!d) return '';
  return `${d.name}${itemSub(g) ? ` · ${itemSub(g)}` : ''} — 눌러서 확대`;
}
function inspectHover(ev) {
  if (itemFocus) { labelEl.style.display = 'none'; return; }
  const g = pickItem(ev);
  if (g !== hoverItem) {
    if (hoverItem && !hoverItem.userData.leaving) hoverItem.scale.setScalar(1);
    hoverItem = g;
    if (g) g.scale.setScalar(1.07);
  }
  renderer.domElement.style.cursor = g ? 'pointer' : 'grab';
  if (g) { labelEl.style.display = 'block'; labelEl.textContent = itemLabel(g); labelEl.style.left = ev.clientX + 'px'; labelEl.style.top = ev.clientY + 'px'; }
  else labelEl.style.display = 'none';
}
function leave(g, done) {
  g.userData.leaving = true; hoverItem = null; labelEl.style.display = 'none';
  const pi = pulled.indexOf(g); if (pi >= 0) pulled.splice(pi, 1);
  leaving.push({ g, t0: performance.now(), s0: g.scale.x, done });
}
function leavingTick(dt) {
  for (let i = leaving.length - 1; i >= 0; i--) {
    const L = leaving[i], k = Math.min(1, (performance.now() - L.t0) / 380);
    L.g.scale.setScalar(Math.max(0.01, (1 - k) * L.s0)); L.g.position.y += dt * 0.3;
    if (k >= 1) { leaving.splice(i, 1); L.done(); }
  }
}
function setPull(g, goal) {
  if (g.userData.base0 === undefined) { g.userData.base0 = g.position[g.userData.axis || 'x']; g.userData.baseY = g.position.y; }
  g.userData.pullGoal = goal;
  if (!pulled.includes(g)) pulled.push(g);
}
function pulledTick(dt) {
  const k = 1 - Math.exp(-dt * 9);
  for (let i = pulled.length - 1; i >= 0; i--) {
    const g = pulled[i];
    if (!g.parent) { pulled.splice(i, 1); continue; }
    const cur = g.userData.pull || 0, goal = g.userData.pullGoal || 0, nx = cur + (goal - cur) * k;
    const zax = g.userData.axis === 'z';
    g.userData.pull = nx; g.position[g.userData.axis || 'x'] = g.userData.base0 + nx; g.scale.setScalar(1 + nx * (zax ? 3.5 : 2.7));     // 앞으로 나와 크게 떠 있는 느낌
    if (!zax) g.position.y = g.userData.baseY + nx * 0.25;
    if (goal === 0 && nx < 0.002) { g.position[g.userData.axis || 'x'] = g.userData.base0; if (g.userData.axis !== 'z') g.position.y = g.userData.baseY; g.scale.setScalar(1); g.userData.pull = 0; pulled.splice(i, 1); }
  }
}
// 이름표는 확대해서 보거나(냉장실/냉동실/싱크대), 가까이 다가가거나(1인칭), 마우스를 올렸을 때만 나타난다. 확대한 사물의 이름표는 더 크게 보인다
function tagTick(dt) {
  const k = 1 - Math.exp(-dt * 8);
  const zoom = { fridge: currentApp === 'fridge' && !camAnim, freezer: currentApp === 'freezer' && !camAnim, sink: currentApp === 'sink' && !camAnim };
  const focusTag = itemFocus && itemFocus.g && itemFocus.g.userData.tag;
  for (const owner of ['fridge', 'freezer', 'sink']) {
    tagList[owner].forEach(t => {
      let want = zoom[owner] ? 1 : 0;
      if (!want && fps.on) { t.getWorldPosition(tmpV); if (tmpV.distanceTo(camera.position) < 1.8) want = 1; }
      if (hoverItem && hoverItem.userData.tag === t) want = 1;
      t.material.opacity += (want - t.material.opacity) * k;
      t.visible = t.material.opacity > 0.03;
      const ps = t.parent ? t.parent.scale.x : 1;
      const sc = t === focusTag ? (itemFocus.memo ? 2.1 : 0.85) / Math.max(1, ps) : 1;     // 사물이 커져도 메모지는 작게, '메모지 보기'를 누르면 크게
      t.scale.setScalar(t.scale.x + (sc - t.scale.x) * k);
    });
  }
}

// ---- 사물을 누르면: 그 사물로 확대하고, 어떻게 할지 고르게 한다
function itemBarCfg(g) {
  const { kind } = g.userData.info, d = itemData(g) || { name: '' };
  const hasTag = !!g.userData.tag;
  const buttons = kind === 'box' ? [['eat', '꺼내서 먹기', true], ['heat', '전자레인지에 데우기'], ['bin', '버리기']]
    : kind === 'cup' ? [['drink', '꺼내서 마시기', true], ['bin', '버리기']]
    : kind === 'frz' ? [['eat', '꺼내서 먹기', true], ['bin', '버리기']]
    : kind === 'drink' ? [['drink', '꺼내서 마시기', true]]
    : kind === 'note' ? [['take', '떼기', true]]
    : [['take', '가져가기', true]];
  if (hasTag) buttons.splice(1, 0, ['memo', '메모지 보기']);
  return { title: d.name, info: itemSub(g), buttons, closeLabel: kind === 'note' ? '그대로 두기' : '제자리에 두기', onClose: () => exitItemFocus(), onButton: act => (act === 'memo' ? toggleMemo(g) : itemAction(g, act)) };
}
function toggleMemo(g) {
  const f = itemFocus, t = g.userData.tag; if (!f || !t) return;
  f.memo = !f.memo;
  const el = ibarEl.querySelector('[data-act="memo"]'); if (el) el.textContent = f.memo ? '사물 보기' : '메모지 보기';
  if (f.memo) { const w = t.getWorldPosition(new THREE.Vector3()); flyTo(w.clone().add(new THREE.Vector3(0.62, 0.03, 0.02)), w, 550); }
  else flyTo(f.view.pos, f.view.target, 550);
}
function enterItemFocus(g) {
  hoverItem = null; labelEl.style.display = 'none'; g.scale.setScalar(1);
  if (!itemFocus) itemFocus = { ret: { pos: camera.position.clone(), target: controls.target.clone() } };
  itemFocus.g = g; itemFocus.memo = false;
  const p = g.getWorldPosition(new THREE.Vector3());
  if (g.userData.axis === 'z') { itemFocus.view = { pos: p.clone().add(new THREE.Vector3(0.05, 0.05, 0.85)), target: p.clone().add(new THREE.Vector3(0, 0, 0.05)) }; setPull(g, 0.1); }   // 게시판 메모는 정면에서
  else { itemFocus.view = { pos: p.clone().add(new THREE.Vector3(1.45, 0.34, 0.25)), target: p.clone().add(new THREE.Vector3(0.34, 0.05, 0)) }; setPull(g, 0.34); }   // 앞으로 나와 크게 떠 있는 사물을 본다
  flyTo(itemFocus.view.pos, itemFocus.view.target, 650);
  showBar(itemBarCfg(g));
}
function exitItemFocus(skipPull) {
  if (!itemFocus) return;
  const f = itemFocus; itemFocus = null;
  if (!skipPull && f.g && f.g.parent) setPull(f.g, 0);
  flyTo(f.ret.pos, f.ret.target, 650);
  if (restoreBar) restoreBar();
}
function resetItemFocus() { if (itemFocus && itemFocus.g && itemFocus.g.parent) setPull(itemFocus.g, 0); itemFocus = null; restoreBar = null; }
function itemAction(g, act) {
  const { kind, i } = g.userData.info, name = (itemData(g) || {}).name || '';
  let msg;
  if (kind === 'drink') {
    const a = getDrinks(); if (a[i][1] <= 0) return;
    a[i][1]--; saveDrinks(a); msg = `${name} 잘 마셨습니다 (${a[i][1]}개 남음)`;
  } else {
    const key = kind === 'box' ? 'boxes' : kind === 'cup' ? 'cups' : kind === 'frz' ? 'freezer' : kind === 'note' ? 'suggestions' : 'tumblers';
    const a = kind === 'box' ? getBoxes() : kind === 'cup' ? getCups() : kind === 'frz' ? getFreezer() : kind === 'note' ? suggestions() : getTumblers();
    a.splice(i, 1); store.set(key, a);
    msg = act === 'heat' ? `${name}을(를) 전자레인지에 넣었습니다 (90초)` : act === 'bin' ? `${name} 버렸습니다` : act === 'take' ? `${name} 가져갔습니다`
      : act === 'eat' ? `${name} 맛있게 드세요` : `${name} 잘 마셨습니다`;
    if (kind === 'note') msg = '메모를 뗐습니다';
    if (act === 'heat') startTimer('microwave', 90, `전자레인지: ${name} 다 데워졌습니다`);
  }
  toast(msg);
  leave(g, kind === 'tumbler' ? refreshTumblers : kind === 'frz' ? refreshFreezer : kind === 'note' ? renderBoardNotes : refreshFridge);
  exitItemFocus(true);                                    // 카메라는 원래 보던 자리로 돌아간다
}
function inspectClick(ev) {
  const g = pickItem(ev);
  if (itemFocus) {
    if (!g) { exitItemFocus(); return; }                  // 사물이 아닌 곳을 누르면 제자리에 두고 돌아간다
    if (g === itemFocus.g) return;
    if (itemFocus.g.parent) setPull(itemFocus.g, 0);      // 다른 사물을 누르면 그쪽으로 옮겨 간다
    enterItemFocus(g); return;
  }
  if (g) {
    const k = g.userData.info.kind;
    if (k === 'snack') eatSnack(g); else if (k === 'order') orderSnack(g.userData.info.i, false); else if (k === 'drawer') toggleDrawer(g.userData.info.i); else enterItemFocus(g);
    return;
  }
  const obj = pick(ev);
  if (!obj) { closeApp(); return; }                       // 빈 곳을 누르면 나간다
  if (obj.userData.act) obj.userData.act(); else if (obj.userData.id !== currentApp) openApp(obj.userData.id);
}

// 화면 아래의 작은 한 줄 입력줄 (물건 넣기, 고르기)
function showBar(cfg) {
  ibarHandlers = cfg;
  ibarEl.innerHTML = `<b class="ititle">${esc(cfg.title)}</b>`
    + (cfg.info ? `<span class="iinfo">${esc(cfg.info)}</span>` : '')
    + (cfg.kinds ? `<span class="seg">${cfg.kinds.map(([v, n], i) => `<button data-kind="${v}" class="${i === 0 ? 'on' : ''}">${n}</button>`).join('')}</span>` : '')
    + (cfg.placeholder ? `<input type="text" id="iinput" maxlength="20" placeholder="${esc(cfg.placeholder)}"><button class="primary" data-act="add">${esc(cfg.addLabel || '넣기')}</button>` : '')
    + (cfg.buttons || []).map(([id, n, primary]) => `<button data-act="${id}" class="${primary ? 'primary' : ''}">${esc(n)}</button>`).join('')
    + `<button data-act="close">${esc(cfg.closeLabel || '나가기')}</button>`;
  ibarEl.style.display = 'flex';
  hintEl.style.display = 'none';
  barKind = cfg.kinds ? cfg.kinds[0][0] : null;
}
function hideBar() { ibarEl.style.display = 'none'; ibarEl.innerHTML = ''; ibarHandlers = null; hintEl.style.display = ''; }
ibarEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ibarHandlers) return;
  if (b.dataset.kind) { barKind = b.dataset.kind; ibarEl.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); return; }
  const act = b.dataset.act;
  if (act === 'close') { if (ibarHandlers.onClose) ibarHandlers.onClose(); else closeApp(); return; }
  if (act === 'add') {
    const inp = document.getElementById('iinput'), v = inp.value.trim();
    if (!v) return;
    ibarHandlers.onAdd(barKind, v); inp.value = ''; return;
  }
  if (ibarHandlers.onButton) ibarHandlers.onButton(act);
});
ibarEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'iinput') { e.preventDefault(); const a = ibarEl.querySelector('[data-act="add"]'); if (a) a.click(); }
});

/* ---------- 시작 ---------- */
renderBoardNotes();
refreshSnacks();
refreshFridge();
refreshMess();
setInterval(() => { refreshFridge(); }, 60000);          // 이름표의 "몇 시간 전"을 새로 그린다
refreshTumblers();
refreshCups();
updateAcDisplay();
applyEnv();
drawSky(0);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
let fridgeOpen = false, freezerOpen = false, camAnim = null, focusActive = false, homeCam = null, breadPopUntil = 0, lastFrame = performance.now();
function flyTo(pos, target, ms = 750) {
  camAnim = { t0: performance.now(), ms, p0: camera.position.clone(), g0: controls.target.clone(), p1: pos.clone(), g1: target.clone() };
}
function beginFocus(pos, target) {
  if (!focusActive) {
    if (fps.on) controls.target.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 2);
    if (!camAnim || !homeCam) homeCam = { pos: camera.position.clone(), target: controls.target.clone() };
    focusActive = true;
    flyTo(pos, target);
  }
}
function endFocus() {
  if (!focusActive) return;
  focusActive = false;
  if (homeCam) flyTo(homeCam.pos, homeCam.target);
}
renderer.setAnimationLoop(() => {
  if (camAnim) {
    const k = Math.min(1, (performance.now() - camAnim.t0) / camAnim.ms);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
    controls.target.lerpVectors(camAnim.g0, camAnim.g1, e);
    if (k >= 1) camAnim = null;
  }
  // 프레임 속도와 상관없이 같은 시간 안에 열리고 닫히도록 시간 간격(dt)으로 계산
  const nowMs = performance.now();
  const dt = Math.min(0.1, (nowMs - lastFrame) / 1000); lastFrame = nowMs;
  const kDoor = 1 - Math.exp(-dt * 7), kBread = 1 - Math.exp(-dt * 14);
  fridgeDoor.rotation.y += ((fridgeOpen ? 1.75 : 0) - fridgeDoor.rotation.y) * kDoor;
  freezerDoor.rotation.y += ((freezerOpen ? 1.7 : 0) - freezerDoor.rotation.y) * kDoor;
  freezerLight.intensity += ((freezerOpen ? 0.6 : 0) - freezerLight.intensity) * kDoor;
  fridgeLight.intensity += ((fridgeOpen ? 2.2 : 0) - fridgeLight.intensity) * kDoor;
  const popping = Date.now() < breadPopUntil;
  breads.forEach(b => {
    const goal = timers.toaster ? b.userData.y0 - 0.06 : popping ? b.userData.y0 + 0.07 : b.userData.y0;
    b.position.y += (goal - b.position.y) * kBread;
  });
  tickWorld(dt);
  if (fps.on && !focusActive && !camAnim) fpsStep(dt); else controls.update();
  tickTimers(); renderer.render(scene, camera);
});

// 테스트용: 주소 뒤에 ?debug 를 붙이면 물건의 화면 위치를 알려 준다
if (location.search.includes('debug')) {
  window.__room = {
    dishScreen(i) { const v = wash.dishes[i].g.position.clone().add(new THREE.Vector3(0, 0.04, 0)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    toolScreen(n) { const m = n === 'soap' ? soapBottle : faucetPost; const v = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    washInfo() { return { soap: wash.soap, water: wash.water, left: wash.left, done: wash.done, dishes: wash.dishes.map(d => ({ n: d.name, dirt: d.dirt.length, foam: d.foam.length, done: d.done })) }; },
    ramenInfo() { return { phase: ramen.phase, chops: ramen.chops, bites: ramen.bites, hud: ramenHudEl.textContent }; },
    messInfo() { return { ...mess, clean: cleanliness(), hud: hudEl.textContent }; },
    trashAnswer() { return tg && !tg.finished ? tg.items[tg.i][1] : null; },
    setMess(o) { Object.assign(mess, o); saveMess(); refreshMess(); },
    autoMessNow() { return autoMess(); },
    messUpNow() { messUp(); },
    litterScreen(i) { const v = litter[i].position.clone().add(new THREE.Vector3(0, 0.06, 0)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    stainScreen(i) { const v = stains[i].getWorldPosition(new THREE.Vector3()).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    fpsInfo() { return { on: fps.on, x: +fps.pos.x.toFixed(2), z: +fps.pos.z.toFixed(2), yaw: +fps.yaw.toFixed(2), focus: focusActive }; },
    fpsSet(x, z, yaw, pitch) { fps.pos.set(x, 1.55, z); fps.yaw = fps.tYaw = yaw; fps.pitch = fps.tPitch = pitch || 0; },
    fpsKey(k, down) { fps.keys[k] = down; },
    washForce() { wash.dishes.forEach(d => { while (d.dirt.length) dropMesh(d.dirt.pop()); while (d.foam.length) dropMesh(d.foam.pop()); checkDish(d); }); },
    pileCount() { return sinkPile.children.length; },
    snackOpenInfo() { return { open: snackIdx, pulls: snackDrawers.map(d => +(d.position.z - DRAWER_FRONT_Z).toFixed(2)), items: snackDrawers.map(d => d.userData.items.children.length) }; },
    itemScreen(kind, i) {
      const all = [...itemTargets.fridge, ...itemTargets.freezer, ...itemTargets.sink, ...itemTargets.snack];
      const m = all.find(o => { const g = o.userData.itemGroup; return g && g.userData.info.kind === kind && (i === undefined || g.userData.info.i === i) && g.visible; });
      if (!m) return null;
      const v = new THREE.Box3().setFromObject(m.userData.itemGroup).getCenter(new THREE.Vector3()).project(camera);
      return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
    },
    tagState() { const mx = a => Math.max(0, ...a.map(t => t.material.opacity)); return { fridge: +mx(tagList.fridge).toFixed(2), freezer: +mx(tagList.freezer).toFixed(2), sink: +mx(tagList.sink).toFixed(2), n: [tagList.fridge.length, tagList.freezer.length, tagList.sink.length] }; },
    itemDump(kind) {
      const all = [...itemTargets.fridge, ...itemTargets.freezer, ...itemTargets.sink, ...itemTargets.snack];
      const seen = new Set(), out = [];
      all.forEach(o => { const g = o.userData.itemGroup; if (g && g.userData.info.kind === kind && !seen.has(g)) { seen.add(g); const w = g.getWorldPosition(new THREE.Vector3()); out.push({ i: g.userData.info.i, pos: g.position.toArray().map(v => +v.toFixed(2)), scale: g.scale.toArray().map(v => +v.toFixed(2)), world: w.toArray().map(v => +v.toFixed(2)), visible: g.visible, parentVisible: g.parent ? g.parent.visible : 'DETACHED' }); } });
      return out;
    },
    camInfo() { return { pos: camera.position.toArray().map(v => +v.toFixed(2)), fov: camera.fov, near: camera.near, far: camera.far }; },
    focusInfo() { return { focus: itemFocus ? itemFocus.g.userData.info : null, bar: ibarEl.textContent, doors: { fridge: fridgeOpen, freezer: freezerOpen } }; },
    barInfo() { return { shown: ibarEl.style.display, text: ibarEl.textContent, overlayOpen: overlay.classList.contains('open') }; },
    screenOf(id) {
      const g = clickable.find(c => c.userData.id === id);
      const anchors = { snack: [-1.09, 0.63, -2.98], lunch: [1.2, 0.8, 1.1], vending: [7.0, 1.1, -3.0], sink: [-4.2, 1.05, -1.5], window: [-4.84, 2.4, 2.4], aircon: [-4.78, 3.3, -1.95], clock: [-3.5, 3.1, -3.8], fridge: [-3.5, 0.75, 0.1], freezer: [-3.5, 1.98, 0.1] };
      const v = (anchors[id] ? new THREE.Vector3(...anchors[id]) : new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3())).project(camera);
      return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
    }
  };
}
