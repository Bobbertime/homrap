# Guida per chi modifica HoMRAP

Per te, per un amico o per un assistente AI che riprende il progetto. Il README spiega cosa fa l'app e perché sono state fatte certe scelte; qui c'è come metterci le mani senza rompere niente.

## Le regole che non si toccano

1. **Niente librerie e niente build.** Solo HTML, CSS e JavaScript a moduli. Si pubblica la cartella così com'è.
2. **Niente chiamate di rete.** Anche i caratteri sono in `fonts/`. L'unico link verso l'esterno è il pulsante del video, che l'utente tocca di sua volontà. Un test lo controlla.
3. **Tutti i testi in `i18n/it.js` e `i18n/en.js`**, con le stesse chiavi. Nel codice si usa `t('chiave')` o `tn('chiave', n)` per i plurali.
4. **I dati sanitari restano sul telefono.** Battito, età, peso, fatica e misure non entrano mai nei codici della classifica (`datiPersonali` in `js/classifica.js`). Un test lo controlla.
5. **Tutto è un suggerimento.** Il piano cambia solo quando l'utente tocca "Accetta".
6. **A ogni modifica:** cambia `VERSIONE` in `sw.js` e in `js/viste/profilo.js`, e se aggiungi un file mettilo nell'elenco `FILE` di `sw.js`.

## Come è fatta

| Dove | Cosa c'è | Si prova con Node? |
|---|---|---|
| `js/logica.js` | Livelli, scelta degli esercizi, ripetizioni, piano, progressione suggerita, consigli d'acquisto | sì |
| `js/analisi.js` | Report, zone, giri, confronti, battiti per giro, andamento, carico | sì |
| `js/classifica.js` | Sfida del mese, codici, classifiche, pulizia dei codici ricevuti | sì |
| `js/orologi.js` | Lettura dei file FIT, TCX e GPX | sì (FIT) |
| `js/backup.js`, `js/util.js` | Backup e migrazioni, date e funzioni di servizio | sì |
| `js/figure.js` | Figure animate degli esercizi: pose, fotogrammi e disegno SVG | sì |
| `js/stato.js`, `js/db.js` | Stato in memoria (`S`) e salvataggio in IndexedDB | no |
| `js/router.js` | Navigazione a hash, posizione salvata tornando indietro | in parte (`passoNav`) |
| `js/ui.js`, `js/immagini.js` | Icone, fogli, grafici; immagini da condividere | no |
| `js/viste/*.js` | Una schermata per file | no |
| `data/*.js` | Esercizi, attrezzi, soglie del test: numeri, senza testi | sì |

La regola pratica: **i calcoli vanno nei moduli che si provano con Node, le viste disegnano soltanto.** Se ti trovi a fare conti dentro una vista, spostali in `logica.js` o `analisi.js` e aggiungi un test.

Una vista è una funzione registrata con `registra('nome', parametri => ({ html, azioni, dopo, esci, nav }))`. `html` è una stringa; `azioni` collega gli attributi `data-a` (click), `data-i` (input) e `data-c` (change) alle funzioni. Dopo aver cambiato i dati si chiama `disegna()`; per cambiare pagina `vai('rotta')`, per tornare indietro `indietro('rotta di ripiego')`.

