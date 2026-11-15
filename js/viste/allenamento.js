// Flusso di un allenamento: anteprima → riscaldamento → AMRAP → fine sessione → riepilogo → defaticamento.
import { S, salva, salvaSessione, contesto, oggi } from '../stato.js';
import { t, tn, nomeEsercizio } from '../i18n.js';
import { registra, vai, disegna, rotta, vistaAttuale } from '../router.js';
import { esc, ico, icoPlay, icoPausa, foglio, toast, fmtQ, fmtPunti, fmtData, fmtDec, condividiFile } from '../ui.js';
import { prossimo, circuitoSessione, sostituisci, ripPerGiro, obiettivoGiri, giriEq, aggiornaTempi, alternative, serieGiorni } from '../logica.js';
import { sfidaDelMese } from '../classifica.js';
import { PER_ID } from '../../data/esercizi.js';
import { uid, mmss, meseISO, copia } from '../util.js';
import { bip, parla, vibra, schermoAcceso, sbloccaAudio } from '../audio.js';
import { risolviFastidio } from '../azioni.js';
import { leggiFileOrologio, giriDaLap } from '../orologi.js';
import { foglioAlternative, fmtVoce, testoMotivo } from './piano.js';
import { cartaSuggerimento, suggerimentoAttivo, azioniSuggerimento } from './oggi.js';
import { immagineSessione } from '../immagini.js';

let A = null, tic = null, ultimoTocco = 0;
const ora = () => Date.now();
const trascorso = () => A.t0 ? (ora() - A.t0 - A.pausaTot - (A.pausaDa ? ora() - A.pausaDa : 0)) / 1000 : 0;
const ricorda = () => { S.attivo = copia(A); return salva('attivo'); };
const avviaTic = () => { clearInterval(tic); tic = setInterval(batti, 200); };
const fermaTic = () => { clearInterval(tic); tic = null; };
const unaVolta = (k, f) => { if (!A.detto[k]) { A.detto[k] = 1; f(); } };
const setTesto = (id, v) => { const el = document.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };

function crea(cosa) {
  const d = oggi(), ctx = contesto();
  if (cosa === 'sfida') {
    const sf = sfidaDelMese(meseISO(d));
    A = { cosa, sfida: sf, variante: 'completa', durata: sf.durata, fattore: 1 };
    usaVariante();
  } else {
    const idx = prossimo(S.piano, S.sessioni, d).idx;
    A = { cosa, idx, ...circuitoSessione(S.piano, idx, ctx, S.sessioni, d) };
  }
  Object.assign(A, { fase: 'anteprima', modalita: S.orologio && S.orologio.usa ? 'orologio' : 'app', giri: [], exIdx: 0, exDa: 0, tempiEx: {}, pausaTot: 0, pausaDa: null, t0: 0, detto: {} });
}
function usaVariante() {
  A.esercizi = A.sfida[A.variante]; A.ripGiro = ripPerGiro(A.esercizi); A.obiettivo = obiettivoGiri(A.esercizi, A.durata, contesto());
}
const titolo = () => A.cosa === 'sfida' ? t('all.sfida', { mese: fmtData(oggi(), { month: 'long' }) }) : t('piano.giorno', { tipo: A.tipo });

// ───────────────────────── Sequenze guidate a tempo (riscaldamento e defaticamento)
function passiRiscaldamento() {
  const tre = A.esercizi.filter(x => PER_ID[x.id].schema !== 'mobilita').slice(0, 3).map(x => { const e = PER_ID[x.id]; return { id: e.fac && PER_ID[e.fac] ? e.fac : x.id, sec: 30, lento: true }; });
  return [{ id: 'step_jack', sec: 60 }, { id: 'cat_cow', sec: 45 }, { id: 'worlds_greatest', sec: 60 }, { id: 'rotazioni_toraciche', sec: 45 }, ...tre];
}
const passiDefaticamento = () => [{ id: 'novanta_novanta', sec: 45 }, { id: 'rotazioni_toraciche', sec: 45 }, { id: 'cat_cow', sec: 45 }, { testo: 'respiro', sec: 45 }];
const nomePasso = p => p.testo ? t('all.' + p.testo) : p.lento ? t('all.lento', { nome: nomeEsercizio(p.id) }) : nomeEsercizio(p.id);
function avviaGuida(tipo) {
  A.fase = 'guida'; A.guida = { tipo, passi: tipo === 'riscaldamento' ? passiRiscaldamento() : passiDefaticamento(), i: 0, t0: ora(), pausaDa: null };
  schermoAcceso(true); parla(`${t('all.' + tipo)}. ${nomePasso(A.guida.passi[0])}`);
  avviaTic(); disegna(false);
}
function prossimoPasso() {
  const g = A.guida;
  g.i++; g.t0 = ora(); g.pausaDa = null;
  if (g.i >= g.passi.length) return fineGuida();
  bip(990, 0.2); vibra(80); parla(nomePasso(g.passi[g.i]));
  disegna(false);
}
function fineGuida() {
  const tipo = A.guida.tipo; A.guida = null;
  if (tipo === 'riscaldamento') return pronti();
  fermaTic(); schermoAcceso(false); A = null; vai('oggi');
}
function pronti() {
  if (A.modalita === 'orologio') { fermaTic(); A.fase = 'orologio'; schermoAcceso(true); return disegna(false); }
  A.fase = 'conto'; A.contoDa = ora(); A.detto = {};
  schermoAcceso(true); avviaTic(); disegna(false);
}

