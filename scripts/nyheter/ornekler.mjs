import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sakKapagi, kapakCiz } from './bilde.mjs';

const cikti = resolve(process.argv[2] ?? '.kapak-ornekleri');
await mkdir(cikti, { recursive: true });

const ornekler = {
  'haber-standart': sakKapagi({
    kategori: 'innenriks',
    tittel: 'Stortinget vedtar nye tiltak for å sikre nasjonal beredskap',
    ingress: 'Et bredt flertall i Stortinget stiller seg bak regjeringens forslag om styrket overvåking og forsyningssikkerhet i nordområdene.',
    dato: '2026-10-13T12:00:00+02:00',
    kilde: 'Stortinget',
  }),
  'haber-rakamli': sakKapagi({
    kategori: 'økonomi',
    tittel: 'Norges Bank holder styringsrenten uendret',
    ingress: 'Sentralbanken vurderer at inflasjonspresset fortsatt krever en restriktiv pengepolitikk utover vinteren.',
    dato: '2026-10-13T12:00:00+02:00',
    rakam: { etiket: 'Styringsrente', deger: '4,50 %' },
    kilde: 'Norges Bank',
  }),
  'haber-uzun-baslik': sakKapagi({
    kategori: 'utenriks',
    tittel: 'Norge og allierte land fordømmer nye cyberangrep mot europeisk infrastruktur og varsler felles mottiltak',
    ingress: 'Utenriksdepartementet kaller angrepene uakseptable og understreker at trusselbildet mot kritisk digital infrastruktur er skjerpet.',
    dato: '2026-10-13T12:00:00+02:00',
    kilde: 'Utenriksdepartementet',
  }),
};

for (const [ad, tur] of Object.entries(ornekler)) {
  const png = await kapakCiz(tur);
  await writeFile(resolve(cikti, `${ad}.png`), png);
  console.log(`${ad}.png`, `${Math.round(png.length / 1024)} KB`);
}
