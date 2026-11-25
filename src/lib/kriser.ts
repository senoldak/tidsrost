/**
 * Entelektüel Rezonans ve Tarihsel Kriz Hafızası
 *
 * Norges moderne økonomiske historie sett i lys av internasjonale
 * og nasjonale stabiliseringskriser, fra Volcker-sjokket til dagens inflasjonsbølge.
 */

export interface Kilde {
  navn: string;
  url: string;
}

export interface KriseEpoke {
  id: string;
  tittel: string;
  periode: string;
  region: string;
  kategori: 'inflasjon' | 'bankkrise' | 'valuta' | 'likviditet';
  toppRente: string;
  toppInflasjon: string;
  ledighet: string;
  kjerneAarsak: string;
  politiskeTiltak: string[];
  laerdommer: string;
  dagensParallell: string;
  // Kildene for tallene og faktaopplysningene i kortet (kontrollert 25.11.2026).
  kilder: Kilde[];
}

// Tallene er kontrollert mot offisielle kilder 25. november 2026 (FRED, SSB, Norges Bank, World Bank, Lovdata,
// Finanstilsynet, regjeringen.no). Det som ikke lot seg belegge, er fjernet.
const NB_RENTE: Kilde = {
  navn: 'Norges Bank: endringer i styringsrenten',
  url: 'https://www.norges-bank.no/en/topics/Monetary-policy/Policy-rate/Key-policy-rate-Monetary-policy-meetings-and-changes-in-the-policy-rate/',
};
const SSB_KPI: Kilde = { navn: 'SSB, tabell 03013 (KPI)', url: 'https://www.ssb.no/statbank/table/03013' };
const SSB_AKU: Kilde = { navn: 'SSB, tabell 08517 (AKU)', url: 'https://www.ssb.no/statbank/table/08517' };

