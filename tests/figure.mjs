// Controllo di una figura animata senza browser:   node tests/figure.mjs squat      (senza nome: l'elenco di tutte, con gli esiti)
// Stampa i controlli (ossa, pavimento, appoggi fermi, ciclo) e disegna a caratteri le pose chiave, così si "vede" la figura anche da un terminale.
//   #  corpo e arti vicini      :  braccio e gamba lontani      O  testa      =  pavimento      +  attrezzi
import { ELENCO_FIGURE, figura, fotogrammi, giunti, OSSA, TESTA } from '../js/figure.js';

const OSSI = [['piede', 'caviglia', 'punta'], ['tibia', 'caviglia', 'ginocchio'], ['coscia', 'ginocchio', 'anca'], ['busto', 'anca', 'spalla'], ['collo', 'spalla', 'testa'], ['braccio', 'spalla', 'gomito'], ['avambraccio', 'gomito', 'mano'],
  ['coscia', 'ginocchio2', 'anca'], ['tibia', 'caviglia2', 'ginocchio2'], ['piede', 'caviglia2', 'punta2'], ['braccio', 'spalla', 'gomito2'], ['avambraccio', 'gomito2', 'mano2']];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function controlla(id) {
  const F = figura(id), { durata, quadri } = fotogrammi(id), guai = [];
  quadri.forEach((J, i) => {
    for (const [o, a, b] of OSSI) if (Math.abs(dist(J[a], J[b]) - OSSA[o]) > 0.05) guai.push(`fotogramma ${i}: ${o} lungo ${dist(J[a], J[b]).toFixed(1)} invece di ${OSSA[o]} (posa irraggiungibile?)`);
    for (const [n, p] of Object.entries(J)) if (p[1] < -0.6) guai.push(`fotogramma ${i}: ${n} sotto il pavimento (y = ${p[1].toFixed(1)})`);
    if (i) for (const n of Object.keys(J)) if (dist(J[n], quadri[i - 1][n]) > 55) guai.push(`fotogramma ${i}: ${n} fa uno scatto di ${dist(J[n], quadri[i - 1][n]).toFixed(0)} (angolo scritto dal lato sbagliato?)`);
  });
  for (const f of F.fermi || []) { const m = Math.max(...quadri.map(J => dist(J[f], quadri[0][f]))); if (m > 0.05) guai.push(`${f} è dichiarato fermo ma si sposta di ${m.toFixed(1)}`); }
  if (F.passi[F.passi.length - 1].a !== F.inizio) guai.push('l\'ultimo passo non torna alla posa di partenza');
  return { durata, quadri: quadri.length - 1, guai: [...new Set(guai)].slice(0, 12) };
}

// Disegno a caratteri: 1 colonna = 2 unità, 1 riga = 4 unità (i caratteri sono alti il doppio).
function disegna(F, J) {
  const punti = [...Object.values(J), ...(F.attrezzi || []).flatMap(x => x.linee.flat())];
  const minX = Math.min(...punti.map(p => p[0])) - 10, maxX = Math.max(...punti.map(p => p[0])) + 10, maxY = Math.max(...punti.map(p => p[1])) + TESTA + 2;
  const W = Math.ceil((maxX - minX) / 2), H = Math.ceil(maxY / 4) + 1, g = Array.from({ length: H + 1 }, () => Array(W + 1).fill(' '));
  const metti = (p, c) => { const x = Math.round((p[0] - minX) / 2), y = H - 1 - Math.round(p[1] / 4); if (g[y] && x >= 0 && x <= W && (c !== ':' || g[y][x] === ' ' || g[y][x] === '+')) g[y][x] = c; };
  const tratto = (a, b, c) => { const n = Math.ceil(dist(a, b)); for (let i = 0; i <= n; i++) metti([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], c); };
  for (const x of F.attrezzi || []) for (const l of x.linee) for (let i = 1; i < l.length; i++) tratto(l[i - 1], l[i], '+');
  const catena = (nomi, c) => { for (let i = 1; i < nomi.length; i++) tratto(J[nomi[i - 1]], J[nomi[i]], c); };
  if (F.dueBraccia) catena(['spalla', 'gomito2', 'mano2'], ':');
  if (F.dueGambe) catena(['anca', 'ginocchio2', 'caviglia2', 'punta2'], ':');
  catena(['anca', 'ginocchio', 'caviglia', 'punta'], '#'); catena(['anca', 'schiena', 'spalla'], '#'); catena(['spalla', 'gomito', 'mano'], '#');
  metti(J.testa, 'O');
  g[H] = Array(W + 1).fill('=');
  return g.map(r => '    ' + r.join('').replace(/\s+$/, '')).join('\n');
}

const id = process.argv[2];
if (!id) {
  for (const k of ELENCO_FIGURE) { const r = controlla(k); console.log((r.guai.length ? '✗ ' : '✓ ') + k.padEnd(28) + r.durata.toFixed(2) + ' s' + (r.guai.length ? '   ' + r.guai[0] : '')); }
} else if (!figura(id)) { console.log('Nessuna figura con questo nome. Esistono: ' + ELENCO_FIGURE.join(', ')); process.exit(1); } else {
  const F = figura(id), r = controlla(id);
  console.log(`${id}: ciclo di ${r.durata.toFixed(2)} s, ${r.quadri} fotogrammi`);
  console.log(r.guai.length ? 'DA SISTEMARE:\n  - ' + r.guai.join('\n  - ') : 'Controlli superati: ossa di lunghezza giusta, niente sotto il pavimento, appoggi fermi, ciclo chiuso.');
  for (const [nome, p] of Object.entries(F.pose)) {
    const J = giunti(p), dove = ['testa', 'spalla', 'anca', 'ginocchio', 'caviglia', 'mano'].map(n => `${n} ${J[n].map(v => Math.round(v)).join(',')}`).join(' · ');
    console.log(`\n  posa «${nome}»${nome === F.inizio ? ' (partenza)' : ''}${nome === F.ferma ? ' (posizione chiave)' : ''}   ${dove}\n${disegna(F, J)}`);
  }
  process.exit(r.guai.length ? 1 : 0);
}
