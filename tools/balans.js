// Balanstest: laat de computer tegen zichzelf spelen en telt hoe vaak de lopers winnen.
// Gebruik:  node tools/balans.js [rondes per vakje] [tactiek|ploeg]      (heeft Playwright nodig)
//   tactiek: elke lopertactiek tegen elke pakkertactiek, gelijke ploegen
//   snelheid: hoeveel snelheid uitmaakt per lopertactiek
//   ploeg:   goede/zwakke tactiek x snelle/trage ploeg x slim/dom
const { chromium } = require('playwright');
const path = require('path');
const N = Number(process.argv[2] || 30), MODE = process.argv[3] || 'tactiek';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.evaluate(() => {
    stopDemo(); document.getElementById('startOv').hidden = true; S.started = true; S.reportsOff = true;
    const orig = captainOf;
    window.captainOf = team => { const k = orig(team); return k && window.__cfg && window.__cfg[team].tac ? Object.create(k, { level: { value: window.__cfg[team].tac } }) : k; };
    // één ronde: ploeg 0 loopt, ploeg 1 pakt. cfg per ploeg: {tac, spd, iq, force}
    window.runRounds = (cfg, n, opt = {}) => { const process_tagcd = opt.tagCd != null ? opt.tagCd : null;
      let w = 0, len = 0, tags = 0, stuck = 0;
      for (let g = 0; g < n; g++) {
        window.__cfg = null; S.force = null; S.tagCd = process_tagcd;
        setWatch(true); S.set.count = opt.count || 24; S.set.bell = 0; S.set.start = 'lopers'; newGame(); S.paused = true;
        for (const k of S.kids) { const c = cfg[k.team]; if (c.spd) k.top = clamp(k.top + c.spd, 4.5, 7.8); if (c.iq) k.level = c.iq; }
        window.__cfg = cfg; S.force = { lop: cfg[0].force || null, pak: cfg[1].force || null }; planAI();
        let i = 0; while (!S.over && i++ < 60 * 300) step(1 / 60);
        if (!S.over) { stuck++; continue; }
        if (S.ev.cross) w++; len += S.rt; tags += S.ev.tags.length;
      }
      S.force = null; window.__cfg = null;
      return { w, n: n - stuck, len: len / Math.max(1, n - stuck), tags: tags / Math.max(1, n - stuck), stuck };
    };
  });
  const run = (cfg, opt) => p.evaluate(([c, n, o]) => runRounds(c, n, o), [cfg, N, opt || {}]);
  const pct = r => String(Math.round(r.w / r.n * 100)).padStart(3) + '%';
  if (MODE === 'tactiek') {
    const LOP = ['rennen', 'concentratie', 'groepen', 'schijn', 'lokaas'], PAK = ['muurJager', 'muurVangnet', 'boog', 'hogeDruk', 'jaagt'];
    console.log('Lopers winnen (rij = lopertactiek, kolom = pakkertactiek), gelijke ploegen, ' + N + ' rondes per vakje');
    console.log(''.padEnd(14) + PAK.map(x => x.padStart(12)).join(''));
    for (const l of LOP) { let line = l.padEnd(14);
      for (const k of PAK) { const r = await run([{ tac: 'slim', iq: 'gem', force: l }, { tac: 'slim', iq: 'gem', force: k }]); line += (pct(r) + (r.stuck ? '!' : '')).padStart(12); }
      console.log(line); }
  } else if (MODE === 'snelheid') {
    console.log('Lopers winnen tegen een muur met jager: snelle lopers tegen trage pakkers, gelijk, en trage lopers tegen snelle pakkers (' + N + ' rondes)');
    for (const l of ['rennen', 'concentratie', 'groepen', 'schijn']) { let line = l.padEnd(14);
      for (const [a, c] of [[.5, -.5], [0, 0], [-.5, .5]]) { const r = await run([{ tac: 'slim', iq: 'gem', force: l, spd: a }, { tac: 'slim', iq: 'gem', force: 'muurJager', spd: c }]); line += pct(r).padStart(10); }
      console.log(line); }
  } else {
    const T = { 'goed+snel': { tac: 'slim', spd: .5 }, 'goed+traag': { tac: 'slim', spd: -.5 }, 'zwak+snel': { tac: 'dom', spd: .5 }, 'zwak+traag': { tac: 'dom', spd: -.5 } };
    const names = Object.keys(T);
    console.log('Kans dat de rij-ploeg een ronde wint (gemiddeld over lopen en pakken), ' + N + ' rondes per rol');
    console.log(''.padEnd(12) + names.map(x => x.padStart(12)).join(''));
    for (const a of names) { let line = a.padEnd(12);
      for (const c of names) { const r1 = await run([{ ...T[a], iq: 'gem' }, { ...T[c], iq: 'gem' }]), r2 = await run([{ ...T[c], iq: 'gem' }, { ...T[a], iq: 'gem' }]);
        line += (Math.round((r1.w / r1.n + 1 - r2.w / r2.n) / 2 * 100) + '%').padStart(12); }
      console.log(line); }
    const iq = async (a, c) => { const r1 = await run([{ tac: 'gem', iq: a }, { tac: 'gem', iq: c }]), r2 = await run([{ tac: 'gem', iq: c }, { tac: 'gem', iq: a }]); return Math.round((r1.w / r1.n + 1 - r2.w / r2.n) / 2 * 100) + '%'; };
    console.log('Verstand (zelfde tactiek en snelheid): slim tegen dom wint ' + await iq('slim', 'dom') + ', slim tegen gemiddeld ' + await iq('slim', 'gem'));
  }
  if (errs.length) console.log('fouten:', [...new Set(errs)].slice(0, 5));
  await b.close();
})();
