// Report di una sessione (#/report/<id>): curva del battito, tempo di ogni giro, zone di sforzo,
// confronto con la sessione precedente dello stesso tipo di giorno e frasi di lettura.
// I calcoli stanno in js/analisi.js; qui c'è solo il disegno. Funziona anche senza orologio, con i tempi dei giri dell'app.
import { S } from '../stato.js';
import { t, tn } from '../i18n.js';
import { registra, vai, indietro } from '../router.js';
import { esc, ico, foglio, fmtPunti, fmtData, fmtDec, condividiFile, testoFrase } from '../ui.js';
import { analizza, CONFINI_ZONE } from '../analisi.js';
import { mmss } from '../util.js';
import { immagineReport } from '../immagini.js';

export const titoloSessione = s => s.tipo === 'sfida' ? t('all.sfida', { mese: fmtData(s.data, { month: 'long' }) }) : t('piano.giorno', { tipo: s.tipoGiorno });
const segno = (n, testo) => (n > 0 ? '+' : n < 0 ? '−' : '') + testo;
const perc = v => segno(Math.round(v * 100), Math.abs(Math.round(v * 100)) + '%');

// ── Curva del battito: una linea, i confini delle zone come righe di fondo, i giri come tacche verticali.
export function scalaBattito(curva, max) {
  const b = curva.map(p => p[1]);
  let lo = Math.floor((Math.min(...b) - 4) / 10) * 10, hi = Math.ceil((Math.max(...b) + 4) / 10) * 10;
  if (hi - lo < 40) { const c = (hi + lo) / 2; lo = c - 20; hi = c + 20; }
  const confini = max ? CONFINI_ZONE.map((q, i) => ({ bpm: Math.round(q * max), zona: i + 2 })).filter(c => c.bpm > lo && c.bpm < hi) : [];
  return { lo, hi, confini, t0: curva[0][0], t1: curva[curva.length - 1][0] };
}
function graficoCurva(c, a) {
  const W = 320, H = 168, sx = 34, dx = 26, su = 14, giu = 22, sc = scalaBattito(c.curva, a.max.valore);
  const X = s => sx + (s - sc.t0) / ((sc.t1 - sc.t0) || 1) * (W - sx - dx), Y = b => su + (sc.hi - b) / (sc.hi - sc.lo) * (H - su - giu);
  const linea = c.curva.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  const picco = c.curva.reduce((m, p) => (p[1] > m[1] ? p : m), c.curva[0]);
  // Fasce: etichetta della zona a destra, al centro della fascia, se c'è spazio.
  const bordi = [sc.lo, ...sc.confini.map(k => k.bpm), sc.hi], primaZona = sc.confini.length ? sc.confini[0].zona - 1 : a.max.valore ? Math.min(5, a.cuore.zonaMedia || 1) : null;
  const fasce = primaZona == null ? '' : bordi.slice(0, -1).map((b, i) => { const alto = Y(bordi[i + 1]), basso = Y(b);
    return basso - alto >= 13 ? `<text x="${W - 2}" y="${((alto + basso) / 2 + 3.500).toFixed(1)}" text-anchor="end" class="gz">Z${primaZona + i}</text>` : ''; }).join('');
  const giri = a.bpmGiri ? a.bpmGiri.confini.filter(s => s > sc.t0 && s < sc.t1).map(s => `<line x1="${X(s).toFixed(1)}" x2="${X(s).toFixed(1)}" y1="${H - giu}" y2="${H - giu + 5}" class="gt"/>`).join('') : '';
  const minuti = Math.round((sc.t1 - sc.t0) / 60), px = X(picco[0]), py = Y(picco[1]);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('rep.curvaAria', { medio: c.medio, picco: c.picco }))}">
    <line x1="${sx}" x2="${W - dx}" y1="${H - giu}" y2="${H - giu}" class="ga"/>
    ${sc.confini.map(k => `<line x1="${sx}" x2="${W - dx}" y1="${Y(k.bpm).toFixed(1)}" y2="${Y(k.bpm).toFixed(1)}" class="gg"/><text x="${sx - 5}" y="${(Y(k.bpm) + 3.500).toFixed(1)}" text-anchor="end" class="ge">${k.bpm}</text>`).join('')}
    ${sc.confini.length ? '' : `<text x="${sx - 5}" y="${su + 4}" text-anchor="end" class="ge">${sc.hi}</text><text x="${sx - 5}" y="${H - giu}" text-anchor="end" class="ge">${sc.lo}</text>`}
    ${fasce}${giri}
    <polyline points="${linea}" class="gl"/>
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.500" class="gp"/>
    <text x="${(px > W - dx - 16 ? W - dx : Math.max(sx + 16, px)).toFixed(1)}" y="${Math.max(11, py - 9).toFixed(1)}" text-anchor="${px > W - dx - 16 ? 'end' : 'middle'}" class="gv">${picco[1]}</text>
    <text x="${sx}" y="${H - 5}" class="ge">0′</text>${minuti >= 4 ? `<text x="${((sx + W - dx) / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle" class="ge">${Math.round(minuti / 2)}′</text>` : ''}<text x="${W - dx}" y="${H - 5}" text-anchor="end" class="ge">${minuti}′</text>
  </svg>`;
}

// ── Tempo di ogni giro: un punto per giro unito da una linea; più in alto = giro più lento, così il calo finale
// si vede come una salita. La scala parte dal giro più veloce (non da zero), la riga tratteggiata è la media.
function graficoGiri(g, bpmGiri) {
  const W = 320, conBpm = !!bpmGiri, H = conBpm ? 172 : 158, sx = 16, dx = 16, su = 26, giu = conBpm ? 44 : 30;
  const margine = Math.max(4, (g.max - g.min) * 0.18), lo = g.min - margine, hi = g.max + margine;
  const X = i => (g.n === 1 ? W / 2 : sx + i * (W - sx - dx) / (g.n - 1)), Y = v => su + (hi - v) / (hi - lo) * (H - su - giu);
  const tanti = g.n > 8, mostra = i => !tanti || i === 0 || i === g.n - 1 || i === g.iMin || i === g.iMax;
  const ancora = i => (i === 0 ? 'start' : i === g.n - 1 ? 'end' : 'middle'), tx = i => (i === 0 ? X(i) - 6 : i === g.n - 1 ? X(i) + 6 : X(i));
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('rep.tempiGiroAria', { n: g.n, veloce: mmss(g.min), lento: mmss(g.max) }))}">
    <line x1="${sx - 6}" x2="${W - dx + 6}" y1="${Y(g.media).toFixed(1)}" y2="${Y(g.media).toFixed(1)}" class="gg"/>
    <polyline points="${g.tempi.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" class="gl tenue"/>
    ${g.tempi.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="5" class="${i === g.iMin ? 'gp' : 'gp neutro'}"/>${mostra(i) ? `<text x="${tx(i).toFixed(1)}" y="${(Y(v) - 10).toFixed(1)}" text-anchor="${ancora(i)}" class="gv">${mmss(v)}</text>` : ''}
      <text x="${X(i).toFixed(1)}" y="${H - giu + 20}" text-anchor="middle" class="ge">${i + 1}</text>${conBpm && bpmGiri.bpm[i] != null ? `<text x="${X(i).toFixed(1)}" y="${H - giu + 34}" text-anchor="middle" class="ge forte">${bpmGiri.bpm[i]}</text>` : ''}`).join('')}
  </svg>`;
}

// ── Zone di sforzo: una riga per zona, dalla più alta; la tinta va da chiara (Z1) a piena (Z5), il nome è scritto accanto.
function righeZone(z, max) {
  const lim = CONFINI_ZONE.map(q => Math.round(q * max));
  const intervallo = i => (i === 0 ? t('rep.fino', { n: lim[0] - 1 }) : i === 4 ? t('rep.da', { n: lim[3] }) : `${lim[i - 1]}–${lim[i] - 1}`);
  return `<div class="zone">${[4, 3, 2, 1, 0].map(i => `<div class="z${i + 1}"><span class="nome"><b class="num">Z${i + 1}</b> ${t('rep.zona.' + (i + 1))}<small>${intervallo(i)} bpm</small></span>
    <span class="pista"><b style="width:${z.sec[i] ? Math.max(2, Math.round(z.quota[i] * 100)) : 0}%"></b></span>
    <span class="val"><b class="num">${mmss(z.sec[i])}</b><small>${Math.round(z.quota[i] * 100)}%</small></span></div>`).join('')}</div>`;
}

function tabellaConfronto(s, cf) {
  const riga = (nome, prima, ora, diff) => `<tr><td>${nome}</td><td class="sec">${prima}</td><td>${ora}</td><td class="num">${diff}</td></tr>`;
  const righe = [];
  if (cf.giri) righe.push(riga(t('rep.righe.giri'), fmtPunti(cf.precGiri, cf.precExtra), fmtPunti(s.giri, s.extra), segno(cf.giri.diff, fmtDec(Math.abs(cf.giri.diff)))));
  if (cf.mediaGiro) righe.push(riga(t('rep.righe.mediaGiro'), mmss(cf.mediaGiro.prima), mmss(cf.mediaGiro.ora), segno(Math.round(cf.mediaGiro.diff), Math.abs(Math.round(cf.mediaGiro.diff)) + ' s')));
  if (cf.calo) righe.push(riga(t('rep.righe.calo'), perc(cf.calo.prima), perc(cf.calo.ora), ''));
  if (cf.bpm) righe.push(riga(t('rep.righe.bpm'), cf.bpm.prima, cf.bpm.ora, segno(cf.bpm.diff, Math.abs(cf.bpm.diff))));
  if (cf.fatica) righe.push(riga(t('rep.righe.fatica'), cf.fatica.prima, cf.fatica.ora, segno(cf.fatica.diff, Math.abs(cf.fatica.diff))));
  return `<table class="tab conf"><thead><tr><th></th><th>${fmtData(cf.data)}</th><th>${fmtData(s.data)}</th><th>${t('rep.diff')}</th></tr></thead><tbody>${righe.join('')}</tbody></table>`;
}

registra('report', ([id]) => {
  const s = S.sessioni.find(x => x.id === id);
  if (!s || s.tipo === 'test') return { html: '', dopo: () => vai('progressi', true) };
  const a = analizza(s, S.sessioni, S.profilo || {}), g = a.giri, c = a.cuore, cf = a.confronto, max = a.max;
  const tessera = (v, l, piccolo = '') => `<div class="card centro" style="padding:12px 6px"><div class="medio">${v}${piccolo ? `<span style="font-size:18px"> ${piccolo}</span>` : ''}</div><span class="pic sec">${l}</span></div>`;
  const tessere = [tessera(s.giri, t('rep.giri'), s.extra ? '+' + s.extra : ''), tessera(a.mediaGiro ? mmss(a.mediaGiro) : '—', t('rep.mediaGiro')), tessera(s.fatica != null ? s.fatica : '—', t('rep.fatica'), s.fatica != null ? '/10' : '')];
  if (c) tessere.push(tessera(c.medio != null ? c.medio : '—', t('rep.bpmMedio')), tessera(c.picco != null ? c.picco : '—', t('rep.bpmMax')), tessera(c.calorie != null ? c.calorie : '—', t('rep.kcal')));
  const notaMax = max.valore ? `<p class="pic sec">${t('rep.maxFonte.' + max.fonte, { bpm: max.valore })} <a href="#/modifica/chi">${t('rep.maxModifica')}</a></p>${c && c.oltreMax ? `<p class="pic forte">${t('rep.oltreMax', { picco: c.picco })}</p>` : ''}` : '';

  const sezGiri = g && g.n >= 2 ? `<div class="card col"><div class="fila tra"><h3>${t('rep.tempiGiro')}</h3><span class="pic sec">${t(a.fonteGiri === 'orologio' ? 'rep.fonteOrologio' : 'rep.fonteApp')}</span></div>
      ${graficoGiri(g, a.bpmGiri)}
      <span class="pic sec">${t('rep.giriLegenda', { media: mmss(g.media) })}</span>
      <div class="stat"><span>${t('rep.veloce', { n: g.iMin + 1 })}</span><span class="num">${mmss(g.min)}</span></div>
      <div class="stat"><span>${t('rep.lento', { n: g.iMax + 1 })}</span><span class="num">${mmss(g.max)}</span></div>
      <div class="stat"><span>${t('rep.primiUltimi')}</span><span class="num">${mmss(g.primi)} → ${mmss(g.ultimi)} <span class="${g.calo >= 0.08 ? '' : 'sec'}" style="font-size:16px">${perc(g.calo)}</span></span></div>
      ${a.bpmGiri ? `<span class="pic sec">${t('rep.bpmGiro')}</span>` : ''}</div>`
    : `<div class="card col stretti"><h3>${t('rep.tempiGiro')}</h3><p class="pic sec">${g && g.n === 1 ? t('rep.unGiro', { t: mmss(g.min) }) : t('rep.senzaGiri')}</p></div>`;

  const sezZone = c && c.zone ? `<div class="card col"><h3>${t('rep.zone')}</h3>${righeZone(c.zone, max.valore)}${notaMax}</div>`
    : c && c.quota != null ? `<div class="card col stretti"><h3>${t('rep.zone')}</h3><p>${t('rep.zoneSoloMedia', { bpm: c.medio, pct: Math.round(c.quota * 100), z: c.zonaMedia, nome: t('rep.zona.' + c.zonaMedia).toLowerCase() })}</p>${notaMax}</div>`
    : '';

  return {
    html: `<main class="pagina piena">
      <div class="fila"><button class="ico-btn" data-a="indietro" aria-label="${t('comune.indietro')}">${ico('indietro')}</button><h1 class="cresce" style="font-size:24px">${t('rep.titolo')}</h1>
        <button class="ico-btn" data-a="condividi" aria-label="${t('rep.condividiAria')}">${ico('condividi')}</button></div>
      <div><span class="pic forte sec">${esc(titoloSessione(s))} · AMRAP ${s.durata}' · ${fmtData(s.data, { weekday: 'short', day: 'numeric', month: 'long' })}</span>
        <div class="fila avvolgi stretti" style="margin-top:8px">${s.focus ? `<span class="pill ar">${t('piano.focus', { focus: t('focus.' + s.focus) })}</span>` : ''}<span class="pill">${tn('oggi.obiettivo', s.obiettivo)}</span>${s.motivo ? `<span class="pill">${t('oggi.motivo.' + s.motivo)}</span>` : ''}${s.interrotta ? `<span class="pill">${t('rep.interrotta')}</span>` : ''}</div></div>
      <div class="griglia3">${tessere.join('')}</div>
      <div class="card tenue avviso"><span class="tondo">${ico('lampadina')}</span><div class="col stretti cresce"><h3>${t('rep.lettura')}</h3>
        <ul class="punti">${a.frasi.map(f => `<li>${esc(testoFrase(f))}</li>`).join('')}</ul><p class="pic sec">${t('rep.letturaNota')}</p></div></div>
      ${c && c.curva ? `<div class="card col"><div class="fila tra"><h3>${t('rep.curva')}</h3><span class="pic sec">bpm</span></div>${graficoCurva(c, a)}
        ${c.deriva != null ? `<div class="stat"><span>${t('rep.deriva')}</span><span class="num">${segno(c.deriva, Math.abs(c.deriva))} bpm</span></div>` : ''}</div>` : ''}
      ${sezGiri}${sezZone}
      <div class="card col"><h3>${t('rep.confronto')}</h3>
        ${cf ? `${tabellaConfronto(s, cf)}${cf.circuitoDiverso ? `<p class="pic sec">${t('rep.circuitoDiverso')}</p>` : ''}<a class="btn piccolo" href="#/report/${cf.id}" style="align-self:flex-start">${t('rep.apriPrecedente')}</a>` : `<p class="pic sec">${t('rep.primaVolta')}</p>`}</div>
      ${c && c.curva ? '' : `<div class="card avviso"><span class="tondo">${ico('orologio')}</span><div class="col stretti cresce"><h3>${t('rep.aggiungiOrologio')}</h3><p class="pic sec">${t('rep.aggiungiOrologioTesto')}</p>
        <a class="btn piccolo" href="#/orologi" style="align-self:flex-start;margin-top:4px">${t('oro.importa')}</a></div></div>`}
      <button class="btn primario largo" data-a="condividi">${ico('condividi')}${t('rep.condividi')}</button></main>`,
    azioni: {
      indietro: () => indietro('progressi'),
      condividi: () => {
        const invia = async conBattito => {
          const blob = await immagineReport(s, a, { titolo: titoloSessione(s), conBattito });
          await condividiFile(blob, `homrap-report-${s.data}.png`, t('img.motto'));
        };
        if (!c) return invia(false);
        foglio(`<h2 style="margin:0">${t('rep.condividiTitolo')}</h2><p class="sec">${t('rep.condividiTesto')}</p>
          <button class="btn primario largo" data-a="senza">${t('rep.senzaBattito')}</button><button class="btn largo" data-a="con">${t('rep.conBattito')}</button><button class="btn testo largo" data-a="chiudi">${t('comune.annulla')}</button>`,
        { senza: (b, ev, chiudi) => { chiudi(); invia(false); }, con: (b, ev, chiudi) => { chiudi(); invia(true); } });
      },
    },
  };
});
