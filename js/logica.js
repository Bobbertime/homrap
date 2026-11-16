// Logica di allenamento (sezione 7): test e livelli, scelta degli esercizi, ripetizioni, piano, progressione.
// Modulo puro: nessun accesso a DOM o archivio, così si può provare con Node (tests/run.mjs).
import { ESERCIZI, PER_ID } from '../data/esercizi.js';
import { SOGLIE, FASCE_ETA, PROVE } from '../data/soglie-test.js';
import { ATTREZZI } from '../data/attrezzi.js';
import { clamp, arrot5, diffGiorni, lunedi, piuGiorni, giornoSett } from './util.js';

export const OBIETTIVI = ['dimagrire', 'forza', 'resistenza', 'mobilita', 'salute', 'atletico'];
export const AREE = ['spinta', 'trazione', 'gambe', 'core', 'posteriore', 'cond'];
export const FOCUS_SCHEMA = { schiena: 'trazione', gambe: 'gambe', spinta: 'spinta', posteriore: 'posteriore', cond: 'cond', mobilita: 'mobilita' };
// Quota del massimo usata per le ripetizioni, per obiettivo (le tenute usano l'80% di questa quota: 40% invece di 50%).
const QUOTA = { dimagrire: 0.58, forza: 0.38, resistenza: 0.58, mobilita: 0.5, salute: 0.5, atletico: 0.5 };
const FOCUS_OBIETTIVO = {
  dimagrire: ['cond', 'gambe', 'posteriore', 'schiena'], forza: ['spinta', 'schiena', 'gambe', 'posteriore'],
  resistenza: ['cond', 'gambe', 'posteriore', 'spinta'], mobilita: ['mobilita', 'posteriore', 'schiena', 'gambe'],
  salute: ['posteriore', 'mobilita', 'cond', 'schiena'], atletico: ['cond', 'gambe', 'spinta', 'posteriore'],
};
const FOCUS_DEBOLE = { spinta: 'spinta', trazione: 'schiena', gambe: 'gambe', core: 'posteriore', posteriore: 'posteriore', cond: 'cond' };
const RIPIEGO = { spinta: ['core', 'mobilita'], trazione: ['posteriore', 'mobilita'], gambe: ['posteriore', 'mobilita'], core: ['mobilita'], posteriore: ['core', 'mobilita'], cond: ['mobilita'], mobilita: [] };
const PAUSA_TRA_ESERCIZI = 6;   // secondi di passaggio tra un esercizio e l'altro
const CALO_RITMO = 1.12;        // i giri rallentano con la fatica

// ───────────────────────── Test e livelli
export function valoreEq(id, r) {
  if (!r) return 0;
  const p = PROVE.find(x => x.id === id);
  return r.v * (r.fac && p && p.facilitata ? p.facilitata : 1);
}
export function soglieDi(id, profilo = {}) {
  const t = SOGLIE[id], base = t[profilo.sesso] || t.generale;
  const f = (FASCE_ETA.find(x => (profilo.eta || 30) <= x.fino) || { f: 1 }).f;
  return base.map(s => s * f);
}
export function livelloDi(id, v, profilo) {
  const s = soglieDi(id, profilo);
  let liv = 1; for (const x of s) if (v >= x) liv++;
  const lo = liv === 1 ? 0 : s[liv - 2], hi = liv === 5 ? null : s[liv - 1];
  return { liv, fraz: hi == null ? 0.99 : clamp((v - lo) / (hi - lo), 0, 0.99) };
}
export function capacita(ris) {
  const pieg = valoreEq('piegamenti', ris.piegamenti);
  return {
    squat: valoreEq('squat', ris.squat), piegamenti: pieg, burpees: valoreEq('burpees', ris.burpees),
    plank: valoreEq('plank', ris.plank), superman: valoreEq('superman', ris.superman),
    trazioni: ris.trazioni ? ris.trazioni.v : Math.max(0, Math.round((pieg - 10) / 4)),
  };
}
export function valutaTest(ris, profilo = {}) {
  const aree = {};
  for (const p of PROVE) aree[p.area] = livelloDi(p.id, valoreEq(p.id, ris[p.id]), profilo);
  const stima = Math.floor((aree.spinta.liv + aree.posteriore.liv) / 2);
  if (ris.trazioni && ris.trazioni.v > 0) aree.trazione = livelloDi('trazioni', ris.trazioni.v, profilo);
  else aree.trazione = { liv: ris.trazioni ? Math.min(2, stima) : stima, fraz: 0, stimato: true };
  const livelli = Object.fromEntries(AREE.map(a => [a, aree[a].liv]));
  const globale = Math.round(PROVE.reduce((s, p) => s + aree[p.area].liv, 0) / PROVE.length);
  const debole = [...AREE].sort((a, b) => (aree[a].liv + aree[a].fraz) - (aree[b].liv + aree[b].fraz))[0];
  return { aree, livelli, globale, debole, cap: capacita(ris) };
}
// Miglioramento % medio sulle 5 prove tra due test.
export function miglioramento(prima, dopo) {
  if (!prima || !dopo) return null;
  const d = PROVE.map(p => { const a = valoreEq(p.id, prima[p.id]), b = valoreEq(p.id, dopo[p.id]); return (b - a) / Math.max(a, 1); });
  return Math.round(d.reduce((x, y) => x + y, 0) / d.length * 100);
}