// ───────────────────────── Timer
function batti() {
  if (!A) return fermaTic();
  if (A.fase === 'guida') {
    const g = A.guida; if (g.pausaDa) return;
    const r = g.passi[g.i].sec - (ora() - g.t0) / 1000;
    if (r <= 0) return prossimoPasso();
    if (r <= 3) { const k = 'g' + g.i + Math.ceil(r); if (!g[k]) { g[k] = 1; bip(880, 0.08); } }
    setTesto('g-tempo', mmss(Math.ceil(r)));
  } else if (A.fase === 'conto') {
    const n = 3 - Math.floor((ora() - A.contoDa) / 1000);
    if (n <= 0) {
      A.fase = 'amrap'; A.t0 = ora(); A.detto = {};
      bip(1320, 0.35); vibra(150); parla(t('voce.inizio', { min: A.durata }));
      ricorda(); return disegna(false);
    }
    unaVolta('c' + n, () => bip(880));
    setTesto('a-conto', n);
  } else if (A.fase === 'amrap') {
    const tot = A.durata * 60, s = trascorso(), r = tot - s;
    if (r <= 0) return fineAmrap(true);
    if (A.pausaDa) return;
    if (s >= tot / 2) unaVolta('meta', () => parla(t('voce.meta')));
    if (A.durata > 10 && r <= 300) unaVolta('cinque', () => parla(t('voce.cinque')));
    if (r <= 60) unaVolta('uno', () => { parla(t('voce.ultimoMinuto')); vibra(100); });
    if (r <= 10) { unaVolta('dieci', () => parla(t('voce.dieci'))); if (r < 9.5) unaVolta('b' + Math.ceil(r), () => bip(r <= 3 ? 1100 : 880, 0.1)); }
    setTesto('a-tempo', mmss(Math.ceil(r)));
    const seg = document.getElementById('a-seg');
    if (seg) { const n = Math.floor(s / tot * 20); if (seg.dataset.n !== String(n)) { seg.dataset.n = n; [...seg.children].forEach((el, i) => { el.className = i < n ? 'f' : i === n ? 'c' : ''; }); } }
  }
}
function statistiche() {
  const n = A.giri.length;
  if (!n) return { media: '—', proiezione: '—' };
  const media = A.giri[n - 1] / n, eq = A.durata * 60 / media, g = Math.floor(eq + 1e-6);
  return { media: mmss(media), proiezione: fmtPunti(g, Math.round((eq - g) * A.ripGiro)) };
}
function segnaEsercizio() {   // registra quanto è durato l'esercizio corrente (se l'utente tocca le card)
  const s = trascorso(), id = A.esercizi[A.exIdx].id, v = A.tempiEx[id] || (A.tempiEx[id] = { tot: 0, n: 0 });
  v.tot += s - A.exDa; v.n++; A.exDa = s;
}
function fineAmrap(scaduto) {
  const s = Math.min(trascorso(), A.durata * 60);
  fermaTic(); schermoAcceso(false);
  if (scaduto) { bip(660, 0.9); vibra([300, 120, 300]); parla(t('voce.fine')); }
  A.fine = A.t0 ? s : null; A.fase = 'fine';
  A.form = { giri: A.giri.length, extra: A.esercizi.map((x, i) => (i < A.exIdx ? x.q : 0)), fatica: null, fastidi: {}, note: '', orologio: null, bpm: '', kcal: '' };
  ricorda(); disegna(false);
}

