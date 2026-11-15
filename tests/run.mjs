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
import { t } from '../js/i18n.js';
import { piuGiorni, settimanaISO, lunedi } from '../js/util.js';

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
await prova('estrae più codici da un messaggio di WhatsApp', async () => {
  const a = await C.creaCodice('HOMRAP1', mio(false)), b = await C.creaCodice('HOMRAPG1', { m: [] });
  uguale(C.estraiCodici(`[16/11, 18:02] Luca: ecco i miei risultati HoMRAP:\n${a}\n[16/11, 18:05] Sara: il mio ${b} ciao!`), [a, b]); });
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
prova('"cosa sblocca" conta gli esercizi per schema', () => { const s = L.sblocca(ATTREZZI.find(a => a.id === 'sbarra'), ctxBase()); uguale(s.perSchema, { trazione: 3, core: 1 }); });

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
  serve('motivi.', ['facile', 'difficile', 'gentile', 'corpoLibero', 'attrezzo', 'simile']); serve('sugg.', ['aumenta', 'alleggerisci', 'motivo.sopra', 'motivo.sotto', 'motivo.fatica']); serve('oggi.motivo.', ['scarico', 'ripartenza']);
  serve('installa.', ['fatta.testo', 'ios.testo', 'ios.passi', 'android.testo', 'android.passi', 'altro.testo', 'altro.passi']); serve('all.', ['riscaldamento', 'defaticamento', 'respiro', 'completa', 'facilitata', 'modo.app', 'modo.orologio']);
  serve('cla.', ['quale.sfida', 'quale.miglioramento', 'quale.costanza', 'desc.miglioramento', 'desc.costanza', 'mom.migliorato', 'mom.costante', 'mom.record', 'mom.serie', 'completa', 'facilitata']);
  serve('conf.frase.', ['lui', 'tu'].flatMap(c => ['sessioni', 'prova', 'giro', 'serie', 'miglioramento'].map(k => c + '.' + k))); serve('compra.', ['motivo.obiettivo', 'motivo.varieta', 'motivo.massimo', 'motivo.trazione', 'fascia.1', 'fascia.2', 'fascia.3']);
  serve('oro.guida.', ['garmin', 'apple', 'fitbit', 'generica'].flatMap(g => [g + '.impostazioni', g + '.esportare'])); serve('bak.errore.', ['formato', 'checksum', 'versione']); serve('prof.temi.', ['auto', 'scuro', 'chiaro']);
  serve('marche.', ['garmin', 'apple', 'fitbit', 'polar', 'suunto', 'coros', 'amazfit', 'samsung', 'altro']); serve('esperienza.', ['mai', 'fermo', 'regolare', 'avanzato'].flatMap(e => [e + '.nome', e + '.desc'])); serve('test.', ['iniziale', 'mensile']); serve('nav.', ['oggi', 'progressi', 'classifica', 'profilo']); });
prova('il service worker mette in cache tutti i file dell\'app', () => {
  const sw = readFileSync(join(radice, 'sw.js'), 'utf8'), lista = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
  const veri = ['index.html', 'manifest.webmanifest', ...['css', 'js', 'data', 'i18n', 'icons'].flatMap(d => elenca(join(radice, d)).map(p => relative(radice, p).split('\\').join('/')))];
  uguale(veri.filter(f => !lista.includes(f)), [], 'mancano nel service worker:'); uguale(lista.filter(f => !veri.includes(f)), [], 'elencati ma inesistenti:'); });
prova('settimana ISO e lunedì', () => { uguale(settimanaISO('2026-11-16'), '2026-W47'); uguale(settimanaISO('2027-01-01'), '2026-W53'); uguale(lunedi('2026-11-22'), '2026-11-16'); });

await new Promise(r => setTimeout(r, 50));
console.log(`\n${ok} test superati, ${ko} falliti`);
process.exit(ko ? 1 : 0);