// ───────────────────────── Scelta degli esercizi
// Tutti i gruppi di attrezzi devono essere soddisfatti. Un esercizio che vuole due manubri (paio) non vale per chi ne ha uno solo.
export const haAttrezzi = (e, inv = {}) => e.att.every(g => g.some(a => inv[a] && !(e.paio && a === 'manubri' && inv[a].singolo)));
const caricaInfortunio = (e, ctx) => (ctx.infortuni || []).some(z => (e.stress[z] || 0) >= 2);
export const impattoAmmesso = ctx => !ctx.noSalti && !ctx.cauto && !ctx.gravidanza;
export const valido = (e, ctx) => !!e && haAttrezzi(e, ctx.attrezzi) && !(ctx.scartati || []).includes(e.id) &&
  !(ctx.daDecidere || []).includes(e.id) && !caricaInfortunio(e, ctx) && (!e.impatto || impattoAmmesso(ctx));
export function livelloSchema(schema, ctx) {
  if (schema === 'mobilita') return 5;
  const L = ctx.livelli[schema] || 1;
  return ctx.cauto ? Math.max(1, L - 1) : L;
}
export const ammessi = (schema, ctx) => ESERCIZI.filter(e => e.schema === schema && valido(e, ctx));
const prudente = ctx => (ctx.blocco || 1) === 1 && ['mai', 'fermo'].includes(ctx.esperienza);

export function punteggio(e, ctx, L) {
  const [o1, o2] = ctx.obiettivi, eff = o => e.eff[OBIETTIVI.indexOf(o)] || 0;
  let p = o2 ? eff(o1) * 0.65 + eff(o2) * 0.35 : eff(o1 || 'salute');
  for (const z of ctx.zoneMeno || []) p -= 0.5 * (e.stress[z] || 0);        // zone da sforzare meno: abbassano, non escludono
  for (const z of ctx.infortuni || []) p -= 0.3 * (e.stress[z] || 0);
  const d = L - e.liv;
  p -= d >= 0 ? d * (ctx.obiettivi.includes('forza') ? 0.9 : 0.6) : -d * 1.1;  // al livello adatto al test
  if (e.espl) p += o1 === 'atletico' ? 0.6 : o2 === 'atletico' ? 0.3 : 0;      // varianti esplosive per "Fisico atletico"
  return p;
}
export function graduatoria(schema, ctx, escludi = [], extraLiv = 0) {
  const L = livelloSchema(schema, ctx);
  const c = ammessi(schema, ctx).filter(e => !escludi.includes(e.id));
  let ok = c.filter(e => e.liv <= L + extraLiv);
  if (!ok.length && c.length) { const m = Math.min(...c.map(e => e.liv)); ok = c.filter(e => e.liv === m); }
  return ok.map(e => ({ e, p: Math.round(punteggio(e, ctx, L) * 100) / 100 }))
    .sort((a, b) => b.p - a.p || a.e.att.length - b.e.att.length || (a.e.id < b.e.id ? -1 : 1)); // a parità vince il corpo libero
}
export function scegli(schema, ctx, escludi = []) {
  for (const s of [schema, ...RIPIEGO[schema]]) {
    const g = graduatoria(s, ctx, escludi);
    if (!g.length) continue;
    const pref = (ctx.sostituzioni || {})[g[0].e.id];
    const alt = pref && ammessi(s, ctx).find(x => x.id === pref && !escludi.includes(pref));
    return alt || g[0].e;
  }
  return PER_ID.rotazioni_toraciche;
}
// 2-3 alternative dello stesso schema, ognuna con il motivo.
export function alternative(id, ctx, escludi = [], n = 3) {
  const e = PER_ID[id];
  const g = graduatoria(e.schema, ctx, [id, ...escludi], 1);
  const out = g.slice(0, n);
  const fac = g.find(x => x.e.liv < e.liv || x.e.id === e.fac);
  if (fac && !out.includes(fac)) out[out.length >= n ? n - 1 : out.length] = fac;
  const somma = x => Object.values(x.stress).reduce((a, b) => a + b, 0);
  return out.map(({ e: a }) => ({
    e: a,
    motivo: a.liv < e.liv ? 'facile' : a.liv > e.liv ? 'difficile' : somma(a) < somma(e) ? 'gentile'
      : !a.att.length && e.att.length ? 'corpoLibero' : a.att.length ? 'attrezzo' : 'simile',
    obiettivo: (a.eff[OBIETTIVI.indexOf(ctx.obiettivi[0])] || 0) >= 4,
  }));
}

