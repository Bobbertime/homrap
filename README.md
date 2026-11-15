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
const VERSIONE = 'homrap-1.0.3';
```

per esempio in `homrap-1.0.4` (e, se vuoi che si veda in fondo al Profilo, anche `VERSIONE` in `js/viste/profilo.js`). Senza questo passaggio i telefoni continuano a usare la copia vecchia. Con la versione nuova, alla riapertura l'app mostra "Nuova versione disponibile" con il pulsante **Ricarica**. Se aggiungi un file nuovo, aggiungilo anche all'elenco `FILE` in `sw.js` (c'è un test che lo controlla).

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
js/router.js            navigazione a hash (#/oggi, #/progressi …) e posizione salvata tornando indietro
js/stato.js             stato in memoria e salvataggio
js/db.js                piccolo wrapper su IndexedDB
js/backup.js            backup, checksum, versione dello schema e migrazioni
js/logica.js            logica di allenamento: livelli, scelta esercizi, ripetizioni, piano, progressione, acquisti
js/analisi.js           analisi di una sessione per il Report: battito massimo, zone, giri, confronto, frasi di lettura
js/classifica.js        sfida del mese, codici personali e di gruppo, classifiche, frasi del confronto
js/orologi.js           decoder FIT scritto a mano, lettura di TCX e GPX
js/immagini.js          immagini 1080×1920 da condividere (canvas)
js/audio.js             voce, bip, vibrazione, schermo sempre acceso
js/piattaforma.js       riconoscimento iOS/Android e installazione
js/azioni.js            operazioni comuni a più schermate
js/ui.js                icone SVG, fogli, grafici, sagoma dei muscoli, condivisione
js/demo.js              modalità demo
js/util.js              date, CRC32, base64url, generatore casuale con seme
js/viste/               una schermata per file: onboarding, test, piano, oggi, allenamento, progressi, report, classifica, profilo

tests/run.mjs           test automatici della logica
```

`logica.js`, `analisi.js`, `classifica.js`, `orologi.js`, `backup.js` e `util.js` sono moduli "puri": non toccano né la pagina né l'archivio, quindi si provano con Node.

### Test automatici

```
node tests/run.mjs
```

Serve Node 18 o successivo. Sono 91 test: ripetizioni e obiettivo di giri, scelta degli esercizi con i vincoli di attrezzi e infortuni, progressione (anche con il battito), analisi della sessione per il Report (battito massimo, zone, giri, confronto, frasi), posizione salvata tornando indietro, link dei video, codici personali e di gruppo (andata e ritorno, CRC errato rifiutato, niente battito né età), sfida del mese identica per lo stesso mese, decoder FIT con un file generato apposta, backup e ripristino, coerenza della libreria e delle traduzioni.

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

### Il video di un esercizio

Nella scheda di ogni esercizio c'è il pulsante **Guarda un video su YouTube**, che si apre fuori dall'app. Finché non scegli un video, il pulsante apre una ricerca su YouTube con il nome dell'esercizio in italiano più "esecuzione corretta". Nessun esercizio ha per ora un video scelto: i link non sono stati inventati.

Per incollare il link di un video scelto a mano:

1. Apri il video su YouTube, tocca **Condividi** → **Copia link**. Vanno bene i link del tipo `https://youtu.be/…` e `https://www.youtube.com/watch?v=…`.
2. Apri `data/esercizi.js`, cerca la riga dell'esercizio (per esempio `id: 'squat'`) e aggiungi il campo `video` prima della graffa di chiusura, tra apici e con la virgola prima:

   ```js
   { id: 'squat', schema: 'gambe', …, dif: 'squat_jump', video: 'https://youtu.be/INCOLLA_QUI' },
   ```

3. Lancia `node tests/run.mjs`: un test controlla che ogni campo `video` sia un link `https` di YouTube. Se il link non è valido, l'app lo ignora e torna alla ricerca.
4. Cambia `VERSIONE` in `sw.js`.

La frase aggiunta alla ricerca si cambia in `i18n/it.js`, alla voce `esercizio.videoRicerca`.

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
- Il test iniziale si può rimandare: nella schermata del test c'è "Lo faccio dopo: prima guardo l'app". Senza test si possono vedere tutte le schede e, con "Guarda l'app con dati di esempio", girare l'app piena (allenamento compreso) in modalità demo. Per allenarsi davvero il test resta obbligatorio: senza test non partono né l'allenamento del giorno né la sfida del mese, e la scheda Oggi lo propone come primo passo.
- Nel giorno di riposo c'è il pulsante "Allenati comunque oggi".
- I tipi di giorno ruotano (A, B, C…) in ordine: se salti un allenamento, la volta dopo riparti da quello saltato.
- La serie di giorni conta gli allenamenti fatti senza saltare una settimana di piano; la settimana in corso non la interrompe.
- La settimana 4 è di scarico (circa −30%); dalla settimana 4 compare in Oggi l'invito al test mensile. Dopo il test l'app propone il piano del blocco successivo, che si accetta o si modifica.
- Il primo promemoria del backup arriva dopo 3 sessioni, poi ogni 14 giorni e dopo ogni test mensile.

