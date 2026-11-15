// Analisi di una sessione per la schermata Report: battito massimo, zone di sforzo, tempi dei giri,
// confronto con la sessione precedente e frasi di lettura generate con regole sui dati.
// Modulo puro: nessun accesso a DOM o archivio, così si può provare con Node (tests/run.mjs).
// Le frasi escono come { k, par }: i testi stanno in i18n/it.js sotto "rep.frase.<k>".
import { giriEq } from './logica.js';
import { media } from './util.js';

// Confini delle 5 zone, come quota del battito massimo: Z1 sotto il 60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 dal 90%.
export const CONFINI_ZONE = [0.6, 0.7, 0.8, 0.9];
// Soglie delle frasi di lettura (spiegate nel README, "Decisioni prese").
export const SOGLIE_REPORT = {
  caloLieve: 0.08, caloForte: 0.15, crescendo: -0.05,     // variazione tra il primo e l'ultimo terzo dei giri
  zonaRossa: 0.25,                                        // quota del tempo in zona 5 che merita una frase
  deriva: 8,                                              // bpm in più nella seconda metà, a ritmo costante
  giri: 0.25, bpm: 3, bpmSu: 5,                           // differenze minime nel confronto con la sessione precedente
  obiettivo: 0.5,
};

const numero = v => typeof v === 'number' && isFinite(v);
const bpmValido = v => numero(v) && v >= 40 && v <= 230;
const arrot1 = v => Math.round(v * 10) / 10;

// ───────────────────────── Battito massimo
export const stimaBpmMax = eta => (eta >= 12 && eta <= 99 ? Math.round(208 - 0.7 * eta) : null);
// Il più alto mai registrato dall'orologio (valore della sessione o punto più alto della curva).
export function bpmRegistrato(sessioni = []) {
  let m = 0;
  for (const s of sessioni) {
    const o = s && s.orologio; if (!o) continue;
    if (bpmValido(o.bpmMax) && o.bpmMax >= 100) m = Math.max(m, o.bpmMax);
    for (const p of o.curva || []) if (bpmValido(p[1]) && p[1] >= 100) m = Math.max(m, p[1]);
  }
  return m || null;
}
// Ordine: valore scritto nel profilo; altrimenti la stima dall'età oppure il più alto registrato, se maggiore.
export function bpmMassimo(profilo = {}, sessioni = []) {
  const manuale = Number(profilo && profilo.bpmMax);
  if (manuale >= 120 && manuale <= 230) return { valore: Math.round(manuale), fonte: 'profilo' };
  const stima = stimaBpmMax(Number(profilo && profilo.eta)), reg = bpmRegistrato(sessioni);
  if (reg && (!stima || reg > stima)) return { valore: reg, fonte: 'registrato' };
  return stima ? { valore: stima, fonte: 'eta' } : { valore: null, fonte: null };
}

// ───────────────────────── Zone di sforzo
export function zonaDi(bpm, max) {
  let z = 1; for (const c of CONFINI_ZONE) if (bpm >= c * max) z++;
  return z;
}
// Secondi passati in ogni zona. Ogni tratto tra due punti conta per la zona del battito medio del tratto;
// i buchi lunghi (orologio in pausa) non contano.
export function tempoInZone(curva, max) {
  if (!max || !curva || curva.length < 2) return null;
  const passi = curva.slice(1).map((p, i) => p[0] - curva[i][0]).filter(d => d > 0).sort((a, b) => a - b);
  if (!passi.length) return null;
  const limite = Math.max(30, passi[Math.floor(passi.length / 2)] * 4), sec = [0, 0, 0, 0, 0];
  for (let i = 1; i < curva.length; i++) {
    const dt = curva[i][0] - curva[i - 1][0];
    if (dt <= 0 || dt > limite) continue;
    sec[zonaDi((curva[i][1] + curva[i - 1][1]) / 2, max) - 1] += dt;
  }
  const tot = sec.reduce((a, b) => a + b, 0);
  return tot ? { sec: sec.map(Math.round), tot: Math.round(tot), quota: sec.map(x => x / tot) } : null;
}
export function statisticheCurva(curva) {
  const b = curva.map(p => p[1]), t0 = curva[0][0], t1 = curva[curva.length - 1][0], meta = (t0 + t1) / 2;
  const prima = curva.filter(p => p[0] < meta).map(p => p[1]), dopo = curva.filter(p => p[0] >= meta).map(p => p[1]);
  return { media: Math.round(media(b)), max: Math.max(...b), min: Math.min(...b), durata: t1 - t0,
    deriva: prima.length && dopo.length ? Math.round(media(dopo) - media(prima)) : 0 };
}
// Tutto quello che si sa del battito di una sessione; null se non c'è nessun dato.
export function analisiCuore(s, max) {
  const o = s.orologio || {};
  const punti = Array.isArray(o.curva) ? o.curva.filter(p => p && numero(p[0]) && bpmValido(p[1])) : [];
  const curva = punti.length >= 2 ? punti : null, st = curva ? statisticheCurva(curva) : null;
  const medio = bpmValido(o.bpmMedio) ? o.bpmMedio : st ? st.media : null;
  const picco = bpmValido(o.bpmMax) ? o.bpmMax : st ? st.max : null;
  if (medio == null && picco == null) return null;
  return { medio, picco, calorie: o.calorie || null, curva, deriva: st ? st.deriva : null,
    quota: max && medio ? medio / max : null, zonaMedia: max && medio ? zonaDi(medio, max) : null,
    zone: curva ? tempoInZone(curva, max) : null, oltreMax: !!(max && picco && picco > max) };
}

