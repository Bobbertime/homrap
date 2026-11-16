// Figure animate degli esercizi: un omino schematico visto di lato, disegnato e mosso dal codice.
// Modulo puro (si prova con Node): niente immagini, niente librerie, niente rete.
//
// Come è fatto
// - Lo scheletro ha ossa di lunghezza fissa (OSSA). Una posa è: un punto fermo (r, p) e l'angolo di ogni osso.
//   Angoli in gradi: 0 = in avanti (a destra), 90 = in alto. Coordinate: x a destra, y in alto, pavimento a y = 0.
// - Un esercizio è un elenco di pose e di passi ("vai alla posa X in t secondi"). Tra due pose si interpolano gli angoli,
//   non i punti: così braccia e gambe non si allungano e non si accorciano mai.
// - Mani e piedi appoggiati si possono "fissare" (restano dove sono e si piegano gomito o ginocchio).
// Per aggiungere una figura: vedi GUIDA-SVILUPPO.md, "Aggiungere una figura animata".

const RAD = Math.PI / 180;
export const OSSA = { piede: 9, tibia: 26, coscia: 26, busto: 34, collo: 13, braccio: 17, avambraccio: 17 };
export const TRATTO = 8, TRATTO_BUSTO = 11, TESTA = 8.5, FPS = 12, LARGHEZZA = 240;

// [osso, da, a]: l'angolo dell'osso è la direzione da → a. Le ossa con il 2 sono la gamba lontana (serve solo se le gambe fanno cose diverse).
const SCHELETRO = [
  ['piede', 'caviglia', 'punta'], ['tibia', 'caviglia', 'ginocchio'], ['coscia', 'ginocchio', 'anca'], ['busto', 'anca', 'spalla'],
  ['collo', 'spalla', 'testa'], ['braccio', 'spalla', 'gomito'], ['avambraccio', 'gomito', 'mano'],
  ['coscia2', 'ginocchio2', 'anca'], ['tibia2', 'caviglia2', 'ginocchio2'], ['piede2', 'caviglia2', 'punta2'],
];
const NOMI_OSSA = SCHELETRO.map(o => o[0]);
const lung = osso => OSSA[osso.replace('2', '')];
const ang = (a, osso) => (a[osso] != null ? a[osso] : a[osso.replace('2', '')]);
const dir = (g, l = 1) => [l * Math.cos(g * RAD), l * Math.sin(g * RAD)];
const mix = (a, b, k) => a + (b - a) * k;
const mixP = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
const gradi = (da, a) => Math.atan2(a[1] - da[1], a[0] - da[0]) / RAD;
const vicino = (g, rif) => g + 360 * Math.round((rif - g) / 360);   // lo stesso angolo, scritto vicino a "rif": evita giri completi nell'interpolazione

// Posizione di tutte le articolazioni di una posa.
export function giunti(posa) {
  const J = { [posa.r]: [posa.p[0], posa.p[1]] };
  for (let giro = 0; giro < SCHELETRO.length; giro++) {
    for (const [osso, da, a] of SCHELETRO) {
      if (!!J[da] === !!J[a]) continue;
      const [dx, dy] = dir(ang(posa.a, osso), lung(osso));
      if (J[da]) J[a] = [J[da][0] + dx, J[da][1] + dy]; else J[da] = [J[a][0] - dx, J[a][1] - dy];
    }
  }
  return J;
}

// Due ossa da A verso il bersaglio B: dove finisce l'articolazione in mezzo. lato: +1 ginocchio (in avanti), −1 gomito (indietro).
function dueOssa(A, B, l1, l2, lato) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d0 = Math.hypot(dx, dy) || 1e-6, ux = dx / d0, uy = dy / d0;
  const d = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min(d0, l1 + l2 - 1e-3));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return [[A[0] + ux * a - uy * h * lato, A[1] + uy * a + ux * h * lato], [A[0] + ux * d, A[1] + uy * d]];
}
const ARTI = {   // estremità che si possono fissare: [da dove parte, articolazione in mezzo, lato, primo osso, secondo osso]
  mano: ['spalla', 'gomito', -1, 17, 17], caviglia: ['anca', 'ginocchio', 1, 26, 26], caviglia2: ['anca', 'ginocchio2', 1, 26, 26],
};
function porta(J, estremo, bersaglio) {
  const [da, mezzo, lato, l1, l2] = ARTI[estremo];
  [J[mezzo], J[estremo]] = dueOssa(J[da], bersaglio, l1, l2, lato);
}
function piede(J, n, angolo) {   // la punta segue la caviglia e non entra nel pavimento
  const c = J['caviglia' + n]; let [dx, dy] = dir(angolo, OSSA.piede);
  if (c[1] + dy < 0) { dy = -Math.min(c[1], OSSA.piede); dx = Math.sign(dx || 1) * Math.sqrt(Math.max(0, OSSA.piede ** 2 - dy * dy)); }
  J['punta' + n] = [c[0] + dx, c[1] + dy];
}