// ───────────────────────── Ripetizioni, tempi, obiettivo di giri
function quotaObiettivi(ctx) {
  const [o1, o2] = ctx.obiettivi;
  return o2 ? QUOTA[o1] * 0.65 + QUOTA[o2] * 0.35 : QUOTA[o1 || 'salute'];
}
const capDi = (e, ctx) => e.rif === 'trazioni' ? Math.max(1, ctx.cap.trazioni || 0) : (ctx.cap[e.rif] || 0);
export function rifinisci(e, q, minimo = e.min) {
  q = e.unita === 'sec' ? arrot5(q) : Math.round(q);
  q = clamp(q, minimo, e.max);
  if (e.pari && q % 2) q++;
  return q;
}
export function pesoPer(e, ctx) {
  if (!e.peso) return null;
  const disp = [...new Set(e.att.flat().flatMap(a => (ctx.attrezzi[a] && ctx.attrezzi[a].kg) || []))].sort((a, b) => a - b);
  if (!disp.length) return null;
  const target = e.peso.kg[livelloSchema(e.schema, ctx) - 1];
  const sotto = disp.filter(k => k <= target);
  return { kg: sotto.length ? sotto[sotto.length - 1] : disp[0], target, disp };
}
export function quantita(e, ctx, fattore = 1) {
  let q;
  if (e.fisso) q = e.fisso;
  else {
    let quota = quotaObiettivi(ctx);
    if (e.unita === 'sec') quota *= 0.8;
    if (ctx.cauto) quota *= 0.8;
    if (prudente(ctx)) quota *= 0.9;
    q = capDi(e, ctx) * e.k * quota * fattore;
  }
  const out = { id: e.id, q: rifinisci(e, q) };
  const p = pesoPer(e, ctx);
  if (p) { out.kg = p.kg; if (p.kg > p.target * 1.25) out.q = rifinisci(e, out.q * 0.75); }
  return out;
}
export const secPerRip = (e, ctx) => e.unita === 'sec' ? 1 : ((ctx.tempi || {})[e.id] || e.sec);
export function tempoGiro(voci, ctx) {
  return voci.reduce((t, x) => { const e = PER_ID[x.id]; return t + x.q * secPerRip(e, ctx) * (e.lato ? 2 : 1) + PAUSA_TRA_ESERCIZI; }, 0);
}
export const ripPerGiro = voci => voci.reduce((t, x) => t + x.q, 0);
export const obiettivoGiri = (voci, durataMin, ctx) => Math.max(1, Math.round(durataMin * 60 / (tempoGiro(voci, ctx) * CALO_RITMO)));
export const giriEq = s => s.giri + (s.ripGiro ? (s.extra || 0) / s.ripGiro : 0);
// Porta il giro intorno ai 3 minuti (5-8 giri in 20').
function normalizza(voci, ctx) {
  const T = tempoGiro(voci, ctx);
  const f = T > 225 ? 200 / T : T < 150 ? Math.min(1.3, 170 / T) : 1;
  if (f === 1) return;
  for (const x of voci) {
    const e = PER_ID[x.id]; if (e.fisso) continue;
    let q = x.q * f;
    if (f > 1) q = Math.min(q, Math.max(x.q, capDi(e, ctx) * e.k * 0.7));
    x.q = rifinisci(e, q);
  }
}

