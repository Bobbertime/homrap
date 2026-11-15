// Avvio dell'app: carica i dati, applica il tema, registra le schermate e il service worker.
import { S, carica } from './stato.js';
import { avvia, impostaGuardia } from './router.js';
import { t } from './i18n.js';
import { applicaTema } from './azioni.js';
import { eIOS, installata, chiediPersistenza, quandoInstallabile } from './piattaforma.js';
import { ico, esc } from './ui.js';
import './viste/onboarding.js';
import './viste/test.js';
import './viste/piano.js';
import './viste/oggi.js';
import './viste/allenamento.js';
import './viste/progressi.js';
import './viste/classifica.js';
import './viste/profilo.js';

function striscia(testo, bottone, alClick, id) {
  if (document.getElementById(id)) return;
  const el = document.createElement('div');
  el.className = 'striscia'; el.id = id; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="cresce">${esc(testo)}</span><button class="btn primario">${esc(bottone)}</button>`;
  el.querySelector('button').addEventListener('click', alClick);
  document.body.insertBefore(el, document.body.firstChild);
}
function serviceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let ricarica = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (ricarica) location.reload(); });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const avvisa = () => striscia(t('app.nuovaVersione'), t('app.ricarica'), () => { ricarica = true; if (reg.waiting) reg.waiting.postMessage('salta'); else location.reload(); }, 'striscia-versione');
    if (reg.waiting && navigator.serviceWorker.controller) avvisa();
    reg.addEventListener('updatefound', () => {
      const nuovo = reg.installing;
      if (nuovo) nuovo.addEventListener('statechange', () => { if (nuovo.state === 'installed' && navigator.serviceWorker.controller) avvisa(); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
async function avvio() {
  await carica();
  applicaTema();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', applicaTema);
  document.getElementById('nav').innerHTML = [['oggi', 'casa'], ['progressi', 'grafico'], ['classifica', 'coppa'], ['profilo', 'persona']]
    .map(([nome, icona]) => `<a href="#/${nome}">${ico(icona)}${t('nav.' + nome)}</a>`).join('');
  document.getElementById('nav').setAttribute('aria-label', t('nav.aria'));
  impostaGuardia(nome => (!S.stato.onboarding && !['benvenuto', 'installa', 'onboarding'].includes(nome) ? 'benvenuto' : null));
  // Su iOS, in Safari senza installazione, i dati possono essere cancellati dopo 7 giorni di inattività: avviso fisso.
  if (eIOS && !installata()) striscia(t('app.avvisoIOS'), t('app.comeInstallare'), () => { location.hash = '#/installa'; }, 'striscia-ios');
  if (S.stato.onboarding) chiediPersistenza();
  window.addEventListener('appinstalled', chiediPersistenza);
  quandoInstallabile(() => { const b = document.getElementById('btn-installa'); if (b) b.hidden = false; });
  if (S.attivo && ['amrap', 'fine'].includes(S.attivo.fase)) location.hash = '#/allenamento/' + S.attivo.cosa;  // riprende un allenamento interrotto
  avvia();
  serviceWorker();
}
avvio();
