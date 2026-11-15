// Immagini da condividere (1080×1920), disegnate con canvas nello stile dell'app.
import { t, tn, nomeEsercizio } from './i18n.js';
import { fmtQ, fmtData, COLORI_AVATAR } from './ui.js';
import { giriEq } from './logica.js';
import { mmss } from './util.js';

const W = 1080, H = 1920;
const C = { bg: '#121214', sup: '#1D1D21', sup2: '#2A2A30', txt: '#F5F5F4', txt2: '#A8A29E', ar: '#FF7000', ars: '#412510', su: '#141414' };
const F = (peso, px) => `${peso} ${px}px "Plus Jakarta Sans", system-ui, sans-serif`;
const FN = (peso, px) => `${peso} ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`;

async function fontPronti() {
  try { await Promise.all([document.fonts.load(FN(800, 100)), document.fonts.load(FN(700, 100)), document.fonts.load(F(800, 40)), document.fonts.load(F(600, 40))]); } catch { /* font di sistema */ }
}
function tela() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.fillStyle = C.bg; x.fillRect(0, 0, W, H); x.textBaseline = 'alphabetic';
  return [c, x];
}
function rett(x, X, Y, w, h, r, colore) {
  x.beginPath();
  if (x.roundRect) x.roundRect(X, Y, w, h, r);
  else { x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  x.fillStyle = colore; x.fill();
}
function scrivi(x, s, X, Y, font, colore, allinea = 'left', maxW) {
  x.font = font; x.fillStyle = colore; x.textAlign = allinea;
  if (maxW) x.fillText(s, X, Y, maxW); else x.fillText(s, X, Y);
  return x.measureText(s).width;
}
function intestazione(x, destra) {
  x.beginPath(); x.lineWidth = 13; x.lineCap = 'round'; x.strokeStyle = C.ar; x.arc(122, 132, 36, -Math.PI / 4, 0, true); x.stroke();   // anello aperto
  x.beginPath(); x.fillStyle = C.ar; x.arc(122, 132, 10, 0, Math.PI * 2); x.fill();                                                    // punto al centro
  scrivi(x, 'HoMRAP', 190, 152, F(800, 58), C.txt);
  scrivi(x, destra, W - 80, 150, F(600, 36), C.txt2, 'right');
}
const blob = c => new Promise(ok => c.toBlob(ok, 'image/png'));
const piede = x => scrivi(x, t('img.motto'), W / 2, H - 90, F(800, 60), C.ar, 'center');

export async function immagineSessione(s, { titolo, record, serie }) {
  await fontPronti();
  const [c, x] = tela();
  intestazione(x, fmtData(s.data, { day: 'numeric', month: 'long', year: 'numeric' }));
  scrivi(x, [`AMRAP ${s.durata}'`, titolo, s.focus ? t('piano.focus', { focus: t('focus.' + s.focus) }) : ''].filter(Boolean).join(' · '), 80, 290, F(700, 40), C.txt2, 'left', W - 160);
  rett(x, 60, 340, 960, 620, 64, C.ar);
  scrivi(x, t('img.giri'), 120, 430, F(800, 40), C.su);
  const w = scrivi(x, String(s.giri), 110, 800, FN(800, 440), C.su);
  if (s.extra) scrivi(x, `+${s.extra} ${t('img.rip')}`, 110 + w + 30, 800, FN(800, 120), C.su);
  if (record) { rett(x, 110, 840, 560, 84, 42, 'rgba(0,0,0,0.14)'); scrivi(x, t('riep.nuovoRecord'), 150, 896, F(800, 38), C.su); }
  // Statistiche
  const eq = giriEq(s), o = s.orologio || {};
  const stat = [[t('all.mediaGiro'), eq > 0 ? mmss(s.durata * 60 / eq) : '—'], [t('img.serie'), tn('oggi.giorni', serie)]];
  if (o.bpmMedio) stat.push([t('riep.bpm'), String(o.bpmMedio)]);
  if (o.calorie) stat.push([t('riep.kcal'), String(o.calorie)]);
  const lw = (W - 120 - (stat.length - 1) * 24) / stat.length;
  stat.forEach(([l, v], i) => { const X = 60 + i * (lw + 24); rett(x, X, 1000, lw, 190, 44, C.sup); scrivi(x, l, X + 36, 1066, F(600, 32), C.txt2, 'left', lw - 60); scrivi(x, v, X + 36, 1150, FN(700, 76), C.txt, 'left', lw - 60); });
  // Circuito
  s.esercizi.forEach((e, i) => {
    const Y = 1240 + i * 104;
    rett(x, 60, Y, 960, 88, 44, C.sup);
    scrivi(x, nomeEsercizio(e.id), 110, Y + 58, F(600, 38), C.txt, 'left', 640);
    rett(x, 800, Y + 14, 190, 60, 30, C.sup2);
    scrivi(x, fmtQ(e.id, e.q), 895, Y + 60, FN(700, 46), C.txt, 'center');
  });
  piede(x);
  return blob(c);
}

// dati: { periodo, titolo, sotto, podio: [{ n, in, c, punti }], righe: [{ pos, n, in, c, punti }], momenti: [{ l, chi, v }] }
export async function immagineClassifica(d) {
  await fontPronti();
  const [c, x] = tela();
  intestazione(x, d.periodo);
  scrivi(x, d.titolo, 80, 330, F(800, 92), C.txt);
  scrivi(x, d.sotto, 80, 392, F(600, 38), C.txt2, 'left', W - 160);
  // Podio: secondo, primo, terzo
  const ordine = [d.podio[1], d.podio[0], d.podio[2]], alt = [300, 400, 230], pos = ['2', '1', '3'], lw = 300;
  ordine.forEach((p, i) => {
    if (!p) return;
    const X = 60 + i * (lw + 30), base = 1080, Y = base - alt[i];
    x.beginPath(); x.fillStyle = COLORI_AVATAR[(p.c || 0) % 6]; x.arc(X + lw / 2, Y - 190, 62, 0, Math.PI * 2); x.fill();
    scrivi(x, p.in, X + lw / 2, Y - 172, F(800, 46), C.su, 'center');
    scrivi(x, p.n, X + lw / 2, Y - 80, F(800, 42), C.txt, 'center', lw);
    scrivi(x, p.punti, X + lw / 2, Y - 22, FN(700, 56), C.txt, 'center');
    rett(x, X, Y, lw, alt[i], 44, i === 1 ? C.ar : C.sup);
    scrivi(x, pos[i], X + lw / 2, Y + 110, FN(800, 110), i === 1 ? C.su : C.txt, 'center');
  });
  // Dalla quarta posizione
  d.righe.slice(0, 4).forEach((r, i) => {
    const Y = 1120 + i * 100;
    rett(x, 60, Y, 960, 84, 42, C.sup);
    scrivi(x, String(r.pos), 110, Y + 58, FN(700, 50), C.txt2);
    scrivi(x, r.n, 180, Y + 56, F(700, 38), C.txt, 'left', 560);
    scrivi(x, r.punti, 980, Y + 60, FN(700, 52), C.txt, 'right');
  });
  // Momenti
  const top = 1120 + Math.min(4, d.righe.length) * 100 + 30;
  d.momenti.slice(0, 4).forEach((m, i) => {
    const X = 60 + (i % 2) * 492, Y = top + Math.floor(i / 2) * 170;
    if (Y + 150 > H - 180) return;
    rett(x, X, Y, 468, 150, 40, C.sup);
    scrivi(x, m.l, X + 34, Y + 50, F(700, 28), C.ar, 'left', 400);
    scrivi(x, m.chi, X + 34, Y + 100, F(800, 38), C.txt, 'left', 240);
    scrivi(x, m.v, X + 434, Y + 112, FN(700, 56), C.txt, 'right');
  });
  piede(x);
  return blob(c);
}
