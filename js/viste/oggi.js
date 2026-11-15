// Scheda Oggi: allenamento del giorno o riposo, striscia della settimana, avvisi e sfida del mese.
import { S, salva, contesto, oggi, ultimoTest } from '../stato.js';
import { t, tn, nomeEsercizio } from '../i18n.js';
import { registra, disegna, vai } from '../router.js';
import { esc, ico, icoPlay, foglio, toast, fmtPunti, fmtData } from '../ui.js';
import { prossimo, circuitoSessione, serieGiorni, valutaProgressione, applicaModifiche, settimanaBlocco, inRipartenza, giorniDiPausa, alternative } from '../logica.js';
import { sfidaDelMese, migliorSfida } from '../classifica.js';
import { lunedi, piuGiorni, giornoSett, meseISO, daIso } from '../util.js';
import { risolviFastidio, salvaBackup, applicaTema } from '../azioni.js';
import { attivaDemo, disattivaDemo } from '../demo.js';
import { fmtVoce, testoMotivo } from './piano.js';

let comunque = '';
const riga = (x, i) => `<a class="riga" href="#/esercizio/${x.id}" style="text-decoration:none;color:inherit"><span class="tondo ${x.slot === 'focus' ? 'ar' : ''}">${i + 1}</span><span class="cresce" style="font-weight:600">${esc(nomeEsercizio(x.id))}</span>${x.slot === 'focus' ? `<span class="etichetta">${t('comune.focus')}</span>` : ''}<span class="rip">${fmtVoce(x)}</span></a>`;
const avviso = (icona, titolo, testo, bottoni = '') => `<div class="card avviso"><span class="tondo">${ico(icona)}</span><div class="col stretti cresce"><h3>${esc(titolo)}</h3><p class="pic sec">${testo}</p>${bottoni ? `<div class="fila avvolgi stretti" style="margin-top:4px">${bottoni}</div>` : ''}</div></div>`;
export const testoModifica = m => m.a !== m.da ? `${esc(nomeEsercizio(m.da))} → ${esc(nomeEsercizio(m.a))} ${fmtVoce({ id: m.a, q: m.q1, kg: m.kg1 })}`
  : `${esc(nomeEsercizio(m.da))} ${fmtVoce({ id: m.da, q: m.q0, kg: m.kg0 })} → ${fmtVoce({ id: m.a, q: m.q1, kg: m.kg1 })}`;
export function cartaSuggerimento(s) {
  return `<div class="card tenue avviso"><span class="tondo">${ico('lampadina')}</span><div class="col stretti cresce">
    <span class="etichetta">${t('sugg.titolo', { tipo: s.tipoGiorno })}</span><h3>${t('sugg.' + s.tipo)}</h3><p class="pic">${t('sugg.motivo.' + s.motivo)}</p>
    <ul class="punti pic forte">${s.modifiche.map(m => `<li>${testoModifica(m)}</li>`).join('')}</ul>
    <div class="fila stretti" style="margin-top:4px"><button class="btn primario piccolo" data-a="suggSi">${t('sugg.accetta')}</button><button class="btn piccolo" data-a="suggNo">${t('sugg.nonOra')}</button></div></div></div>`;
}
export function suggerimentoAttivo() {
  if (!S.piano) return null;
  const ctx = contesto();
  for (let i = 0; i < S.piano.giorni.length; i++) { const s = valutaProgressione(S.piano, i, S.sessioni, ctx); if (s) return s; }
  return null;
}
export const azioniSuggerimento = dopo => ({
  suggSi: async () => { const s = suggerimentoAttivo(); if (!s) return; applicaModifiche(S.piano, s); await salva('piano'); toast(t('sugg.applicato')); dopo(); },
  suggNo: async () => { const s = suggerimentoAttivo(); if (!s) return; S.piano.giorni[s.idx].rimandato = s.sessione; await salva('piano'); dopo(); },
});