// Posa a metà strada (k da 0 a 1) tra due pose di una figura.
function tra(F, nA, nB, k, passo) {
  const A = F.pose[nA], B = F.pose[nB], JA = giunti(A), JB = giunti(B), r = passo.r || F.r, a = {};
  for (const o of NOMI_OSSA) a[o] = mix(ang(A.a, o), ang(B.a, o), k);
  const J = giunti({ r, p: mixP(JA[r], JB[r], k), a });
  for (const f of passo.fissa || []) {
    const [nome, alza = 0] = Array.isArray(f) ? f : [f], b = mixP(JA[nome], JB[nome], k);
    porta(J, nome, [b[0], b[1] + alza * Math.sin(Math.PI * k)]);
  }
  if (F.terra !== false) for (const e of ['caviglia', 'caviglia2', 'mano']) if (J[e][1] < 0) porta(J, e, [J[e][0], 0]);
  piede(J, '', a.piede); piede(J, '2', ang(a, 'piede2'));
  return J;
}
const CURVE = { l: k => k, io: k => k * k * (3 - 2 * k), i: k => k * k, o: k => 1 - (1 - k) * (1 - k) };

// ── Strumenti per scrivere le pose
const posa = (r, p, a) => ({ r, p, a });
// Stessa posa, ma con la mano (o la caviglia) portata in un punto preciso: gli angoli si ricavano da soli.
function verso(P, estremo, bersaglio) {
  const J = giunti(P), [da, mezzo, , , ] = ARTI[estremo], n = estremo.endsWith('2') ? '2' : '';
  porta(J, estremo, bersaglio);
  const a = { ...P.a };
  if (estremo === 'mano') { a.braccio = vicino(gradi(J[da], J[mezzo]), a.braccio); a.avambraccio = vicino(gradi(J[mezzo], J.mano), a.avambraccio); }
  else { a['coscia' + n] = vicino(gradi(J[mezzo], J[da]), ang(a, 'coscia' + n)); a['tibia' + n] = vicino(gradi(J[estremo], J[mezzo]), ang(a, 'tibia' + n)); }
  // il punto fermo resta valido solo se non sta sull'arto spostato: in quel caso si riparte dall'anca o dalla spalla
  const sposta = [mezzo, estremo, 'punta' + n].includes(P.r);
  return sposta ? { r: da, p: J[da], a } : { ...P, a };
}
const SULLE_PUNTE = -70, ALT_CAVIGLIA = OSSA.piede * Math.sin(-SULLE_PUNTE * RAD);
const pendenza = (alt, lunghezza, base = ALT_CAVIGLIA) => Math.asin((alt - base) / lunghezza) / RAD;   // inclinazione di un corpo teso con la spalla all'altezza voluta
const CORPO = OSSA.tibia + OSSA.coscia + OSSA.busto, teso = g => ({ tibia: g, coscia: g, busto: g });

// ── Le figure
const IN_PIEDI = { piede: 0, tibia: 90, coscia: 90, busto: 90, collo: 88, braccio: -88, avambraccio: -80 };

function squat() {
  return { r: 'caviglia', inizio: 'su', ferma: 'giu',
    pose: {
      su: posa('caviglia', [0, 0], IN_PIEDI),
      giu: posa('caviglia', [0, 0], { piede: 0, tibia: 62, coscia: 181, busto: 58, collo: 72, braccio: -8, avambraccio: 6 }),   // cosce parallele al pavimento
    },
    passi: [{ a: 'giu', t: 0.9 }, { a: 'giu', t: 0.15 }, { a: 'su', t: 0.8 }, { a: 'su', t: 0.35 }] };
}

