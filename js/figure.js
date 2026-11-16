// Figure animate degli esercizi: un omino schematico visto di lato, disegnato e mosso dal codice.
// Modulo puro (si prova con Node): niente immagini, niente librerie, niente rete.
//
// Come è fatto
// - Lo scheletro ha ossa di lunghezza fissa (OSSA). Una posa è: un punto fermo (r, p) e l'angolo di ogni osso.
//   Angoli in gradi: 0 = in avanti (a destra), 90 = in alto. Coordinate: x a destra, y in alto, pavimento a y = 0.
// - Un esercizio è un elenco di pose e di passi ("vai alla posa X in t secondi"). Tra due pose si interpolano gli angoli,
//   non i punti: così braccia e gambe non si allungano e non si accorciano mai.
// - Mani e piedi appoggiati si possono "fissare" (restano dove sono e si piegano gomito o ginocchio).
// Per aggiungere una figura: GUIDA-FIGURE.md spiega il metodo passo per passo. Per guardarle tutte: tests/figure.html.

const RAD = Math.PI / 180;
export const OSSA = { piede: 9, tibia: 26, coscia: 26, busto: 34, collo: 13, braccio: 17, avambraccio: 17 };
export const TRATTO = 8, TRATTO_BUSTO = 11, TESTA = 8.5, FPS = 12, LARGHEZZA = 240;

// [osso, da, a]: l'angolo dell'osso è la direzione da → a. Le ossa con il 2 sono la gamba e il braccio lontani (servono solo se i due lati fanno cose diverse).
const SCHELETRO = [
  ['piede', 'caviglia', 'punta'], ['tibia', 'caviglia', 'ginocchio'], ['coscia', 'ginocchio', 'anca'], ['busto', 'anca', 'spalla'],
  ['collo', 'spalla', 'testa'], ['braccio', 'spalla', 'gomito'], ['avambraccio', 'gomito', 'mano'],
  ['coscia2', 'ginocchio2', 'anca'], ['tibia2', 'caviglia2', 'ginocchio2'], ['piede2', 'caviglia2', 'punta2'],
  ['braccio2', 'spalla', 'gomito2'], ['avambraccio2', 'gomito2', 'mano2'],
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
  // schiena: il punto a metà del busto. Con curva = 0 il busto è dritto; con curva > 0 si incurva verso sinistra rispetto alla direzione anca → spalla
  // (a quattro zampe con la testa a destra: verso l'alto, cioè schiena «da gatto»).
  const c = posa.a.curva || 0, [ux, uy] = dir(posa.a.busto);
  J.schiena = [(J.anca[0] + J.spalla[0]) / 2 - uy * c, (J.anca[1] + J.spalla[1]) / 2 + ux * c];
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
  mano: ['spalla', 'gomito', -1, 17, 17], mano2: ['spalla', 'gomito2', -1, 17, 17], caviglia: ['anca', 'ginocchio', 1, 26, 26], caviglia2: ['anca', 'ginocchio2', 1, 26, 26],
};
// lati: per le rare figure in cui gomito o ginocchio devono piegarsi dall'altra parte, es. { mano: 1 }
function porta(J, estremo, bersaglio, lati) {
  const [da, mezzo, lato, l1, l2] = ARTI[estremo], n = estremo.replace('2', '');
  [J[mezzo], J[estremo]] = dueOssa(J[da], bersaglio, l1, l2, lati && lati[n] ? lati[n] : lato);
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
  a.curva = mix(A.a.curva || 0, B.a.curva || 0, k);
  const J = giunti({ r, p: mixP(JA[r], JB[r], k), a });
  for (const f of passo.fissa || []) {
    const [nome, alza = 0] = Array.isArray(f) ? f : [f], b = mixP(JA[nome], JB[nome], k);
    porta(J, nome, [b[0], b[1] + alza * Math.sin(Math.PI * k)], F.lati);
  }
  if (F.terra !== false) for (const e of ['caviglia', 'caviglia2', 'mano', 'mano2']) if (J[e][1] < 0) porta(J, e, [J[e][0], 0], F.lati);
  piede(J, '', a.piede); piede(J, '2', ang(a, 'piede2'));
  return J;
}
const CURVE = { l: k => k, io: k => k * k * (3 - 2 * k), i: k => k * k, o: k => 1 - (1 - k) * (1 - k) };