**Report della sessione** (versione 1.0.3)

- Il report è una schermata a sé (`#/report/<id della sessione>`). Si apre dal riepilogo di fine allenamento ("Vedi il report"), da Progressi toccando una barra delle ultime sessioni o un giorno colorato del calendario (se quel giorno ha più sessioni, l'app chiede quale), dopo l'import in Profilo → Orologio e anche dalla card "Fatto oggi" in Oggi. Si apre anche dopo l'inserimento manuale di battito e calorie. Dal report, "indietro" riporta al riepilogo, che resta com'era.
- Battito massimo: campo facoltativo in Profilo → "Chi sei?" (da 120 a 230 bpm). Compare solo modificando il profilo, non nelle domande iniziali, per non allungarle. Se è compilato vince sempre. Se manca, si usa la stima dall'età (208 − 0,7 × età) oppure il battito più alto mai registrato dall'orologio, se è maggiore; i valori registrati sotto 100 o sopra 230 bpm sono ignorati come errori del sensore.
- Zone di sforzo, come quota del battito massimo: Z1 sotto il 60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 dal 90%. Il tempo in zona si calcola tratto per tratto sulla curva; i buchi più lunghi di 4 volte il passo tipico (e di 30 secondi) sono pause dell'orologio e non contano. Con il solo battito medio inserito a mano si vede la zona della media, non il tempo per zona.
- Tempi dei giri: quelli presi dall'app; se mancano (allenamento fatto con l'orologio) i lap del file meno l'ultimo. Se ci sono sia i giri dell'app sia la curva, il battito medio di ogni giro si ottiene allineando le due ore di inizio, quando distano al massimo 15 minuti.
- Il grafico dei giri è una linea a punti e non un istogramma: con le barre che partono da zero un calo del 10-15% quasi non si vede. Più in alto vuol dire giro più lento; la scala parte dal giro più veloce e la riga tratteggiata è la media.
- "Calo finale" = quanto è più lungo in media l'ultimo terzo dei giri rispetto al primo terzo. Fino a +8% il ritmo è "regolare", da +8% calo lieve, da +15% calo forte; da −5% in giù è un finale in crescendo.
- Confronto: con la sessione precedente dello stesso tipo di giorno (per la sfida: stesso mese e stessa variante), escluse quelle interrotte. Se esercizi, ripetizioni, durata o riduzione non sono identici, il report lo dice.
- Lettura: 2 o 3 frasi scelte con regole fisse, in quest'ordine: ritmo dei giri; battito (zona 5 per almeno il 25% del tempo, media dal 90% del massimo, battito salito di almeno 8 bpm nella seconda metà a ritmo costante, altrimenti la fascia della media); confronto (differenze di almeno 0,25 giri, 3 bpm in meno o 5 bpm in più). Senza battito la terza frase è il confronto con l'obiettivo di giri. Le soglie sono in cima a `js/analisi.js` (`SOGLIE_REPORT`), i testi in `i18n/it.js` sotto `rep.frase`. Le frasi sono indicazioni, non un parere medico, e la schermata lo dice.
- Immagine del report (1080×1920): se la sessione ha il battito, l'app chiede prima se metterlo nell'immagine; la scelta proposta per prima è "Senza battito". Età e battito massimo non compaiono mai nell'immagine. Con il battito ci stanno curva, giri e zone; senza, giri e frasi.
- I dati di esempio della demo hanno ora i tempi dei giri e, una sessione su due, la curva del battito, così il report si può provare senza orologio.

**Battito nella progressione suggerita** (versione 1.0.3)

