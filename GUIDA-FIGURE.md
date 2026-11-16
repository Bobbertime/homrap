# Guida alle figure animate

Come aggiungere la figura animata di un esercizio nello stesso stile delle altre, una alla volta, anche facendosi aiutare da un assistente (Claude Opus o un altro). In fondo ci sono i messaggi già pronti da copiare.

Tutte le figure stanno in un solo file, `js/figure.js`. Non servono immagini né librerie: una figura è una ventina di righe che descrivono **pose** e **passi**.

---

## 1. Lo stile, in sei regole

1. **Omino schematico visto di lato.** Tratti arrotondati, una testa tonda, nessun dettaglio (niente mani, viso, vestiti).
2. **Un colore solo** per il corpo, quello del testo. L'arancione è riservato a ciò che si tiene in mano o a cui ci si aggrappa: sbarra, peso, elastico.
3. **Mobili e muri in grigio**, sottili, ridotti all'essenziale: una sedia è una seduta, due gambe e uno schienale.
4. **La figura mostra il movimento giusto e il punto in cui la ripetizione vale.** Gli errori, la larghezza di mani e piedi e la respirazione restano nei testi.
5. **Ritmo da esecuzione controllata**, non da gara: un ciclo dura di solito tra 2 e 3,5 secondi, con una breve pausa nelle due posizioni estreme. Le tenute (plank, hollow) mostrano l'entrata, 2–3 secondi fermi e l'uscita.
6. **Testa a destra** per le figure in piedi, a quattro zampe e a pancia in giù. **Testa a sinistra** per quelle a pancia in su (così ginocchia e gomiti si piegano dal lato giusto senza fare niente).

## 2. Le coordinate

- x cresce verso destra, y verso l'alto. **Il pavimento è y = 0**: un piede, una mano o un ginocchio appoggiati hanno y = 0.
- Gli angoli sono in gradi: **0 = in avanti (destra), 90 = in alto, 180 = indietro, −90 = in basso**.
- Il busto sdraiato a terra ha y = 1,5 (è più spesso degli arti). La testa appoggiata a terra: collo inclinato di una decina di gradi verso l'alto.

Le ossa hanno lunghezza fissa:

| Osso | Va da → a | Lunghezza | In piedi |
|---|---|---|---|
| `piede` | caviglia → punta | 9 | 0 (a terra); −70 = sulle punte |
| `tibia` | caviglia → ginocchio | 26 | 90 |
| `coscia` | ginocchio → anca | 26 | 90 |
| `busto` | anca → spalla | 34 | 90 |
| `collo` | spalla → testa | 13 | 88 |
| `braccio` | spalla → gomito | 17 | −88 (lungo il fianco) |
| `avambraccio` | gomito → mano | 17 | −80 |

**L'angolo di un osso è la direzione "da → a".** Attenzione a coscia e tibia: vanno dal basso verso l'alto. Coscia orizzontale con l'anca dietro al ginocchio (squat, sedia) = 180. Tibia con il ginocchio in avanti = 60–75.

Qualche numero utile: in piedi la spalla è a 86 e la testa a 99; a braccia tese la spalla è 34 sopra le mani; in ginocchio l'anca è a 26; sulle punte la caviglia è a 8,46.

## 3. Come è fatta una figura

```js
function affondiIndietro() {
  // 1. le pose: posa(puntoFermo, [x, y], { angoli })
  const su = posa('caviglia2', [0, 0], IN_PIEDI);
  let giu = posa('anca', [-26, 26], { busto: 90, collo: 88, braccio: -88, avambraccio: -80,
    piede2: 0, tibia2: 90, coscia2: 180,              // gamba lontana: resta davanti, coscia orizzontale
    piede: SULLE_PUNTE, tibia: -17, coscia: 83 });    // gamba vicina: va indietro, ginocchio verso terra
  // 2. dove devono stare esattamente i piedi: gli angoli delle gambe si ricavano da soli
  giu = verso(verso(giu, 'caviglia2', [0, 0]), 'caviglia', [-55, ALT_CAVIGLIA]);
  // 3. i passi: "vai alla posa X in t secondi"; la stessa posa di prima = pausa
  const passo = { r: 'caviglia2', fissa: [['caviglia', 5]] };   // il piede davanti resta fermo; l'altro si sposta alzandosi di 5
  return { r: 'caviglia2', inizio: 'su', ferma: 'giu', dueGambe: true, fermi: ['caviglia2'], pose: { su, giu },
    passi: [{ a: 'giu', t: 0.8, ...passo }, { a: 'giu', t: 0.2 }, { a: 'su', t: 0.8, ...passo }, { a: 'su', t: 0.3 }] };
}
```

