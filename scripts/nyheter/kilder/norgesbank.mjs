// Norges Bank: döviz haberleri ve politika faizi değişiklikleri.
//  - Haftalık döviz özeti: haftanın son kuru cuma geldiğinde (her hafta bir haber).
//  - Günlük haber: sadece euro ya da dolar bir günde belirgin oynarsa.
import { hentTekst, osloIso, norskDato } from '../lib.mjs';

// tabell: tablodaki ad; navn: metinde; best: belirli hâli ("euroen steg").
const VALUTA = {
  EUR: { tabell: 'Euro', navn: 'euro', best: 'euroen' },
  USD: { tabell: 'Amerikansk dollar', navn: 'amerikanske dollar', best: 'dollaren' },
  GBP: { tabell: 'Britisk pund', navn: 'britiske pund', best: 'pundet' },
  SEK: { tabell: 'Svenske kroner', navn: 'svenske kroner', best: 'den svenske kronen' },
  DKK: { tabell: 'Danske kroner', navn: 'danske kroner', best: 'den danske kronen' },
};
const VALUTA_URL = `https://data.norges-bank.no/api/data/EXR/B.${Object.keys(VALUTA).join('+')}.NOK.SP?lastNObservations=15&format=csv&locale=en`;
// Bu eşiğin altındaki değişimler "omtrent uendret" sayılır.
const ROLIG = 0.15;
// Günlük haber için euro ya da dolardaki en az değişim (yüzde).
const STOR_DAGSENDRING = 1;
const RENTE_URL = 'https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?lastNObservations=30&format=csv&locale=en';
const KILDE = { navn: 'Norges Bank', url: 'https://www.norges-bank.no/tema/Statistikk/Valutakurser/', lisens: 'NLOD' };

function lesCsv(tekst) {
  const [hode, ...rader] = tekst.trim().split(/\r?\n/);
  const kol = hode.split(';');
  return rader.map((r) => Object.fromEntries(r.split(';').map((v, i) => [kol[i], v])));
}

const tall = (n, d = 2) => n.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
const dato = (iso) => new Date(`${iso}T12:00:00Z`);

// ── Döviz metin yardımcıları ───────────────────────────────────────────

const pst = (n) => `${tall(Math.abs(n), 1)} prosent`;
const fortegn = (n) => (Math.abs(n) < 0.05 ? '0,0 %' : `${n > 0 ? '+' : '−'}${tall(Math.abs(n), 1)} %`);
const dagTekst = (iso) => norskDato(dato(iso), { weekday: 'long' });

// Kurdaki fark: 1 kronun altındaysa öre, üstündeyse kron ("9 øre", "1,20 kroner").
function differanse(kr) {
  const a = Math.abs(kr);
  if (a < 0.995) return `${Math.max(1, Math.round(a * 100))} øre`;
  return `${tall(a)} kroner`;
}

// Kurun tek bir birim için cümlesi: "En euro kostet 10,72 kroner" / "100 svenske kroner kostet 95,95 kroner".
const enhetTekst = (l) => (l.enhet > 1 ? `${l.enhet} ${l.navn}` : `En ${l.kode === 'EUR' ? 'euro' : l.kode === 'USD' ? 'dollar' : 'pund'}`);

// Kurun yükselmesi kronun zayıflaması demek.
function kronenMot(l) {
  if (Math.abs(l.endring) < ROLIG) return null;
  return l.endring > 0 ? 'svekket seg' : 'styrket seg';
}

function lesKurser(rader) {
  const per = {};
  for (const r of rader) {
    (per[r.BASE_CUR] ??= []).push({ dato: r.TIME_PERIOD, verdi: Number(r.OBS_VALUE), enhet: 10 ** Number(r.UNIT_MULT) });
  }
  for (const l of Object.values(per)) l.sort((a, b) => a.dato.localeCompare(b.dato));
  return per;
}

