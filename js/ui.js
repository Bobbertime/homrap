// Mattoncini dell'interfaccia: icone, fogli, avvisi, grafici, sagoma dei muscoli, condivisione.
import { t, locale } from './i18n.js';
import { PER_ID } from '../data/esercizi.js';
import { mmss } from './util.js';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Icone a tratto (spessore 2,2, estremità arrotondate). Niente emoji.
const ICONE = {
  casa: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  grafico: '<path d="M3 20h18"/><path d="M6 16v-5"/><path d="M11 16V7"/><path d="M16 16v-8"/><path d="M21 16V4"/>',
  coppa: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  fiamma: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.8 1.2 2.8 2.5 3.2C12 9 11 6 12 3z"/>',
  condividi: '<path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  scarica: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/>',
  avanti: '<path d="M9 5l7 7-7 7"/>',
  indietro: '<path d="M15 5l-7 7 7 7"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  orologio: '<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M9 7l.7-4h4.6L15 7"/><path d="M9 17l.7 4h4.6L15 17"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.5"/>',
  attenzione: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v5"/><path d="M12 17.5v.5"/>',
  ingranaggio: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  peso: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>',
  cuore: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  calendario: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  scambia: '<path d="M4 8h14l-3-3"/><path d="M20 16H6l3 3"/>',
  cestino: '<path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/>',
  copia: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  lampadina: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>',
  carrello: '<path d="M3 4h2l2.500 11h10L20 7H6.500"/><circle cx="9" cy="19" r="1.500"/><circle cx="17" cy="19" r="1.500"/>',
  libro: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  scudo: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>',
  ricarica: '<path d="M20 12a8 8 0 1 1-2.300-5.700"/><path d="M20 4v5h-5"/>',
  bersaglio: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  corpo: '<circle cx="12" cy="5" r="2.500"/><path d="M12 8v7M7 10.500h10M12 15l-3 6M12 15l3 6"/>',
  matita: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  occhio: '<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  telefono: '<rect x="7" y="2.500" width="10" height="19" rx="3"/><path d="M11 18h2"/>',
  cronometro: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 2.500h4"/>',
  nota: '<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9.500v5l4.500-2.500z"/>',
  battito: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
};
export const ico = (nome, dim = 20, extra = '') => `<svg width="${dim}" height="${dim}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONE[nome] || ''}</svg>`;
export const icoPlay = (dim = 14) => `<svg width="${dim}" height="${dim}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>`;
export const icoPausa = (dim = 18) => `<svg width="${dim}" height="${dim}" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.500" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.500" fill="currentColor"/></svg>`;

// ── Formati
export function fmtQ(id, q) {
  const e = PER_ID[id] || {};
  return (e.unita === 'sec' ? q + '"' : String(q)) + (e.lato ? t('comune.perLato') : '');
}
export const fmtPunti = (giri, extra) => extra ? `${giri} + ${extra}` : String(giri);
export const fmtData = (iso, opz = { day: 'numeric', month: 'short' }) => new Date(iso.length > 10 ? iso : iso + 'T12:00:00').toLocaleDateString(locale(), opz);
export const fmtDec = (n, d = 1) => Number(n).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });

// Frase di lettura del report: { k, par } (da js/analisi.js) → testo, con date e numeri scritti all'italiana.
export function testoFrase(f) {
  const par = {};
  for (const [k, v] of Object.entries(f.par || {})) par[k] = k === 'data' ? fmtData(v, { day: 'numeric', month: 'long' }) : k === 'giri' ? fmtDec(v) : k === 'sec' && f.k === 'zonaRossa' ? mmss(v) : v;
  return t('rep.frase.' + f.k, par);
}

// ── Avatar: 6 colori fissi, sempre con testo scuro sopra
export const COLORI_AVATAR = ['#FF9A4D', '#F2C14E', '#8FD3A8', '#7CC4E8', '#C3A6F0', '#F29CB7'];
export const avatar = (iniz, colore = 0, dim = 36) => `<span class="avatar" style="width:${dim}px;height:${dim}px;font-size:${Math.round(dim * 0.36)}px;background:${COLORI_AVATAR[colore % 6]}">${esc(iniz)}</span>`;

