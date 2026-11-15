# HoMRAP

**House Many Rounds As Possible** – "Quanti giri hai?"

Web app installabile (PWA) per allenamenti AMRAP a casa: in 10, 15 o 20 minuti fai più giri possibili di un circuito di 5 esercizi. Un test pratico misura il livello, l'app propone il piano e mostra i progressi. Non c'è server, non ci sono account: i dati restano sul telefono.

È fatta di soli file HTML, CSS e JavaScript: non c'è niente da compilare. Si pubblica così com'è.

---

## 1. Pubblicarla su GitHub Pages, passo per passo

Serve solo un account GitHub gratuito. Bastano 10 minuti e si fa tutto dal browser.

1. Vai su <https://github.com> ed entra (o crea l'account con "Sign up").
2. In alto a destra tocca **+** → **New repository**.
3. In "Repository name" scrivi `homrap`. Lascia **Public**. Non spuntare altro. Tocca **Create repository**.
4. Nella pagina che compare tocca il link **uploading an existing file**.
5. Sul computer apri la cartella `homrap` (quella estratta da `homrap.zip`), seleziona **tutto il contenuto** (i file e le cartelle `css`, `js`, `data`, `i18n`, `icons`, `tests`) e trascinalo nella pagina. Attenzione: va trascinato il contenuto, non la cartella `homrap` stessa: `index.html` deve finire al primo livello del repository.
6. Aspetta la fine del caricamento e tocca **Commit changes**.
7. Vai in **Settings** (in alto) → **Pages** (a sinistra).
8. In "Build and deployment", alla voce **Source** scegli **Deploy from a branch**. Sotto, in **Branch**, scegli `main` e `/ (root)`, poi **Save**.
9. Aspetta un paio di minuti e ricarica la pagina: in alto compare l'indirizzo, del tipo `https://TUONOME.github.io/homrap/`.
10. Apri quell'indirizzo sul telefono e segui la schermata "Installa l'app". Manda lo stesso indirizzo agli amici.

Il file vuoto `.nojekyll` dice a GitHub di pubblicare i file così come sono: lascialo dov'è (se dal trascinamento non viene caricato perché è nascosto, non succede nulla di grave).

### Quando modifichi qualcosa

Dopo ogni modifica ai file, apri `sw.js` e cambia la riga

```js
const VERSIONE = 'homrap-1.0.0';
```