// ───────────────────────── Salvataggio della sessione
async function salvaTutto() {
  const f = A.form, ctx = contesto(), extra = f.extra.reduce((a, b) => a + b, 0);
  const s = {
    id: uid(), ts: ora(), inizio: A.t0 || ora() - A.durata * 60e3, data: oggi(), tipo: A.cosa === 'sfida' ? 'sfida' : 'amrap', blocco: S.piano ? S.piano.blocco : 0,
    tipoGiorno: A.tipo || null, focus: A.focus || null, rev: A.rev || 0, fattore: A.fattore == null ? 1 : A.fattore, motivo: A.motivo || null, leggero: !!A.leggero,
    durata: A.durata, esercizi: A.esercizi.map(x => ({ id: x.id, q: x.q, slot: x.slot, ...(x.kg != null ? { kg: x.kg } : {}) })), obiettivo: A.obiettivo, ripGiro: A.ripGiro,
    giri: f.giri, extra, extraPer: f.extra, tempiGiro: A.giri.map((g, i) => Math.round(g - (i ? A.giri[i - 1] : 0))), fatica: f.fatica, fastidi: Object.keys(f.fastidi), note: f.note.trim(), modalita: A.modalita,
    orologio: f.orologio || (f.bpm || f.kcal ? { bpmMedio: Number(f.bpm) || null, calorie: Number(f.kcal) || null } : null),
  };
  if (A.fine != null && A.fine < A.durata * 60 - 5) s.interrotta = true;
  if (A.cosa === 'sfida') { s.variante = A.variante; s.meseSfida = A.sfida.mese; }
  await salvaSessione(s);
  if (A.giri.length && A.modalita === 'app') {
    const per = Object.fromEntries(Object.entries(A.tempiEx).filter(([, v]) => v.n).map(([id, v]) => [id, v.tot / v.n]));
    S.esercizi.tempi = aggiornaTempi(S.esercizi.tempi, A.esercizi, A.giri[A.giri.length - 1] / A.giri.length, ctx, per);
  }
  for (const id of Object.keys(f.fastidi)) await risolviFastidio(id, f.fastidi[id]);
  S.attivo = null; await salva('esercizi', 'attivo');
  A.sessione = s; A.fase = 'riepilogo';
  disegna(false);
}
function confronto(s) {
  const simili = S.sessioni.filter(x => x.id !== s.id && x.tipo === s.tipo && !x.interrotta && (s.tipo === 'sfida' ? x.meseSfida === s.meseSfida && x.variante === s.variante : x.tipoGiorno === s.tipoGiorno));
  const ultima = simili[simili.length - 1] || null, validi = simili.filter(x => x.fattore === 1);
  const record = validi.length ? Math.max(...validi.map(giriEq)) : null;
  return { ultima, record, nuovoRecord: record != null && !s.interrotta && s.fattore === 1 && giriEq(s) > record + 1e-9 };
}