Una sessione salvata ha `tipo`: `amrap` (allenamento del piano), `sfida` (sfida del mese) oppure `orologio` (fatta senza l'app e nata da un file). Chi filtra le sessioni deve decidere per tutti e tre.

## Come verificare

```
node tests/run.mjs          test della logica: devono passare tutti
node tests/schermate.mjs    prova delle schermate in un browser (facoltativa: serve Playwright, vedi in cima al file)
python3 -m http.server 8000 e poi http://localhost:8000 per guardarla a mano
```

Prima di pubblicare: i test passano, la versione è cambiata, l'app si apre sul telefono e in fondo al Profilo c'è il numero nuovo.

## Ricette

**Un esercizio nuovo.** Una riga in `data/esercizi.js` (i campi sono spiegati in cima al file) e i testi con lo stesso `id` in `i18n/it.js` e `i18n/en.js`: nome, 3 consigli, 2 errori, respirazione. La logica non va toccata. Se vuole due manubri aggiungi `paio: true`.

**Un video scelto a mano.** Campo `video` nella riga dell'esercizio, con un link `https` di YouTube.

**Una figura animata.** Segui `GUIDA-FIGURE.md`: metodo, coordinate, controlli e messaggi pronti per farsi aiutare. Si lavora solo in `js/figure.js`; `node tests/figure.mjs <id>` controlla e disegna le pose a caratteri, `tests/figure.html?id=<id>` le mostra in movimento.

**Una soglia o una regola.** Le soglie hanno un nome e stanno in cima ai moduli: `BATTITO` in `logica.js`; `SOGLIE_REPORT`, `SOGLIE_MISURA`, `SOGLIE_CARICO` in `analisi.js`; i livelli in `data/soglie-test.js`. Cambia il numero, aggiorna il test che lo usa e scrivi la scelta nel README, in "Decisioni prese".

**Una frase di lettura del report.** In `analisi.js` le funzioni `frase…` restituiscono `{ k, par }`; il testo va in `rep.frase.<k>` nelle due lingue. Evita articoli davanti alle percentuali ("il 80%"): scrivi "({pct}%)".

**Una schermata nuova.** File in `js/viste/`, `import` in `js/app.js`, voce in `FILE` di `sw.js`, rotta nell'elenco di `tests/schermate.mjs`.

**Un dato nuovo da salvare.** Se è un campo in più dentro profilo, sessione o preferenze, basta leggerlo con un valore di ripiego (`s.campo || …`). Se cambia la forma dei dati esistenti, aumenta `SCHEMA` in `js/backup.js` e aggiungi la migrazione: vale sia all'avvio sia per i backup vecchi.

**Una lingua nuova.** Vedi il README, sezione "Una lingua".

## Trappole già incontrate

- **Testo che arriva da fuori.** Nomi, note e tutto ciò che viene da un codice incollato o da un backup va scritto nella pagina con `esc(...)`. I codici della classifica passano prima da `normalizzaMembro`.
- **Due modifiche verso lo stesso esercizio.** Un suggerimento di progressione non deve mai proporre due volte la stessa variante: `valutaProgressione` tiene il conto degli esercizi già presi.
- **Demo.** Con i dati di esempio accesi, i dati veri sono messi da parte nell'archivio: backup, cancellazione e invio dei codici sono bloccati apposta.
- **Fogli aperti.** Quando si cambia pagina il router chiude i fogli (`chiudiFogli`).
- **Confronti onesti.** Giri e battiti si confrontano solo a parità di circuito (`chiaveCircuito` in `analisi.js`). Le sessioni interrotte, quelle a ripetizioni ridotte e i giri con una pausa restano fuori.
- **File degli orologi.** Il battito mancante nei FIT vale 255 e va scartato; il tempo "trascorso" di un lap comprende le pause, quello "timer" no.
- **Figure: interpolare i punti accorcia le ossa.** Tra due pose si interpolano gli angoli; un appoggio che deve restare fermo va dichiarato con `fissa`, altrimenti scivola. Un angolo scritto come 182 invece di −178 fa fare al braccio il giro dalla parte sbagliata: scrivi le due pose con angoli vicini tra loro.
- **Schermata dell'allenamento.** È alta quanto lo schermo (`.pagina.amrap`) e solo «+1 GIRO» si accorcia: se aggiungi un blocco, controlla che il pulsante resti intero a 667 px. `tests/schermate.mjs` lo verifica.
- **Ricominciare senza gonfiare i risultati.** Tutto ciò che fa ripartire un tempo da zero azzera anche il conteggio legato a quel tempo (giri, ripetizioni della prova): il risultato può solo uscire più basso, mai più alto.
- **Nomi brevi nei moduli.** Il test delle traduzioni cerca nel codice le chiamate `t('…')`: una funzione locale chiamata `t` lo fa fallire.
- **Date.** Si usano sempre le funzioni di `js/util.js` (`isoData`, `piuGiorni`, `lunedi`…), mai l'aritmetica a mano sui millisecondi: il cambio dell'ora sposta i giorni.

## Cose da fare, in ordine di utilità

1. Provare su un iPhone e un Android veri: installazione, voce, schermo acceso, condivisione, pulsante YouTube, gesto indietro.
2. Scegliere a mano i video degli esercizi più usati.
3. Provare l'import con file di altre marche (finora: file veri di un Suunto Race S, più file generati).
4. Far rileggere l'inglese a un madrelingua.
5. Figure animate per gli esercizi che mancano, nell'ordine indicato al punto 7 di `GUIDA-FIGURE.md`. Per quelli che si muovono di lato servirebbe un secondo omino, visto di fronte.
