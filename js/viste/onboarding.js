// Benvenuto, installazione guidata e onboarding in 8 passi. Gli stessi passi servono per le modifiche dal Profilo.
import { S, salva } from '../stato.js';
import { t, tn } from '../i18n.js';
import { registra, vai, disegna } from '../router.js';
import { esc, ico, toast, interruttore, intestazione } from '../ui.js';
import { OBIETTIVI, GIORNI_PREDEFINITI } from '../logica.js';
import { ATTREZZI } from '../../data/attrezzi.js';
import { ZONE } from '../../data/esercizi.js';
import { copia } from '../util.js';
import { eIOS, eAndroid, installata, puoInstallare, installa, chiediPersistenza } from '../piattaforma.js';
import { ripristinaDaFile } from './profilo.js';

const MARCHE = ['garmin', 'apple', 'fitbit', 'polar', 'suunto', 'coros', 'amazfit', 'samsung', 'altro'];
const ESPERIENZE = ['mai', 'fermo', 'regolare', 'avanzato'];
export const LOGO = (dim = 56) => `<svg width="${dim}" height="${dim}" viewBox="0 0 64 64" aria-hidden="true"><path d="M50.4 13.6A26 26 0 1 0 58 32" fill="none" stroke="var(--ar)" stroke-width="9" stroke-linecap="round"/><circle cx="32" cy="32" r="7" fill="var(--ar)"/></svg>`;

let B = null, passo = 0, origine = '';
const profiloVuoto = () => ({ nome: '', eta: '', sesso: null, altezza: '', peso: '', sicurezza: { risposte: Array(7).fill(null), gravidanza: null, conferma: false, cauto: false },
  obiettivi: [], esperienza: null, infortuni: [], zoneMeno: [], giorni: 3, giorniSett: [1, 3, 5], durata: 20 });
const nuovaBozza = () => ({ profilo: { ...profiloVuoto(), ...copia(S.profilo || {}) }, attrezzi: copia(S.attrezzi), orologio: copia(S.orologio || { marca: null, modello: '', usa: false }) });
const chip = (azione, v, testo, acceso, cls = '') => `<button class="chip ${cls}" data-a="${azione}" data-v="${v}" aria-pressed="${acceso ? 'true' : 'false'}">${esc(testo)}</button>`;
const siAlmenoUno = p => p.sicurezza.risposte.some(r => r === true) || p.sicurezza.gravidanza === true;