// ───────────────────────── Schermate
const testa = (centro, destra = '<span style="width:46px"></span>', azione = 'esci') => `<div class="fila tra"><button class="ico-btn" data-a="${azione}" aria-label="${t('comune.chiudi')}">${ico('x')}</button><span class="pic forte sec">${esc(centro)}</span>${destra}</div>`;
const trattini = (n, i) => `<div class="trattini" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'f' : k === i ? 'c' : ''}"></i>`).join('')}</div>`;

function vistaAnteprima() {
  const sf = A.cosa === 'sfida';
  return `${testa(t('all.anteprima'))}
    <div><h1>${esc(titolo())}</h1><div class="fila avvolgi stretti" style="margin-top:10px">
      ${sf ? '' : `<span class="pill ar">${t('piano.focus', { focus: t('focus.' + A.focus) })}</span>`}<span class="pill">AMRAP ${A.durata}'</span><span class="pill">${tn('oggi.obiettivo', A.obiettivo)}</span>
      ${A.motivo ? `<span class="pill">${t('oggi.motivo.' + A.motivo)}</span>` : ''}</div></div>
    ${sf ? `<div class="seg">${['completa', 'facilitata'].map(v => `<button data-a="variante" data-v="${v}" aria-pressed="${A.variante === v}">${t('all.' + v)}</button>`).join('')}</div><p class="pic sec">${t('all.sfidaTesto')}</p>` : ''}
    <div class="col stretti">${A.esercizi.map((x, i) => `<button class="riga" data-a="voce" data-n="${i}"><span class="tondo ${x.slot === 'focus' ? 'ar' : ''}">${i + 1}</span><span class="cresce" style="font-weight:600">${esc(nomeEsercizio(x.id))}</span>${x.slot === 'focus' ? `<span class="etichetta">${t('comune.focus')}</span>` : ''}<span class="rip">${fmtVoce(x)}</span>${sf ? '' : `<span class="sec">${ico('scambia', 18)}</span>`}</button>`).join('')}</div>
    ${sf ? '' : `<p class="pic sec">${t('all.toccaPerCambiare')}</p>`}
    <div class="col stretti"><h3>${t('all.modalita')}</h3><div class="seg">${['app', 'orologio'].map(m => `<button data-a="modalita" data-v="${m}" aria-pressed="${A.modalita === m}">${t('all.modo.' + m)}</button>`).join('')}</div>
      ${A.modalita === 'orologio' ? `<p class="pic sec">${t('all.modoOrologioTesto')}</p>` : ''}</div>
    <div class="fondo-fisso"><button class="btn primario largo" data-a="riscaldamento">${icoPlay()}${t('all.iniziaRiscaldamento')}</button><button class="btn testo largo" data-a="salta">${t('all.saltaRiscaldamento')}</button></div>`;
}
function vistaGuida() {
  const g = A.guida, p = g.passi[g.i], dopo = g.passi[g.i + 1];
  const consiglio = p.id ? t('esercizi.' + p.id + '.consigli')[0] : t('all.respiroTesto');
  return `${testa(`${t('all.' + g.tipo)} · ${g.i + 1}/${g.passi.length}`, `<button class="ico-btn" data-a="pausaGuida" aria-label="${t('all.pausa')}">${g.pausaDa ? icoPlay(18) : icoPausa()}</button>`, 'saltaGuida')}
    ${trattini(g.passi.length, g.i)}
    <div class="spazio"></div>
    <div class="centro"><h1 style="font-size:34px">${esc(nomePasso(p))}</h1><div class="tempo" id="g-tempo" style="margin-top:10px">${mmss(Math.ceil(p.sec - ((g.pausaDa || ora()) - g.t0) / 1000))}</div>
      <p class="sec" style="margin-top:10px">${esc(consiglio)}</p></div>
    <div class="spazio"></div>
    <div class="card fila tra"><span class="sec forte">${dopo ? t('all.dopo', { nome: nomePasso(dopo) }) : t('all.ultimoPasso')}</span><button class="btn piccolo" data-a="avantiGuida">${t('all.prossimo')}</button></div>
    <button class="btn testo largo" data-a="saltaGuida">${t(g.tipo === 'riscaldamento' ? 'all.saltaRiscaldamento' : 'all.saltaDefaticamento')}</button>`;
}
function vistaAmrap() {
  const tot = A.durata * 60, s = trascorso(), n = Math.floor(s / tot * 20), st = statistiche(), x = A.esercizi[A.exIdx], dopo = A.esercizi[A.exIdx + 1];
  const tempo = `<div><div class="pic forte sec">${t(A.pausaDa ? 'all.inPausa' : 'all.rimanente')}</div><div class="tempo ${A.pausaDa ? 'sec' : ''}" id="a-tempo">${mmss(Math.ceil(tot - s))}</div>
    <div class="segmenti" id="a-seg" data-n="${n}" aria-hidden="true">${Array.from({ length: 20 }, (_, i) => `<i class="${i < n ? 'f' : i === n ? 'c' : ''}"></i>`).join('')}</div></div>`;
  const pausa = `<button class="ico-btn" data-a="pausa" aria-label="${t(A.pausaDa ? 'all.riprendi' : 'all.pausa')}">${A.pausaDa ? icoPlay(18) : icoPausa()}</button>`;
  if (A.modalita === 'orologio') return `${testa(`AMRAP ${A.durata}' · ${titolo()}`, pausa)}${tempo}${listaGrande()}<div class="spazio"></div><button class="btn primario largo" data-a="hoFinito">${t('all.hoFinito')}</button>`;
  return `${testa(`AMRAP ${A.durata}' · ${titolo()}`, pausa)}${tempo}
    <div class="fila" style="align-items:stretch"><div class="giro-box"><span>${t('all.giro')}</span><span class="num" id="a-giro">${A.giri.length + 1}</span></div>
      <div class="card cresce" style="display:flex;flex-direction:column;justify-content:center;padding:8px 16px">
        <div class="stat"><span>${t('all.mediaGiro')}</span><span class="num">${st.media}</span></div><div class="stat"><span>${t('all.proiezione')}</span><span class="num">${st.proiezione}</span></div><div class="stat"><span>${t('all.obiettivo')}</span><span class="num">${A.obiettivo}</span></div></div></div>
    <button class="card col" data-a="esercizio" style="gap:10px;text-align:left;width:100%" aria-label="${t('all.prossimoEsercizio')}">
      <span class="fila tra"><span class="pic forte art">${t('all.oraDi', { i: A.exIdx + 1, n: A.esercizi.length })}</span>${trattini(A.esercizi.length, A.exIdx)}</span>
      <span class="fila tra base"><span style="font-size:${nomeEsercizio(x.id).length > 16 ? 22 : 30}px;font-weight:800;letter-spacing:-.5px;line-height:1.05">${esc(nomeEsercizio(x.id))}</span><span class="num art" style="font-weight:800;font-size:42px;line-height:1;white-space:nowrap">${PER_ID[x.id].unita === 'sec' ? '' : '×'}${fmtQ(x.id, x.q)}</span></span>
      <span class="fila tra sec" style="border-top:1px solid var(--lin);padding-top:10px;font-size:14px;font-weight:600"><span>${dopo ? t('all.dopo', { nome: nomeEsercizio(dopo.id) }) : t('all.poiGiro')}</span><span>${dopo ? fmtVoce(dopo) : ''}${x.kg != null ? ` ${x.kg} kg` : ''}</span></span></button>
    ${A.giri.length ? `<button class="btn testo piccolo" data-a="annullaGiro" style="align-self:center">${t('all.annullaGiro')}</button>` : ''}
    <div class="spazio"></div>
    <button class="piu-giro" data-a="giro" ${A.pausaDa ? 'disabled' : ''}><span class="num">${t('all.piuGiro')}</span><span>${t('all.piuGiroTesto')}</span></button>`;
}
const listaGrande = () => `<div class="col stretti">${A.esercizi.map((x, i) => `<div class="riga alta"><span class="tondo ${x.slot === 'focus' ? 'ar' : ''}">${i + 1}</span><span class="cresce" style="font-size:20px;font-weight:800">${esc(nomeEsercizio(x.id))}</span><span class="num art" style="font-size:34px;font-weight:800;line-height:1">${fmtVoce(x)}</span></div>`).join('')}</div>
  <div class="card tenue avviso"><span class="tondo">${ico('orologio')}</span><p class="forte">${t('all.premiLap')}</p></div>`;
function vistaOrologio() {
  return `${testa(`AMRAP ${A.durata}' · ${titolo()}`)}<h1>${t('all.orologioTitolo')}</h1>${listaGrande()}
    <div class="spazio"></div><button class="btn largo" data-a="timerFacoltativo">${ico('cronometro')}${t('all.avviaTimer')}</button><button class="btn primario largo" data-a="hoFinito">${t('all.hoFinito')}</button>`;
}
function vistaFine() {
  const f = A.form, sf = A.cosa === 'sfida', ctx = contesto({ daDecidere: [] }), usati = A.esercizi.map(x => x.id);
  const o = f.orologio;
  return `<h1>${t('fine.titolo')}</h1>
    <div class="card fila tra"><div><h3>${t('fine.giri')}</h3><p class="pic sec">${t('fine.giriTesto')}</p></div><div class="passo"><button data-a="giriMeno" aria-label="${t('test.meno')}">−</button><span class="num">${f.giri}</span><button data-a="giriPiu" aria-label="${t('test.piu')}">+</button></div></div>
    <div class="card col"><div class="fila tra"><h3>${t('fine.extra')}</h3><span class="pill ar"><span class="num">+${f.extra.reduce((a, b) => a + b, 0)}</span></span></div><p class="pic sec">${t('fine.extraTesto')}</p>
      ${A.esercizi.map((x, i) => `<div class="fila tra"><span class="cresce" style="font-weight:600">${esc(nomeEsercizio(x.id))} <span class="sec pic">/ ${fmtQ(x.id, x.q)}</span></span><div class="passo"><button data-a="extraMeno" data-n="${i}" aria-label="${t('test.meno')}">−</button><span class="num">${f.extra[i]}</span><button data-a="extraPiu" data-n="${i}" aria-label="${t('test.piu')}">+</button></div></div>`).join('')}</div>
    <div class="card col"><h3>${t('fine.fatica')}</h3><div class="scala">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-a="fatica" data-v="${n}" aria-pressed="${f.fatica === n}">${n}</button>`).join('')}</div><div class="fila tra pic sec"><span>${t('fine.faticaMin')}</span><span>${t('fine.faticaMax')}</span></div></div>
    ${sf ? '' : `<div class="card col"><h3>${t('fine.fastidi')}</h3><div class="fila avvolgi stretti">${A.esercizi.map(x => `<button class="chip due" data-a="fastidio" data-v="${x.id}" aria-pressed="${x.id in f.fastidi}">${esc(nomeEsercizio(x.id))}</button>`).join('')}</div>
      ${Object.keys(f.fastidi).map(id => `<div class="col stretti" style="border-top:1px solid var(--lin);padding-top:10px"><span class="forte">${esc(nomeEsercizio(id))}</span><span class="pic sec">${t('fine.fastidioScelta')}</span>
        ${alternative(id, ctx, usati).map(a => `<button class="chip" style="text-align:left;height:auto;padding:8px 16px" data-a="decisione" data-id="${id}" data-v="${a.e.id}" aria-pressed="${f.fastidi[id] === a.e.id}">${t('fine.sostituisci', { nome: nomeEsercizio(a.e.id) })}<br><span class="pic sec" style="font-weight:500">${esc(testoMotivo(a))}</span></button>`).join('')}
        <div class="fila stretti"><button class="chip" data-a="decisione" data-id="${id}" data-v="escludi" aria-pressed="${f.fastidi[id] === 'escludi'}">${t('fine.escludi')}</button><button class="chip" data-a="decisione" data-id="${id}" data-v="tieni" aria-pressed="${f.fastidi[id] === 'tieni'}">${t('fine.tieni')}</button></div></div>`).join('')}</div>`}
    <div class="card col"><h3>${t('fine.orologio')}</h3>
      ${o ? `<p class="forte">${[o.durata ? mmss(o.durata) : '', o.bpmMedio ? `${o.bpmMedio} bpm` : '', o.calorie ? `${o.calorie} kcal` : '', o.giri ? tn('fine.lap', o.giri.length) : ''].filter(Boolean).join(' · ')}</p><button class="btn piccolo" data-a="togliFile" style="align-self:flex-start">${t('fine.togliFile')}</button>`
        : `<label class="btn piccolo" style="align-self:flex-start;cursor:pointer">${ico('orologio', 18)}${t('fine.importa')}<input type="file" accept=".fit,.tcx,.gpx" hidden data-c="file"></label>
          <div class="griglia2"><label class="campo">${t('fine.bpm')}<input data-i="bpm" type="number" inputmode="numeric" value="${esc(f.bpm)}"></label><label class="campo">${t('fine.kcal')}<input data-i="kcal" type="number" inputmode="numeric" value="${esc(f.kcal)}"></label></div>`}</div>
    <label class="campo">${t('fine.note')}<textarea data-i="note" placeholder="${t('fine.notePlaceholder')}">${esc(f.note)}</textarea></label>
    <div class="fondo-fisso"><button class="btn primario largo" data-a="salva" id="f-salva" ${f.fatica ? '' : 'disabled'}>${t(f.fatica ? 'fine.salva' : 'fine.salvaManca')}</button><button class="btn testo largo" data-a="scarta">${t('fine.scarta')}</button></div>`;
}
function vistaRiepilogo() {
  const s = A.sessione, c = confronto(s), eq = giriEq(s), sugg = s.tipo === 'amrap' ? suggerimentoAttivo() : null;
  const diff = (v, chiave) => { const d = eq - v; return `<div class="stat"><span>${t(chiave)}</span><span class="num ${d > 0.04 ? 'art' : ''}">${d > 0 ? '+' : ''}${fmtDec(d)} ${t('comune.giri')}</span></div>`; };
  return `<div><span class="pic forte sec">${esc(titolo())} · AMRAP ${s.durata}'</span><h1>${t(c.nuovoRecord ? 'riep.record' : 'riep.titolo')}</h1></div>
    <div class="card grande ar col stretti"><div class="fila base"><span class="gigante">${s.giri}</span>${s.extra ? `<span class="grosso">+${s.extra}</span>` : ''}</div>
      <div class="forte">${tn('riep.giri', s.giri)}${s.extra ? ` ${t('riep.extra', { n: s.extra })}` : ''} · ${tn('oggi.obiettivo', s.obiettivo)}</div>
      ${c.nuovoRecord ? `<span class="pill scura" style="align-self:flex-start">${ico('coppa', 16)}${t('riep.nuovoRecord')}</span>` : ''}</div>
    ${c.ultima ? `<div class="card">${diff(giriEq(c.ultima), 'riep.vsUltima')}${c.record != null ? diff(c.record, 'riep.vsRecord') : ''}</div>` : `<p class="sec">${t('riep.prima')}</p>`}
    ${s.interrotta ? `<p class="pic sec">${t('riep.interrotta')}</p>` : s.fattore < 1 ? `<p class="pic sec">${t('riep.ridotta')}</p>` : ''}
    ${s.orologio ? `<div class="card fila tra">${s.orologio.bpmMedio ? `<div><span class="pic sec forte">${t('riep.bpm')}</span><div class="medio">${s.orologio.bpmMedio}</div></div>` : ''}${s.orologio.bpmMax ? `<div><span class="pic sec forte">${t('riep.bpmMax')}</span><div class="medio">${s.orologio.bpmMax}</div></div>` : ''}${s.orologio.calorie ? `<div><span class="pic sec forte">${t('riep.kcal')}</span><div class="medio">${s.orologio.calorie}</div></div>` : ''}</div>` : ''}
    ${sugg ? cartaSuggerimento(sugg) : ''}
    <a class="btn largo" href="#/report/${s.id}">${ico('battito')}${t('rep.apri')}</a>
    <button class="btn largo" data-a="condividi">${ico('condividi')}${t('riep.condividi')}</button>
    <div class="fondo-fisso"><button class="btn primario largo" data-a="defaticamento">${t('riep.defaticamento')}</button><button class="btn testo largo" data-a="chiudi">${t('riep.salta')}</button></div>`;
}

