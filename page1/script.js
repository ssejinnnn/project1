// script.js (FULL) — EB Garamond UI font + unified HOT (amber) hover for ALL rings
// 4 rings total (visual) but ONLY outer 1,2,3 are hover/click targets
// Center hover big+glow -> click suction -> page2
// Ring click suction -> page3/4/5
// Sound toggle unlock + tick.wav relative path

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

function resize(){
  const dpr = Math.max(1, devicePixelRatio || 1);
  canvas.width  = Math.floor(innerWidth  * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize", resize);
resize();

const UI_FONT = `"EB Garamond", Garamond, Georgia, serif`;
const romans = ["XII","I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
let t = 0;

// ---- interaction state
let mood = 0;        // 0 warm / 1 cool
let depth = 0.0;
let targetDepth = 0.0;

const mouse = {
  x: innerWidth/2, y: innerHeight/2,
  tx: innerWidth/2, ty: innerHeight/2,
  down: false,
  px: innerWidth/2, py: innerHeight/2
};

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }

// ---- particles (subtle dust)
const dust = [];
function initDust(){
  dust.length = 0;
  const n = 120;
  for(let i=0;i<n;i++){
    dust.push({
      x: Math.random()*innerWidth,
      y: Math.random()*innerHeight,
      r: 0.6 + Math.random()*1.8,
      v: 0.08 + Math.random()*0.25,
      a: 0.03 + Math.random()*0.09
    });
  }
}
initDust();
addEventListener("resize", initDust);

// ---- navigation / hover
let hovered = null;        // { cx, cy, R, thick, href, title, kind:'ring'|'center' }
let centerHot = false;

let isEntering = false;
let enterP = 0;
let enterTarget = null;

// ✅ ring mapping: outer 1/2/3 -> page3/page4/page5
const RING_PAGES = [
  { title:"-- The Book of Sand (1975)", href:"../page3/index.html" },             // OUTER 1
  { title:"-- The Garden of Forking Paths (1941)", href:"../page4/index.html" },  // OUTER 2
  { title:"-- The Circular Ruins (1940)", href:"../page5/index.html" },           // OUTER 3
];

// ✅ center -> page2
const CENTER_PAGE = { title:"-- About", href:"../page2/index.html" };

function startEnter(target){
  if(isEntering) return;
  isEntering = true;
  enterP = 0;
  enterTarget = target;
}

// ---- events
function setPointer(e){
  const p = e.touches ? e.touches[0] : e;
  mouse.tx = p.clientX;
  mouse.ty = p.clientY;
}
addEventListener("pointermove", setPointer, { passive: true });
addEventListener("touchmove", setPointer, { passive: true });

addEventListener("pointerdown", (e)=>{
  mouse.down = true;
  mouse.px = e.clientX; mouse.py = e.clientY;
});
addEventListener("pointerup", ()=>{ mouse.down = false; });

// wheel depth
addEventListener("wheel", (e)=>{
  if(isEntering) return;
  targetDepth += e.deltaY * 0.0009;
  targetDepth = clamp(targetDepth, -0.8, 1.6);
}, { passive: true });

// click routing
addEventListener("click", ()=>{
  if(isEntering) return;

  // ✅ center first
  if(centerHot){
    startEnter({ kind:"center", ...CENTER_PAGE, cx: window.__innerCx ?? innerWidth/2, cy: window.__innerCy ?? innerHeight/2 });
    return;
  }

  // ✅ ring
  if(hovered && hovered.kind === "ring"){
    startEnter(hovered);
    return;
  }

  // ✅ background => mood toggle
  mood = 1 - mood;
}, { passive: true });

// ---- color palettes (idle only)
function palette(mood, i, alpha){
  const depth = i;
  if(mood === 0){
    const base = 228 - depth*1.35;
    const r = base, g = base - 20, b = base - 42;
    return {
      ringFill: `rgba(${r},${g},${b},${alpha})`,
      ringEdge: `rgba(0,0,0,${0.45*alpha})`,
      text:     `rgba(10,10,12,${0.9*alpha})`,
      glow:     `rgba(255,200,140,${0.10*alpha})`,
      accent:   `rgba(255,255,255,${0.85*alpha})`,
      second:   `rgba(255,255,255,${0.42*alpha})`
    };
  }else{
    const base = 235 - depth*1.25;
    const r = base - 18, g = base - 6, b = base;
    return {
      ringFill: `rgba(${r},${g},${b},${alpha})`,
      ringEdge: `rgba(0,0,0,${0.42*alpha})`,
      text:     `rgba(5,8,12,${0.92*alpha})`,
      glow:     `rgba(120,200,255,${0.10*alpha})`,
      accent:   `rgba(255,255,255,${0.85*alpha})`,
      second:   `rgba(255,255,255,${0.40*alpha})`
    };
  }
}

// ✅ center portal
function drawCenterPortal(cx, cy, hot=false){
  const r0 = 64;

  const g0 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0);
  g0.addColorStop(0, "rgba(0,0,0,0.95)");
  g0.addColorStop(0.55, "rgba(0,0,0,0.88)");
  g0.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g0;
  ctx.beginPath();
  ctx.arc(cx, cy, r0, 0, Math.PI*2);
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = mood === 0 ? "rgba(255,200,140,0.22)" : "rgba(120,200,255,0.22)";
  const hotGlow = mood === 0 ? "rgba(255,190,120,0.60)" : "rgba(140,220,255,0.60)";

  const g1 = ctx.createRadialGradient(cx, cy, 10, cx, cy, 62);
  g1.addColorStop(0, "rgba(0,0,0,0)");
  g1.addColorStop(0.45, hot ? hotGlow : glow);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // hub rings
  ctx.strokeStyle = hot ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = hot ? 2 : 1;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI*2); ctx.stroke();

  ctx.strokeStyle = hot ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI*2); ctx.stroke();

  // center cap
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hot ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.14)";
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.stroke();
}

