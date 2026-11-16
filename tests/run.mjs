// Test automatici della logica. Si lanciano con:  node tests/run.mjs   (serve Node 18 o successivo)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import * as L from '../js/logica.js';
import * as C from '../js/classifica.js';
import { decodificaFIT, giriDaLap, abbina } from '../js/orologi.js';
import { creaBackup, verificaBackup, SCHEMA } from '../js/backup.js';
import { ESERCIZI, PER_ID, SCHEMI, ZONE } from '../data/esercizi.js';
import { ATTREZZI } from '../data/attrezzi.js';
import { PROVE } from '../data/soglie-test.js';
import { IT } from '../i18n/it.js';
import { EN } from '../i18n/en.js';
import { t, tn, impostaLingua, lingua, locale } from '../js/i18n.js';
import { piuGiorni, settimanaISO, lunedi, linkVideo, eYouTube } from '../js/util.js';
import * as A from '../js/analisi.js';
import { passoNav } from '../js/router.js';
import * as F from '../js/figure.js';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, ko = 0;
const gruppo = nome => console.log('\n' + nome);
function prova(nome, fn) {
  const fine = e => { if (e) { ko++; console.log('  ✗ ' + nome + '\n      ' + (e.message || e)); } else { ok++; console.log('  ✓ ' + nome); } };
  try { const r = fn(); if (r && r.then) return r.then(() => fine(), fine); fine(); } catch (e) { fine(e); }
}
const vero = (c, msg = 'condizione falsa') => { if (!c) throw new Error(msg); };
const uguale = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} atteso ${JSON.stringify(b)}, ottenuto ${JSON.stringify(a)}`); };

// ── Dati di base
const RIS = { squat: { v: 32 }, piegamenti: { v: 14 }, burpees: { v: 12 }, plank: { v: 62 }, superman: { v: 45 } };
const V = L.valutaTest(RIS, { eta: 35 });
const ctxBase = (extra = {}) => ({ obiettivi: ['salute'], esperienza: 'regolare', infortuni: [], zoneMeno: [], cauto: false, gravidanza: false, noSalti: false, attrezzi: {},
  livelli: { ...V.livelli }, debole: V.debole, cap: { ...V.cap }, scartati: [], daDecidere: [], sostituzioni: {}, tempi: {}, giorni: 3, giorniSett: [1, 3, 5], durata: 20, blocco: 2, ...extra });
const OGGI = '2026-11-16'; // un lunedì
let nS = 0;
const sessione = (piano, idx, ctx, data, extra = {}) => { const c = L.circuitoSessione(piano, idx, ctx, [], piano.inizio);
  return { id: 's' + (++nS), ts: Date.parse(data) + nS, data, tipo: 'amrap', blocco: piano.blocco, tipoGiorno: c.tipo, rev: piano.giorni[idx].rev || 0, fattore: 1, durata: 20, esercizi: c.esercizi, obiettivo: c.obiettivo, ripGiro: c.ripGiro, giri: c.obiettivo, extra: 0, fatica: 7, ...extra }; };

gruppo('Test e livelli');
prova('livelli dal test con soglie per età', () => { uguale(V.livelli, { spinta: 3, trazione: 3, gambe: 3, core: 3, posteriore: 3, cond: 3 }); uguale(V.globale, 3); });
prova('la variante facilitata vale meno', () => { uguale(Math.round(L.valoreEq('piegamenti', { v: 20, fac: true })), 11); uguale(L.valoreEq('squat', { v: 20, fac: true }), 20); });
prova('soglie per sesso e generali', () => { vero(L.livelloDi('piegamenti', 10, { eta: 25, sesso: 'F' }).liv > L.livelloDi('piegamenti', 10, { eta: 25, sesso: 'M' }).liv); uguale(L.livelloDi('squat', 0, {}).liv, 1); uguale(L.livelloDi('squat', 999, {}).liv, 5); });
prova('trazione stimata senza sbarra, misurata con la sbarra', () => { vero(V.aree.trazione.stimato); const v2 = L.valutaTest({ ...RIS, trazioni: { v: 7 } }, { eta: 25 }); uguale(v2.aree.trazione.liv, 4); vero(!v2.aree.trazione.stimato); });
prova('miglioramento % medio tra due test', () => { const dopo = Object.fromEntries(Object.entries(RIS).map(([k, r]) => [k, { v: r.v * 1.2 }])); uguale(L.miglioramento(RIS, dopo), 20); });

gruppo('Ripetizioni e obiettivo di giri');
prova('ripetizioni = 50% del massimo della prova dello stesso schema', () => { uguale(L.quantita(PER_ID.squat, ctxBase()).q, 16); uguale(L.quantita(PER_ID.piegamenti, ctxBase()).q, 7); });
prova('tenute = 40% della tenuta massima, arrotondate a 5 secondi', () => { uguale(L.quantita(PER_ID.plank, ctxBase()).q, 25); vero(L.quantita(PER_ID.plank_laterale, ctxBase()).q % 5 === 0); });
prova('varianti diverse dalla prova: scala con il rapporto', () => { uguale(L.quantita(PER_ID.piegamenti_ginocchia, ctxBase()).q, Math.round(14 * 1.6 * 0.5)); });
prova('modificatori per obiettivo: forza meno ripetizioni, resistenza di più', () => {
  const f = L.quantita(PER_ID.squat, ctxBase({ obiettivi: ['forza'] })).q, r = L.quantita(PER_ID.squat, ctxBase({ obiettivi: ['resistenza'] })).q;
  uguale(f, Math.round(32 * 0.38)); uguale(r, Math.round(32 * 0.58)); });
prova('due obiettivi pesano 65% e 35%', () => { uguale(L.quantita(PER_ID.squat, ctxBase({ obiettivi: ['forza', 'resistenza'] })).q, Math.round(32 * (0.38 * 0.65 + 0.58 * 0.35))); });
prova('piano più leggero dopo un sì al questionario', () => { vero(L.quantita(PER_ID.squat, ctxBase({ cauto: true })).q < 16); });
prova('limiti minimo e massimo rispettati', () => { for (const e of ESERCIZI) { for (const cap of [0, 500]) { const c = ctxBase(); for (const k in c.cap) c.cap[k] = cap; const q = L.quantita(e, c).q; vero(q >= e.min && q <= e.max + 1, e.id + ' ' + q); } } });
prova('kg suggeriti dai pesi disponibili', () => { const x = L.quantita(PER_ID.goblet_squat, ctxBase({ attrezzi: { manubri: { kg: [4, 8, 12] } } })); uguale(x.kg, 8); });
prova('giro di circa 3 minuti e 5-8 giri in 20 minuti', () => {
  for (const ob of L.OBIETTIVI) for (const cap of [0.5, 1, 2]) {
    const c = ctxBase({ obiettivi: [ob] }); for (const k in c.cap) c.cap[k] *= cap;
    const p = L.generaPiano(c, OGGI);
    for (const g of p.giorni) { const T = L.tempoGiro(g.esercizi, c), n = L.obiettivoGiri(g.esercizi, 20, c); vero(T >= (cap < 1 ? 95 : 140) && T <= 250, `${ob} ${cap} tempo ${T}`); vero(n >= 4 && n <= (cap < 1 ? 11 : 8), `${ob} ${cap} giri ${n}`); }
  } });
prova('10 e 15 minuti: cambia l\'obiettivo di giri, non le ripetizioni', () => {
  const a = L.generaPiano(ctxBase({ durata: 20 }), OGGI), b = L.generaPiano(ctxBase({ durata: 10 }), OGGI);
  uguale(a.giorni[0].esercizi, b.giorni[0].esercizi); vero(L.obiettivoGiri(b.giorni[0].esercizi, 10, ctxBase()) < L.obiettivoGiri(a.giorni[0].esercizi, 20, ctxBase())); });
prova('giri equivalenti = giri + ripetizioni extra / ripetizioni per giro', () => { uguale(L.giriEq({ giri: 6, extra: 10, ripGiro: 40 }), 6.25); });
prova('i tempi per ripetizione si aggiornano con i dati reali', () => { const voci = [{ id: 'squat', q: 15 }, { id: 'piegamenti', q: 8 }]; const c = ctxBase(); const tt = L.aggiornaTempi({}, voci, L.tempoGiro(voci, c) * 1.5, c); vero(tt.squat > PER_ID.squat.sec && tt.squat < PER_ID.squat.sec * 1.5); });

gruppo('Scelta degli esercizi');
prova('senza attrezzi: solo corpo libero', () => { const p = L.generaPiano(ctxBase(), OGGI); for (const g of p.giorni) for (const x of g.esercizi) uguale(PER_ID[x.id].att.length, 0, x.id); });
prova('con attrezzi: possono entrare esercizi con attrezzo, mai senza averlo', () => {
  const c = ctxBase({ obiettivi: ['forza'], attrezzi: { sbarra: true, manubri: { kg: [8, 12] } }, livelli: { ...V.livelli, trazione: 3 }, cap: { ...V.cap, trazioni: 5 } });
  const ids = L.generaPiano(c, OGGI).giorni.flatMap(g => g.esercizi.map(x => x.id));
  vero(ids.some(id => PER_ID[id].att.length), 'nessun esercizio con attrezzi'); for (const id of ids) vero(L.haAttrezzi(PER_ID[id], c.attrezzi), id); });
prova('gruppi di attrezzi: tutti i gruppi, uno per gruppo', () => { vero(!L.haAttrezzi(PER_ID.trazioni_assistite, { sbarra: true })); vero(L.haAttrezzi(PER_ID.trazioni_assistite, { sbarra: true, elastici: true })); vero(L.haAttrezzi(PER_ID.goblet_squat, { kettlebell: { kg: [8] } })); });
prova('zone infortunate: esclusi gli esercizi che le caricano', () => {
  for (const z of ZONE) { const c = ctxBase({ infortuni: [z] }); for (const g of L.generaPiano(c, OGGI).giorni) for (const x of g.esercizi) vero((PER_ID[x.id].stress[z] || 0) < 2, `${z}: ${x.id}`); } });
prova('più zone infortunate insieme: il piano resta completo', () => { const c = ctxBase({ infortuni: ['spalle', 'polsi', 'ginocchia', 'schiena'] }); for (const g of L.generaPiano(c, OGGI).giorni) { uguale(g.esercizi.length, 5); uguale(new Set(g.esercizi.map(x => x.id)).size, 5); } });
prova('zone da sforzare meno: abbassano il punteggio ma non escludono', () => {
  const c = ctxBase({ zoneMeno: ['polsi'] }); vero(L.ammessi('spinta', c).some(e => e.id === 'piegamenti'));
  vero(L.punteggio(PER_ID.piegamenti, c, 3) < L.punteggio(PER_ID.piegamenti, ctxBase(), 3)); });
prova('un solo manubrio: niente esercizi che ne vogliono due, restano quelli a un braccio e il piano è completo', () => {
  const uno = { manubri: { kg: [6, 10], singolo: true } }, due = { manubri: { kg: [6, 10] } }, con = inv => ESERCIZI.filter(e => e.att.length && L.haAttrezzi(e, inv)).map(e => e.id);
  uguale(ESERCIZI.filter(e => e.paio).map(e => e.id), ['distensioni_terra', 'lento_avanti', 'distensioni_panca', 'rematore_due_manubri']); for (const e of ESERCIZI.filter(x => x.paio)) vero(e.att.flat().includes('manubri') && !e.lato, e.id);
  uguale(con(uno), con(due).filter(id => !PER_ID[id].paio)); uguale(con(due).length - con(uno).length, 3); for (const id of ['distensioni_terra_un_braccio', 'lento_avanti_un_braccio', 'rematore_manubrio', 'goblet_squat', 'stacco_rumeno']) vero(con(uno).includes(id), id);
  for (const id of ['distensioni_terra_un_braccio', 'lento_avanti_un_braccio']) vero(PER_ID[id].lato, id + ': ripetizioni per lato');
  for (const ob of L.OBIETTIVI) { const c = ctxBase({ obiettivi: [ob], attrezzi: uno }); for (const g of L.generaPiano(c, OGGI).giorni) { uguale(g.esercizi.length, 5); for (const x of g.esercizi) vero(!PER_ID[x.id].paio, `${ob}: ${x.id}`); } }
  const p = L.generaPiano(ctxBase({ obiettivi: ['forza'], attrezzi: due }), OGGI), i = p.giorni.findIndex(g => g.esercizi.some(x => PER_ID[x.id].paio));
  if (i >= 0) { const c = L.circuitoSessione(p, i, ctxBase({ obiettivi: ['forza'], attrezzi: uno }), [], OGGI); for (const x of c.esercizi) vero(!PER_ID[x.id].paio, 'il piano vecchio va adattato: ' + x.id); }
  uguale(L.quantita(PER_ID.goblet_squat, ctxBase({ attrezzi: uno })).kg, 10, 'i kg restano quelli che hai'); });
prova('kettlebell: dodici esercizi, in tutti gli schemi tranne la mobilità', () => {
  const k = { kettlebell: { kg: [8, 12] } }; uguale(ESERCIZI.filter(e => e.att.length && L.haAttrezzi(e, k)).map(e => e.id).sort(), ['affondi_pesi', 'bulgaro_pesi', 'distensioni_terra_un_braccio', 'goblet_squat', 'kettlebell_swing', 'lento_avanti_un_braccio', 'rematore_manubrio', 'russian_twist_peso', 'stacco_rumeno', 'stacco_terra_peso', 'swing_una_mano', 'thruster']);
  vero(L.quantita(PER_ID.rematore_manubrio, ctxBase({ attrezzi: k })).kg != null, 'kg suggeriti anche con la kettlebell'); });
prova('esercizi scartati non vengono scelti', () => { const primo = L.scegli('gambe', ctxBase()); const c = ctxBase({ scartati: [primo.id] }); vero(L.scegli('gambe', c).id !== primo.id); });
prova('livello adatto al test: mai sopra il livello dell\'area', () => { for (const liv of [1, 2, 3, 4, 5]) { const c = ctxBase({ livelli: Object.fromEntries(L.AREE.map(a => [a, liv])) }); for (const s of ['spinta', 'gambe', 'core', 'cond', 'posteriore']) vero(L.scegli(s, c).liv <= liv, `${s} liv ${liv}`); } });
prova('a parità di punteggio vince il corpo libero', () => { const g = L.graduatoria('spinta', ctxBase({ attrezzi: { pushup_bars: true } })); for (let i = 1; i < g.length; i++) vero(g[i - 1].p > g[i].p || g[i - 1].e.att.length <= g[i].e.att.length); });
prova('niente salti se richiesto o dopo un sì di sicurezza', () => { for (const extra of [{ noSalti: true }, { cauto: true }, { gravidanza: true }]) { const c = ctxBase({ obiettivi: ['atletico', 'dimagrire'], ...extra }); for (const g of L.generaPiano(c, OGGI).giorni) for (const x of g.esercizi) vero(!PER_ID[x.id].impatto, x.id); } });
prova('fisico atletico: preferisce le varianti esplosive', () => { const c = ctxBase({ obiettivi: ['atletico'], livelli: Object.fromEntries(L.AREE.map(a => [a, 4])) }); vero(L.generaPiano(c, OGGI).giorni.some(g => g.esercizi.some(x => PER_ID[x.id].espl))); });
prova('alternative: 2-3 dello stesso schema, con motivo', () => { const a = L.alternative('piegamenti', ctxBase()); vero(a.length >= 2 && a.length <= 3); for (const x of a) { uguale(x.e.schema, 'spinta'); vero(x.e.id !== 'piegamenti' && IT.motivi[x.motivo]); } });
prova('piano: tipi di giorno per 2-6 giorni', () => {
  const tipi = n => L.generaPiano(ctxBase({ giorni: n, giorniSett: L.GIORNI_PREDEFINITI[n] }), OGGI).giorni.map(g => g.tipo).join('');
  uguale([2, 3, 4, 5, 6].map(tipi), ['AB', 'ABC', 'ABCD', 'ABECD', 'AEBCFD']);
  const p = L.generaPiano(ctxBase({ giorni: 6, giorniSett: L.GIORNI_PREDEFINITI[6] }), OGGI); vero(p.giorni[1].leggero && !p.giorni[0].leggero);
  vero(new Set(p.giorni.filter(g => !g.leggero).map(g => g.focus)).size === 4, 'focus diversi'); });
prova('4 slot fissi (spinta, trazione, gambe, core) più il focus', () => { for (const g of L.generaPiano(ctxBase(), OGGI).giorni) uguale(g.esercizi.map(x => x.slot), ['spinta', 'trazione', 'gambe', 'core', 'focus']); });
prova('il punto debole del test entra tra i focus', () => { const c = ctxBase({ debole: 'gambe' }); vero(L.elencoFocus(c, 3).includes('gambe')); });

gruppo('Blocchi e progressione');
const ctxP = ctxBase(), pianoP = () => L.generaPiano(ctxP, OGGI);
prova('2 sessioni sopra l\'obiettivo di almeno 1 giro, fatica fino a 8: propone di aumentare', () => {
  const p = pianoP(), a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23');
  a.giri = b.giri = a.obiettivo + 1; b.fatica = 8;
  const s = L.valutaProgressione(p, 0, [a, b], ctxP);
  vero(s && s.tipo === 'aumenta'); vero(s.modifiche.length >= 1 && s.modifiche.length <= 3);
  for (const m of s.modifiche) vero(m.a !== m.da || m.q1 > m.q0, 'nessun aumento'); });
prova('una sola sessione sopra, o fatica 9: non propone di aumentare', () => {
  const p = pianoP(), a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23');
  a.giri = a.obiettivo + 2; uguale(L.valutaProgressione(p, 0, [a], ctxP), null);
  b.giri = b.obiettivo + 2; b.fatica = 9; uguale(L.valutaProgressione(p, 0, [a, b], ctxP).tipo, 'alleggerisci'); });
prova('sessioni di un altro tipo di giorno non contano', () => { const p = pianoP(), a = sessione(p, 0, ctxP, '2026-11-16', {}), b = sessione(p, 1, ctxP, '2026-11-18'); a.giri += 2; b.giri += 2; uguale(L.valutaProgressione(p, 0, [a, b], ctxP), null); });
prova('2 sessioni sotto l\'obiettivo di almeno 1 giro: propone di alleggerire', () => {
  const p = pianoP(), a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23'); a.giri = b.giri = a.obiettivo - 1;
  const s = L.valutaProgressione(p, 0, [a, b], ctxP); uguale(s.tipo, 'alleggerisci'); for (const m of s.modifiche) vero(m.a !== m.da || m.q1 < m.q0); });
prova('oltre la soglia propone la variante più difficile', () => {
  const p = pianoP(), i = p.giorni[0].esercizi.findIndex(x => PER_ID[x.id].dif); const e = PER_ID[p.giorni[0].esercizi[i].id];
  p.giorni[0].esercizi.forEach((x, k) => { x.q = k === i ? e.max : PER_ID[x.id].max; });   // tutti al massimo
  const a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23'); a.giri = b.giri = a.obiettivo + 1;
  const s = L.valutaProgressione(p, 0, [a, b], ctxP); vero(s.modifiche.some(m => m.a !== m.da && PER_ID[m.a].liv >= PER_ID[m.da].liv), JSON.stringify(s.modifiche)); });
prova('mai automatica: applicata solo se accettata, poi riparte da capo', () => {
  const p = pianoP(), prima = JSON.stringify(p), a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23'); a.giri = b.giri = a.obiettivo + 1;
  const s = L.valutaProgressione(p, 0, [a, b], ctxP); uguale(JSON.stringify(p), prima, 'il piano non deve cambiare da solo');
  L.applicaModifiche(p, s); uguale(p.giorni[0].rev, 1); uguale(L.valutaProgressione(p, 0, [a, b], ctxP), null); });
prova('due modifiche dello stesso suggerimento non portano mai allo stesso esercizio', () => {
  const p = pianoP(), g = p.giorni[0];       // squat e affondi indietro hanno la stessa variante più difficile (affondi alternati)
  uguale(PER_ID.squat.dif, PER_ID.affondi_indietro.dif);
  g.esercizi.forEach(x => { x.q = PER_ID[x.id].max; }); g.esercizi[2] = { slot: 'gambe', id: 'squat', q: PER_ID.squat.max }; g.esercizi[4] = { slot: 'focus', id: 'affondi_indietro', q: PER_ID.affondi_indietro.max };
  const a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23'); a.giri = b.giri = a.obiettivo + 1;
  const s = L.valutaProgressione(p, 0, [a, b], ctxP); uguale(s.tipo, 'aumenta');
  uguale(s.modifiche.filter(m => m.a === 'affondi_alternati').length, 1, JSON.stringify(s.modifiche));
  L.applicaModifiche(p, s); const ids = g.esercizi.map(x => x.id); uguale(new Set(ids).size, 5, ids.join(',')); });
prova('"Non ora" rimanda fino alla sessione successiva', () => { const p = pianoP(), a = sessione(p, 0, ctxP, '2026-11-16'), b = sessione(p, 0, ctxP, '2026-11-23'); a.giri = b.giri = a.obiettivo + 1; p.giorni[0].rimandato = b.id; uguale(L.valutaProgressione(p, 0, [a, b], ctxP), null); });
prova('settimana 4: circa −30% di ripetizioni, stessi esercizi', () => {
  const p = pianoP(), n = L.circuitoSessione(p, 0, ctxP, [], OGGI), s = L.circuitoSessione(p, 0, ctxP, [], piuGiorni(OGGI, 21));
  uguale(L.settimanaBlocco(p, piuGiorni(OGGI, 21)), 4); uguale(s.fattore, 0.7); uguale(s.esercizi.map(x => x.id), n.esercizi.map(x => x.id));
  const rap = L.ripPerGiro(s.esercizi) / L.ripPerGiro(n.esercizi); vero(rap > 0.6 && rap < 0.82, 'rapporto ' + rap); });
prova('ripartenza: oltre 10 giorni di pausa −20% per una settimana', () => {
  const p = pianoP(), vecchia = sessione(p, 0, ctxP, piuGiorni(OGGI, -12));
  vero(L.inRipartenza([vecchia], OGGI)); uguale(L.circuitoSessione(p, 0, ctxP, [vecchia], OGGI).fattore, 0.8);
  const ripresa = sessione(p, 0, ctxP, OGGI); vero(L.inRipartenza([vecchia, ripresa], piuGiorni(OGGI, 3))); vero(!L.inRipartenza([vecchia, ripresa], piuGiorni(OGGI, 8)));
  vero(!L.inRipartenza([sessione(p, 0, ctxP, piuGiorni(OGGI, -3))], OGGI)); uguale(L.giorniDiPausa([vecchia], piuGiorni(OGGI, 10)), 22); });
prova('esercizio segnalato: sostituito finché l\'utente non decide', () => { const p = pianoP(), id = p.giorni[0].esercizi[2].id; const c = L.circuitoSessione(p, 0, ctxBase({ daDecidere: [id] }), [], OGGI); vero(!c.esercizi.some(x => x.id === id)); uguale(c.esercizi[2].alPostoDi, id); });
prova('rotazione dei tipi di giorno e giorno di riposo', () => {
  const p = pianoP(); let pr = L.prossimo(p, [], OGGI); uguale([pr.idx, pr.oggi], [0, true]);
  const s1 = sessione(p, 0, ctxP, OGGI); pr = L.prossimo(p, [s1], OGGI); uguale([pr.idx, pr.oggi, pr.data], [1, false, piuGiorni(OGGI, 2)]);
  pr = L.prossimo(p, [s1], piuGiorni(OGGI, 1)); uguale(pr.oggi, false); pr = L.prossimo(p, [s1], piuGiorni(OGGI, 2)); uguale([pr.idx, pr.oggi], [1, true]); });
prova('serie di giorni: la settimana in corso non la interrompe', () => {
  const p = pianoP(), gg = [-14, -12, -10, -7, -5, -3, 0].map(n => sessione(p, 0, ctxP, piuGiorni(OGGI, n)));
  uguale(L.serieGiorni(gg, 3, OGGI), 7); uguale(L.serieGiorni(gg.slice(0, 3).concat(gg.slice(5)), 3, OGGI), 1); });
// Battito nella progressione: c'è solo se la sessione ha il battito medio e il contesto ha il massimo (ctx.bpmMax).
const ctxB = ctxBase({ bpmMax: 180 }), bpm = n => ({ orologio: { bpmMedio: n } });
const dueSessioni = (extraA = {}, extraB = {}, piu = 0) => { const p = pianoP(), a = sessione(p, 0, ctxB, '2026-11-16', extraA), b = sessione(p, 0, ctxB, '2026-11-23', extraB); a.giri += piu; b.giri += piu; return { p, a, b }; };
prova('battito molto alto (dal 90% del massimo): niente aumento anche se i giri ci sono', () => {
  const { p, a, b } = dueSessioni(bpm(150), bpm(163), 1), prima = JSON.stringify(p);       // 163 / 180 = 91%
  const s = L.valutaProgressione(p, 0, [a, b], ctxB);
  uguale([s.tipo, s.motivo, s.modifiche.length, s.battito], ['mantieni', 'battitoAlto', 0, 91]);
  L.applicaModifiche(p, s); uguale(JSON.stringify(p), prima, 'mantieni non deve cambiare il piano');
  uguale(L.valutaProgressione(p, 0, [a, { ...b, ...bpm(161) }], ctxB).tipo, 'aumenta');           // 89%: sotto la soglia
  uguale(L.valutaProgressione(p, 0, [{ ...a, ...bpm(170) }, { ...b, ...bpm(150) }], ctxB).tipo, 'aumenta'); });   // conta solo l'ultima sessione
prova('battito alto ma senza massimo noto o senza battito: la regola dei giri resta com\'era', () => {
  const { p, a, b } = dueSessioni(bpm(170), bpm(170), 1);
  uguale(L.valutaProgressione(p, 0, [a, b], ctxP).tipo, 'aumenta'); uguale(L.quotaBattito(b, ctxP), null); uguale(L.quotaBattito({ orologio: null }, ctxB), null); uguale(L.quotaBattito({ orologio: { bpmMedio: 0 } }, ctxB), null); });
prova('obiettivo raggiunto 2 volte con fatica bassa e battito basso: propone di aumentare senza il giro in più', () => {
  const { p, a, b } = dueSessioni({ ...bpm(130), fatica: 4 }, { ...bpm(135), fatica: 5 });           // 72% e 75%, giri = obiettivo
  const s = L.valutaProgressione(p, 0, [a, b], ctxB);
  uguale([s.tipo, s.motivo, s.battito], ['aumenta', 'facile', 75]); vero(s.modifiche.length >= 1); for (const m of s.modifiche) vero(m.a !== m.da || m.q1 > m.q0); });
prova('la regola del battito basso non scatta se manca una delle condizioni', () => {
  const caso = (xa, xb, ctx = ctxB) => { const { p, a, b } = dueSessioni(xa, xb); return L.valutaProgressione(p, 0, [a, b], ctx); };
  const ok = { ...bpm(130), fatica: 4 };
  uguale(caso(ok, { ...bpm(136), fatica: 4 }), null, 'battito 76%');
  uguale(caso(ok, { ...bpm(130), fatica: 6 }), null, 'fatica 6');
  uguale(caso(ok, { fatica: 4 }), null, 'una sessione senza battito');
  uguale(caso({ fatica: 4 }, ok), null, 'la prima senza battito');
  uguale(caso(ok, ok, ctxP), null, 'massimo sconosciuto');
  uguale(caso(ok, { ...ok, giri: 1, obiettivo: 6, extra: 0 }), null, 'obiettivo non raggiunto');
  const { p, a } = dueSessioni(ok, ok); uguale(L.valutaProgressione(p, 0, [a], ctxB), null, 'una sola sessione'); });
prova('fatica 9 vince sempre: si alleggerisce anche con battito basso', () => { const { p, a, b } = dueSessioni({ ...bpm(120), fatica: 4 }, { ...bpm(120), fatica: 9 }); uguale(L.valutaProgressione(p, 0, [a, b], ctxB).tipo, 'alleggerisci'); });
prova('senza battito la progressione è identica a prima', () => {
  const { p, a, b } = dueSessioni({ fatica: 3 }, { fatica: 3 }); uguale(L.valutaProgressione(p, 0, [a, b], ctxB), null);
  const d = dueSessioni({}, {}, 1); const s = L.valutaProgressione(d.p, 0, [d.a, d.b], ctxB); uguale([s.tipo, s.motivo, 'battito' in s], ['aumenta', 'sopra', false]); });

gruppo('Analisi della sessione (report)');
const curvaPiatta = (bpmDi, n = 121, passo = 10) => Array.from({ length: n }, (_, i) => [i * passo, bpmDi(i * passo)]);
const sRep = (extra = {}) => ({ id: 'r' + (++nS), ts: Date.parse('2026-11-16') + nS, data: '2026-11-16', tipo: 'amrap', tipoGiorno: 'A', rev: 0, fattore: 1, durata: 20, esercizi: [{ id: 'squat', q: 15 }], obiettivo: 6, ripGiro: 40, giri: 6, extra: 0, fatica: 7, tempiGiro: [180, 182, 184, 186, 188, 190], ...extra });
prova('battito massimo: profilo, poi età (208 − 0,7 × età), poi il più alto registrato se maggiore', () => {
  uguale(A.stimaBpmMax(40), 180); uguale(A.stimaBpmMax(35), 184); uguale(A.stimaBpmMax(0), null);
  uguale(A.bpmMassimo({ eta: 40 }, []), { valore: 180, fonte: 'eta' });
  uguale(A.bpmMassimo({ eta: 40, bpmMax: 192 }, [{ orologio: { bpmMax: 199 } }]), { valore: 192, fonte: 'profilo' });
  uguale(A.bpmMassimo({ eta: 40 }, [{ orologio: { bpmMax: 176 } }, { orologio: null }]), { valore: 180, fonte: 'eta' });
  uguale(A.bpmMassimo({ eta: 40 }, [{ orologio: { bpmMax: 176, curva: [[0, 120], [10, 187]] } }]), { valore: 187, fonte: 'registrato' });
  uguale(A.bpmMassimo({ eta: 40 }, [{ orologio: { bpmMax: 255 } }]), { valore: 180, fonte: 'eta' }, 'valore impossibile ignorato');
  uguale(A.bpmMassimo({ eta: 40, bpmMax: 40 }, []).fonte, 'eta', 'valore del profilo fuori scala ignorato'); uguale(A.bpmMassimo({}, []), { valore: null, fonte: null }); });
prova('zone: confini al 60, 70, 80 e 90% del massimo', () => { uguale([107, 108, 126, 143, 144, 161, 162, 200].map(b => A.zonaDi(b, 180)), [1, 2, 3, 3, 4, 4, 5, 5]); });
prova('tempo nelle zone: i secondi tornano e i buchi lunghi non contano', () => {
  const z = A.tempoInZone(curvaPiatta(s => (s < 600 ? 130 : 165)), 180);     // 10 minuti in Z3, poi Z5
  uguale(z.tot, 1200); uguale(z.sec[0] + z.sec[1], 0); uguale(z.sec[2], 590); uguale(z.sec[3], 10, 'il tratto di passaggio'); uguale(z.sec[4], 600);
  vero(Math.abs(z.quota.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  const conBuco = A.tempoInZone([[0, 130], [10, 130], [20, 130], [320, 130], [330, 130]], 180); uguale(conBuco.tot, 30);
  uguale(A.tempoInZone([[0, 130]], 180), null); uguale(A.tempoInZone(curvaPiatta(() => 130), null), null); });
prova('giri: media, più veloce, più lento e calo tra primo e ultimo terzo', () => {
  const g = A.analisiGiri([160, 165, 170, 175, 190, 200]);
  uguale([g.n, g.iMin, g.iMax, g.primi, g.ultimi], [6, 0, 5, 162.5, 195]); uguale(Math.round(g.calo * 100), 20); uguale(g.andamento, 'caloForte');
  uguale(A.analisiGiri([180, 181, 182, 198]).andamento, 'caloLieve'); uguale(A.analisiGiri([200, 190, 185, 180]).andamento, 'crescendo'); uguale(A.analisiGiri([180, 183, 179, 182]).andamento, 'costante');
  uguale(A.analisiGiri([180]).calo, null); uguale(A.analisiGiri([]), null); uguale(A.analisiGiri([0, 180, 190]).n, 2, 'i tempi a zero si scartano'); });
prova('tempi dei giri: quelli dell\'app; senza, i lap dell\'orologio meno l\'ultimo', () => {
  uguale(A.tempiGiriDi(sRep()).fonte, 'app');
  uguale(A.tempiGiriDi(sRep({ tempiGiro: [], orologio: { giri: [{ durata: 170 }, { durata: 180 }, { durata: 45 }] } })), { tempi: [170, 180], fonte: 'orologio' });
  uguale(A.tempiGiriDi(sRep({ tempiGiro: [], orologio: { bpmMedio: 140 } })), { tempi: [], fonte: null }); });
prova('battito medio per giro, allineato con l\'ora di inizio dell\'app', () => {
  const inizio = Date.parse('2026-11-16T18:00:00Z'), curva = curvaPiatta(s => (s < 160 ? 100 : s < 260 ? 130 : 150), 60);
  const r = A.bpmPerGiro(sRep({ inizio: inizio + 60e3, orologio: { inizio, curva } }), [100, 100, 100], 'app');    // l'orologio è partito un minuto prima
  uguale(r.confini, [60, 160, 260, 360]); uguale(r.bpm, [100, 130, 150]);
  uguale(A.bpmPerGiro(sRep({ orologio: { bpmMedio: 140 } }), [100, 100], 'app'), null); });
prova('sessione precedente: stesso tipo di giorno, prima di questa, non interrotta', () => {
  const a = sRep({ id: 'a', ts: 1 }), b = sRep({ id: 'b', ts: 2, tipoGiorno: 'B' }), c = sRep({ id: 'c', ts: 3, interrotta: true }), d = sRep({ id: 'd', ts: 4 }), e = sRep({ id: 'e', ts: 5 });
  uguale(A.precedente(d, [a, b, c, d, e]).id, 'a'); uguale(A.precedente(a, [a, b, c, d, e]), null); uguale(A.precedente(e, [e, d, c, b, a]).id, 'd'); });
prova('confronto: giri, media giro, battito, fatica e circuito cambiato', () => {
  const prima = sRep({ ts: 1, data: '2026-11-09', giri: 5, extra: 20, fatica: 8, tempiGiro: [], orologio: { bpmMedio: 152 } }), ora = sRep({ ts: 2, giri: 6, extra: 10, orologio: { bpmMedio: 147 } });
  const c = A.confronta(ora, prima, 180);
  uguale([c.giri.prima, c.giri.ora, c.giri.diff, c.bpm.diff, c.fatica.diff, c.circuitoDiverso, c.data], [5.5, 6.25, 0.75, -5, -1, false, '2026-11-09']);
  uguale([c.mediaGiro.ora, Math.round(c.mediaGiro.prima)], [185, 218], 'media dei giri cronometrati; senza tempi, durata diviso giri'); uguale(A.mediaGiroDi(sRep({ tempiGiro: [], interrotta: true })), null);
  vero(A.confronta(ora, { ...prima, esercizi: [{ id: 'squat', q: 17 }] }, 180).circuitoDiverso); uguale(A.confronta(ora, null, 180), null);
  uguale(A.confronta(ora, { ...prima, orologio: null }, 180).bpm, null); });
prova('lettura senza orologio: 2-3 frasi dai tempi dei giri dell\'app', () => {
  const a = A.analizza(sRep({ tempiGiro: [160, 165, 170, 175, 190, 200] }), [], { eta: 40 });
  uguale(a.cuore, null); uguale(a.frasi.map(f => f.k), ['caloForte', 'primaVolta', 'inObiettivo']); uguale(a.frasi[0].par.pct, 20);
  const senza = A.analizza(sRep({ tempiGiro: [], giri: 7, extra: 20 }), [], { eta: 40 }); uguale(senza.giri, null); uguale(senza.frasi.map(f => f.k), ['primaVolta', 'sopraObiettivo']); });
prova('lettura con orologio: ritmo, battito e confronto', () => {
  const prima = sRep({ id: 'p', ts: 1, data: '2026-11-09', giri: 5, extra: 20, orologio: { bpmMedio: 152 } });
  const ora = sRep({ id: 'o', ts: 2, giri: 6, extra: 10, orologio: { curva: curvaPiatta(() => 147), calorie: 210 } });
  const a = A.analizza(ora, [prima, ora], { eta: 40 });
  uguale([a.cuore.medio, a.cuore.picco, a.cuore.zonaMedia, a.max.valore], [147, 147, 4, 180]); uguale(a.cuore.zone.sec, [0, 0, 0, 1200, 0]);
  uguale(a.frasi.map(f => f.k), ['costante', 'cuoreAlto', 'meglioMenoBattito']); uguale(a.frasi[2].par, { data: '2026-11-09', giri: 0.8, bpm: 5 }); });
prova('lettura: zona 5 per un quarto del tempo, battito al limite, deriva a ritmo costante', () => {
  const con = curva => A.analizza(sRep({ orologio: { curva } }), [], { eta: 40 }).frasi.map(f => f.k)[1];
  uguale(con(curvaPiatta(s => (s < 800 ? 150 : 170))), 'zonaRossa'); uguale(con(curvaPiatta(() => 163)), 'zonaRossa');
  uguale(con(curvaPiatta(s => (s < 600 ? 135 : 150))), 'deriva'); uguale(con(curvaPiatta(() => 135)), 'cuoreMedio'); uguale(con(curvaPiatta(() => 120)), 'cuoreBasso');
  uguale(A.analizza(sRep({ orologio: { bpmMedio: 164 } }), [], { eta: 40 }).frasi.map(f => f.k)[1], 'cuoreMoltoAlto', 'solo la media, senza curva'); });
prova('lettura: sempre 2 o 3 frasi, ognuna con il suo testo', () => {
  const casi = [sRep(), sRep({ tempiGiro: [] }), sRep({ interrotta: true }), sRep({ fatica: 9, orologio: { bpmMedio: 120 } }), sRep({ fatica: 4, orologio: { bpmMedio: 165 } }), sRep({ tempiGiro: [200], obiettivo: 0 })];
  for (const s of casi) { const f = A.analizza(s, [], { eta: 40 }).frasi; vero(f.length >= (s.obiettivo ? 2 : 1) && f.length <= 3, JSON.stringify(f)); for (const x of f) vero(IT.rep.frase[x.k], 'manca il testo di ' + x.k); uguale(new Set(f.map(x => x.k)).size, f.length); }
  for (const k of ['interrotta', 'caloForte', 'caloLieve', 'crescendo', 'costante', 'zonaRossa', 'cuoreMoltoAlto', 'cuoreAlto', 'cuoreMedio', 'cuoreBasso', 'deriva', 'circuitoCambiato', 'meglioMenoBattito', 'piuGiri', 'menoGiri', 'stessoMenoBattito', 'stessoPiuBattito', 'stabile', 'primaVolta', 'faticaSenzaBattito', 'battitoSenzaFatica', 'sopraObiettivo', 'sottoObiettivo', 'inObiettivo']) vero(IT.rep.frase[k], k); });
prova('andamento: solo sessioni complete e a ripetizioni piene del tipo di giorno; tendenza da 4 sessioni con il battito', () => {
  const con = (i, eq, b, extra = {}) => sRep({ id: 'a' + i, ts: i, data: piuGiorni('2026-10-01', i * 7), giri: eq, orologio: b ? { bpmMedio: b } : null, ...extra });
  const ss = [con(1, 6, 152), con(2, 6, 151), con(3, 6, null), con(4, 6, 147), con(5, 6, 146), con(6, 6, 140, { interrotta: true }), con(7, 6, 140, { fattore: 0.7 }), con(8, 6, 140, { tipoGiorno: 'B' })];
  const p = A.andamento(ss, 'A', 180); uguale(p.map(x => x.id), ['a1', 'a2', 'a3', 'a4', 'a5']); uguale(p.map(x => x.bpm), [152, 151, null, 147, 146]); uguale(Math.round(p[0].calo * 100), 4);
  uguale(A.tendenza(p), { k: 'efficienza', par: { giri: 0, bpm: 5, n: 4 } }); uguale(A.tendenza(p.slice(0, 3)), null, 'servono 4 sessioni con il battito');
  const t2 = (a, b) => A.tendenza([{ eq: a[0], bpm: b[0] }, { eq: a[1], bpm: b[1] }, { eq: a[2], bpm: b[2] }, { eq: a[3], bpm: b[3] }]).k;
  uguale([t2([6, 6, 6.5, 6.6], [140, 140, 146, 146]), t2([6, 6, 6, 6], [140, 140, 146, 146]), t2([6, 6, 6, 6.1], [140, 141, 141, 140])], ['piuLavoro', 'piuSforzo', 'stabile']); });
prova('carico della settimana: minuti × fatica, e avviso quando sale del 30% o dopo 3 sessioni a fatica 8+', () => {
  const s = (data, fatica, extra = {}) => sRep({ ts: Date.parse(data) + (++nS), data, fatica, ...extra });   // OGGI = lunedì 16 novembre 2026
  const base = [s('2026-10-26', 6), s('2026-10-28', 6), s('2026-11-02', 6), s('2026-11-04', 6), s('2026-11-09', 6), s('2026-11-11', 6)];
  const sett = A.caricoSettimane([...base, s('2026-11-16', 7)], OGGI, 4); uguale(sett.map(w => [w.lunedi, w.sessioni, w.carico]), [['2026-10-26', 2, 240], ['2026-11-02', 2, 240], ['2026-11-09', 2, 240], ['2026-11-16', 1, 140]]);
  uguale(A.caricoSettimane([s('2026-11-16', null), s('2026-11-17', 8, { interrotta: true, tempiGiro: [300, 300] }), { ...s('2026-11-18', 9), tipo: 'test' }], OGGI, 1)[0].carico, 100 + 80, 'fatica mancante = 5; interrotta = minuti fatti; i test non contano');
  uguale(A.avvisoCarico([...base, s('2026-11-16', 7)], '2026-11-17'), null, 'una sola sessione nella settimana');
  uguale(A.avvisoCarico([...base, s('2026-11-16', 7), s('2026-11-18', 7)], '2026-11-18'), null, '280 contro 240: +17%');
  uguale(A.avvisoCarico([...base, s('2026-11-16', 8), s('2026-11-18', 8)], '2026-11-18'), { k: 'salito', par: { pct: 33 } });
  uguale(A.avvisoCarico([s('2026-11-16', 8), s('2026-11-18', 8)], '2026-11-18'), null, 'senza settimane di confronto');
  uguale(A.avvisoCarico([s('2026-11-10', 8), s('2026-11-12', 9), s('2026-11-16', 8)], '2026-11-17'), { k: 'faticaAlta', par: {} });
  uguale(A.avvisoCarico([s('2026-11-10', 8), s('2026-11-12', 7), s('2026-11-16', 8)], '2026-11-17'), null);
  uguale(A.avvisoCarico([s('2026-10-01', 9), s('2026-10-02', 9), s('2026-10-03', 9)], '2026-11-17'), null, 'sessioni vecchie'); });
prova('battito di recupero nel test: differenza in un minuto, solo con due valori plausibili', () => {
  uguale(A.recuperoBattito({ battito: { fine: '168', dopo: 139 } }), { fine: 168, dopo: 139, calo: 29 }); uguale(A.recuperoBattito({ battito: { fine: '', dopo: '' } }), null);
  uguale(A.recuperoBattito({ battito: { fine: 168, dopo: 300 } }), null); uguale(A.recuperoBattito({ ris: RIS }), null); });
// Battiti per giro e progressione a parità di circuito
const lapOro = (da, sec, bpm, timer = sec) => ({ durata: sec, timer, bpm, da });
const sOro = (id, data, lap, extra = {}) => ({ id, ts: Date.parse(data), inizio: Date.parse(data), data, tipo: 'orologio', etichetta: 'Circuito A', durata: 20, giri: lap.length - 1, extra: 0, ripGiro: 0, obiettivo: 0, esercizi: [], tempiGiro: [], fatica: null, orologio: { giri: lap, copertura: 0.95, pausa: 0, bpmMedio: 140, curva: [[0, 120], [10, 130]] }, ...extra });
prova('lap completi: tutti meno l\'ultimo, oppure tutti se nell\'allenamento dall\'orologio l\'ultimo è un giro intero', () => {
  const lap = [lapOro(0, 300, 130), lapOro(300, 300, 140), lapOro(600, 60, 141)];
  uguale(A.lapCompleti(sOro('a', '2026-09-06', lap)).length, 2); uguale(A.lapCompleti(sOro('a', '2026-09-06', lap, { giri: 3 })).length, 3); uguale(A.lapCompleti(sRep()).length, 0);
  uguale(A.tempiGiriDi(sOro('a', '2026-09-06', [lapOro(0, 380, 130, 300), lapOro(380, 290, 140), lapOro(670, 60, 141)])), { tempi: [300, 290], fonte: 'orologio' }, 'il tempo del giro è quello senza pause'); });
prova('battiti per giro: battito medio × durata sui giri completi; i giri con una pausa si scartano', () => {
  const b = A.battitiPerGiro(sOro('a', '2026-09-06', [lapOro(0, 300, 120), lapOro(300, 300, 140), lapOro(600, 60, 150)]));
  uguale([b.valore, b.giri, b.scartati, b.origine, b.qualita, b.usabile], [650, 2, 0, 'lap', 'buona', true]);          // (120×300 + 140×300) / 60 / 2
  const conPausa = A.battitiPerGiro(sOro('a', '2026-09-06', [lapOro(0, 380, 110, 300), lapOro(380, 300, 140), lapOro(680, 60, 150)])); uguale([conPausa.valore, conPausa.giri, conPausa.scartati], [700, 1, 1]);
  uguale(A.battitiPerGiro(sOro('a', '2026-09-06', [lapOro(0, 300, 120), lapOro(300, 60, 150)], { orologio: { giri: [lapOro(0, 300, 120), lapOro(300, 60, 150)], copertura: 0.8 } })).qualita, 'discreta');
  const scarsa = A.battitiPerGiro(sOro('a', '2026-09-06', [lapOro(0, 300, 120), lapOro(300, 60, 150)], { orologio: { giri: [lapOro(0, 300, 120), lapOro(300, 60, 150)], copertura: 0.5 } })); uguale([scarsa.qualita, scarsa.usabile], ['scarsa', false]);
  uguale(A.battitiPerGiro(sRep()), null, 'senza orologio non c\'è');
  uguale(A.battitiPerGiro(sRep({ tempiGiro: [], giri: 6, extra: 0, orologio: { bpmMedio: 150 } })).valore, 500, 'senza giri cronometrati: media della sessione × minuti / giri');
  const inizio = Date.parse('2026-11-16T18:00:00Z'), app = A.battitiPerGiro(sRep({ inizio, tempiGiro: [120, 120], orologio: { inizio, copertura: 0.97, curva: curvaPiatta(s => (s < 120 ? 120 : 150), 30) } }));
  uguale([app.valore, app.origine, app.qualita], [270, 'app', 'buona'], 'giri dell\'app con la curva allineata'); });
prova('chiave del circuito: si confrontano solo sessioni davvero uguali', () => {
  const a = sRep({ id: 'a', ts: 1 }), b = sRep({ id: 'b', ts: 2 }), piuRip = sRep({ id: 'c', ts: 3, esercizi: [{ id: 'squat', q: 17 }] }), altroGiorno = sRep({ id: 'd', ts: 4, tipoGiorno: 'B' }), interrotta = sRep({ id: 'e', ts: 5, interrotta: true });
  uguale(A.serieDi(b, [a, b, piuRip, altroGiorno, interrotta]).map(x => x.id), ['a', 'b']);
  const o1 = sOro('o1', '2026-09-06', [lapOro(0, 300, 120)]), o2 = sOro('o2', '2026-09-09', [lapOro(0, 300, 120)], { etichetta: ' circuito a ' }), o3 = sOro('o3', '2026-09-10', [lapOro(0, 300, 120)], { etichetta: 'Altro' }), senza = sOro('o4', '2026-09-11', [lapOro(0, 300, 120)], { etichetta: '' }), senza2 = sOro('o5', '2026-09-12', [lapOro(0, 300, 120)], { etichetta: '' });
  uguale(A.serieDi(o1, [o1, o2, o3, senza, senza2]).map(x => x.id), ['o1', 'o2'], 'stesso nome, senza badare a maiuscole e spazi'); uguale(A.serieDi(senza, [o1, senza, senza2]).map(x => x.id), ['o4'], 'senza nome non si confronta con niente');
  uguale(A.precedente(o2, [o1, o2, o3]).id, 'o1'); uguale(A.precedente(senza2, [senza, senza2]), null); });
prova('progressione misurata: verdetto solo quando i dati bastano e la differenza supera la soglia', () => {
  const con = (id, data, bpm, sec = 300, extra = {}) => sOro(id, data, [lapOro(0, sec, bpm), lapOro(sec, sec, bpm), lapOro(2 * sec, 40, bpm)], extra);
  const due = A.misuraProgressione([con('a', '2026-09-01', 150), con('b', '2026-09-08', 140)]);
  uguale([due.battiti.k, due.battiti.n, due.battiti.servono, due.ritmo.k], ['pochi', 2, 3, 'stabile'], 'con due sessioni niente verdetto sul battito');
  const tre = A.misuraProgressione([con('a', '2026-09-01', 150), con('b', '2026-09-08', 146), con('c', '2026-09-15', 138)]);
  uguale([tre.battiti.k, tre.battiti.pct, tre.battiti.forza, Math.round(tre.battiti.prima), Math.round(tre.battiti.dopo)], ['migliora', 8, 'indicativa', 750, 690]);
  uguale(abbina({ inizio: 1000 }, [{ id: 'o', tipo: 'orologio', inizio: 1000 }]), null, 'un file non si abbina a un allenamento nato da un altro file');
  const quattro = A.misuraProgressione([con('a', '2026-09-01', 150), con('b', '2026-09-08', 148), con('c', '2026-09-15', 140), con('d', '2026-09-22', 138)]);
  uguale([quattro.battiti.k, quattro.battiti.forza], ['migliora', 'attendibile']);
  uguale(A.misuraProgressione([con('a', '2026-09-01', 150), con('b', '2026-09-08', 148), con('c', '2026-09-15', 146), con('d', '2026-09-22', 144)]).battiti.k, 'stabile', '−2,7%: dentro la variabilità');
  uguale(A.misuraProgressione([con('a', '2026-09-01', 140), con('b', '2026-09-08', 141), con('c', '2026-09-15', 150), con('d', '2026-09-22', 152)]).battiti.k, 'peggiora');
  const conScarsa = A.misuraProgressione([con('a', '2026-09-01', 150), con('b', '2026-09-08', 100, 300, { orologio: { giri: [lapOro(0, 300, 100), lapOro(300, 40, 100)], copertura: 0.4 } }), con('c', '2026-09-15', 149)]);
  uguale([conScarsa.battiti.k, conScarsa.battiti.n, conScarsa.punti[1].battiti, conScarsa.punti[1].qualita], ['pochi', 2, null, 'scarsa'], 'la sessione con il sensore scarso non conta');
  uguale(A.misuraProgressione([con('a', '2026-09-01', 150, 300), con('b', '2026-09-08', 150, 280)]).ritmo.k, 'migliora');
  const giri = A.misuraProgressione([sRep({ giri: 6 }), sRep({ giri: 6, extra: 20 })]).giri; uguale([giri.k, giri.diff], ['migliora', 0.5]); uguale(A.misuraProgressione([sRep()]).giri.k, 'pochi'); });
prova('allenamento dall\'orologio: il confronto è sul tempo del giro, non sul numero di giri', () => {
  const prima = sOro('a', '2026-09-06', [lapOro(0, 340, 130), lapOro(340, 336, 140), lapOro(676, 300, 141)]), dopo = sOro('b', '2026-09-09', [lapOro(0, 296, 139), lapOro(296, 290, 150), lapOro(586, 300, 151)]);
  const a = A.analizza(dopo, [prima, dopo], { eta: 40 }); uguale(a.frasi.find(f => f.k === 'giroPiuVeloce').par, { data: '2026-09-06', sec: 45 }); uguale([a.confronto.battiti.prima, a.confronto.battiti.ora], [760, 705]); uguale(a.confronto.circuitoDiverso, false);
  uguale(a.bpmGiri, { bpm: [139, 150], confini: [0, 296, 586] }, 'battito e confini dei giri vengono dai lap del file'); });

gruppo('Navigazione e video');
prova('tornando indietro si ripristina lo scorrimento, andando avanti si parte dall\'alto', () => {
  let n = { idx: 0, pila: ['#/profilo'], scorri: [] }, r;
  r = passoNav(n, { hash: '#/libreria', voce: null, y: 640 }); n = r.stato; uguale([n.idx, r.ripristina, r.nuova], [1, null, true]);
  r = passoNav(n, { hash: '#/esercizio/squat', voce: null, y: 900 }); n = r.stato; uguale([n.idx, r.ripristina], [2, null]);
  r = passoNav(n, { hash: '#/libreria', voce: 1, y: 300 }); n = r.stato; uguale([n.idx, r.ripristina, r.nuova], [1, 900, false]);
  r = passoNav(n, { hash: '#/profilo', voce: 0, y: 900 }); n = r.stato; uguale([n.idx, r.ripristina], [0, 640]);
  r = passoNav(n, { hash: '#/libreria', voce: 1, y: 640 }); n = r.stato; uguale([n.idx, r.ripristina], [1, null], 'avanti: dall\'alto');
  r = passoNav(n, { hash: '#/comprare', voce: null, y: 50 }); n = r.stato; uguale([n.idx, n.pila], [2, ['#/profilo', '#/libreria', '#/comprare']], 'una pagina nuova cancella le voci in avanti');
  r = passoNav(n, { hash: '#/oggi', voce: null, sostituzione: true, y: 10 }); n = r.stato; uguale([n.idx, n.pila, r.ripristina], [2, ['#/profilo', '#/libreria', '#/oggi'], null], 'una sostituzione non aggiunge voci'); });
prova('video: link scelto a mano se è di YouTube, altrimenti ricerca con il nome in italiano', () => {
  uguale(linkVideo(undefined, 'Piegamenti al muro', 'esecuzione corretta'), { url: 'https://www.youtube.com/results?search_query=Piegamenti%20al%20muro%20esecuzione%20corretta', ricerca: true });
  uguale(linkVideo('https://youtu.be/abc123', 'Squat', 'x'), { url: 'https://youtu.be/abc123', ricerca: false }); uguale(linkVideo('https://esempio.it/video', 'Squat', 'x').ricerca, true);
  vero(eYouTube('https://www.youtube.com/watch?v=abc') && eYouTube('https://m.youtube.com/shorts/abc') && !eYouTube('http://youtu.be/abc') && !eYouTube('https://youtube.com.finto.it/watch?v=1') && !eYouTube('testo'));
  uguale(t('esercizio.videoRicerca'), 'esecuzione corretta'); for (const e of ESERCIZI) vero(e.video === undefined || eYouTube(e.video), e.id + ': il campo video deve essere un link https di YouTube'); });


gruppo('Codici personali e di gruppo');
const pianoC = pianoP(), sess = [sessione(pianoC, 0, ctxP, '2026-11-02'), sessione(pianoC, 1, ctxP, '2026-11-04'), { ...sessione(pianoC, 0, ctxP, '2026-11-05'), tipo: 'sfida', meseSfida: '2026-11', variante: 'completa', giri: 8, extra: 11, ripGiro: 50 }];
const testC = [{ ts: 1, ris: RIS }, { ts: 2, ris: Object.fromEntries(Object.entries(RIS).map(([k, r]) => [k, { v: Math.round(r.v * 1.1) }])) }];
const mio = dettagli => C.datiPersonali({ io: { id: 'abc123', nome: 'Roby M', colore: 2 }, sessioni: sess, test: testC, perSettimana: 3 }, { tipo: 'm', dettagli }, '2026-11-16', 1e12);
await prova('codice personale: andata e ritorno', async () => {
  const d = mio(true), cod = await C.creaCodice('HOMRAP1', d); vero(cod.startsWith('HOMRAP1.'));
  const r = await C.leggiCodice(cod); uguale(r.tipo, 'personale'); uguale(r.dati, d); uguale(d.in, 'RM'); uguale(d.sf, { g: 8, r: 11, rg: 50, v: 'c' }); uguale(d.p, { t: 'm', k: '2026-11' }); });
await prova('senza compressione il codice si legge lo stesso', async () => { const d = mio(true), cod = await C.creaCodice('HOMRAP1', d, false); uguale((await C.leggiCodice(cod)).dati, d); });
await prova('codice di gruppo: andata e ritorno', async () => {
  const g = { v: 1, p: { t: 'm', k: '2026-11' }, ts: 5, m: [mio(true), { ...mio(false), id: 'x2', n: 'Luca' }] };
  const r = await C.leggiCodice(await C.creaCodice('HOMRAPG1', g)); uguale(r.tipo, 'gruppo'); uguale(r.dati, g); });
await prova('un codice modificato (CRC errato) viene rifiutato', async () => {
  const cod = await C.creaCodice('HOMRAP1', mio(true));
  for (const pos of [12, 20, cod.length - 3]) { const c = cod[pos] === 'A' ? 'B' : 'A', rotto = cod.slice(0, pos) + c + cod.slice(pos + 1); let errore = null; try { await C.leggiCodice(rotto); } catch (e) { errore = e.message; } vero(errore, 'accettato un codice rotto in posizione ' + pos); }
  let e2 = null; try { await C.leggiCodice('HOMRAP1.abc'); } catch (e) { e2 = e.message; } uguale(e2, 'formato'); });
prova('senza "Includi dettagli": solo sfida, sessioni e serie', () => { uguale(Object.keys(mio(false)).sort(), ['c', 'id', 'in', 'n', 'p', 'se', 'sf', 'st', 'ts', 'v']); });
prova('nei codici non entrano mai età, peso, misure, zone o sicurezza', () => { const s = JSON.stringify(mio(true)); for (const k of ['eta', 'peso', 'altezza', 'misure', 'infortuni', 'zone', 'sicurezza', 'sesso']) vero(!s.includes('"' + k + '"'), k); });
await prova('battito ed età non entrano mai nei codici, nemmeno con i dati dell\'orologio', async () => {
  const conOrologio = sess.map((s, i) => ({ ...s, orologio: { inizio: 1, durata: 1200, bpmMedio: 151 + i, bpmMax: 177 + i, calorie: 333, curva: [[0, 101], [10, 177 + i]], giri: [{ durata: 173 }] } }));
  for (const dettagli of [true, false]) for (const tipo of ['m', 'w']) {
    const d = C.datiPersonali({ io: { id: 'abc123', nome: 'Roby M', colore: 2 }, sessioni: conOrologio, test: testC.map(x => ({ ...x, battito: { fine: 178, dopo: 153 } })), perSettimana: 3, profilo: { eta: 47, bpmMax: 189 } }, { tipo, dettagli }, '2026-11-16', 1e12), s = JSON.stringify(d);
    for (const k of ['orologio', 'bpm', 'bpmMedio', 'bpmMax', 'curva', 'calorie', 'eta', 'battito', 'fatica']) vero(!s.includes('"' + k + '"'), k);
    for (const v of [151, 152, 153, 177, 178, 179, 189, 333]) vero(!new RegExp('[^0-9.]' + v + '[^0-9.]').test(s), 'valore ' + v + ' nel codice');
    uguale((await C.leggiCodice(await C.creaCodice('HOMRAP1', d))).dati, d); } });
await prova('estrae più codici da un messaggio di WhatsApp', async () => {
  const a = await C.creaCodice('HOMRAP1', mio(false)), b = await C.creaCodice('HOMRAPG1', { m: [] });
  uguale(C.estraiCodici(`[16/11, 18:02] Luca: ecco i miei risultati HoMRAP:\n${a}\n[16/11, 18:05] Sara: il mio ${b} ciao!`), [a, b]); });
prova('i dati di un codice vengono ripuliti: solo campi previsti, del tipo giusto e nei limiti', () => {
  const cattivo = { v: 1, id: 'abc', n: '  <img src=x onerror=alert(1)> nome lunghissimo che non finisce più  ', in: '<b>XY</b>', c: 99, ts: 'ieri', p: { t: 'm', k: '2026-11' }, sf: { g: '<i>9</i>', r: 2, rg: 40, v: 'x' }, se: '<script>', st: -5, an: [7, '<u>', 8.26, 1e9], mg: '<x>', mi: '<svg onload=1>', te: { squat: '<b>', plank: 61.4 }, tf: ['piegamenti', '<b>'], extra: '<b>' };
  const m = C.normalizzaMembro(cattivo);
  uguale(m, { v: 1, id: 'abc', n: '<img src=x onerror=alert', in: '<b>', c: 3, p: { t: 'm', k: '2026-11' }, ts: 0, sf: null, se: 0, st: 0, an: [7, 8.3], mg: null, mi: null, te: { squat: 0, piegamenti: 0, burpees: 0, plank: 61, superman: 0 }, tf: ['piegamenti'] });
  for (const k of ['se', 'st', 'c', 'ts']) vero(typeof m[k] === 'number');
  for (const id of ['', 'a b', 'x"onclick="1', '../x', 'a'.repeat(41), 5, null]) uguale(C.normalizzaMembro({ id, n: 'Luca' }), null, 'id ' + id);
  uguale(C.normalizzaMembro({ id: 'ok', n: '   ' }), null); uguale(C.normalizzaMembro(null), null); uguale(C.normalizzaMembro('testo'), null);
  const buono = mio(true); uguale(C.normalizzaMembro(buono), buono, 'un codice vero passa identico'); uguale(C.normalizzaMembro(mio(false)), mio(false));
  vero(C.periodoValido({ t: 'w', k: '2026-W47' }) && C.periodoValido({ t: 'm', k: '2026-11' }) && !C.periodoValido({ t: 'x', k: '2026-11' }) && !C.periodoValido({ t: 'm', k: '<b>' }) && !C.periodoValido(null)); });
prova('per lo stesso id resta il codice più recente', () => { const u = C.unisci({ a: { id: 'a', ts: 5, se: 1 } }, [{ id: 'a', ts: 9, se: 2 }, { id: 'a', ts: 7, se: 3 }, { id: 'b', ts: 1 }]); uguale(u.a.se, 2); vero(u.b); });
prova('tre classifiche, momenti e media del gruppo', () => {
  const m = [{ id: '1', n: 'A', sf: { g: 8, r: 2, rg: 40, v: 'c' }, mi: 5, se: 10, st: 4, te: { squat: 40 } }, { id: '2', n: 'B', sf: { g: 8, r: 20, rg: 40, v: 'f' }, mi: 20, se: 12, st: 9, te: { squat: 20 } }, { id: '3', n: 'C', se: 3, st: 1 }];
  uguale(C.graduatorie(m, 'sfida').map(x => x.m.id + ':' + x.pos), ['2:1', '1:2', '3:null']); uguale(C.graduatorie(m, 'sfida', true).map(x => x.m.id), ['1', '3']);
  uguale(C.graduatorie(m, 'miglioramento')[0].m.id, '2'); uguale(C.graduatorie(m, 'costanza').map(x => x.m.id), ['2', '1', '3']);
  const mo = C.momenti(m); uguale([mo.migliorato.m.id, mo.costante.m.id, mo.record.m.id, mo.serie.m.id], ['2', '2', '2', '2']); uguale(C.mediaGruppo(m).squat, 30); });
prova('frasi del confronto generate dai dati', () => { const f = C.frasiConfronto({ se: 6, st: 2, mg: 200, mi: 5, te: { squat: 30 } }, { se: 12, st: 9, mg: 170, mi: 4, te: { squat: 40 } }); vero(f.imparare.some(x => x.k === 'sessioni') && f.imparare.length <= 3); uguale(f.forte.length, 0); });

gruppo('Sfida del mese');
prova('identica per lo stesso mese, diversa tra mesi', () => {
  uguale(C.sfidaDelMese('2026-11'), C.sfidaDelMese('2026-11'));
  const mesi = Array.from({ length: 12 }, (_, i) => JSON.stringify(C.sfidaDelMese('2027-' + String(i + 1).padStart(2, '0')).completa)); vero(new Set(mesi).size >= 8, 'poche sfide diverse: ' + new Set(mesi).size); });
prova('4 esercizi senza attrezzi da schemi diversi, 15 minuti, due varianti', () => {
  for (let m = 1; m <= 12; m++) { const s = C.sfidaDelMese('2026-' + String(m).padStart(2, '0')); uguale(s.durata, 15);
    for (const v of [s.completa, s.facilitata]) { uguale(v.length, 4); uguale(new Set(v.map(x => x.slot)).size, 4); for (const x of v) { vero(PER_ID[x.id], x.id); uguale(PER_ID[x.id].att.length, 0); vero(x.q > 0); } }
    for (const x of s.facilitata) vero(!PER_ID[x.id].impatto, 'facilitata con salti: ' + x.id); } });

gruppo('Decoder FIT');
function creaFIT() {
  const b = [], u8 = v => b.push(v & 255), u16 = v => { u8(v); u8(v >> 8); }, u32 = v => { u16(v & 0xFFFF); u16(v >>> 16); }, u32be = v => { u16be(v >>> 16); u16be(v & 0xFFFF); }, u16be = v => { u8(v >> 8); u8(v); };
  const def = (loc, glob, campi, be = false, dev = 0) => { u8(0x40 | loc | (dev ? 0x20 : 0)); u8(0); u8(be ? 1 : 0); (be ? u16be : u16)(glob); u8(campi.length); for (const c of campi) { u8(c[0]); u8(c[1]); u8(c[2]); } if (dev) { u8(1); u8(0); u8(dev); u8(0); } };
  const T0 = 1100000000;
  def(3, 0, [[0, 1, 0x00], [4, 4, 0x86]]); u8(3); u8(4); u32(T0);                                 // file_id: messaggio da ignorare
  def(0, 20, [[253, 4, 0x86], [3, 1, 0x02]]);                                                    // record: timestamp, battito
  for (let i = 0; i <= 600; i += 5) { u8(0); u32(T0 + i); u8(120 + Math.round(i / 20)); }
  def(3, 20, [[3, 1, 0x02]]); u8(0x80 | (3 << 5) | ((T0 + 603) & 31)); u8(151);                  // record con intestazione compressa (tempo nei 5 bit)
  def(1, 19, [[253, 4, 0x86], [2, 4, 0x86], [7, 4, 0x86], [15, 1, 0x02]], true, 2);              // lap in big endian, con un campo sviluppatore
  for (const [inizio, dur] of [[0, 180], [180, 175], [355, 185], [540, 60]]) { u8(1); u32be(T0 + inizio + dur); u32be(T0 + inizio); u32be(dur * 1000); u8(140); u8(9); u8(9); }
  def(2, 18, [[253, 4, 0x86], [2, 4, 0x86], [7, 4, 0x86], [11, 2, 0x84], [16, 1, 0x02], [17, 1, 0x02]]);
  u8(2); u32(T0 + 600); u32(T0); u32(600000); u16(215); u8(141); u8(0xFF);                       // battito massimo non valido: va calcolato dai record
  const testa = [14, 0x20, 0x54, 0x08, b.length & 255, (b.length >> 8) & 255, 0, 0, 0x2E, 0x46, 0x49, 0x54, 0, 0];
  return { bytes: new Uint8Array([...testa, ...b, 0, 0]), T0 };
}
prova('legge session, lap e record da un file FIT generato apposta', () => {
  const { bytes, T0 } = creaFIT(), d = decodificaFIT(bytes.buffer);
  uguale(d.durata, 600); uguale(d.calorie, 215); uguale(d.bpmMedio, 141); uguale(d.bpmMax, 151); uguale(d.inizio, (T0 + 631065600) * 1000);
  uguale(d.giri.map(g => g.durata), [180, 175, 185, 60]); uguale(giriDaLap(d), 3);
  vero(d.curva.length > 100 && d.curva.length <= 120); uguale(d.curva[0], [0, 120]); });
// File FIT fatto come quelli veri di un Suunto Race S: un record al secondo con vuoti del sensore (0xFF), eventi di pausa,
// lap con inizio, tempo trascorso, tempo senza pause e battito medio, campi sviluppatore in coda alla sessione.
function creaFITSuunto() {
  const b = [], u8 = v => b.push(v & 255), u16 = v => { u8(v); u8(v >> 8); }, u32 = v => { u16(v & 0xFFFF); u16(v >>> 16); };
  const def = (loc, glob, campi, dev = 0) => { u8(0x40 | loc | (dev ? 0x20 : 0)); u8(0); u8(0); u16(glob); u8(campi.length); for (const c of campi) { u8(c[0]); u8(c[1]); u8(c[2]); } if (dev) { u8(1); u8(0); u8(dev); u8(0); } };
  const T0 = 1157638738;
  def(0, 0, [[0, 1, 0x00], [4, 4, 0x86]]); u8(0); u8(4); u32(T0);                                   // file_id
  def(1, 21, [[253, 4, 0x86], [0, 1, 0x00], [1, 1, 0x00]]); u8(1); u32(T0); u8(0); u8(0);           // evento: timer avviato
  def(2, 20, [[253, 4, 0x86], [3, 1, 0x02]]);
  for (let i = 1; i <= 600; i++) { if (i > 200 && i <= 260) continue; u8(2); u32(T0 + i); u8(i % 5 === 0 ? 0xFF : 120 + Math.floor(i / 20)); }   // un secondo su 5 senza battito; pausa da 200 a 260
  def(3, 19, [[253, 4, 0x86], [2, 4, 0x86], [7, 4, 0x86], [8, 4, 0x86], [15, 1, 0x02], [16, 1, 0x02]]);
  for (const [da, trascorso, timer, bpm] of [[0, 150, 150, 126], [150, 210, 150, 132], [360, 160, 160, 141], [520, 80, 80, 0xFF]]) { u8(3); u32(T0 + da + trascorso); u32(T0 + da); u32(trascorso * 1000); u32(timer * 1000); u8(bpm); u8(bpm === 0xFF ? 0xFF : bpm + 12); }
  def(4, 18, [[253, 4, 0x86], [2, 4, 0x86], [7, 4, 0x86], [8, 4, 0x86], [11, 2, 0x84], [16, 1, 0x02], [17, 1, 0x02]], 4);
  u8(4); u32(T0 + 600); u32(T0); u32(600000); u32(540000); u16(180); u8(135); u8(152); u32(0);      // 4 byte di campo sviluppatore da saltare
  const testa = [14, 0x20, 0x54, 0x08, b.length & 255, (b.length >> 8) & 255, 0, 0, 0x2E, 0x46, 0x49, 0x54, 0, 0];
  return new Uint8Array([...testa, ...b, 0, 0]);
}
prova('file come quelli del Suunto: lap con battito e tempo senza pause, copertura del sensore, pause', () => {
  const d = decodificaFIT(creaFITSuunto().buffer);
  uguale([d.durata, d.bpmMedio, d.bpmMax, d.calorie, d.pausa, d.copertura], [600, 135, 152, 180, 60, 0.8]);
  uguale(d.giri, [{ durata: 150, timer: 150, bpm: 126, bpmMax: 138, da: 0 }, { durata: 210, timer: 150, bpm: 132, bpmMax: 144, da: 150 }, { durata: 160, timer: 160, bpm: 141, bpmMax: 153, da: 360 }, { durata: 80, timer: 80, da: 520 }]);
  vero(d.curva.every(p => p[1] >= 120 && p[1] <= 150), 'i vuoti del sensore non entrano nella curva'); vero(!d.curva.some(p => p[0] > 200 && p[0] <= 260), 'niente punti durante la pausa'); uguale(giriDaLap(d), 3); });
prova('un file che non è FIT viene rifiutato', () => { let e = null; try { decodificaFIT(new Uint8Array(40).buffer); } catch (x) { e = x.message; } uguale(e, 'fit'); });
prova('abbinamento alla sessione per data e ora', () => { const s = [{ id: 'a', tipo: 'amrap', inizio: 1000e3 }, { id: 'b', tipo: 'amrap', inizio: 90000e3 }]; uguale(abbina({ inizio: 90500e3 }, s).id, 'b'); uguale(abbina({ inizio: 9e12 }, s), null); });

gruppo('Backup e ripristino');
const DATI = { kv: { schemaVersion: SCHEMA, profilo: { nome: 'Roby', eta: 40 }, piano: pianoC }, sessioni: sess, test: testC };
prova('andata e ritorno con checksum e versione', () => { const b = JSON.parse(JSON.stringify(creaBackup(DATI))), v = verificaBackup(JSON.stringify(b)); vero(v.ok); uguale(v.dati, JSON.parse(JSON.stringify(DATI))); uguale([v.riepilogo.nome, v.riepilogo.sessioni, v.riepilogo.test], ['Roby', 3, 2]); uguale(b.versione, SCHEMA); });
prova('file modificato, estraneo o di versione futura: rifiutato', () => {
  const b = JSON.parse(JSON.stringify(creaBackup(DATI))); b.dati.sessioni[0].giri = 99; uguale(verificaBackup(JSON.stringify(b)).errore, 'checksum');
  uguale(verificaBackup('{"ciao":1}').errore, 'formato'); uguale(verificaBackup('non json').errore, 'formato');
  const f = creaBackup(DATI); f.versione = SCHEMA + 1; uguale(verificaBackup(f).errore, 'versione'); });

gruppo('Cosa comprare dopo');
prova('al massimo 3 consigli con motivo e cosa sblocca; trazione debole senza attrezzi → sbarra o elastici', () => {
  const c = L.consigliAcquisto(ctxBase({ obiettivi: ['forza'] }), pianoC); vero(c.length === 3); vero(['sbarra', 'elastici'].includes(c[0].attrezzo.id), c[0].attrezzo.id); uguale(c[0].motivo, 'trazione');
  for (const x of c) { vero(x.nuovi.length > 0 && IT.compra.motivo[x.motivo] && Object.keys(x.perSchema).length); } });
prova('gli attrezzi già posseduti non vengono consigliati', () => { const c = L.consigliAcquisto(ctxBase({ attrezzi: { sbarra: true, elastici: true } }), pianoC); vero(!c.some(x => ['sbarra', 'elastici'].includes(x.attrezzo.id))); });
prova('"cosa sblocca" conta gli esercizi per schema', () => { const s = L.sblocca(ATTREZZI.find(a => a.id === 'sbarra'), ctxBase()); uguale(s.perSchema, { trazione: 6, core: 2 }); });
prova('repertorio: ogni attrezzo ha almeno 3 esercizi su almeno 2 livelli, ogni schema allenabile copre i livelli da 1 a 5', () => {
  for (const a of ATTREZZI.filter(x => x.id !== 'tappetino')) { const l = ESERCIZI.filter(e => e.att.flat().includes(a.id)); vero(l.length >= 3, `${a.id}: ${l.length} esercizi`); vero(new Set(l.map(e => e.liv)).size >= 2, a.id + ': un solo livello'); }
  for (const s of SCHEMI.filter(x => x !== 'mobilita')) for (const liv of [1, 2, 3, 4, 5]) vero(ESERCIZI.some(e => e.schema === s && e.liv === liv), `${s}: nessun esercizio di livello ${liv}`);
  for (const s of SCHEMI.filter(x => x !== 'mobilita')) for (const liv of [1, 2, 3, 4, 5]) vero(ESERCIZI.some(e => e.schema === s && e.liv <= liv && !e.att.length), `${s}: niente a corpo libero fino al livello ${liv}`);
  vero(ESERCIZI.length >= 99); });

gruppo('Dati e traduzioni');
prova('libreria coerente: varianti, riferimenti, efficacia, muscoli', () => {
  vero(ESERCIZI.length >= 45, 'esercizi: ' + ESERCIZI.length);
  for (const e of ESERCIZI) { vero(SCHEMI.includes(e.schema) && e.liv >= 1 && e.liv <= 5, e.id); uguale(e.eff.length, 6, e.id); vero(e.fisso || PROVE.some(p => p.id === e.rif) || e.rif === 'trazioni', e.id + ' rif');
    for (const k of ['fac', 'dif']) vero(!e[k] || PER_ID[e[k]], `${e.id}.${k}`); for (const z of Object.keys(e.stress)) vero(ZONE.includes(z), e.id + ' ' + z);
    for (const m of [...e.musc, ...(e.musc2 || [])]) vero(IT.muscoli[m], `${e.id}: muscolo ${m}`); for (const g of e.att) for (const a of g) vero(ATTREZZI.some(x => x.id === a), e.id + ' ' + a); } });
prova('ogni esercizio ha nome, 3 consigli, 2 errori e respirazione', () => { for (const e of ESERCIZI) { const x = IT.esercizi[e.id]; vero(x && x.nome && x.consigli.length === 3 && x.errori.length === 2 && x.respiro, e.id); vero(!e.avviso || x.avviso, e.id + ' avviso'); } });
const elenca = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? elenca(p) : [p]; });
prova('tutte le chiavi di traduzione usate nel codice esistono', () => {
  const mancanti = new Set();
  for (const f of elenca(join(radice, 'js'))) for (const m of readFileSync(f, 'utf8').matchAll(/\btn?\(\s*(?:[^'`()]*\?\s*)?'([a-zA-Z0-9_.]+)'(?:\s*:\s*'([a-zA-Z0-9_.]+)')?\s*[,)]/g))
    for (const k of [m[1], m[2]]) if (k && !k.endsWith('.') && t(k) === k) mancanti.add(k);
  uguale([...mancanti], []); });
