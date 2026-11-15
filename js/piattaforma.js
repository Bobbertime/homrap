// Riconoscimento della piattaforma e installazione come app.
const ua = navigator.userAgent || '';
export const eIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const eAndroid = /android/i.test(ua);
export const installata = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

let invito = null;
const ascoltatori = [];
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); invito = ev; ascoltatori.forEach(f => f()); });
export const puoInstallare = () => !!invito;
export const quandoInstallabile = f => ascoltatori.push(f);
export async function installa() {
  if (!invito) return false;
  invito.prompt();
  const scelta = await invito.userChoice.catch(() => null);
  invito = null;
  return !!scelta && scelta.outcome === 'accepted';
}
export async function chiediPersistenza() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* non disponibile */ }
}