// Belirli iki tarih arasındaki değişimi her para birimi için hesaplar.
function endringer(per, sisteDato, sammenlignDato) {
  return Object.entries(VALUTA)
    .map(([kode, v]) => {
      const serie = per[kode] ?? [];
      const siste = serie.find((o) => o.dato === sisteDato);
      const før = serie.find((o) => o.dato === sammenlignDato);
      if (!siste || !før) return null;
      return { kode, ...v, ...siste, før: før.verdi, endring: ((siste.verdi - før.verdi) / før.verdi) * 100, diff: siste.verdi - før.verdi };
    })
    .filter(Boolean);
}

function tabell(linjer, kolonne) {
  return [
    `| Valuta | Kurs | ${kolonne} |`,
    '|---|---:|---:|',
    ...linjer.map((l) => `| ${l.tabell} (${l.enhet > 1 ? `${l.enhet} ` : ''}${l.kode}) | ${tall(l.verdi)} kr | ${fortegn(l.endring)} |`),
  ].join('\n');
}

const OM_KURSENE =
  'Kursene er Norges Banks referansekurser, som fastsettes rundt kl. 14.15 hver virkedag. De er ment som informasjon og er ikke kursene du får i banken eller på vekslingskontoret.';

// Euro ve dolar için başlık: kron ikisine karşı da aynı yöne gittiyse tek ifade.
function overskrift(eur, usd, periode) {
  const e = kronenMot(eur);
  const u = usd && kronenMot(usd);
  if (!e && !u) return `Rolig ${periode} for kronen`;
  if (e && u && e === u) return `Kronen ${e} ${periode === 'uke' ? 'denne uken' : ''}`.trim();
  if (e && u) return `Kronen ${e} mot euro, men ${u} mot dollar`;
  if (e) return `Kronen ${e} mot euro${periode === 'uke' ? ' denne uken' : ''}`;
  return `Kronen ${u} mot dollar${periode === 'uke' ? ' denne uken' : ''}`;
}

// "En euro kostet 10,72 kroner, 9 øre mindre enn fredag 2. oktober."
function kursSetning(l, sammenlignTekst) {
  if (Math.abs(l.endring) < ROLIG) return `${enhetTekst(l)} kostet ${tall(l.verdi)} kroner, omtrent det samme som ${sammenlignTekst}.`;
  const mer = l.diff > 0 ? 'mer' : 'mindre';
  return `${enhetTekst(l)} kostet ${tall(l.verdi)} kroner, ${differanse(l.diff)} ${mer} enn ${sammenlignTekst}.`;
}

// ── Haftalık özet ──────────────────────────────────────────────────────

