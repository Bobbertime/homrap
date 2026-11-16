// Scheda Progressi: record e grafico per tipo di giorno, test mensili, livelli, misure, calendario.
import { S, salva, oggi, valutazione, testIniziale, ultimoTest } from '../stato.js';
import { t, tn, locale } from '../i18n.js';
import { registra, disegna, vai } from '../router.js';
import { esc, ico, foglio, barre, scintilla, lineaPunti, fmtPunti, fmtData, fmtDec, toast } from '../ui.js';
import { giriEq, serieGiorni, miglioramento, AREE } from '../logica.js';
import { titoloSessione } from './report.js';
import { andamento, tendenza, bpmMassimo, caricoSettimane, avvisoCarico, recuperoBattito, serieDi, misuraProgressione, chiaveCircuito } from '../analisi.js';
import { mmss } from '../util.js';
import { daIso, isoData, meseISO } from '../util.js';
import { barraLivello, tabellaTest } from './test.js';

let tipoSel = null, confrontoDa = 'inizio', meseOff = 0, circuitoSel = null;
const ORO = 'oro';     // scheda degli allenamenti fatti solo con l'orologio, accanto ai giorni A, B, C…

// Progressione misurata su sessioni dello stesso circuito: giri (o tempo del giro) e battiti per giro, con un verdetto solo quando i dati bastano.
function cartaMisura(serie, soloOrologio) {
  if (!serie.length) return '';
  const m = misuraProgressione(serie), v1 = soloOrologio ? m.ritmo : m.giri, chiave1 = soloOrologio ? 'ritmo' : 'giri', fmt1 = x => (soloOrologio ? mmss(x) : fmtDec(x));
  const frase = (chiave, v, fmt) => t(`mis.${chiave}.${v.k}`, v.k === 'pochi' ? { n: v.n } : { a: fmt(v.prima), b: fmt(v.dopo), d: fmt(Math.abs(v.diff)), pct: fmtDec(v.pct), n: v.n });
  const vb = m.battiti, scarse = m.punti.filter(p => p.qualita === 'scarsa').length;
  const grafico = lineaPunti(m.punti.map(p => p.battiti), { etichetta: t('mis.grafico') });
  return `<div class="card col"><div class="fila tra"><h3>${t('mis.titolo')}</h3><span class="pic sec">${tn('mis.sotto', serie.length, { data: fmtData(serie[0].data) })}</span></div>
    <p class="pic"><b>${esc(frase(chiave1, v1, fmt1))}</b></p>
    <p class="pic"><b>${esc(frase('battiti', vb, x => String(Math.round(x))))}</b>${['migliora', 'peggiora'].includes(vb.k) && vb.forza === 'indicativa' ? ' ' + t('mis.indicativa', { n: vb.n }) : ''}</p>
    ${grafico ? `<div><span class="pic forte sec">${t('mis.grafico')}</span>${grafico}</div>` : ''}
    ${scarse ? `<span class="pic sec">${tn('mis.scartate', scarse)}</span>` : ''}<span class="pic sec">${t('mis.nota')}</span></div>`;
}
const MISURE = ['peso', 'vita', 'petto', 'fianchi', 'braccio', 'coscia'];

function calendario(d) {
  const base = daIso(d); base.setDate(1); base.setMonth(base.getMonth() + meseOff);
  const anno = base.getFullYear(), mese = base.getMonth(), primo = (base.getDay() + 6) % 7, giorni = new Date(anno, mese + 1, 0).getDate();
  const fatti = new Set(S.sessioni.filter(s => s.tipo !== 'test').map(s => s.data));
  const celle = Array.from({ length: primo }, () => '<span></span>');
  for (let g = 1; g <= giorni; g++) { const iso = isoData(new Date(anno, mese, g, 12));   // i giorni con un allenamento aprono il report
    celle.push(fatti.has(iso) ? `<button class="f ${iso === d ? 'o' : ''}" data-a="giornoCal" data-v="${iso}" aria-label="${t('rep.apriDel', { data: fmtData(iso, { day: 'numeric', month: 'long' }) })}">${g}</button>` : `<span class="${iso === d ? 'o' : ''}">${g}</span>`); }
  const nel = [...fatti].filter(x => meseISO(x) === meseISO(isoData(base))).length;
  return `<div class="card col"><div class="fila tra"><button class="ico-btn due" data-a="mese" data-v="-1" aria-label="${t('prog.mesePrima')}">${ico('indietro', 18)}</button>
    <div class="centro"><h3 style="text-transform:capitalize">${base.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</h3><span class="pic sec">${tn('prog.allenamenti', nel)}</span></div>
    <button class="ico-btn due" data-a="mese" data-v="1" aria-label="${t('prog.meseDopo')}" ${meseOff >= 0 ? 'disabled' : ''}>${ico('avanti', 18)}</button></div>
    <div class="calendario">${t('comune.giorniBrevi').map(g => `<span class="forte">${g}</span>`).join('')}${celle.join('')}</div></div>`;
}

