// Prove del test e soglie dei livelli. File pensato per essere modificato a mano.
// Ogni riga di SOGLIE contiene 4 valori: il minimo per i livelli 2, 3, 4 e 5 (sotto il primo valore = livello 1).
// Ripetizioni in 60" per squat, piegamenti e burpees; secondi di tenuta per plank e superman; ripetizioni massime per le trazioni.
export const RECUPERO_SEC = 90;
export const TENUTA_MAX_SEC = 300;

export const PROVE = [
  { id: 'squat', tipo: 'rip', durata: 60, area: 'gambe' },
  { id: 'piegamenti', tipo: 'rip', durata: 60, area: 'spinta', facilitata: 0.55 }, // sulle ginocchia: vale il 55%
  { id: 'burpees', tipo: 'rip', durata: 60, area: 'cond', facilitata: 0.7 },       // senza salto e piegamento: vale il 70%
  { id: 'plank', tipo: 'tenuta', area: 'core' },
  { id: 'superman', tipo: 'tenuta', area: 'posteriore' },
];
export const PROVA_TRAZIONI = { id: 'trazioni', tipo: 'max', area: 'trazione' };

export const SOGLIE = {
  squat:      { generale: [19, 28, 38, 47], M: [20, 30, 40, 50], F: [18, 27, 36, 45] },
  piegamenti: { generale: [5, 12, 22, 33],  M: [8, 18, 30, 42],  F: [3, 8, 16, 25] },
  burpees:    { generale: [7, 12, 16, 21],  M: [8, 13, 18, 23],  F: [6, 11, 15, 20] },
  plank:      { generale: [30, 55, 100, 160], M: [30, 60, 105, 165], F: [25, 50, 90, 150] },
  superman:   { generale: [20, 40, 70, 110], M: [20, 40, 70, 110], F: [20, 40, 70, 110] },
  trazioni:   { generale: [1, 3, 6, 10],    M: [1, 4, 8, 13],    F: [1, 2, 4, 7] },
};

// Le soglie si moltiplicano per questo fattore in base all'età.
export const FASCE_ETA = [
  { fino: 29, f: 1 }, { fino: 39, f: 0.95 }, { fino: 49, f: 0.88 }, { fino: 59, f: 0.8 }, { fino: 200, f: 0.7 },
];
