const H = require('../../portfolio/game/hollowlight.js');
const g = H.createGame({});
let log = [], t = 0, lastDeaths = 0;
for (let i = 0; i < 30 * 60; i++) {
  g.step(1/30, g.autopilot()); t += 1/30;
  const S = g.state;
  if (i % 15 === 0) log.push(t.toFixed(1) + ':' + Math.round(S.p.x) + (S.p.alive ? '' : 'X') + (S.p.pushing ? 'P' : ''));
  if (S.deaths !== lastDeaths) { console.log('DEATH at', t.toFixed(2), 'x', Math.round(S.p.x), 'y', Math.round(S.p.y)); lastDeaths = S.deaths; }
  if (S.won) { console.log('WON at', t.toFixed(2)); break; }
}
console.log(log.join('  '));
