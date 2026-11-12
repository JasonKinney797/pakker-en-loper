// Balanstest: laat de computer tegen zichzelf spelen met verschillende ploegen en telt de punten.
// Gebruik:  node tools/balans.js [rondes per duel]      (heeft Playwright nodig)
// Een ploeg heeft: tactiek (niveau van de kapitein), snelheid (verschil in topsnelheid in m/s) en verstand (niveau van elk kind).
const { chromium } = require('playwright');
const path = require('path');
const ROUNDS = Number(process.argv[2] || 40);
const TEAMS = {
  'goede tactiek + snel':   { tac: 'slim', spd: +0.5, iq: 'gem' },
  'goede tactiek + traag':  { tac: 'slim', spd: -0.5, iq: 'gem' },
  'zwakke tactiek + snel':  { tac: 'dom',  spd: +0.5, iq: 'gem' },
  'zwakke tactiek + traag': { tac: 'dom',  spd: -0.5, iq: 'gem' },
};
const EXTRA = [   // verstand apart: zelfde tactiek en snelheid
  ['slimme kinderen', { tac: 'gem', spd: 0, iq: 'slim' }, 'domme kinderen', { tac: 'gem', spd: 0, iq: 'dom' }],
  ['gemiddeld', { tac: 'gem', spd: 0, iq: 'gem' }, 'gemiddeld', { tac: 'gem', spd: 0, iq: 'gem' }],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.evaluate(() => {
    stopDemo(); document.getElementById('startOv').hidden = true; S.started = true; S.reportsOff = true;
    const orig = captainOf;
    window.captainOf = team => { const k = orig(team); return k && window.__cfg ? Object.create(k, { level: { value: window.__cfg[team].tac } }) : k; };
    window.runMatch = (cfg, rounds) => {
      window.__cfg = null; setWatch(true); S.set.count = 24; S.set.bell = 0; S.set.start = 'lopers'; newGame(); S.paused = true;
      for (const k of S.kids) { const c = cfg[k.team]; k.top = clamp(k.top + c.spd, 4.5, 7.8); k.level = c.iq; }
      window.__cfg = cfg; planAI();
      const st = { pts: [0, 0], asL: [[0, 0], [0, 0]], len: 0, n: 0, stuck: 0 };
      const er = endRound; let cur = null;
      window.endRound = (w, c) => { if (!S.over) cur = w; return er(w, c); };
      while (st.n < rounds) {
        const L = S.role[0] === 'lopers' ? 0 : 1; cur = null; let i = 0;
        while (!S.over && i++ < 60 * 660) step(1 / 60);
        if (cur) { st.n++; st.len += S.rt; st.asL[L][1]++; if (cur === 'lopers') { st.asL[L][0]++; st.pts[L]++; } else st.pts[1 - L]++; } else st.stuck++;
        if (st.stuck > 5) break;
        if (S.tbStart > 0) { S.tbStart = 0; startRound(); } else { S.nextIn = 0; nextRound(); }
      }
      window.endRound = er;
      return st;
    };
  });
  const duel = async (nA, A, nB, B) => {
    // twee keer, zodat elke ploeg één keer als loper begint
    const r1 = await p.evaluate(([c, n]) => runMatch(c, n), [[A, B], ROUNDS / 2]);
    const r2 = await p.evaluate(([c, n]) => runMatch(c, n), [[B, A], ROUNDS / 2]);
    const a = r1.pts[0] + r2.pts[1], bb = r1.pts[1] + r2.pts[0];
    const lw = r1.asL[0][0] + r1.asL[1][0] + r2.asL[0][0] + r2.asL[1][0], ln = r1.asL[0][1] + r1.asL[1][1] + r2.asL[0][1] + r2.asL[1][1];
    const aL = [r1.asL[0][0] + r2.asL[1][0], r1.asL[0][1] + r2.asL[1][1]], bL = [r1.asL[1][0] + r2.asL[0][0], r1.asL[1][1] + r2.asL[0][1]];
    console.log(`${nA.padEnd(24)} ${String(a).padStart(3)} - ${String(bb).padEnd(3)} ${nB.padEnd(24)} | A wint ${Math.round(a / (a + bb) * 100)}% | lopers winnen ${Math.round(lw / ln * 100)}% (A als loper ${aL[0]}/${aL[1]}, B als loper ${bL[0]}/${bL[1]}) | ronde ${((r1.len + r2.len) / (r1.n + r2.n)).toFixed(0)} s${r1.stuck + r2.stuck ? ' | vast: ' + (r1.stuck + r2.stuck) : ''}`);
  };
  const names = Object.keys(TEAMS);
  for (let i = 0; i < names.length; i++) for (let j = i; j < names.length; j++) await duel(names[i], TEAMS[names[i]], names[j], TEAMS[names[j]]);
  for (const [nA, A, nB, B] of EXTRA) await duel(nA, A, nB, B);
  if (errs.length) console.log('fouten:', [...new Set(errs)].slice(0, 5));
  await b.close();
})();
