// Router a hash: #/oggi, #/progressi, #/esercizio/squat …
// Ogni vista è una funzione (parametri) → { html, azioni, dopo, esci, nav } registrata con registra().
//
// Scorrimento: ogni voce della cronologia riceve un numero (history.state.i). Tornando indietro la pagina
// riparte da dove l'avevi lasciata; andando avanti (pagina nuova) parte dall'alto.
import { chiudiFogli } from './ui.js';

const viste = {};
let corrente = null, nomeCorrente = '', guardia = null;
const app = () => document.getElementById('app');

// Stato della navigazione: indice della voce corrente, hash e scorrimento di ogni voce.
const CHIAVE_NAV = 'homrap-nav';
let nav = { idx: 0, pila: [], scorri: [] }, sostituzione = false;

// Funzione pura (provata con Node): dato lo stato e l'evento di cambio pagina, dice il nuovo stato e
// l'eventuale scorrimento da ripristinare. evento: { hash, voce (numero in history.state o null), sostituzione, y }
export function passoNav(stato, evento) {
  const pila = [...stato.pila], scorri = [...stato.scorri], prima = stato.idx;
  scorri[prima] = evento.y;                                    // dove eri nella pagina che lasci
  let idx, ripristina = null, nuova = false;
  if (typeof evento.voce === 'number') {                       // voce già visitata: indietro o avanti del browser
    idx = evento.voce;
    if (idx < prima) ripristina = scorri[idx] || 0;            // indietro: torni dov'eri
  } else {                                                     // pagina nuova (o sostituita): si parte dall'alto
    idx = evento.sostituzione ? prima : prima + 1; nuova = true;
    pila.length = idx; scorri.length = idx;                    // le voci «avanti» non esistono più
  }
  pila[idx] = evento.hash;
  return { stato: { idx, pila, scorri }, ripristina, nuova };
}
function ricordaNav() { try { sessionStorage.setItem(CHIAVE_NAV, JSON.stringify(nav)); } catch { /* archivio di sessione non disponibile */ } }
function alCambio() {
  const voce = history.state && typeof history.state.i === 'number' ? history.state.i : null;
  const r = passoNav(nav, { hash: location.hash, voce, sostituzione, y: window.scrollY });
  sostituzione = false; nav = r.stato;
  chiudiFogli();
  if (r.nuova) { try { history.replaceState({ i: nav.idx }, ''); } catch { /* ignora */ } }
  ricordaNav();
  disegna(false, r.ripristina);
}

export function registra(nome, fn) { viste[nome] = fn; }
export function impostaGuardia(fn) { guardia = fn; }
export function rotta() {
  const [nome, ...par] = location.hash.replace(/^#\/?/, '').split('/');
  return { nome: nome || 'oggi', par: par.map(p => { try { return decodeURIComponent(p); } catch { return p; } }) };
}
// Il nome della schermata da cui si arriva (durante la creazione di una vista è ancora quella precedente).
export const vistaAttuale = () => nomeCorrente;
export function vai(dove, sostituisci = false) {
  const h = '#/' + dove;
  if (location.hash === h) return disegna();
  if (sostituisci) { sostituzione = true; location.replace(h); } else location.hash = h;
}
// Torna indietro. Senza «solo» torna alla pagina precedente, qualunque sia; con solo = true torna indietro
// soltanto se la pagina precedente è proprio «dove». Se non c'è una pagina a cui tornare, va a «dove».
export function indietro(dove = 'oggi', solo = false) {
  const prima = nav.idx > 0 ? nav.pila[nav.idx - 1] : null;
  if (prima != null && (!solo || prima === '#/' + dove)) history.back(); else vai(dove, true);
}
export function disegna(mantieniScroll = true, ripristina = null) {
  let { nome, par } = rotta();
  const altra = guardia && guardia(nome);
  if (altra && altra !== nome) return vai(altra, true);
  if (!viste[nome]) nome = 'oggi';
  const cambia = nome !== nomeCorrente;
  if (cambia && corrente && corrente.esci) corrente.esci();
  const y = ripristina != null ? ripristina : cambia || !mantieniScroll ? 0 : window.scrollY;
  corrente = viste[nome](par) || { html: '' };
  nomeCorrente = nome;
  app().innerHTML = corrente.html;
  const barra = document.getElementById('nav');
  barra.hidden = !corrente.nav;
  barra.querySelectorAll('a').forEach(a => { if (a.getAttribute('href') === '#/' + nome) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  window.scrollTo(0, y);
  if (corrente.dopo) corrente.dopo(app());
  if (ripristina != null && Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);   // se «dopo» ha cambiato l'altezza
}
function delega(tipo, attributo) {
  document.addEventListener(tipo, ev => {
    if (!ev.target.closest || !ev.target.closest('#app')) return;
    const el = ev.target.closest(`[${attributo}]`);
    const nome = el && el.getAttribute(attributo);
    if (el && corrente && corrente.azioni && corrente.azioni[nome]) corrente.azioni[nome](el, ev);
  });
}
export function avvia() {
  delega('click', 'data-a'); delega('input', 'data-i'); delega('change', 'data-c');
  // Le frecce «indietro» delle intestazioni (<a data-indietro href="#/profilo">) tornano davvero indietro nella cronologia.
  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('a[data-indietro]');
    if (!a || ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault(); indietro(a.getAttribute('href').replace(/^#\/?/, ''), true);
  });
  try { history.scrollRestoration = 'manual'; } catch { /* browser vecchio */ }
  // Dopo una ricarica la cronologia c'è ancora: si riprende il numero della voce e le posizioni salvate.
  const voce = history.state && typeof history.state.i === 'number' ? history.state.i : null;
  if (voce != null) { try { const v = JSON.parse(sessionStorage.getItem(CHIAVE_NAV)); if (v && Array.isArray(v.pila) && Array.isArray(v.scorri)) nav = { idx: voce, pila: v.pila, scorri: v.scorri }; } catch { /* riparte da zero */ } }
  nav.idx = voce != null ? voce : 0; nav.pila[nav.idx] = location.hash;
  if (voce == null) { nav.pila.length = 1; nav.scorri.length = 0; try { history.replaceState({ i: 0 }, ''); } catch { /* ignora */ } }
  ricordaNav();
  window.addEventListener('hashchange', alCambio);
  disegna(false);
}
