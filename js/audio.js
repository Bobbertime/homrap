// Voce, bip, vibrazione e schermo sempre acceso. Ognuno dei tre avvisi si può disattivare dalle preferenze.
import { S } from './stato.js';

let ctx = null, blocco = null, vuoleAcceso = false;

// Da chiamare dentro un tocco dell'utente: i browser sbloccano audio e voce solo così.
export function sbloccaAudio() {
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if ('speechSynthesis' in window && S.preferenze.voce) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }
  } catch { /* nessun audio disponibile */ }
}
export function bip(freq = 880, durata = 0.14, volume = 0.25) {
  if (!S.preferenze.suoni || !ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + durata + 0.02);
  } catch { /* ignora */ }
}
export function parla(testo) {
  if (!S.preferenze.voce || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(testo);
    u.lang = 'it-IT';
    const voce = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('it'));
    if (voce) u.voice = voce;
    u.rate = 1.05;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* ignora */ }
}
export function vibra(schema = 60) {
  if (S.preferenze.vibrazione && navigator.vibrate) { try { navigator.vibrate(schema); } catch { /* ignora */ } }
}
async function acquisisci() {
  if (!vuoleAcceso || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { blocco = await navigator.wakeLock.request('screen'); } catch { blocco = null; }
}
export function schermoAcceso(si) {
  vuoleAcceso = si;
  if (si) acquisisci();
  else if (blocco) { blocco.release().catch(() => {}); blocco = null; }
}
document.addEventListener('visibilitychange', acquisisci); // il blocco si perde quando l'app va in secondo piano
