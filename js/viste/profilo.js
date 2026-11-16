// Scheda Profilo e schermate collegate: libreria esercizi, scheda esercizio, cosa comprare, orologi, sicurezza.
import { S, salva, salvaSessione, contesto, importa, cancellaTutto, valutazione, oggi } from '../stato.js';
import { t, tn, nomeEsercizio, lingua, LINGUE } from '../i18n.js';
import { registra, vai, disegna, indietro } from '../router.js';
import { esc, ico, foglio, toast, conferma, avatar, sagoma, interruttore, figuraAnimata, alternaFigura, intestazione, fmtData, fmtPunti, copiaTesto } from '../ui.js';
import { consigliAcquisto, haAttrezzi, OBIETTIVI } from '../logica.js';
import { iniziali } from '../classifica.js';
import { ESERCIZI, PER_ID, SCHEMI } from '../../data/esercizi.js';
import { verificaBackup } from '../backup.js';
import { salvaBackup, applicaTema, riammetti, risolviFastidio } from '../azioni.js';
import { leggiFileOrologio, abbina, giriDaLap } from '../orologi.js';
import { attivaDemo, disattivaDemo } from '../demo.js';
import { mmss, linkVideo, uid, isoData } from '../util.js';

export const VERSIONE = '1.0.6';

export async function ripristinaDaFile(file, dopo) {
  if (!file) return;
  const v = verificaBackup(await file.text());
  if (!v.ok) return toast(t('bak.errore.' + v.errore));
  const r = v.riepilogo;
  foglio(`<h2 style="margin:0">${t('bak.ripristinaTitolo')}</h2>
    <div class="card"><div class="stat"><span>${t('bak.rNome')}</span><span class="forte" style="color:var(--txt)">${esc(r.nome || '—')}</span></div><div class="stat"><span>${t('bak.rData')}</span><span class="forte" style="color:var(--txt)">${fmtData(r.creato, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <div class="stat"><span>${t('bak.rSessioni')}</span><span class="num">${r.sessioni}</span></div><div class="stat"><span>${t('bak.rTest')}</span><span class="num">${r.test}</span></div></div>
    <p class="sec pic">${t('bak.ripristinaTesto')}</p>
    <button class="btn primario largo" data-a="ok">${t('bak.ripristinaOk')}</button><button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`,
  { ok: async (el, ev, chiudi) => { await importa(v.dati); applicaTema(); chiudi(); toast(t('bak.ripristinato')); if (dopo) dopo(); else disegna(); } });
}

const voce = (icona, etichetta, valore, href) => `<a class="riga alta" href="#/${href}" style="text-decoration:none;color:inherit"><span class="tondo">${ico(icona, 18)}</span><span class="cresce"><span class="forte" style="display:block">${esc(etichetta)}</span>${valore ? `<span class="pic sec" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(valore)}</span>` : ''}</span><span class="sec">${ico('avanti', 18)}</span></a>`;
const interr = (chiave, etichetta, desc) => `<div class="riga alta"><span class="cresce"><span class="forte" style="display:block">${etichetta}</span>${desc ? `<span class="pic sec">${desc}</span>` : ''}</span>${interruttore('pref', !!S.preferenze[chiave], etichetta, `data-v="${chiave}"`)}</div>`;