Poi una riga in `COSTRUTTORI`, con l'`id` dell'esercizio preso da `data/esercizi.js`: `affondi_indietro: affondiIndietro,`. La scheda dell'esercizio mostra la figura da sola.

**Una posa** = un punto fermo, la sua posizione, gli angoli delle ossa. Il punto fermo può essere qualunque articolazione: `caviglia`, `punta`, `ginocchio`, `anca`, `spalla`, `gomito`, `mano` (e le gemelle con il 2). Si sceglie quello che nella realtà non si muove: i piedi nello squat, le mani nelle trazioni, il gomito nel plank.

**Tra due pose si interpolano gli angoli**, così le ossa non cambiano lunghezza. Per questo due pose consecutive vanno scritte con angoli vicini: un braccio che va da −90 a −178 passa da dietro; se scrivi 182 al posto di −178 fa il giro da davanti.

**Campi della figura**

| Campo | A cosa serve |
|---|---|
| `r` | punto fermo usato nei passi, se il passo non ne indica un altro |
| `inizio` | posa da cui parte il ciclo; l'ultimo passo deve tornarci |
| `ferma` | posa mostrata a chi ha "riduci movimento": la posizione che conta |
| `pose`, `passi` | vedi sopra |
| `fermi` | punti che devono restare immobili per tutto il ciclo (`['mano', 'punta']`): il test controlla che sia vero |
| `dueGambe`, `dueBraccia` | disegna anche la gamba o il braccio lontani, più chiari; i loro angoli hanno il 2 (`coscia2`, `braccio2`…). Se non li scrivi valgono quelli del lato vicino |
| `braccioDietro` | il braccio passa dietro la testa (braccia tese oltre la testa: superman, hollow) |
| `inMano: 'peso'` | pallino arancione nella mano vicina: manubrio o kettlebell |
| `attrezzi` | mobili e sbarre, fermi: `[sedia(...)]`, vedi sotto |
| `fili` | elastici, anelli, corde: `[{ da: [x, y], a: 'mano' }]`, un tratto che segue la mano |
| `lati` | solo se un gomito si piega dalla parte sbagliata: `{ mano: 1 }` |

**Campi di un passo**

| Campo | A cosa serve |
|---|---|
| `a`, `t` | posa di arrivo e secondi |
| `r` | punto fermo di questo passo (nei burpees cambia: prima i piedi, poi le mani) |
| `fissa` | appoggi che restano dove sono mentre il resto si muove: `['mano']`. Con un numero il punto si sposta alzandosi: `[['caviglia', 5]]` è un piede che fa un passo |
| `e` | andatura: `'io'` dolce (se non scrivi niente), `'i'` accelera, `'o'` rallenta, `'l'` costante. Salti: `'i'` per lo stacco, `'o'` per salire, `'i'` per ricadere |

**Angoli in più:** `curva` incurva la schiena (0 = dritta). A quattro zampe con la testa a destra, `curva: 7` è la schiena da gatto, `curva: -5` quella insellata.

**Attrezzi di scena** (già pronti in `js/figure.js`):

| Funzione | Cosa disegna |
|---|---|
| `sbarra([x, y])` | la sbarra a cui si appendono le mani |
| `parete(x, altezza, lato)` | un muro a cui si appoggia un'articolazione che sta a x (`lato` 1 = muro a destra, −1 = a sinistra) |
| `cassa(x1, x2, y)` | panca, divano, rialzo su cui si appoggia qualcosa a quota y |
| `sedia(xDavanti, xDietro, y, schienale)` | sedia con la seduta a quota y |
| `tavolo(x1, x2, y)` | tavolo; x2 è il bordo a cui ci si aggrappa |

