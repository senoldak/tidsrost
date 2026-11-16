// Eğim biçimi emekli (16 Kasım 2026): çizgiler ve etiketler üst üste biniyor, okunmuyordu.
// Eski 'helning' verisi halter (manual) olarak çizilir: her seri bir satır, iki dönem iki nokta.
import { tegn as halter } from './manual.mjs';

const bos = (v) => v === null || v === undefined;

/** @param {import('../sema.mjs').GrafData} d @returns {import('../sema.mjs').Tegning} */
export function tegn(d) {
  const etA = String(d.serier[0].punkter[0]?.x ?? '');
  const etB = String(d.serier[0].punkter[1]?.x ?? '');
  const punkter = d.serier
    .map((s) => ({ x: s.navn, y: s.punkter[0]?.y, y2: s.punkter[1]?.y }))
    .filter((p) => !bos(p.y) && !bos(p.y2));
  return halter({ ...d, form: 'manual', valg: { ...(d.valg ?? {}), gruppenavn: [etA, etB], sorter: true }, serier: [{ navn: d.tittel, punkter }] });
}
