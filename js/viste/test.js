// Test iniziale e mensile (5 prove + trazioni facoltative) e schermata del risultato.
import { S, salva, salvaTest, oggi, ultimoTest } from '../stato.js';
import { t, tn } from '../i18n.js';
import { registra, vai, disegna } from '../router.js';
import { esc, ico, conferma, interruttore } from '../ui.js';
import { PROVE, PROVA_TRAZIONI, RECUPERO_SEC, TENUTA_MAX_SEC } from '../../data/soglie-test.js';
import { valutaTest, valoreEq, miglioramento, AREE } from '../logica.js';
import { uid, mmss } from '../util.js';
import { bip, parla, vibra, schermoAcceso, sbloccaAudio } from '../audio.js';

let T = null, tic = null;
const ora = () => Date.now();
const provaCorrente = () => (T.i < PROVE.length ? PROVE[T.i] : PROVA_TRAZIONI);
const ferma = () => { clearInterval(tic); tic = null; };

function nuovo(tipo) {
  const prec = ultimoTest();
  T = { tipo, i: 0, fase: 'intro', ris: {}, conta: 0, t0: 0, tenuta: 0, detto: {}, conTrazioni: !!S.attrezzi.sbarra,
    fac: { piegamenti: !!(prec && prec.ris.piegamenti && prec.ris.piegamenti.fac), burpees: !!(prec && prec.ris.burpees && prec.ris.burpees.fac) } };
}
function passa(fase) {
  T.fase = fase; T.t0 = ora(); T.detto = {};
  ferma();
  if (['conto', 'via', 'recupero'].includes(fase)) tic = setInterval(batti, 200);
  disegna(false);
}
function batti() {
  const s = (ora() - T.t0) / 1000, p = provaCorrente(), el = document.getElementById('t-tempo');
  const unaVolta = (k, f) => { if (!T.detto[k]) { T.detto[k] = 1; f(); } };
  if (T.fase === 'conto') {
    const n = 3 - Math.floor(s);
    if (n <= 0) { bip(1320, 0.3); parla(t('voce.via')); vibra(120); return passa('via'); }
    unaVolta('c' + n, () => bip(880));
    if (el) el.textContent = n;
  } else if (T.fase === 'via') {
    if (p.tipo === 'rip') {
      const r = p.durata - s;
      if (r <= 0) { bip(660, 0.6); parla(t('voce.stop')); vibra([200, 100, 200]); return passa('fatto'); }
      if (r <= 30) unaVolta('m', () => parla(t('voce.trentaSecondi')));
      if (r <= 10) unaVolta('d', () => parla(t('voce.dieciSecondi')));
      if (r <= 3) unaVolta('f' + Math.ceil(r), () => bip(880));
      if (el) el.textContent = mmss(Math.ceil(r));
    } else if (p.tipo === 'tenuta') {
      if (s >= TENUTA_MAX_SEC) return fermaTenuta();
      if (s >= 30 && Math.floor(s) % 30 === 0) unaVolta('t' + Math.floor(s), () => bip(990, 0.08));
      if (el) el.textContent = mmss(Math.floor(s));
    }
  } else if (T.fase === 'recupero') {
    const r = RECUPERO_SEC - s;
    if (r <= 0) { bip(1100, 0.3); parla(t('voce.recuperoFinito')); return passa('pronto'); }
    if (r <= 10) unaVolta('r', () => parla(t('voce.dieciSecondi')));
    if (el) el.textContent = mmss(Math.ceil(r));
  }
}
function fermaTenuta() {
  T.tenuta = Math.min(TENUTA_MAX_SEC, Math.round((ora() - T.t0) / 1000));
  bip(660, 0.4); vibra(200); passa('fatto');
}
async function confermaProva() {
  const p = provaCorrente();
  const r = { v: p.tipo === 'tenuta' ? T.tenuta : T.conta };
  if (p.facilitata && T.fac[p.id]) r.fac = true;
  T.ris[p.id] = r; T.conta = 0; T.tenuta = 0;
  if (p.id === 'trazioni' || (T.i === PROVE.length - 1 && !T.conTrazioni)) return concludi();
  T.i++;
  passa('recupero');
}
async function concludi() {
  ferma(); schermoAcceso(false);
  await salvaTest({ id: uid(), ts: ora(), data: oggi(), tipo: T.tipo, ris: T.ris, blocco: S.piano ? S.piano.blocco : 0 });
  if (T.tipo !== 'iniziale') { S.backup.daRicordare = true; await salva('backup'); }
  T = null;
  vai('risultato', true);
}
const fmtProva = (id, r) => !r ? '—' : (id === 'plank' || id === 'superman' ? mmss(r.v) : String(r.v)) + (r.fac ? '*' : '');