prova('famiglie di chiavi dinamiche complete', () => {
  const serve = (base, chiavi) => { for (const k of chiavi) vero(t(base + k) !== base + k, base + k); };
  serve('obiettivi.', L.OBIETTIVI.flatMap(o => [o + '.nome', o + '.desc', o + '.icona'])); serve('aree.', L.AREE); serve('schemi.', SCHEMI); serve('zone.', ZONE); serve('attrezzi.', ATTREZZI.map(a => a.id));
  serve('focus.', Object.keys(L.FOCUS_SCHEMA)); serve('livelli.', [1, 2, 3, 4, 5].flatMap(n => [n + '.nome', n + '.desc'])); serve('onb.', ['chi', 'sicurezza', 'obiettivi', 'esperienza', 'zone', 'disponibilita', 'attrezzatura', 'orologio'].flatMap(p => [p + '.titolo', p + '.sotto']));
  serve('prove.', [...PROVE.map(p => p.id), 'trazioni'].flatMap(p => [p + '.nome', p + '.misura', p + '.regole', p + '.consigli'])); serve('prove.', ['piegamenti.regoleFac', 'piegamenti.facilitata', 'burpees.regoleFac', 'burpees.facilitata']);
  serve('motivi.', ['facile', 'difficile', 'gentile', 'corpoLibero', 'attrezzo', 'simile']); serve('sugg.', ['aumenta', 'alleggerisci', 'mantieni', 'motivo.sopra', 'motivo.sotto', 'motivo.fatica', 'motivo.battitoAlto', 'motivo.facile']);
  for (const k of ['giri', 'ritmo', 'battiti']) serve('mis.' + k + '.', ['pochi', 'stabile', 'migliora', 'peggiora']);
  serve('prog.tend.', ['efficienza', 'piuLavoro', 'piuSforzo', 'stabile']); serve('carico.', ['titolo.salito', 'titolo.faticaAlta', 'testo.salito', 'testo.faticaAlta']); serve('prof.lingue.', ['it', 'en']); serve('risultato.', ['recuperoMeglio', 'recuperoPeggio', 'recuperoUguale']);
  serve('rep.', ['zona.1', 'zona.2', 'zona.3', 'zona.4', 'zona.5', 'maxFonte.profilo', 'maxFonte.eta', 'maxFonte.registrato', 'fonteApp', 'fonteOrologio', 'righe.giri', 'righe.mediaGiro', 'righe.calo', 'righe.bpm', 'righe.fatica']); serve('oggi.motivo.', ['scarico', 'ripartenza']);
  serve('installa.', ['fatta.testo', 'ios.testo', 'ios.passi', 'android.testo', 'android.passi', 'altro.testo', 'altro.passi']); serve('all.', ['riscaldamento', 'defaticamento', 'respiro', 'completa', 'facilitata', 'modo.app', 'modo.orologio']);
  serve('cla.', ['quale.sfida', 'quale.miglioramento', 'quale.costanza', 'desc.miglioramento', 'desc.costanza', 'mom.migliorato', 'mom.costante', 'mom.record', 'mom.serie', 'completa', 'facilitata']);
  serve('conf.frase.', ['lui', 'tu'].flatMap(c => ['sessioni', 'prova', 'giro', 'serie', 'miglioramento'].map(k => c + '.' + k))); serve('compra.', ['motivo.obiettivo', 'motivo.varieta', 'motivo.massimo', 'motivo.trazione', 'fascia.1', 'fascia.2', 'fascia.3']);
  serve('oro.guida.', ['garmin', 'apple', 'fitbit', 'generica'].flatMap(g => [g + '.impostazioni', g + '.esportare'])); serve('bak.errore.', ['formato', 'checksum', 'versione']); serve('prof.temi.', ['auto', 'scuro', 'chiaro']);
  serve('marche.', ['garmin', 'apple', 'fitbit', 'polar', 'suunto', 'coros', 'amazfit', 'samsung', 'altro']); serve('esperienza.', ['mai', 'fermo', 'regolare', 'avanzato'].flatMap(e => [e + '.nome', e + '.desc'])); serve('test.', ['iniziale', 'mensile']); serve('nav.', ['oggi', 'progressi', 'classifica', 'profilo']); });
