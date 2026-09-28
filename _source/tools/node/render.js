// Renders the Hollowlight trailer and store art from the real game code.
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const H = require('../../portfolio/game/hollowlight.js');

const OUT = path.join(__dirname, '..', '..', 'portfolio');
const GAME_OUT = path.join(OUT, 'game', 'art');
fs.mkdirSync(GAME_OUT, { recursive: true });
const FF = execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

GlobalFonts.registerFromPath('C:/Windows/Fonts/constan.ttf', 'TitleSerif');
GlobalFonts.registerFromPath('C:/Windows/Fonts/bahnschrift.ttf', 'Display');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf', 'Body');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf', 'BodyBold');

const game = H.createGame({ seed: 7, makeCanvas: (w, h) => createCanvas(w, h) });
const S = game.state;
const FPS = 30, DT = 1 / FPS;

// trailer cut list: [simStart, simEnd] in seconds of the autopilot run
const CUTS = [[1.2, 4.2], [4.7, 7.3], [14.6, 17.0], [19.0, 21.0]];
const TRAILER_LEN = CUTS.reduce((a, c) => a + (c[1] - c[0]), 0);
const STILLS = { 2.35: 'pit', 5.4: 'crate', 15.5: 'log', 20.95: 'light', 6.9: 'climb' };

function spaced(ctx, text, x, y, spacing) {
  let w = 0; for (const ch of text) w += ctx.measureText(ch).width + spacing; w -= spacing;
  let cx = x - w / 2;
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  return w;
}
function title(ctx, W, Hh, a, sub) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, W, Hh);
  ctx.globalAlpha = a; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ecebe4';
  ctx.font = `${Math.round(Hh * 0.13)}px TitleSerif`;
  spaced(ctx, 'HOLLOWLIGHT', W / 2, Hh * 0.45, Hh * 0.022);
  if (sub) {
    ctx.fillStyle = '#ffb048';
    ctx.font = `${Math.round(Hh * 0.032)}px Body`;
    spaced(ctx, sub.toUpperCase(), W / 2, Hh * 0.58, Hh * 0.006);
  }
  ctx.restore();
}