// ✅ UNIFIED HOT LOOK (matches your RIGHT reference)
// IMPORTANT: these override ALL rings when hot, so rings won't differ.
const HOT_GLOW = "rgba(255, 196, 120, 0.70)";   // outer halo
const HOT_EDGE = "rgba(255, 205, 135, 0.95)";   // bright rim
const IDLE_GLOW = "rgba(255, 190, 110, 0.06)";  // subtle idle halo (optional)

// 바디/숫자 고정 (핵심!)
const HOT_BODY = "rgba(225, 196, 140, 0.92)";   // beige body like your reference
const HOT_NUM  = "rgba(10, 10, 12, 0.92)";      // numerals stay dark and clear

// ✅ ring drawing
function drawRing(cx, cy, R, thickness, rot, alpha, layerIndex, hot=false){
  const P = palette(mood, layerIndex, alpha);

  const hotScale = hot ? 1.14 : 1.0;          // ONLY scale on hot
  const hotEdgeA = hot ? 0.95 : 0.18;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(hotScale, hotScale);
  ctx.translate(-cx, -cy);

  // glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = hot ? HOT_GLOW : IDLE_GLOW;
  ctx.beginPath();
  ctx.arc(cx, cy, R + thickness*1.25, 0, Math.PI*2);
  ctx.fill();

  if(hot){
    // bright outer rim
    ctx.strokeStyle = HOT_EDGE;
    ctx.lineWidth = Math.max(4.6, thickness*0.34);
    ctx.beginPath();
    ctx.arc(cx, cy, R + thickness*0.86, 0, Math.PI*2);
    ctx.stroke();

    // extra inner highlight line (gives that “double rim” feel)
    ctx.strokeStyle = "rgba(255, 210, 140, 0.85)";
    ctx.lineWidth = Math.max(2.2, thickness * 0.18);
    ctx.beginPath();
    ctx.arc(cx, cy, R + thickness*0.52, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();

  // body (✅ hot이면 바디 자체가 고정 베이지로)
  ctx.fillStyle = hot ? HOT_BODY : P.ringFill;
  ctx.beginPath();
  ctx.arc(cx, cy, R + thickness*0.55, 0, Math.PI*2);
  ctx.fill();

  // hole
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, R - thickness), 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // edge
  ctx.strokeStyle = hot ? `rgba(255, 205, 135, ${hotEdgeA})` : P.ringEdge;
  ctx.lineWidth   = hot ? Math.max(3.6, thickness*0.28) : Math.max(1, thickness*0.11);
  ctx.beginPath();
  ctx.arc(cx, cy, R + thickness*0.18, 0, Math.PI*2);
  ctx.stroke();

  // numerals
  ctx.fillStyle = hot ? HOT_NUM : P.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontPx = Math.max(9, 26*(R/260));
  ctx.font = `${fontPx}px ${UI_FONT}`;

  const rr = R - thickness*0.35;
  for(let k=0;k<12;k++){
    const a = (k/12)*Math.PI*2 + rot;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(a + Math.PI/2);
    ctx.fillText(romans[k], 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawHands(cx, cy){
  const now = new Date();
  const sec = now.getSeconds() + now.getMilliseconds()/1000;
  const min = now.getMinutes() + sec/60;
  const hr  = (now.getHours()%12) + min/60;

  const secA = (sec/60)*Math.PI*2 - Math.PI/2;
  const minA = (min/60)*Math.PI*2 - Math.PI/2;
  const hrA  = (hr/12)*Math.PI*2 - Math.PI/2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = mood === 0 ? "rgba(255,200,140,0.08)" : "rgba(120,200,255,0.08)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minA)*270, cy + Math.sin(minA)*270);
  ctx.stroke();
  ctx.restore();

  const P = palette(mood, 0, 1);
  ctx.lineCap = "round";

  // hour
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hrA)*150, cy + Math.sin(hrA)*90);
  ctx.stroke();

  // minute
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minA)*285, cy + Math.sin(minA)*285);
  ctx.stroke();

  // second
  ctx.strokeStyle = P.second;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(secA)*640, cy + Math.sin(secA)*640);
  ctx.stroke();
}

