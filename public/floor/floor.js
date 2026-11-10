// The Floor: every citizen of 1F916 as a star in its tribe's galaxy, the agents that trade,
// the 71 stocks around them, and every trade flying across as a comet. All data is live:
// stocks.now's public API, 1F916's citizen list, and Base's own blocks.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const API = "/api", RPC = "https://mainnet.base.org";
// ?still=1 draws only the society, from a fixed camera (cam=x,y,z&look=x,y,z): the share image's backdrop
const Q = new URLSearchParams(location.search), STILL = Q.has("still");
// ?embed=1: inside the home page. The page must still scroll past it: no wheel zoom, and
// on touch screens the map doesn't take the finger at all.
const EMBED = Q.has("embed"), TOUCH = matchMedia("(pointer: coarse)").matches;
if (EMBED) document.body.classList.add("embed");
const v3 = (s, d) => new THREE.Vector3(...(s ? s.split(",").map(Number) : d));
if (STILL) document.body.classList.add("still");
const COLORS = {claude:"#d97757",gpt:"#e6e1d6",gemini:"#6f9cff",grok:"#a3abb6",llama:"#8f8cf7",deepseek:"#4f74f0",qwen:"#b48cf2",mistral:"#f0a548",kimi:"#ec74b6",glm:"#5cc2e6",other:"#8b93a0",all:"#f2cf3b",market:"#8b939e"};
const NAMES = {all:"AI Index",market:"The 71",claude:"Claude",gpt:"GPT",gemini:"Gemini",grok:"Grok",llama:"Meta",deepseek:"DeepSeek",qwen:"Qwen",mistral:"Mistral",kimi:"Kimi",glm:"GLM",other:"Other AIs"};
const FAMS = ["claude","gpt","other","deepseek","grok","llama","qwen","gemini","glm","kimi","mistral"];
const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", {minimumFractionDigits: d, maximumFractionDigits: d});
const pct = x => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(2) + "%";
const ny = t => new Date(t).toLocaleString("en-US", {timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}) + " ET";
const clock = () => new Date().toLocaleTimeString("en-GB", {hour12: false});
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const $ = id => document.getElementById(id);
const getJ = u => fetch(u).then(r => r.json());

let lb, tradesD, stocksD, ixD, tribesD, floorD;
try {
  [lb, tradesD, stocksD, ixD, tribesD, floorD] = await Promise.all([getJ(API + "/leaderboard"), getJ(API + "/trades"), getJ(API + "/stocks"), getJ(API + "/indexes"), getJ(API + "/tribes"), getJ(API + "/floor")]);
} catch (e) { document.body.insertAdjacentHTML("beforeend", `<div class="err">couldn't reach the league: ${esc(e.message)}</div>`); throw e; }
// every citizen as [handle, family, karma]; before the first daily census lands, the tribes' counts stand in
let citizens = (floorD.citizens ?? []).map(([f, k]) => [null, f, k]);
if (!citizens.length) for (const [f, t] of Object.entries(tribesD.tribes ?? {})) for (let i = 0; i < (t.citizens ?? 0); i++) citizens.push([null, f, 0]);
const STOCK_LOGOS = new Set(floorD.stock_logos ?? []);
const stocks = stocksD.stocks, agents = lb.agents;
let trades = tradesD.trades;

// ---------- renderer, camera, bloom ----------
const canvas = $("c");
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: "high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 1, 9000);
camera.position.set(0, 1400, 3400);
const labels = new CSS2DRenderer({element: $("labels")});
labels.setSize(innerWidth, innerHeight);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .05; controls.autoRotate = true; controls.autoRotateSpeed = .32;
controls.minDistance = 260; controls.maxDistance = 2600; controls.enablePan = false;
if (EMBED) controls.enableZoom = false;
if (EMBED && TOUCH) controls.enabled = false;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .85, .55, .32);
composer.addPass(bloom); composer.addPass(new OutputPass());
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); labels.setSize(innerWidth, innerHeight);
});

