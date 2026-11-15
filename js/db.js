// Piccolo wrapper su IndexedDB. Tre archivi: 'kv' (chiave → valore), 'sessioni' e 'test' (per id).
const NOME = 'homrap';
let db = null;

export function apri() {
  return new Promise(ok => {
    let r;
    try { r = indexedDB.open(NOME, 1); } catch { ok(false); return; }
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('sessioni')) d.createObjectStore('sessioni', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('test')) d.createObjectStore('test', { keyPath: 'id' });
    };
    r.onsuccess = () => { db = r.result; db.onversionchange = () => db.close(); ok(true); };
    r.onerror = () => ok(false);   // senza IndexedDB l'app funziona ma non salva: l'interfaccia avvisa
  });
}
function tx(archivi, modo, fn) {
  if (!db) return Promise.resolve(null);
  return new Promise((ok, no) => {
    const t = db.transaction(archivi, modo), out = fn(t);
    t.oncomplete = () => ok(out);
    t.onerror = t.onabort = () => no(t.error);
  });
}
const richiesta = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });

export async function leggiTutto() {
  if (!db) return { kv: {}, sessioni: [], test: [] };
  const t = db.transaction(['kv', 'sessioni', 'test'], 'readonly');
  const [chiavi, valori, sessioni, test] = await Promise.all([
    richiesta(t.objectStore('kv').getAllKeys()), richiesta(t.objectStore('kv').getAll()),
    richiesta(t.objectStore('sessioni').getAll()), richiesta(t.objectStore('test').getAll()),
  ]);
  return { kv: Object.fromEntries(chiavi.map((k, i) => [k, valori[i]])), sessioni, test };
}
export const scrivi = (archivio, valore, chiave) => tx(archivio, 'readwrite', t => { t.objectStore(archivio).put(valore, chiave); });
export const elimina = (archivio, chiave) => tx(archivio, 'readwrite', t => { t.objectStore(archivio).delete(chiave); });
export const sostituisciTutto = dati => tx(['kv', 'sessioni', 'test'], 'readwrite', t => {
  for (const a of ['kv', 'sessioni', 'test']) t.objectStore(a).clear();
  for (const [k, v] of Object.entries(dati.kv || {})) t.objectStore('kv').put(v, k);
  for (const s of dati.sessioni || []) t.objectStore('sessioni').put(s);
  for (const x of dati.test || []) t.objectStore('test').put(x);
});
export const attivo = () => !!db;