// ───────────────────────── Giri
// I tempi dei giri: quelli presi dall'app; se mancano (allenamento fatto con l'orologio) i lap del file,
// senza l'ultimo, che è il giro incompleto chiuso dallo stop.
export function tempiGiriDi(s) {
  const app = (s.tempiGiro || []).filter(x => x > 0);
  if (app.length) return { tempi: app, fonte: 'app' };
  const lap = s.orologio && Array.isArray(s.orologio.giri) ? s.orologio.giri.map(g => g.durata) : [];
  const completi = lap.slice(0, -1).filter(x => x > 0);
  return completi.length ? { tempi: completi, fonte: 'orologio' } : { tempi: [], fonte: null };
}
// calo: quanto sono più lenti gli ultimi giri rispetto ai primi (primo e ultimo terzo); 0,10 = +10% di tempo a giro.
export function analisiGiri(tempi) {
  const t = (tempi || []).filter(x => x > 0), n = t.length;
  if (!n) return null;
  const m = media(t), min = Math.min(...t), max = Math.max(...t), terzo = n >= 2 ? Math.max(1, Math.floor(n / 3)) : 0;
  const primi = terzo ? media(t.slice(0, terzo)) : null, ultimi = terzo ? media(t.slice(-terzo)) : null;
  const calo = terzo ? (ultimi - primi) / primi : null;
  const S = SOGLIE_REPORT;
  return { tempi: t, n, media: m, min, max, iMin: t.indexOf(min), iMax: t.indexOf(max), primi, ultimi, calo,
    regolarita: n > 1 ? Math.sqrt(media(t.map(x => (x - m) ** 2))) / m : 0,
    andamento: calo == null ? null : calo >= S.caloForte ? 'caloForte' : calo >= S.caloLieve ? 'caloLieve' : calo <= S.crescendo ? 'crescendo' : 'costante' };
}
// Tempo medio di un giro: la media dei giri cronometrati; senza tempi, durata diviso giri (solo se la sessione è arrivata in fondo).
export function mediaGiroDi(s) {
  const { tempi } = tempiGiriDi(s), eq = giriEq(s);
  return tempi.length ? media(tempi) : !s.interrotta && eq > 0 ? s.durata * 60 / eq : null;
}
// Battito medio di ogni giro e confini dei giri sull'asse dei secondi della curva.
// Con i giri dell'app la curva viene allineata con l'ora di inizio (se la differenza è entro 15 minuti).
export function bpmPerGiro(s, tempi, fonte) {
  const o = s.orologio;
  if (!o || !Array.isArray(o.curva) || o.curva.length < 2 || !tempi || !tempi.length) return null;
  let da = 0;
  if (fonte === 'app' && s.inizio && o.inizio) { const d = (s.inizio - o.inizio) / 1000; if (Math.abs(d) <= 900) da = d; }
  const confini = [da]; for (const x of tempi) confini.push(confini[confini.length - 1] + x);
  const bpm = tempi.map((_, i) => { const v = o.curva.filter(p => p[0] >= confini[i] && p[0] < confini[i + 1]).map(p => p[1]); return v.length ? Math.round(media(v)) : null; });
  return bpm.some(v => v != null) ? { bpm, confini } : null;
}

// ───────────────────────── Confronto con la sessione precedente dello stesso tipo di giorno
export function precedente(s, sessioni = []) {
  const stesso = x => x.id !== s.id && x.ts < s.ts && x.tipo === s.tipo && !x.interrotta &&
    (s.tipo === 'sfida' ? x.meseSfida === s.meseSfida && x.variante === s.variante : x.tipoGiorno === s.tipoGiorno);
  return sessioni.filter(stesso).sort((a, b) => a.ts - b.ts).pop() || null;
}
const firma = s => [s.durata, s.fattore == null ? 1 : s.fattore, ...(s.esercizi || []).map(e => `${e.id}:${e.q}:${e.kg == null ? '' : e.kg}`)].join('|');
const coppia = (ora, prima) => (numero(ora) && numero(prima) ? { ora, prima, diff: ora - prima } : null);
export function confronta(s, p, max) {
  if (!p) return null;
  const eq = giriEq(s), eqP = giriEq(p), g = analisiGiri(tempiGiriDi(s).tempi), gP = analisiGiri(tempiGiriDi(p).tempi);
  const c = analisiCuore(s, max), cP = analisiCuore(p, max);
  return { id: p.id, data: p.data, circuitoDiverso: firma(s) !== firma(p),
    giri: coppia(eq, eqP), mediaGiro: coppia(mediaGiroDi(s), mediaGiroDi(p)),
    calo: g && gP ? coppia(g.calo, gP.calo) : null, bpm: c && cP ? coppia(c.medio, cP.medio) : null,
    fatica: coppia(s.fatica, p.fatica), precGiri: p.giri, precExtra: p.extra || 0 };
}