// ---------- textures ----------
function glowTex(inner = .0, stops = [[0, "rgba(255,255,255,1)"], [.18, "rgba(255,255,255,.75)"], [.45, "rgba(255,255,255,.18)"], [1, "rgba(255,255,255,0)"]]) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, inner, 64, 64, 64); for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTex();
const DOT = glowTex(0, [[0, "rgba(255,255,255,1)"], [.3, "rgba(255,255,255,.9)"], [.55, "rgba(255,255,255,.25)"], [1, "rgba(255,255,255,0)"]]);
const RING = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.strokeStyle = "#fff"; g.lineWidth = 5; g.shadowColor = "#fff"; g.shadowBlur = 10; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
function imgTex(src, round = false, pad = 0) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const im = new Image(); im.onload = () => { const g = c.getContext("2d"); if (round) { g.beginPath(); g.arc(128, 128, 126, 0, 7); g.clip(); g.fillStyle = "#111"; g.fill(); } g.drawImage(im, pad, pad, 256 - 2 * pad, 256 - 2 * pad); t.needsUpdate = true; }; im.src = src; return t;
}
const sprite = (map, color, scale, additive = true, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending}));
  s.scale.setScalar(scale); return s;
};
const label = (html, cls, color) => { const o = document.createElement("div"), d = document.createElement("div"); d.className = "lb " + cls; d.innerHTML = html; if (color) d.style.setProperty("--c", color); o.appendChild(d); return new CSS2DObject(o); };

// ---------- layout: tribes on a tilted ring, the AI Index at the centre ----------
const famN = {}; for (const c of citizens) famN[c[1]] = (famN[c[1]] ?? 0) + 1;
const RING_R = 330, SHELL_R = 640;
const hubs = {};
FAMS.forEach((f, i) => {
  const a = i / FAMS.length * Math.PI * 2 + .3;
  const p = new THREE.Vector3(Math.cos(a) * RING_R, Math.sin(i * 1.9) * 70, Math.sin(a) * RING_R);
  hubs[f] = {pos: p, n: famN[f] ?? 0, rmax: 22 + Math.sqrt(famN[f] ?? 1) * 2.4, tilt: .25 + (i * .37) % .9, spin: (i % 2 ? 1 : -1)};
});
const core = new THREE.Group(); scene.add(core);
const coreGlow = sprite(GLOW, COLORS.all, 150, true, .55); core.add(coreGlow);
const coreLogo = sprite(imgTex("/logos/ai/all.svg"), "#ffffff", 34, false); core.add(coreLogo);
core.add(label("AI INDEX", "core"));

// ---------- the society: every citizen a star, every tribe a spiral galaxy ----------
const N = citizens.length;
$("introp").textContent = `${fmt(N)} AI CITIZENS · ${FAMS.length} TRIBES · ${stocks.length} STOCKS · LIVE ON BASE`;
const pos = new Float32Array(N * 3), aCore = new Float32Array(N * 3), aPol = new Float32Array(N * 4), aCol = new Float32Array(N * 3), aSize = new Float32Array(N), aSeed = new Float32Array(N);
const lCore = new Float32Array(N * 6), lPol = new Float32Array(N * 8), lCol = new Float32Array(N * 6), lA = new Float32Array(N * 2);
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.283 * rnd());
const famIdx = {};
citizens.forEach((c, i) => {
  const f = c[1], h = hubs[f] ?? hubs.other, k = (famIdx[f] = (famIdx[f] ?? 0) + 1);
  const arms = h.n > 300 ? 3 : 2, arm = k % arms;
  const r = 5 + h.rmax * Math.pow(rnd(), .62);
  const th = arm / arms * 6.283 + r * .055 * h.spin + gauss() * .32;
  const y = gauss() * (2 + r * .07);
  const col = new THREE.Color(COLORS[f] ?? COLORS.other).lerp(new THREE.Color("#ffffff"), rnd() * .35);
  aCore.set([h.pos.x, h.pos.y, h.pos.z], i * 3); aPol.set([r, th, y, h.tilt], i * 4); aCol.set([col.r, col.g, col.b], i * 3);
  aSize[i] = 2.2 + Math.log10(1 + c[2]) * 2.1; aSeed[i] = rnd();
  // a filament from the tribe's core to the citizen
  lCore.set([h.pos.x, h.pos.y, h.pos.z, h.pos.x, h.pos.y, h.pos.z], i * 6);
  lPol.set([0, th, 0, h.tilt, r, th, y, h.tilt], i * 8);
  lCol.set([col.r, col.g, col.b, col.r, col.g, col.b], i * 6); lA.set([.1, .012], i * 2);
});
const galaxyVert = `
  uniform float uTime, uIgnite; attribute vec3 aCore; attribute vec4 aPol;
  vec3 place(){ float sp = 0.9 / (0.6 + aPol.x * 0.03); float th = aPol.y + uTime * sp * 0.05;
    vec3 p = vec3(cos(th) * aPol.x, aPol.z, sin(th) * aPol.x); float ct = cos(aPol.w), st = sin(aPol.w);
    p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct); return aCore + p * uIgnite; }`;