registra('allenamento', ([cosa = 'giorno']) => {
  if (!S.test.length || (cosa === 'giorno' && !S.piano)) return { html: '', dopo: () => vai('oggi', true) };   // prima il test iniziale
  // Il riepilogo resta in memoria solo per andare al report e tornare indietro: arrivando da altrove si riparte da capo.
  if (A && A.fase === 'riepilogo' && !['allenamento', 'report'].includes(vistaAttuale())) A = null;
  if (!A && S.attivo && S.attivo.cosa === cosa) { A = copia(S.attivo); if (A.fase === 'amrap') { schermoAcceso(true); avviaTic(); } }
  if (!A || A.cosa !== cosa) crea(cosa);
  if (A.fase === 'amrap' && !tic) { schermoAcceso(true); avviaTic(); }
  const corpo = { anteprima: vistaAnteprima, guida: vistaGuida, conto: () => `<div class="spazio"></div><div class="centro"><p class="sec forte">${t('all.pronti')}</p><div class="gigante art" id="a-conto" style="font-size:220px">3</div></div><div class="spazio"></div>`,
    amrap: vistaAmrap, orologio: vistaOrologio, fine: vistaFine, riepilogo: vistaRiepilogo }[A.fase]();
  const passo = (i, d) => { const x = A.esercizi[i], st = PER_ID[x.id].unita === 'sec' ? 5 : 1; A.form.extra[i] = Math.max(0, Math.min(x.q, A.form.extra[i] + d * st)); disegna(); };
  return {
    html: `<main class="pagina piena">${corpo}</main>`,
    azioni: {
      esci: () => {
        if (A.fase === 'anteprima') { A = null; return vai('oggi'); }
        foglio(`<h2 style="margin:0">${t('all.esciTitolo')}</h2><p class="sec">${t('all.esciTesto')}</p>
          <button class="btn primario largo" data-a="chiudi">${t('comune.continua')}</button><button class="btn largo" data-a="termina">${t('all.termina')}</button><button class="btn pericolo largo" data-a="scarta">${t('all.scarta')}</button>`,
        { termina: (e, ev, chiudi) => { chiudi(); fineAmrap(false); },
          scarta: async (e, ev, chiudi) => { chiudi(); fermaTic(); schermoAcceso(false); A = null; S.attivo = null; await salva('attivo'); vai('oggi'); } });
      },
      variante: el => { A.variante = el.dataset.v; usaVariante(); disegna(); },
      modalita: el => { A.modalita = el.dataset.v; disegna(); },
      voce: el => {
        const i = +el.dataset.n, x = A.esercizi[i];
        if (A.cosa === 'sfida') return vai('esercizio/' + x.id);
        foglioAlternative(x, contesto(), A.esercizi.map(y => y.id), async id => {
          const ctx = contesto(), g = S.piano.giorni[A.idx], pos = g.esercizi.findIndex(y => y.slot === x.slot);
          S.esercizi.sostituzioni[x.alPostoDi || x.id] = id;
          sostituisci(S.piano, A.idx, pos, id, ctx);
          await salva('piano', 'esercizi');
          const modalita = A.modalita; crea('giorno'); A.modalita = modalita;
          toast(t('piano.sostituito')); disegna();
        });
      },
      riscaldamento: () => { sbloccaAudio(); avviaGuida('riscaldamento'); },
      salta: () => { sbloccaAudio(); pronti(); },
      pausaGuida: () => { const g = A.guida; if (g.pausaDa) { g.t0 += ora() - g.pausaDa; g.pausaDa = null; } else g.pausaDa = ora(); disegna(); },
      avantiGuida: prossimoPasso,
      saltaGuida: fineGuida,
      giro: () => {
        if (A.pausaDa || ora() - ultimoTocco < 1500) return;
        ultimoTocco = ora();
        if (A.exIdx === A.esercizi.length - 1) segnaEsercizio();   // solo se l'utente ha toccato tutte le card del giro
        A.giri.push(trascorso()); A.exIdx = 0; A.exDa = trascorso();
        bip(1100, 0.12); vibra(60); ricorda(); disegna();
      },
      annullaGiro: () => { A.giri.pop(); ricorda(); disegna(); },
      esercizio: () => { if (A.exIdx >= A.esercizi.length - 1) return toast(t('all.toccaGiro')); segnaEsercizio(); A.exIdx++; vibra(20); ricorda(); disegna(); },
      pausa: () => { if (A.pausaDa) { A.pausaTot += ora() - A.pausaDa; A.pausaDa = null; } else A.pausaDa = ora(); ricorda(); disegna(); },
      timerFacoltativo: () => { sbloccaAudio(); A.fase = 'conto'; A.contoDa = ora(); A.detto = {}; avviaTic(); disegna(); },
      hoFinito: () => fineAmrap(false),
      giriMeno: () => { A.form.giri = Math.max(0, A.form.giri - 1); disegna(); },
      giriPiu: () => { A.form.giri++; disegna(); },
      extraMeno: el => passo(+el.dataset.n, -1),
      extraPiu: el => passo(+el.dataset.n, 1),
      fatica: el => { A.form.fatica = +el.dataset.v; disegna(); },
      fastidio: el => { const id = el.dataset.v; if (id in A.form.fastidi) delete A.form.fastidi[id]; else A.form.fastidi[id] = null; disegna(); },
      decisione: el => { const f = A.form.fastidi; f[el.dataset.id] = f[el.dataset.id] === el.dataset.v ? null : el.dataset.v; disegna(); },
      note: el => { A.form.note = el.value; },
      bpm: el => { A.form.bpm = el.value; },
      kcal: el => { A.form.kcal = el.value; },
      file: async el => {
        try {
          const d = await leggiFileOrologio(el.files[0]), lap = giriDaLap(d);
          A.form.orologio = d;
          if (d.giri.length && lap !== A.form.giri) {
            foglio(`<h2 style="margin:0">${t('fine.lapTitolo')}</h2><p class="sec">${t('fine.lapTesto', { lap, app: A.form.giri })}</p>
              <button class="btn primario largo" data-a="file">${tn('fine.lapUsaFile', lap)}</button><button class="btn largo" data-a="chiudi">${tn('fine.lapUsaApp', A.form.giri)}</button>`,
            { file: (b, ev, chiudi) => { A.form.giri = lap; chiudi(); disegna(); } });
          }
          disegna();
        } catch { toast(t('oro.fileNonValido')); }
      },
      togliFile: () => { A.form.orologio = null; disegna(); },
      salva: salvaTutto,
      scarta: async () => { A = null; S.attivo = null; await salva('attivo'); vai('oggi'); },
      condividi: async () => {
        const s = A.sessione, c = confronto(s);
        const blob = await immagineSessione(s, { titolo: titolo(), record: c.nuovoRecord, serie: serieGiorni(S.sessioni, S.piano ? S.piano.giorniSett.length : 3, oggi()) });
        await condividiFile(blob, `homrap-${s.data}.png`, t('img.motto'));
      },
      defaticamento: () => { sbloccaAudio(); avviaGuida('defaticamento'); },
      chiudi: () => { A = null; vai('oggi'); },
      ...azioniSuggerimento(disegna),
    },
    esci: () => {
      fermaTic(); schermoAcceso(false);
      if (A && A.fase === 'riepilogo' && rotta().nome === 'report') return;   // dal report si torna al riepilogo
      if (A && ['riepilogo', 'guida', 'anteprima', 'orologio', 'conto'].includes(A.fase)) A = null;
    },
  };
});