// ── Strumenti per scrivere le pose
const posa = (r, p, a) => ({ r, p, a });
// Stessa posa, ma con la mano (o la caviglia) portata in un punto preciso: gli angoli si ricavano da soli.
function verso(P, estremo, bersaglio, lati) {
  const J = giunti(P), [da, mezzo] = ARTI[estremo], n = estremo.endsWith('2') ? '2' : '';
  porta(J, estremo, bersaglio, lati);
  const a = { ...P.a };
  if (estremo.startsWith('mano')) { a['braccio' + n] = vicino(gradi(J[da], J[mezzo]), ang(a, 'braccio' + n)); a['avambraccio' + n] = vicino(gradi(J[mezzo], J[estremo]), ang(a, 'avambraccio' + n)); }
  else { a['coscia' + n] = vicino(gradi(J[mezzo], J[da]), ang(a, 'coscia' + n)); a['tibia' + n] = vicino(gradi(J[estremo], J[mezzo]), ang(a, 'tibia' + n)); }
  // il punto fermo resta valido solo se non sta sull'arto spostato: in quel caso si riparte dall'anca o dalla spalla
  const sposta = [mezzo, estremo, 'punta' + n].includes(P.r);
  return sposta ? { r: da, p: J[da], a } : { ...P, a };
}
const SULLE_PUNTE = -70, ALT_CAVIGLIA = OSSA.piede * Math.sin(-SULLE_PUNTE * RAD);
const pendenza = (alt, lunghezza, base = ALT_CAVIGLIA) => Math.asin((alt - base) / lunghezza) / RAD;   // inclinazione di un corpo teso con la spalla all'altezza voluta
const CORPO = OSSA.tibia + OSSA.coscia + OSSA.busto, teso = g => ({ tibia: g, coscia: g, busto: g });

// ── Attrezzi di scena: tratti fermi, nelle stesse coordinate dell'omino. Un'articolazione «appoggiata» a quota y ha la superficie 6 più in basso.
const MOBILE = 'f-mobile', GIU = -TRATTO / 2;
const sbarra = p => ({ classe: 'f-attrezzo', linee: [[[p[0] - 26, p[1]], [p[0] + 26, p[1]]]] });                                // si vedrebbe di punta: la si disegna come un tratto
const parete = (x, alt, lato = 1) => ({ classe: MOBILE, linee: [[[x + 6 * lato, GIU], [x + 6 * lato, alt]]] });                 // muro a cui si appoggia un'articolazione a x (lato 1 = muro a destra)
const cassa = (x1, x2, y) => ({ classe: MOBILE, linee: [[[x1, GIU], [x1, y - 6], [x2, y - 6], [x2, GIU]]] });                    // panca, divano, rialzo: ci si appoggia a quota y
const sedia = (xDavanti, xDietro, y, schienale = y + 30) => ({ classe: MOBILE, linee: [[[xDavanti, GIU], [xDavanti, y - 6], [xDietro, y - 6]], [[xDietro, GIU], [xDietro, schienale]]] });
const tavolo = (x1, x2, y) => ({ classe: MOBILE, linee: [[[x1, y], [x2, y]], [[x1 + 6 * Math.sign(x2 - x1), y], [x1 + 6 * Math.sign(x2 - x1), GIU]]] });   // il bordo x2 è quello a cui ci si aggrappa

// ── Le figure
const IN_PIEDI = { piede: 0, tibia: 90, coscia: 90, busto: 90, collo: 88, braccio: -88, avambraccio: -80 };