// ───────────────────────── Piano
export function elencoFocus(ctx, n) {
  const [o1, o2] = ctx.obiettivi, a = FOCUS_OBIETTIVO[o1 || 'salute'], b = o2 ? FOCUS_OBIETTIVO[o2] : a;
  const seq = [a[0], FOCUS_DEBOLE[ctx.debole] || a[1], b[0], a[1], a[2], b[1], a[3], 'mobilita', 'cond', 'posteriore'];
  return [...new Set(seq)].slice(0, n);
}
export function generaPiano(ctx, oggi) {
  const usati = [];
  const base = ['spinta', 'trazione', 'gambe', 'core'].map(slot => { const e = scegli(slot, ctx, usati); usati.push(e.id); return { slot, e }; });
  const giorno = (tipo, focus, leggero) => {
    const fx = scegli(FOCUS_SCHEMA[focus], ctx, usati), f = leggero ? 0.75 : 1;
    const esercizi = [...base.map(b => ({ slot: b.slot, ...quantita(b.e, ctx, f) })), { slot: 'focus', ...quantita(fx, ctx, f) }];
    if (!leggero) normalizza(esercizi, ctx);
    return { tipo, focus, leggero: !!leggero, rev: 0, esercizi };
  };
  const n = clamp(ctx.giorni || 3, 2, 6), focus = elencoFocus(ctx, Math.min(n, 4));
  const g = focus.map((f, i) => giorno('ABCD'[i], f, false));
  let giorni = g;
  if (n >= 5) {  // giorni a intensità ridotta, alternati agli altri
    const lf = ['mobilita', 'posteriore', 'schiena'].filter(f => !focus.includes(f));
    const E = giorno('E', lf[0] || 'mobilita', true);
    if (n === 5) giorni = [g[0], g[1], E, g[2], g[3]];
    else giorni = [g[0], E, g[1], g[2], giorno('F', lf[1] || 'posteriore', true), g[3]];
  }
  return { blocco: ctx.blocco || 1, inizio: oggi, durata: ctx.durata || 20, giorniSett: [...ctx.giorniSett], giorni };
}
export const GIORNI_PREDEFINITI = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
export const settimanaBlocco = (piano, oggi) => Math.floor(diffGiorni(lunedi(piano.inizio), lunedi(oggi)) / 7) + 1;