registra('progressi', () => {
  const d = oggi(), piano = S.piano, amrap = S.sessioni.filter(s => s.tipo === 'amrap');
  if (!amrap.length && S.test.length < 1 && !S.sessioni.some(s => s.tipo === 'orologio')) return { nav: true, html: `<main class="pagina"><h1>${t('prog.titolo')}</h1><div class="card bordo centro col" style="padding:32px 20px">${ico('grafico', 32)}<p class="sec">${t('prog.vuoto')}</p></div></main>` };
  const soloOro = S.sessioni.filter(s => s.tipo === 'orologio');
  const tipi = [...new Set([...(piano ? piano.giorni.map(g => g.tipo) : []), ...amrap.map(s => s.tipoGiorno)])].sort(); if (soloOro.length) tipi.push(ORO);
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

  // Battito di recupero misurato nei test (facoltativo)
  const recuperi = S.test.map(x => ({ x, r: recuperoBattito(x) })).filter(o => o.r);
  if (recuperi.length) sezTest += `<div class="card col stretti"><h3>${t('prog.recupero')}</h3>${recuperi.map(({ x, r }) => `<div class="stat"><span>${fmtData(x.data, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="num">−${r.calo} bpm</span></div>`).join('')}<span class="pic sec">${t('prog.recuperoNota')}</span></div>`;

  // Andamento del tipo di giorno scelto: battito medio e calo finale, un grafico per misura
  const punti = andamento(S.sessioni, tipoSel, bpmMassimo(S.profilo || {}, S.sessioni).valore), tend = tendenza(punti);
  const gBpm = lineaPunti(punti.map(p => p.bpm), { etichetta: t('prog.andBpm') }), gCalo = lineaPunti(punti.map(p => (p.calo == null ? null : Math.round(p.calo * 100))), { fmt: v => (v > 0 ? '+' : '') + v + '%', etichetta: t('prog.andCalo') });
  const sezAndamento = gBpm || gCalo ? `<div class="card col"><div class="fila tra"><h3>${t('prog.andamento', { tipo: tipoSel })}</h3><span class="pic sec">${fmtData(punti[0].data)} → ${fmtData(punti[punti.length - 1].data)}</span></div>
      ${gBpm ? `<div><span class="pic forte sec">${t('prog.andBpm')}</span>${gBpm}</div>` : ''}${gCalo ? `<div><span class="pic forte sec">${t('prog.andCalo')}</span>${gCalo}</div>` : ''}
      ${tend ? `<p class="pic">${esc(t('prog.tend.' + tend.k, { ...tend.par, giri: fmtDec(tend.par.giri) }))}</p>` : ''}<span class="pic sec">${t('prog.andNota')}</span></div>` : '';

  // Carico delle ultime 6 settimane
  const sett = caricoSettimane(S.sessioni, d, 6), avv = avvisoCarico(S.sessioni, d);
  const sezCarico = sett.some(w => w.carico) ? `<div class="card col"><div class="fila tra"><h3>${t('prog.carico')}</h3><span class="pic sec">${t('prog.caricoUnita')}</span></div>
      ${barre(sett.map(w => ({ v: w.carico, testo: String(w.carico), sotto: fmtData(w.lunedi, { day: 'numeric', month: 'numeric' }) })), { etichetta: t('prog.carico') })}
      ${avv ? `<p class="pic forte">${esc(t('carico.testo.' + avv.k, avv.par))}</p>` : ''}<span class="pic sec">${t('prog.caricoNota')}</span></div>` : '';

  // Misure
  const mis = S.misure, ultM = mis[mis.length - 1];
  const sezMisure = `<div class="fila tra"><h2 style="margin:0">${t('prog.misure')}</h2><button class="btn piccolo" data-a="misura">${ico('piu', 18)}${t('prog.aggiungi')}</button></div>
    ${ultM ? `<div class="card col stretti">${MISURE.filter(k => mis.some(m => m[k])).map(k => { const serieK = mis.filter(m => m[k]).map(m => m[k]), u = serieK[serieK.length - 1], diff = u - serieK[0];
      return `<div class="fila tra"><span style="font-weight:600">${t('prog.mis.' + k)}</span><span class="fila stretti">${scintilla(serieK, 56, 22, 'var(--txt2)')}<span class="num" style="font-size:20px">${fmtDec(u)} ${k === 'peso' ? 'kg' : 'cm'}</span>${serieK.length > 1 ? `<span class="pic sec">${diff > 0 ? '+' : ''}${fmtDec(diff)}</span>` : ''}</span></div>`; }).join('')}
      <span class="pic sec">${t('prog.misureUltima', { data: fmtData(ultM.data) })}</span></div>` : `<p class="pic sec">${t('prog.misureVuoto')}</p>`}`;

  // A parità di circuito: la serie dell'ultima sessione di questo tipo di giorno
  const ultimaDelTipo = sess.filter(s => !s.interrotta).pop(), sezMisura = ultimaDelTipo ? cartaMisura(serieDi(ultimaDelTipo, S.sessioni), false) : '';
  // Scheda Orologio: allenamenti fatti senza l'app, raggruppati per nome di circuito
  let sezOrologio = '';
  if (tipoSel === ORO) {
    const chiavi = [...new Set(soloOro.map(chiaveCircuito))], nomeDi = k => { const s = soloOro.find(x => chiaveCircuito(x) === k); return s.etichetta || t('mis.senzaNome'); };
    if (!circuitoSel || !chiavi.includes(circuitoSel)) circuitoSel = chiaveCircuito(soloOro[soloOro.length - 1]);
    const delCircuito = soloOro.filter(s => chiaveCircuito(s) === circuitoSel), conNome = !!delCircuito[0].etichetta;
    sezOrologio = `<div class="col stretti"><span class="pic forte sec">${t('mis.nomi')}</span><div class="fila avvolgi stretti">${[...new Set(chiavi.map(k => (nomeDi(k) === t('mis.senzaNome') ? null : k)).filter(Boolean)), ...chiavi.filter(k => nomeDi(k) === t('mis.senzaNome'))].map(k => `<button class="chip" data-a="circuito" data-v="${esc(k)}" aria-pressed="${k === circuitoSel}">${esc(nomeDi(k))}</button>`).join('')}</div></div>
      ${conNome ? cartaMisura(delCircuito.filter(s => !s.interrotta), true) : `<div class="card bordo sec pic">${t('mis.vuotoNome')}</div>`}
      <div class="col stretti">${delCircuito.slice().reverse().map(s => `<a class="riga alta" href="#/report/${encodeURIComponent(s.id)}" style="text-decoration:none;color:inherit"><span class="tondo">${ico('orologio', 18)}</span><span class="cresce"><span class="forte" style="display:block">${fmtData(s.data, { weekday: 'short', day: 'numeric', month: 'long' })}</span><span class="pic sec">${fmtPunti(s.giri, s.extra)} ${t('comune.giri')}${s.orologio && s.orologio.bpmMedio ? ' · ' + s.orologio.bpmMedio + ' bpm' : ''}</span></span><span class="sec">${ico('avanti', 18)}</span></a>`).join('')}</div>`;
  }
  const nomeTipo = x => (x === ORO ? t('prog.tabOrologio') : t('piano.giorno', { tipo: x }));
  return {
    nav: true,
    html: `<main class="pagina"><div class="fila tra"><h1>${t('prog.titolo')}</h1><div class="pill ar" style="padding:7px 12px">${ico('fiamma', 16)}<span class="num">${serie}</span></div></div>
      ${tipi.length ? `<div class="seg" role="group" aria-label="${t('prog.tipoGiorno')}">${tipi.map(x => `<button data-a="tipo" data-v="${x}" aria-pressed="${x === tipoSel}">${nomeTipo(x)}</button>`).join('')}</div>` : ''}
      ${tipoSel === ORO ? sezOrologio : `${rec ? `<div class="card grande tenue col stretti"><span class="pic forte art">${t('prog.record', { tipo: tipoSel })}${giorno ? ' · ' + t('piano.focus', { focus: t('focus.' + giorno.focus) }) : ''}</span>
        <div class="fila base"><span class="gigante art" style="font-size:112px">${rec.giri}</span>${rec.extra ? `<span class="grosso art">+${rec.extra}</span>` : ''}<span class="sec forte">${t('comune.giri')}</span></div>
        <span class="pic sec">${fmtData(rec.data, { day: 'numeric', month: 'long' })} · AMRAP ${rec.durata}'</span></div>` : `<div class="card bordo sec centro">${t('prog.nessunaSessione', { tipo: tipoSel })}</div>`}
      ${ultime.length ? `<div class="card col"><div class="fila tra"><h3>${tn('prog.ultime', ultime.length)}</h3><span class="pic sec">${t('prog.giriEq')}</span></div>
        ${barre(ultime.map(s => ({ v: giriEq(s), testo: fmtDec(giriEq(s)), sotto: fmtData(s.data, { day: 'numeric', month: 'numeric' }), leggero: s.fattore < 1 || s.interrotta, id: s.id,
          aria: t('rep.apriDel', { data: fmtData(s.data, { day: 'numeric', month: 'long' }) }) })), { etichetta: t('prog.giriEq'), azione: 'report' })}
        <span class="pic sec">${t('rep.toccaBarra')}${ultime.some(s => s.fattore < 1 || s.interrotta) ? ' ' + t('prog.legendaLeggere') : ''}</span></div>` : ''}
      ${sezMisura}${sezAndamento}`}
      <div class="griglia3">${[[S.sessioni.filter(s => s.tipo !== 'test').length, t('prog.sessioni')], [totGiri, t('prog.giriTotali')], [serie, t('prog.serie')]].map(([n, l]) => `<div class="card centro" style="padding:12px 8px"><div class="medio">${n}</div><span class="pic sec">${l}</span></div>`).join('')}</div>
      ${sezCarico}
      ${sezTest}
      ${v ? `<h2>${t('prog.livelli')}</h2><div class="card col"><div class="fila tra"><span class="forte">${t('prog.livelloGlobale')}</span><span class="pill ar">${t('risultato.liv', { n: v.globale })} · ${t('livelli.' + v.globale + '.nome')}</span></div>
        ${AREE.map(a => `<div class="col stretti"><div class="fila tra pic"><span style="font-weight:600">${t('aree.' + a)}</span><span class="num" style="font-size:16px">${v.aree[a].liv}/5</span></div>${barraLivello(v.aree[a])}</div>`).join('')}</div>` : ''}
      ${sezMisure}
      <h2>${t('prog.calendario')}</h2>${calendario(d)}</main>`,
    azioni: {
      tipo: el => { tipoSel = el.dataset.v; disegna(); },
      circuito: el => { circuitoSel = el.dataset.v; disegna(); },
      da: el => { confrontoDa = el.dataset.v; disegna(); },
      mese: el => { meseOff = Math.min(0, meseOff + Number(el.dataset.v)); disegna(); },
      report: el => vai('report/' + encodeURIComponent(el.dataset.v)),
      giornoCal: el => {
        const del = S.sessioni.filter(s => s.tipo !== 'test' && s.data === el.dataset.v);
        if (del.length === 1) return vai('report/' + encodeURIComponent(del[0].id));
        foglio(`<h2 style="margin:0">${t('rep.scegli')}</h2>${del.map(s => `<button class="riga alta" data-a="s" data-v="${esc(s.id)}"><span class="cresce" style="font-weight:600">${esc(titoloSessione(s))} · ${fmtPunti(s.giri, s.extra)} ${t('comune.giri')}</span><span class="sec">${ico('avanti', 18)}</span></button>`).join('')}
          <button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`, { s: (b, ev, chiudi) => { chiudi(); vai('report/' + encodeURIComponent(b.dataset.v)); } });
      },
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