// ── Toast, fogli, conferme
let timerToast = null;
export function toast(msg) {
  document.querySelectorAll('.toast').forEach(e => e.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(timerToast); timerToast = setTimeout(() => el.remove(), 2600);
}
const fogliAperti = new Set();
// Chiude tutti i fogli aperti: lo chiama il router quando si cambia pagina (per esempio con il tasto indietro).
export const chiudiFogli = () => [...fogliAperti].forEach(c => c());
// Foglio dal basso. azioni: { nome: (elemento, evento, chiudi) => … } collegate agli attributi data-a.
export function foglio(html, azioni = {}, opz = {}) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio" role="dialog" aria-modal="true">${html}</div>`;
  const chiudi = v => { if (!fogliAperti.has(chiudi)) return; fogliAperti.delete(chiudi); velo.remove(); if (opz.allaChiusura) opz.allaChiusura(v); };
  fogliAperti.add(chiudi);
  velo.addEventListener('click', ev => {
    if (ev.target === velo && !opz.bloccato) return chiudi();
    const el = ev.target.closest('[data-a]');
    if (!el) return;
    if (el.dataset.a === 'chiudi') return chiudi();
    if (azioni[el.dataset.a]) azioni[el.dataset.a](el, ev, chiudi, velo);
  });
  velo.addEventListener('input', ev => { const el = ev.target.closest('[data-i]'); if (el && azioni[el.dataset.i]) azioni[el.dataset.i](el, ev, chiudi, velo); });
  document.body.appendChild(velo);
  const primo = velo.querySelector('button, input, textarea'); if (primo && opz.fuoco) primo.focus();
  return { chiudi, el: velo };
}
export function conferma(titolo, testo, ok = t('comune.conferma'), annulla = t('comune.annulla')) {
  return new Promise(risolvi => {
    let risposta = false;
    foglio(`<h2 style="margin:0">${esc(titolo)}</h2>${testo ? `<p class="sec">${esc(testo)}</p>` : ''}
      <button class="btn primario largo" data-a="ok">${esc(ok)}</button><button class="btn largo" data-a="chiudi">${esc(annulla)}</button>`,
      { ok: (e, ev, chiudi) => { risposta = true; chiudi(); } }, { allaChiusura: () => risolvi(risposta) });
  });
}