// ───────────────────────── Lettura: 2-3 frasi scelte con regole
const pct = v => Math.round(Math.abs(v) * 100);
function fraseRitmo(g) {
  if (!g || g.n < 2) return null;
  if (g.andamento === 'caloForte') return { k: 'caloForte', par: { pct: pct(g.calo), sec: Math.max(3, Math.round(g.media - g.primi)) } };
  if (g.andamento === 'caloLieve') return { k: 'caloLieve', par: { pct: pct(g.calo) } };
  if (g.andamento === 'crescendo') return { k: 'crescendo', par: { pct: pct(g.calo) } };
  return { k: 'costante', par: { sec: Math.round(g.max - g.min) } };
}
function fraseCuore(c, g) {
  if (!c || c.quota == null) return null;
  const S = SOGLIE_REPORT, par = { pct: Math.round(c.quota * 100) };
  if (c.zone && c.zone.quota[4] >= S.zonaRossa) return { k: 'zonaRossa', par: { sec: c.zone.sec[4], pct: Math.round(c.zone.quota[4] * 100) } };
  if (c.quota >= CONFINI_ZONE[3]) return { k: 'cuoreMoltoAlto', par };
  if (g && g.andamento === 'costante' && c.deriva != null && c.deriva >= S.deriva) return { k: 'deriva', par: { bpm: c.deriva } };
  return { k: c.quota >= CONFINI_ZONE[2] ? 'cuoreAlto' : c.quota >= CONFINI_ZONE[1] ? 'cuoreMedio' : 'cuoreBasso', par };
}
function fraseConfronto(cf) {
  if (!cf) return { k: 'primaVolta', par: {} };
  const S = SOGLIE_REPORT, data = cf.data;
  if (cf.circuitoDiverso) return { k: 'circuitoCambiato', par: { data } };
  const dg = cf.giri ? cf.giri.diff : 0, db = cf.bpm ? cf.bpm.diff : null, giri = arrot1(Math.abs(dg));
  if (dg >= S.giri) return db != null && db <= -S.bpm ? { k: 'meglioMenoBattito', par: { data, giri, bpm: Math.round(-db) } } : { k: 'piuGiri', par: { data, giri } };
  if (dg <= -S.giri) return { k: 'menoGiri', par: { data, giri } };
  if (db != null && db <= -S.bpm) return { k: 'stessoMenoBattito', par: { data, bpm: Math.round(-db) } };
  if (db != null && db >= S.bpmSu) return { k: 'stessoPiuBattito', par: { data, bpm: Math.round(db) } };
  return { k: 'stabile', par: { data } };
}
function fraseSensazione(s, c) {   // fatica percepita e battito che non vanno d'accordo
  if (!c || c.quota == null || !numero(s.fatica)) return null;
  if (s.fatica >= 8 && c.quota < 0.75) return { k: 'faticaSenzaBattito', par: { fatica: s.fatica } };
  if (s.fatica <= 5 && c.quota >= 0.88) return { k: 'battitoSenzaFatica', par: { fatica: s.fatica } };
  return null;
}
function fraseObiettivo(s) {
  if (!s.obiettivo) return null;
  const d = giriEq(s) - s.obiettivo, giri = arrot1(Math.abs(d));
  return Math.abs(d) < SOGLIE_REPORT.obiettivo ? { k: 'inObiettivo', par: { n: s.obiettivo } } : { k: d > 0 ? 'sopraObiettivo' : 'sottoObiettivo', par: { giri, n: s.obiettivo } };
}
export function lettura(s, { giri, cuore, confronto }) {
  const out = [], metti = f => { if (f && out.length < 3) out.push(f); };
  if (s.interrotta) metti({ k: 'interrotta', par: {} });
  metti(fraseRitmo(giri));
  metti(fraseCuore(cuore, giri));
  if (out.length < 2) metti(fraseSensazione(s, cuore));
  metti(fraseConfronto(confronto));
  if (!cuore) metti(fraseObiettivo(s));
  metti(fraseSensazione(s, cuore));
  if (out.length < 2) metti(fraseObiettivo(s));
  return out.filter((f, i) => out.findIndex(x => x.k === f.k) === i);
}

// ───────────────────────── Tutto insieme
export function analizza(s, sessioni = [], profilo = {}) {
  const max = bpmMassimo(profilo, sessioni), { tempi, fonte } = tempiGiriDi(s);
  const giri = analisiGiri(tempi), cuore = analisiCuore(s, max.valore), prec = precedente(s, sessioni);
  const confronto = confronta(s, prec, max.valore);
  return { max, giri, fonteGiri: fonte, bpmGiri: bpmPerGiro(s, tempi, fonte), cuore, prec, confronto, eq: giriEq(s),
    mediaGiro: mediaGiroDi(s), frasi: lettura(s, { giri, cuore, confronto }) };
}
