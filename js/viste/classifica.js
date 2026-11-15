// Scheda Classifica (podio, momenti, dettagli, tu rispetto al gruppo), codici e schermata Confronto.
import { S, salva, oggi } from '../stato.js';
import { t, tn } from '../i18n.js';
import { registra, vai, disegna } from '../router.js';
import { esc, ico, foglio, toast, avatar, scintilla, dueLinee, fmtPunti, fmtData, fmtDec, copiaTesto, condividiTesto, condividiFile, interruttore } from '../ui.js';
import { datiPersonali, creaCodice, leggiCodice, estraiCodici, unisci, graduatorie, momenti, mediaGruppo, frasiConfronto, chiavePeriodo, sfidaEq, provaEq, sfidaDelMese } from '../classifica.js';
import { PROVE } from '../../data/soglie-test.js';
import { mmss, meseISO } from '../util.js';
import { immagineClassifica } from '../immagini.js';

let quale = 'sfida', soloCompleta = false;
const mio = (tipo, dettagli = true) => datiPersonali({ io: { id: S.io.id, nome: (S.profilo && S.profilo.nome) || t('cla.tu'), colore: S.io.colore }, sessioni: S.sessioni, test: S.test, perSettimana: S.piano ? S.piano.giorniSett.length : 3 }, { tipo, dettagli }, oggi());
const nomePeriodo = (tipo, d) => tipo === 'w' ? t('cla.settimanaDel', { data: fmtData(d) }) : fmtData(d, { month: 'long', year: 'numeric' });
const punti = (m, q) => q === 'sfida' ? (m.sf ? fmtPunti(m.sf.g, m.sf.r) : '—') : q === 'miglioramento' ? (m.mi == null ? '—' : `${m.mi > 0 ? '+' : ''}${m.mi}%`) : (m.se == null ? '—' : String(m.se));
const fmtProvaV = (id, v) => v == null ? '—' : id === 'plank' || id === 'superman' ? `${Math.round(v)}"` : String(Math.round(v));

export function gruppo() {
  const d = oggi(), tipo = S.classifica.periodo, chiave = chiavePeriodo(tipo, d), io = mio(tipo);
  let altri = {};
  const g = S.classifica.gruppo, buono = c => c && c.p && c.p.t === tipo && c.p.k === chiave;
  if (buono(g)) for (const m of g.m) altri[m.id] = m;
  altri = unisci(altri, Object.values(S.classifica.codici).filter(buono));
  delete altri[S.io.id];
  const visti = Object.entries(S.classifica.membri).filter(([id]) => id !== S.io.id);
  return { io, lista: [io, ...Object.values(altri)], mancanti: visti.filter(([id]) => !altri[id]).map(([id, m]) => ({ id, ...m })), ricevuti: Object.keys(altri).length, totale: visti.length, tipo, chiave };
}
async function incolla(testo) {
  const codici = estraiCodici(testo);
  let buoni = 0, errati = 0;
  for (const c of codici) {
    try {
      const { tipo, dati } = await leggiCodice(c);
      const lista = tipo === 'gruppo' ? dati.m : [dati];
      if (tipo === 'gruppo') { S.classifica.gruppo = dati; S.classifica.periodo = dati.p.t; }
      else S.classifica.codici = unisci(S.classifica.codici, lista);
      for (const m of lista) S.classifica.membri[m.id] = { n: m.n, in: m.in, c: m.c };
      buoni++;
    } catch { errati++; }
  }
  await salva('classifica');
  toast(!codici.length ? t('cla.nessunCodice') : tn('cla.letti', buoni) + (errati ? ' · ' + tn('cla.errati', errati) : ''));
}
function testoClassifica(G, gr) {
  const righe = gr.filter(x => x.pos).map(x => `${x.pos}. ${x.m.n} — ${punti(x.m, quale)}${quale === 'sfida' && x.m.sf && x.m.sf.v === 'f' ? ` (${t('cla.facilitata')})` : ''}`);
  const mo = momenti(G.lista), extra = [];
  if (mo.migliorato) extra.push(`${t('cla.mom.migliorato')}: ${mo.migliorato.m.n} (+${mo.migliorato.v}%)`);
  if (mo.costante) extra.push(`${t('cla.mom.costante')}: ${mo.costante.m.n} (${tn('cla.sessioni', mo.costante.v)})`);
  if (mo.serie) extra.push(`${t('cla.mom.serie')}: ${mo.serie.m.n} (${tn('oggi.giorni', mo.serie.v)})`);
  return `HoMRAP · ${t('cla.titolo')} ${nomePeriodo(G.tipo, oggi())}\n${t('cla.quale.' + quale)}\n\n${righe.join('\n')}\n\n${extra.join('\n')}\n\n${t('img.motto')}`;
}

