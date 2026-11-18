// Prova delle schermate in un browser vero, a 390 px, tema scuro e chiaro. È facoltativa: l'app non ne ha bisogno.
//
//   npm install --no-save playwright      (una volta sola; scarica anche il browser con: npx playwright install chromium)
//   node tests/schermate.mjs              (aggiungi --foto per salvare le schermate in tests/foto/)
//
// Variabili utili: CHROME=/percorso/di/chrome per usare un Chrome già installato; MODULI=/cartella/node_modules se Playwright è altrove.
// Lo script avvia da solo un piccolo server sulla cartella del progetto, carica i dati di esempio (demo) e controlla che ogni
// schermata si apra senza errori e senza scorrimento orizzontale, più i percorsi principali: report, ritorno indietro,
// figure animate, ripetizioni scritte a mano nel test, ricominciare da zero (test, riscaldamento, AMRAP), timer dell'esercizio a tempo, «?» con figura e consigli, cambio di posizione nel riscaldamento, lingua, import di un file dell'orologio, correzione ed eliminazione di una sessione.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..'), foto = process.argv.includes('--foto');
const require = createRequire(process.env.MODULI ? join(process.env.MODULI, 'x.js') : import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.log('Serve Playwright:  npm install --no-save playwright  e poi  npx playwright install chromium'); process.exit(2); }

const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const percorso = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const dati = await readFile(join(radice, percorso)); res.writeHead(200, { 'content-type': TIPI[extname(percorso)] || 'application/octet-stream' }); res.end(dati); }
  catch { res.writeHead(404); res.end('non trovato'); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}/`;

let ko = 0, ok = 0;
const esito = (nome, vero, extra = '') => { if (vero) { ok++; console.log('  ✓ ' + nome); } else { ko++; console.log('  ✗ ' + nome + (extra ? '  → ' + extra : '')); } };
const PROFILO = { nome: 'Prova', eta: 40, sesso: null, altezza: '', peso: '', obiettivi: ['salute'], esperienza: 'regolare', infortuni: [], zoneMeno: [], giorni: 3, giorniSett: [1, 3, 5], durata: 20, sicurezza: { risposte: Array(7).fill(false), gravidanza: null, conferma: false, cauto: false } };

// Un file TCX di 20 minuti, vecchio di due mesi: nessuna sessione dell'app a quell'ora, quindi nasce un allenamento dall'orologio.
function fileTCX() {
  const t0 = Date.now() - 60 * 864e5, iso = s => new Date(t0 + s * 1000).toISOString(), lap = [[0, 290, 132], [290, 300, 144], [590, 310, 148], [900, 300, 150]];
  const punti = (da, sec, bpm) => Array.from({ length: Math.floor(sec / 5) }, (_, i) => `<Trackpoint><Time>${iso(da + i * 5)}</Time><HeartRateBpm><Value>${bpm + (i % 3)}</Value></HeartRateBpm></Trackpoint>`).join('');
  return `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Other">${lap.map(([da, sec, bpm]) => `<Lap StartTime="${iso(da)}"><TotalTimeSeconds>${sec}</TotalTimeSeconds><Calories>40</Calories><AverageHeartRateBpm><Value>${bpm}</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>${bpm + 12}</Value></MaximumHeartRateBpm><Track>${punti(da, sec, bpm)}</Track></Lap>`).join('')}</Activity></Activities></TrainingCenterDatabase>`;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const cartella = join(tmpdir(), 'homrap-prova-' + Date.now()); await mkdir(cartella, { recursive: true });
const tcx = join(cartella, 'prova.tcx'); await writeFile(tcx, fileTCX());
if (foto) await mkdir(join(radice, 'tests', 'foto'), { recursive: true });