const allenamenti = sessioni => sessioni.filter(s => s.tipo === 'amrap' || s.tipo === 'sfida');
export function inRipartenza(sessioni, oggi) {
  const d = [...new Set(allenamenti(sessioni).map(s => s.data))].sort();
  if (!d.length) return false;
  if (diffGiorni(d[d.length - 1], oggi) > 10) return true;
  for (let i = d.length - 1; i > 0; i--) {
    if (diffGiorni(d[i], oggi) >= 7) break;
    if (diffGiorni(d[i - 1], d[i]) > 10) return true;
  }
  return false;
}
export function giorniDiPausa(sessioni, oggi) {
  const d = allenamenti(sessioni).map(s => s.data).sort();
  return d.length ? diffGiorni(d[d.length - 1], oggi) : 0;
}
// Il circuito effettivo di una sessione: applica scarico (settimana 4), ripartenza e sostituzioni temporanee.
export function circuitoSessione(piano, idx, ctx, sessioni, oggi) {
  const g = piano.giorni[idx], settimana = settimanaBlocco(piano, oggi);
  let fattore = 1, motivo = null;
  if (inRipartenza(sessioni, oggi)) { fattore = 0.8; motivo = 'ripartenza'; }
  if (settimana === 4) { fattore = 0.7; motivo = 'scarico'; }
  const usati = g.esercizi.map(x => x.id);
  const esercizi = g.esercizi.map(x => {
    let e = PER_ID[x.id], v = { ...x };
    if (!valido(e, ctx)) {
      const schema = e ? e.schema : x.slot === 'focus' ? FOCUS_SCHEMA[g.focus] : x.slot;
      e = scegli(schema, ctx, usati); usati.push(e.id);
      v = { slot: x.slot, ...quantita(e, ctx, g.leggero ? 0.75 : 1), alPostoDi: x.id };
    }
    if (fattore < 1 && !e.fisso) v.q = rifinisci(e, v.q * fattore, e.unita === 'sec' ? 10 : Math.min(e.min, 3));
    return v;
  });
  return { tipo: g.tipo, focus: g.focus, leggero: g.leggero, rev: g.rev || 0, esercizi, fattore, motivo, settimana,
    durata: piano.durata, obiettivo: obiettivoGiri(esercizi, piano.durata, ctx), ripGiro: ripPerGiro(esercizi) };
}
// Qual è il prossimo allenamento: i tipi di giorno ruotano, i giorni della settimana sono quelli scelti.
export function prossimo(piano, sessioni, oggi) {
  const fatte = sessioni.filter(s => s.tipo === 'amrap' && s.blocco === piano.blocco).sort((a, b) => a.ts - b.ts);
  const idx = fatte.length ? (piano.giorni.findIndex(g => g.tipo === fatte[fatte.length - 1].tipoGiorno) + 1) % piano.giorni.length : 0;
  const lun = lunedi(oggi), tutte = sessioni.filter(s => s.tipo === 'amrap');
  const fattoOggi = tutte.some(s => s.data === oggi);
  const fatteSett = new Set(tutte.filter(s => s.data >= lun && s.data <= piuGiorni(lun, 6)).map(s => s.data)).size;
  const completa = fatteSett >= piano.giorniSett.length;
  const eOggi = piano.giorniSett.includes(giornoSett(oggi)) && !fattoOggi && !completa;
  let data = oggi;
  if (!eOggi) for (let i = 1; i <= 14; i++) {
    const d = piuGiorni(oggi, i);
    if (piano.giorniSett.includes(giornoSett(d)) && !(lunedi(d) === lun && completa)) { data = d; break; }
  }
  return { idx, oggi: eOggi, data, fattoOggi, fatteSett };
}
// Serie: giorni di allenamento consecutivi senza saltare una settimana di piano (la settimana in corso non interrompe).
export function serieGiorni(sessioni, perSettimana, oggi) {
  const perSett = {};
  for (const d of new Set(allenamenti(sessioni).map(s => s.data))) { const l = lunedi(d); perSett[l] = (perSett[l] || 0) + 1; }
  let l = lunedi(oggi), n = perSett[l] || 0;
  for (;;) { l = piuGiorni(l, -7); const c = perSett[l] || 0; if (c >= Math.max(1, perSettimana)) n += c; else break; }
  return n;
}