function squat() {
  return { r: 'caviglia', inizio: 'su', ferma: 'giu', fermi: ['caviglia', 'punta'],
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
  return { r: 'punta', inizio: 'alto', ferma: 'basso', fermi: ['mano', 'punta'], pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}

function piegamentiGinocchia() {
  const L = OSSA.coscia + OSSA.busto, gA = pendenza(34 * Math.sin(83 * RAD), L, 0), gB = pendenza(8, L, 0);
  const gambe = { piede: 150, tibia: -35 };
  const alto = posa('ginocchio', [0, 0], { ...gambe, coscia: gA, busto: gA, collo: gA + 4, braccio: -83, avambraccio: -83 });
  const basso = verso(posa('ginocchio', [0, 0], { ...gambe, coscia: gB, busto: gB, collo: gB + 10, braccio: -170, avambraccio: -45 }), 'mano', giunti(alto).mano);
  return { r: 'ginocchio', inizio: 'alto', ferma: 'basso', fermi: ['mano', 'ginocchio'], pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}

function plank() {
  const g = pendenza(OSSA.braccio, CORPO), gin = Math.asin(OSSA.braccio / (OSSA.coscia + OSSA.busto)) / RAD;
  const braccia = { braccio: -90, avambraccio: 0 };   // gomiti sotto le spalle, avambracci a terra
  return { r: 'gomito', inizio: 'ginocchia', ferma: 'linea', fermi: ['gomito', 'mano', 'spalla'],
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
  return { r: 'mano', inizio: 'appeso', ferma: 'su', attrezzi: [sbarra(SBARRA)], fermi: ['mano'],
    pose: {
      appeso: posa('mano', SBARRA, { avambraccio: 90, braccio: 90, busto: 90, collo: 80, coscia: 90, tibia: 75, piede: -50 }),
      su: posa('mano', SBARRA, { avambraccio: 105, braccio: -52, busto: 86, collo: 84, coscia: 92, tibia: 70, piede: -50 }),   // mento sopra la sbarra
    },
    passi: [{ a: 'su', t: 1.1 }, { a: 'su', t: 0.25 }, { a: 'appeso', t: 1.2 }, { a: 'appeso', t: 0.5 }] };
}

// ── Varianti dello squat
function squatSedia() {   // ci si siede indietro fino a sfiorare la sedia
  const F = squat(), anca = giunti(F.pose.giu).anca;
  return { ...F, attrezzi: [sedia(anca[0] + 9, anca[0] - 20, anca[1] - 1.5)], passi: [{ a: 'giu', t: 1 }, { a: 'giu', t: 0.3 }, { a: 'su', t: 0.9 }, { a: 'su', t: 0.4 }] };
}
function gobletSquat() {   // peso tenuto al petto
  const mani = { braccio: -70, avambraccio: 62 };
  return { r: 'caviglia', inizio: 'su', ferma: 'giu', inMano: 'peso', fermi: ['caviglia', 'punta'],
    pose: {
      su: posa('caviglia', [0, 0], { ...IN_PIEDI, ...mani }),
      giu: posa('caviglia', [0, 0], { piede: 0, tibia: 62, coscia: 181, busto: 64, collo: 76, braccio: -50, avambraccio: 75 }),
    },
    passi: [{ a: 'giu', t: 1 }, { a: 'giu', t: 0.2 }, { a: 'su', t: 0.9 }, { a: 'su', t: 0.4 }] };
}
function squatJump() {
  return { r: 'caviglia', inizio: 'giu', ferma: 'salto',
    pose: {
      giu: posa('caviglia', [0, 0], { piede: 0, tibia: 62, coscia: 181, busto: 58, collo: 72, braccio: -118, avambraccio: -100 }),   // braccia indietro
      spinta: posa('caviglia', [0, 3], { piede: -20, tibia: 88, coscia: 91, busto: 89, collo: 88, braccio: -30, avambraccio: -5 }),
      salto: posa('caviglia', [0, 15], { piede: -55, tibia: 90, coscia: 90, busto: 90, collo: 90, braccio: 55, avambraccio: 72 }),
      atterra: posa('caviglia', [0, 0], { piede: 0, tibia: 76, coscia: 114, busto: 79, collo: 83, braccio: -60, avambraccio: -30 }),
    },
    passi: [{ a: 'spinta', t: 0.28, e: 'i' }, { a: 'salto', t: 0.2, e: 'o' }, { a: 'atterra', t: 0.22, e: 'i' }, { a: 'giu', t: 0.4, e: 'o' }, { a: 'giu', t: 0.2 }] };
}
function squatParete() {   // sedia al muro: schiena appoggiata, cosce parallele
  const braccia = { braccio: -80, avambraccio: -25 };
  let su = posa('anca', [-26, 45], { busto: 90, collo: 88, piede: 0, tibia: 120, coscia: 120, ...braccia });
  let giu = posa('anca', [-26, 26], { busto: 90, collo: 88, piede: 0, tibia: 90, coscia: 180, ...braccia });
  su = verso(su, 'caviglia', [0, 0]); giu = verso(giu, 'caviglia', [0, 0]);
  return { r: 'anca', inizio: 'su', ferma: 'giu', attrezzi: [parete(-26 - 1.5, 112, -1)], fermi: ['caviglia'], pose: { su, giu },
    passi: [{ a: 'su', t: 0.5 }, { a: 'giu', t: 0.9, fissa: ['caviglia'] }, { a: 'giu', t: 2.6 }, { a: 'su', t: 0.9, fissa: ['caviglia'] }] };
}

// ── Affondi: le due gambe fanno cose diverse (la gamba vicina è quella che si muove)
function affondiIndietro() {
  const su = posa('caviglia2', [0, 0], IN_PIEDI);
  let giu = posa('anca', [-26, 26], { busto: 90, collo: 88, braccio: -88, avambraccio: -80, piede2: 0, tibia2: 90, coscia2: 180, piede: SULLE_PUNTE, tibia: -17, coscia: 83 });
  giu = verso(verso(giu, 'caviglia2', [0, 0]), 'caviglia', [-55, ALT_CAVIGLIA]);
  const passo = { r: 'caviglia2', fissa: [['caviglia', 5]] };
  return { r: 'caviglia2', inizio: 'su', ferma: 'giu', dueGambe: true, fermi: ['caviglia2'], pose: { su, giu },
    passi: [{ a: 'giu', t: 0.8, ...passo }, { a: 'giu', t: 0.2 }, { a: 'su', t: 0.8, ...passo }, { a: 'su', t: 0.3 }] };
}
function affondiAvanti() {
  const su = posa('caviglia2', [0, 0], IN_PIEDI), punta = giunti(su).punta2;
  let giu = posa('anca', [29, 26], { busto: 90, collo: 88, braccio: -88, avambraccio: -80, piede: 0, tibia: 90, coscia: 180, piede2: SULLE_PUNTE, tibia2: -17, coscia2: 83 });
  giu = verso(verso(giu, 'caviglia', [55, 0]), 'caviglia2', [punta[0] - OSSA.piede * Math.cos(SULLE_PUNTE * RAD), ALT_CAVIGLIA]);
  const passo = { r: 'punta2', fissa: [['caviglia', 6]] };
  return { r: 'punta2', inizio: 'su', ferma: 'giu', dueGambe: true, fermi: ['punta2'], pose: { su, giu },
    passi: [{ a: 'giu', t: 0.8, ...passo }, { a: 'giu', t: 0.2 }, { a: 'su', t: 0.8, ...passo }, { a: 'su', t: 0.3 }] };
}
function affondiSaltati() {
  const davanti = [26, 0], dietro = [-29, ALT_CAVIGLIA], busto = { busto: 88, collo: 88 };
  let a = posa('anca', [0, 28], { ...busto, piede: 0, tibia: 90, coscia: 176, piede2: SULLE_PUNTE, tibia2: -17, coscia2: 83, braccio: -125, avambraccio: -95 });
  let b = posa('anca', [0, 28], { ...busto, piede: SULLE_PUNTE, tibia: -17, coscia: 83, piede2: 0, tibia2: 90, coscia2: 176, braccio: -55, avambraccio: -20 });
  a = verso(verso(a, 'caviglia', davanti), 'caviglia2', dietro); b = verso(verso(b, 'caviglia', dietro), 'caviglia2', davanti);
  const volo = posa('anca', [0, 46], { busto: 89, collo: 88, piede: -35, tibia: 36, coscia: 129, piede2: -35, tibia2: 36, coscia2: 129, braccio: -90, avambraccio: -60 });
  return { r: 'anca', inizio: 'a', ferma: 'a', dueGambe: true, pose: { a, b, volo },
    passi: [{ a: 'volo', t: 0.24, e: 'o' }, { a: 'b', t: 0.24, e: 'i' }, { a: 'b', t: 0.28 }, { a: 'volo', t: 0.24, e: 'o' }, { a: 'a', t: 0.24, e: 'i' }, { a: 'a', t: 0.28 }] };
}

// ── Piegamenti con le mani o i piedi rialzati, al muro, a V rovesciata
function piegamentiSu(hMani, hPiedi) {
  const gA = pendenza(hMani + 34, CORPO, hPiedi + ALT_CAVIGLIA), gB = pendenza(hMani + (hPiedi ? 15 : 8), CORPO, hPiedi + ALT_CAVIGLIA);   // con i piedi rialzati ci si ferma un po' prima: il gomito non deve finire nel pavimento
  const alto = posa('punta', [0, hPiedi], { piede: SULLE_PUNTE, ...teso(gA), collo: gA + 8, braccio: -90, avambraccio: -90 }), mano = giunti(alto).mano, punta = [0, hPiedi];
  const basso = verso(posa('punta', punta, { piede: SULLE_PUNTE, ...teso(gB), collo: gB + 10, braccio: -170, avambraccio: -45 }), 'mano', mano);
  const attrezzi = hMani ? [cassa(mano[0] - 9, mano[0] + 24, hMani)] : hPiedi ? [cassa(-26, 12, hPiedi)] : [];
  return { r: 'punta', inizio: 'alto', ferma: 'basso', attrezzi, fermi: ['mano', 'punta'], pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}
function piegamentiMuro() {
  const corpo = g => ({ piede: 0, ...teso(g), collo: g + 4 });
  const alto = posa('caviglia', [0, 0], { ...corpo(78), braccio: 0, avambraccio: 0 }), mano = giunti(alto).mano;
  const basso = verso(posa('caviglia', [0, 0], { ...corpo(66), braccio: -80, avambraccio: 35 }), 'mano', mano);
  return { r: 'caviglia', inizio: 'alto', ferma: 'basso', attrezzi: [parete(mano[0], 112)], fermi: ['mano', 'caviglia'], pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}
function pikePushup() {
  let alto = posa('punta', [0, 0], { piede: SULLE_PUNTE, tibia: 64, coscia: 64, busto: -50, collo: -48, braccio: -59, avambraccio: -59 });
  const S = giunti(alto).spalla, mano = [S[0] + Math.sqrt(34 * 34 - S[1] * S[1]) - 0.01, 0];
  alto = verso(alto, 'mano', mano);
  const basso = verso(posa('punta', [0, 0], { piede: SULLE_PUNTE, tibia: 55, coscia: 55, busto: -55, collo: -42, braccio: -120, avambraccio: -30 }), 'mano', mano);
  return { r: 'punta', inizio: 'alto', ferma: 'basso', fermi: ['mano', 'punta'], pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, fissa: ['mano'] }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, fissa: ['mano'] }, { a: 'alto', t: 0.4 }] };
}
function dipsSedia() {   // mani sul bordo della sedia, dietro la schiena
  const alto = posa('caviglia', [0, 0], { piede: 0, tibia: 90, coscia: 180, busto: 95, collo: 90, braccio: -90, avambraccio: -90 }), mano = giunti(alto).mano;
  let basso = posa('anca', [-24, 11], { piede: 0, tibia: 100, coscia: 150, busto: 97, collo: 90, braccio: -165, avambraccio: -70 });
  basso = verso(verso(basso, 'caviglia', [0, 0]), 'mano', mano);
  const passo = { r: 'anca', fissa: ['mano', 'caviglia'] };
  return { r: 'anca', inizio: 'alto', ferma: 'basso', attrezzi: [sedia(mano[0] + 2, mano[0] - 32, mano[1], mano[1] + 34)], fermi: ['mano', 'caviglia'], pose: { alto, basso },
    passi: [{ a: 'basso', t: 1, ...passo }, { a: 'basso', t: 0.1 }, { a: 'alto', t: 0.9, ...passo }, { a: 'alto', t: 0.4 }] };
}

// ── A pancia in giù (testa a destra)
const A_TERRA = { busto: 2, collo: 3, braccio: -2, avambraccio: -1, coscia: 3, tibia: 1, piede: 180 };
function supermanYTW() {   // di lato si vedono la Y (braccia avanti) e la W (gomiti tirati indietro)
  const petto = { busto: 12, collo: 6, coscia: 3, tibia: 1, piede: 180 };
  return { r: 'anca', inizio: 'giu', ferma: 'w', braccioDietro: true,
    pose: {
      giu: posa('anca', [0, 1.5], A_TERRA),
      y: posa('anca', [0, 1.5], { ...petto, braccio: 16, avambraccio: 14 }),
      w: posa('anca', [0, 1.5], { ...petto, braccio: 168, avambraccio: 24 }),
    },
    passi: [{ a: 'y', t: 0.7 }, { a: 'y', t: 0.45 }, { a: 'w', t: 0.8 }, { a: 'w', t: 0.45 }, { a: 'giu', t: 0.8 }, { a: 'giu', t: 0.3 }] };
}
function nuotatore() {   // petto sollevato, le braccia vanno da avanti ai fianchi e tornano
  const corpo = { busto: 12, collo: 6, coscia: -5, tibia: -7, piede: 176 };
  return { r: 'anca', inizio: 'avanti', ferma: 'dietro', braccioDietro: true,
    pose: {
      avanti: posa('anca', [0, 1.5], { ...corpo, braccio: 16, avambraccio: 14 }),
      dietro: posa('anca', [0, 1.5], { ...corpo, braccio: 188, avambraccio: 186 }),
    },
    passi: [{ a: 'dietro', t: 1 }, { a: 'dietro', t: 0.35 }, { a: 'avanti', t: 1 }, { a: 'avanti', t: 0.35 }] };
}

// ── A quattro zampe (testa a destra): ginocchia sotto le anche, mani sotto le spalle
const ZAMPE = { coscia: 90, tibia: 0, piede: 180, busto: Math.asin(8 / OSSA.busto) / RAD, braccio: -90, avambraccio: -90 };
function birdDog() {   // si allungano il braccio lontano e la gamba vicina
  return { r: 'ginocchio2', inizio: 'base', ferma: 'lungo', dueGambe: true, dueBraccia: true, fermi: ['ginocchio2', 'mano'],
    pose: {
      base: posa('ginocchio2', [0, 0], { ...ZAMPE, collo: 18 }),
      lungo: posa('ginocchio2', [0, 0], { ...ZAMPE, collo: 14, coscia2: 90, tibia2: 0, piede2: 180, coscia: 3, tibia: 3, piede: 200, braccio2: 10, avambraccio2: 8 }),
    },
    passi: [{ a: 'lungo', t: 0.9 }, { a: 'lungo', t: 0.8 }, { a: 'base', t: 0.9 }, { a: 'base', t: 0.4 }] };
}
function catCow() {
  return { r: 'ginocchio', inizio: 'gatto', ferma: 'gatto', fermi: ['ginocchio', 'mano'],
    pose: {
      gatto: posa('ginocchio', [0, 0], { ...ZAMPE, collo: -35, curva: 7 }),     // schiena in alto, testa giù
      mucca: posa('ginocchio', [0, 0], { ...ZAMPE, collo: 48, curva: -5 }),     // schiena in basso, sguardo avanti
    },
    passi: [{ a: 'mucca', t: 1.4 }, { a: 'mucca', t: 0.5 }, { a: 'gatto', t: 1.4 }, { a: 'gatto', t: 0.5 }] };
}

// ── Plank in movimento
function plankLaterale() {   // visto di fronte: avambraccio a terra, l'altro braccio verso il soffitto
  const g = pendenza(OSSA.braccio, CORPO, 2), gT = Math.asin((OSSA.braccio - 1.5) / OSSA.busto) / RAD, braccia = { braccio: -90, avambraccio: 0 };
  return { r: 'gomito', inizio: 'giu', ferma: 'linea', dueBraccia: true, fermi: ['gomito', 'mano', 'spalla'],
    pose: {
      giu: posa('gomito', [0, 0], { ...braccia, busto: gT, coscia: 1.5, tibia: 0, piede: 115, collo: gT, braccio2: -150, avambraccio2: -170 }),
      linea: posa('gomito', [0, 0], { ...braccia, ...teso(g), piede: 115, collo: g, braccio2: 90, avambraccio2: 90 }),
    },
    passi: [{ a: 'giu', t: 0.5 }, { a: 'linea', t: 0.9 }, { a: 'linea', t: 2.4 }, { a: 'giu', t: 0.9 }] };
}
function plankToccoSpalle() {
  const g = pendenza(34, CORPO), corpo = { piede: SULLE_PUNTE, ...teso(g), collo: g + 8, braccio: -90, avambraccio: -90 }, tocco = { b: -62, a: 100 };
  return { r: 'mano', inizio: 'plank', ferma: 'uno', dueBraccia: true, fermi: ['punta', 'spalla'],
    pose: {
      plank: posa('punta', [0, 0], corpo),
      uno: posa('punta', [0, 0], { ...corpo, braccio2: tocco.b, avambraccio2: tocco.a }),
      due: posa('punta', [0, 0], { ...corpo, braccio2: -90, avambraccio2: -90, braccio: tocco.b, avambraccio: tocco.a }),
    },
    passi: [{ a: 'uno', t: 0.4, r: 'punta' }, { a: 'uno', t: 0.3 }, { a: 'plank', t: 0.4, r: 'punta' }, { a: 'due', t: 0.4, r: 'punta' }, { a: 'due', t: 0.3 }, { a: 'plank', t: 0.4, r: 'punta' }] };
}
function mountainClimber() {   // bacino un po' più alto del plank, così il ginocchio passa sotto il busto
  const base = { braccio: -90, avambraccio: -90, busto: 8, collo: 16 }, sotto = [-36, 6], teso1 = [-81.4, ALT_CAVIGLIA];
  let a = posa('mano', [0, 0], { ...base, piede: -35, tibia: 12, coscia: 150, piede2: SULLE_PUNTE, tibia2: 14, coscia2: 14 });
  let b = posa('mano', [0, 0], { ...base, piede: SULLE_PUNTE, tibia: 14, coscia: 14, piede2: -35, tibia2: 12, coscia2: 150 });
  a = verso(verso(a, 'caviglia', sotto), 'caviglia2', teso1); b = verso(verso(b, 'caviglia', teso1), 'caviglia2', sotto);
  const passo = { r: 'mano', fissa: [['caviglia', 4], ['caviglia2', 4]] };
  return { r: 'mano', inizio: 'a', ferma: 'a', dueGambe: true, fermi: ['mano', 'spalla'], pose: { a, b },
    passi: [{ a: 'b', t: 0.4, ...passo }, { a: 'b', t: 0.1 }, { a: 'a', t: 0.4, ...passo }, { a: 'a', t: 0.1 }] };
}

// ── A pancia in su: la testa è a sinistra (così ginocchia e gomiti si piegano dal lato giusto)
const SUPINO = { busto: 180, collo: 166, braccio: 0, avambraccio: 0, coscia: 182, tibia: 182, piede: 70 };
// Ponte glutei e hip thrust: spalle ferme (a terra o su un rialzo), piedi fermi, sale il bacino.
function ponte({ rialzo = 0, unaGamba = false } = {}) {
  const spalla = [0, rialzo + 1.5], gin = OSSA.tibia, L = OSSA.coscia + OSSA.busto;
  const gSu = Math.asin((gin - spalla[1]) / L) / RAD, piedeX = Math.sqrt(L * L - (gin - spalla[1]) ** 2);   // in alto: spalle, bacino e ginocchia in linea, tibie verticali
  const gGiu = rialzo ? -38 : 0;
  const lib = g => (unaGamba ? { coscia: g < 0 ? 190 : 180 + g + 4, tibia: g < 0 ? 190 : 180 + g + 4, piede: 70 } : {});   // la gamba vicina resta tesa: in alto è in linea con il busto
  const crea = g => {
    let P = posa('spalla', spalla, { busto: 180 + g, collo: 166, braccio: g, avambraccio: g, piede: 0, tibia: 90, coscia: 200, piede2: 0, tibia2: 90, coscia2: 200, ...lib(g) });
    P = verso(P, 'caviglia2', [piedeX, 0]);
    return unaGamba ? P : verso(P, 'caviglia', [piedeX, 0]);
  };
  const passo = { r: 'spalla', fissa: unaGamba ? ['caviglia2'] : ['caviglia', 'caviglia2'] };
  return { r: 'spalla', inizio: 'giu', ferma: 'su', dueGambe: unaGamba, attrezzi: rialzo ? [cassa(-34, 5, rialzo + 1.5 + 0.5)] : [], fermi: ['spalla', 'caviglia2'], pose: { giu: crea(gGiu), su: crea(gSu) },
    passi: [{ a: 'su', t: 0.8, ...passo }, { a: 'su', t: 0.5 }, { a: 'giu', t: 0.8, ...passo }, { a: 'giu', t: 0.3 }] };
}
function hollowHold() {
  return { r: 'anca', inizio: 'giu', ferma: 'tenuta', braccioDietro: true, fermi: ['anca'],
    pose: {
      giu: posa('anca', [0, 1.5], { ...SUPINO, braccio: 180, avambraccio: 180 }),
      tenuta: posa('anca', [0, 1.5], { busto: 167, collo: 150, braccio: 158, avambraccio: 156, coscia: 197, tibia: 197, piede: 20, curva: 3.5 }),   // zona lombare a terra, spalle e gambe staccate
    },
    passi: [{ a: 'giu', t: 0.5 }, { a: 'tenuta', t: 0.9 }, { a: 'tenuta', t: 2.4 }, { a: 'giu', t: 0.9 }] };
}
function legRaise() {
  return { r: 'anca', inizio: 'giu', ferma: 'su', fermi: ['anca', 'spalla'],
    pose: {
      giu: posa('anca', [0, 1.5], { ...SUPINO, coscia: 184, tibia: 184 }),
      su: posa('anca', [0, 1.5], { ...SUPINO, coscia: 268, tibia: 268, piede: 160 }),
    },
    passi: [{ a: 'su', t: 1 }, { a: 'su', t: 0.2 }, { a: 'giu', t: 1.3 }, { a: 'giu', t: 0.2 }] };
}
function deadBug() {   // braccia al soffitto, gambe a 90°: si allungano il braccio lontano e la gamba vicina
  const base = { busto: 180, collo: 168, braccio: 90, avambraccio: 90, coscia: -90, tibia: 180, piede: 90 };
  return { r: 'anca', inizio: 'base', ferma: 'lungo', dueGambe: true, dueBraccia: true, fermi: ['anca', 'spalla'],
    pose: {
      base: posa('anca', [0, 1.5], base),
      lungo: posa('anca', [0, 1.5], { ...base, coscia2: -90, tibia2: 180, piede2: 90, coscia: -170, tibia: 188, piede: 60, braccio2: 170, avambraccio2: 172 }),
    },
    passi: [{ a: 'lungo', t: 0.9 }, { a: 'lungo', t: 0.6 }, { a: 'base', t: 0.9 }, { a: 'base', t: 0.4 }] };
}
function rematoreElastico() {   // elastico fissato davanti, all'altezza del petto: si tirano i gomiti indietro
  const corpo = { piede: 0, tibia: 86, coscia: 96, busto: 88, collo: 88 }, ancora = [78, 62];
  return { r: 'caviglia', inizio: 'avanti', ferma: 'tirato', fili: [{ da: ancora, a: 'mano' }], attrezzi: [parete(ancora[0] - 6, 112)], fermi: ['caviglia', 'anca'],
    pose: {
      avanti: posa('caviglia', [0, 0], { ...corpo, braccio: -22, avambraccio: -8 }),
      tirato: posa('caviglia', [0, 0], { ...corpo, braccio: -152, avambraccio: -14 }),
    },
    passi: [{ a: 'tirato', t: 0.8 }, { a: 'tirato', t: 0.4 }, { a: 'avanti', t: 1 }, { a: 'avanti', t: 0.3 }] };
}
function rematoreTavolo() {   // sotto un tavolo: talloni a terra, corpo teso, il petto sale verso il bordo
  const tallone = [60, 0], corpo = g => ({ piede: 80, ...teso(180 - g), collo: 180 - g + 24 }), gA = Math.asin(32 / CORPO) / RAD, gB = Math.asin(48 / CORPO) / RAD, lati = { mano: 1 };
  const giu = posa('caviglia', tallone, { ...corpo(gA), braccio: 90, avambraccio: 90 }), mano = giunti(giu).mano;
  const su = verso(posa('caviglia', tallone, { ...corpo(gB), braccio: 215, avambraccio: 95 }), 'mano', mano, lati);
  return { r: 'caviglia', inizio: 'giu', ferma: 'su', lati, attrezzi: [tavolo(mano[0] - 62, mano[0] + 5, mano[1] + 1)], fermi: ['mano', 'caviglia'], pose: { giu, su },
    passi: [{ a: 'su', t: 0.9, fissa: ['mano'] }, { a: 'su', t: 0.3 }, { a: 'giu', t: 1, fissa: ['mano'] }, { a: 'giu', t: 0.3 }] };
}

// Chiave: id della prova del test o dell'esercizio della libreria. Due esercizi che di lato sono uguali possono usare la stessa figura.
const COSTRUTTORI = {
  squat, piegamenti, piegamenti_ginocchia: piegamentiGinocchia, burpees, burpees_senza_salto: burpeesFacili, plank, superman, trazioni,
  squat_sedia: squatSedia, goblet_squat: gobletSquat, squat_jump: squatJump, squat_parete: squatParete,
  affondi_indietro: affondiIndietro, affondi_alternati: affondiAvanti, affondi_saltati: affondiSaltati,
  piegamenti_muro: piegamentiMuro, piegamenti_inclinati: () => piegamentiSu(26, 0), piegamenti_piedi_rialzati: () => piegamentiSu(0, 26), piegamenti_diamante: piegamenti,
  pike_pushup: pikePushup, dips_sedia: dipsSedia,
  superman_ytw: supermanYTW, nuotatore, rematore_tavolo: rematoreTavolo, rematore_elastico: rematoreElastico,
  bird_dog: birdDog, cat_cow: catCow, dead_bug: deadBug, hollow_hold: hollowHold, leg_raise: legRaise,
  plank_laterale: plankLaterale, plank_tocco_spalle: plankToccoSpalle, mountain_climber: mountainClimber,
  chin_up: trazioni, affondi_pesi: () => ({ ...affondiAvanti(), inMano: 'peso' }),
  ponte_glutei: () => ponte(), ponte_una_gamba: () => ponte({ unaGamba: true }), hip_thrust: () => ponte({ rialzo: 24 }), hip_thrust_una_gamba: () => ponte({ rialzo: 24, unaGamba: true }),
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
  const allarga = (p, raggio) => { minX = Math.min(minX, p[0] - raggio); maxX = Math.max(maxX, p[0] + raggio); maxY = Math.max(maxY, p[1] + raggio); };
  for (const J of quadri) for (const [nome, p] of Object.entries(J)) allarga(p, nome === 'testa' ? TESTA : TRATTO / 2);
  for (const x of F.attrezzi || []) for (const l of x.linee) for (const p of l) allarga(p, 3);
  for (const x of F.fili || []) allarga(x.da, 3);
  const W = LARGHEZZA, H = Math.ceil(maxY + 20), cx = (minX + maxX) / 2, base = H - 12;
  const X = p => n1(p[0] - cx + W / 2), Y = p => n1(base - p[1]), P = p => X(p) + ' ' + Y(p);
  const linea = (J, nomi) => 'M' + nomi.map(k => P(J[k])).join('L');
  const PARTI = {
    gamba2: ['anca', 'ginocchio2', 'caviglia2', 'punta2'], gamba: ['anca', 'ginocchio', 'caviglia', 'punta'], braccio: ['spalla', 'gomito', 'mano'], braccio2: ['spalla', 'gomito2', 'mano2'],
  };
  // il busto è una curva che passa dalla schiena (dritta se curva = 0)
  const busto = J => `M${P(J.anca)}Q${P([2 * J.schiena[0] - (J.anca[0] + J.spalla[0]) / 2, 2 * J.schiena[1] - (J.anca[1] + J.spalla[1]) / 2])} ${P(J.spalla)}`;
  const anima = (attr, f) => fermo ? '' : `<animate attributeName="${attr}" dur="${n1(durata)}s" repeatCount="indefinite" values="${quadri.map(f).join(';')}"/>`;
  const tratto = (parte, classe, spessore, J0) => `<path class="${classe}" stroke-width="${spessore}" d="${linea(J0, PARTI[parte])}">${anima('d', J => linea(J, PARTI[parte]))}</path>`;
  const corpo = (J0, vivo) => {
    const a = vivo ? anima : () => '';
    const pezzo = (parte, classe, spessore) => vivo ? tratto(parte, classe, spessore, J0) : `<path class="${classe}" stroke-width="${spessore}" d="${linea(J0, PARTI[parte])}"/>`;
    const tronco = `<path class="f-o" stroke-width="${TRATTO_BUSTO}" d="${busto(J0)}">${a('d', busto)}</path>`;
    const peso = F.inMano ? `<circle class="f-peso" r="6.5" cx="${X(J0.mano)}" cy="${Y(J0.mano)}">${a('cx', J => X(J.mano))}${a('cy', J => Y(J.mano))}</circle>` : '';
    const testa = `<circle class="f-testa" r="${TESTA}" cx="${X(J0.testa)}" cy="${Y(J0.testa)}">${a('cx', J => X(J.testa))}${a('cy', J => Y(J.testa))}</circle>`;
    const braccio = pezzo('braccio', 'f-alone', TRATTO + 5) + pezzo('braccio', 'f-o', TRATTO) + peso;
    // di solito il braccio passa davanti; con le braccia tese oltre la testa (superman) la coprirebbe, e allora passa dietro
    return (F.dueBraccia ? pezzo('braccio2', 'f-o f-dietro', TRATTO) : '') + (F.dueGambe ? pezzo('gamba2', 'f-o f-dietro', TRATTO) : '') + pezzo('gamba', 'f-o', TRATTO) + tronco
      + (F.braccioDietro ? braccio + testa : testa + braccio);
  };
  const attrezzi = (F.attrezzi || []).map(x => `<path class="${x.classe}" d="${x.linee.map(l => 'M' + l.map(P).join('L')).join('')}"/>`).join('');
  // fili (elastici, anelli, corde): da un punto fisso a un'articolazione, che seguono mentre si muove
  const fili = J0 => (F.fili || []).map(x => `<path class="f-filo" d="M${P(x.da)}L${P(J0[x.a])}">${fermo ? '' : anima('d', J => `M${P(x.da)}L${P(J[x.a])}`)}</path>`).join('');
  const terra = F.terra === false ? '' : `<path class="f-terra" d="M14 ${n1(base + TRATTO / 2 + 1.5)}H${W - 14}"/>`;
  return `<svg class="figura-svg" viewBox="0 0 ${W} ${H}" ${etichetta ? `role="img" aria-label="${etichetta}"` : 'aria-hidden="true"'}>${terra}`
    + attrezzi + (fermo ? `<g class="f-ombra">${corpo(dati.inizio, false)}</g>${fili(dati.ferma)}${corpo(dati.ferma, false)}` : fili(quadri[0]) + corpo(quadri[0], true)) + `</svg>`;
}