function piegamenti() {
  const gA = pendenza(34, CORPO), gB = pendenza(8, CORPO);   // braccia tese; petto a un pugno da terra
  const alto = posa('punta', [0, 0], { piede: SULLE_PUNTE, ...teso(gA), collo: gA + 8, braccio: -90, avambraccio: -90 });
  const basso = verso(posa('punta', [0, 0], { piede: SULLE_PUNTE, ...teso(gB), collo: gB + 10, braccio: -170, avambraccio: -45 }), 'mano', giunti(alto).mano);
  return { r: 'punta', inizio: 'alto', ferma: 'basso', pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}

function piegamentiGinocchia() {
  const L = OSSA.coscia + OSSA.busto, gA = pendenza(34 * Math.sin(83 * RAD), L, 0), gB = pendenza(8, L, 0);
  const gambe = { piede: 150, tibia: -35 };
  const alto = posa('ginocchio', [0, 0], { ...gambe, coscia: gA, busto: gA, collo: gA + 4, braccio: -83, avambraccio: -83 });
  const basso = verso(posa('ginocchio', [0, 0], { ...gambe, coscia: gB, busto: gB, collo: gB + 10, braccio: -170, avambraccio: -45 }), 'mano', giunti(alto).mano);
  return { r: 'ginocchio', inizio: 'alto', ferma: 'basso', pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}

function plank() {
  const g = pendenza(OSSA.braccio, CORPO), gin = Math.asin(OSSA.braccio / (OSSA.coscia + OSSA.busto)) / RAD;
  const braccia = { braccio: -90, avambraccio: 0 };   // gomiti sotto le spalle, avambracci a terra
  return { r: 'gomito', inizio: 'ginocchia', ferma: 'linea',
    pose: {
      ginocchia: posa('gomito', [0, 0], { ...braccia, busto: gin, coscia: gin, tibia: -Math.asin(ALT_CAVIGLIA / OSSA.tibia) / RAD, piede: SULLE_PUNTE, collo: gin - 4 }),
      linea: posa('gomito', [0, 0], { ...braccia, ...teso(g), piede: SULLE_PUNTE, collo: g + 3 }),
    },
    passi: [{ a: 'ginocchia', t: 0.5 }, { a: 'linea', t: 0.8 }, { a: 'linea', t: 2.6 }, { a: 'ginocchia', t: 0.8 }] };
}

function superman() {
  return { r: 'anca', inizio: 'giu', ferma: 'su', braccioDietro: true,
    pose: {
      giu: posa('anca', [0, 1.5], { busto: 2, collo: 3, braccio: -2, avambraccio: -1, coscia: 3, tibia: 1, piede: 180 }),
      su: posa('anca', [0, 1.5], { busto: 13, collo: 4, braccio: 15, avambraccio: 13, coscia: -8, tibia: -10, piede: 174 }),   // petto, braccia e cosce staccati da terra
    },
    passi: [{ a: 'giu', t: 0.5 }, { a: 'su', t: 0.8 }, { a: 'su', t: 2.4 }, { a: 'giu', t: 0.8 }] };
}

// Pose in comune tra i due burpees: mani a terra davanti ai piedi, poi plank sulle mani.
const MANI = [26, 0];
function poseBurpees() {
  const g = pendenza(34, CORPO);
  const accosciata = verso(posa('caviglia', [0, 0], { piede: 0, tibia: 60, coscia: 150, busto: -5, collo: 8, braccio: -85, avambraccio: -85 }), 'mano', MANI);
  const plank = posa('mano', MANI, { braccio: -90, avambraccio: -90, ...teso(g), piede: SULLE_PUNTE, collo: g + 8 });
  return { g, accosciata, plank, piedi: posa('caviglia', [0, 0], IN_PIEDI) };
}

function burpees() {
  const { accosciata, plank, piedi } = poseBurpees(), punta = giunti(plank).punta, gT = pendenza(3, CORPO);   // petto a terra
  const terra = verso(posa('punta', punta, { piede: SULLE_PUNTE, ...teso(gT), collo: gT + 12, braccio: -170, avambraccio: -45 }), 'mano', MANI);
  return { r: 'caviglia', inizio: 'piedi', ferma: 'terra',
    pose: { piedi, accosciata, plank, terra,
      volo: posa('mano', MANI, { braccio: -97, avambraccio: -97, busto: -8, coscia: 120, tibia: 30, piede: -40, collo: 10 }),          // piedi staccati, bacino alto
      spinta: posa('caviglia', [0, 3], { piede: -20, tibia: 88, coscia: 91, busto: 89, collo: 88, braccio: 30, avambraccio: 50 }),
      salto: posa('caviglia', [0, 16], { piede: -55, tibia: 90, coscia: 90, busto: 90, collo: 90, braccio: 84, avambraccio: 88 }),      // mani sopra la testa
      atterra: posa('caviglia', [0, 0], { piede: 0, tibia: 76, coscia: 114, busto: 79, collo: 83, braccio: -20, avambraccio: 10 }),     // ginocchia morbide
    },
    passi: [
      { a: 'accosciata', t: 0.45 }, { a: 'volo', t: 0.2, r: 'mano', e: 'i' }, { a: 'plank', t: 0.24, r: 'mano', e: 'o' },
      { a: 'terra', t: 0.45, r: 'punta', fissa: ['mano'] }, { a: 'plank', t: 0.45, r: 'punta', fissa: ['mano'] },
      { a: 'volo', t: 0.22, r: 'mano', e: 'i' }, { a: 'accosciata', t: 0.22, r: 'mano', e: 'o' },
      { a: 'spinta', t: 0.3, e: 'i' }, { a: 'salto', t: 0.2, e: 'o' }, { a: 'atterra', t: 0.22, e: 'i' }, { a: 'piedi', t: 0.25 }, { a: 'piedi', t: 0.3 },
    ] };
}

function burpeesFacili() {   // un piede alla volta, senza piegamento e senza salto
  const { accosciata, plank, piedi } = poseBurpees(), dietro = giunti(plank).caviglia;
  let passo = posa('caviglia2', [0, 0], { piede2: 0, tibia2: 60, coscia2: 150, piede: SULLE_PUNTE, tibia: 20, coscia: 20, busto: -3, collo: 8, braccio: -85, avambraccio: -85 });
  passo = verso(verso(passo, 'mano', MANI), 'caviglia', dietro);
  return { r: 'caviglia', inizio: 'piedi', ferma: 'passo', dueGambe: true,
    pose: { piedi, accosciata, plank, passo },
    passi: [
      { a: 'accosciata', t: 0.5 }, { a: 'passo', t: 0.4, r: 'caviglia2', fissa: ['mano', ['caviglia', 4]] }, { a: 'plank', t: 0.4, r: 'mano', fissa: ['caviglia', ['caviglia2', 4]] },
      { a: 'plank', t: 0.35 }, { a: 'passo', t: 0.4, r: 'mano', fissa: ['caviglia', ['caviglia2', 4]] }, { a: 'accosciata', t: 0.4, r: 'caviglia2', fissa: ['mano', ['caviglia', 4]] },
      { a: 'piedi', t: 0.55 }, { a: 'piedi', t: 0.3 },
    ] };
}

function trazioni() {
  const SBARRA = [0, 128];
  return { r: 'mano', inizio: 'appeso', ferma: 'su', attrezzi: [{ tipo: 'sbarra', p: SBARRA }],
    pose: {
      appeso: posa('mano', SBARRA, { avambraccio: 90, braccio: 90, busto: 90, collo: 80, coscia: 90, tibia: 75, piede: -50 }),
      su: posa('mano', SBARRA, { avambraccio: 105, braccio: -52, busto: 86, collo: 84, coscia: 92, tibia: 70, piede: -50 }),   // mento sopra la sbarra
    },
    passi: [{ a: 'su', t: 1.1 }, { a: 'su', t: 0.25 }, { a: 'appeso', t: 1.2 }, { a: 'appeso', t: 0.5 }] };
}

// Chiave: id della prova del test o dell'esercizio della libreria.
const COSTRUTTORI = {
  squat, piegamenti, piegamenti_ginocchia: piegamentiGinocchia, burpees, burpees_senza_salto: burpeesFacili, plank, superman, trazioni,
};
// Variante facilitata delle prove del test → figura da mostrare.
export const FIGURA_FACILITATA = { piegamenti: 'piegamenti_ginocchia', burpees: 'burpees_senza_salto' };
export const ELENCO_FIGURE = Object.keys(COSTRUTTORI);
export const haFigura = id => Object.prototype.hasOwnProperty.call(COSTRUTTORI, id);
const pronte = {};
export function figura(id) { return haFigura(id) ? (pronte[id] || (pronte[id] = COSTRUTTORI[id]())) : null; }

// Tutti i fotogrammi di un ciclo (l'ultimo è uguale al primo, così il ciclo si chiude senza scatti).
export function fotogrammi(id, fps = FPS) {
  const F = figura(id);
  if (!F) return null;
  const durata = F.passi.reduce((s, x) => s + x.t, 0), n = Math.round(durata * fps), quadri = [];
  for (let i = 0; i <= n; i++) {
    let resto = ((i % n) / n) * durata, da = F.inizio, passo = F.passi[0];
    for (const x of F.passi) { passo = x; if (resto < x.t - 1e-9) break; resto -= x.t; da = x.a; }
    quadri.push(da === passo.a ? giunti(F.pose[da]) : tra(F, da, passo.a, CURVE[passo.e || 'io'](Math.min(1, resto / passo.t)), passo));
  }
  return { durata, quadri, ferma: giunti(F.pose[F.ferma]), inizio: giunti(F.pose[F.inizio]) };
}

// ── Disegno
const n1 = v => String(Math.round(v * 10) / 10);
// SVG della figura. fermo: senza movimento (posizione chiave, con quella di partenza in trasparenza). etichetta: testo per chi usa lo screen reader.
export function svgFigura(id, { fermo = false, etichetta = '' } = {}) {
  const dati = fotogrammi(id);
  if (!dati) return '';
  const F = figura(id), { durata, quadri } = dati;
  let minX = Infinity, maxX = -Infinity, maxY = 0;
  for (const J of quadri) for (const [nome, p] of Object.entries(J)) {
    const raggio = nome === 'testa' ? TESTA : TRATTO / 2;
    minX = Math.min(minX, p[0] - raggio); maxX = Math.max(maxX, p[0] + raggio); maxY = Math.max(maxY, p[1] + raggio);
  }
  const W = LARGHEZZA, H = Math.ceil(maxY + 20), cx = (minX + maxX) / 2, base = H - 12;
  const X = p => n1(p[0] - cx + W / 2), Y = p => n1(base - p[1]), P = p => X(p) + ' ' + Y(p);
  const linea = (J, nomi) => 'M' + nomi.map(k => P(J[k])).join('L');
  const PARTI = {
    gamba2: ['anca', 'ginocchio2', 'caviglia2', 'punta2'], gamba: ['anca', 'ginocchio', 'caviglia', 'punta'], busto: ['anca', 'spalla'], braccio: ['spalla', 'gomito', 'mano'],
  };
  const anima = (attr, f) => fermo ? '' : `<animate attributeName="${attr}" dur="${n1(durata)}s" repeatCount="indefinite" values="${quadri.map(f).join(';')}"/>`;
  const tratto = (parte, classe, spessore, J0) => `<path class="${classe}" stroke-width="${spessore}" d="${linea(J0, PARTI[parte])}">${anima('d', J => linea(J, PARTI[parte]))}</path>`;
  const corpo = (J0, vivo) => {
    const a = vivo ? anima : () => '';
    const pezzo = (parte, classe, spessore) => vivo ? tratto(parte, classe, spessore, J0) : `<path class="${classe}" stroke-width="${spessore}" d="${linea(J0, PARTI[parte])}"/>`;
    const testa = `<circle class="f-testa" r="${TESTA}" cx="${X(J0.testa)}" cy="${Y(J0.testa)}">${a('cx', J => X(J.testa))}${a('cy', J => Y(J.testa))}</circle>`;
    const braccio = pezzo('braccio', 'f-alone', TRATTO + 5) + pezzo('braccio', 'f-o', TRATTO);
    // di solito il braccio passa davanti; con le braccia tese oltre la testa (superman) la coprirebbe, e allora passa dietro
    return (F.dueGambe ? pezzo('gamba2', 'f-o f-dietro', TRATTO) : '') + pezzo('gamba', 'f-o', TRATTO) + pezzo('busto', 'f-o', TRATTO_BUSTO)
      + (F.braccioDietro ? braccio + testa : testa + braccio);
  };
  // la sbarra si vedrebbe di punta: la si disegna come un tratto orizzontale, perché si capisca a cosa è appeso l'omino
  const attrezzi = (F.attrezzi || []).map(x => x.tipo === 'sbarra' ? `<path class="f-attrezzo" d="M${n1(+X(x.p) - 26)} ${Y(x.p)}h52"/>` : '').join('');
  const terra = F.terra === false ? '' : `<path class="f-terra" d="M14 ${n1(base + TRATTO / 2 + 1.5)}H${W - 14}"/>`;
  return `<svg class="figura-svg" viewBox="0 0 ${W} ${H}" ${etichetta ? `role="img" aria-label="${etichetta}"` : 'aria-hidden="true"'}>${terra}`
    + attrezzi + (fermo ? `<g class="f-ombra">${corpo(dati.inizio, false)}</g>${corpo(dati.ferma, false)}` : corpo(quadri[0], true)) + `</svg>`;
}
