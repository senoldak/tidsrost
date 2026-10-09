// Meteorologisk institutt (MET): resmi tehlike uyarıları (farevarsler).
import { hentJson, osloIso, slugify } from '../lib.mjs';

const URL = 'https://api.met.no/weatherapi/metalerts/2.0/current.json';
const NIVA = { yellow: 'Gult', orange: 'Oransje', red: 'Rødt' };

const tid = (iso) =>
  new Date(iso).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default {
  navn: 'met',
  async hent() {
    const data = await hentJson(URL);
    return data.features
      .map((f) => ({ p: f.properties, when: f.when?.interval ?? [] }))
      .filter(({ p }) => {
        const farge = p.awareness_level?.split(';')[1]?.trim();
        // Sarı uyarılardan sadece karadakiler; denizdeki sarı fırtına uyarıları çok sık.
        return farge === 'orange' || farge === 'red' || (farge === 'yellow' && p.geographicDomain === 'land');
      })
      .map(({ p, when }) => {
        const farge = p.awareness_level.split(';')[1].trim();
        const [start, slutt] = when;
        // "Deler av Sør-Norge" cümle ortasında küçük harfle başlamalı.
        const omrade = p.area.replace(/^Deler\b/, 'deler');
        return {
          // Uyarı güncellense de aynı olay için tek haber.
          id: `met:${p.event}:${slugify(p.area)}:${(start ?? '').slice(0, 10)}`,
          tid: new Date(start ?? Date.now()),
          tittel: p.title,
          async lag() {
            const avsnitt = [
              `Meteorologisk institutt har sendt ut ${NIVA[farge].toLowerCase()} farevarsel for ${p.eventAwarenessName.toLowerCase()} for ${omrade}.`,
              start && slutt ? `Varselet gjelder fra ${tid(start)} til ${tid(slutt)}.` : null,
              p.description,
              p.consequences ? `**Mulige konsekvenser:** ${p.consequences.trim()}` : null,
              p.instruction ? `**Råd fra MET:** ${p.instruction.trim()}` : null,
              'Følg med på oppdaterte varsler på [yr.no](https://www.yr.no/nb/farevarsler).',
            ].filter(Boolean);
            return {
              title: `${NIVA[farge]} farevarsel for ${p.eventAwarenessName.toLowerCase()}: ${p.area}`,
              description: p.description.split(/(?<=\.)\s/)[0],
              body: avsnitt.join('\n\n'),
              category: 'innenriks',
              breaking: farge !== 'yellow',
              date: osloIso(),
              kilde: { navn: 'Meteorologisk institutt', url: 'https://www.met.no/', lisens: 'CC BY 4.0' },
            };
          },
        };
      });
  },
};
