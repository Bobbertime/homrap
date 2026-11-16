// Service worker: mette in cache l'app al primo avvio, così dopo funziona offline.
// IMPORTANTE: a ogni modifica dei file cambia VERSIONE, altrimenti i telefoni continuano a usare la copia vecchia.
const VERSIONE = 'homrap-1.0.7';
const FILE = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/router.js', './js/ui.js', './js/util.js', './js/db.js', './js/stato.js', './js/i18n.js', './js/audio.js',
  './js/logica.js', './js/analisi.js', './js/classifica.js', './js/orologi.js', './js/backup.js', './js/azioni.js', './js/piattaforma.js', './js/immagini.js', './js/demo.js', './js/figure.js',
  './js/viste/onboarding.js', './js/viste/test.js', './js/viste/piano.js', './js/viste/oggi.js', './js/viste/allenamento.js',
  './js/viste/progressi.js', './js/viste/report.js', './js/viste/classifica.js', './js/viste/profilo.js',
  './data/esercizi.js', './data/attrezzi.js', './data/soglie-test.js', './i18n/it.js', './i18n/en.js',
  './fonts/plus-jakarta-sans-latin-wght-normal.woff2', './fonts/barlow-condensed-latin-600-normal.woff2', './fonts/barlow-condensed-latin-700-normal.woff2', './fonts/barlow-condensed-latin-800-normal.woff2',
  './fonts/LICENZA-Plus-Jakarta-Sans.txt', './fonts/LICENZA-Barlow-Condensed.txt',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(nomi => Promise.all(nomi.filter(n => n !== VERSIONE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', ev => { if (ev.data === 'salta') self.skipWaiting(); });
self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;    // nessun'altra chiamata di rete
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(salvato => salvato || fetch(req).catch(() => caches.match('./index.html'))));
});