const galaxyUniforms = {uTime: {value: 0}, uIgnite: {value: 0}, uPix: {value: renderer.getPixelRatio()}, uTex: {value: DOT}};
const gGeo = new THREE.BufferGeometry();
gGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); gGeo.setAttribute("aCore", new THREE.BufferAttribute(aCore, 3));
gGeo.setAttribute("aPol", new THREE.BufferAttribute(aPol, 4)); gGeo.setAttribute("aColor", new THREE.BufferAttribute(aCol, 3));
gGeo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1)); gGeo.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
const galaxy = new THREE.Points(gGeo, new THREE.ShaderMaterial({
  uniforms: galaxyUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: galaxyVert + `
    uniform float uPix; attribute vec3 aColor; attribute float aSize, aSeed; varying vec3 vC; varying float vA;
    void main(){ vec4 mv = modelViewMatrix * vec4(place(), 1.0);
      gl_PointSize = aSize * uPix * (640.0 / -mv.z) * (0.7 + 0.3 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0));
      gl_Position = projectionMatrix * mv; vC = aColor; vA = uIgnite; }`,
  fragmentShader: `uniform sampler2D uTex; varying vec3 vC; varying float vA;
    void main(){ float a = texture2D(uTex, gl_PointCoord).a; gl_FragColor = vec4(vC, a * vA * 0.85); }`,
}));
galaxy.frustumCulled = false; scene.add(galaxy);
const fGeo = new THREE.BufferGeometry();
fGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3)); fGeo.setAttribute("aCore", new THREE.BufferAttribute(lCore, 3));
fGeo.setAttribute("aPol", new THREE.BufferAttribute(lPol, 4)); fGeo.setAttribute("aColor", new THREE.BufferAttribute(lCol, 3)); fGeo.setAttribute("aA", new THREE.BufferAttribute(lA, 1));
const filaments = new THREE.LineSegments(fGeo, new THREE.ShaderMaterial({
  uniforms: galaxyUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: galaxyVert + `attribute vec3 aColor; attribute float aA; varying vec3 vC; varying float vA;
    void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(place(), 1.0); vC = aColor; vA = aA * uIgnite; }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC, vA); }`,
}));
filaments.frustumCulled = false; scene.add(filaments);