per esempio in `homrap-1.0.1`. Senza questo passaggio i telefoni continuano a usare la copia vecchia. Con la versione nuova, alla riapertura l'app mostra "Nuova versione disponibile" con il pulsante **Ricarica**. Se aggiungi un file nuovo, aggiungilo anche all'elenco `FILE` in `sw.js` (c'è un test che lo controlla).

### Provarla sul computer

I moduli JavaScript non funzionano aprendo `index.html` con un doppio clic: serve un piccolo server locale. Dalla cartella del progetto:

```
python3 -m http.server 8000
```

e poi apri <http://localhost:8000>.

---

## 2. Struttura dei file

```
index.html              pagina unica dell'app
manifest.webmanifest    nome, icone e colori per l'installazione
sw.js                   service worker: cache per l'uso offline e avviso di nuova versione
css/app.css             tutto lo stile (tema scuro e chiaro)
icons/                  icone 192 e 512 (anche maskable) e apple-touch-icon 180

data/esercizi.js        libreria esercizi (numeri e regole, senza testi)
data/attrezzi.js        inventario degli attrezzi e fasce di prezzo
data/soglie-test.js     prove del test e soglie dei livelli, per età e sesso
i18n/it.js              tutte le stringhe in italiano

js/app.js               avvio
js/router.js            navigazione a hash (#/oggi, #/progressi …)
js/stato.js             stato in memoria e salvataggio
js/db.js                piccolo wrapper su IndexedDB
js/backup.js            backup, checksum, versione dello schema e migrazioni
js/logica.js            logica di allenamento: livelli, scelta esercizi, ripetizioni, piano, progressione, acquisti
js/classifica.js        sfida del mese, codici personali e di gruppo, classifiche, frasi del confronto
js/orologi.js           decoder FIT scritto a mano, lettura di TCX e GPX
js/immagini.js          immagini 1080×1920 da condividere (canvas)
js/audio.js             voce, bip, vibrazione, schermo sempre acceso
js/piattaforma.js       riconoscimento iOS/Android e installazione
js/azioni.js            operazioni comuni a più schermate
js/ui.js                icone SVG, fogli, grafici, sagoma dei muscoli, condivisione
js/demo.js              modalità demo
js/util.js              date, CRC32, base64url, generatore casuale con seme
js/viste/               una schermata per file: onboarding, test, piano, oggi, allenamento, progressi, classifica, profilo

tests/run.mjs           test automatici della logica
```

`logica.js`, `classifica.js`, `orologi.js`, `backup.js` e `util.js` sono moduli "puri": non toccano né la pagina né l'archivio, quindi si provano con Node.

### Test automatici

```
node tests/run.mjs
```

Serve Node 18 o successivo. Sono 70 test: ripetizioni e obiettivo di giri, scelta degli esercizi con i vincoli di attrezzi e infortuni, progressione, codici personali e di gruppo (andata e ritorno, CRC errato rifiutato), sfida del mese identica per lo stesso mese, decoder FIT con un file generato apposta, backup e ripristino, coerenza della libreria e delle traduzioni.

---

## 3. Come aggiungere esercizi, animazioni e lingue

### Un esercizio

1. In `data/esercizi.js` copia una riga simile e cambia i valori. In cima al file c'è la spiegazione di ogni campo. I più importanti:
   - `id`: nome unico, senza spazi;
   - `schema`: `spinta`, `trazione`, `gambe`, `posteriore`, `core`, `cond` o `mobilita`;
   - `liv`: difficoltà da 1 a 5;
   - `att`: attrezzi richiesti (`[]` = corpo libero);
   - `rif` e `k`: la prova del test di riferimento e il rapporto con quella prova (per esempio `k: 1.6` = se ne fanno il 60% in più rispetto ai piegamenti normali);
   - `eff`: efficacia da 1 a 5 per dimagrire, forza, resistenza, mobilità, salute, atletico, in quest'ordine;
   - `stress`: zone caricate (con 2 o 3 l'esercizio viene escluso a chi ha quella zona infortunata);
   - `fac` e `dif`: id della variante più facile e più difficile. Ricordati di aggiornare anche i vicini, così la catena resta collegata.
2. In `i18n/it.js`, sotto `esercizi`, aggiungi i testi con lo stesso `id`: `nome`, 3 `consigli`, 2 `errori`, `respiro`.
3. Lancia `node tests/run.mjs`: controlla che non manchi niente.
4. Cambia `VERSIONE` in `sw.js`.

La logica non va toccata: l'esercizio entra da solo nella scelta, nelle alternative e nella libreria.

### Un'animazione

Metti il file (GIF, WebP o SVG animato) in una cartella, per esempio `anim/squat.webp`, aggiungi all'esercizio il campo `anim: 'anim/squat.webp'` e il percorso all'elenco `FILE` di `sw.js`. Se il campo c'è, la scheda dell'esercizio mostra l'animazione sopra la sagoma dei muscoli.

### Una lingua

1. Copia `i18n/it.js` in `i18n/en.js`, rinomina `IT` in `EN` e traduci i valori. Le chiavi restano uguali. I plurali sono scritti `"singolare|plurale"`.
2. In `js/i18n.js` importa il file e aggiungilo a `LINGUE`: `const LINGUE = { it: IT, en: EN };`.
3. Chiama `impostaLingua('en')` all'avvio (in `js/app.js`), oppure aggiungi una scelta nel Profilo.
4. Aggiungi `./i18n/en.js` all'elenco `FILE` di `sw.js`.

Le chiavi mancanti ricadono sull'italiano.

### Soglie del test

`data/soglie-test.js` è pensato per essere modificato a mano: ogni riga ha 4 numeri, il minimo per i livelli 2, 3, 4 e 5.

---

## 4. Come funziona la classifica tra amici

Non c'è un server: i risultati viaggiano su WhatsApp come codici di testo.

**Ogni amico**

1. Apre **Classifica** → **Condividi i miei risultati**.
2. Vede cosa contiene il codice. Con "Includi dettagli" spento, il codice contiene solo punteggio della sfida, sessioni e serie.
3. Tocca **Invia il codice** e lo manda nel gruppo. Il codice inizia con `HOMRAP1.`

**Il gestore** (una persona sola del gruppo)

1. Copia da WhatsApp i messaggi con i codici, anche tutti insieme, anche con nomi e orari in mezzo.
2. In **Classifica** → **Incolla codici** li incolla: l'app estrae i codici, scarta quelli rovinati e per ogni amico tiene il più recente. In alto compare "Codici ricevuti X di Y".
3. Tocca l'icona di condivisione in alto a destra (**Pubblica nel gruppo**) e sceglie cosa mandare: il testo con la classifica e il codice di gruppo, l'immagine verticale, oppure solo il codice di gruppo (`HOMRAPG1.`).

**Di nuovo gli amici**: incollano il codice di gruppo in **Incolla codici** e vedono podio, momenti del mese, dettagli e confronti. Toccando un amico si apre il **Confronto**.

Le classifiche sono tre: **Sfida del mese** (un AMRAP di 15 minuti a corpo libero, uguale per tutti, generato dal mese: completa e facilitata nella stessa lista), **Miglioramento** (% al test mensile rispetto al test precedente) e **Costanza** (sessioni e serie di giorni). Si sceglie tra settimana e mese.

Nei codici non entrano mai età, peso, misure, zone delicate o risposte di sicurezza. Il codice ha un controllo (CRC32): se viene tagliato o modificato per sbaglio, l'app lo rifiuta.

---

## 5. Decisioni prese

Scelte fatte dallo sviluppatore dove il documento di progetto lasciava un margine.

**Tecnica**

- Nessuna libreria esterna: tutto è scritto a mano, compresi il decoder FIT e il CRC32.
- IndexedDB con tre archivi (`kv`, `sessioni`, `test`). Lo schema dei dati ha una versione (`SCHEMA` in `js/backup.js`) e un elenco di migrazioni, usato sia all'avvio sia nel ripristino di un backup vecchio. Un backup di una versione futura viene rifiutato.
- Il checksum del backup è un CRC32: riconosce un file rovinato, non è una protezione.
- I font Google vengono messi in cache dal service worker alla prima apertura. Senza rete alla prima apertura si vedono i font di sistema.
- Un allenamento interrotto (telefono bloccato, app chiusa) viene ripreso alla riapertura.
- Dove `navigator.share` non c'è (per esempio sul computer), testo e codici vengono copiati e i file scaricati.

**Test e livelli**

- Le varianti facilitate contano meno: piegamenti sulle ginocchia 55%, burpees senza salto 70%. Così i livelli restano confrontabili.
- Senza la prova alla sbarra, il livello di trazione è stimato da superman e piegamenti ed è segnato come "stimato".
- La tenuta massima si ferma a 5 minuti.
- Il miglioramento % è la media delle 5 prove.

**Piano e allenamento**

- Le quote del massimo: 50% di base, 38% per Forza, 58% per Resistenza e Dimagrire; le tenute usano l'80% di queste quote (quindi 40% di base).
- Le ripetizioni vengono poi ritoccate per portare il giro intorno ai 3 minuti (5-8 giri in 20 minuti).
- Con 5 o 6 giorni a settimana i giorni in più (E, F) sono leggeri: stessi schemi, circa il 75% delle ripetizioni.
- Con almeno un "sì" al questionario di sicurezza, o con gravidanza o parto recente, il piano parte più leggero: varianti di un livello più facile, −20% di ripetizioni e niente salti.
- Nel Profilo c'è l'interruttore "Evita i salti", per chi ha vicini al piano di sotto.
- Un esercizio con stress 2 o 3 su una zona infortunata viene escluso; con stress 1 resta. Le zone "da sforzare meno" abbassano solo il punteggio.
- Il rematore inverso sotto il tavolo è proposto con un avviso di sicurezza ben visibile.
- Nel giorno di riposo c'è il pulsante "Allenati comunque oggi".
- I tipi di giorno ruotano (A, B, C…) in ordine: se salti un allenamento, la volta dopo riparti da quello saltato.
- La serie di giorni conta gli allenamenti fatti senza saltare una settimana di piano; la settimana in corso non la interrompe.
- La settimana 4 è di scarico (circa −30%); dalla settimana 4 compare in Oggi l'invito al test mensile. Dopo il test l'app propone il piano del blocco successivo, che si accetta o si modifica.
- Il primo promemoria del backup arriva dopo 3 sessioni, poi ogni 14 giorni e dopo ogni test mensile.

**Orologio**

- Nel file dell'orologio l'ultimo lap, quello chiuso dallo stop, è considerato il giro incompleto: i giri sono i lap meno uno.
- Apple Watch: l'iPhone non esporta i singoli allenamenti, quindi la guida rimanda a un'app esterna che esporti in FIT, senza nominarne una (i nomi invecchiano).

**Classifica**

- Formato dei codici: prefisso, punto, base64url di 1 byte (compresso sì/no), 4 byte di CRC32 e il JSON, compresso con deflate-raw solo se diventa più corto.
- La sfida del mese ha 4 esercizi presi da 4 schemi diversi, scelti con un generatore casuale che usa il mese come seme: stessa sfida per tutti, senza server.
- Le frasi del Confronto nascono da regole sui dati (sessioni, media giro, singole prove) e non parlano mai di corpo o peso.

**Demo**

- La modalità demo mette da parte i dati veri e li rimette al loro posto quando la spegni.

---

## 6. Limiti noti

- **Provata in un browser desktop** (Chrome senza interfaccia, 390 px, tema scuro e chiaro) e con i test automatici. Non è stata provata su un iPhone e su un Android veri: installazione, voce, vibrazione, schermo sempre acceso e condivisione verso WhatsApp vanno verificati sui telefoni.
- **iPhone:** la vibrazione non esiste nelle web app; la voce può restare muta se il telefono è in modalità silenziosa; lo schermo sempre acceso richiede iOS 16.4 o successivo e, nell'app installata, sulle versioni di iOS meno recenti può non funzionare. Se l'app non viene installata, Safari può cancellare i dati dopo 7 giorni di inattività: l'app lo ricorda con un avviso fisso.
- **Timer in secondo piano:** se durante l'AMRAP cambi app o blocchi il telefono, il tempo continua a scorrere correttamente, ma gli avvisi vocali di quel periodo vanno persi.
- **Decoder FIT:** legge i messaggi session, lap e record (tempo, battito, calorie). È stato provato con file generati dai test, non con file veri di ogni marca: se un file non viene letto, c'è sempre l'inserimento manuale.
- **Soglie dei livelli:** sono valori ragionevoli, non uno standard scientifico. Si ritoccano in `data/soglie-test.js`.
- **Sagoma dei muscoli:** è volutamente schematica. Non ci sono animazioni (la struttura per aggiungerle è pronta).
- **Un solo profilo per telefono** e una sola lingua, come da progetto.

---

HoMRAP non sostituisce un medico o un allenatore. In caso di dolore, capogiri o fiato corto anomalo, fermati.