prova('inglese: stesse chiavi dell\'italiano, stessi segnaposto, stesse forme del plurale', () => {
  const problemi = [], segna = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  const confronta = (a, b, dove) => {
    if (typeof a === 'string') { if (typeof b !== 'string') return problemi.push(dove + ': manca o non è testo');
      if (segna(a) !== segna(b)) problemi.push(`${dove}: segnaposto diversi (${segna(a)} / ${segna(b)})`); if (a.split('|').length !== b.split('|').length) problemi.push(dove + ': forme del plurale'); if (!b.trim()) problemi.push(dove + ': vuoto'); return; }
    if (Array.isArray(a)) { if (!Array.isArray(b) || a.length !== b.length) return problemi.push(dove + ': elenco di lunghezza diversa'); a.forEach((x, i) => confronta(x, b[i], `${dove}[${i}]`)); return; }
    if (!b || typeof b !== 'object') return problemi.push(dove + ': manca');
    for (const k of Object.keys(a)) confronta(a[k], b[k], dove ? dove + '.' + k : k); for (const k of Object.keys(b)) if (!(k in a)) problemi.push(`${dove}.${k}: c'è solo in inglese`); };
  confronta(IT, EN, ''); uguale(problemi, []);
  for (const o of L.OBIETTIVI) uguale(EN.obiettivi[o].icona, IT.obiettivi[o].icona, 'le icone non si traducono'); });
