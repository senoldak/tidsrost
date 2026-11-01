// Veri sayfalarının eski grafik verisini (etikett/verdi, navn/verdi/fremhev) grafik setinin şemasına çevirir.

/** @param {string} navn @param {{ navn: string, verdi: number|null, fremhev?: boolean }[]} rader @param {{ sorter?: boolean }} [valg] */
export function fraStolper(navn, rader, valg = {}) {
  return {
    serier: [{ navn, punkter: rader.map((r) => ({ x: r.navn, y: r.verdi ?? null })) }],
    valg: { fremhev: rader.filter((r) => r.fremhev).map((r) => r.navn), ...valg },
  };
}

/** @param {{ navn: string, punkter: { etikett: string, verdi: number|null }[] }[]} serier */
export function fraLinjer(serier) {
  return serier.map((s) => ({ navn: s.navn, punkter: s.punkter.map((p) => ({ x: p.etikett, y: p.verdi ?? null })) }));
}
