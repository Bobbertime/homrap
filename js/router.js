// Router a hash: #/oggi, #/progressi, #/esercizio/squat …
// Ogni vista è una funzione (parametri) → { html, azioni, dopo, esci, nav } registrata con registra().
const viste = {};
let corrente = null, nomeCorrente = '', guardia = null;
const app = () => document.getElementById('app');

export function registra(nome, fn) { viste[nome] = fn; }
export function impostaGuardia(fn) { guardia = fn; }
export function rotta() {
  const [nome, ...par] = location.hash.replace(/^#\/?/, '').split('/');
  return { nome: nome || 'oggi', par: par.map(decodeURIComponent) };
}
export function vai(dove, sostituisci = false) {
  const h = '#/' + dove;
  if (location.hash === h) return disegna();
  if (sostituisci) location.replace(h); else location.hash = h;
}
export function disegna(mantieniScroll = true) {
  let { nome, par } = rotta();
  const altra = guardia && guardia(nome);
  if (altra && altra !== nome) return vai(altra, true);
  if (!viste[nome]) nome = 'oggi';
  const cambia = nome !== nomeCorrente;
  if (cambia && corrente && corrente.esci) corrente.esci();
  const y = window.scrollY;
  corrente = viste[nome](par) || { html: '' };
  nomeCorrente = nome;
  app().innerHTML = corrente.html;
  const nav = document.getElementById('nav');
  nav.hidden = !corrente.nav;
  nav.querySelectorAll('a').forEach(a => { if (a.getAttribute('href') === '#/' + nome) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (cambia || !mantieniScroll) window.scrollTo(0, 0); else window.scrollTo(0, y);
  if (corrente.dopo) corrente.dopo(app());
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
  window.addEventListener('hashchange', () => disegna(false));
  disegna(false);
}
