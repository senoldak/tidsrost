/**
 * Entelektüel Rezonans ve Tarihsel Kriz Hafızası
 *
 * Norges moderne økonomiske historie sett i lys av internasjonale
 * og nasjonale stabiliseringskriser, fra Volcker-sjokket til dagens inflasjonsbølge.
 */

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
}

export const KRISER: KriseEpoke[] = [
  {
    id: 'volcker-1979',
    tittel: 'Volcker-sjokket og kampen mot forventningene',
    periode: '1979–1982',
    region: 'USA / Globalt',
    kategori: 'inflasjon',
    toppRente: '20,0 % (juni 1981)',
    toppInflasjon: '14,8 % (mars 1980)',
    ledighet: '10,8 % (desember 1982)',
    kjerneAarsak: 'Tiår med forankret høy inflasjonspsykologi, forsterket av to oljesjokk og ekspansiv finanspolitikk.',
    politiskeTiltak: [
      'Federal Reserve la om styringen fra rente til direkte kontroll over bankenes reserver (pengemengde).',
      'Aksepterte en dyp dobbelbunn-resesjon for å knekke lønns- og prisspiralen.',
      'Etablerte prinsippet om at sentralbanken må være villig til å påføre økonomien kortsiktig smerte for å sikre langsiktig prisstabilitet.',
    ],
    laerdommer: 'Inflasjon kan ikke snakkes ned; forventningene brytes først når sentralbanken viser vilje til å holde realrenten markant positiv over tid.',
    dagensParallell: 'Norges Banks beslutning om å holde styringsrenten på 4,50 % lenge etter at andre kutter, drives av frykten for at kronesvekkelse og lønnsvekst skal forankre en ny inflasjonsbølge.',
  },
  {
    id: 'norsk-bankkrise-1988',
    tittel: 'Den norske bankkrisen',
    periode: '1988–1992',
    region: 'Norge',
    kategori: 'bankkrise',
    toppRente: '11,0 % (dagsrente opp mot 25 %)',
    toppInflasjon: '8,7 % (1987)',
    ledighet: '6,0 % (1993, etterkrigsrekord)',
    kjerneAarsak: 'Deregulering av kredittmarkedet i 1984–85 uten tilstrekkelig tilsyn, etterfulgt av oljeprisfall i 1986 og kraftig fall i eiendomspriser.',
    politiskeTiltak: [
      'Statlig redning av banksystemet via Statens Banksikringsfond og Statens Bankinvesteringsfond.',
      'Aksjonærene i Christiania Bank og Den norske Creditbank mistet sine verdier; staten overtok eierskapet.',
      'Innføring av strengere soliditets- og tapsavsetningsregler.',
    ],
    laerdommer: 'Finansiell deregulering kombinert med skattefradrag for gjeldsrenter og uerfarne banker skaper uunngåelig kredittbobler og påfølgende systemkrise.',
    dagensParallell: 'Dagens utlånsforskrift (krav om 15 % egenkapital, maksimalt 5x inntekt og rente-stresstest) er en direkte arv fra bankkrisens lærdommer.',
  },
  {
    id: 'erm-1992',
    tittel: 'Valutakrisen og oppgivelsen av fastkursen',
    periode: 'Høsten 1992',
    region: 'Norge og Europa',
    kategori: 'valuta',
    toppRente: '25,0 % (Norges Banks dagslånrente)',
    toppInflasjon: '2,3 % (1992)',
    ledighet: '5,9 %',
    kjerneAarsak: 'Spekulasjonsbølger mot europeiske fastkurser (ERM) etter Tysklands gjenforening og høye Bundesbank-renter.',
    politiskeTiltak: [
      'Norges Bank hevet dagslånrenten til ekstreme 25 % for å forsvare kronen mot spekulasjon.',
      '10. desember 1992 ga regjeringen og Norges Bank opp fastkursen mot ECU (forløperen til euro).',
      'Kronen fløt fritt og svekket seg med ca. 5 %, noe som lettet presset på eksportindustrien.',
    ],
    laerdommer: 'Å forsvare en overvurdert fast valutakurs krever uholdbart høye renter som knuser innenlandsk økonomi. Fleksibel valutakurs fungerer som en uunnværlig støtdemper.',
    dagensParallell: 'Forklarer hvorfor Norges Bank i dag lar kronen svinge fritt og ikke intervenerer for å forsvare et spesifikt kursmål mot euro eller dollar.',
  },
  {
    id: 'latin-stabilisering-1990',
    tittel: 'Latinamerikanske stabiliseringsprogrammer',
    periode: '1985–1994',
    region: 'Latin-Amerika (Brasil, Argentina, Mexico)',
    kategori: 'inflasjon',
    toppRente: '> 100 % (ekstreme nominelle satser)',
    toppInflasjon: '> 1000 % (hyperinflasjon)',
    ledighet: 'Betydelig underbeskjeftigelse',
    kjerneAarsak: 'Kroniske budsjettunderskudd finansiert med pengeseddelpressen, kombinert med full indeksregulering av lønninger og priser.',
    politiskeTiltak: [
      'Heterodokse sjokk (prisfrysinger som Cruzado- og Austral-planene) mislyktes fordi de underliggende underskuddene besto.',
      'Gjennombrudd kom med ortodokse budsjettkutt og institusjonell nyskapning (Brasils Plano Real med den fiktive regneenheten URV i 1994).',
      'Forbud mot sentralbankfinansiering av statsgjeld.',
    ],
    laerdommer: 'Automatisk indeksregulering virker som bensin på inflasjonsbålet. Prisvekst kan aldri temmes varig uten finanspolitisk disiplin.',
    dagensParallell: 'Advarsel mot automatisk inflasjonsjustering av offentlige budsjetter og lønnstillegg som kan føre til at inflasjonsimpulsene sementeres.',
  },
  {
    id: 'finanskrisen-2008',
    tittel: 'Den globale finanskrisen og likviditetslåsen',
    periode: '2008–2009',
    region: 'Globalt / Norge',
    kategori: 'likviditet',
    toppRente: '5,75 % (kuttet til 1,25 %)',
    toppInflasjon: '3,8 % (2008)',
    ledighet: '3,2 % (begrenset økning i Norge)',
    kjerneAarsak: 'Kollaps i det amerikanske subprime-markedet og Lehman Brothers-konkurs som frøs de internasjonale kredittmarkedene.',
    politiskeTiltak: [
      '«Gullkortet»: Norske banker fikk bytte obligasjoner med fortrinnsrett (OMF) mot statskasseveksler med lav risiko.',
      'Norges Bank kuttet styringsrenten aggressivt fra 5,75 % til 1,25 %.',
      'Statens finansfond ble opprettet for å styrke bankenes kjernekapital ved behov.',
    ],
    laerdommer: 'Rask og massiv tilførsel av statlig likviditet mot pant kan avverge en kredittfrys før den smitter over i realøkonomien.',
    dagensParallell: 'Bankenes store beholdning av OMF og solide kapitalbuffere gjør at dagens renteoppgang på 4,50 % håndteres uten fare for systemkrise i kredittmarkedet.',
  },
  {
    id: 'inflasjonssjokket-2021',
    tittel: 'Det store inflasjons- og energisjokket',
    periode: '2021–2026',
    region: 'Norge og Vesten',
    kategori: 'inflasjon',
    toppRente: '4,50 % (desember 2023–2026)',
    toppInflasjon: '7,5 % (KPI okt 2022), 7,0 % (KPI-JAE jun 2023)',
    ledighet: 'ca. 2,0 % (NAV registrert)',
    kjerneAarsak: 'Etterdønninger av pandemi-stimulanser, forsyningsflaskehalser, gasskrise, krig i Ukraina og en historisk svak kronekurs.',
    politiskeTiltak: [
      'Raskeste renteoppgang i Norges Banks nyere historie: fra 0 % til 4,50 % på 27 måneder.',
      'Strømstøtteordning for å dempe sjokket for husholdningene.',
      'Statsbudsjett med vekt på å unngå overoppheting av fastlandsøkonomien.',
    ],
    laerdommer: 'Små åpne økonomier med flytende rente rammes dobbelt: Kronesvekkelsen hever importprisene, mens renteøkningene treffer husholdningenes høye gjeld direkte via flytende rente.',
    dagensParallell: 'Aktuell situasjon som binder sammen lærdommene fra Volckers forventningskamp, 1992-valutaens fleksibilitet og 2008-bankenes robusthet.',
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