const PASSI = [
  { id: 'chi',
    html: ({ profilo: p }) => `
      <label class="campo">${t('onb.chi.nome')}<input data-i="campo" data-k="nome" value="${esc(p.nome)}" maxlength="18" autocomplete="nickname"></label>
      <label class="campo">${t('onb.chi.eta')}<input data-i="campo" data-k="eta" type="number" inputmode="numeric" min="12" max="99" value="${esc(p.eta)}"></label>
      <div class="col stretti"><span class="pic forte sec">${t('onb.chi.sesso')}</span>
        <div class="fila">${chip('sesso', 'F', t('onb.chi.f'), p.sesso === 'F')}${chip('sesso', 'M', t('onb.chi.m'), p.sesso === 'M')}</div></div>
      <div class="griglia2"><label class="campo">${t('onb.chi.altezza')}<input data-i="campo" data-k="altezza" type="number" inputmode="numeric" value="${esc(p.altezza)}"></label>
        <label class="campo">${t('onb.chi.peso')}<input data-i="campo" data-k="peso" type="number" inputmode="decimal" value="${esc(p.peso)}"></label></div>
      <p class="pic sec">${t('onb.chi.nota')}</p>`,
    valido: ({ profilo: p }) => String(p.nome).trim().length > 0 && Number(p.eta) >= 12 && Number(p.eta) <= 99 },
  { id: 'sicurezza',
    html: ({ profilo: p }) => `
      <button class="btn piccolo" data-a="tutteNo" style="align-self:flex-start">${t('onb.sic.tutteNo')}</button>
      ${t('onb.sic.domande').map((d, i) => `<div class="card col stretti"><span style="font-weight:600">${esc(d)}</span>
        <div class="fila">${[true, false].map(v => `<button class="chip due" data-a="sic" data-n="${i}" data-v="${v ? 1 : 0}" aria-pressed="${p.sicurezza.risposte[i] === v}">${v ? t('comune.si') : t('comune.no')}</button>`).join('')}</div></div>`).join('')}
      <div class="card col stretti"><span style="font-weight:600">${t('onb.sic.gravidanza')} <span class="sec pic">${t('comune.facoltativa')}</span></span>
        <div class="fila">${[true, false].map(v => `<button class="chip due" data-a="grav" data-v="${v ? 1 : 0}" aria-pressed="${p.sicurezza.gravidanza === v}">${v ? t('comune.si') : t('comune.no')}</button>`).join('')}</div></div>
      ${siAlmenoUno(p) ? `<div class="card tenue avviso"><span class="tondo">${ico('attenzione')}</span><div class="col stretti"><h3>${t('onb.sic.avvisoTitolo')}</h3><p>${t('onb.sic.avviso')}</p>
        <div class="fila tra" style="margin-top:6px"><span class="forte">${t('onb.sic.conferma')}</span>${interruttore('sicConferma', p.sicurezza.conferma, t('onb.sic.conferma'))}</div></div></div>` : ''}`,
    valido: ({ profilo: p }) => p.sicurezza.risposte.every(r => r !== null) && (!siAlmenoUno(p) || p.sicurezza.conferma) },
  { id: 'obiettivi',
    html: ({ profilo: p }) => `<div class="griglia2">${OBIETTIVI.map(o => { const i = p.obiettivi.indexOf(o); return `<button class="tessera" data-a="ob" data-v="${o}" aria-pressed="${i >= 0}">
        ${i >= 0 ? `<span class="badge">${i + 1}</span>` : ''}${ico(t('obiettivi.' + o + '.icona'), 26)}<span>${t('obiettivi.' + o + '.nome')}</span><small>${t('obiettivi.' + o + '.desc')}</small></button>`; }).join('')}</div>`,
    valido: ({ profilo: p }) => p.obiettivi.length >= 1 },
  { id: 'esperienza',
    html: ({ profilo: p }) => `<div class="col">${ESPERIENZE.map(e => `<button class="tessera bassa" data-a="esp" data-v="${e}" aria-pressed="${p.esperienza === e}"><span>${t('esperienza.' + e + '.nome')}</span><small>${t('esperienza.' + e + '.desc')}</small></button>`).join('')}</div>`,
    valido: ({ profilo: p }) => !!p.esperienza },
  { id: 'zone',
    html: ({ profilo: p }) => `
      <div class="col stretti"><h3>${t('onb.zone.infortuni')}</h3><p class="pic sec">${t('onb.zone.infortuniDesc')}</p>
        <div class="fila avvolgi stretti">${ZONE.map(z => chip('zonaInf', z, t('zone.' + z), p.infortuni.includes(z))).join('')}</div></div>
      <div class="col stretti" style="margin-top:8px"><h3>${t('onb.zone.meno')}</h3><p class="pic sec">${t('onb.zone.menoDesc')}</p>
        <div class="fila avvolgi stretti">${ZONE.map(z => chip('zonaMeno', z, t('zone.' + z), p.zoneMeno.includes(z), 'due')).join('')}</div></div>`,
    valido: () => true },
  { id: 'disponibilita',
    html: ({ profilo: p }) => {
      const tipi = p.giorni <= 4 ? 'ABCD'.slice(0, p.giorni).split('') : p.giorni === 5 ? ['A', 'B', 'E', 'C', 'D'] : ['A', 'E', 'B', 'C', 'F', 'D'];
      return `<div class="col stretti"><h3>${t('onb.disp.giorni')}</h3>
        <div class="seg">${[2, 3, 4, 5, 6].map(n => `<button data-a="giorni" data-v="${n}" aria-pressed="${p.giorni === n}">${n}</button>`).join('')}</div></div>
      <div class="col stretti"><h3>${t('onb.disp.quali')}</h3>
        <div class="settimana">${t('comune.giorniBrevi').map((g, i) => `<div><button class="g ${p.giorniSett.includes(i + 1) ? 'fatto' : ''}" data-a="giornoSett" data-v="${i + 1}" aria-pressed="${p.giorniSett.includes(i + 1)}" aria-label="${t('comune.giorni')[i]}">${g}</button></div>`).join('')}</div></div>
      <div class="col stretti"><h3>${t('onb.disp.durata')}</h3>
        <div class="seg">${[10, 15, 20].map(n => `<button data-a="durata" data-v="${n}" aria-pressed="${p.durata === n}">${n} min${n === 20 ? ' · ' + t('onb.disp.consigliato') : ''}</button>`).join('')}</div></div>
      <div class="card col stretti"><h3>${t('onb.disp.risultato')}</h3>
        <p>${tn('onb.disp.riepilogo', p.giorni, { min: p.durata })}</p>
        <div class="fila avvolgi stretti">${[...p.giorniSett].sort().map((g, i) => `<span class="pill ${'EF'.includes(tipi[i]) ? '' : 'ar'}">${t('comune.giorniCorti')[g - 1]} · ${tipi[i]}</span>`).join('')}</div>
        ${p.giorni >= 5 ? `<p class="pic sec">${t('onb.disp.leggeri')}</p>` : ''}</div>`; },
    valido: ({ profilo: p }) => p.giorniSett.length === p.giorni },
  { id: 'attrezzatura',
    html: ({ attrezzi: a }) => `
      <button class="tessera bassa" data-a="soloCorpo" aria-pressed="${!Object.keys(a).length}"><span>${t('onb.att.soloCorpo')}</span><small>${t('onb.att.soloCorpoDesc')}</small></button>
      ${ATTREZZI.map(x => `<div class="card col stretti"><div class="fila tra"><span class="forte">${t('attrezzi.' + x.id)}</span>${interruttore('att', !!a[x.id], t('attrezzi.' + x.id), `data-v="${x.id}"`)}</div>
        ${x.conKg && a[x.id] ? `<label class="campo">${t('onb.att.kg')}<input data-i="kg" data-v="${x.id}" inputmode="decimal" placeholder="${t('onb.att.kgEsempio')}" value="${esc((a[x.id].kg || []).join(', '))}"></label>` : ''}</div>`).join('')}`,
    valido: () => true },
  { id: 'orologio',
    html: ({ orologio: o }) => `
      <div class="fila avvolgi stretti">${chip('marca', '', t('onb.oro.nessuno'), !o.marca)}${MARCHE.map(m => chip('marca', m, t('marche.' + m), o.marca === m)).join('')}</div>
      ${o.marca ? `<label class="campo">${t('onb.oro.modello')}<input data-i="modello" value="${esc(o.modello)}" placeholder="${t('onb.oro.modelloEsempio')}"></label>
        <div class="card fila tra"><div class="col stretti"><span class="forte">${t('onb.oro.usa')}</span><span class="pic sec">${t('onb.oro.usaDesc')}</span></div>${interruttore('usaOro', o.usa, t('onb.oro.usa'))}</div>` : ''}`,
    valido: () => true },
];
const idx = id => PASSI.findIndex(p => p.id === id);

