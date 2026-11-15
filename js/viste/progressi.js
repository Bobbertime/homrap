// Scheda Progressi: record e grafico per tipo di giorno, test mensili, livelli, misure, calendario.
import { S, salva, oggi, valutazione, testIniziale, ultimoTest } from '../stato.js';
import { t, tn } from '../i18n.js';
import { registra, disegna } from '../router.js';
import { esc, ico, foglio, barre, scintilla, fmtPunti, fmtData, fmtDec, toast } from '../ui.js';
import { giriEq, serieGiorni, miglioramento, AREE } from '../logica.js';
import { daIso, isoData, meseISO } from '../util.js';
import { barraLivello, tabellaTest } from './test.js';

let tipoSel = null, confrontoDa = 'inizio', meseOff = 0;
const MISURE = ['peso', 'vita', 'petto', 'fianchi', 'braccio', 'coscia'];

function calendario(d) {
  const base = daIso(d); base.setDate(1); base.setMonth(base.getMonth() + meseOff);
  const anno = base.getFullYear(), mese = base.getMonth(), primo = (base.getDay() + 6) % 7, giorni = new Date(anno, mese + 1, 0).getDate();
  const fatti = new Set(S.sessioni.filter(s => s.tipo !== 'test').map(s => s.data));
  const celle = Array.from({ length: primo }, () => '<span></span>');
  for (let g = 1; g <= giorni; g++) { const iso = isoData(new Date(anno, mese, g, 12)); celle.push(`<span class="${fatti.has(iso) ? 'f' : ''} ${iso === d ? 'o' : ''}">${g}</span>`); }
  const nel = [...fatti].filter(x => meseISO(x) === meseISO(isoData(base))).length;
  return `<div class="card col"><div class="fila tra"><button class="ico-btn due" data-a="mese" data-v="-1" aria-label="${t('prog.mesePrima')}">${ico('indietro', 18)}</button>
    <div class="centro"><h3 style="text-transform:capitalize">${base.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h3><span class="pic sec">${tn('prog.allenamenti', nel)}</span></div>
    <button class="ico-btn due" data-a="mese" data-v="1" aria-label="${t('prog.meseDopo')}" ${meseOff >= 0 ? 'disabled' : ''}>${ico('avanti', 18)}</button></div>
    <div class="calendario">${t('comune.giorniBrevi').map(g => `<span class="forte">${g}</span>`).join('')}${celle.join('')}</div></div>`;
}