function ukesoppsummering(per, sisteDato) {
  // Sadece cuma kuru geldiğinde; karşılaştırma bir önceki haftanın son iş günüyle.
  if (dato(sisteDato).getUTCDay() !== 5) return [];
  const mandag = new Date(dato(sisteDato).getTime() - 4 * 864e5).toISOString().slice(0, 10);
  const datoer = [...new Set((per.EUR ?? []).map((o) => o.dato))];
  const forrigeUke = datoer.filter((d) => d < mandag).at(-1);
  if (!forrigeUke) return [];

  const linjer = endringer(per, sisteDato, forrigeUke);
  const eur = linjer.find((l) => l.kode === 'EUR');
  const usd = linjer.find((l) => l.kode === 'USD');
  if (!eur) return [];
  const fraTekst = dagTekst(forrigeUke);
  const ukeFør = 'en uke tidligere';

  // Euro ve dolar dışında en çok oynayan para birimi. Danimarka kronu euroya sabitli, o yüzden hariç.
  const andre = linjer.filter((l) => ['GBP', 'SEK'].includes(l.kode)).sort((a, b) => Math.abs(b.endring) - Math.abs(a.endring))[0];
  const stor = (s) => s[0].toUpperCase() + s.slice(1);

  return [{
    id: `norgesbank:valutauke:${sisteDato}`,
    tid: dato(sisteDato),
    tittel: `Valutauken ${sisteDato}`,
    async lag() {
      const avsnitt = [
        `${overskrift(eur, usd, 'uke')}. Ifølge Norges Banks referansekurs fra ${dagTekst(sisteDato)} kostet en euro ${tall(eur.verdi)} kroner – ${
          Math.abs(eur.endring) < ROLIG ? `omtrent det samme som ${fraTekst}` : `${differanse(eur.diff)} ${eur.diff > 0 ? 'mer' : 'mindre'} enn ${fraTekst}`
        }.`,
        [
          usd ? kursSetning(usd, ukeFør) : null,
          andre && Math.abs(andre.endring) >= ROLIG
            ? `${stor(andre.best)} ${andre.endring > 0 ? 'steg' : 'falt'} ${pst(andre.endring)} mot norske kroner gjennom uken.`
            : null,
        ]
          .filter(Boolean)
          .join(' ') || null,
        tabell(linjer, `Endring siden ${norskDato(dato(forrigeUke))}`),
        OM_KURSENE,
      ].filter(Boolean);
      return {
        title: overskrift(eur, usd, 'uke'),
        description: `${kursSetning(eur, ukeFør)}${usd ? ` ${kursSetning(usd, ukeFør)}` : ''}`,
        body: avsnitt.join('\n\n'),
        category: 'okonomi',
        date: osloIso(),
        produksjon: 'automatisk',
        kilde: KILDE,
      };
    },
  }];
}

// ── Günlük büyük hareket ───────────────────────────────────────────────

function storDagsbevegelse(per, sisteDato) {
  const datoer = [...new Set((per.EUR ?? []).map((o) => o.dato))];
  const forrige = datoer.filter((d) => d < sisteDato).at(-1);
  if (!forrige) return [];
  const linjer = endringer(per, sisteDato, forrige);
  const eur = linjer.find((l) => l.kode === 'EUR');
  const usd = linjer.find((l) => l.kode === 'USD');
  const største = [eur, usd].filter(Boolean).sort((a, b) => Math.abs(b.endring) - Math.abs(a.endring))[0];
  if (!største || Math.abs(største.endring) < STOR_DAGSENDRING) return [];
  const dag = dagTekst(sisteDato);
  const motNavn = største.kode === 'EUR' ? 'euro' : 'dollar';

  return [{
    id: `norgesbank:valuta:${sisteDato}`,
    tid: dato(sisteDato),
    tittel: `Stor kursbevegelse ${sisteDato}`,
    async lag() {
      return {
        title: `Kronen ${kronenMot(største)} ${pst(største.endring)} mot ${motNavn}`,
        description: `${kursSetning(største, 'dagen før')} Det viser Norges Banks referansekurs fra ${dag}.`,
        body: [
          `Kronen ${kronenMot(største)} ${pst(største.endring)} mot ${motNavn} ${dag}. ${kursSetning(største, dagTekst(forrige))}`,
          ...[eur, usd].filter((l) => l && l !== største).map((l) => kursSetning(l, dagTekst(forrige))),
          tabell(linjer, 'Endring fra dagen før'),
          OM_KURSENE,
        ].join('\n\n'),
        category: 'okonomi',
        date: osloIso(),
        produksjon: 'automatisk',
        kilde: KILDE,
      };
    },
  }];
}

async function valuta() {
  const per = lesKurser(lesCsv(await hentTekst(VALUTA_URL)));
  const sisteDato = (per.EUR ?? []).at(-1)?.dato;
  // Sadece son 3 gün içindeki kurlar haber olur.
  if (!sisteDato || Date.now() - dato(sisteDato).getTime() > 3 * 864e5) return [];
  return [...storDagsbevegelse(per, sisteDato), ...ukesoppsummering(per, sisteDato)];
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
          produksjon: 'automatisk',
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