- Il battito conta solo quando c'è: serve il battito medio della sessione (dal file o inserito a mano) e il battito massimo. Senza, la regola è identica a prima.
- Freno: se i giri per aumentare ci sono (due sessioni di fila con almeno un giro sopra l'obiettivo e fatica fino a 8) ma nell'ultima sessione il battito medio è stato dal **90%** del massimo in su, l'app non propone di aumentare. Al posto del suggerimento mostra la card "Per ora resta così" con il motivo e il solo pulsante "Ho capito"; la regola viene rivalutata dopo la sessione successiva.
- Spinta: se per **due sessioni di fila** dello stesso giorno l'obiettivo di giri è raggiunto, la fatica segnata è **fino a 5** e il battito medio è **fino al 75%** del massimo in entrambe, l'app propone di aumentare anche senza il giro in più. Basta una condizione mancante (anche solo una sessione senza battito) perché non scatti.
- La fatica da 9 in su fa sempre proporre di alleggerire, anche con battito basso. Il battito da solo non fa mai proporre di alleggerire.
- Le soglie sono prudenti di proposito, perché il massimo stimato dall'età può sbagliare di una decina di battiti; si cambiano in `js/logica.js` (`BATTITO`). Resta tutto un suggerimento: il piano cambia solo toccando "Accetta".

**Video e navigazione** (versione 1.0.3)

- Il campo `video` degli esercizi è vuoto per tutti: non sono stati inventati link. Un link che non è un indirizzo `https` di YouTube viene ignorato.
- Posizione salvata: ogni pagina aperta riceve un numero nella cronologia del browser. Tornando indietro (freccia dell'app, tasto indietro di Android, gesto di iOS) la pagina riparte da dove era; aprendo una pagina nuova, o andando avanti con il browser, si parte dall'alto. Le frecce "indietro" delle intestazioni tornano davvero indietro nella cronologia quando la pagina precedente è quella attesa; altrimenti aprono la pagina madre dall'alto. Anche "Salva" in una voce del Profilo riporta al Profilo nel punto in cui era (tranne quando la modifica richiede di rivedere il piano). Le posizioni restano in memoria finché l'app è aperta, e sopravvivono a una ricarica.

**Orologio**

- Nel file dell'orologio l'ultimo lap, quello chiuso dallo stop, è considerato il giro incompleto: i giri sono i lap meno uno.
- Apple Watch: l'iPhone non esporta i singoli allenamenti, quindi la guida rimanda a un'app esterna che esporti in FIT, senza nominarne una (i nomi invecchiano).

**Classifica**

- Formato dei codici: prefisso, punto, base64url di 1 byte (compresso sì/no), 4 byte di CRC32 e il JSON, compresso con deflate-raw solo se diventa più corto.
- La sfida del mese ha 4 esercizi presi da 4 schemi diversi, scelti con un generatore casuale che usa il mese come seme: stessa sfida per tutti, senza server.
- Le frasi del Confronto nascono da regole sui dati (sessioni, media giro, singole prove) e non parlano mai di corpo o peso.
- Battito, calorie, fatica ed età non entrano mai nei codici, né in quello personale né in quello di gruppo: un test lo controlla anche con sessioni che hanno i dati dell'orologio. Il battito massimo serve solo ai calcoli fatti sul telefono.

**Demo**

- La modalità demo mette da parte i dati veri e li rimette al loro posto quando la spegni.

---

## 6. Limiti noti

- **Report, suggerimenti con il battito, video e ritorno indietro (1.0.3):** provati con i test automatici e in Chrome senza interfaccia a 390 px, tema scuro e chiaro, con i dati della demo e un file TCX generato apposta. Non sono stati provati su telefoni veri né con file veri degli orologi.
- **Battito massimo e zone:** la stima dall'età può sbagliare di una decina di battiti, quindi zone e soglie dei suggerimenti sono indicative finché non scrivi il tuo massimo nel profilo. La curva salvata ha al massimo 120 punti: su 20 minuti il tempo in zona è preciso a circa 10 secondi. Non è una valutazione medica.
- **Giri dell'app e curva dell'orologio:** il battito per giro è giusto solo se telefono e orologio hanno l'ora sincronizzata. Se le due ore di inizio distano più di 15 minuti, o se il file non ha l'ora, la curva viene considerata partita insieme all'AMRAP.
- **Sessioni senza tempi dei giri** (fatte con l'orologio senza importare il file, o inserite a mano): il report mostra solo numeri, confronto e frasi.
- **Video:** finché il campo `video` è vuoto si apre una ricerca, e i risultati li decide YouTube. Come si apre "fuori dall'app" dipende dal telefono: su Android nell'app YouTube o nel browser, su iPhone può aprirsi in una scheda sopra l'app.
- **Posizione salvata:** se nel frattempo la pagina è diventata più corta, si torna nel punto più vicino possibile. Chiudendo del tutto l'app le posizioni si perdono.
- **Immagine del report:** con il battito non resta spazio per le frasi di lettura.
- **Provata in un browser desktop** (Chrome senza interfaccia, 390 px, tema scuro e chiaro) e con i test automatici. Non è stata provata su un iPhone e su un Android veri: installazione, voce, vibrazione, schermo sempre acceso e condivisione verso WhatsApp vanno verificati sui telefoni.
- **iPhone:** la vibrazione non esiste nelle web app; la voce può restare muta se il telefono è in modalità silenziosa; lo schermo sempre acceso richiede iOS 16.4 o successivo e, nell'app installata, sulle versioni di iOS meno recenti può non funzionare. Se l'app non viene installata, Safari può cancellare i dati dopo 7 giorni di inattività: l'app lo ricorda con un avviso fisso.
- **Timer in secondo piano:** se durante l'AMRAP cambi app o blocchi il telefono, il tempo continua a scorrere correttamente, ma gli avvisi vocali di quel periodo vanno persi.
- **Decoder FIT:** legge i messaggi session, lap e record (tempo, battito, calorie). È stato provato con file generati dai test, non con file veri di ogni marca: se un file non viene letto, c'è sempre l'inserimento manuale.
- **Soglie dei livelli:** sono valori ragionevoli, non uno standard scientifico. Si ritoccano in `data/soglie-test.js`.
- **Sagoma dei muscoli:** è volutamente schematica. Non ci sono animazioni (la struttura per aggiungerle è pronta).
- **Un solo profilo per telefono** e una sola lingua, come da progetto.

---

HoMRAP non sostituisce un medico o un allenatore. In caso di dolore, capogiri o fiato corto anomalo, fermati.
