// Importazione dei file degli orologi: decoder FIT (binario) scritto a mano, TCX e GPX con DOMParser.
// Risultato comune: { inizio (ms), durata (s), bpmMedio, bpmMax, calorie, curva: [[secondi, bpm]…], giri: [{ durata }] }
const EPOCA_FIT = 631065600; // secondi tra 1970-01-01 e 1989-12-31
const MSG = { session: 18, lap: 19, record: 20 };

function leggiCampo(dv, pos, dim, tipo, le) {
  switch (tipo & 0x1F) {
    case 0: case 2: case 10: case 13: { const v = dv.getUint8(pos); return v === 0xFF && (tipo & 0x1F) !== 13 ? null : v; }
    case 1: { const v = dv.getInt8(pos); return v === 0x7F ? null : v; }
    case 3: { const v = dv.getInt16(pos, le); return v === 0x7FFF ? null : v; }
    case 4: case 11: { if (dim < 2) return null; const v = dv.getUint16(pos, le); return v === 0xFFFF ? null : v; }
    case 5: { const v = dv.getInt32(pos, le); return v === 0x7FFFFFFF ? null : v; }
    case 6: case 12: { if (dim < 4) return null; const v = dv.getUint32(pos, le); return v === 0xFFFFFFFF ? null : v; }
    case 8: return dv.getFloat32(pos, le);
    case 9: return dv.getFloat64(pos, le);
    default: return null; // stringhe e interi a 64 bit non servono
  }
}
export function decodificaFIT(buffer) {
  const dv = new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer, buffer.byteOffset || 0, buffer.byteLength);
  if (dv.byteLength < 14) throw new Error('fit');
  const testa = dv.getUint8(0);
  if (String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11)) !== '.FIT') throw new Error('fit');
  const fine = Math.min(dv.byteLength, testa + dv.getUint32(4, true));
  const def = {}, out = { session: [], lap: [], record: [] };
  let pos = testa, ultimoTs = 0;
  while (pos < fine) {
    const h = dv.getUint8(pos++);
    if (h & 0x80) {                                   // intestazione compressa con scarto di tempo
      const d = def[(h >> 5) & 3]; if (!d) throw new Error('fit');
      const scarto = h & 0x1F; let ts = (ultimoTs & ~0x1F) + scarto; if (scarto < (ultimoTs & 0x1F)) ts += 32; ultimoTs = ts;
      pos = leggiDati(d, pos, ts);
    } else if (h & 0x40) {                            // messaggio di definizione
      const le = dv.getUint8(pos + 1) === 0, num = dv.getUint16(pos + 2, le), n = dv.getUint8(pos + 4);
      pos += 5;
      const campi = [];
      for (let i = 0; i < n; i++, pos += 3) campi.push({ num: dv.getUint8(pos), dim: dv.getUint8(pos + 1), tipo: dv.getUint8(pos + 2) });
      let extra = 0;
      if (h & 0x20) { const nd = dv.getUint8(pos++); for (let i = 0; i < nd; i++, pos += 3) extra += dv.getUint8(pos + 1); } // campi sviluppatore: si saltano
      def[h & 0x0F] = { le, num, campi, extra };
    } else {
      const d = def[h & 0x0F]; if (!d) throw new Error('fit');
      pos = leggiDati(d, pos, null);
    }
  }
  function leggiDati(d, p, tsCompresso) {
    const nome = Object.keys(MSG).find(k => MSG[k] === d.num), m = {};
    for (const c of d.campi) { if (nome || c.num === 253) m[c.num] = leggiCampo(dv, p, c.dim, c.tipo, d.le); p += c.dim; }
    if (m[253] != null) ultimoTs = m[253]; else if (tsCompresso != null) m[253] = tsCompresso;
    if (nome) out[nome].push(m);
    return p + d.extra;
  }
  const s = out.session[0] || {}, rec = out.record.filter(r => r[253] != null);
  const t0 = s[2] != null ? s[2] : rec.length ? rec[0][253] : out.lap.length ? (out.lap[0][2] != null ? out.lap[0][2] : out.lap[0][253]) : null;
  const battiti = rec.filter(r => r[3] != null);
  const durata = s[7] != null ? s[7] / 1000 : s[8] != null ? s[8] / 1000 : rec.length > 1 ? rec[rec.length - 1][253] - rec[0][253] : out.lap.reduce((t, l) => t + (l[7] || 0) / 1000, 0);
  return rifinisci({
    inizio: t0 != null ? (t0 + EPOCA_FIT) * 1000 : null, durata,
    bpmMedio: s[16] != null ? s[16] : null, bpmMax: s[17] != null ? s[17] : null, calorie: s[11] != null ? s[11] : null,
    curva: battiti.map(r => [r[253] - (t0 != null ? t0 : battiti[0][253]), r[3]]),
    giri: out.lap.map(l => ({ durata: Math.round((l[7] != null ? l[7] : l[8] || 0) / 100) / 10 })),
  });
}
function rifinisci(d) {
  const bpm = d.curva.map(c => c[1]);
  if (d.bpmMedio == null && bpm.length) d.bpmMedio = Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length);
  if (d.bpmMax == null && bpm.length) d.bpmMax = Math.max(...bpm);
  if (d.curva.length > 120) { const passo = d.curva.length / 120; d.curva = Array.from({ length: 120 }, (_, i) => d.curva[Math.floor(i * passo)]); }
  d.durata = Math.round(d.durata || 0);
  return d;
}
const num = (el, sel) => { const n = el && el.querySelector(sel); return n ? Number(n.textContent) : null; };
export function decodificaTCX(testo) {
  const doc = new DOMParser().parseFromString(testo, 'application/xml');
  const laps = [...doc.querySelectorAll('Lap')];
  if (!laps.length) throw new Error('tcx');
  const punti = [...doc.querySelectorAll('Trackpoint')].map(p => ({ t: Date.parse((p.querySelector('Time') || {}).textContent), b: num(p, 'HeartRateBpm Value') })).filter(p => !isNaN(p.t));
  const inizio = Date.parse(laps[0].getAttribute('StartTime')) || (punti[0] && punti[0].t) || null;
  const massimi = laps.map(l => num(l, 'MaximumHeartRateBpm Value')).filter(Boolean), medi = laps.map(l => num(l, 'AverageHeartRateBpm Value')).filter(Boolean);
  return rifinisci({
    inizio, durata: laps.reduce((t, l) => t + (num(l, 'TotalTimeSeconds') || 0), 0),
    bpmMedio: medi.length ? Math.round(medi.reduce((a, b) => a + b, 0) / medi.length) : null, bpmMax: massimi.length ? Math.max(...massimi) : null,
    calorie: laps.reduce((t, l) => t + (num(l, 'Calories') || 0), 0) || null,
    curva: punti.filter(p => p.b).map(p => [Math.round((p.t - inizio) / 1000), p.b]),
    giri: laps.map(l => ({ durata: Math.round((num(l, 'TotalTimeSeconds') || 0) * 10) / 10 })),
  });
}
export function decodificaGPX(testo) {
  const doc = new DOMParser().parseFromString(testo, 'application/xml');
  const punti = [...doc.getElementsByTagName('trkpt')].map(p => {
    const t = p.getElementsByTagName('time')[0], hr = [...p.getElementsByTagName('*')].find(n => n.localName === 'hr');
    return { t: t ? Date.parse(t.textContent) : NaN, b: hr ? Number(hr.textContent) : null };
  }).filter(p => !isNaN(p.t));
  if (!punti.length) throw new Error('gpx');
  const inizio = punti[0].t;
  return rifinisci({ inizio, durata: (punti[punti.length - 1].t - inizio) / 1000, bpmMedio: null, bpmMax: null, calorie: null,
    curva: punti.filter(p => p.b).map(p => [Math.round((p.t - inizio) / 1000), p.b]), giri: [] });
}
export async function leggiFileOrologio(file) {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.tcx')) return decodificaTCX(await file.text());
  if (nome.endsWith('.gpx')) return decodificaGPX(await file.text());
  return decodificaFIT(await file.arrayBuffer());
}
// Abbina il file alla sessione più vicina per data e ora (entro 3 ore).
export function abbina(dati, sessioni) {
  if (!dati.inizio) return null;
  const c = sessioni.filter(s => s.tipo !== 'test' && s.inizio).map(s => ({ s, d: Math.abs(s.inizio - dati.inizio) })).sort((a, b) => a.d - b.d)[0];
  return c && c.d < 3 * 3600e3 ? c.s : null;
}
// I lap diventano i giri: l'ultimo lap, chiuso dallo stop, è il giro incompleto.
export const giriDaLap = dati => Math.max(0, dati.giri.length - 1);
