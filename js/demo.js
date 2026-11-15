// Modalità demo: carica dati di esempio per provare grafici e classifica. I dati veri vengono messi da parte e ripristinati allo spegnimento.
import * as db from './db.js';
import { S, salva, salvaSessione, esporta, importa, contesto, oggi } from './stato.js';
import { generaPiano, obiettivoGiri, ripPerGiro } from './logica.js';
import { sfidaDelMese, chiavePeriodo, iniziali } from './classifica.js';
import { piuGiorni, giornoSett, daIso, prng, meseISO } from './util.js';

const PROFILO = { nome: 'Demo', eta: 35, sesso: null, altezza: '', peso: '', obiettivi: ['dimagrire', 'forza'], esperienza: 'regolare', infortuni: [], zoneMeno: [], giorni: 3, giorniSett: [1, 3, 5], durata: 20,
  sicurezza: { risposte: Array(7).fill(false), gravidanza: null, conferma: false, cauto: false } };
const AMICI = [['Luca', 1.15, 12, 9], ['Giulia', 1.02, 9, 5], ['Marco', 0.95, 14, 14], ['Sara', 0.88, 11, 7], ['Andrea', 0.8, 6, 2], ['Chiara', 0.76, 8, 4]];
const ts = (iso, ora = 18) => { const d = daIso(iso); d.setHours(ora, 30); return d.getTime(); };

export async function attivaDemo() {
  const reale = esporta(), d = oggi(), r = prng('demo-' + d), mese = meseISO(d), sfida = sfidaDelMese(mese);
  const test = (id, giorni, f, tipo) => ({ id, ts: ts(piuGiorni(d, -giorni), 9), data: piuGiorni(d, -giorni), tipo, blocco: tipo === 'iniziale' ? 0 : 1,
    ris: { squat: { v: Math.round(30 * f) }, piegamenti: { v: Math.round(14 * f) }, burpees: { v: Math.round(12 * f) }, plank: { v: Math.round(62 * f) }, superman: { v: Math.round(45 * f) } } });
  const amico = ([nome, forza, sessioni, serie], i, tipo) => ({
    v: 1, id: 'demo-' + nome.toLowerCase(), n: nome, in: iniziali(nome + ' ' + 'BRCFVM'[i]), c: (i + 1) % 6, p: { t: tipo, k: chiavePeriodo(tipo, d) }, ts: Math.round(Date.now() / 1000) - i * 3600,
    sf: { g: Math.floor(7.5 * forza), r: Math.round(r() * 14), rg: ripPerGiro(i % 3 === 1 ? sfida.facilitata : sfida.completa), v: i % 3 === 1 ? 'f' : 'c' },
    se: tipo === 'w' ? Math.min(6, Math.round(sessioni / 4)) : sessioni, st: serie, mi: Math.round(4 + r() * 20),
    an: Array.from({ length: 8 }, (_, k) => Math.round((5 + forza + k * 0.25 * forza + r() * 0.4) * 10) / 10), mg: Math.round(190 / forza),
    te: { squat: Math.round(34 * forza), piegamenti: Math.round(18 * forza), burpees: Math.round(13 * forza), plank: Math.round(70 * forza), superman: Math.round(50 * forza) }, tf: i % 3 === 1 ? ['piegamenti'] : [],
  });
  const mensili = AMICI.map((a, i) => amico(a, i, 'm')), settimanali = AMICI.map((a, i) => amico(a, i, 'w'));
  await importa({
    kv: { ...reale.kv, profilo: reale.kv.profilo || PROFILO, piano: null, stato: { ...reale.kv.stato, onboarding: true, demo: true, demoSenzaTest: !reale.test.length }, backup: { ultimo: Date.now(), daRicordare: false },
      esercizi: { scartati: [], daDecidere: [], sostituzioni: {}, tempi: {} },
      misure: [42, 21, 1].map((g, i) => ({ data: piuGiorni(d, -g), peso: 74 - i * 0.8, vita: 86 - i })),
      classifica: { periodo: 'm', gruppo: { v: 1, p: { t: 'm', k: chiavePeriodo('m', d) }, ts: 0, m: mensili }, codici: Object.fromEntries(settimanali.map(m => [m.id, m])),
        membri: { ...Object.fromEntries(mensili.map(m => [m.id, { n: m.n, in: m.in, c: m.c }])), 'demo-davide': { n: 'Davide', in: 'DR', c: 4 } } },
      demoReale: reale },
    sessioni: [], test: [test('demo-t0', 42, 1, 'iniziale'), test('demo-t1', 14, 1.14, 'mensile')],
  });
  const ctx = contesto({ blocco: 2 });
  S.piano = generaPiano(ctx, piuGiorni(d, -14));
  await salva('piano');
  let n = 0;
  for (let g = 41; g >= 1; g--) {
    const data = piuGiorni(d, -g);
    if (![1, 3, 5].includes(giornoSett(data))) continue;
    const blocco = g > 14 ? 1 : 2, giorno = S.piano.giorni[n % S.piano.giorni.length], scarico = g > 14 && g <= 21;
    const esercizi = giorno.esercizi.map(x => ({ ...x, q: scarico ? Math.max(3, Math.round(x.q * 0.7)) : x.q }));
    const obiettivo = obiettivoGiri(esercizi, 20, ctx), rg = ripPerGiro(esercizi), avanzamento = (41 - g) / 40;
    const eq = obiettivo - 0.5 + avanzamento * 1.9 + r() * 0.3, giri = Math.floor(eq);
    await salvaSessione({ id: 'demo-s' + n, ts: ts(data), inizio: ts(data) - 20 * 60e3, data, tipo: 'amrap', blocco, tipoGiorno: giorno.tipo, focus: giorno.focus, rev: 0, fattore: scarico ? 0.7 : 1, motivo: scarico ? 'scarico' : null,
      leggero: false, durata: 20, esercizi, obiettivo, ripGiro: rg, giri, extra: Math.round((eq - giri) * rg), tempiGiro: [], fatica: 6 + Math.round(r() * 2), fastidi: [], note: '', modalita: 'app',
      orologio: n % 2 ? { bpmMedio: 138 + Math.round(r() * 12), bpmMax: 168 + Math.round(r() * 8), calorie: 190 + Math.round(r() * 40), durata: 1200 } : null });
    n++;
  }
  if (daIso(d).getDate() > 2) {
    const data = piuGiorni(d, -1), rg = ripPerGiro(sfida.completa);
    await salvaSessione({ id: 'demo-sfida', ts: ts(data, 8), inizio: ts(data, 8) - 15 * 60e3, data, tipo: 'sfida', blocco: 2, tipoGiorno: null, focus: null, rev: 0, fattore: 1, durata: 15, esercizi: sfida.completa,
      obiettivo: obiettivoGiri(sfida.completa, 15, ctx), ripGiro: rg, giri: 7, extra: Math.round(rg * 0.4), tempiGiro: [], fatica: 8, fastidi: [], note: '', modalita: 'app', orologio: null, variante: 'completa', meseSfida: mese });
  }
}
export async function disattivaDemo() {
  const reale = (await db.leggiTutto()).kv.demoReale;
  if (reale) await importa(reale);
  else { S.stato.demo = false; await salva('stato'); }
}
