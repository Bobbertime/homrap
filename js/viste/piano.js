// Piano proposto: si accetta o si cambiano esercizi. Modi: nuovo (dopo un test), aggiorna (profilo cambiato), vedi (piano attuale).
import { S, salva, contesto, oggi, ultimoTest } from '../stato.js';
import { t, tn, nomeEsercizio } from '../i18n.js';
import { registra, vai, disegna } from '../router.js';
import { esc, ico, foglio, toast, fmtQ, intestazione } from '../ui.js';
import { generaPiano, alternative, sostituisci, obiettivoGiri, sblocca } from '../logica.js';
import { ATTREZZI } from '../../data/attrezzi.js';
import { PER_ID } from '../../data/esercizi.js';
import { copia } from '../util.js';

let proposta = null, firma = '';
export const fmtVoce = x => fmtQ(x.id, x.q) + (x.kg != null ? ` · ${x.kg} kg` : '');
export const testoMotivo = a => t('motivi.' + a.motivo) + (a.obiettivo ? ' ' + t('motivi.obiettivo') : '');

// Foglio con le alternative di un esercizio. alScelta(idNuovo) applica la sostituzione.
export function foglioAlternative(voce, ctx, usati, alScelta) {
  const alt = alternative(voce.id, ctx, usati.filter(id => id !== voce.id));
  foglio(`<div class="fila tra"><h2 style="margin:0">${esc(nomeEsercizio(voce.id))}</h2><span class="rip">${fmtVoce(voce)}</span></div>
    <a class="btn piccolo" href="#/esercizio/${voce.id}" data-a="chiudi" style="align-self:flex-start">${ico('libro', 18)}${t('piano.scheda')}</a>
    <h3>${t('piano.alternative')}</h3>
    ${alt.length ? alt.map(a => `<button class="riga alta" data-a="scegli" data-v="${a.e.id}"><span class="tondo ar">${ico('scambia', 18)}</span><span class="cresce"><span class="forte" style="display:block">${esc(nomeEsercizio(a.e.id))}</span><span class="pic sec">${esc(testoMotivo(a))}</span></span></button>`).join('') : `<p class="sec">${t('piano.nessunaAlternativa')}</p>`}
    <button class="btn largo" data-a="chiudi">${t('comune.chiudi')}</button>`,
  { scegli: (el, ev, chiudi) => { chiudi(); alScelta(el.dataset.v); } });
}

registra('piano', ([modo = 'vedi']) => {
  if (!ultimoTest() && modo !== 'vedi') return { html: '', dopo: () => vai('oggi', true) };
  const ctx = contesto(modo === 'nuovo' ? { blocco: (S.piano ? S.piano.blocco : 0) + 1 } : {});
  const f = JSON.stringify([modo, S.profilo, S.attrezzi, (ultimoTest() || {}).id, S.esercizi.scartati, S.preferenze.noSalti]);
  if (!proposta || firma !== f) {
    firma = f;
    if (modo === 'vedi') proposta = S.piano;
    else {
      proposta = generaPiano(ctx, oggi());
      if (modo === 'aggiorna' && S.piano) {
        proposta.blocco = S.piano.blocco; proposta.inizio = S.piano.inizio;
        proposta.giorni.forEach(g => { const v = S.piano.giorni.find(x => x.tipo === g.tipo); g.rev = (v ? v.rev || 0 : 0) + 1; });
      }
    }
  }
  if (!proposta) return { html: '', dopo: () => vai('oggi', true) };
  const nuovi = (S.stato.nuoviAttrezzi || []).map(id => ATTREZZI.find(a => a.id === id)).filter(Boolean);
  const sbloccati = nuovi.flatMap(a => sblocca(a, { ...ctx, attrezzi: Object.fromEntries(Object.entries(S.attrezzi).filter(([k]) => k !== a.id)) }).nuovi).slice(0, 5);
  const giorni = [...proposta.giorniSett].sort();
  return {
    html: `<main class="pagina piena">
      ${modo === 'vedi' ? intestazione(t('piano.titoloVedi')) : `<div><span class="pic forte sec">${t('piano.blocco', { n: proposta.blocco })}</span><h1>${t('piano.titolo' + (modo === 'nuovo' ? 'Nuovo' : 'Aggiorna'))}</h1></div>`}
      <p class="sec">${t('piano.testo' + (modo === 'vedi' ? 'Vedi' : ''))}</p>
      ${sbloccati.length && modo !== 'vedi' ? `<div class="card tenue avviso"><span class="tondo">${ico('lampadina')}</span><div><h3>${t('piano.sbloccati')}</h3><p class="pic">${sbloccati.map(e => esc(nomeEsercizio(e.id))).join(', ')}</p></div></div>` : ''}
      <div class="fila avvolgi stretti">${giorni.map((g, i) => `<span class="pill ${proposta.giorni[i] && proposta.giorni[i].leggero ? '' : 'ar'}">${t('comune.giorniCorti')[g - 1]} · ${proposta.giorni[i] ? proposta.giorni[i].tipo : ''}</span>`).join('')}</div>
      ${proposta.giorni.map((g, gi) => `<section class="col stretti"><div class="fila tra base"><h2>${t('piano.giorno', { tipo: g.tipo })}</h2><span class="pic sec">${tn('piano.obiettivo', obiettivoGiri(g.esercizi, proposta.durata, ctx), { min: proposta.durata })}</span></div>
        <div class="fila stretti"><span class="pill ar">${t('piano.focus', { focus: t('focus.' + g.focus) })}</span>${g.leggero ? `<span class="pill">${t('piano.leggero')}</span>` : ''}</div>
        ${g.esercizi.map((x, i) => `<button class="riga" data-a="voce" data-g="${gi}" data-n="${i}"><span class="tondo ${x.slot === 'focus' ? 'ar' : ''}">${i + 1}</span><span class="cresce" style="font-weight:600">${esc(nomeEsercizio(x.id))}</span>${x.slot === 'focus' ? `<span class="etichetta">${t('comune.focus')}</span>` : ''}<span class="rip">${fmtVoce(x)}</span></button>`).join('')}</section>`).join('')}
      <p class="pic sec">${t('piano.nota')}</p>
      ${modo === 'vedi' ? '' : `<div class="fondo-fisso"><button class="btn primario largo" data-a="accetta">${t('piano.accetta')}</button>${modo === 'aggiorna' ? `<button class="btn largo" data-a="tieni">${t('piano.tieni')}</button>` : ''}</div>`}</main>`,
    azioni: {
      voce: el => {
        const gi = +el.dataset.g, i = +el.dataset.n, g = proposta.giorni[gi];
        foglioAlternative(g.esercizi[i], ctx, g.esercizi.map(x => x.id), async id => {
          S.esercizi.sostituzioni[g.esercizi[i].id] = id;
          sostituisci(proposta, gi, i, id, ctx);
          await salva('esercizi', ...(modo === 'vedi' ? ['piano'] : []));
          toast(t('piano.sostituito')); disegna();
        });
      },
      accetta: async () => {
        S.piano = copia(proposta); delete S.stato.nuoviAttrezzi; proposta = null;
        await salva('piano', 'stato'); toast(t('piano.accettato')); vai('oggi');
      },
      tieni: async () => { delete S.stato.nuoviAttrezzi; proposta = null; await salva('stato'); vai('profilo'); },
    },
    esci: () => { if (modo === 'vedi') proposta = null; },
  };
});