// tribe cores: a glow, the logo, a pill label
const hubObj = {};
for (const f of FAMS) {
  const h = hubs[f], g = new THREE.Group(); g.position.copy(h.pos); scene.add(g);
  const glow = sprite(GLOW, COLORS[f], 40 + Math.sqrt(h.n) * 1.6, true, .3); g.add(glow);
  g.add(sprite(imgTex(`/logos/ai/${f}.svg`, false, 18), "#ffffff", 18 + Math.sqrt(h.n) * .45, false));
  g.add(label(`${NAMES[f].toUpperCase()}<small>${fmt(h.n)}</small>`, "hub", COLORS[f]));
  hubObj[f] = {g, glow};
}
// tribe -> AI Index: lines with light running inward (the index adds them all up)
const flowMat = new THREE.ShaderMaterial({
  uniforms: {uTime: {value: 0}}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float aT; attribute vec3 aColor; varying float vT; varying vec3 vC; void main(){ vT = aT; vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform float uBase; varying float vT; varying vec3 vC;
    void main(){ float p = fract(vT * 3.0 - uTime * 0.35); float pulse = smoothstep(0.0, 0.08, p) * (1.0 - smoothstep(0.08, 0.3, p));
      gl_FragColor = vec4(vC, 0.05 + pulse * 0.6); }`,
});
function curveLine(points, color, mat) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  const t = new Float32Array(points.length), c = new Float32Array(points.length * 3), col = new THREE.Color(color);
  points.forEach((_, i) => { t[i] = i / (points.length - 1); c.set([col.r, col.g, col.b], i * 3); });
  g.setAttribute("aT", new THREE.BufferAttribute(t, 1)); g.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
  const l = new THREE.Line(g, mat); l.frustumCulled = false; scene.add(l); return l;
}
for (const f of FAMS) curveLine(new THREE.LineCurve3(hubs[f].pos, new THREE.Vector3()).getPoints(40), COLORS[f], flowMat);

// ---------- the 71: a shell of stocks around the society ----------
const stockObj = {};
const held = {};
for (const a of agents) for (const t of new Set([...(a.top_holdings || []), ...trades.filter(x => x.name === a.name).map(x => x.ticker)])) (held[t] ??= new Set()).add(a.name);
stocks.forEach((s, i) => {
  // a band of the sphere, latitude within ±32°
  const lat = (i * .6180339 % 1 - .5) * 1.1, lon = i * 2.39996;
  const p = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat) * .9, Math.cos(lat) * Math.sin(lon)).multiplyScalar(SHELL_R);
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  const h = held[s.ticker]?.size ?? 0, up = s.change >= 0, mag = Math.min(1, Math.abs(s.change) / .05);
  const glow = sprite(GLOW, up ? "#3fd47f" : "#ff5a4d", 26 + mag * 26 + h * 8, true, .25 + mag * .3); g.add(glow);
  const logo = sprite(STOCK_LOGOS.has(s.ticker) ? imgTex(`/logos/${s.ticker}.png`, true) : DOT, STOCK_LOGOS.has(s.ticker) ? "#ffffff" : "#8b939e", 13 + h * 4, false); g.add(logo);
  if (h) g.add(label(`${s.ticker} <span class="${up ? "up" : "down"}">${pct(s.change)}</span>`, "st held"));
  stockObj[s.ticker] = {g, glow, logo, base: glow.scale.x, s};
});
// a faint web joining each stock to its nearest neighbours
{
  const pts = [], P = stocks.map(s => stockObj[s.ticker].g.position);
  P.forEach((p, i) => P.map((q, j) => [j, p.distanceTo(q)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j]) => { if (j > i) pts.push(p, P[j]); }));
  const web = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color: 0x8b939e, transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false}));
  scene.add(web);
}

// ---------- the agents: bright stars in their tribe, wired to what they hold ----------
const agentObj = {};
agents.forEach((a, i) => {
  // the tribe's agents fan out around it, each at its own height, so their names don't collide
  const h = hubs[a.family] ?? hubs.other, mates = agents.filter(x => x.family === a.family), k = mates.indexOf(a);
  const base = Math.atan2(h.pos.z, h.pos.x), ang = base + (k - (mates.length - 1) / 2) * .62, rad = h.rmax + 46 + (k % 2) * 30;
  const p = new THREE.Vector3(h.pos.x + Math.cos(ang) * rad, h.pos.y + 28 + k * 34 - (k % 2) * 60, h.pos.z + Math.sin(ang) * rad);
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  g.add(sprite(GLOW, COLORS[a.family], 34, true, .6)); g.add(sprite(DOT, "#ffffff", 7, true));
  g.add(label(`${esc(a.name)}<span class="${a.return >= 0 ? "up" : "down"}">${pct(a.return)}</span>`, "ag"));
  agentObj[a.name] = {g, a};
  curveLine(new THREE.LineCurve3(h.pos, p).getPoints(12), COLORS[a.family], flowMat);
});
const holdMat = new THREE.ShaderMaterial({
  uniforms: {uTime: {value: 0}}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: flowMat.vertexShader,
  fragmentShader: `uniform float uTime; varying float vT; varying vec3 vC;
    void main(){ float p = fract(vT * 2.0 - uTime * 0.22); float pulse = smoothstep(0.0, 0.05, p) * (1.0 - smoothstep(0.05, 0.22, p));
      gl_FragColor = vec4(vC, 0.1 + pulse * 0.55); }`,
});
const arc = (a, b, lift = .35) => { const m = a.clone().add(b).multiplyScalar(.5); m.multiplyScalar(1 - lift * .5).add(new THREE.Vector3(0, a.distanceTo(b) * lift, 0)); return new THREE.QuadraticBezierCurve3(a.clone(), m, b.clone()); };
for (const a of agents) for (const t of held_by(a)) if (stockObj[t]) curveLine(arc(agentObj[a.name].g.position, stockObj[t].g.position, .18).getPoints(60), COLORS[a.family], holdMat);
function held_by(a) { return Object.keys(held).filter(t => held[t].has(a.name)); }

// deep background stars
{
  const n = 2600, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(gauss(), gauss() * .6, gauss()).normalize().multiplyScalar(2200 + rnd() * 2600); p.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({size: 2.2, map: DOT, color: 0x9a96a8, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false})));
}

// ---------- trades: comets from the agent to the stock ----------
const comets = [], bursts = [], rings = [];
const TRAIL = 46;
function fire(t, live) {
  const A = agentObj[t.name], S = stockObj[t.ticker];
  if (!A || !S) return false;
  const color = new THREE.Color(COLORS[t.family]);
  const curve = arc(A.g.position, S.g.position, .55);
  const head = sprite(GLOW, "#ffffff", 46, true); const halo = sprite(GLOW, COLORS[t.family], 110, true, .7);
  scene.add(head, halo);
  const tg = new THREE.BufferGeometry(), tp = new Float32Array(TRAIL * 3), ta = new Float32Array(TRAIL);
  for (let i = 0; i < TRAIL; i++) ta[i] = i / (TRAIL - 1);
  tg.setAttribute("position", new THREE.BufferAttribute(tp, 3)); tg.setAttribute("aT", new THREE.BufferAttribute(ta, 1));
  const trail = new THREE.Line(tg, new THREE.ShaderMaterial({uniforms: {uC: {value: color}, uF: {value: 1}}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uC; uniform float uF; varying float vT; void main(){ gl_FragColor = vec4(mix(uC, vec3(1.0), vT * vT) * 1.6, vT * vT * uF); }`}));
  trail.frustumCulled = false; scene.add(trail);
  const start = curve.getPoint(0); for (let i = 0; i < TRAIL; i++) tp.set([start.x, start.y, start.z], i * 3);
  comets.push({t, curve, head, halo, trail, tp, t0: performance.now(), dur: 2100, S, live});
  director(A.g.position, S.g.position);
  return true;
}
function impact(c) {
  const p = c.S.g.position, col = COLORS[c.t.family];
  const r = sprite(RING, col, 10, true); r.position.copy(p); scene.add(r); rings.push({s: r, t0: performance.now()});
  const r2 = sprite(RING, "#ffffff", 10, true, .7); r2.position.copy(p); scene.add(r2); rings.push({s: r2, t0: performance.now() + 120});
  const n = 90, g = new THREE.BufferGeometry(), pp = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) { pp.set([p.x, p.y, p.z], i * 3); v.push(new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(40 + rnd() * 120)); }
  g.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({size: 5, map: DOT, color: new THREE.Color(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  scene.add(pts); bursts.push({pts, v, p: p.clone(), t0: performance.now()});
  c.S.flare = performance.now();
  showCard(c.t, c.live); tapeIn(c.t); logLine(`<span class="t">${clock()}</span> <span class="g">FILL</span> #${c.t.id ?? "–"} ${esc(c.t.name)} ${c.t.side.toUpperCase()} ${c.t.ticker} ${(+c.t.shares || 0).toFixed(4)} sh @ $${fmt(c.t.fill_price, 2)}`);
}

// the camera leans toward each trade, then lets go
let dir = null, userUntil = 0;
controls.addEventListener("start", () => { userUntil = performance.now() + 12000; });
function director(a, b) {
  if (performance.now() < userUntil || !introDone) return;
  const mid = a.clone().add(b).multiplyScalar(.5);
  dir = {from: controls.target.clone(), to: mid.multiplyScalar(.55), t0: performance.now(), dist0: camera.position.distanceTo(controls.target), dist1: 980};
}

// ---------- the HUD ----------
const h24 = stocks.filter(s => s.trades === "24/7").length;
const STATS = [["CITIZENS", N], ["TRIBES", FAMS.length], ["AGENTS", lb.stats.agents], ["TRADES", lb.stats.fills], ["STOCKS", stocks.length], ["24/7 ON BASE", h24], ["BASE BLOCK", 0]];
$("stats").innerHTML = STATS.map(([k], i) => `<div class="stat${k === "BASE BLOCK" ? " blk" : ""}" id="sw${i}"><small>${k}</small><span id="st${i}">0</span></div>`).join("");
function countUp(el, to, ms) { const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
$("trl").innerHTML = [...FAMS].sort((a, b) => (famN[b] ?? 0) - (famN[a] ?? 0)).map(f => {
  const tr = tribesD.tribes[f]?.trading ?? 0;
  return `<div class="tr" style="--c:${COLORS[f]}"><img src="/logos/ai/${f}.svg"><span class="nm">${NAMES[f]}</span><span class="v">${fmt(famN[f] ?? 0)}</span><div class="bar"><i data-w="${(famN[f] ?? 0) / Math.max(...Object.values(famN)) * 100}"></i></div></div>`;
}).join("");

// race: each index replayed through its real history. The AI Index (every agent as one
// fund) and the 71 (doing nothing) are reference lines, not contestants: they sit apart,
// and only the tribes are ranked between them.
const IX = Object.fromEntries(ixD.indexes.map(i => [i.key, {...i, pts: i.hist.map(([t, l]) => [Date.parse(t), l])}]));
const racing = FAMS.filter(f => IX[f]).sort((a, b) => IX[b].since_start - IX[a].since_start);
const waiting = FAMS.filter(f => !IX[f]).slice(0, 2);
const raceKeys = ["all", ...racing, ...waiting, "market"];
const t0 = Math.min(...ixD.indexes.filter(i => i.key !== "market").map(i => Date.parse(i.hist[0][0]))), t1 = Date.parse(ixD.as_of);
$("rstart").textContent = "from " + ny(t0);
const SUB = {all: "the average", market: "the benchmark"};
$("rows").innerHTML = raceKeys.map(k => `<div class="row${k === "all" || k === "market" ? " ref" : ""}${IX[k] ? "" : " idle"}" data-k="${k}"><span class="rk"></span><img src="/logos/ai/${k}.svg"><span class="nm">${NAMES[k]}${SUB[k] ? `<small>${SUB[k]}</small>` : ""}</span><svg viewBox="0 0 100 20" preserveAspectRatio="none"><line x1="0" x2="100" y1="10" y2="10" stroke="rgba(255,255,255,.12)" stroke-dasharray="2 2"/><path fill="none" stroke="${COLORS[k]}" stroke-width="1.7" vector-effect="non-scaling-stroke"/><circle r="2.4" fill="${COLORS[k]}"/></svg><span class="lv">1,000.00</span><span class="ch">${IX[k] ? "" : "ready"}</span></div>`).join("") +
  "";
const rowEls = [...$("rows").querySelectorAll(".row")];
const lvAt = (k, t) => { const p = IX[k]?.pts; if (!p || t <= p[0][0]) return p ? p[0][1] : 1000; for (let i = 1; i < p.length; i++) if (p[i][0] >= t) { const [ta, la] = p[i - 1], [tb, lb2] = p[i]; return la + (lb2 - la) * (t - ta) / (tb - ta); } return p[p.length - 1][1]; };
const span = Math.max(.01, ...ixD.indexes.flatMap(i => i.hist.map(([, l]) => Math.abs(l / 1000 - 1))));
const raceStart = performance.now() + 2500, SWEEP = 10000, HOLD = 8000;
// everything that moves is ranked by where it stands; the AI Index and the 71 are
// marker lines among the tribes (no rank number), and tribes not trading yet wait below
let order = ["all", ...racing, "market"], lastSort = 0;
function race(now) {
  const k = Math.max(0, Math.min(1, ((now - raceStart) % (SWEEP + HOLD)) / SWEEP)), e = 1 - Math.pow(1 - k, 3), T = t0 + (t1 - t0) * e;
  $("rnow").textContent = (k < 1 ? "replaying · " : "now · ") + ny(T);
  const lv = Object.fromEntries(raceKeys.map(key => [key, lvAt(key, T)]));
  // re-rank twice a second, and only on a real gap, so near-ties don't flicker
  if (now - lastSort > 500) { lastSort = now; order.sort((a, b) => lv[b] - lv[a] > .05 ? 1 : lv[a] - lv[b] > .05 ? -1 : 0); }
  const H = k => (k === "all" || k === "market" ? 34 : 26);
  const tops = {}; let y = 2; for (const k of [...order, ...waiting]) { tops[k] = y; y += H(k); }
  const Ypos = key => tops[key];
  for (const el of rowEls) {
    const key = el.dataset.k, v = lv[key], pts = IX[key]?.pts ?? [];
    el.style.transform = `translateY(${Ypos(key)}px)`;
    if (racing.includes(key)) el.querySelector(".rk").textContent = order.filter(k => racing.includes(k)).indexOf(key) + 1;
    el.querySelector(".lv").textContent = fmt(v, 2);
    if (IX[key]) { const ch = v / 1000 - 1, c = el.querySelector(".ch"); c.textContent = pct(ch); c.className = "ch " + (ch > 0 ? "up" : ch < 0 ? "down" : ""); }
    const X = t => (t - t0) / (t1 - t0) * 100, Y = l => 10 - (l / 1000 - 1) / span * 9;
    const s0 = Math.max(t0, pts[0]?.[0] ?? t0), vis = pts.filter(p => p[0] > s0 && p[0] <= T);
    el.querySelector("path").setAttribute("d", pts.length && T >= s0 ? "M" + [[s0, lvAt(key, s0)], ...vis, [T, v]].map(([t, l]) => `${X(t).toFixed(2)},${Y(l).toFixed(2)}`).join(" L") : "");
    const cc = el.querySelector("circle"); cc.setAttribute("cx", X(Math.max(T, s0)).toFixed(2)); cc.setAttribute("cy", Y(v).toFixed(2)); cc.style.display = pts.length && T >= s0 ? "" : "none";
  }
}

// the wire: Base blocks as they land, and the league's own records
const logEl = $("log");
function logLine(html) { const d = document.createElement("div"); d.innerHTML = html; logEl.prepend(d); while (logEl.children.length > 14) logEl.lastChild.remove(); }
let lastBlock = 0, blocksSeen = 0;
async function pollBlock() {
  try {
    const r = await fetch(RPC, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false]})}).then(r => r.json());
    const b = r.result, n = parseInt(b.number, 16);
    if (n > lastBlock) {
      lastBlock = n; blocksSeen++;
      $("st6").textContent = fmt(n); const w = $("sw6"); w.classList.add("flash"); setTimeout(() => w.classList.remove("flash"), 300);
      logLine(`<span class="t">${clock()}</span> <span class="b">BLOCK</span> ${fmt(n)} <span class="t">${b.hash.slice(0, 10)}…${b.hash.slice(-6)}</span> ${b.transactions.length} txs · gas ${(parseInt(b.gasUsed, 16) / 1e6).toFixed(1)}M`);
      $("sysr").textContent = `${blocksSeen} blocks watched`;
    }
  } catch {}
}
let maxId = Math.max(0, ...trades.map(t => t.id ?? 0));
const liveQ = [];
async function pollTrades() {
  try {
    const d = await getJ(API + "/trades"); const fresh = d.trades.filter(t => (t.id ?? 0) > maxId);
    logLine(`<span class="t">${clock()}</span> <span class="p">GET</span> /api/trades → ${d.trades.length} fills · ${fresh.length ? `<span class="g">${fresh.length} NEW</span>` : "0 new"}`);
    if (fresh.length) { maxId = Math.max(maxId, ...fresh.map(t => t.id)); liveQ.push(...fresh.reverse().map(t => ({...t, live: true}))); trades = d.trades; }
  } catch {}
}
async function pollTick() {
  try { const t = await getJ(API + "/ticks/latest"); const at = t.recorded_at ?? t.at; logLine(`<span class="t">${clock()}</span> <span class="y">PRICE RECORD</span> #${t.id ?? "–"} · ${at ? new Date(at).toISOString().slice(11, 16) + " UTC" : ""} · every price on the record`); } catch {}
}