// ───────────────────────── Progressione suggerita (mai automatica)
// Soglie del battito, usate solo quando la sessione ha il battito medio e si conosce il massimo (ctx.bpmMax).
export const BATTITO = {
  alto: 0.90,        // media dell'ultima sessione dal 90% del massimo in su: niente aumento, anche se i giri ci sono
  basso: 0.75,       // media fino al 75% del massimo…
  faticaBassa: 5,    // …con fatica fino a 5, per due sessioni di fila e con l'obiettivo raggiunto: si può aumentare
};
// Quota del battito massimo tenuta in media nella sessione; null se manca il battito o il massimo.
export function quotaBattito(s, ctx) {
  const b = s && s.orologio ? Number(s.orologio.bpmMedio) : 0, max = Number(ctx && ctx.bpmMax);
  return b >= 40 && b <= 230 && max >= 100 ? b / max : null;
}
function relativa(da, a, q, ctx) {
  return da.rif && da.rif === a.rif ? rifinisci(a, q * a.k / da.k) : quantita(a, ctx).q;
}
function modifica(g, v, tipo, ctx) {
  const { x, e, i } = v, passo = e.unita === 'sec' ? 5 : e.pari ? 2 : 1, base = { i, da: x.id, a: x.id, q0: x.q };
  if (x.kg != null) { base.kg0 = x.kg; base.kg1 = x.kg; }
  const altro = id => { const d = id && PER_ID[id]; return d && valido(d, ctx) && !g.esercizi.some(y => y.id === d.id) ? d : null; };
  if (tipo === 'aumenta') {
    let q1 = rifinisci(e, x.q * 1.12); if (q1 <= x.q) q1 = x.q + passo;
    const soglia = e.soglia || e.max;
    if (q1 > soglia) {
      const p = x.kg != null && pesoPer(e, ctx), piu = p && p.disp.find(k => k > x.kg);
      if (piu) return { ...base, q1: rifinisci(e, x.q * 0.8), kg1: piu };          // progressione dei kg
      const d = altro(e.dif);
      if (d) { const m = { ...base, a: d.id, q1: relativa(e, d, x.q, ctx) }; const pd = pesoPer(d, ctx); if (pd) m.kg1 = pd.kg; else delete m.kg1; return m; }
      q1 = soglia; if (q1 <= x.q) return null;
    }
    return { ...base, q1 };
  }
  let q1 = e.unita === 'sec' ? Math.floor(x.q * 0.88 / 5) * 5 : Math.floor(x.q * 0.88);
  if (e.pari && q1 % 2) q1--;
  if (q1 >= x.q) q1 = x.q - passo;
  if (q1 < e.min) {
    const f = altro(e.fac);
    if (f) { const m = { ...base, a: f.id, q1: relativa(e, f, x.q, ctx) }; const pf = pesoPer(f, ctx); if (pf) m.kg1 = pf.kg; else delete m.kg1; return m; }
    q1 = e.min; if (q1 >= x.q) return null;
  }
  return { ...base, q1 };
}
export function valutaProgressione(piano, idx, sessioni, ctx) {
  const g = piano.giorni[idx];
  const s = sessioni.filter(x => x.tipo === 'amrap' && x.blocco === piano.blocco && x.tipoGiorno === g.tipo && (x.rev || 0) === (g.rev || 0) && x.fattore === 1 && !x.interrotta)
    .sort((a, b) => a.ts - b.ts);
  if (!s.length) return null;
  const ult = s[s.length - 1], due = s.slice(-2);
  if (g.rimandato === ult.id) return null;
  let tipo = null, motivo = null;
  const quota = quotaBattito(ult, ctx), base = { idx, tipoGiorno: g.tipo, sessione: ult.id };
  if (quota != null) base.battito = Math.round(quota * 100);     // per il testo della card
  if (ult.fatica >= 9) { tipo = 'alleggerisci'; motivo = 'fatica'; }
  else if (due.length === 2 && due.every(x => giriEq(x) >= x.obiettivo + 1 && (x.fatica || 5) <= 8)) {
    // I giri ci sono, ma il cuore lavora già vicino al massimo: per ora si resta così.
    if (quota != null && quota >= BATTITO.alto) return { tipo: 'mantieni', motivo: 'battitoAlto', ...base, modifiche: [] };
    tipo = 'aumenta'; motivo = 'sopra';
  }
  else if (due.length === 2 && due.every(x => giriEq(x) <= x.obiettivo - 1)) { tipo = 'alleggerisci'; motivo = 'sotto'; }
  // Obiettivo raggiunto due volte di fila con fatica bassa e battito basso: si può aumentare anche senza il giro in più.
  else if (due.length === 2 && due.every(x => { const q = quotaBattito(x, ctx);
    return giriEq(x) >= x.obiettivo && x.fatica != null && x.fatica <= BATTITO.faticaBassa && q != null && q <= BATTITO.basso; })) { tipo = 'aumenta'; motivo = 'facile'; }
  if (!tipo) return null;
  const voci = g.esercizi.map((x, i) => ({ x, i, e: PER_ID[x.id] })).filter(v => v.e && !v.e.fisso);
  const intensita = v => v.x.q / Math.max(1, capDi(v.e, ctx) * v.e.k);
  voci.sort((a, b) => tipo === 'aumenta' ? intensita(a) - intensita(b) : intensita(b) - intensita(a)); // aumenta sui più facili
  const modifiche = voci.slice(0, 3).map(v => modifica(g, v, tipo, ctx)).filter(Boolean).sort((a, b) => a.i - b.i);
  return modifiche.length ? { tipo, motivo, ...base, modifiche } : null;
}
export function applicaModifiche(piano, sugg) {
  const g = piano.giorni[sugg.idx];
  if (!sugg.modifiche || !sugg.modifiche.length) return;   // «mantieni» non cambia il piano
  for (const m of sugg.modifiche) {
    const v = { slot: g.esercizi[m.i].slot, id: m.a, q: m.q1 };
    if (m.kg1 != null) v.kg = m.kg1;
    g.esercizi[m.i] = v;
  }
  g.rev = (g.rev || 0) + 1; delete g.rimandato;
}
export function sostituisci(piano, idx, i, nuovoId, ctx) {
  const g = piano.giorni[idx];
  g.esercizi[i] = { slot: g.esercizi[i].slot, ...quantita(PER_ID[nuovoId], ctx, g.leggero ? 0.75 : 1) };
  g.rev = (g.rev || 0) + 1;
}
// Aggiorna il tempo stimato per ripetizione con i dati reali (media mobile).
export function aggiornaTempi(tempi, voci, secGiroReale, ctx, perEsercizio) {
  const stimato = tempoGiro(voci, ctx);
  if (!secGiroReale || !stimato) return tempi;
  const out = { ...tempi };
  for (const x of voci) {
    const e = PER_ID[x.id]; if (e.unita === 'sec' || !x.q) continue;
    const att = secPerRip(e, ctx);
    const reale = perEsercizio && perEsercizio[x.id] ? perEsercizio[x.id] / (x.q * (e.lato ? 2 : 1)) : att * secGiroReale / stimato;
    out[x.id] = Math.round(clamp(att * 0.7 + reale * 0.3, e.sec * 0.5, e.sec * 2.5) * 100) / 100;
  }
  return out;
}