prova('cambio lingua: testi, plurali, formato; una lingua sconosciuta torna all\'italiano', () => {
  try { impostaLingua('en'); uguale([lingua(), locale(), t('nav.oggi'), tn('riep.giri', 1), tn('riep.giri', 3), t('esercizi.squat.nome'), t('chiave.che.non.esiste')], ['en', 'en-GB', 'Today', '1 round', '3 rounds', 'Squat', 'chiave.che.non.esiste']);
    impostaLingua('xx'); uguale([lingua(), t('nav.oggi')], ['it', 'Oggi']); } finally { impostaLingua('it'); }
  uguale([lingua(), locale(), t('nav.oggi')], ['it', 'it-IT', 'Oggi']); });
prova('il service worker mette in cache tutti i file dell\'app', () => {
  const sw = readFileSync(join(radice, 'sw.js'), 'utf8'), lista = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
  const veri = ['index.html', 'manifest.webmanifest', ...['css', 'js', 'data', 'i18n', 'icons', 'fonts'].flatMap(d => elenca(join(radice, d)).map(p => relative(radice, p).split('\\').join('/')))];
  uguale(veri.filter(f => !lista.includes(f)), [], 'mancano nel service worker:'); uguale(lista.filter(f => !veri.includes(f)), [], 'elencati ma inesistenti:'); });