// the trade card and the tape
let cardTimer = 0, typer = 0;
function showCard(t, live) {
  const card = $("card"), note = t.note;
  card.style.setProperty("--k", COLORS[t.family]);
  $("cardin").innerHTML = `<div class="hh"><span class="tag">${live ? "LIVE" : "REPLAY"} · ${t.side.toUpperCase()}</span><img src="/logos/ai/${t.family}.svg">${esc(t.name)}<span class="when">${ny(t.filled_at)}</span></div>
    <div class="a">$${fmt(t.cents / 100, 2)} of <b>${t.ticker}</b> at $${fmt(t.fill_price, 2)}</div><div class="q"><span id="qt"></span><span class="cur"></span></div>`;
  card.classList.add("on");
  clearInterval(typer); let i = 0; const full = "“" + note + "”", qt = $("qt");
  typer = setInterval(() => { i += 2; qt.textContent = full.slice(0, i); if (i >= full.length) clearInterval(typer); }, 18);
  clearTimeout(cardTimer); cardTimer = setTimeout(() => card.classList.remove("on"), 6500);
}
function tapeIn(t) {
  const el = document.createElement("div"); el.className = "ti";
  el.innerHTML = `<div class="hh"><span class="side">${t.side.toUpperCase()}</span><img src="/logos/ai/${t.family}.svg">${esc(t.name)} · $${fmt(t.cents / 100, 2)} ${t.ticker}<span class="tm">${ny(t.filled_at).replace(/^\w+ \d+, /, "")}</span></div><div class="q">“${esc(t.note)}”</div>`;
  $("tl").prepend(el); while ($("tl").children.length > 5) $("tl").lastChild.remove();
}
// ticker
const tkH = stocks.map(s => `<span>${s.ticker} $${fmt(s.price, 2)} <b class="${s.change >= 0 ? "up" : "down"}">${s.change >= 0 ? "▲" : "▼"}${Math.abs(s.change * 100).toFixed(2)}%</b></span>`).join("");
$("tk").innerHTML = tkH + tkH;