registra('profilo', () => {
  const p = S.profilo || {}, v = valutazione(), att = Object.keys(S.attrezzi), giorniB = S.backup.ultimo ? Math.floor((Date.now() - S.backup.ultimo) / 864e5) : null;
  return {
    nav: true,
    html: `<main class="pagina">
      <div class="fila">${avatar(iniziali(p.nome), S.io.colore, 64)}<div><h1 style="font-size:28px">${esc(p.nome || '')}</h1><div class="sec">${v ? `${t('risultato.livello', { n: v.globale })} · ${t('livelli.' + v.globale + '.nome')}` : t('prof.senzaTest')}</div></div></div>
      ${S.stato.demo ? `<div class="card tenue avviso"><span class="tondo">${ico('occhio')}</span><p class="pic forte">${t('demo.attiva')}</p></div>` : ''}
      <h2>${t('prof.tuoProfilo')}</h2><div class="col stretti">
        ${voce('persona', t('onb.chi.titolo'), [p.eta ? tn('prof.anni', p.eta) : '', p.altezza ? p.altezza + ' cm' : '', p.peso ? p.peso + ' kg' : '', p.bpmMax ? t('prof.bpmMax', { n: p.bpmMax }) : ''].filter(Boolean).join(' · '), 'modifica/chi')}
        ${voce('bersaglio', t('prof.obiettivi'), (p.obiettivi || []).map(o => t('obiettivi.' + o + '.nome')).join(', '), 'modifica/obiettivi')}
        ${voce('grafico', t('prof.esperienza'), p.esperienza ? t('esperienza.' + p.esperienza + '.nome') : '', 'modifica/esperienza')}
        ${voce('corpo', t('prof.zone'), [...(p.infortuni || []), ...(p.zoneMeno || [])].map(z => t('zone.' + z)).join(', ') || t('prof.nessuna'), 'modifica/zone')}
        ${voce('calendario', t('prof.disponibilita'), `${tn('prof.giorniSett', p.giorni || 3)} · ${p.durata || 20} min`, 'modifica/disponibilita')}
        ${voce('peso', t('prof.attrezzatura'), att.length ? att.map(a => t('attrezzi.' + a) + (a === 'manubri' && S.attrezzi.manubri.singolo ? ` (${t('prof.unoSolo')})` : '')).join(', ') : t('onb.att.soloCorpo'), 'modifica/attrezzatura')}
        ${voce('orologio', t('prof.orologio'), S.orologio ? `${t('marche.' + S.orologio.marca)} ${S.orologio.modello || ''}` : t('onb.oro.nessuno'), 'modifica/orologio')}
        ${voce('scudo', t('prof.questionario'), p.sicurezza && p.sicurezza.cauto ? t('prof.cauto') : '', 'modifica/sicurezza')}</div>
      <h2>${t('prof.allenamento')}</h2><div class="col stretti">
        ${S.piano ? voce('nota', t('piano.titoloVedi'), t('piano.blocco', { n: S.piano.blocco }), 'piano/vedi') : ''}
        ${voce('libro', t('prof.libreria'), tn('prof.nEsercizi', ESERCIZI.length), 'libreria')}
        ${voce('carrello', t('compra.titolo'), t('compra.sotto'), 'comprare')}
        ${voce('orologio', t('oro.titolo'), t('oro.sotto'), 'orologi')}
        ${voce('ricarica', t('prof.rifaiTest'), t('prof.rifaiTestDesc'), 'test/mensile')}
        ${voce('matita', t('prof.rifaiOnboarding'), '', 'onboarding')}</div>
      <h2>${t('prof.impostazioni')}</h2>
      <div class="seg" role="group" aria-label="${t('prof.tema')}">${['auto', 'scuro', 'chiaro'].map(x => `<button data-a="tema" data-v="${x}" aria-pressed="${(S.preferenze.tema || 'auto') === x}">${t('prof.temi.' + x)}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="${t('prof.lingua')}">${Object.keys(LINGUE).map(x => `<button data-a="lingua" data-v="${x}" aria-pressed="${lingua() === x}">${t('prof.lingue.' + x)}</button>`).join('')}</div>
      <div class="col stretti">${interr('voce', t('prof.voce'), t('prof.voceDesc'))}${interr('suoni', t('prof.suoni'), '')}${interr('vibrazione', t('prof.vibrazione'), '')}${interr('noSalti', t('prof.noSalti'), t('prof.noSaltiDesc'))}</div>
      <h2>${t('prof.dati')}</h2><div class="col stretti">
        <button class="riga alta" data-a="backup"><span class="tondo">${ico('scarica', 18)}</span><span class="cresce"><span class="forte" style="display:block">${t('bak.salva')}</span><span class="pic sec">${giorniB == null ? t('bak.mai') : giorniB === 0 ? t('bak.oggi') : tn('bak.fa', giorniB)}</span></span></button>
        <label class="riga alta" style="cursor:pointer"><span class="tondo">${ico('condividi', 18)}</span><span class="cresce forte">${t('bak.ripristina')}</span><input type="file" accept=".json,application/json" hidden data-c="ripristina"></label>
        <div class="riga alta"><span class="cresce"><span class="forte" style="display:block">${t('demo.titolo')}</span><span class="pic sec">${t('demo.desc')}</span></span>${interruttore('demo', !!S.stato.demo, t('demo.titolo'))}</div>
        ${voce('scudo', t('sic.titolo'), '', 'sicurezza')}${voce('telefono', t('installa.titolo'), '', 'installa')}
        <button class="btn pericolo largo" data-a="cancella" style="margin-top:8px">${ico('cestino', 18)}${t('prof.cancella')}</button></div>
      <p class="pic sec centro">HoMRAP ${VERSIONE} · ${t('benvenuto.motto')}</p></main>`,
    azioni: {
      tema: async el => { S.preferenze.tema = el.dataset.v; await salva('preferenze'); applicaTema(); disegna(); },
      lingua: async el => { S.preferenze.lingua = el.dataset.v; await salva('preferenze'); applicaTema(); disegna(); },
      pref: async el => { const k = el.dataset.v; S.preferenze[k] = !S.preferenze[k]; await salva('preferenze'); if (k === 'noSalti' && S.piano) return vai('piano/aggiorna'); disegna(); },
      backup: async () => { if (await salvaBackup()) disegna(); },
      ripristina: el => ripristinaDaFile(el.files[0]),
      demo: async () => { if (S.stato.demo) await disattivaDemo(); else await attivaDemo(); applicaTema(); toast(t(S.stato.demo ? 'demo.accesa' : 'demo.spenta')); vai('oggi'); },
      cancella: async () => {
        if (S.stato.demo) return toast(t('demo.bloccato'));   // cancellando nella demo si perderebbero anche i dati veri messi da parte
        if (!(await conferma(t('prof.cancellaTitolo'), t('prof.cancellaTesto'), t('prof.cancellaOk')))) return;
        if (!(await conferma(t('prof.cancellaTitolo2'), t('prof.cancellaTesto2'), t('prof.cancellaOk2')))) return;
        await cancellaTutto(); applicaTema(); vai('benvenuto');
      },
    },
  };
});

registra('libreria', () => {
  const ctx = contesto();
  return { html: `<main class="pagina piena">${intestazione(t('prof.libreria'))}<p class="sec">${t('lib.testo')}</p>
    ${SCHEMI.map(s => `<h2>${t('schemi.' + s)}</h2><div class="col stretti">${ESERCIZI.filter(e => e.schema === s).sort((a, b) => a.liv - b.liv).map(e => { const ok = haAttrezzi(e, ctx.attrezzi), no = S.esercizi.scartati.includes(e.id);
      return `<a class="riga ${ok && !no ? '' : 'spento'}" href="#/esercizio/${e.id}" style="text-decoration:none;color:inherit"><span class="tondo num" style="font-size:18px">${e.liv}</span><span class="cresce"><span style="font-weight:600;display:block">${esc(nomeEsercizio(e.id))}</span>${no ? `<span class="pic sec">${t('lib.escluso')}</span>` : e.att.length ? `<span class="pic sec">${e.att.map(g => g.map(a => t('attrezzi.' + a)).join(' / ')).join(' + ')}</span>` : ''}</span><span class="sec">${ico('avanti', 18)}</span></a>`; }).join('')}</div>`).join('')}</main>` };
});

registra('esercizio', ([id]) => {
  const e = PER_ID[id];
  if (!e) return { html: '', dopo: () => vai('libreria', true) };
  const T = k => t('esercizi.' + id + '.' + k), no = S.esercizi.scartati.includes(id);
  const video = linkVideo(e.video, T('nome'), t('esercizio.videoRicerca'));   // video scelto a mano, oppure una ricerca su YouTube
  const collegato = (k, eid) => eid && PER_ID[eid] ? `<a class="riga alta" href="#/esercizio/${eid}" style="text-decoration:none;color:inherit"><span class="cresce"><span class="pic sec forte" style="display:block">${t('esercizio.' + k)}</span><span class="forte">${esc(nomeEsercizio(eid))}</span></span><span class="sec">${ico('avanti', 18)}</span></a>` : '';
  return {
    html: `<main class="pagina piena">
      <div class="fila"><button class="ico-btn" data-a="indietro" aria-label="${t('comune.indietro')}">${ico('indietro')}</button><h1 style="font-size:24px">${esc(T('nome'))}</h1></div>
      <div class="fila avvolgi stretti"><span class="pill ar">${t('schemi.' + e.schema)}</span><span class="pill">${t('risultato.liv', { n: e.liv })}</span>${e.att.length ? e.att.map(g => `<span class="pill">${g.map(a => t('attrezzi.' + a)).join(' / ')}</span>`).join('') : `<span class="pill">${t('esercizio.corpoLibero')}</span>`}${e.paio ? `<span class="pill">${t('esercizio.paio')}</span>` : ''}${e.impatto ? `<span class="pill">${t('esercizio.salti')}</span>` : ''}</div>
      ${figuraAnimata(id, T('nome')) || (e.anim ? `<img src="${esc(e.anim)}" alt="" style="width:100%;border-radius:22px">` : '')}
      ${e.avviso ? `<div class="card tenue avviso"><span class="tondo">${ico('attenzione')}</span><p class="pic forte">${esc(T('avviso'))}</p></div>` : ''}
      <div class="card col"><div class="fila tra"><h3>${t('esercizio.muscoli')}</h3><span class="pic sec">${e.musc.map(m => t('muscoli.' + m)).join(', ')}</span></div>${sagoma(e.musc, e.musc2 || [])}</div>
      <div class="card col stretti"><h3>${t('esercizio.consigli')}</h3><ul class="punti">${T('consigli').map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
      <div class="card col stretti"><h3>${t('esercizio.errori')}</h3><ul class="punti">${T('errori').map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
      <div class="card col stretti"><h3>${t('esercizio.respiro')}</h3><p>${esc(T('respiro'))}</p></div>
      <div class="col stretti"><a class="btn largo" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer external">${ico('video')}${t('esercizio.video')}</a>
        <span class="pic sec centro">${t(video.ricerca ? 'esercizio.videoNotaRicerca' : 'esercizio.videoNota')}</span></div>
      <div class="col stretti">${collegato('piuFacile', e.fac)}${collegato('piuDifficile', e.dif)}</div>
      <div class="riga alta"><span class="cresce"><span class="forte" style="display:block">${t('esercizio.escludi')}</span><span class="pic sec">${t('esercizio.escludiDesc')}</span></span>${interruttore('escludi', no, t('esercizio.escludi'))}</div></main>`,
    azioni: {
      indietro: () => indietro('libreria'),
      figura: alternaFigura,
      escludi: async () => { if (no) await riammetti(id); else await risolviFastidio(id, 'escludi'); toast(t(no ? 'esercizio.riammesso' : 'esercizio.escluso')); disegna(); },
    },
  };
});

registra('comprare', () => {
  const ctx = contesto(), cons = consigliAcquisto(ctx, S.piano);
  return { html: `<main class="pagina piena">${intestazione(t('compra.titolo'))}<p class="sec">${t('compra.testo')}</p>
    ${cons.length ? cons.map((c, i) => `<div class="card col stretti"><div class="fila tra"><span class="fila"><span class="tondo ar">${i + 1}</span><h3 style="font-size:18px">${t('attrezzi.' + c.attrezzo.id)}</h3></span><span class="pill" aria-label="${t('compra.fascia.' + c.attrezzo.fascia.length)}">${c.attrezzo.fascia}</span></div>
      <p>${t('compra.motivo.' + c.motivo, { schema: t('schemi.' + c.schema).toLowerCase(), obiettivo: t('obiettivi.' + ctx.obiettivi[0] + '.nome').toLowerCase() })}</p>
      <div class="fila avvolgi stretti">${Object.entries(c.perSchema).map(([s, n]) => `<span class="pill ar">${tn('compra.sblocca', n, { schema: t('schemi.' + s).toLowerCase() })}</span>`).join('')}</div>
      <p class="pic sec">${c.nuovi.map(e => esc(nomeEsercizio(e.id))).join(', ')}</p></div>`).join('') : `<div class="card bordo sec centro">${t('compra.niente')}</div>`}
    <p class="pic sec">${t('compra.fasce')}</p></main>` };
});

// ── Orologi: guide per marca, importazione dei file e inserimento manuale
const MARCHE = ['garmin', 'apple', 'fitbit', 'polar', 'suunto', 'coros', 'amazfit', 'samsung', 'altro'];
const etichettaSessione = s => `${fmtData(s.data, { weekday: 'short', day: 'numeric', month: 'short' })} · ${s.tipo === 'orologio' ? (s.etichetta || t('rep.soloOrologio')) : s.tipo === 'sfida' ? t('cla.quale.sfida') : t('piano.giorno', { tipo: s.tipoGiorno })} · ${fmtPunti(s.giri, s.extra)}`;
async function collega(s, d) {
  const lap = giriDaLap(d);
  const fine = async giri => { s.orologio = d; if (giri != null) s.giri = giri; await salvaSessione(s); toast(t('oro.collegato')); vai('report/' + encodeURIComponent(s.id)); };   // dopo l'import si apre il report
  if (d.giri.length && lap !== s.giri) {
    foglio(`<h2 style="margin:0">${t('fine.lapTitolo')}</h2><p class="sec">${t('fine.lapTesto', { lap, app: s.giri })}</p>
      <button class="btn primario largo" data-a="file">${tn('fine.lapUsaFile', lap)}</button><button class="btn largo" data-a="app">${tn('fine.lapUsaApp', s.giri)}</button>`,
    { file: (b, ev, chiudi) => { chiudi(); fine(lap); }, app: (b, ev, chiudi) => { chiudi(); fine(null); } }, { bloccato: true });
  } else await fine(null);
}
// Allenamento fatto senza l'app: dal file nasce una sessione di tipo "orologio", con un nome di circuito per confrontare solo quelli uguali.
function creaDaOrologio(d) {
  const gia = d.inizio && S.sessioni.find(x => x.tipo === 'orologio' && x.inizio === d.inizio);
  if (gia) { toast(t('oro.giaImportato')); return vai('report/' + encodeURIComponent(gia.id)); }
  const quando = d.inizio ? new Date(d.inizio) : new Date(), nomi = [...new Set(S.sessioni.filter(x => x.tipo === 'orologio' && x.etichetta).map(x => x.etichetta))].slice(-6);
  let completo = false;
  const corpo = () => `<h2 style="margin:0">${t('oro.creaTitolo')}</h2>
    <p class="pic sec">${esc([fmtData(isoData(quando), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }), mmss(d.durata), d.bpmMedio ? d.bpmMedio + ' bpm' : '', tn('fine.lap', d.giri.length)].filter(Boolean).join(' · '))}</p>
    <label class="campo">${t('oro.nomeCircuito')}<input data-k="nome" maxlength="30" placeholder="${t('oro.nomeEsempio')}"></label>
    ${nomi.length ? `<div class="fila avvolgi stretti">${nomi.map(n => `<button class="chip" data-a="nome" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    <p class="pic sec">${t('oro.nomeNota')}</p>
    ${d.giri.length ? `<div class="col stretti"><span class="pic forte sec">${t('oro.ultimoLap')}</span><div class="seg"><button data-a="lap" data-v="0" aria-pressed="${!completo}">${t('oro.ultimoIncompleto')}</button><button data-a="lap" data-v="1" aria-pressed="${completo}">${t('oro.ultimoCompleto')}</button></div></div>` : ''}
    <button class="btn primario largo" data-a="ok">${t('comune.salva')}</button><button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`;
  foglio(corpo(), {
    nome: (b, ev, chiudi, velo) => { velo.querySelector('[data-k="nome"]').value = b.dataset.v; },
    lap: (b, ev, chiudi, velo) => { const nome = velo.querySelector('[data-k="nome"]').value; completo = b.dataset.v === '1'; velo.querySelector('.foglio').innerHTML = corpo(); velo.querySelector('[data-k="nome"]').value = nome; },
    ok: async (b, ev, chiudi, velo) => {
      const s = { id: uid(), ts: quando.getTime(), inizio: d.inizio || quando.getTime(), data: isoData(quando), tipo: 'orologio', etichetta: velo.querySelector('[data-k="nome"]').value.trim().slice(0, 30), blocco: 0, tipoGiorno: null, focus: null, rev: 0, fattore: 1, motivo: null, leggero: false,
        durata: Math.max(1, Math.round((d.durata - (d.pausa || 0)) / 60)), esercizi: [], obiettivo: 0, ripGiro: 0, giri: completo ? d.giri.length : giriDaLap(d), extra: 0, tempiGiro: [], fatica: null, fastidi: [], note: '', modalita: 'orologio', orologio: d };
      await salvaSessione(s); chiudi(); toast(t('oro.creato')); vai('report/' + encodeURIComponent(s.id));
    } });
}
function scegliSessione(titolo, alScelta, file = null) {
  const ultime = S.sessioni.filter(s => s.tipo !== 'test' && s.tipo !== 'orologio').slice(-10).reverse();
  if (!ultime.length && !file) return toast(t('oro.nessunaSessione'));
  if (!ultime.length) return creaDaOrologio(file);
  foglio(`<h2 style="margin:0">${esc(titolo)}</h2>${file ? `<button class="btn primario largo" data-a="crea">${ico('orologio')}${t('oro.crea')}</button><p class="pic sec">${t('oro.creaTesto')}</p>` : ''}${ultime.map(s => `<button class="riga alta" data-a="s" data-v="${esc(s.id)}"><span class="cresce" style="font-weight:600">${esc(etichettaSessione(s))}</span>${s.orologio ? `<span class="sec">${ico('orologio', 18)}</span>` : ''}</button>`).join('')}<button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`,
  { s: (el, ev, chiudi) => { chiudi(); alScelta(S.sessioni.find(x => x.id === el.dataset.v)); }, crea: (el, ev, chiudi) => { chiudi(); creaDaOrologio(file); } });
}
registra('orologi', () => {
  const mia = S.orologio && S.orologio.marca, ordine = mia ? [mia, ...MARCHE.filter(m => m !== mia)] : MARCHE;
  const ricerca = m => t('oro.ricerca', { cosa: `${m === 'altro' ? '' : t('marche.' + m)} ${m === mia && S.orologio.modello ? S.orologio.modello : ''}`.trim() || t('oro.orologio') });
  return {
    html: `<main class="pagina piena">${intestazione(t('oro.titolo'))}<p class="sec">${t('oro.testo')}</p>
      <div class="card col"><h3>${t('oro.importa')}</h3><p class="pic sec">${t('oro.importaTesto')}</p>
        <label class="btn primario largo" style="cursor:pointer">${ico('orologio')}${t('oro.scegliFile')}<input type="file" accept=".fit,.tcx,.gpx" hidden data-c="file"></label>
        <button class="btn largo" data-a="manuale">${t('oro.manuale')}</button></div>
      <h2>${t('oro.guide')}</h2>
      ${ordine.map(m => { const g = ['garmin', 'apple', 'fitbit'].includes(m) ? m : 'generica';
        return `<details class="card" ${m === mia ? 'open' : ''}><summary class="forte" style="cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:space-between">${t('marche.' + m)}${m === mia ? `<span class="pill ar">${t('oro.tuo')}</span>` : ''}</summary>
          <div class="col" style="margin-top:8px"><div><span class="pic forte art">${t('oro.impostazioni')}</span><ul class="punti pic" style="margin-top:6px">${t('oro.guida.' + g + '.impostazioni').map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div><span class="pic forte art">${t('oro.esportare')}</span><ul class="punti pic" style="margin-top:6px">${t('oro.guida.' + g + '.esportare').map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <button class="btn piccolo" data-a="ricerca" data-v="${esc(ricerca(m))}" style="align-self:flex-start">${ico('copia', 18)}${t('oro.copiaRicerca')}</button><span class="pic sec">“${esc(ricerca(m))}”</span></div></details>`; }).join('')}</main>`,
    azioni: {
      ricerca: el => copiaTesto(el.dataset.v),
      file: async el => {
        let d; try { d = await leggiFileOrologio(el.files[0]); } catch { return toast(t('oro.fileNonValido')); }
        const gia = d.inizio && S.sessioni.find(x => x.tipo === 'orologio' && x.inizio === d.inizio);
        if (gia) { toast(t('oro.giaImportato')); return vai('report/' + encodeURIComponent(gia.id)); }
        const s = abbina(d, S.sessioni), riassunto = [mmss(d.durata), d.bpmMedio ? d.bpmMedio + ' bpm' : '', d.calorie ? d.calorie + ' kcal' : '', tn('fine.lap', d.giri.length)].filter(Boolean).join(' · ');
        if (!s) return scegliSessione(t('oro.nessunAbbinamento'), x => collega(x, d), d);   // nessuna sessione dell'app a quell'ora: di solito è un allenamento fatto solo con l'orologio
        foglio(`<h2 style="margin:0">${t('oro.abbinato')}</h2><div class="card col stretti"><span class="forte">${esc(etichettaSessione(s))}</span><span class="pic sec">${esc(riassunto)}</span></div>
          <button class="btn primario largo" data-a="ok">${t('comune.conferma')}</button><button class="btn largo" data-a="altra">${t('oro.altraSessione')}</button>`,
        { ok: (b, ev, chiudi) => { chiudi(); collega(s, d); }, altra: (b, ev, chiudi) => { chiudi(); scegliSessione(t('oro.scegliSessione'), x => collega(x, d), d); } });
      },
      manuale: () => scegliSessione(t('oro.manualeTitolo'), s => {
        const o = s.orologio || {};
        foglio(`<h2 style="margin:0">${t('oro.manuale')}</h2><p class="pic sec">${esc(etichettaSessione(s))}</p>
          <label class="campo">${t('oro.durataMin')}<input type="number" inputmode="decimal" data-k="durata" value="${o.durata ? Math.round(o.durata / 6) / 10 : s.durata}"></label>
          <div class="griglia2"><label class="campo">${t('fine.bpm')}<input type="number" inputmode="numeric" data-k="bpmMedio" value="${o.bpmMedio || ''}"></label><label class="campo">${t('fine.kcal')}<input type="number" inputmode="numeric" data-k="calorie" value="${o.calorie || ''}"></label></div>
          <button class="btn primario largo" data-a="ok">${t('comune.salva')}</button><button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`,
        { ok: async (b, ev, chiudi, velo) => {
          const val = k => Number(String(velo.querySelector(`[data-k="${k}"]`).value).replace(',', '.')) || null;
          s.orologio = { ...o, durata: val('durata') ? Math.round(val('durata') * 60) : null, bpmMedio: val('bpmMedio'), calorie: val('calorie') };
          await salvaSessione(s); chiudi(); toast(t('comune.salvato')); vai('report/' + encodeURIComponent(s.id));
        } });
      }),
    },
  };
});

registra('sicurezza', () => ({ html: `<main class="pagina piena">${intestazione(t('sic.titolo'))}
  ${t('sic.punti').map(([titolo, testo]) => `<div class="card col stretti"><h3>${esc(titolo)}</h3><p class="sec">${esc(testo)}</p></div>`).join('')}
  <a class="btn largo" href="#/modifica/sicurezza">${t('sic.rivedi')}</a></main>` }));
