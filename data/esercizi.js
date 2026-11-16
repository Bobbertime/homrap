// Libreria esercizi. I testi (nome, consigli, errori, respirazione) stanno in i18n/it.js, sotto "esercizi.<id>".
// Per aggiungere un esercizio: copia una riga, cambia i valori e aggiungi i testi in i18n/it.js. La logica non va toccata.
//
// Campi:
//   id       identificativo unico
//   schema   spinta | trazione | gambe | posteriore | core | cond | mobilita
//   liv      difficoltà da 1 a 5: l'esercizio è proposto a chi ha almeno quel livello nell'area
//   att      attrezzi richiesti: tutti i gruppi devono essere soddisfatti, dentro un gruppo ne basta uno
//            es. [['sbarra'], ['elastici']] = sbarra E elastici; [['manubri', 'kettlebell']] = manubri O kettlebell
//   unita    'rip' (ripetizioni) o 'sec' (secondi di tenuta); lato: true = il valore è per lato
//   rif, k   prova del test di riferimento e rapporto: massimo stimato = risultato della prova × k
//   min, max limiti delle ripetizioni (o dei secondi); soglia = oltre questo valore si propone la variante più difficile
//   fisso    valore fisso (mobilità), al posto di rif/k
//   sec      secondi stimati per ripetizione (si aggiorna con i dati reali dell'utente)
//   eff      efficacia da 1 a 5 per [dimagrire, forza, resistenza, mobilità, salute, atletico]
//   stress   carico per zona (1 leggero, 2 medio, 3 alto): con 2 o 3 l'esercizio è escluso se la zona è infortunata
//   impatto  true = ci sono salti; espl: true = variante esplosiva
//   musc, musc2  muscoli principali e secondari (per la sagoma)
//   fac, dif id della variante più facile e più difficile
//   peso     { tipo: 'manubri' | 'kettlebell', kg: [kg suggeriti per i livelli 1-5] }
//   paio     true = servono due manubri: l'esercizio non è proposto a chi ha segnato "Ho un solo manubrio"
//   anim     (facoltativo) percorso di un'animazione: se presente viene mostrata nella scheda dell'esercizio
//   video    (facoltativo) link a un video di YouTube scelto a mano, es. video: 'https://www.youtube.com/watch?v=…'.
//            Se manca (come adesso per tutti gli esercizi), il pulsante «Guarda un video su YouTube» apre una ricerca
//            con il nome dell'esercizio in italiano e la frase "esecuzione corretta". Vedi il README.
export const ESERCIZI = [
  // ── Spinta (riferimento: piegamenti in 60")
  { id: 'piegamenti_muro', schema: 'spinta', liv: 1, att: [], unita: 'rip', rif: 'piegamenti', k: 3.5, min: 8, max: 25, sec: 2, eff: [2, 1, 2, 1, 3, 1], stress: { spalle: 1, polsi: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle'], dif: 'piegamenti_inclinati' },
  { id: 'piegamenti_inclinati', schema: 'spinta', liv: 2, att: [], unita: 'rip', rif: 'piegamenti', k: 2.2, min: 6, max: 20, sec: 2.2, eff: [2, 2, 2, 1, 3, 2], stress: { spalle: 1, polsi: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle', 'addome'], fac: 'piegamenti_muro', dif: 'piegamenti_ginocchia' },
  { id: 'piegamenti_ginocchia', schema: 'spinta', liv: 2, att: [], unita: 'rip', rif: 'piegamenti', k: 1.6, min: 5, max: 20, sec: 2.3, eff: [3, 2, 3, 1, 3, 2], stress: { spalle: 2, polsi: 2, gomiti: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle', 'addome'], fac: 'piegamenti_inclinati', dif: 'piegamenti' },
  { id: 'piegamenti', schema: 'spinta', liv: 3, att: [], unita: 'rip', rif: 'piegamenti', k: 1, min: 4, max: 20, sec: 2.5, eff: [3, 4, 4, 1, 4, 4], stress: { spalle: 2, polsi: 2, gomiti: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle', 'addome'], fac: 'piegamenti_ginocchia', dif: 'piegamenti_piedi_rialzati' },
  { id: 'piegamenti_piedi_rialzati', schema: 'spinta', liv: 4, att: [], unita: 'rip', rif: 'piegamenti', k: 0.75, min: 4, max: 18, sec: 2.6, eff: [3, 4, 3, 1, 3, 4], stress: { spalle: 3, polsi: 2, gomiti: 1 }, musc: ['petto', 'spalle'], musc2: ['tricipiti', 'addome'], fac: 'piegamenti', dif: 'pike_pushup' },
  { id: 'pike_pushup', schema: 'spinta', liv: 5, att: [], unita: 'rip', rif: 'piegamenti', k: 0.5, min: 3, max: 15, sec: 3, eff: [2, 5, 2, 2, 3, 4], stress: { spalle: 3, polsi: 2, collo: 1 }, musc: ['spalle', 'tricipiti'], musc2: ['trapezio', 'petto'], fac: 'piegamenti_piedi_rialzati' },
  { id: 'piegamenti_bars', schema: 'spinta', liv: 3, att: [['pushup_bars']], unita: 'rip', rif: 'piegamenti', k: 0.9, min: 4, max: 20, sec: 2.6, eff: [3, 4, 4, 1, 4, 4], stress: { spalle: 2, polsi: 1, gomiti: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle', 'addome'], fac: 'piegamenti_ginocchia', dif: 'piegamenti_piedi_rialzati' },
  { id: 'dips', schema: 'spinta', liv: 4, att: [['parallele']], unita: 'rip', rif: 'piegamenti', k: 0.6, min: 3, max: 15, sec: 3, eff: [3, 5, 3, 1, 3, 5], stress: { spalle: 3, gomiti: 2, polsi: 1 }, musc: ['tricipiti', 'petto'], musc2: ['spalle'], fac: 'piegamenti' },
  { id: 'distensioni_terra', schema: 'spinta', liv: 2, att: [['manubri']], unita: 'rip', rif: 'piegamenti', k: 1.1, min: 6, max: 15, sec: 2.8, eff: [2, 4, 3, 1, 3, 3], stress: { spalle: 1, gomiti: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle'], peso: { tipo: 'manubri', kg: [4, 6, 10, 14, 18] }, paio: true, dif: 'piegamenti' },
  { id: 'lento_avanti', schema: 'spinta', liv: 3, att: [['manubri']], unita: 'rip', rif: 'piegamenti', k: 0.8, min: 6, max: 12, sec: 3, eff: [2, 4, 2, 1, 3, 4], stress: { spalle: 2, gomiti: 1, schiena: 1 }, musc: ['spalle', 'tricipiti'], musc2: ['trapezio'], peso: { tipo: 'manubri', kg: [3, 4, 6, 9, 12] }, paio: true, fac: 'distensioni_terra' },
  // Varianti a un braccio: basta un solo manubrio o una kettlebell. Le ripetizioni sono per lato.
  { id: 'distensioni_terra_un_braccio', schema: 'spinta', liv: 2, att: [['manubri', 'kettlebell']], unita: 'rip', lato: true, rif: 'piegamenti', k: 0.9, min: 5, max: 12, sec: 2.8, eff: [2, 4, 3, 1, 3, 3], stress: { spalle: 1, gomiti: 1 }, musc: ['petto', 'tricipiti'], musc2: ['spalle', 'obliqui'], peso: { tipo: 'manubri', kg: [4, 6, 10, 14, 18] }, dif: 'lento_avanti_un_braccio' },
  { id: 'lento_avanti_un_braccio', schema: 'spinta', liv: 3, att: [['manubri', 'kettlebell']], unita: 'rip', lato: true, rif: 'piegamenti', k: 0.65, min: 5, max: 10, sec: 3, eff: [2, 4, 2, 1, 3, 4], stress: { spalle: 2, gomiti: 1, schiena: 1 }, musc: ['spalle', 'tricipiti'], musc2: ['trapezio', 'obliqui'], peso: { tipo: 'manubri', kg: [3, 4, 6, 9, 12] }, fac: 'distensioni_terra_un_braccio' },

  // ── Trazione (riferimenti: superman, piegamenti, trazioni alla sbarra)
  { id: 'superman_ytw', schema: 'trazione', liv: 1, att: [], unita: 'rip', rif: 'superman', k: 0.3, min: 6, max: 15, sec: 4, eff: [2, 2, 2, 3, 4, 2], stress: { schiena: 1, spalle: 1, collo: 1 }, musc: ['trapezio', 'lombari'], musc2: ['spalle', 'dorsali', 'glutei'], dif: 'rematore_tavolo' },
  { id: 'rematore_tavolo', schema: 'trazione', liv: 3, att: [], unita: 'rip', rif: 'piegamenti', k: 0.7, min: 3, max: 15, sec: 3, eff: [3, 4, 3, 1, 4, 4], stress: { spalle: 2, gomiti: 1, polsi: 1 }, musc: ['dorsali', 'bicipiti'], musc2: ['trapezio', 'avambracci'], fac: 'superman_ytw', avviso: true },
  { id: 'rematore_elastico', schema: 'trazione', liv: 2, att: [['elastici']], unita: 'rip', rif: 'piegamenti', k: 1.3, min: 8, max: 20, sec: 2.5, eff: [3, 3, 4, 1, 4, 3], stress: { spalle: 1, gomiti: 1 }, musc: ['dorsali', 'trapezio'], musc2: ['bicipiti'], fac: 'superman_ytw', dif: 'rematore_tavolo' },
  { id: 'lat_elastico', schema: 'trazione', liv: 2, att: [['elastici']], unita: 'rip', rif: 'piegamenti', k: 1.3, min: 8, max: 20, sec: 2.5, eff: [2, 3, 3, 2, 4, 3], stress: { spalle: 2 }, musc: ['dorsali'], musc2: ['bicipiti', 'trapezio'], fac: 'superman_ytw', dif: 'trazioni_assistite' },
  { id: 'rematore_anelli', schema: 'trazione', liv: 2, att: [['anelli']], unita: 'rip', rif: 'piegamenti', k: 0.9, min: 5, max: 15, sec: 3, eff: [3, 4, 3, 1, 4, 4], stress: { spalle: 1, gomiti: 1 }, musc: ['dorsali', 'bicipiti'], musc2: ['trapezio', 'addome'], fac: 'superman_ytw', dif: 'trazioni_negative' },
  { id: 'rematore_manubrio', schema: 'trazione', liv: 2, att: [['manubri', 'kettlebell']], unita: 'rip', lato: true, rif: 'piegamenti', k: 1, min: 6, max: 12, sec: 2.5, eff: [3, 4, 3, 1, 4, 3], stress: { schiena: 1, spalle: 1, gomiti: 1 }, musc: ['dorsali', 'trapezio'], musc2: ['bicipiti', 'lombari'], peso: { tipo: 'manubri', kg: [4, 6, 10, 14, 18] }, fac: 'superman_ytw' },
  { id: 'trazioni_negative', schema: 'trazione', liv: 2, att: [['sbarra']], unita: 'rip', rif: 'trazioni', k: 3, min: 3, max: 6, sec: 6, eff: [2, 4, 2, 1, 3, 3], stress: { spalle: 2, gomiti: 2 }, musc: ['dorsali', 'bicipiti'], musc2: ['avambracci', 'trapezio'], dif: 'trazioni_assistite' },
  { id: 'trazioni_assistite', schema: 'trazione', liv: 2, att: [['sbarra'], ['elastici']], unita: 'rip', rif: 'trazioni', k: 2.5, min: 3, max: 10, sec: 3.5, eff: [2, 4, 3, 1, 3, 3], stress: { spalle: 2, gomiti: 2 }, musc: ['dorsali', 'bicipiti'], musc2: ['avambracci', 'trapezio'], fac: 'trazioni_negative', dif: 'trazioni' },
  { id: 'trazioni', schema: 'trazione', liv: 3, att: [['sbarra']], unita: 'rip', rif: 'trazioni', k: 1, min: 2, max: 12, sec: 3.5, eff: [3, 5, 3, 1, 4, 5], stress: { spalle: 3, gomiti: 2 }, musc: ['dorsali', 'bicipiti'], musc2: ['avambracci', 'trapezio', 'addome'], fac: 'trazioni_negative', dif: 'chin_up' },
  { id: 'chin_up', schema: 'trazione', liv: 3, att: [['sbarra']], unita: 'rip', rif: 'trazioni', k: 1.1, min: 2, max: 12, sec: 3.5, eff: [3, 5, 3, 1, 4, 5], stress: { spalle: 2, gomiti: 2, polsi: 1 }, musc: ['bicipiti', 'dorsali'], musc2: ['avambracci', 'addome'], fac: 'trazioni' },

  // ── Gambe (riferimento: squat in 60")
  { id: 'squat_sedia', schema: 'gambe', liv: 1, att: [], unita: 'rip', rif: 'squat', k: 1.2, min: 8, max: 20, sec: 2.5, eff: [2, 2, 2, 2, 4, 1], stress: { ginocchia: 1 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali'], dif: 'squat' },
  { id: 'squat', schema: 'gambe', liv: 2, att: [], unita: 'rip', rif: 'squat', k: 1, min: 8, max: 25, sec: 2.2, eff: [3, 3, 4, 2, 4, 3], stress: { ginocchia: 2, anche: 1 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali', 'adduttori'], fac: 'squat_sedia', dif: 'affondi_alternati' },
  { id: 'affondi_indietro', schema: 'gambe', liv: 2, att: [], unita: 'rip', pari: true, rif: 'squat', k: 0.7, min: 6, max: 20, sec: 2.6, eff: [3, 3, 3, 2, 4, 3], stress: { ginocchia: 2, anche: 1 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali', 'polpacci'], fac: 'squat_sedia', dif: 'affondi_alternati' },
  { id: 'affondi_alternati', schema: 'gambe', liv: 3, att: [], unita: 'rip', pari: true, rif: 'squat', k: 0.7, min: 6, max: 20, sec: 2.6, eff: [4, 3, 4, 2, 3, 4], stress: { ginocchia: 2, anche: 1, caviglie: 1 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali', 'polpacci'], fac: 'affondi_indietro', dif: 'bulgaro' },
  { id: 'bulgaro', schema: 'gambe', liv: 4, att: [], unita: 'rip', lato: true, rif: 'squat', k: 0.3, min: 4, max: 12, sec: 3, eff: [3, 5, 3, 2, 3, 4], stress: { ginocchia: 2, anche: 2 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali', 'adduttori'], fac: 'affondi_alternati', dif: 'pistol_assistito' },
  { id: 'squat_jump', schema: 'gambe', liv: 3, att: [], unita: 'rip', rif: 'squat', k: 0.5, min: 5, max: 15, sec: 2.2, eff: [5, 3, 4, 1, 2, 5], stress: { ginocchia: 3, caviglie: 2 }, impatto: true, espl: true, musc: ['quadricipiti', 'glutei'], musc2: ['polpacci', 'femorali'], fac: 'squat' },
  { id: 'pistol_assistito', schema: 'gambe', liv: 5, att: [], unita: 'rip', lato: true, rif: 'squat', k: 0.2, min: 3, max: 8, sec: 4, eff: [2, 5, 2, 3, 2, 5], stress: { ginocchia: 3, anche: 2, caviglie: 2 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali', 'addome'], fac: 'bulgaro' },
  { id: 'goblet_squat', schema: 'gambe', liv: 3, att: [['manubri', 'kettlebell']], unita: 'rip', rif: 'squat', k: 0.6, min: 8, max: 15, sec: 2.6, eff: [4, 4, 4, 2, 4, 4], stress: { ginocchia: 2, schiena: 1, polsi: 1 }, musc: ['quadricipiti', 'glutei'], musc2: ['femorali', 'addome'], peso: { tipo: 'manubri', kg: [4, 6, 10, 14, 18] }, fac: 'squat' },

  // ── Catena posteriore (riferimento: tenuta superman)
  { id: 'ponte_glutei', schema: 'posteriore', liv: 1, att: [], unita: 'rip', rif: 'superman', k: 0.5, min: 8, max: 20, sec: 2.5, eff: [2, 2, 3, 2, 5, 2], stress: { schiena: 1 }, musc: ['glutei', 'femorali'], musc2: ['lombari'], dif: 'ponte_una_gamba' },
  { id: 'ponte_una_gamba', schema: 'posteriore', liv: 2, att: [], unita: 'rip', lato: true, rif: 'superman', k: 0.25, min: 5, max: 12, sec: 2.5, eff: [2, 3, 3, 2, 4, 3], stress: { schiena: 1, anche: 1 }, musc: ['glutei', 'femorali'], musc2: ['lombari', 'addome'], fac: 'ponte_glutei', dif: 'hip_thrust' },
  { id: 'hip_thrust', schema: 'posteriore', liv: 3, att: [], unita: 'rip', rif: 'superman', k: 0.4, min: 8, max: 20, sec: 2.5, eff: [3, 4, 3, 1, 4, 3], stress: { schiena: 1 }, musc: ['glutei', 'femorali'], musc2: ['lombari', 'quadricipiti'], fac: 'ponte_una_gamba' },
  { id: 'good_morning_elastico', schema: 'posteriore', liv: 2, att: [['elastici']], unita: 'rip', rif: 'superman', k: 0.4, min: 8, max: 15, sec: 3, eff: [2, 3, 3, 3, 4, 2], stress: { schiena: 2 }, musc: ['femorali', 'lombari'], musc2: ['glutei'], fac: 'ponte_glutei' },
  { id: 'stacco_rumeno', schema: 'posteriore', liv: 3, att: [['manubri', 'kettlebell']], unita: 'rip', rif: 'superman', k: 0.35, min: 8, max: 12, sec: 3, eff: [3, 5, 3, 2, 4, 4], stress: { schiena: 2 }, musc: ['femorali', 'glutei'], musc2: ['lombari', 'avambracci'], peso: { tipo: 'manubri', kg: [4, 6, 10, 14, 18] }, fac: 'good_morning_elastico' },
  { id: 'kettlebell_swing', schema: 'posteriore', liv: 4, att: [['kettlebell']], unita: 'rip', rif: 'superman', k: 0.5, min: 10, max: 20, sec: 1.8, eff: [5, 4, 5, 1, 3, 5], stress: { schiena: 2, spalle: 1 }, espl: true, musc: ['glutei', 'femorali'], musc2: ['lombari', 'spalle', 'addome'], peso: { tipo: 'kettlebell', kg: [6, 8, 12, 16, 20] }, fac: 'hip_thrust' },

  // ── Core (riferimento: tenuta plank)
  { id: 'dead_bug', schema: 'core', liv: 1, att: [], unita: 'rip', pari: true, rif: 'plank', k: 0.3, min: 6, max: 16, sec: 3, eff: [2, 2, 2, 2, 5, 2], stress: {}, musc: ['addome'], musc2: ['obliqui'], dif: 'plank' },
  { id: 'plank', schema: 'core', liv: 2, att: [], unita: 'sec', rif: 'plank', k: 1, min: 15, max: 60, sec: 1, eff: [2, 3, 4, 1, 5, 3], stress: { spalle: 1, schiena: 1 }, musc: ['addome'], musc2: ['obliqui', 'spalle', 'glutei'], fac: 'dead_bug', dif: 'plank_laterale' },
  { id: 'plank_laterale', schema: 'core', liv: 3, att: [], unita: 'sec', lato: true, rif: 'plank', k: 0.5, min: 10, max: 40, sec: 1, eff: [2, 3, 3, 2, 4, 3], stress: { spalle: 2 }, musc: ['obliqui'], musc2: ['addome', 'spalle', 'glutei'], fac: 'plank', dif: 'hollow_hold' },
  { id: 'hollow_hold', schema: 'core', liv: 4, att: [], unita: 'sec', rif: 'plank', k: 0.5, min: 10, max: 40, sec: 1, eff: [2, 4, 3, 1, 3, 4], stress: { schiena: 2, collo: 1 }, musc: ['addome'], musc2: ['obliqui', 'quadricipiti'], fac: 'plank', dif: 'leg_raise' },
  { id: 'mountain_climber', schema: 'core', liv: 4, att: [], unita: 'rip', pari: true, rif: 'plank', k: 0.5, min: 10, max: 30, sec: 0.8, eff: [5, 2, 5, 1, 3, 4], stress: { spalle: 2, polsi: 2 }, musc: ['addome'], musc2: ['quadricipiti', 'spalle', 'obliqui'], fac: 'plank' },
  { id: 'leg_raise', schema: 'core', liv: 5, att: [], unita: 'rip', rif: 'plank', k: 0.2, min: 5, max: 15, sec: 3, eff: [2, 4, 3, 1, 3, 4], stress: { schiena: 2, anche: 1 }, musc: ['addome'], musc2: ['quadricipiti', 'obliqui'], fac: 'hollow_hold' },
  { id: 'ginocchia_petto_appeso', schema: 'core', liv: 4, att: [['sbarra']], unita: 'rip', rif: 'plank', k: 0.15, min: 4, max: 12, sec: 3, eff: [2, 4, 3, 1, 3, 4], stress: { spalle: 2 }, musc: ['addome'], musc2: ['avambracci', 'obliqui', 'quadricipiti'], fac: 'hollow_hold' },

  // ── Condizionamento (riferimento: burpees in 60")
  { id: 'step_jack', schema: 'cond', liv: 1, att: [], unita: 'rip', rif: 'burpees', k: 3, min: 15, max: 40, sec: 1, eff: [3, 1, 3, 1, 4, 1], stress: {}, musc: ['quadricipiti', 'spalle'], musc2: ['polpacci', 'glutei'], dif: 'jumping_jack' },
  { id: 'jumping_jack', schema: 'cond', liv: 2, att: [], unita: 'rip', rif: 'burpees', k: 3, min: 15, max: 40, sec: 0.9, eff: [4, 1, 4, 1, 4, 2], stress: { caviglie: 2, ginocchia: 1 }, impatto: true, musc: ['polpacci', 'spalle'], musc2: ['quadricipiti', 'glutei'], fac: 'step_jack', dif: 'burpees_senza_salto' },
  { id: 'burpees_senza_salto', schema: 'cond', liv: 3, att: [], unita: 'rip', rif: 'burpees', k: 1.3, min: 4, max: 15, sec: 4, eff: [4, 2, 4, 1, 3, 3], stress: { polsi: 2, spalle: 1, schiena: 1 }, musc: ['quadricipiti', 'addome'], musc2: ['spalle', 'glutei', 'petto'], fac: 'step_jack', dif: 'burpees' },
  { id: 'burpees', schema: 'cond', liv: 4, att: [], unita: 'rip', rif: 'burpees', k: 1, min: 4, max: 15, sec: 4, eff: [5, 3, 5, 1, 3, 5], stress: { polsi: 2, spalle: 2, ginocchia: 2, schiena: 1 }, impatto: true, espl: true, musc: ['quadricipiti', 'petto'], musc2: ['addome', 'spalle', 'glutei', 'tricipiti'], fac: 'burpees_senza_salto' },
  { id: 'skip_alto', schema: 'cond', liv: 4, att: [], unita: 'rip', pari: true, rif: 'burpees', k: 3.5, min: 20, max: 50, sec: 0.5, eff: [5, 1, 5, 1, 3, 4], stress: { ginocchia: 2, caviglie: 2 }, impatto: true, espl: true, musc: ['quadricipiti', 'polpacci'], musc2: ['addome', 'glutei'], fac: 'jumping_jack' },
  { id: 'salto_corda', schema: 'cond', liv: 3, att: [['corda']], unita: 'rip', rif: 'burpees', k: 5, min: 30, max: 80, sec: 0.45, eff: [5, 1, 5, 1, 3, 4], stress: { caviglie: 2, ginocchia: 1, polsi: 1 }, impatto: true, musc: ['polpacci'], musc2: ['quadricipiti', 'spalle', 'avambracci'], fac: 'step_jack' },

  // ── Mobilità (per il focus, il riscaldamento e il defaticamento): valori fissi in secondi
  { id: 'cat_cow', schema: 'mobilita', liv: 1, att: [], unita: 'sec', fisso: 30, min: 20, max: 60, sec: 1, eff: [1, 1, 1, 5, 4, 1], stress: { polsi: 1 }, musc: ['lombari'], musc2: ['addome', 'trapezio'] },
  { id: 'worlds_greatest', schema: 'mobilita', liv: 1, att: [], unita: 'sec', fisso: 40, min: 20, max: 60, sec: 1, eff: [2, 1, 2, 5, 4, 2], stress: { polsi: 1, anche: 1 }, musc: ['adduttori', 'femorali'], musc2: ['glutei', 'dorsali', 'obliqui'] },
  { id: 'squat_profondo', schema: 'mobilita', liv: 1, att: [], unita: 'sec', fisso: 30, min: 20, max: 60, sec: 1, eff: [1, 1, 1, 5, 4, 2], stress: { ginocchia: 2, anche: 1, caviglie: 1 }, musc: ['adduttori', 'glutei'], musc2: ['quadricipiti', 'polpacci'] },
  { id: 'rotazioni_toraciche', schema: 'mobilita', liv: 1, att: [], unita: 'sec', fisso: 30, min: 20, max: 60, sec: 1, eff: [1, 1, 1, 5, 4, 1], stress: {}, musc: ['obliqui', 'dorsali'], musc2: ['trapezio'] },
  { id: 'novanta_novanta', schema: 'mobilita', liv: 1, att: [], unita: 'sec', fisso: 40, min: 20, max: 60, sec: 1, eff: [1, 1, 1, 5, 4, 1], stress: { anche: 1, ginocchia: 1 }, musc: ['glutei'], musc2: ['adduttori', 'obliqui'] },
];

export const PER_ID = Object.fromEntries(ESERCIZI.map(e => [e.id, e]));
export const SCHEMI = ['spinta', 'trazione', 'gambe', 'posteriore', 'core', 'cond', 'mobilita'];
export const ZONE = ['spalle', 'gomiti', 'polsi', 'schiena', 'anche', 'ginocchia', 'caviglie', 'collo'];