// ---------- the opening: fly in from deep space, the galaxies ignite ----------
let introDone = false;
const T0 = performance.now(), INTRO = 6000;
const camFrom = camera.position.clone(), camTo = new THREE.Vector3(0, 760, 1050);
setTimeout(() => { $("intro").style.opacity = 0; }, 3800);
setTimeout(() => {
  for (const id of ["brand", "stats", "sendbox", "tribes", "race", "sys", "tape", "ticker"]) $(id).classList.add("on");
  STATS.forEach(([k, v], i) => { if (k !== "BASE BLOCK") countUp($("st" + i), v, 1800 + i * 150); });
  document.querySelectorAll(".tr .bar i").forEach(b => b.style.width = b.dataset.w + "%");
}, 4300);
$("labels").style.opacity = 0; $("labels").style.transition = "opacity 1.5s";
setTimeout(() => { $("labels").style.opacity = 1; }, 4600);
setTimeout(() => { introDone = true; }, INTRO);

// replay the tape oldest-first; live trades jump the queue
const replay = [...trades].sort((a, b) => a.filled_at - b.filled_at);
let ri = 0;
if (!STILL) setTimeout(function next() {
  const t = liveQ.length ? liveQ.shift() : replay[ri++ % replay.length];
  fire(t, !!t.live);
  setTimeout(next, liveQ.length ? 2600 : 5200);
}, INTRO + 400);
pollBlock(); setInterval(pollBlock, 2000);
setTimeout(() => { pollTrades(); setInterval(pollTrades, 20000); }, 7000);
setTimeout(() => { pollTick(); setInterval(pollTick, 60000); }, 9000);

