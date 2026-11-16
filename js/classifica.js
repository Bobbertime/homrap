// Sfida del mese, codici di testo (personale e di gruppo) e calcoli della classifica. Modulo puro.
import { prng, crc32, b64url, daB64url, meseISO, settimanaISO, lunedi, piuGiorni, media } from './util.js';
import { giriEq, serieGiorni, miglioramento, valoreEq } from './logica.js';
import { PROVE } from '../data/soglie-test.js';

// ───────────────────────── Sfida del mese: deterministica dal mese "AAAA-MM"
// Per ogni schema: [esercizio completo, ripetizioni, esercizio facilitato, ripetizioni].
const BANCO = {
  spinta: [['piegamenti', 10, 'piegamenti_ginocchia', 10], ['piegamenti', 12, 'piegamenti_inclinati', 12], ['pike_pushup', 6, 'piegamenti_ginocchia', 8]],
  gambe: [['squat', 20, 'squat', 15], ['affondi_alternati', 16, 'affondi_indietro', 12], ['squat_jump', 12, 'squat', 15]],
  core: [['mountain_climber', 20, 'dead_bug', 12], ['plank', 30, 'plank', 20], ['leg_raise', 10, 'dead_bug', 10]],
  cond: [['burpees', 8, 'burpees_senza_salto', 6], ['jumping_jack', 30, 'step_jack', 30], ['skip_alto', 30, 'step_jack', 30]],
  posteriore: [['ponte_glutei', 15, 'ponte_glutei', 12], ['superman_ytw', 10, 'superman_ytw', 8], ['hip_thrust', 15, 'ponte_glutei', 12]],
};
export function sfidaDelMese(mese) {
  const r = prng('HoMRAP-' + mese), schemi = Object.keys(BANCO);
  for (let i = schemi.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [schemi[i], schemi[j]] = [schemi[j], schemi[i]]; }
  const scelte = schemi.slice(0, 4).map(s => ({ s, o: BANCO[s][Math.floor(r() * BANCO[s].length)] }));
  return {
    mese, durata: 15,
    completa: scelte.map(({ s, o }) => ({ slot: s, id: o[0], q: o[1] })),
    facilitata: scelte.map(({ s, o }) => ({ slot: s, id: o[2], q: o[3] })),
  };
}

// ───────────────────────── Codici: PREFISSO.<base64url di [flag, crc32 (4 byte), corpo]>
async function flusso(bytes, Classe) {
  const s = new Classe('deflate-raw'), w = s.writable.getWriter();
  w.write(bytes).catch(() => {}); w.close().catch(() => {});   // gli errori arrivano dalla lettura qui sotto
  return new Uint8Array(await new Response(s.readable).arrayBuffer());
}
export async function creaCodice(prefisso, obj, comprimere = true) {
  const json = new TextEncoder().encode(JSON.stringify(obj));
  let corpo = json, flag = 0;
  if (comprimere && typeof CompressionStream !== 'undefined') {
    try { const c = await flusso(json, CompressionStream); if (c.length < json.length) { corpo = c; flag = 1; } } catch { /* senza compressione */ }
  }
  const out = new Uint8Array(5 + corpo.length);
  out[0] = flag; new DataView(out.buffer).setUint32(1, crc32(json)); out.set(corpo, 5);
  return prefisso + '.' + b64url(out);
}
export async function leggiCodice(codice) {
  const m = /^(HOMRAPG?1)\.([A-Za-z0-9_-]+)$/.exec(String(codice).trim());
  if (!m) throw new Error('formato');
  let b; try { b = daB64url(m[2]); } catch { throw new Error('formato'); }
  if (b.length < 6) throw new Error('formato');
  let json = b.slice(5);
  if (b[0] === 1) {
    if (typeof DecompressionStream === 'undefined') throw new Error('compressione');
    try { json = await flusso(json, DecompressionStream); } catch { throw new Error('crc'); }
  } else if (b[0] !== 0) throw new Error('formato');
  if (crc32(json) !== new DataView(b.buffer, b.byteOffset).getUint32(1)) throw new Error('crc');
  let dati; try { dati = JSON.parse(new TextDecoder().decode(json)); } catch { throw new Error('crc'); }
  return { tipo: m[1] === 'HOMRAPG1' ? 'gruppo' : 'personale', dati };
}
export const estraiCodici = testo => String(testo).match(/HOMRAPG?1\.[A-Za-z0-9_-]{8,}/g) || [];