function aggiornaBottone() { const b = document.getElementById('avanti'); if (b) b.disabled = !PASSI[passo].valido(B); }
const alterna = (lista, v) => { const i = lista.indexOf(v); if (i >= 0) lista.splice(i, 1); else lista.push(v); };
const AZIONI = {
  campo: el => { B.profilo[el.dataset.k] = el.value; aggiornaBottone(); },
  sesso: el => { B.profilo.sesso = B.profilo.sesso === el.dataset.v ? null : el.dataset.v; disegna(); },
  tutteNo: () => { B.profilo.sicurezza.risposte = Array(7).fill(false); disegna(); },
  sic: el => { B.profilo.sicurezza.risposte[+el.dataset.n] = el.dataset.v === '1'; disegna(); },
  grav: el => { const v = el.dataset.v === '1'; B.profilo.sicurezza.gravidanza = B.profilo.sicurezza.gravidanza === v ? null : v; disegna(); },
  sicConferma: () => { B.profilo.sicurezza.conferma = !B.profilo.sicurezza.conferma; disegna(); },
  ob: el => { const o = B.profilo.obiettivi, v = el.dataset.v;
    if (o.includes(v)) o.splice(o.indexOf(v), 1); else if (o.length >= 2) return toast(t('onb.ob.massimo')); else o.push(v);
    disegna(); },
  esp: el => { B.profilo.esperienza = el.dataset.v; disegna(); },
  zonaInf: el => { alterna(B.profilo.infortuni, el.dataset.v); B.profilo.zoneMeno = B.profilo.zoneMeno.filter(z => z !== el.dataset.v); disegna(); },
  zonaMeno: el => { alterna(B.profilo.zoneMeno, el.dataset.v); B.profilo.infortuni = B.profilo.infortuni.filter(z => z !== el.dataset.v); disegna(); },
  giorni: el => { B.profilo.giorni = +el.dataset.v; B.profilo.giorniSett = [...GIORNI_PREDEFINITI[B.profilo.giorni]]; disegna(); },
  giornoSett: el => { const g = B.profilo.giorniSett; alterna(g, +el.dataset.v); g.sort();
    if (g.length < 2 || g.length > 6) { alterna(g, +el.dataset.v); g.sort(); return toast(t('onb.disp.limiti')); }
    B.profilo.giorni = g.length; disegna(); },
  durata: el => { B.profilo.durata = +el.dataset.v; disegna(); },
  soloCorpo: () => { B.attrezzi = {}; disegna(); },
  att: el => { const id = el.dataset.v, x = ATTREZZI.find(a => a.id === id);
    if (B.attrezzi[id]) delete B.attrezzi[id]; else B.attrezzi[id] = x.conKg ? { kg: [] } : true;
    disegna(); },
  kg: el => { B.attrezzi[el.dataset.v] = { kg: [...new Set((el.value.match(/\d+([.,]\d+)?/g) || []).map(n => parseFloat(n.replace(',', '.'))).filter(n => n > 0 && n < 100))].sort((a, b) => a - b) }; },
  marca: el => { B.orologio.marca = el.dataset.v || null; if (!B.orologio.marca) B.orologio.usa = false; disegna(); },
  modello: el => { B.orologio.modello = el.value; },
  usaOro: () => { B.orologio.usa = !B.orologio.usa; disegna(); },
};
async function salvaBozza() {
  const p = B.profilo;
  p.nome = String(p.nome).trim(); p.eta = Number(p.eta);
  p.altezza = p.altezza ? Number(p.altezza) : ''; p.peso = p.peso ? Number(String(p.peso).replace(',', '.')) : '';
  p.sicurezza.cauto = siAlmenoUno(p);
  const nuovi = Object.keys(B.attrezzi).filter(a => !S.attrezzi[a]);
  S.profilo = p; S.attrezzi = B.attrezzi; S.orologio = B.orologio.marca ? B.orologio : null;
  if (S.piano && nuovi.length) S.stato.nuoviAttrezzi = nuovi;
  await salva('profilo', 'attrezzi', 'orologio', 'stato');
}