registra('classifica', () => {
  const d = oggi(), G = gruppo(), gr = graduatorie(G.lista, quale, soloCompleta), conPos = gr.filter(x => x.pos), mo = momenti(G.lista), solo = G.lista.length < 2;
  const sfida = sfidaDelMese(meseISO(d));
  const podio = [conPos[1], conPos[0], conPos[2]], alt = [96, 132, 72], pp = ['2', '1', '3'];
  const med = mediaGruppo(G.lista.filter(m => m.id !== S.io.id));
  const riga = x => { const m = x.m, io = m.id === S.io.id, dett = m.an && m.an.length > 1;
    return `<${io ? 'div' : `a href="#/confronto/${m.id}"`} class="card col stretti" style="text-decoration:none;color:inherit;border-radius:20px;padding:12px 14px;${io ? 'background:var(--ars)' : ''}">
      <span class="fila"><span class="num sec" style="width:20px;font-size:20px">${x.pos || '–'}</span>${avatar(m.in, m.c)}<span class="cresce"><span class="forte" style="display:block">${esc(io ? t('cla.tu') : m.n)}</span>
        <span class="pic sec">${m.sf ? t('cla.' + (m.sf.v === 'f' ? 'facilitata' : 'completa')) : t('cla.senzaSfida')}</span></span><span class="num" style="font-size:22px">${punti(m, quale)}</span></span>
      <span class="fila stretti" style="padding-left:32px">${m.mi != null ? `<span class="pill fondo ${m.mi >= 15 ? 'art' : ''}">${m.mi > 0 ? '+' : ''}${m.mi}%</span>` : ''}<span class="pill fondo">${tn('cla.sessioni', m.se || 0)}</span><span class="pill fondo">${t('cla.serie', { n: m.st || 0 })}</span><span class="spazio"></span>${dett ? scintilla(m.an) : ''}</span></${io ? 'div' : 'a'}>`; };
  return {
    nav: true,
    html: `<main class="pagina">
      <div class="fila tra"><div><h1 style="font-size:28px">${t('cla.titolo')}</h1><div class="pic sec" style="margin-top:2px;text-transform:capitalize">${nomePeriodo(G.tipo, d)}</div></div>
        <button class="ico-btn" data-a="pubblica" aria-label="${t('cla.pubblica')}">${ico('condividi')}</button></div>
      <div class="fila stretti"><button class="btn primario piccolo cresce" data-a="condividi">${t('cla.condividiMiei')}</button><button class="btn piccolo" data-a="incolla">${t('cla.incolla')}</button></div>
      <div class="fila tra"><div class="seg" style="width:180px"><button data-a="periodo" data-v="w" aria-pressed="${G.tipo === 'w'}">${t('cla.settimana')}</button><button data-a="periodo" data-v="m" aria-pressed="${G.tipo === 'm'}">${t('cla.mese')}</button></div>
        ${G.totale ? `<span class="pic sec forte">${t('cla.ricevuti', { x: G.ricevuti, y: G.totale })}</span>` : ''}</div>
      <div class="seg">${['sfida', 'miglioramento', 'costanza'].map(q => `<button data-a="quale" data-v="${q}" aria-pressed="${quale === q}">${t('cla.quale.' + q)}</button>`).join('')}</div>
      ${quale === 'sfida' ? `<div class="fila tra"><span class="pic sec">${t('cla.sfidaDesc', { min: sfida.durata })}</span><span class="fila stretti pic forte">${t('cla.soloCompleta')}${interruttore('solo', soloCompleta, t('cla.soloCompleta'))}</span></div>` : `<p class="pic sec">${t('cla.desc.' + quale)}</p>`}
      ${solo ? `<div class="card bordo col centro" style="padding:24px 18px">${ico('coppa', 30)}<h3>${t('cla.vuotoTitolo')}</h3><p class="pic sec">${t('cla.vuoto')}</p></div>` : ''}
      ${conPos.length >= 2 ? `<div class="podio">${podio.map((x, i) => x ? `<div>${avatar(x.m.in, x.m.c, 52)}<div class="forte" style="font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.m.id === S.io.id ? t('cla.tu') : x.m.n)}</div><div class="num" style="font-size:20px">${punti(x.m, quale)}</div><div class="base ${i === 1 ? 'primo' : ''}" style="height:${alt[i]}px">${pp[i]}</div></div>` : '<div></div>').join('')}</div>` : ''}
      ${!solo ? `<h2>${t(G.tipo === 'w' ? 'cla.momentiSett' : 'cla.momenti')}</h2><div class="griglia2">${[['migliorato', v => `+${v}%`], ['costante', v => tn('cla.sessioni', v)], ['record', (v, m) => fmtPunti(m.sf.g, m.sf.r)], ['serie', v => tn('oggi.giorni', v)]].map(([k, f]) => mo[k] ? `<div class="card" style="border-radius:20px;padding:12px 14px"><div class="pic forte art" style="font-size:12px">${t('cla.mom.' + k)}</div><div class="forte" style="font-size:16px;margin-top:4px">${esc(mo[k].m.id === S.io.id ? t('cla.tu') : mo[k].m.n)}</div><div class="num" style="font-size:24px;line-height:1.1">${f(mo[k].v, mo[k].m)}</div></div>` : '').join('')}</div>` : ''}
      <div class="fila tra base"><h2 style="margin:0">${t('cla.dettagli')}</h2>${solo ? '' : `<span class="pic sec">${t('cla.toccaAmico')}</span>`}</div>
      <div class="col stretti">${gr.map(riga).join('')}
        ${G.mancanti.map(m => `<div class="card fila spento" style="border-radius:20px;padding:12px 14px"><span class="num sec" style="width:20px;font-size:20px">–</span>${avatar(m.in, m.c)}<span class="cresce"><span class="forte" style="display:block">${esc(m.n)}</span><span class="pic sec">${t('cla.codiceMancante')}</span></span><span class="num" style="font-size:22px">—</span></div>`).join('')}</div>
      ${!solo && G.io.te && Object.values(med).some(v => v != null) ? `<h2>${t('cla.tuGruppo')}</h2><div class="card col" style="gap:12px">
        <div class="fila pic sec forte" style="gap:14px"><span class="fila stretti"><span style="width:10px;height:10px;border-radius:999px;background:var(--ar)"></span>${t('cla.tu')}</span><span class="fila stretti"><span style="width:10px;height:10px;border-radius:999px;background:var(--txt2)"></span>${t('cla.media')}</span></div>
        ${PROVE.filter(p => med[p.id] != null).map(p => { const io = provaEq(G.io, p.id), a = med[p.id], max = Math.max(io, a, 1) * 1.25, su = io >= a;
          return `<div class="col" style="gap:5px"><div class="fila tra" style="font-size:14px;font-weight:700"><span>${t('prove.' + p.id + '.nome')}</span><span><span class="num" style="font-size:18px">${fmtProvaV(p.id, io)}</span> <span class="sec" style="font-weight:600">/ ${fmtProvaV(p.id, a)}</span> <span class="pic forte ${su ? 'art' : 'sec'}" style="font-size:12px">${t(su ? 'cla.sopra' : 'cla.sotto')}</span></span></div>
            <div class="pista"><b style="width:${Math.round(io / max * 100)}%"></b><u style="left:${Math.round(a / max * 100)}%"></u></div></div>`; }).join('')}</div>` : ''}
      </main>`,
    azioni: {
      quale: el => { quale = el.dataset.v; disegna(); },
      solo: () => { soloCompleta = !soloCompleta; disegna(); },
      periodo: async el => { S.classifica.periodo = el.dataset.v; await salva('classifica'); disegna(); },
      incolla: () => foglio(`<h2 style="margin:0">${t('cla.incollaTitolo')}</h2><p class="sec pic">${t('cla.incollaTesto')}</p>
        <textarea class="solo" rows="6" placeholder="HOMRAP1.… HOMRAPG1.…" aria-label="${t('cla.incollaTitolo')}"></textarea>
        <button class="btn primario largo" data-a="ok">${t('cla.leggi')}</button><button class="btn largo" data-a="chiudi">${t('comune.annulla')}</button>`,
      { ok: async (el, ev, chiudi, velo) => { await incolla(velo.querySelector('textarea').value); chiudi(); disegna(); } }, { fuoco: true }),
      condividi: () => {
        let dettagli = true, codice = '';
        const corpo = () => `<h2 style="margin:0">${t('cla.condividiMiei')}</h2><p class="sec pic">${t('cla.anteprimaTesto', { periodo: nomePeriodo(G.tipo, d) })}</p>
          <div class="card col stretti"><ul class="punti pic">${t('cla.contieneBase').map(x => `<li>${x}</li>`).join('')}${dettagli ? t('cla.contieneDettagli').map(x => `<li>${x}</li>`).join('') : ''}</ul></div>
          <div class="card fila tra"><div><span class="forte">${t('cla.includiDettagli')}</span><p class="pic sec">${t('cla.includiDettagliDesc')}</p></div>${interruttore('dettagli', dettagli, t('cla.includiDettagli'))}</div>
          <p class="pic sec">${t('cla.mai')}</p><div class="codice" id="cod"></div>
          <button class="btn primario largo" data-a="invia">${ico('condividi')}${t('cla.invia')}</button><button class="btn largo" data-a="copia">${ico('copia')}${t('cla.copia')}</button><button class="btn testo largo" data-a="chiudi">${t('comune.chiudi')}</button>`;
        const crea = async velo => { codice = await creaCodice('HOMRAP1', mio(G.tipo, dettagli)); const el = velo.querySelector('#cod'); if (el) el.textContent = codice; };
        const f = foglio(corpo(), {
          dettagli: async (el, ev, chiudi, velo) => { dettagli = !dettagli; velo.querySelector('.foglio').innerHTML = corpo(); await crea(velo); },
          invia: () => condividiTesto(t('cla.messaggio', { codice })),
          copia: () => copiaTesto(codice),
        });
        crea(f.el);
      },
      pubblica: () => {
        if (solo) return toast(t('cla.pubblicaVuoto'));
        foglio(`<h2 style="margin:0">${t('cla.pubblica')}</h2><p class="sec pic">${t('cla.pubblicaTesto')}</p>
          <button class="btn primario largo" data-a="testo">${ico('nota')}${t('cla.pubTesto')}</button><button class="btn largo" data-a="img">${ico('condividi')}${t('cla.pubImmagine')}</button><button class="btn largo" data-a="cod">${ico('copia')}${t('cla.pubCodice')}</button>
          <button class="btn testo largo" data-a="chiudi">${t('comune.chiudi')}</button>`, {
          testo: async () => { const cod = await creaCodice('HOMRAPG1', { v: 1, p: { t: G.tipo, k: G.chiave }, ts: Math.round(Date.now() / 1000), m: G.lista }); condividiTesto(testoClassifica(G, gr) + '\n\n' + t('cla.pubIstruzioni') + '\n' + cod); },
          cod: async () => copiaTesto(await creaCodice('HOMRAPG1', { v: 1, p: { t: G.tipo, k: G.chiave }, ts: Math.round(Date.now() / 1000), m: G.lista })),
          img: async () => {
            const voce = x => ({ pos: x.pos, n: x.m.n, in: x.m.in, c: x.m.c, punti: punti(x.m, quale) });
            const b = await immagineClassifica({ periodo: nomePeriodo(G.tipo, d), titolo: t('cla.titolo'), sotto: t('cla.quale.' + quale) + (quale === 'sfida' ? ` · AMRAP ${sfida.durata}'` : ''),
              podio: conPos.slice(0, 3).map(voce), righe: conPos.slice(3).map(voce),
              momenti: [['migliorato', v => `+${v}%`], ['costante', v => String(v)], ['record', (v, m) => fmtPunti(m.sf.g, m.sf.r)], ['serie', v => String(v)]].filter(([k]) => mo[k]).map(([k, f]) => ({ l: t('cla.mom.' + k), chi: mo[k].m.n, v: f(mo[k].v, mo[k].m) })) });
            condividiFile(b, `homrap-classifica-${G.chiave}.png`);
          },
        });
      },
    },
  };
});