// ───────────────────────── Dati personali da mettere nel codice
export const iniziali = nome => {
  const p = String(nome || '?').trim().split(/\s+/).filter(Boolean);
  return ((p.length > 1 ? p[0][0] + p[1][0] : (p[0] || '?').slice(0, 2))).toUpperCase();
};
export const chiavePeriodo = (tipo, oggi) => tipo === 'w' ? settimanaISO(oggi) : meseISO(oggi);
export function nelPeriodo(data, tipo, oggi) {
  if (tipo === 'w') { const l = lunedi(oggi); return data >= l && data <= piuGiorni(l, 6); }
  return meseISO(data) === meseISO(oggi);
}
export function migliorSfida(sessioni, mese) {
  const s = sessioni.filter(x => x.tipo === 'sfida' && x.meseSfida === mese).sort((a, b) => giriEq(b) - giriEq(a))[0];
  return s ? { g: s.giri, r: s.extra || 0, rg: s.ripGiro, v: s.variante === 'facilitata' ? 'f' : 'c' } : null;
}
// io: { id, nome, colore }; test: elenco dei test in ordine di data; opzioni: { tipo: 'm' | 'w', dettagli }
export function datiPersonali({ io, sessioni, test, perSettimana }, { tipo = 'm', dettagli = true } = {}, oggi, ts = Date.now()) {
  const all = sessioni.filter(s => s.tipo === 'amrap' || s.tipo === 'sfida');
  const d = {
    v: 1, id: io.id, n: io.nome, in: iniziali(io.nome), c: io.colore || 0,
    p: { t: tipo, k: chiavePeriodo(tipo, oggi) }, ts: Math.round(ts / 1000),
    sf: migliorSfida(sessioni, meseISO(oggi)),
    se: all.filter(s => nelPeriodo(s.data, tipo, oggi)).length,
    st: serieGiorni(sessioni, perSettimana, oggi),
  };
  if (!dettagli) return d;
  const amrap = sessioni.filter(s => s.tipo === 'amrap').sort((a, b) => a.ts - b.ts).slice(-8);
  d.an = amrap.map(s => Math.round(giriEq(s) * 10) / 10);
  const giri = amrap.filter(s => giriEq(s) > 0).map(s => s.durata * 60 / giriEq(s));
  d.mg = giri.length ? Math.round(media(giri)) : null;
  const ult = test[test.length - 1], prec = test[test.length - 2];
  d.mi = prec ? miglioramento(prec.ris, ult.ris) : null;
  if (ult) {
    d.te = {}; d.tf = [];
    for (const p of PROVE) { d.te[p.id] = ult.ris[p.id] ? ult.ris[p.id].v : 0; if (ult.ris[p.id] && ult.ris[p.id].fac) d.tf.push(p.id); }
  }
  return d;
}
// I codici arrivano da fuori (WhatsApp): prima di usarli si tengono solo i campi previsti, del tipo e nei limiti previsti.
// Un codice scritto a mano o rovinato non può così portare testo o numeri strani nelle schermate. Restituisce null se manca id o nome.
const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : null);
export const periodoValido = p => !!p && (p.t === 'm' || p.t === 'w') && typeof p.k === 'string' && /^\d{4}-(W\d{2}|\d{2})$/.test(p.k);
export function normalizzaMembro(m) {
  if (!m || typeof m !== 'object') return null;
  const id = typeof m.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(m.id) ? m.id : null, n = typeof m.n === 'string' ? m.n.trim().slice(0, 24) : '';
  if (!id || !n) return null;
  const out = { v: 1, id, n, in: typeof m.in === 'string' && m.in.trim() ? m.in.trim().slice(0, 3) : iniziali(n), c: Number.isInteger(m.c) ? ((m.c % 6) + 6) % 6 : 0 };
  if (periodoValido(m.p)) out.p = { t: m.p.t, k: m.p.k };
  out.ts = num(m.ts, 0, 1e11) || 0;
  const sf = m.sf;
  out.sf = sf && typeof sf === 'object' && num(sf.g, 0, 999) != null ? { g: Math.round(sf.g), r: Math.round(num(sf.r, 0, 9999) || 0), rg: Math.round(num(sf.rg, 0, 9999) || 0), v: sf.v === 'f' ? 'f' : 'c' } : null;
  out.se = Math.round(num(m.se, 0, 999) || 0); out.st = Math.round(num(m.st, 0, 9999) || 0);
  if (Array.isArray(m.an)) out.an = m.an.map(x => num(x, 0, 99)).filter(x => x != null).slice(-8).map(x => Math.round(x * 10) / 10);
  if ('mg' in m) out.mg = num(m.mg, 1, 3600) == null ? null : Math.round(m.mg);
  if ('mi' in m) out.mi = num(m.mi, -100, 1000) == null ? null : Math.round(m.mi);
  if (m.te && typeof m.te === 'object') { out.te = {}; for (const p of PROVE) out.te[p.id] = Math.round(num(m.te[p.id], 0, 9999) || 0); out.tf = Array.isArray(m.tf) ? PROVE.map(p => p.id).filter(id2 => m.tf.includes(id2)) : []; }
  return out;
}
export const provaEq = (m, id) => m.te ? valoreEq(id, { v: m.te[id] || 0, fac: (m.tf || []).includes(id) }) : null;