// ───────────────────────── Attrezzatura: cosa sblocca e cosa comprare dopo
export function sblocca(attrezzo, ctx) {
  const con = { ...ctx.attrezzi, [attrezzo.id]: attrezzo.conKg ? { kg: attrezzo.kgTipici } : true };
  const nuovi = ESERCIZI.filter(e => haAttrezzi(e, con) && !haAttrezzi(e, ctx.attrezzi));
  const perSchema = {};
  for (const e of nuovi) perSchema[e.schema] = (perSchema[e.schema] || 0) + 1;
  return { nuovi, perSchema, con };
}
export function consigliAcquisto(ctx, piano) {
  const schemi = [...new Set(['spinta', 'trazione', 'gambe', 'core', ...(piano ? piano.giorni.map(g => FOCUS_SCHEMA[g.focus]) : ['cond', 'posteriore'])])];
  const migliore = (c, s) => { const g = graduatoria(s, c); return g.length ? g[0].p : 0; };
  const haTrazione = ['sbarra', 'elastici', 'manubri', 'kettlebell', 'anelli'].some(a => ctx.attrezzi[a]);
  const out = [];
  for (const a of ATTREZZI) {
    if (ctx.attrezzi[a.id]) continue;
    const { nuovi, perSchema, con } = sblocca(a, ctx);
    if (!nuovi.length) continue;
    const c2 = { ...ctx, attrezzi: con };
    const guadagno = schemi.reduce((t, s) => t + Math.max(0, migliore(c2, s) - migliore(ctx, s)), 0) / schemi.length;
    let bonus = 0, motivo = guadagno > 0.05 ? 'obiettivo' : 'varieta', schema = Object.keys(perSchema).sort((x, y) => perSchema[y] - perSchema[x])[0];
    for (const s of Object.keys(perSchema)) {
      if (s !== 'mobilita' && (ctx.livelli[s] || 1) >= 4) { bonus += 1; motivo = 'massimo'; schema = s; }   // già al massimo a corpo libero
    }
    if (!haTrazione && perSchema.trazione) { bonus += a.id === 'sbarra' ? 1.5 : a.id === 'kettlebell' ? 0.75 : 1; /* la kettlebell aiuta la trazione con un solo esercizio */ motivo = 'trazione'; schema = 'trazione'; }
    const movimenti = nuovi.filter(e => !e.paio).length;   // la versione a due manubri e quella a un braccio contano una volta sola
    out.push({ attrezzo: a, punti: guadagno * 2 + bonus + movimenti * 0.15, guadagno, motivo, schema, perSchema, nuovi });
  }
  return out.sort((x, y) => y.punti - x.punti || (x.attrezzo.id < y.attrezzo.id ? -1 : 1)).slice(0, 3);
}
