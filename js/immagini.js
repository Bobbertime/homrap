// Immagini da condividere (1080×1920), disegnate con canvas nello stile dell'app.
import { t, tn, nomeEsercizio } from './i18n.js';
import { fmtQ, fmtData, COLORI_AVATAR, testoFrase } from './ui.js';
import { giriEq } from './logica.js';
import { mmss } from './util.js';
import { CONFINI_ZONE } from './analisi.js';

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

// ── Report della sessione. a = analizza(sessione, …) di js/analisi.js. Con conBattito = false l'immagine
// non contiene nessun dato del battito: solo giri, ritmo e frasi che non ne parlano.
const FRASI_BATTITO = ['zonaRossa', 'cuoreMoltoAlto', 'cuoreAlto', 'cuoreMedio', 'cuoreBasso', 'deriva', 'meglioMenoBattito', 'stessoMenoBattito', 'stessoPiuBattito', 'faticaSenzaBattito', 'battitoSenzaFatica'];
function aCapo(x, testo, font, maxW) {
  x.font = font;
  const righe = []; let r = '';
  for (const p of String(testo).split(/\s+/)) { const prova = r ? r + ' ' + p : p; if (r && x.measureText(prova).width > maxW) { righe.push(r); r = p; } else r = prova; }
  if (r) righe.push(r);
  return righe;
}
const pannello = (x, Y, h, titolo, destra) => { rett(x, 60, Y, 960, h, 44, C.sup); scrivi(x, titolo, 104, Y + 62, F(800, 34), C.txt); if (destra) scrivi(x, destra, 976, Y + 62, F(600, 30), C.txt2, 'right'); };
function disegnaCurva(x, Y, h, c, max) {
  const b = c.curva.map(p => p[1]), t0 = c.curva[0][0], t1 = c.curva[c.curva.length - 1][0];
  let lo = Math.floor((Math.min(...b) - 4) / 10) * 10, hi = Math.ceil((Math.max(...b) + 4) / 10) * 10;
  if (hi - lo < 40) { const m = (hi + lo) / 2; lo = m - 20; hi = m + 20; }
  const sx = 170, dx = 930, su = Y + 118, giu = Y + h - 70;
  const PX = s => sx + (s - t0) / ((t1 - t0) || 1) * (dx - sx), PY = v => su + (hi - v) / (hi - lo) * (giu - su);
  x.lineWidth = 2; x.strokeStyle = C.sup2; x.setLineDash([4, 10]);
  if (max) CONFINI_ZONE.forEach((q, i) => { const v = Math.round(q * max); if (v <= lo || v >= hi) return;
    x.beginPath(); x.moveTo(sx, PY(v)); x.lineTo(dx, PY(v)); x.stroke(); scrivi(x, String(v), sx - 16, PY(v) + 10, F(600, 26), C.txt2, 'right'); scrivi(x, 'Z' + (i + 2), dx + 12, PY(v) - 8, F(800, 24), C.txt2); });
  x.setLineDash([]);
  x.beginPath(); x.moveTo(sx, giu); x.lineTo(dx, giu); x.stroke();
  x.beginPath(); c.curva.forEach((p, i) => (i ? x.lineTo(PX(p[0]), PY(p[1])) : x.moveTo(PX(p[0]), PY(p[1]))));
  x.lineWidth = 7; x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = C.ar; x.stroke();
  const picco = c.curva.reduce((m, p) => (p[1] > m[1] ? p : m), c.curva[0]);
  x.beginPath(); x.fillStyle = C.ar; x.arc(PX(picco[0]), PY(picco[1]), 13, 0, Math.PI * 2); x.fill();
  const aDestra = PX(picco[0]) > dx - 50;
  scrivi(x, String(picco[1]), aDestra ? dx : Math.max(sx + 40, PX(picco[0])), Math.max(su - 6, PY(picco[1]) - 26), FN(700, 44), C.txt, aDestra ? 'right' : 'center');
  scrivi(x, "0'", sx, giu + 44, F(600, 26), C.txt2); scrivi(x, Math.round((t1 - t0) / 60) + "'", dx, giu + 44, F(600, 26), C.txt2, 'right');
}
function disegnaGiri(x, Y, h, g) {   // un punto per giro: più in alto = più lento; riga tratteggiata = media
  const sx = 150, dx = 930, su = Y + 142, giu = Y + h - 92, margine = Math.max(4, (g.max - g.min) * 0.18), lo = g.min - margine, hi = g.max + margine;
  const PX = i => (g.n === 1 ? (sx + dx) / 2 : sx + i * (dx - sx) / (g.n - 1)), PY = v => su + (hi - v) / (hi - lo) * (giu - su);
  const mostra = i => g.n <= 8 || i === 0 || i === g.n - 1 || i === g.iMin || i === g.iMax;
  x.lineWidth = 2; x.strokeStyle = C.sup2; x.setLineDash([4, 10]); x.beginPath(); x.moveTo(104, PY(g.media)); x.lineTo(976, PY(g.media)); x.stroke(); x.setLineDash([]);
  x.beginPath(); g.tempi.forEach((v, i) => (i ? x.lineTo(PX(i), PY(v)) : x.moveTo(PX(i), PY(v)))); x.lineWidth = 5; x.lineJoin = 'round'; x.strokeStyle = 'rgba(168,162,158,0.55)'; x.stroke();
  g.tempi.forEach((v, i) => {
    x.beginPath(); x.fillStyle = i === g.iMin ? C.ar : C.txt2; x.arc(PX(i), PY(v), 14, 0, Math.PI * 2); x.fill();
    if (mostra(i)) scrivi(x, mmss(v), PX(i), PY(v) - 28, FN(700, 40), C.txt, 'center');
    scrivi(x, String(i + 1), PX(i), Y + h - 40, F(600, 26), C.txt2, 'center');
  });
}
function disegnaZone(x, Y, z) {
  const sx = 104, larg = 872, alfa = [0.28, 0.44, 0.62, 0.8, 1];
  let X = sx;
  z.quota.forEach((q, i) => { if (!z.sec[i]) return; const w = Math.max(10, q * larg - 6); rett(x, X, Y + 92, w, 44, 14, `rgba(255,112,0,${alfa[i]})`); X += w + 6; });
  z.quota.forEach((q, i) => { const cx = sx + i * (larg / 5); rett(x, cx, Y + 164, 26, 26, 8, `rgba(255,112,0,${alfa[i]})`); scrivi(x, `Z${i + 1}  ${Math.round(q * 100)}%`, cx + 38, Y + 188, F(700, 28), C.txt); });
}
export async function immagineReport(s, a, { titolo, conBattito = true } = {}) {
  await fontPronti();
  const [c, x] = tela(), g = a.giri, cuore = conBattito ? a.cuore : null;
  intestazione(x, fmtData(s.data, { day: 'numeric', month: 'long', year: 'numeric' }));
  scrivi(x, [t('rep.titolo'), titolo, s.tipo === 'orologio' ? `${s.durata} min` : `AMRAP ${s.durata}'`].filter(Boolean).join(' · '), 80, 290, F(700, 40), C.txt2, 'left', W - 160);
  // Card dei giri
  rett(x, 60, 330, 960, 280, 64, C.ar);
  scrivi(x, t('img.giri'), 120, 408, F(800, 40), C.su);
  if (s.obiettivo) scrivi(x, tn('oggi.obiettivo', s.obiettivo), 960, 408, F(700, 34), C.su, 'right');
  const w = scrivi(x, String(s.giri), 110, 584, FN(800, 220), C.su);
  if (s.extra) scrivi(x, `+${s.extra} ${t('img.rip')}`, 110 + w + 28, 584, FN(800, 90), C.su);
  // Numeri in evidenza
  const stat = [[t('rep.mediaGiro'), a.mediaGiro ? mmss(a.mediaGiro) : '—']];
  if (g && g.calo != null) stat.push([t('rep.righe.calo'), (g.calo > 0 ? '+' : g.calo < 0 ? '−' : '') + Math.abs(Math.round(g.calo * 100)) + '%']);
  if (s.fatica != null) stat.push([t('rep.fatica'), s.fatica + '/10']);
  if (cuore && cuore.medio) stat.push([t('rep.bpmMedio'), String(cuore.medio)]);
  const lw = (W - 120 - (stat.length - 1) * 24) / stat.length;
  stat.forEach(([l, v], i) => { const X = 60 + i * (lw + 24); rett(x, X, 634, lw, 156, 44, C.sup); scrivi(x, l, X + 32, 690, F(600, 30), C.txt2, 'left', lw - 56); scrivi(x, v, X + 32, 762, FN(700, 68), C.txt, 'left', lw - 56); });
  // Pannelli, dall'alto in basso finché c'è spazio
  let Y = 814; const fondo = H - 170;
  if (cuore && cuore.curva) { pannello(x, Y, 350, t('rep.curva'), 'bpm'); disegnaCurva(x, Y, 350, cuore, a.max.valore); Y += 374; }
  if (g && g.n >= 2) { const h = cuore && cuore.curva ? 300 : 460; pannello(x, Y, h, t('rep.tempiGiro'), `${mmss(g.primi)} → ${mmss(g.ultimi)}`); disegnaGiri(x, Y, h, g); Y += h + 24; }
  if (cuore && cuore.zone && Y + 220 <= fondo) { pannello(x, Y, 220, t('rep.zone')); disegnaZone(x, Y, cuore.zone); Y += 244; }
  const frasi = a.frasi.filter(f => conBattito || !FRASI_BATTITO.includes(f.k)).map(f => aCapo(x, testoFrase(f), F(600, 32), 800));
  let scritte = 0, alt = 44;
  for (const righe of frasi) { if (Y + alt + righe.length * 44 + 26 > fondo) break; alt += righe.length * 44 + 14; scritte++; }
  if (scritte) {
    rett(x, 60, Y, 960, alt + 12, 44, C.ars);
    let y = Y + 68;
    frasi.slice(0, scritte).forEach(righe => { x.beginPath(); x.fillStyle = C.ar; x.arc(112, y - 11, 8, 0, Math.PI * 2); x.fill(); righe.forEach(r => { scrivi(x, r, 140, y, F(600, 32), C.txt); y += 44; }); y += 14; });
  }
  piede(x);
  return blob(c);
}