registra('benvenuto', () => ({
  html: `<main class="pagina piena" style="justify-content:center">
    <div class="col" style="align-items:flex-start;gap:14px">${LOGO(72)}<h1 style="font-size:44px">HoMRAP</h1>
      <p class="art forte" style="font-size:20px">${t('benvenuto.motto')}</p><p class="sec">${t('benvenuto.testo')}</p></div>
    <div class="card avviso"><span class="tondo">${ico('scudo')}</span><p class="pic">${t('benvenuto.avviso')}</p></div>
    <div class="card avviso"><span class="tondo">${ico('telefono')}</span><p class="pic">${t('benvenuto.privacy')}</p></div>
    <div class="spazio"></div>
    <a class="btn primario largo" href="#/installa">${t('benvenuto.inizia')}</a>
    <label class="btn testo largo" style="cursor:pointer">${t('benvenuto.ripristina')}<input type="file" accept=".json,application/json" hidden data-c="ripristina"></label></main>`,
  azioni: { ripristina: el => ripristinaDaFile(el.files[0], () => vai('oggi')) },
}));

registra('installa', () => {
  const tipo = installata() ? 'fatta' : eIOS ? 'ios' : eAndroid ? 'android' : 'altro';
  return {
    html: `<main class="pagina piena"><h1>${t('installa.titolo')}</h1><p class="sec">${t('installa.' + tipo + '.testo')}</p>
      ${tipo === 'fatta' ? '' : `<div class="col">${t('installa.' + tipo + '.passi').map((p, i) => `<div class="riga alta"><span class="tondo ar">${i + 1}</span><span class="cresce" style="font-weight:600">${esc(p)}</span></div>`).join('')}</div>`}
      ${tipo === 'ios' ? `<div class="card tenue avviso"><span class="tondo">${ico('attenzione')}</span><p class="pic">${t('installa.ios.avviso')}</p></div>` : ''}
      <div class="spazio"></div>
      ${tipo === 'android' || tipo === 'altro' ? `<button class="btn primario largo" data-a="installa" ${puoInstallare() ? '' : 'hidden'} id="btn-installa">${ico('scarica')}${t('installa.bottone')}</button>` : ''}
      <button class="btn ${tipo === 'fatta' ? 'primario' : ''} largo" data-a="continua">${t(tipo === 'fatta' ? 'comune.continua' : 'installa.dopo')}</button></main>`,
    azioni: {
      installa: async () => { if (await installa()) toast(t('installa.riuscita')); },
      continua: async () => { S.stato.installVisto = true; await salva('stato'); chiediPersistenza(); vai(S.stato.onboarding ? 'profilo' : 'onboarding'); },
    },
  };
});

