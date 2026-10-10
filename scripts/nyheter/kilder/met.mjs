// Meteorologisk institutt (MET): resmi tehlike uyarıları (farevarsler).
import { hentJson, osloIso, slugify } from '../lib.mjs';
import { varselkart, ringerFra } from '../bilde.mjs';

const URL = 'https://api.met.no/weatherapi/metalerts/2.0/current.json';
const NIVA = { yellow: 'Gult', orange: 'Oransje', red: 'Rødt' };
const KARTFARGE = { yellow: 'gul', orange: 'oransje', red: 'rod' };
// Cins isimle başlayan bölge adları cümle içinde küçük harfle yazılır ("i kyststrekningen …").
const VANLIG_START = /^(Deler|Store deler|Kyststrekningen|Kysten|Indre|Ytre|Høyfjellet|Fjellet|Havområdet|Området|Nordlige|Sørlige|Østlige|Vestlige|Midtre|Søndre|Nordre)\b/;

// Norveççe saat yazımı nokta ile: "fredag 9. oktober kl. 19.00".
const tid = (iso) =>
  new Date(iso)
    .toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    .replace(/(\d{2}):(\d{2})/, '$1.$2');

export default {
  navn: 'met',
  async hent() {
    const data = await hentJson(URL);
    return data.features
      .map((f) => ({ p: f.properties, when: f.when?.interval ?? [], geometri: f.geometry }))
      .filter(({ p }) => {
        const farge = p.awareness_level?.split(';')[1]?.trim();
        // Sarı uyarılardan karadakiler ve kıyıyı etkileyen fırtına kabarması (stormflo);
        // denizdeki sarı fırtına (kuling) uyarıları çok sık olduğu için alınmaz.
        if (farge === 'orange' || farge === 'red') return true;
        return farge === 'yellow' && (p.geographicDomain === 'land' || p.event === 'stormSurge');
      })
      .map(({ p, when, geometri }) => {
        const farge = p.awareness_level.split(';')[1].trim();
        const [start, slutt] = when;
        const omrade = p.area.replace(VANLIG_START, (w) => w.toLowerCase());
        // Olay adının sadece ilk harfi küçülür: "Vind" → "vind", "Ekstremværet Ingrid" → "ekstremværet Ingrid".
        const hendelse = p.eventAwarenessName.charAt(0).toLowerCase() + p.eventAwarenessName.slice(1);
        return {
          // Uyarı güncellense de aynı olay için tek haber.
          id: `met:${p.event}:${slugify(p.area)}:${(start ?? '').slice(0, 10)}`,
          tid: new Date(start ?? Date.now()),
          tittel: p.title,
          async lag() {
            const avsnitt = [
              `Meteorologisk institutt har sendt ut ${NIVA[farge].toLowerCase()} farevarsel for ${hendelse} i ${omrade}.`,
              start && slutt ? `Varselet gjelder fra ${tid(start)} til ${tid(slutt)}.` : null,
              p.description,
              p.consequences ? `**Mulige konsekvenser:** ${p.consequences.trim()}` : null,
              p.instruction ? `**Råd fra MET:** ${p.instruction.trim()}` : null,
              'Følg med på oppdaterte varsler på [yr.no](https://www.yr.no/nb/farevarsler).',
            ].filter(Boolean);
            return {
              title: `${NIVA[farge]} farevarsel for ${hendelse} i ${omrade}`,
              description: p.description.split(/(?<=\.)\s/)[0],
              body: avsnitt.join('\n\n'),
              category: 'innenriks',
              breaking: farge !== 'yellow',
              date: osloIso(),
              produksjon: 'automatisk',
              kilde: { navn: 'Meteorologisk institutt', url: 'https://www.met.no/', lisens: 'CC BY 4.0' },
              bilde: {
                svg: () =>
                  varselkart({
                    omrade: ringerFra(geometri),
                    niva: KARTFARGE[farge],
                    tittel: `${NIVA[farge]} farevarsel`,
                    undertittel: `${p.eventAwarenessName} · ${p.area}`,
                    kilde: 'Varselområde: Meteorologisk institutt',
                    // Denizdeki uyarılar (kuling, stormflo) kıyıya kırpılmaz.
                    klippTilLand: p.geographicDomain === 'land',
                  }),
                alt: `Kart som viser området med ${NIVA[farge].toLowerCase()} farevarsel for ${p.eventAwarenessName.toLowerCase()} i ${omrade}.`,
                kreditt: 'Kart: tidsrøst. Varselområde: Meteorologisk institutt (CC BY 4.0). Kartgrunnlag: Natural Earth.',
              },
            };
          },
        };
      });
  },
};
