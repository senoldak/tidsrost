// Redaksjonen-sayfasının verisi: yalnız gerçek kayıtlardan. dagstall: botun günlük sayıları (src/data/redaksjonen/
// dagstall.json, scripts/nyheter/dagstall.mjs yazar); saker: yayımlanmış haberlerin ön bilgisi (kjede: zincirin kaydı,
// mecmua onay/yerlestir.mjs yazar). Sayfa hiçbir sayıyı tahmin etmez: kayıt yoksa alan boş kalır.

// Ret kodu → okura giden metin. standard:<kural> kodları tek başlıkta toplanır.
export const AVVIST_TEKST = {
  'lav-nyhetsverdi': 'For lav nyhetsverdi',
  'allerede-publisert': 'Hadde saken fra før',
  'en-kilde': 'Bare én uavhengig kilde',
  'for-lite-kildemateriale': 'For lite kildemateriale',
  varsomhet: 'Krever særlig varsomhet',
  'faktasjekk-stopp': 'Stoppet i faktasjekken',
  'borte-fra-kilden': 'Fjernet hos kilden',
  'dekket-av-farevarsler': 'Dekket av farevarsel-siden',
  'ikke-skrevet': 'Kunne ikke skrives',
  teknisk: 'Teknisk feil',
  standard: 'Stoppet av publiseringsreglene',
  annet: 'Annen grunn',
};

// Zincirin geri gönderme hedefi (durum.json turlar anahtarı) → sahnede hangi masaya döner.
export const STEG = {
  konu: { navn: 'Tema', figur: 'redaktor' },
  arastirma: { navn: 'Research', figur: 'research' },
  yazim: { navn: 'Skribent', figur: 'skribent' },
  dogrulama: { navn: 'Faktasjekk', figur: 'faktasjekk' },
  grafik: { navn: 'Grafikk', figur: 'grafikk' },
  redaksiyon: { navn: 'Desk', figur: 'desk' },
  dil: { navn: 'Språkvakt', figur: 'sprak' },
  hukuk: { navn: 'Jurist', figur: 'jurist' },
};

const TALL = ['turer', 'funnet', 'vurdert', 'skrevet', 'utkast', 'publisert', 'kortfortalt', 'venter'];

function summer(dager) {
  const s = Object.fromEntries(TALL.map((k) => [k, 0]));
  s.avvist = {};
  for (const d of dager) {
    for (const k of TALL) s[k] += Number(d?.[k] ?? 0);
    for (const [k, n] of Object.entries(d?.avvist ?? {})) {
      const kode = k.startsWith('standard:') ? 'standard' : AVVIST_TEKST[k] ? k : 'annet';
      s.avvist[kode] = (s.avvist[kode] ?? 0) + Number(n);
    }
  }
  return s;
}

const osloDag = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(t);
const url = (slug) => `/artikkel/${slug}/`;

/**
 * @param {{ saker: Array<{ slug: string, title: string, date: Date, draft?: boolean, produksjon?: string, sjanger?: string,
 *   author?: string, nyhetsverdi?: number, kjede?: { runder: Record<string, number>, kontrollert: number, hentet: number } }>,
 *   dagstall?: { dager?: Record<string, object> }, naa?: Date }} p
 */
export function redaksjonsData({ saker, dagstall, naa = new Date() }) {
  const synlige = saker.filter((s) => !s.draft && s.date <= naa).sort((a, b) => b.date - a.date);
  const dager = Object.keys(dagstall?.dager ?? {}).filter((d) => d <= osloDag(naa)).sort();
  const sisteDag = dager.at(-1);
  const uke = dager.slice(-7);
  const ukeTall = summer(uke.map((d) => dagstall.dager[d]));
  const avvisninger = Object.entries(ukeTall.avvist)
    .map(([kode, antall]) => ({ kode, tekst: AVVIST_TEKST[kode], antall }))
    .sort((a, b) => b.antall - a.antall || a.kode.localeCompare(b.kode));
  const kjedesak = synlige.find((s) => s.produksjon === 'ki-redigert' && s.kjede);
  const forfattersak = synlige.find((s) => s.author === 'Şenol Dak' && s.produksjon !== 'ki-redigert' && (s.sjanger === 'forklart' || s.sjanger === 'analyse'));
  return {
    dag: sisteDag ? { dato: sisteDag, iDag: sisteDag === osloDag(naa), ...summer([dagstall.dager[sisteDag]]) } : null,
    uke: uke.length ? { fra: uke[0], til: uke.at(-1), dager: uke.length, ...ukeTall } : null,
    avvisninger,
    sisteSaker: synlige.filter((s) => s.sjanger === 'nyhet' || !s.sjanger).slice(0, 8)
      .map((s) => ({ tittel: s.title, url: url(s.slug), ...(s.nyhetsverdi ? { nyhetsverdi: s.nyhetsverdi } : {}) })),
    sisteKjede: kjedesak
      ? {
        tittel: kjedesak.title,
        url: url(kjedesak.slug),
        runder: Object.entries(kjedesak.kjede.runder).filter(([, n]) => n > 0)
          .map(([steg, antall]) => ({ steg, navn: STEG[steg]?.navn ?? steg, figur: STEG[steg]?.figur ?? null, antall })),
        tilbake: Object.values(kjedesak.kjede.runder).reduce((a, b) => a + b, 0),
        kontrollert: kjedesak.kjede.kontrollert,
        hentet: kjedesak.kjede.hentet,
      }
      : null,
    sisteForfatter: forfattersak ? { tittel: forfattersak.title, url: url(forfattersak.slug) } : null,
  };
}