**Pose e misure già pronte:** `IN_PIEDI`, `ZAMPE` (a quattro zampe), `SUPINO` (a pancia in su), `A_TERRA` (a pancia in giù), `SULLE_PUNTE` (−70), `ALT_CAVIGLIA` (8,46), `teso(g)` (gambe e busto in linea, inclinati di g), `pendenza(altezzaSpalla, lunghezza)` (l'inclinazione che porta la spalla a una certa altezza), `verso(posa, 'mano', [x, y])` (porta mano o caviglia in un punto preciso).

## 4. Il metodo, passo per passo

Una figura alla volta. Per ognuna:

1. **Leggi l'esercizio.** La riga in `data/esercizi.js` (attrezzi, se è "per lato") e i testi in `i18n/it.js` alla voce `esercizi.<id>`: i consigli dicono qual è la posizione che conta.
2. **Cerca la figura più simile** tra quelle esistenti e parti da lì. Spesso basta una variante: `piegamentiSu(26, 0)` sono i piegamenti con le mani rialzate, `ponte({ rialzo: 24 })` è l'hip thrust.
3. **Decidi cosa resta fermo** (piedi? mani? spalle?) e scrivilo in `fermi`. È la scelta che conta di più.
4. **Scrivi le due pose estreme**, partenza e posizione chiave. Aggiungi una posa intermedia solo se il movimento passa da un punto obbligato (il bacino alto nel salto indietro dei burpees).
5. **Scrivi i passi**: andata, breve pausa, ritorno, breve pausa.
6. **Controlla** con i tre comandi qui sotto e correggi finché il primo non dà nessun avviso.
7. **Guardala** in `tests/figure.html?id=<id>` e confrontala con una figura vicina: stessa scala, stesso ritmo, si capisce senza leggere il nome?
8. **Pubblica**: cambia `VERSIONE` in `sw.js` e in `js/viste/profilo.js`. Non c'è nessun file nuovo da aggiungere all'elenco `FILE`.

## 5. Come si controlla

```
node tests/figure.mjs <id>     controlli e disegno a caratteri di ogni posa
node tests/figure.mjs          l'elenco di tutte, con gli esiti
node tests/run.mjs             tutti i test dell'app: devono passare
```

Il primo comando serve anche a chi non ha un browser sotto mano: disegna le pose a caratteri e dice dove sono testa, spalla, anca, ginocchio, caviglia e mano. Avvisa se:

- **un osso ha la lunghezza sbagliata** → hai chiesto a `verso` o a `fissa` un punto troppo lontano: avvicina il bersaglio o sposta il bacino;
- **qualcosa è sotto il pavimento** → alza il punto fermo o cambia l'angolo dell'osso indicato;
- **un punto fa uno scatto** → un angolo è scritto "dall'altra parte del giro" (182 invece di −178);
- **un appoggio dichiarato fermo si sposta** → manca `fissa` nel passo, oppure il punto fermo del passo è sbagliato.

Per guardarle davvero: apri `tests/figure.html` (in locale con `python3 -m http.server 8000`, oppure sul sito pubblicato aggiungendo `tests/figure.html` all'indirizzo). Mostra tutte le figure; toccando un nome si vede quella sola, con otto fotogrammi fermi e i numeri delle pose.

## 6. Gli sbagli più comuni

- **Coscia e tibia al contrario.** Vanno dal basso verso l'alto: una coscia a 0 ha l'anca *davanti* al ginocchio.
- **Mani o piedi che scivolano.** Se un appoggio deve stare fermo va in `fissa` (e in `fermi`, così il test lo sorveglia).
- **Ginocchio che passa nel pavimento a metà movimento.** Le due pose sono giuste ma la strada no: alza un po' il bacino (come nel mountain climber) o aggiungi una posa intermedia.
- **Figura a pancia in su con la testa a destra.** Gomiti e ginocchia si piegano al contrario: girala con la testa a sinistra (busto a 180).
- **Movimenti laterali.** Affondi laterali, jumping jack, pattinatore si muovono verso chi guarda: di lato non si capiscono. Per ora restano senza figura.
- **Una funzione chiamata `t`.** Il test delle traduzioni la scambia per una chiamata ai testi: usa un altro nome.

## 7. Cosa c'è e cosa manca

Con la figura (38 esercizi su 99, quelli che finiscono più spesso nei piani: coprono circa il 90% delle voci di un piano a corpo libero): squat, squat alla sedia, sedia al muro, squat jump, goblet squat, affondi indietro, alternati, saltati e con pesi, piegamenti (anche sulle ginocchia, al muro, inclinati, con i piedi rialzati, a diamante), pike push-up, dips sulla sedia, plank, plank laterale, plank con tocco delle spalle, mountain climber, hollow hold, leg raise, dead bug, bird dog, cat-cow, superman Y-T-W, nuotatore, rematore sotto il tavolo, rematore con elastico, ponte glutei e hip thrust (anche a una gamba), burpees (anche senza salto), trazioni e chin-up.

Da fare, in ordine di convenienza:

1. **Subito, con quello che c'è** (corpo libero o sbarra, di lato): `squat_profondo`, `bulgaro` (piede dietro su `cassa`), `pistol_assistito`, `skip_alto`, `nordic_assistito`, `burpees_ginocchia_petto`, `step_up_panca`, `appeso_sbarra`, `trazioni_negative`, `trazioni_petto`, `ginocchia_petto_appeso`, `gambe_tese_sbarra`, `trazioni_assistite`, `dips`, `dips_negative`, `ginocchia_petto_parallele` (le parallele sono una `sbarra` all'altezza delle mani), `piegamenti_bars`, `piegamenti_bars_rialzati`, `tenuta_raccolta_bars`.
2. **Con il peso in mano** (`inMano: 'peso'`): `stacco_rumeno`, `stacco_terra_peso`, `kettlebell_swing`, `swing_una_mano`, `thruster`, `lento_avanti`, `lento_avanti_un_braccio`, `distensioni_terra`, `distensioni_terra_un_braccio`, `distensioni_panca`, `rematore_manubrio`, `rematore_due_manubri`, `rematore_panca`, `bulgaro_pesi`.
3. **Con elastico, anelli o corda** (`fili`, sul modello di `rematoreElastico`): `lat_elastico`, `good_morning_elastico`, `distensioni_elastico`, `lento_elastico`, `face_pull_elastico`, `squat_elastico`, `rematore_anelli`, `rematore_anelli_rialzato`, `piegamenti_anelli`, `dips_anelli`, `face_pull_anelli`, `squat_anelli`, `salto_corda`, `corda_passo_alternato`, `doppi_salti_corda`.
4. **Non adatti alla vista di lato** (servirebbe un omino visto di fronte, che non c'è): `squat_cosacco`, `step_jack`, `jumping_jack`, `pattinatore`, `shadow_boxing`, `piegamenti_arciere`, `trazioni_arciere`, `pull_apart_elastico`, `pallof_elastico`, `russian_twist_peso`, `rotazioni_toraciche`, `novanta_novanta`, `worlds_greatest`.

## 8. Messaggi pronti per l'assistente

**Per cominciare** (allega `homrap.zip`, oppure almeno `js/figure.js`, `GUIDA-FIGURE.md`, `tests/figure.mjs`, `data/esercizi.js` e `i18n/it.js`):

> Ti allego HoMRAP, una web app di allenamenti in JavaScript puro. Le figure animate degli esercizi sono in `js/figure.js`. Leggi `GUIDA-FIGURE.md` dall'inizio alla fine e poi `js/figure.js`: voglio aggiungere altre figure nello stesso identico stile, una alla volta. Non cambiare il motore né le figure esistenti. Non aggiungere librerie, immagini o chiamate di rete. Quando hai letto tutto, dimmi in tre righe come è fatta una figura e aspetta che ti dica da quale partire.

**Per ogni figura:**

> Fai la figura di `stacco_rumeno`. Prima leggi la sua riga in `data/esercizi.js` e i suoi testi in `i18n/it.js`, poi dimmi in poche righe: da quale figura esistente parti, quali punti restano fermi, quali sono le due pose estreme. Poi scrivi la funzione e la riga per `COSTRUTTORI`. Lancia `node tests/figure.mjs stacco_rumeno` e `node tests/run.mjs`, mostrami il disegno a caratteri delle pose e correggi finché non ci sono avvisi. Alla fine dammi solo le righe da aggiungere a `js/figure.js`, con il punto esatto in cui metterle.

**Se non ti convince dopo averla guardata in `tests/figure.html?id=...`:**

> Nella figura di `stacco_rumeno` la schiena è troppo dritta nella posizione bassa e il peso scende oltre le caviglie. Correggi solo le pose, lasciando i passi come sono, e rimostrami il disegno a caratteri.

**Per chiudere una serie:**

> Aggiorna l'elenco al punto 7 di `GUIDA-FIGURE.md` (cosa c'è e cosa manca), porta `VERSIONE` al numero successivo in `sw.js` e in `js/viste/profilo.js`, aggiungi una riga in "Decisioni prese" del README e ridammi lo zip.

Consigli pratici: una figura per messaggio, non dieci; guarda sempre il risultato in `tests/figure.html` prima di passare alla successiva; se l'assistente propone di "migliorare il motore", rispondi di no, a meno che l'esercizio non si possa proprio disegnare con quello che c'è.