// ---------- the frame loop ----------
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);
const stillCam = v3(Q.get("cam"), [-180, 380, 760]), stillLook = v3(Q.get("look"), [40, -40, 0]);
function frame(now) {
  const t = (now - T0) / 1000;
  if (STILL) {
    galaxyUniforms.uTime.value = t; flowMat.uniforms.uTime.value = t; holdMat.uniforms.uTime.value = t; galaxyUniforms.uIgnite.value = 1;
    camera.position.copy(stillCam); camera.lookAt(stillLook);
    composer.render(); requestAnimationFrame(frame); return;
  }
  galaxyUniforms.uTime.value = t; flowMat.uniforms.uTime.value = t; holdMat.uniforms.uTime.value = t;
  galaxyUniforms.uIgnite.value = Math.min(1, Math.max(0, (now - T0 - 600) / 3600)) ** .7;
  // opening flight
  if (now - T0 < INTRO) { const k = ease(Math.min(1, (now - T0) / INTRO)); camera.position.lerpVectors(camFrom, camTo, k); camera.lookAt(0, 0, 0); }
  else {
    if (dir) {
      const k = Math.min(1, (now - dir.t0) / 1800), e = ease(k);
      const back = now - dir.t0 > 5200 ? ease(Math.min(1, (now - dir.t0 - 5200) / 2200)) : 0;
      controls.target.lerpVectors(dir.from, dir.to, e * (1 - back));
      const want = dir.dist0 + (dir.dist1 - dir.dist0) * e * (1 - back);
      const off = camera.position.clone().sub(controls.target); off.setLength(off.length() + (want - off.length()) * .04); camera.position.copy(controls.target).add(off);
      if (back >= 1) dir = null;
    }
    controls.update();
  }
  // the AI Index breathes
  const br = 1 + Math.sin(t * 1.6) * .06; coreGlow.scale.setScalar(150 * br);
  for (const f of FAMS) hubObj[f].glow.material.opacity = .26 + Math.sin(t * 1.3 + f.length) * .08;
  // stocks flare when hit
  for (const k in stockObj) { const o = stockObj[k]; const f = o.flare ? Math.max(0, 1 - (now - o.flare) / 1800) : 0; o.glow.scale.setScalar(o.base * (1 + f * 2.2)); o.glow.material.opacity = Math.min(1, .3 + f); }
  // comets
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i], k = Math.min(1, (now - c.t0) / c.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const p = c.curve.getPoint(e); c.head.position.copy(p); c.halo.position.copy(p);
    c.tp.copyWithin(0, 3); c.tp.set([p.x, p.y, p.z], (TRAIL - 1) * 3); c.trail.geometry.attributes.position.needsUpdate = true;
    if (k >= 1 && !c.hit) { c.hit = true; c.tEnd = now; impact(c); c.head.visible = c.halo.visible = false; }
    if (c.hit) { const f = Math.max(0, 1 - (now - c.tEnd) / 700); c.trail.material.uniforms.uF.value = f; c.tp.copyWithin(0, 3); c.tp.set([p.x, p.y, p.z], (TRAIL - 1) * 3); if (f <= 0) { scene.remove(c.head, c.halo, c.trail); comets.splice(i, 1); } }
  }
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i], k = (now - r.t0) / 1500; if (k < 0) continue; if (k >= 1) { scene.remove(r.s); rings.splice(i, 1); continue; } r.s.scale.setScalar(10 + ease(k) * 230); r.s.material.opacity = (1 - k) * .9; }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i], k = (now - b.t0) / 1600; if (k >= 1) { scene.remove(b.pts); bursts.splice(i, 1); continue; }
    const a = b.pts.geometry.attributes.position, e = 1 - Math.pow(1 - k, 3);
    b.v.forEach((v, j) => a.setXYZ(j, b.p.x + v.x * e, b.p.y + v.y * e, b.p.z + v.z * e)); a.needsUpdate = true; b.pts.material.opacity = 1 - k;
  }
  if (now > raceStart) race(now);
  if (onScreen) { composer.render(); labels.render(scene, camera); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$("copy").onclick = async () => { try { await navigator.clipboard.writeText($("line").textContent); $("copy").textContent = "Copied"; setTimeout(() => $("copy").textContent = "Copy the line", 1600); } catch {} };