registra('test', ([tipo = 'mensile']) => {
  if (!T || T.tipo !== tipo) nuovo(tipo);
  const p = provaCorrente(), n = PROVE.length, testa = (titolo) => `<div class="fila tra"><button class="ico-btn" data-a="esci" aria-label="${t('comune.chiudi')}">${ico('x')}</button><span class="pic forte sec">${esc(titolo)}</span><span style="width:46px"></span></div>`;
  let html;
  if (T.fase === 'intro') {
    html = `${testa(t('test.' + tipo))}
      <h1>${t('test.introTitolo')}</h1><p class="sec">${t('test.introTesto')}</p>
      <div class="col">${PROVE.map((x, i) => `<div class="riga"><span class="tondo">${i + 1}</span><span class="cresce" style="font-weight:600">${t('prove.' + x.id + '.nome')}</span><span class="pill">${t('prove.' + x.id + '.misura')}</span></div>`).join('')}
        ${T.conTrazioni ? `<div class="riga"><span class="tondo">+</span><span class="cresce" style="font-weight:600">${t('prove.trazioni.nome')}</span><span class="pill">${t('comune.facoltativa')}</span></div>` : ''}</div>
      <div class="card avviso"><span class="tondo">${ico('scudo')}</span><p class="pic">${t('test.introAvviso')}</p></div>
      <div class="spazio"></div><button class="btn primario largo" data-a="inizia">${t('test.inizia')}</button>`;
  } else if (T.fase === 'recupero') {
    html = `${testa(t('test.recupero'))}
      <div class="spazio"></div><div class="centro"><p class="sec forte">${t('test.recuperoTesto')}</p><div class="tempo" id="t-tempo">${mmss(RECUPERO_SEC)}</div></div>
      <div class="card"><span class="pic forte art">${t('test.prossima')}</span><h2 style="margin:2px 0 0">${t('prove.' + p.id + '.nome')}</h2><p class="sec pic">${t('prove.' + p.id + '.regole')}</p></div>
      <div class="spazio"></div><button class="btn largo" data-a="saltaRecupero">${t('test.saltaRecupero')}</button>`;
  } else {
    const inCorso = T.fase === 'via' || T.fase === 'conto', tenuta = p.tipo === 'tenuta', libera = p.tipo === 'max';
    const titolo = p.id === 'trazioni' ? t('test.provaFacoltativa') : t('test.provaDi', { i: T.i + 1, n });
    let centro, sotto;
    if (T.fase === 'conto') { centro = `<div class="gigante centro art" id="t-tempo">3</div>`; sotto = ''; }
    else if (tenuta) {
      centro = `<div class="tempo centro" id="t-tempo">${mmss(T.fase === 'fatto' ? T.tenuta : 0)}</div>`;
      sotto = T.fase === 'pronto' ? `<button class="btn primario largo" data-a="via">${t('test.avvio')}</button>`
        : T.fase === 'via' ? `<button class="piu-giro" data-a="stop" style="min-height:120px"><span class="num">${t('test.stop')}</span><span>${t('test.stopDesc')}</span></button>`
        : `<button class="btn primario largo" data-a="conferma">${t('comune.conferma')}</button><button class="btn largo" data-a="ripeti">${t('test.ripeti')}</button>`;
    } else {
      const contatore = `<div class="contatore"><button class="meno" data-a="meno" aria-label="${t('test.meno')}">−</button><span class="gigante" id="t-conta" style="min-width:150px;text-align:center">${T.conta}</span><button class="piu" data-a="piu" aria-label="${t('test.piu')}">+1</button></div>`;
      centro = (libera ? '' : `<div class="num centro ${T.fase === 'fatto' ? 'sec' : ''}" id="t-tempo" style="font-size:56px;line-height:1">${T.fase === 'fatto' ? t('test.tempoScaduto') : mmss(p.durata)}</div>`) + (T.fase === 'pronto' && !libera ? '' : contatore);
      sotto = T.fase === 'pronto' && !libera ? `<button class="btn primario largo" data-a="via">${t('test.via')}</button>`
        : T.fase === 'via' ? '' : `<button class="btn primario largo" data-a="conferma">${t('comune.conferma')}</button>${p.id === 'trazioni' ? `<button class="btn largo" data-a="saltaTrazioni">${t('test.saltaProva')}</button>` : `<button class="btn largo" data-a="ripeti">${t('test.ripeti')}</button>`}`;
    }
    html = `${testa(titolo)}
      <div><h1>${t('prove.' + p.id + '.nome')}${p.facilitata && T.fac[p.id] ? ` <span class="pill ar" style="vertical-align:middle">${t('test.facilitata')}</span>` : ''}</h1>
        <p class="sec" style="margin-top:6px">${t('prove.' + p.id + (p.facilitata && T.fac[p.id] ? '.regoleFac' : '.regole'))}</p></div>
      ${inCorso ? '' : `<div class="card"><ul class="punti pic">${t('prove.' + p.id + '.consigli').map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
        ${p.facilitata && T.fase === 'pronto' ? `<div class="card fila tra"><div class="col stretti"><span class="forte">${t('test.varianteFacilitata')}</span><span class="pic sec">${t('prove.' + p.id + '.facilitata')}</span></div>${interruttore('fac', T.fac[p.id], t('test.varianteFacilitata'))}</div>` : ''}`}
      <div class="spazio"></div>${centro}<div class="spazio"></div>${sotto}`;
  }
  return {
    html: `<main class="pagina piena">${html}</main>`,
    azioni: {
      esci: async () => { if (await conferma(t('test.esciTitolo'), t('test.esciTesto'), t('test.esciOk'), t('comune.continua'))) { ferma(); schermoAcceso(false); T = null; vai('oggi'); } },
      inizia: () => { sbloccaAudio(); schermoAcceso(true); passa('pronto'); },
      fac: () => { const id = provaCorrente().id; T.fac[id] = !T.fac[id]; disegna(); },
      via: () => { sbloccaAudio(); T.conta = 0; passa('conto'); },
      piu: () => { T.conta++; vibra(20); const el = document.getElementById('t-conta'); if (el) el.textContent = T.conta; },
      meno: () => { T.conta = Math.max(0, T.conta - 1); const el = document.getElementById('t-conta'); if (el) el.textContent = T.conta; },
      stop: fermaTenuta,
      ripeti: () => { T.conta = 0; T.tenuta = 0; passa('pronto'); },
      conferma: confermaProva,
      saltaRecupero: () => passa('pronto'),
      saltaTrazioni: concludi,
    },
    esci: () => { ferma(); schermoAcceso(false); },
  };
});

// ── Risultato del test e livello
export const barraLivello = a => `<div class="livello" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i><b style="width:${i <= a.liv ? 100 : i === a.liv + 1 ? Math.round(a.fraz * 100) : 0}%"></b></i>`).join('')}</div>`;
export function tabellaTest(prima, dopo) {
  const prove = [...PROVE, ...(dopo.ris.trazioni && prima.ris.trazioni ? [PROVA_TRAZIONI] : [])];
  return `<table class="tab">${prove.map(p => {
    const a = valoreEq(p.id, prima.ris[p.id]), b = valoreEq(p.id, dopo.ris[p.id]), d = a ? Math.round((b - a) / a * 100) : null;
    return `<tr><td>${t('prove.' + p.id + '.nome')}</td><td class="num" style="font-size:18px"><span class="sec">${fmtProva(p.id, prima.ris[p.id])} →</span> ${fmtProva(p.id, dopo.ris[p.id])}</td>
      <td style="width:70px">${d == null ? '' : `<span class="pill ${d > 0 ? 'ar' : ''}">${d > 0 ? '+' : ''}${d}%</span>`}</td></tr>`; }).join('')}</table>`;
}
registra('risultato', () => {
  const test = ultimoTest();
  if (!test) return { html: '', dopo: () => vai('oggi', true) };
  const v = valutaTest(test.ris, S.profilo || {}), prec = S.test[S.test.length - 2], mig = prec ? miglioramento(prec.ris, test.ris) : null;
  const PROVA_AREA = { spinta: 'piegamenti', gambe: 'squat', cond: 'burpees', core: 'plank', posteriore: 'superman', trazione: 'trazioni' };
  return {
    html: `<main class="pagina piena">
      <div><span class="pic forte sec">${t('risultato.titolo')}</span><h1>${t('risultato.livello', { n: v.globale })} · ${t('livelli.' + v.globale + '.nome')}</h1><p class="sec" style="margin-top:6px">${t('livelli.' + v.globale + '.desc')}</p></div>
      ${mig != null ? `<div class="card tenue fila tra"><div><h3>${t('risultato.miglioramento')}</h3><p class="pic sec">${t('risultato.rispetto', { data: new Date(prec.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) })}</p></div><span class="grosso art">${mig > 0 ? '+' : ''}${mig}%</span></div>
        <div class="card">${tabellaTest(prec, test)}</div>` : ''}
      <h2>${t('risultato.aree')}</h2>
      <div class="col">${AREE.map(a => `<div class="card col stretti"><div class="fila tra"><span class="forte">${t('aree.' + a)}${v.aree[a].stimato ? ` <span class="sec pic">${t('risultato.stimato')}</span>` : ''}</span>
        <span><span class="sec pic">${v.aree[a].stimato ? '' : fmtProva(PROVA_AREA[a], test.ris[PROVA_AREA[a]]) + ' · '}</span><span class="num" style="font-size:20px">${t('risultato.liv', { n: v.aree[a].liv })}</span></span></div>${barraLivello(v.aree[a])}</div>`).join('')}</div>
      ${Object.values(test.ris).some(r => r.fac) ? `<p class="pic sec">${t('risultato.notaFac')}</p>` : ''}
      <div class="card avviso"><span class="tondo">${ico('bersaglio')}</span><div><h3>${t('risultato.debole', { area: t('aree.' + v.debole).toLowerCase() })}</h3><p class="pic sec">${t('risultato.deboleTesto')}</p></div></div>
      <div class="fondo-fisso"><a class="btn primario largo" href="#/piano/nuovo">${t('risultato.vediPiano')}</a></div></main>`,
  };
});
export { fmtProva };