function drawDust(){
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(const p of dust){
    p.y += p.v;
    p.x += Math.sin((p.y + t*0.35)*0.01) * 0.12;
    if(p.y > innerHeight + 10){
      p.y = -10;
      p.x = Math.random()*innerWidth;
    }
    ctx.fillStyle = `rgba(255,255,255,${p.a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function vignette(cx, cy){
  const w = innerWidth, h = innerHeight;
  const g = ctx.createRadialGradient(cx,cy, 0, cx,cy, Math.min(w,h)*0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
}

function background(){
  const w = innerWidth, h = innerHeight;
  ctx.fillStyle = mood === 0 ? "rgb(6,5,7)" : "rgb(4,6,8)";
  ctx.fillRect(0,0,w,h);

  const cx = innerWidth/2, cy = innerHeight/2;
  const g = ctx.createRadialGradient(cx,cy, 0, cx,cy, Math.min(w,h)*0.65);
  g.addColorStop(0, mood === 0 ? "rgba(255,200,140,0.06)" : "rgba(120,200,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
}

/* DOM */
const enterBtn = document.getElementById("enterBtn");
const toggle = document.getElementById("soundToggle");

/* center hover styling helper */
function syncEnterBtn(centerCx, centerCy){
  if(!enterBtn) return;
  const cx0 = innerWidth/2, cy0 = innerHeight/2;
  enterBtn.style.setProperty("--dx", (centerCx - cx0) + "px");
  enterBtn.style.setProperty("--dy", (centerCy - cy0) + "px");
  enterBtn.classList.toggle("isHot", centerHot && !isEntering);
}

/* hover title (UI clarity) */
function drawHoverTitle(){
  if(isEntering) return;
  if(!(hovered && hovered.kind === "ring")) return;

  const w = innerWidth, h = innerHeight;

  ctx.save();
  ctx.globalAlpha = 1;

  // plate
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  const plateW = Math.min(640, w * 0.74);
  const plateH = 36;
  const x = w/2 - plateW/2;
  const y = h/2 + 190 - plateH/2;
  ctx.beginPath();
  ctx.roundRect(x, y, plateW, plateH, 18);
  ctx.fill();

  // title (slightly warm)
  ctx.fillStyle = "rgba(255, 248, 236, 0.95)";
  ctx.font = `18px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255, 205, 135, 0.25)";
  ctx.shadowBlur = 18;
  ctx.fillText(hovered.title, w/2, h/2 + 190);
  ctx.restore();
}