for (const tema of ['dark', 'light']) {
  console.log(`\nTema ${tema === 'dark' ? 'scuro' : 'chiaro'}, 390 px`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema, serviceWorkers: 'block', locale: 'it-IT' });
  const page = await ctx.newPage(), errori = [], esterne = [];
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  page.on('pageerror', e => errori.push(e.message));
  page.on('request', r => { if (!r.url().startsWith(BASE)) esterne.push(r.url()); });
  const pausa = ms => page.waitForTimeout(ms), hash = () => page.evaluate(() => location.hash), Y = () => page.evaluate(() => Math.round(scrollY));
  const vai = async rotta => { await page.goto(BASE + '#/' + rotta); await pausa(250); };
  const stato = f => page.evaluate(`import('/js/stato.js').then(({ S }) => (${f})(S))`);

  // Primo avvio: profilo già compilato, poi dati di esempio
  await page.goto(BASE); await page.waitForSelector('a[href="#/installa"]'); await pausa(200);
  await page.evaluate(p => new Promise(fatto => { const r = indexedDB.open('homrap', 1); r.onsuccess = () => { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put({ onboarding: true, installVisto: true }, 'stato'); t.objectStore('kv').put(p, 'profilo'); t.oncomplete = fatto; }; }), PROFILO);
  await page.reload(); await pausa(400); await vai('oggi');
  await page.click('[data-a="demo"]'); await pausa(3000);     // si aspetta che sparisca l'avviso a comparsa
  const idUltima = await stato(S => S.sessioni.filter(s => s.tipo === 'amrap' && s.orologio).pop().id);

  // Ogni schermata si apre, senza errori e senza scorrimento orizzontale
  for (const rotta of ['oggi', 'progressi', 'classifica', 'profilo', 'libreria', 'esercizio/squat', 'esercizio/lento_avanti_un_braccio', 'comprare', 'orologi', 'sicurezza', 'piano/vedi', 'report/' + idUltima, 'modifica/chi', 'modifica/attrezzatura', 'test/mensile', 'installa']) {
    await vai(rotta);
    const largo = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), vuota = (await page.locator('#app main').innerText()).trim().length < 20;
    esito(`#/${rotta}`, largo <= 0 && !vuota && (await hash()) === '#/' + rotta, `fuori di ${largo}px, vuota: ${vuota}, hash ${await hash()}`);
    if (foto) await page.screenshot({ path: join(radice, 'tests', 'foto', `${tema}-${rotta.replace(/\W+/g, '-')}.png`), fullPage: true });
  }

  // Report da una barra di Progressi, e ritorno nel punto di prima
  await vai('progressi'); await page.evaluate(() => scrollTo(0, 300)); const y0 = await Y();
  await page.click('.barre button:last-child'); await pausa(250);
  esito('la barra apre il report dall\'alto', (await hash()).startsWith('#/report/') && (await Y()) === 0);
  await page.click('[data-a="indietro"]'); await pausa(250);
  esito('indietro torna a Progressi dov\'era', (await hash()) === '#/progressi' && Math.abs((await Y()) - y0) <= 40, `y ${await Y()}, atteso ${y0}`);
  await vai('report/' + idUltima);
  esito('il report con l\'orologio ha curva, giri, zone e lettura', (await page.locator('svg.grafico').count()) >= 2 && (await page.locator('.zone > div').count()) === 5 && (await page.locator('.punti li').count()) >= 2);

  // Figure animate: scheda dell'esercizio e test
  await vai('esercizio/squat');
  esito('la scheda dello squat ha la figura animata', (await page.locator('.figura svg animate').count()) >= 5 && (await page.locator('.figura').evaluate(el => el.getBoundingClientRect().height)) > 80);
  await page.click('[data-a="figura"]'); await pausa(100);
  esito('un tocco ferma la figura, un altro la fa ripartire', (await page.evaluate(() => document.querySelector('.figura svg').animationsPaused())) && (await page.getAttribute('.figura', 'aria-pressed')) === 'true'
    && (await page.click('[data-a="figura"]'), !(await page.evaluate(() => document.querySelector('.figura svg').animationsPaused()))));
  await vai('esercizio/squat_cosacco');
  esito('un esercizio senza figura si apre lo stesso', (await page.locator('.figura').count()) === 0 && (await page.locator('.sagoma').count()) === 1);
  await vai('test/mensile'); await page.click('[data-a="inizia"]'); await pausa(250);
  esito('nel test la prova mostra la figura', (await page.locator('.figura svg animate').count()) >= 5 && (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await page.click('[data-a="via"]'); await pausa(3400); await page.click('[data-a="piu"]'); await page.click('[data-a="piu"]');
  await page.click('[data-a="ricomincia"]'); await pausa(200); await page.click('.foglio [data-a="ok"]'); await pausa(300);
  esito('una prova del test si può ricominciare da zero', (await page.locator('[data-a="via"]').count()) === 1 && (await page.locator('#t-conta').count()) === 0 && (await page.locator('#t-tempo').innerText()) === '1:00');
  await page.click('[data-a="via"]'); await pausa(3400); await page.click('[data-a="piu"]');
  await page.evaluate(() => { const vero = Date.now; Date.now = () => vero() + 61000; }); await pausa(500);   // salta alla fine del minuto
  await page.fill('#t-conta', '30'); await page.click('[data-a="piu"]');
  esito('a tempo scaduto le ripetizioni si possono scrivere', (await page.inputValue('#t-conta')) === '31');
  await page.click('[data-a="conferma"]'); await pausa(300);
  esito('nel recupero si vede la figura della prova successiva', (await page.locator('.card .figura svg animate').count()) >= 5);
  await page.evaluate(() => location.reload()); await pausa(500);   // rimette a posto l'orologio e abbandona il test
  await page.goto(BASE + 'tests/figure.html'); await pausa(600);
  esito('la pagina di anteprima mostra tutte le figure', (await page.locator('.figura svg').count()) >= 38 && (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await page.goto(BASE + 'tests/figure.html?id=bird_dog'); await pausa(400);
  esito('anteprima di una figura sola, con i fotogrammi', (await page.locator('.quadri svg').count()) === 8);
  await vai('oggi');

  // Allenamento: ricominciare un passo del riscaldamento, timer dell'esercizio a tempo, «Ricomincia da zero», «+1 GIRO» sempre in vista
  await vai('allenamento/giorno'); await page.click('[data-a="riscaldamento"]'); await pausa(2300);
  const passo = await page.locator('#g-tempo').innerText(); await page.click('[data-a="ricominciaPasso"]'); await pausa(150);
  esito('un passo del riscaldamento si può ricominciare', passo !== '1:00' && (await page.locator('#g-tempo').innerText()) === '1:00', `${passo} → ${await page.locator('#g-tempo').innerText()}`);
  await page.click('[data-a="avantiGuida"]'); await pausa(200);
  esito('tra un passo e l\'altro del riscaldamento ci sono 10 secondi per cambiare posizione', ['0:10', '0:09'].includes(await page.locator('#g-tempo').innerText()) && (await page.locator('main').innerText()).includes('Cambia posizione') && (await page.locator('main .figura-svg').count()) === 1);
  await page.click('main [data-a="aiuto"]'); await pausa(200);
  esito('il «?» del cambio di posizione apre la scheda del passo dopo', (await page.locator('.foglio h2').innerText()) === 'Cat-cow');
  await page.click('.foglio [data-a="chiudi"]'); await pausa(150); await page.click('[data-a="avantiGuida"]'); await pausa(200);
  esito('«Sono pronto» fa partire subito il passo, con il suo tempo pieno', (await page.locator('#g-tempo').innerText()) === '0:45');
  await vai('oggi'); await vai('allenamento/giorno'); await page.click('[data-a="salta"]'); await pausa(3700);
  await page.click('[data-a="giro"]'); await pausa(150);
  for (let i = 0; i < 5 && !(await page.locator('[data-a="crono"]').count()); i++) { await page.click('[data-a="esercizio"]'); await pausa(150); }
  esito('l\'esercizio a tempo ha il suo timer', (await page.locator('#a-crono').count()) === 1 && (await page.locator('#a-crono').innerText()) === '0:30');
  await page.click('.es-carta .aiuto'); await pausa(250);
  esito('il «?» apre figura e consigli senza lasciare l\'allenamento', (await page.locator('.foglio h2').innerText()) === 'Plank' && (await page.locator('.foglio .figura-svg').count()) === 1 && (await page.locator('.foglio .punti li').count()) >= 5 && (await hash()) === '#/allenamento/giorno');
  await page.click('.foglio [data-a="chiudi"]'); await pausa(200);
  esito('chiuso il foglio si resta sullo stesso esercizio', (await page.locator('.foglio').count()) === 0 && (await page.locator('#a-crono').count()) === 1);
  const sotto = async () => { const r = []; for (const h of [667, 844]) { await page.setViewportSize({ width: 390, height: h }); await pausa(120); r.push(await page.evaluate(() => { const g = document.querySelector('.piu-giro').getBoundingClientRect(); return g.bottom <= innerHeight + 1 && g.height >= 90; })); } await page.setViewportSize({ width: 390, height: 844 }); return r.every(Boolean); };
  esito('«+1 GIRO» resta intero sullo schermo anche a 667 px, con il timer dell\'esercizio', await sotto());
  await page.click('[data-a="crono"]'); await pausa(2300); const corso = await page.locator('#a-crono').innerText();
  await page.click('[data-a="crono"]'); await pausa(300);
  esito('«Da capo» fa ripartire da zero il timer dell\'esercizio', ['0:28', '0:27'].includes(corso) && (await page.locator('#a-crono').innerText()) === '0:30', `${corso} → ${await page.locator('#a-crono').innerText()}`);
  await page.click('[data-a="pausa"]'); await pausa(150); await page.click('[data-a="ricomincia"]'); await pausa(200); await page.click('.foglio [data-a="ok"]'); await pausa(3700);
  const pieno = await stato(S => S.attivo.durata * 60), letto = await page.locator('#a-tempo').innerText(), [mm, ss] = letto.split(':').map(Number);
  esito('in pausa si ricomincia da zero: tempo pieno e giri azzerati', (await page.locator('#a-giro').innerText()) === '1' && pieno - (mm * 60 + ss) <= 1, `giro ${await page.locator('#a-giro').innerText()}, tempo ${letto}`);
  await page.click('[data-a="esci"]'); await pausa(200);
  esito('«Ricomincia da zero» anche dal foglio di uscita', (await page.locator('.foglio [data-a="ricomincia"]').count()) === 1);
  await page.click('.foglio [data-a="scarta"]'); await pausa(300);

  // Testo dell'interfaccia non selezionabile, campi sì
  await vai('modifica/chi');
  esito('il testo non si seleziona, i campi sì', await page.evaluate(() => getComputedStyle(document.querySelector('h1')).userSelect === 'none' && getComputedStyle(document.querySelector('input')).userSelect === 'text'));

  // Lingua
  await vai('profilo'); await page.click('[data-a="lingua"][data-v="en"]'); await pausa(250);
  esito('inglese dal Profilo', (await page.locator('#nav a[href="#/oggi"]').innerText()) === 'Today');
  await page.click('[data-a="lingua"][data-v="it"]'); await pausa(250);
  esito('ritorno all\'italiano', (await page.locator('#nav a[href="#/oggi"]').innerText()) === 'Oggi');

  // Allenamento fatto solo con l'orologio: import, report, scheda in Progressi
  await vai('orologi'); await page.setInputFiles('input[data-c="file"]', tcx); await pausa(400);
  if (await page.locator('.foglio [data-a="crea"]').count()) { await page.click('.foglio [data-a="crea"]'); await pausa(250); }
  await page.fill('.foglio [data-k="nome"]', 'Circuito di prova'); await page.click('.foglio [data-a="ok"]'); await pausa(400);
  const idOro = await stato(S => (S.sessioni.find(s => s.tipo === 'orologio') || {}).id);
  esito('file dell\'orologio → allenamento e report', !!idOro && (await hash()) === '#/report/' + idOro);
  esito('battiti per giro nel report', (await page.locator('.stat', { hasText: 'Battiti per giro' }).count()) === 1);
  await vai('progressi'); await page.click('.seg button:has-text("Orologio")'); await pausa(250);
  esito('scheda Orologio con «A parità di circuito»', (await page.locator('.card', { hasText: 'A parità di circuito' }).count()) === 1);

  // Correggere ed eliminare una sessione
  await vai('report/' + idOro); await page.click('[data-a="correggi"]'); await pausa(200);
  await page.fill('.foglio [data-k="note"]', 'Nota di prova'); await page.click('.foglio [data-a="ok"]'); await pausa(300);
  esito('correzione salvata e nota visibile', (await page.locator('.card', { hasText: 'Nota di prova' }).count()) === 1);
  const prima = await stato(S => S.sessioni.length);
  await page.click('[data-a="elimina"]'); await pausa(200); await page.click('.foglio [data-a="ok"]'); await pausa(400);
  esito('sessione eliminata', (await stato(S => S.sessioni.length)) === prima - 1);

  esito('nessun errore in console', errori.length === 0, errori.slice(0, 3).join(' | '));
  esito('nessuna richiesta fuori dall\'app', esterne.length === 0, esterne.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); server.close(); await rm(cartella, { recursive: true, force: true });
console.log(`\n${ok} controlli superati, ${ko} falliti`);
process.exit(ko ? 1 : 0);
