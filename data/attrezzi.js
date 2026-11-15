// Inventario degli attrezzi di casa. fascia: '€' sotto i 30 euro, '€€' da 30 a 100, '€€€' oltre 100.
// conKg: l'utente indica i kg disponibili. kgTipici: usati per simulare l'acquisto in "Cosa comprare dopo".
export const ATTREZZI = [
  { id: 'elastici', fascia: '€' },
  { id: 'sbarra', fascia: '€' },
  { id: 'pushup_bars', fascia: '€' },
  { id: 'parallele', fascia: '€€' },
  { id: 'manubri', fascia: '€€', conKg: true, kgTipici: [5, 10] },
  { id: 'kettlebell', fascia: '€€', conKg: true, kgTipici: [8, 12] },
  { id: 'panca', fascia: '€€€' },
  { id: 'anelli', fascia: '€€' },
  { id: 'corda', fascia: '€' },
  { id: 'tappetino', fascia: '€' },
];