registra('confronto', ([id]) => {
  const G = gruppo(), lui = G.lista.find(m => m.id === id), io = G.io;
  if (!lui) return { html: '', dopo: () => vai('classifica', true) };
  const fr = frasiConfronto(io, lui);
  const testoFrase = (f, chi) => tn(`conf.frase.${chi}.${f.k}`, f.n, { nome: esc(lui.n), prova: f.prova ? t('prove.' + f.prova + '.nome').toLowerCase() : '' });
  const cella = (a, b, meglioAlto = true) => { const va = a == null ? null : Number(a), vb = b == null ? null : Number(b), su = va != null && vb != null && va !== vb && (va > vb) === meglioAlto, giu = va != null && vb != null && va !== vb && !su; return [su, giu]; };
  const rigaTab = (nome, a, b, fmt = v => v, alto = true) => { const [su, giu] = cella(a, b, alto); return `<tr><td>${nome}</td><td class="num ${su ? 'art' : ''}" style="font-size:20px;width:84px">${a == null ? '—' : fmt(a)}</td><td class="num ${giu ? 'forte' : 'sec'}" style="font-size:20px;width:84px">${b == null ? '—' : fmt(b)}</td></tr>`; };
  const colonne = `<tr><td></td><td class="pic sec forte">${t('cla.tu')}</td><td class="pic sec forte">${esc(lui.n)}</td></tr>`;
  const dett = lui.an || lui.te;
  return {
    html: `<main class="pagina piena">
      <div class="fila"><a class="ico-btn" href="#/classifica" aria-label="${t('comune.indietro')}">${ico('indietro')}</a><h1 style="font-size:24px">${t('conf.titolo')}</h1></div>
      <div class="card grande"><div class="fila tra"><div class="col stretti" style="align-items:center;flex:1">${avatar(io.in, io.c, 56)}<span class="forte">${t('cla.tu')}</span><span class="grosso art">${io.sf ? fmtPunti(io.sf.g, io.sf.r) : '—'}</span></div>
        <span class="sec forte pic">${t('conf.sfida')}</span>
        <div class="col stretti" style="align-items:center;flex:1">${avatar(lui.in, lui.c, 56)}<span class="forte">${esc(lui.n)}</span><span class="grosso">${lui.sf ? fmtPunti(lui.sf.g, lui.sf.r) : '—'}</span></div></div></div>
      ${!dett ? `<div class="card bordo sec centro">${t('conf.senzaDettagli', { nome: esc(lui.n) })}</div>` : ''}
      ${io.an && lui.an && io.an.length > 1 && lui.an.length > 1 ? `<h2>${t('conf.andamento')}</h2><div class="card col">${dueLinee(io.an, lui.an, t('conf.andamento'))}
        <div class="fila pic sec forte" style="gap:14px"><span class="fila stretti"><span style="width:14px;height:4px;border-radius:2px;background:var(--ar)"></span>${t('cla.tu')}</span><span class="fila stretti"><span style="width:14px;height:4px;border-radius:2px;background:var(--txt2)"></span>${esc(lui.n)}</span></div></div>` : ''}
      <h2>${t('conf.abitudini')}</h2><div class="card"><table class="tab">${colonne}
        ${rigaTab(t('conf.sessioni'), io.se, lui.se)}${rigaTab(t('conf.serie'), io.st, lui.st)}${rigaTab(t('conf.mediaGiro'), io.mg, lui.mg, mmss, false)}${rigaTab(t('conf.miglioramento'), io.mi, lui.mi, v => `${v > 0 ? '+' : ''}${v}%`)}</table></div>
      ${io.te && lui.te ? `<h2>${t('conf.test')}</h2><div class="card"><table class="tab">${colonne}${PROVE.map(p => rigaTab(t('prove.' + p.id + '.nome'), provaEq(io, p.id), provaEq(lui, p.id), v => fmtProvaV(p.id, v))).join('')}</table></div>` : ''}
      ${fr.imparare.length ? `<div class="card tenue col stretti"><h3>${t('conf.imparare', { nome: esc(lui.n) })}</h3><ul class="punti pic">${fr.imparare.map(f => `<li>${testoFrase(f, 'lui')}</li>`).join('')}</ul></div>` : ''}
      ${fr.forte.length ? `<div class="card col stretti"><h3>${t('conf.forte')}</h3><ul class="punti pic">${fr.forte.map(f => `<li>${testoFrase(f, 'tu')}</li>`).join('')}</ul></div>` : ''}
      </main>`,
  };
});
