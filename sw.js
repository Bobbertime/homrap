// Service worker: mette in cache l'app al primo avvio, così dopo funziona offline.
// IMPORTANTE: a ogni modifica dei file cambia VERSIONE, altrimenti i telefoni continuano a usare la copia vecchia.
const VERSIONE = 'homrap-1.0.1';
const CACHE_FONT = 'homrap-font-1';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
const FILE = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/router.js', './js/ui.js', './js/util.js', './js/db.js', './js/stato.js', './js/i18n.js', './js/audio.js',
  './js/logica.js', './js/classifica.js', './js/orologi.js', './js/backup.js', './js/azioni.js', './js/piattaforma.js', './js/immagini.js', './js/demo.js',
  './js/viste/onboarding.js', './js/viste/test.js', './js/viste/piano.js', './js/viste/oggi.js', './js/viste/allenamento.js',
  './js/viste/progressi.js', './js/viste/classifica.js', './js/viste/profilo.js',
  './data/esercizi.js', './data/attrezzi.js', './data/soglie-test.js', './i18n/it.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
];

// I font Google: si prova a salvarli subito (solo i caratteri latini), ma senza far fallire l'installazione.
async function salvaFont() {
  try {
    const cache = await caches.open(CACHE_FONT), r = await fetch(FONT_CSS);
    if (!r.ok) return;
    const css = await r.clone().text();
    await cache.put(FONT_CSS, r);
    const url = [...css.matchAll(/\/\* (latin|latin-ext) \*\/[^}]*?url\((https:[^)]+)\)/g)].map(m => m[2]);
    await Promise.all([...new Set(url)].map(u => cache.add(u).catch(() => {})));
  } catch (e) { /* offline o bloccato: restano i font di sistema */ }
}
self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => { salvaFont(); }));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(nomi => Promise.all(nomi.filter(n => n !== VERSIONE && n !== CACHE_FONT).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', ev => { if (ev.data === 'salta') self.skipWaiting(); });
self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {   // font: cache al primo uso
    ev.respondWith(caches.open(CACHE_FONT).then(async cache => {
      const salvato = await cache.match(req.url);
      if (salvato) return salvato;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') cache.put(req.url, r.clone()); return r; }
      catch (e) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;    // nessun'altra chiamata di rete
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(salvato => salvato || fetch(req).catch(() => caches.match('./index.html'))));
});