prova('nessuna chiamata di rete: né pagina, né stile, né service worker, né codice puntano a server esterni', () => {
  const file = ['index.html', 'sw.js', 'css/app.css', ...elenca(join(radice, 'js')).map(p => relative(radice, p))];
  for (const f of file) { const righe = readFileSync(join(radice, f), 'utf8').split('\n').filter(r => /https?:\/\//.test(r) && !/^\s*(\/\/|\*|\/\*)/.test(r));
    for (const r of righe) vero(/youtube\.com\/results|www\.w3\.org/.test(r) && !/fetch\(|src=|href="https/.test(r), `${f}: ${r.trim().slice(0, 90)}`); }
  vero(!/googleapis|gstatic/.test(readFileSync(join(radice, 'index.html'), 'utf8') + readFileSync(join(radice, 'sw.js'), 'utf8'))); });
gruppo('Figure animate');
const OSSA_FIG = [['piede', 'caviglia', 'punta'], ['tibia', 'caviglia', 'ginocchio'], ['coscia', 'ginocchio', 'anca'], ['busto', 'anca', 'spalla'], ['collo', 'spalla', 'testa'], ['braccio', 'spalla', 'gomito'], ['avambraccio', 'gomito', 'mano'], ['coscia', 'ginocchio2', 'anca'], ['tibia', 'caviglia2', 'ginocchio2'], ['piede', 'caviglia2', 'punta2']];
const distF = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fermoF = (quadri, nome) => Math.max(...quadri.map(J => distF(J[nome], quadri[0][nome])));   // di quanto si sposta un punto nel ciclo
prova('ogni prova del test ha la sua figura, anche nella variante facilitata', () => {
  for (const p of PROVE) vero(F.haFigura(p.id), p.id);
  vero(F.haFigura('trazioni'), 'trazioni');
  for (const p of PROVE.filter(x => x.facilitata)) vero(F.haFigura(F.FIGURA_FACILITATA[p.id]), 'facilitata ' + p.id);
  for (const id of F.ELENCO_FIGURE) vero(PER_ID[id] || PROVE.some(p => p.id === id), id + ' non è né una prova né un esercizio');
  uguale(F.svgFigura('non_esiste'), ''); uguale(F.fotogrammi('non_esiste'), null);
});
prova('in ogni fotogramma le ossa hanno la loro lunghezza, niente entra nel pavimento e il ciclo si chiude', () => {
  for (const id of F.ELENCO_FIGURE) {
    const { durata, quadri } = F.fotogrammi(id);
    vero(durata >= 2 && durata <= 6 && quadri.length === Math.round(durata * F.FPS) + 1, id + ': durata o numero di fotogrammi');
    quadri.forEach((J, i) => {
      for (const [osso, a, b] of OSSA_FIG) vero(Math.abs(distF(J[a], J[b]) - F.OSSA[osso]) < 0.05, `${id} fotogramma ${i}: ${osso} lungo ${distF(J[a], J[b]).toFixed(2)}`);
      for (const [nome, p] of Object.entries(J)) vero(Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] > -0.6, `${id} fotogramma ${i}: ${nome} a y ${p[1]}`);
    });
    for (const nome of Object.keys(quadri[0])) vero(distF(quadri[0][nome], quadri[quadri.length - 1][nome]) < 1e-6, id + ': il ciclo non si chiude su ' + nome);
  }
});
prova('le figure rispettano le regole delle prove', () => {
  const posa = (id, nome) => F.giunti(F.figura(id).pose[nome]), q = id => F.fotogrammi(id).quadri;
  // squat: cosce parallele al pavimento, piedi fermi
  const sq = posa('squat', 'giu'); vero(Math.abs(sq.anca[1] - sq.ginocchio[1]) < 2, 'squat: cosce non parallele');
  vero(fermoF(q('squat'), 'caviglia') < 0.01 && fermoF(q('squat'), 'punta') < 0.01, 'squat: i piedi si muovono');
  // piegamenti: mani e punte ferme, petto a un pugno da terra, corpo in linea
  for (const [id, perno] of [['piegamenti', 'punta'], ['piegamenti_ginocchia', 'ginocchio']]) {
    vero(fermoF(q(id), 'mano') < 0.05 && fermoF(q(id), perno) < 0.01, id + ': mani o appoggio si muovono');
    const su = posa(id, 'alto'), giu = posa(id, 'basso');
    vero(su.spalla[1] > 30 && giu.spalla[1] > 5 && giu.spalla[1] < 12, id + ': altezza delle spalle');
    for (const J of q(id)) { const a = J[perno === 'punta' ? 'caviglia' : 'ginocchio'], d = distF(a, J.spalla), somma = perno === 'punta' ? 86 : 60; vero(Math.abs(d - somma) < 0.05, id + ': il corpo non resta in linea'); }
  }
  // plank: gomiti e avambracci fermi, corpo in linea nella tenuta
  vero(fermoF(q('plank'), 'gomito') < 0.01 && fermoF(q('plank'), 'mano') < 0.01 && fermoF(q('plank'), 'spalla') < 0.01, 'plank: le braccia si muovono');
  const pl = posa('plank', 'linea'); vero(Math.abs(distF(pl.caviglia, pl.spalla) - 86) < 0.05 && Math.abs(pl.spalla[0] - pl.gomito[0]) < 0.01, 'plank: linea o gomiti');
  // superman: petto, braccia e cosce staccati, bacino a terra
  const sm = posa('superman', 'su'); vero(sm.anca[1] < 2 && sm.spalla[1] > 5 && sm.mano[1] > sm.spalla[1] && sm.ginocchio[1] > 3 && sm.caviglia[1] > sm.ginocchio[1], 'superman');
  // burpees: petto a terra, poi salto con le mani sopra la testa
  const bu = q('burpees');
  vero(Math.min(...bu.map(J => J.spalla[1])) < 5, 'burpees: il petto non arriva a terra');
  const volo = bu.filter(J => J.caviglia[1] > 10 && J.spalla[1] > 90); vero(volo.length >= 1 && volo.some(J => J.mano[1] > J.testa[1] + F.TESTA), 'burpees: manca il salto con le mani sopra la testa');
  // variante facilitata: un piede alla volta, niente salto e niente piegamento
  const bf = q('burpees_senza_salto');
  vero(bf.every(J => Math.min(J.punta[1], J.punta2[1]) < 1.5), 'burpees facilitati: i due piedi si staccano insieme');
  vero(bf.some(J => distF(J.caviglia, J.caviglia2) > 30), 'burpees facilitati: le gambe non si muovono una alla volta');
  vero(Math.min(...bf.map(J => J.spalla[1])) > 25 && Math.max(...bf.map(J => J.testa[1])) < 105, 'burpees facilitati: piegamento o salto');
  // trazioni: mani ferme sulla sbarra, mento sopra la sbarra
  vero(fermoF(q('trazioni'), 'mano') < 0.01, 'trazioni: le mani si muovono');
  const tr = posa('trazioni', 'su'), ap = posa('trazioni', 'appeso'); vero(tr.testa[1] - F.TESTA > tr.mano[1] && ap.testa[1] + F.TESTA < ap.mano[1], 'trazioni: mento e sbarra');
});
prova('il disegno: animato o fermo, con il testo per lo screen reader e senza niente di esterno', () => {
  for (const id of F.ELENCO_FIGURE) {
    const vivo = F.svgFigura(id), fermo = F.svgFigura(id, { fermo: true, etichetta: 'Figura: prova' });
    vero(vivo.startsWith('<svg') && vivo.endsWith('</svg>') && vivo.includes('repeatCount="indefinite"') && vivo.includes('aria-hidden="true"'), id + ': svg animato');
    vero(!fermo.includes('<animate') && fermo.includes('role="img" aria-label="Figura: prova"') && fermo.includes('f-ombra'), id + ': svg fermo');
    for (const s of [vivo, fermo]) vero(!/NaN|undefined|Infinity|http|href|<script|<image/.test(s), id + ': contenuto inatteso');
    vero(vivo.length < 16000, id + ': disegno troppo pesante (' + vivo.length + ')');
    const alto = +vivo.match(/viewBox="0 0 (\d+) (\d+)"/)[2]; vero(alto >= 40 && alto <= 180, id + ': altezza ' + alto);
  }
  vero(F.svgFigura('burpees_senza_salto').includes('f-dietro') && !F.svgFigura('squat').includes('f-dietro'), 'la seconda gamba si disegna solo dove serve');
});

prova('settimana ISO e lunedì', () => { uguale(settimanaISO('2026-11-16'), '2026-W47'); uguale(settimanaISO('2027-01-01'), '2026-W53'); uguale(lunedi('2026-11-22'), '2026-11-16'); });

await new Promise(r => setTimeout(r, 50));
console.log(`\n${ok} test superati, ${ko} falliti`);
process.exit(ko ? 1 : 0);
