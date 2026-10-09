// Norges Bank: günlük döviz kurları ve politika faizi değişiklikleri.
import { hentTekst, osloIso, norskDato } from '../lib.mjs';

const VALUTA = { EUR: 'euro', USD: 'amerikanske dollar', GBP: 'britiske pund', SEK: 'svenske kroner', DKK: 'danske kroner' };
const VALUTA_URL = `https://data.norges-bank.no/api/data/EXR/B.${Object.keys(VALUTA).join('+')}.NOK.SP?lastNObservations=2&format=csv&locale=en`;
const RENTE_URL = 'https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?lastNObservations=30&format=csv&locale=en';
const KILDE = { navn: 'Norges Bank', url: 'https://www.norges-bank.no/tema/Statistikk/Valutakurser/', lisens: 'NLOD' };

function lesCsv(tekst) {
  const [hode, ...rader] = tekst.trim().split(/\r?\n/);
  const kol = hode.split(';');
  return rader.map((r) => Object.fromEntries(r.split(';').map((v, i) => [kol[i], v])));
}

const tall = (n, d = 2) => n.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
const dato = (iso) => new Date(`${iso}T12:00:00Z`);

async function valuta() {
  const rader = lesCsv(await hentTekst(VALUTA_URL));
  const per = {};
  for (const r of rader) (per[r.BASE_CUR] ??= []).push({ dato: r.TIME_PERIOD, verdi: Number(r.OBS_VALUE), enhet: 10 ** Number(r.UNIT_MULT) });
  const sisteDato = rader.map((r) => r.TIME_PERIOD).sort().at(-1);
  // Sadece son 3 gün içindeki kurlar haber olur.
  if (!sisteDato || Date.now() - dato(sisteDato).getTime() > 3 * 864e5) return [];

  const linjer = Object.entries(VALUTA).map(([kode, navn]) => {
    const [forrige, siste] = (per[kode] ?? []).sort((a, b) => a.dato.localeCompare(b.dato));
    if (!siste || siste.dato !== sisteDato) return null;
    const endring = forrige ? ((siste.verdi - forrige.verdi) / forrige.verdi) * 100 : 0;
    return { kode, navn, ...siste, endring };
  }).filter(Boolean);
  const eur = linjer.find((l) => l.kode === 'EUR');
  if (!eur) return [];

  const retning = (e) => (Math.abs(e) < 0.05 ? 'nesten uendret' : e > 0 ? `opp ${tall(e)} prosent` : `ned ${tall(-e)} prosent`);
  const kronen = eur.endring > 0.05 ? 'svekket seg' : eur.endring < -0.05 ? 'styrket seg' : 'holdt seg stabil';
  const dag = norskDato(dato(sisteDato), { weekday: 'long' });

  const tabell = [
    '| Valuta | Kurs (NOK) | Endring fra forrige dag |',
    '|---|---|---|',
    ...linjer.map((l) => `| ${l.enhet > 1 ? `${l.enhet} ` : '1 '}${l.navn} (${l.kode}) | ${tall(l.verdi, l.enhet > 1 ? 2 : 4)} | ${retning(l.endring)} |`),
  ].join('\n');

  return [{
    id: `norgesbank:valuta:${sisteDato}`,
    tid: dato(sisteDato),
    tittel: `Valutakurser ${sisteDato}`,
    async lag() {
      return {
        title: `Valutakurser ${dag}: Én euro koster ${tall(eur.verdi)} kroner`,
        description: `Kronen ${kronen} mot euro ${dag}. Euroen er ${retning(eur.endring)} fra dagen før, ifølge Norges Banks referansekurser.`,
        body: `Norges Banks referansekurs for euro var ${tall(eur.verdi, 4)} kroner ${dag}. Det er ${retning(eur.endring)} sammenlignet med forrige virkedag.\n\n${tabell}\n\nReferansekursene fastsettes rundt klokken 14.15 hver virkedag og er ment som informasjon, ikke som handelskurser.`,
        category: 'okonomi',
        date: osloIso(),
        kilde: KILDE,
      };
    },
  }];
}

async function styringsrente() {
  const rader = lesCsv(await hentTekst(RENTE_URL)).sort((a, b) => a.TIME_PERIOD.localeCompare(b.TIME_PERIOD));
  for (let i = rader.length - 1; i > 0; i--) {
    const ny = Number(rader[i].OBS_VALUE);
    const gammel = Number(rader[i - 1].OBS_VALUE);
    if (ny === gammel) continue;
    const fra = rader[i].TIME_PERIOD;
    if (Date.now() - dato(fra).getTime() > 7 * 864e5) return [];
    const opp = ny > gammel;
    return [{
      id: `norgesbank:rente:${fra}`,
      tid: dato(fra),
      tittel: `Styringsrenten ${fra}`,
      async lag() {
        return {
          title: `Norges Bank ${opp ? 'øker' : 'kutter'} styringsrenten til ${tall(ny)} prosent`,
          description: `Styringsrenten er ${opp ? 'satt opp' : 'satt ned'} fra ${tall(gammel)} til ${tall(ny)} prosent med virkning fra ${norskDato(dato(fra), { year: 'numeric' })}.`,
          body: `Norges Bank har ${opp ? 'økt' : 'redusert'} styringsrenten med ${tall(Math.abs(ny - gammel))} prosentpoeng, fra ${tall(gammel)} til ${tall(ny)} prosent. Den nye renten gjelder fra ${norskDato(dato(fra), { year: 'numeric' })}.\n\nStyringsrenten er renten bankene får på sine innskudd i Norges Bank, og påvirker rentene på boliglån og sparing. Endringer i styringsrenten slår vanligvis inn i bankenes utlånsrenter etter noen uker.\n\nLes Norges Banks begrunnelse på [norges-bank.no](https://www.norges-bank.no/aktuelt/nyheter-og-hendelser/).`,
          category: 'okonomi',
          breaking: true,
          date: osloIso(),
          kilde: { ...KILDE, url: 'https://www.norges-bank.no/tema/pengepolitikk/Styringsrenten/' },
        };
      },
    }];
  }
  return [];
}

export default {
  navn: 'norgesbank',
  async hent() {
    return [...(await styringsrente()), ...(await valuta())];
  },
};
