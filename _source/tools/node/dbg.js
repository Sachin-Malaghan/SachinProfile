const H = require('../../portfolio/game/hollowlight.js');
const g = H.createGame({}); let t=0;
for (let i = 0; i < 30*12; i++) { const a=g.autopilot(); g.step(1/30, a); t+=1/30; const P=g.state.p, c=g.state.crates[0];
 if (t>4.9 && t<7.5) console.log(t.toFixed(2), 'P', P.x.toFixed(1), P.y.toFixed(1), 'vy', P.vy.toFixed(0), P.onGround?'G':'-', a.jump?'J':'', 'crate', c.x.toFixed(1), c.y.toFixed(1)); }
