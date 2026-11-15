// Backup e ripristino: funzioni pure (creazione, verifica, migrazioni dello schema).
import { crcHex } from './util.js';

export const SCHEMA = 1;
// Migrazioni: MIGRAZIONI[n] porta i dati dallo schema n allo schema n + 1.
// Per cambiare la struttura dei dati: aumenta SCHEMA e aggiungi qui la funzione corrispondente.
export const MIGRAZIONI = {};

export function migra(dati, da) {
  for (let v = da; v < SCHEMA; v++) if (MIGRAZIONI[v]) dati = MIGRAZIONI[v](dati);
  return dati;
}
export function creaBackup(dati, quando = new Date()) {
  return { app: 'homrap', versione: SCHEMA, creato: quando.toISOString(), checksum: crcHex(JSON.stringify(dati)), dati };
}
export function verificaBackup(testo) {
  let b;
  try { b = typeof testo === 'string' ? JSON.parse(testo) : testo; } catch { return { ok: false, errore: 'formato' }; }
  if (!b || b.app !== 'homrap' || !b.dati || !b.dati.kv) return { ok: false, errore: 'formato' };
  if (b.checksum !== crcHex(JSON.stringify(b.dati))) return { ok: false, errore: 'checksum' };
  if (!(b.versione >= 1) || b.versione > SCHEMA) return { ok: false, errore: 'versione' };
  const dati = migra(b.dati, b.versione);
  const p = dati.kv.profilo || {};
  return { ok: true, dati, riepilogo: { nome: p.nome || '', creato: b.creato, versione: b.versione, sessioni: (dati.sessioni || []).length, test: (dati.test || []).length } };
}