// ───────────────────────── Classifica
export function unisci(esistenti, nuovi) {
  const out = { ...esistenti };
  for (const d of nuovi) if (d && d.id && (!out[d.id] || (out[d.id].ts || 0) <= (d.ts || 0))) out[d.id] = d;
  return out;
}
export const sfidaEq = m => m.sf ? m.sf.g + (m.sf.rg ? m.sf.r / m.sf.rg : 0) : null;
export function graduatorie(membri, quale, soloCompleta = false) {
  const val = { sfida: sfidaEq, miglioramento: m => m.mi == null ? null : m.mi, costanza: m => m.se == null ? null : m.se + (m.st || 0) / 1000 }[quale];
  let lista = membri.map(m => ({ m, v: val(m) }));
  if (quale === 'sfida' && soloCompleta) lista = lista.filter(x => !x.m.sf || x.m.sf.v === 'c');
  const con = lista.filter(x => x.v != null).sort((a, b) => b.v - a.v || (a.m.n < b.m.n ? -1 : 1));
  con.forEach((x, i) => { x.pos = i + 1; });
  return [...con, ...lista.filter(x => x.v == null).map(x => ({ ...x, pos: null }))];
}
export function momenti(membri) {
  const top = (f) => { const c = membri.filter(m => f(m) != null && f(m) > 0).sort((a, b) => f(b) - f(a))[0]; return c ? { m: c, v: f(c) } : null; };
  return { migliorato: top(m => m.mi), costante: top(m => m.se), record: top(sfidaEq), serie: top(m => m.st) };
}
export function mediaGruppo(membri) {
  const out = {};
  for (const p of PROVE) { const v = membri.map(m => provaEq(m, p.id)).filter(x => x != null); out[p.id] = v.length ? media(v) : null; }
  return out;
}
// Frasi del confronto, generate con regole sui dati. Mai giudizi sul corpo o sul peso.
export function frasiConfronto(io, lui) {
  const imparare = [], forte = [];
  const metti = (meglioLui, frase) => (meglioLui ? imparare : forte).push(frase);
  if (io.se != null && lui.se != null && Math.abs(io.se - lui.se) >= 2) metti(lui.se > io.se, { k: 'sessioni', n: Math.abs(io.se - lui.se) });
  let max = null;
  for (const p of PROVE) {
    const a = provaEq(io, p.id), b = provaEq(lui, p.id);
    if (a == null || b == null || (!a && !b)) continue;
    const d = (b - a) / Math.max(a, b, 1);
    if (Math.abs(d) >= 0.15 && (!max || Math.abs(d) > Math.abs(max.d))) max = { d, prova: p.id };
    if (Math.abs(d) >= 0.15) metti(d > 0, { k: 'prova', prova: p.id, n: Math.round(Math.abs(d) * 100) });
  }
  if (io.mg && lui.mg && Math.abs(io.mg - lui.mg) >= 10) metti(lui.mg < io.mg, { k: 'giro', n: Math.abs(io.mg - lui.mg) });
  if (io.st != null && lui.st != null && Math.abs(io.st - lui.st) >= 3) metti(lui.st > io.st, { k: 'serie', n: Math.abs(io.st - lui.st) });
  if (io.mi != null && lui.mi != null && Math.abs(io.mi - lui.mi) >= 5) metti(lui.mi > io.mi, { k: 'miglioramento', n: Math.abs(io.mi - lui.mi) });
  const ordina = l => l.sort((a, b) => (a.k === 'prova') - (b.k === 'prova') || b.n - a.n).slice(0, 3);
  return { imparare: ordina(imparare), forte: ordina(forte) };
}
