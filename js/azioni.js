// Operazioni condivise tra più schermate: fastidi sugli esercizi, backup, tema.
import { S, salva, contesto, backupCorrente, oggi } from './stato.js';
import { scegli, sostituisci } from './logica.js';
import { PER_ID } from '../data/esercizi.js';
import { condividiFile, ico } from './ui.js';
import { t, impostaLingua, lingua } from './i18n.js';

function rimpiazza(id, con) {
  if (!S.piano) return;
  const ctx = contesto();
  S.piano.giorni.forEach((g, gi) => g.esercizi.forEach((x, i) => {
    if (x.id !== id) return;
    const usati = g.esercizi.map(y => y.id);
    sostituisci(S.piano, gi, i, con && !usati.includes(con) ? con : scegli(PER_ID[id].schema, ctx, usati).id, ctx);
  }));
}
// scelta: 'tieni' | 'escludi' | id di un'alternativa | null (decide più tardi: l'esercizio resta sospeso)
export async function risolviFastidio(id, scelta) {
  const E = S.esercizi;
  E.daDecidere = E.daDecidere.filter(x => x !== id);
  if (scelta == null) E.daDecidere.push(id);
  else if (scelta === 'escludi') { if (!E.scartati.includes(id)) E.scartati.push(id); rimpiazza(id, null); }
  else if (scelta !== 'tieni') { E.sostituzioni[id] = scelta; rimpiazza(id, scelta); }
  await salva('esercizi', 'piano');
}
export async function riammetti(id) {
  S.esercizi.scartati = S.esercizi.scartati.filter(x => x !== id);
  await salva('esercizi');
}
export async function salvaBackup() {
  const blob = new Blob([JSON.stringify(backupCorrente())], { type: 'application/json' });
  const esito = await condividiFile(blob, `homrap-backup-${oggi()}.json`);
  if (esito === 'annullato') return false;
  S.backup.ultimo = Date.now(); S.backup.daRicordare = false;
  await salva('backup');
  return true;
}
// Lingua scelta nel Profilo: testi, formato di date e numeri, voce. Ridisegna anche la barra in basso.
export function applicaLingua() {
  impostaLingua(S.preferenze.lingua || 'it');
  document.documentElement.lang = lingua();
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = [['oggi', 'casa'], ['progressi', 'grafico'], ['classifica', 'coppa'], ['profilo', 'persona']].map(([nome, icona]) => `<a href="#/${nome}">${ico(icona)}${t('nav.' + nome)}</a>`).join('');
  nav.setAttribute('aria-label', t('nav.aria'));
}
// Tema e lingua si applicano insieme: viene chiamata all'avvio e dopo ogni ripristino, demo o cancellazione dei dati.
export function applicaTema() {
  applicaLingua();
  const scelto = S.preferenze.tema || 'auto';
  const chiaro = scelto === 'chiaro' || (scelto === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.tema = chiaro ? 'chiaro' : 'scuro';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = chiaro ? '#FBF7F2' : '#121214';
}
