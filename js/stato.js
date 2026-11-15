// Stato dell'app in memoria (S) e salvataggio in IndexedDB.
import * as db from './db.js';
import { SCHEMA, migra, creaBackup } from './backup.js';
import { uid, isoData, copia } from './util.js';
import { valutaTest, GIORNI_PREDEFINITI, AREE } from './logica.js';
import { bpmMassimo } from './analisi.js';

const PREDEFINITI = () => ({
  profilo: null,           // risposte dell'onboarding
  attrezzi: {},            // { elastici: true, manubri: { kg: [4, 8] }, … }
  orologio: null,          // { marca, modello, usa }
  piano: null,
  preferenze: { tema: 'auto', voce: true, suoni: true, vibrazione: true, noSalti: false },
  esercizi: { scartati: [], daDecidere: [], sostituzioni: {}, tempi: {} },
  classifica: { membri: {}, codici: {}, gruppo: null, periodo: 'm' },
  backup: { ultimo: null, daRicordare: false },
  misure: [],              // [{ data, peso, vita, … }]
  io: null,                // { id, colore }
  stato: {},               // avvisi chiusi, primo avvio, demo…
  attivo: null,            // allenamento in corso (per riprenderlo dopo una ricarica)
});
const CHIAVI = Object.keys(PREDEFINITI());
export const S = { ...PREDEFINITI(), sessioni: [], test: [], salvabile: true };

export async function carica() {
  S.salvabile = await db.apri();
  let dati = await db.leggiTutto();
  const v = dati.kv.schemaVersion;
  if (v && v < SCHEMA) { dati = migra(dati, v); await db.sostituisciTutto({ ...dati, kv: { ...dati.kv, schemaVersion: SCHEMA } }); }
  applica(dati);
  if (!v) await db.scrivi('kv', SCHEMA, 'schemaVersion');
  if (!S.io) { S.io = { id: uid(12), colore: Math.floor(Math.random() * 6) }; await salva('io'); }
}
function applica(dati) {
  const base = PREDEFINITI();
  for (const k of CHIAVI) {
    const val = dati.kv[k];
    S[k] = val == null ? base[k] : (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? { ...base[k], ...val } : val);
  }
  S.sessioni = (dati.sessioni || []).sort((a, b) => a.ts - b.ts);
  S.test = (dati.test || []).sort((a, b) => a.ts - b.ts);
}
export const salva = (...chiavi) => Promise.all(chiavi.map(k => db.scrivi('kv', copia(S[k]), k)));
export async function salvaSessione(s) {
  const i = S.sessioni.findIndex(x => x.id === s.id);
  if (i >= 0) S.sessioni[i] = s; else S.sessioni.push(s);
  S.sessioni.sort((a, b) => a.ts - b.ts);
  await db.scrivi('sessioni', copia(s));
}
export async function salvaTest(t) {
  S.test.push(t); S.test.sort((a, b) => a.ts - b.ts);
  await db.scrivi('test', copia(t));
}
export const esporta = () => copia({ kv: { schemaVersion: SCHEMA, ...Object.fromEntries(CHIAVI.filter(k => k !== 'attivo').map(k => [k, S[k]])) }, sessioni: S.sessioni, test: S.test });
export const backupCorrente = () => creaBackup(esporta());
export async function importa(dati) {
  await db.sostituisciTutto({ ...dati, kv: { ...dati.kv, schemaVersion: SCHEMA } });
  applica(dati);
}
export async function cancellaTutto() {
  await db.sostituisciTutto({ kv: { schemaVersion: SCHEMA }, sessioni: [], test: [] });
  applica({ kv: {}, sessioni: [], test: [] });
  S.io = { id: uid(12), colore: Math.floor(Math.random() * 6) }; await salva('io');
}

export const oggi = () => isoData();
export const ultimoTest = () => S.test[S.test.length - 1] || null;
export const testIniziale = () => S.test[0] || null;
export function valutazione() {
  const t = ultimoTest();
  return t ? valutaTest(t.ris, S.profilo || {}) : null;
}
// Il contesto che la logica usa per scegliere esercizi e ripetizioni.
export function contesto(extra = {}) {
  const p = S.profilo || {}, v = valutazione();
  return {
    obiettivi: p.obiettivi && p.obiettivi.length ? p.obiettivi : ['salute'], esperienza: p.esperienza || 'fermo',
    infortuni: p.infortuni || [], zoneMeno: p.zoneMeno || [],
    cauto: !!(p.sicurezza && p.sicurezza.cauto), gravidanza: !!(p.sicurezza && p.sicurezza.gravidanza), noSalti: !!S.preferenze.noSalti,
    attrezzi: S.attrezzi, livelli: v ? v.livelli : Object.fromEntries(AREE.map(a => [a, 1])), debole: v ? v.debole : null,
    cap: v ? v.cap : { squat: 20, piegamenti: 8, burpees: 8, plank: 40, superman: 30, trazioni: 0 },
    scartati: S.esercizi.scartati, daDecidere: S.esercizi.daDecidere, sostituzioni: S.esercizi.sostituzioni, tempi: S.esercizi.tempi,
    giorni: p.giorni || 3, giorniSett: p.giorniSett || GIORNI_PREDEFINITI[p.giorni || 3], durata: p.durata || 20,
    blocco: S.piano ? S.piano.blocco : 1,
    bpmMax: bpmMassimo(p, S.sessioni).valore,   // serve solo alla progressione: non entra mai nei codici della classifica
    ...extra,
  };
}