registra('onboarding', () => {
  if (!B || origine !== 'onboarding') { B = nuovaBozza(); passo = 0; origine = 'onboarding'; }
  const P = PASSI[passo];
  return {
    html: `<main class="pagina piena">
      <div class="fila"><button class="ico-btn" data-a="indietro" aria-label="${t('comune.indietro')}">${ico('indietro')}</button>
        <div class="avanzamento" aria-hidden="true">${PASSI.map((_, i) => `<i class="${i <= passo ? 'f' : ''}"></i>`).join('')}</div>
        <span class="num sec" style="font-size:20px">${passo + 1}/${PASSI.length}</span></div>
      <div><h1>${t('onb.' + P.id + '.titolo')}</h1><p class="sec" style="margin-top:6px">${t('onb.' + P.id + '.sotto')}</p></div>
      ${P.html(B)}
      <div class="fondo-fisso"><button class="btn primario largo" id="avanti" data-a="avanti" ${P.valido(B) ? '' : 'disabled'}>${t(passo === PASSI.length - 1 ? 'onb.fine' : 'comune.continua')}</button></div></main>`,
    azioni: { ...AZIONI,
      indietro: () => { if (passo === 0) { B = null; return vai(S.stato.onboarding ? 'profilo' : 'installa'); } passo--; disegna(false); },
      avanti: async () => {
        if (passo < PASSI.length - 1) { passo++; return disegna(false); }
        await salvaBozza(); S.stato.onboarding = true; await salva('stato'); B = null; vai('test/iniziale');
      } },
  };
});

// Modifica di un solo passo dal Profilo: #/modifica/<id>
registra('modifica', ([id]) => {
  if (!B || origine !== 'modifica:' + id) { B = nuovaBozza(); origine = 'modifica:' + id; }
  passo = Math.max(0, idx(id));
  const P = PASSI[passo];
  return {
    html: `<main class="pagina piena">${intestazione(t('onb.' + P.id + '.titolo'))}<p class="sec">${t('onb.' + P.id + '.sotto')}</p>
      ${P.html(B)}
      <div class="fondo-fisso"><button class="btn primario largo" id="avanti" data-a="salva" ${P.valido(B) ? '' : 'disabled'}>${t('comune.salva')}</button></div></main>`,
    azioni: { ...AZIONI, salva: async () => {
      await salvaBozza(); B = null; toast(t('comune.salvato'));
      vai(S.piano && ['sicurezza', 'obiettivi', 'esperienza', 'zone', 'disponibilita', 'attrezzatura'].includes(P.id) ? 'piano/aggiorna' : 'profilo');
    } },
    esci: () => { B = null; },
  };
});