// ── Grafici (SVG e HTML semplici, senza librerie)
// valori: [{ v, testo, sotto, leggero, id, aria }]. Con opz.azione ogni barra diventa un pulsante (data-a = azione, data-v = id).
export function barre(valori, opz = {}) {
  if (!valori.length) return '';
  const max = Math.max(...valori.map(v => v.v), opz.min || 1);
  const dentro = v => `<span>${esc(v.testo)}</span><i style="height:${Math.max(4, Math.round(v.v / max * 100))}%"></i><span class="pic" style="font-family:var(--f);font-size:10px">${esc(v.sotto || '')}</span>`;
  const classe = (v, i) => `${i === valori.length - 1 ? 'ult' : ''} ${v.leggero ? 'leg' : ''}`;
  if (opz.azione) return `<div class="barre" role="group" aria-label="${esc(opz.etichetta || '')}">${valori.map((v, i) =>
    `<button class="${classe(v, i)}" data-a="${opz.azione}" data-v="${esc(v.id)}" aria-label="${esc(v.aria || v.testo)}">${dentro(v)}</button>`).join('')}</div>`;
  return `<div class="barre" role="img" aria-label="${esc(opz.etichetta || '')}">${valori.map((v, i) => `<div class="${classe(v, i)}">${dentro(v)}</div>`).join('')}</div>`;
}
function punti(vals, w, h, lo, hi, m = 3) {
  const span = (hi - lo) || 1, n = Math.max(1, vals.length - 1);
  return vals.map((v, i) => `${(m + i * (w - 2 * m) / n).toFixed(1)},${(h - m - (v - lo) / span * (h - 2 * m)).toFixed(1)}`).join(' ');
}
export function scintilla(vals, w = 64, h = 24, colore = 'var(--ar)') {
  if (!vals || vals.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${punti(vals, w, h, Math.min(...vals), Math.max(...vals))}" fill="none" stroke="${colore}" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export function dueLinee(a, b, etichetta = '') {
  const tutti = [...a, ...b]; if (tutti.length < 2) return '';
  const lo = Math.min(...tutti), hi = Math.max(...tutti), w = 320, h = 120;
  const linea = (v, c, tr) => v.length > 1 ? `<polyline points="${punti(v, w, h, lo, hi, 8)}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ${tr ? 'stroke-dasharray="2 7"' : ''}/>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" role="img" aria-label="${esc(etichetta)}">${linea(b, 'var(--txt2)', true)}${linea(a, 'var(--ar)')}</svg>`;
}

// Linea a punti per un andamento: valori allineati alle sessioni (null = dato mancante), con primo e ultimo valore scritti.
export function lineaPunti(valori, { fmt = String, etichetta = '' } = {}) {
  const con = valori.map((v, i) => ({ v, i })).filter(p => p.v != null);
  if (con.length < 2) return '';
  const W = 320, H = 86, sx = 14, dx = 14, su = 24, giu = 12, n = valori.length, vs = con.map(p => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs), margine = (hi - lo) * 0.15 || 1;
  const X = i => (n === 1 ? W / 2 : sx + i * (W - sx - dx) / (n - 1)), Y = v => su + (hi + margine - v) / (hi - lo + 2 * margine) * (H - su - giu);
  const primo = con[0], ultimo = con[con.length - 1];
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(etichetta)}">
    <polyline points="${con.map(p => `${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')}" class="gl tenue"/>
    ${con.map(p => `<circle cx="${X(p.i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4.500" class="${p === ultimo ? 'gp' : 'gp neutro'}"/>`).join('')}
    <text x="${(X(primo.i) - 5).toFixed(1)}" y="${(Y(primo.v) - 9).toFixed(1)}" class="gv">${esc(fmt(primo.v))}</text>
    <text x="${(X(ultimo.i) + 5).toFixed(1)}" y="${(Y(ultimo.v) - 9).toFixed(1)}" text-anchor="end" class="gv">${esc(fmt(ultimo.v))}</text></svg>`;
}

// ── Sagoma del corpo, fronte e retro: un solo SVG per tutti gli esercizi. Ogni muscolo: rettangoli [dx, y, larghezza, altezza, raggio].
const BRACCIA = { spalle: [[-49, 46, 18, 20, 9], [31, 46, 18, 20, 9]], avambracci: [[-47, 98, 14, 34, 7], [33, 98, 14, 34, 7]] };
const FRONTE = { ...BRACCIA, petto: [[-24, 54, 22, 22, 8], [2, 54, 22, 22, 8]], bicipiti: [[-47, 68, 14, 26, 7], [33, 68, 14, 26, 7]], addome: [[-12, 80, 24, 48, 8]],
  obliqui: [[-24, 82, 9, 42, 4], [15, 82, 9, 42, 4]], quadricipiti: [[-24, 146, 15, 52, 7], [9, 146, 15, 52, 7]], adduttori: [[-8, 146, 6, 34, 3], [2, 146, 6, 34, 3]] };
const RETRO = { ...BRACCIA, trapezio: [[-18, 46, 36, 22, 8]], dorsali: [[-24, 70, 22, 34, 8], [2, 70, 22, 34, 8]], lombari: [[-13, 106, 26, 22, 7]], tricipiti: [[-47, 68, 14, 26, 7], [33, 68, 14, 26, 7]],
  glutei: [[-24, 130, 22, 24, 9], [2, 130, 22, 24, 9]], femorali: [[-23, 158, 19, 42, 9], [4, 158, 19, 42, 9]], polpacci: [[-22, 206, 17, 36, 8], [5, 206, 17, 36, 8]] };
function figura(cx, mappa, primari, secondari) {
  const r = (x, y, w, h, rx, cls) => `<rect x="${cx + x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cls}"/>`;
  let s = `<circle cx="${cx}" cy="22" r="15" class="c"/>` + r(-27, 44, 54, 104, 18, 'c') + r(-49, 46, 18, 92, 9, 'c') + r(31, 46, 18, 92, 9, 'c') + r(-26, 138, 24, 110, 11, 'c') + r(2, 138, 24, 110, 11, 'c');
  for (const [m, rett] of Object.entries(mappa)) {
    const cls = 'm' + (primari.includes(m) ? ' p' : secondari.includes(m) ? ' s' : '');
    s += rett.map(q => r(q[0], q[1], q[2], q[3], q[4], cls)).join('');
  }
  return s;
}
export function sagoma(primari = [], secondari = []) {
  const nomi = primari.map(m => t('muscoli.' + m)).join(', ');
  return `<svg class="sagoma" viewBox="0 0 300 256" role="img" aria-label="${esc(t('esercizio.muscoli') + ': ' + nomi)}">${figura(75, FRONTE, primari, secondari)}${figura(225, RETRO, primari, secondari)}</svg>`;
}

// ── Condivisione: prima navigator.share, altrimenti copia o scaricamento
export async function copiaTesto(testo) {
  try { await navigator.clipboard.writeText(testo); }
  catch {
    const a = document.createElement('textarea'); a.value = testo; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch { /* ignora */ } a.remove();
  }
  toast(t('comune.copiato'));
}
export async function condividiTesto(testo) {
  if (navigator.share) { try { await navigator.share({ text: testo }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  await copiaTesto(testo);
}
export function scaricaFile(blob, nome) {
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export async function condividiFile(blob, nome, testo) {
  const file = new File([blob], nome, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share(testo ? { files: [file], text: testo } : { files: [file] }); return 'condiviso'; }
    catch (e) { if (e && e.name === 'AbortError') return 'annullato'; }
  }
  scaricaFile(blob, nome); toast(t('comune.scaricato'));
  return 'scaricato';
}
export const interruttore = (azione, acceso, etichetta, extra = '') => `<button class="interruttore" role="switch" aria-checked="${acceso ? 'true' : 'false'}" aria-label="${esc(etichetta)}" data-a="${azione}" ${extra}></button>`;
export const intestazione = (titolo, indietro = 'profilo') => `<div class="fila"><a class="ico-btn" data-indietro href="#/${indietro}" aria-label="${esc(t('comune.indietro'))}">${ico('indietro')}</a><h1 style="font-size:24px">${esc(titolo)}</h1></div>`;
