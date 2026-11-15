// Funzioni di utilità pure (usate anche dai test Node).
const p2 = n => String(n).padStart(2, '0');
export const isoData = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const daIso = s => { const [y, m, g] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, g, 12); };
export const piuGiorni = (iso, n) => { const d = daIso(iso); d.setDate(d.getDate() + n); return isoData(d); };
export const diffGiorni = (a, b) => Math.round((daIso(b) - daIso(a)) / 864e5);
export const giornoSett = iso => ((daIso(iso).getDay() + 6) % 7) + 1; // 1 = lunedì … 7 = domenica
export const lunedi = iso => piuGiorni(iso, 1 - giornoSett(iso));
export const meseISO = iso => iso.slice(0, 7);
export function settimanaISO(iso) {
  const d = daIso(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3); // giovedì della settimana
  const anno = d.getFullYear(), primo = new Date(anno, 0, 4, 12);
  const n = 1 + Math.round(((d - primo) / 864e5 - 3 + ((primo.getDay() + 6) % 7)) / 7);
  return `${anno}-W${p2(n)}`;
}
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const arrot5 = v => Math.round(v / 5) * 5;
export const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${p2(s % 60)}`; };
export const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export function uid(n = 10) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return [...a].map(b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}
let TAB = null;
export function crc32(dati) {
  if (typeof dati === 'string') dati = new TextEncoder().encode(dati);
  if (!TAB) { TAB = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TAB[i] = c >>> 0; } }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < dati.length; i++) c = TAB[(c ^ dati[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
export const crcHex = d => crc32(d).toString(16).padStart(8, '0');
export function b64url(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function daB64url(t) {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4));
  const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
// PRNG deterministico a partire da una stringa (usato per la sfida del mese).
export function prng(seme) {
  let h = 1779033703 ^ seme.length;
  for (let i = 0; i < seme.length; i++) { h = Math.imul(h ^ seme.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const copia = o => JSON.parse(JSON.stringify(o));
