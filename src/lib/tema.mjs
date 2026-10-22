// Tema sayfaları (/tema/<slug>/): kurum ve konu başına otomatik sayfalar.
// Her tema kısa, tarafsız bir Norveççe giriş metni taşır; metinde rakam ya da tartışmalı iddia yoktur.
// Bir haber, anahtar kelime başlıkta, girişte ya da kaynak satırında geçiyorsa (ya da gövdede en az iki kez)
// o temaya girer. Kaynak satırı (*Kilde: [...]*) sadece resmi kurum adlarını içerir.
// En az MIN_SAKER haberi olmayan tema için sayfa üretilmez (ince içerik olmasın).
// Saf JS: hem Astro sayfaları hem testler (scripts/nyheter/tema.test.mjs) kullanır.

export const MIN_SAKER = 3;

// ord: büyük/küçük harf duyarsız; ordCs: duyarlı (kısa kısaltmalar: NAV, MET, FN…); monster: hazır düzenli ifade.
// entitet: src/lib/entities.ts'teki kaydın adı (Wikidata sameAs oradan alınır; burada yeni kimlik uydurulmaz).
export const TEMAER = [
  {
    slug: 'norges-bank',
    navn: 'Norges Bank',
    entitet: 'Norges Bank',
    ord: ['Norges Bank', 'Norges Banks', 'sentralbanken', 'sentralbankens', 'styringsrenten', 'styringsrente'],
    intro:
      'Norges Bank er Norges sentralbank. Banken fastsetter styringsrenten, skal bidra til stabil prisvekst og et robust finansielt system, og forvalter Statens pensjonsfond utland. Her samler vi sakene våre om Norges Bank, renten og kronekursen.',
  },
  {
    slug: 'oljefondet',
    navn: 'Oljefondet',
    entitet: 'Oljefondet',
    ord: ['Oljefondet', 'Oljefondets', 'Statens pensjonsfond utland', 'Norges Bank Investment Management'],
    ordCs: ['NBIM'],
    intro:
      'Statens pensjonsfond utland, ofte kalt oljefondet, er fondet der statens inntekter fra olje- og gassvirksomheten plasseres. Fondet eies av staten ved Finansdepartementet og forvaltes av Norges Bank Investment Management (NBIM), som er en del av Norges Bank.',
  },
  {
    slug: 'stortinget',
    navn: 'Stortinget',
    entitet: 'Stortinget',
    ord: ['Stortinget', 'Stortingets', 'stortingsrepresentant', 'stortingsrepresentanten', 'stortingsvalget', 'stortingsflertall', 'stortingsflertallet'],
    intro:
      'Stortinget er Norges nasjonalforsamling. Stortinget vedtar lover og statsbudsjettet og kontrollerer regjeringen. Representantene velges for fire år av gangen.',
  },
  {
    slug: 'regjeringen',
    navn: 'Regjeringen og departementene',
    ord: ['regjeringen', 'regjeringens', 'regjeringen.no', 'statsministeren', 'statsministerens'],
    monster: [/(?<![\p{L}\p{N}])[\p{L}-]*departementets?(?![\p{L}\p{N}])/iu],
    intro:
      'Regjeringen er landets utøvende makt og ledes av statsministeren. Departementene forbereder saker for regjeringen og har ansvar for hvert sitt fagområde. Her finner du saker om regjeringens forslag og vedtak og nyheter fra departementene.',
  },
  {
    slug: 'nav',
    navn: 'Nav',
    ord: ['Arbeids- og velferdsetaten', 'Arbeids- og velferdsdirektoratet'],
    ordCs: ['NAV', 'Nav', 'NAVs', 'Navs'],
    intro:
      'Arbeids- og velferdsetaten (Nav) forvalter blant annet dagpenger, sykepenger, pensjon og andre ytelser, og skal hjelpe folk i arbeid. Her samler vi saker om Nav og ordningene etaten har ansvar for.',
  },
  {
    slug: 'ssb',
    navn: 'Statistisk sentralbyrå (SSB)',
    ord: ['Statistisk sentralbyrå', 'Statistisk sentralbyrås'],
    ordCs: ['SSB', 'SSBs'],
    intro:
      'Statistisk sentralbyrå (SSB) er Norges nasjonale statistikkbyrå. SSB lager offisiell statistikk om blant annet befolkning, priser, arbeid, boliger og økonomi. Her samler vi sakene våre som bygger på tall fra SSB.',
  },
  {
    slug: 'meteorologisk-institutt',
    navn: 'Meteorologisk institutt (MET)',
    entitet: 'Meteorologisk institutt',
    // "farevarsel" tek başına anahtar değildir: NVE de farevarsel (flom, jordskred) yayımlar.
    ord: ['Meteorologisk institutt', 'Meteorologisk institutts'],
    ordCs: ['MET', 'METs'],
    intro:
      'Meteorologisk institutt (MET) lager værvarsler for Norge og sender ut farevarsler når det ventes farlig vær. Her samler vi sakene våre om farevarslene fra MET og om vær.',
  },
  {
    slug: 'nve',
    navn: 'NVE',
    entitet: 'NVE',
    ord: ['Norges vassdrags- og energidirektorat', 'Varsom'],
    ordCs: ['NVE', 'NVEs'],
    intro:
      'Norges vassdrags- og energidirektorat (NVE) forvalter Norges vann- og energiressurser. NVE varsler også flom, jordskred og snøskred gjennom Varsom.',
  },
  {
    slug: 'statens-vegvesen',
    navn: 'Statens vegvesen',
    entitet: 'Statens vegvesen',
    ord: ['Statens vegvesen', 'Vegvesenet', 'Vegvesenets'],
    intro:
      'Statens vegvesen har ansvar for riksveiene og for blant annet førerkort, kjøretøy og trafikksikkerhet.',
  },
  {
    slug: 'equinor',
    navn: 'Equinor',
    entitet: 'Equinor',
    ord: ['Equinor', 'Equinors'],
    intro: 'Equinor er et norsk energiselskap der staten er største eier. Selskapet driver med olje, gass og fornybar energi.',
  },
  {
    slug: 'havforskningsinstituttet',
    navn: 'Havforskningsinstituttet',
    ord: ['Havforskningsinstituttet', 'Havforskningsinstituttets'],
    intro:
      'Havforskningsinstituttet forsker på økosystemene i havet og langs kysten, og gir råd om blant annet fiskekvoter og havbruk.',
  },
  {
    slug: 'mattilsynet',
    navn: 'Mattilsynet',
    ord: ['Mattilsynet', 'Mattilsynets'],
    intro:
      'Mattilsynet fører tilsyn med mattrygghet, drikkevann, dyrehelse og dyrevelferd, og varsler når produkter trekkes tilbake fra markedet.',
  },
  {
    slug: 'datatilsynet',
    navn: 'Datatilsynet',
    ord: ['Datatilsynet', 'Datatilsynets'],
    intro: 'Datatilsynet fører tilsyn med at personvernregelverket blir fulgt i Norge, og gir råd om personvern.',
  },
  {
    slug: 'konkurransetilsynet',
    navn: 'Konkurransetilsynet',
    ord: ['Konkurransetilsynet', 'Konkurransetilsynets'],
    intro: 'Konkurransetilsynet håndhever konkurranseloven og skal bidra til effektiv konkurranse til fordel for forbrukerne.',
  },
  {
    slug: 'finanstilsynet',
    navn: 'Finanstilsynet',
    ord: ['Finanstilsynet', 'Finanstilsynets'],
    intro: 'Finanstilsynet fører tilsyn med banker, forsikringsselskaper, verdipapirmarkedet og andre finansforetak i Norge.',
  },
  {
    slug: 'forbrukerradet',
    navn: 'Forbrukerrådet',
    ord: ['Forbrukerrådet', 'Forbrukerrådets'],
    intro: 'Forbrukerrådet er en statlig etat som arbeider for forbrukernes interesser, gir råd og hjelper forbrukere med klagesaker.',
  },
  {
    slug: 'folkehelseinstituttet',
    navn: 'Folkehelseinstituttet (FHI)',
    ord: ['Folkehelseinstituttet', 'Folkehelseinstituttets'],
    ordCs: ['FHI', 'FHIs'],
    intro: 'Folkehelseinstituttet (FHI) følger med på helsen i befolkningen og arbeider blant annet med smittevern, vaksiner og folkehelse.',
  },
  {
    slug: 'helsedirektoratet',
    navn: 'Helsedirektoratet',
    ord: ['Helsedirektoratet', 'Helsedirektoratets'],
    intro: 'Helsedirektoratet er et fagdirektorat på helseområdet og gir blant annet nasjonale råd og retningslinjer for helsetjenesten.',
  },
  {
    slug: 'nkom',
    navn: 'Nkom',
    ord: ['Nasjonal kommunikasjonsmyndighet'],
    ordCs: ['Nkom', 'Nkoms'],
    intro: 'Nasjonal kommunikasjonsmyndighet (Nkom) fører tilsyn med post, telefoni og mobil- og bredbåndsnett i Norge.',
  },
  {
    slug: 'udi',
    navn: 'UDI',
    ord: ['Utlendingsdirektoratet', 'Utlendingsdirektoratets'],
    ordCs: ['UDI', 'UDIs'],
    intro: 'Utlendingsdirektoratet (UDI) behandler blant annet søknader om beskyttelse, oppholdstillatelse og statsborgerskap.',
  },
  {
    slug: 'statnett',
    navn: 'Statnett',
    ord: ['Statnett', 'Statnetts'],
    intro: 'Statnett er det statlige selskapet som eier og driver transmisjonsnettet for strøm i Norge og har ansvar for at kraftsystemet er i balanse.',
  },
  {
    slug: 'arbeidstilsynet',
    navn: 'Arbeidstilsynet',
    ord: ['Arbeidstilsynet', 'Arbeidstilsynets'],
    intro: 'Arbeidstilsynet fører tilsyn med at arbeidsgivere følger arbeidsmiljøloven og andre regler for arbeidslivet.',
  },
  {
    slug: 'miljodirektoratet',
    navn: 'Miljødirektoratet',
    ord: ['Miljødirektoratet', 'Miljødirektoratets'],
    intro: 'Miljødirektoratet arbeider med klima, natur og forurensning, og gir råd og tillatelser på miljøområdet.',
  },
  {
    slug: 'kystverket',
    navn: 'Kystverket',
    ord: ['Kystverket', 'Kystverkets'],
    intro: 'Kystverket har ansvar for blant annet sjøsikkerhet, farleder, los og beredskap mot akutt forurensning langs kysten.',
  },
  {
    slug: 'dsb',
    navn: 'DSB',
    ord: ['Direktoratet for samfunnssikkerhet og beredskap'],
    ordCs: ['DSB', 'DSBs'],
    intro: 'Direktoratet for samfunnssikkerhet og beredskap (DSB) arbeider med samfunnssikkerhet, beredskap, brannvern og elsikkerhet.',
  },
  {
    slug: 'skatteetaten',
    navn: 'Skatteetaten',
    ord: ['Skatteetaten', 'Skatteetatens'],
    intro: 'Skatteetaten fastsetter og krever inn skatter og avgifter, og fører folkeregisteret.',
  },
  {
    slug: 'fn',
    navn: 'FN',
    ord: ['De forente nasjoner', 'UN News', 'FNs nyhetstjeneste'],
    ordCs: ['FN', 'FNs'],
    intro:
      'De forente nasjoner (FN) er en internasjonal organisasjon der nesten alle verdens land er medlemmer. Her samler vi saker om FN og FNs organisasjoner, blant annet om humanitære kriser, konflikter og menneskerettigheter.',
  },
  {
    slug: 'eu',
    navn: 'EU',
    ord: ['Europakommisjonen', 'Europakommisjonens', 'EU-kommisjonen', 'EU-kommisjonens', 'Den europeiske union'],
    ordCs: ['EU', 'EUs'],
    intro:
      'Den europeiske union (EU) er et politisk og økonomisk samarbeid mellom europeiske land. Europakommisjonen foreslår nye regler og passer på at de blir fulgt. Norge er ikke medlem, men er knyttet til EU gjennom EØS-avtalen.',
  },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grense = (kw, flagg) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(kw)}(?![\\p{L}\\p{N}])`, flagg);

const MONSTRE = new Map(
  TEMAER.map((t) => [
    t.slug,
    [...(t.ord ?? []).map((k) => grense(k, 'iu')), ...(t.ordCs ?? []).map((k) => grense(k, 'u')), ...(t.monster ?? [])],
  ]),
);

const tell = (re, tekst) => (tekst.match(new RegExp(re.source, `${re.flags.replace('g', '')}g`)) ?? []).length;

// Kaynak satırı ve bağlantı adresleri gövdeden ayrılır; kaynak adı ayrıca "baş" metne eklenir.
export function delTekst(body = '') {
  const kilde = (body.match(/^\s*\*Kilder?:.*$/m)?.[0] ?? '').replace(/\]\([^)]*\)/g, ']');
  const govde = body
    .replace(/^\s*\*Kilder?:.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
  return { kilde, govde };
}

/** Haberin girdiği temalar (slug listesi). */
export function temaerFor({ title = '', description = '', body = '' }) {
  const { kilde, govde } = delTekst(body);
  const hode = `${title}\n${description}\n${kilde}`;
  return TEMAER.filter((t) => {
    const monstre = MONSTRE.get(t.slug);
    if (monstre.some((re) => re.test(hode))) return true;
    return monstre.reduce((n, re) => n + tell(re, govde), 0) >= 2;
  }).map((t) => t.slug);
}

export const temaNavn = (slug) => TEMAER.find((t) => t.slug === slug)?.navn ?? slug;
