/* Hollowlight - a small atmospheric silhouette platformer.
   Pure game core: no DOM access. The same file runs in the browser (playable)
   and in Node (renders the trailer and store art frame by frame). */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  var VIEW_H = 400;            // virtual units shown vertically, any aspect ratio
  var GROUND = 300;
  var GRAVITY = 1500, JUMP_V = 560, RUN = 240, PUSH = 115;

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hash(n) { return rng((n * 2654435761) >>> 0)(); }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------------------------------------------------------------- level
  var LEVEL = {
    solids: [
      { x: -800, y: 300, w: 1400, h: 300 },
      { x: 690, y: 300, w: 760, h: 300 },
      { x: 1450, y: 220, w: 900, h: 380 },
      { x: 2350, y: 300, w: 500, h: 300 },
      { x: 2960, y: 300, w: 1240, h: 300 },
      { x: 4300, y: 300, w: 1200, h: 300 },
      { x: 5500, y: 0, w: 60, h: 600 }
    ],
    crates: [{ x: 1250, y: 244, w: 56, h: 56 }],
    traps: [{ x: 950, w: 40 }, { x: 2600, w: 40 }, { x: 4450, w: 40 }],
    pendulums: [{ px: 3700, py: 40, len: 212, amp: 0.95, period: 2.6 }],
    checkpoints: [160, 740, 1500, 2400, 3000, 3450, 4320],
    goal: 4700
  };

  function createGame(opts) {
    opts = opts || {};
    var makeCanvas = opts.makeCanvas;
    var S = {
      time: 0, camX: 0, won: false, wonT: 0, fade: 1,
      p: null, crates: [], traps: [], cp: 160, apLast: false, prevJump: false,
      rain: [], embers: [], deaths: 0
    };
    var R = rng(opts.seed || 7);
    for (var i = 0; i < 170; i++) S.rain.push({ x: R() * 1400, y: R() * VIEW_H, l: 10 + R() * 16, v: 620 + R() * 260 });

    function spawn(x) {
      S.p = { x: x - 9, y: GROUND - 44, w: 18, h: 44, vx: 0, vy: 0, onGround: true, face: 1,
              runPhase: 0, coyote: 0, jumpBuf: 0, alive: true, deadT: 0, blockedT: 0, pushing: false };
      S.crates = LEVEL.crates.filter(function (c) { return true; }).map(function (c, i) {
        var old = S.crates[i];
        if (old && x > c.x + 60) return old;          // keep a crate you already solved
        return { x: c.x, y: c.y, w: c.w, h: c.h, vy: 0 };
      });
      S.traps = LEVEL.traps.map(function (t) { return { x: t.x, w: t.w, closed: false, t: 0 }; });
    }
    function reset() { S.time = 0; S.won = false; S.wonT = 0; S.cp = 160; S.crates = []; S.deaths = 0; spawn(160); S.camX = S.p.x - 300; }
    reset();

    function solidsFor(skip) {
      var list = LEVEL.solids.slice();
      for (var i = 0; i < S.crates.length; i++) if (S.crates[i] !== skip) list.push(S.crates[i]);
      return list;
    }
    function moveX(b, dx, solids) {
      // Only block movement that enters a solid from the side it is moving toward;
      // an overlap that already existed is never resolved by teleporting.
      var x0 = b.x; b.x += dx; var hit = false;
      for (var i = 0; i < solids.length; i++) {
        var s = solids[i];
        if (s === b || !overlap(b, s)) continue;
        if (dx > 0 && x0 + b.w <= s.x + 0.01) { b.x = s.x - b.w; hit = true; }
        else if (dx < 0 && x0 >= s.x + s.w - 0.01) { b.x = s.x + s.w; hit = true; }
      }
      return hit;
    }
    function moveY(b, dy, solids) {
      var y0 = b.y; b.y += dy; var landed = false, hit = false;
      for (var i = 0; i < solids.length; i++) {
        var s = solids[i];
        if (s === b || !overlap(b, s)) continue;
        if (dy > 0 && y0 + b.h <= s.y + 0.01) { b.y = s.y - b.h; landed = true; hit = true; }
        else if (dy < 0 && y0 >= s.y + s.h - 0.01) { b.y = s.y + s.h; hit = true; }
      }
      return { landed: landed, hit: hit };
    }
    function pendulumBob(pd, t) {
      var a = pd.amp * Math.sin(TAU * t / pd.period);
      return { x: pd.px + Math.sin(a) * pd.len, y: pd.py + Math.cos(a) * pd.len, a: a };
    }
    function kill() {
      if (!S.p.alive) return;
      S.p.alive = false; S.p.deadT = 0; S.deaths++;
    }
    function groundAt(x, y) {
      var list = solidsFor(null);
      for (var i = 0; i < list.length; i++) { var s = list[i]; if (x >= s.x && x <= s.x + s.w && Math.abs(s.y - y) < 8) return true; }
      return false;
    }

    // ------------------------------------------------------------ update
    function step(dt, inp) {
      inp = inp || {};
      var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (var k = 0; k < n; k++) sub(h, inp, k === 0);
      // ambient particles
      for (var i = 0; i < S.rain.length; i++) {
        var r = S.rain[i]; r.y += r.v * dt; r.x -= r.v * 0.18 * dt;
        if (r.y > VIEW_H) { r.y -= VIEW_H + 20; r.x += 60 + Math.random() * 40; }
        if (r.x < 0) r.x += 1400;
      }
      var P = S.p;
      if (P.alive && Math.random() < dt * 6) S.embers.push({ x: P.x + P.w / 2 + P.face * 11, y: P.y + 30, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 1.2 });
      for (i = S.embers.length - 1; i >= 0; i--) {
        var e = S.embers[i]; e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt;
        if (e.life <= 0) S.embers.splice(i, 1);
      }
    }

    function sub(dt, inp, first) {
      S.time += dt;
      var P = S.p;
      for (var i = 0; i < S.traps.length; i++) if (S.traps[i].closed) S.traps[i].t += dt;
      if (S.won) { S.wonT += dt; P.vx *= 0.9; return; }
      if (!P.alive) { P.deadT += dt; if (P.deadT > 1.4) spawn(S.cp); return; }

      var dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      var target = dir * (P.pushing ? PUSH : RUN);
      P.vx += (target - P.vx) * Math.min(1, dt * (P.onGround ? 14 : 5));
      if (dir) P.face = dir;
      var pressed = first && inp.jump && !S.prevJump;
      if (first) S.prevJump = !!inp.jump;
      P.coyote = P.onGround ? 0.1 : P.coyote - dt;
      P.jumpBuf = pressed ? 0.14 : P.jumpBuf - dt;
      if (P.jumpBuf > 0 && P.coyote > 0) { P.vy = -JUMP_V; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; }
      if (!inp.jump && P.vy < -200) P.vy += GRAVITY * dt * 1.2;   // short hop on early release
      P.vy = Math.min(P.vy + GRAVITY * dt, 1100);

      // horizontal, with crate pushing
      var x0 = P.x;
      moveX(P, P.vx * dt, LEVEL.solids);
      P.pushing = false;
      for (i = 0; i < S.crates.length; i++) {
        var c = S.crates[i];
        if (!overlap(P, c)) continue;
        var feetOnCrate = P.y + P.h <= c.y + 6;
        if (feetOnCrate) continue;
        if (P.onGround && Math.abs((P.y + P.h) - (c.y + c.h)) < 8) {
          var push = P.vx > 0 ? (P.x + P.w) - c.x : (P.x) - (c.x + c.w);
          var before = c.x;
          moveX(c, push, solidsFor(c));
          if (Math.abs(c.x - before) > 0.01) P.pushing = true;
        }
        if (overlap(P, c)) { if (P.x + P.w / 2 < c.x + c.w / 2) P.x = c.x - P.w; else P.x = c.x + c.w; }
      }
      var moved = Math.abs(P.x - x0);
      P.blockedT = (dir && P.onGround && moved < Math.abs(target) * dt * 0.25) ? P.blockedT + dt : 0;

      // vertical
      var r = moveY(P, P.vy * dt, solidsFor(null));
      if (r.hit) P.vy = 0;
      P.onGround = r.landed;
      if (!P.onGround) { // tiny probe keeps us grounded on flat floor
        P.y += 1; var g = false, list = solidsFor(null);
        for (i = 0; i < list.length; i++) if (overlap(P, list[i])) { g = true; break; }
        P.y -= 1; if (g && P.vy >= 0) P.onGround = true;
      }
      if (P.onGround) P.runPhase += Math.abs(P.vx) * dt * 0.055;

      // crates fall
      for (i = 0; i < S.crates.length; i++) {
        c = S.crates[i]; c.vy = Math.min(c.vy + GRAVITY * dt, 1100);
        var cr = moveY(c, c.vy * dt, solidsFor(c)); if (cr.hit) c.vy = 0;
      }

      // hazards
      if (P.y > 560) kill();
      var fx = P.x + P.w / 2, fy = P.y + P.h;
      for (i = 0; i < S.traps.length; i++) {
        var t = S.traps[i];
        if (!t.closed && fy > GROUND - 6 && fy < GROUND + 2 && fx > t.x + 4 && fx < t.x + t.w - 4) { t.closed = true; t.t = 0; kill(); }
      }
      for (i = 0; i < LEVEL.pendulums.length; i++) {
        var b = pendulumBob(LEVEL.pendulums[i], S.time);
        var nx = clamp(b.x, P.x, P.x + P.w), ny = clamp(b.y, P.y, P.y + P.h);
        if ((nx - b.x) * (nx - b.x) + (ny - b.y) * (ny - b.y) < 20 * 20) kill();
      }
      for (i = 0; i < LEVEL.checkpoints.length; i++) if (fx > LEVEL.checkpoints[i] + 30 && P.onGround && P.alive) S.cp = Math.max(S.cp, LEVEL.checkpoints[i]);
      if (fx > LEVEL.goal - 30 && P.onGround) S.won = true;
    }

    // ------------------------------------------------------------ autopilot (attract mode / trailer)
    function autopilot() {
      var P = S.p, out = { left: false, right: true, jump: false };
      S.apHold = (S.apHold || 0) - 1 / 60;
      if (!P.alive || S.won) return { left: false, right: false, jump: false };
      var want = false;
      if (P.onGround) {
        var cx = P.x + P.w / 2, front = P.x + P.w;
        if (!groundAt(cx + 38, P.y + P.h)) want = true;
        for (var i = 0; i < S.traps.length; i++) {
          var d = S.traps[i].x - front;
          if (!S.traps[i].closed && d > 2 && d < 30) want = true;
        }
        if (P.blockedT > 0.08) want = true;
        for (i = 0; i < LEVEL.pendulums.length; i++) {
          var pd = LEVEL.pendulums[i];
          if (cx > pd.px - 270 && cx < pd.px - 140 && !safeRun(pd, cx)) { out.right = false; want = false; }
        }
      }
      if (want && S.apHold <= 0 && !S.apLast) S.apHold = 0.3;
      out.jump = S.apHold > 0; S.apLast = out.jump;
      return out;
    }
    function safeRun(pd, cx) {
      for (var t = 0; t < 1.5; t += 0.02) {
        var px = cx + RUN * Math.max(0, t - 0.1), b = pendulumBob(pd, S.time + t);
        if (Math.abs(b.x - px) < 34 && b.y > GROUND - 70) return false;
      }
      return true;
    }

    // ------------------------------------------------------------ drawing
    var noise = null;
    function noiseTile() {
      if (noise || !makeCanvas) return noise;
      noise = makeCanvas(192, 192);
      var nc = noise.getContext('2d'), img = nc.createImageData(192, 192), R2 = rng(99);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = (R2() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 40;
      }
      nc.putImageData(img, 0, 0);
      return noise;
    }

    var LAYERS = [
      { par: 0.18, color: '#a3a49e', seed: 11, cell: 95, chance: 0.75, base: 330, wMin: 6, wMax: 14, fog: 0.0 },
      { par: 0.38, color: '#7b7c77', seed: 23, cell: 150, chance: 0.7, base: 325, wMin: 10, wMax: 20, fog: 0.0 },
      { par: 0.62, color: '#4a4b47', seed: 37, cell: 210, chance: 0.65, base: 318, wMin: 16, wMax: 30, fog: 0.0 },
      { par: 0.85, color: '#22231f', seed: 51, cell: 330, chance: 0.55, base: 310, wMin: 22, wMax: 40, fog: 0.0 }
    ];

    function drawTree(ctx, x, base, w, R3, top) {
      var lean = (R3() - 0.5) * 18;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.75, base + 40);
      ctx.lineTo(x - w * 0.5, base - 6);
      ctx.lineTo(x - w * 0.32 + lean, top);
      ctx.lineTo(x + w * 0.32 + lean, top);
      ctx.lineTo(x + w * 0.5, base - 6);
      ctx.lineTo(x + w * 0.75, base + 40);
      ctx.closePath(); ctx.fill();
      var nb = 2 + ((R3() * 3) | 0);
      ctx.lineCap = 'round';
      for (var b = 0; b < nb; b++) {
        var hy = base - 90 - R3() * (base - top - 120);
        var side = R3() < 0.5 ? -1 : 1;
        var len = 30 + R3() * 70, ang = -0.35 - R3() * 0.7;
        var t = (base - hy) / (base - top);
        var bx = x + lean * t, ex = bx + side * Math.cos(ang) * len, ey = hy + Math.sin(ang) * len;
        ctx.lineWidth = Math.max(1.2, w * 0.28);
        ctx.beginPath(); ctx.moveTo(bx, hy); ctx.quadraticCurveTo((bx + ex) / 2, hy - 4, ex, ey); ctx.stroke();
        ctx.lineWidth = Math.max(0.8, w * 0.12);
        ctx.beginPath(); ctx.moveTo((bx + ex) / 2 + side * 6, (hy + ey) / 2); ctx.lineTo((bx + ex) / 2 + side * (18 + R3() * 16), (hy + ey) / 2 - 18 - R3() * 14); ctx.stroke();
      }
    }

    function drawLayer(ctx, L, viewW) {
      var off = S.camX * L.par;
      var i0 = Math.floor((off - 80) / L.cell), i1 = Math.ceil((off + viewW + 80) / L.cell);
      ctx.fillStyle = ctx.strokeStyle = L.color;
      for (var i = i0; i <= i1; i++) {
        var R3 = rng(L.seed * 100003 + i * 7919);
        if (R3() > L.chance) continue;
        var x = i * L.cell + R3() * L.cell * 0.7 - off;
        var w = L.wMin + R3() * (L.wMax - L.wMin);
        drawTree(ctx, x, L.base, w, R3, -30);
      }
      ctx.fillRect(-10, L.base + 20, viewW + 20, VIEW_H);
    }

    function fogBand(ctx, viewW, y, h, a) {
      var g = ctx.createLinearGradient(0, y - h, 0, y + h);
      g.addColorStop(0, 'rgba(200,202,196,0)');
      g.addColorStop(0.5, 'rgba(200,202,196,' + a + ')');
      g.addColorStop(1, 'rgba(200,202,196,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y - h, viewW, h * 2);
    }

    function drawGrass(ctx, s) {
      var R4 = rng((s.x * 31 + s.y) | 0);
      ctx.beginPath();
      for (var x = s.x + 2; x < s.x + s.w - 2; x += 4 + R4() * 5) {
        var h = 3 + R4() * R4() * 16, lean = (R4() - 0.5) * 6 + Math.sin(S.time * 1.7 + x * 0.05) * 1.2;
        ctx.moveTo(x - 1.6, s.y + 1); ctx.lineTo(x + lean, s.y - h); ctx.lineTo(x + 1.6, s.y + 1);
      }
      ctx.fill();
    }

    function drawTrap(ctx, t) {
      var x = t.x, y = GROUND, w = t.w;
      ctx.fillStyle = ctx.strokeStyle = '#050505';
      ctx.fillRect(x - 2, y - 3, w + 4, 3);
      var close = t.closed ? Math.min(1, t.t * 14) : 0;
      var n = 6;
      for (var side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(x + w / 2, y - 2);
        ctx.rotate(side * (Math.PI / 2) * (1 - close) * 0.92);
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        for (var k = 0; k <= n; k++) {
          var px = -w / 2 + (w / n) * k;
          ctx.lineTo(px, side * -(k % 2 ? 16 : 11));
        }
        ctx.lineTo(w / 2, 0); ctx.closePath();
        ctx.globalAlpha = 1; ctx.fill();
        ctx.restore();
      }
      if (!t.closed) { // chain peg
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w / 2, y - 3); ctx.lineTo(x + w / 2 + 14, y + 4); ctx.stroke();
      }
    }

    function drawPendulum(ctx, pd) {
      var b = pendulumBob(pd, S.time);
      ctx.strokeStyle = ctx.fillStyle = '#050505';
      ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pd.px - 260, pd.py - 30); ctx.quadraticCurveTo(pd.px, pd.py + 12, pd.px + 240, pd.py - 50); ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(pd.px - 8, pd.py + 2); ctx.lineTo(b.x - 10, b.y - 10); ctx.moveTo(pd.px + 8, pd.py + 2); ctx.lineTo(b.x + 10, b.y - 10); ctx.stroke();
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-b.a);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-34, -12, 68, 24, 11); else ctx.rect(-34, -12, 68, 24);
      ctx.fill();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, -6); ctx.lineTo(42, -14); ctx.moveTo(-30, 8); ctx.lineTo(-40, 14); ctx.stroke();
      ctx.restore();
    }

    function drawPost(ctx) {
      var x = LEVEL.goal, y = GROUND;
      ctx.fillStyle = ctx.strokeStyle = '#050505';
      ctx.fillRect(x - 3, y - 120, 6, 120);
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 116); ctx.lineTo(x + 26, y - 116); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 24, y - 116); ctx.lineTo(x + 24, y - 104); ctx.stroke();
      ctx.fillRect(x + 18, y - 104, 12, 16);
    }

    function lanternPos() {
      var P = S.p, bob = P.onGround ? Math.abs(Math.sin(P.runPhase)) * 2 * Math.min(1, Math.abs(P.vx) / RUN) : 0;
      return { x: P.x + P.w / 2 + P.face * 12, y: P.y + P.h - 14 - bob };
    }

    function drawPlayer(ctx, P, t) {
      var cx = P.x + P.w / 2, fy = P.y + P.h, f = P.face;
      var run = P.onGround ? Math.min(1, Math.abs(P.vx) / RUN) : 0, ph = P.runPhase;
      var bob = P.onGround ? Math.abs(Math.sin(ph)) * 2 * run : 0;
      ctx.save(); ctx.translate(cx, fy); ctx.scale(f, 1);
      ctx.fillStyle = ctx.strokeStyle = '#040404';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var hipY = -15 - bob;
      ctx.lineWidth = 4;
      if (P.onGround) {
        for (var k = 0; k < 2; k++) {
          var a = Math.sin(ph + k * Math.PI) * 0.75 * run;
          var kx = Math.sin(a) * 8, ky = hipY + 8;
          var lift = Math.max(0, Math.cos(ph + k * Math.PI)) * 4 * run;
          ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(kx + 1, ky - lift * 0.5); ctx.lineTo(Math.sin(a) * 13, -lift); ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(5, hipY + 7); ctx.lineTo(0, hipY + 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(-4, hipY + 9); ctx.lineTo(-8, hipY + 14); ctx.stroke();
      }
      // tunic
      ctx.beginPath(); ctx.moveTo(-7, hipY + 3); ctx.lineTo(7, hipY + 3); ctx.lineTo(4.5, -32 - bob); ctx.lineTo(-4.5, -32 - bob); ctx.closePath(); ctx.fill();
      // scarf trailing behind
      var wave = Math.sin(t * 9) * (1.5 + run * 2.5), sweep = 6 + run * 10 + (P.onGround ? 0 : 6);
      ctx.beginPath();
      ctx.moveTo(-2, -33 - bob); ctx.lineTo(3, -34 - bob);
      ctx.quadraticCurveTo(-sweep * 0.6, -34 - bob + wave, -sweep - 8, -30 - bob - wave * 1.4);
      ctx.lineTo(-sweep - 6, -26 - bob - wave);
      ctx.quadraticCurveTo(-sweep * 0.5, -30 - bob + wave * 0.6, -3, -30 - bob);
      ctx.closePath(); ctx.fill();
      // head and hair
      ctx.beginPath(); ctx.arc(1, -40 - bob, 7.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -43 - bob); ctx.lineTo(-11, -46 - bob); ctx.lineTo(-4, -47 - bob); ctx.lineTo(-7, -51 - bob); ctx.lineTo(2, -48 - bob); ctx.fill();
      // back arm
      var sw = Math.sin(ph) * 0.6 * run;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-1, -29 - bob); ctx.lineTo(-4 - sw * 6, -20 - bob); ctx.stroke();
      // lantern arm
      ctx.beginPath(); ctx.moveTo(2, -29 - bob); ctx.lineTo(8, -23 - bob); ctx.lineTo(12, -24 - bob); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(12, -24 - bob); ctx.lineTo(12, -19 - bob); ctx.stroke();
      ctx.fillRect(9, -19 - bob, 6, 8);
      ctx.restore();
    }

    function drawGlow(ctx, x, y, r, a) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,196,110,' + a + ')');
      g.addColorStop(0.25, 'rgba(255,160,70,' + a * 0.45 + ')');
      g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function draw(ctx, pw, ph, o) {
      o = o || {};
      var sc = ph / VIEW_H, viewW = pw / sc, P = S.p;
      var target = P.x - viewW * 0.36;
      if (o.snapCamera) S.camX = target; else S.camX += (target - S.camX) * Math.min(1, (o.dt || 1 / 60) * 3);
      ctx.save();
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

      // sky
      var sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, '#c4c5bf'); sky.addColorStop(0.55, '#9d9e98'); sky.addColorStop(1, '#5e5f5a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, viewW, VIEW_H);

      // light shafts
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 4; i++) {
        var sx = ((i * 330 + 120 - S.camX * 0.1) % (viewW + 400) + viewW + 400) % (viewW + 400) - 200;
        var a = 0.035 + 0.02 * Math.sin(S.time * 0.4 + i * 1.7);
        ctx.fillStyle = 'rgba(255,255,248,' + a + ')';
        ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx + 60, -10); ctx.lineTo(sx + 200, VIEW_H); ctx.lineTo(sx + 70, VIEW_H); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      drawLayer(ctx, LAYERS[0], viewW); fogBand(ctx, viewW, 285, 70, 0.55);
      drawLayer(ctx, LAYERS[1], viewW); fogBand(ctx, viewW, 300, 55, 0.4);
      drawLayer(ctx, LAYERS[2], viewW); fogBand(ctx, viewW, 312, 40, 0.28);
      drawLayer(ctx, LAYERS[3], viewW);

      // world
      ctx.save(); ctx.translate(-S.camX, 0);
      ctx.fillStyle = '#060606';
      for (i = 0; i < LEVEL.solids.length; i++) {
        var s = LEVEL.solids[i];
        if (s.x > S.camX + viewW + 40 || s.x + s.w < S.camX - 40) continue;
        ctx.fillRect(s.x, s.y, s.w, s.h); drawGrass(ctx, s);
      }
      for (i = 0; i < LEVEL.pendulums.length; i++) drawPendulum(ctx, LEVEL.pendulums[i]);
      drawPost(ctx);
      for (i = 0; i < S.traps.length; i++) drawTrap(ctx, S.traps[i]);
      for (i = 0; i < S.crates.length; i++) {
        var c = S.crates[i];
        ctx.fillStyle = '#070707'; ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#1b1b1a'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(c.x + 4, c.y + 4); ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4); ctx.moveTo(c.x + c.w - 4, c.y + 4); ctx.lineTo(c.x + 4, c.y + c.h - 4); ctx.stroke();
      }
      var alive = P.alive;
      if (alive || P.deadT < 0.12) drawPlayer(ctx, P, S.time);

      // darkness with a hole around the lantern, then the warm light
      var lp = lanternPos();
      var flick = 0.9 + 0.1 * Math.sin(S.time * 23) * Math.sin(S.time * 7.3);
      var lightA = alive ? flick : Math.max(0, 1 - P.deadT * 3);
      ctx.restore();
      var lx = lp.x - S.camX, ly = lp.y;
      var dark = ctx.createRadialGradient(lx, ly, 20, lx, ly, 380);
      dark.addColorStop(0, 'rgba(0,0,0,0)');
      dark.addColorStop(1, 'rgba(0,0,0,' + (0.42 - 0.2 * lightA * 0.5) + ')');
      ctx.fillStyle = dark; ctx.fillRect(0, 0, viewW, VIEW_H);
      ctx.globalCompositeOperation = 'lighter';
      if (lightA > 0) {
        drawGlow(ctx, lx, ly, 150, 0.32 * lightA);
        drawGlow(ctx, lx, ly, 26, 0.9 * lightA);
      }
      if (S.won) {
        var wx = LEVEL.goal + 24 - S.camX, wy = GROUND - 96, k = Math.min(1, S.wonT * 0.8);
        drawGlow(ctx, wx, wy, 60 + 260 * k, 0.5 * k); drawGlow(ctx, wx, wy, 20, k);
      }
      ctx.fillStyle = 'rgba(255,190,110,0.9)';
      for (i = 0; i < S.embers.length; i++) {
        var e = S.embers[i]; ctx.globalAlpha = Math.max(0, e.life / 1.2) * 0.8;
        ctx.fillRect(e.x - S.camX, e.y, 1.6, 1.6);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      // foreground silhouettes
      var fpar = 1.35, off = S.camX * fpar;
      ctx.fillStyle = ctx.strokeStyle = '#030303';
      var c0 = Math.floor((off - 200) / 620), c1 = Math.ceil((off + viewW + 200) / 620);
      for (i = c0; i <= c1; i++) {
        var R5 = rng(9001 + i * 131);
        if (R5() < 0.45) continue;
        var fx = i * 620 + R5() * 300 - off;
        if (R5() < 0.4) drawTree(ctx, fx, VIEW_H + 30, 40 + R5() * 30, R5, -40);
        else {
          ctx.beginPath();
          for (var gb = 0; gb < 26; gb++) {
            var gx = fx + gb * 7 + R5() * 4, gh = 30 + R5() * 60;
            ctx.moveTo(gx - 3, VIEW_H + 2); ctx.lineTo(gx + (R5() - 0.5) * 20 + Math.sin(S.time + gb) * 3, VIEW_H - gh); ctx.lineTo(gx + 3, VIEW_H + 2);
          }
          ctx.fill();
        }
      }

      // rain
      ctx.strokeStyle = 'rgba(30,31,28,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < S.rain.length; i++) {
        var r = S.rain[i], rx = (r.x % (viewW + 60));
        ctx.moveTo(rx, r.y); ctx.lineTo(rx - r.l * 0.18, r.y + r.l);
      }
      ctx.stroke();

      // vignette
      var v = ctx.createRadialGradient(viewW / 2, VIEW_H * 0.48, VIEW_H * 0.3, viewW / 2, VIEW_H * 0.5, Math.max(viewW, VIEW_H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, viewW, VIEW_H);

      // film grain
      var nt = noiseTile();
      if (nt && !o.noGrain) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var pat = ctx.createPattern(nt, 'repeat');
        ctx.save(); ctx.translate(-((S.time * 997) % 192), -((S.time * 613) % 192));
        ctx.fillStyle = pat; ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, pw + 192, ph + 192);
        ctx.restore();
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
      }

      // death fade
      if (!P.alive) {
        var fd = P.deadT < 0.7 ? P.deadT / 0.7 : Math.max(0, 1 - (P.deadT - 0.9) / 0.5);
        ctx.fillStyle = 'rgba(0,0,0,' + clamp(fd, 0, 1) * 0.92 + ')'; ctx.fillRect(0, 0, viewW, VIEW_H);
      }
      ctx.restore();
    }

    return { step: step, draw: draw, autopilot: autopilot, reset: reset, state: S, level: LEVEL, drawPlayer: drawPlayer, drawGlow: drawGlow };
  }

  var api = { createGame: createGame, VIEW_H: VIEW_H };
  root.Hollowlight = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