/* MAIN LOOP */
function draw(){
  t += 1;

  depth = lerp(depth, targetDepth, 0.08);
  mouse.x = lerp(mouse.x, mouse.tx, 0.10);
  mouse.y = lerp(mouse.y, mouse.ty, 0.10);

  const w = innerWidth;
  const h = innerHeight;

  background();

  const cx0 = w/2;
  const cy0 = h/2;

  const parX = (mouse.x - cx0) * 0.10;
  const parY = (mouse.y - cy0) * 0.10;

  // Force exactly 4 visible rings
  const rings = 4;
  const baseR = Math.min(w,h) * (0.40 + depth*0.05);

  // ring geometry
  const ringGeoms = [];
  let innerCx = cx0;
  let innerCy = cy0;
  let bestRi = Infinity;

  for(let i=0;i<rings;i++){
    const depth01 = i/(rings-1);

    const shrinkBase = 0.60 - depth*0.02;
    const shrink = Math.pow(shrinkBase, i);

    const Ri = baseR * shrink;
    const thickness = Math.max(10, 34 * shrink);

    const drift = (14 + depth*8) * (1 - shrink);
    const wobble = 0.55 + depth*0.12;

    const sx = drift * Math.cos(i * 0.36 + t*0.002*wobble) + parX * (0.25 + depth01*0.9);
    const sy = drift * Math.sin(i * 0.34 + t*0.002*wobble) + parY * (0.25 + depth01*0.9);

    const cx = cx0 + sx;
    const cy = cy0 + sy;

    const dir = (i % 2 === 0) ? 1 : -1;
    const speed = 0.004 + i*0.00034 + depth*0.0008;
    const rot = dir * t * speed;

    const alpha = 0.95 * (1 - depth01*0.60);

    if(Ri < bestRi){
      bestRi = Ri;
      innerCx = cx;
      innerCy = cy;
    }

    ringGeoms.push({ Ri, thick: thickness, cx, cy, rot, alpha, layerIndex: i });
  }

  // store for click handler
  window.__innerCx = innerCx;
  window.__innerCy = innerCy;

  // sort outer -> inner
  ringGeoms.sort((a,b)=> b.Ri - a.Ri);

  const clickableRanks = new Set([0,1,2]);

  // hover detection
  let bestHit = null;
  let bestScore = Infinity;

  for(let r=0;r<ringGeoms.length;r++){
    const g = ringGeoms[r];

    const dxm = mouse.x - g.cx;
    const dym = mouse.y - g.cy;
    const dist = Math.hypot(dxm, dym);

    const outer = g.Ri + g.thick*0.80;
    const inner = Math.max(0, g.Ri - g.thick*1.15);
    const inBand = (dist <= outer && dist >= inner);

    if(inBand && clickableRanks.has(r) && !isEntering){
      const mid = (outer + inner) * 0.5;
      const score = Math.abs(dist - mid);

      if(score < bestScore){
        bestScore = score;

        const page = RING_PAGES[r];
        bestHit = {
          kind:"ring",
          cx: g.cx, cy: g.cy, R: g.Ri, thick: g.thick,
          href: page.href, title: page.title
        };
      }
    }

    const hot = bestHit && bestHit.kind==="ring" && Math.abs(bestHit.R - g.Ri) < 0.001;
    drawRing(g.cx, g.cy, g.Ri, g.thick, g.rot, g.alpha, g.layerIndex, hot);
  }

  hovered = bestHit;

  // center hover
  const centerR = 72;
  centerHot = (!isEntering && (Math.hypot(mouse.x - innerCx, mouse.y - innerCy) <= centerR));

  // cursor
  canvas.style.cursor = isEntering ? "default"
    : (centerHot || hovered ? "pointer" : (mouse.down ? "grabbing" : "grab"));

  drawDust();
  vignette(cx0, cy0);

  // center hands/portal
  drawHands(innerCx, innerCy);
  drawCenterPortal(innerCx, innerCy, centerHot);

  // hover title overlay
  drawHoverTitle();

  // move DOM center button
  syncEnterBtn(innerCx, innerCy);

  // ENTER SUCTION TRANSITION
  if(isEntering && enterTarget){
    enterP = Math.min(1, enterP + 0.010);

    targetDepth = clamp(targetDepth + 0.016, -0.8, 2.6);
    t += 8;

    const zx = enterTarget.cx ?? innerCx;
    const zy = enterTarget.cy ?? innerCy;
    const s = 1 + enterP*3.8;

    ctx.save();
    ctx.translate(zx, zy);
    ctx.scale(s, s);
    ctx.translate(-zx, -zy);
    ctx.fillStyle = `rgba(0,0,0,${0.20*enterP})`;
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    ctx.fillStyle = `rgba(0,0,0,${0.78*enterP})`;
    ctx.fillRect(0,0,w,h);

    ctx.save();
    ctx.globalAlpha = 1 - enterP*0.25;
    ctx.fillStyle = "rgba(253, 246, 233, 0.95)";
    ctx.font = `18px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255, 205, 135, 0.22)";
    ctx.shadowBlur = 18;
    ctx.fillText(enterTarget.title, w/2, h/2 + 140);
    ctx.restore();

    if(enterP >= 1){
      window.location.href = enterTarget.href;
      return;
    }
  }

  requestAnimationFrame(draw);
}

draw();

/* CENTER BUTTON: click -> page2 */
if(enterBtn){
  enterBtn.addEventListener("click", (e)=>{
    e.stopPropagation();
    if(isEntering) return;
    startEnter({ kind:"center", ...CENTER_PAGE, cx: window.__innerCx ?? innerWidth/2, cy: window.__innerCy ?? innerHeight/2 });
  });
}

/* SOUND */
const tick = new Audio("/Users/sejin/Documents/Parsons/interaction stu/project1/tick.wav"); // ✅ relative path
tick.loop = true;
tick.volume = 0.35;

// default OFF
toggle.checked = false;

// unlock on gesture (toggle switch)
const switchEl = document.querySelector(".switch");
let audioUnlocked = false;

switchEl?.addEventListener("pointerdown", async ()=>{
  if(audioUnlocked) return;
  try{
    await tick.play();
    tick.pause();
    audioUnlocked = true;
  }catch(e){}
});

toggle.addEventListener("change", async ()=>{
  if(toggle.checked){
    try{ await tick.play(); }catch(e){}
  }else{
    tick.pause();
  }
});