// ---------------------------------------------------------- trailer
const TW = 1280, TH = 720;
const tc = createCanvas(TW, TH), tctx = tc.getContext('2d');
const cam = createCanvas(64, 36), camctx = cam.getContext('2d');
const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${TW}x${TH}`, '-r', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'video', 'hollowlight_trailer.mp4')]);

const stills = {};
let outT = 0;
const END = CUTS[CUTS.length - 1][1];
(async () => {
  for (let f = 0; f * DT < END + DT; f++) {
    const t = f * DT;
    game.step(DT, game.autopilot());
    game.draw(camctx, 64, 36, { dt: DT, noGrain: true });        // keeps the camera easing continuous
    for (const [k, name] of Object.entries(STILLS)) if (Math.abs(t - k) < DT / 2) stills[name] = { camX: S.camX };
    const ci = CUTS.findIndex(c => t >= c[0] && t < c[1]);
    if (ci < 0) {
      for (const [k, name] of Object.entries(STILLS)) if (Math.abs(t - k) < DT / 2) renderStills(name);
      continue;
    }
    const saved = S.camX;
    game.draw(tctx, TW, TH, { dt: 0 });
    S.camX = saved;
    const local = t - CUTS[ci][0], len = CUTS[ci][1] - CUTS[ci][0];
    // dip to black at cuts, fade in at start
    let black = 0;
    if (ci === 0 && local < 0.7) black = 1 - local / 0.7;
    if (ci > 0 && local < 0.18) black = 1 - local / 0.18;
    if (ci < CUTS.length - 1 && len - local < 0.18) black = 1 - (len - local) / 0.18;
    if (black > 0) { tctx.fillStyle = `rgba(0,0,0,${black})`; tctx.fillRect(0, 0, TW, TH); }
    if (ci === CUTS.length - 1 && local > 0.5) title(tctx, TW, TH, Math.min(1, (local - 0.5) / 0.8), 'a game prototype  Â·  plays on mobile and desktop');
    const buf = tctx.getImageData(0, 0, TW, TH).data;
    if (!ff.stdin.write(Buffer.from(buf.buffer))) await new Promise(r => ff.stdin.once('drain', r));
    outT += DT;
    for (const [k, name] of Object.entries(STILLS)) if (Math.abs(t - k) < DT / 2) renderStills(name);
  }
  ff.stdin.end();
  ff.on('close', () => { console.log('trailer', outT.toFixed(2), 's'); art(); });
})();

function renderStills(name) {
  const c = createCanvas(1920, 1080), x = c.getContext('2d');
  const saved = S.camX;
  game.draw(x, 1920, 1080, { dt: 0 });
  S.camX = saved;
  fs.writeFileSync(path.join(GAME_OUT, `screen_${name}.png`), c.toBuffer('image/png'));
  if (name === 'pit') {
    // Google Play feature graphic 1024x500
    const fg = createCanvas(1024, 500), g = fg.getContext('2d');
    game.draw(g, 1024, 500, { dt: 0 }); S.camX = saved;
    const grd = g.createLinearGradient(520, 0, 1024, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 500);
    g.fillStyle = '#ecebe4'; g.textBaseline = 'middle'; g.font = '50px TitleSerif';
    spaced(g, 'HOLLOWLIGHT', 770, 230, 6);
    g.fillStyle = '#ffb048'; g.font = '19px Body';
    spaced(g, 'CARRY THE LAST LIGHT', 770, 290, 4);
    fs.writeFileSync(path.join(GAME_OUT, 'feature_graphic_1024x500.png'), fg.toBuffer('image/png'));
  }
  stills[name].done = true;
}

function art() {
  // App icon 512x512: the child and the lantern, nothing else
  const ic = createCanvas(512, 512), c = ic.getContext('2d');
  const bg = c.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#8e8f89'); bg.addColorStop(0.6, '#4b4c48'); bg.addColorStop(1, '#141412');
  c.fillStyle = bg; c.fillRect(0, 0, 512, 512);
  c.fillStyle = '#060606'; c.fillRect(0, 400, 512, 112);
  c.beginPath(); for (let x = 0; x < 512; x += 7) { const h = 6 + ((x * 37) % 23); c.moveTo(x - 3, 401); c.lineTo(x + 1, 400 - h); c.lineTo(x + 4, 401); } c.fill();
  c.globalCompositeOperation = 'lighter';
  game.drawGlow(c, 306, 318, 260, 0.45); game.drawGlow(c, 306, 318, 70, 0.9);
  c.globalCompositeOperation = 'source-over';
  const P = { x: -9, y: -44, w: 18, h: 44, vx: 0, onGround: true, face: 1, runPhase: 0 };
  c.save(); c.translate(250, 402); c.scale(5, 5); c.translate(0, 0);
  game.drawPlayer(c, P, 0.6); c.restore();
  const v = c.createRadialGradient(256, 256, 150, 256, 256, 380);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)');
  c.fillStyle = v; c.fillRect(0, 0, 512, 512);
  fs.writeFileSync(path.join(GAME_OUT, 'app_icon_512.png'), ic.toBuffer('image/png'));

  // Portfolio covers, same style as the other projects
  const { loadImage } = require('@napi-rs/canvas');
  loadImage(path.join(GAME_OUT, 'screen_pit.png')).then(img => {
    cover(img, 1600, 1200, path.join(OUT, 'thumbs', 'cover_hollowlight.jpg'));
    cover(img, 1200, 675, path.join(OUT, 'img', 'card_hollowlight.jpg'), true);
    console.log('art done');
  });
}

function cover(img, W, Hh, file, compact) {
  const cv = createCanvas(W, Hh), c = cv.getContext('2d');
  const s = Math.max(W / img.width, Hh / img.height), dw = img.width * s, dh = img.height * s;
  c.drawImage(img, (W - dw) * 0.42, (Hh - dh) * 0.5, dw, dh);
  const g = c.createLinearGradient(0, Hh * 0.35, 0, Hh);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.92)');
  c.fillStyle = g; c.fillRect(0, 0, W, Hh);
  const k = W / 1600;
  if (!compact) {
    c.fillStyle = '#ffb048'; c.font = `${34 * k}px Display`; c.fillText('GAME DEVELOPMENT  /  HTML5  /  MOBILE', 80 * k, 740 * k);
    c.fillStyle = '#ecebe4'; c.font = `${104 * k}px TitleSerif`; c.fillText('Hollowlight', 76 * k, 860 * k);
    c.fillStyle = '#cdd4e4'; c.font = `${38 * k}px Body`; c.fillText('Atmospheric puzzle-platformer, playable in the browser', 80 * k, 930 * k);
    let x = 80 * k; const y = 990 * k; c.font = `${28 * k}px BodyBold`;
    for (const t of ['Game design', 'Custom 2D engine', 'Touch controls', 'Procedural art']) {
      const tw = c.measureText(t).width;
      c.strokeStyle = '#ffb048'; c.lineWidth = 2; c.beginPath(); c.roundRect(x, y, tw + 32, 50, 25); c.stroke();
      c.fillStyle = '#ecebe4'; c.fillText(t, x + 16, y + 35); x += tw + 48;
    }
  }
  const ext = path.extname(file) === '.jpg' ? 'image/jpeg' : 'image/png';
  fs.writeFileSync(file, cv.toBuffer(ext, 88));
}
