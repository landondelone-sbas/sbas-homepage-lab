// Option B: "Work flows in, gets handled". The SBAS mark is built from thousands of
// points of light. Streams of "work" flow into its centre, it pulses as each piece
// arrives, and tidy finished dots slide out the other side. Hover any
// "Book Discovery Call" button and the points morph into the SBAS robot; move away
// and they flow back into the mark. The cursor (or a finger) still pushes the
// points around, and a click or tap sets off a burst.
(() => {
  const stage = document.querySelector('.lab-b');
  const canvas = document.getElementById('logoField');
  if (!stage || !canvas) return;

  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 620px)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  const COUNT = small ? 2200 : 4400;
  const PACKETS = small ? 36 : 70;
  const COLORS = ['#f2c27a', '#f2c27a', '#f2c27a', '#bf7e34', '#bf7e34', '#ffffff'];

  let W = 0;
  let H = 0;
  let particles = [];
  let packets = [];
  let outbound = [];
  let rings = [];
  let time = 0;
  let morph = 0; // 0 = logo, 1 = robot (eased)
  let mode = 'logo';
  let pulse = 0;
  let arrivals = 0;
  let running = false;
  let frameId = 0;
  const mouse = { x: -9999, y: -9999, active: false };

  const logo = new Image();
  logo.src = window.LAB_LOGO || 'assets/logo-icon.png';

  function sizeCanvas() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width;
    H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const centre = () => ({ x: W / 2, y: H / 2 - 8 });

  // ---------- shapes ----------
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Which face the robot wears when it appears: 'happy' (smiling, like the pointing pose)
  // or 'calm' (tall oval eyes and a flat mouth, like the waving pose on the homepage).
  const FACE = 'happy';
  const UPPER = Math.PI + 0.02; // direction of the waving upper arm (straight out to the left)

  // The SBAS robot, drawn from simple shapes on a 400 x 400 grid, following the mascot:
  // squarish head with a framed screen, round headphone ears, the SBAS mark on a dark
  // chest panel, a waving open hand on the left, and chunky feet. The parts painted
  // red (eyes, mouth, screen icons, antenna bulb) are the ones that will glow.
  function drawRobot(g, size) {
    const s = size / 400;
    const glowColor = '#ff0000';
    g.save();
    g.scale(s, s);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffffff';
    g.lineCap = 'round';

    // headphone ears (discs with a hole), drawn behind the head
    [[104, 126], [296, 126]].forEach(([x, y]) => {
      g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill();
    });

    // antenna stalk
    g.fillRect(197, 18, 6, 34);

    // head shell, neck, body
    rr(g, 100, 48, 200, 150, 50); g.fill();
    rr(g, 182, 194, 36, 18, 6); g.fill();
    rr(g, 122, 208, 156, 116, 50); g.fill();

    // legs and chunky feet
    rr(g, 146, 318, 40, 38, 16); g.fill();
    rr(g, 214, 318, 40, 38, 16); g.fill();
    rr(g, 136, 348, 58, 26, 13); g.fill();
    rr(g, 206, 348, 58, 26, 13); g.fill();

    // arm hanging on the right: shoulder pad, forearm, hand
    rr(g, 270, 222, 40, 62, 18); g.fill();
    rr(g, 282, 282, 24, 48, 11); g.fill();
    g.beginPath(); g.arc(294, 336, 13, 0, Math.PI * 2); g.fill();

    // arm waving on the left: upper arm, forearm, open hand
    g.save();
    g.translate(134, 240);
    g.rotate(UPPER);
    rr(g, 0, -13, 70, 26, 12); g.fill(); // upper arm
    g.restore();
    const elbow = { x: 134 + Math.cos(UPPER) * 70, y: 240 + Math.sin(UPPER) * 70 };
    const up = -Math.PI / 2 - 0.12;
    g.save();
    g.translate(elbow.x, elbow.y);
    g.rotate(up);
    rr(g, -4, -14, 58, 28, 13); g.fill(); // forearm
    g.restore();
    const palm = { x: elbow.x + Math.cos(up) * 64, y: elbow.y + Math.sin(up) * 64 };
    g.beginPath(); g.arc(palm.x, palm.y, 17, 0, Math.PI * 2); g.fill();
    [-0.62, -0.2, 0.2, 0.62].forEach((a) => {
      g.save();
      g.translate(palm.x, palm.y);
      g.rotate(up + a);
      rr(g, 8, -5, 25, 10, 5); g.fill(); // finger
      g.restore();
    });

    // ---- cut-outs (dark parts) ----
    g.globalCompositeOperation = 'destination-out';
    rr(g, 118, 66, 164, 116, 36); g.fill(); // screen
    [[104, 126], [296, 126]].forEach(([x, y]) => {
      g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); // hole in each ear
    });
    rr(g, 152, 224, 96, 84, 28); g.fill(); // dark chest panel
    g.fillRect(132, 308, 136, 5); // belt gap
    g.save(); // cuff gap on the waving forearm
    g.translate(elbow.x, elbow.y);
    g.rotate(up);
    g.fillRect(32, -16, 5, 32);
    g.restore();
    g.globalCompositeOperation = 'source-over';

    // screen frame, the SBAS mark on the chest
    g.fillStyle = '#ffffff';
    g.lineWidth = 3;
    rr(g, 125, 73, 150, 102, 31); g.stroke();
    if (logo.complete && logo.naturalWidth) g.drawImage(logo, 168, 232, 64, 64);

    // ---- the glowing parts ----
    g.fillStyle = glowColor;
    g.strokeStyle = glowColor;
    g.beginPath(); g.arc(200, 14, 9, 0, Math.PI * 2); g.fill(); // antenna bulb
    if (FACE === 'happy') {
      g.lineWidth = 8;
      g.beginPath(); g.arc(166, 124, 17, Math.PI, Math.PI * 2); g.stroke(); // ^ eyes
      g.beginPath(); g.arc(234, 124, 17, Math.PI, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(200, 138, 20, 0, Math.PI); g.fill(); // smile
    } else {
      g.beginPath(); g.ellipse(166, 112, 13, 22, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(234, 112, 13, 22, 0, 0, Math.PI * 2); g.fill();
      rr(g, 178, 152, 44, 5, 2.5); g.fill();
    }
    g.lineWidth = 3;
    rr(g, 132, 150, 28, 20, 4); g.stroke(); // little window icon
    rr(g, 242, 150, 28, 20, 4); g.stroke(); // little code icon
    g.restore();
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  // Read solid pixels off an offscreen canvas as target positions.
  function sampleCanvas(off, left, top, eyeAware) {
    const w = off.width;
    const h = off.height;
    const data = off.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const alpha = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? data[(y * w + x) * 4 + 3] : 0);
    const margin = eyeAware ? 0 : 2; // logo: stay just inside the edge so petal gaps read
    const body = [];
    const eyes = [];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        if (data[i + 3] <= 245) continue;
        if (margin && !(alpha(x - margin, y) > 245 && alpha(x + margin, y) > 245 && alpha(x, y - margin) > 245 && alpha(x, y + margin) > 245)) continue;
        const point = { x: x + left, y: y + top, eye: false };
        if (eyeAware && data[i] > 200 && data[i + 1] < 90 && data[i + 2] < 90) {
          point.eye = true;
          eyes.push(point);
        } else {
          body.push(point);
        }
      }
    }
    return { body: shuffle(body), eyes: shuffle(eyes) };
  }

  function fit(list, count) {
    if (!list.length) return [];
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const base = list[i % list.length];
      out.push(i < list.length ? base : { x: base.x + (Math.random() - 0.5) * 2, y: base.y + (Math.random() - 0.5) * 2, eye: base.eye });
    }
    return out;
  }

  function makeTargets() {
    const size = Math.min(W, H) * 0.8;
    const c = centre();

    // Logo
    const aspect = logo.naturalWidth / logo.naturalHeight;
    const dw = Math.round(aspect >= 1 ? size : size * aspect);
    const dh = Math.round(aspect >= 1 ? size / aspect : size);
    const lo = document.createElement('canvas');
    lo.width = dw;
    lo.height = dh;
    lo.getContext('2d').drawImage(logo, 0, 0, dw, dh);
    const logoPts = fit(sampleCanvas(lo, c.x - dw / 2, c.y - dh / 2, false).body, COUNT);

    // Robot
    const rs = Math.round(size);
    const ro = document.createElement('canvas');
    ro.width = rs;
    ro.height = rs;
    drawRobot(ro.getContext('2d'), rs);
    const sampled = sampleCanvas(ro, c.x - rs / 2, c.y - rs / 2, true);
    const eyeCount = Math.min(sampled.eyes.length, Math.round(COUNT * 0.04));
    const robotPts = shuffle(fit(sampled.body, COUNT - eyeCount).concat(fit(sampled.eyes, eyeCount)));

    // Pair left-to-right so the morph sweeps across instead of swirling at random.
    const byX = (a, b) => a.x + Math.random() * 30 - (b.x + Math.random() * 30);
    logoPts.sort(byX);
    robotPts.sort(byX);
    return { logoPts, robotPts };
  }

  function build(keep) {
    const { logoPts, robotPts } = makeTargets();
    particles = logoPts.map((lp, i) => {
      const rp = robotPts[i];
      const old = keep && particles[i];
      return {
        lx: lp.x,
        ly: lp.y,
        rx: rp.x,
        ry: rp.y,
        eye: rp.eye,
        delay: Math.random(),
        x: old ? old.x : Math.random() * W,
        y: old ? old.y : Math.random() * H,
        vx: 0,
        vy: 0,
        size: 0.9 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[i % COLORS.length]
      };
    });
  }

  // ---------- flowing work ----------
  function newPacket(stagger) {
    const side = Math.random();
    let sx;
    let sy;
    if (side < 0.5) { sx = -12; sy = Math.random() * H; } // from the left
    else if (side < 0.75) { sx = Math.random() * W * 0.7; sy = -12; } // from the top
    else { sx = Math.random() * W * 0.7; sy = H + 12; } // from the bottom
    return {
      sx,
      sy,
      bend: (Math.random() - 0.5) * 0.7,
      t: stagger ? -Math.random() * 1.6 : 0,
      speed: 0.004 + Math.random() * 0.004,
      jx: (Math.random() - 0.5) * 34,
      jy: (Math.random() - 0.5) * 34,
      trail: []
    };
  }

  function packetPos(p, t) {
    const c = centre();
    const ex = c.x + p.jx;
    const ey = c.y + p.jy;
    const mx = (p.sx + ex) / 2 + (ey - p.sy) * p.bend;
    const my = (p.sy + ey) / 2 - (ex - p.sx) * p.bend;
    const u = 1 - t;
    return { x: u * u * p.sx + 2 * u * t * mx + t * t * ex, y: u * u * p.sy + 2 * u * t * my + t * t * ey };
  }

  function stepPackets() {
    for (let i = 0; i < packets.length; i += 1) {
      const p = packets[i];
      p.t += p.speed;
      if (p.t < 0) continue;
      if (p.t >= 1) {
        // Arrived: the mark pulses, a ring leaves, and sometimes a finished dot slides out.
        arrivals += 1;
        pulse = Math.min(1, pulse + 0.22);
        if (rings.length < 6) rings.push({ r: 0, a: 0.4 });
        if (Math.random() < 0.45) {
          const c = centre();
          const lane = Math.floor(Math.random() * 3) - 1;
          outbound.push({ x: c.x + Math.min(W, H) * 0.34, y: c.y + lane * 16, life: 1 });
        }
        packets[i] = newPacket(false);
        continue;
      }
      const eased = p.t * p.t * (1.6 - 0.6 * p.t);
      const pos = packetPos(p, eased);
      p.trail.push(pos);
      if (p.trail.length > 7) p.trail.shift();
    }
    for (let i = outbound.length - 1; i >= 0; i -= 1) {
      outbound[i].x += 2.4;
      outbound[i].life -= 0.006;
      if (outbound[i].life <= 0 || outbound[i].x > W + 10) outbound.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      rings[i].r += 1.6;
      rings[i].a -= 0.009;
      if (rings[i].a <= 0) rings.splice(i, 1);
    }
    pulse *= 0.96;
  }

  // ---------- main loop ----------
  function step() {
    time += 1 / 60;
    morph += ((mode === 'robot' ? 1 : 0) - morph) * 0.05;
    if (Math.abs((mode === 'robot' ? 1 : 0) - morph) < 0.001) morph = mode === 'robot' ? 1 : 0;

    const radius = small ? 70 : 95;
    const radius2 = radius * radius;
    for (const p of particles) {
      // Each point leaves a little later than the last, so the change ripples through.
      const m = Math.min(1, Math.max(0, (morph - p.delay * 0.4) / 0.6));
      const e = m * m * (3 - 2 * m);
      const tx = p.lx + (p.rx - p.lx) * e + Math.sin(time * 1.2 + p.phase) * 0.8;
      const ty = p.ly + (p.ry - p.ly) * e + Math.cos(time * 1.1 + p.phase) * 0.8;
      p.vx += (tx - p.x) * 0.012;
      p.vy += (ty - p.y) * 0.012;
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius2) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / radius) * 3.4;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;
    }
    if (!reduced) stepPackets();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const c = centre();

    // Glow behind the shape: breathes, and flares when work arrives.
    const glow = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, Math.min(W, H) * 0.52);
    const strength = 0.14 + Math.sin(time * 1.4) * 0.03 + pulse * 0.22;
    glow.addColorStop(0, `rgba(242, 194, 122, ${strength})`);
    glow.addColorStop(1, 'rgba(242, 194, 122, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Rings from each arrival.
    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, ring.r + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(242, 194, 122, ${Math.max(0, ring.a)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // The mark (or robot).
    for (const p of particles) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * 2.2 + p.phase * 3);
      const lit = p.eye && morph > 0.6;
      ctx.globalAlpha = lit ? 1 : p.color === '#ffffff' ? twinkle * 0.9 : 0.55 + twinkle * 0.45;
      ctx.fillStyle = lit ? '#ffb347' : p.color;
      const s = lit ? p.size + 0.9 : p.size;
      ctx.fillRect(p.x, p.y, s, s);
    }

    // Work flowing in: dim, wandering streaks.
    for (const p of packets) {
      const n = p.trail.length;
      for (let j = 0; j < n; j += 1) {
        ctx.globalAlpha = (j / n) * 0.7;
        ctx.fillStyle = '#d9954a';
        const s = 1 + (j / n) * 1.6;
        ctx.fillRect(p.trail[j].x, p.trail[j].y, s, s);
      }
    }

    // Finished work leaving: neat, bright, evenly spaced lanes.
    for (const o of outbound) {
      ctx.globalAlpha = Math.min(1, o.life * 1.4);
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(o.x - 5, o.y, 5, 1.6);
      ctx.fillRect(o.x, o.y - 0.4, 2.6, 2.6);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame() {
    step();
    draw();
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
  }

  // ---------- input ----------
  function burst() {
    for (const p of particles) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      p.vx += Math.cos(angle) * speed;
      p.vy += Math.sin(angle) * speed;
    }
  }

  function setMouse(event) {
    const box = canvas.getBoundingClientRect();
    mouse.x = event.clientX - box.left;
    mouse.y = event.clientY - box.top;
    mouse.active = true;
  }

  canvas.addEventListener('pointermove', setMouse);
  canvas.addEventListener('pointerdown', (event) => {
    setMouse(event);
    burst();
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.active = false;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') mouse.active = false;
  });

  function setMode(next) {
    mode = next;
    if (reduced) {
      // No animation: switch straight to the finished shape.
      morph = next === 'robot' ? 1 : 0;
      settle();
      draw();
    }
  }

  // "Book Discovery Call" buttons: hover or keyboard focus turns the mark into the robot.
  const ctas = document.querySelectorAll('a[href$="payment.html"]');
  ctas.forEach((el) => {
    el.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') setMode('robot');
    });
    el.addEventListener('pointerleave', () => setMode('logo'));
    el.addEventListener('focus', () => setMode('robot'));
    el.addEventListener('blur', () => setMode('logo'));
  });

  // Phones can't hover, so give them a taste: the robot appears briefly every so often.
  if (!canHover && !reduced) {
    let guard = 0;
    setInterval(() => {
      if (!running || mouse.active) return;
      setMode('robot');
      clearTimeout(guard);
      guard = setTimeout(() => setMode('logo'), 2800);
    }, 9000);
  }

  function settle() {
    for (const p of particles) {
      const m = morph;
      p.x = p.lx + (p.rx - p.lx) * m;
      p.y = p.ly + (p.ry - p.ly) * m;
      p.vx = 0;
      p.vy = 0;
    }
  }

  function init() {
    sizeCanvas();
    build(false);
    packets = Array.from({ length: PACKETS }, () => newPacket(true));
    if (reduced) {
      settle();
      draw();
      return;
    }
    start();
  }

  // Rebuild when the stage changes size (rotating a phone, resizing the window).
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!particles.length) return;
      sizeCanvas();
      build(true);
      if (reduced) {
        settle();
        draw();
      }
    }, 150);
  }).observe(stage);

  // Save battery: pause while off screen or in a background tab.
  new IntersectionObserver((entries) => {
    if (!particles.length) return;
    if (entries.some((entry) => entry.isIntersecting)) start();
    else stop();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (particles.length) start();
  });

  // Hook for testing: advance the simulation without waiting on the browser's frame timer.
  window.__lab = {
    step(frames = 1) {
      for (let i = 0; i < frames; i += 1) step();
      draw();
    },
    setMode,
    stats: () => ({
      mode,
      morph: Number(morph.toFixed(3)),
      points: particles.length,
      eyes: particles.filter((p) => p.eye).length,
      packetsFlying: packets.filter((p) => p.t > 0 && p.t < 1).length,
      arrivals,
      outbound: outbound.length
    })
  };

  if (logo.complete && logo.naturalWidth) init();
  else logo.addEventListener('load', init);
})();