registra('progressi', () => {
  const d = oggi(), piano = S.piano, amrap = S.sessioni.filter(s => s.tipo === 'amrap');
  if (!amrap.length && S.test.length < 1) return { nav: true, html: `<main class="pagina"><h1>${t('prog.titolo')}</h1><div class="card bordo centro col" style="padding:32px 20px">${ico('grafico', 32)}<p class="sec">${t('prog.vuoto')}</p></div></main>` };
  const tipi = [...new Set([...(piano ? piano.giorni.map(g => g.tipo) : []), ...amrap.map(s => s.tipoGiorno)])].sort();
  if (!tipoSel || !tipi.includes(tipoSel)) tipoSel = (amrap[amrap.length - 1] || {}).tipoGiorno || tipi[0];
  const sess = amrap.filter(s => s.tipoGiorno === tipoSel), validi = sess.filter(s => s.fattore === 1 && !s.interrotta);
  const rec = validi.slice().sort((a, b) => giriEq(b) - giriEq(a))[0], ultime = sess.slice(-8);
  const giorno = piano && piano.giorni.find(g => g.tipo === tipoSel);
  const serie = serieGiorni(S.sessioni, piano ? piano.giorniSett.length : 3, d);
  const totGiri = S.sessioni.filter(s => s.tipo !== 'test').reduce((a, s) => a + s.giri, 0);

  // Test
  const iniz = testIniziale(), ult = ultimoTest(), prec = S.test[S.test.length - 2];
  const da = confrontoDa === 'ultimo' && prec ? prec : iniz;
  const v = valutazione();
  let sezTest = '';
  if (S.test.length >= 2) {
    const mig = miglioramento(da.ris, ult.ris);
    sezTest = `<h2>${t('prog.test')}</h2>
      ${S.test.length > 2 ? `<div class="seg"><button data-a="da" data-v="inizio" aria-pressed="${confrontoDa !== 'ultimo'}">${t('prog.daInizio')}</button><button data-a="da" data-v="ultimo" aria-pressed="${confrontoDa === 'ultimo'}">${t('prog.daUltimo')}</button></div>` : ''}
      <div class="card col"><div class="fila tra"><span class="pic sec forte">${fmtData(da.data)} → ${fmtData(ult.data)}</span><span class="pill ar"><span class="num">${mig > 0 ? '+' : ''}${mig}%</span></span></div>${tabellaTest(da, ult)}</div>
      <div class="card col stretti"><h3>${t('prog.testNelTempo')}</h3>${S.test.slice(1).map(x => { const m = miglioramento(iniz.ris, x.ris); return `<div class="stat"><span>${fmtData(x.data, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="num ${m > 0 ? 'art' : ''}">${m > 0 ? '+' : ''}${m}%</span></div>`; }).join('')}</div>`;
  } else if (ult) sezTest = `<h2>${t('prog.test')}</h2><div class="card avviso"><span class="tondo">${ico('bersaglio')}</span><p class="pic sec">${t('prog.unSoloTest')}</p></div>`;

  // Misure
  const mis = S.misure, ultM = mis[mis.length - 1];
  const sezMisure = `<div class="fila tra"><h2 style="margin:0">${t('prog.misure')}</h2><button class="btn piccolo" data-a="misura">${ico('piu', 18)}${t('prog.aggiungi')}</button></div>
    ${ultM ? `<div class="card col stretti">${MISURE.filter(k => mis.some(m => m[k])).map(k => { const serieK = mis.filter(m => m[k]).map(m => m[k]), u = serieK[serieK.length - 1], diff = u - serieK[0];
      return `<div class="fila tra"><span style="font-weight:600">${t('prog.mis.' + k)}</span><span class="fila stretti">${scintilla(serieK, 56, 22, 'var(--txt2)')}<span class="num" style="font-size:20px">${fmtDec(u)} ${k === 'peso' ? 'kg' : 'cm'}</span>${serieK.length > 1 ? `<span class="pic sec">${diff > 0 ? '+' : ''}${fmtDec(diff)}</span>` : ''}</span></div>`; }).join('')}
      <span class="pic sec">${t('prog.misureUltima', { data: fmtData(ultM.data) })}</span></div>` : `<p class="pic sec">${t('prog.misureVuoto')}</p>`}`;

  return {
    nav: true,
    html: `<main class="pagina"><div class="fila tra"><h1>${t('prog.titolo')}</h1><div class="pill ar" style="padding:7px 12px">${ico('fiamma', 16)}<span class="num">${serie}</span></div></div>
      ${tipi.length ? `<div class="seg" role="group" aria-label="${t('prog.tipoGiorno')}">${tipi.map(x => `<button data-a="tipo" data-v="${x}" aria-pressed="${x === tipoSel}">${t('piano.giorno', { tipo: x })}</button>`).join('')}</div>` : ''}
      ${rec ? `<div class="card grande tenue col stretti"><span class="pic forte art">${t('prog.record', { tipo: tipoSel })}${giorno ? ' · ' + t('piano.focus', { focus: t('focus.' + giorno.focus) }) : ''}</span>
        <div class="fila base"><span class="gigante art" style="font-size:112px">${rec.giri}</span>${rec.extra ? `<span class="grosso art">+${rec.extra}</span>` : ''}<span class="sec forte">${t('comune.giri')}</span></div>
        <span class="pic sec">${fmtData(rec.data, { day: 'numeric', month: 'long' })} · AMRAP ${rec.durata}'</span></div>` : `<div class="card bordo sec centro">${t('prog.nessunaSessione', { tipo: tipoSel })}</div>`}
      ${ultime.length ? `<div class="card col"><div class="fila tra"><h3>${tn('prog.ultime', ultime.length)}</h3><span class="pic sec">${t('prog.giriEq')}</span></div>
        ${barre(ultime.map(s => ({ v: giriEq(s), testo: fmtDec(giriEq(s)), sotto: fmtData(s.data, { day: 'numeric', month: 'numeric' }), leggero: s.fattore < 1 || s.interrotta })), { etichetta: t('prog.giriEq') })}
        ${ultime.some(s => s.fattore < 1 || s.interrotta) ? `<span class="pic sec">${t('prog.legendaLeggere')}</span>` : ''}</div>` : ''}
      <div class="griglia3">${[[S.sessioni.filter(s => s.tipo !== 'test').length, t('prog.sessioni')], [totGiri, t('prog.giriTotali')], [serie, t('prog.serie')]].map(([n, l]) => `<div class="card centro" style="padding:12px 8px"><div class="medio">${n}</div><span class="pic sec">${l}</span></div>`).join('')}</div>
      ${sezTest}
      ${v ? `<h2>${t('prog.livelli')}</h2><div class="card col"><div class="fila tra"><span class="forte">${t('prog.livelloGlobale')}</span><span class="pill ar">${t('risultato.liv', { n: v.globale })} · ${t('livelli.' + v.globale + '.nome')}</span></div>
        ${AREE.map(a => `<div class="col stretti"><div class="fila tra pic"><span style="font-weight:600">${t('aree.' + a)}</span><span class="num" style="font-size:16px">${v.aree[a].liv}/5</span></div>${barraLivello(v.aree[a])}</div>`).join('')}</div>` : ''}
      ${sezMisure}
      <h2>${t('prog.calendario')}</h2>${calendario(d)}</main>`,
    azioni: {
      tipo: el => { tipoSel = el.dataset.v; disegna(); },
      da: el => { confrontoDa = el.dataset.v; disegna(); },
      mese: el => { meseOff = Math.min(0, meseOff + Number(el.dataset.v)); disegna(); },
      misura: () => {
        foglio(`<h2 style="margin:0">${t('prog.nuovaMisura')}</h2><p class="pic sec">${t('prog.misuraTesto')}</p>
          <div class="griglia2">${MISURE.map(k => `<label class="campo">${t('prog.mis.' + k)} (${k === 'peso' ? 'kg' : 'cm'})<input type="number" inputmode="decimal" data-k="${k}"></label>`).join('')}</div>
          <button class="btn primario largo" data-a="ok">${t('comune.salva')}</button><button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`,
        { ok: async (el, ev, chiudi, velo) => {
          const m = { data: d };
          velo.querySelectorAll('input[data-k]').forEach(i => { const n = parseFloat(String(i.value).replace(',', '.')); if (n > 0) m[i.dataset.k] = n; });
          if (Object.keys(m).length < 2) return toast(t('prog.misuraVuota'));
          S.misure = [...S.misure.filter(x => x.data !== d), { ...(S.misure.find(x => x.data === d) || {}), ...m }];
          if (m.peso && S.profilo) { S.profilo.peso = m.peso; await salva('profilo'); }
          await salva('misure'); chiudi(); disegna();
        } });
      },
    },
  };
});