registra('oggi', () => {
  const d = oggi(), p = S.profilo || {}, piano = S.piano;
  const testa = serie => `<div class="fila tra alto"><div><h1>${t('oggi.ciao', { nome: esc(p.nome || '') })}</h1><div class="sec" style="margin-top:2px">${t(piano ? 'oggi.pronto' : 'oggi.quasi')}</div></div>
    ${serie != null ? `<div class="pill ar" style="padding:7px 12px" aria-label="${tn('oggi.serieAria', serie)}">${ico('fiamma', 16)}<span class="num">${serie}</span><span>${tn('oggi.giorni', serie).replace(/^\d+ /, '')}</span></div>` : ''}</div>`;
  if (!piano) {
    const haTest = !!ultimoTest();
    return { nav: true, html: `<main class="pagina">${testa(null)}
      <div class="card grande ar col"><span class="pill scura" style="align-self:flex-start">${t('oggi.primoPasso')}</span><div class="titolone" style="font-size:34px">${t(haTest ? 'oggi.mancaPiano' : 'oggi.mancaTest')}</div>
        <p style="font-weight:600">${t(haTest ? 'oggi.mancaPianoTesto' : 'oggi.mancaTestTesto')}</p>
        <a class="btn nero" style="align-self:flex-start" href="#/${haTest ? 'piano/nuovo' : 'test/iniziale'}">${icoPlay()}${t(haTest ? 'oggi.vediPiano' : 'oggi.faiTest')}</a></div>
      ${haTest ? '' : avviso('occhio', t('oggi.giroTitolo'), t('oggi.giroTesto'), `<button class="btn piccolo" data-a="demo">${t('oggi.giroBottone')}</button>`)}</main>`,
      azioni: { demo: async () => { await attivaDemo(); applicaTema(); toast(t('demo.accesa')); disegna(false); } } };
  }
  const ctx = contesto(), pr = prossimo(piano, S.sessioni, d), c = circuitoSessione(piano, pr.idx, ctx, S.sessioni, d);
  const serie = serieGiorni(S.sessioni, piano.giorniSett.length, d), lun = lunedi(d);
  const date = new Set(S.sessioni.filter(s => s.tipo !== 'test').map(s => s.data));
  const settimana = t('comune.giorniBrevi').map((l, i) => { const g = piuGiorni(lun, i), fatto = date.has(g);
    return `<div><span>${l}</span><div class="g ${fatto ? 'fatto' : ''} ${g === d ? 'oggi' : ''} ${piano.giorniSett.includes(i + 1) ? 'piano' : ''}">${fatto ? ico('spunta', 16, 'stroke-width="3"') : daIso(g).getDate()}</div></div>`; }).join('');

  // Avvisi
  const avvisi = [];
  if (S.stato.demo) avvisi.push(avviso('occhio', t('demo.oggiTitolo'), t(S.stato.demoSenzaTest ? 'demo.oggiSenzaTest' : 'demo.oggi'), `<button class="btn primario piccolo" data-a="esciDemo">${t(S.stato.demoSenzaTest ? 'demo.esciTest' : 'demo.esci')}</button>`));
  if (!S.salvabile) avvisi.push(avviso('attenzione', t('oggi.nonSalva'), t('oggi.nonSalvaTesto')));
  for (const id of S.esercizi.daDecidere) avvisi.push(avviso('attenzione', t('oggi.fastidio', { nome: nomeEsercizio(id) }), t('oggi.fastidioTesto'), `<button class="btn primario piccolo" data-a="decidi" data-v="${id}">${t('oggi.fastidioScegli')}</button>`));
  const sugg = suggerimentoAttivo();
  if (sugg) avvisi.push(cartaSuggerimento(sugg));
  const pausa = giorniDiPausa(S.sessioni, d);
  if (pausa > 21) avvisi.push(avviso('ricarica', t('oggi.bentornato'), t('oggi.pausaLunga', { n: pausa }), `<a class="btn primario piccolo" href="#/test/mensile">${t('oggi.rifaiTest')}</a>`));
  else if (inRipartenza(S.sessioni, d)) avvisi.push(avviso('ricarica', t('oggi.ripartenza'), t('oggi.ripartenzaTesto')));
  if (c.settimana >= 4) avvisi.push(avviso('bersaglio', t(c.settimana === 4 ? 'oggi.scarico' : 'oggi.testOra'), t(c.settimana === 4 ? 'oggi.scaricoTesto' : 'oggi.testOraTesto'), `<a class="btn ${c.settimana > 4 ? 'primario' : ''} piccolo" href="#/test/mensile">${t('oggi.faiTestMensile')}</a>`));
  const giorniBackup = S.backup.ultimo ? Math.floor((Date.now() - S.backup.ultimo) / 864e5) : null;
  if (S.stato.backupRimandato !== d && (S.backup.daRicordare || (giorniBackup == null ? S.sessioni.length >= 3 : giorniBackup > 14)))
    avvisi.push(avviso('scarica', t('oggi.backup'), giorniBackup == null ? t('oggi.backupMai') : tn('oggi.backupVecchio', giorniBackup), `<button class="btn primario piccolo" data-a="backup">${t('bak.salva')}</button><button class="btn piccolo" data-a="backupDopo">${t('comune.piuTardi')}</button>`));

  // Card principale
  const fattaOggi = S.sessioni.filter(s => s.data === d && s.tipo !== 'test').pop();
  const chiaveComunque = d + '#' + S.sessioni.length;   // «Allenati comunque» vale finché non salvi una sessione
  const mostra = pr.oggi || comunque === chiaveComunque;
  const etichetta = `${t('piano.giorno', { tipo: c.tipo })} · ${t('piano.focus', { focus: t('focus.' + c.focus) })}`;
  const principale = mostra ? `<div class="card grande ar col stretti">
      <div class="fila avvolgi stretti"><span class="pill scura">${etichetta}</span>${c.motivo ? `<span class="pill scura">${t('oggi.motivo.' + c.motivo)}</span>` : c.leggero ? `<span class="pill scura">${t('piano.leggero')}</span>` : ''}</div>
      <div class="titolone" style="margin-top:6px">AMRAP ${c.durata} min</div>
      <div style="font-weight:600">${tn('oggi.esercizi', c.esercizi.length)} · ${tn('oggi.obiettivo', c.obiettivo)}</div>
      <a class="btn nero" style="align-self:flex-start;margin-top:10px" href="#/allenamento/giorno">${icoPlay()}${t('oggi.inizia')}</a></div>`
    : `<div class="card grande col stretti"><span class="pill ar" style="align-self:flex-start">${t(fattaOggi ? 'oggi.fatto' : 'oggi.riposo')}</span>
      ${fattaOggi ? `<div class="fila base"><span class="grosso">${fmtPunti(fattaOggi.giri, fattaOggi.extra)}</span><span class="sec forte">${t('comune.giri')}</span></div>` : `<div class="titolone" style="font-size:32px;margin-top:4px">${t('oggi.riposoTitolo')}</div>`}
      <p class="sec" style="font-weight:600">${t('oggi.prossimo', { giorno: fmtData(pr.data, { weekday: 'long', day: 'numeric', month: 'long' }), tipo: c.tipo })}</p>
      <button class="btn" style="align-self:flex-start;margin-top:8px" data-a="comunque">${t('oggi.comunque')}</button></div>`;

  // Sfida del mese
  const mese = meseISO(d), sfida = sfidaDelMese(mese), best = migliorSfida(S.sessioni, mese);
  const cartaSfida = `<div class="card col stretti"><div class="fila tra"><span class="etichetta">${t('oggi.sfida', { mese: fmtData(d, { month: 'long' }) })}</span>${best ? `<span class="pill ar"><span class="num">${fmtPunti(best.g, best.r)}</span></span>` : ''}</div>
    <h3>${t('oggi.sfidaTitolo')}</h3><p class="pic sec">${sfida.completa.map(x => `${esc(nomeEsercizio(x.id))} ${fmtVoce(x)}`).join(' · ')}</p>
    <a class="btn piccolo" style="align-self:flex-start;margin-top:4px" href="#/allenamento/sfida">${t(best ? 'oggi.sfidaRifai' : 'oggi.sfidaFai')}</a></div>`;

  return {
    nav: true,
    html: `<main class="pagina">${testa(serie)}<div class="settimana">${settimana}</div>${principale}${avvisi.join('')}
      <div class="fila tra"><h2 style="margin:0">${t(mostra ? 'oggi.circuito' : 'oggi.prossimoCircuito')}</h2><span class="pic sec">${t('oggi.perGiro')}</span></div>
      <div class="col stretti">${c.esercizi.map(riga).join('')}</div>${cartaSfida}</main>`,
    azioni: {
      comunque: () => { comunque = d + '#' + S.sessioni.length; disegna(); },
      esciDemo: async () => { const senzaTest = S.stato.demoSenzaTest; await disattivaDemo(); applicaTema(); toast(t('demo.spenta')); if (senzaTest) vai('test/iniziale'); else disegna(false); },
      backup: async () => { if (await salvaBackup()) disegna(); },
      backupDopo: async () => { S.stato.backupRimandato = d; await salva('stato'); disegna(); },
      decidi: el => {
        const id = el.dataset.v, alt = alternative(id, contesto({ daDecidere: [] }));
        foglio(`<h2 style="margin:0">${esc(nomeEsercizio(id))}</h2><p class="sec">${t('fine.fastidioScelta')}</p>
          ${alt.map(a => `<button class="riga alta" data-a="scelta" data-v="${a.e.id}"><span class="tondo ar">${ico('scambia', 18)}</span><span class="cresce"><span class="forte" style="display:block">${esc(nomeEsercizio(a.e.id))}</span><span class="pic sec">${esc(testoMotivo(a))}</span></span></button>`).join('')}
          <button class="btn largo" data-a="scelta" data-v="escludi">${t('fine.escludi')}</button><button class="btn largo" data-a="scelta" data-v="tieni">${t('fine.tieni')}</button>`,
        { scelta: async (b, ev, chiudi) => { await risolviFastidio(id, b.dataset.v); chiudi(); disegna(); } });
      },
      ...azioniSuggerimento(disegna),
    },
  };
});