export const KRISER: KriseEpoke[] = [
  {
    id: 'volcker-1979',
    tittel: 'Volcker-sjokket og kampen mot forventningene',
    periode: '1979–1982',
    region: 'USA',
    kategori: 'inflasjon',
    toppRente: '19,1 % (fed funds, snitt juni 1981)',
    toppInflasjon: '14,8 % (KPI, mars 1980)',
    ledighet: '10,8 % (november–desember 1982)',
    kjerneAarsak: 'Høy og vedvarende inflasjon gjennom 1970-tallet.',
    politiskeTiltak: [
      'I oktober 1979 gikk Federal Reserve over til å styre etter bankenes reserver i stedet for etter fed funds-renten.',
      'USA hadde to resesjoner: januar–juli 1980 og juli 1981–november 1982.',
    ],
    laerdommer: 'Inflasjonen falt først etter en lang periode med svært høye renter og høy arbeidsledighet.',
    dagensParallell:
      'Norges Bank satte styringsrenten opp til 4,50 % i desember 2023, kuttet til 4,00 % i 2025 og satte den opp igjen til 4,50 % i september 2026.',
    kilder: [
      { navn: 'FRED: fed funds-renten (FEDFUNDS)', url: 'https://fred.stlouisfed.org/series/FEDFUNDS' },
      { navn: 'FRED: KPI, USA (CPIAUCNS)', url: 'https://fred.stlouisfed.org/series/CPIAUCNS' },
      { navn: 'FRED: arbeidsledighet, USA (UNRATE)', url: 'https://fred.stlouisfed.org/series/UNRATE' },
      { navn: 'Federal Reserve History: The Great Inflation', url: 'https://www.federalreservehistory.org/essays/great-inflation' },
      NB_RENTE,
    ],
  },
  {
    id: 'norsk-bankkrise-1988',
    tittel: 'Den norske bankkrisen',
    periode: '1988–1993',
    region: 'Norge',
    kategori: 'bankkrise',
    toppRente: '13,1 % (dagslånsrenten, snitt 1988)',
    toppInflasjon: '6,7 % (KPI, snitt 1988)',
    ledighet: '6,0 % (1993, høyeste etter krigen)',
    kjerneAarsak: 'Kredittmarkedet ble deregulert i 1984–85, og bankenes utlån vokste raskt.',
    politiskeTiltak: [
      'Staten opprettet Statens Banksikringsfond våren 1991 og Statens Bankinvesteringsfond høsten 1991.',
      'To storbanker fikk aksjekapitalen skrevet ned til null høsten 1991, en tredje i 1993.',
    ],
    laerdommer: 'Rask kredittvekst etter dereguleringen ble fulgt av store tap og statlige kapitaltilskudd til bankene.',
    dagensParallell:
      'Utlånsforskriften setter i dag grenser for boliglån: lånet kan ikke være over 90 % av boligens verdi, samlet gjeld kan være høyst fem ganger inntekten, og låntakeren må tåle en renteøkning på 3 prosentpoeng, minst til 7 %.',
    kilder: [
      { navn: 'Norges Bank: styringsrenten, årssnitt', url: 'https://www.norges-bank.no/en/topics/Statistics/Key-policy-rate-daily/policy-rate-annual/' },
      SSB_KPI,
      SSB_AKU,
      { navn: 'SSB: Bankkrisen', url: 'https://www.ssb.no/bank-og-finansmarked/artikler-og-publikasjoner/bankkrisen' },
      { navn: 'Lovdata: utlånsforskriften', url: 'https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648' },
    ],
  },
  {
    id: 'erm-1992',
    tittel: 'Valutakrisen og oppgivelsen av fastkursen',
    periode: 'November–desember 1992',
    region: 'Norge og Europa',
    kategori: 'valuta',
    toppRente: '25,0 % (dagslånsrenten, 23.–27. november 1992)',
    toppInflasjon: '2,3 % (KPI, snitt 1992)',
    ledighet: '5,9 % (1992)',
    kjerneAarsak: 'Uro i det europeiske valutasamarbeidet høsten 1992 og spekulasjon mot kronen, som da hadde fast kurs.',
    politiskeTiltak: [
      'Norges Bank satte dagslånsrenten opp til 25 % for å forsvare kronen.',
      'Den 10. desember 1992 ble fastkurspolitikken oppgitt, og kronen gikk over til styrt flyt.',
    ],
    laerdommer: 'Forsvaret av fastkursen krevde svært høye renter i en periode med høy arbeidsledighet.',
    dagensParallell: 'I dag har Norge flytende kronekurs, og pengepolitikken skal sikre lav og stabil inflasjon, med et mål på 2 % over tid.',
    kilder: [
      { navn: 'Norges Bank: styringsrenten, historikk', url: 'https://www.norges-bank.no/en/topics/Monetary-policy/policy-rate/Policy-rate---more' },
      { navn: 'Norges Bank: historie, 1992–', url: 'https://www.norges-bank.no/tema/Om-Norges-Bank/historie/norges-banks-historie/e6-artikkel2/1992-/' },
      SSB_KPI,
      SSB_AKU,
      { navn: 'Lovdata: forskrift om pengepolitikken', url: 'https://lovdata.no/dokument/LTI/forskrift/2001-03-29-278' },
    ],
  },
  {
    id: 'latin-stabilisering-1990',
    tittel: 'Hyperinflasjonen i Brasil',
    periode: '1990–1995',
    region: 'Latin-Amerika (Brasil)',
    kategori: 'inflasjon',
    toppRente: '–',
    toppInflasjon: '2 948 % (KPI, 1990)',
    ledighet: '–',
    kjerneAarsak: 'Prisene i Brasil steg med over 1 900 % i 1990, 1993 og 1994.',
    politiskeTiltak: ['Brasil innførte Plano Real i 1994. Inflasjonen falt fra 2 076 % i 1994 til 66 % i 1995.'],
    laerdommer: 'Inflasjonen falt kraftig året etter at Plano Real ble innført.',
    dagensParallell: 'Prisstigningen i Norge var 3,6 % i oktober 2026.',
    kilder: [
      { navn: 'World Bank: inflasjon, Brasil (FP.CPI.TOTL.ZG)', url: 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=BR' },
      { navn: 'SSB, tabell 14700 (KPI)', url: 'https://www.ssb.no/statbank/table/14700' },
    ],
  },
  {
    id: 'finanskrisen-2008',
    tittel: 'Den globale finanskrisen og likviditetslåsen',
    periode: '2008–2009',
    region: 'Globalt / Norge',
    kategori: 'likviditet',
    toppRente: '5,75 % (25. juni 2008), kuttet til 1,25 % (17. juni 2009)',
    toppInflasjon: '3,8 % (KPI, snitt 2008)',
    ledighet: '2,7 % (2008), 3,3 % (2009)',
    kjerneAarsak:
      'Krisen i det amerikanske boliglånsmarkedet og Lehman Brothers-konkursen i september 2008 stengte de internasjonale kredittmarkedene.',
    politiskeTiltak: [
      'Bytteordningen (oktober 2008): bankene kunne bytte obligasjoner med fortrinnsrett (OMF) mot statskasseveksler, med en ramme på 350 mrd. kroner.',
      'Norges Bank kuttet styringsrenten fra 5,75 % til 1,25 %.',
      'Statens finansfond ble opprettet i mars 2009 med 50 mrd. kroner for å styrke bankenes kjernekapital.',
    ],
    laerdommer: 'Staten ga bankene likviditet mot sikkerhet og tilbød kapital tidlig i krisen.',
    dagensParallell: 'Over 95 % av husholdningenes gjeld i banker og kredittforetak har flytende rente (Finanstilsynet, 1. kvartal 2026).',
    kilder: [
      NB_RENTE,
      SSB_KPI,
      SSB_AKU,
      { navn: 'Finanstilsynet: Tilstanden i finansmarkedet 2009', url: 'https://www.finanstilsynet.no/contentassets/af5b86649a7e41c0bc6346bf2c2f11f0/tilstanden_i_finansmarkedet_2009.pdf' },
      { navn: 'Ot.prp. nr. 35 (2008–2009): Statens finansfond', url: 'https://www.regjeringen.no/contentassets/7eb8c5a3fc61480fb94d5fb3572b1632/no/pdfs/otp200820090035000dddpdfs.pdf' },
      { navn: 'Finanstilsynet: Finansielt utsyn, juni 2026', url: 'https://www.finanstilsynet.no/publikasjoner-og-analyser/finansielt-utsyn/finansielt-utsyn---juni-2026/html/2026/' },
    ],
  },
  {
    id: 'inflasjonssjokket-2021',
    tittel: 'Det store inflasjons- og energisjokket',
    periode: '2021–2026',
    region: 'Norge',
    kategori: 'inflasjon',
    toppRente: '4,50 % (desember 2023–juni 2025 og fra september 2026)',
    toppInflasjon: '7,5 % (KPI, oktober 2022), 6,9 % (KPI-JAE, juni 2023)',
    ledighet: '3,2 % (AKU, 2022), 4,6 % (oktober 2026)',
    kjerneAarsak: 'Prisene på energi og varer steg kraftig etter pandemien og krigen i Ukraina.',
    politiskeTiltak: [
      'Norges Bank satte styringsrenten opp fra 0 % i september 2021 til 4,50 % i desember 2023.',
      'Strømstøtten ble innført i desember 2021, og Norgespris kom 1. oktober 2025.',
    ],
    laerdommer: 'Styringsrenten gikk fra 0 % til 4,50 % på 27 måneder.',
    dagensParallell: 'Styringsrenten er 4,50 % fra 25. september 2026, og prisstigningen var 3,6 % i oktober 2026.',
    kilder: [
      NB_RENTE,
      SSB_KPI,
      { navn: 'SSB, tabell 14704 (KPI-JAE)', url: 'https://www.ssb.no/statbank/table/14704' },
      { navn: 'SSB, tabell 13760 (AKU)', url: 'https://www.ssb.no/statbank/table/13760' },
      { navn: 'Regjeringen: strømtiltak', url: 'https://www.regjeringen.no/no/tema/energi/strom/regjeringens-stromtiltak/id2900232/' },
    ],
  },
];

export function finnKrise(id: string): KriseEpoke | undefined {
  return KRISER.find((k) => k.id === id);
}

export function filtrerKriser(kategori?: string): KriseEpoke[] {
  if (!kategori || kategori === 'alle') return KRISER;
  return KRISER.filter((k) => k.kategori === kategori);
}

export function sammenligningsMatrise(): {
  id: string;
  tittel: string;
  toppRente: string;
  toppInflasjon: string;
  hovedlaerdom: string;
}[] {
  return KRISER.map((k) => ({
    id: k.id,
    tittel: k.tittel,
    toppRente: k.toppRente,
    toppInflasjon: k.toppInflasjon,
    hovedlaerdom: k.laerdommer,
  }));
}
