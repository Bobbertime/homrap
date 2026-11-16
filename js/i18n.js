// Traduzioni: tutte le stringhe stanno in i18n/<lingua>.js. Per aggiungere una lingua vedi il README.
import { IT } from '../i18n/it.js';
import { EN } from '../i18n/en.js';

export const LINGUE = { it: IT, en: EN };
const LOCALI = { it: 'it-IT', en: 'en-GB' };     // formato di date e numeri, e voce degli avvisi
let codice = 'it', corrente = LINGUE.it;
export function impostaLingua(c) { codice = LINGUE[c] ? c : 'it'; corrente = LINGUE[codice]; }
export const lingua = () => codice;
export const locale = () => LOCALI[codice];

// t('oggi.ciao', { nome: 'Ada' }) → cerca la chiave puntata e sostituisce {nome}.
export function t(chiave, par) {
  let v = corrente;
  for (const p of chiave.split('.')) { v = v == null ? v : v[p]; }
  if (v == null) { v = LINGUE.it; for (const p of chiave.split('.')) v = v == null ? v : v[p]; }
  if (v == null) return chiave;
  if (typeof v !== 'string' || !par) return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (par[k] != null ? par[k] : m));
}
// Plurale: la stringa è "uno|molti" (es. "{n} giro|{n} giri").
export function tn(chiave, n, par) {
  const forme = String(t(chiave)).split('|');
  return (n === 1 ? forme[0] : forme[1] || forme[0]).replace(/\{(\w+)\}/g, (m, k) => (k === 'n' ? n : par && par[k] != null ? par[k] : m));
}
export const nomeEsercizio = id => t('esercizi.' + id + '.nome');
